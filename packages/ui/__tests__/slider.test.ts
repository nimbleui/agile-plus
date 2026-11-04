import { createApp, defineComponent, h, nextTick, ref } from 'vue';

import { afterEach, describe, expect, it } from 'vitest';

import { SliderRange, SliderRoot, SliderThumb, SliderTrack } from '../src/slider';

import type { App, Ref } from 'vue';

interface MountOptions {
  value?: Ref<number[]>;
  defaultValue?: number[];
  name?: string;
  thumbCount?: number;
  labels?: string[];
}

interface MountedSlider {
  app: App;
  commits: number[][];
  updates: number[][];
}

const apps: App[] = [];

function mountSlider(options: MountOptions = {}): MountedSlider {
  const updates: number[][] = [];
  const commits: number[][] = [];

  const app = createApp(
    defineComponent({
      setup() {
        return () => {
          const rootProps: Record<string, unknown> = {
            name: options.name,
            'onUpdate:value': (next: number[]) => {
              updates.push(next);

              if (options.value) options.value.value = next;
            },
            onValueCommit: (next: number[]) => commits.push(next),
          };

          if (options.value) {
            rootProps.value = options.value.value;
          } else {
            rootProps.defaultValue = options.defaultValue;
          }

          return h(SliderRoot, rootProps, () => [
            h(SliderTrack, {}, () => h(SliderRange)),
            ...Array.from({ length: options.thumbCount ?? 1 }, (_, index) => {
              const thumbProps: Record<string, unknown> = { index };
              const label = options.labels?.[index];

              if (label) thumbProps['aria-label'] = label;

              return h(SliderThumb, thumbProps);
            }),
          ]);
        };
      },
    })
  );

  const host = document.createElement('div');

  document.body.append(host);
  app.mount(host);
  apps.push(app);

  return { app, commits, updates };
}

function query<T extends Element>(selector: string): T | null {
  return document.querySelector<T>(selector);
}

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount();

  document.body.innerHTML = '';
});

describe('Slider UI', () => {
  it('渲染 ARIA、区间与隐藏 input，并响应键盘', async () => {
    const value = ref([40]);

    mountSlider({ value, name: 'volume', labels: ['音量'] });

    await nextTick();

    const root = query<HTMLElement>('[data-part="root"]');
    const track = query<HTMLElement>('[data-part="track"]');
    const range = query<HTMLElement>('[data-part="range"]');
    const thumb = query<HTMLElement>('[data-part="thumb"]');
    const input = query<HTMLInputElement>('input[name="volume"]');

    expect(root?.getAttribute('data-orientation')).toBe('horizontal');
    expect(root?.getAttribute('dir')).toBe('ltr');
    expect(track).not.toBeNull();
    expect(range?.style.left).toBe('0%');
    expect(range?.style.right).toBe('60%');
    expect(thumb?.getAttribute('role')).toBe('slider');
    expect(thumb?.getAttribute('aria-valuenow')).toBe('40');
    expect(thumb?.getAttribute('aria-label')).toBe('音量');
    expect(thumb?.getAttribute('tabindex')).toBe('0');
    expect(input?.value).toBe('40');

    if (!thumb) throw new Error('未找到 thumb');

    thumb.focus();

    const event = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      bubbles: true,
      cancelable: true,
    });

    thumb.dispatchEvent(event);
    await nextTick();

    expect(event.defaultPrevented).toBe(true);
    expect(value.value).toEqual([41]);
    expect(thumb.getAttribute('aria-valuenow')).toBe('41');
    expect(input?.value).toBe('41');
  });

  it('点击轨道立即定位，拖拽持续更新，释放时提交', async () => {
    const value = ref([40]);
    const { commits, updates } = mountSlider({ value, labels: ['音量'] });

    await nextTick();

    const root = query<HTMLElement>('[data-part="root"]');

    if (!root) throw new Error('未找到 Slider 根元素');

    root.getBoundingClientRect = () =>
      ({
        x: 0,
        y: 0,
        width: 200,
        height: 20,
        top: 0,
        left: 0,
        right: 200,
        bottom: 20,
        toJSON: () => ({}),
      }) as DOMRect;

    root.dispatchEvent(
      new MouseEvent('pointerdown', {
        clientX: 50,
        button: 0,
        bubbles: true,
        cancelable: true,
      })
    );

    await nextTick();

    expect(value.value).toEqual([25]);

    window.dispatchEvent(new MouseEvent('pointermove', { clientX: 100 }));
    await nextTick();

    expect(value.value).toEqual([50]);

    window.dispatchEvent(new MouseEvent('pointerup'));

    expect(updates).toEqual([[25], [50]]);
    expect(commits).toEqual([[50]]);
  });

  it('多 thumb 生成默认标签与 name[] 隐藏 input', async () => {
    mountSlider({ defaultValue: [20, 80], name: 'price', thumbCount: 2 });

    await nextTick();

    const thumbs = Array.from(document.querySelectorAll<HTMLElement>('[data-part="thumb"]'));
    const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[name="price[]"]'));

    expect(thumbs.map((thumb) => thumb.getAttribute('aria-label'))).toEqual(['最小值', '最大值']);
    expect(inputs.map((input) => input.value)).toEqual(['20', '80']);
  });
});
