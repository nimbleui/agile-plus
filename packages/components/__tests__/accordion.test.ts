import { createApp, defineComponent, h, nextTick } from 'vue';

import { compile } from 'sass';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { dirname, join } from 'node:path';

import { fileURLToPath } from 'node:url';

import { Accordion, AccordionItem } from '../src/accordion';

import type { App } from 'vue';

const apps: App[] = [];

function mount(node: () => ReturnType<typeof h>) {
  const host = document.createElement('div');
  document.body.append(host);

  const app = createApp(defineComponent({ setup: () => node }));
  app.mount(host);
  apps.push(app);

  return host;
}

function accordion(options: Record<string, unknown> = {}) {
  return mount(() =>
    h(Accordion, { type: 'single', ...options }, {
      default: () => [
        h(AccordionItem, { value: 'a' }, { trigger: () => ['标题 A'], default: () => ['内容 A'] }),
        h(AccordionItem, { value: 'b' }, { trigger: () => ['标题 B'], default: () => ['内容 B'] }),
      ],
    })
  );
}

function triggers(host: HTMLElement): HTMLButtonElement[] {
  return Array.from(host.querySelectorAll<HTMLButtonElement>('.y-accordion__trigger'));
}

function items(host: HTMLElement): HTMLElement[] {
  return Array.from(host.querySelectorAll<HTMLElement>('.y-accordion__item'));
}

/** 点击后让响应式更新与 Presence 的 post 测量都落地。 */
async function flush(): Promise<void> {
  await nextTick();
  await nextTick();
}

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount();
  document.body.innerHTML = '';
});

describe('成品 Accordion 的样式落点', () => {
  it('根 / 项 / 触发 / 内容都带命名空间类', async () => {
    const host = accordion({ defaultValue: 'a' });
    await flush();

    expect(host.querySelector('.y-accordion')).not.toBeNull();
    expect(host.querySelector('.y-accordion__item')).not.toBeNull();
    expect(host.querySelector('.y-accordion__trigger')).not.toBeNull();
    expect(host.querySelector('.y-accordion__content')).not.toBeNull();
  });

  it('展开项 data-state=open 且内容渲染，收起项内容不在 DOM', async () => {
    const host = accordion({ defaultValue: 'a' });
    await flush();

    expect(items(host)[0]?.getAttribute('data-state')).toBe('open');
    expect(items(host)[1]?.getAttribute('data-state')).toBe('closed');
    expect(host.textContent).toContain('内容 A');
    expect(host.textContent).not.toContain('内容 B');
  });
});

describe('成品 Accordion 的交互', () => {
  it('single 点击切换展开项，旧项收起', async () => {
    const host = accordion();
    await flush();

    triggers(host)[0]?.click();
    await flush();
    expect(items(host)[0]?.getAttribute('data-state')).toBe('open');

    triggers(host)[1]?.click();
    await flush();
    expect(items(host)[0]?.getAttribute('data-state')).toBe('closed');
    expect(items(host)[1]?.getAttribute('data-state')).toBe('open');
  });

  it('collapsible 允许再次点击收起唯一展开项', async () => {
    const host = accordion({ collapsible: true, defaultValue: 'a' });
    await flush();

    triggers(host)[0]?.click();
    await flush();

    expect(items(host)[0]?.getAttribute('data-state')).toBe('closed');
  });

  it('非 collapsible 点击已展开项保持展开', async () => {
    const host = accordion({ defaultValue: 'a' });
    await flush();

    triggers(host)[0]?.click();
    await flush();

    expect(items(host)[0]?.getAttribute('data-state')).toBe('open');
  });

  it('multiple 可同时展开多项', async () => {
    const host = accordion({ type: 'multiple' });
    await flush();

    triggers(host)[0]?.click();
    triggers(host)[1]?.click();
    await flush();

    expect(items(host)[0]?.getAttribute('data-state')).toBe('open');
    expect(items(host)[1]?.getAttribute('data-state')).toBe('open');
  });

  it('上下箭头在触发按钮之间移动焦点', async () => {
    const host = accordion();
    await flush();

    const [first, second] = triggers(host);
    first?.focus();
    first?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));

    expect(document.activeElement).toBe(second);
  });

  it('禁用项的触发按钮带原生 disabled', async () => {
    const host = mount(() =>
      h(Accordion, { type: 'single' }, {
        default: () => [
          h(AccordionItem, { value: 'a', disabled: true }, { trigger: () => ['A'], default: () => ['甲'] }),
        ],
      })
    );
    await flush();

    expect(triggers(host)[0]?.disabled).toBe(true);
  });

  it('v-model:value 随展开变化发出负载', async () => {
    const onUpdate = vi.fn();
    const host = mount(() =>
      h(Accordion, { type: 'single', collapsible: true, 'onUpdate:value': onUpdate }, {
        default: () => [
          h(AccordionItem, { value: 'a' }, { trigger: () => ['A'], default: () => ['甲'] }),
        ],
      })
    );
    await flush();

    triggers(host)[0]?.click();
    await flush();

    expect(onUpdate).toHaveBeenCalledWith('a');
  });
});

/**
 * 入场动画的「点完停一下才动」回归。
 *
 * 断的是编译后的 CSS 而不是 computed style：jsdom 不解析 var()，读到的会是空串，
 * 「拿不到值」和「值为 0」分不开；真实数字来自 headless Chrome 的逐帧测量。
 */
describe('成品 Accordion 的高度动画没有静止段', () => {
  // Vite 会把 new URL('...', import.meta.url) 编译成 dev-server 地址，先反解目录再拼接。
  const accordionScss = join(
    dirname(fileURLToPath(import.meta.url)),
    '..',
    'src',
    'accordion',
    'Accordion.scss'
  );

  const css = String(compile(accordionScss).css);

  /** 取某条规则的声明体。 */
  function ruleBody(selector: string): string {
    const start = css.indexOf(`${selector} {`);

    expect(start, `编译结果里找不到 ${selector} 规则`).toBeGreaterThan(-1);

    return css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start));
  }

  function declaration(block: string, name: string): string {
    const matched = new RegExp(`(?:^|;)\\s*${name}:\\s*([^;]+);`).exec(block);

    return matched ? matched[1].trim().replace(/\s+/g, ' ') : '';
  }

  it('做动画的内容元素自身没有纵向内距', () => {
    const body = ruleBody('.y-accordion__content');

    expect(body).not.toMatch(/padding-(top|bottom|block)\s*:/);
    // padding 简写第一位是上下：必须是 0，否则 border-box 下元素最低只到内距。
    expect(declaration(body, 'padding')).toMatch(/^0(\s+var\([^)]+\))?$/);
  });

  it('末段间距由内容元素的占位伪元素提供', () => {
    expect(declaration(ruleBody('.y-accordion__content::after'), 'height')).toBe(
      'var(--y-accordion-padding-block)'
    );
  });

  it('进出场关键帧两端都是真 0', () => {
    const openFrom = /@keyframes y-accordion-open\s*\{\s*from\s*\{\s*height:\s*([^;}]+)/.exec(css);
    const closeTo = /@keyframes y-accordion-close\s*\{[\s\S]*?to\s*\{\s*height:\s*([^;}]+)/.exec(
      css
    );

    expect(openFrom?.[1]).toBe('0');
    expect(closeTo?.[1]).toBe('0');
  });
});