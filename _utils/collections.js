const { DateTime } = require('luxon')
const path = require('path')

module.exports = config => {
  config.addCollection('home', collectionApi => {
    let posts = collectionApi.getFilteredByGlob('posts/**/*.md')
    let ancestryMap = {}
    
    posts.forEach(post => {
      if (post.filePathStem.endsWith('-ja') || post.filePathStem.endsWith('-zh')) return
      const filePath = post.filePathStem.replace('/posts/', '')
      let parents = path.dirname(filePath).split(path.sep)
      let current = ancestryMap
      while (parents.length !== 0) {
        const node = parents.shift()
        if (parents.length !== 0) {
          if (current[node] === undefined) current[node] = {}
          current = current[node]
        } else {
          if (current[node] === undefined) current[node] = []
          current[node].push(post)
        }
      }
    })

    const sortIndex = dictionary => {
      if (Array.isArray(dictionary))
        if (/^\d+-/.test(dictionary[0].fileSlug))
          return dictionary.sort((a, b) => a.fileSlug.localeCompare(b.fileSlug))
        else
          return dictionary.sort((a, b) => (a.date - b.date))

      return Object.keys(dictionary)
        .sort()
        .map(key => ({
          title: key.replace(/^\d+-/, ''),
          children: sortIndex(dictionary[key]),
        }))
    }

    return sortIndex(ancestryMap)
  })

  config.addCollection('interludes', collectionApi => {
    return collectionApi.getFilteredByGlob('interludes/*.md')
  })

  config.addCollection('interludesByYear', collection => {
    let yearSet = new Set()
    let posts = collection.getFilteredByGlob('interludes/*.md')
    posts.forEach(item => {
      yearSet.add(DateTime.fromJSDate(item.date).year)
    })
    const res = [...yearSet]
      .sort((a, b) => {
        return a - b
      })
      .map(year => [
        year,
        posts
          .filter(item => DateTime.fromJSDate(item.date).year == year)
          .sort((a, b) => {
            return a.date - b.date
          }),
      ])
    return res
  })
}
