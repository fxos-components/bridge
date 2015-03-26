;(function(define){define(function(require,exports,module){
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
var debug = 0 ? console.log.bind(console, '[client]') : function() {};

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
  this.callsWaiting = [];
  this.service = {
    channel: undefined,
    name: service,
    id: undefined
  };

  this.onmessage = this.onmessage.bind(this);
  manager.addEventListener('message', this.onmessage);
  this.connect();

  debug('initialize', service);
}

Client.prototype.onmessage = function(e) {
  var message = e.data;
  debug('on message', message);
  if (message.recipient != this.id) return;
  if (!~KNOWN_MESSAGES.indexOf(message.type)) return;
  this['on' + message.type](message.data);
};

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
  this.send(manager, {
    type: 'connect',
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
  this.flushCallsWaiting();
  thread.connection('outbound');
};

Client.prototype.disconnect = function() {
  if (!this.connected) return;
  debug('disconnect');

  this.request(this.channels.service, 'disconnect', {
    client: this.id // << may not be required
  }).then(r => this.ondisconnected(r));
};

Client.prototype.ondisconnected = function() {
  debug('disconnected');
  this.channels.service.close();
  delete this.channels.service;
  delete this.service.id;
  this.connected = false;
  thread.diconnection('outbound');
};

Client.prototype.request = function(channel, method, params) {
  debug('request', channel, method, params);
  var id = utils.uuid();
  var deferred = this.requests[id] = utils.deferred();

  this.send(channel, {
    type: 'request',
    recipient: this.service.id, // hack
    data: {
      id: id,
      client: this.id,
      method: method,
      args: params.args,
      data: params.data
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

  if (!this.connected) {
    var deferred = utils.deferred();
    this.callsWaiting.push({
      deferred: deferred,
      arguments: arguments
    });

    return deferred.promise;
  }

  return this.request(this.service.channel, method, { args: args });
};

Client.prototype.flushCallsWaiting = function() {
  debug('flush waiting calls');
  var call;
  while ((call = this.callsWaiting.shift())) {
    var resolve = call.deferred.resolve;
    resolve(this.call.apply(this, call.arguments));
  }
};

Client.prototype.send = function(channel, params) {
  channel.postMessage({
    id: utils.uuid(),
    type: params.type,
    sender: this.id,
    recipient: params.recipient,
    data: params.data
  });
};

});})(typeof define=='function'&&define.amd?define
:(function(n,w){return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('./lib/client',this));
