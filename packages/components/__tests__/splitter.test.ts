import { createApp, defineComponent, h, nextTick, ref } from 'vue';

import { compile } from 'sass';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { dirname, join } from 'node:path';

import { fileURLToPath } from 'node:url';

import { Splitter, SplitterPanel } from '../src/splitter';

import type { App } from 'vue';

const apps: App[] = [];

/** 一个成品面板在测试里的声明。 */
interface PanelOption {
  size?: number | string;
  defaultSize?: number | string;
  min?: number | string;
  max?: number | string;
  collapsible?: boolean | { start?: boolean; end?: boolean; showIcon?: boolean };
  label?: string;
}

interface SplitterOption {
  layout?: 'horizontal' | 'vertical';
  dir?: 'ltr' | 'rtl';
  barSize?: number;
  resizeStep?: number;
  lazy?: boolean;
  disabled?: boolean;
  as?: string;
  onResize?: (sizes: number[]) => void;
  onResizeEnd?: (sizes: number[]) => void;
  onCollapse?: (collapsed: boolean[], sizes: number[]) => void;
  onDraggerDoubleClick?: (index: number) => void;
}

function mount(node: () => ReturnType<typeof h>): HTMLElement {
  const host = document.createElement('div');

  document.body.append(host);

  const app = createApp(defineComponent({ setup: () => node }));

  app.mount(host);
  apps.push(app);

  return host;
}

/**
 * 搭出一棵成品 Splitter 并等分隔条补出来。
 *
 * 分隔条要等后一个面板登记完才画得出，首帧少一条，因此挂载后必须多等一拍再断言。
 *
 * @param panels 面板声明。
 * @param options 根声明。
 * @returns 宿主元素。
 */
async function splitter(panels: PanelOption[], options: SplitterOption = {}): Promise<HTMLElement> {
  const host = mount(() =>
    h(
      Splitter,
      options,
      // 面板默认插槽带出内容，同时借作用域参数验证成品层把 scope 转发了出去。
      () =>
        panels.map(({ label, ...panelProps }) =>
          h(SplitterPanel, panelProps, {
            default: (scope: { collapsed: boolean; index: number; size: number | null }) =>
              h('span', { 'data-part': 'body' }, [
                `${label ?? ''}|${scope.index}|${scope.collapsed}|${scope.size}`,
              ]),
          })
        )
    )
  );

  await nextTick();

  return host;
}

function queryAll<T extends Element>(host: HTMLElement, selector: string): T[] {
  return Array.from(host.querySelectorAll<T>(selector));
}

function root(host: HTMLElement): HTMLElement | null {
  return host.querySelector<HTMLElement>('.y-splitter');
}

function panels(host: HTMLElement): HTMLElement[] {
  return queryAll<HTMLElement>(host, '.y-splitter__panel');
}

function bars(host: HTMLElement): HTMLElement[] {
  return queryAll<HTMLElement>(host, "[data-part='bar']");
}

function arrows(host: HTMLElement): HTMLElement[] {
  return queryAll<HTMLElement>(host, "[data-part='bar-control']");
}

function basis(host: HTMLElement, index: number): string {
  return panels(host)[index]?.style.flexBasis ?? '';
}

async function dragBar(host: HTMLElement, from: number, to: number): Promise<void> {
  const bar = bars(host)[0];

  if (!bar) throw new Error('未找到分隔条');

  bar.dispatchEvent(
    new MouseEvent('pointerdown', { clientX: from, button: 0, bubbles: true, cancelable: true })
  );
  await nextTick();
  window.dispatchEvent(new MouseEvent('pointermove', { clientX: to }));
  await nextTick();
  window.dispatchEvent(new MouseEvent('pointerup'));
  await nextTick();
}

beforeEach(() => {
  // jsdom 无布局，可用空间全来自这两个读数。
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(800);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(400);
});

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount();

  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('成品 Splitter 的部件结构', () => {
  it('根与面板带命名空间类，分隔条以 data-part 作钩子', async () => {
    const host = await splitter([{ label: 'A' }, { label: 'B' }]);

    expect(root(host)).not.toBeNull();
    expect(panels(host)).toHaveLength(2);
    expect(bars(host)).toHaveLength(1);
    expect(bars(host)[0]?.className).toBe('');
    expect(host.textContent).toContain('A|0|false|396');
    expect(host.textContent).toContain('B|1|false|396');
  });

  it('最后一个面板后面不补分隔条', async () => {
    const host = await splitter([{ label: 'A' }, { label: 'B' }, { label: 'C' }]);

    expect(panels(host)).toHaveLength(3);
    expect(bars(host)).toHaveLength(2);
  });

  it('根属性透传到部件：排列、占位、朝向与禁用', async () => {
    const host = await splitter([{ label: 'A' }, { label: 'B' }], {
      layout: 'vertical',
      dir: 'rtl',
      barSize: 20,
      disabled: true,
      as: 'section',
    });

    const rootElement = root(host);

    expect(rootElement?.tagName).toBe('SECTION');
    expect(rootElement?.getAttribute('data-layout')).toBe('vertical');
    expect(rootElement?.getAttribute('dir')).toBe('rtl');
    expect(rootElement?.hasAttribute('data-disabled')).toBe(true);
    // barSize 同时是几何扣减与分隔条占位，两处必须同一个数。
    expect(bars(host)[0]?.style.flexBasis).toBe('20px');
    expect(basis(host, 0)).toBe('190px');
  });

  it('尺寸与折叠声明落在各自面板上', async () => {
    const host = await splitter([
      { defaultSize: 200, min: 100, collapsible: true },
      { size: '25%', collapsible: true },
    ]);

    // 可用 792：面板 0 定宽 200，面板 1 取 25% = 198，两者都不自适应。
    expect([basis(host, 0), basis(host, 1)]).toEqual(['200px', '198px']);
    expect(arrows(host).map((arrow) => arrow.getAttribute('data-edge'))).toEqual(['end', 'start']);
  });
});

describe('成品 Splitter 的交互', () => {
  it('拖拽分隔条改写两侧面板并回报事件', async () => {
    const onResize = vi.fn();
    const onResizeEnd = vi.fn();
    const host = await splitter([{ label: 'A' }, { label: 'B' }], { onResize, onResizeEnd });

    await dragBar(host, 400, 470);

    expect(onResize).toHaveBeenCalledWith([466, 326]);
    expect(onResizeEnd).toHaveBeenCalledWith([466, 326]);
    expect([basis(host, 0), basis(host, 1)]).toEqual(['466px', '326px']);
    expect(host.textContent).toContain('A|0|false|466');
  });

  it('lazy 拖拽期间只平移分隔条', async () => {
    const onResize = vi.fn();
    const host = await splitter([{ label: 'A' }, { label: 'B' }], { lazy: true, onResize });
    const bar = bars(host)[0];

    if (!bar) throw new Error('未找到分隔条');

    bar.dispatchEvent(
      new MouseEvent('pointerdown', { clientX: 400, button: 0, bubbles: true, cancelable: true })
    );
    await nextTick();
    window.dispatchEvent(new MouseEvent('pointermove', { clientX: 460 }));
    await nextTick();

    expect(bar.style.transform).toBe('translateX(60px)');
    expect(basis(host, 0)).toBe('396px');
    expect(onResize).not.toHaveBeenCalled();

    window.dispatchEvent(new MouseEvent('pointerup'));
    await nextTick();

    expect(bar.style.transform).toBe('');
    expect(basis(host, 0)).toBe('456px');
  });

  it('点箭头收起面板，面板内容随折叠态更新', async () => {
    const onCollapse = vi.fn();
    const host = await splitter([{ collapsible: { end: true } }, {}], { onCollapse });
    const arrow = arrows(host)[0];

    if (!arrow) throw new Error('未找到折叠箭头');

    arrow.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await nextTick();

    expect(onCollapse).toHaveBeenCalledWith([true, false], [0, 792]);
    expect(basis(host, 0)).toBe('0px');
    expect(panels(host)[0]?.hasAttribute('data-collapsed')).toBe(true);
    expect(host.textContent).toContain('|0|true|0');

    arrows(host)[0]?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await nextTick();

    expect(basis(host, 0)).toBe('396px');
  });

  it('v-model:size 由面板回写，作者写回才生效', async () => {
    const size = ref<number | string | undefined>(300);
    const updates: (number | string)[] = [];
    const host = mount(() =>
      h(Splitter, {}, () => [
        h(
          SplitterPanel,
          {
            size: size.value,
            'onUpdate:size': (next: number | string) => updates.push(next),
          },
          {}
        ),
        h(SplitterPanel, {}, {}),
      ])
    );

    await nextTick();

    expect(basis(host, 0)).toBe('300px');

    await dragBar(host, 400, 450);

    expect(updates[0]).toBe(350);
    expect(basis(host, 0)).toBe('300px');

    size.value = 350;
    await nextTick();

    expect(basis(host, 0)).toBe('350px');
  });

  it('双击分隔条复位并上报下标', async () => {
    const onDraggerDoubleClick = vi.fn();
    const host = await splitter([{ defaultSize: 200 }, {}], { onDraggerDoubleClick });

    await dragBar(host, 400, 500);

    expect([basis(host, 0), basis(host, 1)]).toEqual(['300px', '492px']);

    bars(host)[0]?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await nextTick();

    expect([basis(host, 0), basis(host, 1)]).toEqual(['200px', '592px']);
    expect(onDraggerDoubleClick).toHaveBeenCalledWith(0);
  });
});

/**
 * 样式落点的回归。
 *
 * 断的是编译后的 CSS 而不是 computed style：jsdom 不解析 var()，读到的空串分不清「没写」
 * 与「写了但取不到值」。选择器按 Dart Sass 的展开输出书写：属性值不带引号。
 */
describe('成品 Splitter 的样式', () => {
  // Vite 会把 new URL('...', import.meta.url) 编译成 dev-server 地址，先反解目录再拼接。
  const splitterScss = join(
    dirname(fileURLToPath(import.meta.url)),
    '..',
    'src',
    'splitter',
    'Splitter.scss'
  );

  const css = String(compile(splitterScss).css);

  const BAR = '[data-part=bar]';
  const CONTROL = '[data-part=bar-control]';
  const ICON = '[data-part=bar-icon]';
  const ROTATE = '--y-splitter-arrow-rotate';

  /**
   * 取某条规则的声明体。
   *
   * @param selector 选择器本体，与编译结果一致且在文中唯一。
   * @returns 大括号之间的声明文本。
   */
  function ruleBody(selector: string): string {
    const start = css.indexOf(`${selector} {`);

    expect(start, `编译结果里找不到 ${selector} 规则`).toBeGreaterThan(-1);

    return css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start));
  }

  /** 同一选择器可能拆成多块（组件变量块与基础块），逐块取出后由用例各自筛。 */
  function allRuleBodies(selector: string): string[] {
    const needle = `${selector} {`;
    const bodies: string[] = [];
    let start = css.indexOf(needle);

    while (start >= 0) {
      const end = css.indexOf('}', start);

      bodies.push(css.slice(needle.length + start, end));
      start = css.indexOf(needle, end + 1);
    }

    return bodies;
  }

  function declaration(block: string, name: string): string {
    const matched = new RegExp(`(?:^|;)\\s*${name}:\\s*([^;]+);`).exec(block);

    return matched ? matched[1].trim().replace(/\s+/g, ' ') : '';
  }

  it('根上没有内距，测量才不会算少', () => {
    // 根用 clientWidth / clientHeight 测量，内距含在其中：根一旦加内距，面板总和就会
    // 超出内容盒，末段被 overflow 裁掉一条。
    const bodies = allRuleBodies('.y-splitter');

    expect(bodies.length).toBeGreaterThan(1);

    for (const body of bodies) {
      expect(declaration(body, 'padding')).toBe('');
    }

    expect(declaration(bodies[1] ?? '', 'overflow')).toBe('hidden');
  });

  it('排列轴由 data-layout 驱动，作者不必写 flex-direction', () => {
    expect(declaration(ruleBody('.y-splitter[data-layout=horizontal]'), 'flex-direction')).toBe(
      'row'
    );
    expect(declaration(ruleBody('.y-splitter[data-layout=vertical]'), 'flex-direction')).toBe(
      'column'
    );
    expect(declaration(ruleBody('.y-splitter[dir=rtl]'), 'direction')).toBe('rtl');
  });

  it('折叠面板把内距一起收掉，overflow 转为裁切', () => {
    const body = ruleBody('.y-splitter__panel[data-collapsed]');

    expect(declaration(body, 'padding')).toBe('0');
    expect(declaration(body, 'overflow')).toBe('hidden');
    // 内容必须能把面板压到任意小，否则 flex 项不肯收缩到 min 以下。
    expect(declaration(ruleBody('.y-splitter__panel'), 'min-width')).toBe('0');
    expect(declaration(ruleBody('.y-splitter__panel'), 'padding')).toBe(
      'var(--y-splitter-padding)'
    );
  });

  it('分隔条的厚度只由 barSize 决定，箭头不参与撑开', () => {
    const body = ruleBody(`.y-splitter ${BAR}`);

    // flex 项的自动最小尺寸等于 min-content，箭头一进来就会把条顶到 control-size：
    // 无头层按 barSize 扣的那几个像素就此变成欠账，末段面板被根的 overflow 裁掉一条。
    expect(declaration(body, 'min-width')).toBe('0');
    expect(declaration(body, 'min-height')).toBe('0');
    expect(declaration(body, 'flex')).toBe('none');

    // 两个箭头沿分隔条的长轴排布：挤在短轴上会互相压掉命中区，也会把条撑宽。
    expect(
      declaration(ruleBody(`.y-splitter ${BAR}[data-layout=horizontal]`), 'flex-direction')
    ).toBe('column');
    expect(
      declaration(ruleBody(`.y-splitter ${BAR}[data-layout=vertical]`), 'flex-direction')
    ).toBe('row');
  });

  it('分隔线只钉住排列方向的厚度，另一轴自动拉满', () => {
    const horizontal = ruleBody(`.y-splitter ${BAR}[data-layout=horizontal]::before`);

    expect(declaration(horizontal, 'width')).toBe('var(--y-splitter-line-size)');
    expect(declaration(horizontal, 'height')).toBe('');
    // inset: 0 + margin: auto 让垂直于排列的那一轴自动拉满，不必按 barSize 算位移。
    expect(declaration(horizontal, 'margin')).toBe('auto');
    expect(declaration(horizontal, 'inset')).toBe('0');

    const vertical = ruleBody(`.y-splitter ${BAR}[data-layout=vertical]::before`);

    expect(declaration(vertical, 'height')).toBe('var(--y-splitter-line-size)');
    expect(declaration(vertical, 'width')).toBe('');
  });

  it('拖拽中与悬停共用高亮，禁用时不响应指针', () => {
    const resizing = ruleBody(`.y-splitter ${BAR}[data-resizing]:not([data-disabled])::before`);

    expect(declaration(resizing, 'background')).toBe('var(--y-splitter-line-bg-active)');
    expect(declaration(ruleBody(`.y-splitter ${BAR}[data-disabled]`), 'cursor')).toBe('default');
    expect(declaration(ruleBody(`.y-splitter ${BAR}`), 'touch-action')).toBe('none');
    expect(
      declaration(
        ruleBody(`.y-splitter ${BAR}[data-layout=horizontal]:not([data-disabled])`),
        'cursor'
      )
    ).toBe('col-resize');
  });

  it('箭头默认淡出且撤掉命中，悬停、聚焦或常驻才可用', () => {
    const control = ruleBody(`.y-splitter ${BAR} ${CONTROL}`);

    expect(declaration(control, 'opacity')).toBe('0');
    expect(declaration(control, 'pointer-events')).toBe('none');

    const reveal = ruleBody(`.y-splitter ${BAR} ${CONTROL}[data-always]`);

    // 淡出必须连带撤掉点击，否则分隔条上埋着两个隐形的命中区。
    expect(declaration(reveal, 'opacity')).toBe('1');
    expect(declaration(reveal, 'pointer-events')).toBe('auto');

    const list = css.slice(
      css.indexOf(`.y-splitter ${BAR}:hover ${CONTROL},`),
      css.indexOf('{', css.indexOf(`.y-splitter ${BAR}:hover ${CONTROL},`))
    );

    // 悬停与聚焦共用同一条揭示规则：指针短暂移开时箭头不该闪断。
    expect(list).toContain(':focus-within');
    expect(list).toContain('[data-always]');
  });

  it('箭头指向由朝向、归属边与折叠态决定', () => {
    expect(
      declaration(ruleBody(`.y-splitter ${BAR}[data-layout=horizontal] ${CONTROL}`), ROTATE)
    ).toBe('-45deg');
    expect(
      declaration(ruleBody(`.y-splitter ${BAR}[data-layout=vertical] ${CONTROL}`), ROTATE)
    ).toBe('45deg');
    expect(
      declaration(
        ruleBody(
          `.y-splitter ${BAR}[data-layout=horizontal] ${CONTROL}[data-edge=start][data-collapsed]`
        ),
        ROTATE
      )
    ).toBe('135deg');
    expect(
      declaration(
        ruleBody(
          `.y-splitter ${BAR}[data-layout=vertical] ${CONTROL}[data-edge=start][data-collapsed]`
        ),
        ROTATE
      )
    ).toBe('-135deg');
    // 图形本身不认状态：角度经变量注入，缺省值与横向未折叠时一致。
    expect(declaration(ruleBody(`.y-splitter ${CONTROL} ${ICON}`), 'transform')).toBe(
      'rotate(var(--y-splitter-arrow-rotate, -45deg))'
    );
    // RTL 只镜像左右，四个角度不必各写一套。
    expect(
      declaration(
        ruleBody(`.y-splitter [dir=rtl] ${BAR}[data-layout=horizontal] ${CONTROL} ${ICON}`),
        'scale'
      )
    ).toBe('-1 1');
  });

  it('分隔条不可用与整组禁用时箭头让位', () => {
    expect(declaration(ruleBody(`.y-splitter ${BAR}[data-disabled] ${CONTROL}`), 'display')).toBe(
      'none'
    );
    expect(declaration(ruleBody(`.y-splitter[data-disabled] ${CONTROL}`), 'display')).toBe('none');
  });

  it('减少动效时关掉分隔条与箭头的过渡', () => {
    const motion =
      /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\[data-part=bar-icon\] \{\n\s*transition: none;/.exec(
        css
      );

    expect(motion, '找不到减少动效分支里的箭头过渡').not.toBeNull();
  });
});
