const md5 = require('md5')
const { basename, extname } = require('path')
const fs = require('fs')
const fg = require('fast-glob')
const sass = require('sass')
const csso = require('csso')
const autoprefixer = require('autoprefixer')
const postcss = require('postcss')

let result = {}

const compile = async () => {
  const files = await fg('src/scss/[!_]*.{scss,sass}')

  for (const entry of files) {
    const ext = extname(entry)
    const name = basename(entry, ext)
    
    let { css } = sass.compile(entry)

    if (process.env.PRODUCTION) {
      css = postcss([autoprefixer]).process(css).css
      css = csso.minify(css, {
        sourceMap: false,
        restructure: true,
        forceMediaMerge: false
      }).css
      const hash = md5(css).slice(0, 10)
      result[name + '.css'] = `${name}-${hash}.css`
    } else
      result[name + '.css'] = `${name}.css`
    
    try {
      fs.mkdirSync('_site/')
    }  catch (err) {
      'nothing'
    }
    fs.writeFileSync(`_site/${result[name + '.css']}`, css) 
  }
}

module.exports = config => {
  config.on('beforeBuild', compile)

  if (!process.env.PRODUCTION) {
    config.addWatchTarget('./src/scss/')
    config.on('beforeWatch', changed => {
      if (changed === undefined) return
      changed = changed.filter(i => i.endsWith('scss') || i.endsWith('sass'))
      if(changed.length > 0) compile()
    })
  }

  config.addFilter('cssHash', filename => {
    if (result[filename]) return result[filename]
    else return filename
  })
}