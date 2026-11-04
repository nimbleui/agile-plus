import DefaultTheme from 'vitepress/theme';

import type { Theme } from 'vitepress';

import './custom.css';

// 引入组件库主入口以注入 Design Token 与组件样式。
// 该 import 的副作用（SCSS）由 package.json 的 sideEffects 声明保护，不会被 tree-shake。
import '@agile-plus/components';

export default {
  extends: DefaultTheme,
} satisfies Theme;
