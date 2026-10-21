tests.register("User resize", 10, () => {
    const config = getDefaultConfig();
    config.resizeNeighborColumn = true;

    const h = getWindowHeight(2);
    let clientLeft: MockKwinClient, clientRightTop: MockKwinClient, clientRightBottom: MockKwinClient;
    function assertSizes(leftWidth: number, rightWidth: number, topHeight: number, bottomHeight: number) {
        const { left, right } = getGridBounds(clientLeft, clientRightTop);
        Assert.rect(clientLeft.getActualFrameGeometry(), left, tilingArea.y, leftWidth, tilingArea.height);
        Assert.rect(clientRightTop.getActualFrameGeometry(), left+leftWidth+gapH, tilingArea.y, rightWidth, topHeight);
        Assert.rect(clientRightBottom.getActualFrameGeometry(), left+leftWidth+gapH, tilingArea.y+topHeight+gapV, rightWidth, bottomHeight);
    }

    {
        const { qtMock, workspaceMock, world } = init(config);
        [clientLeft, clientRightTop, clientRightBottom] = workspaceMock.createClientsWithWidths(300, 300, 200);
        qtMock.fireShortcut("karousel-window-move-left");
        assertSizes(300, 300, h, h);

        workspaceMock.resizeWindow(clientLeft, false, false, false, new MockQmlSize(10, 20));
        assertSizes(310, 300, h, h);

        workspaceMock.resizeWindow(clientLeft, true, false, false, new MockQmlSize(10, 0), new MockQmlSize(-10, 0));
        assertSizes(310, 300, h, h);

        workspaceMock.resizeWindow(clientRightTop, false, false, false, new MockQmlSize(-5, -10), new MockQmlSize(-5, -10));
        assertSizes(310, 290, h-20, h+20);

        workspaceMock.resizeWindow(clientRightBottom, false, false, false, new MockQmlSize(-10, 20));
        assertSizes(310, 280, h-20, h+20);

        workspaceMock.resizeWindow(clientRightBottom, false, false, true, new MockQmlSize(0, 20));
        assertSizes(310, 280, h-40, h+40);
    }

    {
        const { qtMock, workspaceMock, world } = init(config);
        [clientLeft, clientRightTop, clientRightBottom] = workspaceMock.createClientsWithWidths(300, 300, 200);
        qtMock.fireShortcut("karousel-window-move-left");
        assertSizes(300, 300, h, h);

        workspaceMock.resizeWindow(clientLeft, true, false, false, new MockQmlSize(10, 20));
        assertSizes(310, 290, h, h);

        workspaceMock.resizeWindow(clientLeft, true, false, false, new MockQmlSize(10, 0), new MockQmlSize(-10, 0));
        assertSizes(310, 290, h, h);

        workspaceMock.resizeWindow(clientRightTop, true, false, false, new MockQmlSize(-5, -10), new MockQmlSize(-5, -10));
        assertSizes(310, 280, h-20, h+20);

        workspaceMock.resizeWindow(clientRightBottom, true, true, false, new MockQmlSize(-10, 20));
        assertSizes(320, 270, h-20, h+20);

        workspaceMock.resizeWindow(clientRightBottom, true, false, true, new MockQmlSize(0, 20));
        assertSizes(320, 270, h-40, h+40);
    }

    {
        const { qtMock, workspaceMock, world } = init(config);
        [clientLeft, clientRightTop, clientRightBottom] = workspaceMock.createClientsWithWidths(300, 300, 200);
        clientRightBottom.minSize = new MockQmlSize(295, h-20);
        qtMock.fireShortcut("karousel-window-move-left");
        assertSizes(300, 300, h, h);

        workspaceMock.resizeWindow(clientLeft, true, false, false, new MockQmlSize(10, 20));
        assertSizes(310, 295, h, h);

        workspaceMock.resizeWindow(clientLeft, true, false, false, new MockQmlSize(10, 0), new MockQmlSize(-10, 0));
        assertSizes(310, 295, h, h);

        workspaceMock.resizeWindow(clientRightTop, true, false, false, new MockQmlSize(-5, -10), new MockQmlSize(-5, -10));
        assertSizes(310, 295, h-20, h+20);

        workspaceMock.resizeWindow(clientRightBottom, true, true, false, new MockQmlSize(-10, 20));
        assertSizes(310, 295, h-20, h+20);

        workspaceMock.resizeWindow(clientRightTop, true, true, false, new MockQmlSize(-10, 0));
        assertSizes(310, 295, h-20, h+20);

        workspaceMock.resizeWindow(clientRightTop, true, false, false, new MockQmlSize(0, 80), new MockQmlSize(0, -20));
        assertSizes(310, 295, h+20, h-20);
    }

    {
        const { qtMock, workspaceMock, world } = init(config);
        const [clientLeftTop, clientLeftBottom, clientRight] = workspaceMock.createClientsWithWidths(300, 200, 300);
        clientLeftBottom.minSize = new MockQmlSize(295, h-20);

        function assertSizes(leftWidth: number, rightWidth: number, topHeight: number, bottomHeight: number) {
            const { left, right } = getGridBounds(clientLeftTop, clientRight);
            Assert.rect(clientLeftTop.getActualFrameGeometry(), left, tilingArea.y, leftWidth, topHeight);
            Assert.rect(clientLeftBottom.getActualFrameGeometry(), left, tilingArea.y+topHeight+gapV, leftWidth, bottomHeight);
            Assert.rect(clientRight.getActualFrameGeometry(), left+leftWidth+gapH, tilingArea.y, rightWidth, tilingArea.height);
        }

        workspaceMock.activeWindow = clientLeftBottom;
        qtMock.fireShortcut("karousel-window-move-left");
        assertSizes(300, 300, h, h);

        workspaceMock.resizeWindow(clientLeftTop, true, false, false, new MockQmlSize(-10, 0));
        assertSizes(295, 305, h, h);

        workspaceMock.resizeWindow(clientLeftTop, true, false, false, new MockQmlSize(10, 0));
        assertSizes(305, 295, h, h);

        workspaceMock.resizeWindow(clientLeftTop, true, false, false, new MockQmlSize(-20, 0), new MockQmlSize(20, 0));
        assertSizes(305, 295, h, h);
    }
});

tests.register("User resize with alternating client widths", 10, () => {
    const config = getDefaultConfig();
    const { workspaceMock } = init(config);
    const [clientLeft, clientRight] = workspaceMock.createClientsWithWidths(500, 500);
    const frame = clientLeft.getFrameGeometryCopy();
    Assert.assert(frame.x < clientRight.getActualFrameGeometry().x, { message: "invalid test setup" });

    function commit(widthDelta: number) {
        clientLeft.frameGeometry = new MockQmlRect(frame.x + 1/3, frame.y, frame.width + widthDelta, frame.height);
    }

    clientLeft.resize = true;
    clientLeft.interactiveMoveResizeStarted.fire();

    let rightX = clientRight.getActualFrameGeometry().x;
    for (const widthDelta of [2, 12, 6, 16, 10, 20]) {
        commit(widthDelta);
        const newRightX = clientRight.getActualFrameGeometry().x;
        Assert.assert(newRightX >= rightX, { message: "The neighbor column should not move back while the client's width alternates" });
        Assert.assert(newRightX >= rectRight(frame) + widthDelta + gapH, { message: "The neighbor column should not overlap the resized window" });
        rightX = newRightX;
    }

    commit(4);
    commit(2);
    clientLeft.resize = false;
    clientLeft.interactiveMoveResizeFinished.fire();
    Assert.equal(clientLeft.getActualFrameGeometry().width, frame.width + 2, { message: "The column should take the width the client had when the resize ended" });
});
