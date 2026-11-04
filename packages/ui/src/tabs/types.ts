import type { TabsActivationMode, TabsOrientation } from '@agile-plus/primitives/tabs';

/**
 * TabsRoot 的组件属性。
 *
 * 分离原因同 DialogRootProps：prop 必须是纯值而非 MaybeRefOrGetter。
 */
export interface TabsRootProps {
  /**
   * 受控激活值，传入后进入受控模式。
   *
   * @default undefined
   */
  modelValue?: string;

  /**
   * 非受控模式的初始激活值；为空时取第一个注册的 tab。
   *
   * @default ''
   */
  defaultValue?: string;

  /**
   * 焦点移动是否直接激活面板。
   *
   * @default 'automatic'
   */
  activationMode?: TabsActivationMode;

  /**
   * 布局方向，决定方向键映射与 aria-orientation。
   *
   * @default 'horizontal'
   */
  orientation?: TabsOrientation;
}

/**
 * TabsRoot 的事件声明。
 */
export interface TabsRootEmits {
  /** 激活值变化时触发，配合 v-model 使用 */
  'update:modelValue': [value: string];
}
