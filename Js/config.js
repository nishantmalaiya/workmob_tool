var remote = require('@electron/remote');
let serverPaths = {
    "story-detail": "story-detail/",
    "category-index": "category-index/",
    category: "categories",
    MasterIndex: "MasterIndex.json",
    "blog-home": "stories-blog-home",
    "mobile-home": "stories-mobile-home",
    "stories-top": "stories-top",
    trending: "stories-trending",
    config: "add-config",
    instructor: "instructor.js",
    instructorPath: "instructor/",
    productPath: "product/",
    subcategory: "sub-category.json",
    subcategoryPath: "subcategory/",
    "stories-hope": "stories-hope.json",
    "stories-gyan": "stories-gyan.json",
    "stories-namaste": "stories-namaste.json",
    "stories-promotion": "stories-promotion.json",
    "tags": "tags",
    TagsMaster: "tags_master.json",
    "location": "locations",
    "organisation": "organisations"
};
let serverPaths_audio = {
    "story-detail": "audio-story-detail/",
    "category-index": "audio-category-index/",
    category: "audio-category",
    MasterIndex: "audio-MasterIndex.json",
    "blog-home": "add-audio-blog-home",
    "mobile-home": "add-audio-mobile-home",
    "stories-top": "audio-stories-top.json",
    trending: "add-audio-trending",
    config: "audio-config.json",
    instructor: "instructor.js",
    instructorPath: "instructor/",
    productPath: "product/",
    subcategory: "sub-audio-category.json",
    subcategoryPath: "audiosubcategory/",
    "stories-hope": "add-audio-stories-hope.json",
    "stories-gyan": "add-audio-stories-gyan.json",
    "stories-namaste": "add-audio-stories-namaste.json",
    "stories-promotion": "add-audio-stories-promotion.json",
    "tags": "tags-audio",
    TagsMaster: "tags_master.json",
    "location": "locations-audio",
    "organisation": "organisations-audio"
};
let serverPaths_gyan = {
    "story-detail": "gyan-story-detail/",
    "category-index": "gyan-category-index/",
    category: "gyan-category.json",
    MasterIndex: "gyan-MasterIndex.json",
    "blog-home": "add-gyan-blog-home",
    "mobile-home": "add-gyan-mobile-home",
    "stories-top": "add-gyan-stories-top",
    trending: "add-gyan-trending",
    config: "gyan-config.json",
    instructor: "instructor.js",
    instructorPath: "instructor/",
    productPath: "product/",
    subcategory: "sub-gyan-category.json",
    subcategoryPath: "gyansubcategory/",
    "stories-hope": "add-gyan-stories-hope.json",
    "stories-gyan": "add-gyan-stories-gyan.json",
    "stories-namaste": "add-gyan-stories-namaste.json",
    "stories-promotion": "add-promotion-stories-promotion.json",
    "tags": "tags-gyan",
    TagsMaster: "tags_master.json",
    "location": "locations-gyan",
    "organisation": "organisations-gyan"
};
let serverPaths_promotion = {
    "story-detail": "promotion-story-detail/",
    "category-index": "promotion-category-index/",
    category: "promotion-category.json",
    MasterIndex: "promotion-MasterIndex.json",
    "blog-home": "promotion-blog-home.json",
    "mobile-home": "promotion-mobile-home.json",
    "stories-top": "promotion-stories-top.json",
    trending: "promotion-trending.json",
    config: "promotion-config.json",
    instructor: "instructor.js",
    instructorPath: "instructor/",
    productPath: "product/",
    subcategory: "sub-promotion-category.json",
    subcategoryPath: "promotionsubcategory/",
    "stories-hope": "add-promotion-stories-hope.json",
    "stories-gyan": "add-promotion-stories-gyan.json",
    "stories-promotion": "add-promotion-stories-promotion.json",
    "stories-namaste": "add-promotion-stories-namaste.json",
    "tags": "tags-promotion",
    TagsMaster: "tags_master.json",
    "location": "locations-promotion",
    "organisation": "organisations-promotion"
};
let serverPaths_hope = {
    "story-detail": "hope-story-detail/",
    "category-index": "hope-category-index/",
    category: "hope-category.json",
    MasterIndex: "hope-MasterIndex.json",
    "blog-home": "add-hope-blog-home",
    "mobile-home": "add-hope-mobile-home",
    "stories-top": "add-hope-stories-top",
    trending: "add-hope-trending",
    config: "hope-config.json",
    instructor: "instructor.js",
    instructorPath: "instructor/",
    productPath: "product/",
    subcategory: "sub-hope-category.json",
    subcategoryPath: "hopesubcategory/",
    "stories-hope": "add-hope-stories-hope.json",
    "stories-gyan": "add-hope-stories-gyan.json",
    "stories-namaste": "add-hope-stories-namaste.json",
    "stories-promotion": "add-hope-stories-promotion.json",
    "tags": "tags-hope",
    TagsMaster: "tags_master.json",
    "location": "locations-hope",
    "organisation": "organisations-hope"
};
let serverPaths_namaste = {
    "story-detail": "namaste-story-detail/",
    "category-index": "namaste-category-index/",
    category: "namaste-category.json",
    MasterIndex: "namaste-MasterIndex.json",
    "blog-home": "add-namaste-blog-home",
    "mobile-home": "add-namaste-mobile-home",
    "stories-top": "add-namaste-stories-top",
    trending: "add-namaste-trending",
    config: "namaste-config.json",
    instructor: "instructor.js",
    instructorPath: "instructor/",
    productPath: "product/",
    subcategory: "sub-namaste-category.json",
    subcategoryPath: "namastesubcategory/",
    "stories-hope": "add-namaste-stories-hope.json",
    "stories-gyan": "add-namaste-stories-gyan.json",
    "stories-namaste": "add-namaste-stories-namaste.json",
    "stories-promotion": "add-namaste-stories-promotion.json",
    "tags": "tags-namaste",
    TagsMaster: "tags_master.json",
    "location": "locations-namaste",
    "organisation": "organisations-namaste"
};
let serverPaths_product = {
    "story-detail": "",
    "category-index": "product-category-index/",
    category: "product-category.json",
    MasterIndex: "",
    "blog-home": "",
    "mobile-home": "",
    "stories-top": "",
    trending: "",
    config: "",
    instructor: "instructor.js",
    instructorPath: "instructor/",
    productPath: "product/",
    subcategory: "sub-product-category.json",
    subcategoryPath: "productsubcategory/",
    "stories-hope": "",
    "stories-gyan": "",
    "stories-promotion": "",
    "stories-namaste": "",
    "tags": "",
    TagsMaster: "tags_master.json",
    "location": "",
    "organisation": ""
};
const switchPath = () => {
    var type = remote.getGlobal("sharedObj").currentStory;
    switch (type) {
        case "audio":
            remote.getGlobal("sharedObj").currentStory = "audio";
            break;
        case "gyan":
            remote.getGlobal("sharedObj").currentStory = "gyan";
            break;
        case "hope":
            remote.getGlobal("sharedObj").currentStory = "hope";
            break;
        case "namaste":
            remote.getGlobal("sharedObj").currentStory = "namaste";
            break;
        case "promotion":
            remote.getGlobal("sharedObj").currentStory = "promotion";
            break;
        case "product":
            remote.getGlobal("sharedObj").currentStory = "product";
            break;
        default:
            remote.getGlobal("sharedObj").currentStory = "default";
            break;
    }
};
const getS3Path = (type) => {
    var type = remote.getGlobal("sharedObj").currentStory;
    switch (type) {
        case "audio":
            return serverPaths_audio;
            break;
        case "gyan":
            return serverPaths_gyan;
            break;
        case "hope":
            return serverPaths_hope;
            break;
        case "namaste":
            return serverPaths_namaste;
            break;
        case "promotion":
            return serverPaths_promotion;
            break;
        case "product":
            return serverPaths_product;
            break;
        default:
            return serverPaths;
            break;
    }
};
const API_BASE_URL = "https://r5dojmizdd.execute-api.ap-south-1.amazonaws.com/prod";
module.exports = { switchPath: switchPath, getS3Path: getS3Path, API_BASE_URL: API_BASE_URL };

//done
