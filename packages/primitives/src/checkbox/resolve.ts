import type { CheckboxAttrs, CheckboxCheckedState, CheckboxConfig } from './types';

/**
 * `checked` 三态到 `aria-checked` 与 `data-state` 的映射表。
 *
 * 用显式查表而不是 if 分支：三态是封闭集合，表结构让「漏掉某一态」在类型检查下
 * 无法通过，比阅读分支更容易发现新增状态时的遗漏。
 */
const CHECKED_ATTRS = {
  true: { 'aria-checked': 'true', 'data-state': 'checked' },
  false: { 'aria-checked': 'false', 'data-state': 'unchecked' },
  indeterminate: { 'aria-checked': 'mixed', 'data-state': 'indeterminate' },
} as const satisfies Record<string, Pick<CheckboxAttrs, 'aria-checked' | 'data-state'>>;

/**
 * 计算 Checkbox 触发元素需要绑定的 ARIA 与 data-* 属性。
 *
 * 未提供的布尔字段一律不产出键，而不是补 `="false"`：属性缺失时浏览器与样式层保持
 * 默认行为，同时避免在 DOM 上留下永不变的噪声属性。
 *
 * @param config 当前选中状态与可选的禁用、必选标记。
 * @returns 可直接 v-bind 的属性集合。
 */
export function getCheckboxAttrs(config: CheckboxConfig): CheckboxAttrs {
  const { checked, disabled, required } = config;

  const mapped =
    checked === 'indeterminate'
      ? CHECKED_ATTRS.indeterminate
      : checked
        ? CHECKED_ATTRS.true
        : CHECKED_ATTRS.false;

  const attrs: CheckboxAttrs = {
    'aria-checked': mapped['aria-checked'],
    'data-state': mapped['data-state'],
  };

  if (required === true) {
    attrs['aria-required'] = 'true';
  }

  if (disabled === true) {
    attrs['data-disabled'] = '';
  }

  return attrs;
}

/**
 * 点击后应进入的状态。
 *
 * 半选按 Radix 语义收敛为选中而不是取消：半选是父级由子项推导出的中间态，
 * 不是用户可选择的终态，因此第一次交互总是把它明确化。
 *
 * @param current 点击前的状态。
 * @returns 下一次选中状态，半选与未选中都得到 true。
 */
export function resolveNextChecked(current: CheckboxCheckedState): boolean {
  return current !== true;
}

/**
 * Indicator 是否应当存在于 DOM 中。
 *
 * 对齐 Radix：只在选中或半选时挂载，未选中时不产生节点；需要退场动画时由适配层
 * 用 forceMount 覆盖这一判断。
 *
 * @param checked 当前选中状态。
 * @returns 选中或半选时为 true。
 */
export function isCheckboxIndicatorPresent(checked: CheckboxCheckedState): boolean {
  return checked === true || checked === 'indeterminate';
}

/**
 * 计算多选组中某一项勾选或取消后的值集合。
 *
 * 返回新数组而不修改入参，便于适配层直接把结果写回响应式值。勾选已存在的值、
 * 取消不存在的值都原样返回，因此调用方不需要额外去重。
 *
 * @param values 当前选中的值集合。
 * @param value 发生变化的那一项。
 * @param checked 该项变化后的状态；半选对组内项目无意义，按未勾选处理。
 * @returns 新的值集合。
 */
export function toggleGroupValue(
  values: readonly string[],
  value: string,
  checked: CheckboxCheckedState
): string[] {
  const isChecked = checked === true;
  const exists = values.includes(value);

  if (isChecked === exists) return [...values];

  return isChecked ? [...values, value] : values.filter((item) => item !== value);
}

/**
 * 判断多选组里某一项是否处于勾选状态。
 *
 * @param values 当前选中的值集合。
 * @param value 待判断的项。
 * @returns 存在于集合中时为 true。
 */
export function isGroupValueChecked(values: readonly string[], value: string): boolean {
  return values.includes(value);
}

/**
 * 由一组子项的勾选情况推导父级复选框的三态。
 *
 * 「全选」语义属于消费者而不是组件，因此放在本层做纯计算：0 项选中为未选中、
 * 全部选中为选中、其余为半选。子项数为 0 时返回未选中，避免「没有子项」被误报成全选。
 *
 * @param checkedCount 已勾选的子项数量。
 * @param totalCount 子项总数。
 * @returns 父级复选框应处于的状态。
 */
export function resolveIndeterminate(
  checkedCount: number,
  totalCount: number
): CheckboxCheckedState {
  if (totalCount === 0 || checkedCount === 0) return false;

  if (checkedCount === totalCount) return true;

  return 'indeterminate';
}
