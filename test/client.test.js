/*global threads,assert,suite,setup,teardown,test*/
/*jshint esnext:true, maxlen:false*/

suite('Client()', function() {
  var client = threads.client;
  var message = threads._message;
  var myClient;

  setup(function() {
    this.sinon = sinon.sandbox.create();
    this.endpoint = sinon.createStubInstance(message.endpoint);
    this.sinon.spy(client.prototype, 'connect');
    this.sinon.spy(message.Message.prototype, 'send');
  });

  teardown(function() {
    this.sinon.restore();
    myClient.destroy();
  });

  suite('Client#method()', function() {
    var fakeMessage;
    var myService;

    setup(function() {

    });

    teardown(function() {

    });

    test('calling method triggers a connect', function() {
      myClient = client('some-service', this.endpoint);
      sinon.assert.notCalled(myClient.connect);
      myClient.method('someMethod1');
      sinon.assert.called(myClient.connect);
    });

    test('it does not send message until connected', function() {
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
      });
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
});
