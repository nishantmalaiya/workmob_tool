const fs = require('fs');
const path = require('path');
// let pathName = path.join(__dirname, 'Files');
let pathName = "C:\\WM_Json";
var app = require('electron');
var remote = require('@electron/remote');
const dialog = remote.dialog;
var configJson = [];
let common = require('./Js/config');
let activePathS3 = common.getS3Path();

//if (fs.existsSync(path.join(__dirname, 'Files/config.json'))) {
let configEndpoint = activePathS3["config"] || "add-config";
if (!configEndpoint.startsWith("/")) configEndpoint = "/" + configEndpoint;

fetch(common.API_BASE_URL + configEndpoint)
    .then(response => response.json())
    .then(data => {
        // API returns { data: [ { ... } ], count: 1, ... }
        configJson = (data.data && Array.isArray(data.data)) ? data.data[0] : (data.data || data);
        
        if (configJson) {
            $('#txtstoriestop').val(configJson["storiestop"] || "");
            $('#txtbloghome').val(configJson["bloghome"] || "");
            $('#txtstoriestending').val(configJson["storiestending"] || "");
            $('#txtstoriesMobileHomeScreen').val(configJson["storiesMobileHomeScreen"] || "");
            $('#txtstoriesHope').val(configJson["storieshope"] || "");
            $('#txtstoriesGyan').val(configJson["storiesgyan"] || "");
            $('#txtstoriesNamaste').val(configJson["storiesnamaste"] || configJson["storiesNamaste"] || "");
            $('#txtstoriesPromotion').val(configJson["storiespromotion"] || "");
        }
    })
    .catch(err => console.error("Error loading config via API:", err));


$('#btnUpdateJson').on('click', async function () {
    var config_json= 
    {
        "storiestop":"0",
        "storiestending":"0",
        "storiesMobileHomeScreen":"0",
        "bloghome":"0",
        "storieshope":"0",
        "storiesgyan":"0",
        "storiesNamaste":"0",
        "storiesnamaste":"0",
        "storiespromotion":"0"
    }
    config_json["storiestop"] = $('#txtstoriestop').val();
    config_json["bloghome"] = $('#txtbloghome').val();
    config_json["storiestending"] = $('#txtstoriestending').val();
    config_json["storiesMobileHomeScreen"] = $('#txtstoriesMobileHomeScreen').val();
    config_json["storieshope"] = $('#txtstoriesHope').val();
    config_json["storiesgyan"] = $('#txtstoriesGyan').val();
    config_json["storiesnamaste"] = $('#txtstoriesNamaste').val();
    config_json["storiespromotion"] = $('#txtstoriesPromotion').val();
    $('body').toggleClass('loaded');
    const response = await fetch(common.API_BASE_URL + configEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config_json)
    });
    const meta = await response.json();
    $('body').toggleClass('loaded');
    const options = { title: '', message: 'config updated succssfully', detail: '' };
    try {
        dialog.showMessageBox(null, options);
    } catch (e) {
        console.log(e);
        dialog.showMessageBox(null, options);
    }
});
