'use strict';

/**
 * Dependencies
 */

var Emitter = require('./utils/emitter');
var uuid = require('./utils/uuid');
var message = require('./message');

/**
 * Exports
 */

module.exports = Client;

/**
 * Mini Logger
 *
 * @type {Function}
 */

var debug = 0 ? function(arg1, ...args) {
  var type = `[${self.constructor.name}][${location.pathname}]`;
  console.log(`[Client]${type} - "${arg1}"`, ...args);
} : () => {};

/**
 * Initialize a new `Client`
 *
 * @param {String} type
 */

function Client(service, endpoint) {
  if (!(this instanceof Client)) return new Client(service, endpoint);

  this.id = uuid();
  this.setEndpoint(endpoint);
  this.service = service;
  this.pending = new Set();

  this.receiver = message.receiver(this.id)
    .on('_broadcast', this.onBroadcast.bind(this));

  // this._on('service:destroyed', this.onServiceDestroyed.bind(this));
  if (!this.endpoint) throw error(1);
  debug('initialized', service);
}

Client.prototype = Emitter({

  /**
   * Connect with the Service.
   *
   * @private
   */
  connect() {
    debug('connect');
    if (this.connected) return this.connected;
    debug('connecting...', this.service);

    var mc = new MessageChannel();
    this.channel = mc.port1;
    this.channel.start();

    var data = {
      clientId: this.id,
      service: this.service
    };

    return this.connected = this.message('_connect')
      .set('transfer', [mc.port2])
      .set('data', data)
      .listen(mc.port1)
      .send()
      .then(response => {
        debug('connected', response);

        // Check if the response came back on
        // the MessageChannel. If it did then
        // update the endpoint so that all
        // subsequent messaging uses this channel.
        var usingChannel = response.event.target === this.channel;
        if (usingChannel) this.setEndpoint(this.channel);
        else {
          this.channel.close();
          delete this.channel;
        }

        // Begin listening so that Clients can respond
        // to push style messages like .broadcast().
        this.receiver.listen(this.endpoint);
      });
  },

  /**
   * Disconnect from the `Service`
   *
   * @public
   */
  disconnect(options) {
    if (!this.connected) return Promise.resolve();
    debug('disconnecting ...');

    var config = {
      noRespond: options && options.noRespond,
      data: this.id
    };

    this.cancelPending();

    return this.message('_disconnect')
      .set(config)
      .send()
      .then(() => this.onDisconnected());
  },

  method(method) {
    var args = [].slice.call(arguments, 1);

    return this.connect()
      .then(() => {
        debug('method', method);
        return this.message('_method', '[Client]')
          .set({
            recipient: this.service,
            data: {
              name: method,
              args: args
            }
          })
          .send();
      })
      .then(response => response.value);
  },

  plugin(fn) {
    fn(this, {
      message: message,
      Emitter: Emitter,
      uuid: uuid
    });

    return this;
  },

  message(type) {
    debug('create message', type);
    var msg = message(type)
      .set('endpoint', this.endpoint)
      .on('response', () => this.pending.delete(msg))
      .on('cancel', () => this.pending.delete(msg));

    this.pending.add(msg);
    return msg;
  },

  cancelPending() {
    debug('cancel pending');
    this.pending.forEach(msg => { msg.cancel();});
    this.pending.clear();
  },

  pendingResponded() {
    var responded = [];
    this.pending.forEach(msg => responded.push(msg.responded));
    return Promise.all(responded);
  },

  onBroadcast(message) {
    debug('on broadcast', message.data);
    this.emit(message.data.type, message.data.data);
  },

  // onServiceDestroyed() {
  //   debug('service destroyed');
  //   this.onDisconnected();
  // },

  onDisconnected() {
    delete this.connected;
    this.pendingResponded().then(() => {
      debug('disconnected');
      if (this.channel) this.channel.close();
      this.emit('disconnected');
    });
  },

  setEndpoint(endpoint) {
    debug('set endpoint');
    if (endpoint) this.endpoint = message.endpoint.create(endpoint);
    return this;
  },

  destroy() {
    return this.disconnect()
      .then(() => {
        if (this.destroyed) return;
        debug('destroy');
        this.destroyed = true;
        this.receiver.destroy();
        this._off();
      });
  },

  _on: Emitter.prototype.on,
  _off: Emitter.prototype.off,
});

Client.prototype.on = function(name, fn) {
  this.connect().then(() => {
    debug('bind on', name);
    Emitter.prototype.on.call(this, name, fn);
    this.message('_on')
      .set('noRespond', true)
      .set('data', {
        name: name,
        clientId: this.id
      })
      .send(this.endpoint);
  });

  return this;
};

Client.prototype.off = function(name, fn) {
  this.connect().then(() => {
    Emitter.prototype.off.call(this, name, fn);
    this.message('_off')
      .set('noRespond', true)
      .set('data', {
        name: name,
        clientId: this.id
      })
      .send(this.endpoint);
  });

  return this;
};

function error(id) {
  return new Error({
    1: 'an endpoint must be defined'
  }[id]);
}
