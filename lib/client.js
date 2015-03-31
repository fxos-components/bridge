
'use strict';

/**
 * Dependencies
 */

var thread = require('./thread-global');
var Emitter = require('./emitter');
var utils = require('./utils');

/**
 * Exports
 */

module.exports = Client;

/**
 * Global 'manager' channel
 * @type {BroadcastChannel}
 */
var manager = new BroadcastChannel('threadsmanager');

/**
 * Simple logger
 * @type {Function}
 */
var debug = 1 ? console.log.bind(console, '[client]') : function() {};

/**
 * Allowed message types
 * @type {Array}
 */
const KNOWN_MESSAGES = [
  'response',
  'broadcast',
  'connected'
];

/**
 * Extend `Emitter`
 */

Client.prototype = Object.create(Emitter.prototype);

function Client(service, options) {
  if (!(this instanceof Client)) return new Client(service, options);
  this.contract = options && options.contract;
  this.thread = options && options.thread;
  this.id = utils.uuid();
  this.connected = false;
  this.requests = {};
  this.requestQueue = [];

  this.service = {
    channel: undefined,
    name: service,
    id: undefined
  };

  this.Message = utils.message.factory(this.id);
  this.onmessage = utils.message.handler(this.id, KNOWN_MESSAGES).bind(this);
  manager.addEventListener('message', this.onmessage);

  // If this client is directly linked to the thread
  // then listen for messages directly from that thread
  if (this.thread) this.thread.on('message', this.onmessage);

  this.connect();
  debug('initialize', service);
}

Client.prototype.connect = function() {
  debug('connect');
  if (this.connected) return;

  // Create a pipe ready for the
  // service to send messages down
  this.service.channel = new BroadcastChannel(this.id);
  this.service.channel.onmessage = this.onmessage;

  if (this.thread) this.connectViaThread();
  else this.connectViaManager();
};

Client.prototype.connectViaThread = function() {
  debug('connect via thread');
  var self = this;

  // Check that the service we're looking
  // for is ready on the target thread.
  if (!this.thread.isReady(this.service.name)) {
    this.thread.on('serviceready', function fn(service) {
      debug('service ready', service);
      if (service.name !== self.service.name) return;
      self.thread.off('serviceready', fn);
      self.service.id = service.id;
      self.connectViaThread();
    });
  }

  this.thread.postMessage(new this.Message('connect', {
    recipient: this.service.id,
    data: {
      client: this.id,
      contract: this.contract
    }
  }));
};

Client.prototype.connectViaManager = function() {
  debug('connect via manager');

  // Send a message to the threads
  // manager to indicate that this
  // process wants to connect with
  // a particular service.
  manager.postMessage(new this.Message('connect', {
    recipient: 'threadsmanager',
    data: {
      service: this.service.name,
      client: this.id
    },
  }));
};

Client.prototype.disconnect = function() {
  // if (!this.connected) deferred.reject('not connected');
  debug('disconnect');
  return this.request('disconnect', this.id)
    .then(r => this.ondisconnected(r));
};

Client.prototype.request = function(type, data) {
  debug('request', type, data);
  var deferred = utils.deferred();

  // If the client isn't yet connected,
  // add the request to a queue to be
  // flushed once a connection is made.
  if (!this.connected) {
    this.requestQueue.push({
      deferred: deferred,
      arguments: arguments
    });

    debug('request queued until connected');
    return deferred.promise;
  }

  var requestId = utils.uuid();
  var message = new this.Message('request', {
    recipient: this.service.id,
    data: {
      type: type,
      id: requestId,
      client: this.id,
      data: data
    }
  });

  this.requests[requestId] = deferred;
  this.service.channel.postMessage(message);
  return deferred.promise;
};

Client.prototype.onconnected = function(service) {
  debug('connected', service);
  this.service.id = service.id;
  this.connected = true;
  this.flushRequestQueue();
  thread.connection('outbound');
};

Client.prototype.onresponse = function(response) {
  debug('on response', response);
  var request = response.request;
  var promise = this.requests[request.id];
  if (!promise) return;

  var result = response.result;
  var method = {
    'fulfilled': 'resolve',
    'rejected': 'reject'
  }[result.state];

  // The value resided under a different
  // key depending on whether the promise
  // was 'rejected' or 'resolved'
  var value = result.value || result.reason;
  promise[method](value);

  // Clean up
  delete this.requests[request.id];
};

Client.prototype.onbroadcast = function(broadcast) {
  debug('on broadcast', broadcast);
  this.emit(broadcast.type, broadcast.data);
};

Client.prototype.ondisconnected = function() {
  debug('disconnected');

  // Ping the service one last time to let it
  // know that we've disconnected client-side
  this.service.channel.postMessage(new this.Message('disconnected', {
    recipient: this.service.id,
    data: this.id
  }));

  this.service.channel.close();
  delete this.service.channel;
  delete this.service.id;
  this.connected = false;
  thread.disconnection('outbound');
};

Client.prototype.call = function(method) {
  var args = [].slice.call(arguments, 1);
  debug('call', method, args);
  return this.request('method', {
    name: method,
    args: args
  });
};

Client.prototype.flushRequestQueue = function() {
  debug('flush waiting calls');
  var request;
  while ((request = this.requestQueue.shift())) {
    var resolve = request.deferred.resolve;
    resolve(this.request.apply(this, request.arguments));
  }
};
