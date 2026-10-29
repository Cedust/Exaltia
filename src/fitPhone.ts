/**
 * Phone layout (edge to edge, larger scale) goes by the screen, not by the layout width: html.phone is set on
 * touch devices whose short screen side is under 640px.
 */
export function fitPhone() {
  const phone = navigator.maxTouchPoints > 0 && Math.min(window.screen.width, window.screen.height) < 640
  document.documentElement.classList.toggle('phone', phone)
}
