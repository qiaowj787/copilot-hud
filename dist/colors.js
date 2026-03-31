const NAMED_COLORS = {
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
    enabled;
    colors;
    constructor(enabled, colors) {
        this.enabled = enabled;
        this.colors = colors;
    }
    label(value) {
        return this.paint(value, this.colors.label);
    }
    value(value) {
        return this.paint(value, this.colors.value);
    }
    accent(value) {
        return this.paint(value, this.colors.accent);
    }
    warning(value) {
        return this.paint(value, this.colors.warning);
    }
    critical(value) {
        return this.paint(value, this.colors.critical);
    }
    success(value) {
        return this.paint(value, this.colors.success);
    }
    dim(value) {
        return this.paint(value, this.colors.dim);
    }
    paint(value, color) {
        if (!this.enabled || !value) {
            return value;
        }
        const code = NAMED_COLORS[color] ?? NAMED_COLORS.white;
        return `\u001b[${code}m${value}\u001b[0m`;
    }
}
