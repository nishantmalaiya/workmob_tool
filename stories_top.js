const fs = require('fs');
const path = require('path');
let pathName = "C:\\WM_Json";
var remote = require('@electron/remote');
var session = remote.session;
var app = remote.app;
var ipcRenderer = require('electron').ipcRenderer;
let common = require('./js/config');
let activePathS3 = common.getS3Path();

var GlobalJSONObj = null;
storiestopList();
function storiestopList() {
    //fs.readFile(pathName + "/stories-top.json", 'utf8', function (err, data) {
    const url = `${common.API_BASE_URL}/${activePathS3["stories-top"]}`;
    fetch(url)
        .then(response => response.json())
        .then(data => {
            GlobalJSONObj = data.stories || data.data || data || [];
            if (GlobalJSONObj && GlobalJSONObj.length > 0) {
                $('#divStory').html(RenderStory(GlobalJSONObj).join(" "));
                var cols = document.querySelectorAll('#divStory .column');
                [].forEach.call(cols, addDnDHandlers);
            }
        })
        .catch(err => {
            console.log(err);
            $('#divStory').html('');
        });

    // readS3Bucket(activePathS3["stories-top"], function (json) {
    //     if (json.err) {
    //         $('#divStory').html('');
    //         return console.log(json.err);
    //     }
    //     GlobalJSONObj = JSON.parse(json.data);
    //     $('#divStory').html(RenderStory(GlobalJSONObj).join(" "));
    //     var cols = document.querySelectorAll('#divStory .column');
    //     [].forEach.call(cols, addDnDHandlers);
    // });
}
function OldRenderStory(JSON_Obj) {
    var storyCard = [];
    for (let index = 0; index < JSON_Obj.length; index++) {
        var _story = JSON_Obj[index];
        storyCard.push("<div class=\"storycard col-md-12 row column\" draggable=\"true\" id=\"" + _story.slug + "\">")
        storyCard.push("<div class=\"col-md-1\"><img class=\"storythumb\" src=\"" + _story.thumb + "\" alt=\"" + _story.name + "\"></div>");
        storyCard.push("<div class=\"col-md-6\"><h4>" + _story.storyHeading + "</h4>" + _story.industry + "</div>");
        storyCard.push("<div class=\"col-md-2\">" + _story.location + "</div>");
        storyCard.push("<div class=\"col-md-1\"><a name=\"Detail\" href=\"#\" data-id=\"" + _story.slug + "\" >Detail</a></div>");
        storyCard.push("<div class=\"col-md-2\"><a href=\"#\" onclick=\"deleteStory('" + _story.slug + "')\">Remove from stories top</a></div>");
        storyCard.push("<hr class=\"storyHr\"></div>");
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
            storyCard.push("<div class=\"col-md-1\"><a href=\"#\" onclick=\"deleteStory('" + _story.slug + "')\">Remove</a></div>");
            storyCard.push("<div class=\"col-md-1\"><input data-val='" + _story.slug + "' type=\"text\" class=\"form-control\" style=\"max-width:50px\" tabindex='" + parseInt(GlobalJSONObjBrow.length) + index + "' name=\"txtorder\" value=\"" + index + "\"></div>");
        }
        // storyCard.push("<div class=\"col-md-1\"><a href=\"#\" onclick=\"deleteStory('" + _story.slug + "')\">Remove</a></div>");
        // storyCard.push("<div class=\"col-md-1\"><input data-val='" + _story.slug + "' type=\"text\" class=\"form-control\" style=\"max-width:50px\" tabindex='" + parseInt(GlobalJSONObjBrow.length) + index + "' name=\"txtorder\" value=\"" + index + "\"></div>");
        storyCard.push("<hr class=\"storyHr\"></div>");
    }
    return storyCard;
}

async function deleteStory(slug) {
    if (confirm("Are you sure you want to delete this?")) {
        $('body').toggleClass('loaded');
        const url = `${common.API_BASE_URL}/${activePathS3["stories-top"]}/${encodeURIComponent(slug)}`;

        try {
            const response = await fetch(url, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" }
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.msg || `API delete failed with status ${response.status}`);
            }

            // Success: update local list and UI
            GlobalJSONObj = GlobalJSONObj.filter(itm => itm.slug != slug);
            $('#divStory').html(RenderStory(GlobalJSONObj).join(" "));
            
            var cols = document.querySelectorAll('#divStory .column');
            [].forEach.call(cols, addDnDHandlers);
            
            console.log("Story removed from stories top successfully via API.");
        } catch (error) {
            console.error("Error deleting story from stories top:", error);
            alert("Failed to remove story: " + error.message);
        } finally {
            $('body').toggleClass('loaded');
        }
    } else {
        return false;
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
    var meta = await WriteS3Bucket(OrderedList, activePathS3["stories-top"]);
    $('body').toggleClass('loaded');
    if (meta.err) {
        return console.log(tt.err);
    }
    GlobalJSONObj = OrderedList;
    console.log("The file was saved ordered!");
}


function Model(pagename, slug) {
    let data = { "slug": slug, "pagename": pagename, "category": "stories-top" };
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
    await WriteS3Bucket(GlobalJSONObj, activePathS3["stories-top"]);
    console.log(GlobalJSONObj);
    $('#divStory').html(RenderStory(GlobalJSONObj).join(" "));
}
$('#btnUpdateStory').on('click', ({ currentTarget }) => {
    ReOrderStory();
});

$('#btnRemoveSelected').on('click', async function () {
    if (confirm('We will not be able restore! are you sure?')) {
        $('body').toggleClass('loaded');
        const selectedCheckboxes = $('[name="chkSlug"]:checked');
        
        for (let i = 0; i < selectedCheckboxes.length; i++) {
            let deleteSlug = $(selectedCheckboxes[i]).val();
            try {
                const url = `${common.API_BASE_URL}/${activePathS3["stories-top"]}/${encodeURIComponent(deleteSlug)}`;
                const response = await fetch(url, {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" }
                });
                
                if (response.ok) {
                    GlobalJSONObj = GlobalJSONObj.filter(itm => itm.slug != deleteSlug);
                    console.log(`Deleted ${deleteSlug} from stories top via API.`);
                }
            } catch (e) {
                console.error(`Error deleting story ${deleteSlug}:`, e);
            }
        }

        $('body').toggleClass('loaded');
        $('#divStory').html(RenderStory(GlobalJSONObj).join(" "));
        var cols = document.querySelectorAll('#divStory .column');
        [].forEach.call(cols, addDnDHandlers);
    }
});
$('#btnRemoveAll').on('click', async function () {
    if (confirm('Are You Sure!! All files will be deleted.')) {
        $('body').toggleClass('loaded');
        const allCheckboxes = $('[name="chkSlug"]');
        
        for (let i = 0; i < allCheckboxes.length; i++) {
            let deleteSlug = $(allCheckboxes[i]).val();
            try {
                const url = `${common.API_BASE_URL}/${activePathS3["stories-top"]}/${encodeURIComponent(deleteSlug)}`;
                const response = await fetch(url, {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" }
                });
                
                if (response.ok) {
                    GlobalJSONObj = GlobalJSONObj.filter(itm => itm.slug != deleteSlug);
                    console.log(`Deleted ${deleteSlug} from stories top via API.`);
                }
            } catch (e) {
                console.error(`Error deleting story ${deleteSlug}:`, e);
            }
        }

        $('body').toggleClass('loaded');
        $('#divStory').html(RenderStory(GlobalJSONObj).join(" "));
        var cols = document.querySelectorAll('#divStory .column');
        [].forEach.call(cols, addDnDHandlers);
    }
});