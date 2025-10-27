/**
 * MFA TOTP 双因素认证示例
 * 
 * 演示：
 * - 启用 TOTP 认证
 * - 生成 QR 码
 * - 验证 TOTP 代码
 * - 备用恢复码
 * - 登录时的 MFA 验证
 */

import { createMFAManager } from '@ldesign/auth/mfa'
import { createAuthManager } from '@ldesign/auth'
import { createHttpClient } from '@ldesign/http'
import { AuthErrorCode } from '@ldesign/auth/errors'

const httpClient = createHttpClient({
  baseURL: 'https://api.example.com',
})

// ========================================
// 创建 MFA 管理器
// ========================================

const mfa = createMFAManager(
  {
    // 应用名称（显示在 Authenticator App 中）
    appName: 'My Awesome App',

    // 签发者（通常是公司名）
    issuer: 'My Company',

    // TOTP 配置
    digits: 6, // 验证码位数
    period: 30, // 验证码有效期（秒）
    algorithm: 'SHA1', // 加密算法
  },
  httpClient,
)

const auth = createAuthManager(
  {
    autoRefresh: true,
    endpoints: {
      login: '/api/auth/login',
      logout: '/api/auth/logout',
      refresh: '/api/auth/refresh',
    },
  },
  httpClient,
)

// ========================================
// 场景 1: 启用 TOTP
// ========================================

/**
 * 为用户启用 TOTP 双因素认证
 */
async function enableTOTP(userId: string) {
  try {
    console.log('=== 启用 TOTP 双因素认证 ===\n')

    // 1. 为用户生成 TOTP Secret
    console.log('1. 生成 TOTP Secret...')
    const setup = await mfa.enable(userId, 'totp')

    console.log('✅ Secret 生成成功!')
    console.log('Secret:', setup.secret)
    console.log('QR Code URL:', setup.qrCode)
    console.log('备用恢复码:', setup.backupCodes)

    // 2. 生成 QR 码图片
    console.log('\n2. 生成 QR 码...')
    const qrCodeImage = await generateQRCode(setup.qrCode)
    console.log('QR 码已生成（Base64）:', qrCodeImage.substring(0, 50) + '...')

    // 3. 显示给用户
    console.log('\n3. 请使用 Authenticator App 扫描 QR 码:')
    console.log('   - Google Authenticator')
    console.log('   - Microsoft Authenticator')
    console.log('   - Authy')
    console.log('   - 1Password')

    // 4. 或者手动输入 Secret
    console.log('\n4. 或手动输入以下信息:')
    console.log('   账户: user@example.com')
    console.log('   密钥:', setup.secret)
    console.log('   类型: 基于时间')

    // 5. 用户扫描后，输入验证码确认
    console.log('\n5. 请输入 Authenticator App 显示的 6 位验证码...')
    const verificationCode = await promptUserInput('验证码: ')

    console.log('\n6. 验证中...')
    const isValid = await mfa.verify(userId, verificationCode, 'totp', setup.secret)

    if (isValid) {
      console.log('✅ 验证成功! TOTP 已启用')

      // 保存 Secret 到服务器
      await saveSecretToServer(userId, setup.secret)

      // 保存备用恢复码
      await saveBackupCodes(userId, setup.backupCodes)

      console.log('\n⚠️ 重要: 请妥善保存以下备用恢复码:')
      setup.backupCodes.forEach((code, index) => {
        console.log(`   ${index + 1}. ${code}`)
      })
      console.log('   这些代码可以在丢失设备时恢复账户')

      return setup
    }
    else {
      console.log('❌ 验证码错误，请重试')
      throw new Error('Invalid verification code')
    }
  }
  catch (error) {
    console.error('❌ TOTP 启用失败:', error)
    throw error
  }
}

// ========================================
// 场景 2: 登录时的 MFA 验证
// ========================================

/**
 * 带 MFA 验证的登录流程
 */
async function loginWithMFA(username: string, password: string) {
  try {
    console.log('\n=== 登录流程（带 MFA） ===\n')

    // 1. 第一步：用户名密码登录
    console.log('1. 使用用户名和密码登录...')

    try {
      await auth.login({ username, password })

      // 如果没有启用 MFA，直接登录成功
      console.log('✅ 登录成功（无需 MFA）')
      return
    }
    catch (error: any) {
      // 2. 检查是否需要 MFA
      if (error.code === AuthErrorCode.MFA_REQUIRED) {
        console.log('🔐 需要 MFA 验证')

        const mfaMethods = error.data?.methods || ['totp']
        console.log('可用的验证方式:', mfaMethods.join(', '))

        // 3. 获取用户输入的 MFA 代码
        console.log('\n2. 请输入 Authenticator App 的 6 位验证码...')
        const mfaCode = await promptUserInput('验证码: ')

        // 4. 使用 MFA 代码继续登录
        console.log('\n3. 验证 MFA 代码...')

        await auth.login({
          username,
          password,
          mfaCode,
          mfaMethod: 'totp',
        })

        console.log('✅ MFA 验证成功，登录完成!')

        // 5. 询问是否信任此设备
        const trustDevice = await promptYesNo('信任此设备？30 天内不再要求 MFA (y/n): ')

        if (trustDevice) {
          await markDeviceAsTrusted(error.data.userId)
          console.log('✅ 设备已标记为信任')
        }
      }
      else {
        // 其他登录错误
        throw error
      }
    }
  }
  catch (error) {
    console.error('❌ 登录失败:', error)
    throw error
  }
}

// ========================================
// 场景 3: 使用备用恢复码
// ========================================

/**
 * 使用备用恢复码登录（设备丢失时）
 */
async function loginWithBackupCode(username: string, password: string, backupCode: string) {
  try {
    console.log('\n=== 使用备用恢复码登录 ===\n')

    console.log('1. 验证备用恢复码...')

    try {
      await auth.login({ username, password })
    }
    catch (error: any) {
      if (error.code === AuthErrorCode.MFA_REQUIRED) {
        const userId = error.data.userId

        // 验证备用码
        const isValid = await mfa.verifyBackupCode(userId, backupCode)

        if (isValid) {
          console.log('✅ 备用码有效')

          // 使用备用码继续登录
          await auth.login({
            username,
            password,
            mfaCode: backupCode,
            mfaMethod: 'backup',
          })

          console.log('✅ 登录成功!')

          // 标记该备用码已使用
          await markBackupCodeUsed(userId, backupCode)

          // 提醒用户重新配置 MFA
          console.log('\n⚠️ 提示: 请尽快重新配置 TOTP 或生成新的备用码')
        }
        else {
          console.log('❌ 备用码无效')
          throw new Error('Invalid backup code')
        }
      }
      else {
        throw error
      }
    }
  }
  catch (error) {
    console.error('❌ 登录失败:', error)
    throw error
  }
}

// ========================================
// 场景 4: 禁用 TOTP
// ========================================

/**
 * 禁用 TOTP 双因素认证
 */
async function disableTOTP(userId: string) {
  try {
    console.log('\n=== 禁用 TOTP ===\n')

    // 1. 确认用户身份（需要输入密码或当前的 MFA 代码）
    console.log('1. 为了安全，请验证身份...')
    const mfaCode = await promptUserInput('请输入当前的 MFA 验证码: ')

    const isValid = await mfa.verify(userId, mfaCode, 'totp')

    if (!isValid) {
      console.log('❌ 验证码错误')
      throw new Error('Invalid MFA code')
    }

    // 2. 禁用 TOTP
    console.log('\n2. 禁用 TOTP...')
    await mfa.disable(userId, 'totp')

    console.log('✅ TOTP 已禁用')

    // 3. 清理备用码
    await clearBackupCodes(userId)

    console.log('⚠️ 提示: 你的账户安全性降低了，建议重新启用 MFA')
  }
  catch (error) {
    console.error('❌ 禁用 TOTP 失败:', error)
    throw error
  }
}

// ========================================
// 场景 5: 重新生成备用恢复码
// ========================================

/**
 * 重新生成备用恢复码
 */
async function regenerateBackupCodes(userId: string) {
  try {
    console.log('\n=== 重新生成备用恢复码 ===\n')

    // 1. 验证身份
    console.log('1. 验证身份...')
    const mfaCode = await promptUserInput('请输入 MFA 验证码: ')

    const isValid = await mfa.verify(userId, mfaCode, 'totp')

    if (!isValid) {
      console.log('❌ 验证码错误')
      throw new Error('Invalid MFA code')
    }

    // 2. 生成新的备用码
    console.log('\n2. 生成新的备用码...')
    const backupCodes = mfa.generateBackupCodes(8)

    console.log('✅ 新的备用恢复码:')
    backupCodes.forEach((code, index) => {
      console.log(`   ${index + 1}. ${code}`)
    })

    // 3. 保存到服务器（会使旧的备用码失效）
    await saveBackupCodes(userId, backupCodes)

    console.log('\n⚠️ 重要:')
    console.log('   - 请妥善保存这些备用码')
    console.log('   - 旧的备用码已失效')
    console.log('   - 每个备用码只能使用一次')

    return backupCodes
  }
  catch (error) {
    console.error('❌ 生成备用码失败:', error)
    throw error
  }
}

// ========================================
// 辅助函数
// ========================================

/**
 * 生成 QR 码图片（Base64）
 */
async function generateQRCode(text: string): Promise<string> {
  // 实际应用中使用 qrcode 库
  // import QRCode from 'qrcode'
  // return await QRCode.toDataURL(text)

  // 模拟
  return `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`
}

/**
 * 提示用户输入
 */
async function promptUserInput(message: string): Promise<string> {
  // 实际应用中使用 readline 或 UI 输入框
  // const readline = require('readline')
  // ...

  // 模拟输入
  return '123456'
}

/**
 * 提示用户确认（是/否）
 */
async function promptYesNo(message: string): Promise<boolean> {
  const input = await promptUserInput(message)
  return input.toLowerCase() === 'y' || input.toLowerCase() === 'yes'
}

/**
 * 保存 Secret 到服务器
 */
async function saveSecretToServer(userId: string, secret: string): Promise<void> {
  await httpClient.post('/api/auth/mfa/totp/enable', {
    userId,
    secret,
  })
}

/**
 * 保存备用码到服务器
 */
async function saveBackupCodes(userId: string, codes: string[]): Promise<void> {
  await httpClient.post('/api/auth/mfa/backup-codes', {
    userId,
    codes,
  })
}

/**
 * 清理备用码
 */
async function clearBackupCodes(userId: string): Promise<void> {
  await httpClient.delete(`/api/auth/mfa/backup-codes/${userId}`)
}

/**
 * 标记备用码已使用
 */
async function markBackupCodeUsed(userId: string, code: string): Promise<void> {
  await httpClient.post('/api/auth/mfa/backup-codes/use', {
    userId,
    code,
  })
}

/**
 * 标记设备为信任
 */
async function markDeviceAsTrusted(userId: string): Promise<void> {
  await httpClient.post('/api/auth/devices/trust', {
    userId,
    deviceId: getDeviceId(),
  })
}

/**
 * 获取设备 ID
 */
function getDeviceId(): string {
  // 实际应用中使用更复杂的设备指纹
  return 'device-' + Math.random().toString(36).substring(7)
}

// ========================================
// 主程序示例
// ========================================

async function main() {
  console.log('=== MFA TOTP 双因素认证示例 ===\n')

  const userId = 'user123'
  const username = 'user@example.com'
  const password = 'password123'

  try {
    // 场景 1: 启用 TOTP
    console.log('场景 1: 启用 TOTP')
    const setup = await enableTOTP(userId)

    // 等待一下
    await new Promise(resolve => setTimeout(resolve, 2000))

    // 场景 2: 登录时验证 MFA
    console.log('\n场景 2: 登录时验证 MFA')
    await loginWithMFA(username, password)

    // 场景 3: 重新生成备用码
    console.log('\n场景 3: 重新生成备用码')
    await regenerateBackupCodes(userId)

    // 场景 4: 使用备用码登录（模拟设备丢失）
    console.log('\n场景 4: 使用备用码登录')
    await loginWithBackupCode(username, password, setup.backupCodes[0])

    console.log('\n✅ 所有场景演示完成!')
  }
  catch (error) {
    console.error('\n❌ 示例运行失败:', error)
  }
}

// 导出函数
export {
  enableTOTP,
  loginWithMFA,
  loginWithBackupCode,
  disableTOTP,
  regenerateBackupCodes,
}

// 运行示例
if (require.main === module) {
  main().catch(console.error)
}

