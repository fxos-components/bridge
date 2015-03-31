/*global threads,assert,suite,setup,teardown,test*/
/*jshint esnext:true, maxlen:false*/

suite('Manager', function() {
  setup(function() {
    this.manager = threads.manager({
      'view-server': {
        src: '/base/test/lib/thread.js',
        type: 'worker'
      }
    });

    this.thread = threads.client('view-server');
  });

  teardown(function(done) {
    this.thread.disconnect().then(done, done);
  });

  test('simple call', function(done) {
    this.thread.call('getData').then(data => {
      assert.deepEqual(data, { some: 'data' });
      done();
    });
  });
});
