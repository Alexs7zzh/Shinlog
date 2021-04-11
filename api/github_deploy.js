const axios = require('axios')
/* global process */
const telegram = async (content, notification = false, me = true) =>
  axios.post(`https://api.telegram.org/bot${process.env.telegram_token}/sendMessage`, {
    chat_id: me ? process.env.telegram_chat_id : process.env.telegram_chat_id_jesse,
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
  
  telegram(content, notification, false)
  telegram(content, notification)
    .then(() => {
      res.status(200).send()
    })
}