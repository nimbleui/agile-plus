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
    // 样式层只转发默认插槽，标签列表 / 标签 / 面板这三个部件来自无头层
    accepts: ['agile-plus.ui.tabs-list', 'agile-plus.ui.tabs-content'],
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
];
