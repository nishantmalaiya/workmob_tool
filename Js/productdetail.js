const fs = require("fs");
const path = require("path");
let pathName = "C:\\WM_Json";
var remote = require('@electron/remote');
var session = remote.session;
var app = remote.app;
var ipcRenderer = require("electron").ipcRenderer;

const dialog = remote.dialog;
 let common = require("../js/config");
// let common = require("./config");
let activePathS3 = common.getS3Path();

let userid='';
let pagecategory='';

const pagecategory_Productowner='productowner';

const productMaster_Json='ProductMaster.json';
const topProduct_Json='topownerproducts.json';
const productowners_Json='productownersdetail.json';
let _masterCategory = [];
let _subcategoryList = [];
var Need_subCategory_in = ["product"];
var masterCategory = "";
var type = remote.getGlobal("sharedObj").currentStory;


async function GetUserList() {
    var InstructorList = await readS3BucketAsync(activePathS3["instructor"], "");

    if (InstructorList.err) {
        return console.log(RawJson.err);
    } else {
        JSON_Obj = JSON.parse(InstructorList.data);
        var productownerList = [];
        for (var i = 0; i < JSON_Obj.length; i++) 
        {
            var _instructor = JSON_Obj[i];
            if( _instructor.user_id==userid)
            productownerList.push('<option value="' + _instructor.user_id + '">' + _instructor.name + ' - '  +_instructor.mobile_no+ " </option>");         
        }
        $("#divModel #ddl_productowner").html(productownerList.join(" "));
        $select=$("#divModel #ddl_productowner").selectize({
            sortField: 'text',
            maxOptions:100000,
            placeholder:"Choose Product Owner"
        });
        var selectize = $select[0].selectize;
        selectize.disable();
    }
}

ipcRenderer.on("receiveSlug", (event, arg) => {
    console.log(arg);
    userid = arg.slug;
    pagecategory= arg.category;
    GetproductdetailList();
    GetCategoryList();
    // GetSubcategoryList();
});

async function GetproductdetailList() {
    let productdetailList = [];
    $("body").toggleClass("loaded");
    let meta = await readS3BucketAsync(activePathS3["productPath"] + productMaster_Json,"");
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
async function GetSubcategoryList() {
    // debugger;
     var submeta = await readS3BucketAsync(activePathS3["subcategory"], "");
     if (submeta.err) {
         console.log(submeta.err);
     } else {
         _subcategoryList = JSON.parse(submeta.data);
     }
 }


 
//  $("body").on("change", "#ddl_ddlcategory", async function () {
//     if (Need_subCategory_in.indexOf(type) != -1) {
//         var selectedcate = $(this).val();
//         let subcategory = _subcategoryList.filter(scat => scat["Category"] == selectedcate);
//         var element = [];
//         for (var i = 0; i < subcategory.length; i++) {
//             var _subcategory = subcategory[i];
//             element.push('<option value="' + _subcategory.sub_category + '">' + _subcategory.title + " </option>");
//         }
//         $("#ddl_sub_categories").html(element.join(" "));
//         $("#ddl_sub_categories").attr("multiple", "multiple");
//         $("#ddl_sub_categories").addClass("multiple-select");
//         $("#ddl_sub_categories").multipleSelect({
//             filter: true,
//             width: "100%",
//             placeholder: $(this).attr("Select sub Category"),
//             onchange: function (e) {
//                 console.log(e);
//             },
//         });
//     }
// });

function renderHeader() {
    var storyCard = "";
    storyCard = '<div class="storycardheader col-md-12 row">';
    storyCard = storyCard + '<div class="col-md-1"><h4>#</h4></div>';
    storyCard = storyCard + '<div class="col-md-1"><h4></h4></div>';
    storyCard = storyCard + '<div class="col-md-1"><h4>Id</h4></div>';
    storyCard = storyCard + '<div class="col-md-3"><h4>Name</h4></div>';
    storyCard = storyCard + '<div class="col-md-2"><h4>Owner Id</h4></div>';
    storyCard = storyCard + '<div class="col-md-1"><h4>Price</h4></div>';
    storyCard = storyCard + '<div class="col-md-1"></div>';
    storyCard = storyCard + '<div class="col-md-1"></div>';
    storyCard = storyCard + '<div class="col-md-1"></div>';
    storyCard = storyCard + "<hr></div>";
    return storyCard;
}



async function Renderproductdetail(productowner) {
    $("body").toggleClass("loaded");
    $(".productdetailList").remove();
    let Savedproductdetail = [];
    let productowneridlist = [];
    let count = 0;
   
        $(productowner).each(function () {
            count = count + 1;
            if (userid!='' && this.user_id == userid) 
            {
                Savedproductdetail.push(`<div class="productdetailList col-md-12 row column" name="productdetail" id='${this.productId}'>
                <div class=\"col-md-1\">${count}</div>
                <div class="col-md-1"><img class="storythumb" src="${this.productVideoThumb}" ></div>
                <div class=\"col-md-1\"><h5>${this.productId}</h5></div>
                <div class=\"col-md-3\"><h5>${this.productName}</h5></div>
                <div class=\"col-md-2\"><h5>${this.mobile_no}</h5></div>
                <div class=\"col-md-1\"><h5>${this.price}</h5></div>
                <div class=\"col-md-1\"><a href=\"#\" data-toggle=\"modal\" data-target=\"#delete-file-modal\" onclick=\"editproductdetail('${this.productId}','${this.user_id}','${this.name}')\">Edit</a></div>
                <div class=\"col-md-1\"><a href=\"#\" data-toggle=\"modal\" data-target=\"#delete-file-modal\" onclick=\"showproductdetail('${this.productId}','${this.user_id}','${this.name}')\">Detail</a></div>
                <div class=\"col-md-1\"><a href=\"#\" onclick=\"deleteproductdetail('${this.productId}','${this.user_id}',this)\">Delete</a></div>
                </div>`);
        }
        });
    $("#divproductdetail").append(Savedproductdetail.join(" "));
  
    $("body").toggleClass("loaded");
}

async function deleteproductdetail(ProductId, userid,_self) 
{
    if (confirm("Are you sure you want to delete this?")) 
    {
        var AfterDeleteProduct=[];
        $("body").toggleClass("loaded");
        // debugger; 
        $(_self).closest(".storycard").remove();
        var productownerList;
        
        //#region deleteproductMaster
        let meta = await readS3BucketAsync(activePathS3["productPath"]+ productMaster_Json, "");
        AfterDeleteProduct =await  deleteOnProductMaster(meta,ProductId,userid);
        //#endregion
        
         //#region deleteOnInstructor
        if (userid != "noinstructor") 
        {
            let instructorDetail = null;
            var submeta = await readS3BucketAsync(`${activePathS3["instructorPath"]}${userid}.json`, "");
            await  deleteOnInstructor(submeta,ProductId,userid);
        }
         //#endregion

        //top product removal
        let _currenttopproductowner;
        let rawTopOwnerProductJson = await readS3BucketAsync(activePathS3["productPath"]+topProduct_Json,"");
        await  deleteOnTopProduct(rawTopOwnerProductJson,ProductId,userid);
        //#endregion

         //#region deleteproductOwnerdetails
         let metaproductownersdetail = await readS3BucketAsync(activePathS3["productPath"]+ productowners_Json, "");
         await  deleteOnProductOwnersDetail(metaproductownersdetail,ProductId,userid);
         //#endregion
       
        $("body").toggleClass("loaded");
        $("#divproductdetail").html("");
        $("#divproductdetail").html(renderHeader());
        await Renderproductdetail(AfterDeleteProduct);
       
       
    } 
    else 
    {
        return false;
    }
}
$("#btnSave").on("click",function () {
  
    validation(async function (cansave) 
    {
       
        if (cansave.cansave) 
        {
            $("body").toggleClass("loaded");
            var finalJson = [];
            var mobile_no=$.trim($("#ddl_productowner").val());

            var productownerdetail;
            
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
                finalJson = await  saveOnProductMaster(RawproductownerJson,productmaster_item,$("#hdnproductid").val());
                //#endregion
              

            //#region Instructor
            var instructoritem = {
                id: $.trim($("#txtProductId").val()),
                name: $.trim($("#txtProductName").val()),
                video: $.trim($("#txtProductVideo").val()),
                videoThumb: $.trim($("#txtProductVideoThumb").val()),
                price: $.trim($("#txtProductPrice").val()),
                masterCategories:$.trim($("#ddl_ddlcategory").val()),
                subCategories:""//$.trim($("#ddl_sub_categories").val())
                };
              await  saveOninstructor(instructoritem,mobile_no);
           //#endregion

           //#regiontopOwnerProduct 
           
           let rawTopOwnerProductJson = await readS3BucketAsync(activePathS3["productPath"]+topProduct_Json,"");
          
           var owner=
           {
               "user_id":'',
               "name":'',
               "job_title":'',
               "company_name":'',
               "location":'',
               "mobile_no":'',
               "story":[],
               "product":[],
               "audio":[],
               "gyan": [],
               "hope": [],
               "namaste": [],
               "name_hindi": "",
               "job_title_hindi": "",
               "company_name_hindi": "",
               "location_hindi": "",
               "allow_go_live": "",
               "live_profile_pic_card": "",
               "user_name": "",
           }

           var topownerproductitem = {
            id: $.trim($("#txtProductId").val()),
            name: $.trim($("#txtProductName").val()),
            video: $.trim($("#txtProductVideo").val()),
            videoThumb: $.trim($("#txtProductVideoThumb").val()),
            price: $.trim($("#txtProductPrice").val()),
            masterCategories:$.trim($("#ddl_ddlcategory").val()),
            subCategories:"" //$.trim($("#ddl_sub_categories").val())
            };
           
            let rawInstructorDetailJson = await readS3BucketAsync(activePathS3["instructorPath"]+mobile_no+".json","");
           var productinstructordetail = JSON.parse(rawInstructorDetailJson.data);
           
           owner.user_id=productinstructordetail.user_id;
           owner.name=productinstructordetail.name;
           owner.job_title=productinstructordetail.job_title;
           owner.company_name=productinstructordetail.company_name;
           owner.location=productinstructordetail.location;
           owner.mobile_no=productinstructordetail.mobile_no;
           owner.story=productinstructordetail.story;
           owner.audio=productinstructordetail.audio;
           owner.gyan=productinstructordetail.gyan;
           owner.hope=productinstructordetail.hope;
           owner.namaste=productinstructordetail.namaste;
           owner.name_hindi=productinstructordetail.name_hindi;
           owner.job_title_hindi=productinstructordetail.job_title_hindi;
           owner.company_name_hindi=productinstructordetail.company_name_hindi;
           owner.location_hindi=productinstructordetail.location_hindi;
           owner.allow_go_live=productinstructordetail.allow_go_live;
           owner.live_profile_pic_card=productinstructordetail.live_profile_pic_card;
           owner.user_name=productinstructordetail.user_name;

           if($('#chkTopProduct').is(':checked'))
           {

                await  saveOnTopProduct(rawTopOwnerProductJson,mobile_no,owner,topownerproductitem);
            }
            else
            {
                 await  unsaveOnTopProduct(rawTopOwnerProductJson,mobile_no,topownerproductitem.id);
    
            }

           //#endregion
           
           //#region productOwnersdetails
           let RawproductownersdetailJson = await readS3BucketAsync(activePathS3["productPath"]+ productowners_Json,"");
        //    let RawInstructorDetailJson = await readS3BucketAsync(activePathS3["instructor"]+item.mobile_no+".json","");
           var productownersitem = {
            id: $.trim($("#txtProductId").val()),
            name: $.trim($("#txtProductName").val()),
            video: $.trim($("#txtProductVideo").val()),
            videoThumb: $.trim($("#txtProductVideoThumb").val()),
            price: $.trim($("#txtProductPrice").val()),
            masterCategories:$.trim($("#ddl_ddlcategory").val()),
            subCategories:"" //$.trim($("#ddl_sub_categories").val())
           
            };
            await  saveOnProductOwnerDetail(owner,RawproductownersdetailJson,mobile_no,productownersitem,$("#hdnproductid").val());
           //#endregion

           
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
            $("#divproductdetail").html("");
            $("#divproductdetail").html(renderHeader());
            await Renderproductdetail(finalJson)
            $("#divModel").modal("hide");
            $("body").toggleClass("loaded");
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


function clearInputs() {
    $("#txtProductId").val("");
    $("#txtProductName").val("");
    $("#txtProductVideo").val("");
    $("#txtProductVideoThumb").val("");
    $("#txtProductOwnerId").val("");
    $("#txtProductPrice").val("");
    $("#hdnproductid").val("");
    $("#chkTopProduct").prop('checked',false);
    $("#divModel").find("#txtProductId").attr("disabled", false);
}

$("#btnAddcat").on("click",function () {
    clearInputs();
    $("#divModel").show();
});

$("#btnClose").on("click",function () {
    $("#divModel").modal("hide");
});

async function editproductdetail(ProductId,Userid,Name) {
    $("#btnSave").show();
    GetUserList()
    let _currentproductowner;
    let _productOwnerJson ="";
    let _currenttopproductowner;
    let RawTopProductOwnerJson ="";
    var istopMarked=$('#chkTopProduct').val();
    let RawTopproductowner = await readS3BucketAsync(activePathS3["productPath"]+topProduct_Json,"");
    if (RawTopproductowner.err) {
        console.log(RawTopproductowner.err);
       
    } 
    else 
    {
        _currenttopproductowner = JSON.parse(RawTopproductowner.data);
        if(_currenttopproductowner!=null && _currenttopproductowner.length>0)
        {
                var topProductowner=_currenttopproductowner.filter(function (elem)
                {
                    return  elem.mobile_no==Userid;
                });
                if(topProductowner.length>0)
                {
                    topProductowner_product=topProductowner[0];
                        if (topProductowner_product["product"].length>0) {
                        
                            var isExistTopItem = topProductowner_product["product"].filter(function (item) {
                                return item.id == ProductId;
                            });
                            if(isExistTopItem.length>0)
                            {
                                $('#chkTopProduct').prop('checked',true);
                            }
                            else
                            {
                                $('#chkTopProduct').prop('checked',false);

                            }
                        }
                    
                }
        }
    }

    let RawproductownerJson = await readS3BucketAsync(activePathS3["productPath"]+productMaster_Json, "");
    if (RawproductownerJson.err) {
        console.log(RawproductownerJson.err);
        return false;
    } else 
    {
        _productOwnerJson = JSON.parse(RawproductownerJson.data);
    }
    _currentproductowner = _productOwnerJson.filter(function (item) {
        return (item.productId == ProductId && item.mobile_no== Userid);
    });
    if (_currentproductowner.length > 0) {
        _currentproductowner = _currentproductowner[0];
        $("#divModel").find(".modal-title").text("Edit Product");
        $("#divModel").find("#txtProductId").val(_currentproductowner["productId"]).attr("readonly", true);
        $("#divModel").find("#txtProductName").val(_currentproductowner["productName"]).attr("readonly", false);
        $("#divModel").find("#txtProductVideo").val(_currentproductowner["productVideo"]).attr("readonly", false);
        $("#divModel").find("#txtProductVideoThumb").val(_currentproductowner["productVideoThumb"]).attr("readonly", false);
        $("#divModel").find("#ddl_productowner").val(_currentproductowner["mobile_no"]).attr("readonly", true);
        $("#divModel").find("#txtProductPrice").val(_currentproductowner["price"]).attr("readonly", false);
        $("#divModel").find("#ddl_ddlcategory").val(_currentproductowner["productMasterCategories"]).attr("readonly", true);
        //$("#divModel").find("#ddl_sub_categories").val(_currentproductowner["productSubCategories"]).attr("readonly", false);
        $("#hdnUser_id").val(Userid);
        $("#hdnproductid").val(ProductId);
        $("#divModel").find("#txtProductId").attr("disabled", true);
        $("#divModel").find("#chkTopProduct").attr("disabled",false);
        $("#divModel").modal("show");
        
    }
}

async function showproductdetail(ProductId,Userid,Name) {
    let _currentproductowner;
    let _productownerJson;
    let RawproductownerJson = await readS3BucketAsync(activePathS3["productPath"]+productMaster_Json, "");
    $("#divModel #ddl_productowner").html('<option value="' + Userid+ '">' + Name + ' - '  +Userid+ " </option>")
    $select=$("#divModel #ddl_productowner").selectize({
        sortField: 'text',
        maxOptions:100000,
        placeholder:"Choose Product Owner"
    });
    var selectize = $select[0].selectize;
    selectize.disable();
    //$("#divModel #ddl_productowner").attr("disabled",true);

    if (RawproductownerJson.err) {
        console.log(RawproductownerJson.err);
        return false;
    } else {
        _productownerJson = JSON.parse(RawproductownerJson.data);
    }
    _currentproductowner = _productownerJson.filter(function (item) {
        return item.productId == ProductId;
    });
    if (_currentproductowner.length > 0) {
        _currentproductowner = _currentproductowner[0];
        $("#divModel").find(".modal-title").text("Product Detail");
        $("#divModel").find("#txtProductId").val(_currentproductowner["productId"]).attr("readonly", true);
        $("#divModel").find("#txtProductName").val(_currentproductowner["productName"]).attr("readonly", true);;
        $("#divModel").find("#txtProductVideo").val(_currentproductowner["productVideo"]).attr("readonly", true);;
        $("#divModel").find("#txtProductVideoThumb").val(_currentproductowner["productVideoThumb"]).attr("readonly", true);;
        $("#divModel").find("#ddl_productowner").val(_currentproductowner["mobile_no"]).attr("readonly", true);;
        $("#divModel").find("#txtProductPrice").val(_currentproductowner["price"]).attr("readonly", true);;
         $("#hdnUser_id").val(_currentproductowner["user_name"]);
        $("#hdnproductid").val(_currentproductowner["price"]);
       // $("#divModel").find("#chkTopProduct").attr("checked","checked");
       
        $("#divModel").modal("show");
        $("#btnSave").hide();
        //chkTopProduct
    }

    let RawTopproductowner = await readS3BucketAsync(activePathS3["productPath"]+topProduct_Json,"");
    if (RawTopproductowner.err) {
        console.log(RawTopproductowner.err);
       
    } 
    else 
    {
        _currenttopproductowner = JSON.parse(RawTopproductowner.data);
        if(_currenttopproductowner!=null && _currenttopproductowner.length>0)
        {
                var topProductowner=_currenttopproductowner.filter(function (elem)
                {
                    return  elem.mobile_no==Userid;
                });
                if(topProductowner.length>0)
                {
                    topProductowner_product=topProductowner[0];
                        if (topProductowner_product["product"].length>0) {
                        
                            var isExistTopItem = topProductowner_product["product"].filter(function (item) {
                                return item.id == ProductId;
                            });
                            if(isExistTopItem.length>0)
                            {
                                $('#chkTopProduct').prop('checked',true);
                            }
                            else
                            {
                                $('#chkTopProduct').prop('checked',false);

                            }
                        }
                    
                }
        }
    }
    $("#divModel").find("#chkTopProduct").attr("disabled",true);
}



async function validation(cb) {
    var cansave = true;
    var msg = "";
    var item = {
        user_id:  $.trim($("#ddl_productowner").val()),
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
        productMasterCategories: $.trim($("#ddl_ddlcategory").val()),
        productSubCategories: "", //$.trim($("#ddl_sub_categories").val())"",
        story:"",
        product:"",
        audio:"",
        gyan:"",
        hope:"",
        namaste:"",
        name_hindi:"",
        job_title_hindi:"",
        company_name_hindi:"",
        location_hindi:"",
        allow_go_live:"",
        live_profile_pic_card:"",
        user_name:""
        
        
        

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
        msg = "Please Select Product Owner Id.";
        cansave = false;
    }
    if (item["price"] == "" && cansave) {
        msg = "Please Enter Product Price.";
        cansave = false;
    } 
    else  if (item["price"] != "" && cansave) 
    {
        var pattern = /^(\d*([.,](?=\d{3}))?\d+)+((?!\2)[.,]\d\d)?$/;
        if (!pattern.test(item["price"])) {
            msg = "Please Enter Valid Product Price: " + item["price"];
            cansave = false;
        }
    }
    // if (cansave) {
    //             let RawproductownerJson = await readS3BucketAsync(`${activePathS3["productPath"]}`+productMaster_Json,"");
    //             if (RawproductownerJson.err) {
    //                 console.log(RawproductownerJson.err);
    //             } 
    //             else 
    //             {
    //                 let instructor_meta = await readS3BucketAsync(activePathS3["instructorPath"]+item.mobile_no+".json", "");
    //                 if(instructor_meta.data.length>0)
    //                 {
    //                     productownerdetail = JSON.parse(instructor_meta.data);
    //                         // if(instructorJson.length>0)
    //                         // {
    //                         //     var productownerdetail=instructorJson.filter(function (elem)
    //                         //     {
    //                         //         return  elem.mobile_no==item["mobile_no"];
    //                         //     });
                            
    //                         // }
    //                 }

    //                 if(productownerdetail!=null)
    //                 {
    //                     item["name"]=  productownerdetail.name;
    //                     item["job_title"]=  productownerdetail.job_title;
    //                     item["company_name"]=  productownerdetail.company_name;
    //                     item["location"]=  productownerdetail.location;
    //                     item.story=productownerdetail.story;
    //                     item.product=productownerdetail.product;
    //                     item.audio=productownerdetail.audio;
    //                     item.gyan=productownerdetail.gyan;
    //                     item.hope=productownerdetail.hope;
    //                     item.namaste=productownerdetail.namaste;
    //                     item.name_hindi=productownerdetail.name_hindi;
    //                     item.job_title_hindi=productownerdetail.job_title_hindi;
    //                     item.company_name_hindi=productownerdetail.company_name_hindi;
    //                     item.location_hindi=productownerdetail.location_hindi;
    //                     item.allow_go_live=productownerdetail.allow_go_live;
    //                     item.live_profile_pic_card=productownerdetail.live_profile_pic_card;
    //                     item.user_name=productownerdetail.user_name;
    //                 }
    //                 else
    //                 {
    //                     cansave = false;
    //                 }

    //             // finalJson = JSON.parse(RawproductownerJson.data);
    //                 // var itemjson=finalJson.filter(function(elem)
    //                 // {
    //                 //     if(elem["user_id"] == item["ProductOwnerId"]  && elem["productId"] == item["ProductId"])
    //                 //     {
    //                 //         msg = "This product already exist with this owner";
    //                 //         cansave = false;
    //                 //         return;
    //                 //     }
    //                 // } );

    //             }
        
    // }
    var result = {
        cansave: cansave,
        msg: msg,
        item: item,
    };
    cb(result);
}

$("#btnAddproductowner").on("click", function () {
    GetUserList();
    clearInputs();
    $("#hdnUser_id").val("");
    $("#hdnproductid").val("");
    
    $("#divModel").find(".modal-title").text("Add New Product");
    $("#divModel").modal("show");
    
    $("#chkTopProduct").prop('checked',false);
    $("#divModel").find("#txtProductId").attr("readonly", false);
    $("#divModel").find("#txtProductName").attr("readonly", false);
    $("#divModel").find("#txtProductVideo").attr("readonly", false);
    $("#divModel").find("#txtProductVideoThumb").attr("readonly", false);
    $("#divModel").find("#ddl_productowner").attr("readonly", false);
    $("#divModel").find("#txtProductPrice").attr("readonly", false);
    $("#divModel").find("#txtProductId").attr("disabled", false);
    $("#divModel").find("#chkTopProduct").attr("disabled",false);
    $("#divModel").find("#ddl_masterCategory").attr("readonly",false);
    $("#divModel").find("#ddl_subCategory").attr("readonly",false);
});

let deleteOnProductMaster=async (meta,ProductId,userid) => 
{
    var productownerList=[];
    if (meta.err) {
        console.log(meta.err);
        return false;
    } else 
    {
       productownerList = JSON.parse(meta.data);
    }
    for (let index = 0; index < productownerList.length; index++) {
        if (productownerList[index].productId === ProductId  && productownerList[index].user_id==userid) {
            productownerList.splice(index, 1); 
        }
      }
    const SaveResponce = await WriteS3Bucket(
        productownerList,
        `${activePathS3["productPath"]}`+productMaster_Json
    );
    console.log(SaveResponce);
    return productownerList;

}



let deleteOnProductOwnersDetail=async (meta,ProductId,userid) => 
{
    var finalJson=[];
    var productownerslist=[];
    if (meta.err) {
        console.log(meta.err);
   } 
   
    if(meta.data!=null && meta.data.length>0)
    {
        finalJson = JSON.parse(meta.data);
            if(finalJson.length>0)
            {
                var productownersdetail=finalJson.filter(function (elem)
                {
                    return  elem.mobile_no==userid;
                });

               if(productownersdetail.length>0)
                {
                    var productowner_product=productownersdetail[0];
                    var afterdeleteproductowners_products = productowner_product["product"].filter(function (item) 
                    {
                        return item.id != ProductId;
                    });
                    if(afterdeleteproductowners_products.length>0)
                    {
                        productowner_product.product=afterdeleteproductowners_products;
                        for (let index = 0; index < finalJson.length; index++) {
                                const element = finalJson[index];
                                    if (element.mobile_no == userid) 
                                    {
                                        finalJson[index] = productowner_product;
                                        productownerslist=finalJson;
                                        break;
                                    } 
                        }
                    }
                    else
                    {
                        var productownerslist=finalJson.filter(function (elem)
                        {
                            return  elem.mobile_no!=userid;
                        });	

                    }

                }	
            }
        const SaveResponce1 = await WriteS3Bucket(
            productownerslist,
            `${activePathS3["productPath"]}`+productowners_Json
        );
        console.log(SaveResponce1);             

    }

}
let deleteOnTopProduct=async (rawTopOwnerProductJson,ProductId,userid) => 
{
    var finalJson_Top=[];
    if (rawTopOwnerProductJson.err) {
        console.log(topOwnerProductJson.err);
   } 
   
    if(rawTopOwnerProductJson.data!=null && rawTopOwnerProductJson.data.length>0)
    {
            finalJson_Top = JSON.parse(rawTopOwnerProductJson.data);
            if(finalJson_Top.length>0)
            {
                var topProductowner=finalJson_Top.filter(function (elem)
                {
                    return  elem.mobile_no==userid;
                });

               if(topProductowner.length>0)
                {
                    var topProductowner_product=topProductowner[0];
                    var afterdeleteTopowner = topProductowner_product["product"].filter(function (item) 
                    {
                        return item.id != ProductId;
                    });
                    if(afterdeleteTopowner.length>0)
                    {
                        topProductowner_product.product=afterdeleteTopowner;
                        for (let index = 0; index < finalJson_Top.length; index++) {
                                const element = finalJson_Top[index];
                                    if (element.mobile_no == userid) 
                                    {
                                        finalJson_Top[index] = topProductowner_product;
                                        topProductowner=finalJson_Top;
                                        break;
                                    } 
                        }
                    }
                    else
                    {
                        var topProductowner=finalJson_Top.filter(function (elem)
                        {
                            return  elem.mobile_no!=userid;
                        });	

                    }

                }	
                const SaveResponce1 = await WriteS3Bucket(
                    topProductowner,
                    `${activePathS3["productPath"]}`+topProduct_Json
                );
                console.log(SaveResponce1);  
            }
        
                   

    }
}

let deleteOnInstructor=async (submeta,ProductId,userid) => 
{
    var instructorDetail=[];
    if (submeta.err) {
        console.log(submeta.err);
    } else {
        instructorDetail = JSON.parse(submeta.data);
    }
    console.log(instructorDetail);
    if (instructorDetail["product"] != undefined && instructorDetail["product"].length>0) {
    
            var Afterdeleteproduct= instructorDetail["product"].filter(function (item) {
                return item.id != ProductId;
            });
    
            if (Afterdeleteproduct.length > 0) {
                instructorDetail["product"]=Afterdeleteproduct;
            }
            else
            {
                instructorDetail["product"]=[];

            }
            await WriteS3Bucket(instructorDetail, `${activePathS3["instructorPath"]}${userid}.json`, function (tt) { });
     }

}
let saveOnProductMaster = async (RawproductownerJson,item,hdnproductid) => 
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
                                finalJson[index] = item;
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
    return finalJson;

}

let saveOnProductOwnerDetail= async (rawInstructorDetailJson,rawAllProductOwnerDetailJson,mobile_no,ownerproductitem,hdnproductid) => 
{
    
    if (rawAllProductOwnerDetailJson.err) {
        console.log(rawAllProductOwnerDetailJson.err);
    } 
    if(rawAllProductOwnerDetailJson.data!=null && rawAllProductOwnerDetailJson.data.length>0 )
    {
        if(rawAllProductOwnerDetailJson.data.length>0)
        {
            var productownersdetail = JSON.parse(rawAllProductOwnerDetailJson.data);
                if(productownersdetail.length>0)
                {
                    var currentproductownerdetail=productownersdetail.filter(function (elem)
                    {
                        return  elem.mobile_no==mobile_no;
                    });
                
                    if(currentproductownerdetail.length>0)
                    {

                        currentproductownerdetail=currentproductownerdetail[0];
                        if(hdnproductid=='')
                        {
                            if (currentproductownerdetail.product == undefined) {
                                currentproductownerdetail.product = [];
                            }
                                currentproductownerdetail.product.push(ownerproductitem);
                            
                        }
                        else 
                        {
                            for (let index = 0; index < currentproductownerdetail.product.length; index++) {
                                const element = currentproductownerdetail.product[index];
                                if (element.id == hdnproductid) 
                                {
                                    currentproductownerdetail.product[index] = ownerproductitem;
                                    //topProductowner=topProductowner_product;
                                    break;
                                }
                            }
                        }

                        //this for replacing at that owners position
                        for (let index = 0; index < productownersdetail.length; index++) {
                            const element = productownersdetail[index];
                            if (element.mobile_no == mobile_no) 
                            {
                                productownersdetail[index] = currentproductownerdetail;
                               // topProductowner=finalJson_Top;
                                break;
                            }
                        }

                    }
                    
                }
        
        }
    } 
   
    await WriteS3Bucket(
        productownersdetail,
            `${activePathS3["productPath"]}`+productowners_Json, function (tt) { }
     );
}


let saveOnTopProduct =async (rawTopOwnerProductJson,mobile_no,topowner,topownerproductitem) => 
{
    var finalJson_Top=[];

    if (rawTopOwnerProductJson.err) {
         console.log(rawTopOwnerProductJson.err);
    } 
    if(rawTopOwnerProductJson.data!=null && rawTopOwnerProductJson.data.length>0)
    {
            finalJson_Top = JSON.parse(rawTopOwnerProductJson.data);
            if(finalJson_Top.length>0)
            {
                var topProductowner=finalJson_Top.filter(function (elem)
                {
                    return  elem.mobile_no==mobile_no;
                });
                if(topProductowner.length>0)
                {
                    var topProductowner_product=topProductowner[0];
                    if (topProductowner_product["product"] == undefined) {
                        topProductowner_product["product"] = [];
                    }
            
                    var IsSlugExists = topProductowner_product["product"].filter(function (item) {
                        return item.id == topownerproductitem.id;
                    });
            
                    if (IsSlugExists.length == 0) {
                        topProductowner_product["product"].push(topownerproductitem);
                        topProductowner=topProductowner_product;
                    }
                    else 
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
                    }

                    //this for replacing at that owners position
                    for (let index = 0; index < finalJson_Top.length; index++) {
                        const element = finalJson_Top[index];
                        if (element.mobile_no == mobile_no) 
                        {
                            finalJson_Top[index] = topProductowner;
                            topProductowner=finalJson_Top;
                            break;
                        }
                    }
                }
                else
                {
                    topowner.product=[topownerproductitem];
                    topProductowner = topowner;
                    finalJson_Top.push(topProductowner);
                    topProductowner=finalJson_Top;
                }
            }
            else
            {
                topowner.product=[topownerproductitem];
                topProductowner = [topowner];
            }
    }
    else
    {
        topowner.product=[topownerproductitem];
        topProductowner = [topowner];

    }  
  
    await WriteS3Bucket(
        topProductowner,
            `${activePathS3["productPath"]}`+topProduct_Json
     );
   

}

let unsaveOnTopProduct =async (rawTopOwnerProductJson,mobile_no,productId) =>
{
    var topOwnerProductJson=[];
    if (rawTopOwnerProductJson.err) {
        console.log(rawTopOwnerProductJson.err);
   } 
   if(rawTopOwnerProductJson.data!=null && rawTopOwnerProductJson.data.length>0)
   {
    
            topOwnerProductJson = JSON.parse(rawTopOwnerProductJson.data);
            var topProductowner=topOwnerProductJson.filter(function (elem)
            {
                return  elem.mobile_no==mobile_no;
            });
            if(topProductowner.length>0)
            {
                var topProductowner_product=topProductowner[0];
                if (topProductowner_product["product"] != undefined && topProductowner_product["product"].length>0) {
                
                    var afterdeleteTopItem = topProductowner_product["product"].filter(function (item) {
                        return item.id != productId;
                    });
                }
                if(afterdeleteTopItem!=undefined && afterdeleteTopItem.length>0)
                {
                    topProductowner_product["product"] = afterdeleteTopItem;
                    for (let index = 0; index < topOwnerProductJson.length; index++) {
                        const element = topOwnerProductJson[index];
                        if (element.mobile_no == mobile_no) 
                        {
                            topOwnerProductJson[index] = topProductowner_product;
                            topProductowner=topOwnerProductJson;
                            break;
                        }
                    }
                }
                else
                {
                    var topProductowner=topOwnerProductJson.filter(function (elem)
                    {
                        return  elem.mobile_no!=mobile_no;
                    });
                    
                }
                await WriteS3Bucket(
                    topProductowner,
                        `${activePathS3["productPath"]}`+topProduct_Json
                );
            }

    }

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
            return item.id == templateTop.id;
        });

        if (IsSlugExists.length == 0) {
            instructorDetail["product"].push(templateTop);
        }
        else 
        {
            for (let index = 0; index < instructorDetail["product"].length; index++) {
                const element = instructorDetail["product"][index];
                if (element.id == templateTop.id) 
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
