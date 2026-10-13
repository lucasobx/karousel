function setScreenWidth(config: Config, workspaceMock: MockWorkspace, width: number) {
    screen = new MockQmlRect(0, 0, width, 600);
    tilingArea = new MockQmlRect(
        config.gapsOuterLeft,
        config.gapsOuterTop,
        screen.width - config.gapsOuterLeft - config.gapsOuterRight,
        screen.height - config.gapsOuterTop - config.gapsOuterBottom,
    );
    workspaceMock.virtualScreenSizeChanged.fire();
}

tests.register("Width intent maximized", 1, () => {
    const config = getDefaultConfig();
    const { qtMock, workspaceMock, world } = init(config);

    const [client] = workspaceMock.createClientsWithWidths(300);
    qtMock.fireShortcut("karousel-column-width-maximize");
    Assert.equal(client.getActualFrameGeometry().width, tilingArea.width);

    setScreenWidth(config, workspaceMock, 1000);
    Assert.equal(client.getActualFrameGeometry().width, tilingArea.width, { message: "The maximized column should follow the tiling area" });
});

tests.register("Width intent equalized", 1, () => {
    const config = getDefaultConfig();
    const { qtMock, workspaceMock, world } = init(config);

    const clients = workspaceMock.createClientsWithWidths(100, 200, 300);
    qtMock.fireShortcut("karousel-columns-width-equalize");

    setScreenWidth(config, workspaceMock, 1000);
    const width = clients[0].getActualFrameGeometry().width;
    for (const client of clients) {
        Assert.equal(client.getActualFrameGeometry().width, width, { message: "The columns should stay equal" });
    }
    const gridWidth = rectRight(clients[2].getActualFrameGeometry()) - clients[0].getActualFrameGeometry().x;
    Assert.between(gridWidth, tilingArea.width - 5, tilingArea.width, { message: "The columns should keep filling the tiling area" });
});

tests.register("Width intent user resize", 1, () => {
    const config = getDefaultConfig();
    const { qtMock, workspaceMock, world } = init(config);

    const [client] = workspaceMock.createClientsWithWidths(300);
    qtMock.fireShortcut("karousel-column-width-maximize");
    workspaceMock.resizeWindow(client, false, false, false, new MockQmlSize(-100, 0));
    const width = tilingArea.width - 100;
    Assert.equal(client.getActualFrameGeometry().width, width);

    setScreenWidth(config, workspaceMock, 1000);
    Assert.equal(client.getActualFrameGeometry().width, width, { message: "A width set by the user should stay fixed" });
});

tests.register("Width intent external resize", 1, () => {
    const config = getDefaultConfig();
    const { qtMock, workspaceMock, world } = init(config);

    const [client] = workspaceMock.createClientsWithFrames(new MockQmlRect(10, 10, 300, 200));
    qtMock.fireShortcut("karousel-column-width-maximize");

    client.frameGeometry = new MockQmlRect(10, 10, 300, 200);
    Assert.equal(client.getActualFrameGeometry().width, tilingArea.width);

    setScreenWidth(config, workspaceMock, 1000);
    Assert.equal(client.getActualFrameGeometry().width, tilingArea.width, { message: "Re-applying the window constraints should keep the preset" });
});
