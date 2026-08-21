import { SignJWT, importPKCS8 } from 'npm:jose@5'
import type { Credentials } from './config.ts'

const ALG = 'RS256'
const MAX_TTL_SECONDS = 300

let cachedKeyPem: string | null = null
let cachedKey: CryptoKey | null = null

/** Firma el JWT de autenticación de Enable Banking (RS256, `kid` = App ID). */
export async function mintRequestToken(creds: Credentials): Promise<string> {
  if (cachedKeyPem !== creds.privateKeyPem) {
    cachedKey = await importPKCS8(creds.privateKeyPem, ALG)
    cachedKeyPem = creds.privateKeyPem
  }

  const now = Math.floor(Date.now() / 1000)
  return new SignJWT({})
    .setProtectedHeader({ typ: 'JWT', alg: ALG, kid: creds.appId })
    .setIssuer('enablebanking.com')
    .setAudience('api.enablebanking.com')
    .setIssuedAt(now)
    .setExpirationTime(now + MAX_TTL_SECONDS)
    .sign(cachedKey!)
}
