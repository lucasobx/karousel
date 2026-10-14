tests.register("Full width column", 1, () => {
    {
        const config = getDefaultConfig();
        const { qtMock, workspaceMock, world } = init(config);
        const [client1, client2] = workspaceMock.createClientsWithWidths(300, 200);
        const halfWidth = Math.floor((tilingArea.width + gapH) * 0.5 - gapH);

        qtMock.fireShortcut("karousel-column-width-maximize");
        Assert.equal(client2.getActualFrameGeometry().width, tilingArea.width, { message: "Maximizing should give the column the full width" });

        qtMock.fireShortcut("karousel-column-width-maximize");
        Assert.equal(client2.getActualFrameGeometry().width, 200, { message: "Maximizing again should restore the previous width" });

        qtMock.fireShortcut("karousel-column-width-maximize");
        qtMock.fireShortcut("karousel-cycle-preset-widths");
        Assert.equal(client2.getActualFrameGeometry().width, halfWidth, { message: "A width action should start from the full width" });
    }

    {
        const config = getDefaultConfig();
        config.expandSingleColumn = true;
        const { qtMock, workspaceMock, world } = init(config);
        const [client] = workspaceMock.createClientsWithWidths(300);
        Assert.equal(client.getActualFrameGeometry().width, tilingArea.width);

        qtMock.fireShortcut("karousel-column-width-maximize");
        Assert.equal(client.getActualFrameGeometry().width, 300, { message: "Maximizing an expanded single column should show its own width" });

        qtMock.fireShortcut("karousel-column-width-maximize");
        Assert.equal(client.getActualFrameGeometry().width, tilingArea.width);
    }

    {
        const config = getDefaultConfig();
        config.fullWidthMaximize = true;
        const { qtMock, workspaceMock, world } = init(config);
        const [client1, client2] = workspaceMock.createClientsWithWidths(300, 200);

        client2.setMaximize(true, true);
        Assert.equalRects(client2.getActualFrameGeometry(), tilingArea, { message: "A maximize request should give the column the full width inside the layout" });

        client2.setMaximize(true, true);
        Assert.equal(client2.getActualFrameGeometry().width, 200, { message: "Another maximize request should restore the previous width" });
    }
});
