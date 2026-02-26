const fs = require("fs");
const path = require("path");
let pathName = "C:\\WM_Json";
// var remote = require("electron").remote;
var remote = require('@electron/remote');
var session = remote.session;
var app = remote.app;
var ipcRenderer = require("electron").ipcRenderer;
const dialog = remote.dialog;
let common = require("../js/config");
let activePathS3 = common.getS3Path();
const limit = 100;
let instructorList = [];
let currentOffset = 0; // Tracks the current offset
let allRecords = []; // To store fetched records
let isFetching = false; 
let hasMore = false;
let lastKey = '';
let globalCount = 0; 
locationMasterList();

async function locationMasterList() {
    // Reset initial state
    currentOffset = 0;
    allRecords = [];
    globalCount = 0;
    $('#divStory').html('');

    GetinstructorList(currentOffset, limit);

    // Attach scroll event listener for lazy loading
    let scrollTimeout;
    $(window).on('scroll', function () {
        if (scrollTimeout) clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            if ($(window).scrollTop() + $(window).height() >= $(document).height() - 10) {
                if (!isFetching) {
                    GetinstructorList(currentOffset, limit);
                }
            }
        }, 200); // Debounce scroll event by 200ms
    });
}


// GetinstructorList();
// async function GetinstructorList() {
//     // debugger;
//     $("body").toggleClass("loaded");
//     let meta = await readS3BucketAsync(activePathS3["instructor"], "");
//     $("body").toggleClass("loaded");
//     if (meta.err) {
//         $("#divInstructor").html("");
//         return console.log(meta.err);
//     }
//     $("#divInstructor").html(renderHeader());
//     instructorList = JSON.parse(meta.data);
//     await RenderInstructor(JSON.parse(meta.data));
// }

async function GetinstructorList(offset, limit) {
    if (isFetching) return; // Prevent overlapping requests
    isFetching = true;
    $("body").toggleClass("loaded");
    
    // Replace S3 read with API call
    // let response;
    try {
       const response = await fetch(`https://r5dojmizdd.execute-api.ap-south-1.amazonaws.com/prod/instructors?limit=${limit}&lastKey=${encodeURIComponent(lastKey)}`);  // Adjust the URL to your actual API endpoint
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        const data = await response.json();
        $('body').toggleClass('loaded');
        // Proceed with rendering (similar to original logic)
        // $("#divInstructor").html(renderHeader());
        hasMore = data.hasMore;
        lastKey = data.lastKey;
        instructorList = data.instructors;  // Assuming the API returns the data directly (no need for JSON.parse if it's already parsed)
        if (instructorList.length > 0) {
            allRecords = [...allRecords, ...instructorList]; // Update all records
            RenderInstructor(instructorList); // Render the new records
            currentOffset += limit; // Increment offset for the next batch
        } else {
            console.log("No more records to load.");
        }
        // await RenderInstructor(data.instructors);
    } catch (error) {
        // Handle errors similarly to the original (clear div and log)
        $("#divInstructor").html("");
        console.log(error.message);
    } finally {
        if (hasMore) {
            isFetching = false; // Reset fetching status
        } else {
            isFetching = true; // Reset fetching status
        }
    }
    
    // $("body").toggleClass("loaded");
}

function renderHeader() {
    var storyCard = "";
    storyCard = '<div class="storycardheader col-md-12 row">';
    storyCard = storyCard + '<div class="col-md-1"><h4>#</h4></div>';
    storyCard = storyCard + '<div class="col-md-1"><h4>User Id</h4></div>';
    storyCard = storyCard + '<div class="col-md-2"><h4>Name</h4></div>';
    storyCard = storyCard + '<div class="col-md-2"><h4>Job Title</h4></div>';
    storyCard = storyCard + '<div class="col-md-2"><h4>Company Name</h4></div>';
    storyCard = storyCard + '<div class="col-md-1"><h4>Location</h4></div>';
    storyCard = storyCard + '<div class="col-md-1"><h4>Mobile No.</h4></div>';
    storyCard = storyCard + '<div class="col-md-1"><h4>User Guid</h4></div>';
    // storyCard = storyCard + '<div class="col-md-1"><h4>Show Contact</h4></div>';
    // storyCard = storyCard + '<div class="col-md-1"><h4>Consent Received</h4></div>';
    storyCard = storyCard + '<div class="col-md-1"></div>';
    storyCard = storyCard + '<div class="col-md-1"></div>';
    storyCard = storyCard + "<hr></div>";
    return storyCard;
}
async function RenderInstructor(instructor) {
    // debugger;
    $("body").toggleClass("loaded");
    // $(".instructorList").remove();
    let Savedinstructor = [];
    let count = 0;
    $(instructor).each(function () {
        // count = count + 1;
        globalCount += 1;
        if (this.user_id != "noinstructor") {
            Savedinstructor.push(`<div class="instructorList col-md-12 row column" name="instructor" id="${this.user_id}">
            <div class=\"col-md-1\">${globalCount}</div>
            <div class=\"col-md-1\"><h5>${this.user_id}</h5></div>
            <div class=\"col-md-2\"><h5>${this.name}</h5></div>
            <div class=\"col-md-2\"><h5>${this.job_title}</h5></div>
            <div class=\"col-md-2\"><h5>${this.company_name}</h5></div>
            <div class=\"col-md-1\"><h5>${this.location}</h5></div>
            <div class=\"col-md-1\"><h5>${this.mobile_no}</h5></div>
           <div class=\"col-md-1\"><h5>${this.user_guid}</h5></div>
            <div class=\"col-md-1\"><a href=\"#\" data-toggle=\"modal\" data-target=\"#delete-file-modal\" onclick=\"editInstructor('${this.user_id}')\">Edit</a></div>
            <div class=\"col-md-1\"><a href=\"#\" onclick=\"deleteInstructor('${this.user_id}',this)\">Delete</a></div>
            </div>`);
        } else {
            Savedinstructor.push(`<div class="instructorList col-md-12 row column" name="instructor" id="${this.user_id}">
            <div class=\"col-md-1\">${globalCount}</div>
            <div class=\"col-md-1\"><h5>${this.user_id}</h5></div>
        <div class=\"col-md-2\"><h5>${this.name}</h5></div>
        <div class=\"col-md-2\"><h5>${this.job_title}</h5></div>
        <div class=\"col-md-2\"><h5>${this.company_name}</h5></div>
        <div class=\"col-md-1\"><h5>${this.location}</h5></div>
        <div class=\"col-md-1\"><h5>${this.mobile_no}</h5></div>
       <div class=\"col-md-1\"><h5>${this.user_guid}</h5></div>
        <div class=\"col-md-1\"></div>
        <div class=\"col-md-1\"></div>
        </div>`);
        }
    });
    $("#divInstructor").append(Savedinstructor.join(" "));
    $("body").toggleClass("loaded");
}










async function deleteInstructor(user_id, _self) {
    if (confirm("Are you sure you want to delete this?")) {
        $(_self).closest(".storycard").remove();
        var instructorList;
        let meta = await readS3BucketAsync(activePathS3["instructor"], "");
        if (meta.err) {
            console.log(meta.err);
            return false;
        } else {
            instructorList = JSON.parse(meta.data);
        }
        instructorList = instructorList.filter(function (elem) {
            return elem["user_id"] != user_id;
        });
        const SaveResponce = await WriteS3Bucket(
            instructorList,
            activePathS3["instructor"]
        );
        console.log(SaveResponce);
        var DeleteResponce = await DeleteS3Bucket(
            `${activePathS3["instructorPath"]}${user_id}.json`
        );
        console.log(DeleteResponce);
        firebase.database().ref("WMUserInfo/" + user_id).remove();
        $("#divInstructor").html(renderHeader());
        $("body").toggleClass("loaded");
        await RenderInstructor(JSON.parse(instructorList));
    } else {
        return false;
    }
}
$("#btnSave").click(function () {
    validation(async function (cansave) {
        if (cansave.cansave) {
            var finalJson = [];
            var item = cansave.item;
            $("body").toggleClass("loaded");
            let RawinstructorJson = await readS3BucketAsync(activePathS3["instructor"], "");
            if (RawinstructorJson.err) {
                console.log(RawinstructorJson.err);
            } else {
                finalJson = JSON.parse(RawinstructorJson.data);
            }
            item = await saveInFiberBase(item);
            if ($("#hdnInstructor").val() != "") {
                var currentInstructor = finalJson.filter(function (ele) {
                    return ele["user_id"] == cansave.item["user_id"];
                });
                if (currentInstructor.length > 0) {
                    currentInstructor = currentInstructor[0];
                    currentInstructor["user_id"] = item["user_id"];
                    currentInstructor["name"] = item["name"];
                    currentInstructor["job_title"] = item["job_title"];
                    currentInstructor["company_name"] = item["company_name"];
                    currentInstructor["location"] = item["location"];
                    currentInstructor["mobile_no"] = item["mobile_no"];
                    currentInstructor["user_guid"] = item["user_guid"];
                    currentInstructor["name_hindi"] = item["name_hindi"];
                    currentInstructor["job_title_hindi"] = item["job_title_hindi"];
                    currentInstructor["company_name_hindi"] = item["company_name_hindi"];
                    currentInstructor["location_hindi"] = item["location_hindi"];
                    currentInstructor["allow_go_live"] = item["allow_go_live"];
                    currentInstructor["live_profile_pic_card"] = item["live_profile_pic_card"];
                    currentInstructor["user_name"] = item["user_name"];
                    currentInstructor["show_contact"] = item["show_contact"];
                    currentInstructor["consent_received"] = item["consent_received"];
                }
                for (var i = 0; i < finalJson.length; i++) {
                    if (finalJson[i]["user_id"] == $("#hdnInstructor").val()) {
                        finalJson[i] = currentInstructor;
                        cansave.item = currentInstructor;
                        break;
                    }
                }
            } else {
                finalJson.push(cansave.item);
            }
            await WriteS3Bucket(
                cansave.item,
                `${activePathS3["instructorPath"]}${item["user_id"]}.json`
            );
            const meta = await WriteS3Bucket(finalJson, activePathS3["instructor"]);
            console.log(meta);
            $("body").toggleClass("loaded");
            const options = { title: "", message: "Instructor Saved succssfully", detail: "" };
            try {
                dialog.showMessageBox(null, options);
            } catch (e) {
                console.log(e);
                dialog.showMessageBox(null, options);
            }
        } else {
            alert(cansave.msg);
            return false;
        }

        celarInputs();
        window.location.reload();
        $("#divInstructor").html(renderHeader());
        RenderInstructor(finalJson);
        return false;
    });
    return false;
});

function celarInputs() {
    $("#txtId").val("");
    $("#txtName").val("");
    $("#txtJobTitle").val("");
    $("#txtCompanyName").val("");
    $("#txtLocation").val("");
    $("#txtMobileNo").val("");
    $("#txtUserGuid").val("");
    $("#hdnInstructor").val("");
    $("#txtName_hindi").val("");
    $("#txtJobTitle_hindi").val("");
    $("#txtCompanyName_hindi").val("");
    $("#txtLocation_hindi").val("");
    $("#divModel").find("#txtId").attr("disabled", false);
}

$("#btnAddcat").click(function () {
    celarInputs();
    $("#divModel").show();
});

$("#btnClose").click(function () {
    $("#divModel").modal("hide");
});

async function editInstructor(user_id) {
    let _currentInstructor;
    let RawinstructorJson = await readS3BucketAsync(activePathS3["instructor"], "");
    if (RawinstructorJson.err) {
        console.log(RawinstructorJson.err);
        return false;
    } else {
        _currentInstructor = JSON.parse(RawinstructorJson.data);
    }
    _currentInstructor = instructorList.filter(function (item) {
        return item.user_id == user_id;
    });
    if (_currentInstructor.length > 0) {
        _currentInstructor = _currentInstructor[0];
        $("#divModel").find(".modal-title").text("Edit Category");
        $("#divModel").find("#txtId").val(_currentInstructor["user_id"]);
        $("#divModel").find("#txtName").val(_currentInstructor["name"]);
        $("#divModel").find("#txtJobTitle").val(_currentInstructor["job_title"]);
        $("#divModel").find("#txtCompanyName").val(_currentInstructor["company_name"]);
        $("#divModel").find("#txtLocation").val(_currentInstructor["location"]);
        $("#divModel").find("#txtMobileNo").val(_currentInstructor["mobile_no"]);
        $("#divModel").find("#txtUserGuid").val(_currentInstructor["user_guid"]);
        $("#divModel").find("#txtName_hindi").val(_currentInstructor["name_hindi"]);
        $("#divModel").find("#txtJobTitle_hindi").val(_currentInstructor["job_title_hindi"]);
        $("#divModel").find("#txtCompanyName_hindi").val(_currentInstructor["company_name_hindi"]);
        $("#divModel").find("#txtLocation_hindi").val(_currentInstructor["location_hindi"]);
        if (_currentInstructor["allow_go_live"] == true) {
            $("#divModel").find("#txtAllow_go_live").attr('checked', true);
        }
       // $("#divModel").find("#txtAllow_go_live").val(_currentInstructor["allow_go_live"]);
        $("#divModel").find("#txtlive_profile_pic_card").val(_currentInstructor["live_profile_pic_card"]);
        $("#hdnUser_name").val(_currentInstructor["user_name"]);
        $("#hdnInstructor").val(_currentInstructor["mobile_no"]);
        // if (_currentInstructor["show_contact"] == true) {
        //     $("#divModel").find("#txtshow_contact").attr('checked', true);
        // }
        // else
        // {
        //     $("#divModel").find("#txtshow_contact").attr('checked', false);
        // }
        // if (_currentInstructor["consent_received"] == true) {
        //     $("#divModel").find("#txtconsent_received").attr('checked', true);
        // }
        // else
        // {
        //     $("#divModel").find("#txtconsent_received").attr('checked', false);
        // }
        $("#divModel").find("#txtId").attr("disabled", true);
        $("#divModel").modal("show");
    }
}

function saveUPre() { }

async function validation(cb) {
    var cansave = true;
    var msg = "";
    var item = {
        user_id: $.trim($("#txtId").val()),
        name: $.trim($("#txtName").val()),
        job_title: $.trim($("#txtJobTitle").val()),
        company_name: $.trim($("#txtCompanyName").val()),
        location: $.trim($("#txtLocation").val()),
        mobile_no: $.trim($("#txtMobileNo").val()),
        // show_contact:$("#txtshow_contact").is(":checked"),
        // consent_received:$("#txtconsent_received").is(":checked"),
        user_guid: $.trim($("#txtUserGuid").val()),
        story: [],
        audio: [],
        gyan: [],
        hope: [],
        namaste: [],
        name_hindi: $.trim($("#txtName_hindi").val()),
        job_title_hindi: $.trim($("#txtJobTitle_hindi").val()),
        company_name_hindi: $.trim($("#txtCompanyName_hindi").val()),
        location_hindi: $.trim($("#txtLocation_hindi").val()),
        allow_go_live: $("#txtAllow_go_live").is(":checked"),
        live_profile_pic_card: $.trim($("#txtlive_profile_pic_card").val()),
        user_name: $.trim($("#hdnUser_name").val().toLowerCase().replace(/ /g, "").replace(/ /g, "").replace(/ /g, "").replace(/ /g, "")),
        // show_contact:$("#txtshow_contact").is(":checked"),
        // consent_received:$("#txtconsent_received").is(":checked"),
    };
    if (item["user_id"] == "") {
        msg = "Please Enter User Id";
        cansave = false;
    }
    if (item["name"] == "") {
        msg = "Please Enter Name";
        cansave = false;
    }
    if (item["job_title"] == "") {
        msg = "Please Enter Job Title";
        cansave = false;
    }
    if (item["company_name"] == "") {
        msg = "Please Enter Company Name";
        cansave = false;
    }
    if (item["location"] == "") {
        msg = "Please Enter Location";
        cansave = false;
    }
    if (item["mobile_no"] == "") {
        msg = "Please Enter Mobile No.";
        cansave = false;
    } else {
        // var pattern = /^[0-9]{3}[0-9]{3}[0-9]{4}$/;
        // if (!pattern.test(item["mobile_no"])) {
        //     msg = "Please enter valid mobile number : " + item["mobile_no"];
        //     cansave = false;
        // }
        var pattern = /^(\d{10}|\d{12})$/;
        if (!pattern.test(item["mobile_no"])) {
            msg = "Please enter valid mobile number : " + item["mobile_no"];
            cansave = false;
        }
    }
    if (item["user_guid"] == "") {
        msg = "Please Enter User Guid";
        cansave = false;
    }
    else
    {
        // debugger;
        if (item["user_guid"].length <15) {
            msg = "User Guid length should be more than 15 Character";
            cansave = false;
        }

    }
    if (cansave && $("#hdnInstructor").val() == "") {
        let RawinstructorJson = await readS3BucketAsync(`${activePathS3["instructorPath"]}${item["user_id"]}.json`, "");
        if (RawinstructorJson.err) {
            console.log(RawinstructorJson.err);
        } else {
            finalJson = JSON.parse(RawinstructorJson.data);
            msg = "This Id is already exists ";
            cansave = false;
        }
    }
    var result = {
        cansave: cansave,
        msg: msg,
        item: item,
    };
    cb(result);
}

$("#btnAddInstructor").click(function () {
    celarInputs();
    $("#hdnInstructor").val("");
    $("#divModel").find(".modal-title").text("Add New Instructor");
    $("#divModel").modal("show");
});

let saveInFiberBase = async (item) => {
    var firebaseObj = {
        location: item["location"],
        company_name: item["company_name"],
        created_date: new Date().getTime(),
        id: item["user_id"],
        job_title: item["job_title"],
        mobile_number: item["mobile_no"],
        name: item["name"],
        referr_by_code: "",
        referral_code: "",
        name_hindi: item["name_hindi"],
        job_title_hindi: item["job_title_hindi"],
        company_name_hindi: item["company_name_hindi"],
        location_hindi: item["location_hindi"],
        allow_go_live: item["allow_go_live"],
        live_profile_pic_card: item["live_profile_pic_card"],
        user_name: item["user_name"],
         user_guid: item["user_guid"],
    };
    var isUserNameExists = false;
    var WMUserNameListObj = { "id": item["user_id"], name: item["name"] };
    var ref = await firebase.database().ref("WMUserNameList");
    var UserNameList = [];
    if (firebaseObj["user_name"] != "") {
        var responce = await firebase.database().ref("WMUserNameList/" + firebaseObj["user_name"]).update(WMUserNameListObj);
    }
    else {
        //var user_name = WMUserNameListObj["name"].replace(/ /g, "_").toLowerCase().replace(/\./g,"");
        let user_name = WMUserNameListObj["name"].toLowerCase().replace(/\./g,"").replace(/ /g, "").replace(/ /g, "");
        var result = await ref.orderByChild('name').equalTo(WMUserNameListObj["name"]).once("value").then(function (snapshot) {
            snapshot.forEach((childSnapshot) => {
                UserNameList.push({ "key": childSnapshot.key, "value": childSnapshot.val()});
            });
        });
        if (UserNameList.length>0) {
            user_name = `${user_name}_${UserNameList.length}`;
        }
        await firebase.database().ref("WMUserNameList/" + user_name).set(WMUserNameListObj);
        firebaseObj["user_name"] = user_name;
        item["user_name"] = user_name;
    }

    
    if ($("#hdnInstructor").val() != "") {
        delete firebaseObj.created_date;
        var responce = await firebase
            .database()
            .ref("WMUserInfo/" + item["user_id"])
            .update(firebaseObj);
        console.log(responce);
    } else {
        var responce = await firebase
            .database()
            .ref("WMUserInfo/" + item["user_id"])
            .set(firebaseObj);
        console.log(responce);
    }
    return item;
};

//#region Search Instructor No
$("#btnSearch").click(function () 
{
     SearchOnInstructor();
});
$("#btnClearSearch").click(function () 
{
     ClearSearchOnInstructor();
});
// async function SearchOnInstructor() 
// {
//     debugger;
//     let story='';
//     let instructorno=$('#txtInstructorNo').val().trim();
//     if (instructorno!= null && instructorno != "") {
//         story = instructorList.filter(function (i) {
//             return i.mobile_no != undefined && i.mobile_no == instructorno;
//         });
//     }
//     $("#divInstructor").html(await RenderInstructor(story));
// }





// Bind both click and keyup events


$('#txtInstructorNo').on('keyup', function () {
    const instructorno = $('#txtInstructorNo').val().trim();

    // Trigger search only if 4 or more digits are entered
    if (instructorno.length >= 4) {
        SearchOnInstructor();
    } 
});

// async function SearchOnInstructor() {
//     // debugger;
//     let story = [];
//     let instructorno = $('#txtInstructorNo').val().trim();
//     if (instructorno) {
//         // Filter the instructor list with a "like" keyword match
//         story = instructorList.filter(function (i) {
//             return (i.mobile_no !== undefined && i.mobile_no.toString().includes(instructorno))||(i.name !== undefined && i.name.toString().includes(instructorno));
//         });
//     } else {
//         // If the input is empty, reset the search result to show all instructors
//         story = instructorList;
//     }

//     $("#divInstructor").html(await RenderInstructor(story));
// }

async function SearchOnInstructor() {
    globalCount = 0; // NEW: Reset global count for search
    let story = [];
    let instructorno = $('#txtInstructorNo').val().trim();
    if (instructorno) {
        story = allRecords.filter(function (i) {  // CHANGED: Use allRecords instead of instructorList
            return (i.mobile_no !== undefined && i.mobile_no.toString().includes(instructorno)) || (i.name !== undefined && i.name.toString().includes(instructorno));
        });
    } else {
        story = allRecords;  // CHANGED: Use allRecords
    }
    $("#divInstructor").html(renderHeader());  // NEW: Clear and add header for re-render
    await RenderInstructor(story);
}


async function ClearSearchOnInstructor() {
    $('#txtInstructorNo').val('');
    globalCount = 0; // NEW: Reset global count
    $("#divInstructor").html(renderHeader());  // NEW: Clear and add header for re-render
    await RenderInstructor(allRecords);  // CHANGED: Use allRecords
}

// async function ClearSearchOnInstructor() 
// {
//     $('#txtInstructorNo').val('');
//     // $("#divInstructor").html(renderHeader());
//     $("#divInstructor").html(await RenderInstructor(instructorList));
// }
//#endregion