const util = require('util')
const { DateTime } = require('luxon')
const md = require('./markdown')
const removeMd = require('remove-markdown')
const fs = require('fs-extra')
/* global process */
module.exports = config => {
  config.addFilter('readableDate', dateObj => {
    return DateTime.fromJSDate(dateObj).toFormat('DDD')
  })
  config.addFilter('shortDate', dateObj => {
    return DateTime.fromJSDate(dateObj).toFormat('MM/dd')
  })
  config.addFilter('htmlDateString', dateObj => {
    return DateTime.fromJSDate(dateObj).toFormat('yyyy-LL-dd')
  })

  config.addFilter('console', data => util.inspect(data))
  config.addFilter('markdown', data => md.renderInline(data).toString())
  config.addFilter('removeMarkdown', data => removeMd(data.replace(/"/g, '\'')))
  config.addFilter('classToString', classes => classes.map(c => ' ' + c).join(''))
  config.addFilter('js', file => {
    const data = fs.readFileSync(`src/js/${file}`, (err, contents) => {
      if (err) throw new Error(err)
      return contents
    })
    return data.toString('utf8')
  })
  config.addNunjucksAsyncFilter('jsmin', async (code, callback) => {
    if (process.env.ELEVENTY_ENV)
      try {
        const { minify } = require('terser')
        const minified = await minify(code, { toplevel: true })
        callback(null, minified.code)
      } catch (err) {
        console.error('Terser error: ', err)
        callback(null, code)
      }
    else
      callback(null, code)
  })

  config.addFilter('getItem', (collection, page) => getCollectionItem(collection, page))
  const getCollectionItem = (collection, page) => {
    collection = collection.flat()
    let j = 0
    let index
    for (let item of collection) {
      if (item.inputPath === page.inputPath && item.outputPath === page.outputPath) {
        index = j
        break
      }
      j++
    }

    if (index !== undefined && collection && collection.length) 
      return collection[index]
    
  }
}
