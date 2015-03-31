
'use strict';

/**
 * Dependencies
 */

var emitter = require('./emitter');
var utils = require('./utils');

/**
 * Exports
 */

module.exports = ChildThread;

/**
 * Mini debugger
 * @type {Function}
 */

var debug = 1 ? console.log.bind(console, '[ChildThread]') : function() {};

/**
 * Error messages
 * @type {Object}
 */

const ERRORS = {
  1: 'iframes can\'t be spawned from workers'
};

const KNOWN_MESSAGES = [
  'broadcast',
];

/**
 * Extends `Emitter`
 */

ChildThread.prototype = Object.create(emitter.prototype);

function ChildThread(params) {
  if (!(this instanceof ChildThread)) return new ChildThread(params);
  this.id = utils.uuid();
  this.src = params.src;
  this.type = params.type;
  this.parentNode = params.parentNode;
  this.servicesReady = {};
  this.onmessage = utils.message.handler(this.id, KNOWN_MESSAGES).bind(this);
  this.on('serviceready', this.onserviceready.bind(this));
  this.process = this.createProcess();
  this.listen();
  debug('initialized');
}

ChildThread.prototype.createProcess = function() {
  switch(this.type) {
    case 'worker':
      return new Worker(this.src + '?pid=' + this.id);
    case 'sharedworker':
      return new SharedWorker(this.src + '?pid=' + this.id);
    case 'window':
      if (utils.env() !== 'window') throw new Error(ERRORS[1]);
      var iframe = document.createElement('iframe');
      (this.parentNode || document.body).appendChild(iframe);
      iframe.name = this.id;
      iframe.src = this.src;
      return iframe;
  }
};

ChildThread.prototype.isReady = function(service) {
  return !!this.servicesReady[service];
};

ChildThread.prototype.postMessage = function(message) {
  switch(this.type) {
    case 'worker': this.process.postMessage(message); break;
    case 'sharedworker': this.process.port.postMessage(message); break;
    case 'window': this.process.contentWindow.postMessage(message, '*'); break;
  }
};

ChildThread.prototype.listen = function() {
  switch(this.type) {
    case 'worker':
      this.process.addEventListener('message', this.onmessage);
      break;
    case 'sharedworker':
      this.process.port.start();
      this.process.port.addEventListener('message', this.onmessage);
      break;
    case 'window':
      addEventListener('message', this.onmessage);
  }
};

ChildThread.prototype.unlisten = function() {
  switch(this.type) {
    case 'worker':
      this.process.removeEventListener('message', this.onmessage);
      break;
    case 'sharedworker':
      this.process.port.close();
      this.process.port.removeEventListener('message', this.onmessage);
      break;
    case 'window':
      removeEventListener('message', this.onmessage);
  }
};

ChildThread.prototype.onbroadcast = function(broadcast) {
  debug('on broadcast', broadcast);
  this.emit(broadcast.type, broadcast.data);
};

ChildThread.prototype.onserviceready = function(service) {
  debug('on service ready', service);
  this.servicesReady[service.name] = service;
};

ChildThread.prototype.destroy = function() {
  this.unlisten();
  this.destroyProcess();
};

ChildThread.prototype.destroyProcess = function() {
  switch(this.type) {
    case 'worker': this.process.terminate(); break;
    case 'sharedworker': this.process.port.close(); break;
    case 'window': this.process.remove(); break;
  }
};
