
/**
 * Dependencies
 */

var emitter = require('./emitter');
var utils = require('./utils');

/**
 * Locals
 */

var debug = 1 ? console.log.bind(console, '[ThreadGlobal]') : function() {};

const ERRORS = {
  1: 'Unknown connection type'
};

/**
 * Extend `Emitter`
 */

ThreadGlobal.prototype = Object.create(emitter.prototype);

function ThreadGlobal() {
  this.id = getThreadId();
  this.type = utils.env();
  this.manager = new BroadcastChannel('threadsmanager');
  this.ports = [];
  this.connections = {
    inbound: 0,
    outbound: 0
  };

  this.Message = utils.message.factory(this.id, this.id);
  this.onmessage = this.onmessage.bind(this);
  this.listen();
  debug('initialized', this.type);
}

ThreadGlobal.prototype.listen = function() {
  debug('listen');
  switch (this.type) {
    case 'sharedworker':
      addEventListener('connect', e => {
        var port = e.ports[0];
        this.ports.push(port);
        port.onmessage = this.onmessage;
        port.start();
      });
    break;
    case 'worker':
    case 'window':
      addEventListener('message', this.onmessage);
  }
};

ThreadGlobal.prototype.onmessage = function(e) {
  debug('on message', e);
  this.emit('message', e);
};

ThreadGlobal.prototype.broadcast = function(type, data) {
  this.postMessage(new this.Message('broadcast', {
    recipient: this.id,
    data: {
      type: type,
      data: data
    }
  }));
};

/**
 * Message the thread parent
 * (instanceof ChildThread) to
 * inform them of something that
 * has happened inside the thread.
 *
 * The Manager could have created
 * the `ChildThread` or it could
 * have been created manually by
 * the user.
 *
 * @param  {Message} message
 * @public
 */
ThreadGlobal.prototype.postMessage = function(message) {
  switch (this.type) {
    case 'worker':
      postMessage(message); break;
    case 'sharedworker':
      this.ports.map(port => port.postMessage(message)); break;
    case 'window':
      window.parent.postMessage(message, '*'); break;
  }
};

ThreadGlobal.prototype.connection = function(type) {
  if (!(type in this.connections)) throw Error(ERRORS[1]);
  this.connections[type]++;
};

ThreadGlobal.prototype.disconnection = function(type) {
  if (!(type in this.connections)) throw Error(ERRORS[1]);
  this.connections[type]--;
};

ThreadGlobal.prototype.check = function() {
  if (this.redundant()) {
    this.broadcast('processredundant', { pid: this.id });
  }
};

ThreadGlobal.prototype.redundant = function() {
  return this.detached();
};

ThreadGlobal.prototype.detached = function() {
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

/**
 * Exports
 */

module.exports = new ThreadGlobal();
