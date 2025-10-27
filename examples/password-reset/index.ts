/**
 * 密码重置示例
 * 
 * 演示：
 * - 请求密码重置
 * - 验证重置令牌
 * - 重置密码
 * - 密码强度验证
 * - 密码策略
 */

import { createPasswordManager } from '@ldesign/auth/password'
import { createHttpClient } from '@ldesign/http'

const httpClient = createHttpClient({
  baseURL: 'https://api.example.com',
})

// ========================================
// 创建密码管理器
// ========================================

const passwordManager = createPasswordManager(
  {
    // 密码策略
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,

    // 禁止的弱密码
    forbiddenPasswords: [
      'password',
      '12345678',
      'qwerty123',
      'admin123',
    ],

    // 密码历史
    preventReuse: 5, // 不能重复使用最近 5 个密码
  },
  {
    // 端点配置
    requestResetEndpoint: '/api/auth/password/reset/request',
    resetPasswordEndpoint: '/api/auth/password/reset',
    changePasswordEndpoint: '/api/auth/password/change',
  },
  httpClient,
)

// ========================================
// 场景 1: 忘记密码 - 请求重置
// ========================================

/**
 * 用户忘记密码，请求重置链接
 */
async function forgotPassword(email: string) {
  try {
    console.log('=== 忘记密码流程 ===\n')

    console.log('1. 请求密码重置链接...')
    console.log('邮箱:', email)

    await passwordManager.requestReset(email)

    console.log('✅ 重置链接已发送到你的邮箱')
    console.log('请检查邮箱并点击重置链接')
    console.log('\n邮件内容示例:')
    console.log('---')
    console.log('主题: 重置你的密码')
    console.log('\n你好,')
    console.log('\n我们收到了你的密码重置请求。')
    console.log('点击以下链接重置密码:')
    console.log('\nhttp://localhost:3000/reset-password?token=abc123xyz')
    console.log('\n此链接将在 1 小时后过期。')
    console.log('\n如果不是你本人操作，请忽略此邮件。')
    console.log('---\n')

    return true
  }
  catch (error) {
    console.error('❌ 请求重置失败:', error)
    throw error
  }
}

// ========================================
// 场景 2: 验证新密码强度
// ========================================

/**
 * 验证密码强度
 */
function validatePasswordStrength(password: string) {
  console.log('\n=== 密码强度验证 ===\n')

  console.log('密码:', password.replace(/./g, '*'))

  const result = passwordManager.validatePassword(password)

  console.log('\n验证结果:')
  console.log('- 是否有效:', result.isValid ? '✅' : '❌')
  console.log('- 强度分数:', result.strength, '/ 100')
  console.log('- 强度等级:', result.strengthLevel)

  if (result.errors.length > 0) {
    console.log('\n❌ 错误:')
    result.errors.forEach(error => {
      console.log(`   - ${error}`)
    })
  }

  if (result.suggestions.length > 0) {
    console.log('\n💡 建议:')
    result.suggestions.forEach(suggestion => {
      console.log(`   - ${suggestion}`)
    })
  }

  // 强度等级说明
  console.log('\n强度等级说明:')
  console.log('- weak: 弱密码（0-40 分）')
  console.log('- fair: 一般密码（41-60 分）')
  console.log('- good: 良好密码（61-80 分）')
  console.log('- strong: 强密码（81-100 分）')

  return result
}

// ========================================
// 场景 3: 重置密码
// ========================================

/**
 * 使用重置令牌重置密码
 */
async function resetPassword(token: string, newPassword: string) {
  try {
    console.log('\n=== 重置密码 ===\n')

    // 1. 验证新密码强度
    console.log('1. 验证新密码...')
    const validation = validatePasswordStrength(newPassword)

    if (!validation.isValid) {
      console.log('\n❌ 密码不符合要求，请修改后重试')
      return false
    }

    console.log('\n✅ 密码符合要求')

    // 2. 执行重置
    console.log('\n2. 重置密码中...')
    await passwordManager.resetPassword(token, newPassword)

    console.log('✅ 密码重置成功!')
    console.log('你现在可以使用新密码登录了')

    return true
  }
  catch (error: any) {
    console.error('❌ 密码重置失败:', error.message)

    if (error.message.includes('expired')) {
      console.log('\n重置链接已过期，请重新请求')
    }
    else if (error.message.includes('invalid')) {
      console.log('\n重置链接无效')
    }

    throw error
  }
}

// ========================================
// 场景 4: 修改密码（已登录用户）
// ========================================

/**
 * 已登录用户修改密码
 */
async function changePassword(oldPassword: string, newPassword: string) {
  try {
    console.log('\n=== 修改密码 ===\n')

    // 1. 验证新密码
    console.log('1. 验证新密码...')
    const validation = validatePasswordStrength(newPassword)

    if (!validation.isValid) {
      console.log('\n❌ 新密码不符合要求')
      return false
    }

    // 2. 检查新密码是否与旧密码相同
    if (oldPassword === newPassword) {
      console.log('❌ 新密码不能与旧密码相同')
      return false
    }

    console.log('✅ 新密码符合要求')

    // 3. 执行修改
    console.log('\n2. 修改密码中...')
    await passwordManager.changePassword(oldPassword, newPassword)

    console.log('✅ 密码修改成功!')

    // 4. 建议
    console.log('\n💡 安全建议:')
    console.log('- 不要在其他网站使用相同的密码')
    console.log('- 定期更换密码')
    console.log('- 启用双因素认证')

    return true
  }
  catch (error: any) {
    console.error('❌ 密码修改失败:', error.message)

    if (error.message.includes('incorrect')) {
      console.log('\n旧密码错误')
    }

    throw error
  }
}

// ========================================
// 场景 5: 密码策略检查
// ========================================

/**
 * 测试多个密码，展示策略
 */
function demonstratePasswordPolicy() {
  console.log('\n=== 密码策略演示 ===\n')

  const testPasswords = [
    { password: '123456', desc: '纯数字' },
    { password: 'password', desc: '纯字母' },
    { password: 'Pass123', desc: '太短' },
    { password: 'password123', desc: '缺少大写字母和特殊字符' },
    { password: 'Password123', desc: '缺少特殊字符' },
    { password: 'Pass@123', desc: '长度刚好' },
    { password: 'P@ssw0rd', desc: '符合基本要求' },
    { password: 'MyS3cur3P@ssw0rd!', desc: '强密码' },
    { password: 'Tr0ub4dor&3', desc: '包含特殊字符和数字' },
    { password: 'correct-horse-battery-staple', desc: '长密码短语' },
  ]

  console.log('当前密码策略:')
  console.log('- 最小长度: 8 个字符')
  console.log('- 必须包含大写字母')
  console.log('- 必须包含小写字母')
  console.log('- 必须包含数字')
  console.log('- 必须包含特殊字符')
  console.log('')

  testPasswords.forEach(({ password, desc }) => {
    console.log(`\n测试密码: "${password}" (${desc})`)
    console.log('='.repeat(50))

    const result = passwordManager.validatePassword(password)

    console.log(`有效: ${result.isValid ? '✅' : '❌'}`)
    console.log(`强度: ${result.strength}/100 (${result.strengthLevel})`)

    if (result.errors.length > 0) {
      console.log('错误:')
      result.errors.forEach(err => console.log(`  ❌ ${err}`))
    }
  })
}

// ========================================
// 场景 6: 完整的密码重置流程
// ========================================

/**
 * 完整的密码重置流程演示
 */
async function completePasswordResetFlow() {
  console.log('=== 完整密码重置流程 ===\n')

  const email = 'user@example.com'
  const newPassword = 'MyN3wP@ssw0rd!'

  try {
    // Step 1: 用户请求重置
    console.log('Step 1: 用户请求重置')
    await forgotPassword(email)

    // 模拟：用户收到邮件，点击链接
    const resetToken = 'mock-reset-token-abc123xyz'

    // Step 2: 用户输入新密码
    console.log('\nStep 2: 用户输入新密码')
    console.log('新密码:', newPassword.replace(/./g, '*'))

    // Step 3: 验证并重置密码
    console.log('\nStep 3: 验证并重置密码')
    await resetPassword(resetToken, newPassword)

    // Step 4: 成功！
    console.log('\n✅ 密码重置流程完成!')
    console.log('用户现在可以使用新密码登录')
  }
  catch (error) {
    console.error('\n❌ 流程失败:', error)
  }
}

// ========================================
// UI 组件示例（HTML）
// ========================================

/*
<!-- 忘记密码页面 -->
<div class="forgot-password-page">
  <h2>忘记密码</h2>
  <form id="forgot-password-form">
    <input 
      type="email" 
      name="email" 
      placeholder="输入你的邮箱"
      required
    />
    <button type="submit">发送重置链接</button>
  </form>
</div>

<!-- 重置密码页面 -->
<div class="reset-password-page">
  <h2>重置密码</h2>
  <form id="reset-password-form">
    <input 
      type="password" 
      name="newPassword" 
      placeholder="新密码"
      required
    />
    
    <!-- 密码强度指示器 -->
    <div class="password-strength">
      <div class="strength-bar" id="strength-bar"></div>
      <p id="strength-text">密码强度: <span></span></p>
    </div>
    
    <!-- 密码要求提示 -->
    <ul class="password-requirements">
      <li id="req-length">至少 8 个字符</li>
      <li id="req-uppercase">包含大写字母</li>
      <li id="req-lowercase">包含小写字母</li>
      <li id="req-number">包含数字</li>
      <li id="req-special">包含特殊字符</li>
    </ul>
    
    <button type="submit">重置密码</button>
  </form>
</div>

<script>
// 实时验证密码强度
document.getElementById('newPassword').addEventListener('input', (e) => {
  const password = e.target.value
  const result = passwordManager.validatePassword(password)
  
  // 更新强度条
  const strengthBar = document.getElementById('strength-bar')
  strengthBar.style.width = result.strength + '%'
  strengthBar.className = 'strength-bar ' + result.strengthLevel
  
  // 更新文本
  document.getElementById('strength-text').querySelector('span').textContent = 
    result.strengthLevel.toUpperCase()
  
  // 更新要求列表
  updateRequirementIndicators(result.errors)
})
</script>
*/

// ========================================
// Vue 组件示例
// ========================================

/*
<template>
  <div class="password-reset">
    <h2>重置密码</h2>
    
    <form @submit.prevent="handleSubmit">
      <div class="form-group">
        <label>新密码</label>
        <input 
          v-model="newPassword"
          type="password"
          @input="checkStrength"
        />
        
        <!-- 密码强度指示器 -->
        <div class="strength-meter">
          <div 
            class="strength-bar"
            :class="strengthLevel"
            :style="{ width: strength + '%' }"
          ></div>
        </div>
        <p class="strength-text">
          强度: {{ strengthLevel }}
        </p>
        
        <!-- 错误提示 -->
        <ul v-if="errors.length" class="errors">
          <li v-for="error in errors" :key="error">
            {{ error }}
          </li>
        </ul>
      </div>
      
      <button type="submit" :disabled="!isValid">
        重置密码
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { createPasswordManager } from '@ldesign/auth/password'

const passwordManager = createPasswordManager({
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true
}, {}, httpClient)

const newPassword = ref('')
const strength = ref(0)
const strengthLevel = ref('')
const errors = ref<string[]>([])
const isValid = ref(false)

function checkStrength() {
  const result = passwordManager.validatePassword(newPassword.value)
  
  strength.value = result.strength
  strengthLevel.value = result.strengthLevel
  errors.value = result.errors
  isValid.value = result.isValid
}

async function handleSubmit() {
  const token = new URLSearchParams(window.location.search).get('token')
  
  try {
    await passwordManager.resetPassword(token, newPassword.value)
    alert('密码重置成功!')
    // 跳转到登录页
    window.location.href = '/login'
  } catch (error) {
    alert('密码重置失败: ' + error.message)
  }
}
</script>
*/

// ========================================
// 导出函数
// ========================================

export {
  forgotPassword,
  resetPassword,
  changePassword,
  validatePasswordStrength,
  demonstratePasswordPolicy,
  completePasswordResetFlow,
}

// ========================================
// 主程序
// ========================================

async function main() {
  // 演示密码策略
  demonstratePasswordPolicy()

  // 完整流程演示
  await completePasswordResetFlow()
}

// 运行示例
if (require.main === module) {
  main().catch(console.error)
}

