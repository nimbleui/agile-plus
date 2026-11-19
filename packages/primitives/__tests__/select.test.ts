// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  DEFAULT_TYPEAHEAD_TIMEOUT,
  appendTypeaheadSearch,
  findTypeaheadMatch,
  resolveOpenHighlight,
  resolveScrollTop,
  resolveSelectHighlight,
  resolveSelectKeyIntent,
} from '../src/select';

import type { SelectNavigationOption } from '../src/select';

function option(value: string, disabled = false): SelectNavigationOption {
  return { value, textValue: value, disabled };
}

const fruits: SelectNavigationOption[] = [
  { value: 'apple', textValue: 'Apple', disabled: false },
  { value: 'apricot', textValue: 'Apricot', disabled: false },
  { value: 'banana', textValue: 'Banana', disabled: true },
  { value: 'blueberry', textValue: 'Blueberry', disabled: false },
  { value: 'cherry', textValue: 'Cherry', disabled: false },
];

describe('resolveSelectKeyIntent 关闭态', () => {
  const closed = { open: false, hasModifierKey: false };

  it('ArrowDown / Enter / Space 打开并从首项落点', () => {
    for (const key of ['ArrowDown', 'Enter', ' ']) {
      expect(resolveSelectKeyIntent({ ...closed, key })).toEqual({ kind: 'open', edge: 'first' });
    }
  });

  it('ArrowUp 打开并从末项落点，与原生 select 手感一致', () => {
    expect(resolveSelectKeyIntent({ ...closed, key: 'ArrowUp' })).toEqual({
      kind: 'open',
      edge: 'last',
    });
  });

  it('关闭态按字母直接进 typeahead，不展开也能换值', () => {
    expect(resolveSelectKeyIntent({ ...closed, key: 'a' })).toEqual({
      kind: 'typeahead',
      char: 'a',
    });
  });

  it('Escape / Tab / Home 在关闭态不接管', () => {
    for (const key of ['Escape', 'Tab', 'Home', 'End', 'PageDown']) {
      expect(resolveSelectKeyIntent({ ...closed, key })).toEqual({ kind: 'none' });
    }
  });
});

describe('resolveSelectKeyIntent 打开态', () => {
  const open = { open: true, hasModifierKey: false };

  it('方向键与 Home / End 转成高亮意图', () => {
    expect(resolveSelectKeyIntent({ ...open, key: 'ArrowDown' })).toEqual({
      kind: 'highlight',
      intent: 'next',
    });
    expect(resolveSelectKeyIntent({ ...open, key: 'ArrowUp' })).toEqual({
      kind: 'highlight',
      intent: 'prev',
    });
    expect(resolveSelectKeyIntent({ ...open, key: 'Home' })).toEqual({
      kind: 'highlight',
      intent: 'first',
    });
    expect(resolveSelectKeyIntent({ ...open, key: 'End' })).toEqual({
      kind: 'highlight',
      intent: 'last',
    });
  });

  it('Enter / Space 提交高亮项', () => {
    expect(resolveSelectKeyIntent({ ...open, key: 'Enter' })).toEqual({ kind: 'commit' });
    expect(resolveSelectKeyIntent({ ...open, key: ' ' })).toEqual({ kind: 'commit' });
  });

  it('Escape 关闭，Tab 走 tab-out 以便保留默认行为', () => {
    expect(resolveSelectKeyIntent({ ...open, key: 'Escape' })).toEqual({ kind: 'close' });
    expect(resolveSelectKeyIntent({ ...open, key: 'Tab' })).toEqual({ kind: 'tab-out' });
  });

  it('打开态按字母移动高亮而不是直接改值', () => {
    expect(resolveSelectKeyIntent({ ...open, key: 'c' })).toEqual({ kind: 'typeahead', char: 'c' });
  });
});

describe('resolveSelectKeyIntent 修饰键', () => {
  it('带 Ctrl / Alt / Meta 的按键一律交还浏览器', () => {
    for (const open of [false, true]) {
      expect(resolveSelectKeyIntent({ key: 'Home', open, hasModifierKey: true })).toEqual({
        kind: 'none',
      });
      expect(resolveSelectKeyIntent({ key: 'a', open, hasModifierKey: true })).toEqual({
        kind: 'none',
      });
    }
  });

  it('Shift 不算修饰键：Shift+Tab 仍要退出，Shift+字母仍是大写输入', () => {
    expect(resolveSelectKeyIntent({ key: 'Tab', open: true, hasModifierKey: false })).toEqual({
      kind: 'tab-out',
    });
    expect(resolveSelectKeyIntent({ key: 'A', open: true, hasModifierKey: false })).toEqual({
      kind: 'typeahead',
      char: 'A',
    });
  });
});

describe('resolveSelectHighlight', () => {
  const options = [option('a'), option('b', true), option('c'), option('d')];

  it('跳过禁用项', () => {
    expect(resolveSelectHighlight({ intent: 'next', options, currentValue: 'a' })).toBe('c');
    expect(resolveSelectHighlight({ intent: 'prev', options, currentValue: 'c' })).toBe('a');
  });

  it('首尾意图直接取边界', () => {
    expect(resolveSelectHighlight({ intent: 'first', options, currentValue: 'c' })).toBe('a');
    expect(resolveSelectHighlight({ intent: 'last', options, currentValue: 'a' })).toBe('d');
  });

  it('默认循环到另一端', () => {
    expect(resolveSelectHighlight({ intent: 'next', options, currentValue: 'd' })).toBe('a');
    expect(resolveSelectHighlight({ intent: 'prev', options, currentValue: 'a' })).toBe('d');
  });

  it('loop=false 到边界返回 null，调用方保持原高亮', () => {
    expect(
      resolveSelectHighlight({ intent: 'next', options, currentValue: 'd', loop: false })
    ).toBeNull();
    expect(
      resolveSelectHighlight({ intent: 'prev', options, currentValue: 'a', loop: false })
    ).toBeNull();
  });

  it('当前高亮不在可用列表里时，前进取首项、后退取末项', () => {
    expect(resolveSelectHighlight({ intent: 'next', options, currentValue: 'b' })).toBe('a');
    expect(resolveSelectHighlight({ intent: 'prev', options, currentValue: 'b' })).toBe('d');
    expect(resolveSelectHighlight({ intent: 'next', options, currentValue: null })).toBe('a');
    expect(resolveSelectHighlight({ intent: 'prev', options, currentValue: null })).toBe('d');
  });

  it('列表为空或全部禁用时不移动', () => {
    expect(resolveSelectHighlight({ intent: 'next', options: [], currentValue: null })).toBeNull();
    expect(
      resolveSelectHighlight({ intent: 'first', options: [option('a', true)], currentValue: null })
    ).toBeNull();
  });

  it('只有一项时循环回到自己', () => {
    const single = [option('only')];

    expect(resolveSelectHighlight({ intent: 'next', options: single, currentValue: 'only' })).toBe(
      'only'
    );
  });
});

describe('resolveOpenHighlight', () => {
  it('选中项可用时落在它上面，读屏先听到当前值', () => {
    expect(resolveOpenHighlight({ options: fruits, selectedValue: 'cherry', edge: 'first' })).toBe(
      'cherry'
    );
  });

  it('未选中时按 edge 取边界，且跳过禁用项', () => {
    expect(resolveOpenHighlight({ options: fruits, selectedValue: '', edge: 'first' })).toBe(
      'apple'
    );
    expect(resolveOpenHighlight({ options: fruits, selectedValue: '', edge: 'last' })).toBe(
      'cherry'
    );
  });

  it('选中项已被禁用时退到边界，而不是停在不可选项上', () => {
    expect(resolveOpenHighlight({ options: fruits, selectedValue: 'banana', edge: 'first' })).toBe(
      'apple'
    );
  });

  it('选中项已被卸载时同样退到边界', () => {
    expect(resolveOpenHighlight({ options: fruits, selectedValue: 'gone', edge: 'last' })).toBe(
      'cherry'
    );
  });

  it('没有可用项时返回 null', () => {
    expect(
      resolveOpenHighlight({ options: [option('a', true)], selectedValue: 'a', edge: 'first' })
    ).toBeNull();
  });
});

describe('appendTypeaheadSearch', () => {
  const base = { previous: 'ap', char: 'r', timeout: 1000 };

  it('间隔内继续累积', () => {
    expect(appendTypeaheadSearch({ ...base, elapsed: 200 })).toBe('apr');
  });

  it('超过间隔重新开始，否则「a…停两秒…b」会拼成 ab 匹配不到', () => {
    expect(appendTypeaheadSearch({ ...base, elapsed: 1000 })).toBe('r');
    expect(appendTypeaheadSearch({ ...base, elapsed: 5000 })).toBe('r');
  });

  it('恰好等于间隔算超时（严格小于才累积）', () => {
    expect(appendTypeaheadSearch({ ...base, elapsed: 999 })).toBe('apr');
    expect(appendTypeaheadSearch({ ...base, elapsed: 1000 })).toBe('r');
  });

  it('缺省值与 Radix 对齐', () => {
    expect(DEFAULT_TYPEAHEAD_TIMEOUT).toBe(1000);
  });
});

describe('findTypeaheadMatch', () => {
  it('按可读文本前缀匹配，忽略大小写与首尾空白', () => {
    expect(findTypeaheadMatch({ options: fruits, search: 'AP', currentValue: null })).toBe('apple');
    expect(findTypeaheadMatch({ options: fruits, search: ' ch ', currentValue: null })).toBe(
      'cherry'
    );
  });

  it('跳过禁用项', () => {
    expect(findTypeaheadMatch({ options: fruits, search: 'b', currentValue: null })).toBe(
      'blueberry'
    );
  });

  it('多字符搜索从当前项找起（含当前项），敲下一个字母不跳回开头', () => {
    expect(findTypeaheadMatch({ options: fruits, search: 'ap', currentValue: 'apple' })).toBe(
      'apple'
    );
    expect(findTypeaheadMatch({ options: fruits, search: 'apr', currentValue: 'apple' })).toBe(
      'apricot'
    );
  });

  it('连续按同一个键是循环而不是把搜索串越拼越长', () => {
    expect(findTypeaheadMatch({ options: fruits, search: 'a', currentValue: null })).toBe('apple');
    expect(findTypeaheadMatch({ options: fruits, search: 'aa', currentValue: 'apple' })).toBe(
      'apricot'
    );
    expect(findTypeaheadMatch({ options: fruits, search: 'aaa', currentValue: 'apricot' })).toBe(
      'apple'
    );
  });

  it('只有一个匹配项时重复按键返回 null：调用方保持原高亮，视觉上就停在它上面', () => {
    expect(
      findTypeaheadMatch({ options: fruits, search: 'cc', currentValue: 'cherry' })
    ).toBeNull();
  });

  it('搜索串绕回列表开头继续找', () => {
    expect(findTypeaheadMatch({ options: fruits, search: 'a', currentValue: 'cherry' })).toBe(
      'apple'
    );
  });

  it('空搜索串、无命中、全禁用都返回 null', () => {
    expect(findTypeaheadMatch({ options: fruits, search: '   ', currentValue: null })).toBeNull();
    expect(findTypeaheadMatch({ options: fruits, search: 'zz', currentValue: null })).toBeNull();
    expect(
      findTypeaheadMatch({ options: [option('a', true)], search: 'a', currentValue: null })
    ).toBeNull();
    expect(findTypeaheadMatch({ options: [], search: 'a', currentValue: null })).toBeNull();
  });

  it('当前值不在列表里时从头找起', () => {
    expect(findTypeaheadMatch({ options: fruits, search: 'b', currentValue: 'gone' })).toBe(
      'blueberry'
    );
  });
});

describe('resolveScrollTop', () => {
  const base = { scrollTop: 100, itemSize: 32, viewportSize: 160 };

  it('已完整可见时返回原值，不做无意义写入', () => {
    expect(resolveScrollTop({ ...base, itemOffset: 0 })).toBe(100);
    expect(resolveScrollTop({ ...base, itemOffset: 128 })).toBe(100);
  });

  it('上方被裁时对齐到项的上边，只补差额', () => {
    expect(resolveScrollTop({ ...base, itemOffset: -10 })).toBe(90);
  });

  it('下方被裁时对齐到项的下边，只补差额', () => {
    expect(resolveScrollTop({ ...base, itemOffset: 140 })).toBe(112);
  });

  it('不会算出负的 scrollTop', () => {
    expect(resolveScrollTop({ ...base, scrollTop: 5, itemOffset: -40 })).toBe(0);
  });

  it('项比视口还高时对齐到它的上边，至少起始内容可读', () => {
    expect(
      resolveScrollTop({ scrollTop: 0, itemOffset: 0, itemSize: 400, viewportSize: 160 })
    ).toBe(240);
  });
});
