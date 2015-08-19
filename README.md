# bridge.js [![](https://travis-ci.org/gaia-components/bridge.svg)](https://travis-ci.org/gaia-components/bridge)

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

## Install options

A. `$ npm install gaia-components/bridge`<br/>
B. `$ bower install gaia-components/bridge`<br/>
C. [Copy/paste](https://raw.githubusercontent.com/gaia-components/bridge/master/bridge.js)

## Usage

Window: `<script src="bridge.js">`<br/>
Worker: `importScripts('bridge.js')`

> When possible use lighter `client.js` or `service.js`

<h2 class="jsdoc-hidden">Documentation</h2>
<a class="jsdoc-hidden" href="https://gaia-components.github.io/bridge/docs/out/index.html">View documentation</a>


