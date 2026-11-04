# @agile-plus/materials

低代码平台物料插件：把成品组件与 UI 层原子件登记成平台的 `materials` 贡献。

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
| `@agile-plus/materials/manifest` | `manifest`：纯数据清单，零组件依赖 | 物料面板要在组件代码加载之前就能渲染 |
| `@agile-plus/materials` | `components`：物料名 → 组件的名字表（同时提供 `default` 导出） | 组件代码按需异步加载，不阻塞设计器 |

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

- `agile-plus.*`：带样式的成品组件，例如 `agile-plus.switch`。
- `agile-plus.ui.*`：无样式的原子件，需要自行组合，例如 `agile-plus.ui.switch`。

平台按物料名查表，不关心它来自哪一层。

## 版本与许可

当前 `0.1.0`，MIT。`engines.lowcode` 约束目标平台版本，清单里的 `version` 与本包版本同步维护。
