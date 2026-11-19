import type { ComputedRef, MaybeRefOrGetter } from 'vue';

/**
 * useKeepMounted 的配置项。
 */
export interface UseKeepMountedOptions {
  /**
   * 浮层的开合状态，一旦观测到 `true` 就记住这件事。
   *
   * 用 MaybeRefOrGetter 而不是裸 boolean，理由与 `usePresence` 的 `present` 相同：
   * 封装层传进来的是响应式 props / ref，裸值会在展开时被固化成快照。
   */
  open: MaybeRefOrGetter<boolean>;

  /**
   * 常驻策略开关，通常直接接组件的 `keepMounted` prop。
   *
   * 缺省视为开启：判定本身只在「已经打开过」之后才有输出，把默认值交给调用方更省样板。
   */
  enabled?: MaybeRefOrGetter<boolean>;
}

/**
 * useKeepMounted 的返回值。
 */
export interface UseKeepMountedReturn {
  /** 是否应当把内容继续留在 DOM 里，直接并进 `usePresence` 的 `present`。 */
  keepMounted: ComputedRef<boolean>;
}
