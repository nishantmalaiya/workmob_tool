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

let locLastEvaluatedKey = null;
let locHasMore = true;
let locLoading = false;
let locLastLoadTime = 0;

var GlobalJSONObj = null;
var JSON_FileSlug = null;
var selectedLocationName = null;
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
    GetLocationsList();
});

// Dropdown infinite scroll listener for selectize
document.addEventListener('scroll', function (e) {
    var el = e.target;
    if (!el || !el.matches) return;

    var isDropdown = el.matches('.selectize-dropdown') || el.closest('.selectize-dropdown') ||
                     el.matches('.selectize-dropdown-content') || el.closest('.selectize-dropdown-content');
    if (!isDropdown) return;

    if (!locHasMore || locLoading || !locLastEvaluatedKey) return;

    var target = el;
    var scrollPos = Math.ceil(target.scrollTop + target.clientHeight);
    var scrollHeight = target.scrollHeight;
    if (scrollPos >= scrollHeight - 50) {
        loadMoreLocations();
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

// Fetch locations list for dropdown
function GetLocationsList() {
    const currentActivePathS3 = common.getS3Path ? common.getS3Path() : activePathS3;
    const endpoint = (currentActivePathS3.location || "locations").replace(/\//g, "").replace(".json", "");
    const url = `${common.API_BASE_URL}/${endpoint}?limit=100`;

    locLastEvaluatedKey = null;
    locHasMore = true;
    locLoading = false;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            var element = [];
            element.push("<option value=\"\">-- Select Location --</option>");
            const locationsList = data.data || data.locations || (Array.isArray(data) ? data : []);
            locHasMore = data.hasMore || false;
            const nextKey = data.lastKey || data.lastEvaluatedKey;
            if (locHasMore && nextKey) {
                locLastEvaluatedKey = nextKey;
            }
            for (let index = 0; index < locationsList.length; index++) {
                var _loc = locationsList[index];
                const locName = _loc.location || _loc.title || _loc.name || '';
                const locVal = (_loc.id || _loc.location || _loc.slug || locName).toLowerCase().replace(/ /g, "_");
                if (locName) {
                    element.push("<option value=\"" + locVal + "\">" + locName + "</option>");
                }
            }
            $('#ddlLocation').html(element.join(' '));
            var $select = $("#ddlLocation").selectize({
                sortField: 'text',
                maxOptions: 100000,
                placeholder: "Select Location..."
            });
            var selectize = $select[0].selectize;
            selectize.setValue('');
        })
        .catch(err => {
            console.error("Error loading locations:", err);
        });
}

function loadMoreLocations() {
    if (!locHasMore || locLoading || !locLastEvaluatedKey) return;
    locLoading = true;

    const currentActivePathS3 = common.getS3Path ? common.getS3Path() : activePathS3;
    const endpoint = (currentActivePathS3.location || "locations").replace(/\//g, "").replace(".json", "");

    let keyParam = typeof locLastEvaluatedKey === 'object' ? JSON.stringify(locLastEvaluatedKey) : locLastEvaluatedKey;
    let url = `${common.API_BASE_URL}/${endpoint}?lastKey=${encodeURIComponent(keyParam)}`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            const locationsList = data.data || data.locations || (Array.isArray(data) ? data : []);
            locHasMore = data.hasMore || false;
            const nextKey = data.lastKey || data.lastEvaluatedKey;
            if (locHasMore && nextKey) {
                locLastEvaluatedKey = nextKey;
            } else {
                locLastEvaluatedKey = null;
            }

            var selectize = $("#ddlLocation")[0].selectize;
            for (let index = 0; index < locationsList.length; index++) {
                var _loc = locationsList[index];
                const locName = _loc.location || _loc.title || _loc.name || '';
                const locVal = (_loc.id || _loc.location || _loc.slug || locName).toLowerCase().replace(/ /g, "_");
                if (locName) {
                    selectize.addOption({ value: locVal, text: locName });
                }
            }
            selectize.refreshOptions(false);
            locLoading = false;

            if (locHasMore && locLastEvaluatedKey && Date.now() - locLastLoadTime > 800) {
                var dd = document.querySelector('.selectize-dropdown');
                if (dd && dd.style.display !== 'none') {
                    var el = dd.querySelector('.selectize-dropdown-content');
                    if (el && el.scrollHeight <= el.clientHeight + 1) {
                        locLastLoadTime = Date.now();
                        loadMoreLocations();
                    }
                }
            }
        })
        .catch(err => {
            console.error("Error loading more locations:", err);
            locLoading = false;
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

    const currentActivePathS3 = common.getS3Path ? common.getS3Path() : activePathS3;
    let endpoint = (currentActivePathS3.location || "locations").replace(/\//g, "").replace(".json", "");
    let locationSlug = $('#ddlLocation').val();

    if (!locationSlug) {
        isFetching = false;
        return;
    }

    showPaginationProgress(true);

    let keyParam = typeof lastEvaluatedKey === 'object' ? JSON.stringify(lastEvaluatedKey) : lastEvaluatedKey;
    let url = `${common.API_BASE_URL}/${endpoint}/${encodeURIComponent(locationSlug)}?lastKey=${encodeURIComponent(keyParam)}`;

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

// Location change event
$('#ddlLocation').on('change', function () {
    const selectedVal = $.trim($(this).val());
    $("#searchBox").val('');

    if (selectedVal !== "") {
        selectedLocationName = $("#" + this.id + " option:selected").text();
        refreshLocationStories(selectedVal);
    } else {
        GlobalJSONObj = null;
        $('#storyTableHeader').hide();
        $('#storyCountBadge').hide();
        $('#paginationProgress').hide();
        $('#paginationEndMessage').hide();
        $('#divStory').html(renderInitialState());
    }
});

// Refresh location stories by calling API again
async function refreshLocationStories(locationToLoad) {
    const locationSlug = locationToLoad || $.trim($('#ddlLocation').val());
    if (!locationSlug) return;

    lastEvaluatedKey = null;
    hasMoreRecords = true;
    isFetching = true;

    showLoaderImmediate();
    $('#paginationProgress').hide();
    $('#paginationEndMessage').hide();

    const currentType = (remote.getGlobal("sharedObj") && remote.getGlobal("sharedObj").currentStory) ? remote.getGlobal("sharedObj").currentStory : type;
    const currentActivePathS3 = common.getS3Path ? common.getS3Path() : activePathS3;
    const endpoint = (currentActivePathS3.location || "locations").replace(/\//g, "").replace(".json", "");

    // Except default section, limit is not passed in detail API
    let url = (currentType === "default")
        ? `${common.API_BASE_URL}/${endpoint}/${encodeURIComponent(locationSlug)}?limit=50`
        : `${common.API_BASE_URL}/${endpoint}/${encodeURIComponent(locationSlug)}`;

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
            $('#divStory').html(renderEmptyLocationState());
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

// Render Story Cards
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
        const displayOrder = (_story.index_order !== undefined && _story.index_order !== null && _story.index_order !== "")
            ? _story.index_order
            : ((_story.order !== undefined && _story.order !== null && _story.order !== "") ? _story.order : currentIndex);
        const thumbUrl = _story.thumb || FALLBACK_THUMB;
        const heading = _story.storyHeading || 'Untitled Story';
        const industry = _story.industry || 'General';
        const location = _story.location || selectedLocationName || 'N/A';
        const author = _story.name ? `<span class="story-author"><span class="glyphicon glyphicon-user"></span> ${_story.name}</span>` : '';

        cards.push(`
            <div class="storycard column" draggable="true" id="${_story.slug}">
                <div class="story-col-order">
                    <span class="drag-handle" title="Drag to reorder"><span class="glyphicon glyphicon-menu-hamburger"></span></span>
                    <span class="order-badge" id="order-${_story.slug}">${displayOrder}</span>
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

// Save Single Story Order
async function saveSingleOrder(slug) {
    const orderInput = $("#order-input-" + slug);
    const newIndex = parseInt(orderInput.val(), 10);
    const locationSlug = $("#ddlLocation").val();

    if (isNaN(newIndex)) {
        alert("Please enter a valid number");
        return;
    }

    showLoaderImmediate();

    try {
        const currentType = (remote.getGlobal("sharedObj") && remote.getGlobal("sharedObj").currentStory) ? remote.getGlobal("sharedObj").currentStory : type;
        const currentActivePathS3 = common.getS3Path ? common.getS3Path() : activePathS3;
        const endpoint = (currentActivePathS3.location || "locations").replace(/\//g, "").replace(".json", "");

        // Except default section, call POST method in API
        const httpMethod = (currentType === "default") ? "PUT" : "POST";

        // While POST, remove slug from the end of URL
        const url = (httpMethod === "POST")
            ? `${common.API_BASE_URL}/${endpoint}/${encodeURIComponent(locationSlug)}`
            : `${common.API_BASE_URL}/${endpoint}/${encodeURIComponent(locationSlug)}/${encodeURIComponent(slug)}`;

        console.log(`Updating order for slug: ${slug} in location: ${locationSlug} to index: ${newIndex} using ${httpMethod} on ${url} (section: ${currentType})`);

        // Find respective story data from loaded stories
        const storyItem = (GlobalJSONObj || []).find(item => item && item.slug === slug) || {};

        // In case of POST API send respective all data with index_order
        const requestPayload = (httpMethod === "POST")
            ? { ...storyItem, slug: slug, location: storyItem.location || selectedLocationName, index_order: newIndex, order: newIndex }
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
        await refreshLocationStories(locationSlug);
    } catch (err) {
        console.error('Error saving order:', err);
        alert('Error saving order: ' + err.message);
        hideLoaderImmediate();
    }
}

// Search by slug
async function searchBySlug() {
    const searchTerm = $("#searchBox").val().trim();
    const locationSlug = $("#ddlLocation").val();

    if (!searchTerm) {
        alert("Please enter a slug to search");
        return;
    }

    if (!locationSlug) {
        alert("Please select a location first");
        return;
    }

    showLoaderImmediate();
    $('#paginationProgress').hide();
    $('#paginationEndMessage').hide();

    const currentActivePathS3 = common.getS3Path ? common.getS3Path() : activePathS3;
    const endpoint = (currentActivePathS3.location || "locations").replace(/\//g, "").replace(".json", "");
    let url = `${common.API_BASE_URL}/${endpoint}/${encodeURIComponent(locationSlug)}?slug=${encodeURIComponent(searchTerm)}`;

    console.log('Search URL:', url);

    try {
        let results = [];
        try {
            const response = await fetch(url);
            if (response.ok) {
                const json = await response.json();
                results = json.stories || json.data || (Array.isArray(json) ? json : []);
            }
        } catch (e) {
            console.log("API search failed, falling back to local filter:", e);
        }

        if (results.length === 0 && GlobalJSONObj && GlobalJSONObj.length > 0) {
            const termLower = searchTerm.toLowerCase();
            results = GlobalJSONObj.filter(s =>
                (s.slug && s.slug.toLowerCase().includes(termLower)) ||
                (s.storyHeading && s.storyHeading.toLowerCase().includes(termLower)) ||
                (s.name && s.name.toLowerCase().includes(termLower))
            );
        }

        if (results.length > 0) {
            GlobalJSONObj = results;
            selectedLocationName = "Search Results";
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
                    <div class="empty-state-desc">No stories matched "<strong>${searchTerm}</strong>" in ${selectedLocationName || 'this location'}. Click Clear to view all stories.</div>
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
    if ($("#ddlLocation").val()) {
        $("#ddlLocation").trigger('change');
    }
});

// Delete single story and refresh list by calling API again
async function deleteStory(slug) {
    if (confirm("Are you sure you want to remove this story from " + (selectedLocationName || "this location") + "?")) {
        const locationSlug = $('#ddlLocation').val();
        if (!locationSlug) return;

        showLoaderImmediate();

        const currentActivePathS3 = common.getS3Path ? common.getS3Path() : activePathS3;
        const endpoint = (currentActivePathS3.location || "locations").replace(/\//g, "").replace(".json", "");
        const url = `${common.API_BASE_URL}/${endpoint}/${encodeURIComponent(locationSlug)}/${encodeURIComponent(slug)}`;

        try {
            const response = await fetch(url, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" }
            });

            if (!response.ok) {
                const result = await response.json().catch(() => ({}));
                throw new Error(result.msg || `API delete failed with status ${response.status}`);
            }

            console.log("Story removed from location successfully via API.");
            await refreshLocationStories(locationSlug);
        } catch (error) {
            console.error("Error deleting story from location:", error);
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
        const locationSlug = $('#ddlLocation').val();
        const currentActivePathS3 = common.getS3Path ? common.getS3Path() : activePathS3;
        var s3Path = (currentActivePathS3.location || "locations") + "/" + locationSlug + ".json";
        var meta = await WriteS3Bucket(OrderedList, s3Path);
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

        if (locationSlug) {
            await refreshLocationStories(locationSlug);
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
    let data = { "slug": slug, "pagename": pagename, "category": $('#ddlLocation').val() };
    ipcRenderer.send('input-broadcast', data);
}

// Empty State HTML helpers
function renderInitialState() {
    return `
        <div class="empty-state-card">
            <div class="empty-state-icon"><span class="glyphicon glyphicon-map-marker"></span></div>
            <div class="empty-state-title">Select a Location</div>
            <div class="empty-state-desc">Choose a location from the dropdown above to view, search, and manage its assigned stories.</div>
        </div>
    `;
}

function renderEmptyLocationState() {
    return `
        <div class="empty-state-card">
            <div class="empty-state-icon"><span class="glyphicon glyphicon-inbox"></span></div>
            <div class="empty-state-title">No Stories in ${selectedLocationName || 'this Location'}</div>
            <div class="empty-state-desc">There are currently no stories assigned to this location.</div>
        </div>
    `;
}
