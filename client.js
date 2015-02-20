(function(exports) {

var debug = 0 ? console.log.bind(console, '[client]') : function() {};

const MESSAGE_TYPES = [
  'response',
  'broadcast'
];

const ERRORS = {
  1: 'Event not defined in the contract'
};

/**
 * Exports
 */

exports.Client = Client;

function Client(contract) {
  this.contract = contract;

  this.uuid = uuid();

  this._queue = [];
  this.connected = false;
  this.connect();

  this.pending = {};
  this.createInterface();
  this.listen();
  debug('initialized', this);
}

Client.prototype.request = function(method, args) {
  debug('request', method, args);
  var deferred = new Deferred();
  var id = uuid();
  var data = {
    contract: this.contract.name,
    type: 'request',
    uuid: id,
    method: method,
    args: args,
  };

  this.send(data);
  this.pending[id] = deferred;
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
  console.log('[client] wants to connect');
  // Let's make sure we are not asking to register multiple
  // times.
  if (this._waitingForConnect) {
    return;
  }
  this._waitingForConnect = true;

  console.log('[client] will register to the smuggler');
  var smuggler = new BroadcastChannel('smuggler');
  smuggler.postMessage({
    name: 'Register',
    type: 'client',
    contract: this.contract,
    uuid: this.uuid
  });
  smuggler.close();

  this.server = new BroadcastChannel(this.uuid);
  this.listen();
};

Client.prototype.onmessage = function(e) {
  if (e.data === 'connected') {
    this.onconnected();
    return;
  };

  if (e.data === 'die') {
    console.log('Client (' + this.contract.name + ') receive die');
    this.connected = false;
    this._waitingForConnect = false;
    this.server.close();
  };

  debug('on message', e, e.data);
  if (e.data.contract !== this.contract.name) return;
  if (!~MESSAGE_TYPES.indexOf(e.data.type)) return;
  this['on' + e.data.type](e.data);
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

Client.prototype.listen = function() {
  this.server.addEventListener('message', e => this.onmessage(e));
};

Client.prototype.onconnected = function() {
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

})(this);
