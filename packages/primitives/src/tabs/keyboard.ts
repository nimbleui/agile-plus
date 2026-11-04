import type { TabsKeyboardContext, TabsKeyboardResult } from './types';

/**
 * 处理 Tabs 键盘导航，返回纯数据指令。
 *
 * 遵循 WAI-ARIA Tabs Pattern：
 * - horizontal：Left/Right 箭头切换，Home/End 跳转首尾。
 * - vertical：Up/Down 箭头切换，Home/End 跳转首尾。
 *
 * 该函数不直接操作 DOM 或调用 preventDefault，
 * 仅根据当前上下文判断应执行的动作。
 *
 * @param key 按下的键名（KeyboardEvent.key）。
 * @param context 当前 tabs 的键盘处理上下文。
 * @returns 键盘动作结果。
 */
export function handleTabsKeydown(key: string, context: TabsKeyboardContext): TabsKeyboardResult {
  const { tabValues, focusedValue, orientation, loop = true } = context;

  if (tabValues.length === 0) {
    return { nextFocusedValue: null, shouldActivate: false, handled: false };
  }

  const currentIndex = focusedValue !== null ? tabValues.indexOf(focusedValue) : -1;

  const isHorizontal = orientation === 'horizontal';

  const prevKeys = isHorizontal ? ['ArrowLeft'] : ['ArrowUp'];
  const nextKeys = isHorizontal ? ['ArrowRight'] : ['ArrowDown'];

  let nextIndex: number | null = null;

  if (nextKeys.includes(key)) {
    if (currentIndex < tabValues.length - 1) {
      nextIndex = currentIndex + 1;
    } else if (loop) {
      nextIndex = 0;
    }
  } else if (prevKeys.includes(key)) {
    if (currentIndex > 0) {
      nextIndex = currentIndex - 1;
    } else if (loop) {
      nextIndex = tabValues.length - 1;
    }
  } else if (key === 'Home') {
    nextIndex = 0;
  } else if (key === 'End') {
    nextIndex = tabValues.length - 1;
  }

  if (nextIndex === null) {
    return { nextFocusedValue: null, shouldActivate: false, handled: false };
  }

  return {
    nextFocusedValue: tabValues[nextIndex],
    shouldActivate: true,
    handled: true,
  };
}
