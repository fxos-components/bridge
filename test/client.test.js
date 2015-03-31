/*global threads,assert,suite,setup,teardown,sinon,test*/
/*jshint esnext:true, maxlen:false*/

suite('client', function() {

  setup(function() {
    this.sinon = sinon.sandbox.create();
    this.dom = document.createElement('div');
    document.body.appendChild(this.dom);
  });

  teardown(function() {
    this.sinon.restore();
    this.dom.remove();
  });

  suite('contracts', function() {

  });

  suite('disconnect', function() {

  });

  suite('events', function() {
    var thread;

    teardown(function() {
      thread.destroy();
    });

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

      client.call('testBroadcast', 'test-event', { event: 'data' });
    });
  });

  suite('dynamic threads', function() {
    var thread;

    teardown(function() {
      thread.destroy();
    });

    test('It accepts threads that aren\'t created by the manager', function(done) {
      thread = threads.create({
        src: '/base/test/lib/view.html',
        type: 'window',
        parentNode: this.dom
      });

      var client = threads.client('little-browser', { thread: thread });

      client.call('getTitle').then(title => {
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

      client.call('getData').then(data => {
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

      client.call('getData').then(data => {
        assert.deepEqual(data, { some: 'data' });
        done();
      });
    });
  });
});
