import { computed, ref, shallowRef, toValue, useId } from 'vue';

import {
  TABLE_DEFAULT_MIN_WIDTH,
  TABLE_EXPANDED_KEY_SUFFIX,
  getTableBodyRows,
  getTableCellAttrs,
  getTableColSpan,
  getTableExpandTriggerAttrs,
  getTableFixedOffsets,
  getTableHeadAttrs,
  getNextTableSortState,
  getTableRowAttrs,
  getTableSelectionState,
  getTableSortTriggerAttrs,
  getTableTotalWidth,
  resolveTableCellSpan,
  resolveTableCssSize,
  resolveTableLayout,
  sortTableRows,
  toggleTableAllKeys,
  toggleTableKey,
} from '@agile-plus/primitives/table';

import { useControllable } from '../utils/useControllable';
import { usePointerDrag } from '../utils/usePointerDrag';

import type {
  TableBodyRow,
  TableCellSpan,
  TableColumn,
  TableFixedOffset,
  TableRowData,
  TableSortState,
} from '@agile-plus/primitives/table';

import type { UseTableOptions, UseTableReturn } from './types';

/**
 * Table 的 Vue Composable 适配。
 *
 * 排序、选择、展开的转换规则全部委托给 primitives；本层只做几件事：
 * 1. 把三条状态通道各自归一化成受控 / 非受控状态；
 * 2. 把「数据 + 列模型 + 排序」合成排序后的行，再按展开键扁平化成表体序列；
 * 3. 派生全选三态与可选键集合——它们只作用域于当前页；
 * 4. 持有列宽覆盖态，派生固定列几何与布局，并把拖拽改宽收口到 usePointerDrag；
 * 5. 暴露部件可以直接 v-bind 的属性表与单元格合并跨度。
 *
 * 除拖拽监听（由 usePointerDrag 在作用域销毁时自动释放）外没有需要手动清理的资源：
 * 派生值都是 computed，数据变化在读的那一刻反映，不需要 watch 去补救。
 *
 * @param options 表格配置。
 * @returns 派生行数据、状态通道、列宽控制与属性绑定函数集合。
 */
export function useTable(options: UseTableOptions = {}): UseTableReturn {
  const sortState = useControllable<TableSortState | null>({
    value: options.sort,
    defaultValue: options.defaultSort ?? null,
    onChange: (next) => options.onSortChange?.(next),
  });

  const selectedState = useControllable<readonly string[]>({
    value: options.selectedKeys,
    defaultValue: options.defaultSelectedKeys ?? [],
    onChange: (next) => options.onSelectedKeysChange?.([...next]),
  });

  const expandedState = useControllable<readonly string[]>({
    value: options.expandedKeys,
    defaultValue: options.defaultExpandedKeys ?? [],
    onChange: (next) => options.onExpandedKeysChange?.([...next]),
  });

  const columns = computed<readonly TableColumn[]>(() => toValue(options.columns) ?? []);

  const isSelectionEnabled = computed(() => toValue(options.selection) === true);

  const isResizable = computed(() => toValue(options.resizable) === true);

  /**
   * 用户拖拽产生的列宽覆盖，只记被改过的列。
   *
   * 基础宽度始终来自当前列模型，覆盖只叠在其上：列模型动态变化（增删列、改宽）
   * 时不必重新播种，未被拖拽的列自动跟随新配置，被拖拽的列保留用户意图。
   */
  const widthOverrides = shallowRef<Record<string, number>>({});

  const effectiveColumns = computed<readonly TableColumn[]>(() =>
    columns.value.map((column) => {
      const override = widthOverrides.value[column.key];

      return override === undefined ? column : { ...column, width: override };
    })
  );

  const sortedRows = computed(() =>
    sortTableRows(toValue(options.data) ?? [], columns.value, sortState.value.value)
  );

  const rows = computed<TableBodyRow[]>(() =>
    getTableBodyRows(sortedRows.value, options.rowKey, expandedState.value.value)
  );

  /**
   * 键到行数据的索引，选择与展开的守卫都查它。
   *
   * 从渲染序列（而不是原始 data）建索引：键的兜底值是行下标，排序后下标会变，
   * 守卫必须与屏幕上实际渲染的那一行同源，否则禁用判定会落到别的行上。
   */
  const rowMap = computed(() => {
    const map = new Map<string, TableRowData>();

    for (const item of rows.value) {
      if (item.type === 'data') map.set(item.key, item.row);
    }

    return map;
  });

  function canSelectRow(row: TableRowData): boolean {
    return isSelectionEnabled.value && (options.isRowSelectable?.(row) ?? true);
  }

  const selectableKeys = computed(() =>
    rows.value
      .filter((item) => item.type === 'data' && canSelectRow(item.row))
      .map((item) => item.key)
  );

  const selectionState = computed(() =>
    getTableSelectionState(selectedState.value.value, selectableKeys.value)
  );

  // 固定列几何与布局都从「生效列」派生：拖拽改了固定列宽度，后续固定列的
  // sticky 偏移必须随之重算，否则贴边位置会与实际列宽错位。
  const fixedOffsets = computed(() => getTableFixedOffsets(effectiveColumns.value));

  const layout = computed(() => resolveTableLayout(effectiveColumns.value));

  const columnWidths = computed<Record<string, string>>(() => {
    const result: Record<string, string> = {};

    for (const column of effectiveColumns.value) {
      const width = resolveTableCssSize(column.width);

      if (width !== undefined) result[column.key] = width;
    }

    return result;
  });

  const colSpan = computed(() =>
    getTableColSpan(columns.value, isSelectionEnabled.value, toValue(options.expandable) === true)
  );

  // 最小像素宽度从生效列派生：拖拽改宽后总宽随之更新，横向滚动范围跟着变。
  const totalColumnWidth = computed(() =>
    getTableTotalWidth(effectiveColumns.value, isSelectionEnabled.value, toValue(options.expandable) === true)
  );

  const uid = useId();

  const drag = usePointerDrag();

  const resizingKey = ref<string | null>(null);

  function setSort(next: TableSortState | null): void {
    const current = sortState.value.value;
    const unchanged =
      current === next ||
      (current !== null && next !== null && current.key === next.key && current.order === next.order);

    if (unchanged) return;

    sortState.set(next);
  }

  function toggleSort(key: string): void {
    const column = columns.value.find((item) => item.key === key);

    if (!column?.sortable) return;

    setSort(getNextTableSortState(sortState.value.value, key));
  }

  function isRowSelected(key: string): boolean {
    return selectedState.value.value.includes(key);
  }

  function isRowSelectable(key: string): boolean {
    const row = rowMap.value.get(key);

    return row !== undefined && canSelectRow(row);
  }

  function toggleRowSelection(key: string, checked?: boolean): void {
    if (!isRowSelectable(key)) return;

    const next = checked ?? !isRowSelected(key);

    if (next === isRowSelected(key)) return;

    selectedState.set(toggleTableKey(selectedState.value.value, key, next));
  }

  function toggleAllSelection(checked?: boolean): void {
    if (!isSelectionEnabled.value || selectableKeys.value.length === 0) return;

    const next = checked ?? selectionState.value !== 'checked';

    // 已经站在目标态上就不算一次操作：全选框 checked 时再点「全选」、
    // 没有任何可选行时点「取消」，都不该冒出 update:selectedKeys。
    if (next && selectionState.value === 'checked') return;
    if (!next && selectionState.value === 'unchecked') return;

    selectedState.set(toggleTableAllKeys(selectedState.value.value, selectableKeys.value, next));
  }

  function clearSelection(): void {
    if (selectedState.value.value.length === 0) return;

    selectedState.set([]);
  }

  function isRowExpanded(key: string): boolean {
    return expandedState.value.value.includes(key);
  }

  function toggleRowExpanded(key: string): void {
    if (!rowMap.value.has(key)) return;

    expandedState.set(toggleTableKey(expandedState.value.value, key, !isRowExpanded(key)));
  }

  function getExpandedRowId(key: string): string {
    // 触发按钮拿数据行键、展开内容行拿带后缀的派生键，两者必须收敛到同一个 id，
    // 否则 aria-controls 失配。后缀只用于 v-for 键区分，在这里剥掉。
    const dataKey = key.endsWith(TABLE_EXPANDED_KEY_SUFFIX)
      ? key.slice(0, -TABLE_EXPANDED_KEY_SUFFIX.length)
      : key;

    // 行键可能含空格等 id 非法字符，编码后仍是稳定双射，aria-controls 不会失配。
    return `table-${uid}-expanded-${encodeURIComponent(dataKey)}`;
  }

  /** 取某列的最小宽度：列模型 minWidth 优先，缺省回退全局默认。 */
  function resolveMinWidth(key: string): number {
    const column = columns.value.find((item) => item.key === key);
    const min = column?.minWidth;

    return typeof min === 'number' && Number.isFinite(min) && min > 0 ? min : TABLE_DEFAULT_MIN_WIDTH;
  }

  function setColumnWidth(key: string, width: number): void {
    if (!columns.value.some((item) => item.key === key)) return;

    const next = Math.max(Math.round(width), resolveMinWidth(key));

    if (!Number.isFinite(next)) return;

    widthOverrides.value = { ...widthOverrides.value, [key]: next };
  }

  function resetColumnWidths(): void {
    widthOverrides.value = {};
  }

  /**
   * 开始一次列宽拖拽。
   *
   * 起点像素宽度由调用方（ui 层）从 th 的 offsetWidth 量好传入，本层不读 DOM；
   * 移动量换算成新宽度并夹到最小宽度，监听的生命周期由 usePointerDrag 收口。
   * 抬起时派发 onColumnResize，系统中断（cancel）不派发——那不算一次用户提交。
   *
   * @param key 被拖拽的列键。
   * @param startX 按下时的指针横坐标。
   * @param startWidth 按下时该列的像素宽度。
   */
  function startColumnResize(key: string, startX: number, startWidth: number): void {
    if (!isResizable.value) return;

    resizingKey.value = key;

    drag.start({
      onMove(event) {
        setColumnWidth(key, startWidth + (event.clientX - startX));
      },
      onEnd(reason) {
        resizingKey.value = null;

        if (reason === 'up') options.onColumnResize?.(key, widthOverrides.value[key] ?? startWidth);
      },
    });
  }

  /**
   * 单元格的合并跨度。
   *
   * 未配置 spanMethod 或列不存在时返回 1×1（不合并）。columnIndex 取数据列下标，
   * 不含选择列 / 展开列——合并只作用在数据格上。removed 供渲染层决定要不要画这个 td。
   *
   * @param row 行数据。
   * @param columnKey 列键。
   * @param rowIndex 数据行下标。
   */
  function getCellSpan(
    row: TableRowData,
    columnKey: string,
    rowIndex: number
  ): TableCellSpan & { removed: boolean } {
    const columnIndex = columns.value.findIndex((item) => item.key === columnKey);
    const column = columns.value[columnIndex];

    if (!options.spanMethod || !column) return { rowspan: 1, colspan: 1, removed: false };

    const span = resolveTableCellSpan(options.spanMethod({ row, column, rowIndex, columnIndex }));

    return { ...span, removed: span.rowspan === 0 || span.colspan === 0 };
  }

  function getRowProps(item: TableBodyRow): Record<string, unknown> {
    return getTableRowAttrs({
      selected: isRowSelected(item.key),
      expanded: isRowExpanded(item.key),
      disabled: isSelectionEnabled.value && !canSelectRow(item.row),
    });
  }

  /**
   * 固定列几何并入属性表。
   *
   * 没有生效偏移的固定列（缺数字宽度）必须抹掉 data-fixed：样式层见属性就贴
   * sticky，留着它会让该列以偏移 0 贴在边上，压住真正的第一个固定列。
   */
  function withFixedGeometry(
    attrs: Record<string, unknown>,
    key: string
  ): Record<string, unknown> {
    const fixed: TableFixedOffset | undefined = fixedOffsets.value[key];

    if (!fixed) return { ...attrs, 'data-fixed': undefined };

    return {
      ...attrs,
      'data-fixed': fixed.side,
      'data-fixed-edge': fixed.edge ? fixed.side : undefined,
      style: { '--y-table-fixed-offset': `${fixed.offset}px` },
    };
  }

  function getHeadProps(key: string): Record<string, unknown> {
    const column = effectiveColumns.value.find((item) => item.key === key);

    return withFixedGeometry(getTableHeadAttrs(column, sortState.value.value), key);
  }

  function getCellProps(key: string): Record<string, unknown> {
    const column = effectiveColumns.value.find((item) => item.key === key);

    return withFixedGeometry(getTableCellAttrs(column), key);
  }

  function getSortTriggerProps(key: string): Record<string, unknown> {
    return getTableSortTriggerAttrs(key, sortState.value.value);
  }

  function getExpandTriggerProps(key: string): Record<string, unknown> {
    return getTableExpandTriggerAttrs(isRowExpanded(key), getExpandedRowId(key));
  }

  return {
    columns,
    sortedRows,
    rows,
    sort: sortState.value,
    toggleSort,
    setSort,
    selectedKeys: selectedState.value,
    selectionState,
    selectableKeys,
    isRowSelected,
    isRowSelectable,
    toggleRowSelection,
    toggleAllSelection,
    clearSelection,
    expandedKeys: expandedState.value,
    isRowExpanded,
    toggleRowExpanded,
    fixedOffsets,
    layout,
    colSpan,
    totalColumnWidth,
    resizable: isResizable,
    columnWidths,
    resizingKey,
    setColumnWidth,
    resetColumnWidths,
    startColumnResize,
    getCellSpan,
    getRowProps,
    getHeadProps,
    getCellProps,
    getSortTriggerProps,
    getExpandTriggerProps,
    getExpandedRowId,
  };
}