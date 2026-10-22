const fs = require('fs');

fs.readFile('categories.js', 'utf8', (err, content) => {
    if (err) {
        console.error('Error reading file:', err);
        return;
    }

    // Find the fetch(url) in category change handler (around line 194)
    // We need to find it after the url construction that includes "?limit=50"
    const limit50Index = content.indexOf('url += "?limit=50"');
    if (limit50Index === -1) {
        console.error('Could not find url += "?limit=50"');
        return;
    }

    // Find the next fetch(url) after this
    const fetchIndex = content.indexOf('fetch(url)', limit50Index);
    if (fetchIndex === -1) {
        console.error('Could not find fetch(url) after limit=50');
        return;
    }

    // Insert isFetching = true; before fetch(url)
    // Add proper indentation to match the surrounding code
    const beforeFetch = content.substring(0, fetchIndex);
    const afterFetch = content.substring(fetchIndex);
    
    // Add the line with proper indentation (8 spaces to match the surrounding code)
    const newLine = '        isFetching = true;\n';
    
    const newContent = beforeFetch + newLine + afterFetch;

    fs.writeFile('categories.js', newContent, 'utf8', (err) => {
        if (err) {
            console.error('Error writing file:', err);
            process.exit(1);
        } else {
            console.log('✅ SUCCESS: Added isFetching = true before category fetch');
            console.log('At line:', fetchIndex);
        }
    });
});
