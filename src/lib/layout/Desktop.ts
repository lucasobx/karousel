class Desktop {
    public readonly grid: Grid;
    private scrollX: number;
    private gestureScrollState: Desktop.GestureScroll | null;
    private scrollAnimation: Desktop.ScrollAnimation | null;
    private dirty: boolean;
    private dirtyScroll: boolean;
    private dirtyPins: boolean;
    public clientArea: QmlRect;
    public tilingArea: QmlRect;
    private static readonly gestureScrollVelocityWindowMs = 150;
    private static readonly gestureScrollProjectionS = -1 / (1000 * Math.log(0.997));
    private static readonly scrollAnimationOmega = Math.sqrt(800);
    private static readonly scrollAnimationMaxS = 1;

    constructor(
        public readonly kwinDesktop: KwinDesktop,
        private readonly pinManager: PinManager,
        private readonly config: Desktop.Config,
        private readonly getScreen: () => Output,
        layoutConfig: LayoutConfig,
        focusPasser: FocusPassing.Passer,
    ) {
        this.scrollX = 0;
        this.gestureScrollState = null;
        this.scrollAnimation = null;
        this.dirty = true;
        this.dirtyScroll = true;
        this.dirtyPins = true;
        this.grid = new Grid(this, layoutConfig, focusPasser);
        this.clientArea = Desktop.getClientArea(this.getScreen(), kwinDesktop);
        this.tilingArea = Desktop.getTilingArea(this.clientArea, kwinDesktop, pinManager, config);
    }

    private updateArea() {
        const newClientArea = Desktop.getClientArea(this.getScreen(), this.kwinDesktop);
        if (rectEquals(newClientArea, this.clientArea) && !this.dirtyPins) {
            return;
        }
        this.clientArea = newClientArea;
        this.tilingArea = Desktop.getTilingArea(newClientArea, this.kwinDesktop, this.pinManager, this.config);
        this.dirty = true;
        this.dirtyScroll = true;
        this.dirtyPins = false;
        this.grid.onScreenSizeChanged();
        this.autoAdjustScroll();
    }

    private static getClientArea(screen: Output, kwinDesktop: KwinDesktop) {
        return Workspace.clientArea(ClientAreaOption.PlacementArea, screen, kwinDesktop);
    }

    private static getTilingArea(clientArea: QmlRect, kwinDesktop: KwinDesktop, pinManager: PinManager, config: Desktop.Config) {
        const availableSpace = pinManager.getAvailableSpace(kwinDesktop, clientArea);
        const top = availableSpace.top + config.marginTop;
        const bottom = availableSpace.bottom - config.marginBottom;
        const left = availableSpace.left + config.marginLeft;
        const right = availableSpace.right - config.marginRight;
        return Qt.rect(
            left,
            top,
            right - left,
            bottom - top,
        );
    }

    public scrollIntoView(range: Range) {
        const left = range.getLeft();
        const right = range.getRight();
        const initialVisibleRange = this.getCurrentVisibleRange();

        let targetScrollX: number;
        if (left < initialVisibleRange.getLeft()) {
            targetScrollX = left;
        } else if (right > initialVisibleRange.getRight()) {
            targetScrollX = right - this.tilingArea.width;
        } else {
            targetScrollX = initialVisibleRange.getLeft();
        }

        this.setScroll(targetScrollX, false);
    }

    public scrollCenterRange(range: Range) {
        const scrollAmount = Range.minus(range, this.getCurrentVisibleRange());
        this.adjustScroll(scrollAmount, true);
    }

    public scrollCenterVisible(focusedColumn: Column) {
        const columnRange = new Desktop.ColumnRange(focusedColumn);
        const visibleRange = this.getCurrentVisibleRange();
        columnRange.addNeighbors(visibleRange, this.grid.config.gapsInnerHorizontal);
        this.scrollCenterRange(columnRange);
    }

    public autoAdjustScroll() {
        const focusedColumn = this.grid.getLastFocusedColumn();
        if (focusedColumn === null || focusedColumn.grid !== this.grid) {
            return;
        }

        this.scrollToColumn(focusedColumn, false);
    }

    public scrollToColumn(column: Column, force: boolean) {
        if (force || this.dirtyScroll || !Range.contains(this.getCurrentVisibleRange(), column)) {
            this.config.scroller.scrollToColumn(this, column);
        }
    }

    private getVisibleRange(scrollX: number) {
        return Range.create(scrollX, this.tilingArea.width);
    }

    public getCurrentVisibleRange() {
        return this.getVisibleRange(this.scrollX);
    }

    private clampScrollX(x: number) {
        return this.config.clamper.clampScrollX(this, x);
    }

    public setScroll(x: number, force: boolean) {
        this.scrollAnimation = null;
        this.applyScroll(x, force);
    }

    private applyScroll(x: number, force: boolean) {
        const oldScrollX = this.scrollX;
        this.scrollX = force ? x : this.clampScrollX(x);
        if (this.scrollX !== oldScrollX) {
            this.onLayoutChanged();
        }
        this.dirtyScroll = false;
    }

    public adjustScroll(dx: number, force: boolean) {
        this.setScroll(this.scrollX + dx, force);
    }

    public gestureScroll(amount: number) {
        if (!this.config.gestureScroll) {
            return false;
        }
        if (this.gestureScrollState === null) {
            this.gestureScrollState = { startX: this.scrollX, baseX: this.scrollX, samples: [], saturated: false };
        }
        const gesture = this.gestureScrollState;

        if (this.config.gestureScrollInvert) {
            amount = -amount;
        }
        if (gesture.saturated) {
            gesture.baseX = this.scrollX - this.config.gestureScrollStep * amount;
            gesture.samples = [];
            gesture.saturated = false;
        }

        const x = gesture.baseX + this.config.gestureScrollStep * amount;
        gesture.samples.push({ time: Date.now(), x: x });
        this.setScroll(x, false);

        if (Math.abs(amount) >= 1) {
            gesture.saturated = true;
            this.startGestureScrollAnimation(gesture);
            return true;
        }
        return false;
    }

    public gestureScrollFinish() {
        const gesture = this.gestureScrollState;
        this.gestureScrollState = null;
        if (gesture === null || gesture.saturated) {
            return false;
        }

        this.startGestureScrollAnimation(gesture);
        return true;
    }

    private startGestureScrollAnimation(gesture: Desktop.GestureScroll) {
        const velocity = Desktop.getGestureScrollVelocity(gesture.samples);
        const target = this.getGestureScrollSnapTarget(this.scrollX + velocity * Desktop.gestureScrollProjectionS);
        this.scrollAnimation = {
            from: this.scrollX,
            to: target,
            velocity: velocity,
            elapsedMs: 0,
            scrolledRight: target > gesture.startX,
        };
    }

    private static getGestureScrollVelocity(samples: Desktop.GestureScrollSample[]) {
        const now = Date.now();
        const recentSamples = samples.filter(sample => now - sample.time <= Desktop.gestureScrollVelocityWindowMs);
        if (recentSamples.length === 0) {
            return 0;
        }
        const duration = now - recentSamples[0].time;
        if (duration === 0) {
            return 0;
        }
        return (recentSamples[recentSamples.length - 1].x - recentSamples[0].x) * 1000 / duration;
    }

    private getGestureScrollSnapTarget(projectedX: number) {
        const width = this.tilingArea.width;
        let target = this.clampScrollX(projectedX);
        let minDistance = Infinity;
        for (let column = this.grid.getFirstColumn(); column !== null; column = this.grid.getRightColumn(column)) {
            const snapPoints = this.config.gestureScrollSnapCenter
                ? [Math.round(column.getLeft() + (column.getWidth() - width) / 2)]
                : [column.getLeft(), column.getRight() - width];
            for (const snapPoint of snapPoints) {
                const x = this.clampScrollX(snapPoint);
                const distance = Math.abs(x - projectedX);
                if (distance < minDistance) {
                    minDistance = distance;
                    target = x;
                }
            }
        }
        return target;
    }

    public stepScrollAnimation(elapsedMs: number, focusedWindow: Window|null) {
        const animation = this.scrollAnimation;
        if (animation === null) {
            return false;
        }

        animation.elapsedMs += elapsedMs;
        const t = animation.elapsedMs / 1000;
        const omega = Desktop.scrollAnimationOmega;
        const offset = animation.from - animation.to;
        const a = animation.velocity + omega * offset;
        const decay = Math.exp(-omega * t);
        const x = animation.to + (offset + a * t) * decay;
        const velocity = (animation.velocity - omega * a * t) * decay;
        if ((Math.abs(x - animation.to) < 0.5 && Math.abs(velocity) < 50) || t >= Desktop.scrollAnimationMaxS) {
            this.applyScroll(animation.to, false);
            this.scrollAnimation = null;
            this.focusVisibleColumn(focusedWindow, animation.scrolledRight);
            return false;
        }

        this.applyScroll(x, false);
        return true;
    }

    private focusVisibleColumn(focusedWindow: Window|null, scrolledRight: boolean) {
        const visibleRange = this.getCurrentVisibleRange();
        if (focusedWindow !== null && !Range.contains(visibleRange, focusedWindow.column)) {
            // the focused window is no longer visible, find a new window to focus
            const focusTargetColumn = scrolledRight ?
                this.grid.getLeftmostVisibleColumn(visibleRange) :
                this.grid.getRightmostVisibleColumn(visibleRange);
            if (focusTargetColumn !== null) {
                focusTargetColumn.getWindowToFocus().focus();
            }
        }
    }

    public arrange() {
        // TODO (optimization): only arrange visible windows
        this.updateArea();
        if (!this.dirty) {
            return;
        }
        this.grid.arrange(this.tilingArea.x - this.scrollX, this.getCurrentVisibleRange());
        this.dirty = false;
    }

    public forceArrange() {
        this.dirty = true;
    }

    public onLayoutChanged() {
        this.dirty = true;
        this.dirtyScroll = true;
    }

    public onPinsChanged() {
        this.dirty = true;
        this.dirtyScroll = true;
        this.dirtyPins = true;
    }

    public destroy() {
        this.grid.destroy();
    }
}

namespace Desktop {
    export interface Config {
        marginTop: number;
        marginBottom: number;
        marginLeft: number;
        marginRight: number;
        gestureScroll: boolean;
        gestureScrollInvert: boolean;
        gestureScrollStep: number;
        gestureScrollSnapCenter: boolean;
        scroller: Desktop.Scroller;
        clamper: Desktop.Clamper;
    }

    export class ColumnRange {
        private left: Column;
        private right: Column;
        private width: number;

        constructor(initialColumn: Column) {
            this.left = initialColumn;
            this.right = initialColumn;
            this.width = initialColumn.getWidth();
        }

        public addNeighbors(visibleRange: Range, gap: number) {
            const grid = this.left.grid;

            const columnRange = this;
            function canFit(column: Column) {
                return columnRange.width + gap + column.getWidth() <= visibleRange.getWidth();
            }
            function isUsable(column: Column|null) {
                return column !== null && canFit(column);
            }

            let leftColumn = grid.getLeftColumn(this.left);
            let rightColumn = grid.getRightColumn(this.right);
            function checkColumns() {
                if (!isUsable(leftColumn)) {
                    leftColumn = null;
                }
                if (!isUsable(rightColumn)) {
                    rightColumn = null;
                }
            }
            checkColumns();

            const visibleCenter = visibleRange.getLeft() + visibleRange.getWidth() / 2;
            while (leftColumn !== null || rightColumn !== null) {
                const leftToCenter = leftColumn === null ? Infinity : Math.abs(leftColumn.getLeft() - visibleCenter);
                const rightToCenter = rightColumn === null ? Infinity : Math.abs(rightColumn.getRight() - visibleCenter);
                if (leftToCenter < rightToCenter) {
                    this.addLeft(leftColumn!, gap);
                    leftColumn = grid.getLeftColumn(leftColumn!);
                } else {
                    this.addRight(rightColumn!, gap);
                    rightColumn = grid.getRightColumn(rightColumn!);
                }
                checkColumns();
            }
        }

        public addLeft(column: Column, gap: number) {
            this.left = column;
            this.width += column.getWidth() + gap;
        }

        public addRight(column: Column, gap: number) {
            this.right = column;
            this.width += column.getWidth() + gap;
        }

        public getLeft() {
            return this.left.getLeft();
        }

        public getRight() {
            return this.right.getRight();
        }

        public getWidth() {
            return this.width;
        }
    }

    export interface Scroller {
        scrollToColumn(desktop: Desktop, column: Column): void;
    }

    export interface Clamper {
        clampScrollX(desktop: Desktop, x: number): number;
    }

    export interface GestureScrollSample {
        time: number;
        x: number;
    }

    export interface GestureScroll {
        startX: number;
        baseX: number;
        samples: GestureScrollSample[];
        saturated: boolean;
    }

    export interface ScrollAnimation {
        from: number;
        to: number;
        velocity: number;
        elapsedMs: number;
        scrolledRight: boolean;
    }
}
