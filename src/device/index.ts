/**
 * 设备管理模块
 *
 * @example
 * ```typescript
 * import { createDeviceManager } from '@ldesign/auth/device'
 *
 * const manager = createDeviceManager({}, httpClient)
 *
 * // 获取当前设备信息
 * const info = await manager.getDeviceInfo()
 * console.log('设备:', info.name)
 * console.log('指纹:', info.fingerprint)
 *
 * // 获取用户的所有设备
 * const devices = await manager.getDevices('user123')
 *
 * // 信任设备
 * await manager.trustDevice(deviceId)
 *
 * // 移除设备
 * await manager.removeDevice(deviceId)
 * ```
 */

// 导出设备管理器
export { DeviceManager, createDeviceManager } from './DeviceManager'
export type { Device, DeviceManagerConfig } from './DeviceManager'

