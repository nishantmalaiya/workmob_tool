const fs = require('fs');

fs.readFile('categories.js', 'utf8', (err, content) => {
    if (err) {
        console.error('Error reading file:', err);
        return;
    }
    
    const startIndex = content.indexOf('Scroll listener for divStory');
    const endIndex = content.indexOf('});', startIndex) + 3;
    
    if (startIndex === -1 || endIndex === -1) {
        console.error('Could not find the scroll listener boundaries');
        return;
    }
    
    const before = content.substring(0, startIndex);
    const after = content.substring(endIndex);
    
    const newListener = `// Window scroll listener for infinite scroll pagination on stories
// Works whether #divStory has overflow or not
$(window).on('scroll', function() {
    if (!hasMoreRecords || isFetching || !lastEvaluatedKey) return;
    
    var $divStory = $('#divStory');
    if ($divStory.length === 0) return;
    
    // Check if #divStory is visible in viewport
    var divStoryOffset = $divStory.offset();
    var windowScrollTop = $(window).scrollTop();
    var windowHeight = $(window).height();
    
    // If #divStory is at least partially visible
    if (divStoryOffset.top < windowScrollTop + windowHeight && 
        divStoryOffset.top + $divStory.outerHeight() > windowScrollTop) {
        
        // If #divStory has scrollable content, check its scroll position
        var scrollHeight = $divStory[0].scrollHeight;
        var clientHeight = $divStory[0].clientHeight;
        
        if (scrollHeight > clientHeight) {
            // Has overflow - check if scrolled near bottom of #divStory
            var scrollTop = $divStory.scrollTop();
            if (scrollTop + clientHeight >= scrollHeight - 200) {
                loadMoreStories();
            }
        } else {
            // No overflow - check if scrolled near bottom of page
            var documentHeight = $(document).height();
            if (windowScrollTop + windowHeight >= documentHeight - 200) {
                loadMoreStories();
            }
        }
    }
});`;
    
    const newContent = before + newListener + after;
    
    fs.writeFile('categories.js', newContent, 'utf8', (err) => {
        if (err) {
            console.error('Error writing file:', err);
            process.exit(1);
        } else {
            console.log('SUCCESS: Scroll listener updated to use window scroll');
            console.log('Start index:', startIndex);
            console.log('End index:', endIndex);
            console.log('Old length:', endIndex - startIndex);
            console.log('New length:', newListener.length);
        }
    });
});
