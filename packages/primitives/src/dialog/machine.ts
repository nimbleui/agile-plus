import type {
  DialogAction,
  DialogKeyboardContext,
  DialogKeyboardResult,
  DialogMachine,
  DialogMachineOptions,
  DialogState,
} from './types';

let idCounter = 0;

function generateId(prefix: string): string {
  idCounter += 1;

  return `${prefix}-${idCounter}`;
}

/**
 * 创建 Dialog 状态机实例。
 *
 * 该函数保持框架无关，不包含任何 DOM 操作或响应式绑定。
 * 状态转换逻辑集中在此处，便于独立单元测试和跨框架复用。
 *
 * @param options 状态机配置选项。
 * @returns DialogMachine 实例，提供 getState / send / subscribe / destroy 方法。
 */
export function createDialogMachine(options: DialogMachineOptions = {}): DialogMachine {
  const { defaultOpen = false, idPrefix = 'dialog' } = options;

  let state: DialogState = {
    open: defaultOpen,
    triggerId: generateId(`${idPrefix}-trigger`),
    contentId: generateId(`${idPrefix}-content`),
    titleId: generateId(`${idPrefix}-title`),
    descriptionId: generateId(`${idPrefix}-description`),
  };

  const listeners = new Set<(state: Readonly<DialogState>) => void>();

  function notify(): void {
    const snapshot = Object.freeze({ ...state });

    for (const listener of listeners) {
      listener(snapshot);
    }
  }

  function setState(partial: Partial<DialogState>): void {
    const next = { ...state, ...partial };
    const changed = Object.keys(partial).some(
      (key) => state[key as keyof DialogState] !== next[key as keyof DialogState]
    );

    if (!changed) return;

    state = next;
    notify();
  }

  function handleAction(action: DialogAction): void {
    switch (action.type) {
      case 'OPEN':
        setState({ open: true });
        break;

      case 'CLOSE':
        setState({ open: false });
        break;

      case 'TOGGLE':
        setState({ open: !state.open });
        break;

      case 'SET_OPEN':
        setState({ open: action.payload });
        break;
    }
  }

  function getState(): Readonly<DialogState> {
    return Object.freeze({ ...state });
  }

  function send(action: DialogAction): void {
    handleAction(action);
  }

  function subscribe(listener: (state: Readonly<DialogState>) => void): () => void {
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  }

  function destroy(): void {
    listeners.clear();
  }

  return {
    getState,
    send,
    subscribe,
    destroy,
  };
}

/**
 * 处理 Dialog 相关的键盘事件，返回纯数据指令。
 *
 * 该函数不直接操作 DOM 或调用 preventDefault，
 * 仅根据当前上下文判断应执行的动作，由适配层决定如何执行。
 *
 * @param key 按下的键名（KeyboardEvent.key）。
 * @param context 当前对话框的键盘处理上下文。
 * @returns 键盘动作结果，包含是否应关闭和是否已处理。
 */
export function handleDialogKeydown(
  key: string,
  context: DialogKeyboardContext
): DialogKeyboardResult {
  if (!context.isOpen) {
    return { shouldClose: false, handled: false };
  }

  if (key === 'Escape' && context.canCloseOnEscape) {
    return { shouldClose: true, handled: true };
  }

  return { shouldClose: false, handled: false };
}
