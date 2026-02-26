const fs = require("fs");
const path = require("path");
let pathName = "C:\\WM_Json";
var remote = require("electron").remote;
var session = require("electron").remote.session;
var app = require("electron").remote.app;
var ipcRenderer = require("electron").ipcRenderer;
const dialog = remote.dialog;
let common = require("../js/config");

const topProduct_Json='topownerproducts.json';
let activePathS3 = common.getS3Path();
getTopOwnerProductList();


async function getTopOwnerProductList() {
    // const SaveResponce = await WriteS3Bucket(
    //     [],
    //     `${activePathS3["productPath"]}`+ topProduct_Json
    // );
    // let topOwnerList = [];
    $("body").toggleClass("loaded");
    let meta = await readS3BucketAsync(activePathS3["productPath"]+topProduct_Json,"");
    $("body").toggleClass("loaded");
    if (meta.err) {
        $("#divtopOwner").html("");
        return console.log(meta.err);
    }
  //  $("#divtopOwner").html(renderHeader());
    // topOwnerList = JSON.parse(meta.data);
    await renderTopOwnerProduct(JSON.parse(meta.data));
}


async function renderTopOwnerProduct(topOwner) {
    $("body").toggleClass("loaded");
    $(".topOwnerList").remove();
    let SavedtopOwner = [];
    let count = 0;
    if(topOwner!=[])
    {
        $(topOwner).each(function () {
            count = count + 1;
                SavedtopOwner.push(`<div class="storycard col-md-12 row column" name="topOwner" id="${this.user_id}">
                <div class=\"col-md-1\">${count}</div>
                <div class=\"col-md-7\"><h4>${this.name}</h4>${this.job_title}</div>
                <div class=\"col-md-2\"><h5>${this.location}</h5></div>
                <div class=\"col-md-1\"><a name=\"Detail\" href=\"#\" data-id=${this.user_id}>Detail</a></div>
                <div class=\"col-md-1\"><a name=\"Delete\" href=\"#\" onclick=\"deletetopOwner('${this.user_id}',this)\" data-id=\'${this.user_id}'\" >Delete</a></div>
                <hr class=\"storyHr\"></div>`);
        });
    }
    $("#divtopOwner").append(SavedtopOwner.join(" "));
    $("body").toggleClass("loaded");
}

async function deletetopOwner(user_id, _self) {

    if (confirm("Are you sure you want to delete this?")) {
        $("body").toggleClass("loaded");
        $(_self).closest(".storycard").remove();
        var topOwnerList;
        let meta = await  readS3BucketAsync(activePathS3["productPath"]+ topProduct_Json,"");
        if (meta.err) {
            console.log(meta.err);
            return false;
        } else {
            topOwnerList = JSON.parse(meta.data);
        }
        if(topOwnerList!=null)
        {
            topOwnerList = topOwnerList.filter(function (elem) {
                return elem["user_id"] != user_id;
            });

            if(topOwnerList!=null && topOwnerList.length<=0)
            {

                topOwnerList=[];
            }
        
            const SaveResponce = await WriteS3Bucket(
                topOwnerList,
                `${activePathS3["productPath"]}`+topProduct_Json
            );
            console.log(SaveResponce);
        }

       
        
        
        $("#divtopOwner").html("");
        $("body").toggleClass("loaded");
        if(topOwnerList!=[])
        {
            await renderTopOwnerProduct(topOwnerList);
        }
        $("body").addClass("loaded");
    } else {
        return false;
    }
}

$('#divtopOwner').on('click', 'a[name="Detail"]', function () {
    var slug = $(this).attr('data-id');
    Model("pages/topproductdetail.html", slug);
});

function Model(pagename, slug) {
    let data = { "slug": slug, "pagename": pagename, "category": "topproduct" };
    ipcRenderer.send('input-broadcast', data);
}

$("#btnClose").click(function () {
    $("#divModel").modal("hide");
});


