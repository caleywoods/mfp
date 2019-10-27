const path = require('path');

module.exports = {
  devtool: 'inline-source-map',
  entry: './src/js/app.js',
  output: {
    path: path.resolve(__dirname, 'dist/js'),
    filename: 'app.js'
  }
};