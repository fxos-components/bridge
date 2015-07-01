'use strict';

/**
 * Dependencies
 */

var Emitter = require('./utils/emitter');
var uuid = require('./utils/uuid');

/**
 * Exports
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
 */

var debug = 0 ? console.log.bind(console, '[Message]') : () => {};

function Message(type) {
  this.cancelled = false;
  this._timeout = null;
  this.listeners = [];
  this.onMessage = this.onMessage.bind(this);
  this.onTimeout = this.onTimeout.bind(this);
  if (typeof type === 'object') this.setupInbound(type);
  else this.setupOutbound(type);
}

Message.prototype = Emitter({
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
    debug('send');
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
   * @param  {HTMLIframeElement | MessagePort | Window} endpoint
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
});

/**
 * Receiver
 */

function Receiver(name) {
  this.name = name;
  this.endpoints = new Set();
  this.onMessage = this.onMessage.bind(this);
  this.listen = this.listen.bind(this);
  this.unlisten = this.unlisten.bind(this);
  debug('receiver initialized', name);
}

Receiver.prototype = Emitter({
  listen(thing) {
    debug('listen');
    var endpoint = PortAdaptor.create(thing || self);
    if (this.endpoints.has(endpoint)) return;
    endpoint.addListener(this.onMessage, this.listen);
    this.endpoints.add(endpoint);
    return this;
  },

  unlisten(thing) {
    debug('unlisten', thing);
    this.endpoints.forEach(endpoint => {
      endpoint.removeListener(this.onMessage, this.unlisten);
    });
  },

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
});

/**
 * Port Adaptors
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
    debug('BroadcastChannel');
    var ready = options && options.ready;
    ready = ready ? Promise.resolve() : checkReady();

    function checkReady() {
      var promise = deferred();
      target.postMessage('ready');
      on(target, MSG, function fn(e) {
        if (e.data != 'ready') return;
        off(target, MSG, fn);
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
