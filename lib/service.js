
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

  // Don't declare service ready until
  // any pending tasks in the event-loop
  // have completed. Namely any pending
  // 'connect' events for `SharedWorkers`.
  // If we broadcast the 'serviceready'
  // event before the thread-parent has
  // 'connected', it won't be heard.
  setTimeout(() => this.ready());
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
