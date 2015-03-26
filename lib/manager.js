;(function(define){define(function(require,exports,module){
'use strict';

/**
 * Dependencies
 */

var ChildProcess = require('./child-process');
var emitter = require('./emitter').prototype;
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
  this.send('connect', {
    recipient: serviceId,
    data: clientId
  });
};

Manager.prototype.send = function(type, params) {
  debug('send', type, params);
  channel.postMessage({
    id: utils.uuid(),
    type: type,
    sender: this.id,
    recipient: params.recipient,
    data: params.data
  });
};


Manager.prototype.onserviceready = function(msg) {
  debug('on service ready', msg);
  this.activeServices[msg.data.name] = msg.service;
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
  var process = new ChildProcess(descriptor);

  this.processes.src[process.src] = process;
  this.processes.id[process.id] = process;

  // Wait for a new service to declare itself
  // 'ready' that matches the pid and service
  // name of the child-process we just created.
  this.on('serviceready', function fn(service) {
    if (service.name !== descriptor.name) return;
    if (service.pid !== process.id) return;
    debug('serviceready', service);
    this.off('serviceready', fn);
    deferred.resolve(service);
  });

  return deferred.promise;
};

});})(typeof define=='function'&&define.amd?define
:(function(n,w){'use strict';return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('./lib/manager',this));