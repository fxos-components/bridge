/*global assert,suite,suiteSetup,setup,teardown,sinon,test*/
/*jshint esnext:true*/

suite('client', function() {
  var threads;

  suiteSetup(function(done) {
    require(['threads'], function(_threads) {
      threads = _threads;
      done();
    });
  });

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

    // teardown(function() {
    //   this.thread.disconnect();
    // });

    test('...', function(done) {
      this.thread.call('getData').then(data => {
        assert.deepEqual(data, { some: 'data' });
        done();
      });
    });
  });

  suite.skip('dynamic threads', function() {

    // User can use ChildProcess directly and listen
    // for the 'serviceready' event to fire then
    // postmessage the process directly to establish
    // a connection
    test('...', function(done) {
      this.manager = threads.manager();

      this.thread = this.manager.client('little-browser-frame', {
        src: '/base/test/lib/view.html',
        env: 'window',
        parentNode: this.dom
      });

      this.thread.call('getTitle').then(title => {
        assert.equal(title, 'view-title');
      });
    });
  });
});
