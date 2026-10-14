tests.register("Expand single column", 1, () => {
    const config = getDefaultConfig();
    config.expandSingleColumn = true;

    {
        const { qtMock, workspaceMock, world } = init(config);
        const [client1] = workspaceMock.createClientsWithWidths(300);
        Assert.equalRects(client1.getActualFrameGeometry(), tilingArea, { message: "A single column should fill the tiling area" });

        const [client2] = workspaceMock.createClientsWithWidths(200);
        Assert.equal(client1.getActualFrameGeometry().width, 300, { message: "The column should go back to its own width" });
        Assert.equal(client2.getActualFrameGeometry().width, 200);

        workspaceMock.removeWindow(client2);
        Assert.equalRects(client1.getActualFrameGeometry(), tilingArea, { message: "The remaining column should fill the tiling area again" });
    }

    {
        const { qtMock, workspaceMock, world } = init(config);
        const client = new MockKwinClient(new MockQmlRect(0, 0, 300, 200));
        client.maxSize = new MockQmlSize(500, 9999);
        workspaceMock.createWindows(client);
        Assert.equal(client.getActualFrameGeometry().width, 500, { message: "A single column should not exceed the window's maximum width" });
    }

    {
        const { qtMock, workspaceMock, world } = init(config);
        const [client] = workspaceMock.createClientsWithWidths(300);
        const halfWidth = Math.floor((tilingArea.width + gapH) * 0.5 - gapH);

        qtMock.fireShortcut("karousel-cycle-preset-widths");
        Assert.equal(client.getActualFrameGeometry().width, halfWidth, { message: "Cycling the width of an expanded column should start from the full width" });

        const [other] = workspaceMock.createClientsWithWidths(200);
        workspaceMock.removeWindow(other);
        Assert.equal(client.getActualFrameGeometry().width, tilingArea.width, { message: "The column should expand again once it is alone again" });

        qtMock.fireShortcut("karousel-column-width-decrease");
        Assert.equal(client.getActualFrameGeometry().width, halfWidth, { message: "Decreasing the width of an expanded column should start from the full width" });

        const [another] = workspaceMock.createClientsWithWidths(200);
        workspaceMock.removeWindow(another);
        workspaceMock.resizeWindow(client, false, false, false, new MockQmlSize(-100, 0));
        Assert.equal(client.getActualFrameGeometry().width, tilingArea.width - 100, { message: "Resizing an expanded column should start from the full width" });
    }
});
