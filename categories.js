const fs = require('fs');
const path = require('path');
let pathName = "C:\\WM_Json";
var remote = require('@electron/remote');
var session = remote.session;
var app = remote.app;
var ipcRenderer = require('electron').ipcRenderer;
let common = require('./js/config');
let activePathS3 = common.getS3Path();
GetCategoriesList();
var GlobalJSONObj = null;
var JSON_FileSlug = null;
var JSON_FileName = null;
let isFetching = false;
let lastEvaluatedKey = null;
let hasMoreRecords = true;
// function GetCategoriesList() {
//     //fs.readFile(pathName + "/category.json", 'utf8', function (err, data) {
//     readS3Bucket(activePathS3["category"], function (json) {
//         if (json.err) {
//             return console.log(json.err);
//         }
//         var element = [];
//         element.push("<option value=\"\">select</option>");
//         var JSON_ObjCategory = JSON.parse(json.data);
//         for (let index = 0; index < JSON_ObjCategory.length; index++) {
//             var _category = JSON_ObjCategory[index];
//             element.push("<option value=\"" + _category.category + "\">" + _category.title + "</option>");
//         }
//         $('#ddlCategory').html(element.join(' '));
//         var $select = $("#ddlCategory").selectize({
//             sortField: 'text',
//             maxOptions: 100000,
//             placeholder: "Select Category"
//         });
//         var selectize = $select[0].selectize;
//         selectize.setValue('');

//     });
// }




function GetCategoriesList() {
    //debugger;
    const url = "https://r5dojmizdd.execute-api.ap-south-1.amazonaws.com/prod/categories";

    fetch(url)
        .then(response => response.json())
        .then(data => {
            var element = [];
            element.push("<option value=\"\">select</option>");
            var JSON_ObjCategory = data.categories;
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
}

$('#ddlCategory').on('change', function () {
    if ($.trim($(this).val()) != "") {
        lastEvaluatedKey = null; // Reset pagination for new category
        $('body').toggleClass('loaded');
        JSON_FileSlug = activePathS3["category-index"] + $(this).val() + ".json";
        JSON_FileName = $("#" + this.id + " option:selected").text();




        let url = "https://r5dojmizdd.execute-api.ap-south-1.amazonaws.com/prod/categories/" + $(this).val();
        if (typeof lastEvaluatedKey !== 'undefined' && lastEvaluatedKey) {
            url += "?lastEvaluatedKey=" + encodeURIComponent(JSON.stringify(lastEvaluatedKey));
        }

        fetch(url)
            .then(response => response.json())
            .then(json => {
                isFetching = false; // Reset fetching status
                $('body').toggleClass('loaded');

                // Append and render records if available
                if (json.stories && json.stories.length > 0) {
                    GlobalJSONObj = json.stories; // Assign directly, do not parse
                    $('#divStory').html(RenderStory(GlobalJSONObj).join(" "));
                    var cols = document.querySelectorAll('#divStory .column');
                    [].forEach.call(cols, addDnDHandlers);
                }

                if (json.hasMore) {
                    Pagination(json.lastEvaluatedKey);
                    hasMoreRecords = true;
                } else {
                    hasMoreRecords = false;
                    if (typeof lastEvaluatedKey !== 'undefined') lastEvaluatedKey = null;
                }
            })
            .catch(err => {
                isFetching = false;
                $('body').toggleClass('loaded');
                $('#ddlCity').html('');
                $('#divStory').html('');
                console.log(err);
            });

        if ($('body').hasClass("loaded")) {
            $('body').toggleClass('loaded');

        };


        // try {
        //     readS3Bucket(JSON_FileSlug, function (json) {
        //         $('body').toggleClass('loaded');
        //         // fs.readFile(pathName + "/" + $(this).val() + ".json", 'utf8', function (err, data) {
        //         if (json.err) {
        //             $('#divStory').html('');
        //             return console.log(json.err);
        //         }
        //         GlobalJSONObj = JSON.parse(json.data);
        //         $('#divStory').html(RenderStory(GlobalJSONObj).join(" "));
        //         var cols = document.querySelectorAll('#divStory .column');
        //         [].forEach.call(cols, addDnDHandlers);
        //     });
        // } catch (e) {
        //     $('body').toggleClass('loaded');
        //     console.log(e);
        //     $('#divStory').html('');
        // }
    }
});

function RenderStory_Old(JSON_ObjBrow) {
    var storyCard = [];
    for (let index = 0; index < JSON_ObjBrow.length; index++) {
        var _story = JSON_ObjBrow[index];
        storyCard.push("<div class=\"storycard col-md-12 row column\" draggable=\"true\" id=\"" + _story.slug + "\">")
        storyCard.push("<div class=\"col-md-1\"><img class=\"storythumb\" src=\"" + _story.thumb + "\" alt=\"" + _story.name + "\"></div>");
        storyCard.push("<div class=\"col-md-6\"><h4>" + _story.storyHeading + "</h4>" + _story.industry + "</div>");
        storyCard.push("<div class=\"col-md-2\">" + _story.location + "</div>");
        storyCard.push("<div class=\"col-md-1\"><a name=\"Detail\" href=\"#\" data-id=\"" + _story.slug + "\" >Detail</a></div>");
        storyCard.push("<div class=\"col-md-2\"><a href=\"#\" onclick=\"deleteStory('" + _story.slug + "')\">Remove from " + JSON_FileName.toLowerCase() + "</a></div>");
        storyCard.push("<hr class=\"storyHr\"></div>");
    }
    return storyCard;
}

function RenderStory(JSON_ObjBrow) {
    var storyCard = [];
    for (let index = 0; index < JSON_ObjBrow.length; index++) {
        var _story = JSON_ObjBrow[index];
        storyCard.push("<div class=\"storycard col-md-12 row column\" draggable=\"true\" id=\"" + _story.slug + "\">");
        storyCard.push("<div class=\"col-md-2\">" + (parseInt(index) + 1) + " <input type=\"checkbox\" value=\"" + _story.slug + "\"> &nbsp <img class=\"storythumb\" src=\"" + _story.thumb + "\" alt=\"" + _story.name + "\"></div>");
        storyCard.push("<div class=\"col-md-5\"><h5>" + _story.storyHeading + "</h5>" + _story.industry + "</div>");
        storyCard.push("<div class=\"col-md-2\">" + _story.location + "</div>");
        storyCard.push("<div class=\"col-md-1\"><a name=\"Detail\" href=\"#\" data-id=\"" + _story.slug + "\" >Detail</a></div>");
        storyCard.push("<div class=\"col-md-2\"><a href=\"#\" onclick=\"deleteStory('" + _story.slug + "')\">Remove from " + JSON_FileName.toLowerCase() + "</a></div>");
        storyCard.push("<hr class=\"storyHr\"></div>");
    }
    return storyCard;
}

async function deleteStory(slug) {
    if (confirm("Are you sure you want to delete this?")) {
        GlobalJSONObj = GlobalJSONObj.filter(function (itm) {
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
        var meta = await WriteS3Bucket(GlobalJSONObj, JSON_FileSlug);
        $('body').toggleClass('loaded');
        if (meta.err) {
            return console.log(tt.err);
        }
        $('#divStory').html(RenderStory(GlobalJSONObj).join(" "));
        var cols = document.querySelectorAll('#divStory .column');
        [].forEach.call(cols, addDnDHandlers);
        console.log("The file was saved!");
    }
    else {
        return false;
    }
}

//function deleteStory(slug) {
//    if (confirm("Are you sure you want to delete this?")) {
//        GlobalJSONObj = GlobalJSONObj.filter(function (itm) {
//            return itm.slug != slug;
//        });
//        WriteS3Bucket(GlobalJSONObj, JSON_FileSlug, function (tt) {
//        //fs.writeFile(pathName + "/" + JSON_FileSlug, JSON.stringify(GlobalJSONObj), function (err) {
//            if (tt.err) {
//                return console.log(tt.err);
//            }
//            $('#divStory').html(RenderStory(GlobalJSONObj).join(" "));
//            var cols = document.querySelectorAll('#divStory .column');
//            [].forEach.call(cols, addDnDHandlers);
//            console.log("The file was saved!");
//        });
//    }
//    else {
//        return false;
//    }
//}


async function saveUPre() {
    var OrderedList = [];
    $('.storycard').each(function () {
        var _slug = $(this).attr('id');
        var item = GlobalJSONObj.filter(function (itm) {
            return itm.slug == _slug;
        });
        OrderedList.push(item[0]);
    });
    var meta = await WriteS3Bucket(OrderedList, JSON_FileSlug);
    if (meta.err) {
        return console.log(tt.err);
    }
    GlobalJSONObj = OrderedList;
    console.log("The file was saved ordered!");
}


//function saveUPre() {
//    var OrderedList = [];
//    $('.storycard').each(function () {
//        var _slug = $(this).attr('id');
//        var item = GlobalJSONObj.filter(function (itm) {
//            return itm.slug == _slug;
//        });
//        OrderedList.push(item[0]);
//    });
//    WriteS3Bucket(OrderedList, JSON_FileSlug, function (tt) {
//   // fs.writeFile(pathName + "/" + JSON_FileSlug, JSON.stringify(OrderedList), function (err) {
//        if (tt.err) {
//            return console.log(tt.err);
//        }
//        GlobalJSONObj = OrderedList;
//        console.log("The file was saved ordered!");
//    });
//}
function Pagination(key) {
    lastEvaluatedKey = key;
}

function Model(pagename, slug) {
    let data = { "slug": slug, "pagename": pagename, "category": $('#ddlCategory').val() };
    ipcRenderer.send('input-broadcast', data);
}


$('#divStory').on('click', 'a[name="Detail"]', function () {
    var slug = $(this).attr('data-id');
    Model("addStory.html", slug);
});