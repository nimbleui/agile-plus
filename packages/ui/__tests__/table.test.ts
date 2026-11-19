import { createApp, defineComponent, h, nextTick, ref } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  TableBody,
  TableCaption,
  TableCell,
  TableEmpty,
  TableExpandTrigger,
  TableExpandedRow,
  TableFooter,
  TableHead,
  TableHeader,
  TableRoot,
  TableRow,
  TableSelectionCell,
  TableSelectionHead,
} from '../src/table';

import type { App, VNode } from 'vue';

import type { TableRootSlotProps } from '../src/table/types';

import type { TableBodyRow, TableColumn, TableRowData } from '@agile-plus/primitives/table';

const apps: App[] = [];

/** 真实挂载后断言 DOM：aria-sort 与勾选态在 SSR 字符串里看不到。 */
function mount(render: () => VNode): HTMLElement {
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
  { key: 'age', title: '年龄', sortable: true, align: 'right' },
];

/** 标准复合装配：表头 + 表体逐行分发，与文档示例同一形状。 */
function mountTable(
  rootProps: Record<string, unknown> = {},
  body?: (rows: TableBodyRow[]) => VNode[],
  rowListeners: Record<string, unknown> = {}
) {
  return mount(() =>
    h(TableRoot, { data, columns, ...rootProps }, {
      default: () => [
        h(TableHeader, null, {
          default: () =>
            h(TableRow, null, {
              default: () => columns.map((column) => h(TableHead, { column: column.key, key: column.key })),
            }),
        }),
        h(TableBody, null, {
          default: (scope: { rows: TableBodyRow[] }) =>
            body
              ? body(scope.rows)
              : scope.rows.map((item) =>
                  h(TableRow, { item, key: item.key, ...rowListeners }, {
                    default: () =>
                      columns.map((column) =>
                        h(TableCell, { column: column.key, key: column.key }, {
                          default: () => String(item.row[column.key] ?? ''),
                        })
                      ),
                  })
                ),
        }),
      ],
    })
  );
}

function sortButtons(): HTMLButtonElement[] {
  return Array.from(document.querySelectorAll<HTMLButtonElement>('[data-part="sort"]'));
}

function headByKey(key: string): HTMLElement | null {
  const heads = Array.from(document.querySelectorAll<HTMLElement>('[data-part="head"]'));

  return heads.find((head) => head.textContent?.includes(key === 'name' ? '名称' : '年龄')) ?? null;
}

describe('结构与 ARIA', () => {
  it('渲染原生 table 语义结构，部件挂 data-part 钩子', () => {
    const host = mountTable();

    expect(host.querySelector('[data-part="root"] > table[data-part="table"]')).not.toBeNull();
    expect(host.querySelectorAll('thead[data-part="header"] tr[data-part="row"]')).toHaveLength(1);
    expect(host.querySelectorAll('tbody[data-part="body"] tr[data-part="row"]')).toHaveLength(2);
    expect(host.querySelectorAll('th[data-part="head"][scope="col"]')).toHaveLength(2);
    expect(host.querySelectorAll('td[data-part="cell"]')).toHaveLength(4);
  });

  it('aria-sort 只落在排序列上，循环三态', async () => {
    mountTable({ defaultSort: { key: 'name', order: 'asc' } });

    expect(headByKey('name')?.getAttribute('aria-sort')).toBe('ascending');
    expect(headByKey('age')?.getAttribute('aria-sort')).toBeNull();

    sortButtons()[0].click();
    await nextTick();
    expect(headByKey('name')?.getAttribute('aria-sort')).toBe('descending');
    expect(sortButtons()[0].getAttribute('data-order')).toBe('desc');

    sortButtons()[0].click();
    await nextTick();
    expect(headByKey('name')?.getAttribute('aria-sort')).toBeNull();
    expect(sortButtons()[0].getAttribute('data-order')).toBe('none');
  });

  it('排序后行顺序跟随，单元格对齐来自列模型', async () => {
    const host = mountTable();

    sortButtons()[0].click();
    await nextTick();

    const firstRowCells = host.querySelectorAll('tbody tr:first-child td');
    expect(firstRowCells[0].textContent).toBe('apple');
    expect(firstRowCells[1].getAttribute('data-align')).toBe('right');
  });

  it('不可排序列不渲染排序按钮', () => {
    mount(() =>
      h(TableRoot, { data, columns: [{ key: 'name', title: '名称' }] }, {
        default: () =>
          h(TableHeader, null, {
            default: () => h(TableRow, null, { default: () => h(TableHead, { column: 'name' }) }),
          }),
      })
    );

    expect(document.querySelector('[data-part="sort"]')).toBeNull();
    expect(document.querySelector('[data-part="head"]')?.textContent).toBe('名称');
  });

  it('caption 与 footer 渲染为原生语义元素', () => {
    const host = mount(() =>
      h(TableRoot, { data, columns }, {
        default: () => [
          h(TableCaption, null, { default: () => '示例表' }),
          h(TableFooter, null, {
            default: () => h(TableRow, null, { default: () => h(TableCell, null, { default: () => '合计' }) }),
          }),
        ],
      })
    );

    expect(host.querySelector('caption[data-part="caption"]')?.textContent).toBe('示例表');
    expect(host.querySelector('tfoot[data-part="footer"]')?.textContent).toBe('合计');
  });

  it('Root 插槽暴露行序列与状态', () => {
    let scope: TableRootSlotProps | null = null;

    mount(() =>
      h(TableRoot, { data, columns, defaultSort: { key: 'age', order: 'desc' } }, {
        default: (props: TableRootSlotProps) => {
          scope = props;

          return null;
        },
      })
    );

    expect(scope?.rows.map((item) => item.key)).toEqual(['a', 'b']);
    expect(scope?.sort).toEqual({ key: 'age', order: 'desc' });
    expect(scope?.columns).toHaveLength(2);
  });
});

describe('行事件', () => {
  it('数据行点击发出 rowClick，表头行点击不发声', async () => {
    const onRowClick = vi.fn();

    const host = mountTable({}, undefined, { onRowClick });

    host.querySelector<HTMLButtonElement>('[data-part="sort"]')?.click();
    await nextTick();
    expect(onRowClick).not.toHaveBeenCalled();

    const bodyRow = host.querySelector<HTMLElement>('tbody tr[data-part="row"]');
    bodyRow?.click();
    await nextTick();

    expect(onRowClick).toHaveBeenCalledTimes(1);
    // 上一步已把名称列切成升序，首行是 apple（key b）
    expect(onRowClick.mock.calls[0][0]).toMatchObject({ type: 'data', key: 'b' });
    expect(onRowClick.mock.calls[0][1]).toBeInstanceOf(MouseEvent);
  });

  it('双击发出 rowDblclick', () => {
    const onRowDblclick = vi.fn();
    const host = mountTable({}, undefined, { onRowDblclick });

    host
      .querySelector('tbody tr[data-part="row"]')
      ?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));

    expect(onRowDblclick).toHaveBeenCalledTimes(1);
  });
});

describe('选择', () => {
  function mountSelectable(rootProps: Record<string, unknown> = {}) {
    return mountTable({ selection: true, ...rootProps }, (rows) =>
      rows.map((item) =>
        h(TableRow, { item, key: item.key }, {
          default: () => [
            h(TableSelectionCell, { item, key: 'select' }),
            ...columns.map((column) =>
              h(TableCell, { column: column.key, key: column.key }, {
                default: () => String(item.row[column.key] ?? ''),
              })
            ),
          ],
        })
      )
    );
  }

  function mountWithSelectionHead(rootProps: Record<string, unknown> = {}) {
    return mount(() =>
      h(TableRoot, { data, columns, selection: true, ...rootProps }, {
        default: () => [
          h(TableHeader, null, {
            default: () =>
              h(TableRow, null, {
                default: () => [
                  h(TableSelectionHead, { key: 'all' }),
                  ...columns.map((column) => h(TableHead, { column: column.key, key: column.key })),
                ],
              }),
          }),
          h(TableBody, null, {
            default: (scope: { rows: TableBodyRow[] }) =>
              scope.rows.map((item) =>
                h(TableRow, { item, key: item.key }, {
                  default: () => [
                    h(TableSelectionCell, { item, key: 'select' }),
                    ...columns.map((column) =>
                      h(TableCell, { column: column.key, key: column.key }, {
                        default: () => String(item.row[column.key] ?? ''),
                      })
                    ),
                  ],
                })
              ),
          }),
        ],
      })
    );
  }

  function rowCheckboxes(): HTMLButtonElement[] {
    return Array.from(document.querySelectorAll<HTMLButtonElement>('[data-selection="row"] [role="checkbox"]'));
  }

  function allCheckbox(): HTMLButtonElement | null {
    return document.querySelector<HTMLButtonElement>('[data-selection="all"] [role="checkbox"]');
  }

  it('行勾选写入选择通道，选中行挂 data-selected', async () => {
    const onSelectedKeysChange = vi.fn();
    const host = mountSelectable({ 'onUpdate:selectedKeys': onSelectedKeysChange });

    rowCheckboxes()[0].click();
    await nextTick();

    expect(onSelectedKeysChange).toHaveBeenCalledWith(['a']);
    expect(host.querySelector('tbody tr[data-part="row"]')?.hasAttribute('data-selected')).toBe(true);
    expect(rowCheckboxes()[0].getAttribute('aria-checked')).toBe('true');
  });

  it('全选框三态跟随选中比例，点击在全选 / 取消之间切换', async () => {
    const host = mountWithSelectionHead();

    expect(allCheckbox()?.getAttribute('aria-checked')).toBe('false');

    rowCheckboxes()[0].click();
    await nextTick();
    expect(allCheckbox()?.getAttribute('aria-checked')).toBe('mixed');

    allCheckbox()?.click();
    await nextTick();
    expect(allCheckbox()?.getAttribute('aria-checked')).toBe('true');
    expect(rowCheckboxes().every((box) => box.getAttribute('aria-checked') === 'true')).toBe(true);

    allCheckbox()?.click();
    await nextTick();
    expect(allCheckbox()?.getAttribute('aria-checked')).toBe('false');
    expect(host.querySelectorAll('tbody tr[data-selected]')).toHaveLength(0);
  });

  it('禁用行勾选框置灰且点击无效，不把全选框拖成半选', async () => {
    mountWithSelectionHead({ isRowSelectable: (row: TableRowData) => row.key !== 'b' });

    expect(rowCheckboxes()[1].disabled).toBe(true);
    expect(rowCheckboxes()[1].hasAttribute('data-disabled')).toBe(true);

    rowCheckboxes()[1].click();
    await nextTick();
    expect(rowCheckboxes()[1].getAttribute('aria-checked')).toBe('false');

    allCheckbox()?.click();
    await nextTick();
    expect(allCheckbox()?.getAttribute('aria-checked')).toBe('true');
    expect(rowCheckboxes()[1].getAttribute('aria-checked')).toBe('false');
  });

  it('没有可选行时全选框禁用', () => {
    mountWithSelectionHead({ isRowSelectable: () => false });

    expect(allCheckbox()?.disabled).toBe(true);
  });
});

describe('展开', () => {
  function mountExpandable(rootProps: Record<string, unknown> = {}) {
    return mountTable({ expandable: true, ...rootProps }, (rows) =>
      rows.map((item) =>
        item.type === 'data'
          ? h(TableRow, { item, key: item.key }, {
              default: () => [
                h(TableCell, { key: 'expand' }, {
                  default: () => h(TableExpandTrigger, { item }, { default: () => '展开' }),
                }),
                ...columns.map((column) =>
                  h(TableCell, { column: column.key, key: column.key }, {
                    default: () => String(item.row[column.key] ?? ''),
                  })
                ),
              ],
            })
          : h(TableExpandedRow, { item, key: item.key }, { default: () => `详情-${item.row.key}` })
      )
    );
  }

  it('点击触发按钮展开内容行，aria-controls 指向内容 td', async () => {
    const host = mountExpandable();

    const trigger = host.querySelector<HTMLButtonElement>('[data-part="expand-trigger"]');
    expect(trigger?.getAttribute('aria-expanded')).toBe('false');
    expect(host.querySelector('[data-part="expanded-row"]')).toBeNull();

    trigger?.click();
    await nextTick();

    expect(trigger?.getAttribute('aria-expanded')).toBe('true');
    expect(trigger?.getAttribute('data-state')).toBe('expanded');

    const cell = host.querySelector('[data-part="expanded-cell"]');
    expect(cell?.textContent).toBe('详情-a');
    expect(cell?.id).toBe(trigger?.getAttribute('aria-controls'));
    expect(cell?.getAttribute('colspan')).toBe('3');
    expect(host.querySelector('tr[data-part="row"][data-expanded]')).not.toBeNull();
  });

  it('再次点击收起，受控模式写入只发事件', async () => {
    const onExpandedKeysChange = vi.fn();
    const host = mountExpandable({ expandedKeys: [], 'onUpdate:expandedKeys': onExpandedKeysChange });

    host.querySelector<HTMLButtonElement>('[data-part="expand-trigger"]')?.click();
    await nextTick();

    expect(onExpandedKeysChange).toHaveBeenCalledWith(['a']);
    expect(host.querySelector('[data-part="expanded-row"]')).toBeNull();
  });
});

describe('空态与固定列', () => {
  it('空态 colspan 含选择列与展开列，文案可覆盖', () => {
    const host = mount(() =>
      h(TableRoot, { data: [], columns, selection: true, expandable: true }, {
        default: () =>
          h(TableBody, null, {
            default: () => h(TableEmpty, null, { default: () => '没有记录' }),
          }),
      })
    );

    const cell = host.querySelector('[data-part="empty-cell"]');
    expect(cell?.getAttribute('colspan')).toBe('4');
    expect(cell?.textContent).toBe('没有记录');
  });

  it('空态缺省文案为暂无数据', () => {
    mount(() =>
      h(TableRoot, { data: [], columns }, {
        default: () => h(TableBody, null, { default: () => h(TableEmpty) }),
      })
    );

    expect(document.querySelector('[data-part="empty-cell"]')?.textContent).toBe('暂无数据');
  });

  it('固定列几何下发到 th 与 td，缺宽度的固定列不贴边', () => {
    const fixedColumns: TableColumn[] = [
      { key: 'name', title: '名称', fixed: 'left', width: 120 },
      { key: 'age', title: '年龄', fixed: 'left' },
    ];

    const host = mount(() =>
      h(TableRoot, { data, columns: fixedColumns }, {
        default: () => [
          h(TableHeader, null, {
            default: () =>
              h(TableRow, null, {
                default: () => fixedColumns.map((column) => h(TableHead, { column: column.key, key: column.key })),
              }),
          }),
          h(TableBody, null, {
            default: (scope: { rows: TableBodyRow[] }) =>
              scope.rows.map((item) =>
                h(TableRow, { item, key: item.key }, {
                  default: () =>
                    fixedColumns.map((column) =>
                      h(TableCell, { column: column.key, key: column.key }, { default: () => 'x' })
                    ),
                })
              ),
          }),
        ],
      })
    );

    const fixedHead = host.querySelector<HTMLElement>('th[data-fixed="left"]');
    expect(fixedHead?.getAttribute('data-fixed-edge')).toBe('left');
    expect(fixedHead?.style.getPropertyValue('--y-table-fixed-offset')).toBe('0px');

    const fixedCell = host.querySelector<HTMLElement>('td[data-fixed="left"]');
    expect(fixedCell?.style.getPropertyValue('--y-table-fixed-offset')).toBe('0px');

    const heads = host.querySelectorAll('th[data-part="head"]');
    expect(heads[1].hasAttribute('data-fixed')).toBe(false);
  });
});

describe('上下文守卫', () => {
  it('部件脱离 Root 使用时抛错', () => {
    expect(() => mount(() => h(TableCell))).toThrow('table');
    expect(() => mount(() => h(TableBody))).toThrow('table');
  });
});

describe('受控排序', () => {
  it('外部来源变化驱动 DOM，点击只发事件', async () => {
    const sort = ref<{ key: string; order: 'asc' | 'desc' } | null>(null);
    const onUpdate = vi.fn();

    // h() 不解包 props 里的 ref（与仓库其余 ui 测试同一约定）：
    // 在响应式渲染函数里读 .value，外部变化才会递进 Root。
    mount(() =>
      h(TableRoot, { data, columns, sort: sort.value, 'onUpdate:sort': onUpdate }, {
        default: () =>
          h(TableHeader, null, {
            default: () =>
              h(TableRow, null, {
                default: () => columns.map((column) => h(TableHead, { column: column.key, key: column.key })),
              }),
          }),
      })
    );

    sortButtons()[0].click();
    await nextTick();
    expect(onUpdate).toHaveBeenCalledWith({ key: 'name', order: 'asc' });
    expect(headByKey('name')?.getAttribute('aria-sort')).toBeNull();

    sort.value = { key: 'name', order: 'desc' };
    await nextTick();
    expect(headByKey('name')?.getAttribute('aria-sort')).toBe('descending');
  });
});

describe('单元格合并', () => {
  it('spanMethod 经行级上下文自动生效：rowspan 渲染、0 跨度格不渲染', () => {
    const host = mountTable({
      spanMethod: ({ rowIndex, columnIndex }: { rowIndex: number; columnIndex: number }) =>
        columnIndex === 0 ? (rowIndex === 0 ? { rowspan: 2, colspan: 1 } : { rowspan: 0, colspan: 1 }) : undefined,
    });

    const rows = host.querySelectorAll('tbody tr[data-part="row"]');
    const firstCells = rows[0].querySelectorAll('td[data-part="cell"]');
    const secondCells = rows[1].querySelectorAll('td[data-part="cell"]');

    expect(firstCells).toHaveLength(2);
    expect(firstCells[0].getAttribute('rowspan')).toBe('2');
    expect(secondCells).toHaveLength(1);
    expect(secondCells[0].textContent).toBe('25');
  });

  it('显式 colspan 直接生效', () => {
    const host = mount(() =>
      h(TableRoot, { data, columns }, {
        default: () =>
          h(TableBody, null, {
            default: (scope: { rows: TableBodyRow[] }) =>
              scope.rows.map((item) =>
                h(TableRow, { item, key: item.key }, {
                  default: () => h(TableCell, { colspan: 2 }, { default: () => '合并格' }),
                })
              ),
          }),
      })
    );

    const cell = host.querySelector('tbody td[data-part="cell"]');
    expect(cell?.getAttribute('colspan')).toBe('2');
    expect(host.querySelectorAll('tbody td[data-part="cell"]')).toHaveLength(2);
  });

  it('colspan 为 0 的格子整个不渲染', () => {
    const host = mount(() =>
      h(TableRoot, { data, columns }, {
        default: () =>
          h(TableBody, null, {
            default: (scope: { rows: TableBodyRow[] }) =>
              scope.rows.map((item) =>
                h(TableRow, { item, key: item.key }, {
                  default: () => [
                    h(TableCell, { colspan: 0, key: 'a' }, { default: () => '吞并' }),
                    h(TableCell, { key: 'b' }, { default: () => '保留' }),
                  ],
                })
              ),
          }),
      })
    );

    const cells = host.querySelectorAll('tbody tr:first-child td[data-part="cell"]');
    expect(cells).toHaveLength(1);
    expect(cells[0].textContent).toBe('保留');
  });
});

describe('列宽拖拽手柄', () => {
  function pointer(type: string, clientX: number): void {
    window.dispatchEvent(new PointerEvent(type, { clientX, bubbles: true }));
  }

  it('resizable 时表头渲染手柄，按下进入拖拽态、抬起派发 columnResize', async () => {
    const onColumnResize = vi.fn();
    const host = mountTable({ resizable: true, onColumnResize });

    const handles = host.querySelectorAll('[data-part="resize-handle"]');
    expect(handles).toHaveLength(2);
    expect(handles[0].getAttribute('role')).toBe('separator');

    const root = host.querySelector('[data-part="root"]');
    expect(root?.hasAttribute('data-resizing')).toBe(false);

    handles[0].dispatchEvent(new PointerEvent('pointerdown', { clientX: 100, bubbles: true }));
    await nextTick();
    expect(root?.hasAttribute('data-resizing')).toBe(true);

    pointer('pointermove', 180);
    await nextTick();

    pointer('pointerup', 180);
    await nextTick();
    expect(root?.hasAttribute('data-resizing')).toBe(false);
    expect(onColumnResize).toHaveBeenCalledTimes(1);
    expect(onColumnResize.mock.calls[0][0]).toBe('name');
    expect(onColumnResize.mock.calls[0][1]).toBeGreaterThanOrEqual(60);
  });

  it('未启用 resizable 时不渲染手柄', () => {
    const host = mountTable();

    expect(host.querySelector('[data-part="resize-handle"]')).toBeNull();
  });
});