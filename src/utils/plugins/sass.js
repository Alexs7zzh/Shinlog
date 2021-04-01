const { dest, src } = require('vinyl-fs')
const postcss = require('gulp-postcss')
const autoprefixer = require('autoprefixer')
const csso = require('./gulp-csso')
const { sassSync } = require('@mr-hope/gulp-sass')
const Mutex = require('async-mutex').Mutex
const { Transform } = require('stream')
const md5 = require('md5')
const { basename } = require('path')

const compile = () => {
  src('src/scss/*.{scss,sass}')
    .pipe(sassSync().on('error', sassSync.logError))
    .pipe(dest('_site/'))
}

const compileWatch = changed => {
  if (changed === undefined) return
  
  let flag = false
  changed.forEach(i => {
    if (i.endsWith('scss') || i.endsWith('sass')) {
      flag = true
      return
    }
  })
  if (!flag) return
  
  compile()
}

const build = async () => {
  let result = {}
  
  src('src/scss/*.{scss,sass}')
    .pipe(sassSync().on('error', sassSync.logError))
    .pipe(postcss([autoprefixer()]))
    .pipe(csso({
      sourceMap: false,
      restructure: true,
      forceMediaMerge: true
    }))
    .pipe((() => {
      const stream = new Transform({ objectMode: true })
    
      stream._transform = (file, encoding, cb) => {
        if (file.isNull()) return cb(null, file)
    
        const inputFile = file.relative
        const source = String(file.contents)
        
        try {
          const name = basename(inputFile, '.css')
          const hash = md5(source).slice(0, 10)
          
          result[name + '.css'] = `${name}-${hash}.css`
          file.path = file.path.replace(name + '.css', `${name}-${hash}.css`)
          
          cb(null, file)
        } catch (error) {
          console.log(error)
        }
      }
    
      return stream
    })())
    .pipe(dest('_site/'))
  
  return result
}

module.exports = config => {
  const mutex = new Mutex()
  let cssHash = {}
  /* global process */
  if (!process.env.ELEVENTY_ENV) {
    config.addWatchTarget('./src/scss/')
    config.on('beforeBuild', compile)
    config.on('beforeWatch', compileWatch)
    config.addFilter('cssHash', url => url)
  } else
    config.addNunjucksAsyncFilter('cssHash', async (url, callback) => {
      const release = await mutex.acquire()
      try {
        if (Object.keys(cssHash).length === 0)
          cssHash = await build()
      } finally {
        release()
      }
      for(let i in cssHash)
        url = url.replace(i, cssHash[i])
      callback(null, url)
    })

}