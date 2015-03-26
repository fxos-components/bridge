;(function(define){define(function(require,exports,module){

/**
 * Dependencies
 */

var utils = require('./utils');

/**
 * Exports
 */

module.exports = ChildProcess;

var debug = 0 ? console.log.bind(console, '[child-process]') : function() {};

const ERRORS = {
  1: 'iframes can\'t be spawned from workers'
};

function ChildProcess(params) {
  this.id = utils.uuid();
  this.src = params.src;
  this.type = params.type;
  this.parentNode = params.parentNode;
  this.raw = this.create();
  debug('initialized', this);
}

ChildProcess.prototype.create = function() {
  switch(this.type) {
    case 'worker':
      return new Worker(this.src + '?pid=' + this.id);
    case 'window':
      if (utils.env() != 'window') throw new Error(ERRORS[1]);
      var iframe = document.createElement('iframe');
      (this.parentNode || document.body).appendChild(iframe);
      iframe.name = this.id;
      iframe.src = this.src;
      return iframe;
  }
};

ChildProcess.prototype.destroy = function() {
  switch(this.type) {
    case 'worker':
    case 'sharedworker':
      this.raw.terminate(); break;
    case 'window':
      this.raw.remove(); break;
  }
};

});})(typeof define=='function'&&define.amd?define
:(function(n,w){'use strict';return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('./child-process',this));