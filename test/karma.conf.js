
module.exports = function(config) {
  config.set({
    frameworks: ['mocha', 'sinon-chai'],
    browsers: ['FirefoxLatest'],
    autoWatchBatchDelay: 500,
    basePath: '../',
    client: {
      captureConsole: true,
      mocha: { 'ui': 'tdd' }
    },

    customLaunchers: {
      FirefoxLatest: {
        base: 'FirefoxNightly'
      }
    },

    files: [
      'bridge.js',
      'src/plugins/stream/*.js',
      { pattern: 'test/lib/*', included: false },
      'test/test.js',
      'test/message.test.js',
      'test/service.test.js',
      'test/client.test.js',
    ]
  });
};
