import { createApp, defineComponent, h, nextTick, ref } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  PaginationEllipsis,
  PaginationJumper,
  PaginationList,
  PaginationNext,
  PaginationPage,
  PaginationPrev,
  PaginationRoot,
} from '../src/pagination';

import type { App, VNode } from 'vue';
import type { PaginationRootSlotProps } from '../src/pagination/types';

const apps: App[] = [];

/** 真实挂载后断言 DOM：aria-current 与 disabled 在 SSR 字符串里看不到。 */
function mount(render: () => VNode): HTMLElement {
  const host = document.createElement('div');

  document.body.append(host);

  const app = createApp(defineComponent({ setup: () => render }));

  app.mount(host);
  apps.push(app);

  return host;
}

function pages(): HTMLButtonElement[] {
  return Array.from(document.querySelectorAll<HTMLButtonElement>('[data-part="page"]'));
}

function step(part: string): HTMLButtonElement | null {
  return document.querySelector<HTMLButtonElement>(`[data-part="${part}"]`);
}

interface MountOptions {
  props?: Record<string, unknown>;
  /** 是否装配前后翻页按钮；默认只渲染页码窗口 */
  withSteps?: boolean;
  /** 是否装配页码快速跳转 */
  withJumper?: boolean;
  /** 跳转部件的属性，用于换文案 */
  jumperProps?: Record<string, unknown>;
}

/**
 * 标准装配：Root + List + 逐项分发 primitives 算出的页码项。
 *
 * 这段 v-for 就是文档示例的形状——页码项由消费者分发，测试同时在保护这个用法本身。
 * 翻页按钮与跳转框也在 List 内：部件渲染成 `li`，而 `li` 的直接父级必须是列表元素。
 */
function mountPagination({
  props = {},
  withSteps = false,
  withJumper = false,
  jumperProps = {},
}: MountOptions = {}) {
  return mount(() =>
    h(PaginationRoot, props, {
      default: (scope: PaginationRootSlotProps) =>
        h(PaginationList, null, {
          default: () => [
            withSteps ? h(PaginationPrev) : null,
            ...scope.items.map((item) =>
              item.type === 'page'
                ? h(PaginationPage, { page: item.page, key: item.key })
                : h(PaginationEllipsis, { side: item.side, key: item.key })
            ),
            withSteps ? h(PaginationNext) : null,
            withJumper ? h(PaginationJumper, jumperProps) : null,
          ],
        }),
    })
  );
}

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount();

  document.body.innerHTML = '';
});

describe('Pagination 结构与 ARIA', () => {
  it('Root 是带 aria-label 的 nav 地标，默认可读作「分页」', () => {
    mountPagination();
    expect(document.querySelector('[data-part="root"]')?.tagName).toBe('NAV');
    expect(document.querySelector('nav')?.getAttribute('aria-label')).toBe('分页');
  });

  it('ariaLabel 可换成业务语义，多个分页条才能被阅读器区分', () => {
    mountPagination({ props: { ariaLabel: '文章列表分页' } });
    expect(document.querySelector('nav')?.getAttribute('aria-label')).toBe('文章列表分页');
  });

  it('List 是 ul，页码项是 li 内的 type=button', () => {
    mountPagination({ props: { total: 40 } });

    const list = document.querySelector('[data-part="list"]');

    expect(list?.tagName).toBe('UL');
    expect(pages()).toHaveLength(4);
    for (const button of pages()) {
      expect(button.closest('li')).not.toBeNull();
      expect(button.getAttribute('type')).toBe('button');
    }
  });

  it('部件一律落在 List 内：nav 下不直接挂 li', () => {
    mountPagination({ props: { total: 40 }, withSteps: true, withJumper: true });

    // li 的直接父级必须是列表元素，挂在 nav 下是无效标记；宿主文档按兄弟规则
    // （如 `.vp-doc li + li`）排版时，逃在列表外的翻页件还会和页码错开基线。
    expect(document.querySelectorAll('nav > li')).toHaveLength(0);

    const list = document.querySelector('[data-part="list"]');

    for (const item of document.querySelectorAll<HTMLElement>('[data-part="item"]')) {
      expect(item.parentElement).toBe(list);
    }
  });

  it('当前页 aria-current=page 且 data-state=active，其余 inactive', () => {
    mountPagination({ props: { total: 40 } });

    const [first, second] = pages();

    expect(first?.getAttribute('aria-current')).toBe('page');
    expect(first?.dataset.state).toBe('active');
    expect(second?.getAttribute('aria-current')).toBeNull();
    expect(second?.dataset.state).toBe('inactive');
  });

  it('窗口折叠处出现省略号，span 且 aria-hidden', () => {
    mountPagination({ props: { total: 100 } });

    const ellipsis = document.querySelector<HTMLElement>('[data-part="ellipsis"]');

    // 当前页 1、sibling 1：中间窗口是 2–4，右侧缺口 5 页才折叠成省略号。
    expect(pages().map((button) => button.textContent)).toEqual(['1', '2', '3', '4', '10']);
    expect(ellipsis?.tagName).toBe('SPAN');
    expect(ellipsis?.getAttribute('aria-hidden')).toBe('true');
    expect(ellipsis?.dataset.side).toBe('end');
  });

  it('插槽作用域暴露 items / pageCount / currentPage', () => {
    let scope: PaginationRootSlotProps | undefined;

    mount(() =>
      h(
        PaginationRoot,
        { total: 40 },
        {
          default: (value: PaginationRootSlotProps) => {
            scope = value;

            return scope.items.map((item) =>
              item.type === 'page' ? h(PaginationPage, { page: item.page, key: item.key }) : null
            );
          },
        }
      )
    );

    expect(scope?.pageCount).toBe(4);
    expect(scope?.currentPage).toBe(1);
    expect(scope?.items).toHaveLength(4);
    expect(scope?.items.every((item) => item.key.length > 0)).toBe(true);
  });

  it('无样式层契约：部件不带 class，也不带内联样式', () => {
    mountPagination({ props: { total: 100 }, withSteps: true });

    const elements = [
      ...document.querySelectorAll<HTMLElement>('[data-part]'),
      ...document.querySelectorAll<HTMLElement>('li'),
    ];

    for (const element of elements) {
      expect(element.getAttribute('class')).toBeNull();
      expect(element.getAttribute('style')).toBeNull();
    }
  });
});

describe('Pagination 交互', () => {
  it('点击页码切换当前页并同步 aria-current', async () => {
    mountPagination({ props: { total: 40 } });

    pages()[2]?.click();
    await nextTick();

    expect(pages()[2]?.getAttribute('aria-current')).toBe('page');
    expect(pages()[0]?.getAttribute('aria-current')).toBeNull();
  });

  it('点击上报 update:modelValue', async () => {
    const onUpdate = vi.fn();

    mountPagination({ props: { total: 40, 'onUpdate:modelValue': onUpdate } });

    pages()[1]?.click();
    await nextTick();

    expect(onUpdate).toHaveBeenCalledWith(2);
  });

  it('受控模式下外部值是真源，点击只上报不自行移动', async () => {
    const modelValue = ref(2);
    const onUpdate = vi.fn();

    // prop 必须在 render 闭包里读 .value：把 Ref 对象本身当 prop 传进去不会被解包，
    // 组件会拿到一个对象而不是数字，受控判定与比较全部失真。
    mount(() =>
      h(
        PaginationRoot,
        { total: 40, modelValue: modelValue.value, 'onUpdate:modelValue': onUpdate },
        {
          default: (scope: PaginationRootSlotProps) =>
            scope.items.map((item) =>
              item.type === 'page' ? h(PaginationPage, { page: item.page, key: item.key }) : null
            ),
        }
      )
    );

    pages()[2]?.click();
    await nextTick();

    expect(onUpdate).toHaveBeenCalledWith(3);
    expect(pages()[1]?.getAttribute('aria-current')).toBe('page');
    expect(pages()[2]?.getAttribute('aria-current')).toBeNull();
  });

  it('Prev/Next 有可读名称，点击翻页', async () => {
    mountPagination({ props: { total: 40 }, withSteps: true });

    expect(step('previous')?.getAttribute('aria-label')).toBe('上一页');
    expect(step('next')?.getAttribute('aria-label')).toBe('下一页');

    step('next')?.click();
    await nextTick();

    expect(pages()[1]?.getAttribute('aria-current')).toBe('page');

    step('previous')?.click();
    await nextTick();

    expect(pages()[0]?.getAttribute('aria-current')).toBe('page');
  });

  it('第 1 页时 Prev 禁用，末页时 Next 禁用', async () => {
    mountPagination({ props: { total: 40 }, withSteps: true });

    expect(step('previous')?.disabled).toBe(true);
    expect(step('next')?.disabled).toBe(false);

    step('next')?.click();
    step('next')?.click();
    step('next')?.click();
    await nextTick();

    expect(step('previous')?.disabled).toBe(false);
    expect(step('next')?.disabled).toBe(true);
  });

  it('Root disabled 时页码与翻页按钮全部禁用，点击不上报', async () => {
    const onUpdate = vi.fn();

    mountPagination({
      props: { total: 40, disabled: true, 'onUpdate:modelValue': onUpdate },
      withSteps: true,
    });

    for (const button of [
      ...pages(),
      step('previous') as HTMLButtonElement,
      step('next') as HTMLButtonElement,
    ]) {
      expect(button.disabled).toBe(true);
    }

    pages()[2]?.click();
    step('next')?.click();
    await nextTick();

    expect(onUpdate).not.toHaveBeenCalled();
    expect(pages()[0]?.getAttribute('aria-current')).toBe('page');
  });
});

describe('Pagination 页码跳转', () => {
  function input(): HTMLInputElement {
    const element = document.querySelector<HTMLInputElement>('[data-part="jumper-input"]');

    if (!element) throw new Error('未渲染出跳转输入框');

    return element;
  }

  /** 走原生 input 事件：v-model 认的是事件，不是直接改 .value。 */
  function type(value: string): void {
    const element = input();

    element.value = value;
    element.dispatchEvent(new Event('input'));
  }

  function pressEnter(): void {
    input().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  }

  function blur(): void {
    input().dispatchEvent(new FocusEvent('blur'));
  }

  /** 窗口只画得下几页，按序号取按钮会在翻页后错位，所以按页码文本找。 */
  function pageByNumber(page: number): HTMLButtonElement | undefined {
    return pages().find((button) => button.textContent === String(page));
  }

  it('渲染前缀、输入框与单位，输入框有独立可访问名与范围', () => {
    mountPagination({ props: { total: 100 }, withJumper: true });

    expect(document.querySelector('[data-part="jumper-label"]')?.textContent).toBe('跳至');
    expect(document.querySelector('[data-part="jumper-suffix"]')?.textContent).toBe('页');
    expect(input().getAttribute('aria-label')).toBe('页码');
    expect(input().getAttribute('type')).toBe('number');
    expect(input().getAttribute('min')).toBe('1');
    expect(input().getAttribute('max')).toBe('10');
  });

  it('三段文案都能换成业务用语，供非中文与自定义措辞使用', () => {
    mountPagination({
      props: { total: 100 },
      withJumper: true,
      jumperProps: { label: '前往', suffix: '页面', ariaLabel: '跳转页码' },
    });

    expect(document.querySelector('[data-part="jumper-label"]')?.textContent).toBe('前往');
    expect(document.querySelector('[data-part="jumper-suffix"]')?.textContent).toBe('页面');
    expect(input().getAttribute('aria-label')).toBe('跳转页码');
  });

  it('前后缀只是装饰，可访问名交给输入框自己', () => {
    mountPagination({ props: { total: 100 }, withJumper: true });

    expect(document.querySelector('[data-part="jumper-label"]')?.getAttribute('aria-hidden')).toBe(
      'true'
    );
    expect(document.querySelector('[data-part="jumper-suffix"]')?.getAttribute('aria-hidden')).toBe(
      'true'
    );
  });

  it('回车提交页码：上报事件并把当前页移过去', async () => {
    const onUpdate = vi.fn();

    mountPagination({ props: { total: 100, 'onUpdate:modelValue': onUpdate }, withJumper: true });

    type('7');
    pressEnter();
    await nextTick();

    expect(onUpdate).toHaveBeenCalledWith(7);
    expect(pageByNumber(7)?.getAttribute('aria-current')).toBe('page');
  });

  it('失焦同样提交，避免「输了数字又点走」静默丢失', async () => {
    const onUpdate = vi.fn();

    mountPagination({ props: { total: 100, 'onUpdate:modelValue': onUpdate }, withJumper: true });

    type('5');
    blur();
    await nextTick();

    expect(onUpdate).toHaveBeenCalledWith(5);
  });

  it('提交后清空输入框，不留一个与当前页可能不同的数字', async () => {
    mountPagination({ props: { total: 100 }, withJumper: true });

    type('99');
    pressEnter();
    await nextTick();

    expect(input().value).toBe('');
  });

  it('越界输入夹到末页，与直接点末页同一个结果', async () => {
    const onUpdate = vi.fn();

    mountPagination({ props: { total: 100, 'onUpdate:modelValue': onUpdate }, withJumper: true });

    type('99');
    pressEnter();
    await nextTick();

    expect(onUpdate).toHaveBeenCalledWith(10);
    expect(pageByNumber(10)?.getAttribute('aria-current')).toBe('page');
  });

  it('非法输入不提交：非数字与空值都保持当前页', async () => {
    const onUpdate = vi.fn();

    mountPagination({ props: { total: 100, 'onUpdate:modelValue': onUpdate }, withJumper: true });

    type('abc');
    pressEnter();
    type('');
    pressEnter();
    await nextTick();

    expect(onUpdate).not.toHaveBeenCalled();
    expect(pages()[0]?.getAttribute('aria-current')).toBe('page');
  });

  it('整条禁用时输入框 disabled 并挂上 data-disabled', () => {
    mountPagination({ props: { total: 100, disabled: true }, withJumper: true });

    expect(input().disabled).toBe(true);
    expect(document.querySelector('[data-part="jumper"]')?.hasAttribute('data-disabled')).toBe(
      true
    );
  });

  it('禁用时直接回车也不改页码：禁用承诺的是页码不会动', async () => {
    const onUpdate = vi.fn();

    mountPagination({
      props: { total: 100, disabled: true, 'onUpdate:modelValue': onUpdate },
      withJumper: true,
    });

    type('5');
    pressEnter();
    await nextTick();

    expect(onUpdate).not.toHaveBeenCalled();
  });
});

describe('Pagination 上下文约束', () => {
  it('五个交互部件脱离 Root 使用时抛错，而不是静默失效', () => {
    // 抛错发生在 setup，Vue 会把它冒泡到 app 级错误处理；这里直接断言挂载过程抛出。
    expect(() => mount(() => h(PaginationPage, { page: 1 }))).toThrow(/pagination/);
    expect(() => mount(() => h(PaginationEllipsis))).toThrow(/pagination/);
    expect(() => mount(() => h(PaginationPrev))).toThrow(/pagination/);
    expect(() => mount(() => h(PaginationNext))).toThrow(/pagination/);
    expect(() => mount(() => h(PaginationJumper))).toThrow(/pagination/);
  });

  it('List 脱离 Root 不抛错：它只承担结构职责，没有任何属性要绑', () => {
    expect(() => mount(() => h(PaginationList))).not.toThrow();
    expect(document.querySelector('[data-part="list"]')?.tagName).toBe('UL');
  });
});
