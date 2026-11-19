import { createApp, defineComponent, h, nextTick } from 'vue';

import { afterEach, describe, expect, it } from 'vitest';

import { DatePicker } from '../src/date-picker';

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

function mountPicker(props: Record<string, unknown> = {}) {
  return mount(() => h(DatePicker, props));
}

function input(): HTMLInputElement {
  return document.querySelector('[data-part="trigger"]') as HTMLInputElement;
}

function content(): HTMLElement | null {
  return document.querySelector('[data-part="content"]');
}

function cellByValue(value: string): HTMLElement {
  return document.querySelector(`[data-part="cell"][data-value="${value}"]`) as HTMLElement;
}

function timeColumn(part: 'hour' | 'minute' | 'second'): HTMLElement {
  return document.querySelector(`[data-part="time-${part}"]`) as HTMLElement;
}

function timeOption(part: 'hour' | 'minute' | 'second', amount: number): HTMLElement {
  return timeColumn(part).querySelector(`[data-value="${amount}"]`) as HTMLElement;
}

function click(element: HTMLElement): void {
  element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

async function open(): Promise<void> {
  click(input());
  await nextTick();
}

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount();

  document.body.innerHTML = '';
});

describe('成品 DatePicker 时间选择', () => {
  it('缺省不渲染时间列，placeholder 是日期文案', async () => {
    mountPicker();

    expect(input().placeholder).toBe('请选择日期');

    await open();

    expect(document.querySelector('[data-part="time-hour"]')).toBeNull();
    expect(document.querySelector('.y-date-picker-content__confirm')).toBeNull();
  });

  it('showTime 渲染时分秒三列与此刻 / 确定页脚', async () => {
    mountPicker({ showTime: true });

    expect(input().placeholder).toBe('请选择日期时间');

    await open();

    expect(content()?.classList.contains('y-date-picker-content--with-time')).toBe(true);
    expect(timeColumn('hour').getAttribute('role')).toBe('listbox');
    expect(timeColumn('hour').querySelectorAll('[role="option"]')).toHaveLength(24);
    expect(timeColumn('minute').querySelectorAll('[role="option"]')).toHaveLength(60);
    expect(timeColumn('second').querySelectorAll('[role="option"]')).toHaveLength(60);
    expect(document.querySelector('.y-date-picker-content__now')?.textContent).toBe('此刻');
    expect(document.querySelector('.y-date-picker-content__confirm')?.textContent).toBe('确定');
  });

  it('选日期不关闭，点时间列写值并高亮，确定才关闭', async () => {
    mountPicker({ showTime: true, defaultValue: '2026-11-15 09:30:00' });

    await open();

    expect(timeOption('hour', 9).hasAttribute('data-selected')).toBe(true);

    click(cellByValue('2026-11-20'));
    await nextTick();

    expect(input().value).toBe('2026-11-20 09:30:00');
    expect(input().getAttribute('aria-expanded')).toBe('true');

    click(timeOption('hour', 14));
    await nextTick();

    expect(input().value).toBe('2026-11-20 14:30:00');
    expect(timeOption('hour', 14).hasAttribute('data-selected')).toBe(true);
    expect(timeOption('hour', 9).hasAttribute('data-selected')).toBe(false);
    expect(input().getAttribute('aria-expanded')).toBe('true');

    click(document.querySelector('.y-date-picker-content__confirm') as HTMLElement);
    await nextTick();

    expect(input().getAttribute('aria-expanded')).toBe('false');
  });

  it('此刻写当前日期时间并关闭', async () => {
    mountPicker({ showTime: true });

    await open();

    click(document.querySelector('.y-date-picker-content__now') as HTMLElement);
    await nextTick();

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');

    expect(input().value).toBe(
      `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ` +
        `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
    );
    expect(input().getAttribute('aria-expanded')).toBe('false');
  });

  it('时间列点击不抢焦点：焦点留在输入框', async () => {
    mountPicker({ showTime: true });

    await open();

    input().focus();

    timeOption('minute', 45).dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    click(timeOption('minute', 45));
    await nextTick();

    expect(document.activeElement).toBe(input());
    expect(input().value).toMatch(/ 00:45:00$/);
  });
});
