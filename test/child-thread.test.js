/*global threads,assert,suite,setup,teardown,test,sinon*/
/*jshint esnext:true, maxlen:false*/

suite('ChildThread >>', function() {

  setup(function() {
    this.sinon = sinon.sandbox.create();
    this.dom = document.createElement('div');
    document.body.appendChild(this.dom);
    this.cleanup = {
      threads: [],
      clients: []
    };
  });

  teardown(function(done) {
    this.sinon.restore();
    this.dom.remove();

    Promise.all([this.cleanup.clients.map(client => client.disconnect())])
      .then(() => this.cleanup.threads.forEach(thread => thread.destroy()))
      .then(() => this.dom.remove())
      .then(() => done(), done);
  });

  test('It throws if the type is unknown', function() {
    this.sinon.spy(threads, 'create');

    try {
      var thread = threads.create({
        src: '/base/test/lib/view.html',
        type: 'unknowntype'
      });
    } catch (e) {}

    assert.isTrue(threads.create.getCall(0).threw());
  });

  test('it recieves messages only from it\'s own target', function(done) {
    var thread1 = threads.create({
      src: '/base/test/lib/view.html',
      type: 'window'
    });

    var thread2 = threads.create({
      src: '/base/test/lib/moz-contacts.html',
      type: 'window'
    });

    this.cleanup.threads.push(thread1, thread2);

    var spy1 = sinon.spy();
    var spy2 = sinon.spy();

    thread1.on('serviceready', spy1);
    thread2.on('serviceready', spy2);

    // Any protips to avoid setTimeout?
    setTimeout(function() {
      sinon.assert.calledOnce(spy1);
      sinon.assert.calledOnce(spy2);
      done();
    }, 300);
  });

  suite('target >>', function() {
    test('loaded iframe', function(done) {
      var iframe = document.createElement('iframe');
      iframe.src = '/base/test/lib/view.html';
      this.dom.appendChild(iframe);

      iframe.onload = function() {
        setTimeout(function() {
          var thread = threads.create({
            target: iframe,
            src: iframe.src,
            type: 'window'
          });

          this.cleanup.threads.push(thread);

          var client = threads.client('little-browser', { thread: thread });

          this.cleanup.clients.push(client);

          client.method('getTitle').then(function(title) {
            assert.equal(title, 'page-title');
            done();
          });
        }.bind(this), 100);
      }.bind(this);
    });

    test('unloaded iframe', function(done) {
      var iframe = document.createElement('iframe');
      iframe.src = '/base/test/lib/view.html';
      this.dom.appendChild(iframe);

      var thread = threads.create({
        target: iframe,
        src: iframe.src,
        type: 'window'
      });

      var client = threads.client('little-browser', { thread: thread });

      this.cleanup.threads.push(thread);
      this.cleanup.clients.push(client);

      client.method('getTitle').then(function(title) {
        assert.equal(title, 'page-title');
        done();
      });
    });
  });
});
