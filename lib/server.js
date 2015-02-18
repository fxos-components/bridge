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
