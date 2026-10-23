const fs = require('fs');
const path = require('path');
var remote = require('@electron/remote');
var ipcRenderer = require('electron').ipcRenderer;
const dialog = remote.dialog;
let common = require('../Js/config');
let activePathS3 = common.getS3Path();
var type = remote.getGlobal("sharedObj") ? remote.getGlobal("sharedObj").currentStory : "default";

let allRecords = [];
let isFetching = false;
let lastKey = '';
let hasMore = true;
let currentSearchQuery = '';

const LOCATIONS_API_BASE = (common && common.API_BASE_URL)
    ? `${common.API_BASE_URL}/locations`
    : "https://r5dojmizdd.execute-api.ap-south-1.amazonaws.com/prod/locations";

$(document).ready(function () {
    bindEvents();
    locationMasterList();
});

function escapeHtml(str) {
    if (str === undefined || str === null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function showLoaderImmediate() {
    $('body').removeClass('loaded');
    $('#loader-wrapper').css({ visibility: 'visible', transform: 'translateY(0)', transition: 'none' });
}

function hideLoaderImmediate() {
    $('body').addClass('loaded');
    $('#loader-wrapper').css({ visibility: 'hidden', transform: 'translateY(-100%)', transition: 'none' });
    $('.loader-section').css({ transition: 'none' });
}

function focusInput(id) {
    setTimeout(function () {
        var el = document.getElementById(id);
        if (el) { el.focus(); if (el.select) el.select(); }
    }, 100);
}

function updateLocationBadge() {
    if (allRecords && allRecords.length > 0) {
        const suffix = hasMore ? ' (fetching...)' : ' (all loaded)';
        $('#locationCountBadge').text(`${allRecords.length} ${allRecords.length === 1 ? 'location' : 'locations'}${suffix}`).show();
    } else {
        $('#locationCountBadge').hide();
    }
}

function sortLocations(list) {
    if (!list || !Array.isArray(list)) return [];
    return list.sort((a, b) => {
        const hasOrderA = (a.index_order !== undefined && a.index_order !== null && a.index_order !== '' && !isNaN(a.index_order) && Number(a.index_order) > 0);
        const hasOrderB = (b.index_order !== undefined && b.index_order !== null && b.index_order !== '' && !isNaN(b.index_order) && Number(b.index_order) > 0);

        if (hasOrderA && hasOrderB) {
            const diff = Number(a.index_order) - Number(b.index_order);
            if (diff !== 0) return diff;
        } else if (hasOrderA) {
            return -1;
        } else if (hasOrderB) {
            return 1;
        }

        const nameA = String(a.location || a.id || '').trim();
        const nameB = String(b.location || b.id || '').trim();
        return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
    });
}

function bindEvents() {
    // Top save all order button
    $('#btnSaveAllOrder').on('click', function () {
        saveUPre();
    });

    // Add New Location button
    $("#btnAddLocation").on('click', function () {
        $('#txtLocation').val('');
        $('#txtLocationId').val('').prop('disabled', false).prop('readonly', false);
        $('#hdnLocationId').val('');
        $('#index_order').val('0');
        $('#modalTitleText').text("Add New Location");
        $('#txtLocationIdNote').text("Canonical ID is permanent once created and used as the unique key. If left blank, it will be generated automatically.");
        $('#locationModal').modal('show');
        focusInput('txtLocation');
    });

    // Auto-fill txtLocationId on input in txtLocation when adding new
    $('#txtLocation').on('input', function () {
        if ($('#hdnLocationId').val() === '') {
            const generated = $(this).val().toLowerCase().trim().replace(/[^a-z0-9\s_]/gi, '').replace(/\s+/g, '_');
            $('#txtLocationId').val(generated);
        }
    });

    // Modal cancel/close click
    $("#btnClose").on('click', function () {
        $('#locationModal').modal('hide');
    });

    // Modal save location button
    $("#btnSave").on('click', function () {
        handleSaveLocation();
    });

    // Search events
    $("#btnSearch").on('click', function () {
        SearchOnLocation();
    });

    $("#btnClearSearch").on('click', function () {
        ClearSearchOnLocation();
    });

    $('#txtSearchLocation').on('keypress', function (e) {
        if (e.which === 13) {
            SearchOnLocation();
        }
    });

    $('#txtSearchLocation').on('keyup', function () {
        const query = $('#txtSearchLocation').val().trim();
        if (query.length >= 2) {
            SearchOnLocation();
        } else if (query.length === 0) {
            ClearSearchOnLocation();
        }
    });

    // Delegated click handler for Edit button
    $('#divStory').on('click', '.btn-edit', function (e) {
        e.preventDefault();
        const id = $(this).attr('data-id');
        const locationName = $(this).attr('data-location');
        const order = $(this).attr('data-order');
        editLocation(locationName, id, order);
    });

    // Delegated click handler for Delete button
    $('#divStory').on('click', '.btn-delete', function (e) {
        e.preventDefault();
        const id = $(this).attr('data-id');
        const locationName = $(this).attr('data-location');
        deleteLocation(id, locationName);
    });

    // Delegated click handler for Update Order toggle button
    $('#divStory').on('click', '.btn-update-order', function (e) {
        e.preventDefault();
        const id = $(this).attr('data-id');
        const currOrder = $(this).attr('data-order') || '0';
        const group = $(`#order-group-${id}`);
        const input = $(`#order-input-${id}`);

        $('.order-edit-group').not(group).hide();

        if (group.is(':visible')) {
            group.hide();
        } else {
            input.val(currOrder !== '-' ? currOrder : '0');
            group.css('display', 'inline-flex');
            input.focus().select();
        }
    });

    // Delegated click handler for single Save Order button
    $('#divStory').on('click', '.btn-save-order', function (e) {
        e.preventDefault();
        const id = $(this).attr('data-id');
        saveSingleOrder(id);
    });

    // Enter key inside inline order input
    $('#divStory').on('keypress', '.order-input', function (e) {
        if (e.which === 13) {
            e.preventDefault();
            const id = $(this).attr('id').replace('order-input-', '');
            saveSingleOrder(id);
        }
    });
}

// Initial Location List Load
async function locationMasterList() {
    allRecords = [];
    lastKey = '';
    hasMore = true;

    $('#divStory').html('');
    $('#locationTableHeader').show();
    $('#locPaginationProgress').hide();
    $('#locPaginationEndMessage').hide();

    await loadAllLocations();
}

// Fetch all locations from API
async function loadAllLocations() {
    if (isFetching) return;
    isFetching = true;

    showLoaderImmediate();
    $('#locPaginationStats').text("Fetching records from API...");
    $('#locPaginationProgress').show();
    $('#locPaginationEndMessage').hide();

    try {
        let hasMorePages = true;
        while (hasMorePages) {
            const url = lastKey
                ? `${LOCATIONS_API_BASE}?lastKey=${encodeURIComponent(lastKey)}`
                : LOCATIONS_API_BASE;

            const response = await fetch(url);
            if (!response.ok) throw new Error(`API failed with status ${response.status}`);

            const data = await response.json();
            const records = data.data || data.locations || (Array.isArray(data) ? data : []);

            if (records.length > 0) {
                // Normalize index_order on incoming records
                records.forEach(r => {
                    if (r.index_order !== undefined && r.index_order !== null && r.index_order !== '') {
                        r.index_order = parseInt(r.index_order, 10);
                    } else if (r.order !== undefined && r.order !== null && r.order !== '') {
                        r.index_order = parseInt(r.order, 10);
                    } else {
                        r.index_order = 0;
                    }
                });
                allRecords = [...allRecords, ...records];
            }

            hasMorePages = !!data.hasMore;
            lastKey = data.lastKey || '';
            if (!hasMorePages) break;
        }

        hasMore = false;
        sortLocations(allRecords);

        $('#divStory').html('');
        await renderData(allRecords);

        updateLocationBadge();

        if (allRecords.length > 0) {
            $('#totalLocationsCount').text(allRecords.length);
            $('#locPaginationEndMessage').show();
        }
    } catch (e) {
        console.error("Error loading locations:", e);
        dialog.showMessageBoxSync({ type: 'error', buttons: ['OK'], message: 'Error loading locations: ' + e.message });
    } finally {
        $('#locPaginationProgress').hide();
        hideLoaderImmediate();
        isFetching = false;
        updateLocationBadge();
    }
}

// Render Location Cards (same format as category_master)
async function renderData(locations) {
    if (!locations || locations.length === 0) return;

    var cards = [];
    for (let index = 0; index < locations.length; index++) {
        var record = locations[index];
        const displayOrder = (record.index_order !== undefined && record.index_order !== null && record.index_order !== '' && record.index_order !== 0)
            ? record.index_order
            : (index + 1);
        const locationName = record.location || '-';
        const locationId = record.id || '';

        cards.push(`
            <div class="storycard column" draggable="true" name="location" id="${escapeHtml(locationId)}">
                <div class="col-cell col-order">
                    <span class="drag-handle" title="Drag to reorder"><span class="glyphicon glyphicon-menu-hamburger"></span></span>
                    <span class="order-badge">${escapeHtml(displayOrder)}</span>
                </div>
                <div class="col-cell col-title">
                    <span class="cat-title-text" title="${escapeHtml(locationName)}">${escapeHtml(locationName)}</span>
                </div>
                <div class="col-cell col-slug">
                    <code class="cat-slug-badge" title="${escapeHtml(locationId)}">${escapeHtml(locationId)}</code>
                </div>
                <div class="col-cell col-actions text-right">
                    <button type="button" class="btn btn-sm btn-default btn-update-order" data-id="${escapeHtml(locationId)}" data-order="${escapeHtml(displayOrder !== '-' ? displayOrder : '0')}" title="Update display order">
                        <span class="glyphicon glyphicon-sort"></span> Update Order
                    </button>
                    <span class="order-edit-group" id="order-group-${escapeHtml(locationId)}" style="display:none;">
                        <input type="number" id="order-input-${escapeHtml(locationId)}" class="order-input form-control input-sm" value="${escapeHtml(displayOrder !== '-' ? displayOrder : '0')}" min="0">
                        <button type="button" id="save-order-${escapeHtml(locationId)}" class="btn btn-sm btn-success btn-save-order" data-id="${escapeHtml(locationId)}">
                            <span class="glyphicon glyphicon-ok"></span> Save
                        </button>
                    </span>
                    <button type="button" class="btn btn-sm btn-info btn-edit" data-id="${escapeHtml(locationId)}" data-location="${escapeHtml(locationName)}" data-order="${escapeHtml(displayOrder !== '-' ? displayOrder : '0')}">
                        <span class="glyphicon glyphicon-pencil"></span> Edit
                    </button>
                    <button type="button" class="btn btn-sm btn-danger btn-delete" data-id="${escapeHtml(locationId)}" data-location="${escapeHtml(locationName)}">
                        <span class="glyphicon glyphicon-trash"></span> Delete
                    </button>
                </div>
            </div>
        `);
    }

    $('#divStory').html(cards.join(' '));

    // Reattach drag-and-drop handlers for all cards
    const cols = document.querySelectorAll('#divStory .column');
    if (typeof addDnDHandlers === 'function') {
        [].forEach.call(cols, addDnDHandlers);
    }
}

// Save Single Location Order
async function saveSingleOrder(id) {
    const orderInput = $(`#order-input-${id}`);
    const newOrder = parseInt(orderInput.val(), 10);
    if (isNaN(newOrder) || newOrder < 0) {
        dialog.showMessageBoxSync({ type: 'warning', buttons: ['OK'], message: 'Please enter a valid order number (0 or greater).' });
        return;
    }

    const rec = allRecords.find(r => r.id === id);
    if (!rec) return;

    const $saveBtn = $(`#save-order-${id}`);
    const origBtnHtml = $saveBtn.html();
    $saveBtn.prop('disabled', true).html('<span class="glyphicon glyphicon-refresh spin-icon"></span>');

    try {
        const response = await fetch(`${LOCATIONS_API_BASE}/${encodeURIComponent(id)}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id: rec.id,
                location: rec.location,
                index_order: newOrder
            })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.msg || errData.error || `Failed with status ${response.status}`);
        }

        rec.index_order = newOrder;
        $(`#order-group-${id}`).hide();

        // Update DOM badge and button attribute
        $(`.storycard#${id} .order-badge`).text(newOrder);
        $(`.storycard#${id} .btn-update-order`).attr('data-order', newOrder);

        // Re-sort in memory and re-render
        sortLocations(allRecords);
        await renderData(allRecords);

        const options = { title: 'Order Updated', message: `Order for "${rec.location}" updated to ${newOrder} successfully!`, detail: '' };
        dialog.showMessageBox(null, options);
    } catch (e) {
        console.error("Error updating single order:", e);
        dialog.showMessageBoxSync({ type: 'error', buttons: ['OK'], message: 'Failed to update order: ' + e.message });
    } finally {
        $saveBtn.prop('disabled', false).html(origBtnHtml);
    }
}

// Save All Orders (via Drag & Drop or Save All Order button)
async function saveUPre() {
    const cardElems = $('#divStory .storycard');
    if (!cardElems.length) return;

    let changedItems = [];
    cardElems.each(function (idx) {
        const id = $(this).attr('id');
        const newOrder = idx + 1;
        $(this).find('.order-badge').text(newOrder);
        $(this).find('.order-input').val(newOrder);
        $(this).find('.btn-update-order').attr('data-order', newOrder);

        const rec = allRecords.find(r => r.id === id);
        if (rec) {
            if (rec.index_order !== newOrder) {
                rec.index_order = newOrder;
                changedItems.push(rec);
            }
        }
    });

    if (changedItems.length === 0) {
        const $btn = $('#btnSaveAllOrder');
        const origHtml = $btn.html();
        $btn.html('<span class="glyphicon glyphicon-ok"></span> All Up to Date!').removeClass('btn-success').addClass('btn-info');
        setTimeout(() => {
            $btn.html(origHtml).removeClass('btn-info').addClass('btn-success');
        }, 1500);
        return;
    }

    const $btn = $('#btnSaveAllOrder');
    const origHtml = $btn.html();
    $btn.prop('disabled', true).html('<span class="glyphicon glyphicon-refresh spin-icon"></span> Saving Orders...');

    try {
        // Save changed items to API in concurrent batches of 5
        for (let i = 0; i < changedItems.length; i += 5) {
            const batch = changedItems.slice(i, i + 5);
            await Promise.all(batch.map(item => {
                return fetch(`${LOCATIONS_API_BASE}/${encodeURIComponent(item.id)}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        id: item.id,
                        location: item.location,
                        index_order: item.index_order
                    })
                });
            }));
        }

        $btn.html('<span class="glyphicon glyphicon-ok"></span> Order Saved!').removeClass('btn-success').addClass('btn-primary');
        setTimeout(() => {
            $btn.prop('disabled', false).html(origHtml).removeClass('btn-primary').addClass('btn-success');
        }, 1800);
    } catch (e) {
        console.error("Error saving bulk order:", e);
        $btn.prop('disabled', false).html(origHtml);
        dialog.showMessageBoxSync({ type: 'error', buttons: ['OK'], message: 'Failed to save all orders: ' + e.message });
    }
}
window.saveUPre = saveUPre;

// Prefill form for editing location
function editLocation(locationName, id, order) {
    $('#modalTitleText').text("Edit Location");
    $('#txtLocation').val(locationName);
    $('#txtLocationId').val(id).prop('disabled', true).prop('readonly', true);
    $('#hdnLocationId').val(id);
    $('#index_order').val(order !== undefined && order !== null && order !== '-' ? order : '0');
    $('#txtLocationIdNote').text("Location ID cannot be modified during edit.");
    $('#locationModal').modal('show');
    focusInput('txtLocation');
}

// Delete location
async function deleteLocation(id, name) {
    const locDisplayName = name || id;
    if (confirm(`Are you sure you want to delete location "${locDisplayName}"?`)) {
        showLoaderImmediate();
        try {
            const url = `${LOCATIONS_API_BASE}/${encodeURIComponent(id)}`;
            const response = await fetch(url, { method: "DELETE" });
            const result = await response.json().catch(() => ({}));

            if (response.ok) {
                dialog.showMessageBoxSync({ type: 'info', buttons: ['OK'], message: 'Location deleted successfully' });
                await locationMasterList();
            } else {
                dialog.showMessageBoxSync({ type: 'error', buttons: ['OK'], message: 'Error deleting location: ' + (result.msg || result.error || 'Unknown error') });
            }
        } catch (e) {
            console.error("Delete error:", e);
            dialog.showMessageBoxSync({ type: 'error', buttons: ['OK'], message: 'Failed to delete location' });
        } finally {
            hideLoaderImmediate();
        }
    }
}

// Handle Save Location (Add New or Edit)
function handleSaveLocation() {
    validation(async function (cansave) {
        if (cansave.cansave) {
            showLoaderImmediate();
            try {
                const isEdit = $("#hdnLocationId").val() !== "";
                const method = isEdit ? "PUT" : "POST";
                const idParam = isEdit ? $("#hdnLocationId").val() : cansave.item.id;
                const url = isEdit
                    ? `${LOCATIONS_API_BASE}/${encodeURIComponent(idParam)}`
                    : LOCATIONS_API_BASE;

                const response = await fetch(url, {
                    method: method,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(cansave.item)
                });

                const resJson = await response.json().catch(() => ({}));

                if (response.ok) {
                    const options = {
                        title: 'Success',
                        message: `Location ${isEdit ? 'updated' : 'saved'} successfully!`,
                        detail: ''
                    };
                    dialog.showMessageBox(null, options);
                    $('#locationModal').modal('hide');
                    $('#txtLocation').val('');
                    $('#txtLocationId').val('');
                    $('#hdnLocationId').val('');
                    $('#index_order').val('0');
                    await locationMasterList();
                } else {
                    const errMsg = resJson.error || resJson.msg || resJson.message || "Unknown error";
                    dialog.showMessageBoxSync({ type: 'error', buttons: ['OK'], message: 'Error saving location: ' + errMsg });
                    focusInput('txtLocation');
                }
            } catch (e) {
                console.error("Save error:", e);
                dialog.showMessageBoxSync({ type: 'error', buttons: ['OK'], message: 'Failed to save location: ' + e.message });
                focusInput('txtLocation');
            } finally {
                hideLoaderImmediate();
            }
        } else {
            dialog.showMessageBoxSync({ type: 'error', buttons: ['OK'], message: cansave.msg });
            focusInput('txtLocation');
        }
    });
}

// Input validation
function validation(cb) {
    var cansave = true;
    var msg = "";

    const locName = $.trim($('#txtLocation').val());
    let locId = $.trim($('#txtLocationId').val());
    const isEdit = $("#hdnLocationId").val() !== "";

    if (locName === "") {
        msg = "Please Enter Location Name";
        cansave = false;
    } else if (!isEdit && locId === "") {
        locId = locName.toLowerCase().replace(/[^a-z0-9\s_]/gi, '').replace(/\s+/g, '_');
        $('#txtLocationId').val(locId);
    }

    if (cansave && !isEdit) {
        const exists = allRecords.some(r => r.id.toLowerCase() === locId.toLowerCase());
        if (exists) {
            msg = `A location with ID "${locId}" already exists!`;
            cansave = false;
        }
    }

    const orderRaw = $('#index_order').val();
    const parsedOrder = (orderRaw !== "" && !isNaN(parseInt(orderRaw, 10)))
        ? parseInt(orderRaw, 10)
        : 0;

    const item = {
        id: isEdit ? $("#hdnLocationId").val() : locId,
        location: locName,
        index_order: parsedOrder
    };

    cb({ cansave: cansave, msg: msg, item: item });
}

//#region Search Location
async function SearchOnLocation() {
    let query = $('#txtSearchLocation').val().trim().toLowerCase();
    let filtered = [];
    if (query) {
        filtered = allRecords.filter(function (r) {
            const loc = (r.location || "").toLowerCase();
            const id = (r.id || "").toLowerCase();
            return loc.includes(query) || id.includes(query);
        });
    } else {
        filtered = allRecords;
    }

    if (filtered.length > 0) {
        $('#locationTableHeader').show();
        $('#divStory').html('');
        await renderData(filtered);
        $('#locationCountBadge').text(`${filtered.length} result${filtered.length === 1 ? '' : 's'}`).show();
        $('#locPaginationProgress').hide();
        $('#locPaginationEndMessage').hide();
    } else {
        $('#locationTableHeader').hide();
        $('#locationCountBadge').hide();
        $('#divStory').html(`
            <div class="empty-state-card">
                <div class="empty-state-icon"><span class="glyphicon glyphicon-search"></span></div>
                <div class="empty-state-title">No Locations Found</div>
                <div class="empty-state-desc">No location matched "<strong>${escapeHtml(query)}</strong>".</div>
            </div>
        `);
        $('#locPaginationProgress').hide();
        $('#locPaginationEndMessage').hide();
    }
}

async function ClearSearchOnLocation() {
    $('#txtSearchLocation').val('');
    $('#locationTableHeader').show();
    $('#divStory').html('');
    await renderData(allRecords);
    updateLocationBadge();
    if (allRecords.length > 0) {
        $('#totalLocationsCount').text(allRecords.length);
        $('#locPaginationEndMessage').show();
    }
}
//#endregion
