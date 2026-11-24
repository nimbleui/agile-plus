<script setup>
import MenuDemo from '../.vitepress/components/MenuDemo.vue';
import Preview from '../.vitepress/components/Preview.vue';
</script>

# Menu 导航菜单

用于页面侧栏、顶部导航与嵌套入口。成品 API 沿用 Ant Design / Element Plus 的导航菜单心智：选中与展开都使用键数组，支持三种布局、inline 折叠、多选与同级手风琴。

内部仍按四层拆分：`primitives/menu` 计算选中、展开、键路径与键盘目标；`headless/useMenu` 管理 Vue 状态、注册表和焦点；`ui/menu` 提供 `MenuRoot` 等部件与 ARIA 结构；`components/menu` 组合为 `Menu`、`SubMenu` 并注入样式。

## 与 DropdownMenu 的分工

| 场景     | Menu                                     | DropdownMenu                     |
| -------- | ---------------------------------------- | -------------------------------- |
| 用途     | 持续可见的应用导航、页面入口、层级菜单   | 由按钮触发的临时操作菜单         |
| 状态     | 选中项与展开项分开，均为键数组           | 浮层开合与单次操作值             |
| 结构     | 可嵌套 `SubMenu`、分组、链接与 inline 树 | 平铺操作项、标签与分隔线         |
| 焦点     | 焦点进入菜单项，Tab 可离开整个菜单       | 焦点进入浮层项，关闭时归还触发器 |
| 选择语义 | 表达当前页面或导航入口，支持多选         | 执行一次操作，通常选中后关闭     |

需要“操作”“新建”“更多”时用 [DropdownMenu](/components/dropdown-menu)；需要表达“我在哪个页面”时用 Menu。两者不是彼此的浮层替代品。

## 基础示例

<Preview description="可切换 inline / horizontal / vertical，支持折叠、多选、手风琴、嵌套分组、禁用与危险项；下方实时显示键数组和最近事件。">
  <MenuDemo />
</Preview>

```vue
<script setup lang="ts">
import { Menu, MenuItem, MenuItemGroup, SubMenu } from '@agile-plus/components/menu';
</script>

<template>
  <Menu
    mode="inline"
    :default-selected-keys="['home']"
    :default-open-keys="['workspace']"
    @select="(info) => console.log(info.key, info.keyPath)"
  >
    <MenuItem value="home">总览</MenuItem>

    <SubMenu value="workspace" title="工作空间">
      <MenuItem :value="1">项目看板</MenuItem>

      <SubMenu value="components" title="组件资源">
        <MenuItemGroup title="基础组件">
          <MenuItem value="button">Button</MenuItem>
          <MenuItem value="form">Form</MenuItem>
        </MenuItemGroup>
      </SubMenu>
    </SubMenu>

    <MenuItem value="docs" href="/guide/getting-started">使用文档</MenuItem>
  </Menu>
</template>
```

`value` 接受 `string | number`，同一菜单内应保持唯一。提供 `href` 时交互元素渲染为 `<a>`，否则渲染为 `<button type="button">`。

## 受控与非受控

`selectedKeys` 与 `openKeys` 是两组独立状态，可以分别受控。只有属性值为 `undefined` 时才走内部状态；传入 `[]` 表示“受控且为空”，不会回退到默认值。

### 非受控

只提供初始值，后续由 Menu 自己更新：

```vue
<Menu :default-selected-keys="['home']" :default-open-keys="['workspace']">
  <!-- MenuItem / SubMenu -->
</Menu>
```

### 受控

使用 `v-model:selected-keys` 与 `v-model:open-keys` 接收更新；受控时组件不会自行改写外部数组。

```vue
<script setup lang="ts">
import { ref } from 'vue';

import { Menu, MenuItem, SubMenu } from '@agile-plus/components/menu';

import type { MenuKey } from '@agile-plus/primitives/menu';
import type { MenuSelectInfo } from '@agile-plus/headless/useMenu';

const selectedKeys = ref<MenuKey[]>(['home']);
const openKeys = ref<MenuKey[]>(['workspace']);

function onSelect(info: MenuSelectInfo) {
  console.log(info.key, info.keyPath, info.selectedKeys);
}
</script>

<template>
  <Menu
    v-model:selected-keys="selectedKeys"
    v-model:open-keys="openKeys"
    mode="inline"
    @select="onSelect"
    @open-change="(keys) => console.log('展开集合变化', keys)"
  >
    <MenuItem value="home">总览</MenuItem>
    <SubMenu value="workspace" title="工作空间">
      <MenuItem value="projects">项目</MenuItem>
    </SubMenu>
  </Menu>
</template>
```

`select` 在每次激活可用项时触发，即使它已经被选中；`update:selectedKeys` 只在选中集合实际变化时触发。`update:openKeys` 与 `openChange` 都携带完整展开键数组，仅在集合变化时触发。

## 三种模式

| `mode`       | 布局           | 子菜单行为                           | 顶层水平导航                       |
| ------------ | -------------- | ------------------------------------ | ---------------------------------- |
| `vertical`   | 默认纵向侧栏   | 点击或悬停打开，默认在右侧弹出       | 使用 `↑` / `↓`                     |
| `inline`     | 可展开的内联树 | 在当前菜单树内展开或收起，内容常驻   | 使用 `↑` / `↓`，`→` 进入，`←` 返回 |
| `horizontal` | 顶部横向导航   | 顶层菜单向下弹出，更深层默认向右弹出 | 使用 `←` / `→`，`↓` 进入子菜单     |

```vue
<Menu mode="vertical"><MenuItem value="home">总览</MenuItem></Menu>
<Menu mode="inline"><MenuItem value="home">总览</MenuItem></Menu>
<Menu mode="horizontal"><MenuItem value="home">总览</MenuItem></Menu>
```

`container` 指定 vertical / horizontal 弹出子菜单的传送目标，默认 `body`，可传 CSS 选择器或 `HTMLElement`。inline 内容不传送。

## 子菜单与分组

`SubMenu` 组合触发器与内容，可无限嵌套。`title` 是默认标题，也可用 `title` 插槽自定义。

```vue
<SubMenu value="workspace" title="工作空间">
  <template #icon><span aria-hidden="true">◈</span></template>
  <MenuItem value="projects">项目</MenuItem>

  <SubMenu value="components" title="组件资源">
    <MenuItemGroup title="基础组件">
      <MenuItem value="button">Button</MenuItem>
      <MenuItem value="input">Input</MenuItem>
    </MenuItemGroup>

    <MenuItemGroup title="数据展示">
      <MenuItem value="table">Table</MenuItem>
    </MenuItemGroup>
  </SubMenu>
</SubMenu>
```

- 非 inline 模式支持指针悬停打开；离开触发器或弹出层后延迟关闭，移入弹出层会取消关闭。
- 关闭父级 `SubMenu` 会同时移除全部后代的展开键。
- `accordion` 开启后，展开一个子菜单会关闭同级兄弟及其后代；不同层级互不影响。
- `MenuItemGroup` 只提供语义分组与标题，不参与选中和键盘顺序计算。

## inline 折叠

`inline-collapsed` 只在 `mode="inline"` 时生效。折叠后菜单收窄为图标栏，标题、后缀与箭头隐藏；聚焦项或子菜单触发器显示 Tooltip，子菜单改为弹出。

```vue
<Menu mode="inline" inline-collapsed :open-keys="openKeys">
  <MenuItem value="home">
    <template #icon><span aria-hidden="true">⌂</span></template>
    <template #tooltip>工作台总览</template>
    总览
  </MenuItem>
</Menu>
```

折叠不会清空 `openKeys`。再次展开时，仍会恢复到此前保存的展开集合；如果在折叠态点击了弹出子菜单外部，弹出开合逻辑会关闭全部展开键。

## Menu API

`MenuKey = string | number`。

### Props

| 属性                  | 类型                                     | 默认值       | 说明                               |
| --------------------- | ---------------------------------------- | ------------ | ---------------------------------- |
| `selectedKeys`        | `MenuKey[]`                              | `undefined`  | 受控选中键；不传即非受控           |
| `defaultSelectedKeys` | `MenuKey[]`                              | `[]`         | 非受控选中键初值                   |
| `openKeys`            | `MenuKey[]`                              | `undefined`  | 受控展开键；不传即非受控           |
| `defaultOpenKeys`     | `MenuKey[]`                              | `[]`         | 非受控展开键初值                   |
| `mode`                | `'vertical' \| 'inline' \| 'horizontal'` | `'vertical'` | 布局与子菜单呈现方式               |
| `inlineCollapsed`     | `boolean`                                | `false`      | 是否折叠 inline 侧栏               |
| `accordion`           | `boolean`                                | `false`      | 同级子菜单是否手风琴展开           |
| `multiple`            | `boolean`                                | `false`      | 是否多选；多选时再次激活可取消选中 |
| `selectable`          | `boolean`                                | `true`       | 是否允许选中；关闭后子菜单仍可展开 |
| `disabled`            | `boolean`                                | `false`      | 禁用整棵菜单，包括子菜单           |
| `container`           | `string \| HTMLElement`                  | `'body'`     | 弹出子菜单的传送目标               |

### Events

| 事件                  | 参数                             | 说明                           |
| --------------------- | -------------------------------- | ------------------------------ |
| `update:selectedKeys` | `keys: MenuKey[]`                | 选中集合变化，配合 `v-model`   |
| `select`              | `{ key, keyPath, selectedKeys }` | 当前项激活，含完整路径与新集合 |
| `update:openKeys`     | `keys: MenuKey[]`                | 展开集合变化，配合 `v-model`   |
| `openChange`          | `keys: MenuKey[]`                | 展开集合变化                   |

### MenuItem

| 属性        | 类型               | 默认值      | 说明                          |
| ----------- | ------------------ | ----------- | ----------------------------- |
| `value`     | `string \| number` | 必填        | 菜单内唯一的语义键            |
| `href`      | `string`           | `undefined` | 链接地址；提供后渲染为 `a`    |
| `target`    | `string`           | `undefined` | 原生链接目标                  |
| `rel`       | `string`           | `undefined` | 原生链接关系                  |
| `disabled`  | `boolean`          | `false`     | 禁用当前项                    |
| `danger`    | `boolean`          | `false`     | 危险操作视觉语义              |
| `textValue` | `string`           | 自动读取    | typeahead 与折叠 Tooltip 文本 |
| `as`        | `string`           | 自动推断    | 交互元素标签                  |
| `asChild`   | `boolean`          | `false`     | 把属性与事件合并到唯一子元素  |

插槽：`icon`、`default`、`suffix`、`tooltip`。装饰图标应放在 `icon` 插槽中并标记 `aria-hidden`。

### SubMenu

| 属性       | 类型               | 默认值  | 说明             |
| ---------- | ------------------ | ------- | ---------------- |
| `value`    | `string \| number` | 必填    | 子菜单唯一语义键 |
| `title`    | `string`           | —       | 默认标题         |
| `disabled` | `boolean`          | `false` | 禁用当前子树     |

插槽：`icon`、`title`、`default`、`tooltip`。`default` 放置 `MenuItem`、嵌套 `SubMenu` 或 `MenuItemGroup`。

### MenuItemGroup

| 属性    | 类型     | 说明                 |
| ------- | -------- | -------------------- |
| `title` | `string` | 分组标题，不参与选中 |

## 键盘交互

焦点采用 roving `tabindex`：可用项中优先保留当前焦点项，其次选中的项，否则首项进入 Tab 顺序。方向键跳过禁用项，并在当前层首尾循环。

| 按键                                   | 行为                                                      |
| -------------------------------------- | --------------------------------------------------------- |
| `Tab` / `Shift+Tab`                    | 进入或离开菜单，不拦截默认行为                            |
| `↑` / `↓`                              | vertical、inline 与弹出层内移动到上一个 / 下一个可用项    |
| `←` / `→`                              | horizontal 顶层移动到上一个 / 下一个入口                  |
| `→`（子菜单触发器）                    | 展开子菜单并聚焦首个可用项                                |
| `↓`（horizontal 顶层子菜单）           | 展开子菜单并聚焦首个可用项                                |
| `←`（子菜单内容内）                    | 关闭当前父级子菜单，焦点返回父级触发器                    |
| `Home` / `End`                         | 聚焦当前层首个 / 末个可用项                               |
| `Enter` / `Space`                      | 选中当前项，或切换当前子菜单                              |
| `Escape`                               | 关闭当前子菜单；焦点在内容内时返回父级触发器              |
| 单个可打印字符                         | 按文本前缀跳到下一匹配项，跳过禁用项；horizontal 顶层除外 |
| `Shift` / `Ctrl` / `Alt` / `Meta` 组合 | 交还浏览器，不拦截                                        |

非 inline 弹出层还支持外部点击关闭全部弹出子菜单。首字搜索每次只匹配一个字符，不累积多字符搜索串；可用 `textValue` 指定比可见文本更准确的搜索文本。

## 无障碍

- 根与子菜单内容使用 `role="menu"`，方向由根节点的 `aria-orientation` 表达。
- 交互项使用 `role="menuitem"`；选中项使用 `aria-current="page"`，不是 `aria-selected`。
- 子菜单触发器提供 `aria-haspopup="menu"`、`aria-expanded`、`aria-controls`；内容通过 `aria-labelledby` 反向关联触发器。
- 分组列表使用 `role="group"` 与 `aria-labelledby`，标题本身不进入导航顺序。
- 禁用项使用 `aria-disabled="true"`、`tabindex="-1"` 并拦截激活；整树禁用会向所有项传播。
- 焦点直接落在可交互项上，没有 `aria-activedescendant`；折叠 Tooltip 通过 `aria-describedby` 关联。
- `danger` 仅是视觉语义，不替代删除确认、错误说明或 `role="alert"`。

首版采用 ARIA 的 `menu` / `menuitem` 交互模型，而不是 `navigation` 地标。构建页面主导航时，建议在外层补 `<nav aria-label="主导航">`，并随选中项更新页面标题。

## 与 Radix / Reka 的差异

- **成品 API 面向导航场景**：对齐 Ant Design / Element Plus 的 `selectedKeys`、`openKeys`、`mode`、`inlineCollapsed`、`accordion` 等心智；不是 Radix / Reka DropdownMenu API 的直接移植。
- **内部保留组合式部件**：`ui/menu` 提供 `MenuRoot`、`MenuItem`、`MenuSub`、`MenuSubTrigger`、`MenuSubContent`、`MenuItemGroup`；成品 `SubMenu` 只是便于使用的组合出口。
- **键数组而非单值**：选中与展开分离，天然支持多选和多个展开节点；不同于许多组合式菜单以单一 `value` / `onValueChange` 表达一次激活。
- **模式与布局是成品能力**：inline 树、horizontal 顶栏和图标折叠由同一棵组件树复用；Radix / Reka 通常把这些留给使用方组合。
- **焦点模型不同**：Menu 把焦点移入实际菜单项；DropdownMenu 采用触发器上的 activedescendant 模型，两者不要混用键盘预期。

## 已知限制

- 首版不支持 `items` 数据源，需要使用 `MenuItem` / `SubMenu` / `MenuItemGroup` 声明式组合。
- 不内置 Vue Router 等路由绑定；使用 `href`，或监听 `select` 后由使用方执行路由跳转。
- 不支持虚拟滚动；超长 inline 树会完整渲染，弹出子菜单仅在展开时挂载内容。
