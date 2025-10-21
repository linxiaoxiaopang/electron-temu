// alias.config.js
const path = require('path')
module.exports = {
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./background"),
      "~express": path.resolve(__dirname, "./background/express"),
      "~model": path.resolve(__dirname, "./background/model"),
      "~store": path.resolve(__dirname, "./background/store"),
      "~utils": path.resolve(__dirname, "./background/utils")
    }
  }
}
