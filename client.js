;(function(define){define(function(require,exports,module){

var debug = 1 ? console.log.bind(console, '[client]') : function() {};

const MESSAGE_TYPES = [
  'connected',
  'response',
  'broadcast',
  'die'
];

const ERRORS = {
  1: 'Event not defined in the contract'
};

/**
 * Exports
 */

module.exports = Client;

function Client(contract) {
  this.contract = contract;
  this.uuid = uuid();
  this.connected = false;
  this._queue = [];
  this.pending = {};
  this.createInterface();
  this.connect();
  debug('initialized', this);
}

Client.prototype.request = function(method, args) {
  debug('request', method, args);
  var deferred = new Deferred();
  var messageId = uuid();
  var data = {
    contract: this.contract.name,
    type: 'request',
    client: this.uuid,
    uuid: messageId,
    method: method,
    args: args,
  };

  this.send(data);
  this.pending[messageId] = deferred;
  return deferred.promise;
};

Client.prototype.addEventListener = function(name, fn) {
  if (!this.contract.events[name]) throw new Error(ERRORS[1]);
  this.server.addEventListener('broadcast:' + name, fn);
};

Client.prototype.removeEventListener = function(name, fn) {
  this.server.removeEventListener('broadcast:' + name, fn);
};

Client.prototype.dispatchEvent = function(e) {
  this.server.dispatchEvent(e);
};

Client.prototype.connect = function() {
  debug('connect');

  // Let's make sure we are not asking
  // to register multiple times.
  if (this._waitingForConnect) return;
  this._waitingForConnect = true;

  debug('will register to the smuggler');
  var smuggler = new BroadcastChannel('smuggler');
  smuggler.postMessage({
    type: 'connect',
    contract: this.contract.name,
    client: this.uuid
  });

  smuggler.close();
  this.server = new BroadcastChannel(this.uuid);
  this.server.onmessage = this.onmessage.bind(this);
};

Client.prototype.onmessage = function(e) {
  debug('on message', e);
  if (!~MESSAGE_TYPES.indexOf(e.data.type)) return;
  this['on' + e.data.type](e.data);
};

Client.prototype.ondie = function(data) {
  debug('on die', this.contract.name);
  this.connected = false;
  this._waitingForConnect = false;
  this.server.close();
};

Client.prototype.onresponse = function(data) {
  debug('on response', data);
  var uuid = data.uuid;
  var promise = this.pending[uuid];
  if (!promise) throw new Error('no promise found');
  delete this.pending[uuid];
  promise.resolve(data.result);
};

Client.prototype.onbroadcast = function(data) {
  debug('on broadcast', data);
  var e = new Event('broadcast:' + data.name);
  e.data = data.data;
  this.server.dispatchEvent(e);
};

Client.prototype.createInterface = function() {
  debug('setup interface');
  var methods = this.contract.methods;
  var self = this;

  for (var method in methods) {
    this[method] = createMethod(method, methods[method]);
  }

  function createMethod(name, definition) {
    debug('create method', name, definition);
    return function() {
      var args = [].slice.call(arguments);
      var invalidLength = args.length !== definition.args.length;
      var invalidType = !typesMatch(args, definition.args);
      if (invalidLength || invalidType) {
        throw new Error(name + '() called with invalid argument');
      }

      return self.request(name, args);
    };
  }
};

Client.prototype.onconnected = function() {
  debug('connected');
  this.connected = true;
  while (this._queue.length) {
    this.send(this._queue.shift());
  }
  this._waitingForConnect = false;
};

Client.prototype.send = function(data) {
  if (!this.connected) {

    if (!this._waitingForConnect) {
      this.connect();
    }

    // If the client is trying to send messages before the connection
    // is made, then let's push the messages in a queue.
    this._queue.push(data);
    return;
  }

  this.server.postMessage(data);
};

/**
 * Utils
 */

function uuid(){
  var timestamp = Date.now();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
    /[xy]/g,
    function onEachCharacter(c) {
      var r = (timestamp + Math.random() * 16) % 16 | 0;
      timestamp = Math.floor(timestamp / 16);
      return (c == 'x' ? r : (r&0x7|0x8)).toString(16);
    }
  );
}

function typesMatch(args, types) {
  for (var i = 0, l = args.length; i < l; i++) {
    if (typeof args[i] !== types[i]) return false;
  }

  return true;
}

function Deferred() {
  var deferred = {};
  deferred.promise = new Promise(function(resolve, reject) {
    deferred.resolve = resolve;
    deferred.reject = reject;
  });
  return deferred;
}

});})(typeof define=='function'&&define.amd?define
:(function(n,w){return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('runtime-bridge-client',this));
