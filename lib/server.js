;(function(define){define(function(require,exports,module){

/**
 * Dependencies
 */

var Emitter = require('./lib/emitter');

/**
 * Mini Logger
 * @return {Function}
 */
var debug = 0 ? console.log.bind(console, '[server]') : function() {};

const ERRORS = {
  1: 'method not defined in the contract',
  2: 'arguments.length doesn\'t match contract',
  3: 'request not authorized',
};

/**
 * exports
 */

module.exports = Server;

/**
 * Extend `Emitter`
 */

Server.prototype = Object.create(Emitter.prototype);

function Server(contract, options) {
  debug('initialize', contract, options);
  this.password = options && options.password;
  this.contract = contract;
  this.methods = {};
  this.clients = {};
  this.listen();
}

Server.prototype.respond = function(request, result) {
  debug('respond', request.type, result);
  this.send({
    client: request.client,
    uuid: request.uuid,
    type: 'response',
    method: request.method,
    result: result
  });
};

Server.prototype.onmessage = function(e) {
  debug('on message', e);
  if (e.data.type !== 'request') return;
  this.onrequest(e.data);
};

Server.prototype.onrequest = function(request) {
  debug('on request', request);
  if (!this.authorized(request)) return;
  var fn = this.methods[request.method];
  var args = request.args || [];
  if (!fn) throw new Error(ERRORS[1]);
  Promise.resolve(fn.apply(null, args)).then((result) => {
    this.respond(request, result);
  });
};

Server.prototype.listen = function() {
  this.smuggler = new BroadcastChannel('smuggler');
  this.smuggler.onmessage = this.onsmugglermessage.bind(this);
  this.advertise();
};

Server.prototype.advertise = function() {
  debug('advertise');
  this.smuggler.postMessage({
    type: 'advertise',
    contract: this.contract.name
  });
};

Server.prototype.handle = function(name, fn) {
  var definition = this.contract.methods[name];
  if (!definition) throw new Error(ERRORS[1]);
  if (fn.length !== definition.args.length) throw new Error(ERRORS[2]);
  this.methods[name] = fn;
};

Server.prototype.onsmugglermessage = function(e) {
  debug('smuggler message', e);
  if (this['on' + e.data.type]) this['on' + e.data.type](e.data);
};

Server.prototype.authorized = function(data) {
  return (!this.password || this.password === data.password)
    && data.contract === this.contract.name;
};

Server.prototype.onconnect = function(data) {
  if (!this.authorized(data)) return;
  this.connect(data.client);
};

Server.prototype.connect = function(client) {
  if (!client) return;
  if (this.clients[client]) return;
  var channel = new BroadcastChannel(client);
  channel.onmessage = this.onmessage.bind(this);
  this.clients[client] = channel;
  this.send({
    client: client,
    type: 'connected'
  });
};

Server.prototype.send = function(data) {
  debug('send', data, this.clients);
  var client = this.clients[data.client];
  if (!client) throw new Error('unkown uuid');
  data.contract = this.contract.name;
  client.postMessage(data);
};

Server.prototype.broadcast = function(name, data) {
  debug('broadcast', name, data);
  for (var uuid in this.clients) {
    this.send({
      client: uuid,
      type: 'broadcast',
      name: name,
      data: data
    });
  }
};

});})(typeof define=='function'&&define.amd?define
:(function(n,w){'use strict';return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('./lib/server',this));
