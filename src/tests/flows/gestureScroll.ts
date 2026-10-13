tests.register("Gesture scroll snaps to a column edge", 1, () => {
    const config = getDefaultConfig();
    config.gestureScroll = true;
    const { qtMock, workspaceMock, world } = init(config);

    const clients = workspaceMock.createClientsWithWidths(300, 300, 300, 300);
    Assert.equal(rectRight(clients[3].getActualFrameGeometry()), rectRight(tilingArea));

    timeControl(addTime => {
        world.gestureScroll(-0.02);
        addTime(100);
        world.gestureScroll(-0.04);
        addTime(100);
        world.gestureScroll(-0.065625);
        addTime(300);
        world.gestureScrollFinish();
    });

    Assert.equal(clients[1].getActualFrameGeometry().x, tilingArea.x, { message: "The view should snap to the closest column edge" });
    Assert.assert(workspaceMock.activeWindow === clients[2], { message: "The rightmost fully visible column should take focus" });
});

tests.register("Gesture scroll inertia", 1, () => {
    const config = getDefaultConfig();
    config.gestureScroll = true;
    const { qtMock, workspaceMock, world } = init(config);

    const clients = workspaceMock.createClientsWithWidths(300, 300, 300, 300);

    timeControl(addTime => {
        for (let i = 1; i <= 5; i++) {
            world.gestureScroll(-0.015625 * i);
            addTime(10);
        }
        world.gestureScrollFinish();
    });

    Assert.equal(clients[0].getActualFrameGeometry().x, tilingArea.x, { message: "A fast swipe should carry the view past the closest column edge" });
});

tests.register("Gesture scroll inertia at max progress", 1, () => {
    const config = getDefaultConfig();
    config.gestureScroll = true;
    config.gestureScrollStep = 600;
    const { qtMock, workspaceMock, world } = init(config);

    const clients = workspaceMock.createClientsWithWidths(300, 300, 300, 300, 300, 300, 300, 300);

    timeControl(addTime => {
        for (let i = 1; i <= 4; i++) {
            world.gestureScroll(-0.25 * i);
            addTime(10);
        }
        Assert.equal(clients[0].getActualFrameGeometry().x, tilingArea.x, { message: "A swipe that reaches the maximum progress should keep moving before the release" });

        addTime(300);
        world.gestureScrollFinish();
    });

    Assert.equal(clients[0].getActualFrameGeometry().x, tilingArea.x, { message: "The release should not move the view again" });
});
