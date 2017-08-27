const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')

module.exports = {
  generateTemplates: function (entry, htmlPath, isProduction) {
    const plugins = []
    Object.keys(entry).map(function (entryName) {
      if (entryName !== 'vendor') {
        let htmlName = entryName + '.html'
        plugins.push(new HtmlWebpackPlugin({
          hash: isProduction,
          filename: path.join(htmlPath, htmlName),
          template: 'src/templates/' + htmlName,
          chunks: ['manifest', 'vendor', entryName]
        }))
      }
    })
    return plugins
  }
}
