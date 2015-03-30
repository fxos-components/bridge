(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.threads = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

module.exports = {
  client: require('./lib/client'),
  manager: require('./lib/manager'),
  service: require('./lib/service')
};

},{"./lib/client":3,"./lib/manager":5,"./lib/service":7}],2:[function(require,module,exports){

'use strict';

/**
 * Dependencies
 */

var emitter = require('./emitter');
var utils = require('./utils');

/**
 * Exports
 */

module.exports = ChildProcess;

/**
 * Mini debugger
 * @type {Function}
 */

var debug = 1 ? console.log.bind(console, '[child-process]') : function() {};

/**
 * Error messages
 * @type {Object}
 */

const ERRORS = {
  1: 'iframes can\'t be spawned from workers'
};

const KNOWN_MESSAGES = [
  'broadcast',
];

/**
 * Extends `Emitter`
 */

ChildProcess.prototype = Object.create(emitter.prototype);

function ChildProcess(params) {
  this.id = utils.uuid();
  this.src = params.src;
  this.type = params.type;
  this.parentNode = params.parentNode;
  this.onmessage = utils.message.handler(this.id, KNOWN_MESSAGES).bind(this);
  this.process = this.createProcess();
  this.listen();
  debug('initialized', this);
}

ChildProcess.prototype.createProcess = function() {
  switch(this.type) {
    case 'worker':
      return new Worker(this.src + '?pid=' + this.id);
    case 'sharedworker':
      return new SharedWorker(this.src + '?pid=' + this.id);
    case 'window':
      if (utils.env() != 'window') throw new Error(ERRORS[1]);
      var iframe = document.createElement('iframe');
      (this.parentNode || document.body).appendChild(iframe);
      iframe.name = this.id;
      iframe.src = this.src;
      return iframe;
  }
};

ChildProcess.prototype.listen = function() {
  switch(this.type) {
    case 'worker':
      this.process.addEventListener('message', this.onmessage);
      break;
    case 'sharedworker':
      this.process.port.start();
      this.process.port.addEventListener('message', this.onmessage);
      break;
    case 'window':
      addEventListener('message', this.onmessage);
  }
};

ChildProcess.prototype.unlisten = function() {
  switch(this.type) {
    case 'worker':
      this.process.removeEventListener('message', this.onmessage);
      break;
    case 'sharedworker':
      this.process.port.close();
      this.process.port.removeEventListener('message', this.onmessage);
      break;
    case 'window':
      removeEventListener('message', this.onmessage);
  }
};

ChildProcess.prototype.onbroadcast = function(broadcast) {
  debug('on broadcast', broadcast);
  this.emit(broadcast.type, broadcast.data);
};

ChildProcess.prototype.destroy = function() {
  this.unlisten();
  this.destroyProcess();
};

ChildProcess.prototype.destroyProcess = function() {
  switch(this.type) {
    case 'worker':
    case 'sharedworker':
      this.process.terminate(); break;
    case 'window':
      this.process.remove(); break;
  }
};

},{"./emitter":4,"./utils":8}],3:[function(require,module,exports){

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
var debug = 1 ? console.log.bind(console, '[client]') : function() {};

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
  this.requestQueue = [];
  this.service = {
    channel: undefined,
    name: service,
    id: undefined
  };

  this.send = utils.message.sender(thread.id, this.id, 'client');
  this.onmessage = utils.message.handler(this.id, KNOWN_MESSAGES).bind(this);
  manager.addEventListener('message', this.onmessage);
  this.connect();

  debug('initialize', service);
}

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
  this.send(manager, 'connect', {
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
  this.flushRequestQueue();
  thread.connection('outbound');
};

Client.prototype.disconnect = function() {
  // if (!this.connected) deferred.reject('not connected');
  debug('disconnect');
  return this.request(this.service.channel, 'disconnect', this.id)
    .then(r => this.ondisconnected(r));
};

Client.prototype.ondisconnected = function() {
  debug('disconnected');

  // Ping the service one last time to let it
  // know that we've disconnected client-side
  this.send(this.service.channel, 'disconnected', {
    recipient: this.service.id,
    data: this.id
  });

  this.service.channel.close();
  delete this.service.channel;
  delete this.service.id;
  this.connected = false;
  thread.disconnection('outbound');
};

Client.prototype.request = function(channel, type, data) {
  debug('request', channel, type, data);
  var deferred = utils.deferred();

  // If the client isn't yet connected,
  // add the request to a queue to be
  // flushed once a connection is made.
  if (!this.connected) {
    this.requestQueue.push({
      deferred: deferred,
      arguments: arguments
    });

    debug('request queued until connected');
    return deferred.promise;
  }

  var requestId = utils.uuid();
  this.requests[requestId] = deferred;

  this.send(channel, 'request', {
    recipient: this.service.id,
    data: {
      type: type,
      id: requestId,
      client: this.id,
      data: data
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
  return this.request(this.service.channel, 'method', {
    name: method,
    args: args
  });
};

Client.prototype.flushRequestQueue = function() {
  debug('flush waiting calls');
  var request;
  while ((request = this.requestQueue.shift())) {
    var resolve = request.deferred.resolve;
    resolve(this.request.apply(this, request.arguments));
  }
};

},{"./emitter":4,"./monitor":6,"./utils":8}],4:[function(require,module,exports){

/**
 * Exports
 */

module.exports = Emitter;

var debug = 0 ? console.log.bind(console, '[emitter]') : function(){};

function Emitter() {}

Emitter.prototype = {
  emit: function(type, data) {
    debug('emit', type, data);
    if (!this._callbacks) return;
    var fns = this._callbacks[type] || [];
    fns = fns.concat(this._callbacks['*'] || []);
    for (var i = 0; i < fns.length; i++) {
      fns[i].call(this, data, type);
    }
  },

  on: function(type, callback) {
    debug('on', type, callback);
    if (!this._callbacks) this._callbacks = {};
    if (!this._callbacks[type]) this._callbacks[type] = [];
    this._callbacks[type].push(callback);
  },

  off: function(type, callback) {
    if (!this._callbacks) return;
    var typeListeners = this._callbacks[type];
    var i = typeListeners.indexOf(callback);
    if (~i) typeListeners.splice(i, 1);
  }
};

},{}],5:[function(require,module,exports){

'use strict';

/**
 * Dependencies
 */

var ChildProcess = require('./child-process');
var emitter = require('./emitter').prototype;
var thread = require('./monitor');
var utils = require('./utils');

/**
 * Exports
 */

module.exports = Manager;

/**
 * Locals
 */

var debug = 0 ? console.log.bind(console, '[manager]') : function() {};
var channel = new BroadcastChannel('threadsmanager');

const KNOWN_MESSAGES = [
  'broadcast',
  'request',
  'connect'
];

/**
 * Extend `Emitter`
 */

Manager.prototype = Object.create(emitter);

function Manager(definitions) {
  if (!(this instanceof Manager)) return new Manager(definitions);
  this.readMessages = new Array(10);
  this.processes = { id: {}, src: {} };
  this.pending = { connects: {} };
  this.activeServices = {};
  this.registry = {};

  this.send = utils.message.sender(thread.id, this.id, 'manager');

  // Listen on window and broadcast-channel so
  // that manager can run in same thread as Client.
  this.onmessage = this.onmessage.bind(this);
  channel.addEventListener('message', this.onmessage);
  addEventListener('message', this.onmessage);

  this.register(definitions);
  debug('intialized');
}

Manager.prototype.register = function(definitions) {
  debug('register', definitions);
  for (var name in definitions) {
    definitions[name].name = name;
    this.registry[name] = definitions[name];
  }
};

Manager.prototype.onmessage = function(e) {
  var message = e.data;
  debug('on message', message);
  if (message.recipient != 'threadsmanager') return;
  if (!~KNOWN_MESSAGES.indexOf(message.type)) return;
  if (~this.readMessages.indexOf(message.id)) return;
  this['on' + message.type](message.data);
  this.messageRead(message.id);
};

Manager.prototype.onbroadcast = function(broadcast) {
  debug('on broadcast', broadcast);
  this.emit(broadcast.type, broadcast.data);
};

Manager.prototype.messageRead = function(id) {
  this.readMessages.push(id);
  this.readMessages.shift();
};

Manager.prototype.onconnect = function(data) {
  debug('on connect', data);
  var descriptor = this.registry[data.service];
  if (!descriptor) return debug('"%s" not managed here', data.service);
  this.getProcess(descriptor).then(service => {
    this.connect(service.id, data.client);
  });
};

Manager.prototype.connect = function(serviceId, clientId) {
  this.send(channel, 'connect', {
    recipient: serviceId,
    data: clientId
  });
};

// Manager.prototype.send = function(type, params) {
//   debug('send', type, params);
//   channel.postMessage({
//     id: utils.uuid(),
//     type: type,
//     sender: this.id,
//     recipient: params.recipient,
//     data: params.data
//   });
// };

Manager.prototype.onclientdisconnected = function(msg) {
  debug('on client disconnected', msg);
};

Manager.prototype.onclientconnected = function(msg) {
  debug('on client connected', msg);
};

Manager.prototype.getProcess = function(descriptor) {
  debug('get process', descriptor);
  var process = this.processes[descriptor.src];
  return process
    ? Promise.resolve(process)
    : this.createProcess(descriptor);
};

Manager.prototype.createProcess = function(descriptor) {
  debug('create process', descriptor);
  var deferred = utils.deferred();
  var process = new ChildProcess(descriptor);

  this.processes.src[process.src] = process;
  this.processes.id[process.id] = process;

  // Wait for a new service to declare itself
  // 'ready' that matches the pid and service
  // name of the child-process we just created.
  process.on('serviceready', function fn(service) {
    if (service.name !== descriptor.name) return;
    debug('serviceready', service);
    this.off('serviceready', fn);
    deferred.resolve(service);
  });

  return deferred.promise;
};

},{"./child-process":2,"./emitter":4,"./monitor":6,"./utils":8}],6:[function(require,module,exports){

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

},{"./utils":8}],7:[function(require,module,exports){

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

},{"./emitter":4,"./monitor":6,"./utils":8}],8:[function(require,module,exports){

'use strict';

/**
 * Mini debugger
 * @type {Function}
 */

var debug = 1 ? console.log.bind(console, '[utils]') : function() {};

exports.uuid = function (){
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

exports.typesMatch = function (args, types) {
  for (var i = 0, l = args.length; i < l; i++) {
    if (typeof args[i] !== types[i]) return false;
  }

  return true;
};

exports.deferred = function () {
  var deferred = {};
  deferred.promise = new Promise(function(resolve, reject) {
    deferred.resolve = resolve;
    deferred.reject = reject;
  });
  return deferred;
};

exports.query = function(string) {
  var result = {};

  string
    .replace('?', '')
    .split('&')
    .forEach(param => {
      var parts = param.split('=');
      result[parts[0]] = parts[1];
    });

  return result;
};

exports.message = {
  sender: function(pid, sender, name) {
    return function(channel, type, options) {
      debug('send', name, type, options);
      options = options || {};
      channel.postMessage({
        type: type,
        id: exports.uuid(),
        sender: sender,
        pid: pid,
        recipient: options.recipient || '*',
        data: options.data
      });
    };
  },

  handler: function(uuid, types) {
    return function(e) {
      var message = e.data;
      var recipient = message.recipient;
      var type = message.type;
      var authorized = recipient === uuid || recipient === '*';
      if (!authorized) return;
      if (!~types.indexOf(type)) return;
      debug('onmessage', message);
      if (this['on' + type]) this['on' + type](message.data, e);
    };
  }
};

},{}]},{},[1])(1)
});