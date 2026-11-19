<script setup>
import Preview from '../.vitepress/components/Preview.vue';
import ButtonDemo from '../.vitepress/components/ButtonDemo.vue';
</script>

# Button 按钮

按钮没有独立的无头层：点击、键盘激活、禁用都是原生 `<button>` 的行为，不需要状态机。因此只有三层——primitives 的属性表（`getButtonAttrs`）、ui 层的属性落点与 `asChild`、components 层的外观变体与 loading spinner。

## 基础示例

<Preview description="五种外观变体、三档尺寸、禁用；loading 模拟提交（期间禁用防重复点击）；表单内 submit / reset；asChild 渲染成链接。">
  <ButtonDemo />
</Preview>

```vue
<script setup lang="ts">
import { Button } from '@agile-plus/components/button';
</script>

<template>
  <Button variant="primary" @click="save">保存</Button>
</template>
```

## Props

| 属性       | 类型                                                    | 默认值      | 说明                                                       |
| ---------- | ------------------------------------------------------- | ----------- | ---------------------------------------------------------- |
| `variant`  | `'primary' \| 'default' \| 'dashed' \| 'text' \| 'link'` | `'default'` | 外观变体，只影响样式层                                     |
| `size`     | `'small' \| 'middle' \| 'large'`                        | `'middle'`  | 尺寸变体，只影响样式层                                     |
| `disabled` | `boolean`                                               | `false`     | 禁用，输出原生 `disabled` 与 `data-disabled`               |
| `loading`  | `boolean`                                               | `false`     | 加载中：合并进禁用态，输出 `data-loading` 与 `aria-busy`   |
| `type`     | `'button' \| 'submit' \| 'reset'`                       | `'button'`  | 原生类型，缺省 button 避免误提交表单                       |
| `as`       | `string`                                                | `'button'`  | 渲染的目标标签名                                           |
| `asChild`  | `boolean`                                               | `false`     | 不渲染自身，把属性合并到唯一的子元素上                     |

## Events

Button 不 emit 自定义事件：点击就是原生 `click`，直接 `@click` 监听。loading 期间原生 `disabled` 会阻断点击，不需要组件再挡一次。

## DOM 输出

| 属性            | 说明                                             |
| --------------- | ------------------------------------------------ |
| `type`          | 缺省 `button`                                    |
| `disabled`      | `disabled` 或 `loading` 任一成立时存在           |
| `data-disabled` | 禁用（含 loading 合并）时存在                    |
| `data-loading`  | 仅 loading 时存在                                |
| `aria-busy`     | 仅 loading 时输出 `true`                         |
| `data-part`     | `button`                                         |

## loading 与 asChild

- 非 asChild 时样式层注入一个 `aria-hidden` 的 spinner（`.y-button__spinner`），用 `currentcolor` 跟随当前变体文字色，不另维护颜色变量；`prefers-reduced-motion` 下转速放慢。
- asChild 时**不注入** spinner：Slot 要求唯一元素子节点，注入会破坏替换语义。loading 仍输出 `data-loading` / `aria-busy`，视觉由消费者自绘。

## 键盘与可访问性

原生 button 自带焦点与 `Space` / `Enter` 激活；禁用由原生 `disabled` 表达（同时移出 Tab 序列），loading 的忙碌态由 `aria-busy` 表达。

## 已知限制

- 不提供图标专用插槽：图标与文字一起放默认插槽即可，间距由消费者控制。
- 不变体组合（如 primary + dashed）不在词表里：变体是互斥的外观方案，叠加会产生样式冲突。