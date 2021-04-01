const md = require('./markdown')

module.exports = config => {
  config.addPairedShortcode('aside', content => {
    return `<aside>${md.render(content.trim()).toString()}</aside>`
  })
  config.addPairedShortcode('note', content => {
    return `<div class="note">${md.render(content.trim()).toString()}</div>`
  })
}
