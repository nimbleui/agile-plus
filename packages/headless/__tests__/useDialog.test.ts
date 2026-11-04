import { createApp, defineComponent, nextTick } from 'vue';

import { afterEach, describe, expect, it } from 'vitest';

import { useDialog } from '../src/useDialog';

import type { App } from 'vue';

import type { UseDialogOptions, UseDialogReturn } from '../src/useDialog';

interface DialogFixture {
  api: UseDialogReturn;
  app: App;
  content: HTMLElement;
  first: HTMLButtonElement;
  last: HTMLButtonElement;
  outside: HTMLButtonElement;
}

const apps: App[] = [];

/**
 * 用最小应用实例挂载 useDialog，并搭出真实的内容容器与外部焦点。
 *
 * 焦点陷阱和滚动锁都依赖组件生命周期内的 DOM 与作用域清理，
 * 因此不用 effectScope 模拟，避免漏掉卸载路径。
 */
function setup(options: UseDialogOptions = {}): DialogFixture {
  const trigger = document.createElement('button');
  const outside = document.createElement('button');
  const content = document.createElement('div');
  const first = document.createElement('button');
  const last = document.createElement('button');

  content.tabIndex = -1;
  content.append(first, last);
  document.body.append(trigger, outside, content);
  trigger.focus();

  let api!: UseDialogReturn;

  const app = createApp(
    defineComponent({
      setup() {
        api = useDialog({ defaultOpen: true, ...options });
        api.setContentElement(content);

        return () => null;
      },
    })
  );

  const host = document.createElement('div');

  document.body.append(host);
  app.mount(host);
  apps.push(app);

  return { api, app, content, first, last, outside };
}

function dispatchTab(element: HTMLElement, shiftKey = false): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key: 'Tab',
    shiftKey,
    bubbles: true,
    cancelable: true,
  });

  element.dispatchEvent(event);

  return event;
}

function dispose(app: App): void {
  const index = apps.indexOf(app);

  if (index !== -1) apps.splice(index, 1);

  app.unmount();
}

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount();

  document.body.innerHTML = '';
  document.body.style.overflow = '';
  document.body.style.paddingRight = '';
});

describe('Portal 目标', () => {
  it('未提供 container 时解析成 body 选择器', () => {
    const { api, app } = setup();

    expect(api.portalTarget.value).toBe('body');

    dispose(app);
  });

  it('提供 container 时遮罩与内容共用同一个元素', () => {
    const container = document.createElement('div');

    document.body.append(container);

    const { api, app } = setup({ container });

    expect(api.portalTarget.value).toBe(container);

    dispose(app);
  });
});

describe('焦点陷阱', () => {
  it('Tab 从最后一个元素回到第一个，Shift+Tab 反向循环', async () => {
    const { first, last } = setup();

    await nextTick();

    last.focus();

    const forward = dispatchTab(last);

    expect(forward.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(first);

    first.focus();

    const backward = dispatchTab(first, true);

    expect(backward.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(last);
  });

  it('程序化聚焦到外部时把焦点收回内容区', async () => {
    const { first, outside } = setup();

    await nextTick();

    outside.focus();

    expect(document.activeElement).toBe(first);
  });

  it('没有可聚焦元素时把 Tab 留在内容容器上', async () => {
    const { content } = setup();

    await nextTick();

    content.replaceChildren();
    content.focus();

    const event = dispatchTab(content);

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(content);
  });

  it('关闭后解除陷阱，焦点可以停留在外部', async () => {
    const { api, outside } = setup();

    await nextTick();

    api.close();
    await nextTick();

    outside.focus();

    expect(document.activeElement).toBe(outside);
  });
});

describe('滚动锁', () => {
  it('打开时锁定 body，关闭后恢复原有样式', async () => {
    document.body.style.overflow = 'scroll';
    document.body.style.paddingRight = '4px';

    const { api } = setup();

    expect(document.body.style.overflow).toBe('hidden');

    api.close();
    await nextTick();

    expect(document.body.style.overflow).toBe('scroll');
    expect(document.body.style.paddingRight).toBe('4px');
  });

  it('多个持有者按引用计数释放，最后一个关闭时才恢复', async () => {
    document.body.style.overflow = 'auto';

    const first = setup();
    const second = setup();

    first.api.close();
    await nextTick();

    expect(document.body.style.overflow).toBe('hidden');

    second.api.close();
    await nextTick();

    expect(document.body.style.overflow).toBe('auto');
  });

  it('组件卸载时释放滚动锁与焦点陷阱', async () => {
    const { app, outside } = setup();

    await nextTick();

    dispose(app);

    expect(document.body.style.overflow).toBe('');

    outside.focus();
    expect(document.activeElement).toBe(outside);
  });
});
