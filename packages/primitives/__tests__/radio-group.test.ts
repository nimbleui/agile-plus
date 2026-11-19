// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { handleRadioGroupKeydown } from '../src/radio-group';

const context = {
  enabledValues: ['a', 'b', 'c'],
  focusedValue: 'b',
};

const none = { nextValue: null, handled: false };

describe('handleRadioGroupKeydown 四个方向键', () => {
  it('下与右前进，上与左后退（与视觉排布无关，对齐原生 radio）', () => {
    expect(handleRadioGroupKeydown('ArrowDown', context)).toEqual({ nextValue: 'c', handled: true });
    expect(handleRadioGroupKeydown('ArrowRight', context)).toEqual({ nextValue: 'c', handled: true });
    expect(handleRadioGroupKeydown('ArrowUp', context)).toEqual({ nextValue: 'a', handled: true });
    expect(handleRadioGroupKeydown('ArrowLeft', context)).toEqual({ nextValue: 'a', handled: true });
  });

  it('默认在两端循环', () => {
    expect(handleRadioGroupKeydown('ArrowRight', { ...context, focusedValue: 'c' }).nextValue).toBe(
      'a'
    );
    expect(handleRadioGroupKeydown('ArrowLeft', { ...context, focusedValue: 'a' }).nextValue).toBe(
      'c'
    );
  });

  it('loop=false 时到达边界不再移动，且不拦截按键', () => {
    const noLoop = { ...context, loop: false };

    expect(handleRadioGroupKeydown('ArrowRight', { ...noLoop, focusedValue: 'c' })).toEqual(none);
    expect(handleRadioGroupKeydown('ArrowDown', { ...noLoop, focusedValue: 'c' })).toEqual(none);
    expect(handleRadioGroupKeydown('ArrowLeft', { ...noLoop, focusedValue: 'a' })).toEqual(none);
    expect(handleRadioGroupKeydown('ArrowUp', { ...noLoop, focusedValue: 'a' })).toEqual(none);
  });

  it('loop=false 不影响中间项的正常移动', () => {
    expect(handleRadioGroupKeydown('ArrowRight', { ...context, loop: false }).nextValue).toBe('c');
  });
});

describe('handleRadioGroupKeydown Home / End', () => {
  it('跳到首项与末项', () => {
    expect(handleRadioGroupKeydown('Home', context)).toEqual({ nextValue: 'a', handled: true });
    expect(handleRadioGroupKeydown('End', context)).toEqual({ nextValue: 'c', handled: true });
  });

  it('不受 loop 影响：关掉循环也能跳两端', () => {
    const noLoop = { ...context, loop: false };

    expect(handleRadioGroupKeydown('Home', noLoop).nextValue).toBe('a');
    expect(handleRadioGroupKeydown('End', noLoop).nextValue).toBe('c');
  });

  it('没有焦点项时同样有效', () => {
    expect(handleRadioGroupKeydown('End', { ...context, focusedValue: null }).nextValue).toBe('c');
  });
});

describe('handleRadioGroupKeydown 焦点起点缺失', () => {
  it('focusedValue 为 null 时前进取首项、后退取末项', () => {
    const noFocus = { ...context, focusedValue: null };

    expect(handleRadioGroupKeydown('ArrowDown', noFocus).nextValue).toBe('a');
    expect(handleRadioGroupKeydown('ArrowUp', noFocus).nextValue).toBe('c');
  });

  it('focusedValue 不在可用列表里时按缺失处理（例如聚焦了禁用项）', () => {
    const stale = { ...context, focusedValue: 'disabled-one' };

    expect(handleRadioGroupKeydown('ArrowRight', stale).nextValue).toBe('a');
    expect(handleRadioGroupKeydown('ArrowLeft', stale).nextValue).toBe('c');
  });
});

describe('handleRadioGroupKeydown 边界与不拦截', () => {
  it('可用列表为空时所有按键都不响应', () => {
    const empty = { enabledValues: [], focusedValue: null };

    for (const key of ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End']) {
      expect(handleRadioGroupKeydown(key, empty)).toEqual(none);
    }
  });

  it('单项列表循环后仍是它自己', () => {
    const single = { enabledValues: ['only'], focusedValue: 'only' };

    expect(handleRadioGroupKeydown('ArrowRight', single).nextValue).toBe('only');
    expect(handleRadioGroupKeydown('ArrowLeft', single).nextValue).toBe('only');
  });

  it('无关按键一律不处理，避免拦掉浏览器默认行为', () => {
    for (const key of ['Enter', ' ', 'Tab', 'Escape', 'a', 'Shift']) {
      expect(handleRadioGroupKeydown(key, context)).toEqual(none);
    }
  });

  it('本层不过滤禁用项：传进来的列表就是全部可用项', () => {
    // 契约是「适配层已过滤」，因此这里传入的列表原样参与导航，不做任何可用性判断。
    const filtered = { enabledValues: ['a', 'c'], focusedValue: 'a' };

    expect(handleRadioGroupKeydown('ArrowRight', filtered).nextValue).toBe('c');
  });
});