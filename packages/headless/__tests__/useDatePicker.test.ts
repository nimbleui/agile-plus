import { createApp, defineComponent, nextTick, ref } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { useDatePicker } from '../src/useDatePicker';

import type { App, Ref } from 'vue';

import type { UseDatePickerOptions, UseDatePickerReturn } from '../src/useDatePicker';

const apps: App[] = [];

/**
 * 真实输入框 + 面板元素，事件监听按模板的绑定方式手工挂上。
 *
 * 与 useSelect 的夹具同构：不渲染模板，元素直接交给 setTriggerElement /
 * setContentElement，等价于模板 ref 的赋值时机。
 */
function setup(options: UseDatePickerOptions = {}, inForm = false) {
  const input = document.createElement('input');
  const content = document.createElement('div');
  const form = document.createElement('form');

  if (inForm) {
    form.append(input);
    document.body.append(form, content);
  } else {
    document.body.append(input, content);
  }

  let api!: UseDatePickerReturn;

  const app = createApp(
    defineComponent({
      setup() {
        api = useDatePicker(options);

        return () => null;
      },
    })
  );

  app.mount(document.createElement('div'));
  apps.push(app);

  api.setTriggerElement(input);
  api.setContentElement(content);

  input.addEventListener('input', api.onInputInput);
  input.addEventListener('keydown', api.onInputKeydown);
  input.addEventListener('blur', api.onInputBlur);
  input.addEventListener('focus', api.onInputFocus);
  input.addEventListener('click', api.onInputClick);

  return { api, input, content, form };
}

function press(input: HTMLInputElement, key: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });

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

describe('选中值：受控 / 非受控', () => {
  it('非受控默认 null，selectDate 写入 valueFormat 格式并关闭面板', () => {
    const onValueChange = vi.fn();
    const { api } = setup({ onValueChange });

    expect(api.value.value).toBeNull();

    api.open();
    api.selectDate(new Date(2026, 10, 15));

    expect(api.value.value).toBe('2026-11-15');
    expect(onValueChange).toHaveBeenCalledWith('2026-11-15');
    expect(api.isOpen.value).toBe(false);
    expect(api.displayText.value).toBe('2026-11-15');
  });

  it('valueFormat 与 format 分离：存储 ISO，显示中文', () => {
    const { api } = setup({ valueFormat: 'YYYY-MM-DD', format: 'YYYY年M月D日' });

    api.selectDate(new Date(2026, 10, 5));

    expect(api.value.value).toBe('2026-11-05');
    expect(api.displayText.value).toBe('2026年11月5日');
  });

  it('受控模式只通知不改内部值', () => {
    const model = ref<string | null>('2026-11-01');
    const onValueChange = vi.fn((next: string | null) => {
      model.value = next;
    });
    const { api } = setup({ modelValue: model as Ref<string | null>, onValueChange });

    expect(api.selectedDate.value).toEqual(new Date(2026, 10, 1));

    api.selectDate(new Date(2026, 10, 20));

    expect(onValueChange).toHaveBeenCalledWith('2026-11-20');
    expect(api.value.value).toBe('2026-11-20');
  });

  it('disabledDate 命中的日期静默忽略', () => {
    const { api } = setup({ disabledDate: (date) => date.getDay() === 0 });

    api.open();
    // 2026-11-15 是周日。
    api.selectDate(new Date(2026, 10, 15));

    expect(api.value.value).toBeNull();
    expect(api.isOpen.value).toBe(true);
    expect(api.isDateDisabled(new Date(2026, 10, 15))).toBe(true);
    expect(api.isTodayDisabled.value).toBeTypeOf('boolean');
  });

  it('clear 清空值，goToday 选中今天', () => {
    const { api } = setup({ defaultValue: '2026-11-01' });

    api.clear();
    expect(api.value.value).toBeNull();

    api.goToday();

    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');

    expect(api.value.value).toBe(
      `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`
    );
  });
});

describe('开合与面板状态', () => {
  it('打开时视图同步到选中值，关闭重置面板与草稿', async () => {
    const { api } = setup({ defaultValue: '2026-05-20' });

    api.open();

    expect(api.isOpen.value).toBe(true);
    expect(api.panel.value).toBe('date');
    expect(api.panelDate.value).toEqual(new Date(2026, 4, 1));
    expect(api.focusedDate.value).toEqual(new Date(2026, 4, 20));

    api.setPanel('month');
    api.close();
    await nextTick();

    expect(api.panel.value).toBe('date');
  });

  it('受控 open 外部翻 false 也清理编辑态', async () => {
    const open = ref(true);
    const { api, input } = setup({ open: open as Ref<boolean> });

    type(input, '2026-11-');
    open.value = false;
    await nextTick();

    expect(api.displayText.value).toBe('');
    expect(api.panel.value).toBe('date');
  });

  it('整体禁用时打不开', () => {
    const { api, input } = setup({ disabled: true });

    api.open();
    input.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(api.isOpen.value).toBe(false);
    expect(api.getTriggerProps().disabled).toBe(true);
  });

  it('外部 pointerdown 关闭面板并提交草稿', async () => {
    const { api, input } = setup();

    api.open();
    // 外部点击监听在 post 渲染批次挂上，与真实事件循环的时序一致。
    await nextTick();

    type(input, '2026-11-20');

    const outside = document.createElement('div');

    document.body.append(outside);
    outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

    expect(api.isOpen.value).toBe(false);
    expect(api.value.value).toBe('2026-11-20');
  });

  it('点击输入框或面板内部不关闭', async () => {
    const { api, input, content } = setup();

    api.open();
    await nextTick();

    input.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    content.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

    expect(api.isOpen.value).toBe(true);
  });
});

describe('键盘导航', () => {
  it('ArrowDown 打开，方向键移动焦点且视图跟随，Enter 选值关闭', () => {
    const { api, input } = setup({ defaultValue: '2026-11-15' });

    press(input, 'ArrowDown');
    expect(api.isOpen.value).toBe(true);

    press(input, 'ArrowRight');
    expect(api.focusedDate.value).toEqual(new Date(2026, 10, 16));

    press(input, 'ArrowDown');
    expect(api.focusedDate.value).toEqual(new Date(2026, 10, 23));

    // 跨月导航：面板跟着焦点翻月。
    press(input, 'PageDown');
    expect(api.focusedDate.value).toEqual(new Date(2026, 11, 23));
    expect(api.panelDate.value).toEqual(new Date(2026, 11, 1));

    const enter = press(input, 'Enter');

    expect(enter.defaultPrevented).toBe(true);
    expect(api.value.value).toBe('2026-12-23');
    expect(api.isOpen.value).toBe(false);
  });

  it('Escape 关闭，Tab 关闭且不拦默认行为', () => {
    const { api, input } = setup();

    api.open();
    const escape = press(input, 'Escape');

    expect(escape.defaultPrevented).toBe(true);
    expect(api.isOpen.value).toBe(false);

    api.open();
    const tab = press(input, 'Tab');

    expect(tab.defaultPrevented).toBe(false);
    expect(api.isOpen.value).toBe(false);
  });

  it('焦点落在禁用日时 Enter 不选值', () => {
    const { api, input } = setup({
      defaultValue: '2026-11-14',
      disabledDate: (date) => date.getDate() === 15,
    });

    api.open();
    press(input, 'ArrowRight');
    press(input, 'Enter');

    expect(api.value.value).toBe('2026-11-14');
    expect(api.isOpen.value).toBe(true);
  });

  it('月份 / 年代面板的确认是逐级下钻而不是选值', () => {
    const { api, input } = setup({ defaultValue: '2026-11-15' });

    api.open();
    api.setPanel('year');
    expect(api.panel.value).toBe('year');

    press(input, 'ArrowRight');
    press(input, 'Enter');

    expect(api.panel.value).toBe('month');
    expect(api.focusedDate.value.getFullYear()).toBe(2027);
    expect(api.focusedDate.value.getMonth()).toBe(10);

    press(input, 'Enter');

    expect(api.panel.value).toBe('date');
    expect(api.panelDate.value).toEqual(new Date(2027, 10, 1));
    expect(api.value.value).toBe('2026-11-15');
  });
});

describe('手动输入', () => {
  it('blur 提交合法文本，非法文本回退到选中值', () => {
    const { api, input } = setup({ defaultValue: '2026-11-01' });

    type(input, '2026-11-20');
    expect(api.displayText.value).toBe('2026-11-20');

    input.dispatchEvent(new FocusEvent('blur'));
    expect(api.value.value).toBe('2026-11-20');

    type(input, '2026-02-30');
    input.dispatchEvent(new FocusEvent('blur'));

    expect(api.value.value).toBe('2026-11-20');
    expect(api.displayText.value).toBe('2026-11-20');
  });

  it('清空文本后 blur 清空值', () => {
    const { api, input } = setup({ defaultValue: '2026-11-01' });

    type(input, '');
    input.dispatchEvent(new FocusEvent('blur'));

    expect(api.value.value).toBeNull();
  });

  it('打开态 Enter 提交草稿并关闭；关闭态 Enter 只在有草稿时接管', () => {
    const { api, input } = setup();

    api.open();
    type(input, '2026-11-20');
    press(input, 'Enter');

    expect(api.value.value).toBe('2026-11-20');
    expect(api.isOpen.value).toBe(false);

    type(input, '2026-12-01');
    const enter = press(input, 'Enter');

    expect(enter.defaultPrevented).toBe(true);
    expect(api.value.value).toBe('2026-12-01');

    // 无草稿时关闭态 Enter 交还浏览器（表单提交）。
    const plain = press(input, 'Enter');

    expect(plain.defaultPrevented).toBe(false);
  });

  it('Escape 丢弃草稿', () => {
    const { api, input } = setup({ defaultValue: '2026-11-01' });

    api.open();
    type(input, '2026-11-20');
    press(input, 'Escape');

    expect(api.value.value).toBe('2026-11-01');
    expect(api.displayText.value).toBe('2026-11-01');
  });

  it('disabledDate 命中的输入文本不写值', () => {
    const { api, input } = setup({ disabledDate: (date) => date.getDate() === 20 });

    type(input, '2026-11-20');
    input.dispatchEvent(new FocusEvent('blur'));

    expect(api.value.value).toBeNull();
  });
});

describe('格子状态与 ARIA', () => {
  it('getCellProps 输出选中 / 今天 / 月外 / 禁用标记', () => {
    const { api } = setup({
      defaultValue: '2026-11-15',
      disabledDate: (date) => date.getDate() === 16,
    });

    api.open();

    const selected = api.getCellProps(new Date(2026, 10, 15), 'date');

    expect(selected['aria-selected']).toBe(true);
    expect(selected['data-selected']).toBe('');
    expect(selected.role).toBe('gridcell');

    const disabled = api.getCellProps(new Date(2026, 10, 16), 'date');

    expect(disabled['data-disabled']).toBe('');
    expect(disabled['aria-disabled']).toBe(true);

    const outside = api.getCellProps(new Date(2026, 9, 26), 'date');

    expect(outside['data-outside']).toBe('');

    const today = api.getCellProps(new Date(), 'date');

    expect(today['data-today']).toBe('');
  });

  it('月份 / 年代格子的 id 与焦点归一到月首 / 年首', () => {
    const { api } = setup({ defaultValue: '2026-11-15' });

    api.open();
    api.setPanel('month');

    const focused = api.focusedDate.value;
    const monthId = api.getCellId(focused, 'month');

    expect(monthId).toBe(api.getCellId(new Date(2026, 10, 1), 'month'));
    expect(api.getTriggerProps()['aria-activedescendant']).toBe(monthId);

    const monthProps = api.getCellProps(new Date(2026, 10, 1), 'month');

    expect(monthProps['data-selected']).toBe('');
    expect(monthProps['data-focused']).toBe('');
  });

  it('年代面板的补齐格标记为 outside', () => {
    const { api } = setup({ defaultValue: '2026-11-15' });

    api.open();
    api.setPanel('year');

    expect(api.getCellProps(new Date(2019, 0, 1), 'year')['data-outside']).toBe('');
    expect(api.getCellProps(new Date(2026, 0, 1), 'year')['data-outside']).toBeUndefined();
  });

  it('打开时声明 aria-owns，关闭时不声明', () => {
    const { api } = setup();

    expect(api.getTriggerProps()['aria-owns']).toBeUndefined();

    api.open();

    expect(api.getTriggerProps()['aria-owns']).toBe(api.getContentProps().id);
    expect(api.getTriggerProps()['aria-expanded']).toBe(true);
    expect(api.getContentProps().role).toBe('dialog');
  });

  it('getCellState 与插槽共用同一份判定', () => {
    const { api } = setup({ defaultValue: '2026-11-15' });

    api.open();

    const state = api.getCellState(new Date(2026, 10, 15));

    expect(state).toEqual({ selected: true, disabled: false, today: false, inMonth: true });
  });
});

describe('头部翻页', () => {
  it('shiftView 按月 / 年 / 年代移动展示月与焦点', () => {
    const { api } = setup({ defaultValue: '2026-11-15' });

    api.open();

    api.shiftView('month', 1);
    expect(api.panelDate.value).toEqual(new Date(2026, 11, 1));
    expect(api.focusedDate.value).toEqual(new Date(2026, 11, 15));

    api.shiftView('year', -1);
    expect(api.panelDate.value).toEqual(new Date(2025, 11, 1));

    api.shiftView('decade', 1);
    expect(api.panelDate.value).toEqual(new Date(2035, 11, 1));
    expect(api.decadeLabel.value).toBe('2030 - 2039');
  });

  it('月末焦点翻页时 clamp 到目标月末', () => {
    const { api } = setup({ defaultValue: '2023-01-31' });

    api.open();
    api.shiftView('month', 1);

    expect(api.focusedDate.value).toEqual(new Date(2023, 1, 28));
  });
});

describe('表单接入', () => {
  it('form.reset() 把值还原到 defaultValue', async () => {
    const { api, form } = setup({ defaultValue: '2026-11-01', name: 'birthday' }, true);

    // reset 监听是 post-flush watch，元素登记后要等一拍才挂上。
    await nextTick();

    api.selectDate(new Date(2026, 10, 20));
    expect(api.value.value).toBe('2026-11-20');

    form.reset();
    await nextTick();

    expect(api.value.value).toBe('2026-11-01');
    expect(api.getTriggerProps().name).toBe('birthday');
  });

  it('受控模式下 reset 通过回调还原 v-model 的值', async () => {
    const model = ref<string | null>('2026-11-01');
    const { api, form } = setup(
      {
        modelValue: model as Ref<string | null>,
        onValueChange: (next) => {
          model.value = next;
        },
      },
      true
    );

    await nextTick();

    api.selectDate(new Date(2026, 10, 20));
    expect(model.value).toBe('2026-11-20');

    form.reset();
    await nextTick();

    expect(model.value).toBe('2026-11-01');
    expect(api.value.value).toBe('2026-11-01');
  });
});

describe('焦点交还', () => {
  it('焦点曾在面板内时关闭交还输入框，且不会立刻重新打开', () => {
    const { api, input, content } = setup();

    api.open();

    const inner = document.createElement('button');

    content.append(inner);
    inner.focus();

    api.close();

    expect(document.activeElement).toBe(input);
    expect(api.isOpen.value).toBe(false);
  });
});
