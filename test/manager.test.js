/*global threads,assert,suite,setup,teardown,test,sinon*/
/*jshint esnext:true, maxlen:false*/

suite('Manager', function() {
  var client;

  setup(function() {
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
    if (client) {
      client.disconnect().then(done, done);
      client = null;
    } else {
      done();
    }
  });

  test('simple call', function(done) {
    client = threads.client('view-server');
    client.call('getData').then(data => {
      assert.deepEqual(data, { some: 'data' });
      done();
    });
  });

  suite('connecting to pre-existing services', function() {
    var client1;
    var client2;

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

      client1 = threads.client('view-server');
      client2 = threads.client('view-server');

      Promise.all([
        client1.call('getData'),
        client2.call('getData')
      ]).then(results => {
        assert.deepEqual(results[0], { some: 'data' });
        assert.deepEqual(results[1], { some: 'data' });
        sinon.assert.calledOnce(window.Worker);
      }).then(done, done);
    });

    teardown(function(done) {
      Promise.all([
        client1.disconnect(),
        client2.disconnect()
      ]).then(() => done(), done);
    });
  });
});
