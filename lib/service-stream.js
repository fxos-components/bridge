
'use strict';

var utils = require('./utils');

module.exports = ServiceStream;

/**
 * Writable Stream instance passed to the `service.stream` implementation
 *
 * @param {Object} options
 * @param {String} options.id Stream ID used to sync client and service streams
 * @param {BroadcastChannel} options.channel Channel used to postMessage
 * @param {String} options.serviceId ID of the service
 * @param {String} options.clientId ID of client that should receive message
 */
function ServiceStream(options) {
  this._ = new PrivateServiceStream(this, options);
}

/**
 * Services that allows clients to cancel the operation before it's complete
 * should override the `stream.cancel` method.
 *
 * @param {*} [reason] Data sent from client about the cancellation
 * @returns {(Promise|*)}
 */
ServiceStream.prototype.cancel = function(reason) {
  var err = new TypeError('service should implement stream.cancel()');
  return Promise.reject(err);
};

/**
 * Signal to client that action was aborted during the process, this should be
 * used as a way to communicate errors.
 *
 * @param {*} [data] Reason of failure
 * @returns {Promise}
 */
ServiceStream.prototype.abort = function(data) {
  return this._.post('abort', 'aborted', data);
};

/**
 * Sends a chunk of data to the client.
 *
 * @param {*} data Chunk of data to be sent to client.
 * @returns {Promise}
 */
ServiceStream.prototype.write = function(data) {
  return this._.post('write', 'writable', data);
};

/**
 * Closes the stream, signals that action was completed with success.
 *
 * @returns {Promise}
 */
ServiceStream.prototype.close = function() {
  // according to whatwg streams spec, WritableStream#close() don't send data
  return this._.post('close', 'closed');
};

/**
 * @private
 */
function PrivateServiceStream(target, opts) {
  this.target = target;
  this.id = opts.id;
  this.channel = opts.channel;
  this.client = opts.clientId;
  this.state = 'writable';
  this.message = new utils.Messages(this, opts.serviceId, []);
}

/**
 * validate the internal state to avoid passing data to the client when
 * stream is already "closed/aborted/canceled".
 * returns a Stream to simplify the "cancel" & "post" logic since they always
 * need to return promises.
 *
 * @param {String} actionName
 * @param {String} state
 * @private
 * @returns {Promise}
 */
PrivateServiceStream.prototype.validateState = function(actionName, state) {
  if (this.state !== 'writable') {
    var msg = 'Can\'t ' + actionName + ' on current state: ' + this.state;
    return Promise.reject(new TypeError(msg));
  }
  this.state = state;
  return Promise.resolve();
};

/**
 * Validate the current state and call cancel on the target strem. Called by
 * the Service when client sends a "streamcancel" message.
 *
 * @param {*} [reason] Reason for cancelation sent by the client
 * @private
 * @returns {Promise}
 */
PrivateServiceStream.prototype.cancel = function(reason) {
  return this.validateState('cancel', 'canceled').then(function() {
    return this.target.cancel(reason);
  }.bind(this));
};

/**
 * Validate the current state and post message to client.
 *
 * @param {String} type 'write', 'abort' or 'close'
 * @param {String} state 'writable', 'aborted' or 'closed'
 * @param {*} [data] Data to be sent to the client
 * @private
 * @returns {Promise}
 */
PrivateServiceStream.prototype.post = function(type, state, data) {
  return this.validateState(type, state).then(function() {
    return this.channel.postMessage(this.message.create('streamevent', {
      recipient: this.client,
      data: {
        id: this.id,
        type: type,
        data: data
      }
    }));
  }.bind(this));
};
