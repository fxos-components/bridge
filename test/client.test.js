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
      ]).then(() => {
        client1.disconnect();
        client2.disconnect();

        thread.on('redundant', () => {
          done();
        });
      });
    });
  });

  suite('events', function() {
    test('It accepts threads that aren\'t created by the manager', function(done) {
      thread = threads.create({
        src: '/base/test/lib/events.js',
        type: 'worker'
      });

      var client = threads.client('test-events', { thread: thread });

      client.on('test-event', data => {
        assert.deepEqual(data, { event: 'data' });
        done();
      });

      client.method('testBroadcast', 'test-event', { event: 'data' });
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

      client.method('getTitle').then(title => {
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

      client.method('getData').then(data => {
        assert.deepEqual(data, { some: 'data' });
        done();
      });
    });

    test('sharedworker', function(done) {
      thread = threads.create({
        src: '/base/test/lib/thread.js',
        type: 'sharedworker'
      });

      var client = threads.client('view-server', { thread: thread });

      client.method('getData').then(data => {
        assert.deepEqual(data, { some: 'data' });
        done();
      });
    });
  });

  suite('Connecting to already running services', function() {
    test('it connects without a thread reference', function(done) {
      thread = threads.create({
        src: '/base/test/lib/thread2.js',
        type: 'worker'
      });

      thread.on('serviceready', service => {
        var client = threads.client('thread2-service');

        client.method('getData').then(data => {
          assert.deepEqual(data, { some: 'data' });
          done();
        });
      });
    });
  });
});
