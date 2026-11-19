import { createApp, defineComponent, nextTick, ref } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { useTable } from '../src/useTable';

import type { App } from 'vue';

import type { UseTableOptions, UseTableReturn } from '../src/useTable';

import type { TableColumn, TableRowData } from '@agile-plus/primitives/table';

const apps: App[] = [];

/**
 * 在最小应用里跑一次 useTable。
 *
 * 与其余 useXxx 测试同一入口：createApp 挂载让 useId 与响应式链路真实生效。
 */
function setup(options: UseTableOptions = {}): UseTableReturn {
  let api!: UseTableReturn;

  const app = createApp(
    defineComponent({
      setup() {
        api = useTable(options);

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

const data: TableRowData[] = [
  { key: 'a', name: 'banana', age: 30 },
  { key: 'b', name: 'apple', age: 25 },
  { key: 'c', name: 'cherry', age: 30 },
];

const columns: TableColumn[] = [
  { key: 'name', sortable: true },
  { key: 'age', sortable: true },
  { key: 'note' },
];

describe('派生行数据', () => {
  it('缺省原序输出，每个数据行一条 data 项', () => {
    const api = setup({ data, columns });

    expect(api.sort.value).toBeNull();
    expect(api.rows.value.map((item) => item.key)).toEqual(['a', 'b', 'c']);
    expect(api.sortedRows.value).toEqual(data);
  });

  it('排序后表体顺序跟随，展开行紧随数据行', () => {
    const api = setup({ data, columns, defaultSort: { key: 'name', order: 'asc' } });

    expect(api.rows.value.map((item) => item.key)).toEqual(['b', 'a', 'c']);

    api.toggleRowExpanded('a');

    expect(api.rows.value.map((item) => [item.type, item.key])).toEqual([
      ['data', 'b'],
      ['data', 'a'],
      ['expanded', 'a:expanded'],
      ['data', 'c'],
    ]);
  });

  it('data 是响应式来源时换数据自动重算', async () => {
    const source = ref<TableRowData[]>(data);
    const api = setup({ data: source, columns });

    source.value = [{ key: 'z', name: 'zero' }];
    await nextTick();

    expect(api.rows.value.map((item) => item.key)).toEqual(['z']);
  });

  it('rowKey 函数形式生效', () => {
    const api = setup({ data, columns, rowKey: (row) => `row-${row.key}` });

    expect(api.rows.value.map((item) => item.key)).toEqual(['row-a', 'row-b', 'row-c']);
  });
});

describe('排序通道', () => {
  it('非受控：toggleSort 按 升序 → 降序 → 取消 循环并发事件', () => {
    const onSortChange = vi.fn();
    const api = setup({ data, columns, onSortChange });

    api.toggleSort('name');
    expect(api.sort.value).toEqual({ key: 'name', order: 'asc' });

    api.toggleSort('name');
    expect(api.sort.value).toEqual({ key: 'name', order: 'desc' });

    api.toggleSort('name');
    expect(api.sort.value).toBeNull();
    expect(onSortChange).toHaveBeenCalledTimes(3);
    expect(onSortChange).toHaveBeenLastCalledWith(null);
  });

  it('不可排序列与不存在的列静默忽略', () => {
    const onSortChange = vi.fn();
    const api = setup({ data, columns, onSortChange });

    api.toggleSort('note');
    api.toggleSort('missing');

    expect(api.sort.value).toBeNull();
    expect(onSortChange).not.toHaveBeenCalled();
  });

  it('setSort 写入相同状态不发事件', () => {
    const onSortChange = vi.fn();
    const api = setup({ data, columns, defaultSort: { key: 'age', order: 'asc' }, onSortChange });

    api.setSort({ key: 'age', order: 'asc' });
    expect(onSortChange).not.toHaveBeenCalled();

    api.setSort(null);
    expect(onSortChange).toHaveBeenCalledWith(null);
  });

  it('受控：值跟随外部来源，写入只发事件不落内部', async () => {
    const sort = ref<{ key: string; order: 'asc' | 'desc' } | null>({ key: 'age', order: 'desc' });
    const onSortChange = vi.fn();
    const api = setup({ data, columns, sort, onSortChange });

    expect(api.sort.value).toEqual({ key: 'age', order: 'desc' });
    expect(api.rows.value[0].key).toBe('a');

    api.toggleSort('name');
    expect(onSortChange).toHaveBeenCalledWith({ key: 'name', order: 'asc' });
    expect(api.sort.value).toEqual({ key: 'age', order: 'desc' });

    sort.value = null;
    await nextTick();
    expect(api.sort.value).toBeNull();
  });

  it('受控 null 是合法值而不是未受控', () => {
    const api = setup({ data, columns, sort: null, defaultSort: { key: 'name', order: 'asc' } });

    expect(api.sort.value).toBeNull();
  });
});

describe('选择通道', () => {
  it('非受控：勾选与取消发事件，重复操作不发', () => {
    const onSelectedKeysChange = vi.fn();
    const api = setup({ data, columns, selection: true, onSelectedKeysChange });

    api.toggleRowSelection('a');
    expect(api.selectedKeys.value).toEqual(['a']);
    expect(api.isRowSelected('a')).toBe(true);

    api.toggleRowSelection('a', true);
    expect(onSelectedKeysChange).toHaveBeenCalledTimes(1);

    api.toggleRowSelection('a', false);
    expect(api.selectedKeys.value).toEqual([]);
    expect(onSelectedKeysChange).toHaveBeenCalledTimes(2);
  });

  it('选择未启用时一切写入被吞掉', () => {
    const onSelectedKeysChange = vi.fn();
    const api = setup({ data, columns, onSelectedKeysChange });

    api.toggleRowSelection('a');
    api.toggleAllSelection();
    api.clearSelection();

    expect(api.selectedKeys.value).toEqual([]);
    expect(api.isRowSelectable('a')).toBe(false);
    expect(onSelectedKeysChange).not.toHaveBeenCalled();
  });

  it('禁用行不参与勾选，也不把全选框拖成半选', () => {
    const api = setup({
      data,
      columns,
      selection: true,
      isRowSelectable: (row) => row.key !== 'b',
    });

    api.toggleRowSelection('b');
    expect(api.selectedKeys.value).toEqual([]);

    api.toggleAllSelection();
    expect(api.selectedKeys.value).toEqual(['a', 'c']);
    expect(api.selectionState.value).toBe('checked');
    expect(api.selectableKeys.value).toEqual(['a', 'c']);
  });

  it('全选三态与跨页保留', () => {
    const api = setup({
      data,
      columns,
      selection: true,
      defaultSelectedKeys: ['other-page'],
    });

    expect(api.selectionState.value).toBe('unchecked');

    api.toggleRowSelection('a');
    expect(api.selectionState.value).toBe('indeterminate');

    api.toggleAllSelection();
    expect(api.selectedKeys.value).toEqual(['other-page', 'a', 'b', 'c']);
    expect(api.selectionState.value).toBe('checked');

    api.toggleAllSelection();
    expect(api.selectedKeys.value).toEqual(['other-page']);
    expect(api.selectionState.value).toBe('unchecked');
  });

  it('没有可选行时全选框禁用且操作不发事件', () => {
    const onSelectedKeysChange = vi.fn();
    const api = setup({
      data,
      columns,
      selection: true,
      isRowSelectable: () => false,
      onSelectedKeysChange,
    });

    api.toggleAllSelection();
    expect(api.selectionState.value).toBe('unchecked');
    expect(onSelectedKeysChange).not.toHaveBeenCalled();
  });

  it('clearSelection 清空含其他页的键，空集合不发事件', () => {
    const onSelectedKeysChange = vi.fn();
    const api = setup({
      data,
      columns,
      selection: true,
      defaultSelectedKeys: ['a', 'other'],
      onSelectedKeysChange,
    });

    api.clearSelection();
    expect(api.selectedKeys.value).toEqual([]);
    expect(onSelectedKeysChange).toHaveBeenCalledWith([]);

    api.clearSelection();
    expect(onSelectedKeysChange).toHaveBeenCalledTimes(1);
  });

  it('受控：写入只发事件，外部来源变化自动跟随', async () => {
    const selectedKeys = ref<string[]>(['a']);
    const onSelectedKeysChange = vi.fn();
    const api = setup({ data, columns, selection: true, selectedKeys, onSelectedKeysChange });

    api.toggleRowSelection('b');
    expect(onSelectedKeysChange).toHaveBeenCalledWith(['a', 'b']);
    expect(api.selectedKeys.value).toEqual(['a']);

    selectedKeys.value = ['c'];
    await nextTick();
    expect(api.isRowSelected('c')).toBe(true);
  });
});

describe('展开通道', () => {
  it('非受控：切换展开并发事件，未知键忽略', () => {
    const onExpandedKeysChange = vi.fn();
    const api = setup({ data, columns, onExpandedKeysChange });

    api.toggleRowExpanded('a');
    expect(api.expandedKeys.value).toEqual(['a']);
    expect(api.isRowExpanded('a')).toBe(true);

    api.toggleRowExpanded('missing');
    expect(onExpandedKeysChange).toHaveBeenCalledTimes(1);

    api.toggleRowExpanded('a');
    expect(api.expandedKeys.value).toEqual([]);
  });

  it('受控：写入只发事件', () => {
    const onExpandedKeysChange = vi.fn();
    const api = setup({ data, columns, expandedKeys: ['b'], onExpandedKeysChange });

    expect(api.isRowExpanded('b')).toBe(true);

    api.toggleRowExpanded('b');
    expect(onExpandedKeysChange).toHaveBeenCalledWith([]);
    expect(api.expandedKeys.value).toEqual(['b']);
  });

  it('aria-controls 与展开内容行 id 同源', () => {
    const api = setup({ data, columns, defaultExpandedKeys: ['a b'] });
    const trigger = api.getExpandTriggerProps('a b');

    expect(trigger['aria-expanded']).toBe(true);
    expect(trigger['aria-controls']).toBe(api.getExpandedRowId('a b'));
    expect(String(trigger['aria-controls'])).not.toContain(' ');
  });

  it('数据行键与带后缀的展开行键收敛到同一个 id', () => {
    const api = setup({ data, columns, defaultExpandedKeys: ['a'] });
    const expandedEntry = api.rows.value.find((item) => item.type === 'expanded');

    expect(expandedEntry).toBeDefined();
    expect(api.getExpandedRowId('a')).toBe(api.getExpandedRowId('a:expanded'));
  });
});

describe('几何与属性表', () => {
  it('colSpan 含选择列与展开列', () => {
    expect(setup({ data, columns }).colSpan.value).toBe(3);
    expect(setup({ data, columns, selection: true, expandable: true }).colSpan.value).toBe(5);
  });

  it('固定列偏移以 CSS Variable 下发，交界列打 edge 标记', () => {
    const api = setup({
      data,
      columns: [
        { key: 'name', fixed: 'left', width: 100 },
        { key: 'age', fixed: 'left', width: 60 },
        { key: 'note', fixed: 'right', width: 80 },
      ],
    });

    expect(api.layout.value).toBe('fixed');

    const head = api.getHeadProps('age');
    expect(head['data-fixed']).toBe('left');
    expect(head['data-fixed-edge']).toBe('left');
    expect(head.style).toEqual({ '--y-table-fixed-offset': '100px' });

    const cell = api.getCellProps('note');
    expect(cell['data-fixed']).toBe('right');
    expect(cell['data-fixed-edge']).toBe('right');
    expect(cell.style).toEqual({ '--y-table-fixed-offset': '0px' });
  });

  it('缺数字宽度的固定列抹掉 data-fixed，避免以偏移 0 贴边', () => {
    const api = setup({ data, columns: [{ key: 'name', fixed: 'left' }] });

    expect(api.getCellProps('name')['data-fixed']).toBeUndefined();
    expect(api.getCellProps('name').style).toBeUndefined();
  });

  it('行属性表反映选中 / 展开 / 禁用', () => {
    const api = setup({
      data,
      columns,
      selection: true,
      isRowSelectable: (row) => row.key !== 'b',
      defaultSelectedKeys: ['a'],
      defaultExpandedKeys: ['a'],
    });

    const itemA = api.rows.value[0];
    expect(api.getRowProps(itemA)).toEqual({
      'data-selected': '',
      'data-expanded': '',
      'data-disabled': undefined,
    });

    const itemB = api.rows.value.find((item) => item.type === 'data' && item.key === 'b');
    if (!itemB) throw new Error('数据行 b 不在表体序列里');

    expect(api.getRowProps(itemB)['data-disabled']).toBe('');
  });

  it('表头属性表带 aria-sort，排序按钮属性表带三态', () => {
    const api = setup({ data, columns, defaultSort: { key: 'name', order: 'asc' } });

    expect(api.getHeadProps('name')['aria-sort']).toBe('ascending');
    expect(api.getHeadProps('age')['aria-sort']).toBeUndefined();
    expect(api.getSortTriggerProps('name')).toEqual({ 'data-state': 'active', 'data-order': 'asc' });
    expect(api.getSortTriggerProps('age')['data-order']).toBe('none');
  });
});

describe('单元格合并', () => {
  it('未配置 spanMethod 时返回 1×1 且不吞并', () => {
    const api = setup({ data, columns });

    expect(api.getCellSpan(data[0], 'name', 0)).toEqual({ rowspan: 1, colspan: 1, removed: false });
  });

  it('spanMethod 对象与数组写法都生效，columnIndex 不含辅助列', () => {
    const seen: number[] = [];
    const api = setup({
      data,
      columns,
      selection: true,
      spanMethod: ({ columnIndex }) => {
        seen.push(columnIndex);

        return columnIndex === 0 ? [2, 1] : { rowspan: 1, colspan: 1 };
      },
    });

    expect(api.getCellSpan(data[0], 'name', 0)).toEqual({ rowspan: 2, colspan: 1, removed: false });
    expect(api.getCellSpan(data[0], 'age', 0)).toEqual({ rowspan: 1, colspan: 1, removed: false });
    expect(seen).toEqual([0, 1]);
  });

  it('跨度为 0 的格子标记 removed', () => {
    const api = setup({
      data,
      columns,
      spanMethod: ({ rowIndex }) => (rowIndex === 0 ? { rowspan: 2, colspan: 1 } : { rowspan: 0, colspan: 1 }),
    });

    expect(api.getCellSpan(data[0], 'name', 0).removed).toBe(false);
    expect(api.getCellSpan(data[1], 'name', 1).removed).toBe(true);
  });

  it('列不存在时回退 1×1', () => {
    const api = setup({ data, columns, spanMethod: () => [3, 3] });

    expect(api.getCellSpan(data[0], 'missing', 0)).toEqual({ rowspan: 1, colspan: 1, removed: false });
  });
});

describe('列宽拖拽', () => {
  function pointer(type: string, clientX: number): void {
    window.dispatchEvent(new PointerEvent(type, { clientX, bubbles: true }));
  }

  it('setColumnWidth 夹到最小宽度，columnWidths 反映覆盖', () => {
    const api = setup({ data, columns: [{ key: 'name', width: 120 }, { key: 'age' }] });

    expect(api.columnWidths.value.name).toBe('120px');

    api.setColumnWidth('name', 200);
    expect(api.columnWidths.value.name).toBe('200px');

    api.setColumnWidth('name', 10);
    expect(api.columnWidths.value.name).toBe('60px');
  });

  it('自定义 minWidth 优先于全局默认', () => {
    const api = setup({ data, columns: [{ key: 'name', width: 120, minWidth: 100 }] });

    api.setColumnWidth('name', 50);
    expect(api.columnWidths.value.name).toBe('100px');
  });

  it('resetColumnWidths 清空覆盖回到列模型', () => {
    const api = setup({ data, columns: [{ key: 'name', width: 120 }] });

    api.setColumnWidth('name', 300);
    expect(api.columnWidths.value.name).toBe('300px');

    api.resetColumnWidths();
    expect(api.columnWidths.value.name).toBe('120px');
  });

  it('拖拽改固定列宽度后，后续固定列偏移随之重算', () => {
    const api = setup({
      data,
      resizable: true,
      columns: [
        { key: 'name', fixed: 'left', width: 100 },
        { key: 'age', fixed: 'left', width: 60 },
      ],
    });

    expect(api.getCellProps('age').style).toEqual({ '--y-table-fixed-offset': '100px' });

    api.setColumnWidth('name', 150);
    expect(api.getCellProps('age').style).toEqual({ '--y-table-fixed-offset': '150px' });
  });

  it('totalColumnWidth 随拖拽更新，含辅助列', () => {
    const api = setup({
      data,
      resizable: true,
      selection: true,
      columns: [{ key: 'name', width: 100 }, { key: 'age', width: 60 }],
    });

    expect(api.totalColumnWidth.value).toBe(100 + 60 + 48);

    api.setColumnWidth('name', 200);
    expect(api.totalColumnWidth.value).toBe(200 + 60 + 48);
  });

  it('startColumnResize 跟随指针移动，抬起派发回调并清拖拽态', () => {
    const onColumnResize = vi.fn();
    const api = setup({ data, columns: [{ key: 'name', width: 120 }], resizable: true, onColumnResize });

    api.startColumnResize('name', 100, 120);
    expect(api.resizingKey.value).toBe('name');

    pointer('pointermove', 150);
    expect(api.columnWidths.value.name).toBe('170px');

    pointer('pointerup', 150);
    expect(api.resizingKey.value).toBeNull();
    expect(onColumnResize).toHaveBeenCalledWith('name', 170);
  });

  it('系统中断（pointercancel）不派发回调', () => {
    const onColumnResize = vi.fn();
    const api = setup({ data, columns: [{ key: 'name', width: 120 }], resizable: true, onColumnResize });

    api.startColumnResize('name', 100, 120);
    pointer('pointermove', 150);
    pointer('pointercancel', 150);

    expect(api.resizingKey.value).toBeNull();
    expect(onColumnResize).not.toHaveBeenCalled();
  });

  it('未启用 resizable 时拖拽被忽略', () => {
    const api = setup({ data, columns: [{ key: 'name', width: 120 }] });

    api.startColumnResize('name', 100, 120);
    pointer('pointermove', 200);

    expect(api.resizingKey.value).toBeNull();
    expect(api.columnWidths.value.name).toBe('120px');
  });
});