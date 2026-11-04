import { Comment, Fragment, Text, cloneVNode, defineComponent, h, isVNode } from 'vue';

import type { Component, PropType, Ref, VNode } from 'vue';

/**
 * Slot 可承担的渲染目标：原生标签名（`'section'`）或任意组件。
 */
export type SlotElementType = string | Component;

/**
 * `elRef` 的取值：模板 ref 的对象形式或函数形式。
 */
export type SlotElementRef = Ref<Element | null> | ((node: Element | null) => void);

/**
 * 展开 children 并只保留真正需要渲染的元素节点。
 *
 * 必须递归而非一层 flatMap：`v-for` 与 `Fragment` 都会产生嵌套数组，而 `v-if` 未命中时
 * 留下的是 Comment 占位节点、模板换行留下的是纯空白 Text 节点。这三种都不算「一个子元素」，
 * 否则 `asChild` 会在完全等价的模板写法下随机失败。
 *
 * @param nodes 插槽返回的原始节点，vnode 的 children 类型不固定因此收 unknown。
 * @returns 可作为替换目标的 vnode 列表，顺序与模板书写顺序一致。
 */
function collectElementVNodes(nodes: unknown): VNode[] {
  if (Array.isArray(nodes)) {
    return nodes.flatMap(collectElementVNodes);
  }

  if (!isVNode(nodes)) {
    return [];
  }

  if (nodes.type === Fragment) {
    return collectElementVNodes(nodes.children);
  }

  if (nodes.type === Comment) {
    return [];
  }

  if (nodes.type === Text && typeof nodes.children === 'string' && nodes.children.trim() === '') {
    return [];
  }

  return [nodes];
}

/**
 * 带 `asChild` 语义的渲染原语，对齐 Radix / Reka 的 Slot / Primitive。
 *
 * `asChild` 为 false 时渲染 `as` 指定的元素（默认 `div`），自身收到的属性照常落到该元素；
 * 为 true 时不再产生这一层 DOM，而是把同一批属性合并到唯一的子元素上，使宿主组件转发的
 * 行为属性（data-* 钩子、style、事件）继续生效。
 *
 * 合并语义与 Radix 一致：class 累加、style 逐键合并、同名事件先子后父串联，
 * 其余标量属性以宿主转发的值为准。`key` 与 `ref` 不属于 attrs（Vue 已挂在 vnode 自身），
 * 因此不需要额外剔除；mergeRef 为 true 保证消费者写在子元素上的 ref 不被丢弃。
 *
 * 不声明组件 `name`：`Slot` 与 HTML 保留标签 `<slot>` 同名，声明后会被
 * `vue/no-reserved-component-names` 判定为组件命名错误；导出名与模板用法保持 `Slot`，
 * 大写标签在 SFC 编译器中按组件解析，不会落到原生插槽出口。
 *
 * @throws 当 `asChild` 为 true 且可渲染子元素数量不为 1 时抛出，属于开发期用法错误。
 */
export const Slot = defineComponent({
  // 属性统一在渲染函数里显式决定落点，禁止自动继承，否则 asChild 下会同时绑到两层。
  inheritAttrs: false,

  props: {
    as: {
      type: [String, Object, Function] as PropType<SlotElementType>,
      default: 'div',
    },
    asChild: {
      type: Boolean,
      default: false,
    },
    /**
     * 需要拿到最终渲染元素的宿主组件用它取代模板 ref。
     *
     * 模板 ref 写在 `<Slot>` 上只会得到 Slot 的组件实例，`asChild` 时更是落不到
     * 被替换的子元素上；测量尺寸、监听动画、转移焦点的组件因此无法同时支持
     * asChild。有了这个出口，asChild 不再是「放弃元素控制权」的取舍。
     */
    elRef: {
      type: [Object, Function] as PropType<SlotElementRef>,
      default: undefined,
    },
  },

  setup(props, { attrs, slots }) {
    return () => {
      const children = slots.default?.() ?? [];

      /**
       * `ref` 必须走 h/cloneVNode 的 props，不能事后赋给 `vnode.ref`。
       *
       * Vue 3.5 起 vnode.ref 存的是归一化后的 `{ i, r }`（带宿主实例），直接赋原始
       * ref 会让回调根本不被调用；而 cloneVNode 第三个参数负责合成新旧 ref，
       * asChild 下消费者写在子元素上的 ref 也不会被覆盖。
       */
      const mergedAttrs = props.elRef ? { ...attrs, ref: props.elRef } : attrs;

      if (!props.asChild) {
        return h(props.as ?? 'div', mergedAttrs, children);
      }

      const elements = collectElementVNodes(children);

      if (elements.length !== 1) {
        throw new Error(
          `Slot 的 asChild 需要且只需要一个元素子节点，当前为 ${elements.length} 个；` +
            '多节点请改用外层容器或去掉 asChild。'
        );
      }

      return cloneVNode(elements[0], mergedAttrs, true);
    };
  },
});
