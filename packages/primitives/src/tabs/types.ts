/**
 * Tabs 原语层类型定义。
 *
 * 该文件仅包含纯数据结构与协议，不依赖任何框架或 DOM API。
 * 覆盖 WAI-ARIA Tabs Pattern 所需的全部状态、动作和键盘导航契约。
 */

/**
 * Tabs 激活模式。
 *
 * - automatic：焦点移动到 tab 时自动激活对应面板（推荐默认）。
 * - manual：焦点移动仅改变聚焦项，需按 Enter/Space 才激活面板。
 */
export type TabsActivationMode = 'automatic' | 'manual';

/**
 * Tabs 方向，决定键盘导航行为。
 *
 * - horizontal：左右箭头切换 tab。
 * - vertical：上下箭头切换 tab。
 */
export type TabsOrientation = 'horizontal' | 'vertical';

/**
 * Tabs 状态机的当前状态快照。
 */
export interface TabsState {
  /** 当前激活的 tab value */
  activeValue: string;

  /** 所有已注册 tab 的 value 列表，保持注册顺序 */
  tabValues: string[];

  /**
   * 当前获得焦点的 tab value。
   *
   * 键盘导航只写这个字段；激活值由适配层显式发送 SET_ACTIVE 更新，因此
   * automatic 模式下两者也可能短暂不同（例如受控值尚未由外部回填时）。
   */
  focusedValue: string | null;

  /** 激活模式 */
  activationMode: TabsActivationMode;

  /** 布局方向 */
  orientation: TabsOrientation;
}

/**
 * Tabs 状态机可接受的动作类型。
 */
export type TabsAction =
  | { type: 'SET_ACTIVE'; payload: string }
  | { type: 'REGISTER_TAB'; payload: string }
  | { type: 'UNREGISTER_TAB'; payload: string }
  | { type: 'FOCUS_TAB'; payload: string }
  | { type: 'NAVIGATE_NEXT' }
  | { type: 'NAVIGATE_PREV' }
  | { type: 'NAVIGATE_FIRST' }
  | { type: 'NAVIGATE_LAST' }
  | { type: 'ACTIVATE_FOCUSED' };

/**
 * Tabs 状态机的配置选项。
 */
export interface TabsMachineOptions {
  /** 默认激活的 tab value */
  defaultValue?: string;

  /** 激活模式，默认 automatic */
  activationMode?: TabsActivationMode;

  /** 布局方向，默认 horizontal */
  orientation?: TabsOrientation;
}

/**
 * Tabs 状态机实例接口。
 */
export interface TabsMachine {
  /** 获取当前状态的不可变快照 */
  getState(): Readonly<TabsState>;

  /** 发送动作触发状态转换 */
  send(action: TabsAction): void;

  /**
   * 订阅状态变化通知。
   *
   * @param listener 状态变化时调用的回调函数。
   * @returns 取消订阅函数。
   */
  subscribe(listener: (state: Readonly<TabsState>) => void): () => void;

  /** 销毁状态机，清理所有订阅者 */
  destroy(): void;
}

/**
 * Tabs 键盘事件处理上下文。
 *
 * 从 DOM 事件中抽取纯数据，使键盘处理逻辑保持框架无关。
 */
export interface TabsKeyboardContext {
  /** 当前所有已注册 tab 的 value 列表 */
  tabValues: string[];

  /** 当前获得焦点的 tab value */
  focusedValue: string | null;

  /** 布局方向 */
  orientation: TabsOrientation;

  /** 是否支持循环导航（到达末尾后回到开头） */
  loop?: boolean;
}

/**
 * Tabs 键盘动作结果。
 *
 * 返回纯数据指令，由适配层决定如何执行 DOM 操作。
 */
export interface TabsKeyboardResult {
  /** 应聚焦到的 tab value，null 表示无需移动焦点 */
  nextFocusedValue: string | null;

  /** 是否应激活该 tab（automatic 模式下跟随焦点） */
  shouldActivate: boolean;

  /** 是否已处理该按键事件 */
  handled: boolean;
}
