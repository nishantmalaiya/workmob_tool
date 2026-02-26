const fs = require('fs');
const path = require('path');
const buffer = require('buffer').Buffer;
// let pathName = path.join(__dirname, 'Files');
//let pathName = "C:\\WM_Json";
var remote = require('@electron/remote');
// var session = require('electron').remote.session;
// var app = require('electron').remote.app;
var ipcRenderer = require('electron').ipcRenderer;
// const { ipcMain } = require('electron');
const dialog = remote.dialog;
let common = require('./js/config');
let activePathS3 = common.getS3Path();

GetCategoryList();

var JSON_Obj = null;


function GetCategoryList() {
    //debugger;
    const url = "https://r5dojmizdd.execute-api.ap-south-1.amazonaws.com/prod/categories";

    fetch(url)
        .then(response => response.json())
        .then(data => {
            var element = [];
            element.push("<option value=\"\">select</option>");
            var JSON_ObjCategory = data.categories;
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

// $('#ddlCategory').on('change', function () {
//     debugger;
//     if ($.trim($(this).val()) != "") {
//         $('body').toggleClass('loaded');
//         try {
//             readS3Bucket(activePathS3["category-index"] + $(this).val() + ".json", function (json) {
//                 $('body').toggleClass('loaded');
//                 if (json.err) {
//                     $('#ddlCity').html('');
//                     $('#divStory').html('');
//                     return console.log(json.err);
//                 }
//                 var cityList = [];
//                 var city = [];
//                 city.push("<option value=\"\">All</option>");

//                 JSON_Obj = JSON.parse(json.data);
//                 for (let index = 0; index < JSON_Obj.length; index++) {
//                     var _story = JSON_Obj[index];
//                     if (cityList.indexOf(_story.location) == -1) {
//                         cityList.push(_story.location);
//                         city.push("<option value=\"" + _story.location + "\">" + _story.location + "</option>");
//                     }
//                 }
//                 $('#divStory').html(RenderStory(JSON_Obj).join(" "));
//                 $('#ddlCity').html(city.join(" "));
//                 var $select = $("#ddlCity").selectize({
//                     sortField: 'text',
//                     maxOptions:100000,
//                     placeholder:"Select City"
//                 });
//                 var selectize = $select[0].selectize;
//                 selectize.setValue('');
//             });
//         } catch (e) {
//             $('body').toggleClass('loaded');
//             console.log(e);
//             $('#ddlCity').html('');
//             $('#divStory').html('');
//         }
//     }
// });

let currentOffset = 0; // Track the current offset
const limit = 100; // Number of records to fetch per request
let allRecords = []; // Store fetched records
let isFetching = false; // Prevent concurrent fetches
let lastEvaluatedKey = null;
let hasMoreRecords = true;

$('#ddlCategory').on('change', function () {

    const selectedCategory = $.trim($(this).val());
    if (selectedCategory !== "") {
        $('body').toggleClass('loaded');
        try {
            currentOffset = 0; // Reset offset
            allRecords = []; // Clear any previous records
            lastEvaluatedKey = null;
            hasMoreRecords = true;
            $('#divStory').html(''); // Clear the story container

            // Fetch the first set of records
            fetchAndRenderRecords(selectedCategory, currentOffset, limit);
        } catch (e) {
            $('body').toggleClass('loaded');
            console.error(e);
            $('#ddlCity').html('');
            $('#divStory').html('');
        }
    }
});

// Function to fetch and render records
function fetchAndRenderRecords(categoryValue, offset, limit) {
    if (isFetching) {
        if ($('body').hasClass("loaded")) {
            $('body').toggleClass('loaded');

        };
        return
    }; // Prevent overlapping requests
    isFetching = true;

    let url = "https://r5dojmizdd.execute-api.ap-south-1.amazonaws.com/prod/categories/" + categoryValue;
    if (typeof lastEvaluatedKey !== 'undefined' && lastEvaluatedKey) {
        url += "?lastEvaluatedKey=" + encodeURIComponent(JSON.stringify(lastEvaluatedKey));
    }

    fetch(url)
        .then(response => response.json())
        .then(json => {
            isFetching = false; // Reset fetching status
            $('body').toggleClass('loaded');

            JSON_Obj = json.stories;
            const recordsToAppend = JSON_Obj; // Assume API returns the page

            // Append and render records if available
            if (recordsToAppend.length > 0) {
                allRecords = [...allRecords, ...recordsToAppend]; // Update allRecords
                renderData(recordsToAppend, JSON_Obj, offset === 0); // Render new records
                currentOffset += recordsToAppend.length; // Increment offset
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

function Pagination(key) {
    lastEvaluatedKey = key;
}

// Render records and update dropdown
// Render records and update dropdown
function renderData(newRecords, fullData, updateCity) {
    if (updateCity) {
        let cityList = [];
        let city = ["<option value=\"\">All</option>"];

        // Update city dropdown
        fullData.forEach(record => {
            if (!cityList.includes(record.location)) {
                cityList.push(record.location);
                city.push(`<option value="${record.location}">${record.location}</option>`);
            }
        });

        // Destroy existing Selectize instance if it exists
        if ($('#ddlCity')[0].selectize) {
            $('#ddlCity')[0].selectize.destroy();
        }

        $('#ddlCity').html(city.join(" "));

        // Initialize Selectize for city dropdown
        const $select = $("#ddlCity").selectize({
            sortField: 'text',
            maxOptions: 100000,
            placeholder: "Select City"
        });
        const selectize = $select[0].selectize;
        selectize.setValue('');
    }

    $('#divStory').append(RenderStory(newRecords).join(" "));
}

// Scroll event to load more records
let scrollTimeout; // For debouncing

$(window).on('scroll', function () {
    if (scrollTimeout) clearTimeout(scrollTimeout);

    scrollTimeout = setTimeout(function () {
        if ($(window).scrollTop() + $(window).height() >= $(document).height() - 10) {
            if (!isFetching && hasMoreRecords) {
                const categoryValue = $('#ddlCategory').val(); // Get selected category
                fetchAndRenderRecords(categoryValue, currentOffset, limit); // Fetch more records
                console.log('currentOffset' + currentOffset + 'limit' + limit + 'lastEvaluatedKey' + lastEvaluatedKey);
                console.log('Fetching more records...');
            }
        }
    }, 200); // Debounce scroll event by 200ms
});








function RenderStory(JSON_Obj) {
    var storyCard = [];
    for (let index = 0; index < JSON_Obj.length; index++) {
        var _story = JSON_Obj[index];
        storyCard.push("<div class=\"storycard col-md-12 row\">")
        storyCard.push("<div class=\"col-md-1\"><img class=\"storythumb\" src=\"" + _story.thumb + "\" alt=\"" + _story.name + "\"></div>");
        storyCard.push("<div class=\"col-md-7\"><h4>" + _story.storyHeading + "</h4>" + _story.industry + "</div>");
        storyCard.push("<div class=\"col-md-2\">" + _story.location + "</div>");
        storyCard.push("<div class=\"col-md-1\"><a name=\"Detail\" href=\"#\" data-id=\"" + _story.slug + "\" >Detail</a></div>");
        storyCard.push("<hr class=\"storyHr\"></div>")
    }
    return storyCard;
}



$('#ddlCity').on('change', function () {
    ApplyFilter();
});
$('#txtName').on('blur', function () {
    ApplyFilter();
});
$('#txtSlug').on('blur', function () {
    ApplyFilter();
});
function ApplyFilter() {
    var story = JSON_Obj;
    if ($('#txtSlug').val() == "") {
        if ($('#ddlCity').val() != "") {
            story = JSON_Obj.filter(function (i) {
                return i.location == $('#ddlCity').val();
            });
        }
        if ($('#txtName').val() != "") {
            story = story.filter(function (i) {
                return i.name.toLowerCase().indexOf($('#txtName').val().toLowerCase()) != -1;
            });
        }
        $('#divStory').html(RenderStory(story).join(" "));
    }
    else {
        readS3Bucket(activePathS3["story-detail"] + $('#txtSlug').val() + ".json", function (json) {
            if (json.err) {
                $('#ddlCity').html('');
                $('#divStory').html('');
                dialog.showErrorBox('Slug not exists', "Please enter valid slug");
                return console.log(json.err);
            }
            else {
                configJson = JSON.parse(json.data);
                story = [configJson];
                $('#divStory').html(RenderStory(story).join(" "));
            }
        });
    }
}


//var a={"storiestop":"50","storiestending":"50","storiesMobileHomeScreen":"120","bloghome":"50","storieshope":"0","storiesgyan":"0"};
// var a = [];
// WriteS3Bucket(a, "namaste-trending.json", function (tt) {
//    console.log(tt);
// });


$('#btnAddStory').on('click', function () {
    Model("addStory.html", "");
});

function Model(pagename, slug) {
    let data = { "slug": slug, "pagename": pagename, "category": $('#ddlCategory').val() };

    // ipcMain.on('input-broadcast', (event, data) => {
    //     // Handle the data received from the renderer (parent)
    //     console.log(data);
    //     // Send a response to the renderer (child)
    //     event.sender.send('receiveSlug', data);
    //   });

    ipcRenderer.send('input-broadcast', data);
}

$('#divStory').on('click', 'a[name="Detail"]', function () {
    var slug = $(this).attr('data-id');
    Model("addStory.html", slug);
});
$('#submit').on('click', function () {
    $('#ddlCategory').trigger('change');
});