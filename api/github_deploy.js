const fetch = require('node-fetch')
/* global process */
const telegram = async (content, notification = false) =>
  fetch(`https://api.telegram.org/bot${process.env.telegram_token}/sendMessage`, {
    method: 'post',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      chat_id: process.env.telegram_chat_id,
      text: content,
      disable_notification: notification,
      parse_mode: 'markdown',
      disable_web_page_preview: true
    })
  })

const capitalize = s => {
  if (typeof s !== 'string') return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}

module.exports = (req, res) => {
  const status = req.body.deployment_status
  if (status.state === 'pending')
    return res.status(200).send()
  
  let url = ''
  if (status.target_url.includes('shinlog')) url = 'https://shinlog.me'
  if (status.target_url.includes('charlsy')) url = 'https://charlsy.me'
  if (status.target_url.includes('jesse'))   url = 'https://jesor.me'
  
  const notification = status.state === 'success'
  const content = `*${capitalize(status.state)}*  
${status.description}.  
${url}`
  
  telegram(content, notification)
    .then(() => {
      res.status(200).send()
    })
}