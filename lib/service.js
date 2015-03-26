;(function(define){define(function(require,exports,module){

/**
 * Dependencies
 */

var Emitter = require('./emitter');
var process = require('./monitor');
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
var debug = 0 ? console.log.bind(console, '[service]') : function(){};

var manager = new BroadcastChannel('threadsmanager');

const KNOWN_MESSAGES = [
  'connect',
  'request'
];

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
  this.onmessage = this.onmessage.bind(this);
  this.manager.addEventListener('message', this.onmessage);
  this.ready();

  debug('initialized');
}

Service.prototype.onmessage = function(e) {
  var message = e.data;
  debug('on message', message.recipient);
  if (message.recipient !== this.id) return;
  if (!~KNOWN_MESSAGES.indexOf(message.type)) return;
  this['on' + message.type](message.data);
};

/**
 * Call the corresponding method and
 * respond with a 'serialized' promise.
 *
 * @param  {Object} request [description]
 */
Service.prototype.onrequest = function(request) {
  debug('on request', request);
  var fn = this.methods[request.method];
  if (!fn) throw new Error(ERRORS[1]);
  var args = request.args || [];

  Promise.resolve(fn.apply(null, args))
  .then(value => {
    this.respond(request, {
      state: 'fulfilled',
      value: value
    });
  }).catch(reason => {
    this.respond(request, {
      state: 'rejected',
      reason: reason
    });
  });
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
  process.broadcast('serviceready', {
    pid: process.id,
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
  process.connection('inbound');

  this.send(channel, 'connected', {
    recipient: client,
    data: {
      id: this.id,
      name: this.name
    }
  });

  debug('connected', client);
};

Service.prototype.ondisconnect = function(data) {
  debug('on disconnect', data);
  var client = data.client;
  if (!client) return;
  if (this.channels[client]) return;

  // TODO: Check there is nothing pending for this client.

  delete this.channels[client];
  process.disconnection('inbound');
};

Service.prototype.send = function(channel, type, params) {
  debug('send', channel, params);
  channel.postMessage({
    id: utils.uuid(),
    type: type,
    sender: this.id,
    recipient: params.recipient,
    data: params.data
  });
};

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

var ERRORS = {
  1: 'method not defined in the contract',
  2: 'arguments.length doesn\'t match contract',
  3: 'request not authorized',
};

});})(typeof define=='function'&&define.amd?define
:(function(n,w){'use strict';return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('./lib/server',this));
