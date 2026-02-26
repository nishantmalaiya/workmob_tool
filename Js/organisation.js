const fs = require('fs');
const path = require('path');
var remote = require('electron').remote;
const dialog = remote.dialog;
let common = require('../js/config');
let activePathS3 = common.getS3Path();

organisationMasterList();
async function organisationMasterList() {
    $('body').toggleClass('loaded');
    var meta = await readS3BucketAsync("OrganisationMaster.json", "");

    $('body').toggleClass('loaded');
    if (meta.err) {
        console.log(meta.err);
    }
    var storyCard = "";
    storyCard = "<div class=\"storycardheader col-md-12 row\">";
    storyCard = storyCard + "<div class=\"col-md-9\"><h4>Organisation</h4></div>";
    storyCard = storyCard + "<div class=\"col-md-3\"></div>";
    storyCard = storyCard + "<hr></div>";
    $('#divStory').html(storyCard);
    var storyCard = "";
    $(JSON.parse(meta.data)).each(function () {
        storyCard = storyCard + "<div class=\"col-md-9\">" + this.Organisation + "</div>";
        storyCard = storyCard + "<div class=\"col-md-3\"><a href=\"#\" data-toggle=\"modal\" data-target=\"#organisationModal\" onclick=\"editOrganisation('" + this.Organisation + "','" + this.id + "')\">Edit</a></div>";
    });
    $('#divStory').append(storyCard);
}

$("#btnSave").click(function () {
    var vOrganisationMaster = [];
    validation(async function (cansave) {
        if (cansave.cansave) {
            $('body').toggleClass('loaded');
            var meta = await readS3BucketAsync("OrganisationMaster.json", "");
            if (meta.err) {
                console.log(meta.err);
            }
            else {
                vOrganisationMaster = JSON.parse(meta.data);
            }
            if ($("#hdnOrganisationId").val() == "") {
                var result = $(vOrganisationMaster).filter(function (item) {
                    return item["id"] == cansave["item"]["id"];
                });
                if (result.length > 0) {
                    alert("This Organisation already exist");
                    return false;
                }
                else {
                    vOrganisationMaster.push(cansave["item"]);
                }
                // const IsExists = await existsS3Bucket(`organisation/${cansave["item"]["organisation"].toLowerCase()}.json"`);
                // if (!IsExists.isExists) {
                //     var a = [];
                //     await WriteS3Bucket(a, `organisation/${cansave["item"]["organisation"].toLowerCase()}.json"`);
                // }
            }
            else {
                for (var i = 0; i < vOrganisationMaster.length; i++) {
                    if (vOrganisationMaster[i]["id"] == $("#hdnOrganisationId").val()) {
                        vOrganisationMaster[i]["Organisation"] = cansave["item"]["Organisation"];
                        break;
                    }
                }
            }
            await WriteS3Bucket(vOrganisationMaster, "OrganisationMaster.json");
            $('#organisationModal').modal('hide');
            $('body').toggleClass('loaded');
            const options = { title: '', message: 'Organisation Saved succssfully', detail: '' };
            try {
                dialog.showMessageBox(null, options);
            } catch (e) {
                console.log(e);
                dialog.showMessageBox(null, options);
            }
            $('#organisationModal').find('#txtOrganisation').val("");
            $('#organisationModal').find('#hdnOrganisationId').val("");

            var storyCard = "";
            storyCard = "<div class=\"storycardheader col-md-12 row\">";
            storyCard = storyCard + "<div class=\"col-md-9\"><h4>Organisation</h4></div>";
            storyCard = storyCard + "<div class=\"col-md-3\"></div>";
            storyCard = storyCard + "<hr></div>";
            $('#divStory').html(storyCard);
            storyCard = "";
            $(vOrganisationMaster).each(function () {
                storyCard = storyCard + "<div class=\"col-md-9\">" + this.Organisation + "</div>";
                storyCard = storyCard + "<div class=\"col-md-3\"><a href=\"#\" data-toggle=\"modal\" data-target=\"#organisationModal\" onclick=\"editOrganisation('" + this.Organisation + "','" + this.id + "')\">Edit</a></div>";
            });
            $('#divStory').append(storyCard);
        }
        else {
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