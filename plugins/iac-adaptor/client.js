!((define)=>{define((require,exports,module)=>{

/**
 * Exports
 */

module.exports = IACAdaptorClient;

function IACAdaptorClient(keyword) {
  this.keyword = keyword;
  this.ready = this.setup();
}

IACAdaptorClient.prototype = {
  setup() {
    return new Promise((resolve, reject) => {
      navigator.mozApps.getSelf().onsuccess = e => {
        var app = e.target.result;
        if (!app) return;
        return app.connect(this.keyword)
          .then(ports => {
            this.port = ports[0];
            this.port.start();
            resolve();
          }, reject);
      };
    });
  },

  postMessage(data) {
    this.ready.then(() => this.port.postMessage(data));
  },

  addListener(callback) {
    this.ready.then(() => this.port.addEventListener('message', callback));
  },

  removeListener(callback) {
    this.ready.then(() => this.port.removeEventListener('message', callback));
  }
};

});})((typeof define)[0]=='f'&&define.amd?define:((n,w)=>{return(typeof module)[0]=='o'?c=>{c(require,exports,module);}:(c)=>{var m={exports:{}};c(n=>w[n],m.exports,m);w[n]=m.exports;};})('IACAdaptorClient',this));/*jshint ignore:line*/
