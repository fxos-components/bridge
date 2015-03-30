
'use strict';

/**
 * Dependencies
 */

var Emitter = require('./emitter');
var thread = require('./monitor');
var utils = require('./utils');


var manager = new BroadcastChannel('threadsmanager');

/**
 * Simple logger
 *
 * @type {Function}
 */
var debug = 1 ? console.log.bind(console, '[client]') : function() {};

const KNOWN_MESSAGES = [
  'response',
  'broadcast',
  'connected'
];

/**
 * Exports
 */

module.exports = Client;

/**
 * Extend `Emitter`
 */

Client.prototype = Object.create(Emitter.prototype);

function Client(service) {
  if (!(this instanceof Client)) return new Client(service);
  this.id = utils.uuid();
  this.connected = false;
  this.requests = {};
  this.requestQueue = [];
  this.service = {
    channel: undefined,
    name: service,
    id: undefined
  };

  this.send = utils.message.sender(thread.id, this.id, 'client');
  this.onmessage = utils.message.handler(this.id, KNOWN_MESSAGES).bind(this);
  manager.addEventListener('message', this.onmessage);
  this.connect();

  debug('initialize', service);
}

Client.prototype.connect = function() {
  if (this.connected) return;
  debug('connect');

  // Create a pipe ready for the service to open
  this.service.channel = new BroadcastChannel(this.id);
  this.service.channel.onmessage = this.onmessage;

  // Send a message to the threads
  // manager to indicate that this
  // process wants to connect with
  // a particular service.
  this.send(manager, 'connect', {
    recipient: 'threadsmanager',
    data: {
      service: this.service.name,
      client: this.id
    },
  });
};

Client.prototype.onconnected = function(service) {
  debug('connected', service);
  this.service.id = service.id;
  this.connected = true;
  this.flushRequestQueue();
  thread.connection('outbound');
};

Client.prototype.disconnect = function() {
  // if (!this.connected) deferred.reject('not connected');
  debug('disconnect');
  return this.request(this.service.channel, 'disconnect', this.id)
    .then(r => this.ondisconnected(r));
};

Client.prototype.ondisconnected = function() {
  debug('disconnected');

  // Ping the service one last time to let it
  // know that we've disconnected client-side
  this.send(this.service.channel, 'disconnected', {
    recipient: this.service.id,
    data: this.id
  });

  this.service.channel.close();
  delete this.service.channel;
  delete this.service.id;
  this.connected = false;
  thread.disconnection('outbound');
};

Client.prototype.request = function(channel, type, data) {
  debug('request', channel, type, data);
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
  this.requests[requestId] = deferred;

  this.send(channel, 'request', {
    recipient: this.service.id,
    data: {
      type: type,
      id: requestId,
      client: this.id,
      data: data
    }
  });

  return deferred.promise;
};

/**
 * The response should define
 * whether the Promise was resolved
 * or rejected by the service.
 */
Client.prototype.onresponse = function(response) {
  debug('on response', response);
  var request = response.request;
  var promise = this.requests[request.id];
  if (!promise) return;

  var method = {
    'fulfilled': 'resolve',
    'rejected': 'reject'
  }[response.result.state];

  promise[method](response.result.value);
  delete this.requests[request.id];
};

Client.prototype.call = function(method) {
  var args = [].slice.call(arguments, 1);
  debug('call', method, args);
  return this.request(this.service.channel, 'method', {
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
