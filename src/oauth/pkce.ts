/**
 * PKCE (Proof Key for Code Exchange) 实现
 *
 * 使用 @ldesign/crypto 提供加密功能
 */

import type { PKCEChallenge } from './types'

/**
 * 生成 PKCE Challenge
 *
 * @param method - Challenge 方法（S256 或 plain）
 * @returns PKCE Challenge
 *
 * @example
 * ```typescript
 * const pkce = await generatePKCE('S256')
 * console.log('Code Verifier:', pkce.codeVerifier)
 * console.log('Code Challenge:', pkce.codeChallenge)
 * ```
 */
export async function generatePKCE(
  method: 'S256' | 'plain' = 'S256',
): Promise<PKCEChallenge> {
  // 生成 code verifier (43-128 个字符)
  const codeVerifier = generateCodeVerifier()

  // 生成 code challenge
  const codeChallenge = method === 'S256'
    ? await generateCodeChallengeS256(codeVerifier)
    : codeVerifier

  return {
    codeVerifier,
    codeChallenge,
    codeChallengeMethod: method,
  }
}

/**
 * 生成 Code Verifier
 *
 * 使用 URL 安全的 Base64 编码的随机字符串
 * 长度: 43-128 个字符
 *
 * @returns Code Verifier
 * @private
 */
function generateCodeVerifier(): string {
  const length = 128
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  const randomValues = new Uint8Array(length)

  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(randomValues)
  }
  else {
    // Fallback for Node.js
    for (let i = 0; i < length; i++) {
      randomValues[i] = Math.floor(Math.random() * 256)
    }
  }

  let result = ''
  for (let i = 0; i < length; i++) {
    result += charset[randomValues[i] % charset.length]
  }

  return result
}

/**
 * 生成 Code Challenge (S256 方法)
 *
 * 使用 SHA-256 哈希并 Base64URL 编码
 *
 * @param codeVerifier - Code Verifier
 * @returns Code Challenge
 * @private
 */
async function generateCodeChallengeS256(codeVerifier: string): Promise<string> {
  // 使用 Web Crypto API
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder()
    const data = encoder.encode(codeVerifier)
    const hash = await crypto.subtle.digest('SHA-256', data)
    return base64URLEncode(hash)
  }

  // Fallback: 如果可用，使用 @ldesign/crypto
  try {
    const { hash } = await import('@ldesign/crypto')
    const hashResult = hash.sha256(codeVerifier)
    return base64URLEncode(hexToArrayBuffer(hashResult))
  }
  catch {
    // 如果都不可用，返回 plain
    console.warn('[PKCE] SHA-256 not available, falling back to plain method')
    return codeVerifier
  }
}

/**
 * Base64URL 编码
 *
 * @param buffer - ArrayBuffer
 * @returns Base64URL 编码的字符串
 * @private
 */
function base64URLEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }

  const base64 = typeof btoa !== 'undefined'
    ? btoa(binary)
    : Buffer.from(binary, 'binary').toString('base64')

  // Base64 转 Base64URL
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

/**
 * 十六进制字符串转 ArrayBuffer
 *
 * @param hex - 十六进制字符串
 * @returns ArrayBuffer
 * @private
 */
function hexToArrayBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = Number.parseInt(hex.substr(i, 2), 16)
  }
  return bytes.buffer
}

/**
 * 验证 PKCE
 *
 * @param codeVerifier - Code Verifier
 * @param codeChallenge - Code Challenge
 * @param method - Challenge 方法
 * @returns 是否验证通过
 *
 * @example
 * ```typescript
 * const isValid = await verifyPKCE(
 *   verifier,
 *   challenge,
 *   'S256',
 * )
 * ```
 */
export async function verifyPKCE(
  codeVerifier: string,
  codeChallenge: string,
  method: 'S256' | 'plain' = 'S256',
): Promise<boolean> {
  if (method === 'plain') {
    return codeVerifier === codeChallenge
  }

  const computedChallenge = await generateCodeChallengeS256(codeVerifier)
  return computedChallenge === codeChallenge
}

