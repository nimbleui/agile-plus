// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  getToggleDataState,
  isToggleGroupItemPressed,
  normalizeToggleGroupValue,
  resolveDirectionAwareKey,
  resolveGroupValueAfterToggle,
  resolveNextTogglePressed,
  resolveRovingFocusIntent,
  resolveRovingFocusTargetIndex,
  serializeToggleGroupValue,
} from '../src/toggle';

describe('resolveNextTogglePressed', () => {
  it('未禁用时翻转状态', () => {
    expect(resolveNextTogglePressed({ pressed: false, disabled: false })).toBe(true);
    expect(resolveNextTogglePressed({ pressed: true, disabled: false })).toBe(false);
  });

  it('禁用时返回 null 表示状态不变', () => {
    expect(resolveNextTogglePressed({ pressed: false, disabled: true })).toBeNull();
  });

  it('data-state 用 on / off 词表', () => {
    expect(getToggleDataState(true)).toBe('on');
    expect(getToggleDataState(false)).toBe('off');
  });
});

describe('normalizeToggleGroupValue', () => {
  it('single 把字符串包成不超过一个元素的数组', () => {
    expect(normalizeToggleGroupValue('single', 'bold')).toEqual(['bold']);
    expect(normalizeToggleGroupValue('single', '')).toEqual([]);
    expect(normalizeToggleGroupValue('single', undefined)).toEqual([]);
    expect(normalizeToggleGroupValue('single', null)).toEqual([]);
  });

  it('multiple 只接受数组，其它形状视为未选', () => {
    expect(normalizeToggleGroupValue('multiple', ['a', 'b'])).toEqual(['a', 'b']);
    expect(normalizeToggleGroupValue('multiple', [])).toEqual([]);
    expect(normalizeToggleGroupValue('multiple', undefined)).toEqual([]);
  });
});

describe('resolveGroupValueAfterToggle', () => {
  it('single 选中时替换整个值', () => {
    expect(
      resolveGroupValueAfterToggle({
        type: 'single',
        value: ['left'],
        itemValue: 'center',
        pressed: true,
      })
    ).toEqual(['center']);
  });

  it('single 取消选中后允许一项都不选', () => {
    expect(
      resolveGroupValueAfterToggle({
        type: 'single',
        value: ['center'],
        itemValue: 'center',
        pressed: false,
      })
    ).toEqual([]);
  });

  it('multiple 追加与移除都只作用于该项，顺序保持', () => {
    expect(
      resolveGroupValueAfterToggle({
        type: 'multiple',
        value: ['bold'],
        itemValue: 'italic',
        pressed: true,
      })
    ).toEqual(['bold', 'italic']);
    expect(
      resolveGroupValueAfterToggle({
        type: 'multiple',
        value: ['bold', 'italic', 'under'],
        itemValue: 'italic',
        pressed: false,
      })
    ).toEqual(['bold', 'under']);
  });

  it('取消一个本不在值里的项是幂等的', () => {
    expect(
      resolveGroupValueAfterToggle({
        type: 'multiple',
        value: ['bold'],
        itemValue: 'italic',
        pressed: false,
      })
    ).toEqual(['bold']);
  });

  it('输入数组不被修改', () => {
    const value = ['bold', 'italic'];

    resolveGroupValueAfterToggle({ type: 'multiple', value, itemValue: 'under', pressed: false });

    expect(value).toEqual(['bold', 'italic']);
  });
});

describe('选中判定与序列化', () => {
  it('项的选中状态只看值集合是否包含它', () => {
    expect(isToggleGroupItemPressed(['bold', 'italic'], 'italic')).toBe(true);
    expect(isToggleGroupItemPressed([], 'italic')).toBe(false);
  });

  it('single 的空集合序列化成空字符串而不是 undefined', () => {
    // undefined 会被受控判定当成「未传值」，导致组在受控与非受控之间切换模式。
    expect(serializeToggleGroupValue('single', [])).toBe('');
    expect(serializeToggleGroupValue('single', ['bold'])).toBe('bold');
  });

  it('multiple 原样输出数组', () => {
    expect(serializeToggleGroupValue('multiple', ['a', 'b'])).toEqual(['a', 'b']);
  });
});

describe('resolveDirectionAwareKey', () => {
  it('LTR 不改变按键', () => {
    expect(resolveDirectionAwareKey('ArrowLeft', 'ltr')).toBe('ArrowLeft');
  });

  it('RTL 只互换左右', () => {
    expect(resolveDirectionAwareKey('ArrowLeft', 'rtl')).toBe('ArrowRight');
    expect(resolveDirectionAwareKey('ArrowRight', 'rtl')).toBe('ArrowLeft');
    expect(resolveDirectionAwareKey('ArrowUp', 'rtl')).toBe('ArrowUp');
    expect(resolveDirectionAwareKey('Home', 'rtl')).toBe('Home');
  });
});

describe('resolveRovingFocusIntent', () => {
  const base = { dir: 'ltr', orientation: undefined, hasModifierKey: false } as const;

  it('方向键映射到前后意图', () => {
    expect(resolveRovingFocusIntent({ ...base, key: 'ArrowRight' })).toBe('next');
    expect(resolveRovingFocusIntent({ ...base, key: 'ArrowUp' })).toBe('prev');
  });

  it('Home/End 与 PageUp/PageDown 同义', () => {
    expect(resolveRovingFocusIntent({ ...base, key: 'Home' })).toBe('first');
    expect(resolveRovingFocusIntent({ ...base, key: 'PageUp' })).toBe('first');
    expect(resolveRovingFocusIntent({ ...base, key: 'End' })).toBe('last');
    expect(resolveRovingFocusIntent({ ...base, key: 'PageDown' })).toBe('last');
  });

  it('带修饰键时不接管', () => {
    expect(
      resolveRovingFocusIntent({ ...base, key: 'ArrowRight', hasModifierKey: true })
    ).toBeNull();
  });

  it('纵向组忽略左右，横向组忽略上下', () => {
    expect(
      resolveRovingFocusIntent({ ...base, key: 'ArrowRight', orientation: 'vertical' })
    ).toBeNull();
    expect(resolveRovingFocusIntent({ ...base, key: 'ArrowDown', orientation: 'vertical' })).toBe(
      'next'
    );
    expect(
      resolveRovingFocusIntent({ ...base, key: 'ArrowDown', orientation: 'horizontal' })
    ).toBeNull();
    expect(resolveRovingFocusIntent({ ...base, key: 'ArrowLeft', orientation: 'horizontal' })).toBe(
      'prev'
    );
  });

  it('未提供 orientation 时四个方向都接管', () => {
    expect(resolveRovingFocusIntent({ ...base, key: 'ArrowDown', orientation: undefined })).toBe(
      'next'
    );
    expect(resolveRovingFocusIntent({ ...base, key: 'ArrowLeft', orientation: undefined })).toBe(
      'prev'
    );
  });

  it('RTL 下左右意图互换', () => {
    expect(resolveRovingFocusIntent({ ...base, key: 'ArrowLeft', dir: 'rtl' })).toBe('next');
  });

  it('不相关的按键返回 null', () => {
    expect(resolveRovingFocusIntent({ ...base, key: 'Tab' })).toBeNull();
    expect(resolveRovingFocusIntent({ ...base, key: 'Enter' })).toBeNull();
  });
});

describe('resolveRovingFocusTargetIndex', () => {
  it('first 与 last 直接定位两端', () => {
    expect(
      resolveRovingFocusTargetIndex({ intent: 'first', currentIndex: 2, count: 4, loop: false })
    ).toBe(0);
    expect(
      resolveRovingFocusTargetIndex({ intent: 'last', currentIndex: 0, count: 4, loop: false })
    ).toBe(3);
  });

  it('前后各移动一格', () => {
    expect(
      resolveRovingFocusTargetIndex({ intent: 'next', currentIndex: 1, count: 4, loop: false })
    ).toBe(2);
    expect(
      resolveRovingFocusTargetIndex({ intent: 'prev', currentIndex: 1, count: 4, loop: false })
    ).toBe(0);
  });

  it('loop 时两端绕回', () => {
    expect(
      resolveRovingFocusTargetIndex({ intent: 'next', currentIndex: 3, count: 4, loop: true })
    ).toBe(0);
    expect(
      resolveRovingFocusTargetIndex({ intent: 'prev', currentIndex: 0, count: 4, loop: true })
    ).toBe(3);
  });

  it('不 loop 时越界不动焦点', () => {
    expect(
      resolveRovingFocusTargetIndex({ intent: 'next', currentIndex: 3, count: 4, loop: false })
    ).toBeNull();
    expect(
      resolveRovingFocusTargetIndex({ intent: 'prev', currentIndex: 0, count: 4, loop: false })
    ).toBeNull();
  });

  it('焦点不在列表内时，next 落到首项、prev 落到末项，与 loop 无关', () => {
    expect(
      resolveRovingFocusTargetIndex({ intent: 'next', currentIndex: -1, count: 4, loop: false })
    ).toBe(0);
    expect(
      resolveRovingFocusTargetIndex({ intent: 'prev', currentIndex: -1, count: 4, loop: false })
    ).toBe(3);
  });

  it('没有可聚焦项时不动', () => {
    expect(
      resolveRovingFocusTargetIndex({ intent: 'next', currentIndex: 0, count: 0, loop: true })
    ).toBeNull();
    expect(
      resolveRovingFocusTargetIndex({ intent: 'first', currentIndex: 0, count: 0, loop: true })
    ).toBeNull();
  });
});
