<script setup lang="ts">
import { computed, ref } from 'vue';

import {
  TableBody,
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
  resolveTableCssSize,
  resolveTableLayout,
} from '@agile-plus/ui/table';

import type { TableColumn, TableRowData, TableSortState } from '@agile-plus/ui/table';

import type { TableProps } from './types';

/**
 * 带样式的配置驱动表格。
 *
 * 状态与行为全部委托给 ui 层 Root（再到 headless / primitives），本层只做三件事：
 * 1. 替消费者完成 colgroup / 表头 / 表体 / 空态的 v-for 装配；
 * 2. 把 stripe / border / size / loading / height 等纯视觉属性落成命名空间类与 CSS Variable；
 * 3. 开放 cell-{key} / head-{key} / expanded / empty / footer 插槽供自定义渲染。
 *
 * 列宽、表体高度与布局算法是纯几何计算，经 ui 层公开出口转发的 primitives 纯函数消费
 * （本包只直接依赖 ui，pnpm 不链接传递依赖），不绕经 headless 增加无状态转发。
 * 需要完全自定义结构时绕过本组件、自行装配 `@agile-plus/ui/table` 的复合部件即可。
 */
const props = withDefaults(defineProps<TableProps>(), {
  data: () => [],
  columns: () => [],
  rowKey: undefined,
  selection: false,
  isRowSelectable: undefined,
  expandable: false,
  resizable: false,
  spanMethod: undefined,
  sort: undefined,
  defaultSort: undefined,
  selectedKeys: undefined,
  defaultSelectedKeys: undefined,
  expandedKeys: undefined,
  defaultExpandedKeys: undefined,
  stripe: false,
  border: false,
  size: 'middle',
  loading: false,
  height: undefined,
  maxHeight: undefined,
  emptyText: '暂无数据',
  showHeader: true,
  ariaLabel: undefined,
});

const emit = defineEmits<{
  'update:sort': [value: TableSortState | null];
  'update:selectedKeys': [value: string[]];
  'update:expandedKeys': [value: string[]];
  columnResize: [key: string, width: number];
  rowClick: [item: { row: TableRowData; key: string; index: number }, event: MouseEvent];
  rowDblclick: [item: { row: TableRowData; key: string; index: number }, event: MouseEvent];
}>();

/** 只把状态与数据侧参数交给 Root，视觉属性留在本层，避免变成 Root 上的无效 attr。 */
const rootProps = computed(() => ({
  data: props.data,
  columns: props.columns,
  rowKey: props.rowKey,
  selection: props.selection,
  isRowSelectable: props.isRowSelectable,
  expandable: props.expandable,
  resizable: props.resizable,
  spanMethod: props.spanMethod,
  sort: props.sort,
  defaultSort: props.defaultSort,
  selectedKeys: props.selectedKeys,
  defaultSelectedKeys: props.defaultSelectedKeys,
  expandedKeys: props.expandedKeys,
  defaultExpandedKeys: props.defaultExpandedKeys,
  ariaLabel: props.ariaLabel,
}));

const rootClass = computed(() => [
  'y-table',
  `y-table--${props.size}`,
  { 'y-table--stripe': props.stripe, 'y-table--border': props.border },
]);

/**
 * 高度与布局算法落成 CSS Variable，具体样式由 SCSS 读取，JS 只提供了计算出的值。
 * 启用拖拽改宽时强制 fixed 布局：sticky 偏移与拖拽都依赖确定的列宽。
 * 表格的像素 min-width 由 Root 按列宽总和下发（见 headless totalColumnWidth），
 * 列宽总和超出容器时 min-width 压过 width:100% 产生横向滚动，固定列才有意义。
 */
const rootStyle = computed(() => ({
  '--y-table-height': resolveTableCssSize(props.height),
  '--y-table-max-height': resolveTableCssSize(props.maxHeight),
  '--y-table-layout': props.resizable ? 'fixed' : resolveTableLayout(props.columns),
}));

const rootRef = ref<{ resetColumnWidths: () => void } | null>(null);

/** 清空拖拽产生的列宽覆盖，回到列模型配置。 */
function resetColumnWidths(): void {
  rootRef.value?.resetColumnWidths();
}

function cellValue(row: TableRowData, column: TableColumn): string {
  const value = row[column.dataIndex ?? column.key];

  return value === null || value === undefined ? '' : String(value);
}

defineExpose({ resetColumnWidths });
</script>

<template>
  <div
    :class="rootClass"
    :style="rootStyle"
    :aria-busy="props.loading || undefined"
    :data-loading="props.loading ? '' : undefined"
  >
    <TableRoot
      ref="rootRef"
      v-bind="rootProps"
      @update:sort="(value) => emit('update:sort', value)"
      @update:selected-keys="(value) => emit('update:selectedKeys', value)"
      @update:expanded-keys="(value) => emit('update:expandedKeys', value)"
      @column-resize="(key, width) => emit('columnResize', key, width)"
    >
      <template #default="{ columnWidths }">
        <colgroup>
          <col v-if="props.selection" data-part="col-selection" />
          <col v-if="props.expandable" data-part="col-expand" />
          <col
            v-for="column in props.columns"
            :key="column.key"
            :style="{ width: columnWidths[column.key] }"
          />
        </colgroup>

        <TableHeader v-if="props.showHeader">
          <TableRow>
            <TableSelectionHead v-if="props.selection" />
            <TableHead v-if="props.expandable" />
            <TableHead v-for="column in props.columns" :key="column.key" :column="column.key">
              <slot :name="`head-${column.key}`" :column="column">{{ column.title }}</slot>
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody v-slot="{ rows }">
          <template v-for="item in rows" :key="item.key">
            <TableRow
              v-if="item.type === 'data'"
              :item="item"
              :data-striped="props.stripe && item.index % 2 === 1 ? '' : undefined"
              @row-click="(entry, event) => emit('rowClick', entry, event)"
              @row-dblclick="(entry, event) => emit('rowDblclick', entry, event)"
            >
              <TableSelectionCell v-if="props.selection" :item="item" />
              <TableCell v-if="props.expandable">
                <TableExpandTrigger :item="item">
                  <span data-part="expand-icon" aria-hidden="true" />
                </TableExpandTrigger>
              </TableCell>
              <TableCell
                v-for="column in props.columns"
                :key="column.key"
                :column="column.key"
                :row="item.row"
                :row-index="item.index"
              >
                <slot :name="`cell-${column.key}`" :row="item.row" :column="column" :index="item.index">
                  {{ cellValue(item.row, column) }}
                </slot>
              </TableCell>
            </TableRow>

            <TableExpandedRow v-else :item="item">
              <slot name="expanded" :row="item.row" :index="item.index" />
            </TableExpandedRow>
          </template>

          <TableEmpty v-if="rows.length === 0">
            <slot name="empty">{{ props.emptyText }}</slot>
          </TableEmpty>
        </TableBody>

        <TableFooter v-if="$slots.footer">
          <slot name="footer" />
        </TableFooter>
      </template>
    </TableRoot>

    <div v-if="props.loading" data-part="loading-mask" role="status" aria-label="加载中">
      <span data-part="spinner" aria-hidden="true" />
    </div>
  </div>
</template>

<style lang="scss">
@use './Table.scss';
</style>