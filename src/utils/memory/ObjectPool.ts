/**
 * 对象池 - 用于重复使用对象，减少 GC 压力
 */
export class ObjectPool<T> {
  private pool: T[] = []
  private maxSize: number
  private factory: () => T
  private reset: (obj: T) => void
  private inUse = new WeakSet<T>()

  constructor(options: {
    factory: () => T
    reset: (obj: T) => void
    maxSize?: number
  }) {
    this.factory = options.factory
    this.reset = options.reset
    this.maxSize = options.maxSize || 100
  }

  /**
   * 获取对象
   */
  acquire(): T {
    let obj = this.pool.pop()
    if (!obj) {
      obj = this.factory()
    }
    this.inUse.add(obj)
    return obj
  }

  /**
   * 释放对象
   */
  release(obj: T): void {
    if (!this.inUse.has(obj)) {
      return
    }

    this.inUse.delete(obj)
    this.reset(obj)

    if (this.pool.length < this.maxSize) {
      this.pool.push(obj)
    }
  }

  /**
   * 清空池
   */
  clear(): void {
    this.pool.length = 0
  }

  /**
   * 获取池大小
   */
  size(): number {
    return this.pool.length
  }
}

