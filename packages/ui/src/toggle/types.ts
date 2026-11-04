/**
 * ToggleRoot 的组件属性。
 *
 * 与 Radix 的 `Toggle` 对齐：一个会保持按下状态的原生按钮。
 */
export interface ToggleRootProps {
  /**
   * 受控按下状态，传入后进入受控模式。
   *
   * @default undefined
   */
  pressed?: boolean;

  /**
   * 非受控模式的初始按下状态。
   *
   * @default false
   */
  defaultPressed?: boolean;

  /**
   * 是否禁用。
   *
   * @default false
   */
  disabled?: boolean;

  /**
   * 渲染的目标标签名。
   *
   * @default 'button'
   */
  as?: string;

  /**
   * 不渲染自身容器，把属性合并到唯一的子元素上。
   *
   * @default false
   */
  asChild?: boolean;
}

/**
 * ToggleRoot 的事件。
 */
export interface ToggleRootEmits {
  /** 按下状态变化时触发，配合 `v-model:pressed` 使用 */
  'update:pressed': [pressed: boolean];
}

/**
 * ToggleGroupRoot 的组件属性。
 *
 * `type` 决定值的形状与 ARIA 角色，模板上无法像 React 泛型那样按它收窄类型，
 * 因此 `value` 写成联合类型并在运行期校验，具体形状见文档约定。
 */
export interface ToggleGroupRootProps {
  /**
   * 选择模式，必填：`single` 值为字符串（空字符串表示未选中），`multiple` 为数组。
   */
  type: 'single' | 'multiple';

  /**
   * 受控值，传入后进入受控模式。
   *
   * @default undefined
   */
  value?: string | string[];

  /**
   * 非受控模式的初始值，形状跟随 `type`。
   *
   * @default undefined
   */
  defaultValue?: string | string[];

  /**
   * 整组禁用，任一项都不可交互也不参与罗盘焦点。
   *
   * @default false
   */
  disabled?: boolean;

  /**
   * 是否维持罗盘焦点（整组只占一个 Tab 停靠点、方向键在项间移动）。
   *
   * @default true
   */
  rovingFocus?: boolean;

  /**
   * 焦点到达两端后是否绕回。
   *
   * @default true
   */
  loop?: boolean;

  /**
   * 排布方向；纵向组忽略左右键、横向组忽略上下键，不提供时四个方向都有效。
   *
   * @default undefined
   */
  orientation?: 'horizontal' | 'vertical';

  /**
   * 文本方向，`rtl` 下左右方向键互换。
   *
   * @default 'ltr'
   */
  dir?: 'ltr' | 'rtl';

  /**
   * 渲染的目标标签名。
   *
   * @default 'div'
   */
  as?: string;

  /**
   * 不渲染自身容器，把属性合并到唯一的子元素上。
   *
   * @default false
   */
  asChild?: boolean;
}

/**
 * ToggleGroupRoot 的事件。
 */
export interface ToggleGroupRootEmits {
  /** 值变化时触发，负载形状跟随 `type`；配合 `v-model:value` 使用 */
  'update:value': [value: string | string[]];
}

/**
 * ToggleGroupItem 的组件属性。
 *
 * 项没有 `pressed`：状态唯一来源是组的值，这与 Radix 的
 * `ToggleGroupItem`（内部渲染受控 Toggle）一致。
 */
export interface ToggleGroupItemProps {
  /**
   * 项的值，组内必须唯一。
   */
  value: string;

  /**
   * 单项禁用；组的禁用状态是「组禁用或项禁用」。
   *
   * @default false
   */
  disabled?: boolean;

  /**
   * 渲染的目标标签名。
   *
   * @default 'button'
   */
  as?: string;

  /**
   * 不渲染自身容器，把属性合并到唯一的子元素上。
   *
   * @default false
   */
  asChild?: boolean;
}
