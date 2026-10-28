const { app, BrowserWindow } = require('electron');
const path = require('path');

app.whenReady().then(async () => {
    try {
        require('@electron/remote/main').initialize();
    } catch(e) {}

    global.sharedObj = { pathName: __dirname, currentStory: 'default' };

    const win = new BrowserWindow({
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

    win.webContents.on('console-message', (event, level, message, line, sourceId) => {
        console.log('[BROWSER CONSOLE]', message);
    });

    await win.loadFile(path.join(__dirname, '../addStory.html'));

    // Simulate receiveSlug
    win.webContents.send('receiveSlug', {
        category: 'default',
        slug: 'rajat-sood-founder-atoz-insurance-services-provider'
    });

    setTimeout(async () => {
        try {
            const result = await win.webContents.executeJavaScript(`
                (() => {
                    const langVal = $('#ddlLanguage').val();
                    const enCount = $('#divExtraField .fullstory').length;
                    const hiCount = $('#divExtraFieldHindi .fullstory').length;
                    const enVisible = $('#divExtraField').is(':visible');
                    const hiVisible = $('#divExtraFieldHindi').is(':visible');
                    const enFirstText = $('#divExtraField .customeEditor:first').text();
                    const hiFirstText = $('#divExtraFieldHindi .customeEditor:first').text();

                    // Now simulate user changing dropdown to Hindi
                    $('#ddlLanguage').val('Hindi').trigger('change');
                    const afterEnVisible = $('#divExtraField').is(':visible');
                    const afterHiVisible = $('#divExtraFieldHindi').is(':visible');

                    return {
                        langVal,
                        enCount,
                        hiCount,
                        enVisible,
                        hiVisible,
                        enFirstText: enFirstText.substring(0, 100),
                        hiFirstText: hiFirstText.substring(0, 100),
                        afterEnVisible,
                        afterHiVisible
                    };
                })()
            `);
            console.log('TEST RESULT:', JSON.stringify(result, null, 2));
        } catch (err) {
            console.error('Error executing in window:', err);
        }
        app.quit();
    }, 7000);
});
