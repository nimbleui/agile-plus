# @agile-plus/materials

低代码平台物料插件：把成品组件与无样式原子件登记成平台的 `materials` 贡献。

它本身不实现任何控件，只做**登记**——一份纯数据清单告诉设计器「有哪些物料、各自什么属性」，
一张组件名字表告诉运行时「物料名对应哪个 Vue 组件」。

```text
@agile-plus/materials    ← 本包（物料登记）
@agile-plus/components   带样式成品组件
@agile-plus/ui           无样式原子件
```

依赖 `@agile-plus/components` 与 `@agile-plus/ui`，peer 依赖 `vue ^3.5.0`。产物为 ESM。

## 安装

```bash
pnpm add @agile-plus/materials
```

## 两个入口

| 入口 | 内容 | 为什么分开 |
| --- | --- | --- |
| `@agile-plus/materials/manifest` | `manifest: PluginManifest`：纯数据清单，零组件依赖 | 物料面板要在组件代码加载之前就能渲染 |
| `@agile-plus/materials` | `components: Record<string, Component>` 名字表；同时提供 `default` 导出 | 组件代码按需异步加载，不阻塞设计器 |

清单刻意不从根入口导出：两个入口共享同一份数据时，构建会把它抽成带哈希名的公共块，
`./manifest` 退化成二次跳转，而远程物料包正是按固定 URL 取清单的。

## 登记方式

```ts
loader.register({
  manifest: (await import('@agile-plus/materials/manifest')).manifest,
  load: () => import('@agile-plus/materials'),
});
```

`load` 返回的模块命名空间里，物料服务先读 `components` 名字表，读不到才回落 `default`。

## 命名

一张名字表合成两个层，设计器里按前缀区分：

- `agile-plus.*`：带样式的成品组件，18 条，例如 `agile-plus.switch`。
- `agile-plus.ui.*`：无样式的原子件，需要自行组合，51 条，例如 `agile-plus.ui.switch`。

平台按物料名查表，不关心它来自哪一层。物料名带命名空间前缀是为了不与其他物料包撞名；
`componentName` 由 `defineMaterial` 直接取 `name` 原样写入，不做任何命名转换——
隐式派生一旦与名字表的键对不上，平台不报错，只在画布上画成占位块。

## 清单条目

69 条清单里有两种写法并存，各自有理由。

**4 条叶子成品是字面量**（`styled/materials.ts` 里的 Switch / Checkbox / Slider / Progress）：
这一层的组件「拿来就是一只完整控件」，自带外观、只喂 props 不喂插槽也能自洽，所以直接登记组件本体，
包一层构造器只会把真实属性藏得更深。

```ts
{
  name: 'agile-plus.switch',
  title: '开关',
  category: '表单',
  icon: 'circle',
  // checked 是受控通道，刻意不登记：画布设计态不接线事件，面板把受控值写成布尔后
  // 开关会钉死在该值上，看起来像「组件坏了」。设计态初值走 defaultChecked。
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
      parameters: [{ name: 'checked', type: 'boolean', description: '切换后的开关状态' }],
    },
  ],
}
```

**其余 65 条走 `defineMaterial(spec)`**（`src/define.ts`，包内构造器、不对外导出），因为它收敛了
四个与 `name` / `title` 完全同源的字段：`module` 固定 `'./dist/index.js'`、`snippet.id`、
`snippet.componentName`、`snippet.name`。手写最容易出的错是 `componentName` 与 `name` 对不上——
平台不报错，只在画布上画成占位块。同时它给 `props` 补上面板要求的 `{ type: 'object' }` 外壳。

```ts
defineMaterial({
  name: 'agile-plus.ui.switch',
  title: '开关·根',
  category: '原子件·控件',
  icon: 'circle',
  container: true,
  accepts: ['agile-plus.ui.switch-thumb'],
  size: { width: 40, height: 22 },
  props: {
    defaultChecked: { type: 'boolean', title: '默认打开', default: false },
    disabled: { type: 'boolean', title: '禁用', default: false },
    required: { type: 'boolean', title: '必填', default: false },
  },
  events: [
    {
      name: 'update:checked',
      title: '状态变化',
      parameters: [{ name: 'checked', type: 'boolean', description: '切换后的状态' }],
    },
  ],
});
```

`accepts` 会被展开成一个覆盖整个容器的 `default` 插槽；需要逐格落点（对话框的 trigger / title /
description）时改用 `slots`，此时顺序有意义：先写窄条区域，最后写覆盖全容器的兜底插槽。

`spec` 字段：`name` `title` `category` `icon` 必填，另有 `props` `size` `initial` `container`
`accepts` / `slots`（互斥，同时给出会抛错）`parent` `events`。
`size` 缺省 120×32（部件与无独立外观的条目：够选拖，但不假装是一块内容区）。
`parent` 会被写成 `allowedParents: [parent]`。

刻意不做的一件事：不自动从 `props` 的 `default` 生成 snippet 初值。落点节点只读 `snippet.props`，
组件默认值由组件自己的运行时 default 生效，两条路径混在一起反而看不清哪个值真正落进了 schema；
需要拖出来就带特定初值时显式写 `initial`。

`spec` 字段：`name` `title` `category` `icon` 必填，另有 `props` `size` `initial` `container`
`accepts` / `slots`（互斥，同时给出会抛错）`parent` `events`。
`size` 缺省 120×32（部件与无独立外观的条目：够选够拖，但不假装是一块内容区）。
`parent` 会被写成 `allowedParents: [parent]`。

`initial` 决定拖入时的取值；`props[].default` 面板不读，不要指望它生效。这里刻意不自动从
`props` 生成 snippet 初值——落点节点只读 `snippet.props`，与组件运行时默认值是两条路径，
混起来反而看不清哪个值真正落进了 schema。

## 协议

`protocol.ts` 是平台物料协议在本仓库的最小镜像（`PropSchemaType` `PropSchemaItem` `PropsSchema`
`EventDefinition` `SlotDefinition` `SlotRegion` `MaterialNodeSnippet` `MaterialContribution`
`PluginManifest`）。重述而不直接依赖平台私有内核，是为了让这个包能独立发布到 npm；
代价是需人工同步，两侧不一致会在平台登记阶段以「缺字段」形式暴露。

一律用 `type` 而不是 `interface`：平台的属性面板把 `props` 当 `Record<string, unknown>` 读取，
`interface` 赋给它会报「缺少索引签名」。

清单里刻意不包含任何私有内核类型，避免内部类型被公共包锁住。

## 当前限制

这些限制来自平台消费点，不是本包能绕开的，登记前先看：

- **数组与对象属性还不能登记**。`object` / `array` 在面板里退化成文本框且写回字符串，
  所以 Slider 的 `defaultValue: number[]` 这类属性暂未登记，等平台补列表设置器。
- **表达式绑定只对文本型属性开放**，布尔与数值属性无法绑 `{{ }}`。
- **具名插槽只改变数据落位**。拖入时按 `region`（容器矩形的 0–1 比例）判定落进哪一格并写进
  `parent.slots[<name>]`，但渲染层目前仍把 children 与全部插槽压成同一份默认插槽内容，组件还收不到分开的插槽。
  因此 `slots` 的声明顺序有意义：先写窄条区域，最后写覆盖全容器的兜底插槽。
- **`allowedParents` 目前没有消费点**，只是元数据；真正生效的归属约束是父件的 `slots[].accepts`。
- 事件名必须与组件 `emit` 的名字逐字一致。
- `icon` 必须取自平台共享图标注册表，未注册名会回退成方箱。

## 分类

物料面板分组按层的用途划分，共 8 组：`原子件·部件` 35 条、`原子件·控件` 9 条、`表单` 8 条、
`原子件·容器` 7 条、`浮层` 3 条、`布局` 3 条、`交互` 3 条、`展示` 1 条。
`category` 是自由字符串（平台按它分组），但必须与已有分组一致。

## 版本与许可

当前 `0.1.0`，MIT。清单里的 `version` 与本包版本同步维护，`engines.lowcode`（`^0.1.0`）
约束可装载它的平台版本，`certification: 'verified'`、`executionProfile: 'inline'`。
`sideEffects: false`。`__tests__` 下 1 个测试文件，校验名字表键与清单条目一一对应。
