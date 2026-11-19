import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitepress';

import { workspaceSourceAlias } from '../../../scripts/workspace-source-alias.mts';

// config.mts 位于 apps/docs/.vitepress/，因此需要上溯三级才到仓库根目录。
const resolveRoot = () => fileURLToPath(new URL('../../../', import.meta.url));

export default defineConfig({
  lang: 'zh-CN',
  title: '无头组件库',
  description: '分层解耦、无障碍优先、样式完全可替换的 Vue 3 组件体系',

  // workspace 包按 exports.source 解析到 src，文档站修改组件实现即时生效，无需先构建 dist。
  // VitePress 1.6 内置 Vite 5，不支持 resolve.conditions，因此 alias 由导出生成而非手写。
  vite: {
    resolve: {
      alias: workspaceSourceAlias(resolveRoot()),
    },
    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern-compiler',
        },
      },
    },
  },

  themeConfig: {
    nav: [
      { text: '指南', link: '/guide/architecture' },
      { text: '组件', link: '/components/dialog' },
    ],
    sidebar: {
      '/guide/': [
        {
          text: '基础',
          items: [
            { text: '分层架构', link: '/guide/architecture' },
            { text: '快速开始', link: '/guide/getting-started' },
          ],
        },
      ],
      '/components/': [
        {
          text: '交互组件',
          items: [
            { text: 'Dialog 对话框', link: '/components/dialog' },
            { text: 'Tooltip 提示', link: '/components/tooltip' },
            { text: 'Popover 气泡卡片', link: '/components/popover' },
            { text: 'DropdownMenu 下拉菜单', link: '/components/dropdown-menu' },
            { text: 'Tabs 标签页', link: '/components/tabs' },
            { text: 'RadioGroup 单选组', link: '/components/radio-group' },
            { text: 'Select 下拉选择', link: '/components/select' },
            { text: 'DatePicker 日期选择', link: '/components/date-picker' },
            { text: 'DateRangePicker 期间选择', link: '/components/date-range-picker' },
            { text: 'Ellipsis 文本省略', link: '/components/ellipsis' },
            { text: 'Slider 滑块', link: '/components/slider' },
            { text: 'Checkbox 复选框', link: '/components/checkbox' },
            { text: 'ScrollArea 滚动区域', link: '/components/scroll-area' },
            { text: 'Toast 通知', link: '/components/toast' },
            { text: 'Toggle 开关按钮', link: '/components/toggle' },
            { text: 'Switch 开关', link: '/components/switch' },
            { text: 'Collapsible 折叠区', link: '/components/collapsible' },
            { text: 'Input 输入框', link: '/components/input' },
            { text: 'Textarea 多行输入', link: '/components/textarea' },
            { text: 'Button 按钮', link: '/components/button' },
          ],
        },
        {
          text: '布局组件',
          items: [{ text: 'Flex 弹性布局', link: '/components/flex' }],
        },
        {
          text: '反馈组件',
          items: [
            { text: 'Progress 进度条', link: '/components/progress' },
            { text: 'Form 表单', link: '/components/form' },
          ],
        },
      ],
    },
    outline: { level: [2, 3], label: '本页目录' },
    socialLinks: [],
  },
});
