const fg = require('fast-glob')
const fs = require('fs-extra')
const matter = require('gray-matter')
const util = require('util')
const md5 = require('md5')
const Path = require('path')
const exec = util.promisify(require('child_process').exec)

let zh = '',
  jp = ''
let range = []
for (let i = 33; i <= 126; i++) 
  range.push(i)

const basic = String.fromCharCode.apply(this, range) + String.fromCharCode(11834) + '一二三四五六七八九十'

const loadChar = async () => {
  await Promise.all([exec('rm assets/SourceHanSerifCN/*'), exec('rm assets/SourceHanSerifJP/*')])
  
  const entries = await fg('!(node_modules)/**/*.md')
  for (const entry of entries) {
    const content = await fs.readFile(entry, 'utf-8')
    let post
    try {
      post = matter(content)
    } catch (e) {
      console.warn(e)
    }
    if (post.data.lang) {
      if (post.data.lang === 'zh' || post.data.lang.includes('zh')) {
        let str = ''
        if (post.data.title) str = str.concat(post.data.title)
        if (post.data.description) str = str.concat(post.data.description)
        str = str.concat(post.content)
        zh = zh.concat(str)
      }
      if (post.data.lang === 'ja' || post.data.lang.includes('ja')) {
        let str = ''
        if (post.data.title) str = str.concat(post.data.title)
        if (post.data.description) str = str.concat(post.data.description)
        str = str.concat(post.content)
        jp = jp.concat(str)
      }
    }
  }

  zh = (basic + zh)
    .split('')
    .filter((value, index, self) => self.indexOf(value) === index)
    .map(ch => 'U+' + ch.charCodeAt().toString(16).padStart(4, '0'))
    .join(',')

  jp = (basic + jp)
    .split('')
    .filter((value, index, self) => self.indexOf(value) === index)
    .map(ch => 'U+' + ch.charCodeAt().toString(16).padStart(4, '0'))
    .join(',')

  const layout = 'vrt2,ccmp,locl,vert,vkrn,kern,liga,jp78,jp83,jp90,nlck,palt'
  let commands = ['CN', 'JP']
    .map(lang =>
      ['woff', 'woff2'].map(format =>
        exec(
          `pyftsubset "fonts/SourceHanSerif${lang}.ttf" --output-file="assets/SourceHanSerif${lang}/SourceHanSerif${lang}.${format}" --flavor=${format} --layout-features="${layout}" --unicodes="${
            lang == 'CN' ? zh : jp
          }" --no-hinting --desubroutinize`
        )
      )
    )
    .flat()

  await Promise.all(commands)
}

const parsePath = path => {
  const extname = Path.extname(path)
  return {
    dirname: Path.dirname(path),
    basename: Path.basename(path, extname),
    extname: extname
  }
}

const addHash = async () => {
  let map = []
  const fonts = await fg('assets/**/*.{woff,woff2}')
  for (const entry of fonts) {
    const content = await fs.readFile(entry, 'utf-8')
    let parsedPath = parsePath(entry)
    
    if (parsedPath.basename.split('.').length > 1)
      parsedPath.basename = parsedPath.basename.split('.')[0]

    const hash = '.' + md5(content)
    const path = Path.join(parsedPath.dirname, parsedPath.basename + hash + parsedPath.extname)

    fs.rename(entry, path)
    map.push([parsedPath.basename + parsedPath.extname, parsedPath.basename + hash + parsedPath.extname])
  }
  
  // make sure xx.woff2 appears before xx.woff so that when replacing .woff2 won't be replaced by .woff
  map.sort((a, b) => b[0].localeCompare(a[0]))
  
  const files = ['_includes/components/preload.njk', '_includes/css/_fonts.scss']
  files.forEach(async file => {
    let content = await fs.readFile(file, 'utf-8')
    for (const key of map) {
      const reg = new RegExp(key[0], 'g')
      content = content.replace(reg, key[1])
    }
    fs.writeFile(file, content)
  })
}

loadChar().then(() => {
  addHash()
})

