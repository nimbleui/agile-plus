import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: {
        index: 'src/index.ts',
        'dialog/index': 'src/dialog/index.ts',
        'tabs/index': 'src/tabs/index.ts',
        'radio-group/index': 'src/radio-group/index.ts',
        'flex/index': 'src/flex/index.ts',
        'checkbox/index': 'src/checkbox/index.ts',
        'scroll-area/index': 'src/scroll-area/index.ts',
        'toast/index': 'src/toast/index.ts',
        'toggle/index': 'src/toggle/index.ts',
        'switch/index': 'src/switch/index.ts',
        'slider/index': 'src/slider/index.ts',
        'progress/index': 'src/progress/index.ts',
        'collapsible/index': 'src/collapsible/index.ts',
      },
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      // @agile-plus/headless 由 @agile-plus/ui 的产物间接引用，必须保持外部化：
      // pnpm 只把直接依赖 link 到本包，从 components 目录无法解析传递依赖。
      external: ['vue', '@agile-plus/ui', '@agile-plus/headless', '@agile-plus/primitives'],
      output: {
        globals: {
          vue: 'Vue',
        },
      },
    },
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
  },
});
