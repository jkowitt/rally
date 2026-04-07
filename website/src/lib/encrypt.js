// Simple encryption for stored data (PDF base64, etc)
// Uses Web Crypto API with AES-GCM

const ENCRYPTION_KEY = 'loud-legacy-2024-contract-storage'

async function getKey() {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(ENCRYPTION_KEY), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: enc.encode('ll-salt'), iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encryptData(plaintext) {
  try {
    const key = await getKey()
    const enc = new TextEncoder()
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext))
    // Combine IV + encrypted data as base64
    const combined = new Uint8Array(iv.length + encrypted.byteLength)
    combined.set(iv)
    combined.set(new Uint8Array(encrypted), iv.length)
    return btoa(String.fromCharCode(...combined))
  } catch {
    return plaintext // fallback: store unencrypted if crypto fails
  }
}

export async function decryptData(ciphertext) {
  try {
    // Check if it's actually encrypted (starts with base64 of IV)
    if (!ciphertext || ciphertext.startsWith('data:') || ciphertext.startsWith('/') || ciphertext.startsWith('JVB')) {
      return ciphertext // not encrypted, return as-is (raw base64 PDF)
    }
    const key = await getKey()
    const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0))
    const iv = combined.slice(0, 12)
    const data = combined.slice(12)
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data)
    return new TextDecoder().decode(decrypted)
  } catch {
    return ciphertext // if decryption fails, assume it's not encrypted
  }
}
