import { createApp, defineComponent, h, nextTick } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRoot,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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

function trigger(): HTMLButtonElement {
  return document.querySelector('[data-part="trigger"]') as HTMLButtonElement;
}

function content(): HTMLElement | null {
  return document.querySelector('[data-part="content"]');
}

function items(): HTMLElement[] {
  return Array.from(document.querySelectorAll('[data-part="item"]'));
}

/** 标准结构：Root > Trigger + Content（Label / 项 / 禁用项 / 项 / Separator / CheckboxItem）。 */
function mountMenu(rootProps: Record<string, unknown> = {}) {
  const host = mount(() =>
    h(DropdownMenuRoot, rootProps, {
      default: () => [
        h(DropdownMenuTrigger, null, { default: () => ['操作'] }),
        h(DropdownMenuContent, null, {
          default: () => [
            h(DropdownMenuLabel, null, { default: () => ['编辑'] }),
            h(DropdownMenuItem, { value: 'copy' }, { default: () => ['复制'] }),
            h(DropdownMenuItem, { value: 'del', disabled: true }, { default: () => ['删除'] }),
            h(DropdownMenuItem, { value: 'find' }, { default: () => ['查找'] }),
            h(DropdownMenuSeparator),
            h(DropdownMenuCheckboxItem, { value: 'wrap' }, { default: () => ['换行'] }),
          ],
        }),
      ],
    })
  );

  return { host };
}

/** 开合副作用（挂监听、写焦点）在 watch / 嵌套 nextTick 里，需要等两拍。 */
async function settle(): Promise<void> {
  await nextTick();
  await nextTick();
}

function press(key: string): void {
  content()?.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount();

  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('DropdownMenu 结构与 ARIA', () => {
  it('Root 不渲染元素，Trigger 是带 type=button 的 button', () => {
    const { host } = mountMenu();

    expect(host.children).toHaveLength(1);
    expect(host.firstElementChild).toBe(trigger());
    expect(trigger().tagName).toBe('BUTTON');
    expect(trigger().getAttribute('type')).toBe('button');
    expect(trigger().getAttribute('aria-haspopup')).toBe('menu');
  });

  it('关闭时内容不在 DOM', () => {
    mountMenu();

    expect(content()).toBeNull();
  });

  it('keepMounted：打开过一次之后关闭不卸载，只切成 closed', async () => {
    mount(() =>
      h(DropdownMenuRoot, null, {
        default: () => [
          h(DropdownMenuTrigger, null, { default: () => ['操作'] }),
          h(
            DropdownMenuContent,
            { keepMounted: true },
            {
              default: () => [h(DropdownMenuItem, { value: 'a' }, { default: () => ['A'] })],
            }
          ),
        ],
      })
    );

    expect(content()).toBeNull();

    trigger().click();
    await settle();

    const panel = content();

    press('Escape');
    await settle();

    expect(content()).toBe(panel);
    expect(panel?.getAttribute('data-state')).toBe('closed');
  });

  it('点击打开：role=menu、焦点落首项、项 roving tabindex', async () => {
    mountMenu();

    trigger().click();
    await settle();

    const panel = content();

    expect(panel).not.toBeNull();
    expect(panel?.getAttribute('role')).toBe('menu');
    expect(trigger().getAttribute('aria-controls')).toBe(panel?.id);

    const list = items();

    expect(list[0].getAttribute('role')).toBe('menuitem');
    expect(list[0].getAttribute('tabindex')).toBe('-1');
    expect(document.activeElement).toBe(list[0]);
    expect(list[0].hasAttribute('data-highlighted')).toBe(true);
  });

  it('label 与 separator 是纯展示角色', async () => {
    mountMenu();

    trigger().click();
    await settle();

    expect(document.querySelector('[data-part="label"]')?.getAttribute('role')).toBe(
      'presentation'
    );
    expect(document.querySelector('[data-part="separator"]')?.getAttribute('role')).toBe(
      'separator'
    );
  });

  it('checkbox 项 role=menuitemcheckbox 且输出 aria-checked', async () => {
    mountMenu();

    trigger().click();
    await settle();

    const checkbox = items().find((el) => el.getAttribute('role') === 'menuitemcheckbox');

    expect(checkbox).toBeTruthy();
    expect(checkbox?.getAttribute('aria-checked')).toBe('false');
  });
});

describe('DropdownMenu 键盘与激活', () => {
  it('ArrowDown 跳过禁用项移动焦点', async () => {
    mountMenu();

    trigger().click();
    await settle();

    press('ArrowDown');
    await nextTick();

    const list = items();

    // 顺序：copy / del(禁用) / find / wrap；从 copy 下一步应到 find。
    expect(document.activeElement).toBe(list[2]);
    expect(list[2].hasAttribute('data-highlighted')).toBe(true);
  });

  it('Enter 激活聚焦项：上报 select 并关闭', async () => {
    const onSelect = vi.fn();
    mountMenu({ onSelect });

    trigger().click();
    await settle();

    press('ArrowDown');
    press('Enter');
    await settle();

    expect(onSelect).toHaveBeenCalledWith('find');
    expect(content()).toBeNull();
  });

  it('Escape 关闭并归还焦点到触发器', async () => {
    mountMenu();

    trigger().click();
    await settle();

    press('Escape');
    await settle();

    expect(content()).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });

  it('点击项激活并关闭；禁用项点击无效', async () => {
    const onSelect = vi.fn();
    mountMenu({ onSelect });

    trigger().click();
    await settle();

    const list = items();

    list[1].click();
    await settle();
    expect(onSelect).not.toHaveBeenCalled();
    expect(content()).not.toBeNull();

    list[0].click();
    await settle();
    expect(onSelect).toHaveBeenCalledWith('copy');
    expect(content()).toBeNull();
  });

  it('checkbox 项点击翻转勾选、上报 update:checked 并关闭', async () => {
    const onChecked = vi.fn();
    mount(() =>
      h(DropdownMenuRoot, null, {
        default: () => [
          h(DropdownMenuTrigger, null, { default: () => ['视图'] }),
          h(DropdownMenuContent, null, {
            default: () => [
              h(
                DropdownMenuCheckboxItem,
                { value: 'wrap', 'onUpdate:checked': onChecked },
                { default: () => ['换行'] }
              ),
            ],
          }),
        ],
      })
    );

    trigger().click();
    await settle();

    const checkbox = items()[0];

    expect(checkbox.getAttribute('aria-checked')).toBe('false');

    checkbox.click();
    await settle();

    expect(onChecked).toHaveBeenCalledWith(true);
    expect(content()).toBeNull();
  });
});

describe('DropdownMenu asChild 与上下文', () => {
  it('asChild 把属性合并到唯一子元素，且不输出 type', async () => {
    mount(() =>
      h(DropdownMenuRoot, null, {
        default: () => [
          h(
            DropdownMenuTrigger,
            { asChild: true },
            { default: () => [h('a', { href: '#' }, '链接')] }
          ),
          h(DropdownMenuContent, null, {
            default: () => [h(DropdownMenuItem, { value: 'a' }, { default: () => ['A'] })],
          }),
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
    expect(() => mount(() => h(DropdownMenuTrigger))).toThrow();
    expect(() => mount(() => h(DropdownMenuContent))).toThrow();
    expect(() => mount(() => h(DropdownMenuItem, { value: 'a' }))).toThrow();
    expect(() => mount(() => h(DropdownMenuCheckboxItem, { value: 'a' }))).toThrow();
    expect(() => mount(() => h(DropdownMenuLabel))).toThrow();
    expect(() => mount(() => h(DropdownMenuSeparator))).toThrow();
  });
});
