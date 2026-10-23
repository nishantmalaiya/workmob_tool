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
const SWITCH_COLORS = {
    default: "#8178FF",
    audio: "#72BFFF",
    gyan: "#FFA6D2",
    hope: "#30334D",
    namaste: "#FF72B6",
    promotion: "#8178FF",
    product: "#72BFFF",
};

global.sharedObj = {
    pathName: "C:\\WM_Json",
    currentStory: "default",
    S3filepath: "stories_workmob/config/",
    themeColor: SWITCH_COLORS.default,
};

function applyThemeColorToWebContents(contents, color) {
    if (!contents || contents.isDestroyed()) return;
    const targetColor = color || global.sharedObj.themeColor || SWITCH_COLORS.default;
    const css = `
        body {
            background-color: ${targetColor} !important;
            transition: background-color 0.25s ease;
        }
    `;
    contents.insertCSS(css).catch(() => {});
    contents.executeJavaScript(`
        if (document.body) {
            document.body.style.setProperty('background-color', '${targetColor}', 'important');
        }
    `).catch(() => {});
}

function injectAppHeaderStrip(contents) {
    if (!contents || contents.isDestroyed()) return;

    let pkg = { name: "WorkmobStoryToolDyanomoDB", author: "Nishant Malaiya", version: "5.3.0" };
    try {
        pkg = require("./package.json");
    } catch (e) {}

    const toolName = pkg.productName || pkg.name || "WorkmobStoryToolDyanomoDB";
    const toolAuthor = pkg.author || "Nishant Malaiya";
    const buildVersion = pkg.version || "5.3.0";
    const activeProfile = (global.sharedObj && global.sharedObj.currentStory) ? global.sharedObj.currentStory : "default";

    const jsCode = `
        (function() {
            var existing = document.getElementById('workmob-top-ui-strip');
            if (existing) {
                var badge = existing.querySelector('#workmob-strip-profile-badge');
                if (badge) badge.textContent = '${activeProfile}'.toUpperCase();
                return;
            }

            var strip = document.createElement('div');
            strip.id = 'workmob-top-ui-strip';
            strip.innerHTML = \`
                <div style="display: flex; align-items: center; gap: 12px; min-width: 0;">
                    <div style="display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 13px; letter-spacing: 0.3px; color: #ffffff;">
                        <span class="glyphicon glyphicon-hdd" style="font-size: 14px; color: #93c5fd;"></span>
                        <span>${toolName}</span>
                    </div>
                    <span style="color: rgba(255,255,255,0.4);">|</span>
                    <div style="display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 500; color: #e2e8f0;">
                        <span class="glyphicon glyphicon-user" style="font-size: 11px; color: #bfdbfe;"></span>
                        <span>Author: <strong style="color: #ffffff;">${toolAuthor}</strong></span>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 10px; flex-shrink: 0;">
                    <div style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: #e2e8f0;">
                        <span class="glyphicon glyphicon-tags" style="font-size: 11px; color: #bfdbfe;"></span>
                        <span>Build Version:</span>
                        <span style="background: rgba(255, 255, 255, 0.22); color: #ffffff; padding: 2px 8px; border-radius: 12px; font-weight: 700; font-size: 11px; border: 1px solid rgba(255, 255, 255, 0.3);">v${buildVersion}</span>
                    </div>
                    <span style="color: rgba(255,255,255,0.4);">|</span>
                    <div style="display: flex; align-items: center; gap: 5px; font-size: 11px; color: #e2e8f0;">
                        <span>Switch:</span>
                        <span id="workmob-strip-profile-badge" style="background: #ffffff; color: #1e40af; padding: 2px 8px; border-radius: 10px; font-weight: 800; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px;">${activeProfile}</span>
                    </div>
                </div>
            \`;

            strip.style.cssText = \`
                position: sticky;
                top: 0;
                left: 0;
                right: 0;
                z-index: 999999;
                background: linear-gradient(90deg, #1e3a8a 0%, #1d4ed8 50%, #2563eb 100%);
                color: #ffffff;
                box-shadow: 0 2px 6px rgba(15, 23, 42, 0.25), 0 1px 2px rgba(37, 99, 235, 0.3);
                padding: 6px 20px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                flex-wrap: wrap;
                gap: 8px;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                margin: -20px -24px 14px -24px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.2);
            \`;

            if (document.body) {
                var computed = window.getComputedStyle(document.body);
                var padTop = parseInt(computed.paddingTop) || 0;
                var padLeft = parseInt(computed.paddingLeft) || 0;
                var padRight = parseInt(computed.paddingRight) || 0;
                if (padTop || padLeft || padRight) {
                    strip.style.margin = '-' + padTop + 'px -' + padRight + 'px 14px -' + padLeft + 'px';
                }
                document.body.insertBefore(strip, document.body.firstChild);
            }
        })();
    `;

    contents.executeJavaScript(jsCode).catch(() => {});
}

function switchProfile(profile, color) {
    const targetColor = color || SWITCH_COLORS[profile] || "#8178FF";
    global.sharedObj.currentStory = profile;
    global.sharedObj.themeColor = targetColor;
    buildAppMenu();
    if (win && !win.isDestroyed()) {
        win.setBackgroundColor(targetColor);
        applyThemeColorToWebContents(win.webContents, targetColor);
        injectAppHeaderStrip(win.webContents);
        win.reload();
    }
}

function setThemeColorOnly(color) {
    if (!color) return;
    global.sharedObj.themeColor = color;
    buildAppMenu();
    if (win && !win.isDestroyed()) {
        win.setBackgroundColor(color);
        applyThemeColorToWebContents(win.webContents, color);
    }
}

let child;
let childLogin;

function ShowPage(pageName) {
    if (win && !win.isDestroyed()) {
        win.loadFile(pageName);
    }
}

function buildAppMenu() {
    const activeProfile = global.sharedObj.currentStory || "default";
    const currentColor = global.sharedObj.themeColor || SWITCH_COLORS[activeProfile] || "#8178FF";

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
                        switchProfile("default", "#8178FF");
                    },
                },
                {
                    label: "Audio",
                    type: "radio",
                    checked: activeProfile === "audio",
                    click: () => {
                        switchProfile("audio", "#72BFFF");
                    },
                },
                {
                    label: "Gyan",
                    type: "radio",
                    checked: activeProfile === "gyan",
                    click: () => {
                        switchProfile("gyan", "#FFA6D2");
                    },
                },
                {
                    label: "Hope",
                    type: "radio",
                    checked: activeProfile === "hope",
                    click: () => {
                        switchProfile("hope", "#30334D");
                    },
                },
                {
                    label: "Namaste",
                    type: "radio",
                    checked: activeProfile === "namaste",
                    click: () => {
                        switchProfile("namaste", "#FF72B6");
                    },
                },
                {
                    label: "Promotion",
                    type: "radio",
                    checked: activeProfile === "promotion",
                    click: () => {
                        switchProfile("promotion", "#8178FF");
                    },
                },
                {
                    label: "Product",
                    type: "radio",
                    checked: activeProfile === "product",
                    click: () => {
                        switchProfile("product", "#72BFFF");
                    },
                },
                { type: "separator" },
                {
                    label: "Theme Background Colors",
                    submenu: [
                        {
                            label: "Lavender (#8178FF)",
                            type: "radio",
                            checked: currentColor === "#8178FF",
                            click: () => setThemeColorOnly("#8178FF"),
                        },
                        {
                            label: "Sky Blue (#72BFFF)",
                            type: "radio",
                            checked: currentColor === "#72BFFF",
                            click: () => setThemeColorOnly("#72BFFF"),
                        },
                        {
                            label: "Pastel Pink (#FFA6D2)",
                            type: "radio",
                            checked: currentColor === "#FFA6D2",
                            click: () => setThemeColorOnly("#FFA6D2"),
                        },
                        {
                            label: "Midnight Navy (#30334D)",
                            type: "radio",
                            checked: currentColor === "#30334D",
                            click: () => setThemeColorOnly("#30334D"),
                        },
                        {
                            label: "Rose Pink (#FF72B6)",
                            type: "radio",
                            checked: currentColor === "#FF72B6",
                            click: () => setThemeColorOnly("#FF72B6"),
                        },
                    ],
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
        backgroundColor: global.sharedObj.themeColor || "#8178FF",
        title: "Workmob Admin Studio",
        webPreferences: {
            nodeIntegration: true,
            webSecurity: true,
            enableRemoteModule: true,
            contextIsolation: false,
        },
    });

    remoteMain.enable(win.webContents);

    win.webContents.on("did-finish-load", () => {
        applyThemeColorToWebContents(win.webContents);
        injectAppHeaderStrip(win.webContents);
    });

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
            backgroundColor: global.sharedObj.themeColor || "#8178FF",
            autoHideMenuBar: true,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
                enableRemoteModule: true,
                devTools: true,
            },
        });
        remoteMain.enable(child.webContents);
        child.webContents.on("did-finish-load", () => {
            applyThemeColorToWebContents(child.webContents);
        });

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
