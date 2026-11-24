import { computed, onScopeDispose, toValue } from 'vue';

import { normalizeSplitterCollapsible } from '@agile-plus/primitives/splitter';

import { useControllable } from '../utils/useControllable';

import type { SplitterPanelStyles, SplitterSizeInput } from '@agile-plus/primitives/splitter';

import type {
  SplitterPanelEntry,
  UseSplitterPanelOptions,
  UseSplitterPanelReturn,
  UseSplitterReturn,
} from './types';

/**
 * Splitter 面板的 Vue Composable 适配。
 *
 * 面板只持有自己的**作者单位**（受控 `size` 或非受控内部值）与约束，几何一律交给根：
 * 一次拖拽同时改变相邻两个面板，尺寸真源分散在两处就会出现「写完再解析对不上」的漂移。
 * 因此这里做的是把本面板的读写口包成条目登记进根的集合，顺序即 DOM 顺序。
 *
 * 条目里全是 ComputedRef 而不是快照：根在拖拽过程中要读当下最新的 min / max / 禁用态，
 * 消费者完全可能在拖拽间隙改这些 prop。
 *
 * @param options 面板尺寸、约束、折叠能力与回调。
 * @param splitter 所在分隔面板的根实例。
 * @returns 面板下标、折叠态与部件属性、样式。
 */
export function useSplitterPanel(
  options: UseSplitterPanelOptions,
  splitter: UseSplitterReturn
): UseSplitterPanelReturn {
  const disabled = computed(() => splitter.disabled.value || toValue(options.disabled) === true);

  const resizable = computed(() => toValue(options.resizable) !== false);

  const min = computed(() => toValue(options.min) ?? 0);

  const max = computed(() => toValue(options.max));

  const collapsible = computed(() => normalizeSplitterCollapsible(toValue(options.collapsible)));

  const state = useControllable<SplitterSizeInput>({
    value: () => toValue(options.size),
    // 受控值同时作为初值：`v-model:size` 从 300 起步时，非受控分支不该从自适应起步。
    defaultValue: toValue(options.size) ?? toValue(options.defaultSize),
    onChange: (next) => options.onSizeChange?.(next),
  });

  /** 双击复位的落点：挂载那一刻的作者单位，之后消费者再怎么改 `size` 都不回头追。 */
  const initialUnit = toValue(options.size) ?? toValue(options.defaultSize);

  const entry: SplitterPanelEntry = {
    id: options.id,
    unit: state.value,
    initialUnit,
    min,
    max,
    resizable,
    disabled,
    collapsible,
    setUnit: (next) => state.set(next),
  };

  const unregister = splitter.registerPanel(entry);

  onScopeDispose(unregister);

  const index = computed(() => splitter.getPanelIndex(options.id));

  const collapsed = computed(() => splitter.collapsedFlags.value[index.value] === true);

  const hasNext = computed(() => index.value >= 0 && index.value < splitter.panelCount.value - 1);

  function getPanelProps(): Record<string, unknown> {
    return {
      'data-part': 'panel',
      'data-index': index.value,
      'data-layout': splitter.layout.value,
      'data-collapsed': collapsed.value ? '' : undefined,
      'data-disabled': disabled.value ? '' : undefined,
    };
  }

  function getPanelStyle(): SplitterPanelStyles {
    return splitter.getPanelStyle(index.value);
  }

  function getPanelSize(): number | null {
    if (!splitter.measured.value) return null;

    return splitter.sizes.value[index.value] ?? null;
  }

  return {
    index,
    collapsed,
    hasNext,
    disabled,
    resizable,
    getPanelProps,
    getPanelStyle,
    getPanelSize,
  };
}
