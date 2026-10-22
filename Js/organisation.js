const fs = require('fs');
const path = require('path');
var remote = require('@electron/remote');
const dialog = remote.dialog;
let common = require('../Js/config');
let activePathS3 = common.getS3Path();

let isFetching = false;
let lastKey = '';
let allRecords = [];
let currentSearchQuery = '';

const ORGANISATIONS_API_BASE = (common && common.API_BASE_URL) 
    ? `${common.API_BASE_URL}/organisation_master`
    : "https://r5dojmizdd.execute-api.ap-south-1.amazonaws.com/prod/organisation_master";

$(document).ready(function () {
    bindEvents();
    organisationMasterList();
});

function bindEvents() {
    // Search input real-time filtering
    $('#txtSearchOrganisation').on('input', function () {
        currentSearchQuery = $.trim($(this).val());
        if (currentSearchQuery !== '') {
            $('#btnClearSearch').show();
        } else {
            $('#btnClearSearch').hide();
        }
        applyFilterAndRender();
    });

    // Clear search button
    $('#btnClearSearch').on('click', function () {
        $('#txtSearchOrganisation').val('').focus();
        currentSearchQuery = '';
        $(this).hide();
        applyFilterAndRender();
    });

    // Keyboard shortcuts in search box
    $('#txtSearchOrganisation').on('keydown', function (e) {
        if (e.key === 'Escape') {
            $(this).val('');
            currentSearchQuery = '';
            $('#btnClearSearch').hide();
            applyFilterAndRender();
        }
    });

    // Global shortcut Ctrl+F or F3 to focus search
    $(window).on('keydown', function (e) {
        if ((e.ctrlKey && (e.key === 'f' || e.key === 'F')) || e.key === 'F3') {
            e.preventDefault();
            $('#txtSearchOrganisation').focus().select();
        }
    });

    // Refresh button
    $('#btnRefresh').on('click', function () {
        organisationMasterList();
    });

    // Add Organisation button
    $("#btnAddOrganisation").on('click', function () {
        hideLoaderImmediate();
        $('#organisationModal #txtOrganisation').val('').prop('disabled', false).removeAttr('readonly');
        $("#hdnOrganisationId").val('');
        $('#modalTitleText').text("Add New Organisation");
        $('#btnSaveText').text("Save Organisation");
        updateIdPreview('', false);
        $('#organisationModal').modal('show');
        focusInput('txtOrganisation');
    });

    // Modal input real-time ID preview
    $('#organisationModal #txtOrganisation').on('input', function () {
        const isEdit = $("#hdnOrganisationId").val() !== "";
        if (!isEdit) {
            const raw = $(this).val();
            const generatedId = generateCanonicalId(raw);
            updateIdPreview(generatedId, false);
        }
    });

    // Close button
    $("#btnClose").on('click', function () {
        $('#organisationModal').modal('hide');
    });

    // Save button
    $("#btnSave").on('click', function () {
        handleSaveOrganisation();
    });

    // Delegated edit button click
    $(document).on('click', '.btn-edit-org', function (e) {
        e.preventDefault();
        const id = $(this).attr('data-id');
        const name = $(this).attr('data-name');
        editOrganisation(name, id);
    });

    // Delegated delete button click
    $(document).on('click', '.btn-delete-org', function (e) {
        e.preventDefault();
        const id = $(this).attr('data-id');
        const name = $(this).attr('data-name');
        deleteOrganisation(id, name);
    });
}

function generateCanonicalId(name) {
    if (!name) return "";
    return String(name)
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s_]/gi, '')
        .replace(/\s+/g, '_');
}

function updateIdPreview(id, isEdit) {
    if (isEdit) {
        $('#lblPreviewId').text(id || 'none');
        $('#idPreviewBox').html(`<span>Canonical ID: </span><code>${escapeHtml(id)}</code> <span class="text-muted" style="font-size: 11px;">(ID cannot be modified during edit)</span>`);
    } else {
        const val = id || 'Will be generated automatically';
        $('#idPreviewBox').html(`<span>Generated Canonical ID: </span><code>${escapeHtml(val)}</code>`);
    }
}

async function organisationMasterList() {
    allRecords = [];
    lastKey = '';
    $('#badgeCount').text('Loading...');
    $('#searchStats').text('Loading organisations from API...');
    $('#divStory').html(`
        <div class="empty-state-box">
            <span class="glyphicon glyphicon-refresh empty-state-icon" style="animation: spin 1s infinite linear;"></span>
            <div class="empty-state-title">Loading Organisations</div>
            <div class="empty-state-desc">Fetching master records from database...</div>
        </div>
    `);

    await fetchOrganisations();
}

async function fetchOrganisations() {
    if (isFetching) return;
    isFetching = true;
    $('body').removeClass('loaded');

    try {
        let hasMore = true;
        while (hasMore) {
            const url = `${ORGANISATIONS_API_BASE}?lastKey=${encodeURIComponent(lastKey)}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error(`API failed: ${response.status}`);

            const data = await response.json();
            const batch = data.data || data.organisations || data.organisation_master || [];

            if (batch.length > 0) {
                allRecords = [...allRecords, ...batch];
            }

            hasMore = !!data.hasMore;
            lastKey = data.lastKey || '';
            if (!hasMore || !lastKey) break;
        }

        // Sort alphabetically by Organisation name
        allRecords.sort((a, b) => {
            const nameA = String(a.Organisation || a.id || '').toLowerCase();
            const nameB = String(b.Organisation || b.id || '').toLowerCase();
            return nameA.localeCompare(nameB);
        });

        applyFilterAndRender();

    } catch (e) {
        console.error("Fetch error:", e);
        $('#badgeCount').text('Error');
        $('#searchStats').text('Failed to load records');
        $('#divStory').html(`
            <div class="empty-state-box">
                <span class="glyphicon glyphicon-alert empty-state-icon" style="color: #ef4444;"></span>
                <div class="empty-state-title" style="color: #b91c1c;">Failed to load organisations</div>
                <div class="empty-state-desc">${escapeHtml(e.message || 'Please check your connection and try again.')}</div>
                <button type="button" class="btn btn-action-default" onclick="organisationMasterList();">
                    <span class="glyphicon glyphicon-refresh"></span> Retry
                </button>
            </div>
        `);
    } finally {
        $('body').addClass('loaded');
        isFetching = false;
    }
}

function applyFilterAndRender() {
    let records = allRecords;
    const totalCount = allRecords.length;

    if (currentSearchQuery) {
        const q = currentSearchQuery.toLowerCase();
        records = allRecords.filter(item => {
            const nameMatch = item.Organisation && String(item.Organisation).toLowerCase().includes(q);
            const idMatch = item.id && String(item.id).toLowerCase().includes(q);
            return nameMatch || idMatch;
        });

        $('#badgeCount').text(`${records.length} / ${totalCount}`);
        $('#searchStats').text(`Found ${records.length} matching "${currentSearchQuery}" (out of ${totalCount} total)`);
    } else {
        $('#badgeCount').text(`${totalCount} Total`);
        $('#searchStats').text(`Showing all ${totalCount} organisations`);
    }

    renderOrganisations(records, currentSearchQuery);
}

function renderOrganisations(records, query) {
    if (!records || records.length === 0) {
        if (query) {
            $('#divStory').html(`
                <div class="empty-state-box">
                    <span class="glyphicon glyphicon-search empty-state-icon"></span>
                    <div class="empty-state-title">No matching organisations found</div>
                    <div class="empty-state-desc">No records found matching "<strong>${escapeHtml(query)}</strong>". Check for typos or try clearing the filter.</div>
                    <button type="button" class="btn btn-action-default btn-sm" id="btnEmptyClearSearch">
                        <span class="glyphicon glyphicon-remove"></span> Clear Search Filter
                    </button>
                </div>
            `);
            $('#btnEmptyClearSearch').on('click', function () {
                $('#btnClearSearch').trigger('click');
            });
        } else {
            $('#divStory').html(`
                <div class="empty-state-box">
                    <span class="glyphicon glyphicon-folder-open empty-state-icon"></span>
                    <div class="empty-state-title">No organisations in database</div>
                    <div class="empty-state-desc">Get started by creating your first organisation record.</div>
                    <button type="button" class="btn btn-action-primary" onclick="$('#btnAddOrganisation').click();">
                        <span class="glyphicon glyphicon-plus"></span> Add New Organisation
                    </button>
                </div>
            `);
        }
        return;
    }

    let html = "";
    records.forEach((item, index) => {
        const rawName = item.Organisation || item.id || "";
        const rawId = item.id || "";
        const displayName = query ? highlightMatches(rawName, query) : escapeHtml(rawName);
        const displayId = query ? highlightMatches(rawId, query) : escapeHtml(rawId);

        html += `
            <div class="org-row-card" id="${escapeHtml(rawId)}">
                <div class="col-td-no">
                    <span class="org-index-badge">${index + 1}</span>
                </div>
                <div class="col-td-name">
                    <span class="org-icon-avatar">
                        <span class="glyphicon glyphicon-briefcase"></span>
                    </span>
                    <span class="org-name-text">${displayName}</span>
                </div>
                <div class="col-td-id">
                    <code class="org-id-code" title="Canonical ID: ${escapeHtml(rawId)}">${displayId}</code>
                </div>
                <div class="col-td-actions">
                    <button type="button" class="btn-table-edit btn-edit-org" 
                        data-id="${escapeHtml(rawId)}" 
                        data-name="${escapeHtml(rawName)}" 
                        title="Edit ${escapeHtml(rawName)}">
                        <span class="glyphicon glyphicon-pencil"></span> Edit
                    </button>
                    <button type="button" class="btn-table-delete btn-delete-org" 
                        data-id="${escapeHtml(rawId)}" 
                        data-name="${escapeHtml(rawName)}" 
                        title="Delete ${escapeHtml(rawName)}">
                        <span class="glyphicon glyphicon-trash"></span> Delete
                    </button>
                </div>
            </div>`;
    });

    $('#divStory').html(html);
}

function highlightMatches(text, query) {
    if (!text) return "";
    if (!query) return escapeHtml(text);
    const escapedText = escapeHtml(text);
    const escapedQuery = escapeHtml(query).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    return escapedText.replace(regex, '<span class="search-highlight">$1</span>');
}

function escapeHtml(string) {
    if (string === null || string === undefined) return "";
    return String(string)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function focusInput(id) {
    setTimeout(function () {
        var el = document.getElementById(id);
        if (el) {
            el.focus();
            if (typeof el.select === "function") el.select();
        }
    }, 150);
}

function hideLoaderImmediate() {
    $('body').addClass('loaded');
    $('#loader-wrapper').css({ visibility: 'hidden', transform: 'translateY(-100%)', transition: 'none' });
}

function editOrganisation(Organisation, id) {
    hideLoaderImmediate();
    $('#organisationModal').find('#modalTitleText').text("Edit Organisation");
    $('#organisationModal').find('#btnSaveText').text("Update Organisation");
    $('#organisationModal').find('#txtOrganisation').val(Organisation).prop('disabled', false).removeAttr('readonly');
    $('#organisationModal').find('#hdnOrganisationId').val(id);
    updateIdPreview(id, true);
    $('#organisationModal').modal('show');
    focusInput('txtOrganisation');
}

async function deleteOrganisation(id, name) {
    const label = name ? `"${name}" (${id})` : `"${id}"`;
    if (confirm(`Are you sure you want to delete organisation ${label}?\n\nThis will remove the organisation record from the master database.`)) {
        $('body').removeClass('loaded');
        try {
            const url = `${ORGANISATIONS_API_BASE}/${encodeURIComponent(id)}`;
            const response = await fetch(url, { method: "DELETE" });
            if (response.ok) {
                allRecords = allRecords.filter(item => item.id != id);
                dialog.showMessageBoxSync({ 
                    type: 'info', 
                    buttons: ['OK'], 
                    title: 'Organisation Deleted', 
                    message: `Organisation ${label} was deleted successfully.` 
                });
                applyFilterAndRender();
            } else {
                const data = await response.json();
                dialog.showMessageBoxSync({ 
                    type: 'error', 
                    buttons: ['OK'], 
                    title: 'Delete Failed', 
                    message: 'Error deleting organisation: ' + (data.error || data.msg || "Unknown error") 
                });
            }
        } catch (e) {
            console.error("Delete error:", e);
            dialog.showMessageBoxSync({ 
                type: 'error', 
                buttons: ['OK'], 
                title: 'Delete Failed', 
                message: 'Failed to delete organisation: ' + (e.message || 'Network error') 
            });
        } finally {
            $('body').addClass('loaded');
        }
    }
}

function handleSaveOrganisation() {
    validation(async function (cansave) {
        if (!cansave.cansave) {
            dialog.showMessageBoxSync({ 
                type: 'warning', 
                buttons: ['OK'], 
                title: 'Validation Error', 
                message: cansave.msg 
            });
            return;
        }

        $('body').removeClass('loaded');
        $("#btnSave").prop('disabled', true);

        try {
            const isEdit = $("#hdnOrganisationId").val() !== "";
            const method = isEdit ? "PUT" : "POST";
            const url = isEdit 
                ? `${ORGANISATIONS_API_BASE}/${encodeURIComponent($("#hdnOrganisationId").val())}`
                : ORGANISATIONS_API_BASE;

            const response = await fetch(url, {
                method: method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(cansave.item)
            });

            if (response.ok) {
                const actionText = isEdit ? 'updated' : 'saved';
                dialog.showMessageBoxSync({ 
                    type: 'info', 
                    buttons: ['OK'], 
                    title: 'Success', 
                    message: `Organisation "${cansave.item.Organisation}" ${actionText} successfully.` 
                });
                $('#organisationModal').modal('hide');
                organisationMasterList();
            } else {
                const data = await response.json();
                const errMsg = data.error || data.msg || "Server returned " + response.status;
                dialog.showMessageBoxSync({ 
                    type: 'error', 
                    buttons: ['OK'], 
                    title: 'Save Failed', 
                    message: "Error saving organisation: " + errMsg 
                });
            }
        } catch (e) {
            console.error("Save error:", e);
            dialog.showMessageBoxSync({ 
                type: 'error', 
                buttons: ['OK'], 
                title: 'Save Failed', 
                message: "Failed to save organisation: " + (e.message || 'Network error') 
            });
        } finally {
            $("#btnSave").prop('disabled', false);
            $('body').addClass('loaded');
        }
    });
}

function validation(cb) {
    const rawName = $.trim($('#organisationModal #txtOrganisation').val());
    const isEdit = $("#hdnOrganisationId").val() !== "";

    if (!rawName) {
        return cb({ cansave: false, msg: "Please enter Organisation name" });
    }

    const id = isEdit 
        ? $("#hdnOrganisationId").val() 
        : generateCanonicalId(rawName);

    if (!id) {
        return cb({ cansave: false, msg: "Unable to generate a valid organisation ID from the name" });
    }

    const item = {
        "id": id,
        "Organisation": rawName
    };

    cb({ cansave: true, msg: "", item: item });
}
