(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.threads = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
var threads = global.threads || {};
threads.service = require('../lib/service');
module.exports = threads;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../lib/service":3}],2:[function(require,module,exports){
'use strict';

/**
 * Dependencies
 * @ignore
 */

var Emitter = require('./utils/emitter');
var uuid = require('./utils/uuid');

/**
 * Exports
 * @ignore
 */

exports = module.exports = type => new Message(type);
exports.receiver = (id, n) => new Receiver(id, n);
exports.Receiver = Receiver;
exports.endpoint = PortAdaptor;
exports.Message = Message;

/**
 * Mini Logger
 *
 * @type {Function}
 * @private
 */
var debug = 0 ? function(arg1, ...args) {
  var type = `[${self.constructor.name}][${location.pathname}]`;
  console.log(`[Message]${type} - "${arg1}"`, ...args);
} : () => {};

/**
 * Initialize a new `Message`
 *
 * @class Message
 * @borrows Emitter#on as #on
 * @borrows Emitter#off as #off
 * @borrows Emitter#emit as #emit
 * @param {String} type Message type
 */
function Message(type) {
  this.cancelled = false;
  this._timeout = null;
  this.listeners = [];
  this.onMessage = this.onMessage.bind(this);
  this.onTimeout = this.onTimeout.bind(this);
  if (typeof type === 'object') this.setupInbound(type);
  else this.setupOutbound(type);
}

Message.prototype = {
  timeout: 1000,

  setupOutbound(type) {
    this.id = uuid();
    this.type = type;
    this.sent = false;
    this.recipient = '*';
  },

  setupInbound (e) {
    debug('inbound');
    this.hasResponded = false;

    // When an Endpoint is created from an event
    // target we know it's ready to recieve messages.
    this.setSource(e.source || e.target);

    // Keep a reference to the MessageEvent
    this.event = e;

    // Mixin the properties of the original message
    Object.assign(this, e.data);
  },

  setSource(port) {
    debug('set source', port.constructor.name);
    this.source = PortAdaptor.create(port, { ready: true });
    return this;
  },

  set(key, value) {
    debug('set', key, value);
    if (typeof key == 'object') Object.assign(this, key);
    else this[key] = value;
    return this;
  },

  serialize() {
    return {
      id: this.id,
      type: this.type,
      data: this.data,
      recipient: this.recipient,
      noRespond: this.noRespond
    };
  },

  preventDefault() {
    debug('prevent default');
    this.defaultPrevented = true;
  },

  send(endpoint) {
    debug('send', this.type);
    if (this.sent) throw error(1);
    var serialized = this.serialize();
    var expectsResponse = !this.noRespond;

    this._responded = deferred();
    this.responded = this._responded.promise;

    // Endpoint can be set on the message before sending
    this.endpoint = PortAdaptor.create(endpoint || this.endpoint);

    if (expectsResponse) {
      this.listen(this.endpoint);
      this._timeout = setTimeout(this.onTimeout, this.timeout);
    } else {
      this._responded.resolve();
    }

    this.endpoint.postMessage(serialized, this.getTransfer());
    debug('sent', serialized, this.responded);
    return expectsResponse ? this.responded : Promise.resolve();
  },

  getTransfer() {
    return this.transfer || this.event && this.event.ports;
  },

  onMessage(e) {
    var valid = !!e.data.response
      && e.data.id === this.id
      && !this.cancelled;

    if (valid) this.onResponse(e);
  },

  onTimeout() {
    debug('response timeout', this.type);
    if (!this.silentTimeout) this._responded.reject('no response');
    this.teardown();
  },

  listen(port) {
    debug('add response listener', port);
    port = PortAdaptor.create(port);
    port.addListener(this.onMessage);
    this.listeners.push(port);
    return this;
  },

  unlisten() {
    debug('remove response listeners');
    this.listeners.forEach(port => port.removeListener(this.onMessage));
    this.listeners = [];
  },

  cancel() {
    this.teardown();
    this.cancelled = true;
    this.emit('cancel');
  },

  teardown() {
    clearTimeout(this._timeout);
    this.unlisten();
  },

  /**
   * Respond to a message.
   *
   * @param  {*} [result]
   * @public
   */
  respond(result) {
    debug('respond', result);

    if (this.hasResponded) throw error(2);
    if (!this.source) return;
    if (this.noRespond) return;

    var self = this;

    // Repsond with rejection when result is an `Error`
    if (result instanceof Error) reject(result);

    // Call the handler and make
    // sure return value is a promise.
    // If the returned value is unclonable
    // then the send() method will throw,
    // the .catch() will reject in this case.
    Promise.resolve(result)
      .then(resolve, reject)
      .catch(reject);

    self.hasResponded = true;

    function resolve(value) {
      debug('resolve', value);
      respond({
        type: 'resolve',
        value: value
      });
    }

    function reject(err) {
      debug('reject', err.message);
      respond({
        type: 'reject',
        value: err.message || err
      });
    }

    function respond(response) {
      self.response = response;
      self.source.postMessage({
        id: self.id,
        response: response
      }, self.transfer);

      debug('responded with:', response);
    }
  },

  /**
   * Forward a `Message` onto another endpoint.
   *
   * The `silentTrue` option prevents the
   * message request timing out should
   * the response come back via an
   * alternative route.
   *
   * @param  {(HTMLIframeElement|MessagePort|Window)} endpoint
   * @public
   */
  forward(endpoint) {
    debug('forward');
    return this
      .set('silentTimeout', true)
      .send(endpoint)
      .then(result => this.respond(result.value));
  },

  onResponse(e) {
    debug('on response', e.data);
    var deferred = this._responded;
    this.response = e.data.response;
    this.response.event = e;

    this.teardown();

    switch (this.response.type) {
      case 'resolve': deferred.resolve(this.response); break;
      case 'reject': deferred.reject(this.response.value);
    }

    this.emit('response', this.response);
  }
};

Emitter(Message.prototype);

/**
 * Initialize a new `Reciever`.
 *
 * @class Receiver
 * @extends Emitter
 * @param {String} name - corresponds to `Message.recipient`
 */
function Receiver(name) {
  this.name = name;
  this.endpoints = new Set();
  this.onMessage = this.onMessage.bind(this);
  this.listen = this.listen.bind(this);
  this.unlisten = this.unlisten.bind(this);
  debug('receiver initialized', name);
}

Receiver.prototype = {

  /**
   * Begin listening for inbound messages.
   *
   * @example
   *
   * // When no arguments are given
   * // messages will be listened for
   * // on the default global scope
   * .listen();
   *
   * // When an endpoint is out of reach
   * // BroadcastChannel can be used.
   * .listen(new BroadcastChannel('foo'));
   *
   * @param {(HTMLIframeElement|Worker|MessagePort|
   * BroadcastChannel|Window|Object)} [endpoint]
   * @public
   */
  listen(thing) {
    debug('listen');
    var endpoint = PortAdaptor.create(thing || self);
    if (this.endpoints.has(endpoint)) return;
    endpoint.addListener(this.onMessage, this.listen);
    this.endpoints.add(endpoint);
    return this;
  },

  /**
   * Stop listening for inbound messages
   * on all endpoints listened to prior.
   *
   * @param {(HTMLIframeElement|Worker|SharedWorker|
   * BroadcastChannel|Window|Object)} [endpoint]
   * @public
   */
  unlisten() {
    debug('unlisten');
    this.endpoints.forEach(endpoint => {
      endpoint.removeListener(this.onMessage, this.unlisten);
    });
  },

  /**
   * Callback to handle inbound messages.
   * @param  {MessageEvent} e
   * @private
   */
  onMessage(e) {
    if (!e.data.id) return;
    if (!e.data.type) return;
    if (!this.isRecipient(e.data.recipient)) return;
    debug('receiver on message', e.data);
    var message = new Message(e);

    // Before hook
    this.emit('message', message);
    if (message.defaultPrevented) return;

    try { this.emit(message.type, message); }
    catch (e) {
      message.respond(e);
      throw e;
    }
  },

  isRecipient(recipient) {
    return recipient == this.name
      || recipient == '*'
      || this.name == '*';
  },

  destroy() {
    this.unlisten();
    delete this.name;
    return this;
  }
};

Emitter(Receiver.prototype);

/**
 * Port Adaptors
 * @private
 */
function PortAdaptor(target) {
  debug('PortAdaptor');
  this.target = target;
}

var MSG = 'message';

PortAdaptor.prototype = {
  addListener(callback) { on(this.target, MSG, callback); },
  removeListener(callback) { off(this.target, MSG, callback); },
  postMessage(data, transfer) { this.target.postMessage(data, transfer); }
};

var adaptors = {
  HTMLIFrameElement(target) {
    debug('HTMLIFrameElement');
    var ready = windowReady(target);
    return {
      addListener(callback, listen) { on(window, MSG, callback); },
      removeListener(callback, listen) { off(window, MSG, callback); },
      postMessage(data, transfer) {
        ready.then(() => {
          target.contentWindow.postMessage(data, '*', transfer);
        });
      }
    };
  },

  BroadcastChannel(target, options) {
    debug('BroadcastChannel', target.name);
    var ready = options && options.ready;
    ready = ready ? Promise.resolve() : checkReady();

    function checkReady() {
      debug('BroadcastChannel: check Ready');
      var promise = deferred();

      // Tell the other end we're ready
      // NOTE: it may not be listening yet
      target.postMessage('ready');

      // Listen for a 'ready' message once
      on(target, MSG, function fn(e) {
        if (e.data != 'ready') return;
        off(target, MSG, fn);

        // Now tell the other end we're
        // ready again just in case it
        // wasn't listening the first time
        target.postMessage('ready');
        debug('BroadcastChannel: ready');
        promise.resolve();
      });

      return promise.promise;
    }

    return {
      target: target,
      addListener: PortAdaptor.prototype.addListener,
      removeListener: PortAdaptor.prototype.removeListener,
      postMessage(data, transfer) {
        ready.then(() => target.postMessage(data, transfer));
      }
    };
  },

  Window(target, options) {
    debug('Window');
    var ready = options && options.ready || target === self;
    ready = ready ? Promise.resolve() : windowReady(target);

    return {
      addListener(callback, listen) { on(window, MSG, callback); },
      removeListener(callback, listen) { off(window, MSG, callback); },
      postMessage(data, transfer) {
        ready.then(() => target.postMessage(data, '*', transfer));
      }
    };
  },

  SharedWorkerGlobalScope(target) {
    var ports = [];

    return {
      postMessage() {}, // noop
      addListener(callback, listen) {
        this.onconnect = e => {
          var port = e.ports[0];
          ports.push(port);
          port.start();
          listen(port);
        };

        on(self, 'connect', this.onconnect);
      },

      removeListener(callback, unlisten) {
        off(self, 'connect', this.onconnect);
        ports.forEach(port => {
          port.close();
          unlisten(port);
        });
      }
    };
  }
};

PortAdaptor.create = function(target, options) {
  if (isEndpoint(target)) return target;
  var type = target.constructor.name;
  var CustomAdaptor = adaptors[type];
  debug('creating port adaptor for', type);
  if (CustomAdaptor) return CustomAdaptor(target, options);
  return new PortAdaptor(target, options);
};

/**
 * Utils
 * @private
 */
function isEndpoint(thing) {
  return !!thing.addListener;
}

function deferred() {
  var promise = {};
  promise.promise = new Promise((resolve, reject) => {
    promise.resolve = resolve;
    promise.reject = reject;
  });
  return promise;
}

var windowReady = (function() {
  if (typeof window == 'undefined') return;
  var parent = window.opener || window.parent;
  var domReady = 'DOMContentLoaded';
  var windows = new WeakSet();

  // Side B: Dispatches 'ready' from the child window.
  if (parent != self) {
    on(window, domReady, function fn() {
      off(window, domReady, fn);
      parent.postMessage('load', '*');
    });
  }

  // Side A: Listens for 'ready' in the parent window
  on(self, 'message', e => e.data == 'load' && windows.add(e.source));

  return target => {
    var win = target.contentWindow || target;

    // Ready if the target has previously announces itself ready
    if (windows.has(win)) return Promise.resolve();

    // Ready if the target is the parent window
    if (win == window.parent) return Promise.resolve();

    var def = deferred();
    debug('waiting for Window to be ready ...');
    on(window, 'message', function fn(e) {
      if (e.data == 'load' && e.source == win) {
        debug('Window ready');
        off(window, 'message', fn);
        def.resolve();
      }
    });
    return def.promise;
  };
})();

function error(id) {
  return new Error({
    1: '.send() can only be called once',
    2: 'response already sent for this message'
  }[id]);
}

function on(target, name, fn) { target.addEventListener(name, fn); }
function off(target, name, fn) { target.removeEventListener(name, fn); }

},{"./utils/emitter":4,"./utils/uuid":5}],3:[function(require,module,exports){
'use strict';

/**
 * Dependencies
 * @ignore
 */

var uuid = require('./utils/uuid');
var message = require('./message');
var Receiver = message.Receiver;

/**
 * Exports
 * @ignore
 */

module.exports = Service;

/**
 * Mini Logger
 *
 * @type {Function}
 * @private
 */
var debug = 0 ? function(arg1, ...args) {
  var type = `[${self.constructor.name}][${location.pathname}]`;
  console.log(`[Service]${type} - "${arg1}"`, ...args);
} : () => {};

/**
 * Extends `Receiver`
 * @ignore
 */

Service.prototype = Object.create(Receiver.prototype);

/**
 * A `Service` is a collection of methods
 * exposed to a `Client`. Methods can be
 * sync or async (using Promises).
 *
 * @example
 *
 * threads.service('my-service')
 *   .method('ping', param => 'pong: ' + param)
 *   .listen();
 *
 * @class Service
 * @extends Receiver
 * @param {String} name The service name
 * @public
 */
function Service(name) {
  if (!(this instanceof Service)) return new Service(name);
  message.Receiver.call(this, name); // call super

  this.clients = {};
  this.methods = {};

  this
    .on('_disconnect', this.onDisconnect.bind(this))
    .on('_connect', this.onConnect.bind(this))
    .on('_method', this.onMethod.bind(this))
    .on('_off', this.onOff.bind(this))
    .on('_on', this.onOn.bind(this));

  this.destroy = this.destroy.bind(this);
  addEventListener('closing', this.destroy);
  debug('initialized', name, self.createEvent);
}

/**
 * Define a method to expose to Clients.
 * The return value of the result of a
 * returned Promise will be sent back
 * to the Client.
 *
 * @example
 *
 * threads.service('my-service')
 *
 *   // sync return value
 *   .method('myMethod', function(param) {
 *     return 'hello: ' + param;
 *   })
 *
 *   // or async Promise
 *   .method('myOtherMethod', function() {
 *     return new Promise(resolve => {
 *       setTimeout(() => resolve('result'), 1000);
 *     });
 *   })
 *
 *   .listen();
 *
 * @param  {String}   name
 * @param  {Function} fn
 * @return {this} for chaining
 */
Service.prototype.method = function(name, fn) {
  this.methods[name] = fn;
  return this;
};

/**
 * Broadcast's an event from a `Service`
 * to connected `Client`s.
 *
 * The third argument can be used to
 * target selected clients by their
 * `client.id`.
 *
 * @example
 *
 * service.broadcast('my-event', { some: data }); // all clients
 * service.broadcast('my-event', { some: data }, [ clientId ]); // one client
 *
 * @memberof Service
 * @param  {String} type The message type/name
 * @param  {*} [data] Data to send with the event
 * @param  {Array} [only] A select list of clients to message
 * @return {this}
 */
Service.prototype.broadcast = function(type, data, only) {
  debug('broadcast', type, data, only, self.constructor.name);
  var msgData = {
    type: type,
    data: data
  };

  this.eachClient(client => {
    if (only && !~only.indexOf(client.id)) return;
    debug('broadcast to', client.id);
    message('_broadcast')
      .set({
        recipient: client.id,
        noRespond: true,
        data: msgData
      })
      .send(client.endpoint);
  });

  return this;
};

Service.prototype.eachClient = function(fn) {
  for (var id in this.clients) fn(this.clients[id]);
};

/**
 * @fires Service#before-connect
 * @fires Service#connected
 * @param  {Message} message
 * @private
 */
Service.prototype.onConnect = function(message) {
  debug('connection attempt', message.data, this.name);
  var data = message.data;
  var clientId = data.clientId;

  if (!clientId) return;
  if (data.service !== this.name) return;
  if (this.clients[clientId]) return;

  // before hook
  this.emit('before-connect', message);
  if (message.defaultPrevented) return;

  // If the transport used support 'transfer' then
  // a MessageChannel port will have been sent.
  var ports = message.event.ports;
  var channel = ports && ports[0];

  // If the 'connect' message came with
  // a channel, update the source port
  // so response message goes directly.
  if (channel) {
    message.setSource(channel);
    this.listen(channel);
    channel.start();
  }

  this.addClient(clientId, message.source);
  message.respond();

  this.emit('connected', clientId);
  debug('connected', clientId);
};

/**
 * @fires Service#before-disconnect
 * @fires Service#disconnected
 * @param  {Message} message
 * @private
 */
Service.prototype.onDisconnect = function(message) {
  var client = this.clients[message.data];
  if (!client) return;

  // before hook
  this.emit('before-disconnect', message);
  if (message.defaultPrevented) return;

  this.removeClient(client.id);
  message.respond();

  this.emit('disconnected', client.id);
  debug('disconnected', client.id);
};

/**
 * @fires Service#before-method
 * @param  {Message} message
 * @private
 */
Service.prototype.onMethod = function(message) {
  debug('on method', message.data);
  this.emit('before-method', message);
  if (message.defaultPrevented) return;

  var method = message.data;
  var name = method.name;

  var fn = this.methods[name];
  if (!fn) throw error(4, name);
  message.respond(fn.apply(this, method.args));
};

/**
 * @fires Service#on
 * @param  {Message} message
 * @private
 */
Service.prototype.onOn = function(message) {
  debug('on on', message.data);
  this.emit('on', message.data);
};

/**
 * @fires Service#off
 * @param  {Message} message
 * @private
 */
Service.prototype.onOff = function(message) {
  debug('on off');
  this.emit('off', message.data);
};

Service.prototype.addClient = function(id, endpoint) {
  this.clients[id] = {
    id: id,
    endpoint: endpoint
  };
};

Service.prototype.removeClient = function(id) {
  delete this.clients[id];
};

/**
 * Use a plugin with this Service.
 * @param  {Function} fn Plugin function
 * @return {this} for chaining
 * @public
 */
Service.prototype.plugin = function(fn) {
  fn(this, {
    message: message,
    uuid: uuid
  });

  return this;
};

/**
 * Disconnect a Client from the Service.
 * @param  {Object} client
 * @private
 */
Service.prototype.disconnect = function(client) {
  this.removeClient(client.id);
  message('disconnect')
    .set({
      recipient: client.id,
      noRespond: true
    })
    .send(client.endpoint);
};

/**
 * Destroy the Service.
 * @public
 */
Service.prototype.destroy = function() {
  this.broadcast('service:destroyed');
  delete this.clients;
  this.unlisten();
  this.off();
};

/**
 * Creates new `Error` from registery.
 *
 * @param  {Number} id Error Id
 * @return {Error}
 * @private
 */
function error(id) {
  var args = [].slice.call(arguments, 1);
  return new Error({
    4: 'method "' + args[0] + '" doesn\'t exist'
  }[id]);
}

/**
 * Fires before the default 'connect' logic.
 * This event acts as a hook for plugin authors
 * to override default 'connect' behaviour.
 *
 * @example
 *
 * service.on('before-connect', message => {
 *   message.preventDefault();
 *   // alternative connection logic ...
 * });
 *
 * @event Service#before-connect
 * @param {Message} message - The connect message
 */

/**
 * Signals that a Client has connected.
 *
 * @example
 *
 * service.on('connected', clientId => {
 *   console.log('client (%s) has connected', clientId);
 * });
 *
 * @event Service#connected
 * @param {String} clientId - The id of the connected Client
 */

/**
 * Fires before the default 'disconnect' logic.
 * This event acts as a hook for plugin authors
 * to override default 'disconnect' behaviour.
 *
 * @example
 *
 * service.on('before-disconnect', message => {
 *   message.preventDefault();
 *   // alternative disconnection logic ...
 * });
 *
 * @event Service#before-disconnect
 * @param {Message} message - The disconnect message
 */

/**
 * Signals that a Client has disconnected.
 *
 * @example
 *
 * service.on('disconnected', clientId => {
 *   console.log('client (%s) has disconnected', clientId);
 * });
 *
 * @event Service#disconnected
 * @param {String} clientId - The id of the disconnected Client
 */

/**
 * Signals that a Client has begun
 * listening to a broadcast event.
 *
 * @example
 *
 * service.on('on', data => {
 *   console.log('client (%s) is listening to %s', data.clientId, data.name);
 * });
 *
 * @event Service#on
 * @type {Object}
 * @property {String} name - The broadcast name
 * @property {String} clientId - The id of the Client that started listening
 */

/**
 * Signals that a Client has stopped
 * listening to a broadcast event.
 *
 * @example
 *
 * service.on('off', data => {
 *   console.log('client (%s) stopped listening to %s', data.clientId, data.name);
 * });
 *
 * @event Service#off
 * @param {Object} data
 * @param {String} data.name - The broadcast name
 * @param {String} data.clientId - The id of the Client that stopped listening
 */

},{"./message":2,"./utils/uuid":5}],4:[function(require,module,exports){
'use strict';

/**
 * Exports
 * @ignore
 */

module.exports = Emitter;

/**
 * Simple logger
 *
 * @type {Function}
 * @private
 */

var debug = 0 ? console.log.bind(console, '[Emitter]') : () => {};

/**
 * Create new `Emitter`
 *
 * @class Emitter
 */

function Emitter(host) {
  if (host) return Object.assign(host, Emitter.prototype);
}

Emitter.prototype = {

  /**
   * Add an event listener.
   *
   * It is possible to subscript to * events.
   *
   * @param  {String}   type
   * @param  {Function} callback
   * @return {this} for chaining
   */

  on(type, callback) {
    debug('on', type, callback);
    if (!this._callbacks) this._callbacks = {};
    if (!this._callbacks[type]) this._callbacks[type] = [];
    this._callbacks[type].push(callback);
    return this;
  },

  /**
   * Remove an event listener.
   *
   * @example
   *
   * emitter.off('name', fn); // remove one callback
   * emitter.off('name'); // remove all callbacks for 'name'
   * emitter.off(); // remove all callbacks
   *
   * @param  {String} [type]
   * @param  {Function} [callback]
   * @return {this} for chaining
   */

  off(type, callback) {
    debug('off', type, callback);
    if (this._callbacks) {
      switch (arguments.length) {
        case 0: this._callbacks = {}; break;
        case 1: delete this._callbacks[type]; break;
        default:
          var typeListeners = this._callbacks[type];
          if (!typeListeners) return;
          var i = typeListeners.indexOf(callback);
          if (~i) typeListeners.splice(i, 1);
      }
    }
    return this;
  },

  /**
   * Emit an event.
   *
   * @example
   *
   * emitter.emit('name', { some: 'data' });
   *
   * @param  {String} type
   * @param  {*} [data]
   * @return {this} for chaining
   */

  emit(type, data) {
    debug('emit', type, data);
    if (this._callbacks) {
      var fns = this._callbacks[type] || [];
      fns = fns.concat(this._callbacks['*'] || []);
      for (var i = 0; i < fns.length; i++) fns[i].call(this, data, type);
    }
    return this;
  }
};

},{}],5:[function(require,module,exports){
'use strict';

/**
 * Create a UUID string.
 *
 * http://jsperf.com/guid-generation-stackoverflow
 *
 * @return {String}
 */

module.exports = (function() {
  var l = [];
  for (var i=0; i<256; i++) { l[i] = (i<16?'0':'')+(i).toString(16); }
  return function () {
    var d0 = Math.random()*0xffffffff|0;
    var d1 = Math.random()*0xffffffff|0;
    var d2 = Math.random()*0xffffffff|0;
    var d3 = Math.random()*0xffffffff|0;
    return l[d0&0xff]+l[d0>>8&0xff]+l[d0>>16&0xff]+l[d0>>24&0xff]+'-'+
      l[d1&0xff]+l[d1>>8&0xff]+'-'+l[d1>>16&0x0f|0x40]+l[d1>>24&0xff]+'-'+
      l[d2&0x3f|0x80]+l[d2>>8&0xff]+'-'+l[d2>>16&0xff]+l[d2>>24&0xff]+
      l[d3&0xff]+l[d3>>8&0xff]+l[d3>>16&0xff]+l[d3>>24&0xff];
  };
})();

},{}]},{},[1])(1)
});