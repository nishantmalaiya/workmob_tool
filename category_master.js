const fs = require('fs');
const path = require('path');
let pathName = "C:\\WM_Json";
var remote = require('@electron/remote');
var session = remote.session;
var app = remote.app;
var ipcRenderer = require('electron').ipcRenderer;
const dialog = remote.dialog;
let common = require('./Js/config');
let activePathS3 = common.getS3Path();
var type = remote.getGlobal("sharedObj").currentStory;

let lastKey = '';
let hasMore = true;
let allCategories = [];
let isFetching = false;
let scrollTimeout = null;

categorymasterList();

$(window).on("scroll", function () {
    if (scrollTimeout) clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
        if ($('#txtSearchCategory').val().trim() === "") {
            if ($(window).scrollTop() + $(window).height() >= $(document).height() - 100) {
                if (!isFetching && hasMore) {
                    loadMoreCategories();
                }
            }
        }
    }, 200);
});

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

async function deleteCat(cname, itemId) {
    if (confirm("Are you sure you want to delete this?")) {
        $('body').toggleClass('loaded');
        try {
            const categoryEndpoint = (activePathS3.category || "categories").replace(".json", "");
            const categoryDetailEndpoint = (activePathS3["category-detail"] || categoryEndpoint).replace(".json", "");
            const url = (type === "default") 
                ? `${common.API_BASE_URL}/categories/${encodeURIComponent(cname)}`
                : `${common.API_BASE_URL}/${categoryDetailEndpoint}/${encodeURIComponent(itemId)}`;

            const response = await fetch(url, {
                method: "DELETE"
            });
            const result = await response.json();

            if (response.ok) {
                dialog.showMessageBoxSync({ type: 'info', buttons: ['OK'], message: 'Category deleted successfully' });
                categorymasterList(); // Refresh the list
            } else {
                dialog.showMessageBoxSync({ type: 'error', buttons: ['OK'], message: 'Error deleting category: ' + (result.msg || result.error || 'Unknown error') });
            }
        } catch (e) {
            console.error("Error deleting category:", e);
            dialog.showMessageBoxSync({ type: 'error', buttons: ['OK'], message: 'Failed to delete category' });
        } finally {
            $('body').toggleClass('loaded');
        }
    }
}




async function categorymasterList() {
    lastKey = '';
    hasMore = true;
    allCategories = [];

    var storyCard = "";
    storyCard = "<div class=\"storycardheader col-md-12 row\">";
    storyCard = storyCard + "<div class=\"col-md-3\"><h4>Title</h4></div>";
    storyCard = storyCard + "<div class=\"col-md-3\"><h4>Title Hindi</h4></div>";
    storyCard = storyCard + "<div class=\"col-md-4\"><h4>Category</h4></div>";
    storyCard = storyCard + "<div class=\"col-md-1\"></div>";
    storyCard = storyCard + "<div class=\"col-md-1\"></div>";
    storyCard = storyCard + "<hr></div>";
    $('#divStory').html(storyCard);

    await loadMoreCategories();
}

async function loadMoreCategories() {
    if (isFetching || !hasMore) return;
    isFetching = true;
    $('body').toggleClass('loaded');
    try {
        const url = lastKey
            ? `${common.API_BASE_URL}/${activePathS3.category}?lastKey=${encodeURIComponent(lastKey)}`
            : `${common.API_BASE_URL}/${activePathS3.category}`;
        const response = await fetch(url);
        const data = await response.json();

        const batch = data.data || data.categories || (Array.isArray(data) ? data : []);
        if (batch.length > 0) {
            allCategories = [...allCategories, ...batch];
            await RenderStory(batch);
        }
        lastKey = data.lastKey || '';
        if (!data.hasMore) {
            hasMore = false;
        }
    } catch (e) {
        console.error("Error loading categories:", e);
    } finally {
        $('body').toggleClass('loaded');
        isFetching = false;
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
            <div class="col-md-1"><a href="#" data-toggle="modal" data-target="#delete-file-modal" onclick="editCat('${story.category}','${story.title}','${story.title_hindi}','${story.itemId || ''}')">Edit</a></div>
            <div class="col-md-1"><a href="#" onclick="deleteCat('${story.category}','${story.itemId || ''}')">Delete</a></div>
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






function focusInput(id) {
    setTimeout(function() {
        var el = document.getElementById(id);
        if (el) { el.focus(); el.focus(); }
    }, 100);
}

function showLoaderImmediate() {
    $('body').removeClass('loaded');
    $('#loader-wrapper').css({ visibility: 'visible', transform: 'translateY(0)', transition: 'none' });
}

function hideLoaderImmediate() {
    $('body').addClass('loaded');
    $('#loader-wrapper').css({ visibility: 'hidden', transform: 'translateY(-100%)', transition: 'none' });
    $('.loader-section').css({ transition: 'none' });
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
                        dialog.showMessageBoxSync({ type: 'error', buttons: ['OK'], message: 'This category already exist' });
                        $("#category").val('');
                        $("#title").val('');
                        $("#title_hindi").val('');
                        $("#hdncategory").val('');
                        focusInput('category');
                    }
                });

                if (_flag) {

                    showLoaderImmediate();
                    try {
                        var JSONobjCat = {
                            category: _category,
                            title: $("#title").val(),
                            title_hindi: $("#title_hindi").val()
                        };
                        const categoryEndpoint = (activePathS3.category || "categories").replace(".json", "");
                        const response = await fetch(`${common.API_BASE_URL}/${categoryEndpoint}`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(JSONobjCat)
                        });
                        const meta = await response.json();
                        console.log(meta);

                        if (response.ok) {
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

                            const options = { title: '', message: 'Category Saved succssfully', detail: '' };
                            dialog.showMessageBox(null, options);
                            $('#delete-file-modal').modal('hide');
                            categorymasterList(); // Refresh list
                        } else {
                            dialog.showMessageBoxSync({ type: 'error', buttons: ['OK'], message: 'Error saving category: ' + (meta.msg || meta.error || 'Unknown error') });
                            focusInput('category');
                        }
                    } catch (e) {
                        console.error("Error saving category:", e);
                        dialog.showMessageBoxSync({ type: 'error', buttons: ['OK'], message: 'Failed to save category' });
                        focusInput('category');
                    } finally {
                        hideLoaderImmediate();
                    }
                    $("#category").val('');
                    $("#title").val('');
                    $("#title_hindi").val('');
                    $("#hdncategory").val('');
                }
            }
            else {
                showLoaderImmediate();
                var JSONobjCat = {
                    category: _category,
                    title: $("#title").val(),
                    title_hindi: $("#title_hindi").val()
                };

                try {
                    const categoryEndpoint = (activePathS3.category || "categories").replace(".json", "");
                    const categoryDetailEndpoint = (activePathS3["category-detail"] || categoryEndpoint).replace(".json", "");
                    const idParam = (type === "default") ? encodeURIComponent(_category) : encodeURIComponent($("#hdnitemId").val());
                    const url = (type === "default") 
                        ? `${common.API_BASE_URL}/categories/${idParam}`
                        : `${common.API_BASE_URL}/${categoryDetailEndpoint}/${idParam}`;

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
                        $("#category").val('');
                        $("#title").val('');
                        $("#title_hindi").val('');
                        $("#hdncategory").val('');
                        categorymasterList(); // Refresh list
                    } else {
                            dialog.showMessageBoxSync({ type: 'error', buttons: ['OK'], message: 'Error updating category: ' + (meta.msg || meta.error || 'Unknown error') });
                            focusInput('category');
                        }
                    } catch (e) {
                        console.error("Error updating category:", e);
                        dialog.showMessageBoxSync({ type: 'error', buttons: ['OK'], message: 'Failed to update category' });
                        focusInput('category');
                } finally {
                        hideLoaderImmediate();
                    }
                    $("#category").val('');
                    $("#title").val('');
                    $("#title_hindi").val('');
                    $("#hdncategory").val('');
                    focusInput('category');
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
        }
        else {
            dialog.showMessageBoxSync({ type: 'error', buttons: ['OK'], message: cansave.msg });
            $("#category").val('');
            $("#title").val('');
            $("#title_hindi").val('');
            focusInput('category');
        }
    });
});

$("#btnAddcat").click(function () {
    $("#category").val('');
    $("#title").val('');
    $("#title_hindi").val('');
    $("#hdncategory").val('');
    $("#hdnitemId").val('');
    $('#delete-file-modal').find('.modal-title').text("Add New Category");
    $('#delete-file-modal').find('#CategoryEdit').show();
    focusInput('category');
});

$("#btnClose").click(function () {
    $('#delete-file-modal').modal('hide');
});


function editCat(cname, ctitle, chtitle, itemId) {
    $('#delete-file-modal').find('.modal-title').text("Edit Category");
    $('#delete-file-modal').find('#CategoryEdit').hide();
    $('#delete-file-modal').find('#category').val(cname);
    $('#delete-file-modal').find('#hdncategory').val(cname);
    $('#delete-file-modal').find('#hdnitemId').val(itemId || '');
    $('#delete-file-modal').find('#title').val(ctitle);
    $('#delete-file-modal').find('#title_hindi').val(chtitle);
    focusInput('title');
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

//#region Search Category
$("#btnSearch").click(function () {
    SearchOnCategory();
});
$("#btnClearSearch").click(function () {
    ClearSearchOnCategory();
});
$('#txtSearchCategory').on('keyup', function () {
    const query = $('#txtSearchCategory').val().trim();
    if (query.length >= 4) {
        SearchOnCategory();
    }
});

async function SearchOnCategory() {
    let query = $('#txtSearchCategory').val().trim().toLowerCase();
    let filtered = [];
    if (query) {
        filtered = allCategories.filter(function (c) {
            const cat = (c.category || "").toLowerCase();
            const title = (c.title || "").toLowerCase();
            const titleHindi = (c.title_hindi || "").toLowerCase();
            return cat.includes(query) || title.includes(query) || titleHindi.includes(query);
        });
    } else {
        filtered = allCategories;
    }

    var storyCard = "";
    storyCard = "<div class=\"storycardheader col-md-12 row\">";
    storyCard = storyCard + "<div class=\"col-md-3\"><h4>Title</h4></div>";
    storyCard = storyCard + "<div class=\"col-md-3\"><h4>Title Hindi</h4></div>";
    storyCard = storyCard + "<div class=\"col-md-4\"><h4>Category</h4></div>";
    storyCard = storyCard + "<div class=\"col-md-1\"></div>";
    storyCard = storyCard + "<div class=\"col-md-1\"></div>";
    storyCard = storyCard + "<hr></div>";
    $('#divStory').html(storyCard);

    await RenderStory(filtered);
}

async function ClearSearchOnCategory() {
    $('#txtSearchCategory').val('');
    
    var storyCard = "";
    storyCard = "<div class=\"storycardheader col-md-12 row\">";
    storyCard = storyCard + "<div class=\"col-md-3\"><h4>Title</h4></div>";
    storyCard = storyCard + "<div class=\"col-md-3\"><h4>Title Hindi</h4></div>";
    storyCard = storyCard + "<div class=\"col-md-4\"><h4>Category</h4></div>";
    storyCard = storyCard + "<div class=\"col-md-1\"></div>";
    storyCard = storyCard + "<div class=\"col-md-1\"></div>";
    storyCard = storyCard + "<hr></div>";
    $('#divStory').html(storyCard);

    await RenderStory(allCategories);
}
//#endregion
