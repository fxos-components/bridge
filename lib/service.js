'use strict';

/**
 * Dependencies
 */

var uuid = require('./utils/uuid');
var message = require('./message');

/**
 * Exports
 */

module.exports = (name) => new Service(name);
module.exports.Service = Service;

/**
 * Mini Logger
 *
 * @type {Function}
 */

var debug = 0 ? function(arg1, ...args) {
  var type = `[${self.constructor.name}][${location.pathname}]`;
  console.log(`[Service]${type} - "${arg1}"`, ...args);
} : () => {};

/**
 * Extends `Receiver`
 */

var proto = Service.prototype = Object.create(message.Receiver.prototype);

function Service(name) {
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

proto.method = function(name, fn) {
  this.methods[name] = fn;
  return this;
};

proto.broadcast = function(type, data, only) {
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
};

proto.eachClient = function(fn) {
  for (var id in this.clients) fn(this.clients[id]);
};

proto.onConnect = function(message) {
  debug('connection attempt', message.data, this.name);
  var data = message.data;
  var clientId = data.clientId;

  if (!clientId) return;
  if (data.service !== this.name) return;
  if (this.clients[clientId]) return;

  // before hook
  this.emit('before connect', message);
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

  this.emit('connect', clientId);
  debug('connected', clientId);
};

proto.onDisconnect = function(message) {
  var client = this.clients[message.data];
  if (!client) return;

  this.removeClient(client.id);
  message.respond();

  this.emit('disconnect', client.id);
  debug('disconnected', client.id);
};

proto.onMethod = function(message) {
  debug('on method', message.data);
  this.emit('before onMethod', message);
  if (message.defaultPrevented) return;

  var method = message.data;
  var name = method.name;

  var fn = this.methods[name];
  if (!fn) throw error(4, name);
  message.respond(fn.apply(this, method.args));
};

proto.onOn = function(message) {
  debug('on on', message.data);
  this.emit('on', message.data);
};

proto.onOff = function(message) {
  debug('on off');
  this.emit('off', message.data);
};

proto.addClient = function(id, endpoint) {
  this.clients[id] = {
    id: id,
    endpoint: endpoint
  };
};

proto.removeClient = function(id) {
  delete this.clients[id];
};

proto.plugin = function(fn) {
  fn(this, {
    message: message,
    uuid: uuid
  });

  return this;
};

proto.disconnect = function(client) {
  this.removeClient(client.id);
  message('disconnect')
    .set({
      recipient: client.id,
      noRespond: true
    })
    .send(client.endpoint);
};

proto.destroy = function() {
  this.broadcast('service:destroyed');
  delete this.clients;
  this.unlisten();
  this.off();
};

// new Service('scope').listen()
//   .method('close', function() {
//     debug('closing');
//     self.dispatchEvent(new MessageEvent('closing'));
//     setTimeout(() => self.close());
//   });

/**
 * Utils
 */

function error(id) {
  var args = [].slice.call(arguments, 1);
  return new Error({
    4: 'method "' + args[0] + '" doesn\'t exist'
  }[id]);
}
