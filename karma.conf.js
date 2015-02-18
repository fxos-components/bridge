
module.exports = function(karma) {
  karma.set({
    browsers: ['firefox_latest'],
    logLevel: 'LOG_DEBUG',
    basePath: './',
    frameworks: [
      'mocha',
      'sinon-chai',
      'browserify'
    ],

    client: {
      captureConsole: true,
      mocha: { 'ui': 'tdd' }
    },

    customLaunchers: {
      firefox_latest: {
        base: 'FirefoxNightly',
        prefs: { 'dom.webcomponents.enabled': true }
      }
    },

    preprocessors: {
      'test/test.js': ['browserify']
    },

    browserify: {
      debug: true,
      transform: ['browserify-shim']
    },

    files: [
      'test/test.js',
      { pattern: 'test/lib/worker.js', included: false },
      { pattern: 'test/lib/contract.js', included: false },
      { pattern: 'bridge.js', included: false },
    ]
  });
};
