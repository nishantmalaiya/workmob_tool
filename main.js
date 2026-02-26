const {
    app,
    ipcMain,
    BrowserWindow,
    session,
    dialog,
    Menu,
    MenuItem,
    electron,
    globalShortcut,
    shell,
    path,
    buffer,
    select2,
} = require("electron");
const remoteMain = require('@electron/remote/main');
remoteMain.initialize();
//let common = require('./js/config');
//const remoteMain = require('@electron/remote/main');
//remoteMain.initialize();
const url = require("url");
const paths = require("path");
let win;
global.sharedObj = {
    pathName: "C:\\WM_Json",
    currentStory: "default",
    S3filepath: "stories_workmob/confjson/", //"stories_workmob/confjson/", //config
    // S3filepath: "stories_workmob/config/", //"stories_workmob/confjson/", //config
};

let child;
let childLogin;

app.on("ready", function () {
    if (process.argv.includes('--generate-pdf')) {
        console.log('Generating PDF...');
        win = new BrowserWindow({ show: false });
        const htmlPath = paths.join(__dirname, 'addStory_flow.html');
        win.loadFile(htmlPath);
        win.webContents.on('did-finish-load', () => {
            setTimeout(() => {
                win.webContents.printToPDF({
                    printBackground: true,
                    landscape: false,
                    pageSize: 'A4',
                    margins: { top: 0, bottom: 0, left: 0, right: 0 }
                }).then(data => {
                    const pdfPath = paths.join(__dirname, 'addStory_flow.pdf');
                    fs.writeFile(pdfPath, data, (error) => {
                        if (error) {
                            console.error('Failed to write PDF:', error);
                            process.exit(1);
                        }
                        console.log(`Successfully created PDF: ${pdfPath}`);
                        app.quit();
                    });
                }).catch(error => {
                    console.error('Failed to generate PDF:', error);
                    app.quit();
                });
            }, 3000);
        });
        return;
    }
    //mona
    // if(global.sharedObj.S3filepath=="stories_workmob/config/")
    // {
    //     dialog.showErrorBox("Caution","Connected to Live json");
    // }

    win = new BrowserWindow({
        width: 800,
        height: 600,
        show: false,
        webPreferences: {
            nodeIntegration: true,
            webSecurity: true,
            enableRemoteModule: true,
            contextIsolation: false,
        },
    });

    remoteMain.enable(win.webContents);

    // win.maximize();
    // win.loadFile('Stories.html');

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
        parent: win,
        width: 400,
        height: 350,
        frame: false,
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

    childLogin.openDevTools();
    ipcMain.on("entry-accepted", (event, arg) => {
        if (arg == "ping") {
            win.maximize();
            win.show();
            childLogin.hide();
        }
        else if (arg == "ExitApp") {
            app.quit();
        }
    });
    ipcMain.on("input-broadcast", (evt, data) => {
        child = new BrowserWindow({
            modal: true,
            parent: win,
            width: 1200,
            height: 800,
            autoHideMenuBar: true,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
            },
        });
        remoteMain.enable(child.webContents);
        child.once("ready-to-show", () => {
            child.webContents.toggleDevTools();
            setTimeout(function () {
                child.webContents.send("receiveSlug", data);
            }, 500);
        });
        child.loadFile(data.pagename);
    });
    ipcMain.on("closeChild", (evt, data) => {
        child.close();
    });

    const template = [
        {
            label: "STORIES",
            click: function () {
                ShowPage("Stories.html");
            },
        },
        {
            label: "CATEGORIES",
            click: function () {
                ShowPage("categories.html");
            },
        },
        {
            label: "BLOG HOME",
            click: function () {
                ShowPage("bloghome.html");
            },
        },
        {
            label: " STORIES – TOP",
            click: function () {
                ShowPage("stories_top.html");
            },
        },
        {
            label: "TRENDING",
            click: function () {
                ShowPage("trending.html");
            },
        },
        {
            label: "MOBILE HOME",
            click: function () {
                ShowPage("mobile_home_screen.html");
            },
        },
        {
            label: "GYAN",
            click: function () {
                ShowPage("pages/gyan.html");
            },
        },
        {
            label: "HOPE",
            click: function () {
                ShowPage("pages/hope.html");
            },
        },
        {
            label: "NAMASTE",
            click: function () {
                ShowPage("pages/namaste.html");
            },
        },
        {
            label: "PROMOTION",
            click: function () {
                ShowPage("pages/Promotion.html");
            },
        },
        {
            label: "VOCAL FOR LOCAL",
            click: function () {
                ShowPage("pages/Vocal4Local.html");
            },
        },
        {
            label: "ADVANCE SEARCH",
            click: function () {
                ShowPage("pages/AdvanceSearch.html");
            },
        },
        {
            label: "UPDATE STORY HEADING",
            click: function () {
                ShowPage("pages/UpdateHeading.html");
            },
        },
        {
            label: "SETTINGS",
            submenu: [
                {
                    label: "CONFIG",
                    click: function () {
                        ShowPage("UpdateConfig.html");
                    },
                },
                {
                    label: "CATEGORY MASTER",
                    click: function () {
                        ShowPage("category_master.html");
                    },
                },
                {
                    label: "SUB-CATEGORY MASTER",
                    click: function () {
                        ShowPage("sub-category_master.html");
                    },
                },
                {
                    label: "USERS",
                    click: function () {
                        ShowPage("pages/Instructor.html");
                    }
                },
                {
                    label: "LOCATION",
                    click: function () {
                        ShowPage("pages/location.html");
                    }
                },
                {
                    label: "ORGANISATION",
                    click: function () {
                        ShowPage("pages/Organisation.html");
                    }
                },
            ]
        },
        {
            label: "SWITCH",
            submenu: [
                {
                    label: "Default",
                    click: () => {
                        global.sharedObj.currentStory = "default";
                        win.reload();
                    },
                },
                {
                    label: "Audio",
                    click: () => {
                        global.sharedObj.currentStory = "audio";
                        win.reload();
                    },
                },
                {
                    label: "Gyan",
                    click: () => {
                        global.sharedObj.currentStory = "gyan";
                        win.reload();
                    },
                },
                {
                    label: "Hope",
                    click: () => {
                        global.sharedObj.currentStory = "hope";
                        win.reload();
                    },
                },
                {
                    label: "Namaste",
                    click: () => {
                        global.sharedObj.currentStory = "namaste";
                        win.reload();
                    },
                },
                {
                    label: "Promotion",
                    click: () => {
                        global.sharedObj.currentStory = "promotion";
                        win.reload();
                    },
                },
                {
                    label: "Product",
                    click: () => {
                        global.sharedObj.currentStory = "product";
                        win.reload();
                    },
                }

            ],
        },
        {
            label: "PRODUCT OWNER",
            click: function () {
                ShowPage("pages/productowner.html");
            },
        },
        {
            label: "TOP PRODUCT",
            click: function () {
                ShowPage("pages/topproduct.html");
            },
        }

        , {
            label: "HELP",
            submenu: [
                {
                    label: "Wrokmob",
                    click: function () {
                        shell.openExternal("http://workmob.com");
                    },
                    accelerator: "CmdOrCtrl + Shift + H",
                },
                {
                    label: "Toggle Dev Tools",
                    accelerator: "F12",
                    click: () => {
                        win.webContents.toggleDevTools();
                    },
                },
                {
                    label: "Home",
                    click: function () {
                        ShowPage("Index.html");
                    },
                },
                {
                    label: "Utility",
                    click: function () {
                        ShowPage("Utility.html");
                    },
                },
                {
                    role: "window",
                    submenu: [{ role: "minimize" }, { role: "close" }],
                },
            ],
        }
    ];
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);

    globalShortcut.register("F12", function () {
        win.webContents.toggleDevTools();
    });

    globalShortcut.register("Alt+1", function () {
        win.show();
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

function ShowPage(pageName) {
    win.loadFile(pageName);
}
app.commandLine.appendSwitch("disable-http-cache");
