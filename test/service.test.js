/*global threads,assert,suite,setup,teardown,test*/
/*jshint esnext:true, maxlen:false*/

suite('Service /', function() {
  var clients;
  var _threads;

  setup(function() {
    clients = [];
    _threads = [];
    this.sinon = sinon.sandbox.create();
  });

  teardown(function(done) {
    this.sinon.restore();
    Promise.all(clients.map(client => client.disconnect()))
      .then(() => Promise.all(_threads.map(thread => thread.destroy())))
      .then(() => done(), done);
  });

  suite('client provided contracts /', function() {
    setup(function() {
      _threads.push(threads.create({
        src: '/base/test/lib/contracts.js',
        type: 'worker'
      }));

      this.contract = {
        methods: {
          contractMethod: ['string']
        },

        events: {
          'contractevent': {
            object: 'object',
            number: 'number',
            string: 'string',
            boolean: 'boolean'
          }
        }
      };

      clients.push(threads.client('contract-service', {
        thread: _threads[0],
        contract: this.contract
      }));
    });

    test('contract method calls are allowed', function(done) {
      clients[0].method('contractMethod', 'foo').then(function(result) {
        assert.equal(result, 'conformance: foo');
      }).then(done, done);
    });

    test('uncontracted method calls throw', function(done) {
      clients[0].method('uncontractMethod').then(function(result) {
        done('should not be called');
      }).catch(function(err) {
        assert.ok(err);
        done();
      }).then(done, done);
    });

    test('calling with incorrect argument type throws', function(done) {
      clients[0].method('contractMethod', {}).then(function(result) {
        assert.equal(result, 'rebellion');
        done('should not be called');
      }).catch(function(err) {
        assert.ok(err);
        done();
      }).then(done, done);
    });

    test('calling with incorrect arguments.length throws', function(done) {
      clients[0].method('contractMethod', '1', '2', '3').then(function(result) {
        assert.equal(result, 'rebellion');
        done('should not be called');
      }).catch(function(err) {
        assert.ok(err);
        done();
      }).then(done, done);
    });
  });

  suite('server provided contracts', function() {
    setup(function() {
      _threads.push(threads.create({
        src: '/base/test/lib/contracts.js',
        type: 'worker'
      }));

      clients.push(threads.client('service-supplied-contract', { thread: _threads[0] }));
    });

    test('contract method calls are allowed', function(done) {
      clients[0].method('contractMethod', 'foo').then(function(result) {
        assert.equal(result, 'conformance: foo');
      }).then(done, done);
    });

    test('uncontracted method calls throw', function(done) {
      clients[0].method('uncontractMethod').then(function(result) {
        assert.equal(result, 'rebellion');
        done('should not be called');
      }).catch(function(err) {
        assert.ok(err);
        done();
      }).then(done, done);
    });
  });

  suite('broadcast()', function() {
    test('it is able to target separate clients', function(done) {
      var spy1 = sinon.spy();
      var spy2 = sinon.spy();
      var spy3 = sinon.spy();

      var thread = threads.create({
        src: '/base/test/lib/events.js',
        type: 'worker'
      });

      clients.push(threads.client('test-events', { thread: thread }));
      clients.push(threads.client('test-events', { thread: thread }));
      clients.push(threads.client('test-events', { thread: thread }));

      clients[0].on('eventname', spy1);
      clients[1].on('eventname', spy2);
      clients[2].on('eventname', spy3);

      clients[0].method('testTargetedBroadcast', 'eventname', 'data', [
        clients[0].id,
        clients[1].id
      ]).then(function() {
        sinon.assert.called(spy1);
        sinon.assert.called(spy2);
        sinon.assert.notCalled(spy3);
        done();
      });
    });
  });
});
