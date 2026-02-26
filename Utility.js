const fs = require('fs');
const path = require('path');
// let pathName = path.join(__dirname, 'Files');
let pathName="C:\\WM_Json";
var app = require('electron');
var dialog = app.dialog;

GetFilesList();
function GetFilesList()
{
    var filelist=[];
    fs.readdir(pathName, function (err, files) {
        for (let index = 0; index < files.length; index++) {
            var element=[];
            element.push('<tr>');
            element.push('<td>'+(parseInt(index)+1)+'</td>');
            element.push('<td>'+files[index]+'</td>');
            element.push('<td><a download="'+files[index]+'" href="'+pathName+'/'+files[index]+'">Download</a></td>');
            element.push('<td><a href="#" onclick=\"DeleteFile(\''+files[index]+'\')\">Delete</a></td>');
            element.push('</tr>');
            filelist.push(element.join(' '));
        }
        $('#tblConvertedJson').html(filelist.join(' '));
    });
}

$('#btnUpdateJson').on('click', function () {
    if ($('#txtfileName').val() == "") {
        return false;
    }
    let file = path.join(pathName, $('#txtfileName').val());
    var finalJson = [];
    $('.jarray').each(function () {
        var _currentArray = this;
        var JSON_Obj = {};
        $(_currentArray).find('input[type="text"]').each(function () {
            JSON_Obj[$(this).attr('name')] = $(this).val();
        });
        finalJson.push(JSON_Obj);
    });
    if (finalJson.length == 1) {
        finalJson = finalJson[0];
    }
    fs.writeFile(file, JSON.stringify(finalJson), function (err) {
        if (err) {
            return console.log(err);
        }
        console.log("The file was saved!");
        $("#fileUploader").remove();
        $("<input>")
            .attr({
                type: 'file',
                id: 'fileUploader',
                class: 'form-control',
                placeholder: 'JSON File'
            })
            .appendTo($("label[for='fileUploader']"));
        $('#divJson').html('');
        $('#txtfileName').val('');
        $('#btnDownload').attr('href',file);
        GetFilesList();
    });
    return false;
});


$('body').on('change', '#fileUploader', function () {
    var file_to_read = $('#fileUploader')[0].files[0];
    $('#txtfileName').val(file_to_read.name);
    var fileread = new FileReader();
    fileread.onload = function (e) {
        var content = e.target.result;
        try {
            var ControlsList = [];
            var JSON_Obj = JSON.parse(content);
            if ($.isArray(JSON_Obj)) {
                for (let index = 0; index < JSON_Obj.length; index++) {
                    ControlsList.push(ParseToElement(JSON_Obj[index]));
                }
            }
            else {
                ControlsList.push(ParseToElement(JSON_Obj));
            }
            var finalHtml = [];
            for (let index = 0; index < ControlsList.length; index++) {
                var element = [];
                element.push("<div class=\"form-group jarray\">");
                element.push(ControlsList[index].join(" "));
                element.push("</div><hr>");
                finalHtml.push(element.join(' '));
            }
            $('#divJson').html(finalHtml.join(" "));
        } catch (error) {
            console.log(error);
        }

    };
    fileread.readAsText(file_to_read);
});

function ParseToElement(JSON_Obj) {
    var ControlsList = [];
    for (var key in JSON_Obj) {
        var element = [];
        element.push("<div class=\"form-group\">");
        element.push("<label>" + key + "</label>");
        element.push("<input id=\"txt_" + key + "\" name=\"" + key + "\" type=\"text\" value=\"" + JSON_Obj[key] + "\" class=\"form-control\">");
        element.push("</div>");
        ControlsList.push(element.join(' '));
    }
    return ControlsList;
}

function DeleteFile(fileName)
{
    fileName=$.trim(fileName);
    let file = path.join(pathName, fileName);
    fs.unlink(file, function(err){
        if(err) {
            return console.log(err);
        }
        GetFilesList();
        console.log("The file was deleted!");
    })

}
