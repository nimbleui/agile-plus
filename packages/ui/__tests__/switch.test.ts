import { createApp, defineComponent, h, nextTick, ref } from 'vue';

import { afterEach, describe, expect, it } from 'vitest';

import { SwitchRoot, SwitchThumb } from '../src/switch';

import type { VNode } from 'vue';

/**
 * 真实挂载后断言 DOM、表单与事件。
 *
 * Switch 的难点全在 DOM 之外：input 是否真的归属这个 form、提交值是否进得了
 * FormData、change 是否只冒泡一次。SSR 字符串断言看不到这些。
 */
function mountInForm(render: () => VNode): {
  app: ReturnType<typeof createApp>;
  form: HTMLElement;
} {
  const form = document.createElement('form');

  document.body.append(form);

  // 直接把组件挂在 <form> 里：Vue 渲染时不给渲染函数传参，
  // 因此表单上下文由挂载容器提供，而不是从参数注入。
  const app = createApp(defineComponent({ setup: () => render }));

  app.mount(form);

  return { app, form };
}

function root(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-part="root"]');
}

function thumb(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-part="thumb"]');
}

function bubbleInput(): HTMLInputElement | null {
  return document.querySelector<HTMLInputElement>('input[data-part="input"]');
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('SwitchRoot 的结构与状态', () => {
  it('渲染 role=switch 的按钮，滑块随状态更新 data-state', async () => {
    const { app } = mountInForm(() => h(SwitchRoot, {}, () => h(SwitchThumb)));

    await nextTick();

    const button = root();

    expect(button?.tagName).toBe('BUTTON');
    expect(button?.getAttribute('role')).toBe('switch');
    expect(button?.getAttribute('aria-checked')).toBe('false');
    expect(button?.getAttribute('data-state')).toBe('unchecked');
    expect(thumb()?.getAttribute('data-state')).toBe('unchecked');

    button?.click();
    await nextTick();

    expect(button?.getAttribute('aria-checked')).toBe('true');
    expect(button?.getAttribute('data-state')).toBe('checked');
    // 滑块自己也要能读到状态，样式不必依赖父级选择器
    expect(thumb()?.getAttribute('data-state')).toBe('checked');

    app.unmount();
  });

  it('input 是按钮的兄弟节点而不是子节点', async () => {
    const { app, form } = mountInForm(() => h(SwitchRoot, { name: 'notify' }));

    await nextTick();

    const input = bubbleInput();

    expect(input).not.toBeNull();
    expect(input?.parentElement).toBe(form);
    expect(root()?.contains(input as Node)).toBe(false);

    app.unmount();
  });

  it('hidden input 覆盖在按钮上且不接收指针事件', async () => {
    const { app } = mountInForm(() => h(SwitchRoot, { name: 'notify' }));

    await nextTick();

    const input = bubbleInput();

    expect(input?.style.position).toBe('absolute');
    expect(input?.style.pointerEvents).toBe('none');
    expect(input?.style.opacity).toBe('0');
    expect(input?.style.transform).toBe('translateX(-100%)');
    expect(input?.getAttribute('aria-hidden')).toBe('true');
    expect(input?.tabIndex).toBe(-1);

    app.unmount();
  });

  it('不在 form 内时不渲染 input', async () => {
    const host = document.createElement('div');

    document.body.append(host);

    const app = createApp(defineComponent({ setup: () => () => h(SwitchRoot, { name: 'x' }) }));

    app.mount(host);
    await nextTick();

    expect(bubbleInput()).toBeNull();

    app.unmount();
  });

  it('禁用时按钮不可点且给出 data-disabled', async () => {
    const { app } = mountInForm(() =>
      h(SwitchRoot, { disabled: true, name: 'x' }, () => h(SwitchThumb))
    );

    await nextTick();

    const button = root();

    expect(button?.hasAttribute('disabled')).toBe(true);
    expect(button?.getAttribute('data-disabled')).toBe('');
    expect(thumb()?.getAttribute('data-disabled')).toBe('');

    button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await nextTick();

    expect(button?.getAttribute('data-state')).toBe('unchecked');
    expect(bubbleInput()?.disabled).toBe(true);

    app.unmount();
  });

  it('required 同时输出到 aria 与 input', async () => {
    const { app } = mountInForm(() => h(SwitchRoot, { required: true, name: 'agree' }));

    await nextTick();

    expect(root()?.getAttribute('aria-required')).toBe('true');
    expect(bubbleInput()?.required).toBe(true);

    app.unmount();
  });
});

describe('Switch 与原生表单', () => {
  it('勾选后 FormData 带上 name 与 value', async () => {
    const { app, form } = mountInForm(() => h(SwitchRoot, { name: 'notify', value: 'yes' }));

    await nextTick();

    expect(new FormData(form).get('notify')).toBeNull();

    root()?.click();
    await nextTick();

    expect(new FormData(form).get('notify')).toBe('yes');

    app.unmount();
  });

  it('一次点击只向表单冒泡一次 change', async () => {
    const { app, form } = mountInForm(() => h(SwitchRoot, { name: 'notify' }));

    await nextTick();

    let changes = 0;

    form.addEventListener('change', () => {
      changes += 1;
    });

    root()?.click();
    await nextTick();

    expect(changes).toBe(1);

    root()?.click();
    await nextTick();

    expect(changes).toBe(2);

    app.unmount();
  });

  it('v-model:checked 与外部改值都会同步到 input', async () => {
    const value = ref(false);

    const { app } = mountInForm(() =>
      h(SwitchRoot, {
        name: 'notify',
        checked: value.value,
        'onUpdate:checked': (next: boolean) => {
          value.value = next;
        },
      })
    );

    await nextTick();

    root()?.click();
    await nextTick();

    expect(value.value).toBe(true);
    expect(bubbleInput()?.checked).toBe(true);

    // 外部直接改值（不是用户点击）同样要写进原生 input
    value.value = false;
    await nextTick();

    expect(bubbleInput()?.checked).toBe(false);
    expect(root()?.getAttribute('data-state')).toBe('unchecked');

    app.unmount();
  });

  it('form reset 把开关恢复到初次出现时的状态', async () => {
    const { app, form } = mountInForm(() =>
      h(SwitchRoot, { name: 'notify', defaultChecked: true })
    );

    await nextTick();

    root()?.click();
    await nextTick();

    expect(root()?.getAttribute('data-state')).toBe('unchecked');

    form.reset();
    await nextTick();

    expect(root()?.getAttribute('data-state')).toBe('checked');

    app.unmount();
  });
});

describe('SwitchRoot 的 asChild', () => {
  it('替换按钮本体，元素入口仍然生效', async () => {
    const { app, form } = mountInForm(() =>
      h(SwitchRoot, { asChild: true, name: 'notify' }, () => h('span', { class: 'mine' }, '开关'))
    );

    await nextTick();

    const node = root();

    expect(node?.tagName).toBe('SPAN');
    expect(node?.getAttribute('role')).toBe('switch');
    expect(node?.classList.contains('mine')).toBe(true);

    node?.click();
    await nextTick();

    // 元素入口没丢的证据：状态翻转并且提交值随之出现
    expect(node?.getAttribute('data-state')).toBe('checked');
    expect(new FormData(form).get('notify')).toBe('on');

    app.unmount();
  });

  it('禁用状态下滑块属性与按钮一致', async () => {
    const { app } = mountInForm(() =>
      h(SwitchRoot, { disabled: true, name: 'notify' }, () => h(SwitchThumb))
    );

    await nextTick();

    expect(thumb()?.getAttribute('data-disabled')).toBe('');
    expect(thumb()?.tagName).toBe('SPAN');

    app.unmount();
  });
});
