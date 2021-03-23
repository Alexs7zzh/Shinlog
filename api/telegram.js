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
  const content = req.body.content
  let notification = false
  if (req.body.notification) notification = req.body.notification == true
  
  telegram(content, notification)
    .then(() => {
      res.status(200).send()
    })
}

