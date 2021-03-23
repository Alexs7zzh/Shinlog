const axios = require('axios')
/* global process */
const telegram = async (content, notification = false) =>
  axios.post(`https://api.telegram.org/bot${process.env.telegram_token}/sendMessage`, {
    chat_id: process.env.telegram_chat_id,
    text: content,
    disable_notification: notification,
    parse_mode: 'markdown',
    disable_web_page_preview: true
  })

module.exports = (req, res) => {
  const name = req.body.pusher.name
  if (name === 'Alexs7zzh') {
    res.status(200).send()
    return
  }
  const content = `*${req.body.repository.name}*

Commits:
${req.body.commits.map(i => `- ${i.message}\n`)}`
  
  telegram(content)
    .then(() => {
      res.status(200).send()
    })
}