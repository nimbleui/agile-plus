import { createApp, defineComponent, h, nextTick, ref } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  DatePickerCell,
  DatePickerContent,
  DatePickerGrid,
  DatePickerInput,
  DatePickerRoot,
} from '../src/date-picker';

import type { App, VNode } from 'vue';

const apps: App[] = [];

function mount(render: () => VNode): HTMLElement {
  const host = document.createElement('div');

  document.body.append(host);

  const app = createApp(defineComponent({ setup: () => render }));

  app.mount(host);
  apps.push(app);

  return host;
}

function input(): HTMLInputElement {
  return document.querySelector('[data-part="trigger"]') as HTMLInputElement;
}

function content(): HTMLElement | null {
  return document.querySelector('[data-part="content"]');
}

function cells(): HTMLElement[] {
  return Array.from(document.querySelectorAll('[data-part="cell"]'));
}

function cellByValue(value: string): HTMLElement {
  return document.querySelector(`[data-part="cell"][data-value="${value}"]`) as HTMLElement;
}

function click(element: HTMLElement): void {
  element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

function mountPicker(
  rootProps: Record<string, unknown> = {},
  contentProps: Record<string, unknown> = {}
) {
  return mount(() =>
    h(DatePickerRoot, rootProps, {
      default: () => [
        h(DatePickerInput, { placeholder: '请选择日期' }),
        h(DatePickerContent, contentProps, {
          default: () => h(DatePickerGrid),
        }),
      ],
    })
  );
}

afterEach(() => {
  for (const app of apps) app.unmount();

  apps.length = 0;
  document.body.innerHTML = '';
});

describe('结构与懒渲染', () => {
  it('输入框是 combobox，面板首次打开才挂载', async () => {
    mountPicker();

    expect(input().getAttribute('role')).toBe('combobox');
    expect(input().getAttribute('aria-expanded')).toBe('false');
    expect(input().placeholder).toBe('请选择日期');
    expect(content()).toBeNull();

    click(input());
    await nextTick();

    expect(content()).not.toBeNull();
    expect(content()?.getAttribute('role')).toBe('dialog');
    expect(content()?.getAttribute('data-panel')).toBe('date');
    expect(input().getAttribute('aria-expanded')).toBe('true');
    expect(cells()).toHaveLength(42);
    expect(document.querySelectorAll('[data-part="weekday"]')).toHaveLength(7);
    expect(document.querySelectorAll('[role="row"]').length).toBe(7);
  });

  it('键盘 ArrowDown 打开面板', async () => {
    mountPicker();

    input().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await nextTick();

    expect(content()).not.toBeNull();
  });

  it('选中值回显到输入框，选中格带 aria-selected', async () => {
    mountPicker({ defaultValue: '2026-11-15' });

    expect(input().value).toBe('2026-11-15');

    click(input());
    await nextTick();

    const selected = cellByValue('2026-11-15');

    expect(selected.getAttribute('aria-selected')).toBe('true');
    expect(selected.hasAttribute('data-selected')).toBe(true);
  });
});

describe('选值与开合', () => {
  it('点击格子派发 update:modelValue 并关闭面板', async () => {
    const onValue = vi.fn();

    mountPicker({ defaultValue: '2026-11-15', 'onUpdate:modelValue': onValue });

    click(input());
    await nextTick();

    click(cellByValue('2026-11-20'));
    await nextTick();

    expect(onValue).toHaveBeenCalledWith('2026-11-20');
    expect(input().value).toBe('2026-11-20');
    expect(content()).toBeNull();
  });

  it('keepMounted 让面板打开过后常驻，关闭只切 data-state', async () => {
    mountPicker({}, { keepMounted: true });

    click(input());
    await nextTick();

    click(cellByValue('2026-11-20'));
    await nextTick();

    expect(content()).not.toBeNull();
    expect(content()?.getAttribute('data-state')).toBe('closed');
  });

  it('受控 open 与 update:open', async () => {
    const open = ref(false);
    const onOpen = vi.fn((next: boolean) => {
      open.value = next;
    });

    mountPicker({ open: open.value, 'onUpdate:open': onOpen });

    click(input());
    await nextTick();

    expect(onOpen).toHaveBeenCalledWith(true);
  });

  it('禁用时输入框 disabled 且打不开', async () => {
    mountPicker({ disabled: true });

    expect(input().disabled).toBe(true);

    click(input());
    await nextTick();

    expect(content()).toBeNull();
  });

  it('格子 pointerdown 被拦掉，焦点留在输入框', async () => {
    mountPicker();

    click(input());
    await nextTick();

    input().focus();

    const event = new PointerEvent('pointerdown', { bubbles: true, cancelable: true });

    cellByValue('2026-11-20').dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(input());
  });
});

describe('月份 / 年代面板', () => {
  it('月份网格 12 格，点击下钻回日期面板并切换展示月', async () => {
    mount(() =>
      h(
        DatePickerRoot,
        { defaultOpen: true, defaultValue: '2026-11-15' },
        {
          default: () => [
            h(DatePickerInput),
            h(DatePickerContent, null, { default: () => h(DatePickerGrid, { kind: 'month' }) }),
          ],
        }
      )
    );

    await nextTick();

    expect(cells()).toHaveLength(12);
    expect(cells()[0].textContent).toBe('1月');

    click(cellByValue('2026-03-01'));
    await nextTick();

    expect(content()?.getAttribute('data-panel')).toBe('date');
    expect(cellByValue('2026-03-01')).not.toBeNull();
  });

  it('年代网格 12 格，点击下钻到月份面板', async () => {
    mount(() =>
      h(
        DatePickerRoot,
        { defaultOpen: true, defaultValue: '2026-11-15' },
        {
          default: () => [
            h(DatePickerInput),
            h(DatePickerContent, null, { default: () => h(DatePickerGrid, { kind: 'year' }) }),
          ],
        }
      )
    );

    await nextTick();

    expect(cells()).toHaveLength(12);
    expect(cells()[0].textContent).toBe('2019');

    click(cellByValue('2028-01-01'));
    await nextTick();

    expect(content()?.getAttribute('data-panel')).toBe('month');
  });
});

describe('插槽与独立格子', () => {
  it('cell 插槽接管格子内容', async () => {
    mount(() =>
      h(
        DatePickerRoot,
        { defaultOpen: true },
        {
          default: () => [
            h(DatePickerInput),
            h(DatePickerContent, null, {
              default: () =>
                h(DatePickerGrid, null, {
                  cell: (props: { cell: { date: Date } }) =>
                    h('em', null, `#${props.cell.date.getDate()}`),
                }),
            }),
          ],
        }
      )
    );

    await nextTick();

    expect(cells()[0].querySelector('em')).not.toBeNull();
  });

  it('DatePickerCell 脱离 Grid 单独使用时渲染默认文本', async () => {
    mount(() =>
      h(
        DatePickerRoot,
        { defaultOpen: true },
        {
          default: () =>
            h(DatePickerContent, null, {
              default: () => h(DatePickerCell, { date: new Date(2026, 10, 15), kind: 'month' }),
            }),
        }
      )
    );

    await nextTick();

    expect(cells()[0].textContent).toBe('11月');
  });
});

/** Root expose 的时间 API 子集；ref 上的 ComputedRef 已被 Vue 解包成纯值。 */
interface TimeRootExpose {
  value: string | null;
  isOpen: boolean;
  timeParts: { hour: number; minute: number; second: number };
  setTimePart(part: 'hour' | 'minute' | 'second', amount: number): void;
  confirm(): void;
  goNow(): void;
}

function mountTimePicker(rootProps: Record<string, unknown> = {}) {
  const rootRef = ref<TimeRootExpose | null>(null);

  mount(() =>
    h(
      DatePickerRoot,
      { ...rootProps, showTime: true, ref: rootRef },
      {
        default: () => [
          h(DatePickerInput),
          h(DatePickerContent, null, { default: () => h(DatePickerGrid) }),
        ],
      }
    )
  );

  return rootRef;
}

describe('showTime 日期时间', () => {
  it('值与显示格式缺省升级为 YYYY-MM-DD HH:mm:ss', () => {
    mountTimePicker({ defaultValue: '2026-11-15 09:30:00' });

    expect(input().value).toBe('2026-11-15 09:30:00');
  });

  it('选日期保留已选时间且不关闭面板', async () => {
    mountTimePicker({ defaultValue: '2026-11-15 09:30:00' });

    click(input());
    await nextTick();

    click(cellByValue('2026-11-20'));
    await nextTick();

    expect(input().value).toBe('2026-11-20 09:30:00');
    expect(input().getAttribute('aria-expanded')).toBe('true');
  });

  it('未选值时选日期落零点，时间列写入以今天为日期底', async () => {
    const rootRef = mountTimePicker();

    click(input());
    await nextTick();

    click(cellByValue('2026-11-20'));
    await nextTick();

    expect(input().value).toBe('2026-11-20 00:00:00');

    rootRef.value?.setTimePart('hour', 14);
    rootRef.value?.setTimePart('minute', 5);
    await nextTick();

    expect(input().value).toBe('2026-11-20 14:05:00');
    expect(rootRef.value?.timeParts).toEqual({ hour: 14, minute: 5, second: 0 });
  });

  it('先选时间后选日期也成立：日期底是今天', async () => {
    const rootRef = mountTimePicker();

    rootRef.value?.setTimePart('hour', 8);
    await nextTick();

    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');

    expect(input().value).toBe(
      `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())} 08:00:00`
    );
  });

  it('越界时间静默忽略', () => {
    const rootRef = mountTimePicker({ defaultValue: '2026-11-15 09:30:00' });

    rootRef.value?.setTimePart('hour', 24);
    rootRef.value?.setTimePart('minute', -1);

    expect(input().value).toBe('2026-11-15 09:30:00');
  });

  it('confirm 提交草稿并关闭，goNow 写当前日期时间并关闭', async () => {
    const rootRef = mountTimePicker();

    click(input());
    await nextTick();

    input().value = '2026-11-15 08:05:00';
    input().dispatchEvent(new Event('input', { bubbles: true }));

    rootRef.value?.confirm();
    await nextTick();

    expect(input().value).toBe('2026-11-15 08:05:00');
    expect(rootRef.value?.isOpen).toBe(false);

    rootRef.value?.goNow();
    await nextTick();

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');

    expect(input().value).toBe(
      `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ` +
        `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
    );
  });

  it('Enter 确认整个值并关闭面板', async () => {
    mountTimePicker({ defaultValue: '2026-11-15 09:30:00' });

    click(input());
    await nextTick();

    input().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await nextTick();

    expect(input().getAttribute('aria-expanded')).toBe('false');
    expect(input().value).toBe('2026-11-15 09:30:00');
  });

  it('手动输入含时间的文本，blur 提交', async () => {
    mountTimePicker();

    input().value = '2026-11-15 08:05:30';
    input().dispatchEvent(new Event('input', { bubbles: true }));
    input().dispatchEvent(new FocusEvent('blur'));
    await nextTick();

    expect(input().value).toBe('2026-11-15 08:05:30');
  });

  it('运行中切换 showTime 与格式：受控值换格式后显示不丢', async () => {
    const showTime = ref(false);
    const valueFormat = ref('YYYY-MM-DD');
    const model = ref<string | null>('2026-11-15');

    mount(() =>
      h(
        DatePickerRoot,
        {
          showTime: showTime.value,
          valueFormat: valueFormat.value,
          modelValue: model.value,
          'onUpdate:modelValue': (next: string | null) => (model.value = next),
        },
        {
          default: () => [
            h(DatePickerInput),
            h(DatePickerContent, null, { default: () => h(DatePickerGrid) }),
          ],
        }
      )
    );

    expect(input().value).toBe('2026-11-15');

    showTime.value = true;
    valueFormat.value = 'YYYY-MM-DD HH:mm:ss';
    model.value = '2026-11-15 00:00:00';
    await nextTick();

    expect(input().value).toBe('2026-11-15 00:00:00');
  });
});
