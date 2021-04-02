const fs = require('fs')
const md5 = require('md5')
const rollup = require('rollup')
const { terser } = require('rollup-plugin-terser')
const { basename } = require('path')
const Mutex = require('async-mutex').Mutex

const bundling = async () => {
  const bundle = await rollup.rollup({
    input: 'src/js/script.js',
    plugins: [terser()]
  })
    
  const { output } = await bundle.generate({
    file: '_site/script.js',
    format: 'iife',
    plugins: []
  })
  
  let result = {}
  for (const chunkOrAsset of output)
    if (chunkOrAsset.type === 'chunk') {
      const { code, fileName } = chunkOrAsset
      const name = basename(fileName, '.js')
      const hash = md5(code).slice(0, 10)
      
      result[name + '.js'] = `${name}-${hash}.js`
      
      fs.writeFile(`_site/${name}-${hash}.js`, code, err => {
        if (err)
          console.log(`Cannot write to _site/${name}-${hash}.js`)
      })
    }

  await bundle.close()

  return result
}

module.exports = config => {
  /* global process */
  if (process.env.ELEVENTY_ENV) {
    const mutex = new Mutex()
    let jsHash = {}
    
    config.addNunjucksAsyncFilter('jsHash', async (url, callback) => {
      const release = await mutex.acquire()
      try {
        if (Object.keys(jsHash).length === 0)
          jsHash = await bundling()
      } finally {
        release()
      }
      for(let i in jsHash)
        url = url.replace(i, jsHash[i])
      callback(null, url)
    })
  } else
    config.addFilter('jsHash', url => url)
}
