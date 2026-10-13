function getClientDesiredFrame(width: number) {
    return new MockQmlRect(10, 10, width, 200);
}

function getTiledFrame(width: number) {
    return new MockQmlRect(
        tilingArea.x + Math.round((tilingArea.width - width) / 2),
        tilingArea.y,
        width,
        tilingArea.height,
    );
}

tests.register("External resize", 1, () => {
    const config = getDefaultConfig();
    const { qtMock, workspaceMock, world } = init(config);

    const [client] = workspaceMock.createClientsWithFrames(getClientDesiredFrame(100));
    Assert.equalRects(client.getActualFrameGeometry(), getTiledFrame(100), { message: "We should tile the window, respecting its desired width" });

    function testExternalResizing(columnWidth: number) {
        for (const width of [110, 120, 130, 140]) {
            client.frameGeometry = getClientDesiredFrame(width);
            Assert.equalRects(client.getActualFrameGeometry(), getTiledFrame(columnWidth), { message: "We should keep the window at its column width" });
        }

        client.frameGeometry = getClientDesiredFrame(200);
        Assert.equalRects(client.getActualFrameGeometry(), getTiledFrame(200), { message: "The client keeps fighting, we should give up and adopt its width" });

        client.frameGeometry = getClientDesiredFrame(210);
        Assert.equalRects(client.getActualFrameGeometry(), getClientDesiredFrame(210), { message: "We should let the client have its desired frame until the concession expires" });
    }

    timeControl(addTime => {
        testExternalResizing(100);
        addTime(1000);
        // the concession has expired, let's test again
        testExternalResizing(200);
    });
});

tests.register("External resize of a non-resizable window", 1, () => {
    const config = getDefaultConfig();
    const { qtMock, workspaceMock, world } = init(config);

    const [client] = workspaceMock.createClientsWithFrames(getClientDesiredFrame(100));
    Assert.equalRects(client.getActualFrameGeometry(), getTiledFrame(100));

    client.sizeLocked = true;
    client.frameGeometry = getClientDesiredFrame(150);
    Assert.equalRects(client.getActualFrameGeometry(), getTiledFrame(150), { message: "The client controls its size, we should adopt its width" });
});

tests.register("External resize refused slowly", 1, () => {
    const config = getDefaultConfig();
    const { qtMock, workspaceMock, world } = init(config);

    const [client] = workspaceMock.createClientsWithFrames(getClientDesiredFrame(100));
    Assert.equalRects(client.getActualFrameGeometry(), getTiledFrame(100));

    timeControl(addTime => {
        client.frameGeometry = getClientDesiredFrame(150);
        Assert.equalRects(client.getActualFrameGeometry(), getTiledFrame(100), { message: "We should keep the window at its column width" });

        addTime(2000);
        client.frameGeometry = getClientDesiredFrame(150);
        Assert.equalRects(client.getActualFrameGeometry(), getTiledFrame(100), { message: "Going back to the same width once more is not a refusal yet" });

        addTime(2000);
        client.frameGeometry = getClientDesiredFrame(150);
        Assert.equalRects(client.getActualFrameGeometry(), getTiledFrame(150), { message: "The client keeps going back to the same width, we should adopt it" });
    });
});

tests.register("External resize repeated", 1, () => {
    const config = getDefaultConfig();
    const { qtMock, workspaceMock, world } = init(config);

    const [client] = workspaceMock.createClientsWithFrames(getClientDesiredFrame(100));
    Assert.equalRects(client.getActualFrameGeometry(), getTiledFrame(100));

    timeControl(addTime => {
        client.frameGeometry = getClientDesiredFrame(150);
        addTime(500);
        client.frameGeometry = getClientDesiredFrame(150);
        Assert.equalRects(client.getActualFrameGeometry(), getTiledFrame(100), { message: "Restoring the same size twice on startup should not change the column width" });

        addTime(11000);
        client.frameGeometry = getClientDesiredFrame(150);
        Assert.equalRects(client.getActualFrameGeometry(), getTiledFrame(100), { message: "Resizing to the same size much later should not count as a refusal" });
    });
});

tests.register("External resize keeps preset width", 1, () => {
    const config = getDefaultConfig();
    config.snapNewColumnsToPresets = true;
    const { qtMock, workspaceMock, world } = init(config);

    const halfWidth = Math.floor((tilingArea.width + config.gapsInnerHorizontal) * 0.5 - config.gapsInnerHorizontal);
    const [client] = workspaceMock.createClientsWithFrames(getClientDesiredFrame(300));
    Assert.equalRects(client.getActualFrameGeometry(), getTiledFrame(halfWidth), { message: "We should snap the new column to the closest preset width" });

    timeControl(addTime => {
        addTime(5000);
        client.frameGeometry = getClientDesiredFrame(300);
        Assert.equalRects(client.getActualFrameGeometry(), getTiledFrame(halfWidth), { message: "The client resizing itself later should not change the preset width" });
    });
});
