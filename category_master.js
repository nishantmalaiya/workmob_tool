const fs = require('fs');
const path = require('path');
let pathName = "C:\\WM_Json";
var remote = require('@electron/remote');
var session = remote.session;
var app = remote.app;
var ipcRenderer = require('electron').ipcRenderer;
const dialog = remote.dialog;
let common = require('./Js/config');
let activePathS3 = common.getS3Path();
var type = remote.getGlobal("sharedObj") ? remote.getGlobal("sharedObj").currentStory : "default";

let lastKey = '';
let hasMore = true;
let allCategories = [];
let isFetching = false;
let scrollTimeout = null;

$(document).ready(function () {
    categorymasterList();
});

// Window scroll listener for pagination
$(window).on("scroll", function () {
    if (scrollTimeout) clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
        if ($('#txtSearchCategory').val().trim() === "") {
            if ($(window).scrollTop() + $(window).height() >= $(document).height() - 100) {
                if (!isFetching && hasMore) {
                    loadMoreCategories();
                }
            }
        }
    }, 200);
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
        if (el) { el.focus(); }
    }, 100);
}

function updateCategoryBadge() {
    if (allCategories && allCategories.length > 0) {
        const suffix = hasMore ? ' (scroll for more)' : ' (all loaded)';
        $('#categoryCountBadge').text(`${allCategories.length} ${allCategories.length === 1 ? 'category' : 'categories'}${suffix}`).show();
    } else {
        $('#categoryCountBadge').hide();
    }
}

// Initial category list load
async function categorymasterList() {
    lastKey = '';
    hasMore = true;
    allCategories = [];

    $('#divStory').html('');
    $('#categoryTableHeader').show();
    $('#catPaginationProgress').hide();
    $('#catPaginationEndMessage').hide();

    await loadMoreCategories();
}

// Load more categories with smooth pagination
async function loadMoreCategories() {
    if (isFetching || !hasMore) return;
    isFetching = true;

    const isPaginating = lastKey !== '';
    if (isPaginating) {
        const loadedCount = allCategories ? allCategories.length : 0;
        $('#catPaginationStats').text(`Loaded ${loadedCount} categories so far, fetching more...`);
        $('#catPaginationProgress').show();
        $('#catPaginationEndMessage').hide();
        $('#categoryCountBadge').html(`<span class="glyphicon glyphicon-refresh spin-icon"></span> Loading... (${loadedCount} loaded)`).show();
    } else {
        showLoaderImmediate();
    }

    try {
        const url = lastKey
            ? `${common.API_BASE_URL}/${activePathS3.category}?lastKey=${encodeURIComponent(lastKey)}`
            : `${common.API_BASE_URL}/${activePathS3.category}`;
        const response = await fetch(url);
        const data = await response.json();

        const batch = data.data || data.categories || (Array.isArray(data) ? data : []);
        if (batch.length > 0) {
            allCategories = [...allCategories, ...batch];
            await RenderStory(batch);
        }

        lastKey = data.lastKey || '';
        if (!data.hasMore) {
            hasMore = false;
        }

        updateCategoryBadge();

        if (!hasMore && allCategories.length > 0) {
            $('#totalCategoriesCount').text(allCategories.length);
            $('#catPaginationEndMessage').show();
        }
    } catch (e) {
        console.error("Error loading categories:", e);
    } finally {
        if (isPaginating) {
            $('#catPaginationProgress').hide();
        } else {
            hideLoaderImmediate();
        }
        isFetching = false;
        updateCategoryBadge();
    }
}

// Render Category Cards
async function RenderStory(categories) {
    if (!categories || categories.length === 0) return;

    var cards = [];
    for (let index = 0; index < categories.length; index++) {
        var story = categories[index];
        const displayOrder = story.index_order !== undefined && story.index_order !== null && story.index_order !== '' 
            ? story.index_order 
            : '-';
        const title = story.title || '-';
        const titleHindi = story.title_hindi || '-';
        const categorySlug = story.category || '-';
        const itemId = story.itemId || '';

        cards.push(`
            <div class="storycard column" draggable="true" name="category" id="${escapeHtml(story.category)}">
                <div class="col-cell col-order">
                    <span class="drag-handle" title="Drag to reorder"><span class="glyphicon glyphicon-menu-hamburger"></span></span>
                    <span class="order-badge">${escapeHtml(displayOrder)}</span>
                </div>
                <div class="col-cell col-title">
                    <span class="cat-title-text" title="${escapeHtml(title)}">${escapeHtml(title)}</span>
                </div>
                <div class="col-cell col-title-hi">
                    <span class="cat-title-hi-text" title="${escapeHtml(titleHindi)}">${escapeHtml(titleHindi)}</span>
                </div>
                <div class="col-cell col-slug">
                    <code class="cat-slug-badge" title="${escapeHtml(categorySlug)}">${escapeHtml(categorySlug)}</code>
                </div>
                <div class="col-cell col-actions text-right">
                    <button type="button" class="btn btn-sm btn-info btn-edit" data-category="${escapeHtml(categorySlug)}" data-title="${escapeHtml(title)}" data-titlehindi="${escapeHtml(titleHindi)}" data-itemid="${escapeHtml(itemId)}" data-order="${escapeHtml(displayOrder !== '-' ? displayOrder : '')}">
                        <span class="glyphicon glyphicon-pencil"></span> Edit
                    </button>
                    <button type="button" class="btn btn-sm btn-danger btn-delete" data-category="${escapeHtml(categorySlug)}" data-itemid="${escapeHtml(itemId)}">
                        <span class="glyphicon glyphicon-trash"></span> Delete
                    </button>
                </div>
            </div>
        `);
    }

    $('#divStory').append(cards.join(' '));

    // Reattach drag-and-drop handlers once per batch
    const cols = document.querySelectorAll('#divStory .column');
    if (typeof addDnDHandlers === 'function') {
        [].forEach.call(cols, addDnDHandlers);
    }
}

// Delegated click handler for Edit and Delete buttons (safe against quotes in strings)
$('#divStory').on('click', '.btn-edit', function (e) {
    e.preventDefault();
    const cname = $(this).attr('data-category');
    const ctitle = $(this).attr('data-title');
    const chtitle = $(this).attr('data-titlehindi');
    const itemId = $(this).attr('data-itemid');
    const order = $(this).attr('data-order');
    editCat(cname, ctitle, chtitle, itemId, order);
    $('#delete-file-modal').modal('show');
});

$('#divStory').on('click', '.btn-delete', function (e) {
    e.preventDefault();
    const cname = $(this).attr('data-category');
    const itemId = $(this).attr('data-itemid');
    deleteCat(cname, itemId);
});

// Delete category
async function deleteCat(cname, itemId) {
    if (confirm(`Are you sure you want to delete category "${cname}"?`)) {
        showLoaderImmediate();
        try {
            const categoryEndpoint = (activePathS3.category || "categories").replace(".json", "");
            const categoryDetailEndpoint = (activePathS3["category-detail"] || categoryEndpoint).replace(".json", "");
            const url = (type === "default") 
                ? `${common.API_BASE_URL}/categories/${encodeURIComponent(cname)}`
                : `${common.API_BASE_URL}/${categoryDetailEndpoint}/${encodeURIComponent(itemId || cname)}`;

            const response = await fetch(url, {
                method: "DELETE"
            });
            const result = await response.json();

            if (response.ok) {
                dialog.showMessageBoxSync({ type: 'info', buttons: ['OK'], message: 'Category deleted successfully' });
                categorymasterList(); // Refresh the list
            } else {
                dialog.showMessageBoxSync({ type: 'error', buttons: ['OK'], message: 'Error deleting category: ' + (result.msg || result.error || 'Unknown error') });
            }
        } catch (e) {
            console.error("Error deleting category:", e);
            dialog.showMessageBoxSync({ type: 'error', buttons: ['OK'], message: 'Failed to delete category' });
        } finally {
            hideLoaderImmediate();
        }
    }
}

// Save Category (Add New or Edit)
$("#btnSave").click(function () {
    var str = $("#category").val();
    var _category = str.replace(/ /gi, "-");

    validation(async function (cansave) {
        if (cansave.cansave) {
            if ($("#hdncategory").val() == "") {
                // New category creation
                var _flag = true;
                $('.storycard').each(function () {
                    if ($(this).attr('id').toLowerCase() == _category.toLowerCase()) {
                        _flag = false;
                        dialog.showMessageBoxSync({ type: 'error', buttons: ['OK'], message: 'This category already exists' });
                        $("#category").val('');
                        $("#title").val('');
                        $("#title_hindi").val('');
                        $("#hdncategory").val('');
                        focusInput('category');
                    }
                });

                if (_flag) {
                    showLoaderImmediate();
                    try {
                        var JSONobjCat = {
                            category: _category,
                            title: $("#title").val(),
                            title_hindi: $("#title_hindi").val(),
                            index_order: $("#index_order").val()
                        };
                        const categoryEndpoint = (activePathS3.category || "categories").replace(".json", "");
                        const response = await fetch(`${common.API_BASE_URL}/${categoryEndpoint}`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(JSONobjCat)
                        });
                        const meta = await response.json();

                        if (response.ok) {
                            var a = [];
                            await WriteS3Bucket(a, activePathS3["category-index"] + _category + ".json");

                            const options = { title: '', message: 'Category Saved successfully', detail: '' };
                            dialog.showMessageBox(null, options);
                            $('#delete-file-modal').modal('hide');
                            $("#category").val('');
                            $("#title").val('');
                            $("#title_hindi").val('');
                            $("#hdncategory").val('');
                            categorymasterList(); // Refresh list
                        } else {
                            dialog.showMessageBoxSync({ type: 'error', buttons: ['OK'], message: 'Error saving category: ' + (meta.msg || meta.error || 'Unknown error') });
                            focusInput('category');
                        }
                    } catch (e) {
                        console.error("Error saving category:", e);
                        dialog.showMessageBoxSync({ type: 'error', buttons: ['OK'], message: 'Failed to save category' });
                        focusInput('category');
                    } finally {
                        hideLoaderImmediate();
                    }
                }
            } else {
                // Existing category update
                showLoaderImmediate();
                var JSONobjCat = {
                    category: _category,
                    title: $("#title").val(),
                    title_hindi: $("#title_hindi").val(),
                    index_order: $("#index_order").val()
                };

                try {
                    const categoryEndpoint = (activePathS3.category || "categories").replace(".json", "");
                    const categoryDetailEndpoint = (activePathS3["category-detail"] || categoryEndpoint).replace(".json", "");
                    const idParam = (type === "default") ? encodeURIComponent(_category) : encodeURIComponent($("#hdnitemId").val());
                    const url = (type === "default") 
                        ? `${common.API_BASE_URL}/categories/${idParam}`
                        : `${common.API_BASE_URL}/${categoryDetailEndpoint}/${idParam}`;

                    const response = await fetch(url, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(JSONobjCat)
                    });
                    const meta = await response.json();

                    if (response.ok) {
                        const options = { title: '', message: 'Category Updated successfully', detail: '' };
                        dialog.showMessageBox(null, options);
                        $('#delete-file-modal').modal('hide');
                        $("#category").val('');
                        $("#title").val('');
                        $("#title_hindi").val('');
                        $("#hdncategory").val('');
                        categorymasterList(); // Refresh list
                    } else {
                        dialog.showMessageBoxSync({ type: 'error', buttons: ['OK'], message: 'Error updating category: ' + (meta.msg || meta.error || 'Unknown error') });
                        focusInput('title');
                    }
                } catch (e) {
                    console.error("Error updating category:", e);
                    dialog.showMessageBoxSync({ type: 'error', buttons: ['OK'], message: 'Failed to update category' });
                    focusInput('title');
                } finally {
                    hideLoaderImmediate();
                }
            }
        } else {
            dialog.showMessageBoxSync({ type: 'error', buttons: ['OK'], message: cansave.msg });
        }
    });
});

// Add New Category click
$("#btnAddcat").click(function () {
    $("#category").val('');
    $("#title").val('');
    $("#title_hindi").val('');
    $("#hdncategory").val('');
    $("#hdnitemId").val('');
    $('#modalTitleText').text("Add New Category");
    $('#CategoryEdit').show();
    $('#index_order').val('');
    focusInput('category');
});

// Modal cancel/close click
$("#btnClose").click(function () {
    $('#delete-file-modal').modal('hide');
});

// Prefill form for editing category
function editCat(cname, ctitle, chtitle, itemId, order) {
    $('#modalTitleText').text("Edit Category");
    $('#CategoryEdit').hide();
    $('#category').val(cname);
    $('#hdncategory').val(cname);
    $('#hdnitemId').val(itemId || '');
    $('#title').val(ctitle);
    $('#title_hindi').val(chtitle);
    $('#index_order').val(order !== undefined && order !== null ? order : '');
    focusInput('title');
}

// Input validation
function validation(cb) {
    var cansave = true;
    var msg = "";

    var item = {
        "Category": $.trim($('#divModel').find('#category').val()),
        "title": $.trim($('#divModel').find('#title').val()),
        "title-hindi": $.trim($('#divModel').find('#title_hindi').val()),
        "index_order": $.trim($('#divModel').find('#index_order').val())
    };

    if (item["Category"] == "") {
        msg = "Please Enter Category Slug";
        cansave = false;
    } else if (item["title"] == "") {
        msg = "Please Enter Title (English)";
        cansave = false;
    } else if (item["title-hindi"] == "") {
        msg = "Please Enter Title (Hindi)";
        cansave = false;
    } else if (item["index_order"] == "") {
        msg = "Please Enter Display Order";
        cansave = false;
    }

    var result = { "cansave": cansave, "msg": msg };
    cb(result);
}

//#region Search Category
$("#btnSearch").click(function () {
    SearchOnCategory();
});

$("#btnClearSearch").click(function () {
    ClearSearchOnCategory();
});

$('#txtSearchCategory').on('keypress', function (e) {
    if (e.which === 13) {
        SearchOnCategory();
    }
});

$('#txtSearchCategory').on('keyup', function () {
    const query = $('#txtSearchCategory').val().trim();
    if (query.length >= 3) {
        SearchOnCategory();
    } else if (query.length === 0) {
        ClearSearchOnCategory();
    }
});

async function SearchOnCategory() {
    let query = $('#txtSearchCategory').val().trim().toLowerCase();
    let filtered = [];
    if (query) {
        filtered = allCategories.filter(function (c) {
            const cat = (c.category || "").toLowerCase();
            const title = (c.title || "").toLowerCase();
            const titleHindi = (c.title_hindi || "").toLowerCase();
            return cat.includes(query) || title.includes(query) || titleHindi.includes(query);
        });
    } else {
        filtered = allCategories;
    }

    if (filtered.length > 0) {
        $('#categoryTableHeader').show();
        $('#divStory').html('');
        await RenderStory(filtered);
        $('#categoryCountBadge').text(`${filtered.length} result${filtered.length === 1 ? '' : 's'}`).show();
        $('#catPaginationProgress').hide();
        $('#catPaginationEndMessage').hide();
    } else {
        $('#categoryTableHeader').hide();
        $('#categoryCountBadge').hide();
        $('#divStory').html(`
            <div class="empty-state-card">
                <div class="empty-state-icon"><span class="glyphicon glyphicon-search"></span></div>
                <div class="empty-state-title">No Categories Found</div>
                <div class="empty-state-desc">No category matched "<strong>${escapeHtml(query)}</strong>".</div>
            </div>
        `);
        $('#catPaginationProgress').hide();
        $('#catPaginationEndMessage').hide();
    }
}

async function ClearSearchOnCategory() {
    $('#txtSearchCategory').val('');
    $('#categoryTableHeader').show();
    $('#divStory').html('');
    await RenderStory(allCategories);
    updateCategoryBadge();
    if (!hasMore && allCategories.length > 0) {
        $('#totalCategoriesCount').text(allCategories.length);
        $('#catPaginationEndMessage').show();
    }
}
//#endregion
