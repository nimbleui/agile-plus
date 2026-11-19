/**
 * 日期格式化与解析。
 *
 * 零依赖是库的硬约束，因此不引 dayjs / date-fns，只实现日期选择真正需要的
 * 十二个 token：日期六个 YYYY / YY / MM / M / DD / D，时间六个 HH / H / mm / m /
 * ss / s（大小写敏感：M 是月、m 是分）。其余字符（含中文「年月日」「时分秒」）
 * 一律按字面量处理，格式化时原样输出，解析时要求原样匹配。
 */

/** token 定义。顺序保证长 token 优先匹配（YYYY 先于 YY、MM 先于 M、HH 先于 H）。 */
const TOKENS = [
  { token: 'YYYY', pattern: '(\\d{4})', field: 'year' },
  { token: 'YY', pattern: '(\\d{2})', field: 'shortYear' },
  { token: 'MM', pattern: '(\\d{2})', field: 'month' },
  { token: 'M', pattern: '(\\d{1,2})', field: 'month' },
  { token: 'DD', pattern: '(\\d{2})', field: 'day' },
  { token: 'D', pattern: '(\\d{1,2})', field: 'day' },
  { token: 'HH', pattern: '(\\d{2})', field: 'hour' },
  { token: 'H', pattern: '(\\d{1,2})', field: 'hour' },
  { token: 'mm', pattern: '(\\d{2})', field: 'minute' },
  { token: 'm', pattern: '(\\d{1,2})', field: 'minute' },
  { token: 'ss', pattern: '(\\d{2})', field: 'second' },
  { token: 's', pattern: '(\\d{1,2})', field: 'second' },
] as const;

type TokenField = (typeof TOKENS)[number]['field'];

type FormatPart =
  { kind: 'token'; token: string; field: TokenField } | { kind: 'literal'; text: string };

const TOKEN_PATTERN = /YYYY|YY|MM|M|DD|D|HH|H|mm|m|ss|s/g;

/** 两位年份的世纪归属：00-99 一律归 2000-2099，日期选择的场景里没人选 19xx 的短写。 */
const SHORT_YEAR_BASE = 2000;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/**
 * 按格式输出日期文本。
 *
 * 未识别的字符按字面量保留，因此 'YYYY年M月D日' 这类中文格式直接可用。
 */
export function formatDate(date: Date, format: string): string {
  return format.replace(TOKEN_PATTERN, (token) => {
    switch (token) {
      case 'YYYY':
        return String(date.getFullYear()).padStart(4, '0');
      case 'YY':
        return pad(date.getFullYear() % 100);
      case 'MM':
        return pad(date.getMonth() + 1);
      case 'M':
        return String(date.getMonth() + 1);
      case 'DD':
        return pad(date.getDate());
      case 'D':
        return String(date.getDate());
      case 'HH':
        return pad(date.getHours());
      case 'H':
        return String(date.getHours());
      case 'mm':
        return pad(date.getMinutes());
      case 'm':
        return String(date.getMinutes());
      case 'ss':
        return pad(date.getSeconds());
      default:
        return String(date.getSeconds());
    }
  });
}

/** 把格式串拆成 token 与字面量交替的序列，解析 regex 与字段顺序都由它派生。 */
function tokenize(format: string): FormatPart[] {
  const parts: FormatPart[] = [];

  let cursor = 0;

  for (const match of format.matchAll(TOKEN_PATTERN)) {
    const index = match.index ?? 0;

    if (index > cursor) parts.push({ kind: 'literal', text: format.slice(cursor, index) });

    const token = TOKENS.find((entry) => entry.token === match[0]);

    // matchAll 用的就是 TOKEN_PATTERN，命中项必然在 TOKENS 里。
    if (token) parts.push({ kind: 'token', token: token.token, field: token.field });

    cursor = index + match[0].length;
  }

  if (cursor < format.length) parts.push({ kind: 'literal', text: format.slice(cursor) });

  return parts;
}

function escapeLiteral(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 按格式解析日期文本，失败返回 null。
 *
 * 校验是「真日历」校验而不是范围校验：2023-02-29、2023-13-01、2023-04-31 都
 * 返回 null；时间同理，24:00、12:60 也返回 null。缺省字段补默认值（月 1 月、
 * 日 1 号、时分秒 0），因此 'YYYY' 这类粗格式也能解析出当年 1 月 1 日零点。
 * 两位年份归 2000-2099。
 *
 * @param text 用户输入文本，首尾空白会被忽略。
 * @param format 与 formatDate 相同的格式串。
 */
export function parseDate(text: string, format: string): Date | null {
  const parts = tokenize(format);

  const fields: TokenField[] = [];
  const source = parts
    .map((part) => {
      if (part.kind === 'literal') return escapeLiteral(part.text);

      const token = TOKENS.find((entry) => entry.token === part.token);

      fields.push(part.field);

      return token ? token.pattern : '';
    })
    .join('');

  const match = new RegExp(`^${source}$`).exec(text.trim());

  if (!match) return null;

  let year = 2000;
  let month = 0;
  let day = 1;
  let hour = 0;
  let minute = 0;
  let second = 0;

  fields.forEach((field, index) => {
    const value = Number(match[index + 1]);

    if (field === 'year') year = value;
    else if (field === 'shortYear') year = SHORT_YEAR_BASE + value;
    else if (field === 'month') month = value - 1;
    else if (field === 'day') day = value;
    else if (field === 'hour') hour = value;
    else if (field === 'minute') minute = value;
    else second = value;
  });

  if (month < 0 || month > 11 || day < 1 || year < 0 || year > 9999) return null;
  if (hour > 23 || minute > 59 || second > 59) return null;

  // 借 2000 年（闰年）构造再改全年份：Date 构造器把 0-99 的年份映射到 1900+，
  // 直接 new Date(year, ...) 会让 '0023' 这类输入悄悄变成 1923 年。
  const date = new Date(2000, month, day, hour, minute, second);

  date.setFullYear(year);

  if (date.getMonth() !== month || date.getDate() !== day) return null;

  return date;
}
