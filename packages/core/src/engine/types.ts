export interface AuthEnginePluginOptions {
  dependencies?: string[]
  /** 认证配置 */
  tokenKey?: string
  refreshTokenKey?: string
}
