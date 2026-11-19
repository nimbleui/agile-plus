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
      // 必须开启：默认重映射只把模块级语句归到 SFC 上，setup 函数体整个丢失，
      // 零测试的 TabsRoot.vue 会报 100%。开启后同一文件报 0%，components 层从假 100% 回到真实 1%。
      experimentalAstAwareRemapping: true,
      reporter: ['text', 'json-summary', 'lcov'],
      // SFC 是 ui / components 两层的主要实现，只统计 .ts 会把这两层整个漏掉。
      include: ['packages/*/src/**/*.{ts,vue}'],
      exclude: [
        '**/index.ts',
        '**/*.d.ts',
        // 纯类型声明编译后没有可执行语句，计入会以 0% 拉低基线。唯一带运行时内容的是
        // primitives 的 toast/toggle types.ts，那里只有模块级常量、无分支无函数，
        // 真正的逻辑在同目录的 timer/swipe/announce/group 里，仍然计入。
        '**/types.ts',
      ],
      // 2026-11-12 实测基线向下取整，按包分别设限：这是棘轮，只许上调不许下调。
      // components 层当前没有任何测试，阈值只能贴地，等该层补测试时同步抬高。
      thresholds: {
        'packages/primitives/src/**': { statements: 75, branches: 75, functions: 89, lines: 74 },
        'packages/headless/src/**': { statements: 73, branches: 63, functions: 75, lines: 76 },
        'packages/ui/src/**': { statements: 70, branches: 64, functions: 73, lines: 71 },
        'packages/materials/src/**': { statements: 86, branches: 90, functions: 100, lines: 86 },
        'packages/components/src/**': { statements: 1, branches: 0, functions: 0, lines: 1 },
      },
    },
  },
});
