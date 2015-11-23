!((define)=>{define((require,exports,module)=>{

/**
 * Exports
 */

module.exports = IACAdaptorService;

function IACAdaptorService() {
  this.ports = [];
}

IACAdaptorService.prototype = {
  postMessage() {},

  addListener(callback, listen) {
    navigator.mozSetMessageHandler('connection', e => {
      var port = e.port;
      this.ports.push(port);
      listen(port);
      port.start();
    });
  },

  removeListener(callback, unlisten) {
    this.ports.forEach(port => {
      unlisten(port);
      port.close();
    });
  }
};

});})((typeof define)[0]=='f'&&define.amd?define:((n,w)=>{return(typeof module)[0]=='o'?c=>{c(require,exports,module);}:(c)=>{var m={exports:{}};c(n=>w[n],m.exports,m);w[n]=m.exports;};})('IACAdaptorService',this));/*jshint ignore:line*/