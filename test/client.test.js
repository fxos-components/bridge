/*global bridge,assert,suite,setup,teardown,test*/
/*jshint esnext:true, maxlen:false*/

suite('Client()', function() {
  var message = bridge._m;
  var Message = message.Message;
  var Receiver = message.Receiver;
  var client = bridge.client;
  var myClient;

  setup(function() {
    this.sinon = sinon.sandbox.create();
    this.endpoint = {
      addListener: sinon.stub(),
      removeListener: sinon.stub(),
      postMessage: sinon.stub()
    };
  });

  teardown(function() {
    this.sinon.restore();
    if (myClient) myClient.destroy();
  });

  suite('Client#connect()', function() {
    setup(function() {
      this.sinon.stub(Message.prototype, 'send');
      Message.prototype.send.returns(fakePromise());
    });

    test('it attaches MessageChannel port to the messsage', function() {
      this.sinon.spy(Message.prototype, 'set');

      myClient = client('some-service', this.endpoint);
      myClient.connect();
      var args = Message.prototype.set.withArgs('transfer').args[0];
      assert.ok(args[1][0] instanceof MessagePort);
    });

    test('it sends the clientId and service name', function() {
      this.sinon.spy(Message.prototype, 'set');

      myClient = client('some-service', this.endpoint);
      myClient.connect();

      var data = Message.prototype.set.withArgs('data').args[0][1];
      assert.equal(data.service, 'some-service');
      assert.equal(data.clientId, myClient.id);
    });

    test('it listens for a response on the MessageChannel', function() {
      this.sinon.spy(Message.prototype, 'listen');
      this.sinon.stub(window, 'MessageChannel');

      var fakeChannel = fakeMessageChannel();
      window.MessageChannel.returns(fakeChannel);

      myClient = client('some-service', this.endpoint);
      myClient.connect();

      var endpoint = Message.prototype.listen.args[0][0];
      assert.equal(endpoint, fakeChannel.port1);
    });

    test('it swaps ports if the response comes back on the MessageChannel', function() {
      this.sinon.stub(window, 'MessageChannel');

      var fakeChannel = fakeMessageChannel();
      window.MessageChannel.returns(fakeChannel);

      myClient = client('some-service', this.endpoint);
      myClient.connect();

      var onSuccess = Message.prototype.send.getCall(0).returnValue.then.args[0][0];
      var fakeResponse = {
        event: { target: fakeChannel.port1 }
      };

      sinon.spy(myClient, 'setPort');
      onSuccess(fakeResponse);

      sinon.assert.calledWith(myClient.setPort, fakeChannel.port1);
    });

    test('it keeps the endpoint as the port if response does not arrive on MessageChannel', function() {
      this.sinon.stub(window, 'MessageChannel');

      var fakeChannel = fakeMessageChannel();
      window.MessageChannel.returns(fakeChannel);

      myClient = client('some-service', this.endpoint);
      myClient.connect();

      var onSuccess = Message.prototype.send.getCall(0).returnValue.then.args[0][0];
      var fakeResponse = {
        event: { target: this.endpoint }
      };

      sinon.spy(myClient, 'setPort');
      onSuccess(fakeResponse);

      assert.isFalse(myClient.setPort.calledWith(fakeChannel.port1));
    });

    test('It begins listening for server push once connected', function() {
      this.sinon.stub(window, 'MessageChannel');
      this.sinon.spy(Receiver.prototype, 'listen');

      var fakeChannel = fakeMessageChannel();
      window.MessageChannel.returns(fakeChannel);

      myClient = client('some-service', this.endpoint);
      myClient.connect();

      sinon.assert.notCalled(Receiver.prototype.listen);

      var onSuccess = Message.prototype.send.getCall(0).returnValue.then.args[0][0];
      var fakeResponse = {
        event: { target: fakeChannel.port1 }
      };

      sinon.spy(myClient, 'setPort');
      onSuccess(fakeResponse);

      sinon.assert.calledWith(Receiver.prototype.listen, myClient.port);
    });

    test('it logs informative message if connection fails', function(done) {
      var expectedMessage = 'Unable to establish a connection with "some-service"';

      this.sinon.stub(console, 'error');
      Message.prototype.send.restore();

      myClient = client('some-service', this.endpoint);
      myClient.connect().then(result => {
        done('should not run');
      }).catch(err => {
        assert.isTrue(err instanceof Error);
        assert.ok(~err.message.indexOf(expectedMessage));
        sinon.assert.called(console.error);
        done();
      }).catch(done);
    });

    function fakeMessageChannel() {
      var port1 = fakeMessagePort();
      var port2 = fakeMessagePort();
      return { port1: port1, port2: port2 };
    }

    function fakeMessagePort() {
      return {
        start: sinon.stub(),
        addEventListener: sinon.stub(),
        removeEventListener: sinon.stub(),
        postMessage: sinon.stub(),
        close: sinon.stub()
      };
    }
  });

  suite('Client#method()', function() {
    test('calling .method() triggers a connect', function() {
      this.sinon.spy(client.prototype, 'connect');
      myClient = client('some-service', this.endpoint);
      sinon.assert.notCalled(myClient.connect);
      myClient.method('someMethod1');
      sinon.assert.called(myClient.connect);
    });

    test('it does not send message until connected', function() {
      myClient = client('some-service', this.endpoint);

      sinon.stub(myClient, 'connect').returns(fakePromise());
      sinon.spy(myClient, 'message');

      sinon.assert.notCalled(myClient.message);

      myClient.method('someMethod1');

      var thenCallback = myClient.connect
        .getCall(0)
        .returnValue
        .then
        .args[0][0];

      thenCallback();
      sinon.assert.calledWith(myClient.message, '_method');
    });

    test('it returns an informative message when it times out', function(done) {
      var expectedMessage = `Method "someMethod1" didn't get a response`;

      myClient = client('some-service', this.endpoint);

      // Behave as connected
      sinon.stub(myClient, 'connect').returns(Promise.resolve());

      myClient.method('someMethod1')
        .then(done)
        .catch(err => {
          assert.isTrue(err instanceof Error);
          assert.ok(~err.message.indexOf(expectedMessage));
          done();
        })
        .catch(done);
    });

    test('the default message timeout can be overriden', function(done) {
      var then = Date.now();

      myClient = client({
        service: 'some-service',
        endpoint: this.endpoint,
        timeout: 300
      });

      myClient.method('someMethod1')
        .then(result => done('should not run'))
        .catch(err => {
          assert.ok(Date.now() - then >= 300);
          assert.ok(Date.now() - then < 1000);
          done();
        })
        .catch(done);
    });
  });

  suite('Client#disconnect()', function() {
    setup(function() {
      this.sinon.spy(Message.prototype, 'send');
    });

    test('it cancels pending methods', function(done) {
      myClient = client('some-service', this.endpoint);

      // HACK connected
      myClient.connected = Promise.resolve();

      myClient.method('someMethod1');
      myClient.method('someMethod2');
      myClient.method('someMethod3');

      myClient.connect().then(() => {
        assert.equal(myClient.pending.size, 3);
        myClient.disconnect();
        assert.equal(myClient.pending.size, 1);
        done();
      }).catch(done);
    });

    test('returns resolved promise if not connected', function(done) {
      myClient = client('some-service', this.endpoint);

      myClient.disconnect()
        .then(() => {
          sinon.assert.notCalled(message.Message.prototype.send);
          done();
        }).catch(done);
    });
  });

  /**
   * Utils
   */

  function fakePromise() {
    return {
      then: sinon.spy(() => fakePromise()),
      catch: sinon.spy(() => fakePromise())
    };
  }
});
