/**
 * Viewport 聚焦快捷键的匹配与文案格式化。
 */

/**
 * 读取 KeyboardEvent 上的布尔标志位。
 *
 * Radix 的写法是 `(event as any)[key] || event.code === key`，任意属性名都能查；
 * 这里限定只有布尔标志可用，否则 `getModifierState` 之类的方法名会被当成 truthy，
 * 让一个错误的 hotkey 配置在每次按键时都命中。
 *
 * @param event 原生键盘事件。
 * @param key 标志位名称，例如 `altKey`。
 * @returns 该标志位是否为 true。
 */
function readEventFlag(event: KeyboardEvent, key: string): boolean {
  const flag = Reflect.get(event, key);

  return typeof flag === 'boolean' ? flag : false;
}

/**
 * 判断一组快捷键是否被按下。
 *
 * 每一项要么命中 KeyboardEvent 的布尔标志（`altKey` / `ctrlKey` / `metaKey` /
 * `shiftKey`），要么命中 `event.code`（`KeyT`、`F8`）。用 `code` 而不是 `key` 比较，
 * 是因为 `Control+Alt+T` 下 `event.key` 会变成 `†`，物理键位判断会失配。
 * 数组内是「与」关系，全部命中才算触发；空数组永不触发。
 *
 * @param event 原生键盘事件。
 * @param hotkey 快捷键配置。
 * @returns 是否需要把焦点移到 viewport。
 */
export function isToastHotkeyPressed(event: KeyboardEvent, hotkey: string[]): boolean {
  if (hotkey.length === 0) return false;

  return hotkey.every((key) => readEventFlag(event, key) || event.code === key);
}

/**
 * 把 hotkey 数组转成给人看的按键文案。
 *
 * `['altKey', 'KeyT']` → `alt+T`：去掉 `Key`/`Digit` 前缀和标志位的 `Key` 后缀，
 * 这与 Radix 的格式化规则一致，保证 `{hotkey}` 占位符渲染结果可预期。
 *
 * @param hotkey 快捷键配置。
 * @returns 用 `+` 连接的按键名。
 */
export function formatToastHotkey(hotkey: string[]): string {
  return hotkey.join('+').replace(/Key/g, '').replace(/Digit/g, '');
}

/**
 * 渲染 viewport 的 aria-label。
 *
 * `{hotkey}` 占位符让作者写一次模板就能跟随 `hotkey` 配置变化，避免出现
 * 「标签写着 F8、实际快捷键是 alt+t」这类可访问性描述与行为脱节。
 *
 * @param label 含 `{hotkey}` 占位符的模板。
 * @param hotkey 快捷键配置。
 * @returns 替换后的标签文本。
 */
export function resolveToastViewportLabel(label: string, hotkey: string[]): string {
  return label.replace('{hotkey}', formatToastHotkey(hotkey));
}
