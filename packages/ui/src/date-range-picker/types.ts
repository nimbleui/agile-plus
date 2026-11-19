import type { DateRangeSide } from '@agile-plus/headless';
import type { FloatingOffset, FloatingPlacement } from '@agile-plus/primitives/floating';

import type { FloatingStrategy } from '@agile-plus/headless';

/**
 * DateRangePickerRoot 的组件属性。
 *
 * prop 只接受纯值，响应式由组件内部通过 toRef 交给 Composable；受控布尔属性
 * （open）的缺省必须保持 undefined，被 cast 成 false 会让非受控用法静默失效。
 */
export interface DateRangePickerRootProps {
  /** 受控选中范围（valueFormat 格式的两端字符串）；不传即非受控，null 表示清空 */
  modelValue?: [string, string] | null;
  /** 非受控初值，默认 null（未选择） */
  defaultValue?: [string, string] | null;
  /** 选中值的存储格式，默认 'YYYY-MM-DD' */
  valueFormat?: string;
  /** 输入框的显示 / 输入格式，默认 'YYYY-MM-DD' */
  format?: string;
  /** 受控开合；不传即非受控 */
  open?: boolean;
  /** 非受控开合初值，默认 false */
  defaultOpen?: boolean;
  /** 整体禁用 */
  disabled?: boolean;
  /** 逐日禁用判定；只约束两端，范围内部的禁用日不阻断选择 */
  disabledDate?: (date: Date) => boolean;
  /** 每周起始日，0（周日）到 6（周六），默认 1（周一） */
  firstDayOfWeek?: number;
  /** 指向标题元素 id 的 aria-labelledby */
  ariaLabelledby?: string;
  /** 指向说明元素 id 的 aria-describedby */
  ariaDescribedby?: string;
  /** 期望位置，默认 'bottom-start' */
  placement?: FloatingPlacement;
  /** 与控件的间距，默认 4 */
  offset?: number | FloatingOffset;
  /** 空间不足时翻转，默认 true */
  flip?: boolean;
  /** 沿交叉轴钳制，默认 true */
  shift?: boolean;
  /** 与边界最小留白，默认 8 */
  padding?: number;
  /** 定位策略，默认 'absolute'；前提与 fixed 逃生门见 FloatingStrategy */
  strategy?: FloatingStrategy;
}

/** DateRangePickerRoot 的事件声明。 */
export interface DateRangePickerRootEmits {
  /** 选中范围变化，配合 v-model 使用 */
  'update:modelValue': [value: [string, string] | null];
  /** 开合变化，配合 v-model:open 使用 */
  'update:open': [value: boolean];
}

/** DateRangePickerInput 的组件属性。 */
export interface DateRangePickerInputProps {
  /** 哪一端的输入框：0 起点，1 终点 */
  index: 0 | 1;
}

/** DateRangePickerContent 的组件属性。 */
export interface DateRangePickerContentProps {
  /** portal 目标，默认 body */
  container?: string | HTMLElement;
  /** 打开过一次之后常驻 DOM，关闭只切 data-state 不卸载；首次打开前仍懒挂载，默认 false */
  keepMounted?: boolean;
}

/** DateRangePickerGrid 的组件属性。 */
export interface DateRangePickerGridProps {
  /** 左面板还是右面板；右面板恒为左面板的下一个月 */
  side?: DateRangeSide;
}

/** DateRangePickerCell 的组件属性。 */
export interface DateRangePickerCellProps {
  /** 格子对应的日期 */
  date: Date;
  /** 格子所属面板，默认 'left'；左右面板含相同补齐日期，id 靠 side 区分 */
  side?: DateRangeSide;
}
