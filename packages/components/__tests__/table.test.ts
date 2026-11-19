import { createApp, defineComponent, h, nextTick, ref } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { Table } from '../src/table';

import type { App } from 'vue';

import type { TableColumn, TableRowData } from '@agile-plus/primitives/table';

const apps: App[] = [];

function mount(render: () => ReturnType<typeof h>) {
  const host = document.createElement('div');

  document.body.append(host);

  const app = createApp(defineComponent({ setup: () => render }));

  app.mount(host);
  apps.push(app);

  return host;
}

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount();

  document.body.innerHTML = '';
});

const data: TableRowData[] = [
  { key: 'a', name: 'banana', age: 30 },
  { key: 'b', name: 'apple', age: 25 },
];

const columns: TableColumn[] = [
  { key: 'name', title: '名称', sortable: true },
  { key: 'age', title: '年龄', align: 'right' },
];

function root(host: HTMLElement): HTMLElement {
  const node = host.querySelector('.y-table');

  if (!node) throw new Error('未渲染出 .y-table 根节点');

  return node;
}

describe('样式落点与视觉属性', () => {
  it('根节点带命名空间类与缺省尺寸，视觉属性不作为无效 attr 透传', () => {
    const host = mount(() => h(Table, { data, columns }));
    const node = root(host);

    expect(node.classList.contains('y-table')).toBe(true);
    expect(node.classList.contains('y-table--middle')).toBe(true);
    expect(node.hasAttribute('size')).toBe(false);
    expect(node.hasAttribute('stripe')).toBe(false);
    expect(node.hasAttribute('loading')).toBe(false);
  });

  it('size / stripe / border 换成对应修饰符类', () => {
    const host = mount(() => h(Table, { data, columns, size: 'large', stripe: true, border: true }));
    const node = root(host);

    expect(node.classList.contains('y-table--large')).toBe(true);
    expect(node.classList.contains('y-table--stripe')).toBe(true);
    expect(node.classList.contains('y-table--border')).toBe(true);
  });

  it('斑马纹按数据行下标下发 data-striped，展开行不打断奇偶', async () => {
    const host = mount(() =>
      h(Table, { data, columns, stripe: true, expandable: true, defaultExpandedKeys: ['a'] })
    );

    const rows = host.querySelectorAll('tbody tr[data-part="row"]');
    expect(rows[0].hasAttribute('data-striped')).toBe(false);
    expect(rows[1].hasAttribute('data-striped')).toBe(true);
  });

  it('高度与布局算法落成 CSS Variable', () => {
    const host = mount(() =>
      h(Table, { data, columns: [{ key: 'name', width: 120 }], height: 300, maxHeight: '60vh' })
    );
    const node = root(host);

    expect(node.style.getPropertyValue('--y-table-height')).toBe('300px');
    expect(node.style.getPropertyValue('--y-table-max-height')).toBe('60vh');
    expect(node.style.getPropertyValue('--y-table-layout')).toBe('fixed');
  });

  it('无宽度声明时布局为 auto', () => {
    const host = mount(() => h(Table, { data, columns }));

    expect(root(host).style.getPropertyValue('--y-table-layout')).toBe('auto');
  });

  it('colgroup 按列宽渲染，选择 / 展开列各占一列', () => {
    const host = mount(() =>
      h(Table, {
        data,
        columns: [{ key: 'name', width: 120 }, { key: 'age' }],
        selection: true,
        expandable: true,
      })
    );

    const cols = host.querySelectorAll('colgroup col');
    expect(cols).toHaveLength(4);
    expect((cols[2] as HTMLElement).style.width).toBe('120px');
  });
});

describe('配置驱动渲染', () => {
  it('表头读列模型 title，单元格读 dataIndex ?? key 字段', () => {
    const host = mount(() =>
      h(Table, { data, columns: [{ key: 'label', title: '标签', dataIndex: 'name' }, { key: 'age', title: '年龄' }] })
    );

    expect(host.querySelector('thead')?.textContent).toContain('标签');
    const firstRow = host.querySelectorAll('tbody tr[data-part="row"]')[0];
    expect(firstRow.textContent).toContain('banana');
    expect(firstRow.textContent).toContain('30');
  });

  it('空值字段渲染为空字符串而不是 null', () => {
    const host = mount(() => h(Table, { data: [{ key: 'a', name: null }], columns: [{ key: 'name' }] }));

    expect(host.querySelector('tbody td[data-part="cell"]')?.textContent).toBe('');
  });

  it('showHeader=false 隐藏表头', () => {
    const host = mount(() => h(Table, { data, columns, showHeader: false }));

    expect(host.querySelector('thead')).toBeNull();
  });

  it('cell-{key} 插槽覆盖单元格内容并拿到 row / column / index', () => {
    const host = mount(() =>
      h(Table, { data, columns }, {
        'cell-name': ({ row, index }: { row: TableRowData; index: number }) => `#${index}-${row.name}`,
      })
    );

    const cells = host.querySelectorAll('tbody tr:first-child td[data-part="cell"]');
    expect(cells[0].textContent).toBe('#0-banana');
  });

  it('head-{key} 插槽覆盖表头内容', () => {
    const host = mount(() =>
      h(Table, { data, columns }, { 'head-name': () => '自定义名称' })
    );

    expect(host.querySelector('thead')?.textContent).toContain('自定义名称');
  });

  it('footer 插槽渲染为 tfoot', () => {
    const host = mount(() =>
      h(Table, { data, columns }, { footer: () => h('tr', null, h('td', { colspan: 2 }, '合计')) })
    );

    expect(host.querySelector('tfoot[data-part="footer"]')?.textContent).toBe('合计');
  });
});

describe('选择与展开', () => {
  it('selection 渲染全选框与行框，勾选写入选择通道', async () => {
    const onUpdate = vi.fn();
    const host = mount(() => h(Table, { data, columns, selection: true, 'onUpdate:selectedKeys': onUpdate }));

    expect(host.querySelector('[data-selection="all"] [role="checkbox"]')).not.toBeNull();
    const rowBoxes = host.querySelectorAll<HTMLButtonElement>('[data-selection="row"] [role="checkbox"]');
    expect(rowBoxes).toHaveLength(2);

    rowBoxes[0].click();
    await nextTick();
    expect(onUpdate).toHaveBeenCalledWith(['a']);
  });

  it('expandable 渲染展开触发，expanded 插槽承载内容，aria-controls 指向内容格', async () => {
    const host = mount(() =>
      h(Table, { data, columns, expandable: true }, {
        expanded: ({ row }: { row: TableRowData }) => `详情-${row.name}`,
      })
    );

    const trigger = host.querySelector<HTMLButtonElement>('[data-part="expand-trigger"]');
    expect(trigger?.getAttribute('aria-expanded')).toBe('false');

    trigger?.click();
    await nextTick();

    const cell = host.querySelector('[data-part="expanded-cell"]');
    expect(cell?.textContent).toBe('详情-banana');
    expect(cell?.id).toBe(trigger?.getAttribute('aria-controls'));
    expect(cell?.getAttribute('colspan')).toBe('3');
  });
});

describe('空态与加载', () => {
  it('空数据渲染空态，emptyText 与 empty 插槽可覆盖', () => {
    const host = mount(() => h(Table, { data: [], columns, emptyText: '没有记录' }));

    expect(host.querySelector('[data-part="empty-cell"]')?.textContent).toBe('没有记录');
    expect(host.querySelector('[data-part="empty-cell"]')?.getAttribute('colspan')).toBe('2');
  });

  it('loading 渲染遮罩与旋转指示，根节点挂 aria-busy 与 data-loading', () => {
    const host = mount(() => h(Table, { data, columns, loading: true }));
    const node = root(host);

    expect(node.getAttribute('aria-busy')).toBe('true');
    expect(node.hasAttribute('data-loading')).toBe(true);
    expect(host.querySelector('[data-part="loading-mask"] [data-part="spinner"]')).not.toBeNull();
    expect(host.querySelector('[data-part="loading-mask"]')?.getAttribute('role')).toBe('status');
  });

  it('非加载态不渲染遮罩', () => {
    const host = mount(() => h(Table, { data, columns }));

    expect(host.querySelector('[data-part="loading-mask"]')).toBeNull();
    expect(root(host).hasAttribute('data-loading')).toBe(false);
  });
});

describe('排序与行事件', () => {
  it('点击表头排序，aria-sort 跟随，受控写入发事件', async () => {
    const onUpdate = vi.fn();
    const host = mount(() => h(Table, { data, columns, 'onUpdate:sort': onUpdate }));

    const sortButton = host.querySelector<HTMLButtonElement>('[data-part="sort"]');
    sortButton?.click();
    await nextTick();

    expect(onUpdate).toHaveBeenCalledWith({ key: 'name', order: 'asc' });
    expect(host.querySelector('th[data-part="head"]')?.getAttribute('aria-sort')).toBe('ascending');
  });

  it('行点击 / 双击转发为组件事件', () => {
    const onRowClick = vi.fn();
    const onRowDblclick = vi.fn();
    const host = mount(() =>
      h(Table, { data, columns, onRowClick, onRowDblclick })
    );

    const row = host.querySelector<HTMLElement>('tbody tr[data-part="row"]');
    row?.click();
    row?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));

    expect(onRowClick).toHaveBeenCalledTimes(1);
    expect(onRowClick.mock.calls[0][0]).toMatchObject({ key: 'a', index: 0 });
    expect(onRowDblclick).toHaveBeenCalledTimes(1);
  });

  it('固定列几何下发到单元格 CSS Variable', () => {
    const host = mount(() =>
      h(Table, {
        data,
        columns: [
          { key: 'name', fixed: 'left', width: 100 },
          { key: 'age', fixed: 'right', width: 80 },
        ],
      })
    );

    const leftCell = host.querySelector<HTMLElement>('tbody td[data-fixed="left"]');
    expect(leftCell?.style.getPropertyValue('--y-table-fixed-offset')).toBe('0px');
    expect(leftCell?.getAttribute('data-fixed-edge')).toBe('left');

    const rightCell = host.querySelector<HTMLElement>('tbody td[data-fixed="right"]');
    expect(rightCell?.style.getPropertyValue('--y-table-fixed-offset')).toBe('0px');
  });
});

describe('合并单元格', () => {
  it('spanMethod 自动合并：rowspan 渲染、被吞并格消失', () => {
    const host = mount(() =>
      h(Table, {
        data,
        columns,
        spanMethod: ({ rowIndex, columnIndex }: { rowIndex: number; columnIndex: number }) =>
          columnIndex === 0 ? (rowIndex === 0 ? { rowspan: 2, colspan: 1 } : { rowspan: 0, colspan: 1 }) : undefined,
      })
    );

    const rows = host.querySelectorAll('tbody tr[data-part="row"]');
    expect(rows[0].querySelectorAll('td[data-part="cell"]')).toHaveLength(2);
    expect(rows[0].querySelector('td[data-part="cell"]')?.getAttribute('rowspan')).toBe('2');
    expect(rows[1].querySelectorAll('td[data-part="cell"]')).toHaveLength(1);
  });

  it('横向合并 colspan 生效', () => {
    const host = mount(() =>
      h(Table, {
        data,
        columns,
        spanMethod: ({ columnIndex }: { columnIndex: number }) => (columnIndex === 0 ? [1, 2] : [0, 0]),
      })
    );

    const cells = host.querySelectorAll('tbody tr:first-child td[data-part="cell"]');
    expect(cells).toHaveLength(1);
    expect(cells[0].getAttribute('colspan')).toBe('2');
  });
});

describe('列宽拖拽', () => {
  function pointer(type: string, clientX: number): void {
    window.dispatchEvent(new PointerEvent(type, { clientX, bubbles: true }));
  }

  it('resizable 渲染手柄，colgroup 用生效列宽，拖拽实时更新并派发事件', async () => {
    const onColumnResize = vi.fn();
    const host = mount(() =>
      h(Table, { data, columns: [{ key: 'name', width: 120 }, { key: 'age' }], resizable: true, onColumnResize })
    );

    expect(host.querySelectorAll('[data-part="resize-handle"]')).toHaveLength(2);
    const col = () => host.querySelectorAll('colgroup col')[0] as HTMLElement;
    expect(col().style.width).toBe('120px');

    const handle = host.querySelector('[data-part="resize-handle"]');
    handle?.dispatchEvent(new PointerEvent('pointerdown', { clientX: 100, bubbles: true }));
    await nextTick();
    expect(host.querySelector('[data-part="root"]')?.hasAttribute('data-resizing')).toBe(true);

    pointer('pointermove', 200);
    await nextTick();
    expect(col().style.width).toBe('100px');

    pointer('pointerup', 200);
    await nextTick();
    expect(onColumnResize).toHaveBeenCalledWith('name', 100);
    expect(host.querySelector('[data-part="root"]')?.hasAttribute('data-resizing')).toBe(false);
  });

  it('resetColumnWidths 经 expose 清空覆盖回到列模型', async () => {
    const tableRef = ref<{ resetColumnWidths: () => void } | null>(null);
    const host = mount(() =>
      h(Table, { ref: tableRef, data, columns: [{ key: 'name', width: 120 }], resizable: true })
    );

    const handle = host.querySelector('[data-part="resize-handle"]');
    handle?.dispatchEvent(new PointerEvent('pointerdown', { clientX: 100, bubbles: true }));
    pointer('pointermove', 250);
    pointer('pointerup', 250);
    await nextTick();

    const col = () => host.querySelector('colgroup col') as HTMLElement;
    expect(col().style.width).toBe('150px');

    tableRef.value?.resetColumnWidths();
    await nextTick();
    expect(col().style.width).toBe('120px');
  });

  it('resizable 强制 fixed 布局', () => {
    const host = mount(() => h(Table, { data, columns, resizable: true }));

    expect(root(host).style.getPropertyValue('--y-table-layout')).toBe('fixed');
  });

  it('表格 min-width 取列宽总和（像素），列宽总和超出容器即横向滚动', () => {
    const host = mount(() =>
      h(Table, { data, columns: [{ key: 'name', width: 200 }, { key: 'age', width: 120 }], resizable: true })
    );

    const table = host.querySelector('table[data-part="table"]') as HTMLElement;
    expect(table.style.getPropertyValue('--y-table-min-width')).toBe('320px');
  });

  it('选择 / 展开辅助列计入 min-width', () => {
    const host = mount(() =>
      h(Table, { data, columns: [{ key: 'name', width: 200 }], selection: true, expandable: true })
    );

    const table = host.querySelector('table[data-part="table"]') as HTMLElement;
    expect(table.style.getPropertyValue('--y-table-min-width')).toBe('292px');
  });
});