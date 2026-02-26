var remote = require("@electron/remote");
// const { app } = require("electron");
// app.commandLine.appendSwitch ("disable-http-cache");
const fs = require("fs");
const path = require("path");

//const { setInterval, clearInterval } = require("timers");
const ipcRenderer = require("electron").ipcRenderer;
var pathName = remote.getGlobal("sharedObj").pathName;
const dialog = remote.dialog;
let common = require("./js/config");
let activePathS3 = common.getS3Path();
var storyAlsoOn = [];
var storyInAllJson = [];
var Need_subCategory_in = ["namaste", "promotion"];
var Need_trending_in = ["gyan", "hope", "namaste", "promotion"];
var type = remote.getGlobal("sharedObj").currentStory;
storyAlsoOn.push({ chkbox: "storiestop", file: activePathS3["stories-top"], isExist: false, index: "-1", total: "0", label: "Stories Top", CanAdd: false, });
storyAlsoOn.push({ chkbox: "storiestending", file: activePathS3["trending"], isExist: false, index: "-1", total: "0", label: "Trending", CanAdd: false, });
storyAlsoOn.push({ chkbox: "storiesMobileHomeScreen", file: activePathS3["mobile-home"], isExist: false, index: "-1", total: "0", label: "Mobile Home Screen", CanAdd: false, });
storyAlsoOn.push({ chkbox: "bloghome", file: activePathS3["blog-home"], isExist: false, index: "-1", total: "0", label: "Blog Home", CanAdd: false, });

if (Need_trending_in.indexOf(type) != -1) {
    storyAlsoOn.push({ chkbox: "storieshope", file: activePathS3["stories-hope"], isExist: false, index: "-1", total: "0", label: "Hope", CanAdd: false, });
    storyAlsoOn.push({ chkbox: "storiesgyan", file: activePathS3["stories-gyan"], isExist: false, index: "-1", total: "0", label: "Gyan", CanAdd: false, });
    storyAlsoOn.push({ chkbox: "storiesnamaste", file: activePathS3["stories-namaste"], isExist: false, index: "-1", total: "0", label: "Namaste", CanAdd: false, });
    storyAlsoOn.push({ chkbox: "storiespromotion", file: activePathS3["stories-promotion"], isExist: false, index: "-1", total: "0", label: "Promotion", CanAdd: false, });

}


storyInAllJson.push({ file: activePathS3["trending"] });
storyInAllJson.push({ file: activePathS3["mobile-home"] });
storyInAllJson.push({ file: activePathS3["blog-home"] });
storyInAllJson.push({ file: activePathS3["location"] });
storyInAllJson.push({ file: activePathS3["organisation"] });
storyInAllJson.push({ file: activePathS3["stories-hope"] });
storyInAllJson.push({ file: activePathS3["stories-gyan"] });
storyInAllJson.push({ file: activePathS3["stories-namaste"] });
storyInAllJson.push({ file: activePathS3["stories-promotion"] })


let _masterCategory = [];
let _instructorList = [];
let _subcategoryList = [];
var masterCategory = "";
let priviousCategory = null;
var tmpinstructor = "";
var tmplocation = "";
var tmpTopStory = false;
var tmpOrganisation = "";
var tmpTopStory = false;
var perviousOrganisation = "";
var perviousLocation = "";
GetSubcategoryList();





async function GetSubcategoryList() {
    // debugger;
    var submeta = await readS3BucketAsync(activePathS3["subcategory"], "");
    if (submeta.err) {
        console.log(submeta.err);
    } else {
        _subcategoryList = JSON.parse(submeta.data);
    }
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

        console.log(arg);
        masterCategory = arg.category;
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

    let rawdata = fs.readFileSync(path.resolve(__dirname, "Files/templateTop.json"));
    let templateTop = JSON.parse(rawdata);
    let rawdataConfing = await readS3BucketAsync(activePathS3["config"], "");
    console.log(rawdataConfing.data);

    let configJson = JSON.parse(rawdataConfing.data);
    var select2 = require("select2");


    async function GetCategoryList() {
        // debugger;
        var CategoryList = await readS3BucketAsync(activePathS3["category"], "");

        if (CategoryList.err) {
            return console.log(RawJson.err);
        } else {
            JSON_Obj = JSON.parse(CategoryList.data);
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
        }
    }

    async function GetInstructorList() {
        // debugger;
        var InstructorList = await readS3BucketAsync(activePathS3["instructor"], "");

        if (InstructorList.err) {
            return console.log(RawJson.err);
        } else {
            JSON_Obj = JSON.parse(InstructorList.data);
            //var JSON_Obj = JSON.parse(json.data);
            var element = [];
            for (var i = 0; i < JSON_Obj.length; i++) {
                var _instructor = JSON_Obj[i];
                element.push('<option value="' + _instructor.user_id + '">' + _instructor.name + ' - ' + _instructor.mobile_no + " </option>");
                _instructorList.push(_instructor.user_id);
            }
            $("#divJson #ddl_instructor").html(element.join(" "));
            var $select = $("#divJson #ddl_instructor").selectize({
                sortField: 'text',
                maxOptions: 100000,
                placeholder: "Select User"
            });
            var selectize = $select[0].selectize;

            if (tmpinstructor == '') {
                selectize.setValue('');
            }
            else {
                selectize.setValue(tmpinstructor);
                // $("#divJson").find('[name="instructor"]').val(tmpinstructor); 
            }

        }
    }
    async function GetLocatoionList() {
        var LocationList = await readS3BucketAsync("LocationMaster.json", "");

        if (LocationList.err) {
            return console.log(LocationList.err);
        } else {
            JSON_Obj = JSON.parse(LocationList.data);
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

            if (tmplocation == "") {
                selectize.setValue('NoLocation');
            }
            else {
                selectize.setValue(tmplocation);

            }
        }
    }
    async function GetOrganisationList() {
        var OrganisationList = await readS3BucketAsync("OrganisationMaster.json", "");

        if (OrganisationList.err) {
            return console.log(OrganisationList.err);
        } else {
            JSON_Obj = JSON.parse(OrganisationList.data);
            var element = [];
            element.push('<option value="NoOrganisation">No Organisation</option>');
            for (var i = 0; i < JSON_Obj.length; i++) {
                element.push('<option value="' + JSON_Obj[i].Organisation.toLowerCase() + '">' + JSON_Obj[i].Organisation + " </option>");
            }
            $("#divJson #ddl_organisation").html(element.join(" "));
            var $select = $("#divJson #ddl_organisation").selectize({
                sortField: 'text',
                maxOptions: 100000,
                placeholder: "Select Organisation"
            });
            var selectize = $select[0].selectize;

            if (tmpOrganisation == "") {
                selectize.setValue("NoOrganisation");
            }
            else {
                selectize.setValue(tmpOrganisation);

            }
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
                debugger;
                var finalHtml = ParseToElement(JSON_Obj);
                $("#divJson").html(finalHtml.join(" "));
                GetCategoryList();

                GetvideoFormatList();
                GetInstructorList();
                GetLocatoionList();
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

    $("#btnSave").on("click", async function () {
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
        fullStory = JSON.stringify(fullStory);
        console.log(fullStory);
        GenerateStory["fullStory"] = fullStory;
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
        if ($("#divJson #ddl_ddlcategory").val() == null) {
            $("body").toggleClass("loaded");
            dialog.showErrorBox("required field", "Please select master category");
            return false;
        }
        if ($("#divJson #ddl_location").val() == null || $("#divJson #ddl_location").val() == "" || $("#divJson #ddl_location").val() == undefined) {
            $("body").toggleClass("loaded");
            dialog.showErrorBox("Required field", "Please select location");
            return false;
        }
        if ($("#divJson #ddl_organisation").val() == null || $("#divJson #ddl_organisation").val() == "" || $("#divJson #ddl_organisation").val() == undefined) {
            $("body").toggleClass("loaded");
            dialog.showErrorBox("Required field", "Please select organisation");
            return false;
        }
        if ($("#divJson #ddl_instructor").val() == null || $("#divJson #ddl_instructor").val() == "" || $("#divJson #ddl_instructor").val() == undefined) {
            $("body").toggleClass("loaded");
            dialog.showErrorBox("Required field", "Please select Instructor");
            return false;
        }
        if ($("#divJson #ddl_organisation").find('option:selected').val().toLowerCase().trim() == "vfly") {
            $("body").toggleClass("loaded");
            if (confirm("Are you sure want to VFLY as Organisation for this story!")) {

            }
            else {
                return false;
            }
        }
        tmpTopStory = true;
        validaton(GenerateStory, async function (result) {
            if (result.cansave) {
                const checkResponse = await fetch(`https://r5dojmizdd.execute-api.ap-south-1.amazonaws.com/prod/stories/${GenerateStory.slug}`);
                let checkData = {};
                try {
                    checkData = await checkResponse.json();
                } catch (e) {
                    console.log("Error checking story:", e);
                }

                if (checkData.error === "Story not found") {
                    const response = await fetch("https://r5dojmizdd.execute-api.ap-south-1.amazonaws.com/prod/stories", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(GenerateStory),
                    });
                    const meta = await response.json();
                    console.log("API Response:", meta);
                } else {
                    console.log("Story already exists. Skipping creation.", checkData);

                    const options = { title: "", message: "Story already exists. Skipping creation.", detail: "", };
                    try {
                        dialog.showMessageBox(null, options);
                    } catch (e) {
                        console.log(e);
                        dialog.showMessageBox(null, options);
                    }
                    // Potential TODO: Handle Update (PUT) here if intended.
                }
                // for (var key in templateTop) {
                //     templateTop[key] = GenerateStory[key];
                // }

                //await WriteonTrendingNew(GenerateStory.slug, templateTop); api not get

                // await WriteInMasterIndex(templateTop); now we add same as  add stories
                // await CheckSlugStory(templateTop.slug);
                // await RemoveFromUnchecked(templateTop.slug);

                // await saveOninstructor(templateTop);

                // await saveOnSubcategory(templateTop);
                // if ($("#divJson #ddl_location").val() != "" && $("#divJson #ddl_location").val() != undefined && $("#divJson #ddl_location").val() != "NoLocation") {

                //     await saveOnTags_Location(templateTop, $("#divJson #ddl_location").val(), "location");
                // }
                // var _tags = $("#divJson").find('[name="tags"]').val();
                // if (_tags != "") {
                //     $(_tags.split(",")).each(async function () {
                //         await saveOnTags_Location(templateTop, this.toString(), "tags");
                //     });
                // }
                // await saveTags_Master(templateTop);
                // if ($('#chk_storiesvisiblity').is(":checked")) {
                //     await HideFromAllJSON(templateTop);
                // }
                // if ($('#chk_storiespriority').is(":checked")) {
                //     await MakeStoryPriority(templateTop);
                // }
                // //Organisation
                // var _organisations = $("#divJson #ddl_organisation").val();
                // if (_organisations != "" && _organisations != undefined) {
                //     // if (_organisations != "" && _organisations!=undefined && _organisations !="NoOrganisation") {
                //     await saveOnOrganisation(templateTop, _organisations, "organisation");
                // }

                // $("body").toggleClass("loaded");
                // const options = { title: "", message: "Story Saved succssfully", detail: "", };
                // try {
                //     dialog.showMessageBox(null, options);
                // } catch (e) {
                //     console.log(e);
                //     dialog.showMessageBox(null, options);
                // }
            } else {
                $("body").toggleClass("loaded");
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

    }

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
            await CheckSlugStory(slug);
            if ($(txtboxSlug).attr("disabled") == undefined) {
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
                }
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
                switch ($(this).find("label:first").text()) {
                    case "Heading":
                        strStory.push(
                            "<h3>" + $.trim($(this).find(".customeEditor").html()) + "</h3>"
                        );
                        break;
                    case "Paragraph":
                        strStory.push(
                            "<p>" + $.trim($(this).find(".customeEditor").html()) + "</p>"
                        );
                        break;
                    case "Quote":
                        strStory.push(
                            '<blockquote name="blockquote">' +
                            $.trim($(this).find(".customeEditor").text()) +
                            "</blockquote>"
                        );
                        break;
                    case "Quote green":
                        strStory.push(
                            '<blockquote name="blockquote green">' +
                            $.trim($(this).find(".customeEditor").text()) +
                            "</blockquote>"
                        );
                        break;
                    case "Quote dark green":
                        strStory.push(
                            '<blockquote name="blockquote darkGreen">' +
                            $.trim($(this).find(".customeEditor").text()) +
                            "</blockquote>"
                        );
                        break;
                    case "Quote light green":
                        strStory.push(
                            '<blockquote name="blockquote lightGreen">' +
                            $.trim($(this).find(".customeEditor").text()) +
                            "</blockquote>"
                        );
                        break;
                    case "Bulleted list":
                        strStory.push("<ul>");
                        var list = $.trim(
                            $(this).find(".customeEditor")[0].innerText
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
                            $.trim($(this).find(".customeEditor").text()) +
                            "</strong></p>"
                        );
                        break;
                    case "Video":
                        strStory.push(
                            '<video controls src="' +
                            $.trim($(this).find(".customeEditor").text()) +
                            '"> </video>'
                        );
                        break;
                    case "Image Url(Right)":
                        strStory.push(
                            '<img src="{{' +
                            $.trim($(this).find(".customeEditor").text()) +
                            ' }}" alt="{{img name}}"/>'
                        );
                        break;
                    case "Image Url(Left)":
                        strStory.push(
                            '<span class="rounded-pill mr-2 float-left img-thumb text-center"><img src="' +
                            $.trim($(this).find(".customeEditor").text()) +
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
    //                             // perviousLocation=JSON_Obj[key];
    //                             GetLocatoionList();

    //                         }
    //                         if (key == "organisation") {

    //                             // tmpOrganisation=JSON_Obj[key];
    //                             // perviousOrganisation=JSON_Obj[key];
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
    //                     priviousCategory = JSON_Obj["master_categories"].split(",");
    //                     master_categories = JSON_Obj["master_categories"].split(",");
    //                 } else {
    //                     priviousCategory = "";
    //                     master_categories.push(masterCategory.toLocaleLowerCase());
    //                 }
    //                 if (JSON_Obj["organisation"] != undefined && JSON_Obj["organisation"] != "") {
    //                     // will used at update time for remove purpose;
    //                     perviousOrganisation = JSON_Obj["organisation"];
    //                     tmpOrganisation = JSON_Obj["organisation"];
    //                 } else {
    //                     perviousOrganisation = "";
    //                     tmpOrganisation = "";
    //                 }
    //                 if (JSON_Obj["location"] != undefined && JSON_Obj["location"] != "") {
    //                     // will used at update time for remove purpose;
    //                     perviousLocation = JSON_Obj["location"];
    //                     tmplocation = JSON_Obj["location"];
    //                 } else {
    //                     perviousLocation = "";
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
        $.ajax({
            url: "https://r5dojmizdd.execute-api.ap-south-1.amazonaws.com/prod/story-detail/" + slug,
            method: "GET",
            success: function (data) {
                try {
                    // Assuming data is already a parsed JSON object from the API.
                    // If it's a string, uncomment the next line: var JSON_Obj = JSON.parse(data);
                    var JSON_Obj = data;

                    var ignoreItem = ["fullStory", "fullStory_hindi", "master_categories"];

                    // Populate general fields
                    for (var key in JSON_Obj) {
                        if (ignoreItem.indexOf(key) === -1) {
                            $("#divJson").find('[name="' + key + '"]').val(JSON_Obj[key]);

                            if (key === "instructor") {
                                tmpinstructor = JSON_Obj[key];
                                GetInstructorList();
                            } else if (key === "location") {
                                GetLocationList();  // Fixed typo
                            } else if (key === "organisation") {
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

                    // Handle organisation
                    if (JSON_Obj["organisation"] != null && JSON_Obj["organisation"] !== "") {
                        previousOrganisation = JSON_Obj["organisation"];  // Fixed typo
                        tmpOrganisation = JSON_Obj["organisation"];
                    } else {
                        previousOrganisation = "";
                        tmpOrganisation = "";
                    }

                    // Handle location
                    if (JSON_Obj["location"] != null && JSON_Obj["location"] !== "") {
                        previousLocation = JSON_Obj["location"];  // Fixed typo
                        tmplocation = JSON_Obj["location"];
                    } else {
                        previousLocation = "";
                        tmplocation = "";
                    }

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
                    $("#chk_show_contact").prop('checked', JSON_Obj["show_contact"] === true);
                    $("#chk_consent_received").prop('checked', JSON_Obj["consent_received"] === true);

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
            switch (el.nodeName) {
                case "H3":
                    AddField("Heading", $(el).text());
                    break;
                case "P":
                    if ($(el).find("strong").length == 0) {
                        AddField("Paragraph", $(el).text());
                    } else {
                        AddField("Paragraph bold", $(el).text());
                    }
                    break;
                case "BLOCKQUOTE":
                    if ($(el).hasClass("green")) {
                        AddField("Quote green", $(el).text());
                    } else if ($(el).hasClass("darkGreen")) {
                        AddField("Quote dark green", $(el).text());
                    } else if ($(el).hasClass("lightGreen")) {
                        AddField("Quote light green", $(el).text());
                    } else {
                        AddField("Quote", $(el).text());
                    }
                    break;
                case "UL":
                    console.log(el.nodeName, el);
                    AddField("Bulleted list", $(el).html());
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
        for (var i = 0; i < storyAlsoOn.length; i++) {
            console.log("slug start", new Date());
            var _currentJsonFile = storyAlsoOn[i].file;
            const IsExists = await existsS3Bucket(_currentJsonFile, i);
            if (IsExists.isExists) {
                var _index = parseInt(IsExists.data);
                const slugResult = await readS3BucketAsync(
                    storyAlsoOn[_index].file,
                    ""
                );
                if (slugResult.err) {
                } else {
                    try {
                        let fileJson = JSON.parse(slugResult.data);
                        var chkbox = $('[name="' + storyAlsoOn[_index]["chkbox"] + '"]');
                        var existingCount = parseInt(fileJson.length);
                        var MaxCount = parseInt(configJson[storyAlsoOn[_index]["chkbox"]]);
                        if (MaxCount > existingCount) {
                            storyAlsoOn[_index]["CanAdd"] = true;
                            $(chkbox).removeAttr("disabled");
                        } else {
                            storyAlsoOn[_index]["CanAdd"] = false;
                            $(chkbox).attr("disabled", "disabled");
                        }
                        var lbl = chkbox.closest("label");
                        $(lbl).html(
                            storyAlsoOn[_index]["label"] + " (" + fileJson.length + ") "
                        );
                        $(lbl).append(chkbox);
                        for (var j = 0; j < fileJson.length; j++) {
                            if (fileJson[j].slug == slug) {
                                var chktemp = $('[name="' + storyAlsoOn[_index]["chkbox"] + '"]').prop("checked");
                                if (!tmpTopStory || chktemp) {
                                    storyAlsoOn[_index]["isExist"] = true;
                                    storyAlsoOn[_index]["index"] = j;
                                    storyAlsoOn[_index]["total"] = fileJson.length;
                                    $('[name="' + storyAlsoOn[_index]["chkbox"] + '"]').prop(
                                        "checked",
                                        true
                                    );
                                    $(chkbox).removeAttr("disabled");
                                    break;
                                }
                            }
                        }
                    } catch (e) { }
                }
            }
        }
    }

    async function RenderMasterIndexstuff(slug) {
        const metaMasterIndex = await readS3BucketAsync(
            activePathS3["MasterIndex"],
            ""
        );
        if (metaMasterIndex.err) {
            return console.log(metaMasterIndex.err);
        }
        var MasterIndexJSONObj = JSON.parse(metaMasterIndex.data);
        var Current_MasterIndexJSONObj = MasterIndexJSONObj.filter(function (itm) {
            return itm.slug == slug;
        });
        $('#chk_storiesvisiblity').prop('checked', false);
        $('#chk_storiespriority').prop('checked', false);
        if (Current_MasterIndexJSONObj != null && Current_MasterIndexJSONObj[0] != null) {
            if (Current_MasterIndexJSONObj[0]["hide"] != undefined && Current_MasterIndexJSONObj[0]["hide"].toString().toLowerCase() == "true") {
                $('#chk_storiesvisiblity').prop('checked', true);

            }
            if (Current_MasterIndexJSONObj[0]["priority"] != undefined && Current_MasterIndexJSONObj[0]["priority"].toString().toLowerCase() == "true") {
                $('#chk_storiespriority').prop('checked', true);
            }

        }

    }
    async function HideFromAllJSON(templateTop) {
        // debugger;
        //rest all json is in "storyInAllJson" except category.
        for (var i = 0; i < storyInAllJson.length; i++) {
            var IsExists = "";
            var slugResult = "";
            console.log("slug start", new Date());
            var _currentJsonFile = storyInAllJson[i].file;
            if (_currentJsonFile == "organisations") {
                if (perviousOrganisation != "" && perviousOrganisation != undefined && perviousOrganisation != "NoOrganisation") {
                    IsExists = await existsS3Bucket(`${_currentJsonFile}/${$.trim(perviousOrganisation)}.json`);
                    if (IsExists.isExists) {
                        slugResult = await readS3BucketAsync(`${_currentJsonFile}/${$.trim(perviousOrganisation)}.json`, "");
                    }
                    _currentJsonFile = `${_currentJsonFile}/${$.trim(perviousOrganisation)}.json`;
                }
            }
            else if (_currentJsonFile == "locations" && perviousLocation != undefined && perviousLocation != "NoLocation") {
                if (perviousLocation != "") {
                    IsExists = await existsS3Bucket(`${_currentJsonFile}/${$.trim(perviousLocation)}.json`);
                    if (IsExists.isExists) {
                        slugResult = await readS3BucketAsync(`${_currentJsonFile}/${$.trim(perviousLocation)}.json`, "");
                    }
                    _currentJsonFile = `${_currentJsonFile}/${$.trim(perviousLocation)}.json`;
                }
            }
            else {
                var IsExists = await existsS3Bucket(_currentJsonFile, i);
                if (IsExists.isExists) {
                    var _index = parseInt(IsExists.data);

                    slugResult = await readS3BucketAsync(
                        storyInAllJson[_index].file,
                        ""
                    );
                }
            }
            if (slugResult != null && slugResult.data != null && slugResult.data.length > 0) {
                try {
                    let fileJson = JSON.parse(slugResult.data);
                    // var JsonExist = fileJson.filter(function (itm) 
                    // {
                    //     itm.slug == templateTop.slug;
                    // });
                    if (fileJson.length > 0) {
                        fileJson = fileJson.filter(function (itm) {
                            return itm.slug != templateTop.slug;
                        });
                        if (fileJson != null) {
                            var meta = await WriteS3Bucket1(fileJson, _currentJsonFile, function (tt) { });
                            console.log(_currentJsonFile + " file was saved!");
                        }
                    }
                }
                catch (e) { }
            }

        }
        //Remove from Category
        $(priviousCategory).each(async function () {
            let category = this.toString();
            const slugResult = await readS3BucketAsync(
                activePathS3["category-index"] + category + ".json", "");
            if (slugResult.err) {
            }
            else {
                let AllStory = JSON.parse(slugResult.data);
                AllStory = AllStory.filter(function (data) { return data.slug != templateTop.slug; });
                await WriteS3Bucket(AllStory, activePathS3["category-index"] + category + ".json", function (tt) { });
            }


        });

        //Add in masterindex about hide

        // const metaMasterIndex = await readS3BucketAsync(
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
        //     if(Current_MasterIndexJSONObj[0]["hide"]==undefined)
        //     {
        //         Current_MasterIndexJSONObj[0]["hide"]="True";
        //     }
        // }
        // Rest_MasterIndexJSONObj.push(Current_MasterIndexJSONObj[0])
        // if(Rest_MasterIndexJSONObj!=null)
        // {
        //     var meta = await WriteS3Bucket1(Rest_MasterIndexJSONObj, activePathS3["MasterIndex"], function (tt) { });
        //     console.log("MasterIndex file was saved!");
        // }
    }


    async function MakeStoryPriority(templateTop) {
        let newallstory = [];
        $(priviousCategory).each(async function () {
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

    $("#btndelete").on("click", async function () {
        if (confirm("Are you sure want to delete this story!")) {
            // debugger;
            $("body").toggleClass("loaded");
            const SlugRawJson = await readS3BucketAsync(
                activePathS3["story-detail"] + $("#txt_slug").val() + ".json",
                ""
            );
            if (SlugRawJson.err) {
                console.log(SlugRawJson.err);
            } else {
                try {
                    SlugJson = JSON.parse(SlugRawJson.data);
                    if (SlugJson.location != null) {
                        await deleteFromLocation($("#txt_slug").val(), SlugJson.location);
                        console.log("story is removed from Location file!");
                    }
                    await deleteFromMasterIndex($("#txt_slug").val());
                    console.log("story is removed from Master Index file!");


                    if (SlugJson.instructor != "") {
                        await deleteFromInstructor($("#txt_slug").val(), SlugJson.instructor);
                        console.log("story is removed from Instructor file!");
                    }

                    if (SlugJson.organisation != "") {
                        await deleteFromOrganisation($("#txt_slug").val(), $("#ddl_organisation").find('option:selected').val());
                        console.log("story is removed from Organisation file!");

                    }

                    //delete from "category-index"
                    if (SlugJson.master_categories != "") {
                        var categories = SlugJson.master_categories.split(",");
                        for (var i = 0; i < categories.length; i++) {
                            var categoryURL = activePathS3["category-index"] + categories[i] + ".json";
                            var metacategorydata = await readS3BucketAsync(categoryURL);
                            if (metacategorydata.err) {
                                return console.log(metacategorydata.err);
                            }
                            categoryJSONObj = JSON.parse(metacategorydata.data);
                            categoryJSONObj = categoryJSONObj.filter(function (itm) {
                                return itm.slug != $("#txt_slug").val();
                            });

                            if (categoryJSONObj != null) {
                                var meta = await WriteS3Bucket1(categoryJSONObj, categoryURL, function (tt) { });
                                console.log(categories[i] + " file was saved!");
                            }
                        }
                    }
                    //deletefromSlug- entire slug 
                    if (SlugJson.slug != "") {
                        var DeleteResponce = await DeleteS3Bucket(
                            `${activePathS3["story-detail"]}${$("#txt_slug").val()}.json`
                        );
                        console.log("story is removed from StoryDetail file!");
                    }
                    //      if(_currentJsonFile=="story-detail/")
                    // {
                    //     IsExists= await existsS3Bucket(`${_currentJsonFile}${$.trim(templateTop.slug)}.json`);
                    //     if (IsExists.isExists) 
                    //     {
                    //         slugResult= await readS3BucketAsync(`${_currentJsonFile}${$.trim(templateTop.slug)}.json`, "");
                    //     }
                    //     _currentJsonFile=`${_currentJsonFile}${$.trim(templateTop.slug)}.json`;

                    // }
                } catch { }
                // if (SlugJson.instructor != "") {
                // await deleteOnInstructor($("#txt_slug").val(),SlugJson.instructor);
                // console.log("story is removed from Instructor file!");
                // }
                // await deleteFromStoriesTop($("#txt_slug").val());
                // console.log("story is removed from StoriesTop!");
                // await deleteFromTrending($("#txt_slug").val());
                // console.log("story is removed from Trending!");
                // await deleteFromMobileHome($("#txt_slug").val());
                // console.log("story is removed from MobileHome!");
                // await deleteFromBlogHome($("#txt_slug").val());
                // console.log("story is removed from MobileBlog!");
                // await deleteFromHope($("#txt_slug").val());
                // console.log("story is removed from Hope!");
                // await deleteFromGyan($("#txt_slug").val());
                // console.log("story is removed from Gyan!");
                // await deleteFromNamaste($("#txt_slug").val());
                // console.log("story is removed from Namaste!");
                // await deleteFromPromotion($("#txt_slug").val());
                // console.log("story is removed from Promotion!");

            }
            // try {
            //     var meta = await DeleteS3Bucket(
            //         activePathS3["story-detail"] + $("#txt_slug").val() + ".json"
            //     );
            // } catch (e) {
            //     console.log(e);
            // }

            // for (var i = 0; i < storyAlsoOn.length; i++) {
            //     var topJson = null;
            //     var trand = storyAlsoOn[i];
            //     const RawJson = await readS3BucketAsync(trand["file"], "");
            //     if (RawJson.err) {
            //         return console.log(RawJson.err);
            //     } else {
            //         try {
            //             topJson = JSON.parse(RawJson.data);
            //             topJson = topJson.filter(function (itm) {
            //                 return (
            //                     itm.slug.toLowerCase() != $("#txt_slug").val().toLowerCase()
            //                 );
            //             });
            //             await WriteS3Bucket(trand["file"], topJson);
            //         } catch (e) {
            //             console.log(e);
            //         }
            //     }
            // }
            // for (var i = 0; i < _masterCategory.length; i++) {
            //     var AllJson = null;
            //     const IsExists = await existsS3Bucket(
            //         activePathS3["category-index"] + _masterCategory[i] + ".json",
            //         i
            //     );
            //     if (IsExists.isExists) {
            //         var _index = parseInt(IsExists.data);
            //         const slugResult = await readS3BucketAsync(
            //             activePathS3["category-index"] + _masterCategory[_index] + ".json",
            //             ""
            //         );
            //         if (slugResult.err) {
            //         } else {
            //             try {
            //                 AllJson = JSON.parse(slugResult.data);
            //                 AllJson = AllJson.filter(function (itm) {
            //                     return (
            //                         itm.slug.toLowerCase() != $("#txt_slug").val().toLowerCase()
            //                     );
            //                 });
            //                 await WriteS3Bucket(
            //                     AllJson,
            //                     activePathS3["category-index"] +
            //                     _masterCategory[_index] +
            //                     ".json",
            //                     function (tt) { }
            //                 );
            //             } catch (e) {
            //                 console.log(e);
            //             }
            //         }
            //     }
            // }
            // const RawMasterJson = await readS3BucketAsync(
            //     activePathS3["MasterIndex"],
            //     ""
            // );
            // if (RawMasterJson.err) {
            //     return console.log(RawMasterJson.err);
            // } else {
            //     MasterIndexJson = JSON.parse(RawMasterJson.data);
            //     MasterIndexJson = MasterIndexJson.filter(function (itm) {
            //         return itm.slug.toLowerCase() != $("#txt_slug").val().toLowerCase();
            //     });
            //     WriteS3Bucket(
            //         MasterIndexJson,
            //         activePathS3["MasterIndex"],
            //         function (tt) { }
            //     );
            // }


            $("body").toggleClass("loaded");
            ipcRenderer.send("closeChild");
        }
        return false;
    });



    let deleteOnInstructor = async (slug, userid) => {
        var submeta = await readS3BucketAsync(`${activePathS3["instructorPath"]}${userid}.json`, "");
        var instructorDetail = [];

        if (submeta.err) {
            console.log(submeta.err);
        }
        else {
            instructorDetail = JSON.parse(submeta.data);
        }
        console.log(instructorDetail);

        if (instructorDetail[type] != undefined && instructorDetail[type].length > 0) {

            var Afterdeletenstory = instructorDetail[type].filter(function (item) {
                return item.slug != slug;
            });

            if (Afterdeletenstory.length > 0) {
                instructorDetail[type] = Afterdeletenstory;
            }
            else {
                instructorDetail[type] = [];

            }
            await WriteS3Bucket(instructorDetail, `${activePathS3["instructorPath"]}${userid}.json`, function (tt) { });
        }
    }

    async function deleteFromLocation(slug, location) {
        // debugger;
        var locationJSONObj = null;
        var locationURL = activePathS3["location"] + "/" + location + ".json";
        var metaCategory = await readS3BucketAsync(locationURL);
        if (metaCategory.err) {
            return console.log(metaCategory.err);
        }
        locationJSONObj = JSON.parse(metaCategory.data);
        locationJSONObj = locationJSONObj.filter(function (itm) {
            return itm.slug != slug;
        });

        if (locationJSONObj != null) {
            var meta = await WriteS3Bucket1(locationJSONObj, locationURL, function (tt) { });
            console.log("Location file was saved!");
        }
    }

    async function deleteFromMasterIndex(slug) {
        // debugger;
        var MasterIndexJSONObj = null;
        var masterIndexURL = activePathS3["MasterIndex"];
        var metaMasterIndex = await readS3BucketAsync(masterIndexURL);
        if (metaMasterIndex.err) {
            return console.log(metaMasterIndex.err);
        }
        MasterIndexJSONObj = JSON.parse(metaMasterIndex.data);
        MasterIndexJSONObj = MasterIndexJSONObj.filter(function (itm) {
            return itm.slug != slug;
        });

        if (MasterIndexJSONObj != null) {
            var meta = await WriteS3Bucket1(MasterIndexJSONObj, masterIndexURL, function (tt) { });
            console.log("MasterIndex file was saved!");
        }
    }


    async function deleteFromInstructor(slug, instructor) {
        // debugger;
        var instructorList;
        let meta = await readS3BucketAsync(activePathS3["instructor"], "");
        if (meta.err) {
            console.log(meta.err);
            return false;
        }
        else {
            instructorList = JSON.parse(meta.data);
        }
        instructorList = instructorList.filter(function (elem) {
            return elem["instructor"] != instructor;
        });
        const SaveResponce = await WriteS3Bucket1(
            instructorList,
            activePathS3["instructor"]
        );
        console.log(SaveResponce);
        var DeleteResponce = await DeleteS3Bucket(
            `${activePathS3["instructorPath"]}${instructor}.json`
        );
        console.log(DeleteResponce);
    }
    async function deleteFromOrganisation(slug, filename) {
        // debugger;
        var organisationList;
        if (perviousOrganisation != "" && perviousOrganisation != undefined) {
            const IsExists = await existsS3Bucket(`${activePathS3["organisation"]}/${$.trim(perviousOrganisation)}.json`);
            if (IsExists.isExists) {
                var meta = await readS3BucketAsync(`${activePathS3["organisation"]}/${$.trim(perviousOrganisation)}.json`, "");

                if (meta.err) {
                    console.log(meta.err);
                    return false;
                }
                else {
                    organisationList = JSON.parse(meta.data);
                }
                organisationList = organisationList.filter(function (itm) {
                    return itm.slug != slug;

                });
                if (organisationList == undefined || organisationList == "") {
                    organisationList = [];
                }

                var meta = await WriteS3Bucket1(organisationList, `${activePathS3["organisation"]}/${$.trim(perviousOrganisation)}.json`, function (tt) { });
                console.log("Organisation removed from pervious file ");

            }
        }
    }


    let deleteFromStoriesTop = async (slug) => {
        var submeta = await readS3BucketAsync(`${activePathS3["stories-top"]}.json`, "");
        var storiestop = [];
        if (submeta.err) {
            console.log(submeta.err);
        }
        else {
            storiestop = JSON.parse(submeta.data);
            if (storiestop.length > 0) {
                var storiestopJson = storiestop.filter(function (item) {
                    return item.slug != slug;
                });
                await WriteS3Bucket(
                    storiestopJson,
                    activePathS3["stories-top"] + ".json"
                );
            }
        }
    }

    let deleteFromTrending = async (slug) => {
        var submeta = await readS3BucketAsync(`${activePathS3["trending"]}.json`, "");
        var storiestrending = [];
        if (submeta.err) {
            console.log(submeta.err);
        }
        else {
            storiestrending = JSON.parse(submeta.data);
            if (storiestrending.length > 0) {
                var storiestrendingJson = storiestrending.filter(function (item) {
                    return item.slug != slug;
                });
                await WriteS3Bucket(
                    storiestrendingJson,
                    activePathS3["trending"] + ".json"
                );
            }
        }
    }

    let deleteFromMobileHome = async (slug) => {
        var submeta = await readS3BucketAsync(`${activePathS3["mobile-home"]}.json`, "");
        var stories_mobile_home = [];
        if (submeta.err) {
            console.log(submeta.err);
        }
        else {
            stories_mobile_home = JSON.parse(submeta.data);
            if (stories_mobile_home.length > 0) {
                var stories_mobile_homeJson = stories_mobile_home.filter(function (item) {
                    return item.slug != slug;
                });
                await WriteS3Bucket(
                    stories_mobile_homeJson,
                    activePathS3["mobile-home"] + ".json"
                );
            }
        }
    }
    let deleteFromBlogHome = async (slug) => {
        var submeta = await readS3BucketAsync(`${activePathS3["blog-home"]}.json`, "");
        var stories_blog_home = [];
        if (submeta.err) {
            console.log(submeta.err);
        }
        else {
            stories_blog_home = JSON.parse(submeta.data);
            if (stories_blog_home.length > 0) {
                var stories_blog_homeJson = stories_blog_home.filter(function (item) {
                    return item.slug != slug;
                });
                await WriteS3Bucket(
                    stories_blog_homeJson,
                    activePathS3["blog-home"] + ".json"
                );
            }
        }
    }
    let deleteFromHope = async (slug) => {
        var submeta = await readS3BucketAsync(`${activePathS3["stories-hope"]}.json`, "");
        var stories_hope = [];
        if (submeta.err) {
            console.log(submeta.err);
        }
        else {
            stories_hope = JSON.parse(submeta.data);
            if (stories_hope.length > 0) {
                var stories_hopeJson = stories_hope.filter(function (item) {
                    return item.slug != slug;
                });
                await WriteS3Bucket(
                    stories_hopeJson,
                    activePathS3["stories-hope"] + ".json"
                );
            }
        }
    }
    let deleteFromGyan = async (slug) => {
        var submeta = await readS3BucketAsync(`${activePathS3["stories-gyan"]}.json`, "");
        var stories_gyan = [];
        if (submeta.err) {
            console.log(submeta.err);
        }
        else {
            stories_gyan = JSON.parse(submeta.data);
            if (stories_gyan.length > 0) {
                var stories_gyanJson = stories_gyan.filter(function (item) {
                    return item.slug != slug;
                });
                await WriteS3Bucket(
                    stories_gyanJson,
                    activePathS3["stories-gyan"] + ".json"
                );
            }
        }
    }
    let deleteFromNamaste = async (slug) => {
        var submeta = await readS3BucketAsync(`${activePathS3["stories-namaste"]}.json`, "");
        var stories_namaste = [];
        if (submeta.err) {
            console.log(submeta.err);
        }
        else {
            stories_namaste = JSON.parse(submeta.data);
            if (stories_namaste.length > 0) {
                var stories_namasteJson = stories_namaste.filter(function (item) {
                    return item.slug != slug;
                });
                await WriteS3Bucket(
                    stories_namasteJson,
                    activePathS3["stories-namaste"] + ".json"
                );
            }
        }
    }
    let deleteFromPromotion = async (slug) => {
        var submeta = await readS3BucketAsync(`${activePathS3["stories-promotion"]}.json`, "");
        var stories_promotion = [];
        if (submeta.err) {
            console.log(submeta.err);
        }
        else {
            stories_promotion = JSON.parse(submeta.data);
            if (stories_promotion.length > 0) {
                var stories_promotionJson = stories_promotion.filter(function (item) {
                    return item.slug != slug;
                });
                await WriteS3Bucket(
                    stories_promotionJson,
                    activePathS3["stories-promotion"] + ".json"
                );
            }
        }
    }

    async function WriteonTrendingNew(slug, templateTop) {
        //var mainCategory = activePathS3["category-index"] + $('#ddl_ddlcategory').val() + ".json";
        //var isExist = false;
        //var Index = "-1";

        //if (storyAlsoOn.indexOf(mainCategory) == -1) {
        //    const IsExists = await existsS3Bucket(mainCategory, "");
        //    if (IsExists.isExists) {
        //        var mainCategoryResult = await readS3BucketAsync(mainCategory, "");
        //        if (mainCategoryResult.err) { }
        //        else {
        //            var MainCategory = JSON.parse(mainCategoryResult.data);
        //            for (var i = 0; i < MainCategory.length; i++) {
        //                if (MainCategory[i].slug == templateTop.slug) {
        //                    isExist = true;
        //                    Index = i;
        //                    break;
        //                }
        //            }
        //            storyAlsoOn.push({ "chkbox": $('#ddl_ddlcategory').val(), "file": mainCategory, "isExist": isExist, "index": Index, "manual": true });
        //        }
        //    }
        //    else {
        //        storyAlsoOn.push({ "chkbox": $('#ddl_ddlcategory').val(), "file": mainCategory, "isExist": false, "index": "-1", "manual": true });
        //    }
        //}
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
                    if (storyAlsoOn[_index]["isExist"]) {
                        topJson[storyAlsoOn[_index]["index"]] = templateTop;
                    } else {
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
        $(priviousCategory).each(async function () {
            let category = this.toString();
            if (vddlCategory.indexOf(category) == -1) {
                const slugResult = await readS3BucketAsync(
                    activePathS3["category-index"] + category + ".json", "");
                if (slugResult.err) {
                } else {
                    let AllStory = JSON.parse(slugResult.data);
                    AllStory = AllStory.filter(function (data) { return data.slug != slug; });
                    await WriteS3Bucket(AllStory, activePathS3["category-index"] + category + ".json", function (tt) { });
                }
            }
        });
        priviousCategory = vddlCategory;
    };


    let saveOninstructor = async (templateTop) => {
        // debugger;
        // chk_consent_received
        // chk_show_contact
        let _instructor = $('#ddl_instructor').val();
        if (_instructor != "noinstructor") {
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
        if (filename != "NoOrganisation") {
            filename = $.trim(filename.toLowerCase()).replace(/ /g, "_");
            path = $.trim(path).replace(/ /g, "");
            var organisationData = [];
            const IsExists = await existsS3Bucket(`${activePathS3[path]}/${$.trim(filename)}.json`);
            if (IsExists.isExists) {
                try {
                    var submeta = await readS3BucketAsync(`${activePathS3[path]}/${$.trim(filename)}.json`, "");
                    if (submeta.err) {
                        console.log(submeta.err);
                    }
                    else {
                        organisationData = JSON.parse(submeta.data);
                    }
                }
                catch (e) {
                    console.log(e);
                }
            }
            if (organisationData == undefined) {
                organisationData = [];
            }
            let current_Story = organisationData.filter(function (data) { return data.slug == templateTop.slug; });
            if (current_Story != null && current_Story.length > 0) {
                const index = organisationData.findIndex(item => item.slug === templateTop.slug);
                if (index !== -1) {
                    organisationData[index] = templateTop;
                }
            }
            else {
                organisationData.push(templateTop);
            }

            await WriteS3Bucket(organisationData, `${activePathS3[path]}/${$.trim(filename)}.json`, function (tt) { });

        }


        var previousorganisationData = "";
        var previousorganisationJSONObj = "";
        // debugger;
        //remove from pervious organisation
        if (perviousOrganisation != "" && perviousOrganisation != undefined && perviousOrganisation.toLowerCase() != filename.toLowerCase()) {
            let currentlength = 0;
            const IsExists = await existsS3Bucket(`${activePathS3[path]}/${$.trim(perviousOrganisation)}.json`);
            if (IsExists.isExists) {
                try {
                    var preOrganisationsubmeta = await readS3BucketAsync(`${activePathS3[path]}/${$.trim(perviousOrganisation)}.json`, "");
                    if (preOrganisationsubmeta.err) {
                        console.log(preOrganisationsubmeta.err);
                    }
                    else {
                        previousorganisationData = JSON.parse(preOrganisationsubmeta.data);
                        previousorganisationJSONObj = previousorganisationData.filter(function (itm) {
                            return itm.slug != templateTop.slug;
                        });
                        currentlength = previousorganisationJSONObj.length;
                    }
                    if (previousorganisationJSONObj == undefined || previousorganisationData == "") {
                        previousorganisationJSONObj = [];
                    }
                    if (previousorganisationJSONObj != null && previousorganisationJSONObj.length > 0) {
                        var meta = await WriteS3Bucket1(previousorganisationJSONObj, `${activePathS3[path]}/${$.trim(perviousOrganisation)}.json`, function (tt) { });
                        console.log("Organisation removed from pervious file ");
                    }
                    else {
                        //case when pervious location having min story like les than 5 then  previousLocationJSONObj can be empty
                        if (currentlength < 5) {
                            if (previousorganisationJSONObj != null && previousorganisationJSONObj.length == 0) {
                                previousorganisationJSONObj = [];
                                var meta = await WriteS3Bucket1(previousorganisationJSONObj, `${activePathS3[path]}/${$.trim(perviousOrganisation)}.json`, function (tt) { });
                                console.log("Organisation removed from pervious file ");
                            }
                        }

                    }
                } catch (e) {
                    console.log(e);
                }
            }
        }

    }
    function slugify(text) {
        return text
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')  // Remove punctuation
            .trim()
            .replace(/\s+/g, '-');     // Replace spaces with hyphens
    }

    let saveOnTags_Location = async (templateTop, filename, path) => {
        if (path == "tags") {
            //individual tags
            filename = $.trim(filename.toLowerCase()).replace(/ /g, "_");
            path = $.trim(path).replace(/ /g, "");
            var tagData = [];
            const IsExists = await existsS3Bucket(`${activePathS3[path]}/${$.trim(filename)}.json`);
            if (IsExists.isExists) {
                try {
                    var submeta = await readS3BucketAsync(`${activePathS3[path]}/${$.trim(filename)}.json`, "");
                    if (submeta.err) {
                        console.log(submeta.err);
                    } else {
                        tagData = JSON.parse(submeta.data);
                    }
                } catch (e) {
                    console.log(e);
                }
            }
            if (tagData == undefined) {
                tagData = [];
            }
            var isTagExists = 0;
            if (tagData.length > 0) {
                isTagExists = tagData.filter(function (element) {
                    return element["slug"] == templateTop.slug;
                });
            }
            if (isTagExists == 0) {
                tagData.push(templateTop);
            }
            else {
                for (var i = 0; i < tagData.length; i++) {
                    if (tagData[i]["slug"] == templateTop.slug) {
                        tagData[i] = templateTop;
                        break;
                    }
                }
            }
            await WriteS3Bucket(tagData, `${activePathS3[path]}/${$.trim(filename)}.json`, function (tt) { });

        }
        if (path == "location") {
            // debugger;
            if (perviousLocation != "" && perviousLocation != undefined && perviousLocation != "Select Location" && perviousLocation != filename) {
                let currentlength = 0;
                const IsExists = await existsS3Bucket(`${activePathS3[path]}/${$.trim(perviousLocation)}.json`);
                if (IsExists.isExists) {
                    try {
                        var preLocationsubmeta = await readS3BucketAsync(`${activePathS3[path]}/${$.trim(perviousLocation)}.json`, "");
                        if (preLocationsubmeta.err) {
                            console.log(preLocationsubmeta.err);
                        }
                        else {
                            let previousLocationData = [];
                            previousLocationData = JSON.parse(preLocationsubmeta.data);
                            currentlength = previousLocationData.length;
                            previousLocationJSONObj = previousLocationData.filter(function (itm) {
                                return itm.slug != templateTop.slug;
                            });

                        }
                        if (previousLocationJSONObj == undefined) {
                            previousLocationJSONObj = [];
                        }
                        if (previousLocationJSONObj != null && previousLocationJSONObj.length > 0) {
                            var meta = await WriteS3Bucket1(previousLocationJSONObj, `${activePathS3[path]}/${$.trim(perviousLocation)}.json`, function (tt) { });
                            console.log("Location removed from pervious file ");
                        }
                        else {
                            //case when pervious location having min story like les than 5 then  previousLocationJSONObj can be empty
                            if (currentlength < 5) {
                                if (previousLocationJSONObj != null && previousLocationJSONObj.length == 0) {
                                    previousLocationJSONObj = [];
                                    var meta = await WriteS3Bucket1(previousLocationJSONObj, `${activePathS3[path]}/${$.trim(perviousLocation)}.json`, function (tt) { });
                                    console.log("Location removed from pervious file ");
                                }
                            }

                        }

                    } catch (e) {
                        console.log(e);
                    }
                }
            }
            let newlocationstory = [];
            var location = $('#ddl_location').find('option:selected').val();

            IsExists = await existsS3Bucket(activePathS3["location"] + "/" + location + ".json");
            if (IsExists.isExists) {
                var slugResult = await readS3BucketAsync(activePathS3["location"] + "/" + location + ".json", "");
                if (slugResult.err) {

                }
                else {
                    let AllStory = JSON.parse(slugResult.data);
                    //newlocationstory.push(AllStory);
                    let current_Story = AllStory.filter(function (data) { return data.slug == templateTop.slug; });
                    if (current_Story != null && current_Story.length > 0) {
                        const index = AllStory.findIndex(item => item.slug === templateTop.slug);
                        if (index !== -1) {
                            AllStory[index] = templateTop;
                        }
                    }
                    else {

                        AllStory.push(templateTop);
                        await WriteS3Bucket(AllStory, activePathS3["location"] + "/" + location + ".json", function (tt) { });
                    }
                }
            }
            else {
                newlocationstory.push(templateTop);
                await WriteS3Bucket(newlocationstory, activePathS3["location"] + "/" + location + ".json", function (tt) { });

            }
        }
    }

})();
