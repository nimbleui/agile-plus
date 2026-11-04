import { TOAST_ANNOUNCE_ALT_ATTR, TOAST_ANNOUNCE_EXCLUDE_ATTR } from './types';

/**
 * 视觉隐藏但保留给读屏与键盘focus 的内联样式。
 *
 * 用内联而不是 class：announcer 与焦点代理会被 portal 到 body 下的独立位置，无样式
 * 层必须也能工作；消费者忘记引入样式时，最坏结果只是「看不见但仍可读屏」，而不是
 * 一块遮挡页面的可见文字。这与 Radix 的 VisuallyHidden 同一取舍。
 */
export const VISUALLY_HIDDEN_STYLE: Readonly<Record<string, string>> = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: '0',
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: '0',
};

/**
 * 判断元素是否对朗读隐藏。
 *
 * 用 `getAttribute('aria-hidden')` 而不是 `el.ariaHidden`：ARIA 反射属性在部分
 * 浏览器与 jsdom 上不存在，读属性是唯一可靠的判断方式。
 *
 * @param element 待检查元素。
 * @returns true 表示该子树整体不贡献任何朗读文本。
 */
function isHiddenFromScreenReader(element: HTMLElement): boolean {
  return (
    element.hidden ||
    element.getAttribute('aria-hidden') === 'true' ||
    element.style.display === 'none'
  );
}

/**
 * 收集通知内需要被朗读的文本片段。
 *
 * 通知本体是 portal 进 viewport 的，announcer 无法复用它的 DOM，只能把文本重新
 * 抄写一份到独立的 `role="status"` 区域。两个规则决定了这里必须是遍历而不是直接
 * 取 `textContent`：
 *
 * 1. Action/Close 按钮被 `data-toast-announce-exclude` 标记，可见文案（「撤销」）
 *    对读屏用户没有意义，改读 `altText` 提供的完整指令（「前往账户设置升级」）。
 * 2. 返回值是片段数组而不是拼接后的字符串，让读屏引擎在片段之间自然停顿。
 *
 * 该函数只读取传入容器的 DOM，不依赖任何框架。
 *
 * @param container 通知根元素。
 * @returns 按文档顺序排列的文本片段，可能为空数组。
 */
export function getToastAnnounceTextContent(container: HTMLElement): string[] {
  const textContent: string[] = [];

  const collect = (node: ParentNode): void => {
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE && child.textContent) {
        textContent.push(child.textContent);
        return;
      }

      if (!(child instanceof HTMLElement)) return;

      if (isHiddenFromScreenReader(child)) return;

      const isExcluded = child.getAttribute(TOAST_ANNOUNCE_EXCLUDE_ATTR) === '';

      if (isExcluded) {
        const altText = child.getAttribute(TOAST_ANNOUNCE_ALT_ATTR);

        if (altText) textContent.push(altText);

        return;
      }

      collect(child);
    });
  };

  collect(container);

  return textContent;
}
