import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'dialog/index': 'src/dialog/index.ts',
    'flex/index': 'src/flex/index.ts',
    'tabs/index': 'src/tabs/index.ts',
    'radio-group/index': 'src/radio-group/index.ts',
    'checkbox/index': 'src/checkbox/index.ts',
    'scroll-area/index': 'src/scroll-area/index.ts',
    'toast/index': 'src/toast/index.ts',
    'presence/index': 'src/presence/index.ts',
    'toggle/index': 'src/toggle/index.ts',
    'switch/index': 'src/switch/index.ts',
    'slider/index': 'src/slider/index.ts',
    'dom/index': 'src/dom/index.ts',
    'form/index': 'src/form/index.ts',
    'progress/index': 'src/progress/index.ts',
    'collapsible/index': 'src/collapsible/index.ts',
    'floating/index': 'src/floating/index.ts',
    'tooltip/index': 'src/tooltip/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
});
