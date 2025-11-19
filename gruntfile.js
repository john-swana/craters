const path = require("path")
module.exports = function(grunt) {
  grunt.initConfig({
    webpack: {
      dev: {
        entry: {
          "./dist/index": "./src/index"
        },
        output: {
          path: path.resolve(__dirname, "./"),
          library: "CRATERS",
          libraryTarget: "umd",
          filename: "[name].js"
        },
        resolve: {
          modules: ["node_modules"],
          extensions: [".tsx", ".ts", ".js"]
        },
        module: {
          rules: [{
            test: /\.tsx?$/,
            use: "ts-loader",
            exclude: /node_modules/,
          }]
        }
      },
      prod: {
        mode: "production",
        entry: {
          "./dist/index": "./src/index"
        },
        output: {
          path: path.resolve(__dirname, "./"),
          library: "CRATERS",
          libraryTarget: "umd",
          filename: "[name].js"
        },
        resolve: {
          modules: ["node_modules"],
          extensions: [".tsx", ".ts", ".js"]
        },
        module: {
          rules: [{
            test: /\.tsx?$/,
            use: "ts-loader",
            exclude: /node_modules/,
          }]
        }
      }
    }
  })
  grunt.loadNpmTasks("grunt-webpack")
  grunt.registerTask("build:prod", ["webpack:prod"])
  grunt.registerTask("build:dev", ["webpack:dev"])
  grunt.registerTask("default", ["build:dev"])
}