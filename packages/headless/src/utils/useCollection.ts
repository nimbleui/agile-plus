import { computed, shallowRef } from 'vue';

import type { ComputedRef } from 'vue';

/**
 * useCollection 的配置项。
 */
export interface UseCollectionOptions<T> {
  /**
   * 从条目取唯一键。
   *
   * 同键重复登记时覆盖旧条目而不是追加：热更新或项的 value 变化会让 setup/watch 再跑
   * 一次，追加会让同一个条目在遍历顺序里出现两遍。
   *
   * @param item 条目。
   * @returns 唯一键。
   */
  key: (item: T) => string;
}

/**
 * useCollection 的返回值。
 */
export interface UseCollectionReturn<T> {
  /** 按登记顺序排列的条目；消费方按自己的语义再过滤（可用项、活动项等） */
  items: ComputedRef<T[]>;

  /**
   * 登记一个条目。
   *
   * @param item 条目。
   * @returns 注销函数，只摘掉这个实例本身。
   */
  add(item: T): () => void;

  /**
   * 按键注销。
   *
   * @param key 条目键。
   */
  remove(key: string): void;

  /**
   * 原地替换同键条目。
   *
   * @param item 新条目，键必须与已登记的一致。
   */
  replace(item: T): void;
}

/**
 * 父级组件登记子项的共享集合。
 *
 * 「子组件挂载时把自己登记进父级、卸载时摘掉」在 RadioGroup、Toast、ToggleGroup 里
 * 各写了一遍，而且都踩过同一个坑：**条目里带 Ref 时不能用深响应**——`ref([])` 会拆掉
 * 嵌套 Ref，父级读到的 `entry.element` 变成元素而不是 Ref，键盘导航与焦点回还就会
 * 读到过期快照。这里用 shallowRef 把这个结论只解释一次。
 *
 * 顺序按登记顺序（即挂载顺序，模板里就是 DOM 顺序），需要别的顺序由调用方反转。
 *
 * @param options 取键方式。
 * @returns 条目集合与登记入口。
 */
export function useCollection<T>(options: UseCollectionOptions<T>): UseCollectionReturn<T> {
  const entries = shallowRef<T[]>([]);

  const items = computed(() => entries.value);

  function add(item: T): () => void {
    const key = options.key(item);

    entries.value = [...entries.value.filter((existing) => options.key(existing) !== key), item];

    return () => {
      entries.value = entries.value.filter((existing) => existing !== item);
    };
  }

  function remove(key: string): void {
    entries.value = entries.value.filter((existing) => options.key(existing) !== key);
  }

  function replace(item: T): void {
    const key = options.key(item);

    entries.value = entries.value.map((existing) =>
      options.key(existing) === key ? item : existing
    );
  }

  return { items, add, remove, replace };
}
