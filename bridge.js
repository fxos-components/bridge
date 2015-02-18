!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.bridge=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
exports.client = require('./lib/client');
exports.server = require('./lib/server');

},{"./lib/client":2,"./lib/server":3}],2:[function(require,module,exports){

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

},{"./utils":4}],3:[function(require,module,exports){
/*global clients*/

'use strict';

/**
 * Dependencies
 */

var utils = require('./utils');

/**
 * exports
 */

module.exports = Server;

/**
 * Simple logger
 *
 * @return {Function} [description]
 */
var debug = 0 ? console.log.bind(console, '[server]') : function() {};

/**
 * Error messages
 *
 * @type {Object}
 */
const ERRORS = {
  1: 'Method not defined in the contract'
};

function Server(contract, methods) {
  if (!(this instanceof Server)) return new Server(contract, methods);
  this.contract = contract;
  this.methods = methods;
  this.env = utils.getEnv();
  this._broadcast = broadcast[this.env];
  this.onmessage = this.onmessage.bind(this);
  this.listen = listen[this.env] || listen.default;
  this.send = send[this.env] || send.default;
  this.ports = [];
  this.listen();
  debug('initialized');
}

Server.prototype.broadcast = function(name, data) {
  debug('broadcast', name, data);
  this._broadcast({
    contract: this.contract.name,
    type: 'broadcast',
    name: name,
    data: data
  });
};

Server.prototype.respond = function(request, result) {
  debug('respond', request, result);
  var response = request;
  response.result = result;
  response.type = 'response';
  this.send(response);
};

Server.prototype.onmessage = function(data) {
  debug('on message', data);
  if (data.contract !== this.contract.name) return;
  if (data.type !== 'request') return;
  this.onrequest(data);
};

Server.prototype.onrequest = function(request) {
  debug('on request', request);
  var fn = this.methods[request.method];
  var args = request.args || [];
  if (!fn) throw new Error(ERRORS[1]);
  Promise.resolve(fn.apply(null, args)).then((result) => {
    this.respond(request, result);
  });
};

var listen = {
  sharedworker: function() {
    debug('listen (sharedworker)');
    addEventListener('connect', (eConnect) => {
      var port = eConnect.ports[0];
      debug('connect', port);
      this.ports.push(port);
      port.start();
      port.addEventListener('message', e => {
        var data = e.data || {};
        data.port = port;
        this.onmessage(data);
      });
    });
  },

  default: function() {
    debug('listen (default)');
    addEventListener('message', e => this.onmessage(e.data));
  }
};

var send = {
  sharedworker: function(data) {
    debug('send (sharedworker)', data);
    var port = data.port;
    delete data.port;
    port.postMessage(data);
  },

  // TODO: Find a way to target one client
  serviceworker: function(data) {
    debug('send (serviceworker)', data);
    clients.getAll().then(function(windows) {
      windows.forEach(function(win) {
        win.postMessage(data);
      });
    });
  },

  window: function(data) {
    debug('send (window)', data);
    window.parent.postMessage(data, '*');
  },

  default: function(data) {
    debug('send (default)', data);
    postMessage(data);
  }
};

var broadcast = {
  worker: function(data) {
    debug('broadcast (worker)', data);
    postMessage(data);
  },

  sharedworker: function(data) {
    debug('broadcast (sharedworker)', data);
    this.ports.forEach(port => port.postMessage(data));
  },

  serviceworker: function(data) {
    debug('broadcast (serviceworker)', data);
    clients.getAll().then(function(windows) {
      windows.forEach(function(win) {
        win.postMessage(data);
      });
    });
  },

  window: function(data) {
    debug('broadcast (window)', data);
    this.send(data);
  }
};

},{"./utils":4}],4:[function(require,module,exports){

'use strict';

exports.getEnv = function() {
  var s = typeof self != 'undefined' ? self : window;
  return {
    'Window': 'window',
    'SharedWorkerGlobalScope': 'sharedworker',
    'DedicatedWorkerGlobalScope': 'worker',
    'ServiceWorkerGlobalScope': 'serviceworker'
  }[s.constructor.name] || 'unknown';
};

exports.getType = function(thing) {
  return (thing.tagName || thing.constructor.name).toLowerCase();
};

exports.uuid = function(){
  var timestamp = Date.now();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
    /[xy]/g,
    function onEachCharacter(c) {
      var r = (timestamp + Math.random() * 16) % 16 | 0;
      timestamp = Math.floor(timestamp / 16);
      return (c == 'x' ? r : (r&0x7|0x8)).toString(16);
    }
  );
};

exports.typesMatch = function(args, types) {
  for (var i = 0, l = args.length; i < l; i++) {
    if (typeof args[i] !== types[i]) return false;
  }

  return true;
};

exports.deferred = function() {
  var deferred = {};
  deferred.promise = new Promise(function(resolve, reject) {
    deferred.resolve = resolve;
    deferred.reject = reject;
  });
  return deferred;
};

},{}]},{},[1])(1)
});