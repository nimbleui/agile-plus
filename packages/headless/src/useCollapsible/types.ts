import type { ComputedRef, MaybeRefOrGetter, Ref } from 'vue';

/**
 * useCollapsible 的配置项。
 *
 * 属性名对齐 Radix 的 `Collapsible`（Root）：`open` / `defaultOpen` / `disabled` /
 * `onOpenChange`。
 */
export interface UseCollapsibleOptions {
  /**
   * 受控展开状态，传入后进入受控模式。
   *
   * `undefined` 表示未受控。封装层的 Boolean prop 缺省会被 cast 成 false，
   * 必须显式留 undefined，否则非受控用法会被锁死在收起状态。
   */
  open?: MaybeRefOrGetter<boolean | undefined>;

  /**
   * 非受控模式的初始展开状态。
   *
   * @default false
   */
  defaultOpen?: boolean;

  /**
   * 是否禁用。
   *
   * 只禁用 Trigger 的点击，不阻止程序化 `open()`：受控用法下外部改 `open` 仍然生效，
   * 与 Radix 一致。
   *
   * @default false
   */
  disabled?: MaybeRefOrGetter<boolean | undefined>;

  /** 展开状态变化回调 */
  onOpenChange?: (open: boolean) => void;
}

/**
 * useCollapsible 的返回值。
 *
 * 契约与库内其它 Composable 一致：get*Attrs 只返回可 v-bind 的属性，
 * 事件处理器单独暴露给 v-on。
 */
export interface UseCollapsibleReturn {
  /** 当前是否展开 */
  isOpen: ComputedRef<boolean>;

  /** 当前是否禁用 */
  isDisabled: ComputedRef<boolean>;

  /** Content 的元素 id，Trigger 的 aria-controls 指向它 */
  contentId: string;

  /** 展开 */
  open(): void;

  /** 收起 */
  close(): void;

  /** 切换；禁用时不响应 */
  toggle(): void;

  /** 根元素属性表 */
  getRootAttrs(): Record<string, unknown>;

  /** 触发按钮属性表 */
  getTriggerAttrs(): Record<string, unknown>;

  /**
   * Content 属性表。
   *
   * @param isPresent Presence 是否仍要求元素留在 DOM（退出动画期间为 true）。
   * @returns id、hidden 与状态属性。
   */
  getContentAttrs(isPresent: boolean): Record<string, unknown>;

  /** Content 元素引用 */
  contentElement: Ref<HTMLElement | null>;

  /**
   * 绑定 Content 元素，传给模板的 `:ref`。
   *
   * @param node 元素实例，卸载时为 null。
   */
  setContentElement(node: unknown): void;

  /**
   * 重新测量 Content 的自然尺寸并写成 CSS 变量来源。
   *
   * 由 UI 层在「展开状态或 Presence 变化」之后调用：测量要发生在 DOM 补丁之后，
   * 量到的才是这一帧的真实高度。测量期间会临时把 transition / animation 归零，
   * 否则量到的是动画中间值。
   */
  measureContent(): void;

  /**
   * 实测尺寸对应的 CSS 变量。
   *
   * @returns 含 `--y-collapsible-content-height/width` 的样式对象，未测得时为空。
   */
  getContentVars(): Record<string, string>;
}
