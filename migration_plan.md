# S3 API Migration Plan: addStory.js

This document outlines the steps to fully migrate `addStory.js` to use S3 APIs, specifically targeting the remaining local file system (`fs`) operations which are used for loading templates and form schemas.

## Current State
The core data operations (Read, Create, Update, Delete for Stories, Categories, Indices) have already been migrated to use AWS S3 APIs via `BucketConfigurations.js`. However, the application still relies on the local file system for:
1.  **Form Schemas**: Loading JSON definitions for form fields (e.g., `Files/story.json`).
2.  **Templates**: Loading initial data structures (e.g., `Files/templateTop.json`, `Files/newStory.json`).

## Migration Steps

### 1. Upload Local Assets to S3
The following local files from the `Files/` directory need to be uploaded to the S3 bucket. We should establish a convention for where these live (e.g., under a `templates/` or `config/` prefix).

| Local File | Proposed S3 Key | Description |
| :--- | :--- | :--- |
| `Files/story.json` | `config/story_schema.json` | Defines the form fields for adding a story. |
| `Files/templateTop.json` | `config/templateTop.json` | Template for the "Top" story structure. |
| `Files/newStory.json` | `config/newStory.json` | Template for initialization of a new story object. |
| `Files/{slug}.json` | `config/{slug}_schema.json` | Any other schema files used by `RenderFields`. |

**Action**: Upload these files to the S3 bucket defined in `BucketConfigurations.js`.

### 2. Update `addStory.js` to use S3 APIs

#### A. Migrate `RenderFields` (Schema Loading)
**Current:**
```javascript
function RenderFields(slug) {
    fs.readFile(
        path.join(__dirname, "Files") + "/" + slug + ".json",
        "utf8",
        function (err, data) { ... }
    );
}
```

**Proposed:**
Change `RenderFields` to an `async` function and use `readS3BucketAsync`.
```javascript
async function RenderFields(slug) {
    // Assuming S3 path mapping for schemas
    const schemaKey = "config/" + slug + "_schema.json"; // Adjust based on S3 structure
    const result = await readS3BucketAsync(schemaKey, "");
    
    if (result.err) {
        console.error("Error loading schema from S3:", result.err);
        return;
    }
    
    var JSON_Obj = JSON.parse(result.data);
    var finalHtml = ParseToElement(JSON_Obj);
    $("#divJson").html(finalHtml.join(" "));
    // ... rest of initialization
}
```

#### B. Migrate `templateTop.json` Loading
**Current:**
```javascript
let rawdata = fs.readFileSync(path.resolve(__dirname, "Files/templateTop.json"));
let templateTop = JSON.parse(rawdata);
```

**Proposed:**
Move this logic inside the `async` function scope (e.g., inside `addStory` IIFE) or handle the promise.
```javascript
const templateResult = await readS3BucketAsync("config/templateTop.json", "");
let templateTop = {};
if (!templateResult.err) {
    templateTop = JSON.parse(templateResult.data);
}
```

#### C. Migrate `newStory.json` Loading
**Current:**
```javascript
let rawdata = fs.readFileSync(path.resolve(__dirname, "Files/newStory.json"));
var newStory = JSON.parse(rawdata);
```

**Proposed:**
Inside `#btnSave` click handler (which is already async-compatible via callback or modification):
```javascript
const newStoryResult = await readS3BucketAsync("config/newStory.json", "");
var newStory = {};
if (!newStoryResult.err) {
    newStory = JSON.parse(newStoryResult.data);
}
```

### 3. Update Documentation
Update `addStory_flow.md` to remove references to "simulating S3 bucket behavior" and instead state that it "Interacts directly with AWS S3 for data and configuration storage."

## Benefits
- **Dynamic Updates**: Form schemas and templates can be updated on S3 without requiring a new build/deployment of the Electron app.
- **Consistency**: All data and configuration retrieval uses a single mechanism (S3).
- **Removal of Node Integration Dependency**: Reduces reliance on `fs` and Node.js integration in the renderer, which is a security best practice (though `electron/remote` is still used).
