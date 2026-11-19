import { createApp, defineComponent, nextTick, ref } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { useDateRangePicker } from '../src/useDateRangePicker';

import type { App, Ref } from 'vue';

import type {
  UseDateRangePickerOptions,
  UseDateRangePickerReturn,
} from '../src/useDateRangePicker';

const apps: App[] = [];

/**
 * 真实双输入框 + 控件容器 + 面板元素，事件监听按模板绑定方式手工挂上。
 * 与 useDatePicker 夹具同构，多一个容器元素作为定位锚点。
 */
function setup(options: UseDateRangePickerOptions = {}) {
  const control = document.createElement('div');
  const start = document.createElement('input');
  const end = document.createElement('input');
  const content = document.createElement('div');

  control.append(start, end);
  document.body.append(control, content);

  let api!: UseDateRangePickerReturn;

  const app = createApp(
    defineComponent({
      setup() {
        api = useDateRangePicker(options);

        return () => null;
      },
    })
  );

  app.mount(document.createElement('div'));
  apps.push(app);

  api.setControlElement(control);
  api.setTriggerElement(start, 0);
  api.setTriggerElement(end, 1);
  api.setContentElement(content);

  const inputs = [start, end] as const;

  ([0, 1] as const).forEach((index) => {
    const input = inputs[index];

    input.addEventListener('input', (event) => api.onInputInput(index, event));
    input.addEventListener('keydown', (event) => api.onInputKeydown(index, event));
    input.addEventListener('blur', () => api.onInputBlur(index));
    input.addEventListener('focus', () => api.onInputFocus(index));
    input.addEventListener('click', () => api.onInputClick(index));
  });

  return { api, control, start, end, content, inputs };
}

function press(input: HTMLInputElement, key: string, shiftKey = false): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true });

  input.dispatchEvent(event);

  return event;
}

function type(input: HTMLInputElement, text: string): void {
  input.value = text;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

afterEach(() => {
  for (const app of apps) app.unmount();

  apps.length = 0;
  document.body.innerHTML = '';
});

describe('点选流程', () => {
  it('起点 → 终点两次点选提交范围并关闭', () => {
    const onValueChange = vi.fn();
    const { api } = setup({ onValueChange });

    expect(api.value.value).toBeNull();

    api.open();
    api.pickDate(new Date(2026, 10, 10));

    expect(api.isOpen.value).toBe(true);
    expect(api.activeIndex.value).toBe(1);
    expect(api.value.value).toBeNull();
    expect(api.displayTexts.value[0]).toBe('2026-11-10');
    expect(api.displayTexts.value[1]).toBe('');

    api.pickDate(new Date(2026, 10, 20));

    expect(api.value.value).toEqual(['2026-11-10', '2026-11-20']);
    expect(onValueChange).toHaveBeenCalledWith(['2026-11-10', '2026-11-20']);
    expect(api.isOpen.value).toBe(false);
    expect(api.displayTexts.value).toEqual(['2026-11-10', '2026-11-20']);
  });

  it('终点早于起点时交换两端', () => {
    const { api } = setup();

    api.open();
    api.pickDate(new Date(2026, 10, 20));
    api.pickDate(new Date(2026, 10, 5));

    expect(api.value.value).toEqual(['2026-11-05', '2026-11-20']);
  });

  it('同一天起终是合法的单日期间', () => {
    const { api } = setup();

    api.open();
    api.pickDate(new Date(2026, 10, 10));
    api.pickDate(new Date(2026, 10, 10));

    expect(api.value.value).toEqual(['2026-11-10', '2026-11-10']);
  });

  it('禁用日不可作为端点；范围内部禁用日不阻断', () => {
    const { api } = setup({ disabledDate: (date) => date.getDate() === 15 });

    api.open();
    api.pickDate(new Date(2026, 10, 15));

    expect(api.activeIndex.value).toBe(0);

    api.pickDate(new Date(2026, 10, 10));
    api.pickDate(new Date(2026, 10, 20));

    expect(api.value.value).toEqual(['2026-11-10', '2026-11-20']);
  });

  it('selectRange 直接提交（预设），端点禁用时拒绝', () => {
    const { api } = setup({ disabledDate: (date) => date.getDate() === 1 });

    api.selectRange(new Date(2026, 10, 5), new Date(2026, 10, 1));

    expect(api.value.value).toBeNull();

    api.selectRange(new Date(2026, 10, 20), new Date(2026, 10, 5));

    expect(api.value.value).toEqual(['2026-11-05', '2026-11-20']);
  });

  it('受控模式只通知不改内部值', () => {
    const model = ref<[string, string] | null>(['2026-11-01', '2026-11-05']);
    const onValueChange = vi.fn((next: [string, string] | null) => {
      model.value = next;
    });
    const { api } = setup({ modelValue: model as Ref<[string, string] | null>, onValueChange });

    expect(api.selectedRange.value).toEqual([new Date(2026, 10, 1), new Date(2026, 10, 5)]);

    api.open();
    api.pickDate(new Date(2026, 10, 10));
    api.pickDate(new Date(2026, 10, 20));

    expect(onValueChange).toHaveBeenCalledWith(['2026-11-10', '2026-11-20']);
    expect(api.value.value).toEqual(['2026-11-10', '2026-11-20']);
  });

  it('clear 清空值与草稿', () => {
    const { api } = setup({ defaultValue: ['2026-11-01', '2026-11-05'] });

    api.clear();

    expect(api.value.value).toBeNull();
    expect(api.displayTexts.value).toEqual(['', '']);
  });
});

describe('悬停预览', () => {
  it('等待终点时起点 + 悬停构成预览，离开清除', () => {
    const { api } = setup();

    api.open();
    api.pickDate(new Date(2026, 10, 10));
    api.onCellPointerEnter(new Date(2026, 10, 15));

    const mid = api.getCellState(new Date(2026, 10, 12), 'left');

    expect(mid.inPreview).toBe(true);
    expect(mid.inRange).toBe(false);
    expect(api.getCellState(new Date(2026, 10, 15), 'left').isHoverEnd).toBe(true);
    expect(api.getCellState(new Date(2026, 10, 10), 'left').isStart).toBe(true);

    api.onCellPointerLeave();

    expect(api.getCellState(new Date(2026, 10, 12), 'left').inPreview).toBe(false);
  });

  it('提交后按 committed 范围高亮，不再响应悬停', () => {
    const { api } = setup({ defaultValue: ['2026-11-10', '2026-11-20'] });

    api.open();
    api.onCellPointerEnter(new Date(2026, 10, 25));

    const state = api.getCellState(new Date(2026, 10, 15), 'left');

    expect(state.inRange).toBe(true);
    expect(state.inPreview).toBe(false);
    expect(api.getCellState(new Date(2026, 10, 20), 'left').isEnd).toBe(true);
  });

  it('开始新一轮选择时终点回显清空', () => {
    const { api } = setup({ defaultValue: ['2026-11-10', '2026-11-20'] });

    api.open();
    api.pickDate(new Date(2026, 10, 12));

    expect(api.displayTexts.value).toEqual(['2026-11-12', '']);
  });
});

describe('键盘交互', () => {
  it('ArrowDown 打开，Enter 依次落起点与终点', () => {
    const { api, start } = setup({ defaultValue: ['2026-11-10', '2026-11-20'] });

    press(start, 'ArrowDown');

    expect(api.isOpen.value).toBe(true);
    expect(api.focusedDate.value).toEqual(new Date(2026, 10, 10));

    press(start, 'ArrowRight');
    press(start, 'Enter');

    expect(api.activeIndex.value).toBe(1);
    // 选值进行中提交值不变，直到两端齐备。
    expect(api.value.value).toEqual(['2026-11-10', '2026-11-20']);

    press(start, 'ArrowRight');
    press(start, 'Enter');

    expect(api.value.value).toEqual(['2026-11-11', '2026-11-12']);
    expect(api.isOpen.value).toBe(false);
  });

  it('Tab 打开态先换端，再按才走出组件', () => {
    const { api, start, end } = setup();

    api.open();

    const first = press(start, 'Tab');

    expect(first.defaultPrevented).toBe(true);
    expect(api.activeIndex.value).toBe(1);
    expect(document.activeElement).toBe(end);

    const second = press(end, 'Tab');

    expect(second.defaultPrevented).toBe(false);
    expect(api.isOpen.value).toBe(false);

    api.open(1);
    const back = press(end, 'Tab', true);

    expect(back.defaultPrevented).toBe(true);
    expect(api.activeIndex.value).toBe(0);
  });

  it('Escape 关闭并丢弃未完成草稿', () => {
    const { api, start } = setup();

    api.open();
    api.pickDate(new Date(2026, 10, 10));
    press(start, 'Escape');

    expect(api.isOpen.value).toBe(false);
    expect(api.value.value).toBeNull();
    expect(api.displayTexts.value).toEqual(['', '']);
  });

  it('焦点跨月时左面板跟随，右面板恒为下一月', () => {
    const { api, start } = setup({ defaultValue: ['2026-11-10', '2026-11-20'] });

    api.open();
    press(start, 'PageDown');

    expect(api.panelDate.value).toEqual(new Date(2026, 11, 1));
    expect(api.rightPanelDate.value).toEqual(new Date(2027, 0, 1));
  });
});

describe('手动输入', () => {
  it('两端依次输入合成范围；只有一端时保留待定草稿', () => {
    const { api, start, end } = setup();

    type(start, '2026-11-10');
    start.dispatchEvent(new FocusEvent('blur'));

    expect(api.value.value).toBeNull();
    expect(api.displayTexts.value[0]).toBe('2026-11-10');

    type(end, '2026-11-20');
    end.dispatchEvent(new FocusEvent('blur'));

    expect(api.value.value).toEqual(['2026-11-10', '2026-11-20']);
  });

  it('已有提交值时改一端即合成新范围', () => {
    const { api, end } = setup({ defaultValue: ['2026-11-10', '2026-11-20'] });

    type(end, '2026-11-25');
    end.dispatchEvent(new FocusEvent('blur'));

    expect(api.value.value).toEqual(['2026-11-10', '2026-11-25']);
  });

  it('非法文本回退，空文本清空', () => {
    const { api, start } = setup({ defaultValue: ['2026-11-10', '2026-11-20'] });

    type(start, '2026-02-30');
    start.dispatchEvent(new FocusEvent('blur'));

    expect(api.value.value).toEqual(['2026-11-10', '2026-11-20']);
    expect(api.displayTexts.value[0]).toBe('2026-11-10');

    type(start, '');
    start.dispatchEvent(new FocusEvent('blur'));

    expect(api.value.value).toBeNull();
  });

  it('输入反序两端自动排序', () => {
    const { api, start, end } = setup();

    type(start, '2026-11-20');
    start.dispatchEvent(new FocusEvent('blur'));
    type(end, '2026-11-10');
    end.dispatchEvent(new FocusEvent('blur'));

    expect(api.value.value).toEqual(['2026-11-10', '2026-11-20']);
  });
});

describe('开合与外部点击', () => {
  it('打开时视图同步到已选起点，受控 open 翻 false 清理草稿', async () => {
    const open = ref(true);
    const { api, start } = setup({
      defaultValue: ['2026-05-10', '2026-05-20'],
      open: open as Ref<boolean>,
    });

    expect(api.panelDate.value).toEqual(new Date(2026, 4, 1));

    api.pickDate(new Date(2026, 4, 12));
    type(start, '2026-05-');
    open.value = false;
    await nextTick();

    expect(api.displayTexts.value).toEqual(['2026-05-10', '2026-05-20']);
  });

  it('外部点击提交活跃端文本并丢弃未完成点选', async () => {
    const { api, start } = setup();

    api.open();
    await nextTick();

    api.pickDate(new Date(2026, 10, 10));
    // 真实输入必先聚焦：focus 把活跃端切回起点输入框。
    start.focus();
    type(start, '2026-11-15');

    const outside = document.createElement('div');

    document.body.append(outside);
    outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

    expect(api.isOpen.value).toBe(false);
    // 活跃端文本已提交为待定草稿，点选草稿被丢弃。
    expect(api.value.value).toBeNull();
    expect(api.displayTexts.value[0]).toBe('2026-11-15');
  });

  it('整体禁用时打不开', () => {
    const { api, start } = setup({ disabled: true });

    api.open();
    start.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(api.isOpen.value).toBe(false);
    expect(api.getTriggerProps(0).disabled).toBe(true);
  });

  it('头部翻页移动左右两月', () => {
    const { api } = setup({ defaultValue: ['2026-11-10', '2026-11-20'] });

    api.open();
    api.shiftView('month', 1);

    expect(api.panelDate.value).toEqual(new Date(2026, 11, 1));
    expect(api.rightPanelDate.value).toEqual(new Date(2027, 0, 1));

    api.shiftView('year', -1);

    expect(api.panelDate.value).toEqual(new Date(2025, 11, 1));
  });
});

describe('ARIA 与格子属性', () => {
  it('左右面板相同日期的 id 不冲突', () => {
    const { api } = setup();

    api.open();

    const date = new Date(2026, 10, 1);

    expect(api.getCellId(date, 'left')).not.toBe(api.getCellId(date, 'right'));
  });

  it('aria-activedescendant 只声明在活跃输入框上', () => {
    const { api } = setup();

    api.open();

    expect(api.getTriggerProps(0)['aria-activedescendant']).toBe(
      api.getCellId(api.focusedDate.value, 'left')
    );
    expect(api.getTriggerProps(1)['aria-activedescendant']).toBeUndefined();
    expect(api.getTriggerProps(0)['data-active']).toBe('');
    expect(api.getTriggerProps(1)['data-active']).toBeUndefined();
  });

  it('格子输出范围标记与月外标记', () => {
    const { api } = setup({ defaultValue: ['2026-11-10', '2026-11-20'] });

    api.open();

    const startProps = api.getCellProps(new Date(2026, 10, 10), 'left');

    expect(startProps['data-range-start']).toBe('');
    expect(startProps['aria-selected']).toBe(true);

    const midProps = api.getCellProps(new Date(2026, 10, 15), 'left');

    expect(midProps['data-in-range']).toBe('');
    expect(midProps['data-selected']).toBeUndefined();

    // 左面板的 12 月补齐格相对左面板是月外，相对右面板是月内。
    const outsideLeft = api.getCellProps(new Date(2026, 11, 1), 'left');
    const insideRight = api.getCellProps(new Date(2026, 11, 1), 'right');

    expect(outsideLeft['data-outside']).toBe('');
    expect(insideRight['data-outside']).toBeUndefined();
  });

  it('网格与面板的 ARIA 结构', () => {
    const { api } = setup();

    api.open();

    expect(api.getContentProps().role).toBe('dialog');
    expect(api.getGridProps('left').role).toBe('grid');
    expect(api.getGridProps('left')['aria-label']).toBe('2026年 11月');
    expect(api.getTriggerProps(0)['aria-owns']).toBe(api.getContentProps().id);
  });
});
