# threads.js [![](https://travis-ci.org/gaia-components/threads.svg)](https://travis-ci.org/gaia-components/threads)

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

A. `$ npm install gaia-components/threads`<br/>
B. `$ bower install gaia-components/threads`<br/>
C. [Copy/paste](https://raw.githubusercontent.com/gaia-components/threads/master/threads.js)

## Usage

Window: `<script src="threads.js">`<br/>
Worker: `importScripts('threads.js')`

> When possible use lighter `thread-client.js` or `threads-service.js`

<h2 class="jsdoc-hidden">Documentation</h2>
<a class="jsdoc-hidden" href="https://gaia-components.github.io/threads/docs/out/index.html">View documentation</a>


