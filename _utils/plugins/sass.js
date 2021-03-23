const { dest, src } = require('vinyl-fs')
const postcss = require('gulp-postcss')
const autoprefixer = require('autoprefixer')
const csso = require('./gulp-csso')
const { sassSync } = require('@mr-hope/gulp-sass')
const through2 = require('through2')

/* global process */
const compile = () => {
  src('_includes/css/*.{scss,sass}')
    .pipe(sassSync().on('error', sassSync.logError))
    .pipe(process.env.ELEVENTY_ENV ? postcss([autoprefixer()]) : through2.obj())
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