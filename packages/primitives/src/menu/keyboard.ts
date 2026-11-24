import type { MenuNavigationInput, MenuTypeaheadInput } from './types';

/**
 * 计算当前层下一次聚焦索引。
 *
 * 空列表返回 null；首尾方向忽略当前索引；边界是否绕回由 loop 控制。
 *
 * @param input 当前索引、列表长度与导航方向。
 * @returns 目标索引；没有可导航项时返回 null。
 */
export function getNextMenuIndex(input: MenuNavigationInput): number | null {
  const { currentIndex, length, direction, loop = true } = input;

  if (length <= 0) return null;
  if (direction === 'first') return 0;
  if (direction === 'last') return length - 1;

  const step = direction === 'next' ? 1 : -1;
  const target = currentIndex < 0 ? (step === 1 ? 0 : length - 1) : currentIndex + step;

  if (target >= 0 && target < length) return target;

  return loop ? (target + length) % length : null;
}

/**
 * 在当前层查找首个以搜索字符开头的可用项。
 *
 * 从当前项的下一项开始循环匹配；空搜索或没有匹配时返回 null。
 *
 * @param input 候选项、搜索字符与当前聚焦项。
 * @returns 匹配项 id；没有匹配时返回 null。
 */
export function findMenuTypeaheadMatch(input: MenuTypeaheadInput): string | null {
  const search = input.search.toLocaleLowerCase();

  if (!search) return null;

  const entries = input.entries.filter((entry) => !entry.disabled);
  const currentIndex = entries.findIndex((entry) => entry.id === input.currentId);
  const start = currentIndex < 0 ? 0 : (currentIndex + 1) % entries.length;

  for (let offset = 0; offset < entries.length; offset += 1) {
    const entry = entries[(start + offset) % entries.length];

    if (entry.textValue.trim().toLocaleLowerCase().startsWith(search)) return entry.id;
  }

  return null;
}
