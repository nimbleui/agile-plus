import type { MaterialContribution } from '../protocol';
import { materials as compositeMaterials } from './materials-composite';
import { materials as controlMaterials } from './materials-controls';

/**
 * 原子件层（`@agile-plus/ui`）的全部物料清单。
 *
 * 拆成控件与组合两个文件不是按行数机械切割：控件族的判据是「单独一只也能用」，
 * 组合族的判据是「根 + 部件成套」，两者的属性取舍和落点尺寸规则不同，变更原因也不同。
 */
export const materials: MaterialContribution[] = [...controlMaterials, ...compositeMaterials];
