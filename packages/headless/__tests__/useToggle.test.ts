import { effectScope, ref } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { useToggle } from '../src/useToggle';

import type { EffectScope } from 'vue';

import type { UseToggleOptions } from '../src/useToggle';

const scopes: EffectScope[] = [];

/**
 * 在独立 effect scope 里创建 composable。
 *
 * Toggle 只有一个布尔值，没有 DOM 触点也没有生命周期钩子，因此不需要真实元素。
 */
function setup(options: UseToggleOptions = {}) {
  const scope = effectScope();

  scopes.push(scope);

  const api = scope.run(() => useToggle(options));

  if (!api) throw new Error('useToggle 未在 effect scope 内创建');

  return api;
}

afterEach(() => {
  for (const scope of scopes.splice(0)) scope.stop();
});

describe('useToggle 非受控状态', () => {
  it('缺省未按下，defaultPressed 可指定初值', () => {
    expect(setup().pressed.value).toBe(false);
    expect(setup({ defaultPressed: true }).pressed.value).toBe(true);
  });

  it('setPressed 直接写值，toggle 取反', () => {
    const api = setup();

    api.setPressed(true);

    expect(api.pressed.value).toBe(true);

    api.toggle();

    expect(api.pressed.value).toBe(false);
  });

  it('onClick 翻转状态并上报', () => {
    const onPressedChange = vi.fn();
    const api = setup({ onPressedChange });

    api.onClick();

    expect(api.pressed.value).toBe(true);
    expect(onPressedChange).toHaveBeenCalledTimes(1);
    expect(onPressedChange).toHaveBeenCalledWith(true);

    api.onClick();

    expect(api.pressed.value).toBe(false);
    expect(onPressedChange).toHaveBeenLastCalledWith(false);
  });

  it('禁用时 onClick 不改变状态也不上报', () => {
    const onPressedChange = vi.fn();
    const api = setup({ disabled: true, onPressedChange });

    api.onClick();

    expect(api.pressed.value).toBe(false);
    expect(onPressedChange).not.toHaveBeenCalled();
  });

  it('禁用只拦交互路径：setPressed 与 toggle 仍可写值', () => {
    // disabled 表达的是「用户点不动」，不是「值被锁死」；程序化写入仍然生效，
    // 否则受控场景下外部无法在禁用期间修正状态。
    const api = setup({ disabled: true, defaultPressed: false });

    api.toggle();

    expect(api.pressed.value).toBe(true);

    api.setPressed(false);

    expect(api.pressed.value).toBe(false);
  });

  it('disabled 支持 getter 并随来源变化', () => {
    const disabled = ref(false);
    const api = setup({ disabled: () => disabled.value });

    api.onClick();

    expect(api.pressed.value).toBe(true);

    disabled.value = true;
    api.onClick();

    expect(api.pressed.value).toBe(true);
    expect(api.disabled.value).toBe(true);
  });
});

describe('useToggle 受控状态', () => {
  it('pressed 决定值，写入只上报不改内部', () => {
    const onPressedChange = vi.fn();
    const pressed = ref(false);
    const api = setup({ pressed, onPressedChange });

    api.onClick();

    expect(onPressedChange).toHaveBeenCalledWith(true);
    expect(api.pressed.value).toBe(false);

    pressed.value = true;

    expect(api.pressed.value).toBe(true);
  });

  it('受控值缺省为 undefined 时按非受控处理', () => {
    const api = setup({ pressed: undefined, defaultPressed: true });

    api.toggle();

    expect(api.pressed.value).toBe(false);
  });
});

describe('useToggle 属性表', () => {
  it('aria-pressed 始终输出，data-state 用 on / off 词表', () => {
    const api = setup();

    expect(api.getRootProps()).toEqual({
      type: 'button',
      'aria-pressed': false,
      'data-state': 'off',
    });

    api.setPressed(true);

    expect(api.getRootProps()).toEqual({
      type: 'button',
      'aria-pressed': true,
      'data-state': 'on',
    });
  });

  it('禁用时才输出 disabled 与 data-disabled', () => {
    expect(setup().getRootProps()).not.toHaveProperty('disabled');
    expect(setup().getRootProps()).not.toHaveProperty('data-disabled');

    const props = setup({ disabled: true }).getRootProps();

    expect(props.disabled).toBe(true);
    expect(props['data-disabled']).toBe('');
  });
});