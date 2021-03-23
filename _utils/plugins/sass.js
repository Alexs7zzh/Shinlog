const { dest, src } = require('vinyl-fs')
const through2 = require('through2')
const csso = require('./gulp-csso')
const { sassSync } = require('@mr-hope/gulp-sass')

/* global process */
const compile = () => {
  src('_includes/css/*.{scss,sass}')
    .pipe(sassSync().on('error', sassSync.logError))
    .pipe(process.env.ELEVENTY_ENV ? csso({
      sourceMap: false,
      restructure: true,
      forceMediaMerge: true
    }) : through2.obj())
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

module.exports = config => {
  config.on('beforeBuild', compile)
  config.on('beforeWatch', compileWatch)
}