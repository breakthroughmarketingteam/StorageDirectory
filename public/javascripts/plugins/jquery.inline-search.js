
// Inline Search - Copyright TJ Holowaychuk <tj@vision-media.ca> (MIT Licensed)

(function($){
  
  $.search = function(elements, search, filter, lookup) {
    search = $.trim(search)
    lookup = $.search.lookups[lookup] || lookup || function(){ return this }
    filter = $.search.filters[filter] || filter || $.search.filters['by substring']
    if (!search.length) filter = function(){ return false }
    $(elements).each(function() {
      lookup.call($(this))[filter.call($(this), search) ? 'hide' : 'show']()
    })
  }
  
  $.fn.search = function(search, filter, options) {
    options = options || {}
    return $.search(this, search, filter, options.remove)
  }
  
  $.search.filters = {
    'by substring' : function(search) {
      return ! this.text().match(search)  
    },
    
    'by keyword' : function(search) {
      var words = this.text().split(' ')
      var keywords = search.split(' ')
      for (var i = 0, len = keywords.length; i < len; ++i)
        if ($.inArray(keywords[i], words) != -1)
          return false
      return true
    }
  }
  
  $.search.lookups = {
    parent : function() {
      return this.parent()
    }
  }
  
  $.search.version = '1.0.0'
  
})(jQuery)