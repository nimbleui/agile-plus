import type {
  EventDefinition,
  MaterialContribution,
  PropSchemaItem,
  SlotDefinition,
} from './protocol';

/** 部件与本层没有独立外观的条目的默认落点尺寸：够选够拖，但不假装是一块内容区 */
const DEFAULT_SIZE = { width: 120, height: 32 };

/** 物料清单条目的作者视角写法，字段与 {@link MaterialContribution} 一一对应 */
export type MaterialSpec = {
  /** 物料名；成品组件用 `agile-plus.`，原子件用 `agile-plus.ui.` */
  name: string;
  title: string;
  /** 物料面板分组 */
  category: string;
  /** 图标名，必须取自平台共享图标注册表 */
  icon: string;
  /** 面板可编辑属性；键必须是组件真实 prop 名 */
  props?: Record<string, PropSchemaItem>;
  /** 拖入时的默认宽高 */
  size?: { width: number; height: number };
  /** 写进 snippet 的初值；组件有必填 prop 时必须在这里给出 */
  initial?: Record<string, string | number | boolean | null>;
  /** 是否可接收子节点：根件与需要往里放部件的容器为 true */
  container?: boolean;
  /**
   * 这个内容分发点只收哪些物料（物料名列表）。
   *
   * 生成一个覆盖整个容器的 `default` 插槽 —— 只适用于「本来就只有一个默认插槽」的组件，
   * 也就是原子件的根件与大部分成品容器。与 `slots` 互斥。
   */
  accepts?: string[];
  /**
   * 具名插槽清单，用于真的开放了多个分发点的组件（如带 trigger / title 的对话框）。
   *
   * 顺序有意义：先写窄条区域，最后写覆盖全容器的兜底插槽。与 `accepts` 互斥。
   */
  slots?: SlotDefinition[];
  /** 必须放在哪个物料里面；只有部件填写 */
  parent?: string;
  events?: EventDefinition[];
};

/**
 * 物料清单条目的构造器，两个层共用。
 *
 * 抽象理由：六十多条条目都要重复 `module`、`snippet.id`、`snippet.componentName`、
 * `snippet.name` 这四个与 `name` / `title` 完全同源的字段，手写最容易出的错是
 * `componentName` 与 `name` 对不上 —— 平台不报错，只在画布上画成占位块。这里把同源关系
 * 收敛到一处，同时给 `props` 补上面板要求的 `{ type: 'object' }` 外壳。
 *
 * 刻意不做的事：不自动从 `props` 的 `default` 生成 snippet 初值。落点节点只读
 * `snippet.props`（见 canvas-drop），组件默认值由组件自己的运行时 default 生效，两条路径
 * 混在一起反而看不清哪个值真正落进了 schema。需要拖出来就带特定初值时显式写 `initial`。
 *
 * @throws 同时给出 `accepts` 与 `slots` 时抛错：两者都在定义分发点，静默合并会让「到底
 * 有几格、哪格收什么」这件事看不出来。
 */
export function defineMaterial(spec: MaterialSpec): MaterialContribution {
  if (spec.accepts !== undefined && spec.slots !== undefined) {
    throw new Error(`[materials] ${spec.name} 同时声明了 accepts 与 slots，只留一个`);
  }

  const slots: SlotDefinition[] | undefined =
    spec.slots ??
    (spec.accepts === undefined
      ? undefined
      : [{ name: 'default', title: '内容', accepts: spec.accepts }]);

  return {
    name: spec.name,
    title: spec.title,
    category: spec.category,
    icon: spec.icon,
    props: { type: 'object', properties: spec.props ?? {} },
    module: './dist/index.js',
    snippet: {
      id: `${spec.name}-snippet`,
      componentName: spec.name,
      name: spec.title,
      layout: {
        mode: 'absolute',
        rect: {
          x: 0,
          y: 0,
          width: spec.size?.width ?? DEFAULT_SIZE.width,
          height: spec.size?.height ?? DEFAULT_SIZE.height,
        },
      },
      props: spec.initial ?? {},
    },
    ...(spec.container === undefined ? {} : { container: spec.container }),
    ...(slots === undefined ? {} : { slots }),
    ...(spec.parent === undefined ? {} : { allowedParents: [spec.parent] }),
    ...(spec.events === undefined ? {} : { events: spec.events }),
  };
}
