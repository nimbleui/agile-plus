import type { TabsAction, TabsMachine, TabsMachineOptions, TabsState } from './types';

/**
 * 创建 Tabs 状态机实例。
 *
 * 管理 tab 注册/注销、激活值切换、焦点导航等核心逻辑。
 * 不包含任何 DOM 操作或响应式绑定，可独立单元测试。
 *
 * @param options 状态机配置选项。
 * @returns TabsMachine 实例。
 */
export function createTabsMachine(options: TabsMachineOptions = {}): TabsMachine {
  const { defaultValue = '', activationMode = 'automatic', orientation = 'horizontal' } = options;

  let state: TabsState = {
    activeValue: defaultValue,
    tabValues: [],
    focusedValue: null,
    activationMode,
    orientation,
  };

  const listeners = new Set<(state: Readonly<TabsState>) => void>();

  function notify(): void {
    const snapshot = Object.freeze({ ...state, tabValues: [...state.tabValues] });

    for (const listener of listeners) {
      listener(snapshot);
    }
  }

  function setState(partial: Partial<TabsState>): void {
    const next = { ...state, ...partial };
    const changed = Object.keys(partial).some((key) => {
      const k = key as keyof TabsState;

      if (k === 'tabValues') {
        return JSON.stringify(state.tabValues) !== JSON.stringify(next.tabValues);
      }

      return state[k] !== next[k];
    });

    if (!changed) return;

    state = next;
    notify();
  }

  function handleAction(action: TabsAction): void {
    switch (action.type) {
      case 'SET_ACTIVE': {
        setState({ activeValue: action.payload, focusedValue: action.payload });
        break;
      }

      case 'REGISTER_TAB': {
        if (state.tabValues.includes(action.payload)) return;

        const nextValues = [...state.tabValues, action.payload];
        const nextActive = state.activeValue || action.payload;

        setState({
          tabValues: nextValues,
          activeValue: nextActive,
          focusedValue: state.focusedValue ?? nextActive,
        });
        break;
      }

      case 'UNREGISTER_TAB': {
        const nextValues = state.tabValues.filter((v) => v !== action.payload);
        let nextActive = state.activeValue;
        let nextFocused = state.focusedValue;

        if (nextActive === action.payload) {
          nextActive = nextValues[0] ?? '';
        }

        if (nextFocused === action.payload) {
          nextFocused = nextActive;
        }

        setState({
          tabValues: nextValues,
          activeValue: nextActive,
          focusedValue: nextFocused,
        });
        break;
      }

      case 'FOCUS_TAB': {
        // 焦点与激活值解耦：键盘导航只写 focusedValue，automatic 模式下的激活动作
        // 由适配层另发 SET_ACTIVE。这样受控值始终只经 onValueChange 改变。
        setState({ focusedValue: action.payload });

        break;
      }

      case 'NAVIGATE_NEXT': {
        // 空列表必须与 FIRST/LAST 一样直接返回：tabValues[0] 是 undefined，写进 state 会让
        // activeValue: string 与 focusedValue: string | null 两个契约同时失真，
        // 下游所有 `focusedValue === null` 的判断都会漏掉这一态。
        if (state.tabValues.length === 0) return;

        const idx = state.focusedValue !== null ? state.tabValues.indexOf(state.focusedValue) : -1;
        const nextIdx = idx < state.tabValues.length - 1 ? idx + 1 : 0;
        const nextFocused = state.tabValues[nextIdx];

        if (state.activationMode === 'automatic') {
          setState({ focusedValue: nextFocused, activeValue: nextFocused });
        } else {
          setState({ focusedValue: nextFocused });
        }

        break;
      }

      case 'NAVIGATE_PREV': {
        if (state.tabValues.length === 0) return;

        const idx = state.focusedValue !== null ? state.tabValues.indexOf(state.focusedValue) : 0;
        const prevIdx = idx > 0 ? idx - 1 : state.tabValues.length - 1;
        const prevFocused = state.tabValues[prevIdx];

        if (state.activationMode === 'automatic') {
          setState({ focusedValue: prevFocused, activeValue: prevFocused });
        } else {
          setState({ focusedValue: prevFocused });
        }

        break;
      }

      case 'NAVIGATE_FIRST': {
        // 空串也是合法的 tabValue，不能用 falsy 判断，否则头尾是空串时导航会被吞掉。
        if (state.tabValues.length === 0) return;

        const first = state.tabValues[0];

        if (state.activationMode === 'automatic') {
          setState({ focusedValue: first, activeValue: first });
        } else {
          setState({ focusedValue: first });
        }

        break;
      }

      case 'NAVIGATE_LAST': {
        if (state.tabValues.length === 0) return;

        const last = state.tabValues[state.tabValues.length - 1];

        if (state.activationMode === 'automatic') {
          setState({ focusedValue: last, activeValue: last });
        } else {
          setState({ focusedValue: last });
        }

        break;
      }

      case 'ACTIVATE_FOCUSED': {
        if (state.focusedValue !== null) {
          setState({ activeValue: state.focusedValue });
        }

        break;
      }
    }
  }

  function getState(): Readonly<TabsState> {
    return Object.freeze({ ...state, tabValues: [...state.tabValues] });
  }

  function send(action: TabsAction): void {
    handleAction(action);
  }

  function subscribe(listener: (state: Readonly<TabsState>) => void): () => void {
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
