import { createApp, defineComponent, h, nextTick, ref } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '../src/dropdown-menu';

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

function menuSlots(): Record<string, () => VNode[]> {
  return {
    trigger: () => [h('button', null, '操作')],
    default: () => [
      h(DropdownMenuLabel, null, { default: () => ['文件'] }),
      h(DropdownMenuItem, { value: 'edit' }, { default: () => ['编辑'] }),
      h(DropdownMenuItem, { value: 'copy' }, { default: () => ['复制'] }),
      h(DropdownMenuSeparator),
      h(DropdownMenuItem, { value: 'del', disabled: true }, { default: () => ['删除'] }),
    ],
  };
}

/**
 * 标准结构：三个可用项 + 一个禁用项，内容默认 teleport 到 body。
 *
 * 必须走成品层：`@item-select` 经 DropdownMenu 转发到 DropdownMenuRoot 时，同一个
 * `onItemSelect` 键会被 v-bind 与模板监听器合并成数组，只有这条链路能复现该形态；
 * 「打开过一次之后常驻」的缺省值同样只在成品层成立（无头层默认不常驻）。
 */
function mountMenu(rootProps: Record<string, unknown> = {}) {
  return mount(() => h(DropdownMenu, rootProps, menuSlots()));
}

function trigger(): HTMLButtonElement {
  return document.querySelector('[data-part="trigger"]') as HTMLButtonElement;
}

function content(): HTMLElement | null {
  return document.querySelector('[data-part="content"]');
}

function item(value: string): HTMLElement {
  return document.querySelector(`[data-value="${value}"]`) as HTMLElement;
}

/** 开合副作用在 watch post 与嵌套 nextTick 里，两拍后项元素也已写回引用。 */
async function settle(): Promise<void> {
  await nextTick();
  await nextTick();
}

async function open(): Promise<void> {
  trigger().click();
  await settle();
}

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount();

  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('成品 DropdownMenu 挂载时机', () => {
  it('首次打开前内容不在 DOM，打开才挂载', async () => {
    mountMenu();

    expect(content()).toBeNull();

    await open();

    expect(content()).not.toBeNull();
  });

  it('打开过一次之后关闭不销毁：元素留在 DOM，只切成 closed', async () => {
    mountMenu();

    await open();

    const panel = content() as HTMLElement;
    const firstItem = item('edit');

    item('copy').click();
    await settle();

    expect(content()).toBe(panel);
    expect(panel.getAttribute('data-state')).toBe('closed');
    // 项节点被复用而不是重建，菜单内部的滚动位置与临时状态才有意义。
    expect(item('edit')).toBe(firstItem);
  });

  it('keepMounted 关掉就回到关闭即卸载', async () => {
    mountMenu({ keepMounted: false });

    await open();

    expect(content()).not.toBeNull();

    item('copy').click();
    await settle();

    expect(content()).toBeNull();
  });

  it('defaultOpen 生下来就算打开过：初次关闭后内容仍在 DOM', async () => {
    mountMenu({ defaultOpen: true });

    const panel = content();

    expect(panel).not.toBeNull();

    trigger().click();
    await settle();

    expect(content()).toBe(panel);
    expect(panel?.getAttribute('data-state')).toBe('closed');
  });

  it('受控 open 被父级直接翻 true 也算打开过：不必经过 update:open', async () => {
    const isOpen = ref(false);

    mount(() =>
      h(
        DropdownMenu,
        {
          open: isOpen.value,
          'onUpdate:open': (next: boolean) => {
            isOpen.value = next;
          },
        },
        menuSlots()
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
    expect(content()?.getAttribute('data-state')).toBe('closed');
  });
});

describe('成品 DropdownMenu 焦点', () => {
  it('内容 teleport 到 body 时，打开仍把焦点落到首个可用项', async () => {
    mountMenu();

    await open();

    expect(document.activeElement).toBe(item('edit'));
    expect(item('edit').hasAttribute('data-highlighted')).toBe(true);
  });

  it('常驻之后重开，焦点重新落回首项', async () => {
    mountMenu();

    await open();

    item('copy').click();
    await settle();

    await open();

    expect(document.activeElement).toBe(item('edit'));
    expect(item('edit').hasAttribute('data-highlighted')).toBe(true);
  });
});

describe('成品 DropdownMenu 项激活', () => {
  it('点击项：item-select 只上报一次，随后关闭但不销毁', async () => {
    const onItemSelect = vi.fn();

    mountMenu({ onItemSelect });

    await open();

    item('copy').click();
    await settle();

    expect(onItemSelect).toHaveBeenCalledTimes(1);
    expect(onItemSelect).toHaveBeenCalledWith('copy');
    expect(content()).not.toBeNull();
    expect(content()?.getAttribute('data-state')).toBe('closed');
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });

  it('Enter 激活聚焦项：同样只上报一次并关闭', async () => {
    const onItemSelect = vi.fn();

    mountMenu({ onItemSelect });

    await open();

    // 高亮 = 聚焦项；打开时落在 edit，方向键才把它移到 copy。
    item('edit').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true })
    );
    await settle();

    expect(document.activeElement).toBe(item('copy'));

    item('copy').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
    );
    await settle();

    expect(onItemSelect).toHaveBeenCalledTimes(1);
    expect(onItemSelect).toHaveBeenCalledWith('copy');
    expect(content()?.getAttribute('data-state')).toBe('closed');
  });

  it('禁用项点击不上报也不关闭', async () => {
    const onItemSelect = vi.fn();

    mountMenu({ onItemSelect });

    await open();

    item('del').click();
    await settle();

    expect(onItemSelect).not.toHaveBeenCalled();
    expect(content()?.getAttribute('data-state')).toBe('open');
  });

  it('Escape 关闭并把焦点还给触发元素', async () => {
    mountMenu();

    await open();

    expect(document.activeElement).toBe(item('edit'));

    item('edit').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    );
    await settle();

    expect(content()?.getAttribute('data-state')).toBe('closed');
    expect(document.activeElement).toBe(trigger());
  });
});
