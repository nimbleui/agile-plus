import { createApp, defineComponent, h, nextTick, ref } from 'vue';

import { afterEach, describe, expect, it } from 'vitest';

import {
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from '../src/dialog';

import type { App, Ref } from 'vue';

const apps: App[] = [];

function mountDialog(): { app: App; open: Ref<boolean> } {
  const open = ref(false);

  const app = createApp(
    defineComponent({
      setup() {
        return () =>
          h(
            DialogRoot,
            {
              open: open.value,
              'onUpdate:open': (value: boolean) => {
                open.value = value;
              },
            },
            () => [
              h(DialogTrigger, {}, () => '打开'),
              h(DialogOverlay),
              h(DialogContent, {}, () => [
                h(DialogTitle, {}, () => '标题'),
                h(DialogDescription, {}, () => '描述'),
                h('button', { 'data-testid': 'first' }, '第一个'),
                h('button', { 'data-testid': 'last' }, '最后一个'),
              ]),
            ]
          );
      },
    })
  );

  const host = document.createElement('div');

  document.body.append(host);
  app.mount(host);
  apps.push(app);

  return { app, open };
}

function content(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-part="content"]');
}

function dispatchTab(element: HTMLElement): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key: 'Tab',
    bubbles: true,
    cancelable: true,
  });

  element.dispatchEvent(event);

  return event;
}

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount();

  document.body.innerHTML = '';
  document.body.style.overflow = '';
  document.body.style.paddingRight = '';
});

describe('Dialog UI', () => {
  it('打开后锁定滚动并让 Tab 在内容内循环，关闭后恢复', async () => {
    document.body.style.overflow = 'auto';

    const { open } = mountDialog();
    const trigger = document.querySelector<HTMLButtonElement>('[aria-haspopup="dialog"]');

    if (!trigger) throw new Error('未找到 Dialog 触发器');

    trigger.click();
    await nextTick();
    await nextTick();

    const panel = content();

    if (!panel) throw new Error('打开后未找到 Dialog 内容容器');

    expect(document.body.style.overflow).toBe('hidden');
    expect(panel.contains(document.activeElement)).toBe(true);

    const first = panel.querySelector<HTMLButtonElement>('[data-testid="first"]');
    const last = panel.querySelector<HTMLButtonElement>('[data-testid="last"]');

    if (!first || !last) throw new Error('未找到内容区内的按钮');

    last.focus();

    const event = dispatchTab(last);

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(first);

    open.value = false;
    await nextTick();
    await nextTick();

    expect(content()).toBeNull();
    expect(document.body.style.overflow).toBe('auto');
  });
});
