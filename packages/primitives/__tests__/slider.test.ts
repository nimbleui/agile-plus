import { describe, expect, it } from 'vitest';

import {
  clampSliderValue,
  getSliderClosestValueIndex,
  getSliderKeyboardIntent,
  getSliderNextStepValue,
  getSliderNextValues,
  getSliderRangeStyle,
  getSliderThumbInBoundsOffset,
  getSliderThumbLabel,
  getSliderValueFromPointer,
  getSliderValuePercent,
  getSliderVisualPercent,
  normalizeSliderValues,
  snapSliderValue,
} from '../src/slider';

import type { SliderVisualInput } from '../src/slider';

const horizontalLtr: SliderVisualInput = {
  min: 0,
  max: 100,
  step: 1,
  orientation: 'horizontal',
  dir: 'ltr',
  inverted: false,
};

const horizontalRtl: SliderVisualInput = { ...horizontalLtr, dir: 'rtl' };

const horizontalInverted: SliderVisualInput = { ...horizontalLtr, inverted: true };

const vertical: SliderVisualInput = { ...horizontalLtr, orientation: 'vertical' };

const verticalInverted: SliderVisualInput = { ...vertical, inverted: true };

describe('数值吸附与步进', () => {
  it('按 step 的小数位消除浮点尾差', () => {
    expect(snapSliderValue(0.30000000000000004, 0, 1, 0.1)).toBe(0.3);
  });

  it('吸附到以 min 为起点的网格并钳制到范围', () => {
    expect(snapSliderValue(14, 10, 20, 3)).toBe(13);
    expect(snapSliderValue(15, 10, 20, 3)).toBe(16);
    expect(snapSliderValue(150, 0, 100, 1)).toBe(100);
    expect(snapSliderValue(-5, 0, 100, 1)).toBe(0);
  });

  it('对齐时按 multiplier 前进，未对齐时向移动方向取整', () => {
    expect(
      getSliderNextStepValue({ value: 20, min: 0, step: 10, direction: 1, multiplier: 1 })
    ).toBe(30);
    expect(
      getSliderNextStepValue({ value: 24, min: 0, step: 10, direction: 1, multiplier: 1 })
    ).toBe(30);
    expect(
      getSliderNextStepValue({ value: 24, min: 0, step: 10, direction: -1, multiplier: 1 })
    ).toBe(20);
    expect(
      getSliderNextStepValue({ value: 20, min: 0, step: 10, direction: 1, multiplier: 10 })
    ).toBe(120);
    expect(
      getSliderNextStepValue({ value: 0.3, min: 0, step: 0.1, direction: 1, multiplier: 1 })
    ).toBe(0.4);
  });

  it('clampSliderValue 与百分比计算处理边界', () => {
    expect(clampSliderValue(120, 0, 100)).toBe(100);
    expect(getSliderValuePercent(25, 0, 100)).toBe(25);
    expect(getSliderValuePercent(1, 1, 1)).toBe(0);
  });
});

describe('指针位置换算', () => {
  const base = {
    min: 0,
    max: 100,
    step: 1,
    trackStart: 0,
    trackLength: 200,
  };

  it('横向 LTR / RTL / inverted 的组合', () => {
    expect(
      getSliderValueFromPointer({
        ...base,
        pointerPosition: 50,
        orientation: 'horizontal',
        dir: 'ltr',
        inverted: false,
      })
    ).toBe(25);

    expect(
      getSliderValueFromPointer({
        ...base,
        pointerPosition: 50,
        orientation: 'horizontal',
        dir: 'rtl',
        inverted: false,
      })
    ).toBe(75);

    expect(
      getSliderValueFromPointer({
        ...base,
        pointerPosition: 50,
        orientation: 'horizontal',
        dir: 'ltr',
        inverted: true,
      })
    ).toBe(75);

    expect(
      getSliderValueFromPointer({
        ...base,
        pointerPosition: 50,
        orientation: 'horizontal',
        dir: 'rtl',
        inverted: true,
      })
    ).toBe(25);
  });

  it('纵向默认最大值在顶部，inverted 后反转', () => {
    expect(
      getSliderValueFromPointer({
        ...base,
        pointerPosition: 0,
        orientation: 'vertical',
        dir: 'ltr',
        inverted: false,
      })
    ).toBe(100);

    expect(
      getSliderValueFromPointer({
        ...base,
        pointerPosition: 100,
        orientation: 'vertical',
        dir: 'ltr',
        inverted: false,
      })
    ).toBe(50);

    expect(
      getSliderValueFromPointer({
        ...base,
        pointerPosition: 50,
        orientation: 'vertical',
        dir: 'ltr',
        inverted: true,
      })
    ).toBe(25);
  });

  it('指针越界会钳制，并按 step 吸附', () => {
    expect(
      getSliderValueFromPointer({
        ...base,
        pointerPosition: 250,
        orientation: 'horizontal',
        dir: 'ltr',
        inverted: false,
      })
    ).toBe(100);

    expect(
      getSliderValueFromPointer({
        ...base,
        pointerPosition: 55,
        orientation: 'horizontal',
        dir: 'ltr',
        inverted: false,
        step: 10,
      })
    ).toBe(30);
  });

  it('轨道长度为 0 时回退到 min', () => {
    expect(
      getSliderValueFromPointer({
        ...base,
        trackLength: 0,
        pointerPosition: 50,
        orientation: 'horizontal',
        dir: 'ltr',
        inverted: false,
      })
    ).toBe(0);
  });
});

describe('视觉百分比与区间样式', () => {
  it('横向与纵向的视觉百分比遵循 RTL / inverted', () => {
    expect(getSliderVisualPercent(25, horizontalLtr)).toBe(25);
    expect(getSliderVisualPercent(25, horizontalRtl)).toBe(75);
    expect(getSliderVisualPercent(25, horizontalInverted)).toBe(75);
    expect(getSliderVisualPercent(25, vertical)).toBe(75);
    expect(getSliderVisualPercent(25, verticalInverted)).toBe(25);
  });

  it('单 thumb 从最小值画到 thumb，多 thumb 从最小画到最大', () => {
    expect(getSliderRangeStyle([25], horizontalLtr)).toEqual({ left: '0%', right: '75%' });
    expect(getSliderRangeStyle([25, 75], horizontalLtr)).toEqual({
      left: '25%',
      right: '25%',
    });
    expect(getSliderRangeStyle([25], horizontalRtl)).toEqual({ left: '75%', right: '0%' });
    expect(getSliderRangeStyle([25], vertical)).toEqual({ top: '75%', bottom: '0%' });
    expect(getSliderRangeStyle([25], verticalInverted)).toEqual({ top: '0%', bottom: '75%' });
  });
});

describe('键盘意图', () => {
  it('横向 LTR 的方向键映射', () => {
    expect(
      getSliderKeyboardIntent({
        key: 'ArrowRight',
        shiftKey: false,
        orientation: 'horizontal',
        dir: 'ltr',
        inverted: false,
      })
    ).toEqual({ type: 'step', direction: 1, multiplier: 1 });

    expect(
      getSliderKeyboardIntent({
        key: 'ArrowLeft',
        shiftKey: false,
        orientation: 'horizontal',
        dir: 'ltr',
        inverted: false,
      })
    ).toEqual({ type: 'step', direction: -1, multiplier: 1 });

    expect(
      getSliderKeyboardIntent({
        key: 'ArrowUp',
        shiftKey: false,
        orientation: 'horizontal',
        dir: 'ltr',
        inverted: false,
      })
    ).toEqual({ type: 'step', direction: 1, multiplier: 1 });
  });

  it('RTL 与 inverted 翻转左右键', () => {
    expect(
      getSliderKeyboardIntent({
        key: 'ArrowLeft',
        shiftKey: false,
        orientation: 'horizontal',
        dir: 'rtl',
        inverted: false,
      })
    ).toEqual({ type: 'step', direction: 1, multiplier: 1 });

    expect(
      getSliderKeyboardIntent({
        key: 'ArrowRight',
        shiftKey: false,
        orientation: 'horizontal',
        dir: 'rtl',
        inverted: true,
      })
    ).toEqual({ type: 'step', direction: 1, multiplier: 1 });
  });

  it('纵向 inverted 时上下键翻转，Home / End 仍是边界', () => {
    expect(
      getSliderKeyboardIntent({
        key: 'ArrowUp',
        shiftKey: false,
        orientation: 'vertical',
        dir: 'ltr',
        inverted: true,
      })
    ).toEqual({ type: 'step', direction: -1, multiplier: 1 });

    expect(
      getSliderKeyboardIntent({
        key: 'Home',
        shiftKey: false,
        orientation: 'vertical',
        dir: 'ltr',
        inverted: true,
      })
    ).toEqual({ type: 'min' });

    expect(
      getSliderKeyboardIntent({
        key: 'End',
        shiftKey: false,
        orientation: 'vertical',
        dir: 'ltr',
        inverted: true,
      })
    ).toEqual({ type: 'max' });
  });

  it('PageUp / PageDown 与 Shift+方向键跨 10 步', () => {
    expect(
      getSliderKeyboardIntent({
        key: 'PageUp',
        shiftKey: false,
        orientation: 'horizontal',
        dir: 'ltr',
        inverted: false,
      })
    ).toEqual({ type: 'step', direction: 1, multiplier: 10 });

    expect(
      getSliderKeyboardIntent({
        key: 'PageDown',
        shiftKey: false,
        orientation: 'horizontal',
        dir: 'ltr',
        inverted: false,
      })
    ).toEqual({ type: 'step', direction: -1, multiplier: 10 });

    expect(
      getSliderKeyboardIntent({
        key: 'ArrowRight',
        shiftKey: true,
        orientation: 'horizontal',
        dir: 'ltr',
        inverted: false,
      })
    ).toEqual({ type: 'step', direction: 1, multiplier: 10 });
  });

  it('不认识的键返回 null', () => {
    expect(
      getSliderKeyboardIntent({
        key: 'Enter',
        shiftKey: false,
        orientation: 'horizontal',
        dir: 'ltr',
        inverted: false,
      })
    ).toBeNull();
  });
});

describe('多 thumb 更新', () => {
  it('最近 thumb 的计算', () => {
    expect(getSliderClosestValueIndex([10, 30], 25)).toBe(1);
    expect(getSliderClosestValueIndex([10, 30], 20)).toBe(0);
    expect(getSliderClosestValueIndex([10], 999)).toBe(0);
    expect(getSliderClosestValueIndex([], 50)).toBe(0);
  });

  it('默认允许交叉，排序后返回新的控制下标', () => {
    expect(
      getSliderNextValues({
        values: [20, 80],
        index: 0,
        nextValue: 90,
        min: 0,
        max: 100,
        step: 1,
        minStepsBetweenThumbs: 0,
        preserveThumbOrder: false,
      })
    ).toEqual({ values: [80, 90], changedIndex: 1, changed: true });
  });

  it('preserveThumbOrder 把值钳制在相邻 thumb 之间', () => {
    expect(
      getSliderNextValues({
        values: [20, 80],
        index: 0,
        nextValue: 90,
        min: 0,
        max: 100,
        step: 1,
        minStepsBetweenThumbs: 1,
        preserveThumbOrder: true,
      })
    ).toEqual({ values: [79, 80], changedIndex: 0, changed: true });
  });

  it('minStepsBetweenThumbs 不满足时拒绝整次更新', () => {
    expect(
      getSliderNextValues({
        values: [20, 22],
        index: 0,
        nextValue: 21,
        min: 0,
        max: 100,
        step: 1,
        minStepsBetweenThumbs: 2,
        preserveThumbOrder: false,
      })
    ).toEqual({ values: [20, 22], changedIndex: 0, changed: false });
  });

  it('非法下标不产生变化', () => {
    expect(
      getSliderNextValues({
        values: [20],
        index: 3,
        nextValue: 50,
        min: 0,
        max: 100,
        step: 1,
        minStepsBetweenThumbs: 0,
        preserveThumbOrder: false,
      })
    ).toEqual({ values: [20], changedIndex: 3, changed: false });
  });
});

describe('thumb 辅助计算', () => {
  it('贴边偏移在两端为半尺寸，中心为 0', () => {
    expect(getSliderThumbInBoundsOffset(20, 0)).toBe(10);
    expect(getSliderThumbInBoundsOffset(20, 50)).toBe(0);
    expect(getSliderThumbInBoundsOffset(20, 100)).toBe(-10);
    expect(getSliderThumbInBoundsOffset(20, 25)).toBe(5);
  });

  it('多 thumb 默认标签', () => {
    expect(getSliderThumbLabel(0, 1)).toBeUndefined();
    expect(getSliderThumbLabel(0, 2)).toBe('最小值');
    expect(getSliderThumbLabel(1, 2)).toBe('最大值');
    expect(getSliderThumbLabel(2, 3)).toBe('第 3 个值，共 3 个');
  });

  it('归一化会补齐默认值、吸附并排序', () => {
    expect(normalizeSliderValues(undefined, 10, 20, 1)).toEqual([10]);
    expect(normalizeSliderValues([80.4, 20.2], 0, 100, 1)).toEqual([20, 80]);
    expect(normalizeSliderValues([150, -10], 0, 100, 1)).toEqual([0, 100]);
  });
});
