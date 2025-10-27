# 多因素认证 (MFA)

多因素认证（Multi-Factor Authentication）是一种增强账户安全性的机制，要求用户提供两个或更多验证因素来证明身份。

## 支持的 MFA 方式

- **TOTP (Time-based One-Time Password)**: 基于时间的一次性密码，如 Google Authenticator
- **SMS**: 短信验证码
- **Email**: 邮件验证码
- **Backup Codes**: 备用恢复码

## 快速开始

```typescript
import { createMFAManager } from '@ldesign/auth/mfa'
import { createHttpClient } from '@ldesign/http'

const httpClient = createHttpClient({
  baseURL: 'https://api.example.com'
})

const mfa = createMFAManager({
  appName: 'My App',
  issuer: 'My Company',
  digits: 6,
  period: 30
}, httpClient)
```

## TOTP 认证

### 启用 TOTP

```typescript
// 1. 为用户启用 TOTP
const setup = await mfa.enable('user123', 'totp')

console.log('Secret:', setup.secret)
console.log('QR Code URL:', setup.qrCode)
console.log('Backup Codes:', setup.backupCodes)

// 2. 生成 QR 码显示给用户
import QRCode from 'qrcode'
const qrCodeImage = await QRCode.toDataURL(setup.qrCode)

// 在页面上显示 QR 码
document.getElementById('qrcode').src = qrCodeImage

// 3. 用户扫描 QR 码后，输入验证码确认
const code = prompt('请输入验证码:')
const isValid = await mfa.verify('user123', code, 'totp', setup.secret)

if (isValid) {
  console.log('✅ TOTP 启用成功!')
  // 保存 secret 到服务器
  await saveSecretToServer(setup.secret)
}
else {
  console.log('❌ 验证码错误')
}
```

### 登录时验证

```typescript
import { createAuthManager } from '@ldesign/auth'

const auth = createAuthManager({
  autoRefresh: true,
  endpoints: {
    login: '/api/auth/login',
    // ...
  }
}, httpClient)

// 1. 第一步：用户名密码登录
try {
  await auth.login({
    username: 'user@example.com',
    password: 'password123'
  })
}
catch (error) {
  if (error.code === 'MFA_REQUIRED') {
    // 2. 第二步：需要 MFA 验证
    const mfaCode = prompt('请输入 MFA 验证码:')
    
    // 继续登录，提供 MFA 验证码
    await auth.login({
      username: 'user@example.com',
      password: 'password123',
      mfaCode: mfaCode
    })
    
    console.log('✅ 登录成功!')
  }
}
```

### 禁用 TOTP

```typescript
await mfa.disable('user123', 'totp')
console.log('TOTP 已禁用')
```

## SMS 认证

### 发送短信验证码

```typescript
// 1. 发送验证码
await mfa.sendSMS('user123', '+86 138 0000 0000')

console.log('短信已发送')

// 2. 用户输入验证码
const code = prompt('请输入短信验证码:')

// 3. 验证
const isValid = await mfa.verify('user123', code, 'sms')

if (isValid) {
  console.log('✅ 验证成功!')
}
```

### 配置 SMS Provider

```typescript
const mfa = createMFAManager({
  appName: 'My App',
  sms: {
    provider: 'twilio',
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    fromNumber: '+1234567890'
  }
}, httpClient)
```

## Email 认证

### 发送邮件验证码

```typescript
// 1. 发送验证码
await mfa.sendEmail('user123', 'user@example.com')

console.log('邮件已发送')

// 2. 用户输入验证码
const code = prompt('请输入邮件验证码:')

// 3. 验证
const isValid = await mfa.verify('user123', code, 'email')

if (isValid) {
  console.log('✅ 验证成功!')
}
```

## 备用恢复码

### 生成备用码

```typescript
// 生成 8 个备用码
const backupCodes = mfa.generateBackupCodes(8)

console.log('备用恢复码:', backupCodes)
// ['ABCD-1234', 'EFGH-5678', ...]

// 保存到服务器
await saveBackupCodes(userId, backupCodes)

// 显示给用户，让用户保存
displayBackupCodes(backupCodes)
```

### 使用备用码

```typescript
// 用户使用备用码登录
const backupCode = 'ABCD-1234'

const isValid = await mfa.verifyBackupCode('user123', backupCode)

if (isValid) {
  console.log('✅ 备用码有效')
  // 标记该备用码已使用
  await markBackupCodeUsed(userId, backupCode)
}
```

## 多种 MFA 方式

### 让用户选择

```vue
<template>
  <div v-if="mfaRequired">
    <h3>选择验证方式</h3>
    
    <button @click="selectMethod('totp')">
      Authenticator App
    </button>
    
    <button @click="selectMethod('sms')">
      短信验证码
    </button>
    
    <button @click="selectMethod('email')">
      邮件验证码
    </button>
    
    <div v-if="selectedMethod">
      <input 
        v-model="code" 
        placeholder="输入验证码"
      />
      <button @click="verifyMFA">验证</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { createMFAManager } from '@ldesign/auth/mfa'

const mfaRequired = ref(false)
const selectedMethod = ref('')
const code = ref('')

const mfa = createMFAManager({
  appName: 'My App'
}, httpClient)

async function selectMethod(method: string) {
  selectedMethod.value = method
  
  // 如果是 SMS 或 Email，发送验证码
  if (method === 'sms') {
    await mfa.sendSMS(userId, userPhone)
    alert('短信已发送')
  }
  else if (method === 'email') {
    await mfa.sendEmail(userId, userEmail)
    alert('邮件已发送')
  }
}

async function verifyMFA() {
  const isValid = await mfa.verify(
    userId, 
    code.value, 
    selectedMethod.value
  )
  
  if (isValid) {
    // 继续登录流程
    await completeLogin()
  }
  else {
    alert('验证码错误')
  }
}
</script>
```

## 完整登录流程

### 带 MFA 的登录

```typescript
import { createAuthManager } from '@ldesign/auth'
import { createMFAManager } from '@ldesign/auth/mfa'
import { AuthErrorCode } from '@ldesign/auth/errors'

const auth = createAuthManager({ autoRefresh: true }, httpClient)
const mfa = createMFAManager({ appName: 'My App' }, httpClient)

async function loginWithMFA(username: string, password: string) {
  try {
    // 1. 尝试登录
    await auth.login({ username, password })
    
    // 登录成功
    console.log('✅ 登录成功')
    return true
  }
  catch (error) {
    // 2. 检查是否需要 MFA
    if (error.code === AuthErrorCode.MFA_REQUIRED) {
      const methods = error.data?.methods || ['totp']
      
      // 3. 显示 MFA 界面
      const method = await showMFAUI(methods)
      
      // 4. 发送验证码（如果需要）
      if (method === 'sms') {
        await mfa.sendSMS(error.data.userId, error.data.phone)
      }
      else if (method === 'email') {
        await mfa.sendEmail(error.data.userId, error.data.email)
      }
      
      // 5. 获取用户输入的验证码
      const code = await getMFACode()
      
      // 6. 再次登录，带上 MFA 验证码
      await auth.login({
        username,
        password,
        mfaCode: code,
        mfaMethod: method
      })
      
      console.log('✅ MFA 验证成功，登录完成')
      return true
    }
    else {
      // 其他错误
      throw error
    }
  }
}
```

## 信任设备

### 记住设备

```typescript
import { createDeviceManager } from '@ldesign/auth/device'

const deviceManager = createDeviceManager()

// 登录成功后，询问用户是否信任此设备
async function handleLoginSuccess() {
  const trustDevice = confirm('信任此设备？30 天内不再要求 MFA 验证')
  
  if (trustDevice) {
    const deviceId = deviceManager.getDeviceId()
    
    // 保存设备信息到服务器
    await httpClient.post('/api/auth/devices/trust', {
      deviceId,
      deviceInfo: deviceManager.getDeviceInfo()
    })
    
    // 本地标记
    deviceManager.markTrusted(deviceId)
  }
}

// 下次登录检查
async function checkTrustedDevice() {
  const deviceId = deviceManager.getDeviceId()
  
  // 检查是否是信任设备
  const response = await httpClient.get(`/api/auth/devices/${deviceId}/trusted`)
  
  if (response.trusted) {
    // 跳过 MFA
    return true
  }
  
  return false
}
```

## 管理 MFA 设置

### 用户设置页面

```vue
<template>
  <div class="mfa-settings">
    <h2>多因素认证</h2>
    
    <!-- TOTP -->
    <div class="mfa-method">
      <h3>Authenticator App</h3>
      <p v-if="!totpEnabled">
        使用 Google Authenticator、Authy 等应用
      </p>
      
      <button v-if="!totpEnabled" @click="enableTOTP">
        启用
      </button>
      <button v-else @click="disableTOTP">
        禁用
      </button>
    </div>
    
    <!-- SMS -->
    <div class="mfa-method">
      <h3>短信验证</h3>
      <input 
        v-model="phoneNumber" 
        placeholder="+86 138 0000 0000"
        :disabled="smsEnabled"
      />
      
      <button v-if="!smsEnabled" @click="enableSMS">
        启用
      </button>
      <button v-else @click="disableSMS">
        禁用
      </button>
    </div>
    
    <!-- Backup Codes -->
    <div class="backup-codes">
      <h3>备用恢复码</h3>
      <button @click="generateBackupCodes">
        生成新的备用码
      </button>
      
      <div v-if="backupCodes.length">
        <p>请妥善保存这些备用码：</p>
        <ul>
          <li v-for="code in backupCodes" :key="code">
            {{ code }}
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { createMFAManager } from '@ldesign/auth/mfa'

const mfa = createMFAManager({ appName: 'My App' }, httpClient)

const totpEnabled = ref(false)
const smsEnabled = ref(false)
const phoneNumber = ref('')
const backupCodes = ref<string[]>([])

async function enableTOTP() {
  const setup = await mfa.enable(userId, 'totp')
  
  // 显示 QR 码让用户扫描
  showQRCode(setup.qrCode)
  
  // 用户扫描后验证
  const code = await getCodeFromUser()
  const isValid = await mfa.verify(userId, code, 'totp', setup.secret)
  
  if (isValid) {
    totpEnabled.value = true
    alert('TOTP 启用成功')
  }
}

async function enableSMS() {
  await mfa.enable(userId, 'sms', { phone: phoneNumber.value })
  
  // 发送测试验证码
  await mfa.sendSMS(userId, phoneNumber.value)
  
  const code = await getCodeFromUser()
  const isValid = await mfa.verify(userId, code, 'sms')
  
  if (isValid) {
    smsEnabled.value = true
    alert('SMS 启用成功')
  }
}

async function generateBackupCodes() {
  backupCodes.value = mfa.generateBackupCodes(8)
  
  // 保存到服务器
  await httpClient.post('/api/auth/mfa/backup-codes', {
    codes: backupCodes.value
  })
}
</script>
```

## 安全建议

### 1. 强制 MFA

对于敏感操作，强制要求 MFA：

```typescript
// 敏感操作前验证
async function performSensitiveAction() {
  // 检查最近是否验证过 MFA
  const lastMFAVerification = getLastMFAVerificationTime()
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
  
  if (lastMFAVerification < fiveMinutesAgo) {
    // 要求重新验证
    const code = await promptMFACode()
    const isValid = await mfa.verify(userId, code, 'totp')
    
    if (!isValid) {
      throw new Error('MFA 验证失败')
    }
    
    // 记录验证时间
    setLastMFAVerificationTime(Date.now())
  }
  
  // 执行敏感操作
  await deleteSomethingImportant()
}
```

### 2. 备用恢复方式

始终提供多种恢复方式：

- 备用恢复码
- 管理员重置
- 邮件验证

### 3. 限制尝试次数

```typescript
const MAX_ATTEMPTS = 3
let attempts = 0

async function verifyMFAWithLimit(userId: string, code: string) {
  if (attempts >= MAX_ATTEMPTS) {
    throw new Error('尝试次数过多，请稍后再试')
  }
  
  const isValid = await mfa.verify(userId, code, 'totp')
  
  if (!isValid) {
    attempts++
    throw new Error(`验证码错误，剩余 ${MAX_ATTEMPTS - attempts} 次机会`)
  }
  
  // 重置尝试次数
  attempts = 0
  return true
}
```

### 4. 审计日志

记录所有 MFA 相关操作：

```typescript
import { createAuditLogger } from '@ldesign/auth/audit'

const audit = createAuditLogger()

// MFA 启用
await audit.log({
  userId,
  action: 'mfa.enabled',
  method: 'totp',
  timestamp: new Date(),
  ip: request.ip,
  userAgent: request.userAgent
})

// MFA 验证失败
await audit.log({
  userId,
  action: 'mfa.verification.failed',
  method: 'totp',
  timestamp: new Date()
})
```

## 最佳实践

### 1. 用户友好的提示

```typescript
// 告诉用户为什么需要 MFA
const message = `
  为了保护您的账户安全，我们建议启用多因素认证。
  
  启用后，登录时除了密码外，还需要提供验证码。
  
  推荐使用 Google Authenticator 或 Authy 应用。
`
```

### 2. 渐进式启用

不要强制所有用户立即启用，而是渐进式推广：

```typescript
// 第一次登录：提示
if (isFirstLogin) {
  showMFAPromotion()
}

// 30 天后：再次提示
if (daysSinceRegistration >= 30 && !mfaEnabled) {
  showMFAReminder()
}

// 特定条件：要求启用
if (isAdminUser || hasAccessToSensitiveData) {
  requireMFA()
}
```

### 3. 提供明确的文档

在界面上提供链接到帮助文档：

- 如何设置 TOTP
- 如何使用备用码
- 如果丢失设备怎么办

## 下一步

- [WebAuthn 生物识别](/guide/webauthn)
- [账户安全](/guide/security)
- [MFA 完整示例](/examples/mfa-totp)

