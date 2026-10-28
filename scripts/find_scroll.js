const { app, BrowserWindow } = require('electron');
const path = require('path');
app.whenReady().then(async () => {
    try { require('@electron/remote/main').initialize(); } catch(e) {}
    global.sharedObj = { pathName: path.join(__dirname, '..'), currentStory: 'default' };
    const win = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: true, contextIsolation: false, enableRemoteModule: true } });
    try { require('@electron/remote/main').enable(win.webContents); } catch(e) {}
    await win.loadFile(path.join(__dirname, '../addStory.html'));
    win.webContents.send('receiveSlug', { category: 'default', slug: 'rajat-sood-founder-atoz-insurance-services-provider' });
    setTimeout(async () => {
        const info = await win.webContents.executeJavaScript(`
            Array.from(document.querySelectorAll('*'))
                .filter(el => el.scrollHeight > el.clientHeight && el.clientHeight > 50)
                .map(el => el.tagName + '#' + el.id + '.' + el.className + ' (' + el.scrollHeight + '/' + el.clientHeight + ')')
        `);
        console.log('Scrollable elements:', info);
        app.quit();
    }, 4000);
});
