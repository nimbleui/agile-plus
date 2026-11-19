import { effectScope, ref } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { useToastProvider } from '../src/useToastProvider';

import type { EffectScope } from 'vue';

import type { UseToastProviderOptions } from '../src/useToastProvider';

const scopes: EffectScope[] = [];

/**
 * 在独立 effect scope 里创建 provider。
 *
 * provider 只持有集合、暂停状态与订阅者，运行期不碰 DOM，因此不需要真实元素。
 */
function setup(options: UseToastProviderOptions = {}) {
  const scope = effectScope();

  scopes.push(scope);

  const api = scope.run(() => useToastProvider(options));

  if (!api) throw new Error('useToastProvider 未在 effect scope 内创建');

  return api;
}

/** 造一条最小通知条目；元素用 ref 承载，与真实注册路径一致。 */
function entry(id: string) {
  return { id, element: ref<HTMLElement | null>(null), close: vi.fn() };
}

afterEach(() => {
  vi.restoreAllMocks();

  for (const scope of scopes.splice(0)) scope.stop();
});

describe('useToastProvider 默认值与配置', () => {
  it('缺省值与 Radix 对齐', () => {
    const api = setup();

    expect(api.label.value).toBe('Notification');
    expect(api.duration.value).toBe(5_000);
    expect(api.swipeDirection.value).toBe('right');
    expect(api.swipeThreshold.value).toBe(50);
    expect(api.announceContainer.value).toBeNull();
    expect(api.viewport.value).toBeNull();
  });

  it('配置覆盖默认值，且支持 getter 响应式', () => {
    const duration = ref(1_000);
    const api = setup({
      label: '通知',
      duration: () => duration.value,
      swipeDirection: 'left',
      swipeThreshold: 20,
    });

    expect(api.label.value).toBe('通知');
    expect(api.duration.value).toBe(1_000);
    expect(api.swipeDirection.value).toBe('left');
    expect(api.swipeThreshold.value).toBe(20);

    duration.value = 2_000;

    expect(api.duration.value).toBe(2_000);
  });

  it('空 label 是作者用法错误，只告警一次而不是每次重算都刷屏', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const api = setup({ label: '   ' });

    expect(error).toHaveBeenCalledTimes(1);
    expect(error.mock.calls[0]?.[0]).toContain('label');

    // 再读几次派生值不该追加告警。
    void api.label.value;
    void api.duration.value;

    expect(error).toHaveBeenCalledTimes(1);
  });

  it('setViewport 记录 portal 目标', () => {
    const api = setup();
    const node = document.createElement('div');

    api.setViewport(node);

    expect(api.viewport.value).toBe(node);

    api.setViewport(null);

    expect(api.viewport.value).toBeNull();
  });
});

describe('useToastProvider 通知集合', () => {
  it('空集合时计数为 0、hasToasts 为 false', () => {
    const api = setup();

    expect(api.toasts.value).toEqual([]);
    expect(api.toastCount.value).toBe(0);
    expect(api.hasToasts.value).toBe(false);
  });

  it('注册后按注册顺序保存，计数与 hasToasts 同步', () => {
    const api = setup();
    const first = entry('a');
    const second = entry('b');

    api.registerToast(first);
    api.registerToast(second);

    expect(api.toasts.value.map((item) => item.id)).toEqual(['a', 'b']);
    expect(api.toastCount.value).toBe(2);
    expect(api.hasToasts.value).toBe(true);
  });

  it('注册返回注销函数，注销后集合与计数一起回落', () => {
    const api = setup();
    const unregister = api.registerToast(entry('a'));

    api.registerToast(entry('b'));
    unregister();

    expect(api.toasts.value.map((item) => item.id)).toEqual(['b']);
    expect(api.toastCount.value).toBe(1);
  });

  it('条目里的元素 ref 不被深响应拆包，视口读到的是当前元素', () => {
    const api = setup();
    const item = entry('a');
    const node = document.createElement('div');

    api.registerToast(item);
    item.element.value = node;

    expect(api.toasts.value[0]?.element.value).toBe(node);
  });
});

describe('useToastProvider 暂停广播', () => {
  it('缺省未暂停，pause / resume 切换状态', () => {
    const api = setup();

    expect(api.isClosePaused.value).toBe(false);

    api.pauseClosing();

    expect(api.isClosePaused.value).toBe(true);

    api.resumeClosing();

    expect(api.isClosePaused.value).toBe(false);
  });

  it('状态没变时不广播：重复 pause 不该让每条通知重算剩余时间', () => {
    const api = setup();
    const listener = vi.fn();

    api.subscribeClosing(listener);
    api.pauseClosing();
    api.pauseClosing();
    api.pauseClosing();

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(true);

    api.resumeClosing();
    api.resumeClosing();

    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenLastCalledWith(false);
  });

  it('多个订阅者都收到广播', () => {
    const api = setup();
    const first = vi.fn();
    const second = vi.fn();

    api.subscribeClosing(first);
    api.subscribeClosing(second);
    api.pauseClosing();

    expect(first).toHaveBeenCalledWith(true);
    expect(second).toHaveBeenCalledWith(true);
  });

  it('取消订阅后不再收到广播', () => {
    const api = setup();
    const listener = vi.fn();
    const unsubscribe = api.subscribeClosing(listener);

    unsubscribe();
    api.pauseClosing();

    expect(listener).not.toHaveBeenCalled();
    expect(api.isClosePaused.value).toBe(true);
  });
});