const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
    try {
        require('@electron/remote/main').initialize();
    } catch(e) {}

    global.sharedObj = { pathName: path.join(__dirname, '..'), currentStory: 'default' };

    const win = new BrowserWindow({
        width: 1200,
        height: 900,
        show: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        }
    });

    try {
        require('@electron/remote/main').enable(win.webContents);
    } catch(e) {}

    win.webContents.on('console-message', (event, level, message) => {
        console.log('[BROWSER CONSOLE]', message);
    });

    await win.loadFile(path.join(__dirname, '../addStory.html'));

    win.webContents.send('receiveSlug', {
        category: 'default',
        slug: 'rajat-sood-founder-atoz-insurance-services-provider'
    });

    // Wait for story to load
    setTimeout(async () => {
        // Scroll to toolbar
        await win.webContents.executeJavaScript(`
            document.documentElement.scrollTop = 3200;
        `);
        await new Promise(r => setTimeout(r, 200));

        // Screenshot 1: English (initial)
        const img1 = await win.webContents.capturePage();
        fs.writeFileSync(path.join(__dirname, 'screenshot_english.png'), img1.toPNG());
        console.log('Saved screenshot_english.png');

        // Now change dropdown to Hindi using native DOM event
        await win.webContents.executeJavaScript(`
            const select = document.getElementById('ddlLanguage');
            select.value = 'Hindi';
            select.dispatchEvent(new Event('change', { bubbles: true }));
        `);

        setTimeout(async () => {
            const img2 = await win.webContents.capturePage();
            fs.writeFileSync(path.join(__dirname, 'screenshot_hindi.png'), img2.toPNG());
            console.log('Saved screenshot_hindi.png');

            app.quit();
        }, 1000);
    }, 7000);
});
