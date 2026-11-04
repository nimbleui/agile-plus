import { computed, onScopeDispose, ref, toValue, watch } from 'vue';

import { createDialogMachine, handleDialogKeydown } from '@agile-plus/primitives/dialog';

import { useFocusTrap } from '../utils/useFocusTrap';
import { useScrollLock } from '../utils/useScrollLock';

import type { UseDialogOptions, UseDialogReturn } from './types';

/**
 * Dialog 的 Vue Composable 适配。
 *
 * 将 primitives 的状态机桥接到 Vue 响应式系统，
 * 并管理焦点陷阱、滚动锁与 Escape 监听等 DOM 副作用的生命周期。
 * 支持受控与非受控两种模式。
 *
 * @param options Composable 配置选项。
 * @returns 响应式状态、操作方法和属性绑定函数集合。
 */
export function useDialog(options: UseDialogOptions = {}): UseDialogReturn {
  const { defaultOpen = false, closeOnEscape = true, closeOnOverlayClick = true } = options;

  // 受控值保持为响应式来源，避免调用方传入 props 快照后状态无法回流。
  const controlledOpen = computed(() => toValue(options.open));

  const isControlled = computed(() => controlledOpen.value !== undefined);

  const machine = createDialogMachine({
    defaultOpen,
    closeOnEscape,
    closeOnOverlayClick,
  });

  const internalOpen = ref(machine.getState().open);

  const isOpen = computed(() => (isControlled.value ? controlledOpen.value! : internalOpen.value));

  const contentElement = ref<HTMLElement | null>(null);

  /**
   * Portal 目标。
   *
   * 遮罩与内容共用同一个目标，否则两层会落在不同层级、z-index 关系失控。
   * 没给容器时是字符串 'body'，让服务端渲染也能解析，不必等挂载才有值。
   */
  const portalTarget = computed<HTMLElement | 'body'>(() => toValue(options.container) ?? 'body');

  /**
   * 注册内容区域元素。
   *
   * 焦点陷阱需要真实容器；由 UI 层在模板 ref 挂载或卸载时传入。
   */
  function setContentElement(node: unknown): void {
    contentElement.value =
      typeof HTMLElement !== 'undefined' && node instanceof HTMLElement ? node : null;
  }

  useFocusTrap({ active: isOpen, container: contentElement });

  useScrollLock(isOpen);

  const unsubscribe = machine.subscribe((state) => {
    if (!isControlled.value) {
      internalOpen.value = state.open;
    }
  });

  /**
   * 受控值同步进状态机。
   *
   * 状态机本身不驱动受控渲染，但保持其状态与外部一致，
   * 使 keyboard 处理等依赖 getState 的逻辑不会读到过期值。
   */
  watch(
    controlledOpen,
    (value) => {
      if (value !== undefined) {
        machine.send({ type: 'SET_OPEN', payload: value });
      }
    },
    { immediate: true }
  );

  function setOpen(value: boolean): void {
    options.onOpenChange?.(value);

    if (!isControlled.value) {
      machine.send({ type: 'SET_OPEN', payload: value });
    }
  }

  function open(): void {
    setOpen(true);
  }

  function close(): void {
    setOpen(false);
  }

  function toggle(): void {
    setOpen(!isOpen.value);
  }

  function onContentKeydown(event: KeyboardEvent): void {
    const result = handleDialogKeydown(event.key, {
      isOpen: isOpen.value,
      canCloseOnEscape: closeOnEscape,
    });

    if (result.handled) {
      event.preventDefault();
    }

    if (result.shouldClose) {
      close();
    }
  }

  function onOverlayClick(): void {
    if (closeOnOverlayClick) {
      close();
    }
  }

  onScopeDispose(() => {
    unsubscribe();
    machine.destroy();
  });

  const ids = machine.getState();

  function getTriggerProps(): Record<string, unknown> {
    return {
      id: ids.triggerId,
      'aria-haspopup': 'dialog' as const,
      'aria-expanded': isOpen.value,
      'aria-controls': isOpen.value ? ids.contentId : undefined,
    };
  }

  function getContentProps(): Record<string, unknown> {
    return {
      id: ids.contentId,
      role: 'dialog' as const,
      'aria-modal': true,
      'aria-labelledby': ids.titleId,
      'aria-describedby': ids.descriptionId,
      tabindex: -1,
    };
  }

  function getOverlayProps(): Record<string, unknown> {
    return {
      'aria-hidden': true,
    };
  }

  function getTitleProps(): Record<string, unknown> {
    return { id: ids.titleId };
  }

  function getDescriptionProps(): Record<string, unknown> {
    return { id: ids.descriptionId };
  }

  return {
    isOpen,
    open,
    close,
    toggle,
    portalTarget,
    getTriggerProps,
    getContentProps,
    getOverlayProps,
    getTitleProps,
    getDescriptionProps,
    setContentElement,
    onContentKeydown,
    onOverlayClick,
  };
}
