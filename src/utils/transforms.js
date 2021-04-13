const { parseHTML } = require('linkedom')

const addEnd = document => {
  const ele = document.querySelector('main > sidenote-container-element:not(.noend) > p:last-of-type')
  if (ele === null) return
  const end = document.createElement('span')
  end.textContent = '❧'
  end.className = 'end'
  end.lang = 'en'
  ele.appendChild(end)
}

module.exports = config => {
  config.addTransform('transform', (content, outputPath) => {
    if (outputPath && outputPath.endsWith('.html')) {
      let { document } = parseHTML(content)
      
      addEnd(document)
      
      if (process.env.ELEVENTY_ENV)
        require('./plugins/picture')(document, {
          sizes: '(max-width: 600px) 100vw, (max-width: 1500px) 52vw, 780px'
        })

      return `<!DOCTYPE html>${document.documentElement.outerHTML}`
    }
    return content
  })
  
  /* global process */
  if (process.env.ELEVENTY_ENV) {
    const minify = require('html-minifier').minify
    config.addTransform('minifyHtml', (content, outputPath) => {
      if (outputPath && outputPath.endsWith('.html')) 
        content = minify(content, {
          removeAttributeQuotes: true,
          collapseBooleanAttributes: true,
          collapseWhitespace: true,
          removeComments: true,
          sortClassName: true,
          sortAttributes: true,
          html5: true,
          decodeEntities: true,
          minifyJS: true
        })
      
      return content
    })
  }
}
