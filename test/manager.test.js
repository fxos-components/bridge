/*global threads,assert,suite,setup,teardown,test,sinon*/
/*jshint esnext:true, maxlen:false*/

suite('Manager /', function() {
  var clients;

  setup(function() {
    clients = [];
    this.sinon = sinon.sandbox.create();
    this.dom = document.createElement('div');
    document.body.appendChild(this.dom);
  });

  teardown(function() {
    this.sinon.restore();
    this.dom.remove();
  });

  suite('sharedworker /', function() {
    var manager;

    // SharedWorkers are hard to kill.
    // As a result SharedWorkers left living
    // across tests can cause intermittent failures.
    // We have found that instantiating them
    // inside an iframe and then removing the
    // iframe is a reliable way to kill them.
    setup(function(done) {
      manager = document.createElement('iframe');
      manager.src = '/base/test/lib/sharedworker.html';
      document.body.appendChild(manager);
      manager.onload = () => done();
    });

    teardown(function(done) {
      Promise.all(clients.map(client => client.disconnect()))
      .then(() => manager.remove())
      .then(() => done(), done);
    });

    test('happy path', function(done) {
      clients.push(threads.client('sharedworker-thread'));
      clients[0].method('getData').then(data => {
        assert.deepEqual(data, { some: 'data' });
        done();
      });
    });
  });

  suite('non-sharedworker', function() {
    setup(function() {
      clients = [];
      this.sinon = sinon.sandbox.create();
      this.manager = threads.manager({
        'view-server': {
          src: '/base/test/lib/thread.js',
          type: 'worker'
        }
      });
    });

    teardown(function(done) {
      this.sinon.restore();
      Promise.all(clients.map(client => client.disconnect()))
        .then(() => {
          this.manager.destroy();
          delete this.manager;
        })
        .then(() => done(), done);
    });

    test('simple call', function(done) {
      clients.push(threads.client('view-server'));
      clients[0].method('getData').then(data => {
        assert.deepEqual(data, { some: 'data' });
        done();
      });
    });

    suite('connecting to pre-existing services', function() {
      setup(function() {

        // For some reason sinon is being funny about
        // spying on `Worker` so we're doing it this way.
        var Worker = this.Worker = window.Worker;
        window.Worker = sinon.spy(function(arg) { return new Worker(arg); });
      });

      teardown(function() {
        window.Worker = this.Worker; // Restore
      });

      test('it doesn\'t spawn a new thread', function(done) {
        clients.push(
          threads.client('view-server'),
          threads.client('view-server')
        );

        Promise.all([
          clients[0].method('getData'),
          clients[1].method('getData')
        ]).then(results => {
          assert.deepEqual(results[0], { some: 'data' });
          assert.deepEqual(results[1], { some: 'data' });
          sinon.assert.calledOnce(window.Worker);
        }).then(done, done);
      });
    });

    suite('outside targets /', function() {
      var manager;
      var client;

      teardown(function() {
        manager.destroy();
      });

      test('it connects', function(done) {
        var iframe = document.createElement('iframe');
        iframe.src = '/base/test/lib/moz-contacts.html';
        this.dom.appendChild(iframe);

        manager = threads.manager({
          'moz-contacts': {
            src: '/base/test/lib/moz-contacts.html',
            type: 'window',
            target: iframe
          }
        });

        client = threads.client('moz-contacts');

        client.method('get').then(contacts => {
          assert.equal(contacts[0].firstName, 'Francisco');
          assert.equal(contacts[1].firstName, 'Wilson');
          assert.equal(contacts[2].firstName, 'Guillaume');
          done();
        });
      });

      test('it "adopts" the target thread', function(done) {
        var iframe = document.createElement('iframe');
        iframe.src = '/base/test/lib/moz-contacts.html';
        this.dom.appendChild(iframe);

        manager = threads.manager({
          'moz-contacts': {
            src: '/base/test/lib/moz-contacts.html',
            type: 'window',
            target: iframe
          }
        });

        client = threads.client('moz-contacts');
        client.connected.then(() => {
            manager.destroy();
            assert.isFalse(document.contains(iframe),
              'manager destroyed the iframe');
            done();
          });
      });
    });

    suite('redundant threads /', function() {
      test('It should terminate a Worker thread once it has no more Clients', function(done) {
        this.sinon.spy(Worker.prototype, 'terminate');

        clients.push(
          threads.client('view-server'),
          threads.client('view-server')
        );

        // Wait till both clients have connected
        Promise.all([
          clients[0].connected,
          clients[1].connected
        ])

        // Disconnect the first client
        .then(() => {
          return clients[0].disconnect();
        })

        // Then wait for `worker.terminate`
        .then(() => {
          sinon.assert.notCalled(Worker.prototype.terminate);
          return clients[1].disconnect();
        })

        // Then wait for `worker.terminate`
        .then(() => {
          sinon.assert.calledOnce(Worker.prototype.terminate);
        })

        .then(done, done);
      });
    });
  });

  /**
   * Utils
   */

  function afterNext(obj, method) {
    var wait = 400;
    var timeout;

    return new Promise((resolve, reject) => {
      var real = obj[method];

      // If the function doesn't run
      // after `wait` period: reject.
      timeout = setTimeout(() => {
        obj[method] = real; // restore
        reject(new Error('timeout exceeded'));
      }, wait);

      obj[method] = function() {
        clearTimeout(timeout);
        obj[method] = real; // restore
        var result = real.apply(this, arguments);
        resolve(result);
        return result;
      };
    });
  }
});
