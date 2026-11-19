import { createApp, defineComponent, h, nextTick, ref } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { TooltipArrow, TooltipContent, TooltipRoot, TooltipTrigger } from '../src/tooltip';

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

function trigger(): HTMLButtonElement {
  return document.querySelector('[data-part="trigger"]') as HTMLButtonElement;
}

function content(): HTMLElement | null {
  return document.querySelector('[data-part="content"]');
}

/** 标准结构：Root > Trigger + Content（内含 Arrow）。 */
function mountTooltip(
  rootProps: Record<string, unknown> = {},
  contentProps: Record<string, unknown> = {}
) {
  const host = mount(() =>
    h(TooltipRoot, rootProps, {
      default: () => [
        h(TooltipTrigger, null, { default: () => ['悬停我'] }),
        h(TooltipContent, contentProps, {
          default: () => ['提示正文', h(TooltipArrow)],
        }),
      ],
    })
  );

  return { host };
}

afterEach(() => {
  vi.useRealTimers();

  for (const app of apps.splice(0)) app.unmount();

  document.body.innerHTML = '';
});

describe('Tooltip 结构与 ARIA', () => {
  it('Root 不渲染元素，Trigger 是 button', () => {
    const { host } = mountTooltip();

    // Root 只分发上下文：宿主下只有 Trigger 一个元素，没有多包一层容器。
    expect(host.children).toHaveLength(1);
    expect(host.firstElementChild).toBe(trigger());
    expect(trigger().tagName).toBe('BUTTON');
    expect(trigger().textContent).toBe('悬停我');
  });

  it('自家渲染的 button 带 type="button"：缺省是 submit，放进表单会顺手提交', () => {
    mountTooltip();

    expect(trigger().getAttribute('type')).toBe('button');
  });

  it('as 换成非 button 标签时不输出 type：<a> 的 type 是链接媒体类型', () => {
    mount(() =>
      h(TooltipRoot, null, {
        default: () => [
          h(TooltipTrigger, { as: 'a' }, { default: () => ['链接'] }),
          h(TooltipContent, null, { default: () => ['提示'] }),
        ],
      })
    );

    expect(trigger().tagName).toBe('A');
    expect(trigger().hasAttribute('type')).toBe(false);
  });

  it('关闭时内容不在 DOM 里，触发元素也没有 aria-describedby', () => {
    mountTooltip();

    expect(content()).toBeNull();
    expect(trigger().getAttribute('aria-describedby')).toBeNull();
    expect(trigger().dataset.state).toBe('closed');
  });

  it('打开后内容 portal 到 body，role 与 id 关联正确', async () => {
    const { host } = mountTooltip();

    trigger().dispatchEvent(new FocusEvent('focus'));
    await nextTick();

    const panel = content();

    expect(panel).not.toBeNull();
    expect(panel?.getAttribute('role')).toBe('tooltip');
    expect(panel?.id).toBeTruthy();
    expect(trigger().getAttribute('aria-describedby')).toBe(panel?.id);
    // portal 到 body：内容不是宿主的后代
    expect(host.contains(panel as Node)).toBe(false);
    expect(panel?.textContent).toContain('提示正文');
  });

  it('container 可以换 portal 目标', async () => {
    const target = document.createElement('section');

    document.body.append(target);
    mountTooltip({}, { container: target });

    trigger().dispatchEvent(new FocusEvent('focus'));
    await nextTick();

    expect(target.querySelector('[data-part="content"]')).not.toBeNull();
  });

  it('data-side 反映实际位置，箭头带同一个 side 且对读屏隐藏', async () => {
    mountTooltip({ placement: 'bottom' });

    trigger().dispatchEvent(new FocusEvent('focus'));
    await nextTick();

    expect(content()?.dataset.side).toBe('bottom');

    const arrow = document.querySelector('[data-part="arrow"]') as HTMLElement;

    expect(arrow.dataset.side).toBe('bottom');
    expect(arrow.getAttribute('aria-hidden')).toBe('true');
  });

  it('无样式层契约：触发元素与内容都不带 class', async () => {
    mountTooltip();

    expect(trigger().getAttribute('class')).toBeNull();

    trigger().dispatchEvent(new FocusEvent('focus'));
    await nextTick();

    expect(content()?.getAttribute('class')).toBeNull();
    // 内联定位样式是测量结果，属于 documented 例外，必须存在。
    expect(content()?.getAttribute('style')).toContain('translate');
  });
});

describe('Tooltip 触发路径', () => {
  it('焦点立即打开，失焦关闭', async () => {
    mountTooltip();

    trigger().dispatchEvent(new FocusEvent('focus'));
    await nextTick();

    expect(content()).not.toBeNull();
    expect(trigger().dataset.state).toBe('instant-open');

    trigger().dispatchEvent(new FocusEvent('blur'));
    await nextTick();

    expect(content()).toBeNull();
  });

  it('悬停走延迟，等满才出现', async () => {
    vi.useFakeTimers();

    mountTooltip({ delayDuration: 500 });

    trigger().dispatchEvent(new Event('pointerenter'));
    await nextTick();

    expect(content()).toBeNull();

    vi.advanceTimersByTime(500);
    await nextTick();

    expect(content()).not.toBeNull();
    expect(trigger().dataset.state).toBe('delayed-open');
  });

  it('延迟未结束就离开则不出现', async () => {
    vi.useFakeTimers();

    mountTooltip({ delayDuration: 500 });

    trigger().dispatchEvent(new Event('pointerenter'));
    vi.advanceTimersByTime(200);
    trigger().dispatchEvent(new Event('pointerleave'));
    vi.advanceTimersByTime(500);
    await nextTick();

    expect(content()).toBeNull();
  });

  it('Escape 关闭', async () => {
    mountTooltip();

    trigger().dispatchEvent(new FocusEvent('focus'));
    await nextTick();

    trigger().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await nextTick();

    expect(content()).toBeNull();
  });

  it('forceMount 让内容关闭后仍留在 DOM', async () => {
    mountTooltip({}, { forceMount: true });

    await nextTick();

    expect(content()).not.toBeNull();
    expect(content()?.dataset.state).toBe('closed');
  });
});

describe('Tooltip asChild 与受控', () => {
  it('Trigger 的 asChild 把属性与事件合并到唯一子元素', async () => {
    mount(() =>
      h(TooltipRoot, null, {
        default: () => [
          h(TooltipTrigger, { asChild: true }, { default: () => [h('a', { href: '#' }, '链接')] }),
          h(TooltipContent, null, { default: () => ['提示'] }),
        ],
      })
    );

    const anchor = document.querySelector('a') as HTMLAnchorElement;

    expect(anchor.dataset.part).toBe('trigger');
    expect(anchor.hasAttribute('type')).toBe(false);

    anchor.dispatchEvent(new FocusEvent('focus'));
    await nextTick();

    expect(anchor.getAttribute('aria-describedby')).toBe(content()?.id);
  });

  it('v-model:open 受控：外部值决定显示，内部动作只上报', async () => {
    const open = ref(false);
    const onUpdate = vi.fn();

    mount(() =>
      h(
        TooltipRoot,
        { open: open.value, 'onUpdate:open': onUpdate },
        {
          default: () => [
            h(TooltipTrigger, null, { default: () => ['触发'] }),
            h(TooltipContent, null, { default: () => ['提示'] }),
          ],
        }
      )
    );

    trigger().dispatchEvent(new FocusEvent('focus'));
    await nextTick();

    expect(onUpdate).toHaveBeenCalledWith(true);
    expect(content()).toBeNull();

    open.value = true;
    await nextTick();

    expect(content()).not.toBeNull();
  });

  it('expose 的 open / close 可程序化控制', async () => {
    const rootRef = ref<{ open(): void; close(): void; isOpen: boolean } | null>(null);

    mount(() =>
      h(
        TooltipRoot,
        { ref: rootRef },
        {
          default: () => [
            h(TooltipTrigger, null, { default: () => ['触发'] }),
            h(TooltipContent, null, { default: () => ['提示'] }),
          ],
        }
      )
    );

    rootRef.value?.open();
    await nextTick();

    expect(rootRef.value?.isOpen).toBe(true);
    expect(content()).not.toBeNull();

    rootRef.value?.close();
    await nextTick();

    expect(content()).toBeNull();
  });
});

describe('Tooltip 上下文约束', () => {
  it('脱离 Root 使用各部件都抛错', () => {
    expect(() => mount(() => h(TooltipTrigger))).toThrow();
    expect(() => mount(() => h(TooltipContent))).toThrow();
    expect(() => mount(() => h(TooltipArrow))).toThrow();
  });
});

describe('Tooltip keepMounted', () => {
  it('打开过一次之后关闭不卸载，只切成 closed', async () => {
    mountTooltip({}, { keepMounted: true });

    expect(content()).toBeNull();

    trigger().dispatchEvent(new FocusEvent('focus'));
    await nextTick();

    const panel = content();

    trigger().dispatchEvent(new FocusEvent('blur'));
    await nextTick();

    expect(content()).toBe(panel);
    expect(panel?.dataset.state).toBe('closed');
  });
});
