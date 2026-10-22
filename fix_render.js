const fs = require('fs');

fs.readFile('categories.js', 'utf8', (err, content) => {
    if (err) {
        console.error('Error reading file:', err);
        return;
    }

    // Find the broken RenderStory function
    const renderStart = content.indexOf('function RenderStory(JSON_ObjBrow) {');
    
    if (renderStart === -1) {
        console.error('Could not find RenderStory function');
        return;
    }
    
    // Find the end - look for the pattern that marks the end
    const renderEndPattern = content.indexOf('function RenderStory_Old', renderStart);
    
    if (renderEndPattern === -1) {
        console.error('Could not find end of RenderStory');
        return;
    }
    
    // Create the correct RenderStory function
    const newRender = `function RenderStory(JSON_ObjBrow) {
    var storyCard = [];
    for (let index = 0; index < JSON_ObjBrow.length; index++) {
        var _story = JSON_ObjBrow[index];
        storyCard.push("<div class=\"storycard col-md-12 row column\" draggable=\"true\" id=\"" + _story.slug + "\">");
        storyCard.push("<div class=\"col-md-1\">" + (parseInt(index) + 1) + " <input type=\"checkbox\" value=\"" + _story.slug + "\"> &nbsp <img class=\"storythumb\" src=\"" + _story.thumb + "\" alt=\"" + _story.name + "\">" + "</div>");
        storyCard.push("<div class=\"col-md-4\">" + _story.storyHeading + "</div>");
        storyCard.push("<div class=\"col-md-2\">" + _story.industry + "</div>");
        storyCard.push("<div class=\"col-md-1\">" + _story.location + "</div>");
        storyCard.push("<div class=\"col-md-2\">");
        storyCard.push("<a name=\"Detail\" href=\"#\" data-id=\"" + _story.slug + "\">Detail</a> | ");
        storyCard.push("<a href=\"#\" onclick=\"deleteStory('" + _story.slug + "')\">Remove</a> | ");
        storyCard.push("<button onclick=\"showOrderInput('" + _story.slug + "', " + (index + 1) + ")\" style=\"background:none;border:none;color:#2196F3;cursor:pointer;\">Update Order</button>");
        storyCard.push("</div>");
        storyCard.push("<div class=\"col-md-2\">");
        storyCard.push("<span id=\"order-" + _story.slug + "\">" + (parseInt(index) + 1) + "</span>");
        storyCard.push("<input type=\"number\" id=\"order-input-" + _story.slug + "\" data-slug=\"" + _story.slug + "\" data-index=\"" + (index + 1) + "\" style=\"display:none;width:60px;padding:4px;border:1px solid #ddd;border-radius:4px;\">");
        storyCard.push("<button id=\"save-order-" + _story.slug + "\" onclick=\"saveSingleOrder('" + _story.slug + "')\" style=\"display:none;background:#4CAF50;color:white;border:none;border-radius:4px;padding:4px 8px;cursor:pointer;margin-left:5px;\">Save</button>");
        storyCard.push("</div>");
        storyCard.push("<hr class=\"storyHr\">" + "</div>");
    }
    return storyCard;
}`;

    const before = content.substring(0, renderStart);
    const after = content.substring(renderEndPattern);
    
    const newContent = before + newRender + '\n\n' + after;
    
    fs.writeFile('categories.js', newContent, 'utf8', (err) => {
        if (err) {
            console.error('Error writing file:', err);
            process.exit(1);
        } else {
            console.log('✅ RenderStory function fixed');
        }
    });
});
