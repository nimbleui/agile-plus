import { describe, expect, it } from 'vitest';

import {
  findMenuTypeaheadMatch,
  getMenuKeyPath,
  getNextMenuIndex,
  normalizeMenuKeys,
  resolveMenuOpenKeys,
  resolveMenuSelection,
} from '../src/menu';

describe('Menu 状态转移', () => {
  it('normalizeMenuKeys 按字符串身份去重并保留顺序', () => {
    expect(normalizeMenuKeys([1, '1', 'a', 2, 'a'])).toEqual([1, 'a', 2]);
  });

  it('单选始终只保留当前项，多选再次激活时取消选中', () => {
    expect(resolveMenuSelection({ selectedKeys: ['a'], key: 'b', multiple: false })).toEqual(['b']);
    expect(resolveMenuSelection({ selectedKeys: ['a', 'b'], key: 'b', multiple: true })).toEqual([
      'a',
    ]);
    expect(resolveMenuSelection({ selectedKeys: ['a'], key: 'b', multiple: true })).toEqual([
      'a',
      'b',
    ]);
  });

  it('关闭父子菜单时同步移除全部后代', () => {
    const items = [
      { key: 'a', parentKey: null },
      { key: 'a-1', parentKey: 'a' },
      { key: 'a-2', parentKey: 'a-1' },
      { key: 'b', parentKey: null },
    ];

    expect(
      resolveMenuOpenKeys({
        openKeys: ['a', 'a-1', 'a-2', 'b'],
        key: 'a',
        open: false,
        parentKey: null,
        accordion: false,
        items,
      })
    ).toEqual(['b']);
  });

  it('手风琴展开时关闭同级兄弟及其后代', () => {
    const items = [
      { key: 'a', parentKey: null },
      { key: 'a-1', parentKey: 'a' },
      { key: 'b', parentKey: null },
      { key: 'b-1', parentKey: 'b' },
    ];

    expect(
      resolveMenuOpenKeys({
        openKeys: ['a', 'a-1'],
        key: 'b',
        open: true,
        parentKey: null,
        accordion: true,
        items,
      })
    ).toEqual(['b']);
  });

  it('getMenuKeyPath 返回从顶层到目标项的路径', () => {
    expect(
      getMenuKeyPath({
        key: 'a-2',
        items: [
          { key: 'a', parentKey: null },
          { key: 'a-1', parentKey: 'a' },
          { key: 'a-2', parentKey: 'a-1' },
        ],
      })
    ).toEqual(['a', 'a-1', 'a-2']);
  });
});

describe('Menu 键盘纯计算', () => {
  it('getNextMenuIndex 支持首尾、绕回与不绕回', () => {
    expect(getNextMenuIndex({ currentIndex: 1, length: 3, direction: 'next' })).toBe(2);
    expect(getNextMenuIndex({ currentIndex: 2, length: 3, direction: 'next' })).toBe(0);
    expect(
      getNextMenuIndex({ currentIndex: 0, length: 3, direction: 'previous', loop: false })
    ).toBeNull();
    expect(getNextMenuIndex({ currentIndex: 1, length: 3, direction: 'first' })).toBe(0);
    expect(getNextMenuIndex({ currentIndex: 1, length: 3, direction: 'last' })).toBe(2);
  });

  it('typeahead 跳过禁用项并从下一项开始循环匹配', () => {
    const entries = [
      { id: 'a', textValue: 'Alpha', disabled: false },
      { id: 'b', textValue: 'Beta', disabled: true },
      { id: 'c', textValue: 'Charlie', disabled: false },
    ];

    expect(findMenuTypeaheadMatch({ entries, search: 'c', currentId: 'a' })).toBe('c');
    expect(findMenuTypeaheadMatch({ entries, search: 'a', currentId: 'c' })).toBe('a');
    expect(findMenuTypeaheadMatch({ entries, search: 'b', currentId: 'a' })).toBeNull();
  });
});
