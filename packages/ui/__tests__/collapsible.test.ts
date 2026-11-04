import { createApp, defineComponent, h, nextTick, ref } from 'vue';

import { afterEach, describe, expect, it } from 'vitest';

import { CollapsibleContent, CollapsibleRoot, CollapsibleTrigger } from '../src/collapsible';

import type { App } from 'vue';

const apps: App[] = [];

function mount(
  render: (props: Record<string, unknown>) => ReturnType<typeof h>,
  props: Record<string, unknown> = {}
): HTMLElement {
  const host = document.createElement('div');

  document.body.append(host);

  const app = createApp(defineComponent({ setup: () => () => render(props) }));

  app.mount(host);
  apps.push(app);

  return host;
}

function simple(props: Record<string, unknown> = {}) {
  return mount(
    () =>
      h(CollapsibleRoot, props, {
        default: () => [
          h(CollapsibleTrigger, null, { default: () => '开关' }),
          h(CollapsibleContent, null, { default: () => h('p', '内容') }),
        ],
      }),
    props
  );
}

function root(host: HTMLElement): HTMLElement {
  return host.querySelector('[data-part="root"]') as HTMLElement;
}

function trigger(host: HTMLElement): HTMLButtonElement {
  return host.querySelector('[data-part="trigger"]') as HTMLButtonElement;
}

function content(host: HTMLElement): HTMLElement | null {
  return host.querySelector('[data-part="content"]');
}

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount();

  document.body.innerHTML = '';
});

describe('CollapsibleRoot 与 Trigger', () => {
  it('渲染 div + button，初始收起且不带 aria-controls', () => {
    const host = simple();

    expect(root(host).tagName).toBe('DIV');
    expect(root(host).getAttribute('data-state')).toBe('closed');
    expect(trigger(host).tagName).toBe('BUTTON');
    expect(trigger(host).getAttribute('type')).toBe('button');
    expect(trigger(host).getAttribute('aria-expanded')).toBe('false');
    expect(trigger(host).hasAttribute('aria-controls')).toBe(false);
    expect(content(host)).toBeNull();
  });

  it('点击展开后 aria-controls 指向 content 的 id', async () => {
    const host = simple();

    trigger(host).click();
    await nextTick();
    await nextTick();

    const panel = content(host);

    expect(trigger(host).getAttribute('aria-expanded')).toBe('true');
    expect(trigger(host).getAttribute('aria-controls')).toBe(panel?.id);
    expect(panel?.hasAttribute('hidden')).toBe(false);
    expect(panel?.textContent).toContain('内容');
    expect(root(host).getAttribute('data-state')).toBe('open');
  });

  it('再次点击收起，无动画时当帧卸载', async () => {
    const host = simple();

    trigger(host).click();
    await nextTick();
    await nextTick();

    trigger(host).click();
    await nextTick();
    await nextTick();

    expect(content(host)).toBeNull();
    expect(trigger(host).getAttribute('aria-expanded')).toBe('false');
  });

  it('v-model:open 双向绑定', async () => {
    const open = ref(false);

    const host = mount(
      () =>
        h(
          CollapsibleRoot,
          {
            open: open.value,
            'onUpdate:open': (value: boolean) => {
              open.value = value;
            },
          },
          {
            default: () => [
              h(CollapsibleTrigger, null, { default: () => '开关' }),
              h(CollapsibleContent, null, { default: () => h('p', '内容') }),
            ],
          }
        ),
      {}
    );

    trigger(host).click();
    await nextTick();

    expect(open.value).toBe(true);

    open.value = false;
    await nextTick();
    await nextTick();

    expect(content(host)).toBeNull();
  });

  it('禁用时按钮不可点，但 data-disabled 供样式命中', async () => {
    const host = simple({ disabled: true });

    expect(trigger(host).hasAttribute('disabled')).toBe(true);
    expect(trigger(host).getAttribute('data-disabled')).toBe('');
    expect(root(host).getAttribute('data-disabled')).toBe('');

    trigger(host).click();
    await nextTick();

    expect(content(host)).toBeNull();
  });
});

describe('CollapsibleContent', () => {
  it('forceMount 时收起仍在 DOM，可见性交给样式层', async () => {
    const host = mount(() =>
      h(CollapsibleRoot, null, {
        default: () => [
          h(CollapsibleTrigger, null, { default: () => '开关' }),
          h(CollapsibleContent, { forceMount: true }, { default: () => h('p', '常驻内容') }),
        ],
      })
    );

    const panel = content(host);

    // forceMount 的语义是「元素必须在」，不是「元素必须藏起来」：
    // 隐藏由样式层按 data-state 决定，动画库也需要一个真实存在的节点。
    expect(panel).not.toBeNull();
    expect(panel?.getAttribute('data-state')).toBe('closed');
    expect(panel?.textContent).toContain('常驻内容');
  });

  it('defaultOpen 时首帧就展开', async () => {
    const host = simple({ defaultOpen: true });

    await nextTick();

    expect(content(host)?.hasAttribute('hidden')).toBe(false);
    expect(trigger(host).getAttribute('aria-expanded')).toBe('true');
  });

  it('脱离 CollapsibleRoot 使用时抛出开发期错误', () => {
    expect(() => mount(() => h(CollapsibleContent, null, { default: () => [] }))).toThrow(
      /collapsible/
    );
  });
});

describe('asChild', () => {
  it('Root 与 Trigger 都能替换渲染目标', async () => {
    const host = mount(() =>
      h(
        CollapsibleRoot,
        { asChild: true },
        {
          default: () => [
            h('section', { class: 'mine' }, [
              h(
                CollapsibleTrigger,
                { asChild: true },
                { default: () => h('a', { href: '#' }, '开关') }
              ),
              h(CollapsibleContent, null, { default: () => h('p', '内容') }),
            ]),
          ],
        }
      )
    );

    const section = host.querySelector('section') as HTMLElement;
    const link = host.querySelector('a') as HTMLElement;

    expect(section.getAttribute('data-part')).toBe('root');
    expect(link.getAttribute('data-part')).toBe('trigger');
    expect(link.getAttribute('aria-expanded')).toBe('false');

    link.click();
    await nextTick();
    await nextTick();

    expect(link.getAttribute('aria-expanded')).toBe('true');
    expect(content(host)).not.toBeNull();
  });
});
