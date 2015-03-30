
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
  this.ports = [];
  this.connections = {
    inbound: 0,
    outbound: 0
  };

  this._send = utils.message.sender(this.id, this.id, 'thread');
  debug('initialized', this.type);
}

Monitor.prototype.listen = function(type, data) {
  switch (this.type) {
    case 'sharedworker':
      addEventListener('connect', e => this.ports.push(e.ports[0]));
  }
};

Monitor.prototype.broadcast = function(type, data) {
  this.send('broadcast', { data: {
    type: type,
    data: data
  }});
};

Monitor.prototype.inWindow = function() {
  return this.type === 'window';
};

Monitor.prototype.send = function(type, options) {
  switch (this.type) {
    case 'worker':
      this._send(self, type, options); break;
    case 'sharedworker':
      this.ports.map(port => this._send(port, type, options)); break;
    case 'window':
      this._send(window.parent, type, options);
  }

  // Always this._send to manager
  this._send(this.manager, type, options);
};

Monitor.prototype.connection = function(type) {
  if (!(type in this.connections)) throw Error(ERRORS[1]);
  this.connections[type]++;
};

Monitor.prototype.disconnection = function(type) {
  if (!(type in this.connections)) throw Error(ERRORS[1]);
  this.connections[type]--;
};

Monitor.prototype.check = function() {
  if (this.redundant()) {
    this.broadcast('processredundant', { pid: this.id });
  }
};

Monitor.prototype.redundant = function() {
  return this.detached();
};

Monitor.prototype.detached = function() {
  return !this.connections.inbound;
};

/**
 * Utils
 */

function getThreadId() {
  return utils.query(location.search).pid
    || (typeof window != 'undefined' && window.name)
    || 'root';
}

function env(scope) {
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
