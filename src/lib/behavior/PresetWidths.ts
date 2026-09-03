interface PresetWidthsProvider {
    next(currentWidth: number, minWidth: number, maxWidth: number, tilingAreaWidth: number): number;
    prev(currentWidth: number, minWidth: number, maxWidth: number, tilingAreaWidth: number): number;
    getWidths(minWidth: number, maxWidth: number, tilingAreaWidth: number): number[];
    closest(width: number, minWidth: number, maxWidth: number, tilingAreaWidth: number): number;
    closestIndex(width: number, minWidth: number, maxWidth: number, tilingAreaWidth: number): number;
}

class PresetWidths implements PresetWidthsProvider {
    private readonly presets: ((tilingAreaWidth: number) => number)[];

    public static readonly tolerance = 1;

    constructor(presetWidths: string, spacing: number) {
        this.presets = PresetWidths.parsePresetWidths(presetWidths, spacing);
    }

    public next(currentWidth: number, minWidth: number, maxWidth: number, tilingAreaWidth: number) {
        const widths = this.getWidths(minWidth, maxWidth, tilingAreaWidth);
        const nextIndex = widths.findIndex(width => currentWidth + PresetWidths.tolerance < width);
        return nextIndex >= 0 ? widths[nextIndex] : widths[0];
    }

    public prev(currentWidth: number, minWidth: number, maxWidth: number, tilingAreaWidth: number) {
        const widths = this.getWidths(minWidth, maxWidth, tilingAreaWidth).reverse();
        const nextIndex = widths.findIndex(width => width + PresetWidths.tolerance < currentWidth);
        return nextIndex >= 0 ? widths[nextIndex] : widths[0];
    }

    public closestIndex(width: number, minWidth: number, maxWidth: number, tilingAreaWidth: number) {
        const widths = this.getWidths(minWidth, maxWidth, tilingAreaWidth);
        if (widths.length === 0) {
            return -1;
        }
        let bestIndex = 0;
        let bestError = Infinity;
        for (let i = 0; i < widths.length; i++) {
            const error = Math.abs(widths[i] - width);
            if (error < bestError) {
                bestError = error;
                bestIndex = i;
            }
        }
        return bestIndex;
    }

    public closest(width: number, minWidth: number, maxWidth: number, tilingAreaWidth: number) {
        const widths = this.getWidths(minWidth, maxWidth, tilingAreaWidth);
        const index = this.closestIndex(width, minWidth, maxWidth, tilingAreaWidth);
        return index >= 0 ? widths[index] : width;
    }

    public getWidths(minWidth: number, maxWidth: number, tilingAreaWidth: number) {
        const widths = this.presets.map(f => clamp(f(tilingAreaWidth), minWidth, maxWidth));
        widths.sort((a, b) => a - b);
        return uniq(widths);
    }

    private static parsePresetWidths(presetWidths: string, spacing: number): ((tilingAreaWidth: number) => number)[] {
        function getRatioFunction(ratio: number) {
            return (tilingAreaWidth: number) => Math.floor((tilingAreaWidth + spacing) * ratio - spacing);
        }

        return presetWidths.split(",").map((widthStr: string) => {
            widthStr = widthStr.trim();

            const widthPx = PresetWidths.parseNumberWithSuffix(widthStr, "px");
            if (widthPx !== undefined) {
                return () => widthPx;
            }

            const widthPct = PresetWidths.parseNumberWithSuffix(widthStr, "%");
            if (widthPct !== undefined) {
                return getRatioFunction(widthPct / 100.0);
            }

            return getRatioFunction(PresetWidths.parseNumberSafe(widthStr));
        });
    }

    private static parseNumberSafe(str: string) {
        const num = Number(str);
        if (isNaN(num) || num <= 0) {
            throw new Error("Invalid number: " + str);
        }
        return num;
    }

    private static parseNumberWithSuffix(str: string, suffix: string) {
        if (!str.endsWith(suffix)) {
            return undefined;
        }
        return PresetWidths.parseNumberSafe(str.substring(0, str.length-suffix.length).trim());
    }
}
