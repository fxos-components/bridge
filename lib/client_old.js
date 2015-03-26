;(function(define){define(function(require,exports,module){
'use strict';

/**
 * Dependencies
 */

var Emitter = require('./lib/emitter');

/**
 * Simple logger
 *
 * @type {Function}
 */
var debug = 0 ? console.log.bind(console, '[client]') : function() {};

const MESSAGE_TYPES = [
  'connected',
  'response',
  'broadcast',
  'die'
];

const ERRORS = {
  1: 'Event not defined in the contract'
};

/**
 * Exports
 */

module.exports = Client;

/**
 * Extend `Emitter`
 */

Client.prototype = Object.create(Emitter.prototype);

function Client(contract, options) {
  this.password = options.password;
  this.contract = contract;
  this.uuid = uuid();
  this.connected = false;
  this._queue = [];
  this.pending = {};
  this.createInterface();
  this.listen();
  this.connect();
  debug('initialized', this);
}

Client.prototype.request = function(method, args) {
  debug('request', method, args);
  var deferred = new Deferred();
  var messageId = uuid();
  var data = {
    contract: this.contract.name,
    password: this.password,
    type: 'request',
    client: this.uuid,
    uuid: messageId,
    method: method,
    args: args,
  };

  this.send(data);
  this.pending[messageId] = deferred;
  return deferred.promise;
};

Client.prototype.on = function(name, fn) {
  if (name != '*' && !this.contract.events[name]) throw new Error(ERRORS[1]);
  Emitter.prototype.on.call(this, name, fn);
};

Client.prototype.listen = function() {
  debug('registering smuggler');
  this.smuggler = new BroadcastChannel('smuggler');
  this.smuggler.onmessage = this.onsmugglermessage.bind(this);

  this.server = new BroadcastChannel(this.uuid);
  this.server.onmessage = this.onmessage.bind(this);
};

Client.prototype.connect = function() {
  debug('connect', this);
  if (this.connected) return;
  this.smuggler.postMessage({
    type: 'connect',
    contract: this.contract.name,
    password: this.password,
    client: this.uuid
  });
};

Client.prototype.onmessage = function(e) {
  debug('on message', e);
  if (!~MESSAGE_TYPES.indexOf(e.data.type)) return;
  this['on' + e.data.type](e.data);
};

Client.prototype.onsmugglermessage = function(e) {
  if (e.data.type !== 'advertise') return;
  if (e.data.contract === this.contract.name) this.connect();
};

Client.prototype.ondie = function(data) {
  debug('on die', this.contract.name);
  this.connected = false;
  this.server.close();
};

Client.prototype.onresponse = function(data) {
  debug('on response', data);
  var uuid = data.uuid;
  var promise = this.pending[uuid];
  if (!promise) return console.error('no promise found', data);
  delete this.pending[uuid];
  promise.resolve(data.result);
};

Client.prototype.onbroadcast = function(data) {
  debug('on broadcast', data);
  this.emit(data.name, data.data);
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
      var invalidType = !typesMatch(args, definition.args);
      if (invalidLength || invalidType) {
        throw new Error(name + '() called with invalid argument');
      }

      return self.request(name, args);
    };
  }
};

Client.prototype.onconnected = function() {
  debug('connected');
  this.connected = true;

  // Empty message buffer
  while (this._queue.length) {
    this.send(this._queue.shift());
  }

  this.smuggler.close();
  // this.emit('connected');
};

Client.prototype.send = function(data) {

  // If the client is trying to send messages
  // before the connection is made, then let's
  // push the messages in a queue.
  if (!this.connected) {
    this._queue.push(data);
    return;
  }

  this.server.postMessage(data);
};

/**
 * Utils
 */

function uuid(){
  var timestamp = Date.now();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
    /[xy]/g,
    function onEachCharacter(c) {
      var r = (timestamp + Math.random() * 16) % 16 | 0;
      timestamp = Math.floor(timestamp / 16);
      return (c == 'x' ? r : (r&0x7|0x8)).toString(16);
    }
  );
}

function typesMatch(args, types) {
  for (var i = 0, l = args.length; i < l; i++) {
    if (typeof args[i] !== types[i]) return false;
  }

  return true;
}

function Deferred() {
  var deferred = {};
  deferred.promise = new Promise(function(resolve, reject) {
    deferred.resolve = resolve;
    deferred.reject = reject;
  });
  return deferred;
}

});})(typeof define=='function'&&define.amd?define
:(function(n,w){return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('runtime-bridge-client',this));
