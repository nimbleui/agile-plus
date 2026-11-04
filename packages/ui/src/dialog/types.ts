/**
 * DialogRoot 的组件属性。
 *
 * 与 UseDialogOptions 分离：prop 只接受纯值，响应式由组件内部通过 toRef 交给
 * Composable。若把 MaybeRefOrGetter 直接作为 prop 类型，Vue 会把传入的 Ref
 * 当成值本身，受控状态无法正确回流。
 */
export interface DialogRootProps {
  /**
   * 受控打开状态，传入后进入受控模式。
   *
   * @default undefined
   */
  open?: boolean;

  /**
   * 非受控模式下的初始打开状态。
   *
   * @default false
   */
  defaultOpen?: boolean;

  /**
   * 按 Escape 键是否关闭对话框。
   *
   * @default true
   */
  closeOnEscape?: boolean;

  /**
   * 点击遮罩层是否关闭对话框。
   *
   * @default true
   */
  closeOnOverlayClick?: boolean;

  /**
   * Portal 目标容器，遮罩层与内容区域都传送到这里。
   *
   * 默认 `document.body`。祖先链上有 `transform` / `filter` 时 `position: fixed`
   * 会相对该祖先定位，需要换到更高层的容器；两处必须同目标，否则 z-index 关系失控。
   *
   * @default undefined
   */
  container?: HTMLElement;
}

/**
 * DialogRoot 的事件声明。
 */
export interface DialogRootEmits {
  /** 打开状态变化时触发，配合 v-model:open 使用 */
  'update:open': [value: boolean];
}
