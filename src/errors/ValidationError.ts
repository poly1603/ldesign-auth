/**
 * 验证相关错误类
 */

import { AuthError } from './AuthError'
import { AuthErrorCode } from './codes'

/**
 * 验证错误字段信息
 */
export interface ValidationErrorField {
  /**
   * 字段名称
   */
  field: string

  /**
   * 错误消息
   */
  message: string

  /**
   * 字段值（可选）
   */
  value?: any
}

/**
 * 验证错误类
 *
 * @example
 * ```typescript
 * throw new ValidationError('验证失败', [
 *   { field: 'email', message: '邮箱格式无效' },
 *   { field: 'password', message: '密码长度不足' },
 * ])
 * ```
 */
export class ValidationError extends AuthError {
  /**
   * 验证错误的字段列表
   */
  public readonly fields: ValidationErrorField[]

  constructor(
    message: string,
    fields: ValidationErrorField[] = [],
    code: AuthErrorCode = AuthErrorCode.VALIDATION_FAILED,
    cause?: Error,
  ) {
    super(message, code, cause, { fields })
    this.name = 'ValidationError'
    this.fields = fields
    Object.setPrototypeOf(this, ValidationError.prototype)
  }

  /**
   * 创建单个字段验证错误
   *
   * @param field - 字段名称
   * @param message - 错误消息
   * @param value - 字段值
   * @returns ValidationError 实例
   */
  static singleField(field: string, message: string, value?: any): ValidationError {
    return new ValidationError(
      message,
      [{ field, message, value }],
    )
  }

  /**
   * 创建缺少必需字段错误
   *
   * @param field - 字段名称
   * @returns ValidationError 实例
   */
  static missingField(field: string): ValidationError {
    return new ValidationError(
      `缺少必需字段: ${field}`,
      [{ field, message: '此字段为必填项' }],
      AuthErrorCode.MISSING_REQUIRED_FIELD,
    )
  }

  /**
   * 创建无效参数错误
   *
   * @param field - 字段名称
   * @param value - 字段值
   * @param reason - 无效原因
   * @returns ValidationError 实例
   */
  static invalidParameter(field: string, value: any, reason?: string): ValidationError {
    const message = reason || `参数 ${field} 无效`
    return new ValidationError(
      message,
      [{ field, message, value }],
      AuthErrorCode.INVALID_PARAMETER,
    )
  }

  /**
   * 获取第一个错误字段
   *
   * @returns 第一个错误字段，如果没有返回 undefined
   */
  getFirstField(): ValidationErrorField | undefined {
    return this.fields[0]
  }

  /**
   * 获取指定字段的错误
   *
   * @param field - 字段名称
   * @returns 字段错误，如果没有返回 undefined
   */
  getFieldError(field: string): ValidationErrorField | undefined {
    return this.fields.find(f => f.field === field)
  }

  /**
   * 转换为 JSON 格式
   *
   * @returns JSON 对象
   */
  override toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      fields: this.fields,
    }
  }
}


