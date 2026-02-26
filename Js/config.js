var remote = require('@electron/remote');
let serverPaths = {
    "story-detail": "story-detail/",
    "category-index": "category-index/",
    category: "category.json",
    MasterIndex: "MasterIndex.json",
    "blog-home": "blog-home.json",
    "mobile-home": "mobile-home.json",
    "stories-top": "stories-top.json",
    trending: "trending.json",
    config: "config.json",
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
    category: "audio-category.json",
    MasterIndex: "audio-MasterIndex.json",
    "blog-home": "audio-blog-home.json",
    "mobile-home": "audio-mobile-home.json",
    "stories-top": "audio-stories-top.json",
    trending: "audio-trending.json",
    config: "audio-config.json",
    instructor: "instructor.js",
    instructorPath: "instructor/",
    productPath: "product/",
    subcategory: "sub-audio-category.json",
    subcategoryPath: "audiosubcategory/",
    "stories-hope": "audio-stories-hope.json",
    "stories-gyan": "audio-stories-gyan.json",
    "stories-namaste": "audio-stories-namaste.json",
    "stories-promotion": "audio-stories-promotion.json",
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
    "blog-home": "gyan-blog-home.json",
    "mobile-home": "gyan-mobile-home.json",
    "stories-top": "gyan-stories-top.json",
    trending: "gyan-trending.json",
    config: "gyan-config.json",
    instructor: "instructor.js",
    instructorPath: "instructor/",
    productPath: "product/",
    subcategory: "sub-gyan-category.json",
    subcategoryPath: "gyansubcategory/",
    "stories-hope": "gyan-stories-hope.json",
    "stories-gyan": "gyan-stories-gyan.json",
    "stories-namaste": "gyan-stories-namaste.json",
    "stories-promotion": "promotion-stories-promotion.json",
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
    "stories-hope": "promotion-stories-hope.json",
    "stories-gyan": "promotion-stories-gyan.json",
    "stories-promotion": "promotion-stories-promotion.json",
    "stories-namaste": "promotion-stories-namaste.json",
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
    "blog-home": "hope-blog-home.json",
    "mobile-home": "hope-mobile-home.json",
    "stories-top": "hope-stories-top.json",
    trending: "hope-trending.json",
    config: "hope-config.json",
    instructor: "instructor.js",
    instructorPath: "instructor/",
    productPath: "product/",
    subcategory: "sub-hope-category.json",
    subcategoryPath: "hopesubcategory/",
    "stories-hope": "hope-stories-hope.json",
    "stories-gyan": "hope-stories-gyan.json",
    "stories-namaste": "hope-stories-namaste.json",
    "stories-promotion": "hope-stories-promotion.json",
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
    "blog-home": "namaste-blog-home.json",
    "mobile-home": "namaste-mobile-home.json",
    "stories-top": "namaste-stories-top.json",
    trending: "namaste-trending.json",
    config: "namaste-config.json",
    instructor: "instructor.js",
    instructorPath: "instructor/",
    productPath: "product/",
    subcategory: "sub-namaste-category.json",
    subcategoryPath: "namastesubcategory/",
    "stories-hope": "namaste-stories-hope.json",
    "stories-gyan": "namaste-stories-gyan.json",
    "stories-namaste": "namaste-stories-namaste.json",
    "stories-promotion": "namaste-stories-promotion.json",
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
module.exports = { switchPath: switchPath, getS3Path: getS3Path };

//done
