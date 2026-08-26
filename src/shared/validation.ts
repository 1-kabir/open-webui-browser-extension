export function normalizeConnectionUrl(value: string): string {
  const raw = value.trim()
  const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`
  const parsed = new URL(candidate)
  if (!['http:', 'https:'].includes(parsed.protocol))
    throw new Error('Only HTTP and HTTPS connections are supported.')
  if (parsed.username || parsed.password)
    throw new Error('Connection URLs must not contain credentials.')
  parsed.hash = ''
  return parsed.toString().replace(/\/$/, '')
}
export function assertContextText(
  text: string,
  maxLength = 100_000
): { text: string; truncated: boolean } {
  return text.length <= maxLength
    ? { text, truncated: false }
    : { text: text.slice(0, maxLength), truncated: true }
}
