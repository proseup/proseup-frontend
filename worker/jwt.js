/**
 * JWT utilities for Cloudflare Workers
 * Uses jose library for JWT signing/verification
 */

export async function signJWT(payload, secret, expiresIn = '7d') {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const header = { alg: 'HS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)

  const jwtPayload = {
    ...payload,
    iat: now,
    exp: now + parseExpiresIn(expiresIn)
  }

  const headerEncoded = base64UrlEncode(JSON.stringify(header))
  const payloadEncoded = base64UrlEncode(JSON.stringify(jwtPayload))

  const signatureInput = `${headerEncoded}.${payloadEncoded}`
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(signatureInput)
  )
  const signatureEncoded = base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)))

  return `${signatureInput}.${signatureEncoded}`
}

export async function verifyJWT(token, secret) {
  try {
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )

    const [headerEncoded, payloadEncoded, signatureEncoded] = token.split('.')
    const signatureInput = `${headerEncoded}.${payloadEncoded}`

    const signature = Uint8Array.from(base64UrlDecode(signatureEncoded), c => c.charCodeAt(0))

    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      signature,
      encoder.encode(signatureInput)
    )

    if (!valid) return null

    const payload = JSON.parse(base64UrlDecode(payloadEncoded))
    const now = Math.floor(Date.now() / 1000)

    if (payload.exp && payload.exp < now) return null

    return payload
  } catch (e) {
    return null
  }
}

export function parseExpiresIn(expiresIn) {
  const match = expiresIn.match(/^(\d+)([smhd])$/)
  if (!match) return 604800 // default 7 days

  const value = parseInt(match[1])
  const unit = match[2]

  switch (unit) {
    case 's': return value
    case 'm': return value * 60
    case 'h': return value * 3600
    case 'd': return value * 86400
    default: return 604800
  }
}

function base64UrlEncode(str) {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

function base64UrlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/')
  while (str.length % 4) str += '='
  return atob(str)
}
