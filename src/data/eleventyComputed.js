const path = require('path')

module.exports = {
  permalink: data => {
    const filePath = data.page.filePathStem
    if (path.dirname(filePath).split(path.sep)[2] == 'interludes')
      return false

    let slug = data.page.fileSlug
    if (slug === 'pages') return '/'
    if (/^\d+-/.test(slug)) slug = slug.replace(/^\d+-/, '')
    if (slug.endsWith('-ja') || slug.endsWith('-zh')) return `/${slug.replace(/-(zh|ja)$/, '')}/${slug.slice(-2)}/`
    return `/${slug}/`
  },
  alternative: data => {
    if (typeof data.alternative !== 'object') return
    const base = data.page.url.replace(/(zh|ja)\/$/, '')
    return data.alternative.map(i => {
      if (i === 'en') return [i, base]
      else return [i, `${base}${i}/`]
    })
  }
}
