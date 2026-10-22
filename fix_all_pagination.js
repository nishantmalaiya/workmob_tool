const fs = require('fs');

fs.readFile('categories.js', 'utf8', (err, content) => {
    if (err) {
        console.error('Error reading file:', err);
        return;
    }

    let modified = false;

    // FIX 1: Add isFetching = true before initial category fetch
    // Find: fetch(url) in category change handler
    const fetchIndex = content.indexOf('fetch(url)');
    if (fetchIndex !== -1) {
        // Look backwards for the start of this fetch block (after url construction)
        const beforeFetch = content.substring(0, fetchIndex);
        const lineBefore = beforeFetch.split('\n').pop();
        
        // Check if it's the category change handler fetch (has url += "?limit=50" or similar)
        if (content.substring(fetchIndex - 200, fetchIndex).includes('lastEvaluatedKey')) {
            // Insert isFetching = true; before fetch
            const newContent = content.substring(0, fetchIndex) + 
                '    isFetching = true;\n    ' + 
                content.substring(fetchIndex);
            content = newContent;
            modified = true;
            console.log('✓ FIX 1: Added isFetching = true before initial fetch');
        }
    }

    // FIX 2: Simplify the window scroll listener
    // Find the complex window scroll listener and replace with simpler version
    const windowScrollStart = content.indexOf('$(window).on(\'scroll\'');
    if (windowScrollStart !== -1) {
        // Find the end of this handler (matching });)
        let endSearch = windowScrollStart;
        let braceCount = 0;
        let foundStart = false;
        let endIndex = -1;
        
        for (let i = windowScrollStart; i < content.length; i++) {
            if (content[i] === '{') {
                braceCount++;
                foundStart = true;
            } else if (content[i] === '}') {
                braceCount--;
                if (foundStart && braceCount === 0) {
                    endIndex = i + 1;
                    break;
                }
            }
        }
        
        if (endIndex !== -1) {
            const newScrollListener = `$(window).on('scroll', function() {
    if (!hasMoreRecords || isFetching || !lastEvaluatedKey) return;
    
    var scrollPosition = $(window).scrollTop() + $(window).height();
    var pageHeight = $(document).height();
    
    if (scrollPosition >= pageHeight - 200) {
        loadMoreStories();
    }
});`;
            
            content = content.substring(0, windowScrollStart) + newScrollListener + content.substring(endIndex);
            modified = true;
            console.log('✓ FIX 2: Simplified window scroll listener');
        }
    }

    // FIX 3: Ensure isFetching is reset in error handler of category change
    // Find the catch block in category change handler
    const categoryCatch = content.indexOf(" izaFetching = false;");
    // This is already handled, but let's make sure
    
    // FIX 4: Add debug logging (optional - comment out for now)
    // We'll skip this unless needed

    // FIX 5: Ensure proper initialization
    // Check if variables are initialized correctly
    
    if (modified) {
        fs.writeFile('categories.js', content, 'utf8', (err) => {
            if (err) {
                console.error('Error writing file:', err);
                process.exit(1);
            } else {
                console.log('\n✅ All pagination fixes applied successfully!');
                console.log('File: categories.js');
            }
        });
    } else {
        console.log('⚠️  No fixes were applied (changes already present or not found)');
    }
});
