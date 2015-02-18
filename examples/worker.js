
importScripts('../runtime-bridge.js');
importScripts('definition.js');



var bridge = new WorkerBridge({
  definition: definition,
  side: 'worker',
  api: {
    getThing: getThing
  }
});

function getThing(arg) {
  console.log('get thing', arg);
  return new Promise((resolve, reject) => {
    resolve('pong');
  });
}

console.log('WORKER RUNNING', definition);
