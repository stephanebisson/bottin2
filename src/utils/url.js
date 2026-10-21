/**
 * Ensure a URL has an http(s):// protocol, so a bare "example.com" links out instead of to a relative path
 */
export function ensureHttps (url) {
  if (!url) {
    return ''
  }
  const urlStr = url.toString().trim()
  if (/^https?:\/\//i.test(urlStr)) {
    return urlStr
  }
  return `https://${urlStr}`
}
