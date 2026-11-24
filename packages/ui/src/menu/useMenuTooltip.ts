import { computed, provide, toValue, watch } from 'vue';

import { useTooltip } from '@agile-plus/headless';

import type { MaybeRefOrGetter } from 'vue';

/** 菜单折叠提示配置。 */
interface UseMenuTooltipOptions {
  /** 是否启用提示；关闭时同时清空内部开合状态。 */
  enabled: MaybeRefOrGetter<boolean>;
  /** 回填实际交互元素。 */
  setElement(node: HTMLElement | null): void;
}

/**
 * 为折叠菜单项复用 Tooltip 的延迟、焦点与 Floating 能力。
 *
 * Tooltip 的 data-state 与菜单项 data-state 同义但取值不同，因此只转发 ARIA 关联，
 * 避免覆盖菜单的 active / open 状态。
 *
 * @param options 启用状态与元素回填入口。
 * @returns 触发器属性、事件与合并后的元素引用。
 */
export function useMenuTooltip(options: UseMenuTooltipOptions) {
  const tooltip = useTooltip({
    open: () => (toValue(options.enabled) ? undefined : false),
    placement: 'right',
    offset: 8,
    flip: true,
    shift: true,
    padding: 8,
    arrow: { size: 8, padding: 4 },
    delayDuration: 300,
  });

  provide('tooltip', tooltip);

  watch(
    () => toValue(options.enabled),
    (enabled) => {
      if (!enabled) tooltip.close();
    }
  );

  const triggerProps = computed(() => {
    const props = tooltip.getTriggerProps();

    delete props['data-state'];

    return props;
  });

  function setReference(node: unknown): void {
    const element = node instanceof HTMLElement ? node : null;

    options.setElement(element);
    tooltip.floating.referenceRef.value = element;
  }

  return {
    triggerProps,
    setReference,
    onPointerEnter: tooltip.onTriggerPointerEnter,
    onPointerLeave: tooltip.onTriggerPointerLeave,
    onFocus: tooltip.onTriggerFocus,
    onBlur: tooltip.onTriggerBlur,
    onKeydown: tooltip.onTriggerKeydown,
  };
}
