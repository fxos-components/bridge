(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.threads = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

module.exports = {
  create: require('./lib/child-thread'),
  manager: require('./lib/manager'),
  service: require('./lib/service'),
  client: require('./lib/client')
};

},{"./lib/child-thread":2,"./lib/client":3,"./lib/manager":5,"./lib/service":6}],2:[function(require,module,exports){

'use strict';

/**
 * Dependencies
 */

var emitter = require('./emitter');
var utils = require('./utils');

/**
 * Exports
 */

module.exports = ChildThread;

/**
 * Mini debugger
 * @type {Function}
 */

var debug = 1 ? console.log.bind(console, '[ChildThread]') : function() {};

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

ChildThread.prototype = Object.create(emitter.prototype);

function ChildThread(params) {
  if (!(this instanceof ChildThread)) return new ChildThread(params);
  this.id = utils.uuid();
  this.src = params.src;
  this.type = params.type;
  this.parentNode = params.parentNode;
  this.servicesReady = {};
  this.onmessage = utils.message.handler(this.id, KNOWN_MESSAGES).bind(this);
  this.on('serviceready', this.onserviceready.bind(this));
  this.process = this.createProcess();
  this.listen();
  debug('initialized');
}

ChildThread.prototype.createProcess = function() {
  switch(this.type) {
    case 'worker':
      return new Worker(this.src + '?pid=' + this.id);
    case 'sharedworker':
      return new SharedWorker(this.src + '?pid=' + this.id);
    case 'window':
      if (utils.env() !== 'window') throw new Error(ERRORS[1]);
      var iframe = document.createElement('iframe');
      (this.parentNode || document.body).appendChild(iframe);
      iframe.name = this.id;
      iframe.src = this.src;
      return iframe;
  }
};

ChildThread.prototype.isReady = function(service) {
  return !!this.servicesReady[service];
};

ChildThread.prototype.postMessage = function(message) {
  switch(this.type) {
    case 'worker': this.process.postMessage(message); break;
    case 'sharedworker': this.process.port.postMessage(message); break;
    case 'window': this.process.contentWindow.postMessage(message, '*'); break;
  }
};

ChildThread.prototype.listen = function() {
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

ChildThread.prototype.unlisten = function() {
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

ChildThread.prototype.onbroadcast = function(broadcast) {
  debug('on broadcast', broadcast);
  this.emit(broadcast.type, broadcast.data);
};

ChildThread.prototype.onserviceready = function(service) {
  debug('on service ready', service);
  this.servicesReady[service.name] = service;
};

ChildThread.prototype.destroy = function() {
  this.unlisten();
  this.destroyProcess();
};

ChildThread.prototype.destroyProcess = function() {
  switch(this.type) {
    case 'worker': this.process.terminate(); break;
    case 'sharedworker': this.process.port.close(); break;
    case 'window': this.process.remove(); break;
  }
};

},{"./emitter":4,"./utils":8}],3:[function(require,module,exports){

'use strict';

/**
 * Dependencies
 */

var thread = require('./thread-global');
var Emitter = require('./emitter');
var utils = require('./utils');

/**
 * Exports
 */

module.exports = Client;

/**
 * Global 'manager' channel
 * @type {BroadcastChannel}
 */
var manager = new BroadcastChannel('threadsmanager');

/**
 * Simple logger
 * @type {Function}
 */
var debug = 1 ? console.log.bind(console, '[client]') : function() {};

/**
 * Allowed message types
 * @type {Array}
 */
const KNOWN_MESSAGES = [
  'response',
  'broadcast',
  'connected'
];

/**
 * Extend `Emitter`
 */

Client.prototype = Object.create(Emitter.prototype);

function Client(service, options) {
  if (!(this instanceof Client)) return new Client(service, options);
  this.contract = options && options.contract;
  this.thread = options && options.thread;
  this.id = utils.uuid();
  this.connected = false;
  this.requests = {};
  this.requestQueue = [];

  this.service = {
    channel: undefined,
    name: service,
    id: undefined
  };

  this.Message = utils.message.factory(this.id);
  this.onmessage = utils.message.handler(this.id, KNOWN_MESSAGES).bind(this);
  manager.addEventListener('message', this.onmessage);

  // If this client is directly linked to the thread
  // then listen for messages directly from that thread
  if (this.thread) this.thread.on('message', this.onmessage);

  this.connect();
  debug('initialize', service);
}

Client.prototype.connect = function() {
  debug('connect');
  if (this.connected) return;

  // Create a pipe ready for the
  // service to send messages down
  this.service.channel = new BroadcastChannel(this.id);
  this.service.channel.onmessage = this.onmessage;

  if (this.thread) this.connectViaThread();
  else this.connectViaManager();
};

Client.prototype.connectViaThread = function() {
  debug('connect via thread');
  var self = this;

  // Check that the service we're looking
  // for is ready on the target thread.
  if (!this.thread.isReady(this.service.name)) {
    this.thread.on('serviceready', function fn(service) {
      debug('service ready', service);
      if (service.name !== self.service.name) return;
      self.thread.off('serviceready', fn);
      self.service.id = service.id;
      self.connectViaThread();
    });
  }

  this.thread.postMessage(new this.Message('connect', {
    recipient: this.service.id,
    data: {
      client: this.id,
      contract: this.contract
    }
  }));
};

Client.prototype.connectViaManager = function() {
  debug('connect via manager');

  // Send a message to the threads
  // manager to indicate that this
  // process wants to connect with
  // a particular service.
  manager.postMessage(new this.Message('connect', {
    recipient: 'threadsmanager',
    data: {
      service: this.service.name,
      client: this.id
    },
  }));
};

Client.prototype.disconnect = function() {
  // if (!this.connected) deferred.reject('not connected');
  debug('disconnect');
  return this.request('disconnect', this.id)
    .then(r => this.ondisconnected(r));
};

Client.prototype.request = function(type, data) {
  debug('request', type, data);
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
  var message = new this.Message('request', {
    recipient: this.service.id,
    data: {
      type: type,
      id: requestId,
      client: this.id,
      data: data
    }
  });

  this.requests[requestId] = deferred;
  this.service.channel.postMessage(message);
  return deferred.promise;
};

Client.prototype.onconnected = function(service) {
  debug('connected', service);
  this.service.id = service.id;
  this.connected = true;
  this.flushRequestQueue();
  thread.connection('outbound');
};

Client.prototype.onresponse = function(response) {
  debug('on response', response);
  var request = response.request;
  var promise = this.requests[request.id];
  if (!promise) return;

  var result = response.result;
  var method = {
    'fulfilled': 'resolve',
    'rejected': 'reject'
  }[result.state];

  // The value resided under a different
  // key depending on whether the promise
  // was 'rejected' or 'resolved'
  var value = result.value || result.reason;
  promise[method](value);

  // Clean up
  delete this.requests[request.id];
};

Client.prototype.onbroadcast = function(broadcast) {
  debug('on broadcast', broadcast);
  this.emit(broadcast.type, broadcast.data);
};

Client.prototype.ondisconnected = function() {
  debug('disconnected');

  // Ping the service one last time to let it
  // know that we've disconnected client-side
  this.service.channel.postMessage(new this.Message('disconnected', {
    recipient: this.service.id,
    data: this.id
  }));

  this.service.channel.close();
  delete this.service.channel;
  delete this.service.id;
  this.connected = false;
  thread.disconnection('outbound');
};

Client.prototype.call = function(method) {
  var args = [].slice.call(arguments, 1);
  debug('call', method, args);
  return this.request('method', {
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

},{"./emitter":4,"./thread-global":7,"./utils":8}],4:[function(require,module,exports){

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

var ChildThread = require('./child-thread');
var emitter = require('./emitter').prototype;
var utils = require('./utils');

/**
 * Exports
 */

module.exports = Manager;

/**
 * Locals
 */

var debug = 1 ? console.log.bind(console, '[Manager]') : function() {};
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

  this.Message = utils.message.factory(this.id);

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

/**
 * Run when a client attempts to connect.
 *
 * If a contract is found in the service
 * descriptor we pass it to the service
 * along with the connect request.
 *
 * @param  {Object} data {service,client,contract}
 * @private
 */
Manager.prototype.onconnect = function(data) {
  debug('on connect', data);
  var descriptor = this.registry[data.service];
  if (!descriptor) return debug('"%s" not managed here', data.service);
  this.getProcess(descriptor).then(service => {
    this.connect(service.id, data.client, descriptor.contract);
  });
};

Manager.prototype.connect = function(service, client, contract) {
  debug('connect', service, client, contract);
  channel.postMessage(new this.Message('connect', {
    recipient: service,
    data: {
      client: client,
      contract: contract
    }
  }));
};

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
  var process = new ChildThread(descriptor);

  this.processes.src[process.src] = process;
  this.processes.id[process.id] = process;

  // Wait for a new service to declare itself
  // 'ready' that matches the pid and service
  // name of the child-process we just created.
  process.on('serviceready', function fn(service) {
    if (service.name !== descriptor.name) return;
    debug('serviceready', service);
    process.off('serviceready', fn);
    deferred.resolve(service);
  });

  return deferred.promise;
};

},{"./child-thread":2,"./emitter":4,"./utils":8}],6:[function(require,module,exports){

'use strict';

/**
 * Dependencies
 */

var thread = require('./thread-global');
var Emitter = require('./emitter');
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
  4: 'method doesn\'t exist',
  5: 'arguments types don\'t match contract'
};

/**
 * Extend `Emitter`
 */

Service.prototype = Object.create(Emitter.prototype);

function Service(name, methods, contract) {
  if (!(this instanceof Service)) return new Service(name, methods);

  // Accept single object argument
  if (typeof name === 'object') {
    name = name.name;
    methods = name.methods;
    contract = name.contract;
  }

  debug('initialize', name, methods, contract);

  this.name = name;
  this.methods = methods;
  this.contract = contract;
  this.id = utils.uuid();
  this.channels = {};

  // Create a message factory that outputs
  // messages in a standardized format.
  this.Message = utils.message.factory(this.id);

  // Create a message handler that only listens
  // to meesages intended for this recipient
  this.onmessage = utils.message.handler(this.id, MESSAGE_TYPES).bind(this);

  this.listen();
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
  var type = request.type;
  var data = request.data;
  var self = this;

  // Check to insure this is a known request type
  if (!~REQUEST_TYPES.indexOf(type)) return reject(ERRORS[3]);

  // Call the handler and make
  // sure return value is a promise
  Promise.resolve()
    .then(() => this['on' + type](data))
    .then(resolve, reject);

  function resolve(value) {
    self.respond(request, {
      state: 'fulfilled',
      value: value
    });
  }

  function reject(err) {
    debug('reject', err);
    self.respond(request, {
      state: 'rejected',
      reason: err.message || err
    });
  }
};

Service.prototype.onmethod = function(method) {
  debug('method', method);
  var fn = this.methods[method.name];
  if (!fn) throw new Error(ERRORS[4]);
  this.checkMethodCall(method);
  return fn.apply(this, method.args);
};

Service.prototype.respond = function(request, result) {
  debug('respond', request.client, result);
  var channel = this.channels[request.client];
  channel.postMessage(new this.Message('response', {
    recipient: request.client,
    data: {
      request: request,
      result: result
    }
  }));
};

/**
 * Once the service is 'ready', we
 * postMessage out of the global
 * thread scope so that the parent
 * of the thread ('manager' or manual)
 * knows that they can proceed with
 * the connection request.
 *
 * @private
 */
Service.prototype.ready = function() {
  debug('ready');
  thread.broadcast('serviceready', {
    id: this.id,
    name: this.name
  });
};

Service.prototype.onconnect = function(data) {
  debug('on connect', data);
  var client = data.client;
  var contract = data.contract;

  if (!client) return;
  if (this.channels[client]) return;

  var channel = new BroadcastChannel(client);
  channel.onmessage = this.onmessage;
  this.channels[client] = channel;

  this.setContract(contract);

  channel.postMessage(new this.Message('connected', {
    recipient: client,
    data: {
      id: this.id,
      name: this.name
    }
  }));

  thread.connection('inbound');
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

Service.prototype.setContract = function(contract) {
  debug('set contract', contract);
  this.contract = contract;
};

Service.prototype.checkMethodCall = function(method) {
  debug('check method call', method);

  var name = method.name;
  var args = method.args;

  if (!this.contract) return;

  var signature = this.contract.methods[name];
  var e;

  if (!signature) e = ERRORS[1];
  else if (args.length !== signature.length) e = ERRORS[2];
  else if (!utils.typesMatch(args, signature)) e = ERRORS[5];

  if (e) throw new Error(e);
};

/**
 * Listens for incoming messsages from
 * the `thread` global and `manager` channel.
 *
 * `this.onmessage` filters out messages
 * that aren't intended for this instance.
 *
 * @private
 */
Service.prototype.listen = function() {
  manager.addEventListener('message', this.onmessage);
  thread.on('message', this.onmessage);
};

Service.prototype.broadcast = function(type, data) {
  debug('broadcast', type, data);
  for (var client in this.channels) {
    this.channels[client].postMessage(new this.Message('broadcast', {
      recipient: client,
      data: {
        type: type,
        data: data
      }
    }));
  }
};

},{"./emitter":4,"./thread-global":7,"./utils":8}],7:[function(require,module,exports){

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

},{"./emitter":4,"./utils":8}],8:[function(require,module,exports){
'use strict';

/**
 * Mini debugger
 * @type {Function}
 */

var debug = 0 ? console.log.bind(console, '[utils]') : function() {};

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

exports.env = function() {
  return {
    'Window': 'window',
    'SharedWorkerGlobalScope': 'sharedworker',
    'DedicatedWorkerGlobalScope': 'worker',
    'ServiceWorkerGlobalScope': 'serviceworker'
  }[self.constructor.name] || 'unknown';
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

  factory: function(sender) {
    return function Message(type, options) {
      options = options || {};
      return {
        type: type,
        id: exports.uuid(),
        sender: sender,
        recipient: options.recipient || '*',
        data: options.data
      };
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