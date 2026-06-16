const fs = require('fs');
const path = require('path');
// var remote = require('electron').remote;
var remote = require('@electron/remote');
const dialog = remote.dialog;
let common = require('../Js/config');
let activePathS3 = common.getS3Path();

let currentOffset = 0; // Tracks the current offset
let allRecords = []; 
let isFetching = false; 
let lastKey = '';
const LOCATIONS_API_BASE = "https://r5dojmizdd.execute-api.ap-south-1.amazonaws.com/prod/locations";
locationMasterList();
// async function locationMasterList() {
//     debugger;
//     $('body').togghasMoreleClass('loaded');
//     var meta = await readS3BucketAsync("LocationMaster.json", "");

//     $('body').toggleClass('loaded');
//     if (meta.err) {
//         console.log(meta.err);
//     }
//     var storyCard = "";
//     storyCard = "<div class=\"storycardheader col-md-12 row\">";
//     storyCard = storyCard + "<div class=\"col-md-9\"><h4>Location</h4></div>";
//     storyCard = storyCard + "<div class=\"col-md-3\"></div>";
//     storyCard = storyCard + "<hr></div>";
//     $('#divStory').html(storyCard);
//     var storyCard = "";
//     $(JSON.parse(meta.data)).each(function () {
//         storyCard = storyCard + "<div class=\"col-md-9\">" + this.location + "</div>";
//         storyCard = storyCard + "<div class=\"col-md-3\"><a href=\"#\" data-toggle=\"modal\" data-target=\"#locationModal\" onclick=\"editLocation('" + this.location + "','" + this.id + "')\">Edit</a></div>";
//     });
//     $('#divStory').append(storyCard);
// }



async function locationMasterList() {
    // Reset initial state
    allRecords = [];
    lastKey = '';
    let header = `
        <div class="storycardheader col-md-12 row">
            <div class="col-md-7"><h4>Location</h4></div>
            <div class="col-md-2"></div>
            <div class="col-md-3"></div>
            <hr>
        </div>`;
    $('#divStory').html(header);

    fetchAndRenderRecords();
}

// Function to fetch and render records
async function fetchAndRenderRecords() {
    if (isFetching) return;
    isFetching = true;
    $('body').removeClass('loaded');

    try {
        let hasMore = true;
        while (hasMore) {
            const url = `${LOCATIONS_API_BASE}?lastKey=${encodeURIComponent(lastKey)}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error(`API failed: ${response.status}`);

            const data = await response.json();
            const records = data.data || data.locations || [];
            
            if (records.length > 0) {
                allRecords = [...allRecords, ...records];
                renderData(records);
            }

            hasMore = data.hasMore;
            lastKey = data.lastKey || '';
            if (!hasMore) break;
        }
    } catch (error) {
        console.error("Error fetching records:", error);
    } finally {
        $('body').addClass('loaded');
        isFetching = false;
    }
}
// async function fetchAndRenderRecords(offset, limit) {
//     if (isFetching) return; // Prevent overlapping requests
//     isFetching = true;
//     $('body').toggleClass('loaded');

//     try {
//         const meta = await readS3BucketAsync("LocationMaster.json", "");
//         $('body').toggleClass('loaded');

//         if (meta.err) {
//             console.log(meta.err);
//             return;
//         }

//         const data = JSON.parse(meta.data);
//         const recordsToAppend = data.slice(offset, offset + limit);

//         if (recordsToAppend.length > 0) {
//             allRecords = [...allRecords, ...recordsToAppend]; // Update all records
//             renderData(recordsToAppend); // Render the new records
//             currentOffset += limit; // Increment offset for the next batch
//         } else {
//             console.log("No more records to load.");
//         }
//     } catch (error) {
//         $('body').toggleClass('loaded');
//         console.error("Error fetching records:", error);
//     } finally {
//         isFetching = false; // Reset fetching status
//     }
// }

// Function to render data
function renderData(newRecords) {
    let storyCard = "";

    newRecords.forEach(record => {
        storyCard += `
            <div class="storycard col-md-12 row column" id="${record.id}">
                <div class="col-md-7">${record.location}</div>
                <div class="col-md-2">
                    <a href="#" data-toggle="modal" data-target="#locationModal" onclick="editLocation('${record.location}', '${record.id}')">Edit</a>
                </div>
                <div class="col-md-3">
                    <a href="#" onclick="deleteLocation('${record.id}')">Delete</a>
                </div>
                <hr>
            </div>`;
    });

    $('#divStory').append(storyCard);
}

async function deleteLocation(id) {
    if (confirm("Are you sure you want to delete this location?")) {
        $('body').addClass('loaded');
        try {
            const url = `${LOCATIONS_API_BASE}/${encodeURIComponent(id)}`;
            const response = await fetch(url, { method: "DELETE" });
            if (response.ok) {
                dialog.showMessageBoxSync({ type: 'info', buttons: ['OK'], message: 'Location deleted successfully' });
                locationMasterList();
            } else {
                const data = await response.json();
                dialog.showMessageBoxSync({ type: 'error', buttons: ['OK'], message: 'Error deleting: ' + (data.msg || 'Unknown error') });
            }
        } catch (e) {
            console.error("Delete error:", e);
        } finally {
            $('body').removeClass('loaded');
        }
    }
}



$("#btnSave").click(function () {
    validation(async function (cansave) {
        if (cansave.cansave) {
            $('body').addClass('loaded');
            try {
                const isEdit = $("#hdnLocationId").val() != "";
                const method = isEdit ? "PUT" : "POST";
                const url = isEdit 
                    ? `${LOCATIONS_API_BASE}/${encodeURIComponent($("#hdnLocationId").val())}`
                    : LOCATIONS_API_BASE;

                const response = await fetch(url, {
                    method: method,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(cansave.item)
                });

                if (response.ok) {
                    const options = { title: '', message: `Location ${isEdit ? 'Updated' : 'Saved'} successfully`, detail: '' };
                    dialog.showMessageBox(null, options);
                    $('#locationModal').modal('hide');
                    locationMasterList(); // Refresh the list
                } else {
                    const data = await response.json();
                    const errMsg = data.error || data.msg || "Unknown error";
                    dialog.showMessageBoxSync({ type: 'error', buttons: ['OK'], message: 'Error saving: ' + errMsg });
                    focusLocationInput();
                }
            } catch (e) {
                console.error("Save error:", e);
                dialog.showMessageBoxSync({ type: 'error', buttons: ['OK'], message: 'Failed to save location' });
                focusLocationInput();
            } finally {
                $('body').addClass('loaded');
            }
        } else {
            dialog.showMessageBoxSync({ type: 'error', buttons: ['OK'], message: cansave.msg });
            focusLocationInput();
        }
    });
});
function focusLocationInput() {
    setTimeout(function() {
        var el = document.getElementById('txtLocation');
        if (el) { el.focus(); el.focus(); }
    }, 100);
}

$("#btnAddLocation").click(function () {
    $('#locationModal #txtLocation');
    $("#hdnLocationId").val('');
    $('#locationModal').find('.modal-title').text("Add New Location");
    focusLocationInput();
});

$("#btnClose").click(function () {
    $('#locationModal').modal('hide');
});


function editLocation(location, id) {
    $('#locationModal').find('.modal-title').text("Edit Location");
    $('#locationModal').find('#txtLocation').val(location);
    $('#locationModal').find('#hdnLocationId').val(id);
    focusLocationInput();
}
function validation(cb) {
    var cansave = true;
    var msg = "";
    var item = {
        "id": $('#locationModal #txtLocation').val().toLowerCase().replace(/ /g, "_"),
        "location": $.trim($('#locationModal').find('#txtLocation').val())
    };
    if (item["location"] == "") {
        msg = "Please Enter Locatoin";
        cansave = false;
    }
    var result = { "cansave": cansave, "msg": msg, "item": item };
    cb(result);
}
