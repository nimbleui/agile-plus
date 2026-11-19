import { defineMaterial } from '../define';

/**
 * 原子件·控件层清单（`@agile-plus/ui` 的开关族与进度族）。
 *
 * 属性表的取舍规则全文件统一：只登记 `as` / `asChild` / `id` / `name` / `form` /
 * `HTMLElement` / 函数型属性以外的项 —— 这些是给写代码的人用的，属性面板既写不出也
 * 不该写。另外数组型属性（`CheckboxGroupRoot` 的 `modelValue: string[]`、
 * `SliderRoot` 的 `value: number[]`）一律不登记：面板会把文本框内容原样写成字符串，
 * 组件读到的类型当场错位。
 *
 * `accepts` 是这一层真正生效的归属约束：拖入时 `canvas-drop` 会按父件的插槽声明判定
 * 「这一格收不收被拖物料」，不收则降级。原子件本身只有默认插槽，所以用 accepts 简写
 * 而不是逐条写 `slots`。
 */
export const materials = [
  defineMaterial({
    name: 'agile-plus.ui.checkbox',
    title: '复选框·根',
    category: '原子件·控件',
    icon: 'square',
    accepts: ['agile-plus.ui.checkbox-indicator'],
    props: {
      defaultChecked: { type: 'boolean', title: '默认勾选', default: false },
      disabled: { type: 'boolean', title: '禁用', default: false },
      required: { type: 'boolean', title: '必填', default: false },
    },
    size: { width: 20, height: 20 },
    container: true,
    events: [
      {
        name: 'update:checked',
        title: '勾选变化',
        parameters: [
          {
            name: 'checked',
            type: 'boolean | "indeterminate"',
            description: '变化后的勾选状态',
          },
        ],
      },
    ],
  }),
  defineMaterial({
    name: 'agile-plus.ui.checkbox-indicator',
    title: '复选框·选中标记',
    category: '原子件·部件',
    icon: 'circle',
    parent: 'agile-plus.ui.checkbox',
    props: { forceMount: { type: 'boolean', title: '常驻挂载', default: false } },
    container: true,
  }),
  defineMaterial({
    name: 'agile-plus.ui.checkbox-group',
    title: '复选框组·根',
    category: '原子件·控件',
    icon: 'group',
    accepts: ['agile-plus.ui.checkbox'],
    props: {
      disabled: { type: 'boolean', title: '整组禁用', default: false },
      required: { type: 'boolean', title: '至少选一个', default: false },
    },
    size: { width: 200, height: 96 },
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
    name: 'agile-plus.ui.switch',
    title: '开关·根',
    category: '原子件·控件',
    icon: 'circle',
    accepts: ['agile-plus.ui.switch-thumb'],
    props: {
      defaultChecked: { type: 'boolean', title: '默认打开', default: false },
      disabled: { type: 'boolean', title: '禁用', default: false },
      required: { type: 'boolean', title: '必填', default: false },
    },
    size: { width: 40, height: 22 },
    container: true,
    events: [
      {
        name: 'update:checked',
        title: '状态变化',
        parameters: [{ name: 'checked', type: 'boolean', description: '切换后的状态' }],
      },
    ],
  }),
  defineMaterial({
    name: 'agile-plus.ui.switch-thumb',
    title: '开关·滑块',
    category: '原子件·部件',
    icon: 'circle',
    parent: 'agile-plus.ui.switch',
    size: { width: 16, height: 16 },
  }),
  defineMaterial({
    name: 'agile-plus.ui.toggle',
    title: '按下切换·根',
    category: '原子件·控件',
    icon: 'square',
    props: {
      defaultPressed: { type: 'boolean', title: '默认按下', default: false },
      disabled: { type: 'boolean', title: '禁用', default: false },
    },
    size: { width: 64, height: 32 },
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
    name: 'agile-plus.ui.toggle-group',
    title: '按下切换组·根',
    category: '原子件·控件',
    icon: 'group',
    accepts: ['agile-plus.ui.toggle-group-item'],
    // `type` 是组件必填项，拖出来必须带值，否则 setup 阶段就缺 prop
    props: {
      type: {
        type: 'string',
        title: '选择模式',
        enum: ['single', 'multiple'],
        default: 'single',
        description: '决定 value 是单个字符串还是字符串数组',
      },
      disabled: { type: 'boolean', title: '整组禁用', default: false },
      rovingFocus: {
        type: 'boolean',
        title: '漫游焦点',
        description: '关闭后每个项都能单独获得焦点',
        default: true,
      },
      loop: { type: 'boolean', title: '方向键循环', default: true },
      orientation: {
        type: 'string',
        title: '排列方向',
        enum: ['horizontal', 'vertical'],
        default: 'horizontal',
      },
    },
    size: { width: 200, height: 40 },
    initial: { type: 'single' },
    container: true,
    events: [
      {
        name: 'update:value',
        title: '选中值变化',
        parameters: [
          {
            name: 'value',
            type: 'string | string[]',
            description: '单选模式为字符串，多选模式为数组',
          },
        ],
      },
    ],
  }),
  defineMaterial({
    name: 'agile-plus.ui.toggle-group-item',
    title: '按下切换组·项',
    category: '原子件·部件',
    icon: 'square',
    parent: 'agile-plus.ui.toggle-group',
    props: {
      value: {
        type: 'string',
        title: '选项值',
        description: '组内唯一；按下态由所属组决定，本项没有 pressed 属性',
      },
      disabled: { type: 'boolean', title: '禁用', default: false },
    },
    initial: { value: 'item-1' },
    container: true,
  }),
  defineMaterial({
    name: 'agile-plus.ui.radio-group',
    title: '单选组·根',
    category: '原子件·控件',
    icon: 'list',
    accepts: ['agile-plus.ui.radio-group-item'],
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
    size: { width: 200, height: 96 },
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
    name: 'agile-plus.ui.radio-group-item',
    title: '单选组·项',
    category: '原子件·部件',
    icon: 'circle',
    parent: 'agile-plus.ui.radio-group',
    props: {
      value: { type: 'string', title: '选项值', description: '组内唯一且必填' },
      disabled: { type: 'boolean', title: '禁用', default: false },
    },
    size: { width: 140, height: 24 },
    initial: { value: 'option-1' },
    container: true,
  }),
  defineMaterial({
    name: 'agile-plus.ui.radio-group-indicator',
    title: '单选组·选中点',
    category: '原子件·部件',
    icon: 'circle',
    // 它注入的是「项」级上下文，不是组的上下文：放错层级照样抛错
    parent: 'agile-plus.ui.radio-group-item',
    size: { width: 10, height: 10 },
    props: { forceMount: { type: 'boolean', title: '常驻挂载', default: false } },
  }),
  defineMaterial({
    name: 'agile-plus.ui.slider',
    title: '滑块·根',
    category: '原子件·控件',
    icon: 'sliders',
    accepts: ['agile-plus.ui.slider-track', 'agile-plus.ui.slider-thumb'],
    // `value` / `defaultValue` 是 number[]，数组型属性写不进面板；`name` / `form` /
    // `thumbLabels` 属于表单与读屏标注，留给写代码的一侧。
    props: {
      min: { type: 'number', title: '最小值', default: 0 },
      max: { type: 'number', title: '最大值', description: '必须大于最小值', default: 100 },
      step: { type: 'number', title: '步长', description: '必须大于 0', default: 1 },
      minStepsBetweenThumbs: { type: 'number', title: '滑块间最小步数', default: 0 },
      preserveThumbOrder: {
        type: 'boolean',
        title: '保持滑块顺序',
        description: '仅多滑块有意义',
        default: false,
      },
      orientation: {
        type: 'string',
        title: '方向',
        enum: ['horizontal', 'vertical'],
        default: 'horizontal',
      },
      dir: { type: 'string', title: '文字方向', enum: ['ltr', 'rtl'], default: 'ltr' },
      inverted: { type: 'boolean', title: '反向', default: false },
      disabled: { type: 'boolean', title: '禁用', default: false },
    },
    size: { width: 240, height: 24 },
    initial: { min: 0, max: 100, step: 1, orientation: 'horizontal' },
    container: true,
    events: [
      {
        name: 'value-commit',
        title: '拖动结束',
        parameters: [{ name: 'value', type: 'number[]', description: '各滑块当前值' }],
      },
      {
        name: 'update:value',
        title: '拖动中',
        parameters: [{ name: 'value', type: 'number[]', description: '各滑块实时值' }],
      },
    ],
  }),
  defineMaterial({
    name: 'agile-plus.ui.slider-track',
    title: '滑块·轨道',
    category: '原子件·部件',
    icon: 'outline',
    parent: 'agile-plus.ui.slider',
    accepts: ['agile-plus.ui.slider-range'],
    size: { width: 240, height: 8 },
    container: true,
  }),
  defineMaterial({
    name: 'agile-plus.ui.slider-range',
    title: '滑块·已选区间',
    category: '原子件·部件',
    icon: 'outline',
    parent: 'agile-plus.ui.slider-track',
    size: { width: 120, height: 8 },
  }),
  defineMaterial({
    name: 'agile-plus.ui.slider-thumb',
    title: '滑块·手柄',
    category: '原子件·部件',
    icon: 'circle',
    parent: 'agile-plus.ui.slider',
    size: { width: 20, height: 20 },
    props: {
      index: {
        type: 'number',
        title: '滑块序号',
        description: '从 0 开始，对应 value 数组下标',
        default: 0,
      },
    },
  }),
  defineMaterial({
    name: 'agile-plus.ui.progress',
    title: '进度条·根',
    category: '原子件·控件',
    icon: 'outline',
    accepts: ['agile-plus.ui.progress-indicator'],
    props: {
      value: {
        type: 'number',
        title: '进度值',
        description: '0 到最大值；不确定态要求值为 null，面板给不出',
        default: 0,
      },
      max: { type: 'number', title: '最大值', description: '非正数会回落到 100', default: 100 },
    },
    size: { width: 240, height: 8 },
    initial: { value: 40, max: 100 },
    container: true,
  }),
  defineMaterial({
    name: 'agile-plus.ui.progress-indicator',
    title: '进度条·指示器',
    category: '原子件·部件',
    icon: 'outline',
    parent: 'agile-plus.ui.progress',
    size: { width: 96, height: 8 },
  }),
  defineMaterial({
    name: 'agile-plus.ui.collapsible',
    title: '折叠面板·根',
    category: '原子件·控件',
    icon: 'chevronDown',
    accepts: ['agile-plus.ui.collapsible-trigger', 'agile-plus.ui.collapsible-content'],
    props: {
      defaultOpen: { type: 'boolean', title: '默认展开', default: false },
      disabled: { type: 'boolean', title: '禁用', default: false },
    },
    size: { width: 240, height: 160 },
    container: true,
    events: [
      {
        name: 'update:open',
        title: '展开状态变化',
        parameters: [{ name: 'value', type: 'boolean', description: '变化后的展开状态' }],
      },
    ],
  }),
  defineMaterial({
    name: 'agile-plus.ui.collapsible-trigger',
    title: '折叠面板·触发器',
    category: '原子件·部件',
    icon: 'chevronRight',
    parent: 'agile-plus.ui.collapsible',
    container: true,
  }),
  defineMaterial({
    name: 'agile-plus.ui.collapsible-content',
    title: '折叠面板·内容',
    category: '原子件·部件',
    icon: 'type',
    parent: 'agile-plus.ui.collapsible',
    size: { width: 240, height: 120 },
    container: true,
    props: {
      forceMount: {
        type: 'boolean',
        title: '常驻挂载',
        description: '收起后不卸载，播退场动画时要开',
        default: false,
      },
    },
  }),
  defineMaterial({
    name: 'agile-plus.ui.input',
    title: '输入框·原子',
    category: '原子件·控件',
    icon: 'type',
    // 受控通道 modelValue 不登记，判据与成品层一致；默认插槽只服务代码侧 asChild，
    // 画布上输入框是叶子，不标容器。
    props: {
      defaultValue: { type: 'string', title: '默认值', default: '' },
      placeholder: { type: 'string', title: '占位提示' },
      type: {
        type: 'string',
        title: '输入类型',
        description: '原生 type，如 text / password / email',
        default: 'text',
      },
      disabled: { type: 'boolean', title: '禁用', default: false },
      readOnly: { type: 'boolean', title: '只读', default: false },
      required: { type: 'boolean', title: '必填', default: false },
    },
    size: { width: 240, height: 32 },
    events: [
      {
        name: 'update:modelValue',
        title: '值变化',
        description: 'IME 组合期间不触发，组合结束后一次性上报',
        parameters: [{ name: 'value', type: 'string', description: '输入框当前值' }],
      },
      {
        name: 'change',
        title: '确认输入',
        parameters: [{ name: 'event', type: 'Event', description: '原生 change 事件' }],
      },
    ],
  }),
  defineMaterial({
    name: 'agile-plus.ui.textarea',
    title: '多行输入·原子',
    category: '原子件·控件',
    icon: 'type',
    props: {
      defaultValue: { type: 'string', title: '默认值', default: '' },
      placeholder: { type: 'string', title: '占位提示' },
      rows: { type: 'number', title: '可见行数', default: 3 },
      disabled: { type: 'boolean', title: '禁用', default: false },
      readOnly: { type: 'boolean', title: '只读', default: false },
      required: { type: 'boolean', title: '必填', default: false },
    },
    size: { width: 240, height: 80 },
    events: [
      {
        name: 'update:modelValue',
        title: '值变化',
        description: 'IME 组合期间不触发，组合结束后一次性上报',
        parameters: [{ name: 'value', type: 'string', description: '多行输入当前值' }],
      },
      {
        name: 'change',
        title: '确认输入',
        parameters: [{ name: 'event', type: 'Event', description: '原生 change 事件' }],
      },
    ],
  }),
];
