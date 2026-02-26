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
let currentOffset = 0; // Track the current offset
const limit = 10; // Number of records to fetch per request
let allRecords = []; // Store fetched records
let isFetching = false; // Prevent concurrent fetches
let hasMore = false;
let lastKey = '';
var JSON_Obj = null;
let selectizeInstance = null;
var type = remote.getGlobal("sharedObj").currentStory;

locationMasterList();

async function locationMasterList() {
  // Reset initial state
  currentOffset = 0;
  allRecords = [];
  $('.single').html('');

  if (type == 'default') {
    GetCategoryList(currentOffset, limit);
  } else {
    GetFromS3CategoryList();
  }
}

function GetCategoryList(offset, limit) {

  isFetching = true;

  // For scroll loads: Show loader inside the open dropdown
  const dropdown = $('.selectize-dropdown');
  if (dropdown.length > 0) {
    dropdown.append('<div class="dropdown-loader"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid" width="30" height="30" style="shape-rendering: auto; display: block; background: rgb(255, 255, 255);margin: 0 auto;" xmlns:xlink="http://www.w3.org/1999/xlink"><g><circle stroke-dasharray="164.93361431346415 56.97787143782138" r="35" stroke-width="10" stroke="#337ab7" fill="none" cy="50" cx="50"><animateTransform keyTimes="0;1" values="0 50 50;360 50 50" dur="1s" repeatCount="indefinite" type="rotate" attributeName="transform"></animateTransform></circle><g></g></g></svg></div>');
  }

  const url = `https://r5dojmizdd.execute-api.ap-south-1.amazonaws.com/prod/categories?limit=${limit}&lastKey=${encodeURIComponent(lastKey)}`;

  fetch(url)
    .then(response => response.json())
    .then(data => {      
      hasMore = data.hasMore;
      lastKey = data.lastKey;

      var JSON_ObjCategory = data.categories;

      if (!selectizeInstance) {
        // First load: Build HTML, initialize Selectize
        var element = [];
        element.push("<option value=\"\">select</option>");
        for (let index = 0; index < JSON_ObjCategory.length; index++) {
          var _category = JSON_ObjCategory[index];
          element.push("<option value=\"" + _category.category + "\">" + _category.title + "</option>");
        }
        $('#ddlCategory').html(element.join(' '));
        var $select = $("#ddlCategory").selectize({
          sortField: false,
          maxOptions: 100000,
          placeholder: "Select Category"
        });
        selectizeInstance = $select[0].selectize;
        selectizeInstance.setValue('');

        // Attach scroll event to the Selectize dropdown when it opens
        selectizeInstance.on('dropdown_open', function () {
          const dropdown = $('.selectize-dropdown');
          if (dropdown.length > 0) {
            console.log('Dropdown opened. Attaching scroll event...');
            let scrollTimeout;
            dropdown.off('scroll').on('scroll', function () {
              if (scrollTimeout) clearTimeout(scrollTimeout);
              scrollTimeout = setTimeout(() => {
                if (dropdown.scrollTop() + dropdown.height() >= dropdown[0].scrollHeight - 10) {
                  if (!isFetching && hasMore) {
                    console.log('Fetching more categories...');
                    GetCategoryList(currentOffset, limit);
                  }
                }
              }, 200);
            });
          }
        });
      } else {
        // Subsequent loads (e.g., from scroll): Append new options to existing Selectize
        JSON_ObjCategory.forEach(_category => {
          // Add each new option (Selectize handles sorting and avoids duplicates if values are unique)
          selectizeInstance.addOption({ value: _category.category, text: _category.title });
        });
        // Refresh the dropdown to show new options
        selectizeInstance.refreshOptions();
      }

      // Update offset (optional, since you're using lastKey, but for consistency)
      currentOffset += limit;
    })
    .catch(err => {
      console.log(err);
    }).finally(() => {
      // Hide loader after fetch (success or error)
      $('.dropdown-loader').remove();
      isFetching = false;
    });
}

function GetFromS3CategoryList() {
    //debugger;
    readS3Bucket(activePathS3.category, function (json) {
        if (json.err) {
            return console.log(json.err);
        }
        var element = [];
        element.push("<option value=\"\">select</option>");
        var JSON_ObjCategory = JSON.parse(json.data);
        console.log('JSON_ObjCategory', JSON_ObjCategory);
        for (let index = 0; index < JSON_ObjCategory.length; index++) {
            var _category = JSON_ObjCategory[index];
            element.push("<option value=\"" + _category.category + "\">" + _category.title + "</option>");
        }
        $('#ddlCategory').html(element.join(' '));
        var $select = $("#ddlCategory").selectize({
            sortField: 'text',
            maxOptions:100000,
            placeholder:"Select Category"
        });
        var selectize = $select[0].selectize;
        selectize.setValue('');
    });

}


// function GetCategoryList(offset, limit) {
//   //debugger;
//   const url = `https://r5dojmizdd.execute-api.ap-south-1.amazonaws.com/prod/categories?limit=${limit}&lastKey=${encodeURIComponent(lastKey)}`;

//   fetch(url)
//     .then(response => response.json())
//     .then(data => {
//       var element = [];
//       element.push("<option value=\"\">select</option>");
//       hasMore = data.hasMore;
//       lastKey = data.lastKey;
//       var JSON_ObjCategory = data.categories;
//       for (let index = 0; index < JSON_ObjCategory.length; index++) {
//         var _category = JSON_ObjCategory[index];
//         element.push("<option value=\"" + _category.category + "\">" + _category.title + "</option>");
//       }
//       $('#ddlCategory').html(element.join(' '));
//       var $select = $("#ddlCategory").selectize({
//         sortField: 'text',
//         maxOptions: 100000,
//         placeholder: "Select Category"
//       });
//       var selectize = $select[0].selectize;
//       selectize.setValue('');

//       selectize.on('dropdown_open', function () {
//         const dropdown = $('.selectize-dropdown'); // Selectize appends this to <body>
//         if (dropdown.length > 0) {
//           console.log('Dropdown opened and found. Attaching scroll event...');
//           let scrollTimeout;
//           dropdown.off('scroll').on('scroll', function () {  // Use off().on() to avoid duplicates
//             console.log('heyuuu');
//             if (scrollTimeout) clearTimeout(scrollTimeout);
//             scrollTimeout = setTimeout(() => {
//               // Check if scrolled near the bottom of the dropdown
//               if (dropdown.scrollTop() + dropdown.height() >= dropdown[0].scrollHeight - 10) {
//                 if (!isFetching && hasMore) {  // Only fetch if more data is available
//                   console.log('Fetching more categories...');
//                   GetCategoryList(currentOffset, limit);
//                 }
//               }
//             }, 200);  // Debounce by 200ms
//           });
//         } else {
//           console.log('Dropdown not found!');
//         }
//       });
//     })
//     .catch(err => {
//       console.log(err);
//     });
// }

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


$('#ddlCategory').on('change', function () {

  const selectedCategory = $.trim($(this).val());
  if (selectedCategory !== "") {
    $('body').toggleClass('loaded');
    try {
      currentOffset = 0; // Reset offset
      allRecords = []; // Clear any previous records
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

  // Assuming you have an API endpoint like '/api/getCategoryData' that accepts a 'category' query parameter
  // and returns a JSON response in the format: { data: <parsed JSON object>, err: <error message or null> }
  // If the API returns the raw JSON string, you can adjust accordingly (e.g., JSON.parse(response.data))

  // To handle potential issues with the response stream (e.g., if it's already been read elsewhere or if the API returns a string instead of JSON),
  // use response.text() and then JSON.parse, similar to the original readS3Bucket approach.
  // Also, added error handling for JSON parsing.

  fetch('https://r5dojmizdd.execute-api.ap-south-1.amazonaws.com/prod/categories/' + categoryValue)
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.text();
    })
    .then(jsonString => {
      try {
        const data = JSON.parse(jsonString);
        isFetching = false; // Reset fetching status
        $('body').toggleClass('loaded');

        // Assuming no 'err' field in this API response; if present, handle accordingly
        // if (data.err) {
        //     $('#ddlCity').html('');
        //     $('#divStory').html('');
        //     return console.log(data.err);
        // }

        JSON_Obj = data.stories; // The array of stories
        const recordsToAppend = JSON_Obj.slice(offset, offset + limit);

        // Append and render records if available
        if (recordsToAppend.length > 0) {
          allRecords = [...allRecords, ...recordsToAppend]; // Update allRecords
          renderData(recordsToAppend, JSON_Obj, offset === 0); // Render new records
          currentOffset += limit; // Increment offset
        }

        // If data.hasMore, you can set a flag to fetch more on next load, e.g., if (data.hasMore) { canLoadMore = true; lastKey = data.lastKey; }
      } catch (parseErr) {
        console.log('JSON parse error:', parseErr);
        $('#ddlCity').html('');
        $('#divStory').html('');
      }
    })
    .catch(err => {
      isFetching = false;
      $('body').toggleClass('loaded');
      $('#ddlCity').html('');
      $('#divStory').html('');
      console.log(err);
    });
  // readS3Bucket(
  //     activePathS3["category-index"] + categoryValue + ".json",
  //     function (json) {
  //         isFetching = false; // Reset fetching status
  //         $('body').toggleClass('loaded');

  //         if (json.err) {
  //             $('#ddlCity').html('');
  //             $('#divStory').html('');
  //             return console.log(json.err);
  //         }

  //         JSON_Obj = JSON.parse(json.data);
  //         const recordsToAppend = JSON_Obj.slice(offset, offset + limit);

  //         // Append and render records if available
  //         if (recordsToAppend.length > 0) {
  //             allRecords = [...allRecords, ...recordsToAppend]; // Update allRecords
  //             renderData(recordsToAppend, JSON_Obj, offset === 0); // Render new records
  //             currentOffset += limit; // Increment offset
  //         }

  //     }
  // );

  if ($('body').hasClass("loaded")) {
    $('body').toggleClass('loaded');

  };
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
      if (!isFetching) {
        const categoryValue = $('#ddlCategory').val(); // Get selected category
        fetchAndRenderRecords(categoryValue, currentOffset, limit); // Fetch more records
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
      console.log('hello comes');
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