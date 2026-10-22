const {
    app,
    ipcMain,
    BrowserWindow,
    session,
    dialog,
    Menu,
    MenuItem,
    globalShortcut,
    shell,
} = require("electron");
const fs = require("fs");
const paths = require("path");
const url = require("url");
const remoteMain = require("@electron/remote/main");

remoteMain.initialize();

let win;
global.sharedObj = {
    pathName: "C:\\WM_Json",
    currentStory: "default",
    S3filepath: "stories_workmob/config/",
};

let child;
let childLogin;

function ShowPage(pageName) {
    if (win && !win.isDestroyed()) {
        win.loadFile(pageName);
    }
}

function buildAppMenu() {
    const activeProfile = global.sharedObj.currentStory || "default";

    const template = [
        {
            label: "Stories",
            accelerator: "CmdOrCtrl+1",
            click: function () {
                ShowPage("Stories.html");
            },
        },
        {
            label: "Categories",
            accelerator: "CmdOrCtrl+2",
            click: function () {
                ShowPage("categories.html");
            },
        },
        {
            label: "Location Detail",
            accelerator: "CmdOrCtrl+3",
            click: function () {
                ShowPage("locationdetail.html");
            },
        },
        {
            label: "Blog Home",
            accelerator: "CmdOrCtrl+4",
            click: function () {
                ShowPage("bloghome.html");
            },
        },
        {
            label: "Stories – Top",
            accelerator: "CmdOrCtrl+5",
            click: function () {
                ShowPage("stories_top.html");
            },
        },
        {
            label: "Trending",
            accelerator: "CmdOrCtrl+6",
            click: function () {
                ShowPage("trending.html");
            },
        },
        {
            label: "Mobile Home",
            accelerator: "CmdOrCtrl+7",
            click: function () {
                ShowPage("mobile_home_screen.html");
            },
        },
        {
            label: "Channels",
            submenu: [
                {
                    label: "Gyan",
                    click: function () {
                        ShowPage("pages/gyan.html");
                    },
                },
                {
                    label: "Hope",
                    click: function () {
                        ShowPage("pages/hope.html");
                    },
                },
                {
                    label: "Namaste",
                    click: function () {
                        ShowPage("pages/namaste.html");
                    },
                },
                {
                    label: "Promotion",
                    click: function () {
                        ShowPage("pages/promotion.html");
                    },
                },
                {
                    label: "Vocal for Local",
                    click: function () {
                        ShowPage("pages/Vocal4Local.html");
                    },
                },
            ],
        },
        {
            label: "Tools",
            submenu: [
                {
                    label: "Advance Search",
                    click: function () {
                        ShowPage("pages/AdvanceSearch.html");
                    },
                },
                {
                    label: "Update Story Heading",
                    click: function () {
                        ShowPage("pages/UpdateHeading.html");
                    },
                },
                { type: "separator" },
                {
                    label: "Product Owner",
                    click: function () {
                        ShowPage("pages/productowner.html");
                    },
                },
                {
                    label: "Top Product",
                    click: function () {
                        ShowPage("pages/topproduct.html");
                    },
                },
            ],
        },
        {
            label: "Settings",
            submenu: [
                {
                    label: "Config",
                    click: function () {
                        ShowPage("UpdateConfig.html");
                    },
                },
                {
                    label: "Category Master",
                    click: function () {
                        ShowPage("category_master.html");
                    },
                },
                {
                    label: "Sub-Category Master",
                    click: function () {
                        ShowPage("sub-category_master.html");
                    },
                },
                { type: "separator" },
                {
                    label: "Users",
                    click: function () {
                        ShowPage("pages/Instructor.html");
                    },
                },
                {
                    label: "Location",
                    click: function () {
                        ShowPage("pages/location.html");
                    },
                },
                {
                    label: "Organisation",
                    click: function () {
                        ShowPage("pages/organisation.html");
                    },
                },
            ],
        },
        {
            label: "Switch",
            submenu: [
                {
                    label: "Default",
                    type: "radio",
                    checked: activeProfile === "default",
                    click: () => {
                        global.sharedObj.currentStory = "default";
                        buildAppMenu();
                        win.reload();
                    },
                },
                {
                    label: "Audio",
                    type: "radio",
                    checked: activeProfile === "audio",
                    click: () => {
                        global.sharedObj.currentStory = "audio";
                        buildAppMenu();
                        win.reload();
                    },
                },
                {
                    label: "Gyan",
                    type: "radio",
                    checked: activeProfile === "gyan",
                    click: () => {
                        global.sharedObj.currentStory = "gyan";
                        buildAppMenu();
                        win.reload();
                    },
                },
                {
                    label: "Hope",
                    type: "radio",
                    checked: activeProfile === "hope",
                    click: () => {
                        global.sharedObj.currentStory = "hope";
                        buildAppMenu();
                        win.reload();
                    },
                },
                {
                    label: "Namaste",
                    type: "radio",
                    checked: activeProfile === "namaste",
                    click: () => {
                        global.sharedObj.currentStory = "namaste";
                        buildAppMenu();
                        win.reload();
                    },
                },
                {
                    label: "Promotion",
                    type: "radio",
                    checked: activeProfile === "promotion",
                    click: () => {
                        global.sharedObj.currentStory = "promotion";
                        buildAppMenu();
                        win.reload();
                    },
                },
                {
                    label: "Product",
                    type: "radio",
                    checked: activeProfile === "product",
                    click: () => {
                        global.sharedObj.currentStory = "product";
                        buildAppMenu();
                        win.reload();
                    },
                },
            ],
        },
        {
            label: "View",
            submenu: [
                {
                    label: "Reload",
                    accelerator: "CmdOrCtrl+R",
                    click: () => {
                        if (win && !win.isDestroyed()) win.reload();
                    },
                },
                {
                    label: "Force Reload",
                    accelerator: "CmdOrCtrl+Shift+R",
                    click: () => {
                        if (win && !win.isDestroyed()) win.webContents.reloadIgnoringCache();
                    },
                },
                { type: "separator" },
                {
                    label: "Toggle Full Screen",
                    accelerator: "F11",
                    click: () => {
                        if (win && !win.isDestroyed()) win.setFullScreen(!win.isFullScreen());
                    },
                },
                {
                    label: "Toggle Developer Tools",
                    accelerator: "F12",
                    click: () => {
                        if (win && !win.isDestroyed()) win.webContents.toggleDevTools();
                    },
                },
            ],
        },
        {
            label: "Help",
            submenu: [
                {
                    label: "Workmob Website",
                    accelerator: "CmdOrCtrl+Shift+H",
                    click: function () {
                        shell.openExternal("https://workmob.com");
                    },
                },
                { type: "separator" },
                {
                    label: "Home",
                    click: function () {
                        ShowPage("index.html");
                    },
                },
                {
                    label: "Utility",
                    click: function () {
                        ShowPage("Utility.html");
                    },
                },
                { type: "separator" },
                {
                    role: "window",
                    submenu: [{ role: "minimize" }, { role: "close" }],
                },
            ],
        },
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

app.on("ready", function () {
    if (process.argv.includes("--generate-pdf")) {
        console.log("Generating PDF...");
        win = new BrowserWindow({ show: false });
        const htmlPath = paths.join(__dirname, "addStory_flow.html");
        win.loadFile(htmlPath);
        win.webContents.on("did-finish-load", () => {
            setTimeout(() => {
                win.webContents
                    .printToPDF({
                        printBackground: true,
                        landscape: false,
                        pageSize: "A4",
                        margins: { top: 0, bottom: 0, left: 0, right: 0 },
                    })
                    .then((data) => {
                        const pdfPath = paths.join(__dirname, "addStory_flow.pdf");
                        fs.writeFile(pdfPath, data, (error) => {
                            if (error) {
                                console.error("Failed to write PDF:", error);
                                process.exit(1);
                            }
                            console.log(`Successfully created PDF: ${pdfPath}`);
                            app.quit();
                        });
                    })
                    .catch((error) => {
                        console.error("Failed to generate PDF:", error);
                        app.quit();
                    });
            }, 3000);
        });
        return;
    }

    win = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1024,
        minHeight: 700,
        show: false,
        backgroundColor: "#f1f5f9",
        title: "Workmob Admin Studio",
        webPreferences: {
            nodeIntegration: true,
            webSecurity: true,
            enableRemoteModule: true,
            contextIsolation: false,
        },
    });

    remoteMain.enable(win.webContents);

    win.loadURL(
        url.format({
            pathname: paths.join(__dirname, "Stories.html"),
            protocol: "file",
            slashes: true,
        })
    );

    session.defaultSession.clearCache();
    session.defaultSession.clearStorageData();

    childLogin = new BrowserWindow({
        width: 440,
        height: 380,
        frame: false,
        resizable: false,
        center: true,
        backgroundColor: "#ffffff",
        title: "Workmob Admin Login",
        webPreferences: {
            nodeIntegration: true,
            enableRemoteModule: true,
            allowRunningInsecureContent: true,
            contextIsolation: false,
        },
    });

    childLogin.loadURL(
        url.format({
            pathname: paths.join(__dirname, "pages/login.html"),
            protocol: "file",
        })
    );

    remoteMain.enable(childLogin.webContents);

    ipcMain.on("entry-accepted", (event, arg) => {
        if (arg == "ping") {
            win.maximize();
            win.show();
            childLogin.hide();
        } else if (arg == "ExitApp") {
            app.quit();
        }
    });

    ipcMain.on("input-broadcast", (evt, data) => {
        child = new BrowserWindow({
            modal: true,
            parent: win,
            title: "Story Details - Workmob",
            width: 1300,
            height: 850,
            minWidth: 1024,
            minHeight: 700,
            backgroundColor: "#f1f5f9",
            autoHideMenuBar: true,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
                enableRemoteModule: true,
                devTools: true,
            },
        });
        remoteMain.enable(child.webContents);

        let slugSent = false;
        function sendReceiveSlug() {
            if (slugSent || child.isDestroyed()) {
                return;
            }
            slugSent = true;
            ipcMain.removeListener("addStory-renderer-ready", onRendererReady);
            child.webContents.send("receiveSlug", data);
        }

        function onRendererReady(e) {
            if (child.isDestroyed() || e.sender !== child.webContents) {
                return;
            }
            sendReceiveSlug();
        }

        ipcMain.on("addStory-renderer-ready", onRendererReady);
        child.once("closed", () => {
            ipcMain.removeListener("addStory-renderer-ready", onRendererReady);
        });

        child.once("ready-to-show", () => {
            child.webContents.toggleDevTools();
        });

        // Fire after document + scripts load so ipcRenderer.on("receiveSlug") is registered.
        child.webContents.once("did-finish-load", () => {
            setTimeout(sendReceiveSlug, 120);
        });

        child.loadFile(data.pagename);
    });

    ipcMain.on("closeChild", () => {
        if (child && !child.isDestroyed()) {
            child.close();
        }
    });

    buildAppMenu();

    globalShortcut.register("F12", function () {
        if (win && !win.isDestroyed()) {
            win.webContents.toggleDevTools();
        }
    });

    globalShortcut.register("Alt+1", function () {
        if (win && !win.isDestroyed()) {
            win.show();
        }
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        if (win && !win.isDestroyed()) {
            win.show();
        }
    }
});

app.commandLine.appendSwitch("disable-http-cache");
