const path = require("path")
const TerserPlugin = require('terser-webpack-plugin');

module.exports = function (grunt) {
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
        optimization: {
          minimize: true,
          minimizer: [new TerserPlugin({
            terserOptions: {
              compress: {
                drop_console: true,
              },
            },
          })],
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
