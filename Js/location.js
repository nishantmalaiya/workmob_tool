const fs = require('fs');
const path = require('path');
var remote = require('electron').remote;
const dialog = remote.dialog;
let common = require('../js/config');
let activePathS3 = common.getS3Path();

let currentOffset = 0; // Tracks the current offset
const limit = 100; // Number of records to fetch per request
let allRecords = []; // To store fetched records
let isFetching = false; // To prevent concurrent fetches
locationMasterList();
// async function locationMasterList() {
//     debugger;
//     $('body').toggleClass('loaded');
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
    currentOffset = 0;
    allRecords = [];
    $('#divStory').html('');
    
    fetchAndRenderRecords(currentOffset, limit);

    // Attach scroll event listener for lazy loading
    let scrollTimeout;
    $(window).on('scroll', function () {
        if (scrollTimeout) clearTimeout(scrollTimeout);

        scrollTimeout = setTimeout(() => {
            if ($(window).scrollTop() + $(window).height() >= $(document).height() - 10) {
                if (!isFetching) {
                    fetchAndRenderRecords(currentOffset, limit);
                }
            }
        }, 200); // Debounce scroll event by 200ms
    });
}

// Function to fetch and render records
async function fetchAndRenderRecords(offset, limit) {
    if (isFetching) return; // Prevent overlapping requests
    isFetching = true;
    $('body').toggleClass('loaded');

    try {
        const meta = await readS3BucketAsync("LocationMaster.json", "");
        $('body').toggleClass('loaded');

        if (meta.err) {
            console.log(meta.err);
            return;
        }

        const data = JSON.parse(meta.data);
        const recordsToAppend = data.slice(offset, offset + limit);

        if (recordsToAppend.length > 0) {
            allRecords = [...allRecords, ...recordsToAppend]; // Update all records
            renderData(recordsToAppend); // Render the new records
            currentOffset += limit; // Increment offset for the next batch
        } else {
            console.log("No more records to load.");
        }
    } catch (error) {
        $('body').toggleClass('loaded');
        console.error("Error fetching records:", error);
    } finally {
        isFetching = false; // Reset fetching status
    }
}

// Function to render data
function renderData(newRecords) {
    let storyCard = "";

    // Generate HTML for new records
    newRecords.forEach(record => {
        storyCard += `<div class="col-md-9">${record.location}</div>`;
        storyCard += `<div class="col-md-3">
            <a href="#" data-toggle="modal" data-target="#locationModal" onclick="editLocation('${record.location}', '${record.id}')">Edit</a>
        </div>`;
    });

    $('#divStory').append(storyCard);
}



$("#btnSave").click(function () {
    var vlocationMaster = [];
    validation(async function (cansave) {
        if (cansave.cansave) {
            $('body').toggleClass('loaded');
            var meta = await readS3BucketAsync("LocationMaster.json", "");
            if (meta.err) {
                console.log(meta.err);
            }
            else {
                vlocationMaster = JSON.parse(meta.data);
            }
            if ($("#hdnLocationId").val() == "") {
                var result = $(vlocationMaster).filter(function (item) {
                    return item["id"] == cansave["item"]["id"];
                });
                if (result.length > 0) {
                    alert("This Location already exist");
                    return false;
                }
                else {
                    vlocationMaster.push(cansave["item"]);
                }
                const IsExists = await existsS3Bucket(`location/${cansave["item"]["location"].toLowerCase()}.json"`);
                if (!IsExists.isExists) {
                    var a = [];
                    await WriteS3Bucket(a, `location/${cansave["item"]["location"].toLowerCase()}.json"`);
                }
            }
            else {
                for (var i = 0; i < vlocationMaster.length; i++) {
                    if (vlocationMaster[i]["id"] == $("#hdnLocationId").val()) {
                        vlocationMaster[i]["location"] = cansave["item"]["location"];
                        break;
                    }
                }
            }
            await WriteS3Bucket(vlocationMaster, "LocationMaster.json");
            $('#locationModal').modal('hide');
            $('body').toggleClass('loaded');
            const options = { title: '', message: 'Category Saved succssfully', detail: '' };
            try {
                dialog.showMessageBox(null, options);
            } catch (e) {
                console.log(e);
                dialog.showMessageBox(null, options);
            }
            $('#locationModal').find('#txtLocation').val("");
            $('#locationModal').find('#hdnLocationId').val("");

            var storyCard = "";
            storyCard = "<div class=\"storycardheader col-md-12 row\">";
            storyCard = storyCard + "<div class=\"col-md-9\"><h4>Location</h4></div>";
            storyCard = storyCard + "<div class=\"col-md-3\"></div>";
            storyCard = storyCard + "<hr></div>";
            $('#divStory').html(storyCard);
            storyCard = "";
            $(vlocationMaster).each(function () {
                storyCard = storyCard + "<div class=\"col-md-9\">" + this.location + "</div>";
                storyCard = storyCard + "<div class=\"col-md-3\"><a href=\"#\" data-toggle=\"modal\" data-target=\"#locationModal\" onclick=\"editLocation('" + this.location + "','" + this.id + "')\">Edit</a></div>";
            });
            $('#divStory').append(storyCard);
        }
        else {
            alert(cansave.msg);
        }
    });
});
$("#btnAddLocation").click(function () {
    $('#locationModal #txtLocation');
    $("#hdnLocationId").val('');
    $('#locationModal').find('.modal-title').text("Add New Location");
});

$("#btnClose").click(function () {
    $('#locationModal').modal('hide');
});


function editLocation(location, id) {
    $('#locationModal').find('.modal-title').text("Edit Location");
    $('#locationModal').find('#txtLocation').val(location);
    $('#locationModal').find('#hdnLocationId').val(id);
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