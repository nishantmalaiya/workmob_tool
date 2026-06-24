var remote = require("@electron/remote");
// const { app } = require("electron");
// app.commandLine.appendSwitch ("disable-http-cache");
const fs = require("fs");
const path = require("path");

//const { setInterval, clearInterval } = require("timers");
const ipcRenderer = require("electron").ipcRenderer;
var pathName = remote.getGlobal("sharedObj").pathName;

const dialog = remote.dialog;
let common = require("./Js/config");
let activePathS3 = common.getS3Path();
var type = remote.getGlobal("sharedObj").currentStory;

/** Set to false before release — fills add-story popup with dummy data for local testing */
const TEST_PREFILL_STORY = true;
let editSlug = "";
let editItemId = "";

function prefillStoryTestData() {
    console.log("Prefilling testing data for story...");
    const uniqueId = Date.now();

    // Give some time for fields to be rendered and selectize lists to be fetched
    setTimeout(() => {
        // Regular inputs in #divJson
        $("#divJson").find('[name="storyHeading"]').val("Test Story Heading " + uniqueId);
        $("#divJson").find('[name="name"]').val("nishant Malaiya ");
        $("#divJson").find('[name="slug"]').val("nishant-test" + uniqueId);
        $("#divJson").find('[name="metaTitle"]').val("Test Meta Title");
        $("#divJson").find('[name="metaDesc"]').val("Test Meta Description");
        $("#divJson").find('[name="industry"]').val("Testing");
        $("#divJson").find('[name="job_title"]').val("Tester");
        $("#divJson").find('[name="category"]').val("stories");
        $("#divJson").find('[name="company_name"]').val("Test Corp");
        $("#divJson").find('[name="thumb"]').val("https://via.placeholder.com/150");
        $("#divJson").find('[name="webpthumb"]').val("https://via.placeholder.com/150");
        $("#divJson").find('[name="videoUrl"]').val("https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4");
        $("#divJson").find('[name="workmobUserId"]').val("12345");
        $("#divJson").find('[name="workmobUserName"]').val("testuser");
        $("#divJson").find('[name="user_guid"]').val("test-user-guid-" + uniqueId + "-123456789");

        // Selectize fields (Location, Organisation, Instructor)
        if ($("#ddl_instructor")[0] && $("#ddl_instructor")[0].selectize) {
            $("#ddl_instructor")[0].selectize.setValue("8770117732");
        }
        if ($("#ddl_location")[0] && $("#ddl_location")[0].selectize) {
            $("#ddl_location")[0].selectize.setValue("nolocation");
        }
        if ($("#ddl_organisation")[0] && $("#ddl_organisation")[0].selectize) {
            $("#ddl_organisation")[0].selectize.setValue("noorganisation");
        }

        // Master category
        if ($("#ddl_ddlcategory").length > 0) {
            $("#ddl_ddlcategory").val($("#ddl_ddlcategory option:first").val()).trigger("change");
        }
    }, 2500);
}
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

const API_BASE_URL = common.API_BASE_URL;

const STORIES_API_ALLOWED_KEYS = [
    "location", "industry", "slug", "priority", "isFullstoryAdded",
    "name", "landmark", "date", "streetAddress", "instructor",
    "workmobUserName", "category", "workmobUserId", "webpthumb",
    "thumb", "hide", "tags", "storyHeading"
];

const getEndpoint = (key) => {
    let name = activePathS3[key] || "";
    return name.replace(".json", "").replace(".js", "");
};

const CATEGORIES_LIST_API_BASE = `${API_BASE_URL}/${(activePathS3["category"] || activePathS3["category-index"] || "categories").replace(/\//g, "").replace(".json", "")}`;
const CATEGORIES_API_BASE = `${API_BASE_URL}/${(activePathS3["category-index"] || activePathS3["category"] || "categories").replace(/\//g, "").replace(".json", "")}`;


const INSTRUCTORS_API_BASE = (() => {
    let base = getEndpoint("instructor");
    if (base === "instructor") base = "instructors";
    return `${API_BASE_URL}/${base}`;
})();

const LOCATIONS_API_BASE = `${API_BASE_URL}/locations`;
const ORGANISATIONS_API_BASE = `${API_BASE_URL}/organisation`;
const ORGANISATION_MASTER_API_BASE = `${API_BASE_URL}/organisation_master`;
const MASTER_TAG_API_BASE = `${API_BASE_URL}/master_tag`;
const STORY_DETAIL_API_BASE = `${API_BASE_URL}/${(activePathS3["story-detail"] || "stories").replace(/\//g, "").replace(".json", "")}`;
const TAG_DETAIL_API_BASE = `${API_BASE_URL}/tag_detail`;
//const masterStoriesApiUrl = `${API_BASE_URL}/${((type === "default" ? (activePathS3.stories || "stories") : (activePathS3["story-detail"] || "stories"))).replace(/\//g, "").replace(".json", "")}`;

const masterStoriesApiUrl = `${API_BASE_URL}/${(activePathS3["stories"] || "stories")}`;

/** Normalize dropdown value to API path slug (matches saveOnTags_Location / delete helpers). */
function normalizeLocationSlug(filename) {
    return String(filename || "").trim().toLowerCase().replace(/ /g, "_");
}

/** Story slug for path segment: /locations/{loc}/{slug} (e.g. agra / taj-hotel). */
function normalizeDetailPathSegment(storySlug) {
    return String(storySlug || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/_+/g, "-");
}

/**
 * Location detail URL: /locations/{locationId} or /locations/{locationId}/{detailSlug}git 
 * e.g. /locations/agra/taj-hotel — second segment is the story/detail slug (Dynamo sort key).
 */
function locationDetailPostUrl(locationSlug, detailSlug) {
    const id = normalizeLocationSlug(locationSlug);
    const base = `${LOCATIONS_API_BASE}/${encodeURIComponent(id)}`;
    if (detailSlug != null && String(detailSlug).trim() !== "") {
        return `${base}/${encodeURIComponent(normalizeDetailPathSegment(detailSlug))}`;
    }
    return base;
}

function tagDetailPostUrl(tagSlug, detailSlug) {
    const id = slugify(tagSlug);
    const base = `${TAG_DETAIL_API_BASE}/${encodeURIComponent(id)}`;
    return base;
}

/**
 * Organisation detail URL: /organisation_master/{orgId}/{detailSlug}
 */
function organisationDetailPostUrl(orgSlug, detailSlug) {
    const id = String(orgSlug || "").trim().toLowerCase().replace(/ /g, "_");
    const base = `${ORGANISATION_MASTER_API_BASE}/${encodeURIComponent(id)}`;
    if (detailSlug != null && String(detailSlug).trim() !== "") {
        return `${base}/${encodeURIComponent(normalizeDetailPathSegment(detailSlug))}`;
    }
    return base;
}

function buildTagStoryPostBody(templateTop, tagSlug) {
    return {
        ...templateTop,
        tag: tagSlug
    };
}

function buildLocationStoryPostBody(templateTop, locationSlug) {
    const cityText = (templateTop.location && String(templateTop.location).trim()) || "";
    return {
        ...templateTop,
        slug: templateTop.slug,
        name: templateTop.name,
        industry: templateTop.industry,
        ...(cityText ? { city: cityText } : {})
    };
}

function slugify(text) {
    return String(text || "")
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')  // Remove punctuation
        .trim()
        .replace(/\s+/g, '-');     // Replace spaces with hyphens
}

async function logApiError(response, label) {
    let text = "";
    try {
        text = await response.text();
    } catch (e) {
        text = String(e);
    }
    let parsed = text;
    try {
        parsed = JSON.parse(text);
    } catch (e) {
        /* keep raw */
    }
    console.error(label || "API error", response.status, parsed);
}




const storyFeedApiUrls = {
    storiestop: `${API_BASE_URL}/` + activePathS3["stories-top"],
    storiestending: `${API_BASE_URL}/` + activePathS3["trending"],
    storiesMobileHomeScreen: `${API_BASE_URL}/` + activePathS3["mobile-home"],
    bloghome: `${API_BASE_URL}/` + activePathS3["blog-home"],
    storieshope: `${API_BASE_URL}/` + activePathS3["stories-hope"].replace(".json", ""),
    storiesgyan: `${API_BASE_URL}/` + activePathS3["stories-gyan"].replace(".json", ""),
    storiesnamaste: `${API_BASE_URL}/` + activePathS3["stories-namaste"].replace(".json", ""),
    storiespromotion: `${API_BASE_URL}/` + activePathS3["stories-promotion"].replace(".json", "")
};
/** Master index list/detail (replaces S3 `activePathS3["MasterIndex"]` for load / visibility / delete). */
var storyAlsoOn = [];
var storyInAllJson = [];
var Need_subCategory_in = ["namaste", "promotion"];
var Need_trending_in = ["gyan", "hope", "namaste", "promotion"];
storyAlsoOn.push({ chkbox: "storiestop", file: storyFeedApiUrls.storiestop, isExist: false, index: "-1", total: "0", label: "Stories Top", CanAdd: false, });
storyAlsoOn.push({ chkbox: "storiestending", file: storyFeedApiUrls.storiestending, isExist: false, index: "-1", total: "0", label: "Trending", CanAdd: false, });
storyAlsoOn.push({ chkbox: "storiesMobileHomeScreen", file: storyFeedApiUrls.storiesMobileHomeScreen, isExist: false, index: "-1", total: "0", label: "Mobile Home Screen", CanAdd: false, });
storyAlsoOn.push({ chkbox: "bloghome", file: storyFeedApiUrls.bloghome, isExist: false, index: "-1", total: "0", label: "Blog Home", CanAdd: false, });

if (Need_trending_in.indexOf(type) != -1) {
    storyAlsoOn.push({ chkbox: "storieshope", file: storyFeedApiUrls.storieshope, isExist: false, index: "-1", total: "0", label: "Hope", CanAdd: false, });
    storyAlsoOn.push({ chkbox: "storiesgyan", file: storyFeedApiUrls.storiesgyan, isExist: false, index: "-1", total: "0", label: "Gyan", CanAdd: false, });
    storyAlsoOn.push({ chkbox: "storiesnamaste", file: storyFeedApiUrls.storiesnamaste, isExist: false, index: "-1", total: "0", label: "Namaste", CanAdd: false, });
    storyAlsoOn.push({ chkbox: "storiespromotion", file: storyFeedApiUrls.storiespromotion, isExist: false, index: "-1", total: "0", label: "Promotion", CanAdd: false, });

}


storyInAllJson.push({ file: storyFeedApiUrls.storiestending });
storyInAllJson.push({ file: storyFeedApiUrls.storiesMobileHomeScreen });
storyInAllJson.push({ file: storyFeedApiUrls.bloghome });
storyInAllJson.push({ file: LOCATIONS_API_BASE });
storyInAllJson.push({ file: ORGANISATIONS_API_BASE });
storyInAllJson.push({ file: storyFeedApiUrls.storieshope });
storyInAllJson.push({ file: storyFeedApiUrls.storiesgyan });
storyInAllJson.push({ file: storyFeedApiUrls.storiesnamaste });
storyInAllJson.push({ file: storyFeedApiUrls.storiespromotion });


let _masterCategory = [];
let _instructorList = [];
let _subcategoryList = [];
let _instructorData = null;
var masterCategory = "";
let previousCategory = null;
var tmpinstructor = "";
var tmplocation = "";
var tmpTopStory = false;
var tmpOrganisation = "";
var tmpTopStory = false;
var previousOrganisation = "";
var previousLocation = "";
var previousTags = "";
GetSubcategoryList();

async function readStoryFeed(feed, slug) {
    if (!feed || !feed.file || !/^https?:\/\//i.test(feed.file)) {
        return [];
    }

    try {
        let url = feed.file;
        if (slug && editSlug !== "") {
            url += `?slug=${encodeURIComponent(slug)}`;
        }
        console.log(`readStoryFeed: fetching feed=${feed.chkbox}, url=${url}`);
        const response = await apiFetch(url);
        const data = await response.json();
        
        let result = [];
        if (Array.isArray(data)) {
            result = data;
        } else if (data && Array.isArray(data.stories)) {
            result = data.stories;
        } else if (data && Array.isArray(data.data)) {
            result = data.data;
        }
        
        result.totalCount = (data && (data.total !== undefined ? data.total : (data.totalCount !== undefined ? data.totalCount : data.count))) !== undefined ? parseInt(data.total || data.totalCount || data.count) : undefined;
        return result;
    } catch (error) {
        console.error(`Error fetching ${feed.chkbox} feed:`, error);
    }

    return [];
}

async function writeStoryFeed(feed, templateTop) {
    if (!feed || !feed.file || !/^https?:\/\//i.test(feed.file)) {
        return null;
    }

    try {
        let identifier = templateTop.slug;
        
        let usePost = (type !== "default" && editSlug !== "" && !feed.isExist);
        let method = (editSlug !== "" && !usePost) ? "PUT" : "POST";
        
        let url = `${feed.file}/${identifier}`;
        if (method === "POST" && type !== "default") {
            url = `${feed.file}`;
        }
        
        const response = await apiFetch(url, {
            method: method,
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(templateTop),
        });
        return await response.json();
    } catch (error) {
        console.error(`Error updating ${feed.chkbox} feed:`, error);
        return null;
    }
}





async function GetSubcategoryList() {
    // Disabled as both S3 and API are currently unreachable (403 Forbidden)
    /*
    var submeta = await readS3BucketAsync(activePathS3["subcategory"], "");
    if (submeta.err) {
        console.log(submeta.err);
    } else {
        _subcategoryList = JSON.parse(submeta.data);
    }
    */
    _subcategoryList = [];
}

$("body").on("change", "#ddl_ddlcategory", async function () {

    if (Need_subCategory_in.indexOf(type) != -1) {
        GetSubcategoryList();
        var selectedcate = $(this).val();
        let subcategory = _subcategoryList.filter(scat => scat["Category"] == selectedcate);
        var element = [];
        for (var i = 0; i < subcategory.length; i++) {
            var _subcategory = subcategory[i];
            element.push('<option value="' + _subcategory.sub_category + '">' + _subcategory.title + " </option>");
        }
        $("#divJson #ddl_sub_categories").html(element.join(" "));
        $("#divJson #ddl_sub_categories").attr("multiple", "multiple");
        $("#divJson #ddl_sub_categories").addClass("multiple-select");
        $("#divJson #ddl_sub_categories").multipleSelect({
            filter: true,
            width: "100%",
            placeholder: $(this).attr("Select sub Category"),
            onchange: function (e) {
                console.log(e);
            },
        });
    }
});


$("#divExtraFieldHindi").hide();
var addStory = (async function () {

    ipcRenderer.on("receiveSlug", async (event, arg) => {

        masterCategory = arg.category;
        editSlug = arg.slug;
        RenderFields("story");
        RenderMasterIndexstuff(arg.slug);
        if (arg.slug == "") {
            $("#hname").html("Add Story");
            $("#btnSave").html("Save Story");
            $("#btndelete").hide();
            var intv = setInterval(function () {
                if ($("#divJson").find('[name="slug"]').length == 1) {
                    CheckSlugStory(arg.slug);
                    clearInterval(intv);
                    if (typeof TEST_PREFILL_STORY !== 'undefined' && TEST_PREFILL_STORY) {
                        prefillStoryTestData();
                    }
                }
            }, 1000);
        } else {
            var intv = setInterval(function () {
                if ($("#divJson").find('[name="slug"]').length == 1) {
                    ReadSlug(arg.slug);
                    $("#hname").html("Update Story");
                    $("#btnSave").html("Update Story");
                    $("#btndelete").show();
                    CheckSlugStory(arg.slug);
                    $("#divJson").find('[name="slug"]').attr("disabled", "disabled");
                    clearInterval(intv);
                }
            }, 1000);
        }
    });

    // Backup: ask main to send slug data if we registered before did-finish-load fired.
    ipcRenderer.send("addStory-renderer-ready");

    let rawdata = fs.readFileSync(path.resolve(__dirname, "Files/templateTop.json"));
    let templateTop = JSON.parse(rawdata);
    let configJson = null;
    try {
        let configEndpoint = activePathS3["config"].replace(".json", "");
        // Force add-config for default and handle others dynamically
        if (type === "default") configEndpoint = "add-config";

        const configUrl = `${API_BASE_URL}/${configEndpoint}`;
        const configResponse = await apiFetch(configUrl);
        const configData = await configResponse.json();
        configJson = (configData.data && Array.isArray(configData.data)) ? configData.data[0] : (configData.data || configData);
    } catch (e) {
        console.error("Error loading config via API:", e);
        let rawdataConfing = await readS3BucketAsync(activePathS3["config"], "");
        configJson = JSON.parse(rawdataConfing.data);
    }
    var select2 = require("select2");


    // async function GetCategoryList() {
    //     // debugger;
    //     var CategoryList = await readS3BucketAsync(activePathS3["category"], "");

    //     if (CategoryList.err) {
    //         return console.log(RawJson.err);
    //     } else {
    //         JSON_Obj = JSON.parse(CategoryList.data);
    //         var element = [];
    //         for (var i = 0; i < JSON_Obj.length; i++) {
    //             var _category = JSON_Obj[i];
    //             element.push('<option value="' + _category.category + '">' + _category.title + " </option>");
    //             _masterCategory.push(_category.category);
    //         }
    //         $("#divJson #ddl_ddlcategory").html(element.join(" "));
    //         if (Need_subCategory_in.indexOf(type) == -1) {
    //             if (masterCategory != "") { $("#divJson #ddl_ddlcategory").val(masterCategory); }
    //             $("#divJson #ddl_ddlcategory").attr("multiple", "multiple");
    //             $("#divJson #ddl_ddlcategory").addClass("multiple-select");
    //             $("#divJson #ddl_ddlcategory").multipleSelect({
    //                 filter: true,
    //                 width: "100%",
    //                 placeholder: $(this).attr("Select Category"),
    //             });
    //         }
    //     }
    // }


    async function GetCategoryList() {
        // debugger;
        try {
            const url = `${CATEGORIES_LIST_API_BASE}?limit=100`;
            console.log("GetCategoryList: fetching url:", url);
            const response = await apiFetch(url);
            const data = await response.json();
            const JSON_Obj = data.data || data.categories || (Array.isArray(data) ? data : []);

            var element = [];
            for (var i = 0; i < JSON_Obj.length; i++) {
                var _category = JSON_Obj[i];
                element.push('<option value="' + _category.category + '">' + _category.title + " </option>");
                _masterCategory.push(_category.category);
            }
            $("#divJson #ddl_ddlcategory").html(element.join(" "));
            if (Need_subCategory_in.indexOf(type) == -1) {
                if (masterCategory != "") { $("#divJson #ddl_ddlcategory").val(masterCategory); }
                $("#divJson #ddl_ddlcategory").attr("multiple", "multiple");
                $("#divJson #ddl_ddlcategory").addClass("multiple-select");
                $("#divJson #ddl_ddlcategory").multipleSelect({
                    filter: true,
                    width: "100%",
                    placeholder: $(this).attr("Select Category"),
                });
            }
        } catch (error) {
            console.log("Error fetching categories:", error);
        }
    }

    async function GetInstructorList() {
        try {
            let lastKey = "";
            let hasMore = true;
            let loading = false;

            const response = await apiFetch(`${INSTRUCTORS_API_BASE}?limit=100`);
            const data = await response.json();
            const JSON_Obj = data.instructors || [];
            lastKey = data.lastKey;
            hasMore = !!lastKey && data.hasMore !== false;

            function instructorOptionText(instr) {
                var m = instr.mobile_no != null ? String(instr.mobile_no) : "";
                var n = instr.name != null ? String(instr.name) : "";
                return m ? m + " — " + n : n;
            }

            var element = [];
            for (var i = 0; i < JSON_Obj.length; i++) {
                var _instructor = JSON_Obj[i];
                var instructorId = _instructor.user_id || _instructor.Id;
                element.push(
                    '<option value="' +
                    instructorId +
                    '">' +
                    instructorOptionText(_instructor) +
                    " </option>"
                );
                if (typeof _instructorList !== "undefined") _instructorList.push(instructorId);
            }
            $("#divJson #ddl_instructor").html(element.join(" "));
            if (tmpinstructor) {
                // Fetch full detail even if in list, as list objects might be partial
                (async () => {
                    try {
                        const searchUrl = `${INSTRUCTORS_API_BASE}/${encodeURIComponent(tmpinstructor)}`;
                        const searchResponse = await apiFetch(searchUrl);
                        const searchData = await searchResponse.json();
                        _instructorData = searchData.instructor || searchData;
                        console.log("Initial instructor data fetched:", _instructorData);
                    } catch (e) {
                        console.error("Error fetching initial instructor details:", e);
                    }
                })();
            }

            var $select = $("#divJson #ddl_instructor").selectize({
                sortField: "text",
                maxOptions: 100000,
                placeholder: "Type mobile number to search…",
                searchField: ["text", "value"],
                loadThrottle: 300,
                onChange: async function (value) {
                    if (value && value !== "noinstructor") {
                        try {
                            const searchUrl = `${INSTRUCTORS_API_BASE}/${encodeURIComponent(value)}`;
                            const searchResponse = await apiFetch(searchUrl);
                            const searchData = await searchResponse.json();
                            _instructorData = searchData.instructor || searchData;
                            console.log("Selected instructor data updated:", _instructorData);
                        } catch (e) {
                            console.error("Error fetching selected instructor details:", e);
                        }
                    } else {
                        _instructorData = null;
                    }
                },
                load: async function (query, callback) {
                    var digits = String(query || "").replace(/\D/g, "");
                    if (digits.length < 8) {
                        return callback([]);
                    }
                    try {
                        const searchUrl =
                            INSTRUCTORS_API_BASE + "/" +
                            encodeURIComponent(digits);
                        const searchResponse = await apiFetch(searchUrl);
                        const searchData = await searchResponse.json();

                        var list = searchData.instructors;
                        if (!list || !list.length) {
                            if (searchData.instructor) {
                                list = [searchData.instructor];
                            } else if (Array.isArray(searchData.data)) {
                                list = searchData.data;
                            } else if (searchData.user_id || searchData.mobile_no) {
                                list = [searchData];
                            } else {
                                list = [];
                            }
                        }
                        var results = (list || []).map(function (instr) {
                            var id = String(instr.user_id || instr.Id || "");
                            if (id && typeof _instructorList !== "undefined" && !_instructorList.includes(id)) {
                                _instructorList.push(id);
                            }
                            return {
                                value: id,
                                text: instructorOptionText(instr),
                            };
                        });
                        callback(results);
                    } catch (e) {
                        console.error("Search error:", e);
                        callback([]);
                    }
                },
                onDropdownOpen: function ($dropdown) {
                    var self = this;
                    var $content = $dropdown.find('.selectize-dropdown-content');

                    // Detach then re-attach to ensure no double-listeners AND it is bound to the latest DOM element
                    $content.off('scroll').on('scroll', async function () {
                        if (loading || !lastKey) return;

                        var scrollPos = Math.ceil($content.scrollTop() + $content.innerHeight());
                        var scrollHeight = $content[0].scrollHeight;

                        if (scrollPos >= scrollHeight - 50) {
                            loading = true;
                            try {
                                console.log("Fetching next page of instructors with lastKey:", lastKey);
                                const nextUrl = `${INSTRUCTORS_API_BASE}?limit=100&lastKey=${encodeURIComponent(lastKey)}`;
                                const nextResponse = await apiFetch(nextUrl);
                                const nextData = await nextResponse.json();

                                if (nextData.instructors && nextData.instructors.length > 0) {
                                    nextData.instructors.forEach(instr => {
                                        var id = instr.user_id || instr.Id;
                                        self.addOption({
                                            value: id,
                                            text: instructorOptionText(instr),
                                        });
                                        if (typeof _instructorList !== "undefined" && !_instructorList.includes(id)) _instructorList.push(id);
                                    });
                                    self.refreshOptions(false);
                                }

                                lastKey = nextData.lastKey;
                            } catch (e) {
                                console.error("Error loading more instructors:", e);
                            } finally {
                                loading = false;
                            }
                        }
                    });
                }
            });
            var selectize = $select[0].selectize;
            if (tmpinstructor && !selectize.options[tmpinstructor]) {
                try {
                    const searchUrl = `${INSTRUCTORS_API_BASE}/${encodeURIComponent(tmpinstructor)}`;
                    const searchResponse = await apiFetch(searchUrl);
                    const searchData = await searchResponse.json();
                    let instr = searchData.instructor;
                    if (!instr && Array.isArray(searchData.instructors)) instr = searchData.instructors[0];
                    if (!instr && (searchData.user_id || searchData.mobile_no)) instr = searchData;

                    if (instr) {
                        _instructorData = instr;
                        selectize.addOption({
                            value: String(instr.user_id || instr.Id),
                            text: instructorOptionText(instr),
                        });
                        if (typeof _instructorList !== "undefined") _instructorList.push(String(instr.user_id || instr.Id));
                    }
                } catch (e) {
                    console.error("Error fetching specific instructor:", e);
                }
            }
            selectize.setValue(tmpinstructor || "");
        } catch (error) {
            console.log("Error fetching instructors:", error);
        }
    }
    async function GetLocationList() {
        try {
            const response = await apiFetch(LOCATIONS_API_BASE);
            const data = await response.json();
            const JSON_Obj = data.locations;

            var element = [];
            element.push('<option value="NoLocation">No Location</option>');
            for (var i = 0; i < JSON_Obj.length; i++) {
                element.push('<option value="' + JSON_Obj[i].location.toLowerCase() + '">' + JSON_Obj[i].location + " </option>");
            }
            $("#divJson #ddl_location").html(element.join(" "));
            var $select = $("#divJson #ddl_location").selectize({
                sortField: 'text',
                maxOptions: 100000,
                placeholder: "Select Location"
            });
            var selectize = $select[0].selectize;

            if (tmplocation && tmplocation !== "NoLocation" && !selectize.options[tmplocation]) {
                selectize.addOption({ value: tmplocation.toLowerCase(), text: tmplocation });
            }
            selectize.setValue(tmplocation || "NoLocation");
        } catch (error) {
            console.log("Error fetching locations:", error);
        }
    }
    async function GetOrganisationList() {
        try {
            const response = await apiFetch(ORGANISATION_MASTER_API_BASE);
            const responseData = await response.json();
            const JSON_Obj = responseData.data;

            var element = [];
            element.push('<option value="NoOrganisation">No Organisation</option>');
            for (var i = 0; i < JSON_Obj.length; i++) {
                var org = JSON_Obj[i];
                var orgId = org.id || org.Id || org.Organisation.toLowerCase().replace(/ /g, "_");
                element.push('<option value="' + orgId + '">' + org.Organisation + " </option>");
            }
            $("#divJson #ddl_organisation").html(element.join(" "));
            var $select = $("#divJson #ddl_organisation").selectize({
                sortField: 'text',
                maxOptions: 100000,
                placeholder: "Select Organisation"
            });
            var selectize = $select[0].selectize;

            if (tmpOrganisation && tmpOrganisation !== "NoOrganisation" && !selectize.options[tmpOrganisation]) {
                // Try to find if it's a name and we need the ID
                let foundId = Object.keys(selectize.options).find(key => selectize.options[key].text.toLowerCase() === tmpOrganisation.toLowerCase());
                if (foundId) {
                    selectize.setValue(foundId);
                } else {
                    selectize.addOption({ value: tmpOrganisation, text: tmpOrganisation });
                    selectize.setValue(tmpOrganisation);
                }
            } else {
                selectize.setValue(tmpOrganisation || "NoOrganisation");
            }
        } catch (error) {
            console.log("Error fetching organisations:", error);
        }
    }
    async function GetvideoFormatList() {
        let list = [
            { text: "Portrait", value: "portrait" },
            { text: "Landscape", value: "landscape" },
        ];
        var element = [];
        $(list).each(function () {
            element.push(
                '<option value="' + this["value"] + '">' + this["text"] + " </option>"
            );
        });
        $("#divJson #ddl_video_format").html(element.join(" "));
    }

    function RenderFields(slug) {
        // debugger;
        fs.readFile(
            path.join(__dirname, "Files") + "/" + slug + ".json",
            "utf8",
            function (err, data) {
                var JSON_Obj = JSON.parse(data);
                // debugger;
                var finalHtml = ParseToElement(JSON_Obj);
                $("#divJson").html(finalHtml.join(" "));
                GetCategoryList();

                GetvideoFormatList();
                GetInstructorList();
                GetLocationList();
                GetOrganisationList();
                // $("body").toggleClass("loaded");
            }
        );
    }

    function ParseToElement(JSON_Obj) {
        // debugger;
        var ControlsList = [];
        for (var i = 0; i < JSON_Obj.length; i++) {
            var object = JSON_Obj[i];
            var element = [];
            element.push('<div class="' + object.class + '">');
            if (object.type != "checkbox" && object.type != "hr") {
                element.push("<label>" + object.label + "</label>");
            }
            if (object.type == "text") {
                element.push(
                    '<input id="txt_' +
                    object.name +
                    '" name="' +
                    object.name +
                    '" type="text" value="" class="form-control">'
                );
            } else if (object.type == "select") {
                element.push(
                    '<select id="ddl_' +
                    object.name +
                    '" name="' +
                    object.name +
                    '" value="" class="form-control"></select>'
                );
            } else if (object.type == "checkbox") {
                element.push("<br><label>" + object.label);
                element.push(
                    '<input id="chk_' +
                    object.name +
                    '" name="' +
                    object.name +
                    '" type="checkbox" value="">'
                );
                element.push("</label>");
            } else if (object.type == "hr") {
                element.push('<hr class="col-md=12">');
            }
            if (object.button != null) {
                element.push(
                    '</div> <div id="btnAddCategory" class="col-md-2"><br> <a class="btn btn-default">' +
                    object.button +
                    "</a>"
                );
            }
            element.push("</div>");
            ControlsList.push(element.join(" "));
        }
        return ControlsList;
    }
    $(".btnAdd").on("click", function () {
        AddField($(this).text(), "");
        return false;
    });

    $("#divExtraField").on("click", ".btnFullStory", function () {
        var _button = this;
        switch ($(this).text()) {
            case "Edit":
                $(_button).closest(".fullstory").find(".customeEditor").attr("contenteditable", true);
                $(_button).closest(".fullstory").find(".customeEditor").focus();
                break;
            case "Delete":
                $(_button).closest(".fullstory").remove();
                break;
            case "Move Up/Down":
                $(_button).closest(".fullstory");
                break;
            default:
        }
        return false;
    });

    $("#divExtraField").on("blur", ".customeEditor", function () {
        $(this).attr("contenteditable", false);
    });

    $("#divExtraFieldHindi").on("click", ".btnFullStory", function () {
        var _button = this;
        switch ($(this).text()) {
            case "Edit":
                $(_button).closest(".fullstory").find(".customeEditor").attr("contenteditable", true);
                $(_button).closest(".fullstory").find(".customeEditor").focus();
                break;
            case "Delete":
                $(_button).closest(".fullstory").remove();
                break;
            case "Move Up/Down":
                $(_button).closest(".fullstory");
                break;
            default:
        }
        return false;
    });
    $("#divExtraFieldHindi").on("blur", ".customeEditor", function () {
        $(this).attr("contenteditable", false);
    });

    let _storySaved = false;

    $("#btnSave").on("click", async function () {
        if (_storySaved) {
            dialog.showErrorBox("Already saved", "This story has already been saved. Close and reopen to add a new story.");
            return;
        }
        $("#btnSave").prop("disabled", true);
        $("body").toggleClass("loaded");
        var GenerateStory = {};
        var GenerateStory = {};
        let rawdata = fs.readFileSync(
            path.resolve(__dirname, "Files/newStory.json")
        );
        var newStory = JSON.parse(rawdata);
        for (var key in newStory) {
            GenerateStory[key] = $.trim(
                $("#divJson").find('[name="' + key + '"]').val()
            );
        }
        var fullStory = GetFullStory($("#divExtraField"));
        GenerateStory["fullStory"] = fullStory;
        GenerateStory["itemId"] = editItemId;
        GenerateStory["fullStory_hindi"] = GetFullStory($("#divExtraFieldHindi"));
        if ($('#ddl_ddlcategory').attr('multiple') == "multiple") {
            GenerateStory["master_categories"] = $("#divJson #ddl_ddlcategory").val().join(",");
        }
        else {
            GenerateStory["master_categories"] = $("#divJson #ddl_ddlcategory").val();
        }

        if ($('#ddl_sub_categories').attr('multiple') == "multiple") {
            GenerateStory["sub_categories"] = $("#divJson #ddl_sub_categories").val().join(",");
        }
        else {
            GenerateStory["sub_categories"] = $("#divJson #ddl_sub_categories").val();
        }
        if ($('#chk_show_contact').is(":checked")) {
            GenerateStory["show_contact"] = true;
        }
        else {
            GenerateStory["show_contact"] = false;
        }
        if ($('#chk_consent_received').is(":checked")) {
            GenerateStory["consent_received"] = true;
        }
        else {
            GenerateStory["consent_received"] = false;
        }
        GenerateStory["hide"] = $("#chk_storiesvisiblity").is(":checked") ? 1 : 0;
        GenerateStory["priority"] = $("#chk_storiespriority").is(":checked") ? 1 : 0;
        if ($("#divJson #ddl_ddlcategory").val() == null) {
            $("body").toggleClass("loaded");
            $("#btnSave").prop("disabled", false);
            dialog.showErrorBox("required field", "Please select master category");
            return false;
        }
        if ($("#divJson #ddl_location").val() == null || $("#divJson #ddl_location").val() == "" || $("#divJson #ddl_location").val() == undefined) {
            $("body").toggleClass("loaded");
            $("#btnSave").prop("disabled", false);
            dialog.showErrorBox("Required field", "Please select location");
            return false;
        }
        if ($("#divJson #ddl_instructor").val() == null || $("#divJson #ddl_instructor").val() == "" || $("#divJson #ddl_instructor").val() == undefined) {
            $("body").toggleClass("loaded");
            $("#btnSave").prop("disabled", false);
            dialog.showErrorBox("Required field", "Please select Instructor");
            return false;
        }
        if (type === "default") {
            if ($("#divJson #ddl_organisation").val() == null || $("#divJson #ddl_organisation").val() == "" || $("#divJson #ddl_organisation").val() == undefined) {
                $("body").toggleClass("loaded");
                $("#btnSave").prop("disabled", false);
                dialog.showErrorBox("Required field", "Please select organisation");
                return false;
            }
            if ($("#divJson #ddl_organisation").find('option:selected').val().toLowerCase().trim() == "vfly") {
                $("body").toggleClass("loaded");
                if (confirm("Are you sure want to VFLY as Organisation for this story!")) {

                }
                else {
                    $("#btnSave").prop("disabled", false);
                    return false;
                }
            }
        }
        tmpTopStory = true;
        validaton(GenerateStory, async function (result) {
            if (result.cansave) {
                let meta = null;
                //if (type === "default") {
                let masterIdentifier = editSlug;
                let storiesBody = {};
                for (const key of STORIES_API_ALLOWED_KEYS) {
                    if (key === "isFullstoryAdded") {
                        storiesBody[key] = GenerateStory["fullStory"] && GenerateStory["fullStory"].trim() !== "";
                    } else if (key === "date") {
                        storiesBody[key] = GenerateStory["date"] && GenerateStory["date"].trim() !== ""
                            ? GenerateStory["date"]
                            : moment(new Date()).format("DD/MM/yyyy HH:mm");
                    } else if (key in GenerateStory) {
                        storiesBody[key] = GenerateStory[key];
                    }
                }
                const response = await apiFetch(editSlug !== "" ? masterStoriesApiUrl + "/" + masterIdentifier : masterStoriesApiUrl, {
                    method: editSlug !== "" ? "PUT" : "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(storiesBody),
                });
                meta = await response.json();
                console.log("API Response:", meta);
                //}

                const detailIdentifier = editSlug || GenerateStory.slug;
                const detailMethod = editSlug !== "" ? "PUT" : "POST";

                const detailResponse = await apiFetch(
                    (type !== "default" || editSlug !== "")
                        ? `${STORY_DETAIL_API_BASE}/${detailIdentifier}`

                        : `${STORY_DETAIL_API_BASE}`,
                    {
                        method: detailMethod,
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(GenerateStory),
                    }
                );

                const metaStoryDetail = await detailResponse.json();
                console.log("API Response:", metaStoryDetail);
                const locationVal = $("#divJson #ddl_location").val();

                /*
                if (locationVal && locationVal !== "NoLocation") {
                    const addLocationResponse = await apiFetch(`${LOCATIONS_API_BASE}/${locationVal}`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(GenerateStory),
                    });
                    const locationMeta = await addLocationResponse.json();
                    console.log("Location Detail API Response:", locationMeta);
                }
                */
                const categoryVal = $("#divJson #ddl_ddlcategory").val();

                if (categoryVal) {
                    const categoriesArr = Array.isArray(categoryVal) ? categoryVal : [categoryVal];
                    const slug = GenerateStory.slug;
                    const isUpdate = editSlug !== "";

                    for (const cat of categoriesArr) {
                        if (!cat) continue;

                        const method = isUpdate && type === "default" ? "PUT" : "POST";
                        const catUrl = isUpdate && type === "default"
                            ? `${CATEGORIES_API_BASE}/${cat}/${slug}`
                            : `${CATEGORIES_API_BASE}/${cat}`;

                        try {
                            let addCategoryResponse = await apiFetch(catUrl, {
                                method: method,
                                headers: {
                                    "Content-Type": "application/json",
                                },
                                body: JSON.stringify(GenerateStory),
                            });

                            let categoryMeta = await addCategoryResponse.json();

                            // If PUT fails because slug not found in category, fall back to POST
                            if (categoryMeta && categoryMeta.error && categoryMeta.error.toLowerCase().includes("not found") && method === "PUT" && type === "default") {
                                console.log(`Category '${cat}': slug not found via PUT, retrying with POST`);
                                addCategoryResponse = await apiFetch(`${CATEGORIES_API_BASE}/${cat}`, {
                                    method: "POST",
                                    headers: {
                                        "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify(GenerateStory),
                                });
                                categoryMeta = await addCategoryResponse.json();
                            }

                            console.log(`Category Detail API Response for ${cat}:`, categoryMeta);

                            if (categoryMeta && categoryMeta.error) {
                                dialog.showErrorBox("Category Error", `Failed to save story in category '${cat}': ${categoryMeta.error}`);
                            }
                        } catch (catErr) {
                            console.error(`Error updating category ${cat}:`, catErr);
                        }
                    }
                }
                for (var key in templateTop) {
                    templateTop[key] = GenerateStory[key];
                }

                await WriteonTrendingNew(GenerateStory.slug, templateTop);

                // await WriteInMasterIndex(templateTop); now we add same as  add stories
                // await CheckSlugStory(templateTop.slug);
                // await RemoveFromUnchecked(templateTop.slug);

                await saveOninstructor(templateTop);

                // await saveOnSubcategory(templateTop);
                if ($("#divJson #ddl_location").val() != "" && $("#divJson #ddl_location").val() != undefined && $("#divJson #ddl_location").val() != "NoLocation") {
                    await saveOnTags_Location(templateTop, $("#divJson #ddl_location").val(), "location");
                }
                var _tags = $("#divJson").find('[name="tags"]').val();
                if (previousTags && previousTags !== _tags) {
                    const oldTags = previousTags.split(',').map(t => t.trim());
                    const newTags = _tags.split(',').map(t => t.trim());
                    const removedTags = oldTags.filter(t => !newTags.includes(t));
                    if (removedTags.length > 0) {
                        await deleteFromTags(templateTop.slug, removedTags.join(','));
                    }
                }

                await saveTags_Master(templateTop);

                if (_tags != "") {
                    const tagList = _tags.split(",");
                    for (const tag of tagList) {
                        if (tag.trim() !== "") {
                            await saveOnTags_Location(templateTop, tag.trim(), "tags");
                        }
                    }
                }
                // if ($('#chk_storiesvisiblity').is(":checked")) {
                //     await HideFromAllJSON(templateTop);
                // }
                // if ($('#chk_storiespriority').is(":checked")) {
                //     await MakeStoryPriority(templateTop);
                // }
                //Organisation
                var _organisations = $("#divJson #ddl_organisation").val();
                if (_organisations != "" && _organisations != undefined && _organisations != "NoOrganisation") {
                    await saveOnOrganisation(templateTop, _organisations, "organisation");
                }

                _storySaved = true;
                $("body").toggleClass("loaded");
                const options = { title: "", message: "Story Saved succssfully", detail: "", };
                try {
                    dialog.showMessageBox(null, options);
                } catch (e) {
                    console.log(e);
                    dialog.showMessageBox(null, options);
                }
            } else {
                $("body").toggleClass("loaded");
                $("#btnSave").prop("disabled", false);
                try {
                    dialog.showErrorBox("required field", result.msg);
                } catch (e) {
                    dialog.showErrorBox("required field", result.msg);
                    console.log(e);
                }
            }
        });
    });

    async function saveTags_Master(templateTop) {
        var tagDataMaster = [];
        try {
            const response = await apiFetch(MASTER_TAG_API_BASE);
            const result = await response.json();
            tagDataMaster = result.data || result.master_tags || result || [];
        } catch (error) {
            console.error("Error reading master tags via API:", error);
        }

        if (templateTop.tags) {
            const existingTags = new Set(tagDataMaster.map(entry => entry.tag));
            const tagsEn = templateTop.tags.split(',').map(t => t.trim());
            const tagsHi = (templateTop.tags_hindi || "").split(',').map(t => t.trim());

            const newTags = [];
            tagsEn.forEach((tagEn, index) => {
                const tagSlug = slugify(tagEn);
                if (tagSlug && !existingTags.has(tagSlug)) {
                    newTags.push({
                        tag: tagSlug,
                        title: tagEn,
                        tag_hindi: tagsHi[index] || ""
                    });
                }
            });

            if (newTags.length > 0) {
                try {
                    const method = editSlug !== "" ? "PUT" : "POST";
                    const url = method === "PUT" ? `${MASTER_TAG_API_BASE}/${editSlug}` : MASTER_TAG_API_BASE;
                    const response = await apiFetch(url, {
                        method: method,
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(newTags),
                    });
                    const meta = await response.json();
                    console.log(`Master Tag API Response (${method}):`, meta);
                } catch (error) {
                    console.error("Error writing master tags via API:", error);
                }
            } else {
                console.log("No new tags to add.");
            }
        }
    }

    /*
    const IsExistsTagMaster = await existsS3Bucket(`${activePathS3["TagsMaster"]}`);
    if (IsExistsTagMaster.isExists) {
        try {
            var submetaTagMaster = await readS3BucketAsync(`${activePathS3["TagsMaster"]}`, "");
            if (submetaTagMaster.err) {
                console.log(submetaTagMaster.err);
            } else {
                if (submetaTagMaster.data != null && submetaTagMaster.data.length > 3)
                    tagDataMaster = JSON.parse(submetaTagMaster.data);
            }
        } catch (e) {
            console.log(e);
        }
    }

    var isTagMasterExists = 0;
    // if (tagDataMaster.length > 0) 
    // {
    const existingTags = new Set(tagDataMaster.map(entry => entry.tag));

    const tagsEn = templateTop.tags.split(',').map(t => t.trim());
    const tagsHi = templateTop.tags_hindi.split(',').map(t => t.trim());

    tagsEn.forEach((tagEn, index) => {
        const tagSlug = slugify(tagEn);
        if (!existingTags.has(tagSlug)) {
            tagDataMaster.push({
                tag: tagSlug,
                title: tagEn,
                tag_hindi: tagsHi[index] || ""
            });
            // existingTags.add(tagDataMaster); // prevent future duplicates
        }
    });

    const arrayContent = Array.from(tagDataMaster);
    await WriteS3Bucket(arrayContent, `${activePathS3["TagsMaster"]}`, function (tt) { });
    // }
    */


    async function validaton(json, callback) {
        var list = ["storyHeading", "name", "slug", "category"];
        var result = { cansave: true, msg: "", node: "" };
        for (var i = 0; i < list.length; i++) {
            if ($.trim(json[list[i]]) == "") {
                $("#divJson")
                    .find('[name="' + list[i] + '"]')
                    .addClass("error");
                result["cansave"] = false;
                result["msg"] = "Please enter " + list[i];
                result["node"] = list[i];
                $("#divJson")
                    .find('[name="' + list[i] + '"]')[0]
                    .scrollIntoView();
            }
        }
        if (isNaN($("#txt_workmobUserId").val())) {
            $("#txt_workmobUserId").addClass("error");
            result["cansave"] = false;
            result["msg"] = "Please enter valid userid";
            $("#txt_workmobUserId").focus();
        }
        var txtboxSlug = $('input[name="slug"]');
        var slug = $(txtboxSlug).val();
        var hide = false;
        var priority = false;

        if ($('#chk_storiesvisiblity').is(":checked")) {
            hide = true;
        }
        if ($('#chk_storiespriority').is(":checked")) {
            priority = true;
        }

        if (result["cansave"]) {
            // await CheckSlugStory(slug); // Removed redundant call during save flow
            if ($(txtboxSlug).attr("disabled") == undefined) {
                try {
                    console.log("Checking slug availability via story-detail API...");
                    const checkResponse = await apiFetch(`${STORY_DETAIL_API_BASE}/${encodeURIComponent(slug)}`);
                    const checkData = await checkResponse.json();


                } catch (e) {
                    console.error("Slug check error:", e);
                }

                /*
                let MasterIndexJson = [];
                const RawMasterJson = await readS3BucketAsync(
                    activePathS3["MasterIndex"],
                    ""
                );
                if (RawMasterJson.err) {
                    // return console.log(RawMasterJson.err);
                    MasterIndexJson.push({
                        slug: slug,
                        workmobUserId: $("#txt_workmobUserId").val(),
                        workmobUserName: $("#txt_workmobUserName").val(),
                        location: $.trim($("#divJson").find('[name="location"]').val()),
                        category: $.trim($("#divJson").find('[name="category"]').val()),
                        name: $.trim($("#divJson").find('[name="name"]').val()),
                        date: moment(new Date()).format("DD/MM/yyyy HH:mm"),
                        isFullstoryAdded: $.trim(json["fullStory"]) == "" ? false : true,
                        tags: $.trim($("#divJson").find('[name="tags"]').val()),
                        storyHeading: $.trim(
                            $("#divJson").find('[name="storyHeading"]').val()
                        ),
                        industry: $.trim($("#divJson").find('[name="industry"]').val()),
                        thumb: $.trim($("#divJson").find('[name="thumb"]').val()),
                        webpthumb: $.trim($("#divJson").find('[name="webpthumb"]').val()),
                        landmark: $.trim($("#divJson").find('[name="landmark"]').val()),
                        streetAddress: $.trim($("#divJson").find('[name="streetAddress"]').val()),
                        instructor: $.trim($("#divJson").find('[name="instructor"]').val()),
                        hide: hide,
                        priority: priority,

                    });
                    var meta = await WriteS3Bucket(
                        MasterIndexJson,
                        activePathS3["MasterIndex"]
                    );
                    $(txtboxSlug).attr("disabled", "disabled");
                } else {
                    MasterIndexJson = JSON.parse(RawMasterJson.data);
                    var FilterResult = [];
                    if (MasterIndexJson.length > 0) {
                        FilterResult = MasterIndexJson.filter(function (item) {
                            if (item.slug != undefined) {
                                return (
                                    $.trim(item.slug.toLowerCase()) == $.trim(slug.toLowerCase())
                                );
                            }
                        });
                    }
                    if (FilterResult.length > 0) {
                        result["cansave"] = false;
                        result["msg"] = "Slug already exists";
                        $(slug).addClass("error");
                    } else {
                        MasterIndexJson.push({
                            slug: slug,
                            workmobUserId: $("#txt_workmobUserId").val(),
                            workmobUserName: $("#txt_workmobUserName").val(),
                            location: $.trim($("#divJson").find('[name="location"]').val()),
                            category: $.trim($("#divJson").find('[name="category"]').val()),
                            name: $.trim($("#divJson").find('[name="name"]').val()),
                            date: moment(new Date()).format("DD/MM/yyyy HH:mm"),
                            isFullstoryAdded: $.trim(json["fullStory"]) == "" ? false : true,
                            tags: $.trim($("#divJson").find('[name="tags"]').val()),
                            storyHeading: $.trim(
                                $("#divJson").find('[name="storyHeading"]').val()
                            ),
                            industry: $.trim($("#divJson").find('[name="industry"]').val()),
                            thumb: $.trim($("#divJson").find('[name="thumb"]').val()),
                            webpthumb: $.trim($("#divJson").find('[name="webpthumb"]').val()),
                            landmark: $.trim($("#divJson").find('[name="landmark"]').val()),
                            streetAddress: $.trim($("#divJson").find('[name="streetAddress"]').val()),
                            instructor: $.trim($("#divJson").find('[name="instructor"]').val()),
                            hide: hide,
                            priority: priority,
                        });
                        var meta = await WriteS3Bucket(
                            MasterIndexJson,
                            activePathS3["MasterIndex"]
                        );
                        $(txtboxSlug).attr("disabled", "disabled");
                    }
                }
            } else {
                var MasterIndexJson = [];
                var FilterResult = [];
                const RawMasterJson = await readS3BucketAsync(
                    activePathS3["MasterIndex"],
                    ""
                );
                if (RawMasterJson.err) {
                    return console.log(RawMasterJson.err);
                } else {
                    MasterIndexJson = JSON.parse(RawMasterJson.data);
                    if (MasterIndexJson.length > 0) {
                        FilterResult = MasterIndexJson.filter(function (item) {
                            return item.slug == slug;
                        });
                    }
                    if (FilterResult.length == 0) {
                        MasterIndexJson.push({
                            slug: slug,
                            workmobUserId: $("#txt_workmobUserId").val(),
                            workmobUserName: $("#txt_workmobUserName").val(),
                            location: $.trim($("#divJson").find('[name="location"]').val()),
                            category: $.trim($("#divJson").find('[name="category"]').val()),
                            name: $.trim($("#divJson").find('[name="name"]').val()),
                            date: moment(new Date()).format("DD/MM/yyyy HH:mm"),
                            isFullstoryAdded: $.trim(json["fullStory"]) == "" ? false : true,
                            tags: $.trim($("#divJson").find('[name="tags"]').val()),
                            storyHeading: $.trim(
                                $("#divJson").find('[name="storyHeading"]').val()
                            ),
                            industry: $.trim($("#divJson").find('[name="industry"]').val()),
                            thumb: $.trim($("#divJson").find('[name="thumb"]').val()),
                            webpthumb: $.trim($("#divJson").find('[name="webpthumb"]').val()),
                            landmark: $.trim($("#divJson").find('[name="landmark"]').val()),
                            streetAddress: $.trim($("#divJson").find('[name="streetAddress"]').val()),
                            instructor: $.trim($("#divJson").find('[name="instructor"]').val()),
                            hide: hide,
                            priority: priority,
                        });
                        var meta = await WriteS3Bucket(
                            MasterIndexJson,
                            activePathS3["MasterIndex"]
                        );
                    } else {
                        for (var i = 0; i < MasterIndexJson.length; i++) {
                            if (MasterIndexJson[i].slug == slug) {
                                MasterIndexJson[i].workmobUserId =
                                    $("#txt_workmobUserId").val();
                                MasterIndexJson[i].workmobUserName =
                                    $("#txt_workmobUserName").val();
                                MasterIndexJson[i].location = $.trim(
                                    $("#divJson").find('[name="location"]').val()
                                );
                                MasterIndexJson[i].name = $.trim(
                                    $("#divJson").find('[name="name"]').val()
                                );
                                MasterIndexJson[i].category = $.trim(
                                    $("#divJson").find('[name="category"]').val()
                                );
                                MasterIndexJson[i].isFullstoryAdded =
                                    $.trim(json["fullStory"]) == "" ? false : true;
                                MasterIndexJson[i].tags = $.trim(
                                    $("#divJson").find('[name="tags"]').val()
                                );
                                MasterIndexJson[i].storyHeading = $.trim(
                                    $("#divJson").find('[name="storyHeading"]').val()
                                );
                                MasterIndexJson[i].industry = $.trim(
                                    $("#divJson").find('[name="industry"]').val()
                                );
                                MasterIndexJson[i].thumb = $.trim(
                                    $("#divJson").find('[name="thumb"]').val()
                                );
                                MasterIndexJson[i].webpthumb = $.trim(
                                    $("#divJson").find('[name="webpthumb"]').val()
                                );

                                MasterIndexJson[i].landmark = $.trim(
                                    $("#divJson").find('[name="landmark"]').val()
                                );
                                MasterIndexJson[i].streetAddress = $.trim(
                                    $("#divJson").find('[name="streetAddress"]').val()
                                );
                                MasterIndexJson[i].instructor = $.trim(
                                    $("#divJson").find('[name="instructor"]').val()
                                );
                                MasterIndexJson[i].date =
                                    MasterIndexJson[i].date == null
                                        ? moment(new Date()).format("DD/MM/yyyy HH:mm")
                                        : MasterIndexJson[i].date;

                                // if(MasterIndexJson[i].hide==undefined || MasterIndexJson[i].hide == false)
                                // {
                                MasterIndexJson[i].hide = hide;
                                // }
                                // if(MasterIndexJson[i].priority==undefined || MasterIndexJson[i].priority == false)
                                // {
                                MasterIndexJson[i].priority = priority;
                                // }

                            }
                        }
                        var meta = await WriteS3Bucket(
                            MasterIndexJson,
                            activePathS3["MasterIndex"]
                        );
                    }
                */
            }
        }
        callback(result);
    }
    $("#divJson").on("blur", ".error", function () {
        if ($.trim($(this).val()) != "") {
            $(this).removeClass("error", "");
        }
    });

    function GetFullStory(div) {
        var strStory = [];
        $(div)
            .children()
            .each(function () {
                var label = $(this).find("label:first").text();
                var $editor = $(this).find(".customeEditor");
                if ($editor.length > 0) {
                    var plainText = $.trim($editor.text().replace(/\u00A0/g, ' '));
                    var htmlContent = $.trim($editor.html());
                    // Skip empty fields (like empty headings, paragraphs, bulleted lists, video URLs, image URLs, quotes)
                    if (plainText === "" && htmlContent !== "<br>") {
                        return; // continue to next element
                    }
                }
                switch (label) {
                    case "Heading":
                        strStory.push(
                            "<h3>" + $.trim($editor.html()) + "</h3>"
                        );
                        break;
                    case "Paragraph":
                        strStory.push(
                            "<p>" + $.trim($editor.html()) + "</p>"
                        );
                        break;
                    case "Quote":
                        strStory.push(
                            '<blockquote name="blockquote">' +
                            $.trim($editor.html()) +
                            "</blockquote>"
                        );
                        break;
                    case "Quote green":
                        strStory.push(
                            '<blockquote name="blockquote green">' +
                            $.trim($editor.html()) +
                            "</blockquote>"
                        );
                        break;
                    case "Quote dark green":
                        strStory.push(
                            '<blockquote name="blockquote darkGreen">' +
                            $.trim($editor.html()) +
                            "</blockquote>"
                        );
                        break;
                    case "Quote light green":
                        strStory.push(
                            '<blockquote name="blockquote lightGreen">' +
                            $.trim($editor.html()) +
                            "</blockquote>"
                        );
                        break;
                    case "Bulleted list":
                        strStory.push("<ul>");
                        var list = $.trim(
                            $editor[0].innerText
                        ).split("\n");
                        for (var i = 0; i < list.length; i++) {
                            if ($.trim(list[i]) != "") {
                                strStory.push("<li>" + $.trim(list[i]) + "</li>");
                            }
                        }
                        strStory.push("</ul>");
                        break;
                    case "Paragraph bold":
                        strStory.push(
                            "<p><strong>" +
                            $.trim($editor.text()) +
                            "</strong></p>"
                        );
                        break;
                    case "Video":
                        strStory.push(
                            '<video controls src="' +
                            $.trim($editor.text()) +
                            '"> </video>'
                        );
                        break;
                    case "Image Url(Right)":
                        strStory.push(
                            '<img src="{{' +
                            $.trim($editor.text()) +
                            ' }}" alt="{{img name}}"/>'
                        );
                        break;
                    case "Image Url(Left)":
                        strStory.push(
                            '<span class="rounded-pill mr-2 float-left img-thumb text-center"><img src="' +
                            $.trim($editor.text()) +
                            '"/></span>'
                        );
                        break;
                }
            });
        return strStory.join(" ");
    }

    // function ReadSlug(slug) {
    //     readS3Bucket(
    //         activePathS3["story-detail"] + slug + ".json",
    //         function (json) {
    //             // debugger;
    //             if (json.err) {
    //                 $("#divJson").find('[name="slug"]').val(slug);
    //             }
    //             //fs.readFile(pathName + "/" + slug + ".json", 'utf8', function (err, data) {
    //             //if (err != null && err != "") {
    //             //    $('#divJson').find('[name="slug"]').val(slug);
    //             //}
    //             try {
    //                 var JSON_Obj = JSON.parse(json.data);
    //                 for (var key in JSON_Obj) {
    //                     var ignoreItem = [
    //                         "fullStory",
    //                         "fullStory_hindi",
    //                         "master_categories",
    //                     ];
    //                     if (ignoreItem.indexOf(key) == -1) {
    //                         $("#divJson")
    //                             .find('[name="' + key + '"]')
    //                             .val(JSON_Obj[key]);

    //                         if (key == "instructor") {
    //                             tmpinstructor = JSON_Obj[key];
    //                             GetInstructorList();
    //                         }
    //                         if (key == "location") {
    //                             // tmplocation=JSON_Obj[key];
    //                             // previousLocation=JSON_Obj[key];
    //                             GetLocatoionList();

    //                         }
    //                         if (key == "organisation") {

    //                             // tmpOrganisation=JSON_Obj[key];
    //                             // previousOrganisation=JSON_Obj[key];
    //                             GetOrganisationList();
    //                         }
    //                     }
    //                 }
    //                 var master_categories = [];
    //                 if (
    //                     JSON_Obj["master_categories"] != undefined &&
    //                     JSON_Obj["master_categories"] != ""
    //                 ) {
    //                     // will used at update time for remove purpose;
    //                     previousCategory = JSON_Obj["master_categories"].split(",");
    //                     master_categories = JSON_Obj["master_categories"].split(",");
    //                 } else {
    //                     previousCategory = "";
    //                     master_categories.push(masterCategory.toLocaleLowerCase());
    //                 }
    //                 if (JSON_Obj["organisation"] != undefined && JSON_Obj["organisation"] != "") {
    //                     // will used at update time for remove purpose;
    //                     previousOrganisation = JSON_Obj["organisation"];
    //                     tmpOrganisation = JSON_Obj["organisation"];
    //                 } else {
    //                     previousOrganisation = "";
    //                     tmpOrganisation = "";
    //                 }
    //                 if (JSON_Obj["location"] != undefined && JSON_Obj["location"] != "") {
    //                     // will used at update time for remove purpose;
    //                     previousLocation = JSON_Obj["location"];
    //                     tmplocation = JSON_Obj["location"];
    //                 } else {
    //                     previousLocation = "";
    //                     tmplocation = "";
    //                 }
    //                 $("#divJson #ddl_ddlcategory").val(master_categories);
    //                 $("#divJson #ddl_ddlcategory").multipleSelect("refresh");
    //                 $("#ddlLanguage").val("English");
    //                 var fullstory = JSON_Obj["fullStory"];
    //                 var _html = $.parseHTML(fullstory);
    //                 RenderFullStoryElement(_html);
    //                 $("#ddlLanguage").val("Hindi");
    //                 fullstory = JSON_Obj["fullStory_hindi"];
    //                 _html = $.parseHTML(fullstory);
    //                 RenderFullStoryElement(_html);
    //                 $("#ddlLanguage").val("English");
    //                 if (JSON_Obj["show_contact"] == true) {
    //                     $("#chk_show_contact").attr('checked', true);
    //                 }
    //                 else {
    //                     $("#chk_show_contact").attr('checked', false);
    //                 }
    //                 if (JSON_Obj["consent_received"] == true) {
    //                     $("#chk_consent_received").attr('checked', true);
    //                 }
    //                 else {
    //                     $("#chk_consent_received").attr('checked', false);
    //                 }
    //             } catch (e) {
    //                 $("#divJson").find('[name="slug"]').val(slug);
    //             }
    //         }
    //     );
    // }

    function ReadSlug(slug) {
        console.log("url", STORY_DETAIL_API_BASE + "/" + slug)
        $.ajax({
            url: STORY_DETAIL_API_BASE + "/" + slug,
            method: "GET",
            success: function (data) {
                try {
                    // Assuming data is already a parsed JSON object from the API.
                    // If it's a string, uncomment the next line: var JSON_Obj = JSON.parse(data);
                    var JSON_Obj = data;
                    editItemId = JSON_Obj.itemId || "";

                    var ignoreItem = ["fullStory", "fullStory_hindi", "master_categories"];

                    // Populate general fields
                    for (var key in JSON_Obj) {
                        if (ignoreItem.indexOf(key) === -1) {
                            $("#divJson").find('[name="' + key + '"]').val(JSON_Obj[key]);

                            if (key === "instructor") {
                                tmpinstructor = JSON_Obj[key];
                                GetInstructorList();
                            } else if (key === "tags") {
                                previousTags = JSON_Obj[key];
                            } else if (key === "location") {
                                tmplocation = JSON_Obj[key];
                                previousLocation = JSON_Obj[key];
                                GetLocationList();
                            } else if (key === "organisation") {
                                tmpOrganisation = JSON_Obj[key];
                                previousOrganisation = JSON_Obj[key];
                                GetOrganisationList();
                            }
                        }
                    }

                    // Handle categories
                    var master_categories = [];
                    if (JSON_Obj["master_categories"] != null && JSON_Obj["master_categories"] !== "") {
                        previousCategory = JSON_Obj["master_categories"].split(",");  // Fixed typo
                        master_categories = JSON_Obj["master_categories"].split(",");
                    } else {
                        previousCategory = "";
                        master_categories.push((masterCategory || "default").toLowerCase());  // Assumed default
                    }
                    $("#divJson #ddl_ddlcategory").val(master_categories);
                    $("#divJson #ddl_ddlcategory").multipleSelect("refresh");



                    // Render stories
                    $("#ddlLanguage").val("English");
                    var fullstory = JSON_Obj["fullStory"];
                    var _html = $.parseHTML(fullstory);
                    RenderFullStoryElement(_html);

                    $("#ddlLanguage").val("Hindi");
                    fullstory = JSON_Obj["fullStory_hindi"];
                    _html = $.parseHTML(fullstory);
                    RenderFullStoryElement(_html);
                    $("#ddlLanguage").val("English");

                    // Set checkboxes
                    $("#chk_show_contact").prop('checked', JSON_Obj["show_contact"] === true || JSON_Obj["show_contact"] === 1);
                    $("#chk_consent_received").prop('checked', JSON_Obj["consent_received"] === true || JSON_Obj["consent_received"] === 1);

                } catch (e) {
                    console.error("Error parsing JSON:", e);
                    $("#divJson").find('[name="slug"]').val(slug);
                }
            },
            error: function (xhr, status, error) {
                console.error("API request failed:", status, error);
                alert("Failed to load story details. Please try again.");
                $("#divJson").find('[name="slug"]').val(slug);
            }
        });
    }

    function RenderFullStoryElement(_html) {
        nodeNames = [];
        $.each(_html, function (i, el) {
            var txt = el.textContent ? $.trim(el.textContent.replace(/\u00A0/g, ' ')) : "";
            switch (el.nodeName) {
                case "H3":
                    if (txt !== "") {
                        AddField("Heading", $(el).html());
                    }
                    break;
                case "DIV":
                case "P":
                    if (txt !== "") {
                        if ($(el).find("strong").length == 0) {
                            AddField("Paragraph", $(el).html());
                        } else {
                            AddField("Paragraph bold", $(el).html());
                        }
                    }
                    break;
                case "BLOCKQUOTE":
                    if (txt !== "") {
                        if ($(el).hasClass("green")) {
                            AddField("Quote green", $(el).html());
                        } else if ($(el).hasClass("darkGreen")) {
                            AddField("Quote dark green", $(el).html());
                        } else if ($(el).hasClass("lightGreen")) {
                            AddField("Quote light green", $(el).html());
                        } else {
                            AddField("Quote", $(el).html());
                        }
                    }
                    break;
                case "UL":
                    if (txt !== "") {
                        console.log(el.nodeName, el);
                        AddField("Bulleted list", $(el).html());
                    }
                    break;
                case "SPAN":
                    AddField("Image Url(Left)", $(el).find("img").attr("src"));
                    break;
                case "VIDEO":
                    AddField("Video", $(el).attr("src"));
                    break;
                case "IMG":
                    AddField("Image Url(Right)", $(el).attr("src"));
                    break;
                default:
                    console.log(el.nodeName, $(el).text());
                    break;
            }
        });
    }
    function AddField(type, text) {
        var element = [];
        element.push(
            '<div class="row col-md-12 fullstory column" draggable="true">'
        );
        element.push('<div class="col-md-9">');
        element.push("<label>" + type + "</label>");
        switch (type) {
            case "Heading":
                element.push(
                    '<h3 name="' +
                    type +
                    '" tabindex="1"  class="' +
                    type +
                    ' customeEditor" contenteditable="true">' +
                    text +
                    "</h3>"
                );
                break;
            case "Paragraph":
                element.push(
                    '<p name="' +
                    type +
                    '" tabindex="1"  class="' +
                    type +
                    ' customeEditor" contenteditable="true">' +
                    text +
                    "</p>"
                );
                break;
            case "Quote":
                element.push(
                    '<blockquote name="blockquote ' +
                    type +
                    '" tabindex="1"  class="' +
                    type +
                    ' customeEditor" contenteditable="true">' +
                    text +
                    "</blockquote>"
                );
                break;
            case "Quote green":
                element.push(
                    '<blockquote name="blockquote green ' +
                    type +
                    '" style="color: green;" tabindex="1"  class="' +
                    type +
                    ' customeEditor" contenteditable="true">' +
                    text +
                    "</blockquote>"
                );
                break;
            case "Quote dark green":
                element.push(
                    '<blockquote name="blockquote darkGreen ' +
                    type +
                    '" style="color: darkgreen;" tabindex="1"  class="' +
                    type +
                    ' customeEditor" contenteditable="true">' +
                    text +
                    "</blockquote>"
                );
                break;
            case "Quote light green":
                element.push(
                    '<blockquote name="' +
                    type +
                    '" style="ccolor: lightgreen;" tabindex="1"  class="' +
                    type +
                    ' customeEditor" contenteditable="true">' +
                    text +
                    "</blockquote>"
                );
                break;
            case "Bulleted list":
                var li = $.parseHTML(text);
                var list = [];
                $.each(li, function (i, el) {
                    list.push($(el).text());
                });
                list = list.filter(function (i) {
                    return i != " ";
                });
                element.push(
                    '<div name="' +
                    type +
                    '" tabindex="1"  class="' +
                    type +
                    ' customeEditor" contenteditable="true">' +
                    list.join("</br>") +
                    "</div>"
                );
                break;
            case "Paragraph bold":
                element.push(
                    '<p name="' +
                    type +
                    '" tabindex="1" style="font-weight:bold"  class="' +
                    type +
                    ' customeEditor" contenteditable="true">' +
                    text +
                    "</p>"
                );
                break;
            case "Video":
                element.push(
                    '<div name="' +
                    type +
                    '" tabindex="1"  class="' +
                    type +
                    ' customeEditor" contenteditable="true">' +
                    text +
                    "</div>"
                );
                break;
            case "Image Url(Right)":
                element.push(
                    '<div name="' +
                    type +
                    '" tabindex="1"  class="' +
                    type +
                    ' customeEditor" contenteditable="true">' +
                    text +
                    "</div>"
                );
                break;
            case "Image Url(Left)":
                element.push(
                    '<div name="' +
                    type +
                    '" tabindex="1"  class="' +
                    type +
                    ' customeEditor" contenteditable="true">' +
                    text +
                    "</div>"
                );
                break;
        }
        element.push("</div>");
        element.push(
            '<div class="col-md-3 form-group"><label></label><br><a href="#" class="btnFullStory">Edit</a><a href="#" class="btnFullStory">Delete</a></div>'
        );
        element.push('<hr class="bg-info col-md-12"></div>');
        element.join(" ");

        var divName = "";
        if ($("#ddlLanguage").val() == "English") {
            divName = "divExtraField";
        } else {
            divName = "divExtraFieldHindi";
        }

        $("#" + divName + "").append(element.join(" "));
        var cols = $("#" + divName + " .column");
        [].forEach.call(cols, addDnDHandlers);
        $("#" + divName + " .customeEditor:last").focus();
    }


    function saveUPre() { }

    $("#ddlLanguage").on("change", function () {
        if ($(this).val() == "English") {
            $("#divExtraField").show();
            $("#divExtraFieldHindi").hide();
        } else {
            $("#divExtraField").hide();
            $("#divExtraFieldHindi").show();
        }
    });

    async function CheckSlugStory(slug) {
        console.log(`CheckSlugStory: called with slug="${slug}", type="${type}"`);
        console.log(`CheckSlugStory: storyAlsoOn =`, storyAlsoOn);
        for (var i = 0; i < storyAlsoOn.length; i++) {
            let fileJson = await readStoryFeed(storyAlsoOn[i], slug);
            try {
                var chkbox = $('[name="' + storyAlsoOn[i]["chkbox"] + '"]');
                $(chkbox).prop("checked", false);

                var exists = false;
                for (var j = 0; j < fileJson.length; j++) {
                    if (fileJson[j].slug == slug) {
                        exists = true;
                        storyAlsoOn[i]["isExist"] = true;
                        storyAlsoOn[i]["index"] = j;
                        storyAlsoOn[i]["total"] = fileJson.totalCount !== undefined ? fileJson.totalCount : fileJson.length;
                        storyAlsoOn[i]["itemId"] = fileJson[j].itemId || "";
                        break;
                    }
                }

                let configKey = storyAlsoOn[i]["chkbox"];
                let configValue = undefined;
                if (configJson) {
                    if (configJson[configKey] !== undefined) {
                        configValue = configJson[configKey];
                    } else {
                        let matchKey = Object.keys(configJson).find(k => k.toLowerCase() === configKey.toLowerCase());
                        if (matchKey) {
                            configValue = configJson[matchKey];
                        }
                    }
                }
                var MaxCount = configValue !== undefined ? parseInt(configValue) : 999;
                var existingCount = fileJson.totalCount !== undefined ? fileJson.totalCount : fileJson.length;

                if (MaxCount > existingCount || exists) {
                    storyAlsoOn[i]["CanAdd"] = true;
                    $(chkbox).removeAttr("disabled");
                } else {
                    storyAlsoOn[i]["CanAdd"] = false;
                    $(chkbox).attr("disabled", "disabled");
                }

                var lbl = chkbox.closest("label");
                var displayCount = configValue !== undefined ? configValue : "0";
                $(lbl).html(
                    storyAlsoOn[i]["label"] + " (" + displayCount + ") "
                );
                $(lbl).append(chkbox);

                if (exists) {
                    var chktemp = $('[name="' + storyAlsoOn[i]["chkbox"] + '"]').prop("checked");
                    if (!tmpTopStory || chktemp) {
                        $('[name="' + storyAlsoOn[i]["chkbox"] + '"]').prop(
                            "checked",
                            true
                        );
                        $(chkbox).removeAttr("disabled");
                    }
                }
            } catch (e) { }
        }
        if (type == "gyan") {
            $('[name="storiesgyan"]').prop("checked", true);
        }
    }

    function masterIndexTruth(val) {
        if (val === true || val === 1) {
            return true;
        }
        if (typeof val === "string") {
            var s = val.toLowerCase().trim();
            return s === "true" || s === "1";
        }
        return false;
    }

    async function RenderMasterIndexstuff(slug) {
        $("#chk_storiesvisiblity").prop("checked", false);
        $("#chk_storiespriority").prop("checked", false);
        if (slug == null || String(slug).trim() === "") {
            return;
        }
        try {
            const res = await apiFetch(
                masterStoriesApiUrl + "/" + encodeURIComponent(String(slug).trim())
            );
            if (!res.ok) {
                console.log("MasterIndex API: no story or HTTP " + res.status);
                return;
            }
            var row = await res.json();
            if (row && row.error) {
                return;
            }
            if (masterIndexTruth(row.hide)) {
                $("#chk_storiesvisiblity").prop("checked", true);
            }
            if (masterIndexTruth(row.priority)) {
                $("#chk_storiespriority").prop("checked", true);
            }
        } catch (e) {
            console.error("RenderMasterIndexstuff API error:", e);
        }
    }
    async function HideFromAllJSON(templateTop) {
        // rest all json is in "storyInAllJson" except category.
        for (var i = 0; i < storyInAllJson.length; i++) {
            let url = storyInAllJson[i].file;

            // Special handling for dynamic paths like locations and organisations
            if (url.includes("/organisations")) {
                if (previousOrganisation && previousOrganisation !== "NoOrganisation") {
                    url = `${url}/${$.trim(previousOrganisation).toLowerCase().replace(/ /g, "_")}`;
                } else {
                    continue;
                }
            } else if (url.includes("/locations")) {
                if (type === "default" && previousLocation && previousLocation !== "NoLocation") {
                    url = `${url}/${$.trim(previousLocation).toLowerCase().replace(/ /g, "_")}`;
                } else {
                    continue;
                }
            }

            try {
                const response = await apiFetch(url);
                const data = await response.json();
                let fileJson = data.story || data.stories || data.locations || data.organisations || data.data || data || [];

                if (Array.isArray(fileJson) && fileJson.length > 0) {
                    const originalLength = fileJson.length;
                    fileJson = fileJson.filter(itm => itm.slug != templateTop.slug);

                    if (fileJson.length !== originalLength) {
                        const isDetailApi = url.includes("/locations") || url.includes("/organisations");
                        await apiFetch(url, {
                            method: editSlug !== "" ? "PUT" : "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(isDetailApi ? fileJson : { story: fileJson })
                        });
                        console.log(url + " updated (story hidden)!");
                    }
                }
            } catch (e) {
                console.error("Error in HideFromAllJSON for URL: " + url, e);
            }
        }

        // Remove from Categories
        if (Array.isArray(previousCategory)) {
            for (const category of previousCategory) {
                try {
                    const catUrl = `${CATEGORIES_API_BASE}/${category}`;
                    const response = await apiFetch(catUrl);
                    const result = await response.json();
                    let allStory = result.stories || result.data || result || [];

                    if (Array.isArray(allStory)) {
                        const originalLength = allStory.length;
                        allStory = allStory.filter(itm => itm.slug != templateTop.slug);

                        if (allStory.length !== originalLength) {
                            await apiFetch(catUrl, {
                                method: editSlug !== "" ? "PUT" : "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify(allStory)
                            });
                            console.log(`Removed from category: ${category}`);
                        }
                    }
                } catch (e) {
                    console.error(`Error removing from category ${category}:`, e);
                }
            }
        }

        // Remove from Tags
        if (templateTop.tags) {
            const tagsArr = templateTop.tags.split(',').map(t => slugify(t.trim()));
            for (const tag of tagsArr) {
                if (!tag) continue;
                try {
                    const tagUrl = `${tagDetailPostUrl(tag)}/${encodeURIComponent(templateTop.slug)}`;
                    await apiFetch(tagUrl, { method: "DELETE" });
                    console.log(`Removed from tag: ${tag}`);
                } catch (e) {
                    console.error(`Error removing from tag ${tag}:`, e);
                }
            }
        }
    }



    async function MakeStoryPriority(templateTop) {
        let newallstory = [];
        $(previousCategory).each(async function () {
            let category = this.toString();
            if (category != 'top') {
                const slugResult = await readS3BucketAsync(
                    activePathS3["category-index"] + category + ".json", "");
                if (slugResult.err) {
                }
                else {
                    let AllStory = JSON.parse(slugResult.data);
                    let current_Story = AllStory.filter(function (data) { return data.slug == templateTop.slug; });
                    AllStory = AllStory.filter(function (data) { return data.slug != templateTop.slug; });
                    //AllStory.current_Story;
                    if (current_Story != null && current_Story.length > 0) {
                        newallstory.push(current_Story[0]);
                    }
                    if (AllStory.length > 0) {
                        for (let index = 0; index < AllStory.length; index++) {
                            newallstory.push(AllStory[index]);
                        }
                    }

                    await WriteS3Bucket(newallstory, activePathS3["category-index"] + category + ".json", function (tt) { });
                }
            }
        });
        let newlocationstory = [];
        var location = $('#ddl_location').find('option:selected').val();

        IsExists = await existsS3Bucket(activePathS3["location"] + "/" + location + ".json");
        if (IsExists.isExists) {
            slugResult = await readS3BucketAsync(activePathS3["location"] + "/" + location + ".json", "");
        }
        if (slugResult.err) {

        }
        else {
            let AllStory = JSON.parse(slugResult.data);
            let current_Story = AllStory.filter(function (data) { return data.slug == templateTop.slug; });
            AllStory = AllStory.filter(function (data) { return data.slug != templateTop.slug; });
            //AllStory.current_Story;
            if (current_Story != null && current_Story.length > 0) {
                newlocationstory.push(current_Story[0]);
            }
            if (AllStory.length > 0) {
                for (let index = 0; index < AllStory.length; index++) {
                    newlocationstory.push(AllStory[index]);
                }
            }
            await WriteS3Bucket(newlocationstory, activePathS3["location"] + "/" + location + ".json", function (tt) { });
        }
        //Add in masterindex about priority

        //  const metaMasterIndex = await readS3BucketAsync(
        //     activePathS3["MasterIndex"],
        //     ""
        // );
        // if (metaMasterIndex.err) {
        //     return console.log(metaMasterIndex.err);
        // }
        // var  MasterIndexJSONObj = JSON.parse(metaMasterIndex.data);
        // var Current_MasterIndexJSONObj = MasterIndexJSONObj.filter(function (itm) {
        //     return itm.slug ==  templateTop.slug;
        // });
        // var Rest_MasterIndexJSONObj = MasterIndexJSONObj.filter(function (itm) {
        //     return itm.slug !=  templateTop.slug;
        // });
        // if(Current_MasterIndexJSONObj!=null && Current_MasterIndexJSONObj[0]!=null)
        // {
        //     if(Current_MasterIndexJSONObj[0]["priority"]==undefined)
        //     {
        //         Current_MasterIndexJSONObj[0]["priority"]="True";
        //     }
        // }
        // Rest_MasterIndexJSONObj.push(Current_MasterIndexJSONObj[0])
        // if(Rest_MasterIndexJSONObj!=null)
        // {
        //     var meta = await WriteS3Bucket1(Rest_MasterIndexJSONObj, activePathS3["MasterIndex"], function (tt) { });
        //     console.log("MasterIndex file was saved!");
        // }
    }

    async function WriteonTrending(slug, templateTop) {
        var mainCategory = $("#ddl_ddlcategory").val() + ".json";
        var isExist = false;
        var Index = "-1";
        var CanContinue = false;
        if (storyAlsoOn.indexOf(mainCategory) == -1) {
            await existsS3Bucket(mainCategory, "", function (IsExists) {
                if (IsExists.isExists) {
                    readS3Bucket(mainCategory, function (json) {
                        var MainCategory = JSON.parse(json.data);
                        for (var i = 0; i < MainCategory.length; i++) {
                            if (MainCategory[i].slug == templateTop.slug) {
                                isExist = true;
                                Index = i;
                                break;
                            }
                        }
                        storyAlsoOn.push({
                            chkbox: $("#ddl_ddlcategory").val(),
                            file: mainCategory,
                            isExist: isExist,
                            index: Index,
                            manual: true,
                        });
                        CanContinue = true;
                    });
                } else {
                    storyAlsoOn.push({
                        chkbox: $("#ddl_ddlcategory").val(),
                        file: mainCategory,
                        isExist: false,
                        index: "-1",
                        manual: true,
                    });
                    CanContinue = true;
                }
            });
        } else {
            CanContinue = true;
        }

        var ti = setInterval(async function () {
            if (CanContinue) {
                for (var i = 0; i < storyAlsoOn.length; i++) {
                    var trand = storyAlsoOn[i];
                    if (
                        $('[name="' + trand["chkbox"] + '"]').is(":checked") ||
                        trand["manual"]
                    ) {
                        var topJson = [];
                        await existsS3Bucket(trand["file"], i, async function (IsExists) {
                            if (IsExists.isExists) {
                                var _index = parseInt(IsExists.data);
                                await readS3Bucket(storyAlsoOn[_index].file, function (json) {
                                    topJson = JSON.parse(json.data);
                                    if (!$.isArray(topJson)) {
                                        topJson = [topJson];
                                    }
                                });
                            }

                            if (topJson.length == 0) {
                                topJson = [templateTop];
                            } else {
                                if (storyAlsoOn[_index]["isExist"]) {
                                    topJson[storyAlsoOn[_index]["index"]] = templateTop;
                                } else {
                                    topJson.push(templateTop);
                                }
                            }
                            await WriteS3Bucket(
                                topJson,
                                storyAlsoOn[_index]["file"],
                                function (tt) {
                                    //checking index
                                    if (storyAlsoOn[_index]["manual"]) {
                                        for (var j = 0; j < topJson.length; j++) {
                                            if (topJson[j].slug == templateTop.slug) {
                                                storyAlsoOn = storyAlsoOn.filter(function (i) {
                                                    return i.chkbox != $("#ddl_ddlcategory").val();
                                                });
                                                storyAlsoOn.push({
                                                    chkbox: $("#ddl_ddlcategory").val(),
                                                    file: mainCategory,
                                                    isExist: true,
                                                    index: j,
                                                    manual: true,
                                                });
                                            }
                                        }
                                    }
                                }
                            );
                        });
                    } else {
                        if (trand["isExist"]) {
                            await readS3Bucket(trand["file"], async function (json) {
                                topJson = JSON.parse(json.data);
                                topJson = topJson.filter(function (itm) {
                                    return itm.slug != slug;
                                });
                                await WriteS3Bucket(topJson, json["file"], function (tt) {
                                    storyAlsoOn = storyAlsoOn.filter(function (i) {
                                        return i.chkbox != $("#ddl_ddlcategory").val();
                                    });
                                    storyAlsoOn.push({
                                        chkbox: $("#ddl_ddlcategory").val(),
                                        file: mainCategory,
                                        isExist: true,
                                        index: 0,
                                        manual: true,
                                    });
                                });
                            });
                        }
                    }
                }
                CheckSlugStory(templateTop.slug);
                clearInterval(ti);
            }
        }, 100);
    }

    $("#btnCanel").on("click", function () {
        ipcRenderer.send("closeChild");
    });

    let _deleteInProgress = false;

    $("#btndelete").on("click", async function () {
        if (_deleteInProgress) {
            dialog.showErrorBox("Already deleted", "This story has already been deleted.");
            return;
        }
        if (confirm("Are you sure want to delete this story!")) {
            _deleteInProgress = true;
            $("#btnSave").hide();
            $("body").toggleClass("loaded");
            const slug = editSlug;

            try {
                // 1. Delete from Master Stories API
                const deleteResponse = await apiFetch(`${masterStoriesApiUrl}/${slug}`, {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" }
                });
                console.log("Main story delete API response:", await deleteResponse.json());

                // 2. Delete from Story Detail API
                const deleteDetailResponse = await apiFetch(`${STORY_DETAIL_API_BASE}/${slug}`, {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" }
                });
                console.log("Story detail delete API response:", await deleteDetailResponse.json());

                // 3. Delete from Location
                const locationVal = $("#divJson #ddl_location").val();
                if (locationVal && locationVal !== "NoLocation") {
                    await deleteFromLocation(slug, locationVal);
                }

                // 4. Delete from Instructor
                const instructorVal = $("#divJson #ddl_instructor").val();
                if (instructorVal && instructorVal !== "noinstructor") {
                    await deleteFromInstructor(slug, instructorVal);
                }

                // 5. Delete from Organisation
                const organisationVal = $("#divJson #ddl_organisation").val();
                if (organisationVal && organisationVal !== "NoOrganisation") {
                    await deleteFromOrganisation(slug, organisationVal);
                }

                // 6. Delete from Categories
                const categoryVal = $("#divJson #ddl_ddlcategory").val();
                if (categoryVal) {
                    const categoriesArr = Array.isArray(categoryVal) ? categoryVal : [categoryVal];
                    for (const cat of categoriesArr) {
                        if (!cat) continue;
                        await deleteFromCategory(slug, cat);
                    }
                }

                // 7. Delete from Feeds
                for (const feed of storyAlsoOn) {
                    if ($('[name="' + feed.chkbox + '"]').is(":checked")) {
                        await deleteFromFeed(feed.file, slug);
                    }
                }

                // 8. Delete from Tags
                const tagsVal = $("#divJson").find('[name="tags"]').val();
                if (tagsVal) {
                    await deleteFromTags(slug, tagsVal);
                }

                $("body").toggleClass("loaded");
                alert("Story deleted successfully!");
                if (!prefillStoryTestData) {
                    ipcRenderer.send("reload-parent");
                    remote.getCurrentWindow().close();
                }

            } catch (error) {
                console.error("Error during story deletion:", error);
                _deleteInProgress = false;
                $("#btnSave").show();
                $("body").toggleClass("loaded");
                alert("Failed to delete story.");
            }
        }
    });


    async function deleteFromTags(slug, tagsString) {
        if (!tagsString) return;
        const tagsArr = tagsString.split(',').map(t => slugify(t.trim()));
        for (const tag of tagsArr) {
            if (!tag) continue;
            try {
                // 1. Delete from tag_detail
                const tagUrl = `${tagDetailPostUrl(tag)}/${encodeURIComponent(slug)}`;
                await apiFetch(tagUrl, { method: "DELETE" });

                // 2. Delete from master_tag
                //const masterUrl = `${MASTER_TAG_API_BASE}/${tag}`;
                //await apiFetch(masterUrl, { method: "DELETE" });

                console.log(`Deleted story ${slug} from tag: ${tag} and master list`);
            } catch (e) {
                console.error(`Error deleting from tag ${tag}:`, e);
            }
        }
    }

    async function deleteFromFeed(feedUrl, slug) {
        if (!feedUrl || !/^https?:\/\//i.test(feedUrl)) return;
        try {
            const url = `${feedUrl}/${slug}`;
            const response = await apiFetch(url, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" }
            });
            console.log(`Delete from feed response for ${feedUrl}:`, await response.json());
        } catch (e) {
            console.error(`Error deleting from feed ${feedUrl}:`, e);
        }
    }

    let deleteFromLocation = async (slug, location) => {
        if (type !== "default") return;
        const locSlug = normalizeLocationSlug(location);
        const pathSlug = normalizeDetailPathSegment(slug);
        if (!pathSlug) {
            console.error("deleteFromLocation: missing story slug");
            return;
        }
        const url = locationDetailPostUrl(locSlug, pathSlug);
        try {
            const delRes = await apiFetch(url, { method: "DELETE" });
            if (!delRes.ok && delRes.status !== 404) {
                await logApiError(delRes, "deleteFromLocation DELETE");
            }
        } catch (e) {
            console.error("Error deleting from location via API:", e);
        }
    };

    let deleteFromInstructor = async (slug, instructor) => {
        const url = `${INSTRUCTORS_API_BASE}/${instructor}`;
        try {
            let instructorKey = type === "default" ? "story" : type;
            const body = {};
            body[instructorKey] = [];

            const response = await apiFetch(url, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });
            console.log("Delete from instructor response:", await response.json());
        } catch (e) {
            console.error("Error deleting from instructor via API:", e);
        }
    };

    let deleteFromOrganisation = async (slug, organisation) => {
        const url = organisationDetailPostUrl(organisation, slug);
        try {
            const response = await apiFetch(url, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" }
            });
            console.log("Delete from organisation response:", await response.json());
        } catch (e) {
            console.error("Error deleting from organisation via API:", e);
        }
    };

    let deleteFromCategory = async (slug, category) => {
        // const url = type !== "default"
        //     ? `${CATEGORIES_API_BASE}?category=${encodeURIComponent(category)}&slug=${encodeURIComponent(slug)}`
        //     : `${CATEGORIES_API_BASE}/${category}`;

         const url = type !== "default"
            ? `${CATEGORIES_API_BASE}/${encodeURIComponent(category)}/${encodeURIComponent(slug)}`
            : `${CATEGORIES_API_BASE}/${category}`;
        try {
            const response = await apiFetch(url, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" }
            });
            console.log(`Delete from category ${category} response:`, await response.json());
        } catch (e) {
            console.error("Error deleting from category via API:", e);
        }
    };

    async function WriteonTrendingNew(slug, templateTop) {
        for (var i = 0; i < storyAlsoOn.length; i++) {
            var feed = storyAlsoOn[i];
            if (!$('[name="' + feed["chkbox"] + '"]').is(":checked")) {
                continue;
            }

            const meta = await writeStoryFeed(feed, templateTop);
            console.log(feed["label"] + " API Response:", meta);
        }
        /*
                for (var i = 0; i < storyAlsoOn.length; i++) {
                    var trand = storyAlsoOn[i];
                    if ($('[name="' + trand["chkbox"] + '"]').is(":checked") || trand["manual"]) {
                        var topJson = [];
                        const IsFileExists = await existsS3Bucket(trand["file"], i);
                        if (IsFileExists.isExists) {
                            var _index = parseInt(IsFileExists.data);
                            const trandJsonResult = await readS3BucketAsync(storyAlsoOn[_index].file, "");
                            if (trandJsonResult.err) {
                            } else {
                                topJson = JSON.parse(trandJsonResult.data);
                                if (!$.isArray(topJson)) {
                                    topJson = [topJson];
                                }
                            }
                        }
        
                        if (topJson.length == 0) {
                            topJson = [templateTop];
                        } else {
                            var isExists = topJson.filter(function (itm) {
                                return itm.slug == templateTop.slug;
                            });
                            if (isExists.length == 0) {
                                topJson.push(templateTop);
                            }
                        }
                        await WriteS3Bucket(topJson, storyAlsoOn[_index]["file"]);
                        //if (storyAlsoOn[_index]["manual"]) {
                        //    for (var j = 0; j < topJson.length; j++) {
                        //        if (topJson[j].slug == templateTop.slug) {
                        //            storyAlsoOn = storyAlsoOn.filter(function (i) { return i.chkbox != $('#ddl_ddlcategory').val(); })
                        //            storyAlsoOn.push({ "chkbox": $('#ddl_ddlcategory').val(), "file": mainCategory, "isExist": true, "index": j, "manual": true });
                        //        }
                        //    }
                        //}
                    } else {
                        if (trand["isExist"]) {
                            const trandJsonResult = await readS3BucketAsync(trand["file"], "");
                            if (trandJsonResult.err) {
                            } else {
                                topJson = JSON.parse(trandJsonResult.data);
                                topJson = topJson.filter(function (itm) {
                                    return itm.slug != slug;
                                });
                                //await WriteS3Bucket(topJson, json["file"]);
                                await WriteS3Bucket(topJson, trand["file"]);
                                storyAlsoOn = storyAlsoOn.filter(function (i) {
                                    return i.chkbox != $("#ddl_ddlcategory").val();
                                });
                                // storyAlsoOn.push({
                                //     chkbox: $("#ddl_ddlcategory").val(),
                                //     file: mainCategory,
                                //     isExist: true,
                                //     index: 0,
                                //     manual: true,
                                // });
                            }
                        }
                    }
                }
            */
    }
    const WriteInMasterIndex = async (templateTop) => {
        var categoryList = [];
        if ($('#ddl_ddlcategory').attr('multiple') == "multiple") {
            categoryList = $("#ddl_ddlcategory").val();
        }
        else {
            categoryList.push($("#ddl_ddlcategory").val());
        }
        categoryList.map(async function (category) {
            const slugResult = await readS3BucketAsync(activePathS3["category-index"] + category + ".json", "");
            if (slugResult.err) {
            } else {
                try {
                    var canAdd = true;
                    var AllStory = JSON.parse(slugResult.data);
                    for (i = 0; AllStory.length > i; i++) {
                        if (AllStory[i]["slug"].toLowerCase() == templateTop["slug"].toLowerCase()) {
                            AllStory[i] = templateTop;
                            canAdd = false;
                            break;
                        }
                    }
                    if (canAdd) {
                        AllStory.push(templateTop);
                    }
                    await WriteS3Bucket(
                        AllStory,
                        activePathS3["category-index"] + category + ".json",
                        function (tt) { }
                    );
                } catch (e) {
                    console.log(e);
                }
            }
            console.log(category);
        });
    };
    const RemoveFromUnchecked = async (slug) => {
        let vddlCategory = $("#ddl_ddlcategory").val();
        $(previousCategory).each(async function () {
            let category = this.toString();
            // Only remove from categories that were previously checked but are now unchecked
            if (vddlCategory.indexOf(category) == -1) {
                const url = `${CATEGORIES_API_BASE}/${category}`;
                try {
                    const response = await apiFetch(url);
                    const data = await response.json();
                    let AllStory = data.stories || data.data || data || [];
                    if (Array.isArray(AllStory)) {
                        const originalLength = AllStory.length;
                        AllStory = AllStory.filter(itm => itm.slug != slug);
                        if (AllStory.length !== originalLength) {
                            await apiFetch(url, {
                                method: editSlug !== "" ? "PUT" : "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify(AllStory)
                            });
                        }
                    }
                } catch (e) {
                    console.error(`Error removing from category ${category} via API:`, e);
                }
            }
        });
        previousCategory = vddlCategory;
    };


    let saveOninstructor = async (templateTop) => {
        let _instructor = $('#ddl_instructor').val();
        console.log("Saving story to instructor:", _instructor, "Type:", type);
        if (_instructor != "noinstructor" && _instructor != null && _instructor != "") {
            try {
                let instructorKey = type === "default" ? "story" : type;
                const body = {};
                console.log("Current _instructorData:", _instructorData);
                if (type !== "default" && _instructorData) {
                    if (!Array.isArray(_instructorData[instructorKey])) {
                        _instructorData[instructorKey] = [];
                        console.log(`Initialized empty array for key: ${instructorKey}`);
                    }
                    let index = _instructorData[instructorKey].findIndex(item => item.slug === templateTop.slug);
                    if (index !== -1) {
                        _instructorData[instructorKey][index] = templateTop;
                        console.log(`Updated existing story in ${instructorKey} at index ${index}`);
                    } else {
                        _instructorData[instructorKey].push(templateTop);
                        console.log(`Appended new story to ${instructorKey}. New length: ${_instructorData[instructorKey].length}`);
                    }
                    body[instructorKey] = _instructorData[instructorKey];
                } else {
                    body[instructorKey] = [templateTop];
                    console.log(`Default/No data path: Setting ${instructorKey} to single-item array`);
                }
                //console.log("instructor_data", _instructorData);
                console.log("Final request body for instructor update:", JSON.stringify(body));

                const response = await apiFetch(`${INSTRUCTORS_API_BASE}/${_instructor}`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(body),
                });
                const meta = await response.json();
                console.log("Instructor Story API Response:", meta);
            } catch (error) {
                console.error("Error saving instructor story via API:", error);
            }

            /*
            // debugger;
            // chk_consent_received
            // chk_show_contact
            //if (Need_trending_in.indexOf(type) != -1) {
            let instructorDetail = null;
            var submeta = await readS3BucketAsync(`${activePathS3["instructorPath"]}${_instructor}.json`, "");
            if (submeta.err) {
                console.log(submeta.err);
            } else {
                instructorDetail = JSON.parse(submeta.data);
            }
            console.log(instructorDetail);
            if (instructorDetail != null) {

                if (instructorDetail[type.replace("default", "story")] == undefined) {
                    instructorDetail[type.replace("default", "story")] = [];
                }

                var IsSlugExists = instructorDetail[type.replace("default", "story")].filter(function (item) {
                    return item.slug == templateTop.slug;
                });

                if (IsSlugExists.length == 0) {
                    instructorDetail[type.replace("default", "story")].push(templateTop);
                }
                else {
                    for (let index = 0; index < instructorDetail[type.replace("default", "story")].length; index++) {
                        const element = instructorDetail[type.replace("default", "story")][index];
                        if (element.slug == templateTop.slug) {
                            instructorDetail[type.replace("default", "story")][index] = templateTop;
                            // if(templateTop.)
                            break;
                        }
                    }
                }

                await WriteS3Bucket(instructorDetail, `${activePathS3["instructorPath"]}${_instructor}.json`, function (tt) { });
            }
            */
        }
    }
    let saveOnSubcategory = async (templateTop) => {
        var checkedCategories = $('#ddl_sub_categories').val();
        if ($('#ddl_sub_categories').attr('multiple') == "multiple" && checkedCategories.length > 0) {
            $(checkedCategories).each(async function () {
                var currentSubcategory = this.toString();
                let subCatDetail = [];
                try {
                    var submeta = await readS3BucketAsync(`${activePathS3["subcategoryPath"]}${currentSubcategory}.json`, "");
                    if (submeta.err) {
                        console.log(submeta.err);
                    } else {
                        subCatDetail = JSON.parse(submeta.data);
                    }
                } catch (e) {
                    console.log(e);
                }

                if (subCatDetail.length == 0) {
                    subCatDetail.push(templateTop);
                }
                else {
                    var isExists = subCatDetail.filter(function (itm) {
                        return itm.slug == templateTop.slug;
                    });
                    if (isExists.length == 0) {
                        subCatDetail.push(templateTop);
                    }
                    else {
                        for (var i = 0; i < subCatDetail.length; i++) {
                            if (subCatDetail[i]["slug"] == templateTop.slug) {
                                subCatDetail[i] = templateTop;
                            }
                        }
                    }
                }
                await WriteS3Bucket(subCatDetail, `${activePathS3["subcategoryPath"]}${currentSubcategory}.json`, function (tt) { });
            });
        }
    }

    let saveOnOrganisation = async (templateTop, filename, path) => {
        if (filename != "NoOrganisation" && filename != null && filename != "") {
            const orgSlug = filename.toLowerCase().replace(/ /g, "_");
            const normalizePrevious = (previousOrganisation || "").toLowerCase().trim().replace(/ /g, "_");

            // Handle organisation change: delete from old if it's different
            if (normalizePrevious != "" && normalizePrevious != "noorganisation" && normalizePrevious != orgSlug) {
                try {
                    await deleteFromOrganisation(templateTop.slug, normalizePrevious);
                } catch (e) {
                    console.error("Error removing from previous organisation via API:", e);
                }
            }

            try {
                const method = editSlug !== "" ? "PUT" : "POST";
                const detailUrl = method === "POST" ? organisationDetailPostUrl(orgSlug) : organisationDetailPostUrl(orgSlug, templateTop.slug);

                // Prefix slug with organisation ID as required by the API
                const organisationBody = {
                    ...templateTop,
                    id: orgSlug,
                    slug: templateTop.slug
                };

                const response = await apiFetch(detailUrl, {
                    method: method,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(organisationBody)
                });

                if (!response.ok) {
                    await logApiError(response, `organisation detail ${method}`);
                } else {
                    const meta = await response.json();
                    console.log(`Organisation Detail API Response (${method}):`, meta);
                    previousOrganisation = filename;
                }
            } catch (e) {
                console.error("Error writing organisation detail via API:", e);
            }
        }
    }


    let saveOnTags_Location = async (templateTop, filename, path) => {

        if (path == "tags") {
            try {
                const pathSlug = (type !== "default" && templateTop.slug) ? templateTop.slug : normalizeDetailPathSegment(templateTop.slug);
                const method = editSlug !== "" ? "PUT" : "POST";
                let detailUrl = method === "PUT"
                    ? `${tagDetailPostUrl(filename)}/${encodeURIComponent(pathSlug)}`
                    : tagDetailPostUrl(filename);
                const postBody = buildTagStoryPostBody(templateTop, filename);

                const response = await apiFetch(detailUrl, {
                    method: method,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(postBody)
                });
                const meta = await response.json();
                console.log("Tag Detail API Response:", meta);
            } catch (e) {
                console.error("Error writing tag detail via API:", e);
            }
        }

        if (path == "location" && type === "default") {
            filename = $.trim(filename.toLowerCase()).replace(/ /g, "_");
            const normalizePrevious = (previousLocation || "").toLowerCase().trim().replace(/ /g, "_");

            if (normalizePrevious != "" && normalizePrevious != "select_location" && normalizePrevious != "nolocation" && normalizePrevious != filename) {
                try {
                    const pathSlug = normalizeDetailPathSegment(templateTop.slug);
                    if (pathSlug) {
                        const prevDetailUrl = locationDetailPostUrl(normalizePrevious, pathSlug);
                        const removeRes = await apiFetch(prevDetailUrl, { method: "DELETE" });
                        if (!removeRes.ok && removeRes.status !== 404) {
                            await logApiError(removeRes, "location previous DELETE (remove story)");
                        } else {
                            console.log("Location detail removed from previous location via API");
                        }
                    }
                } catch (e) {
                    console.error("Error removing from previous location via API:", e);
                }
            }

            try {
                const pathSlug = normalizeDetailPathSegment(templateTop.slug);
                if (!pathSlug) {
                    console.error("Location detail: missing story slug");
                    return;
                }
                const detailUrl = locationDetailPostUrl(filename, pathSlug);
                const postBody = {
                    ...buildLocationStoryPostBody(templateTop, filename),
                    slug: pathSlug
                };
                const writeResponse = await apiFetch(detailUrl, {
                    method: editSlug !== "" ? "PUT" : "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(postBody)
                });
                if (!writeResponse.ok) {
                    await logApiError(writeResponse, "location detail POST");
                } else {
                    const meta = await writeResponse.json();
                    console.log("Location Detail API Response:", meta);
                    previousLocation = filename;
                }
            } catch (e) {
                console.error("Error saving to new location via API:", e);
            }
        }
    }
})();
