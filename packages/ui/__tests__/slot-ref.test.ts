import { createApp, defineComponent, h, nextTick, ref } from 'vue';

import { afterEach, describe, expect, it } from 'vitest';

import type { Ref } from 'vue';

import { Slot } from '../src/slot';

/**
 * elRef 的落点测试。
 *
 * SSR 字符串断言看不到 ref：`renderToString` 不执行引用绑定。而 elRef 存在的意义正是
 * 让测量尺寸、监听动画的组件能拿到真实元素，所以这组用例必须在 jsdom 里真实挂载。
 */
function mountSlot(
  slotProps: Record<string, unknown>,
  child?: (childRef?: (node: Element | null) => void) => ReturnType<typeof h>
): { host: HTMLElement; app: ReturnType<typeof createApp> } {
  const host = document.createElement('div');

  document.body.append(host);

  const children = () => (child ? [child()] : [h('span', '内容')]);
  const app = createApp(
    defineComponent({ setup: () => () => h(Slot, slotProps, { default: children }) })
  );

  app.mount(host);

  return { host, app };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('Slot 的 elRef', () => {
  it('默认渲染时拿到生成的元素', async () => {
    const element = ref<Element | null>(null);

    const { host, app } = mountSlot({ elRef: element });

    await nextTick();

    expect(element.value).toBe(host.querySelector('div'));

    app.unmount();
  });

  it('函数形式在卸载时收到 null', async () => {
    const seen: Array<Element | null> = [];

    const { app } = mountSlot({ elRef: (node: Element | null) => seen.push(node) });

    await nextTick();

    expect(seen).toHaveLength(1);
    expect(seen[0]?.tagName).toBe('DIV');

    app.unmount();

    expect(seen.at(-1)).toBeNull();
  });

  it('asChild 时拿到被替换的子元素，并且不覆盖子元素自己的 ref', async () => {
    const element: Ref<Element | null> = ref(null);
    const ownRef: Ref<Element | null> = ref(null);

    const { host, app } = mountSlot({ asChild: true, elRef: element }, () =>
      h('span', { ref: ownRef }, '内容')
    );

    await nextTick();

    const span = host.querySelector('span');

    expect(span).not.toBeNull();
    expect(element.value).toBe(span);
    expect(ownRef.value).toBe(span);

    app.unmount();
  });

  it('未提供 elRef 时不会写出多余的 ref 属性', async () => {
    const { host, app } = mountSlot({ class: 'plain' });

    await nextTick();

    expect(host.querySelector('div')?.hasAttribute('ref')).toBe(false);

    app.unmount();
  });
});
