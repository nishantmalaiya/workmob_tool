const fs = require('fs');
const path = require('path');
let pathName = "C:\\WM_Json";
var remote = require('electron').remote;
var session = require('electron').remote.session;
var app = require('electron').remote.app;
var ipcRenderer = require('electron').ipcRenderer;
var GlobalJSONObj = null;
let common = require('../js/config');
let activePathS3 = common.getS3Path();
bloghomeList();
function bloghomeList() {
    //fs.readFile(pathName + "/blog-home.json", 'utf8', function (err, data) {
    readS3Bucket(activePathS3["stories-namaste"], function (json) {
        if (json.err) {
            $('#divStory').html('');
            return console.log(json.err);
        }
        GlobalJSONObj = JSON.parse(json.data);
        $('#divStory').html(RenderStory(GlobalJSONObj).join(" "));

        var cols = document.querySelectorAll('#divStory .column');
        [].forEach.call(cols, addDnDHandlers);
    });
}
function OldRenderStory(GlobalJSONObj) {
    var storyCard = [];
    for (let index = 0; index < GlobalJSONObj.length; index++) {
        var _story = GlobalJSONObj[index];
        storyCard.push("<div class=\"storycard col-md-12 row column\" draggable=\"true\" id=\"" + _story.slug + "\">")
        storyCard.push("<div class=\"col-md-1\"><img class=\"storythumb\" src=\"" + _story.thumb + "\" alt=\"" + _story.name + "\"></div>");
        storyCard.push("<div class=\"col-md-6\"><h4>" + _story.storyHeading + "</h4>" + _story.industry + "</div>");
        storyCard.push("<div class=\"col-md-2\">" + _story.location + "</div>");
        storyCard.push("<div class=\"col-md-1\"><a name=\"Detail\" href=\"#\" data-id=\"" + _story.slug + "\" >Detail</a></div>");
        storyCard.push("<div class=\"col-md-2\"><a href=\"#\" onclick=\"deleteStory('" + _story.slug + "','" + _story.instructor + "')\">Remove from blog home</a></div>");
        storyCard.push("<hr class=\"storyHr\"></div>")
    }
    return storyCard;
}


function RenderStory(GlobalJSONObjBrow) {
    var storyCard = [];
    for (let index = 0; index < GlobalJSONObjBrow.length; index++) {
        var _story = GlobalJSONObjBrow[index];
        storyCard.push("<div class=\"storycard col-md-12 row column\" draggable=\"true\" id=\"" + _story.slug + "\">");
        storyCard.push("<div class=\"col-md-1\">" + (parseInt(index) + 1) + " <input class=\"p-0\" type=\"checkbox\" name=\"chkSlug\" tabindex='" + 10000 + parseInt(index) + "' value=\"" + _story.slug + "\">&nbsp<img class=\"storythumb p-0\" src=\"" + _story.thumb + "\" alt=\"" + _story.name + "\"></div>");
        storyCard.push("<div class=\"col-md-7\"><h5>" + _story.storyHeading + "</h5>" + _story.industry + "<br>");
        //storyCard.push(GenerateCheckbox(_story.slug));
        //storyCard.push('<a class="btn btn-outline-primary btn-sm" name="updateStory">Update Story</a>');
        storyCard.push('</div>');
        storyCard.push("<div class=\"col-md-1\">" + _story.location + "</div>");
        storyCard.push("<div class=\"col-md-1\"><a name=\"Detail\" href=\"#\" data-id=\"" + _story.slug + "\" >Detail</a></div>");
        if ($('#ddlCategory').val() == "") {
            storyCard.push("<div class=\"col-md-1\"></div>");
            storyCard.push("<div class=\"col-md-1\"></div>");
        }
        else {
            storyCard.push("<div class=\"col-md-1\"><a href=\"#\" onclick=\"deleteStory('" + _story.slug + "','" + _story.instructor + "')\">Remove</a></div>");
            storyCard.push("<div class=\"col-md-1\"><input data-val='" + _story.slug + "' type=\"text\" class=\"form-control\" style=\"max-width:50px\" tabindex='" + parseInt(GlobalJSONObjBrow.length) + index + "' name=\"txtorder\" value=\"" + index + "\"></div>");
        }
        // storyCard.push("<div class=\"col-md-1\"><a href=\"#\" onclick=\"deleteStory('" + _story.slug + "')\">Remove</a></div>");
        // storyCard.push("<div class=\"col-md-1\"><input data-val='" + _story.slug + "' type=\"text\" class=\"form-control\" style=\"max-width:50px\" tabindex='" + parseInt(GlobalJSONObjBrow.length) + index + "' name=\"txtorder\" value=\"" + index + "\"></div>");
        storyCard.push("<hr class=\"storyHr\"></div>");
    }
    return storyCard;
}



async function deleteStory(slug,instructorPhoneNo) {
    if (confirm("Are you sure you want to delete this?")) {
        GlobalJSONObj = GlobalJSONObj.filter(function (itm) {
            return itm.slug != slug;
        });
        var meta = await WriteS3Bucket(GlobalJSONObj, activePathS3["stories-namaste"]);
        if (meta.err) {
            return console.log(tt.err);
        }
        $('#divStory').html(RenderStory(GlobalJSONObj).join(" "));
        var cols = document.querySelectorAll('#divStory .column');
        [].forEach.call(cols, addDnDHandlers);
        console.log("The file was saved!");

       await deleteOnInstructor(slug,instructorPhoneNo);
        console.log("Namaste is removed from Instructor file!");
    }
    else {
        return false;
    }
}



let deleteOnInstructor = async (slug,userid) => 
{
    var submeta = await readS3BucketAsync(`${activePathS3["instructorPath"]}${userid}.json`, "");
    var instructorDetail=[];
    if (submeta.err) 
    {
        console.log(submeta.err);
    } 
    else 
    {
        instructorDetail = JSON.parse(submeta.data);
    }
    console.log(instructorDetail);
    if (instructorDetail["namaste"] != undefined && instructorDetail["namaste"].length>0) {
    
        var Afterdeletenamaste= instructorDetail["namaste"].filter(function (item) {
            return item.slug != slug;
        });

        if (Afterdeletenamaste.length > 0) {
            instructorDetail["namaste"]=Afterdeletenamaste;
        }
        else
        {
            instructorDetail["namaste"]=[];

        }
        await WriteS3Bucket(instructorDetail, `${activePathS3["instructorPath"]}${userid}.json`, function (tt) { });
    }
 }

async function saveUPre() {
    var OrderedList = [];
    $('.storycard').each(function () {
        var _slug = $(this).attr('id');
        var item = GlobalJSONObj.filter(function (itm) {
            return itm.slug == _slug;
        });
        OrderedList.push(item[0]);
    });
    $('body').toggleClass('loaded');
    var meta = await WriteS3Bucket(OrderedList, activePathS3["stories-namaste"]);
    $('body').toggleClass('loaded');
    if (meta.err) {
        return console.log(tt.err);
    }
    GlobalJSONObj = OrderedList;
    console.log("The file was saved ordered!");
}

function Model(pagename, slug) {
    let data = { "slug": slug, "pagename": pagename, "category": "blog-home" };
    ipcRenderer.send('input-broadcast', data);
}


$('#divStory').on('click', 'a[name="Detail"]', function () {
    var slug = $(this).attr('data-id');
    Model("addStory.html", slug);
});

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
        let story = GlobalJSONObj.filter(function (item) {
            return item.slug == slug
        });
        if (story.length > 0) {
            storyOrderNew.push(story[0]);
        }
    });
    GlobalJSONObj = storyOrderNew;
    await WriteS3Bucket(GlobalJSONObj, activePathS3["stories-namaste"]);
    console.log(GlobalJSONObj);
    $('#divStory').html(RenderStory(GlobalJSONObj).join(" "));
}
$('#btnUpdateStory').on('click', ({ currentTarget }) => {
    ReOrderStory();
});

$('#btnRemoveSelected').on('click', async function () {
    if (confirm('We will not be able restore! are you sure?')) {
        $('body').toggleClass('loaded');
        $('[name="chkSlug"]:checked').each(async function () {
            let deleteSlug = $(this).val();
            GlobalJSONObj = GlobalJSONObj.filter(function (itm) {
                return itm.slug != deleteSlug;
            });
            const SlugRawJson = await readS3BucketAsync(activePathS3["stories-namaste"], "");
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
                    await WriteS3Bucket(SlugJson, activePathS3["stories-namaste"]);
                } catch (e) { console.log(e); }
            }
        });
        await WriteS3Bucket(GlobalJSONObj, activePathS3["stories-namaste"]);
        $('body').toggleClass('loaded');
        $('#divStory').html(RenderStory(GlobalJSONObj).join(" "));
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
                GlobalJSONObj = GlobalJSONObj.filter(function (itm) {
                    return itm.slug != deleteSlug;
                });
                const SlugRawJson = await readS3BucketAsync(activePathS3["stories-namaste"], "");
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
                        await WriteS3Bucket(SlugJson, activePathS3["stories-namaste"]);
                    } catch (e) { console.log(e); }
                }
            });
            await WriteS3Bucket(GlobalJSONObj, activePathS3["stories-namaste"]);
            $('body').toggleClass('loaded');
            $('#divStory').html(RenderStory(GlobalJSONObj).join(" "));
            var cols = document.querySelectorAll('#divStory .column');
            [].forEach.call(cols, addDnDHandlers);
        }
    }
});