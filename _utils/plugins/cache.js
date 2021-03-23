const fs = require('fs-extra')
const fg = require('fast-glob')
const md5 = require('md5')
const Path = require('path')

const parsePath = path => {
  const extname = Path.extname(path)
  return {
    dirname: Path.dirname(path),
    basename: Path.basename(path, extname),
    extname: extname
  }
}

const afterBuild = async () => {
  const css = await fg('_site/**/*.css')
  let map = {}

  for (const entry of css) {
    const content = await fs.readFile(entry, 'utf-8')
    const parsedPath = parsePath(entry)

    const hash = '.' + md5(content)
    const path = Path.join(parsedPath.dirname, parsedPath.basename + hash + parsedPath.extname)

    fs.rename(entry, path)
    map[entry.replace('_site/','')] = path.replace('_site/','')
  }

  const html = await fg('_site/**/*.html')
  for (const entry of html) {
    let content = await fs.readFile(entry, 'utf-8')
    for (const key in map) {
      const reg = new RegExp(key, 'g')
      content = content.replace(reg, map[key])
    }
    fs.writeFile(entry, content)
  }
}

module.exports = config => {
  /* global process */
  if (process.env.ELEVENTY_ENV)
    config.on('afterBuild', afterBuild)
}