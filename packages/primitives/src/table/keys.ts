import type { TableSelectionState } from './types';

/**
 * 按键增删一个集合成员，返回新数组。
 *
 * 选择与展开共用同一份键集合语义：加入时保持已有顺序、追加到末尾（勾选顺序
 * 对「按选择顺序导出」这类下游有意义），移除时过滤。已存在的键不重复加入，
 * 因此重复调用是幂等的。
 *
 * @param keys 现有键集合。
 * @param key 目标键。
 * @param included true 为加入，false 为移除。
 * @returns 新数组，不修改入参。
 */
export function toggleTableKey(keys: readonly string[], key: string, included: boolean): string[] {
  if (included) {
    return keys.includes(key) ? keys.slice() : [...keys, key];
  }

  return keys.filter((item) => item !== key);
}

/**
 * 全选框的三态。
 *
 * 只看「当前可选择的行」：禁用行不参与全选，也不把全选框拖成半选——
 * 用户点全选时它们本来就不会被勾上，算进去会让全选框永远到不了 checked。
 * 没有任何可选行时为 unchecked（全选框禁用），而不是 indeterminate。
 *
 * @param selectedKeys 已选键集合，可能含其他页的键。
 * @param selectableKeys 当前页所有可选行的键。
 * @returns 全选框应呈现的三态。
 */
export function getTableSelectionState(
  selectedKeys: readonly string[],
  selectableKeys: readonly string[]
): TableSelectionState {
  if (selectableKeys.length === 0) return 'unchecked';

  const selectedCount = selectableKeys.filter((key) => selectedKeys.includes(key)).length;

  if (selectedCount === 0) return 'unchecked';
  if (selectedCount === selectableKeys.length) return 'checked';

  return 'indeterminate';
}

/**
 * 全选 / 取消全选后的键集合。
 *
 * 作用域是当前页的可选行：勾选时把当前页可选键并入已有集合（其他页已选的键
 * 原样保留，即跨页保留选择）；取消时只移除当前页可选键，其他页的选择不受牵连。
 * 这与主流表格「全选只作用于本页」的语义一致。
 *
 * @param selectedKeys 已选键集合。
 * @param selectableKeys 当前页所有可选行的键。
 * @param checked true 为全选，false 为取消全选。
 * @returns 新数组，不修改入参。
 */
export function toggleTableAllKeys(
  selectedKeys: readonly string[],
  selectableKeys: readonly string[],
  checked: boolean
): string[] {
  if (checked) {
    const additions = selectableKeys.filter((key) => !selectedKeys.includes(key));

    return [...selectedKeys, ...additions];
  }

  return selectedKeys.filter((key) => !selectableKeys.includes(key));
}