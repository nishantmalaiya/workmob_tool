const fs = require('fs');
const path = require('path');
let pathName = "C:\\WM_Json";
var remote = require('@electron/remote');
var session = remote.session;
var app = remote.app;
var ipcRenderer = require('electron').ipcRenderer;
const dialog = remote.dialog;
let common = require('./js/config');
let activePathS3 = common.getS3Path();

let currentOffset = 0; // Tracks the current offset
const limit = 50; // Number of records to fetch per request
let allCategories = []; // To store fetched records
let isFetching = false; // To prevent concurrent fetches

categorymasterList();
// async function categorymasterList() {
//     debugger;
// // if(activePathS3["category"] == "product-category.json")
// // {
// //   const SaveResponce = await WriteS3Bucket(
// //          [],
// //          `${activePathS3["category"]}`
// //     );
// //     debugger;

// // }
//     $('body').toggleClass('loaded');
//     var meta = await readS3BucketAsync(activePathS3["category"], "");

//     $('body').toggleClass('loaded');
//     if (meta.err) {
//         $('#divStory').html('');
//         return console.log(meta.err);
//     }
//     var storyCard = "";
//     storyCard = "<div class=\"storycardheader col-md-12 row\">";
//     storyCard = storyCard + "<div class=\"col-md-3\"><h4>Title</h4></div>";
//     storyCard = storyCard + "<div class=\"col-md-3\"><h4>Title Hindi</h4></div>";
//     storyCard = storyCard + "<div class=\"col-md-3\"><h4>Category</h4></div>";
//     storyCard = storyCard + "<div class=\"col-md-1\"><h4>Total Stories</h4></div>";
//     storyCard = storyCard + "<div class=\"col-md-1\"></div>";
//     storyCard = storyCard + "<div class=\"col-md-1\"></div>";
//     storyCard = storyCard + "<hr></div>";
//     $('#divStory').html(storyCard);
//     await RenderStory(JSON.parse(meta.data));
// }

// async function read(story) {
//     $('body').toggleClass('loaded');
//     await readS3Bucket(activePathS3["category-index"] + story.category + ".json", function (json) {
//         $('body').toggleClass('loaded');
//         var totals = 0;
//         var storyCard = "";
//         storyCard = "<div class=\"storycard col-md-12 row column\" draggable=\"true\" name=\"category\" id=\"" + story.category + "\">";
//         storyCard = storyCard + "<div class=\"col-md-3\" name=\"title\"><h4>" + story.title + "</h4></div>";
//         storyCard = storyCard + "<div class=\"col-md-3\" name=\"title_hindi\"><h4>" + story.title_hindi + "</h4></div>";
//         storyCard = storyCard + "<div class=\"col-md-3\">" + story.category + "</div>";
//         if (json.err) {
//             storyCard = storyCard + "<div class=\"col-md-1\">0 stories</div>";
//             storyCard = storyCard + "<div class=\"col-md-1\"><a href=\"#\" data-toggle=\"modal\" data-target=\"#delete-file-modal\" onclick=\"editCat('" + story.category + "','" + story.title + "','" + story.title_hindi + "')\">Edit</a></div>";
//             storyCard = storyCard + "<div class=\"col-md-1\"><a href=\"#\" onclick=\"deleteCat('" + story.category + "',this)\">Delete</a></div>";
//         }
//         else {
//             totals = JSON.parse(json.data).length;
//             if (totals > 0) {
//                 storyCard = storyCard + "<div class=\"col-md-1\">" + totals + " stories</div>";
//                 storyCard = storyCard + "<div class=\"col-md-1\"><a href=\"#\" data-toggle=\"modal\" data-target=\"#delete-file-modal\" onclick=\"editCat('" + story.category + "','" + story.title + "','" + story.title_hindi + "')\">Edit</a></div>";
//                 storyCard = storyCard + "<div class=\"col-md-1\"><a>&nbsp;</a></div>";
//             }
//             else {
//                 storyCard = storyCard + "<div class=\"col-md-1\">0 stories</div>";
//                 storyCard = storyCard + "<div class=\"col-md-1\"><a href=\"#\" data-toggle=\"modal\" data-target=\"#delete-file-modal\" onclick=\"editCat('" + story.category + "','" + story.title + "','" + story.title_hindi + "')\">Edit</a></div>";
//                 storyCard = storyCard + "<div class=\"col-md-1\"><a href=\"#\" onclick=\"deleteCat('" + story.category + "',this)\">Delete</a></div>";
//             }
//         }
//         storyCard = storyCard + "<hr class=\"storyHr\"></div>";
//         $('#divStory').append(storyCard);
//         var cols = document.querySelectorAll('#divStory .column');
//         [].forEach.call(cols, addDnDHandlers);
//     });
// }

async function RenderStory(JSON_Obj) {
    for (let index = 0; index < JSON_Obj.length; index++) {
        var _story = JSON_Obj[index];
        await read(_story);
    }
}

async function deleteCat(cname) {
    if (confirm("Are you sure you want to delete this?")) {
        $('body').toggleClass('loaded');
        try {
            const url = `${common.API_BASE_URL}/categories/${encodeURIComponent(cname)}`;
            const response = await fetch(url, {
                method: "DELETE"
            });
            const result = await response.json();

            if (response.ok) {
                alert("Category deleted successfully");
                categorymasterList(); // Refresh the list
            } else {
                alert("Error deleting category: " + (result.msg || result.error || "Unknown error"));
            }
        } catch (e) {
            console.error("Error deleting category:", e);
            alert("Failed to delete category");
        } finally {
            $('body').toggleClass('loaded');
        }
    }
}




let currentPage = 0; // Tracks the current page of data
let isLoading = false; // Prevent multiple simultaneous loads
const pageSize = 100; // Number of items per page

async function categorymasterList() {
    $('body').toggleClass('loaded');
    try {
        const url = common.API_BASE_URL + "/categories";
        const response = await fetch(url);
        const data = await response.json();

        const categories = data.categories || data.data || data || [];

        var storyCard = "";
        storyCard = "<div class=\"storycardheader col-md-12 row\">";
        storyCard = storyCard + "<div class=\"col-md-3\"><h4>Title</h4></div>";
        storyCard = storyCard + "<div class=\"col-md-3\"><h4>Title Hindi</h4></div>";
        storyCard = storyCard + "<div class=\"col-md-4\"><h4>Category</h4></div>";
        // storyCard = storyCard + "<div class=\"col-md-1\"><h4>Total Stories</h4></div>";
        storyCard = storyCard + "<div class=\"col-md-1\"></div>";
        storyCard = storyCard + "<div class=\"col-md-1\"></div>";
        storyCard = storyCard + "<hr></div>";
        $('#divStory').html(storyCard);

        await RenderStory(categories);
    } catch (e) {
        console.error("Error loading categories:", e);
        $('#divStory').html('<div class="col-md-12 text-center">Failed to load categories</div>');
    } finally {
        $('body').toggleClass('loaded');
    }
}

// function initializeScrollHandler(data) {
//     // Load the first batch of stories
//     loadStoriesOnScroll(data);

//     // Attach scroll event listener
//     $(window).on('scroll', async function () {
//         // Check if the user is near the bottom of the page
//         if ($(window).scrollTop() + $(window).height() >= $(document).height() - 100) {
//             if (!isLoading) {
//                 isLoading = true; // Prevent multiple triggers
//                 await loadStoriesOnScroll(data);
//                 isLoading = false; // Allow further loading
//             }
//         }
//     });
// }

// async function loadStoriesOnScroll(data) {
//     // Get the next batch of data
//     const start = currentPage * pageSize;
//     const end = start + pageSize;

//     const batch = data.slice(start, end);
//     if (batch.length === 0) return; // No more data to load

//     for (const story of batch) {
//         await read(story);
//     }

//     currentPage++; // Move to the next page
// }

async function read(story) {
    try {
        /*
        const url = `${common.API_BASE_URL}/categories/${encodeURIComponent(story.category)}`;
        const response = await fetch(url);
        const data = await response.json();
        
        const stories = data.stories || data.data || data || [];
        let totals = stories.length;
        */

        let storyCard = `
            <div class="storycard col-md-12 row column" draggable="true" name="category" id="${story.category}">
                <div class="col-md-3" name="title"><h4>${story.title}</h4></div>
                <div class="col-md-3" name="title_hindi"><h4>${story.title_hindi}</h4></div>
                <div class="col-md-4">${story.category}</div>
        `;

        storyCard += `
            <div class="col-md-1"><a href="#" data-toggle="modal" data-target="#delete-file-modal" onclick="editCat('${story.category}','${story.title}','${story.title_hindi}')">Edit</a></div>
            <div class="col-md-1"><a href="#" onclick="deleteCat('${story.category}')">Delete</a></div>
        `;

        storyCard += `
            <hr class="storyHr"></div>
        `;
        $('#divStory').append(storyCard);

        // Add drag-and-drop handlers
        const cols = document.querySelectorAll('#divStory .column');
        [].forEach.call(cols, addDnDHandlers);
    } catch (e) {
        console.error(`Error reading category ${story.category}:`, e);
    }
}






$("#btnSave").click(function () {
    var storyCard = "";
    var str = $("#category").val();
    var _category = str.replace(/ /gi, "-");

    validation(async function (cansave) {


        if (cansave.cansave) {
            if ($("#hdncategory").val() == "") {
                var _flag = true;
                $('.storycard').each(function () {
                    if ($(this).attr('id').toLowerCase() == _category.toLowerCase()) {
                        _flag = false;
                        alert("This category already exist");
                        fs.existsSync();
                        // return false;
                    }
                });

                if (_flag) {

                    storyCard = "<div class=\"storycard col-md-12 row column\" draggable=\"true\" name=\"category\" id=\"" + _category + "\">";
                    storyCard = storyCard + "<div class=\"col-md-3\" name=\"title\"><h4>" + $("#title").val() + "</h4></div>";
                    storyCard = storyCard + "<div class=\"col-md-3\" name=\"title_hindi\"><h4>" + $("#title_hindi").val() + "</h4></div>";
                    storyCard = storyCard + "<div class=\"col-md-4\">" + _category + "</div>";
                    storyCard = storyCard + "<div class=\"col-md-1\"><a href=\"#\" data-toggle=\"modal\" data-target=\"#delete-file-modal\" onclick=\"editCat('" + _category + "','" + $("#title").val() + "','" + $("#title_hindi").val() + "')\">Edit</a></div>";
                    storyCard = storyCard + "<div class=\"col-md-1\"><a href=\"#\" onclick=\"deleteCat('" + _category + "',this)\">Delete</a></div>";
                    storyCard = storyCard + "<hr class=\"col-md-12 bg-info\"></div>";
                    $('#divStory').append(storyCard);
                    var cols = document.querySelectorAll('#divStory .column');
                    [].forEach.call(cols, addDnDHandlers);

                    var a = [];
                    await WriteS3Bucket(a, activePathS3["category-index"] + _category + ".json");
                    $('#delete-file-modal').modal('hide');
                    let file = path.join(pathName, activePathS3["category"]);
                    var finalJson = [];

                    const categoriesUrl = "https://r5dojmizdd.execute-api.ap-south-1.amazonaws.com/prod/categories";
                    const categoriesResponse = await fetch(categoriesUrl);
                    const categoriesData = await categoriesResponse.json();
                    finalJson = categoriesData.categories || categoriesData.data || categoriesData || [];

                    var JSONobjCat = {};
                    var categoryNew = $("#category").val();
                    var title = $("#title").val();
                    var title_hindi = $("#title_hindi").val();

                    JSONobjCat["category"] = categoryNew;
                    JSONobjCat["title"] = title;
                    JSONobjCat["title_hindi"] = title_hindi;
                    finalJson.push(JSONobjCat);

                    if (finalJson.length == 1) {
                        finalJson = [finalJson[0]];
                    }

                    $('body').toggleClass('loaded');
                    try {
                        const response = await fetch(common.API_BASE_URL + "/categories", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(JSONobjCat)
                        });
                        const meta = await response.json();
                        console.log(meta);

                        if (response.ok) {
                            const options = { title: '', message: 'Category Saved succssfully', detail: '' };
                            dialog.showMessageBox(null, options);
                            $('#delete-file-modal').modal('hide');
                            categorymasterList(); // Refresh list
                        } else {
                            alert("Error saving category: " + (meta.msg || meta.error || "Unknown error"));
                        }
                    } catch (e) {
                        console.error("Error saving category:", e);
                        alert("Failed to saved category");
                    } finally {
                        $('body').toggleClass('loaded');
                    }
                }
            }
            else {
                $('body').toggleClass('loaded');
                var JSONobjCat = {
                    category: _category,
                    title: $("#title").val(),
                    title_hindi: $("#title_hindi").val()
                };

                try {
                    const url = `${common.API_BASE_URL}/categories/${encodeURIComponent(_category)}`;
                    const response = await fetch(url, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(JSONobjCat)
                    });
                    const meta = await response.json();

                    if (response.ok) {
                        const options = { title: '', message: 'Category Updated succssfully', detail: '' };
                        dialog.showMessageBox(null, options);
                        $('#delete-file-modal').modal('hide');
                        categorymasterList(); // Refresh list
                    } else {
                        alert("Error updating category: " + (meta.msg || meta.error || "Unknown error"));
                    }
                } catch (e) {
                    console.error("Error updating category:", e);
                    alert("Failed to update category");
                } finally {
                    $('body').toggleClass('loaded');
                }
            }


            // $('.storycard').each(function () {
            //     var _currentArray = this;
            //     var JSONObj = {};
            //     JSONObj[$(this).attr('name')] = $(this).attr('id');
            //     $(_currentArray).find('h4').each(function () {
            //         JSONObj[$(this).closest('div').attr('name')] = $(this).text();
            //     });
            //     finalJson.push(JSONObj);
            // });

            //fs.writeFile(file, JSON.stringify(finalJson), function (err) {
            //    if (err) {
            //        return console.log(err);
            //    }
            //    console.log("The file was saved!");
            //});
            console.log(new Date());

            //WriteS3Bucket(finalJson, "category.json").then(meta => {
            //    console.log(meta); // {"metadata": "for: test.png"}
            //});



            //(async () => {
            //    const meta = await WriteS3Bucket(finalJson, "category.json");
            //    console.log(meta); // {"metadata": "for: test.png"}
            //})();

            //const result = WriteS3Bucket(finalJson, "category.json");
            //debugger;
            //console.log(result.PromiseResult);
            //WriteS3Bucket(finalJson, "category.json", function (tt) {
            //    console.log(tt);
            //    console.log("The file was saved!");

            //    const options = { title: '', message: 'Category Saved succssfully', detail: '' };
            //    try {
            //        dialog.showMessageBox(null, options);
            //    } catch (e) {
            //        console.log(e);
            //        dialog.showMessageBox(null, options);
            //    }

            //});
            console.log("Second", new Date());
            $("#category").val('');
            $("#title").val('');
            $("#title_hindi").val('');
            $("#hdncategory").val('');
        }
        else {
            alert(cansave.msg);
        }
    });
});

$("#btnAddcat").click(function () {
    $("#category").val('');
    $("#title").val('');
    $("#title_hindi").val('');
    $("#hdncategory").val('');
    $('#delete-file-modal').find('.modal-title').text("Add New Category");
    $('#delete-file-modal').find('#CategoryEdit').show();
});

$("#btnClose").click(function () {
    $('#delete-file-modal').modal('hide');
});


function editCat(cname, ctitle, chtitle) {
    $('#delete-file-modal').find('.modal-title').text("Edit Category");
    $('#delete-file-modal').find('#CategoryEdit').hide();
    $('#delete-file-modal').find('#category').val(cname);
    $('#delete-file-modal').find('#hdncategory').val(cname);
    $('#delete-file-modal').find('#title').val(ctitle);
    $('#delete-file-modal').find('#title_hindi').val(chtitle);
}

// function saveUPre() {
//     let file = path.join(pathName, activePathS3["category"]);
//     var finalJson = [];
//     $('.storycard').each(function () {
//         var _currentArray = this;
//         var JSONObj = {};
//         JSONObj[$(this).attr('name')] = $(this).attr('id');
//         $(_currentArray).find('h4').each(function () {
//             JSONObj[$(this).closest('div').attr('name')] = $(this).text();
//         });
//         finalJson.push(JSONObj);
//     });
//     if (finalJson.length == 1) {
//         finalJson = finalJson[0];
//     }
//     $('body').toggleClass('loaded');
//     WriteS3Bucket(finalJson, activePathS3["category"], function (tt) {
//         console.log(tt);
//         console.log("The file was saved!");
//     });
//     $('body').toggleClass('loaded');
//     //fs.writeFile(file, JSON.stringify(finalJson), function (err) {
//     //    if (err) {
//     //        return console.log(err);
//     //    }
//     //});
// }

function validation(cb) {
    var cansave = true;
    var msg = "";

    var item = { "Category": $.trim($('#divModel').find('#category').val()), "title": $.trim($('#divModel').find('#title').val()), "title-hindi": $.trim($('#divModel').find('#title_hindi').val()) }
    if (item["Category"] == "") {
        msg = "Please Enter Category";
        cansave = false;
    }
    if (item["title"] == "") {
        msg = "Please Enter title";
        cansave = false;
    }
    if (item["title-hindi"] == "") {
        msg = "Please Enter Hindi title";
        cansave = false;
    }
    var result = { "cansave": cansave, "msg": msg };
    cb(result);
}