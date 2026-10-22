import re

# Read the file
with open('categories.js', 'r') as f:
    content = f.read()

# Find and replace the scroll listener
old_listener = """// Scroll listener for divStory to load more stories
$('#divStory').on('scroll', function() {
    if (!hasMoreRecords || isFetching || !lastEvaluatedKey) return;
    
    var target = this;
    var scrollPos = Math.ceil(target.scrollTop + target.clientHeight);
    var scrollHeight = target.scrollHeight;
    
    if (scrollPos >= scrollHeight - 200) {
        loadMoreStories();
    }
});"""

new_listener = """// Window scroll listener for infinite scroll pagination on stories
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
});"""

# Replace
if old_listener in content:
    content = content.replace(old_listener, new_listener)
    with open('categories.js', 'w') as f:
        f.write(content)
    print('SUCCESS: Scroll listener updated to use window scroll')
else:
    print('ERROR: Could not find the old scroll listener')
    # Try to find it with partial match
    if "$('#divStory').on('scroll'" in content:
        print('Partial match found - attempting manual replacement...')
        # Find the start and end
        start = content.find("// Scroll listener for divStory")
        end = content.find("});", start) + 3
        if start != -1 and end != -1:
            # Replace from start to end
            before = content[:start]
            after = content[end:]
            content = before + new_listener + after
            with open('categories.js', 'w') as f:
                f.write(content)
            print('SUCCESS: Replaced using manual method')
        else:
            print('Could not find boundaries')
    else:
        print('Listener not found at all')
