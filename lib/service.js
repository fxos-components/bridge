
'use strict';

/**
 * Dependencies
 */

var Emitter = require('./emitter');
var thread = require('./monitor');
var utils = require('./utils');

/**
 * exports
 */

module.exports = Service;

/**
 * Mini Logger
 *
 * @type {Function}
 */
var debug = 1 ? console.log.bind(console, '[service]') : function(){};

var manager = new BroadcastChannel('threadsmanager');

const MESSAGE_TYPES = [
  'connect',
  'disconnected',
  'request'
];

const REQUEST_TYPES = [
  'method',
  'disconnect'
];

const ERRORS = {
  1: 'method not defined in the contract',
  2: 'arguments.length doesn\'t match contract',
  3: 'unknown request type',
  4: 'method doesn\'t exist'
};

/**
 * Extend `Emitter`
 */

Service.prototype = Object.create(Emitter.prototype);

function Service(name, methods) {
  if (!(this instanceof Service)) return new Service(name, methods);
  debug('initialize', name, methods);
  this.id = utils.uuid();
  this.name = name;
  this.methods = methods;

  this.channels = {};
  this.manager = manager;
  this.send = utils.message.sender(thread.id, this.id, 'service');
  this.onmessage = utils.message.handler(this.id, MESSAGE_TYPES).bind(this);
  this.manager.addEventListener('message', this.onmessage);
  this.ready();

  debug('initialized');
}

/**
 * Call the corresponding method and
 * respond with a 'serialized' promise.
 *
 * @param  {Object} request
 */
Service.prototype.onrequest = function(request) {
  debug('on request', request);
  var self = this;

  // Check to insure this is a known request type
  if (!~REQUEST_TYPES.indexOf(request.type)) return reject(ERRORS[3]);

  // Call the handler and make
  // sure return value is a promise
  Promise.resolve(this['on' + request.type](request.data))
    .then(resolve, reject);

  function resolve(value) {
    self.respond(request, {
      state: 'fulfilled',
      value: value
    });
  }

  function reject(reason) {
    self.respond(request, {
      state: 'rejected',
      reason: reason
    });
  }
};

Service.prototype.onmethod = function(method) {
  debug('method', method);
  var fn = this.methods[method.name];
  if (!fn) throw new Error(ERRORS[4]);
  return fn.apply(this, method.args);
};

Service.prototype.respond = function(request, result) {
  debug('respond', request.client, result);
  var channel = this.channels[request.client];
  this.send(channel, 'response', {
    recipient: request.client,
    data: {
      request: request,
      result: result
    }
  });
};

Service.prototype.ready = function() {
  debug('ready');
  thread.broadcast('serviceready', {
    name: this.name,
    id: this.id
  });
};

Service.prototype.onconnect = function(client) {
  debug('on connect', client);
  if (!client) return;
  if (this.channels[client]) return;
  var channel = new BroadcastChannel(client);
  channel.onmessage = this.onmessage;
  this.channels[client] = channel;
  thread.connection('inbound');

  this.send(channel, 'connected', {
    recipient: client,
    data: {
      id: this.id,
      name: this.name
    }
  });

  debug('connected', client);
};


Service.prototype.ondisconnect = function(client) {
  if (!client) return;
  if (!this.channels[client]) return;
  debug('on disconnect', client);

  var deferred = utils.deferred();

  // TODO: Check there are no requests/methods
  // pending for this client, before disconnecting.
  deferred.resolve();

  thread.disconnection('inbound');
  return deferred.promise;
};

Service.prototype.ondisconnected = function(client) {
  debug('disconnected', client);
  this.channels[client].close();
  delete this.channels[client];
};

// Service.prototype.send = function(channel, type, params) {
//   debug('send', channel.name, params);
//   channel.postMessage({
//     id: utils.uuid(),
//     type: type,
//     sender: this.id,
//     recipient: params.recipient,
//     data: params.data
//   });
// };

Service.prototype.broadcast = function(name, data) {
  debug('broadcast', name, data);
  for (var channel in this.channels) {
    this.send(channel, 'broadcast', {
      recipient: channel.name, // hacky
      data: {
        name: name,
        data: data
      }
    });
  }
};
