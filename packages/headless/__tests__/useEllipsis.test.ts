import { createApp, defineComponent, nextTick, ref } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { useEllipsis } from '../src/useEllipsis';

import type { App } from 'vue';

import type { UseEllipsisOptions, UseEllipsisReturn } from '../src/useEllipsis';

const apps: App[] = [];

/** jsdom 不做布局，scrollWidth / clientWidth 恒为 0，必须桩掉才能测溢出判定。 */
function stubBox(element: HTMLElement, box: Partial<Record<string, number>>): void {
  for (const [key, value] of Object.entries(box)) {
    Object.defineProperty(element, key, { configurable: true, value });
  }
}

async function flushFrame(): Promise<void> {
  await nextTick();
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  await nextTick();
}

function setup(options: UseEllipsisOptions = {}) {
  const element = document.createElement('div');

  document.body.append(element);

  let api!: UseEllipsisReturn;

  const app = createApp(
    defineComponent({
      setup() {
        api = useEllipsis(options);

        return () => null;
      },
    })
  );

  app.mount(document.createElement('div'));
  apps.push(app);

  api.setContentElement(element);

  return { api, element };
}

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount();

  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('useEllipsis 模式与行数', () => {
  it('缺省 single 单行', () => {
    const { api } = setup();

    expect(api.mode.value).toBe('single');
    expect(api.lines.value).toBe(1);
  });

  it('multi 行数归一化透传', () => {
    const { api } = setup({ mode: 'multi', lines: 3 });

    expect(api.lines.value).toBe(3);
  });

  it('middle 切出固定尾部', () => {
    const { api } = setup({ mode: 'middle', tailChars: 3 });

    api.setText('abcdefgh');

    expect(api.tailText.value).toBe('fgh');
  });
});

describe('useEllipsis 溢出测量', () => {
  it('single 横向溢出才判溢出', async () => {
    const { api, element } = setup();

    stubBox(element, { scrollWidth: 200, clientWidth: 100, scrollHeight: 20, clientHeight: 20 });
    api.setText('a long line');
    await flushFrame();

    expect(api.isOverflow.value).toBe(true);
    expect(api.dataState.value).toBe('clamped');

    stubBox(element, { scrollWidth: 100 });
    api.measure();
    await flushFrame();

    expect(api.isOverflow.value).toBe(false);
    expect(api.dataState.value).toBe('full');
  });

  it('multi 看纵向而不是横向', async () => {
    const { api, element } = setup({ mode: 'multi', lines: 2 });

    stubBox(element, { scrollWidth: 999, clientWidth: 100, scrollHeight: 60, clientHeight: 40 });
    api.setText('many lines');
    await flushFrame();

    expect(api.isOverflow.value).toBe(true);

    stubBox(element, { scrollHeight: 40 });
    api.measure();
    await flushFrame();

    expect(api.isOverflow.value).toBe(false);
  });

  it('同一帧内多次 measure 只量一次', async () => {
    const { api, element } = setup();

    stubBox(element, { scrollWidth: 200, clientWidth: 100 });
    await flushFrame();

    const spy = vi.spyOn(element, 'scrollWidth', 'get');

    api.measure();
    api.measure();
    api.measure();
    await flushFrame();

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('文本变化触发重测', async () => {
    const { api, element } = setup();

    stubBox(element, { scrollWidth: 100, clientWidth: 100 });
    api.setText('short');
    await flushFrame();

    expect(api.isOverflow.value).toBe(false);

    stubBox(element, { scrollWidth: 300 });
    api.setText('a much longer line');
    await flushFrame();

    expect(api.isOverflow.value).toBe(true);
  });
});

describe('useEllipsis 展开态', () => {
  it('展开后 sticky 保留溢出结论，收起按钮才还在', async () => {
    const { api, element } = setup();

    stubBox(element, { scrollWidth: 200, clientWidth: 100 });
    api.setText('long');
    await flushFrame();

    expect(api.isOverflow.value).toBe(true);

    api.setExpanded(true);
    await flushFrame();

    expect(api.expanded.value).toBe(true);
    expect(api.isOverflow.value).toBe(true);
    expect(api.dataState.value).toBe('expanded');
    expect(api.contentStyle.value).toEqual({});

    api.setExpanded(false);
    await flushFrame();

    expect(api.dataState.value).toBe('clamped');
  });

  it('toggle 来回切换', () => {
    const { api } = setup();

    api.toggleExpanded();

    expect(api.expanded.value).toBe(true);

    api.toggleExpanded();

    expect(api.expanded.value).toBe(false);
  });

  it('受控展开由外部决定，setExpanded 只上报', async () => {
    const expanded = ref(false);
    const onExpandedChange = vi.fn();
    const { api } = setup({ expanded, onExpandedChange });

    api.setExpanded(true);

    expect(onExpandedChange).toHaveBeenCalledWith(true);
    expect(api.expanded.value).toBe(false);

    expanded.value = true;
    await nextTick();

    expect(api.expanded.value).toBe(true);
  });

  it('模式变化清零旧结论再重测', async () => {
    const mode = ref<'single' | 'multi'>('single');
    const { api, element } = setup({ mode });

    stubBox(element, { scrollWidth: 200, clientWidth: 100, scrollHeight: 20, clientHeight: 20 });
    api.setText('long');
    await flushFrame();

    expect(api.isOverflow.value).toBe(true);

    mode.value = 'multi';
    await flushFrame();

    // multi 看纵向，纵向未溢出 → 清零后重测为 false
    expect(api.isOverflow.value).toBe(false);
  });
});

describe('useEllipsis 清理', () => {
  it('卸载后取消未执行的测量帧', async () => {
    const { api, element } = setup();

    stubBox(element, { scrollWidth: 200, clientWidth: 100 });
    api.setText('long');

    const app = apps.pop();

    app?.unmount();
    await flushFrame();

    expect(api.isOverflow.value).toBe(false);
  });

  it('元素解绑后不再测量', async () => {
    const { api, element } = setup();

    stubBox(element, { scrollWidth: 200, clientWidth: 100 });
    api.setContentElement(null);
    api.setText('long');
    await flushFrame();

    expect(api.isOverflow.value).toBe(false);
  });
});
