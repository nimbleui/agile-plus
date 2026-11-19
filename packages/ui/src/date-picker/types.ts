import type { DatePanel } from '@agile-plus/primitives/date';
import type { FloatingOffset, FloatingPlacement } from '@agile-plus/primitives/floating';

import type { FloatingStrategy } from '@agile-plus/headless';

/**
 * DatePickerRoot 的组件属性。
 *
 * prop 只接受纯值，响应式由组件内部通过 toRef 交给 Composable；受控布尔属性
 * （open）的缺省必须保持 undefined，被 cast 成 false 会让非受控用法静默失效。
 */
export interface DatePickerRootProps {
  /** 受控选中值（valueFormat 格式）；不传即非受控，null 表示清空 */
  modelValue?: string | null;
  /** 非受控初值，默认 null（未选择） */
  defaultValue?: string | null;
  /** 选中值的存储格式；缺省随 showTime：false 为 'YYYY-MM-DD'，true 为 'YYYY-MM-DD HH:mm:ss' */
  valueFormat?: string;
  /** 输入框的显示 / 输入格式；缺省规则与 valueFormat 相同 */
  format?: string;
  /** 开启时间选择：面板带时分秒列，选日期不关闭，值格式缺省含时间，默认 false */
  showTime?: boolean;
  /** 受控开合；不传即非受控 */
  open?: boolean;
  /** 非受控开合初值，默认 false */
  defaultOpen?: boolean;
  /** 整体禁用 */
  disabled?: boolean;
  /** 逐日禁用判定，入参是本地零点的日期 */
  disabledDate?: (date: Date) => boolean;
  /** 每周起始日，0（周日）到 6（周六），默认 1（周一） */
  firstDayOfWeek?: number;
  /** 表单字段名，落在输入框上参与原生提交 */
  name?: string;
  /** 显式归属的表单 id */
  form?: string;
  /** 指向标题元素 id 的 aria-labelledby */
  ariaLabelledby?: string;
  /** 指向说明元素 id 的 aria-describedby */
  ariaDescribedby?: string;
  /** 期望位置，默认 'bottom-start' */
  placement?: FloatingPlacement;
  /** 与输入框的间距，默认 4 */
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

/** DatePickerRoot 的事件声明。 */
export interface DatePickerRootEmits {
  /** 选中值变化，配合 v-model 使用 */
  'update:modelValue': [value: string | null];
  /** 开合变化，配合 v-model:open 使用 */
  'update:open': [value: boolean];
}

/** DatePickerContent 的组件属性。 */
export interface DatePickerContentProps {
  /** portal 目标，默认 body */
  container?: string | HTMLElement;
  /** 打开过一次之后常驻 DOM，关闭只切 data-state 不卸载；首次打开前仍懒挂载，默认 false */
  keepMounted?: boolean;
}

/** DatePickerGrid 的组件属性。 */
export interface DatePickerGridProps {
  /** 渲染哪张网格，默认 'date'；月份 / 年代网格为 3 列，日期网格为 7 列 */
  kind?: DatePanel;
}

/** DatePickerCell 的组件属性。 */
export interface DatePickerCellProps {
  /** 格子对应的日期；月份格传月首、年代格传年首 */
  date: Date;
  /** 格子所属面板，默认 'date' */
  kind?: DatePanel;
}
