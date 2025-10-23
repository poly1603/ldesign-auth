/**
 * JWT 类型定义
 */

/**
 * JWT Header
 */
export interface JWTHeader {
  /**
   * 算法类型
   */
  alg: string

  /**
   * Token 类型
   */
  typ: string

  /**
   * 密钥 ID（可选）
   */
  kid?: string
}

/**
 * JWT Payload（标准声明）
 */
export interface JWTPayload {
  /**
   * 签发者
   */
  iss?: string

  /**
   * 主题（通常是用户 ID）
   */
  sub?: string

  /**
   * 受众
   */
  aud?: string | string[]

  /**
   * 过期时间（Unix 时间戳，秒）
   */
  exp?: number

  /**
   * 生效时间（Unix 时间戳，秒）
   */
  nbf?: number

  /**
   * 签发时间（Unix 时间戳，秒）
   */
  iat?: number

  /**
   * JWT ID
   */
  jti?: string

  /**
   * 自定义声明
   */
  [key: string]: any
}

/**
 * JWT 解码结果
 */
export interface DecodedJWT {
  /**
   * Header
   */
  header: JWTHeader

  /**
   * Payload
   */
  payload: JWTPayload

  /**
   * 签名
   */
  signature: string

  /**
   * 原始 Token
   */
  raw: string
}

/**
 * JWT 验证选项
 */
export interface JWTVerifyOptions {
  /**
   * 验证签名（需要密钥）
   */
  verifySignature?: boolean

  /**
   * 密钥或公钥
   */
  secret?: string

  /**
   * 算法白名单
   */
  algorithms?: string[]

  /**
   * 验证过期时间
   */
  verifyExpiry?: boolean

  /**
   * 时间容差（秒）
   */
  clockTolerance?: number

  /**
   * 验证签发者
   */
  issuer?: string

  /**
   * 验证受众
   */
  audience?: string | string[]

  /**
   * 验证主题
   */
  subject?: string
}

/**
 * JWT 验证结果
 */
export interface JWTVerifyResult {
  /**
   * 是否有效
   */
  valid: boolean

  /**
   * 解码的 JWT
   */
  decoded?: DecodedJWT

  /**
   * 错误信息
   */
  error?: string

  /**
   * 错误代码
   */
  errorCode?: string
}


