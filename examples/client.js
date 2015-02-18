
var worker = new SharedWorker('sharedworker.js');

// var bridge = new WorkerBridge({
//   definition: definition,
//   side: 'window',
//   worker: worker,
//   api: {
//     onThingUpdate: function() {

//     }
//   }
// });

// bridge.worker.getThing('some arg').then((result) => {
//   console.log('callback', result);
// });


setTimeout(function() {
  worker.port.postMessage({ yo: 'yo' });
}, 2000);
