/*global threads,assert,suite,setup,teardown,sinon,test*/
/*jshint esnext:true, maxlen:false*/

suite('Message', function() {
  var message = threads._m;
  var receivers = [];
  var iframe;
  var thread;

  setup(function() {
    this.sinon = sinon.sandbox.create();
    this.dom = document.createElement('div');
    document.body.appendChild(this.dom);

    iframe = document.createElement('iframe');
    iframe.src = '/base/test/lib/message-test-1.html';
    iframe.hidden = true;
    this.dom.appendChild(iframe);
  });

  teardown(function() {
    destroyRecievers();
    this.sinon.restore();
    this.dom.remove();
  });

  suite('Message#send() >>', function() {
    test('it responds', function(done) {
      message('test-message')
        .send(iframe)
        .then(response => {
          assert.equal(response.value, 'roger');
          done();
        }).catch(done);
    });

    test('it can send data', function(done) {
      message('repeat')
        .set('data', 'my data')
        .send(iframe)
        .then(response => {
          assert.equal(response.value, 'my data');
          done();
        }).catch(done);
    });

    test('promise rejects if error thrown', function(done) {
      message('throw-error')
        .send(iframe)
        .catch(response => done());
    });

    test('requests timeout when no response', function(done) {
      message('does-not-respond')
        .set('timeout', 300)
        .send(iframe)
        .catch(err => {
          assert.equal(err.message, 'timeout');
          done();
        }).catch(done);
    });

    test('messages do not reject with the `silentTimeout` option', function(done) {
      message('does-not-respond')
        .set('timeout', 300)
        .set('silentTimeout', true)
        .send(iframe)
        .catch(done);

      setTimeout(() => done(), 301);
    });

    test('can send one-way messages', function(done) {
      message('test-one-way-messages')
        .set('noRespond', true)
        .send(iframe)
        .then(response => {
          assert.isUndefined(response);
        }).catch(done);

      addEventListener('message', function fn(e) {
        if (e.data === 'got one way message') {
          removeEventListener('message', fn);
          setTimeout(() => done(), 300);
        }
      });
    });

    test('can target receivers by id', function(done) {
      message('who-are-you')
        .set('recipient', 'receiver-1')
        .send(iframe)

        .then(response => {
          assert.equal(response.value, 'receiver-1');
          return message('who-are-you')
            .set('recipient', 'receiver-2')
            .send(iframe);
        })

        .then(response => {
          assert.equal(response.value, 'receiver-2');
          done();
        })

        .catch(done);
    });

    suite('cancelling >>', function() {
      test('it responds', function(done) {
        var spy = sinon.spy();
        var m1 = message('test-message');
        m1.send(iframe).then(spy);

        m1.cancel();

        message('test-message')
          .send(iframe)
          .then(response => {
            setTimeout(() => {
              assert.equal(response.value, 'roger');
              sinon.assert.notCalled(spy);
              done();
            }, 100);
          }).catch(done);
      });

      test('it clears timeout', function(done) {
        var m1 = message('test-message');

        m1
          .set('timeout', 100)
          .send(iframe)
          .catch(done);

        m1.cancel();

        setTimeout(() => done(), 200);
      });
    });

    suite('custom endpoints', function() {
      test('it accepts custom adaptors', function() {
        var myEndpoint = {
          postMessage: sinon.spy(),
          addListener: sinon.spy(),
          removeListener: sinon.spy()
        };

        message('test-message').send(myEndpoint);

        sinon.assert.calledOnce(myEndpoint.postMessage);
        sinon.assert.calledOnce(myEndpoint.addListener);
      });
    });

    suite('internal >>', function() {
      var receiver;

      setup(function() {
        receiver = createReceiver('im-internal')
          .on('ping', message => message.respond('pong'))
          .listen(window);
      });

      teardown(function() {
        receiver.destroy();
      });

      test('messages can be send and recieved in the same thread', function(done) {
        message('ping')
          .send(window)
          .then(response => {
            assert.equal(response.value, 'pong');
            done();
          });
      });
    });

    suite('forwarding >>', function() {
      var receiver;

      teardown(function() {
        receiver.destroy();
      });

      test('messages can be forwarded to other endpoints', function(done) {
        receiver = createReceiver('im-internal')
          .on('forwarded-message', message => message.forward(iframe))
          .listen();

        var myMessage = message('forwarded-message');

        myMessage.send(window)
          .then(response => {
            assert.equal(response.value, 'final destination');
            assert.equal(myMessage.response.value, 'final destination');
            done();
          }).catch(done);
      });

      test('only the origin Message rejects on response timeout', function(done) {
        receiver = createReceiver('im-internal')
          .on('does-not-respond', message => {
            message
              .set('timeout', 300)
              .forward(iframe)
              .catch(done);
          })
          .listen();

        var myMessage = message('does-not-respond');

        myMessage
          .set('timeout', 300)
          .send(window)
          .catch(err => {
            assert.equal(err.message, 'timeout');
            setTimeout(() => done(), 100);
          });
      });

      test('ports must be passed the entire message chain', function(done) {
        receiver = createReceiver('im-internal')
          .on('transfer-test-1', message => {
            message.forward(iframe); })
          .listen();

        var mc = new MessageChannel();

        var myMessage = message('transfer-test-1')
          .set('transfer', [mc.port2]);

        myMessage.send(window)
          .then(response => {
            assert.equal(response.value, 1);
            done();
          }).catch(done);
      });
    });

    suite('BroadcastChannel', function() {
      var bc;

      teardown(function() {
        bc.close();
      });

      test('it can send messages', function(done) {
        bc = new BroadcastChannel('send-test');

        // setTimeout(() => {

        message('ping')
          .send(bc)
          .then(response => {
            assert.equal(response.value, 'pong');
            done();
          });

        // }, 300);
      });

      test('it can recieve messages', function(done) {
        bc = new BroadcastChannel('receive-test');

        createReceiver('bc')
          .on('ping', message => {
            message.respond('pong');
            done();
          })
          .listen(bc);
      });

      test('a receiver (service) can cope with several message senders (clients)', function(done) {
        var count = 0;

        bc = new BroadcastChannel('multi-sender-test');
        var bc2 = new BroadcastChannel('multi-sender-test');

        var receiver= createReceiver('bc')
          .on('ping', message => {
            if (++count === 4) {
              setTimeout(() => {
                assert.equal(count, 4, 'no more have run');
                done();
              }, 100);
            }
          });

        message('ping').send(bc2);
        setTimeout(() => receiver.listen(bc));
        setTimeout(() => message('ping').send(bc2), 100);
        setTimeout(() => message('ping').send(bc2), 200);
        setTimeout(() => message('ping').send(bc2), 300);
      });
    });
  });

  suite('Message#respond()', () => {
    setup(() => {

    });

    test('it throws if respond is called more than once', function() {
      var proto = message.Message.prototype;
      var spy = sinon.spy();

      createReceiver('foo')
        .on('message-type', message => message.respond())
        .on('message-type', message => message.respond())
        .listen();

      // TODO: Nicer way of doing this?
      var real = proto.respond;
      proto.respond = function() {
        try { real.apply(this, arguments); }
        catch (e) { spy(e); }
      };

      dispatchMessage({
        id: 123,
        type: 'message-type',
        recipient: 'foo'
      });

      sinon.assert.calledOnce(spy);
      proto.respond = real;
    });
  });

  suite('Message#preventDefault()', function() {
    test('on \'message\' event it blocks all callbacks', () => {
      var receiver = createReceiver('foo');
      var spy = sinon.spy();
      var msg1 = {
        id: 123,
        type: 'some event',
        recipient: 'foo'
      };

      var msg2 = {
        id: 123,
        type: 'some other event',
        recipient: 'foo'
      };

      receiver.on('some event', spy);
      receiver.on('some other event', spy);

      receiver.onMessage({
        target: window,
        data: msg1
      });

      receiver.onMessage({
        target: window,
        data: msg2
      });

      sinon.assert.calledTwice(spy);

      receiver.on('message', message => message.preventDefault());

      receiver.onMessage({
        target: window,
        data: msg1
      });

      receiver.onMessage({
        target: window,
        data: msg2
      });

      sinon.assert.calledTwice(spy);
    });
  });

  suite('Reciever()', function() {
    test('it can take multiple callbacks for the same type', () => {
      var spys = [
        sinon.spy(),
        sinon.spy()
      ];

      createReceiver('bar')
        .on('message-type', spys[0])
        .on('message-type', spys[1])
        .listen();

      dispatchMessage({
        id: 123,
        type: 'message-type',
        recipient: 'bar'
      });

      sinon.assert.calledOnce(spys[0]);
      sinon.assert.calledOnce(spys[1]);
    });

    test('it only processes message with an id', function() {
      var spy = sinon.spy();

      createReceiver('bar')
        .on('message-type', spy)
        .listen();

      dispatchMessage({
        type: 'message-type',
        recipient: 'bar'
      });

      sinon.assert.notCalled(spy);

      dispatchMessage({
        id: 123,
        type: 'message-type',
        recipient: 'bar'
      });

      sinon.assert.calledOnce(spy);
    });

    test('it only processes message with a type', function() {
      var spy = sinon.spy();

      createReceiver('bar')
        .on('message-type', spy)
        .listen();

      dispatchMessage({
        id: 123,
        recipient: 'bar'
      });

      sinon.assert.notCalled(spy);

      dispatchMessage({
        id: 123,
        type: 'message-type',
        recipient: 'bar'
      });

      sinon.assert.calledOnce(spy);
    });
  });

  suite('Message#set()', function() {
    test('accepts objects hash', function() {
      var msg = message('yo');

      msg.set({
        foo: 'foo',
        bar: 'bar',
        baz: 'baz'
      });

      assert.equal(msg.foo, 'foo');
      assert.equal(msg.bar, 'bar');
      assert.equal(msg.baz, 'baz');
    });

    test('accepts key value arguments', function() {
      var msg = message('yo');
      msg.set('foo', 'foo');
      assert.equal(msg.foo, 'foo');
    });
  });

  suite('transfer', function() {
    test('ports can be send in a message', function(done) {
      var mc = new MessageChannel();

      message('transfer-test-1')
        .set('transfer', [mc.port2])
        .send(iframe)
        .then(response => {
          assert.equal(response.value, 1);
          done();
        })
        .catch(done);
    });

    test('ports can be sent in response', function(done) {
      var mc = new MessageChannel();

      message('transfer-test-2')
        .set('data', 'here port')
        .send(iframe)
        .then(response => {
          assert.equal(response.event.ports.length, 1);
          done();
        })
        .catch(done);
    });
  });

  function createReceiver(name) {
    var receiver = message.receiver(name);
    receivers.push(receiver);
    return receiver;
  }

  function destroyRecievers() {
    receivers.forEach(receiver => receiver.destroy());
  }

  function dispatchMessage(data) {
    window.dispatchEvent(new MessageEvent('message', { data: data }));
  }
});
