var remote = require('@electron/remote');
// const { app } = require("electron");
// app.commandLine.appendSwitch ("disable-http-cache");
// const fs = require('fs');
// const path = require('path');
// const { setInterval, clearInterval } = require('timers');
const ipcRenderer = require('electron').ipcRenderer;
var pathName = remote.getGlobal('sharedObj').pathName;
const dialog = remote.dialog;
let common = require('../js/config');
let activePathS3 = common.getS3Path();
var JSON_FileName = null;
var JSON_FileSlug = null;
var storyAlsoOn = [];
storyAlsoOn.push({ "chkbox": "storiestop", "file": activePathS3["stories-top"], "isExist": false, "index": "-1", "total": "0", "label": "Stories Top", "CanAdd": false });
storyAlsoOn.push({ "chkbox": "storiestending", "file": activePathS3["trending"], "isExist": false, "index": "-1", "total": "0", "label": "Trending", "CanAdd": false });
storyAlsoOn.push({ "chkbox": "storiesMobileHomeScreen", "file": activePathS3["mobile-home"], "isExist": false, "index": "-1", "total": "0", "label": "Mobile Home Screen", "CanAdd": false });
storyAlsoOn.push({ "chkbox": "bloghome", "file": activePathS3["blog-home"], "isExist": false, "index": "-1", "total": "0", "label": "Blog Home", "CanAdd": false });
var JSON_Obj = null;
let configJson = null;
let storiestopJson = null;
let storiestrending = null;
let storiesMobileHomeScreenJson = null;
let bloghomeJson = null;
let MasterJson = null;

GetCategoryList();

$(async () => {
    let rawdataConfing = await readS3BucketAsync(activePathS3["config"], "");
    configJson = JSON.parse(rawdataConfing.data);
    await CheckSlugStory();


    // let RawMasterJson = await readS3BucketAsync(activePathS3["MasterIndex"], "");
    // if (RawMasterJson.err) {
    //     return console.log(RawMasterJson.err);
    // }
    // else {
    //     MasterJson = JSON.parse(RawMasterJson.data);
    //     BindAllCity();
    // }

    const url = "https://r5dojmizdd.execute-api.ap-south-1.amazonaws.com/prod/stories?limit=100";
    try {
        let response = await fetch(url);
        let data = await response.json();
        MasterJson = data.stories;
        BindAllCity();
    } catch (e) {
        console.log(e);
    }
});

function GetCategoryList() {
    // readS3Bucket(activePathS3.category, function (json) {
    const url = "https://r5dojmizdd.execute-api.ap-south-1.amazonaws.com/prod/categories";
    fetch(url)
        .then(response => response.json())
        .then(data => {
            var element = [];
            element.push("<option value=\"\">select</option>");
            var JSON_ObjCategory = data.categories; // JSON.parse(json.data);
            for (let index = 0; index < JSON_ObjCategory.length; index++) {
                var _category = JSON_ObjCategory[index];
                element.push("<option value=\"" + _category.category + "\">" + _category.title + "</option>");
            }
            $('#ddlCategory').html(element.join(' '));
            var $select = $("#ddlCategory").selectize({
                sortField: 'text',
                maxOptions: 100000,
                placeholder: "Select Category"
            });
            var selectize = $select[0].selectize;
            selectize.setValue('');
        })
        .catch(err => {
            console.log(err);
        });
    //     if (json.err) {
    //         return console.log(json.err);
    //     }
    //     var element = [];
    //     element.push("<option value=\"\">select</option>");
    //     var JSON_ObjCategory = JSON.parse(json.data);
    //     for (let index = 0; index < JSON_ObjCategory.length; index++) {
    //         var _category = JSON_ObjCategory[index];
    //         element.push("<option value=\"" + _category.category + "\">" + _category.title + "</option>");
    //     }
    //     $('#ddlCategory').html(element.join(' '));
    //     var $select = $("#ddlCategory").selectize({
    //         sortField: 'text',
    //         maxOptions:100000,
    //         placeholder:"Select Category"
    //     });
    //     var selectize = $select[0].selectize;
    //     selectize.setValue('');
    // });
}

$('#ddlCategory').on('change', function () {
    if ($.trim($(this).val()) != "") {
        $('#btnUpdateStory').attr('disabled', false);
        $('#btnRemoveSelected').attr('disabled', false);
        $('#btnRemoveAll').attr('disabled', false);
        JSON_FileSlug = activePathS3["category-index"] + $(this).val() + ".json";
        JSON_FileName = $("#" + this.id + " option:selected").text();
        $('body').toggleClass('loaded');
        try {
            // readS3Bucket(activePathS3["category-index"] + $(this).val() + ".json", function (json) {

            const url = "https://r5dojmizdd.execute-api.ap-south-1.amazonaws.com/prod/categories/" + $(this).val();
            fetch(url)
                .then(response => response.json())
                .then(data => {
                    $('body').toggleClass('loaded');
                    // if (json.err) {
                    //     $('#ddlCity').html('');
                    //     $('#divStory').html('');
                    //     return console.log(json.err);
                    // }
                    var cityList = [];
                    var city = [];
                    city.push("<option value=\"\">All</option>");
                    JSON_Obj = data.stories; //JSON.parse(json.data);
                    for (let index = 0; index < JSON_Obj.length; index++) {
                        var _story = JSON_Obj[index];
                        if (cityList.indexOf(_story.location) == -1) {
                            cityList.push(_story.location);
                            city.push("<option value=\"" + _story.location + "\">" + _story.location + "</option>");
                        }
                    }
                    $('#divStory').html(RenderStory(JSON_Obj).join(" "));

                    $('#ddlCity').html(city.join(" "));
                    var $select = $("#ddlCity").selectize({
                        sortField: 'text',
                        maxOptions: 100000,
                        placeholder: "Select City"
                    });
                    var selectize = $select[0].selectize;
                    selectize.setValue('');
                })
                .catch(err => {
                    $('body').toggleClass('loaded');
                    console.log(err);
                    $('#ddlCity').html('');
                    $('#divStory').html('');
                });

            //     $('body').toggleClass('loaded');
            //     if (json.err) {
            //         $('#ddlCity').html('');
            //         $('#divStory').html('');
            //         return console.log(json.err);
            //     }
            //     var cityList = [];
            //     var city = [];
            //     city.push("<option value=\"\">All</option>");
            //     JSON_Obj = JSON.parse(json.data);
            //     for (let index = 0; index < JSON_Obj.length; index++) {
            //         var _story = JSON_Obj[index];
            //         if (cityList.indexOf(_story.location) == -1) {
            //             cityList.push(_story.location);
            //             city.push("<option value=\"" + _story.location + "\">" + _story.location + "</option>");
            //         }
            //     }
            //     $('#divStory').html(RenderStory(JSON_Obj).join(" "));

            //     $('#ddlCity').html(city.join(" "));
            //     var $select = $("#ddlCity").selectize({
            //         sortField: 'text',
            //         maxOptions:100000,
            //         placeholder:"Select City"
            //     });
            //     var selectize = $select[0].selectize;
            //     selectize.setValue('');
            // });
        } catch (e) {
            $('body').toggleClass('loaded');
            console.log(e);
            $('#ddlCity').html('');
            $('#divStory').html('');
        }
    }
    else {
        BindAllCity();
    }
});

function RenderStory(JSON_ObjBrow) {
    var storyCard = [];
    for (let index = 0; index < JSON_ObjBrow.length; index++) {
        var _story = JSON_ObjBrow[index];
        storyCard.push("<div class=\"storycard col-md-12 row column\" draggable=\"true\" id=\"" + _story.slug + "\">");
        storyCard.push("<div class=\"col-md-1\">" + (parseInt(index) + 1) + " <input class=\"p-0\" type=\"checkbox\" name=\"chkSlug\" tabindex='" + 10000 + parseInt(index) + "' value=\"" + _story.slug + "\">&nbsp<img class=\"storythumb p-0\" src=\"" + _story.thumb + "\" alt=\"" + _story.name + "\"></div>");
        storyCard.push("<div class=\"col-md-7\"><h5>" + _story.storyHeading + "</h5>" + _story.industry + "<br>");
        storyCard.push(GenerateCheckbox(_story.slug));
        //storyCard.push('<a class="btn btn-outline-primary btn-sm" name="updateStory">Update Story</a>');
        storyCard.push('</div>');
        storyCard.push("<div class=\"col-md-1\">" + _story.location + "</div>");
        storyCard.push("<div class=\"col-md-1\"><a name=\"Detail\" href=\"#\" data-id=\"" + _story.slug + "\" >Detail</a></div>");
        if ($('#ddlCategory').val() == "") {
            storyCard.push("<div class=\"col-md-1\"></div>");
            storyCard.push("<div class=\"col-md-1\"></div>");
        }
        else {
            storyCard.push("<div class=\"col-md-1\"><a href=\"#\" onclick=\"deleteStory('" + _story.slug + "')\">Remove</a></div>");
            storyCard.push("<div class=\"col-md-1\"><input data-val='" + _story.slug + "' type=\"text\" class=\"form-control\" style=\"max-width:50px\" tabindex='" + parseInt(JSON_ObjBrow.length) + index + "' name=\"txtorder\" value=\"" + index + "\"></div>");
        }
        // storyCard.push("<div class=\"col-md-1\"><a href=\"#\" onclick=\"deleteStory('" + _story.slug + "')\">Remove</a></div>");
        // storyCard.push("<div class=\"col-md-1\"><input data-val='" + _story.slug + "' type=\"text\" class=\"form-control\" style=\"max-width:50px\" tabindex='" + parseInt(JSON_ObjBrow.length) + index + "' name=\"txtorder\" value=\"" + index + "\"></div>");
        storyCard.push("<hr class=\"storyHr\"></div>");
    }
    return storyCard;
}

$('#ddlCity').on('change', function () {
    ApplyFilter();
    if ($('#ddlCity').val() != null && $('#ddlCity').val() != "" && $('#ddlCity').val() != "All") { $('#btnUpdateStory').hide(); }
    else if ($('#txtName').val() != "") { $('#btnUpdateStory').hide(); }
    else if ($('#txtSlug').val() != "") { $('#btnUpdateStory').hide(); }
    else if ($('#isFullstoryAdded').is(":checked")) { $('#btnUpdateStory').hide(); }
    else { $('#btnUpdateStory').show(); }
});
$('#txtName').on('blur', function () {
    ApplyFilter();
    if ($('#ddlCity').val() != null && $('#ddlCity').val() != "" && $('#ddlCity').val() != "All") { $('#btnUpdateStory').hide(); }
    else if ($('#txtName').val() != "") { $('#btnUpdateStory').hide(); }
    else if ($('#txtSlug').val() != "") { $('#btnUpdateStory').hide(); }
    else if ($('#isFullstoryAdded').is(":checked")) { $('#btnUpdateStory').hide(); }
    else { $('#btnUpdateStory').show(); }
});
$('#txtSlug').on('blur', function () {
    if ($('#ddlCity').val() != null && $('#ddlCity').val() != "" && $('#ddlCity').val() != "All") { $('#btnUpdateStory').hide(); }
    else if ($('#txtName').val() != "") { $('#btnUpdateStory').hide(); }
    else if ($('#txtSlug').val() != "") { $('#btnUpdateStory').hide(); }
    else if ($('#isFullstoryAdded').is(":checked")) { $('#btnUpdateStory').hide(); }
});
$('#isFullstoryAdded').on('change', function () {
    ApplyFilter();
    if ($('#ddlCity').val() != null && $('#ddlCity').val() != "" && $('#ddlCity').val() != "All") { $('#btnUpdateStory').hide(); }
    else if ($('#txtName').val() != "") { $('#btnUpdateStory').hide(); }
    else if ($('#txtSlug').val() != "") { $('#btnUpdateStory').hide(); }
    else if ($('#isFullstoryAdded').is(":checked")) { $('#btnUpdateStory').hide(); }
    else { $('#btnUpdateStory').show(); }
    return false;
});

$('#btnUpdateStory').on('click', ({ currentTarget }) => {
    // console.log(currentTarget);
    ReOrderStory();
});

$('#btnRemoveSelected').on('click', async function () {
    if (confirm('We will not be able restore! are you sure?')) {
        $('body').toggleClass('loaded');
        $('[name="chkSlug"]:checked').each(async function () {
            let deleteSlug = $(this).val();
            JSON_Obj = JSON_Obj.filter(function (itm) {
                return itm.slug != deleteSlug;
            });
            const SlugRawJson = await readS3BucketAsync(activePathS3["story-detail"] + deleteSlug + ".json", "");
            if (SlugRawJson.err) {
                console.log(SlugRawJson.err);
            }
            else {
                try {
                    SlugJson = JSON.parse(SlugRawJson.data);
                    var master_categories = SlugJson["master_categories"];
                    master_categories = master_categories.split(",");
                    master_categories = master_categories.filter(function (itm) {
                        return itm != $('#ddlCategory').val()
                    });
                    SlugJson["master_categories"] = master_categories.join(",");
                    await WriteS3Bucket(SlugJson, activePathS3["story-detail"] + deleteSlug + ".json");
                } catch (e) { console.log(e); }
            }
        });
        await WriteS3Bucket(JSON_Obj, activePathS3["category-index"] + $('#ddlCategory').val() + ".json");
        $('body').toggleClass('loaded');
        $('#divStory').html(RenderStory(JSON_Obj).join(" "));
        var cols = document.querySelectorAll('#divStory .column');
        [].forEach.call(cols, addDnDHandlers);
    }
});
$('#btnRemoveAll').on('click', async function () {
    if ($('#ddlCategory').val() != "") {
        if (confirm('Are You Sure!! All files will be deleted.')) {
            $('body').toggleClass('loaded');
            $('[name="chkSlug"]').each(async function () {
                let deleteSlug = $(this).val();
                JSON_Obj = JSON_Obj.filter(function (itm) {
                    return itm.slug != deleteSlug;
                });
                const SlugRawJson = await readS3BucketAsync(activePathS3["story-detail"] + deleteSlug + ".json", "");
                if (SlugRawJson.err) {
                    console.log(SlugRawJson.err);
                }
                else {
                    try {
                        SlugJson = JSON.parse(SlugRawJson.data);
                        var master_categories = SlugJson["master_categories"];
                        master_categories = master_categories.split(",");
                        master_categories = master_categories.filter(function (itm) {
                            return itm != $('#ddlCategory').val()
                        });
                        SlugJson["master_categories"] = master_categories.join(",");
                        await WriteS3Bucket(SlugJson, activePathS3["story-detail"] + deleteSlug + ".json");
                    } catch (e) { console.log(e); }
                }
            });
            await WriteS3Bucket(JSON_Obj, activePathS3["category-index"] + $('#ddlCategory').val() + ".json");
            $('body').toggleClass('loaded');
            $('#divStory').html(RenderStory(JSON_Obj).join(" "));
            var cols = document.querySelectorAll('#divStory .column');
            [].forEach.call(cols, addDnDHandlers);
        }
    }
});

function ApplyFilter() {



    let story = JSON_Obj;
    if ($('#txtSlug').val() == "") {
        if ($('#ddlCategory').val() == "") {
            story = MasterJson;
        }
        if ($('#isFullstoryAdded').is(":checked")) {
            story = story.filter(function (i) {
                return i.isFullstoryAdded != undefined && i.isFullstoryAdded == true;
            });
        }
        else {
            story = story.filter(function (i) {
                return i.isFullstoryAdded == undefined || i.isFullstoryAdded == false;
            });
        }
        if ($('#ddlCity').val() != null && $('#ddlCity').val() != "") {
            story = story.filter(function (i) {
                return i.location != undefined && i.location == $('#ddlCity').val();
            });
        }
        if ($('#txtName').val() != "") {
            story = story.filter(function (i) {
                return i.name != undefined && i.name.toLowerCase().indexOf($('#txtName').val().toLowerCase()) != -1;
            });
        }
        $('#divStory').html(RenderStory(story).join(" "));
    }
    else {
        readS3Bucket(activePathS3["story-detail"] + $('#txtSlug').val() + ".json", function (json) {
            if (json.err) {
                $('#ddlCity').html('');
                $('#divStory').html('');
                dialog.showErrorBox('Slug not exists', "Please enter valid slug");
                return console.log(json.err);
            }
            else {
                configJson = JSON.parse(json.data);
                story = [configJson];
                $('#divStory').html(RenderStory(story).join(" "));
            }
        });
    }
}
$('#btnAddStory').on('click', function () {
    Model("addStory.html", "");
    return false;
});

function Model(pagename, slug) {
    let data = { "slug": slug, "pagename": pagename, "category": $('#ddlCategory').val() };
    ipcRenderer.send('input-broadcast', data);
}

$('#divStory').on('click', 'a[name="Detail"]', function () {
    var slug = $(this).attr('data-id');
    Model("addStory.html", slug);
    return false;
});
$('#submit').on('click', function () {
    ApplyFilter();
    return false;
});

async function CheckSlugStory(slug) {
    for (var i = 0; i < storyAlsoOn.length; i++) {
        console.log("slug start", new Date());

        let fileJson = [];
        let error = null;

        try {
            let url = "";
            let response = null;
            let data = null;

            if (storyAlsoOn[i].chkbox == "storiestop") {
                url = "https://r5dojmizdd.execute-api.ap-south-1.amazonaws.com/prod/stories-top";
            } else if (storyAlsoOn[i].chkbox == "storiestending") {
                url = "https://r5dojmizdd.execute-api.ap-south-1.amazonaws.com/prod/stories-trending";
            } else if (storyAlsoOn[i].chkbox == "storiesMobileHomeScreen") {
                url = "https://r5dojmizdd.execute-api.ap-south-1.amazonaws.com/prod/stories-mobile-home";
            } else if (storyAlsoOn[i].chkbox == "bloghome") {
                url = "https://r5dojmizdd.execute-api.ap-south-1.amazonaws.com/prod/stories-blog-home";
            }

            if (url) {
                response = await fetch(url);
                data = await response.json();
                fileJson = data.stories;
            } else {
                // Fallback to S3 read if no URL match (though based on checkboxes it should match)
                // Or keep original logic just for 'isExists' check?
                // The prompt requested replacing endpoints.
                // Assuming we fetch all and check existence in the fetched array.
                // But wait, the original logic checks if file exists first, then reads content. 
                // API endpoints always exist, but return data.
                // let's assume we proceed as if 'isExists' is true if we get data.
            }

            // Replicating logic using API data
            if (fileJson) {
                var chkbox = $('#hiddenDiv [name="' + storyAlsoOn[i]["chkbox"] + '"]'); // Used 'i' instead of '_index' as we loop directly
                var existingCount = parseInt(fileJson.length);
                var MaxCount = parseInt(configJson[storyAlsoOn[i]["chkbox"]]);
                if (MaxCount > existingCount) {
                    storyAlsoOn[i]["CanAdd"] = true;
                    $(chkbox).removeAttr('disabled');
                }
                else {
                    storyAlsoOn[i]["CanAdd"] = false;
                    $(chkbox).attr('disabled', 'disabled');
                }
                var lbl = chkbox.closest('label');
                $(lbl).html(storyAlsoOn[i]["label"] + " (" + fileJson.length + ") ");
                $(lbl).append(chkbox);
                for (var j = 0; j < fileJson.length; j++) {
                    if (fileJson[j].slug == slug) {
                        storyAlsoOn[i]["isExist"] = true;
                        storyAlsoOn[i]["index"] = j;
                        storyAlsoOn[i]["total"] = fileJson.length;
                        $('#hiddenDiv [name="' + storyAlsoOn[i]["chkbox"] + '"]').prop('checked', true);
                        $(chkbox).removeAttr('disabled');
                        break;
                    }
                }
                switch (storyAlsoOn[i]["chkbox"]) {
                    case "storiestop":
                        storiestopJson = fileJson;
                        break;
                    case "storiestending":
                        storiestrending = fileJson;
                        break;
                    case "storiesMobileHomeScreen":
                        storiesMobileHomeScreenJson = fileJson;
                        break;
                    case "bloghome":
                        bloghomeJson = fileJson;
                        break;
                    default:
                        break;
                }
            }

        } catch (e) {
            console.log(`error ${e}`);
        }

        // Original S3 logic commented out below
        // var _currentJsonFile = storyAlsoOn[i].file;
        // const IsExists = await existsS3Bucket(_currentJsonFile, i);
        // if (IsExists.isExists) {
        //     var _index = parseInt(IsExists.data);
        //     const slugResult = await readS3BucketAsync(storyAlsoOn[_index].file, "");
        //     if (slugResult.err) { }
        //     else {
        //         try {
        //             let fileJson = JSON.parse(slugResult.data);
        //             var chkbox = $('#hiddenDiv [name="' + storyAlsoOn[_index]["chkbox"] + '"]');
        //             var existingCount = parseInt(fileJson.length);
        //             var MaxCount = parseInt(configJson[storyAlsoOn[_index]["chkbox"]]);
        //             if (MaxCount > existingCount) {
        //                 storyAlsoOn[_index]["CanAdd"] = true;
        //                 $(chkbox).removeAttr('disabled');
        //             }
        //             else {
        //                 storyAlsoOn[_index]["CanAdd"] = false;
        //                 $(chkbox).attr('disabled', 'disabled');
        //             }
        //             var lbl = chkbox.closest('label');
        //             $(lbl).html(storyAlsoOn[_index]["label"] + " (" + fileJson.length + ") ");
        //             $(lbl).append(chkbox);
        //             for (var j = 0; j < fileJson.length; j++) {
        //                 if (fileJson[j].slug == slug) {
        //                     storyAlsoOn[_index]["isExist"] = true;
        //                     storyAlsoOn[_index]["index"] = j;
        //                     storyAlsoOn[_index]["total"] = fileJson.length;
        //                     $('#hiddenDiv [name="' + storyAlsoOn[_index]["chkbox"] + '"]').prop('checked', true);
        //                     $(chkbox).removeAttr('disabled');
        //                     break;
        //                 }
        //             }
        //             switch (storyAlsoOn[i]["chkbox"]) {
        //                 case "storiestop":
        //                     storiestopJson = fileJson;
        //                     break;
        //                 case "storiestending":
        //                     storiestrending = fileJson;
        //                     break;
        //                 case "storiesMobileHomeScreen":
        //                     storiesMobileHomeScreenJson = fileJson;
        //                     break;
        //                 case "bloghome":
        //                     bloghomeJson = fileJson;
        //                     break;
        //                 default:
        //                     break;
        //             }
        //         } catch (e) {
        //             console.log(`error ${e}`);
        //         }
        //     }
        // }
    }
}

const GenerateCheckbox = (slug) => {
    $('#hiddenDiv').find('input').attr('checked', false);
    let DoesRecordMatched = null;
    if (storiestopJson != null && typeof storiestopJson === "object") {
        DoesRecordMatched = storiestopJson.filter((rec) => rec.slug == slug);
        if (DoesRecordMatched.length > 0) {
            $('#hiddenDiv').find('[name="storiestop"]').attr('checked', true)
        }
    }
    DoesRecordMatched = null;
    if (storiestrending != null && typeof storiestrending === "object") {
        DoesRecordMatched = storiestrending.filter((rec) => rec.slug == slug);
        if (DoesRecordMatched.length > 0) {
            $('#hiddenDiv').find('[name="storiestending"]').attr('checked', true);
        }
    }
    DoesRecordMatched = null;
    if (storiesMobileHomeScreenJson != null && typeof storiesMobileHomeScreenJson === "object") {
        DoesRecordMatched = storiesMobileHomeScreenJson.filter((rec) => rec.slug == slug);
        if (DoesRecordMatched.length > 0) {
            $('#hiddenDiv').find('[name="storiesMobileHomeScreen"]').attr('checked', true);
        }
    }
    DoesRecordMatched = null;
    if (bloghomeJson != null && typeof bloghomeJson === "object") {
        DoesRecordMatched = bloghomeJson.filter((rec) => rec.slug == slug);
        if (DoesRecordMatched.length > 0) {
            $('#hiddenDiv').find('[name="bloghome"]').attr('checked', true);
        }
    }
    return $('#hiddenDiv').html();
}

async function deleteStory(slug) {
    if (confirm("Are you sure you want to delete this?")) {
        JSON_Obj = JSON_Obj.filter(function (itm) {
            return itm.slug != slug;
        });
        $('body').toggleClass('loaded');

        const SlugRawJson = await readS3BucketAsync(activePathS3["story-detail"] + slug + ".json", "");
        if (SlugRawJson.err) {
            console.log(SlugRawJson.err);
        }
        else {
            try {
                SlugJson = JSON.parse(SlugRawJson.data);
                var master_categories = SlugJson["master_categories"];
                master_categories = master_categories.split(",");
                master_categories = master_categories.filter(function (itm) {
                    return itm != $('#ddlCategory').val()
                });
                SlugJson["master_categories"] = master_categories.join(",");
                await WriteS3Bucket(SlugJson, activePathS3["story-detail"] + slug + ".json");
            } catch (e) { }
        }
        await WriteS3Bucket(JSON_Obj, activePathS3["category-index"] + $('#ddlCategory').val() + ".json");
        $('body').toggleClass('loaded');
        if (meta.err) {
            return console.log(tt.err);
        }
        $('#divStory').html(RenderStory(JSON_Obj).join(" "));
        var cols = document.querySelectorAll('#divStory .column');
        [].forEach.call(cols, addDnDHandlers);
    }
    else {
        return false;
    }
    return false;
}
const ReOrderStory = async () => {
    let Storylist = [];
    let storyOrderNew = [];
    $('[name="txtorder"]').each(function () {
        Storylist.push({ 'order': $(this).val(), 'slug': $(this).attr('data-val') });
    });
    Storylist.sort(function (a, b) {
        return a.order - b.order;
    });
    $(Storylist).each(function () {
        let slug = this.slug;
        let story = JSON_Obj.filter(function (item) {
            return item.slug == slug
        });
        if (story.length > 0) {
            storyOrderNew.push(story[0]);
        }
    });
    JSON_Obj = storyOrderNew;
    if ($('#ddlCategory').val() != "") {
        await WriteS3Bucket(JSON_Obj, activePathS3["category-index"] + $('#ddlCategory').val() + ".json");
    }
    console.log(JSON_Obj);
    $('#divStory').html(RenderStory(JSON_Obj).join(" "));
}

let BindAllCity = () => {
    let cityList = [];
    let city = [];
    city.push("<option value=\"\">All</option>");
    for (let index = 0; index < MasterJson.length; index++) {
        let _story = MasterJson[index];
        if (cityList.indexOf(_story.location) == -1) {
            cityList.push(_story.location);
            city.push("<option value=\"" + _story.location + "\">" + _story.location + "</option>");
        }
    }
    $('#divStory').html("");
    $('#ddlCity').html(city.join(" "));
    var $select = $("#ddlCity").selectize({
        sortField: 'text',
        maxOptions: 100000,
        placeholder: "Select City"
    });
    var selectize = $select[0].selectize;
    selectize.setValue('');

    $('#btnUpdateStory').attr('disabled', true);
    $('#btnRemoveSelected').attr('disabled', true);
    $('#btnRemoveAll').attr('disabled', true);
}
