/**
 * 与框架无关的焦点工具。
 *
 * 放在 `dom` 而不是某个组件目录下，因为「哪些元素能被 Tab 到」是页面级事实，
 * 与 Toast、Dialog、ToggleGroup 这些具体组件无关；各组件只在「按什么顺序挑」上
 * 有不同策略，挑选本身应该只有一个人实现。
 */

/**
 * 判断元素是否被排除在焦点可达性之外。
 *
 * 用 attribute 而不是 property 读 disabled：HTMLElement 基类型上没有 disabled 字段，
 * 读 property 必须像 Radix 那样断言 any；能被 Tab 到的控件其禁用状态都来自模板声明。
 * `aria-hidden` 同样读 attribute——ARIA 反射属性在部分环境与 jsdom 上不存在。
 *
 * @param element 待判断元素。
 * @returns true 表示该元素及其子树都不应成为候选。
 */
function isUnreachable(element: HTMLElement): boolean {
  const isHiddenInput = element.tagName === 'INPUT' && element.getAttribute('type') === 'hidden';

  return (
    element.hasAttribute('disabled') ||
    element.hidden ||
    element.getAttribute('aria-hidden') === 'true' ||
    isHiddenInput
  );
}

/**
 * 按文档顺序收集容器内可 Tab 到达的元素。
 *
 * 这是一次近似而不是完整实现：`display:none`、被遮挡等要运行时布局才能判断的情况
 * 不在此列（Radix 同样如此），不可聚焦的候选交给 {@link focusFirst} 在真正 focus 后
 * 检查 activeElement 是否变化来兜住。命中禁用或 `aria-hidden` 子树时用 REJECT 而不是
 * SKIP：整棵子树都不该贡献候选。
 *
 * @param container 搜索起点容器。
 * @returns 候选元素列表。
 */
export function getTabbableCandidates(container: HTMLElement): HTMLElement[] {
  const nodes: HTMLElement[] = [];

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_ELEMENT, {
    acceptNode: (node: Node) => {
      const element = node as HTMLElement;

      if (isUnreachable(element)) return NodeFilter.FILTER_REJECT;

      // tabIndex 属性与 tabIndex 不同：后者是运行时算出的可聚焦性，已经覆盖了
      // 「<button> 默认可聚焦」这类规则。
      return element.tabIndex >= 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    },
  });

  while (walker.nextNode()) {
    nodes.push(walker.currentNode as HTMLElement);
  }

  return nodes;
}

/**
 * 依次尝试聚焦候选元素，直到焦点真的落到某一个上。
 *
 * 逐个 `focus()` 后立刻检查 `document.activeElement` 是否变化，可以跳过那些
 * 「看起来能聚焦、实际被隐藏」的元素。一旦命中就停止，把这个事实返回给调用方决定
 * 是否 `preventDefault()`。候选已经按期望顺序排好，方向策略不属于这里。
 *
 * @param candidates 按期望顺序排列的候选元素。
 * @param preventScroll 是否阻止聚焦引起的滚动（焦点陷阱内不希望页面跳动）。
 * @returns 焦点是否已落在某个候选上。
 */
export function focusFirst(candidates: HTMLElement[], preventScroll = false): boolean {
  const previouslyFocused = document.activeElement;

  return candidates.some((candidate) => {
    if (candidate === previouslyFocused) return true;

    candidate.focus({ preventScroll });

    return document.activeElement !== previouslyFocused;
  });
}
