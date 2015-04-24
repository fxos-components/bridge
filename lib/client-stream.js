
'use strict';

var Emitter = require('./emitter');
var utils = require('./utils');

module.exports = ClientStream;

/**
 * Readable stream instance returned by a `client.stream('methodName')` call.
 *
 * @param {Object} options
 * @param {String} options.id Stream Id, used to match client/service streams
 * @param {Client} options.client Client instance
 */
function ClientStream(options) {
  this._ = new ClientStreamPrivate(options);
}

/**
 * Promise that will be "resolved" when stream is closed with success, and
 * "rejected" when service aborts the action (abort == error).
 *
 * @type Promise
 */
Object.defineProperty(ClientStream.prototype, 'closed', {
  get: function() {
    return this._.closed.promise;
  }
});

/**
 * Add a listener that will be called every time the service broadcasts a new
 * chunk of data.
 *
 * @param {Function} callback
 */
ClientStream.prototype.listen = function(callback) {
  this._.emitter.on('write', callback);
};

/**
 * Removes "data" listener
 *
 * @param {Function} callback
 */
ClientStream.prototype.unlisten = function(callback) {
  this._.emitter.off('write', callback);
};

/**
 * Notify the service that action should be canceled
 *
 * @param {*} [reason] Optional data to be sent to service.
 */
ClientStream.prototype.cancel = function(reason) {
  var client = this._.client;
  var id = this._.id;
  var canceled = utils.deferred();

  client.request('streamcancel', {
    id: id,
    reason: reason
  }).then(function(data) {
    delete client._activeStreams[id];
    canceled.resolve(data);
  }).catch(function(e) {
    // should delete the `_activeStreams` reference even if it didn't succeed
    delete client._activeStreams[id];
    canceled.reject(e);
  });

  return canceled.promise;
};

/**
 * @private
 */
function ClientStreamPrivate(opts) {
  this.id = opts.id;
  this.client = opts.client;
  this.closed = utils.deferred();
  this.emitter = new Emitter();
}

/**
 * Used internally by Client when it receives an "abort" event from the service
 * @private
 */
ClientStreamPrivate.prototype.abort = function(reason) {
  this.closed.reject(reason);
};

/**
 * Used internally by Client when it receives a "close" event from the service
 * @private
 */
ClientStreamPrivate.prototype.close = function() {
  this.closed.resolve();
};

/**
 * Used internally by Client when it receives a "write" event from the service
 * @private
 */
ClientStreamPrivate.prototype.write = function(data) {
  this.emitter.emit('write', data);
};
