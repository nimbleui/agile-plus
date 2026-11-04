import { effectScope, nextTick, ref } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { useSlider } from '../src/useSlider';

import type { EffectScope } from 'vue';

import type { UseSliderOptions, UseSliderReturn } from '../src/useSlider';

interface SliderFixture {
  api: UseSliderReturn;
  root: HTMLDivElement;
  thumb: HTMLSpanElement;
  scope: EffectScope;
}

const scopes: EffectScope[] = [];

/**
 * 搭出真实根元素与 thumb，并桩出布局矩形。
 *
 * jsdom 不做布局，getBoundingClientRect 与 offsetWidth 恒为 0；
 * 指针换算和贴边偏移必须有稳定输入，因此在这里给出确定的像素快照。
 */
function setup(options: UseSliderOptions = {}): SliderFixture {
  const root = document.createElement('div');
  const thumb = document.createElement('span');

  root.append(thumb);
  document.body.append(root);

  root.getBoundingClientRect = () =>
    ({
      x: 0,
      y: 0,
      width: 200,
      height: 200,
      top: 0,
      left: 0,
      right: 200,
      bottom: 200,
      toJSON: () => ({}),
    }) as DOMRect;

  Object.defineProperty(thumb, 'offsetWidth', { configurable: true, value: 20 });
  Object.defineProperty(thumb, 'offsetHeight', { configurable: true, value: 20 });

  const scope = effectScope();
  const api = scope.run(() => useSlider({ defaultValue: [40], ...options }));

  if (!api) throw new Error('useSlider 未在 effect scope 内创建');

  scopes.push(scope);
  api.setRootElement(root);
  api.setThumbElement(0, thumb);

  return { api, root, thumb, scope };
}

function dispatchPointerDown(api: UseSliderReturn, clientX: number): MouseEvent {
  const event = new MouseEvent('pointerdown', {
    clientX,
    button: 0,
    bubbles: true,
    cancelable: true,
  });

  api.onRootPointerDown(event as unknown as PointerEvent);

  return event;
}

function dispatchPointerMove(clientX: number): void {
  window.dispatchEvent(new MouseEvent('pointermove', { clientX }));
}

function dispatchPointerUp(): void {
  window.dispatchEvent(new MouseEvent('pointerup'));
}

function pressKey(api: UseSliderReturn, key: string, init: KeyboardEventInit = {}): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...init,
  });

  api.onThumbKeydown(event, 0);

  return event;
}

afterEach(() => {
  for (const scope of scopes.splice(0)) scope.stop();

  document.body.innerHTML = '';
});

describe('键盘与受控模式', () => {
  it('方向键、Shift、PageUp 与 Home/End 更新值并提交', () => {
    const onValueChange = vi.fn();
    const onValueCommit = vi.fn();
    const { api } = setup({ onValueChange, onValueCommit });

    const arrow = pressKey(api, 'ArrowRight');

    expect(arrow.defaultPrevented).toBe(true);
    expect(api.values.value).toEqual([41]);
    expect(onValueChange).toHaveBeenLastCalledWith([41]);
    expect(onValueCommit).toHaveBeenLastCalledWith([41]);

    pressKey(api, 'ArrowRight', { shiftKey: true });

    expect(api.values.value).toEqual([51]);

    pressKey(api, 'PageUp');

    expect(api.values.value).toEqual([61]);

    pressKey(api, 'Home');

    expect(api.values.value).toEqual([0]);

    pressKey(api, 'End');

    expect(api.values.value).toEqual([100]);
  });

  it('RTL 下左右方向键按视觉方向翻转', () => {
    const { api } = setup({ dir: 'rtl' });

    pressKey(api, 'ArrowRight');

    expect(api.values.value).toEqual([39]);
  });

  it('受控模式只回调，不修改内部值', async () => {
    const value = ref([20]);
    const onValueChange = vi.fn();
    const { api } = setup({ value, onValueChange });

    pressKey(api, 'ArrowRight');

    expect(onValueChange).toHaveBeenLastCalledWith([21]);
    expect(api.values.value).toEqual([20]);

    value.value = [30];
    await nextTick();

    expect(api.values.value).toEqual([30]);
  });

  it('带修饰键的按键不接管', () => {
    const { api } = setup();
    const event = pressKey(api, 'ArrowRight', { ctrlKey: true });

    expect(event.defaultPrevented).toBe(false);
    expect(api.values.value).toEqual([40]);
  });
});

describe('指针拖拽', () => {
  it('点击轨道立即定位，移动持续更新，释放时提交一次', () => {
    const onValueChange = vi.fn();
    const onValueCommit = vi.fn();
    const { api } = setup({ onValueChange, onValueCommit });

    const down = dispatchPointerDown(api, 50);

    expect(down.defaultPrevented).toBe(true);
    expect(api.values.value).toEqual([25]);

    dispatchPointerMove(100);

    expect(api.values.value).toEqual([50]);
    expect(onValueChange).toHaveBeenCalledTimes(2);

    dispatchPointerUp();

    expect(onValueCommit).toHaveBeenCalledTimes(1);
    expect(onValueCommit).toHaveBeenCalledWith([50]);

    // 释放后监听已摘除，继续移动不再改变值
    dispatchPointerMove(150);

    expect(api.values.value).toEqual([50]);
  });

  it('thumb 按下不会冒泡成轨道点击', () => {
    const { api } = setup();

    const down = new MouseEvent('pointerdown', {
      clientX: 150,
      button: 0,
      bubbles: true,
      cancelable: true,
    });

    api.onThumbPointerDown(down as unknown as PointerEvent, 0);

    expect(down.defaultPrevented).toBe(true);
    expect(api.values.value).toEqual([40]);

    dispatchPointerUp();
  });
});

describe('多 thumb、表单与样式', () => {
  it('生成默认标签、区间样式与 name[] 隐藏 input', () => {
    const { api } = setup({
      defaultValue: [20, 80],
      minStepsBetweenThumbs: 1,
      name: 'price',
      form: 'checkout',
    });

    expect(api.getThumbProps(0)['aria-label']).toBe('最小值');
    expect(api.getThumbProps(1)['aria-label']).toBe('最大值');
    expect(api.getRangeStyle()).toEqual({ left: '20%', right: '20%' });

    expect(api.getHiddenInputs()).toEqual([
      { index: 0, name: 'price[]', value: '20', form: 'checkout' },
      { index: 1, name: 'price[]', value: '80', form: 'checkout' },
    ]);
  });

  it('thumb 样式包含百分比位置、贴边偏移与主轴居中位移', () => {
    const horizontal = setup();

    expect(horizontal.api.getThumbStyle(0)).toEqual({
      position: 'absolute',
      left: 'calc(40% + 2px)',
      transform: 'translateX(-50%)',
    });

    const vertical = setup({ orientation: 'vertical', defaultValue: [25] });

    expect(vertical.api.getThumbStyle(0)).toEqual({
      position: 'absolute',
      top: 'calc(75% - 5px)',
      transform: 'translateY(-50%)',
    });
  });

  it('单 thumb 不自动生成标签，禁用后退出 Tab 序列', () => {
    const { api } = setup({ name: 'volume' });

    expect(api.getThumbProps(0)['aria-label']).toBeUndefined();
    expect(api.getThumbProps(0)['tabindex']).toBe(0);
    expect(api.getHiddenInputs()).toEqual([
      { index: 0, name: 'volume', value: '40', form: undefined },
    ]);

    const disabled = setup({ disabled: true });

    expect(disabled.api.getRootProps()['aria-disabled']).toBe(true);
    expect(disabled.api.getThumbProps(0)['tabindex']).toBeUndefined();
  });
});
