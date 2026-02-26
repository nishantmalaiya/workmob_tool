const fs = require("fs");
const path = require("path");
let pathName = "C:\\WM_Json";
var remote = require("electron").remote;
var session = require("electron").remote.session;
var app = require("electron").remote.app;
var ipcRenderer = require("electron").ipcRenderer;

const dialog = remote.dialog;
let common = require("../js/config");
let activePathS3 = common.getS3Path();

let userid='';
const topProduct_Json='topownerproducts.json';
const productMaster_Json='ProductMaster.json';
let _masterCategory = [];
let _subcategoryList = [];
var Need_subCategory_in = ["product"];
var masterCategory = "";
var type = remote.getGlobal("sharedObj").currentStory;


// let pagename='productdetail';



ipcRenderer.on("receiveSlug", (event, arg) => {
    console.log(arg);
    userid = arg.slug;
    pagecategory= arg.category;
    GetproductdetailList();
    GetCategoryList();
});

async function GetproductdetailList() {
    $("body").toggleClass("loaded");
    let productdetailList = [];
    let meta = await readS3BucketAsync(activePathS3["productPath"] + topProduct_Json,"");
    $("body").toggleClass("loaded");
    if (meta.err) {
        $("#divproductdetail").html("");
        return console.log(meta.err);
    }
    $("#divproductdetail").html(renderHeader());
    if(meta.data.length>0)
    {
        productdetailList = JSON.parse(meta.data);
    }
    if(productdetailList.length>0)
    {   
        var topproductownerdetail= productdetailList.filter(function (elem) {
            return elem["user_id"] == userid;
        });
        if(topproductownerdetail.length>0)
        {
            await Renderproductdetail(topproductownerdetail);
        }
    }
    
    
}

async function GetCategoryList() {
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
        $("#ddl_ddlcategory").html(element.join(" "));
        if (Need_subCategory_in.indexOf(type) == -1) {
            if (masterCategory != "") { $("#ddl_ddlcategory").val(masterCategory); }
            $("#ddl_ddlcategory").attr("multiple", "multiple");
            $("#ddl_ddlcategory").addClass("multiple-select");
            $("#ddl_ddlcategory").multipleSelect({
                filter: true,
                width: "100%",
                placeholder: $(this).attr("Select Category"),
            });
            var selectize = $select[0].selectize;
            selectize.disable();
        }
    }
}
function renderHeader() {
    var storyCard = "";
    storyCard = '<div class="storycardheader col-md-12 row">';
    storyCard = storyCard + '<div class="col-md-1"><h4>#</h4></div>';
    storyCard = storyCard + '<div class="col-md-1"><h4></h4></div>';
    storyCard = storyCard + '<div class="col-md-1"><h4>Id</h4></div>';
    storyCard = storyCard + '<div class="col-md-3"><h4>Name</h4></div>';
    // storyCard = storyCard + '<div class="col-md-2"><h4>Video</h4></div>';
    // storyCard = storyCard + '<div class="col-md-2"><h4>Video Thumb</h4></div>';
    storyCard = storyCard + '<div class="col-md-2"><h4>Owner Id</h4></div>';
    storyCard = storyCard + '<div class="col-md-1"><h4>Price</h4></div>';
    storyCard = storyCard + '<div class="col-md-1"></div>';
    storyCard = storyCard + '<div class="col-md-1"></div>';
    storyCard = storyCard + '<div class="col-md-1"></div>';
    storyCard = storyCard + "<hr></div>";
    return storyCard;
}



$("#btnSave").on("click",function () {
  
    validation(async function (cansave) 
    {
        if (cansave.cansave) 
        {
            var finalJson = [];
            $("body").toggleClass("loaded");
            var mobile_no=$.trim($("#ddl_productowner").val());

            var productmaster_item = {
                user_id: $.trim($("#ddl_productowner").val()),
                name:"",
                job_title:"",
                company_name: "",
                location:"",
                mobile_no: $.trim($("#ddl_productowner").val()),
                productId: $.trim($("#txtProductId").val()),
                productName: $.trim($("#txtProductName").val()),
                productVideo: $.trim($("#txtProductVideo").val()),
                productVideoThumb: $.trim($("#txtProductVideoThumb").val()),
                price: $.trim($("#txtProductPrice").val()),
                productMasterCategories:$.trim($("#ddl_ddlcategory").val()),
                productSubCategories:""//$.trim($("#ddl_sub_categories").val()),
            };
            let instructor_meta = await readS3BucketAsync(activePathS3["instructorPath"]+productmaster_item["mobile_no"]+".json", "");
            if(instructor_meta.data.length>0)
            {
                productownerdetail = JSON.parse(instructor_meta.data);
                   
            }

            if(productownerdetail!=null)
            {
                productmaster_item["name"]=  productownerdetail.name;
                productmaster_item["job_title"]=  productownerdetail.job_title;
                productmaster_item["company_name"]=  productownerdetail.company_name;
                productmaster_item["location"]=  productownerdetail.location;
            }
            
             //#region productMaster
            let RawproductownerJson = await readS3BucketAsync(activePathS3["productPath"]+ productMaster_Json,"");
             await  saveOnProductMaster(RawproductownerJson,productmaster_item,$("#hdnproductid").val());
            //#endregion
         
        
            //#region Instructor
            var topownerproductitem = {
                productId: $.trim($("#txtProductId").val()),
                productName: $.trim($("#txtProductName").val()),
                productVideo: $.trim($("#txtProductVideo").val()),
                productVideoThumb: $.trim($("#txtProductVideoThumb").val()),
                price: $.trim($("#txtProductPrice").val()),
                masterCategories:$.trim($("#ddl_ddlcategory").val()),
                subCategories:""//$.trim($("#ddl_sub_categories").val())
                };
                // let InstructormetaJson = await readS3BucketAsync(activePathS3["instructor"], "");
              await  saveOninstructor(topownerproductitem,mobile_no);
           //#endregion

           //#region topOwnerProduct 
                var topownerproductitem = {
                id: $.trim($("#txtProductId").val()),
                name: $.trim($("#txtProductName").val()),
                video: $.trim($("#txtProductVideo").val()),
                videoThumb: $.trim($("#txtProductVideoThumb").val()),
                price: $.trim($("#txtProductPrice").val()),
                masterCategories:$.trim($("#ddl_ddlcategory").val()),
                subCategories:""//$.trim($("#ddl_sub_categories").val())
                };
                
                let rawTopOwnerProductJson = await readS3BucketAsync(activePathS3["productPath"]+topProduct_Json,"");
                finalJson=await  saveOnTopProduct(rawTopOwnerProductJson,mobile_no,topownerproductitem);
           //#endregion

            $("body").toggleClass("loaded");
            const options = { title: "", message: "product saved successfully", detail: "" };
            try 
            {
                dialog.showMessageBox(null, options);
            } catch (e) 
            {
                console.log(e);
                dialog.showMessageBox(null, options);
            }
            clearInputs();
            $("body").toggleClass("loaded");
            $("#divproductowner").html("");
            $("#divproductowner").html(renderHeader());
            await Renderproductdetail(finalJson)
            $("#divModel").modal("hide");
            $("body").addClass("loaded");   
            return false;
        } 
        else 
        {
            alert(cansave.msg);
            return false;
        }

        
    });
    return false;
});

async function Renderproductdetail(topproductowner) {
    $("body").toggleClass("loaded");
    $(".productdetailList").remove();
    let Savedproductdetail = [];
    let productowneridlist = [];
    let count = 0;
    if(topproductowner!=[] && topproductowner[0]!=null)
    {
        topproductownerdetail=topproductowner[0].product;
            $(topproductownerdetail).each(function () {
                count = count + 1;
                    
                    Savedproductdetail.push(`<div class="productdetailList col-md-12 row column" name="productdetail" id="${this.id}">
                    <div class=\"col-md-1\">${count}</div>
                    <div class="col-md-1"><img class="storythumb" src="${this.videoThumb}" ></div>
                    <div class=\"col-md-1\"><h5>${this.id}</h5></div>
                    <div class=\"col-md-3\"><h5>${this.name}</h5></div>
                    <div class=\"col-md-2\"><h5>${topproductowner[0].mobile_no}</h5></div>
                    <div class=\"col-md-1\"><h5>${this.price}</h5></div>
                    <div class=\"col-md-1\"><a href=\"#\" data-toggle=\"modal\" data-target=\"#delete-file-modal\" onclick=\"editproductdetail('${this.id}','${topproductowner[0].user_id}','${topproductowner[0].name}')\">Edit</a></div>
                    <div class=\"col-md-1\"><a href=\"#\" data-toggle=\"modal\" data-target=\"#delete-file-modal\" onclick=\"showproductdetail('${this.id}','${topproductowner[0].user_id}','${topproductowner[0].name}')\">Detail</a></div>
                    <div class=\"col-md-1\"><a href=\"#\" onclick=\"deleteproductdetail('${this.id}','${topproductowner[0].user_id}',this)\">Delete</a></div>
                    </div>`);
            });
            $("#divproductdetail").append(Savedproductdetail.join(" "));
    }
    
  
    $("body").toggleClass("loaded");
}

async function deleteproductdetail(ProductId, Userid,_self) {
    
    
    let _currenttopproductowner;
    let _currentproductowner;
    if(confirm("Are you sure you want to delete this?")) {
        $("body").toggleClass("loaded");
        $(_self).closest(".storycard").remove();
        var productownerList;
       
        let RawproductownerJson = await readS3BucketAsync(activePathS3["productPath"]+topProduct_Json, "");
        if (RawproductownerJson.err) {
            console.log(RawproductownerJson.err);
            return false;
        } 
        else 
        {
            _currenttopproductowner = JSON.parse(RawproductownerJson.data);
        }
    
        var topproductownerdetail= _currenttopproductowner.filter(function (elem) {
            return elem["user_id"] == Userid;
        });
        if(topproductownerdetail.length>0)
        {
            var AfterDeleteProduct = topproductownerdetail[0].product.filter(function (item) {
                return item.id != ProductId;
            });
            if (AfterDeleteProduct.length > 0) {
                topproductownerdetail[0].product=AfterDeleteProduct;
                
                for (let index = 0; index < _currenttopproductowner.length; index++) {
                        const element = _currenttopproductowner[index];
                            if (element.user_id == Userid) 
                            {
                                _currenttopproductowner[index] = topproductownerdetail[0];
                                topproductownerdetail=_currenttopproductowner;
                                break;
                            } 
                }
            }
            else
            {
                var topproductownerdetail= _currenttopproductowner.filter(function (elem) {
                    return elem["user_id"] != Userid;
                });
                if(topproductownerdetail.length<=0)
                {

                    topproductownerdetail=[];
                }

            }
        }
        else
        {
           
            topproductownerdetail=[];
        }

        const SaveResponce = await WriteS3Bucket(
            topproductownerdetail,
            `${activePathS3["productPath"]}`+topProduct_Json
        );
        console.log(SaveResponce);             
            $("body").toggleClass("loaded");
            
            $("#divproductdetail").html("");
            $("#divproductdetail").html(renderHeader());
        if(topproductownerdetail!=[])
            await Renderproductdetail(topproductownerdetail);
            $("body").addClass("loaded");
    
    } 
    else {
        return false;
    }
}



function clearInputs() {
    $("#txtProductId").val("");
    $("#txtProductName").val("");
    $("#txtProductVideo").val("");
    $("#txtProductVideoThumb").val("");
    $("#txtProductOwnerId").val("");
    $("#txtProductPrice").val("");
    $("#hdnproductid").val("");
    $("#hdnuser_id").val("");
    $("#divModel").find("#txtProductId").attr("disabled", false);
}

$("#btnClose").on("click",function () {
    $("#divModel").modal("hide");
});

async function editproductdetail(ProductId,Userid,Name) {
    let _currenttopproductowner;
    let _currentproductowner;
    $("#btnSave").hide();
    $("#divModel #ddl_productowner").html('<option value="' + Userid+ '">' + Name + ' - '  +Userid+ " </option>")
    $("#divModel #ddl_productowner").selectize({
        sortField: 'text',
        maxOptions:100000
        
    });
    $("#divModel #ddl_productowner").attr("disabled",true);

    let RawproductownerJson = await readS3BucketAsync(activePathS3["productPath"]+topProduct_Json, "");
    if (RawproductownerJson.err) {
        console.log(RawproductownerJson.err);
        return false;
    } 
    else 
    {
        _currenttopproductowner = JSON.parse(RawproductownerJson.data);
    }

    var topproductownerdetail= _currenttopproductowner.filter(function (elem) {
        return elem["user_id"] == Userid;
    });
    if(topproductownerdetail.length>0)
    {
        _currentproductowner = topproductownerdetail[0].product.filter(function (item) {
            return item.id == ProductId;
        });
    }
    if (_currentproductowner.length > 0) {
        // _currentproductowner = _currentproductowner[0].product;
         
          $("#divModel").find(".modal-title").text("Product Detail");
          $("#divModel").find("#txtProductId").val(_currentproductowner[0]["id"]).attr("disabled", true);
          $("#divModel").find("#txtProductName").val(_currentproductowner[0]["name"]).attr("readonly", false);
          $("#divModel").find("#txtProductVideo").val(_currentproductowner[0]["video"]).attr("readonly", false);
          $("#divModel").find("#txtProductVideoThumb").val(_currentproductowner[0]["videoThumb"]).attr("readonly", false);
         
          $("#divModel").find("#txtProductPrice").val(_currentproductowner[0]["price"]).attr("readonly", false);
          $("#divModel").find("#ddl_ddlcategory").val(_currentproductowner[0]["masterCategories"]).attr("readonly", true);
           $("#hdnUser_id").val(Userid);
          $("#hdnproductid").val(ProductId);
          $("#divModel").modal("show");
          $("#btnSave").show();
          //chkTopProduct
      }
}

let saveOnProductMaster= async (RawproductownerJson,item,hdnproductid) => 
{
    var finalJson=[];
    if (RawproductownerJson.err) {
        console.log(RawproductownerJson.err);
    }
    else
    {
        if(RawproductownerJson.data.length>0)
        {
                finalJson = JSON.parse(RawproductownerJson.data);
                if(finalJson.length>0)
                {   
                    if(hdnproductid!="")
                    {
                        for (let index = 0; index < finalJson.length; index++) {
                            const element = finalJson[index];
                            if (element.productId == hdnproductid && element.mobile_no == item.mobile_no) {
                                finalJson[index] =item;
                                break;
                            }
                        }
                    }
                    else
                    {
                    
                        finalJson.push(item);
                    }
                }
                else
                {
                    finalJson = [item];
                }
        }
        else
        {
            finalJson = [item];

        }    
        await WriteS3Bucket(
            finalJson,
            `${activePathS3["productPath"]}`+productMaster_Json
        );
    }
    
}
let  saveOnTopProduct= async (rawTopOwnerProductJson,mobile_no,topownerproductitem) => 
{
    var topOwnerProductJson ='';
    var returntopProductowner=[];
    var finalJson =[];
    if (rawTopOwnerProductJson.err) {
         console.log(topOwnerProductJson.err);
    } 
    
    if(rawTopOwnerProductJson.data!=null && rawTopOwnerProductJson.data.length>0)
    {
            finalJson = JSON.parse(rawTopOwnerProductJson.data);
            if(finalJson.length>0)
            {
                 topProductowner=finalJson.filter(function (elem)
                {
                    return  elem.mobile_no==mobile_no;
                });
                returntopProductowner=topProductowner;
                if(topProductowner.length>0)
                {
                    var topProductowner_product=topProductowner[0];
                
                    var IsProductExists = topProductowner_product["product"].filter(function (item) {
                        return item.id == topownerproductitem.id;
                    });
            
                    if(IsProductExists.length>0)
                    {
                        for (let index = 0; index < topProductowner_product["product"].length; index++) {
                            const element = topProductowner_product["product"][index];
                            if (element.id == topownerproductitem.id) 
                            {
                                topProductowner_product["product"][index] = topownerproductitem;
                                topProductowner=topProductowner_product;
                                break;
                            }
                        }
                    
                    
                            //this for replacing at that owners position
                            for (let index = 0; index < finalJson.length; index++) {
                                const element = finalJson[index];
                                if (element.mobile_no == mobile_no) 
                                {
                                    finalJson[index] = topProductowner;
                                    break;
                                }
                            }
                            returntopProductowner.product=topProductowner;
                    }
                    await WriteS3Bucket(
                        finalJson,
                            `${activePathS3["productPath"]}`+topProduct_Json
                    ); 
                }

            }
    }
    return returntopProductowner;
}

let saveOninstructor = async (templateTop,_instructor) => 
{
    if (_instructor != "noinstructor") {
       
        let instructorDetail = null;
        var submeta = await readS3BucketAsync(`${activePathS3["instructorPath"]}${_instructor}.json`, "");
        if (submeta.err) {
            console.log(submeta.err);
        } else {
            instructorDetail = JSON.parse(submeta.data);
        }
        console.log(instructorDetail);
        if (instructorDetail["product"] == undefined) {
            instructorDetail["product"] = [];
        }

        var IsSlugExists = instructorDetail["product"].filter(function (item) {
            return item.productId == templateTop.productId;
        });

        if (IsSlugExists.length == 0) {
            instructorDetail["product"].push(templateTop);
        }
        else 
        {
            for (let index = 0; index < instructorDetail["product"].length; index++) {
                const element = instructorDetail["product"][index];
                if (element.productId == templateTop.productId) 
                {
                    instructorDetail["product"][index] = templateTop;
                    break;
                }
            }
        }
        await WriteS3Bucket(instructorDetail, `${activePathS3["instructorPath"]}${_instructor}.json`, function (tt) { });
        // }
    }
}


async function showproductdetail(ProductId,Userid,Name) {
    let _currentproductowner;
    let _currenttopproductowner;
    let RawproductownerJson = await readS3BucketAsync(activePathS3["productPath"]+topProduct_Json, "");
    $("#divModel #ddl_productowner").html('<option value="' + Userid+ '">' + Name + ' - '  +Userid+ " </option>") 
    $("#divModel #ddl_productowner").selectize({
        sortField: 'text',
        maxOptions:100000
        
    });
    $("#divModel #ddl_productowner").attr("disabled",true);
    
    if (RawproductownerJson.err) {
        console.log(RawproductownerJson.err);
        return false;
    } 
    else 
    {
        _currenttopproductowner = JSON.parse(RawproductownerJson.data);
    }

    var topproductownerdetail= _currenttopproductowner.filter(function (elem) {
        return elem["user_id"] == Userid;
    });
    if(topproductownerdetail.length>0)
    {
        _currentproductowner = topproductownerdetail[0].product.filter(function (item) {
            return item.id == ProductId;
        });
    }
    if (_currentproductowner.length > 0) {
      //  _currentproductowner = _currentproductowner[0].product;
       
        $("#divModel").find(".modal-title").text("Product Detail");
        $("#divModel").find("#txtProductId").val(_currentproductowner[0]["id"]).attr("readonly", true);
        $("#divModel").find("#txtProductName").val(_currentproductowner[0]["name"]).attr("readonly", true);;
        $("#divModel").find("#txtProductVideo").val(_currentproductowner[0]["video"]).attr("readonly", true);;
        $("#divModel").find("#txtProductVideoThumb").val(_currentproductowner[0]["videoThumb"]).attr("readonly", true);
      
        $("#divModel").find("#txtProductPrice").val(_currentproductowner[0]["price"]).attr("readonly", true);
        $("#divModel").find("#ddl_ddlcategory").val(_currentproductowner[0]["masterCategories"]).attr("readonly", true);
        
        
         $("#hdnUser_id").val(Userid);
        $("#hdnproductid").val(ProductId);
        $("#divModel").modal("show");
        $("#btnSave").hide();
        //chkTopProduct
    }
}



async function validation(cb) {
    var cansave = true;
    var msg = "";
    var item = {
        user_id: $.trim($("#ddl_productowner").val()),
        mobile_no: $.trim($("#ddl_productowner").val()),
        productId:$.trim($("#txtProductId").val()),
        productName:$.trim($("#txtProductName").val()),
        productVideo:$.trim($("#txtProductVideo").val()),
        productVideoThumb: $.trim($("#txtProductVideoThumb").val()),
        price: $.trim($("#txtProductPrice").val()),

    };
    if (item["productId"] == "" && cansave) {
        msg = "Please Enter Product Id.";
        cansave = false;
        $("#txtProductId").focus();
    }
    if (item["productName"] == "" && cansave) {
        msg = "Please Enter Product Name.";
        cansave = false;
    }
    if (item["productVideo"] == "" && cansave) {
        msg = "Please Enter Video Url.";
        cansave = false;
    }
    if (item["productVideoThumb"] == "" && cansave) {
        msg = "Please Enter Video Thumb.";
        cansave = false;
    }
    if (item["mobile_no"] == "" && cansave) {
        msg = "Please Select Product OwnerId.";
        cansave = false;
    }
    if (item["price"] == "" && cansave) {
        msg = "Please Enter Product Price.";
        cansave = false;
    } else if (item["price"] != "" && cansave)
    {
        var pattern = /^(\d*([.,](?=\d{3}))?\d+)+((?!\2)[.,]\d\d)?$/;
        if (!pattern.test(item["price"])) {
            msg = "Please Enter Valid Product Price: " + item["price"];
            cansave = false;
        }
    }
    // if (cansave) {
    //     let RawproductownerJson = await readS3BucketAsync(`${activePathS3["productPath"]}`+productMaster_Json,"");
    //     if (RawproductownerJson.err) {
    //         console.log(RawproductownerJson.err);
    //     } 
    //     else 
    //     {
    //         let instructor_meta = await readS3BucketAsync(activePathS3["instructor"]+item.mobile_no+".json", "");
    //         if(instructor_meta.data.length>0)
    //         {
    //             productownerdetail = JSON.parse(instructor_meta.data);
    //                 // if(instructorJson.length>0)
    //                 // {
    //                 //     var productownerdetail=instructorJson.filter(function (elem)
    //                 //     {
    //                 //         return  elem.mobile_no==item["mobile_no"];
    //                 //     });
                    
    //                 // }
    //         }

    //         if(productownerdetail.length>0)
    //         {
    //             item["name"]=  productownerdetail[0].name;
    //             item["job_title"]=  productownerdetail[0].job_title;
    //             item["company_name"]=  productownerdetail[0].company_name;
    //             item["location"]=  productownerdetail[0].location;
    //             item.story=productownerdetail[0].story;
    //             item.product=productownerdetail[0].product;
    //             item.audio=productownerdetail[0].audio;
    //             item.gyan=productownerdetail[0].gyan;
    //             item.hope=productownerdetail[0].hope;
    //             item.namaste=productownerdetail[0].namaste;
    //             item.name_hindi=productownerdetail[0].name_hindi;
    //             item.job_title_hindi=productownerdetail[0].job_title_hindi;
    //             item.company_name_hindi=productownerdetail[0].company_name_hindi;
    //             item.location_hindi=productownerdetail[0].location_hindi;
    //             item.allow_go_live=productownerdetail[0].allow_go_live;
    //             item.live_profile_pic_card=productownerdetail[0].live_profile_pic_card;
    //             item.user_name=productownerdetail[0].user_name;
    //         }
    //         else
    //         {
    //             cansave = false;
    //         }

    //     }      

    // }
            var result = {
                cansave: cansave,
                msg: msg
            };
            cb(result);
}
