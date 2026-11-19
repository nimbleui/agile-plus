import { createApp, defineComponent, h, nextTick, ref } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { Tooltip } from '../src/tooltip';

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

function trigger(): HTMLElement {
  return document.querySelector('[data-part="trigger"]') as HTMLElement;
}

function content(): HTMLElement | null {
  return document.querySelector('[data-part="content"]');
}

/** 成品层的标准用法：trigger 插槽放文本，默认插槽放正文。 */
function mountTooltip(
  props: Record<string, unknown> = {},
  triggerNode: () => VNode[] = () => ['悬停我']
) {
  return mount(() =>
    h(Tooltip, props, {
      trigger: triggerNode,
      default: () => ['提示正文'],
    })
  );
}

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount();

  document.body.innerHTML = '';
});

describe('成品 Tooltip 的样式落点', () => {
  it('缺省渲染 button 触发器，内容带 y-tooltip', async () => {
    mountTooltip();

    expect(trigger().tagName).toBe('BUTTON');
    expect(trigger().textContent).toBe('悬停我');

    trigger().dispatchEvent(new FocusEvent('focus'));
    await nextTick();

    expect(content()?.classList.contains('y-tooltip')).toBe(true);
    expect(content()?.textContent).toContain('提示正文');
  });

  it('箭头默认开启，带样式类与实际朝向', async () => {
    mountTooltip({ placement: 'bottom' });

    trigger().dispatchEvent(new FocusEvent('focus'));
    await nextTick();

    const arrow = document.querySelector('[data-part="arrow"]') as HTMLElement;

    expect(arrow.classList.contains('y-tooltip__arrow')).toBe(true);
    expect(arrow.dataset.side).toBe('bottom');
  });

  it('showArrow=false 时不渲染箭头', async () => {
    mountTooltip({ showArrow: false });

    trigger().dispatchEvent(new FocusEvent('focus'));
    await nextTick();

    expect(document.querySelector('[data-part="arrow"]')).toBeNull();
  });

  it('triggerAsChild 把属性合并到消费者自己的元素，不多包 button', async () => {
    mountTooltip({ triggerAsChild: true }, () => [h('a', { href: '#', class: 'my-link' }, '链接')]);

    const anchor = document.querySelector('a.my-link') as HTMLElement;

    expect(anchor.dataset.part).toBe('trigger');
    expect(document.querySelectorAll('[data-part="trigger"]')).toHaveLength(1);

    anchor.dispatchEvent(new FocusEvent('focus'));
    await nextTick();

    expect(anchor.getAttribute('aria-describedby')).toBe(content()?.id);
  });

  it('触发器本身不被施加视觉样式', () => {
    mountTooltip();

    expect(trigger().getAttribute('class')).toBeNull();
  });
});

describe('成品 Tooltip 的行为透传', () => {
  it('焦点立即打开、失焦关闭，data-state 驱动样式', async () => {
    mountTooltip();

    trigger().dispatchEvent(new FocusEvent('focus'));
    await nextTick();

    expect(content()?.dataset.state).toBe('instant-open');

    trigger().dispatchEvent(new FocusEvent('blur'));
    await nextTick();

    expect(content()?.dataset.state).toBe('closed');
  });

  it('delayDuration 透传，悬停走延迟', async () => {
    vi.useFakeTimers();

    mountTooltip({ delayDuration: 200 });

    trigger().dispatchEvent(new Event('pointerenter'));
    await nextTick();

    expect(content()).toBeNull();

    vi.advanceTimersByTime(200);
    await nextTick();

    expect(content()?.dataset.state).toBe('delayed-open');

    vi.useRealTimers();
  });

  it('placement 透传到内容与箭头的 data-side', async () => {
    mountTooltip({ placement: 'right' });

    trigger().dispatchEvent(new FocusEvent('focus'));
    await nextTick();

    expect(content()?.dataset.side).toBe('right');
    expect((document.querySelector('[data-part="arrow"]') as HTMLElement).dataset.side).toBe(
      'right'
    );
  });

  it('container 透传，内容 portal 到指定容器', async () => {
    const target = document.createElement('section');

    document.body.append(target);
    mountTooltip({ container: target });

    trigger().dispatchEvent(new FocusEvent('focus'));
    await nextTick();

    expect(target.querySelector('.y-tooltip')).not.toBeNull();
  });

  it('v-model:open 受控', async () => {
    const open = ref(false);
    const onUpdate = vi.fn();

    mount(() =>
      h(
        Tooltip,
        { open: open.value, 'onUpdate:open': onUpdate },
        {
          trigger: () => ['触发'],
          default: () => ['正文'],
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
});

describe('成品 Tooltip 挂载时机', () => {
  it('首次打开前内容不在 DOM', () => {
    mountTooltip();

    expect(content()).toBeNull();
  });

  it('打开过一次之后关闭不销毁：元素留在 DOM，只切成 closed', async () => {
    mountTooltip();

    trigger().dispatchEvent(new FocusEvent('focus'));
    await nextTick();

    const panel = content() as HTMLElement;

    trigger().dispatchEvent(new FocusEvent('blur'));
    await nextTick();

    expect(content()).toBe(panel);
    expect(panel.dataset.state).toBe('closed');
  });

  it('keepMounted 关掉就回到关闭即卸载', async () => {
    mountTooltip({ keepMounted: false });

    trigger().dispatchEvent(new FocusEvent('focus'));
    await nextTick();

    expect(content()).not.toBeNull();

    trigger().dispatchEvent(new FocusEvent('blur'));
    await nextTick();

    expect(content()).toBeNull();
  });

  it('defaultOpen 生下来就算打开过：失焦关闭后内容仍在 DOM', async () => {
    mountTooltip({ defaultOpen: true });

    const panel = content();

    expect(panel).not.toBeNull();

    trigger().dispatchEvent(new FocusEvent('blur'));
    await nextTick();

    expect(content()).toBe(panel);
    expect(panel?.dataset.state).toBe('closed');
  });
});
