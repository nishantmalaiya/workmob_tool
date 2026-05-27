var remote = require('@electron/remote');
const ipcRenderer = require('electron').ipcRenderer;
var pathName = remote.getGlobal('sharedObj').pathName;
const dialog = remote.dialog;
var type = remote.getGlobal('sharedObj').currentStory;
let common = require('../Js/config');
let activePathS3 = common.getS3Path();
var JSON_Obj = null;
let configJson = null;
let MasterJson = null;

const defaultApiHeaders = {
    "Content-Type": "application/json",
    "Accept": "*/*"
};

function apiFetch(url, options = {}) {
    return fetch(url, {
        ...options,
        cache: "no-store",
        headers: {
            ...defaultApiHeaders,
            ...(options.headers || {})
        }
    });
}

var storyAlsoOn = [];
storyAlsoOn.push({ "chkbox": "storiestop", "file": activePathS3["stories-top"], "isExist": false, "index": "-1", "total": "0", "label": "Stories Top", "CanAdd": false });
storyAlsoOn.push({ "chkbox": "storiestending", "file": activePathS3["trending"], "isExist": false, "index": "-1", "total": "0", "label": "Trending", "CanAdd": false });
storyAlsoOn.push({ "chkbox": "storiesMobileHomeScreen", "file": activePathS3["mobile-home"], "isExist": false, "index": "-1", "total": "0", "label": "Mobile Home Screen", "CanAdd": false });
storyAlsoOn.push({ "chkbox": "bloghome", "file": activePathS3["blog-home"], "isExist": false, "index": "-1", "total": "0", "label": "Blog Home", "CanAdd": false });



GetCategoryList();

$(async () => {
    try {
        const configUrl = `${common.API_BASE_URL}/${activePathS3["config"]}`;
        const response = await fetch(configUrl);
        const data = await response.json();
        configJson = (data.data && Array.isArray(data.data)) ? data.data[0] : (data.data || data);

        const storiesEndpoint = (activePathS3.stories || "stories").replace(".json", "");
        const masterUrl = `${common.API_BASE_URL}/${storiesEndpoint}?limit=50`;
        const masterResponse = await fetch(masterUrl);
        const masterData = await masterResponse.json();
        MasterJson = masterData.stories || masterData.data || masterData || [];
        $('#divStory').html(RenderStory(MasterJson).join(" "));
    } catch (e) {
        console.error("Initialization error:", e);
    }
});

function GetCategoryList() {
    const categoryEndpoint = (activePathS3.category || "categories").replace(".json", "");
    const url = `${common.API_BASE_URL}/${categoryEndpoint}`;
    fetch(url)
        .then(response => response.json())
        .then(data => {
            var element = [];
            element.push("<option value=\"\">select</option>");
            var JSON_ObjCategory = data.categories || data.data || data || [];
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
            console.error(err);
        });
}

$('#ddlCategory').on('change', function () {
    const category = $.trim($(this).val());
    if (category != "") {
        $('body').toggleClass('loaded');
        const categoryEndpoint = (activePathS3["category-index"] || activePathS3["category"] || "categories").replace(/\//g, "").replace(".json", "");
        const url = `${common.API_BASE_URL}/${categoryEndpoint}/${encodeURIComponent(category)}`;

        fetch(url)
            .then(response => response.json())
            .then(data => {
                $('body').toggleClass('loaded');
                JSON_Obj = data.stories || data.data || data || [];
                $('#divStory').html(RenderStory(JSON_Obj).join(" "));
            })
            .catch(err => {
                $('body').toggleClass('loaded');
                console.error("Error fetching category stories:", err);
                $('#divStory').html('');
            });
    }
});

function RenderStory(JSON_ObjBrow) {
    var storyCard = [];
    storyCard.push(`<table class="table" style="width:90%">  <thead>`);
    storyCard.push(`<th>#</th><th style="width: 30%">Slug</th> <th style="width: 60%">Story Heading</th><th class="lastcol"></th></thead><tbody>`);
    for (let index = 0; index < JSON_ObjBrow.length; index++) {
        var _story = JSON_ObjBrow[index];

        storyCard.push("<tr data-slug=\"" + _story.slug + "\">");
        storyCard.push("<td>" + (parseInt(index) + 1) + "</td>");
        storyCard.push("<td>" + _story.slug + "</td>");
        storyCard.push(`<td><input name=\"storyHeading\" disabled type=\"text\" value="${_story.storyHeading}" class=\"form-control\"></td>`);
        storyCard.push('<td class="lastcol"><a class="btn btn-link" name="enableHeading">Update</a></td>');
        storyCard.push('</tr>');
    }
    storyCard.push(`</tbody></table>`)
    return storyCard;
}

async function ApplyFilter() {
    let story = JSON_Obj;
    const slug = $('#txtSlug').val().trim();

    if (slug == "") {
        if ($('#ddlCategory').val() == "") {
            story = MasterJson;
        }
        $('#divStory').html(RenderStory(story).join(" "));
    }
    else {
        $('body').toggleClass('loaded');
        const storiesEndpoint = (activePathS3.stories || "stories").replace(".json", "");
        const url = `${common.API_BASE_URL}/${storiesEndpoint}/${encodeURIComponent(slug)}`;

        try {
            const response = await fetch(url);
            const data = await response.json();

            if (response.ok) {
                const storyData = data.stories || data.data || data;
                const storyArr = Array.isArray(storyData) ? storyData : [storyData];
                $('#divStory').html(RenderStory(storyArr).join(" "));
            } else {
                dialog.showErrorBox('Not found', data.msg || "Story not found");
                $('#divStory').html('');
            }
        } catch (e) {
            console.error("Error filtering by slug:", e);
        } finally {
            $('body').toggleClass('loaded');
        }
    }
}
$('#btnAddStory').on('click', function () {
    Model("addStory.html", "");
    return false;
});

function Model(pagename, slug) {
    let data = { "slug": slug, "pagename": pagename, "category": $('#ddlCategory').val() };
    ipcRenderer.send('input-broadcast', data);
}

$('#divStory').on('click', 'a[name="Detail"]', function () {
    var slug = $(this).attr('data-id');
    Model("addStory.html", slug);
    return false;
});
$('#submit').on('click', function () {
    ApplyFilter();
    return false;
});


$('body').on('click', '[name="enableHeading"]', function () {
    $(this).closest('tr').find('[name="storyHeading"]').removeAttr('disabled');
    $(`<a class="btn btn-success" name="updateHeading">Save</a>`).insertAfter(this);
    $(`<a class="btn btn-danger" name="cancelUpdate">Cancel</a>`).insertAfter(this);
    $(this).remove();
    return false;
});
$('body').on('click', '[name="cancelUpdate"]', function () {
    $(this).closest('tr').find('[name="storyHeading"]').attr('disabled', true);
    $(this).closest('td').html(`<a class="btn btn-link" name="enableHeading">Update</a>`);
    return false;
});
$('body').on('click', '[name="updateHeading"]', async function () {
    var _button = this;
    $('body').toggleClass('loaded');
    var updateSlug = $(this).closest('tr').attr('data-slug');
    var newStoryHeading = $.trim($(this).closest('tr').find('[name="storyHeading"]').val());

    try {
        // 1. Fetch current story state via Detail API
        // 1. Fetch current story state via Detail API (Using GET as in addStory.js ReadSlug)
        const detailEndpoint = (activePathS3["story-detail"] || "stories").replace(/\//g, "").replace(".json", "");
        const getUrl = `${common.API_BASE_URL}/${detailEndpoint}/${encodeURIComponent(updateSlug)}`;
        const getResponse = await apiFetch(getUrl);
        if (!getResponse.ok) throw new Error("Failed to fetch story details");

        const respData = await getResponse.json();
        let storyJson = respData.stories || respData.data || respData;
        if (Array.isArray(storyJson)) storyJson = storyJson[0];
        // 2. Update heading if changed
        if (newStoryHeading != storyJson.storyHeading) {
            storyJson.storyHeading = newStoryHeading;

            // 3. Save to Master Detail via API
            const putUrl = `${common.API_BASE_URL}/${detailEndpoint}/${encodeURIComponent(updateSlug)}`;
            const method = type !== "default" ? "POST" : "PUT";
            const putResponse = await apiFetch(putUrl, {
                method: method,
                body: JSON.stringify(storyJson)
            });

            if (!putResponse.ok) {
                const errorData = await putResponse.json();
                throw new Error(errorData.msg || "Failed to update story heading in master");
            }

            console.log("Story heading updated successfully in master detail");

            // 4. Update in Category Index if a category is selected
            const selectedCategory = $.trim($('#ddlCategory').val());
            if (selectedCategory !== "") {
                const categoryEndpoint = (activePathS3["category-index"] || activePathS3["category"] || "categories").replace(/\//g, "").replace(".json", "");
                const catUrl = `${common.API_BASE_URL}/${categoryEndpoint}/${encodeURIComponent(selectedCategory)}/${encodeURIComponent(updateSlug)}`;

                await apiFetch(catUrl, {
                    method: method,
                    body: JSON.stringify(storyJson)
                }).then(r => {
                    if (r.ok) console.log(`Updated in category index: ${selectedCategory}`);
                }).catch(e => console.warn("Category update failed", e));
            }

            // 5. Update in Master Listing Index (e.g. stories / add-audio-masterindex)
            const masterListingEndpoint = (activePathS3.stories || "stories").replace(".json", "");
            const masterListingUrl = `${common.API_BASE_URL}/${masterListingEndpoint}/${encodeURIComponent(updateSlug)}`;
            await apiFetch(masterListingUrl, {
                method: method,
                body: JSON.stringify(storyJson)
            }).then(r => {
                if (r.ok) console.log("Updated in master listing index");
            }).catch(e => console.warn("Master listing update failed", e));


            // 7. Update local state to keep UI in sync
            [MasterJson, JSON_Obj].forEach(list => {
                if (list && Array.isArray(list)) {
                    let localMatch = list.find(s => s.slug === updateSlug);
                    if (localMatch) localMatch.storyHeading = newStoryHeading;
                }
            });
        }

        // 4. Update UI
        $(_button).closest('tr').find('[name="storyHeading"]').attr('disabled', true);
        $(_button).closest('td').html(`<a class="btn btn-primary" name="enableHeading">Updated</a>`);

    } catch (e) {
        console.error("Update error:", e);
        alert("Failed to update: " + e.message);
    } finally {
        $('body').toggleClass('loaded');
    }
    return false;
});
