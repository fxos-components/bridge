/*global threads,assert,suite,setup,teardown,sinon,test*/
/*jshint esnext:true*/

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

  suite.only('latest', function() {
    setup(function() {
      this.manager = threads.manager({
        'view-server': {
          src: '/base/test/lib/thread.js',
          type: 'worker',
          contract: {
            methods: {
              getData: {
                args: [],
                returns: '*'
              }
            }
          }
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

  suite('contracts', function() {

  });

  suite('disconnect', function() {

  });

  suite('events', function() {

  });

  suite.skip('dynamic threads', function() {

    // User can use ChildProcess directly and listen
    // for the 'serviceready' event to fire then
    // postmessage the process directly to establish
    // a connection
    test('...', function(done) {
      var thread = threads.create({
        src: '/base/test/lib/view.html',
        type: 'window',
        parentNode: this.dom
      });

      var client = thread.client('little-browser-frame', { thread: thread });

      client.call('getTitle').then(title => {
        assert.equal(title, 'view-title');
      });
    });
  });
});
