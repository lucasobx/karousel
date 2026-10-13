class Ticker {
    private readonly timer: QmlTimer;
    private tick: ((elapsedMs: number) => boolean) | null;
    private lastTime: number;

    constructor(private readonly intervalMs: number) {
        this.tick = null;
        this.lastTime = 0;
        this.timer = initQmlTimer();
        this.timer.interval = intervalMs;
        this.timer.triggered.connect(() => this.onTriggered());
    }

    public start(tick: (elapsedMs: number) => boolean) {
        this.tick = tick;
        this.lastTime = Date.now();
        this.timer.restart();
    }

    private onTriggered() {
        if (this.tick === null) {
            return;
        }

        const now = Date.now();
        const elapsedMs = Math.max(now - this.lastTime, this.intervalMs);
        this.lastTime = now;
        if (this.tick(elapsedMs)) {
            this.timer.restart();
        } else {
            this.tick = null;
        }
    }

    public destroy() {
        this.tick = null;
        this.timer.destroy();
    }
}
