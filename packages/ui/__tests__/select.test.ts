import { createApp, defineComponent, h, nextTick, ref } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectLabel,
  SelectRoot,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
  SelectViewport,
} from '../src/select';

import type { App, VNode } from 'vue';

const apps: App[] = [];

const fruits = [
  { value: 'apple', label: '苹果' },
  { value: 'banana', label: '香蕉', disabled: true },
  { value: 'cherry', label: '樱桃' },
];

function mount(render: () => VNode): HTMLElement {
  const host = document.createElement('div');

  document.body.append(host);

  const app = createApp(defineComponent({ setup: () => render }));

  app.mount(host);
  apps.push(app);

  return host;
}

function trigger(): HTMLButtonElement {
  return document.querySelector('[data-part="trigger"]') as HTMLButtonElement;
}

function content(): HTMLElement | null {
  return document.querySelector('[data-part="content"]');
}

function item(value: string): HTMLElement {
  return document.querySelector(`[data-value="${value}"]`) as HTMLElement;
}

function valueText(): string {
  return document.querySelector('[data-part="value"]')?.textContent ?? '';
}

function mountSelect(
  rootProps: Record<string, unknown> = {},
  withSeed = false,
  contentProps: Record<string, unknown> = {}
) {
  return mount(() =>
    h(
      SelectRoot,
      { ...(withSeed ? { options: fruits } : {}), ...rootProps },
      {
        default: () => [
          h(SelectTrigger, null, {
            default: () => [h(SelectValue, { placeholder: '请选择水果' })],
          }),
          h(SelectContent, contentProps, {
            default: () =>
              h(SelectViewport, null, {
                default: () =>
                  fruits.map((f) =>
                    h(
                      SelectItem,
                      { key: f.value, value: f.value, disabled: f.disabled },
                      {
                        default: () => [
                          h(SelectItemIndicator, null, { default: () => ['✓'] }),
                          h(SelectItemText, null, { default: () => [f.label] }),
                        ],
                      }
                    )
                  ),
              }),
          }),
        ],
      }
    )
  );
}

async function open(): Promise<void> {
  trigger().click();
  await nextTick();
  await nextTick();
}

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount();

  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('Select 懒渲染', () => {
  it('关闭时列表不在 DOM，打开挂载，Escape 后卸载', async () => {
    mountSelect();

    expect(content()).toBeNull();

    await open();

    expect(content()).not.toBeNull();
    expect(content()!.getAttribute('role')).toBe('listbox');

    trigger().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await nextTick();

    expect(content()).toBeNull();
  });

  it('打开后触发器 aria-expanded / aria-owns / activedescendant 正确', async () => {
    mountSelect();

    await open();

    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(trigger().getAttribute('aria-owns')).toBe(content()!.id);
    expect(trigger().getAttribute('aria-activedescendant')).toBe(item('apple').id);
  });

  it('数据驱动种子让回显在首次打开前就可用', async () => {
    mountSelect({ defaultValue: 'apple' }, true);

    expect(content()).toBeNull();
    expect(valueText()).toBe('苹果');
  });

  it('复合用法首次打开后快照补齐回显与关闭态 typeahead', async () => {
    mountSelect({ defaultValue: 'apple' });

    await open();
    trigger().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await nextTick();

    expect(content()).toBeNull();
    expect(valueText()).toBe('苹果');

    trigger().dispatchEvent(new KeyboardEvent('keydown', { key: '樱', bubbles: true }));
    await nextTick();

    expect(valueText()).toBe('樱桃');
  });
});

describe('Select 交互', () => {
  it('点击选项选中并关闭卸载，回显文本', async () => {
    mountSelect();

    await open();
    item('cherry').click();
    await nextTick();

    expect(content()).toBeNull();
    expect(valueText()).toBe('樱桃');
  });

  it('禁用项点不动；方向键跳过禁用项', async () => {
    mountSelect();

    await open();
    item('banana').click();
    await nextTick();

    expect(content()).not.toBeNull();
    expect(valueText()).toBe('请选择水果');

    trigger().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await nextTick();

    expect(item('cherry').hasAttribute('data-highlighted')).toBe(true);
  });

  it('Enter 提交高亮项并关闭', async () => {
    mountSelect();

    await open();
    trigger().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await nextTick();
    trigger().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await nextTick();

    expect(valueText()).toBe('樱桃');
    expect(content()).toBeNull();
  });

  it('分组 aria-labelledby 指向标题，分隔线 separator', async () => {
    mount(() =>
      h(SelectRoot, null, {
        default: () => [
          h(SelectTrigger, null, { default: () => [h(SelectValue)] }),
          h(SelectContent, null, {
            default: () => [
              h(SelectGroup, null, {
                default: () => [
                  h(SelectLabel, null, { default: () => ['组'] }),
                  h(
                    SelectItem,
                    { value: 'a' },
                    {
                      default: () => [h(SelectItemText, null, { default: () => ['A'] })],
                    }
                  ),
                ],
              }),
              h(SelectSeparator),
            ],
          }),
        ],
      })
    );

    await open();

    const group = document.querySelector('[data-part="group"]') as HTMLElement;
    const label = document.querySelector('[data-part="label"]') as HTMLElement;

    expect(group.getAttribute('aria-labelledby')).toBe(label.id);
    expect(document.querySelector('[data-part="separator"]')?.getAttribute('role')).toBe(
      'separator'
    );
  });

  it('forceMount 标记在打开时常驻于未选中项', async () => {
    mount(() =>
      h(SelectRoot, null, {
        default: () => [
          h(SelectTrigger, null, { default: () => [h(SelectValue)] }),
          h(SelectContent, null, {
            default: () =>
              h(
                SelectItem,
                { value: 'a' },
                {
                  default: () => [
                    h(SelectItemIndicator, { forceMount: true }, { default: () => ['✓'] }),
                    h(SelectItemText, null, { default: () => ['A'] }),
                  ],
                }
              ),
          }),
        ],
      })
    );

    expect(document.querySelector('[data-part="item-indicator"]')).toBeNull();

    await open();

    const indicator = document.querySelector('[data-part="item-indicator"]') as HTMLElement;

    expect(indicator).not.toBeNull();
    expect(indicator.dataset.state).toBe('unchecked');
  });
});

describe('Select 受控与表单', () => {
  it('v-model:open 受控', async () => {
    const isOpen = ref(false);

    mount(() =>
      h(
        SelectRoot,
        { open: isOpen.value, 'onUpdate:open': (v: boolean) => (isOpen.value = v) },
        {
          default: () => [
            h(SelectTrigger, null, { default: () => [h(SelectValue)] }),
            h(SelectContent, null, {
              default: () =>
                h(
                  SelectItem,
                  { value: 'a' },
                  {
                    default: () => [h(SelectItemText, null, { default: () => ['A'] })],
                  }
                ),
            }),
          ],
        }
      )
    );

    expect(content()).toBeNull();

    trigger().click();
    await nextTick();

    expect(isOpen.value).toBe(true);
    expect(content()).not.toBeNull();
  });

  it('给了 name 渲染隐藏原生 select，种子选项同源', async () => {
    mountSelect({ name: 'fruit', defaultValue: 'apple', required: true }, true);

    await nextTick();

    const native = document.querySelector('[data-part="native-select"]') as HTMLSelectElement;

    expect(native).not.toBeNull();
    expect(native.name).toBe('fruit');
    expect([...native.options].map((o) => o.value)).toEqual(['apple', 'banana', 'cherry']);
    expect(native.value).toBe('apple');
  });

  it('expose open/close/setValue 可程序化控制', async () => {
    const rootRef = ref<{ open(): void; close(): void; setValue(v: string): void } | null>(null);

    mount(() =>
      h(
        SelectRoot,
        { ref: rootRef, options: fruits },
        {
          default: () => [
            h(SelectTrigger, null, { default: () => [h(SelectValue)] }),
            h(SelectContent, null, {
              default: () =>
                h(SelectViewport, null, {
                  default: () =>
                    fruits.map((f) =>
                      h(
                        SelectItem,
                        { key: f.value, value: f.value },
                        {
                          default: () => [h(SelectItemText, null, { default: () => [f.label] })],
                        }
                      )
                    ),
                }),
            }),
          ],
        }
      )
    );

    rootRef.value?.open();
    await nextTick();
    await nextTick();

    expect(content()).not.toBeNull();

    rootRef.value?.setValue('cherry');
    rootRef.value?.close();
    await nextTick();

    expect(content()).toBeNull();
    expect(valueText()).toBe('樱桃');
  });
});

describe('Select keepMounted', () => {
  it('打开过一次之后关闭不卸载，只切成 closed', async () => {
    mountSelect({}, false, { keepMounted: true });

    expect(content()).toBeNull();

    await open();

    const panel = content();

    item('cherry').click();
    await nextTick();

    expect(content()).toBe(panel);
    expect(panel?.dataset.state).toBe('closed');
  });
});
