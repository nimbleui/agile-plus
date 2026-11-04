import { computed, shallowRef, toValue } from 'vue';

import type { ComputedRef, MaybeRefOrGetter } from 'vue';

/**
 * 受控 / 非受控状态。
 *
 * 这是 Radix `useControllableState` 的对应物，也是本库所有带状态组件的真源判定入口。
 *
 * @template T 值类型。整体替换语义（数组也是换一个新数组而不是就地改），因此内部用
 * shallowRef：深响应会把值里嵌套的 Ref 拆包，而这个 hook 无法保证调用方传进来的形状。
 */
export interface UseControllableOptions<T> {
  /**
   * 受控值来源。
   *
   * **`undefined` 就是「未受控」的唯一判据**：封装层必须让 Boolean prop 缺省保持
   * undefined，被 cast 成 false 会让组件变成「受控且恒为该值」，非受控用法静默失效。
   */
  value?: MaybeRefOrGetter<T | undefined>;

  /** 非受控模式的初始值，必须由调用方给出（不提供隐式零值，避免各组件默认值漂移） */
  defaultValue: T;

  /**
   * 值变化回调。
   *
   * 受控模式下同样会触发，且此时它是新值唯一的落地路径；因此回调不能只在非受控分支调用。
   */
  onChange?: (value: T) => void;
}

/**
 * useControllable 的返回值。
 */
export interface UseControllableReturn<T> {
  /** 当前值：受控时跟随外部来源，否则是内部状态 */
  value: ComputedRef<T>;

  /** 是否处于受控模式 */
  isControlled: ComputedRef<boolean>;

  /**
   * 写入新值。
   *
   * 顺序固定为「先落地内部状态，再通知外部」：这样回调里同步读 `value` 得到的就是新值。
   * 受控模式下不写内部（写了就是越权改写调用方的状态），只通知。
   *
   * @param next 目标值。
   */
  set(next: T): void;

  /**
   * 只修正内部值，不通知外部。
   *
   * 留给「生命周期兜底修正」这类场景：子项被卸载时要把选中值清掉，但那不是用户操作，
   * 不该冒出一个 change 事件。除这种场合外都应该用 set。
   *
   * @param next 目标值；受控模式下无操作。
   */
  replace(next: T): void;
}

/**
 * 创建受控 / 非受控状态。
 *
 * @param options 受控来源、默认值与变化回调。
 * @returns 值、受控判定与两种写入方式。
 */
export function useControllable<T>(options: UseControllableOptions<T>): UseControllableReturn<T> {
  const controlled = computed(() => toValue(options.value));

  const isControlled = computed(() => controlled.value !== undefined);

  const internal = shallowRef<T>(options.defaultValue);

  const value = computed<T>(() => {
    const current = controlled.value;

    return current === undefined ? internal.value : current;
  });

  function set(next: T): void {
    if (!isControlled.value) internal.value = next;

    options.onChange?.(next);
  }

  function replace(next: T): void {
    if (isControlled.value) return;

    internal.value = next;
  }

  return { value, isControlled, set, replace };
}
