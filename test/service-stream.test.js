/*global bridge,assert,suite,setup,teardown,test*/
/*jshint esnext:true, maxlen:false*/

suite('ServiceStream /', function() {

  // we use these tests basically just to check edge cases, regular use cases
  // are handled by the client tests

  var stream;
  var lastMessage;

  setup(function() {
    stream = new bridge.service.Stream({
      id: 'fake-stream-id',
      channel: {
        postMessage: function(msg) {
          lastMessage = msg.data;
          assert.include(['abort', 'close', 'write'], msg.data.data.type);
        }
      },
      serviceId: '123456',
      clientId: '123'
    });
  });

  function cancelStream(reason) {
    return stream._.cancel(reason);
  }

  test('write + close + write', function(done) {
    stream.write('lorem').then(function() {
      assert.equal(lastMessage.data.data, 'lorem');
      stream.close();
      // write will be ignored
      stream.write('ipsum').catch(function(err) {
        assert.ok(err);
        assert.equal(lastMessage.data.type, 'close');
        done();
      });
    }).then(done, done);
  });

  test('close + close', function(done) {
    stream.close().catch(function() { done('first call should succeed'); });
    stream.close()
      .then(function() { done('second call should fail'); })
      .catch(function(err) {
        assert.ok(err);
        done();
      });
  });

  test('close + abort', function(done) {
    stream.close().catch(function() { done('first call should succeed'); });
    stream.abort()
      .then(function() { done('second call should fail'); })
      .catch(function(err) {
        assert.ok(err);
        assert.equal(lastMessage.data.type, 'close');
        done();
      });
  });

  test('abort + abort', function(done) {
    stream.abort().catch(function() { done('first call should succeed'); });
    stream.abort()
      .then(function() { done('second call should fail'); })
      .catch(function(err) {
        assert.ok(err);
        done();
      });
  });

  test('abort + close', function(done) {
    stream.abort().catch(function() { done('first call should succeed'); });
    stream.close()
      .then(function() { done('second call should fail'); })
      .catch(function(err) {
        assert.ok(err);
        assert.equal(lastMessage.data.type, 'abort');
        done();
      });
  });

  test('abort + write', function(done) {
    stream.abort().catch(function() { done('first call should succeed'); });
    stream.write('lorem ipsum')
      .then(function() { done('second call should fail'); })
      .catch(function(err) {
        assert.ok(err);
        assert.equal(lastMessage.data.type, 'abort');
        done();
      });
  });

  suite('cancel /', function() {
    test('not implemented', function(done) {
      cancelStream()
        .then(function() { done('cancel should fail'); })
        .catch(function(err) {
          assert.ok(err);
          done();
        });
    });

    suite('implemented /', function() {
      test('sync', function(done) {
        stream.cancel = function(reason) { assert.equal(reason, 'foo'); };
        cancelStream('foo')
          .then(function() { done(); })
          .catch(function() { done('should not be called'); });
      });

      test('sync error', function(done) {
        stream.cancel = function(reason) {
          assert.equal(reason, 'with error');
          throw new Error('cancel error!');
        };
        cancelStream('with error')
          .then(function() { done('this should not be called'); })
          .catch(function(err) {
            assert.ok(err);
            done();
          });
      });

      test('async success', function(done) {
        stream.cancel = function(reason) {
          assert.equal(reason, 'success');
          return Promise.resolve('canceled with success');
        };
        cancelStream('success')
          .then(function(msg) {
            assert.equal(msg, 'canceled with success');
            done();
          });
      });

      test('async error', function(done) {
        stream.cancel = function(reason) {
          assert.equal(reason, 'foo');
          return Promise.reject(new Error('failed to cancel'));
        };
        cancelStream('foo')
          .then(function() { done(new Error('should fail')); })
          .catch(function(err) {
            assert.ok(err);
            done();
          });
      });
    });
  });
});
