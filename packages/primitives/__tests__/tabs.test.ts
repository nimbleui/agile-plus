// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

import { createTabsMachine, handleTabsKeydown } from '../src/tabs';

import type { TabsState } from '../src/tabs';

/** 注册三个 tab 的机器，绝大多数导航断言都从这个状态出发。 */
function machineWithThree(activationMode: 'automatic' | 'manual' = 'automatic') {
  const machine = createTabsMachine({ activationMode });

  for (const value of ['a', 'b', 'c']) {
    machine.send({ type: 'REGISTER_TAB', payload: value });
  }

  return machine;
}

describe('createTabsMachine 初始状态与注册', () => {
  it('缺省配置是空列表、automatic、horizontal', () => {
    const state = createTabsMachine().getState();

    expect(state).toEqual({
      activeValue: '',
      tabValues: [],
      focusedValue: null,
      activationMode: 'automatic',
      orientation: 'horizontal',
    });
  });

  it('没有 defaultValue 时第一个注册的 tab 成为激活项与焦点项', () => {
    const machine = createTabsMachine();

    machine.send({ type: 'REGISTER_TAB', payload: 'a' });

    expect(machine.getState().activeValue).toBe('a');
    expect(machine.getState().focusedValue).toBe('a');
  });

  it('给了 defaultValue 就保持它，不被首个注册项顶掉', () => {
    const machine = createTabsMachine({ defaultValue: 'c' });

    machine.send({ type: 'REGISTER_TAB', payload: 'a' });
    machine.send({ type: 'REGISTER_TAB', payload: 'c' });

    expect(machine.getState().activeValue).toBe('c');
    expect(machine.getState().tabValues).toEqual(['a', 'c']);
  });

  it('重复注册同一个 value 不改变列表也不通知订阅者', () => {
    const machine = machineWithThree();
    const listener = vi.fn();

    machine.subscribe(listener);
    machine.send({ type: 'REGISTER_TAB', payload: 'b' });

    expect(machine.getState().tabValues).toEqual(['a', 'b', 'c']);
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('createTabsMachine 激活与注销', () => {
  it('SET_ACTIVE 同时移动激活项与焦点项', () => {
    const machine = machineWithThree();

    machine.send({ type: 'SET_ACTIVE', payload: 'c' });

    expect(machine.getState().activeValue).toBe('c');
    expect(machine.getState().focusedValue).toBe('c');
  });

  it('注销非激活项不影响激活项', () => {
    const machine = machineWithThree();

    machine.send({ type: 'SET_ACTIVE', payload: 'c' });
    machine.send({ type: 'UNREGISTER_TAB', payload: 'a' });

    expect(machine.getState().tabValues).toEqual(['b', 'c']);
    expect(machine.getState().activeValue).toBe('c');
  });

  it('注销激活项时回落到剩余的第一个', () => {
    const machine = machineWithThree();

    machine.send({ type: 'UNREGISTER_TAB', payload: 'a' });

    expect(machine.getState().activeValue).toBe('b');
    expect(machine.getState().focusedValue).toBe('b');
  });

  it('注销最后一个 tab 后激活项回到空字符串而不是 undefined', () => {
    const machine = createTabsMachine();

    machine.send({ type: 'REGISTER_TAB', payload: 'only' });
    machine.send({ type: 'UNREGISTER_TAB', payload: 'only' });

    expect(machine.getState().tabValues).toEqual([]);
    expect(machine.getState().activeValue).toBe('');
  });
});

describe('createTabsMachine 两种激活模式', () => {
  it('automatic 下移动焦点即激活', () => {
    const machine = machineWithThree('automatic');

    machine.send({ type: 'FOCUS_TAB', payload: 'b' });

    expect(machine.getState().focusedValue).toBe('b');
    expect(machine.getState().activeValue).toBe('b');
  });

  it('manual 下移动焦点不激活，需显式 ACTIVATE_FOCUSED', () => {
    const machine = machineWithThree('manual');

    machine.send({ type: 'FOCUS_TAB', payload: 'b' });

    expect(machine.getState().focusedValue).toBe('b');
    expect(machine.getState().activeValue).toBe('a');

    machine.send({ type: 'ACTIVATE_FOCUSED' });

    expect(machine.getState().activeValue).toBe('b');
  });

  it('manual 下没有焦点项时 ACTIVATE_FOCUSED 是空操作', () => {
    const machine = createTabsMachine({ activationMode: 'manual' });
    const before = machine.getState();

    machine.send({ type: 'ACTIVATE_FOCUSED' });

    expect(machine.getState()).toEqual(before);
  });
});

describe('createTabsMachine 导航', () => {
  it('NEXT 与 PREV 在两端循环', () => {
    const machine = machineWithThree();

    machine.send({ type: 'NAVIGATE_NEXT' });
    expect(machine.getState().focusedValue).toBe('b');

    machine.send({ type: 'NAVIGATE_PREV' });
    machine.send({ type: 'NAVIGATE_PREV' });
    expect(machine.getState().focusedValue).toBe('c');

    machine.send({ type: 'NAVIGATE_NEXT' });
    expect(machine.getState().focusedValue).toBe('a');
  });

  it('FIRST 与 LAST 直接跳到两端', () => {
    const machine = machineWithThree();

    machine.send({ type: 'NAVIGATE_LAST' });
    expect(machine.getState().activeValue).toBe('c');

    machine.send({ type: 'NAVIGATE_FIRST' });
    expect(machine.getState().activeValue).toBe('a');
  });

  it('manual 下四个导航动作都只移动焦点', () => {
    const machine = machineWithThree('manual');

    for (const type of ['NAVIGATE_NEXT', 'NAVIGATE_PREV', 'NAVIGATE_FIRST', 'NAVIGATE_LAST'] as const) {
      machine.send({ type });

      expect(machine.getState().activeValue).toBe('a');
    }

    expect(machine.getState().focusedValue).toBe('c');
  });

  it('空列表下 FIRST 与 LAST 不改变状态', () => {
    const machine = createTabsMachine();
    const before = machine.getState();

    machine.send({ type: 'NAVIGATE_FIRST' });
    machine.send({ type: 'NAVIGATE_LAST' });

    expect(machine.getState()).toEqual(before);
  });

  /**
   * NEXT / PREV 必须与 FIRST / LAST 一样守住空列表。
   *
   * 没有守卫时 tabValues[0] 与 tabValues[-1] 都是 undefined，会被写进 activeValue 与
   * focusedValue：类型上它们分别是 string 与 string | null，undefined 让下游的
   * `focusedValue === null` 判断全部失效，roving tabindex 会算出错误的落点。
   */
  it('空列表下 NEXT 与 PREV 不改变状态，不写入 undefined', () => {
    const machine = createTabsMachine();
    const before = machine.getState();

    machine.send({ type: 'NAVIGATE_NEXT' });
    machine.send({ type: 'NAVIGATE_PREV' });

    expect(machine.getState()).toEqual(before);
    expect(machine.getState().activeValue).toBe('');
    expect(machine.getState().focusedValue).toBeNull();
  });
});

describe('createTabsMachine 快照与订阅', () => {
  it('快照是冻结副本，改它不会污染内部状态', () => {
    const machine = machineWithThree();
    const snapshot = machine.getState();

    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(() => {
      (snapshot as TabsState).activeValue = 'hacked';
    }).toThrow();

    snapshot.tabValues.push('hacked');

    expect(machine.getState().tabValues).toEqual(['a', 'b', 'c']);
  });

  it('状态未变化时不通知，变化时通知一次', () => {
    const machine = machineWithThree();
    const listener = vi.fn();

    machine.subscribe(listener);
    machine.send({ type: 'SET_ACTIVE', payload: 'a' });

    expect(listener).not.toHaveBeenCalled();

    machine.send({ type: 'SET_ACTIVE', payload: 'b' });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0]?.[0].activeValue).toBe('b');
  });

  it('取消订阅后不再收到通知', () => {
    const machine = machineWithThree();
    const listener = vi.fn();
    const unsubscribe = machine.subscribe(listener);

    unsubscribe();
    machine.send({ type: 'SET_ACTIVE', payload: 'c' });

    expect(listener).not.toHaveBeenCalled();
  });

  it('destroy 清空全部订阅者', () => {
    const machine = machineWithThree();
    const first = vi.fn();
    const second = vi.fn();

    machine.subscribe(first);
    machine.subscribe(second);
    machine.destroy();
    machine.send({ type: 'SET_ACTIVE', payload: 'c' });

    expect(first).not.toHaveBeenCalled();
    expect(second).not.toHaveBeenCalled();
  });
});

describe('handleTabsKeydown 方向与循环', () => {
  const context = {
    tabValues: ['a', 'b', 'c'],
    focusedValue: 'b',
    orientation: 'horizontal' as const,
  };

  it('horizontal 用左右箭头，不响应上下', () => {
    expect(handleTabsKeydown('ArrowRight', context)).toEqual({
      nextFocusedValue: 'c',
      shouldActivate: true,
      handled: true,
    });
    expect(handleTabsKeydown('ArrowLeft', context).nextFocusedValue).toBe('a');
    expect(handleTabsKeydown('ArrowDown', context).handled).toBe(false);
    expect(handleTabsKeydown('ArrowUp', context).handled).toBe(false);
  });

  it('vertical 用上下箭头，不响应左右', () => {
    const vertical = { ...context, orientation: 'vertical' as const };

    expect(handleTabsKeydown('ArrowDown', vertical).nextFocusedValue).toBe('c');
    expect(handleTabsKeydown('ArrowUp', vertical).nextFocusedValue).toBe('a');
    expect(handleTabsKeydown('ArrowRight', vertical).handled).toBe(false);
  });

  it('默认循环：末端往后回到首项，首项往前回到末端', () => {
    expect(handleTabsKeydown('ArrowRight', { ...context, focusedValue: 'c' }).nextFocusedValue).toBe(
      'a'
    );
    expect(handleTabsKeydown('ArrowLeft', { ...context, focusedValue: 'a' }).nextFocusedValue).toBe(
      'c'
    );
  });

  it('loop=false 时两端不再移动，且不算已处理', () => {
    const noLoop = { ...context, loop: false };

    expect(handleTabsKeydown('ArrowRight', { ...noLoop, focusedValue: 'c' })).toEqual({
      nextFocusedValue: null,
      shouldActivate: false,
      handled: false,
    });
    expect(handleTabsKeydown('ArrowLeft', { ...noLoop, focusedValue: 'a' }).handled).toBe(false);
  });

  it('Home / End 与方向无关，且不受 loop 影响', () => {
    const noLoop = { ...context, loop: false };

    expect(handleTabsKeydown('Home', noLoop).nextFocusedValue).toBe('a');
    expect(handleTabsKeydown('End', noLoop).nextFocusedValue).toBe('c');
    expect(
      handleTabsKeydown('End', { ...noLoop, orientation: 'vertical' }).nextFocusedValue
    ).toBe('c');
  });
});

describe('handleTabsKeydown 边界', () => {
  it('空列表不处理任何按键', () => {
    const empty = { tabValues: [], focusedValue: null, orientation: 'horizontal' as const };

    for (const key of ['ArrowRight', 'ArrowLeft', 'Home', 'End']) {
      expect(handleTabsKeydown(key, empty)).toEqual({
        nextFocusedValue: null,
        shouldActivate: false,
        handled: false,
      });
    }
  });

  it('没有焦点项时往后到首项、往前到末端', () => {
    const noFocus = {
      tabValues: ['a', 'b', 'c'],
      focusedValue: null,
      orientation: 'horizontal' as const,
    };

    expect(handleTabsKeydown('ArrowRight', noFocus).nextFocusedValue).toBe('a');
    expect(handleTabsKeydown('ArrowLeft', noFocus).nextFocusedValue).toBe('c');
  });

  it('焦点项不在列表里时按「无焦点」处理，不抛错', () => {
    const stale = {
      tabValues: ['a', 'b'],
      focusedValue: 'gone',
      orientation: 'horizontal' as const,
    };

    expect(handleTabsKeydown('ArrowRight', stale).nextFocusedValue).toBe('a');
  });

  it('无关按键与单个 tab 的循环都保持稳定', () => {
    const single = {
      tabValues: ['only'],
      focusedValue: 'only',
      orientation: 'horizontal' as const,
    };

    expect(handleTabsKeydown('Enter', single).handled).toBe(false);
    expect(handleTabsKeydown('a', single).handled).toBe(false);
    expect(handleTabsKeydown('ArrowRight', single).nextFocusedValue).toBe('only');
  });
});