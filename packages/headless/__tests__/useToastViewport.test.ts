import { createApp, defineComponent, nextTick, ref } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { useToastProvider } from '../src/useToastProvider';
import { useToastViewport } from '../src/useToastViewport';

import type { App, Ref } from 'vue';

import type { UseToastProviderReturn } from '../src/useToastProvider';
import type { UseToastViewportOptions, UseToastViewportReturn } from '../src/useToastViewport';

const apps: App[] = [];

interface ToastFixture {
  root: HTMLElement;
  button: HTMLButtonElement;
  close: ReturnType<typeof vi.fn>;
}

/**
 * 搭出「焦点代理 + 包裹层 > 列表」的真实结构，并用真实 provider 注册通知。
 *
 * 不 mock provider：视口的契约一半是「与 provider 的暂停/计数状态联动」，
 * 用替身会把这层联动一起测掉。通知根元素给 tabindex=-1，否则 jsdom 里 focus() 不落焦。
 */
function setup(options: Partial<UseToastViewportOptions> = {}, toastCount = 2) {
  const wrapper = document.createElement('div');
  const list = document.createElement('ol');
  const head = document.createElement('div');
  const tail = document.createElement('div');

  list.tabIndex = -1;
  head.tabIndex = 0;
  tail.tabIndex = 0;
  wrapper.append(list);
  document.body.append(head, wrapper, tail);

  let api!: UseToastViewportReturn;
  let provider!: UseToastProviderReturn;

  const app = createApp(
    defineComponent({
      setup() {
        provider = useToastProvider();
        api = useToastViewport({ provider, ...options } as UseToastViewportOptions);

        return () => null;
      },
    })
  );

  app.mount(document.createElement('div'));
  apps.push(app);

  api.bindWrapper(wrapper);
  api.bindList(list);
  api.bindHeadProxy(head);
  api.bindTailProxy(tail);

  const toasts: ToastFixture[] = [];

  for (let index = 0; index < toastCount; index += 1) {
    const root = document.createElement('li');
    const button = document.createElement('button');

    root.tabIndex = -1;
    root.append(button);
    list.append(root);

    const close = vi.fn();

    provider.registerToast({ id: `toast-${index}`, element: ref(root) as Ref<HTMLElement | null>, close });
    toasts.push({ root, button, close });
  }

  return { api, provider, wrapper, list, head, tail, toasts };
}

function keydown(target: EventTarget, init: KeyboardEventInit): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });

  target.dispatchEvent(event);

  return event;
}

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount();

  document.body.innerHTML = '';
});

describe('useToastViewport 属性与标签', () => {
  it('包裹层是带标签的 region，空列表时不挡页面交互', () => {
    const empty = setup({}, 0);

    expect(empty.api.getWrapperProps()).toEqual({
      role: 'region',
      'aria-label': 'Notifications (F8)',
      tabindex: -1,
      style: { pointerEvents: 'none' },
    });

    const filled = setup();

    expect(filled.api.getWrapperProps().style).toEqual({ pointerEvents: 'auto' });
    expect(filled.api.getListProps()).toEqual({ tabindex: -1 });
  });

  it('焦点代理可聚焦、视觉隐藏且固定定位，避免 Tab 时页面滚动', () => {
    const { api } = setup();
    const head = api.getHeadProxyProps();
    const tail = api.getTailProxyProps();

    expect(head.tabindex).toBe(0);
    expect(head['data-toast-focus-proxy']).toBe('head');
    expect(tail['data-toast-focus-proxy']).toBe('tail');
    expect((head.style as Record<string, unknown>).position).toBe('fixed');
  });

  it('hotkey 变化时标签里的占位符跟着变，不会描述与行为脱节', () => {
    const { api } = setup({ hotkey: ['altKey', 'KeyT'] });

    expect(api.hotkeyLabel.value).toBe('alt+T');
    expect(api.ariaLabel.value).toBe('Notifications (alt+T)');
  });

  it('自定义 label 模板同样替换占位符', () => {
    const { api } = setup({ label: '通知区，按 {hotkey} 聚焦', hotkey: ['F8'] });

    expect(api.ariaLabel.value).toBe('通知区，按 F8 聚焦');
  });
});

describe('useToastViewport 快捷键与 Escape', () => {
  it('按下 hotkey 把焦点送到列表', async () => {
    const { list } = setup();

    await nextTick();
    keydown(document, { code: 'F8', key: 'F8' });

    expect(document.activeElement).toBe(list);
  });

  it('自定义 hotkey 是「与」关系，缺一个标志位不触发', async () => {
    const { list } = setup({ hotkey: ['altKey', 'KeyT'] });

    await nextTick();
    keydown(document, { code: 'KeyT', key: 't' });

    expect(document.activeElement).not.toBe(list);

    keydown(document, { code: 'KeyT', key: 't', altKey: true });

    expect(document.activeElement).toBe(list);
  });

  it('Escape 关掉最新一条并拦下默认行为', async () => {
    const { toasts } = setup();

    await nextTick();

    const event = keydown(document, { key: 'Escape' });

    expect(event.defaultPrevented).toBe(true);
    expect(toasts[1]?.close).toHaveBeenCalledTimes(1);
    expect(toasts[0]?.close).not.toHaveBeenCalled();
  });

  it('焦点在某条通知内部时不代劳，交给该通知自己处理', async () => {
    const { toasts } = setup();

    await nextTick();
    (toasts[0]?.button as HTMLButtonElement).focus();
    keydown(document, { key: 'Escape' });

    expect(toasts[0]?.close).not.toHaveBeenCalled();
    expect(toasts[1]?.close).not.toHaveBeenCalled();
  });

  it('焦点在 aria-modal 容器内时让给模态框', async () => {
    const { toasts } = setup();
    const modal = document.createElement('div');
    const modalButton = document.createElement('button');

    modal.setAttribute('aria-modal', 'true');
    modal.append(modalButton);
    document.body.append(modal);

    await nextTick();
    modalButton.focus();
    keydown(document, { key: 'Escape' });

    expect(toasts[1]?.close).not.toHaveBeenCalled();
  });

  it('没有通知时 Escape 不做任何事', async () => {
    setup({}, 0);

    await nextTick();

    const event = keydown(document, { key: 'Escape' });

    expect(event.defaultPrevented).toBe(false);
  });
});

describe('useToastViewport 暂停与恢复', () => {
  it('窗口失焦暂停、回焦恢复', async () => {
    const { provider } = setup();

    await nextTick();
    window.dispatchEvent(new Event('blur'));

    expect(provider.isClosePaused.value).toBe(true);

    window.dispatchEvent(new Event('focus'));

    expect(provider.isClosePaused.value).toBe(false);
  });

  it('没有通知时不挂 window 监听，避免空转', async () => {
    const { provider } = setup({}, 0);

    await nextTick();
    window.dispatchEvent(new Event('blur'));

    expect(provider.isClosePaused.value).toBe(false);
  });

  it('焦点进入与指针移动都暂停，且重复触发不重复广播', async () => {
    const { api, provider } = setup();
    const listener = vi.fn();

    provider.subscribeClosing(listener);
    await nextTick();

    api.onWrapperFocusin();
    api.onWrapperPointermove();

    expect(provider.isClosePaused.value).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(true);
  });

  it('焦点移出包裹层才恢复，移到内部不恢复', async () => {
    const { api, provider, wrapper, toasts } = setup();
    const outside = document.createElement('button');

    document.body.append(outside);
    await nextTick();
    api.onWrapperFocusin();

    api.onWrapperFocusout({ relatedTarget: toasts[0]?.button } as unknown as FocusEvent);

    expect(provider.isClosePaused.value).toBe(true);

    api.onWrapperFocusout({ relatedTarget: outside } as unknown as FocusEvent);

    expect(provider.isClosePaused.value).toBe(false);
    expect(wrapper.contains(outside)).toBe(false);
  });

  it('指针离开但焦点仍在视口内时不恢复计时', async () => {
    const { api, provider, toasts } = setup();

    await nextTick();
    api.onWrapperPointermove();
    (toasts[0]?.button as HTMLButtonElement).focus();
    api.onWrapperPointerleave();

    expect(provider.isClosePaused.value).toBe(true);
  });

  it('没有通知时焦点进入与指针移动都不暂停', async () => {
    const { api, provider } = setup({}, 0);

    await nextTick();
    api.onWrapperFocusin();
    api.onWrapperPointermove();

    expect(provider.isClosePaused.value).toBe(false);
  });
});

describe('useToastViewport Tab 顺序与清理', () => {
  it('正向 Tab 从最新一条通知开始，而不是 DOM 顺序的最旧一条', async () => {
    const { api, list, toasts } = setup();

    await nextTick();
    list.focus();

    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });

    api.onListKeydown(event);

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(toasts[1]?.root);
  });

  it('带修饰键的 Tab 不接管，交还浏览器', async () => {
    const { api, list, toasts } = setup();

    await nextTick();
    list.focus();

    const event = new KeyboardEvent('keydown', {
      key: 'Tab',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });

    api.onListKeydown(event);

    expect(event.defaultPrevented).toBe(false);
    expect(document.activeElement).not.toBe(toasts[1]?.root);
  });

  it('卸载后摘掉 document 与 window 监听', async () => {
    const { provider, list } = setup();
    const app = apps.pop();

    await nextTick();
    app?.unmount();

    keydown(document, { code: 'F8', key: 'F8' });

    expect(document.activeElement).not.toBe(list);

    window.dispatchEvent(new Event('blur'));

    expect(provider.isClosePaused.value).toBe(false);
  });
});