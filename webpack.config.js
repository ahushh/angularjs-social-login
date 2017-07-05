const webpack = require('webpack')
const path = require('path')
const distPath = path.join(__dirname, '.')

module.exports = function() {
  return {
    entry: {
      js: './src/angularjs-social-login'
    },
    output: {
      path: distPath,
      filename: 'angularjs-social-login.js'
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: ['node_modules'],
          use: ['ng-annotate-loader', {loader: 'babel-loader', options: { presets: ['es2015'] } }]
        }
      ]
    },
    plugins: [
      new webpack.optimize.UglifyJsPlugin()
    ]
  }
}