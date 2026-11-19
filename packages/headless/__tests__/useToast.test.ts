import { createApp, defineComponent, nextTick, ref } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { useToast } from '../src/useToast';
import { useToastProvider } from '../src/useToastProvider';

import type { App } from 'vue';

import type { UseToastProviderReturn } from '../src/useToastProvider';
import type { UseToastOptions, UseToastReturn } from '../src/useToast';

/**
 * jsdom 不实现指针捕获，而手势启动时会调用它。
 *
 * 与 ui 层 toast 测试同一手法：在原型上补空实现，而不是给每个元素单独打补丁。
 * 捕获本身的行为不属于本层契约（它只是让手指移出通知后仍能继续拖）。
 */
const proto = HTMLElement.prototype as unknown as {
  setPointerCapture(): void;
  releasePointerCapture(): void;
  hasPointerCapture(): boolean;
};

proto.setPointerCapture = () => {};
proto.releasePointerCapture = () => {};
proto.hasPointerCapture = () => false;

const apps: App[] = [];

function setup(options: Partial<UseToastOptions> = {}, providerOptions = {}) {
  const element = document.createElement('div');
  const button = document.createElement('button');
  const viewport = document.createElement('div');

  element.tabIndex = 0;
  viewport.tabIndex = -1;
  element.append(button);
  document.body.append(element, viewport);

  let api!: UseToastReturn;
  let provider!: UseToastProviderReturn;

  const app = createApp(
    defineComponent({
      setup() {
        provider = useToastProvider(providerOptions);
        api = useToast({ provider, ...options } as UseToastOptions);

        return () => null;
      },
    })
  );

  app.mount(document.createElement('div'));
  apps.push(app);

  provider.setViewport(viewport);
  api.bindElement(element);

  element.addEventListener('pointerdown', (event) => api.onRootPointerdown(event as PointerEvent));
  element.addEventListener('pointermove', (event) => api.onRootPointermove(event as PointerEvent));
  element.addEventListener('pointerup', (event) => api.onRootPointerup(event as PointerEvent));
  element.addEventListener('keydown', (event) => api.onRootKeydown(event));

  return { api, provider, element, button, viewport };
}

/** 造一个带 pointerId / pointerType 的指针事件（jsdom 没有 PointerEvent 构造器）。 */
function pointer(type: string, init: MouseEventInit = {}, pointerType = 'mouse'): PointerEvent {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, ...init });

  Object.assign(event, { pointerId: 1, pointerType });

  return event as unknown as PointerEvent;
}

/** 从通知本体起手做一次滑动：按下 → 移动 → 抬手。 */
function swipe(element: HTMLElement, deltaX: number, options: { up?: boolean } = {}) {
  element.dispatchEvent(pointer('pointerdown', { clientX: 0, clientY: 0 }));
  element.dispatchEvent(pointer('pointermove', { clientX: deltaX, clientY: 0 }));

  if (!options.up) return;

  element.dispatchEvent(pointer('pointerup', { clientX: deltaX, clientY: 0 }));
}

afterEach(() => {
  vi.useRealTimers();

  for (const app of apps.splice(0)) app.unmount();

  document.body.innerHTML = '';
});

describe('useToast 开关与注册', () => {
  it('缺省打开，close 后关闭，data-state 跟着变', async () => {
    const { api } = setup();

    await nextTick();

    expect(api.isOpen.value).toBe(true);
    expect(api.getRootProps()['data-state']).toBe('open');

    api.close();
    await nextTick();

    expect(api.isOpen.value).toBe(false);
    expect(api.getRootProps()['data-state']).toBe('closed');
  });

  it('只在真正 present 时计入 provider 的通知数', async () => {
    const { api, provider } = setup();

    await nextTick();

    expect(provider.toastCount.value).toBe(1);
    expect(provider.hasToasts.value).toBe(true);

    api.close();
    await nextTick();

    expect(provider.toastCount.value).toBe(0);
  });

  it('受控 open 由外部决定，close 只上报', async () => {
    const onOpenChange = vi.fn();
    const open = ref(true);
    const { api } = setup({ open, onOpenChange });

    await nextTick();
    api.close();

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(api.isOpen.value).toBe(true);

    open.value = false;
    await nextTick();

    expect(api.isOpen.value).toBe(false);
  });

  it('forceMount 让关闭后仍保留在 DOM 与注册表里', async () => {
    const { api, provider } = setup({ forceMount: true });

    await nextTick();
    api.close();
    await nextTick();

    expect(api.isOpen.value).toBe(false);
    expect(api.isPresent.value).toBe(true);
    expect(provider.toastCount.value).toBe(1);
  });
});

describe('useToast 自动关闭计时', () => {
  it('本条 duration 覆盖 provider 默认值', () => {
    vi.useFakeTimers();

    const { api } = setup({ duration: 1_000 }, { duration: 5_000 });

    vi.advanceTimersByTime(1_000);

    expect(api.isOpen.value).toBe(false);
  });

  it('到时自动关闭', () => {
    vi.useFakeTimers();

    const { api } = setup({ duration: 3_000 });

    vi.advanceTimersByTime(2_999);

    expect(api.isOpen.value).toBe(true);

    vi.advanceTimersByTime(1);

    expect(api.isOpen.value).toBe(false);
  });

  it('Infinity 与 0 都表示常驻，不启动计时器', () => {
    vi.useFakeTimers();

    for (const duration of [Infinity, 0]) {
      const { api } = setup({ duration });

      vi.advanceTimersByTime(1_000_000);

      expect(api.isOpen.value).toBe(true);
    }
  });

  it('自动关闭前焦点在通知内时，把焦点交还视口而不是丢回 body', () => {
    vi.useFakeTimers();

    const { element, viewport } = setup({ duration: 1_000 });

    element.focus();

    expect(document.activeElement).toBe(element);

    vi.advanceTimersByTime(1_000);

    expect(document.activeElement).toBe(viewport);
  });

  it('焦点不在通知内时不动焦点', () => {
    vi.useFakeTimers();

    const { viewport } = setup({ duration: 1_000 });
    const outside = document.createElement('button');

    document.body.append(outside);
    outside.focus();
    vi.advanceTimersByTime(1_000);

    expect(document.activeElement).toBe(outside);
    expect(document.activeElement).not.toBe(viewport);
  });

  it('暂停后按剩余时间继续，而不是重新计满', () => {
    vi.useFakeTimers();

    const { api, provider } = setup({ duration: 1_000 });

    vi.advanceTimersByTime(600);
    provider.pauseClosing();

    vi.advanceTimersByTime(10_000);

    expect(api.isOpen.value).toBe(true);

    provider.resumeClosing();
    vi.advanceTimersByTime(399);

    expect(api.isOpen.value).toBe(true);

    vi.advanceTimersByTime(1);

    expect(api.isOpen.value).toBe(false);
  });

  it('暂停与恢复会派发 onPause / onResume', () => {
    vi.useFakeTimers();

    const onPause = vi.fn();
    const onResume = vi.fn();
    const { provider } = setup({ duration: 1_000, onPause, onResume });

    provider.pauseClosing();

    expect(onPause).toHaveBeenCalledTimes(1);

    provider.resumeClosing();

    expect(onResume).toHaveBeenCalledTimes(1);
  });

  it('已关闭的通知不再响应暂停与恢复', () => {
    vi.useFakeTimers();

    const onPause = vi.fn();
    const { api, provider } = setup({ duration: 1_000, onPause });

    api.close();
    provider.pauseClosing();
    provider.resumeClosing();
    vi.advanceTimersByTime(5_000);

    expect(onPause).not.toHaveBeenCalled();
    expect(api.isOpen.value).toBe(false);
  });

  it('duration 从 Infinity 改成有限值后能正常关闭（Radix #2233 回归）', async () => {
    vi.useFakeTimers();

    const duration = ref<number>(Infinity);
    const { api } = setup({ duration });

    vi.advanceTimersByTime(10_000);

    expect(api.isOpen.value).toBe(true);

    duration.value = 500;
    await nextTick();
    vi.advanceTimersByTime(500);

    expect(api.isOpen.value).toBe(false);
  });
});

describe('useToast Escape', () => {
  it('Escape 关闭通知', async () => {
    const { api, element } = setup();

    await nextTick();
    element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(api.isOpen.value).toBe(false);
  });

  it('消费者 preventDefault 后不关闭', async () => {
    const { api, element } = setup({
      onEscapeKeyDown: (event: KeyboardEvent) => event.preventDefault(),
    });

    await nextTick();
    element.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    );

    expect(api.isOpen.value).toBe(true);
  });

  it('其它按键不关闭', async () => {
    const { api, element } = setup();

    await nextTick();
    element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(api.isOpen.value).toBe(true);
  });
});

describe('useToast 滑动手势', () => {
  it('非主按钮按下不启动手势', async () => {
    const onSwipeStart = vi.fn();
    const { api, element } = setup({ onSwipeStart });

    await nextTick();
    element.dispatchEvent(pointer('pointerdown', { clientX: 0, clientY: 0, button: 2 }));
    element.dispatchEvent(pointer('pointermove', { clientX: 80, clientY: 0 }));

    expect(onSwipeStart).not.toHaveBeenCalled();
    expect(api.swipePhase.value).toBeNull();
  });

  it('低于启动阈值时不进入手势，也不写位移变量', async () => {
    const { api, element } = setup();

    await nextTick();
    element.dispatchEvent(pointer('pointerdown', { clientX: 0, clientY: 0 }));
    element.dispatchEvent(pointer('pointermove', { clientX: 1, clientY: 0 }));

    expect(api.swipePhase.value).toBeNull();
    expect(api.getRootProps().style).not.toHaveProperty('--y-toast-swipe-move-x');
  });

  it('超过鼠标启动阈值后 start → move，位移写进 CSS 变量', async () => {
    const onSwipeStart = vi.fn();
    const onSwipeMove = vi.fn();
    const { api, element } = setup({ onSwipeStart, onSwipeMove });

    await nextTick();
    element.dispatchEvent(pointer('pointerdown', { clientX: 0, clientY: 0 }));
    element.dispatchEvent(pointer('pointermove', { clientX: 10, clientY: 0 }));

    expect(onSwipeStart).toHaveBeenCalledTimes(1);
    expect(api.swipePhase.value).toBe('start');

    element.dispatchEvent(pointer('pointermove', { clientX: 30, clientY: 0 }));

    expect(onSwipeMove).toHaveBeenCalledTimes(1);
    expect(api.swipePhase.value).toBe('move');
    expect(api.getRootProps().style).toMatchObject({
      '--y-toast-swipe-move-x': '30px',
      '--y-toast-swipe-move-y': '0px',
    });
  });

  it('触摸启动阈值更高：10px 对鼠标够、对触摸不够', async () => {
    const onSwipeStart = vi.fn();
    const { element } = setup({ onSwipeStart });

    await nextTick();
    element.dispatchEvent(pointer('pointerdown', { clientX: 0, clientY: 0 }, 'touch'));
    element.dispatchEvent(pointer('pointermove', { clientX: 5, clientY: 0 }, 'touch'));

    expect(onSwipeStart).not.toHaveBeenCalled();

    element.dispatchEvent(pointer('pointermove', { clientX: 20, clientY: 0 }, 'touch'));

    expect(onSwipeStart).toHaveBeenCalledTimes(1);
  });

  it('反方向位移不启动手势（reset 阶段）', async () => {
    const onSwipeStart = vi.fn();
    const { api, element } = setup({ onSwipeStart });

    await nextTick();
    // 默认方向 right，往左拖 80px：钳制后为 0，原始位移超阈值 → reset。
    swipe(element, -80);

    expect(onSwipeStart).not.toHaveBeenCalled();
    expect(api.swipePhase.value).toBeNull();
  });

  it('抬手位移超过关闭阈值则 end 并关闭，move 变量清掉换成 end 变量', async () => {
    const onSwipeEnd = vi.fn();
    const { api, element } = setup({ onSwipeEnd });

    await nextTick();
    swipe(element, 80, { up: true });

    expect(onSwipeEnd).toHaveBeenCalledTimes(1);
    expect(api.swipePhase.value).toBe('end');
    expect(api.isOpen.value).toBe(false);

    const style = api.getRootProps().style as Record<string, unknown>;

    expect(style['--y-toast-swipe-end-x']).toBe('80px');
    expect(style).not.toHaveProperty('--y-toast-swipe-move-x');
  });

  it('抬手位移不足则 cancel 回弹，通知保持打开', async () => {
    const onSwipeCancel = vi.fn();
    const { api, element } = setup({ onSwipeCancel });

    await nextTick();
    swipe(element, 20, { up: true });

    expect(onSwipeCancel).toHaveBeenCalledTimes(1);
    expect(api.swipePhase.value).toBe('cancel');
    expect(api.isOpen.value).toBe(true);
    expect(api.getRootProps().style).not.toHaveProperty('--y-toast-swipe-move-x');
  });

  it('自定义 swipeThreshold 生效', async () => {
    const { api, element } = setup({}, { swipeThreshold: 10 });

    await nextTick();
    swipe(element, 20, { up: true });

    expect(api.isOpen.value).toBe(false);
  });

  it('抬手后的那一次 click 被吞掉，避免误触通知里的按钮', async () => {
    const { element, button } = setup();
    const onClick = vi.fn();

    button.addEventListener('click', onClick);
    await nextTick();
    swipe(element, 80, { up: true });

    const click = new MouseEvent('click', { bubbles: true, cancelable: true });

    element.dispatchEvent(click);

    expect(click.defaultPrevented).toBe(true);
  });

  it('没有起手按下时移动不产生手势', async () => {
    const onSwipeStart = vi.fn();
    const { element } = setup({ onSwipeStart });

    await nextTick();
    element.dispatchEvent(pointer('pointermove', { clientX: 80, clientY: 0 }));

    expect(onSwipeStart).not.toHaveBeenCalled();
  });
});

describe('useToast announcer 与属性', () => {
  it('announcer 用 status 而非 alert，foreground 是 assertive', () => {
    const { api } = setup();
    const props = api.getAnnounceProps();

    expect(props.role).toBe('status');
    expect(props['aria-live']).toBe('assertive');
    expect(setup({ type: 'background' }).api.getAnnounceProps()['aria-live']).toBe('polite');
  });

  it('根属性带手势方向与禁止选中文本', () => {
    const { api } = setup({}, { swipeDirection: 'left' });
    const props = api.getRootProps();

    expect(props.tabindex).toBe(0);
    expect(props['data-swipe-direction']).toBe('left');
    expect(props.style).toMatchObject({ userSelect: 'none', touchAction: 'none' });
  });

  it('announcer 目标缺省是 body，配置后跟随容器', () => {
    expect(setup().api.announceTarget.value).toBe('body');

    const container = document.createElement('div');

    expect(setup({}, { announceContainer: container }).api.announceTarget.value).toBe(container);
  });
});