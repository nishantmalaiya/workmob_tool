const fs = require('fs');
const path = require('path');
let pathName = "C:\\WM_Json";
var remote = require('@electron/remote');
var session = remote.session;
var app = remote.app;
var ipcRenderer = require('electron').ipcRenderer;
let common = require('./Js/config');
let activePathS3 = common.getS3Path();

var type = remote.getGlobal("sharedObj") ? remote.getGlobal("sharedObj").currentStory : "default";

let catLastEvaluatedKey = null;
let catHasMore = true;
let catLoading = false;
let catLastLoadTime = 0;

var GlobalJSONObj = null;
var JSON_FileSlug = null;
var JSON_FileName = null;
let isFetching = false;
let lastEvaluatedKey = null;
let hasMoreRecords = true;

// Clean SVG fallback placeholder for missing/broken story thumbnails
const FALLBACK_THUMB = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='70' height='48' viewBox='0 0 70 48'%3E%3Crect width='70' height='48' fill='%23e2e8f0'/%3E%3Cpath d='M26 18a4 4 0 1 1-8 0 4 4 0 0 1 8 0zm-13 18l11-13 7 8 12-15 15 20H13z' fill='%2394a3b8'/%3E%3C/svg%3E";

function showLoaderImmediate() {
    $('body').removeClass('loaded');
    $('#loader-wrapper').css({ visibility: 'visible', transform: 'translateY(0)', transition: 'none' });
}

function hideLoaderImmediate() {
    $('body').addClass('loaded');
    $('#loader-wrapper').css({ visibility: 'hidden', transform: 'translateY(-100%)', transition: 'none' });
}

$(document).ready(function () {
    $('#divStory').html(renderInitialState());
    $('#storyTableHeader').hide();
    $('#paginationProgress').hide();
    $('#paginationEndMessage').hide();
    GetCategoriesList();
});

// Dropdown infinite scroll listener for selectize
document.addEventListener('scroll', function (e) {
    var el = e.target;
    if (!el || !el.matches) return;

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

// Window scroll listener for infinite scroll pagination on stories
$(window).on('scroll', function () {
    if (!hasMoreRecords || isFetching || !lastEvaluatedKey) return;

    var scrollPosition = $(window).scrollTop() + $(window).height();
    var pageHeight = $(document).height();

    if (scrollPosition >= pageHeight - 200) {
        loadMoreStories();
    }
});

function GetCategoriesList() {
    const url = `${common.API_BASE_URL}/${activePathS3.category}?limit=100`;
    catLastEvaluatedKey = null;
    catHasMore = true;
    catLoading = false;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            var element = [];
            element.push("<option value=\"\">-- Select Category --</option>");
            const JSON_ObjCategory = data.data || data.categories || (Array.isArray(data) ? data : []);
            catHasMore = data.hasMore || false;
            const nextKey = data.lastKey || data.lastEvaluatedKey;
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
                placeholder: "Select Category..."
            });
            var selectize = $select[0].selectize;
            selectize.setValue('');
        })
        .catch(err => {
            console.error("Error loading categories:", err);
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
            console.error("Error loading more categories:", err);
            catLoading = false;
        });
}

// Show/hide pagination progress UI
function showPaginationProgress(show) {
    if (show) {
        const loadedCount = GlobalJSONObj ? GlobalJSONObj.length : 0;
        $('#paginationStats').text(`Loaded ${loadedCount} stories so far, fetching more...`);
        $('#paginationProgress').show();
        $('#paginationEndMessage').hide();
        $('#storyCountBadge').html(`<span class="glyphicon glyphicon-refresh spin-icon"></span> Loading... (${loadedCount} loaded)`).show();
    } else {
        $('#paginationProgress').hide();
    }
}

// Load more stories on scroll
async function loadMoreStories() {
    if (!hasMoreRecords || isFetching || !lastEvaluatedKey) return;
    isFetching = true;

    let detailSegment = (activePathS3["category-index"] || activePathS3["category"] || "categories").replace(/\//g, "").replace(".json", "");
    let category = $('#ddlCategory').val();

    if (!category) {
        isFetching = false;
        return;
    }

    showPaginationProgress(true);

    let keyParam = typeof lastEvaluatedKey === 'object' ? JSON.stringify(lastEvaluatedKey) : lastEvaluatedKey;
    let url = `${common.API_BASE_URL}/${detailSegment}/${encodeURIComponent(category)}?lastKey=${encodeURIComponent(keyParam)}`;

    try {
        const response = await fetch(url);
        const json = await response.json();

        const newStories = json.stories || json.data || [];
        if (newStories.length > 0) {
            const startIndex = GlobalJSONObj.length;
            GlobalJSONObj = [...GlobalJSONObj, ...newStories];
            $('#divStory').append(RenderStoryItems(newStories, startIndex).join(" "));

            var cols = document.querySelectorAll('#divStory .column');
            [].forEach.call(cols, addDnDHandlers);
        }

        hasMoreRecords = json.hasMore || false;
        lastEvaluatedKey = json.lastKey || json.lastEvaluatedKey || null;

        if (!hasMoreRecords && GlobalJSONObj && GlobalJSONObj.length > 0) {
            $('#totalStoriesCount').text(GlobalJSONObj.length);
            $('#paginationEndMessage').show();
        }
    } catch (err) {
        console.error('Error loading more stories:', err);
    } finally {
        isFetching = false;
        showPaginationProgress(false);
        updateStatsBadge();
    }
}

// Category change event
$('#ddlCategory').on('change', function () {
    const selectedVal = $.trim($(this).val());
    $("#searchBox").val('');

    if (selectedVal !== "") {
        JSON_FileSlug = activePathS3["category-index"] + selectedVal + ".json";
        JSON_FileName = $("#" + this.id + " option:selected").text();
        refreshCategoryStories(selectedVal);
    } else {
        GlobalJSONObj = null;
        $('#storyTableHeader').hide();
        $('#storyCountBadge').hide();
        $('#paginationProgress').hide();
        $('#paginationEndMessage').hide();
        $('#divStory').html(renderInitialState());
    }
});

// Refresh category stories by calling API again
async function refreshCategoryStories(categoryToLoad) {
    const category = categoryToLoad || $.trim($('#ddlCategory').val());
    if (!category) return;

    lastEvaluatedKey = null;
    hasMoreRecords = true;
    isFetching = true;

    showLoaderImmediate();
    $('#paginationProgress').hide();
    $('#paginationEndMessage').hide();

    const currentType = (remote.getGlobal("sharedObj") && remote.getGlobal("sharedObj").currentStory) ? remote.getGlobal("sharedObj").currentStory : type;
    const currentActivePathS3 = common.getS3Path ? common.getS3Path() : activePathS3;
    let detailSegment = (currentActivePathS3["category-index"] || currentActivePathS3["category"] || "categories").replace(/\//g, "").replace(".json", "");
    
    // Except default section, limit is not passed in detail API
    let url = (currentType === "default")
        ? `${common.API_BASE_URL}/${detailSegment}/${encodeURIComponent(category)}?limit=50`
        : `${common.API_BASE_URL}/${detailSegment}/${encodeURIComponent(category)}`;

    try {
        const response = await fetch(url);
        const json = await response.json();

        let fetchedStories = json.stories || json.data || (Array.isArray(json) ? json : []);
        GlobalJSONObj = fetchedStories;

        if (fetchedStories.length > 0) {
            $('#storyTableHeader').show();
            $('#divStory').html(RenderStory(GlobalJSONObj).join(" "));
            var cols = document.querySelectorAll('#divStory .column');
            [].forEach.call(cols, addDnDHandlers);
        } else {
            $('#storyTableHeader').hide();
            $('#divStory').html(renderEmptyCategoryState());
        }

        if (json.hasMore) {
            Pagination(json.lastKey || json.lastEvaluatedKey);
            hasMoreRecords = true;
            $('#paginationEndMessage').hide();
        } else {
            hasMoreRecords = false;
            lastEvaluatedKey = null;
            if (fetchedStories.length > 0) {
                $('#totalStoriesCount').text(fetchedStories.length);
                $('#paginationEndMessage').show();
            } else {
                $('#paginationEndMessage').hide();
            }
        }

        updateStatsBadge();
    } catch (err) {
        console.error("Error refreshing stories:", err);
        GlobalJSONObj = [];
        $('#storyTableHeader').hide();
        $('#divStory').html('<div class="empty-state-card text-danger"><p>Error loading stories</p></div>');
    } finally {
        isFetching = false;
        hideLoaderImmediate();
    }
}

function updateStatsBadge() {
    if (GlobalJSONObj && GlobalJSONObj.length > 0) {
        const suffix = hasMoreRecords ? ' (scroll for more)' : ' (all loaded)';
        $('#storyCountBadge').text(`${GlobalJSONObj.length} ${GlobalJSONObj.length === 1 ? 'story' : 'stories'}${suffix}`).show();
    } else {
        $('#storyCountBadge').hide();
    }
}

// Render Story Cards (Header + Items)
function RenderStory(stories) {
    return RenderStoryItems(stories, 0);
}

// Render story items starting at an index offset
function RenderStoryItems(stories, startIndex) {
    var cards = [];
    startIndex = startIndex || 0;

    for (let index = 0; index < stories.length; index++) {
        var _story = stories[index];
        var currentIndex = startIndex + index + 1;
        const thumbUrl = _story.thumb || FALLBACK_THUMB;
        const heading = _story.storyHeading || 'Untitled Story';
        const industry = _story.industry || 'General';
        const location = _story.location || 'N/A';
        const author = _story.name ? `<span class="story-author"><span class="glyphicon glyphicon-user"></span> ${_story.name}</span>` : '';

        cards.push(`
            <div class="storycard column" draggable="true" id="${_story.slug}">
                <div class="story-col-order">
                    <span class="drag-handle" title="Drag to reorder"><span class="glyphicon glyphicon-menu-hamburger"></span></span>
                    <span class="order-badge" id="order-${_story.slug}">${currentIndex}</span>
                    <input type="checkbox" class="story-chk" value="${_story.slug}">
                </div>
                <div class="story-col-thumb">
                    <img class="storythumb" src="${thumbUrl}" alt="${_story.name || heading}" onerror="this.onerror=null; this.src='${FALLBACK_THUMB}';">
                </div>
                <div class="story-col-info">
                    <div class="story-title" title="${heading}">${heading}</div>
                    <div class="story-tags">
                        <span class="industry-tag">${industry}</span>
                        ${author}
                    </div>
                </div>
                <div class="story-col-loc">
                    <span class="glyphicon glyphicon-map-marker text-danger"></span>
                    <span title="${location}">${location}</span>
                </div>
                <div class="story-col-actions">
                    <button type="button" class="btn btn-sm btn-info btn-detail" data-id="${_story.slug}">
                        <span class="glyphicon glyphicon-eye-open"></span> Detail
                    </button>
                    <button type="button" class="btn btn-sm btn-danger btn-remove" onclick="deleteStory('${_story.slug}')">
                        <span class="glyphicon glyphicon-trash"></span> Remove
                    </button>
                    <button type="button" class="btn btn-sm btn-default btn-update-order" onclick="showOrderInput('${_story.slug}', ${currentIndex})">
                        <span class="glyphicon glyphicon-sort"></span> Update Order
                    </button>
                    <span class="order-edit-group" id="order-group-${_story.slug}" style="display:none;">
                        <input type="number" id="order-input-${_story.slug}" class="order-input form-control input-sm" value="${currentIndex}">
                        <button id="save-order-${_story.slug}" onclick="saveSingleOrder('${_story.slug}')" class="btn btn-sm btn-success btn-save-order">
                            <span class="glyphicon glyphicon-ok"></span> Save
                        </button>
                    </span>
                </div>
            </div>
        `);
    }

    return cards;
}

// Toggle Inline Order Edit Box
function showOrderInput(slug, currentIndex) {
    const group = $("#order-group-" + slug);
    const input = $("#order-input-" + slug);
    if (group.is(":visible")) {
        group.hide();
    } else {
        input.val(currentIndex);
        group.css('display', 'inline-flex');
        input.focus();
    }
}

// Save Single Story Order and refresh list by calling API again
async function saveSingleOrder(slug) {
    const orderInput = $("#order-input-" + slug);
    const newIndex = parseInt(orderInput.val(), 10);
    const category = $("#ddlCategory").val();

    if (isNaN(newIndex)) {
        alert("Please enter a valid number");
        return;
    }

    showLoaderImmediate();

    try {
        const currentType = (remote.getGlobal("sharedObj") && remote.getGlobal("sharedObj").currentStory) ? remote.getGlobal("sharedObj").currentStory : type;
        const currentActivePathS3 = common.getS3Path ? common.getS3Path() : activePathS3;
        const detailSegment = (currentActivePathS3["category-index"] || currentActivePathS3["category"] || "categories").replace(/\//g, "").replace(".json", "");

        // Except default section, call POST method in API
        const httpMethod = (currentType === "default") ? "PUT" : "POST";

        // While POST, remove slug from the end of URL
        const url = (httpMethod === "POST")
            ? `${common.API_BASE_URL}/${detailSegment}/${encodeURIComponent(category)}`
            : `${common.API_BASE_URL}/${detailSegment}/${encodeURIComponent(category)}/${encodeURIComponent(slug)}`;

        console.log(`Updating order for slug: ${slug} in category: ${category} to index: ${newIndex} using ${httpMethod} on ${url} (section: ${currentType})`);

        // Find respective story data from loaded stories
        const storyItem = (GlobalJSONObj || []).find(item => item && item.slug === slug) || {};

        // In case of POST API send respective all data with index_order
        const requestPayload = (httpMethod === "POST")
            ? { ...storyItem, slug: slug, category: storyItem.category || category, index_order: newIndex, order: newIndex }
            : { slug: slug, index_order: newIndex, order: newIndex };

        console.log(`Payload for ${httpMethod}:`, requestPayload);

        const response = await fetch(url, {
            method: httpMethod,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestPayload)
        });

        if (!response.ok) {
            const errJson = await response.json().catch(() => ({}));
            throw new Error(errJson.msg || errJson.message || `Failed to update order (status ${response.status})`);
        }

        console.log('Order updated for:', slug, 'to index:', newIndex);
        $("#order-group-" + slug).hide();

        // Refresh list by calling API again
        await refreshCategoryStories(category);
    } catch (err) {
        console.error('Error saving order:', err);
        alert('Error saving order: ' + err.message);
        hideLoaderImmediate();
    }
}

// Search by slug
async function searchBySlug() {
    const searchTerm = $("#searchBox").val().trim();
    const category = $("#ddlCategory").val();

    if (!searchTerm) {
        alert("Please enter a slug to search");
        return;
    }

    if (!category) {
        alert("Please select a category first");
        return;
    }

    showLoaderImmediate();
    $('#paginationProgress').hide();
    $('#paginationEndMessage').hide();

    let detailSegment = (activePathS3["category-index"] || activePathS3["category"] || "categories").replace(/\//g, "").replace(".json", "");
    let url = `${common.API_BASE_URL}/${detailSegment}/${encodeURIComponent(category)}?slug=${encodeURIComponent(searchTerm)}`;

    console.log('Search URL:', url);

    try {
        const response = await fetch(url);
        const json = await response.json();

        let results = json.stories || json.data || (Array.isArray(json) ? json : []);
        if (results.length > 0) {
            GlobalJSONObj = results;
            JSON_FileName = "Search Results";
            $('#storyTableHeader').show();
            $("#divStory").html(RenderStory(GlobalJSONObj).join(" "));
            $('#storyCountBadge').text(`${results.length} result${results.length === 1 ? '' : 's'}`).show();

            var cols = document.querySelectorAll('#divStory .column');
            [].forEach.call(cols, addDnDHandlers);

            lastEvaluatedKey = null;
            hasMoreRecords = false;
        } else {
            $('#storyTableHeader').hide();
            $('#storyCountBadge').hide();
            $("#divStory").html(`
                <div class="empty-state-card">
                    <div class="empty-state-icon"><span class="glyphicon glyphicon-search"></span></div>
                    <div class="empty-state-title">No Results Found</div>
                    <div class="empty-state-desc">No story matched slug "<strong>${searchTerm}</strong>" in this category.</div>
                </div>
            `);
            GlobalJSONObj = [];
            lastEvaluatedKey = null;
            hasMoreRecords = false;
        }
    } catch (err) {
        console.error('Error searching:', err);
        $("#divStory").html('<div class="empty-state-card text-danger"><p>Error loading search results</p></div>');
    } finally {
        hideLoaderImmediate();
    }
}

// Search event listeners
$("#searchBtn").on('click', searchBySlug);
$("#searchBox").on('keypress', function (e) {
    if (e.which === 13) {
        searchBySlug();
    }
});
$("#clearSearchBtn").on('click', function () {
    $("#searchBox").val('');
    if ($("#ddlCategory").val()) {
        $("#ddlCategory").trigger('change');
    }
});

// Delete single story and refresh list by calling API again
async function deleteStory(slug) {
    if (confirm("Are you sure you want to remove this story from " + (JSON_FileName || "this category") + "?")) {
        const category = $('#ddlCategory').val();
        if (!category) return;

        showLoaderImmediate();

        let detailSegment = (activePathS3["category-index"] || activePathS3["category"] || "categories").replace(/\//g, "").replace(".json", "");
        const url = `${common.API_BASE_URL}/${detailSegment}/${encodeURIComponent(category)}/${encodeURIComponent(slug)}`;

        try {
            const response = await fetch(url, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" }
            });

            if (!response.ok) {
                const result = await response.json().catch(() => ({}));
                throw new Error(result.msg || `API delete failed with status ${response.status}`);
            }

            console.log("Story removed from category successfully via API.");
            
            // Refresh list from API again
            await refreshCategoryStories(category);
        } catch (error) {
            console.error("Error deleting story from category:", error);
            alert("Failed to remove story: " + error.message);
            hideLoaderImmediate();
        }
    }
}

// Save all order (via drag & drop or button click) and refresh list by calling API again
async function saveUPre() {
    if (!GlobalJSONObj || GlobalJSONObj.length === 0) return;

    var OrderedList = [];
    $('.storycard').each(function () {
        var _slug = $(this).attr('id');
        var item = GlobalJSONObj.filter(function (itm) {
            return itm.slug == _slug;
        });
        if (item && item.length > 0) {
            OrderedList.push(item[0]);
        }
    });

    if (OrderedList.length === 0) return;

    // Recalculate badge indexes
    $('.storycard').each(function (idx) {
        $(this).find('.order-badge').text(idx + 1);
        $(this).find('.order-input').val(idx + 1);
    });

    showLoaderImmediate();
    try {
        var meta = await WriteS3Bucket(OrderedList, JSON_FileSlug);
        if (meta && meta.err) {
            console.error("Error saving order:", meta.err);
            alert("Error saving story order: " + meta.err);
            hideLoaderImmediate();
            return;
        }

        GlobalJSONObj = OrderedList;
        console.log("The file was saved ordered!");

        const btn = $('#btnSaveAllOrder');
        const orig = btn.html();
        btn.html('<span class="glyphicon glyphicon-ok"></span> Saved!').removeClass('btn-success').addClass('btn-primary');
        setTimeout(() => {
            btn.html(orig).removeClass('btn-primary').addClass('btn-success');
        }, 1800);

        // Refresh list by calling API again
        const category = $("#ddlCategory").val();
        if (category) {
            await refreshCategoryStories(category);
        }
    } catch (e) {
        console.error("Exception saving order:", e);
        hideLoaderImmediate();
    }
}

$('#btnSaveAllOrder').on('click', saveUPre);

// Detail click
$('#divStory').on('click', '.btn-detail', function (e) {
    e.preventDefault();
    var slug = $(this).attr('data-id');
    Model("addStory.html", slug);
});

function Pagination(key) {
    lastEvaluatedKey = key;
}

function Model(pagename, slug) {
    let data = { "slug": slug, "pagename": pagename, "category": $('#ddlCategory').val() };
    ipcRenderer.send('input-broadcast', data);
}

// Empty State HTML helpers
function renderInitialState() {
    return `
        <div class="empty-state-card">
            <div class="empty-state-icon"><span class="glyphicon glyphicon-folder-open"></span></div>
            <div class="empty-state-title">Select a Category</div>
            <div class="empty-state-desc">Choose a category from the dropdown above to view, search, and manage its assigned stories.</div>
        </div>
    `;
}

function renderEmptyCategoryState() {
    return `
        <div class="empty-state-card">
            <div class="empty-state-icon"><span class="glyphicon glyphicon-inbox"></span></div>
            <div class="empty-state-title">No Stories in ${JSON_FileName || 'this Category'}</div>
            <div class="empty-state-desc">There are currently no stories assigned to this category.</div>
        </div>
    `;
}
