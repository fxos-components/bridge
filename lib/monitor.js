;(function(define){define(function(require,exports,module){

/**
 * Dependencies
 */

var utils = require('./utils');

var debug = 0 ? console.log.bind(console, '[monitor]') : function() {};

var ERRORS = {
  1: 'Unknown connection type'
};

function Monitor() {
  this.id = getThreadId();
  this.type = env();
  this.manager = new BroadcastChannel('threadsmanager');
  this.connections = {
    inbound: 0,
    outbound: 0
  };

  debug('initialized', this.type);
}

Monitor.prototype = {
  broadcast: function(type, data) {
    var params = {
      id: utils.uuid(),
      type: type,
      data: data
    };

    if (this.inWindow()) this.send(window.parent, 'broadcast', params);
    this.send(this.manager, 'broadcast', params);
  },

  inWindow: function() {
    return this.type === 'window';
  },

  send: function(channel, type, params) {
    channel.postMessage({
      type: type,
      id: params.id,
      pid: this.id,
      recipient: 'threadsmanager',
      data: {
        type: params.type,
        data: params.data
      }
    });
  },

  connection: function(type) {
    if (!(type in this.connections)) throw Error(ERRORS[1]);
    this.connections[type]++;
  },

  disconnection: function(type) {
    if (!(type in this.connections)) throw Error(ERRORS[1]);
    this.connections[type]--;
  },

  check: function() {
    if (this.redundant()) {
      this.broadcast('processredundant', { pid: this.id });
    }
  },

  redundant: function() {
    return this.detached();
  },

  detached: function() {
    return !this.connections.inbound;
  }
};

/**
 * Utils
 */

function getThreadId() {
  return utils.query(location.search).pid
    || (typeof window != 'undefined' && window.name)
    || 'root';
}

function env() {
  return {
    'Window': 'window',
    'SharedWorkerGlobalScope': 'sharedworker',
    'DedicatedWorkerGlobalScope': 'worker',
    'ServiceWorkerGlobalScope': 'serviceworker'
  }[this.constructor.name] || 'unknown';
}

/**
 * Exports
 */

module.exports = new Monitor();

});})(typeof define=='function'&&define.amd?define
:(function(n,w){'use strict';return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('./monitor',this));