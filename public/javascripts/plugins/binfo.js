var browserSniff = {
	code_name : function() {
	    return navigator.appCodeName;
	},
	browser_name : function() {
	    return navigator.appName;
	},
	app_version : function() {
	    return navigator.appVersion;
	},
	user_agent : function() {
	    return navigator.userAgent;
	},
	version_major : function() {
	    return parseInt(navigator.appVersion, 10);
	},
	version_minor : function() {
	    var app_ver = navigator.appVersion,
			version_major = parseInt(app_ver, 10), 
			pos, version_minor = 0;
		
	    if ((pos = app_ver.indexOf("MSIE")) != -1)
	    	version_minor = parseFloat(app_ver.substring(pos + 5, app_ver.length));
	    else if (navigator.appName == "Netscape" && (version_major == 3 || version_major == 4))
	    	version_minor = parseFloat(app_ver);
		
	    return version_minor;
	},
	java_enabled : function() {
	    if (this.browser_name() == "Microsoft" && verMajor == 4 && navigator.javaEnabled()) // calls function browser_name [above]
	    	return "Yes (sort of ..)";
	    else if (navigator.javaEnabled()) // PRESUME N2 N3 E3
	    	return "Yes";
	    else
	    	return "No";
	},
	screen_width : function() {
	    if (window.screen) // v4 browsers
	    	return screen.width;
	    else if (navigator.javaEnabled()) { // Presume N2 N3 N4 E3
	        var toolkit = java.awt.Toolkit.getDefaultToolkit(),
	        	screen_size = toolkit.getScreenSize();
	        return screen_size.width;
	    }
	    return 0;
	},
	screen_height : function() {
	    if (window.screen) // v4 browsers
	    	return screen.height;
	    else if (navigator.javaEnabled()) { // Presume N2 N3 N4 E3
	        var toolkit = java.awt.Toolkit.getDefaultToolkit(),
	        	screen_size = toolkit.getScreenSize();
	        return screen_size.height;
	    }
	    return 0;
	},
	color_depth : function() {
	    var color_depth, bits = 0;
	    if (window.screen) {
	        bits = screen.colorDepth; // DEAL WITH BUG IN NETSCAPE 4
	        bits = ((bits == 14 || bits == 18) && bname == "Netscape") ? bits - 10: bits;
	        color_depth = bits + " bits per pixel";
	
	    } else color_depth = "Only available on browsers v4 or greater";
		
	    if (bits == 4)
	    	color_depth += " (16 colors)";
	    else if (bits == 8)
	    	color_depth += " (256 colors)";
	    else if (bits == 16)
	    	color_depth += " (65,536 colors -- High Color)";
	    else if (bits == 24)
	    	color_depth += " (16,777,216 colors -- True Color)";
	    else if (bits == 32)
	    	color_depth += " (16,777,216 colors -- True Color [_not_ 4,294,967,296 colors!])";
	
	    return color_depth;
	},
	inner_width : function() {
	    if (document.all)
	    	return document.body.clientWidth;
	    else if (document.layers)
	    	return window.innerWidth;
	    else
	    	return 0;
	},
	inner_height : function() {
	    if (document.all)
	    	return document.body.clientHeight;
	    else if (document.layers)
	    	return window.innerHeight;
	    else
	    	return 0;
	},
	window_left : function() {
	    if (document.all)
	    	return document.body.scrollLeft;
	    else if (document.layers)
	    	return pageXOffset;
	    else
	    	return 0;
	},
	window_top : function() {
	    if (document.all)
	    	return document.body.scrollTop;
	    else if (document.layers)
	    	return pageYOffset;
	    else
	    	return 0;
	}, 
	lang : function() {
	    if (typeof(navigator.userLanguage) == "string")
	    	return navigator.userLanguage;
	    else if (typeof(navigator.language) == "string")
	    	return navigator.language;
	   
	 	return '';
	},
	platform : function() {
	    if (typeof(navigator.platform) == "string")
	    	return navigator.platform;
	    
		return '';
	},
	referrer : function() {
	    if (self == top)
	    	return document.referrer;
	    else
	    	return parent.document.referrer;
	},
	doc_name : function() {
	    return document.URL;
	},
	lastmod : function() {
	    return document.lastModified;
	},
	os : function() {
	    if (navigator.userAgent.indexOf("Unix") != -1)
	    	return "Unix";
	    else if (navigator.userAgent.indexOf("Linux") != -1)
	    	return "Linux";
	    else if (navigator.userAgent.indexOf("NT") != -1)
	    	return "Windows NT";
	    else if (navigator.userAgent.indexOf("95") != -1)
	    	return "Windows 95";
	    else if (navigator.userAgent.indexOf("16") != -1)
	    	return "Windows v3.1x";
	    else if (navigator.userAgent.indexOf("Win") != -1)
	    	return "Windows v3.1 or NT";
	    else if (navigator.userAgent.indexOf("PPC") != -1)
	    	return "Macintosh Power PC";
	    else if (navigator.userAgent.indexOf("Mac") != -1)
	    	return "Macintosh";
	    else
	    	return "Not Detected";
	}
	// plus a few other:
	//    document.title
	//    document.domain
	// printed directly by the document.writeln method
}

$.browserVars = function() {
	var out = '';
	for (key in browserSniff)
		if (browserSniff.hasOwnProperty(key)) 
			out += key +': '+ browserSniff[key]() + "\n";
	return out;
}