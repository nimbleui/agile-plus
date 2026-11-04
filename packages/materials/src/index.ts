import type { Component } from 'vue';

import { components as atomComponents } from './atoms/components';
import { components as styledComponents } from './styled/components';

/**
 * 物料插件出口。
 *
 * 平台的登记方式是「清单 + 模块加载器」两件事：
 *
 * ```ts
 * loader.register({
 *   manifest: (await import('@agile-plus/materials/manifest')).manifest,
 *   load: () => import('@agile-plus/materials'),
 * });
 * ```
 *
 * 清单单独一个入口是为了让物料面板不等组件代码就能渲染；`load` 返回的模块命名空间里，
 * 物料服务先读 `components` 名字表，读不到才回落 `default`。
 *
 * 这里刻意不再导出 `manifest`：两个入口共享同一份数据时，Rollup 会把它抽成带哈希名的
 * 公共块（`manifest-BVJezFnA.js`），`./manifest` 入口退化成二次跳转，而远程物料包正是
 * 按固定 URL 取清单的。清单只从 `@agile-plus/materials/manifest` 拿。
 *
 * 名字表把两个层合成一张：`agile-plus.*` 是带样式的成品组件，`agile-plus.ui.*` 是
 * 无样式的可组合原子件。平台按物料名查表，不关心它来自哪一层。
 */
export const components: Record<string, Component> = {
  ...styledComponents,
  ...atomComponents,
};

export default { components };
