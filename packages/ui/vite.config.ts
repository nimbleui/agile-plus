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
        'form/index': 'src/form/index.ts',
        'collapsible/index': 'src/collapsible/index.ts',
        'tooltip/index': 'src/tooltip/index.ts',
        'popover/index': 'src/popover/index.ts',
        'dropdown-menu/index': 'src/dropdown-menu/index.ts',
        'select/index': 'src/select/index.ts',
        'ellipsis/index': 'src/ellipsis/index.ts',
        'input/index': 'src/input/index.ts',
        'popover/index': 'src/popover/index.ts',
        'dropdown-menu/index': 'src/dropdown-menu/index.ts',
      },
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: ['vue', '@agile-plus/headless', '@agile-plus/primitives'],
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
