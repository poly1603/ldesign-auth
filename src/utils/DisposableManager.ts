/**
 * 资源销毁管理器
 *
 * 统一管理需要清理的资源（事件监听器、定时器等），防止内存泄漏
 */

/**
 * 可销毁资源类型
 */
export type Disposable = () => void

/**
 * 资源销毁管理器类
 *
 * @example
 * ```typescript
 * const disposables = new DisposableManager()
 *
 * // 添加事件监听器
 * const handler = () => console.log('click')
 * window.addEventListener('click', handler)
 * disposables.add(() => window.removeEventListener('click', handler))
 *
 * // 添加定时器
 * const timer = setInterval(() => {}, 1000)
 * disposables.add(() => clearInterval(timer))
 *
 * // 统一清理所有资源
 * disposables.dispose()
 * ```
 */
export class DisposableManager {
  private disposables: Disposable[] = []
  private isDisposed = false

  /**
   * 添加可销毁资源
   *
   * @param dispose - 销毁函数
   *
   * @example
   * ```typescript
   * const manager = new DisposableManager()
   * const timer = setTimeout(() => {}, 1000)
   * manager.add(() => clearTimeout(timer))
   * ```
   */
  add(dispose: Disposable): void {
    if (this.isDisposed) {
      console.warn('[DisposableManager] Cannot add disposable after disposal')
      // 立即执行销毁
      dispose()
      return
    }

    this.disposables.push(dispose)
  }

  /**
   * 添加多个可销毁资源
   *
   * @param disposables - 销毁函数数组
   */
  addAll(disposables: Disposable[]): void {
    disposables.forEach(d => this.add(d))
  }

  /**
   * 销毁所有资源
   *
   * @example
   * ```typescript
   * const manager = new DisposableManager()
   * // ... 添加资源
   * manager.dispose() // 清理所有资源
   * ```
   */
  dispose(): void {
    if (this.isDisposed) {
      return
    }

    this.isDisposed = true

    // 逆序销毁（后进先出）
    while (this.disposables.length > 0) {
      const dispose = this.disposables.pop()
      try {
        dispose?.()
      }
      catch (error) {
        console.error('[DisposableManager] Error during disposal:', error)
      }
    }
  }

  /**
   * 检查是否已销毁
   *
   * @returns 是否已销毁
   */
  get disposed(): boolean {
    return this.isDisposed
  }

  /**
   * 获取待销毁资源数量
   *
   * @returns 资源数量
   */
  get count(): number {
    return this.disposables.length
  }
}

/**
 * 创建资源销毁管理器
 *
 * @returns 资源销毁管理器实例
 *
 * @example
 * ```typescript
 * import { createDisposableManager } from '@ldesign/auth/utils'
 *
 * const disposables = createDisposableManager()
 * ```
 */
export function createDisposableManager(): DisposableManager {
  return new DisposableManager()
}

