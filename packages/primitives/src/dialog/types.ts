/**
 * Dialog 原语层类型定义。
 *
 * 该文件仅包含纯数据结构与协议，不依赖任何框架或 DOM API。
 * 所有字段均有明确语义注释，作为跨层通信的稳定契约。
 */

/**
 * Dialog 状态机的当前状态快照。
 */
export interface DialogState {
  /** 对话框是否处于打开状态 */
  open: boolean;

  /** 触发元素的唯一 ID，用于 aria-labelledby 关联 */
  triggerId: string;

  /** 内容区域的唯一 ID，用于 aria-describedby 关联 */
  contentId: string;

  /** 标题元素的唯一 ID，用于 aria-labelledby 关联 */
  titleId: string;

  /** 描述元素的唯一 ID，用于 aria-describedby 关联 */
  descriptionId: string;
}

/**
 * Dialog 状态机可接受的动作类型。
 *
 * 使用判别联合类型确保状态转换的类型安全，
 * 避免非法动作或遗漏必要参数。
 */
export type DialogAction =
  | { type: 'OPEN' }
  | { type: 'CLOSE' }
  | { type: 'TOGGLE' }
  | { type: 'SET_OPEN'; payload: boolean };

/**
 * Dialog 状态机的配置选项。
 */
export interface DialogMachineOptions {
  /** 初始打开状态，默认 false */
  defaultOpen?: boolean;

  /** 按 Escape 键是否关闭对话框，默认 true */
  closeOnEscape?: boolean;

  /** 点击遮罩层是否关闭对话框，默认 true */
  closeOnOverlayClick?: boolean;

  /** 自定义 ID 前缀，用于生成唯一的 ARIA 关联 ID */
  idPrefix?: string;
}

/**
 * Dialog 状态机实例接口。
 *
 * 提供订阅-发布模式的状态管理，不依赖任何响应式系统。
 * 消费者通过 subscribe 监听状态变化，通过 send 触发动作。
 */
export interface DialogMachine {
  /** 获取当前状态的不可变快照 */
  getState(): Readonly<DialogState>;

  /** 发送动作触发状态转换 */
  send(action: DialogAction): void;

  /**
   * 订阅状态变化通知。
   *
   * @param listener 状态变化时调用的回调函数，接收新状态快照。
   * @returns 取消订阅函数，调用后不再接收通知。
   */
  subscribe(listener: (state: Readonly<DialogState>) => void): () => void;

  /** 销毁状态机，清理所有订阅者 */
  destroy(): void;
}

/**
 * Dialog 键盘事件处理上下文。
 *
 * 从 DOM 事件中抽取纯数据，使键盘处理逻辑保持框架无关。
 */
export interface DialogKeyboardContext {
  /** 当前对话框是否打开 */
  isOpen: boolean;

  /** 按 Escape 是否允许关闭 */
  canCloseOnEscape: boolean;
}

/**
 * Dialog 键盘动作结果。
 *
 * 返回纯数据指令，由适配层决定如何执行 DOM 操作。
 */
export interface DialogKeyboardResult {
  /** 是否应关闭对话框 */
  shouldClose: boolean;

  /** 是否已处理该按键事件（调用方决定是否 preventDefault） */
  handled: boolean;
}
