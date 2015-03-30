
'use strict';

/**
 * Dependencies
 */

var emitter = require('./emitter');
var utils = require('./utils');

/**
 * Exports
 */

module.exports = ChildProcess;

/**
 * Mini debugger
 * @type {Function}
 */

var debug = 1 ? console.log.bind(console, '[child-process]') : function() {};

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

ChildProcess.prototype = Object.create(emitter.prototype);

function ChildProcess(params) {
  this.id = utils.uuid();
  this.src = params.src;
  this.type = params.type;
  this.parentNode = params.parentNode;
  this.onmessage = utils.message.handler(this.id, KNOWN_MESSAGES).bind(this);
  this.process = this.createProcess();
  this.listen();
  debug('initialized', this);
}

ChildProcess.prototype.createProcess = function() {
  switch(this.type) {
    case 'worker':
      return new Worker(this.src + '?pid=' + this.id);
    case 'sharedworker':
      return new SharedWorker(this.src + '?pid=' + this.id);
    case 'window':
      if (utils.env() != 'window') throw new Error(ERRORS[1]);
      var iframe = document.createElement('iframe');
      (this.parentNode || document.body).appendChild(iframe);
      iframe.name = this.id;
      iframe.src = this.src;
      return iframe;
  }
};

ChildProcess.prototype.listen = function() {
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

ChildProcess.prototype.unlisten = function() {
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

ChildProcess.prototype.onbroadcast = function(broadcast) {
  debug('on broadcast', broadcast);
  this.emit(broadcast.type, broadcast.data);
};

ChildProcess.prototype.destroy = function() {
  this.unlisten();
  this.destroyProcess();
};

ChildProcess.prototype.destroyProcess = function() {
  switch(this.type) {
    case 'worker':
    case 'sharedworker':
      this.process.terminate(); break;
    case 'window':
      this.process.remove(); break;
  }
};
