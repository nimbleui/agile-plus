<script setup lang="ts">
import { computed } from 'vue';

import { useComponentContext } from '../context';
import { Slot } from '../slot';

import type { SplitterBarControl } from '@agile-plus/primitives/splitter';

import type { SplitterBarProps } from './types';

/**
 * 分隔条。
 *
 * 通常由 SplitterPanel 自动画在两个面板之间，作者不需要手写它。它同时是三件事的落点：
 * 拖拽热区（`role="separator"` 且可聚焦，方向键与 Home / End 直接调尺寸）与折叠箭头。
 *
 * 箭头是 `<button tabindex="-1">`：鼠标有一个真正的按钮，键盘用户则用分隔条自己的方向键，
 * 不再多占一个 Tab 停靠点。箭头图形由样式层用伪元素画，这层只给 `data-edge` 与
 * `data-collapsed` 两个状态钩子。
 */
defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<SplitterBarProps>(), {
  as: 'div',
  asChild: false,
});

const splitter = useComponentContext('splitter');

const barAttrs = computed(() => splitter.getBarProps(props.barId));

const barStyle = computed(() => splitter.getBarStyle(props.barId));

const controls = computed(() => splitter.getBarControls(props.barId));

function onPointerdown(event: PointerEvent): void {
  splitter.onBarPointerDown(event, props.barId);
}

function onKeydown(event: KeyboardEvent): void {
  splitter.onBarKeydown(event, props.barId);
}

function onDblclick(): void {
  splitter.onBarDoubleClick(props.barId);
}

/**
 * 折叠箭头按下。
 *
 * 指针事件与双击都必须就地拦下，否则冒泡到分隔条会同时启动一次拖拽或一次复位，
 * 点一下箭头就把面板拖动或重置了。
 *
 * @param event 原生指针事件。
 */
function onControlPointerdown(event: PointerEvent): void {
  event.stopPropagation();
}

/**
 * 触发该按钮对应的折叠或还原。
 *
 * @param control 按钮描述（面板下标与归属边）。
 */
function onControlClick(control: SplitterBarControl): void {
  splitter.toggleCollapse(control.panelIndex, control.edge);
}
</script>

<template>
  <Slot
    :as="props.as"
    :as-child="props.asChild"
    v-bind="{ ...barAttrs, ...$attrs }"
    :style="barStyle"
    @pointerdown="onPointerdown"
    @keydown="onKeydown"
    @dblclick="onDblclick"
  >
    <button
      v-for="control in controls"
      :key="`${control.panelIndex}-${control.edge}`"
      type="button"
      tabindex="-1"
      data-part="bar-control"
      :data-edge="control.edge"
      :data-collapsed="control.collapsed ? '' : undefined"
      :data-always="control.always ? '' : undefined"
      :aria-label="control.collapsed ? '展开面板' : '收起面板'"
      @pointerdown="onControlPointerdown"
      @dblclick.stop
      @click="onControlClick(control)"
    >
      <span data-part="bar-icon" aria-hidden="true"></span>
    </button>
    <slot :controls="controls" />
  </Slot>
</template>
