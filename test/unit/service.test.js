/*global bridge,assert,suite,setup,teardown,test*/
/*jshint esnext:true, maxlen:false*/

suite('Service /', function() {
  var service = bridge.service;

  setup(function() {
    this.sinon = sinon.sandbox.create();
  });

  teardown(function() {
    this.sinon.restore();
  });

  suite('Service#method()', function() {
    var fakeMessage;
    var myService;

    setup(function() {
      myService = service('service-name');
      fakeMessage = {
        type: '_method',
        foo: 'foo',
        data: {
          name: 'my-method',
          args: ['a', 'b', 'c']
        },
        event: { ports: [] },
        respond: sinon.spy()
      };
    });

    teardown(function() {
      myService.destroy();
    });

    test('it responds to the message with the return value', function() {
      myService.method('my-method', () => 'value');
      myService.emit('_method', fakeMessage);
      sinon.assert.calledWith(fakeMessage.respond, 'value');
    });

    test('it applys arguments to the callback', function() {
      var spy = sinon.spy();
      myService.method('my-method', spy);
      myService.emit('_method', fakeMessage);
      sinon.assert.calledWith(spy, 'a', 'b', 'c');
    });

    test('it throws if no method is found', function(done) {
      myService.method('my-method', () => {});
      fakeMessage.data.name = 'unknown';
      try { myService.emit('_method', fakeMessage); }
      catch (e) { done(); }
    });
  });

  suite('on connect', function() {
    var fakeMessage;

    setup(function() {
      fakeMessage = {
        type: '_connect',
        data: {
          clientId: 123,
          service: 'service1'
        },
        event: { ports: [] },
        setSourcePort: sinon.spy(),
        respond: sinon.spy()
      };
    });

    teardown(function() {});

    test('it does not respond if the service name does not match', function() {
      fakeMessage.data.service = 'service3';
      var myService = service('service1');
      myService.emit('_connect', fakeMessage);
      sinon.assert.notCalled(fakeMessage.respond);

      myService = service('service2');
      myService.emit('_connect', fakeMessage);
      sinon.assert.notCalled(fakeMessage.respond);

      myService = service('service3');
      myService.emit('_connect', fakeMessage);
      sinon.assert.called(fakeMessage.respond);
    });

    test('it does not respond if no clientId was provided', function() {
      delete fakeMessage.data.clientId;
      var myService = service('service1');
      myService.emit('_connect', fakeMessage);
      sinon.assert.notCalled(fakeMessage.respond);

      fakeMessage.data.clientId = 123;
      myService.emit('_connect', fakeMessage);
      sinon.assert.called(fakeMessage.respond);
    });

    test('it does not respond if the client is already connected', function() {
      var myService = service('service1');
      myService.emit('_connect', fakeMessage);
      sinon.assert.called(fakeMessage.respond);

      fakeMessage.respond.reset();
      myService.emit('_connect', fakeMessage);
      sinon.assert.notCalled(fakeMessage.respond);
    });

    test('it responds on MessageChannel the Client and Service are not within Windows', function() {
      var service = bridge.service('service1');
      var port = new MessageChannel().port1;

      fakeMessage.event.ports = [port];

      // Client 1
      fakeMessage.data.originEnv = 'Window';
      service.emit('_connect', fakeMessage);
      sinon.assert.notCalled(fakeMessage.setSourcePort);

      // Client 2
      fakeMessage.data.clientId = 1234;
      fakeMessage.data.originEnv = 'Worker';
      service.emit('_connect', fakeMessage);
      sinon.assert.calledWith(fakeMessage.setSourcePort, port);
    });
  });
});
