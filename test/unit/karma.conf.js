
module.exports = function(config) {
  config.set({
    frameworks: ['mocha', 'sinon-chai'],
    browsers: ['FirefoxLatest'],
    autoWatchBatchDelay: 500,
    basePath: '../../',
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
      { pattern: 'test/unit/lib/*', included: false },
      'test/unit/test.js',
      'test/unit/message.test.js',
      'test/unit/service.test.js',
      'test/unit/client.test.js',
    ]
  });
};
