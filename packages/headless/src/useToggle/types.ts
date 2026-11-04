import type { ComputedRef, MaybeRefOrGetter } from 'vue';

/**
 * useToggle 的配置项。
 *
 * 受控与非受控由 `pressed` 是否提供决定，语义与 Radix 的
 * `pressed / defaultPressed / onPressedChange` 一一对应。
 */
export interface UseToggleOptions {
  /**
   * 受控按下状态，传入后进入受控模式。
   *
   * `undefined` 表示未受控；封装层必须让缺省保持 undefined，Boolean prop 被 cast 成
   * false 会让开关变成「受控且恒为未按下」。
   */
  pressed?: MaybeRefOrGetter<boolean | undefined>;

  /** 非受控模式的初始按下状态，默认 false */
  defaultPressed?: boolean;

  /** 是否禁用，禁用时不响应点击且不参与罗盘焦点 */
  disabled?: MaybeRefOrGetter<boolean | undefined>;

  /** 按下状态变化回调 */
  onPressedChange?: (pressed: boolean) => void;
}

/**
 * useToggle 的返回值。
 *
 * 契约：get*Props 只返回可 v-bind 的属性，事件处理器单独暴露给 v-on。
 */
export interface UseToggleReturn {
  /** 当前按下状态 */
  pressed: ComputedRef<boolean>;

  /** 当前禁用状态 */
  disabled: ComputedRef<boolean>;

  /**
   * 写入按下状态。
   *
   * @param value 目标状态。
   */
  setPressed(value: boolean): void;

  /** 切换按下状态 */
  toggle(): void;

  /**
   * 获取开关根元素属性：`type="button"`、`aria-pressed`、`data-state`、`data-disabled`。
   *
   * @returns 可直接 v-bind 的属性集合。
   */
  getRootProps(): Record<string, unknown>;

  /** 根元素点击处理器，绑定到 @click */
  onClick(): void;
}
