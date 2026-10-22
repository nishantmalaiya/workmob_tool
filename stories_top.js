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

const PATH_KEY = "stories-top";
const FALLBACK_PATH = "stories-top";
const MODEL_CATEGORY = "stories-top";

var GlobalJSONObj = [];
var lastKey = '';
var hasMore = false;
var isFetching = false;

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
    $('#storyTableHeader').hide();
    $('#paginationProgress').hide();
    $('#paginationEndMessage').hide();
    storiestopList();
});

function storiestopList() {
    GlobalJSONObj = [];
    lastKey = '';
    hasMore = false;
    isFetching = false;
    $('#divStory').html('');
    $('#storyTableHeader').hide();
    $('#paginationProgress').hide();
    $('#paginationEndMessage').hide();

    fetchNextPageOfStories(true);
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

function updateStatsBadge() {
    if (GlobalJSONObj && GlobalJSONObj.length > 0) {
        const suffix = hasMore ? ' (scroll for more)' : ' (all loaded)';
        $('#storyCountBadge').text(`${GlobalJSONObj.length} ${GlobalJSONObj.length === 1 ? 'story' : 'stories'}${suffix}`).show();
    } else {
        $('#storyCountBadge').hide();
    }
}

async function fetchNextPageOfStories(isInitial) {
    if (isFetching) return;
    isFetching = true;

    if (isInitial) {
        showLoaderImmediate();
    } else {
        showPaginationProgress(true);
    }

    const currentType = (remote.getGlobal("sharedObj") && remote.getGlobal("sharedObj").currentStory) ? remote.getGlobal("sharedObj").currentStory : type;
    const currentActivePathS3 = common.getS3Path ? common.getS3Path() : activePathS3;
    const endpoint = (currentActivePathS3[PATH_KEY] || FALLBACK_PATH).replace(/\//g, "").replace(".json", "");

    // Except default section, limit is not passed in detail API
    let url = (currentType === "default")
        ? `${common.API_BASE_URL}/${endpoint}?limit=50`
        : `${common.API_BASE_URL}/${endpoint}`;

    if (lastKey) {
        let keyParam = typeof lastKey === 'object' ? JSON.stringify(lastKey) : lastKey;
        url += (url.includes('?') ? '&' : '?') + `lastKey=${encodeURIComponent(keyParam)}`;
    }

    console.log("stories_top.js: Fetching URL:", url);

    try {
        const response = await fetch(url);
        const data = await response.json();

        let fetchedStories = data.stories || data.data || data || [];
        if (!Array.isArray(fetchedStories) && typeof fetchedStories === 'object') {
            fetchedStories = fetchedStories.stories || fetchedStories.data || [];
        }

        var startIndex = GlobalJSONObj.length;
        GlobalJSONObj = [...GlobalJSONObj, ...fetchedStories];

        lastKey = data.lastKey || data.lastEvaluatedKey || '';
        hasMore = data.hasMore === true || (lastKey ? true : false);

        if (GlobalJSONObj.length > 0) {
            $('#storyTableHeader').show();
            if (isInitial) {
                $('#divStory').html(RenderStory(GlobalJSONObj, 0).join(" "));
            } else if (fetchedStories.length > 0) {
                $('#divStory').append(RenderStory(fetchedStories, startIndex).join(" "));
            }

            var cols = document.querySelectorAll('#divStory .column');
            [].forEach.call(cols, addDnDHandlers);
        } else {
            $('#storyTableHeader').hide();
            $('#divStory').html(renderEmptyState());
        }

        if (!hasMore && GlobalJSONObj.length > 0) {
            $('#totalStoriesCount').text(GlobalJSONObj.length);
            $('#paginationEndMessage').show();
        } else {
            $('#paginationEndMessage').hide();
        }
    } catch (err) {
        console.error("stories_top.js: Error fetching stories:", err);
        if (GlobalJSONObj.length === 0) {
            $('#storyTableHeader').hide();
            $('#divStory').html('<div class="empty-state-card text-danger"><p>Error loading stories</p></div>');
        }
    } finally {
        isFetching = false;
        if (isInitial) {
            hideLoaderImmediate();
        } else {
            showPaginationProgress(false);
        }
        updateStatsBadge();
    }
}

// Render Story Cards using modern UI and index_order
function RenderStory(stories, startIndex) {
    var cards = [];
    startIndex = startIndex || 0;

    for (let index = 0; index < stories.length; index++) {
        var _story = stories[index];
        var currentIndex = startIndex + index + 1;
        const displayOrder = (_story.index_order !== undefined && _story.index_order !== null && _story.index_order !== "")
            ? _story.index_order
            : ((_story.order !== undefined && _story.order !== null && _story.order !== "") ? _story.order : currentIndex);
        const thumbUrl = _story.thumb || FALLBACK_THUMB;
        const heading = _story.storyHeading || 'Untitled Story';
        const industry = _story.industry || 'General';
        const location = _story.location || 'N/A';
        const author = _story.name ? `<span class="story-author"><span class="glyphicon glyphicon-user"></span> ${_story.name}</span>` : '';

        cards.push(`
            <div class="storycard column" draggable="true" id="${_story.slug}">
                <div class="story-col-order">
                    <span class="drag-handle" title="Drag to reorder"><span class="glyphicon glyphicon-menu-hamburger"></span></span>
                    <span class="order-badge" id="order-${_story.slug}">${displayOrder}</span>
                    <input type="checkbox" class="story-chk" name="chkSlug" value="${_story.slug}">
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
                    <button type="button" class="btn btn-sm btn-default btn-update-order" onclick="showOrderInput('${_story.slug}', ${displayOrder})">
                        <span class="glyphicon glyphicon-sort"></span> Update Order
                    </button>
                    <span class="order-edit-group" id="order-group-${_story.slug}" style="display:none;">
                        <input type="number" id="order-input-${_story.slug}" class="order-input form-control input-sm" value="${displayOrder}">
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
function showOrderInput(slug, currentOrder) {
    const group = $("#order-group-" + slug);
    const input = $("#order-input-" + slug);
    if (group.is(":visible")) {
        group.hide();
    } else {
        input.val(currentOrder);
        group.css('display', 'inline-flex');
        input.focus();
    }
}

// Save Single Story Order (same as categories.js)
async function saveSingleOrder(slug) {
    const orderInput = $("#order-input-" + slug);
    const newIndex = parseInt(orderInput.val(), 10);

    if (isNaN(newIndex)) {
        alert("Please enter a valid number");
        return;
    }

    showLoaderImmediate();

    try {
        const currentType = (remote.getGlobal("sharedObj") && remote.getGlobal("sharedObj").currentStory) ? remote.getGlobal("sharedObj").currentStory : type;
        const currentActivePathS3 = common.getS3Path ? common.getS3Path() : activePathS3;
        const endpoint = (currentActivePathS3[PATH_KEY] || FALLBACK_PATH).replace(/\//g, "").replace(".json", "");

        // Except default section, call POST method in API
        const httpMethod = (currentType === "default") ? "PUT" : "POST";

        // While POST, remove slug from the end of URL
        const url = (httpMethod === "POST")
            ? `${common.API_BASE_URL}/${endpoint}`
            : `${common.API_BASE_URL}/${endpoint}/${encodeURIComponent(slug)}`;

        console.log(`Updating order for slug: ${slug} to index: ${newIndex} using ${httpMethod} on ${url} (section: ${currentType})`);

        // Find respective story data from loaded stories
        const storyItem = (GlobalJSONObj || []).find(item => item && item.slug === slug) || {};

        // In case of POST API send respective all data with index_order
        const requestPayload = (httpMethod === "POST")
            ? { ...storyItem, slug: slug, index_order: newIndex, order: newIndex }
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
        storiestopList();
    } catch (err) {
        console.error('Error saving order:', err);
        alert('Error saving order: ' + err.message);
        hideLoaderImmediate();
    }
}

// Delete single story and refresh list by calling API again
async function deleteStory(slug) {
    if (confirm("Are you sure you want to remove this story?")) {
        showLoaderImmediate();

        const currentActivePathS3 = common.getS3Path ? common.getS3Path() : activePathS3;
        const endpoint = (currentActivePathS3[PATH_KEY] || FALLBACK_PATH).replace(/\//g, "").replace(".json", "");
        const url = `${common.API_BASE_URL}/${endpoint}/${encodeURIComponent(slug)}`;

        try {
            const response = await fetch(url, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" }
            });

            if (!response.ok) {
                const result = await response.json().catch(() => ({}));
                throw new Error(result.msg || `API delete failed with status ${response.status}`);
            }

            console.log("Story removed successfully via API.");
            storiestopList();
        } catch (error) {
            console.error("Error deleting story:", error);
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

    // Recalculate badge indexes and index_order
    OrderedList.forEach((itm, idx) => {
        itm.index_order = idx + 1;
        itm.order = idx + 1;
    });

    $('.storycard').each(function (idx) {
        $(this).find('.order-badge').text(idx + 1);
        $(this).find('.order-input').val(idx + 1);
    });

    showLoaderImmediate();
    try {
        const currentActivePathS3 = common.getS3Path ? common.getS3Path() : activePathS3;
        var meta = await WriteS3Bucket(OrderedList, currentActivePathS3[PATH_KEY]);
        if (meta && meta.err) {
            console.error("Error saving order:", meta.err);
            alert("Error saving story order: " + meta.err);
            hideLoaderImmediate();
            return;
        }

        GlobalJSONObj = OrderedList;
        console.log("The file was saved ordered!");

        const btn = $('#btnSaveAllOrder, #btnUpdateStory');
        const orig = btn.html();
        btn.html('<span class="glyphicon glyphicon-ok"></span> Saved!').removeClass('btn-success').addClass('btn-primary');
        setTimeout(() => {
            btn.html(orig).removeClass('btn-primary').addClass('btn-success');
        }, 1800);

        storiestopList();
    } catch (e) {
        console.error("Exception saving order:", e);
        hideLoaderImmediate();
    }
}

$('#btnSaveAllOrder, #btnUpdateStory').on('click', saveUPre);

// Remove Selected Stories
$('#btnRemoveSelected').on('click', async function () {
    const selectedCheckboxes = $('.story-chk:checked');
    if (selectedCheckboxes.length === 0) {
        alert("Please select at least one story to remove.");
        return;
    }

    if (confirm(`Are you sure you want to remove ${selectedCheckboxes.length} selected stor${selectedCheckboxes.length === 1 ? 'y' : 'ies'}?`)) {
        showLoaderImmediate();
        const currentActivePathS3 = common.getS3Path ? common.getS3Path() : activePathS3;
        const endpoint = (currentActivePathS3[PATH_KEY] || FALLBACK_PATH).replace(/\//g, "").replace(".json", "");

        for (let i = 0; i < selectedCheckboxes.length; i++) {
            let deleteSlug = $(selectedCheckboxes[i]).val();
            try {
                const url = `${common.API_BASE_URL}/${endpoint}/${encodeURIComponent(deleteSlug)}`;
                await fetch(url, {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" }
                });
            } catch (e) {
                console.error(`Error deleting story ${deleteSlug}:`, e);
            }
        }
        storiestopList();
    }
});

// Remove All Stories
$('#btnRemoveAll').on('click', async function () {
    const allCheckboxes = $('.story-chk');
    if (allCheckboxes.length === 0) {
        alert("No stories to remove.");
        return;
    }

    if (confirm('Are you sure? ALL stories in this list will be removed!')) {
        showLoaderImmediate();
        const currentActivePathS3 = common.getS3Path ? common.getS3Path() : activePathS3;
        const endpoint = (currentActivePathS3[PATH_KEY] || FALLBACK_PATH).replace(/\//g, "").replace(".json", "");

        for (let i = 0; i < allCheckboxes.length; i++) {
            let deleteSlug = $(allCheckboxes[i]).val();
            try {
                const url = `${common.API_BASE_URL}/${endpoint}/${encodeURIComponent(deleteSlug)}`;
                await fetch(url, {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" }
                });
            } catch (e) {
                console.error(`Error deleting story ${deleteSlug}:`, e);
            }
        }
        storiestopList();
    }
});

// Select All checkbox in header
$(document).on('change', '#chkSelectAll', function () {
    const isChecked = $(this).is(':checked');
    $('.story-chk').prop('checked', isChecked);
});

// Search by slug or keyword
async function searchBySlug() {
    const searchTerm = $("#searchBox").val().trim().toLowerCase();
    if (!searchTerm) {
        alert("Please enter a slug or heading to search");
        return;
    }

    showLoaderImmediate();
    $('#paginationProgress').hide();
    $('#paginationEndMessage').hide();

    try {
        const currentActivePathS3 = common.getS3Path ? common.getS3Path() : activePathS3;
        const endpoint = (currentActivePathS3[PATH_KEY] || FALLBACK_PATH).replace(/\//g, "").replace(".json", "");
        let url = `${common.API_BASE_URL}/${endpoint}?slug=${encodeURIComponent(searchTerm)}`;

        console.log('Search URL:', url);
        let results = [];
        try {
            const response = await fetch(url);
            if (response.ok) {
                const json = await response.json();
                results = json.stories || json.data || (Array.isArray(json) ? json : []);
            }
        } catch (e) {
            console.log('API search failed, falling back to local filter:', e);
        }

        // Fallback to local filter if API search doesn't return results
        if (results.length === 0 && GlobalJSONObj && GlobalJSONObj.length > 0) {
            results = GlobalJSONObj.filter(s =>
                (s.slug && s.slug.toLowerCase().includes(searchTerm)) ||
                (s.storyHeading && s.storyHeading.toLowerCase().includes(searchTerm)) ||
                (s.name && s.name.toLowerCase().includes(searchTerm))
            );
        }

        if (results.length > 0) {
            $('#storyTableHeader').show();
            $("#divStory").html(RenderStory(results, 0).join(" "));
            $('#storyCountBadge').text(`${results.length} result${results.length === 1 ? '' : 's'}`).show();

            var cols = document.querySelectorAll('#divStory .column');
            [].forEach.call(cols, addDnDHandlers);
            hasMore = false;
        } else {
            $('#storyTableHeader').hide();
            $('#storyCountBadge').hide();
            $("#divStory").html(`
                <div class="empty-state-card">
                    <div class="empty-state-icon"><span class="glyphicon glyphicon-search"></span></div>
                    <div class="empty-state-title">No Results Found</div>
                    <div class="empty-state-desc">No stories matched "<strong>${searchTerm}</strong>". Click Clear to restore the list.</div>
                </div>
            `);
        }
    } catch (err) {
        console.error("Error searching stories:", err);
    } finally {
        hideLoaderImmediate();
    }
}

$("#searchBtn").on('click', searchBySlug);
$("#searchBox").on('keypress', function (e) {
    if (e.which === 13) {
        e.preventDefault();
        searchBySlug();
    }
});
$("#clearSearchBtn").on('click', function () {
    $("#searchBox").val('');
    storiestopList();
});

// Detail click
$('#divStory').on('click', '.btn-detail', function (e) {
    e.preventDefault();
    var slug = $(this).attr('data-id');
    Model("addStory.html", slug);
});

function Model(pagename, slug) {
    let data = { "slug": slug, "pagename": pagename, "category": MODEL_CATEGORY };
    ipcRenderer.send('input-broadcast', data);
}

// Window scroll listener for infinite scroll pagination
let scrollTimeout;
$(window).on("scroll", function () {
    if (!hasMore || isFetching || !lastKey) return;
    if (scrollTimeout) clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
        var scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
        var windowHeight = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight || 0;
        var documentHeight = document.documentElement.scrollHeight || document.body.scrollHeight || 0;

        if (scrollTop + windowHeight >= documentHeight - 300) {
            if (hasMore && !isFetching) {
                fetchNextPageOfStories(false);
            }
        }
    }, 150);
});

// Empty State HTML helper
function renderEmptyState() {
    return `
        <div class="empty-state-card">
            <div class="empty-state-icon"><span class="glyphicon glyphicon-inbox"></span></div>
            <div class="empty-state-title">No Stories Found</div>
            <div class="empty-state-desc">There are currently no stories in this list.</div>
        </div>
    `;
}

// Backwards-compatibility aliases
function refreshVisibleStories() {
    storiestopList();
}
function ReOrderStory() {
    saveUPre();
}
