import { createApp, defineComponent, h, nextTick, ref } from 'vue';

import { afterEach, describe, expect, it } from 'vitest';

import { Popover } from '../src/popover';

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

/** 成品层的标准用法：trigger 插槽放文本，默认插槽放正文。 */
function mountPopover(props: Record<string, unknown> = {}) {
  return mount(() =>
    h(Popover, props, {
      trigger: () => ['更多操作'],
      default: () => ['卡片正文'],
    })
  );
}

function trigger(): HTMLButtonElement {
  return document.querySelector('[data-part="trigger"]') as HTMLButtonElement;
}

function content(): HTMLElement | null {
  return document.querySelector('[data-part="content"]');
}

/** 开合后的副作用（挂监听、写焦点）在 watch / 嵌套 nextTick 里，需要等两拍。 */
async function settle(): Promise<void> {
  await nextTick();
  await nextTick();
}

async function open(): Promise<void> {
  trigger().click();
  await settle();
}

function pressEscape(): void {
  content()?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
}

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount();

  document.body.innerHTML = '';
});

describe('成品 Popover 的样式落点', () => {
  it('缺省渲染 button 触发器，内容带 y-popover', async () => {
    mountPopover();

    expect(trigger().tagName).toBe('BUTTON');

    await open();

    expect(content()?.classList.contains('y-popover')).toBe(true);
    expect(content()?.textContent).toContain('卡片正文');
  });

  it('container 透传，内容 portal 到指定容器', async () => {
    const target = document.createElement('section');

    document.body.append(target);
    mountPopover({ container: target });

    await open();

    expect(target.querySelector('.y-popover')).not.toBeNull();
  });
});

describe('成品 Popover 挂载时机', () => {
  it('首次打开前内容不在 DOM，打开才挂载', async () => {
    mountPopover();

    expect(content()).toBeNull();

    await open();

    expect(content()).not.toBeNull();
  });

  it('打开过一次之后关闭不销毁：元素留在 DOM，只切成 closed', async () => {
    mountPopover();

    await open();

    const panel = content() as HTMLElement;

    pressEscape();
    await settle();

    expect(content()).toBe(panel);
    expect(panel.dataset.state).toBe('closed');
  });

  it('keepMounted 关掉就回到关闭即卸载', async () => {
    mountPopover({ keepMounted: false });

    await open();

    expect(content()).not.toBeNull();

    pressEscape();
    await settle();

    expect(content()).toBeNull();
  });

  it('defaultOpen 生下来就算打开过：初次关闭后内容仍在 DOM', async () => {
    mountPopover({ defaultOpen: true });
    await settle();

    const panel = content();

    expect(panel).not.toBeNull();

    pressEscape();
    await settle();

    expect(content()).toBe(panel);
    expect(panel?.dataset.state).toBe('closed');
  });

  it('受控 open 被父级直接翻 true 也算打开过：不必经过 update:open', async () => {
    const isOpen = ref(false);

    mount(() =>
      h(
        Popover,
        {
          open: isOpen.value,
          'onUpdate:open': (next: boolean) => {
            isOpen.value = next;
          },
        },
        {
          trigger: () => ['更多操作'],
          default: () => ['卡片正文'],
        }
      )
    );

    expect(content()).toBeNull();

    // 父级直接翻 prop 不派发 update:open；常驻判定只认开合状态这一个真源，所以仍然成立。
    isOpen.value = true;
    await settle();

    expect(content()).not.toBeNull();

    isOpen.value = false;
    await settle();

    expect(content()).not.toBeNull();
    expect(content()?.dataset.state).toBe('closed');
  });
});

describe('成品 Popover 的焦点', () => {
  it('打开把焦点移进浮层，常驻之后重开焦点仍然进入', async () => {
    mountPopover();

    await open();

    const panel = content() as HTMLElement;

    expect(document.activeElement).toBe(panel);

    pressEscape();
    await settle();

    await open();

    expect(content()).toBe(panel);
    expect(document.activeElement).toBe(panel);
  });
});
