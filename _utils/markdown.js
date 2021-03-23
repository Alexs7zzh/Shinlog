const uslug = require('uslug')

module.exports = require('markdown-it')({
  html: true,
  typographer: true,
})
  .use(require('markdown-it-anchor'), {
    slugify: s => uslug(s)
  })
  .use(require('markdown-it-attrs'))
  .use(require('./markdown/footnote'))
  .use(require('./markdown/customEmphasis'))
  .use(require('./markdown/blockquote'))
  .use(require('./markdown/figure'))
  .use(require('markdown-it-wrap-alphabet'), {
    lang: 'en',
    wrapAll: true,
    shouldWrap: state => {
      const lang = state.env && state.env.lang
      if (lang === 'en') return false
      else return true
    }
  })
  .use(md => {
    md.renderer.rules.text = (tokens, index) => {
      const type1 = '、。，？！；：',
        type2 = '《》「」『』（）”“'
      const u1 = type1
        .split('')
        .map(ch => '\\u' + ch.charCodeAt().toString(16).padStart(4, '0'))
        .join('')
      const u2 = type2
        .split('')
        .map(ch => '\\u' + ch.charCodeAt().toString(16).padStart(4, '0'))
        .join('')
      const re1 = new RegExp(`([${u1}${u2}]{3,})`, 'g')
      const re2 = new RegExp(`([${u1}])([${u2}])`, 'g')
      const re3 = new RegExp(`([${u2}][${u1}]|[${u1}]{2}|[${u2}]{2})`, 'g')
      return (
        tokens[index].content &&
        tokens[index].content
          .replace(/\u2014{2}/g, '&#x2E3A;')
          .replace(re1, '<span class="halfwidth">$1</span>')
          .replace(re2, '<span class="halfwidth">$1</span>$2')
          .replace(re3, '<span class="halfwidth">$1</span>')
      )
    }
    md.renderer.rules.html_block = (tokens, index) => {
      return tokens[index].content
        .replace(/(^|[^-])---(?=[^-]|$)/gm, '$1\u2014')
        .replace(/(^|\s)--(?=\s|$)/gm, '$1\u2013')
        .replace(/(^|[^-\s])--(?=[^-\s]|$)/gm, '$1\u2013')
        .replace(/\u2014{2}/g, '&#x2E3A;')
        .replace(/\.{2,}/g, '…')
        .replace(/([?!])…/g, '$1..')
    }
  })
