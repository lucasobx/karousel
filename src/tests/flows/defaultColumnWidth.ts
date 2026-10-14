tests.register("Default column width", 1, () => {
    const config = getDefaultConfig();
    config.defaultColumnWidth = "50%";
    config.windowRules = JSON.stringify([
        { class: "fixed-app", defaultColumnWidth: "300px" },
        { class: "own-width-app", defaultColumnWidth: "" },
    ]);

    const { qtMock, workspaceMock, world, existingClients: [existingClient] } = init(config, [new MockQmlRect(0, 0, 200, 300)]);
    Assert.equal(existingClient.getActualFrameGeometry().width, 200, { message: "A window that was open before Karousel started should keep its width" });

    const [client] = workspaceMock.createClientsWithWidths(200);
    Assert.equal(client.getActualFrameGeometry().width, Math.floor((tilingArea.width + gapH) * 0.5 - gapH));

    const fixedClient = new MockKwinClient(new MockQmlRect(0, 0, 200, 300));
    fixedClient.resourceClass = "fixed-app";
    const ownWidthClient = new MockKwinClient(new MockQmlRect(0, 0, 200, 300));
    ownWidthClient.resourceClass = "own-width-app";
    workspaceMock.createWindows(fixedClient, ownWidthClient);
    Assert.equal(fixedClient.getActualFrameGeometry().width, 300, { message: "A window rule should override the default width" });
    Assert.equal(ownWidthClient.getActualFrameGeometry().width, 200, { message: "An empty width in a window rule should keep the size the application asks for" });

    config.expandSingleColumn = true;
    {
        const { qtMock, workspaceMock, world } = init(config);
        const [firstClient] = workspaceMock.createClientsWithWidths(200);
        Assert.equalRects(firstClient.getActualFrameGeometry(), tilingArea, { message: "The default width should not stop a single column from expanding" });

        workspaceMock.createClientsWithWidths(200);
        Assert.equal(firstClient.getActualFrameGeometry().width, Math.floor((tilingArea.width + gapH) * 0.5 - gapH), { message: "The column should go back to the default width" });
    }
});
