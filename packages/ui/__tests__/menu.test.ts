import { createApp, defineComponent, h, nextTick, ref } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  MenuItem,
  MenuItemGroup,
  MenuRoot,
  MenuSub,
  MenuSubContent,
  MenuSubTrigger,
} from '../src/menu';

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

function menuItems(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-part="item-content"]'));
}

function subTriggers(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-part="submenu-trigger"]'));
}

function subContents(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-part="submenu-content"]'));
}

function press(element: HTMLElement, key: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });

  element.dispatchEvent(event);

  return event;
}

async function settle(): Promise<void> {
  await nextTick();
  await nextTick();
}

function mountMenu(rootProps: Record<string, unknown> = {}) {
  return mount(() =>
    h(MenuRoot, rootProps, {
      default: () => [
        h(MenuItem, { value: 'home' }, { default: () => ['首页'] }),
        h(MenuItem, { value: 'disabled', disabled: true }, { default: () => ['禁用'] }),
        h(
          MenuSub,
          { value: 'system' },
          {
            default: () => [
              h(MenuSubTrigger, null, { default: () => ['系统管理'] }),
              h(MenuSubContent, null, {
                default: () => [
                  h(MenuItem, { value: 'users' }, { default: () => ['用户管理'] }),
                  h(MenuItem, { value: 'roles' }, { default: () => ['角色管理'] }),
                ],
              }),
            ],
          }
        ),
      ],
    })
  );
}

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount();

  document.body.innerHTML = '';
  vi.useRealTimers();
});

describe('Menu 结构与 ARIA', () => {
  it('Root 渲染 ul role=menu，项使用 button 与 link 语义', () => {
    const host = mount(() =>
      h(MenuRoot, null, {
        default: () => [
          h(MenuItem, { value: 'home' }, { default: () => ['首页'] }),
          h(MenuItem, { value: 'docs', href: '/docs' }, { default: () => ['文档'] }),
        ],
      })
    );

    const root = host.firstElementChild as HTMLElement;
    const [button, link] = menuItems();

    expect(root.tagName).toBe('UL');
    expect(root.getAttribute('role')).toBe('menu');
    expect(button?.tagName).toBe('BUTTON');
    expect(button?.getAttribute('type')).toBe('button');
    expect(link?.tagName).toBe('A');
    expect(link?.getAttribute('href')).toBe('/docs');
  });

  it('选中项输出 aria-current，禁用项不可聚焦', async () => {
    mountMenu({ defaultSelectedKeys: ['home'] });

    const [home, disabled] = menuItems();

    expect(home?.getAttribute('aria-current')).toBe('page');
    expect(home?.tabIndex).toBe(0);
    expect(disabled?.getAttribute('aria-disabled')).toBe('true');
    expect(disabled?.tabIndex).toBe(-1);
  });

  it('子菜单触发器与内容 id 互指', () => {
    mountMenu({ defaultOpenKeys: ['system'] });

    const trigger = subTriggers()[0];
    const content = subContents()[0];

    expect(trigger?.getAttribute('aria-controls')).toBe(content?.id);
    expect(content?.getAttribute('aria-labelledby')).toBe(trigger?.id);
    expect(content?.getAttribute('role')).toBe('menu');
  });

  it('分组提供 group 语义与标题关联', () => {
    mount(() =>
      h(MenuRoot, null, {
        default: () => [
          h(
            MenuItemGroup,
            { title: '账号' },
            {
              default: () => [h(MenuItem, { value: 'users' }, { default: () => ['用户'] })],
            }
          ),
        ],
      })
    );

    const label = document.querySelector('[data-part="group-label"]') as HTMLElement;
    const group = document.querySelector('[data-part="group-list"]') as HTMLElement;

    expect(group.getAttribute('role')).toBe('group');
    expect(group.getAttribute('aria-labelledby')).toBe(label.id);
  });
});

describe('Menu 选中与子菜单交互', () => {
  it('非受控点击更新选中态并发送 select 信息', async () => {
    const onSelect = vi.fn();

    mountMenu({ onSelect });
    menuItems()[0]?.click();
    await nextTick();

    expect(menuItems()[0]?.dataset.state).toBe('active');
    expect(onSelect).toHaveBeenCalledWith({
      key: 'home',
      keyPath: ['home'],
      selectedKeys: ['home'],
    });
  });

  it('受控选中值不被内部改写，外部更新后生效', async () => {
    const selectedKeys = ref(['home']);
    const onUpdate = vi.fn();

    mount(() =>
      h(
        MenuRoot,
        { selectedKeys: selectedKeys.value, 'onUpdate:selectedKeys': onUpdate },
        {
          default: () => [
            h(MenuItem, { value: 'home' }, { default: () => ['首页'] }),
            h(MenuItem, { value: 'docs' }, { default: () => ['文档'] }),
          ],
        }
      )
    );

    menuItems()[1]?.click();
    await nextTick();

    expect(onUpdate).toHaveBeenCalledWith(['docs']);
    expect(menuItems()[0]?.dataset.state).toBe('active');

    selectedKeys.value = ['docs'];
    await nextTick();

    expect(menuItems()[1]?.dataset.state).toBe('active');
  });

  it('inline 子菜单点击展开/收起，内容始终留在当前菜单树', async () => {
    const host = mountMenu({ mode: 'inline' });

    subTriggers()[0]?.click();
    await settle();

    expect(subContents()[0]?.hidden).toBe(false);
    expect(host.contains(subContents()[0] as HTMLElement)).toBe(true);

    subTriggers()[0]?.click();
    await settle();

    expect(subContents()[0]?.hidden).toBe(true);
  });

  it('手风琴模式展开同级子菜单时关闭另一个', async () => {
    mount(() =>
      h(
        MenuRoot,
        { mode: 'inline', accordion: true },
        {
          default: () => [
            h(
              MenuSub,
              { value: 'a' },
              {
                default: () => [
                  h(MenuSubTrigger, null, { default: () => ['A'] }),
                  h(MenuSubContent, null, { default: () => [h(MenuItem, { value: 'a-1' })] }),
                ],
              }
            ),
            h(
              MenuSub,
              { value: 'b' },
              {
                default: () => [
                  h(MenuSubTrigger, null, { default: () => ['B'] }),
                  h(MenuSubContent, null, { default: () => [h(MenuItem, { value: 'b-1' })] }),
                ],
              }
            ),
          ],
        }
      )
    );

    subTriggers()[0]?.click();
    await settle();
    subTriggers()[1]?.click();
    await settle();

    expect(subContents()[0]?.hidden).toBe(true);
    expect(subContents()[1]?.hidden).toBe(false);
  });

  it('vertical 子菜单 Teleport 到 body，打开后聚焦首个可用项', async () => {
    const host = mountMenu({ mode: 'vertical' });

    subTriggers()[0]?.click();
    await settle();

    const content = subContents()[0];

    expect(host.contains(content as HTMLElement)).toBe(false);
    expect(document.body.contains(content as HTMLElement)).toBe(true);
    expect(document.activeElement).toBe(menuItems()[2]);
  });
});

describe('Menu 键盘与折叠', () => {
  it('方向键跳过禁用项，Enter 激活当前项', async () => {
    const onSelect = vi.fn();

    mountMenu({ onSelect });
    menuItems()[0]?.focus();

    press(menuItems()[0] as HTMLElement, 'ArrowDown');
    await nextTick();

    expect(document.activeElement).toBe(subTriggers()[0]);

    press(subTriggers()[0] as HTMLElement, 'ArrowRight');
    await settle();

    expect(document.activeElement).toBe(menuItems()[2]);

    press(menuItems()[2] as HTMLElement, 'Enter');
    await nextTick();

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'users', keyPath: ['system', 'users'] })
    );
  });

  it('ArrowLeft 关闭当前子菜单并把焦点还给父级触发器', async () => {
    mountMenu({ mode: 'inline', defaultOpenKeys: ['system'] });
    menuItems()[2]?.focus();

    press(menuItems()[2] as HTMLElement, 'ArrowLeft');
    await settle();

    expect(subContents()[0]?.hidden).toBe(true);
    expect(document.activeElement).toBe(subTriggers()[0]);
  });

  it('Escape 在子菜单触发器上关闭其弹出内容', async () => {
    mountMenu({ mode: 'inline', defaultOpenKeys: ['system'] });
    subTriggers()[0]?.focus();

    press(subTriggers()[0] as HTMLElement, 'Escape');
    await settle();

    expect(subContents()[0]?.hidden).toBe(true);
  });

  it('折叠态聚焦菜单项时复用 Tooltip 显示标签', async () => {
    mountMenu({ mode: 'inline', inlineCollapsed: true, defaultSelectedKeys: ['home'] });
    menuItems()[0]?.focus();
    await settle();

    const tooltip = document.querySelector('[role="tooltip"]') as HTMLElement;

    expect(tooltip?.textContent).toContain('首页');
    expect(menuItems()[0]?.getAttribute('aria-describedby')).toBe(tooltip?.id);
  });

  it('asChild 将链接语义与菜单属性合并到子元素', () => {
    mount(() =>
      h(MenuRoot, null, {
        default: () => [
          h(
            MenuItem,
            { value: 'docs', asChild: true },
            {
              default: () => [h('a', { href: '/docs' }, '文档')],
            }
          ),
        ],
      })
    );

    const link = document.querySelector('a') as HTMLElement;

    expect(link.getAttribute('role')).toBe('menuitem');
    expect(link.getAttribute('href')).toBe('/docs');
    expect(link.getAttribute('data-part')).toBe('item-content');
  });
});

describe('Menu 上下文约束', () => {
  it('部件脱离 MenuRoot 使用时抛错', () => {
    expect(() => mount(() => h(MenuItem, { value: 'a' }))).toThrow(/menu/);
    expect(() => mount(() => h(MenuSub, { value: 'a' }))).toThrow(/menu/);
    expect(() => mount(() => h(MenuSubTrigger))).toThrow();
    expect(() => mount(() => h(MenuSubContent))).toThrow();
  });
});
