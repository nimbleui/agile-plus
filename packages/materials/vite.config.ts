import { defineConfig } from 'vite';

/**
 * 物料插件产物配置。
 *
 * 两个入口必须分开：`manifest` 是纯数据（零运行时依赖），平台在组件代码下载之前
 * 就要能渲染物料面板；`index` 才引入组件实现，由平台在首次渲染时懒加载。
 * 只出 ESM 是因为装载协议里的模块加载器返回 Promise，浏览器动态 import 用不到 cjs。
 */
export default defineConfig({
  build: {
    lib: {
      entry: {
        index: 'src/index.ts',
        manifest: 'src/manifest.ts',
      },
      formats: ['es'],
    },
    rollupOptions: {
      // 组件层保持外部化：物料包与组件库同版本演进，打进产物会造成 Vue 组件双实例。
      // 用前缀判定而不是包名枚举，因为物料按子路径引入（@agile-plus/components/slider），
      // 字符串外部化只匹配整串模块 ID，写成包名会把组件源码打进产物。
      external: (id: string) => id === 'vue' || id.startsWith('@agile-plus/'),
    },
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
  },
});
