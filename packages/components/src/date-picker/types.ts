/** 尺寸变体，高度与字号取自全局 control-height / font-size Token。 */
export type DatePickerSize = 'small' | 'middle' | 'large';

/**
 * 外观变体。
 *
 * - `outlined`：描边输入框，表单里的缺省形态。
 * - `filled`：浅灰底无边框，密集工具栏里降低视觉噪声。
 * - `borderless`：无边框无底色，嵌在表格单元格或行内文案里。
 */
export type DatePickerVariant = 'outlined' | 'filled' | 'borderless';
