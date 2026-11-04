import type { MaterialContribution } from '../protocol';

/**
 * 成品组件层（`@agile-plus/components`）的物料清单。
 *
 * 这一层是「拿来就是一只完整控件」的组件：自带样式、自带外观，只喂 props 不喂插槽也能
 * 自洽，所以直接登记组件本体，不包壳 —— 包一层只会把真实属性藏起来。需要往里放内容的
 * 组合件（对话框、标签页、通知、折叠面板、分组族）在 `./materials-composite.ts`，那里
 * 按组件真实的具名插槽逐格声明。
 *
 * 一条判据来自平台实现，决定了这里能登记哪些属性：属性面板对 `object` / `array` 退化成
 * 文本框且写回字符串（见 PropertiesPanel 的 `commitProp`），所以 Slider 的
 * `value: number[]`、Checkbox 的三态这类数组型属性登记了就会坏，等平台补列表设置器再收。
 */
export const materials: MaterialContribution[] = [
  {
    name: 'agile-plus.switch',
    title: '开关',
    category: '表单',
    icon: 'circle',
    // `checked` 是受控通道，刻意不登记：画布设计态不接线事件，面板把受控值写成布尔
    // 后开关会钉死在该值，看起来像「组件坏了」。设计态初值走 defaultChecked，
    // 运行态联动由 `update:checked` → 动作链 → 页面状态完成。
    props: {
      type: 'object',
      properties: {
        defaultChecked: { type: 'boolean', title: '默认打开', default: false },
        disabled: { type: 'boolean', title: '禁用', default: false },
      },
    },
    module: './dist/index.js',
    snippet: {
      id: 'agile-plus-switch-1',
      componentName: 'agile-plus.switch',
      name: '开关',
      layout: { mode: 'absolute', rect: { x: 0, y: 0, width: 44, height: 24 } },
      props: { defaultChecked: false },
    },
    events: [
      {
        name: 'update:checked',
        title: '状态变化',
        description: '用户点击开关后触发，携带切换后的状态',
        parameters: [{ name: 'checked', type: 'boolean', description: '切换后的开关状态' }],
      },
    ],
  },
  {
    name: 'agile-plus.checkbox',
    title: '复选框',
    category: '表单',
    icon: 'square',
    props: {
      type: 'object',
      properties: {
        defaultChecked: {
          type: 'boolean',
          title: '默认勾选',
          description: '三态的 indeterminate 需要列表型属性支持，暂不可配',
          default: false,
        },
        disabled: { type: 'boolean', title: '禁用', default: false },
      },
    },
    module: './dist/index.js',
    snippet: {
      id: 'agile-plus-checkbox-1',
      componentName: 'agile-plus.checkbox',
      name: '复选框',
      layout: { mode: 'absolute', rect: { x: 0, y: 0, width: 20, height: 20 } },
      props: { defaultChecked: false },
    },
    events: [
      {
        name: 'update:checked',
        title: '勾选变化',
        description: '用户勾选或取消勾选后触发',
        parameters: [
          {
            name: 'checked',
            type: 'boolean | "indeterminate"',
            description: '变化后的勾选状态；三态只在组件内部产生',
          },
        ],
      },
    ],
  },
  {
    name: 'agile-plus.slider',
    title: '滑块',
    category: '表单',
    icon: 'sliders',
    // `defaultValue` / `value` 是 number[]：面板会把文本框内容原样写成字符串，
    // 组件读到的 length 就不再是滑块数量，因此初值一律留给组件默认（停在 min）。
    props: {
      type: 'object',
      properties: {
        min: { type: 'number', title: '最小值', default: 0 },
        max: { type: 'number', title: '最大值', description: '必须大于最小值', default: 100 },
        step: { type: 'number', title: '步长', description: '必须大于 0', default: 1 },
        orientation: {
          type: 'string',
          title: '方向',
          enum: ['horizontal', 'vertical'],
          default: 'horizontal',
        },
        inverted: { type: 'boolean', title: '反向', default: false },
        disabled: { type: 'boolean', title: '禁用', default: false },
      },
    },
    module: './dist/index.js',
    snippet: {
      id: 'agile-plus-slider-1',
      componentName: 'agile-plus.slider',
      name: '滑块',
      layout: { mode: 'absolute', rect: { x: 0, y: 0, width: 240, height: 24 } },
      props: { min: 0, max: 100, step: 1, orientation: 'horizontal' },
    },
    events: [
      {
        name: 'value-commit',
        title: '拖动结束',
        description: '松手或键盘确认取值后触发，适合接动作链写回页面状态',
        parameters: [{ name: 'value', type: 'number[]', description: '各滑块当前值' }],
      },
      {
        name: 'update:value',
        title: '拖动中',
        description: '拖动过程中持续触发，不建议挂在耗时动作上',
        parameters: [{ name: 'value', type: 'number[]', description: '各滑块实时值' }],
      },
    ],
  },
  {
    name: 'agile-plus.progress',
    title: '进度条',
    category: '展示',
    icon: 'outline',
    props: {
      type: 'object',
      properties: {
        value: {
          type: 'number',
          title: '进度值',
          description: '取值 0 到最大值；不确定态需要能把值置空，暂不可配',
          default: 60,
        },
        max: {
          type: 'number',
          title: '最大值',
          description: '非正数会回落到 100',
          default: 100,
        },
      },
    },
    module: './dist/index.js',
    snippet: {
      id: 'agile-plus-progress-1',
      componentName: 'agile-plus.progress',
      name: '进度条',
      layout: { mode: 'absolute', rect: { x: 0, y: 0, width: 240, height: 12 } },
      props: { value: 60, max: 100 },
    },
  },
];
