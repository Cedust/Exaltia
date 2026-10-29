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
  // Only touch the root font size when the factor really changes. Resetting it first (even for a moment) shrinks
  // the page, the browser clamps every scroll position to the shorter content, and lists jump back to the top;
  // phones fire resize often (URL bar, keyboard), so that happened while scrolling.
  let applied = ''
  const apply = () => {
    const scale = tooWide() ? window.innerWidth / window.screen.width : 1
    const value = scale === 1 ? '' : `${(phone ? 112.5 : 100) * scale}%`
    if (value === applied) return
    applied = value
    if (value) html.style.fontSize = value
    else html.style.removeProperty('font-size')
    if (value) html.dataset.fitScale = scale.toFixed(2)
    else delete html.dataset.fitScale
  }
  requestAnimationFrame(apply)
  window.addEventListener('resize', apply)
}
