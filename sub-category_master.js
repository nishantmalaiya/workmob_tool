const fs = require('fs');
const path = require('path');
let pathName = "C:\\WM_Json";
var remote = require('electron').remote;
var session = require('electron').remote.session;
var app = require('electron').remote.app;
var ipcRenderer = require('electron').ipcRenderer;
const dialog = remote.dialog;
let common = require('./js/config');
let activePathS3 = common.getS3Path();
let sub_categoryList = [];
categorymasterList();
async function categorymasterList() {
    $('body').toggleClass('loaded');
    var meta = await readS3BucketAsync(activePathS3["category"], "");

    $('body').toggleClass('loaded');
    if (meta.err) {
        $('#divStory').html('');
        return console.log(meta.err);
    }
    var category = JSON.parse(meta.data);
    let strCategory = [];
    strCategory.push(`<option value="">--Select--</optio>`);
    $(category).each(function () {
        strCategory.push(`<option value="${this.category}">${this.title}</optio>`);
    });
    $('#ddlcategory').html(strCategory.join(" "));

    var $select = $("#ddlcategory").selectize({
        sortField: 'text',
        maxOptions:100000,
        placeholder:"Select Category"
    });
    var selectize = $select[0].selectize;
    selectize.setValue('');

    $('#ddlCategoryMain').html(strCategory.join(" "));
    var $select = $("#ddlCategoryMain").selectize({
        sortField: 'text',
        maxOptions:100000,
        placeholder:"Select Category"
    });
    var selectize = $select[0].selectize;
    selectize.setValue('');


    $('#ddlCategoryMain').html(strCategory.join(" "));
    var submeta = await readS3BucketAsync(activePathS3["subcategory"], "");
    if (submeta.err) {
        console.log(submeta.err);
    }
    else {
        sub_categoryList = JSON.parse(submeta.data);
        if (typeof sub_categoryList == "object") {
            if (sub_categoryList.length == undefined) {
                sub_categoryList = [sub_categoryList];
            }
        }
    }
    $('#divStory').html(RenderHeader());
    await RenderStory(sub_categoryList);
}

function RenderHeader() {
    var storyCard = "";
    storyCard = "<div class=\"storycardheader col-md-12 row\">";
    storyCard = storyCard + "<div class=\"col-md-2\"><h5>Category</h5></div>";
    storyCard = storyCard + "<div class=\"col-md-2\"><h5>Title</h5></div>";
    storyCard = storyCard + "<div class=\"col-md-2\"><h5>Title Hindi</h5></div>";
    storyCard = storyCard + "<div class=\"col-md-2\"><h5>Sub Category</h5></div>";
    storyCard = storyCard + "<div class=\"col-md-1\"><h5>Total Stories</h5></div>";
    storyCard = storyCard + "<div class=\"col-md-1\"></div>";
    storyCard = storyCard + "<div class=\"col-md-1\"></div>";
    storyCard = storyCard + "<hr></div>";
    return storyCard;
}
$('#ddlCategoryMain').on('change', function () {
    if ($(this).val() != "") {
    }
    else {
    }
});


async function read(story) {
    $('body').toggleClass('loaded');
    await readS3Bucket(activePathS3["subcategoryPath"] + story["sub_category"] + ".json", function (json) {
        $('body').toggleClass('loaded');
        var totals = 0;
        var storyCard = "";
        storyCard = "<div class=\"storycard col-md-12 row column\" draggable=\"true\" name=\"category\" id=\"" + story.sub_category + "\">";
        storyCard = storyCard + "<div class=\"col-md-2\" name=\"category_title\"><h5>" + story.category_title + "</h5></div>";
        storyCard = storyCard + "<div class=\"col-md-2\" name=\"title\"><h5>" + story.title + "</h5></div>";
        storyCard = storyCard + "<div class=\"col-md-2\" name=\"title_hindi\"><h5>" + story.title_hindi + "</h5></div>";
        storyCard = storyCard + "<div class=\"col-md-2\"name=\"sub_category\"><h5>" + story.sub_category + "</h5></div>";
        if (json.err) {
            storyCard = storyCard + "<div class=\"col-md-1\">0 stories</div>";
            storyCard = storyCard + "<div class=\"col-md-1\"><a href=\"#\" data-toggle=\"modal\" data-target=\"#delete-file-modal\" onclick=\"editCat(this,'" + story.sub_category + "')\">Edit</a></div>";
            storyCard = storyCard + "<div class=\"col-md-1\"><a href=\"#\" onclick=\"deleteCat('" + story.sub_category + "',this)\">Delete</a></div>";
        }
        else {
            totals = JSON.parse(json.data).length;
            if (totals > 0) {
                storyCard = storyCard + "<div class=\"col-md-1\">" + totals + " stories</div>";
                storyCard = storyCard + "<div class=\"col-md-1\"><a href=\"#\" data-toggle=\"modal\" data-target=\"#delete-file-modal\" onclick=\"editCat(this,'" + story.sub_category + "')\">Edit</a></div>";
                storyCard = storyCard + "<div class=\"col-md-1\"><a>&nbsp;</a></div>";
            }
            else {
                storyCard = storyCard + "<div class=\"col-md-1\">0 stories</div>";
                storyCard = storyCard + "<div class=\"col-md-1\"><a href=\"#\" data-toggle=\"modal\" data-target=\"#delete-file-modal\" onclick=\"editCat(this,'" + story.sub_category + "')\">Edit</a></div>";
                storyCard = storyCard + "<div class=\"col-md-1\"><a href=\"#\" onclick=\"deleteCat('" + story.sub_category + "',this)\">Delete</a></div>";
            }
        }
        storyCard = storyCard + "<hr class=\"storyHr\"></div>";
        $('#divStory').append(storyCard);
        var cols = document.querySelectorAll('#divStory .column');
        [].forEach.call(cols, addDnDHandlers);
    });
}

async function RenderStory(JSON_Obj) {
    for (let index = 0; index < JSON_Obj.length; index++) {
        var _story = JSON_Obj[index];
        await read(_story);
    }
}

function deleteCat(cname, _self) {
    if (confirm("Are you sure you want to delete this?")) {
        $(_self).closest('.storycard').remove();
        //$("#" + cname).remove();
        let file = path.join(pathName, activePathS3["subcategory"]);
        var finalJson = [];
        $('.storycard').each(function () {
            var _currentArray = this;
            var JSONObj = {};
            JSONObj[$(this).attr('name')] = $(this).attr('id');
            $(_currentArray).find('h4').each(function () {
                JSONObj[$(this).closest('div').attr('name')] = $(this).text();
            });
            finalJson.push(JSONObj);
        });
        if (finalJson.length == 1) {
            finalJson = finalJson[0];
        }
        $('body').toggleClass('loaded');
        WriteS3Bucket(finalJson, activePathS3["subcategory"], function (tt) {
            console.log(tt);
            console.log("The file was saved!");
        });
        $('body').toggleClass('loaded');
    }
    else {
        return false;
    }
}

$("#btnSave").click(function () {
    var storyCard = "";
    var str = $("#txtSubCategory").val();
    var _sub_category = str.replace(/ /gi, "-");
    validation(async function (cansave) {
        if (cansave.cansave) {
            if ($("#hdncategory").val() == "") {
                var _flag = true;
                var isExists = sub_categoryList.filter(function (item) {
                    return item.sub_category.toLowerCase() == _sub_category.toLowerCase();
                });
                if (isExists.length > 0) {
                    _flag = false;
                    alert("This category already exist");
                    return false;
                }
                if (_flag) {
                    sub_categoryList.push(cansave.item);
                    storyCard = "<div class=\"storycard col-md-12 row column\" draggable=\"true\" name=\"sub-category\" id=\"" + _sub_category + "\">";
                    storyCard = storyCard + "<div class=\"col-md-2\" name=\"Category\"><h5>" + $('#ddlcategory option:selected').text() + "</h5></div>";
                    storyCard = storyCard + "<div class=\"col-md-2\" name=\"title\"><h5>" + $("#title").val() + "</h5></div>";
                    storyCard = storyCard + "<div class=\"col-md-2\" name=\"title_hindi\"><h5>" + $("#title_hindi").val() + "</h5></div>";
                    storyCard = storyCard + "<div class=\"col-md-2\" name=\"sub_category\"><h5>" + _sub_category + "</h5></div>";
                    storyCard = storyCard + "<div class=\"col-md-1\" >0 stories</div>";
                    storyCard = storyCard + "<div class=\"col-md-1\"><a href=\"#\" data-toggle=\"modal\" data-target=\"#delete-file-modal\" onclick=\"editCat(this,'" + _sub_category + "')\">Edit</a></div>";
                    storyCard = storyCard + "<div class=\"col-md-1\"><a href=\"#\" onclick=\"deleteCat(this,'" + _sub_category + "')\">Delete</a></div>";
                    storyCard = storyCard + "<hr class=\"col-md-12 bg-info\"></div>";
                    $('#divStory').append(storyCard);
                    var cols = document.querySelectorAll('#divStory .column');
                    [].forEach.call(cols, addDnDHandlers);
                    var a = [];
                    await WriteS3Bucket(a, activePathS3["subcategoryPath"] + _sub_category + ".json");
                }
            }
            else {
                for (var i = 0; i < sub_categoryList.length; i++) {
                    if (sub_categoryList[i]["sub_category"].toLowerCase() == _sub_category.toLowerCase()) {
                        sub_categoryList[i] = cansave.item;
                    }
                }
                $('.storycard').each(function () {
                    if ($(this).attr('id').toLowerCase() == _sub_category.toLowerCase()) {
                        $(this).find('[name="Category"] h5').html($('#ddlcategory option:selected').text());
                        $(this).find('[name="title"] h5').html($("#title").val());
                        $(this).find('[name="title_hindi"] h5').html($("#title_hindi").val());
                        $(this).find('[name="sub_category"] h5').html(_sub_category);
                    }
                });
            }
            $('#delete-file-modal').modal('hide');
            var finalJson = sub_categoryList;
            if (finalJson.length == 1) {
                finalJson = [finalJson[0]];
            }
            $('body').toggleClass('loaded');
            const meta = await WriteS3Bucket(finalJson, activePathS3["subcategory"]);
            console.log(meta);
            $('body').toggleClass('loaded');
            const options = { title: '', message: 'sub Category Saved succssfully', detail: '' };
            try {
                dialog.showMessageBox(null, options);
            } catch (e) {
                console.log(e);
                dialog.showMessageBox(null, options);
            }
            $("#txtSubCategory").val('');
            $("#title").val('');
            $("#title_hindi").val('');
            $("#hdncategory").val('');
        }
        else {
            alert(cansave.msg);
        }
    });
});

$("#btnAddcat").click(function () {
    $("#txtSubCategory").val('');
    $("#title").val('');
    $("#title_hindi").val('');
    $("#hdncategory").val('');
    $('#delete-file-modal').find('.modal-title').text("Add Sub Category");
    $('#delete-file-modal').find('#CategoryEdit').show();
});

$("#btnClose").click(function () {
    $('#delete-file-modal').modal('hide');
});
function editCat(_self, cname) {
    let result = sub_categoryList.filter(subcat => subcat["sub_category"] == cname);
    if (result.length > 0) {
        result = result[0];
    }
    $('#delete-file-modal').find('.modal-title').text("Edit Category");
    $('#delete-file-modal').find('#CategoryEdit').hide();
    $('#delete-file-modal').find('#txtSubCategory').val(result["sub_category"]);
    $('#delete-file-modal').find('#hdncategory').val(result["sub_category"]);
    $('#delete-file-modal').find('#title').val(result["title"]);
    $('#delete-file-modal').find('#title_hindi').val(result["title_hindi"]);
    $('#delete-file-modal').find('#ddlcategory').val(result["Category"]);
}

function saveUPre() {
    let file = path.join(pathName, activePathS3["category"]);
    var finalJson = [];
    $('.storycard').each(function () {
        var _currentArray = this;
        var JSONObj = {};
        JSONObj[$(this).attr('name')] = $(this).attr('id');
        $(_currentArray).find('h4').each(function () {
            JSONObj[$(this).closest('div').attr('name')] = $(this).text();
        });
        finalJson.push(JSONObj);
    });
    if (finalJson.length == 1) {
        finalJson = finalJson[0];
    }
    $('body').toggleClass('loaded');
    WriteS3Bucket(finalJson, activePathS3["category"], function (tt) {
        console.log(tt);
        console.log("The file was saved!");
    });
    $('body').toggleClass('loaded');
}

function validation(cb) {
    var cansave = true;
    var msg = "";

    var item = {
        "Category": $.trim($('#divModel').find('#ddlcategory').val()),
        "category_title": $.trim($('#divModel').find('#ddlcategory option:selected').val()),
        "sub_category": $.trim($('#divModel').find('#txtSubCategory').val().replace(/ /gi, "-")),
        "title": $.trim($('#divModel').find('#title').val()),
        "title_hindi": $.trim($('#divModel').find('#title_hindi').val()
        )
    }
    if (item["Category"] == "") {
        msg = "Please select Category";
        cansave = false;
    }
    if (item["sub_category"] == "") {
        msg = "Please enter Sub Category";
        cansave = false;
    }
    if (item["title"] == "") {
        msg = "Please Enter title";
        cansave = false;
    }
    if (item["title_hindi"] == "") {
        msg = "Please Enter Hindi title";
        cansave = false;
    }
    var result = { "cansave": cansave, "msg": msg, "item": item };
    cb(result);
}