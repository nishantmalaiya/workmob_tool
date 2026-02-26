var remote = require('@electron/remote');
const ipcRenderer = require('electron').ipcRenderer;
var pathName = remote.getGlobal('sharedObj').pathName;
const dialog = remote.dialog;
let common = require('../js/config');
let activePathS3 = common.getS3Path();
var JSON_Obj = null;
let configJson = null;
let MasterJson = null;

var storyAlsoOn = [];
storyAlsoOn.push({ "chkbox": "storiestop", "file": activePathS3["stories-top"], "isExist": false, "index": "-1", "total": "0", "label": "Stories Top", "CanAdd": false });
storyAlsoOn.push({ "chkbox": "storiestending", "file": activePathS3["trending"], "isExist": false, "index": "-1", "total": "0", "label": "Trending", "CanAdd": false });
storyAlsoOn.push({ "chkbox": "storiesMobileHomeScreen", "file": activePathS3["mobile-home"], "isExist": false, "index": "-1", "total": "0", "label": "Mobile Home Screen", "CanAdd": false });
storyAlsoOn.push({ "chkbox": "bloghome", "file": activePathS3["blog-home"], "isExist": false, "index": "-1", "total": "0", "label": "Blog Home", "CanAdd": false });



GetCategoryList();

$(async () => {
    let rawdataConfing = await readS3BucketAsync(activePathS3["config"], "");
    configJson = JSON.parse(rawdataConfing.data);
    let RawMasterJson = await readS3BucketAsync(activePathS3["MasterIndex"], "");
    if (RawMasterJson.err) {
        return console.log(RawMasterJson.err);
    }
    else {
        MasterJson = JSON.parse(RawMasterJson.data);
        $('#divStory').html(RenderStory(MasterJson).join(" "));
    }
});

function GetCategoryList() {
    readS3Bucket(activePathS3.category, function (json) {
        if (json.err) {
            return console.log(json.err);
        }
        var element = [];
        element.push("<option value=\"\">select</option>");
        var JSON_ObjCategory = JSON.parse(json.data);
        for (let index = 0; index < JSON_ObjCategory.length; index++) {
            var _category = JSON_ObjCategory[index];
            element.push("<option value=\"" + _category.category + "\">" + _category.title + "</option>");
        }
        $('#ddlCategory').html(element.join(' '));
        var $select = $("#ddlCategory").selectize({
            sortField: 'text',
            maxOptions:100000,
            placeholder:"Select Category"
        });
        var selectize = $select[0].selectize;
        selectize.setValue('');
    });
}

$('#ddlCategory').on('change', function () {
    if ($.trim($(this).val()) != "") {
        JSON_FileSlug = activePathS3["category-index"] + $(this).val() + ".json";
        JSON_FileName = $("#" + this.id + " option:selected").text();
        $('body').toggleClass('loaded');
        try {
            readS3Bucket(activePathS3["category-index"] + $(this).val() + ".json", function (json) {
                $('body').toggleClass('loaded');
                if (json.err) {
                    return console.log(json.err);
                }
                JSON_Obj = JSON.parse(json.data);
                $('#divStory').html(RenderStory(JSON_Obj).join(" "));
            });
        } catch (e) {
            $('body').toggleClass('loaded');
            console.log(e);
            $('#divStory').html('');
        }
    }
});

function RenderStory(JSON_ObjBrow) {
    var storyCard = [];
    storyCard.push(`<table class="table" style="width:90%">  <thead>`);
    storyCard.push(`<th>#</th><th style="width: 30%">Slug</th> <th style="width: 60%">Story Heading</th><th class="lastcol"></th></thead><tbody>`);
    for (let index = 0; index < JSON_ObjBrow.length; index++) {
        var _story = JSON_ObjBrow[index];

        storyCard.push("<tr data-slug=\"" + _story.slug + "\">");
        storyCard.push("<td>" + (parseInt(index) + 1) + "</td>");
        storyCard.push("<td>" + _story.slug + "</td>");
        storyCard.push(`<td><input name=\"storyHeading\" disabled type=\"text\" value="${_story.storyHeading}" class=\"form-control\"></td>`);
        storyCard.push('<td class="lastcol"><a class="btn btn-link" name="enableHeading">Update</a></td>');
        storyCard.push('</tr>');
    }
    storyCard.push(`</tbody></table>`)
    return storyCard;
}

function ApplyFilter() {
    let story = JSON_Obj;
    if ($('#txtSlug').val() == "") {
        if ($('#ddlCategory').val() == "") {
            story = MasterJson;
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


$('body').on('dblclick', '[name="enableHeading"]', function () {
    $(this).closest('tr').find('[name="storyHeading"]').removeAttr('disabled');
    $(`<a class="btn btn-success" name="updateHeading">Save</a>`).insertAfter(this);
    $(`<a class="btn btn-danger" name="cancelUpdate">Cancel</a>`).insertAfter(this);
    $(this).remove();
    return false;
});
$('body').on('click', '[name="cancelUpdate"]', function () {
    $(this).closest('tr').find('[name="storyHeading"]').attr('disabled', true);
    $(this).closest('td').html(`<a class="btn btn-link" name="enableHeading">Update</a>`);
    return false;
});
$('body').on('click', '[name="updateHeading"]', async function () {
    var _button = this;
    $('body').toggleClass('loaded');
    var updateSlug = $(this).closest('tr').attr('data-slug');
    var storyHeading = $.trim($(this).closest('tr').find('[name="storyHeading"]').val());
    var SlugJson = null;
    let RawSlug = await readS3BucketAsync(activePathS3["story-detail"] + updateSlug + ".json", "");
    if (RawSlug.err) {
        return console.log(RawSlug.err);
    }
    else {
        SlugJson = JSON.parse(RawSlug.data);
        console.log(SlugJson);
        if (storyHeading != SlugJson.storyHeading) {
            SlugJson.storyHeading = storyHeading;
            await WriteS3Bucket(SlugJson, activePathS3["story-detail"] + updateSlug + ".json");
            var master_categories = SlugJson.master_categories.split(",");
            $(master_categories).each(async function () {
                var categories = this.toString();
                console.log(categories);
                let RawcategoriesJson = await readS3BucketAsync(activePathS3["category-index"] + categories + ".json", "");
                if (RawcategoriesJson.err) {
                    return console.log(RawcategoriesJson.err);
                }
                else {
                    var categoriesJson = JSON.parse(RawcategoriesJson.data);
                    for (var j = 0; j < categoriesJson.length; j++) {
                        if (categoriesJson[j].slug == updateSlug) {
                            categoriesJson[j].storyHeading = storyHeading;
                            console.log("open this", categoriesJson[j]);
                            await WriteS3Bucket(categoriesJson, activePathS3["category-index"] + categories + ".json");
                        }
                    }
                }
            });
            for (var i = 0; i < storyAlsoOn.length; i++) {
                console.log("slug start", new Date());
                var _currentJsonFile = storyAlsoOn[i].file;
                const IsExists = await existsS3Bucket(_currentJsonFile, i);
                if (IsExists.isExists) {
                    const slugResult = await readS3BucketAsync(storyAlsoOn[i].file, "");
                    if (slugResult.err) { }
                    else {
                        try {
                            let fileJson = JSON.parse(slugResult.data);
                            for (var j = 0; j < fileJson.length; j++) {
                                if (fileJson[j].slug == updateSlug) {
                                    fileJson[j].storyHeading = storyHeading;
                                    console.log("open this", fileJson[j]);
                                    await WriteS3Bucket(fileJson, storyAlsoOn[i]["file"]);
                                }
                            }
                        }
                        catch (e) { }
                    }
                }
            }
        }
    }

    let RawMasterJson = await readS3BucketAsync(activePathS3["MasterIndex"], "");
    if (RawMasterJson.err) {
        return console.log(RawMasterJson.err);
    }
    else {
        MasterJson = JSON.parse(RawMasterJson.data);
        for (var j = 0; j < MasterJson.length; j++) {
            if (MasterJson[j].slug == updateSlug) {
                MasterJson[j].storyHeading = storyHeading;
                MasterJson[j].Isupdated=true;
                await WriteS3Bucket(MasterJson, activePathS3["MasterIndex"]);
                break;
            }
        }
    }
    $('body').toggleClass('loaded');
    $(_button).closest('tr').find('[name="storyHeading"]').attr('disabled', true);
    $(_button).closest('td').html(`<a class="btn btn-primary" name="enableHeading">Updated</a>`);
    return false;
});