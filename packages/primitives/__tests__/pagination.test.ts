// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  PAGINATION_DEFAULT_BOUNDARY_COUNT,
  PAGINATION_DEFAULT_PAGE_SIZE,
  clampPaginationPage,
  getPaginationItemAttrs,
  getPaginationItems,
  getPaginationPageAttrs,
  getPaginationPageState,
  getPaginationStepAttrs,
  getPaginationStepPage,
  isPaginationCurrentPage,
  resolvePaginationPageCount,
  resolvePaginationPageSize,
} from '../src/pagination';

/** 取出项序列里的页码，省略号用 « » 表示，便于整条断言。 */
function pagesOf(items: ReturnType<typeof getPaginationItems>): string {
  return items
    .map((item) => (item.type === 'page' ? String(item.page) : item.side === 'start' ? '«' : '»'))
    .join(' ');
}

describe('resolvePaginationPageSize', () => {
  it('只接受正有限数，其余回退到 10', () => {
    expect(resolvePaginationPageSize(20)).toBe(20);
    expect(resolvePaginationPageSize(10.9)).toBe(10);
    expect(resolvePaginationPageSize(undefined)).toBe(PAGINATION_DEFAULT_PAGE_SIZE);
    expect(resolvePaginationPageSize(0)).toBe(PAGINATION_DEFAULT_PAGE_SIZE);
    expect(resolvePaginationPageSize(-3)).toBe(PAGINATION_DEFAULT_PAGE_SIZE);
    expect(resolvePaginationPageSize(Number.NaN)).toBe(PAGINATION_DEFAULT_PAGE_SIZE);
    expect(resolvePaginationPageSize(Number.POSITIVE_INFINITY)).toBe(PAGINATION_DEFAULT_PAGE_SIZE);
  });
});

describe('resolvePaginationPageCount', () => {
  it('按总条数与每页条数向上取整', () => {
    expect(resolvePaginationPageCount({ total: 100, pageSize: 10 })).toBe(10);
    expect(resolvePaginationPageCount({ total: 91, pageSize: 10 })).toBe(10);
    expect(resolvePaginationPageCount({ total: 90, pageSize: 10 })).toBe(9);
    expect(resolvePaginationPageCount({ total: 3, pageSize: 10 })).toBe(1);
  });

  it('没有总条数时是 1 页而不是 0 页', () => {
    expect(resolvePaginationPageCount({ total: 0 })).toBe(1);
    expect(resolvePaginationPageCount({})).toBe(1);
  });

  it('非法输入都落到 1 页，不产出 NaN 页数', () => {
    expect(resolvePaginationPageCount({ total: -20, pageSize: 10 })).toBe(1);
    expect(resolvePaginationPageCount({ total: Number.NaN, pageSize: 10 })).toBe(1);
    expect(resolvePaginationPageCount({ total: 100, pageSize: 0 })).toBe(10);
  });

  it('显式 pageCount 优先于 total 换算，用于只回页数的接口', () => {
    expect(resolvePaginationPageCount({ pageCount: 42, total: 100, pageSize: 10 })).toBe(42);
    expect(resolvePaginationPageCount({ pageCount: 42.7 })).toBe(42);
  });

  it('pageCount 为 0 或非法时退回换算，而不是接受一个画不出项的页数', () => {
    expect(resolvePaginationPageCount({ pageCount: 0, total: 55, pageSize: 10 })).toBe(6);
    expect(resolvePaginationPageCount({ pageCount: Number.NaN, total: 55, pageSize: 10 })).toBe(6);
    expect(resolvePaginationPageCount({ pageCount: 0 })).toBe(1);
  });
});

describe('clampPaginationPage', () => {
  it('夹进 [1, pageCount]，小数向下取整', () => {
    expect(clampPaginationPage(3, 10)).toBe(3);
    expect(clampPaginationPage(1, 10)).toBe(1);
    expect(clampPaginationPage(10, 10)).toBe(10);
    expect(clampPaginationPage(0, 10)).toBe(1);
    expect(clampPaginationPage(-5, 10)).toBe(1);
    expect(clampPaginationPage(99, 10)).toBe(10);
    // 第 2.6 页是「第 2 页翻过去一小半」，报成第 3 页会跳到没看完的数据上。
    expect(clampPaginationPage(2.6, 10)).toBe(2);
  });

  it('不可用的页码是第 1 页', () => {
    expect(clampPaginationPage(undefined, 10)).toBe(1);
    expect(clampPaginationPage(Number.NaN, 10)).toBe(1);
    expect(clampPaginationPage(Number.POSITIVE_INFINITY, 10)).toBe(1);
  });
});

describe('getPaginationItems', () => {
  it('页数装得下就全展开，一个省略号都不出', () => {
    // 预算 = 首尾 1 + 1 + 中间窗口 1 + 两侧兄弟 2 + 两个省略号位 = 7。
    expect(pagesOf(getPaginationItems({ pageCount: 7, current: 4 }))).toBe('1 2 3 4 5 6 7');
    expect(pagesOf(getPaginationItems({ pageCount: 1, current: 1 }))).toBe('1');
  });

  it('刚好超界时仍然全展开，不为一个页码付出两个省略号', () => {
    // 8 页若走窗口分支会得到「1 2 3 4 » 8」，比全展开更长，属于净损失。
    expect(pagesOf(getPaginationItems({ pageCount: 8, current: 1, siblingCount: 2 }))).toBe(
      '1 2 3 4 5 6 7 8'
    );
  });

  it('窗口贴边：首页与末页各只出现一个省略号', () => {
    const items = getPaginationItems({ pageCount: 10, current: 1 });

    expect(pagesOf(items)).toBe('1 2 3 4 » 10');

    const last = getPaginationItems({ pageCount: 10, current: 10 });

    expect(pagesOf(last)).toBe('1 « 7 8 9 10');
  });

  it('窗口居中：两端各一个省略号', () => {
    expect(pagesOf(getPaginationItems({ pageCount: 10, current: 5 }))).toBe('1 « 4 5 6 » 10');
    expect(pagesOf(getPaginationItems({ pageCount: 10, current: 6 }))).toBe('1 « 5 6 7 » 10');
  });

  it('中间窗口平移而不缩窄，翻页时按钮数量不抖动', () => {
    for (let current = 1; current <= 10; current += 1) {
      const items = getPaginationItems({ pageCount: 20, current, siblingCount: 2 });
      const pages = items.filter((item) => item.type === 'page');

      // 首尾 2 页 + 中间窗口 5 页，只在贴边时少掉一个省略号位。
      expect(items.length).toBeGreaterThanOrEqual(7);
      expect(items.length).toBeLessThanOrEqual(9);
      expect(pages.some((item) => item.type === 'page' && item.page === current)).toBe(true);
    }
  });

  it('只空出一页时补出那一页，而不是用省略号盖掉', () => {
    expect(pagesOf(getPaginationItems({ pageCount: 10, current: 4 }))).toBe('1 2 3 4 5 » 10');
    expect(pagesOf(getPaginationItems({ pageCount: 10, current: 7 }))).toBe('1 « 6 7 8 9 10');
  });

  it('兄弟数为 0 时中间只剩当前页', () => {
    expect(pagesOf(getPaginationItems({ pageCount: 10, current: 5, siblingCount: 0 }))).toBe(
      '1 « 5 » 10'
    );
  });

  it('首尾钉住数为 0 时不出现边界页，省略号落到末端', () => {
    expect(pagesOf(getPaginationItems({ pageCount: 10, current: 5, boundaryCount: 0 }))).toBe(
      '« 4 5 6 »'
    );
  });

  it('非法的窗口参数回退到默认值', () => {
    for (const invalid of [-1, Number.NaN, Number.POSITIVE_INFINITY, undefined]) {
      expect(pagesOf(getPaginationItems({ pageCount: 10, current: 5, siblingCount: invalid }))).toBe(
        '1 « 4 5 6 » 10'
      );
      expect(
        pagesOf(getPaginationItems({ pageCount: 10, current: 5, boundaryCount: invalid }))
      ).toBe('1 « 4 5 6 » 10');
    }

    expect(PAGINATION_DEFAULT_BOUNDARY_COUNT).toBe(1);
  });

  it('窗口参数的小数向下取整，0.5 页兄弟就是没有兄弟', () => {
    expect(pagesOf(getPaginationItems({ pageCount: 10, current: 5, siblingCount: 0.5 }))).toBe(
      '1 « 5 » 10'
    );
    expect(pagesOf(getPaginationItems({ pageCount: 10, current: 5, boundaryCount: 1.9 }))).toBe(
      '1 « 4 5 6 » 10'
    );
  });

  it('越界的当前页被夹进来，页码条里不会出现不存在的页', () => {
    const items = getPaginationItems({ total: 50, pageSize: 10, current: 99 });

    expect(pagesOf(items)).toBe('1 2 3 4 5');
    expect(items.some((item) => item.type === 'page' && item.page > 5)).toBe(false);
  });

  it('每一项都带稳定键，且整条不重复', () => {
    for (let current = 1; current <= 20; current += 1) {
      const keys = getPaginationItems({ pageCount: 20, current }).map((item) => item.key);

      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it('两个省略号靠 side 区分，键不会互相顶掉', () => {
    const items = getPaginationItems({ pageCount: 20, current: 10 });

    expect(items.filter((item) => item.type === 'ellipsis').map((item) => item.key)).toEqual([
      'ellipsis-start',
      'ellipsis-end',
    ]);
  });
});

describe('getPaginationStepPage', () => {
  it('给出相邻页码', () => {
    const config = { total: 100, pageSize: 10, current: 5 };

    expect(getPaginationStepPage(config, 'previous')).toBe(4);
    expect(getPaginationStepPage(config, 'next')).toBe(6);
  });

  it('首尾之外不回绕，返回 null', () => {
    expect(getPaginationStepPage({ pageCount: 10, current: 1 }, 'previous')).toBeNull();
    expect(getPaginationStepPage({ pageCount: 10, current: 10 }, 'next')).toBeNull();
    // 只有一页时两头都走不了。
    expect(getPaginationStepPage({ total: 3, pageSize: 10 }, 'next')).toBeNull();
  });

  it('越界当前页先夹取，所以第 99 页的「上一个」是最后一页的前一页', () => {
    expect(getPaginationStepPage({ pageCount: 5, current: 99 }, 'previous')).toBe(4);
    expect(getPaginationStepPage({ pageCount: 5, current: 99 }, 'next')).toBeNull();
  });

  it('不看 disabled：禁用是上层的判断，这里只回答目标页存不存在', () => {
    expect(getPaginationStepPage({ pageCount: 10, current: 5, disabled: true }, 'next')).toBe(6);
  });
});

describe('isPaginationCurrentPage 与 getPaginationPageState', () => {
  it('按夹取后的当前页判定', () => {
    const config = { total: 50, pageSize: 10, current: 99 };

    expect(isPaginationCurrentPage(5, config)).toBe(true);
    expect(getPaginationPageState(5, config)).toBe('active');
    expect(getPaginationPageState(1, config)).toBe('inactive');
  });
});

describe('getPaginationPageAttrs', () => {
  it('当前页输出 aria-current 与 active', () => {
    expect(getPaginationPageAttrs(3, { pageCount: 10, current: 3 })).toEqual({
      'aria-current': 'page',
      'data-state': 'active',
    });
  });

  it('非当前页不输出 aria-current，而不是输出 false', () => {
    const attrs = getPaginationPageAttrs(4, { pageCount: 10, current: 3 });

    expect(attrs['aria-current']).toBeUndefined();
    expect(attrs['data-state']).toBe('inactive');
  });

  it('整条禁用不改变当前页归属', () => {
    expect(getPaginationPageAttrs(3, { pageCount: 10, current: 3, disabled: true })).toEqual({
      'aria-current': 'page',
      'data-state': 'active',
    });
  });
});

describe('getPaginationStepAttrs', () => {
  it('走到边界即禁用，与显式禁用同一个结论', () => {
    expect(getPaginationStepAttrs('previous', { pageCount: 10, current: 1 })).toEqual({
      disabled: true,
      'data-disabled': '',
    });
    expect(getPaginationStepAttrs('next', { pageCount: 10, current: 10 })).toEqual({
      disabled: true,
      'data-disabled': '',
    });
  });

  it('显式禁用连中间步一起按停', () => {
    expect(getPaginationStepAttrs('next', { pageCount: 10, current: 5, disabled: true })).toEqual({
      disabled: true,
      'data-disabled': '',
    });
  });

  it('可走时两个属性都不输出', () => {
    expect(getPaginationStepAttrs('next', { pageCount: 10, current: 5 })).toEqual({});
  });
});

describe('getPaginationItemAttrs', () => {
  it('只有整条禁用才产出 disabled 与 data-disabled', () => {
    expect(getPaginationItemAttrs({ disabled: true })).toEqual({
      disabled: true,
      'data-disabled': '',
    });
    expect(getPaginationItemAttrs({ disabled: false })).toEqual({});
    expect(getPaginationItemAttrs({})).toEqual({});
  });
});
