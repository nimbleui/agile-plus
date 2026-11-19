// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  TABLE_DEFAULT_ROW_KEY,
  TABLE_EXPANDED_KEY_SUFFIX,
  compareTableCellValues,
  getTableBodyRows,
  getTableCellAttrs,
  getTableColSpan,
  getTableExpandTriggerAttrs,
  getTableFixedOffsets,
  getTableHeadAttrs,
  getTableRowAttrs,
  getTableSelectionState,
  getTableSortTriggerAttrs,
  getTableTotalWidth,
  getNextTableSortState,
  hasTableFixedColumns,
  resolveTableCssSize,
  resolveTableLayout,
  resolveTableRowKey,
  resolveTableCellSpan,
  sortTableRows,
  toggleTableAllKeys,
  toggleTableKey,
} from '../src/table';

import type { TableColumn, TableRowData, TableSortState } from '../src/table';

const rows: TableRowData[] = [
  { key: 'a', name: 'banana', age: 30 },
  { key: 'b', name: 'apple', age: 25 },
  { key: 'c', name: 'cherry', age: 30 },
];

const columns: TableColumn[] = [
  { key: 'name', sortable: true },
  { key: 'age', sortable: true },
  { key: 'note' },
];

describe('getNextTableSortState', () => {
  it('新列从升序开始', () => {
    expect(getNextTableSortState(null, 'name')).toEqual({ key: 'name', order: 'asc' });
    expect(getNextTableSortState({ key: 'age', order: 'desc' }, 'name')).toEqual({
      key: 'name',
      order: 'asc',
    });
  });

  it('同一列按 升序 → 降序 → 取消 循环', () => {
    const asc = getNextTableSortState(null, 'name');
    const desc = getNextTableSortState(asc, 'name');
    const none = getNextTableSortState(desc, 'name');

    expect(asc).toEqual({ key: 'name', order: 'asc' });
    expect(desc).toEqual({ key: 'name', order: 'desc' });
    expect(none).toBeNull();
    expect(getNextTableSortState(none, 'name')).toEqual({ key: 'name', order: 'asc' });
  });
});

describe('compareTableCellValues', () => {
  it('数字按数值比而不是字典序', () => {
    expect(compareTableCellValues(9, 10)).toBeLessThan(0);
    expect(compareTableCellValues(10, 9)).toBeGreaterThan(0);
    expect(compareTableCellValues(3, 3)).toBe(0);
  });

  it('字符串按字典序比', () => {
    expect(compareTableCellValues('apple', 'banana')).toBeLessThan(0);
    expect(compareTableCellValues('banana', 'apple')).toBeGreaterThan(0);
    expect(compareTableCellValues('same', 'same')).toBe(0);
  });

  it('空值恒排最后，两个空值相等', () => {
    expect(compareTableCellValues(null, 0)).toBeGreaterThan(0);
    expect(compareTableCellValues(undefined, 'a')).toBeGreaterThan(0);
    expect(compareTableCellValues(Number.NaN, 1)).toBeGreaterThan(0);
    expect(compareTableCellValues(0, null)).toBeLessThan(0);
    expect(compareTableCellValues(null, undefined)).toBe(0);
  });

  it('混合类型转字符串比较', () => {
    expect(compareTableCellValues(2, '10')).toBeGreaterThan(0);
    expect(compareTableCellValues(true, false)).toBeGreaterThan(0);
  });
});

describe('sortTableRows', () => {
  it('不排序时原序返回且不修改入参', () => {
    const input = rows.slice();
    const result = sortTableRows(input, columns, null);

    expect(result).toEqual(input);
    expect(result).not.toBe(input);
    expect(input).toEqual(rows);
  });

  it('按字符串列升序 / 降序', () => {
    const asc = sortTableRows(rows, columns, { key: 'name', order: 'asc' });
    const desc = sortTableRows(rows, columns, { key: 'name', order: 'desc' });

    expect(asc.map((row) => row.key)).toEqual(['b', 'a', 'c']);
    expect(desc.map((row) => row.key)).toEqual(['c', 'a', 'b']);
  });

  it('相等值保持原相对顺序（稳定排序）', () => {
    const result = sortTableRows(rows, columns, { key: 'age', order: 'asc' });

    expect(result.map((row) => row.key)).toEqual(['b', 'a', 'c']);
  });

  it('dataIndex 与 key 不同时按 dataIndex 取值', () => {
    const custom: TableColumn[] = [{ key: 'label', dataIndex: 'name', sortable: true }];
    const result = sortTableRows(rows, custom, { key: 'label', order: 'asc' });

    expect(result.map((row) => row.key)).toEqual(['b', 'a', 'c']);
  });

  it('自定义 sorter 优先于缺省比较器', () => {
    const custom: TableColumn[] = [
      { key: 'age', sortable: true, sorter: (a, b) => Number(b.age) - Number(a.age) },
    ];
    const result = sortTableRows(rows, custom, { key: 'age', order: 'asc' });

    expect(result.map((row) => row.key)).toEqual(['a', 'c', 'b']);
  });

  it('列不存在或不可排序时原序返回', () => {
    expect(sortTableRows(rows, columns, { key: 'missing', order: 'asc' })).toEqual(rows);
    expect(sortTableRows(rows, columns, { key: 'note', order: 'asc' })).toEqual(rows);
  });

  it('空数组与空列模型不抛错', () => {
    expect(sortTableRows([], columns, { key: 'name', order: 'asc' })).toEqual([]);
    expect(sortTableRows(rows, [], { key: 'name', order: 'asc' })).toEqual(rows);
  });
});

describe('toggleTableKey', () => {
  it('加入保持已有顺序并追加到末尾，重复加入幂等', () => {
    expect(toggleTableKey(['a'], 'b', true)).toEqual(['a', 'b']);
    expect(toggleTableKey(['a', 'b'], 'a', true)).toEqual(['a', 'b']);
  });

  it('移除不存在的键原样返回', () => {
    expect(toggleTableKey(['a'], 'x', false)).toEqual(['a']);
    expect(toggleTableKey(['a', 'b', 'a'], 'a', false)).toEqual(['b']);
  });

  it('不修改入参', () => {
    const input = ['a'];

    toggleTableKey(input, 'b', true);
    toggleTableKey(input, 'a', false);
    expect(input).toEqual(['a']);
  });
});

describe('getTableSelectionState', () => {
  it('按当前页可选行判定三态', () => {
    expect(getTableSelectionState([], ['a', 'b'])).toBe('unchecked');
    expect(getTableSelectionState(['a'], ['a', 'b'])).toBe('indeterminate');
    expect(getTableSelectionState(['a', 'b'], ['a', 'b'])).toBe('checked');
  });

  it('其他页的键不影响本页判定', () => {
    expect(getTableSelectionState(['other-page'], ['a', 'b'])).toBe('unchecked');
    expect(getTableSelectionState(['a', 'b', 'other-page'], ['a', 'b'])).toBe('checked');
  });

  it('没有可选行时为 unchecked', () => {
    expect(getTableSelectionState(['a'], [])).toBe('unchecked');
  });
});

describe('toggleTableAllKeys', () => {
  it('全选并入当前页可选键，保留其他页已选键', () => {
    expect(toggleTableAllKeys(['other'], ['a', 'b'], true)).toEqual(['other', 'a', 'b']);
    expect(toggleTableAllKeys(['a', 'other'], ['a', 'b'], true)).toEqual(['a', 'other', 'b']);
  });

  it('取消全选只移除当前页可选键', () => {
    expect(toggleTableAllKeys(['a', 'b', 'other'], ['a', 'b'], false)).toEqual(['other']);
  });

  it('没有可选行时两种操作都原样返回', () => {
    expect(toggleTableAllKeys(['a'], [], true)).toEqual(['a']);
    expect(toggleTableAllKeys(['a'], [], false)).toEqual(['a']);
  });
});

describe('resolveTableRowKey', () => {
  it('缺省读 key 字段', () => {
    expect(TABLE_DEFAULT_ROW_KEY).toBe('key');
    expect(resolveTableRowKey({ key: 7 }, undefined, 0)).toBe('7');
  });

  it('字段名与函数形式都支持', () => {
    expect(resolveTableRowKey({ id: 'x' }, 'id', 0)).toBe('x');
    expect(resolveTableRowKey({ id: 1, name: 'n' }, (row) => `${row.id}-${row.name}`, 0)).toBe('1-n');
  });

  it('字段缺失或空值回退到行下标', () => {
    expect(resolveTableRowKey({}, undefined, 3)).toBe('3');
    expect(resolveTableRowKey({ key: null }, undefined, 4)).toBe('4');
    expect(resolveTableRowKey({ key: undefined }, 'key', 5)).toBe('5');
  });

  it('falsy 但非空的键值保留', () => {
    expect(resolveTableRowKey({ key: 0 }, undefined, 9)).toBe('0');
    expect(resolveTableRowKey({ key: '' }, undefined, 9)).toBe('');
  });
});

describe('getTableBodyRows', () => {
  it('无展开时每个数据行一条 data 项', () => {
    const result = getTableBodyRows(rows, undefined, []);

    expect(result).toEqual([
      { type: 'data', key: 'a', row: rows[0], index: 0 },
      { type: 'data', key: 'b', row: rows[1], index: 1 },
      { type: 'data', key: 'c', row: rows[2], index: 2 },
    ]);
  });

  it('展开行紧随数据行，键带后缀且继承 row 与 index', () => {
    const result = getTableBodyRows(rows, undefined, ['b']);

    expect(result.map((item) => [item.type, item.key])).toEqual([
      ['data', 'a'],
      ['data', 'b'],
      ['expanded', `b${TABLE_EXPANDED_KEY_SUFFIX}`],
      ['data', 'c'],
    ]);
    expect(result[2]).toEqual({
      type: 'expanded',
      key: `b${TABLE_EXPANDED_KEY_SUFFIX}`,
      row: rows[1],
      index: 1,
    });
  });

  it('空数据返回空序列', () => {
    expect(getTableBodyRows([], undefined, ['a'])).toEqual([]);
  });
});

describe('resolveTableCssSize', () => {
  it('正有限数转 px，字符串透传', () => {
    expect(resolveTableCssSize(120)).toBe('120px');
    expect(resolveTableCssSize('20%')).toBe('20%');
    expect(resolveTableCssSize('12rem')).toBe('12rem');
  });

  it('非法数字与缺省回退 undefined', () => {
    expect(resolveTableCssSize(0)).toBeUndefined();
    expect(resolveTableCssSize(-10)).toBeUndefined();
    expect(resolveTableCssSize(Number.NaN)).toBeUndefined();
    expect(resolveTableCssSize(Number.POSITIVE_INFINITY)).toBeUndefined();
    expect(resolveTableCssSize(undefined)).toBeUndefined();
  });
});

describe('resolveTableLayout / hasTableFixedColumns', () => {
  it('有宽度或固定列时用 fixed 布局', () => {
    expect(resolveTableLayout([{ key: 'a', width: 100 }])).toBe('fixed');
    expect(resolveTableLayout([{ key: 'a', fixed: 'left', width: 100 }])).toBe('fixed');
    expect(hasTableFixedColumns([{ key: 'a', fixed: 'right', width: 80 }])).toBe(true);
  });

  it('无宽度声明时保持 auto', () => {
    expect(resolveTableLayout([{ key: 'a' }, { key: 'b', width: '20%' }])).toBe('fixed');
    expect(resolveTableLayout([{ key: 'a' }, { key: 'b' }])).toBe('auto');
    expect(hasTableFixedColumns([{ key: 'a' }])).toBe(false);
  });
});

describe('getTableFixedOffsets', () => {
  it('左侧按列序累加，右侧逆序累加，交界列打 edge 标记', () => {
    const offsets = getTableFixedOffsets([
      { key: 'l1', fixed: 'left', width: 40 },
      { key: 'l2', fixed: 'left', width: 60 },
      { key: 'mid', width: 120 },
      { key: 'r1', fixed: 'right', width: 80 },
      { key: 'r2', fixed: 'right', width: 50 },
    ]);

    expect(offsets).toEqual({
      l1: { side: 'left', offset: 0, edge: false },
      l2: { side: 'left', offset: 40, edge: true },
      r1: { side: 'right', offset: 50, edge: true },
      r2: { side: 'right', offset: 0, edge: false },
    });
  });

  it('缺数字宽度的固定列退化：不产生偏移也不参与累加', () => {
    const offsets = getTableFixedOffsets([
      { key: 'l1', fixed: 'left' },
      { key: 'l2', fixed: 'left', width: '20%' },
      { key: 'l3', fixed: 'left', width: 60 },
    ]);

    expect(offsets).toEqual({ l3: { side: 'left', offset: 0, edge: true } });
  });

  it('无固定列返回空映射', () => {
    expect(getTableFixedOffsets([{ key: 'a', width: 100 }])).toEqual({});
  });
});

describe('getTableColSpan', () => {
  it('把选择列与展开列算进去', () => {
    expect(getTableColSpan(columns, false, false)).toBe(3);
    expect(getTableColSpan(columns, true, false)).toBe(4);
    expect(getTableColSpan(columns, true, true)).toBe(5);
  });

  it('没有任何列时至少为 1', () => {
    expect(getTableColSpan([], false, false)).toBe(1);
  });
});

describe('getTableTotalWidth', () => {
  it('累加数字列宽并计入辅助列，非数字宽度不计', () => {
    const cols: TableColumn[] = [
      { key: 'a', width: 100 },
      { key: 'b', width: 60 },
      { key: 'c', width: '20%' },
      { key: 'd' },
    ];

    expect(getTableTotalWidth(cols, false, false)).toBe(160);
    expect(getTableTotalWidth(cols, true, true)).toBe(160 + 48 + 44);
  });

  it('无数字宽度时只剩辅助列宽', () => {
    expect(getTableTotalWidth([{ key: 'a' }], false, false)).toBe(0);
    expect(getTableTotalWidth([], true, false)).toBe(48);
  });
});

describe('属性表', () => {
  const sort: TableSortState = { key: 'name', order: 'desc' };

  it('getTableHeadAttrs 只在排序列输出 aria-sort', () => {
    expect(getTableHeadAttrs(columns[0], sort)).toEqual({
      scope: 'col',
      'aria-sort': 'descending',
      'data-sortable': '',
      'data-align': 'left',
      'data-fixed': undefined,
    });
    expect(getTableHeadAttrs(columns[1], sort)['aria-sort']).toBeUndefined();
    expect(getTableHeadAttrs(columns[2], sort)['data-sortable']).toBeUndefined();
    expect(getTableHeadAttrs(undefined, null)).toEqual({
      scope: 'col',
      'aria-sort': undefined,
      'data-sortable': undefined,
      'data-align': 'left',
      'data-fixed': undefined,
    });
  });

  it('headerAlign 优先于 align，固定列输出 data-fixed', () => {
    const column: TableColumn = { key: 'x', align: 'right', headerAlign: 'center', fixed: 'left' };

    expect(getTableHeadAttrs(column, null)['data-align']).toBe('center');
    expect(getTableHeadAttrs(column, null)['data-fixed']).toBe('left');
    expect(getTableCellAttrs(column)).toEqual({
      'data-align': 'right',
      'data-fixed': 'left',
      'data-ellipsis': undefined,
    });
  });

  it('getTableSortTriggerAttrs 表达三态', () => {
    expect(getTableSortTriggerAttrs('name', sort)).toEqual({
      'data-state': 'active',
      'data-order': 'desc',
    });
    expect(getTableSortTriggerAttrs('age', sort)).toEqual({
      'data-state': 'inactive',
      'data-order': 'none',
    });
    expect(getTableSortTriggerAttrs('name', null)['data-order']).toBe('none');
  });

  it('getTableRowAttrs 未命中状态不输出属性', () => {
    expect(getTableRowAttrs({ selected: true, expanded: true, disabled: true })).toEqual({
      'data-selected': '',
      'data-expanded': '',
      'data-disabled': '',
    });
    expect(getTableRowAttrs({ selected: false, expanded: false, disabled: false })).toEqual({
      'data-selected': undefined,
      'data-expanded': undefined,
      'data-disabled': undefined,
    });
  });

  it('getTableExpandTriggerAttrs 输出披露模式属性', () => {
    expect(getTableExpandTriggerAttrs(true, 'row-1')).toEqual({
      type: 'button',
      'aria-expanded': true,
      'aria-controls': 'row-1',
      'data-state': 'expanded',
    });
    expect(getTableExpandTriggerAttrs(false, 'row-1')['data-state']).toBe('collapsed');
  });

  it('ellipsis 列输出 data-ellipsis', () => {
    expect(getTableCellAttrs({ key: 'x', ellipsis: true })['data-ellipsis']).toBe('');
  });
});

describe('resolveTableCellSpan', () => {
  it('对象与数组两种写法都归一化', () => {
    expect(resolveTableCellSpan({ rowspan: 2, colspan: 3 })).toEqual({ rowspan: 2, colspan: 3 });
    expect(resolveTableCellSpan([2, 3])).toEqual({ rowspan: 2, colspan: 3 });
  });

  it('缺省 / null / undefined 回退 1×1', () => {
    expect(resolveTableCellSpan(undefined)).toEqual({ rowspan: 1, colspan: 1 });
    expect(resolveTableCellSpan(null)).toEqual({ rowspan: 1, colspan: 1 });
    expect(resolveTableCellSpan({})).toEqual({ rowspan: 1, colspan: 1 });
  });

  it('0 保留（表示被吞并），负数与非有限数回退 1，小数向下取整', () => {
    expect(resolveTableCellSpan({ rowspan: 0, colspan: 0 })).toEqual({ rowspan: 0, colspan: 0 });
    expect(resolveTableCellSpan([0, 2])).toEqual({ rowspan: 0, colspan: 2 });
    expect(resolveTableCellSpan({ rowspan: -3, colspan: Number.NaN })).toEqual({ rowspan: 1, colspan: 1 });
    expect(resolveTableCellSpan({ rowspan: 2.9, colspan: 1.2 })).toEqual({ rowspan: 2, colspan: 1 });
  });
});