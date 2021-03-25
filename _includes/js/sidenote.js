class SidenoteContainerElement extends HTMLElement {
  constructor() {
    super()
    
    this.refs          = this.querySelectorAll('sup')
    this.footnotes     = this.querySelectorAll('.footnotes li')
    
    if (this.footnotes.length === 0) return
    
    this.refPrefix     = this.getAttribute('ref-prefix') || 'fnref-'
    this.notePrefix    = this.getAttribute('note-prefix') || 'fn-'
    this.afterElements = this.getAttribute('after-elements') || ''
    
    this.calculateSidenotesPos = this.calculateSidenotesPos.bind(this)
    this.ro = new ResizeObserver(this.calculateSidenotesPos)
  }
  
  connectedCallback() {
    this.setAttribute('role', 'article')
    
    if (this.footnotes.length === 0) return
    this.calculateSidenotesPos()
    
    this.ro.observe(this)
  }
  
  disconnectedCallback() {
    if (this.footnotes.length === 0) return
    this.ro.disconnect()
  }
  
  solveFor(el, currentTop, parentTop) {
    const previousEl = el.previousElementSibling
    const previousElBottom = previousEl.getBoundingClientRect().bottom - parentTop
  
    if (currentTop < previousElBottom) return previousElBottom
    else return currentTop
  }
  
  calculateSidenotesPos() {
    for (const el of this.footnotes) {
      const id = el.getAttribute('id').replace(this.notePrefix, '')
      let ref = [...this.refs].filter(i => i.getAttribute('id').replace(this.refPrefix, '') === id)
      
      if (ref.length > 1) {
        console.error(`Find multiple sidenote references for sidenote id:${el.getAttribute('id')}`)
        continue
      }
      if (ref.length === 0) {
        console.error(`Cannot find any sidenote reference for sidenote id:${el.getAttribute('id')}`)
        continue
      }
      
      ref = ref[0]
      
      const containerTop = this.getBoundingClientRect().top
      let top = Math.round(ref.getBoundingClientRect().top - containerTop)

      if (el.previousElementSibling)
        top = this.solveFor(el, top, containerTop)
      else {
        let startPos = 0
        
        if (this.afterElements.length !== 0)
          startPos = Math.max(...Array.from(this.querySelectorAll(this.afterElements))
            .map(i => i.getBoundingClientRect().bottom))
            
        if (top < startPos - containerTop)
          top = Math.round(startPos - containerTop)
      }

      el.style.top = `${top}px`
      el.style.opacity = 1
    }
  }
  
}

window.customElements.define('sidenote-container-element', SidenoteContainerElement)