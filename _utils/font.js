const fg = require('fast-glob')
const fs = require('fs-extra')
const matter = require('gray-matter')
const util = require('util')
const exec = util.promisify(require('child_process').exec)

let zh = '',
  jp = ''
let range = []
for (let i = 33; i <= 126; i++) 
  range.push(i)

const basic = String.fromCharCode.apply(this, range) + String.fromCharCode(11834) + '一二三四五六七八九十'

const loadChar = async () => {
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

  Promise.all(commands)
}

loadChar()
