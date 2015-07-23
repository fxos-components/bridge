/*global threads,assert,suite,setup,teardown,test*/
/*jshint esnext:true, maxlen:false*/

suite('Client()', function() {
  var Message = threads._message.Message;
  var message = threads._message;
  var client = threads.client;
  var myClient;
  var msg;

  setup(function() {
    this.sinon = sinon.sandbox.create();
    this.endpoint = {
      addListener: sinon.stub(),
      removeListener: sinon.stub(),
      postMessage: sinon.stub()
    };

    this.sinon.stub(client.prototype, 'message', type => {
      Message.prototype.send.restore();

      msg = sinon.createStubInstance(Message);
      var df = deferred();
      var response = {};

      msg.send.returns(df.promise);
      msg.listen.returns(msg);
      msg.set.returns(msg);

      df.resolve(response);
      return msg;
    });

    this.sinon.spy(client.prototype, 'connect');
    this.sinon.spy(Message.prototype, 'send');
  });

  teardown(function() {
    this.sinon.restore();
    if (myClient) myClient.destroy();
  });

  suite('Client#connect()', function() {
    test('it attaches MessageChannel port to the messsage', function() {
      myClient = client('some-service', this.endpoint);
      myClient.connect();
      var args = msg.set.withArgs('transfer').args[0];
      assert.ok(args[1][0] instanceof MessagePort);
    });
  });

  suite('Client#method()', function() {
    var fakeMessage;
    var myService;

    test('calling method triggers a connect', function() {
      myClient = client('some-service', this.endpoint);
      sinon.assert.notCalled(myClient.connect);
      myClient.method('someMethod1');
      sinon.assert.called(myClient.connect);
    });

    test.skip('it does not send message until connected', function() {
      myClient = client('some-service', this.endpoint);
      myClient.method('someMethod1');
      sinon.assert.called(this.endpoint.postMessage);
    });
  });

  suite('Client#disconnect()', function() {
    var fakeMessage;
    var myService;

    setup(function() {

    });

    teardown(function() {

    });

    test('it cancels pending methods', function(done) {
      client.prototype.message.restore();

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


  function deferred() {
    var promise = {};
    promise.promise = new Promise((resolve, reject) => {
      promise.resolve = resolve;
      promise.reject = reject;
    });
    return promise;
  }

});
