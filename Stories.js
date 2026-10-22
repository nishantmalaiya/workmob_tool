const fs = require('fs');
const path = require('path');
const buffer = require('buffer').Buffer;
var remote = require('@electron/remote');
var ipcRenderer = require('electron').ipcRenderer;
const dialog = remote.dialog;
let common = require('./Js/config');
let activePathS3 = common.getS3Path();
let currentOffset = 0; // Track the current offset
const limit = 10; // Number of records to fetch per request
let allRecords = []; // Store fetched records
let isFetchingCategories = false; // Prevent concurrent category fetches
let isFetchingStories = false; // Prevent concurrent story fetches
let hasMore = false;
let lastKey = '';
var JSON_Obj = null;
let searchName = '';
let searchHasMore = false;
let searchLastKey = '';
let searchAllRecords = [];
let selectizeInstance = null;
var type = remote.getGlobal("sharedObj").currentStory;

// Clean SVG fallback placeholder for missing/broken story thumbnails (80x100 portrait)
const FALLBACK_THUMB = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='100' viewBox='0 0 80 100'%3E%3Crect width='80' height='100' fill='%23f1f5f9'/%3E%3Cpath d='M40 38a12 12 0 1 0 0-24 12 12 0 0 0 0 24zm-18 38c0-9.9 8.1-18 18-18s18 8.1 18 18H22z' fill='%2394a3b8'/%3E%3C/svg%3E";

locationMasterList();

async function locationMasterList() {
  currentOffset = 0;
  allRecords = [];
  $('.single').html('');
  console.log('type: ' + type);

  // All story types fetch categories via API
  GetCategoryList(currentOffset, limit);
}

function updateStoryCountBadge(shown, total) {
  const $badge = $('#storyCountBadge');
  if (typeof total === 'number' && total >= 0) {
    if (shown < total) {
      $badge.text(`Showing ${shown} of ${total} stories`).show();
    } else {
      $badge.text(`${total} stories`).show();
    }
  } else if (shown > 0) {
    $badge.text(`${shown} stories`).show();
  } else {
    $badge.hide();
  }
}

function showPaginationProgress(text) {
  if (text) {
    $('#paginationStats').text(text);
  }
  $('#paginationProgress').show();
}

function hidePaginationProgress() {
  $('#paginationProgress').hide();
}

function GetCategoryList(offset, limit) {
  isFetchingCategories = true;

  // Show loader inside the open dropdown
  const dropdown = $('.selectize-dropdown');
  if (dropdown.length > 0) {
    dropdown.append('<div class="dropdown-loader"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid" width="30" height="30" style="shape-rendering: auto; display: block; background: rgb(255, 255, 255);margin: 0 auto;" xmlns:xlink="http://www.w3.org/1999/xlink"><g><circle stroke-dasharray="164.93361431346415 56.97787143782138" r="35" stroke-width="10" stroke="#337ab7" fill="none" cy="50" cx="50"><animateTransform keyTimes="0;1" values="0 50 50;360 50 50" dur="1s" repeatCount="indefinite" type="rotate" attributeName="transform"></animateTransform></circle><g></g></g></svg></div>');
  }

  let apiName = (activePathS3.category || "categories").replace(".json", "");
  const hasLastKey = lastKey ? `&lastKey=${encodeURIComponent(lastKey)}` : '';
  const url = `${common.API_BASE_URL}/${apiName}?limit=${limit}${hasLastKey}`;

  fetch(url)
    .then(response => response.json())
    .then(data => {
      hasMore = data.hasMore;
      lastKey = data.lastKey;

      const JSON_ObjCategory = data.data || data.categories || [];

      if (!selectizeInstance) {
        // First load: Build HTML, initialize Selectize
        var element = [];
        element.push("<option value=\"\">Select Category</option>");
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
            let scrollTimeout;
            dropdown.off('scroll').on('scroll', function () {
              if (scrollTimeout) clearTimeout(scrollTimeout);
              scrollTimeout = setTimeout(() => {
                if (dropdown.scrollTop() + dropdown.height() >= dropdown[0].scrollHeight - 10) {
                  if (!isFetchingCategories && hasMore) {
                    GetCategoryList(currentOffset, limit);
                  }
                }
              }, 200);
            });
          }
        });
      } else {
        // Subsequent loads (from scroll): Append new options to existing Selectize
        JSON_ObjCategory.forEach(_category => {
          selectizeInstance.addOption({ value: _category.category, text: _category.title });
        });
        selectizeInstance.refreshOptions();
      }

      currentOffset += limit;
    })
    .catch(err => {
      console.error('Error fetching categories:', err);
    }).finally(() => {
      $('.dropdown-loader').remove();
      isFetchingCategories = false;
    });
}

function GetFromS3CategoryList() {
  readS3Bucket(activePathS3.category, function (json) {
    if (json.err) {
      return console.log(json.err);
    }
    var element = [];
    element.push("<option value=\"\">Select Category</option>");
    var JSON_ObjCategory = JSON.parse(json.data);
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
  });
}

// Category selection change
$('#ddlCategory').on('change', function () {
  const selectedCategory = $.trim($(this).val());
  if (selectedCategory !== "") {
    searchName = '';
    searchAllRecords = [];
    $('#txtName').val('');
    $('#txtSlug').val('');
    $('#emptyInitialState').hide();
    $('#noResultsState').hide();
    $('#paginationEndMessage').hide();

    if ($('body').hasClass("loaded")) {
      $('body').removeClass('loaded');
    }

    try {
      currentOffset = 0;
      allRecords = [];
      $('#divStory').html('');
      $('#storyTableHeader').show();

      fetchAndRenderRecords(selectedCategory, currentOffset, limit);
    } catch (e) {
      $('body').addClass('loaded');
      console.error(e);
      $('#ddlCity').html('');
      $('#divStory').html('');
      $('#storyTableHeader').hide();
      $('#storyCountBadge').hide();
    }
  } else {
    $('#divStory').html('');
    $('#storyTableHeader').hide();
    $('#storyCountBadge').hide();
    $('#paginationEndMessage').hide();
    hidePaginationProgress();
    $('#noResultsState').hide();
    $('#emptyInitialState').show();
  }
});

// Fetch and render records for category
function fetchAndRenderRecords(categoryValue, offset, limit) {
  if (isFetchingStories) return;
  isFetchingStories = true;

  if (offset > 0) {
    showPaginationProgress('Fetching next batch from API...');
  }

  let endpoint = (activePathS3["category-index"] || "category/").replace(/\//g, "");
  const url = `${common.API_BASE_URL}/${endpoint}/${categoryValue}`;

  fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }
      return response.text();
    })
    .then(jsonString => {
      try {
        const data = JSON.parse(jsonString);
        isFetchingStories = false;
        $('body').addClass('loaded');
        hidePaginationProgress();

        if (data.stories && Array.isArray(data.stories)) {
          JSON_Obj = data.stories;
        } else if (data.data && Array.isArray(data.data)) {
          JSON_Obj = data.data;
        } else if (Array.isArray(data)) {
          JSON_Obj = data;
        } else {
          JSON_Obj = [];
        }

        const totalAvailable = JSON_Obj.length;

        if (totalAvailable === 0 && offset === 0) {
          $('#divStory').html('');
          $('#storyTableHeader').hide();
          $('#storyCountBadge').hide();
          $('#noResultsState').show();
          $('#emptyInitialState').hide();
          return;
        }

        $('#noResultsState').hide();
        $('#emptyInitialState').hide();
        $('#storyTableHeader').show();

        const recordsToAppend = (JSON_Obj && typeof JSON_Obj.slice === 'function')
          ? JSON_Obj.slice(offset, offset + limit)
          : [];

        if (recordsToAppend.length > 0) {
          allRecords = [...allRecords, ...recordsToAppend];
          renderData(recordsToAppend, JSON_Obj, offset === 0);
          currentOffset += limit;
          updateStoryCountBadge(allRecords.length, totalAvailable);
        }

        if (allRecords.length >= totalAvailable && totalAvailable > 0) {
          $('#totalStoriesCount').text(totalAvailable);
          $('#paginationEndMessage').show();
          hidePaginationProgress();
        } else {
          $('#paginationEndMessage').hide();
        }
      } catch (err) {
        console.error('Error processing response:', err);
        isFetchingStories = false;
        $('body').addClass('loaded');
        hidePaginationProgress();
        $('#ddlCity').html('');
        $('#divStory').html('');
      }
    })
    .catch(err => {
      isFetchingStories = false;
      $('body').addClass('loaded');
      hidePaginationProgress();
      $('#ddlCity').html('');
      $('#divStory').html('');
      console.error('Fetch error:', err);
    });
}

// Render records and update city dropdown
function renderData(newRecords, fullData, updateCity) {
  if (updateCity) {
    let cityList = [];
    let city = ["<option value=\"\">All Cities</option>"];

    fullData.forEach(record => {
      if (record.location && !cityList.includes(record.location)) {
        cityList.push(record.location);
        city.push(`<option value="${record.location}">${record.location}</option>`);
      }
    });

    if ($('#ddlCity')[0] && $('#ddlCity')[0].selectize) {
      $('#ddlCity')[0].selectize.destroy();
    }

    $('#ddlCity').html(city.join(" "));

    const $select = $("#ddlCity").selectize({
      sortField: 'text',
      maxOptions: 100000,
      placeholder: "All Cities"
    });
    const selectize = $select[0].selectize;
    selectize.setValue('');
  }

  $('#divStory').append(RenderStory(newRecords).join(" "));
}

// Infinite scroll for name search
function fetchMoreNameSearch() {
  if (isFetchingStories || !searchHasMore || !searchLastKey) return;
  isFetchingStories = true;
  showPaginationProgress('Fetching more matching stories...');

  const storiesEndpoint = `${((type === "default" ? (activePathS3.stories || "stories") : (activePathS3["story-detail"] || "stories"))).replace(/\//g, "").replace(".json", "")}`;
  const url = `${common.API_BASE_URL}/${storiesEndpoint}?name=${encodeURIComponent(searchName)}&lastKey=${encodeURIComponent(searchLastKey)}`;

  fetch(url)
    .then(response => response.json())
    .then(result => {
      const stories = result.data && Array.isArray(result.data) ? result.data : (Array.isArray(result) ? result : []);
      if (stories.length > 0) {
        searchAllRecords = [...searchAllRecords, ...stories];
        searchHasMore = !!result.hasMore;
        searchLastKey = result.lastKey || '';
        $('#divStory').append(RenderStory(stories).join(" "));
        updateStoryCountBadge(searchAllRecords.length, searchHasMore ? null : searchAllRecords.length);
        if (!searchHasMore) {
          $('#totalStoriesCount').text(searchAllRecords.length);
          $('#paginationEndMessage').show();
        }
      } else {
        searchHasMore = false;
        $('#totalStoriesCount').text(searchAllRecords.length);
        $('#paginationEndMessage').show();
      }
    })
    .catch(err => console.error(err))
    .finally(() => {
      isFetchingStories = false;
      hidePaginationProgress();
    });
}

// Window scroll event for pagination
let scrollTimeout;
$(window).on('scroll', function () {
  if (scrollTimeout) clearTimeout(scrollTimeout);

  scrollTimeout = setTimeout(function () {
    if ($(window).scrollTop() + $(window).height() >= $(document).height() - 25) {
      if (!isFetchingStories) {
        if (searchName) {
          fetchMoreNameSearch();
        } else {
          const categoryValue = $('#ddlCategory').val();
          if (categoryValue && JSON_Obj && allRecords.length < JSON_Obj.length) {
            fetchAndRenderRecords(categoryValue, currentOffset, limit);
          }
        }
      }
    }
  }, 200);
});

// Render stories with professional layout
function RenderStory(JSON_Obj) {
  if (!JSON_Obj || !Array.isArray(JSON_Obj)) return [];
  var storyCard = [];
  for (let index = 0; index < JSON_Obj.length; index++) {
    var _story = JSON_Obj[index];
    const thumbUrl = _story.thumb || FALLBACK_THUMB;
    const heading = _story.storyHeading || _story.heading || 'Untitled Story';
    const name = _story.name || 'Anonymous';
    const industry = _story.industry || 'General';
    const location = _story.location || 'Location Not Specified';
    const slug = _story.slug || '';

    storyCard.push(`
      <div class="storycard" data-slug="${slug}">
        <div class="story-col-thumb">
          <img class="storythumb" src="${thumbUrl}" alt="${name}" onerror="this.onerror=null; this.src='${FALLBACK_THUMB}';">
        </div>
        <div class="story-col-info">
          <div class="story-title" title="${heading}">${heading}</div>
          <div class="story-tags">
            <span class="story-author"><span class="glyphicon glyphicon-user"></span> ${name}</span>
            <span class="industry-tag"><span class="glyphicon glyphicon-briefcase"></span> ${industry}</span>
            ${slug ? `<span class="slug-tag" title="Slug: ${slug}"><span class="glyphicon glyphicon-link"></span> ${slug}</span>` : ''}
          </div>
        </div>
        <div class="story-col-loc">
          <span class="glyphicon glyphicon-map-marker" style="color: #ef4444;"></span>
          <span class="location-text" title="${location}">${location}</span>
        </div>
        <div class="story-col-actions">
          <button type="button" name="Detail" data-id="${slug}" class="btn btn-primary btn-sm btn-detail">
            <span class="glyphicon glyphicon-edit"></span> Detail
          </button>
        </div>
      </div>
    `);
  }
  return storyCard;
}

// Filter triggers
$('#ddlCity').on('change', function () {
  ApplyFilter();
});

// Trigger filter on Enter key
$('#txtName').on('keypress', function (e) {
  if (e.which === 13) {
    e.preventDefault();
    ApplyFilter();
  }
});

$('#txtSlug').on('keypress', function (e) {
  if (e.which === 13) {
    e.preventDefault();
    ApplyFilter();
  }
});

$('#submit').on('click', function (e) {
  e.preventDefault();
  if ($('#txtName').val().trim() !== "" || $('#txtSlug').val().trim() !== "") {
    ApplyFilter();
  } else if ($('#ddlCategory').val()) {
    $('#ddlCategory').trigger('change');
  } else {
    dialog.showErrorBox('Select Category or Filter', 'Please select a category or enter a name/slug to filter stories.');
  }
});

// Clear and reset all filters
$('#btnClearFilter').on('click', function () {
  $('#txtName').val('');
  $('#txtSlug').val('');
  if ($('#ddlCity')[0] && $('#ddlCity')[0].selectize) {
    $('#ddlCity')[0].selectize.setValue('');
  }
  searchName = '';
  searchAllRecords = [];
  searchHasMore = false;
  searchLastKey = '';

  if ($('#ddlCategory').val()) {
    $('#ddlCategory').trigger('change');
  } else {
    $('#divStory').html('');
    $('#storyTableHeader').hide();
    $('#storyCountBadge').hide();
    $('#paginationEndMessage').hide();
    hidePaginationProgress();
    $('#noResultsState').hide();
    $('#emptyInitialState').show();
  }
});

async function ApplyFilter() {
  var story = JSON_Obj;

  // Search by Name
  if ($('#txtName').val().trim() != "") {
    const name = $('#txtName').val().trim();
    if (name.length <= 3) {
      dialog.showErrorBox('Invalid Name', "Please enter more than 3 characters to search by name.");
      return;
    }
    try {
      $('body').removeClass('loaded');
      $('#divStory').html('');
      $('#emptyInitialState').hide();
      $('#noResultsState').hide();
      $('#paginationEndMessage').hide();

      searchName = name;
      searchAllRecords = [];
      searchHasMore = false;
      searchLastKey = '';

      const storiesEndpoint = `${((type === "default" ? (activePathS3.stories || "stories") : (activePathS3["story-detail"] || "stories"))).replace(/\//g, "").replace(".json", "")}`;
      const response = await fetch(`${common.API_BASE_URL}/${storiesEndpoint}?name=${encodeURIComponent(name)}`);
      const result = await response.json();
      $('body').addClass('loaded');

      if (result.error === "Story not found") {
        searchName = '';
        $('#storyTableHeader').hide();
        $('#storyCountBadge').hide();
        $('#noResultsState').show();
        dialog.showErrorBox('Name not exists', "Please enter valid name");
        return;
      }

      const stories = result.data && Array.isArray(result.data) ? result.data : (Array.isArray(result) ? result : []);
      if (stories.length > 0) {
        searchAllRecords = stories;
        searchHasMore = !!result.hasMore;
        searchLastKey = result.lastKey || '';
        $('#storyTableHeader').show();
        $('#divStory').html(RenderStory(stories).join(" "));
        updateStoryCountBadge(stories.length, searchHasMore ? null : stories.length);
        if (!searchHasMore) {
          $('#totalStoriesCount').text(stories.length);
          $('#paginationEndMessage').show();
        }
      } else {
        $('#storyTableHeader').hide();
        $('#storyCountBadge').hide();
        $('#noResultsState').show();
      }
    } catch (e) {
      $('body').addClass('loaded');
      console.error("Error searching by name:", e);
      dialog.showErrorBox('Error', "An error occurred while fetching the story.");
    }
  }
  // City filter or category view
  else if ($('#txtSlug').val().trim() == "") {
    searchName = '';
    if (JSON_Obj && Array.isArray(JSON_Obj)) {
      const selectedCity = $('#ddlCity').val();
      if (selectedCity && selectedCity !== "") {
        story = JSON_Obj.filter(function (i) {
          return i.location == selectedCity;
        });
      } else {
        story = JSON_Obj;
      }

      if (story.length > 0) {
        $('#noResultsState').hide();
        $('#emptyInitialState').hide();
        $('#storyTableHeader').show();
        $('#divStory').html(RenderStory(story).join(" "));
        updateStoryCountBadge(story.length, story.length);
        $('#totalStoriesCount').text(story.length);
        $('#paginationEndMessage').show();
      } else {
        $('#divStory').html('');
        $('#storyTableHeader').hide();
        $('#storyCountBadge').hide();
        $('#noResultsState').show();
        $('#paginationEndMessage').hide();
      }
    } else {
      $('#divStory').html('');
      $('#storyTableHeader').hide();
      $('#storyCountBadge').hide();
      $('#emptyInitialState').show();
      $('#paginationEndMessage').hide();
    }
  }
  // Search by Slug
  else {
    const slug = $('#txtSlug').val().trim();
    try {
      $('body').removeClass('loaded');
      $('#divStory').html('');
      $('#emptyInitialState').hide();
      $('#noResultsState').hide();
      $('#paginationEndMessage').hide();

      const storiesEndpoint = `${((type === "default" ? (activePathS3.stories || "stories") : (activePathS3["story-detail"] || "stories"))).replace(/\//g, "").replace(".json", "")}`;
      const response = await fetch(`${common.API_BASE_URL}/${storiesEndpoint}/${encodeURIComponent(slug)}`);
      $('body').addClass('loaded');

      if (!response.ok) {
        $('#storyTableHeader').hide();
        $('#storyCountBadge').hide();
        $('#noResultsState').show();
        if (response.status === 404) {
          dialog.showErrorBox('Slug not exists', "Please enter valid slug");
        } else {
          dialog.showErrorBox('Error', `Server returned ${response.status}`);
        }
        return;
      }

      const checkData = await response.json();

      if (!checkData || checkData.error === "Story not found") {
        $('#storyTableHeader').hide();
        $('#storyCountBadge').hide();
        $('#noResultsState').show();
        dialog.showErrorBox('Slug not exists', "Please enter valid slug");
        return;
      } else {
        const stories = checkData.data && Array.isArray(checkData.data)
          ? checkData.data
          : (Array.isArray(checkData) ? checkData : [checkData]);

        if (stories.length > 0) {
          $('#noResultsState').hide();
          $('#storyTableHeader').show();
          $('#divStory').html(RenderStory(stories).join(" "));
          updateStoryCountBadge(stories.length, stories.length);
          $('#totalStoriesCount').text(stories.length);
          $('#paginationEndMessage').show();
        } else {
          $('#storyTableHeader').hide();
          $('#storyCountBadge').hide();
          $('#noResultsState').show();
        }
      }
    } catch (e) {
      $('body').addClass('loaded');
      console.error("Error searching by slug:", e);
      dialog.showErrorBox('Error', "An error occurred while fetching the slug.");
    }
  }
}

// Add New Story button
$('#btnAddStory').on('click', function (e) {
  e.preventDefault();
  Model("addStory.html", "");
});

function Model(pagename, slug) {
  let data = { "slug": slug, "pagename": pagename, "category": $('#ddlCategory').val() };
  ipcRenderer.send('input-broadcast', data);
}

// Detail button click
$('#divStory').on('click', 'button[name="Detail"], a[name="Detail"]', function (e) {
  e.preventDefault();
  var slug = $(this).attr('data-id');
  Model("addStory.html", slug);
});
