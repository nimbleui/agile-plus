import type {
  ToggleGroupDirection,
  ToggleGroupOrientation,
  ToggleGroupType,
} from '@agile-plus/primitives/toggle';

import type { ComputedRef, MaybeRefOrGetter, Ref } from 'vue';

/**
 * useToggleGroup 的配置项。
 */
export interface UseToggleGroupOptions {
  /**
   * 选择模式，必填。
   *
   * 缺失时直接抛错，与 Radix 的 `Missing prop type expected on ToggleGroup` 一致：
   * 它决定值形状（string 还是 string[]）与 ARIA 角色，猜一个默认值会静默改变语义。
   */
  type: MaybeRefOrGetter<ToggleGroupType>;

  /**
   * 受控值，传入后进入受控模式。
   *
   * single 是字符串（空字符串表示未选中），multiple 是字符串数组。类型写成联合是
   * Vue 侧的限制：模板上无法像 React 那样用泛型按 `type` 收窄，具体形状由 `type`
   * 在运行期决定并在文档中约定。
   */
  value?: MaybeRefOrGetter<string | string[] | undefined>;

  /** 非受控模式的初始值，形状与 `value` 相同 */
  defaultValue?: MaybeRefOrGetter<string | string[] | undefined>;

  /** 值变化回调，负载形状跟随 `type`：single 给字符串，multiple 给数组 */
  onValueChange?: (value: string | string[]) => void;

  /** 整组禁用，项级禁用状态由「组禁用或项禁用」合成 */
  disabled?: MaybeRefOrGetter<boolean | undefined>;

  /**
   * 是否维持罗盘焦点，默认 true。
   *
   * 关闭后整组退化成一堆普通按钮：每个都进 Tab 序列、方向键不接管，这与 Radix 的
   * `rovingFocus={false}` 分支一致。
   */
  rovingFocus?: MaybeRefOrGetter<boolean | undefined>;

  /** 焦点到达两端后是否绕回，默认 true */
  loop?: MaybeRefOrGetter<boolean | undefined>;

  /** 排布方向，决定哪一组方向键有效 */
  orientation?: MaybeRefOrGetter<ToggleGroupOrientation | undefined>;

  /** 文本方向，RTL 下左右方向键互换 */
  dir?: MaybeRefOrGetter<ToggleGroupDirection | undefined>;
}

/**
 * 登记进罗盘焦点的一个项。
 *
 * 保存 Ref 而不是快照：项可能在任意时刻被禁用或选中，键盘导航发生时必须读到当下
 * 的状态与真实元素。
 */
export interface ToggleGroupItemEntry {
  /** 罗盘焦点 id，由项用 useId 生成；与选中值无关，因为值允许为空且可能重复登记 */
  id: string;

  /** 该项的选中值 */
  value: string;

  /** 项元素，未挂载时为 null */
  element: Ref<HTMLElement | null>;

  /** 是否参与罗盘焦点（组禁用或项禁用时为 false） */
  focusable: ComputedRef<boolean>;

  /** 是否处于选中状态，Tab 进入组时焦点优先落到它 */
  active: ComputedRef<boolean>;
}

/**
 * useToggleGroup 的返回值。
 */
export interface UseToggleGroupReturn {
  /** 选择模式 */
  type: ComputedRef<ToggleGroupType>;

  /** 当前选中值集合（内部统一数组） */
  value: ComputedRef<string[]>;

  /** 整组是否禁用 */
  disabled: ComputedRef<boolean>;

  /** 是否启用罗盘焦点 */
  rovingFocus: ComputedRef<boolean>;

  /** 排布方向 */
  orientation: ComputedRef<ToggleGroupOrientation | undefined>;

  /** 文本方向 */
  dir: ComputedRef<ToggleGroupDirection>;

  /**
   * 判断某项是否选中。
   *
   * @param itemValue 项的值。
   * @returns 是否按下。
   */
  isItemPressed(itemValue: string): boolean;

  /**
   * 写入某项的按下状态。
   *
   * @param itemValue 项的值。
   * @param pressed 该项点击后的状态。
   */
  setItemPressed(itemValue: string, pressed: boolean): void;

  /**
   * 登记一个参与罗盘焦点的项。
   *
   * @param entry 项条目。
   * @returns 注销函数。
   */
  registerItem(entry: ToggleGroupItemEntry): () => void;

  /** 获取组根元素属性：role、dir，罗盘模式下的 tabIndex 与 outline */
  getGroupProps(): Record<string, unknown>;

  /**
   * 获取项在罗盘模式下的属性。
   *
   * @param id 项的罗盘焦点 id。
   * @returns 含 tabIndex 的属性集合；未启用罗盘焦点时返回空对象。
   */
  getItemProps(id: string): Record<string, unknown>;

  /**
   * 组获得焦点时把焦点交给选中的项；绑定到 @focus。
   *
   * @param event 原生焦点事件。
   */
  onGroupFocus(event: FocusEvent): void;

  /** 组内指针按下，标记本次焦点来自点击而不是键盘；绑定到 @mousedown */
  onGroupMousedown(): void;

  /** 焦点离开组，重置 shift+Tab 退让状态；绑定到 @blur */
  onGroupBlur(): void;

  /**
   * 项获得焦点，记录当前 Tab 停靠点；绑定到项的 @focus。
   *
   * @param id 项的罗盘焦点 id。
   */
  onItemFocus(id: string): void;

  /**
   * 项按下时记录停靠点，并在项不可聚焦时阻止获得焦点；绑定到项的 @mousedown。
   *
   * @param event 原生鼠标事件。
   * @param id 项的罗盘焦点 id。
   */
  onItemMousedown(event: MouseEvent, id: string): void;

  /**
   * 项的键盘导航；绑定到项的 @keydown。
   *
   * @param event 原生键盘事件。
   */
  onItemKeydown(event: KeyboardEvent): void;
}
