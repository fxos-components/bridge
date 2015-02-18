/*global window,assert,suite,setup,teardown,sinon,test*/
/*jshint esnext:true*/

var Client = require('../lib/client');
var contract = require('./lib/contract');

suite('client', function() {
  'use strict';

  setup(function() {
    this.sinon = sinon.sandbox.create();
  });

  teardown(function() {
    this.sinon.restore();
  });

  suite('worker', function() {
    setup(function() {
      this.worker = new Worker('/base/test/lib/worker.js');
      this.client = new Client(contract, this.worker);
    });

    teardown(function() {
      this.worker.terminate();
    });

    test('It works', function(done) {
      this.client.getContact(1).then((result) => {
        assert.deepEqual(result, { id: 1, firstname: 'bill' });
        done();
      });
    });
  });

  suite('sharedworker', function() {
    setup(function() {
      this.worker = new SharedWorker('/base/test/lib/worker.js');
      this.worker.port.start();
      this.client = new Client(contract, this.worker);
    });

    teardown(function() {
      this.worker.port.close();
    });

    suite('methods', function() {
      test('It works', function(done) {
        this.client.getContact(1).then((result) => {
          assert.deepEqual(result, { id: 1, firstname: 'bill' });
          done();
        });
      });
    });

    suite('events', function() {
      test('It works', function(done) {
        this.client.addEventListener('contactchanged', e => {
          assert.deepEqual(e.data, { id: 3, firstname: 'ben' });
          done();
        });

        // Ping the server to test a dispatch event
        this.client.testBroadcast('contactchanged');
      });

      test('It only calls the callbacks for the event name', function(done) {
        this.client.addEventListener('someeventname', e => {
          done('should not be called');
        });

        this.client.addEventListener('contactchanged', e => {
          done();
        });

        // Ping the server to test a dispatch event
        this.client.testBroadcast('contactchanged');
      });

      test('It removes event listeners', function(done) {
        var spy = sinon.spy();

        this.client.addEventListener('contactchanged', spy);
        this.client.removeEventListener('contactchanged', spy);

        // Ping the server to test a dispatch event
        this.client.testBroadcast('contactchanged');

        setTimeout(() => {
          sinon.assert.notCalled(spy);
          done();
        }, 200);
      });

      test('It throws when attempting to listen to uncontracted event', function() {
        var call = this.client.addEventListener.bind(this.client, 'unknownevent', ()=> {});
        assert.throws(call);
      });
    });
  });
});