import { defineMaterial } from '../define';

/**
 * 成品组件层的组合件清单（`@agile-plus/components` 的对话框、标签页、通知、折叠、分组族）。
 *
 * 这一组是插件里唯一真的有**具名插槽**的组件：样式层的 Dialog 开放 trigger / title /
 * description / default，Collapsible 开放 trigger / default，Toast 开放 title /
 * description / action / close / default —— 所以它们用 `slots` 逐格声明区域，而不是
 * `accepts` 简写。区域比例按「窄条在前、兜底在后」的顺序写，这是平台落点判定的要求。
 *
 * 两个执行点都已生效：拖入时 `canvas-drop` 按 `region` 决定归档到哪一格、按 `accepts` 与
 * `maxChildren` 拒绝不匹配的物料；渲染时 `splitSlotChildren` 把已声明插槽里的子节点交给
 * 组件对应的具名插槽。换句话说，这里的 `slots` 声明决定了「放进 title 格的内容最终落在
 * 组件的 title 插槽」，漏声明的插槽名会退回兄弟平铺而不是报错。
 *
 * 只收子内容、不需要分格的容器（如 `agile-plus.scroll-area`）故意不写 `slots`：
 * `defineMaterial` 会给 `container: true` 补一格不限类型的 `default`，子内容照样进得了
 * 组件的默认插槽。真正会退回兄弟平铺的是上面那种「显式声明了 slots 却漏掉某个插槽名」。
 *
 * 事件只声明组件真的会 emit 的那些：样式层 Toast 只转发 `update:open`，无头层的
 * `swipe-*` / `pause` / `resume` 到不了这里，照抄声明会让表达式里凭空多出读不到的变量。
 *
 * `ToastProvider` 不在这一层重复登记：样式层直接复用无头层实现，同一个组件登记两条物料
 * 只会在面板里出现两个名字指向同一份行为。
 */
export const materials = [
  defineMaterial({
    name: 'agile-plus.dialog',
    title: '对话框',
    category: '浮层',
    icon: 'square',
    props: {
      defaultOpen: {
        type: 'boolean',
        title: '默认打开',
        description: '打开后浮层按 Teleport 传送到 body，会脱离画布坐标系',
        default: false,
      },
      closeOnEscape: { type: 'boolean', title: 'Esc 关闭', default: true },
      closeOnOverlayClick: { type: 'boolean', title: '点遮罩关闭', default: true },
    },
    size: { width: 320, height: 220 },
    container: true,
    slots: [
      {
        name: 'trigger',
        title: '触发按钮',
        description: '打开对话框的入口内容',
        maxChildren: 1,
        region: { x: 0, y: 0, width: 1, height: 0.18 },
      },
      {
        name: 'title',
        title: '标题',
        maxChildren: 1,
        region: { x: 0, y: 0.18, width: 1, height: 0.12 },
      },
      {
        name: 'description',
        title: '描述',
        maxChildren: 1,
        region: { x: 0, y: 0.3, width: 1, height: 0.12 },
      },
      {
        name: 'default',
        title: '主体内容',
        description: '对话框正文区域',
        region: { x: 0, y: 0.42, width: 1, height: 0.58 },
      },
    ],
    events: [
      {
        name: 'update:open',
        title: '开关变化',
        parameters: [{ name: 'value', type: 'boolean', description: '变化后的打开状态' }],
      },
    ],
  }),
  defineMaterial({
    name: 'agile-plus.tabs',
    title: '标签页',
    category: '交互',
    icon: 'grid',
    // 标签列表 / 标签 / 面板都用带样式的成品部件，拖出来无需手写 class 就有样式
    accepts: ['agile-plus.tabs-list', 'agile-plus.tabs-content'],
    props: {
      defaultValue: {
        type: 'string',
        title: '默认选中值',
        description: '留空时取第一个注册的标签',
        default: '',
      },
      activationMode: {
        type: 'string',
        title: '激活方式',
        enum: ['automatic', 'manual'],
        default: 'automatic',
      },
      orientation: {
        type: 'string',
        title: '排列方向',
        enum: ['horizontal', 'vertical'],
        default: 'horizontal',
      },
    },
    size: { width: 320, height: 180 },
    container: true,
    events: [
      {
        name: 'update:modelValue',
        title: '切换标签',
        parameters: [{ name: 'value', type: 'string', description: '新选中标签的 value' }],
      },
    ],
  }),
  defineMaterial({
    name: 'agile-plus.tabs-list',
    title: '标签页·标签列表',
    category: '交互',
    icon: 'list',
    parent: 'agile-plus.tabs',
    accepts: ['agile-plus.tabs-trigger'],
    size: { width: 320, height: 36 },
    container: true,
  }),
  defineMaterial({
    name: 'agile-plus.tabs-trigger',
    title: '标签页·标签',
    category: '交互',
    icon: 'square',
    parent: 'agile-plus.tabs-list',
    props: {
      value: { type: 'string', title: '标签值', description: '与对应面板的 value 一致，必填' },
    },
    initial: { value: 'tab-1' },
    container: true,
  }),
  defineMaterial({
    name: 'agile-plus.tabs-content',
    title: '标签页·面板',
    category: '交互',
    icon: 'outline',
    parent: 'agile-plus.tabs',
    size: { width: 320, height: 120 },
    props: {
      value: { type: 'string', title: '对应标签值', description: '与哪个标签联动，必填' },
    },
    initial: { value: 'tab-1' },
    container: true,
  }),
  defineMaterial({
    name: 'agile-plus.collapsible',
    title: '折叠面板',
    category: '交互',
    icon: 'chevronDown',
    props: {
      defaultOpen: { type: 'boolean', title: '默认展开', default: false },
      disabled: { type: 'boolean', title: '禁用', default: false },
    },
    size: { width: 280, height: 180 },
    container: true,
    slots: [
      {
        name: 'trigger',
        title: '触发标题条',
        maxChildren: 1,
        region: { x: 0, y: 0, width: 1, height: 0.18 },
      },
      { name: 'default', title: '折叠内容', region: { x: 0, y: 0.18, width: 1, height: 0.82 } },
    ],
    events: [
      {
        name: 'update:open',
        title: '展开状态变化',
        parameters: [{ name: 'value', type: 'boolean', description: '变化后的展开状态' }],
      },
    ],
  }),
  defineMaterial({
    name: 'agile-plus.toast',
    title: '通知条',
    category: '浮层',
    icon: 'outline',
    props: {
      defaultOpen: {
        type: 'boolean',
        title: '默认显示',
        description: '没有挂载通知视口时不会渲染任何内容',
        default: true,
      },
      duration: { type: 'number', title: '停留毫秒', description: '留空跟随上下文默认值' },
      type: {
        type: 'string',
        title: '打断级别',
        enum: ['foreground', 'background'],
        default: 'foreground',
      },
      variant: {
        type: 'string',
        title: '语义配色',
        enum: ['default', 'success', 'warning', 'danger', 'info'],
        default: 'default',
      },
      actionAltText: {
        type: 'string',
        title: '操作读屏文案',
        description: '往操作格里放了内容就必须填，否则组件拒绝渲染操作',
      },
    },
    size: { width: 280, height: 96 },
    container: true,
    slots: [
      {
        name: 'title',
        title: '标题',
        maxChildren: 1,
        region: { x: 0, y: 0, width: 1, height: 0.24 },
      },
      {
        name: 'description',
        title: '描述',
        maxChildren: 1,
        region: { x: 0, y: 0.24, width: 1, height: 0.24 },
      },
      {
        name: 'action',
        title: '操作按钮',
        maxChildren: 1,
        region: { x: 0, y: 0.72, width: 0.7, height: 0.28 },
      },
      {
        name: 'close',
        title: '关闭按钮',
        maxChildren: 1,
        region: { x: 0.7, y: 0.72, width: 0.3, height: 0.28 },
      },
      { name: 'default', title: '正文', region: { x: 0, y: 0.48, width: 1, height: 0.24 } },
    ],
    events: [
      {
        name: 'update:open',
        title: '开关变化',
        parameters: [{ name: 'open', type: 'boolean', description: '变化后的显示状态' }],
      },
    ],
  }),
  defineMaterial({
    name: 'agile-plus.toast-viewport',
    title: '通知视口',
    category: '浮层',
    icon: 'grid',
    // `hotkey` 是 string[]，数组型属性写不进面板
    props: {
      label: {
        type: 'string',
        title: '区域朗读文案',
        description: '{hotkey} 会被替换成快捷键提示',
        default: 'Notifications ({hotkey})',
      },
      position: {
        type: 'string',
        title: '屏幕位置',
        enum: [
          'top-right',
          'top-left',
          'top-center',
          'bottom-right',
          'bottom-left',
          'bottom-center',
        ],
        default: 'top-right',
      },
    },
    size: { width: 300, height: 140 },
  }),
  defineMaterial({
    name: 'agile-plus.scroll-area',
    title: '滚动区',
    category: '布局',
    icon: 'outline',
    props: {
      type: {
        type: 'string',
        title: '滚动条显隐方式',
        enum: ['hover', 'scroll', 'always', 'auto'],
        default: 'hover',
      },
      scrollHideDelay: { type: 'number', title: '隐藏延迟毫秒', default: 600 },
      dir: { type: 'string', title: '文字方向', enum: ['ltr', 'rtl'], default: 'ltr' },
      minThumbSize: { type: 'number', title: '滑块最小像素', default: 20 },
    },
    size: { width: 280, height: 180 },
    container: true,
  }),
  defineMaterial({
    name: 'agile-plus.toggle',
    title: '按下切换按钮',
    category: '交互',
    icon: 'square',
    props: {
      defaultPressed: { type: 'boolean', title: '默认按下', default: false },
      disabled: { type: 'boolean', title: '禁用', default: false },
    },
    size: { width: 72, height: 32 },
    container: true,
    events: [
      {
        name: 'update:pressed',
        title: '按下状态变化',
        parameters: [{ name: 'pressed', type: 'boolean', description: '切换后的按下状态' }],
      },
    ],
  }),
  defineMaterial({
    name: 'agile-plus.toggle-group',
    title: '按下切换组',
    category: '表单',
    icon: 'group',
    accepts: ['agile-plus.toggle-group-item'],
    props: {
      type: {
        type: 'string',
        title: '选择模式',
        enum: ['single', 'multiple'],
        default: 'single',
      },
      disabled: { type: 'boolean', title: '整组禁用', default: false },
      rovingFocus: { type: 'boolean', title: '漫游焦点', default: true },
      loop: { type: 'boolean', title: '方向键循环', default: true },
      orientation: {
        type: 'string',
        title: '排列方向',
        enum: ['horizontal', 'vertical'],
        default: 'horizontal',
      },
    },
    size: { width: 220, height: 36 },
    initial: { type: 'single' },
    container: true,
    events: [
      {
        name: 'update:value',
        title: '选中值变化',
        parameters: [
          { name: 'value', type: 'string | string[]', description: '单选为字符串，多选为数组' },
        ],
      },
    ],
  }),
  defineMaterial({
    name: 'agile-plus.toggle-group-item',
    title: '按下切换组项',
    category: '表单',
    icon: 'square',
    parent: 'agile-plus.toggle-group',
    props: {
      value: { type: 'string', title: '选项值', description: '组内唯一' },
      disabled: { type: 'boolean', title: '禁用', default: false },
    },
    initial: { value: 'item-1' },
    container: true,
  }),
  defineMaterial({
    name: 'agile-plus.radio-group',
    title: '单选组',
    category: '表单',
    icon: 'list',
    accepts: ['agile-plus.radio-group-item'],
    props: {
      defaultValue: { type: 'string', title: '默认选中值', default: '' },
      disabled: { type: 'boolean', title: '整组禁用', default: false },
      required: { type: 'boolean', title: '必选', default: false },
      loop: { type: 'boolean', title: '方向键循环', default: true },
      orientation: {
        type: 'string',
        title: '排列方向',
        enum: ['horizontal', 'vertical'],
        default: 'horizontal',
      },
    },
    size: { width: 220, height: 96 },
    container: true,
    events: [
      {
        name: 'update:modelValue',
        title: '选中值变化',
        parameters: [{ name: 'value', type: 'string', description: '选中项的 value' }],
      },
    ],
  }),
  defineMaterial({
    name: 'agile-plus.radio-group-item',
    title: '单选项',
    category: '表单',
    icon: 'circle',
    parent: 'agile-plus.radio-group',
    props: {
      value: { type: 'string', title: '选项值', description: '组内唯一且必填' },
      disabled: { type: 'boolean', title: '禁用', default: false },
    },
    size: { width: 140, height: 24 },
    initial: { value: 'option-1' },
    container: true,
  }),
  defineMaterial({
    name: 'agile-plus.checkbox-group',
    title: '复选框组',
    category: '表单',
    icon: 'group',
    accepts: ['agile-plus.checkbox'],
    props: {
      disabled: { type: 'boolean', title: '整组禁用', default: false },
      required: { type: 'boolean', title: '至少选一个', default: false },
    },
    size: { width: 220, height: 96 },
    container: true,
    events: [
      {
        name: 'update:modelValue',
        title: '选中集合变化',
        parameters: [{ name: 'values', type: 'string[]', description: '已选中项的 value 列表' }],
      },
    ],
  }),
  defineMaterial({
    name: 'agile-plus.flex',
    title: '弹性布局',
    category: '布局',
    icon: 'group',
    accepts: ['agile-plus.flex-item'],
    props: {
      direction: {
        type: 'string',
        title: '主轴方向',
        enum: ['row', 'column', 'row-reverse', 'column-reverse'],
        default: 'row',
      },
      align: {
        type: 'string',
        title: '交叉轴对齐',
        enum: ['start', 'center', 'end', 'baseline', 'stretch'],
      },
      justify: {
        type: 'string',
        title: '主轴分布',
        enum: ['start', 'end', 'center', 'between', 'around', 'evenly'],
      },
      wrap: { type: 'string', title: '换行', enum: ['nowrap', 'wrap', 'wrap-reverse'] },
      gap: {
        type: 'string',
        title: '间距刻度',
        enum: ['xs', 'sm', 'md', 'lg', 'xl'],
        description: '组件也接受任意 CSS 长度，面板的下拉只能选刻度',
      },
      inline: { type: 'boolean', title: '行内块', default: false },
    },
    size: { width: 280, height: 96 },
    container: true,
  }),
  defineMaterial({
    name: 'agile-plus.flex-item',
    title: '弹性布局项',
    category: '布局',
    icon: 'square',
    parent: 'agile-plus.flex',
    props: {
      flex: { type: 'string', title: 'flex 简写', description: '原样写进 CSS flex' },
      grow: { type: 'number', title: '放大比例' },
      shrink: { type: 'number', title: '收缩比例' },
      basis: { type: 'string', title: '基础尺寸' },
      order: { type: 'number', title: '排列序号' },
      alignSelf: {
        type: 'string',
        title: '单项对齐',
        enum: ['auto', 'start', 'center', 'end', 'baseline', 'stretch'],
      },
    },
    container: true,
  }),
  defineMaterial({
    name: 'agile-plus.tooltip',
    title: '提示',
    category: '浮层',
    icon: 'outline',
    props: {
      placement: {
        type: 'string',
        title: '位置',
        enum: ['top', 'right', 'bottom', 'left'],
        default: 'top',
      },
      delayDuration: { type: 'number', title: '打开延迟毫秒', default: 700 },
      disableHoverableContent: {
        type: 'boolean',
        title: '内容不可悬停',
        description: '提示里没有可点内容时开启，否则离开触发元素后提示会多停留一段',
        default: false,
      },
      showArrow: { type: 'boolean', title: '显示箭头', default: true },
    },
    size: { width: 160, height: 60 },
    container: true,
    // 设计态只渲染触发元素，正文是 portal 出去的浮层；两格各占一半，
    // 让设计师能分别往触发元素与正文里拖内容。窄条在前、兜底在后是落点判定的要求。
    slots: [
      {
        name: 'trigger',
        title: '触发元素',
        maxChildren: 1,
        region: { x: 0, y: 0, width: 1, height: 0.5 },
      },
      { name: 'default', title: '提示正文', region: { x: 0, y: 0.5, width: 1, height: 0.5 } },
    ],
    events: [
      {
        name: 'update:open',
        title: '开合变化',
        parameters: [{ name: 'value', type: 'boolean', description: '变化后的打开状态' }],
      },
    ],
  }),
  defineMaterial({
    name: 'agile-plus.select',
    title: '下拉选择器',
    category: '表单',
    icon: 'chevronDown',
    // `options` 是数组型属性，面板会退化成文本框并写回字符串，因此不登记：
    // 设计态靠默认插槽往里拖选项部件，运行态由代码喂 options。
    props: {
      defaultValue: { type: 'string', title: '默认选中值', default: '' },
      placeholder: { type: 'string', title: '占位文案', default: '请选择' },
      size: {
        type: 'string',
        title: '尺寸',
        enum: ['small', 'middle', 'large'],
        default: 'middle',
      },
      variant: {
        type: 'string',
        title: '外观',
        enum: ['outlined', 'filled', 'borderless'],
        default: 'outlined',
      },
      disabled: { type: 'boolean', title: '禁用', default: false },
      required: { type: 'boolean', title: '必选', default: false },
      clearable: { type: 'boolean', title: '可清除', default: false },
      loading: { type: 'boolean', title: '加载中', default: false },
      block: { type: 'boolean', title: '占满一行', default: false },
      loop: { type: 'boolean', title: '方向键循环', default: true },
    },
    size: { width: 220, height: 32 },
    container: true,
    // 列表是 portal 出去的浮层，设计态只画触发器；四格按「窄条在前、兜底在后」排，
    // 这是平台落点判定的要求。item 是逐项渲染的 scoped 插槽，拖进去的内容会出现在
    // 每个选项里；empty 只在没有选项时渲染。
    slots: [
      {
        name: 'value',
        title: '选中值回显',
        maxChildren: 1,
        region: { x: 0, y: 0, width: 0.6, height: 1 },
      },
      {
        name: 'item',
        title: '选项内容',
        description: '逐项渲染，会出现在每个选项里',
        maxChildren: 1,
        region: { x: 0.6, y: 0, width: 0.2, height: 1 },
      },
      {
        name: 'empty',
        title: '空态文案',
        maxChildren: 1,
        region: { x: 0.8, y: 0, width: 0.2, height: 0.5 },
      },
      { name: 'default', title: '选项列表', region: { x: 0, y: 0.5, width: 1, height: 0.5 } },
    ],
    events: [
      {
        name: 'update:modelValue',
        title: '选中值变化',
        parameters: [{ name: 'value', type: 'string', description: '选中项的 value' }],
      },
      {
        name: 'update:open',
        title: '开合变化',
        parameters: [{ name: 'value', type: 'boolean', description: '变化后的打开状态' }],
      },
      { name: 'clear', title: '清除选择', description: '点击清除按钮后触发' },
    ],
  }),
  defineMaterial({
    name: 'agile-plus.ellipsis',
    title: '文本省略',
    category: '展示',
    icon: 'type',
    props: {
      mode: {
        type: 'string',
        title: '省略模式',
        enum: ['single', 'multi', 'middle'],
        default: 'single',
      },
      lines: { type: 'number', title: '多行行数', description: '仅 multi 模式生效', default: 2 },
      tailChars: {
        type: 'number',
        title: '中间省略保留尾部字符',
        description: '仅 middle 模式生效',
        default: 4,
      },
      expandable: { type: 'boolean', title: '可展开', default: false },
      tooltip: { type: 'boolean', title: '溢出时 Tooltip 全文', default: true },
      size: {
        type: 'string',
        title: '尺寸',
        enum: ['small', 'middle', 'large'],
        default: 'middle',
      },
    },
    size: { width: 240, height: 24 },
    container: true,
    events: [
      {
        name: 'update:expanded',
        title: '展开态变化',
        parameters: [{ name: 'value', type: 'boolean', description: '变化后的展开状态' }],
      },
    ],
  }),
  defineMaterial({
    name: 'agile-plus.popover',
    title: '气泡卡片',
    category: '浮层',
    icon: 'square',
    props: {
      placement: {
        type: 'string',
        title: '位置',
        enum: ['top', 'right', 'bottom', 'left'],
        default: 'bottom',
      },
      defaultOpen: { type: 'boolean', title: '默认打开', default: false },
    },
    size: { width: 280, height: 180 },
    container: true,
    // 设计态只渲染触发元素，正文是 portal 出去的浮层；两格各占一半，
    // 让设计师能分别往触发元素与正文里拖内容。窄条在前、兜底在后是落点判定的要求。
    slots: [
      {
        name: 'trigger',
        title: '触发元素',
        maxChildren: 1,
        region: { x: 0, y: 0, width: 1, height: 0.5 },
      },
      { name: 'default', title: '卡片正文', region: { x: 0, y: 0.5, width: 1, height: 0.5 } },
    ],
    events: [
      {
        name: 'update:open',
        title: '开合变化',
        parameters: [{ name: 'value', type: 'boolean', description: '变化后的打开状态' }],
      },
    ],
  }),
  defineMaterial({
    name: 'agile-plus.dropdown-menu',
    title: '下拉菜单',
    category: '浮层',
    icon: 'square',
    props: {
      placement: {
        type: 'string',
        title: '位置',
        enum: ['bottom-start', 'bottom', 'top-start', 'top'],
        default: 'bottom-start',
      },
      defaultOpen: { type: 'boolean', title: '默认打开', default: false },
    },
    size: { width: 180, height: 40 },
    container: true,
    // 菜单项由 atoms 层的 ui 部件拖入默认插槽；触发元素单独一格。
    slots: [
      {
        name: 'trigger',
        title: '触发元素',
        maxChildren: 1,
        region: { x: 0, y: 0, width: 1, height: 0.5 },
      },
      { name: 'default', title: '菜单项', region: { x: 0, y: 0.5, width: 1, height: 0.5 } },
    ],
    events: [
      {
        name: 'update:open',
        title: '开合变化',
        parameters: [{ name: 'value', type: 'boolean', description: '变化后的打开状态' }],
      },
      {
        name: 'item-select',
        title: '项激活',
        parameters: [{ name: 'value', type: 'string', description: '被激活项的值' }],
      },
    ],
  }),
  defineMaterial({
    name: 'agile-plus.dropdown-menu-item',
    title: '下拉菜单项',
    category: '浮层',
    icon: 'square',
    parent: 'agile-plus.dropdown-menu',
    props: {
      value: { type: 'string', title: '项 value', description: '菜单内唯一，item-select 返回它' },
      disabled: { type: 'boolean', title: '禁用', default: false },
    },
    initial: { value: 'item-1' },
    container: true,
  }),
  defineMaterial({
    name: 'agile-plus.button',
    title: '按钮',
    category: '交互',
    icon: 'square',
    props: {
      variant: {
        type: 'string',
        title: '外观变体',
        enum: ['primary', 'default', 'dashed', 'text', 'link'],
        default: 'default',
      },
      size: {
        type: 'string',
        title: '尺寸',
        enum: ['small', 'middle', 'large'],
        default: 'middle',
      },
      type: {
        type: 'string',
        title: '原生类型',
        description: '放进表单时 submit / reset 参与原生提交与重置',
        enum: ['button', 'submit', 'reset'],
        default: 'button',
      },
      disabled: { type: 'boolean', title: '禁用', default: false },
      loading: {
        type: 'boolean',
        title: '加载中',
        description: '加载期间合并进禁用态，避免重复提交',
        default: false,
      },
    },
    size: { width: 96, height: 32 },
    container: true,
    // 不声明事件：Button 不 emit 自定义事件，照抄原生 click 会违反「只声明真的 emit」的判据。
  }),
  defineMaterial({
    name: 'agile-plus.accordion',
    title: '手风琴',
    category: '交互',
    icon: 'chevronDown',
    accepts: ['agile-plus.accordion-item'],
    // value / defaultValue 是 string | string[] 联合，multiple 的数组写不进面板，
    // 留给代码侧；设计态只暴露 type / collapsible / disabled。
    props: {
      type: {
        type: 'string',
        title: '展开模式',
        enum: ['single', 'multiple'],
        default: 'single',
        description: 'single 至多展开一项，multiple 可同时展开多项',
      },
      collapsible: {
        type: 'boolean',
        title: '允许全部收起',
        description: '仅 single 生效：关闭后点击已展开项不收起',
        default: false,
      },
      disabled: { type: 'boolean', title: '整组禁用', default: false },
    },
    size: { width: 280, height: 180 },
    initial: { type: 'single' },
    container: true,
    events: [
      {
        name: 'update:value',
        title: '展开值变化',
        parameters: [
          {
            name: 'value',
            type: 'string | string[]',
            description: 'single 为字符串，multiple 为数组',
          },
        ],
      },
    ],
  }),
  defineMaterial({
    name: 'agile-plus.accordion-item',
    title: '手风琴项',
    category: '交互',
    icon: 'square',
    parent: 'agile-plus.accordion',
    props: {
      value: { type: 'string', title: '项值', description: '组内唯一' },
      disabled: { type: 'boolean', title: '禁用', default: false },
    },
    size: { width: 280, height: 120 },
    initial: { value: 'item-1' },
    container: true,
    slots: [
      {
        name: 'trigger',
        title: '触发标题条',
        maxChildren: 1,
        region: { x: 0, y: 0, width: 1, height: 0.18 },
      },
      { name: 'default', title: '展开内容', region: { x: 0, y: 0.18, width: 1, height: 0.82 } },
    ],
  }),
  defineMaterial({
    name: 'agile-plus.avatar',
    title: '头像',
    category: '展示',
    icon: 'circle',
    props: {
      src: { type: 'string', title: '图片地址' },
      alt: { type: 'string', title: '替代文本' },
      name: { type: 'string', title: '名字', description: '无图片时按名字生成文字缩写' },
      size: {
        type: 'string',
        title: '尺寸',
        enum: ['small', 'middle', 'large'],
        default: 'middle',
      },
      shape: { type: 'string', title: '形状', enum: ['circle', 'square'], default: 'circle' },
      delayMs: {
        type: 'number',
        title: '补位延迟毫秒',
        description: '大于 0 时避免缓存图片瞬间命中导致补位闪一下',
        default: 0,
      },
    },
    size: { width: 40, height: 40 },
    container: true,
    events: [
      {
        name: 'loading-status-change',
        title: '加载状态变化',
        parameters: [
          { name: 'status', type: 'string', description: 'idle / loading / loaded / error' },
        ],
      },
    ],
  }),
];
