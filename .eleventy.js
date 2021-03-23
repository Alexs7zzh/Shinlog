const addPlugins = require('./_utils/plugins')
const addFilters = require('./_utils/filters')
const addTransforms = require('./_utils/transforms')
const addShortcodes = require('./_utils/shortcodes')
const addCollections = require('./_utils/collections')
const markdown = require('./_utils/markdown')

module.exports = config => {
  addPlugins(config)
  addFilters(config)
  addTransforms(config)
  addShortcodes(config)
  addCollections(config)

  config.setDataDeepMerge(true)
  config.setLibrary('md', markdown)
  config.addPassthroughCopy('assets')
  config.setTemplateFormats('md,njk')

  config.setBrowserSyncConfig({
    ui: false,
    ghostMode: false
  })
}
