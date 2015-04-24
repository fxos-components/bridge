/*global threads,assert,suite,setup,teardown,test*/
/*jshint esnext:true, maxlen:false*/

suite('ServiceStream /', function() {

  // we use these tests basically just to check edge cases, regular use cases
  // are handled by the client tests

  var stream;
  var lastMessage;

  setup(function() {
    stream = new threads.service.Stream({
      id: 'fake-stream-id',
      channel: {
        postMessage: msg => {
          lastMessage = msg;
          assert.include(['abort', 'close', 'write'], msg.data.type);
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
    stream.write('lorem').then(() => {
      assert.equal(lastMessage.data.data, 'lorem');
      stream.close();
      // write will be ignored
      stream.write('ipsum').catch(err => {
        assert.ok(err);
        assert.equal(lastMessage.data.type, 'close');
        done();
      });
    });
  });

  test('close + close', function(done) {
    stream.close().catch(() => done('first call should succeed'));
    stream.close()
      .then(() => done('second call should fail'))
      .catch(err => {
        assert.ok(err);
        done();
      });
  });

  test('close + abort', function(done) {
    stream.close().catch(() => done('first call should succeed'));
    stream.abort()
      .then(() => done('second call should fail'))
      .catch(err => {
        assert.ok(err);
        assert.equal(lastMessage.data.type, 'close');
        done();
      });
  });

  test('abort + abort', function(done) {
    stream.abort().catch(() => done('first call should succeed'));
    stream.abort()
      .then(() => done('second call should fail'))
      .catch(err => {
        assert.ok(err);
        done();
      });
  });

  test('abort + close', function(done) {
    stream.abort().catch(() => done('first call should succeed'));
    stream.close()
      .then(() => done('second call should fail'))
      .catch(err => {
        assert.ok(err);
        assert.equal(lastMessage.data.type, 'abort');
        done();
      });
  });

  test('abort + write', function(done) {
    stream.abort().catch(() => done('first call should succeed'));
    stream.write('lorem ipsum')
      .then(() => done('second call should fail'))
      .catch(err => {
        assert.ok(err);
        assert.equal(lastMessage.data.type, 'abort');
        done();
      });
  });

  suite('cancel /', function() {
    test('not implemented', function(done) {
      cancelStream()
        .then(() => done('cancel should fail'))
        .catch(err => {
          assert.ok(err);
          done();
        });
    });

    suite('implemented /', function() {
      test('sync', function(done) {
        stream.cancel = reason => assert.equal(reason, 'foo');
        cancelStream('foo')
          .then(() => done())
          .catch(() => done('should not be called'));
      });

      test('sync error', function(done) {
        stream.cancel = reason => {
          assert.equal(reason, 'with error');
          throw new Error('cancel error!');
        };
        cancelStream('with error')
          .then(() => done('this should not be called'))
          .catch(err => {
            assert.ok(err);
            done();
          });
      });

      test('async success', function(done) {
        stream.cancel = reason => {
          assert.equal(reason, 'success');
          return Promise.resolve('canceled with success');
        };
        cancelStream('success')
          .then(msg => {
            assert.equal(msg, 'canceled with success');
            done();
          });
      });

      test('async error', function(done) {
        stream.cancel = reason => {
          assert.equal(reason, 'foo');
          return Promise.reject(new Error('failed to cancel'));
        };
        cancelStream('foo')
          .then(() => done(new Error('should fail')))
          .catch(err => {
            assert.ok(err);
            done();
          });
      });
    });
  });
});
