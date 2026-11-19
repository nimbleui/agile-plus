import { createApp, defineComponent, h, nextTick, ref } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  DateRangePickerContent,
  DateRangePickerGrid,
  DateRangePickerInput,
  DateRangePickerRoot,
} from '../src/date-range-picker';

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

function inputs(): [HTMLInputElement, HTMLInputElement] {
  const nodes = document.querySelectorAll('[data-part="trigger"]');

  return [nodes[0] as HTMLInputElement, nodes[1] as HTMLInputElement];
}

function content(): HTMLElement | null {
  return document.querySelector('[data-part="content"]');
}

function cells(): HTMLElement[] {
  return Array.from(document.querySelectorAll('[data-part="cell"]'));
}

function cellByValue(value: string, side: 'left' | 'right' = 'left'): HTMLElement {
  const grids = document.querySelectorAll('[data-part="grid"]');
  const grid = grids[side === 'left' ? 0 : 1];

  return grid.querySelector(`[data-part="cell"][data-value="${value}"]`) as HTMLElement;
}

function click(element: HTMLElement): void {
  element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

function mountRange(
  rootProps: Record<string, unknown> = {},
  contentProps: Record<string, unknown> = {}
) {
  return mount(() =>
    h(DateRangePickerRoot, rootProps, {
      default: () => [
        h(DateRangePickerInput, { index: 0, placeholder: '开始日期' }),
        h(DateRangePickerInput, { index: 1, placeholder: '结束日期' }),
        h(DateRangePickerContent, contentProps, {
          default: () => [
            h(DateRangePickerGrid, { side: 'left' }),
            h(DateRangePickerGrid, { side: 'right' }),
          ],
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
  it('双 combobox 输入框，面板首次打开才挂载，左右两月共 84 格', async () => {
    mountRange();

    const [start, end] = inputs();

    expect(start.getAttribute('role')).toBe('combobox');
    expect(end.getAttribute('role')).toBe('combobox');
    expect(start.placeholder).toBe('开始日期');
    expect(end.placeholder).toBe('结束日期');
    expect(content()).toBeNull();

    click(start);
    await nextTick();

    expect(content()).not.toBeNull();
    expect(content()?.getAttribute('role')).toBe('dialog');
    expect(document.querySelectorAll('[data-part="grid"]')).toHaveLength(2);
    expect(cells()).toHaveLength(84);
    expect(document.querySelectorAll('[data-part="weekday"]')).toHaveLength(14);
    expect(start.getAttribute('data-active')).toBe('');
    expect(end.getAttribute('data-active')).toBeNull();
  });

  it('提交值回显两端并标记范围', async () => {
    mountRange({ defaultValue: ['2026-11-10', '2026-11-20'] });

    const [start, end] = inputs();

    expect(start.value).toBe('2026-11-10');
    expect(end.value).toBe('2026-11-20');

    click(start);
    await nextTick();

    expect(cellByValue('2026-11-10').hasAttribute('data-range-start')).toBe(true);
    expect(cellByValue('2026-11-20').hasAttribute('data-range-end')).toBe(true);
    expect(cellByValue('2026-11-15').hasAttribute('data-in-range')).toBe(true);
    expect(cellByValue('2026-11-15').getAttribute('aria-selected')).toBe('false');
  });
});

describe('点选流程', () => {
  it('起点 → 活跃端切换 → 终点提交并关闭', async () => {
    const onValue = vi.fn();

    mountRange({ 'onUpdate:modelValue': onValue });

    const [start, end] = inputs();

    click(start);
    await nextTick();

    click(cellByValue('2026-11-10'));
    await nextTick();

    expect(start.value).toBe('2026-11-10');
    expect(end.value).toBe('');
    expect(end.getAttribute('data-active')).toBe('');
    expect(content()?.getAttribute('data-state')).toBe('open');

    click(cellByValue('2026-11-20'));
    await nextTick();

    expect(onValue).toHaveBeenCalledWith(['2026-11-10', '2026-11-20']);
    expect(start.value).toBe('2026-11-10');
    expect(end.value).toBe('2026-11-20');
    expect(content()).toBeNull();
  });

  it('终点早于起点时交换两端', async () => {
    const onValue = vi.fn();

    mountRange({ 'onUpdate:modelValue': onValue });

    click(inputs()[0]);
    await nextTick();

    click(cellByValue('2026-11-20'));
    await nextTick();
    click(cellByValue('2026-11-05'));
    await nextTick();

    expect(onValue).toHaveBeenCalledWith(['2026-11-05', '2026-11-20']);
  });

  it('右面板的日期可以直接点选', async () => {
    const onValue = vi.fn();

    mountRange({ 'onUpdate:modelValue': onValue });

    click(inputs()[0]);
    await nextTick();

    click(cellByValue('2026-11-10', 'left'));
    await nextTick();
    click(cellByValue('2026-12-15', 'right'));
    await nextTick();

    expect(onValue).toHaveBeenCalledWith(['2026-11-10', '2026-12-15']);
  });

  it('悬停预览标记 data-preview 与 data-hover-end', async () => {
    mountRange();

    click(inputs()[0]);
    await nextTick();

    click(cellByValue('2026-11-10'));
    await nextTick();

    cellByValue('2026-11-15').dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
    await nextTick();

    expect(cellByValue('2026-11-12').hasAttribute('data-preview')).toBe(true);
    expect(cellByValue('2026-11-15').hasAttribute('data-hover-end')).toBe(true);
    expect(cellByValue('2026-11-10').hasAttribute('data-range-start')).toBe(true);
  });

  it('keepMounted 让面板打开过后常驻', async () => {
    mountRange({}, { keepMounted: true });

    click(inputs()[0]);
    await nextTick();

    click(cellByValue('2026-11-10'));
    await nextTick();
    click(cellByValue('2026-11-20'));
    await nextTick();

    expect(content()).not.toBeNull();
    expect(content()?.getAttribute('data-state')).toBe('closed');
  });

  it('禁用时打不开', async () => {
    mountRange({ disabled: true });

    const [start] = inputs();

    expect(start.disabled).toBe(true);

    click(start);
    await nextTick();

    expect(content()).toBeNull();
  });

  it('受控 open 与 update:open', async () => {
    const open = ref(false);
    const onOpen = vi.fn((next: boolean) => {
      open.value = next;
    });

    mountRange({ open: open.value, 'onUpdate:open': onOpen });

    click(inputs()[0]);
    await nextTick();

    expect(onOpen).toHaveBeenCalledWith(true);
  });

  it('格子 pointerdown 被拦掉，焦点留在输入框', async () => {
    mountRange();

    const [start] = inputs();

    click(start);
    await nextTick();

    start.focus();

    const event = new PointerEvent('pointerdown', { bubbles: true, cancelable: true });

    cellByValue('2026-11-10').dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(start);
  });
});

describe('插槽', () => {
  it('cell 插槽接管格子内容', async () => {
    mount(() =>
      h(
        DateRangePickerRoot,
        { defaultOpen: true },
        {
          default: () => [
            h(DateRangePickerInput, { index: 0 }),
            h(DateRangePickerInput, { index: 1 }),
            h(DateRangePickerContent, null, {
              default: () =>
                h(
                  DateRangePickerGrid,
                  { side: 'left' },
                  {
                    cell: (props: { cell: { date: Date } }) =>
                      h('em', null, `#${props.cell.date.getDate()}`),
                  }
                ),
            }),
          ],
        }
      )
    );

    await nextTick();

    expect(cells()[0].querySelector('em')).not.toBeNull();
  });
});
