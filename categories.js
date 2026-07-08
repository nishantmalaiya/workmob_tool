const fs = require('fs');
const path = require('path');
let pathName = "C:\\WM_Json";
var remote = require('@electron/remote');
var session = remote.session;
var app = remote.app;
var ipcRenderer = require('electron').ipcRenderer;
let common = require('./Js/config');
let activePathS3 = common.getS3Path();
let catLastEvaluatedKey = null;
let catHasMore = true;
let catLoading = false;
let catLastLoadTime = 0;
GetCategoriesList();

document.addEventListener('scroll', function (e) {
    var el = e.target;
    if (!el || !el.matches) return;
    
    // Match either the outer selectize-dropdown or the inner selectize-dropdown-content
    var isDropdown = el.matches('.selectize-dropdown') || el.closest('.selectize-dropdown') || 
                     el.matches('.selectize-dropdown-content') || el.closest('.selectize-dropdown-content');
    if (!isDropdown) return;

    if (!catHasMore || catLoading || !catLastEvaluatedKey) return;

    var target = el;
    var scrollPos = Math.ceil(target.scrollTop + target.clientHeight);
    var scrollHeight = target.scrollHeight;
    if (scrollPos >= scrollHeight - 50) {
        loadMoreCategories();
    }
}, true);

var GlobalJSONObj = null;
var JSON_FileSlug = null;
var JSON_FileName = null;
let isFetching = false;
let lastEvaluatedKey = null;
let hasMoreRecords = true;

function GetCategoriesList() {
    const url = `${common.API_BASE_URL}/${activePathS3.category}?limit=100`;
    catLastEvaluatedKey = null;
    catHasMore = true;
    catLoading = false;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            var element = [];
            element.push("<option value=\"\">select</option>");
            const JSON_ObjCategory = data.data || data.categories || (Array.isArray(data) ? data : []);
            catHasMore = data.hasMore || false;
            const nextKey = data.lastKey || data.lastEvaluatedKey;
            console.log('Initial cats:', JSON_ObjCategory.length, 'hasMore:', catHasMore, 'lastKey:', nextKey);
            if (catHasMore && nextKey) {
                catLastEvaluatedKey = nextKey;
            }
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

function loadMoreCategories() {
    if (!catHasMore || catLoading || !catLastEvaluatedKey) return;
    catLoading = true;

    let keyParam = typeof catLastEvaluatedKey === 'object' ? JSON.stringify(catLastEvaluatedKey) : catLastEvaluatedKey;
    let url = `${common.API_BASE_URL}/${activePathS3.category}?lastKey=${encodeURIComponent(keyParam)}`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            const categories = data.data || data.categories || (Array.isArray(data) ? data : []);
            catHasMore = data.hasMore || false;
            const nextKey = data.lastKey || data.lastEvaluatedKey;
            if (catHasMore && nextKey) {
                catLastEvaluatedKey = nextKey;
            } else {
                catLastEvaluatedKey = null;
            }

            var selectize = $("#ddlCategory")[0].selectize;
            for (let index = 0; index < categories.length; index++) {
                var _category = categories[index];
                selectize.addOption({ value: _category.category, text: _category.title });
            }
            selectize.refreshOptions(false);
            catLoading = false;

            if (catHasMore && catLastEvaluatedKey && Date.now() - catLastLoadTime > 800) {
                var dd = document.querySelector('.selectize-dropdown');
                if (dd && dd.style.display !== 'none') {
                    var el = dd.querySelector('.selectize-dropdown-content');
                    if (el && el.scrollHeight <= el.clientHeight + 1) {
                        catLastLoadTime = Date.now();
                        loadMoreCategories();
                    }
                }
            }
        })
        .catch(err => {
            console.log(err);
            catLoading = false;
        });
}

$('#ddlCategory').on('change', function () {
    if ($.trim($(this).val()) != "") {
        lastEvaluatedKey = null; // Reset pagination for new category
        $('body').toggleClass('loaded');
        JSON_FileSlug = activePathS3["category-index"] + $(this).val() + ".json";
        JSON_FileName = $("#" + this.id + " option:selected").text();

        // Map index folder (e.g. "category/") to endpoint (e.g. "categories")
        let detailSegment = (activePathS3["category-index"] || activePathS3["category"] || "categories").replace(/\//g, "").replace(".json", "");

        let url = `${common.API_BASE_URL}/${detailSegment}/${$(this).val()}`;
        if (typeof lastEvaluatedKey !== 'undefined' && lastEvaluatedKey) {
            url += "?lastEvaluatedKey=" + encodeURIComponent(JSON.stringify(lastEvaluatedKey));
        }

        fetch(url)
            .then(response => response.json())
            .then(json => {
                isFetching = false; // Reset fetching status
                $('body').toggleClass('loaded');

                // Append and render records if available
                let fetchedStories = json.stories || json.data || (Array.isArray(json) ? json : []);
                if (fetchedStories.length > 0) {
                    GlobalJSONObj = fetchedStories; // Assign directly, do not parse
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
        const category = $('#ddlCategory').val();
        if (!category) return;

        $('body').toggleClass('loaded');
        
        let detailSegment = (activePathS3["category-index"] || activePathS3["category"] || "categories").replace(/\//g, "").replace(".json", "");
        
       // const url = `${common.API_BASE_URL}/${detailSegment}/${encodeURIComponent(category)}/${encodeURIComponent(slug)}`;
const url = `${common.API_BASE_URL}/${detailSegment}/${encodeURIComponent(category)}`;
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
            
            console.log("Story removed from category successfully via API.");
        } catch (error) {
            console.error("Error deleting story from category:", error);
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
    var meta = await WriteS3Bucket(OrderedList, JSON_FileSlug);
    if (meta.err) {
        return console.log(tt.err);
    }
    GlobalJSONObj = OrderedList;
    console.log("The file was saved ordered!");
}

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
