import type { ComputedRef, MaybeRefOrGetter, Ref } from 'vue';

/**
 * useDialog Composable 的配置选项。
 *
 * 同时支持受控与非受控两种模式：
 * - 非受控：仅传 defaultOpen，内部维护状态。
 * - 受控：传入 open + onOpenChange，外部控制状态。
 */
export interface UseDialogOptions {
  /**
   * 受控打开状态，传入后进入受控模式。
   *
   * 使用 MaybeRefOrGetter 而非裸 boolean：组件封装层传入了响应式 props，
   * 裸值会在展开时固化为快照，导致外部状态变化后 isOpen 不再更新。
   */
  open?: MaybeRefOrGetter<boolean | undefined>;

  /** 非受控模式下的默认打开状态，默认 false */
  defaultOpen?: boolean;

  /** 打开状态变化回调，受控模式下必须提供 */
  onOpenChange?: (open: boolean) => void;

  /** 按 Escape 键是否关闭对话框，默认 true */
  closeOnEscape?: boolean;

  /** 点击遮罩层是否关闭对话框，默认 true */
  closeOnOverlayClick?: boolean;

  /**
   * Portal 目标容器，遮罩层与内容区域都传送到这里，默认 `document.body`。
   *
   * 两者必须共用一个目标：分别指定会让遮罩与内容落在不同层级，z-index 关系就不再
   * 由组件保证。祖先链上有 `transform` / `filter` 时 `position: fixed` 会相对该祖先
   * 定位，这时把目标换成 body 之外的高层容器才能撑满视口。
   */
  container?: MaybeRefOrGetter<HTMLElement | null | undefined>;
}

/**
 * useDialog Composable 的返回值。
 *
 * 只暴露调用方真正需要的 API，隐藏内部状态机实例。
 *
 * 契约说明：get*Props 只返回可 v-bind 的 ARIA 与 id 属性，事件处理器单独暴露。
 * 在 Vue 中事件必须通过 v-on 显式绑定，混入 v-bind 对象不会被注册为监听器；
 * 分离后消费者也能在自己的 @click / @keydown 中复用这些处理器。
 */
export interface UseDialogReturn {
  /** 当前是否打开（响应式） */
  isOpen: Ref<boolean>;

  /** 打开对话框 */
  open(): void;

  /** 关闭对话框 */
  close(): void;

  /** 切换打开状态 */
  toggle(): void;

  /** 获取触发元素需要绑定的 ARIA 属性 */
  getTriggerProps(): Record<string, unknown>;

  /** 获取内容区域需要绑定的 ARIA 属性 */
  getContentProps(): Record<string, unknown>;

  /** 获取遮罩层需要绑定的 ARIA 属性 */
  getOverlayProps(): Record<string, unknown>;

  /**
   * 获取标题元素需要绑定的属性。
   *
   * 包含 id，用于与内容区域的 aria-labelledby 关联。
   */
  getTitleProps(): Record<string, unknown>;

  /**
   * 获取描述元素需要绑定的属性。
   *
   * 包含 id，用于与内容区域的 aria-describedby 关联。
   */
  getDescriptionProps(): Record<string, unknown>;

  /**
   * Teleport 目标：`container` 或 body。
   *
   * 遮罩层与内容区域都读这一个值，保证两层始终处于同一层级。
   */
  portalTarget: ComputedRef<HTMLElement | 'body'>;

  /**
   * 注册内容区域元素。
   *
   * 焦点陷阱依赖真实容器；`DialogContent` 在模板 ref 挂载或卸载时调用。
   */
  setContentElement(node: unknown): void;

  /**
   * 内容区域键盘处理器，绑定到内容容器的 @keydown。
   *
   * @param event 原生键盘事件。
   */
  onContentKeydown(event: KeyboardEvent): void;

  /** 遮罩层点击处理器，绑定到遮罩层的 @click */
  onOverlayClick(): void;
}
