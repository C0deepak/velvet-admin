import crypto from 'node:crypto'

export function base64Decoder(encodedStr: string): Buffer {
  return Buffer.from(encodedStr, 'base64')
}

function getAESKey(): Buffer {
  const keyBase64 = process.env.NEXT_PUBLIC_AES_KEY_BASE64
  if (!keyBase64) {
    throw new Error('NEXT_PUBLIC_AES_KEY_BASE64 environment variable is not set')
  }

  const key = base64Decoder(keyBase64)
  if (key.length !== 32) {
    throw new Error('AES key must be 32 bytes (256 bits) after base64 decode')
  }
  return key
}

export function aesEncoder(plaintext: string): string {
  const key = getAESKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)

  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf-8'), cipher.final()])

  const authTag = cipher.getAuthTag()
  const encrypted = Buffer.concat([iv, ciphertext, authTag])
  return encrypted.toString('base64')
}

export function aesDecoder(encryptedData: string): string {
  const key = getAESKey()
  const decipherInput = base64Decoder(encryptedData)

  const ivLength = 12
  const authTagLength = 16
  const iv = decipherInput.subarray(0, ivLength)
  const authTag = decipherInput.subarray(-authTagLength)
  const ciphertext = decipherInput.subarray(ivLength, -authTagLength)

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf-8')
}
