const fs = require("fs");
const path = require("path");
let pathName = "C:\\WM_Json";
// var remote = require("electron").remote;
var remote = require('@electron/remote');
var session = remote.session;
var app = remote.app;
var ipcRenderer = require("electron").ipcRenderer;
const dialog = remote.dialog;
let common = require("../Js/config");
let activePathS3 = common.getS3Path();
let instructorList = [];
let allRecords = [];
let isFetching = false; 
let lastKey = '';
let globalCount = 0;

/** Set to false before release — fills add-user popup with dummy data for local testing */
const TEST_PREFILL_ADD_INSTRUCTOR = true;

/** 
 * Shows a premium notification at the top right of the screen.
 * If type is 'success' and callback is provided, it will execute on close.
 */
function showPremiumNotification(title, message, type = 'success', callback = null) {
    // Remove existing notification if any
    $('.premium-notification').remove();

    const icon = type === 'success' ? 'check-circle' : 'exclamation-circle';
    const html = `
        <div class="premium-notification ${type}">
            <div class="premium-notification-content">
                <div class="premium-notification-title">${title}</div>
                <div class="premium-notification-message">${message}</div>
            </div>
            <div class="premium-notification-close">&times;</div>
        </div>
    `;

    $('body').append(html);
    
    // Trigger animation
    setTimeout(() => $('.premium-notification').addClass('show'), 10);

    const closeNotify = () => {
        $('.premium-notification').removeClass('show');
        setTimeout(() => {
            $('.premium-notification').remove();
            if (callback) callback();
        }, 400);
    };

    // Auto-close success after 3 seconds, but errors stay
    let autoCloseTimer;
    if (type === 'success') {
        autoCloseTimer = setTimeout(closeNotify, 3000);
    }

    $('.premium-notification-close').click(function() {
        if (autoCloseTimer) clearTimeout(autoCloseTimer);
        closeNotify();
    });
}

/** Shows an error message at the top of the modal body */
function showModalError(message) {
    let $errorContainer = $('#modal-error-msg');
    if ($errorContainer.length === 0) {
        $("#divModel .modal-body").prepend('<div id="modal-error-msg" class="modal-error-container"></div>');
        $errorContainer = $('#modal-error-msg');
    }
    $errorContainer.text(message).fadeIn();
    
    // Smooth scroll to top of modal body
    $("#divModel .modal-dialog-scrollable .modal-body").scrollTop(0);
}

function hideModalError() {
    $('#modal-error-msg').fadeOut();
}

function prefillAddInstructorTestData() {
   
    $("#txtId").val("8770117732");
    $("#txtMobileNo").val("8770117732");
    $("#txtName").val("Test Instructor");
    $("#txtJobTitle").val("Developer");
    $("#txtCompanyName").val("Workmob");
    $("#txtLocation").val("Test City");
    $("#txtUserGuid").val("877011773212345");
    $("#txtName_hindi").val("टेस्ट");
    $("#txtJobTitle_hindi").val("डेवलपर");
    $("#txtCompanyName_hindi").val("वर्कमोब");
    $("#txtLocation_hindi").val("टेस्ट");
    $("#txtAllow_go_live").prop("checked", false);
    $("#txtlive_profile_pic_card").val("");
    $("#hdnUser_name").val("");
}

function parseInstructorApiBody(text) {
    if (!text || !String(text).trim()) return {};
    try {
        return JSON.parse(text);
    } catch (e) {
        return {};
    }
}

function isInstructorNotFoundError(body) {
    return body && body.error === "Instructor not found";
}

/** Same base for list/search/validation/save — path vs ?mobile_no= are different API routes */
const INSTRUCTORS_API_BASE = "https://r5dojmizdd.execute-api.ap-south-1.amazonaws.com/prod/instructors";

locationMasterList();

async function locationMasterList() {
    // Reset initial state
    allRecords = [];
    globalCount = 0;
    lastKey = '';
    $('#divInstructor').html(renderHeader());

    GetinstructorList();
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

async function GetinstructorList() {
    if (isFetching || lastKey === 'END') return;
    isFetching = true;
    $("body").removeClass("loaded");
    
    try {
        const url = `${INSTRUCTORS_API_BASE}?lastKey=${encodeURIComponent(lastKey)}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`API request failed with status ${response.status}`);
        
        const data = await response.json();
        const batch = data.data || data.instructors || [];
        
        if (batch.length > 0) {
            allRecords = [...allRecords, ...batch];
            RenderInstructor(batch);
        }
        
        lastKey = data.lastKey || '';
        if (!data.hasMore) {
            lastKey = 'END';
        }
    } catch (error) {
        console.error("Fetch error:", error);
    } finally {
        $("body").addClass("loaded");
        isFetching = false;
    }
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
    let Savedinstructor = [];
    $(instructor).each(function () {
        globalCount += 1;
        const userId = this.user_id || this.id || this.Id;
        if (userId && userId != "noinstructor") {
            Savedinstructor.push(`<div class="instructorList col-md-12 row column" name="instructor" id="${userId}">
            <div class=\"col-md-1\">${globalCount}</div>
            <div class=\"col-md-1\"><h5>${userId}</h5></div>
            <div class=\"col-md-2\"><h5>${this.name}</h5></div>
            <div class=\"col-md-2\"><h5>${this.job_title}</h5></div>
            <div class=\"col-md-2\"><h5>${this.company_name}</h5></div>
            <div class=\"col-md-1\"><h5>${this.location}</h5></div>
            <div class=\"col-md-1\"><h5>${this.mobile_no}</h5></div>
           <div class=\"col-md-1\"><h5>${this.user_guid}</h5></div>
            <div class=\"col-md-1\"><a href=\"#\" data-toggle=\"modal\" data-target=\"#divModel\" onclick=\"editInstructor('${userId}','${this.mobile_no}')\">Edit</a></div>
            <div class=\"col-md-1\"><a href=\"#\" onclick=\"deleteInstructor('${userId}',this)\">Delete</a></div>
            </div>`);
        } else {
            const displayId = userId || "";
            Savedinstructor.push(`<div class="instructorList col-md-12 row column" name="instructor" id="${displayId}">
            <div class=\"col-md-1\">${globalCount}</div>
            <div class=\"col-md-1\"><h5>${displayId}</h5></div>
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
}










async function deleteInstructor(user_id, _self) {
    if (confirm("Are you sure you want to delete this?")) {
        $("body").removeClass("loaded");
        try {
            const url = `${INSTRUCTORS_API_BASE}/${encodeURIComponent(user_id)}`;
            console.log("Deleting instructor via API...", url);
            const response = await fetch(url, { method: "DELETE" });
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`API Delete failed: ${response.status} - ${text}`);
            }
            console.log("API Delete successful");

            await firebase.database().ref("WMUserInfo/" + user_id).remove();
            console.log("Firebase Record removed");

            $(_self).closest(".instructorList").remove();
            allRecords = allRecords.filter(item => (item.user_id || item.id || item.Id) != user_id);
        } catch (error) {
            console.error("Delete Error:", error);
        } finally {
            $("body").addClass("loaded");
        }
        dialog.showMessageBoxSync({ type: 'info', buttons: ['OK'], message: 'Instructor deleted successfully' });
        window.location.reload();
    } else {
        return false;
    }
}
$("#btnSave").click(function () {
    hideModalError();
    validation(async function (cansave) {
        if (cansave.cansave) {
            var finalJson = [];
            var item = cansave.item;
            item.Id = item.user_id; 

            $("body").removeClass("loaded");
            try {
                var instructorApiSavedOk = false;
                try {
                    console.log("Saving instructor via API...", item);
                    const mobileParam = encodeURIComponent(item["mobile_no"]);
                    const checkUrl = `${INSTRUCTORS_API_BASE}?mobile_no=${mobileParam}`;
                    const checkResponse = await fetch(checkUrl, { method: "GET" });
                    const checkText = await checkResponse.text();
                    const checkData = parseInstructorApiBody(checkText);

                    if (!checkResponse.ok) {
                        if (!isInstructorNotFoundError(checkData)) {
                            throw new Error(`Instructor check failed: ${checkResponse.status} - ${checkText}`);
                        }
                    }

                    let exists =
                        !isInstructorNotFoundError(checkData) &&
                        checkData.instructors &&
                        Array.isArray(checkData.instructors) &&
                        checkData.instructors.length > 0;
                    if (isInstructorNotFoundError(checkData)) {
                        exists = false;
                    }

                    const postCreate = function () {
                        return fetch(`${INSTRUCTORS_API_BASE}?mobile_no=${mobileParam}`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(item),
                        });
                    };

                    let apiResponse;
                    let usedPut = false;
                    if (!exists) {
                        apiResponse = await postCreate();
                    } else {
                        usedPut = true;
                        // Update endpoint now uses /mobile_no as path segment
                        const updateUrl = `${INSTRUCTORS_API_BASE}/${encodeURIComponent(item["mobile_no"])}`;
                        apiResponse = await fetch(updateUrl, {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(item),
                        });
                    }

                    let apiText = await apiResponse.text();
                    if (!apiResponse.ok && isInstructorNotFoundError(parseInstructorApiBody(apiText)) && usedPut) {
                        console.log("PUT returned Instructor not found — creating with POST");
                        usedPut = false;
                        apiResponse = await postCreate();
                        apiText = await apiResponse.text();
                    }

                    if (!apiResponse.ok) {
                        throw new Error(`API Save failed: ${apiResponse.status} - ${apiText}`);
                    }
                    console.log("API Save successful");
                    instructorApiSavedOk = true;
                } catch (apiError) {
                    console.error("API Save Error:", apiError);
                    showModalError("Error saving to API: " + apiError.message);
                }

                if (instructorApiSavedOk) {
                    item = await saveInFiberBase(item);
                }

                if (instructorApiSavedOk) {
                    showPremiumNotification("Success", "Instructor Saved successfully", "success", () => {
                        celarInputs();
                        window.location.reload();
                    });
                }
            } finally {
                $("body").addClass("loaded");
            }
        } else {
            showModalError(cansave.msg);
            return false;
        }

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
    hideModalError();
}

$("#btnAddcat").click(function () {
    celarInputs();
    hideModalError();
    $("#divModel").show();
});

$("#btnClose").click(function () {
    $("#divModel").modal("hide");
});

async function editInstructor(user_id, mobile_no) {
    let _currentInstructor;
    if (!mobile_no) {
        let local = allRecords.find(i => (i.user_id || i.id || i.Id) == user_id);
        mobile_no = local ? local.mobile_no : user_id;
    }

    $("body").removeClass("loaded");
    try {
        const url = `${INSTRUCTORS_API_BASE}?mobile_no=${encodeURIComponent(mobile_no)}`;
        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json();
            if (data.instructors && data.instructors.length > 0) {
                // If there is only one match, data.instructors[0] is our record.
                // If multiple, try to match by user_id if possible.
                _currentInstructor = data.instructors.find(i => (i.user_id || i.id || i.Id) == user_id) || data.instructors[0];
            }
        }
    } catch (err) {
        console.error("Error fetching instructor data:", err);
    } finally {
        $("body").addClass("loaded");
    }

    // Fallback to local records if API fails or returns no data
    if (!_currentInstructor) {
        _currentInstructor = allRecords.find(item => item.user_id == user_id);
    }

    if (_currentInstructor) {
        $("#divModel").find(".modal-title").text("Edit Category");
        $("#divModel").find("#txtId").val(_currentInstructor["user_id"] || _currentInstructor["id"] || _currentInstructor["Id"]);
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
        hideModalError();
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
        audio: [],
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
        if (!/^\d{10,15}$/.test(item["mobile_no"])) {
            msg = "Please enter valid mobile number (10-15 digits): " + item["mobile_no"];
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
        /*
        let RawinstructorJson = await readS3BucketAsync(`${activePathS3["instructorPath"]}${item["user_id"]}.json`, "");
        if (RawinstructorJson.err) {
            console.log(RawinstructorJson.err);
        } else {
            finalJson = JSON.parse(RawinstructorJson.data);
            msg = "This Id is already exists ";
            cansave = false;
        }
        */
        try {
            console.log("Checking mobile number availability...");
            const url = `${INSTRUCTORS_API_BASE}?mobile_no=${encodeURIComponent(item["mobile_no"])}`;
            const response = await fetch(url);
            const text = await response.text();
            const data = parseInstructorApiBody(text);
            if (isInstructorNotFoundError(data)) {
                // mobile not registered — OK to add (cansave stays true)
            } else if (data.instructors && data.instructors.length > 0) {
                msg = "This Mobile No. already exists";
                cansave = false;
            }
        } catch (err) {
            console.error("Number validation error:", err);
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
    hideModalError();
    $("#hdnInstructor").val("");
    $("#divModel").find(".modal-title").text("Add New Instructor");
    if (TEST_PREFILL_ADD_INSTRUCTOR) {
        prefillAddInstructorTestData();
    }
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
    globalCount = 0; // Reset global count for search
    let story = [];
    let instructorno = $('#txtInstructorNo').val().trim();
    
    if (instructorno) {
        // If it's a 10-digit number or more, call the specific mobile_no API
        if (/^\d{10,}$/.test(instructorno)) {
            $("body").removeClass("loaded");
            try {
                const url = `https://r5dojmizdd.execute-api.ap-south-1.amazonaws.com/prod/instructors?mobile_no=${encodeURIComponent(instructorno)}`;
                const response = await fetch(url);
                const data = await response.json();
                story = data.instructors || [];
            } catch (err) {
                console.log("Search error:", err);
                // Fallback to local filter if API fails
                story = allRecords.filter(function (i) {
                    const q = instructorno.toLowerCase();
                    return (i.mobile_no !== undefined && i.mobile_no.toString().includes(instructorno)) || (i.name !== undefined && i.name.toLowerCase().includes(q));
                });
            } finally {
                $("body").addClass("loaded");
            }
        } else {
            // Local filter for name or partial mobile number from already loaded records
            story = allRecords.filter(function (i) {
                const q = instructorno.toLowerCase();
                return (i.mobile_no !== undefined && i.mobile_no.toString().includes(instructorno)) || (i.name !== undefined && i.name.toLowerCase().includes(q));
            });
        }
    } else {
        story = allRecords;
    }
    
    $("#divInstructor").html(renderHeader()); 
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

// Attach scroll event listener for pagination
let scrollTimeout;
$(window).on("scroll", function () {
    if (scrollTimeout) clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
        // Only trigger pagination if not searching
        if ($('#txtInstructorNo').val().trim() === "") {
            if ($(window).scrollTop() + $(window).height() >= $(document).height() - 100) {
                if (!isFetching && lastKey !== 'END') {
                    GetinstructorList();
                }
            }
        }
    }, 200);
});
