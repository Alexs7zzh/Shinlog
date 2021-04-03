import './sidenote.js'

if(document.querySelector('.podcast') !== null)
  import('./podcast.js').then(({ default: Shikwasa }) => {
    const el = document.querySelector('.podcast')
    new Shikwasa({
      container: () => el,
      audio: {
        title: el.dataset.title,
        src: el.dataset.src
      }
    })
  })
