const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

app.whenReady().then(async () => {
    let failures = [];
    function assert(condition, message) {
        if (!condition) {
            console.error('FAIL:', message);
            failures.push(message);
        } else {
            console.log('PASS:', message);
        }
    }

    try {
        require('@electron/remote/main').initialize();
    } catch(e) {}

    global.sharedObj = { pathName: path.join(__dirname, '..'), currentStory: 'default' };

    console.log('====================================');
    console.log('--- TEST SUITE 1: Window Properties & DevTools ---');
    const win1 = new BrowserWindow({
        width: 1200,
        height: 900,
        show: false,
        webPreferences: { nodeIntegration: true, contextIsolation: false, enableRemoteModule: true }
    });
    try { require('@electron/remote/main').enable(win1.webContents); } catch(e) {}

    // Wait for addStory-renderer-ready before sending slug
    const pReady1 = new Promise(resolve => {
        ipcMain.once('addStory-renderer-ready', (e) => {
            if (e.sender === win1.webContents) resolve();
        });
    });

    await win1.loadFile(path.resolve(__dirname, '../addStory.html'));
    await pReady1;

    const [minW, minH] = win1.getMinimumSize();
    assert(minW <= 512, `Window minWidth is ${minW} (expected <= 512)`);
    assert(!win1.webContents.isDevToolsOpened(), 'DevTools is closed by default');

    console.log('--- TEST SUITE 2: Add Story Mode (slug = "") ---');
    win1.webContents.send('receiveSlug', { category: 'default', slug: '' });

    // Wait 3 seconds for Add Story DOM initialization
    await new Promise(r => setTimeout(r, 3000));

    const test2Result = await win1.webContents.executeJavaScript(`
        (() => {
            const results = {};
            results.hname = $('#hname').text();
            results.saveBtnText = $('#btnSave').text().trim();
            results.deleteHidden = !$('#btndelete').is(':visible');
            results.initialLang = $('#ddlLanguage').val();
            results.enVisible = $('#divExtraField').is(':visible');
            results.hiVisible = $('#divExtraFieldHindi').is(':visible');

            // 1. Add block in English
            $('#btnHeading').click();
            results.enCountAfterAdd = $('#divExtraField .fullstory').length;
            results.hiCountAfterAdd = $('#divExtraFieldHindi .fullstory').length;
            $('#divExtraField .customeEditor:first').text('Test English Heading Title');

            // 2. Switch to Hindi
            $('#ddlLanguage').val('Hindi').trigger('change');
            results.enVisibleAfterSwitchHi = $('#divExtraField').is(':visible');
            results.hiVisibleAfterSwitchHi = $('#divExtraFieldHindi').is(':visible');

            // 3. Add block in Hindi
            $('#btnParagraph').click();
            results.enCountAfterHiAdd = $('#divExtraField .fullstory').length;
            results.hiCountAfterHiAdd = $('#divExtraFieldHindi .fullstory').length;
            $('#divExtraFieldHindi .customeEditor:first').text('परीक्षण हिंदी पैराग्राफ');

            // 4. Switch back to English
            $('#ddlLanguage').val('English').trigger('change');
            results.enVisibleAfterSwitchEn = $('#divExtraField').is(':visible');
            results.hiVisibleAfterSwitchEn = $('#divExtraFieldHindi').is(':visible');

            // 5. Test GetFullStory serialization
            results.enFullStory = window.GetFullStory ? window.GetFullStory($('#divExtraField')) : '';
            results.hiFullStory = window.GetFullStory ? window.GetFullStory($('#divExtraFieldHindi')) : '';

            // 6. Test Delete button on English block
            $('#divExtraField .btnFullStory:contains("Delete")').click();
            results.enCountAfterDelete = $('#divExtraField .fullstory').length;

            return results;
        })()
    `);

    assert(test2Result.hname.includes('Add Story'), `Header shows "Add Story" in new story mode (got "${test2Result.hname}")`);
    assert(test2Result.saveBtnText.includes('Save Story'), `Save button text is "Save Story" (got "${test2Result.saveBtnText}")`);
    assert(test2Result.deleteHidden, 'Delete button is hidden for new story');
    assert(test2Result.initialLang === 'English', 'Default language dropdown is English');
    assert(test2Result.enVisible && !test2Result.hiVisible, 'Initially English container visible, Hindi container hidden');
    assert(test2Result.enCountAfterAdd === 1 && test2Result.hiCountAfterAdd === 0, 'Added Heading block routed to English container');
    assert(!test2Result.enVisibleAfterSwitchHi && test2Result.hiVisibleAfterSwitchHi, 'Switched to Hindi: English hidden, Hindi shown');
    assert(test2Result.enCountAfterHiAdd === 1 && test2Result.hiCountAfterHiAdd === 1, 'Added Paragraph block routed to Hindi container');
    assert(test2Result.enVisibleAfterSwitchEn && !test2Result.hiVisibleAfterSwitchEn, 'Switched back to English: English shown, Hindi hidden');
    assert(test2Result.enFullStory.includes('<h3>') && test2Result.enFullStory.includes('Test English Heading Title'), 'GetFullStory serialized English heading correctly');
    assert(test2Result.hiFullStory.includes('<p>') && test2Result.hiFullStory.includes('परीक्षण हिंदी पैराग्राफ'), 'GetFullStory serialized Hindi paragraph correctly');
    assert(test2Result.enCountAfterDelete === 0, 'Delete button successfully removed the story block');

    win1.destroy();

    console.log('--- TEST SUITE 3: Update Story Mode (Existing Story) ---');
    const win2 = new BrowserWindow({
        width: 1200,
        height: 900,
        show: false,
        webPreferences: { nodeIntegration: true, contextIsolation: false, enableRemoteModule: true }
    });
    try { require('@electron/remote/main').enable(win2.webContents); } catch(e) {}

    const pReady2 = new Promise(resolve => {
        ipcMain.once('addStory-renderer-ready', (e) => {
            if (e.sender === win2.webContents) resolve();
        });
    });

    await win2.loadFile(path.resolve(__dirname, '../addStory.html'));
    await pReady2;

    win2.webContents.send('receiveSlug', {
        category: 'default',
        slug: 'rajat-sood-founder-atoz-insurance-services-provider'
    });

    // Wait 7 seconds for API fetch and rendering
    await new Promise(r => setTimeout(r, 7000));

    const test3Result = await win2.webContents.executeJavaScript(`
        (() => {
            const results = {};
            results.hname = $('#hname').text();
            results.saveBtnText = $('#btnSave').text().trim();
            results.deleteVisible = $('#btndelete').is(':visible');
            results.slugVal = $('#divJson [name="slug"]').val();
            results.storyHeadingVal = $('#divJson [name="storyHeading"]').val();
            results.orgVal = $('#divJson #ddl_organisation').val();
            results.enCount = $('#divExtraField .fullstory').length;
            results.hiCount = $('#divExtraFieldHindi .fullstory').length;
            results.initialLang = $('#ddlLanguage').val();
            results.enVisible = $('#divExtraField').is(':visible');
            results.hiVisible = $('#divExtraFieldHindi').is(':visible');

            // Switch to Hindi
            $('#ddlLanguage').val('Hindi').trigger('change');
            results.enVisibleAfterHi = $('#divExtraField').is(':visible');
            results.hiVisibleAfterHi = $('#divExtraFieldHindi').is(':visible');

            // Switch to English
            $('#ddlLanguage').val('English').trigger('change');
            results.enVisibleAfterEn = $('#divExtraField').is(':visible');
            results.hiVisibleAfterEn = $('#divExtraFieldHindi').is(':visible');

            // Verify serialization of loaded story
            results.enSerialized = window.GetFullStory ? window.GetFullStory($('#divExtraField')).length : 0;
            results.hiSerialized = window.GetFullStory ? window.GetFullStory($('#divExtraFieldHindi')).length : 0;

            return results;
        })()
    `);

    assert(test3Result.hname.includes('Update Story'), `Header shows "Update Story" in edit mode (got "${test3Result.hname}")`);
    assert(test3Result.saveBtnText.includes('Update Story'), `Save button text is "Update Story" (got "${test3Result.saveBtnText}")`);
    assert(test3Result.deleteVisible, 'Delete button is visible for existing story');
    assert(test3Result.slugVal === 'rajat-sood-founder-atoz-insurance-services-provider', `Slug field populated correctly: ${test3Result.slugVal}`);
    assert(test3Result.storyHeadingVal && test3Result.storyHeadingVal.length > 5, `Story heading loaded: ${test3Result.storyHeadingVal}`);
    assert(test3Result.orgVal !== undefined && test3Result.orgVal !== null, `Organisation dropdown value: ${JSON.stringify(test3Result.orgVal)}`);
    assert(test3Result.enCount === 21, `English blocks loaded: ${test3Result.enCount} (expected 21)`);
    assert(test3Result.hiCount === 21, `Hindi blocks loaded: ${test3Result.hiCount} (expected 21)`);
    assert(!test3Result.enVisibleAfterHi && test3Result.hiVisibleAfterHi, 'Switching to Hindi shows Hindi blocks and hides English blocks');
    assert(test3Result.enVisibleAfterEn && !test3Result.hiVisibleAfterEn, 'Switching back to English shows English blocks and hides Hindi blocks');
    assert(test3Result.enSerialized > 500, `English story serialized length: ${test3Result.enSerialized}`);
    assert(test3Result.hiSerialized > 500, `Hindi story serialized length: ${test3Result.hiSerialized}`);

    win2.destroy();

    console.log('====================================');
    if (failures.length === 0) {
        console.log('ALL REGRESSION TESTS PASSED (0 failures)!');
    } else {
        console.error(`TOTAL FAILURES: ${failures.length}`);
        failures.forEach(f => console.error(' - ' + f));
    }
    console.log('====================================');

    app.quit();
});
