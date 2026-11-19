<script setup>
import AvatarDemo from '../.vitepress/components/AvatarDemo.vue';
import Preview from '../.vitepress/components/Preview.vue';
</script>

# Avatar 头像

头像控件，对应 Radix Primitives 的 `avatar` 包：`Root` / `Image` / `Fallback` 三个部件。
图片就绪前、加载失败或无 `src` 时显示补位内容；本库额外提供按名字生成文字缩写的纯算法。

## 基础示例

<Preview description="尺寸 / 形状变体、文字缩写、图片加载成功与失败回退、自定义补位内容。左图加载状态由 loading-status-change 事件实时上报。">
  <AvatarDemo />
</Preview>

```vue
<script setup lang="ts">
import { Avatar } from '@agile-plus/components/avatar';
</script>

<template>
  <Avatar src="/alice.png" alt="Alice" name="Alice Lee" size="large" />

  <!-- 无图片时按 name 生成缩写 "AL" -->
  <Avatar name="Alice Lee" />

  <!-- 默认插槽覆盖补位内容 -->
  <Avatar name="Alice Lee"><span>VIP</span></Avatar>
</template>
```

## Props

| 属性      | 类型                          | 默认值      | 说明                                             |
| --------- | ----------------------------- | ----------- | ------------------------------------------------ |
| `src`     | `string`                      | `undefined` | 图片地址                                         |
| `alt`     | `string`                      | `undefined` | 替代文本；装饰性头像可给空串                     |
| `name`    | `string`                      | `undefined` | 无补位插槽时按名字生成文字缩写                   |
| `size`    | `'small' \| 'middle' \| 'large'` | `'middle'` | 尺寸（24 / 32 / 40px）                           |
| `shape`   | `'circle' \| 'square'`        | `'circle'`  | 形状                                             |
| `delayMs` | `number`                      | `0`         | 补位延迟毫秒，避免缓存图片瞬间命中时补位闪一下   |

## Events

| 事件                    | 参数              | 说明                                       |
| ----------------------- | ----------------- | ------------------------------------------ |
| `loading-status-change` | `status: string`  | 加载状态变化：`idle / loading / loaded / error` |

## Slots

| 名称      | 说明                                 |
| --------- | ------------------------------------ |
| `default` | 补位内容；不给时按 `name` 生成缩写   |

## 加载状态与回退

状态机由无头层持有，`Image` 上报、`Fallback` 读取，根上输出 `data-status`：

| 状态      | 含义                       | 补位是否渲染                       |
| --------- | -------------------------- | ---------------------------------- |
| `idle`    | 无 src 或未挂载            | 是（不延迟时）                     |
| `loading` | 加载中                     | 延迟到点后是                       |
| `loaded`  | 加载成功，显示图片         | 否                                 |
| `error`   | 加载失败                   | 是（立即，不被延迟掩盖）           |

- 加载失败时**不渲染 img**，避免浏览器画出破碎图标，由补位接管。
- 不另开 `window.Image` 预加载——状态只来自渲染出的 img 的 `load` / `error` 事件，以及元素挂载时
  的 `complete` 兜底（缓存图片可能在监听挂上之前就已完成）。
- `delayMs > 0` 时补位等待这段时间再出现；加载成功或失败会清掉计时器，作用域销毁时同样清理。

## 文字缩写

`getAvatarInitials` 是纯算法：按空白拆词，取前 `max`（默认 2）个词的首字符并转大写；
只有一个词时取首字符。用码点取首字符，不拆散 emoji 代理对。

```ts
import { getAvatarInitials } from '@agile-plus/primitives/avatar';

getAvatarInitials('John Doe'); // 'JD'
getAvatarInitials('张三'); // '张'
getAvatarInitials('John Doe', 1); // 'J'
```

成品层经 `@agile-plus/ui/avatar` 转发该算法（components 只依赖 ui，不直接引 primitives）。

## 无样式层用法

```vue
<script setup lang="ts">
import { AvatarFallback, AvatarImage, AvatarRoot } from '@agile-plus/ui/avatar';
</script>

<template>
  <AvatarRoot class="my-avatar">
    <AvatarImage src="/alice.png" alt="Alice" />
    <AvatarFallback :delay-ms="200">AL</AvatarFallback>
  </AvatarRoot>
</template>
```

三个部件都支持 `as` 与 `asChild`。补位内容完全交给消费者插槽，无样式层不生成缩写。

## 无障碍行为

| 项     | 说明                                                       |
| ------ | ---------------------------------------------------------- |
| 图片   | 原生 `img` + `alt` 提供可访问名                            |
| 补位   | 文本内容可被读屏读取；装饰性头像建议给 `alt=""`            |
| 状态   | 根上 `data-status` 暴露加载状态，供样式与测试读取          |

## 样式钩子

```text
.y-avatar                     根（inline-flex 居中，溢出裁切）
.y-avatar--small / --middle / --large   尺寸
.y-avatar--circle / --square            形状
.y-avatar[data-status='loaded']         图片就绪
.y-avatar__image              图片（object-fit: cover）
.y-avatar__fallback           补位（居中，禁止选中）
```

组件级变量：`--y-avatar-bg`、`--y-avatar-color`、`--y-avatar-radius`（方形圆角）。
尺寸取自全局 `--y-control-height-sm / --y-control-height / --y-control-height-lg`。

## 已知限制

- 不提供图片懒加载 / 占位模糊（LQIP）等高级加载策略；`src` 直接交给原生 img。
- 缩写按「词首字符」生成，不处理「名 + 姓取首尾」等其它习惯；需要时用默认插槽自定义补位。

## Primitives 层

```ts
import {
  getAvatarImageAttrs,
  getAvatarInitials,
  getAvatarRootAttrs,
  resolveAvatarFallback,
} from '@agile-plus/primitives/avatar';

getAvatarRootAttrs({ status: 'loading' }); // { 'data-status': 'loading' }
getAvatarImageAttrs({ src: '/a.png', alt: '头像' }); // { src: '/a.png', alt: '头像' }
resolveAvatarFallback({ status: 'error', delayMs: 500, delayElapsed: false }); // true
```