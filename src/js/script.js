import './sidenote.js'
import Shikwasa from './podcast.js'

if(document.querySelector('.podcast') !== null)
  new Shikwasa({
    container: () => document.querySelector('.podcast'),
    audio: {
      title: '实体、去抽象化、与设计是什么',
      src: 'https://jiaocha.io/assets/podcasts/15.mp3'
    }
  })