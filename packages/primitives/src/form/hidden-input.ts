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
 * 覆盖在触发元素之上的隐藏原生 select 的样式。
 *
 * 与 {@link getHiddenInputStyle} 的差别只在定位方式，而这条差别是必须的：input 用
 * `translateX(-100%)` 从「控件之后的静态位置」拉回来，前提是父级是普通流。Select 的
 * 成品层外壳是 flex 容器，绝对定位子元素的静态位置落在内容盒起点，再平移一个宽度
 * 会跑到容器**外面**，原生校验气泡就会指到无关的地方。因此这里直接用 top/left 归零，
 * 以最近的定位祖先为基准覆盖。
 *
 * 尺寸没测到时不写宽高：写 0px 会让一个零尺寸控件参与布局，而浏览器默认尺寸无害。
 *
 * @param size 触发元素实测尺寸，未测得时为 null。
 * @returns 可直接用于 :style 的样式对象。
 */
export function getHiddenSelectStyle(size: HiddenInputSize | null): Record<string, string> {
  return {
    ...(size ? { width: `${size.width}px`, height: `${size.height}px` } : null),
    position: 'absolute',
    top: '0',
    left: '0',
    pointerEvents: 'none',
    opacity: '0',
    margin: '0',
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
  const setter = getNativeSetter<boolean>('HTMLInputElement', 'checked');

  if (typeof setter === 'function') setter.call(input, checked);
  else input.checked = checked;
}

/**
 * 把选中值写进原生 select。
 *
 * 与 {@link writeNativeChecked} 同理走原型上的原始 setter：表单库常在实例上覆盖
 * `value` 来区分「框架写入」与「用户操作」，直接赋值会被它们的状态追踪吞掉。
 *
 * 值不在任何 option 里时浏览器会把 selectedIndex 置为 -1、value 变成空串，这正是
 * 「未选择」的表达，因此调用方不必先保证选项已渲染。
 *
 * @param select 目标 select。
 * @param value 要选中的值；空字符串表示清空选择。
 */
export function writeNativeSelectValue(select: HTMLSelectElement, value: string): void {
  const setter = getNativeSetter<string>('HTMLSelectElement', 'value');

  if (typeof setter === 'function') setter.call(select, value);
  else select.value = value;
}

/**
 * 取原生控件 property 的原始 setter。
 *
 * 描述符取不到时（极端环境 / SSR）返回 undefined，由调用方退回普通赋值，行为一致
 * 只是少了一层绕过。构造器名以字符串传入，避免在 node 环境直接读 window。
 *
 * @template T 该 property 的值类型，让调用处不必断言。
 */
function getNativeSetter<T>(
  constructorName: 'HTMLInputElement' | 'HTMLSelectElement',
  property: string
): ((this: unknown, value: T) => void) | undefined {
  if (typeof window === 'undefined') return undefined;

  const constructor = window[constructorName];

  return Object.getOwnPropertyDescriptor(constructor?.prototype ?? Object, property)?.set;
}
