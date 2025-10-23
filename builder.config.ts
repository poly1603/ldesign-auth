/**
 * @ldesign/auth 构建配置
 */

import { defineConfig } from '@ldesign/builder'

export default defineConfig({
  entry: 'src/index.ts',
  output: {
    formats: ['esm', 'cjs'],
    dir: {
      esm: 'es',
      cjs: 'lib',
    },
  },
  external: [
    'vue',
    '@ldesign/http',
    '@ldesign/cache',
    '@ldesign/crypto',
    '@ldesign/router',
    '@ldesign/shared',
    '@ldesign/device',
  ],
  dts: true,
  sourcemap: true,
  minify: false, // 库不需要压缩，让使用者决定
  clean: true,
})

