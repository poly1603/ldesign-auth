/**
 * XSS 防护工具
 *
 * @module @ldesign/auth-core/security
 * @author LDesign Team
 */

/**
 * 清理选项
 */
export interface SanitizeOptions {
  /** 允许的 HTML 标签 */
  allowedTags?: string[]
  /** 允许的属性 */
  allowedAttributes?: Record<string, string[]>
  /** 是否允许数据 URL */
  allowDataUrls?: boolean
  /** 最大嵌套深度 */
  maxNestingDepth?: number
}

/**
 * HTML 实体映射
 */
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  '\'': '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
}

/**
 * 危险属性列表
 */
const DANGEROUS_ATTRIBUTES = [
  'onclick', 'ondblclick', 'onmousedown', 'onmouseup', 'onmouseover',
  'onmousemove', 'onmouseout', 'onmouseenter', 'onmouseleave',
  'onkeydown', 'onkeypress', 'onkeyup',
  'onfocus', 'onblur', 'onchange', 'onsubmit', 'onreset',
  'onload', 'onerror', 'onunload', 'onresize', 'onscroll',
  'oncontextmenu', 'ondrag', 'ondragend', 'ondragenter', 'ondragleave',
  'ondragover', 'ondragstart', 'ondrop',
]

/**
 * 危险协议列表
 */
const DANGEROUS_PROTOCOLS = [
  'javascript:',
  'vbscript:',
  'data:text/html',
  'data:application/javascript',
]

/**
 * HTML 实体转义
 *
 * @param str - 要转义的字符串
 * @returns 转义后的字符串
 *
 * @example
 * ```ts
 * escapeHtml('<script>alert("XSS")</script>')
 * // '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'
 * ```
 */
export function escapeHtml(str: string): string {
  if (!str) return ''

  return str.replace(/[&<>"'`=/]/g, char => HTML_ENTITIES[char] || char)
}

/**
 * 清理 HTML 输入
 *
 * @param input - 输入字符串
 * @param options - 清理选项
 * @returns 清理后的字符串
 *
 * @example
 * ```ts
 * sanitizeInput('<script>alert("XSS")</script><p>Hello</p>')
 * // '<p>Hello</p>'
 *
 * sanitizeInput('<a href="javascript:alert(1)">Click</a>')
 * // '<a>Click</a>'
 * ```
 */
export function sanitizeInput(
  input: string,
  options: SanitizeOptions = {},
): string {
  const {
    allowedTags = ['p', 'br', 'b', 'i', 'u', 'strong', 'em', 'a', 'span'],
    allowedAttributes = {
      a: ['href', 'title', 'target'],
      span: ['class'],
    },
    allowDataUrls = false,
    maxNestingDepth = 10,
  } = options

  // 如果不在浏览器环境，使用简单的转义
  if (typeof DOMParser === 'undefined') {
    return escapeHtml(input)
  }

  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(input, 'text/html')
    const body = doc.body

    // 递归清理节点
    cleanNode(body, allowedTags, allowedAttributes, allowDataUrls, maxNestingDepth, 0)

    return body.innerHTML
  } catch {
    // 解析失败，返回转义后的输入
    return escapeHtml(input)
  }
}

/**
 * 递归清理 DOM 节点
 */
function cleanNode(
  node: Element,
  allowedTags: string[],
  allowedAttributes: Record<string, string[]>,
  allowDataUrls: boolean,
  maxDepth: number,
  currentDepth: number,
): void {
  // 防止过深嵌套
  if (currentDepth > maxDepth) {
    node.innerHTML = ''
    return
  }

  // 收集要移除的子节点
  const nodesToRemove: Node[] = []

  node.childNodes.forEach((child) => {
    if (child.nodeType === Node.ELEMENT_NODE) {
      const element = child as Element
      const tagName = element.tagName.toLowerCase()

      // 移除不允许的标签
      if (!allowedTags.includes(tagName)) {
        // 对于危险标签，完全移除
        if (['script', 'style', 'iframe', 'object', 'embed', 'form'].includes(tagName)) {
          nodesToRemove.push(child)
        } else {
          // 对于其他标签，保留内容但移除标签
          const fragment = document.createDocumentFragment()
          while (element.firstChild) {
            fragment.appendChild(element.firstChild)
          }
          node.replaceChild(fragment, element)
        }
        return
      }

      // 清理属性
      const attrs = Array.from(element.attributes)
      attrs.forEach((attr) => {
        const attrName = attr.name.toLowerCase()

        // 移除事件处理器属性
        if (DANGEROUS_ATTRIBUTES.includes(attrName)) {
          element.removeAttribute(attr.name)
          return
        }

        // 检查是否为允许的属性
        const allowedForTag = allowedAttributes[tagName] || []
        if (!allowedForTag.includes(attrName)) {
          element.removeAttribute(attr.name)
          return
        }

        // 检查 href/src 属性的协议
        if (['href', 'src'].includes(attrName)) {
          const value = attr.value.toLowerCase().trim()

          // 检查危险协议
          const isDangerous = DANGEROUS_PROTOCOLS.some(protocol =>
            value.startsWith(protocol),
          )

          if (isDangerous) {
            element.removeAttribute(attr.name)
            return
          }

          // 检查 data URL
          if (!allowDataUrls && value.startsWith('data:')) {
            element.removeAttribute(attr.name)
          }
        }
      })

      // 递归清理子节点
      cleanNode(element, allowedTags, allowedAttributes, allowDataUrls, maxDepth, currentDepth + 1)
    }
  })

  // 移除危险节点
  nodesToRemove.forEach(n => node.removeChild(n))
}

/**
 * 验证输入
 *
 * @param input - 输入字符串
 * @param options - 验证选项
 * @returns 验证结果
 *
 * @example
 * ```ts
 * const result = validateInput('<script>alert(1)</script>')
 * // { valid: false, threats: ['script_tag'] }
 *
 * const result = validateInput('Hello World')
 * // { valid: true, threats: [] }
 * ```
 */
export function validateInput(
  input: string,
  options: {
    checkScriptTags?: boolean
    checkEventHandlers?: boolean
    checkDangerousProtocols?: boolean
    checkSqlInjection?: boolean
  } = {},
): {
  valid: boolean
  threats: string[]
} {
  const {
    checkScriptTags = true,
    checkEventHandlers = true,
    checkDangerousProtocols = true,
    checkSqlInjection = true,
  } = options

  const threats: string[] = []
  const lowerInput = input.toLowerCase()

  // 检查 script 标签
  if (checkScriptTags) {
    if (/<script[\s\S]*?>[\s\S]*?<\/script>/gi.test(input)) {
      threats.push('script_tag')
    }
    if (/<script/gi.test(input)) {
      threats.push('script_tag_open')
    }
  }

  // 检查事件处理器
  if (checkEventHandlers) {
    const eventPattern = new RegExp(`\\s(${DANGEROUS_ATTRIBUTES.join('|')})\\s*=`, 'gi')
    if (eventPattern.test(input)) {
      threats.push('event_handler')
    }
  }

  // 检查危险协议
  if (checkDangerousProtocols) {
    for (const protocol of DANGEROUS_PROTOCOLS) {
      if (lowerInput.includes(protocol)) {
        threats.push(`dangerous_protocol:${protocol}`)
      }
    }
  }

  // 检查 SQL 注入特征
  if (checkSqlInjection) {
    const sqlPatterns = [
      /'\s*or\s+'?1'?\s*=\s*'?1/gi,
      /'\s*;\s*drop\s+table/gi,
      /'\s*;\s*delete\s+from/gi,
      /union\s+select/gi,
      /'\s*--/gi,
    ]

    for (const pattern of sqlPatterns) {
      if (pattern.test(input)) {
        threats.push('sql_injection')
        break
      }
    }
  }

  return {
    valid: threats.length === 0,
    threats,
  }
}

/**
 * 编码 URL 参数
 *
 * @param params - 参数对象
 * @returns 编码后的查询字符串
 *
 * @example
 * ```ts
 * encodeUrlParams({ name: 'John Doe', age: 30 })
 * // 'name=John%20Doe&age=30'
 * ```
 */
export function encodeUrlParams(params: Record<string, unknown>): string {
  return Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => {
      const encodedKey = encodeURIComponent(key)
      const encodedValue = encodeURIComponent(String(value))
      return `${encodedKey}=${encodedValue}`
    })
    .join('&')
}

/**
 * 解码 URL 参数
 *
 * @param queryString - 查询字符串
 * @returns 解码后的参数对象
 *
 * @example
 * ```ts
 * decodeUrlParams('name=John%20Doe&age=30')
 * // { name: 'John Doe', age: '30' }
 * ```
 */
export function decodeUrlParams(queryString: string): Record<string, string> {
  const params: Record<string, string> = {}

  if (!queryString) return params

  const search = queryString.startsWith('?') ? queryString.slice(1) : queryString

  search.split('&').forEach((pair) => {
    const [key, value] = pair.split('=')
    if (key) {
      params[decodeURIComponent(key)] = value ? decodeURIComponent(value) : ''
    }
  })

  return params
}
