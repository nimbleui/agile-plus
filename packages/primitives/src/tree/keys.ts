import type { TreeKey } from './types';

/**
 * 按键增删一个集合成员，返回新数组。
 *
 * 展开与选中共用同一份键集合语义：加入时保持已有顺序、追加到末尾（多选时勾选顺序对
 * 「按选择顺序导出」这类下游有意义），移除时过滤。已存在的键不重复加入，因此重复调用幂等，
 * 移除一个不在集合里的键也得到原样——陈旧键（数据刷新后残留的展开键）应当被忽略而不是报错。
 *
 * @param keys 现有键集合。
 * @param key 目标键。
 * @param included true 为加入，false 为移除。
 * @returns 新数组，不修改入参。
 */
export function toggleTreeKey(
  keys: readonly TreeKey[],
  key: TreeKey,
  included: boolean
): TreeKey[] {
  if (included) {
    return keys.includes(key) ? keys.slice() : [...keys, key];
  }

  return keys.filter((item) => item !== key);
}
