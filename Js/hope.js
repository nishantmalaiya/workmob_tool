const fs = require('fs');
const path = require('path');
let pathName = "C:\\WM_Json";
var remote = require('@electron/remote');
var session = remote.session;
var app = require('electron').remote.app;
var ipcRenderer = require('electron').ipcRenderer;
let common = require('../Js/config');
let activePathS3 = common.getS3Path();

var GlobalJSONObj = [];
var lastKey = '';
var hasMore = false;
var isFetching = false;
var pageSize = 50;

bloghomeList();

function bloghomeList() {
    GlobalJSONObj = [];
    lastKey = '';
    hasMore = false;
    isFetching = false;
    $('#divStory').html('');
    
    fetchNextPageOfStories();
}

async function fetchNextPageOfStories() {
    if (isFetching) return;
    isFetching = true;
    
    let endpoint = (activePathS3["stories-hope"] || "add-namaste-stories-hope.json").replace(".json", "");
    let url = `${common.API_BASE_URL}/${endpoint}`;
    if (lastKey) {
        url += `?lastKey=${encodeURIComponent(lastKey)}`;
    }
    
    console.log("hope.js: Fetching URL:", url);
    
    try {
        const response = await fetch(url);
        console.log("hope.js: Fetch response status:", response.status);
        const data = await response.json();
        console.log("hope.js: Data received:", data);
        
        let fetchedStories = data.stories || data.data || data || [];
        if (!Array.isArray(fetchedStories) && typeof fetchedStories === 'object') {
            fetchedStories = fetchedStories.stories || fetchedStories.data || [];
        }
        
        var startIndex = GlobalJSONObj.length;
        GlobalJSONObj = [...GlobalJSONObj, ...fetchedStories];
        
        lastKey = data.lastKey || '';
        hasMore = data.hasMore === true || (data.lastKey ? true : false);
        
        console.log(`hope.js: Appended ${fetchedStories.length} stories. Total: ${GlobalJSONObj.length}. hasMore: ${hasMore}, next lastKey: ${lastKey}`);
        
        if (fetchedStories.length > 0) {
            $('#divStory').append(RenderStory(fetchedStories, startIndex).join(" "));
            var cols = document.querySelectorAll('#divStory .column');
            [].forEach.call(cols, addDnDHandlers);
        }
    } catch (err) {
        console.error("hope.js: Error fetching next page:", err);
    } finally {
        isFetching = false;
    }
}

function RenderStory(pageSlice, startIndex) {
    var storyCard = [];
    for (let index = 0; index < pageSlice.length; index++) {
        var _story = pageSlice[index];
        var globalIndex = startIndex + index;
        storyCard.push("<div class=\"storycard col-md-12 row column\" draggable=\"true\" id=\"" + _story.slug + "\">");
        storyCard.push("<div class=\"col-md-1\">" + (globalIndex + 1) + " <input class=\"p-0\" type=\"checkbox\" name=\"chkSlug\" tabindex='" + (10000 + globalIndex) + "' value=\"" + _story.slug + "\">&nbsp<img class=\"storythumb p-0\" src=\"" + _story.thumb + "\" alt=\"" + _story.name + "\"></div>");
        storyCard.push("<div class=\"col-md-7\"><h5>" + _story.storyHeading + "</h5>" + _story.industry + "<br></div>");
        storyCard.push("<div class=\"col-md-1\">" + _story.location + "</div>");
        storyCard.push("<div class=\"col-md-1\"><a name=\"Detail\" href=\"#\" data-id=\"" + _story.slug + "\" >Detail</a></div>");
        if ($('#ddlCategory').val() == "") {
            storyCard.push("<div class=\"col-md-1\"></div>");
            storyCard.push("<div class=\"col-md-1\"></div>");
        }
        else {
            storyCard.push("<div class=\"col-md-1\"><a href=\"#\" onclick=\"deleteStory('" + _story.slug + "','" + _story.instructor + "')\">Remove</a></div>");
            storyCard.push("<div class=\"col-md-1\"><input data-val='" + _story.slug + "' type=\"text\" class=\"form-control\" style=\"max-width:50px\" tabindex='" + (15000 + globalIndex) + "' name=\"txtorder\" value=\"" + globalIndex + "\"></div>");
        }
        storyCard.push("<hr class=\"storyHr\"></div>");
    }
    return storyCard;
}

async function deleteStory(slug, instructorPhoneNo) {
    if (confirm("Are you sure you want to delete this?")) {
        $('body').toggleClass('loaded');
        let endpoint = (activePathS3["stories-hope"] || "add-namaste-stories-hope.json").replace(".json", "");
        const url = `${common.API_BASE_URL}/${endpoint}/${encodeURIComponent(slug)}`;

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
            refreshVisibleStories();
            
            console.log("Story removed from Hope successfully via API.");
        } catch (error) {
            console.error("Error deleting story from Hope:", error);
            alert("Failed to remove story: " + error.message);
        } finally {
            $('body').toggleClass('loaded');
        }

        await deleteOnInstructor(slug, instructorPhoneNo);
        console.log("Hope is removed from Instructor file!");
    } else {
        return false;
    }
}

let deleteOnInstructor = async (slug, userid) => {
    var submeta = await readS3BucketAsync(`${activePathS3["instructorPath"]}${userid}.json`, "");
    var instructorDetail = [];
    if (submeta.err) {
        console.log(submeta.err);
    } else {
        instructorDetail = JSON.parse(submeta.data);
    }
    console.log(instructorDetail);
    if (instructorDetail["hope"] != undefined && instructorDetail["hope"].length > 0) {
        var Afterdeletehope = instructorDetail["hope"].filter(function (item) {
            return item.slug != slug;
        });

        if (Afterdeletehope.length > 0) {
            instructorDetail["hope"] = Afterdeletehope;
        } else {
            instructorDetail["hope"] = [];
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
        if (item.length > 0) {
            OrderedList.push(item[0]);
        }
    });

    GlobalJSONObj = OrderedList;

    $('body').toggleClass('loaded');
    var meta = await WriteS3Bucket(GlobalJSONObj, activePathS3["stories-hope"]);
    $('body').toggleClass('loaded');
    if (meta.err) {
        return console.log(meta.err);
    }
    console.log("The file was saved ordered!");
    refreshVisibleStories();
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
    $('[name="txtorder"]').each(function () {
        Storylist.push({ 'order': parseInt($(this).val()), 'slug': $(this).attr('data-val') });
    });
    Storylist.sort(function (a, b) {
        return a.order - b.order;
    });

    let sortedVisibleItems = [];
    $(Storylist).each(function () {
        let slug = this.slug;
        let story = GlobalJSONObj.filter(function (item) {
            return item.slug == slug
        });
        if (story.length > 0) {
            sortedVisibleItems.push(story[0]);
        }
    });

    GlobalJSONObj = sortedVisibleItems;

    $('body').toggleClass('loaded');
    await WriteS3Bucket(GlobalJSONObj, activePathS3["stories-hope"]);
    $('body').toggleClass('loaded');
    console.log("Reordered successfully!");
    refreshVisibleStories();
}

$('#btnUpdateStory').on('click', ({ currentTarget }) => {
    ReOrderStory();
});

$('#btnRemoveSelected').on('click', async function () {
    if (confirm('We will not be able restore! are you sure?')) {
        $('body').toggleClass('loaded');
        const selectedCheckboxes = $('[name="chkSlug"]:checked');
        let endpoint = (activePathS3["stories-hope"] || "add-namaste-stories-hope.json").replace(".json", "");
        
        for (let i = 0; i < selectedCheckboxes.length; i++) {
            let deleteSlug = $(selectedCheckboxes[i]).val();
            try {
                const url = `${common.API_BASE_URL}/${endpoint}/${encodeURIComponent(deleteSlug)}`;
                const response = await fetch(url, {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" }
                });
                
                if (response.ok) {
                    GlobalJSONObj = GlobalJSONObj.filter(itm => itm.slug != deleteSlug);
                    console.log(`Deleted ${deleteSlug} from Hope via API.`);
                }
            } catch (e) {
                console.error(`Error deleting story ${deleteSlug}:`, e);
            }
        }

        $('body').toggleClass('loaded');
        refreshVisibleStories();
    }
});

$('#btnRemoveAll').on('click', async function () {
    if (confirm('Are You Sure!! All files will be deleted.')) {
        $('body').toggleClass('loaded');
        const allCheckboxes = $('[name="chkSlug"]');
        let endpoint = (activePathS3["stories-hope"] || "add-namaste-stories-hope.json").replace(".json", "");
        
        for (let i = 0; i < allCheckboxes.length; i++) {
            let deleteSlug = $(allCheckboxes[i]).val();
            try {
                const url = `${common.API_BASE_URL}/${endpoint}/${encodeURIComponent(deleteSlug)}`;
                const response = await fetch(url, {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" }
                });
                
                if (response.ok) {
                    GlobalJSONObj = GlobalJSONObj.filter(itm => itm.slug != deleteSlug);
                    console.log(`Deleted ${deleteSlug} from Hope via API.`);
                }
            } catch (e) {
                console.error(`Error deleting story ${deleteSlug}:`, e);
            }
        }

        $('body').toggleClass('loaded');
        refreshVisibleStories();
    }
});

function refreshVisibleStories() {
    console.log("hope.js: refreshVisibleStories. GlobalJSONObj length:", GlobalJSONObj ? GlobalJSONObj.length : 0);
    if (!GlobalJSONObj) return;
    
    $('#divStory').html(RenderStory(GlobalJSONObj, 0).join(" "));
    
    var cols = document.querySelectorAll('#divStory .column');
    [].forEach.call(cols, addDnDHandlers);
}

let scrollTimeout;
$(window).on("scroll", function () {
    if (scrollTimeout) clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
        var scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
        var windowHeight = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight || 0;
        var documentHeight = document.documentElement.scrollHeight || document.body.scrollHeight || 0;
        
        console.log(`hope.js: Scroll - scrollTop: ${scrollTop}, windowHeight: ${windowHeight}, documentHeight: ${documentHeight}, hasMore: ${hasMore}, isFetching: ${isFetching}`);
        
        if (scrollTop + windowHeight >= documentHeight - 300) {
            if (hasMore && !isFetching) {
                console.log("hope.js: Triggering fetchNextPageOfStories");
                fetchNextPageOfStories();
            }
        }
    }, 150);
});
