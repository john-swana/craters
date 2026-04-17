// Karma configuration
// Generated on Tue Oct 19 2021 22:12:11 GMT+0200 (Central Africa Time)
module.exports = function (config) {
  config.set({
    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: "",
    // frameworks to use
    // available frameworks: https://www.npmjs.com/search?q=keywords:karma-adapter
    frameworks: ["mocha", "chai", "karma-typescript"],
    // list of files / patterns to load in the browser
    files: [{
      pattern: "src/*.ts"
    },
    {
      pattern: "test/*.ts"
    },
    {
      pattern: "test/*/**/*",
      watched: false,
      included: false,
      served: true,
      nocache: false
    },
    ],
    // list of files / patterns to exclude
    exclude: [],
    // preprocess matching files before serving them to the browser
    // available preprocessors: https://www.npmjs.com/search?q=keywords:karma-preprocessor
    preprocessors: {
      "**/*.ts": ["karma-typescript"]
    },
    // test results reporter to use
    // possible values: "dots", "progress"
    // available reporters: https://www.npmjs.com/search?q=keywords:karma-reporter
    reporters: ["dots", "karma-typescript"],
    // web server port
    port: 9876,
    // enable / disable colors in the output (reporters and logs)
    colors: true,
    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,
    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: false,
    // start these browsers
    // available browser launchers: https://www.npmjs.com/search?q=keywords:karma-launcher
    browsers: ["ChromeHeadless", "ChromeHeadless_custom"],
    customLaunchers: {
      ChromeHeadless_custom: {
        base: "ChromeHeadless",
        flags: ["--disable-translate", "--disable-extensions",
          "--no-first-run", "--disable-background-networking",
          "--remote-debugging-port=9223",
          "--enable-webgl",
          "--use-gl=swiftshader",
          "--ignore-gpu-blocklist"
        ]
      },
    },
    karmaTypescriptConfig: {
      compilerOptions: {
        strictPropertyInitialization: false,
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        preserveConstEnums: true,
        strictNullChecks: false,
        esModuleInterop: true,
        noImplicitAny: false,
        declaration: true,
        sourceMap: true,
        allowJs: true,
        target: "ES2015",
        module: "commonjs",
      },
      exclude: ["node_modules"]
    },
    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: false,
    // Concurrency level
    // how many browser instances should be started simultaneously
    concurrency: Infinity
  })
}