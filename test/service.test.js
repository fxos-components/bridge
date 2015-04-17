/*global threads,assert,suite,setup,teardown,test*/
/*jshint esnext:true, maxlen:false*/

suite('Service /', function() {
  suite('client provided contracts /', function() {
    setup(function() {
      this.thread = threads.create({
        src: '/base/test/lib/contracts.js',
        type: 'worker'
      });

      this.contract = {
        methods: {
          contractMethod: ['string']
        },

        events: {
          'contractevent': {
            object: 'object',
            number: 'number',
            string: 'string',
            boolean: 'boolean'
          }
        }
      };

      this.client = threads.client('contract-service', {
        thread: this.thread,
        contract: this.contract
      });
    });

    teardown(function(done) {
      this.client.disconnect().then(done, done);
    });

    test('contract method calls are allowed', function(done) {
      this.client.method('contractMethod', 'foo').then(result => {
        assert.equal(result, 'conformance: foo');
      }).then(done, done);
    });

    test('uncontracted method calls throw', function(done) {
      this.client.method('uncontractMethod').then(result => {
        assert.equal(result, 'rebellion');
        done('should not be called');
      }).catch(err => {
        assert.ok(err);
        done();
      }).then(done, done);
    });

    test('calling with incorrect argument type throws', function(done) {
      this.client.method('contractMethod', {}).then(result => {
        assert.equal(result, 'rebellion');
        done('should not be called');
      }).catch(err => {
        assert.ok(err);
        done();
      }).then(done, done);
    });

    test('calling with incorrect arguments.length throws', function(done) {
      this.client.method('contractMethod', '1', '2', '3').then(result => {
        assert.equal(result, 'rebellion');
        done('should not be called');
      }).catch(err => {
        assert.ok(err);
        done();
      }).then(done, done);
    });
  });

  suite('server provided contracts', function() {
    setup(function() {
      this.thread = threads.create({
        src: '/base/test/lib/contracts.js',
        type: 'worker'
      });

      this.client = threads.client('service-supplied-contract', {
        thread: this.thread
      });
    });

    test('contract method calls are allowed', function(done) {
      this.client.method('contractMethod', 'foo').then(result => {
        assert.equal(result, 'conformance: foo');
      }).then(done, done);
    });

    test('uncontracted method calls throw', function(done) {
      this.client.method('uncontractMethod').then(result => {
        assert.equal(result, 'rebellion');
        done('should not be called');
      }).catch(err => {
        assert.ok(err);
        done();
      }).then(done, done);
    });
  });
});
