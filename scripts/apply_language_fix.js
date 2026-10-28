const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../addStory.js');
let code = fs.readFileSync(filePath, 'utf8');

// 1. Top level language switcher
const topLevelTarget = '$("#divExtraFieldHindi").hide();\r\nvar addStory = (async function () {';
const topLevelTargetLF = '$("#divExtraFieldHindi").hide();\nvar addStory = (async function () {';

const topLevelReplacement = `function switchStoryLanguage(lang) {
    var selectedLang = lang || $("#ddlLanguage").val() || "English";
    if (selectedLang === "Hindi") {
        $("#divExtraField").hide();
        $("#divExtraFieldHindi").show();
    } else {
        $("#divExtraField").show();
        $("#divExtraFieldHindi").hide();
    }
}
window.switchStoryLanguage = switchStoryLanguage;

$("#divExtraFieldHindi").hide();

$(document).on("change input", "#ddlLanguage", function () {
    switchStoryLanguage($(this).val());
});

var addStory = (async function () {`;

if (code.includes(topLevelTarget)) {
    code = code.replace(topLevelTarget, topLevelReplacement.replace(/\n/g, '\r\n'));
    console.log('Applied edit 1 (CRLF)');
} else if (code.includes(topLevelTargetLF)) {
    code = code.replace(topLevelTargetLF, topLevelReplacement);
    console.log('Applied edit 1 (LF)');
} else {
    console.error('Failed to find topLevelTarget');
}

// 2. ReadSlug story render
const renderTarget = `                    // Render stories
                    $("#ddlLanguage").val("English");
                    var fullstory = JSON_Obj["fullStory"];
                    var _html = $.parseHTML(fullstory);
                    RenderFullStoryElement(_html);

                    $("#ddlLanguage").val("Hindi");
                    fullstory = JSON_Obj["fullStory_hindi"];
                    _html = $.parseHTML(fullstory);
                    RenderFullStoryElement(_html);
                    $("#ddlLanguage").val("English");`;

const renderReplacement = `                    // Render stories cleanly into their respective containers
                    $("#divExtraField").empty();
                    $("#divExtraFieldHindi").empty();

                    var fullstory = JSON_Obj["fullStory"] || "";
                    if (fullstory) {
                        var _html = $.parseHTML(fullstory);
                        RenderFullStoryElement(_html, "divExtraField");
                    }

                    var fullstoryHindi = JSON_Obj["fullStory_hindi"] || "";
                    if (fullstoryHindi) {
                        var _htmlHindi = $.parseHTML(fullstoryHindi);
                        RenderFullStoryElement(_htmlHindi, "divExtraFieldHindi");
                    }

                    // Sync view with current language dropdown selection
                    var currentLang = $("#ddlLanguage").val() || "English";
                    switchStoryLanguage(currentLang);`;

const isCRLF = code.includes('\r\n');
const normalize = s => isCRLF ? s.replace(/\r?\n/g, '\r\n') : s.replace(/\r?\n/g, '\n');

if (code.includes(normalize(renderTarget))) {
    code = code.replace(normalize(renderTarget), normalize(renderReplacement));
    console.log('Applied edit 2 (ReadSlug)');
} else {
    console.error('Failed to find renderTarget');
}

// 3. RenderFullStoryElement signature and call to AddField
const elTarget = `    function RenderFullStoryElement(_html) {
        nodeNames = [];
        $.each(_html, function (i, el) {
            var txt = el.textContent ? $.trim(el.textContent.replace(/\\u00A0/g, ' ')) : "";
            switch (el.nodeName) {
                case "H3":
                    if (txt !== "") {
                        AddField("Heading", $(el).html());
                    }
                    break;
                case "DIV":
                case "P":
                    if (txt !== "") {
                        if ($(el).find("strong").length == 0) {
                            AddField("Paragraph", $(el).html());
                        } else {
                            AddField("Paragraph bold", $(el).html());
                        }
                    }
                    break;
                case "BLOCKQUOTE":
                    if (txt !== "") {
                        if ($(el).hasClass("green")) {
                            AddField("Quote green", $(el).html());
                        } else if ($(el).hasClass("darkGreen")) {
                            AddField("Quote dark green", $(el).html());
                        } else if ($(el).hasClass("lightGreen")) {
                            AddField("Quote light green", $(el).html());
                        } else {
                            AddField("Quote", $(el).html());
                        }
                    }
                    break;
                case "UL":
                    if (txt !== "") {
                        console.log(el.nodeName, el);
                        AddField("Bulleted list", $(el).html());
                    }
                    break;
                case "SPAN":
                    AddField("Image Url(Left)", $(el).find("img").attr("src"));
                    break;
                case "VIDEO":
                    AddField("Video", $(el).attr("src"));
                    break;
                case "IMG":
                    AddField("Image Url(Right)", $(el).attr("src"));
                    break;
                default:
                    console.log(el.nodeName, $(el).text());
                    break;
            }
        });
    }`;

const elReplacement = `    function RenderFullStoryElement(_html, targetDiv) {
        if (!_html) return;
        nodeNames = [];
        $.each(_html, function (i, el) {
            var txt = el.textContent ? $.trim(el.textContent.replace(/\\u00A0/g, ' ')) : "";
            switch (el.nodeName) {
                case "H3":
                    if (txt !== "") {
                        AddField("Heading", $(el).html(), targetDiv);
                    }
                    break;
                case "DIV":
                case "P":
                    if (txt !== "") {
                        if ($(el).find("strong").length == 0) {
                            AddField("Paragraph", $(el).html(), targetDiv);
                        } else {
                            AddField("Paragraph bold", $(el).html(), targetDiv);
                        }
                    }
                    break;
                case "BLOCKQUOTE":
                    if (txt !== "") {
                        if ($(el).hasClass("green")) {
                            AddField("Quote green", $(el).html(), targetDiv);
                        } else if ($(el).hasClass("darkGreen")) {
                            AddField("Quote dark green", $(el).html(), targetDiv);
                        } else if ($(el).hasClass("lightGreen")) {
                            AddField("Quote light green", $(el).html(), targetDiv);
                        } else {
                            AddField("Quote", $(el).html(), targetDiv);
                        }
                    }
                    break;
                case "UL":
                    if (txt !== "") {
                        AddField("Bulleted list", $(el).html(), targetDiv);
                    }
                    break;
                case "SPAN":
                    AddField("Image Url(Left)", $(el).find("img").attr("src"), targetDiv);
                    break;
                case "VIDEO":
                    AddField("Video", $(el).attr("src"), targetDiv);
                    break;
                case "IMG":
                    AddField("Image Url(Right)", $(el).attr("src"), targetDiv);
                    break;
                default:
                    break;
            }
        });
    }`;

if (code.includes(normalize(elTarget))) {
    code = code.replace(normalize(elTarget), normalize(elReplacement));
    console.log('Applied edit 3 (RenderFullStoryElement)');
} else {
    console.error('Failed to find elTarget');
}

// 4. AddField signature and divName selection
const addTarget = `    function AddField(type, text) {`;
const addReplacement = `    function AddField(type, text, targetDiv) {`;
if (code.includes(normalize(addTarget))) {
    code = code.replace(normalize(addTarget), normalize(addReplacement));
    console.log('Applied edit 4a (AddField signature)');
} else {
    console.error('Failed to find addTarget');
}

const divNameTarget = `        var divName = "";
        if ($("#ddlLanguage").val() == "English") {
            divName = "divExtraField";
        } else {
            divName = "divExtraFieldHindi";
        }

        $("#" + divName + "").append(element.join(" "));
        var cols = $("#" + divName + " .column");
        [].forEach.call(cols, addDnDHandlers);
        setTimeout(function () {
            var $newEditor = $("#" + divName + " .customeEditor:last");
            if ($newEditor.length > 0) {
                var el = $newEditor[0];
                el.scrollIntoView({ behavior: "smooth", block: "nearest" });
                el.focus();
                try {
                    var range = document.createRange();
                    range.selectNodeContents(el);
                    range.collapse(false);
                    var sel = window.getSelection();
                    sel.removeAllRanges();
                    sel.addRange(range);
                } catch (e) {
                    console.log("Error positioning cursor:", e);
                }
            }
        }, 50);`;

const divNameReplacement = `        var divName = targetDiv;
        if (!divName) {
            divName = ($("#ddlLanguage").val() == "Hindi") ? "divExtraFieldHindi" : "divExtraField";
        }

        $("#" + divName).append(element.join(" "));
        var cols = $("#" + divName + " .column");
        [].forEach.call(cols, addDnDHandlers);
        if (!targetDiv) {
            setTimeout(function () {
                var $newEditor = $("#" + divName + " .customeEditor:last");
                if ($newEditor.length > 0) {
                    var el = $newEditor[0];
                    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
                    el.focus();
                    try {
                        var range = document.createRange();
                        range.selectNodeContents(el);
                        range.collapse(false);
                        var sel = window.getSelection();
                        sel.removeAllRanges();
                        sel.addRange(range);
                    } catch (e) {
                        console.log("Error positioning cursor:", e);
                    }
                }
            }, 50);
        }`;

if (code.includes(normalize(divNameTarget))) {
    code = code.replace(normalize(divNameTarget), normalize(divNameReplacement));
    console.log('Applied edit 4b (AddField targetDiv)');
} else {
    console.error('Failed to find divNameTarget');
}

// 5. Change handler at line 2510
const changeTarget = `    $("#ddlLanguage").on("change", function () {
        if ($(this).val() == "English") {
            $("#divExtraField").show();
            $("#divExtraFieldHindi").hide();
        } else {
            $("#divExtraField").hide();
            $("#divExtraFieldHindi").show();
        }
    });`;

const changeReplacement = `    $("#ddlLanguage").on("change input", function () {
        switchStoryLanguage($(this).val());
    });`;

if (code.includes(normalize(changeTarget))) {
    code = code.replace(normalize(changeTarget), normalize(changeReplacement));
    console.log('Applied edit 5 (ddlLanguage listener)');
} else {
    console.error('Failed to find changeTarget');
}

fs.writeFileSync(filePath, code, 'utf8');
console.log('Successfully updated addStory.js!');
