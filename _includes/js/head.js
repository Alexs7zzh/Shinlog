let width = window.innerWidth
document.documentElement.style.setProperty('--width', `${width}`)
window.addEventListener('resize', () => {
  let width = window.innerWidth
  document.documentElement.style.setProperty('--width', `${width}`)
})