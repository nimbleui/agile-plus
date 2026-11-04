import { fileURLToPath } from 'node:url';

import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

import { workspaceSourceAlias } from './scripts/workspace-source-alias.mts';

export default defineConfig({
  // UI 层的组件是 SFC，必须启用 Vue 插件才能被测试导入。
  plugins: [vue()],
  // workspace 包之间按源码解析，测试无需先构建 dist 即可跑到最新实现。
  resolve: {
    alias: workspaceSourceAlias(fileURLToPath(new URL('.', import.meta.url))),
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['packages/**/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**/*.ts'],
      exclude: ['**/index.ts', '**/*.d.ts'],
    },
  },
});
