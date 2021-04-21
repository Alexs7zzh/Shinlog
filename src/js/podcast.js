import Player from './shikwasa.js'

const el = document.getElementsByClassName('podcast')[0]
new Player({
  container: () => el,
  audio: {
    title: el.dataset.title,
    src: el.dataset.src
  }
})