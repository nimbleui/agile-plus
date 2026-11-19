import { createApp, defineComponent, h, nextTick } from 'vue';

import { afterEach, describe, expect, it } from 'vitest';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '../src/tabs';

import type { App } from 'vue';

const apps: App[] = [];

function mount(node: () => ReturnType<typeof h>): HTMLElement {
  const host = document.createElement('div');

  document.body.append(host);

  const app = createApp(defineComponent({ setup: () => node }));

  app.mount(host);
  apps.push(app);

  return host;
}

function styledTabs(): HTMLElement {
  return mount(() =>
    h(
      Tabs,
      { defaultValue: 'a' },
      {
        default: () => [
          h(
            TabsList,
            {},
            {
              default: () => [
                h(TabsTrigger, { value: 'a' }, { default: () => ['标签 A'] }),
                h(TabsTrigger, { value: 'b' }, { default: () => ['标签 B'] }),
              ],
            }
          ),
          h(TabsContent, { value: 'a' }, { default: () => ['面板 A'] }),
          h(TabsContent, { value: 'b' }, { default: () => ['面板 B'] }),
        ],
      }
    )
  );
}

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount();

  document.body.innerHTML = '';
});

describe('成品 Tabs 的样式落点', () => {
  it('列表与面板带 y-tabs，触发按钮带 BEM class，data-part 全部保留', async () => {
    const host = styledTabs();

    await nextTick();

    // TabsRoot 是 renderless：宿主的首个元素就是列表，没有额外的根元素。
    expect(host.firstElementChild?.getAttribute('data-part')).toBe('list');
    expect(host.querySelectorAll('.y-tabs[data-part="list"]')).toHaveLength(1);
    expect(host.querySelectorAll('.y-tabs[data-part="content"]')).toHaveLength(2);
    expect(host.querySelectorAll('button.y-tabs__trigger[data-part="trigger"]')).toHaveLength(2);
  });

  it('样式 class 与无头层的 ARIA / hidden 语义同时生效', async () => {
    const host = styledTabs();

    await nextTick();

    const triggers = Array.from(host.querySelectorAll<HTMLButtonElement>('.y-tabs__trigger'));
    const panels = Array.from(host.querySelectorAll<HTMLElement>('[data-part="content"]'));

    expect(triggers[0]?.getAttribute('role')).toBe('tab');
    expect(triggers[0]?.getAttribute('aria-selected')).toBe('true');
    expect(triggers[0]?.tabIndex).toBe(0);
    expect(triggers[1]?.tabIndex).toBe(-1);
    expect(panels[0]?.hidden).toBe(false);
    expect(panels[1]?.hidden).toBe(true);
  });
});
