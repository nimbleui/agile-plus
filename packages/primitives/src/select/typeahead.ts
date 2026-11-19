import type { SelectTypeaheadInput, SelectTypeaheadSearchInput } from './types';

/**
 * typeahead 搜索串的重置间隔，与 Radix Select 的缺省值一致。
 *
 * 超过这个间隔再按键就重新开始累积，否则「a…（停两秒）…b」会被拼成 "ab" 而匹配不到
 * 任何选项。间隔由调用方注入时间戳来判定，本层不持有定时器，因此判定可在 node 环境
 * 直接断言，也不需要 fake timers。
 */
export const DEFAULT_TYPEAHEAD_TIMEOUT = 1000;

/**
 * 累积 typeahead 搜索串。
 *
 * 只回答「本次按键之后搜索串是什么」，何时按键、距上次多久由调用方给出。这样重置
 * 规则是纯计算，适配层不需要定时器，也就没有需要清理的资源。
 *
 * @param input 上一次搜索串、本次字符、距上次按键的毫秒数与重置间隔。
 * @returns 新的搜索串。
 */
export function appendTypeaheadSearch(input: SelectTypeaheadSearchInput): string {
  const { previous, char, elapsed, timeout } = input;

  return elapsed >= timeout ? char : previous + char;
}

/**
 * 按已累积的搜索串找出应当高亮（或选中）的选项。
 *
 * 两条规则来自原生 select 的手感，缺一不可：
 *
 * 1. **连续按同一个键是循环**，不是把搜索串越拼越长。连按 "a" 应当在所有 a 开头的
 *    选项之间轮换，因此重复字符会被折叠成单个字符，并且**排除当前项**从它之后找起。
 * 2. **多字符搜索从当前项找起（含当前项）**，这样 "ap" → "app" 会停在同一个选项上，
 *    而不是每敲一个字母就跳回列表开头。
 *
 * 匹配按选项的可读文本前缀、忽略大小写与首尾空白；禁用项不参与。
 *
 * @param input 全部选项、搜索串与当前值。
 * @returns 命中的选项值；没有命中时为 null（调用方应保持原状）。
 */
export function findTypeaheadMatch(input: SelectTypeaheadInput): string | null {
  const { options, search, currentValue } = input;

  const needle = search.trim().toLowerCase();

  if (!needle) return null;

  const enabled = options.filter((option) => !option.disabled);

  if (enabled.length === 0) return null;

  const isRepeatedChar =
    needle.length > 1 && Array.from(needle).every((char) => char === needle[0]);
  const prefix = isRepeatedChar ? needle[0] : needle;

  const currentIndex =
    currentValue === null ? -1 : enabled.findIndex((o) => o.value === currentValue);
  const start = Math.max(currentIndex, 0);
  const rotated = [...enabled.slice(start), ...enabled.slice(0, start)];
  const candidates =
    prefix.length === 1 ? rotated.filter((option) => option.value !== currentValue) : rotated;

  const match = candidates.find((option) =>
    option.textValue.trim().toLowerCase().startsWith(prefix)
  );

  return match ? match.value : null;
}
