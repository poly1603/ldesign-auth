/**
 * 网络相关错误类
 */

import { AuthError } from './AuthError'
import { AuthErrorCode } from './codes'

/**
 * 网络错误类
 *
 * @example
 * ```typescript
 * throw new NetworkError('网络连接失败', AuthErrorCode.CONNECTION_FAILED)
 * ```
 */
export class NetworkError extends AuthError {
  /**
   * HTTP 状态码（如果有）
   */
  public readonly statusCode?: number

  /**
   * 请求 URL（如果有）
   */
  public readonly url?: string

  constructor(
    message: string,
    code: AuthErrorCode = AuthErrorCode.NETWORK_ERROR,
    cause?: Error,
    details?: Record<string, any>,
    statusCode?: number,
    url?: string,
  ) {
    super(message, code, cause, details)
    this.name = 'NetworkError'
    this.statusCode = statusCode
    this.url = url
    Object.setPrototypeOf(this, NetworkError.prototype)
  }

  /**
   * 创建请求超时错误
   *
   * @param timeout - 超时时间（毫秒）
   * @param url - 请求 URL
   * @returns NetworkError 实例
   */
  static timeout(timeout: number, url?: string): NetworkError {
    return new NetworkError(
      '请求超时',
      AuthErrorCode.REQUEST_TIMEOUT,
      undefined,
      { timeout },
      undefined,
      url,
    )
  }

  /**
   * 创建服务器错误
   *
   * @param statusCode - HTTP 状态码
   * @param url - 请求 URL
   * @param message - 错误消息
   * @returns NetworkError 实例
   */
  static serverError(statusCode: number, url?: string, message?: string): NetworkError {
    return new NetworkError(
      message || '服务器错误',
      AuthErrorCode.SERVER_ERROR,
      undefined,
      { statusCode },
      statusCode,
      url,
    )
  }

  /**
   * 创建连接失败错误
   *
   * @param cause - 原始错误
   * @param url - 请求 URL
   * @returns NetworkError 实例
   */
  static connectionFailed(cause?: Error, url?: string): NetworkError {
    return new NetworkError(
      '连接失败',
      AuthErrorCode.CONNECTION_FAILED,
      cause,
      undefined,
      undefined,
      url,
    )
  }

  /**
   * 转换为 JSON 格式
   *
   * @returns JSON 对象
   */
  override toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      statusCode: this.statusCode,
      url: this.url,
    }
  }
}


