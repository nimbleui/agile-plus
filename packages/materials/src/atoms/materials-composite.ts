import { defineMaterial } from '../define';

/**
 * 原子件·组合层清单（浮层、标签页、通知、表单、滚动区、弹性布局）。
 *
 * 这一组的「根」自己几乎不画东西，视觉全部来自往里放的部件，所以根件一律
 * `container: true` 并用 `accepts` 只收自己的部件（拖入时由 canvas-drop 判定生效）；
 * 部件另外用 `parent` 写归属，它今天只是元数据 —— 平台没有 `allowedParents` 的消费点。
 *
 * 三个必须知道的边界：
 *
 * 1. Dialog 的 Overlay 与 Content 通过 Teleport 传送到 `container` 指向的元素，缺省是
 *    `document.body` —— 设计态会跳到画布坐标系外面。`container` 是 `HTMLElement`，
 *    属性面板给不出，所以这里不登记；等平台能把画布 stage 元素传进来，浮层才可真正设计。
 * 2. Toast 的 Root 需要 Provider 与 Viewport 同时存在；没有 Viewport 时它不抛错，
 *    而是静默不渲染。面板上「拖了没反应」多半是这个原因，不是组件坏了。
 * 3. Form 的 FormRoot 不持表单值也没有 schema 属性：字段只以 `FormField name` 的 DOM
 *    形式存在，取值走原生控件与 FormData。所以表单只能在画布上逐个摆字段。
 *
 * 刻意没登记的 ui 导出：`FormFieldValidityState`（renderless，只输出插槽内容）、
 * `Slot`（`asChild` 内部原语，脱离组件上下文没有独立语义）。
 */
export const materials = [
  defineMaterial({
    name: 'agile-plus.ui.dialog',
    title: '对话框·根',
    category: '原子件·容器',
    icon: 'square',
    accepts: [
      'agile-plus.ui.dialog-trigger',
      'agile-plus.ui.dialog-overlay',
      'agile-plus.ui.dialog-content',
    ],
    props: {
      defaultOpen: {
        type: 'boolean',
        title: '默认打开',
        description: '设计态保持关闭，只预览时打开；打开后浮层会传送到 body',
        default: false,
      },
      closeOnEscape: { type: 'boolean', title: 'Esc 关闭', default: true },
      closeOnOverlayClick: { type: 'boolean', title: '点遮罩关闭', default: true },
    },
    size: { width: 240, height: 160 },
    container: true,
    events: [
      {
        name: 'update:open',
        title: '开关变化',
        parameters: [{ name: 'value', type: 'boolean', description: '变化后的打开状态' }],
      },
    ],
  }),
  defineMaterial({
    name: 'agile-plus.ui.dialog-trigger',
    title: '对话框·触发按钮',
    category: '原子件·部件',
    icon: 'chevronRight',
    parent: 'agile-plus.ui.dialog',
    container: true,
  }),
  defineMaterial({
    name: 'agile-plus.ui.dialog-overlay',
    title: '对话框·遮罩',
    category: '原子件·部件',
    icon: 'grid',
    parent: 'agile-plus.ui.dialog',
    size: { width: 240, height: 160 },
    container: true,
  }),
  defineMaterial({
    name: 'agile-plus.ui.dialog-content',
    title: '对话框·面板',
    category: '原子件·部件',
    icon: 'outline',
    parent: 'agile-plus.ui.dialog',
    accepts: [
      'agile-plus.ui.dialog-title',
      'agile-plus.ui.dialog-description',
      'agile-plus.ui.dialog-close',
    ],
    size: { width: 240, height: 160 },
    container: true,
  }),
  defineMaterial({
    name: 'agile-plus.ui.dialog-title',
    title: '对话框·标题',
    category: '原子件·部件',
    icon: 'type',
    parent: 'agile-plus.ui.dialog-content',
  }),
  defineMaterial({
    name: 'agile-plus.ui.dialog-description',
    title: '对话框·描述',
    category: '原子件·部件',
    icon: 'type',
    parent: 'agile-plus.ui.dialog-content',
  }),
  defineMaterial({
    name: 'agile-plus.ui.dialog-close',
    title: '对话框·关闭按钮',
    category: '原子件·部件',
    icon: 'search',
    parent: 'agile-plus.ui.dialog-content',
    container: true,
  }),
  defineMaterial({
    name: 'agile-plus.ui.tabs',
    title: '标签页·根',
    category: '原子件·容器',
    icon: 'grid',
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
        description: 'automatic：方向键移动即选中；manual：方向键只移焦点',
      },
      orientation: {
        type: 'string',
        title: '排列方向',
        enum: ['horizontal', 'vertical'],
        default: 'horizontal',
      },
    },
    size: { width: 320, height: 160 },
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
    name: 'agile-plus.ui.tabs-list',
    title: '标签页·标签列表',
    category: '原子件·部件',
    icon: 'list',
    parent: 'agile-plus.ui.tabs',
    accepts: ['agile-plus.ui.tabs-trigger'],
    size: { width: 320, height: 36 },
    container: true,
  }),
  defineMaterial({
    name: 'agile-plus.ui.tabs-trigger',
    title: '标签页·标签',
    category: '原子件·部件',
    icon: 'square',
    parent: 'agile-plus.ui.tabs-list',
    props: {
      value: {
        type: 'string',
        title: '标签值',
        description: '与对应面板的标签内容值一致，必填',
      },
    },
    initial: { value: 'tab-1' },
    container: true,
  }),
  defineMaterial({
    name: 'agile-plus.ui.tabs-content',
    title: '标签页·面板',
    category: '原子件·部件',
    icon: 'outline',
    parent: 'agile-plus.ui.tabs',
    size: { width: 320, height: 120 },
    props: {
      value: {
        type: 'string',
        title: '对应标签值',
        description: '与哪个标签联动，必填',
      },
    },
    initial: { value: 'tab-1' },
    container: true,
  }),
  defineMaterial({
    name: 'agile-plus.ui.toast-provider',
    title: '通知·上下文',
    category: '原子件·容器',
    icon: 'library',
    accepts: ['agile-plus.ui.toast-viewport', 'agile-plus.ui.toast'],
    props: {
      label: { type: 'string', title: '读屏前缀', default: 'Notification' },
      duration: {
        type: 'number',
        title: '默认停留毫秒',
        description: '0 / 空 / 无穷表示常驻，面板给不出非数值',
        default: 5000,
      },
      swipeDirection: {
        type: 'string',
        title: '滑动关闭方向',
        enum: ['up', 'down', 'left', 'right'],
        default: 'right',
      },
      swipeThreshold: { type: 'number', title: '滑动关闭阈值', default: 50 },
    },
    size: { width: 280, height: 120 },
    container: true,
  }),
  defineMaterial({
    name: 'agile-plus.ui.toast-viewport',
    title: '通知·视口',
    category: '原子件·部件',
    icon: 'grid',
    parent: 'agile-plus.ui.toast-provider',
    accepts: ['agile-plus.ui.toast'],
    size: { width: 280, height: 120 },
    // `hotkey` 是 string[]，数组型属性写不进面板
    props: {
      label: {
        type: 'string',
        title: '区域朗读文案',
        description: '{hotkey} 会被替换成快捷键提示',
        default: 'Notifications ({hotkey})',
      },
    },
    container: true,
  }),
  defineMaterial({
    name: 'agile-plus.ui.toast',
    title: '通知·条目',
    category: '原子件·容器',
    icon: 'outline',
    accepts: [
      'agile-plus.ui.toast-title',
      'agile-plus.ui.toast-description',
      'agile-plus.ui.toast-action',
      'agile-plus.ui.toast-close',
    ],
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
      forceMount: {
        type: 'boolean',
        title: '常驻挂载',
        description: '退场动画期间需要保持存在',
        default: false,
      },
    },
    size: { width: 260, height: 80 },
    container: true,
    events: [
      {
        name: 'update:open',
        title: '开关变化',
        parameters: [{ name: 'open', type: 'boolean', description: '变化后的显示状态' }],
      },
      {
        name: 'swipe-end',
        title: '滑动关闭结束',
        parameters: [
          { name: 'detail', type: 'ToastSwipeDetail', description: '含原始指针事件与位移' },
        ],
      },
      {
        name: 'escape-keydown',
        title: 'Esc 取消',
        parameters: [{ name: 'event', type: 'KeyboardEvent', description: '原始按键事件' }],
      },
      { name: 'pause', title: '暂停倒计时' },
      { name: 'resume', title: '恢复倒计时' },
    ],
  }),
  defineMaterial({
    name: 'agile-plus.ui.toast-title',
    title: '通知·标题',
    category: '原子件·部件',
    icon: 'type',
    parent: 'agile-plus.ui.toast',
  }),
  defineMaterial({
    name: 'agile-plus.ui.toast-description',
    title: '通知·描述',
    category: '原子件·部件',
    icon: 'type',
    parent: 'agile-plus.ui.toast',
  }),
  defineMaterial({
    name: 'agile-plus.ui.toast-action',
    title: '通知·操作',
    category: '原子件·部件',
    icon: 'function',
    parent: 'agile-plus.ui.toast',
    props: {
      altText: {
        type: 'string',
        title: '读屏替代文案',
        description: '留空时组件会报读不到替代文案并渲染不出内容',
      },
    },
    initial: { altText: '关闭通知' },
    container: true,
  }),
  defineMaterial({
    name: 'agile-plus.ui.toast-close',
    title: '通知·关闭',
    category: '原子件·部件',
    icon: 'search',
    parent: 'agile-plus.ui.toast',
    container: true,
  }),
  defineMaterial({
    name: 'agile-plus.ui.form',
    title: '表单·根',
    category: '原子件·容器',
    icon: 'folder',
    accepts: ['agile-plus.ui.form-field', 'agile-plus.ui.form-submit'],
    size: { width: 320, height: 200 },
    container: true,
  }),
  defineMaterial({
    name: 'agile-plus.ui.form-field',
    title: '表单·字段容器',
    category: '原子件·部件',
    icon: 'group',
    parent: 'agile-plus.ui.form',
    accepts: [
      'agile-plus.ui.form-field-label',
      'agile-plus.ui.form-field-control',
      'agile-plus.ui.form-field-message',
    ],
    size: { width: 280, height: 88 },
    props: {
      name: { type: 'string', title: '字段名', description: '表单内唯一，校验与取值都按它' },
      serverInvalid: {
        type: 'boolean',
        title: '服务端报错',
        description: '让字段按非法状态显示服务端错误',
        default: false,
      },
    },
    initial: { name: 'field-1' },
    container: true,
  }),
  defineMaterial({
    name: 'agile-plus.ui.form-field-label',
    title: '表单·标签',
    category: '原子件·部件',
    icon: 'type',
    parent: 'agile-plus.ui.form-field',
    props: {
      name: {
        type: 'string',
        title: '字段名',
        description: '不在字段容器里时必须填，否则读不到校验状态',
      },
      htmlFor: { type: 'string', title: '关联控件 id' },
    },
    container: true,
  }),
  defineMaterial({
    name: 'agile-plus.ui.form-field-control',
    title: '表单·控件',
    category: '原子件·部件',
    icon: 'square',
    parent: 'agile-plus.ui.form-field',
    size: { width: 240, height: 32 },
    props: {
      name: { type: 'string', title: '字段名', description: '不在字段容器里时必须填' },
      // `as` 在别的组件里是内部属性，这里它确实是「选哪种原生控件」的设计期决定，
      // 且必须是 input / textarea / select 三者之一
      as: {
        type: 'string',
        title: '控件类型',
        enum: ['input', 'textarea', 'select'],
        default: 'input',
      },
    },
    container: true,
  }),
  defineMaterial({
    name: 'agile-plus.ui.form-field-message',
    title: '表单·校验提示',
    category: '原子件·部件',
    icon: 'type',
    parent: 'agile-plus.ui.form-field',
    props: {
      name: { type: 'string', title: '字段名', description: '不在字段容器里时必须填' },
      forceMatch: {
        type: 'boolean',
        title: '始终显示',
        description: '忽略校验状态直接渲染，用于设计期看排版',
        default: false,
      },
    },
    container: true,
  }),
  defineMaterial({
    name: 'agile-plus.ui.form-submit',
    title: '表单·提交按钮',
    category: '原子件·部件',
    icon: 'chevronRight',
    parent: 'agile-plus.ui.form',
    container: true,
  }),
  defineMaterial({
    name: 'agile-plus.ui.scroll-area',
    title: '滚动区·根',
    category: '原子件·容器',
    icon: 'grid',
    accepts: [
      'agile-plus.ui.scroll-area-viewport',
      'agile-plus.ui.scroll-area-scrollbar',
      'agile-plus.ui.scroll-area-corner',
    ],
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
    size: { width: 240, height: 160 },
    container: true,
  }),
  defineMaterial({
    name: 'agile-plus.ui.scroll-area-viewport',
    title: '滚动区·视口',
    category: '原子件·部件',
    icon: 'outline',
    parent: 'agile-plus.ui.scroll-area',
    size: { width: 240, height: 160 },
    container: true,
  }),
  defineMaterial({
    name: 'agile-plus.ui.scroll-area-scrollbar',
    title: '滚动区·滚动条',
    category: '原子件·部件',
    icon: 'list',
    parent: 'agile-plus.ui.scroll-area',
    accepts: ['agile-plus.ui.scroll-area-thumb'],
    size: { width: 240, height: 12 },
    props: {
      orientation: {
        type: 'string',
        title: '方向',
        enum: ['vertical', 'horizontal'],
        default: 'vertical',
      },
      forceMount: {
        type: 'boolean',
        title: '常驻挂载',
        description: '关闭自动隐藏，设计期才看得见',
        default: false,
      },
    },
    container: true,
  }),
  defineMaterial({
    name: 'agile-plus.ui.scroll-area-thumb',
    title: '滚动区·滚动滑块',
    category: '原子件·部件',
    icon: 'circle',
    parent: 'agile-plus.ui.scroll-area-scrollbar',
    size: { width: 48, height: 8 },
  }),
  defineMaterial({
    name: 'agile-plus.ui.scroll-area-corner',
    title: '滚动区·交角',
    category: '原子件·部件',
    icon: 'square',
    parent: 'agile-plus.ui.scroll-area',
    size: { width: 12, height: 12 },
  }),
  defineMaterial({
    name: 'agile-plus.ui.flex',
    title: '弹性布局·根',
    category: '原子件·容器',
    icon: 'group',
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
    size: { width: 240, height: 80 },
    container: true,
  }),
  defineMaterial({
    name: 'agile-plus.ui.flex-item',
    title: '弹性布局·项',
    category: '原子件·部件',
    icon: 'square',
    // 脱离弹性布局使用不报错也不会生效，归属只作为面板提示
    parent: 'agile-plus.ui.flex',
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
    name: 'agile-plus.ui.ellipsis',
    title: '文本省略·原子',
    category: '原子件·展示',
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
    name: 'agile-plus.ui.dropdown-menu-item',
    title: '菜单项',
    category: '原子件·浮层',
    icon: 'outline',
    props: {
      value: { type: 'string', title: '值', description: '激活时经 select 事件上报' },
      disabled: { type: 'boolean', title: '禁用', default: false },
      textValue: { type: 'string', title: 'typeahead 文本', description: '缺省取项文本' },
    },
    initial: { value: 'item-1' },
    size: { width: 160, height: 28 },
    parent: 'agile-plus.dropdown-menu',
    container: true,
  }),
  defineMaterial({
    name: 'agile-plus.ui.dropdown-menu-checkbox-item',
    title: '可勾选菜单项',
    category: '原子件·浮层',
    icon: 'outline',
    props: {
      value: { type: 'string', title: '值' },
      checked: { type: 'boolean', title: '受控勾选', default: undefined },
      defaultChecked: { type: 'boolean', title: '默认勾选', default: false },
      disabled: { type: 'boolean', title: '禁用', default: false },
    },
    initial: { value: 'check-1' },
    size: { width: 160, height: 28 },
    parent: 'agile-plus.dropdown-menu',
    container: true,
    events: [
      {
        name: 'update:checked',
        title: '勾选变化',
        parameters: [{ name: 'value', type: 'boolean', description: '变化后的勾选态' }],
      },
    ],
  }),
  defineMaterial({
    name: 'agile-plus.ui.dropdown-menu-label',
    title: '菜单分组标题',
    category: '原子件·浮层',
    icon: 'type',
    size: { width: 160, height: 24 },
    parent: 'agile-plus.dropdown-menu',
    container: true,
  }),
  defineMaterial({
    name: 'agile-plus.ui.dropdown-menu-separator',
    title: '菜单分隔线',
    category: '原子件·浮层',
    icon: 'outline',
    size: { width: 160, height: 1 },
    parent: 'agile-plus.dropdown-menu',
  }),
  // Pagination 的页码项来自 Root 作用域里的 items，由消费者 v-for 分发；画布拖不出
  // v-for，所以页码/省略号要逐个手动拖入，或直接用成品件 agile-plus.pagination。
  // 所有部件都渲染成 li，而 li 的直接父级必须是列表元素，因此它们一律挂在「页码列表」
  // 之下，Root 只接受这一个容器件。
  defineMaterial({
    name: 'agile-plus.ui.pagination',
    title: '分页·根',
    category: '原子件·容器',
    icon: 'grid',
    accepts: ['agile-plus.ui.pagination-list'],
    props: {
      defaultValue: { type: 'number', title: '默认页码', default: 1 },
      total: { type: 'number', title: '数据总条数', default: 100 },
      pageSize: { type: 'number', title: '每页条数', default: 10 },
      siblingCount: {
        type: 'number',
        title: '当前页两侧页码数',
        description: '0 也合法',
        default: 1,
      },
      boundaryCount: {
        type: 'number',
        title: '首尾固定页码数',
        description: '0 也合法',
        default: 1,
      },
      disabled: { type: 'boolean', title: '整条禁用', default: false },
      ariaLabel: {
        type: 'string',
        title: '地标名称',
        description: '屏幕阅读器区分多个分页条',
        default: '分页',
      },
    },
    size: { width: 320, height: 32 },
    container: true,
    events: [
      {
        name: 'update:modelValue',
        title: '页码变化',
        parameters: [{ name: 'value', type: 'number', description: '切换后的页码' }],
      },
    ],
  }),
  defineMaterial({
    name: 'agile-plus.ui.pagination-list',
    title: '分页·页码列表',
    category: '原子件·部件',
    icon: 'list',
    parent: 'agile-plus.ui.pagination',
    accepts: [
      'agile-plus.ui.pagination-prev',
      'agile-plus.ui.pagination-page',
      'agile-plus.ui.pagination-ellipsis',
      'agile-plus.ui.pagination-next',
      'agile-plus.ui.pagination-jumper',
    ],
    size: { width: 320, height: 32 },
    container: true,
  }),
  defineMaterial({
    name: 'agile-plus.ui.pagination-page',
    title: '分页·页码',
    category: '原子件·部件',
    icon: 'square',
    parent: 'agile-plus.ui.pagination-list',
    props: {
      page: { type: 'number', title: '页码', description: '既是按钮文本也是点击目标，必填' },
    },
    initial: { page: 1 },
    container: true,
  }),
  defineMaterial({
    name: 'agile-plus.ui.pagination-ellipsis',
    title: '分页·省略号',
    category: '原子件·部件',
    icon: 'list',
    parent: 'agile-plus.ui.pagination-list',
    props: {
      side: {
        type: 'string',
        title: '所属侧',
        enum: ['start', 'end'],
        description: '只影响样式挂钩，不影响交互',
        default: 'start',
      },
    },
    initial: { side: 'end' },
  }),
  defineMaterial({
    name: 'agile-plus.ui.pagination-prev',
    title: '分页·上一页',
    category: '原子件·部件',
    icon: 'chevronRight',
    parent: 'agile-plus.ui.pagination-list',
    props: {
      label: {
        type: 'string',
        title: '可访问名',
        description: '样式层换成箭头后靠它朗读',
        default: '上一页',
      },
    },
    initial: { label: '上一页' },
    container: true,
  }),
  defineMaterial({
    name: 'agile-plus.ui.pagination-next',
    title: '分页·下一页',
    category: '原子件·部件',
    icon: 'chevronRight',
    parent: 'agile-plus.ui.pagination-list',
    props: {
      label: {
        type: 'string',
        title: '可访问名',
        description: '样式层换成箭头后靠它朗读',
        default: '下一页',
      },
    },
    initial: { label: '下一页' },
    container: true,
  }),
  defineMaterial({
    name: 'agile-plus.ui.pagination-jumper',
    title: '分页·页码跳转',
    category: '原子件·部件',
    icon: 'type',
    parent: 'agile-plus.ui.pagination-list',
    props: {
      label: { type: 'string', title: '前缀文字', default: '跳至' },
      suffix: { type: 'string', title: '后缀单位', default: '页' },
      ariaLabel: { type: 'string', title: '输入框可访问名', default: '页码' },
    },
    initial: { label: '跳至' },
    container: true,
  }),
];
