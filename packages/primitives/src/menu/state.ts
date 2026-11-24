import type { MenuKey, MenuKeyPathInput, MenuOpenInput, MenuSelectionInput } from './types';

/** 按键的字符串身份判断，避免 number 1 与 string '1' 在集合运算中产生两份状态。 */
function sameKey(left: MenuKey, right: MenuKey): boolean {
  return String(left) === String(right);
}

/** 去重并保持调用方给出的顺序。 */
export function normalizeMenuKeys(keys: MenuKey[]): MenuKey[] {
  return keys.filter(
    (key, index) => keys.findIndex((candidate) => sameKey(candidate, key)) === index
  );
}

/** 判断键集合是否包含目标键。 */
export function menuKeysInclude(keys: MenuKey[], key: MenuKey): boolean {
  return keys.some((candidate) => sameKey(candidate, key));
}

/**
 * 计算一次菜单激活后的选中键集合。
 *
 * 单选模式始终只保留当前项；多选模式再次激活同一项时取消选中。
 *
 * @param input 当前选中键、目标键与多选配置。
 * @returns 新的选中键数组。
 */
export function resolveMenuSelection(input: MenuSelectionInput): MenuKey[] {
  const selectedKeys = normalizeMenuKeys(input.selectedKeys);
  const isSelected = menuKeysInclude(selectedKeys, input.key);

  if (!input.multiple) return [input.key];

  return isSelected
    ? selectedKeys.filter((key) => !sameKey(key, input.key))
    : [...selectedKeys, input.key];
}

/** 收集目标键的全部后代键，遇到异常循环时停止扩展。 */
function collectDescendantKeys(key: MenuKey, items: MenuOpenInput['items']): MenuKey[] {
  const descendants: MenuKey[] = [];
  const queue: MenuKey[] = [key];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const parent = queue.shift() as MenuKey;
    const parentIdentity = String(parent);

    if (visited.has(parentIdentity)) continue;

    visited.add(parentIdentity);

    for (const item of items) {
      if (item.parentKey === null || !sameKey(item.parentKey, parent)) continue;

      descendants.push(item.key);
      queue.push(item.key);
    }
  }

  return descendants;
}

/**
 * 计算一次子菜单切换后的展开键集合。
 *
 * 关闭子菜单时同步移除全部后代；手风琴模式展开时关闭同级兄弟及其后代。
 *
 * @param input 当前展开键、目标子菜单与已登记关系。
 * @returns 新的展开键数组。
 */
export function resolveMenuOpenKeys(input: MenuOpenInput): MenuKey[] {
  const openKeys = normalizeMenuKeys(input.openKeys);
  const closingKeys = input.open
    ? []
    : [input.key, ...collectDescendantKeys(input.key, input.items)];
  const accordionKeys =
    input.open && input.accordion
      ? input.items
          .filter(
            (item) =>
              !sameKey(item.key, input.key) &&
              ((item.parentKey === null && input.parentKey === null) ||
                (item.parentKey !== null &&
                  input.parentKey !== null &&
                  sameKey(item.parentKey, input.parentKey)))
          )
          .flatMap((item) => [item.key, ...collectDescendantKeys(item.key, input.items)])
      : [];

  const removedKeys = [...closingKeys, ...accordionKeys];
  const next = openKeys.filter((key) => !removedKeys.some((removed) => sameKey(key, removed)));

  if (input.open && !menuKeysInclude(next, input.key)) next.push(input.key);

  return next;
}

/**
 * 计算目标项从顶层到自身的完整键路径。
 *
 * 父级关系异常或形成循环时返回已经确认的路径，不继续递归。
 *
 * @param input 目标键与已登记关系。
 * @returns 从顶层到目标项的键数组。
 */
export function getMenuKeyPath(input: MenuKeyPathInput): MenuKey[] {
  const path: MenuKey[] = [];
  const visited = new Set<string>();
  let current: MenuKey | null = input.key;

  while (current !== null) {
    const identity = String(current);

    if (visited.has(identity)) break;

    visited.add(identity);
    path.unshift(current);

    const item = input.items.find((candidate) => sameKey(candidate.key, current as MenuKey));

    current = item?.parentKey ?? null;
  }

  return path;
}
