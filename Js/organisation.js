const fs = require('fs');
const path = require('path');
var remote = require('@electron/remote');
const dialog = remote.dialog;
let common = require('../Js/config');
let activePathS3 = common.getS3Path();
let isFetching = false;
let lastKey = '';
let allRecords = [];
const ORGANISATIONS_API_BASE = "https://r5dojmizdd.execute-api.ap-south-1.amazonaws.com/prod/organisation_master";

organisationMasterList();
async function organisationMasterList() {
    allRecords = [];
    lastKey = '';
    const header = `
        <div class="storycardheader col-md-12 row">
            <div class="col-md-7"><h4>Organisation</h4></div>
            <div class="col-md-2"></div>
            <div class="col-md-3"></div>
            <hr>
        </div>`;
    $('#divStory').html(header);

    fetchOrganisations();
}

async function fetchOrganisations() {
    if (isFetching) return;
    isFetching = true;
    $('body').removeClass('loaded');

    try {
        let hasMore = true;
        while (hasMore) {
            const url = `${ORGANISATIONS_API_BASE}?lastKey=${encodeURIComponent(lastKey)}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error(`API failed: ${response.status}`);

            const data = await response.json();
            const batch = data.data || data.organisations || data.organisation_master || [];
            
            if (batch.length > 0) {
                allRecords = [...allRecords, ...batch];
                renderOrganisations(batch);
            }

            hasMore = data.hasMore;
            lastKey = data.lastKey || '';
            if (!hasMore) break;
        }
    } catch (e) {
        console.error("Fetch error:", e);
    } finally {
        $('body').addClass('loaded');
        isFetching = false;
    }
}

function renderOrganisations(records) {
    let html = "";
    records.forEach(item => {
        html += `
            <div class="storycard col-md-12 row column" id="${item.id}">
                <div class="col-md-7">${item.Organisation}</div>
                <div class="col-md-2">
                    <a href="#" data-toggle="modal" data-target="#organisationModal" onclick="editOrganisation('${item.Organisation}', '${item.id}')">Edit</a>
                </div>
                <div class="col-md-3">
                    <a href="#" onclick="deleteOrganisation('${item.id}')">Delete</a>
                </div>
                <hr>
            </div>`;
    });
    $('#divStory').append(html);
}

async function deleteOrganisation(id) {
    if (confirm("Are you sure you want to delete this organisation?")) {
        $('body').removeClass('loaded');
        try {
            const url = `${ORGANISATIONS_API_BASE}/${encodeURIComponent(id)}`;
            const response = await fetch(url, { method: "DELETE" });
            if (response.ok) {
                alert("Organisation deleted successfully");
                organisationMasterList();
            } else {
                const data = await response.json();
                alert("Error deleting: " + (data.error || data.msg || "Unknown error"));
            }
        } catch (e) {
            console.error("Delete error:", e);
        } finally {
            $('body').addClass('loaded');
        }
    }
}

$("#btnSave").click(function () {
    validation(async function (cansave) {
        if (cansave.cansave) {
            $('body').removeClass('loaded');
            try {
                const isEdit = $("#hdnOrganisationId").val() != "";
                const method = isEdit ? "PUT" : "POST";
                const url = isEdit 
                    ? `${ORGANISATIONS_API_BASE}/${encodeURIComponent($("#hdnOrganisationId").val())}`
                    : ORGANISATIONS_API_BASE;

                const response = await fetch(url, {
                    method: method,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(cansave.item)
                });

                if (response.ok) {
                    const options = { title: '', message: `Organisation ${isEdit ? 'Updated' : 'Saved'} successfully`, detail: '' };
                    dialog.showMessageBox(null, options);
                    $('#organisationModal').modal('hide');
                    organisationMasterList();
                } else {
                    const data = await response.json();
                    const errMsg = data.error || data.msg || "Unknown error";
                    alert("Error saving: " + errMsg);
                }
            } catch (e) {
                console.error("Save error:", e);
                alert("Failed to save organisation");
            } finally {
                $('body').addClass('loaded');
            }
        } else {
            alert(cansave.msg);
        }
    });
});
$("#btnAddOrganisation").click(function () {
    $('#organisationModal #txtOrganisation');
    $("#hdnOrganisationId").val('');
    $('#organisationModal').find('.modal-title').text("Add New Organisation");
});

$("#btnClose").click(function () {
    $('#organisationModal').modal('hide');
});


function editOrganisation(Organisation, id) {
    $('#organisationModal').find('.modal-title').text("Edit Organisation");
    $('#organisationModal').find('#txtOrganisation').val(Organisation);
    $('#organisationModal').find('#hdnOrganisationId').val(id);
}
function validation(cb) {
    var cansave = true;
    var msg = "";
    var item = {
        "id": $('#organisationModal #txtOrganisation').val().toLowerCase().replace(/ /g, "_"),
        "Organisation": $.trim($('#organisationModal').find('#txtOrganisation').val())
    };
    if (item["Organisation"] == "") {
        msg = "Please Enter Organisation";
        cansave = false;
    }
    var result = { "cansave": cansave, "msg": msg, "item": item };
    cb(result);
}
