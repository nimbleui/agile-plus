import DefaultTheme from 'vitepress/theme';

import { defineComponent, h, onMounted, watch } from 'vue';

import { useData } from 'vitepress';

import type { Theme } from 'vitepress';

import './custom.css';

// 引入组件库主入口以注入 Design Token 与组件样式。
// 该 import 的副作用（SCSS）由 package.json 的 sideEffects 声明保护，不会被 tree-shake。
import '@agile-plus/components';

/**
 * 把 VitePress 自身的明暗开关同步到组件库的 data-theme 预设上。
 *
 * 组件库主题走 html[data-theme]（见 _themes.scss），而 VitePress 只切 html.dark class；
 * 这里挂一个无渲染组件监听 isDark，复用文档站已有的开关，不再另做一套 UI。
 */
const ThemeSync = defineComponent({
  setup() {
    const { isDark } = useData();

    onMounted(() => {
      watch(
        isDark,
        (dark) => {
          document.documentElement.dataset.theme = dark ? 'dark' : 'light';
        },
        { immediate: true }
      );
    });

    return () => null;
  },
});

export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'nav-bar-content-after': () => h(ThemeSync),
    });
  },
} satisfies Theme;
