const Image = require('@11ty/eleventy-img')

const defaultOptions = {
  widths: [640, 768, 1280, 1366, 1600, 1920],
  sizes: '',
  formats: ['webp', 'jpeg'],
  urlPath: '/',
  outputDir: './_site/'
}

module.exports = (document, options) => {
  options = Object.assign({}, defaultOptions, options)
  
  if (options.sizes.length === 0) throw new Error('"sizes" for the picture plugin is not defined.')
  
  const images = [...document.querySelectorAll('figure img')]
  
  images.forEach(i => {
    const src = './assets' + i.getAttribute('src')
    
    Image(src, options)
    const meta = Image.statsSync(src, options)
    
    const last = meta.jpeg[meta.jpeg.length - 1]
    i.setAttribute('width', last.width)
    i.setAttribute('height', last.height)
    i.setAttribute('loading', 'lazy')
    i.setAttribute('decoding', 'async')
    
    i.outerHTML = `
    <picture>
      <source type="image/webp" sizes="${options.sizes}" srcset="${meta.webp.map(p => p.srcset).join(', ')}">
      <source type="image/jpeg" sizes="${options.sizes}" srcset="${meta.jpeg.map(p => p.srcset).join(', ')}">
      ${i.outerHTML}
    </picture>`
  })

}