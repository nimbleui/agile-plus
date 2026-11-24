import { inject } from 'vue';

import type {
  UseAccordionReturn,
  UseAvatarReturn,
  UseCheckboxGroupReturn,
  UseCheckboxReturn,
  UseDatePickerReturn,
  UseDateRangePickerReturn,
  UseDialogReturn,
  UseDropdownMenuReturn,
  UsePaginationReturn,
  UsePopoverReturn,
  UseRadioGroupReturn,
  UseScrollAreaReturn,
  UseSelectReturn,
  UseSliderReturn,
  UseSplitterReturn,
  UseTabsReturn,
  UseToastProviderReturn,
  UseToastReturn,
  UseToggleGroupReturn,
  UseSwitchReturn,
  UseTableReturn,
  UseTooltipReturn,
} from '@agile-plus/headless';
  UseMenuReturn,

import type { ComputedRef } from 'vue';

import type { ScrollAreaOrientation } from '@agile-plus/primitives/scroll-area';

import type { RadioGroupItemContext } from './radio-group/types';
import type { MenuSubContext } from './menu/types';


import type { AccordionItemContext } from './accordion/types';

import type { SelectGroupContext, SelectItemContext } from './select/types';

import type { TableRowContext } from './table/types';

import type { ProgressContext } from './progress/types';

import type { UseCollapsibleReturn, UseFormFieldReturn, UseFormReturn } from '@agile-plus/headless';

/**
 * 复合组件的上下文类型表。
 *
 * key 同时是 provide 使用的字符串，集中声明避免各子组件手写字符串拼错后
 * 静默注入失败；新增组件时在此登记一份即可。
 *
 * radioGroupItem 是 item 级上下文：只有 Item 会 provide 它，供 Indicator 判断
 * 自身所属选项是否选中，与组级上下文分属两层。
 */
interface ComponentContexts {
  dialog: UseDialogReturn;
  tabs: UseTabsReturn;
  radioGroup: UseRadioGroupReturn;
  radioGroupItem: RadioGroupItemContext;
  checkbox: UseCheckboxReturn;
  checkboxGroup: UseCheckboxGroupReturn;
  scrollArea: UseScrollAreaReturn;
  /**
   * Slider 的上下文：Root 提供给 Track / Range / Thumb。
   *
   * 值集合、指针换算与 thumb 尺寸测量都集中在 Root 的 useSlider 实例上。
   */
  slider: UseSliderReturn;
  /**
   * Toast 的两层上下文：Provider 级配置与单条通知实例。
   *
   * toastProvider 由 ToastProvider 下发给视口和每条通知（视口要写 portal 目标、
   * 通知要读时长与滑动配置）；toast 由 ToastRoot 提供给自己的 Action/Close。
   * 与 dialog/tabs 一样分两层登记，避免条级状态污染全局。
   */
  toastProvider: UseToastProviderReturn;
  toast: UseToastReturn;
  /**
   * ToggleGroup 下发给项的上下文。
   *
   * 项的状态唯一来源是组的值，因此只有一层上下文；罗盘焦点的登记表、type 与禁用
   * 状态都从这里读。
   */
  toggleGroup: UseToggleGroupReturn;
  /**
   * Switch 的上下文：Root 提供给 Thumb。
   *
   * 只需要状态本身——滑块自己没有任何交互，位置由样式层读父级或自身的 data-state 决定。
   */
  switch: UseSwitchReturn;
  /**
   * Scrollbar 向 Thumb 提供的朝向。
   *
   * Thumb 必须知道自己挂在哪个滚动条上才能取到对应维度的几何与可见性，
   * 但这个上下文只有一个消费者，因此就地声明而不单独建类型文件。
   */
  scrollAreaScrollbar: { orientation: ComputedRef<ScrollAreaOrientation> };
  /**
   * Progress 的上下文：Root 提供给 Indicator。
   *
   * 这是唯一一个由 ui 层自己构造的上下文——Progress 没有 headless 层，
   * 传的是 Root 的进度配置而不是 composable 实例。
   */
  progress: ProgressContext;
  /**
   * Form 的两层上下文：表单级校验注册表，与字段实例（id / name / 服务端标记）。
   *
   * 注册表放在表单层而不是字段层，是为了让 Message、ValidityState 能脱离 Field、
   * 只靠 name 挂到同一个字段上（例如把错误文案集中放到表单末尾）。
   */
  form: UseFormReturn;
  /** Collapsible 的上下文：Root 下发给 Trigger 与 Content */
  collapsible: UseCollapsibleReturn;
  formField: UseFormFieldReturn;
  /**
   * Tooltip 的上下文：Root 下发给 Trigger / Content / Arrow。
   *
   * 只有一层——Tooltip 没有 Provider，跳过延迟的时间窗目前是实例级的。
   * Arrow 也从这里读实际 placement，才能知道箭头该贴哪条边。
   */
  tooltip: UseTooltipReturn;
  /**
   * Popover 的上下文：Root 下发给 Trigger / Content / Arrow / Close。
   *
   * 只有一层——Popover 没有 Provider，开合与定位实例都挂在 Root 上。
   */
  popover: UsePopoverReturn;
  /**
   * DropdownMenu 的上下文：Root 下发给 Trigger / Content / Item / CheckboxItem / Label / Separator。
   *
   * 只有一层——菜单没有 Provider，开合、项登记与 roving focus 都挂在 Root 上。
   */
  dropdownMenu: UseDropdownMenuReturn;
  /**
  /** Menu 的根级上下文：选中/展开状态、注册表与键盘导航。 */
  menu: UseMenuReturn;
  /** MenuSub 的子级上下文：层级、键、禁用态与触发器元素。 */
  menuSub: MenuSubContext;
   * Select 的三层上下文：列表级实例、项级选中态、分组标题 id。
   *
   * 项级与分组级分开登记，理由与 radioGroupItem 相同——ItemText / Indicator 只关心
   * 自己所属的那一个选项，Group 只关心自己的标题 id，都不该从列表级实例里再解析一遍。
   */
  select: UseSelectReturn;
  selectItem: SelectItemContext;
  selectGroup: SelectGroupContext;
  /**
   * DatePicker 的上下文：Root 下发给 Input / Content / Grid / Cell。
   *
   * 只有一层——选中值、开合、面板与焦点日期都挂在 Root 的 useDatePicker 实例上，
   * 格子状态由 getCellProps / getCellState 统一派生，不需要项级上下文。
   */
  datePicker: UseDatePickerReturn;
  /**
   * DateRangePicker 的上下文：Root 下发给 Input / Content / Grid / Cell。
   *
   * 与 datePicker 分键登记：两端值、活跃端与悬停预览的返回形状不同，
   * 共用一个键会让两套部件互相注入到错误的实例。
   */
  dateRangePicker: UseDateRangePickerReturn;
  /**
   * Pagination 的上下文：Root 下发给 List / Page / Ellipsis / Prev / Next。
   *
   * 只有一层——页码窗口、当前页与禁用状态都挂在 Root 的 usePagination 实例上，
   * 页码项的属性表由 getPageProps / getStepProps 统一派生。List 不取用这份上下文：
   * ul 自带 list 语义，没有属性要绑。
   */
  pagination: UsePaginationReturn;
  /**
   * Table 的上下文：Root 下发给 Header / Body / Row / Head / Cell / Empty /
   * SelectionHead / SelectionCell / ExpandTrigger / ExpandedRow。
   *
   * 组级一层——排序、选择、展开三条状态通道与派生行序列都挂在 Root 的 useTable
   * 实例上，行级状态由 getRowProps / isRowSelected 按行键派生。
   */
  table: UseTableReturn;
  /**
   * Table 的行级上下文：TableRow 下发给内部 TableCell。
   *
   * 与 selectItem 同理——单元格自动合并跨度时要知道自己所属的行，
   * 表头行无 item，注入值为 undefined。
   */
  tableRow: TableRowContext;
  /**
   * Accordion 的两层上下文：组级值与键盘导航实例，与项级 Collapsible 转发。
   *
   * 项级单独登记，理由与 radioGroupItem 相同——Trigger / Content 只关心自己所属的
   * 那一个项（值、合成禁用态、内部 Collapsible），不该从组级实例里再解析一遍。
   */
  accordion: UseAccordionReturn;
  accordionItem: AccordionItemContext;
  /**
   * Avatar 的上下文：Root 下发给 Image / Fallback。
   *
   * 只有一层——图片加载状态是唯一真源，Image 上报、Fallback 读取，都挂在 Root 上。
   */
  avatar: UseAvatarReturn;
  /**
   * Splitter 的上下文：Root 下发给 Panel，Panel 再画出的 Bar 从这里取回根实例。
   *
   * 只有一层——容器尺寸、像素数组与折叠凭据都挂在 Root 的 useSplitter 上，面板只上交
   * 自己的作者单位与约束，因此不需要面板级上下文。
   */
  splitter: UseSplitterReturn;
}

/**
 * 读取所在父级组件提供的上下文。
 *
 * 子组件脱离父级使用属于开发期用法错误，不是需要容错的运行时分支，
 * 因此直接抛错。返回类型剔除了 undefined：在调用处判空无法把窄化传播到
 * 事件处理函数与模板表达式中，会让每个子组件重复同一套类型 workaround。
 *
 * @param key 已在 ComponentContexts 登记的上下文物。
 * @returns 对应组件的上下文值。
 * @throws 当组件未用在对应父级组件内时抛出。
 */
export function useComponentContext<K extends keyof ComponentContexts>(
  key: K
): ComponentContexts[K] {
  const context = inject<ComponentContexts[K] | undefined>(key, undefined);

  if (!context) {
    throw new Error(`当前组件缺少上下文「${key}」，它必须用在对应的父级组件内。`);
  }

  return context;
}
