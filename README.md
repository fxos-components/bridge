# threads.js [![](https://travis-ci.org/gaia-components/threads.svg)](https://travis-ci.org/gaia-components/threads) [![](https://david-dm.org/gaia-components/threads/dev-status.svg)](https://david-dm.org/gaia-components/threads#info=devDependencies)

> Exposes a service between one browser JavaScript context to another.


```js
// my-worker.js:

service('my-service')
  .method('greet', name => 'hello ' + name)
  .listen();
```
```js
// app.js:

var endpoint = new Worker('my-worker.js');
var myClient = client('my-service', endpoint);

client.method('greet', 'john').then(value => {
  console.log(value); //=> 'hello john'
});
```

## Installation

```bash
$ npm install gaia-components/threads
```
```bash
$ bower install gaia-components/threads
```

## Usage

Window: `<script src="threads.js">`<br/>
Worker: `importScripts('threads.js')`

> When possible use lighter `thread-client.js` or `threads-service.js`

## <a class="jsdoc-hidden" href="https://gaia-components.github.io/threads/docs/out/index.html">View Documentation</a>


