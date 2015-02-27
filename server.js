;(function(define){define(function(require,exports,module){

var debug = 1 ? console.log.bind(console, '[server]') : function() {};

const ERRORS = {
  1: 'Method not defined in the contract'
};

/**
 * exports
 */

module.exports = Server;

function Server(contract, methods) {
  debug('initialize', contract, methods);
  this.contract = contract;
  this.methods = methods;
  this.clients = {};
  this.setupSmuggler();
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
  var data = e.data;

  // If this message doesn't have a client uuid then
  // it's a 're-entrant' and should be ignored
  // if (!data.client) return;


  // // TODO: This part should be moved out of this function.
  // if (typeof data === 'string') {
  //   debug('opening channel' , data);
  //   var channel = new BroadcastChannel(data);
  //   channel.uuid = data;
  //   this.ports.push(channel);

  //   var uuid = data;
  //   var self = this;

  //   channel.onmessage = function(data) {
  //     if (data.data === 'die') {
  //       console.log('[server] Closing channel (' + uuid + ')  for: ' + self.contract.name);
  //       channel.close();
  //       return;
  //     }

  //     data.data.port = channel;
  //     self.onmessage(data.data);
  //   };

  //   // TODO: This is a bit weak to say that in this simple way.
  //   // Would be better is there is a set of default events for clients
  //   // such as connected/disconnected.
  //   channel.postMessage('connected');
  //   return;
  // }

  // if (data.contract !== this.contract.name) return;
  if (data.type !== 'request') return;
  this.onrequest(data);
};

Server.prototype.onrequest = function(request) {
  debug('on request', request);
  var fn = this.methods[request.method];
  var args = request.args || [];
  if (!fn) throw new Error(ERRORS[1]);
  Promise.resolve(fn.apply(null, args)).then((result) => {
    this.respond(request, result);
  });
};

Server.prototype.setupSmuggler = function() {
  this.smuggler = new BroadcastChannel('smuggler');
  this.smuggler.onmessage = this.onsmugglermessage.bind(this);
};

Server.prototype.onsmugglermessage = function(e) {
  debug('smuggler message', e);
  if (this['on' + e.data.type]) this['on' + e.data.type](e.data);
};

Server.prototype.onconnect = function(data) {
  if (this.clients[data.uuid]) return;
  var channel = new BroadcastChannel(data.client);
  this.clients[data.client] = channel;
  channel.onmessage = this.onmessage.bind(this);
  this.send({
    client: data.client,
    contract: this.contract.name,
    type: 'connected'
  });
};

Server.prototype.send = function(data) {
  debug('send', data, this.clients);
  var client = this.clients[data.client];
  if (!client) throw new Error('unkown uuid');
  client.postMessage(data);
};

Server.prototype.broadcast = function(data) {
  for (var uuid in this.clients) {
    this.clients[uuid].postMessage(data);
  }
};

});})(typeof define=='function'&&define.amd?define
:(function(n,w){'use strict';return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('runtime-bridge-server',this));
