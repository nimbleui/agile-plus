import { createApp, defineComponent, h, nextTick } from 'vue';

import { afterEach, describe, expect, it } from 'vitest';

import {
  PopoverArrow,
  PopoverClose,
  PopoverContent,
  PopoverRoot,
  PopoverTrigger,
} from '../src/popover';

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

/** 标准结构：Root > Trigger + Content（内含 Arrow 与 Close）。forceMount 属于 Content。 */
function mountPopover(
  rootProps: Record<string, unknown> = {},
  contentProps: Record<string, unknown> = {}
) {
  const host = mount(() =>
    h(PopoverRoot, rootProps, {
      default: () => [
        h(PopoverTrigger, null, { default: () => ['更多操作'] }),
        h(PopoverContent, contentProps, {
          default: () => [
            '卡片正文',
            h(PopoverClose, null, { default: () => ['收起'] }),
            h(PopoverArrow),
          ],
        }),
      ],
    })
  );

  return { host };
}

/** 开合后的副作用（挂监听、写焦点）在 watch / 嵌套 nextTick 里，需要等两拍。 */
async function settle(): Promise<void> {
  await nextTick();
  await nextTick();
}

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount();

  document.body.innerHTML = '';
});

describe('Popover 结构与 ARIA', () => {
  it('Root 不渲染元素，Trigger 是带 type=button 的 button', () => {
    const { host } = mountPopover();

    expect(host.children).toHaveLength(1);
    expect(host.firstElementChild).toBe(trigger());
    expect(trigger().tagName).toBe('BUTTON');
    expect(trigger().getAttribute('type')).toBe('button');
    expect(trigger().getAttribute('aria-haspopup')).toBe('dialog');
  });

  it('关闭时内容不在 DOM，触发元素也没有 aria-controls', () => {
    mountPopover();

    expect(content()).toBeNull();
    expect(trigger().getAttribute('aria-controls')).toBeNull();
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });

  it('点击打开：内容 portal 到 body，role=dialog 且焦点进入内容', async () => {
    const { host } = mountPopover();

    trigger().click();
    await settle();

    const panel = content();

    expect(panel).not.toBeNull();
    expect(panel?.getAttribute('role')).toBe('dialog');
    expect(panel?.getAttribute('aria-modal')).toBeNull();
    expect(panel?.getAttribute('tabindex')).toBe('-1');
    expect(panel?.dataset.state).toBe('open');
    expect(trigger().getAttribute('aria-controls')).toBe(panel?.id);
    expect(host.contains(panel as Node)).toBe(false);
    expect(document.activeElement).toBe(panel);
  });

  it('forceMount 让内容关闭后仍留在 DOM', async () => {
    mountPopover({}, { forceMount: true });

    await settle();

    expect(content()).not.toBeNull();
    expect(content()?.dataset.state).toBe('closed');
  });
});

describe('Popover 关闭路径', () => {
  it('Escape 关闭并把焦点归还触发器', async () => {
    mountPopover();

    trigger().click();
    await settle();

    content()?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await settle();

    expect(content()).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });

  it('外部指针按下关闭，且不抢焦点', async () => {
    mountPopover();

    const outside = document.createElement('button');
    document.body.append(outside);

    trigger().click();
    await settle();

    outside.focus();
    outside.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    await settle();

    expect(content()).toBeNull();
    expect(document.activeElement).toBe(outside);
  });

  it('Close 按钮是 type=button，点击关闭', async () => {
    mountPopover();

    trigger().click();
    await settle();

    const close = document.querySelector('[data-part="close"]') as HTMLButtonElement;

    expect(close.getAttribute('type')).toBe('button');

    close.click();
    await settle();

    expect(content()).toBeNull();
  });

  it('默认插槽拿到 scoped close，自定义按钮点击即关闭', async () => {
    mount(() =>
      h(PopoverRoot, null, {
        default: () => [
          h(PopoverTrigger, null, { default: () => ['触发'] }),
          h(PopoverContent, null, {
            default: ({ close }: { close: () => void }) => [
              h('button', { type: 'button', onClick: close }, '关闭'),
            ],
          }),
        ],
      })
    );

    trigger().click();
    await settle();

    const btn = content()?.querySelector('button') as HTMLButtonElement;

    btn.click();
    await settle();

    expect(content()).toBeNull();
  });
});

describe('Popover asChild 与上下文', () => {
  it('asChild 把属性合并到唯一子元素，且不输出 type', async () => {
    mount(() =>
      h(PopoverRoot, null, {
        default: () => [
          h(PopoverTrigger, { asChild: true }, { default: () => [h('a', { href: '#' }, '链接')] }),
          h(PopoverContent, null, { default: () => ['卡片'] }),
        ],
      })
    );

    const anchor = document.querySelector('a') as HTMLAnchorElement;

    expect(anchor.dataset.part).toBe('trigger');
    expect(anchor.hasAttribute('type')).toBe(false);

    anchor.click();
    await settle();

    expect(anchor.getAttribute('aria-controls')).toBe(content()?.id);
  });

  it('脱离 Root 使用各部件都抛错', () => {
    expect(() => mount(() => h(PopoverTrigger))).toThrow();
    expect(() => mount(() => h(PopoverContent))).toThrow();
    expect(() => mount(() => h(PopoverArrow))).toThrow();
    expect(() => mount(() => h(PopoverClose))).toThrow();
  });
});

describe('Popover keepMounted', () => {
  it('打开过一次之后关闭不卸载，只切成 closed', async () => {
    mountPopover({}, { keepMounted: true });

    expect(content()).toBeNull();

    trigger().click();
    await settle();

    const panel = content();

    content()?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await settle();

    expect(content()).toBe(panel);
    expect(panel?.dataset.state).toBe('closed');
  });
});
