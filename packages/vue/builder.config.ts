/**
 * @ldesign/auth-vue 构建配置
 */

import { defineConfig } from '@ldesign/builder'

export default defineConfig({
  // 入口文件
  input: 'src/index.ts',

  // 输出配置
  output: {
    format: ['esm', 'cjs'],
    esm: { dir: 'es' },
    cjs: { dir: 'lib' },
  },

  // 是否生成类型声明
  dts: true,

  // 外部依赖
  external: [
    'vue',
    'vue-router',
    '@ldesign/auth-core',
  ],

  // 清理输出目录
  clean: true,

  // 是否压缩
  minify: false,

  // 源码映射
  sourcemap: false,
})

