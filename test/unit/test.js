/*global bridge,assert,suite,setup,teardown,sinon,test*/
/*jshint esnext:true, maxlen:false*/

suite('end-to-end', function() {
  var Message = bridge._m.Message;
  var service = bridge.service;
  var client = bridge.client;
  var endpoints = [];
  var services = [];
  var clients = [];
  var dom;

  setup(function() {
    this.sinon = sinon.sandbox.create();
    dom = document.createElement('div');
    document.body.appendChild(dom);
  });

  teardown(function(done) {
    this.sinon.restore();
    Promise.resolve()
      .then(() => destroyClients())
      .then(() => destroyServices())
      .then(() => destroyEndpoints())
      .then(() => {
        done();
      }).catch(e => {
        console.error(e);
        done();
      });
  });

  suite('method >>', () => {
    test('worker', (done) => {
      var start = performance.now();
      worker = createEndpoint('service-test-1-worker.js', 'worker');
      var myClient = createClient('service-1', worker);

      myClient.method('method-1', 'my-arg').then(result => {
        console.log('worker', performance.now() - start);
        assert.equal(result, 'my-arg');
        done();
      }).catch(done);
    });

    test('iframe', done => {
      var start = performance.now();
      var iframe = iframeService('service-test-1-window.html');
      var myClient = createClient('service-1', iframe);
      myClient.method('method-1', 'my-arg').then(result => {
        console.log('iframe', performance.now() - start);
        assert.equal(result, 'my-arg');
        done();
      });
    });

    test('shared worker', (done) => {
      var sharedworker = createEndpoint('service-test-1-worker.js', 'sharedworker');
      var myClient = createClient('service-1', sharedworker);
      myClient.method('method-1', 'my-arg').then(result => {
        assert.equal(result, 'my-arg');
        done();
      }).catch(done);
    });

    test('shared worker port', function(done) {
      var port = createEndpoint('service-test-1-worker.js', 'sharedworker').port;
      port.start();

      var myClient = createClient('service-1', port);
      myClient.method('method-1', 'my-arg').then(result => {
        assert.equal(result, 'my-arg');
        done();
      }).catch(done);
    });

    test('window.open()', done => {
      var start = performance.now();
      var endpoint = createEndpoint('service-test-1-window.html', 'window');
      var myClient = createClient('service-1', endpoint);
      myClient.method('method-1', 'my-arg').then(result => {
        console.log('window.open()', performance.now() - start);
        assert.equal(result, 'my-arg');
        done();
      });
    });
  });

  suite('endpoint >>', () => {
    test('it works when an endpoint being set on the prototype', done => {
      var endpoint = createEndpoint('service-test-1-worker.js', 'worker');
      client.prototype.endpoint = endpoint;
      var myClient = createClient('service-1');
      myClient.method('method-1', 'my-arg').then(result => {
        assert.equal(result, 'my-arg');
        delete client.prototype.endpoint;
        done();
      }).catch(done);
    });

    test('a reference is always kept to the original endpoint', function(done) {
      var endpoint = createEndpoint('service-test-1-worker.js', 'worker');
      var myClient = createClient('service-1', endpoint);
      myClient.method('method-1', 'my-arg').then(result => {
        assert.equal(endpoint, myClient.endpoint);
        assert.notEqual(myClient.endpoint, myClient.port.target);
        done();
      }).catch(done);
    });
  });

  suite('transport types >>', function() {
    test('it uses MessageChannel on the response', function(done) {
      worker = createEndpoint('service-test-1-worker.js', 'worker');
      var myClient = createClient('service-1', worker);

      this.sinon.spy(Message.prototype, 'onMessage');

      myClient.method('method-1', 'my-arg').then(result => {
        var event = Message.prototype.onMessage.args[0][0];
        var transport = event.target.constructor.name;
        assert.equal(transport, 'MessagePort');
        done();
      }).catch(done, done);
    });

    test('method calls use MessageChannel', function(done) {
      var endpoint = createEndpoint('service-test-1-worker.js', 'worker');
      var myClient = createClient('service-1', endpoint);

      this.sinon.spy(Message.prototype, 'onMessage');

      myClient.method('method-1', 'my-arg').then(result => {
        var event = Message.prototype.onMessage.args[1][0];
        var transport = event.target.constructor.name;
        assert.equal(transport, 'MessagePort');
        done();
      }).catch(done, done);
    });
  });

  suite('events >>', () => {
    test('connected clients recieve event broadcasts', done => {
      var endpoint = createEndpoint('service-test-1-worker.js', 'worker');

      var clients = [
        createClient('service-2', endpoint),
        createClient('service-2', endpoint)
      ];

      var promises = [
        deferred(),
        deferred()
      ];

      clients[0].on('test-event', data => {
        assert.deepEqual(data, { some: 'data' });
        promises[0].resolve();
      });

      clients[1].on('test-event', data => {
        assert.deepEqual(data, { some: 'data' });
        promises[1].resolve();
      });

      // Trigger event that shoudl fire on both clients
      clients[0].method('event-test', 'my-arg');

      Promise.all([
        promises[0].promise,
        promises[1].promise
      ]).then(() => done());
    });

    test('it can target separate clients', function(done) {
      var endpoint = createEndpoint('service-test-1-worker.js', 'worker');
      var clients = [];

      var spy1 = sinon.spy();
      var spy2 = sinon.spy();
      var spy3 = sinon.spy();

      clients.push(createClient('service-1', endpoint));
      clients.push(createClient('service-1', endpoint));
      clients.push(createClient('service-1', endpoint));

      clients[0].on('eventname', spy1);
      clients[1].on('eventname', spy2);
      clients[2].on('eventname', spy3);

      Promise.all([
        clients[0].connected,
        clients[1].connected,
        clients[2].connected
      ]).then(() => {
        return clients[0].method('targetedBroadcast', 'eventname', 'data', [
          clients[0].id,
          clients[1].id
        ]);
      }).then(() => {
        sinon.assert.called(spy1);
        sinon.assert.called(spy2);
        sinon.assert.notCalled(spy3);
        done();
      }).catch(done);
    });

    test('clients don\'t recieve event\'s once disconnected', done => {
      var endpoint = createEndpoint('service-test-1-worker.js', 'worker');
      var spy1 = sinon.spy();
      var spy2 = sinon.spy();
      var wait = deferred();
      var clients = [];

      clients.push(createClient('service-2', endpoint));
      clients.push(createClient('service-2', endpoint));

      clients[0].on('test-event', spy1);
      clients[1].on('test-event', data => {
        spy2();
        wait.resolve();
      });

      // Trigger event that shoudl fire on both clients
      clients[1].method('event-test', 'my-arg');

      wait.promise.then(() => {
        clients[0].disconnect();
        clients[1].method('event-test', 'my-arg');
        wait = deferred();
        return wait.promise;
      }).then(() => {
        setTimeout(() => {
          sinon.assert.calledOnce(spy1);
          sinon.assert.calledTwice(spy2);
          done();
        });
      }).catch(done);
    });

    test('the service recieves an event when client begins listening', function(done) {
      createService('internal-service').listen()
        .on('on', data => {
          assert.equal(data.name, 'some-event');
          assert.equal(data.clientId, myClient.id);
          done();
        });

      var myClient = createClient('internal-service', self);
      myClient.on('some-event', () => {});
    });

    test('the service recieves an event when client stops listening', function(done) {
      createService('internal-service').listen()
        .on('off', data => {
          assert.equal(data.name, 'some-event');
          assert.equal(data.clientId, myClient.id);
          done();
        });

      var myClient = createClient('internal-service', self);
      myClient.on('some-event', () => {});
      myClient.off('some-event', () => {});
    });
  });

  test('it throws if no endpoint is defined', function(done) {
    try { var client = new Client('my-service'); }
    catch (e) { done(); }
  });

  suite('streams >>', function() {
    var myClient;

    setup(function() {
      worker = createEndpoint('service-test-1-worker.js', 'worker');
      myClient = createClient('test-streams', worker)
        .plugin(streamClient);
    });

    test('listen + close', function(done) {
      var stream = myClient.stream('test-data', 'bar', 123);
      var buffer = '';

      stream.listen(data => buffer += data);
      stream.closed.then(() => {
        assert.equal(buffer, '1: bar 123 | 2: this should also work');
        done();
      }).catch(done);
    });

    test('listen + unlisten + close', function(done) {
      var stream = myClient.stream('test-data', 'bar', 123);
      var buffer = '';
      stream.listen(function onData(data) {
        buffer += data;
        // stop listening for data
        stream.unlisten(onData);
      });
      stream.closed.then(function() {
        assert.equal(buffer, '1: bar 123');
        done();
      });
    });

    test('abort', function(done) {
      var stream = myClient.stream('test-abort', 123);
      stream.closed.then((data) => {
        done('close should not be called');
      }).catch(abortReason => {
        assert.equal(abortReason, 'someArg should not equal 123');
        done();
      });
    });

    test('listen + cancel', function(done) {
      var stream = myClient.stream('test-cancel');
      var buffer = '';

      stream.listen(data => buffer += data);
      stream.closed
        .then(() => done('close should not be called'))
        .catch(() => done('abort should not be called'));

      stream.cancel('because I want it').then(data => {
        assert.equal(data, 'because I want it!!!');
        assert.ok(buffer.length > 0);
        done();
      }).catch(done);
    });
  });

  suite('connecting to already running services >>', function() {
    test('worker', done => {
      var endpoint = createEndpoint('service-test-1-worker.js', 'worker');

      // Wait for a while
      setTimeout(() => {
        var myClient = createClient('service-1', endpoint);
        myClient.method('method-1', 'my-arg').then(result => {
          assert.deepEqual(result, 'my-arg');
          done();
        }).catch(done);
      }, 100);
    });
  });

  suite.skip('disconnecting Clients when service thread dies >>', function() {
    test('iframe', function(done) {
      var endpoint = createEndpoint('service-test-1-window.html', 'iframe');
      var myClient = createClient('service-1', endpoint);
      var scope = createClient('scope', endpoint);
      var spy = sinon.spy();

      myClient.on('disconnected', spy);
      scope.method('close').then(() => {
        assert.ok(!myClient.connected);
        sinon.assert.calledOnce(spy);
        done();
      }).catch(done);
    });

    test('worker', function(done) {
      var endpoint = createEndpoint('service-test-1-worker.js', 'worker');
      var myClient = createClient('service-1', endpoint);
      var scope = createClient('scope', endpoint);
      var spy = sinon.spy();

      myClient.on('disconnected', spy);
      scope.method('close').then(() => {
        assert.ok(!myClient.connected);
        sinon.assert.calledOnce(spy);
        done();
      }).catch(done);
    });

    test('window.open()', function(done) {
      var endpoint = createEndpoint('service-test-1-window.html', 'window');
      var myClient = createClient('service-1', endpoint);
      var scope = createClient('scope', endpoint);
      var spy = sinon.spy();

      myClient.on('disconnected', spy);
      scope.method('close').then(() => {
        assert.ok(!myClient.connected);
        sinon.assert.calledOnce(spy);
        done();
      }).catch(done);
    });
  });

  suite('exceptions >>', function() {
    test('un-clonable object', function(done) {
      worker = createEndpoint('service-test-1-worker.js', 'worker');
      var myClient = createClient('service-2', worker);
      myClient.method('cloningError').catch(function(err) {
        done();
      });
    });

    test('promise.reject without message', function(done) {
      var endpoint = createEndpoint('service-test-1-worker.js', 'worker');
      var myClient = createClient('service-2', endpoint);
      myClient.method('rejectWithoutMessage').catch(function(err) {
        assert.isUndefined(err);
        done();
      }).catch(done);
    });

    test('promise.reject with message', function(done) {
      var endpoint = createEndpoint('service-test-1-worker.js', 'worker');
      var myClient = createClient('service-2', endpoint);
      myClient.method('rejectWithMessage').catch(function(err) {
        assert.equal(err, 'my error');
        done();
      }).catch(done);
    });

    test('thrown exception', function(done) {
      var endpoint = createEndpoint('service-test-1-worker.js', 'worker');
      var myClient = createClient('service-2', endpoint);
      myClient.method('throwException').catch(function(err) {
        assert.equal(err, 'my error');
        done();
      });
    });
  });

  suite('BroadcastChannel >>', function() {
    test('can be used', function(done) {
      createEndpoint('service-test-1-window.html', 'window');

      var bc = new BroadcastChannel('bc-service-channel');
      var myClient = createClient('bc-service', bc);

      myClient.method('ping').then(result => {
        assert.equal(result, 'pong');
        done();
      });
    });
  });

  suite('module support >>', function() {
    test('AMD', function(done) {
      var iframe = iframeService('requirejs-test.html');
      bridge.service('requirejs-test')
        .listen(iframe)
        .method('ping', function() {
          done();
        });
    });
  });

  /**
   * Utils
   */

  function iframeService(src) {
    var iframe = document.createElement('iframe');
    iframe.src = '/base/test/unit/lib/' + src;
    iframe.setAttribute('sandbox', 'allow-same-origin allow-scripts');
    iframe.hidden = true;
    dom.appendChild(iframe);
    return iframe;
  }

  function createClient(name, endpoint) {
    var cli = client(name, endpoint);
    clients.push(cli);
    return cli;
  }

  function destroyClients() {
    return Promise.all(clients.map(client => client.destroy()))
      .then(() => clients = []);
  }

  function deferred() {
    var promise = {};
    promise.promise = new Promise((resolve, reject) => {
      promise.resolve = resolve;
      promise.reject = reject;
    });
    return promise;
  }

  function createService(name) {
    var _service = service(name);
    services.push(_service);
    return _service;
  }

  function destroyServices() {
    return Promise.all(services.map(service => service.destroy()))
      .then(() => services = []);
  }

  function createEndpoint(file, type) {
    var path = '/base/test/unit/lib/' + file;
    var endpoint = create(type);

    endpoints.push(endpoint);
    return endpoint;

    function create(type) {
      switch (type) {
        case 'window': return window.open(path);
        case 'iframe': return iframeService(file);
        case 'worker': return new Worker(path);
        case 'sharedworker': return new SharedWorker(path, String(Date.now()));
      }
    }
  }

  function destroyEndpoints() {
    endpoints.forEach(endpoint => {
      switch (endpoint.constructor.name) {
        case 'HTMLIframeElement': endpoint.remove(); break;
        case 'Worker': endpoint.terminate(); break;
        case 'Window': endpoint.close();
      }
    });
    endpoints = [];
  }
});
