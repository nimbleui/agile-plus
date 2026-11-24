// 主入口引入 Token 文件以输出 :root 变量声明。
//
// _index.scss 只 @forward 函数与 mixin，不产生任何 CSS；组件样式中的 var(--y-*)
// 需要 :root 上的真实值才能解析。消费者只引子路径时，需自行引入 @agile-plus/components/style.css。
import './styles/_tokens.scss';

// 暗色预设与 :root 一样是全局声明，必须随主入口一起输出：组件级变量在使用点用
// var(--y-color-*) 解析，覆盖全局颜色 token 后整棵组件树自动翻转，不改组件源码。
import './styles/_themes.scss';

export * from './dialog';

export * from './tabs';

export * from './radio-group';

export * from './flex';

export * from './checkbox';

export * from './scroll-area';

export * from './toast';

export * from './toggle';

export * from './switch';

export * from './slider';

export * from './progress';

export * from './pagination';

export * from './collapsible';

export * from './tooltip';

export * from './popover';

export * from './dropdown-menu';

export * from './menu';

export * from './select';

export * from './date-picker';

export * from './date-range-picker';

export * from './ellipsis';

export * from './input';

export * from './textarea';

export * from './button';

export * from './table';

export * from './accordion';

export * from './avatar';

export * from './splitter';

export * from './virtual-list';

export * from './virtual-tree';
