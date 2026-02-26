var remote = require('@electron/remote');
var bucketName = "cdn.workmob.com";
var bucketRegion = "ap-south-1";
var IdentityPoolId = "ap-south-1:ad4c7744-cc50-4f83-b5aa-22b604bd29f6";
//var S3filepath = "stories_workmob/config/"; //"stories_workmob/confjson/"; //config//configjson/***/config_json

var S3filepath = "stories_workmob/confjson/";
AWS.config.update({
    region: bucketRegion,
    credentials: new AWS.CognitoIdentityCredentials({
        IdentityPoolId: IdentityPoolId
    })
});

const s3 = new AWS.S3({ apiVersion: '2006-03-01' });
const existsS3Bucket = (JsonfileName, data, cb) => {
    var isExists = true;
    var params = { Bucket: bucketName, Key: S3filepath + JsonfileName }
    return new Promise((resolve, reject) => {
        s3.headObject(params, function (err, metadata) {
            if (err && (err.code === 'NotFound' || err.code === 'Forbidden')) {
                isExists = false;
                resolve({ "isExists": isExists, "file": JsonfileName, "data": data });
            } else {
                resolve({ "isExists": isExists, "file": JsonfileName, "data": data });
            }
        });
    });
}
async function readS3Bucket(JsonfileName, cb) {
    var result = { "err": null, "data": null, "file": JsonfileName }
    try {
        var params = { Bucket: bucketName, Key: S3filepath + JsonfileName }
        await s3.getObject(params, function (err, data) {
            if (err) {
                result["err"] = err.stack;
                cb(result);
            }
            else {
                var json = data.Body.toString('utf-8');
                //console.log(JsonfileName, json);
                result["data"] = json;
                cb(result);
            }
        });
    } catch (e) {
        result["err"] = e;
        cb(result);
    }
}


//function WriteS3Bucket(jsonfilecontent, JsonfileName, cb) {

//    const str = JSON.stringify(jsonfilecontent);
//    const bytes = new TextEncoder().encode(str);
//    const blob = new Blob([bytes], { type: "application/json;charset=utf-8" });
//    var params = {
//        Bucket: bucketName,
//        Key: S3filepath + JsonfileName,
//        Body: blob,
//        CacheControl: 'public, max-age=3600',
//        ContentType: "application/json"
//    }
//    s3.putObject(params, function (err, data) {
//        var result = { "err": err, "data": data, "file": JsonfileName };
//        cb(result);
//    }).on('httpUploadProgress', function (progress) {
//        var uploaded = parseInt((progress.loaded * 100) / progress.total);
//        console.log(uploaded);
//    });
//}




const DeleteS3Bucket = (JsonfileName) => {
    var result = { "err": null, "data": null, "file": JsonfileName }
    var params = { Bucket: bucketName, Key: S3filepath + JsonfileName };
    return new Promise((resolve, reject) => {
        s3.deleteObject(params, function (err, data) {
            if (err) {
                result["err"] = err;
                resolve(result);
            }
            else {
                result["data"] = data;
                resolve(result);
            }
        });
    });
}

const WriteS3Bucket1 = (jsonfilecontent, JsonfileName, cb) => {

    const str = JSON.stringify(jsonfilecontent);
    const bytes = new TextEncoder().encode(str);
    const blob = new Blob([bytes], { type: "application/json;charset=utf-8" });
    var params = {
        Bucket: bucketName,
        Key: S3filepath + JsonfileName,
        Body: blob,
        CacheControl: 'public, max-age=3600',
        ContentType: "application/json"
    }
    return new Promise((resolve, reject) => {
        s3.putObject(params, function (err, result) {
            if (err) {
                var responce = { "err": err, "data": result, "file": JsonfileName };
                resolve(responce);
            }
            if (result) {
                var responce = { "err": err, "data": result, "file": JsonfileName };
                resolve(responce);
            }
        });
    });
}



const WriteS3Bucket = (jsonfilecontent, JsonfileName, cb) => {

    const str = JSON.stringify(jsonfilecontent);
    const bytes = new TextEncoder().encode(str);
    const blob = new Blob([bytes], { type: "application/json;charset=utf-8" });
    var params = {
        Bucket: bucketName,
        Key: S3filepath + JsonfileName,
        Body: blob,
        CacheControl: 'public, max-age=3600',
        ContentType: "application/json"
    }
    return new Promise((resolve, reject) => {
        s3.putObject(params, function (err, result) {
            if (err) {
                var responce = { "err": err, "data": result, "file": JsonfileName };
                resolve(responce);
            }
            if (result) {
                var responce = { "err": err, "data": result, "file": JsonfileName };
                resolve(responce);
            }
        });
    });
}



const readS3BucketAsync = (JsonfileName, data, cb) => {
    var result = { "err": null, "data": null, "file": JsonfileName }
    var params = { Bucket: bucketName, Key: S3filepath + JsonfileName }
    return new Promise((resolve, reject) => {
        s3.getObject(params, function (err, data) {
            if (err) {
                result["err"] = err.stack;
                resolve(result);
            }
            else {
                var json = data.Body.toString('utf-8');
                //console.log(JsonfileName, json);
                result["data"] = json;
                resolve(result);
            }
        });
    });
}

module.exports = { readS3BucketAsync: readS3BucketAsync }

$('title').html($('title').text() + " :: " + remote.getGlobal('sharedObj').currentStory.toUpperCase());

if (remote.getGlobal('sharedObj').currentStory.toUpperCase() == "DEFAULT") {
    $('body').removeClass('body-audio');
    $('body').removeClass('body-gyan');
    $('body').removeClass('body-hope');
    $('body').removeClass('body-promotion');
    $('body').removeClass('body-product');
    $('body').removeClass('body-namaste');
}
else if (remote.getGlobal('sharedObj').currentStory.toUpperCase() == "AUDIO") {
    $('body').removeClass('body-audio');
    $('body').removeClass('body-gyan');
    $('body').removeClass('body-hope');
    $('body').removeClass('body-promotion');
    $('body').removeClass('body-namaste');
    $('body').removeClass('body-product');
    $('body').addClass('body-audio');
}
else if (remote.getGlobal('sharedObj').currentStory.toUpperCase() == "GYAN") {
    $('body').removeClass('body-audio');
    $('body').removeClass('body-gyan');
    $('body').removeClass('body-hope');
    $('body').removeClass('body-promotion');
    $('body').removeClass('body-namaste');
    $('body').removeClass('body-product');
    $('body').addClass('body-gyan');
}
else if (remote.getGlobal('sharedObj').currentStory.toUpperCase() == "HOPE") {
    $('body').removeClass('body-audio');
    $('body').removeClass('body-gyan');
    $('body').removeClass('body-hope');
    $('body').removeClass('body-promotion');
    $('body').removeClass('body-namaste');
    $('body').removeClass('body-product');
    $('body').addClass('body-hope');
}
else if (remote.getGlobal('sharedObj').currentStory.toUpperCase() == "NAMASTE") {
    $('body').removeClass('body-audio');
    $('body').removeClass('body-gyan');
    $('body').removeClass('body-hope');
    $('body').removeClass('body-promotion')
    $('body').removeClass('body-product');;
    $('body').removeClass('body-namaste');
    $('body').addClass('body-namaste');
}
else if (remote.getGlobal('sharedObj').currentStory.toUpperCase() == "PROMOTION") {
    $('body').removeClass('body-audio');
    $('body').removeClass('body-gyan');
    $('body').removeClass('body-hope');
    $('body').removeClass('body-namaste');
    $('body').removeClass('body-promotion');
    $('body').removeClass('body-product');
    $('body').addClass('body-promotion');
}
else if (remote.getGlobal('sharedObj').currentStory.toUpperCase() == "PRODUCT") {
    $('body').removeClass('body-audio');
    $('body').removeClass('body-gyan');
    $('body').removeClass('body-hope');
    $('body').removeClass('body-namaste');
    $('body').removeClass('body-promotion');
    $('body').removeClass('body-product');
    $('body').addClass('body-product');
}