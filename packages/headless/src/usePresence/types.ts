import type { ComputedRef, MaybeRefOrGetter, Ref } from 'vue';

/**
 * usePresence 的配置项。
 */
export interface UsePresenceOptions {
  /**
   * 元素是否应当存在于 DOM 中。
   *
   * 用 MaybeRefOrGetter 而不是裸 boolean：组件封装层传入的是响应式 props，裸值会在
   * 展开时固化成快照，外部再次打开时 Presence 收不到变化、元素永远不会重新挂载。
   */
  present: MaybeRefOrGetter<boolean>;
}

/**
 * usePresence 的返回值。
 *
 * 契约与库内其它 composable 一致：这里不返回可 v-bind 的 ARIA 属性，因为 Presence
 * 不产生任何属性，只决定渲染与否。
 */
export interface UsePresenceReturn {
  /** 是否应当渲染元素；退出动画期间仍为 true */
  isPresent: ComputedRef<boolean>;

  /** 当前被观测的元素，未挂载时为 null */
  element: Ref<HTMLElement | null>;

  /**
   * 绑定元素的入口，传给模板的 `:ref`。
   *
   * 用函数而不是直接把 Ref 交给模板：模板上的 `:ref` 需要同时能写内部状态和
   * 处理卸载时的置空，函数入口是 Vue 明确支持的写法。
   *
   * @param node 元素实例，卸载时为 null。
   */
  setElement(node: unknown): void;
}
