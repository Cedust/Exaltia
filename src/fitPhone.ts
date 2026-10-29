/**
 * Some phones lay the page out 980px wide even though index.html asks for the device width (for example a
 * Pixel whose browser treats it as a desktop, which the installed app inherits). Everything then renders far
 * too small, with empty margins beside the narrower screens.
 *
 * First ask again with the screen's width in pixels. If the browser still lays out much wider than the screen,
 * grow the root font size by the same factor: type, spacing and tap targets are all in rem, so the page then
 * looks as it would at the screen's real width.
 */
const tooWide = () => navigator.maxTouchPoints > 0 && window.innerWidth > window.screen.width * 1.3

export function fitPhone() {
  const html = document.documentElement
  // Phone layout (edge to edge, larger scale) goes by the screen, not by the layout width, which may be 980px.
  const phone = navigator.maxTouchPoints > 0 && Math.min(window.screen.width, window.screen.height) < 640
  html.classList.toggle('phone', phone)
  if (!tooWide()) return
  document.querySelector('meta[name="viewport"]')?.setAttribute('content', `width=${window.screen.width}, initial-scale=1, viewport-fit=cover`)
  const apply = () => {
    html.style.removeProperty('font-size')
    delete html.dataset.fitScale
    if (!tooWide()) return
    const scale = window.innerWidth / window.screen.width
    html.style.fontSize = `${(phone ? 112.5 : 100) * scale}%`
    html.dataset.fitScale = scale.toFixed(2)
  }
  requestAnimationFrame(apply)
  window.addEventListener('resize', apply)
}
