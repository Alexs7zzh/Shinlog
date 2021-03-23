const csso = require('csso')
const { Transform } = require('stream')
const PluginError = require('plugin-error')

/* global Buffer */
module.exports = options => {
  const stream = new Transform({ objectMode: true })

  stream._transform = (file, encoding, cb) => {
    if (file.isNull()) return cb(null, file)

    if (options === undefined || typeof options === 'boolean') 
      options = { restructure: !options }

    const inputFile = file.relative
    const source = String(file.contents)
    const cssoOptions = Object.assign({
      restructure: true,
      debug: false
    }, options, { filename: inputFile })

    try {
      const result = csso.minify(source, cssoOptions)

      file.contents = new Buffer.from(result.css)
      cb(null, file)
    } catch (error) {
      this.emit('error', new PluginError('gulp-csso', error, { showStack: true }))
    }
  }

  return stream
}