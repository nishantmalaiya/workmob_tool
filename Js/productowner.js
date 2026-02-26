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
var type = remote.getGlobal("sharedObj").currentStory;

 //"stories_workmob/config/";
let instructorList=[];
const productMaster_Json='ProductMaster.json';
const topProduct_Json='topownerproducts.json';
const productowners_Json='productownersdetail.json';

let _masterCategory = [];
let _subcategoryList = [];
var Need_subCategory_in = ["product"];
var masterCategory = "";
let priviousCategory = null;
GetproductownerList();
GetUserList();
GetCategoryList();
GetSubcategoryList();


async function GetproductownerList() {
    //  const SaveResponce = await WriteS3Bucket(
    //     [],
    //     `${activePathS3["subcategory"]}`
    // );
    $("body").toggleClass("loaded");
    let productownerList = [];
    let meta = await readS3BucketAsync(activePathS3["productPath"]+productMaster_Json,"");
    
    if (meta.err) {
        $("#divproductowner").html("");
        $("body").toggleClass("loaded");
        return console.log(meta.err);
    }
    if(meta.data.length>0)
    {
        productownerList = JSON.parse(meta.data);
    }
  
    await RenderProductOwner(productownerList)
   
  
}


async function GetUserList() {
   
    if(instructorList==null || instructorList.length<=0)
    {
        let instructor_meta = await readS3BucketAsync(activePathS3["instructor"], "");
        if(instructor_meta.data!="" && instructor_meta.data!=null)
        {
             instructorList=JSON.parse(instructor_meta.data);
             
        }
    }
    if (instructorList.err) {
        return console.log(RawJson.err);
    } else {

        instructorList= instructorList.sort();
       // JSON_Obj = JSON.parse(instructorList.data);
        //var JSON_Obj = JSON.parse(json.data);
        var productowneridlist = [];
        for (var i = 0; i < instructorList.length; i++) {
            var _instructor = instructorList[i];
            productowneridlist.push('<option value="' + _instructor.user_id + '">' + _instructor.name + ' - '  +_instructor.mobile_no+ '</option>');         
        }
        
        $("#divModel #ddl_productowner").html(productowneridlist.join(" "));
        
        var $select = $("#divModel #ddl_productowner").selectize({
            sortField: 'text',
            maxOptions:100000,
            placeholder:"Choose Product Owner"
        });
        var selectize = $select[0].selectize;
        selectize.setValue("");
        
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
//});
async function RenderProductOwner(JSON_Obj_productMaster) {
    var storyCard = [];
    var productList=[];
    if(instructorList.length<=0)
    {
        let instructor_meta = await readS3BucketAsync(activePathS3["instructor"], "");
        if(instructor_meta.data.length>0)
        {
            instructorList=JSON.parse(instructor_meta.data);
        }
    }
   // Need to change the collection by JSON_Obj_productMaster in loop 
    for (var i = 0; i < JSON_Obj_productMaster.length; i++) 
    { 
        var item= JSON_Obj_productMaster[i];
        var productownerdetail=instructorList.filter(function (elem)
        {
            return  elem.mobile_no==item["mobile_no"];
        });
            if(productownerdetail.length>0)
            {
                    productList.push(productownerdetail);
            }        
    }
    var uniqueArray = [];
    if(productList.length>0)
    {
        var lookup = {};
        var items = productList;
        var result = [];

        for (var item, i = 0; item = items[i++];) {
        var mobile_no = item[0].mobile_no;

            if (!(mobile_no in lookup)) {
                lookup[mobile_no] = 1;
                result.push(item[0]);
            }   
        }
        uniqueArray= result;
    }

    if(uniqueArray.length>0)
    {
        var i=0;
        for (let index = 0; index < uniqueArray.length; index++) {
            var _story = uniqueArray[index];
            i=i+1;
            storyCard.push("<div class=\"storycard col-md-12 row\">")
            storyCard.push("<div class=\"col-md-1\">"+i +"</div>");
            // <img class=\"storythumb\" src=\"" + _story.thumb + "\" alt=\"" + _story.name + "\">
            storyCard.push("<div class=\"col-md-7\"><h4>" + _story.name + "</h4>" + _story.job_title + "</div>");
            storyCard.push("<div class=\"col-md-2\">" + _story.location + "</div>");
            storyCard.push("<div class=\"col-md-1\"><a name=\"Detail\" href=\"#\" data-id=\"" + _story.user_id + "\" >Detail</a></div>");
             storyCard.push("<div class=\"col-md-1\"><a name=\"Delete\" href=\"#\" onclick=\"deleteproductowner('"+_story.user_id+"',this)\" data-id=\"" + _story.user_id + "\" >Delete</a></div>");
            storyCard.push("<hr class=\"storyHr\"></div>")
          
           
        }
    }

    $("#divproductowner").append(storyCard);
    $("body").toggleClass("loaded");
}

$('#divproductowner').on('click', 'a[name="Detail"]', function () {

    var slug = $(this).attr('data-id');
    Model("pages/productdetail.html", slug);
});

function Model(pagename, slug) {
    let data = { "slug": slug, "pagename": pagename,"category": "productowner"};
    ipcRenderer.send('input-broadcast', data);
}


async function deleteproductowner(userid,_self) {
    let AfterDeleteProductOwner;
    if (confirm("Are you sure you want to delete this product owner?")) 
    {
        $(_self).closest(".storycard").remove();
       
        //product master removal
        let meta = await readS3BucketAsync(activePathS3["productPath"]+ productMaster_Json, "");
        AfterDeleteProductOwner=await deleteOnProductMaster(meta,userid);
        
         //instructor removal
        if (userid != "noinstructor") 
        {
            var submeta = await readS3BucketAsync(`${activePathS3["instructorPath"]}${userid}.json`, "");
            await deleteOnInstructor(submeta,userid);
           
        }
        //top product removal
        let RawproductownerJson = await readS3BucketAsync(activePathS3["productPath"]+topProduct_Json, "");
        await deleteOnTopProduct(RawproductownerJson,userid);

        //product owners detail removal
        let productownersmeta = await readS3BucketAsync(activePathS3["productPath"]+ productowners_Json, "");
         await deleteOnProductOwnersDetail(productownersmeta,userid);
               

       // $("#divproductowner").html(renderHeader());
        $("body").toggleClass("loaded");
        $("#divproductowner").html("");
        await RenderProductOwner(AfterDeleteProductOwner);
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
                // productmaster_item.story=productownerdetail.story;
                // item.product=productownerdetail.product;
                // item.audio=productownerdetail.audio;
                // item.gyan=productownerdetail.gyan;
                // item.hope=productownerdetail.hope;
                // item.namaste=productownerdetail.namaste;
                // item.name_hindi=productownerdetail.name_hindi;
                // item.job_title_hindi=productownerdetail.job_title_hindi;
                // item.company_name_hindi=productownerdetail.company_name_hindi;
                // item.location_hindi=productownerdetail.location_hindi;
                // item.allow_go_live=productownerdetail.allow_go_live;
                // item.live_profile_pic_card=productownerdetail.live_profile_pic_card;
                // item.user_name=productownerdetail.user_name;
            }
                 //#region  ProductMaster
                let RawproductownerJson = await readS3BucketAsync(activePathS3["productPath"]+ productMaster_Json,"");
                finalJson =await  saveOnProductMaster(RawproductownerJson,productmaster_item);
                // #endregion

                
            //#region Instructor



            var topownerproductitem = {
                id: $.trim($("#txtProductId").val()),
                name: $.trim($("#txtProductName").val()),
                video: $.trim($("#txtProductVideo").val()),
                videoThumb: $.trim($("#txtProductVideoThumb").val()),
                price: $.trim($("#txtProductPrice").val()),
                masterCategories:$.trim($("#ddl_ddlcategory").val()),
                subCategories:""//$.trim($("#ddl_sub_categories").val())
    
                };
               // let InstructormetaJson = await readS3BucketAsync(activePathS3["instructor"], "");
              await  saveOninstructor(topownerproductitem,mobile_no);
           //#endregion

            //#region  AllProductOwnerDetail

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
            
            let RawInstructorDetailJson = await readS3BucketAsync(activePathS3["instructorPath"]+mobile_no+".json","");
            var productinstructordetail = JSON.parse(RawInstructorDetailJson.data);
            
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
           


            let RawAllProductOwnerDetailJson = await readS3BucketAsync(activePathS3["productPath"]+productowners_Json,"");
            await  saveOnProductOwnerDetail(owner,RawAllProductOwnerDetailJson,mobile_no,topownerproductitem);
            // #endregion


           //#region TopOwnerProduct 
           let rawTopOwnerProductJson = await readS3BucketAsync(activePathS3["productPath"]+topProduct_Json,"");
           if($('#chkTopProduct').is(':checked'))
           {
                    // var topowner=
                    // {
                    //     "user_id":'',
                    //     "name":'',
                    //     "job_title":'',
                    //     "company_name":'',
                    //     "location":'',
                    //     "mobile_no":'',
                    //     "story":[],
                    //     "product":[],
                    //     "audio":[],
                    //     "gyan": [],
                    //     "hope": [],
                    //     "namaste": [],
                    //     "name_hindi": "",
                    //     "job_title_hindi": "",
                    //     "company_name_hindi": "",
                    //     "location_hindi": "",
                    //     "allow_go_live": "",
                    //     "live_profile_pic_card": "",
                    //     "user_name": "",
                    // }
                    var topownerproductitem = {
                        id: $.trim($("#txtProductId").val()),
                        name: $.trim($("#txtProductName").val()),
                        video: $.trim($("#txtProductVideo").val()),
                        videoThumb: $.trim($("#txtProductVideoThumb").val()),
                        price: $.trim($("#txtProductPrice").val()),
                        masterCategories:$.trim($("#ddl_ddlcategory").val()),
                        subCategories:"" //$.trim($("#ddl_sub_categories").val())
            
                         // masterCategories:,
                // subCategories:
                        };
                            
                    // topowner.user_id=item.user_id;
                    // topowner.name=item.name;
                    // topowner.job_title=item.job_title;
                    // topowner.company_name=item.company_name;
                    // topowner.location=item.location;
                    // topowner.mobile_no=item.mobile_no;
                    // topowner.story=item.story;
                    // topowner.product=item.product;
                    // topowner.audio=item.audio;
                    // topowner.gyan=item.gyan;
                    // topowner.hope=item.hope;
                    // topowner.namaste=item.namaste;
                    // topowner.name_hindi=item.name_hindi;
                    // topowner.job_title_hindi=item.job_title_hindi;
                    // topowner.company_name_hindi=item.company_name_hindi;
                    // topowner.location_hindi=item.location_hindi;
                    // topowner.allow_go_live=item.allow_go_live;
                    // topowner.live_profile_pic_card=item.live_profile_pic_card;
                    // topowner.user_name=item.user_name;




                await  saveOnTopProduct(rawTopOwnerProductJson,mobile_no,owner,topownerproductitem);
           }
           else
           {
               // await  unsaveOnTopProduct(rawTopOwnerProductJson,item.mobile_no,topownerproductitem.productId);

           }


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
            
            $("#divModel").modal("hide");
            $("#divproductowner").html("");
            await RenderProductOwner(finalJson);
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

let saveOnProductOwnerDetail= async (owner,rawAllProductOwnerDetailJson,mobile_no,ownerproductitem) => 
{
    
   
    if (rawAllProductOwnerDetailJson.err) {
        console.log(rawAllProductOwnerDetailJson.err);
    } 
    if(rawAllProductOwnerDetailJson.data!=null && rawAllProductOwnerDetailJson.data.length>0 && rawAllProductOwnerDetailJson.data!="[]")
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
                        
                        if (currentproductownerdetail.product == undefined) {
                            currentproductownerdetail.product = [];
                        }
                        var IsSlugExists = currentproductownerdetail.product.filter(function (item) {
                            return item.id == ownerproductitem.id;
                        });
                
                        if (IsSlugExists.length == 0) {
                            currentproductownerdetail.product.push(ownerproductitem);
                            //topProductowner=topProductowner_product;
                        }
                        else 
                        {
                            for (let index = 0; index < currentproductownerdetail.product.length; index++) {
                                const element = currentproductownerdetail.product[index];
                                if (element.id == ownerproductitem.id) 
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
                    else
                    {
                                if(owner!=null)
                                {
                                        if (owner.product == undefined) {
                                            owner.product = [];
                                        }
                                       
                                        owner.product.push(ownerproductitem);
                                        if(productownersdetail.length>0)
                                        {
                                            productownersdetail.push(owner);

                                        }
                                        else
                                        {
                                            productownersdetail=[owner];
                                        }
                                }
                            

                        
                    }
                }
        
       
    } 
    else
    {
        var productownersdetail=[];
        if(owner!=null)
        {

            if (owner.product == undefined) {
                owner.product = [];
            }
            
            owner.product.push(ownerproductitem);
            productownersdetail=[owner];

        }

    }
   
    await WriteS3Bucket(
        productownersdetail,
            `${activePathS3["productPath"]}`+productowners_Json, function (tt) { }
     );
}

let saveOnTopProduct= async (rawTopOwnerProductJson,mobile_no,topowner,topownerproductitem) => 
{
            var topOwnerProductJson ='';

            if (rawTopOwnerProductJson.err) {
                 console.log(rawTopOwnerProductJson.err);
            } 
            
            if(rawTopOwnerProductJson.data!=null && rawTopOwnerProductJson.data.length>0)
            {
                   var finalJson_Top = JSON.parse(rawTopOwnerProductJson.data);
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
                    `${activePathS3["productPath"]}`+topProduct_Json, function (tt) { }
             );
           

}
let saveOnProductMaster = async (RawproductownerJson,item) => 
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
                    finalJson.push(item);
                    
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
    return  finalJson;

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

let deleteOnProductMaster = async (meta,userid) => 
{
    var productownerList=[];
    if (meta.err) {
        console.log(meta.err);
        return false;
    } else 
    {
       productownerList = JSON.parse(meta.data);
    }

    var AfterDeleteProductOwner = productownerList.filter(function (elem) {
        return elem["user_id"] != userid;
    });
    const SaveResponce = await WriteS3Bucket(
        AfterDeleteProductOwner,
        `${activePathS3["productPath"]}`+productMaster_Json
    );
    console.log(SaveResponce);
     return  AfterDeleteProductOwner;  
}

let deleteOnProductOwnersDetail= async (meta,userid) => 
{
    var productownersList=[];
    if (meta.err) {
        console.log(meta.err);
        return false;
    } else 
    {
        productownersList = JSON.parse(meta.data);
    }

    var AfterDeleteProductOwners = productownersList.filter(function (elem) {
        return elem["user_id"] != userid;
    });
    const SaveResponce = await WriteS3Bucket(
        AfterDeleteProductOwners,
        `${activePathS3["productPath"]}`+productowners_Json
    );
    console.log(SaveResponce);
}


let deleteOnInstructor = async (submeta,userid) => 
{
    var instructorDetail=[];
    if (submeta.err) 
    {
        console.log(submeta.err);
    } 
    else 
    {
        instructorDetail = JSON.parse(submeta.data);
    }
    console.log(instructorDetail);
    if (instructorDetail["product"] != undefined && instructorDetail["product"].length>0)
    {
        instructorDetail["product"]=[];
        await WriteS3Bucket(instructorDetail, `${activePathS3["instructorPath"]}${userid}.json`, function (tt) { });
    }

}
let deleteOnTopProduct = async (RawproductownerJson,userid) => 
{
    var _currenttopproductowner=[];
    var topproductownerdetail="";
    if (RawproductownerJson.err) {
        console.log(RawproductownerJson.err);
    } 
    else 
    {
        _currenttopproductowner = JSON.parse(RawproductownerJson.data);
    }
    if(_currenttopproductowner.length>0)
    {
            topproductownerdetail= _currenttopproductowner.filter(function (elem) {
            return elem["user_id"] != userid;
        });
    }

    const SaveResponce1 = await WriteS3Bucket(
        topproductownerdetail,
        `${activePathS3["productPath"]}`+topProduct_Json
    );
    console.log(SaveResponce1);    

}

function clearInputs() {
    $("#txtProductId").val("");
    $("#txtProductName").val("");
    $("#txtProductVideo").val("");
    $("#txtProductVideoThumb").val("");
    $("#txtProductOwnerId").val("");
    $("#txtProductPrice").val("");
    $("#chkTopProduct").prop('checked',false);
    var $select = $("#ddl_productowner").selectize();
    var selectize = $select[0].selectize;
    selectize.setValue("");
    $("#divModel").find("#txtProductId").attr("disabled", false);
}

$("#btnAddcat").click(function () {
    clearInputs();
    $("#divModel").show();
});

$("#btnClose").click(function () {
    $("#divModel").modal("hide");
});


function saveUPre() { }

async function validation(cb) {
    var cansave = true;
    var msg = "";
    var item = {
        user_id: $.trim($("#ddl_productowner").val()),
        mobile_no: $.trim($("#ddl_productowner").val()),
        productId: $.trim($("#txtProductId").val()),
        productName: $.trim($("#txtProductName").val()),
        productVideo: $.trim($("#txtProductVideo").val()),
        productVideoThumb: $.trim($("#txtProductVideoThumb").val()),
        price: $.trim($("#txtProductPrice").val()),

    };
    if (item["productId"] == "" && cansave) {
        msg = "Please Enter Product Id.";
        cansave = false;
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
    if (item["price"] == "" && cansave) 
    {
        msg = "Please Enter Product Price.";
        cansave = false;
    } 
    else if(item["price"] != "" && cansave)
    {
        var pattern = /^(\d*([.,](?=\d{3}))?\d+)+((?!\2)[.,]\d\d)?$/;
        if (!pattern.test(item["price"])) 
        {
            msg = "Please Enter Valid Product Price: " + item["price"];
            cansave = false;
        }
    }
    var result = {
        cansave: cansave,
        msg: msg
    };
    cb(result);
}

$("#btnAddproductowner").click(function () {
    clearInputs();
   
   
    $("#divModel").find(".modal-title").text("Add New Product");
    $("#divModel").modal("show");

});

// let unsaveOnTopProduct= async (rawTopOwnerProductJson,mobile_no,productId) => 
// {

//     var topOwnerProductJson = JSON.parse(rawTopOwnerProductJson.data);
//     var topProductowner=topOwnerProductJson.filter(function (elem)
//     {
//         return  elem.mobile_no==mobile_no;
//     });
//     if(topProductowner.length>0)
//     {
//         topProductowner_product=topProductowner[0];
//         if (topProductowner_product["product"] != undefined && topProductowner_product["product"].length>0) {
        
//             var afterdeleteTopItem = topProductowner_product["product"].filter(function (item) {
//                 return item.id != productId;
//             });
//         }
//         if(afterdeleteTopItem!=undefined && afterdeleteTopItem.length>0)
//         {
//             topProductowner_product["product"] = afterdeleteTopItem;
//             for (let index = 0; index < topOwnerProductJson.length; index++) {
//                 const element = topOwnerProductJson[index];
//                 if (element.mobile_no == mobile_no) 
//                 {
//                     topOwnerProductJson[index] = topProductowner_product;
//                     topProductowner=topOwnerProductJson;
//                     break;
//                 }
//             }
//         }
//         else
//         {
//             var topProductowner=topOwnerProductJson.filter(function (elem)
//             {
//                 return  elem.mobile_no!=mobile_no;
//             });
            
//         }
//         await WriteS3Bucket(
//             topProductowner,
//                 `${activePathS3["productPath"]}`+topProduct_Json
//         );
//     }
// }

