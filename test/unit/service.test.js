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
        data: {
          name: 'my-method',
          args: ['a', 'b', 'c']
        },
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
        respond: sinon.spy()
      };
    });

    teardown(function() {

    });

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
  });

  // suite('client provided contracts /', function() {
  //   setup(function() {
  //     _bridge.push(bridge.create({
  //       src: '/base/test/unit/lib/contracts.js',
  //       type: 'worker'
  //     }));

  //     this.contract = {
  //       methods: {
  //         contractMethod: ['string']
  //       },

  //       events: {
  //         'contractevent': {
  //           object: 'object',
  //           number: 'number',
  //           string: 'string',
  //           boolean: 'boolean'
  //         }
  //       }
  //     };

  //     clients.push(bridge.client('contract-service', {
  //       thread: _bridge[0],
  //       contract: this.contract
  //     }));
  //   });

  //   test('contract method calls are allowed', function(done) {
  //     clients[0].method('contractMethod', 'foo').then(function(result) {
  //       assert.equal(result, 'conformance: foo');
  //     }).then(done, done);
  //   });

  //   test('uncontracted method calls throw', function(done) {
  //     clients[0].method('uncontractMethod').then(function(result) {
  //       done('should not be called');
  //     }).catch(function(err) {
  //       assert.ok(err);
  //       done();
  //     }).then(done, done);
  //   });

  //   test('calling with incorrect argument type throws', function(done) {
  //     clients[0].method('contractMethod', {}).then(function(result) {
  //       assert.equal(result, 'rebellion');
  //       done('should not be called');
  //     }).catch(function(err) {
  //       assert.ok(err);
  //       done();
  //     }).then(done, done);
  //   });

  //   test('calling with incorrect arguments.length throws', function(done) {
  //     clients[0].method('contractMethod', '1', '2', '3').then(function(result) {
  //       assert.equal(result, 'rebellion');
  //       done('should not be called');
  //     }).catch(function(err) {
  //       assert.ok(err);
  //       done();
  //     }).then(done, done);
  //   });
  // });

  // suite('server provided contracts', function() {
  //   setup(function() {
  //     _bridge.push(bridge.create({
  //       src: '/base/test/unit/lib/contracts.js',
  //       type: 'worker'
  //     }));

  //     clients.push(bridge.client('service-supplied-contract', { thread: _bridge[0] }));
  //   });

  //   test('contract method calls are allowed', function(done) {
  //     clients[0].method('contractMethod', 'foo').then(function(result) {
  //       assert.equal(result, 'conformance: foo');
  //     }).then(done, done);
  //   });

  //   test('uncontracted method calls throw', function(done) {
  //     clients[0].method('uncontractMethod').then(function(result) {
  //       assert.equal(result, 'rebellion');
  //       done('should not be called');
  //     }).catch(function(err) {
  //       assert.ok(err);
  //       done();
  //     }).then(done, done);
  //   });
  // });

  // suite('broadcast()', function() {
  //   test('it is able to target separate clients', function(done) {
  //     var spy1 = sinon.spy();
  //     var spy2 = sinon.spy();
  //     var spy3 = sinon.spy();

  //     var thread = bridge.create({
  //       src: '/base/test/unit/lib/events.js',
  //       type: 'worker'
  //     });

  //     clients.push(bridge.client('test-events', { thread: thread }));
  //     clients.push(bridge.client('test-events', { thread: thread }));
  //     clients.push(bridge.client('test-events', { thread: thread }));

  //     clients[0].on('eventname', spy1);
  //     clients[1].on('eventname', spy2);
  //     clients[2].on('eventname', spy3);

  //     clients[0].method('testTargetedBroadcast', 'eventname', 'data', [
  //       clients[0].id,
  //       clients[1].id
  //     ]).then(function() {
  //       sinon.assert.called(spy1);
  //       sinon.assert.called(spy2);
  //       sinon.assert.notCalled(spy3);
  //       done();
  //     });
  //   });
  // });

  // suite('return values', function() {
  //   setup(function() {
  //     _bridge.push(bridge.create({
  //       src: '/base/test/unit/lib/thread.js',
  //       type: 'worker'
  //     }));

  //     clients.push(bridge.client('view-server', { thread: _bridge[0] }));
  //   });

  //   test('returns false', function(done) {
  //     clients[0].method('returnsFalse').then(function(value) {
  //       assert.equal(value, false);
  //       done();
  //     }).catch(done);
  //   });

  //   test('returns undefined', function(done) {
  //     clients[0].method('returnsUndefined').then(function(value) {
  //       assert.equal(value, undefined);
  //       done();
  //     }).catch(done);
  //   });

  //   test('returns zero', function(done) {
  //     clients[0].method('returnsZero').then(function(value) {
  //       assert.equal(value, 0);
  //       done();
  //     }).catch(done);
  //   });

  //   test('returns empty string', function(done) {
  //     clients[0].method('returnsEmptyString').then(function(value) {
  //       assert.equal(value, '');
  //       done();
  //     }).catch(done);
  //   });
  // });
});
