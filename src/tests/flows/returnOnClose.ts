tests.register("Closing a just-opened window restores the view", 1, () => {
    const config = getDefaultConfig();

    function openWindowBesideSecondColumn() {
        const { qtMock, workspaceMock, world } = init(config);
        const [clientA, clientB] = workspaceMock.createClientsWithWidths(300, 300, 300);
        qtMock.fireShortcut("karousel-focus-start");
        qtMock.fireShortcut("karousel-focus-right");
        Assert.equal(clientA.getActualFrameGeometry().x, tilingArea.x);

        const [clientNew] = workspaceMock.createClientsWithWidths(300);
        Assert.assert(clientA.getActualFrameGeometry().x < tilingArea.x, { message: "Opening the window should scroll the view" });
        return { qtMock, workspaceMock, clientA, clientB, clientNew };
    }

    {
        const { workspaceMock, clientA, clientB, clientNew } = openWindowBesideSecondColumn();
        workspaceMock.closeWindow(clientNew, clientB);
        Assert.equal(clientA.getActualFrameGeometry().x, tilingArea.x, { message: "Closing the window should restore the view" });
        Assert.assert(workspaceMock.activeWindow === clientB);
    }

    {
        const { workspaceMock, clientA, clientB, clientNew } = openWindowBesideSecondColumn();
        workspaceMock.removeWindow(clientNew);
        Assert.equal(clientA.getActualFrameGeometry().x, tilingArea.x, { message: "Closing the window should restore the view" });
        Assert.assert(workspaceMock.activeWindow === clientB);
    }

    {
        const { qtMock, workspaceMock, clientA, clientB, clientNew } = openWindowBesideSecondColumn();
        qtMock.fireShortcut("karousel-focus-left");
        const x = clientA.getActualFrameGeometry().x;
        workspaceMock.closeWindow(clientNew, clientB);
        Assert.equal(clientA.getActualFrameGeometry().x, x, { message: "After focus moved away, closing the window should not move the view" });
    }
});
