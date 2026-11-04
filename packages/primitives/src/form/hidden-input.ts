/**
 * 表单原生控件的共享部分。
 *
 * 无头组件的触发元素是 `<button role="switch|checkbox|radio">`，本身没有表单能力；
 * Radix 对 Checkbox、Radio、Switch 都使用同一套 BubbleInput 方案（覆盖在控件上的
 * 隐藏原生 input + 原生 setter 写值 + 派发事件 + reset 复原），因此这套逻辑在本库
 * 也只该有一份。
 */

/**
 * 被覆盖控件的实测尺寸。
 */
export interface HiddenInputSize {
  /** 宽度，单位像素 */
  width: number;

  /** 高度，单位像素 */
  height: number;
}

/**
 * 隐藏 input 属性表的输入。
 */
export interface HiddenInputAttrsInput {
  /** 原生控件类型，与组件语义一致：开关与复选用 checkbox，单选项用 radio */
  type: 'checkbox' | 'radio';

  /** 表单字段名，未提供时不输出该属性（此时 input 只参与校验不贡献提交值） */
  name?: string;

  /** 提交值 */
  value: string;

  /** 是否禁用 */
  disabled: boolean;

  /** 是否必填 */
  required: boolean;

  /** 显式归属的表单 id */
  form?: string;
}

/**
 * 覆盖在控件之上的隐藏 input 的样式。
 *
 * input 必须排在控件**之后**作为兄弟节点（`<button>` 内不允许再放交互元素），所以用
 * `translateX(-100%)` 把它拉回控件正上方，再用控件的实测尺寸撑满；
 * `pointer-events: none` 保证鼠标仍然落在控件上。
 *
 * 尺寸没测到时不写宽高：写 0px 会让一个零尺寸控件参与布局，而浏览器默认尺寸无害。
 *
 * @param size 控件实测尺寸，未测得时为 null。
 * @returns 可直接用于 :style 的样式对象。
 */
export function getHiddenInputStyle(size: HiddenInputSize | null): Record<string, string> {
  return {
    ...(size ? { width: `${size.width}px`, height: `${size.height}px` } : null),
    position: 'absolute',
    transform: 'translateX(-100%)',
    pointerEvents: 'none',
    opacity: '0',
    margin: '0',
  };
}

/**
 * 隐藏 input 的静态属性表。
 *
 * 这里**不含 `checked`**：选中态由 {@link writeNativeChecked} 直接写 DOM property。
 * 用框架的属性补丁写会把用户刚点下的值在下一次渲染时改回去（尤其受控用法），
 * 也无法表达 Checkbox 的 `indeterminate`——那是 property 而非 attribute。
 *
 * @param input 类型、字段名、提交值、禁用与必填。
 * @returns 可直接 v-bind 的属性集合。
 */
export function getHiddenInputAttrs(input: HiddenInputAttrsInput): Record<string, unknown> {
  const { type, name, value, disabled, required, form } = input;

  return {
    type,
    name: name || undefined,
    value,
    disabled,
    required,
    form: form || undefined,
    tabindex: -1,
    'aria-hidden': 'true',
  };
}

/**
 * 把选中态写进原生 input。
 *
 * 走 `HTMLInputElement.prototype` 上的原始 setter：表单库常在**实例**上覆盖
 * `checked` 来区分「框架写入」与「用户操作」，直接赋值会被它们的状态追踪吞掉。
 * 描述符取不到时（极端环境）退回普通赋值，行为一致只是少了一层绕过。
 *
 * @param input 目标 input。
 * @param checked 是否选中。
 */
export function writeNativeChecked(input: HTMLInputElement, checked: boolean): void {
  const descriptor = Object.getOwnPropertyDescriptor(
    typeof window !== 'undefined' ? window.HTMLInputElement.prototype : Object,
    'checked'
  );
  const setter = descriptor?.set;

  if (typeof setter === 'function') setter.call(input, checked);
  else input.checked = checked;
}
