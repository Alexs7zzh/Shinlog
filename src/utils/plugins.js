module.exports = config => {
  config.addPlugin(require('./plugins/sass'))
  
  /* global process */
  if (process.env.ELEVENTY_ENV) {
    config.addPlugin(require('./plugins/rollup'))
    // config.addPlugin(require('./plugins/cache-bust'))
  } else
    config.addFilter('jsHash', url => url)
}
