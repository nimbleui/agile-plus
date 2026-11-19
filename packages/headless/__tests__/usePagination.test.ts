import { createApp, defineComponent, nextTick, ref } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { usePagination } from '../src/usePagination';

import type { App } from 'vue';

import type { UsePaginationOptions, UsePaginationReturn } from '../src/usePagination';

const apps: App[] = [];

/**
 * 在最小应用里跑一次 usePagination。
 *
 * 走 createApp 而不是 effectScope：与其余 useXxx 测试同一入口，封装层的
 * `props 展开 → options → composable` 链路才是真的被跑过一遍。
 */
function setup(options: UsePaginationOptions = {}): UsePaginationReturn {
  let api!: UsePaginationReturn;

  const app = createApp(
    defineComponent({
      setup() {
        api = usePagination(options);

        return () => null;
      },
    })
  );

  app.mount(document.createElement('div'));
  apps.push(app);

  return api;
}

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount();
});

describe('非受控模式', () => {
  it('从第 1 页起步，setValue 写进内部状态', () => {
    const onValueChange = vi.fn();

    const api = setup({ total: 100, pageSize: 10, onValueChange });

    expect(api.currentPage.value).toBe(1);
    expect(api.pageCount.value).toBe(10);

    api.setValue(4);

    expect(api.currentPage.value).toBe(4);
    expect(onValueChange).toHaveBeenCalledWith(4);
  });

  it('defaultValue 决定起点，非法值夹进来', () => {
    expect(setup({ total: 100, defaultValue: 3 }).currentPage.value).toBe(3);
    expect(setup({ total: 100, defaultValue: 0 }).currentPage.value).toBe(1);
    expect(setup({ total: 100, defaultValue: 999 }).currentPage.value).toBe(10);
  });

  it('跳到当前页不产生事件', () => {
    const onValueChange = vi.fn();

    const api = setup({ total: 100, onValueChange });

    api.setValue(1);

    expect(onValueChange).not.toHaveBeenCalled();

    api.setValue(99);

    expect(onValueChange).toHaveBeenCalledWith(10);
  });
});

describe('受控模式', () => {
  it('外部值是唯一真源，setValue 只通知不改内部', () => {
    const modelValue = ref(1);
    const onValueChange = vi.fn();

    const api = setup({ total: 100, modelValue: () => modelValue.value, onValueChange });

    api.setValue(4);

    expect(onValueChange).toHaveBeenCalledWith(4);
    // 调用方没接住这次通知时，页码必须还停在 1：内部偷偷改掉就会和外部值分家。
    expect(api.currentPage.value).toBe(1);

    modelValue.value = 4;

    expect(api.currentPage.value).toBe(4);
  });

  it('undefined 才是「未受控」的判据，0 是受控且被夹到第 1 页', () => {
    const api = setup({ total: 100, modelValue: () => 0 });

    expect(api.currentPage.value).toBe(1);

    api.setValue(5);

    expect(api.currentPage.value).toBe(1);
  });

  it('越界的外部值被夹进最后一页，播报与视觉指向同一页', () => {
    const api = setup({ total: 50, pageSize: 10, modelValue: () => 99 });

    expect(api.currentPage.value).toBe(5);
    expect(api.items.value.some((item) => item.type === 'page' && item.page === 5)).toBe(true);
    expect(api.getPageProps(5)['aria-current']).toBe('page');
    expect(api.getPageProps(1)['aria-current']).toBeUndefined();
  });
});

describe('数据变化后的页数与项序列', () => {
  it('total 缩小时页数与当前页同步收回，不需要额外监听', async () => {
    const total = ref(200);
    const api = setup({ total: () => total.value, pageSize: 10 });

    api.setValue(20);

    total.value = 50;
    await nextTick();

    expect(api.pageCount.value).toBe(5);
    expect(api.currentPage.value).toBe(5);
    expect(api.items.value.map((item) => (item.type === 'page' ? item.page : null))).toEqual([
      1, 2, 3, 4, 5,
    ]);
  });

  it('pageCount 覆盖 total 换算', () => {
    const api = setup({ total: 100, pageSize: 10, pageCount: 3 });

    expect(api.pageCount.value).toBe(3);
    expect(api.items.value).toHaveLength(3);
  });

  it('窗口宽度跟着响应式 props 变化', async () => {
    const siblingCount = ref(1);
    const api = setup({ pageCount: 20, siblingCount: () => siblingCount.value });

    // 首尾各 1 页 + 中间窗口 3 页，右端一个省略号位不算页码。
    expect(api.items.value.filter((item) => item.type === 'page')).toHaveLength(5);

    siblingCount.value = 3;
    await nextTick();

    // 中间窗口扩到 7 页，首尾两页仍在，按钮总数从 5 变成 9。
    expect(api.items.value.filter((item) => item.type === 'page')).toHaveLength(9);
  });
});

describe('step', () => {
  it('两端各走一步，越界静默不动', () => {
    const onValueChange = vi.fn();

    const api = setup({ total: 100, onValueChange });

    api.step('previous');

    expect(onValueChange).not.toHaveBeenCalled();
    expect(api.currentPage.value).toBe(1);

    api.step('next');

    expect(api.currentPage.value).toBe(2);
  });

  it('最后一页的 next 不动，也不回绕', () => {
    const onValueChange = vi.fn();

    const api = setup({ total: 100, defaultValue: 10, onValueChange });

    api.step('next');

    expect(onValueChange).not.toHaveBeenCalled();
    expect(api.currentPage.value).toBe(10);
  });
});

describe('disabled', () => {
  it('禁用时写入与步进都被吞掉，不发事件', () => {
    const onValueChange = vi.fn();

    const api = setup({ total: 100, onValueChange, disabled: () => true });

    api.setValue(4);
    api.step('next');

    expect(onValueChange).not.toHaveBeenCalled();
    expect(api.currentPage.value).toBe(1);
  });

  it('属性表里页码与前后退按钮一起变成不可点', () => {
    const api = setup({ total: 100, defaultValue: 5, disabled: () => true });

    expect(api.getPageProps(5)).toEqual({
      'aria-current': 'page',
      'data-state': 'active',
      disabled: true,
      'data-disabled': '',
    });
    expect(api.getStepProps('previous')).toEqual({ disabled: true, 'data-disabled': '' });
  });

  it('放开后同一份属性表立刻回到可用', async () => {
    const disabled = ref(true);
    const api = setup({ total: 100, defaultValue: 5, disabled: () => disabled.value });

    disabled.value = false;
    await nextTick();

    expect(api.getPageProps(4)).toEqual({ 'data-state': 'inactive' });
    expect(api.getStepProps('previous')).toEqual({});
  });

  it('disabled 单独可读：非按钮部件（跳转输入框）拿不到属性表', async () => {
    const disabled = ref(false);
    const api = setup({ total: 100, disabled: () => disabled.value });

    expect(api.disabled.value).toBe(false);

    disabled.value = true;
    await nextTick();

    expect(api.disabled.value).toBe(true);
  });
});

describe('属性表', () => {
  it('前进后退在首尾页上被标成 disabled，中段可用', () => {
    const api = setup({ total: 100, defaultValue: 5 });

    expect(api.getStepProps('previous')).toEqual({});
    expect(api.getStepProps('next')).toEqual({});
  });

  it('只有一页时两头都按不动', () => {
    const api = setup({ total: 3 });

    expect(api.getStepProps('previous')).toEqual({ disabled: true, 'data-disabled': '' });
    expect(api.getStepProps('next')).toEqual({ disabled: true, 'data-disabled': '' });
  });

  it('项序列里的 key 唯一，可以直接当 v-for 的键', () => {
    const api = setup({ pageCount: 30, defaultValue: 15 });

    const keys = api.items.value.map((item) => item.key);

    expect(new Set(keys).size).toBe(keys.length);
  });
});
