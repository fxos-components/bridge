;(function(define){define(function(require,exports,module){

module.exports = Emitter;

var debug = 0 ? console.log.bind(console, '[emitter]') : function(){};

function Emitter() {}

Emitter.prototype = {
  emit: function(type, data) {
    debug('emit', type, data);
    if (!this._callbacks) return;
    var fns = this._callbacks[type] || [];
    fns = fns.concat(this._callbacks['*'] || []);
    for (var i = 0; i < fns.length; i++) {
      fns[i].call(this, data, type);
    }
  },

  on: function(type, callback) {
    debug('on', type, callback);
    if (!this._callbacks) this._callbacks = {};
    if (!this._callbacks[type]) this._callbacks[type] = [];
    this._callbacks[type].push(callback);
  },

  off: function(type, callback) {
    if (!this._callbacks) return;
    var typeListeners = this._callbacks[type];
    var i = typeListeners.indexOf(callback);
    if (~i) typeListeners.splice(i, 1);
  }
};

});})(typeof define=='function'&&define.amd?define
:(function(n,w){return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('./lib/emitter',this));