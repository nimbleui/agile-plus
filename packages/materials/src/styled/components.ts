import type { Component } from 'vue';

import { Accordion, AccordionItem } from '@agile-plus/components/accordion';
import { Avatar } from '@agile-plus/components/avatar';
import { Button } from '@agile-plus/components/button';
import { Checkbox, CheckboxGroup } from '@agile-plus/components/checkbox';
import { Collapsible } from '@agile-plus/components/collapsible';
import { Dialog } from '@agile-plus/components/dialog';
import { DropdownMenu, DropdownMenuItem } from '@agile-plus/components/dropdown-menu';
import { Menu, MenuItem, MenuItemGroup, SubMenu } from '@agile-plus/components/menu';
import { Ellipsis } from '@agile-plus/components/ellipsis';
import { Flex, FlexItem } from '@agile-plus/components/flex';
import { Input } from '@agile-plus/components/input';
import { Pagination } from '@agile-plus/components/pagination';
import { Popover } from '@agile-plus/components/popover';
import { Progress } from '@agile-plus/components/progress';
import { RadioGroup, RadioGroupItem } from '@agile-plus/components/radio-group';
import { ScrollArea } from '@agile-plus/components/scroll-area';
import { Select } from '@agile-plus/components/select';
import { Slider } from '@agile-plus/components/slider';
import { Switch } from '@agile-plus/components/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@agile-plus/components/tabs';
import { Textarea } from '@agile-plus/components/textarea';
import { Toast, ToastViewport } from '@agile-plus/components/toast';
import { Toggle, ToggleGroup, ToggleGroupItem } from '@agile-plus/components/toggle';
import { Tooltip } from '@agile-plus/components/tooltip';

/**
 * 成品组件层（`@agile-plus/components`）的名字表。
 *
 * 键必须与 `./materials.ts` 与 `./materials-composite.ts` 里的物料名逐字一致 —— 平台按
 * `module.components[物料名]` 取组件，不一致不报错，只退化成画布占位块；一致性由
 * `__tests__/materials.test.ts` 守住。
 *
 * `ToastProvider` 没有登记：它直接复用无头层实现，原子件层已有同名物料，同一份组件登记
 * 两条只会在面板里多出个重复入口。
 *
 * 类型标注不能省：Slider 的属性类型定义在组件包内部模块里，交给推断会产出引用内部路径
 * 的声明文件，跨包不可移植。
 */
export const components: Record<string, Component> = {
  'agile-plus.switch': Switch,
  'agile-plus.checkbox': Checkbox,
  'agile-plus.slider': Slider,
  'agile-plus.progress': Progress,
  'agile-plus.dialog': Dialog,
  'agile-plus.tabs': Tabs,
  'agile-plus.tabs-list': TabsList,
  'agile-plus.tabs-trigger': TabsTrigger,
  'agile-plus.tabs-content': TabsContent,
  'agile-plus.collapsible': Collapsible,
  'agile-plus.toast': Toast,
  'agile-plus.toast-viewport': ToastViewport,
  'agile-plus.scroll-area': ScrollArea,
  'agile-plus.toggle': Toggle,
  'agile-plus.toggle-group': ToggleGroup,
  'agile-plus.toggle-group-item': ToggleGroupItem,
  'agile-plus.radio-group': RadioGroup,
  'agile-plus.radio-group-item': RadioGroupItem,
  'agile-plus.checkbox-group': CheckboxGroup,
  'agile-plus.flex': Flex,
  'agile-plus.flex-item': FlexItem,
  'agile-plus.tooltip': Tooltip,
  'agile-plus.popover': Popover,
  'agile-plus.dropdown-menu': DropdownMenu,
  'agile-plus.select': Select,
  'agile-plus.ellipsis': Ellipsis,
  'agile-plus.dropdown-menu-item': DropdownMenuItem,
  'agile-plus.input': Input,
  'agile-plus.menu': Menu,
  'agile-plus.menu-item': MenuItem,
  'agile-plus.sub-menu': SubMenu,
  'agile-plus.menu-item-group': MenuItemGroup,
  'agile-plus.pagination': Pagination,
  'agile-plus.textarea': Textarea,
  'agile-plus.button': Button,
  'agile-plus.accordion': Accordion,
  'agile-plus.accordion-item': AccordionItem,
  'agile-plus.avatar': Avatar,
};
