;(function(define){define(function(require,exports,module){

module.exports = {
  client: require('./lib/client'),
  manager: require('./lib/manager'),
  service: require('./lib/service')
};

});})(typeof define=='function'&&define.amd?define
:(function(n,w){return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('threads',this));