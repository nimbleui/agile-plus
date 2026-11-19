import { createApp, defineComponent, nextTick, ref } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { useFloating } from '../src/useFloating';

import type { App } from 'vue';

import type { UseFloatingOptions, UseFloatingReturn } from '../src/useFloating';

const apps: App[] = [];

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** jsdom 不做布局，getBoundingClientRect 恒为 0，必须桩掉才能测几何。 */
function stubRect(element: HTMLElement, rect: Rect): void {
  element.getBoundingClientRect = () =>
    ({
      ...rect,
      top: rect.y,
      left: rect.x,
      right: rect.x + rect.width,
      bottom: rect.y + rect.height,
      toJSON: () => rect,
    }) as DOMRect;
}

function setViewport(width: number, height: number): void {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height });
}

function setScroll(x: number, y: number): void {
  Object.defineProperty(window, 'scrollX', { configurable: true, value: x });
  Object.defineProperty(window, 'scrollY', { configurable: true, value: y });
}

/** 等一帧：composable 的 rAF 先排，再排一个回调就能确保它已执行。 */
async function flushFrame(): Promise<void> {
  await nextTick();
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  await nextTick();
}

function setup(options: UseFloatingOptions = {}) {
  setViewport(1000, 800);
  setScroll(0, 0);

  const reference = document.createElement('button');
  const floating = document.createElement('div');

  stubRect(reference, { x: 400, y: 300, width: 100, height: 40 });
  stubRect(floating, { x: 0, y: 0, width: 200, height: 80 });
  document.body.append(reference, floating);

  let api!: UseFloatingReturn;

  const app = createApp(
    defineComponent({
      setup() {
        api = useFloating(options);

        return () => null;
      },
    })
  );

  app.mount(document.createElement('div'));
  apps.push(app);

  api.referenceRef.value = reference;
  api.floatingRef.value = floating;

  return { api, reference, floating };
}

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount();

  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('useFloating 基础定位', () => {
  it('缺省 bottom：坐标按锚点与浮层尺寸算出', async () => {
    const { api } = setup();

    await flushFrame();

    expect(api.x.value).toBe(350);
    expect(api.y.value).toBe(340);
    expect(api.placement.value).toBe('bottom');
  });

  it('floatingStyle 用 transform 位移，left/top 固定为 0', async () => {
    const { api } = setup();

    await flushFrame();

    expect(api.floatingStyle.value).toEqual({
      position: 'absolute',
      left: 0,
      top: 0,
      transform: 'translate(350px, 340px)',
    });
  });

  it('offset 拉开与锚点的间距', async () => {
    const { api } = setup({ placement: 'bottom', offset: 8 });

    await flushFrame();

    expect(api.y.value).toBe(348);
  });

  it('absolute 策略换算成页面坐标', async () => {
    const { api } = setup({ strategy: 'absolute' });

    // setup 会把滚动量归零，必须在它之后再设，否则测的是 0 偏移。
    setScroll(120, 240);
    api.update();
    await flushFrame();

    expect(api.x.value).toBe(470);
    expect(api.y.value).toBe(580);
    expect(api.floatingStyle.value.position).toBe('absolute');
  });

  it('缺省策略是 absolute：滚动后坐标含滚动量，浮层随文档层原生移动', async () => {
    const { api } = setup();

    setScroll(120, 240);
    api.update();
    await flushFrame();

    expect(api.floatingStyle.value.position).toBe('absolute');
    expect(api.x.value).toBe(470);
    expect(api.y.value).toBe(580);
  });

  it('fixed 是逃生门：坐标保持视口坐标，不随滚动量换算', async () => {
    const { api } = setup({ strategy: 'fixed' });

    setScroll(120, 240);
    api.update();
    await flushFrame();

    expect(api.floatingStyle.value.position).toBe('fixed');
    expect(api.x.value).toBe(350);
    expect(api.y.value).toBe(340);
  });

  it('元素还没绑定时不抛错也不产出坐标', async () => {
    setViewport(1000, 800);

    let api!: UseFloatingReturn;

    const app = createApp(
      defineComponent({
        setup() {
          api = useFloating();

          return () => null;
        },
      })
    );

    app.mount(document.createElement('div'));
    apps.push(app);

    await flushFrame();

    expect(api.x.value).toBe(0);
    expect(api.y.value).toBe(0);
  });
});

describe('useFloating 边界处理', () => {
  it('锚点靠底时翻到 top，placement 反映实际结果', async () => {
    const { api, reference } = setup({ placement: 'bottom' });

    stubRect(reference, { x: 400, y: 750, width: 100, height: 40 });
    api.update();
    await flushFrame();

    expect(api.placement.value).toBe('top');
    expect(api.y.value).toBe(670);
  });

  it('锚点靠左时沿交叉轴钳制，主轴间距不被压掉', async () => {
    const { api, reference } = setup({ placement: 'bottom' });

    stubRect(reference, { x: 0, y: 300, width: 20, height: 40 });
    api.update();
    await flushFrame();

    expect(api.x.value).toBe(0);
    expect(api.y.value).toBe(340);
  });

  it('padding 生效', async () => {
    const { api, reference } = setup({ placement: 'bottom', padding: 12 });

    stubRect(reference, { x: 0, y: 300, width: 20, height: 40 });
    api.update();
    await flushFrame();

    expect(api.x.value).toBe(12);
  });

  it('boundary 元素取代视口成为裁剪依据', async () => {
    const boundary = document.createElement('div');

    stubRect(boundary, { x: 100, y: 100, width: 300, height: 200 });
    document.body.append(boundary);

    const { api } = setup({ placement: 'bottom', boundary });

    await flushFrame();

    // 居中坐标 350，边界右沿 400 - 浮层 200 = 200
    expect(api.x.value).toBe(200);
  });
});

describe('useFloating 箭头', () => {
  it('arrowStyle 只含交叉轴偏移，贴哪条边留给样式层', async () => {
    const { api } = setup({ placement: 'bottom', arrow: { size: 10 } });

    await flushFrame();

    expect(api.arrowStyle.value).toEqual({ position: 'absolute', left: '95px' });
  });

  it('左右朝向时输出 top', async () => {
    const { api } = setup({ placement: 'right', arrow: { size: 10 } });

    await flushFrame();

    expect(api.arrowStyle.value).toEqual({ position: 'absolute', top: '35px' });
  });

  it('未配置 arrow 时样式为空对象', async () => {
    const { api } = setup();

    await flushFrame();

    expect(api.arrowStyle.value).toEqual({});
  });
});

describe('useFloating 更新合并与监听', () => {
  it('同一帧内多次 update 只测量一次', async () => {
    const { api, floating } = setup();

    await flushFrame();

    const spy = vi.spyOn(floating, 'getBoundingClientRect');

    api.update();
    api.update();
    api.update();
    api.update();

    await flushFrame();

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('滚动与视口变化都会触发重新测量', async () => {
    const { api, reference } = setup();

    await flushFrame();

    stubRect(reference, { x: 400, y: 100, width: 100, height: 40 });
    window.dispatchEvent(new Event('scroll'));
    await flushFrame();

    expect(api.y.value).toBe(140);

    stubRect(reference, { x: 400, y: 200, width: 100, height: 40 });
    window.dispatchEvent(new Event('resize'));
    await flushFrame();

    expect(api.y.value).toBe(240);
  });

  it('祖先滚动容器的 scroll 也能收到（capture 监听）', async () => {
    const { api, reference } = setup();
    const scroller = document.createElement('div');

    document.body.append(scroller);
    await flushFrame();

    stubRect(reference, { x: 400, y: 150, width: 100, height: 40 });
    scroller.dispatchEvent(new Event('scroll'));
    await flushFrame();

    expect(api.y.value).toBe(190);
  });

  it('open=false 时不测量也不响应滚动', async () => {
    const { api, reference } = setup({ open: false });

    await flushFrame();

    expect(api.x.value).toBe(0);

    stubRect(reference, { x: 400, y: 100, width: 100, height: 40 });
    window.dispatchEvent(new Event('scroll'));
    await flushFrame();

    expect(api.y.value).toBe(0);
  });

  it('open 由 false 转 true 后开始测量', async () => {
    const open = ref(false);
    const { api } = setup({ open });

    await flushFrame();

    expect(api.x.value).toBe(0);

    open.value = true;
    await flushFrame();

    expect(api.x.value).toBe(350);
  });

  it('卸载后摘掉监听并取消未执行的帧', async () => {
    const { api, floating } = setup();

    await flushFrame();

    const spy = vi.spyOn(floating, 'getBoundingClientRect');
    const app = apps.pop();

    api.update();
    app?.unmount();

    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('resize'));
    await flushFrame();

    expect(spy).not.toHaveBeenCalled();
  });
});

describe('useFloating 首帧定位', () => {
  it('open 后在 nextTick（绘制前）即提交坐标，不等 rAF，避免浮层先画一帧旧位置再跳', async () => {
    const open = ref(false);
    const { api } = setup({ open });

    await flushFrame();

    open.value = true;
    await nextTick();
    await nextTick();

    expect(api.x.value).toBe(350);
    expect(api.y.value).toBe(340);
  });

  it('重复开合不残留上一次坐标：再次 open 绘制前即重测', async () => {
    const open = ref(false);
    const { api, reference } = setup({ open });

    await flushFrame();

    open.value = true;
    await nextTick();
    await nextTick();

    expect(api.x.value).toBe(350);

    open.value = false;
    await nextTick();

    stubRect(reference, { x: 100, y: 100, width: 100, height: 40 });
    open.value = true;
    await nextTick();
    await nextTick();

    expect(api.x.value).toBe(50);
    expect(api.y.value).toBe(140);
  });
});
