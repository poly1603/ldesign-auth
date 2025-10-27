/**
 * 内存监控器 - 跟踪和报告内存使用情况
 */

interface MemorySnapshot {
  timestamp: number
  heapUsed: number
  heapTotal: number
  external: number
  arrayBuffers: number
  // 自定义组件内存使用
  components: {
    tokenCache: number
    blacklist: number
    eventListeners: number
    callbacks: number
    timers: number
  }
}

export class MemoryMonitor {
  private snapshots: MemorySnapshot[] = []
  private maxSnapshots = 100
  private monitoringInterval: NodeJS.Timeout | null = null
  private componentSizes = new Map<string, () => number>()

  constructor(options?: {
    maxSnapshots?: number
    autoStart?: boolean
    intervalMs?: number
  }) {
    if (options?.maxSnapshots) {
      this.maxSnapshots = options.maxSnapshots
    }
    if (options?.autoStart) {
      this.startMonitoring(options.intervalMs)
    }
  }

  /**
   * 注册组件大小计算函数
   */
  registerComponent(name: string, sizeCalculator: () => number): void {
    this.componentSizes.set(name, sizeCalculator)
  }

  /**
   * 取消注册组件
   */
  unregisterComponent(name: string): void {
    this.componentSizes.delete(name)
  }

  /**
   * 开始监控
   */
  startMonitoring(intervalMs = 60000): void {
    this.stopMonitoring()

    // 立即记录一次
    this.takeSnapshot()

    this.monitoringInterval = setInterval(() => {
      this.takeSnapshot()
    }, intervalMs)

    // 使用 unref 避免阻止进程退出
    if (this.monitoringInterval.unref) {
      this.monitoringInterval.unref()
    }
  }

  /**
   * 停止监控
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }
  }

  /**
   * 记录内存快照
   */
  takeSnapshot(): MemorySnapshot {
    const memoryUsage = process.memoryUsage ? process.memoryUsage() : {
      heapUsed: 0,
      heapTotal: 0,
      external: 0,
      arrayBuffers: 0
    }

    // 计算各组件的内存使用
    const components: any = {}
    for (const [name, calculator] of this.componentSizes.entries()) {
      try {
        components[name] = calculator()
      } catch (error) {
        components[name] = 0
      }
    }

    const snapshot: MemorySnapshot = {
      timestamp: Date.now(),
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
      external: memoryUsage.external,
      arrayBuffers: memoryUsage.arrayBuffers,
      components
    }

    this.snapshots.push(snapshot)

    // 限制快照数量
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift()
    }

    return snapshot
  }

  /**
   * 获取最新快照
   */
  getLatestSnapshot(): MemorySnapshot | null {
    return this.snapshots[this.snapshots.length - 1] || null
  }

  /**
   * 获取内存使用趋势
   */
  getMemoryTrend(durationMs = 300000): {
    heapUsedTrend: number // 正数表示增长，负数表示减少
    avgHeapUsed: number
    maxHeapUsed: number
    minHeapUsed: number
  } {
    const now = Date.now()
    const relevantSnapshots = this.snapshots.filter(
      s => s.timestamp >= now - durationMs
    )

    if (relevantSnapshots.length < 2) {
      return {
        heapUsedTrend: 0,
        avgHeapUsed: 0,
        maxHeapUsed: 0,
        minHeapUsed: 0
      }
    }

    // 计算趋势
    const first = relevantSnapshots[0]
    const last = relevantSnapshots[relevantSnapshots.length - 1]
    const heapUsedTrend = last.heapUsed - first.heapUsed

    // 计算统计信息
    let totalHeapUsed = 0
    let maxHeapUsed = 0
    let minHeapUsed = Infinity

    for (const snapshot of relevantSnapshots) {
      totalHeapUsed += snapshot.heapUsed
      maxHeapUsed = Math.max(maxHeapUsed, snapshot.heapUsed)
      minHeapUsed = Math.min(minHeapUsed, snapshot.heapUsed)
    }

    return {
      heapUsedTrend,
      avgHeapUsed: totalHeapUsed / relevantSnapshots.length,
      maxHeapUsed,
      minHeapUsed
    }
  }

  /**
   * 检测内存泄漏
   */
  detectMemoryLeak(thresholdMB = 50, durationMs = 300000): boolean {
    const trend = this.getMemoryTrend(durationMs)
    const trendMB = trend.heapUsedTrend / 1024 / 1024

    return trendMB > thresholdMB
  }

  /**
   * 生成内存报告
   */
  generateReport(): {
    currentMemory: MemorySnapshot | null
    trend: ReturnType<typeof this.getMemoryTrend>
    possibleLeak: boolean
    componentSizes: Record<string, number>
  } {
    const latest = this.getLatestSnapshot()
    const trend = this.getMemoryTrend()
    const possibleLeak = this.detectMemoryLeak()

    const componentSizes: Record<string, number> = {}
    if (latest) {
      Object.assign(componentSizes, latest.components)
    }

    return {
      currentMemory: latest,
      trend,
      possibleLeak,
      componentSizes
    }
  }

  /**
   * 清理数据
   */
  clear(): void {
    this.snapshots = []
  }

  /**
   * 销毁监控器
   */
  destroy(): void {
    this.stopMonitoring()
    this.clear()
    this.componentSizes.clear()
  }
}

// 单例实例
let globalMemoryMonitor: MemoryMonitor | null = null

/**
 * 获取全局内存监控器
 */
export function getGlobalMemoryMonitor(): MemoryMonitor {
  if (!globalMemoryMonitor) {
    globalMemoryMonitor = new MemoryMonitor({
      autoStart: false,
      maxSnapshots: 100
    })
  }
  return globalMemoryMonitor
}

