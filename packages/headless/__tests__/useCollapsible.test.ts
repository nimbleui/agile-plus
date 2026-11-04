import { effectScope, nextTick, ref } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { useCollapsible } from '../src/useCollapsible';

import type { UseCollapsibleOptions } from '../src/useCollapsible';

/**
 * 在独立 scope 里跑 composable，并给 Content 挂一个真实元素。
 *
 * 测量逻辑必须落在真实 DOM 上：它要临时改写内联样式、读 getBoundingClientRect、
 * 再用 rAF 放掉首帧挡板，这些在纯函数测试里都观察不到。
 */
function setup(options: UseCollapsibleOptions = {}) {
  const content = document.createElement('div');

  document.body.append(content);

  content.getBoundingClientRect = () =>
    ({
      width: 640,
      height: 128,
      top: 0,
      left: 0,
      right: 640,
      bottom: 128,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }) as DOMRect;

  const scope = effectScope();

  const api = scope.run(() => useCollapsible(options));

  if (!api) throw new Error('useCollapsible 未在 effect scope 内创建');

  api.setContentElement(content);

  return { api, content, scope };
}

/** 等一个 rAF + 微任务，让首帧挡板放掉。 */
async function nextFrame(): Promise<void> {
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  await nextTick();
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('状态与属性', () => {
  it('非受控时 toggle 翻转并回调', async () => {
    const onChanged = vi.fn();
    const { api, scope } = setup({ onOpenChange: onChanged });

    expect(api.isOpen.value).toBe(false);

    api.toggle();
    await nextTick();

    expect(api.isOpen.value).toBe(true);
    expect(onChanged).toHaveBeenCalledWith(true);

    scope.stop();
  });

  it('受控时内部状态不被改写，只回调', async () => {
    const external = ref(false);
    const { api, scope } = setup({ open: () => external.value });

    api.toggle();
    await nextTick();

    expect(api.isOpen.value).toBe(false);

    external.value = true;
    await nextTick();

    expect(api.isOpen.value).toBe(true);

    scope.stop();
  });

  it('禁用时 toggle 不响应，程序化 open 仍然生效', async () => {
    const { api, scope } = setup({ disabled: true });

    api.toggle();
    await nextTick();

    expect(api.isOpen.value).toBe(false);

    api.open();
    await nextTick();

    expect(api.isOpen.value).toBe(true);

    scope.stop();
  });

  it('Trigger 的 aria-controls 只在展开时输出', async () => {
    const { api, scope } = setup();

    expect(api.getTriggerAttrs()['aria-controls']).toBeUndefined();
    expect(api.getTriggerAttrs()['aria-expanded']).toBe(false);

    api.open();
    await nextTick();

    expect(api.getTriggerAttrs()['aria-controls']).toBe(api.contentId);
    expect(api.getTriggerAttrs()['aria-expanded']).toBe(true);
    expect(api.getTriggerAttrs().type).toBe('button');

    scope.stop();
  });

  it('Content 的 hidden 由展开与 Presence 共同决定', async () => {
    const { api, scope } = setup();

    expect(api.getContentAttrs(false).hidden).toBe(true);
    expect(api.getContentAttrs(true).hidden).toBeUndefined();

    api.open();
    await nextTick();

    expect(api.getContentAttrs(false).hidden).toBeUndefined();
    expect(api.getContentAttrs(false).id).toBe(api.contentId);

    scope.stop();
  });
});

describe('尺寸测量', () => {
  it('测量后把宽高写成 CSS 变量', async () => {
    const { api, scope } = setup();

    await nextFrame();
    api.measureContent();

    expect(api.getContentVars()).toEqual({
      '--y-collapsible-content-height': '128px',
      '--y-collapsible-content-width': '640px',
    });

    scope.stop();
  });

  it('测量期间归零 transition 与 animation，量完还原', async () => {
    const { api, content, scope } = setup();

    content.style.transitionDuration = '0.2s';
    content.style.animationName = 'spin';

    await nextFrame();

    const seen: string[] = [];
    const originalRect = content.getBoundingClientRect;

    content.getBoundingClientRect = () => {
      seen.push(content.style.transitionDuration, content.style.animationName);

      return originalRect();
    };

    api.measureContent();

    // 量的那一刻是归零的，量完还原成消费者写的值。
    expect(seen).toEqual(['0s', 'none']);
    expect(content.style.transitionDuration).toBe('0.2s');
    expect(content.style.animationName).toBe('spin');

    scope.stop();
  });

  it('初始展开时首帧不还原，避免补一段入场动画', async () => {
    const { api, content, scope } = setup({ defaultOpen: true });

    content.style.transitionDuration = '0.2s';

    api.measureContent();

    // 挡板还立着：归零值保留。
    expect(content.style.transitionDuration).toBe('0s');

    await nextFrame();
    api.measureContent();

    expect(content.style.transitionDuration).toBe('0.2s');

    scope.stop();
  });

  it('元素未绑定时测量是空操作', () => {
    const scope = effectScope();
    const api = scope.run(() => useCollapsible())!;

    api.measureContent();

    expect(api.getContentVars()).toEqual({});

    scope.stop();
  });

  it('作用域销毁后取消未执行的 rAF', async () => {
    const { api, scope } = setup();
    const cancel = vi.spyOn(globalThis, 'cancelAnimationFrame');

    scope.stop();

    expect(cancel).toHaveBeenCalled();

    cancel.mockRestore();
    expect(api.isOpen.value).toBe(false);
  });
});
