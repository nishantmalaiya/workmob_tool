const fs = require('fs');

fs.readFile('categories.js', 'utf8', (err, content) => {
    if (err) {
        console.error('Error reading file:', err);
        return;
    }

    // Find the search HTML template string
    const templateStart = 'const searchHTML = `\n<div style="';
    const startIdx = content.indexOf(templateStart);
    
    if (startIdx === -1) {
        console.error('Could not find search HTML template');
        return;
    }
    
    // Find the end of the template string
    const templateEnd = '`;\n\n$("#ddlCategory").after(searchHTML);';
    const endIdx = content.indexOf(templateEnd, startIdx);
    
    if (endIdx === -1) {
        console.error('Could not find end of search HTML template');
        return;
    }
    
    // Create new HTML with flexbox layout
    const newHTML = `const searchHTML = \`
<div style="display: flex; align-items: center; gap: 10px; margin-top: 10px;">
    <div style="flex: 1;"></div>
    <input type="text" id="searchBox" placeholder="Search by slug (e.g., akta-sehgal-education-academia)" 
           style="padding: 8px; width: 300px; border: 1px solid #ddd; border-radius: 4px;">
    <button id="searchBtn" style="padding: 8px 16px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">
        Search
    </button>
    <button id="clearSearchBtn" style="padding: 8px 16px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer;">
        Clear
    </button>
</div>
\`;`;

    // Replace the template string
    const before = content.substring(0, startIdx);
    const after = content.substring(endIdx + templateEnd.length - 3); // -3 to account for the `; at end
    
    const newContent = before + newHTML + '\n\n$("#ddlCategory").after(searchHTML);' + after;
    
    // Also change the insert method to use parent
    const insertLine = '\n$("#ddlCategory").after(searchHTML);';
    const newInsertLine = '\n$("#ddlCategory").parent().append(searchHTML);';
    
    const finalContent = newContent.replace(insertLine, newInsertLine);
    
    fs.writeFile('categories.js', finalContent, 'utf8', (err) => {
        if (err) {
            console.error('Error writing file:', err);
            process.exit(1);
        } else {
            console.log('✅ Search box aligned to right of categories dropdown');
            console.log('Changes:');
            console.log('  - Wrapped in flex container with display: flex');
            console.log('  - Added flex: 1 spacer div to push search to right');
            console.log('  - Used gap: 10px for consistent spacing');
            console.log('  - Changed insert method to parent().append()');
        }
    });
});
