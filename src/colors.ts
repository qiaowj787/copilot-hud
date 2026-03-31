import type { ColorConfig } from './types.js';

const NAMED_COLORS: Record<string, string> = {
  black: '30',
  red: '31',
  green: '32',
  yellow: '33',
  blue: '34',
  magenta: '35',
  cyan: '36',
  white: '37',
  brightBlack: '90',
  brightRed: '91',
  brightGreen: '92',
  brightYellow: '93',
  brightBlue: '94',
  brightMagenta: '95',
  brightCyan: '96',
  brightWhite: '97',
  dim: '2'
};

export class Palette {
  constructor(private readonly enabled: boolean, private readonly colors: ColorConfig) {}

  label(value: string): string {
    return this.paint(value, this.colors.label);
  }

  value(value: string): string {
    return this.paint(value, this.colors.value);
  }

  accent(value: string): string {
    return this.paint(value, this.colors.accent);
  }

  warning(value: string): string {
    return this.paint(value, this.colors.warning);
  }

  critical(value: string): string {
    return this.paint(value, this.colors.critical);
  }

  success(value: string): string {
    return this.paint(value, this.colors.success);
  }

  dim(value: string): string {
    return this.paint(value, this.colors.dim);
  }

  private paint(value: string, color: string): string {
    if (!this.enabled || !value) {
      return value;
    }
    const code = NAMED_COLORS[color] ?? NAMED_COLORS.white;
    return `\u001b[${code}m${value}\u001b[0m`;
  }
}
