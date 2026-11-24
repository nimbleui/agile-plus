import type { PluginManifest } from './protocol';
import { materials as atomMaterials } from './atoms/materials';
import { materials as compositeComponentMaterials } from './styled/materials-composite';
import { materials as leafComponentMaterials } from './styled/materials';

/**
 * 物料插件清单：纯数据，不 import 任何组件代码。
 *
 * 平台在插件登记阶段就读这份清单，物料面板与属性面板都先于组件产物可用，所以装配层
 * 必须保持零运行时依赖（`./protocol` 与各层 `materials.ts` 都是 type-only 或纯数据，
 * 构建出的 `dist/manifest.js` 里不引组件）。
 *
 * 两个层合成一个插件，但命名与类别分开，设计器里不会混：
 * - `agile-plus.*`：成品组件，带样式；叶子件在 `styled/materials.ts`，
 *   需要往里放内容的组合件在 `styled/materials-composite.ts`（按真实具名插槽逐格声明）；
 * - `agile-plus.ui.*`：原子件，无样式，靠组合成控件。
 */
export const manifest: PluginManifest = {
  name: 'materials-agile-plus',
  displayName: '组件库物料',
  version: '0.2.0',
  engines: { lowcode: '^0.1.0' },
  certification: 'verified',
  executionProfile: 'inline',
  uiReview: 'inline',
  contributes: {
    materials: [...leafComponentMaterials, ...compositeComponentMaterials, ...atomMaterials],
  },
};
