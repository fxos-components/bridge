
'use strict';

/**
 * Dependencies
 */

var utils = require('./utils');

/**
 * Exports
 */

module.exports = Client;

/**
 * Locals
 */

var debug = 0 ? console.log.bind(console, '[client]') : function() {};

const MESSAGE_TYPES = [
  'response',
  'broadcast'
];

const ERRORS = {
  1: 'Event not defined in the contract'
};

function Client(contract, server) {
  if (!(this instanceof Client)) return new Client(contract, server);
  this.contract = contract;
  this.server = server;
  this.serverType = utils.getType(server);
  this.env = utils.getEnv();
  this.send = send[this.serverType] || send.default;
  this.listen = listen[this.serverType] || listen.default;
  debug('listen', this.listen);
  this.pending = {};
  this.createInterface();
  this.listen();
  debug('initialized', this);
}

Client.prototype.request = function(method, args) {
  debug('request', method, args);
  var deferred = utils.deferred();
  var id = utils.uuid();
  var data = {
    contract: this.contract.name,
    type: 'request',
    uuid: id,
    method: method,
    args: args,
  };

  this.send(data);
  this.pending[id] = deferred;
  return deferred.promise;
};

Client.prototype.addEventListener = function(name, fn) {
  if (!this.contract.events[name]) throw new Error(ERRORS[1]);
  this.server.addEventListener('broadcast:' + name, fn);
};

Client.prototype.removeEventListener = function(name, fn) {
  this.server.removeEventListener('broadcast:' + name, fn);
};

Client.prototype.dispatchEvent = function(e) {
  this.server.dispatchEvent(e);
};

Client.prototype.onmessage = function(e) {
  debug('on message', e, e.data);
  if (e.data.contract !== this.contract.name) return;
  if (!~MESSAGE_TYPES.indexOf(e.data.type)) return;
  this['on' + e.data.type](e.data);
};

Client.prototype.onresponse = function(data) {
  debug('on response', data);
  var uuid = data.uuid;
  var promise = this.pending[uuid];
  if (!promise) throw new Error('no promise found');
  delete this.pending[uuid];
  promise.resolve(data.result);
};

Client.prototype.onbroadcast = function(data) {
  debug('on broadcast', data);
  var e = new Event('broadcast:' + data.name);
  e.data = data.data;
  this.server.dispatchEvent(e);
};

Client.prototype.createInterface = function() {
  debug('setup interface');
  var methods = this.contract.methods;
  var self = this;

  for (var method in methods) {
    this[method] = createMethod(method, methods[method]);
  }

  function createMethod(name, definition) {
    debug('create method', name, definition);
    return function() {
      var args = [].slice.call(arguments);
      var invalidLength = args.length !== definition.args.length;
      var invalidType = !utils.typesMatch(args, definition.args);
      if (invalidLength || invalidType) {
        throw new Error(name + '() called with invalid argument');
      }

      return self.request(name, args);
    };
  }
};

var listen = {
  sharedworker: function() {
    debug('listening (sharedworker)');
    this.server.port.start();
    this.server.port.addEventListener('message', e => {
      this.onmessage(e);
    });
  },

  worker: function() {
    debug('listening (worker)');
    this.server.addEventListener('message', e => this.onmessage(e));
  },

  default: function() {
    debug('listening (default)');
    addEventListener('message', e => this.onmessage(e));
  }
};

var send = {
  sharedworker: function(data) {
    this.server.port.postMessage(data);
  },

  iframe: function(data) {
    this.server.contentWindow.postMessage(data, '*');
  },

  default: function(data) {
    this.server.postMessage(data);
  }
};
