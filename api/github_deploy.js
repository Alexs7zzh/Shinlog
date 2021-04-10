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

const capitalize = s => {
  if (typeof s !== 'string') return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}

module.exports = (req, res) => {
  const status = req.body.deployment_status
  if (status.state === 'pending') {
    res.status(200).send()
    return
  }
  
  const notification = status.state === 'success'
  const content = `*${capitalize(status.state)}*  
${status.description}.  
${status.target_url.includes('shinlog') ? 'https://shinlog.me' : 'https://charlsy.me'}`
  
  telegram(content, notification)
    .then(() => {
      res.status(200).send()
    })
}