/*global threads,assert,suite,setup,teardown,sinon,test*/
/*jshint esnext:true, maxlen:false*/

suite('client', function() {
  var thread;

  setup(function() {
    this.sinon = sinon.sandbox.create();
    this.dom = document.createElement('div');
    document.body.appendChild(this.dom);
  });

  teardown(function() {
    this.sinon.restore();
    this.dom.remove();

    if (thread) thread.destroy();
  });

  suite('disconnect', function(done) {
    test('threads emit a `redundant` event when they no longer have any clients', function(done) {
      thread = threads.create({
        src: '/base/test/lib/events.js',
        type: 'worker'
      });

      var client1 = threads.client('test-events', { thread: thread });
      var client2 = threads.client('test-events', { thread: thread });

      Promise.all([
        client1.connect(),
        client2.connect()
      ]).then(function() {
        client1.disconnect();
        client2.disconnect();

        thread.on('redundant', function() {
          done();
        });
      });
    });
  });

  suite('events', function() {
    test('events dispatched from the service call registered callbacks', function(done) {
      thread = threads.create({
        src: '/base/test/lib/events.js',
        type: 'worker'
      });

      var client = threads.client('test-events', { thread: thread });

      client.on('test-event', function(data) {
        assert.deepEqual(data, { event: 'data' });
        done();
      });

      client.method('testBroadcast', 'test-event', { event: 'data' });
    });
  });

  suite('streams', function() {
    setup(function() {
      thread = threads.create({
        src: '/base/test/lib/streams.js',
        type: 'worker'
      });

      this.client = threads.client('test-streams', { thread: thread });
    });

    test('listen + close', function(done) {
      var stream = this.client.stream('test-data', 'bar', 123);
      var buffer = '';
      stream.listen(function(data) {
        buffer += data;
      });
      stream.closed.then(function() {
        assert.equal(buffer, '1: bar 123 | 2: this should also work');
        done();
      });
    });

    test('listen + unlisten + close', function(done) {
      var stream = this.client.stream('test-data', 'bar', 123);
      var buffer = '';
      stream.listen(function onData(data) {
        buffer += data;
        // stop listening for data
        stream.unlisten(onData);
      });
      stream.closed.then(function() {
        assert.equal(buffer, '1: bar 123');
        done();
      });
    });

    test('abort', function(done) {
      var stream = this.client.stream('test-abort', 123);
      stream.closed.then(function(data) {
        done('close should not be called');
      }).catch(function(abortReason) {
        assert.equal(abortReason, 'someArg should not equal 123');
        done();
      });
    });

    test('listen + cancel', function(done) {
      var stream = this.client.stream('test-cancel');
      var buffer = '';
      stream.listen(function(data) {
        buffer += data;
      });
      stream.closed.then(function() {
        done('close should not be called');
      }).catch(function() {
        done('abort should not be called');
      });
      stream.cancel('because I want it').then(function(data) {
        assert.equal(data, 'because I want it!!!');
        assert.ok(buffer.length > 0);
        done();
      });
    });
  });

  suite('dynamic threads', function() {
    test('It accepts threads that aren\'t created by the manager', function(done) {
      thread = threads.create({
        src: '/base/test/lib/view.html',
        type: 'window',
        parentNode: this.dom
      });

      var client = threads.client('little-browser', { thread: thread });

      client.method('getTitle').then(function(title) {
        assert.equal(title, 'page-title');
        done();
      });
    });

    test('worker', function(done) {
      thread = threads.create({
        src: '/base/test/lib/thread.js',
        type: 'worker'
      });

      var client = threads.client('view-server', { thread: thread });

      client.method('getData').then(function(data) {
        assert.deepEqual(data, { some: 'data' });
        done();
      }, done);
    });

    // WARNING: SharedWorkers can live across tests
    // which can impact results. Whenver testing
    // SharedWorkers be sure to create them inside
    // <iframe> and .remove() iframe to kill them.
    test.skip('sharedworker', function(done) {
      thread = threads.create({
        src: '/base/test/lib/thread.js',
        type: 'sharedworker'
      });

      var client = threads.client('view-server', { thread: thread });

      client.method('getData').then(function(data) {
        assert.deepEqual(data, { some: 'data' });
        done();
      });
    });
  });

  suite('Connecting to already running services /', function() {
    test('it connects without a thread reference', function(done) {
      thread = threads.create({
        src: '/base/test/lib/thread2.js',
        type: 'worker'
      });

      thread.on('serviceready', function(service) {
        var client = threads.client('thread2-service');

        client.method('getData').then(function(data) {
          assert.deepEqual(data, { some: 'data' });
          done();
        });
      });
    });
  });

  suite('Exceptions', function() {
    test('Un-clonable object', function(done) {
      thread = threads.create({
        src: '/base/test/lib/thread2.js',
        type: 'worker'
      });

      client = threads.client('thread2-service', { thread: thread });

      client.method('cloningError').catch(function(err) {
        done();
      });
    });
  });
});
