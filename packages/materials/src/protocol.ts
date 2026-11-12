/**
 * new-cordis 物料协议在本仓库的最小镜像。
 *
 * 为什么在本包重述类型而不直接依赖平台的 `@lc/contracts`：物料包要能独立发布到 npm，
 * 不该把私有内核包拖进公共组件库的依赖树；平台装载器对清单做鸭子类型校验，字段名与
 * 取值一致即可装配。代价是这份镜像需要人工同步 —— 改协议时与
 * `packages/contracts/src/services/material.ts`、`packages/schema/src/events.ts`
 * 同批提交，两侧不一致会在平台登记阶段以「缺字段」的形式暴露。
 *
 * 这里一律用 `type` 而不是 `interface`：平台的属性面板把 `props` 当作
 * `Record<string, unknown>` 读取，TypeScript 只给类型别名隐式索引签名，
 * interface 赋给它会报「缺少索引签名」，物料清单就写不进贡献。
 */

/** 属性面板可识别的属性类型；与平台 `SetterKind` 的映射关系见 {@link PropSchemaItem} */
export type PropSchemaType = 'string' | 'number' | 'boolean' | 'object' | 'array';

/**
 * 单个属性的面板描述。
 *
 * 面板的推导顺序是 `format: 'color'` → 颜色，`enum` 是数组 → 下拉，其余按 `type`。
 * 两条来自平台实现的硬约束写在这里，因为它们决定 v1 能暴露什么属性：
 * - `object` / `array` 会退化成文本框，且写回的是字符串，所以数组型属性（如 Slider 的
 *   `defaultValue: number[]`）现在还不能登记，等平台补列表设置器；
 * - 表达式模式只对文本型属性开放，布尔与数值属性无法绑定 `{{ }}`。
 */
export type PropSchemaItem = {
  /** 面板上的字段名 */
  title: string;
  /** 字段用途与取值约束，属性面板会原样展示 */
  description?: string;
  /** 值类型；缺省时面板按字符串处理 */
  type?: PropSchemaType;
  /** 候选值；只放字符串元素，数值与布尔会在写回时变成字符串 */
  enum?: readonly string[];
  /** 标注为颜色属性，面板换成取色器 */
  format?: 'color';
  /** 建议初值；面板不会读它，真正决定拖入时取值的是 snippet */
  default?: string | number | boolean | null;
};

/** 物料属性表；平台按 `properties` 的键顺序生成表单 */
export type PropsSchema = {
  type: 'object';
  properties: Record<string, PropSchemaItem>;
};

/** 事件参数声明；`name` 决定表达式里 `event.<name>` 的可访问名 */
export type EventParameter = {
  name: string;
  /** 给人看的类型标注，运行时以组件真实 emit 为准 */
  type: string;
  description?: string;
};

/** 物料对外事件声明；事件名必须与组件 emit 的名字逐字一致 */
export type EventDefinition = {
  name: string;
  title: string;
  parameters?: EventParameter[];
  description?: string;
};

/**
 * 插槽在容器内的命中区域，用容器矩形的比例（0–1）描述。
 *
 * 平台用比例而不是像素，是为了让容器被拉伸时贴边区域仍然贴在正确的边上。
 */
export type SlotRegion = {
  /** 区域左边界相对容器宽度的比例 @default 0 */
  x?: number;
  /** 区域上边界相对容器高度的比例 @default 0 */
  y?: number;
  /** 区域宽度相对容器宽度的比例 @default 1 */
  width?: number;
  /** 区域高度相对容器高度的比例 @default 1 */
  height?: number;
};

/** 组件的一个内容分发点 */
export type SlotDefinition = {
  /** 插槽名；`default` 是降级落点，一个容器只应有一个全屏兜底插槽 */
  name: string;
  title: string;
  description?: string;
  /** 允许接收的**物料名**；空或缺省表示不限 */
  accepts?: string[];
  /** 子节点数量上限；缺省或 0 表示不限 */
  maxChildren?: number;
  /**
   * 命中区域；缺省覆盖整个容器矩形。
   *
   * 同一容器里多个全屏区域按声明顺序取先者，所以「先写窄条、最后写全屏兜底」是
   * 落点判定要求的写法，不是可选偏好。
   */
  region?: SlotRegion;
};

/** 拖入画布时生成的节点；坐标由落点决定，`rect` 里只有宽高有意义 */
export type MaterialNodeSnippet = {
  id: string;
  /** 必须与所在物料条目的 `name` 一致，否则落点解析不到组件 */
  componentName: string;
  /** 图层树显示名 */
  name?: string;
  props?: Record<string, string | number | boolean | null>;
  layout?: {
    mode?: 'flow' | 'absolute';
    rect?: { x: number; y: number; width: number; height: number };
  };
};

/** 一条物料贡献 */
export type MaterialContribution = {
  /** 物料唯一名，带命名空间前缀以免与其他物料包撞名 */
  name: string;
  title: string;
  /** 物料面板分组 */
  category: string;
  /** 图标名，必须取自平台共享图标注册表，未注册名会回退成方框 */
  icon?: string;
  props: PropsSchema;
  /** 包内模块名，与插件名拼成全局模块 key；多条物料共用一个模块时只加载一次 */
  module: string;
  snippet?: MaterialNodeSnippet;
  /** 是否可作为容器接收子节点（画布命中测试按它判定空容器能否投递） */
  container?: boolean;
  /**
   * 组件对外暴露的具名插槽。
   *
   * 两个执行点：拖入时 `canvas-drop` 按 `region` 判定落到哪一格，被 `accepts` 拒绝或
   * `maxChildren` 占满时降级到 `default`，再不行回落 `children`；渲染时
   * `splitSlotChildren` 把「已声明插槽」里的子节点交给组件对应的具名插槽，没声明的内容
   * 继续按兄弟节点平铺。所以这份声明不只是元数据 —— 不写插槽，放进容器里的部件就进不到
   * 组件内部，拿不到父级上下文。
   */
  slots?: SlotDefinition[];
  /**
   * 允许的父物料。
   *
   * 协议里有这个字段，但平台当前没有任何消费点（只有类型声明），写它只作为面板与设计期
   * 校验的元数据。真正生效的归属约束是父件 `slots[].accepts`。
   */
  allowedParents?: string[];
  events?: EventDefinition[];
  /** 同名物料冲突时的优先级，越大越优先 */
  priority?: number;
};

/** 插件清单；纯声明式物料插件不写 `main` 与 `apply` */
export type PluginManifest = {
  name: string;
  displayName?: string;
  version: string;
  engines: { lowcode: string };
  requires?: string[];
  activationEvents?: string[];
  provides?: string[];
  /** 认证等级；由组件库团队维护、非平台内置，取 `verified` */
  certification?: 'platform' | 'verified' | 'community';
  /** 物料需要内联渲染，因此必须是 `inline` */
  executionProfile?: 'inline' | 'iframe' | 'worker' | 'server';
  uiReview?: 'inline' | 'sandboxed';
  contributes?: { materials?: MaterialContribution[] };
};
