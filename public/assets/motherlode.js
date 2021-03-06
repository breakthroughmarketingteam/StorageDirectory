/*!	SWFObject v2.0 <http://code.google.com/p/swfobject/>
	Copyright (c) 2007 Geoff Stearns, Michael Williams, and Bobby van der Sluis
	This software is released under the MIT License <http://www.opensource.org/licenses/mit-license.php>
*/

var swfobject = function() {
	
	var UNDEF = "undefined",
		OBJECT = "object",
		SHOCKWAVE_FLASH = "Shockwave Flash",
		SHOCKWAVE_FLASH_AX = "ShockwaveFlash.ShockwaveFlash",
		FLASH_MIME_TYPE = "application/x-shockwave-flash",
		EXPRESS_INSTALL_ID = "SWFObjectExprInst",
		
		win = window,
		doc = document,
		nav = navigator,
		
		domLoadFnArr = [],
		regObjArr = [],
		timer = null,
		storedAltContent = null,
		storedAltContentId = null,
		isDomLoaded = false,
		isExpressInstallActive = false;
	
	/* Centralized function for browser feature detection
		- Proprietary feature detection (conditional compiling) is used to detect Internet Explorer's features
		- User agent string detection is only used when no alternative is possible
		- Is executed directly for optimal performance
	*/	
	var ua = function() {
		var w3cdom = typeof doc.getElementById != UNDEF && typeof doc.getElementsByTagName != UNDEF && typeof doc.createElement != UNDEF && typeof doc.appendChild != UNDEF && typeof doc.replaceChild != UNDEF && typeof doc.removeChild != UNDEF && typeof doc.cloneNode != UNDEF,
			playerVersion = [0,0,0],
			d = null;
		if (typeof nav.plugins != UNDEF && typeof nav.plugins[SHOCKWAVE_FLASH] == OBJECT) {
			d = nav.plugins[SHOCKWAVE_FLASH].description;
			if (d) {
				d = d.replace(/^.*\s+(\S+\s+\S+$)/, "$1");
				playerVersion[0] = parseInt(d.replace(/^(.*)\..*$/, "$1"), 10);
				playerVersion[1] = parseInt(d.replace(/^.*\.(.*)\s.*$/, "$1"), 10);
				playerVersion[2] = /r/.test(d) ? parseInt(d.replace(/^.*r(.*)$/, "$1"), 10) : 0;
			}
		}
		else if (typeof win.ActiveXObject != UNDEF) {
			var a = null, fp6Crash = false;
			try {
				a = new ActiveXObject(SHOCKWAVE_FLASH_AX + ".7");
			}
			catch(e) {
				try { 
					a = new ActiveXObject(SHOCKWAVE_FLASH_AX + ".6");
					playerVersion = [6,0,21];
					a.AllowScriptAccess = "always";  // Introduced in fp6.0.47
				}
				catch(e) {
					if (playerVersion[0] == 6) {
						fp6Crash = true;
					}
				}
				if (!fp6Crash) {
					try {
						a = new ActiveXObject(SHOCKWAVE_FLASH_AX);
					}
					catch(e) {}
				}
			}
			if (!fp6Crash && a) { // a will return null when ActiveX is disabled
				try {
					d = a.GetVariable("$version");  // Will crash fp6.0.21/23/29
					if (d) {
						d = d.split(" ")[1].split(",");
						playerVersion = [parseInt(d[0], 10), parseInt(d[1], 10), parseInt(d[2], 10)];
					}
				}
				catch(e) {}
			}
		}
		var u = nav.userAgent.toLowerCase(),
			p = nav.platform.toLowerCase(),
			webkit = /webkit/.test(u) ? parseFloat(u.replace(/^.*webkit\/(\d+(\.\d+)?).*$/, "$1")) : false, // returns either the webkit version or false if not webkit
			ie = false,
			windows = p ? /win/.test(p) : /win/.test(u),
			mac = p ? /mac/.test(p) : /mac/.test(u);
		/*@cc_on
			ie = true;
			@if (@_win32)
				windows = true;
			@elif (@_mac)
				mac = true;
			@end
		@*/
		return { w3cdom:w3cdom, pv:playerVersion, webkit:webkit, ie:ie, win:windows, mac:mac };
	}();

	/* Cross-browser onDomLoad
		- Based on Dean Edwards' solution: http://dean.edwards.name/weblog/2006/06/again/
		- Will fire an event as soon as the DOM of a page is loaded (supported by Gecko based browsers - like Firefox -, IE, Opera9+, Safari)
	*/ 
	var onDomLoad = function() {
		if (!ua.w3cdom) {
			return;
		}
		addDomLoadEvent(main);
		if (ua.ie && ua.win) {
			try {  // Avoid a possible Operation Aborted error
				doc.write("<scr" + "ipt id=__ie_ondomload defer=true src=//:></scr" + "ipt>"); // String is split into pieces to avoid Norton AV to add code that can cause errors 
				var s = getElementById("__ie_ondomload");
				if (s) {
					s.onreadystatechange = function() {
						if (this.readyState == "complete") {
							this.parentNode.removeChild(this);
							callDomLoadFunctions();
						}
					};
				}
			}
			catch(e) {}
		}
		if (ua.webkit && typeof doc.readyState != UNDEF) {
			timer = setInterval(function() { if (/loaded|complete/.test(doc.readyState)) { callDomLoadFunctions(); }}, 10);
		}
		if (typeof doc.addEventListener != UNDEF) {
			doc.addEventListener("DOMContentLoaded", callDomLoadFunctions, null);
		}
		addLoadEvent(callDomLoadFunctions);
	}();
	
	function callDomLoadFunctions() {
		if (isDomLoaded) {
			return;
		}
		if (ua.ie && ua.win) { // Test if we can really add elements to the DOM; we don't want to fire it too early
			var s = createElement("span");
			try { // Avoid a possible Operation Aborted error
				var t = doc.getElementsByTagName("body")[0].appendChild(s);
				t.parentNode.removeChild(t);
			}
			catch (e) {
				return;
			}
		}
		isDomLoaded = true;
		if (timer) {
			clearInterval(timer);
			timer = null;
		}
		var dl = domLoadFnArr.length;
		for (var i = 0; i < dl; i++) {
			domLoadFnArr[i]();
		}
	}
	
	function addDomLoadEvent(fn) {
		if (isDomLoaded) {
			fn();
		}
		else { 
			domLoadFnArr[domLoadFnArr.length] = fn; // Array.push() is only available in IE5.5+
		}
	}
	
	/* Cross-browser onload
		- Based on James Edwards' solution: http://brothercake.com/site/resources/scripts/onload/
		- Will fire an event as soon as a web page including all of its assets are loaded 
	 */
	function addLoadEvent(fn) {
		if (typeof win.addEventListener != UNDEF) {
			win.addEventListener("load", fn, false);
		}
		else if (typeof doc.addEventListener != UNDEF) {
			doc.addEventListener("load", fn, false);
		}
		else if (typeof win.attachEvent != UNDEF) {
			win.attachEvent("onload", fn);
		}
		else if (typeof win.onload == "function") {
			var fnOld = win.onload;
			win.onload = function() {
				fnOld();
				fn();
			};
		}
		else {
			win.onload = fn;
		}
	}
	
	/* Main function
		- Will preferably execute onDomLoad, otherwise onload (as a fallback)
	*/
	function main() { // Static publishing only
		var rl = regObjArr.length;
		for (var i = 0; i < rl; i++) { // For each registered object element
			var id = regObjArr[i].id;
			if (ua.pv[0] > 0) {
				var obj = getElementById(id);
				if (obj) {
					regObjArr[i].width = obj.getAttribute("width") ? obj.getAttribute("width") : "0";
					regObjArr[i].height = obj.getAttribute("height") ? obj.getAttribute("height") : "0";
					if (hasPlayerVersion(regObjArr[i].swfVersion)) { // Flash plug-in version >= Flash content version: Houston, we have a match!
						if (ua.webkit && ua.webkit < 312) { // Older webkit engines ignore the object element's nested param elements
							fixParams(obj);
						}
						setVisibility(id, true);
					}
					else if (regObjArr[i].expressInstall && !isExpressInstallActive && hasPlayerVersion("6.0.65") && (ua.win || ua.mac)) { // Show the Adobe Express Install dialog if set by the web page author and if supported (fp6.0.65+ on Win/Mac OS only)
						showExpressInstall(regObjArr[i]);
					}
					else { // Flash plug-in and Flash content version mismatch: display alternative content instead of Flash content
						displayAltContent(obj);
					}
				}
			}
			else {  // If no fp is installed, we let the object element do its job (show alternative content)
				setVisibility(id, true);
			}
		}
	}
	
	/* Fix nested param elements, which are ignored by older webkit engines
		- This includes Safari up to and including version 1.2.2 on Mac OS 10.3
		- Fall back to the proprietary embed element
	*/
	function fixParams(obj) {
		var nestedObj = obj.getElementsByTagName(OBJECT)[0];
		if (nestedObj) {
			var e = createElement("embed"), a = nestedObj.attributes;
			if (a) {
				var al = a.length;
				for (var i = 0; i < al; i++) {
					if (a[i].nodeName.toLowerCase() == "data") {
						e.setAttribute("src", a[i].nodeValue);
					}
					else {
						e.setAttribute(a[i].nodeName, a[i].nodeValue);
					}
				}
			}
			var c = nestedObj.childNodes;
			if (c) {
				var cl = c.length;
				for (var j = 0; j < cl; j++) {
					if (c[j].nodeType == 1 && c[j].nodeName.toLowerCase() == "param") {
						e.setAttribute(c[j].getAttribute("name"), c[j].getAttribute("value"));
					}
				}
			}
			obj.parentNode.replaceChild(e, obj);
		}
	}
	
	/* Fix hanging audio/video threads and force open sockets and NetConnections to disconnect
		- Occurs when unloading a web page in IE using fp8+ and innerHTML/outerHTML
		- Dynamic publishing only
	*/
	function fixObjectLeaks(id) {
		if (ua.ie && ua.win && hasPlayerVersion("8.0.0")) {
			win.attachEvent("onunload", function () {
				var obj = getElementById(id);
				if (obj) {
					for (var i in obj) {
						if (typeof obj[i] == "function") {
							obj[i] = function() {};
						}
					}
					obj.parentNode.removeChild(obj);
				}
			});
		}
	}
	
	/* Show the Adobe Express Install dialog
		- Reference: http://www.adobe.com/cfusion/knowledgebase/index.cfm?id=6a253b75
	*/
	function showExpressInstall(regObj) {
		isExpressInstallActive = true;
		var obj = getElementById(regObj.id);
		if (obj) {
			if (regObj.altContentId) {
				var ac = getElementById(regObj.altContentId);
				if (ac) {
					storedAltContent = ac;
					storedAltContentId = regObj.altContentId;
				}
			}
			else {
				storedAltContent = abstractAltContent(obj);
			}
			if (!(/%$/.test(regObj.width)) && parseInt(regObj.width, 10) < 310) {
				regObj.width = "310";
			}
			if (!(/%$/.test(regObj.height)) && parseInt(regObj.height, 10) < 137) {
				regObj.height = "137";
			}
			doc.title = doc.title.slice(0, 47) + " - Flash Player Installation";
			var pt = ua.ie && ua.win ? "ActiveX" : "PlugIn",
				dt = doc.title,
				fv = "MMredirectURL=" + win.location + "&MMplayerType=" + pt + "&MMdoctitle=" + dt,
				replaceId = regObj.id;
			// For IE when a SWF is loading (AND: not available in cache) wait for the onload event to fire to remove the original object element
			// In IE you cannot properly cancel a loading SWF file without breaking browser load references, also obj.onreadystatechange doesn't work
			if (ua.ie && ua.win && obj.readyState != 4) {
				var newObj = createElement("div");
				replaceId += "SWFObjectNew";
				newObj.setAttribute("id", replaceId);
				obj.parentNode.insertBefore(newObj, obj); // Insert placeholder div that will be replaced by the object element that loads expressinstall.swf
				obj.style.display = "none";
				win.attachEvent("onload", function() { obj.parentNode.removeChild(obj); });
			}
			createSWF({ data:regObj.expressInstall, id:EXPRESS_INSTALL_ID, width:regObj.width, height:regObj.height }, { flashvars:fv }, replaceId);
		}
	}
	
	/* Functions to abstract and display alternative content
	*/
	function displayAltContent(obj) {
		if (ua.ie && ua.win && obj.readyState != 4) {
			// For IE when a SWF is loading (AND: not available in cache) wait for the onload event to fire to remove the original object element
			// In IE you cannot properly cancel a loading SWF file without breaking browser load references, also obj.onreadystatechange doesn't work
			var el = createElement("div");
			obj.parentNode.insertBefore(el, obj); // Insert placeholder div that will be replaced by the alternative content
			el.parentNode.replaceChild(abstractAltContent(obj), el);
			obj.style.display = "none";
			win.attachEvent("onload", function() { obj.parentNode.removeChild(obj); });
		}
		else {
			obj.parentNode.replaceChild(abstractAltContent(obj), obj);
		}
	}	

	function abstractAltContent(obj) {
		var ac = createElement("div");
		if (ua.win && ua.ie) {
			ac.innerHTML = obj.innerHTML;
		}
		else {
			var nestedObj = obj.getElementsByTagName(OBJECT)[0];
			if (nestedObj) {
				var c = nestedObj.childNodes;
				if (c) {
					var cl = c.length;
					for (var i = 0; i < cl; i++) {
						if (!(c[i].nodeType == 1 && c[i].nodeName.toLowerCase() == "param") && !(c[i].nodeType == 8)) {
							ac.appendChild(c[i].cloneNode(true));
						}
					}
				}
			}
		}
		return ac;
	}
	
	/* Cross-browser dynamic SWF creation
	*/
	function createSWF(attObj, parObj, id) {
		var r, el = getElementById(id);
		if (typeof attObj.id == UNDEF) { // if no 'id' is defined for the object element, it will inherit the 'id' from the alternative content
			attObj.id = id;
		}
		if (ua.ie && ua.win) { // IE, the object element and W3C DOM methods do not combine: fall back to outerHTML
			var att = "";
			for (var i in attObj) {
				if (attObj[i] != Object.prototype[i]) { // Filter out prototype additions from other potential libraries, like Object.prototype.toJSONString = function() {}
					if (i == "data") {
						parObj.movie = attObj[i];
					}
					else if (i.toLowerCase() == "styleclass") { // 'class' is an ECMA4 reserved keyword
						att += ' class="' + attObj[i] + '"';
					}
					else if (i != "classid") {
						att += ' ' + i + '="' + attObj[i] + '"';
					}
				}
			}
			var par = "";
			for (var j in parObj) {
				if (parObj[j] != Object.prototype[j]) { // Filter out prototype additions from other potential libraries
					par += '<param name="' + j + '" value="' + parObj[j] + '" />';
				}
			}
			el.outerHTML = '<object classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000"' + att + '>' + par + '</object>';
			fixObjectLeaks(attObj.id); // This bug affects dynamic publishing only
			r = getElementById(attObj.id);	
		}
		else if (ua.webkit && ua.webkit < 312) { // Older webkit engines ignore the object element's nested param elements: fall back to the proprietary embed element
			var e = createElement("embed");
			e.setAttribute("type", FLASH_MIME_TYPE);
			for (var k in attObj) {
				if (attObj[k] != Object.prototype[k]) { // Filter out prototype additions from other potential libraries
					if (k == "data") {
						e.setAttribute("src", attObj[k]);
					}
					else if (k.toLowerCase() == "styleclass") { // 'class' is an ECMA4 reserved keyword
						e.setAttribute("class", attObj[k]);
					}
					else if (k != "classid") { // Filter out IE specific attribute
						e.setAttribute(k, attObj[k]);
					}
				}
			}
			for (var l in parObj) {
				if (parObj[l] != Object.prototype[l]) { // Filter out prototype additions from other potential libraries
					if (l != "movie") { // Filter out IE specific param element
						e.setAttribute(l, parObj[l]);
					}
				}
			}
			el.parentNode.replaceChild(e, el);
			r = e;
		}
		else { // Well-behaving browsers
			var o = createElement(OBJECT);
			o.setAttribute("type", FLASH_MIME_TYPE);
			for (var m in attObj) {
				if (attObj[m] != Object.prototype[m]) { // Filter out prototype additions from other potential libraries
					if (m.toLowerCase() == "styleclass") { // 'class' is an ECMA4 reserved keyword
						o.setAttribute("class", attObj[m]);
					}
					else if (m != "classid") { // Filter out IE specific attribute
						o.setAttribute(m, attObj[m]);
					}
				}
			}
			for (var n in parObj) {
				if (parObj[n] != Object.prototype[n] && n != "movie") { // Filter out prototype additions from other potential libraries and IE specific param element
					createObjParam(o, n, parObj[n]);
				}
			}
			el.parentNode.replaceChild(o, el);
			r = o;
		}
		return r;
	}
	
	function createObjParam(el, pName, pValue) {
		var p = createElement("param");
		p.setAttribute("name", pName);	
		p.setAttribute("value", pValue);
		el.appendChild(p);
	}
	
	function getElementById(id) {
		return doc.getElementById(id);
	}
	
	function createElement(el) {
		return doc.createElement(el);
	}
	
	function hasPlayerVersion(rv) {
		var pv = ua.pv, v = rv.split(".");
		v[0] = parseInt(v[0], 10);
		v[1] = parseInt(v[1], 10);
		v[2] = parseInt(v[2], 10);
		return (pv[0] > v[0] || (pv[0] == v[0] && pv[1] > v[1]) || (pv[0] == v[0] && pv[1] == v[1] && pv[2] >= v[2])) ? true : false;
	}
	
	/* Cross-browser dynamic CSS creation
		- Based on Bobby van der Sluis' solution: http://www.bobbyvandersluis.com/articles/dynamicCSS.php
	*/	
	function createCSS(sel, decl) {
		if (ua.ie && ua.mac) {
			return;
		}
		var h = doc.getElementsByTagName("head")[0], s = createElement("style");
		s.setAttribute("type", "text/css");
		s.setAttribute("media", "screen");
		if (!(ua.ie && ua.win) && typeof doc.createTextNode != UNDEF) {
			s.appendChild(doc.createTextNode(sel + " {" + decl + "}"));
		}
		h.appendChild(s);
		if (ua.ie && ua.win && typeof doc.styleSheets != UNDEF && doc.styleSheets.length > 0) {
			var ls = doc.styleSheets[doc.styleSheets.length - 1];
			if (typeof ls.addRule == OBJECT) {
				ls.addRule(sel, decl);
			}
		}
	}
	
	function setVisibility(id, isVisible) {
		var v = isVisible ? "inherit" : "hidden";
		if (isDomLoaded) {
			try { doc.getElementById(id).style.visibility = v;
			} catch (e) {
				// IE 7 sucks (more accurately IE8 in comp mode)
				/*
					Webpage error details

					User Agent: Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.1; Trident/4.0; SLCC2; .NET CLR 2.0.50727; .NET CLR 3.5.30729; .NET CLR 3.0.30729; Media Center PC 6.0; InfoPath.3)
					Timestamp: Thu, 17 Feb 2011 20:16:45 UTC

					Message: Object required
					Line: 484
					Char: 4
					Code: 0
					URI: http://usselfstoragelocator.com/javascripts/cache/all.js?1297973498
				*/
			}
		}
		else {
			createCSS("#" + id, "visibility:" + v);
		}
	}
	
	function getTargetVersion(obj) {
	    if (!obj)
	        return 0;
		var c = obj.childNodes;
		var cl = c.length;
		for (var i = 0; i < cl; i++) {
			if (c[i].nodeType == 1 && c[i].nodeName.toLowerCase() == "object") {
			    c = c[i].childNodes;
			    cl = c.length;
			    i = 0;
			}     
			if (c[i].nodeType == 1 && c[i].nodeName.toLowerCase() == "param" && c[i].getAttribute("name") == "swfversion") {
			   return c[i].getAttribute("value"); 
			}
		}
		return 0;
	}
    
	function getExpressInstall(obj) {
	    if (!obj)
	        return "";
		var c = obj.childNodes;
		var cl = c.length;
		for (var i = 0; i < cl; i++) {
			if (c[i].nodeType == 1 && c[i].nodeName.toLowerCase() == "object") {
			    c = c[i].childNodes;
			    cl = c.length;
			    i = 0;
			}     
			if (c[i].nodeType == 1 && c[i].nodeName.toLowerCase() == "param" && c[i].getAttribute("name") == "expressinstall") { 
			    return c[i].getAttribute("value"); 
			}	       
		}
		return "";
	}
    
	return {
		/* Public API
			- Reference: http://code.google.com/p/swfobject/wiki/SWFObject_2_0_documentation
		*/ 
		registerObject: function(objectIdStr, swfVersionStr, xiSwfUrlStr) {
			if (!ua.w3cdom || !objectIdStr) {
				return;
			}
			var obj = document.getElementById(objectIdStr);
			var xi = getExpressInstall(obj);
			var regObj = {};
			regObj.id = objectIdStr;
			regObj.swfVersion = swfVersionStr ? swfVersionStr : getTargetVersion(obj);
			regObj.expressInstall = xiSwfUrlStr ? xiSwfUrlStr : ((xi != "") ? xi : false);
			regObjArr[regObjArr.length] = regObj;
			setVisibility(objectIdStr, false);
		},
		
		getObjectById: function(objectIdStr) {
			var r = null;
			if (ua.w3cdom && isDomLoaded) {
				var o = getElementById(objectIdStr);
				if (o) {
					var n = o.getElementsByTagName(OBJECT)[0];
					if (!n || (n && typeof o.SetVariable != UNDEF)) {
				    	r = o;
					}
					else if (typeof n.SetVariable != UNDEF) {
						r = n;
					}
				}
			}
			return r;
		},
		
		embedSWF: function(swfUrlStr, replaceElemIdStr, widthStr, heightStr, swfVersionStr, xiSwfUrlStr, flashvarsObj, parObj, attObj) {
			if (!ua.w3cdom || !swfUrlStr || !replaceElemIdStr || !widthStr || !heightStr || !swfVersionStr) {
				return;
			}
			widthStr += ""; // Auto-convert to string to make it idiot proof
			heightStr += "";
			if (hasPlayerVersion(swfVersionStr)) {
				setVisibility(replaceElemIdStr, false);
				var att = (typeof attObj == OBJECT) ? attObj : {};
				att.data = swfUrlStr;
				att.width = widthStr;
				att.height = heightStr;
				var par = (typeof parObj == OBJECT) ? parObj : {};
				if (typeof flashvarsObj == OBJECT) {
					for (var i in flashvarsObj) {
						if (flashvarsObj[i] != Object.prototype[i]) { // Filter out prototype additions from other potential libraries
							if (typeof par.flashvars != UNDEF) {
								par.flashvars += "&" + i + "=" + flashvarsObj[i];
							}
							else {
								par.flashvars = i + "=" + flashvarsObj[i];
							}
						}
					}
				}
				addDomLoadEvent(function() {
					createSWF(att, par, replaceElemIdStr);
					if (att.id == replaceElemIdStr) {
						setVisibility(replaceElemIdStr, true);
					}
				});
			}
			else if (xiSwfUrlStr && !isExpressInstallActive && hasPlayerVersion("6.0.65") && (ua.win || ua.mac)) {
				setVisibility(replaceElemIdStr, false);
				addDomLoadEvent(function() {
					var regObj = {};
					regObj.id = regObj.altContentId = replaceElemIdStr;
					regObj.width = widthStr;
					regObj.height = heightStr;
					regObj.expressInstall = xiSwfUrlStr;
					showExpressInstall(regObj);
				});
			}
		},
		
		getFlashPlayerVersion: function() {
			return { major:ua.pv[0], minor:ua.pv[1], release:ua.pv[2] };
		},
		
		hasFlashPlayerVersion:hasPlayerVersion,
		
		createSWF: function(attObj, parObj, replaceElemIdStr) {
			if (ua.w3cdom && isDomLoaded) {
				return createSWF(attObj, parObj, replaceElemIdStr);
			}
			else {
				return undefined;
			}
		},
		
		createCSS: function(sel, decl) {
			if (ua.w3cdom) {
				createCSS(sel, decl);
			}
		},
		
		addDomLoadEvent:addDomLoadEvent,
		
		addLoadEvent:addLoadEvent,
		
		getQueryParamValue: function(param) {
			var q = doc.location.search || doc.location.hash;
			if (param == null) {
				return q;
			}
		 	if(q) {
				var pairs = q.substring(1).split("&");
				for (var i = 0; i < pairs.length; i++) {
					if (pairs[i].substring(0, pairs[i].indexOf("=")) == param) {
						return pairs[i].substring((pairs[i].indexOf("=") + 1));
					}
				}
			}
			return "";
		},
		
		// For internal usage only
		expressInstallCallback: function() {
			if (isExpressInstallActive && storedAltContent) {
				var obj = getElementById(EXPRESS_INSTALL_ID);
				if (obj) {
					obj.parentNode.replaceChild(storedAltContent, obj);
					if (storedAltContentId) {
						setVisibility(storedAltContentId, true);
						if (ua.ie && ua.win) {
							storedAltContent.style.display = "block";
						}
					}
					storedAltContent = null;
					storedAltContentId = null;
					isExpressInstallActive = false;
				}
			} 
		}
		
	};

}();

/*!
 * jQuery JavaScript Library v1.4.3
 * http://jquery.com/
 *
 * Copyright 2010, John Resig
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://jquery.org/license
 *
 * Includes Sizzle.js
 * http://sizzlejs.com/
 * Copyright 2010, The Dojo Foundation
 * Released under the MIT, BSD, and GPL Licenses.
 *
 * Date: Thu Oct 14 23:10:06 2010 -0400
 */
(function(E,A){function U(){return false}function ba(){return true}function ja(a,b,d){d[0].type=a;return c.event.handle.apply(b,d)}function Ga(a){var b,d,e=[],f=[],h,k,l,n,s,v,B,D;k=c.data(this,this.nodeType?"events":"__events__");if(typeof k==="function")k=k.events;if(!(a.liveFired===this||!k||!k.live||a.button&&a.type==="click")){if(a.namespace)D=RegExp("(^|\\.)"+a.namespace.split(".").join("\\.(?:.*\\.)?")+"(\\.|$)");a.liveFired=this;var H=k.live.slice(0);for(n=0;n<H.length;n++){k=H[n];k.origType.replace(X,
"")===a.type?f.push(k.selector):H.splice(n--,1)}f=c(a.target).closest(f,a.currentTarget);s=0;for(v=f.length;s<v;s++){B=f[s];for(n=0;n<H.length;n++){k=H[n];if(B.selector===k.selector&&(!D||D.test(k.namespace))){l=B.elem;h=null;if(k.preType==="mouseenter"||k.preType==="mouseleave"){a.type=k.preType;h=c(a.relatedTarget).closest(k.selector)[0]}if(!h||h!==l)e.push({elem:l,handleObj:k,level:B.level})}}}s=0;for(v=e.length;s<v;s++){f=e[s];if(d&&f.level>d)break;a.currentTarget=f.elem;a.data=f.handleObj.data;
a.handleObj=f.handleObj;D=f.handleObj.origHandler.apply(f.elem,arguments);if(D===false||a.isPropagationStopped()){d=f.level;if(D===false)b=false}}return b}}function Y(a,b){return(a&&a!=="*"?a+".":"")+b.replace(Ha,"`").replace(Ia,"&")}function ka(a,b,d){if(c.isFunction(b))return c.grep(a,function(f,h){return!!b.call(f,h,f)===d});else if(b.nodeType)return c.grep(a,function(f){return f===b===d});else if(typeof b==="string"){var e=c.grep(a,function(f){return f.nodeType===1});if(Ja.test(b))return c.filter(b,
e,!d);else b=c.filter(b,e)}return c.grep(a,function(f){return c.inArray(f,b)>=0===d})}function la(a,b){var d=0;b.each(function(){if(this.nodeName===(a[d]&&a[d].nodeName)){var e=c.data(a[d++]),f=c.data(this,e);if(e=e&&e.events){delete f.handle;f.events={};for(var h in e)for(var k in e[h])c.event.add(this,h,e[h][k],e[h][k].data)}}})}function Ka(a,b){b.src?c.ajax({url:b.src,async:false,dataType:"script"}):c.globalEval(b.text||b.textContent||b.innerHTML||"");b.parentNode&&b.parentNode.removeChild(b)}
function ma(a,b,d){var e=b==="width"?a.offsetWidth:a.offsetHeight;if(d==="border")return e;c.each(b==="width"?La:Ma,function(){d||(e-=parseFloat(c.css(a,"padding"+this))||0);if(d==="margin")e+=parseFloat(c.css(a,"margin"+this))||0;else e-=parseFloat(c.css(a,"border"+this+"Width"))||0});return e}function ca(a,b,d,e){if(c.isArray(b)&&b.length)c.each(b,function(f,h){d||Na.test(a)?e(a,h):ca(a+"["+(typeof h==="object"||c.isArray(h)?f:"")+"]",h,d,e)});else if(!d&&b!=null&&typeof b==="object")c.isEmptyObject(b)?
e(a,""):c.each(b,function(f,h){ca(a+"["+f+"]",h,d,e)});else e(a,b)}function S(a,b){var d={};c.each(na.concat.apply([],na.slice(0,b)),function(){d[this]=a});return d}function oa(a){if(!da[a]){var b=c("<"+a+">").appendTo("body"),d=b.css("display");b.remove();if(d==="none"||d==="")d="block";da[a]=d}return da[a]}function ea(a){return c.isWindow(a)?a:a.nodeType===9?a.defaultView||a.parentWindow:false}var u=E.document,c=function(){function a(){if(!b.isReady){try{u.documentElement.doScroll("left")}catch(i){setTimeout(a,
1);return}b.ready()}}var b=function(i,r){return new b.fn.init(i,r)},d=E.jQuery,e=E.$,f,h=/^(?:[^<]*(<[\w\W]+>)[^>]*$|#([\w\-]+)$)/,k=/\S/,l=/^\s+/,n=/\s+$/,s=/\W/,v=/\d/,B=/^<(\w+)\s*\/?>(?:<\/\1>)?$/,D=/^[\],:{}\s]*$/,H=/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g,w=/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g,G=/(?:^|:|,)(?:\s*\[)+/g,M=/(webkit)[ \/]([\w.]+)/,g=/(opera)(?:.*version)?[ \/]([\w.]+)/,j=/(msie) ([\w.]+)/,o=/(mozilla)(?:.*? rv:([\w.]+))?/,m=navigator.userAgent,p=false,
q=[],t,x=Object.prototype.toString,C=Object.prototype.hasOwnProperty,P=Array.prototype.push,N=Array.prototype.slice,R=String.prototype.trim,Q=Array.prototype.indexOf,L={};b.fn=b.prototype={init:function(i,r){var y,z,F;if(!i)return this;if(i.nodeType){this.context=this[0]=i;this.length=1;return this}if(i==="body"&&!r&&u.body){this.context=u;this[0]=u.body;this.selector="body";this.length=1;return this}if(typeof i==="string")if((y=h.exec(i))&&(y[1]||!r))if(y[1]){F=r?r.ownerDocument||r:u;if(z=B.exec(i))if(b.isPlainObject(r)){i=
[u.createElement(z[1])];b.fn.attr.call(i,r,true)}else i=[F.createElement(z[1])];else{z=b.buildFragment([y[1]],[F]);i=(z.cacheable?z.fragment.cloneNode(true):z.fragment).childNodes}return b.merge(this,i)}else{if((z=u.getElementById(y[2]))&&z.parentNode){if(z.id!==y[2])return f.find(i);this.length=1;this[0]=z}this.context=u;this.selector=i;return this}else if(!r&&!s.test(i)){this.selector=i;this.context=u;i=u.getElementsByTagName(i);return b.merge(this,i)}else return!r||r.jquery?(r||f).find(i):b(r).find(i);
else if(b.isFunction(i))return f.ready(i);if(i.selector!==A){this.selector=i.selector;this.context=i.context}return b.makeArray(i,this)},selector:"",jquery:"1.4.3",length:0,size:function(){return this.length},toArray:function(){return N.call(this,0)},get:function(i){return i==null?this.toArray():i<0?this.slice(i)[0]:this[i]},pushStack:function(i,r,y){var z=b();b.isArray(i)?P.apply(z,i):b.merge(z,i);z.prevObject=this;z.context=this.context;if(r==="find")z.selector=this.selector+(this.selector?" ":
"")+y;else if(r)z.selector=this.selector+"."+r+"("+y+")";return z},each:function(i,r){return b.each(this,i,r)},ready:function(i){b.bindReady();if(b.isReady)i.call(u,b);else q&&q.push(i);return this},eq:function(i){return i===-1?this.slice(i):this.slice(i,+i+1)},first:function(){return this.eq(0)},last:function(){return this.eq(-1)},slice:function(){return this.pushStack(N.apply(this,arguments),"slice",N.call(arguments).join(","))},map:function(i){return this.pushStack(b.map(this,function(r,y){return i.call(r,
y,r)}))},end:function(){return this.prevObject||b(null)},push:P,sort:[].sort,splice:[].splice};b.fn.init.prototype=b.fn;b.extend=b.fn.extend=function(){var i=arguments[0]||{},r=1,y=arguments.length,z=false,F,I,K,J,fa;if(typeof i==="boolean"){z=i;i=arguments[1]||{};r=2}if(typeof i!=="object"&&!b.isFunction(i))i={};if(y===r){i=this;--r}for(;r<y;r++)if((F=arguments[r])!=null)for(I in F){K=i[I];J=F[I];if(i!==J)if(z&&J&&(b.isPlainObject(J)||(fa=b.isArray(J)))){if(fa){fa=false;clone=K&&b.isArray(K)?K:[]}else clone=
K&&b.isPlainObject(K)?K:{};i[I]=b.extend(z,clone,J)}else if(J!==A)i[I]=J}return i};b.extend({noConflict:function(i){E.$=e;if(i)E.jQuery=d;return b},isReady:false,readyWait:1,ready:function(i){i===true&&b.readyWait--;if(!b.readyWait||i!==true&&!b.isReady){if(!u.body)return setTimeout(b.ready,1);b.isReady=true;if(!(i!==true&&--b.readyWait>0)){if(q){for(var r=0;i=q[r++];)i.call(u,b);q=null}b.fn.triggerHandler&&b(u).triggerHandler("ready")}}},bindReady:function(){if(!p){p=true;if(u.readyState==="complete")return setTimeout(b.ready,
1);if(u.addEventListener){u.addEventListener("DOMContentLoaded",t,false);E.addEventListener("load",b.ready,false)}else if(u.attachEvent){u.attachEvent("onreadystatechange",t);E.attachEvent("onload",b.ready);var i=false;try{i=E.frameElement==null}catch(r){}u.documentElement.doScroll&&i&&a()}}},isFunction:function(i){return b.type(i)==="function"},isArray:Array.isArray||function(i){return b.type(i)==="array"},isWindow:function(i){return i&&typeof i==="object"&&"setInterval"in i},isNaN:function(i){return i==
null||!v.test(i)||isNaN(i)},type:function(i){return i==null?String(i):L[x.call(i)]||"object"},isPlainObject:function(i){if(!i||b.type(i)!=="object"||i.nodeType||b.isWindow(i))return false;if(i.constructor&&!C.call(i,"constructor")&&!C.call(i.constructor.prototype,"isPrototypeOf"))return false;for(var r in i);return r===A||C.call(i,r)},isEmptyObject:function(i){for(var r in i)return false;return true},error:function(i){throw i;},parseJSON:function(i){if(typeof i!=="string"||!i)return null;i=b.trim(i);
if(D.test(i.replace(H,"@").replace(w,"]").replace(G,"")))return E.JSON&&E.JSON.parse?E.JSON.parse(i):(new Function("return "+i))();else b.error("Invalid JSON: "+i)},noop:function(){},globalEval:function(i){if(i&&k.test(i)){var r=u.getElementsByTagName("head")[0]||u.documentElement,y=u.createElement("script");y.type="text/javascript";if(b.support.scriptEval)y.appendChild(u.createTextNode(i));else y.text=i;r.insertBefore(y,r.firstChild);r.removeChild(y)}},nodeName:function(i,r){return i.nodeName&&i.nodeName.toUpperCase()===
r.toUpperCase()},each:function(i,r,y){var z,F=0,I=i.length,K=I===A||b.isFunction(i);if(y)if(K)for(z in i){if(r.apply(i[z],y)===false)break}else for(;F<I;){if(r.apply(i[F++],y)===false)break}else if(K)for(z in i){if(r.call(i[z],z,i[z])===false)break}else for(y=i[0];F<I&&r.call(y,F,y)!==false;y=i[++F]);return i},trim:R?function(i){return i==null?"":R.call(i)}:function(i){return i==null?"":i.toString().replace(l,"").replace(n,"")},makeArray:function(i,r){var y=r||[];if(i!=null){var z=b.type(i);i.length==
null||z==="string"||z==="function"||z==="regexp"||b.isWindow(i)?P.call(y,i):b.merge(y,i)}return y},inArray:function(i,r){if(r.indexOf)return r.indexOf(i);for(var y=0,z=r.length;y<z;y++)if(r[y]===i)return y;return-1},merge:function(i,r){var y=i.length,z=0;if(typeof r.length==="number")for(var F=r.length;z<F;z++)i[y++]=r[z];else for(;r[z]!==A;)i[y++]=r[z++];i.length=y;return i},grep:function(i,r,y){var z=[],F;y=!!y;for(var I=0,K=i.length;I<K;I++){F=!!r(i[I],I);y!==F&&z.push(i[I])}return z},map:function(i,
r,y){for(var z=[],F,I=0,K=i.length;I<K;I++){F=r(i[I],I,y);if(F!=null)z[z.length]=F}return z.concat.apply([],z)},guid:1,proxy:function(i,r,y){if(arguments.length===2)if(typeof r==="string"){y=i;i=y[r];r=A}else if(r&&!b.isFunction(r)){y=r;r=A}if(!r&&i)r=function(){return i.apply(y||this,arguments)};if(i)r.guid=i.guid=i.guid||r.guid||b.guid++;return r},access:function(i,r,y,z,F,I){var K=i.length;if(typeof r==="object"){for(var J in r)b.access(i,J,r[J],z,F,y);return i}if(y!==A){z=!I&&z&&b.isFunction(y);
for(J=0;J<K;J++)F(i[J],r,z?y.call(i[J],J,F(i[J],r)):y,I);return i}return K?F(i[0],r):A},now:function(){return(new Date).getTime()},uaMatch:function(i){i=i.toLowerCase();i=M.exec(i)||g.exec(i)||j.exec(i)||i.indexOf("compatible")<0&&o.exec(i)||[];return{browser:i[1]||"",version:i[2]||"0"}},browser:{}});b.each("Boolean Number String Function Array Date RegExp Object".split(" "),function(i,r){L["[object "+r+"]"]=r.toLowerCase()});m=b.uaMatch(m);if(m.browser){b.browser[m.browser]=true;b.browser.version=
m.version}if(b.browser.webkit)b.browser.safari=true;if(Q)b.inArray=function(i,r){return Q.call(r,i)};if(!/\s/.test("\u00a0")){l=/^[\s\xA0]+/;n=/[\s\xA0]+$/}f=b(u);if(u.addEventListener)t=function(){u.removeEventListener("DOMContentLoaded",t,false);b.ready()};else if(u.attachEvent)t=function(){if(u.readyState==="complete"){u.detachEvent("onreadystatechange",t);b.ready()}};return E.jQuery=E.$=b}();(function(){c.support={};var a=u.documentElement,b=u.createElement("script"),d=u.createElement("div"),
e="script"+c.now();d.style.display="none";d.innerHTML="   <link/><table></table><a href='/a' style='color:red;float:left;opacity:.55;'>a</a><input type='checkbox'/>";var f=d.getElementsByTagName("*"),h=d.getElementsByTagName("a")[0],k=u.createElement("select"),l=k.appendChild(u.createElement("option"));if(!(!f||!f.length||!h)){c.support={leadingWhitespace:d.firstChild.nodeType===3,tbody:!d.getElementsByTagName("tbody").length,htmlSerialize:!!d.getElementsByTagName("link").length,style:/red/.test(h.getAttribute("style")),
hrefNormalized:h.getAttribute("href")==="/a",opacity:/^0.55$/.test(h.style.opacity),cssFloat:!!h.style.cssFloat,checkOn:d.getElementsByTagName("input")[0].value==="on",optSelected:l.selected,optDisabled:false,checkClone:false,scriptEval:false,noCloneEvent:true,boxModel:null,inlineBlockNeedsLayout:false,shrinkWrapBlocks:false,reliableHiddenOffsets:true};k.disabled=true;c.support.optDisabled=!l.disabled;b.type="text/javascript";try{b.appendChild(u.createTextNode("window."+e+"=1;"))}catch(n){}a.insertBefore(b,
a.firstChild);if(E[e]){c.support.scriptEval=true;delete E[e]}a.removeChild(b);if(d.attachEvent&&d.fireEvent){d.attachEvent("onclick",function s(){c.support.noCloneEvent=false;d.detachEvent("onclick",s)});d.cloneNode(true).fireEvent("onclick")}d=u.createElement("div");d.innerHTML="<input type='radio' name='radiotest' checked='checked'/>";a=u.createDocumentFragment();a.appendChild(d.firstChild);c.support.checkClone=a.cloneNode(true).cloneNode(true).lastChild.checked;c(function(){var s=u.createElement("div");
s.style.width=s.style.paddingLeft="1px";u.body.appendChild(s);c.boxModel=c.support.boxModel=s.offsetWidth===2;if("zoom"in s.style){s.style.display="inline";s.style.zoom=1;c.support.inlineBlockNeedsLayout=s.offsetWidth===2;s.style.display="";s.innerHTML="<div style='width:4px;'></div>";c.support.shrinkWrapBlocks=s.offsetWidth!==2}s.innerHTML="<table><tr><td style='padding:0;display:none'></td><td>t</td></tr></table>";var v=s.getElementsByTagName("td");c.support.reliableHiddenOffsets=v[0].offsetHeight===
0;v[0].style.display="";v[1].style.display="none";c.support.reliableHiddenOffsets=c.support.reliableHiddenOffsets&&v[0].offsetHeight===0;s.innerHTML="";u.body.removeChild(s).style.display="none"});a=function(s){var v=u.createElement("div");s="on"+s;var B=s in v;if(!B){v.setAttribute(s,"return;");B=typeof v[s]==="function"}return B};c.support.submitBubbles=a("submit");c.support.changeBubbles=a("change");a=b=d=f=h=null}})();c.props={"for":"htmlFor","class":"className",readonly:"readOnly",maxlength:"maxLength",
cellspacing:"cellSpacing",rowspan:"rowSpan",colspan:"colSpan",tabindex:"tabIndex",usemap:"useMap",frameborder:"frameBorder"};var pa={},Oa=/^(?:\{.*\}|\[.*\])$/;c.extend({cache:{},uuid:0,expando:"jQuery"+c.now(),noData:{embed:true,object:"clsid:D27CDB6E-AE6D-11cf-96B8-444553540000",applet:true},data:function(a,b,d){if(c.acceptData(a)){a=a==E?pa:a;var e=a.nodeType,f=e?a[c.expando]:null,h=c.cache;if(!(e&&!f&&typeof b==="string"&&d===A)){if(e)f||(a[c.expando]=f=++c.uuid);else h=a;if(typeof b==="object")if(e)h[f]=
c.extend(h[f],b);else c.extend(h,b);else if(e&&!h[f])h[f]={};a=e?h[f]:h;if(d!==A)a[b]=d;return typeof b==="string"?a[b]:a}}},removeData:function(a,b){if(c.acceptData(a)){a=a==E?pa:a;var d=a.nodeType,e=d?a[c.expando]:a,f=c.cache,h=d?f[e]:e;if(b){if(h){delete h[b];d&&c.isEmptyObject(h)&&c.removeData(a)}}else if(d&&c.support.deleteExpando)delete a[c.expando];else if(a.removeAttribute)a.removeAttribute(c.expando);else if(d)delete f[e];else for(var k in a)delete a[k]}},acceptData:function(a){if(a.nodeName){var b=
c.noData[a.nodeName.toLowerCase()];if(b)return!(b===true||a.getAttribute("classid")!==b)}return true}});c.fn.extend({data:function(a,b){if(typeof a==="undefined")return this.length?c.data(this[0]):null;else if(typeof a==="object")return this.each(function(){c.data(this,a)});var d=a.split(".");d[1]=d[1]?"."+d[1]:"";if(b===A){var e=this.triggerHandler("getData"+d[1]+"!",[d[0]]);if(e===A&&this.length){e=c.data(this[0],a);if(e===A&&this[0].nodeType===1){e=this[0].getAttribute("data-"+a);if(typeof e===
"string")try{e=e==="true"?true:e==="false"?false:e==="null"?null:!c.isNaN(e)?parseFloat(e):Oa.test(e)?c.parseJSON(e):e}catch(f){}else e=A}}return e===A&&d[1]?this.data(d[0]):e}else return this.each(function(){var h=c(this),k=[d[0],b];h.triggerHandler("setData"+d[1]+"!",k);c.data(this,a,b);h.triggerHandler("changeData"+d[1]+"!",k)})},removeData:function(a){return this.each(function(){c.removeData(this,a)})}});c.extend({queue:function(a,b,d){if(a){b=(b||"fx")+"queue";var e=c.data(a,b);if(!d)return e||
[];if(!e||c.isArray(d))e=c.data(a,b,c.makeArray(d));else e.push(d);return e}},dequeue:function(a,b){b=b||"fx";var d=c.queue(a,b),e=d.shift();if(e==="inprogress")e=d.shift();if(e){b==="fx"&&d.unshift("inprogress");e.call(a,function(){c.dequeue(a,b)})}}});c.fn.extend({queue:function(a,b){if(typeof a!=="string"){b=a;a="fx"}if(b===A)return c.queue(this[0],a);return this.each(function(){var d=c.queue(this,a,b);a==="fx"&&d[0]!=="inprogress"&&c.dequeue(this,a)})},dequeue:function(a){return this.each(function(){c.dequeue(this,
a)})},delay:function(a,b){a=c.fx?c.fx.speeds[a]||a:a;b=b||"fx";return this.queue(b,function(){var d=this;setTimeout(function(){c.dequeue(d,b)},a)})},clearQueue:function(a){return this.queue(a||"fx",[])}});var qa=/[\n\t]/g,ga=/\s+/,Pa=/\r/g,Qa=/^(?:href|src|style)$/,Ra=/^(?:button|input)$/i,Sa=/^(?:button|input|object|select|textarea)$/i,Ta=/^a(?:rea)?$/i,ra=/^(?:radio|checkbox)$/i;c.fn.extend({attr:function(a,b){return c.access(this,a,b,true,c.attr)},removeAttr:function(a){return this.each(function(){c.attr(this,
a,"");this.nodeType===1&&this.removeAttribute(a)})},addClass:function(a){if(c.isFunction(a))return this.each(function(s){var v=c(this);v.addClass(a.call(this,s,v.attr("class")))});if(a&&typeof a==="string")for(var b=(a||"").split(ga),d=0,e=this.length;d<e;d++){var f=this[d];if(f.nodeType===1)if(f.className){for(var h=" "+f.className+" ",k=f.className,l=0,n=b.length;l<n;l++)if(h.indexOf(" "+b[l]+" ")<0)k+=" "+b[l];f.className=c.trim(k)}else f.className=a}return this},removeClass:function(a){if(c.isFunction(a))return this.each(function(n){var s=
c(this);s.removeClass(a.call(this,n,s.attr("class")))});if(a&&typeof a==="string"||a===A)for(var b=(a||"").split(ga),d=0,e=this.length;d<e;d++){var f=this[d];if(f.nodeType===1&&f.className)if(a){for(var h=(" "+f.className+" ").replace(qa," "),k=0,l=b.length;k<l;k++)h=h.replace(" "+b[k]+" "," ");f.className=c.trim(h)}else f.className=""}return this},toggleClass:function(a,b){var d=typeof a,e=typeof b==="boolean";if(c.isFunction(a))return this.each(function(f){var h=c(this);h.toggleClass(a.call(this,
f,h.attr("class"),b),b)});return this.each(function(){if(d==="string")for(var f,h=0,k=c(this),l=b,n=a.split(ga);f=n[h++];){l=e?l:!k.hasClass(f);k[l?"addClass":"removeClass"](f)}else if(d==="undefined"||d==="boolean"){this.className&&c.data(this,"__className__",this.className);this.className=this.className||a===false?"":c.data(this,"__className__")||""}})},hasClass:function(a){a=" "+a+" ";for(var b=0,d=this.length;b<d;b++)if((" "+this[b].className+" ").replace(qa," ").indexOf(a)>-1)return true;return false},
val:function(a){if(!arguments.length){var b=this[0];if(b){if(c.nodeName(b,"option")){var d=b.attributes.value;return!d||d.specified?b.value:b.text}if(c.nodeName(b,"select")){var e=b.selectedIndex;d=[];var f=b.options;b=b.type==="select-one";if(e<0)return null;var h=b?e:0;for(e=b?e+1:f.length;h<e;h++){var k=f[h];if(k.selected&&(c.support.optDisabled?!k.disabled:k.getAttribute("disabled")===null)&&(!k.parentNode.disabled||!c.nodeName(k.parentNode,"optgroup"))){a=c(k).val();if(b)return a;d.push(a)}}return d}if(ra.test(b.type)&&
!c.support.checkOn)return b.getAttribute("value")===null?"on":b.value;return(b.value||"").replace(Pa,"")}return A}var l=c.isFunction(a);return this.each(function(n){var s=c(this),v=a;if(this.nodeType===1){if(l)v=a.call(this,n,s.val());if(v==null)v="";else if(typeof v==="number")v+="";else if(c.isArray(v))v=c.map(v,function(D){return D==null?"":D+""});if(c.isArray(v)&&ra.test(this.type))this.checked=c.inArray(s.val(),v)>=0;else if(c.nodeName(this,"select")){var B=c.makeArray(v);c("option",this).each(function(){this.selected=
c.inArray(c(this).val(),B)>=0});if(!B.length)this.selectedIndex=-1}else this.value=v}})}});c.extend({attrFn:{val:true,css:true,html:true,text:true,data:true,width:true,height:true,offset:true},attr:function(a,b,d,e){if(!a||a.nodeType===3||a.nodeType===8)return A;if(e&&b in c.attrFn)return c(a)[b](d);e=a.nodeType!==1||!c.isXMLDoc(a);var f=d!==A;b=e&&c.props[b]||b;if(a.nodeType===1){var h=Qa.test(b);if((b in a||a[b]!==A)&&e&&!h){if(f){b==="type"&&Ra.test(a.nodeName)&&a.parentNode&&c.error("type property can't be changed");
if(d===null)a.nodeType===1&&a.removeAttribute(b);else a[b]=d}if(c.nodeName(a,"form")&&a.getAttributeNode(b))return a.getAttributeNode(b).nodeValue;if(b==="tabIndex")return(b=a.getAttributeNode("tabIndex"))&&b.specified?b.value:Sa.test(a.nodeName)||Ta.test(a.nodeName)&&a.href?0:A;return a[b]}if(!c.support.style&&e&&b==="style"){if(f)a.style.cssText=""+d;return a.style.cssText}f&&a.setAttribute(b,""+d);if(!a.attributes[b]&&a.hasAttribute&&!a.hasAttribute(b))return A;a=!c.support.hrefNormalized&&e&&
h?a.getAttribute(b,2):a.getAttribute(b);return a===null?A:a}}});var X=/\.(.*)$/,ha=/^(?:textarea|input|select)$/i,Ha=/\./g,Ia=/ /g,Ua=/[^\w\s.|`]/g,Va=function(a){return a.replace(Ua,"\\$&")},sa={focusin:0,focusout:0};c.event={add:function(a,b,d,e){if(!(a.nodeType===3||a.nodeType===8)){if(c.isWindow(a)&&a!==E&&!a.frameElement)a=E;if(d===false)d=U;var f,h;if(d.handler){f=d;d=f.handler}if(!d.guid)d.guid=c.guid++;if(h=c.data(a)){var k=a.nodeType?"events":"__events__",l=h[k],n=h.handle;if(typeof l===
"function"){n=l.handle;l=l.events}else if(!l){a.nodeType||(h[k]=h=function(){});h.events=l={}}if(!n)h.handle=n=function(){return typeof c!=="undefined"&&!c.event.triggered?c.event.handle.apply(n.elem,arguments):A};n.elem=a;b=b.split(" ");for(var s=0,v;k=b[s++];){h=f?c.extend({},f):{handler:d,data:e};if(k.indexOf(".")>-1){v=k.split(".");k=v.shift();h.namespace=v.slice(0).sort().join(".")}else{v=[];h.namespace=""}h.type=k;if(!h.guid)h.guid=d.guid;var B=l[k],D=c.event.special[k]||{};if(!B){B=l[k]=[];
if(!D.setup||D.setup.call(a,e,v,n)===false)if(a.addEventListener)a.addEventListener(k,n,false);else a.attachEvent&&a.attachEvent("on"+k,n)}if(D.add){D.add.call(a,h);if(!h.handler.guid)h.handler.guid=d.guid}B.push(h);c.event.global[k]=true}a=null}}},global:{},remove:function(a,b,d,e){if(!(a.nodeType===3||a.nodeType===8)){if(d===false)d=U;var f,h,k=0,l,n,s,v,B,D,H=a.nodeType?"events":"__events__",w=c.data(a),G=w&&w[H];if(w&&G){if(typeof G==="function"){w=G;G=G.events}if(b&&b.type){d=b.handler;b=b.type}if(!b||
typeof b==="string"&&b.charAt(0)==="."){b=b||"";for(f in G)c.event.remove(a,f+b)}else{for(b=b.split(" ");f=b[k++];){v=f;l=f.indexOf(".")<0;n=[];if(!l){n=f.split(".");f=n.shift();s=RegExp("(^|\\.)"+c.map(n.slice(0).sort(),Va).join("\\.(?:.*\\.)?")+"(\\.|$)")}if(B=G[f])if(d){v=c.event.special[f]||{};for(h=e||0;h<B.length;h++){D=B[h];if(d.guid===D.guid){if(l||s.test(D.namespace)){e==null&&B.splice(h--,1);v.remove&&v.remove.call(a,D)}if(e!=null)break}}if(B.length===0||e!=null&&B.length===1){if(!v.teardown||
v.teardown.call(a,n)===false)c.removeEvent(a,f,w.handle);delete G[f]}}else for(h=0;h<B.length;h++){D=B[h];if(l||s.test(D.namespace)){c.event.remove(a,v,D.handler,h);B.splice(h--,1)}}}if(c.isEmptyObject(G)){if(b=w.handle)b.elem=null;delete w.events;delete w.handle;if(typeof w==="function")c.removeData(a,H);else c.isEmptyObject(w)&&c.removeData(a)}}}}},trigger:function(a,b,d,e){var f=a.type||a;if(!e){a=typeof a==="object"?a[c.expando]?a:c.extend(c.Event(f),a):c.Event(f);if(f.indexOf("!")>=0){a.type=
f=f.slice(0,-1);a.exclusive=true}if(!d){a.stopPropagation();c.event.global[f]&&c.each(c.cache,function(){this.events&&this.events[f]&&c.event.trigger(a,b,this.handle.elem)})}if(!d||d.nodeType===3||d.nodeType===8)return A;a.result=A;a.target=d;b=c.makeArray(b);b.unshift(a)}a.currentTarget=d;(e=d.nodeType?c.data(d,"handle"):(c.data(d,"__events__")||{}).handle)&&e.apply(d,b);e=d.parentNode||d.ownerDocument;try{if(!(d&&d.nodeName&&c.noData[d.nodeName.toLowerCase()]))if(d["on"+f]&&d["on"+f].apply(d,b)===
false){a.result=false;a.preventDefault()}}catch(h){}if(!a.isPropagationStopped()&&e)c.event.trigger(a,b,e,true);else if(!a.isDefaultPrevented()){e=a.target;var k,l=f.replace(X,""),n=c.nodeName(e,"a")&&l==="click",s=c.event.special[l]||{};if((!s._default||s._default.call(d,a)===false)&&!n&&!(e&&e.nodeName&&c.noData[e.nodeName.toLowerCase()])){try{if(e[l]){if(k=e["on"+l])e["on"+l]=null;c.event.triggered=true;e[l]()}}catch(v){}if(k)e["on"+l]=k;c.event.triggered=false}}},handle:function(a){var b,d,e;
d=[];var f,h=c.makeArray(arguments);a=h[0]=c.event.fix(a||E.event);a.currentTarget=this;b=a.type.indexOf(".")<0&&!a.exclusive;if(!b){e=a.type.split(".");a.type=e.shift();d=e.slice(0).sort();e=RegExp("(^|\\.)"+d.join("\\.(?:.*\\.)?")+"(\\.|$)")}a.namespace=a.namespace||d.join(".");f=c.data(this,this.nodeType?"events":"__events__");if(typeof f==="function")f=f.events;d=(f||{})[a.type];if(f&&d){d=d.slice(0);f=0;for(var k=d.length;f<k;f++){var l=d[f];if(b||e.test(l.namespace)){a.handler=l.handler;a.data=
l.data;a.handleObj=l;l=l.handler.apply(this,h);if(l!==A){a.result=l;if(l===false){a.preventDefault();a.stopPropagation()}}if(a.isImmediatePropagationStopped())break}}}return a.result},props:"altKey attrChange attrName bubbles button cancelable charCode clientX clientY ctrlKey currentTarget data detail eventPhase fromElement handler keyCode layerX layerY metaKey newValue offsetX offsetY pageX pageY prevValue relatedNode relatedTarget screenX screenY shiftKey srcElement target toElement view wheelDelta which".split(" "),
fix:function(a){if(a[c.expando])return a;var b=a;a=c.Event(b);for(var d=this.props.length,e;d;){e=this.props[--d];a[e]=b[e]}if(!a.target)a.target=a.srcElement||u;if(a.target.nodeType===3)a.target=a.target.parentNode;if(!a.relatedTarget&&a.fromElement)a.relatedTarget=a.fromElement===a.target?a.toElement:a.fromElement;if(a.pageX==null&&a.clientX!=null){b=u.documentElement;d=u.body;a.pageX=a.clientX+(b&&b.scrollLeft||d&&d.scrollLeft||0)-(b&&b.clientLeft||d&&d.clientLeft||0);a.pageY=a.clientY+(b&&b.scrollTop||
d&&d.scrollTop||0)-(b&&b.clientTop||d&&d.clientTop||0)}if(a.which==null&&(a.charCode!=null||a.keyCode!=null))a.which=a.charCode!=null?a.charCode:a.keyCode;if(!a.metaKey&&a.ctrlKey)a.metaKey=a.ctrlKey;if(!a.which&&a.button!==A)a.which=a.button&1?1:a.button&2?3:a.button&4?2:0;return a},guid:1E8,proxy:c.proxy,special:{ready:{setup:c.bindReady,teardown:c.noop},live:{add:function(a){c.event.add(this,Y(a.origType,a.selector),c.extend({},a,{handler:Ga,guid:a.handler.guid}))},remove:function(a){c.event.remove(this,
Y(a.origType,a.selector),a)}},beforeunload:{setup:function(a,b,d){if(c.isWindow(this))this.onbeforeunload=d},teardown:function(a,b){if(this.onbeforeunload===b)this.onbeforeunload=null}}}};c.removeEvent=u.removeEventListener?function(a,b,d){a.removeEventListener&&a.removeEventListener(b,d,false)}:function(a,b,d){a.detachEvent&&a.detachEvent("on"+b,d)};c.Event=function(a){if(!this.preventDefault)return new c.Event(a);if(a&&a.type){this.originalEvent=a;this.type=a.type}else this.type=a;this.timeStamp=
c.now();this[c.expando]=true};c.Event.prototype={preventDefault:function(){this.isDefaultPrevented=ba;var a=this.originalEvent;if(a)if(a.preventDefault)a.preventDefault();else a.returnValue=false},stopPropagation:function(){this.isPropagationStopped=ba;var a=this.originalEvent;if(a){a.stopPropagation&&a.stopPropagation();a.cancelBubble=true}},stopImmediatePropagation:function(){this.isImmediatePropagationStopped=ba;this.stopPropagation()},isDefaultPrevented:U,isPropagationStopped:U,isImmediatePropagationStopped:U};
var ta=function(a){var b=a.relatedTarget;try{for(;b&&b!==this;)b=b.parentNode;if(b!==this){a.type=a.data;c.event.handle.apply(this,arguments)}}catch(d){}},ua=function(a){a.type=a.data;c.event.handle.apply(this,arguments)};c.each({mouseenter:"mouseover",mouseleave:"mouseout"},function(a,b){c.event.special[a]={setup:function(d){c.event.add(this,b,d&&d.selector?ua:ta,a)},teardown:function(d){c.event.remove(this,b,d&&d.selector?ua:ta)}}});if(!c.support.submitBubbles)c.event.special.submit={setup:function(){if(this.nodeName.toLowerCase()!==
"form"){c.event.add(this,"click.specialSubmit",function(a){var b=a.target,d=b.type;if((d==="submit"||d==="image")&&c(b).closest("form").length){a.liveFired=A;return ja("submit",this,arguments)}});c.event.add(this,"keypress.specialSubmit",function(a){var b=a.target,d=b.type;if((d==="text"||d==="password")&&c(b).closest("form").length&&a.keyCode===13){a.liveFired=A;return ja("submit",this,arguments)}})}else return false},teardown:function(){c.event.remove(this,".specialSubmit")}};if(!c.support.changeBubbles){var V,
va=function(a){var b=a.type,d=a.value;if(b==="radio"||b==="checkbox")d=a.checked;else if(b==="select-multiple")d=a.selectedIndex>-1?c.map(a.options,function(e){return e.selected}).join("-"):"";else if(a.nodeName.toLowerCase()==="select")d=a.selectedIndex;return d},Z=function(a,b){var d=a.target,e,f;if(!(!ha.test(d.nodeName)||d.readOnly)){e=c.data(d,"_change_data");f=va(d);if(a.type!=="focusout"||d.type!=="radio")c.data(d,"_change_data",f);if(!(e===A||f===e))if(e!=null||f){a.type="change";a.liveFired=
A;return c.event.trigger(a,b,d)}}};c.event.special.change={filters:{focusout:Z,beforedeactivate:Z,click:function(a){var b=a.target,d=b.type;if(d==="radio"||d==="checkbox"||b.nodeName.toLowerCase()==="select")return Z.call(this,a)},keydown:function(a){var b=a.target,d=b.type;if(a.keyCode===13&&b.nodeName.toLowerCase()!=="textarea"||a.keyCode===32&&(d==="checkbox"||d==="radio")||d==="select-multiple")return Z.call(this,a)},beforeactivate:function(a){a=a.target;c.data(a,"_change_data",va(a))}},setup:function(){if(this.type===
"file")return false;for(var a in V)c.event.add(this,a+".specialChange",V[a]);return ha.test(this.nodeName)},teardown:function(){c.event.remove(this,".specialChange");return ha.test(this.nodeName)}};V=c.event.special.change.filters;V.focus=V.beforeactivate}u.addEventListener&&c.each({focus:"focusin",blur:"focusout"},function(a,b){function d(e){e=c.event.fix(e);e.type=b;return c.event.trigger(e,null,e.target)}c.event.special[b]={setup:function(){sa[b]++===0&&u.addEventListener(a,d,true)},teardown:function(){--sa[b]===
0&&u.removeEventListener(a,d,true)}}});c.each(["bind","one"],function(a,b){c.fn[b]=function(d,e,f){if(typeof d==="object"){for(var h in d)this[b](h,e,d[h],f);return this}if(c.isFunction(e)||e===false){f=e;e=A}var k=b==="one"?c.proxy(f,function(n){c(this).unbind(n,k);return f.apply(this,arguments)}):f;if(d==="unload"&&b!=="one")this.one(d,e,f);else{h=0;for(var l=this.length;h<l;h++)c.event.add(this[h],d,k,e)}return this}});c.fn.extend({unbind:function(a,b){if(typeof a==="object"&&!a.preventDefault)for(var d in a)this.unbind(d,
a[d]);else{d=0;for(var e=this.length;d<e;d++)c.event.remove(this[d],a,b)}return this},delegate:function(a,b,d,e){return this.live(b,d,e,a)},undelegate:function(a,b,d){return arguments.length===0?this.unbind("live"):this.die(b,null,d,a)},trigger:function(a,b){return this.each(function(){c.event.trigger(a,b,this)})},triggerHandler:function(a,b){if(this[0]){var d=c.Event(a);d.preventDefault();d.stopPropagation();c.event.trigger(d,b,this[0]);return d.result}},toggle:function(a){for(var b=arguments,d=
1;d<b.length;)c.proxy(a,b[d++]);return this.click(c.proxy(a,function(e){var f=(c.data(this,"lastToggle"+a.guid)||0)%d;c.data(this,"lastToggle"+a.guid,f+1);e.preventDefault();return b[f].apply(this,arguments)||false}))},hover:function(a,b){return this.mouseenter(a).mouseleave(b||a)}});var wa={focus:"focusin",blur:"focusout",mouseenter:"mouseover",mouseleave:"mouseout"};c.each(["live","die"],function(a,b){c.fn[b]=function(d,e,f,h){var k,l=0,n,s,v=h||this.selector;h=h?this:c(this.context);if(typeof d===
"object"&&!d.preventDefault){for(k in d)h[b](k,e,d[k],v);return this}if(c.isFunction(e)){f=e;e=A}for(d=(d||"").split(" ");(k=d[l++])!=null;){n=X.exec(k);s="";if(n){s=n[0];k=k.replace(X,"")}if(k==="hover")d.push("mouseenter"+s,"mouseleave"+s);else{n=k;if(k==="focus"||k==="blur"){d.push(wa[k]+s);k+=s}else k=(wa[k]||k)+s;if(b==="live"){s=0;for(var B=h.length;s<B;s++)c.event.add(h[s],"live."+Y(k,v),{data:e,selector:v,handler:f,origType:k,origHandler:f,preType:n})}else h.unbind("live."+Y(k,v),f)}}return this}});
c.each("blur focus focusin focusout load resize scroll unload click dblclick mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave change select submit keydown keypress keyup error".split(" "),function(a,b){c.fn[b]=function(d,e){if(e==null){e=d;d=null}return arguments.length>0?this.bind(b,d,e):this.trigger(b)};if(c.attrFn)c.attrFn[b]=true});E.attachEvent&&!E.addEventListener&&c(E).bind("unload",function(){for(var a in c.cache)if(c.cache[a].handle)try{c.event.remove(c.cache[a].handle.elem)}catch(b){}});
(function(){function a(g,j,o,m,p,q){p=0;for(var t=m.length;p<t;p++){var x=m[p];if(x){x=x[g];for(var C=false;x;){if(x.sizcache===o){C=m[x.sizset];break}if(x.nodeType===1&&!q){x.sizcache=o;x.sizset=p}if(x.nodeName.toLowerCase()===j){C=x;break}x=x[g]}m[p]=C}}}function b(g,j,o,m,p,q){p=0;for(var t=m.length;p<t;p++){var x=m[p];if(x){x=x[g];for(var C=false;x;){if(x.sizcache===o){C=m[x.sizset];break}if(x.nodeType===1){if(!q){x.sizcache=o;x.sizset=p}if(typeof j!=="string"){if(x===j){C=true;break}}else if(l.filter(j,
[x]).length>0){C=x;break}}x=x[g]}m[p]=C}}}var d=/((?:\((?:\([^()]+\)|[^()]+)+\)|\[(?:\[[^\[\]]*\]|['"][^'"]*['"]|[^\[\]'"]+)+\]|\\.|[^ >+~,(\[\\]+)+|[>+~])(\s*,\s*)?((?:.|\r|\n)*)/g,e=0,f=Object.prototype.toString,h=false,k=true;[0,0].sort(function(){k=false;return 0});var l=function(g,j,o,m){o=o||[];var p=j=j||u;if(j.nodeType!==1&&j.nodeType!==9)return[];if(!g||typeof g!=="string")return o;var q=[],t,x,C,P,N=true,R=l.isXML(j),Q=g,L;do{d.exec("");if(t=d.exec(Q)){Q=t[3];q.push(t[1]);if(t[2]){P=t[3];
break}}}while(t);if(q.length>1&&s.exec(g))if(q.length===2&&n.relative[q[0]])x=M(q[0]+q[1],j);else for(x=n.relative[q[0]]?[j]:l(q.shift(),j);q.length;){g=q.shift();if(n.relative[g])g+=q.shift();x=M(g,x)}else{if(!m&&q.length>1&&j.nodeType===9&&!R&&n.match.ID.test(q[0])&&!n.match.ID.test(q[q.length-1])){t=l.find(q.shift(),j,R);j=t.expr?l.filter(t.expr,t.set)[0]:t.set[0]}if(j){t=m?{expr:q.pop(),set:D(m)}:l.find(q.pop(),q.length===1&&(q[0]==="~"||q[0]==="+")&&j.parentNode?j.parentNode:j,R);x=t.expr?l.filter(t.expr,
t.set):t.set;if(q.length>0)C=D(x);else N=false;for(;q.length;){t=L=q.pop();if(n.relative[L])t=q.pop();else L="";if(t==null)t=j;n.relative[L](C,t,R)}}else C=[]}C||(C=x);C||l.error(L||g);if(f.call(C)==="[object Array]")if(N)if(j&&j.nodeType===1)for(g=0;C[g]!=null;g++){if(C[g]&&(C[g]===true||C[g].nodeType===1&&l.contains(j,C[g])))o.push(x[g])}else for(g=0;C[g]!=null;g++)C[g]&&C[g].nodeType===1&&o.push(x[g]);else o.push.apply(o,C);else D(C,o);if(P){l(P,p,o,m);l.uniqueSort(o)}return o};l.uniqueSort=function(g){if(w){h=
k;g.sort(w);if(h)for(var j=1;j<g.length;j++)g[j]===g[j-1]&&g.splice(j--,1)}return g};l.matches=function(g,j){return l(g,null,null,j)};l.matchesSelector=function(g,j){return l(j,null,null,[g]).length>0};l.find=function(g,j,o){var m;if(!g)return[];for(var p=0,q=n.order.length;p<q;p++){var t=n.order[p],x;if(x=n.leftMatch[t].exec(g)){var C=x[1];x.splice(1,1);if(C.substr(C.length-1)!=="\\"){x[1]=(x[1]||"").replace(/\\/g,"");m=n.find[t](x,j,o);if(m!=null){g=g.replace(n.match[t],"");break}}}}m||(m=j.getElementsByTagName("*"));
return{set:m,expr:g}};l.filter=function(g,j,o,m){for(var p=g,q=[],t=j,x,C,P=j&&j[0]&&l.isXML(j[0]);g&&j.length;){for(var N in n.filter)if((x=n.leftMatch[N].exec(g))!=null&&x[2]){var R=n.filter[N],Q,L;L=x[1];C=false;x.splice(1,1);if(L.substr(L.length-1)!=="\\"){if(t===q)q=[];if(n.preFilter[N])if(x=n.preFilter[N](x,t,o,q,m,P)){if(x===true)continue}else C=Q=true;if(x)for(var i=0;(L=t[i])!=null;i++)if(L){Q=R(L,x,i,t);var r=m^!!Q;if(o&&Q!=null)if(r)C=true;else t[i]=false;else if(r){q.push(L);C=true}}if(Q!==
A){o||(t=q);g=g.replace(n.match[N],"");if(!C)return[];break}}}if(g===p)if(C==null)l.error(g);else break;p=g}return t};l.error=function(g){throw"Syntax error, unrecognized expression: "+g;};var n=l.selectors={order:["ID","NAME","TAG"],match:{ID:/#((?:[\w\u00c0-\uFFFF\-]|\\.)+)/,CLASS:/\.((?:[\w\u00c0-\uFFFF\-]|\\.)+)/,NAME:/\[name=['"]*((?:[\w\u00c0-\uFFFF\-]|\\.)+)['"]*\]/,ATTR:/\[\s*((?:[\w\u00c0-\uFFFF\-]|\\.)+)\s*(?:(\S?=)\s*(['"]*)(.*?)\3|)\s*\]/,TAG:/^((?:[\w\u00c0-\uFFFF\*\-]|\\.)+)/,CHILD:/:(only|nth|last|first)-child(?:\((even|odd|[\dn+\-]*)\))?/,
POS:/:(nth|eq|gt|lt|first|last|even|odd)(?:\((\d*)\))?(?=[^\-]|$)/,PSEUDO:/:((?:[\w\u00c0-\uFFFF\-]|\\.)+)(?:\((['"]?)((?:\([^\)]+\)|[^\(\)]*)+)\2\))?/},leftMatch:{},attrMap:{"class":"className","for":"htmlFor"},attrHandle:{href:function(g){return g.getAttribute("href")}},relative:{"+":function(g,j){var o=typeof j==="string",m=o&&!/\W/.test(j);o=o&&!m;if(m)j=j.toLowerCase();m=0;for(var p=g.length,q;m<p;m++)if(q=g[m]){for(;(q=q.previousSibling)&&q.nodeType!==1;);g[m]=o||q&&q.nodeName.toLowerCase()===
j?q||false:q===j}o&&l.filter(j,g,true)},">":function(g,j){var o=typeof j==="string",m,p=0,q=g.length;if(o&&!/\W/.test(j))for(j=j.toLowerCase();p<q;p++){if(m=g[p]){o=m.parentNode;g[p]=o.nodeName.toLowerCase()===j?o:false}}else{for(;p<q;p++)if(m=g[p])g[p]=o?m.parentNode:m.parentNode===j;o&&l.filter(j,g,true)}},"":function(g,j,o){var m=e++,p=b,q;if(typeof j==="string"&&!/\W/.test(j)){q=j=j.toLowerCase();p=a}p("parentNode",j,m,g,q,o)},"~":function(g,j,o){var m=e++,p=b,q;if(typeof j==="string"&&!/\W/.test(j)){q=
j=j.toLowerCase();p=a}p("previousSibling",j,m,g,q,o)}},find:{ID:function(g,j,o){if(typeof j.getElementById!=="undefined"&&!o)return(g=j.getElementById(g[1]))&&g.parentNode?[g]:[]},NAME:function(g,j){if(typeof j.getElementsByName!=="undefined"){for(var o=[],m=j.getElementsByName(g[1]),p=0,q=m.length;p<q;p++)m[p].getAttribute("name")===g[1]&&o.push(m[p]);return o.length===0?null:o}},TAG:function(g,j){return j.getElementsByTagName(g[1])}},preFilter:{CLASS:function(g,j,o,m,p,q){g=" "+g[1].replace(/\\/g,
"")+" ";if(q)return g;q=0;for(var t;(t=j[q])!=null;q++)if(t)if(p^(t.className&&(" "+t.className+" ").replace(/[\t\n]/g," ").indexOf(g)>=0))o||m.push(t);else if(o)j[q]=false;return false},ID:function(g){return g[1].replace(/\\/g,"")},TAG:function(g){return g[1].toLowerCase()},CHILD:function(g){if(g[1]==="nth"){var j=/(-?)(\d*)n((?:\+|-)?\d*)/.exec(g[2]==="even"&&"2n"||g[2]==="odd"&&"2n+1"||!/\D/.test(g[2])&&"0n+"+g[2]||g[2]);g[2]=j[1]+(j[2]||1)-0;g[3]=j[3]-0}g[0]=e++;return g},ATTR:function(g,j,o,
m,p,q){j=g[1].replace(/\\/g,"");if(!q&&n.attrMap[j])g[1]=n.attrMap[j];if(g[2]==="~=")g[4]=" "+g[4]+" ";return g},PSEUDO:function(g,j,o,m,p){if(g[1]==="not")if((d.exec(g[3])||"").length>1||/^\w/.test(g[3]))g[3]=l(g[3],null,null,j);else{g=l.filter(g[3],j,o,true^p);o||m.push.apply(m,g);return false}else if(n.match.POS.test(g[0])||n.match.CHILD.test(g[0]))return true;return g},POS:function(g){g.unshift(true);return g}},filters:{enabled:function(g){return g.disabled===false&&g.type!=="hidden"},disabled:function(g){return g.disabled===
true},checked:function(g){return g.checked===true},selected:function(g){return g.selected===true},parent:function(g){return!!g.firstChild},empty:function(g){return!g.firstChild},has:function(g,j,o){return!!l(o[3],g).length},header:function(g){return/h\d/i.test(g.nodeName)},text:function(g){return"text"===g.type},radio:function(g){return"radio"===g.type},checkbox:function(g){return"checkbox"===g.type},file:function(g){return"file"===g.type},password:function(g){return"password"===g.type},submit:function(g){return"submit"===
g.type},image:function(g){return"image"===g.type},reset:function(g){return"reset"===g.type},button:function(g){return"button"===g.type||g.nodeName.toLowerCase()==="button"},input:function(g){return/input|select|textarea|button/i.test(g.nodeName)}},setFilters:{first:function(g,j){return j===0},last:function(g,j,o,m){return j===m.length-1},even:function(g,j){return j%2===0},odd:function(g,j){return j%2===1},lt:function(g,j,o){return j<o[3]-0},gt:function(g,j,o){return j>o[3]-0},nth:function(g,j,o){return o[3]-
0===j},eq:function(g,j,o){return o[3]-0===j}},filter:{PSEUDO:function(g,j,o,m){var p=j[1],q=n.filters[p];if(q)return q(g,o,j,m);else if(p==="contains")return(g.textContent||g.innerText||l.getText([g])||"").indexOf(j[3])>=0;else if(p==="not"){j=j[3];o=0;for(m=j.length;o<m;o++)if(j[o]===g)return false;return true}else l.error("Syntax error, unrecognized expression: "+p)},CHILD:function(g,j){var o=j[1],m=g;switch(o){case "only":case "first":for(;m=m.previousSibling;)if(m.nodeType===1)return false;if(o===
"first")return true;m=g;case "last":for(;m=m.nextSibling;)if(m.nodeType===1)return false;return true;case "nth":o=j[2];var p=j[3];if(o===1&&p===0)return true;var q=j[0],t=g.parentNode;if(t&&(t.sizcache!==q||!g.nodeIndex)){var x=0;for(m=t.firstChild;m;m=m.nextSibling)if(m.nodeType===1)m.nodeIndex=++x;t.sizcache=q}m=g.nodeIndex-p;return o===0?m===0:m%o===0&&m/o>=0}},ID:function(g,j){return g.nodeType===1&&g.getAttribute("id")===j},TAG:function(g,j){return j==="*"&&g.nodeType===1||g.nodeName.toLowerCase()===
j},CLASS:function(g,j){return(" "+(g.className||g.getAttribute("class"))+" ").indexOf(j)>-1},ATTR:function(g,j){var o=j[1];o=n.attrHandle[o]?n.attrHandle[o](g):g[o]!=null?g[o]:g.getAttribute(o);var m=o+"",p=j[2],q=j[4];return o==null?p==="!=":p==="="?m===q:p==="*="?m.indexOf(q)>=0:p==="~="?(" "+m+" ").indexOf(q)>=0:!q?m&&o!==false:p==="!="?m!==q:p==="^="?m.indexOf(q)===0:p==="$="?m.substr(m.length-q.length)===q:p==="|="?m===q||m.substr(0,q.length+1)===q+"-":false},POS:function(g,j,o,m){var p=n.setFilters[j[2]];
if(p)return p(g,o,j,m)}}},s=n.match.POS,v=function(g,j){return"\\"+(j-0+1)},B;for(B in n.match){n.match[B]=RegExp(n.match[B].source+/(?![^\[]*\])(?![^\(]*\))/.source);n.leftMatch[B]=RegExp(/(^(?:.|\r|\n)*?)/.source+n.match[B].source.replace(/\\(\d+)/g,v))}var D=function(g,j){g=Array.prototype.slice.call(g,0);if(j){j.push.apply(j,g);return j}return g};try{Array.prototype.slice.call(u.documentElement.childNodes,0)}catch(H){D=function(g,j){var o=j||[],m=0;if(f.call(g)==="[object Array]")Array.prototype.push.apply(o,
g);else if(typeof g.length==="number")for(var p=g.length;m<p;m++)o.push(g[m]);else for(;g[m];m++)o.push(g[m]);return o}}var w,G;if(u.documentElement.compareDocumentPosition)w=function(g,j){if(g===j){h=true;return 0}if(!g.compareDocumentPosition||!j.compareDocumentPosition)return g.compareDocumentPosition?-1:1;return g.compareDocumentPosition(j)&4?-1:1};else{w=function(g,j){var o=[],m=[],p=g.parentNode,q=j.parentNode,t=p;if(g===j){h=true;return 0}else if(p===q)return G(g,j);else if(p){if(!q)return 1}else return-1;
for(;t;){o.unshift(t);t=t.parentNode}for(t=q;t;){m.unshift(t);t=t.parentNode}p=o.length;q=m.length;for(t=0;t<p&&t<q;t++)if(o[t]!==m[t])return G(o[t],m[t]);return t===p?G(g,m[t],-1):G(o[t],j,1)};G=function(g,j,o){if(g===j)return o;for(g=g.nextSibling;g;){if(g===j)return-1;g=g.nextSibling}return 1}}l.getText=function(g){for(var j="",o,m=0;g[m];m++){o=g[m];if(o.nodeType===3||o.nodeType===4)j+=o.nodeValue;else if(o.nodeType!==8)j+=l.getText(o.childNodes)}return j};(function(){var g=u.createElement("div"),
j="script"+(new Date).getTime();g.innerHTML="<a name='"+j+"'/>";var o=u.documentElement;o.insertBefore(g,o.firstChild);if(u.getElementById(j)){n.find.ID=function(m,p,q){if(typeof p.getElementById!=="undefined"&&!q)return(p=p.getElementById(m[1]))?p.id===m[1]||typeof p.getAttributeNode!=="undefined"&&p.getAttributeNode("id").nodeValue===m[1]?[p]:A:[]};n.filter.ID=function(m,p){var q=typeof m.getAttributeNode!=="undefined"&&m.getAttributeNode("id");return m.nodeType===1&&q&&q.nodeValue===p}}o.removeChild(g);
o=g=null})();(function(){var g=u.createElement("div");g.appendChild(u.createComment(""));if(g.getElementsByTagName("*").length>0)n.find.TAG=function(j,o){var m=o.getElementsByTagName(j[1]);if(j[1]==="*"){for(var p=[],q=0;m[q];q++)m[q].nodeType===1&&p.push(m[q]);m=p}return m};g.innerHTML="<a href='#'></a>";if(g.firstChild&&typeof g.firstChild.getAttribute!=="undefined"&&g.firstChild.getAttribute("href")!=="#")n.attrHandle.href=function(j){return j.getAttribute("href",2)};g=null})();u.querySelectorAll&&
function(){var g=l,j=u.createElement("div");j.innerHTML="<p class='TEST'></p>";if(!(j.querySelectorAll&&j.querySelectorAll(".TEST").length===0)){l=function(m,p,q,t){p=p||u;if(!t&&!l.isXML(p))if(p.nodeType===9)try{return D(p.querySelectorAll(m),q)}catch(x){}else if(p.nodeType===1&&p.nodeName.toLowerCase()!=="object"){var C=p.id,P=p.id="__sizzle__";try{return D(p.querySelectorAll("#"+P+" "+m),q)}catch(N){}finally{if(C)p.id=C;else p.removeAttribute("id")}}return g(m,p,q,t)};for(var o in g)l[o]=g[o];
j=null}}();(function(){var g=u.documentElement,j=g.matchesSelector||g.mozMatchesSelector||g.webkitMatchesSelector||g.msMatchesSelector,o=false;try{j.call(u.documentElement,":sizzle")}catch(m){o=true}if(j)l.matchesSelector=function(p,q){try{if(o||!n.match.PSEUDO.test(q))return j.call(p,q)}catch(t){}return l(q,null,null,[p]).length>0}})();(function(){var g=u.createElement("div");g.innerHTML="<div class='test e'></div><div class='test'></div>";if(!(!g.getElementsByClassName||g.getElementsByClassName("e").length===
0)){g.lastChild.className="e";if(g.getElementsByClassName("e").length!==1){n.order.splice(1,0,"CLASS");n.find.CLASS=function(j,o,m){if(typeof o.getElementsByClassName!=="undefined"&&!m)return o.getElementsByClassName(j[1])};g=null}}})();l.contains=u.documentElement.contains?function(g,j){return g!==j&&(g.contains?g.contains(j):true)}:function(g,j){return!!(g.compareDocumentPosition(j)&16)};l.isXML=function(g){return(g=(g?g.ownerDocument||g:0).documentElement)?g.nodeName!=="HTML":false};var M=function(g,
j){for(var o=[],m="",p,q=j.nodeType?[j]:j;p=n.match.PSEUDO.exec(g);){m+=p[0];g=g.replace(n.match.PSEUDO,"")}g=n.relative[g]?g+"*":g;p=0;for(var t=q.length;p<t;p++)l(g,q[p],o);return l.filter(m,o)};c.find=l;c.expr=l.selectors;c.expr[":"]=c.expr.filters;c.unique=l.uniqueSort;c.text=l.getText;c.isXMLDoc=l.isXML;c.contains=l.contains})();var Wa=/Until$/,Xa=/^(?:parents|prevUntil|prevAll)/,Ya=/,/,Ja=/^.[^:#\[\.,]*$/,Za=Array.prototype.slice,$a=c.expr.match.POS;c.fn.extend({find:function(a){for(var b=this.pushStack("",
"find",a),d=0,e=0,f=this.length;e<f;e++){d=b.length;c.find(a,this[e],b);if(e>0)for(var h=d;h<b.length;h++)for(var k=0;k<d;k++)if(b[k]===b[h]){b.splice(h--,1);break}}return b},has:function(a){var b=c(a);return this.filter(function(){for(var d=0,e=b.length;d<e;d++)if(c.contains(this,b[d]))return true})},not:function(a){return this.pushStack(ka(this,a,false),"not",a)},filter:function(a){return this.pushStack(ka(this,a,true),"filter",a)},is:function(a){return!!a&&c.filter(a,this).length>0},closest:function(a,
b){var d=[],e,f,h=this[0];if(c.isArray(a)){var k={},l,n=1;if(h&&a.length){e=0;for(f=a.length;e<f;e++){l=a[e];k[l]||(k[l]=c.expr.match.POS.test(l)?c(l,b||this.context):l)}for(;h&&h.ownerDocument&&h!==b;){for(l in k){e=k[l];if(e.jquery?e.index(h)>-1:c(h).is(e))d.push({selector:l,elem:h,level:n})}h=h.parentNode;n++}}return d}k=$a.test(a)?c(a,b||this.context):null;e=0;for(f=this.length;e<f;e++)for(h=this[e];h;)if(k?k.index(h)>-1:c.find.matchesSelector(h,a)){d.push(h);break}else{h=h.parentNode;if(!h||
!h.ownerDocument||h===b)break}d=d.length>1?c.unique(d):d;return this.pushStack(d,"closest",a)},index:function(a){if(!a||typeof a==="string")return c.inArray(this[0],a?c(a):this.parent().children());return c.inArray(a.jquery?a[0]:a,this)},add:function(a,b){var d=typeof a==="string"?c(a,b||this.context):c.makeArray(a),e=c.merge(this.get(),d);return this.pushStack(!d[0]||!d[0].parentNode||d[0].parentNode.nodeType===11||!e[0]||!e[0].parentNode||e[0].parentNode.nodeType===11?e:c.unique(e))},andSelf:function(){return this.add(this.prevObject)}});
c.each({parent:function(a){return(a=a.parentNode)&&a.nodeType!==11?a:null},parents:function(a){return c.dir(a,"parentNode")},parentsUntil:function(a,b,d){return c.dir(a,"parentNode",d)},next:function(a){return c.nth(a,2,"nextSibling")},prev:function(a){return c.nth(a,2,"previousSibling")},nextAll:function(a){return c.dir(a,"nextSibling")},prevAll:function(a){return c.dir(a,"previousSibling")},nextUntil:function(a,b,d){return c.dir(a,"nextSibling",d)},prevUntil:function(a,b,d){return c.dir(a,"previousSibling",
d)},siblings:function(a){return c.sibling(a.parentNode.firstChild,a)},children:function(a){return c.sibling(a.firstChild)},contents:function(a){return c.nodeName(a,"iframe")?a.contentDocument||a.contentWindow.document:c.makeArray(a.childNodes)}},function(a,b){c.fn[a]=function(d,e){var f=c.map(this,b,d);Wa.test(a)||(e=d);if(e&&typeof e==="string")f=c.filter(e,f);f=this.length>1?c.unique(f):f;if((this.length>1||Ya.test(e))&&Xa.test(a))f=f.reverse();return this.pushStack(f,a,Za.call(arguments).join(","))}});
c.extend({filter:function(a,b,d){if(d)a=":not("+a+")";return b.length===1?c.find.matchesSelector(b[0],a)?[b[0]]:[]:c.find.matches(a,b)},dir:function(a,b,d){var e=[];for(a=a[b];a&&a.nodeType!==9&&(d===A||a.nodeType!==1||!c(a).is(d));){a.nodeType===1&&e.push(a);a=a[b]}return e},nth:function(a,b,d){b=b||1;for(var e=0;a;a=a[d])if(a.nodeType===1&&++e===b)break;return a},sibling:function(a,b){for(var d=[];a;a=a.nextSibling)a.nodeType===1&&a!==b&&d.push(a);return d}});var xa=/ jQuery\d+="(?:\d+|null)"/g,
$=/^\s+/,ya=/<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/ig,za=/<([\w:]+)/,ab=/<tbody/i,bb=/<|&#?\w+;/,Aa=/<(?:script|object|embed|option|style)/i,Ba=/checked\s*(?:[^=]|=\s*.checked.)/i,cb=/\=([^="'>\s]+\/)>/g,O={option:[1,"<select multiple='multiple'>","</select>"],legend:[1,"<fieldset>","</fieldset>"],thead:[1,"<table>","</table>"],tr:[2,"<table><tbody>","</tbody></table>"],td:[3,"<table><tbody><tr>","</tr></tbody></table>"],col:[2,"<table><tbody></tbody><colgroup>","</colgroup></table>"],
area:[1,"<map>","</map>"],_default:[0,"",""]};O.optgroup=O.option;O.tbody=O.tfoot=O.colgroup=O.caption=O.thead;O.th=O.td;if(!c.support.htmlSerialize)O._default=[1,"div<div>","</div>"];c.fn.extend({text:function(a){if(c.isFunction(a))return this.each(function(b){var d=c(this);d.text(a.call(this,b,d.text()))});if(typeof a!=="object"&&a!==A)return this.empty().append((this[0]&&this[0].ownerDocument||u).createTextNode(a));return c.text(this)},wrapAll:function(a){if(c.isFunction(a))return this.each(function(d){c(this).wrapAll(a.call(this,
d))});if(this[0]){var b=c(a,this[0].ownerDocument).eq(0).clone(true);this[0].parentNode&&b.insertBefore(this[0]);b.map(function(){for(var d=this;d.firstChild&&d.firstChild.nodeType===1;)d=d.firstChild;return d}).append(this)}return this},wrapInner:function(a){if(c.isFunction(a))return this.each(function(b){c(this).wrapInner(a.call(this,b))});return this.each(function(){var b=c(this),d=b.contents();d.length?d.wrapAll(a):b.append(a)})},wrap:function(a){return this.each(function(){c(this).wrapAll(a)})},
unwrap:function(){return this.parent().each(function(){c.nodeName(this,"body")||c(this).replaceWith(this.childNodes)}).end()},append:function(){return this.domManip(arguments,true,function(a){this.nodeType===1&&this.appendChild(a)})},prepend:function(){return this.domManip(arguments,true,function(a){this.nodeType===1&&this.insertBefore(a,this.firstChild)})},before:function(){if(this[0]&&this[0].parentNode)return this.domManip(arguments,false,function(b){this.parentNode.insertBefore(b,this)});else if(arguments.length){var a=
c(arguments[0]);a.push.apply(a,this.toArray());return this.pushStack(a,"before",arguments)}},after:function(){if(this[0]&&this[0].parentNode)return this.domManip(arguments,false,function(b){this.parentNode.insertBefore(b,this.nextSibling)});else if(arguments.length){var a=this.pushStack(this,"after",arguments);a.push.apply(a,c(arguments[0]).toArray());return a}},remove:function(a,b){for(var d=0,e;(e=this[d])!=null;d++)if(!a||c.filter(a,[e]).length){if(!b&&e.nodeType===1){c.cleanData(e.getElementsByTagName("*"));
c.cleanData([e])}e.parentNode&&e.parentNode.removeChild(e)}return this},empty:function(){for(var a=0,b;(b=this[a])!=null;a++)for(b.nodeType===1&&c.cleanData(b.getElementsByTagName("*"));b.firstChild;)b.removeChild(b.firstChild);return this},clone:function(a){var b=this.map(function(){if(!c.support.noCloneEvent&&!c.isXMLDoc(this)){var d=this.outerHTML,e=this.ownerDocument;if(!d){d=e.createElement("div");d.appendChild(this.cloneNode(true));d=d.innerHTML}return c.clean([d.replace(xa,"").replace(cb,'="$1">').replace($,
"")],e)[0]}else return this.cloneNode(true)});if(a===true){la(this,b);la(this.find("*"),b.find("*"))}return b},html:function(a){if(a===A)return this[0]&&this[0].nodeType===1?this[0].innerHTML.replace(xa,""):null;else if(typeof a==="string"&&!Aa.test(a)&&(c.support.leadingWhitespace||!$.test(a))&&!O[(za.exec(a)||["",""])[1].toLowerCase()]){a=a.replace(ya,"<$1></$2>");try{for(var b=0,d=this.length;b<d;b++)if(this[b].nodeType===1){c.cleanData(this[b].getElementsByTagName("*"));this[b].innerHTML=a}}catch(e){this.empty().append(a)}}else c.isFunction(a)?
this.each(function(f){var h=c(this);h.html(a.call(this,f,h.html()))}):this.empty().append(a);return this},replaceWith:function(a){if(this[0]&&this[0].parentNode){if(c.isFunction(a))return this.each(function(b){var d=c(this),e=d.html();d.replaceWith(a.call(this,b,e))});if(typeof a!=="string")a=c(a).detach();return this.each(function(){var b=this.nextSibling,d=this.parentNode;c(this).remove();b?c(b).before(a):c(d).append(a)})}else return this.pushStack(c(c.isFunction(a)?a():a),"replaceWith",a)},detach:function(a){return this.remove(a,
true)},domManip:function(a,b,d){var e,f,h=a[0],k=[],l;if(!c.support.checkClone&&arguments.length===3&&typeof h==="string"&&Ba.test(h))return this.each(function(){c(this).domManip(a,b,d,true)});if(c.isFunction(h))return this.each(function(s){var v=c(this);a[0]=h.call(this,s,b?v.html():A);v.domManip(a,b,d)});if(this[0]){e=h&&h.parentNode;e=c.support.parentNode&&e&&e.nodeType===11&&e.childNodes.length===this.length?{fragment:e}:c.buildFragment(a,this,k);l=e.fragment;if(f=l.childNodes.length===1?l=l.firstChild:
l.firstChild){b=b&&c.nodeName(f,"tr");f=0;for(var n=this.length;f<n;f++)d.call(b?c.nodeName(this[f],"table")?this[f].getElementsByTagName("tbody")[0]||this[f].appendChild(this[f].ownerDocument.createElement("tbody")):this[f]:this[f],f>0||e.cacheable||this.length>1?l.cloneNode(true):l)}k.length&&c.each(k,Ka)}return this}});c.buildFragment=function(a,b,d){var e,f,h;b=b&&b[0]?b[0].ownerDocument||b[0]:u;if(a.length===1&&typeof a[0]==="string"&&a[0].length<512&&b===u&&!Aa.test(a[0])&&(c.support.checkClone||
!Ba.test(a[0]))){f=true;if(h=c.fragments[a[0]])if(h!==1)e=h}if(!e){e=b.createDocumentFragment();c.clean(a,b,e,d)}if(f)c.fragments[a[0]]=h?e:1;return{fragment:e,cacheable:f}};c.fragments={};c.each({appendTo:"append",prependTo:"prepend",insertBefore:"before",insertAfter:"after",replaceAll:"replaceWith"},function(a,b){c.fn[a]=function(d){var e=[];d=c(d);var f=this.length===1&&this[0].parentNode;if(f&&f.nodeType===11&&f.childNodes.length===1&&d.length===1){d[b](this[0]);return this}else{f=0;for(var h=
d.length;f<h;f++){var k=(f>0?this.clone(true):this).get();c(d[f])[b](k);e=e.concat(k)}return this.pushStack(e,a,d.selector)}}});c.extend({clean:function(a,b,d,e){b=b||u;if(typeof b.createElement==="undefined")b=b.ownerDocument||b[0]&&b[0].ownerDocument||u;for(var f=[],h=0,k;(k=a[h])!=null;h++){if(typeof k==="number")k+="";if(k){if(typeof k==="string"&&!bb.test(k))k=b.createTextNode(k);else if(typeof k==="string"){k=k.replace(ya,"<$1></$2>");var l=(za.exec(k)||["",""])[1].toLowerCase(),n=O[l]||O._default,
s=n[0],v=b.createElement("div");for(v.innerHTML=n[1]+k+n[2];s--;)v=v.lastChild;if(!c.support.tbody){s=ab.test(k);l=l==="table"&&!s?v.firstChild&&v.firstChild.childNodes:n[1]==="<table>"&&!s?v.childNodes:[];for(n=l.length-1;n>=0;--n)c.nodeName(l[n],"tbody")&&!l[n].childNodes.length&&l[n].parentNode.removeChild(l[n])}!c.support.leadingWhitespace&&$.test(k)&&v.insertBefore(b.createTextNode($.exec(k)[0]),v.firstChild);k=v.childNodes}if(k.nodeType)f.push(k);else f=c.merge(f,k)}}if(d)for(h=0;f[h];h++)if(e&&
c.nodeName(f[h],"script")&&(!f[h].type||f[h].type.toLowerCase()==="text/javascript"))e.push(f[h].parentNode?f[h].parentNode.removeChild(f[h]):f[h]);else{f[h].nodeType===1&&f.splice.apply(f,[h+1,0].concat(c.makeArray(f[h].getElementsByTagName("script"))));d.appendChild(f[h])}return f},cleanData:function(a){for(var b,d,e=c.cache,f=c.event.special,h=c.support.deleteExpando,k=0,l;(l=a[k])!=null;k++)if(!(l.nodeName&&c.noData[l.nodeName.toLowerCase()]))if(d=l[c.expando]){if((b=e[d])&&b.events)for(var n in b.events)f[n]?
c.event.remove(l,n):c.removeEvent(l,n,b.handle);if(h)delete l[c.expando];else l.removeAttribute&&l.removeAttribute(c.expando);delete e[d]}}});var Ca=/alpha\([^)]*\)/i,db=/opacity=([^)]*)/,eb=/-([a-z])/ig,fb=/([A-Z])/g,Da=/^-?\d+(?:px)?$/i,gb=/^-?\d/,hb={position:"absolute",visibility:"hidden",display:"block"},La=["Left","Right"],Ma=["Top","Bottom"],W,ib=u.defaultView&&u.defaultView.getComputedStyle,jb=function(a,b){return b.toUpperCase()};c.fn.css=function(a,b){if(arguments.length===2&&b===A)return this;
return c.access(this,a,b,true,function(d,e,f){return f!==A?c.style(d,e,f):c.css(d,e)})};c.extend({cssHooks:{opacity:{get:function(a,b){if(b){var d=W(a,"opacity","opacity");return d===""?"1":d}else return a.style.opacity}}},cssNumber:{zIndex:true,fontWeight:true,opacity:true,zoom:true,lineHeight:true},cssProps:{"float":c.support.cssFloat?"cssFloat":"styleFloat"},style:function(a,b,d,e){if(!(!a||a.nodeType===3||a.nodeType===8||!a.style)){var f,h=c.camelCase(b),k=a.style,l=c.cssHooks[h];b=c.cssProps[h]||
h;if(d!==A){if(!(typeof d==="number"&&isNaN(d)||d==null)){if(typeof d==="number"&&!c.cssNumber[h])d+="px";if(!l||!("set"in l)||(d=l.set(a,d))!==A)try{k[b]=d}catch(n){}}}else{if(l&&"get"in l&&(f=l.get(a,false,e))!==A)return f;return k[b]}}},css:function(a,b,d){var e,f=c.camelCase(b),h=c.cssHooks[f];b=c.cssProps[f]||f;if(h&&"get"in h&&(e=h.get(a,true,d))!==A)return e;else if(W)return W(a,b,f)},swap:function(a,b,d){var e={},f;for(f in b){e[f]=a.style[f];a.style[f]=b[f]}d.call(a);for(f in b)a.style[f]=
e[f]},camelCase:function(a){return a.replace(eb,jb)}});c.curCSS=c.css;c.each(["height","width"],function(a,b){c.cssHooks[b]={get:function(d,e,f){var h;if(e){if(d.offsetWidth!==0)h=ma(d,b,f);else c.swap(d,hb,function(){h=ma(d,b,f)});return h+"px"}},set:function(d,e){if(Da.test(e)){e=parseFloat(e);if(e>=0)return e+"px"}else return e}}});if(!c.support.opacity)c.cssHooks.opacity={get:function(a,b){return db.test((b&&a.currentStyle?a.currentStyle.filter:a.style.filter)||"")?parseFloat(RegExp.$1)/100+"":
b?"1":""},set:function(a,b){var d=a.style;d.zoom=1;var e=c.isNaN(b)?"":"alpha(opacity="+b*100+")",f=d.filter||"";d.filter=Ca.test(f)?f.replace(Ca,e):d.filter+" "+e}};if(ib)W=function(a,b,d){var e;d=d.replace(fb,"-$1").toLowerCase();if(!(b=a.ownerDocument.defaultView))return A;if(b=b.getComputedStyle(a,null)){e=b.getPropertyValue(d);if(e===""&&!c.contains(a.ownerDocument.documentElement,a))e=c.style(a,d)}return e};else if(u.documentElement.currentStyle)W=function(a,b){var d,e,f=a.currentStyle&&a.currentStyle[b],
h=a.style;if(!Da.test(f)&&gb.test(f)){d=h.left;e=a.runtimeStyle.left;a.runtimeStyle.left=a.currentStyle.left;h.left=b==="fontSize"?"1em":f||0;f=h.pixelLeft+"px";h.left=d;a.runtimeStyle.left=e}return f};if(c.expr&&c.expr.filters){c.expr.filters.hidden=function(a){var b=a.offsetHeight;return a.offsetWidth===0&&b===0||!c.support.reliableHiddenOffsets&&(a.style.display||c.css(a,"display"))==="none"};c.expr.filters.visible=function(a){return!c.expr.filters.hidden(a)}}var kb=c.now(),lb=/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
mb=/^(?:select|textarea)/i,nb=/^(?:color|date|datetime|email|hidden|month|number|password|range|search|tel|text|time|url|week)$/i,ob=/^(?:GET|HEAD|DELETE)$/,Na=/\[\]$/,T=/\=\?(&|$)/,ia=/\?/,pb=/([?&])_=[^&]*/,qb=/^(\w+:)?\/\/([^\/?#]+)/,rb=/%20/g,sb=/#.*$/,Ea=c.fn.load;c.fn.extend({load:function(a,b,d){if(typeof a!=="string"&&Ea)return Ea.apply(this,arguments);else if(!this.length)return this;var e=a.indexOf(" ");if(e>=0){var f=a.slice(e,a.length);a=a.slice(0,e)}e="GET";if(b)if(c.isFunction(b)){d=
b;b=null}else if(typeof b==="object"){b=c.param(b,c.ajaxSettings.traditional);e="POST"}var h=this;c.ajax({url:a,type:e,dataType:"html",data:b,complete:function(k,l){if(l==="success"||l==="notmodified")h.html(f?c("<div>").append(k.responseText.replace(lb,"")).find(f):k.responseText);d&&h.each(d,[k.responseText,l,k])}});return this},serialize:function(){return c.param(this.serializeArray())},serializeArray:function(){return this.map(function(){return this.elements?c.makeArray(this.elements):this}).filter(function(){return this.name&&
!this.disabled&&(this.checked||mb.test(this.nodeName)||nb.test(this.type))}).map(function(a,b){var d=c(this).val();return d==null?null:c.isArray(d)?c.map(d,function(e){return{name:b.name,value:e}}):{name:b.name,value:d}}).get()}});c.each("ajaxStart ajaxStop ajaxComplete ajaxError ajaxSuccess ajaxSend".split(" "),function(a,b){c.fn[b]=function(d){return this.bind(b,d)}});c.extend({get:function(a,b,d,e){if(c.isFunction(b)){e=e||d;d=b;b=null}return c.ajax({type:"GET",url:a,data:b,success:d,dataType:e})},
getScript:function(a,b){return c.get(a,null,b,"script")},getJSON:function(a,b,d){return c.get(a,b,d,"json")},post:function(a,b,d,e){if(c.isFunction(b)){e=e||d;d=b;b={}}return c.ajax({type:"POST",url:a,data:b,success:d,dataType:e})},ajaxSetup:function(a){c.extend(c.ajaxSettings,a)},ajaxSettings:{url:location.href,global:true,type:"GET",contentType:"application/x-www-form-urlencoded",processData:true,async:true,xhr:function(){return new E.XMLHttpRequest},accepts:{xml:"application/xml, text/xml",html:"text/html",
script:"text/javascript, application/javascript",json:"application/json, text/javascript",text:"text/plain",_default:"*/*"}},ajax:function(a){var b=c.extend(true,{},c.ajaxSettings,a),d,e,f,h=b.type.toUpperCase(),k=ob.test(h);b.url=b.url.replace(sb,"");b.context=a&&a.context!=null?a.context:b;if(b.data&&b.processData&&typeof b.data!=="string")b.data=c.param(b.data,b.traditional);if(b.dataType==="jsonp"){if(h==="GET")T.test(b.url)||(b.url+=(ia.test(b.url)?"&":"?")+(b.jsonp||"callback")+"=?");else if(!b.data||
!T.test(b.data))b.data=(b.data?b.data+"&":"")+(b.jsonp||"callback")+"=?";b.dataType="json"}if(b.dataType==="json"&&(b.data&&T.test(b.data)||T.test(b.url))){d=b.jsonpCallback||"jsonp"+kb++;if(b.data)b.data=(b.data+"").replace(T,"="+d+"$1");b.url=b.url.replace(T,"="+d+"$1");b.dataType="script";var l=E[d];E[d]=function(m){f=m;c.handleSuccess(b,w,e,f);c.handleComplete(b,w,e,f);if(c.isFunction(l))l(m);else{E[d]=A;try{delete E[d]}catch(p){}}v&&v.removeChild(B)}}if(b.dataType==="script"&&b.cache===null)b.cache=
false;if(b.cache===false&&h==="GET"){var n=c.now(),s=b.url.replace(pb,"$1_="+n);b.url=s+(s===b.url?(ia.test(b.url)?"&":"?")+"_="+n:"")}if(b.data&&h==="GET")b.url+=(ia.test(b.url)?"&":"?")+b.data;b.global&&c.active++===0&&c.event.trigger("ajaxStart");n=(n=qb.exec(b.url))&&(n[1]&&n[1]!==location.protocol||n[2]!==location.host);if(b.dataType==="script"&&h==="GET"&&n){var v=u.getElementsByTagName("head")[0]||u.documentElement,B=u.createElement("script");if(b.scriptCharset)B.charset=b.scriptCharset;B.src=
b.url;if(!d){var D=false;B.onload=B.onreadystatechange=function(){if(!D&&(!this.readyState||this.readyState==="loaded"||this.readyState==="complete")){D=true;c.handleSuccess(b,w,e,f);c.handleComplete(b,w,e,f);B.onload=B.onreadystatechange=null;v&&B.parentNode&&v.removeChild(B)}}}v.insertBefore(B,v.firstChild);return A}var H=false,w=b.xhr();if(w){b.username?w.open(h,b.url,b.async,b.username,b.password):w.open(h,b.url,b.async);try{if(b.data!=null&&!k||a&&a.contentType)w.setRequestHeader("Content-Type",
b.contentType);if(b.ifModified){c.lastModified[b.url]&&w.setRequestHeader("If-Modified-Since",c.lastModified[b.url]);c.etag[b.url]&&w.setRequestHeader("If-None-Match",c.etag[b.url])}n||w.setRequestHeader("X-Requested-With","XMLHttpRequest");w.setRequestHeader("Accept",b.dataType&&b.accepts[b.dataType]?b.accepts[b.dataType]+", */*; q=0.01":b.accepts._default)}catch(G){}if(b.beforeSend&&b.beforeSend.call(b.context,w,b)===false){b.global&&c.active--===1&&c.event.trigger("ajaxStop");w.abort();return false}b.global&&
c.triggerGlobal(b,"ajaxSend",[w,b]);var M=w.onreadystatechange=function(m){if(!w||w.readyState===0||m==="abort"){H||c.handleComplete(b,w,e,f);H=true;if(w)w.onreadystatechange=c.noop}else if(!H&&w&&(w.readyState===4||m==="timeout")){H=true;w.onreadystatechange=c.noop;e=m==="timeout"?"timeout":!c.httpSuccess(w)?"error":b.ifModified&&c.httpNotModified(w,b.url)?"notmodified":"success";var p;if(e==="success")try{f=c.httpData(w,b.dataType,b)}catch(q){e="parsererror";p=q}if(e==="success"||e==="notmodified")d||
c.handleSuccess(b,w,e,f);else c.handleError(b,w,e,p);d||c.handleComplete(b,w,e,f);m==="timeout"&&w.abort();if(b.async)w=null}};try{var g=w.abort;w.abort=function(){w&&g.call&&g.call(w);M("abort")}}catch(j){}b.async&&b.timeout>0&&setTimeout(function(){w&&!H&&M("timeout")},b.timeout);try{w.send(k||b.data==null?null:b.data)}catch(o){c.handleError(b,w,null,o);c.handleComplete(b,w,e,f)}b.async||M();return w}},param:function(a,b){var d=[],e=function(h,k){k=c.isFunction(k)?k():k;d[d.length]=encodeURIComponent(h)+
"="+encodeURIComponent(k)};if(b===A)b=c.ajaxSettings.traditional;if(c.isArray(a)||a.jquery)c.each(a,function(){e(this.name,this.value)});else for(var f in a)ca(f,a[f],b,e);return d.join("&").replace(rb,"+")}});c.extend({active:0,lastModified:{},etag:{},handleError:function(a,b,d,e){a.error&&a.error.call(a.context,b,d,e);a.global&&c.triggerGlobal(a,"ajaxError",[b,a,e])},handleSuccess:function(a,b,d,e){a.success&&a.success.call(a.context,e,d,b);a.global&&c.triggerGlobal(a,"ajaxSuccess",[b,a])},handleComplete:function(a,
b,d){a.complete&&a.complete.call(a.context,b,d);a.global&&c.triggerGlobal(a,"ajaxComplete",[b,a]);a.global&&c.active--===1&&c.event.trigger("ajaxStop")},triggerGlobal:function(a,b,d){(a.context&&a.context.url==null?c(a.context):c.event).trigger(b,d)},httpSuccess:function(a){try{return!a.status&&location.protocol==="file:"||a.status>=200&&a.status<300||a.status===304||a.status===1223}catch(b){}return false},httpNotModified:function(a,b){var d=a.getResponseHeader("Last-Modified"),e=a.getResponseHeader("Etag");
if(d)c.lastModified[b]=d;if(e)c.etag[b]=e;return a.status===304},httpData:function(a,b,d){var e=a.getResponseHeader("content-type")||"",f=b==="xml"||!b&&e.indexOf("xml")>=0;a=f?a.responseXML:a.responseText;f&&a.documentElement.nodeName==="parsererror"&&c.error("parsererror");if(d&&d.dataFilter)a=d.dataFilter(a,b);if(typeof a==="string")if(b==="json"||!b&&e.indexOf("json")>=0)a=c.parseJSON(a);else if(b==="script"||!b&&e.indexOf("javascript")>=0)c.globalEval(a);return a}});if(E.ActiveXObject)c.ajaxSettings.xhr=
function(){if(E.location.protocol!=="file:")try{return new E.XMLHttpRequest}catch(a){}try{return new E.ActiveXObject("Microsoft.XMLHTTP")}catch(b){}};c.support.ajax=!!c.ajaxSettings.xhr();var da={},tb=/^(?:toggle|show|hide)$/,ub=/^([+\-]=)?([\d+.\-]+)(.*)$/,aa,na=[["height","marginTop","marginBottom","paddingTop","paddingBottom"],["width","marginLeft","marginRight","paddingLeft","paddingRight"],["opacity"]];c.fn.extend({show:function(a,b,d){if(a||a===0)return this.animate(S("show",3),a,b,d);else{a=
0;for(b=this.length;a<b;a++){if(!c.data(this[a],"olddisplay")&&this[a].style.display==="none")this[a].style.display="";this[a].style.display===""&&c.css(this[a],"display")==="none"&&c.data(this[a],"olddisplay",oa(this[a].nodeName))}for(a=0;a<b;a++)this[a].style.display=c.data(this[a],"olddisplay")||"";return this}},hide:function(a,b,d){if(a||a===0)return this.animate(S("hide",3),a,b,d);else{a=0;for(b=this.length;a<b;a++){d=c.css(this[a],"display");d!=="none"&&c.data(this[a],"olddisplay",d)}for(a=
0;a<b;a++)this[a].style.display="none";return this}},_toggle:c.fn.toggle,toggle:function(a,b,d){var e=typeof a==="boolean";if(c.isFunction(a)&&c.isFunction(b))this._toggle.apply(this,arguments);else a==null||e?this.each(function(){var f=e?a:c(this).is(":hidden");c(this)[f?"show":"hide"]()}):this.animate(S("toggle",3),a,b,d);return this},fadeTo:function(a,b,d,e){return this.filter(":hidden").css("opacity",0).show().end().animate({opacity:b},a,d,e)},animate:function(a,b,d,e){var f=c.speed(b,d,e);if(c.isEmptyObject(a))return this.each(f.complete);
return this[f.queue===false?"each":"queue"](function(){var h=c.extend({},f),k,l=this.nodeType===1,n=l&&c(this).is(":hidden"),s=this;for(k in a){var v=c.camelCase(k);if(k!==v){a[v]=a[k];delete a[k];k=v}if(a[k]==="hide"&&n||a[k]==="show"&&!n)return h.complete.call(this);if(l&&(k==="height"||k==="width")){h.overflow=[this.style.overflow,this.style.overflowX,this.style.overflowY];if(c.css(this,"display")==="inline"&&c.css(this,"float")==="none")if(c.support.inlineBlockNeedsLayout)if(oa(this.nodeName)===
"inline")this.style.display="inline-block";else{this.style.display="inline";this.style.zoom=1}else this.style.display="inline-block"}if(c.isArray(a[k])){(h.specialEasing=h.specialEasing||{})[k]=a[k][1];a[k]=a[k][0]}}if(h.overflow!=null)this.style.overflow="hidden";h.curAnim=c.extend({},a);c.each(a,function(B,D){var H=new c.fx(s,h,B);if(tb.test(D))H[D==="toggle"?n?"show":"hide":D](a);else{var w=ub.exec(D),G=H.cur(true)||0;if(w){var M=parseFloat(w[2]),g=w[3]||"px";if(g!=="px"){c.style(s,B,(M||1)+g);
G=(M||1)/H.cur(true)*G;c.style(s,B,G+g)}if(w[1])M=(w[1]==="-="?-1:1)*M+G;H.custom(G,M,g)}else H.custom(G,D,"")}});return true})},stop:function(a,b){var d=c.timers;a&&this.queue([]);this.each(function(){for(var e=d.length-1;e>=0;e--)if(d[e].elem===this){b&&d[e](true);d.splice(e,1)}});b||this.dequeue();return this}});c.each({slideDown:S("show",1),slideUp:S("hide",1),slideToggle:S("toggle",1),fadeIn:{opacity:"show"},fadeOut:{opacity:"hide"}},function(a,b){c.fn[a]=function(d,e,f){return this.animate(b,
d,e,f)}});c.extend({speed:function(a,b,d){var e=a&&typeof a==="object"?c.extend({},a):{complete:d||!d&&b||c.isFunction(a)&&a,duration:a,easing:d&&b||b&&!c.isFunction(b)&&b};e.duration=c.fx.off?0:typeof e.duration==="number"?e.duration:e.duration in c.fx.speeds?c.fx.speeds[e.duration]:c.fx.speeds._default;e.old=e.complete;e.complete=function(){e.queue!==false&&c(this).dequeue();c.isFunction(e.old)&&e.old.call(this)};return e},easing:{linear:function(a,b,d,e){return d+e*a},swing:function(a,b,d,e){return(-Math.cos(a*
Math.PI)/2+0.5)*e+d}},timers:[],fx:function(a,b,d){this.options=b;this.elem=a;this.prop=d;if(!b.orig)b.orig={}}});c.fx.prototype={update:function(){this.options.step&&this.options.step.call(this.elem,this.now,this);(c.fx.step[this.prop]||c.fx.step._default)(this)},cur:function(){if(this.elem[this.prop]!=null&&(!this.elem.style||this.elem.style[this.prop]==null))return this.elem[this.prop];var a=parseFloat(c.css(this.elem,this.prop));return a&&a>-1E4?a:0},custom:function(a,b,d){function e(h){return f.step(h)}
this.startTime=c.now();this.start=a;this.end=b;this.unit=d||this.unit||"px";this.now=this.start;this.pos=this.state=0;var f=this;a=c.fx;e.elem=this.elem;if(e()&&c.timers.push(e)&&!aa)aa=setInterval(a.tick,a.interval)},show:function(){this.options.orig[this.prop]=c.style(this.elem,this.prop);this.options.show=true;this.custom(this.prop==="width"||this.prop==="height"?1:0,this.cur());c(this.elem).show()},hide:function(){this.options.orig[this.prop]=c.style(this.elem,this.prop);this.options.hide=true;
this.custom(this.cur(),0)},step:function(a){var b=c.now(),d=true;if(a||b>=this.options.duration+this.startTime){this.now=this.end;this.pos=this.state=1;this.update();this.options.curAnim[this.prop]=true;for(var e in this.options.curAnim)if(this.options.curAnim[e]!==true)d=false;if(d){if(this.options.overflow!=null&&!c.support.shrinkWrapBlocks){var f=this.elem,h=this.options;c.each(["","X","Y"],function(l,n){f.style["overflow"+n]=h.overflow[l]})}this.options.hide&&c(this.elem).hide();if(this.options.hide||
this.options.show)for(var k in this.options.curAnim)c.style(this.elem,k,this.options.orig[k]);this.options.complete.call(this.elem)}return false}else{a=b-this.startTime;this.state=a/this.options.duration;b=this.options.easing||(c.easing.swing?"swing":"linear");this.pos=c.easing[this.options.specialEasing&&this.options.specialEasing[this.prop]||b](this.state,a,0,1,this.options.duration);this.now=this.start+(this.end-this.start)*this.pos;this.update()}return true}};c.extend(c.fx,{tick:function(){for(var a=
c.timers,b=0;b<a.length;b++)a[b]()||a.splice(b--,1);a.length||c.fx.stop()},interval:13,stop:function(){clearInterval(aa);aa=null},speeds:{slow:600,fast:200,_default:400},step:{opacity:function(a){c.style(a.elem,"opacity",a.now)},_default:function(a){if(a.elem.style&&a.elem.style[a.prop]!=null)a.elem.style[a.prop]=(a.prop==="width"||a.prop==="height"?Math.max(0,a.now):a.now)+a.unit;else a.elem[a.prop]=a.now}}});if(c.expr&&c.expr.filters)c.expr.filters.animated=function(a){return c.grep(c.timers,function(b){return a===
b.elem}).length};var vb=/^t(?:able|d|h)$/i,Fa=/^(?:body|html)$/i;c.fn.offset="getBoundingClientRect"in u.documentElement?function(a){var b=this[0],d;if(a)return this.each(function(k){c.offset.setOffset(this,a,k)});if(!b||!b.ownerDocument)return null;if(b===b.ownerDocument.body)return c.offset.bodyOffset(b);try{d=b.getBoundingClientRect()}catch(e){}var f=b.ownerDocument,h=f.documentElement;if(!d||!c.contains(h,b))return d||{top:0,left:0};b=f.body;f=ea(f);return{top:d.top+(f.pageYOffset||c.support.boxModel&&
h.scrollTop||b.scrollTop)-(h.clientTop||b.clientTop||0),left:d.left+(f.pageXOffset||c.support.boxModel&&h.scrollLeft||b.scrollLeft)-(h.clientLeft||b.clientLeft||0)}}:function(a){var b=this[0];if(a)return this.each(function(s){c.offset.setOffset(this,a,s)});if(!b||!b.ownerDocument)return null;if(b===b.ownerDocument.body)return c.offset.bodyOffset(b);c.offset.initialize();var d=b.offsetParent,e=b.ownerDocument,f,h=e.documentElement,k=e.body;f=(e=e.defaultView)?e.getComputedStyle(b,null):b.currentStyle;
for(var l=b.offsetTop,n=b.offsetLeft;(b=b.parentNode)&&b!==k&&b!==h;){if(c.offset.supportsFixedPosition&&f.position==="fixed")break;f=e?e.getComputedStyle(b,null):b.currentStyle;l-=b.scrollTop;n-=b.scrollLeft;if(b===d){l+=b.offsetTop;n+=b.offsetLeft;if(c.offset.doesNotAddBorder&&!(c.offset.doesAddBorderForTableAndCells&&vb.test(b.nodeName))){l+=parseFloat(f.borderTopWidth)||0;n+=parseFloat(f.borderLeftWidth)||0}d=b.offsetParent}if(c.offset.subtractsBorderForOverflowNotVisible&&f.overflow!=="visible"){l+=
parseFloat(f.borderTopWidth)||0;n+=parseFloat(f.borderLeftWidth)||0}f=f}if(f.position==="relative"||f.position==="static"){l+=k.offsetTop;n+=k.offsetLeft}if(c.offset.supportsFixedPosition&&f.position==="fixed"){l+=Math.max(h.scrollTop,k.scrollTop);n+=Math.max(h.scrollLeft,k.scrollLeft)}return{top:l,left:n}};c.offset={initialize:function(){var a=u.body,b=u.createElement("div"),d,e,f,h=parseFloat(c.css(a,"marginTop"))||0;c.extend(b.style,{position:"absolute",top:0,left:0,margin:0,border:0,width:"1px",
height:"1px",visibility:"hidden"});b.innerHTML="<div style='position:absolute;top:0;left:0;margin:0;border:5px solid #000;padding:0;width:1px;height:1px;'><div></div></div><table style='position:absolute;top:0;left:0;margin:0;border:5px solid #000;padding:0;width:1px;height:1px;' cellpadding='0' cellspacing='0'><tr><td></td></tr></table>";a.insertBefore(b,a.firstChild);d=b.firstChild;e=d.firstChild;f=d.nextSibling.firstChild.firstChild;this.doesNotAddBorder=e.offsetTop!==5;this.doesAddBorderForTableAndCells=
f.offsetTop===5;e.style.position="fixed";e.style.top="20px";this.supportsFixedPosition=e.offsetTop===20||e.offsetTop===15;e.style.position=e.style.top="";d.style.overflow="hidden";d.style.position="relative";this.subtractsBorderForOverflowNotVisible=e.offsetTop===-5;this.doesNotIncludeMarginInBodyOffset=a.offsetTop!==h;a.removeChild(b);c.offset.initialize=c.noop},bodyOffset:function(a){var b=a.offsetTop,d=a.offsetLeft;c.offset.initialize();if(c.offset.doesNotIncludeMarginInBodyOffset){b+=parseFloat(c.css(a,
"marginTop"))||0;d+=parseFloat(c.css(a,"marginLeft"))||0}return{top:b,left:d}},setOffset:function(a,b,d){var e=c.css(a,"position");if(e==="static")a.style.position="relative";var f=c(a),h=f.offset(),k=c.css(a,"top"),l=c.css(a,"left"),n=e==="absolute"&&c.inArray("auto",[k,l])>-1;e={};var s={};if(n)s=f.position();k=n?s.top:parseInt(k,10)||0;l=n?s.left:parseInt(l,10)||0;if(c.isFunction(b))b=b.call(a,d,h);if(b.top!=null)e.top=b.top-h.top+k;if(b.left!=null)e.left=b.left-h.left+l;"using"in b?b.using.call(a,
e):f.css(e)}};c.fn.extend({position:function(){if(!this[0])return null;var a=this[0],b=this.offsetParent(),d=this.offset(),e=Fa.test(b[0].nodeName)?{top:0,left:0}:b.offset();d.top-=parseFloat(c.css(a,"marginTop"))||0;d.left-=parseFloat(c.css(a,"marginLeft"))||0;e.top+=parseFloat(c.css(b[0],"borderTopWidth"))||0;e.left+=parseFloat(c.css(b[0],"borderLeftWidth"))||0;return{top:d.top-e.top,left:d.left-e.left}},offsetParent:function(){return this.map(function(){for(var a=this.offsetParent||u.body;a&&!Fa.test(a.nodeName)&&
c.css(a,"position")==="static";)a=a.offsetParent;return a})}});c.each(["Left","Top"],function(a,b){var d="scroll"+b;c.fn[d]=function(e){var f=this[0],h;if(!f)return null;if(e!==A)return this.each(function(){if(h=ea(this))h.scrollTo(!a?e:c(h).scrollLeft(),a?e:c(h).scrollTop());else this[d]=e});else return(h=ea(f))?"pageXOffset"in h?h[a?"pageYOffset":"pageXOffset"]:c.support.boxModel&&h.document.documentElement[d]||h.document.body[d]:f[d]}});c.each(["Height","Width"],function(a,b){var d=b.toLowerCase();
c.fn["inner"+b]=function(){return this[0]?parseFloat(c.css(this[0],d,"padding")):null};c.fn["outer"+b]=function(e){return this[0]?parseFloat(c.css(this[0],d,e?"margin":"border")):null};c.fn[d]=function(e){var f=this[0];if(!f)return e==null?null:this;if(c.isFunction(e))return this.each(function(h){var k=c(this);k[d](e.call(this,h,k[d]()))});return c.isWindow(f)?f.document.compatMode==="CSS1Compat"&&f.document.documentElement["client"+b]||f.document.body["client"+b]:f.nodeType===9?Math.max(f.documentElement["client"+
b],f.body["scroll"+b],f.documentElement["scroll"+b],f.body["offset"+b],f.documentElement["offset"+b]):e===A?parseFloat(c.css(f,d)):this.css(d,typeof e==="string"?e:e+"px")}})})(window);

/*!
 * jQuery UI 1.8.2
 *
 * Copyright (c) 2010 AUTHORS.txt (http://jqueryui.com/about)
 * Dual licensed under the MIT (MIT-LICENSE.txt)
 * and GPL (GPL-LICENSE.txt) licenses.
 *
 * http://docs.jquery.com/UI
 */
(function(c){c.ui=c.ui||{};if(!c.ui.version){c.extend(c.ui,{version:"1.8.2",plugin:{add:function(a,b,d){a=c.ui[a].prototype;for(var e in d){a.plugins[e]=a.plugins[e]||[];a.plugins[e].push([b,d[e]])}},call:function(a,b,d){if((b=a.plugins[b])&&a.element[0].parentNode)for(var e=0;e<b.length;e++)a.options[b[e][0]]&&b[e][1].apply(a.element,d)}},contains:function(a,b){return document.compareDocumentPosition?a.compareDocumentPosition(b)&16:a!==b&&a.contains(b)},hasScroll:function(a,b){if(c(a).css("overflow")==
"hidden")return false;b=b&&b=="left"?"scrollLeft":"scrollTop";var d=false;if(a[b]>0)return true;a[b]=1;d=a[b]>0;a[b]=0;return d},isOverAxis:function(a,b,d){return a>b&&a<b+d},isOver:function(a,b,d,e,f,g){return c.ui.isOverAxis(a,d,f)&&c.ui.isOverAxis(b,e,g)},keyCode:{ALT:18,BACKSPACE:8,CAPS_LOCK:20,COMMA:188,COMMAND:91,COMMAND_LEFT:91,COMMAND_RIGHT:93,CONTROL:17,DELETE:46,DOWN:40,END:35,ENTER:13,ESCAPE:27,HOME:36,INSERT:45,LEFT:37,MENU:93,NUMPAD_ADD:107,NUMPAD_DECIMAL:110,NUMPAD_DIVIDE:111,NUMPAD_ENTER:108,
NUMPAD_MULTIPLY:106,NUMPAD_SUBTRACT:109,PAGE_DOWN:34,PAGE_UP:33,PERIOD:190,RIGHT:39,SHIFT:16,SPACE:32,TAB:9,UP:38,WINDOWS:91}});c.fn.extend({_focus:c.fn.focus,focus:function(a,b){return typeof a==="number"?this.each(function(){var d=this;setTimeout(function(){c(d).focus();b&&b.call(d)},a)}):this._focus.apply(this,arguments)},enableSelection:function(){return this.attr("unselectable","off").css("MozUserSelect","")},disableSelection:function(){return this.attr("unselectable","on").css("MozUserSelect",
"none")},scrollParent:function(){var a;a=c.browser.msie&&/(static|relative)/.test(this.css("position"))||/absolute/.test(this.css("position"))?this.parents().filter(function(){return/(relative|absolute|fixed)/.test(c.curCSS(this,"position",1))&&/(auto|scroll)/.test(c.curCSS(this,"overflow",1)+c.curCSS(this,"overflow-y",1)+c.curCSS(this,"overflow-x",1))}).eq(0):this.parents().filter(function(){return/(auto|scroll)/.test(c.curCSS(this,"overflow",1)+c.curCSS(this,"overflow-y",1)+c.curCSS(this,"overflow-x",
1))}).eq(0);return/fixed/.test(this.css("position"))||!a.length?c(document):a},zIndex:function(a){if(a!==undefined)return this.css("zIndex",a);if(this.length){a=c(this[0]);for(var b;a.length&&a[0]!==document;){b=a.css("position");if(b=="absolute"||b=="relative"||b=="fixed"){b=parseInt(a.css("zIndex"));if(!isNaN(b)&&b!=0)return b}a=a.parent()}}return 0}});c.extend(c.expr[":"],{data:function(a,b,d){return!!c.data(a,d[3])},focusable:function(a){var b=a.nodeName.toLowerCase(),d=c.attr(a,"tabindex");return(/input|select|textarea|button|object/.test(b)?
!a.disabled:"a"==b||"area"==b?a.href||!isNaN(d):!isNaN(d))&&!c(a)["area"==b?"parents":"closest"](":hidden").length},tabbable:function(a){var b=c.attr(a,"tabindex");return(isNaN(b)||b>=0)&&c(a).is(":focusable")}})}})(jQuery);
/*!
 * jQuery UI Widget 1.8.2
 *
 * Copyright (c) 2010 AUTHORS.txt (http://jqueryui.com/about)
 * Dual licensed under the MIT (MIT-LICENSE.txt)
 * and GPL (GPL-LICENSE.txt) licenses.
 *
 * http://docs.jquery.com/UI/Widget
 */
(function(b){var j=b.fn.remove;b.fn.remove=function(a,c){return this.each(function(){if(!c)if(!a||b.filter(a,[this]).length)b("*",this).add(this).each(function(){b(this).triggerHandler("remove")});return j.call(b(this),a,c)})};b.widget=function(a,c,d){var e=a.split(".")[0],f;a=a.split(".")[1];f=e+"-"+a;if(!d){d=c;c=b.Widget}b.expr[":"][f]=function(h){return!!b.data(h,a)};b[e]=b[e]||{};b[e][a]=function(h,g){arguments.length&&this._createWidget(h,g)};c=new c;c.options=b.extend({},c.options);b[e][a].prototype=
b.extend(true,c,{namespace:e,widgetName:a,widgetEventPrefix:b[e][a].prototype.widgetEventPrefix||a,widgetBaseClass:f},d);b.widget.bridge(a,b[e][a])};b.widget.bridge=function(a,c){b.fn[a]=function(d){var e=typeof d==="string",f=Array.prototype.slice.call(arguments,1),h=this;d=!e&&f.length?b.extend.apply(null,[true,d].concat(f)):d;if(e&&d.substring(0,1)==="_")return h;e?this.each(function(){var g=b.data(this,a),i=g&&b.isFunction(g[d])?g[d].apply(g,f):g;if(i!==g&&i!==undefined){h=i;return false}}):this.each(function(){var g=
b.data(this,a);if(g){d&&g.option(d);g._init()}else b.data(this,a,new c(d,this))});return h}};b.Widget=function(a,c){arguments.length&&this._createWidget(a,c)};b.Widget.prototype={widgetName:"widget",widgetEventPrefix:"",options:{disabled:false},_createWidget:function(a,c){this.element=b(c).data(this.widgetName,this);this.options=b.extend(true,{},this.options,b.metadata&&b.metadata.get(c)[this.widgetName],a);var d=this;this.element.bind("remove."+this.widgetName,function(){d.destroy()});this._create();
this._init()},_create:function(){},_init:function(){},destroy:function(){this.element.unbind("."+this.widgetName).removeData(this.widgetName);this.widget().unbind("."+this.widgetName).removeAttr("aria-disabled").removeClass(this.widgetBaseClass+"-disabled ui-state-disabled")},widget:function(){return this.element},option:function(a,c){var d=a,e=this;if(arguments.length===0)return b.extend({},e.options);if(typeof a==="string"){if(c===undefined)return this.options[a];d={};d[a]=c}b.each(d,function(f,
h){e._setOption(f,h)});return e},_setOption:function(a,c){this.options[a]=c;if(a==="disabled")this.widget()[c?"addClass":"removeClass"](this.widgetBaseClass+"-disabled ui-state-disabled").attr("aria-disabled",c);return this},enable:function(){return this._setOption("disabled",false)},disable:function(){return this._setOption("disabled",true)},_trigger:function(a,c,d){var e=this.options[a];c=b.Event(c);c.type=(a===this.widgetEventPrefix?a:this.widgetEventPrefix+a).toLowerCase();d=d||{};if(c.originalEvent){a=
b.event.props.length;for(var f;a;){f=b.event.props[--a];c[f]=c.originalEvent[f]}}this.element.trigger(c,d);return!(b.isFunction(e)&&e.call(this.element[0],c,d)===false||c.isDefaultPrevented())}}})(jQuery);
/*!
 * jQuery UI Mouse 1.8.2
 *
 * Copyright (c) 2010 AUTHORS.txt (http://jqueryui.com/about)
 * Dual licensed under the MIT (MIT-LICENSE.txt)
 * and GPL (GPL-LICENSE.txt) licenses.
 *
 * http://docs.jquery.com/UI/Mouse
 *
 * Depends:
 *	jquery.ui.widget.js
 */
(function(c){c.widget("ui.mouse",{options:{cancel:":input,option",distance:1,delay:0},_mouseInit:function(){var a=this;this.element.bind("mousedown."+this.widgetName,function(b){return a._mouseDown(b)}).bind("click."+this.widgetName,function(b){if(a._preventClickEvent){a._preventClickEvent=false;b.stopImmediatePropagation();return false}});this.started=false},_mouseDestroy:function(){this.element.unbind("."+this.widgetName)},_mouseDown:function(a){a.originalEvent=a.originalEvent||{};if(!a.originalEvent.mouseHandled){this._mouseStarted&&
this._mouseUp(a);this._mouseDownEvent=a;var b=this,e=a.which==1,f=typeof this.options.cancel=="string"?c(a.target).parents().add(a.target).filter(this.options.cancel).length:false;if(!e||f||!this._mouseCapture(a))return true;this.mouseDelayMet=!this.options.delay;if(!this.mouseDelayMet)this._mouseDelayTimer=setTimeout(function(){b.mouseDelayMet=true},this.options.delay);if(this._mouseDistanceMet(a)&&this._mouseDelayMet(a)){this._mouseStarted=this._mouseStart(a)!==false;if(!this._mouseStarted){a.preventDefault();
return true}}this._mouseMoveDelegate=function(d){return b._mouseMove(d)};this._mouseUpDelegate=function(d){return b._mouseUp(d)};c(document).bind("mousemove."+this.widgetName,this._mouseMoveDelegate).bind("mouseup."+this.widgetName,this._mouseUpDelegate);c.browser.safari||a.preventDefault();return a.originalEvent.mouseHandled=true}},_mouseMove:function(a){if(c.browser.msie&&!a.button)return this._mouseUp(a);if(this._mouseStarted){this._mouseDrag(a);return a.preventDefault()}if(this._mouseDistanceMet(a)&&
this._mouseDelayMet(a))(this._mouseStarted=this._mouseStart(this._mouseDownEvent,a)!==false)?this._mouseDrag(a):this._mouseUp(a);return!this._mouseStarted},_mouseUp:function(a){c(document).unbind("mousemove."+this.widgetName,this._mouseMoveDelegate).unbind("mouseup."+this.widgetName,this._mouseUpDelegate);if(this._mouseStarted){this._mouseStarted=false;this._preventClickEvent=a.target==this._mouseDownEvent.target;this._mouseStop(a)}return false},_mouseDistanceMet:function(a){return Math.max(Math.abs(this._mouseDownEvent.pageX-
a.pageX),Math.abs(this._mouseDownEvent.pageY-a.pageY))>=this.options.distance},_mouseDelayMet:function(){return this.mouseDelayMet},_mouseStart:function(){},_mouseDrag:function(){},_mouseStop:function(){},_mouseCapture:function(){return true}})})(jQuery);
/*
 * jQuery UI Position 1.8.2
 *
 * Copyright (c) 2010 AUTHORS.txt (http://jqueryui.com/about)
 * Dual licensed under the MIT (MIT-LICENSE.txt)
 * and GPL (GPL-LICENSE.txt) licenses.
 *
 * http://docs.jquery.com/UI/Position
 */
(function(c){c.ui=c.ui||{};var m=/left|center|right/,n=/top|center|bottom/,p=c.fn.position,q=c.fn.offset;c.fn.position=function(a){if(!a||!a.of)return p.apply(this,arguments);a=c.extend({},a);var b=c(a.of),d=(a.collision||"flip").split(" "),e=a.offset?a.offset.split(" "):[0,0],g,h,i;if(a.of.nodeType===9){g=b.width();h=b.height();i={top:0,left:0}}else if(a.of.scrollTo&&a.of.document){g=b.width();h=b.height();i={top:b.scrollTop(),left:b.scrollLeft()}}else if(a.of.preventDefault){a.at="left top";g=h=
0;i={top:a.of.pageY,left:a.of.pageX}}else{g=b.outerWidth();h=b.outerHeight();i=b.offset()}c.each(["my","at"],function(){var f=(a[this]||"").split(" ");if(f.length===1)f=m.test(f[0])?f.concat(["center"]):n.test(f[0])?["center"].concat(f):["center","center"];f[0]=m.test(f[0])?f[0]:"center";f[1]=n.test(f[1])?f[1]:"center";a[this]=f});if(d.length===1)d[1]=d[0];e[0]=parseInt(e[0],10)||0;if(e.length===1)e[1]=e[0];e[1]=parseInt(e[1],10)||0;if(a.at[0]==="right")i.left+=g;else if(a.at[0]==="center")i.left+=
g/2;if(a.at[1]==="bottom")i.top+=h;else if(a.at[1]==="center")i.top+=h/2;i.left+=e[0];i.top+=e[1];return this.each(function(){var f=c(this),k=f.outerWidth(),l=f.outerHeight(),j=c.extend({},i);if(a.my[0]==="right")j.left-=k;else if(a.my[0]==="center")j.left-=k/2;if(a.my[1]==="bottom")j.top-=l;else if(a.my[1]==="center")j.top-=l/2;j.left=parseInt(j.left);j.top=parseInt(j.top);c.each(["left","top"],function(o,r){c.ui.position[d[o]]&&c.ui.position[d[o]][r](j,{targetWidth:g,targetHeight:h,elemWidth:k,
elemHeight:l,offset:e,my:a.my,at:a.at})});c.fn.bgiframe&&f.bgiframe();f.offset(c.extend(j,{using:a.using}))})};c.ui.position={fit:{left:function(a,b){var d=c(window);b=a.left+b.elemWidth-d.width()-d.scrollLeft();a.left=b>0?a.left-b:Math.max(0,a.left)},top:function(a,b){var d=c(window);b=a.top+b.elemHeight-d.height()-d.scrollTop();a.top=b>0?a.top-b:Math.max(0,a.top)}},flip:{left:function(a,b){if(b.at[0]!=="center"){var d=c(window);d=a.left+b.elemWidth-d.width()-d.scrollLeft();var e=b.my[0]==="left"?
-b.elemWidth:b.my[0]==="right"?b.elemWidth:0,g=-2*b.offset[0];a.left+=a.left<0?e+b.targetWidth+g:d>0?e-b.targetWidth+g:0}},top:function(a,b){if(b.at[1]!=="center"){var d=c(window);d=a.top+b.elemHeight-d.height()-d.scrollTop();var e=b.my[1]==="top"?-b.elemHeight:b.my[1]==="bottom"?b.elemHeight:0,g=b.at[1]==="top"?b.targetHeight:-b.targetHeight,h=-2*b.offset[1];a.top+=a.top<0?e+b.targetHeight+h:d>0?e+g+h:0}}}};if(!c.offset.setOffset){c.offset.setOffset=function(a,b){if(/static/.test(c.curCSS(a,"position")))a.style.position=
"relative";var d=c(a),e=d.offset(),g=parseInt(c.curCSS(a,"top",true),10)||0,h=parseInt(c.curCSS(a,"left",true),10)||0;e={top:b.top-e.top+g,left:b.left-e.left+h};"using"in b?b.using.call(a,e):d.css(e)};c.fn.offset=function(a){var b=this[0];if(!b||!b.ownerDocument)return null;if(a)return this.each(function(){c.offset.setOffset(this,a)});return q.call(this)}}})(jQuery);
/*
 * jQuery UI Draggable 1.8.2
 *
 * Copyright (c) 2010 AUTHORS.txt (http://jqueryui.com/about)
 * Dual licensed under the MIT (MIT-LICENSE.txt)
 * and GPL (GPL-LICENSE.txt) licenses.
 *
 * http://docs.jquery.com/UI/Draggables
 *
 * Depends:
 *	jquery.ui.core.js
 *	jquery.ui.mouse.js
 *	jquery.ui.widget.js
 */
(function(d){d.widget("ui.draggable",d.ui.mouse,{widgetEventPrefix:"drag",options:{addClasses:true,appendTo:"parent",axis:false,connectToSortable:false,containment:false,cursor:"auto",cursorAt:false,grid:false,handle:false,helper:"original",iframeFix:false,opacity:false,refreshPositions:false,revert:false,revertDuration:500,scope:"default",scroll:true,scrollSensitivity:20,scrollSpeed:20,snap:false,snapMode:"both",snapTolerance:20,stack:false,zIndex:false},_create:function(){if(this.options.helper==
"original"&&!/^(?:r|a|f)/.test(this.element.css("position")))this.element[0].style.position="relative";this.options.addClasses&&this.element.addClass("ui-draggable");this.options.disabled&&this.element.addClass("ui-draggable-disabled");this._mouseInit()},destroy:function(){if(this.element.data("draggable")){this.element.removeData("draggable").unbind(".draggable").removeClass("ui-draggable ui-draggable-dragging ui-draggable-disabled");this._mouseDestroy();return this}},_mouseCapture:function(a){var b=
this.options;if(this.helper||b.disabled||d(a.target).is(".ui-resizable-handle"))return false;this.handle=this._getHandle(a);if(!this.handle)return false;return true},_mouseStart:function(a){var b=this.options;this.helper=this._createHelper(a);this._cacheHelperProportions();if(d.ui.ddmanager)d.ui.ddmanager.current=this;this._cacheMargins();this.cssPosition=this.helper.css("position");this.scrollParent=this.helper.scrollParent();this.offset=this.positionAbs=this.element.offset();this.offset={top:this.offset.top-
this.margins.top,left:this.offset.left-this.margins.left};d.extend(this.offset,{click:{left:a.pageX-this.offset.left,top:a.pageY-this.offset.top},parent:this._getParentOffset(),relative:this._getRelativeOffset()});this.originalPosition=this.position=this._generatePosition(a);this.originalPageX=a.pageX;this.originalPageY=a.pageY;b.cursorAt&&this._adjustOffsetFromHelper(b.cursorAt);b.containment&&this._setContainment();if(this._trigger("start",a)===false){this._clear();return false}this._cacheHelperProportions();
d.ui.ddmanager&&!b.dropBehaviour&&d.ui.ddmanager.prepareOffsets(this,a);this.helper.addClass("ui-draggable-dragging");this._mouseDrag(a,true);return true},_mouseDrag:function(a,b){this.position=this._generatePosition(a);this.positionAbs=this._convertPositionTo("absolute");if(!b){b=this._uiHash();if(this._trigger("drag",a,b)===false){this._mouseUp({});return false}this.position=b.position}if(!this.options.axis||this.options.axis!="y")this.helper[0].style.left=this.position.left+"px";if(!this.options.axis||
this.options.axis!="x")this.helper[0].style.top=this.position.top+"px";d.ui.ddmanager&&d.ui.ddmanager.drag(this,a);return false},_mouseStop:function(a){var b=false;if(d.ui.ddmanager&&!this.options.dropBehaviour)b=d.ui.ddmanager.drop(this,a);if(this.dropped){b=this.dropped;this.dropped=false}if(!this.element[0]||!this.element[0].parentNode)return false;if(this.options.revert=="invalid"&&!b||this.options.revert=="valid"&&b||this.options.revert===true||d.isFunction(this.options.revert)&&this.options.revert.call(this.element,
b)){var c=this;d(this.helper).animate(this.originalPosition,parseInt(this.options.revertDuration,10),function(){c._trigger("stop",a)!==false&&c._clear()})}else this._trigger("stop",a)!==false&&this._clear();return false},cancel:function(){this.helper.is(".ui-draggable-dragging")?this._mouseUp({}):this._clear();return this},_getHandle:function(a){var b=!this.options.handle||!d(this.options.handle,this.element).length?true:false;d(this.options.handle,this.element).find("*").andSelf().each(function(){if(this==
a.target)b=true});return b},_createHelper:function(a){var b=this.options;a=d.isFunction(b.helper)?d(b.helper.apply(this.element[0],[a])):b.helper=="clone"?this.element.clone():this.element;a.parents("body").length||a.appendTo(b.appendTo=="parent"?this.element[0].parentNode:b.appendTo);a[0]!=this.element[0]&&!/(fixed|absolute)/.test(a.css("position"))&&a.css("position","absolute");return a},_adjustOffsetFromHelper:function(a){if(typeof a=="string")a=a.split(" ");if(d.isArray(a))a={left:+a[0],top:+a[1]||
0};if("left"in a)this.offset.click.left=a.left+this.margins.left;if("right"in a)this.offset.click.left=this.helperProportions.width-a.right+this.margins.left;if("top"in a)this.offset.click.top=a.top+this.margins.top;if("bottom"in a)this.offset.click.top=this.helperProportions.height-a.bottom+this.margins.top},_getParentOffset:function(){this.offsetParent=this.helper.offsetParent();var a=this.offsetParent.offset();if(this.cssPosition=="absolute"&&this.scrollParent[0]!=document&&d.ui.contains(this.scrollParent[0],
this.offsetParent[0])){a.left+=this.scrollParent.scrollLeft();a.top+=this.scrollParent.scrollTop()}if(this.offsetParent[0]==document.body||this.offsetParent[0].tagName&&this.offsetParent[0].tagName.toLowerCase()=="html"&&d.browser.msie)a={top:0,left:0};return{top:a.top+(parseInt(this.offsetParent.css("borderTopWidth"),10)||0),left:a.left+(parseInt(this.offsetParent.css("borderLeftWidth"),10)||0)}},_getRelativeOffset:function(){if(this.cssPosition=="relative"){var a=this.element.position();return{top:a.top-
(parseInt(this.helper.css("top"),10)||0)+this.scrollParent.scrollTop(),left:a.left-(parseInt(this.helper.css("left"),10)||0)+this.scrollParent.scrollLeft()}}else return{top:0,left:0}},_cacheMargins:function(){this.margins={left:parseInt(this.element.css("marginLeft"),10)||0,top:parseInt(this.element.css("marginTop"),10)||0}},_cacheHelperProportions:function(){this.helperProportions={width:this.helper.outerWidth(),height:this.helper.outerHeight()}},_setContainment:function(){var a=this.options;if(a.containment==
"parent")a.containment=this.helper[0].parentNode;if(a.containment=="document"||a.containment=="window")this.containment=[0-this.offset.relative.left-this.offset.parent.left,0-this.offset.relative.top-this.offset.parent.top,d(a.containment=="document"?document:window).width()-this.helperProportions.width-this.margins.left,(d(a.containment=="document"?document:window).height()||document.body.parentNode.scrollHeight)-this.helperProportions.height-this.margins.top];if(!/^(document|window|parent)$/.test(a.containment)&&
a.containment.constructor!=Array){var b=d(a.containment)[0];if(b){a=d(a.containment).offset();var c=d(b).css("overflow")!="hidden";this.containment=[a.left+(parseInt(d(b).css("borderLeftWidth"),10)||0)+(parseInt(d(b).css("paddingLeft"),10)||0)-this.margins.left,a.top+(parseInt(d(b).css("borderTopWidth"),10)||0)+(parseInt(d(b).css("paddingTop"),10)||0)-this.margins.top,a.left+(c?Math.max(b.scrollWidth,b.offsetWidth):b.offsetWidth)-(parseInt(d(b).css("borderLeftWidth"),10)||0)-(parseInt(d(b).css("paddingRight"),
10)||0)-this.helperProportions.width-this.margins.left,a.top+(c?Math.max(b.scrollHeight,b.offsetHeight):b.offsetHeight)-(parseInt(d(b).css("borderTopWidth"),10)||0)-(parseInt(d(b).css("paddingBottom"),10)||0)-this.helperProportions.height-this.margins.top]}}else if(a.containment.constructor==Array)this.containment=a.containment},_convertPositionTo:function(a,b){if(!b)b=this.position;a=a=="absolute"?1:-1;var c=this.cssPosition=="absolute"&&!(this.scrollParent[0]!=document&&d.ui.contains(this.scrollParent[0],
this.offsetParent[0]))?this.offsetParent:this.scrollParent,f=/(html|body)/i.test(c[0].tagName);return{top:b.top+this.offset.relative.top*a+this.offset.parent.top*a-(d.browser.safari&&d.browser.version<526&&this.cssPosition=="fixed"?0:(this.cssPosition=="fixed"?-this.scrollParent.scrollTop():f?0:c.scrollTop())*a),left:b.left+this.offset.relative.left*a+this.offset.parent.left*a-(d.browser.safari&&d.browser.version<526&&this.cssPosition=="fixed"?0:(this.cssPosition=="fixed"?-this.scrollParent.scrollLeft():
f?0:c.scrollLeft())*a)}},_generatePosition:function(a){var b=this.options,c=this.cssPosition=="absolute"&&!(this.scrollParent[0]!=document&&d.ui.contains(this.scrollParent[0],this.offsetParent[0]))?this.offsetParent:this.scrollParent,f=/(html|body)/i.test(c[0].tagName),e=a.pageX,g=a.pageY;if(this.originalPosition){if(this.containment){if(a.pageX-this.offset.click.left<this.containment[0])e=this.containment[0]+this.offset.click.left;if(a.pageY-this.offset.click.top<this.containment[1])g=this.containment[1]+
this.offset.click.top;if(a.pageX-this.offset.click.left>this.containment[2])e=this.containment[2]+this.offset.click.left;if(a.pageY-this.offset.click.top>this.containment[3])g=this.containment[3]+this.offset.click.top}if(b.grid){g=this.originalPageY+Math.round((g-this.originalPageY)/b.grid[1])*b.grid[1];g=this.containment?!(g-this.offset.click.top<this.containment[1]||g-this.offset.click.top>this.containment[3])?g:!(g-this.offset.click.top<this.containment[1])?g-b.grid[1]:g+b.grid[1]:g;e=this.originalPageX+
Math.round((e-this.originalPageX)/b.grid[0])*b.grid[0];e=this.containment?!(e-this.offset.click.left<this.containment[0]||e-this.offset.click.left>this.containment[2])?e:!(e-this.offset.click.left<this.containment[0])?e-b.grid[0]:e+b.grid[0]:e}}return{top:g-this.offset.click.top-this.offset.relative.top-this.offset.parent.top+(d.browser.safari&&d.browser.version<526&&this.cssPosition=="fixed"?0:this.cssPosition=="fixed"?-this.scrollParent.scrollTop():f?0:c.scrollTop()),left:e-this.offset.click.left-
this.offset.relative.left-this.offset.parent.left+(d.browser.safari&&d.browser.version<526&&this.cssPosition=="fixed"?0:this.cssPosition=="fixed"?-this.scrollParent.scrollLeft():f?0:c.scrollLeft())}},_clear:function(){this.helper.removeClass("ui-draggable-dragging");this.helper[0]!=this.element[0]&&!this.cancelHelperRemoval&&this.helper.remove();this.helper=null;this.cancelHelperRemoval=false},_trigger:function(a,b,c){c=c||this._uiHash();d.ui.plugin.call(this,a,[b,c]);if(a=="drag")this.positionAbs=
this._convertPositionTo("absolute");return d.Widget.prototype._trigger.call(this,a,b,c)},plugins:{},_uiHash:function(){return{helper:this.helper,position:this.position,originalPosition:this.originalPosition,offset:this.positionAbs}}});d.extend(d.ui.draggable,{version:"1.8.2"});d.ui.plugin.add("draggable","connectToSortable",{start:function(a,b){var c=d(this).data("draggable"),f=c.options,e=d.extend({},b,{item:c.element});c.sortables=[];d(f.connectToSortable).each(function(){var g=d.data(this,"sortable");
if(g&&!g.options.disabled){c.sortables.push({instance:g,shouldRevert:g.options.revert});g._refreshItems();g._trigger("activate",a,e)}})},stop:function(a,b){var c=d(this).data("draggable"),f=d.extend({},b,{item:c.element});d.each(c.sortables,function(){if(this.instance.isOver){this.instance.isOver=0;c.cancelHelperRemoval=true;this.instance.cancelHelperRemoval=false;if(this.shouldRevert)this.instance.options.revert=true;this.instance._mouseStop(a);this.instance.options.helper=this.instance.options._helper;
c.options.helper=="original"&&this.instance.currentItem.css({top:"auto",left:"auto"})}else{this.instance.cancelHelperRemoval=false;this.instance._trigger("deactivate",a,f)}})},drag:function(a,b){var c=d(this).data("draggable"),f=this;d.each(c.sortables,function(){this.instance.positionAbs=c.positionAbs;this.instance.helperProportions=c.helperProportions;this.instance.offset.click=c.offset.click;if(this.instance._intersectsWith(this.instance.containerCache)){if(!this.instance.isOver){this.instance.isOver=
1;this.instance.currentItem=d(f).clone().appendTo(this.instance.element).data("sortable-item",true);this.instance.options._helper=this.instance.options.helper;this.instance.options.helper=function(){return b.helper[0]};a.target=this.instance.currentItem[0];this.instance._mouseCapture(a,true);this.instance._mouseStart(a,true,true);this.instance.offset.click.top=c.offset.click.top;this.instance.offset.click.left=c.offset.click.left;this.instance.offset.parent.left-=c.offset.parent.left-this.instance.offset.parent.left;
this.instance.offset.parent.top-=c.offset.parent.top-this.instance.offset.parent.top;c._trigger("toSortable",a);c.dropped=this.instance.element;c.currentItem=c.element;this.instance.fromOutside=c}this.instance.currentItem&&this.instance._mouseDrag(a)}else if(this.instance.isOver){this.instance.isOver=0;this.instance.cancelHelperRemoval=true;this.instance.options.revert=false;this.instance._trigger("out",a,this.instance._uiHash(this.instance));this.instance._mouseStop(a,true);this.instance.options.helper=
this.instance.options._helper;this.instance.currentItem.remove();this.instance.placeholder&&this.instance.placeholder.remove();c._trigger("fromSortable",a);c.dropped=false}})}});d.ui.plugin.add("draggable","cursor",{start:function(){var a=d("body"),b=d(this).data("draggable").options;if(a.css("cursor"))b._cursor=a.css("cursor");a.css("cursor",b.cursor)},stop:function(){var a=d(this).data("draggable").options;a._cursor&&d("body").css("cursor",a._cursor)}});d.ui.plugin.add("draggable","iframeFix",{start:function(){var a=
d(this).data("draggable").options;d(a.iframeFix===true?"iframe":a.iframeFix).each(function(){d('<div class="ui-draggable-iframeFix" style="background: #fff;"></div>').css({width:this.offsetWidth+"px",height:this.offsetHeight+"px",position:"absolute",opacity:"0.001",zIndex:1E3}).css(d(this).offset()).appendTo("body")})},stop:function(){d("div.ui-draggable-iframeFix").each(function(){this.parentNode.removeChild(this)})}});d.ui.plugin.add("draggable","opacity",{start:function(a,b){a=d(b.helper);b=d(this).data("draggable").options;
if(a.css("opacity"))b._opacity=a.css("opacity");a.css("opacity",b.opacity)},stop:function(a,b){a=d(this).data("draggable").options;a._opacity&&d(b.helper).css("opacity",a._opacity)}});d.ui.plugin.add("draggable","scroll",{start:function(){var a=d(this).data("draggable");if(a.scrollParent[0]!=document&&a.scrollParent[0].tagName!="HTML")a.overflowOffset=a.scrollParent.offset()},drag:function(a){var b=d(this).data("draggable"),c=b.options,f=false;if(b.scrollParent[0]!=document&&b.scrollParent[0].tagName!=
"HTML"){if(!c.axis||c.axis!="x")if(b.overflowOffset.top+b.scrollParent[0].offsetHeight-a.pageY<c.scrollSensitivity)b.scrollParent[0].scrollTop=f=b.scrollParent[0].scrollTop+c.scrollSpeed;else if(a.pageY-b.overflowOffset.top<c.scrollSensitivity)b.scrollParent[0].scrollTop=f=b.scrollParent[0].scrollTop-c.scrollSpeed;if(!c.axis||c.axis!="y")if(b.overflowOffset.left+b.scrollParent[0].offsetWidth-a.pageX<c.scrollSensitivity)b.scrollParent[0].scrollLeft=f=b.scrollParent[0].scrollLeft+c.scrollSpeed;else if(a.pageX-
b.overflowOffset.left<c.scrollSensitivity)b.scrollParent[0].scrollLeft=f=b.scrollParent[0].scrollLeft-c.scrollSpeed}else{if(!c.axis||c.axis!="x")if(a.pageY-d(document).scrollTop()<c.scrollSensitivity)f=d(document).scrollTop(d(document).scrollTop()-c.scrollSpeed);else if(d(window).height()-(a.pageY-d(document).scrollTop())<c.scrollSensitivity)f=d(document).scrollTop(d(document).scrollTop()+c.scrollSpeed);if(!c.axis||c.axis!="y")if(a.pageX-d(document).scrollLeft()<c.scrollSensitivity)f=d(document).scrollLeft(d(document).scrollLeft()-
c.scrollSpeed);else if(d(window).width()-(a.pageX-d(document).scrollLeft())<c.scrollSensitivity)f=d(document).scrollLeft(d(document).scrollLeft()+c.scrollSpeed)}f!==false&&d.ui.ddmanager&&!c.dropBehaviour&&d.ui.ddmanager.prepareOffsets(b,a)}});d.ui.plugin.add("draggable","snap",{start:function(){var a=d(this).data("draggable"),b=a.options;a.snapElements=[];d(b.snap.constructor!=String?b.snap.items||":data(draggable)":b.snap).each(function(){var c=d(this),f=c.offset();this!=a.element[0]&&a.snapElements.push({item:this,
width:c.outerWidth(),height:c.outerHeight(),top:f.top,left:f.left})})},drag:function(a,b){for(var c=d(this).data("draggable"),f=c.options,e=f.snapTolerance,g=b.offset.left,n=g+c.helperProportions.width,m=b.offset.top,o=m+c.helperProportions.height,h=c.snapElements.length-1;h>=0;h--){var i=c.snapElements[h].left,k=i+c.snapElements[h].width,j=c.snapElements[h].top,l=j+c.snapElements[h].height;if(i-e<g&&g<k+e&&j-e<m&&m<l+e||i-e<g&&g<k+e&&j-e<o&&o<l+e||i-e<n&&n<k+e&&j-e<m&&m<l+e||i-e<n&&n<k+e&&j-e<o&&
o<l+e){if(f.snapMode!="inner"){var p=Math.abs(j-o)<=e,q=Math.abs(l-m)<=e,r=Math.abs(i-n)<=e,s=Math.abs(k-g)<=e;if(p)b.position.top=c._convertPositionTo("relative",{top:j-c.helperProportions.height,left:0}).top-c.margins.top;if(q)b.position.top=c._convertPositionTo("relative",{top:l,left:0}).top-c.margins.top;if(r)b.position.left=c._convertPositionTo("relative",{top:0,left:i-c.helperProportions.width}).left-c.margins.left;if(s)b.position.left=c._convertPositionTo("relative",{top:0,left:k}).left-c.margins.left}var t=
p||q||r||s;if(f.snapMode!="outer"){p=Math.abs(j-m)<=e;q=Math.abs(l-o)<=e;r=Math.abs(i-g)<=e;s=Math.abs(k-n)<=e;if(p)b.position.top=c._convertPositionTo("relative",{top:j,left:0}).top-c.margins.top;if(q)b.position.top=c._convertPositionTo("relative",{top:l-c.helperProportions.height,left:0}).top-c.margins.top;if(r)b.position.left=c._convertPositionTo("relative",{top:0,left:i}).left-c.margins.left;if(s)b.position.left=c._convertPositionTo("relative",{top:0,left:k-c.helperProportions.width}).left-c.margins.left}if(!c.snapElements[h].snapping&&
(p||q||r||s||t))c.options.snap.snap&&c.options.snap.snap.call(c.element,a,d.extend(c._uiHash(),{snapItem:c.snapElements[h].item}));c.snapElements[h].snapping=p||q||r||s||t}else{c.snapElements[h].snapping&&c.options.snap.release&&c.options.snap.release.call(c.element,a,d.extend(c._uiHash(),{snapItem:c.snapElements[h].item}));c.snapElements[h].snapping=false}}}});d.ui.plugin.add("draggable","stack",{start:function(){var a=d(this).data("draggable").options;a=d.makeArray(d(a.stack)).sort(function(c,f){return(parseInt(d(c).css("zIndex"),
10)||0)-(parseInt(d(f).css("zIndex"),10)||0)});if(a.length){var b=parseInt(a[0].style.zIndex)||0;d(a).each(function(c){this.style.zIndex=b+c});this[0].style.zIndex=b+a.length}}});d.ui.plugin.add("draggable","zIndex",{start:function(a,b){a=d(b.helper);b=d(this).data("draggable").options;if(a.css("zIndex"))b._zIndex=a.css("zIndex");a.css("zIndex",b.zIndex)},stop:function(a,b){a=d(this).data("draggable").options;a._zIndex&&d(b.helper).css("zIndex",a._zIndex)}})})(jQuery);
/*
 * jQuery UI Droppable 1.8.2
 *
 * Copyright (c) 2010 AUTHORS.txt (http://jqueryui.com/about)
 * Dual licensed under the MIT (MIT-LICENSE.txt)
 * and GPL (GPL-LICENSE.txt) licenses.
 *
 * http://docs.jquery.com/UI/Droppables
 *
 * Depends:
 *	jquery.ui.core.js
 *	jquery.ui.widget.js
 *	jquery.ui.mouse.js
 *	jquery.ui.draggable.js
 */
(function(d){d.widget("ui.droppable",{widgetEventPrefix:"drop",options:{accept:"*",activeClass:false,addClasses:true,greedy:false,hoverClass:false,scope:"default",tolerance:"intersect"},_create:function(){var a=this.options,b=a.accept;this.isover=0;this.isout=1;this.accept=d.isFunction(b)?b:function(c){return c.is(b)};this.proportions={width:this.element[0].offsetWidth,height:this.element[0].offsetHeight};d.ui.ddmanager.droppables[a.scope]=d.ui.ddmanager.droppables[a.scope]||[];d.ui.ddmanager.droppables[a.scope].push(this);
a.addClasses&&this.element.addClass("ui-droppable")},destroy:function(){for(var a=d.ui.ddmanager.droppables[this.options.scope],b=0;b<a.length;b++)a[b]==this&&a.splice(b,1);this.element.removeClass("ui-droppable ui-droppable-disabled").removeData("droppable").unbind(".droppable");return this},_setOption:function(a,b){if(a=="accept")this.accept=d.isFunction(b)?b:function(c){return c.is(b)};d.Widget.prototype._setOption.apply(this,arguments)},_activate:function(a){var b=d.ui.ddmanager.current;this.options.activeClass&&
this.element.addClass(this.options.activeClass);b&&this._trigger("activate",a,this.ui(b))},_deactivate:function(a){var b=d.ui.ddmanager.current;this.options.activeClass&&this.element.removeClass(this.options.activeClass);b&&this._trigger("deactivate",a,this.ui(b))},_over:function(a){var b=d.ui.ddmanager.current;if(!(!b||(b.currentItem||b.element)[0]==this.element[0]))if(this.accept.call(this.element[0],b.currentItem||b.element)){this.options.hoverClass&&this.element.addClass(this.options.hoverClass);
this._trigger("over",a,this.ui(b))}},_out:function(a){var b=d.ui.ddmanager.current;if(!(!b||(b.currentItem||b.element)[0]==this.element[0]))if(this.accept.call(this.element[0],b.currentItem||b.element)){this.options.hoverClass&&this.element.removeClass(this.options.hoverClass);this._trigger("out",a,this.ui(b))}},_drop:function(a,b){var c=b||d.ui.ddmanager.current;if(!c||(c.currentItem||c.element)[0]==this.element[0])return false;var e=false;this.element.find(":data(droppable)").not(".ui-draggable-dragging").each(function(){var g=
d.data(this,"droppable");if(g.options.greedy&&!g.options.disabled&&g.options.scope==c.options.scope&&g.accept.call(g.element[0],c.currentItem||c.element)&&d.ui.intersect(c,d.extend(g,{offset:g.element.offset()}),g.options.tolerance)){e=true;return false}});if(e)return false;if(this.accept.call(this.element[0],c.currentItem||c.element)){this.options.activeClass&&this.element.removeClass(this.options.activeClass);this.options.hoverClass&&this.element.removeClass(this.options.hoverClass);this._trigger("drop",
a,this.ui(c));return this.element}return false},ui:function(a){return{draggable:a.currentItem||a.element,helper:a.helper,position:a.position,offset:a.positionAbs}}});d.extend(d.ui.droppable,{version:"1.8.2"});d.ui.intersect=function(a,b,c){if(!b.offset)return false;var e=(a.positionAbs||a.position.absolute).left,g=e+a.helperProportions.width,f=(a.positionAbs||a.position.absolute).top,h=f+a.helperProportions.height,i=b.offset.left,k=i+b.proportions.width,j=b.offset.top,l=j+b.proportions.height;
switch(c){case "fit":return i<e&&g<k&&j<f&&h<l;case "intersect":return i<e+a.helperProportions.width/2&&g-a.helperProportions.width/2<k&&j<f+a.helperProportions.height/2&&h-a.helperProportions.height/2<l;case "pointer":return d.ui.isOver((a.positionAbs||a.position.absolute).top+(a.clickOffset||a.offset.click).top,(a.positionAbs||a.position.absolute).left+(a.clickOffset||a.offset.click).left,j,i,b.proportions.height,b.proportions.width);case "touch":return(f>=j&&f<=l||h>=j&&h<=l||f<j&&h>l)&&(e>=i&&
e<=k||g>=i&&g<=k||e<i&&g>k);default:return false}};d.ui.ddmanager={current:null,droppables:{"default":[]},prepareOffsets:function(a,b){var c=d.ui.ddmanager.droppables[a.options.scope]||[],e=b?b.type:null,g=(a.currentItem||a.element).find(":data(droppable)").andSelf(),f=0;a:for(;f<c.length;f++)if(!(c[f].options.disabled||a&&!c[f].accept.call(c[f].element[0],a.currentItem||a.element))){for(var h=0;h<g.length;h++)if(g[h]==c[f].element[0]){c[f].proportions.height=0;continue a}c[f].visible=c[f].element.css("display")!=
"none";if(c[f].visible){c[f].offset=c[f].element.offset();c[f].proportions={width:c[f].element[0].offsetWidth,height:c[f].element[0].offsetHeight};e=="mousedown"&&c[f]._activate.call(c[f],b)}}},drop:function(a,b){var c=false;d.each(d.ui.ddmanager.droppables[a.options.scope]||[],function(){if(this.options){if(!this.options.disabled&&this.visible&&d.ui.intersect(a,this,this.options.tolerance))c=c||this._drop.call(this,b);if(!this.options.disabled&&this.visible&&this.accept.call(this.element[0],a.currentItem||
a.element)){this.isout=1;this.isover=0;this._deactivate.call(this,b)}}});return c},drag:function(a,b){a.options.refreshPositions&&d.ui.ddmanager.prepareOffsets(a,b);d.each(d.ui.ddmanager.droppables[a.options.scope]||[],function(){if(!(this.options.disabled||this.greedyChild||!this.visible)){var c=d.ui.intersect(a,this,this.options.tolerance);if(c=!c&&this.isover==1?"isout":c&&this.isover==0?"isover":null){var e;if(this.options.greedy){var g=this.element.parents(":data(droppable):eq(0)");if(g.length){e=
d.data(g[0],"droppable");e.greedyChild=c=="isover"?1:0}}if(e&&c=="isover"){e.isover=0;e.isout=1;e._out.call(e,b)}this[c]=1;this[c=="isout"?"isover":"isout"]=0;this[c=="isover"?"_over":"_out"].call(this,b);if(e&&c=="isout"){e.isout=0;e.isover=1;e._over.call(e,b)}}}})}}})(jQuery);
/*
 * jQuery UI Resizable 1.8.2
 *
 * Copyright (c) 2010 AUTHORS.txt (http://jqueryui.com/about)
 * Dual licensed under the MIT (MIT-LICENSE.txt)
 * and GPL (GPL-LICENSE.txt) licenses.
 *
 * http://docs.jquery.com/UI/Resizables
 *
 * Depends:
 *	jquery.ui.core.js
 *	jquery.ui.mouse.js
 *	jquery.ui.widget.js
 */
(function(d){d.widget("ui.resizable",d.ui.mouse,{widgetEventPrefix:"resize",options:{alsoResize:false,animate:false,animateDuration:"slow",animateEasing:"swing",aspectRatio:false,autoHide:false,containment:false,ghost:false,grid:false,handles:"e,s,se",helper:false,maxHeight:null,maxWidth:null,minHeight:10,minWidth:10,zIndex:1E3},_create:function(){var b=this,a=this.options;this.element.addClass("ui-resizable");d.extend(this,{_aspectRatio:!!a.aspectRatio,aspectRatio:a.aspectRatio,originalElement:this.element,
_proportionallyResizeElements:[],_helper:a.helper||a.ghost||a.animate?a.helper||"ui-resizable-helper":null});if(this.element[0].nodeName.match(/canvas|textarea|input|select|button|img/i)){/relative/.test(this.element.css("position"))&&d.browser.opera&&this.element.css({position:"relative",top:"auto",left:"auto"});this.element.wrap(d('<div class="ui-wrapper" style="overflow: hidden;"></div>').css({position:this.element.css("position"),width:this.element.outerWidth(),height:this.element.outerHeight(),
top:this.element.css("top"),left:this.element.css("left")}));this.element=this.element.parent().data("resizable",this.element.data("resizable"));this.elementIsWrapper=true;this.element.css({marginLeft:this.originalElement.css("marginLeft"),marginTop:this.originalElement.css("marginTop"),marginRight:this.originalElement.css("marginRight"),marginBottom:this.originalElement.css("marginBottom")});this.originalElement.css({marginLeft:0,marginTop:0,marginRight:0,marginBottom:0});this.originalResizeStyle=
this.originalElement.css("resize");this.originalElement.css("resize","none");this._proportionallyResizeElements.push(this.originalElement.css({position:"static",zoom:1,display:"block"}));this.originalElement.css({margin:this.originalElement.css("margin")});this._proportionallyResize()}this.handles=a.handles||(!d(".ui-resizable-handle",this.element).length?"e,s,se":{n:".ui-resizable-n",e:".ui-resizable-e",s:".ui-resizable-s",w:".ui-resizable-w",se:".ui-resizable-se",sw:".ui-resizable-sw",ne:".ui-resizable-ne",
nw:".ui-resizable-nw"});if(this.handles.constructor==String){if(this.handles=="all")this.handles="n,e,s,w,se,sw,ne,nw";var c=this.handles.split(",");this.handles={};for(var e=0;e<c.length;e++){var g=d.trim(c[e]),f=d('<div class="ui-resizable-handle '+("ui-resizable-"+g)+'"></div>');/sw|se|ne|nw/.test(g)&&f.css({zIndex:++a.zIndex});"se"==g&&f.addClass("ui-icon ui-icon-gripsmall-diagonal-se");this.handles[g]=".ui-resizable-"+g;this.element.append(f)}}this._renderAxis=function(h){h=h||this.element;for(var i in this.handles){if(this.handles[i].constructor==
String)this.handles[i]=d(this.handles[i],this.element).show();if(this.elementIsWrapper&&this.originalElement[0].nodeName.match(/textarea|input|select|button/i)){var j=d(this.handles[i],this.element),l=0;l=/sw|ne|nw|se|n|s/.test(i)?j.outerHeight():j.outerWidth();j=["padding",/ne|nw|n/.test(i)?"Top":/se|sw|s/.test(i)?"Bottom":/^e$/.test(i)?"Right":"Left"].join("");h.css(j,l);this._proportionallyResize()}d(this.handles[i])}};this._renderAxis(this.element);this._handles=d(".ui-resizable-handle",this.element).disableSelection();
this._handles.mouseover(function(){if(!b.resizing){if(this.className)var h=this.className.match(/ui-resizable-(se|sw|ne|nw|n|e|s|w)/i);b.axis=h&&h[1]?h[1]:"se"}});if(a.autoHide){this._handles.hide();d(this.element).addClass("ui-resizable-autohide").hover(function(){d(this).removeClass("ui-resizable-autohide");b._handles.show()},function(){if(!b.resizing){d(this).addClass("ui-resizable-autohide");b._handles.hide()}})}this._mouseInit()},destroy:function(){this._mouseDestroy();var b=function(c){d(c).removeClass("ui-resizable ui-resizable-disabled ui-resizable-resizing").removeData("resizable").unbind(".resizable").find(".ui-resizable-handle").remove()};
if(this.elementIsWrapper){b(this.element);var a=this.element;a.after(this.originalElement.css({position:a.css("position"),width:a.outerWidth(),height:a.outerHeight(),top:a.css("top"),left:a.css("left")})).remove()}this.originalElement.css("resize",this.originalResizeStyle);b(this.originalElement);return this},_mouseCapture:function(b){var a=false;for(var c in this.handles)if(d(this.handles[c])[0]==b.target)a=true;return!this.options.disabled&&a},_mouseStart:function(b){var a=this.options,c=this.element.position(),
e=this.element;this.resizing=true;this.documentScroll={top:d(document).scrollTop(),left:d(document).scrollLeft()};if(e.is(".ui-draggable")||/absolute/.test(e.css("position")))e.css({position:"absolute",top:c.top,left:c.left});d.browser.opera&&/relative/.test(e.css("position"))&&e.css({position:"relative",top:"auto",left:"auto"});this._renderProxy();c=m(this.helper.css("left"));var g=m(this.helper.css("top"));if(a.containment){c+=d(a.containment).scrollLeft()||0;g+=d(a.containment).scrollTop()||0}this.offset=
this.helper.offset();this.position={left:c,top:g};this.size=this._helper?{width:e.outerWidth(),height:e.outerHeight()}:{width:e.width(),height:e.height()};this.originalSize=this._helper?{width:e.outerWidth(),height:e.outerHeight()}:{width:e.width(),height:e.height()};this.originalPosition={left:c,top:g};this.sizeDiff={width:e.outerWidth()-e.width(),height:e.outerHeight()-e.height()};this.originalMousePosition={left:b.pageX,top:b.pageY};this.aspectRatio=typeof a.aspectRatio=="number"?a.aspectRatio:
this.originalSize.width/this.originalSize.height||1;a=d(".ui-resizable-"+this.axis).css("cursor");d("body").css("cursor",a=="auto"?this.axis+"-resize":a);e.addClass("ui-resizable-resizing");this._propagate("start",b);return true},_mouseDrag:function(b){var a=this.helper,c=this.originalMousePosition,e=this._change[this.axis];if(!e)return false;c=e.apply(this,[b,b.pageX-c.left||0,b.pageY-c.top||0]);if(this._aspectRatio||b.shiftKey)c=this._updateRatio(c,b);c=this._respectSize(c,b);this._propagate("resize",
b);a.css({top:this.position.top+"px",left:this.position.left+"px",width:this.size.width+"px",height:this.size.height+"px"});!this._helper&&this._proportionallyResizeElements.length&&this._proportionallyResize();this._updateCache(c);this._trigger("resize",b,this.ui());return false},_mouseStop:function(b){this.resizing=false;var a=this.options,c=this;if(this._helper){var e=this._proportionallyResizeElements,g=e.length&&/textarea/i.test(e[0].nodeName);e=g&&d.ui.hasScroll(e[0],"left")?0:c.sizeDiff.height;
g={width:c.size.width-(g?0:c.sizeDiff.width),height:c.size.height-e};e=parseInt(c.element.css("left"),10)+(c.position.left-c.originalPosition.left)||null;var f=parseInt(c.element.css("top"),10)+(c.position.top-c.originalPosition.top)||null;a.animate||this.element.css(d.extend(g,{top:f,left:e}));c.helper.height(c.size.height);c.helper.width(c.size.width);this._helper&&!a.animate&&this._proportionallyResize()}d("body").css("cursor","auto");this.element.removeClass("ui-resizable-resizing");this._propagate("stop",
b);this._helper&&this.helper.remove();return false},_updateCache:function(b){this.offset=this.helper.offset();if(k(b.left))this.position.left=b.left;if(k(b.top))this.position.top=b.top;if(k(b.height))this.size.height=b.height;if(k(b.width))this.size.width=b.width},_updateRatio:function(b){var a=this.position,c=this.size,e=this.axis;if(b.height)b.width=c.height*this.aspectRatio;else if(b.width)b.height=c.width/this.aspectRatio;if(e=="sw"){b.left=a.left+(c.width-b.width);b.top=null}if(e=="nw"){b.top=
a.top+(c.height-b.height);b.left=a.left+(c.width-b.width)}return b},_respectSize:function(b){var a=this.options,c=this.axis,e=k(b.width)&&a.maxWidth&&a.maxWidth<b.width,g=k(b.height)&&a.maxHeight&&a.maxHeight<b.height,f=k(b.width)&&a.minWidth&&a.minWidth>b.width,h=k(b.height)&&a.minHeight&&a.minHeight>b.height;if(f)b.width=a.minWidth;if(h)b.height=a.minHeight;if(e)b.width=a.maxWidth;if(g)b.height=a.maxHeight;var i=this.originalPosition.left+this.originalSize.width,j=this.position.top+this.size.height,
l=/sw|nw|w/.test(c);c=/nw|ne|n/.test(c);if(f&&l)b.left=i-a.minWidth;if(e&&l)b.left=i-a.maxWidth;if(h&&c)b.top=j-a.minHeight;if(g&&c)b.top=j-a.maxHeight;if((a=!b.width&&!b.height)&&!b.left&&b.top)b.top=null;else if(a&&!b.top&&b.left)b.left=null;return b},_proportionallyResize:function(){if(this._proportionallyResizeElements.length)for(var b=this.helper||this.element,a=0;a<this._proportionallyResizeElements.length;a++){var c=this._proportionallyResizeElements[a];if(!this.borderDif){var e=[c.css("borderTopWidth"),
c.css("borderRightWidth"),c.css("borderBottomWidth"),c.css("borderLeftWidth")],g=[c.css("paddingTop"),c.css("paddingRight"),c.css("paddingBottom"),c.css("paddingLeft")];this.borderDif=d.map(e,function(f,h){f=parseInt(f,10)||0;h=parseInt(g[h],10)||0;return f+h})}d.browser.msie&&(d(b).is(":hidden")||d(b).parents(":hidden").length)||c.css({height:b.height()-this.borderDif[0]-this.borderDif[2]||0,width:b.width()-this.borderDif[1]-this.borderDif[3]||0})}},_renderProxy:function(){var b=this.options;this.elementOffset=
this.element.offset();if(this._helper){this.helper=this.helper||d('<div style="overflow:hidden;"></div>');var a=d.browser.msie&&d.browser.version<7,c=a?1:0;a=a?2:-1;this.helper.addClass(this._helper).css({width:this.element.outerWidth()+a,height:this.element.outerHeight()+a,position:"absolute",left:this.elementOffset.left-c+"px",top:this.elementOffset.top-c+"px",zIndex:++b.zIndex});this.helper.appendTo("body").disableSelection()}else this.helper=this.element},_change:{e:function(b,a){return{width:this.originalSize.width+
a}},w:function(b,a){return{left:this.originalPosition.left+a,width:this.originalSize.width-a}},n:function(b,a,c){return{top:this.originalPosition.top+c,height:this.originalSize.height-c}},s:function(b,a,c){return{height:this.originalSize.height+c}},se:function(b,a,c){return d.extend(this._change.s.apply(this,arguments),this._change.e.apply(this,[b,a,c]))},sw:function(b,a,c){return d.extend(this._change.s.apply(this,arguments),this._change.w.apply(this,[b,a,c]))},ne:function(b,a,c){return d.extend(this._change.n.apply(this,
arguments),this._change.e.apply(this,[b,a,c]))},nw:function(b,a,c){return d.extend(this._change.n.apply(this,arguments),this._change.w.apply(this,[b,a,c]))}},_propagate:function(b,a){d.ui.plugin.call(this,b,[a,this.ui()]);b!="resize"&&this._trigger(b,a,this.ui())},plugins:{},ui:function(){return{originalElement:this.originalElement,element:this.element,helper:this.helper,position:this.position,size:this.size,originalSize:this.originalSize,originalPosition:this.originalPosition}}});d.extend(d.ui.resizable,
{version:"1.8.2"});d.ui.plugin.add("resizable","alsoResize",{start:function(){var b=d(this).data("resizable").options,a=function(c){d(c).each(function(){d(this).data("resizable-alsoresize",{width:parseInt(d(this).width(),10),height:parseInt(d(this).height(),10),left:parseInt(d(this).css("left"),10),top:parseInt(d(this).css("top"),10)})})};if(typeof b.alsoResize=="object"&&!b.alsoResize.parentNode)if(b.alsoResize.length){b.alsoResize=b.alsoResize[0];a(b.alsoResize)}else d.each(b.alsoResize,function(c){a(c)});
else a(b.alsoResize)},resize:function(){var b=d(this).data("resizable"),a=b.options,c=b.originalSize,e=b.originalPosition,g={height:b.size.height-c.height||0,width:b.size.width-c.width||0,top:b.position.top-e.top||0,left:b.position.left-e.left||0},f=function(h,i){d(h).each(function(){var j=d(this),l=d(this).data("resizable-alsoresize"),p={};d.each((i&&i.length?i:["width","height","top","left"])||["width","height","top","left"],function(n,o){if((n=(l[o]||0)+(g[o]||0))&&n>=0)p[o]=n||null});if(/relative/.test(j.css("position"))&&
d.browser.opera){b._revertToRelativePosition=true;j.css({position:"absolute",top:"auto",left:"auto"})}j.css(p)})};typeof a.alsoResize=="object"&&!a.alsoResize.nodeType?d.each(a.alsoResize,function(h,i){f(h,i)}):f(a.alsoResize)},stop:function(){var b=d(this).data("resizable");if(b._revertToRelativePosition&&d.browser.opera){b._revertToRelativePosition=false;el.css({position:"relative"})}d(this).removeData("resizable-alsoresize-start")}});d.ui.plugin.add("resizable","animate",{stop:function(b){var a=
d(this).data("resizable"),c=a.options,e=a._proportionallyResizeElements,g=e.length&&/textarea/i.test(e[0].nodeName),f=g&&d.ui.hasScroll(e[0],"left")?0:a.sizeDiff.height;g={width:a.size.width-(g?0:a.sizeDiff.width),height:a.size.height-f};f=parseInt(a.element.css("left"),10)+(a.position.left-a.originalPosition.left)||null;var h=parseInt(a.element.css("top"),10)+(a.position.top-a.originalPosition.top)||null;a.element.animate(d.extend(g,h&&f?{top:h,left:f}:{}),{duration:c.animateDuration,easing:c.animateEasing,
step:function(){var i={width:parseInt(a.element.css("width"),10),height:parseInt(a.element.css("height"),10),top:parseInt(a.element.css("top"),10),left:parseInt(a.element.css("left"),10)};e&&e.length&&d(e[0]).css({width:i.width,height:i.height});a._updateCache(i);a._propagate("resize",b)}})}});d.ui.plugin.add("resizable","containment",{start:function(){var b=d(this).data("resizable"),a=b.element,c=b.options.containment;if(a=c instanceof d?c.get(0):/parent/.test(c)?a.parent().get(0):c){b.containerElement=
d(a);if(/document/.test(c)||c==document){b.containerOffset={left:0,top:0};b.containerPosition={left:0,top:0};b.parentData={element:d(document),left:0,top:0,width:d(document).width(),height:d(document).height()||document.body.parentNode.scrollHeight}}else{var e=d(a),g=[];d(["Top","Right","Left","Bottom"]).each(function(i,j){g[i]=m(e.css("padding"+j))});b.containerOffset=e.offset();b.containerPosition=e.position();b.containerSize={height:e.innerHeight()-g[3],width:e.innerWidth()-g[1]};c=b.containerOffset;
var f=b.containerSize.height,h=b.containerSize.width;h=d.ui.hasScroll(a,"left")?a.scrollWidth:h;f=d.ui.hasScroll(a)?a.scrollHeight:f;b.parentData={element:a,left:c.left,top:c.top,width:h,height:f}}}},resize:function(b){var a=d(this).data("resizable"),c=a.options,e=a.containerOffset,g=a.position;b=a._aspectRatio||b.shiftKey;var f={top:0,left:0},h=a.containerElement;if(h[0]!=document&&/static/.test(h.css("position")))f=e;if(g.left<(a._helper?e.left:0)){a.size.width+=a._helper?a.position.left-e.left:
a.position.left-f.left;if(b)a.size.height=a.size.width/c.aspectRatio;a.position.left=c.helper?e.left:0}if(g.top<(a._helper?e.top:0)){a.size.height+=a._helper?a.position.top-e.top:a.position.top;if(b)a.size.width=a.size.height*c.aspectRatio;a.position.top=a._helper?e.top:0}a.offset.left=a.parentData.left+a.position.left;a.offset.top=a.parentData.top+a.position.top;c=Math.abs((a._helper?a.offset.left-f.left:a.offset.left-f.left)+a.sizeDiff.width);e=Math.abs((a._helper?a.offset.top-f.top:a.offset.top-
e.top)+a.sizeDiff.height);g=a.containerElement.get(0)==a.element.parent().get(0);f=/relative|absolute/.test(a.containerElement.css("position"));if(g&&f)c-=a.parentData.left;if(c+a.size.width>=a.parentData.width){a.size.width=a.parentData.width-c;if(b)a.size.height=a.size.width/a.aspectRatio}if(e+a.size.height>=a.parentData.height){a.size.height=a.parentData.height-e;if(b)a.size.width=a.size.height*a.aspectRatio}},stop:function(){var b=d(this).data("resizable"),a=b.options,c=b.containerOffset,e=b.containerPosition,
g=b.containerElement,f=d(b.helper),h=f.offset(),i=f.outerWidth()-b.sizeDiff.width;f=f.outerHeight()-b.sizeDiff.height;b._helper&&!a.animate&&/relative/.test(g.css("position"))&&d(this).css({left:h.left-e.left-c.left,width:i,height:f});b._helper&&!a.animate&&/static/.test(g.css("position"))&&d(this).css({left:h.left-e.left-c.left,width:i,height:f})}});d.ui.plugin.add("resizable","ghost",{start:function(){var b=d(this).data("resizable"),a=b.options,c=b.size;b.ghost=b.originalElement.clone();b.ghost.css({opacity:0.25,
display:"block",position:"relative",height:c.height,width:c.width,margin:0,left:0,top:0}).addClass("ui-resizable-ghost").addClass(typeof a.ghost=="string"?a.ghost:"");b.ghost.appendTo(b.helper)},resize:function(){var b=d(this).data("resizable");b.ghost&&b.ghost.css({position:"relative",height:b.size.height,width:b.size.width})},stop:function(){var b=d(this).data("resizable");b.ghost&&b.helper&&b.helper.get(0).removeChild(b.ghost.get(0))}});d.ui.plugin.add("resizable","grid",{resize:function(){var b=
d(this).data("resizable"),a=b.options,c=b.size,e=b.originalSize,g=b.originalPosition,f=b.axis;a.grid=typeof a.grid=="number"?[a.grid,a.grid]:a.grid;var h=Math.round((c.width-e.width)/(a.grid[0]||1))*(a.grid[0]||1);a=Math.round((c.height-e.height)/(a.grid[1]||1))*(a.grid[1]||1);if(/^(se|s|e)$/.test(f)){b.size.width=e.width+h;b.size.height=e.height+a}else if(/^(ne)$/.test(f)){b.size.width=e.width+h;b.size.height=e.height+a;b.position.top=g.top-a}else{if(/^(sw)$/.test(f)){b.size.width=e.width+h;b.size.height=
e.height+a}else{b.size.width=e.width+h;b.size.height=e.height+a;b.position.top=g.top-a}b.position.left=g.left-h}}});var m=function(b){return parseInt(b,10)||0},k=function(b){return!isNaN(parseInt(b,10))}})(jQuery);

/*
 * jQuery UI Selectable 1.8.2
 *
 * Copyright (c) 2010 AUTHORS.txt (http://jqueryui.com/about)
 * Dual licensed under the MIT (MIT-LICENSE.txt)
 * and GPL (GPL-LICENSE.txt) licenses.
 *
 * http://docs.jquery.com/UI/Selectables
 *
 * Depends:
 *	jquery.ui.core.js
 *	jquery.ui.mouse.js
 *	jquery.ui.widget.js
 */
(function($) {

$.widget("ui.selectable", $.ui.mouse, {
	options: {
		appendTo: 'body',
		autoRefresh: true,
		distance: 0,
		filter: '*',
		tolerance: 'touch'
	},
	_create: function() {
		var self = this;

		this.element.addClass("ui-selectable");

		this.dragged = false;

		// cache selectee children based on filter
		var selectees;
		this.refresh = function() {
			selectees = $(self.options.filter, self.element[0]);
			selectees.each(function() {
				var $this = $(this);
				var pos = $this.offset();
				$.data(this, "selectable-item", {
					element: this,
					$element: $this,
					left: pos.left,
					top: pos.top,
					right: pos.left + $this.outerWidth(),
					bottom: pos.top + $this.outerHeight(),
					startselected: false,
					selected: $this.hasClass('ui-selected'),
					selecting: $this.hasClass('ui-selecting'),
					unselecting: $this.hasClass('ui-unselecting')
				});
			});
		};
		this.refresh();

		this.selectees = selectees.addClass("ui-selectee");

		this._mouseInit();

		this.helper = $("<div class='ui-selectable-helper'></div>");
	},

	destroy: function() {
		this.selectees
			.removeClass("ui-selectee")
			.removeData("selectable-item");
		this.element
			.removeClass("ui-selectable ui-selectable-disabled")
			.removeData("selectable")
			.unbind(".selectable");
		this._mouseDestroy();

		return this;
	},

	_mouseStart: function(event) {
		var self = this;

		this.opos = [event.pageX, event.pageY];

		if (this.options.disabled)
			return;

		var options = this.options;

		this.selectees = $(options.filter, this.element[0]);

		this._trigger("start", event);

		$(options.appendTo).append(this.helper);
		// position helper (lasso)
		this.helper.css({
			"z-index": 100,
			"position": "absolute",
			"left": event.clientX,
			"top": event.clientY,
			"width": 0,
			"height": 0
		});

		if (options.autoRefresh) {
			this.refresh();
		}

		this.selectees.filter('.ui-selected').each(function() {
			var selectee = $.data(this, "selectable-item");
			selectee.startselected = true;
			if (!event.metaKey) {
				selectee.$element.removeClass('ui-selected');
				selectee.selected = false;
				selectee.$element.addClass('ui-unselecting');
				selectee.unselecting = true;
				// selectable UNSELECTING callback
				self._trigger("unselecting", event, {
					unselecting: selectee.element
				});
			}
		});

		$(event.target).parents().andSelf().each(function() {
			var selectee = $.data(this, "selectable-item");
			if (selectee) {
				var doSelect = !event.metaKey || !selectee.$element.hasClass('ui-selected');
				selectee.$element
					.removeClass(doSelect ? "ui-unselecting" : "ui-selected")
					.addClass(doSelect ? "ui-selecting" : "ui-unselecting");
				selectee.unselecting = !doSelect;
				selectee.selecting = doSelect;
				selectee.selected = doSelect;
				// selectable (UN)SELECTING callback
				if (doSelect) {
					self._trigger("selecting", event, {
						selecting: selectee.element
					});
				} else {
					self._trigger("unselecting", event, {
						unselecting: selectee.element
					});
				}
				return false;
			}
		});

	},

	_mouseDrag: function(event) {
		var self = this;
		this.dragged = true;

		if (this.options.disabled)
			return;

		var options = this.options;

		var x1 = this.opos[0], y1 = this.opos[1], x2 = event.pageX, y2 = event.pageY;
		if (x1 > x2) { var tmp = x2; x2 = x1; x1 = tmp; }
		if (y1 > y2) { var tmp = y2; y2 = y1; y1 = tmp; }
		this.helper.css({left: x1, top: y1, width: x2-x1, height: y2-y1});

		this.selectees.each(function() {
			var selectee = $.data(this, "selectable-item");
			//prevent helper from being selected if appendTo: selectable
			if (!selectee || selectee.element == self.element[0])
				return;
			var hit = false;
			if (options.tolerance == 'touch') {
				hit = ( !(selectee.left > x2 || selectee.right < x1 || selectee.top > y2 || selectee.bottom < y1) );
			} else if (options.tolerance == 'fit') {
				hit = (selectee.left > x1 && selectee.right < x2 && selectee.top > y1 && selectee.bottom < y2);
			}

			if (hit) {
				// SELECT
				if (selectee.selected) {
					selectee.$element.removeClass('ui-selected');
					selectee.selected = false;
				}
				if (selectee.unselecting) {
					selectee.$element.removeClass('ui-unselecting');
					selectee.unselecting = false;
				}
				if (!selectee.selecting) {
					selectee.$element.addClass('ui-selecting');
					selectee.selecting = true;
					// selectable SELECTING callback
					self._trigger("selecting", event, {
						selecting: selectee.element
					});
				}
			} else {
				// UNSELECT
				if (selectee.selecting) {
					if (event.metaKey && selectee.startselected) {
						selectee.$element.removeClass('ui-selecting');
						selectee.selecting = false;
						selectee.$element.addClass('ui-selected');
						selectee.selected = true;
					} else {
						selectee.$element.removeClass('ui-selecting');
						selectee.selecting = false;
						if (selectee.startselected) {
							selectee.$element.addClass('ui-unselecting');
							selectee.unselecting = true;
						}
						// selectable UNSELECTING callback
						self._trigger("unselecting", event, {
							unselecting: selectee.element
						});
					}
				}
				if (selectee.selected) {
					if (!event.metaKey && !selectee.startselected) {
						selectee.$element.removeClass('ui-selected');
						selectee.selected = false;

						selectee.$element.addClass('ui-unselecting');
						selectee.unselecting = true;
						// selectable UNSELECTING callback
						self._trigger("unselecting", event, {
							unselecting: selectee.element
						});
					}
				}
			}
		});

		return false;
	},

	_mouseStop: function(event) {
		var self = this;

		this.dragged = false;

		var options = this.options;

		$('.ui-unselecting', this.element[0]).each(function() {
			var selectee = $.data(this, "selectable-item");
			selectee.$element.removeClass('ui-unselecting');
			selectee.unselecting = false;
			selectee.startselected = false;
			self._trigger("unselected", event, {
				unselected: selectee.element
			});
		});
		$('.ui-selecting', this.element[0]).each(function() {
			var selectee = $.data(this, "selectable-item");
			selectee.$element.removeClass('ui-selecting').addClass('ui-selected');
			selectee.selecting = false;
			selectee.selected = true;
			selectee.startselected = true;
			self._trigger("selected", event, {
				selected: selectee.element
			});
		});
		this._trigger("stop", event);

		this.helper.remove();

		return false;
	}

});

$.extend($.ui.selectable, {
	version: "1.8.2"
});

})(jQuery);
(function(e){e.widget("ui.selectable",e.ui.mouse,{options:{appendTo:"body",autoRefresh:true,distance:0,filter:"*",tolerance:"touch"},_create:function(){var c=this;this.element.addClass("ui-selectable");this.dragged=false;var f;this.refresh=function(){f=e(c.options.filter,c.element[0]);f.each(function(){var d=e(this),b=d.offset();e.data(this,"selectable-item",{element:this,$element:d,left:b.left,top:b.top,right:b.left+d.outerWidth(),bottom:b.top+d.outerHeight(),startselected:false,selected:d.hasClass("ui-selected"),
selecting:d.hasClass("ui-selecting"),unselecting:d.hasClass("ui-unselecting")})})};this.refresh();this.selectees=f.addClass("ui-selectee");this._mouseInit();this.helper=e("<div class='ui-selectable-helper'></div>")},destroy:function(){this.selectees.removeClass("ui-selectee").removeData("selectable-item");this.element.removeClass("ui-selectable ui-selectable-disabled").removeData("selectable").unbind(".selectable");this._mouseDestroy();return this},_mouseStart:function(c){var f=this;this.opos=[c.pageX,
c.pageY];if(!this.options.disabled){var d=this.options;this.selectees=e(d.filter,this.element[0]);this._trigger("start",c);e(d.appendTo).append(this.helper);this.helper.css({"z-index":100,position:"absolute",left:c.clientX,top:c.clientY,width:0,height:0});d.autoRefresh&&this.refresh();this.selectees.filter(".ui-selected").each(function(){var b=e.data(this,"selectable-item");b.startselected=true;if(!c.metaKey){b.$element.removeClass("ui-selected");b.selected=false;b.$element.addClass("ui-unselecting");
b.unselecting=true;f._trigger("unselecting",c,{unselecting:b.element})}});e(c.target).parents().andSelf().each(function(){var b=e.data(this,"selectable-item");if(b){var g=!c.metaKey||!b.$element.hasClass("ui-selected");b.$element.removeClass(g?"ui-unselecting":"ui-selected").addClass(g?"ui-selecting":"ui-unselecting");b.unselecting=!g;b.selecting=g;(b.selected=g)?f._trigger("selecting",c,{selecting:b.element}):f._trigger("unselecting",c,{unselecting:b.element});return false}})}},_mouseDrag:function(c){var f=
this;this.dragged=true;if(!this.options.disabled){var d=this.options,b=this.opos[0],g=this.opos[1],h=c.pageX,i=c.pageY;if(b>h){var j=h;h=b;b=j}if(g>i){j=i;i=g;g=j}this.helper.css({left:b,top:g,width:h-b,height:i-g});this.selectees.each(function(){var a=e.data(this,"selectable-item");if(!(!a||a.element==f.element[0])){var k=false;if(d.tolerance=="touch")k=!(a.left>h||a.right<b||a.top>i||a.bottom<g);else if(d.tolerance=="fit")k=a.left>b&&a.right<h&&a.top>g&&a.bottom<i;if(k){if(a.selected){a.$element.removeClass("ui-selected");
a.selected=false}if(a.unselecting){a.$element.removeClass("ui-unselecting");a.unselecting=false}if(!a.selecting){a.$element.addClass("ui-selecting");a.selecting=true;f._trigger("selecting",c,{selecting:a.element})}}else{if(a.selecting)if(c.metaKey&&a.startselected){a.$element.removeClass("ui-selecting");a.selecting=false;a.$element.addClass("ui-selected");a.selected=true}else{a.$element.removeClass("ui-selecting");a.selecting=false;if(a.startselected){a.$element.addClass("ui-unselecting");a.unselecting=
true}f._trigger("unselecting",c,{unselecting:a.element})}if(a.selected)if(!c.metaKey&&!a.startselected){a.$element.removeClass("ui-selected");a.selected=false;a.$element.addClass("ui-unselecting");a.unselecting=true;f._trigger("unselecting",c,{unselecting:a.element})}}}});return false}},_mouseStop:function(c){var f=this;this.dragged=false;e(".ui-unselecting",this.element[0]).each(function(){var d=e.data(this,"selectable-item");d.$element.removeClass("ui-unselecting");d.unselecting=false;d.startselected=
false;f._trigger("unselected",c,{unselected:d.element})});e(".ui-selecting",this.element[0]).each(function(){var d=e.data(this,"selectable-item");d.$element.removeClass("ui-selecting").addClass("ui-selected");d.selecting=false;d.selected=true;d.startselected=true;f._trigger("selected",c,{selected:d.element})});this._trigger("stop",c);this.helper.remove();return false}});e.extend(e.ui.selectable,{version:"1.8.2"})})(jQuery);
/*
 * jQuery UI Sortable 1.8.2
 *
 * Copyright (c) 2010 AUTHORS.txt (http://jqueryui.com/about)
 * Dual licensed under the MIT (MIT-LICENSE.txt)
 * and GPL (GPL-LICENSE.txt) licenses.
 *
 * http://docs.jquery.com/UI/Sortables
 *
 * Depends:
 *	jquery.ui.core.js
 *	jquery.ui.mouse.js
 *	jquery.ui.widget.js
 */
(function(d){d.widget("ui.sortable",d.ui.mouse,{widgetEventPrefix:"sort",options:{appendTo:"parent",axis:false,connectWith:false,containment:false,cursor:"auto",cursorAt:false,dropOnEmpty:true,forcePlaceholderSize:false,forceHelperSize:false,grid:false,handle:false,helper:"original",items:"> *",opacity:false,placeholder:false,revert:false,scroll:true,scrollSensitivity:20,scrollSpeed:20,scope:"default",tolerance:"intersect",zIndex:1E3},_create:function(){this.containerCache={};this.element.addClass("ui-sortable");
this.refresh();this.floating=this.items.length?/left|right/.test(this.items[0].item.css("float")):false;this.offset=this.element.offset();this._mouseInit()},destroy:function(){this.element.removeClass("ui-sortable ui-sortable-disabled").removeData("sortable").unbind(".sortable");this._mouseDestroy();for(var a=this.items.length-1;a>=0;a--)this.items[a].item.removeData("sortable-item");return this},_setOption:function(a,b){if(a==="disabled"){this.options[a]=b;this.widget()[b?"addClass":"removeClass"]("ui-sortable-disabled")}else d.Widget.prototype._setOption.apply(this,
arguments)},_mouseCapture:function(a,b){if(this.reverting)return false;if(this.options.disabled||this.options.type=="static")return false;this._refreshItems(a);var c=null,e=this;d(a.target).parents().each(function(){if(d.data(this,"sortable-item")==e){c=d(this);return false}});if(d.data(a.target,"sortable-item")==e)c=d(a.target);if(!c)return false;if(this.options.handle&&!b){var f=false;d(this.options.handle,c).find("*").andSelf().each(function(){if(this==a.target)f=true});if(!f)return false}this.currentItem=
c;this._removeCurrentsFromItems();return true},_mouseStart:function(a,b,c){b=this.options;var e=this;this.currentContainer=this;this.refreshPositions();this.helper=this._createHelper(a);this._cacheHelperProportions();this._cacheMargins();this.scrollParent=this.helper.scrollParent();this.offset=this.currentItem.offset();this.offset={top:this.offset.top-this.margins.top,left:this.offset.left-this.margins.left};this.helper.css("position","absolute");this.cssPosition=this.helper.css("position");d.extend(this.offset,
{click:{left:a.pageX-this.offset.left,top:a.pageY-this.offset.top},parent:this._getParentOffset(),relative:this._getRelativeOffset()});this.originalPosition=this._generatePosition(a);this.originalPageX=a.pageX;this.originalPageY=a.pageY;b.cursorAt&&this._adjustOffsetFromHelper(b.cursorAt);this.domPosition={prev:this.currentItem.prev()[0],parent:this.currentItem.parent()[0]};this.helper[0]!=this.currentItem[0]&&this.currentItem.hide();this._createPlaceholder();b.containment&&this._setContainment();
if(b.cursor){if(d("body").css("cursor"))this._storedCursor=d("body").css("cursor");d("body").css("cursor",b.cursor)}if(b.opacity){if(this.helper.css("opacity"))this._storedOpacity=this.helper.css("opacity");this.helper.css("opacity",b.opacity)}if(b.zIndex){if(this.helper.css("zIndex"))this._storedZIndex=this.helper.css("zIndex");this.helper.css("zIndex",b.zIndex)}if(this.scrollParent[0]!=document&&this.scrollParent[0].tagName!="HTML")this.overflowOffset=this.scrollParent.offset();this._trigger("start",
a,this._uiHash());this._preserveHelperProportions||this._cacheHelperProportions();if(!c)for(c=this.containers.length-1;c>=0;c--)this.containers[c]._trigger("activate",a,e._uiHash(this));if(d.ui.ddmanager)d.ui.ddmanager.current=this;d.ui.ddmanager&&!b.dropBehaviour&&d.ui.ddmanager.prepareOffsets(this,a);this.dragging=true;this.helper.addClass("ui-sortable-helper");this._mouseDrag(a);return true},_mouseDrag:function(a){this.position=this._generatePosition(a);this.positionAbs=this._convertPositionTo("absolute");
if(!this.lastPositionAbs)this.lastPositionAbs=this.positionAbs;if(this.options.scroll){var b=this.options,c=false;if(this.scrollParent[0]!=document&&this.scrollParent[0].tagName!="HTML"){if(this.overflowOffset.top+this.scrollParent[0].offsetHeight-a.pageY<b.scrollSensitivity)this.scrollParent[0].scrollTop=c=this.scrollParent[0].scrollTop+b.scrollSpeed;else if(a.pageY-this.overflowOffset.top<b.scrollSensitivity)this.scrollParent[0].scrollTop=c=this.scrollParent[0].scrollTop-b.scrollSpeed;if(this.overflowOffset.left+
this.scrollParent[0].offsetWidth-a.pageX<b.scrollSensitivity)this.scrollParent[0].scrollLeft=c=this.scrollParent[0].scrollLeft+b.scrollSpeed;else if(a.pageX-this.overflowOffset.left<b.scrollSensitivity)this.scrollParent[0].scrollLeft=c=this.scrollParent[0].scrollLeft-b.scrollSpeed}else{if(a.pageY-d(document).scrollTop()<b.scrollSensitivity)c=d(document).scrollTop(d(document).scrollTop()-b.scrollSpeed);else if(d(window).height()-(a.pageY-d(document).scrollTop())<b.scrollSensitivity)c=d(document).scrollTop(d(document).scrollTop()+
b.scrollSpeed);if(a.pageX-d(document).scrollLeft()<b.scrollSensitivity)c=d(document).scrollLeft(d(document).scrollLeft()-b.scrollSpeed);else if(d(window).width()-(a.pageX-d(document).scrollLeft())<b.scrollSensitivity)c=d(document).scrollLeft(d(document).scrollLeft()+b.scrollSpeed)}c!==false&&d.ui.ddmanager&&!b.dropBehaviour&&d.ui.ddmanager.prepareOffsets(this,a)}this.positionAbs=this._convertPositionTo("absolute");if(!this.options.axis||this.options.axis!="y")this.helper[0].style.left=this.position.left+
"px";if(!this.options.axis||this.options.axis!="x")this.helper[0].style.top=this.position.top+"px";for(b=this.items.length-1;b>=0;b--){c=this.items[b];var e=c.item[0],f=this._intersectsWithPointer(c);if(f)if(e!=this.currentItem[0]&&this.placeholder[f==1?"next":"prev"]()[0]!=e&&!d.ui.contains(this.placeholder[0],e)&&(this.options.type=="semi-dynamic"?!d.ui.contains(this.element[0],e):true)){this.direction=f==1?"down":"up";if(this.options.tolerance=="pointer"||this._intersectsWithSides(c))this._rearrange(a,
c);else break;this._trigger("change",a,this._uiHash());break}}this._contactContainers(a);d.ui.ddmanager&&d.ui.ddmanager.drag(this,a);this._trigger("sort",a,this._uiHash());this.lastPositionAbs=this.positionAbs;return false},_mouseStop:function(a,b){if(a){d.ui.ddmanager&&!this.options.dropBehaviour&&d.ui.ddmanager.drop(this,a);if(this.options.revert){var c=this;b=c.placeholder.offset();c.reverting=true;d(this.helper).animate({left:b.left-this.offset.parent.left-c.margins.left+(this.offsetParent[0]==
document.body?0:this.offsetParent[0].scrollLeft),top:b.top-this.offset.parent.top-c.margins.top+(this.offsetParent[0]==document.body?0:this.offsetParent[0].scrollTop)},parseInt(this.options.revert,10)||500,function(){c._clear(a)})}else this._clear(a,b);return false}},cancel:function(){var a=this;if(this.dragging){this._mouseUp();this.options.helper=="original"?this.currentItem.css(this._storedCSS).removeClass("ui-sortable-helper"):this.currentItem.show();for(var b=this.containers.length-1;b>=0;b--){this.containers[b]._trigger("deactivate",
null,a._uiHash(this));if(this.containers[b].containerCache.over){this.containers[b]._trigger("out",null,a._uiHash(this));this.containers[b].containerCache.over=0}}}this.placeholder[0].parentNode&&this.placeholder[0].parentNode.removeChild(this.placeholder[0]);this.options.helper!="original"&&this.helper&&this.helper[0].parentNode&&this.helper.remove();d.extend(this,{helper:null,dragging:false,reverting:false,_noFinalSort:null});this.domPosition.prev?d(this.domPosition.prev).after(this.currentItem):
d(this.domPosition.parent).prepend(this.currentItem);return this},serialize:function(a){var b=this._getItemsAsjQuery(a&&a.connected),c=[];a=a||{};d(b).each(function(){var e=(d(a.item||this).attr(a.attribute||"id")||"").match(a.expression||/(.+)[-=_](.+)/);if(e)c.push((a.key||e[1]+"[]")+"="+(a.key&&a.expression?e[1]:e[2]))});return c.join("&")},toArray:function(a){var b=this._getItemsAsjQuery(a&&a.connected),c=[];a=a||{};b.each(function(){c.push(d(a.item||this).attr(a.attribute||"id")||"")});return c},
_intersectsWith:function(a){var b=this.positionAbs.left,c=b+this.helperProportions.width,e=this.positionAbs.top,f=e+this.helperProportions.height,g=a.left,h=g+a.width,i=a.top,k=i+a.height,j=this.offset.click.top,l=this.offset.click.left;j=e+j>i&&e+j<k&&b+l>g&&b+l<h;return this.options.tolerance=="pointer"||this.options.forcePointerForContainers||this.options.tolerance!="pointer"&&this.helperProportions[this.floating?"width":"height"]>a[this.floating?"width":"height"]?j:g<b+this.helperProportions.width/
2&&c-this.helperProportions.width/2<h&&i<e+this.helperProportions.height/2&&f-this.helperProportions.height/2<k},_intersectsWithPointer:function(a){var b=d.ui.isOverAxis(this.positionAbs.top+this.offset.click.top,a.top,a.height);a=d.ui.isOverAxis(this.positionAbs.left+this.offset.click.left,a.left,a.width);b=b&&a;a=this._getDragVerticalDirection();var c=this._getDragHorizontalDirection();if(!b)return false;return this.floating?c&&c=="right"||a=="down"?2:1:a&&(a=="down"?2:1)},_intersectsWithSides:function(a){var b=
d.ui.isOverAxis(this.positionAbs.top+this.offset.click.top,a.top+a.height/2,a.height);a=d.ui.isOverAxis(this.positionAbs.left+this.offset.click.left,a.left+a.width/2,a.width);var c=this._getDragVerticalDirection(),e=this._getDragHorizontalDirection();return this.floating&&e?e=="right"&&a||e=="left"&&!a:c&&(c=="down"&&b||c=="up"&&!b)},_getDragVerticalDirection:function(){var a=this.positionAbs.top-this.lastPositionAbs.top;return a!=0&&(a>0?"down":"up")},_getDragHorizontalDirection:function(){var a=
this.positionAbs.left-this.lastPositionAbs.left;return a!=0&&(a>0?"right":"left")},refresh:function(a){this._refreshItems(a);this.refreshPositions();return this},_connectWith:function(){var a=this.options;return a.connectWith.constructor==String?[a.connectWith]:a.connectWith},_getItemsAsjQuery:function(a){var b=[],c=[],e=this._connectWith();if(e&&a)for(a=e.length-1;a>=0;a--)for(var f=d(e[a]),g=f.length-1;g>=0;g--){var h=d.data(f[g],"sortable");if(h&&h!=this&&!h.options.disabled)c.push([d.isFunction(h.options.items)?
h.options.items.call(h.element):d(h.options.items,h.element).not(".ui-sortable-helper").not(".ui-sortable-placeholder"),h])}c.push([d.isFunction(this.options.items)?this.options.items.call(this.element,null,{options:this.options,item:this.currentItem}):d(this.options.items,this.element).not(".ui-sortable-helper").not(".ui-sortable-placeholder"),this]);for(a=c.length-1;a>=0;a--)c[a][0].each(function(){b.push(this)});return d(b)},_removeCurrentsFromItems:function(){for(var a=this.currentItem.find(":data(sortable-item)"),
b=0;b<this.items.length;b++)for(var c=0;c<a.length;c++)a[c]==this.items[b].item[0]&&this.items.splice(b,1)},_refreshItems:function(a){this.items=[];this.containers=[this];var b=this.items,c=[[d.isFunction(this.options.items)?this.options.items.call(this.element[0],a,{item:this.currentItem}):d(this.options.items,this.element),this]],e=this._connectWith();if(e)for(var f=e.length-1;f>=0;f--)for(var g=d(e[f]),h=g.length-1;h>=0;h--){var i=d.data(g[h],"sortable");if(i&&i!=this&&!i.options.disabled){c.push([d.isFunction(i.options.items)?
i.options.items.call(i.element[0],a,{item:this.currentItem}):d(i.options.items,i.element),i]);this.containers.push(i)}}for(f=c.length-1;f>=0;f--){a=c[f][1];e=c[f][0];h=0;for(g=e.length;h<g;h++){i=d(e[h]);i.data("sortable-item",a);b.push({item:i,instance:a,width:0,height:0,left:0,top:0})}}},refreshPositions:function(a){if(this.offsetParent&&this.helper)this.offset.parent=this._getParentOffset();for(var b=this.items.length-1;b>=0;b--){var c=this.items[b],e=this.options.toleranceElement?d(this.options.toleranceElement,
c.item):c.item;if(!a){c.width=e.outerWidth();c.height=e.outerHeight()}e=e.offset();c.left=e.left;c.top=e.top}if(this.options.custom&&this.options.custom.refreshContainers)this.options.custom.refreshContainers.call(this);else for(b=this.containers.length-1;b>=0;b--){e=this.containers[b].element.offset();this.containers[b].containerCache.left=e.left;this.containers[b].containerCache.top=e.top;this.containers[b].containerCache.width=this.containers[b].element.outerWidth();this.containers[b].containerCache.height=
this.containers[b].element.outerHeight()}return this},_createPlaceholder:function(a){var b=a||this,c=b.options;if(!c.placeholder||c.placeholder.constructor==String){var e=c.placeholder;c.placeholder={element:function(){var f=d(document.createElement(b.currentItem[0].nodeName)).addClass(e||b.currentItem[0].className+" ui-sortable-placeholder").removeClass("ui-sortable-helper")[0];if(!e)f.style.visibility="hidden";return f},update:function(f,g){if(!(e&&!c.forcePlaceholderSize)){g.height()||g.height(b.currentItem.innerHeight()-
parseInt(b.currentItem.css("paddingTop")||0,10)-parseInt(b.currentItem.css("paddingBottom")||0,10));g.width()||g.width(b.currentItem.innerWidth()-parseInt(b.currentItem.css("paddingLeft")||0,10)-parseInt(b.currentItem.css("paddingRight")||0,10))}}}}b.placeholder=d(c.placeholder.element.call(b.element,b.currentItem));b.currentItem.after(b.placeholder);c.placeholder.update(b,b.placeholder)},_contactContainers:function(a){for(var b=null,c=null,e=this.containers.length-1;e>=0;e--)if(!d.ui.contains(this.currentItem[0],
this.containers[e].element[0]))if(this._intersectsWith(this.containers[e].containerCache)){if(!(b&&d.ui.contains(this.containers[e].element[0],b.element[0]))){b=this.containers[e];c=e}}else if(this.containers[e].containerCache.over){this.containers[e]._trigger("out",a,this._uiHash(this));this.containers[e].containerCache.over=0}if(b)if(this.containers.length===1){this.containers[c]._trigger("over",a,this._uiHash(this));this.containers[c].containerCache.over=1}else if(this.currentContainer!=this.containers[c]){b=
1E4;e=null;for(var f=this.positionAbs[this.containers[c].floating?"left":"top"],g=this.items.length-1;g>=0;g--)if(d.ui.contains(this.containers[c].element[0],this.items[g].item[0])){var h=this.items[g][this.containers[c].floating?"left":"top"];if(Math.abs(h-f)<b){b=Math.abs(h-f);e=this.items[g]}}if(e||this.options.dropOnEmpty){this.currentContainer=this.containers[c];e?this._rearrange(a,e,null,true):this._rearrange(a,null,this.containers[c].element,true);this._trigger("change",a,this._uiHash());this.containers[c]._trigger("change",
a,this._uiHash(this));this.options.placeholder.update(this.currentContainer,this.placeholder);this.containers[c]._trigger("over",a,this._uiHash(this));this.containers[c].containerCache.over=1}}},_createHelper:function(a){var b=this.options;a=d.isFunction(b.helper)?d(b.helper.apply(this.element[0],[a,this.currentItem])):b.helper=="clone"?this.currentItem.clone():this.currentItem;a.parents("body").length||d(b.appendTo!="parent"?b.appendTo:this.currentItem[0].parentNode)[0].appendChild(a[0]);if(a[0]==
this.currentItem[0])this._storedCSS={width:this.currentItem[0].style.width,height:this.currentItem[0].style.height,position:this.currentItem.css("position"),top:this.currentItem.css("top"),left:this.currentItem.css("left")};if(a[0].style.width==""||b.forceHelperSize)a.width(this.currentItem.width());if(a[0].style.height==""||b.forceHelperSize)a.height(this.currentItem.height());return a},_adjustOffsetFromHelper:function(a){if(typeof a=="string")a=a.split(" ");if(d.isArray(a))a={left:+a[0],top:+a[1]||
0};if("left"in a)this.offset.click.left=a.left+this.margins.left;if("right"in a)this.offset.click.left=this.helperProportions.width-a.right+this.margins.left;if("top"in a)this.offset.click.top=a.top+this.margins.top;if("bottom"in a)this.offset.click.top=this.helperProportions.height-a.bottom+this.margins.top},_getParentOffset:function(){this.offsetParent=this.helper.offsetParent();var a=this.offsetParent.offset();if(this.cssPosition=="absolute"&&this.scrollParent[0]!=document&&d.ui.contains(this.scrollParent[0],
this.offsetParent[0])){a.left+=this.scrollParent.scrollLeft();a.top+=this.scrollParent.scrollTop()}if(this.offsetParent[0]==document.body||this.offsetParent[0].tagName&&this.offsetParent[0].tagName.toLowerCase()=="html"&&d.browser.msie)a={top:0,left:0};return{top:a.top+(parseInt(this.offsetParent.css("borderTopWidth"),10)||0),left:a.left+(parseInt(this.offsetParent.css("borderLeftWidth"),10)||0)}},_getRelativeOffset:function(){if(this.cssPosition=="relative"){var a=this.currentItem.position();return{top:a.top-
(parseInt(this.helper.css("top"),10)||0)+this.scrollParent.scrollTop(),left:a.left-(parseInt(this.helper.css("left"),10)||0)+this.scrollParent.scrollLeft()}}else return{top:0,left:0}},_cacheMargins:function(){this.margins={left:parseInt(this.currentItem.css("marginLeft"),10)||0,top:parseInt(this.currentItem.css("marginTop"),10)||0}},_cacheHelperProportions:function(){this.helperProportions={width:this.helper.outerWidth(),height:this.helper.outerHeight()}},_setContainment:function(){var a=this.options;
if(a.containment=="parent")a.containment=this.helper[0].parentNode;if(a.containment=="document"||a.containment=="window")this.containment=[0-this.offset.relative.left-this.offset.parent.left,0-this.offset.relative.top-this.offset.parent.top,d(a.containment=="document"?document:window).width()-this.helperProportions.width-this.margins.left,(d(a.containment=="document"?document:window).height()||document.body.parentNode.scrollHeight)-this.helperProportions.height-this.margins.top];if(!/^(document|window|parent)$/.test(a.containment)){var b=
d(a.containment)[0];a=d(a.containment).offset();var c=d(b).css("overflow")!="hidden";this.containment=[a.left+(parseInt(d(b).css("borderLeftWidth"),10)||0)+(parseInt(d(b).css("paddingLeft"),10)||0)-this.margins.left,a.top+(parseInt(d(b).css("borderTopWidth"),10)||0)+(parseInt(d(b).css("paddingTop"),10)||0)-this.margins.top,a.left+(c?Math.max(b.scrollWidth,b.offsetWidth):b.offsetWidth)-(parseInt(d(b).css("borderLeftWidth"),10)||0)-(parseInt(d(b).css("paddingRight"),10)||0)-this.helperProportions.width-
this.margins.left,a.top+(c?Math.max(b.scrollHeight,b.offsetHeight):b.offsetHeight)-(parseInt(d(b).css("borderTopWidth"),10)||0)-(parseInt(d(b).css("paddingBottom"),10)||0)-this.helperProportions.height-this.margins.top]}},_convertPositionTo:function(a,b){if(!b)b=this.position;a=a=="absolute"?1:-1;var c=this.cssPosition=="absolute"&&!(this.scrollParent[0]!=document&&d.ui.contains(this.scrollParent[0],this.offsetParent[0]))?this.offsetParent:this.scrollParent,e=/(html|body)/i.test(c[0].tagName);return{top:b.top+
this.offset.relative.top*a+this.offset.parent.top*a-(d.browser.safari&&this.cssPosition=="fixed"?0:(this.cssPosition=="fixed"?-this.scrollParent.scrollTop():e?0:c.scrollTop())*a),left:b.left+this.offset.relative.left*a+this.offset.parent.left*a-(d.browser.safari&&this.cssPosition=="fixed"?0:(this.cssPosition=="fixed"?-this.scrollParent.scrollLeft():e?0:c.scrollLeft())*a)}},_generatePosition:function(a){var b=this.options,c=this.cssPosition=="absolute"&&!(this.scrollParent[0]!=document&&d.ui.contains(this.scrollParent[0],
this.offsetParent[0]))?this.offsetParent:this.scrollParent,e=/(html|body)/i.test(c[0].tagName);if(this.cssPosition=="relative"&&!(this.scrollParent[0]!=document&&this.scrollParent[0]!=this.offsetParent[0]))this.offset.relative=this._getRelativeOffset();var f=a.pageX,g=a.pageY;if(this.originalPosition){if(this.containment){if(a.pageX-this.offset.click.left<this.containment[0])f=this.containment[0]+this.offset.click.left;if(a.pageY-this.offset.click.top<this.containment[1])g=this.containment[1]+this.offset.click.top;
if(a.pageX-this.offset.click.left>this.containment[2])f=this.containment[2]+this.offset.click.left;if(a.pageY-this.offset.click.top>this.containment[3])g=this.containment[3]+this.offset.click.top}if(b.grid){g=this.originalPageY+Math.round((g-this.originalPageY)/b.grid[1])*b.grid[1];g=this.containment?!(g-this.offset.click.top<this.containment[1]||g-this.offset.click.top>this.containment[3])?g:!(g-this.offset.click.top<this.containment[1])?g-b.grid[1]:g+b.grid[1]:g;f=this.originalPageX+Math.round((f-
this.originalPageX)/b.grid[0])*b.grid[0];f=this.containment?!(f-this.offset.click.left<this.containment[0]||f-this.offset.click.left>this.containment[2])?f:!(f-this.offset.click.left<this.containment[0])?f-b.grid[0]:f+b.grid[0]:f}}return{top:g-this.offset.click.top-this.offset.relative.top-this.offset.parent.top+(d.browser.safari&&this.cssPosition=="fixed"?0:this.cssPosition=="fixed"?-this.scrollParent.scrollTop():e?0:c.scrollTop()),left:f-this.offset.click.left-this.offset.relative.left-this.offset.parent.left+
(d.browser.safari&&this.cssPosition=="fixed"?0:this.cssPosition=="fixed"?-this.scrollParent.scrollLeft():e?0:c.scrollLeft())}},_rearrange:function(a,b,c,e){c?c[0].appendChild(this.placeholder[0]):b.item[0].parentNode.insertBefore(this.placeholder[0],this.direction=="down"?b.item[0]:b.item[0].nextSibling);this.counter=this.counter?++this.counter:1;var f=this,g=this.counter;window.setTimeout(function(){g==f.counter&&f.refreshPositions(!e)},0)},_clear:function(a,b){this.reverting=false;var c=[];!this._noFinalSort&&
this.currentItem[0].parentNode&&this.placeholder.before(this.currentItem);this._noFinalSort=null;if(this.helper[0]==this.currentItem[0]){for(var e in this._storedCSS)if(this._storedCSS[e]=="auto"||this._storedCSS[e]=="static")this._storedCSS[e]="";this.currentItem.css(this._storedCSS).removeClass("ui-sortable-helper")}else this.currentItem.show();this.fromOutside&&!b&&c.push(function(f){this._trigger("receive",f,this._uiHash(this.fromOutside))});if((this.fromOutside||this.domPosition.prev!=this.currentItem.prev().not(".ui-sortable-helper")[0]||
this.domPosition.parent!=this.currentItem.parent()[0])&&!b)c.push(function(f){this._trigger("update",f,this._uiHash())});if(!d.ui.contains(this.element[0],this.currentItem[0])){b||c.push(function(f){this._trigger("remove",f,this._uiHash())});for(e=this.containers.length-1;e>=0;e--)if(d.ui.contains(this.containers[e].element[0],this.currentItem[0])&&!b){c.push(function(f){return function(g){f._trigger("receive",g,this._uiHash(this))}}.call(this,this.containers[e]));c.push(function(f){return function(g){f._trigger("update",
g,this._uiHash(this))}}.call(this,this.containers[e]))}}for(e=this.containers.length-1;e>=0;e--){b||c.push(function(f){return function(g){f._trigger("deactivate",g,this._uiHash(this))}}.call(this,this.containers[e]));if(this.containers[e].containerCache.over){c.push(function(f){return function(g){f._trigger("out",g,this._uiHash(this))}}.call(this,this.containers[e]));this.containers[e].containerCache.over=0}}this._storedCursor&&d("body").css("cursor",this._storedCursor);this._storedOpacity&&this.helper.css("opacity",
this._storedOpacity);if(this._storedZIndex)this.helper.css("zIndex",this._storedZIndex=="auto"?"":this._storedZIndex);this.dragging=false;if(this.cancelHelperRemoval){if(!b){this._trigger("beforeStop",a,this._uiHash());for(e=0;e<c.length;e++)c[e].call(this,a);this._trigger("stop",a,this._uiHash())}return false}b||this._trigger("beforeStop",a,this._uiHash());this.placeholder[0].parentNode.removeChild(this.placeholder[0]);this.helper[0]!=this.currentItem[0]&&this.helper.remove();this.helper=null;if(!b){for(e=
0;e<c.length;e++)c[e].call(this,a);this._trigger("stop",a,this._uiHash())}this.fromOutside=false;return true},_trigger:function(){d.Widget.prototype._trigger.apply(this,arguments)===false&&this.cancel()},_uiHash:function(a){var b=a||this;return{helper:b.helper,placeholder:b.placeholder||d([]),position:b.position,originalPosition:b.originalPosition,offset:b.positionAbs,item:b.currentItem,sender:a?a.element:null}}});d.extend(d.ui.sortable,{version:"1.8.2"})})(jQuery);
/*
 * jQuery UI Accordion 1.8.2
 *
 * Copyright (c) 2010 AUTHORS.txt (http://jqueryui.com/about)
 * Dual licensed under the MIT (MIT-LICENSE.txt)
 * and GPL (GPL-LICENSE.txt) licenses.
 *
 * http://docs.jquery.com/UI/Accordion
 *
 * Depends:
 *	jquery.ui.core.js
 *	jquery.ui.widget.js
 */
(function(c){c.widget("ui.accordion",{options:{active:0,animated:"slide",autoHeight:true,clearStyle:false,collapsible:false,event:"click",fillSpace:false,header:"> li > :first-child,> :not(li):even",icons:{header:"ui-icon-triangle-1-e",headerSelected:"ui-icon-triangle-1-s"},navigation:false,navigationFilter:function(){return this.href.toLowerCase()==location.href.toLowerCase()}},_create:function(){var a=this.options,b=this;this.running=0;this.element.addClass("ui-accordion ui-widget ui-helper-reset");
this.element.children("li").addClass("ui-accordion-li-fix");this.headers=this.element.find(a.header).addClass("ui-accordion-header ui-helper-reset ui-state-default ui-corner-all").bind("mouseenter.accordion",function(){c(this).addClass("ui-state-hover")}).bind("mouseleave.accordion",function(){c(this).removeClass("ui-state-hover")}).bind("focus.accordion",function(){c(this).addClass("ui-state-focus")}).bind("blur.accordion",function(){c(this).removeClass("ui-state-focus")});this.headers.next().addClass("ui-accordion-content ui-helper-reset ui-widget-content ui-corner-bottom");
if(a.navigation){var d=this.element.find("a").filter(a.navigationFilter);if(d.length){var f=d.closest(".ui-accordion-header");this.active=f.length?f:d.closest(".ui-accordion-content").prev()}}this.active=this._findActive(this.active||a.active).toggleClass("ui-state-default").toggleClass("ui-state-active").toggleClass("ui-corner-all").toggleClass("ui-corner-top");this.active.next().addClass("ui-accordion-content-active");this._createIcons();this.resize();this.element.attr("role","tablist");this.headers.attr("role",
"tab").bind("keydown",function(g){return b._keydown(g)}).next().attr("role","tabpanel");this.headers.not(this.active||"").attr("aria-expanded","false").attr("tabIndex","-1").next().hide();this.active.length?this.active.attr("aria-expanded","true").attr("tabIndex","0"):this.headers.eq(0).attr("tabIndex","0");c.browser.safari||this.headers.find("a").attr("tabIndex","-1");a.event&&this.headers.bind(a.event+".accordion",function(g){b._clickHandler.call(b,g,this);g.preventDefault()})},_createIcons:function(){var a=
this.options;if(a.icons){c("<span/>").addClass("ui-icon "+a.icons.header).prependTo(this.headers);this.active.find(".ui-icon").toggleClass(a.icons.header).toggleClass(a.icons.headerSelected);this.element.addClass("ui-accordion-icons")}},_destroyIcons:function(){this.headers.children(".ui-icon").remove();this.element.removeClass("ui-accordion-icons")},destroy:function(){var a=this.options;this.element.removeClass("ui-accordion ui-widget ui-helper-reset").removeAttr("role").unbind(".accordion").removeData("accordion");
this.headers.unbind(".accordion").removeClass("ui-accordion-header ui-helper-reset ui-state-default ui-corner-all ui-state-active ui-corner-top").removeAttr("role").removeAttr("aria-expanded").removeAttr("tabIndex");this.headers.find("a").removeAttr("tabIndex");this._destroyIcons();var b=this.headers.next().css("display","").removeAttr("role").removeClass("ui-helper-reset ui-widget-content ui-corner-bottom ui-accordion-content ui-accordion-content-active");if(a.autoHeight||a.fillHeight)b.css("height",
"");return this},_setOption:function(a,b){c.Widget.prototype._setOption.apply(this,arguments);a=="active"&&this.activate(b);if(a=="icons"){this._destroyIcons();b&&this._createIcons()}},_keydown:function(a){var b=c.ui.keyCode;if(!(this.options.disabled||a.altKey||a.ctrlKey)){var d=this.headers.length,f=this.headers.index(a.target),g=false;switch(a.keyCode){case b.RIGHT:case b.DOWN:g=this.headers[(f+1)%d];break;case b.LEFT:case b.UP:g=this.headers[(f-1+d)%d];break;case b.SPACE:case b.ENTER:this._clickHandler({target:a.target},
a.target);a.preventDefault()}if(g){c(a.target).attr("tabIndex","-1");c(g).attr("tabIndex","0");g.focus();return false}return true}},resize:function(){var a=this.options,b;if(a.fillSpace){if(c.browser.msie){var d=this.element.parent().css("overflow");this.element.parent().css("overflow","hidden")}b=this.element.parent().height();c.browser.msie&&this.element.parent().css("overflow",d);this.headers.each(function(){b-=c(this).outerHeight(true)});this.headers.next().each(function(){c(this).height(Math.max(0,
b-c(this).innerHeight()+c(this).height()))}).css("overflow","auto")}else if(a.autoHeight){b=0;this.headers.next().each(function(){b=Math.max(b,c(this).height())}).height(b)}return this},activate:function(a){this.options.active=a;a=this._findActive(a)[0];this._clickHandler({target:a},a);return this},_findActive:function(a){return a?typeof a=="number"?this.headers.filter(":eq("+a+")"):this.headers.not(this.headers.not(a)):a===false?c([]):this.headers.filter(":eq(0)")},_clickHandler:function(a,b){var d=
this.options;if(!d.disabled)if(a.target){a=c(a.currentTarget||b);b=a[0]==this.active[0];d.active=d.collapsible&&b?false:c(".ui-accordion-header",this.element).index(a);if(!(this.running||!d.collapsible&&b)){this.active.removeClass("ui-state-active ui-corner-top").addClass("ui-state-default ui-corner-all").find(".ui-icon").removeClass(d.icons.headerSelected).addClass(d.icons.header);if(!b){a.removeClass("ui-state-default ui-corner-all").addClass("ui-state-active ui-corner-top").find(".ui-icon").removeClass(d.icons.header).addClass(d.icons.headerSelected);
a.next().addClass("ui-accordion-content-active")}e=a.next();f=this.active.next();g={options:d,newHeader:b&&d.collapsible?c([]):a,oldHeader:this.active,newContent:b&&d.collapsible?c([]):e,oldContent:f};d=this.headers.index(this.active[0])>this.headers.index(a[0]);this.active=b?c([]):a;this._toggle(e,f,g,b,d)}}else if(d.collapsible){this.active.removeClass("ui-state-active ui-corner-top").addClass("ui-state-default ui-corner-all").find(".ui-icon").removeClass(d.icons.headerSelected).addClass(d.icons.header);
this.active.next().addClass("ui-accordion-content-active");var f=this.active.next(),g={options:d,newHeader:c([]),oldHeader:d.active,newContent:c([]),oldContent:f},e=this.active=c([]);this._toggle(e,f,g)}},_toggle:function(a,b,d,f,g){var e=this.options,k=this;this.toShow=a;this.toHide=b;this.data=d;var i=function(){if(k)return k._completed.apply(k,arguments)};this._trigger("changestart",null,this.data);this.running=b.size()===0?a.size():b.size();if(e.animated){d={};d=e.collapsible&&f?{toShow:c([]),
toHide:b,complete:i,down:g,autoHeight:e.autoHeight||e.fillSpace}:{toShow:a,toHide:b,complete:i,down:g,autoHeight:e.autoHeight||e.fillSpace};if(!e.proxied)e.proxied=e.animated;if(!e.proxiedDuration)e.proxiedDuration=e.duration;e.animated=c.isFunction(e.proxied)?e.proxied(d):e.proxied;e.duration=c.isFunction(e.proxiedDuration)?e.proxiedDuration(d):e.proxiedDuration;f=c.ui.accordion.animations;var h=e.duration,j=e.animated;if(j&&!f[j]&&!c.easing[j])j="slide";f[j]||(f[j]=function(l){this.slide(l,{easing:j,
duration:h||700})});f[j](d)}else{if(e.collapsible&&f)a.toggle();else{b.hide();a.show()}i(true)}b.prev().attr("aria-expanded","false").attr("tabIndex","-1").blur();a.prev().attr("aria-expanded","true").attr("tabIndex","0").focus()},_completed:function(a){var b=this.options;this.running=a?0:--this.running;if(!this.running){b.clearStyle&&this.toShow.add(this.toHide).css({height:"",overflow:""});this.toHide.removeClass("ui-accordion-content-active");this._trigger("change",null,this.data)}}});c.extend(c.ui.accordion,
{version:"1.8.2",animations:{slide:function(a,b){a=c.extend({easing:"swing",duration:300},a,b);if(a.toHide.size())if(a.toShow.size()){var d=a.toShow.css("overflow"),f=0,g={},e={},k;b=a.toShow;k=b[0].style.width;b.width(parseInt(b.parent().width(),10)-parseInt(b.css("paddingLeft"),10)-parseInt(b.css("paddingRight"),10)-(parseInt(b.css("borderLeftWidth"),10)||0)-(parseInt(b.css("borderRightWidth"),10)||0));c.each(["height","paddingTop","paddingBottom"],function(i,h){e[h]="hide";i=(""+c.css(a.toShow[0],
h)).match(/^([\d+-.]+)(.*)$/);g[h]={value:i[1],unit:i[2]||"px"}});a.toShow.css({height:0,overflow:"hidden"}).show();a.toHide.filter(":hidden").each(a.complete).end().filter(":visible").animate(e,{step:function(i,h){if(h.prop=="height")f=h.end-h.start===0?0:(h.now-h.start)/(h.end-h.start);a.toShow[0].style[h.prop]=f*g[h.prop].value+g[h.prop].unit},duration:a.duration,easing:a.easing,complete:function(){a.autoHeight||a.toShow.css("height","");a.toShow.css("width",k);a.toShow.css({overflow:d});a.complete()}})}else a.toHide.animate({height:"hide"},
a);else a.toShow.animate({height:"show"},a)},bounceslide:function(a){this.slide(a,{easing:a.down?"easeOutBounce":"swing",duration:a.down?1E3:200})}}})})(jQuery);
/*
 * jQuery UI Autocomplete 1.8.2
 *
 * Copyright (c) 2010 AUTHORS.txt (http://jqueryui.com/about)
 * Dual licensed under the MIT (MIT-LICENSE.txt)
 * and GPL (GPL-LICENSE.txt) licenses.
 *
 * http://docs.jquery.com/UI/Autocomplete
 *
 * Depends:
 *	jquery.ui.core.js
 *	jquery.ui.widget.js
 *	jquery.ui.position.js
 */
(function(e){e.widget("ui.autocomplete",{options:{minLength:1,delay:300},_create:function(){var a=this,c=this.element[0].ownerDocument;this.element.addClass("ui-autocomplete-input").attr("autocomplete","off").attr({role:"textbox","aria-autocomplete":"list","aria-haspopup":"true"}).bind("keydown.autocomplete",function(d){var b=e.ui.keyCode;switch(d.keyCode){case b.PAGE_UP:a._move("previousPage",d);break;case b.PAGE_DOWN:a._move("nextPage",d);break;case b.UP:a._move("previous",d);d.preventDefault();
break;case b.DOWN:a._move("next",d);d.preventDefault();break;case b.ENTER:case b.NUMPAD_ENTER:a.menu.active&&d.preventDefault();case b.TAB:if(!a.menu.active)return;a.menu.select(d);break;case b.ESCAPE:a.element.val(a.term);a.close(d);break;case b.LEFT:case b.RIGHT:case b.SHIFT:case b.CONTROL:case b.ALT:case b.COMMAND:case b.COMMAND_RIGHT:case b.INSERT:case b.CAPS_LOCK:case b.END:case b.HOME:break;default:clearTimeout(a.searching);a.searching=setTimeout(function(){a.search(null,d)},a.options.delay);
break}}).bind("focus.autocomplete",function(){a.selectedItem=null;a.previous=a.element.val()}).bind("blur.autocomplete",function(d){clearTimeout(a.searching);a.closing=setTimeout(function(){a.close(d);a._change(d)},150)});this._initSource();this.response=function(){return a._response.apply(a,arguments)};this.menu=e("<ul></ul>").addClass("ui-autocomplete").appendTo("body",c).mousedown(function(){setTimeout(function(){clearTimeout(a.closing)},13)}).menu({focus:function(d,b){b=b.item.data("item.autocomplete");
false!==a._trigger("focus",null,{item:b})&&/^key/.test(d.originalEvent.type)&&a.element.val(b.value)},selected:function(d,b){b=b.item.data("item.autocomplete");false!==a._trigger("select",d,{item:b})&&a.element.val(b.value);a.close(d);d=a.previous;if(a.element[0]!==c.activeElement){a.element.focus();a.previous=d}a.selectedItem=b},blur:function(){a.menu.element.is(":visible")&&a.element.val(a.term)}}).zIndex(this.element.zIndex()+1).css({top:0,left:0}).hide().data("menu");e.fn.bgiframe&&this.menu.element.bgiframe()},
destroy:function(){this.element.removeClass("ui-autocomplete-input").removeAttr("autocomplete").removeAttr("role").removeAttr("aria-autocomplete").removeAttr("aria-haspopup");this.menu.element.remove();e.Widget.prototype.destroy.call(this)},_setOption:function(a){e.Widget.prototype._setOption.apply(this,arguments);a==="source"&&this._initSource()},_initSource:function(){var a,c;if(e.isArray(this.options.source)){a=this.options.source;this.source=function(d,b){b(e.ui.autocomplete.filter(a,d.term))}}else if(typeof this.options.source===
"string"){c=this.options.source;this.source=function(d,b){e.getJSON(c,d,b)}}else this.source=this.options.source},search:function(a,c){a=a!=null?a:this.element.val();if(a.length<this.options.minLength)return this.close(c);clearTimeout(this.closing);if(this._trigger("search")!==false)return this._search(a)},_search:function(a){this.term=this.element.addClass("ui-autocomplete-loading").val();this.source({term:a},this.response)},_response:function(a){if(a.length){a=this._normalize(a);this._suggest(a);
this._trigger("open")}else this.close();this.element.removeClass("ui-autocomplete-loading")},close:function(a){clearTimeout(this.closing);if(this.menu.element.is(":visible")){this._trigger("close",a);this.menu.element.hide();this.menu.deactivate()}},_change:function(a){this.previous!==this.element.val()&&this._trigger("change",a,{item:this.selectedItem})},_normalize:function(a){if(a.length&&a[0].label&&a[0].value)return a;return e.map(a,function(c){if(typeof c==="string")return{label:c,value:c};return e.extend({label:c.label||
c.value,value:c.value||c.label},c)})},_suggest:function(a){var c=this.menu.element.empty().zIndex(this.element.zIndex()+1),d;this._renderMenu(c,a);this.menu.deactivate();this.menu.refresh();this.menu.element.show().position({my:"left top",at:"left bottom",of:this.element,collision:"none"});a=c.width("").width();d=this.element.width();c.width(Math.max(a,d))},_renderMenu:function(a,c){var d=this;e.each(c,function(b,f){d._renderItem(a,f)})},_renderItem:function(a,c){return e("<li></li>").data("item.autocomplete",
c).append("<a>"+c.label+"</a>").appendTo(a)},_move:function(a,c){if(this.menu.element.is(":visible"))if(this.menu.first()&&/^previous/.test(a)||this.menu.last()&&/^next/.test(a)){this.element.val(this.term);this.menu.deactivate()}else this.menu[a](c);else this.search(null,c)},widget:function(){return this.menu.element}});e.extend(e.ui.autocomplete,{escapeRegex:function(a){return a.replace(/([\^\$\(\)\[\]\{\}\*\.\+\?\|\\])/gi,"\\$1")},filter:function(a,c){var d=new RegExp(e.ui.autocomplete.escapeRegex(c),
"i");return e.grep(a,function(b){return d.test(b.label||b.value||b)})}})})(jQuery);
(function(e){e.widget("ui.menu",{_create:function(){var a=this;this.element.addClass("ui-menu ui-widget ui-widget-content ui-corner-all").attr({role:"listbox","aria-activedescendant":"ui-active-menuitem"}).click(function(c){if(e(c.target).closest(".ui-menu-item a").length){c.preventDefault();a.select(c)}});this.refresh()},refresh:function(){var a=this;this.element.children("li:not(.ui-menu-item):has(a)").addClass("ui-menu-item").attr("role","menuitem").children("a").addClass("ui-corner-all").attr("tabindex",
-1).mouseenter(function(c){a.activate(c,e(this).parent())}).mouseleave(function(){a.deactivate()})},activate:function(a,c){this.deactivate();if(this.hasScroll()){var d=c.offset().top-this.element.offset().top,b=this.element.attr("scrollTop"),f=this.element.height();if(d<0)this.element.attr("scrollTop",b+d);else d>f&&this.element.attr("scrollTop",b+d-f+c.height())}this.active=c.eq(0).children("a").addClass("ui-state-hover").attr("id","ui-active-menuitem").end();this._trigger("focus",a,{item:c})},deactivate:function(){if(this.active){this.active.children("a").removeClass("ui-state-hover").removeAttr("id");
this._trigger("blur");this.active=null}},next:function(a){this.move("next",".ui-menu-item:first",a)},previous:function(a){this.move("prev",".ui-menu-item:last",a)},first:function(){return this.active&&!this.active.prev().length},last:function(){return this.active&&!this.active.next().length},move:function(a,c,d){if(this.active){a=this.active[a+"All"](".ui-menu-item").eq(0);a.length?this.activate(d,a):this.activate(d,this.element.children(c))}else this.activate(d,this.element.children(c))},nextPage:function(a){if(this.hasScroll())if(!this.active||
this.last())this.activate(a,this.element.children(":first"));else{var c=this.active.offset().top,d=this.element.height(),b=this.element.children("li").filter(function(){var f=e(this).offset().top-c-d+e(this).height();return f<10&&f>-10});b.length||(b=this.element.children(":last"));this.activate(a,b)}else this.activate(a,this.element.children(!this.active||this.last()?":first":":last"))},previousPage:function(a){if(this.hasScroll())if(!this.active||this.first())this.activate(a,this.element.children(":last"));
else{var c=this.active.offset().top,d=this.element.height();result=this.element.children("li").filter(function(){var b=e(this).offset().top-c+d-e(this).height();return b<10&&b>-10});result.length||(result=this.element.children(":first"));this.activate(a,result)}else this.activate(a,this.element.children(!this.active||this.first()?":last":":first"))},hasScroll:function(){return this.element.height()<this.element.attr("scrollHeight")},select:function(a){this._trigger("selected",a,{item:this.active})}})})(jQuery);
/*
 * jQuery UI Button 1.8.2
 *
 * Copyright (c) 2010 AUTHORS.txt (http://jqueryui.com/about)
 * Dual licensed under the MIT (MIT-LICENSE.txt)
 * and GPL (GPL-LICENSE.txt) licenses.
 *
 * http://docs.jquery.com/UI/Button
 *
 * Depends:
 *	jquery.ui.core.js
 *	jquery.ui.widget.js
 */
(function(a){var g,i=function(b){a(":ui-button",b.target.form).each(function(){var c=a(this).data("button");setTimeout(function(){c.refresh()},1)})},h=function(b){var c=b.name,d=b.form,e=a([]);if(c)e=d?a(d).find("[name='"+c+"']"):a("[name='"+c+"']",b.ownerDocument).filter(function(){return!this.form});return e};a.widget("ui.button",{options:{text:true,label:null,icons:{primary:null,secondary:null}},_create:function(){this.element.closest("form").unbind("reset.button").bind("reset.button",i);this._determineButtonType();
this.hasTitle=!!this.buttonElement.attr("title");var b=this,c=this.options,d=this.type==="checkbox"||this.type==="radio",e="ui-state-hover"+(!d?" ui-state-active":"");if(c.label===null)c.label=this.buttonElement.html();if(this.element.is(":disabled"))c.disabled=true;this.buttonElement.addClass("ui-button ui-widget ui-state-default ui-corner-all").attr("role","button").bind("mouseenter.button",function(){if(!c.disabled){a(this).addClass("ui-state-hover");this===g&&a(this).addClass("ui-state-active")}}).bind("mouseleave.button",
function(){c.disabled||a(this).removeClass(e)}).bind("focus.button",function(){a(this).addClass("ui-state-focus")}).bind("blur.button",function(){a(this).removeClass("ui-state-focus")});d&&this.element.bind("change.button",function(){b.refresh()});if(this.type==="checkbox")this.buttonElement.bind("click.button",function(){if(c.disabled)return false;a(this).toggleClass("ui-state-active");b.buttonElement.attr("aria-pressed",b.element[0].checked)});else if(this.type==="radio")this.buttonElement.bind("click.button",
function(){if(c.disabled)return false;a(this).addClass("ui-state-active");b.buttonElement.attr("aria-pressed",true);var f=b.element[0];h(f).not(f).map(function(){return a(this).button("widget")[0]}).removeClass("ui-state-active").attr("aria-pressed",false)});else{this.buttonElement.bind("mousedown.button",function(){if(c.disabled)return false;a(this).addClass("ui-state-active");g=this;a(document).one("mouseup",function(){g=null})}).bind("mouseup.button",function(){if(c.disabled)return false;a(this).removeClass("ui-state-active")}).bind("keydown.button",
function(f){if(c.disabled)return false;if(f.keyCode==a.ui.keyCode.SPACE||f.keyCode==a.ui.keyCode.ENTER)a(this).addClass("ui-state-active")}).bind("keyup.button",function(){a(this).removeClass("ui-state-active")});this.buttonElement.is("a")&&this.buttonElement.keyup(function(f){f.keyCode===a.ui.keyCode.SPACE&&a(this).click()})}this._setOption("disabled",c.disabled)},_determineButtonType:function(){this.type=this.element.is(":checkbox")?"checkbox":this.element.is(":radio")?"radio":this.element.is("input")?
"input":"button";if(this.type==="checkbox"||this.type==="radio"){this.buttonElement=this.element.parents().last().find("[for="+this.element.attr("id")+"]");this.element.addClass("ui-helper-hidden-accessible");var b=this.element.is(":checked");b&&this.buttonElement.addClass("ui-state-active");this.buttonElement.attr("aria-pressed",b)}else this.buttonElement=this.element},widget:function(){return this.buttonElement},destroy:function(){this.element.removeClass("ui-helper-hidden-accessible");this.buttonElement.removeClass("ui-button ui-widget ui-state-default ui-corner-all ui-state-hover ui-state-active  ui-button-icons-only ui-button-icon-only ui-button-text-icons ui-button-text-icon ui-button-text-only").removeAttr("role").removeAttr("aria-pressed").html(this.buttonElement.find(".ui-button-text").html());
this.hasTitle||this.buttonElement.removeAttr("title");a.Widget.prototype.destroy.call(this)},_setOption:function(b,c){a.Widget.prototype._setOption.apply(this,arguments);if(b==="disabled")c?this.element.attr("disabled",true):this.element.removeAttr("disabled");this._resetButton()},refresh:function(){var b=this.element.is(":disabled");b!==this.options.disabled&&this._setOption("disabled",b);if(this.type==="radio")h(this.element[0]).each(function(){a(this).is(":checked")?a(this).button("widget").addClass("ui-state-active").attr("aria-pressed",
true):a(this).button("widget").removeClass("ui-state-active").attr("aria-pressed",false)});else if(this.type==="checkbox")this.element.is(":checked")?this.buttonElement.addClass("ui-state-active").attr("aria-pressed",true):this.buttonElement.removeClass("ui-state-active").attr("aria-pressed",false)},_resetButton:function(){if(this.type==="input")this.options.label&&this.element.val(this.options.label);else{var b=this.buttonElement.removeClass("ui-button-icons-only ui-button-icon-only ui-button-text-icons ui-button-text-icon ui-button-text-only"),
c=a("<span></span>").addClass("ui-button-text").html(this.options.label).appendTo(b.empty()).text(),d=this.options.icons,e=d.primary&&d.secondary;if(d.primary||d.secondary){b.addClass("ui-button-text-icon"+(e?"s":""));d.primary&&b.prepend("<span class='ui-button-icon-primary ui-icon "+d.primary+"'></span>");d.secondary&&b.append("<span class='ui-button-icon-secondary ui-icon "+d.secondary+"'></span>");if(!this.options.text){b.addClass(e?"ui-button-icons-only":"ui-button-icon-only").removeClass("ui-button-text-icons ui-button-text-icon");
this.hasTitle||b.attr("title",c)}}else b.addClass("ui-button-text-only")}}});a.widget("ui.buttonset",{_create:function(){this.element.addClass("ui-buttonset");this._init()},_init:function(){this.refresh()},_setOption:function(b,c){b==="disabled"&&this.buttons.button("option",b,c);a.Widget.prototype._setOption.apply(this,arguments)},refresh:function(){this.buttons=this.element.find(":button, :submit, :reset, :checkbox, :radio, a, :data(button)").filter(":ui-button").button("refresh").end().not(":ui-button").button().end().map(function(){return a(this).button("widget")[0]}).removeClass("ui-corner-all ui-corner-left ui-corner-right").filter(":first").addClass("ui-corner-left").end().filter(":last").addClass("ui-corner-right").end().end()},
destroy:function(){this.element.removeClass("ui-buttonset");this.buttons.map(function(){return a(this).button("widget")[0]}).removeClass("ui-corner-left ui-corner-right").end().button("destroy");a.Widget.prototype.destroy.call(this)}})})(jQuery);
/*
 * jQuery UI Dialog 1.8.2
 *
 * Copyright (c) 2010 AUTHORS.txt (http://jqueryui.com/about)
 * Dual licensed under the MIT (MIT-LICENSE.txt)
 * and GPL (GPL-LICENSE.txt) licenses.
 *
 * http://docs.jquery.com/UI/Dialog
 *
 * Depends:
 *	jquery.ui.core.js
 *	jquery.ui.widget.js
 *  jquery.ui.button.js
 *	jquery.ui.draggable.js
 *	jquery.ui.mouse.js
 *	jquery.ui.position.js
 *	jquery.ui.resizable.js
 */
(function(c){c.widget("ui.dialog",{options:{autoOpen:true,buttons:{},closeOnEscape:true,closeText:"close",dialogClass:"",draggable:true,hide:null,height:"auto",maxHeight:false,maxWidth:false,minHeight:150,minWidth:150,modal:false,position:"center",resizable:true,show:null,stack:true,title:"",width:300,zIndex:1E3},_create:function(){this.originalTitle=this.element.attr("title");var a=this,b=a.options,d=b.title||a.originalTitle||"&#160;",e=c.ui.dialog.getTitleId(a.element),g=(a.uiDialog=c("<div></div>")).appendTo(document.body).hide().addClass("ui-dialog ui-widget ui-widget-content ui-corner-all "+
b.dialogClass).css({zIndex:b.zIndex}).attr("tabIndex",-1).css("outline",0).keydown(function(i){if(b.closeOnEscape&&i.keyCode&&i.keyCode===c.ui.keyCode.ESCAPE){a.close(i);i.preventDefault()}}).attr({role:"dialog","aria-labelledby":e}).mousedown(function(i){a.moveToTop(false,i)});a.element.show().removeAttr("title").addClass("ui-dialog-content ui-widget-content").appendTo(g);var f=(a.uiDialogTitlebar=c("<div></div>")).addClass("ui-dialog-titlebar ui-widget-header ui-corner-all ui-helper-clearfix").prependTo(g),
h=c('<a href="#"></a>').addClass("ui-dialog-titlebar-close ui-corner-all").attr("role","button").hover(function(){h.addClass("ui-state-hover")},function(){h.removeClass("ui-state-hover")}).focus(function(){h.addClass("ui-state-focus")}).blur(function(){h.removeClass("ui-state-focus")}).click(function(i){a.close(i);return false}).appendTo(f);(a.uiDialogTitlebarCloseText=c("<span></span>")).addClass("ui-icon ui-icon-closethick").text(b.closeText).appendTo(h);c("<span></span>").addClass("ui-dialog-title").attr("id",
e).html(d).prependTo(f);if(c.isFunction(b.beforeclose)&&!c.isFunction(b.beforeClose))b.beforeClose=b.beforeclose;f.find("*").add(f).disableSelection();b.draggable&&c.fn.draggable&&a._makeDraggable();b.resizable&&c.fn.resizable&&a._makeResizable();a._createButtons(b.buttons);a._isOpen=false;c.fn.bgiframe&&g.bgiframe()},_init:function(){this.options.autoOpen&&this.open()},destroy:function(){var a=this;a.overlay&&a.overlay.destroy();a.uiDialog.hide();a.element.unbind(".dialog").removeData("dialog").removeClass("ui-dialog-content ui-widget-content").hide().appendTo("body");
a.uiDialog.remove();a.originalTitle&&a.element.attr("title",a.originalTitle);return a},widget:function(){return this.uiDialog},close:function(a){var b=this,d;if(false!==b._trigger("beforeClose",a)){b.overlay&&b.overlay.destroy();b.uiDialog.unbind("keypress.ui-dialog");b._isOpen=false;if(b.options.hide)b.uiDialog.hide(b.options.hide,function(){b._trigger("close",a)});else{b.uiDialog.hide();b._trigger("close",a)}c.ui.dialog.overlay.resize();if(b.options.modal){d=0;c(".ui-dialog").each(function(){if(this!==
b.uiDialog[0])d=Math.max(d,c(this).css("z-index"))});c.ui.dialog.maxZ=d}return b}},isOpen:function(){return this._isOpen},moveToTop:function(a,b){var d=this,e=d.options;if(e.modal&&!a||!e.stack&&!e.modal)return d._trigger("focus",b);if(e.zIndex>c.ui.dialog.maxZ)c.ui.dialog.maxZ=e.zIndex;if(d.overlay){c.ui.dialog.maxZ+=1;d.overlay.$el.css("z-index",c.ui.dialog.overlay.maxZ=c.ui.dialog.maxZ)}a={scrollTop:d.element.attr("scrollTop"),scrollLeft:d.element.attr("scrollLeft")};c.ui.dialog.maxZ+=1;d.uiDialog.css("z-index",
c.ui.dialog.maxZ);d.element.attr(a);d._trigger("focus",b);return d},open:function(){if(!this._isOpen){var a=this,b=a.options,d=a.uiDialog;a.overlay=b.modal?new c.ui.dialog.overlay(a):null;d.next().length&&d.appendTo("body");a._size();a._position(b.position);d.show(b.show);a.moveToTop(true);b.modal&&d.bind("keypress.ui-dialog",function(e){if(e.keyCode===c.ui.keyCode.TAB){var g=c(":tabbable",this),f=g.filter(":first");g=g.filter(":last");if(e.target===g[0]&&!e.shiftKey){f.focus(1);return false}else if(e.target===
f[0]&&e.shiftKey){g.focus(1);return false}}});c([]).add(d.find(".ui-dialog-content :tabbable:first")).add(d.find(".ui-dialog-buttonpane :tabbable:first")).add(d).filter(":first").focus();a._trigger("open");a._isOpen=true;return a}},_createButtons:function(a){var b=this,d=false,e=c("<div></div>").addClass("ui-dialog-buttonpane ui-widget-content ui-helper-clearfix");b.uiDialog.find(".ui-dialog-buttonpane").remove();typeof a==="object"&&a!==null&&c.each(a,function(){return!(d=true)});if(d){c.each(a,
function(g,f){g=c('<button type="button"></button>').text(g).click(function(){f.apply(b.element[0],arguments)}).appendTo(e);c.fn.button&&g.button()});e.appendTo(b.uiDialog)}},_makeDraggable:function(){function a(f){return{position:f.position,offset:f.offset}}var b=this,d=b.options,e=c(document),g;b.uiDialog.draggable({cancel:".ui-dialog-content, .ui-dialog-titlebar-close",handle:".ui-dialog-titlebar",containment:"document",start:function(f,h){g=d.height==="auto"?"auto":c(this).height();c(this).height(c(this).height()).addClass("ui-dialog-dragging");
b._trigger("dragStart",f,a(h))},drag:function(f,h){b._trigger("drag",f,a(h))},stop:function(f,h){d.position=[h.position.left-e.scrollLeft(),h.position.top-e.scrollTop()];c(this).removeClass("ui-dialog-dragging").height(g);b._trigger("dragStop",f,a(h));c.ui.dialog.overlay.resize()}})},_makeResizable:function(a){function b(f){return{originalPosition:f.originalPosition,originalSize:f.originalSize,position:f.position,size:f.size}}a=a===undefined?this.options.resizable:a;var d=this,e=d.options,g=d.uiDialog.css("position");
a=typeof a==="string"?a:"n,e,s,w,se,sw,ne,nw";d.uiDialog.resizable({cancel:".ui-dialog-content",containment:"document",alsoResize:d.element,maxWidth:e.maxWidth,maxHeight:e.maxHeight,minWidth:e.minWidth,minHeight:d._minHeight(),handles:a,start:function(f,h){c(this).addClass("ui-dialog-resizing");d._trigger("resizeStart",f,b(h))},resize:function(f,h){d._trigger("resize",f,b(h))},stop:function(f,h){c(this).removeClass("ui-dialog-resizing");e.height=c(this).height();e.width=c(this).width();d._trigger("resizeStop",
f,b(h));c.ui.dialog.overlay.resize()}}).css("position",g).find(".ui-resizable-se").addClass("ui-icon ui-icon-grip-diagonal-se")},_minHeight:function(){var a=this.options;return a.height==="auto"?a.minHeight:Math.min(a.minHeight,a.height)},_position:function(a){var b=[],d=[0,0];a=a||c.ui.dialog.prototype.options.position;if(typeof a==="string"||typeof a==="object"&&"0"in a){b=a.split?a.split(" "):[a[0],a[1]];if(b.length===1)b[1]=b[0];c.each(["left","top"],function(e,g){if(+b[e]===b[e]){d[e]=b[e];b[e]=
g}})}else if(typeof a==="object"){if("left"in a){b[0]="left";d[0]=a.left}else if("right"in a){b[0]="right";d[0]=-a.right}if("top"in a){b[1]="top";d[1]=a.top}else if("bottom"in a){b[1]="bottom";d[1]=-a.bottom}}(a=this.uiDialog.is(":visible"))||this.uiDialog.show();this.uiDialog.css({top:0,left:0}).position({my:b.join(" "),at:b.join(" "),offset:d.join(" "),of:window,collision:"fit",using:function(e){var g=c(this).css(e).offset().top;g<0&&c(this).css("top",e.top-g)}});a||this.uiDialog.hide()},_setOption:function(a,
b){var d=this,e=d.uiDialog,g=e.is(":data(resizable)"),f=false;switch(a){case "beforeclose":a="beforeClose";break;case "buttons":d._createButtons(b);break;case "closeText":d.uiDialogTitlebarCloseText.text(""+b);break;case "dialogClass":e.removeClass(d.options.dialogClass).addClass("ui-dialog ui-widget ui-widget-content ui-corner-all "+b);break;case "disabled":b?e.addClass("ui-dialog-disabled"):e.removeClass("ui-dialog-disabled");break;case "draggable":b?d._makeDraggable():e.draggable("destroy");break;
case "height":f=true;break;case "maxHeight":g&&e.resizable("option","maxHeight",b);f=true;break;case "maxWidth":g&&e.resizable("option","maxWidth",b);f=true;break;case "minHeight":g&&e.resizable("option","minHeight",b);f=true;break;case "minWidth":g&&e.resizable("option","minWidth",b);f=true;break;case "position":d._position(b);break;case "resizable":g&&!b&&e.resizable("destroy");g&&typeof b==="string"&&e.resizable("option","handles",b);!g&&b!==false&&d._makeResizable(b);break;case "title":c(".ui-dialog-title",
d.uiDialogTitlebar).html(""+(b||"&#160;"));break;case "width":f=true;break}c.Widget.prototype._setOption.apply(d,arguments);f&&d._size()},_size:function(){var a=this.options,b;this.element.css({width:"auto",minHeight:0,height:0});b=this.uiDialog.css({height:"auto",width:a.width}).height();this.element.css(a.height==="auto"?{minHeight:Math.max(a.minHeight-b,0),height:"auto"}:{minHeight:0,height:Math.max(a.height-b,0)}).show();this.uiDialog.is(":data(resizable)")&&this.uiDialog.resizable("option","minHeight",
this._minHeight())}});c.extend(c.ui.dialog,{version:"1.8.2",uuid:0,maxZ:0,getTitleId:function(a){a=a.attr("id");if(!a){this.uuid+=1;a=this.uuid}return"ui-dialog-title-"+a},overlay:function(a){this.$el=c.ui.dialog.overlay.create(a)}});c.extend(c.ui.dialog.overlay,{instances:[],oldInstances:[],maxZ:0,events:c.map("focus,mousedown,mouseup,keydown,keypress,click".split(","),function(a){return a+".dialog-overlay"}).join(" "),create:function(a){if(this.instances.length===0){setTimeout(function(){c.ui.dialog.overlay.instances.length&&
c(document).bind(c.ui.dialog.overlay.events,function(d){return c(d.target).zIndex()>=c.ui.dialog.overlay.maxZ})},1);c(document).bind("keydown.dialog-overlay",function(d){if(a.options.closeOnEscape&&d.keyCode&&d.keyCode===c.ui.keyCode.ESCAPE){a.close(d);d.preventDefault()}});c(window).bind("resize.dialog-overlay",c.ui.dialog.overlay.resize)}var b=(this.oldInstances.pop()||c("<div></div>").addClass("ui-widget-overlay")).appendTo(document.body).css({width:this.width(),height:this.height()});c.fn.bgiframe&&
b.bgiframe();this.instances.push(b);return b},destroy:function(a){this.oldInstances.push(this.instances.splice(c.inArray(a,this.instances),1)[0]);this.instances.length===0&&c([document,window]).unbind(".dialog-overlay");a.remove();var b=0;c.each(this.instances,function(){b=Math.max(b,this.css("z-index"))});this.maxZ=b},height:function(){var a,b;if(c.browser.msie&&c.browser.version<7){a=Math.max(document.documentElement.scrollHeight,document.body.scrollHeight);b=Math.max(document.documentElement.offsetHeight,
document.body.offsetHeight);return a<b?c(window).height()+"px":a+"px"}else return c(document).height()+"px"},width:function(){var a,b;if(c.browser.msie&&c.browser.version<7){a=Math.max(document.documentElement.scrollWidth,document.body.scrollWidth);b=Math.max(document.documentElement.offsetWidth,document.body.offsetWidth);return a<b?c(window).width()+"px":a+"px"}else return c(document).width()+"px"},resize:function(){var a=c([]);c.each(c.ui.dialog.overlay.instances,function(){a=a.add(this)});a.css({width:0,
height:0}).css({width:c.ui.dialog.overlay.width(),height:c.ui.dialog.overlay.height()})}});c.extend(c.ui.dialog.overlay.prototype,{destroy:function(){c.ui.dialog.overlay.destroy(this.$el)}})})(jQuery);
/*
 * jQuery UI Slider 1.8.2
 *
 * Copyright (c) 2010 AUTHORS.txt (http://jqueryui.com/about)
 * Dual licensed under the MIT (MIT-LICENSE.txt)
 * and GPL (GPL-LICENSE.txt) licenses.
 *
 * http://docs.jquery.com/UI/Slider
 *
 * Depends:
 *	jquery.ui.core.js
 *	jquery.ui.mouse.js
 *	jquery.ui.widget.js
 */
(function(d){d.widget("ui.slider",d.ui.mouse,{widgetEventPrefix:"slide",options:{animate:false,distance:0,max:100,min:0,orientation:"horizontal",range:false,step:1,value:0,values:null},_create:function(){var a=this,b=this.options;this._mouseSliding=this._keySliding=false;this._animateOff=true;this._handleIndex=null;this._detectOrientation();this._mouseInit();this.element.addClass("ui-slider ui-slider-"+this.orientation+" ui-widget ui-widget-content ui-corner-all");b.disabled&&this.element.addClass("ui-slider-disabled ui-disabled");
this.range=d([]);if(b.range){if(b.range===true){this.range=d("<div></div>");if(!b.values)b.values=[this._valueMin(),this._valueMin()];if(b.values.length&&b.values.length!==2)b.values=[b.values[0],b.values[0]]}else this.range=d("<div></div>");this.range.appendTo(this.element).addClass("ui-slider-range");if(b.range==="min"||b.range==="max")this.range.addClass("ui-slider-range-"+b.range);this.range.addClass("ui-widget-header")}d(".ui-slider-handle",this.element).length===0&&d("<a href='#'></a>").appendTo(this.element).addClass("ui-slider-handle");
if(b.values&&b.values.length)for(;d(".ui-slider-handle",this.element).length<b.values.length;)d("<a href='#'></a>").appendTo(this.element).addClass("ui-slider-handle");this.handles=d(".ui-slider-handle",this.element).addClass("ui-state-default ui-corner-all");this.handle=this.handles.eq(0);this.handles.add(this.range).filter("a").click(function(c){c.preventDefault()}).hover(function(){b.disabled||d(this).addClass("ui-state-hover")},function(){d(this).removeClass("ui-state-hover")}).focus(function(){if(b.disabled)d(this).blur();
else{d(".ui-slider .ui-state-focus").removeClass("ui-state-focus");d(this).addClass("ui-state-focus")}}).blur(function(){d(this).removeClass("ui-state-focus")});this.handles.each(function(c){d(this).data("index.ui-slider-handle",c)});this.handles.keydown(function(c){var e=true,f=d(this).data("index.ui-slider-handle"),g,h,i;if(!a.options.disabled){switch(c.keyCode){case d.ui.keyCode.HOME:case d.ui.keyCode.END:case d.ui.keyCode.PAGE_UP:case d.ui.keyCode.PAGE_DOWN:case d.ui.keyCode.UP:case d.ui.keyCode.RIGHT:case d.ui.keyCode.DOWN:case d.ui.keyCode.LEFT:e=
false;if(!a._keySliding){a._keySliding=true;d(this).addClass("ui-state-active");g=a._start(c,f);if(g===false)return}break}i=a.options.step;g=a.options.values&&a.options.values.length?(h=a.values(f)):(h=a.value());switch(c.keyCode){case d.ui.keyCode.HOME:h=a._valueMin();break;case d.ui.keyCode.END:h=a._valueMax();break;case d.ui.keyCode.PAGE_UP:h=a._trimAlignValue(g+(a._valueMax()-a._valueMin())/5);break;case d.ui.keyCode.PAGE_DOWN:h=a._trimAlignValue(g-(a._valueMax()-a._valueMin())/5);break;case d.ui.keyCode.UP:case d.ui.keyCode.RIGHT:if(g===
a._valueMax())return;h=a._trimAlignValue(g+i);break;case d.ui.keyCode.DOWN:case d.ui.keyCode.LEFT:if(g===a._valueMin())return;h=a._trimAlignValue(g-i);break}a._slide(c,f,h);return e}}).keyup(function(c){var e=d(this).data("index.ui-slider-handle");if(a._keySliding){a._keySliding=false;a._stop(c,e);a._change(c,e);d(this).removeClass("ui-state-active")}});this._refreshValue();this._animateOff=false},destroy:function(){this.handles.remove();this.range.remove();this.element.removeClass("ui-slider ui-slider-horizontal ui-slider-vertical ui-slider-disabled ui-widget ui-widget-content ui-corner-all").removeData("slider").unbind(".slider");
this._mouseDestroy();return this},_mouseCapture:function(a){var b=this.options,c,e,f,g,h,i;if(b.disabled)return false;this.elementSize={width:this.element.outerWidth(),height:this.element.outerHeight()};this.elementOffset=this.element.offset();c={x:a.pageX,y:a.pageY};e=this._normValueFromMouse(c);f=this._valueMax()-this._valueMin()+1;h=this;this.handles.each(function(j){var k=Math.abs(e-h.values(j));if(f>k){f=k;g=d(this);i=j}});if(b.range===true&&this.values(1)===b.min){i+=1;g=d(this.handles[i])}if(this._start(a,
i)===false)return false;this._mouseSliding=true;h._handleIndex=i;g.addClass("ui-state-active").focus();b=g.offset();this._clickOffset=!d(a.target).parents().andSelf().is(".ui-slider-handle")?{left:0,top:0}:{left:a.pageX-b.left-g.width()/2,top:a.pageY-b.top-g.height()/2-(parseInt(g.css("borderTopWidth"),10)||0)-(parseInt(g.css("borderBottomWidth"),10)||0)+(parseInt(g.css("marginTop"),10)||0)};e=this._normValueFromMouse(c);this._slide(a,i,e);return this._animateOff=true},_mouseStart:function(){return true},
_mouseDrag:function(a){var b=this._normValueFromMouse({x:a.pageX,y:a.pageY});this._slide(a,this._handleIndex,b);return false},_mouseStop:function(a){this.handles.removeClass("ui-state-active");this._mouseSliding=false;this._stop(a,this._handleIndex);this._change(a,this._handleIndex);this._clickOffset=this._handleIndex=null;return this._animateOff=false},_detectOrientation:function(){this.orientation=this.options.orientation==="vertical"?"vertical":"horizontal"},_normValueFromMouse:function(a){var b;
if(this.orientation==="horizontal"){b=this.elementSize.width;a=a.x-this.elementOffset.left-(this._clickOffset?this._clickOffset.left:0)}else{b=this.elementSize.height;a=a.y-this.elementOffset.top-(this._clickOffset?this._clickOffset.top:0)}b=a/b;if(b>1)b=1;if(b<0)b=0;if(this.orientation==="vertical")b=1-b;a=this._valueMax()-this._valueMin();return this._trimAlignValue(this._valueMin()+b*a)},_start:function(a,b){var c={handle:this.handles[b],value:this.value()};if(this.options.values&&this.options.values.length){c.value=
this.values(b);c.values=this.values()}return this._trigger("start",a,c)},_slide:function(a,b,c){var e;if(this.options.values&&this.options.values.length){e=this.values(b?0:1);if(this.options.values.length===2&&this.options.range===true&&(b===0&&c>e||b===1&&c<e))c=e;if(c!==this.values(b)){e=this.values();e[b]=c;a=this._trigger("slide",a,{handle:this.handles[b],value:c,values:e});this.values(b?0:1);a!==false&&this.values(b,c,true)}}else if(c!==this.value()){a=this._trigger("slide",a,{handle:this.handles[b],
value:c});a!==false&&this.value(c)}},_stop:function(a,b){var c={handle:this.handles[b],value:this.value()};if(this.options.values&&this.options.values.length){c.value=this.values(b);c.values=this.values()}this._trigger("stop",a,c)},_change:function(a,b){if(!this._keySliding&&!this._mouseSliding){var c={handle:this.handles[b],value:this.value()};if(this.options.values&&this.options.values.length){c.value=this.values(b);c.values=this.values()}this._trigger("change",a,c)}},value:function(a){if(arguments.length){this.options.value=
this._trimAlignValue(a);this._refreshValue();this._change(null,0)}return this._value()},values:function(a,b){var c,e,f;if(arguments.length>1){this.options.values[a]=this._trimAlignValue(b);this._refreshValue();this._change(null,a)}if(arguments.length)if(d.isArray(arguments[0])){c=this.options.values;e=arguments[0];for(f=0;f<c.length;f+=1){c[f]=this._trimAlignValue(e[f]);this._change(null,f)}this._refreshValue()}else return this.options.values&&this.options.values.length?this._values(a):this.value();
else return this._values()},_setOption:function(a,b){var c,e=0;if(d.isArray(this.options.values))e=this.options.values.length;d.Widget.prototype._setOption.apply(this,arguments);switch(a){case "disabled":if(b){this.handles.filter(".ui-state-focus").blur();this.handles.removeClass("ui-state-hover");this.handles.attr("disabled","disabled");this.element.addClass("ui-disabled")}else{this.handles.removeAttr("disabled");this.element.removeClass("ui-disabled")}break;case "orientation":this._detectOrientation();
this.element.removeClass("ui-slider-horizontal ui-slider-vertical").addClass("ui-slider-"+this.orientation);this._refreshValue();break;case "value":this._animateOff=true;this._refreshValue();this._change(null,0);this._animateOff=false;break;case "values":this._animateOff=true;this._refreshValue();for(c=0;c<e;c+=1)this._change(null,c);this._animateOff=false;break}},_value:function(){var a=this.options.value;return a=this._trimAlignValue(a)},_values:function(a){var b,c;if(arguments.length){b=this.options.values[a];
return b=this._trimAlignValue(b)}else{b=this.options.values.slice();for(c=0;c<b.length;c+=1)b[c]=this._trimAlignValue(b[c]);return b}},_trimAlignValue:function(a){if(a<this._valueMin())return this._valueMin();if(a>this._valueMax())return this._valueMax();var b=this.options.step>0?this.options.step:1,c=a%b;a=a-c;if(Math.abs(c)*2>=b)a+=c>0?b:-b;return parseFloat(a.toFixed(5))},_valueMin:function(){return this.options.min},_valueMax:function(){return this.options.max},_refreshValue:function(){var a=
this.options.range,b=this.options,c=this,e=!this._animateOff?b.animate:false,f,g={},h,i,j,k;if(this.options.values&&this.options.values.length)this.handles.each(function(l){f=(c.values(l)-c._valueMin())/(c._valueMax()-c._valueMin())*100;g[c.orientation==="horizontal"?"left":"bottom"]=f+"%";d(this).stop(1,1)[e?"animate":"css"](g,b.animate);if(c.options.range===true)if(c.orientation==="horizontal"){if(l===0)c.range.stop(1,1)[e?"animate":"css"]({left:f+"%"},b.animate);if(l===1)c.range[e?"animate":"css"]({width:f-
h+"%"},{queue:false,duration:b.animate})}else{if(l===0)c.range.stop(1,1)[e?"animate":"css"]({bottom:f+"%"},b.animate);if(l===1)c.range[e?"animate":"css"]({height:f-h+"%"},{queue:false,duration:b.animate})}h=f});else{i=this.value();j=this._valueMin();k=this._valueMax();f=k!==j?(i-j)/(k-j)*100:0;g[c.orientation==="horizontal"?"left":"bottom"]=f+"%";this.handle.stop(1,1)[e?"animate":"css"](g,b.animate);if(a==="min"&&this.orientation==="horizontal")this.range.stop(1,1)[e?"animate":"css"]({width:f+"%"},
b.animate);if(a==="max"&&this.orientation==="horizontal")this.range[e?"animate":"css"]({width:100-f+"%"},{queue:false,duration:b.animate});if(a==="min"&&this.orientation==="vertical")this.range.stop(1,1)[e?"animate":"css"]({height:f+"%"},b.animate);if(a==="max"&&this.orientation==="vertical")this.range[e?"animate":"css"]({height:100-f+"%"},{queue:false,duration:b.animate})}}});d.extend(d.ui.slider,{version:"1.8.2"})})(jQuery);
/*
 * jQuery UI Tabs 1.8.2
 *
 * Copyright (c) 2010 AUTHORS.txt (http://jqueryui.com/about)
 * Dual licensed under the MIT (MIT-LICENSE.txt)
 * and GPL (GPL-LICENSE.txt) licenses.
 *
 * http://docs.jquery.com/UI/Tabs
 *
 * Depends:
 *	jquery.ui.core.js
 *	jquery.ui.widget.js
 */
(function(d){function s(){return++u}function v(){return++w}var u=0,w=0;d.widget("ui.tabs",{options:{add:null,ajaxOptions:null,cache:false,cookie:null,collapsible:false,disable:null,disabled:[],enable:null,event:"click",fx:null,idPrefix:"ui-tabs-",load:null,panelTemplate:"<div></div>",remove:null,select:null,show:null,spinner:"<em>Loading&#8230;</em>",tabTemplate:'<li><a href="#{href}"><span>#{label}</span></a></li>'},_create:function(){this._tabify(true)},_setOption:function(c,e){if(c=="selected")this.options.collapsible&&
e==this.options.selected||this.select(e);else{this.options[c]=e;this._tabify()}},_tabId:function(c){return c.title&&c.title.replace(/\s/g,"_").replace(/[^A-Za-z0-9\-_:\.]/g,"")||this.options.idPrefix+s()},_sanitizeSelector:function(c){return c.replace(/:/g,"\\:")},_cookie:function(){var c=this.cookie||(this.cookie=this.options.cookie.name||"ui-tabs-"+v());return d.cookie.apply(null,[c].concat(d.makeArray(arguments)))},_ui:function(c,e){return{tab:c,panel:e,index:this.anchors.index(c)}},_cleanup:function(){this.lis.filter(".ui-state-processing").removeClass("ui-state-processing").find("span:data(label.tabs)").each(function(){var c=
d(this);c.html(c.data("label.tabs")).removeData("label.tabs")})},_tabify:function(c){function e(g,f){g.css({display:""});!d.support.opacity&&f.opacity&&g[0].style.removeAttribute("filter")}this.list=this.element.find("ol,ul").eq(0);this.lis=d("li:has(a[href])",this.list);this.anchors=this.lis.map(function(){return d("a",this)[0]});this.panels=d([]);var a=this,b=this.options,h=/^#.+/;this.anchors.each(function(g,f){var j=d(f).attr("href"),l=j.split("#")[0],p;if(l&&(l===location.toString().split("#")[0]||
(p=d("base")[0])&&l===p.href)){j=f.hash;f.href=j}if(h.test(j))a.panels=a.panels.add(a._sanitizeSelector(j));else if(j!="#"){d.data(f,"href.tabs",j);d.data(f,"load.tabs",j.replace(/#.*$/,""));j=a._tabId(f);f.href="#"+j;f=d("#"+j);if(!f.length){f=d(b.panelTemplate).attr("id",j).addClass("ui-tabs-panel ui-widget-content ui-corner-bottom").insertAfter(a.panels[g-1]||a.list);f.data("destroy.tabs",true)}a.panels=a.panels.add(f)}else b.disabled.push(g)});if(c){this.element.addClass("ui-tabs ui-widget ui-widget-content ui-corner-all");
this.list.addClass("ui-tabs-nav ui-helper-reset ui-helper-clearfix ui-widget-header ui-corner-all");this.lis.addClass("ui-state-default ui-corner-top");this.panels.addClass("ui-tabs-panel ui-widget-content ui-corner-bottom");if(b.selected===undefined){location.hash&&this.anchors.each(function(g,f){if(f.hash==location.hash){b.selected=g;return false}});if(typeof b.selected!="number"&&b.cookie)b.selected=parseInt(a._cookie(),10);if(typeof b.selected!="number"&&this.lis.filter(".ui-tabs-selected").length)b.selected=
this.lis.index(this.lis.filter(".ui-tabs-selected"));b.selected=b.selected||(this.lis.length?0:-1)}else if(b.selected===null)b.selected=-1;b.selected=b.selected>=0&&this.anchors[b.selected]||b.selected<0?b.selected:0;b.disabled=d.unique(b.disabled.concat(d.map(this.lis.filter(".ui-state-disabled"),function(g){return a.lis.index(g)}))).sort();d.inArray(b.selected,b.disabled)!=-1&&b.disabled.splice(d.inArray(b.selected,b.disabled),1);this.panels.addClass("ui-tabs-hide");this.lis.removeClass("ui-tabs-selected ui-state-active");
if(b.selected>=0&&this.anchors.length){this.panels.eq(b.selected).removeClass("ui-tabs-hide");this.lis.eq(b.selected).addClass("ui-tabs-selected ui-state-active");a.element.queue("tabs",function(){a._trigger("show",null,a._ui(a.anchors[b.selected],a.panels[b.selected]))});this.load(b.selected)}d(window).bind("unload",function(){a.lis.add(a.anchors).unbind(".tabs");a.lis=a.anchors=a.panels=null})}else b.selected=this.lis.index(this.lis.filter(".ui-tabs-selected"));this.element[b.collapsible?"addClass":
"removeClass"]("ui-tabs-collapsible");b.cookie&&this._cookie(b.selected,b.cookie);c=0;for(var i;i=this.lis[c];c++)d(i)[d.inArray(c,b.disabled)!=-1&&!d(i).hasClass("ui-tabs-selected")?"addClass":"removeClass"]("ui-state-disabled");b.cache===false&&this.anchors.removeData("cache.tabs");this.lis.add(this.anchors).unbind(".tabs");if(b.event!="mouseover"){var k=function(g,f){f.is(":not(.ui-state-disabled)")&&f.addClass("ui-state-"+g)},n=function(g,f){f.removeClass("ui-state-"+g)};this.lis.bind("mouseover.tabs",
function(){k("hover",d(this))});this.lis.bind("mouseout.tabs",function(){n("hover",d(this))});this.anchors.bind("focus.tabs",function(){k("focus",d(this).closest("li"))});this.anchors.bind("blur.tabs",function(){n("focus",d(this).closest("li"))})}var m,o;if(b.fx)if(d.isArray(b.fx)){m=b.fx[0];o=b.fx[1]}else m=o=b.fx;var q=o?function(g,f){d(g).closest("li").addClass("ui-tabs-selected ui-state-active");f.hide().removeClass("ui-tabs-hide").animate(o,o.duration||"normal",function(){e(f,o);a._trigger("show",
null,a._ui(g,f[0]))})}:function(g,f){d(g).closest("li").addClass("ui-tabs-selected ui-state-active");f.removeClass("ui-tabs-hide");a._trigger("show",null,a._ui(g,f[0]))},r=m?function(g,f){f.animate(m,m.duration||"normal",function(){a.lis.removeClass("ui-tabs-selected ui-state-active");f.addClass("ui-tabs-hide");e(f,m);a.element.dequeue("tabs")})}:function(g,f){a.lis.removeClass("ui-tabs-selected ui-state-active");f.addClass("ui-tabs-hide");a.element.dequeue("tabs")};this.anchors.bind(b.event+".tabs",
function(){var g=this,f=d(this).closest("li"),j=a.panels.filter(":not(.ui-tabs-hide)"),l=d(a._sanitizeSelector(this.hash));if(f.hasClass("ui-tabs-selected")&&!b.collapsible||f.hasClass("ui-state-disabled")||f.hasClass("ui-state-processing")||a._trigger("select",null,a._ui(this,l[0]))===false){this.blur();return false}b.selected=a.anchors.index(this);a.abort();if(b.collapsible)if(f.hasClass("ui-tabs-selected")){b.selected=-1;b.cookie&&a._cookie(b.selected,b.cookie);a.element.queue("tabs",function(){r(g,
j)}).dequeue("tabs");this.blur();return false}else if(!j.length){b.cookie&&a._cookie(b.selected,b.cookie);a.element.queue("tabs",function(){q(g,l)});a.load(a.anchors.index(this));this.blur();return false}b.cookie&&a._cookie(b.selected,b.cookie);if(l.length){j.length&&a.element.queue("tabs",function(){r(g,j)});a.element.queue("tabs",function(){q(g,l)});a.load(a.anchors.index(this))}else throw"jQuery UI Tabs: Mismatching fragment identifier.";d.browser.msie&&this.blur()});this.anchors.bind("click.tabs",
function(){return false})},destroy:function(){var c=this.options;this.abort();this.element.unbind(".tabs").removeClass("ui-tabs ui-widget ui-widget-content ui-corner-all ui-tabs-collapsible").removeData("tabs");this.list.removeClass("ui-tabs-nav ui-helper-reset ui-helper-clearfix ui-widget-header ui-corner-all");this.anchors.each(function(){var e=d.data(this,"href.tabs");if(e)this.href=e;var a=d(this).unbind(".tabs");d.each(["href","load","cache"],function(b,h){a.removeData(h+".tabs")})});this.lis.unbind(".tabs").add(this.panels).each(function(){d.data(this,
"destroy.tabs")?d(this).remove():d(this).removeClass("ui-state-default ui-corner-top ui-tabs-selected ui-state-active ui-state-hover ui-state-focus ui-state-disabled ui-tabs-panel ui-widget-content ui-corner-bottom ui-tabs-hide")});c.cookie&&this._cookie(null,c.cookie);return this},add:function(c,e,a){if(a===undefined)a=this.anchors.length;var b=this,h=this.options;e=d(h.tabTemplate.replace(/#\{href\}/g,c).replace(/#\{label\}/g,e));c=!c.indexOf("#")?c.replace("#",""):this._tabId(d("a",e)[0]);e.addClass("ui-state-default ui-corner-top").data("destroy.tabs",
true);var i=d("#"+c);i.length||(i=d(h.panelTemplate).attr("id",c).data("destroy.tabs",true));i.addClass("ui-tabs-panel ui-widget-content ui-corner-bottom ui-tabs-hide");if(a>=this.lis.length){e.appendTo(this.list);i.appendTo(this.list[0].parentNode)}else{e.insertBefore(this.lis[a]);i.insertBefore(this.panels[a])}h.disabled=d.map(h.disabled,function(k){return k>=a?++k:k});this._tabify();if(this.anchors.length==1){h.selected=0;e.addClass("ui-tabs-selected ui-state-active");i.removeClass("ui-tabs-hide");
this.element.queue("tabs",function(){b._trigger("show",null,b._ui(b.anchors[0],b.panels[0]))});this.load(0)}this._trigger("add",null,this._ui(this.anchors[a],this.panels[a]));return this},remove:function(c){var e=this.options,a=this.lis.eq(c).remove(),b=this.panels.eq(c).remove();if(a.hasClass("ui-tabs-selected")&&this.anchors.length>1)this.select(c+(c+1<this.anchors.length?1:-1));e.disabled=d.map(d.grep(e.disabled,function(h){return h!=c}),function(h){return h>=c?--h:h});this._tabify();this._trigger("remove",
null,this._ui(a.find("a")[0],b[0]));return this},enable:function(c){var e=this.options;if(d.inArray(c,e.disabled)!=-1){this.lis.eq(c).removeClass("ui-state-disabled");e.disabled=d.grep(e.disabled,function(a){return a!=c});this._trigger("enable",null,this._ui(this.anchors[c],this.panels[c]));return this}},disable:function(c){var e=this.options;if(c!=e.selected){this.lis.eq(c).addClass("ui-state-disabled");e.disabled.push(c);e.disabled.sort();this._trigger("disable",null,this._ui(this.anchors[c],this.panels[c]))}return this},
select:function(c){if(typeof c=="string")c=this.anchors.index(this.anchors.filter("[href$="+c+"]"));else if(c===null)c=-1;if(c==-1&&this.options.collapsible)c=this.options.selected;this.anchors.eq(c).trigger(this.options.event+".tabs");return this},load:function(c){var e=this,a=this.options,b=this.anchors.eq(c)[0],h=d.data(b,"load.tabs");this.abort();if(!h||this.element.queue("tabs").length!==0&&d.data(b,"cache.tabs"))this.element.dequeue("tabs");else{this.lis.eq(c).addClass("ui-state-processing");
if(a.spinner){var i=d("span",b);i.data("label.tabs",i.html()).html(a.spinner)}this.xhr=d.ajax(d.extend({},a.ajaxOptions,{url:h,success:function(k,n){d(e._sanitizeSelector(b.hash)).html(k);e._cleanup();a.cache&&d.data(b,"cache.tabs",true);e._trigger("load",null,e._ui(e.anchors[c],e.panels[c]));try{a.ajaxOptions.success(k,n)}catch(m){}},error:function(k,n){e._cleanup();e._trigger("load",null,e._ui(e.anchors[c],e.panels[c]));try{a.ajaxOptions.error(k,n,c,b)}catch(m){}}}));e.element.dequeue("tabs");return this}},
abort:function(){this.element.queue([]);this.panels.stop(false,true);this.element.queue("tabs",this.element.queue("tabs").splice(-2,2));if(this.xhr){this.xhr.abort();delete this.xhr}this._cleanup();return this},url:function(c,e){this.anchors.eq(c).removeData("cache.tabs").data("load.tabs",e);return this},length:function(){return this.anchors.length}});d.extend(d.ui.tabs,{version:"1.8.2"});d.extend(d.ui.tabs.prototype,{rotation:null,rotate:function(c,e){var a=this,b=this.options,h=a._rotate||(a._rotate=
function(i){clearTimeout(a.rotation);a.rotation=setTimeout(function(){var k=b.selected;a.select(++k<a.anchors.length?k:0)},c);i&&i.stopPropagation()});e=a._unrotate||(a._unrotate=!e?function(i){i.clientX&&a.rotate(null)}:function(){t=b.selected;h()});if(c){this.element.bind("tabsshow",h);this.anchors.bind(b.event+".tabs",e);h()}else{clearTimeout(a.rotation);this.element.unbind("tabsshow",h);this.anchors.unbind(b.event+".tabs",e);delete this._rotate;delete this._unrotate}return this}})})(jQuery);
/*
 * jQuery UI Datepicker 1.8.2
 *
 * Copyright (c) 2010 AUTHORS.txt (http://jqueryui.com/about)
 * Dual licensed under the MIT (MIT-LICENSE.txt)
 * and GPL (GPL-LICENSE.txt) licenses.
 *
 * http://docs.jquery.com/UI/Datepicker
 *
 * Depends:
 *	jquery.ui.core.js
 */
(function(d){function J(){this.debug=false;this._curInst=null;this._keyEvent=false;this._disabledInputs=[];this._inDialog=this._datepickerShowing=false;this._mainDivId="ui-datepicker-div";this._inlineClass="ui-datepicker-inline";this._appendClass="ui-datepicker-append";this._triggerClass="ui-datepicker-trigger";this._dialogClass="ui-datepicker-dialog";this._disableClass="ui-datepicker-disabled";this._unselectableClass="ui-datepicker-unselectable";this._currentClass="ui-datepicker-current-day";this._dayOverClass=
"ui-datepicker-days-cell-over";this.regional=[];this.regional[""]={closeText:"Done",prevText:"Prev",nextText:"Next",currentText:"Today",monthNames:["January","February","March","April","May","June","July","August","September","October","November","December"],monthNamesShort:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],dayNames:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],dayNamesShort:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],dayNamesMin:["Su",
"Mo","Tu","We","Th","Fr","Sa"],weekHeader:"Wk",dateFormat:"mm/dd/yy",firstDay:0,isRTL:false,showMonthAfterYear:false,yearSuffix:""};this._defaults={showOn:"focus",showAnim:"fadeIn",showOptions:{},defaultDate:null,appendText:"",buttonText:"...",buttonImage:"",buttonImageOnly:false,hideIfNoPrevNext:false,navigationAsDateFormat:false,gotoCurrent:false,changeMonth:false,changeYear:false,yearRange:"c-10:c+10",showOtherMonths:false,selectOtherMonths:false,showWeek:false,calculateWeek:this.iso8601Week,shortYearCutoff:"+10",
minDate:null,maxDate:null,duration:"fast",beforeShowDay:null,beforeShow:null,onSelect:null,onChangeMonthYear:null,onClose:null,numberOfMonths:1,showCurrentAtPos:0,stepMonths:1,stepBigMonths:12,altField:"",altFormat:"",constrainInput:true,showButtonPanel:false,autoSize:false};d.extend(this._defaults,this.regional[""]);this.dpDiv=d('<div id="'+this._mainDivId+'" class="ui-datepicker ui-widget ui-widget-content ui-helper-clearfix ui-corner-all ui-helper-hidden-accessible"></div>')}function E(a,b){d.extend(a,
b);for(var c in b)if(b[c]==null||b[c]==undefined)a[c]=b[c];return a}d.extend(d.ui,{datepicker:{version:"1.8.2"}});var y=(new Date).getTime();d.extend(J.prototype,{markerClassName:"hasDatepicker",log:function(){this.debug&&console.log.apply("",arguments)},_widgetDatepicker:function(){return this.dpDiv},setDefaults:function(a){E(this._defaults,a||{});return this},_attachDatepicker:function(a,b){var c=null;for(var e in this._defaults){var f=a.getAttribute("date:"+e);if(f){c=c||{};try{c[e]=eval(f)}catch(h){c[e]=
f}}}e=a.nodeName.toLowerCase();f=e=="div"||e=="span";if(!a.id){this.uuid+=1;a.id="dp"+this.uuid}var i=this._newInst(d(a),f);i.settings=d.extend({},b||{},c||{});if(e=="input")this._connectDatepicker(a,i);else f&&this._inlineDatepicker(a,i)},_newInst:function(a,b){return{id:a[0].id.replace(/([^A-Za-z0-9_])/g,"\\\\$1"),input:a,selectedDay:0,selectedMonth:0,selectedYear:0,drawMonth:0,drawYear:0,inline:b,dpDiv:!b?this.dpDiv:d('<div class="'+this._inlineClass+' ui-datepicker ui-widget ui-widget-content ui-helper-clearfix ui-corner-all"></div>')}},
_connectDatepicker:function(a,b){var c=d(a);b.append=d([]);b.trigger=d([]);if(!c.hasClass(this.markerClassName)){this._attachments(c,b);c.addClass(this.markerClassName).keydown(this._doKeyDown).keypress(this._doKeyPress).keyup(this._doKeyUp).bind("setData.datepicker",function(e,f,h){b.settings[f]=h}).bind("getData.datepicker",function(e,f){return this._get(b,f)});this._autoSize(b);d.data(a,"datepicker",b)}},_attachments:function(a,b){var c=this._get(b,"appendText"),e=this._get(b,"isRTL");b.append&&
b.append.remove();if(c){b.append=d('<span class="'+this._appendClass+'">'+c+"</span>");a[e?"before":"after"](b.append)}a.unbind("focus",this._showDatepicker);b.trigger&&b.trigger.remove();c=this._get(b,"showOn");if(c=="focus"||c=="both")a.focus(this._showDatepicker);if(c=="button"||c=="both"){c=this._get(b,"buttonText");var f=this._get(b,"buttonImage");b.trigger=d(this._get(b,"buttonImageOnly")?d("<img/>").addClass(this._triggerClass).attr({src:f,alt:c,title:c}):d('<button type="button"></button>').addClass(this._triggerClass).html(f==
""?c:d("<img/>").attr({src:f,alt:c,title:c})));a[e?"before":"after"](b.trigger);b.trigger.click(function(){d.datepicker._datepickerShowing&&d.datepicker._lastInput==a[0]?d.datepicker._hideDatepicker():d.datepicker._showDatepicker(a[0]);return false})}},_autoSize:function(a){if(this._get(a,"autoSize")&&!a.inline){var b=new Date(2009,11,20),c=this._get(a,"dateFormat");if(c.match(/[DM]/)){var e=function(f){for(var h=0,i=0,g=0;g<f.length;g++)if(f[g].length>h){h=f[g].length;i=g}return i};b.setMonth(e(this._get(a,
c.match(/MM/)?"monthNames":"monthNamesShort")));b.setDate(e(this._get(a,c.match(/DD/)?"dayNames":"dayNamesShort"))+20-b.getDay())}a.input.attr("size",this._formatDate(a,b).length)}},_inlineDatepicker:function(a,b){var c=d(a);if(!c.hasClass(this.markerClassName)){c.addClass(this.markerClassName).append(b.dpDiv).bind("setData.datepicker",function(e,f,h){b.settings[f]=h}).bind("getData.datepicker",function(e,f){return this._get(b,f)});d.data(a,"datepicker",b);this._setDate(b,this._getDefaultDate(b),
true);this._updateDatepicker(b);this._updateAlternate(b)}},_dialogDatepicker:function(a,b,c,e,f){a=this._dialogInst;if(!a){this.uuid+=1;this._dialogInput=d('<input type="text" id="'+("dp"+this.uuid)+'" style="position: absolute; top: -100px; width: 0px; z-index: -10;"/>');this._dialogInput.keydown(this._doKeyDown);d("body").append(this._dialogInput);a=this._dialogInst=this._newInst(this._dialogInput,false);a.settings={};d.data(this._dialogInput[0],"datepicker",a)}E(a.settings,e||{});b=b&&b.constructor==
Date?this._formatDate(a,b):b;this._dialogInput.val(b);this._pos=f?f.length?f:[f.pageX,f.pageY]:null;if(!this._pos)this._pos=[document.documentElement.clientWidth/2-100+(document.documentElement.scrollLeft||document.body.scrollLeft),document.documentElement.clientHeight/2-150+(document.documentElement.scrollTop||document.body.scrollTop)];this._dialogInput.css("left",this._pos[0]+20+"px").css("top",this._pos[1]+"px");a.settings.onSelect=c;this._inDialog=true;this.dpDiv.addClass(this._dialogClass);this._showDatepicker(this._dialogInput[0]);
d.blockUI&&d.blockUI(this.dpDiv);d.data(this._dialogInput[0],"datepicker",a);return this},_destroyDatepicker:function(a){var b=d(a),c=d.data(a,"datepicker");if(b.hasClass(this.markerClassName)){var e=a.nodeName.toLowerCase();d.removeData(a,"datepicker");if(e=="input"){c.append.remove();c.trigger.remove();b.removeClass(this.markerClassName).unbind("focus",this._showDatepicker).unbind("keydown",this._doKeyDown).unbind("keypress",this._doKeyPress).unbind("keyup",this._doKeyUp)}else if(e=="div"||e=="span")b.removeClass(this.markerClassName).empty()}},
_enableDatepicker:function(a){var b=d(a),c=d.data(a,"datepicker");if(b.hasClass(this.markerClassName)){var e=a.nodeName.toLowerCase();if(e=="input"){a.disabled=false;c.trigger.filter("button").each(function(){this.disabled=false}).end().filter("img").css({opacity:"1.0",cursor:""})}else if(e=="div"||e=="span")b.children("."+this._inlineClass).children().removeClass("ui-state-disabled");this._disabledInputs=d.map(this._disabledInputs,function(f){return f==a?null:f})}},_disableDatepicker:function(a){var b=
d(a),c=d.data(a,"datepicker");if(b.hasClass(this.markerClassName)){var e=a.nodeName.toLowerCase();if(e=="input"){a.disabled=true;c.trigger.filter("button").each(function(){this.disabled=true}).end().filter("img").css({opacity:"0.5",cursor:"default"})}else if(e=="div"||e=="span")b.children("."+this._inlineClass).children().addClass("ui-state-disabled");this._disabledInputs=d.map(this._disabledInputs,function(f){return f==a?null:f});this._disabledInputs[this._disabledInputs.length]=a}},_isDisabledDatepicker:function(a){if(!a)return false;
for(var b=0;b<this._disabledInputs.length;b++)if(this._disabledInputs[b]==a)return true;return false},_getInst:function(a){try{return d.data(a,"datepicker")}catch(b){throw"Missing instance data for this datepicker";}},_optionDatepicker:function(a,b,c){var e=this._getInst(a);if(arguments.length==2&&typeof b=="string")return b=="defaults"?d.extend({},d.datepicker._defaults):e?b=="all"?d.extend({},e.settings):this._get(e,b):null;var f=b||{};if(typeof b=="string"){f={};f[b]=c}if(e){this._curInst==e&&
this._hideDatepicker();var h=this._getDateDatepicker(a,true);E(e.settings,f);this._attachments(d(a),e);this._autoSize(e);this._setDateDatepicker(a,h);this._updateDatepicker(e)}},_changeDatepicker:function(a,b,c){this._optionDatepicker(a,b,c)},_refreshDatepicker:function(a){(a=this._getInst(a))&&this._updateDatepicker(a)},_setDateDatepicker:function(a,b){if(a=this._getInst(a)){this._setDate(a,b);this._updateDatepicker(a);this._updateAlternate(a)}},_getDateDatepicker:function(a,b){(a=this._getInst(a))&&
!a.inline&&this._setDateFromField(a,b);return a?this._getDate(a):null},_doKeyDown:function(a){var b=d.datepicker._getInst(a.target),c=true,e=b.dpDiv.is(".ui-datepicker-rtl");b._keyEvent=true;if(d.datepicker._datepickerShowing)switch(a.keyCode){case 9:d.datepicker._hideDatepicker();c=false;break;case 13:c=d("td."+d.datepicker._dayOverClass,b.dpDiv).add(d("td."+d.datepicker._currentClass,b.dpDiv));c[0]?d.datepicker._selectDay(a.target,b.selectedMonth,b.selectedYear,c[0]):d.datepicker._hideDatepicker();
return false;case 27:d.datepicker._hideDatepicker();break;case 33:d.datepicker._adjustDate(a.target,a.ctrlKey?-d.datepicker._get(b,"stepBigMonths"):-d.datepicker._get(b,"stepMonths"),"M");break;case 34:d.datepicker._adjustDate(a.target,a.ctrlKey?+d.datepicker._get(b,"stepBigMonths"):+d.datepicker._get(b,"stepMonths"),"M");break;case 35:if(a.ctrlKey||a.metaKey)d.datepicker._clearDate(a.target);c=a.ctrlKey||a.metaKey;break;case 36:if(a.ctrlKey||a.metaKey)d.datepicker._gotoToday(a.target);c=a.ctrlKey||
a.metaKey;break;case 37:if(a.ctrlKey||a.metaKey)d.datepicker._adjustDate(a.target,e?+1:-1,"D");c=a.ctrlKey||a.metaKey;if(a.originalEvent.altKey)d.datepicker._adjustDate(a.target,a.ctrlKey?-d.datepicker._get(b,"stepBigMonths"):-d.datepicker._get(b,"stepMonths"),"M");break;case 38:if(a.ctrlKey||a.metaKey)d.datepicker._adjustDate(a.target,-7,"D");c=a.ctrlKey||a.metaKey;break;case 39:if(a.ctrlKey||a.metaKey)d.datepicker._adjustDate(a.target,e?-1:+1,"D");c=a.ctrlKey||a.metaKey;if(a.originalEvent.altKey)d.datepicker._adjustDate(a.target,
a.ctrlKey?+d.datepicker._get(b,"stepBigMonths"):+d.datepicker._get(b,"stepMonths"),"M");break;case 40:if(a.ctrlKey||a.metaKey)d.datepicker._adjustDate(a.target,+7,"D");c=a.ctrlKey||a.metaKey;break;default:c=false}else if(a.keyCode==36&&a.ctrlKey)d.datepicker._showDatepicker(this);else c=false;if(c){a.preventDefault();a.stopPropagation()}},_doKeyPress:function(a){var b=d.datepicker._getInst(a.target);if(d.datepicker._get(b,"constrainInput")){b=d.datepicker._possibleChars(d.datepicker._get(b,"dateFormat"));
var c=String.fromCharCode(a.charCode==undefined?a.keyCode:a.charCode);return a.ctrlKey||c<" "||!b||b.indexOf(c)>-1}},_doKeyUp:function(a){a=d.datepicker._getInst(a.target);if(a.input.val()!=a.lastVal)try{if(d.datepicker.parseDate(d.datepicker._get(a,"dateFormat"),a.input?a.input.val():null,d.datepicker._getFormatConfig(a))){d.datepicker._setDateFromField(a);d.datepicker._updateAlternate(a);d.datepicker._updateDatepicker(a)}}catch(b){d.datepicker.log(b)}return true},_showDatepicker:function(a){a=a.target||
a;if(a.nodeName.toLowerCase()!="input")a=d("input",a.parentNode)[0];if(!(d.datepicker._isDisabledDatepicker(a)||d.datepicker._lastInput==a)){var b=d.datepicker._getInst(a);d.datepicker._curInst&&d.datepicker._curInst!=b&&d.datepicker._curInst.dpDiv.stop(true,true);var c=d.datepicker._get(b,"beforeShow");E(b.settings,c?c.apply(a,[a,b]):{});b.lastVal=null;d.datepicker._lastInput=a;d.datepicker._setDateFromField(b);if(d.datepicker._inDialog)a.value="";if(!d.datepicker._pos){d.datepicker._pos=d.datepicker._findPos(a);
d.datepicker._pos[1]+=a.offsetHeight}var e=false;d(a).parents().each(function(){e|=d(this).css("position")=="fixed";return!e});if(e&&d.browser.opera){d.datepicker._pos[0]-=document.documentElement.scrollLeft;d.datepicker._pos[1]-=document.documentElement.scrollTop}c={left:d.datepicker._pos[0],top:d.datepicker._pos[1]};d.datepicker._pos=null;b.dpDiv.css({position:"absolute",display:"block",top:"-1000px"});d.datepicker._updateDatepicker(b);c=d.datepicker._checkOffset(b,c,e);b.dpDiv.css({position:d.datepicker._inDialog&&
d.blockUI?"static":e?"fixed":"absolute",display:"none",left:c.left+"px",top:c.top+"px"});if(!b.inline){c=d.datepicker._get(b,"showAnim");var f=d.datepicker._get(b,"duration"),h=function(){d.datepicker._datepickerShowing=true;var i=d.datepicker._getBorders(b.dpDiv);b.dpDiv.find("iframe.ui-datepicker-cover").css({left:-i[0],top:-i[1],width:b.dpDiv.outerWidth(),height:b.dpDiv.outerHeight()})};b.dpDiv.zIndex(d(a).zIndex()+1);d.effects&&d.effects[c]?b.dpDiv.show(c,d.datepicker._get(b,"showOptions"),f,
h):b.dpDiv[c||"show"](c?f:null,h);if(!c||!f)h();b.input.is(":visible")&&!b.input.is(":disabled")&&b.input.focus();d.datepicker._curInst=b}}},_updateDatepicker:function(a){var b=this,c=d.datepicker._getBorders(a.dpDiv);a.dpDiv.empty().append(this._generateHTML(a)).find("iframe.ui-datepicker-cover").css({left:-c[0],top:-c[1],width:a.dpDiv.outerWidth(),height:a.dpDiv.outerHeight()}).end().find("button, .ui-datepicker-prev, .ui-datepicker-next, .ui-datepicker-calendar td a").bind("mouseout",function(){d(this).removeClass("ui-state-hover");
this.className.indexOf("ui-datepicker-prev")!=-1&&d(this).removeClass("ui-datepicker-prev-hover");this.className.indexOf("ui-datepicker-next")!=-1&&d(this).removeClass("ui-datepicker-next-hover")}).bind("mouseover",function(){if(!b._isDisabledDatepicker(a.inline?a.dpDiv.parent()[0]:a.input[0])){d(this).parents(".ui-datepicker-calendar").find("a").removeClass("ui-state-hover");d(this).addClass("ui-state-hover");this.className.indexOf("ui-datepicker-prev")!=-1&&d(this).addClass("ui-datepicker-prev-hover");
this.className.indexOf("ui-datepicker-next")!=-1&&d(this).addClass("ui-datepicker-next-hover")}}).end().find("."+this._dayOverClass+" a").trigger("mouseover").end();c=this._getNumberOfMonths(a);var e=c[1];e>1?a.dpDiv.addClass("ui-datepicker-multi-"+e).css("width",17*e+"em"):a.dpDiv.removeClass("ui-datepicker-multi-2 ui-datepicker-multi-3 ui-datepicker-multi-4").width("");a.dpDiv[(c[0]!=1||c[1]!=1?"add":"remove")+"Class"]("ui-datepicker-multi");a.dpDiv[(this._get(a,"isRTL")?"add":"remove")+"Class"]("ui-datepicker-rtl");
a==d.datepicker._curInst&&d.datepicker._datepickerShowing&&a.input&&a.input.is(":visible")&&!a.input.is(":disabled")&&a.input.focus()},_getBorders:function(a){var b=function(c){return{thin:1,medium:2,thick:3}[c]||c};return[parseFloat(b(a.css("border-left-width"))),parseFloat(b(a.css("border-top-width")))]},_checkOffset:function(a,b,c){var e=a.dpDiv.outerWidth(),f=a.dpDiv.outerHeight(),h=a.input?a.input.outerWidth():0,i=a.input?a.input.outerHeight():0,g=document.documentElement.clientWidth+d(document).scrollLeft(),
k=document.documentElement.clientHeight+d(document).scrollTop();b.left-=this._get(a,"isRTL")?e-h:0;b.left-=c&&b.left==a.input.offset().left?d(document).scrollLeft():0;b.top-=c&&b.top==a.input.offset().top+i?d(document).scrollTop():0;b.left-=Math.min(b.left,b.left+e>g&&g>e?Math.abs(b.left+e-g):0);b.top-=Math.min(b.top,b.top+f>k&&k>f?Math.abs(f+i):0);return b},_findPos:function(a){for(var b=this._get(this._getInst(a),"isRTL");a&&(a.type=="hidden"||a.nodeType!=1);)a=a[b?"previousSibling":"nextSibling"];
a=d(a).offset();return[a.left,a.top]},_hideDatepicker:function(a){var b=this._curInst;if(!(!b||a&&b!=d.data(a,"datepicker")))if(this._datepickerShowing){a=this._get(b,"showAnim");var c=this._get(b,"duration"),e=function(){d.datepicker._tidyDialog(b);this._curInst=null};d.effects&&d.effects[a]?b.dpDiv.hide(a,d.datepicker._get(b,"showOptions"),c,e):b.dpDiv[a=="slideDown"?"slideUp":a=="fadeIn"?"fadeOut":"hide"](a?c:null,e);a||e();if(a=this._get(b,"onClose"))a.apply(b.input?b.input[0]:null,[b.input?b.input.val():
"",b]);this._datepickerShowing=false;this._lastInput=null;if(this._inDialog){this._dialogInput.css({position:"absolute",left:"0",top:"-100px"});if(d.blockUI){d.unblockUI();d("body").append(this.dpDiv)}}this._inDialog=false}},_tidyDialog:function(a){a.dpDiv.removeClass(this._dialogClass).unbind(".ui-datepicker-calendar")},_checkExternalClick:function(a){if(d.datepicker._curInst){a=d(a.target);a[0].id!=d.datepicker._mainDivId&&a.parents("#"+d.datepicker._mainDivId).length==0&&!a.hasClass(d.datepicker.markerClassName)&&
!a.hasClass(d.datepicker._triggerClass)&&d.datepicker._datepickerShowing&&!(d.datepicker._inDialog&&d.blockUI)&&d.datepicker._hideDatepicker()}},_adjustDate:function(a,b,c){a=d(a);var e=this._getInst(a[0]);if(!this._isDisabledDatepicker(a[0])){this._adjustInstDate(e,b+(c=="M"?this._get(e,"showCurrentAtPos"):0),c);this._updateDatepicker(e)}},_gotoToday:function(a){a=d(a);var b=this._getInst(a[0]);if(this._get(b,"gotoCurrent")&&b.currentDay){b.selectedDay=b.currentDay;b.drawMonth=b.selectedMonth=b.currentMonth;
b.drawYear=b.selectedYear=b.currentYear}else{var c=new Date;b.selectedDay=c.getDate();b.drawMonth=b.selectedMonth=c.getMonth();b.drawYear=b.selectedYear=c.getFullYear()}this._notifyChange(b);this._adjustDate(a)},_selectMonthYear:function(a,b,c){a=d(a);var e=this._getInst(a[0]);e._selectingMonthYear=false;e["selected"+(c=="M"?"Month":"Year")]=e["draw"+(c=="M"?"Month":"Year")]=parseInt(b.options[b.selectedIndex].value,10);this._notifyChange(e);this._adjustDate(a)},_clickMonthYear:function(a){a=this._getInst(d(a)[0]);
a.input&&a._selectingMonthYear&&!d.browser.msie&&a.input.focus();a._selectingMonthYear=!a._selectingMonthYear},_selectDay:function(a,b,c,e){var f=d(a);if(!(d(e).hasClass(this._unselectableClass)||this._isDisabledDatepicker(f[0]))){f=this._getInst(f[0]);f.selectedDay=f.currentDay=d("a",e).html();f.selectedMonth=f.currentMonth=b;f.selectedYear=f.currentYear=c;this._selectDate(a,this._formatDate(f,f.currentDay,f.currentMonth,f.currentYear))}},_clearDate:function(a){a=d(a);this._getInst(a[0]);this._selectDate(a,
"")},_selectDate:function(a,b){a=this._getInst(d(a)[0]);b=b!=null?b:this._formatDate(a);a.input&&a.input.val(b);this._updateAlternate(a);var c=this._get(a,"onSelect");if(c)c.apply(a.input?a.input[0]:null,[b,a]);else a.input&&a.input.trigger("change");if(a.inline)this._updateDatepicker(a);else{this._hideDatepicker();this._lastInput=a.input[0];typeof a.input[0]!="object"&&a.input.focus();this._lastInput=null}},_updateAlternate:function(a){var b=this._get(a,"altField");if(b){var c=this._get(a,"altFormat")||
this._get(a,"dateFormat"),e=this._getDate(a),f=this.formatDate(c,e,this._getFormatConfig(a));d(b).each(function(){d(this).val(f)})}},noWeekends:function(a){a=a.getDay();return[a>0&&a<6,""]},iso8601Week:function(a){a=new Date(a.getTime());a.setDate(a.getDate()+4-(a.getDay()||7));var b=a.getTime();a.setMonth(0);a.setDate(1);return Math.floor(Math.round((b-a)/864E5)/7)+1},parseDate:function(a,b,c){if(a==null||b==null)throw"Invalid arguments";b=typeof b=="object"?b.toString():b+"";if(b=="")return null;
for(var e=(c?c.shortYearCutoff:null)||this._defaults.shortYearCutoff,f=(c?c.dayNamesShort:null)||this._defaults.dayNamesShort,h=(c?c.dayNames:null)||this._defaults.dayNames,i=(c?c.monthNamesShort:null)||this._defaults.monthNamesShort,g=(c?c.monthNames:null)||this._defaults.monthNames,k=c=-1,l=-1,u=-1,j=false,o=function(p){(p=z+1<a.length&&a.charAt(z+1)==p)&&z++;return p},m=function(p){o(p);p=new RegExp("^\\d{1,"+(p=="@"?14:p=="!"?20:p=="y"?4:p=="o"?3:2)+"}");p=b.substring(s).match(p);if(!p)throw"Missing number at position "+
s;s+=p[0].length;return parseInt(p[0],10)},n=function(p,w,G){p=o(p)?G:w;for(w=0;w<p.length;w++)if(b.substr(s,p[w].length)==p[w]){s+=p[w].length;return w+1}throw"Unknown name at position "+s;},r=function(){if(b.charAt(s)!=a.charAt(z))throw"Unexpected literal at position "+s;s++},s=0,z=0;z<a.length;z++)if(j)if(a.charAt(z)=="'"&&!o("'"))j=false;else r();else switch(a.charAt(z)){case "d":l=m("d");break;case "D":n("D",f,h);break;case "o":u=m("o");break;case "m":k=m("m");break;case "M":k=n("M",i,g);break;
case "y":c=m("y");break;case "@":var v=new Date(m("@"));c=v.getFullYear();k=v.getMonth()+1;l=v.getDate();break;case "!":v=new Date((m("!")-this._ticksTo1970)/1E4);c=v.getFullYear();k=v.getMonth()+1;l=v.getDate();break;case "'":if(o("'"))r();else j=true;break;default:r()}if(c==-1)c=(new Date).getFullYear();else if(c<100)c+=(new Date).getFullYear()-(new Date).getFullYear()%100+(c<=e?0:-100);if(u>-1){k=1;l=u;do{e=this._getDaysInMonth(c,k-1);if(l<=e)break;k++;l-=e}while(1)}v=this._daylightSavingAdjust(new Date(c,
k-1,l));if(v.getFullYear()!=c||v.getMonth()+1!=k||v.getDate()!=l)throw"Invalid date";return v},ATOM:"yy-mm-dd",COOKIE:"D, dd M yy",ISO_8601:"yy-mm-dd",RFC_822:"D, d M y",RFC_850:"DD, dd-M-y",RFC_1036:"D, d M y",RFC_1123:"D, d M yy",RFC_2822:"D, d M yy",RSS:"D, d M y",TICKS:"!",TIMESTAMP:"@",W3C:"yy-mm-dd",_ticksTo1970:(718685+Math.floor(492.5)-Math.floor(19.7)+Math.floor(4.925))*24*60*60*1E7,formatDate:function(a,b,c){if(!b)return"";var e=(c?c.dayNamesShort:null)||this._defaults.dayNamesShort,f=(c?
c.dayNames:null)||this._defaults.dayNames,h=(c?c.monthNamesShort:null)||this._defaults.monthNamesShort;c=(c?c.monthNames:null)||this._defaults.monthNames;var i=function(o){(o=j+1<a.length&&a.charAt(j+1)==o)&&j++;return o},g=function(o,m,n){m=""+m;if(i(o))for(;m.length<n;)m="0"+m;return m},k=function(o,m,n,r){return i(o)?r[m]:n[m]},l="",u=false;if(b)for(var j=0;j<a.length;j++)if(u)if(a.charAt(j)=="'"&&!i("'"))u=false;else l+=a.charAt(j);else switch(a.charAt(j)){case "d":l+=g("d",b.getDate(),2);break;
case "D":l+=k("D",b.getDay(),e,f);break;case "o":l+=g("o",(b.getTime()-(new Date(b.getFullYear(),0,0)).getTime())/864E5,3);break;case "m":l+=g("m",b.getMonth()+1,2);break;case "M":l+=k("M",b.getMonth(),h,c);break;case "y":l+=i("y")?b.getFullYear():(b.getYear()%100<10?"0":"")+b.getYear()%100;break;case "@":l+=b.getTime();break;case "!":l+=b.getTime()*1E4+this._ticksTo1970;break;case "'":if(i("'"))l+="'";else u=true;break;default:l+=a.charAt(j)}return l},_possibleChars:function(a){for(var b="",c=false,
e=function(h){(h=f+1<a.length&&a.charAt(f+1)==h)&&f++;return h},f=0;f<a.length;f++)if(c)if(a.charAt(f)=="'"&&!e("'"))c=false;else b+=a.charAt(f);else switch(a.charAt(f)){case "d":case "m":case "y":case "@":b+="0123456789";break;case "D":case "M":return null;case "'":if(e("'"))b+="'";else c=true;break;default:b+=a.charAt(f)}return b},_get:function(a,b){return a.settings[b]!==undefined?a.settings[b]:this._defaults[b]},_setDateFromField:function(a,b){if(a.input.val()!=a.lastVal){var c=this._get(a,"dateFormat"),
e=a.lastVal=a.input?a.input.val():null,f,h;f=h=this._getDefaultDate(a);var i=this._getFormatConfig(a);try{f=this.parseDate(c,e,i)||h}catch(g){this.log(g);e=b?"":e}a.selectedDay=f.getDate();a.drawMonth=a.selectedMonth=f.getMonth();a.drawYear=a.selectedYear=f.getFullYear();a.currentDay=e?f.getDate():0;a.currentMonth=e?f.getMonth():0;a.currentYear=e?f.getFullYear():0;this._adjustInstDate(a)}},_getDefaultDate:function(a){return this._restrictMinMax(a,this._determineDate(a,this._get(a,"defaultDate"),new Date))},
_determineDate:function(a,b,c){var e=function(h){var i=new Date;i.setDate(i.getDate()+h);return i},f=function(h){try{return d.datepicker.parseDate(d.datepicker._get(a,"dateFormat"),h,d.datepicker._getFormatConfig(a))}catch(i){}var g=(h.toLowerCase().match(/^c/)?d.datepicker._getDate(a):null)||new Date,k=g.getFullYear(),l=g.getMonth();g=g.getDate();for(var u=/([+-]?[0-9]+)\s*(d|D|w|W|m|M|y|Y)?/g,j=u.exec(h);j;){switch(j[2]||"d"){case "d":case "D":g+=parseInt(j[1],10);break;case "w":case "W":g+=parseInt(j[1],
10)*7;break;case "m":case "M":l+=parseInt(j[1],10);g=Math.min(g,d.datepicker._getDaysInMonth(k,l));break;case "y":case "Y":k+=parseInt(j[1],10);g=Math.min(g,d.datepicker._getDaysInMonth(k,l));break}j=u.exec(h)}return new Date(k,l,g)};if(b=(b=b==null?c:typeof b=="string"?f(b):typeof b=="number"?isNaN(b)?c:e(b):b)&&b.toString()=="Invalid Date"?c:b){b.setHours(0);b.setMinutes(0);b.setSeconds(0);b.setMilliseconds(0)}return this._daylightSavingAdjust(b)},_daylightSavingAdjust:function(a){if(!a)return null;
a.setHours(a.getHours()>12?a.getHours()+2:0);return a},_setDate:function(a,b,c){var e=!b,f=a.selectedMonth,h=a.selectedYear;b=this._restrictMinMax(a,this._determineDate(a,b,new Date));a.selectedDay=a.currentDay=b.getDate();a.drawMonth=a.selectedMonth=a.currentMonth=b.getMonth();a.drawYear=a.selectedYear=a.currentYear=b.getFullYear();if((f!=a.selectedMonth||h!=a.selectedYear)&&!c)this._notifyChange(a);this._adjustInstDate(a);if(a.input)a.input.val(e?"":this._formatDate(a))},_getDate:function(a){return!a.currentYear||
a.input&&a.input.val()==""?null:this._daylightSavingAdjust(new Date(a.currentYear,a.currentMonth,a.currentDay))},_generateHTML:function(a){var b=new Date;b=this._daylightSavingAdjust(new Date(b.getFullYear(),b.getMonth(),b.getDate()));var c=this._get(a,"isRTL"),e=this._get(a,"showButtonPanel"),f=this._get(a,"hideIfNoPrevNext"),h=this._get(a,"navigationAsDateFormat"),i=this._getNumberOfMonths(a),g=this._get(a,"showCurrentAtPos"),k=this._get(a,"stepMonths"),l=i[0]!=1||i[1]!=1,u=this._daylightSavingAdjust(!a.currentDay?
new Date(9999,9,9):new Date(a.currentYear,a.currentMonth,a.currentDay)),j=this._getMinMaxDate(a,"min"),o=this._getMinMaxDate(a,"max");g=a.drawMonth-g;var m=a.drawYear;if(g<0){g+=12;m--}if(o){var n=this._daylightSavingAdjust(new Date(o.getFullYear(),o.getMonth()-i[0]*i[1]+1,o.getDate()));for(n=j&&n<j?j:n;this._daylightSavingAdjust(new Date(m,g,1))>n;){g--;if(g<0){g=11;m--}}}a.drawMonth=g;a.drawYear=m;n=this._get(a,"prevText");n=!h?n:this.formatDate(n,this._daylightSavingAdjust(new Date(m,g-k,1)),this._getFormatConfig(a));
n=this._canAdjustMonth(a,-1,m,g)?'<a class="ui-datepicker-prev ui-corner-all" onclick="DP_jQuery_'+y+".datepicker._adjustDate('#"+a.id+"', -"+k+", 'M');\" title=\""+n+'"><span class="ui-icon ui-icon-circle-triangle-'+(c?"e":"w")+'">'+n+"</span></a>":f?"":'<a class="ui-datepicker-prev ui-corner-all ui-state-disabled" title="'+n+'"><span class="ui-icon ui-icon-circle-triangle-'+(c?"e":"w")+'">'+n+"</span></a>";var r=this._get(a,"nextText");r=!h?r:this.formatDate(r,this._daylightSavingAdjust(new Date(m,
g+k,1)),this._getFormatConfig(a));f=this._canAdjustMonth(a,+1,m,g)?'<a class="ui-datepicker-next ui-corner-all" onclick="DP_jQuery_'+y+".datepicker._adjustDate('#"+a.id+"', +"+k+", 'M');\" title=\""+r+'"><span class="ui-icon ui-icon-circle-triangle-'+(c?"w":"e")+'">'+r+"</span></a>":f?"":'<a class="ui-datepicker-next ui-corner-all ui-state-disabled" title="'+r+'"><span class="ui-icon ui-icon-circle-triangle-'+(c?"w":"e")+'">'+r+"</span></a>";k=this._get(a,"currentText");r=this._get(a,"gotoCurrent")&&
a.currentDay?u:b;k=!h?k:this.formatDate(k,r,this._getFormatConfig(a));h=!a.inline?'<button type="button" class="ui-datepicker-close ui-state-default ui-priority-primary ui-corner-all" onclick="DP_jQuery_'+y+'.datepicker._hideDatepicker();">'+this._get(a,"closeText")+"</button>":"";e=e?'<div class="ui-datepicker-buttonpane ui-widget-content">'+(c?h:"")+(this._isInRange(a,r)?'<button type="button" class="ui-datepicker-current ui-state-default ui-priority-secondary ui-corner-all" onclick="DP_jQuery_'+
y+".datepicker._gotoToday('#"+a.id+"');\">"+k+"</button>":"")+(c?"":h)+"</div>":"";h=parseInt(this._get(a,"firstDay"),10);h=isNaN(h)?0:h;k=this._get(a,"showWeek");r=this._get(a,"dayNames");this._get(a,"dayNamesShort");var s=this._get(a,"dayNamesMin"),z=this._get(a,"monthNames"),v=this._get(a,"monthNamesShort"),p=this._get(a,"beforeShowDay"),w=this._get(a,"showOtherMonths"),G=this._get(a,"selectOtherMonths");this._get(a,"calculateWeek");for(var K=this._getDefaultDate(a),H="",C=0;C<i[0];C++){for(var L=
"",D=0;D<i[1];D++){var M=this._daylightSavingAdjust(new Date(m,g,a.selectedDay)),t=" ui-corner-all",x="";if(l){x+='<div class="ui-datepicker-group';if(i[1]>1)switch(D){case 0:x+=" ui-datepicker-group-first";t=" ui-corner-"+(c?"right":"left");break;case i[1]-1:x+=" ui-datepicker-group-last";t=" ui-corner-"+(c?"left":"right");break;default:x+=" ui-datepicker-group-middle";t="";break}x+='">'}x+='<div class="ui-datepicker-header ui-widget-header ui-helper-clearfix'+t+'">'+(/all|left/.test(t)&&C==0?c?
f:n:"")+(/all|right/.test(t)&&C==0?c?n:f:"")+this._generateMonthYearHeader(a,g,m,j,o,C>0||D>0,z,v)+'</div><table class="ui-datepicker-calendar"><thead><tr>';var A=k?'<th class="ui-datepicker-week-col">'+this._get(a,"weekHeader")+"</th>":"";for(t=0;t<7;t++){var q=(t+h)%7;A+="<th"+((t+h+6)%7>=5?' class="ui-datepicker-week-end"':"")+'><span title="'+r[q]+'">'+s[q]+"</span></th>"}x+=A+"</tr></thead><tbody>";A=this._getDaysInMonth(m,g);if(m==a.selectedYear&&g==a.selectedMonth)a.selectedDay=Math.min(a.selectedDay,
A);t=(this._getFirstDayOfMonth(m,g)-h+7)%7;A=l?6:Math.ceil((t+A)/7);q=this._daylightSavingAdjust(new Date(m,g,1-t));for(var N=0;N<A;N++){x+="<tr>";var O=!k?"":'<td class="ui-datepicker-week-col">'+this._get(a,"calculateWeek")(q)+"</td>";for(t=0;t<7;t++){var F=p?p.apply(a.input?a.input[0]:null,[q]):[true,""],B=q.getMonth()!=g,I=B&&!G||!F[0]||j&&q<j||o&&q>o;O+='<td class="'+((t+h+6)%7>=5?" ui-datepicker-week-end":"")+(B?" ui-datepicker-other-month":"")+(q.getTime()==M.getTime()&&g==a.selectedMonth&&
a._keyEvent||K.getTime()==q.getTime()&&K.getTime()==M.getTime()?" "+this._dayOverClass:"")+(I?" "+this._unselectableClass+" ui-state-disabled":"")+(B&&!w?"":" "+F[1]+(q.getTime()==u.getTime()?" "+this._currentClass:"")+(q.getTime()==b.getTime()?" ui-datepicker-today":""))+'"'+((!B||w)&&F[2]?' title="'+F[2]+'"':"")+(I?"":' onclick="DP_jQuery_'+y+".datepicker._selectDay('#"+a.id+"',"+q.getMonth()+","+q.getFullYear()+', this);return false;"')+">"+(B&&!w?"&#xa0;":I?'<span class="ui-state-default">'+q.getDate()+
"</span>":'<a class="ui-state-default'+(q.getTime()==b.getTime()?" ui-state-highlight":"")+(q.getTime()==u.getTime()?" ui-state-active":"")+(B?" ui-priority-secondary":"")+'" href="#">'+q.getDate()+"</a>")+"</td>";q.setDate(q.getDate()+1);q=this._daylightSavingAdjust(q)}x+=O+"</tr>"}g++;if(g>11){g=0;m++}x+="</tbody></table>"+(l?"</div>"+(i[0]>0&&D==i[1]-1?'<div class="ui-datepicker-row-break"></div>':""):"");L+=x}H+=L}H+=e+(d.browser.msie&&parseInt(d.browser.version,10)<7&&!a.inline?'<iframe src="javascript:false;" class="ui-datepicker-cover" frameborder="0"></iframe>':
"");a._keyEvent=false;return H},_generateMonthYearHeader:function(a,b,c,e,f,h,i,g){var k=this._get(a,"changeMonth"),l=this._get(a,"changeYear"),u=this._get(a,"showMonthAfterYear"),j='<div class="ui-datepicker-title">',o="";if(h||!k)o+='<span class="ui-datepicker-month">'+i[b]+"</span>";else{i=e&&e.getFullYear()==c;var m=f&&f.getFullYear()==c;o+='<select class="ui-datepicker-month" onchange="DP_jQuery_'+y+".datepicker._selectMonthYear('#"+a.id+"', this, 'M');\" onclick=\"DP_jQuery_"+y+".datepicker._clickMonthYear('#"+
a.id+"');\">";for(var n=0;n<12;n++)if((!i||n>=e.getMonth())&&(!m||n<=f.getMonth()))o+='<option value="'+n+'"'+(n==b?' selected="selected"':"")+">"+g[n]+"</option>";o+="</select>"}u||(j+=o+(h||!(k&&l)?"&#xa0;":""));if(h||!l)j+='<span class="ui-datepicker-year">'+c+"</span>";else{g=this._get(a,"yearRange").split(":");var r=(new Date).getFullYear();i=function(s){s=s.match(/c[+-].*/)?c+parseInt(s.substring(1),10):s.match(/[+-].*/)?r+parseInt(s,10):parseInt(s,10);return isNaN(s)?r:s};b=i(g[0]);g=Math.max(b,
i(g[1]||""));b=e?Math.max(b,e.getFullYear()):b;g=f?Math.min(g,f.getFullYear()):g;for(j+='<select class="ui-datepicker-year" onchange="DP_jQuery_'+y+".datepicker._selectMonthYear('#"+a.id+"', this, 'Y');\" onclick=\"DP_jQuery_"+y+".datepicker._clickMonthYear('#"+a.id+"');\">";b<=g;b++)j+='<option value="'+b+'"'+(b==c?' selected="selected"':"")+">"+b+"</option>";j+="</select>"}j+=this._get(a,"yearSuffix");if(u)j+=(h||!(k&&l)?"&#xa0;":"")+o;j+="</div>";return j},_adjustInstDate:function(a,b,c){var e=
a.drawYear+(c=="Y"?b:0),f=a.drawMonth+(c=="M"?b:0);b=Math.min(a.selectedDay,this._getDaysInMonth(e,f))+(c=="D"?b:0);e=this._restrictMinMax(a,this._daylightSavingAdjust(new Date(e,f,b)));a.selectedDay=e.getDate();a.drawMonth=a.selectedMonth=e.getMonth();a.drawYear=a.selectedYear=e.getFullYear();if(c=="M"||c=="Y")this._notifyChange(a)},_restrictMinMax:function(a,b){var c=this._getMinMaxDate(a,"min");a=this._getMinMaxDate(a,"max");b=c&&b<c?c:b;return b=a&&b>a?a:b},_notifyChange:function(a){var b=this._get(a,
"onChangeMonthYear");if(b)b.apply(a.input?a.input[0]:null,[a.selectedYear,a.selectedMonth+1,a])},_getNumberOfMonths:function(a){a=this._get(a,"numberOfMonths");return a==null?[1,1]:typeof a=="number"?[1,a]:a},_getMinMaxDate:function(a,b){return this._determineDate(a,this._get(a,b+"Date"),null)},_getDaysInMonth:function(a,b){return 32-(new Date(a,b,32)).getDate()},_getFirstDayOfMonth:function(a,b){return(new Date(a,b,1)).getDay()},_canAdjustMonth:function(a,b,c,e){var f=this._getNumberOfMonths(a);
c=this._daylightSavingAdjust(new Date(c,e+(b<0?b:f[0]*f[1]),1));b<0&&c.setDate(this._getDaysInMonth(c.getFullYear(),c.getMonth()));return this._isInRange(a,c)},_isInRange:function(a,b){var c=this._getMinMaxDate(a,"min");a=this._getMinMaxDate(a,"max");return(!c||b.getTime()>=c.getTime())&&(!a||b.getTime()<=a.getTime())},_getFormatConfig:function(a){var b=this._get(a,"shortYearCutoff");b=typeof b!="string"?b:(new Date).getFullYear()%100+parseInt(b,10);return{shortYearCutoff:b,dayNamesShort:this._get(a,
"dayNamesShort"),dayNames:this._get(a,"dayNames"),monthNamesShort:this._get(a,"monthNamesShort"),monthNames:this._get(a,"monthNames")}},_formatDate:function(a,b,c,e){if(!b){a.currentDay=a.selectedDay;a.currentMonth=a.selectedMonth;a.currentYear=a.selectedYear}b=b?typeof b=="object"?b:this._daylightSavingAdjust(new Date(e,c,b)):this._daylightSavingAdjust(new Date(a.currentYear,a.currentMonth,a.currentDay));return this.formatDate(this._get(a,"dateFormat"),b,this._getFormatConfig(a))}});d.fn.datepicker=
function(a){if(!d.datepicker.initialized){d(document).mousedown(d.datepicker._checkExternalClick).find("body").append(d.datepicker.dpDiv);d.datepicker.initialized=true}var b=Array.prototype.slice.call(arguments,1);if(typeof a=="string"&&(a=="isDisabled"||a=="getDate"||a=="widget"))return d.datepicker["_"+a+"Datepicker"].apply(d.datepicker,[this[0]].concat(b));if(a=="option"&&arguments.length==2&&typeof arguments[1]=="string")return d.datepicker["_"+a+"Datepicker"].apply(d.datepicker,[this[0]].concat(b));
return this.each(function(){typeof a=="string"?d.datepicker["_"+a+"Datepicker"].apply(d.datepicker,[this].concat(b)):d.datepicker._attachDatepicker(this,a)})};d.datepicker=new J;d.datepicker.initialized=false;d.datepicker.uuid=(new Date).getTime();d.datepicker.version="1.8.2";window["DP_jQuery_"+y]=d})(jQuery);
/*
 * jQuery UI Progressbar 1.8.2
 *
 * Copyright (c) 2010 AUTHORS.txt (http://jqueryui.com/about)
 * Dual licensed under the MIT (MIT-LICENSE.txt)
 * and GPL (GPL-LICENSE.txt) licenses.
 *
 * http://docs.jquery.com/UI/Progressbar
 *
 * Depends:
 *   jquery.ui.core.js
 *   jquery.ui.widget.js
 */
(function(b){b.widget("ui.progressbar",{options:{value:0},_create:function(){this.element.addClass("ui-progressbar ui-widget ui-widget-content ui-corner-all").attr({role:"progressbar","aria-valuemin":this._valueMin(),"aria-valuemax":this._valueMax(),"aria-valuenow":this._value()});this.valueDiv=b("<div class='ui-progressbar-value ui-widget-header ui-corner-left'></div>").appendTo(this.element);this._refreshValue()},destroy:function(){this.element.removeClass("ui-progressbar ui-widget ui-widget-content ui-corner-all").removeAttr("role").removeAttr("aria-valuemin").removeAttr("aria-valuemax").removeAttr("aria-valuenow");
this.valueDiv.remove();b.Widget.prototype.destroy.apply(this,arguments)},value:function(a){if(a===undefined)return this._value();this._setOption("value",a);return this},_setOption:function(a,c){switch(a){case "value":this.options.value=c;this._refreshValue();this._trigger("change");break}b.Widget.prototype._setOption.apply(this,arguments)},_value:function(){var a=this.options.value;if(typeof a!=="number")a=0;if(a<this._valueMin())a=this._valueMin();if(a>this._valueMax())a=this._valueMax();return a},
_valueMin:function(){return 0},_valueMax:function(){return 100},_refreshValue:function(){var a=this.value();this.valueDiv[a===this._valueMax()?"addClass":"removeClass"]("ui-corner-right").width(a+"%");this.element.attr("aria-valuenow",a)}});b.extend(b.ui.progressbar,{version:"1.8.2"})})(jQuery);
;/*
 * jQuery UI Effects 1.8.2
 *
 * Copyright (c) 2010 AUTHORS.txt (http://jqueryui.com/about)
 * Dual licensed under the MIT (MIT-LICENSE.txt)
 * and GPL (GPL-LICENSE.txt) licenses.
 *
 * http://docs.jquery.com/UI/Effects/
 */
jQuery.effects||function(f){function k(c){var a;if(c&&c.constructor==Array&&c.length==3)return c;if(a=/rgb\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*\)/.exec(c))return[parseInt(a[1],10),parseInt(a[2],10),parseInt(a[3],10)];if(a=/rgb\(\s*([0-9]+(?:\.[0-9]+)?)\%\s*,\s*([0-9]+(?:\.[0-9]+)?)\%\s*,\s*([0-9]+(?:\.[0-9]+)?)\%\s*\)/.exec(c))return[parseFloat(a[1])*2.55,parseFloat(a[2])*2.55,parseFloat(a[3])*2.55];if(a=/#([a-fA-F0-9]{2})([a-fA-F0-9]{2})([a-fA-F0-9]{2})/.exec(c))return[parseInt(a[1],
16),parseInt(a[2],16),parseInt(a[3],16)];if(a=/#([a-fA-F0-9])([a-fA-F0-9])([a-fA-F0-9])/.exec(c))return[parseInt(a[1]+a[1],16),parseInt(a[2]+a[2],16),parseInt(a[3]+a[3],16)];if(/rgba\(0, 0, 0, 0\)/.exec(c))return l.transparent;return l[f.trim(c).toLowerCase()]}function q(c,a){var b;do{b=f.curCSS(c,a);if(b!=""&&b!="transparent"||f.nodeName(c,"body"))break;a="backgroundColor"}while(c=c.parentNode);return k(b)}function m(){var c=document.defaultView?document.defaultView.getComputedStyle(this,null):this.currentStyle,
a={},b,d;if(c&&c.length&&c[0]&&c[c[0]])for(var e=c.length;e--;){b=c[e];if(typeof c[b]=="string"){d=b.replace(/\-(\w)/g,function(g,h){return h.toUpperCase()});a[d]=c[b]}}else for(b in c)if(typeof c[b]==="string")a[b]=c[b];return a}function n(c){var a,b;for(a in c){b=c[a];if(b==null||f.isFunction(b)||a in r||/scrollbar/.test(a)||!/color/i.test(a)&&isNaN(parseFloat(b)))delete c[a]}return c}function s(c,a){var b={_:0},d;for(d in a)if(c[d]!=a[d])b[d]=a[d];return b}function j(c,a,b,d){if(typeof c=="object"){d=
a;b=null;a=c;c=a.effect}if(f.isFunction(a)){d=a;b=null;a={}}if(f.isFunction(b)){d=b;b=null}if(typeof a=="number"||f.fx.speeds[a]){d=b;b=a;a={}}a=a||{};b=b||a.duration;b=f.fx.off?0:typeof b=="number"?b:f.fx.speeds[b]||f.fx.speeds._default;d=d||a.complete;return[c,a,b,d]}f.effects={};f.each(["backgroundColor","borderBottomColor","borderLeftColor","borderRightColor","borderTopColor","color","outlineColor"],function(c,a){f.fx.step[a]=function(b){if(!b.colorInit){b.start=q(b.elem,a);b.end=k(b.end);b.colorInit=
true}b.elem.style[a]="rgb("+Math.max(Math.min(parseInt(b.pos*(b.end[0]-b.start[0])+b.start[0],10),255),0)+","+Math.max(Math.min(parseInt(b.pos*(b.end[1]-b.start[1])+b.start[1],10),255),0)+","+Math.max(Math.min(parseInt(b.pos*(b.end[2]-b.start[2])+b.start[2],10),255),0)+")"}});var l={aqua:[0,255,255],azure:[240,255,255],beige:[245,245,220],black:[0,0,0],blue:[0,0,255],brown:[165,42,42],cyan:[0,255,255],darkblue:[0,0,139],darkcyan:[0,139,139],darkgrey:[169,169,169],darkgreen:[0,100,0],darkkhaki:[189,
183,107],darkmagenta:[139,0,139],darkolivegreen:[85,107,47],darkorange:[255,140,0],darkorchid:[153,50,204],darkred:[139,0,0],darksalmon:[233,150,122],darkviolet:[148,0,211],fuchsia:[255,0,255],gold:[255,215,0],green:[0,128,0],indigo:[75,0,130],khaki:[240,230,140],lightblue:[173,216,230],lightcyan:[224,255,255],lightgreen:[144,238,144],lightgrey:[211,211,211],lightpink:[255,182,193],lightyellow:[255,255,224],lime:[0,255,0],magenta:[255,0,255],maroon:[128,0,0],navy:[0,0,128],olive:[128,128,0],orange:[255,
165,0],pink:[255,192,203],purple:[128,0,128],violet:[128,0,128],red:[255,0,0],silver:[192,192,192],white:[255,255,255],yellow:[255,255,0],transparent:[255,255,255]},o=["add","remove","toggle"],r={border:1,borderBottom:1,borderColor:1,borderLeft:1,borderRight:1,borderTop:1,borderWidth:1,margin:1,padding:1};f.effects.animateClass=function(c,a,b,d){if(f.isFunction(b)){d=b;b=null}return this.each(function(){var e=f(this),g=e.attr("style")||" ",h=n(m.call(this)),p,t=e.attr("className");f.each(o,function(u,
i){c[i]&&e[i+"Class"](c[i])});p=n(m.call(this));e.attr("className",t);e.animate(s(h,p),a,b,function(){f.each(o,function(u,i){c[i]&&e[i+"Class"](c[i])});if(typeof e.attr("style")=="object"){e.attr("style").cssText="";e.attr("style").cssText=g}else e.attr("style",g);d&&d.apply(this,arguments)})})};f.fn.extend({_addClass:f.fn.addClass,addClass:function(c,a,b,d){return a?f.effects.animateClass.apply(this,[{add:c},a,b,d]):this._addClass(c)},_removeClass:f.fn.removeClass,removeClass:function(c,a,b,d){return a?
f.effects.animateClass.apply(this,[{remove:c},a,b,d]):this._removeClass(c)},_toggleClass:f.fn.toggleClass,toggleClass:function(c,a,b,d,e){return typeof a=="boolean"||a===undefined?b?f.effects.animateClass.apply(this,[a?{add:c}:{remove:c},b,d,e]):this._toggleClass(c,a):f.effects.animateClass.apply(this,[{toggle:c},a,b,d])},switchClass:function(c,a,b,d,e){return f.effects.animateClass.apply(this,[{add:a,remove:c},b,d,e])}});f.extend(f.effects,{version:"1.8.2",save:function(c,a){for(var b=0;b<a.length;b++)a[b]!==
null&&c.data("ec.storage."+a[b],c[0].style[a[b]])},restore:function(c,a){for(var b=0;b<a.length;b++)a[b]!==null&&c.css(a[b],c.data("ec.storage."+a[b]))},setMode:function(c,a){if(a=="toggle")a=c.is(":hidden")?"show":"hide";return a},getBaseline:function(c,a){var b;switch(c[0]){case "top":b=0;break;case "middle":b=0.5;break;case "bottom":b=1;break;default:b=c[0]/a.height}switch(c[1]){case "left":c=0;break;case "center":c=0.5;break;case "right":c=1;break;default:c=c[1]/a.width}return{x:c,y:b}},createWrapper:function(c){if(c.parent().is(".ui-effects-wrapper"))return c.parent();
var a={width:c.outerWidth(true),height:c.outerHeight(true),"float":c.css("float")},b=f("<div></div>").addClass("ui-effects-wrapper").css({fontSize:"100%",background:"transparent",border:"none",margin:0,padding:0});c.wrap(b);b=c.parent();if(c.css("position")=="static"){b.css({position:"relative"});c.css({position:"relative"})}else{f.extend(a,{position:c.css("position"),zIndex:c.css("z-index")});f.each(["top","left","bottom","right"],function(d,e){a[e]=c.css(e);if(isNaN(parseInt(a[e],10)))a[e]="auto"});
c.css({position:"relative",top:0,left:0})}return b.css(a).show()},removeWrapper:function(c){if(c.parent().is(".ui-effects-wrapper"))return c.parent().replaceWith(c);return c},setTransition:function(c,a,b,d){d=d||{};f.each(a,function(e,g){unit=c.cssUnit(g);if(unit[0]>0)d[g]=unit[0]*b+unit[1]});return d}});f.fn.extend({effect:function(c){var a=j.apply(this,arguments);a={options:a[1],duration:a[2],callback:a[3]};var b=f.effects[c];return b&&!f.fx.off?b.call(this,a):this},_show:f.fn.show,show:function(c){if(!c||
typeof c=="number"||f.fx.speeds[c])return this._show.apply(this,arguments);else{var a=j.apply(this,arguments);a[1].mode="show";return this.effect.apply(this,a)}},_hide:f.fn.hide,hide:function(c){if(!c||typeof c=="number"||f.fx.speeds[c])return this._hide.apply(this,arguments);else{var a=j.apply(this,arguments);a[1].mode="hide";return this.effect.apply(this,a)}},__toggle:f.fn.toggle,toggle:function(c){if(!c||typeof c=="number"||f.fx.speeds[c]||typeof c=="boolean"||f.isFunction(c))return this.__toggle.apply(this,
arguments);else{var a=j.apply(this,arguments);a[1].mode="toggle";return this.effect.apply(this,a)}},cssUnit:function(c){var a=this.css(c),b=[];f.each(["em","px","%","pt"],function(d,e){if(a.indexOf(e)>0)b=[parseFloat(a),e]});return b}});f.easing.jswing=f.easing.swing;f.extend(f.easing,{def:"easeOutQuad",swing:function(c,a,b,d,e){return f.easing[f.easing.def](c,a,b,d,e)},easeInQuad:function(c,a,b,d,e){return d*(a/=e)*a+b},easeOutQuad:function(c,a,b,d,e){return-d*(a/=e)*(a-2)+b},easeInOutQuad:function(c,
a,b,d,e){if((a/=e/2)<1)return d/2*a*a+b;return-d/2*(--a*(a-2)-1)+b},easeInCubic:function(c,a,b,d,e){return d*(a/=e)*a*a+b},easeOutCubic:function(c,a,b,d,e){return d*((a=a/e-1)*a*a+1)+b},easeInOutCubic:function(c,a,b,d,e){if((a/=e/2)<1)return d/2*a*a*a+b;return d/2*((a-=2)*a*a+2)+b},easeInQuart:function(c,a,b,d,e){return d*(a/=e)*a*a*a+b},easeOutQuart:function(c,a,b,d,e){return-d*((a=a/e-1)*a*a*a-1)+b},easeInOutQuart:function(c,a,b,d,e){if((a/=e/2)<1)return d/2*a*a*a*a+b;return-d/2*((a-=2)*a*a*a-2)+
b},easeInQuint:function(c,a,b,d,e){return d*(a/=e)*a*a*a*a+b},easeOutQuint:function(c,a,b,d,e){return d*((a=a/e-1)*a*a*a*a+1)+b},easeInOutQuint:function(c,a,b,d,e){if((a/=e/2)<1)return d/2*a*a*a*a*a+b;return d/2*((a-=2)*a*a*a*a+2)+b},easeInSine:function(c,a,b,d,e){return-d*Math.cos(a/e*(Math.PI/2))+d+b},easeOutSine:function(c,a,b,d,e){return d*Math.sin(a/e*(Math.PI/2))+b},easeInOutSine:function(c,a,b,d,e){return-d/2*(Math.cos(Math.PI*a/e)-1)+b},easeInExpo:function(c,a,b,d,e){return a==0?b:d*Math.pow(2,
10*(a/e-1))+b},easeOutExpo:function(c,a,b,d,e){return a==e?b+d:d*(-Math.pow(2,-10*a/e)+1)+b},easeInOutExpo:function(c,a,b,d,e){if(a==0)return b;if(a==e)return b+d;if((a/=e/2)<1)return d/2*Math.pow(2,10*(a-1))+b;return d/2*(-Math.pow(2,-10*--a)+2)+b},easeInCirc:function(c,a,b,d,e){return-d*(Math.sqrt(1-(a/=e)*a)-1)+b},easeOutCirc:function(c,a,b,d,e){return d*Math.sqrt(1-(a=a/e-1)*a)+b},easeInOutCirc:function(c,a,b,d,e){if((a/=e/2)<1)return-d/2*(Math.sqrt(1-a*a)-1)+b;return d/2*(Math.sqrt(1-(a-=2)*
a)+1)+b},easeInElastic:function(c,a,b,d,e){c=1.70158;var g=0,h=d;if(a==0)return b;if((a/=e)==1)return b+d;g||(g=e*0.3);if(h<Math.abs(d)){h=d;c=g/4}else c=g/(2*Math.PI)*Math.asin(d/h);return-(h*Math.pow(2,10*(a-=1))*Math.sin((a*e-c)*2*Math.PI/g))+b},easeOutElastic:function(c,a,b,d,e){c=1.70158;var g=0,h=d;if(a==0)return b;if((a/=e)==1)return b+d;g||(g=e*0.3);if(h<Math.abs(d)){h=d;c=g/4}else c=g/(2*Math.PI)*Math.asin(d/h);return h*Math.pow(2,-10*a)*Math.sin((a*e-c)*2*Math.PI/g)+d+b},easeInOutElastic:function(c,
a,b,d,e){c=1.70158;var g=0,h=d;if(a==0)return b;if((a/=e/2)==2)return b+d;g||(g=e*0.3*1.5);if(h<Math.abs(d)){h=d;c=g/4}else c=g/(2*Math.PI)*Math.asin(d/h);if(a<1)return-0.5*h*Math.pow(2,10*(a-=1))*Math.sin((a*e-c)*2*Math.PI/g)+b;return h*Math.pow(2,-10*(a-=1))*Math.sin((a*e-c)*2*Math.PI/g)*0.5+d+b},easeInBack:function(c,a,b,d,e,g){if(g==undefined)g=1.70158;return d*(a/=e)*a*((g+1)*a-g)+b},easeOutBack:function(c,a,b,d,e,g){if(g==undefined)g=1.70158;return d*((a=a/e-1)*a*((g+1)*a+g)+1)+b},easeInOutBack:function(c,
a,b,d,e,g){if(g==undefined)g=1.70158;if((a/=e/2)<1)return d/2*a*a*(((g*=1.525)+1)*a-g)+b;return d/2*((a-=2)*a*(((g*=1.525)+1)*a+g)+2)+b},easeInBounce:function(c,a,b,d,e){return d-f.easing.easeOutBounce(c,e-a,0,d,e)+b},easeOutBounce:function(c,a,b,d,e){return(a/=e)<1/2.75?d*7.5625*a*a+b:a<2/2.75?d*(7.5625*(a-=1.5/2.75)*a+0.75)+b:a<2.5/2.75?d*(7.5625*(a-=2.25/2.75)*a+0.9375)+b:d*(7.5625*(a-=2.625/2.75)*a+0.984375)+b},easeInOutBounce:function(c,a,b,d,e){if(a<e/2)return f.easing.easeInBounce(c,a*2,0,
d,e)*0.5+b;return f.easing.easeOutBounce(c,a*2-e,0,d,e)*0.5+d*0.5+b}})}(jQuery);
/*
 * jQuery UI Effects Blind 1.8.2
 *
 * Copyright (c) 2010 AUTHORS.txt (http://jqueryui.com/about)
 * Dual licensed under the MIT (MIT-LICENSE.txt)
 * and GPL (GPL-LICENSE.txt) licenses.
 *
 * http://docs.jquery.com/UI/Effects/Blind
 *
 * Depends:
 *	jquery.effects.core.js
 */
(function(b){b.effects.blind=function(c){return this.queue(function(){var a=b(this),g=["position","top","left"],f=b.effects.setMode(a,c.options.mode||"hide"),d=c.options.direction||"vertical";b.effects.save(a,g);a.show();var e=b.effects.createWrapper(a).css({overflow:"hidden"}),h=d=="vertical"?"height":"width";d=d=="vertical"?e.height():e.width();f=="show"&&e.css(h,0);var i={};i[h]=f=="show"?d:0;e.animate(i,c.duration,c.options.easing,function(){f=="hide"&&a.hide();b.effects.restore(a,g);b.effects.removeWrapper(a);
c.callback&&c.callback.apply(a[0],arguments);a.dequeue()})})}})(jQuery);
/*
 * jQuery UI Effects Bounce 1.8.2
 *
 * Copyright (c) 2010 AUTHORS.txt (http://jqueryui.com/about)
 * Dual licensed under the MIT (MIT-LICENSE.txt)
 * and GPL (GPL-LICENSE.txt) licenses.
 *
 * http://docs.jquery.com/UI/Effects/Bounce
 *
 * Depends:
 *	jquery.effects.core.js
 */
(function(e){e.effects.bounce=function(b){return this.queue(function(){var a=e(this),l=["position","top","left"],h=e.effects.setMode(a,b.options.mode||"effect"),d=b.options.direction||"up",c=b.options.distance||20,m=b.options.times||5,i=b.duration||250;/show|hide/.test(h)&&l.push("opacity");e.effects.save(a,l);a.show();e.effects.createWrapper(a);var f=d=="up"||d=="down"?"top":"left";d=d=="up"||d=="left"?"pos":"neg";c=b.options.distance||(f=="top"?a.outerHeight({margin:true})/3:a.outerWidth({margin:true})/
3);if(h=="show")a.css("opacity",0).css(f,d=="pos"?-c:c);if(h=="hide")c/=m*2;h!="hide"&&m--;if(h=="show"){var g={opacity:1};g[f]=(d=="pos"?"+=":"-=")+c;a.animate(g,i/2,b.options.easing);c/=2;m--}for(g=0;g<m;g++){var j={},k={};j[f]=(d=="pos"?"-=":"+=")+c;k[f]=(d=="pos"?"+=":"-=")+c;a.animate(j,i/2,b.options.easing).animate(k,i/2,b.options.easing);c=h=="hide"?c*2:c/2}if(h=="hide"){g={opacity:0};g[f]=(d=="pos"?"-=":"+=")+c;a.animate(g,i/2,b.options.easing,function(){a.hide();e.effects.restore(a,l);e.effects.removeWrapper(a);
b.callback&&b.callback.apply(this,arguments)})}else{j={};k={};j[f]=(d=="pos"?"-=":"+=")+c;k[f]=(d=="pos"?"+=":"-=")+c;a.animate(j,i/2,b.options.easing).animate(k,i/2,b.options.easing,function(){e.effects.restore(a,l);e.effects.removeWrapper(a);b.callback&&b.callback.apply(this,arguments)})}a.queue("fx",function(){a.dequeue()});a.dequeue()})}})(jQuery);
/*
 * jQuery UI Effects Clip 1.8.2
 *
 * Copyright (c) 2010 AUTHORS.txt (http://jqueryui.com/about)
 * Dual licensed under the MIT (MIT-LICENSE.txt)
 * and GPL (GPL-LICENSE.txt) licenses.
 *
 * http://docs.jquery.com/UI/Effects/Clip
 *
 * Depends:
 *	jquery.effects.core.js
 */
(function(b){b.effects.clip=function(e){return this.queue(function(){var a=b(this),i=["position","top","left","height","width"],f=b.effects.setMode(a,e.options.mode||"hide"),c=e.options.direction||"vertical";b.effects.save(a,i);a.show();var d=b.effects.createWrapper(a).css({overflow:"hidden"});d=a[0].tagName=="IMG"?d:a;var g={size:c=="vertical"?"height":"width",position:c=="vertical"?"top":"left"};c=c=="vertical"?d.height():d.width();if(f=="show"){d.css(g.size,0);d.css(g.position,c/2)}var h={};h[g.size]=
f=="show"?c:0;h[g.position]=f=="show"?0:c/2;d.animate(h,{queue:false,duration:e.duration,easing:e.options.easing,complete:function(){f=="hide"&&a.hide();b.effects.restore(a,i);b.effects.removeWrapper(a);e.callback&&e.callback.apply(a[0],arguments);a.dequeue()}})})}})(jQuery);
/*
 * jQuery UI Effects Drop 1.8.2
 *
 * Copyright (c) 2010 AUTHORS.txt (http://jqueryui.com/about)
 * Dual licensed under the MIT (MIT-LICENSE.txt)
 * and GPL (GPL-LICENSE.txt) licenses.
 *
 * http://docs.jquery.com/UI/Effects/Drop
 *
 * Depends:
 *	jquery.effects.core.js
 */
(function(c){c.effects.drop=function(d){return this.queue(function(){var a=c(this),h=["position","top","left","opacity"],e=c.effects.setMode(a,d.options.mode||"hide"),b=d.options.direction||"left";c.effects.save(a,h);a.show();c.effects.createWrapper(a);var f=b=="up"||b=="down"?"top":"left";b=b=="up"||b=="left"?"pos":"neg";var g=d.options.distance||(f=="top"?a.outerHeight({margin:true})/2:a.outerWidth({margin:true})/2);if(e=="show")a.css("opacity",0).css(f,b=="pos"?-g:g);var i={opacity:e=="show"?1:
0};i[f]=(e=="show"?b=="pos"?"+=":"-=":b=="pos"?"-=":"+=")+g;a.animate(i,{queue:false,duration:d.duration,easing:d.options.easing,complete:function(){e=="hide"&&a.hide();c.effects.restore(a,h);c.effects.removeWrapper(a);d.callback&&d.callback.apply(this,arguments);a.dequeue()}})})}})(jQuery);
;/*
 * jQuery UI Effects Explode 1.8.2
 *
 * Copyright (c) 2010 AUTHORS.txt (http://jqueryui.com/about)
 * Dual licensed under the MIT (MIT-LICENSE.txt)
 * and GPL (GPL-LICENSE.txt) licenses.
 *
 * http://docs.jquery.com/UI/Effects/Explode
 *
 * Depends:
 *	jquery.effects.core.js
 */
(function(j){j.effects.explode=function(a){return this.queue(function(){var c=a.options.pieces?Math.round(Math.sqrt(a.options.pieces)):3,d=a.options.pieces?Math.round(Math.sqrt(a.options.pieces)):3;a.options.mode=a.options.mode=="toggle"?j(this).is(":visible")?"hide":"show":a.options.mode;var b=j(this).show().css("visibility","hidden"),g=b.offset();g.top-=parseInt(b.css("marginTop"),10)||0;g.left-=parseInt(b.css("marginLeft"),10)||0;for(var h=b.outerWidth(true),i=b.outerHeight(true),e=0;e<c;e++)for(var f=
0;f<d;f++)b.clone().appendTo("body").wrap("<div></div>").css({position:"absolute",visibility:"visible",left:-f*(h/d),top:-e*(i/c)}).parent().addClass("ui-effects-explode").css({position:"absolute",overflow:"hidden",width:h/d,height:i/c,left:g.left+f*(h/d)+(a.options.mode=="show"?(f-Math.floor(d/2))*(h/d):0),top:g.top+e*(i/c)+(a.options.mode=="show"?(e-Math.floor(c/2))*(i/c):0),opacity:a.options.mode=="show"?0:1}).animate({left:g.left+f*(h/d)+(a.options.mode=="show"?0:(f-Math.floor(d/2))*(h/d)),top:g.top+
e*(i/c)+(a.options.mode=="show"?0:(e-Math.floor(c/2))*(i/c)),opacity:a.options.mode=="show"?1:0},a.duration||500);setTimeout(function(){a.options.mode=="show"?b.css({visibility:"visible"}):b.css({visibility:"visible"}).hide();a.callback&&a.callback.apply(b[0]);b.dequeue();j("div.ui-effects-explode").remove()},a.duration||500)})}})(jQuery);
;/*
 * jQuery UI Effects Fold 1.8.2
 *
 * Copyright (c) 2010 AUTHORS.txt (http://jqueryui.com/about)
 * Dual licensed under the MIT (MIT-LICENSE.txt)
 * and GPL (GPL-LICENSE.txt) licenses.
 *
 * http://docs.jquery.com/UI/Effects/Fold
 *
 * Depends:
 *	jquery.effects.core.js
 */
(function(c){c.effects.fold=function(a){return this.queue(function(){var b=c(this),j=["position","top","left"],d=c.effects.setMode(b,a.options.mode||"hide"),g=a.options.size||15,h=!!a.options.horizFirst,k=a.duration?a.duration/2:c.fx.speeds._default/2;c.effects.save(b,j);b.show();var e=c.effects.createWrapper(b).css({overflow:"hidden"}),f=d=="show"!=h,l=f?["width","height"]:["height","width"];f=f?[e.width(),e.height()]:[e.height(),e.width()];var i=/([0-9]+)%/.exec(g);if(i)g=parseInt(i[1],10)/100*
f[d=="hide"?0:1];if(d=="show")e.css(h?{height:0,width:g}:{height:g,width:0});h={};i={};h[l[0]]=d=="show"?f[0]:g;i[l[1]]=d=="show"?f[1]:0;e.animate(h,k,a.options.easing).animate(i,k,a.options.easing,function(){d=="hide"&&b.hide();c.effects.restore(b,j);c.effects.removeWrapper(b);a.callback&&a.callback.apply(b[0],arguments);b.dequeue()})})}})(jQuery);
;/*
 * jQuery UI Effects Highlight 1.8.2
 *
 * Copyright (c) 2010 AUTHORS.txt (http://jqueryui.com/about)
 * Dual licensed under the MIT (MIT-LICENSE.txt)
 * and GPL (GPL-LICENSE.txt) licenses.
 *
 * http://docs.jquery.com/UI/Effects/Highlight
 *
 * Depends:
 *	jquery.effects.core.js
 */
(function(b){b.effects.highlight=function(c){return this.queue(function(){var a=b(this),e=["backgroundImage","backgroundColor","opacity"],d=b.effects.setMode(a,c.options.mode||"show"),f={backgroundColor:a.css("backgroundColor")};if(d=="hide")f.opacity=0;b.effects.save(a,e);a.show().css({backgroundImage:"none",backgroundColor:c.options.color||"#ffff99"}).animate(f,{queue:false,duration:c.duration,easing:c.options.easing,complete:function(){d=="hide"&&a.hide();b.effects.restore(a,e);d=="show"&&!b.support.opacity&&
this.style.removeAttribute("filter");c.callback&&c.callback.apply(this,arguments);a.dequeue()}})})}})(jQuery);
/*
 * jQuery UI Effects Pulsate 1.8.2
 *
 * Copyright (c) 2010 AUTHORS.txt (http://jqueryui.com/about)
 * Dual licensed under the MIT (MIT-LICENSE.txt)
 * and GPL (GPL-LICENSE.txt) licenses.
 *
 * http://docs.jquery.com/UI/Effects/Pulsate
 *
 * Depends:
 *	jquery.effects.core.js
 */
(function(d){d.effects.pulsate=function(a){return this.queue(function(){var b=d(this),c=d.effects.setMode(b,a.options.mode||"show");times=(a.options.times||5)*2-1;duration=a.duration?a.duration/2:d.fx.speeds._default/2;isVisible=b.is(":visible");animateTo=0;if(!isVisible){b.css("opacity",0).show();animateTo=1}if(c=="hide"&&isVisible||c=="show"&&!isVisible)times--;for(c=0;c<times;c++){b.animate({opacity:animateTo},duration,a.options.easing);animateTo=(animateTo+1)%2}b.animate({opacity:animateTo},duration,
a.options.easing,function(){animateTo==0&&b.hide();a.callback&&a.callback.apply(this,arguments)});b.queue("fx",function(){b.dequeue()}).dequeue()})}})(jQuery);
/*
 * jQuery UI Effects Scale 1.8.2
 *
 * Copyright (c) 2010 AUTHORS.txt (http://jqueryui.com/about)
 * Dual licensed under the MIT (MIT-LICENSE.txt)
 * and GPL (GPL-LICENSE.txt) licenses.
 *
 * http://docs.jquery.com/UI/Effects/Scale
 *
 * Depends:
 *	jquery.effects.core.js
 */
(function(c){c.effects.puff=function(b){return this.queue(function(){var a=c(this),e=c.effects.setMode(a,b.options.mode||"hide"),g=parseInt(b.options.percent,10)||150,h=g/100,i={height:a.height(),width:a.width()};c.extend(b.options,{fade:true,mode:e,percent:e=="hide"?g:100,from:e=="hide"?i:{height:i.height*h,width:i.width*h}});a.effect("scale",b.options,b.duration,b.callback);a.dequeue()})};c.effects.scale=function(b){return this.queue(function(){var a=c(this),e=c.extend(true,{},b.options),g=c.effects.setMode(a,
b.options.mode||"effect"),h=parseInt(b.options.percent,10)||(parseInt(b.options.percent,10)==0?0:g=="hide"?0:100),i=b.options.direction||"both",f=b.options.origin;if(g!="effect"){e.origin=f||["middle","center"];e.restore=true}f={height:a.height(),width:a.width()};a.from=b.options.from||(g=="show"?{height:0,width:0}:f);h={y:i!="horizontal"?h/100:1,x:i!="vertical"?h/100:1};a.to={height:f.height*h.y,width:f.width*h.x};if(b.options.fade){if(g=="show"){a.from.opacity=0;a.to.opacity=1}if(g=="hide"){a.from.opacity=
1;a.to.opacity=0}}e.from=a.from;e.to=a.to;e.mode=g;a.effect("size",e,b.duration,b.callback);a.dequeue()})};c.effects.size=function(b){return this.queue(function(){var a=c(this),e=["position","top","left","width","height","overflow","opacity"],g=["position","top","left","overflow","opacity"],h=["width","height","overflow"],i=["fontSize"],f=["borderTopWidth","borderBottomWidth","paddingTop","paddingBottom"],k=["borderLeftWidth","borderRightWidth","paddingLeft","paddingRight"],p=c.effects.setMode(a,
b.options.mode||"effect"),n=b.options.restore||false,m=b.options.scale||"both",l=b.options.origin,j={height:a.height(),width:a.width()};a.from=b.options.from||j;a.to=b.options.to||j;if(l){l=c.effects.getBaseline(l,j);a.from.top=(j.height-a.from.height)*l.y;a.from.left=(j.width-a.from.width)*l.x;a.to.top=(j.height-a.to.height)*l.y;a.to.left=(j.width-a.to.width)*l.x}var d={from:{y:a.from.height/j.height,x:a.from.width/j.width},to:{y:a.to.height/j.height,x:a.to.width/j.width}};if(m=="box"||m=="both"){if(d.from.y!=
d.to.y){e=e.concat(f);a.from=c.effects.setTransition(a,f,d.from.y,a.from);a.to=c.effects.setTransition(a,f,d.to.y,a.to)}if(d.from.x!=d.to.x){e=e.concat(k);a.from=c.effects.setTransition(a,k,d.from.x,a.from);a.to=c.effects.setTransition(a,k,d.to.x,a.to)}}if(m=="content"||m=="both")if(d.from.y!=d.to.y){e=e.concat(i);a.from=c.effects.setTransition(a,i,d.from.y,a.from);a.to=c.effects.setTransition(a,i,d.to.y,a.to)}c.effects.save(a,n?e:g);a.show();c.effects.createWrapper(a);a.css("overflow","hidden").css(a.from);
if(m=="content"||m=="both"){f=f.concat(["marginTop","marginBottom"]).concat(i);k=k.concat(["marginLeft","marginRight"]);h=e.concat(f).concat(k);a.find("*[width]").each(function(){child=c(this);n&&c.effects.save(child,h);var o={height:child.height(),width:child.width()};child.from={height:o.height*d.from.y,width:o.width*d.from.x};child.to={height:o.height*d.to.y,width:o.width*d.to.x};if(d.from.y!=d.to.y){child.from=c.effects.setTransition(child,f,d.from.y,child.from);child.to=c.effects.setTransition(child,
f,d.to.y,child.to)}if(d.from.x!=d.to.x){child.from=c.effects.setTransition(child,k,d.from.x,child.from);child.to=c.effects.setTransition(child,k,d.to.x,child.to)}child.css(child.from);child.animate(child.to,b.duration,b.options.easing,function(){n&&c.effects.restore(child,h)})})}a.animate(a.to,{queue:false,duration:b.duration,easing:b.options.easing,complete:function(){a.to.opacity===0&&a.css("opacity",a.from.opacity);p=="hide"&&a.hide();c.effects.restore(a,n?e:g);c.effects.removeWrapper(a);b.callback&&
b.callback.apply(this,arguments);a.dequeue()}})})}})(jQuery);
;/*
 * jQuery UI Effects Shake 1.8.2
 *
 * Copyright (c) 2010 AUTHORS.txt (http://jqueryui.com/about)
 * Dual licensed under the MIT (MIT-LICENSE.txt)
 * and GPL (GPL-LICENSE.txt) licenses.
 *
 * http://docs.jquery.com/UI/Effects/Shake
 *
 * Depends:
 *	jquery.effects.core.js
 */
(function(d){d.effects.shake=function(a){return this.queue(function(){var b=d(this),j=["position","top","left"];d.effects.setMode(b,a.options.mode||"effect");var c=a.options.direction||"left",e=a.options.distance||20,l=a.options.times||3,f=a.duration||a.options.duration||140;d.effects.save(b,j);b.show();d.effects.createWrapper(b);var g=c=="up"||c=="down"?"top":"left",h=c=="up"||c=="left"?"pos":"neg";c={};var i={},k={};c[g]=(h=="pos"?"-=":"+=")+e;i[g]=(h=="pos"?"+=":"-=")+e*2;k[g]=(h=="pos"?"-=":"+=")+
e*2;b.animate(c,f,a.options.easing);for(e=1;e<l;e++)b.animate(i,f,a.options.easing).animate(k,f,a.options.easing);b.animate(i,f,a.options.easing).animate(c,f/2,a.options.easing,function(){d.effects.restore(b,j);d.effects.removeWrapper(b);a.callback&&a.callback.apply(this,arguments)});b.queue("fx",function(){b.dequeue()});b.dequeue()})}})(jQuery);
/*
 * jQuery UI Effects Slide 1.8.2
 *
 * Copyright (c) 2010 AUTHORS.txt (http://jqueryui.com/about)
 * Dual licensed under the MIT (MIT-LICENSE.txt)
 * and GPL (GPL-LICENSE.txt) licenses.
 *
 * http://docs.jquery.com/UI/Effects/Slide
 *
 * Depends:
 *	jquery.effects.core.js
 */
(function(c){c.effects.slide=function(d){return this.queue(function(){var a=c(this),h=["position","top","left"],e=c.effects.setMode(a,d.options.mode||"show"),b=d.options.direction||"left";c.effects.save(a,h);a.show();c.effects.createWrapper(a).css({overflow:"hidden"});var f=b=="up"||b=="down"?"top":"left";b=b=="up"||b=="left"?"pos":"neg";var g=d.options.distance||(f=="top"?a.outerHeight({margin:true}):a.outerWidth({margin:true}));if(e=="show")a.css(f,b=="pos"?-g:g);var i={};i[f]=(e=="show"?b=="pos"?
"+=":"-=":b=="pos"?"-=":"+=")+g;a.animate(i,{queue:false,duration:d.duration,easing:d.options.easing,complete:function(){e=="hide"&&a.hide();c.effects.restore(a,h);c.effects.removeWrapper(a);d.callback&&d.callback.apply(this,arguments);a.dequeue()}})})}})(jQuery);
/*
 * jQuery UI Effects Transfer 1.8.2
 *
 * Copyright (c) 2010 AUTHORS.txt (http://jqueryui.com/about)
 * Dual licensed under the MIT (MIT-LICENSE.txt)
 * and GPL (GPL-LICENSE.txt) licenses.
 *
 * http://docs.jquery.com/UI/Effects/Transfer
 *
 * Depends:
 *	jquery.effects.core.js
 */
(function(e){e.effects.transfer=function(a){return this.queue(function(){var b=e(this),c=e(a.options.to),d=c.offset();c={top:d.top,left:d.left,height:c.innerHeight(),width:c.innerWidth()};d=b.offset();var f=e('<div class="ui-effects-transfer"></div>').appendTo(document.body).addClass(a.options.className).css({top:d.top,left:d.left,height:b.innerHeight(),width:b.innerWidth(),position:"absolute"}).animate(c,a.duration,a.options.easing,function(){f.remove();a.callback&&a.callback.apply(b[0],arguments);
b.dequeue()})})}})(jQuery);

/*
 * jQuery Form Plugin
 * version: 2.33 (22-SEP-2009)
 * @requires jQuery v1.2.6 or later
 *
 * Examples and documentation at: http://malsup.com/jquery/form/
 * Dual licensed under the MIT and GPL licenses:
 *   http://www.opensource.org/licenses/mit-license.php
 *   http://www.gnu.org/licenses/gpl.html
 */

(function($) {

/*
	Usage Note:
	-----------
	Do not use both ajaxSubmit and ajaxForm on the same form.  These
	functions are intended to be exclusive.  Use ajaxSubmit if you want
	to bind your own submit handler to the form.  For example,

	$(document).ready(function() {
		$('#myForm').bind('submit', function() {
			$(this).ajaxSubmit({
				target: '#output'
			});
			return false; // <-- important!
		});
	});

	Use ajaxForm when you want the plugin to manage all the event binding
	for you.  For example,

	$(document).ready(function() {
		$('#myForm').ajaxForm({
			target: '#output'
		});
	});

	When using ajaxForm, the ajaxSubmit function will be invoked for you
	at the appropriate time.
*/

/**
 * ajaxSubmit() provides a mechanism for immediately submitting
 * an HTML form using AJAX.
 */
$.fn.ajaxSubmit = function(options) {
	// fast fail if nothing selected (http://dev.jquery.com/ticket/2752)
	if (!this.length) {
		log('ajaxSubmit: skipping submit process - no element selected');
		return this;
	}

	if (typeof options == 'function')
		options = { success: options };

	var url = $.trim(this.attr('action'));
	if (url) {
		// clean url (don't include hash vaue)
		url = (url.match(/^([^#]+)/)||[])[1];
   	}
   	url = url || window.location.href || '';

	options = $.extend({
		url:  url,
		type: this.attr('method') || 'GET'
	}, options || {});

	// hook for manipulating the form data before it is extracted;
	// convenient for use with rich editors like tinyMCE or FCKEditor
	var veto = {};
	this.trigger('form-pre-serialize', [this, options, veto]);
	if (veto.veto) {
		log('ajaxSubmit: submit vetoed via form-pre-serialize trigger');
		return this;
	}

	// provide opportunity to alter form data before it is serialized
	if (options.beforeSerialize && options.beforeSerialize(this, options) === false) {
		log('ajaxSubmit: submit aborted via beforeSerialize callback');
		return this;
	}

	var a = this.formToArray(options.semantic);
	if (options.data) {
		options.extraData = options.data;
		for (var n in options.data) {
		  if(options.data[n] instanceof Array) {
			for (var k in options.data[n])
			  a.push( { name: n, value: options.data[n][k] } );
		  }
		  else
			 a.push( { name: n, value: options.data[n] } );
		}
	}

	// give pre-submit callback an opportunity to abort the submit
	if (options.beforeSubmit && options.beforeSubmit(a, this, options) === false) {
		log('ajaxSubmit: submit aborted via beforeSubmit callback');
		return this;
	}

	// fire vetoable 'validate' event
	this.trigger('form-submit-validate', [a, this, options, veto]);
	if (veto.veto) {
		log('ajaxSubmit: submit vetoed via form-submit-validate trigger');
		return this;
	}

	var q = $.param(a);

	if (options.type.toUpperCase() == 'GET') {
		options.url += (options.url.indexOf('?') >= 0 ? '&' : '?') + q;
		options.data = null;  // data is null for 'get'
	}
	else
		options.data = q; // data is the query string for 'post'

	var $form = this, callbacks = [];
	if (options.resetForm) callbacks.push(function() { $form.resetForm(); });
	if (options.clearForm) callbacks.push(function() { $form.clearForm(); });

	// perform a load on the target only if dataType is not provided
	if (!options.dataType && options.target) {
		var oldSuccess = options.success || function(){};
		callbacks.push(function(data) {
			$(options.target).html(data).each(oldSuccess, arguments);
		});
	}
	else if (options.success)
		callbacks.push(options.success);

	options.success = function(data, status) {
		for (var i=0, max=callbacks.length; i < max; i++)
			callbacks[i].apply(options, [data, status, $form]);
	};

	// are there files to upload?
	var files = $('input:file', this).fieldValue();
	var found = false;
	for (var j=0; j < files.length; j++)
		if (files[j])
			found = true;

	var multipart = false;
//	var mp = 'multipart/form-data';
//	multipart = ($form.attr('enctype') == mp || $form.attr('encoding') == mp);

	// options.iframe allows user to force iframe mode
   if (options.iframe || found || multipart) {
	   // hack to fix Safari hang (thanks to Tim Molendijk for this)
	   // see:  http://groups.google.com/group/jquery-dev/browse_thread/thread/36395b7ab510dd5d
	   if (options.closeKeepAlive)
		   $.get(options.closeKeepAlive, fileUpload);
	   else
		   fileUpload();
	   }
   else
	   $.ajax(options);

	// fire 'notify' event
	this.trigger('form-submit-notify', [this, options]);
	return this;


	// private function for handling file uploads (hat tip to YAHOO!)
	function fileUpload() {
		var form = $form[0];

		if ($(':input[name=submit]', form).length) {
			alert('Error: Form elements must not be named "submit".');
			return;
		}

		var opts = $.extend({}, $.ajaxSettings, options);
		var s = $.extend(true, {}, $.extend(true, {}, $.ajaxSettings), opts);

		var id = 'jqFormIO' + (new Date().getTime());
		var $io = $('<iframe id="' + id + '" name="' + id + '" src="about:blank" />');
		var io = $io[0];

		$io.css({ position: 'absolute', top: '-1000px', left: '-1000px' });

		var xhr = { // mock object
			aborted: 0,
			responseText: null,
			responseXML: null,
			status: 0,
			statusText: 'n/a',
			getAllResponseHeaders: function() {},
			getResponseHeader: function() {},
			setRequestHeader: function() {},
			abort: function() {
				this.aborted = 1;
				$io.attr('src','about:blank'); // abort op in progress
			}
		};

		var g = opts.global;
		// trigger ajax global events so that activity/block indicators work like normal
		if (g && ! $.active++) $.event.trigger("ajaxStart");
		if (g) $.event.trigger("ajaxSend", [xhr, opts]);

		if (s.beforeSend && s.beforeSend(xhr, s) === false) {
			s.global && $.active--;
			return;
		}
		if (xhr.aborted)
			return;

		var cbInvoked = 0;
		var timedOut = 0;

		// add submitting element to data if we know it
		var sub = form.clk;
		if (sub) {
			var n = sub.name;
			if (n && !sub.disabled) {
				options.extraData = options.extraData || {};
				options.extraData[n] = sub.value;
				if (sub.type == "image") {
					options.extraData[name+'.x'] = form.clk_x;
					options.extraData[name+'.y'] = form.clk_y;
				}
			}
		}

		// take a breath so that pending repaints get some cpu time before the upload starts
		setTimeout(function() {
			// make sure form attrs are set
			var t = $form.attr('target'), a = $form.attr('action');

			// update form attrs in IE friendly way
			form.setAttribute('target',id);
			if (form.getAttribute('method') != 'POST')
				form.setAttribute('method', 'POST');
			if (form.getAttribute('action') != opts.url)
				form.setAttribute('action', opts.url);

			// ie borks in some cases when setting encoding
			if (! options.skipEncodingOverride) {
				$form.attr({
					encoding: 'multipart/form-data',
					enctype:  'multipart/form-data'
				});
			}

			// support timout
			if (opts.timeout)
				setTimeout(function() { timedOut = true; cb(); }, opts.timeout);

			// add "extra" data to form if provided in options
			var extraInputs = [];
			try {
				if (options.extraData)
					for (var n in options.extraData)
						extraInputs.push(
							$('<input type="hidden" name="'+n+'" value="'+options.extraData[n]+'" />')
								.appendTo(form)[0]);

				// add iframe to doc and submit the form
				$io.appendTo('body');
				io.attachEvent ? io.attachEvent('onload', cb) : io.addEventListener('load', cb, false);
				form.submit();
			}
			finally {
				// reset attrs and remove "extra" input elements
				form.setAttribute('action',a);
				t ? form.setAttribute('target', t) : $form.removeAttr('target');
				$(extraInputs).remove();
			}
		}, 10);

		var domCheckCount = 50;

		function cb() {
			if (cbInvoked++) return;

			io.detachEvent ? io.detachEvent('onload', cb) : io.removeEventListener('load', cb, false);

			var ok = true;
			try {
				if (timedOut) throw 'timeout';
				// extract the server response from the iframe
				var data, doc;

				doc = io.contentWindow ? io.contentWindow.document : io.contentDocument ? io.contentDocument : io.document;
				
				var isXml = opts.dataType == 'xml' || doc.XMLDocument || $.isXMLDoc(doc);
				log('isXml='+isXml);
				if (!isXml && (doc.body == null || doc.body.innerHTML == '')) {
				 	if (--domCheckCount) {
						// in some browsers (Opera) the iframe DOM is not always traversable when
						// the onload callback fires, so we loop a bit to accommodate
						cbInvoked = 0;
						setTimeout(cb, 100);
						return;
					}
					log('Could not access iframe DOM after 50 tries.');
					return;
				}

				xhr.responseText = doc.body ? doc.body.innerHTML : null;
				xhr.responseXML = doc.XMLDocument ? doc.XMLDocument : doc;
				xhr.getResponseHeader = function(header){
					var headers = {'content-type': opts.dataType};
					return headers[header];
				};

				if (opts.dataType == 'json' || opts.dataType == 'script') {
					// see if user embedded response in textarea
					var ta = doc.getElementsByTagName('textarea')[0];
					if (ta)
						xhr.responseText = ta.value;
					else {
						// account for browsers injecting pre around json response
						var pre = doc.getElementsByTagName('pre')[0];
						if (pre)
							xhr.responseText = pre.innerHTML;
					}			  
				}
				else if (opts.dataType == 'xml' && !xhr.responseXML && xhr.responseText != null) {
					xhr.responseXML = toXml(xhr.responseText);
				}
				data = $.httpData(xhr, opts.dataType);
			}
			catch(e){
				ok = false;
				$.handleError(opts, xhr, 'error', e);
			}

			// ordering of these callbacks/triggers is odd, but that's how $.ajax does it
			if (ok) {
				opts.success(data, 'success');
				if (g) $.event.trigger("ajaxSuccess", [xhr, opts]);
			}
			if (g) $.event.trigger("ajaxComplete", [xhr, opts]);
			if (g && ! --$.active) $.event.trigger("ajaxStop");
			if (opts.complete) opts.complete(xhr, ok ? 'success' : 'error');

			// clean up
			setTimeout(function() {
				$io.remove();
				xhr.responseXML = null;
			}, 100);
		};

		function toXml(s, doc) {
			if (window.ActiveXObject) {
				doc = new ActiveXObject('Microsoft.XMLDOM');
				doc.async = 'false';
				doc.loadXML(s);
			}
			else
				doc = (new DOMParser()).parseFromString(s, 'text/xml');
			return (doc && doc.documentElement && doc.documentElement.tagName != 'parsererror') ? doc : null;
		};
	};
};

/**
 * ajaxForm() provides a mechanism for fully automating form submission.
 *
 * The advantages of using this method instead of ajaxSubmit() are:
 *
 * 1: This method will include coordinates for <input type="image" /> elements (if the element
 *	is used to submit the form).
 * 2. This method will include the submit element's name/value data (for the element that was
 *	used to submit the form).
 * 3. This method binds the submit() method to the form for you.
 *
 * The options argument for ajaxForm works exactly as it does for ajaxSubmit.  ajaxForm merely
 * passes the options argument along after properly binding events for submit elements and
 * the form itself.
 */
$.fn.ajaxForm = function(options) {
	return this.ajaxFormUnbind().bind('submit.form-plugin', function() {
		$(this).ajaxSubmit(options);
		return false;
	}).bind('click.form-plugin', function(e) {
		var $el = $(e.target);
		if (!($el.is(":submit,input:image"))) {
			return;
		}
		var form = this;
		form.clk = e.target;
		if (e.target.type == 'image') {
			if (e.offsetX != undefined) {
				form.clk_x = e.offsetX;
				form.clk_y = e.offsetY;
			} else if (typeof $.fn.offset == 'function') { // try to use dimensions plugin
				var offset = $el.offset();
				form.clk_x = e.pageX - offset.left;
				form.clk_y = e.pageY - offset.top;
			} else {
				form.clk_x = e.pageX - e.target.offsetLeft;
				form.clk_y = e.pageY - e.target.offsetTop;
			}
		}
		// clear form vars
		setTimeout(function() { form.clk = form.clk_x = form.clk_y = null; }, 10);
	});
};

// ajaxFormUnbind unbinds the event handlers that were bound by ajaxForm
$.fn.ajaxFormUnbind = function() {
	return this.unbind('submit.form-plugin click.form-plugin');
};

/**
 * formToArray() gathers form element data into an array of objects that can
 * be passed to any of the following ajax functions: $.get, $.post, or load.
 * Each object in the array has both a 'name' and 'value' property.  An example of
 * an array for a simple login form might be:
 *
 * [ { name: 'username', value: 'jresig' }, { name: 'password', value: 'secret' } ]
 *
 * It is this array that is passed to pre-submit callback functions provided to the
 * ajaxSubmit() and ajaxForm() methods.
 */
$.fn.formToArray = function(semantic) {
	var a = [];
	if (this.length == 0) return a;

	var form = this[0];
	var els = semantic ? form.getElementsByTagName('*') : form.elements;
	if (!els) return a;
	for(var i=0, max=els.length; i < max; i++) {
		var el = els[i];
		var n = el.name;
		if (!n) continue;

		if (semantic && form.clk && el.type == "image") {
			// handle image inputs on the fly when semantic == true
			if(!el.disabled && form.clk == el) {
				a.push({name: n, value: $(el).val()});
				a.push({name: n+'.x', value: form.clk_x}, {name: n+'.y', value: form.clk_y});
			}
			continue;
		}

		var v = $.fieldValue(el, true);
		if (v && v.constructor == Array) {
			for(var j=0, jmax=v.length; j < jmax; j++)
				a.push({name: n, value: v[j]});
		}
		else if (v !== null && typeof v != 'undefined')
			a.push({name: n, value: v});
	}

	if (!semantic && form.clk) {
		// input type=='image' are not found in elements array! handle it here
		var $input = $(form.clk), input = $input[0], n = input.name;
		if (n && !input.disabled && input.type == 'image') {
			a.push({name: n, value: $input.val()});
			a.push({name: n+'.x', value: form.clk_x}, {name: n+'.y', value: form.clk_y});
		}
	}
	return a;
};

/**
 * Serializes form data into a 'submittable' string. This method will return a string
 * in the format: name1=value1&amp;name2=value2
 */
$.fn.formSerialize = function(semantic) {
	//hand off to jQuery.param for proper encoding
	return $.param(this.formToArray(semantic));
};

/**
 * Serializes all field elements in the jQuery object into a query string.
 * This method will return a string in the format: name1=value1&amp;name2=value2
 */
$.fn.fieldSerialize = function(successful) {
	var a = [];
	this.each(function() {
		var n = this.name;
		if (!n) return;
		var v = $.fieldValue(this, successful);
		if (v && v.constructor == Array) {
			for (var i=0,max=v.length; i < max; i++)
				a.push({name: n, value: v[i]});
		}
		else if (v !== null && typeof v != 'undefined')
			a.push({name: this.name, value: v});
	});
	//hand off to jQuery.param for proper encoding
	return $.param(a);
};

/**
 * Returns the value(s) of the element in the matched set.  For example, consider the following form:
 *
 *  <form><fieldset>
 *	  <input name="A" type="text" />
 *	  <input name="A" type="text" />
 *	  <input name="B" type="checkbox" value="B1" />
 *	  <input name="B" type="checkbox" value="B2"/>
 *	  <input name="C" type="radio" value="C1" />
 *	  <input name="C" type="radio" value="C2" />
 *  </fieldset></form>
 *
 *  var v = $(':text').fieldValue();
 *  // if no values are entered into the text inputs
 *  v == ['','']
 *  // if values entered into the text inputs are 'foo' and 'bar'
 *  v == ['foo','bar']
 *
 *  var v = $(':checkbox').fieldValue();
 *  // if neither checkbox is checked
 *  v === undefined
 *  // if both checkboxes are checked
 *  v == ['B1', 'B2']
 *
 *  var v = $(':radio').fieldValue();
 *  // if neither radio is checked
 *  v === undefined
 *  // if first radio is checked
 *  v == ['C1']
 *
 * The successful argument controls whether or not the field element must be 'successful'
 * (per http://www.w3.org/TR/html4/interact/forms.html#successful-controls).
 * The default value of the successful argument is true.  If this value is false the value(s)
 * for each element is returned.
 *
 * Note: This method *always* returns an array.  If no valid value can be determined the
 *	   array will be empty, otherwise it will contain one or more values.
 */
$.fn.fieldValue = function(successful) {
	for (var val=[], i=0, max=this.length; i < max; i++) {
		var el = this[i];
		var v = $.fieldValue(el, successful);
		if (v === null || typeof v == 'undefined' || (v.constructor == Array && !v.length))
			continue;
		v.constructor == Array ? $.merge(val, v) : val.push(v);
	}
	return val;
};

/**
 * Returns the value of the field element.
 */
$.fieldValue = function(el, successful) {
	var n = el.name, t = el.type, tag = el.tagName.toLowerCase();
	if (typeof successful == 'undefined') successful = true;

	if (successful && (!n || el.disabled || t == 'reset' || t == 'button' ||
		(t == 'checkbox' || t == 'radio') && !el.checked ||
		(t == 'submit' || t == 'image') && el.form && el.form.clk != el ||
		tag == 'select' && el.selectedIndex == -1))
			return null;

	if (tag == 'select') {
		var index = el.selectedIndex;
		if (index < 0) return null;
		var a = [], ops = el.options;
		var one = (t == 'select-one');
		var max = (one ? index+1 : ops.length);
		for(var i=(one ? index : 0); i < max; i++) {
			var op = ops[i];
			if (op.selected) {
				var v = op.value;
				if (!v) // extra pain for IE...
					v = (op.attributes && op.attributes['value'] && !(op.attributes['value'].specified)) ? op.text : op.value;
				if (one) return v;
				a.push(v);
			}
		}
		return a;
	}
	return el.value;
};

/**
 * Clears the form data.  Takes the following actions on the form's input fields:
 *  - input text fields will have their 'value' property set to the empty string
 *  - select elements will have their 'selectedIndex' property set to -1
 *  - checkbox and radio inputs will have their 'checked' property set to false
 *  - inputs of type submit, button, reset, and hidden will *not* be effected
 *  - button elements will *not* be effected
 */
$.fn.clearForm = function() {
	return this.each(function() {
		$('input,select,textarea', this).clearFields();
	});
};

/**
 * Clears the selected form elements.
 */
$.fn.clearFields = $.fn.clearInputs = function() {
	return this.each(function() {
		var t = this.type, tag = this.tagName.toLowerCase();
		if (t == 'text' || t == 'password' || tag == 'textarea')
			this.value = '';
		else if (t == 'checkbox' || t == 'radio')
			this.checked = false;
		else if (tag == 'select')
			this.selectedIndex = -1;
	});
};

/**
 * Resets the form data.  Causes all form elements to be reset to their original value.
 */
$.fn.resetForm = function() {
	return this.each(function() {
		// guard against an input with the name of 'reset'
		// note that IE reports the reset function as an 'object'
		if (typeof this.reset == 'function' || (typeof this.reset == 'object' && !this.reset.nodeType))
			this.reset();
	});
};

/**
 * Enables or disables any matching elements.
 */
$.fn.enable = function(b) {
	if (b == undefined) b = true;
	return this.each(function() {
		this.disabled = !b;
	});
};

/**
 * Checks/unchecks any matching checkboxes or radio buttons and
 * selects/deselects and matching option elements.
 */
$.fn.selected = function(select) {
	if (select == undefined) select = true;
	return this.each(function() {
		var t = this.type;
		if (t == 'checkbox' || t == 'radio')
			this.checked = select;
		else if (this.tagName.toLowerCase() == 'option') {
			var $sel = $(this).parent('select');
			if (select && $sel[0] && $sel[0].type == 'select-one') {
				// deselect all other options
				$sel.find('option').selected(false);
			}
			this.selected = select;
		}
	});
};

// helper fn for console logging
// set $.fn.ajaxSubmit.debug to true to enable debug logging
function log() {
	if ($.fn.ajaxSubmit.debug && window.console && window.console.log)
		window.console.log('[jquery.form] ' + Array.prototype.join.call(arguments,''));
};

})(jQuery);

/**
 * jQuery.ScrollTo
 * Copyright (c) 2007-2008 Ariel Flesler - aflesler(at)gmail(dot)com | http://flesler.blogspot.com
 * Dual licensed under MIT and GPL.
 * Date: 9/11/2008
 *
 * Easy element scrolling using jQuery.
 * http://flesler.blogspot.com/2007/10/jqueryscrollto.html
 * Tested with jQuery 1.2.6. On FF 2/3, IE 6/7, Opera 9.2/5 and Safari 3. on Windows.
 *
 * @author Ariel Flesler
 * @version 1.4
 */
(function( $ ){
	
	var $scrollTo = $.scrollTo = function( target, duration, settings ){
		$(window).scrollTo( target, duration, settings );
	};

	$scrollTo.defaults = {
		axis:'y',
		duration:1
	};

	// Returns the element that needs to be animated to scroll the window.
	// Kept for backwards compatibility (specially for localScroll & serialScroll)
	$scrollTo.window = function( scope ){
		return $(window).scrollable();
	};

	// Hack, hack, hack... stay away!
	// Returns the real elements to scroll (supports window/iframes, documents and regular nodes)
	$.fn.scrollable = function(){
		return this.map(function(){
			// Just store it, we might need it
			var win = this.parentWindow || this.defaultView,
				// If it's a document, get its iframe or the window if it's THE document
				elem = this.nodeName == '#document' ? win.frameElement || win : this,
				// Get the corresponding document
				doc = elem.contentDocument || (elem.contentWindow || elem).document,
				isWin = elem.setInterval;

			return elem.nodeName == 'IFRAME' || isWin && $.browser.safari ? doc.body
				: isWin ? doc.documentElement
				: this;
		});
	};

	$.fn.scrollTo = function( target, duration, settings ){
		if( typeof duration == 'object' ){
			settings = duration;
			duration = 0;
		}
		if( typeof settings == 'function' )
			settings = { onAfter:settings };
			
		settings = $.extend( {}, $scrollTo.defaults, settings );
		// Speed is still recognized for backwards compatibility
		duration = duration || settings.speed || settings.duration;
		// Make sure the settings are given right
		settings.queue = settings.queue && settings.axis.length > 1;
		
		if( settings.queue )
			// Let's keep the overall duration
			duration /= 2;
		settings.offset = both( settings.offset );
		settings.over = both( settings.over );

		return this.scrollable().each(function(){
			var elem = this,
				$elem = $(elem),
				targ = target, toff, attr = {},
				win = $elem.is('html,body');

			switch( typeof targ ){
				// A number will pass the regex
				case 'number':
				case 'string':
					if( /^([+-]=)?\d+(px)?$/.test(targ) ){
						targ = both( targ );
						// We are done
						break;
					}
					// Relative selector, no break!
					targ = $(targ,this);
				case 'object':
					// DOMElement / jQuery
					if( targ.is || targ.style )
						// Get the real position of the target 
						toff = (targ = $(targ)).offset();
			}
			$.each( settings.axis.split(''), function( i, axis ){
				var Pos	= axis == 'x' ? 'Left' : 'Top',
					pos = Pos.toLowerCase(),
					key = 'scroll' + Pos,
					old = elem[key],
					Dim = axis == 'x' ? 'Width' : 'Height',
					dim = Dim.toLowerCase();

				if( toff ){// jQuery / DOMElement
					attr[key] = toff[pos] + ( win ? 0 : old - $elem.offset()[pos] );

					// If it's a dom element, reduce the margin
					if( settings.margin ){
						attr[key] -= parseInt(targ.css('margin'+Pos)) || 0;
						attr[key] -= parseInt(targ.css('border'+Pos+'Width')) || 0;
					}
					
					attr[key] += settings.offset[pos] || 0;
					
					if( settings.over[pos] )
						// Scroll to a fraction of its width/height
						attr[key] += targ[dim]() * settings.over[pos];
				}else
					attr[key] = targ[pos];

				// Number or 'number'
				if( /^\d+$/.test(attr[key]) )
					// Check the limits
					attr[key] = attr[key] <= 0 ? 0 : Math.min( attr[key], max(Dim) );

				// Queueing axes
				if( !i && settings.queue ){
					// Don't waste time animating, if there's no need.
					if( old != attr[key] )
						// Intermediate animation
						animate( settings.onAfterFirst );
					// Don't animate this axis again in the next iteration.
					delete attr[key];
				}
			});			
			animate( settings.onAfter );			

			function animate( callback ){
				$elem.animate( attr, duration, settings.easing, callback && function(){
					callback.call(this, target, settings);
				});
			};
			function max( Dim ){
				var attr ='scroll'+Dim,
					doc = elem.ownerDocument;
				
				return win
						? Math.max( doc.documentElement[attr], doc.body[attr]  )
						: elem[attr];
			};
		}).end();
	};

	function both( val ){
		return typeof val == 'object' ? val : { top:val, left:val };
	};

})( jQuery );

jQuery.cookie = function(name, value, options) {
    if (typeof value != 'undefined') { // name and value given, set cookie
        options = options || {};
        if (value === null) {
            value = '';
            options.expires = -1;
        }
        var expires = '';
        if (options.expires && (typeof options.expires == 'number' || options.expires.toUTCString)) {
            var date;
            if (typeof options.expires == 'number') {
                date = new Date();
                date.setTime(date.getTime() + (options.expires * 24 * 60 * 60 * 1000));
            } else {
                date = options.expires;
            }
            expires = '; expires=' + date.toUTCString(); // use expires attribute, max-age is not supported by IE
        }
        // CAUTION: Needed to parenthesize options.path and options.domain
        // in the following expressions, otherwise they evaluate to undefined
        // in the packed version for some reason...
        var path = options.path ? '; path=' + (options.path) : '';
        var domain = options.domain ? '; domain=' + (options.domain) : '';
        var secure = options.secure ? '; secure' : '';
        document.cookie = [name, '=', encodeURIComponent(value), expires, path, domain, secure].join('');
    } else { // only name given, get cookie
        var cookieValue = null;
        if (document.cookie && document.cookie != '') {
            var cookies = document.cookie.split(';');
            for (var i = 0; i < cookies.length; i++) {
                var cookie = jQuery.trim(cookies[i]);
                // Does this cookie string begin with the name we want?
                if (cookie.substring(0, name.length + 1) == (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }
};

// -----------------------------------------------------------------------
// eros@recoding.it
// jqprint 0.3
//
// - 19/06/2009 - some new implementations, added Opera support
// - 11/05/2009 - first sketch
//
// Printing plug-in for jQuery, evolution of jPrintArea: http://plugins.jquery.com/project/jPrintArea
// requires jQuery 1.3.x
//------------------------------------------------------------------------

(function($) {
    var opt;

    $.fn.jqprint = function (options, callback) {
        opt = $.extend({}, $.fn.jqprint.defaults, options);

        var $element = (this instanceof jQuery) ? this : $(this);
        
        if (opt.operaSupport && $.browser.opera) { 
            var tab = window.open("","jqPrint-preview");
            tab.document.open();

            var doc = tab.document;
        } else {
            var $iframe = $("<iframe  />");
        
            if (!opt.debug) 
				$iframe.css({ position: "absolute", width: "0px", height: "0px", left: "-600px", top: "-600px" });

            $iframe.appendTo("body");
            var doc = $iframe[0].contentWindow.document;
        }
        
        if (opt.importCSS) {
           $("link").each(function() {
               doc.write("<link type='text/css' rel='stylesheet' href='" + $(this).attr("href") + "' media='"+ $(this).attr("media") +"' />");
           });
        }
        
        if (opt.printContainer) { doc.write($element.outer()); }
        else { $element.each( function() { doc.write($(this).html()); }); }
        
        doc.close();
        
        (opt.operaSupport && $.browser.opera ? tab : $iframe[0].contentWindow).focus();
        setTimeout(function() { 
			(opt.operaSupport && $.browser.opera ? tab : $iframe[0].contentWindow).print(); 
			if (tab) tab.close();
			if (typeof callback == 'function') callback.call(this, $element);
		}, 1000);
    }
    
    $.fn.jqprint.defaults = {
		debug: false,
		importCSS: true, 
		printContainer: true,
		operaSupport: true
	};

    // Thanks to 9__, found at http://users.livejournal.com/9__/380664.html
    jQuery.fn.outer = function() {
      return $($('<div></div>').html(this.clone())).html();
    } 
})(jQuery);

/**
 * jQuery.fn.sortElements
 * --------------
 * @param Function comparator:
 *   Exactly the same behaviour as [1,2,3].sort(comparator)
 *   
 * @param Function getSortable
 *   A function that should return the element that is
 *   to be sorted. The comparator will run on the
 *   current collection, but you may want the actual
 *   resulting sort to occur on a parent or another
 *   associated element.
 *   
 *   E.g. $('td').sortElements(comparator, function(){
 *      return this.parentNode; 
 *   })
 *   
 *   The <td>'s parent (<tr>) will be sorted instead
 *   of the <td> itself.
 */
jQuery.fn.sortElements = (function(){
    var sort = [].sort;
 
    return function(comparator, getSortable) {
        getSortable = getSortable || function(){return this;};
 
        var placements = this.map(function(){ 
            var sortElement = getSortable.call(this),
                parentNode = sortElement.parentNode,
 
                // Since the element itself will change position, we have
                // to have some way of storing its original position in
                // the DOM. The easiest way is to have a 'flag' node:
                nextSibling = parentNode.insertBefore(
                    document.createTextNode(''),
                    sortElement.nextSibling
                );

            return function() {
                if (parentNode === this) {
                    throw new Error(
                        "You can't sort elements if any one is a descendant of another."
                    );
                }
 
                // Insert before flag:
                parentNode.insertBefore(this, nextSibling);
                // Remove flag:
                parentNode.removeChild(nextSibling);
            };
        });
 
        return sort.call(this, comparator).each(function(i){
            placements[i].call(getSortable.call(this));
        });
    };
})();

/*
 * Date Format 1.2.3
 * (c) 2007-2009 Steven Levithan <stevenlevithan.com>
 * MIT license
 *
 * Includes enhancements by Scott Trenda <scott.trenda.net>
 * and Kris Kowal <cixar.com/~kris.kowal/>
 *
 * Accepts a date, a mask, or a date and a mask.
 * Returns a formatted version of the given date.
 * The date defaults to the current date/time.
 * The mask defaults to dateFormat.masks.default.
 */

var dateFormat = function () {
	var	token = /d{1,4}|m{1,4}|yy(?:yy)?|([HhMsTt])\1?|[LloSZ]|"[^"]*"|'[^']*'/g,
		timezone = /\b(?:[PMCEA][SDP]T|(?:Pacific|Mountain|Central|Eastern|Atlantic) (?:Standard|Daylight|Prevailing) Time|(?:GMT|UTC)(?:[-+]\d{4})?)\b/g,
		timezoneClip = /[^-+\dA-Z]/g,
		pad = function (val, len) {
			val = String(val);
			len = len || 2;
			while (val.length < len) val = "0" + val;
			return val;
		};

	// Regexes and supporting functions are cached through closure
	return function (date, mask, utc) {
		var dF = dateFormat;

		// You can't provide utc if you skip other args (use the "UTC:" mask prefix)
		if (arguments.length == 1 && Object.prototype.toString.call(date) == "[object String]" && !/\d/.test(date)) {
			mask = date;
			date = undefined;
		}

		// Passing date through Date applies Date.parse, if necessary
		date = date ? new Date(date) : new Date;
		if (isNaN(date)) throw SyntaxError("invalid date");

		mask = String(dF.masks[mask] || mask || dF.masks["default"]);

		// Allow setting the utc argument via the mask
		if (mask.slice(0, 4) == "UTC:") {
			mask = mask.slice(4);
			utc = true;
		}

		var	_ = utc ? "getUTC" : "get",
			d = date[_ + "Date"](),
			D = date[_ + "Day"](),
			m = date[_ + "Month"](),
			y = date[_ + "FullYear"](),
			H = date[_ + "Hours"](),
			M = date[_ + "Minutes"](),
			s = date[_ + "Seconds"](),
			L = date[_ + "Milliseconds"](),
			o = utc ? 0 : date.getTimezoneOffset(),
			flags = {
				d:    d,
				dd:   pad(d),
				ddd:  dF.i18n.dayNames[D],
				dddd: dF.i18n.dayNames[D + 7],
				m:    m + 1,
				mm:   pad(m + 1),
				mmm:  dF.i18n.monthNames[m],
				mmmm: dF.i18n.monthNames[m + 12],
				yy:   String(y).slice(2),
				yyyy: y,
				h:    H % 12 || 12,
				hh:   pad(H % 12 || 12),
				H:    H,
				HH:   pad(H),
				M:    M,
				MM:   pad(M),
				s:    s,
				ss:   pad(s),
				l:    pad(L, 3),
				L:    pad(L > 99 ? Math.round(L / 10) : L),
				t:    H < 12 ? "a"  : "p",
				tt:   H < 12 ? "am" : "pm",
				T:    H < 12 ? "A"  : "P",
				TT:   H < 12 ? "AM" : "PM",
				Z:    utc ? "UTC" : (String(date).match(timezone) || [""]).pop().replace(timezoneClip, ""),
				o:    (o > 0 ? "-" : "+") + pad(Math.floor(Math.abs(o) / 60) * 100 + Math.abs(o) % 60, 4),
				S:    ["th", "st", "nd", "rd"][d % 10 > 3 ? 0 : (d % 100 - d % 10 != 10) * d % 10]
			};

		return mask.replace(token, function ($0) {
			return $0 in flags ? flags[$0] : $0.slice(1, $0.length - 1);
		});
	};
}();

// Some common format strings
dateFormat.masks = {
	"default":      "ddd mmm dd yyyy HH:MM:ss",
	shortDate:      "m/d/yy",
	mediumDate:     "mmm d, yyyy",
	longDate:       "mmmm d, yyyy",
	fullDate:       "dddd, mmmm d, yyyy",
	shortTime:      "h:MM TT",
	mediumTime:     "h:MM:ss TT",
	longTime:       "h:MM:ss TT Z",
	isoDate:        "yyyy-mm-dd",
	isoTime:        "HH:MM:ss",
	isoDateTime:    "yyyy-mm-dd'T'HH:MM:ss",
	isoUtcDateTime: "UTC:yyyy-mm-dd'T'HH:MM:ss'Z'"
};

// Internationalization strings
dateFormat.i18n = {
	dayNames: [
		"Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat",
		"Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
	],
	monthNames: [
		"Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
		"January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"
	]
};

// For convenience...
Date.prototype.format = function (mask, utc) {
	return dateFormat(this, mask, utc);
};

/**
 * Custom jQuery 1.3.2 Plugin
 * Hinty by Diego Salazar, oct. 2009
 * diego at greyrobot dot com
 */
// applies a text hint to the field by using the title attribute
jQuery.fn.hinty = function() {
	return this.each(function(){
		var $this = jQuery(this);
		var title = this.title;

		if (!$this.val() || $this.val() == '' || $this.val() == title) {
			$this.addClass('hint_text');
			$this.val(title);
		}

		// set the caret position to 0, making it appear that the hint text is non selectable
		$this.focus(setCaretPos).click(setCaretPos);
		function setCaretPos(){
			if (this.value == title){
				if (this.setSelectionRange) {
					this.focus();
					// FF throws an exception when calling setSelectionRange on a field that is not visible or any of its parents are not visible
					if ($this.parent().is(':visible') && $this.is(':visible')) {
						this.setSelectionRange(0, 0);
					}
				} else if (this.createTextRange) {
					var range = this.createTextRange();
					range.collapse(true);
					range.moveEnd('character', 0);
					range.moveStart('character', 0);
					range.select();
				}
			}
		}

		// get rid of hint text when a key is pressed on the input
		$this.keydown(function(){
			if ($this.val() == title) {
				$this.removeClass('hint_text');
				$this.val('');
			}
		});

		// put the hint text back if the input is blank
		$this.blur(function(){
			if ($this.val() == '') {
				$this.addClass('hint_text');
				$this.val(title);
			}
		});
	});
}

/**
 * Custom jQuery 1.3.2 plugin
 * formBouncer by Diego Salazar, Oct. 2009
 * diego at greyrobot dot com
 * 
 */

jQuery.fn.formBouncer = function(){
	return this.each(function(){
		var $this = $(this);
		
		$this.submit(function() {
			$('.invalid', this).removeClass('invalid');
			$('.error', this).remove();
			
			if ($this.runValidation().data('valid')) {
				// clear any values that are the same as the title attr, caused by hinty
				$('input, textarea', this).each(function() {
					var field = $(this);
					if (field.val() == field.attr('title')) field.val('');
				});
			}
			
			return $this.data('valid');
		});
	});
}

jQuery.fn.runValidation = function(silent) {
	var valid_email = /^([A-Za-z0-9_\-\.])+\@([A-Za-z0-9_\-\.])+\.([A-Za-z]{2,4})$/,
		valid_phone = /^\(?(\d{3})\)?[- ]?(\d{3})[- ]?(\d{4})$/,
		valid_date = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/,
		valid_zip = /\d{5}/,
		numeric_class_regex = /(numeric_)/,
		form  = $(this),
		silent = silent || form.hasClass('silent');
		errors = '';
		
	function valid_credit_card(value) {
		// accept only digits, dashes or spaces
		if (/[^0-9-\s]+/.test(value)) return false;
			
		var nCheck = 0,
			nDigit = 0,
			bEven = false;

		value = value.replace(/\D/g, "");

		for (n = value.length - 1; n >= 0; n--) {
			var cDigit = value.charAt(n),
				nDigit = parseInt(cDigit, 10);
			
			if (bEven) {
				if ((nDigit *= 2) > 9)
					nDigit -= 9;
			}
			
			nCheck += nDigit;
			bEven = !bEven;
		}

		return (nCheck % 10) == 0;
	}
	
	function password_input_exists(form) {
		return jQuery('input[type=password]', form).length > 0
	}
	
	function error_html(input, msg) {
		if (form.hasClass('less_verbose')) {
			return '<p>'+ msg +'</p>';
		} else {
			var name = input.attr('name').split('[');
			name = name[name.length-1].replace(']', '').replaceAll('_', ' ');
			return '<p>' + capitalize(name) + ' '+ msg +'.</p>';
		}
	}

	function markInvalid(input, form) {
		if (!input.hasClass('invalid')) input.addClass('invalid').removeClass('hint_text');
		$('.invalid', form).eq(0).focus();

		$('.invalid', form).blur(function(){
			$(this).parent().runValidation(form.hasClass('silent'));
		});
	}
	
	function is_numeric(input) {
		return numeric_class_regex.test(input.attr('class'));
	}
	
	// remove previous errors
	$('.error', form).remove();

	jQuery('input, select, textarea', form).each(function(){
		var input = jQuery(this).removeClass('invalid'), 
			error = '';
		
		if (!input.attr('disabled')) {
			
			if (input.hasClass('required')) {
				if (input.is(':checkbox') && !input.is(':checked')) {
					error = error_html(input, 'must be checked');
					markInvalid(input, form);
					
				} else if (input.is(':radio') && !$('input[name='+ input.attr('name') +']:checked').length) {
					error = '<p>pick one</p>';
					markInvalid(input, form);
					
				} else if (input.val() == '' || input.val() == input.attr('title')) {
					error = error_html(input, 'is required');
					markInvalid(input, form);
				}
				
				errors += error;
			}

			if (input.hasClass('email') && (input.val() != '' && valid_email.test(input.val()) == false)) {
				error = error_html(input, 'is not valid');
				errors += error;
				markInvalid(input, form);
			}

			if (is_numeric(input)) {
				if (input.hasClass('numeric_phone') && !valid_phone.test(input.val())) {
					error = error_html(input, 'must be a valid US phone number w/ area code');
					markInvalid(input, form);
				} else if (input.hasClass('numeric_date') && !valid_date.test(input.val())) {
					error = error_html(input, 'must be a valid date: mm/dd/yyyy');
					markInvalid(input, form);
				} else if (input.hasClass('numeric_zip') && !valid_zip.test(input.val())) {
					error = error_html(input, 'must be a 5 digit zip');
					markInvalid(input, form);
				}
				errors += error;
			}

			if (input.hasClass('confirm') && password_input_exists(form) && jQuery('input[type=password]', form)[0].value != input.val() ) {
				error = '<p>Passwords do not match.</p>';
				errors += error;
				markInvalid(input, form);
			}
			
			if(input.hasClass('credit_card') && !valid_credit_card(input.val())) {
				error = error_html(input, 'is invalid');
				errors += error;
				markInvalid(input, form);
			}
		}
		
		if (error != '' && !silent) {
			jQuery('.error', input.parent()).remove();
			input.before('<div class=\'flash error hidden\'>' + error + '</div>');
			jQuery('.error', input.parent()).slideDown();
		}

	});

	errors != '' ? form.data('valid', false) : form.data('valid', true);
	
	return form;
};

Array.prototype.max = function() {
    return Math.max.apply(Math, this);
};
Array.prototype.min = function() {
    return Math.min.apply(Math, this);
};

jQuery.ajaxSetup({
  beforeSend: function(xhr) {xhr.setRequestHeader("Accept", "text/javascript")}
});
jQuery.extend(jQuery.browser, { SafariMobile : navigator.userAgent.toLowerCase().match(/iP(hone|ad)/i) });

var Inflector = function(){};

Inflector.prototype = {
    /*
     * The order of all these lists has been reversed from the way 
     * ActiveSupport had them to keep the correct priority.
     */
    plural: [
        [/(quiz)$/i,               "$1zes"  ],
        [/^(ox)$/i,                "$1en"   ],
        [/([m|l])ouse$/i,          "$1ice"  ],
        [/(matr|vert|ind)ix|ex$/i, "$1ices" ],
        [/(x|ch|ss|sh)$/i,         "$1es"   ],
        [/([^aeiouy]|qu)y$/i,      "$1ies"  ],
        [/(hive)$/i,               "$1s"    ],
        [/(?:([^f])fe|([lr])f)$/i, "$1$2ves"],
        [/sis$/i,                  "ses"    ],
        [/([ti])um$/i,             "$1a"    ],
        [/(buffal|tomat)o$/i,      "$1oes"  ],
        [/(bu)s$/i,                "$1ses"  ],
        [/(alias|status)$/i,       "$1es"   ],
        [/(octop|vir)us$/i,        "$1i"    ],
        [/(ax|test)is$/i,          "$1es"   ],
        [/s$/i,                    "s"      ],
        [/$/,                      "s"      ]
    ],
    singular: [
        [/(quiz)zes$/i,                                                    "$1"     ],
        [/(matr)ices$/i,                                                   "$1ix"   ],
        [/(vert|ind)ices$/i,                                               "$1ex"   ],
        [/^(ox)en/i,                                                       "$1"     ],
        [/(alias|status)es$/i,                                             "$1"     ],
        [/(octop|vir)i$/i,                                                 "$1us"   ],
        [/(cris|ax|test)es$/i,                                             "$1is"   ],
        [/(shoe)s$/i,                                                      "$1"     ],
        [/(o)es$/i,                                                        "$1"     ],
        [/(bus)es$/i,                                                      "$1"     ],
        [/([m|l])ice$/i,                                                   "$1ouse" ],
        [/(x|ch|ss|sh)es$/i,                                               "$1"     ],
        [/(m)ovies$/i,                                                     "$1ovie" ],
        [/(s)eries$/i,                                                     "$1eries"],
        [/([^aeiouy]|qu)ies$/i,                                            "$1y"    ],
        [/([lr])ves$/i,                                                    "$1f"    ],
        [/(tive)s$/i,                                                      "$1"     ],
        [/(hive)s$/i,                                                      "$1"     ],
        [/([^f])ves$/i,                                                    "$1fe"   ],
        [/(^analy)ses$/i,                                                  "$1sis"  ],
        [/((a)naly|(b)a|(d)iagno|(p)arenthe|(p)rogno|(s)ynop|(t)he)ses$/i, "$1$2sis"],
        [/([ti])a$/i,                                                      "$1um"   ],
        [/(n)ews$/i,                                                       "$1ews"  ],
        [/s$/i,                                                            ""       ]
    ],
    irregular: [
        ['move',   'moves'   ],
        ['sex',    'sexes'   ],
        ['child',  'children'],
        ['man',    'men'     ],
        ['person', 'people'  ]
    ],
    uncountable: [
        "sheep",
        "fish",
        "series",
        "species",
        "money",
        "rice",
        "information",
        "equipment"
    ],
    initialize: function() {
        // Nothing here now
    },
    ordinalize: function(number) {
        if (11 <= parseInt(number) % 100 && parseInt(number) % 100 <= 13) {
            return number + "th";
        } else {
            switch (parseInt(number) % 10) {
                case  1: return number + "st";
                case  2: return number + "nd";
                case  3: return number + "rd";
                default: return number + "th";
            }
        }
    },
    pluralize: function(word) {
        for (var i = 0; i < this.uncountable.length; i++) {
            var uncountable = this.uncountable[i];
            if (word.toLowerCase() == uncountable) {
                return uncountable;
            }
        }
        for (var i = 0; i < this.irregular.length; i++) {
            var singular = this.irregular[i][0];
            var plural   = this.irregular[i][1];
            if ((word.toLowerCase() == singular) || (word == plural)) {
                return plural;
            }
        }
        for (var i = 0; i < this.plural.length; i++) {
            var regex          = this.plural[i][0];
            var replace_string = this.plural[i][1];
            if (regex.test(word)) {
                return word.replace(regex, replace_string);
            }
        }
    },
    singularize: function(word) {
        for (var i = 0; i < this.uncountable.length; i++) {
            var uncountable = this.uncountable[i];
            if (word.toLowerCase() == uncountable) {
                return uncountable;
            }
        }
        for (var i = 0; i < this.irregular.length; i++) {
            var singular = this.irregular[i][0];
            var plural   = this.irregular[i][1];
            if ((word.toLowerCase() == singular) || (word == plural)) {
                return singular;
            }
        }
        for (var i = 0; i < this.singular.length; i++) {
            var regex          = this.singular[i][0];
            var replace_string = this.singular[i][1];
            if (regex.test(word)) {
                return word.replace(regex, replace_string);
            }
        }
    }
}

function ordinalize(number) {
    var i = new Inflector;
    return i.ordinalize(number);
}

/*
 * pluralize expects between 2 to 3 arguments.
 * 1. The count of items to pluralize
 * 2. The singular form of the item to pluralize
 * 3. The plural form of the item to pluralize (optional)
 */
function pluralize() {
    var i = new Inflector;
    
    var count    = arguments[0];
    var singular = arguments[1];
    var plural   = arguments[2];
    
    if (arguments.length < 2) return "";
    if (isNaN(count))         return "";
    
    return count + " " + (1 == parseInt(count) ?
            singular :
            plural || i.pluralize(singular));
}

function singularize(plural) {
    var i = new Inflector;
    return i.singularize(plural);
}
/*
Copyright (c) Copyright (c) 2007, Carl S. Yestrau All rights reserved.
Code licensed under the BSD License: http://www.featureblend.com/license.txt
Version: 1.0.4
*/
var FlashDetect = new function(){
    var self = this;
    self.installed = false;
    self.raw = "";
    self.major = -1;
    self.minor = -1;
    self.revision = -1;
    self.revisionStr = "";
    var activeXDetectRules = [
        {
            "name":"ShockwaveFlash.ShockwaveFlash.7",
            "version":function(obj){
                return getActiveXVersion(obj);
            }
        },
        {
            "name":"ShockwaveFlash.ShockwaveFlash.6",
            "version":function(obj){
                var version = "6,0,21";
                try{
                    obj.AllowScriptAccess = "always";
                    version = getActiveXVersion(obj);
                }catch(err){}
                return version;
            }
        },
        {
            "name":"ShockwaveFlash.ShockwaveFlash",
            "version":function(obj){
                return getActiveXVersion(obj);
            }
        }
    ];
    /**
     * Extract the ActiveX version of the plugin.
     * 
     * @param {Object} The flash ActiveX object.
     * @type String
     */
    var getActiveXVersion = function(activeXObj){
        var version = -1;
        try{
            version = activeXObj.GetVariable("$version");
        }catch(err){}
        return version;
    };
    /**
     * Try and retrieve an ActiveX object having a specified name.
     * 
     * @param {String} name The ActiveX object name lookup.
     * @return One of ActiveX object or a simple object having an attribute of activeXError with a value of true.
     * @type Object
     */
    var getActiveXObject = function(name){
        var obj = -1;
        try{
            obj = new ActiveXObject(name);
        }catch(err){
            obj = {activeXError:true};
        }
        return obj;
    };
    /**
     * Parse an ActiveX $version string into an object.
     * 
     * @param {String} str The ActiveX Object GetVariable($version) return value. 
     * @return An object having raw, major, minor, revision and revisionStr attributes.
     * @type Object
     */
    var parseActiveXVersion = function(str){
        var versionArray = str.split(",");//replace with regex
        return {
            "raw":str,
            "major":parseInt(versionArray[0].split(" ")[1], 10),
            "minor":parseInt(versionArray[1], 10),
            "revision":parseInt(versionArray[2], 10),
            "revisionStr":versionArray[2]
        };
    };
    /**
     * Parse a standard enabledPlugin.description into an object.
     * 
     * @param {String} str The enabledPlugin.description value.
     * @return An object having raw, major, minor, revision and revisionStr attributes.
     * @type Object
     */
    var parseStandardVersion = function(str){
        var descParts = str.split(/ +/);
        var majorMinor = descParts[2].split(/\./);
        var revisionStr = descParts[3];
        return {
            "raw":str,
            "major":parseInt(majorMinor[0], 10),
            "minor":parseInt(majorMinor[1], 10), 
            "revisionStr":revisionStr,
            "revision":parseRevisionStrToInt(revisionStr)
        };
    };
    /**
     * Parse the plugin revision string into an integer.
     * 
     * @param {String} The revision in string format.
     * @type Number
     */
    var parseRevisionStrToInt = function(str){
        return parseInt(str.replace(/[a-zA-Z]/g, ""), 10) || self.revision;
    };
    /**
     * Is the major version greater than or equal to a specified version.
     * 
     * @param {Number} version The minimum required major version.
     * @type Boolean
     */
    self.majorAtLeast = function(version){
        return self.major >= version;
    };
    /**
     * Is the minor version greater than or equal to a specified version.
     * 
     * @param {Number} version The minimum required minor version.
     * @type Boolean
     */
    self.minorAtLeast = function(version){
        return self.minor >= version;
    };
    /**
     * Is the revision version greater than or equal to a specified version.
     * 
     * @param {Number} version The minimum required revision version.
     * @type Boolean
     */
    self.revisionAtLeast = function(version){
        return self.revision >= version;
    };
    /**
     * Is the version greater than or equal to a specified major, minor and revision.
     * 
     * @param {Number} major The minimum required major version.
     * @param {Number} (Optional) minor The minimum required minor version.
     * @param {Number} (Optional) revision The minimum required revision version.
     * @type Boolean
     */
    self.versionAtLeast = function(major){
        var properties = [self.major, self.minor, self.revision];
        var len = Math.min(properties.length, arguments.length);
        for(i=0; i<len; i++){
            if(properties[i]>=arguments[i]){
                if(i+1<len && properties[i]==arguments[i]){
                    continue;
                }else{
                    return true;
                }
            }else{
                return false;
            }
        }
    };
    /**
     * Constructor, sets raw, major, minor, revisionStr, revision and installed public properties.
     */
    self.FlashDetect = function(){
        if(navigator.plugins && navigator.plugins.length>0){
            var type = 'application/x-shockwave-flash';
            var mimeTypes = navigator.mimeTypes;
            if(mimeTypes && mimeTypes[type] && mimeTypes[type].enabledPlugin && mimeTypes[type].enabledPlugin.description){
                var version = mimeTypes[type].enabledPlugin.description;
                var versionObj = parseStandardVersion(version);
                self.raw = versionObj.raw;
                self.major = versionObj.major;
                self.minor = versionObj.minor; 
                self.revisionStr = versionObj.revisionStr;
                self.revision = versionObj.revision;
                self.installed = true;
            }
        }else if(navigator.appVersion.indexOf("Mac")==-1 && window.execScript){
            var version = -1;
            for(var i=0; i<activeXDetectRules.length && version==-1; i++){
                var obj = getActiveXObject(activeXDetectRules[i].name);
                if(!obj.activeXError){
                    self.installed = true;
                    version = activeXDetectRules[i].version(obj);
                    if(version!=-1){
                        var versionObj = parseActiveXVersion(version);
                        self.raw = versionObj.raw;
                        self.major = versionObj.major;
                        self.minor = versionObj.minor; 
                        self.revision = versionObj.revision;
                        self.revisionStr = versionObj.revisionStr;
                    }
                }
            }
        }
    }();
};
FlashDetect.JS_RELEASE = "1.0.4";
/*
 * IFrame Loader Plugin for JQuery
 * http://project.ajaxpatterns.org/jquery-iframe
 */
 (function($) {
    var timer;

    $.fn.src = function(url, onLoad, options) {
        setIFrames($(this), onLoad, options,
        function() {
            this.src = url;
        });
        return $(this);
    }

    $.fn.squirt = function(content, onLoad, options) {
        setIFrames($(this), onLoad, options,
        function() {
            var doc = this.contentDocument || this.contentWindow.document;
            doc.open();
            doc.writeln(content);
            doc.close();
        });
        return this;
    }

    function setIFrames(iframes, onLoad, options, iFrameSetter) {
        iframes.each(function() {
            if (this.tagName == "IFRAME") setIFrame(this, onLoad, options, iFrameSetter);
        });
    }

    function setIFrame(iframe, onLoad, options, iFrameSetter) {
        var iframe;
        iframe.onload = null;
        if (timer) clearTimeout(timer);

        var defaults = {
            timeoutDuration: 0,
            timeout: null
        }
        var opts = $.extend(defaults, options);
        if (opts.timeout && !opts.timeoutDuration) opts.timeoutDuration = 60000;

        opts.frameactive = true;
        var startTime = (new Date()).getTime();
        if (opts.timeout) {
            var timer = setTimeout(function() {
                opts.frameactive = false;
                iframe.onload = null;
                if (opts.timeout) opts.timeout(iframe, opts.timeout);
            },
            opts.timeoutDuration);
        };

        var onloadHandler = function() {
            var duration = (new Date()).getTime() - startTime;
            if (timer) clearTimeout(timer);
            if (onLoad && opts.frameactive) onLoad.apply(iframe, [duration]);
            opts.frameactive = false;
        }
        iFrameSetter.apply(iframe);
        iframe.onload = onloadHandler;
        opts.completeReadyStateChanges = 0;
        iframe.onreadystatechange = function() { // IE ftw
            if (++ (opts.completeReadyStateChanges) == 3) onloadHandler();
        }
        return iframe;
    };
})(jQuery);

/*
 jquery.jqDock.js v1.5
*/
(function(k,s){if(!k.jqDock){var r=["Top","Right","Bottom","Left"],E=["Major","Minor"],y=["mouseenter","mousemove","mouseleave"],z=['<div style="position:relative;padding:0;',"margin:0;border:0 none;background-color:transparent;",'">'],p={v:{wh:"height",xy:1,tl:"top",lead:0,trail:2,inv:"h"},h:{wh:"width",xy:0,tl:"left",lead:3,trail:1,inv:"v"}},n=[],F=[0,0],S=function(){},w=function(a){a=parseInt(a,10);return isNaN(a)?0:a},t=function(a,d){if(a[d]){s.clearTimeout(a[d]);a[d]=null}},G=function(a){var d=
p[a.Opts.vh],b=0;if(a=a.Elem[a.Current]){b=a.Pad[d.lead]+a.Pad[d.trail];b=Math.floor((F[d.xy]-a.Wrap.parent().offset()[d.tl])*(b+a.Initial)/(b+a.Major))+a.Offset}return b},H=function(a){return a?1*((a.id||"").match(/^jqDock(\d+)$/)||[0,-1])[1]:-1},I=function(a){for(var d=true,b=n.length,e;d&&b--;)for(e=n[b].Elem.length;d&&e--;)d=n[b].Elem[e].Img[0]!==a;return d?!d:n[b].Elem[e]},J=function(a){var d=n[a.data.id],b=d.Elem[a.data.idx];b.height=this.height;b.width=this.width;++d.Loaded>=d.Elem.length&&
s.setTimeout(function(){k.jqDock.initDock(a.data.id)},0)},T=function(a,d){for(var b;a&&a.ownerDocument&&a!==d;){if(b=a.className.toString().match(/jqDockMouse(\d+)/))return 1*b[1];a=a.parentNode}return-1},K=function(a,d,b){var e={},c=p[b].wh;b=p[p[b].inv].wh;e[c]=d;e[b]=Math.round(d*a[b]/a[c]);return e},U=function(){k(this).prev("img").trigger("click");return false},u=function(a,d){var b=a.Elem[a.Current];if(b&&a.Opts.labels)b.Label.el[b.Label.txt&&d?"show":"hide"]()},A=function(a,d){var b=a.Opts.labels,
e=p[a.Opts.vh],c=a.Elem[a.Current],f,j,h,i;if(c&&b){h=c.Label;i=h.el;if(h.mc){h.mc=0;for(f in p){h[f]=i[p[f].wh]();for(j in{lead:1,trail:1})h[f]+=w(i.css("padding"+r[p[f][j]]))}}b.charAt(0)=="m"&&i.css({top:Math.floor((c[E[p[e.inv].xy]]-h.v)/2)});b.charAt(1)=="c"&&i.css({left:Math.floor((c[E[e.xy]]-h.h)/2)})}d&&u(a,1)},L=function(a){for(var d=a.childNodes.length,b;d;){b=a.childNodes[--d];if(b.childNodes&&b.childNodes.length)L(b);else b.nodeType==3&&a.removeChild(b)}},M=function(a){a.Menu.css({visibility:"visible"}).show()},
B=function(a){var d=a.Opts.idle;if(d){t(a,"Idler");a.Idler=s.setTimeout(function(){a.Menu.trigger("dockidle")},d)}},V=function(a,d,b){var e=a.Opts,c=e.labels,f=d.Label;f.txt=e.setLabel.call(a.Menu[0],d.Title,b);f.mc=f.mc&&!!f.txt;f.el=k('<div class="jqDockLabel jqDockLabel'+d.Link+'" style="position:absolute;margin:0;"><div class="jqDockLabelText">'+f.txt+"</div></div>").hide().insertAfter(d.Img);if(c&&f.txt){a=c.charAt(0)=="b";c=c.charAt(1)=="r";f.el.css({top:a?"auto":0,left:c?"auto":0,bottom:a?
0:"auto",right:c?0:"auto"}).click(U)}},x=function(a,d){var b=n[a],e=b.Opts,c=p[e.vh].wh,f=b.Elem.length,j,h;for(d=d||G(b);f;){j=b.Elem[--f];h=Math.abs(d-j.Centre);j.Final=h<e.distance?j[c]-Math.floor((j[c]-j.Initial)*Math.pow(h,e.coefficient)/e.attenuation):j.Initial}},W=function(a){return a},N=function(a,d,b,e){a=n[a];var c=a.Elem[d],f=a.Opts,j=a.Yard,h=p[f.vh],i=p[h.inv],l=c.src!=c.altsrc,o,g,m;if(e||c.Major!=b){o=k.boxModel||f.vh=="v"?0:a.Border[h.lead]+a.Border[h.trail];if(l&&!e&&c.Major==c.Initial)c.Img[0].src=
c.altsrc;a.Spread+=b-c.Major;g=K(c,b,f.vh);m=f.size-g[i.wh];switch(f.align){case "top":case "left":g["margin"+r[i.trail]]=m;break;case "middle":case "center":g["margin"+r[i.lead]]=(m+m%2)/2;g["margin"+r[i.trail]]=(m-m%2)/2;break;default:g["margin"+r[i.lead]]=m}if(b!=c.Major||e&&!d){f.flow&&j.parent()[h.wh](a.Spread+a.Border[h.lead]+a.Border[h.trail]);j[h.wh](a.Spread+o)}c.Wrap.css(g);f.flow||j.css(h.tl,Math.floor(Math.max(0,(a[h.wh]-a.Spread)/2)));a.OnDock&&A(a);c.Major=b;c.Minor=g[i.wh];if(l&&!e&&
b==c.Initial)c.Img[0].src=c.src}},C=function(a,d){var b=n[a],e=b.Opts,c=p[e.vh],f=e.duration+e.step,j=0,h;if(b.Stamp){f=(new Date).getTime()-b.Stamp;if(f>=e.duration)b.Stamp=0}if(f>e.step){for(e=f<e.duration?f/e.duration:0;j<b.Elem.length;){f=b.Elem[j];h=(f.Final-f.Initial)*e;h=d?e?Math.floor(f.Final-h):f.Initial:e?Math.floor(f.Initial+h):f.Final;N(a,j++,h)}if(b.Spread>b[c.wh]){b.Yard.parent()[c.wh](b.Spread+b.Border[c.lead]+b.Border[c.trail]);b[c.wh]=b.Spread}}},O=function(a,d){var b=n[a],e=b.Elem,
c=e.length;if(!b.OnDock){for(;c--&&e[c].Major<=e[c].Initial;);G(b);if(c<0){for(c=e.length;c--;)e[c].Major=e[c].Final=e[c].Initial;b.Current=-1;d||B(b)}else{C(a,true);s.setTimeout(function(){O(a,d)},b.Opts.step)}}},P=function(a){var d=n[a],b=d.Elem,e=b.length;if(d.OnDock){for(;e--&&b[e].Major>=b[e].Final;);if(e<0){d.Xpand=1;u(d,1)}else{x(a);C(a);s.setTimeout(function(){P(a)},d.Opts.step)}}},D=function(a,d,b,e){var c=n[d],f=c.Elem,j=f.length;switch(a){case 0:c.OnDock=1;c.Current>=0&&c.Current!==b&&
u(c);c.Current=b;A(c,c.Xpand);c.Stamp=(new Date).getTime();x(d);P(d);break;case 1:if(b!==c.Current){u(c);c.Current=b}A(c,c.Xpand);if(c.OnDock&&c.Xpand){x(d);C(d)}break;case 2:t(c,"Inactive");c.OnDock=c.Xpand=0;u(c);for(c.Stamp=(new Date).getTime();j--;)f[j].Final=f[j].Major;O(d,!!e);break;default:}},Q=function(a){var d=H(this),b=n[d],e=b?T(a.target,this):-1,c=-1,f;if(b)if(b.Asleep)b.Sleeper={target:a.target,type:a.type,pageX:a.pageX,pageY:a.pageY};else{f=b.OnDock;t(b,"Idler");F=[a.pageX,a.pageY];
if(a.type==y[2])if(f)c=2;else B(b);else{if(b.Opts.inactivity){t(b,"Inactive");b.Inactive=s.setTimeout(function(){D(2,d,e,true)},b.Opts.inactivity)}if(a.type==y[1])if(e<0){if(f&&b.Current>=0)c=2}else c=!f||b.Current<0?0:1;else if(e>=0&&!f)c=0}b.Sleeper=null;c>=0&&D(c,d,e)}},R=function(a){var d=k(".jqDock",this).get(0),b=H(d),e=n[b];if(e)if(a.type=="docknudge"){if(e.Asleep&&!(e.Asleep=e.Opts.onWake.call(this)===false))k(this).trigger("dockwake");if(!e.Asleep){B(e);e.Sleeper&&Q.call(d,e.Sleeper)}}else if(!e.Asleep){t(e,
"Idler");if(e.Asleep=e.Opts.onSleep.call(e.Menu[0])!==false){e.Menu.trigger("docksleep");D(2,b,0,true)}}};k.jqDock=function(){return{version:1.5,defaults:{size:48,distance:72,coefficient:1.5,duration:300,align:"bottom",labels:0,source:0,loader:0,inactivity:0,fadeIn:0,fadeLayer:"",step:50,setLabel:0,flow:0,idle:0,onReady:0,onSleep:0,onWake:0},useJqLoader:k.browser.opera||k.browser.safari,initDock:function(a){var d=n[a],b=d.Opts,e=p[b.vh],c=p[e.inv],f=d.Border,j=d.Elem.length,h=z.join(""),i=0,l=0,o,
g,m,v=b.fadeLayer;L(d.Menu[0]);for(d.Menu.children().each(function(q,X){var Y=d.Elem[q].Wrap=k(X).wrap(h+h+"</div></div>").parent();b.vh=="h"&&Y.parent().css("float","left")}).find("img").andSelf().css({position:"relative",padding:0,margin:0,borderWidth:0,borderStyle:"none",verticalAlign:"top",display:"block",width:"100%",height:"100%"});l<j;){g=d.Elem[l++];m=K(g,b.size,e.inv);g.Major=g.Final=g.Initial=m[e.wh];g.Wrap.css(m);g.Img.attr({alt:""}).parent("a").andSelf().removeAttr("title");d[c.wh]=Math.max(d[c.wh],
b.size+g.Pad[c.lead]+g.Pad[c.trail]);g.Offset=i;g.Centre=i+g.Pad[e.lead]+g.Initial/2;i+=g.Initial+g.Pad[e.lead]+g.Pad[e.trail]}for(l=0;l<j;){g=d.Elem[l++];m=g.Pad[e.lead]+g.Pad[e.trail];d.Spread+=g.Initial+m;for(o in{Centre:1,Offset:1}){x(a,g[o]);i=0;for(c=j;c--;)i+=d.Elem[c].Final+m;if(i>d[e.wh])d[e.wh]=i}}for(;l;){g=d.Elem[--l];g.Final=g.Initial}g=[z[0],z[2],'<div id="jqDock',a,'" class="jqDock" style="position:absolute;top:0;left:0;padding:0;margin:0;overflow:visible;height:',d.height,"px;width:",
d.width,'px;"></div></div>'].join("");d.Yard=k("div.jqDock",d.Menu.wrapInner(g));for(c=4;c--;)f[c]=w(d.Yard.css("border"+r[c]+"Width"));for(d.Yard.parent().addClass("jqDockWrap").width(d.width+f[1]+f[3]).height(d.height+f[0]+f[2]);l<j;l++){g=d.Elem[l];m=g.Wrap.parent();for(c=4;c--;)g.Pad[c]&&m.css("padding"+r[c],g.Pad[c]);N(a,l,g.Final,true);m.add(g.Img).addClass("jqDockMouse"+l);V(d,g,l)}g=d.Menu.bind("docknudge dockidle",R);d.Yard.bind(y.join(" "),Q).find("*").css({filter:"inherit"});if(!(d.Asleep=
b.onReady.call(d.Menu[0])===false)){a=function(q){q||k(".jqDockFilter",this).add(this).css({filter:""}).removeClass("jqDockFilter");d.Sleep=false;d.Menu.trigger("dockshow").trigger("docknudge")};if(v){if(v!="menu"){g=d.Yard;if(v=="wrap")g=g.parent()}d.Asleep=!!k(".jqDock,.jqDockWrap",g).addClass("jqDockFilter").css({filter:"inherit"});g.css({opacity:0});M(d);g.animate({opacity:1},b.fadeIn,a)}else{M(d);a(1)}}}}}();k.fn.jqDock=function(a){if(this.length&&!this.not("img").length){if(a==="get"){var d=
I(this.get(0));return d?k.extend(true,{},d,{Img:null}):null}this.each(function(b,e){var c=I(e),f=0,j,h,i;a=a||{};if(c){j=c.Major==c.Initial;for(i in{src:1,altsrc:1})if(a[i]){h=(k.isFunction(a[i])?a[i].call(e,c[i],i):a[i]).toString();if(c[i]!==h){c[i]=h;f=(i=="src"?j:!j)?i:f}}f&&k(e).attr("src",c[f])}})}else a==="nudge"||a==="idle"?this.filter(".jqDocked").each(function(){R.call(this,{type:"dock"+a})}):this.not(".jqDocked").filter(function(){return!k(this).parents(".jqDocked").length&&!k(this).children().not("img").filter(function(){return k(this).filter("a").children("img").parent().children().length!==
1}).length}).addClass("jqDocked").each(function(){var b=k(this),e=n.length,c,f,j,h;n[e]={Elem:[],Menu:b,OnDock:0,Xpand:0,Stamp:0,width:0,height:0,Spread:0,Border:[],Opts:k.extend({},k.jqDock.defaults,a||{},k.metadata?b.metadata():{}),Current:-1,Loaded:0};c=n[e];f=c.Opts;j=!f.loader&&k.jqDock.useJqLoader||f.loader==="jquery";for(h in{size:1,distance:1,duration:1,inactivity:1,fadeIn:1,step:1,idle:1})f[h]=w(f[h]);h=f.coefficient*1;f.coefficient=isNaN(h)?1.5:h;f.labels=/^[tmb][lcr]$/.test(f.labels.toString())?
f.labels:f.labels?{top:"br",left:"tr"}[f.align]||"tl":"";f.setLabel=f.setLabel?f.setLabel:W;f.fadeLayer=f.fadeIn?{dock:1,wrap:1}[f.fadeLayer]?f.fadeLayer:"menu":"";for(h in{onSleep:1,onWake:1,onReady:1})f[h]||(f[h]=S);f.attenuation=Math.pow(f.distance,f.coefficient);f.vh={left:1,center:1,right:1}[f.align]?"v":"h";k("img",b).each(function(i,l){var o=k(l),g=o.attr("src"),m=o.parent("a"),v=c.Elem,q;if(!(q=f.source?f.source.call(l,i):""))q=((q=k(l).attr("alt"))&&/\.(gif|jpg|jpeg|png)$/i.test(q)?q:false)||
g;v[i]={Img:o,src:g,altsrc:q,Title:o.attr("title")||m.attr("title")||"",Label:{mc:/[mc]/.test(f.labels)},Pad:[],Link:m.length?"Link":"Image"};for(g=4;g--;)c.Elem[i].Pad[g]=w(o.css("padding"+r[g]))});k.each(c.Elem,function(i,l){var o,g=l.altsrc;if(j)k("<img ></j>").bind("load",{id:e,idx:i},J).attr({src:g});else{o=new Image;o.onload=function(){J.call(this,{data:{id:e,idx:i}});o.onload="";o=null};o.src=g}})});return this}}})(jQuery,window);

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
      return ! this.text().toLowerCase().match(search.toLowerCase())
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
  
})(jQuery);

/*
 * jQuery Tools 1.2.5 - The missing UI library for the Web
 * 
 * [tabs, tooltip, tooltip.slide, tooltip.dynamic, scrollable, overlay, validator]
 * 
 * NO COPYRIGHTS OR LICENSES. DO WHAT YOU LIKE.
 * 
 * http://flowplayer.org/tools/
 * 
 * File generated: Sun Oct 31 01:14:26 GMT 2010
 */
(function(c){function p(d,b,a){var e=this,l=d.add(this),h=d.find(a.tabs),i=b.jquery?b:d.children(b),j;h.length||(h=d.children());i.length||(i=d.parent().find(b));i.length||(i=c(b));c.extend(this,{click:function(f,g){var k=h.eq(f);if(typeof f=="string"&&f.replace("#","")){k=h.filter("[href*="+f.replace("#","")+"]");f=Math.max(h.index(k),0)}if(a.rotate){var n=h.length-1;if(f<0)return e.click(n,g);if(f>n)return e.click(0,g)}if(!k.length){if(j>=0)return e;f=a.initialIndex;k=h.eq(f)}if(f===j)return e;
g=g||c.Event();g.type="onBeforeClick";l.trigger(g,[f]);if(!g.isDefaultPrevented()){o[a.effect].call(e,f,function(){g.type="onClick";l.trigger(g,[f])});j=f;h.removeClass(a.current);k.addClass(a.current);return e}},getConf:function(){return a},getTabs:function(){return h},getPanes:function(){return i},getCurrentPane:function(){return i.eq(j)},getCurrentTab:function(){return h.eq(j)},getIndex:function(){return j},next:function(){return e.click(j+1)},prev:function(){return e.click(j-1)},destroy:function(){h.unbind(a.event).removeClass(a.current);
i.find("a[href^=#]").unbind("click.T");return e}});c.each("onBeforeClick,onClick".split(","),function(f,g){c.isFunction(a[g])&&c(e).bind(g,a[g]);e[g]=function(k){k&&c(e).bind(g,k);return e}});if(a.history&&c.fn.history){c.tools.history.init(h);a.event="history"}h.each(function(f){c(this).bind(a.event,function(g){e.click(f,g);return g.preventDefault()})});i.find("a[href^=#]").bind("click.T",function(f){e.click(c(this).attr("href"),f)});if(location.hash&&a.tabs=="a"&&d.find("[href="+location.hash+"]").length)e.click(location.hash);
else if(a.initialIndex===0||a.initialIndex>0)e.click(a.initialIndex)}c.tools=c.tools||{version:"1.2.5"};c.tools.tabs={conf:{tabs:"a",current:"current",onBeforeClick:null,onClick:null,effect:"default",initialIndex:0,event:"click",rotate:false,history:false},addEffect:function(d,b){o[d]=b}};var o={"default":function(d,b){this.getPanes().hide().eq(d).show();b.call()},fade:function(d,b){var a=this.getConf(),e=a.fadeOutSpeed,l=this.getPanes();e?l.fadeOut(e):l.hide();l.eq(d).fadeIn(a.fadeInSpeed,b)},slide:function(d,
b){this.getPanes().slideUp(200);this.getPanes().eq(d).slideDown(400,b)},ajax:function(d,b){this.getPanes().eq(0).load(this.getTabs().eq(d).attr("href"),b)}},m;c.tools.tabs.addEffect("horizontal",function(d,b){m||(m=this.getPanes().eq(0).width());this.getCurrentPane().animate({width:0},function(){c(this).hide()});this.getPanes().eq(d).animate({width:m},function(){c(this).show();b.call()})});c.fn.tabs=function(d,b){var a=this.data("tabs");if(a){a.destroy();this.removeData("tabs")}if(c.isFunction(b))b=
{onBeforeClick:b};b=c.extend({},c.tools.tabs.conf,b);this.each(function(){a=new p(c(this),d,b);c(this).data("tabs",a)});return b.api?a:this}})(jQuery);
(function(f){function p(a,b,c){var h=c.relative?a.position().top:a.offset().top,d=c.relative?a.position().left:a.offset().left,i=c.position[0];h-=b.outerHeight()-c.offset[0];d+=a.outerWidth()+c.offset[1];if(/iPad/i.test(navigator.userAgent))h-=f(window).scrollTop();var j=b.outerHeight()+a.outerHeight();if(i=="center")h+=j/2;if(i=="bottom")h+=j;i=c.position[1];a=b.outerWidth()+a.outerWidth();if(i=="center")d-=a/2;if(i=="left")d-=a;return{top:h,left:d}}function u(a,b){var c=this,h=a.add(c),d,i=0,j=
0,m=a.attr("title"),q=a.attr("data-tooltip"),r=o[b.effect],l,s=a.is(":input"),v=s&&a.is(":checkbox, :radio, select, :button, :submit"),t=a.attr("type"),k=b.events[t]||b.events[s?v?"widget":"input":"def"];if(!r)throw'Nonexistent effect "'+b.effect+'"';k=k.split(/,\s*/);if(k.length!=2)throw"Tooltip: bad events configuration for "+t;a.bind(k[0],function(e){clearTimeout(i);if(b.predelay)j=setTimeout(function(){c.show(e)},b.predelay);else c.show(e)}).bind(k[1],function(e){clearTimeout(j);if(b.delay)i=
setTimeout(function(){c.hide(e)},b.delay);else c.hide(e)});if(m&&b.cancelDefault){a.removeAttr("title");a.data("title",m)}f.extend(c,{show:function(e){if(!d){if(q)d=f(q);else if(b.tip)d=f(b.tip).eq(0);else if(m)d=f(b.layout).addClass(b.tipClass).appendTo(document.body).hide().append(m);else{d=a.next();d.length||(d=a.parent().next())}if(!d.length)throw"Cannot find tooltip for "+a;}if(c.isShown())return c;d.stop(true,true);var g=p(a,d,b);b.tip&&d.html(a.data("title"));e=e||f.Event();e.type="onBeforeShow";
h.trigger(e,[g]);if(e.isDefaultPrevented())return c;g=p(a,d,b);d.css({position:"absolute",top:g.top,left:g.left});l=true;r[0].call(c,function(){e.type="onShow";l="full";h.trigger(e)});g=b.events.tooltip.split(/,\s*/);if(!d.data("__set")){d.bind(g[0],function(){clearTimeout(i);clearTimeout(j)});g[1]&&!a.is("input:not(:checkbox, :radio), textarea")&&d.bind(g[1],function(n){n.relatedTarget!=a[0]&&a.trigger(k[1].split(" ")[0])});d.data("__set",true)}return c},hide:function(e){if(!d||!c.isShown())return c;
e=e||f.Event();e.type="onBeforeHide";h.trigger(e);if(!e.isDefaultPrevented()){l=false;o[b.effect][1].call(c,function(){e.type="onHide";h.trigger(e)});return c}},isShown:function(e){return e?l=="full":l},getConf:function(){return b},getTip:function(){return d},getTrigger:function(){return a}});f.each("onHide,onBeforeShow,onShow,onBeforeHide".split(","),function(e,g){f.isFunction(b[g])&&f(c).bind(g,b[g]);c[g]=function(n){n&&f(c).bind(g,n);return c}})}f.tools=f.tools||{version:"1.2.5"};f.tools.tooltip=
{conf:{effect:"toggle",fadeOutSpeed:"fast",predelay:0,delay:30,opacity:1,tip:0,position:["top","center"],offset:[0,0],relative:false,cancelDefault:true,events:{def:"mouseenter,mouseleave",input:"focus,blur",widget:"focus mouseenter,blur mouseleave",tooltip:"mouseenter,mouseleave"},layout:"<div/>",tipClass:"tooltip"},addEffect:function(a,b,c){o[a]=[b,c]}};var o={toggle:[function(a){var b=this.getConf(),c=this.getTip();b=b.opacity;b<1&&c.css({opacity:b});c.show();a.call()},function(a){this.getTip().hide();
a.call()}],fade:[function(a){var b=this.getConf();this.getTip().fadeTo(b.fadeInSpeed,b.opacity,a)},function(a){this.getTip().fadeOut(this.getConf().fadeOutSpeed,a)}]};f.fn.tooltip=function(a){var b=this.data("tooltip");if(b)return b;a=f.extend(true,{},f.tools.tooltip.conf,a);if(typeof a.position=="string")a.position=a.position.split(/,?\s/);this.each(function(){b=new u(f(this),a);f(this).data("tooltip",b)});return a.api?b:this}})(jQuery);
(function(d){var i=d.tools.tooltip;d.extend(i.conf,{direction:"up",bounce:false,slideOffset:10,slideInSpeed:200,slideOutSpeed:200,slideFade:!d.browser.msie});var e={up:["-","top"],down:["+","top"],left:["-","left"],right:["+","left"]};i.addEffect("slide",function(g){var a=this.getConf(),f=this.getTip(),b=a.slideFade?{opacity:a.opacity}:{},c=e[a.direction]||e.up;b[c[1]]=c[0]+"="+a.slideOffset;a.slideFade&&f.css({opacity:0});f.show().animate(b,a.slideInSpeed,g)},function(g){var a=this.getConf(),f=a.slideOffset,
b=a.slideFade?{opacity:0}:{},c=e[a.direction]||e.up,h=""+c[0];if(a.bounce)h=h=="+"?"-":"+";b[c[1]]=h+"="+f;this.getTip().animate(b,a.slideOutSpeed,function(){d(this).hide();g.call()})})})(jQuery);
(function(g){function j(a){var c=g(window),d=c.width()+c.scrollLeft(),h=c.height()+c.scrollTop();return[a.offset().top<=c.scrollTop(),d<=a.offset().left+a.width(),h<=a.offset().top+a.height(),c.scrollLeft()>=a.offset().left]}function k(a){for(var c=a.length;c--;)if(a[c])return false;return true}var i=g.tools.tooltip;i.dynamic={conf:{classNames:"top right bottom left"}};g.fn.dynamic=function(a){if(typeof a=="number")a={speed:a};a=g.extend({},i.dynamic.conf,a);var c=a.classNames.split(/\s/),d;this.each(function(){var h=
g(this).tooltip().onBeforeShow(function(e,f){e=this.getTip();var b=this.getConf();d||(d=[b.position[0],b.position[1],b.offset[0],b.offset[1],g.extend({},b)]);g.extend(b,d[4]);b.position=[d[0],d[1]];b.offset=[d[2],d[3]];e.css({visibility:"hidden",position:"absolute",top:f.top,left:f.left}).show();f=j(e);if(!k(f)){if(f[2]){g.extend(b,a.top);b.position[0]="top";e.addClass(c[0])}if(f[3]){g.extend(b,a.right);b.position[1]="right";e.addClass(c[1])}if(f[0]){g.extend(b,a.bottom);b.position[0]="bottom";e.addClass(c[2])}if(f[1]){g.extend(b,
a.left);b.position[1]="left";e.addClass(c[3])}if(f[0]||f[2])b.offset[0]*=-1;if(f[1]||f[3])b.offset[1]*=-1}e.css({visibility:"visible"}).hide()});h.onBeforeShow(function(){var e=this.getConf();this.getTip();setTimeout(function(){e.position=[d[0],d[1]];e.offset=[d[2],d[3]]},0)});h.onHide(function(){var e=this.getTip();e.removeClass(a.classNames)});ret=h});return a.api?ret:this}})(jQuery);
(function(e){function p(f,c){var b=e(c);return b.length<2?b:f.parent().find(c)}function u(f,c){var b=this,n=f.add(b),g=f.children(),l=0,j=c.vertical;k||(k=b);if(g.length>1)g=e(c.items,f);e.extend(b,{getConf:function(){return c},getIndex:function(){return l},getSize:function(){return b.getItems().size()},getNaviButtons:function(){return o.add(q)},getRoot:function(){return f},getItemWrap:function(){return g},getItems:function(){return g.children(c.item).not("."+c.clonedClass)},move:function(a,d){return b.seekTo(l+
a,d)},next:function(a){return b.move(1,a)},prev:function(a){return b.move(-1,a)},begin:function(a){return b.seekTo(0,a)},end:function(a){return b.seekTo(b.getSize()-1,a)},focus:function(){return k=b},addItem:function(a){a=e(a);if(c.circular){g.children("."+c.clonedClass+":last").before(a);g.children("."+c.clonedClass+":first").replaceWith(a.clone().addClass(c.clonedClass))}else g.append(a);n.trigger("onAddItem",[a]);return b},seekTo:function(a,d,h){a.jquery||(a*=1);if(c.circular&&a===0&&l==-1&&d!==
0)return b;if(!c.circular&&a<0||a>b.getSize()||a<-1)return b;var i=a;if(a.jquery)a=b.getItems().index(a);else i=b.getItems().eq(a);var r=e.Event("onBeforeSeek");if(!h){n.trigger(r,[a,d]);if(r.isDefaultPrevented()||!i.length)return b}i=j?{top:-i.position().top}:{left:-i.position().left};l=a;k=b;if(d===undefined)d=c.speed;g.animate(i,d,c.easing,h||function(){n.trigger("onSeek",[a])});return b}});e.each(["onBeforeSeek","onSeek","onAddItem"],function(a,d){e.isFunction(c[d])&&e(b).bind(d,c[d]);b[d]=function(h){h&&
e(b).bind(d,h);return b}});if(c.circular){var s=b.getItems().slice(-1).clone().prependTo(g),t=b.getItems().eq(1).clone().appendTo(g);s.add(t).addClass(c.clonedClass);b.onBeforeSeek(function(a,d,h){if(!a.isDefaultPrevented())if(d==-1){b.seekTo(s,h,function(){b.end(0)});return a.preventDefault()}else d==b.getSize()&&b.seekTo(t,h,function(){b.begin(0)})});b.seekTo(0,0,function(){})}var o=p(f,c.prev).click(function(){b.prev()}),q=p(f,c.next).click(function(){b.next()});if(!c.circular&&b.getSize()>1){b.onBeforeSeek(function(a,
d){setTimeout(function(){if(!a.isDefaultPrevented()){o.toggleClass(c.disabledClass,d<=0);q.toggleClass(c.disabledClass,d>=b.getSize()-1)}},1)});c.initialIndex||o.addClass(c.disabledClass)}c.mousewheel&&e.fn.mousewheel&&f.mousewheel(function(a,d){if(c.mousewheel){b.move(d<0?1:-1,c.wheelSpeed||50);return false}});if(c.touch){var m={};g[0].ontouchstart=function(a){a=a.touches[0];m.x=a.clientX;m.y=a.clientY};g[0].ontouchmove=function(a){if(a.touches.length==1&&!g.is(":animated")){var d=a.touches[0],h=
m.x-d.clientX;d=m.y-d.clientY;b[j&&d>0||!j&&h>0?"next":"prev"]();a.preventDefault()}}}c.keyboard&&e(document).bind("keydown.scrollable",function(a){if(!(!c.keyboard||a.altKey||a.ctrlKey||e(a.target).is(":input")))if(!(c.keyboard!="static"&&k!=b)){var d=a.keyCode;if(j&&(d==38||d==40)){b.move(d==38?-1:1);return a.preventDefault()}if(!j&&(d==37||d==39)){b.move(d==37?-1:1);return a.preventDefault()}}});c.initialIndex&&b.seekTo(c.initialIndex,0,function(){})}e.tools=e.tools||{version:"1.2.5"};e.tools.scrollable=
{conf:{activeClass:"active",circular:false,clonedClass:"cloned",disabledClass:"disabled",easing:"swing",initialIndex:0,item:null,items:".items",keyboard:true,mousewheel:false,next:".next",prev:".prev",speed:400,vertical:false,touch:true,wheelSpeed:0}};var k;e.fn.scrollable=function(f){var c=this.data("scrollable");if(c)return c;f=e.extend({},e.tools.scrollable.conf,f);this.each(function(){c=new u(e(this),f);e(this).data("scrollable",c)});return f.api?c:this}})(jQuery);
(function(a){function t(d,b){var c=this,j=d.add(c),o=a(window),k,f,m,g=a.tools.expose&&(b.mask||b.expose),n=Math.random().toString().slice(10);if(g){if(typeof g=="string")g={color:g};g.closeOnClick=g.closeOnEsc=false}var p=b.target||d.attr("rel");f=p?a(p):d;if(!f.length)throw"Could not find Overlay: "+p;d&&d.index(f)==-1&&d.click(function(e){c.load(e);return e.preventDefault()});a.extend(c,{load:function(e){if(c.isOpened())return c;var h=q[b.effect];if(!h)throw'Overlay: cannot find effect : "'+b.effect+
'"';b.oneInstance&&a.each(s,function(){this.close(e)});e=e||a.Event();e.type="onBeforeLoad";j.trigger(e);if(e.isDefaultPrevented())return c;m=true;g&&a(f).expose(g);var i=b.top,r=b.left,u=f.outerWidth({margin:true}),v=f.outerHeight({margin:true});if(typeof i=="string")i=i=="center"?Math.max((o.height()-v)/2,0):parseInt(i,10)/100*o.height();if(r=="center")r=Math.max((o.width()-u)/2,0);h[0].call(c,{top:i,left:r},function(){if(m){e.type="onLoad";j.trigger(e)}});g&&b.closeOnClick&&a.mask.getMask().one("click",
c.close);b.closeOnClick&&a(document).bind("click."+n,function(l){a(l.target).parents(f).length||c.close(l)});b.closeOnEsc&&a(document).bind("keydown."+n,function(l){l.keyCode==27&&c.close(l)});return c},close:function(e){if(!c.isOpened())return c;e=e||a.Event();e.type="onBeforeClose";j.trigger(e);if(!e.isDefaultPrevented()){m=false;q[b.effect][1].call(c,function(){e.type="onClose";j.trigger(e)});a(document).unbind("click."+n).unbind("keydown."+n);g&&a.mask.close();return c}},getOverlay:function(){return f},
getTrigger:function(){return d},getClosers:function(){return k},isOpened:function(){return m},getConf:function(){return b}});a.each("onBeforeLoad,onStart,onLoad,onBeforeClose,onClose".split(","),function(e,h){a.isFunction(b[h])&&a(c).bind(h,b[h]);c[h]=function(i){i&&a(c).bind(h,i);return c}});k=f.find(b.close||".close");if(!k.length&&!b.close){k=a('<a class="close"></a>');f.prepend(k)}k.click(function(e){c.close(e)});b.load&&c.load()}a.tools=a.tools||{version:"1.2.5"};a.tools.overlay={addEffect:function(d,
b,c){q[d]=[b,c]},conf:{close:null,closeOnClick:true,closeOnEsc:true,closeSpeed:"fast",effect:"default",fixed:!a.browser.msie||a.browser.version>6,left:"center",load:false,mask:null,oneInstance:true,speed:"normal",target:null,top:"10%"}};var s=[],q={};a.tools.overlay.addEffect("default",function(d,b){var c=this.getConf(),j=a(window);if(!c.fixed){d.top+=j.scrollTop();d.left+=j.scrollLeft()}d.position=c.fixed?"fixed":"absolute";this.getOverlay().css(d).fadeIn(c.speed,b)},function(d){this.getOverlay().fadeOut(this.getConf().closeSpeed,
d)});a.fn.overlay=function(d){var b=this.data("overlay");if(b)return b;if(a.isFunction(d))d={onBeforeLoad:d};d=a.extend(true,{},a.tools.overlay.conf,d);this.each(function(){b=new t(a(this),d);s.push(b);a(this).data("overlay",b)});return d.api?b:this}})(jQuery);
(function(e){function t(a,b,c){var k=a.offset().top,f=a.offset().left,l=c.position.split(/,?\s+/),p=l[0];l=l[1];k-=b.outerHeight()-c.offset[0];f+=a.outerWidth()+c.offset[1];if(/iPad/i.test(navigator.userAgent))k-=e(window).scrollTop();c=b.outerHeight()+a.outerHeight();if(p=="center")k+=c/2;if(p=="bottom")k+=c;a=a.outerWidth();if(l=="center")f-=(a+b.outerWidth())/2;if(l=="left")f-=a;return{top:k,left:f}}function y(a){function b(){return this.getAttribute("type")==a}b.key="[type="+a+"]";return b}function u(a,
b,c){function k(g,d,i){if(!(!c.grouped&&g.length)){var j;if(i===false||e.isArray(i)){j=h.messages[d.key||d]||h.messages["*"];j=j[c.lang]||h.messages["*"].en;(d=j.match(/\$\d/g))&&e.isArray(i)&&e.each(d,function(m){j=j.replace(this,i[m])})}else j=i[c.lang]||i;g.push(j)}}var f=this,l=b.add(f);a=a.not(":button, :image, :reset, :submit");e.extend(f,{getConf:function(){return c},getForm:function(){return b},getInputs:function(){return a},reflow:function(){a.each(function(){var g=e(this),d=g.data("msg.el");
if(d){g=t(g,d,c);d.css({top:g.top,left:g.left})}});return f},invalidate:function(g,d){if(!d){var i=[];e.each(g,function(j,m){j=a.filter("[name='"+j+"']");if(j.length){j.trigger("OI",[m]);i.push({input:j,messages:[m]})}});g=i;d=e.Event()}d.type="onFail";l.trigger(d,[g]);d.isDefaultPrevented()||q[c.effect][0].call(f,g,d);return f},reset:function(g){g=g||a;g.removeClass(c.errorClass).each(function(){var d=e(this).data("msg.el");if(d){d.remove();e(this).data("msg.el",null)}}).unbind(c.errorInputEvent||
"");return f},destroy:function(){b.unbind(c.formEvent+".V").unbind("reset.V");a.unbind(c.inputEvent+".V").unbind("change.V");return f.reset()},checkValidity:function(g,d){g=g||a;g=g.not(":disabled");if(!g.length)return true;d=d||e.Event();d.type="onBeforeValidate";l.trigger(d,[g]);if(d.isDefaultPrevented())return d.result;var i=[];g.not(":radio:not(:checked)").each(function(){var m=[],n=e(this).data("messages",m),v=r&&n.is(":date")?"onHide.v":c.errorInputEvent+".v";n.unbind(v);e.each(w,function(){var o=
this,s=o[0];if(n.filter(s).length){o=o[1].call(f,n,n.val());if(o!==true){d.type="onBeforeFail";l.trigger(d,[n,s]);if(d.isDefaultPrevented())return false;var x=n.attr(c.messageAttr);if(x){m=[x];return false}else k(m,s,o)}}});if(m.length){i.push({input:n,messages:m});n.trigger("OI",[m]);c.errorInputEvent&&n.bind(v,function(o){f.checkValidity(n,o)})}if(c.singleError&&i.length)return false});var j=q[c.effect];if(!j)throw'Validator: cannot find effect "'+c.effect+'"';if(i.length){f.invalidate(i,d);return false}else{j[1].call(f,
g,d);d.type="onSuccess";l.trigger(d,[g]);g.unbind(c.errorInputEvent+".v")}return true}});e.each("onBeforeValidate,onBeforeFail,onFail,onSuccess".split(","),function(g,d){e.isFunction(c[d])&&e(f).bind(d,c[d]);f[d]=function(i){i&&e(f).bind(d,i);return f}});c.formEvent&&b.bind(c.formEvent+".V",function(g){if(!f.checkValidity(null,g))return g.preventDefault()});b.bind("reset.V",function(){f.reset()});a[0]&&a[0].validity&&a.each(function(){this.oninvalid=function(){return false}});if(b[0])b[0].checkValidity=
f.checkValidity;c.inputEvent&&a.bind(c.inputEvent+".V",function(g){f.checkValidity(e(this),g)});a.filter(":checkbox, select").filter("[required]").bind("change.V",function(g){var d=e(this);if(this.checked||d.is("select")&&e(this).val())q[c.effect][1].call(f,d,g)});var p=a.filter(":radio").change(function(g){f.checkValidity(p,g)});e(window).resize(function(){f.reflow()})}e.tools=e.tools||{version:"1.2.5"};var z=/\[type=([a-z]+)\]/,A=/^-?[0-9]*(\.[0-9]+)?$/,r=e.tools.dateinput,B=/^([a-z0-9_\.\-\+]+)@([\da-z\.\-]+)\.([a-z\.]{2,6})$/i,
C=/^(https?:\/\/)?[\da-z\.\-]+\.[a-z\.]{2,6}[#&+_\?\/\w \.\-=]*$/i,h;h=e.tools.validator={conf:{grouped:false,effect:"default",errorClass:"invalid",inputEvent:null,errorInputEvent:"keyup",formEvent:"submit",lang:"en",message:"<div/>",messageAttr:"data-message",messageClass:"error",offset:[0,0],position:"center right",singleError:false,speed:"normal"},messages:{"*":{en:"Please correct this value"}},localize:function(a,b){e.each(b,function(c,k){h.messages[c]=h.messages[c]||{};h.messages[c][a]=k})},
localizeFn:function(a,b){h.messages[a]=h.messages[a]||{};e.extend(h.messages[a],b)},fn:function(a,b,c){if(e.isFunction(b))c=b;else{if(typeof b=="string")b={en:b};this.messages[a.key||a]=b}if(b=z.exec(a))a=y(b[1]);w.push([a,c])},addEffect:function(a,b,c){q[a]=[b,c]}};var w=[],q={"default":[function(a){var b=this.getConf();e.each(a,function(c,k){c=k.input;c.addClass(b.errorClass);var f=c.data("msg.el");if(!f){f=e(b.message).addClass(b.messageClass).appendTo(document.body);c.data("msg.el",f)}f.css({visibility:"hidden"}).find("p").remove();
e.each(k.messages,function(l,p){e("<p/>").html(p).appendTo(f)});f.outerWidth()==f.parent().width()&&f.add(f.find("p")).css({display:"inline"});k=t(c,f,b);f.css({visibility:"visible",position:"absolute",top:k.top,left:k.left}).fadeIn(b.speed)})},function(a){var b=this.getConf();a.removeClass(b.errorClass).each(function(){var c=e(this).data("msg.el");c&&c.css({visibility:"hidden"})})}]};e.each("email,url,number".split(","),function(a,b){e.expr[":"][b]=function(c){return c.getAttribute("type")===b}});
e.fn.oninvalid=function(a){return this[a?"bind":"trigger"]("OI",a)};h.fn(":email","Please enter a valid email address",function(a,b){return!b||B.test(b)});h.fn(":url","Please enter a valid URL",function(a,b){return!b||C.test(b)});h.fn(":number","Please enter a numeric value.",function(a,b){return A.test(b)});h.fn("[max]","Please enter a value smaller than $1",function(a,b){if(b===""||r&&a.is(":date"))return true;a=a.attr("max");return parseFloat(b)<=parseFloat(a)?true:[a]});h.fn("[min]","Please enter a value larger than $1",
function(a,b){if(b===""||r&&a.is(":date"))return true;a=a.attr("min");return parseFloat(b)>=parseFloat(a)?true:[a]});h.fn("[required]","Please complete this mandatory field.",function(a,b){if(a.is(":checkbox"))return a.is(":checked");return!!b});h.fn("[pattern]",function(a){var b=new RegExp("^"+a.attr("pattern")+"$");return b.test(a.val())});e.fn.validator=function(a){var b=this.data("validator");if(b){b.destroy();this.removeData("validator")}a=e.extend(true,{},h.conf,a);if(this.is("form"))return this.each(function(){var c=
e(this);b=new u(c.find(":input"),c,a);c.data("validator",b)});else{b=new u(this,this.eq(0).closest("form"),a);return this.data("validator",b)}}})(jQuery);

if(!document.createElement("canvas").getContext){(function(){var Y=Math;var q=Y.round;var o=Y.sin;var B=Y.cos;var H=Y.abs;var N=Y.sqrt;var d=10;var f=d/2;function A(){return this.context_||(this.context_=new D(this))}var v=Array.prototype.slice;function g(j,m,p){var i=v.call(arguments,2);return function(){return j.apply(m,i.concat(v.call(arguments)))}}function ad(i){return String(i).replace(/&/g,"&amp;").replace(/"/g,"&quot;")}function R(j){if(!j.namespaces.g_vml_){j.namespaces.add("g_vml_","urn:schemas-microsoft-com:vml","#default#VML")}if(!j.namespaces.g_o_){j.namespaces.add("g_o_","urn:schemas-microsoft-com:office:office","#default#VML")}if(!j.styleSheets.ex_canvas_){var i=j.createStyleSheet();i.owningElement.id="ex_canvas_";i.cssText="canvas{display:inline-block;overflow:hidden;text-align:left;width:300px;height:150px}"}}R(document);var e={init:function(i){if(/MSIE/.test(navigator.userAgent)&&!window.opera){var j=i||document;j.createElement("canvas");j.attachEvent("onreadystatechange",g(this.init_,this,j))}},init_:function(p){var m=p.getElementsByTagName("canvas");for(var j=0;j<m.length;j++){this.initElement(m[j])}},initElement:function(j){if(!j.getContext){j.getContext=A;R(j.ownerDocument);j.innerHTML="";j.attachEvent("onpropertychange",z);j.attachEvent("onresize",V);var i=j.attributes;if(i.width&&i.width.specified){j.style.width=i.width.nodeValue+"px"}else{j.width=j.clientWidth}if(i.height&&i.height.specified){j.style.height=i.height.nodeValue+"px"}else{j.height=j.clientHeight}}return j}};function z(j){var i=j.srcElement;switch(j.propertyName){case"width":i.getContext().clearRect();i.style.width=i.attributes.width.nodeValue+"px";i.firstChild.style.width=i.clientWidth+"px";break;case"height":i.getContext().clearRect();i.style.height=i.attributes.height.nodeValue+"px";i.firstChild.style.height=i.clientHeight+"px";break}}function V(j){var i=j.srcElement;if(i.firstChild){i.firstChild.style.width=i.clientWidth+"px";i.firstChild.style.height=i.clientHeight+"px"}}e.init();var n=[];for(var ac=0;ac<16;ac++){for(var ab=0;ab<16;ab++){n[ac*16+ab]=ac.toString(16)+ab.toString(16)}}function C(){return[[1,0,0],[0,1,0],[0,0,1]]}function J(p,m){var j=C();for(var i=0;i<3;i++){for(var af=0;af<3;af++){var Z=0;for(var ae=0;ae<3;ae++){Z+=p[i][ae]*m[ae][af]}j[i][af]=Z}}return j}function x(j,i){i.fillStyle=j.fillStyle;i.lineCap=j.lineCap;i.lineJoin=j.lineJoin;i.lineWidth=j.lineWidth;i.miterLimit=j.miterLimit;i.shadowBlur=j.shadowBlur;i.shadowColor=j.shadowColor;i.shadowOffsetX=j.shadowOffsetX;i.shadowOffsetY=j.shadowOffsetY;i.strokeStyle=j.strokeStyle;i.globalAlpha=j.globalAlpha;i.font=j.font;i.textAlign=j.textAlign;i.textBaseline=j.textBaseline;i.arcScaleX_=j.arcScaleX_;i.arcScaleY_=j.arcScaleY_;i.lineScale_=j.lineScale_}var b={aliceblue:"#F0F8FF",antiquewhite:"#FAEBD7",aquamarine:"#7FFFD4",azure:"#F0FFFF",beige:"#F5F5DC",bisque:"#FFE4C4",black:"#000000",blanchedalmond:"#FFEBCD",blueviolet:"#8A2BE2",brown:"#A52A2A",burlywood:"#DEB887",cadetblue:"#5F9EA0",chartreuse:"#7FFF00",chocolate:"#D2691E",coral:"#FF7F50",cornflowerblue:"#6495ED",cornsilk:"#FFF8DC",crimson:"#DC143C",cyan:"#00FFFF",darkblue:"#00008B",darkcyan:"#008B8B",darkgoldenrod:"#B8860B",darkgray:"#A9A9A9",darkgreen:"#006400",darkgrey:"#A9A9A9",darkkhaki:"#BDB76B",darkmagenta:"#8B008B",darkolivegreen:"#556B2F",darkorange:"#FF8C00",darkorchid:"#9932CC",darkred:"#8B0000",darksalmon:"#E9967A",darkseagreen:"#8FBC8F",darkslateblue:"#483D8B",darkslategray:"#2F4F4F",darkslategrey:"#2F4F4F",darkturquoise:"#00CED1",darkviolet:"#9400D3",deeppink:"#FF1493",deepskyblue:"#00BFFF",dimgray:"#696969",dimgrey:"#696969",dodgerblue:"#1E90FF",firebrick:"#B22222",floralwhite:"#FFFAF0",forestgreen:"#228B22",gainsboro:"#DCDCDC",ghostwhite:"#F8F8FF",gold:"#FFD700",goldenrod:"#DAA520",grey:"#808080",greenyellow:"#ADFF2F",honeydew:"#F0FFF0",hotpink:"#FF69B4",indianred:"#CD5C5C",indigo:"#4B0082",ivory:"#FFFFF0",khaki:"#F0E68C",lavender:"#E6E6FA",lavenderblush:"#FFF0F5",lawngreen:"#7CFC00",lemonchiffon:"#FFFACD",lightblue:"#ADD8E6",lightcoral:"#F08080",lightcyan:"#E0FFFF",lightgoldenrodyellow:"#FAFAD2",lightgreen:"#90EE90",lightgrey:"#D3D3D3",lightpink:"#FFB6C1",lightsalmon:"#FFA07A",lightseagreen:"#20B2AA",lightskyblue:"#87CEFA",lightslategray:"#778899",lightslategrey:"#778899",lightsteelblue:"#B0C4DE",lightyellow:"#FFFFE0",limegreen:"#32CD32",linen:"#FAF0E6",magenta:"#FF00FF",mediumaquamarine:"#66CDAA",mediumblue:"#0000CD",mediumorchid:"#BA55D3",mediumpurple:"#9370DB",mediumseagreen:"#3CB371",mediumslateblue:"#7B68EE",mediumspringgreen:"#00FA9A",mediumturquoise:"#48D1CC",mediumvioletred:"#C71585",midnightblue:"#191970",mintcream:"#F5FFFA",mistyrose:"#FFE4E1",moccasin:"#FFE4B5",navajowhite:"#FFDEAD",oldlace:"#FDF5E6",olivedrab:"#6B8E23",orange:"#FFA500",orangered:"#FF4500",orchid:"#DA70D6",palegoldenrod:"#EEE8AA",palegreen:"#98FB98",paleturquoise:"#AFEEEE",palevioletred:"#DB7093",papayawhip:"#FFEFD5",peachpuff:"#FFDAB9",peru:"#CD853F",pink:"#FFC0CB",plum:"#DDA0DD",powderblue:"#B0E0E6",rosybrown:"#BC8F8F",royalblue:"#4169E1",saddlebrown:"#8B4513",salmon:"#FA8072",sandybrown:"#F4A460",seagreen:"#2E8B57",seashell:"#FFF5EE",sienna:"#A0522D",skyblue:"#87CEEB",slateblue:"#6A5ACD",slategray:"#708090",slategrey:"#708090",snow:"#FFFAFA",springgreen:"#00FF7F",steelblue:"#4682B4",tan:"#D2B48C",thistle:"#D8BFD8",tomato:"#FF6347",turquoise:"#40E0D0",violet:"#EE82EE",wheat:"#F5DEB3",whitesmoke:"#F5F5F5",yellowgreen:"#9ACD32"};function M(j){var p=j.indexOf("(",3);var i=j.indexOf(")",p+1);var m=j.substring(p+1,i).split(",");if(m.length==4&&j.substr(3,1)=="a"){alpha=Number(m[3])}else{m[3]=1}return m}function c(i){return parseFloat(i)/100}function u(j,m,i){return Math.min(i,Math.max(m,j))}function I(af){var m,j,i;h=parseFloat(af[0])/360%360;if(h<0){h++}s=u(c(af[1]),0,1);l=u(c(af[2]),0,1);if(s==0){m=j=i=l}else{var Z=l<0.5?l*(1+s):l+s-l*s;var ae=2*l-Z;m=a(ae,Z,h+1/3);j=a(ae,Z,h);i=a(ae,Z,h-1/3)}return"#"+n[Math.floor(m*255)]+n[Math.floor(j*255)]+n[Math.floor(i*255)]}function a(j,i,m){if(m<0){m++}if(m>1){m--}if(6*m<1){return j+(i-j)*6*m}else{if(2*m<1){return i}else{if(3*m<2){return j+(i-j)*(2/3-m)*6}else{return j}}}}function F(j){var ae,Z=1;j=String(j);if(j.charAt(0)=="#"){ae=j}else{if(/^rgb/.test(j)){var p=M(j);var ae="#",af;for(var m=0;m<3;m++){if(p[m].indexOf("%")!=-1){af=Math.floor(c(p[m])*255)}else{af=Number(p[m])}ae+=n[u(af,0,255)]}Z=p[3]}else{if(/^hsl/.test(j)){var p=M(j);ae=I(p);Z=p[3]}else{ae=b[j]||j}}}return{color:ae,alpha:Z}}var r={style:"normal",variant:"normal",weight:"normal",size:10,family:"sans-serif"};var L={};function E(i){if(L[i]){return L[i]}var p=document.createElement("div");var m=p.style;try{m.font=i}catch(j){}return L[i]={style:m.fontStyle||r.style,variant:m.fontVariant||r.variant,weight:m.fontWeight||r.weight,size:m.fontSize||r.size,family:m.fontFamily||r.family}}function w(m,j){var i={};for(var af in m){i[af]=m[af]}var ae=parseFloat(j.currentStyle.fontSize),Z=parseFloat(m.size);if(typeof m.size=="number"){i.size=m.size}else{if(m.size.indexOf("px")!=-1){i.size=Z}else{if(m.size.indexOf("em")!=-1){i.size=ae*Z}else{if(m.size.indexOf("%")!=-1){i.size=(ae/100)*Z}else{if(m.size.indexOf("pt")!=-1){i.size=ae*(4/3)*Z}else{i.size=ae}}}}}i.size*=0.981;return i}function aa(i){return i.style+" "+i.variant+" "+i.weight+" "+i.size+"px "+i.family}function S(i){switch(i){case"butt":return"flat";case"round":return"round";case"square":default:return"square"}}function D(j){this.m_=C();this.mStack_=[];this.aStack_=[];this.currentPath_=[];this.strokeStyle="#000";this.fillStyle="#000";this.lineWidth=1;this.lineJoin="miter";this.lineCap="butt";this.miterLimit=d*1;this.globalAlpha=1;this.font="10px sans-serif";this.textAlign="left";this.textBaseline="alphabetic";this.canvas=j;var i=j.ownerDocument.createElement("div");i.style.width=j.clientWidth+"px";i.style.height=j.clientHeight+"px";i.style.overflow="hidden";i.style.position="absolute";j.appendChild(i);this.element_=i;this.arcScaleX_=1;this.arcScaleY_=1;this.lineScale_=1}var t=D.prototype;t.clearRect=function(){if(this.textMeasureEl_){this.textMeasureEl_.removeNode(true);this.textMeasureEl_=null}this.element_.innerHTML=""};t.beginPath=function(){this.currentPath_=[]};t.moveTo=function(j,i){var m=this.getCoords_(j,i);this.currentPath_.push({type:"moveTo",x:m.x,y:m.y});this.currentX_=m.x;this.currentY_=m.y};t.lineTo=function(j,i){var m=this.getCoords_(j,i);this.currentPath_.push({type:"lineTo",x:m.x,y:m.y});this.currentX_=m.x;this.currentY_=m.y};t.bezierCurveTo=function(m,j,ai,ah,ag,ae){var i=this.getCoords_(ag,ae);var af=this.getCoords_(m,j);var Z=this.getCoords_(ai,ah);K(this,af,Z,i)};function K(i,Z,m,j){i.currentPath_.push({type:"bezierCurveTo",cp1x:Z.x,cp1y:Z.y,cp2x:m.x,cp2y:m.y,x:j.x,y:j.y});i.currentX_=j.x;i.currentY_=j.y}t.quadraticCurveTo=function(ag,m,j,i){var af=this.getCoords_(ag,m);var ae=this.getCoords_(j,i);var ah={x:this.currentX_+2/3*(af.x-this.currentX_),y:this.currentY_+2/3*(af.y-this.currentY_)};var Z={x:ah.x+(ae.x-this.currentX_)/3,y:ah.y+(ae.y-this.currentY_)/3};K(this,ah,Z,ae)};t.arc=function(aj,ah,ai,ae,j,m){ai*=d;var an=m?"at":"wa";var ak=aj+B(ae)*ai-f;var am=ah+o(ae)*ai-f;var i=aj+B(j)*ai-f;var al=ah+o(j)*ai-f;if(ak==i&&!m){ak+=0.125}var Z=this.getCoords_(aj,ah);var ag=this.getCoords_(ak,am);var af=this.getCoords_(i,al);this.currentPath_.push({type:an,x:Z.x,y:Z.y,radius:ai,xStart:ag.x,yStart:ag.y,xEnd:af.x,yEnd:af.y})};t.rect=function(m,j,i,p){this.moveTo(m,j);this.lineTo(m+i,j);this.lineTo(m+i,j+p);this.lineTo(m,j+p);this.closePath()};t.strokeRect=function(m,j,i,p){var Z=this.currentPath_;this.beginPath();this.moveTo(m,j);this.lineTo(m+i,j);this.lineTo(m+i,j+p);this.lineTo(m,j+p);this.closePath();this.stroke();this.currentPath_=Z};t.fillRect=function(m,j,i,p){var Z=this.currentPath_;this.beginPath();this.moveTo(m,j);this.lineTo(m+i,j);this.lineTo(m+i,j+p);this.lineTo(m,j+p);this.closePath();this.fill();this.currentPath_=Z};t.createLinearGradient=function(j,p,i,m){var Z=new U("gradient");Z.x0_=j;Z.y0_=p;Z.x1_=i;Z.y1_=m;return Z};t.createRadialGradient=function(p,ae,m,j,Z,i){var af=new U("gradientradial");af.x0_=p;af.y0_=ae;af.r0_=m;af.x1_=j;af.y1_=Z;af.r1_=i;return af};t.drawImage=function(ao,m){var ah,af,aj,aw,am,ak,aq,ay;var ai=ao.runtimeStyle.width;var an=ao.runtimeStyle.height;ao.runtimeStyle.width="auto";ao.runtimeStyle.height="auto";var ag=ao.width;var au=ao.height;ao.runtimeStyle.width=ai;ao.runtimeStyle.height=an;if(arguments.length==3){ah=arguments[1];af=arguments[2];am=ak=0;aq=aj=ag;ay=aw=au}else{if(arguments.length==5){ah=arguments[1];af=arguments[2];aj=arguments[3];aw=arguments[4];am=ak=0;aq=ag;ay=au}else{if(arguments.length==9){am=arguments[1];ak=arguments[2];aq=arguments[3];ay=arguments[4];ah=arguments[5];af=arguments[6];aj=arguments[7];aw=arguments[8]}else{throw Error("Invalid number of arguments")}}}var ax=this.getCoords_(ah,af);var p=aq/2;var j=ay/2;var av=[];var i=10;var ae=10;av.push(" <g_vml_:group",' coordsize="',d*i,",",d*ae,'"',' coordorigin="0,0"',' style="width:',i,"px;height:",ae,"px;position:absolute;");if(this.m_[0][0]!=1||this.m_[0][1]||this.m_[1][1]!=1||this.m_[1][0]){var Z=[];Z.push("M11=",this.m_[0][0],",","M12=",this.m_[1][0],",","M21=",this.m_[0][1],",","M22=",this.m_[1][1],",","Dx=",q(ax.x/d),",","Dy=",q(ax.y/d),"");var at=ax;var ar=this.getCoords_(ah+aj,af);var ap=this.getCoords_(ah,af+aw);var al=this.getCoords_(ah+aj,af+aw);at.x=Y.max(at.x,ar.x,ap.x,al.x);at.y=Y.max(at.y,ar.y,ap.y,al.y);av.push("padding:0 ",q(at.x/d),"px ",q(at.y/d),"px 0;filter:progid:DXImageTransform.Microsoft.Matrix(",Z.join(""),", sizingmethod='clip');")}else{av.push("top:",q(ax.y/d),"px;left:",q(ax.x/d),"px;")}av.push(' ">','<g_vml_:image src="',ao.src,'"',' style="width:',d*aj,"px;"," height:",d*aw,'px"',' cropleft="',am/ag,'"',' croptop="',ak/au,'"',' cropright="',(ag-am-aq)/ag,'"',' cropbottom="',(au-ak-ay)/au,'"'," />","</g_vml_:group>");this.element_.insertAdjacentHTML("BeforeEnd",av.join(""))};t.stroke=function(aj){var ah=[];var Z=false;var m=10;var ak=10;ah.push("<g_vml_:shape",' filled="',!!aj,'"',' style="position:absolute;width:',m,"px;height:",ak,'px;"',' coordorigin="0,0"',' coordsize="',d*m,",",d*ak,'"',' stroked="',!aj,'"',' path="');var al=false;var ae={x:null,y:null};var ai={x:null,y:null};for(var af=0;af<this.currentPath_.length;af++){var j=this.currentPath_[af];var ag;switch(j.type){case"moveTo":ag=j;ah.push(" m ",q(j.x),",",q(j.y));break;case"lineTo":ah.push(" l ",q(j.x),",",q(j.y));break;case"close":ah.push(" x ");j=null;break;case"bezierCurveTo":ah.push(" c ",q(j.cp1x),",",q(j.cp1y),",",q(j.cp2x),",",q(j.cp2y),",",q(j.x),",",q(j.y));break;case"at":case"wa":ah.push(" ",j.type," ",q(j.x-this.arcScaleX_*j.radius),",",q(j.y-this.arcScaleY_*j.radius)," ",q(j.x+this.arcScaleX_*j.radius),",",q(j.y+this.arcScaleY_*j.radius)," ",q(j.xStart),",",q(j.yStart)," ",q(j.xEnd),",",q(j.yEnd));break}if(j){if(ae.x==null||j.x<ae.x){ae.x=j.x}if(ai.x==null||j.x>ai.x){ai.x=j.x}if(ae.y==null||j.y<ae.y){ae.y=j.y}if(ai.y==null||j.y>ai.y){ai.y=j.y}}}ah.push(' ">');if(!aj){y(this,ah)}else{G(this,ah,ae,ai)}ah.push("</g_vml_:shape>");this.element_.insertAdjacentHTML("beforeEnd",ah.join(""))};function y(m,ae){var j=F(m.strokeStyle);var p=j.color;var Z=j.alpha*m.globalAlpha;var i=m.lineScale_*m.lineWidth;if(i<1){Z*=i}ae.push("<g_vml_:stroke",' opacity="',Z,'"',' joinstyle="',m.lineJoin,'"',' miterlimit="',m.miterLimit,'"',' endcap="',S(m.lineCap),'"',' weight="',i,'px"',' color="',p,'" />')}function G(ao,ag,aI,ap){var ah=ao.fillStyle;var az=ao.arcScaleX_;var ay=ao.arcScaleY_;var j=ap.x-aI.x;var p=ap.y-aI.y;if(ah instanceof U){var al=0;var aD={x:0,y:0};var av=0;var ak=1;if(ah.type_=="gradient"){var aj=ah.x0_/az;var m=ah.y0_/ay;var ai=ah.x1_/az;var aK=ah.y1_/ay;var aH=ao.getCoords_(aj,m);var aG=ao.getCoords_(ai,aK);var ae=aG.x-aH.x;var Z=aG.y-aH.y;al=Math.atan2(ae,Z)*180/Math.PI;if(al<0){al+=360}if(al<0.000001){al=0}}else{var aH=ao.getCoords_(ah.x0_,ah.y0_);aD={x:(aH.x-aI.x)/j,y:(aH.y-aI.y)/p};j/=az*d;p/=ay*d;var aB=Y.max(j,p);av=2*ah.r0_/aB;ak=2*ah.r1_/aB-av}var at=ah.colors_;at.sort(function(aL,i){return aL.offset-i.offset});var an=at.length;var ar=at[0].color;var aq=at[an-1].color;var ax=at[0].alpha*ao.globalAlpha;var aw=at[an-1].alpha*ao.globalAlpha;var aC=[];for(var aF=0;aF<an;aF++){var am=at[aF];aC.push(am.offset*ak+av+" "+am.color)}ag.push('<g_vml_:fill type="',ah.type_,'"',' method="none" focus="100%"',' color="',ar,'"',' color2="',aq,'"',' colors="',aC.join(","),'"',' opacity="',aw,'"',' g_o_:opacity2="',ax,'"',' angle="',al,'"',' focusposition="',aD.x,",",aD.y,'" />')}else{if(ah instanceof T){if(j&&p){var af=-aI.x;var aA=-aI.y;ag.push("<g_vml_:fill",' position="',af/j*az*az,",",aA/p*ay*ay,'"',' type="tile"',' src="',ah.src_,'" />')}}else{var aJ=F(ao.fillStyle);var au=aJ.color;var aE=aJ.alpha*ao.globalAlpha;ag.push('<g_vml_:fill color="',au,'" opacity="',aE,'" />')}}}t.fill=function(){this.stroke(true)};t.closePath=function(){this.currentPath_.push({type:"close"})};t.getCoords_=function(p,j){var i=this.m_;return{x:d*(p*i[0][0]+j*i[1][0]+i[2][0])-f,y:d*(p*i[0][1]+j*i[1][1]+i[2][1])-f}};t.save=function(){var i={};x(this,i);this.aStack_.push(i);this.mStack_.push(this.m_);this.m_=J(C(),this.m_)};t.restore=function(){if(this.aStack_.length){x(this.aStack_.pop(),this);this.m_=this.mStack_.pop()}};function k(i){return isFinite(i[0][0])&&isFinite(i[0][1])&&isFinite(i[1][0])&&isFinite(i[1][1])&&isFinite(i[2][0])&&isFinite(i[2][1])}function X(j,i,p){if(!k(i)){return}j.m_=i;if(p){var Z=i[0][0]*i[1][1]-i[0][1]*i[1][0];j.lineScale_=N(H(Z))}}t.translate=function(m,j){var i=[[1,0,0],[0,1,0],[m,j,1]];X(this,J(i,this.m_),false)};t.rotate=function(j){var p=B(j);var m=o(j);var i=[[p,m,0],[-m,p,0],[0,0,1]];X(this,J(i,this.m_),false)};t.scale=function(m,j){this.arcScaleX_*=m;this.arcScaleY_*=j;var i=[[m,0,0],[0,j,0],[0,0,1]];X(this,J(i,this.m_),true)};t.transform=function(Z,p,af,ae,j,i){var m=[[Z,p,0],[af,ae,0],[j,i,1]];X(this,J(m,this.m_),true)};t.setTransform=function(ae,Z,ag,af,p,j){var i=[[ae,Z,0],[ag,af,0],[p,j,1]];X(this,i,true)};t.drawText_=function(ak,ai,ah,an,ag){var am=this.m_,aq=1000,j=0,ap=aq,af={x:0,y:0},ae=[];var i=w(E(this.font),this.element_);var p=aa(i);var ar=this.element_.currentStyle;var Z=this.textAlign.toLowerCase();switch(Z){case"left":case"center":case"right":break;case"end":Z=ar.direction=="ltr"?"right":"left";break;case"start":Z=ar.direction=="rtl"?"right":"left";break;default:Z="left"}switch(this.textBaseline){case"hanging":case"top":af.y=i.size/1.75;break;case"middle":break;default:case null:case"alphabetic":case"ideographic":case"bottom":af.y=-i.size/2.25;break}switch(Z){case"right":j=aq;ap=0.05;break;case"center":j=ap=aq/2;break}var ao=this.getCoords_(ai+af.x,ah+af.y);ae.push('<g_vml_:line from="',-j,' 0" to="',ap,' 0.05" ',' coordsize="100 100" coordorigin="0 0"',' filled="',!ag,'" stroked="',!!ag,'" style="position:absolute;width:1px;height:1px;">');if(ag){y(this,ae)}else{G(this,ae,{x:-j,y:0},{x:ap,y:i.size})}var al=am[0][0].toFixed(3)+","+am[1][0].toFixed(3)+","+am[0][1].toFixed(3)+","+am[1][1].toFixed(3)+",0,0";var aj=q(ao.x/d)+","+q(ao.y/d);ae.push('<g_vml_:skew on="t" matrix="',al,'" ',' offset="',aj,'" origin="',j,' 0" />','<g_vml_:path textpathok="true" />','<g_vml_:textpath on="true" string="',ad(ak),'" style="v-text-align:',Z,";font:",ad(p),'" /></g_vml_:line>');this.element_.insertAdjacentHTML("beforeEnd",ae.join(""))};t.fillText=function(m,i,p,j){this.drawText_(m,i,p,j,false)};t.strokeText=function(m,i,p,j){this.drawText_(m,i,p,j,true)};t.measureText=function(m){if(!this.textMeasureEl_){var i='<span style="position:absolute;top:-20000px;left:0;padding:0;margin:0;border:none;white-space:pre;"></span>';this.element_.insertAdjacentHTML("beforeEnd",i);this.textMeasureEl_=this.element_.lastChild}var j=this.element_.ownerDocument;this.textMeasureEl_.innerHTML="";this.textMeasureEl_.style.font=this.font;this.textMeasureEl_.appendChild(j.createTextNode(m));return{width:this.textMeasureEl_.offsetWidth}};t.clip=function(){};t.arcTo=function(){};t.createPattern=function(j,i){return new T(j,i)};function U(i){this.type_=i;this.x0_=0;this.y0_=0;this.r0_=0;this.x1_=0;this.y1_=0;this.r1_=0;this.colors_=[]}U.prototype.addColorStop=function(j,i){i=F(i);this.colors_.push({offset:j,color:i.color,alpha:i.alpha})};function T(j,i){Q(j);switch(i){case"repeat":case null:case"":this.repetition_="repeat";break;case"repeat-x":case"repeat-y":case"no-repeat":this.repetition_=i;break;default:O("SYNTAX_ERR")}this.src_=j.src;this.width_=j.width;this.height_=j.height}function O(i){throw new P(i)}function Q(i){if(!i||i.nodeType!=1||i.tagName!="IMG"){O("TYPE_MISMATCH_ERR")}if(i.readyState!="complete"){O("INVALID_STATE_ERR")}}function P(i){this.code=this[i];this.message=i+": DOM Exception "+this.code}var W=P.prototype=new Error;W.INDEX_SIZE_ERR=1;W.DOMSTRING_SIZE_ERR=2;W.HIERARCHY_REQUEST_ERR=3;W.WRONG_DOCUMENT_ERR=4;W.INVALID_CHARACTER_ERR=5;W.NO_DATA_ALLOWED_ERR=6;W.NO_MODIFICATION_ALLOWED_ERR=7;W.NOT_FOUND_ERR=8;W.NOT_SUPPORTED_ERR=9;W.INUSE_ATTRIBUTE_ERR=10;W.INVALID_STATE_ERR=11;W.SYNTAX_ERR=12;W.INVALID_MODIFICATION_ERR=13;W.NAMESPACE_ERR=14;W.INVALID_ACCESS_ERR=15;W.VALIDATION_ERR=16;W.TYPE_MISMATCH_ERR=17;G_vmlCanvasManager=e;CanvasRenderingContext2D=D;CanvasGradient=U;CanvasPattern=T;DOMException=P})()};
/**
 * Copyright (c) 2009 - 2010 Chris Leonello
 * jqPlot is currently available for use in all personal or commercial projects 
 * under both the MIT (http://www.opensource.org/licenses/mit-license.php) and GPL 
 * version 2.0 (http://www.gnu.org/licenses/gpl-2.0.html) licenses. This means that you can 
 * choose the license that best suits your project and use it accordingly. 
 *
 * Although not required, the author would appreciate an email letting him 
 * know of any substantial use of jqPlot.  You can reach the author at: 
 * chris dot leonello at gmail dot com or see http://www.jqplot.com/info.php .
 *
 * If you are feeling kind and generous, consider supporting the project by
 * making a donation at: http://www.jqplot.com/donate.php .
 *
 * jqPlot includes date instance methods and printf/sprintf functions by other authors:
 *
 * Date instance methods contained in jqplot.dateMethods.js:
 *
 *     author Ken Snyder (ken d snyder at gmail dot com)
 *     date 2008-09-10
 *     version 2.0.2 (http://kendsnyder.com/sandbox/date/)     
 *     license Creative Commons Attribution License 3.0 (http://creativecommons.org/licenses/by/3.0/)
 *
 * JavaScript printf/sprintf functions contained in jqplot.sprintf.js:
 *
 *     version 2007.04.27
 *     author Ash Searle
 *     http://hexmen.com/blog/2007/03/printf-sprintf/
 *     http://hexmen.com/js/sprintf.js
 *     The author (Ash Searle) has placed this code in the public domain:
 *     "This code is unrestricted: you are free to use it however you like."
 * 
 */
(function(C){var l;C.jqplot=function(X,U,S){var T,R;if(S==null){if(U instanceof Array){T=U;R=null}else{if(U.constructor==Object){T=null;R=U}}}else{T=U;R=S}var W=new G();C("#"+X).removeClass("jqplot-error");if(C.jqplot.config.catchErrors){try{W.init(X,T,R);W.draw();W.themeEngine.init.call(W);return W}catch(V){var Y=C.jqplot.config.errorMessage||V.message;C("#"+X).append('<div class="jqplot-error-message">'+Y+"</div>");C("#"+X).addClass("jqplot-error");document.getElementById(X).style.background=C.jqplot.config.errorBackground;document.getElementById(X).style.border=C.jqplot.config.errorBorder;document.getElementById(X).style.fontFamily=C.jqplot.config.errorFontFamily;document.getElementById(X).style.fontSize=C.jqplot.config.errorFontSize;document.getElementById(X).style.fontStyle=C.jqplot.config.errorFontStyle;document.getElementById(X).style.fontWeight=C.jqplot.config.errorFontWeight}}else{W.init(X,T,R);W.draw();W.themeEngine.init.call(W);return W}};C.jqplot.debug=1;C.jqplot.config={debug:1,enablePlugins:false,defaultHeight:300,defaultWidth:400,UTCAdjust:false,timezoneOffset:new Date(new Date().getTimezoneOffset()*60000),errorMessage:"",errorBackground:"",errorBorder:"",errorFontFamily:"",errorFontSize:"",errorFontStyle:"",errorFontWeight:"",catchErrors:false,defaultTickFormatString:"%.1f"};C.jqplot.enablePlugins=C.jqplot.config.enablePlugins;C.jqplot.preInitHooks=[];C.jqplot.postInitHooks=[];C.jqplot.preParseOptionsHooks=[];C.jqplot.postParseOptionsHooks=[];C.jqplot.preDrawHooks=[];C.jqplot.postDrawHooks=[];C.jqplot.preDrawSeriesHooks=[];C.jqplot.postDrawSeriesHooks=[];C.jqplot.preDrawLegendHooks=[];C.jqplot.addLegendRowHooks=[];C.jqplot.preSeriesInitHooks=[];C.jqplot.postSeriesInitHooks=[];C.jqplot.preParseSeriesOptionsHooks=[];C.jqplot.postParseSeriesOptionsHooks=[];C.jqplot.eventListenerHooks=[];C.jqplot.preDrawSeriesShadowHooks=[];C.jqplot.postDrawSeriesShadowHooks=[];C.jqplot.ElemContainer=function(){this._elem;this._plotWidth;this._plotHeight;this._plotDimensions={height:null,width:null}};C.jqplot.ElemContainer.prototype.createElement=function(U,W,S,T,X){this._offsets=W;var R=S||"jqplot";var V=document.createElement(U);this._elem=C(V);this._elem.addClass(R);this._elem.css(T);this._elem.attr(X);return this._elem};C.jqplot.ElemContainer.prototype.getWidth=function(){if(this._elem){return this._elem.outerWidth(true)}else{return null}};C.jqplot.ElemContainer.prototype.getHeight=function(){if(this._elem){return this._elem.outerHeight(true)}else{return null}};C.jqplot.ElemContainer.prototype.getPosition=function(){if(this._elem){return this._elem.position()}else{return{top:null,left:null,bottom:null,right:null}}};C.jqplot.ElemContainer.prototype.getTop=function(){return this.getPosition().top};C.jqplot.ElemContainer.prototype.getLeft=function(){return this.getPosition().left};C.jqplot.ElemContainer.prototype.getBottom=function(){return this._elem.css("bottom")};C.jqplot.ElemContainer.prototype.getRight=function(){return this._elem.css("right")};function o(R){C.jqplot.ElemContainer.call(this);this.name=R;this._series=[];this.show=false;this.tickRenderer=C.jqplot.AxisTickRenderer;this.tickOptions={};this.labelRenderer=C.jqplot.AxisLabelRenderer;this.labelOptions={};this.label=null;this.showLabel=true;this.min=null;this.max=null;this.autoscale=false;this.pad=1.2;this.padMax=null;this.padMin=null;this.ticks=[];this.numberTicks;this.tickInterval;this.renderer=C.jqplot.LinearAxisRenderer;this.rendererOptions={};this.showTicks=true;this.showTickMarks=true;this.showMinorTicks=true;this.useSeriesColor=false;this.borderWidth=null;this.borderColor=null;this._dataBounds={min:null,max:null};this._offsets={min:null,max:null};this._ticks=[];this._label=null;this.syncTicks=null;this.tickSpacing=75;this._min=null;this._max=null;this._tickInterval=null;this._numberTicks=null;this.__ticks=null}o.prototype=new C.jqplot.ElemContainer();o.prototype.constructor=o;o.prototype.init=function(){this.renderer=new this.renderer();this.tickOptions.axis=this.name;if(this.label==null||this.label==""){this.showLabel=false}else{this.labelOptions.label=this.label}if(this.showLabel==false){this.labelOptions.show=false}if(this.pad==0){this.pad=1}if(this.padMax==0){this.padMax=1}if(this.padMin==0){this.padMin=1}if(this.padMax==null){this.padMax=(this.pad-1)/2+1}if(this.padMin==null){this.padMin=(this.pad-1)/2+1}this.pad=this.padMax+this.padMin-1;if(this.min!=null||this.max!=null){this.autoscale=false}if(this.syncTicks==null&&this.name.indexOf("y")>-1){this.syncTicks=true}else{if(this.syncTicks==null){this.syncTicks=false}}this.renderer.init.call(this,this.rendererOptions)};o.prototype.draw=function(R){return this.renderer.draw.call(this,R)};o.prototype.set=function(){this.renderer.set.call(this)};o.prototype.pack=function(S,R){if(this.show){this.renderer.pack.call(this,S,R)}if(this._min==null){this._min=this.min;this._max=this.max;this._tickInterval=this.tickInterval;this._numberTicks=this.numberTicks;this.__ticks=this._ticks}};o.prototype.reset=function(){this.renderer.reset.call(this)};o.prototype.resetScale=function(){this.min=null;this.max=null;this.numberTicks=null;this.tickInterval=null};function g(R){C.jqplot.ElemContainer.call(this);this.show=false;this.location="ne";this.labels=[];this.showLabels=true;this.showSwatches=true;this.placement="insideGrid";this.xoffset=0;this.yoffset=0;this.border;this.background;this.textColor;this.fontFamily;this.fontSize;this.rowSpacing="0.5em";this.renderer=C.jqplot.TableLegendRenderer;this.rendererOptions={};this.preDraw=false;this.marginTop=null;this.marginRight=null;this.marginBottom=null;this.marginLeft=null;this.escapeHtml=false;this._series=[];C.extend(true,this,R)}g.prototype=new C.jqplot.ElemContainer();g.prototype.constructor=g;g.prototype.setOptions=function(R){C.extend(true,this,R);if(this.placement=="inside"){this.placement="insideGrid"}if(this.xoffset>0){if(this.placement=="insideGrid"){switch(this.location){case"nw":case"w":case"sw":if(this.marginLeft==null){this.marginLeft=this.xoffset+"px"}this.marginRight="0px";break;case"ne":case"e":case"se":default:if(this.marginRight==null){this.marginRight=this.xoffset+"px"}this.marginLeft="0px";break}}else{if(this.placement=="outside"){switch(this.location){case"nw":case"w":case"sw":if(this.marginRight==null){this.marginRight=this.xoffset+"px"}this.marginLeft="0px";break;case"ne":case"e":case"se":default:if(this.marginLeft==null){this.marginLeft=this.xoffset+"px"}this.marginRight="0px";break}}}this.xoffset=0}if(this.yoffset>0){if(this.placement=="outside"){switch(this.location){case"sw":case"s":case"se":if(this.marginTop==null){this.marginTop=this.yoffset+"px"}this.marginBottom="0px";break;case"ne":case"n":case"nw":default:if(this.marginBottom==null){this.marginBottom=this.yoffset+"px"}this.marginTop="0px";break}}else{if(this.placement=="insideGrid"){switch(this.location){case"sw":case"s":case"se":if(this.marginBottom==null){this.marginBottom=this.yoffset+"px"}this.marginTop="0px";break;case"ne":case"n":case"nw":default:if(this.marginTop==null){this.marginTop=this.yoffset+"px"}this.marginBottom="0px";break}}}this.yoffset=0}};g.prototype.init=function(){this.renderer=new this.renderer();this.renderer.init.call(this,this.rendererOptions)};g.prototype.draw=function(S){for(var R=0;R<C.jqplot.preDrawLegendHooks.length;R++){C.jqplot.preDrawLegendHooks[R].call(this,S)}return this.renderer.draw.call(this,S)};g.prototype.pack=function(R){this.renderer.pack.call(this,R)};function q(R){C.jqplot.ElemContainer.call(this);this.text=R;this.show=true;this.fontFamily;this.fontSize;this.textAlign;this.textColor;this.renderer=C.jqplot.DivTitleRenderer;this.rendererOptions={}}q.prototype=new C.jqplot.ElemContainer();q.prototype.constructor=q;q.prototype.init=function(){this.renderer=new this.renderer();this.renderer.init.call(this,this.rendererOptions)};q.prototype.draw=function(R){return this.renderer.draw.call(this,R)};q.prototype.pack=function(){this.renderer.pack.call(this)};function H(){C.jqplot.ElemContainer.call(this);this.show=true;this.xaxis="xaxis";this._xaxis;this.yaxis="yaxis";this._yaxis;this.gridBorderWidth=2;this.renderer=C.jqplot.LineRenderer;this.rendererOptions={};this.data=[];this.gridData=[];this.label="";this.showLabel=true;this.color;this.lineWidth=2.5;this.shadow=true;this.shadowAngle=45;this.shadowOffset=1.25;this.shadowDepth=3;this.shadowAlpha="0.1";this.breakOnNull=false;this.markerRenderer=C.jqplot.MarkerRenderer;this.markerOptions={};this.showLine=true;this.showMarker=true;this.index;this.fill=false;this.fillColor;this.fillAlpha;this.fillAndStroke=false;this.disableStack=false;this._stack=false;this.neighborThreshold=4;this.fillToZero=false;this.fillToValue=0;this.fillAxis="y";this.useNegativeColors=true;this._stackData=[];this._plotData=[];this._plotValues={x:[],y:[]};this._intervals={x:{},y:{}};this._prevPlotData=[];this._prevGridData=[];this._stackAxis="y";this._primaryAxis="_xaxis";this.canvas=new C.jqplot.GenericCanvas();this.shadowCanvas=new C.jqplot.GenericCanvas();this.plugins={};this._sumy=0;this._sumx=0}H.prototype=new C.jqplot.ElemContainer();H.prototype.constructor=H;H.prototype.init=function(T,X,V){this.index=T;this.gridBorderWidth=X;var W=this.data;var S=[],U;for(U=0;U<W.length;U++){if(!this.breakOnNull){if(W[U]==null||W[U][0]==null||W[U][1]==null){continue}else{S.push(W[U])}}else{S.push(W[U])}}this.data=S;if(!this.fillColor){this.fillColor=this.color}if(this.fillAlpha){var R=C.jqplot.normalize2rgb(this.fillColor);var R=C.jqplot.getColorComponents(R);this.fillColor="rgba("+R[0]+","+R[1]+","+R[2]+","+this.fillAlpha+")"}this.renderer=new this.renderer();this.renderer.init.call(this,this.rendererOptions,V);this.markerRenderer=new this.markerRenderer();if(!this.markerOptions.color){this.markerOptions.color=this.color}if(this.markerOptions.show==null){this.markerOptions.show=this.showMarker}this.showMarker=this.markerOptions.show;this.markerRenderer.init(this.markerOptions)};H.prototype.draw=function(X,U,W){var S=(U==l)?{}:U;X=(X==l)?this.canvas._ctx:X;for(var R=0;R<C.jqplot.preDrawSeriesHooks.length;R++){C.jqplot.preDrawSeriesHooks[R].call(this,X,S)}if(this.show){this.renderer.setGridData.call(this,W);if(!S.preventJqPlotSeriesDrawTrigger){C(X.canvas).trigger("jqplotSeriesDraw",[this.data,this.gridData])}var V=[];if(S.data){V=S.data}else{if(!this._stack){V=this.data}else{V=this._plotData}}var T=S.gridData||this.renderer.makeGridData.call(this,V,W);this.renderer.draw.call(this,X,T,S,W)}for(var R=0;R<C.jqplot.postDrawSeriesHooks.length;R++){C.jqplot.postDrawSeriesHooks[R].call(this,X,S)}};H.prototype.drawShadow=function(X,U,W){var S=(U==l)?{}:U;X=(X==l)?this.shadowCanvas._ctx:X;for(var R=0;R<C.jqplot.preDrawSeriesShadowHooks.length;R++){C.jqplot.preDrawSeriesShadowHooks[R].call(this,X,S)}if(this.shadow){this.renderer.setGridData.call(this,W);var V=[];if(S.data){V=S.data}else{if(!this._stack){V=this.data}else{V=this._plotData}}var T=S.gridData||this.renderer.makeGridData.call(this,V,W);this.renderer.drawShadow.call(this,X,T,S)}for(var R=0;R<C.jqplot.postDrawSeriesShadowHooks.length;R++){C.jqplot.postDrawSeriesShadowHooks[R].call(this,X,S)}};H.prototype.toggleDisplay=function(S){var R,T;if(S.data.series){R=S.data.series}else{R=this}if(S.data.speed){T=S.data.speed}if(T){if(R.canvas._elem.is(":hidden")){if(R.shadowCanvas._elem){R.shadowCanvas._elem.fadeIn(T)}R.canvas._elem.fadeIn(T);R.canvas._elem.nextAll(".jqplot-point-label.jqplot-series-"+R.index).fadeIn(T)}else{if(R.shadowCanvas._elem){R.shadowCanvas._elem.fadeOut(T)}R.canvas._elem.fadeOut(T);R.canvas._elem.nextAll(".jqplot-point-label.jqplot-series-"+R.index).fadeOut(T)}}else{if(R.canvas._elem.is(":hidden")){if(R.shadowCanvas._elem){R.shadowCanvas._elem.show()}R.canvas._elem.show();R.canvas._elem.nextAll(".jqplot-point-label.jqplot-series-"+R.index).show()}else{if(R.shadowCanvas._elem){R.shadowCanvas._elem.hide()}R.canvas._elem.hide();R.canvas._elem.nextAll(".jqplot-point-label.jqplot-series-"+R.index).hide()}}};function D(){C.jqplot.ElemContainer.call(this);this.drawGridlines=true;this.gridLineColor="#cccccc";this.gridLineWidth=1;this.background="#fffdf6";this.borderColor="#999999";this.borderWidth=2;this.drawBorder=true;this.shadow=true;this.shadowAngle=45;this.shadowOffset=1.5;this.shadowWidth=3;this.shadowDepth=3;this.shadowColor=null;this.shadowAlpha="0.07";this._left;this._top;this._right;this._bottom;this._width;this._height;this._axes=[];this.renderer=C.jqplot.CanvasGridRenderer;this.rendererOptions={};this._offsets={top:null,bottom:null,left:null,right:null}}D.prototype=new C.jqplot.ElemContainer();D.prototype.constructor=D;D.prototype.init=function(){this.renderer=new this.renderer();this.renderer.init.call(this,this.rendererOptions)};D.prototype.createElement=function(R){this._offsets=R;return this.renderer.createElement.call(this)};D.prototype.draw=function(){this.renderer.draw.call(this)};C.jqplot.GenericCanvas=function(){C.jqplot.ElemContainer.call(this);this._ctx};C.jqplot.GenericCanvas.prototype=new C.jqplot.ElemContainer();C.jqplot.GenericCanvas.prototype.constructor=C.jqplot.GenericCanvas;C.jqplot.GenericCanvas.prototype.createElement=function(V,T,S){this._offsets=V;var R="jqplot";if(T!=l){R=T}var U;if(this._elem){U=this._elem.get(0)}else{U=document.createElement("canvas")}if(S!=l){this._plotDimensions=S}U.width=this._plotDimensions.width-this._offsets.left-this._offsets.right;U.height=this._plotDimensions.height-this._offsets.top-this._offsets.bottom;this._elem=C(U);this._elem.css({position:"absolute",left:this._offsets.left,top:this._offsets.top});this._elem.addClass(R);if(C.browser.msie){window.G_vmlCanvasManager.init_(document);U=window.G_vmlCanvasManager.initElement(U)}return this._elem};C.jqplot.GenericCanvas.prototype.setContext=function(){this._ctx=this._elem.get(0).getContext("2d");return this._ctx};C.jqplot.HooksManager=function(){this.hooks=[]};C.jqplot.HooksManager.prototype.addOnce=function(S){var T=false,R;for(R=0;R<this.hooks.length;R++){if(this.hooks[R][0]==S){T=true}}if(!T){this.hooks.push(S)}};C.jqplot.HooksManager.prototype.add=function(R){this.hooks.push(R)};C.jqplot.EventListenerManager=function(){this.hooks=[]};C.jqplot.EventListenerManager.prototype.addOnce=function(U,T){var V=false,S,R;for(R=0;R<this.hooks.length;R++){S=this.hooks[R];if(S[0]==U&&S[1]==T){V=true}}if(!V){this.hooks.push([U,T])}};C.jqplot.EventListenerManager.prototype.add=function(S,R){this.hooks.push([S,R])};function G(){this.data=[];this.targetId=null;this.target=null;this.defaults={axesDefaults:{},axes:{xaxis:{},yaxis:{},x2axis:{},y2axis:{},y3axis:{},y4axis:{},y5axis:{},y6axis:{},y7axis:{},y8axis:{},y9axis:{}},seriesDefaults:{},gridPadding:{top:10,right:10,bottom:23,left:10},series:[]};this.series=[];this.axes={xaxis:new o("xaxis"),yaxis:new o("yaxis"),x2axis:new o("x2axis"),y2axis:new o("y2axis"),y3axis:new o("y3axis"),y4axis:new o("y4axis"),y5axis:new o("y5axis"),y6axis:new o("y6axis"),y7axis:new o("y7axis"),y8axis:new o("y8axis"),y9axis:new o("y9axis")};this.grid=new D();this.legend=new g();this.baseCanvas=new C.jqplot.GenericCanvas();this.seriesStack=[];this.previousSeriesStack=[];this.eventCanvas=new C.jqplot.GenericCanvas();this._width=null;this._height=null;this._plotDimensions={height:null,width:null};this._gridPadding={top:10,right:10,bottom:10,left:10};this.syncXTicks=true;this.syncYTicks=true;this.seriesColors=["#4bb2c5","#EAA228","#c5b47f","#579575","#839557","#958c12","#953579","#4b5de4","#d8b83f","#ff5800","#0085cc","#c747a3","#cddf54","#FBD178","#26B4E3","#bd70c7"];this.negativeSeriesColors=["#498991","#C08840","#9F9274","#546D61","#646C4A","#6F6621","#6E3F5F","#4F64B0","#A89050","#C45923","#187399","#945381","#959E5C","#C7AF7B","#478396","#907294"];this.sortData=true;var U=0;this.textColor;this.fontFamily;this.fontSize;this.title=new q();this.options={};this.stackSeries=false;this._stackData=[];this._plotData=[];this.plugins={};this._drawCount=0;this.drawIfHidden=false;this.captureRightClick=false;this.themeEngine=new C.jqplot.ThemeEngine();this._sumy=0;this._sumx=0;this.preInitHooks=new C.jqplot.HooksManager();this.postInitHooks=new C.jqplot.HooksManager();this.preParseOptionsHooks=new C.jqplot.HooksManager();this.postParseOptionsHooks=new C.jqplot.HooksManager();this.preDrawHooks=new C.jqplot.HooksManager();this.postDrawHooks=new C.jqplot.HooksManager();this.preDrawSeriesHooks=new C.jqplot.HooksManager();this.postDrawSeriesHooks=new C.jqplot.HooksManager();this.preDrawLegendHooks=new C.jqplot.HooksManager();this.addLegendRowHooks=new C.jqplot.HooksManager();this.preSeriesInitHooks=new C.jqplot.HooksManager();this.postSeriesInitHooks=new C.jqplot.HooksManager();this.preParseSeriesOptionsHooks=new C.jqplot.HooksManager();this.postParseSeriesOptionsHooks=new C.jqplot.HooksManager();this.eventListenerHooks=new C.jqplot.EventListenerManager();this.preDrawSeriesShadowHooks=new C.jqplot.HooksManager();this.postDrawSeriesShadowHooks=new C.jqplot.HooksManager();this.colorGenerator=C.jqplot.ColorGenerator;this.init=function(ad,ac,Z){for(var aa=0;aa<C.jqplot.preInitHooks.length;aa++){C.jqplot.preInitHooks[aa].call(this,ad,ac,Z)}for(var aa=0;aa<this.preInitHooks.hooks.length;aa++){this.preInitHooks.hooks[aa].call(this,ad,ac,Z)}this.targetId="#"+ad;this.target=C("#"+ad);this.target.removeClass("jqplot-error");if(!this.target.get(0)){throw"No plot target specified"}if(this.target.css("position")=="static"){this.target.css("position","relative")}if(!this.target.hasClass("jqplot-target")){this.target.addClass("jqplot-target")}if(!this.target.height()){var ab;if(Z&&Z.height){ab=parseInt(Z.height,10)}else{if(this.target.attr("data-height")){ab=parseInt(this.target.attr("data-height"),10)}else{ab=parseInt(C.jqplot.config.defaultHeight,10)}}this._height=ab;this.target.css("height",ab+"px")}else{this._height=this.target.height()}if(!this.target.width()){var W;if(Z&&Z.width){W=parseInt(Z.width,10)}else{if(this.target.attr("data-width")){W=parseInt(this.target.attr("data-width"),10)}else{W=parseInt(C.jqplot.config.defaultWidth,10)}}this._width=W;this.target.css("width",W+"px")}else{this._width=this.target.width()}this._plotDimensions.height=this._height;this._plotDimensions.width=this._width;this.grid._plotDimensions=this._plotDimensions;this.title._plotDimensions=this._plotDimensions;this.baseCanvas._plotDimensions=this._plotDimensions;this.eventCanvas._plotDimensions=this._plotDimensions;this.legend._plotDimensions=this._plotDimensions;if(this._height<=0||this._width<=0||!this._height||!this._width){throw"Canvas dimension not set"}if(ac==null){throw {name:"DataError",message:"No data to plot."}}if(ac.constructor!=Array||ac.length==0||ac[0].constructor!=Array||ac[0].length==0){throw {name:"DataError",message:"No data to plot."}}this.data=ac;this.parseOptions(Z);if(this.textColor){this.target.css("color",this.textColor)}if(this.fontFamily){this.target.css("font-family",this.fontFamily)}if(this.fontSize){this.target.css("font-size",this.fontSize)}this.title.init();this.legend.init();this._sumy=0;this._sumx=0;for(var aa=0;aa<this.series.length;aa++){this.seriesStack.push(aa);this.previousSeriesStack.push(aa);this.series[aa].shadowCanvas._plotDimensions=this._plotDimensions;this.series[aa].canvas._plotDimensions=this._plotDimensions;for(var Y=0;Y<C.jqplot.preSeriesInitHooks.length;Y++){C.jqplot.preSeriesInitHooks[Y].call(this.series[aa],ad,ac,this.options.seriesDefaults,this.options.series[aa],this)}for(var Y=0;Y<this.preSeriesInitHooks.hooks.length;Y++){this.preSeriesInitHooks.hooks[Y].call(this.series[aa],ad,ac,this.options.seriesDefaults,this.options.series[aa],this)}this.populatePlotData(this.series[aa],aa);this.series[aa]._plotDimensions=this._plotDimensions;this.series[aa].init(aa,this.grid.borderWidth,this);for(var Y=0;Y<C.jqplot.postSeriesInitHooks.length;Y++){C.jqplot.postSeriesInitHooks[Y].call(this.series[aa],ad,ac,this.options.seriesDefaults,this.options.series[aa],this)}for(var Y=0;Y<this.postSeriesInitHooks.hooks.length;Y++){this.postSeriesInitHooks.hooks[Y].call(this.series[aa],ad,ac,this.options.seriesDefaults,this.options.series[aa],this)}this._sumy+=this.series[aa]._sumy;this._sumx+=this.series[aa]._sumx}for(var X in this.axes){this.axes[X]._plotDimensions=this._plotDimensions;this.axes[X].init()}if(this.sortData){R(this.series)}this.grid.init();this.grid._axes=this.axes;this.legend._series=this.series;for(var aa=0;aa<C.jqplot.postInitHooks.length;aa++){C.jqplot.postInitHooks[aa].call(this,ad,ac,Z)}for(var aa=0;aa<this.postInitHooks.hooks.length;aa++){this.postInitHooks.hooks[aa].call(this,ad,ac,Z)}};this.resetAxesScale=function(Z){var Y=(Z!=l)?Z:this.axes;if(Y===true){Y=this.axes}if(Y.constructor===Array){for(var X=0;X<Y.length;X++){this.axes[Y[X]].resetScale()}}else{if(Y.constructor===Object){for(var W in Y){this.axes[W].resetScale()}}}};this.reInitialize=function(){if(!this.target.height()){var Z;if(options&&options.height){Z=parseInt(options.height,10)}else{if(this.target.attr("data-height")){Z=parseInt(this.target.attr("data-height"),10)}else{Z=parseInt(C.jqplot.config.defaultHeight,10)}}this._height=Z;this.target.css("height",Z+"px")}else{this._height=this.target.height()}if(!this.target.width()){var W;if(options&&options.width){W=parseInt(options.width,10)}else{if(this.target.attr("data-width")){W=parseInt(this.target.attr("data-width"),10)}else{W=parseInt(C.jqplot.config.defaultWidth,10)}}this._width=W;this.target.css("width",W+"px")}else{this._width=this.target.width()}if(this._height<=0||this._width<=0||!this._height||!this._width){throw"Target dimension not set"}this._plotDimensions.height=this._height;this._plotDimensions.width=this._width;this.grid._plotDimensions=this._plotDimensions;this.title._plotDimensions=this._plotDimensions;this.baseCanvas._plotDimensions=this._plotDimensions;this.eventCanvas._plotDimensions=this._plotDimensions;this.legend._plotDimensions=this._plotDimensions;for(var aa in this.axes){this.axes[aa]._plotWidth=this._width;this.axes[aa]._plotHeight=this._height}this.title._plotWidth=this._width;if(this.textColor){this.target.css("color",this.textColor)}if(this.fontFamily){this.target.css("font-family",this.fontFamily)}if(this.fontSize){this.target.css("font-size",this.fontSize)}this._sumy=0;this._sumx=0;for(var Y=0;Y<this.series.length;Y++){this.populatePlotData(this.series[Y],Y);this.series[Y]._plotDimensions=this._plotDimensions;this.series[Y].canvas._plotDimensions=this._plotDimensions;this._sumy+=this.series[Y]._sumy;this._sumx+=this.series[Y]._sumx}for(var X in this.axes){this.axes[X]._plotDimensions=this._plotDimensions;this.axes[X]._ticks=[];this.axes[X].renderer.init.call(this.axes[X],{})}if(this.sortData){R(this.series)}this.grid._axes=this.axes;this.legend._series=this.series};function R(aa){var ae,af,ag,W,ad;for(var ab=0;ab<aa.length;ab++){var X;var ac=[aa[ab].data,aa[ab]._stackData,aa[ab]._plotData,aa[ab]._prevPlotData];for(var Y=0;Y<4;Y++){X=true;ae=ac[Y];if(aa[ab]._stackAxis=="x"){for(var Z=0;Z<ae.length;Z++){if(typeof(ae[Z][1])!="number"){X=false;break}}if(X){ae.sort(function(ai,ah){return ai[1]-ah[1]})}}else{for(var Z=0;Z<ae.length;Z++){if(typeof(ae[Z][0])!="number"){X=false;break}}if(X){ae.sort(function(ai,ah){return ai[0]-ah[0]})}}}}}this.populatePlotData=function(aa,ab){this._plotData=[];this._stackData=[];aa._stackData=[];aa._plotData=[];var ae={x:[],y:[]};if(this.stackSeries&&!aa.disableStack){aa._stack=true;var ac=aa._stackAxis=="x"?0:1;var ad=ac?0:1;var af=C.extend(true,[],aa.data);var ag=C.extend(true,[],aa.data);for(var Y=0;Y<ab;Y++){var W=this.series[Y].data;for(var X=0;X<W.length;X++){af[X][0]+=W[X][0];af[X][1]+=W[X][1];ag[X][ac]+=W[X][ac]}}for(var Z=0;Z<ag.length;Z++){ae.x.push(ag[Z][0]);ae.y.push(ag[Z][1])}this._plotData.push(ag);this._stackData.push(af);aa._stackData=af;aa._plotData=ag;aa._plotValues=ae}else{for(var Z=0;Z<aa.data.length;Z++){ae.x.push(aa.data[Z][0]);ae.y.push(aa.data[Z][1])}this._stackData.push(aa.data);this.series[ab]._stackData=aa.data;this._plotData.push(aa.data);aa._plotData=aa.data;aa._plotValues=ae}if(ab>0){aa._prevPlotData=this.series[ab-1]._plotData}aa._sumy=0;aa._sumx=0;for(Z=aa.data.length-1;Z>-1;Z--){aa._sumy+=aa.data[Z][1];aa._sumx+=aa.data[Z][0]}};this.getNextSeriesColor=(function(X){var W=0;var Y=X.seriesColors;return function(){if(W<Y.length){return Y[W++]}else{W=0;return Y[W++]}}})(this);this.parseOptions=function(ae){for(var ab=0;ab<this.preParseOptionsHooks.hooks.length;ab++){this.preParseOptionsHooks.hooks[ab].call(this,ae)}for(var ab=0;ab<C.jqplot.preParseOptionsHooks.length;ab++){C.jqplot.preParseOptionsHooks[ab].call(this,ae)}this.options=C.extend(true,{},this.defaults,ae);this.stackSeries=this.options.stackSeries;if(this.options.seriesColors){this.seriesColors=this.options.seriesColors}if(this.options.negativeSeriesColors){this.negativeSeriesColors=this.options.negativeSeriesColors}if(this.options.captureRightClick){this.captureRightClick=this.options.captureRightClick}var W=new this.colorGenerator(this.seriesColors);C.extend(true,this._gridPadding,this.options.gridPadding);this.sortData=(this.options.sortData!=null)?this.options.sortData:this.sortData;for(var X in this.axes){var Z=this.axes[X];C.extend(true,Z,this.options.axesDefaults,this.options.axes[X]);Z._plotWidth=this._width;Z._plotHeight=this._height}if(this.data.length==0){this.data=[];for(var ab=0;ab<this.options.series.length;ab++){this.data.push(this.options.series.data)}}var ac=function(ai,ag){var af=[];var ah;ag=ag||"vertical";if(!(ai[0] instanceof Array)){for(ah=0;ah<ai.length;ah++){if(ag=="vertical"){af.push([ah+1,ai[ah]])}else{af.push([ai[ah],ah+1])}}}else{C.extend(true,af,ai)}return af};for(var ab=0;ab<this.data.length;ab++){var ad=new H();for(var aa=0;aa<C.jqplot.preParseSeriesOptionsHooks.length;aa++){C.jqplot.preParseSeriesOptionsHooks[aa].call(ad,this.options.seriesDefaults,this.options.series[ab])}for(var aa=0;aa<this.preParseSeriesOptionsHooks.hooks.length;aa++){this.preParseSeriesOptionsHooks.hooks[aa].call(ad,this.options.seriesDefaults,this.options.series[ab])}C.extend(true,ad,{seriesColors:this.seriesColors,negativeSeriesColors:this.negativeSeriesColors},this.options.seriesDefaults,this.options.series[ab]);var Y="vertical";if(ad.renderer.constructor==C.jqplot.barRenderer&&ad.rendererOptions&&ad.rendererOptions.barDirection=="horizontal"){Y="horizontal"}ad.data=ac(this.data[ab],Y);switch(ad.xaxis){case"xaxis":ad._xaxis=this.axes.xaxis;break;case"x2axis":ad._xaxis=this.axes.x2axis;break;default:break}ad._yaxis=this.axes[ad.yaxis];ad._xaxis._series.push(ad);ad._yaxis._series.push(ad);if(ad.show){ad._xaxis.show=true;ad._yaxis.show=true}if(!ad.color&&ad.show!=false){ad.color=W.next()}if(!ad.label){ad.label="Series "+(ab+1).toString()}this.series.push(ad);for(var aa=0;aa<C.jqplot.postParseSeriesOptionsHooks.length;aa++){C.jqplot.postParseSeriesOptionsHooks[aa].call(this.series[ab],this.options.seriesDefaults,this.options.series[ab])}for(var aa=0;aa<this.postParseSeriesOptionsHooks.hooks.length;aa++){this.postParseSeriesOptionsHooks.hooks[aa].call(this.series[ab],this.options.seriesDefaults,this.options.series[ab])}}C.extend(true,this.grid,this.options.grid);for(var X in this.axes){var Z=this.axes[X];if(Z.borderWidth==null){Z.borderWidth=this.grid.borderWidth}if(Z.borderColor==null){if(X!="xaxis"&&X!="x2axis"&&Z.useSeriesColor===true&&Z.show){Z.borderColor=Z._series[0].color}else{Z.borderColor=this.grid.borderColor}}}if(typeof this.options.title=="string"){this.title.text=this.options.title}else{if(typeof this.options.title=="object"){C.extend(true,this.title,this.options.title)}}this.title._plotWidth=this._width;this.legend.setOptions(this.options.legend);for(var ab=0;ab<C.jqplot.postParseOptionsHooks.length;ab++){C.jqplot.postParseOptionsHooks[ab].call(this,ae)}for(var ab=0;ab<this.postParseOptionsHooks.hooks.length;ab++){this.postParseOptionsHooks.hooks[ab].call(this,ae)}};this.replot=function(X){var Y=(X!=l)?X:{};var W=(Y.clear!=l)?Y.clear:true;var Z=(Y.resetAxes!=l)?Y.resetAxes:false;this.target.trigger("jqplotPreReplot");if(W){this.target.empty()}if(Z){this.resetAxesScale(Z)}this.reInitialize();this.draw();this.target.trigger("jqplotPostReplot")};this.redraw=function(W){W=(W!=null)?W:true;this.target.trigger("jqplotPreRedraw");if(W){this.target.empty()}for(var Y in this.axes){this.axes[Y]._ticks=[]}for(var X=0;X<this.series.length;X++){this.populatePlotData(this.series[X],X)}this._sumy=0;this._sumx=0;for(X=0;X<this.series.length;X++){this._sumy+=this.series[X]._sumy;this._sumx+=this.series[X]._sumx}this.draw();this.target.trigger("jqplotPostRedraw")};this.draw=function(){if(this.drawIfHidden||this.target.is(":visible")){this.target.trigger("jqplotPreDraw");var ac,ab;for(ac=0;ac<C.jqplot.preDrawHooks.length;ac++){C.jqplot.preDrawHooks[ac].call(this)}for(ac=0;ac<this.preDrawHooks.hooks.length;ac++){this.preDrawHooks.hooks[ac].call(this)}this.target.append(this.baseCanvas.createElement({left:0,right:0,top:0,bottom:0},"jqplot-base-canvas"));this.baseCanvas.setContext();this.target.append(this.title.draw());this.title.pack({top:0,left:0});var ah=this.legend.draw();var ag={top:0,left:0,bottom:0,right:0};if(this.legend.placement=="outsideGrid"){this.target.append(ah);switch(this.legend.location){case"n":ag.top+=this.legend.getHeight();break;case"s":ag.bottom+=this.legend.getHeight();break;case"ne":case"e":case"se":ag.right+=this.legend.getWidth();break;case"nw":case"w":case"sw":ag.left+=this.legend.getWidth();break;default:ag.right+=this.legend.getWidth();break}ah=ah.detach()}var W=this.axes;for(var Y in W){this.target.append(W[Y].draw(this.baseCanvas._ctx));W[Y].set()}if(W.yaxis.show){ag.left+=W.yaxis.getWidth()}var Z=["y2axis","y3axis","y4axis","y5axis","y6axis","y7axis","y8axis","y9axis"];var X=[0,0,0,0,0,0,0,0];var ae=0;var aa;for(aa=0;aa<8;aa++){if(W[Z[aa]].show){ae+=W[Z[aa]].getWidth();X[aa]=ae}}ag.right+=ae;if(W.x2axis.show){ag.top+=W.x2axis.getHeight()}if(this.title.show){ag.top+=this.title.getHeight()}if(W.xaxis.show){ag.bottom+=W.xaxis.getHeight()}var ad=["top","bottom","left","right"];for(var aa in ad){if(ag[ad[aa]]){this._gridPadding[ad[aa]]=ag[ad[aa]]}}var af=(this.legend.placement=="outsideGrid")?{top:this.title.getHeight(),left:0,right:0,bottom:0}:this._gridPadding;W.xaxis.pack({position:"absolute",bottom:this._gridPadding.bottom-W.xaxis.getHeight(),left:0,width:this._width},{min:this._gridPadding.left,max:this._width-this._gridPadding.right});W.yaxis.pack({position:"absolute",top:0,left:this._gridPadding.left-W.yaxis.getWidth(),height:this._height},{min:this._height-this._gridPadding.bottom,max:this._gridPadding.top});W.x2axis.pack({position:"absolute",top:this._gridPadding.top-W.x2axis.getHeight(),left:0,width:this._width},{min:this._gridPadding.left,max:this._width-this._gridPadding.right});for(ac=8;ac>0;ac--){W[Z[ac-1]].pack({position:"absolute",top:0,right:this._gridPadding.right-X[ac-1]},{min:this._height-this._gridPadding.bottom,max:this._gridPadding.top})}this.target.append(this.grid.createElement(this._gridPadding));this.grid.draw();for(ac=0;ac<this.series.length;ac++){ab=this.seriesStack[ac];this.target.append(this.series[ab].shadowCanvas.createElement(this._gridPadding,"jqplot-series-shadowCanvas"));this.series[ab].shadowCanvas.setContext();this.series[ab].shadowCanvas._elem.data("seriesIndex",ab)}for(ac=0;ac<this.series.length;ac++){ab=this.seriesStack[ac];this.target.append(this.series[ab].canvas.createElement(this._gridPadding,"jqplot-series-canvas"));this.series[ab].canvas.setContext();this.series[ab].canvas._elem.data("seriesIndex",ab)}this.target.append(this.eventCanvas.createElement(this._gridPadding,"jqplot-event-canvas"));this.eventCanvas.setContext();this.eventCanvas._ctx.fillStyle="rgba(0,0,0,0)";this.eventCanvas._ctx.fillRect(0,0,this.eventCanvas._ctx.canvas.width,this.eventCanvas._ctx.canvas.height);this.bindCustomEvents();if(this.legend.preDraw){this.eventCanvas._elem.before(ah);this.legend.pack(af);if(this.legend._elem){this.drawSeries({legendInfo:{location:this.legend.location,placement:this.legend.placement,width:this.legend.getWidth(),height:this.legend.getHeight(),xoffset:this.legend.xoffset,yoffset:this.legend.yoffset}})}else{this.drawSeries()}}else{this.drawSeries();C(this.series[this.series.length-1].canvas._elem).after(ah);this.legend.pack(af)}for(var ac=0;ac<C.jqplot.eventListenerHooks.length;ac++){this.eventCanvas._elem.bind(C.jqplot.eventListenerHooks[ac][0],{plot:this},C.jqplot.eventListenerHooks[ac][1])}for(var ac=0;ac<this.eventListenerHooks.hooks.length;ac++){this.eventCanvas._elem.bind(this.eventListenerHooks.hooks[ac][0],{plot:this},this.eventListenerHooks.hooks[ac][1])}for(var ac=0;ac<C.jqplot.postDrawHooks.length;ac++){C.jqplot.postDrawHooks[ac].call(this)}for(var ac=0;ac<this.postDrawHooks.hooks.length;ac++){this.postDrawHooks.hooks[ac].call(this)}if(this.target.is(":visible")){this._drawCount+=1}this.target.trigger("jqplotPostDraw",[this])}};this.bindCustomEvents=function(){this.eventCanvas._elem.bind("click",{plot:this},this.onClick);this.eventCanvas._elem.bind("dblclick",{plot:this},this.onDblClick);this.eventCanvas._elem.bind("mousedown",{plot:this},this.onMouseDown);this.eventCanvas._elem.bind("mousemove",{plot:this},this.onMouseMove);this.eventCanvas._elem.bind("mouseenter",{plot:this},this.onMouseEnter);this.eventCanvas._elem.bind("mouseleave",{plot:this},this.onMouseLeave);if(this.captureRightClick){this.eventCanvas._elem.bind("mouseup",{plot:this},this.onRightClick);this.eventCanvas._elem.get(0).oncontextmenu=function(){return false}}else{this.eventCanvas._elem.bind("mouseup",{plot:this},this.onMouseUp)}};function S(ae){var ad=ae.data.plot;var Z=ad.eventCanvas._elem.offset();var ac={x:ae.pageX-Z.left,y:ae.pageY-Z.top};var aa={xaxis:null,yaxis:null,x2axis:null,y2axis:null,y3axis:null,y4axis:null,y5axis:null,y6axis:null,y7axis:null,y8axis:null,y9axis:null};var ab=["xaxis","yaxis","x2axis","y2axis","y3axis","y4axis","y5axis","y6axis","y7axis","y8axis","y9axis"];var W=ad.axes;var X,Y;for(X=11;X>0;X--){Y=ab[X-1];if(W[Y].show){aa[Y]=W[Y].series_p2u(ac[Y.charAt(0)])}}return{offsets:Z,gridPos:ac,dataPos:aa}}function T(ad,ah,ag){var ae=null;var aj,ab,Y,af,aa,X,Z;var ac,ai;for(var Z=ad.seriesStack.length-1;Z>-1;Z--){ab=ad.seriesStack[Z];aj=ad.series[ab];X=aj.renderer;if(aj.show){ai=aj.markerRenderer.size/2+aj.neighborThreshold;ac=(ai>0)?ai:0;for(var aa=0;aa<aj.gridData.length;aa++){p=aj.gridData[aa];if(X.constructor==C.jqplot.OHLCRenderer){if(X.candleStick){var W=aj._yaxis.series_u2p;if(ah>=p[0]-X._bodyWidth/2&&ah<=p[0]+X._bodyWidth/2&&ag>=W(aj.data[aa][2])&&ag<=W(aj.data[aa][3])){return{seriesIndex:ab,pointIndex:aa,gridData:p,data:aj.data[aa]}}}else{if(!X.hlc){var W=aj._yaxis.series_u2p;if(ah>=p[0]-X._tickLength&&ah<=p[0]+X._tickLength&&ag>=W(aj.data[aa][2])&&ag<=W(aj.data[aa][3])){return{seriesIndex:ab,pointIndex:aa,gridData:p,data:aj.data[aa]}}}else{var W=aj._yaxis.series_u2p;if(ah>=p[0]-X._tickLength&&ah<=p[0]+X._tickLength&&ag>=W(aj.data[aa][1])&&ag<=W(aj.data[aa][2])){return{seriesIndex:ab,pointIndex:aa,gridData:p,data:aj.data[aa]}}}}}else{af=Math.sqrt((ah-p[0])*(ah-p[0])+(ag-p[1])*(ag-p[1]));if(af<=ac&&(af<=Y||Y==null)){Y=af;return{seriesIndex:ab,pointIndex:aa,gridData:p,data:aj.data[aa]}}}}}}return ae}function V(W,X){var ab=X.series;var aF,aE,aD,ay,az,at,ar,ag,ae,ai,aj,au;var aC,aG,aA,ac,aq,aw;var Y,ax;for(aD=X.seriesStack.length-1;aD>=0;aD--){aF=X.seriesStack[aD];ay=ab[aF];switch(ay.renderer.constructor){case C.jqplot.BarRenderer:at=W.x;ar=W.y;for(aE=ay.gridData.length-1;aE>=0;aE--){aq=ay._barPoints[aE];if(at>aq[0][0]&&at<aq[2][0]&&ar>aq[2][1]&&ar<aq[0][1]){return{seriesIndex:ay.index,pointIndex:aE,gridData:aA,data:ay.data[aE],points:ay._barPoints[aE]}}}break;case C.jqplot.DonutRenderer:ai=ay.startAngle/180*Math.PI;at=W.x-ay._center[0];ar=W.y-ay._center[1];az=Math.sqrt(Math.pow(at,2)+Math.pow(ar,2));if(at>0&&-ar>=0){ag=2*Math.PI-Math.atan(-ar/at)}else{if(at>0&&-ar<0){ag=-Math.atan(-ar/at)}else{if(at<0){ag=Math.PI-Math.atan(-ar/at)}else{if(at==0&&-ar>0){ag=3*Math.PI/2}else{if(at==0&&-ar<0){ag=Math.PI/2}else{if(at==0&&ar==0){ag=0}}}}}}if(ai){ag-=ai;if(ag<0){ag+=2*Math.PI}else{if(ag>2*Math.PI){ag-=2*Math.PI}}}ae=ay.sliceMargin/180*Math.PI;if(az<ay._radius&&az>ay._innerRadius){for(aE=0;aE<ay.gridData.length;aE++){aj=(aE>0)?ay.gridData[aE-1][1]+ae:ae;au=ay.gridData[aE][1];if(ag>aj&&ag<au){return{seriesIndex:ay.index,pointIndex:aE,gridData:ay.gridData[aE],data:ay.data[aE]}}}}break;case C.jqplot.PieRenderer:ai=ay.startAngle/180*Math.PI;at=W.x-ay._center[0];ar=W.y-ay._center[1];az=Math.sqrt(Math.pow(at,2)+Math.pow(ar,2));if(at>0&&-ar>=0){ag=2*Math.PI-Math.atan(-ar/at)}else{if(at>0&&-ar<0){ag=-Math.atan(-ar/at)}else{if(at<0){ag=Math.PI-Math.atan(-ar/at)}else{if(at==0&&-ar>0){ag=3*Math.PI/2}else{if(at==0&&-ar<0){ag=Math.PI/2}else{if(at==0&&ar==0){ag=0}}}}}}if(ai){ag-=ai;if(ag<0){ag+=2*Math.PI}else{if(ag>2*Math.PI){ag-=2*Math.PI}}}ae=ay.sliceMargin/180*Math.PI;if(az<ay._radius){for(aE=0;aE<ay.gridData.length;aE++){aj=(aE>0)?ay.gridData[aE-1][1]+ae:ae;au=ay.gridData[aE][1];if(ag>aj&&ag<au){return{seriesIndex:ay.index,pointIndex:aE,gridData:ay.gridData[aE],data:ay.data[aE]}}}}break;case C.jqplot.BubbleRenderer:at=W.x;ar=W.y;var ao=null;if(ay.show){for(var aE=0;aE<ay.gridData.length;aE++){aA=ay.gridData[aE];aG=Math.sqrt((at-aA[0])*(at-aA[0])+(ar-aA[1])*(ar-aA[1]));if(aG<=aA[2]&&(aG<=aC||aC==null)){aC=aG;ao={seriesIndex:aF,pointIndex:aE,gridData:aA,data:ay.data[aE]}}}if(ao!=null){return ao}}break;case C.jqplot.FunnelRenderer:at=W.x;ar=W.y;var av=ay._vertices,aa=av[0],Z=av[av.length-1],ad,an;function aB(aJ,aL,aK){var aI=(aL[1]-aK[1])/(aL[0]-aK[0]);var aH=aL[1]-aI*aL[0];var aM=aJ+aL[1];return[(aM-aH)/aI,aM]}ad=aB(ar,aa[0],Z[3]);an=aB(ar,aa[1],Z[2]);for(aE=0;aE<av.length;aE++){cv=av[aE];if(ar>=cv[0][1]&&ar<=cv[3][1]&&at>=ad[0]&&at<=an[0]){return{seriesIndex:ay.index,pointIndex:aE,gridData:null,data:ay.data[aE]}}}break;case C.jqplot.LineRenderer:at=W.x;ar=W.y;az=ay.renderer;if(ay.show){if(ay.fill){at=W.x;ar=W.y;var ah=false;if(at>ay._boundingBox[0][0]&&at<ay._boundingBox[1][0]&&ar>ay._boundingBox[1][1]&&ar<ay._boundingBox[0][1]){var am=ay._areaPoints.length;var ap;var aE=am-1;for(var ap=0;ap<am;ap++){var al=[ay._areaPoints[ap][0],ay._areaPoints[ap][1]];var ak=[ay._areaPoints[aE][0],ay._areaPoints[aE][1]];if(al[1]<ar&&ak[1]>=ar||ak[1]<ar&&al[1]>=ar){if(al[0]+(ar-al[1])/(ak[1]-al[1])*(ak[0]-al[0])<at){ah=!ah}}aE=ap}}if(ah){return{seriesIndex:aF,pointIndex:null,gridData:ay.gridData,data:ay.data,points:ay._areaPoints}}break}else{ax=ay.markerRenderer.size/2+ay.neighborThreshold;Y=(ax>0)?ax:0;for(var aE=0;aE<ay.gridData.length;aE++){aA=ay.gridData[aE];if(az.constructor==C.jqplot.OHLCRenderer){if(az.candleStick){var af=ay._yaxis.series_u2p;if(at>=aA[0]-az._bodyWidth/2&&at<=aA[0]+az._bodyWidth/2&&ar>=af(ay.data[aE][2])&&ar<=af(ay.data[aE][3])){return{seriesIndex:aF,pointIndex:aE,gridData:aA,data:ay.data[aE]}}}else{if(!az.hlc){var af=ay._yaxis.series_u2p;if(at>=aA[0]-az._tickLength&&at<=aA[0]+az._tickLength&&ar>=af(ay.data[aE][2])&&ar<=af(ay.data[aE][3])){return{seriesIndex:aF,pointIndex:aE,gridData:aA,data:ay.data[aE]}}}else{var af=ay._yaxis.series_u2p;if(at>=aA[0]-az._tickLength&&at<=aA[0]+az._tickLength&&ar>=af(ay.data[aE][1])&&ar<=af(ay.data[aE][2])){return{seriesIndex:aF,pointIndex:aE,gridData:aA,data:ay.data[aE]}}}}}else{aG=Math.sqrt((at-aA[0])*(at-aA[0])+(ar-aA[1])*(ar-aA[1]));if(aG<=Y&&(aG<=aC||aC==null)){aC=aG;return{seriesIndex:aF,pointIndex:aE,gridData:aA,data:ay.data[aE]}}}}}}break;default:at=W.x;ar=W.y;az=ay.renderer;if(ay.show){ax=ay.markerRenderer.size/2+ay.neighborThreshold;Y=(ax>0)?ax:0;for(var aE=0;aE<ay.gridData.length;aE++){aA=ay.gridData[aE];if(az.constructor==C.jqplot.OHLCRenderer){if(az.candleStick){var af=ay._yaxis.series_u2p;if(at>=aA[0]-az._bodyWidth/2&&at<=aA[0]+az._bodyWidth/2&&ar>=af(ay.data[aE][2])&&ar<=af(ay.data[aE][3])){return{seriesIndex:aF,pointIndex:aE,gridData:aA,data:ay.data[aE]}}}else{if(!az.hlc){var af=ay._yaxis.series_u2p;if(at>=aA[0]-az._tickLength&&at<=aA[0]+az._tickLength&&ar>=af(ay.data[aE][2])&&ar<=af(ay.data[aE][3])){return{seriesIndex:aF,pointIndex:aE,gridData:aA,data:ay.data[aE]}}}else{var af=ay._yaxis.series_u2p;if(at>=aA[0]-az._tickLength&&at<=aA[0]+az._tickLength&&ar>=af(ay.data[aE][1])&&ar<=af(ay.data[aE][2])){return{seriesIndex:aF,pointIndex:aE,gridData:aA,data:ay.data[aE]}}}}}else{aG=Math.sqrt((at-aA[0])*(at-aA[0])+(ar-aA[1])*(ar-aA[1]));if(aG<=Y&&(aG<=aC||aC==null)){aC=aG;return{seriesIndex:aF,pointIndex:aE,gridData:aA,data:ay.data[aE]}}}}}break}}return null}this.onClick=function(Y){var X=S(Y);var aa=Y.data.plot;var Z=V(X.gridPos,aa);var W=jQuery.Event("jqplotClick");W.pageX=Y.pageX;W.pageY=Y.pageY;C(this).trigger(W,[X.gridPos,X.dataPos,Z,aa])};this.onDblClick=function(Y){var X=S(Y);var aa=Y.data.plot;var Z=V(X.gridPos,aa);var W=jQuery.Event("jqplotDblClick");W.pageX=Y.pageX;W.pageY=Y.pageY;C(this).trigger(W,[X.gridPos,X.dataPos,Z,aa])};this.onMouseDown=function(Y){var X=S(Y);var aa=Y.data.plot;var Z=V(X.gridPos,aa);var W=jQuery.Event("jqplotMouseDown");W.pageX=Y.pageX;W.pageY=Y.pageY;C(this).trigger(W,[X.gridPos,X.dataPos,Z,aa])};this.onMouseUp=function(Y){var X=S(Y);var W=jQuery.Event("jqplotMouseUp");W.pageX=Y.pageX;W.pageY=Y.pageY;C(this).trigger(W,[X.gridPos,X.dataPos,null,Y.data.plot])};this.onRightClick=function(Y){var X=S(Y);var aa=Y.data.plot;var Z=V(X.gridPos,aa);if(aa.captureRightClick){if(Y.which==3){var W=jQuery.Event("jqplotRightClick");W.pageX=Y.pageX;W.pageY=Y.pageY;C(this).trigger(W,[X.gridPos,X.dataPos,Z,aa])}else{var W=jQuery.Event("jqplotMouseUp");W.pageX=Y.pageX;W.pageY=Y.pageY;C(this).trigger(W,[X.gridPos,X.dataPos,Z,aa])}}};this.onMouseMove=function(Y){var X=S(Y);var aa=Y.data.plot;var Z=V(X.gridPos,aa);var W=jQuery.Event("jqplotMouseMove");W.pageX=Y.pageX;W.pageY=Y.pageY;C(this).trigger(W,[X.gridPos,X.dataPos,Z,aa])};this.onMouseEnter=function(Y){var X=S(Y);var Z=Y.data.plot;var W=jQuery.Event("jqplotMouseEnter");W.pageX=Y.pageX;W.pageY=Y.pageY;C(this).trigger(W,[X.gridPos,X.dataPos,null,Z])};this.onMouseLeave=function(Y){var X=S(Y);var Z=Y.data.plot;var W=jQuery.Event("jqplotMouseLeave");W.pageX=Y.pageX;W.pageY=Y.pageY;C(this).trigger(W,[X.gridPos,X.dataPos,null,Z])};this.drawSeries=function(Y,W){var aa,Z,X;W=(typeof(Y)=="number"&&W==null)?Y:W;Y=(typeof(Y)=="object")?Y:{};if(W!=l){Z=this.series[W];X=Z.shadowCanvas._ctx;X.clearRect(0,0,X.canvas.width,X.canvas.height);Z.drawShadow(X,Y,this);X=Z.canvas._ctx;X.clearRect(0,0,X.canvas.width,X.canvas.height);Z.draw(X,Y,this);if(Z.renderer.constructor==C.jqplot.BezierCurveRenderer){if(W<this.series.length-1){this.drawSeries(W+1)}}}else{for(aa=0;aa<this.series.length;aa++){Z=this.series[aa];X=Z.shadowCanvas._ctx;X.clearRect(0,0,X.canvas.width,X.canvas.height);Z.drawShadow(X,Y,this);X=Z.canvas._ctx;X.clearRect(0,0,X.canvas.width,X.canvas.height);Z.draw(X,Y,this)}}};this.moveSeriesToFront=function(X){X=parseInt(X,10);var aa=C.inArray(X,this.seriesStack);if(aa==-1){return}if(aa==this.seriesStack.length-1){this.previousSeriesStack=this.seriesStack.slice(0);return}var W=this.seriesStack[this.seriesStack.length-1];var Z=this.series[X].canvas._elem.detach();var Y=this.series[X].shadowCanvas._elem.detach();this.series[W].shadowCanvas._elem.after(Y);this.series[W].canvas._elem.after(Z);this.previousSeriesStack=this.seriesStack.slice(0);this.seriesStack.splice(aa,1);this.seriesStack.push(X)};this.moveSeriesToBack=function(X){X=parseInt(X,10);var aa=C.inArray(X,this.seriesStack);if(aa==0||aa==-1){return}var W=this.seriesStack[0];var Z=this.series[X].canvas._elem.detach();var Y=this.series[X].shadowCanvas._elem.detach();this.series[W].shadowCanvas._elem.before(Y);this.series[W].canvas._elem.before(Z);this.previousSeriesStack=this.seriesStack.slice(0);this.seriesStack.splice(aa,1);this.seriesStack.unshift(X)};this.restorePreviousSeriesOrder=function(){var aa,Z,Y,X,W;if(this.seriesStack==this.previousSeriesStack){return}for(aa=1;aa<this.previousSeriesStack.length;aa++){move=this.previousSeriesStack[aa];keep=this.previousSeriesStack[aa-1];Y=this.series[move].canvas._elem.detach();X=this.series[move].shadowCanvas._elem.detach();this.series[keep].shadowCanvas._elem.after(X);this.series[keep].canvas._elem.after(Y)}W=this.seriesStack.slice(0);this.seriesStack=this.previousSeriesStack.slice(0);this.previousSeriesStack=W};this.restoreOriginalSeriesOrder=function(){var Y,X,W=[];for(Y=0;Y<this.series.length;Y++){W.push(Y)}if(this.seriesStack==W){return}this.previousSeriesStack=this.seriesStack.slice(0);this.seriesStack=W;for(Y=1;Y<this.seriesStack.length;Y++){serelem=this.series[Y].canvas._elem.detach();shadelem=this.series[Y].shadowCanvas._elem.detach();this.series[Y-1].shadowCanvas._elem.after(shadelem);this.series[Y-1].canvas._elem.after(serelem)}};this.activateTheme=function(W){this.themeEngine.activate(this,W)}}C.jqplot.computeHighlightColors=function(S){var U;if(typeof(S)=="array"){U=[];for(var W=0;W<S.length;W++){var V=C.jqplot.getColorComponents(S[W]);var R=[V[0],V[1],V[2]];var X=R[0]+R[1]+R[2];for(var T=0;T<3;T++){R[T]=(X>570)?R[T]*0.8:R[T]+0.3*(255-R[T]);R[T]=parseInt(R[T],10)}U.push("rgb("+R[0]+","+R[1]+","+R[2]+")")}}else{var V=C.jqplot.getColorComponents(S);var R=[V[0],V[1],V[2]];var X=R[0]+R[1]+R[2];for(var T=0;T<3;T++){R[T]=(X>570)?R[T]*0.8:R[T]+0.3*(255-R[T]);R[T]=parseInt(R[T],10)}U="rgb("+R[0]+","+R[1]+","+R[2]+")"}return U};C.jqplot.ColorGenerator=function(S){var R=0;this.next=function(){if(R<S.length){return S[R++]}else{R=0;return S[R++]}};this.previous=function(){if(R>0){return S[R--]}else{R=S.length-1;return S[R]}};this.get=function(U){var T=U-S.length*Math.floor(U/S.length);return S[T]};this.setColors=function(T){S=T};this.reset=function(){R=0}};C.jqplot.hex2rgb=function(T,R){T=T.replace("#","");if(T.length==3){T=T[0]+T[0]+T[1]+T[1]+T[2]+T[2]}var S;S="rgba("+parseInt(T.slice(0,2),16)+", "+parseInt(T.slice(2,4),16)+", "+parseInt(T.slice(4,6),16);if(R){S+=", "+R}S+=")";return S};C.jqplot.rgb2hex=function(V){var T=/rgba?\( *([0-9]{1,3}\.?[0-9]*%?) *, *([0-9]{1,3}\.?[0-9]*%?) *, *([0-9]{1,3}\.?[0-9]*%?) *(?:, *[0-9.]*)?\)/;var R=V.match(T);var U="#";for(i=1;i<4;i++){var S;if(R[i].search(/%/)!=-1){S=parseInt(255*R[i]/100,10).toString(16);if(S.length==1){S="0"+S}}else{S=parseInt(R[i],10).toString(16);if(S.length==1){S="0"+S}}U+=S}return U};C.jqplot.normalize2rgb=function(S,R){if(S.search(/^ *rgba?\(/)!=-1){return S}else{if(S.search(/^ *#?[0-9a-fA-F]?[0-9a-fA-F]/)!=-1){return C.jqplot.hex2rgb(S,R)}else{throw"invalid color spec"}}};C.jqplot.getColorComponents=function(V){V=C.jqplot.colorKeywordMap[V]||V;var U=C.jqplot.normalize2rgb(V);var T=/rgba?\( *([0-9]{1,3}\.?[0-9]*%?) *, *([0-9]{1,3}\.?[0-9]*%?) *, *([0-9]{1,3}\.?[0-9]*%?) *,? *([0-9.]* *)?\)/;var R=U.match(T);var S=[];for(i=1;i<4;i++){if(R[i].search(/%/)!=-1){S[i-1]=parseInt(255*R[i]/100,10)}else{S[i-1]=parseInt(R[i],10)}}S[3]=parseFloat(R[4])?parseFloat(R[4]):1;return S};C.jqplot.colorKeywordMap={aliceblue:"rgb(240, 248, 255)",antiquewhite:"rgb(250, 235, 215)",aqua:"rgb( 0, 255, 255)",aquamarine:"rgb(127, 255, 212)",azure:"rgb(240, 255, 255)",beige:"rgb(245, 245, 220)",bisque:"rgb(255, 228, 196)",black:"rgb( 0, 0, 0)",blanchedalmond:"rgb(255, 235, 205)",blue:"rgb( 0, 0, 255)",blueviolet:"rgb(138, 43, 226)",brown:"rgb(165, 42, 42)",burlywood:"rgb(222, 184, 135)",cadetblue:"rgb( 95, 158, 160)",chartreuse:"rgb(127, 255, 0)",chocolate:"rgb(210, 105, 30)",coral:"rgb(255, 127, 80)",cornflowerblue:"rgb(100, 149, 237)",cornsilk:"rgb(255, 248, 220)",crimson:"rgb(220, 20, 60)",cyan:"rgb( 0, 255, 255)",darkblue:"rgb( 0, 0, 139)",darkcyan:"rgb( 0, 139, 139)",darkgoldenrod:"rgb(184, 134, 11)",darkgray:"rgb(169, 169, 169)",darkgreen:"rgb( 0, 100, 0)",darkgrey:"rgb(169, 169, 169)",darkkhaki:"rgb(189, 183, 107)",darkmagenta:"rgb(139, 0, 139)",darkolivegreen:"rgb( 85, 107, 47)",darkorange:"rgb(255, 140, 0)",darkorchid:"rgb(153, 50, 204)",darkred:"rgb(139, 0, 0)",darksalmon:"rgb(233, 150, 122)",darkseagreen:"rgb(143, 188, 143)",darkslateblue:"rgb( 72, 61, 139)",darkslategray:"rgb( 47, 79, 79)",darkslategrey:"rgb( 47, 79, 79)",darkturquoise:"rgb( 0, 206, 209)",darkviolet:"rgb(148, 0, 211)",deeppink:"rgb(255, 20, 147)",deepskyblue:"rgb( 0, 191, 255)",dimgray:"rgb(105, 105, 105)",dimgrey:"rgb(105, 105, 105)",dodgerblue:"rgb( 30, 144, 255)",firebrick:"rgb(178, 34, 34)",floralwhite:"rgb(255, 250, 240)",forestgreen:"rgb( 34, 139, 34)",fuchsia:"rgb(255, 0, 255)",gainsboro:"rgb(220, 220, 220)",ghostwhite:"rgb(248, 248, 255)",gold:"rgb(255, 215, 0)",goldenrod:"rgb(218, 165, 32)",gray:"rgb(128, 128, 128)",grey:"rgb(128, 128, 128)",green:"rgb( 0, 128, 0)",greenyellow:"rgb(173, 255, 47)",honeydew:"rgb(240, 255, 240)",hotpink:"rgb(255, 105, 180)",indianred:"rgb(205, 92, 92)",indigo:"rgb( 75, 0, 130)",ivory:"rgb(255, 255, 240)",khaki:"rgb(240, 230, 140)",lavender:"rgb(230, 230, 250)",lavenderblush:"rgb(255, 240, 245)",lawngreen:"rgb(124, 252, 0)",lemonchiffon:"rgb(255, 250, 205)",lightblue:"rgb(173, 216, 230)",lightcoral:"rgb(240, 128, 128)",lightcyan:"rgb(224, 255, 255)",lightgoldenrodyellow:"rgb(250, 250, 210)",lightgray:"rgb(211, 211, 211)",lightgreen:"rgb(144, 238, 144)",lightgrey:"rgb(211, 211, 211)",lightpink:"rgb(255, 182, 193)",lightsalmon:"rgb(255, 160, 122)",lightseagreen:"rgb( 32, 178, 170)",lightskyblue:"rgb(135, 206, 250)",lightslategray:"rgb(119, 136, 153)",lightslategrey:"rgb(119, 136, 153)",lightsteelblue:"rgb(176, 196, 222)",lightyellow:"rgb(255, 255, 224)",lime:"rgb( 0, 255, 0)",limegreen:"rgb( 50, 205, 50)",linen:"rgb(250, 240, 230)",magenta:"rgb(255, 0, 255)",maroon:"rgb(128, 0, 0)",mediumaquamarine:"rgb(102, 205, 170)",mediumblue:"rgb( 0, 0, 205)",mediumorchid:"rgb(186, 85, 211)",mediumpurple:"rgb(147, 112, 219)",mediumseagreen:"rgb( 60, 179, 113)",mediumslateblue:"rgb(123, 104, 238)",mediumspringgreen:"rgb( 0, 250, 154)",mediumturquoise:"rgb( 72, 209, 204)",mediumvioletred:"rgb(199, 21, 133)",midnightblue:"rgb( 25, 25, 112)",mintcream:"rgb(245, 255, 250)",mistyrose:"rgb(255, 228, 225)",moccasin:"rgb(255, 228, 181)",navajowhite:"rgb(255, 222, 173)",navy:"rgb( 0, 0, 128)",oldlace:"rgb(253, 245, 230)",olive:"rgb(128, 128, 0)",olivedrab:"rgb(107, 142, 35)",orange:"rgb(255, 165, 0)",orangered:"rgb(255, 69, 0)",orchid:"rgb(218, 112, 214)",palegoldenrod:"rgb(238, 232, 170)",palegreen:"rgb(152, 251, 152)",paleturquoise:"rgb(175, 238, 238)",palevioletred:"rgb(219, 112, 147)",papayawhip:"rgb(255, 239, 213)",peachpuff:"rgb(255, 218, 185)",peru:"rgb(205, 133, 63)",pink:"rgb(255, 192, 203)",plum:"rgb(221, 160, 221)",powderblue:"rgb(176, 224, 230)",purple:"rgb(128, 0, 128)",red:"rgb(255, 0, 0)",rosybrown:"rgb(188, 143, 143)",royalblue:"rgb( 65, 105, 225)",saddlebrown:"rgb(139, 69, 19)",salmon:"rgb(250, 128, 114)",sandybrown:"rgb(244, 164, 96)",seagreen:"rgb( 46, 139, 87)",seashell:"rgb(255, 245, 238)",sienna:"rgb(160, 82, 45)",silver:"rgb(192, 192, 192)",skyblue:"rgb(135, 206, 235)",slateblue:"rgb(106, 90, 205)",slategray:"rgb(112, 128, 144)",slategrey:"rgb(112, 128, 144)",snow:"rgb(255, 250, 250)",springgreen:"rgb( 0, 255, 127)",steelblue:"rgb( 70, 130, 180)",tan:"rgb(210, 180, 140)",teal:"rgb( 0, 128, 128)",thistle:"rgb(216, 191, 216)",tomato:"rgb(255, 99, 71)",turquoise:"rgb( 64, 224, 208)",violet:"rgb(238, 130, 238)",wheat:"rgb(245, 222, 179)",white:"rgb(255, 255, 255)",whitesmoke:"rgb(245, 245, 245)",yellow:"rgb(255, 255, 0)",yellowgreen:"rgb(154, 205, 50)"};C.jqplot.log=function(){if(window.console&&C.jqplot.debug){if(arguments.length==1){console.log(arguments[0])}else{console.log(arguments)}}};var e=C.jqplot.log;C.jqplot.AxisLabelRenderer=function(R){C.jqplot.ElemContainer.call(this);this.axis;this.show=true;this.label="";this.fontFamily=null;this.fontSize=null;this.textColor=null;this._elem;this.escapeHTML=false;C.extend(true,this,R)};C.jqplot.AxisLabelRenderer.prototype=new C.jqplot.ElemContainer();C.jqplot.AxisLabelRenderer.prototype.constructor=C.jqplot.AxisLabelRenderer;C.jqplot.AxisLabelRenderer.prototype.init=function(R){C.extend(true,this,R)};C.jqplot.AxisLabelRenderer.prototype.draw=function(){this._elem=C('<div style="position:absolute;" class="jqplot-'+this.axis+'-label"></div>');if(Number(this.label)){this._elem.css("white-space","nowrap")}if(!this.escapeHTML){this._elem.html(this.label)}else{this._elem.text(this.label)}if(this.fontFamily){this._elem.css("font-family",this.fontFamily)}if(this.fontSize){this._elem.css("font-size",this.fontSize)}if(this.textColor){this._elem.css("color",this.textColor)}return this._elem};C.jqplot.AxisLabelRenderer.prototype.pack=function(){};C.jqplot.AxisTickRenderer=function(R){C.jqplot.ElemContainer.call(this);this.mark="outside";this.axis;this.showMark=true;this.showGridline=true;this.isMinorTick=false;this.size=4;this.markSize=6;this.show=true;this.showLabel=true;this.label="";this.value=null;this._styles={};this.formatter=C.jqplot.DefaultTickFormatter;this.prefix="";this.formatString="";this.fontFamily;this.fontSize;this.textColor;this._elem;C.extend(true,this,R)};C.jqplot.AxisTickRenderer.prototype.init=function(R){C.extend(true,this,R)};C.jqplot.AxisTickRenderer.prototype=new C.jqplot.ElemContainer();C.jqplot.AxisTickRenderer.prototype.constructor=C.jqplot.AxisTickRenderer;C.jqplot.AxisTickRenderer.prototype.setTick=function(R,T,S){this.value=R;this.axis=T;if(S){this.isMinorTick=true}return this};C.jqplot.AxisTickRenderer.prototype.draw=function(){if(!this.label){this.label=this.formatter(this.formatString,this.value)}if(this.prefix&&!this.formatString){this.label=this.prefix+this.label}style='style="position:absolute;';if(Number(this.label)){style+="white-space:nowrap;"}style+='"';this._elem=C("<div "+style+' class="jqplot-'+this.axis+'-tick">'+this.label+"</div>");for(var R in this._styles){this._elem.css(R,this._styles[R])}if(this.fontFamily){this._elem.css("font-family",this.fontFamily)}if(this.fontSize){this._elem.css("font-size",this.fontSize)}if(this.textColor){this._elem.css("color",this.textColor)}return this._elem};C.jqplot.DefaultTickFormatter=function(R,S){if(typeof S=="number"){if(!R){R=C.jqplot.config.defaultTickFormatString}return C.jqplot.sprintf(R,S)}else{return String(S)}};C.jqplot.AxisTickRenderer.prototype.pack=function(){};C.jqplot.CanvasGridRenderer=function(){this.shadowRenderer=new C.jqplot.ShadowRenderer()};C.jqplot.CanvasGridRenderer.prototype.init=function(S){this._ctx;C.extend(true,this,S);var R={lineJoin:"miter",lineCap:"round",fill:false,isarc:false,angle:this.shadowAngle,offset:this.shadowOffset,alpha:this.shadowAlpha,depth:this.shadowDepth,lineWidth:this.shadowWidth,closePath:false,strokeStyle:this.shadowColor};this.renderer.shadowRenderer.init(R)};C.jqplot.CanvasGridRenderer.prototype.createElement=function(){var T=document.createElement("canvas");var R=this._plotDimensions.width;var S=this._plotDimensions.height;T.width=R;T.height=S;this._elem=C(T);this._elem.addClass("jqplot-grid-canvas");this._elem.css({position:"absolute",left:0,top:0});if(C.browser.msie){window.G_vmlCanvasManager.init_(document)}if(C.browser.msie){T=window.G_vmlCanvasManager.initElement(T)}this._top=this._offsets.top;this._bottom=S-this._offsets.bottom;this._left=this._offsets.left;this._right=R-this._offsets.right;this._width=this._right-this._left;this._height=this._bottom-this._top;return this._elem};C.jqplot.CanvasGridRenderer.prototype.draw=function(){this._ctx=this._elem.get(0).getContext("2d");var ah=this._ctx;var aa=this._axes;ah.save();ah.clearRect(0,0,this._plotDimensions.width,this._plotDimensions.height);ah.fillStyle=this.backgroundColor||this.background;ah.fillRect(this._left,this._top,this._width,this._height);if(this.drawGridlines){ah.save();ah.lineJoin="miter";ah.lineCap="butt";ah.lineWidth=this.gridLineWidth;ah.strokeStyle=this.gridLineColor;var ac,Z;var R=["xaxis","yaxis","x2axis","y2axis"];for(var W=4;W>0;W--){var S=R[W-1];var U=aa[S];var ad=U._ticks;if(U.show){for(var V=ad.length;V>0;V--){var ag=ad[V-1];if(ag.show){var ab=Math.round(U.u2p(ag.value))+0.5;switch(S){case"xaxis":if(ag.showGridline){Y(ab,this._top,ab,this._bottom)}if(ag.showMark&&ag.mark){s=ag.markSize;m=ag.mark;var ab=Math.round(U.u2p(ag.value))+0.5;switch(m){case"outside":ac=this._bottom;Z=this._bottom+s;break;case"inside":ac=this._bottom-s;Z=this._bottom;break;case"cross":ac=this._bottom-s;Z=this._bottom+s;break;default:ac=this._bottom;Z=this._bottom+s;break}if(this.shadow){this.renderer.shadowRenderer.draw(ah,[[ab,ac],[ab,Z]],{lineCap:"butt",lineWidth:this.gridLineWidth,offset:this.gridLineWidth*0.75,depth:2,fill:false,closePath:false})}Y(ab,ac,ab,Z)}break;case"yaxis":if(ag.showGridline){Y(this._right,ab,this._left,ab)}if(ag.showMark&&ag.mark){s=ag.markSize;m=ag.mark;var ab=Math.round(U.u2p(ag.value))+0.5;switch(m){case"outside":ac=this._left-s;Z=this._left;break;case"inside":ac=this._left;Z=this._left+s;break;case"cross":ac=this._left-s;Z=this._left+s;break;default:ac=this._left-s;Z=this._left;break}if(this.shadow){this.renderer.shadowRenderer.draw(ah,[[ac,ab],[Z,ab]],{lineCap:"butt",lineWidth:this.gridLineWidth*1.5,offset:this.gridLineWidth*0.75,fill:false,closePath:false})}Y(ac,ab,Z,ab,{strokeStyle:U.borderColor})}break;case"x2axis":if(ag.showGridline){Y(ab,this._bottom,ab,this._top)}if(ag.showMark&&ag.mark){s=ag.markSize;m=ag.mark;var ab=Math.round(U.u2p(ag.value))+0.5;switch(m){case"outside":ac=this._top-s;Z=this._top;break;case"inside":ac=this._top;Z=this._top+s;break;case"cross":ac=this._top-s;Z=this._top+s;break;default:ac=this._top-s;Z=this._top;break}if(this.shadow){this.renderer.shadowRenderer.draw(ah,[[ab,ac],[ab,Z]],{lineCap:"butt",lineWidth:this.gridLineWidth,offset:this.gridLineWidth*0.75,depth:2,fill:false,closePath:false})}Y(ab,ac,ab,Z)}break;case"y2axis":if(ag.showGridline){Y(this._left,ab,this._right,ab)}if(ag.showMark&&ag.mark){s=ag.markSize;m=ag.mark;var ab=Math.round(U.u2p(ag.value))+0.5;switch(m){case"outside":ac=this._right;Z=this._right+s;break;case"inside":ac=this._right-s;Z=this._right;break;case"cross":ac=this._right-s;Z=this._right+s;break;default:ac=this._right;Z=this._right+s;break}if(this.shadow){this.renderer.shadowRenderer.draw(ah,[[ac,ab],[Z,ab]],{lineCap:"butt",lineWidth:this.gridLineWidth*1.5,offset:this.gridLineWidth*0.75,fill:false,closePath:false})}Y(ac,ab,Z,ab,{strokeStyle:U.borderColor})}break;default:break}}}}}R=["y3axis","y4axis","y5axis","y6axis","y7axis","y8axis","y9axis"];for(var W=7;W>0;W--){var U=aa[R[W-1]];var ad=U._ticks;if(U.show){var af=ad[U.numberTicks-1];var X=ad[0];var T=U.getLeft();var ae=[[T,af.getTop()+af.getHeight()/2],[T,X.getTop()+X.getHeight()/2+1]];if(this.shadow){this.renderer.shadowRenderer.draw(ah,ae,{lineCap:"butt",fill:false,closePath:false})}Y(ae[0][0],ae[0][1],ae[1][0],ae[1][1],{lineCap:"butt",strokeStyle:U.borderColor,lineWidth:U.borderWidth});for(var V=ad.length;V>0;V--){var ag=ad[V-1];s=ag.markSize;m=ag.mark;var ab=Math.round(U.u2p(ag.value))+0.5;if(ag.showMark&&ag.mark){switch(m){case"outside":ac=T;Z=T+s;break;case"inside":ac=T-s;Z=T;break;case"cross":ac=T-s;Z=T+s;break;default:ac=T;Z=T+s;break}ae=[[ac,ab],[Z,ab]];if(this.shadow){this.renderer.shadowRenderer.draw(ah,ae,{lineCap:"butt",lineWidth:this.gridLineWidth*1.5,offset:this.gridLineWidth*0.75,fill:false,closePath:false})}Y(ac,ab,Z,ab,{strokeStyle:U.borderColor})}}}}ah.restore()}function Y(am,al,aj,ai,ak){ah.save();ak=ak||{};if(ak.lineWidth==null||ak.lineWidth!=0){C.extend(true,ah,ak);ah.beginPath();ah.moveTo(am,al);ah.lineTo(aj,ai);ah.stroke();ah.restore()}}if(this.shadow){var ae=[[this._left,this._bottom],[this._right,this._bottom],[this._right,this._top]];this.renderer.shadowRenderer.draw(ah,ae)}if(this.borderWidth!=0&&this.drawBorder){Y(this._left,this._top,this._right,this._top,{lineCap:"round",strokeStyle:aa.x2axis.borderColor,lineWidth:aa.x2axis.borderWidth});Y(this._right,this._top,this._right,this._bottom,{lineCap:"round",strokeStyle:aa.y2axis.borderColor,lineWidth:aa.y2axis.borderWidth});Y(this._right,this._bottom,this._left,this._bottom,{lineCap:"round",strokeStyle:aa.xaxis.borderColor,lineWidth:aa.xaxis.borderWidth});Y(this._left,this._bottom,this._left,this._top,{lineCap:"round",strokeStyle:aa.yaxis.borderColor,lineWidth:aa.yaxis.borderWidth})}ah.restore()};var w=24*60*60*1000;var L=function(R,S){R=String(R);while(R.length<S){R="0"+R}return R};var x={millisecond:1,second:1000,minute:60*1000,hour:60*60*1000,day:w,week:7*w,month:{add:function(T,R){x.year.add(T,Math[R>0?"floor":"ceil"](R/12));var S=T.getMonth()+(R%12);if(S==12){S=0;T.setYear(T.getFullYear()+1)}else{if(S==-1){S=11;T.setYear(T.getFullYear()-1)}}T.setMonth(S)},diff:function(V,T){var R=V.getFullYear()-T.getFullYear();var S=V.getMonth()-T.getMonth()+(R*12);var U=V.getDate()-T.getDate();return S+(U/30)}},year:{add:function(S,R){S.setYear(S.getFullYear()+Math[R>0?"floor":"ceil"](R))},diff:function(S,R){return x.month.diff(S,R)/12}}};for(var K in x){if(K.substring(K.length-1)!="s"){x[K+"s"]=x[K]}}var z=function(U,T){if(Date.prototype.strftime.formatShortcuts[T]){return U.strftime(Date.prototype.strftime.formatShortcuts[T])}else{var R=(Date.prototype.strftime.formatCodes[T]||"").split(".");var S=U["get"+R[0]]?U["get"+R[0]]():"";if(R[1]){S=L(S,R[1])}return S}};var t={succ:function(R){return this.clone().add(1,R)},add:function(T,S){var R=x[S]||x.day;if(typeof R=="number"){this.setTime(this.getTime()+(R*T))}else{R.add(this,T)}return this},diff:function(S,V,R){S=Date.create(S);if(S===null){return null}var T=x[V]||x.day;if(typeof T=="number"){var U=(this.getTime()-S.getTime())/T}else{var U=T.diff(this,S)}return(R?U:Math[U>0?"floor":"ceil"](U))},strftime:function(S){var U=S||"%Y-%m-%d",R="",T;while(U.length>0){if(T=U.match(Date.prototype.strftime.formatCodes.matcher)){R+=U.slice(0,T.index);R+=(T[1]||"")+z(this,T[2]);U=U.slice(T.index+T[0].length)}else{R+=U;U=""}}return R},getShortYear:function(){return this.getYear()%100},getMonthNumber:function(){return this.getMonth()+1},getMonthName:function(){return Date.MONTHNAMES[this.getMonth()]},getAbbrMonthName:function(){return Date.ABBR_MONTHNAMES[this.getMonth()]},getDayName:function(){return Date.DAYNAMES[this.getDay()]},getAbbrDayName:function(){return Date.ABBR_DAYNAMES[this.getDay()]},getDayOrdinal:function(){return Date.ORDINALNAMES[this.getDate()%10]},getHours12:function(){var R=this.getHours();return R>12?R-12:(R==0?12:R)},getAmPm:function(){return this.getHours()>=12?"PM":"AM"},getUnix:function(){return Math.round(this.getTime()/1000,0)},getGmtOffset:function(){var R=this.getTimezoneOffset()/60;var S=R<0?"+":"-";R=Math.abs(R);return S+L(Math.floor(R),2)+":"+L((R%1)*60,2)},getTimezoneName:function(){var R=/(?:\((.+)\)$| ([A-Z]{3}) )/.exec(this.toString());return R[1]||R[2]||"GMT"+this.getGmtOffset()},toYmdInt:function(){return(this.getFullYear()*10000)+(this.getMonthNumber()*100)+this.getDate()},clone:function(){return new Date(this.getTime())}};for(var n in t){Date.prototype[n]=t[n]}var B={create:function(R){if(R instanceof Date){return R}if(typeof R=="number"){return new Date(R)}var W=String(R).replace(/^\s*(.+)\s*$/,"$1"),S=0,T=Date.create.patterns.length,U;var V=W;while(S<T){ms=Date.parse(V);if(!isNaN(ms)){return new Date(ms)}U=Date.create.patterns[S];if(typeof U=="function"){obj=U(V);if(obj instanceof Date){return obj}}else{V=W.replace(U[0],U[1])}S++}return NaN},MONTHNAMES:"January February March April May June July August September October November December".split(" "),ABBR_MONTHNAMES:"Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" "),DAYNAMES:"Sunday Monday Tuesday Wednesday Thursday Friday Saturday".split(" "),ABBR_DAYNAMES:"Sun Mon Tue Wed Thu Fri Sat".split(" "),ORDINALNAMES:"th st nd rd th th th th th th".split(" "),ISO:"%Y-%m-%dT%H:%M:%S.%N%G",SQL:"%Y-%m-%d %H:%M:%S",daysInMonth:function(R,S){if(S==2){return new Date(R,1,29).getDate()==29?29:28}return[l,31,l,31,30,31,30,31,31,30,31,30,31][S]}};for(var n in B){Date[n]=B[n]}Date.prototype.strftime.formatCodes={matcher:/()%(#?(%|[a-z]))/i,Y:"FullYear",y:"ShortYear.2",m:"MonthNumber.2","#m":"MonthNumber",B:"MonthName",b:"AbbrMonthName",d:"Date.2","#d":"Date",e:"Date",A:"DayName",a:"AbbrDayName",w:"Day",o:"DayOrdinal",H:"Hours.2","#H":"Hours",I:"Hours12.2","#I":"Hours12",p:"AmPm",M:"Minutes.2","#M":"Minutes",S:"Seconds.2","#S":"Seconds",s:"Unix",N:"Milliseconds.3","#N":"Milliseconds",O:"TimezoneOffset",Z:"TimezoneName",G:"GmtOffset"};Date.prototype.strftime.formatShortcuts={F:"%Y-%m-%d",T:"%H:%M:%S",X:"%H:%M:%S",x:"%m/%d/%y",D:"%m/%d/%y","#c":"%a %b %e %H:%M:%S %Y",v:"%e-%b-%Y",R:"%H:%M",r:"%I:%M:%S %p",t:"\t",n:"\n","%":"%"};Date.create.patterns=[[/-/g,"/"],[/st|nd|rd|th/g,""],[/(3[01]|[0-2]\d)\s*\.\s*(1[0-2]|0\d)\s*\.\s*([1-9]\d{3})/,"$2/$1/$3"],[/([1-9]\d{3})\s*-\s*(1[0-2]|0\d)\s*-\s*(3[01]|[0-2]\d)/,"$2/$3/$1"],function(U){var S=U.match(/^(?:(.+)\s+)?([012]?\d)(?:\s*\:\s*(\d\d))?(?:\s*\:\s*(\d\d(\.\d*)?))?\s*(am|pm)?\s*$/i);if(S){if(S[1]){var T=Date.create(S[1]);if(isNaN(T)){return}}else{var T=new Date();T.setMilliseconds(0)}var R=parseFloat(S[2]);if(S[6]){R=S[6].toLowerCase()=="am"?(R==12?0:R):(R==12?12:R+12)}T.setHours(R,parseInt(S[3]||0,10),parseInt(S[4]||0,10),((parseFloat(S[5]||0))||0)*1000);return T}else{return U}},function(U){var S=U.match(/^(?:(.+))[T|\s+]([012]\d)(?:\:(\d\d))(?:\:(\d\d))(?:\.\d+)([\+\-]\d\d\:\d\d)$/i);if(S){if(S[1]){var T=Date.create(S[1]);if(isNaN(T)){return}}else{var T=new Date();T.setMilliseconds(0)}var R=parseFloat(S[2]);T.setHours(R,parseInt(S[3],10),parseInt(S[4],10),parseFloat(S[5])*1000);return T}else{return U}},function(V){var T=V.match(/^([0-3]?\d)\s*[-\/.\s]{1}\s*([a-zA-Z]{3,9})\s*[-\/.\s]{1}\s*([0-3]?\d)$/);if(T){var U=new Date();var W=parseFloat(String(U.getFullYear()).slice(2,4));var X=parseInt(String(U.getFullYear())/100,10)*100;var Z=1;var aa=parseFloat(T[1]);var Y=parseFloat(T[3]);var S,R,ab;if(aa>31){R=T[3];if(aa<W+Z){S=X+aa}else{S=X-100+aa}}else{R=T[1];if(Y<W+Z){S=X+Y}else{S=X-100+Y}}var ab=C.inArray(T[2],Date.ABBR_MONTHNAMES);if(ab==-1){ab=C.inArray(T[2],Date.MONTHNAMES)}U.setFullYear(S,ab,R);U.setHours(0,0,0,0);return U}else{return V}}];if(C.jqplot.config.debug){C.date=Date.create}C.jqplot.DivTitleRenderer=function(){};C.jqplot.DivTitleRenderer.prototype.init=function(R){C.extend(true,this,R)};C.jqplot.DivTitleRenderer.prototype.draw=function(){var T=this.renderer;if(!this.text){this.show=false;this._elem=C('<div class="jqplot-title" style="height:0px;width:0px;"></div>')}else{if(this.text){var S;if(this.color){S=this.color}else{if(this.textColor){S=this.textColor}}var R="position:absolute;top:0px;left:0px;";R+=(this._plotWidth)?"width:"+this._plotWidth+"px;":"";R+=(this.fontSize)?"font-size:"+this.fontSize+";":"";R+=(this.textAlign)?"text-align:"+this.textAlign+";":"text-align:center;";R+=(S)?"color:"+S+";":"";R+=(this.paddingBottom)?"padding-bottom:"+this.paddingBottom+";":"";this._elem=C('<div class="jqplot-title" style="'+R+'">'+this.text+"</div>");if(this.fontFamily){this._elem.css("font-family",this.fontFamily)}}}return this._elem};C.jqplot.DivTitleRenderer.prototype.pack=function(){};C.jqplot.LineRenderer=function(){this.shapeRenderer=new C.jqplot.ShapeRenderer();this.shadowRenderer=new C.jqplot.ShadowRenderer()};C.jqplot.LineRenderer.prototype.init=function(S,W){S=S||{};var U={highlightMouseOver:S.highlightMouseOver,highlightMouseDown:S.highlightMouseDown,highlightColor:S.highlightColor};delete (S.highlightMouseOver);delete (S.highlightMouseDown);delete (S.highlightColor);C.extend(true,this.renderer,S);var V={lineJoin:"round",lineCap:"round",fill:this.fill,isarc:false,strokeStyle:this.color,fillStyle:this.fillColor,lineWidth:this.lineWidth,closePath:this.fill};this.renderer.shapeRenderer.init(V);if(this.lineWidth>2.5){var T=this.shadowOffset*(1+(Math.atan((this.lineWidth/2.5))/0.785398163-1)*0.6)}else{var T=this.shadowOffset*Math.atan((this.lineWidth/2.5))/0.785398163}var R={lineJoin:"round",lineCap:"round",fill:this.fill,isarc:false,angle:this.shadowAngle,offset:T,alpha:this.shadowAlpha,depth:this.shadowDepth,lineWidth:this.lineWidth,closePath:this.fill};this.renderer.shadowRenderer.init(R);this._areaPoints=[];this._boundingBox=[[],[]];if(!this.isTrendline&&this.fill){this.highlightMouseOver=true;this.highlightMouseDown=false;this.highlightColor=null;if(U.highlightMouseDown&&U.highlightMouseOver==null){U.highlightMouseOver=false}C.extend(true,this,{highlightMouseOver:U.highlightMouseOver,highlightMouseDown:U.highlightMouseDown,highlightColor:U.highlightColor});if(!this.highlightColor){this.highlightColor=C.jqplot.computeHighlightColors(this.fillColor)}if(this.highlighter){this.highlighter.show=false}W.postInitHooks.addOnce(r);W.postDrawHooks.addOnce(Q);W.eventListenerHooks.addOnce("jqplotMouseMove",d);W.eventListenerHooks.addOnce("jqplotMouseDown",a);W.eventListenerHooks.addOnce("jqplotMouseUp",P);W.eventListenerHooks.addOnce("jqplotClick",c);W.eventListenerHooks.addOnce("jqplotRightClick",j)}};C.jqplot.LineRenderer.prototype.setGridData=function(W){var S=this._xaxis.series_u2p;var V=this._yaxis.series_u2p;var T=this._plotData;var U=this._prevPlotData;this.gridData=[];this._prevGridData=[];for(var R=0;R<this.data.length;R++){if(T[R]!=null){this.gridData.push([S.call(this._xaxis,T[R][0]),V.call(this._yaxis,T[R][1])])}if(U[R]!=null){this._prevGridData.push([S.call(this._xaxis,U[R][0]),V.call(this._yaxis,U[R][1])])}}};C.jqplot.LineRenderer.prototype.makeGridData=function(U,W){var T=this._xaxis.series_u2p;var V=this._yaxis.series_u2p;var S=[];var X=[];for(var R=0;R<U.length;R++){if(U[R]!=null){S.push([T.call(this._xaxis,U[R][0]),V.call(this._yaxis,U[R][1])])}}return S};C.jqplot.LineRenderer.prototype.draw=function(ag,ap,S){var ak;var aa=(S!=l)?S:{};var U=(aa.shadow!=l)?aa.shadow:this.shadow;var aq=(aa.showLine!=l)?aa.showLine:this.showLine;var aj=(aa.fill!=l)?aa.fill:this.fill;var R=(aa.fillAndStroke!=l)?aa.fillAndStroke:this.fillAndStroke;var ab,ah,ae,al;ag.save();if(ap.length){if(aq){if(aj){if(this.fillToZero){var V=new C.jqplot.ColorGenerator(this.negativeSeriesColors);var am=V.get(this.index);if(!this.useNegativeColors){am=aa.fillStyle}var Y=false;var Z=aa.fillStyle;if(R){var ao=ap.slice(0)}if(this.index==0||!this._stack){var af=[];this._areaPoints=[];var an=this._yaxis.series_u2p(this.fillToValue);var T=this._xaxis.series_u2p(this.fillToValue);if(this.fillAxis=="y"){af.push([ap[0][0],an]);this._areaPoints.push([ap[0][0],an]);for(var ak=0;ak<ap.length-1;ak++){af.push(ap[ak]);this._areaPoints.push(ap[ak]);if(this._plotData[ak][1]*this._plotData[ak+1][1]<0){if(this._plotData[ak][1]<0){Y=true;aa.fillStyle=am}else{Y=false;aa.fillStyle=Z}var X=ap[ak][0]+(ap[ak+1][0]-ap[ak][0])*(an-ap[ak][1])/(ap[ak+1][1]-ap[ak][1]);af.push([X,an]);this._areaPoints.push([X,an]);if(U){this.renderer.shadowRenderer.draw(ag,af,aa)}this.renderer.shapeRenderer.draw(ag,af,aa);af=[[X,an]]}}if(this._plotData[ap.length-1][1]<0){Y=true;aa.fillStyle=am}else{Y=false;aa.fillStyle=Z}af.push(ap[ap.length-1]);this._areaPoints.push(ap[ap.length-1]);af.push([ap[ap.length-1][0],an]);this._areaPoints.push([ap[ap.length-1][0],an])}if(U){this.renderer.shadowRenderer.draw(ag,af,aa)}this.renderer.shapeRenderer.draw(ag,af,aa)}else{var ad=this._prevGridData;for(var ak=ad.length;ak>0;ak--){ap.push(ad[ak-1])}if(U){this.renderer.shadowRenderer.draw(ag,ap,aa)}this._areaPoints=ap;this.renderer.shapeRenderer.draw(ag,ap,aa)}}else{if(R){var ao=ap.slice(0)}if(this.index==0||!this._stack){var W=ag.canvas.height;ap.unshift([ap[0][0],W]);len=ap.length;ap.push([ap[len-1][0],W])}else{var ad=this._prevGridData;for(var ak=ad.length;ak>0;ak--){ap.push(ad[ak-1])}}this._areaPoints=ap;if(U){this.renderer.shadowRenderer.draw(ag,ap,aa)}this.renderer.shapeRenderer.draw(ag,ap,aa)}if(R){var ai=C.extend(true,{},aa,{fill:false,closePath:false});this.renderer.shapeRenderer.draw(ag,ao,ai);if(this.markerRenderer.show){for(ak=0;ak<ao.length;ak++){this.markerRenderer.draw(ao[ak][0],ao[ak][1],ag,aa.markerOptions)}}}}else{if(U){this.renderer.shadowRenderer.draw(ag,ap,aa)}this.renderer.shapeRenderer.draw(ag,ap,aa)}}var ab=ae=ah=al=null;for(ak=0;ak<this._areaPoints.length;ak++){var ac=this._areaPoints[ak];if(ab>ac[0]||ab==null){ab=ac[0]}if(al<ac[1]||al==null){al=ac[1]}if(ae<ac[0]||ae==null){ae=ac[0]}if(ah>ac[1]||ah==null){ah=ac[1]}}this._boundingBox=[[ab,al],[ae,ah]];if(this.markerRenderer.show&&!aj){for(ak=0;ak<ap.length;ak++){this.markerRenderer.draw(ap[ak][0],ap[ak][1],ag,aa.markerOptions)}}}ag.restore()};C.jqplot.LineRenderer.prototype.drawShadow=function(R,T,S){};function r(T,S,R){for(i=0;i<this.series.length;i++){if(this.series[i].renderer.constructor==C.jqplot.LineRenderer){if(this.series[i].highlightMouseOver){this.series[i].highlightMouseDown=false}}}this.target.bind("mouseout",{plot:this},function(U){N(U.data.plot)})}function Q(){this.plugins.lineRenderer={highlightedSeriesIndex:null};this.plugins.lineRenderer.highlightCanvas=new C.jqplot.GenericCanvas();this.eventCanvas._elem.before(this.plugins.lineRenderer.highlightCanvas.createElement(this._gridPadding,"jqplot-lineRenderer-highlight-canvas",this._plotDimensions));var R=this.plugins.lineRenderer.highlightCanvas.setContext()}function O(X,W,U,T){var S=X.series[W];var R=X.plugins.lineRenderer.highlightCanvas;R._ctx.clearRect(0,0,R._ctx.canvas.width,R._ctx.canvas.height);S._highlightedPoint=U;X.plugins.lineRenderer.highlightedSeriesIndex=W;var V={fillStyle:S.highlightColor};S.renderer.shapeRenderer.draw(R._ctx,T,V)}function N(T){var R=T.plugins.lineRenderer.highlightCanvas;R._ctx.clearRect(0,0,R._ctx.canvas.width,R._ctx.canvas.height);for(var S=0;S<T.series.length;S++){T.series[S]._highlightedPoint=null}T.plugins.lineRenderer.highlightedSeriesIndex=null;T.target.trigger("jqplotDataUnhighlight")}function d(V,U,Y,X,W){if(X){var T=[X.seriesIndex,X.pointIndex,X.data];var S=jQuery.Event("jqplotDataMouseOver");S.pageX=V.pageX;S.pageY=V.pageY;W.target.trigger(S,T);if(W.series[T[0]].highlightMouseOver&&!(T[0]==W.plugins.lineRenderer.highlightedSeriesIndex)){var R=jQuery.Event("jqplotDataHighlight");R.pageX=V.pageX;R.pageY=V.pageY;W.target.trigger(R,T);O(W,X.seriesIndex,X.pointIndex,X.points)}}else{if(X==null){N(W)}}}function a(U,T,X,W,V){if(W){var S=[W.seriesIndex,W.pointIndex,W.data];if(V.series[S[0]].highlightMouseDown&&!(S[0]==V.plugins.lineRenderer.highlightedSeriesIndex)){var R=jQuery.Event("jqplotDataHighlight");R.pageX=U.pageX;R.pageY=U.pageY;V.target.trigger(R,S);O(V,W.seriesIndex,W.pointIndex,W.points)}}else{if(W==null){N(V)}}}function P(T,S,W,V,U){var R=U.plugins.lineRenderer.highlightedSeriesIndex;if(R!=null&&U.series[R].highlightMouseDown){N(U)}}function c(U,T,X,W,V){if(W){var S=[W.seriesIndex,W.pointIndex,W.data];var R=jQuery.Event("jqplotDataClick");R.pageX=U.pageX;R.pageY=U.pageY;V.target.trigger(R,S)}}function j(V,U,Y,X,W){if(X){var T=[X.seriesIndex,X.pointIndex,X.data];var R=W.plugins.lineRenderer.highlightedSeriesIndex;if(R!=null&&W.series[R].highlightMouseDown){N(W)}var S=jQuery.Event("jqplotDataRightClick");S.pageX=V.pageX;S.pageY=V.pageY;W.target.trigger(S,T)}}C.jqplot.LinearAxisRenderer=function(){};C.jqplot.LinearAxisRenderer.prototype.init=function(T){C.extend(true,this,T);var R=this._dataBounds;for(var U=0;U<this._series.length;U++){var V=this._series[U];var W=V._plotData;for(var S=0;S<W.length;S++){if(this.name=="xaxis"||this.name=="x2axis"){if(W[S][0]<R.min||R.min==null){R.min=W[S][0]}if(W[S][0]>R.max||R.max==null){R.max=W[S][0]}}else{if(W[S][1]<R.min||R.min==null){R.min=W[S][1]}if(W[S][1]>R.max||R.max==null){R.max=W[S][1]}}}}};C.jqplot.LinearAxisRenderer.prototype.draw=function(R){if(this.show){this.renderer.createTicks.call(this);var X=0;var S;if(this._elem){this._elem.empty()}this._elem=C('<div class="jqplot-axis jqplot-'+this.name+'" style="position:absolute;"></div>');if(this.name=="xaxis"||this.name=="x2axis"){this._elem.width(this._plotDimensions.width)}else{this._elem.height(this._plotDimensions.height)}this.labelOptions.axis=this.name;this._label=new this.labelRenderer(this.labelOptions);if(this._label.show){var W=this._label.draw(R);W.appendTo(this._elem)}if(this.showTicks){var V=this._ticks;for(var U=0;U<V.length;U++){var T=V[U];if(T.showLabel&&(!T.isMinorTick||this.showMinorTicks)){var W=T.draw(R);W.appendTo(this._elem)}}}}return this._elem};C.jqplot.LinearAxisRenderer.prototype.reset=function(){this.min=this._min;this.max=this._max;this.tickInterval=this._tickInterval;this.numberTicks=this._numberTicks};C.jqplot.LinearAxisRenderer.prototype.set=function(){var Y=0;var T;var S=0;var X=0;var R=(this._label==null)?false:this._label.show;if(this.show&&this.showTicks){var W=this._ticks;for(var V=0;V<W.length;V++){var U=W[V];if(U.showLabel&&(!U.isMinorTick||this.showMinorTicks)){if(this.name=="xaxis"||this.name=="x2axis"){T=U._elem.outerHeight(true)}else{T=U._elem.outerWidth(true)}if(T>Y){Y=T}}}if(R){S=this._label._elem.outerWidth(true);X=this._label._elem.outerHeight(true)}if(this.name=="xaxis"){Y=Y+X;this._elem.css({height:Y+"px",left:"0px",bottom:"0px"})}else{if(this.name=="x2axis"){Y=Y+X;this._elem.css({height:Y+"px",left:"0px",top:"0px"})}else{if(this.name=="yaxis"){Y=Y+S;this._elem.css({width:Y+"px",left:"0px",top:"0px"});if(R&&this._label.constructor==C.jqplot.AxisLabelRenderer){this._label._elem.css("width",S+"px")}}else{Y=Y+S;this._elem.css({width:Y+"px",right:"0px",top:"0px"});if(R&&this._label.constructor==C.jqplot.AxisLabelRenderer){this._label._elem.css("width",S+"px")}}}}}};C.jqplot.LinearAxisRenderer.prototype.createTicks=function(){var au=this._ticks;var an=this.ticks;var ae=this.name;var ag=this._dataBounds;var R,V;var aG,al;var X,W;var aE,aB;var ak=this.min;var aF=this.max;var ax=this.numberTicks;var aJ=this.tickInterval;if(an.length){for(aB=0;aB<an.length;aB++){var aq=an[aB];var av=new this.tickRenderer(this.tickOptions);if(aq.constructor==Array){av.value=aq[0];av.label=aq[1];if(!this.showTicks){av.showLabel=false;av.showMark=false}else{if(!this.showTickMarks){av.showMark=false}}av.setTick(aq[0],this.name);this._ticks.push(av)}else{av.value=aq;if(!this.showTicks){av.showLabel=false;av.showMark=false}else{if(!this.showTickMarks){av.showMark=false}}av.setTick(aq,this.name);this._ticks.push(av)}}this.numberTicks=an.length;this.min=this._ticks[0].value;this.max=this._ticks[this.numberTicks-1].value;this.tickInterval=(this.max-this.min)/(this.numberTicks-1)}else{if(ae=="xaxis"||ae=="x2axis"){R=this._plotDimensions.width}else{R=this._plotDimensions.height}if(!this.autoscale&&this.min!=null&&this.max!=null&&this.numberTicks!=null){this.tickInterval=null}aG=((this.min!=null)?this.min:ag.min);al=((this.max!=null)?this.max:ag.max);if(aG==al){var S=0.05;if(aG>0){S=Math.max(Math.log(aG)/Math.LN10,0.05)}aG-=S;al+=S}var ac=al-aG;var ar,ad;var aa;if(this.autoscale&&this.min==null&&this.max==null){var T,U,Z;var ah=false;var ap=false;var af={min:null,max:null,average:null,stddev:null};for(var aB=0;aB<this._series.length;aB++){var aw=this._series[aB];var ai=(aw.fillAxis=="x")?aw._xaxis.name:aw._yaxis.name;if(this.name==ai){var at=aw._plotValues[aw.fillAxis];var aj=at[0];var aC=at[0];for(var aA=1;aA<at.length;aA++){if(at[aA]<aj){aj=at[aA]}else{if(at[aA]>aC){aC=at[aA]}}}var ab=(aC-aj)/aC;if(aw.renderer.constructor==C.jqplot.BarRenderer){if(aj>=0&&(aw.fillToZero||ab>0.1)){ah=true}else{ah=false;if(aw.fill&&aw.fillToZero&&aj<0&&aC>0){ap=true}else{ap=false}}}else{if(aw.fill){if(aj>=0&&(aw.fillToZero||ab>0.1)){ah=true}else{if(aj<0&&aC>0&&aw.fillToZero){ah=false;ap=true}else{ah=false;ap=false}}}else{if(aj<0){ah=false}}}}}if(ah){this.numberTicks=2+Math.ceil((R-(this.tickSpacing-1))/this.tickSpacing);this.min=0;ak=0;U=al/(this.numberTicks-1);aa=Math.pow(10,Math.abs(Math.floor(Math.log(U)/Math.LN10)));if(U/aa==parseInt(U/aa,10)){U+=aa}this.tickInterval=Math.ceil(U/aa)*aa;this.max=this.tickInterval*(this.numberTicks-1)}else{if(ap){this.numberTicks=2+Math.ceil((R-(this.tickSpacing-1))/this.tickSpacing);var am=Math.ceil(Math.abs(aG)/ac*(this.numberTicks-1));var aI=this.numberTicks-1-am;U=Math.max(Math.abs(aG/am),Math.abs(al/aI));aa=Math.pow(10,Math.abs(Math.floor(Math.log(U)/Math.LN10)));this.tickInterval=Math.ceil(U/aa)*aa;this.max=this.tickInterval*aI;this.min=-this.tickInterval*am}else{if(this.numberTicks==null){if(this.tickInterval){this.numberTicks=3+Math.ceil(ac/this.tickInterval)}else{this.numberTicks=2+Math.ceil((R-(this.tickSpacing-1))/this.tickSpacing)}}if(this.tickInterval==null){U=ac/(this.numberTicks-1);if(U<1){aa=Math.pow(10,Math.abs(Math.floor(Math.log(U)/Math.LN10)))}else{aa=1}this.tickInterval=Math.ceil(U*aa*this.pad)/aa}else{aa=1/this.tickInterval}T=this.tickInterval*(this.numberTicks-1);Z=(T-ac)/2;if(this.min==null){this.min=Math.floor(aa*(aG-Z))/aa}if(this.max==null){this.max=this.min+T}}}}else{ar=(this.min!=null)?this.min:aG-ac*(this.padMin-1);ad=(this.max!=null)?this.max:al+ac*(this.padMax-1);this.min=ar;this.max=ad;ac=this.max-this.min;if(this.numberTicks==null){if(this.tickInterval!=null){this.numberTicks=Math.ceil((this.max-this.min)/this.tickInterval)+1;this.max=this.min+this.tickInterval*(this.numberTicks-1)}else{if(R>100){this.numberTicks=parseInt(3+(R-100)/75,10)}else{this.numberTicks=2}}}if(this.tickInterval==null){this.tickInterval=ac/(this.numberTicks-1)}}if(this.renderer.constructor==C.jqplot.LinearAxisRenderer){ac=this.max-this.min;var aH=new this.tickRenderer(this.tickOptions);var ao=aH.formatString||C.jqplot.config.defaultTickFormatString;var ao=ao.match(C.jqplot.sprintf.regex)[0];var aD=0;if(ao){if(ao.search(/[fFeEgGpP]/)>-1){var az=ao.match(/\%\.(\d{0,})?[eEfFgGpP]/);if(az){aD=parseInt(az[1],10)}else{aD=6}}else{if(ao.search(/[di]/)>-1){aD=0}}var Y=Math.pow(10,-aD);if(this.tickInterval<Y){if(ax==null&&aJ==null){this.tickInterval=Y;if(aF==null&&ak==null){this.min=Math.floor(this._dataBounds.min/Y)*Y;if(this.min==this._dataBounds.min){this.min=this._dataBounds.min-this.tickInterval}this.max=Math.ceil(this._dataBounds.max/Y)*Y;if(this.max==this._dataBounds.max){this.max=this._dataBounds.max+this.tickInterval}var ay=(this.max-this.min)/this.tickInterval;ay=ay.toFixed(11);ay=Math.ceil(ay);this.numberTicks=ay+1}else{if(aF==null){var ay=(this._dataBounds.max-this.min)/this.tickInterval;ay=ay.toFixed(11);this.numberTicks=Math.ceil(ay)+2;this.max=this.min+this.tickInterval*(this.numberTicks-1)}else{if(ak==null){var ay=(this.max-this._dataBounds.min)/this.tickInterval;ay=ay.toFixed(11);this.numberTicks=Math.ceil(ay)+2;this.min=this.max-this.tickInterval*(this.numberTicks-1)}}}}}}}for(var aB=0;aB<this.numberTicks;aB++){aE=this.min+aB*this.tickInterval;var av=new this.tickRenderer(this.tickOptions);if(!this.showTicks){av.showLabel=false;av.showMark=false}else{if(!this.showTickMarks){av.showMark=false}}av.setTick(aE,this.name);this._ticks.push(av)}}};C.jqplot.LinearAxisRenderer.prototype.pack=function(aa,V){var ad=this._ticks;var ab=this.max;var X=this.min;var U=V.max;var ah=V.min;var Y=(this._label==null)?false:this._label.show;for(var R in aa){this._elem.css(R,aa[R])}this._offsets=V;var T=U-ah;var ag=ab-X;this.p2u=function(ai){return(ai-ah)*ag/T+X};this.u2p=function(ai){return(ai-X)*T/ag+ah};if(this.name=="xaxis"||this.name=="x2axis"){this.series_u2p=function(ai){return(ai-X)*T/ag};this.series_p2u=function(ai){return ai*ag/T+X}}else{this.series_u2p=function(ai){return(ai-ab)*T/ag};this.series_p2u=function(ai){return ai*ag/T+ab}}if(this.show){if(this.name=="xaxis"||this.name=="x2axis"){for(i=0;i<ad.length;i++){var af=ad[i];if(af.show&&af.showLabel){var W;if(af.constructor==C.jqplot.CanvasAxisTickRenderer&&af.angle){var ae=(this.name=="xaxis")?1:-1;switch(af.labelPosition){case"auto":if(ae*af.angle<0){W=-af.getWidth()+af._textRenderer.height*Math.sin(-af._textRenderer.angle)/2}else{W=-af._textRenderer.height*Math.sin(af._textRenderer.angle)/2}break;case"end":W=-af.getWidth()+af._textRenderer.height*Math.sin(-af._textRenderer.angle)/2;break;case"start":W=-af._textRenderer.height*Math.sin(af._textRenderer.angle)/2;break;case"middle":W=-af.getWidth()/2+af._textRenderer.height*Math.sin(-af._textRenderer.angle)/2;break;default:W=-af.getWidth()/2+af._textRenderer.height*Math.sin(-af._textRenderer.angle)/2;break}}else{W=-af.getWidth()/2}var S=this.u2p(af.value)+W+"px";af._elem.css("left",S);af.pack()}}if(Y){var ac=this._label._elem.outerWidth(true);this._label._elem.css("left",ah+T/2-ac/2+"px");if(this.name=="xaxis"){this._label._elem.css("bottom","0px")}else{this._label._elem.css("top","0px")}this._label.pack()}}else{for(i=0;i<ad.length;i++){var af=ad[i];if(af.show&&af.showLabel){var W;if(af.constructor==C.jqplot.CanvasAxisTickRenderer&&af.angle){var ae=(this.name=="yaxis")?1:-1;switch(af.labelPosition){case"auto":case"end":if(ae*af.angle<0){W=-af._textRenderer.height*Math.cos(-af._textRenderer.angle)/2}else{W=-af.getHeight()+af._textRenderer.height*Math.cos(af._textRenderer.angle)/2}break;case"start":if(af.angle>0){W=-af._textRenderer.height*Math.cos(-af._textRenderer.angle)/2}else{W=-af.getHeight()+af._textRenderer.height*Math.cos(af._textRenderer.angle)/2}break;case"middle":W=-af.getHeight()/2;break;default:W=-af.getHeight()/2;break}}else{W=-af.getHeight()/2}var S=this.u2p(af.value)+W+"px";af._elem.css("top",S);af.pack()}}if(Y){var Z=this._label._elem.outerHeight(true);this._label._elem.css("top",U-T/2-Z/2+"px");if(this.name=="yaxis"){this._label._elem.css("left","0px")}else{this._label._elem.css("right","0px")}this._label.pack()}}}};C.jqplot.MarkerRenderer=function(R){this.show=true;this.style="filledCircle";this.lineWidth=2;this.size=9;this.color="#666666";this.shadow=true;this.shadowAngle=45;this.shadowOffset=1;this.shadowDepth=3;this.shadowAlpha="0.07";this.shadowRenderer=new C.jqplot.ShadowRenderer();this.shapeRenderer=new C.jqplot.ShapeRenderer();C.extend(true,this,R)};C.jqplot.MarkerRenderer.prototype.init=function(R){C.extend(true,this,R);var T={angle:this.shadowAngle,offset:this.shadowOffset,alpha:this.shadowAlpha,lineWidth:this.lineWidth,depth:this.shadowDepth,closePath:true};if(this.style.indexOf("filled")!=-1){T.fill=true}if(this.style.indexOf("ircle")!=-1){T.isarc=true;T.closePath=false}this.shadowRenderer.init(T);var S={fill:false,isarc:false,strokeStyle:this.color,fillStyle:this.color,lineWidth:this.lineWidth,closePath:true};if(this.style.indexOf("filled")!=-1){S.fill=true}if(this.style.indexOf("ircle")!=-1){S.isarc=true;S.closePath=false}this.shapeRenderer.init(S)};C.jqplot.MarkerRenderer.prototype.drawDiamond=function(T,S,W,V,Y){var R=1.2;var Z=this.size/2/R;var X=this.size/2*R;var U=[[T-Z,S],[T,S+X],[T+Z,S],[T,S-X]];if(this.shadow){this.shadowRenderer.draw(W,U)}this.shapeRenderer.draw(W,U,Y)};C.jqplot.MarkerRenderer.prototype.drawPlus=function(U,T,X,W,aa){var S=1;var ab=this.size/2*S;var Y=this.size/2*S;var Z=[[U,T-Y],[U,T+Y]];var V=[[U+ab,T],[U-ab,T]];var R=C.extend(true,{},this.options,{closePath:false});if(this.shadow){this.shadowRenderer.draw(X,Z,{closePath:false});this.shadowRenderer.draw(X,V,{closePath:false})}this.shapeRenderer.draw(X,Z,R);this.shapeRenderer.draw(X,V,R)};C.jqplot.MarkerRenderer.prototype.drawX=function(U,T,X,W,aa){var S=1;var ab=this.size/2*S;var Y=this.size/2*S;var R=C.extend(true,{},this.options,{closePath:false});var Z=[[U-ab,T-Y],[U+ab,T+Y]];var V=[[U-ab,T+Y],[U+ab,T-Y]];if(this.shadow){this.shadowRenderer.draw(X,Z,{closePath:false});this.shadowRenderer.draw(X,V,{closePath:false})}this.shapeRenderer.draw(X,Z,R);this.shapeRenderer.draw(X,V,R)};C.jqplot.MarkerRenderer.prototype.drawDash=function(T,S,W,V,Y){var R=1;var Z=this.size/2*R;var X=this.size/2*R;var U=[[T-Z,S],[T+Z,S]];if(this.shadow){this.shadowRenderer.draw(W,U)}this.shapeRenderer.draw(W,U,Y)};C.jqplot.MarkerRenderer.prototype.drawSquare=function(T,S,W,V,Y){var R=1;var Z=this.size/2/R;var X=this.size/2*R;var U=[[T-Z,S-X],[T-Z,S+X],[T+Z,S+X],[T+Z,S-X]];if(this.shadow){this.shadowRenderer.draw(W,U)}this.shapeRenderer.draw(W,U,Y)};C.jqplot.MarkerRenderer.prototype.drawCircle=function(S,Y,U,X,V){var R=this.size/2;var T=2*Math.PI;var W=[S,Y,R,0,T,true];if(this.shadow){this.shadowRenderer.draw(U,W)}this.shapeRenderer.draw(U,W,V)};C.jqplot.MarkerRenderer.prototype.draw=function(R,U,S,T){T=T||{};if(T.show==null||T.show!=false){if(T.color&&!T.fillStyle){T.fillStyle=T.color}if(T.color&&!T.strokeStyle){T.strokeStyle=T.color}switch(this.style){case"diamond":this.drawDiamond(R,U,S,false,T);break;case"filledDiamond":this.drawDiamond(R,U,S,true,T);break;case"circle":this.drawCircle(R,U,S,false,T);break;case"filledCircle":this.drawCircle(R,U,S,true,T);break;case"square":this.drawSquare(R,U,S,false,T);break;case"filledSquare":this.drawSquare(R,U,S,true,T);break;case"x":this.drawX(R,U,S,true,T);break;case"plus":this.drawPlus(R,U,S,true,T);break;case"dash":this.drawDash(R,U,S,true,T);break;default:this.drawDiamond(R,U,S,false,T);break}}};C.jqplot.ShadowRenderer=function(R){this.angle=45;this.offset=1;this.alpha=0.07;this.lineWidth=1.5;this.lineJoin="miter";this.lineCap="round";this.closePath=false;this.fill=false;this.depth=3;this.strokeStyle="rgba(0,0,0,0.1)";this.isarc=false;C.extend(true,this,R)};C.jqplot.ShadowRenderer.prototype.init=function(R){C.extend(true,this,R)};C.jqplot.ShadowRenderer.prototype.draw=function(aa,Y,ac){aa.save();var R=(ac!=null)?ac:{};var Z=(R.fill!=null)?R.fill:this.fill;var X=(R.closePath!=null)?R.closePath:this.closePath;var U=(R.offset!=null)?R.offset:this.offset;var S=(R.alpha!=null)?R.alpha:this.alpha;var W=(R.depth!=null)?R.depth:this.depth;var ab=(R.isarc!=null)?R.isarc:this.isarc;aa.lineWidth=(R.lineWidth!=null)?R.lineWidth:this.lineWidth;aa.lineJoin=(R.lineJoin!=null)?R.lineJoin:this.lineJoin;aa.lineCap=(R.lineCap!=null)?R.lineCap:this.lineCap;aa.strokeStyle=R.strokeStyle||this.strokeStyle||"rgba(0,0,0,"+S+")";aa.fillStyle=R.fillStyle||this.fillStyle||"rgba(0,0,0,"+S+")";for(var T=0;T<W;T++){aa.translate(Math.cos(this.angle*Math.PI/180)*U,Math.sin(this.angle*Math.PI/180)*U);aa.beginPath();if(ab){aa.arc(Y[0],Y[1],Y[2],Y[3],Y[4],true)}else{aa.moveTo(Y[0][0],Y[0][1]);for(var V=1;V<Y.length;V++){aa.lineTo(Y[V][0],Y[V][1])}}if(X){aa.closePath()}if(Z){aa.fill()}else{aa.stroke()}}aa.restore()};C.jqplot.ShapeRenderer=function(R){this.lineWidth=1.5;this.lineJoin="miter";this.lineCap="round";this.closePath=false;this.fill=false;this.isarc=false;this.fillRect=false;this.strokeRect=false;this.clearRect=false;this.strokeStyle="#999999";this.fillStyle="#999999";C.extend(true,this,R)};C.jqplot.ShapeRenderer.prototype.init=function(R){C.extend(true,this,R)};C.jqplot.ShapeRenderer.prototype.draw=function(Z,X,ab){Z.save();var R=(ab!=null)?ab:{};var Y=(R.fill!=null)?R.fill:this.fill;var V=(R.closePath!=null)?R.closePath:this.closePath;var W=(R.fillRect!=null)?R.fillRect:this.fillRect;var T=(R.strokeRect!=null)?R.strokeRect:this.strokeRect;var S=(R.clearRect!=null)?R.clearRect:this.clearRect;var aa=(R.isarc!=null)?R.isarc:this.isarc;Z.lineWidth=R.lineWidth||this.lineWidth;Z.lineJoin=R.lineJoing||this.lineJoin;Z.lineCap=R.lineCap||this.lineCap;Z.strokeStyle=(R.strokeStyle||R.color)||this.strokeStyle;Z.fillStyle=R.fillStyle||this.fillStyle;Z.beginPath();if(aa){Z.arc(X[0],X[1],X[2],X[3],X[4],true);if(V){Z.closePath()}if(Y){Z.fill()}else{Z.stroke()}Z.restore();return}else{if(S){Z.clearRect(X[0],X[1],X[2],X[3]);Z.restore();return}else{if(W||T){if(W){Z.fillRect(X[0],X[1],X[2],X[3])}if(T){Z.strokeRect(X[0],X[1],X[2],X[3]);Z.restore();return}}else{Z.moveTo(X[0][0],X[0][1]);for(var U=1;U<X.length;U++){Z.lineTo(X[U][0],X[U][1])}if(V){Z.closePath()}if(Y){Z.fill()}else{Z.stroke()}}}}Z.restore()};C.jqplot.TableLegendRenderer=function(){};C.jqplot.TableLegendRenderer.prototype.init=function(R){C.extend(true,this,R)};C.jqplot.TableLegendRenderer.prototype.addrow=function(U,S,X,T){var R=(X)?this.rowSpacing:"0";if(T){var W=C('<tr class="jqplot-table-legend"></tr>').prependTo(this._elem)}else{var W=C('<tr class="jqplot-table-legend"></tr>').appendTo(this._elem)}if(this.showSwatches){C('<td class="jqplot-table-legend" style="text-align:center;padding-top:'+R+';"><div><div class="jqplot-table-legend-swatch" style="background-color:'+S+";border-color:"+S+';"></div></div></td>').appendTo(W)}if(this.showLabels){var V=C('<td class="jqplot-table-legend" style="padding-top:'+R+';"></td>');V.appendTo(W);if(this.escapeHtml){V.text(U)}else{V.html(U)}}};C.jqplot.TableLegendRenderer.prototype.draw=function(){var Y=this;if(this.show){var V=this._series;var aa="position:absolute;";aa+=(this.background)?"background:"+this.background+";":"";aa+=(this.border)?"border:"+this.border+";":"";aa+=(this.fontSize)?"font-size:"+this.fontSize+";":"";aa+=(this.fontFamily)?"font-family:"+this.fontFamily+";":"";aa+=(this.textColor)?"color:"+this.textColor+";":"";aa+=(this.marginTop!=null)?"margin-top:"+this.marginTop+";":"";aa+=(this.marginBottom!=null)?"margin-bottom:"+this.marginBottom+";":"";aa+=(this.marginLeft!=null)?"margin-left:"+this.marginLeft+";":"";aa+=(this.marginRight!=null)?"margin-right:"+this.marginRight+";":"";this._elem=C('<table class="jqplot-table-legend" style="'+aa+'"></table>');var R=false,X=false;for(var W=0;W<V.length;W++){s=V[W];if(s._stack||s.renderer.constructor==C.jqplot.BezierCurveRenderer){X=true}if(s.show&&s.showLabel){var U=this.labels[W]||s.label.toString();if(U){var S=s.color;if(X&&W<V.length-1){R=true}else{if(X&&W==V.length-1){R=false}}this.renderer.addrow.call(this,U,S,R,X);R=true}for(var T=0;T<C.jqplot.addLegendRowHooks.length;T++){var Z=C.jqplot.addLegendRowHooks[T].call(this,s);if(Z){this.renderer.addrow.call(this,Z.label,Z.color,R);R=true}}}}}return this._elem};C.jqplot.TableLegendRenderer.prototype.pack=function(T){if(this.show){if(this.placement=="insideGrid"){switch(this.location){case"nw":var S=T.left;var R=T.top;this._elem.css("left",S);this._elem.css("top",R);break;case"n":var S=(T.left+(this._plotDimensions.width-T.right))/2-this.getWidth()/2;var R=T.top;this._elem.css("left",S);this._elem.css("top",R);break;case"ne":var S=T.right;var R=T.top;this._elem.css({right:S,top:R});break;case"e":var S=T.right;var R=(T.top+(this._plotDimensions.height-T.bottom))/2-this.getHeight()/2;this._elem.css({right:S,top:R});break;case"se":var S=T.right;var R=T.bottom;this._elem.css({right:S,bottom:R});break;case"s":var S=(T.left+(this._plotDimensions.width-T.right))/2-this.getWidth()/2;var R=T.bottom;this._elem.css({left:S,bottom:R});break;case"sw":var S=T.left;var R=T.bottom;this._elem.css({left:S,bottom:R});break;case"w":var S=T.left;var R=(T.top+(this._plotDimensions.height-T.bottom))/2-this.getHeight()/2;this._elem.css({left:S,top:R});break;default:var S=T.right;var R=T.bottom;this._elem.css({right:S,bottom:R});break}}else{if(this.placement=="outside"){switch(this.location){case"nw":var S=this._plotDimensions.width-T.left;var R=T.top;this._elem.css("right",S);this._elem.css("top",R);break;case"n":var S=(T.left+(this._plotDimensions.width-T.right))/2-this.getWidth()/2;var R=this._plotDimensions.height-T.top;this._elem.css("left",S);this._elem.css("bottom",R);break;case"ne":var S=this._plotDimensions.width-T.right;var R=T.top;this._elem.css({left:S,top:R});break;case"e":var S=this._plotDimensions.width-T.right;var R=(T.top+(this._plotDimensions.height-T.bottom))/2-this.getHeight()/2;this._elem.css({left:S,top:R});break;case"se":var S=this._plotDimensions.width-T.right;var R=T.bottom;this._elem.css({left:S,bottom:R});break;case"s":var S=(T.left+(this._plotDimensions.width-T.right))/2-this.getWidth()/2;var R=this._plotDimensions.height-T.bottom;this._elem.css({left:S,top:R});break;case"sw":var S=this._plotDimensions.width-T.left;var R=T.bottom;this._elem.css({right:S,bottom:R});break;case"w":var S=this._plotDimensions.width-T.left;var R=(T.top+(this._plotDimensions.height-T.bottom))/2-this.getHeight()/2;this._elem.css({right:S,top:R});break;default:var S=T.right;var R=T.bottom;this._elem.css({right:S,bottom:R});break}}else{switch(this.location){case"nw":this._elem.css({left:0,top:T.top});break;case"n":var S=(T.left+(this._plotDimensions.width-T.right))/2-this.getWidth()/2;this._elem.css({left:S,top:T.top});break;case"ne":this._elem.css({right:0,top:T.top});break;case"e":var R=(T.top+(this._plotDimensions.height-T.bottom))/2-this.getHeight()/2;this._elem.css({right:T.right,top:R});break;case"se":this._elem.css({right:T.right,bottom:T.bottom});break;case"s":var S=(T.left+(this._plotDimensions.width-T.right))/2-this.getWidth()/2;this._elem.css({left:S,bottom:T.bottom});break;case"sw":this._elem.css({left:T.left,bottom:T.bottom});break;case"w":var R=(T.top+(this._plotDimensions.height-T.bottom))/2-this.getHeight()/2;this._elem.css({left:T.left,top:R});break;default:this._elem.css({right:T.right,bottom:T.bottom});break}}}}};C.jqplot.ThemeEngine=function(){this.themes={};this.activeTheme=null};C.jqplot.ThemeEngine.prototype.init=function(){var U=new C.jqplot.Theme({_name:"Default"});var W,S;for(W in U.target){if(W=="textColor"){U.target[W]=this.target.css("color")}else{U.target[W]=this.target.css(W)}}if(this.title.show&&this.title._elem){for(W in U.title){if(W=="textColor"){U.title[W]=this.title._elem.css("color")}else{U.title[W]=this.title._elem.css(W)}}}for(W in U.grid){U.grid[W]=this.grid[W]}if(U.grid.backgroundColor==null&&this.grid.background!=null){U.grid.backgroundColor=this.grid.background}if(this.legend.show&&this.legend._elem){for(W in U.legend){if(W=="textColor"){U.legend[W]=this.legend._elem.css("color")}else{U.legend[W]=this.legend._elem.css(W)}}}var T;for(S=0;S<this.series.length;S++){T=this.series[S];if(T.renderer.constructor==C.jqplot.LineRenderer){U.series.push(new h())}else{if(T.renderer.constructor==C.jqplot.BarRenderer){U.series.push(new I())}else{if(T.renderer.constructor==C.jqplot.PieRenderer){U.series.push(new b())}else{if(T.renderer.constructor==C.jqplot.DonutRenderer){U.series.push(new y())}else{if(T.renderer.constructor==C.jqplot.FunnelRenderer){U.series.push(new M())}else{if(T.renderer.constructor==C.jqplot.MeterGaugeRenderer){U.series.push(new v())}else{U.series.push({})}}}}}}for(W in U.series[S]){U.series[S][W]=T[W]}}var R,V;for(W in this.axes){V=this.axes[W];R=U.axes[W]=new F();R.borderColor=V.borderColor;R.borderWidth=V.borderWidth;if(V._ticks&&V._ticks[0]){for(nn in R.ticks){if(V._ticks[0].hasOwnProperty(nn)){R.ticks[nn]=V._ticks[0][nn]}else{if(V._ticks[0]._elem){R.ticks[nn]=V._ticks[0]._elem.css(nn)}}}}if(V._label&&V._label.show){for(nn in R.label){if(V._label[nn]){R.label[nn]=V._label[nn]}else{if(V._label._elem){if(nn=="textColor"){R.label[nn]=V._label._elem.css("color")}else{R.label[nn]=V._label._elem.css(nn)}}}}}}this.themeEngine._add(U);this.themeEngine.activeTheme=this.themeEngine.themes[U._name]};C.jqplot.ThemeEngine.prototype.get=function(R){if(!R){return this.activeTheme}else{return this.themes[R]}};function E(S,R){return S-R}C.jqplot.ThemeEngine.prototype.getThemeNames=function(){var R=[];for(var S in this.themes){R.push(S)}return R.sort(E)};C.jqplot.ThemeEngine.prototype.getThemes=function(){var S=[];var R=[];for(var U in this.themes){S.push(U)}S.sort(E);for(var T=0;T<S.length;T++){R.push(this.themes[S[T]])}return R};C.jqplot.ThemeEngine.prototype.activate=function(ac,U){var ah=false;if(!U&&this.activeTheme&&this.activeTheme._name){U=this.activeTheme._name}if(!this.themes.hasOwnProperty(U)){throw new Error("No theme of that name")}else{var V=this.themes[U];this.activeTheme=V;var X,ag=false,ad=false;var ab=["xaxis","x2axis","yaxis","y2axis"];for(aa=0;aa<ab.length;aa++){var T=ab[aa];if(V.axesStyles.borderColor!=null){ac.axes[T].borderColor=V.axesStyles.borderColor}if(V.axesStyles.borderWidth!=null){ac.axes[T].borderWidth=V.axesStyles.borderWidth}}for(axname in ac.axes){var Y=ac.axes[axname];if(Y.show){var af=V.axes[axname]||{};var S=V.axesStyles;var Z=C.jqplot.extend(true,{},af,S);X=(V.axesStyles.borderColor!=null)?V.axesStyles.borderColor:Z.borderColor;if(Z.borderColor!=null){Y.borderColor=Z.borderColor;ah=true}X=(V.axesStyles.borderWidth!=null)?V.axesStyles.borderWidth:Z.borderWidth;if(Z.borderWidth!=null){Y.borderWidth=Z.borderWidth;ah=true}if(Y._ticks&&Y._ticks[0]){for(nn in Z.ticks){X=Z.ticks[nn];if(X!=null){Y.tickOptions[nn]=X;Y._ticks=[];ah=true}}}if(Y._label&&Y._label.show){for(nn in Z.label){X=Z.label[nn];if(X!=null){Y.labelOptions[nn]=X;ah=true}}}}}for(var W in V.grid){if(V.grid[W]!=null){ac.grid[W]=V.grid[W]}}if(!ah){ac.grid.draw()}if(ac.legend.show){for(W in V.legend){if(V.legend[W]!=null){ac.legend[W]=V.legend[W]}}}if(ac.title.show){for(W in V.title){if(V.title[W]!=null){ac.title[W]=V.title[W]}}}var aa;for(aa=0;aa<V.series.length;aa++){var R={};var ae=false;for(W in V.series[aa]){X=(V.seriesStyles[W]!=null)?V.seriesStyles[W]:V.series[aa][W];if(X!=null){R[W]=X;if(W=="color"){ac.series[aa].renderer.shapeRenderer.fillStyle=X;ac.series[aa].renderer.shapeRenderer.strokeStyle=X;ac.series[aa][W]=X}else{if(W=="lineWidth"){ac.series[aa].renderer.shapeRenderer.lineWidth=X;ac.series[aa][W]=X}else{if(W=="markerOptions"){J(ac.series[aa].markerOptions,X);J(ac.series[aa].markerRenderer,X)}else{ac.series[aa][W]=X}}}ah=true}}}if(ah){ac.target.empty();ac.draw()}for(W in V.target){if(V.target[W]!=null){ac.target.css(W,V.target[W])}}}};C.jqplot.ThemeEngine.prototype._add=function(S,R){if(R){S._name=R}if(!S._name){S._name=Date.parse(new Date())}if(!this.themes.hasOwnProperty(S._name)){this.themes[S._name]=S}else{throw new Error("jqplot.ThemeEngine Error: Theme already in use")}};C.jqplot.ThemeEngine.prototype.remove=function(R){if(R=="Default"){return false}return delete this.themes[R]};C.jqplot.ThemeEngine.prototype.newTheme=function(R,T){if(typeof(R)=="object"){T=T||R;R=null}if(T&&T._name){R=T._name}else{R=R||Date.parse(new Date())}var S=this.copy(this.themes.Default._name,R);C.jqplot.extend(S,T);return S};function u(T){if(T==null||typeof(T)!="object"){return T}var R=new T.constructor();for(var S in T){R[S]=u(T[S])}return R}C.jqplot.clone=u;function J(T,S){if(S==null||typeof(S)!="object"){return}for(var R in S){if(R=="highlightColors"){T[R]=u(S[R])}if(S[R]!=null&&typeof(S[R])=="object"){if(!T.hasOwnProperty(R)){T[R]={}}J(T[R],S[R])}else{T[R]=S[R]}}}C.jqplot.merge=J;C.jqplot.extend=function(){var W=arguments[0]||{},U=1,V=arguments.length,R=false,T;if(typeof W==="boolean"){R=W;W=arguments[1]||{};U=2}if(typeof W!=="object"&&!toString.call(W)==="[object Function]"){W={}}for(;U<V;U++){if((T=arguments[U])!=null){for(var S in T){var X=W[S],Y=T[S];if(W===Y){continue}if(R&&Y&&typeof Y==="object"&&!Y.nodeType){W[S]=C.jqplot.extend(R,X||(Y.length!=null?[]:{}),Y)}else{if(Y!==l){W[S]=Y}}}}}return W};C.jqplot.ThemeEngine.prototype.rename=function(S,R){if(S=="Default"||R=="Default"){throw new Error("jqplot.ThemeEngine Error: Cannot rename from/to Default")}if(this.themes.hasOwnProperty(R)){throw new Error("jqplot.ThemeEngine Error: New name already in use.")}else{if(this.themes.hasOwnProperty(S)){var T=this.copy(S,R);this.remove(S);return T}}throw new Error("jqplot.ThemeEngine Error: Old name or new name invalid")};C.jqplot.ThemeEngine.prototype.copy=function(R,T,V){if(T=="Default"){throw new Error("jqplot.ThemeEngine Error: Cannot copy over Default theme")}if(!this.themes.hasOwnProperty(R)){var S="jqplot.ThemeEngine Error: Source name invalid";throw new Error(S)}if(this.themes.hasOwnProperty(T)){var S="jqplot.ThemeEngine Error: Target name invalid";throw new Error(S)}else{var U=u(this.themes[R]);U._name=T;C.jqplot.extend(true,U,V);this._add(U);return U}};C.jqplot.Theme=function(R,S){if(typeof(R)=="object"){S=S||R;R=null}R=R||Date.parse(new Date());this._name=R;this.target={backgroundColor:null};this.legend={textColor:null,fontFamily:null,fontSize:null,border:null,background:null};this.title={textColor:null,fontFamily:null,fontSize:null,textAlign:null};this.seriesStyles={};this.series=[];this.grid={drawGridlines:null,gridLineColor:null,gridLineWidth:null,backgroundColor:null,borderColor:null,borderWidth:null,shadow:null};this.axesStyles={label:{},ticks:{}};this.axes={};if(typeof(S)=="string"){this._name=S}else{if(typeof(S)=="object"){C.jqplot.extend(true,this,S)}}};var F=function(){this.borderColor=null;this.borderWidth=null;this.ticks=new f();this.label=new k()};var f=function(){this.show=null;this.showGridline=null;this.showLabel=null;this.showMark=null;this.size=null;this.textColor=null;this.whiteSpace=null;this.fontSize=null;this.fontFamily=null};var k=function(){this.textColor=null;this.whiteSpace=null;this.fontSize=null;this.fontFamily=null;this.fontWeight=null};var h=function(){this.color=null;this.lineWidth=null;this.shadow=null;this.fillColor=null;this.showMarker=null;this.markerOptions=new A()};var A=function(){this.show=null;this.style=null;this.lineWidth=null;this.size=null;this.color=null;this.shadow=null};var I=function(){this.color=null;this.seriesColors=null;this.lineWidth=null;this.shadow=null;this.barPadding=null;this.barMargin=null;this.barWidth=null;this.highlightColors=null};var b=function(){this.seriesColors=null;this.padding=null;this.sliceMargin=null;this.fill=null;this.shadow=null;this.startAngle=null;this.lineWidth=null;this.highlightColors=null};var y=function(){this.seriesColors=null;this.padding=null;this.sliceMargin=null;this.fill=null;this.shadow=null;this.startAngle=null;this.lineWidth=null;this.innerDiameter=null;this.thickness=null;this.ringMargin=null;this.highlightColors=null};var M=function(){this.color=null;this.lineWidth=null;this.shadow=null;this.padding=null;this.sectionMargin=null;this.seriesColors=null;this.highlightColors=null};var v=function(){this.padding=null;this.backgroundColor=null;this.ringColor=null;this.tickColor=null;this.ringWidth=null;this.intervalColors=null;this.intervalInnerRadius=null;this.intervalOuterRadius=null;this.hubRadius=null;this.needleThickness=null;this.needlePad=null};C.jqplot.sprintf=function(){function W(ac,Y,Z,ab){var aa=(ac.length>=Y)?"":Array(1+Y-ac.length>>>0).join(Z);return ab?ac+aa:aa+ac}function T(ad,ac,af,aa,ab,Z){var ae=aa-ad.length;if(ae>0){var Y=" ";if(Z){Y="&nbsp;"}if(af||!ab){ad=W(ad,aa,Y,af)}else{ad=ad.slice(0,ac.length)+W("",ae,"0",true)+ad.slice(ac.length)}}return ad}function X(ag,Z,ae,aa,Y,ad,af,ac){var ab=ag>>>0;ae=ae&&ab&&{"2":"0b","8":"0","16":"0x"}[Z]||"";ag=ae+W(ab.toString(Z),ad||0,"0",false);return T(ag,ae,aa,Y,af,ac)}function R(ac,ad,aa,Y,ab,Z){if(Y!=null){ac=ac.slice(0,Y)}return T(ac,"",ad,aa,ab,Z)}var S=arguments,U=0,V=S[U++];return V.replace(C.jqplot.sprintf.regex,function(ar,ae,af,ai,au,ap,ac){if(ar=="%%"){return"%"}var aj=false,ag="",ah=false,aq=false,ad=false;for(var ao=0;af&&ao<af.length;ao++){switch(af.charAt(ao)){case" ":ag=" ";break;case"+":ag="+";break;case"-":aj=true;break;case"0":ah=true;break;case"#":aq=true;break;case"&":ad=true;break}}if(!ai){ai=0}else{if(ai=="*"){ai=+S[U++]}else{if(ai.charAt(0)=="*"){ai=+S[ai.slice(1,-1)]}else{ai=+ai}}}if(ai<0){ai=-ai;aj=true}if(!isFinite(ai)){throw new Error("$.jqplot.sprintf: (minimum-)width must be finite")}if(!ap){ap="fFeE".indexOf(ac)>-1?6:(ac=="d")?0:void (0)}else{if(ap=="*"){ap=+S[U++]}else{if(ap.charAt(0)=="*"){ap=+S[ap.slice(1,-1)]}else{ap=+ap}}}var al=ae?S[ae.slice(0,-1)]:S[U++];switch(ac){case"s":if(al==null){return""}return R(String(al),aj,ai,ap,ah,ad);case"c":return R(String.fromCharCode(+al),aj,ai,ap,ah,ad);case"b":return X(al,2,aq,aj,ai,ap,ah,ad);case"o":return X(al,8,aq,aj,ai,ap,ah,ad);case"x":return X(al,16,aq,aj,ai,ap,ah,ad);case"X":return X(al,16,aq,aj,ai,ap,ah,ad).toUpperCase();case"u":return X(al,10,aq,aj,ai,ap,ah,ad);case"i":var aa=parseInt(+al,10);if(isNaN(aa)){return""}var an=aa<0?"-":ag;al=an+W(String(Math.abs(aa)),ap,"0",false);return T(al,an,aj,ai,ah,ad);case"d":var aa=Math.round(+al);if(isNaN(aa)){return""}var an=aa<0?"-":ag;al=an+W(String(Math.abs(aa)),ap,"0",false);return T(al,an,aj,ai,ah,ad);case"e":case"E":case"f":case"F":case"g":case"G":var aa=+al;if(isNaN(aa)){return""}var an=aa<0?"-":ag;var ab=["toExponential","toFixed","toPrecision"]["efg".indexOf(ac.toLowerCase())];var at=["toString","toUpperCase"]["eEfFgG".indexOf(ac)%2];al=an+Math.abs(aa)[ab](ap);return T(al,an,aj,ai,ah,ad)[at]();case"p":case"P":var aa=+al;if(isNaN(aa)){return""}var an=aa<0?"-":ag;var ak=String(Number(Math.abs(aa)).toExponential()).split(/e|E/);var Z=(ak[0].indexOf(".")!=-1)?ak[0].length-1:ak[0].length;var am=(ak[1]<0)?-ak[1]-1:0;if(Math.abs(aa)<1){if(Z+am<=ap){al=an+Math.abs(aa).toPrecision(Z)}else{if(Z<=ap-1){al=an+Math.abs(aa).toExponential(Z-1)}else{al=an+Math.abs(aa).toExponential(ap-1)}}}else{var Y=(Z<=ap)?Z:ap;al=an+Math.abs(aa).toPrecision(Y)}var at=["toString","toUpperCase"]["pP".indexOf(ac)%2];return T(al,an,aj,ai,ah,ad)[at]();case"n":return"";default:return ar}})};C.jqplot.sprintf.regex=/%%|%(\d+\$)?([-+#0& ]*)(\*\d+\$|\*|\d+)?(\.(\*\d+\$|\*|\d+))?([nAscboxXuidfegpEGP])/g})(jQuery);
/**
 * Copyright (c) 2009 - 2010 Chris Leonello
 * jqPlot is currently available for use in all personal or commercial projects 
 * under both the MIT (http://www.opensource.org/licenses/mit-license.php) and GPL 
 * version 2.0 (http://www.gnu.org/licenses/gpl-2.0.html) licenses. This means that you can 
 * choose the license that best suits your project and use it accordingly. 
 *
 * Although not required, the author would appreciate an email letting him 
 * know of any substantial use of jqPlot.  You can reach the author at: 
 * chris dot leonello at gmail dot com or see http://www.jqplot.com/info.php .
 *
 * If you are feeling kind and generous, consider supporting the project by
 * making a donation at: http://www.jqplot.com/donate.php .
 *
 * jqPlot includes date instance methods and printf/sprintf functions by other authors:
 *
 * Date instance methods contained in jqplot.dateMethods.js:
 *
 *     author Ken Snyder (ken d snyder at gmail dot com)
 *     date 2008-09-10
 *     version 2.0.2 (http://kendsnyder.com/sandbox/date/)     
 *     license Creative Commons Attribution License 3.0 (http://creativecommons.org/licenses/by/3.0/)
 *
 * JavaScript printf/sprintf functions contained in jqplot.sprintf.js:
 *
 *     version 2007.04.27
 *     author Ash Searle
 *     http://hexmen.com/blog/2007/03/printf-sprintf/
 *     http://hexmen.com/js/sprintf.js
 *     The author (Ash Searle) has placed this code in the public domain:
 *     "This code is unrestricted: you are free to use it however you like."
 * 
 */
(function(a){a.jqplot.DateAxisRenderer=function(){a.jqplot.LinearAxisRenderer.call(this)};a.jqplot.DateAxisRenderer.prototype=new a.jqplot.LinearAxisRenderer();a.jqplot.DateAxisRenderer.prototype.constructor=a.jqplot.DateAxisRenderer;a.jqplot.DateTickFormatter=function(b,c){if(!b){b="%Y/%m/%d"}return Date.create(c).strftime(b)};a.jqplot.DateAxisRenderer.prototype.init=function(f){this.tickOptions.formatter=a.jqplot.DateTickFormatter;this.daTickInterval=null;this._daTickInterval=null;a.extend(true,this,f);var c=this._dataBounds;for(var g=0;g<this._series.length;g++){var h=this._series[g];var l=h.data;var b=h._plotData;var k=h._stackData;for(var e=0;e<l.length;e++){if(this.name=="xaxis"||this.name=="x2axis"){l[e][0]=Date.create(l[e][0]).getTime();b[e][0]=Date.create(l[e][0]).getTime();k[e][0]=Date.create(l[e][0]).getTime();if(l[e][0]<c.min||c.min==null){c.min=l[e][0]}if(l[e][0]>c.max||c.max==null){c.max=l[e][0]}}else{l[e][1]=Date.create(l[e][1]).getTime();b[e][1]=Date.create(l[e][1]).getTime();k[e][1]=Date.create(l[e][1]).getTime();if(l[e][1]<c.min||c.min==null){c.min=l[e][1]}if(l[e][1]>c.max||c.max==null){c.max=l[e][1]}}}}};a.jqplot.DateAxisRenderer.prototype.reset=function(){this.min=this._min;this.max=this._max;this.tickInterval=this._tickInterval;this.numberTicks=this._numberTicks;this.daTickInterval=this._daTickInterval};a.jqplot.DateAxisRenderer.prototype.createTicks=function(){var v=this._ticks;var r=this.ticks;var w=this.name;var u=this._dataBounds;var o,s;var m,p;var d,c;var b,q;if(r.length){for(q=0;q<r.length;q++){var f=r[q];var h=new this.tickRenderer(this.tickOptions);if(f.constructor==Array){h.value=Date.create(f[0]).getTime();h.label=f[1];if(!this.showTicks){h.showLabel=false;h.showMark=false}else{if(!this.showTickMarks){h.showMark=false}}h.setTick(h.value,this.name);this._ticks.push(h)}else{h.value=Date.create(f).getTime();if(!this.showTicks){h.showLabel=false;h.showMark=false}else{if(!this.showTickMarks){h.showMark=false}}h.setTick(h.value,this.name);this._ticks.push(h)}}this.numberTicks=r.length;this.min=this._ticks[0].value;this.max=this._ticks[this.numberTicks-1].value;this.daTickInterval=[(this.max-this.min)/(this.numberTicks-1)/1000,"seconds"]}else{if(w=="xaxis"||w=="x2axis"){o=this._plotDimensions.width}else{o=this._plotDimensions.height}if(this.min!=null&&this.max!=null&&this.numberTicks!=null){this.tickInterval=null}if(this.tickInterval!=null){if(Number(this.tickInterval)){this.daTickInterval=[Number(this.tickInterval),"seconds"]}else{if(typeof this.tickInterval=="string"){var k=this.tickInterval.split(" ");if(k.length==1){this.daTickInterval=[1,k[0]]}else{if(k.length==2){this.daTickInterval=[k[0],k[1]]}}}}}m=((this.min!=null)?Date.create(this.min).getTime():u.min);p=((this.max!=null)?Date.create(this.max).getTime():u.max);if(m==p){var g=24*60*60*500;m-=g;p+=g}var j=p-m;var l,n;l=(this.min!=null)?Date.create(this.min).getTime():m-j/2*(this.padMin-1);n=(this.max!=null)?Date.create(this.max).getTime():p+j/2*(this.padMax-1);this.min=l;this.max=n;j=this.max-this.min;if(this.numberTicks==null){if(this.daTickInterval!=null){var e=Date.create(this.max).diff(this.min,this.daTickInterval[1],true);this.numberTicks=Math.ceil(e/this.daTickInterval[0])+1;this.max=Date.create(this.min).add((this.numberTicks-1)*this.daTickInterval[0],this.daTickInterval[1]).getTime()}else{if(o>200){this.numberTicks=parseInt(3+(o-200)/100,10)}else{this.numberTicks=2}}}if(this.daTickInterval==null){this.daTickInterval=[j/(this.numberTicks-1)/1000,"seconds"]}for(var q=0;q<this.numberTicks;q++){var m=Date.create(this.min);b=m.add(q*this.daTickInterval[0],this.daTickInterval[1]).getTime();var h=new this.tickRenderer(this.tickOptions);if(!this.showTicks){h.showLabel=false;h.showMark=false}else{if(!this.showTickMarks){h.showMark=false}}h.setTick(b,this.name);this._ticks.push(h)}}if(this._daTickInterval==null){this._daTickInterval=this.daTickInterval}}})(jQuery);
/**
 * Copyright (c) 2009 - 2010 Chris Leonello
 * jqPlot is currently available for use in all personal or commercial projects 
 * under both the MIT (http://www.opensource.org/licenses/mit-license.php) and GPL 
 * version 2.0 (http://www.gnu.org/licenses/gpl-2.0.html) licenses. This means that you can 
 * choose the license that best suits your project and use it accordingly. 
 *
 * Although not required, the author would appreciate an email letting him 
 * know of any substantial use of jqPlot.  You can reach the author at: 
 * chris dot leonello at gmail dot com or see http://www.jqplot.com/info.php .
 *
 * If you are feeling kind and generous, consider supporting the project by
 * making a donation at: http://www.jqplot.com/donate.php .
 *
 * jqPlot includes date instance methods and printf/sprintf functions by other authors:
 *
 * Date instance methods contained in jqplot.dateMethods.js:
 *
 *     author Ken Snyder (ken d snyder at gmail dot com)
 *     date 2008-09-10
 *     version 2.0.2 (http://kendsnyder.com/sandbox/date/)     
 *     license Creative Commons Attribution License 3.0 (http://creativecommons.org/licenses/by/3.0/)
 *
 * JavaScript printf/sprintf functions contained in jqplot.sprintf.js:
 *
 *     version 2007.04.27
 *     author Ash Searle
 *     http://hexmen.com/blog/2007/03/printf-sprintf/
 *     http://hexmen.com/js/sprintf.js
 *     The author (Ash Searle) has placed this code in the public domain:
 *     "This code is unrestricted: you are free to use it however you like."
 * 
 */
(function(a){a.jqplot.CanvasTextRenderer=function(b){this.fontStyle="normal";this.fontVariant="normal";this.fontWeight="normal";this.fontSize="10px";this.fontFamily="sans-serif";this.fontStretch=1;this.fillStyle="#666666";this.angle=0;this.textAlign="start";this.textBaseline="alphabetic";this.text;this.width;this.height;this.pt2px=1.28;a.extend(true,this,b);this.normalizedFontSize=this.normalizeFontSize(this.fontSize);this.setHeight()};a.jqplot.CanvasTextRenderer.prototype.init=function(b){a.extend(true,this,b);this.normalizedFontSize=this.normalizeFontSize(this.fontSize);this.setHeight()};a.jqplot.CanvasTextRenderer.prototype.normalizeFontSize=function(b){b=String(b);n=parseFloat(b);if(b.indexOf("px")>-1){return n/this.pt2px}else{if(b.indexOf("pt")>-1){return n}else{if(b.indexOf("em")>-1){return n*12}else{if(b.indexOf("%")>-1){return n*12/100}else{return n/this.pt2px}}}}};a.jqplot.CanvasTextRenderer.prototype.fontWeight2Float=function(b){if(Number(b)){return b/400}else{switch(b){case"normal":return 1;break;case"bold":return 1.75;break;case"bolder":return 2.25;break;case"lighter":return 0.75;break;default:return 1;break}}};a.jqplot.CanvasTextRenderer.prototype.getText=function(){return this.text};a.jqplot.CanvasTextRenderer.prototype.setText=function(c,b){this.text=c;this.setWidth(b);return this};a.jqplot.CanvasTextRenderer.prototype.getWidth=function(b){return this.width};a.jqplot.CanvasTextRenderer.prototype.setWidth=function(c,b){if(!b){this.width=this.measure(c,this.text)}else{this.width=b}return this};a.jqplot.CanvasTextRenderer.prototype.getHeight=function(b){return this.height};a.jqplot.CanvasTextRenderer.prototype.setHeight=function(b){if(!b){this.height=this.normalizedFontSize*this.pt2px}else{this.height=b}return this};a.jqplot.CanvasTextRenderer.prototype.letter=function(b){return this.letters[b]};a.jqplot.CanvasTextRenderer.prototype.ascent=function(){return this.normalizedFontSize};a.jqplot.CanvasTextRenderer.prototype.descent=function(){return 7*this.normalizedFontSize/25};a.jqplot.CanvasTextRenderer.prototype.measure=function(d,f){var e=0;var b=f.length;for(i=0;i<b;i++){var g=this.letter(f.charAt(i));if(g){e+=g.width*this.normalizedFontSize/25*this.fontStretch}}return e};a.jqplot.CanvasTextRenderer.prototype.draw=function(t,o){var s=0;var p=this.height*0.72;var q=0;var l=o.length;var k=this.normalizedFontSize/25;t.save();var h,f;if((-Math.PI/2<=this.angle&&this.angle<=0)||(Math.PI*3/2<=this.angle&&this.angle<=Math.PI*2)){h=0;f=-Math.sin(this.angle)*this.width}else{if((0<this.angle&&this.angle<=Math.PI/2)||(-Math.PI*2<=this.angle&&this.angle<=-Math.PI*3/2)){h=Math.sin(this.angle)*this.height;f=0}else{if((-Math.PI<this.angle&&this.angle<-Math.PI/2)||(Math.PI<=this.angle&&this.angle<=Math.PI*3/2)){h=-Math.cos(this.angle)*this.width;f=-Math.sin(this.angle)*this.width-Math.cos(this.angle)*this.height}else{if((-Math.PI*3/2<this.angle&&this.angle<Math.PI)||(Math.PI/2<this.angle&&this.angle<Math.PI)){h=Math.sin(this.angle)*this.height-Math.cos(this.angle)*this.width;f=-Math.cos(this.angle)*this.height}}}}t.strokeStyle=this.fillStyle;t.fillStyle=this.fillStyle;t.translate(h,f);t.rotate(this.angle);t.lineCap="round";var u=(this.normalizedFontSize>30)?2:2+(30-this.normalizedFontSize)/20;t.lineWidth=u*k*this.fontWeight2Float(this.fontWeight);for(var g=0;g<l;g++){var m=this.letter(o.charAt(g));if(!m){continue}t.beginPath();var e=1;var b=0;for(var d=0;d<m.points.length;d++){var r=m.points[d];if(r[0]==-1&&r[1]==-1){e=1;continue}if(e){t.moveTo(s+r[0]*k*this.fontStretch,p-r[1]*k);e=false}else{t.lineTo(s+r[0]*k*this.fontStretch,p-r[1]*k)}}t.stroke();s+=m.width*k*this.fontStretch}t.restore();return q};a.jqplot.CanvasTextRenderer.prototype.letters={" ":{width:16,points:[]},"!":{width:10,points:[[5,21],[5,7],[-1,-1],[5,2],[4,1],[5,0],[6,1],[5,2]]},'"':{width:16,points:[[4,21],[4,14],[-1,-1],[12,21],[12,14]]},"#":{width:21,points:[[11,25],[4,-7],[-1,-1],[17,25],[10,-7],[-1,-1],[4,12],[18,12],[-1,-1],[3,6],[17,6]]},"$":{width:20,points:[[8,25],[8,-4],[-1,-1],[12,25],[12,-4],[-1,-1],[17,18],[15,20],[12,21],[8,21],[5,20],[3,18],[3,16],[4,14],[5,13],[7,12],[13,10],[15,9],[16,8],[17,6],[17,3],[15,1],[12,0],[8,0],[5,1],[3,3]]},"%":{width:24,points:[[21,21],[3,0],[-1,-1],[8,21],[10,19],[10,17],[9,15],[7,14],[5,14],[3,16],[3,18],[4,20],[6,21],[8,21],[10,20],[13,19],[16,19],[19,20],[21,21],[-1,-1],[17,7],[15,6],[14,4],[14,2],[16,0],[18,0],[20,1],[21,3],[21,5],[19,7],[17,7]]},"&":{width:26,points:[[23,12],[23,13],[22,14],[21,14],[20,13],[19,11],[17,6],[15,3],[13,1],[11,0],[7,0],[5,1],[4,2],[3,4],[3,6],[4,8],[5,9],[12,13],[13,14],[14,16],[14,18],[13,20],[11,21],[9,20],[8,18],[8,16],[9,13],[11,10],[16,3],[18,1],[20,0],[22,0],[23,1],[23,2]]},"'":{width:10,points:[[5,19],[4,20],[5,21],[6,20],[6,18],[5,16],[4,15]]},"(":{width:14,points:[[11,25],[9,23],[7,20],[5,16],[4,11],[4,7],[5,2],[7,-2],[9,-5],[11,-7]]},")":{width:14,points:[[3,25],[5,23],[7,20],[9,16],[10,11],[10,7],[9,2],[7,-2],[5,-5],[3,-7]]},"*":{width:16,points:[[8,21],[8,9],[-1,-1],[3,18],[13,12],[-1,-1],[13,18],[3,12]]},"+":{width:26,points:[[13,18],[13,0],[-1,-1],[4,9],[22,9]]},",":{width:10,points:[[6,1],[5,0],[4,1],[5,2],[6,1],[6,-1],[5,-3],[4,-4]]},"-":{width:18,points:[[6,9],[12,9]]},".":{width:10,points:[[5,2],[4,1],[5,0],[6,1],[5,2]]},"/":{width:22,points:[[20,25],[2,-7]]},"0":{width:20,points:[[9,21],[6,20],[4,17],[3,12],[3,9],[4,4],[6,1],[9,0],[11,0],[14,1],[16,4],[17,9],[17,12],[16,17],[14,20],[11,21],[9,21]]},"1":{width:20,points:[[6,17],[8,18],[11,21],[11,0]]},"2":{width:20,points:[[4,16],[4,17],[5,19],[6,20],[8,21],[12,21],[14,20],[15,19],[16,17],[16,15],[15,13],[13,10],[3,0],[17,0]]},"3":{width:20,points:[[5,21],[16,21],[10,13],[13,13],[15,12],[16,11],[17,8],[17,6],[16,3],[14,1],[11,0],[8,0],[5,1],[4,2],[3,4]]},"4":{width:20,points:[[13,21],[3,7],[18,7],[-1,-1],[13,21],[13,0]]},"5":{width:20,points:[[15,21],[5,21],[4,12],[5,13],[8,14],[11,14],[14,13],[16,11],[17,8],[17,6],[16,3],[14,1],[11,0],[8,0],[5,1],[4,2],[3,4]]},"6":{width:20,points:[[16,18],[15,20],[12,21],[10,21],[7,20],[5,17],[4,12],[4,7],[5,3],[7,1],[10,0],[11,0],[14,1],[16,3],[17,6],[17,7],[16,10],[14,12],[11,13],[10,13],[7,12],[5,10],[4,7]]},"7":{width:20,points:[[17,21],[7,0],[-1,-1],[3,21],[17,21]]},"8":{width:20,points:[[8,21],[5,20],[4,18],[4,16],[5,14],[7,13],[11,12],[14,11],[16,9],[17,7],[17,4],[16,2],[15,1],[12,0],[8,0],[5,1],[4,2],[3,4],[3,7],[4,9],[6,11],[9,12],[13,13],[15,14],[16,16],[16,18],[15,20],[12,21],[8,21]]},"9":{width:20,points:[[16,14],[15,11],[13,9],[10,8],[9,8],[6,9],[4,11],[3,14],[3,15],[4,18],[6,20],[9,21],[10,21],[13,20],[15,18],[16,14],[16,9],[15,4],[13,1],[10,0],[8,0],[5,1],[4,3]]},":":{width:10,points:[[5,14],[4,13],[5,12],[6,13],[5,14],[-1,-1],[5,2],[4,1],[5,0],[6,1],[5,2]]},";":{width:10,points:[[5,14],[4,13],[5,12],[6,13],[5,14],[-1,-1],[6,1],[5,0],[4,1],[5,2],[6,1],[6,-1],[5,-3],[4,-4]]},"<":{width:24,points:[[20,18],[4,9],[20,0]]},"=":{width:26,points:[[4,12],[22,12],[-1,-1],[4,6],[22,6]]},">":{width:24,points:[[4,18],[20,9],[4,0]]},"?":{width:18,points:[[3,16],[3,17],[4,19],[5,20],[7,21],[11,21],[13,20],[14,19],[15,17],[15,15],[14,13],[13,12],[9,10],[9,7],[-1,-1],[9,2],[8,1],[9,0],[10,1],[9,2]]},"@":{width:27,points:[[18,13],[17,15],[15,16],[12,16],[10,15],[9,14],[8,11],[8,8],[9,6],[11,5],[14,5],[16,6],[17,8],[-1,-1],[12,16],[10,14],[9,11],[9,8],[10,6],[11,5],[-1,-1],[18,16],[17,8],[17,6],[19,5],[21,5],[23,7],[24,10],[24,12],[23,15],[22,17],[20,19],[18,20],[15,21],[12,21],[9,20],[7,19],[5,17],[4,15],[3,12],[3,9],[4,6],[5,4],[7,2],[9,1],[12,0],[15,0],[18,1],[20,2],[21,3],[-1,-1],[19,16],[18,8],[18,6],[19,5]]},A:{width:18,points:[[9,21],[1,0],[-1,-1],[9,21],[17,0],[-1,-1],[4,7],[14,7]]},B:{width:21,points:[[4,21],[4,0],[-1,-1],[4,21],[13,21],[16,20],[17,19],[18,17],[18,15],[17,13],[16,12],[13,11],[-1,-1],[4,11],[13,11],[16,10],[17,9],[18,7],[18,4],[17,2],[16,1],[13,0],[4,0]]},C:{width:21,points:[[18,16],[17,18],[15,20],[13,21],[9,21],[7,20],[5,18],[4,16],[3,13],[3,8],[4,5],[5,3],[7,1],[9,0],[13,0],[15,1],[17,3],[18,5]]},D:{width:21,points:[[4,21],[4,0],[-1,-1],[4,21],[11,21],[14,20],[16,18],[17,16],[18,13],[18,8],[17,5],[16,3],[14,1],[11,0],[4,0]]},E:{width:19,points:[[4,21],[4,0],[-1,-1],[4,21],[17,21],[-1,-1],[4,11],[12,11],[-1,-1],[4,0],[17,0]]},F:{width:18,points:[[4,21],[4,0],[-1,-1],[4,21],[17,21],[-1,-1],[4,11],[12,11]]},G:{width:21,points:[[18,16],[17,18],[15,20],[13,21],[9,21],[7,20],[5,18],[4,16],[3,13],[3,8],[4,5],[5,3],[7,1],[9,0],[13,0],[15,1],[17,3],[18,5],[18,8],[-1,-1],[13,8],[18,8]]},H:{width:22,points:[[4,21],[4,0],[-1,-1],[18,21],[18,0],[-1,-1],[4,11],[18,11]]},I:{width:8,points:[[4,21],[4,0]]},J:{width:16,points:[[12,21],[12,5],[11,2],[10,1],[8,0],[6,0],[4,1],[3,2],[2,5],[2,7]]},K:{width:21,points:[[4,21],[4,0],[-1,-1],[18,21],[4,7],[-1,-1],[9,12],[18,0]]},L:{width:17,points:[[4,21],[4,0],[-1,-1],[4,0],[16,0]]},M:{width:24,points:[[4,21],[4,0],[-1,-1],[4,21],[12,0],[-1,-1],[20,21],[12,0],[-1,-1],[20,21],[20,0]]},N:{width:22,points:[[4,21],[4,0],[-1,-1],[4,21],[18,0],[-1,-1],[18,21],[18,0]]},O:{width:22,points:[[9,21],[7,20],[5,18],[4,16],[3,13],[3,8],[4,5],[5,3],[7,1],[9,0],[13,0],[15,1],[17,3],[18,5],[19,8],[19,13],[18,16],[17,18],[15,20],[13,21],[9,21]]},P:{width:21,points:[[4,21],[4,0],[-1,-1],[4,21],[13,21],[16,20],[17,19],[18,17],[18,14],[17,12],[16,11],[13,10],[4,10]]},Q:{width:22,points:[[9,21],[7,20],[5,18],[4,16],[3,13],[3,8],[4,5],[5,3],[7,1],[9,0],[13,0],[15,1],[17,3],[18,5],[19,8],[19,13],[18,16],[17,18],[15,20],[13,21],[9,21],[-1,-1],[12,4],[18,-2]]},R:{width:21,points:[[4,21],[4,0],[-1,-1],[4,21],[13,21],[16,20],[17,19],[18,17],[18,15],[17,13],[16,12],[13,11],[4,11],[-1,-1],[11,11],[18,0]]},S:{width:20,points:[[17,18],[15,20],[12,21],[8,21],[5,20],[3,18],[3,16],[4,14],[5,13],[7,12],[13,10],[15,9],[16,8],[17,6],[17,3],[15,1],[12,0],[8,0],[5,1],[3,3]]},T:{width:16,points:[[8,21],[8,0],[-1,-1],[1,21],[15,21]]},U:{width:22,points:[[4,21],[4,6],[5,3],[7,1],[10,0],[12,0],[15,1],[17,3],[18,6],[18,21]]},V:{width:18,points:[[1,21],[9,0],[-1,-1],[17,21],[9,0]]},W:{width:24,points:[[2,21],[7,0],[-1,-1],[12,21],[7,0],[-1,-1],[12,21],[17,0],[-1,-1],[22,21],[17,0]]},X:{width:20,points:[[3,21],[17,0],[-1,-1],[17,21],[3,0]]},Y:{width:18,points:[[1,21],[9,11],[9,0],[-1,-1],[17,21],[9,11]]},Z:{width:20,points:[[17,21],[3,0],[-1,-1],[3,21],[17,21],[-1,-1],[3,0],[17,0]]},"[":{width:14,points:[[4,25],[4,-7],[-1,-1],[5,25],[5,-7],[-1,-1],[4,25],[11,25],[-1,-1],[4,-7],[11,-7]]},"\\":{width:14,points:[[0,21],[14,-3]]},"]":{width:14,points:[[9,25],[9,-7],[-1,-1],[10,25],[10,-7],[-1,-1],[3,25],[10,25],[-1,-1],[3,-7],[10,-7]]},"^":{width:16,points:[[6,15],[8,18],[10,15],[-1,-1],[3,12],[8,17],[13,12],[-1,-1],[8,17],[8,0]]},_:{width:16,points:[[0,-2],[16,-2]]},"`":{width:10,points:[[6,21],[5,20],[4,18],[4,16],[5,15],[6,16],[5,17]]},a:{width:19,points:[[15,14],[15,0],[-1,-1],[15,11],[13,13],[11,14],[8,14],[6,13],[4,11],[3,8],[3,6],[4,3],[6,1],[8,0],[11,0],[13,1],[15,3]]},b:{width:19,points:[[4,21],[4,0],[-1,-1],[4,11],[6,13],[8,14],[11,14],[13,13],[15,11],[16,8],[16,6],[15,3],[13,1],[11,0],[8,0],[6,1],[4,3]]},c:{width:18,points:[[15,11],[13,13],[11,14],[8,14],[6,13],[4,11],[3,8],[3,6],[4,3],[6,1],[8,0],[11,0],[13,1],[15,3]]},d:{width:19,points:[[15,21],[15,0],[-1,-1],[15,11],[13,13],[11,14],[8,14],[6,13],[4,11],[3,8],[3,6],[4,3],[6,1],[8,0],[11,0],[13,1],[15,3]]},e:{width:18,points:[[3,8],[15,8],[15,10],[14,12],[13,13],[11,14],[8,14],[6,13],[4,11],[3,8],[3,6],[4,3],[6,1],[8,0],[11,0],[13,1],[15,3]]},f:{width:12,points:[[10,21],[8,21],[6,20],[5,17],[5,0],[-1,-1],[2,14],[9,14]]},g:{width:19,points:[[15,14],[15,-2],[14,-5],[13,-6],[11,-7],[8,-7],[6,-6],[-1,-1],[15,11],[13,13],[11,14],[8,14],[6,13],[4,11],[3,8],[3,6],[4,3],[6,1],[8,0],[11,0],[13,1],[15,3]]},h:{width:19,points:[[4,21],[4,0],[-1,-1],[4,10],[7,13],[9,14],[12,14],[14,13],[15,10],[15,0]]},i:{width:8,points:[[3,21],[4,20],[5,21],[4,22],[3,21],[-1,-1],[4,14],[4,0]]},j:{width:10,points:[[5,21],[6,20],[7,21],[6,22],[5,21],[-1,-1],[6,14],[6,-3],[5,-6],[3,-7],[1,-7]]},k:{width:17,points:[[4,21],[4,0],[-1,-1],[14,14],[4,4],[-1,-1],[8,8],[15,0]]},l:{width:8,points:[[4,21],[4,0]]},m:{width:30,points:[[4,14],[4,0],[-1,-1],[4,10],[7,13],[9,14],[12,14],[14,13],[15,10],[15,0],[-1,-1],[15,10],[18,13],[20,14],[23,14],[25,13],[26,10],[26,0]]},n:{width:19,points:[[4,14],[4,0],[-1,-1],[4,10],[7,13],[9,14],[12,14],[14,13],[15,10],[15,0]]},o:{width:19,points:[[8,14],[6,13],[4,11],[3,8],[3,6],[4,3],[6,1],[8,0],[11,0],[13,1],[15,3],[16,6],[16,8],[15,11],[13,13],[11,14],[8,14]]},p:{width:19,points:[[4,14],[4,-7],[-1,-1],[4,11],[6,13],[8,14],[11,14],[13,13],[15,11],[16,8],[16,6],[15,3],[13,1],[11,0],[8,0],[6,1],[4,3]]},q:{width:19,points:[[15,14],[15,-7],[-1,-1],[15,11],[13,13],[11,14],[8,14],[6,13],[4,11],[3,8],[3,6],[4,3],[6,1],[8,0],[11,0],[13,1],[15,3]]},r:{width:13,points:[[4,14],[4,0],[-1,-1],[4,8],[5,11],[7,13],[9,14],[12,14]]},s:{width:17,points:[[14,11],[13,13],[10,14],[7,14],[4,13],[3,11],[4,9],[6,8],[11,7],[13,6],[14,4],[14,3],[13,1],[10,0],[7,0],[4,1],[3,3]]},t:{width:12,points:[[5,21],[5,4],[6,1],[8,0],[10,0],[-1,-1],[2,14],[9,14]]},u:{width:19,points:[[4,14],[4,4],[5,1],[7,0],[10,0],[12,1],[15,4],[-1,-1],[15,14],[15,0]]},v:{width:16,points:[[2,14],[8,0],[-1,-1],[14,14],[8,0]]},w:{width:22,points:[[3,14],[7,0],[-1,-1],[11,14],[7,0],[-1,-1],[11,14],[15,0],[-1,-1],[19,14],[15,0]]},x:{width:17,points:[[3,14],[14,0],[-1,-1],[14,14],[3,0]]},y:{width:16,points:[[2,14],[8,0],[-1,-1],[14,14],[8,0],[6,-4],[4,-6],[2,-7],[1,-7]]},z:{width:17,points:[[14,14],[3,0],[-1,-1],[3,14],[14,14],[-1,-1],[3,0],[14,0]]},"{":{width:14,points:[[9,25],[7,24],[6,23],[5,21],[5,19],[6,17],[7,16],[8,14],[8,12],[6,10],[-1,-1],[7,24],[6,22],[6,20],[7,18],[8,17],[9,15],[9,13],[8,11],[4,9],[8,7],[9,5],[9,3],[8,1],[7,0],[6,-2],[6,-4],[7,-6],[-1,-1],[6,8],[8,6],[8,4],[7,2],[6,1],[5,-1],[5,-3],[6,-5],[7,-6],[9,-7]]},"|":{width:8,points:[[4,25],[4,-7]]},"}":{width:14,points:[[5,25],[7,24],[8,23],[9,21],[9,19],[8,17],[7,16],[6,14],[6,12],[8,10],[-1,-1],[7,24],[8,22],[8,20],[7,18],[6,17],[5,15],[5,13],[6,11],[10,9],[6,7],[5,5],[5,3],[6,1],[7,0],[8,-2],[8,-4],[7,-6],[-1,-1],[8,8],[6,6],[6,4],[7,2],[8,1],[9,-1],[9,-3],[8,-5],[7,-6],[5,-7]]},"~":{width:24,points:[[3,6],[3,8],[4,11],[6,12],[8,12],[10,11],[14,8],[16,7],[18,7],[20,8],[21,10],[-1,-1],[3,8],[4,10],[6,11],[8,11],[10,10],[14,7],[16,6],[18,6],[20,7],[21,10],[21,12]]}};a.jqplot.CanvasFontRenderer=function(b){b=b||{};if(!b.pt2px){b.pt2px=1.5}a.jqplot.CanvasTextRenderer.call(this,b)};a.jqplot.CanvasFontRenderer.prototype=new a.jqplot.CanvasTextRenderer({});a.jqplot.CanvasFontRenderer.prototype.constructor=a.jqplot.CanvasFontRenderer;a.jqplot.CanvasFontRenderer.prototype.measure=function(c,e){var d=this.fontSize+" "+this.fontFamily;c.save();c.font=d;var b=c.measureText(e).width;c.restore();return b};a.jqplot.CanvasFontRenderer.prototype.draw=function(e,g){var c=0;var h=this.height*0.72;e.save();var d,b;if((-Math.PI/2<=this.angle&&this.angle<=0)||(Math.PI*3/2<=this.angle&&this.angle<=Math.PI*2)){d=0;b=-Math.sin(this.angle)*this.width}else{if((0<this.angle&&this.angle<=Math.PI/2)||(-Math.PI*2<=this.angle&&this.angle<=-Math.PI*3/2)){d=Math.sin(this.angle)*this.height;b=0}else{if((-Math.PI<this.angle&&this.angle<-Math.PI/2)||(Math.PI<=this.angle&&this.angle<=Math.PI*3/2)){d=-Math.cos(this.angle)*this.width;b=-Math.sin(this.angle)*this.width-Math.cos(this.angle)*this.height}else{if((-Math.PI*3/2<this.angle&&this.angle<Math.PI)||(Math.PI/2<this.angle&&this.angle<Math.PI)){d=Math.sin(this.angle)*this.height-Math.cos(this.angle)*this.width;b=-Math.cos(this.angle)*this.height}}}}e.strokeStyle=this.fillStyle;e.fillStyle=this.fillStyle;var f=this.fontSize+" "+this.fontFamily;e.font=f;e.translate(d,b);e.rotate(this.angle);e.fillText(g,c,h);e.restore()}})(jQuery);
/**
 * Copyright (c) 2009 - 2010 Chris Leonello
 * jqPlot is currently available for use in all personal or commercial projects 
 * under both the MIT (http://www.opensource.org/licenses/mit-license.php) and GPL 
 * version 2.0 (http://www.gnu.org/licenses/gpl-2.0.html) licenses. This means that you can 
 * choose the license that best suits your project and use it accordingly. 
 *
 * Although not required, the author would appreciate an email letting him 
 * know of any substantial use of jqPlot.  You can reach the author at: 
 * chris dot leonello at gmail dot com or see http://www.jqplot.com/info.php .
 *
 * If you are feeling kind and generous, consider supporting the project by
 * making a donation at: http://www.jqplot.com/donate.php .
 *
 * jqPlot includes date instance methods and printf/sprintf functions by other authors:
 *
 * Date instance methods contained in jqplot.dateMethods.js:
 *
 *     author Ken Snyder (ken d snyder at gmail dot com)
 *     date 2008-09-10
 *     version 2.0.2 (http://kendsnyder.com/sandbox/date/)     
 *     license Creative Commons Attribution License 3.0 (http://creativecommons.org/licenses/by/3.0/)
 *
 * JavaScript printf/sprintf functions contained in jqplot.sprintf.js:
 *
 *     version 2007.04.27
 *     author Ash Searle
 *     http://hexmen.com/blog/2007/03/printf-sprintf/
 *     http://hexmen.com/js/sprintf.js
 *     The author (Ash Searle) has placed this code in the public domain:
 *     "This code is unrestricted: you are free to use it however you like."
 * 
 */
(function(a){a.jqplot.CanvasAxisTickRenderer=function(b){this.mark="outside";this.showMark=true;this.showGridline=true;this.isMinorTick=false;this.angle=0;this.markSize=4;this.show=true;this.showLabel=true;this.labelPosition="auto";this.label="";this.value=null;this._styles={};this.formatter=a.jqplot.DefaultTickFormatter;this.formatString="";this.prefix="";this.fontFamily='"Trebuchet MS", Arial, Helvetica, sans-serif';this.fontSize="10pt";this.fontWeight="normal";this.fontStretch=1;this.textColor="#666666";this.enableFontSupport=true;this.pt2px=null;this._elem;this._ctx;this._plotWidth;this._plotHeight;this._plotDimensions={height:null,width:null};a.extend(true,this,b);var c={fontSize:this.fontSize,fontWeight:this.fontWeight,fontStretch:this.fontStretch,fillStyle:this.textColor,angle:this.getAngleRad(),fontFamily:this.fontFamily};if(this.pt2px){c.pt2px=this.pt2px}if(this.enableFontSupport){function d(){return !!(document.createElement("canvas").getContext&&typeof document.createElement("canvas").getContext("2d").fillText=="function")}if(d()){this._textRenderer=new a.jqplot.CanvasFontRenderer(c)}else{this._textRenderer=new a.jqplot.CanvasTextRenderer(c)}}else{this._textRenderer=new a.jqplot.CanvasTextRenderer(c)}};a.jqplot.CanvasAxisTickRenderer.prototype.init=function(b){a.extend(true,this,b);this._textRenderer.init({fontSize:this.fontSize,fontWeight:this.fontWeight,fontStretch:this.fontStretch,fillStyle:this.textColor,angle:this.getAngleRad(),fontFamily:this.fontFamily})};a.jqplot.CanvasAxisTickRenderer.prototype.getWidth=function(d){if(this._elem){return this._elem.outerWidth(true)}else{var f=this._textRenderer;var c=f.getWidth(d);var e=f.getHeight(d);var b=Math.abs(Math.sin(f.angle)*e)+Math.abs(Math.cos(f.angle)*c);return b}};a.jqplot.CanvasAxisTickRenderer.prototype.getHeight=function(d){if(this._elem){return this._elem.outerHeight(true)}else{var f=this._textRenderer;var c=f.getWidth(d);var e=f.getHeight(d);var b=Math.abs(Math.cos(f.angle)*e)+Math.abs(Math.sin(f.angle)*c);return b}};a.jqplot.CanvasAxisTickRenderer.prototype.getAngleRad=function(){var b=this.angle*Math.PI/180;return b};a.jqplot.CanvasAxisTickRenderer.prototype.setTick=function(b,d,c){this.value=b;if(c){this.isMinorTick=true}return this};a.jqplot.CanvasAxisTickRenderer.prototype.draw=function(c){if(!this.label){this.label=this.formatter(this.formatString,this.value)}if(this.prefix&&!this.formatString){this.label=this.prefix+this.label}var e=document.createElement("canvas");this._textRenderer.setText(this.label,c);var b=this.getWidth(c);var d=this.getHeight(c);e.width=b;e.height=d;e.style.width=b;e.style.height=d;e.style.textAlign="left";e.style.position="absolute";this._domelem=e;this._elem=a(e);this._elem.css(this._styles);this._elem.addClass("jqplot-"+this.axis+"-tick");return this._elem};a.jqplot.CanvasAxisTickRenderer.prototype.pack=function(){if(a.browser.msie){window.G_vmlCanvasManager.init_(document);this._domelem=window.G_vmlCanvasManager.initElement(this._domelem)}var b=this._elem.get(0).getContext("2d");this._textRenderer.draw(b,this.label)}})(jQuery);
/**
 * Copyright (c) 2009 - 2010 Chris Leonello
 * jqPlot is currently available for use in all personal or commercial projects 
 * under both the MIT (http://www.opensource.org/licenses/mit-license.php) and GPL 
 * version 2.0 (http://www.gnu.org/licenses/gpl-2.0.html) licenses. This means that you can 
 * choose the license that best suits your project and use it accordingly. 
 *
 * Although not required, the author would appreciate an email letting him 
 * know of any substantial use of jqPlot.  You can reach the author at: 
 * chris dot leonello at gmail dot com or see http://www.jqplot.com/info.php .
 *
 * If you are feeling kind and generous, consider supporting the project by
 * making a donation at: http://www.jqplot.com/donate.php .
 *
 * jqPlot includes date instance methods and printf/sprintf functions by other authors:
 *
 * Date instance methods contained in jqplot.dateMethods.js:
 *
 *     author Ken Snyder (ken d snyder at gmail dot com)
 *     date 2008-09-10
 *     version 2.0.2 (http://kendsnyder.com/sandbox/date/)     
 *     license Creative Commons Attribution License 3.0 (http://creativecommons.org/licenses/by/3.0/)
 *
 * JavaScript printf/sprintf functions contained in jqplot.sprintf.js:
 *
 *     version 2007.04.27
 *     author Ash Searle
 *     http://hexmen.com/blog/2007/03/printf-sprintf/
 *     http://hexmen.com/js/sprintf.js
 *     The author (Ash Searle) has placed this code in the public domain:
 *     "This code is unrestricted: you are free to use it however you like."
 * 
 */
(function(b){b.jqplot.eventListenerHooks.push(["jqplotMouseMove",c]);b.jqplot.Highlighter=function(e){this.show=b.jqplot.config.enablePlugins;this.markerRenderer=new b.jqplot.MarkerRenderer({shadow:false});this.showMarker=true;this.lineWidthAdjust=2.5;this.sizeAdjust=5;this.showTooltip=true;this.tooltipLocation="nw";this.fadeTooltip=true;this.tooltipFadeSpeed="fast";this.tooltipOffset=2;this.tooltipAxes="both";this.tooltipSeparator=", ";this.useAxesFormatters=true;this.tooltipFormatString="%.5P";this.formatString=null;this.yvalues=1;this.bringSeriesToFront=false;this._tooltipElem;this.isHighlighting=false;b.extend(true,this,e)};b.jqplot.Highlighter.init=function(h,g,f){var e=f||{};this.plugins.highlighter=new b.jqplot.Highlighter(e.highlighter)};b.jqplot.Highlighter.parseOptions=function(f,e){this.showHighlight=true};b.jqplot.Highlighter.postPlotDraw=function(){this.plugins.highlighter.highlightCanvas=new b.jqplot.GenericCanvas();this.eventCanvas._elem.before(this.plugins.highlighter.highlightCanvas.createElement(this._gridPadding,"jqplot-highlight-canvas",this._plotDimensions));var f=this.plugins.highlighter.highlightCanvas.setContext();var e=this.plugins.highlighter;e._tooltipElem=b('<div class="jqplot-highlighter-tooltip" style="position:absolute;display:none"></div>');this.eventCanvas._elem.before(e._tooltipElem)};b.jqplot.preInitHooks.push(b.jqplot.Highlighter.init);b.jqplot.preParseSeriesOptionsHooks.push(b.jqplot.Highlighter.parseOptions);b.jqplot.postDrawHooks.push(b.jqplot.Highlighter.postPlotDraw);function a(j,l){var g=j.plugins.highlighter;var m=j.series[l.seriesIndex];var e=m.markerRenderer;var f=g.markerRenderer;f.style=e.style;f.lineWidth=e.lineWidth+g.lineWidthAdjust;f.size=e.size+g.sizeAdjust;var i=b.jqplot.getColorComponents(e.color);var k=[i[0],i[1],i[2]];var h=(i[3]>=0.6)?i[3]*0.6:i[3]*(2-i[3]);f.color="rgba("+k[0]+","+k[1]+","+k[2]+","+h+")";f.init();f.draw(m.gridData[l.pointIndex][0],m.gridData[l.pointIndex][1],g.highlightCanvas._ctx)}function d(s,m,j){var g=s.plugins.highlighter;var v=g._tooltipElem;if(g.useAxesFormatters){var q=m._xaxis._ticks[0].formatter;var e=m._yaxis._ticks[0].formatter;var w=m._xaxis._ticks[0].formatString;var n=m._yaxis._ticks[0].formatString;var r;var o=q(w,j.data[0]);var h=[];for(var t=1;t<g.yvalues+1;t++){h.push(e(n,j.data[t]))}if(g.formatString){switch(g.tooltipAxes){case"both":case"xy":h.unshift(o);h.unshift(g.formatString);r=b.jqplot.sprintf.apply(b.jqplot.sprintf,h);break;case"yx":h.push(o);h.unshift(g.formatString);r=b.jqplot.sprintf.apply(b.jqplot.sprintf,h);break;case"x":r=b.jqplot.sprintf.apply(b.jqplot.sprintf,[g.formatString,o]);break;case"y":h.unshift(g.formatString);r=b.jqplot.sprintf.apply(b.jqplot.sprintf,h);break;default:h.unshift(o);h.unshift(g.formatString);r=b.jqplot.sprintf.apply(b.jqplot.sprintf,h);break}}else{switch(g.tooltipAxes){case"both":case"xy":r=o;for(var t=0;t<h.length;t++){r+=g.tooltipSeparator+h[t]}break;case"yx":r="";for(var t=0;t<h.length;t++){r+=h[t]+g.tooltipSeparator}r+=o;break;case"x":r=o;break;case"y":r="";for(var t=0;t<h.length;t++){r+=h[t]+g.tooltipSeparator}break;default:r=o;for(var t=0;t<h.length;t++){r+=g.tooltipSeparator+h[t]}break}}}else{var r;if(g.tooltipAxes=="both"||g.tooltipAxes=="xy"){r=b.jqplot.sprintf(g.tooltipFormatString,j.data[0])+g.tooltipSeparator+b.jqplot.sprintf(g.tooltipFormatString,j.data[1])}else{if(g.tooltipAxes=="yx"){r=b.jqplot.sprintf(g.tooltipFormatString,j.data[1])+g.tooltipSeparator+b.jqplot.sprintf(g.tooltipFormatString,j.data[0])}else{if(g.tooltipAxes=="x"){r=b.jqplot.sprintf(g.tooltipFormatString,j.data[0])}else{if(g.tooltipAxes=="y"){r=b.jqplot.sprintf(g.tooltipFormatString,j.data[1])}}}}}v.html(r);var u={x:j.gridData[0],y:j.gridData[1]};var p=0;var f=0.707;if(m.markerRenderer.show==true){p=(m.markerRenderer.size+g.sizeAdjust)/2}switch(g.tooltipLocation){case"nw":var l=u.x+s._gridPadding.left-v.outerWidth(true)-g.tooltipOffset-f*p;var k=u.y+s._gridPadding.top-g.tooltipOffset-v.outerHeight(true)-f*p;break;case"n":var l=u.x+s._gridPadding.left-v.outerWidth(true)/2;var k=u.y+s._gridPadding.top-g.tooltipOffset-v.outerHeight(true)-p;break;case"ne":var l=u.x+s._gridPadding.left+g.tooltipOffset+f*p;var k=u.y+s._gridPadding.top-g.tooltipOffset-v.outerHeight(true)-f*p;break;case"e":var l=u.x+s._gridPadding.left+g.tooltipOffset+p;var k=u.y+s._gridPadding.top-v.outerHeight(true)/2;break;case"se":var l=u.x+s._gridPadding.left+g.tooltipOffset+f*p;var k=u.y+s._gridPadding.top+g.tooltipOffset+f*p;break;case"s":var l=u.x+s._gridPadding.left-v.outerWidth(true)/2;var k=u.y+s._gridPadding.top+g.tooltipOffset+p;break;case"sw":var l=u.x+s._gridPadding.left-v.outerWidth(true)-g.tooltipOffset-f*p;var k=u.y+s._gridPadding.top+g.tooltipOffset+f*p;break;case"w":var l=u.x+s._gridPadding.left-v.outerWidth(true)-g.tooltipOffset-p;var k=u.y+s._gridPadding.top-v.outerHeight(true)/2;break;default:var l=u.x+s._gridPadding.left-v.outerWidth(true)-g.tooltipOffset-f*p;var k=u.y+s._gridPadding.top-g.tooltipOffset-v.outerHeight(true)-f*p;break}v.css("left",l);v.css("top",k);if(g.fadeTooltip){v.stop(true,true).fadeIn(g.tooltipFadeSpeed)}else{v.show()}}function c(h,g,k,j,i){var e=i.plugins.highlighter;var l=i.plugins.cursor;if(e.show){if(j==null&&e.isHighlighting){var f=e.highlightCanvas._ctx;f.clearRect(0,0,f.canvas.width,f.canvas.height);if(e.fadeTooltip){e._tooltipElem.fadeOut(e.tooltipFadeSpeed)}else{e._tooltipElem.hide()}if(e.bringSeriesToFront){i.restorePreviousSeriesOrder()}e.isHighlighting=false}if(j!=null&&i.series[j.seriesIndex].showHighlight&&!e.isHighlighting){e.isHighlighting=true;if(e.showMarker){a(i,j)}if(e.showTooltip&&(!l||!l._zoom.started)){d(i,i.series[j.seriesIndex],j)}if(e.bringSeriesToFront){i.moveSeriesToFront(j.seriesIndex)}}}}})(jQuery);
/**
 * Copyright (c) 2009 - 2010 Chris Leonello
 * jqPlot is currently available for use in all personal or commercial projects 
 * under both the MIT (http://www.opensource.org/licenses/mit-license.php) and GPL 
 * version 2.0 (http://www.gnu.org/licenses/gpl-2.0.html) licenses. This means that you can 
 * choose the license that best suits your project and use it accordingly. 
 *
 * Although not required, the author would appreciate an email letting him 
 * know of any substantial use of jqPlot.  You can reach the author at: 
 * chris dot leonello at gmail dot com or see http://www.jqplot.com/info.php .
 *
 * If you are feeling kind and generous, consider supporting the project by
 * making a donation at: http://www.jqplot.com/donate.php .
 *
 * jqPlot includes date instance methods and printf/sprintf functions by other authors:
 *
 * Date instance methods contained in jqplot.dateMethods.js:
 *
 *     author Ken Snyder (ken d snyder at gmail dot com)
 *     date 2008-09-10
 *     version 2.0.2 (http://kendsnyder.com/sandbox/date/)     
 *     license Creative Commons Attribution License 3.0 (http://creativecommons.org/licenses/by/3.0/)
 *
 * JavaScript printf/sprintf functions contained in jqplot.sprintf.js:
 *
 *     version 2007.04.27
 *     author Ash Searle
 *     http://hexmen.com/blog/2007/03/printf-sprintf/
 *     http://hexmen.com/js/sprintf.js
 *     The author (Ash Searle) has placed this code in the public domain:
 *     "This code is unrestricted: you are free to use it however you like."
 * 
 */
(function(j){j.jqplot.Cursor=function(r){this.style="crosshair";this.previousCursor="auto";this.show=j.jqplot.config.enablePlugins;this.showTooltip=true;this.followMouse=false;this.tooltipLocation="se";this.tooltipOffset=6;this.showTooltipGridPosition=false;this.showTooltipUnitPosition=true;this.showTooltipDataPosition=false;this.tooltipFormatString="%.4P, %.4P";this.useAxesFormatters=true;this.tooltipAxisGroups=[];this.zoom=false;this.zoomProxy=false;this.zoomTarget=false;this.clickReset=false;this.dblClickReset=true;this.showVerticalLine=false;this.showHorizontalLine=false;this.constrainZoomTo="none";this.shapeRenderer=new j.jqplot.ShapeRenderer();this._zoom={start:[],end:[],started:false,zooming:false,isZoomed:false,axes:{start:{},end:{}},gridpos:{},datapos:{}};this._tooltipElem;this.zoomCanvas;this.cursorCanvas;this.intersectionThreshold=2;this.showCursorLegend=false;this.cursorLegendFormatString=j.jqplot.Cursor.cursorLegendFormatString;this._oldHandlers={onselectstart:null,ondrag:null,onmousedown:null};this.constrainOutsideZoom=true;this.showTooltipOutsideZoom=false;this.onGrid=false;j.extend(true,this,r)};j.jqplot.Cursor.cursorLegendFormatString="%s x:%s, y:%s";j.jqplot.Cursor.init=function(v,u,t){var r=t||{};this.plugins.cursor=new j.jqplot.Cursor(r.cursor);var w=this.plugins.cursor;if(w.show){j.jqplot.eventListenerHooks.push(["jqplotMouseEnter",b]);j.jqplot.eventListenerHooks.push(["jqplotMouseLeave",f]);j.jqplot.eventListenerHooks.push(["jqplotMouseMove",i]);if(w.showCursorLegend){t.legend=t.legend||{};t.legend.renderer=j.jqplot.CursorLegendRenderer;t.legend.formatString=this.plugins.cursor.cursorLegendFormatString;t.legend.show=true}if(w.zoom){j.jqplot.eventListenerHooks.push(["jqplotMouseDown",a]);if(w.clickReset){j.jqplot.eventListenerHooks.push(["jqplotClick",k])}if(w.dblClickReset){j.jqplot.eventListenerHooks.push(["jqplotDblClick",c])}}this.resetZoom=function(){var z=this.axes;if(!w.zoomProxy){for(var y in z){z[y].reset()}this.redraw()}else{var x=this.plugins.cursor.zoomCanvas._ctx;x.clearRect(0,0,x.canvas.width,x.canvas.height)}this.plugins.cursor._zoom.isZoomed=false;this.target.trigger("jqplotResetZoom",[this,this.plugins.cursor])};if(w.showTooltipDataPosition){w.showTooltipUnitPosition=false;w.showTooltipGridPosition=false;if(r.cursor.tooltipFormatString==undefined){w.tooltipFormatString=j.jqplot.Cursor.cursorLegendFormatString}}}};j.jqplot.Cursor.postDraw=function(){var y=this.plugins.cursor;y.zoomCanvas=new j.jqplot.GenericCanvas();this.eventCanvas._elem.before(y.zoomCanvas.createElement(this._gridPadding,"jqplot-zoom-canvas",this._plotDimensions));var x=y.zoomCanvas.setContext();y._tooltipElem=j('<div class="jqplot-cursor-tooltip" style="position:absolute;display:none"></div>');y.zoomCanvas._elem.before(y._tooltipElem);if(y.showVerticalLine||y.showHorizontalLine){y.cursorCanvas=new j.jqplot.GenericCanvas();this.eventCanvas._elem.before(y.cursorCanvas.createElement(this._gridPadding,"jqplot-cursor-canvas",this._plotDimensions));var x=y.cursorCanvas.setContext()}if(y.showTooltipUnitPosition){if(y.tooltipAxisGroups.length===0){var u=this.series;var v;var r=[];for(var t=0;t<u.length;t++){v=u[t];var w=v.xaxis+","+v.yaxis;if(j.inArray(w,r)==-1){r.push(w)}}for(var t=0;t<r.length;t++){y.tooltipAxisGroups.push(r[t].split(","))}}}};j.jqplot.Cursor.zoomProxy=function(x,t){var r=x.plugins.cursor;var w=t.plugins.cursor;r.zoomTarget=true;r.zoom=true;r.style="auto";r.dblClickReset=false;w.zoom=true;w.zoomProxy=true;t.target.bind("jqplotZoom",v);t.target.bind("jqplotResetZoom",u);function v(z,y,B,A,C){r.doZoom(y,B,x,C)}function u(y,z,A){x.resetZoom()}};j.jqplot.Cursor.prototype.resetZoom=function(w,x){var v=w.axes;var u=x._zoom.axes;if(!w.plugins.cursor.zoomProxy&&x._zoom.isZoomed){for(var t in v){v[t]._ticks=[];v[t].min=u[t].min;v[t].max=u[t].max;v[t].numberTicks=u[t].numberTicks;v[t].tickInterval=u[t].tickInterval;v[t].daTickInterval=u[t].daTickInterval}w.redraw();x._zoom.isZoomed=false}else{var r=x.zoomCanvas._ctx;r.clearRect(0,0,r.canvas.width,r.canvas.height)}w.target.trigger("jqplotResetZoom",[w,x])};j.jqplot.Cursor.resetZoom=function(r){r.resetZoom()};j.jqplot.Cursor.prototype.doZoom=function(y,v,z,D){var B=D;var A=z.axes;var t=B._zoom.axes;var u=t.start;var w=t.end;var x,C;var E=z.plugins.cursor.zoomCanvas._ctx;if((B.constrainZoomTo=="none"&&Math.abs(y.x-B._zoom.start[0])>6&&Math.abs(y.y-B._zoom.start[1])>6)||(B.constrainZoomTo=="x"&&Math.abs(y.x-B._zoom.start[0])>6)||(B.constrainZoomTo=="y"&&Math.abs(y.y-B._zoom.start[1])>6)){if(!z.plugins.cursor.zoomProxy){for(var r in v){if(B._zoom.axes[r]==undefined){B._zoom.axes[r]={};B._zoom.axes[r].numberTicks=A[r].numberTicks;B._zoom.axes[r].tickInterval=A[r].tickInterval;B._zoom.axes[r].daTickInterval=A[r].daTickInterval;B._zoom.axes[r].min=A[r].min;B._zoom.axes[r].max=A[r].max}if((B.constrainZoomTo=="none")||(B.constrainZoomTo=="x"&&r.charAt(0)=="x")||(B.constrainZoomTo=="y"&&r.charAt(0)=="y")){dp=v[r];if(dp!=null){if(dp>u[r]){A[r].min=u[r];A[r].max=dp}else{span=u[r]-dp;A[r].max=u[r];A[r].min=dp}A[r].tickInterval=null;A[r].daTickInterval=null;A[r]._ticks=[]}}}E.clearRect(0,0,E.canvas.width,E.canvas.height);z.redraw();B._zoom.isZoomed=true}z.target.trigger("jqplotZoom",[y,v,z,D])}};j.jqplot.preInitHooks.push(j.jqplot.Cursor.init);j.jqplot.postDrawHooks.push(j.jqplot.Cursor.postDraw);function e(F,t,C){var H=C.plugins.cursor;var x="";var L=false;if(H.showTooltipGridPosition){x=F.x+", "+F.y;L=true}if(H.showTooltipUnitPosition){var E;for(var D=0;D<H.tooltipAxisGroups.length;D++){E=H.tooltipAxisGroups[D];if(L){x+="<br />"}if(H.useAxesFormatters){var B=C.axes[E[0]]._ticks[0].formatter;var r=C.axes[E[1]]._ticks[0].formatter;var I=C.axes[E[0]]._ticks[0].formatString;var w=C.axes[E[1]]._ticks[0].formatString;x+=B(I,t[E[0]])+", "+r(w,t[E[1]])}else{x+=j.jqplot.sprintf(H.tooltipFormatString,t[E[0]],t[E[1]])}L=true}}if(H.showTooltipDataPosition){var v=C.series;var K=d(C,F.x,F.y);var L=false;for(var D=0;D<v.length;D++){if(v[D].show){var z=v[D].index;var u=v[D].label.toString();var G=j.inArray(z,K.indices);var A=undefined;var y=undefined;if(G!=-1){var J=K.data[G].data;if(H.useAxesFormatters){var B=v[D]._xaxis._ticks[0].formatter;var r=v[D]._yaxis._ticks[0].formatter;var I=v[D]._xaxis._ticks[0].formatString;var w=v[D]._yaxis._ticks[0].formatString;A=B(I,J[0]);y=r(w,J[1])}else{A=J[0];y=J[1]}if(L){x+="<br />"}x+=j.jqplot.sprintf(H.tooltipFormatString,u,A,y);L=true}}}}H._tooltipElem.html(x)}function g(E,C){var G=C.plugins.cursor;var B=G.cursorCanvas._ctx;B.clearRect(0,0,B.canvas.width,B.canvas.height);if(G.showVerticalLine){G.shapeRenderer.draw(B,[[E.x,0],[E.x,B.canvas.height]])}if(G.showHorizontalLine){G.shapeRenderer.draw(B,[[0,E.y],[B.canvas.width,E.y]])}var I=d(C,E.x,E.y);if(G.showCursorLegend){var t=j(C.targetId+" td.jqplot-cursor-legend-label");for(var D=0;D<t.length;D++){var x=j(t[D]).data("seriesIndex");var v=C.series[x];var u=v.label.toString();var F=j.inArray(x,I.indices);var z=undefined;var y=undefined;if(F!=-1){var J=I.data[F].data;if(G.useAxesFormatters){var A=v._xaxis._ticks[0].formatter;var r=v._yaxis._ticks[0].formatter;var H=v._xaxis._ticks[0].formatString;var w=v._yaxis._ticks[0].formatString;z=A(H,J[0]);y=r(w,J[1])}else{z=J[0];y=J[1]}}if(C.legend.escapeHtml){j(t[D]).text(j.jqplot.sprintf(G.cursorLegendFormatString,u,z,y))}else{j(t[D]).html(j.jqplot.sprintf(G.cursorLegendFormatString,u,z,y))}}}}function d(A,F,E){var B={indices:[],data:[]};var G,w,u,C,v,t;var z;var D=A.plugins.cursor;for(var w=0;w<A.series.length;w++){G=A.series[w];t=G.renderer;if(G.show){z=D.intersectionThreshold;if(G.showMarker){z+=G.markerRenderer.size/2}for(var v=0;v<G.gridData.length;v++){p=G.gridData[v];if(D.showVerticalLine){if(Math.abs(F-p[0])<=z){B.indices.push(w);B.data.push({seriesIndex:w,pointIndex:v,gridData:p,data:G.data[v]})}}}}}return B}function n(t,v){var z=v.plugins.cursor;var u=z._tooltipElem;switch(z.tooltipLocation){case"nw":var r=t.x+v._gridPadding.left-u.outerWidth(true)-z.tooltipOffset;var w=t.y+v._gridPadding.top-z.tooltipOffset-u.outerHeight(true);break;case"n":var r=t.x+v._gridPadding.left-u.outerWidth(true)/2;var w=t.y+v._gridPadding.top-z.tooltipOffset-u.outerHeight(true);break;case"ne":var r=t.x+v._gridPadding.left+z.tooltipOffset;var w=t.y+v._gridPadding.top-z.tooltipOffset-u.outerHeight(true);break;case"e":var r=t.x+v._gridPadding.left+z.tooltipOffset;var w=t.y+v._gridPadding.top-u.outerHeight(true)/2;break;case"se":var r=t.x+v._gridPadding.left+z.tooltipOffset;var w=t.y+v._gridPadding.top+z.tooltipOffset;break;case"s":var r=t.x+v._gridPadding.left-u.outerWidth(true)/2;var w=t.y+v._gridPadding.top+z.tooltipOffset;break;case"sw":var r=t.x+v._gridPadding.left-u.outerWidth(true)-z.tooltipOffset;var w=t.y+v._gridPadding.top+z.tooltipOffset;break;case"w":var r=t.x+v._gridPadding.left-u.outerWidth(true)-z.tooltipOffset;var w=t.y+v._gridPadding.top-u.outerHeight(true)/2;break;default:var r=t.x+v._gridPadding.left+z.tooltipOffset;var w=t.y+v._gridPadding.top+z.tooltipOffset;break}z._tooltipElem.css("left",r);z._tooltipElem.css("top",w)}function m(w){var u=w._gridPadding;var x=w.plugins.cursor;var v=x._tooltipElem;switch(x.tooltipLocation){case"nw":var t=u.left+x.tooltipOffset;var r=u.top+x.tooltipOffset;v.css("left",t);v.css("top",r);break;case"n":var t=(u.left+(w._plotDimensions.width-u.right))/2-v.outerWidth(true)/2;var r=u.top+x.tooltipOffset;v.css("left",t);v.css("top",r);break;case"ne":var t=u.right+x.tooltipOffset;var r=u.top+x.tooltipOffset;v.css({right:t,top:r});break;case"e":var t=u.right+x.tooltipOffset;var r=(u.top+(w._plotDimensions.height-u.bottom))/2-v.outerHeight(true)/2;v.css({right:t,top:r});break;case"se":var t=u.right+x.tooltipOffset;var r=u.bottom+x.tooltipOffset;v.css({right:t,bottom:r});break;case"s":var t=(u.left+(w._plotDimensions.width-u.right))/2-v.outerWidth(true)/2;var r=u.bottom+x.tooltipOffset;v.css({left:t,bottom:r});break;case"sw":var t=u.left+x.tooltipOffset;var r=u.bottom+x.tooltipOffset;v.css({left:t,bottom:r});break;case"w":var t=u.left+x.tooltipOffset;var r=(u.top+(w._plotDimensions.height-u.bottom))/2-v.outerHeight(true)/2;v.css({left:t,top:r});break;default:var t=u.right-x.tooltipOffset;var r=u.bottom+x.tooltipOffset;v.css({right:t,bottom:r});break}}function k(t,r,x,w,v){t.preventDefault();t.stopImmediatePropagation();var y=v.plugins.cursor;if(y.clickReset){y.resetZoom(v,y)}var u=window.getSelection;if(document.selection&&document.selection.empty){document.selection.empty()}else{if(u&&!u().isCollapsed){u().collapse()}}return false}function c(t,r,x,w,v){t.preventDefault();t.stopImmediatePropagation();var y=v.plugins.cursor;if(y.dblClickReset){y.resetZoom(v,y)}var u=window.getSelection;if(document.selection&&document.selection.empty){document.selection.empty()}else{if(u&&!u().isCollapsed){u().collapse()}}return false}function f(y,v,r,B,w){var x=w.plugins.cursor;x.onGrid=false;if(x.show){j(y.target).css("cursor",x.previousCursor);if(x.showTooltip&&!(x._zoom.zooming&&x.showTooltipOutsideZoom&&!x.constrainOutsideZoom)){x._tooltipElem.hide()}if(x.zoom){x._zoom.gridpos=v;x._zoom.datapos=r}if(x.showVerticalLine||x.showHorizontalLine){var D=x.cursorCanvas._ctx;D.clearRect(0,0,D.canvas.width,D.canvas.height)}if(x.showCursorLegend){var C=j(w.targetId+" td.jqplot-cursor-legend-label");for(var u=0;u<C.length;u++){var A=j(C[u]).data("seriesIndex");var t=w.series[A];var z=t.label.toString();if(w.legend.escapeHtml){j(C[u]).text(j.jqplot.sprintf(x.cursorLegendFormatString,z,undefined,undefined))}else{j(C[u]).html(j.jqplot.sprintf(x.cursorLegendFormatString,z,undefined,undefined))}}}}}function b(t,r,w,v,u){var x=u.plugins.cursor;x.onGrid=true;if(x.show){x.previousCursor=t.target.style.cursor;t.target.style.cursor=x.style;if(x.showTooltip){e(r,w,u);if(x.followMouse){n(r,u)}else{m(u)}x._tooltipElem.show()}if(x.showVerticalLine||x.showHorizontalLine){g(r,u)}}}function i(u,t,x,w,v){var y=v.plugins.cursor;var r=y.zoomCanvas._ctx;if(y.show){if(y.showTooltip){e(t,x,v);if(y.followMouse){n(t,v)}}if(y.showVerticalLine||y.showHorizontalLine){g(t,v)}}}function o(A){var z=A.data.plot;var v=z.eventCanvas._elem.offset();var y={x:A.pageX-v.left,y:A.pageY-v.top};var w={xaxis:null,yaxis:null,x2axis:null,y2axis:null,y3axis:null,y4axis:null,y5axis:null,y6axis:null,y7axis:null,y8axis:null,y9axis:null};var x=["xaxis","yaxis","x2axis","y2axis","y3axis","y4axis","y5axis","y6axis","y7axis","y8axis","y9axis"];var r=z.axes;var t,u;for(t=11;t>0;t--){u=x[t-1];if(r[u].show){w[u]=r[u].series_p2u(y[u.charAt(0)])}}return{offsets:v,gridPos:y,dataPos:w}}function h(B){var z=B.data.plot;var A=z.plugins.cursor;if(A.show&&A.zoom&&A._zoom.started&&!A.zoomTarget){var D=A.zoomCanvas._ctx;var x=o(B);var y=x.gridPos;var v=x.dataPos;A._zoom.gridpos=y;A._zoom.datapos=v;A._zoom.zooming=true;var w=y.x;var u=y.y;var C=D.canvas.height;var r=D.canvas.width;if(A.showTooltip&&!A.onGrid&&A.showTooltipOutsideZoom){e(y,v,z);if(A.followMouse){n(y,z)}}if(A.constrainZoomTo=="x"){A._zoom.end=[w,C]}else{if(A.constrainZoomTo=="y"){A._zoom.end=[r,u]}else{A._zoom.end=[w,u]}}var t=window.getSelection;if(document.selection&&document.selection.empty){document.selection.empty()}else{if(t&&!t().isCollapsed){t().collapse()}}l.call(A)}}function a(y,u,t,z,v){var x=v.plugins.cursor;j(document).one("mouseup.jqplot_cursor",{plot:v},q);var w=v.axes;if(document.onselectstart!=undefined){x._oldHandlers.onselectstart=document.onselectstart;document.onselectstart=function(){return false}}if(document.ondrag!=undefined){x._oldHandlers.ondrag=document.ondrag;document.ondrag=function(){return false}}if(document.onmousedown!=undefined){x._oldHandlers.onmousedown=document.onmousedown;document.onmousedown=function(){return false}}if(x.zoom){if(!x.zoomProxy){var A=x.zoomCanvas._ctx;A.clearRect(0,0,A.canvas.width,A.canvas.height)}if(x.constrainZoomTo=="x"){x._zoom.start=[u.x,0]}else{if(x.constrainZoomTo=="y"){x._zoom.start=[0,u.y]}else{x._zoom.start=[u.x,u.y]}}x._zoom.started=true;for(var r in t){x._zoom.axes.start[r]=t[r]}j(document).bind("mousemove.jqplotCursor",{plot:v},h)}}function q(A){var x=A.data.plot;var z=x.plugins.cursor;if(z.zoom&&z._zoom.zooming&&!z.zoomTarget){var w=z._zoom.gridpos.x;var t=z._zoom.gridpos.y;var v=z._zoom.datapos;var B=z.zoomCanvas._ctx.canvas.height;var r=z.zoomCanvas._ctx.canvas.width;var y=x.axes;if(z.constrainOutsideZoom&&!z.onGrid){if(w<0){w=0}else{if(w>r){w=r}}if(t<0){t=0}else{if(t>B){t=B}}for(var u in v){if(v[u]){if(u.charAt(0)=="x"){v[u]=y[u].series_p2u(w)}else{v[u]=y[u].series_p2u(t)}}}}if(z.constrainZoomTo=="x"){t=B}else{if(z.constrainZoomTo=="y"){w=r}}z._zoom.end=[w,t];z._zoom.gridpos={x:w,y:t};z.doZoom(z._zoom.gridpos,v,x,z)}z._zoom.started=false;z._zoom.zooming=false;j(document).unbind("mousemove.jqplotCursor",h);if(document.onselectstart!=undefined&&z._oldHandlers.onselectstart!=null){document.onselectstart=z._oldHandlers.onselectstart;z._oldHandlers.onselectstart=null}if(document.ondrag!=undefined&&z._oldHandlers.ondrag!=null){document.ondrag=z._oldHandlers.ondrag;z._oldHandlers.ondrag=null}if(document.onmousedown!=undefined&&z._oldHandlers.onmousedown!=null){document.onmousedown=z._oldHandlers.onmousedown;z._oldHandlers.onmousedown=null}}function l(){var A=this._zoom.start;var x=this._zoom.end;var v=this.zoomCanvas._ctx;var u,y,z,r;if(x[0]>A[0]){u=A[0];r=x[0]-A[0]}else{u=x[0];r=A[0]-x[0]}if(x[1]>A[1]){y=A[1];z=x[1]-A[1]}else{y=x[1];z=A[1]-x[1]}v.fillStyle="rgba(0,0,0,0.2)";v.strokeStyle="#999999";v.lineWidth=1;v.clearRect(0,0,v.canvas.width,v.canvas.height);v.fillRect(0,0,v.canvas.width,v.canvas.height);v.clearRect(u,y,r,z);v.strokeRect(u,y,r,z)}j.jqplot.CursorLegendRenderer=function(r){j.jqplot.TableLegendRenderer.call(this,r);this.formatString="%s"};j.jqplot.CursorLegendRenderer.prototype=new j.jqplot.TableLegendRenderer();j.jqplot.CursorLegendRenderer.prototype.constructor=j.jqplot.CursorLegendRenderer;j.jqplot.CursorLegendRenderer.prototype.draw=function(){if(this.show){var w=this._series;this._elem=j('<table class="jqplot-legend jqplot-cursor-legend" style="position:absolute"></table>');var z=false;for(var v=0;v<w.length;v++){s=w[v];if(s.show){var r=j.jqplot.sprintf(this.formatString,s.label.toString());if(r){var t=s.color;if(s._stack&&!s.fill){t=""}x.call(this,r,t,z,v);z=true}for(var u=0;u<j.jqplot.addLegendRowHooks.length;u++){var y=j.jqplot.addLegendRowHooks[u].call(this,s);if(y){x.call(this,y.label,y.color,z);z=true}}}}}function x(D,C,F,A){var B=(F)?this.rowSpacing:"0";var E=j('<tr class="jqplot-legend jqplot-cursor-legend"></tr>').appendTo(this._elem);E.data("seriesIndex",A);j('<td class="jqplot-legend jqplot-cursor-legend-swatch" style="padding-top:'+B+';"><div style="border:1px solid #cccccc;padding:0.2em;"><div class="jqplot-cursor-legend-swatch" style="background-color:'+C+';"></div></div></td>').appendTo(E);var G=j('<td class="jqplot-legend jqplot-cursor-legend-label" style="vertical-align:middle;padding-top:'+B+';"></td>');G.appendTo(E);G.data("seriesIndex",A);if(this.escapeHtml){G.text(D)}else{G.html(D)}}return this._elem}})(jQuery);
var Mapifies;if(!Mapifies){Mapifies={}}Mapifies.MapObjects={};Mapifies.MapObjects.Set=function(B,A){var C=jQuery(B).attr("id");var D=new GMap2(B);Mapifies.MapObjects[C]=D;Mapifies.MapObjects[C].Options=A;return Mapifies.MapObjects[C]};Mapifies.MapObjects.Append=function(A,C,D){var B=jQuery(A).attr("id");Mapifies.MapObjects[B][C]=D};Mapifies.MapObjects.Get=function(A){return Mapifies.MapObjects[jQuery(A).attr("id")]};Mapifies.Initialise=function(B,A,F){function D(){return{language:"en",mapType:"map",mapCenter:[55.958858,-3.162302],mapZoom:12,mapControl:"small",mapEnableType:false,mapEnableOverview:false,mapEnableDragging:true,mapEnableInfoWindows:true,mapEnableDoubleClickZoom:false,mapEnableScrollZoom:false,mapEnableSmoothZoom:false,mapEnableGoogleBar:false,mapEnableScaleControl:false,mapShowjMapsIcon:true,debugMode:false}}A=jQuery.extend(D(),A);if(GBrowserIsCompatible()){var E=Mapifies.MapObjects.Set(B,A);var C=Mapifies.GetMapType(A.mapType);E.setCenter(new GLatLng(A.mapCenter[0],A.mapCenter[1]),A.mapZoom,C);if(A.mapShowjMapsIcon){Mapifies.AddScreenOverlay(B,{imageUrl:"http://hg.digitalspaghetti.me.uk/jmaps/raw-file/3228fade0b3c/docs/images/jmaps-mapicon.png",screenXY:[70,10],overlayXY:[0,0],size:[42,25]})}switch(A.mapControl){case"small":E.addControl(new GSmallMapControl());break;case"large":E.addControl(new GLargeMapControl());break}if(A.mapEnableType){E.addControl(new GMapTypeControl())}if(A.mapEnableOverview){E.addControl(new GOverviewMapControl())}if(!A.mapEnableDragging){E.disableDragging()}if(!A.mapEnableInfoWindows){E.disableInfoWindow()}if(A.mapEnableDoubleClickZoom){E.enableDoubleClickZoom()}if(A.mapEnableScrollZoom){E.enableScrollWheelZoom()}if(A.mapEnableSmoothZoom){E.enableContinuousZoom()}if(A.mapEnableGoogleBar){E.enableGoogleBar()}if(A.mapEnableScaleControl){E.addControl(new GScaleControl())}if(A.debugMode){console.log(Mapifies)}if(typeof F=="function"){return F(E,B,A)}}else{jQuery(B).text("Your browser does not support Google Maps.");return false}return};Mapifies.MoveTo=function(C,B,G){function E(){return{centerMethod:"normal",mapType:null,mapCenter:[],mapZoom:null}}var F=Mapifies.MapObjects.Get(C);B=jQuery.extend(E(),B);if(B.mapType){var D=Mapifies.GetMapType(B.mapType)}var A=new GLatLng(B.mapCenter[0],B.mapCenter[1]);switch(B.centerMethod){case"normal":F.setCenter(A,B.mapZoom,D);break;case"pan":F.panTo(A);break}if(typeof G=="function"){return G(A,B)}};Mapifies.SavePosition=function(B,A,D){var C=Mapifies.MapObjects.Get(B);C.savePosition();if(typeof D=="function"){return D(C)}};Mapifies.GotoSavedPosition=function(B,A,D){var C=Mapifies.MapObjects.Get(B);C.returnToSavedPosition();if(typeof D=="function"){return D(C)}};Mapifies.CreateKeyboardHandler=function(B,A,E){var C=Mapifies.MapObjects.Get(B);var D=new GKeyboardHandler(C);if(typeof E=="function"){return E(D)}};Mapifies.CheckResize=function(B,A,D){var C=Mapifies.MapObjects.Get(B);C.checkResize();if(typeof D=="function"){return D(B)}};Mapifies.SearchAddress=function(C,B,F){function D(){return{query:null,returnType:"getLatLng",cache:undefined,countryCode:"uk"}}var E=Mapifies.MapObjects.Get(C);B=jQuery.extend(D(),B);if(typeof E.Geocoder==="undefined"){if(typeof B.cache==="undefined"){var A=new GClientGeocoder()}else{var A=new GClientGeocoder(cache)}Mapifies.MapObjects.Append(C,"Geocoder",A);E=Mapifies.MapObjects.Get(C)}E.Geocoder[B.returnType](B.query,function(G){if(typeof F==="function"){return F(G,B)}});return};Mapifies.SearchDirections=function(D,I,H){function C(){return{query:null,panel:null,locale:"en_GB",travelMode:"driving",avoidHighways:false,getPolyline:true,getSteps:true,preserveViewport:false,clearLastSearch:false}}var G=Mapifies.MapObjects.Get(D);I=jQuery.extend(C(),I);var B={locale:I.locale,travelMode:I.travelMode,avoidHighways:I.avoidHighways,getPolyline:I.getPolyline,getSteps:I.getSteps,preserveViewport:I.preserveViewport};var A=$(I.panel).get(0);if(typeof G.Directions==="undefined"){Mapifies.MapObjects.Append(D,"Directions",new GDirections(G,A))}GEvent.addListener(G.Directions,"load",F);GEvent.addListener(G.Directions,"error",E);if(I.clearLastSearch){G.Directions.clear()}G.Directions.load(I.query,B);function F(){if(typeof H=="function"){return H(G.Directions,I)}}function E(){if(typeof H=="function"){return H(G.Directions,I)}}return};Mapifies.CreateAdsManager=function(C,B,F){function D(){return{publisherId:"",maxAdsOnMap:3,channel:0,minZoomLevel:6}}var E=Mapifies.MapObjects.Get(C);B=jQuery.extend(D(),B);var A={maxAdsOnMap:B.maxAdsOnMap,channel:B.channel,minZoomLevel:B.minZoomLevel};if(typeof E.AdsManager=="undefined"){Mapifies.MapObjects.Append(C,"AdsManager",new GAdsManager(E,B.publisherId,A))}if(typeof F=="function"){return F(E.AdsManager,B)}};Mapifies.AddFeed=function(B,A,F){function D(){return{feedUrl:null,mapCenter:[]}}var E=Mapifies.MapObjects.Get(B);A=jQuery.extend(D(),A);var C=new GGeoXml(A.feedUrl);E.addOverlay(C);if(A.mapCenter[0]&&A.mapCenter[1]){E.setCenter(new GLatLng(A.mapCenter[0],A.mapCenter[1]))}if(typeof F=="function"){return F(C,A)}return};Mapifies.RemoveFeed=function(A,B,D){var C=Mapifies.MapObjects.Get(A);C.removeOverlay(B);if(typeof D=="function"){return D(B)}return};Mapifies.AddGroundOverlay=function(B,A,F){function D(){return{overlaySouthWestBounds:undefined,overlayNorthEastBounds:undefined,overlayImage:undefined}}var E=Mapifies.MapObjects.Get(B);A=jQuery.extend(D(),A);var C=new GLatLngBounds(new GLatLng(A.overlaySouthWestBounds[0],A.overlaySouthWestBounds[1]),new GLatLng(A.overlayNorthEastBounds[0],A.overlayNorthEastBounds[1]));groundOverlay=new GGroundOverlay(A.overlayImage,C);E.addOverlay(groundOverlay);if(typeof F=="function"){return F(groundOverlay,A)}return};Mapifies.RemoveGroundOverlay=function(A,C,D){var B=Mapifies.MapObjects.Get(A);B.removeOverlay(C);if(typeof D==="function"){return D(C)}return};Mapifies.AddMarker=function(D,C,G){function E(){var H={pointLatLng:undefined,pointHTML:undefined,pointOpenHTMLEvent:"click",pointIsDraggable:false,pointIsRemovable:false,pointRemoveEvent:"dblclick",pointMinZoom:4,pointMaxZoom:17,pointIcon:undefined,centerMap:false,centerMoveMethod:"normal"};return H}var F=Mapifies.MapObjects.Get(D);C=jQuery.extend({},E(),C);var B={};if(typeof C.pointIcon=="object"){jQuery.extend(B,{icon:C.pointIcon})}if(C.pointIsDraggable){jQuery.extend(B,{draggable:C.pointIsDraggable})}if(C.centerMap){switch(C.centerMoveMethod){case"normal":F.setCenter(new GLatLng(C.pointLatLng[0],C.pointLatLng[1]));break;case"pan":F.panTo(new GLatLng(C.pointLatLng[0],C.pointLatLng[1]));break}}var A=new GMarker(new GLatLng(C.pointLatLng[0],C.pointLatLng[1]),B);if(C.pointHTML){GEvent.addListener(A,C.pointOpenHTMLEvent,function(){A.openInfoWindowHtml(C.pointHTML,{maxContent:C.pointMaxContent,maxTitle:C.pointMaxTitle})})}if(C.pointIsRemovable){GEvent.addListener(A,C.pointRemoveEvent,function(){F.removeOverlay(A)})}if(F.MarkerManager){F.MarkerManager.addMarker(A,C.pointMinZoom,C.pointMaxZoom)}else{F.addOverlay(A)}if(typeof G=="function"){return G(A,C)}return};Mapifies.RemoveMarker=function(B,A,D){var C=Mapifies.MapObjects.Get(B);C.removeOverlay(A);if(typeof D==="function"){return D(A)}return};Mapifies.CreateMarkerManager=function(C,A,G){function D(){return{markerManager:"GMarkerManager",borderPadding:100,maxZoom:17,trackMarkers:false}}var F=Mapifies.MapObjects.Get(C);A=jQuery.extend(D(),A);var E={borderPadding:A.borderPadding,maxZoom:A.maxZoom,trackMarkers:A.trackMarkers};var B=new window[A.markerManager](F,A);Mapifies.MapObjects.Append(C,"MarkerManager",B);if(typeof G=="function"){return G(B,A)}};Mapifies.AddPolygon=function(E,C,H){function F(){return{polygonPoints:[],polygonStrokeColor:"#000000",polygonStrokeWeight:5,polygonStrokeOpacity:1,polygonFillColor:"#ff0000",polygonFillOpacity:1,mapCenter:undefined,polygonClickable:true}}var G=Mapifies.MapObjects.Get(E);C=jQuery.extend(F(),C);var A={};if(!C.polygonClickable){A=jQuery.extend(A,{clickable:false})}if(typeof C.mapCenter!=="undefined"&&C.mapCenter[0]&&C.mapCenter[1]){G.setCenter(new GLatLng(C.mapCenter[0],C.mapCenter[1]))}var B=[];jQuery.each(C.polygonPoints,function(J,I){B.push(new GLatLng(I[0],I[1]))});var D=new GPolygon(B,C.polygonStrokeColor,C.polygonStrokeWeight,C.polygonStrokeOpacity,C.polygonFillColor,C.polygonFillOpacity,A);G.addOverlay(D);if(typeof H=="function"){return H(D,A,C)}return};Mapifies.RemovePolygon=function(B,A,D){var C=Mapifies.MapObjects.Get(B);C.removeOverlay(A);if(typeof D==="function"){return D(A)}return};Mapifies.AddPolyline=function(D,C,H){function F(){return{polylinePoints:[],polylineStrokeColor:"#ff0000",polylineStrokeWidth:10,polylineStrokeOpacity:1,mapCenter:[],polylineGeodesic:false,polylineClickable:true}}var G=Mapifies.MapObjects.Get(D);C=jQuery.extend(F(),C);var E={};if(C.polylineGeodesic){jQuery.extend(E,{geodesic:true})}if(!C.polylineClickable){jQuery.extend(E,{clickable:false})}if(C.mapCenter[0]&&C.mapCenter[1]){G.setCenter(new GLatLng(C.mapCenter[0],C.mapCenter[1]))}var B=[];jQuery.each(C.polylinePoints,function(J,I){B.push(new GLatLng(I[0],I[1]))});var A=new GPolyline(B,C.polylineStrokeColor,C.polylineStrokeWidth,C.polylineStrokeOpacity,E);G.addOverlay(A);if(typeof H=="function"){return H(A,E,C)}return};Mapifies.RemovePolyline=function(B,A,D){var C=Mapifies.MapObjects.Get(B);C.removeOverlay(A);if(typeof D==="function"){return D(A)}return};Mapifies.AddScreenOverlay=function(C,B,F){function D(){return{imageUrl:"",screenXY:[],overlayXY:[],size:[]}}var E=Mapifies.MapObjects.Get(C);B=jQuery.extend(D(),B);var A=new GScreenOverlay(B.imageUrl,new GScreenPoint(B.screenXY[0],B.screenXY[1]),new GScreenPoint(B.overlayXY[0],B.overlayXY[1]),new GScreenSize(B.size[0],B.size[1]));E.addOverlay(A);if(typeof F=="function"){return F(A,B)}};Mapifies.RemoveScreenOverlay=function(B,A,D){var C=Mapifies.MapObjects.Get(B);C.removeOverlay(A);if(typeof D==="function"){return D(A)}return};Mapifies.CreateStreetviewPanorama=function(E,D,H){function F(){return{overideContainer:"",latlng:[40.75271883902363,-73.98262023925781],pov:[]}}var G=Mapifies.MapObjects.Get(E);D=jQuery.extend(F(),D);var A=null;if(D.overideContainer!==""){A=jQuery(D.overideContainer).get(0)}else{A=jQuery(E).get(0)}var B={};if(D.pov.length>0){jQuery.extend(B,{pov:new GPov(D.latlng[0],D.latlng[1],D.latlng[2])})}if(D.latlng.length>0){jQuery.extend(B,{latlng:new GLatLng(D.latlng[0],D.latlng[1])})}var C=new GStreetviewPanorama(A,B);if(typeof H=="function"){return H(C,D)}return};Mapifies.RemoveStreetviewPanorama=function(B,A,D){var C=Mapifies.MapObjects.Get(B);A.remove();if(typeof D=="function"){return D(A)}return};Mapifies.AddTrafficInfo=function(B,A,F){function D(){return{mapCenter:[]}}var E=Mapifies.MapObjects.Get(B);A=jQuery.extend(D(),A);var C=new GTrafficOverlay;E.addOverlay(C);if(A.mapCenter[0]&&A.mapCenter[1]){E.setCenter(new GLatLng(A.mapCenter[0],A.mapCenter[1]))}if(typeof F=="function"){return F(C,A)}};Mapifies.RemoveTrafficInfo=function(A,B,D){var C=Mapifies.MapObjects.Get(A);C.removeOverlay(B);if(typeof D==="function"){return D(B)}return};Mapifies.SearchCode=function(A){switch(A){case G_GEO_SUCCESS:return{code:G_GEO_SUCCESS,success:true,message:"Success"};case G_GEO_UNKNOWN_ADDRESS:return{code:G_GEO_UNKNOWN_ADDRESS,success:false,message:"No corresponding geographic location could be found for one of the specified addresses. This may be due to the fact that the address is relatively new, or it may be incorrect"};break;case G_GEO_SERVER_ERROR:return{code:G_GEO_UNKNOWN_ADDRESS,success:false,message:"A geocoding or directions request could not be successfully processed, yet the exact reason for the failure is not known."};break;case G_GEO_MISSING_QUERY:return{code:G_GEO_UNKNOWN_ADDRESS,success:false,message:"The HTTP q parameter was either missing or had no value. For geocoder requests, this means that an empty address was specified as input. For directions requests, this means that no query was specified in the input."};break;case G_GEO_BAD_KEY:return{code:G_GEO_UNKNOWN_ADDRESS,success:false,message:"The given key is either invalid or does not match the domain for which it was given."};break;case G_GEO_BAD_REQUEST:return{code:G_GEO_UNKNOWN_ADDRESS,success:false,message:"A directions request could not be successfully parsed."};break;default:return{code:null,success:false,message:"An unknown error occurred."};break}};Mapifies.GetMapType=function(A){switch(A){case"map":A=G_NORMAL_MAP;break;case"sat":A=G_SATELLITE_MAP;break;case"hybrid":A=G_HYBRID_MAP;break}return A};Mapifies.GetTravelMode=function(A){switch(A){case"driving":A=G_TRAVEL_MODE_DRIVING;break;case"walking":A=G_TRAVEL_MODE_WALKING;break}return A};Mapifies.createIcon=function(A){function C(){return{iconImage:undefined,iconShadow:undefined,iconSize:undefined,iconShadowSize:undefined,iconAnchor:undefined,iconInfoWindowAnchor:undefined,iconPrintImage:undefined,iconMozPrintImage:undefined,iconPrintShadow:undefined,iconTransparent:undefined}}A=jQuery.extend(C(),A);var B=new GIcon(G_DEFAULT_ICON);if(A.iconImage){B.image=A.iconImage}if(A.iconShadow){B.shadow=A.iconShadow}if(A.iconSize){B.iconSize=A.iconSize}if(A.iconShadowSize){B.shadowSize=A.iconShadowSize}if(A.iconAnchor){B.iconAnchor=A.iconAnchor}if(A.iconInfoWindowAnchor){B.infoWindowAnchor=A.iconInfoWindowAnchor}return B};Mapifies.getCenter=function(A){var B=Mapifies.MapObjects.Get(A);return B.getCenter()};Mapifies.getBounds=function(A){var B=Mapifies.MapObjects.Get(A);return B.getBounds()};var Mapifies;if(!Mapifies){Mapifies={}}(function(A){A.fn.jmap=function(D,B,C){return this.each(function(){if(D=="init"&&typeof B=="undefined"){new Mapifies.Initialise(this,{},null)}else{if(D=="init"&&typeof B=="object"){new Mapifies.Initialise(this,B,C)}else{if(D=="init"&&typeof B=="function"){new Mapifies.Initialise(this,{},B)}else{if(typeof D=="object"||D==null){new Mapifies.Initialise(this,D,B)}else{try{new Mapifies[D](this,B,C)}catch(E){throw Error("Mapifies Function Does Not Exist")}}}}}})}})(jQuery);
/**
 * jQuery-Plugin "preloadCssImages"
 * by Scott Jehl, scott@filamentgroup.com
 * http://www.filamentgroup.com
 * reference article: http://www.filamentgroup.com/lab/update_automatically_preload_images_from_css_with_jquery/
 * demo page: http://www.filamentgroup.com/examples/preloadImages/index_v2.php
 * 
 * Copyright (c) 2008 Filament Group, Inc
 * Dual licensed under the MIT (filamentgroup.com/examples/mit-license.txt) and GPL (filamentgroup.com/examples/gpl-license.txt) licenses.
 *
 * Version: 5.0, 10.31.2008
 * Changelog:
 * 	02.20.2008 initial Version 1.0
 *    06.04.2008 Version 2.0 : removed need for any passed arguments. Images load from any and all directories.
 *    06.21.2008 Version 3.0 : Added options for loading status. Fixed IE abs image path bug (thanks Sam Pohlenz).
 *    07.24.2008 Version 4.0 : Added support for @imported CSS (credit: http://marcarea.com/). Fixed support in Opera as well. 
 *    10.31.2008 Version: 5.0 : Many feature and performance enhancements from trixta
 * --------------------------------------------------------------------
 */

;jQuery.preloadCssImages = function(settings){
	settings = jQuery.extend({
		statusTextEl: null,
		statusBarEl: null,
		errorDelay: 999, // handles 404-Errors in IE
		simultaneousCacheLoading: 2
	}, settings);
	var allImgs = [],
		loaded = 0,
		imgUrls = [],
		thisSheetRules,	
		errorTimer;
	
	function onImgComplete(){
		clearTimeout(errorTimer);
		if (imgUrls && imgUrls.length && imgUrls[loaded]) {
			loaded++;
			if (settings.statusTextEl) {
				var nowloading = (imgUrls[loaded]) ? 
					'Now Loading: <span>' + imgUrls[loaded].split('/')[imgUrls[loaded].split('/').length - 1] : 
					'Loading complete'; // wrong status-text bug fixed
				jQuery(settings.statusTextEl).html('<span class="numLoaded">' + loaded + '</span> of <span class="numTotal">' + imgUrls.length + '</span> loaded (<span class="percentLoaded">' + (loaded / imgUrls.length * 100).toFixed(0) + '%</span>) <span class="currentImg">' + nowloading + '</span></span>');
			}
			if (settings.statusBarEl) {
				var barWidth = jQuery(settings.statusBarEl).width();
				jQuery(settings.statusBarEl).css('background-position', -(barWidth - (barWidth * loaded / imgUrls.length).toFixed(0)) + 'px 50%');
			}
			loadImgs();
		}
	}
	
	function loadImgs(){
		//only load 1 image at the same time / most browsers can only handle 2 http requests, 1 should remain for user-interaction (Ajax, other images, normal page requests...)
		// otherwise set simultaneousCacheLoading to a higher number for simultaneous downloads
		if(imgUrls && imgUrls.length && imgUrls[loaded]){
			var img = new Image(); //new img obj
			img.src = imgUrls[loaded];	//set src either absolute or rel to css dir
			if(!img.complete){
				jQuery(img).bind('error load onreadystatechange', onImgComplete);
			} else {
				onImgComplete();
			}
			errorTimer = setTimeout(onImgComplete, settings.errorDelay); // handles 404-Errors in IE
		}
	}
	
	function parseCSS(sheets, urls) {
		var w3cImport = false,
			imported = [],
			importedSrc = [],
			baseURL;
		var sheetIndex = sheets.length;
		while(sheetIndex--){//loop through each stylesheet
			
			var cssPile = '';//create large string of all css rules in sheet
			
			if(urls && urls[sheetIndex]){
				baseURL = urls[sheetIndex];
			} else {
				var csshref = (sheets[sheetIndex].href) ? sheets[sheetIndex].href : 'window.location.href';
				var baseURLarr = csshref.split('/');//split href at / to make array
				baseURLarr.pop();//remove file path from baseURL array
				baseURL = baseURLarr.join('/');//create base url for the images in this sheet (css file's dir)
				if (baseURL) {
					baseURL += '/'; //tack on a / if needed
				}
			}
			
			try {
				if(sheets[sheetIndex].cssRules || sheets[sheetIndex].rules){
					thisSheetRules = (sheets[sheetIndex].cssRules) ? //->>> http://www.quirksmode.org/dom/w3c_css.html
						sheets[sheetIndex].cssRules : //w3
						sheets[sheetIndex].rules; //ie 
					var ruleIndex = thisSheetRules.length;
					while(ruleIndex--){
						if(thisSheetRules[ruleIndex].style && thisSheetRules[ruleIndex].style.cssText){
							var text = thisSheetRules[ruleIndex].style.cssText;
							if(text.toLowerCase().indexOf('url') != -1){ // only add rules to the string if you can assume, to find an image, speed improvement
								cssPile += text; // thisSheetRules[ruleIndex].style.cssText instead of thisSheetRules[ruleIndex].cssText is a huge speed improvement
							}
						} else if(thisSheetRules[ruleIndex].styleSheet) {
							imported.push(thisSheetRules[ruleIndex].styleSheet);
							w3cImport = true;
						}

					}
				}
			} catch(e) {}
			
			//parse cssPile for image urls
			var tmpImage = cssPile.match(/[^\("]+\.(gif|jpg|jpeg|png)/g);//reg ex to get a string of between a "(" and a ".filename" / '"' for opera-bugfix
			if(tmpImage){
				var i = tmpImage.length;
				while(i--){ // handle baseUrl here for multiple stylesheets in different folders bug
					var imgSrc = (tmpImage[i].charAt(0) == '/' || tmpImage[i].match('://')) ? // protocol-bug fixed
						tmpImage[i] : 
						baseURL + tmpImage[i];
					
					if(jQuery.inArray(imgSrc, imgUrls) == -1){
						imgUrls.push(imgSrc);
					}
				}
			}
			
			if(!w3cImport && sheets[sheetIndex].imports && sheets[sheetIndex].imports.length) {
				for(var iImport = 0, importLen = sheets[sheetIndex].imports.length; iImport < importLen; iImport++){
					var iHref = sheets[sheetIndex].imports[iImport].href;
					iHref = iHref.split('/');
					iHref.pop();
					iHref = iHref.join('/');
					if (iHref) {
						iHref += '/'; //tack on a / if needed
					}
					var iSrc = (iHref.charAt(0) == '/' || iHref.match('://')) ? // protocol-bug fixed
						iHref : 
						baseURL + iHref;
					
					importedSrc.push(iSrc);
					imported.push(sheets[sheetIndex].imports[iImport]);
				}
			}
		}//loop
		if(imported.length){
			parseCSS(imported, importedSrc);
			return false;
		}
		var downloads = settings.simultaneousCacheLoading;
		while( downloads--){
			setTimeout(loadImgs, downloads);
		}
	}
	parseCSS(document.styleSheets);
	return imgUrls;
};
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
// for the admin side of GreyCMS
$(function(){
	$('body').addClass('js');
	$('.hide_if_js').hide();
	$('.flash').hide().slideDown();
	
	try { // to load external plugins, ignore failure (if plugins weren't selected in site settings)
		$.bindPlugins(); // calls a few common plugins, also used after a new element that uses a plugin is created in the dom
		$.enableEditor();
	} catch (e){};
	
	$('.disabler', '.disabled').disabler();  // checkbox that disables all inputs in its form
	$('.anchorListener').anchorDispatch();   // toggle an element when its id is present in the url hash
	$('.row_checkable').rowCheckable();			 // clicking a whole form also enables its first checkbox
	$('.pane_switch').paneSwitcher();				 // use a checkbox to switch between two containers. classes: .pane_0, .pane_1
	$('.toggle_div').toggleDiv();						 // use a checkbox to show/hide its parents next sibling div
	$('.trans2opaq').animOpacity();					 // animates from transparent to opaque on hover, css sets initial opacity
	$('.link_div').linkDiv();								 // attack a click event to divs that wrap a link to follow the href
	$('.param_filled').fillWithParam(); 		 // fill matching inputs with the param from its rel attr
	$('.table_sort').appendParamAndGo();		 // append the key-val in the elements rel attr to the href and go to it
	$('.openDiv').openDiv();					 // click a link to open a hidden div near by
	$.liveSubmit('.search-btn', '.search-button', '.submit_btn'); // make a link act as a submit button
	$('h4 a', '#info-accordion').accordion(); // my very own accordion widget :)
	$('.tabular_content').tabular_content(); // a div that contains divs as the tabbed content, the tab list can be anywhere
	$('.clickerd').clickOnLoad();             // a click is triggered on page load for these elements
	$('.numeric_phone').formatPhoneNum();     // as the user types in numbers, the input is formated as XXX-XXX-XXXX
	$('.tip_trigger').tooltip();
	$('.txt_ldr').txt_loader();
	$('.shimmy').shimmy('#page-cnt');
	$('.aProxy').aProxy();
	$('.click_to_view').phoneNumHider();
	$('.delayed_render').delayedRender();
	
	$('.focus_onload').eq(0).focus();
	// highlight text within a text field or area when focused
	$('.click_sel').live('focus', function() { $(this).select() });
	$('#auth_yourself').hide();
	$('.ie_only').ieOnly(); // hidden unless ie
	
	if ($.preloadCssImages) $.preloadCssImages();
	$.updateUserStat();
	
	$('.greyConfirm').live('click', function() {
		$.greyConfirm('Are you sure?', function() {
			return true;
		}, function() {
			return false;
		});
	});
	
	// we call the toggleAction in case we need to trigger any plugins declared above
	$.toggleAction(window.location.href, true); // toggle a container if its id is in the url hash
	
	// sortable nav bar, first implemented to update the position attr of a page (only when logged in)
	$('.sortable', '.admin').sortable({
		opacity: 0.3,
		update: function(e, ui) { $.updateModels(e, ui) }
	});
	
	$('.block_sortable', '.admin').sortable({
		opacity: 0.3,
		placeholder: 'ui-state-highlight',
		helper: 'clone',
		update: function(e, ui) { $.updateModels(e, ui) }
	});
	
	if ($('.mini_calendar').length > 0) {
		$('.mini_calendar').datepicker();
		$('.datepicker_wrap').live('click', function(){ $('.mini_calendar', this).focus(); });
	}
	
	$('ul li a', '#ov-reports-cnt').click(function(){
		get_pop_up(this);
		return false;
	});
	
	$('a', '#admin-box').click(function(){
		var $this = $(this),
			other_links = $('a:not(this)', '#admin-box').removeClass('active');
		$this.addClass('active');
	});
	
	$('.selectable').live('click', function(){
		var $this = $(this),
			checkbox = $('input[type=checkbox]', $this);
			
		if (!$this.data('selected')) {
			$this.data('selected', true).addClass('selected');
			checkbox.trigger('change').attr('checked', true);
		} else {
			$this.data('selected', false).removeClass('selected');
			checkbox.trigger('change').attr('checked', false);
		}
		
	}).siblings('label').live('click', function(){
		var $this = $(this);
		
		$this.click(function(){
			$this.siblings('.selectable').eq(0).click();
		});
	});
	
	$('#siteseal').live('click', function() {
		var godaddy_url = 'https://seal.godaddy.com/verifySeal?sealID=XHjJD1MWNJ2lR4Dt0enfWq2PGeF713whHBQcuu37sFaJRUSR37baz';
		
		if ($.on_page([['new', 'rentals']])) { // we're in the rental form iframe so a dialog doesn't work here. 
			window.open(godaddy_url,'SealVerfication','location=yes,status=yes,resizable=yes,scrollbars=no,width=592,height=740');
		} else {
			$('<div id="pop_up"><iframe id="site_seal_frame" src="'+ godaddy_url +'"></iframe></div>').dialog(default_pop_up_options({
				title: 'Secure Site by GoDaddy.com',
				width: 593,
				height: 853
			}));
		}
	});
	
	var radios = $('.radio_wrap').each(function() {
		var $this = $(this);
		if ($this.children('.radio_select').children(':radio').is(':checked'))
			$this.addClass('selected').find('.radio_select').find(':radio').attr('checked', true);
	});
	radios.live('click', function() {
		var $this = $(this);
		$this.siblings().removeClass('selected').find('.radio_select').find(':radio').attr('checked', false);
		$this.addClass('selected').find('.radio_select').find(':radio').attr('checked', true);
	});
	
	// Admin index page menu
	if ($.on_page([['index', 'admin']])) {
		var admin_links = $('a', '#controller_list'), 
			ajax_wrap = $('#ajax_wrap');
		
		admin_links.live('click', function(){ $.cookie('active_admin_link', this.id) });
		
		// ajaxify the admin links to inject the index view content into the #ajax_wrap, exclude certain ajax_links
		$('a:not(.ajax_action, .toggle_action, .partial_addable, .add_link, .cancel_link, .click_thru, .ps, .btn)', '#admin_panel').live('click', function() {
			var $this = $(this);
			
			if ($this.hasClass('admin_link')) {
				admin_links.removeClass('active');
				$this.addClass('active');
			}
			
			//window.location.href = window.location.href.split('#')[0] + '#' + $this.attr('href');

			ajax_wrap.children().fadeTo('fast', 0.2);
			ajax_wrap.addClass('loading').load($this.attr('href') + ' #ajax_wrap_inner', function(response, status) {
				if (status == 'success') {
					$.bindPlugins();
					$.enableEditor();
					$('.disabler', '#ajax_wrap_inner').disabler();
					fillInFormFieldSelectLists($('#form_controller', '#FormsForm').val());
					
				} else $('#ajax_wrap_inner').html(response);
				
				$(this).removeClass('loading').children().hide().fadeIn('fast');
			});
			
			return false;
		});
		
		// ajaxify form submissions
		$('form', '#ajax_wrap').live('submit', function() {
			var form = $(this);
			
			ajax_wrap.children().fadeTo('fast', 0.2);
			ajax_wrap.addClass('loading');

			form.ajaxSubmit({
				target: '#ajax_wrap',
				success: function(response, status) {
					if (status == 'success') setTimeout(function() {
						$('.flash', '#ajax_wrap_inner').slideUpRemove('slow'); 
					}, 7000);

					ajax_wrap.removeClass('loading').children().hide().fadeIn('fast');
				}
			});
			
			return false;
		});
		
		// Clients#show: quick verify listings
		$('#client_verify', '#ov-member').live('click', function() {
			var $this = $(this),
				ajax_loader = $.new_ajax_loader('after', this);
			
			if (!$this.data('sending')) {
				ajax_loader.show();
				$this.data('sending', true);
				
				$.post(this.href, { authenticity_token: $.get_auth_token() }, function(response) {
					$.with_json(response, function(data) {
						$this.fadeOutRemove('fast');
					}, function() {
						$this.data('sending', false);
					});
					
					ajax_loader.fadeOutRemove('fast');
				}, 'json');
			}
			
			return false;
		});
		
		$('#activate_listings', '#ov-page-cnt').live('click', function() {
			var $this = $(this);
			
			$.safeLinkPost($this, {
				success: function(data) {
					$this.slideUpRemove('slow');
					$('.claimed.unverified', '#client_listing_box').removeClass('claimed unverified');
				}, 
				error: function() {
					$this.data('sending', false);
				}
			});
			
			return false;
		});
		
		if ($.cookie('active_admin_link')) $('#'+ $.cookie('active_admin_link')).click();
	} // index/admin
	
	$('.delete_listing', '#client_listing_box').live('click', function() {
		var $this = $(this);
		
		$.greyConfirm('Delete this listing, really?', function() {
			$.safeLinkPost($this, {
				data: { _method: 'delete' },
				success: function(data) {
					$this.parents('.listing').slideUpRemove();
				}
			});
		});
		
		return false;
	});
	
	// helpers
	$('.unique_checkbox').live('click', function() {
		var $this = $(this);
		$('input[type=checkbox]', $this.parent().parent().parent()).attr('checked', false);
		$this.attr('checked', !$this.is(':checked'))
	});
	
	$('.unique_checkbox').live('click', function() {
		var $this = $(this);
		$('input[type=checkbox]', $this.parent().parent().parent()).attr('checked', false);
		$this.attr('checked', !$this.is(':checked'))
	});
	
	// toggle_links have a hash (#) of: #action_elementClass_contextClass 
	// e.g. #show_examples_helptext => $('.examples', '.helptext').show();
	$('.toggle_action').live('click', function() {
		$.toggleAction(this.href, false);
		return false;
	});
	
	// ajax links point to the ajax_controller, the href contains an action, and other key-values pairs such as model class,
	// model id, the attribute to update, and the value, see the ajax_controller for other actions and required params
	// use conditional logic to handle the success callback based on attributes of the clicked link, 
	// such as what element to update on success, or what part of the dom should change 
	$('.ajax_action').live('click', function(){
		var $this = $(this);
		$this.addClass('loading');
		
		$.mayContinue($this, function() {
			$.getJSON($this.attr('href') + '&authenticity_token=' + $.get_auth_token(), function(response) {
				$this.removeClass('loading');
				
				if (response.success) {
					// need better conditional logic for these links
					if ($this.attr('rel') == 'helptext') {
						$.toggleHelptext($this);
						
					} else if ($this.hasClass('delete_link')) {
						$this.parent().parent().slideUpRemove();
						
					} else if ($this.hasClass('rm_field')) { // first used for the estaff emails in the listing edit page
						$this.parent().fadeOutRemove(600);
					}
					
				} else {
					$.ajax_error(response);
					$this.removeClass('loading');
				}
			});
		}, function() { // else
			$this.removeClass('loading'); 
		});
		
		return false;
	});
	
	$('.post_link').live('click', function() {
		var $this = $(this);
		
		$.mayContinue($this, function() {
			$this.addClass('loading');
			
			$.post($this.attr('href') + '&authenticity_token=' + $.get_auth_token(), function(response) {
				$.with_json(response, function(data) {
					$this.parent().fadeOutRemove(600);
				});
				
				$this.removeClass('loading');
				
			}, 'json');
		});
		
		return false;
	});
	
	// Partial addables, grab html from a div and add it to the form, used on forms and permissions create and edit
	$('.add_link', '.partial_addable').live('click', function(){
		var $this 			= $(this),
				context 		= '#' + $this.attr('rel'),
				partial_form = $($('.partial_form_html', context).html());
	
		$('input, select, checkbox', partial_form).each(function(){ $(this).attr('disabled', false); });
	
		partial_form.hide().prependTo('.partial_forms_wrap', context).slideDown(600);
		$.bindPlugins(); // first implemented to call hinty
		
		return false;
	});
	
	$('.cancel_link', '.partial_addable').live('click', function(){
		$(this).parent().parent().slideUpRemove(); 
		return false; 
	});
	
	// retrieves a partial via ajax and inserts it into the target div
	$('.insert_partial').live('click', function(){
		var $this = $(this);
		
		$.get(this.href, function(response){
			$('#' + $this.attr('rel')).html(response);
		})
		
		return false;
	});
	
	$('.inline_delete_link').live('click', function(){
		var $this = $(this);
		
		$.mayContinue($this, function() {
			if ($this.attr('rel').split('_')[1] == '0') $this.parent().parent().slideUpAndRemove();
			else $('#'+ $this.attr('rel')).slideUpAndRemove();
		});
		
		return false;
	});
	
	$('.select_on_focus').live('focus', function() {
		$(this).select();
	})
	
	// Views/Forms/Links Edit
	if ($.on_page([['edit, new', 'views, forms, links']])) {
		var scope_down = ''; 
		if ($.on_page([['edit, new', 'views']])) scope_down = 'owner';
		else scope_down = 'target';
		
		// when the user chooses a scope (aka resource), show the scope-dependent owner_id or target_id dropdown
		// which is populated by models of the selected scope class
		var scoping_fields = $('#scope_' + scope_down + '_fields', '#body');
		
		if ($('.scope_down_hidden', scoping_fields).val()) { // preselect owner or target from dropdown
			var scoper_id = $('.scope_down_hidden', scoping_fields).val();
			
			scoping_fields.children().each(function(){
				if (this.value == scoper_id) this.selected = 'selected';
			});
		} else scoping_fields.hide();
		
		// grab model instances that are of the selected class
		$('.scope_dropdown', '#scope_fields').live('change', function(){
			var $this = $(this);
			
			if ($this.val() != '') { // retrieve all models of this class
				scoping_fields.show(100);
				scoping_dropdown = $('.scoping_dropdown', scoping_fields);
				scoping_dropdown.html('<option>Loading ' + $this.val() + '...</option>');
				
				$.getJSON('/ajax/get_all', { model: $this.val(), authenticity_token: $.get_auth_token() }, function(response) {
					if (response.success) {
						var args = { attribute: 'name', select_prompt: (scoping_dropdown.hasClass('no_prompt') ? '' : 'Active Context') }
						var option_tags = $.option_tags_from_model($this.val(), response.data, args);
						scoping_dropdown.html(option_tags);
						
					} else {
						scoping_dropdown.html('<option>Error Loading Records</option>')
					}
				});
			} else scoping_fields.hide(300);
		}); // END .scope_dropdown.change()
		
		// get the attributes of the resource selected from #form_controller in the form new/edit page
		$('#form_controller', '#FormsForm').live('change', function(){
			fillInFormFieldSelectLists($(this).val()); 
		});
		
		// create a custom event on the select lists so that when they finish loading the options, we can select the
		// field's field_name that matches in the list
		$('.field_attr_name', '#form_builder').live('filled', function(){
			$('.field_attr_name', '#form_builder').each(function(){
				var $this = $(this),
						name = $this.prev('span.field_name').text(); // we stored the field_name value in a hidden span
				
				$this.children('option').each(function(){
					var $this_option = $(this);
					if ($this_option.val() == name) $this_option.attr('selected', true);
				});
			});
			
			// this field name is useful for specifying a hidden field with a return path for after submit the form
			$(this).append('<option value="return_to">return_to</option>');
		});
		
		$('.delete_link', '#form_builder').live('click', function(){
			var $this = $(this),
					field_id = $(this).attr('rel').replace('field_', '');

			$this.parent().parent().html();
			return false;
		});
	} // END Edit/New Views/Forms/Links
	
	// Edit Forms
	if ($.on_page([['edit', 'forms']])) {
		// fill in the field name select lists
		var resource = $('#form_controller', '#FormsForm').val();
		fillInFormFieldSelectLists(resource);
		
	} // END Edit Forms
	
	$('#blast_off').live('click', function() {
		var $this = $(this),
			blast_type = $('input[name=blast_type]:checked', '#blaster').val(),
			test_emails = $('#test_emails', '#blaster').val(),
			ajax_loader = $.new_ajax_loader('after', $this).show();
		
		if (!$this.data('blasting')) {
			$this.data('blasting', true);
			
			$.getJSON($this.attr('data-blast-path'), { blast_type: blast_type, test_emails: test_emails, authenticity_token: $.get_auth_token() }, function(response) {
				$.with_json(response, function(data) {
					$.greyAlert(data, false);
				});
				
				$this.data('blasting', false);
				ajax_loader.hide();
			});
		}
		
		return false;
	});
	
	$('.auto_pop_up_link').live('click', function() {
		var $this = $(this),
			div_id = $this.attr('data-div-id'),
			div = $('#'+ div_id).clone(),
			ops = default_pop_up_options({
				title: $this.attr('title'),
				width: $this.attr('data-width'),
				height: $this.attr('data-height'),
				modal: $this.attr('data-modal') == 'true'
			});
		
		if (this.href.split('#')[1].length == 0) { // has an empty hash, so we want to load a div thats already in the document
			var pop_up = $('<div id="pop_up" class="auto_pop_up '+ div_id +'"></div>').append(div).dialog(ops).children().not('.hide').show();
		} else {
			get_pop_up_and_do(ops, { sub_partial: this.href }, function(pop_up) {
				pop_up.children().not('.hide').show();
			});
		}
		
		return false;
	});
});

$.option_tags_from_model = function(model_class, models, options) {
	var attribute = options.attribute || 'name',
	 	select_prompt = options.select_prompt || false,
		option_tags = select_prompt ? '<option value="">' + select_prompt + '</option>' : '';
	
	$.each(models, function(i) {
		if (attribute == 'name' && !this[model_class]['name']) 
			attribute = 'title';
		else if (attribute == 'title' && !this[model_class]['title']) 
			attribute = 'name';
		
		option_tags += '<option value="' + this[model_class]['id'] + '">(' + this[model_class]['id'] +') ' + this[model_class][attribute] + '</option>';
	});
	
	return option_tags;
}

$.option_tags_from_array = function(options, selected) {
	var options_tags = '';
	
	$.each(options, function(){
		options_tags += '<option'+ (selected && selected == this ? 'selected="selected"' : '') +' value="'+ this +'">'+ this + '</option>';
	});
	
	return options_tags;
}

$.with_json = function(response, success, error) {
	if (response.success) (success || function(){}).call(this, response.data);
	else if (error && error.call) error.call(this, response.data);
	else $.ajax_error(response.data);
}

$.log = function(msg) {
	typeof(console != 'undefined') ? console.log(msg) : alert(msg);
}

$.ajax_error = function(response) {
	if (typeof console == 'undefined') $.greyAlert((typeof(response.data) == 'undefined' ? response : response.data));
	else console.log(response);
	//$('#body').prepend('<div class="flash error hide">'+ response.data +'</div>').slideDown();
}

// take an array of actions and controllers to see if any pair of those match the page we're on
// either set can be a single action or controller as a string or a comma separated string of multiple actions or controllers
$.on_page = function(route_sets) { // routes looks like: [ ['edit, new', 'views, forms, links'], ['index', 'pages'] ]
	var i = route_sets.length,
			actions,
			controllers,
			route = [
				$('body').attr('class').split(' ')[0].replace('_action', ''),
				$('body').attr('id').replace('_controller', '')
			];
	
	while (i--) { // iterate through all the action/controller sets
		actions 	= route_sets[i][0].split(/,\W?/);
		controllers = route_sets[i][1].split(/,\W?/);
		
		var j = actions.length;
		while (j--) { // check each action
			if (route[0] != actions[j]) continue; // skip to the next one
			
			var k = controllers.length;
			while (k--) { // action matched, now match with a controller
				if (route[1] == controllers[k]) return true;
			}
		}
	}
}

$.enableEditor = function() {
	// TODO: fix the toggle button, it doesn't turn off the editor, find out where the editor remove function is
	$('textarea.wysiwyg').each(function(i) {
		var textarea = jQuery(this),
			toggle = jQuery('<a href="#" class="toggle right" id="toggle_' + i + '">Toggle Editor</a>');
		
		textarea.parent().parent().prepend(toggle);
		
		toggle.click(function() {
			CKEDITOR.replace(textarea.attr('name'));
			return false;
		});
	});
}

$.get_auth_token = function() {
	var token = $('input[name=authenticity_token]').val();
	return token;
}

$.validateAnimationAction = function(action) {
	return /^show$|^hide$|^slideDown$|^slideUp$/.test(action);
}

$.switch_action_hash = function(this_el, action, elementClass, contextClass) {
	action = $.switch_actions(action);
	$(this_el).attr('href', $(this_el).attr('href').split('#')[0] + '#' + action + '_' + elementClass + '_' + contextClass); 
	$(this_el).toggleClass('toggle_down');
}

// return the opposite action
$.switch_actions = function(action) {
	var action_sets = [
		['show',			'hide'],
		['fadeIn',		 'fadeOut'],
		['slideDown',	 'slideUp'],
		['addClass', 'removeClass']
	];
	
	var i = action_sets.length; 
	while (i--) { // return the opposite of the action in question
		if (action_sets[i].indexOf(action) >= 0) return action_sets[i][(action_sets[i].indexOf(action) ^ 1)];
	}
}

$.disable = function(disabler, disablee) {
	$(disablee, disabler.parent().parent()).each(function(i){
		if (this.name != disabler.attr('name')) $(this).attr('disabled', !disabler.data('enabled'));
	});
}

$.disableToggle = function(disabler, disablees) {
	disabler.data('enabled', !disabler.data('enabled'));
	$.disable(disabler, disablees);
}

// call a jquery show/hide method on matching element from the selectors present in the href
$.toggleAction = function(href, scroll_to_it) {
	var url_hash = href.split('#');
	
	if (url_hash[1]) {
		var url_hash = url_hash[1],
	 		action	 = url_hash.split('_')[0],
			element  = url_hash.split('_')[1],
			context  = url_hash.split('_')[2],
			target	 = $(element, context);
			
		// validate action name and do it.
		if ($.validateAnimationAction(action)) {
			if (element.match(/^ov-.*/)) { // used on the client options (#admin-box)
				setTimeout(function(){
					$('a[rel='+ element +']', '#admin-box').click();
				}, 1);
				
			} else {
				var oContext = $(context);
				var actionLink = $('.toggle_action', oContext);
				
				// change the state of the toggle_action link
				if (actionLink.length) $.switch_action_hash($('.toggle_action', oContext), action, element, context);
				try {
					if (scroll_to_it) $(document).scrollTo(oContext, 800);
				} catch (e) { }
				
				target[action]();
			}
		}
	}
	
}

// first implemented for the sortable nav bar to update position via ajax
$.updateModels = function(e, ui, callback) {
	var list_items  = ui.item.parent().children(),
		$this		= ui.item,
		query 		= '';
			
	// build query string
	$(list_items).each(function(i){ // html element id is <ModelClass>_<int ID>
		var model_class = this.id.split('_')[0],
			model_id 	= this.id.split('_')[1],
			model_attr 	= $this.attr('data-attr'); // attribute to update
				
		query += 'models['+ i +'][model]='+ model_class + '&models['+ i +'][id]='+ model_id +
			     '&models['+ i +'][attribute]='+ model_attr +'&models['+ i +'][value]='+ i + '&';
	});
	
	$.post('/ajax/update_many', query, function(response){
		$.with_json(response, function(data) {
			if (typeof callback == 'function') callback.call(this, data);
			else $this.effect('bounce', {}, 200);
		});
	}, 'json');
}

// update attributes on a single model
$.updateModel = function(path, params, callback) {
	$.post(path, params, function(response){
		$.with_json(response, function(data){
			if (typeof callback == 'function') callback.call(this, data);
			else alert(data);
		});
	}, 'json');
}

// updates the stats for a logged in user
$.updateUserStat = function() {
	if (typeof usssl_stat_path != 'undefined')
		$.post(usssl_stat_path, { browser_vars: $.browserVars(), _method: 'put' });
}

// retrieve the attributes/columns of given resource/model, e.g. pages, users, posts
$.getModelAttributes = function(resource, callback) {
	var attributes = [];
	
	$.getJSON('/ajax/get_attributes?model='+ singularize(resource), function(response){
		$.with_json(response, function(data){
			if (callback && typeof callback == 'function') callback.call(this, data);
			else return data;
		});
	});
}

$.injectOptionsInSelectLists = function(field_name_selects, option_tag_html) {
	$.each(field_name_selects, function(){ $(this).html(option_tag_html) });
}

// cause the text_field to turn back into a label on blur, but leave behind a hidden field with its value
$.revertSettingsTextFieldToLabel = function(text_field, old_val) {
	text_field.blur(function(){
		var this_field 			= $(this),
				new_val					= this_field.val(),
				field_container = this_field.parent().parent(),
				setting_field 	= $('.setting_field input', field_container),
				old_field_name 	= setting_field.attr('name');

		this_field.fieldToLabel();
		
		// update the setting field name with the new value from the setting label
		setting_field.attr('name', old_field_name.replace(old_val.toLowerCase(), new_val.toLowerCase()))
		
		if (field_container.hasClass('new_setting_field')) {
			field_container.removeClass('new_setting_field').addClass('existing_setting_field');
		}
	});
}

$.any = function(arr, callback) {
	var has = false;
	$.each(arr, function(i) {
		if (callback.call(this, i)) {
			has = true;
			return;
		}
	});
	return has;
}

$.disable_submit_btn = function(btn) {
	return $.toggle_submit_btn(btn, true, .5);
}

$.activate_submit_btn = function(btn) {
	return $.toggle_submit_btn(btn, false, 1);
}

$.toggle_submit_btn = function(btn, toggle, fade) {
	return $(btn).attr('disabled', toggle).fadeTo(300, fade);
}


$.mayContinue = function(link, callback, else_callback) {
	if (!link.hasClass('before_confirm') || (link.hasClass('before_confirm') && $.greyConfirm(link.attr('title'), callback))) {
		return true;
	} else if (typeof else_callback == 'function') {
		else_callback.call(this, link);
	}
}

$.open_map = function(map) {
	map.show();
	
	var map_btn = $('#top_map_btn'),
		location = map_btn.attr('data-loc').split(','),
		lat = parseFloat(location[0]),
		lng = parseFloat(location[1]);

	$('span', map_btn).text('Hide Map');
	Gmap.checkResize();
	Gmap.setCenter(new GLatLng(lat, lng), 12);
}

$.get_param_value = function(key) {
	var query = window.location.href.split('?')[1];
	
	if (query) {
		var params = query.split('&'), value;
			
		$.each(params, function(){
			var key_val = this.split('=');
			
			if (key_val[0] == key) {
				value = key_val[1];
				return;
			}
		});
		
		return value;
	}
}

// replacement for the browser's confirm and alert box
// msg: what to show in the pop up. action: callback if yes. cancel: callback if no. alert: do alert box instead (with only 1 btn). error: whether the alert is an error or simple alert.
$.greyConfirm = function(msg, action, cancel, alert, error) {
	var pop_up = $('<div id="pop_up" class="'+ (typeof(alert) == 'undefined' || !alert ? 'confirm_box' : 'alert_box') +'"></div>').dialog({ 
		title: alert ? (error ? 'Alert' : 'Notice') : 'Confirm',
		width: 400,
		height: 'auto',
		modal: true,
		resizable: false,
		close: function() { $(this).dialog('destroy') }
	});
	
	if (typeof(alert) != 'undefined') 
		var btns = '<a href="#" id="alert_ok" class="btn yes">'+ (error ? 'Doh!' : 'Ok') +'</a>'; 
	else 
		var btns = '<a href="#" id="confirm_yes" class="btn yes">Yes</a><a href="#" id="confirm_cancel" class="btn no">Cancel</a>';
	
	pop_up.html('<p>' + msg +'</p>'+ btns);
	
	$('.btn', pop_up).click(function() {
		if (typeof(alert) == 'undefined' || !alert) {
			var confirm = $(this).text() == 'Yes' ? true : false;
			if (confirm && typeof(action) == 'function') action.call(this);
			else if (typeof cancel == 'function') cancel.call(this);
		}
		
		pop_up.dialog('destroy');
		return false;
	});
	
	$(document).keypress(enter_for_yes_escape_for_no);
	
	function enter_for_yes_escape_for_no(e) {
		var key = e.which || e.keyCode;
		
		if (key == 13) {
			$('.yes', pop_up).click();
			$(document).unbind('keypress', enter_for_yes_escape_for_no);
		} 
	}
}

// msg: what to show in the pop up. error: boolean, error or just simple alert
$.greyAlert = function(msg, error) {
	if (typeof error == 'undefined') error = true;
	$.greyConfirm(msg, null, null, true, error);
}

// send password to users#authenticate before allowing critical operations to happen, i.e change password, billing info, etc.
$.authenticate_user_and_do = function(btn, callback, bypass) {
	if (typeof bypass != 'undefined' && bypass) { // some buttons dont need to call auth twice, i.e edit/save buttons
		callback.call(this);
	} else {
		var pop_up = $('<div id="pop_up" class="confirm_box auth_box"></div>').dialog({ 
			title: 'Authenticate Yourself',
			width: 400,
			height: 140,
			modal: true,
			resizable: false,
			close: function() { $(this).dialog('destroy').remove() }
		});

		pop_up.append($('#auth_yourself', '#content').clone().css('display', 'block'));
		var input = $('input', pop_up).removeClass('invalid').focus();
		
		$('#confirm_yes', pop_up).click(function() { $(this).parents('form').submit(); return false; });
		$('#auth_yourself', pop_up).submit(function() {
			
			var form = $('form', pop_up).runValidation(),
				ajax_loader = $.new_ajax_loader('before', this),
				text = $('p', form).show();
			
			if (form.data('valid') && !form.data('sending')) {
				form.data('sending', true);
				ajax_loader.show();
				
				$.post(form.attr('action'), form.serialize(), function(response) {
					$.with_json(response, function(data) {
						pop_up.dialog('destroy').remove();
						callback.call(this, data);

					}, function(data) {
						$('.flash', form).remove();
						form.prepend('<div class="flash error">'+ data +'</div>').find('.flash').css('position', 'static');
						form.data('sending', false);
						ajax_loader.hide();
						text.hide();
						input.val('').addClass('invalid').focus();
					});
					
					form.data('sending', false);
					ajax_loader.hide();
				}, 'json');
			}

			return false;
		});
	}
}

// put a new ajax loader somewhere by calling a jquery method on the el
$.ajax_loaders = {};
$.new_ajax_loader = function(where, el, img) {
	var el = $(el);
	
	if (el.data('ajax_id') && (loader = $.ajax_loaders[el.data('ajax_id')])) {
		return loader;
		
	} else {
		el.data('ajax_id', (new Date()).getTime());
		var loader = $($.ajax_loader_tag(img, el));
		$.ajax_loaders[el.data('ajax_id')] = loader;
		
		try {
			el[where](loader);
			return loader;
		} catch(e) {
			$.log('new ajax loader failed: '+ e);
		}
	}
}

$.ajax_loader_tag = function(img, context) {
	if (typeof img == 'undefined') var img = 'ajax-loader-facebook.gif';
	var id = typeof(context) == 'undefined' ? '' : 'al_'+ context.attr('id');
	return '<img src="http://s3.amazonaws.com/storagelocator/images/ui/'+ img +'" alt="Loading..." class="ajax_loader" id="'+ id +'" />';
}

$.setInterval = function(callback, interval) {
	setTimeout(function() {
		callback.call(this);
		setTimeout(arguments.callee, interval);
	}, interval);
}

$.setup_autocomplete = function(els, context) {
	if (typeof els == 'undefined') var $autocompleters = $('.autocomplete');
	else if (els && typeof(context) == 'undefined') var $autocompleters = $(els);
	else var $autocompleters = $(els, context);
	
	var $autcompleted = {};
	
	if ($autocompleters.length > 0) {
		$autocompleters.each(function(){
			var $this   = $(this), 
				rel = $this.attr('data-autocomp-source'),
				info	= rel.split('|')[0],
				minLen	= rel.split('|')[1],
				model   = info.split('_')[0],
				method  = info.split('_')[1];

			if (!$autcompleted[rel]) {
				$.getJSON('/ajax/get_autocomplete', { 'model': model, 'method': method }, function(response){
					if (response.success && response.data.length > 0) { 
						$autcompleted[rel] = response.data;
						$this.autocomplete({
							source: response.data,
							minLength: minLen
						});
					} else $.ajax_error(response);
				});
			}
		});
	}
}

$.queryToHash = function(query) {
	var hash = {}, pair;
	$.each(query.split('&'), function() {
		pair = this.split('=');
		hash[pair[0]] = pair[1];
	});
	return hash;
}

$.hashToQuery = function(hash) {
	var query = [];
	for (key in hash) {
		query.push([key, hash[key]].join('='));
	}
	return query.join('&');
}

// uses the jquery plugin sortElement
var stuff_sort_inverse = false;
$.sort_stuff = function(sort_link, elements, selector, sortFunc) {
	sort_link.addClass(stuff_sort_inverse ? 'down' : 'up');
	sort_link.removeClass(stuff_sort_inverse ? 'up' : 'down');
	
	elements.sortElements(function(a, b) {
		return sortFunc(a, b);
	}, function() {
		return $(this).children(selector)[0];
	});
	
	stuff_sort_inverse = !stuff_sort_inverse;
}

// abstracting away a lot of common stuff ajax forms do
$.safeSubmit = function(form, options) {
	var ops = {
		method 	   : 'post',
		success    : null,
		error 	   : null,
		al_where   : 'before',
		al_context : $('input[type=submit]', form),
		ajax_loader: true
	};
	$.extend(ops, options);
	
	var form 		= $(form).runValidation(),
		ajax_loader = ajax_loader ? $.new_ajax_loader(ops.al_where, ops.al_context) : null;
	
	if (form.data('valid') && !form.data('x')) {
		form.data('x', true);
		if (ajax_loader) ajax_loader.show();
		
		$[ops.method](form.attr('action'), form.serialize(), function(response) {
			$.with_json(response, ops.success, ops.error);
			
			form.data('x', false);
			if (ajax_loader) ajax_loader.fadeOutRemove();
		}, 'json');
	}
}

$.safeLinkPost = function(link, options) {
	var ops = {
		method 	   : 'post',
		success    : function(){},
		error 	   : function(){},
		use_loader : true,
		reset	   : true,
		al_where   : 'before',
		al_context : link,
		data	   : { authenticity_token: $.get_auth_token() }
	};
	$.extend(ops, options);

	var link 		= $(link);
	
	if (ops.use_loader)
		ajax_loader = $.new_ajax_loader(ops.al_where, ops.al_context);

	if (!link.data('x')) {
		link.data('x', true);

		if (ops.use_loader) 
			ajax_loader.show();

		$[ops.method](link.attr('href'), ops.data, function(response) {
			$.with_json(response, ops.success, ops.error);
			
			if (ops.reset)
				link.data('x', false);
			
			if (ops.use_loader) 
				ajax_loader.fadeOut();
		}, 'json');
	}
}

/******************************************* JQUERY PLUGINS *******************************************/
$.fn.disabler = function(d) { // master switch checkbox, disables all form inputs when unchecked
	var disablees = d || 'input, textarea, select, checkbox, radio';
	return this.each(function() {
		var $this = $(this);
		
		$this.data('enabled', $this.is(':checked'));
		$.disable($this, disablees);
		
		$this.change(function(){ $.disableToggle($this, disablees) });
	});
}

// watches for anchors in window.location that have valid a element id in spot1 of the hash (#[spot1]_spot2)
// toggle open the container with that id and if theres a valid id in spot2 scroll to on an anchor with id == spot2
$.fn.anchorDispatch = function() {
	var url_hash, listeningElement, anchor;
	
	url_hash = window.location.href.split('#')[1];
	if (!url_hash) 
		return false;
	
	if ($.validateAnimationAction(url_hash.split('_')[0])) 
		return false
	
	listeningElement = $('#' + url_hash.split('_')[0]);
	if (!listeningElement) 
		return false;

	if (url_hash.split('-')[1]) anchor = $('#' + url_hash.split('-')[1]);
	
	return this.each(function(i){
		if (this.id == listeningElement.attr('id')) {
			listeningElement.show();
			$('.collapseable', listeningElement).show().removeClass('hide');
			$('.toggle_action', listeningElement).addClass('toggle_down');
		}
		
		if (anchor) {
			$(document).scrollTo(anchor, 2000);
			$('#'+ url_hash.split('-')[0]).effect('highlight', { color: '#87c881' }, 7000);
		}
	});

} // END $.fn.anchorDispatch()

// click any where on a rowCheckable div to toggle the checkbox within the first child element
$.fn.rowCheckable = function() {
	return this.each(function() {
		var $this = $(this),
		 		checkbox = $('input[type=checkbox]', $this).eq(0);
		
		$this.live('click', function(e) { // trigger checkbox unless a link is clicked
			if (e.target.tagName == e.currentTarget.tagName) {
				checkbox.trigger('change').attr('checked', !checkbox.is(':checked'));
			}
		});
	});
}

// use a checkbox to switch between two containers. classes: .pane_0, .pane_1
$.fn.paneSwitcher = function() {
	return this.each(function() {
		var context = $(this).parent().parent().parent();
		this.checked ? $('#pane_0', context).hide() : $('#pane_1', context).hide();
		
		$(this).change(function() { // trigger checkbox unless a link is clicked
			$('.pane_switchable', context).slideToggle();
		});
	});
}

// use a checkbox to show/hide its parents next sibling div, focus on any child inputs there may be
$.fn.toggleDiv = function() {
	return this.each(function() {
		var $this = $(this);
		var sibling = $this.parent().next('.toggle_this');
		
		this.checked ? sibling.show() : sibling.hide();
		$this.change(function(){
			sibling.toggle(); 
			sibling.find('input, textarea, select').focus();
		});
	});
}

// converts an element (e.g. label) into a textfield when function is called, useful within a click or hover handler
$.fn.textFieldable = function(text_field_html, callback) {
	return this.each(function(){
		var $this 			= $(this),
				$text_field = $(text_field_html);

		$this.parent().html($text_field);
		$text_field.focus();
		
		// recall hinty
		$.bindPlugins();
		
		if (typeof callback == 'function') callback.call(this, $text_field);
	});
}

// oposite of textFieldable, but used exclusively when the original element is a label, used within a blur event handler
$.fn.fieldToLabel = function() {
	return this.each(function(){
			var $this = $(this),
					label = '<label for="'+ $this.attr('name') +'" class="block w110 small_round textFieldable">'+ $this.val() +'</label>';
			
			$this.parent().prepend(label);
			$this.remove();
	});
}

// hide element with a slide anim and remove from DOM
$.fn.slideUpAndRemove = function(speed) {
	if (typeof speed == 'null') speed = 300;
	
	return this.each(function(){
		var $this = $(this);
		$this.slideUp(speed, function(){ $this.remove(); });
	});
}

// animates from transparent to opaque on hover, css sets initial opacity
$.fn.animOpacity = function() {
	return this.each(function(){
		var $this				 = $(this),
				orig_opacity = $this.css('opacity');
				
		$this.hover(function(){
			$this.stop().animate({ 'opacity': 1 }, 300);
		}, function(){
			$this.stop().animate({ 'opacity': orig_opacity }, 150);
		});
	});
}

// attach a click event to divs that wrap a link to follow the href
$.fn.linkDiv = function() {
	return this.each(function(){
		var $this = $(this), href = $this.find('a').attr('href');
		$this.click(function(){ if (href) window.location = href; });
	});
}

// fill matching inputs with the param from its rel attr
$.fn.fillWithParam = function() {
	var params = window.location.href.split('?')[1];
	if (!params) return false;
	
	return this.each(function(){
		var $this = $(this), value = false, 
			attr  = $this.attr('param') || $this.attr('rel');
		
		$.each(params.split('&'), function(){
			if (this.split('=')[0] == attr) {
				value = this.split('=')[1];
				return;
			}
		});
		
		if (value) 
			$this.attr('value', decodeURIComponent(value.replace(/\+/g, '%20'))).removeClass('hint_text').attr('disabled', false);
		
		if ($this.hasClass('focus_me'))
			$this.focus();
	});
}

$.fn.appendParamAndGo = function() {
	return this.each(function(){
		var $this = $(this);
		
		$this.click(function(){
			var key   = $this.attr('rel').split('-')[0]
  				val   = $this.attr('rel').split('-')[1],
  				href	= window.location.href,
  				new_href = '',
  				has_param = href.indexOf('?') >= 0,
  				param = (has_param ? '&' : '?') + key +'='+ val;
			
			if(!val) return false;
			
			// replace any preexisting param values if the key is present
			if (href.indexOf(key) >= 0) {
				new_href = href.split(key)[0].replace(/\&$/, '') + param;
			} else {
				new_href = href + param
			}
			
			// go if its a different button that was clicked
			if (href.indexOf(val) < 0)
				window.location = new_href;
		});
	});
}

// click a link to open a hidden div near by
$.fn.openDiv = function() {
	return this.each(function(){
		var $this = $(this),
			div_to_open = $this.attr('rel');
				
		$this.click(function() {
			$('#'+div_to_open).slideToggle(600);
			$this.parent('.bg').toggleClass('expanded');
			if ($this.hasClass('toggle_right')) $this.toggleClass('toggle_down');

			return false;
		});
	});
}

$.fn.accordion = function() {
	return this.each(function() {
		$(this).click(function() {
			var $this = $(this),
				info_div = $('.info', $this.parent().parent());
					
			$('a', $this.parent().parent().parent()).removeClass('active');
			$('.info').slideUp();
			
			if (info_div.is(':hidden')) {
				$this.addClass('active');
				info_div.slideDown().children().hide().fadeIn('slow');
			} else {
				$this.removeClass('active');
				info_div.slideUp();
			}
			
			return false;
		})
	});
}

$.fn.tabular_content = function() {
	function what_action(el) {
		if (el.hasClass('slide')) 	  return ['slideUp', 'slideDown', 'slow'];
		else if (el.hasClass('fade')) return ['fadeOut', 'fadeIn', 'slow'];
		else 						  return ['hide', 'show', null];
	}
	
	return this.each(function(){
		var $this = $(this), // the container
			tabs = $('.tabular', $this).length > 0 ? $('.tabular', $this) : $('.tabular'),//$this.attr('data-tabs-id') ? $('#'+ $this.attr('data-tabs-id')) : ($('.tabular', $this).length > 0 ? $('.tabular', $this) : $('.tabular')), // ul
			panels = $('.tab_content', $this), // tab content divs
			action = what_action($this),
			hide   = action[0],
			show   = action[1],
			speed  = action[2];
		
		tabs.find('li').eq(0).addClass('active');
		panels.eq(0).show();
				
		$('a', tabs).click(function(){
			panels[hide](speed).removeClass('active');
			$('li, a', tabs).removeClass('active');
			
			$(this).addClass('active').parent().addClass('active');
			$('#'+ $(this).attr('rel'), $this)[show](speed).addClass('active');
			
			return false;
		});
	});
}

// make matched elements act as a submit button
$.liveSubmit = function() {
	$.each(arguments, function(){
		$(eval("'"+ this +"'")).live('click', function(){
			$(this).parents('form').submit();
			return false;
		});
	});
}

$.fn.clickOnLoad = function() {
	return this.each(function(){
		$(this).click();
	});
}

// as the user types in numbers, the input is formated as XXX-XXX-XXXX
$.fn.formatPhoneNum = function() {
	//if ($.browser.msie) return;
	return this.each(function(){
		var $this = $(this);
		
		$this.blur(function() {
			var len = $this.val().length,
				val = $this.val(),
				formatted;
				
			switch (len) {
				case 10:
					formatted = val.substring(0,3) +'-'+ val.substring(3,6) +'-'+ val.substring(6,10);
					$this.val(formatted);
				break;
				case 11:
					formatted = val.substring(0,1) +'-'+ val.substring(1,4) +'-'+ val.substring(4,7) +'-'+ val.substring(7,11);
					$this.val(formatted);
				break;
			}
		});
	});
}

// save a form's state to be used by the date_changed method
$.fn.save_state = function() {
	return this.each(function(){
		var form = $(this);
		form.data('state', form.serialize());
	});
}

// check previously saved state against the current one and return true if changed
$.fn.state_changed = function() {
	var prev_state = this.data('state');
	if (!prev_state) return false;
	return prev_state != this.serialize();
}

// a textual loading animation
$.fn.txt_loader = function(options) {
	function increment_txt(el, txt) {
		var t = el.text();
		el.text(t + txt);
	}
	
	return this.each(function() {
		var $this = $(this).text(''),
			count = 0,
			settings = {
				txt : '.',
				interval : 1000,
				limit : 3
			};
		
		if (typeof options == 'undefined')
			var options = {}
		
		$.extend(settings, options);
		
		setInterval(function() {
			if (count < settings.limit) {
				increment_txt($this, settings.txt);
			} else {
				$this.text('');
				count = -1;
			}
			
			count++;
		}, settings.interval);
	});
}

$.fn.shimmy = function(parent, ops) {
	var options = {
			anchor: 'left'
		},
		parent = $(parent),
		getScrollXY = function() {
			var scrOfX = 0, scrOfY = 0;

			if (typeof window.pageYOffset == 'number') {
				//Netscape compliant
				scrOfY = window.pageYOffset;
				scrOfX = window.pageXOffset;
			} else if (document.body && (document.body.scrollLeft || document.body.scrollTop)) {
				//DOM compliant
				scrOfY = document.body.scrollTop;
				scrOfX = document.body.scrollLeft;
			} else if (document.documentElement && (document.documentElement.scrollLeft || document.documentElement.scrollTop)) {
				//IE6 standards compliant mode
				scrOfY = document.documentElement.scrollTop;
				scrOfX = document.documentElement.scrollLeft;
			}

			return [scrOfX, scrOfY];
		},
		shimmy_meow = function(el, el_offset, el_pos, el_height, parent_height, btm_from_top, pad) {
			var window_offset = getScrollXY(),
				diff 		  = (window_offset[1] + 10) - el_offset.top,
				btm_plus_diff = btm_from_top + diff,
				btm_pos;
		
			if (diff >= 0 && parent_height >= btm_plus_diff) {		// moving with the window
				if ($.browser.SafariMobile) {
					el.css({ 'position': 'absolute', 'top': diff });
				} else {
					el.css({ 'position': 'fixed', 'top': 0 });
				}
			
			} else if (diff >= 0 && parent_height <= btm_plus_diff) { // hit the bottom of the container
				btm_pos = parent_height - el_pos.top - el_height - pad;
				el.css({ 'position': 'relative', 'top': btm_pos +'px' });
			} else { 														// resting up top like normal
				el.css('position', 'relative');
			}
		}
	
	$.extend(options, ops || {});
	
	return this.each(function() {
		var $this = $(this).css({ 'position': 'relative', 'top': '0' }),
			pad	  = 30,
			this_offset	= $this.offset(),
			this_height = $this.height(),
			parent_height = parent.height(),
			this_pos 	= $this.position(parent),
			btm_from_top = this_pos.top + this_height + pad;
		
		shimmy_meow($this, this_offset, this_pos, this_height, parent_height, btm_from_top, pad);
		
		$(window).scroll(function() {
			shimmy_meow($this, this_offset, this_pos, this_height, parent_height, btm_from_top, pad);
		});
	});
}

$.fn.slideUpRemove = function(speed, callback) {
	$.fn.animAndRemove.call(this, 'slideUp', speed, callback);
}

$.fn.fadeOutRemove = function(speed, callback) {
	$.fn.animAndRemove.call(this, 'fadeOut', speed, callback);
}

$.fn.animAndRemove = function(anim, speed, callback) {
	return this.each(function() {
		$(this)[anim](speed || 'fast', function() { 
			$(this).remove();
			
			if (typeof callback == 'function') 
				callback.call(this);
		});
	});
}

// focus on next input when current input reaches maxlength
$.fn.autoNext = function() {
	return this.each(function() {
		var $this = $(this);
		if (typeof $this.attr('maxlength') == 'undefined') return;
		
		var form = $this.parents('form'),
			inputs = $('input, textarea, select', form);
		
		$this.keyup(function() {
			var input = $(this);
			
			if (input.val().length == input.attr('maxlength') && input.val() != input.attr('title')) {
				input.blur();
				inputs.eq(inputs.index(input) + 1).focus();
			}
		});
	});
}

$.fn.fadeOutLater = function(fade_speed, timeout, callback) {
	return this.each(function() {
		var $this = $(this);
		
		setTimeout(function() {
			$this.fadeOut(fade_speed, callback);
		}, timeout || 1000);
	});
}

// proxy a method to a jquery dom object from *this* jquery dom object;
$.fn.aProxy = function() {
	return this.each(function() {
		var $this = $(this),
			hash = this.href.split('#')[1];
			
		if (hash) {
			var params = hash.split('-'),
				action = params[0],
				element = $('#'+ params[1]);
			
			if (element) {
				$this[action](function() {
					element.trigger(action);
					return false;
				});
			}
		}
	});
}

// display the word count in target_span of a text field or area
$.fn.displayWordCount = function(callback) {
	if (typeof callback != 'function') callback = function(){};
	
	function extract_words(str) {
		var words = str.replace(/\s+/g, ' ').split(' ');
		return $.map(words, function(w) { if (w != '') return w; });
	}
	
	function update_display(display, count) {
		display.text(count +' word'+ (count == 1 ? '' : 's'));
		callback.call(this, count, display);
	}
	
	return this.each(function() {
		var $this 	= $(this),
			target  = $this.attr('data-target') || 'word_count',
			display = $('#'+ target),
			count 	= extract_words(this.value).length;
		
		update_display(display, count);
		
		$this.keyup(function() {
			count = extract_words(this.value).length;
			update_display(display, count);
		});
	});
}

// implements a "click to view number" link 
$.fn.phoneNumHider = function() {
	return this.each(function() {
		$(this).click(function() {
			var $this = $(this),
				num = $this.attr('data-num');
				
			if ($this.text() == num) return false;
			$this.text(num);
			
			$.safeLinkPost($this, {
				reset	   : false,
				use_loader : false
			});
			
			return false;
		});
	});
}

$.fn.ieOnly = function() {
	return this.each(function() {
		if (!$.browser.msie) $(this).hide();
	});
}

// fetch a partial after the page loads. Useful for partials that take long to render
$.fn.delayedRender = function() {
	return this.each(function() {
		var $this = $(this),
			partial = $this.attr('data-partial'),
			locals = $this.attr('data-locals'),
			ajax_loader = $.new_ajax_loader('html', this, 'ajax-loader-long-green.gif').show();
		
		$.getJSON('/ajax/get_partial?partial='+ partial + locals, function(response) {
			$.with_json(response, function(data) {
				$this.html(data);
				
				// for the activity table
				$('.bar_graph_cells').barGraphCells();
			});
		});
	});
}

// add a background to each table cell to make the column look like a sideways bar graph
$.fn.barGraphCells = function() {
	return;
	function get_cell_bg_width(td, col_data) {
		var $td   = $(td),
			max   = get_cell_vals(col_data).max(),
			width = 0;
		
		$.each(col_data, function() {
			if (this.cell == td)
				width = this.val / max * 100;
		});
		
		return width;
	}
	
	function get_cell_vals(col_data) {
		var cell_vals = [];
		
		$.each(col_data, function() {
			cell_vals.push(this.val)
		});
		
		return cell_vals;
	}
	
	return this.each(function() {
		var $this 	 = $(this),
			tds 	 = $this.children('tr').children('td')
			col_data = {};
		
		// get the values in each cell 
		tds.each(function() {
			var td = $(this).css('position', 'relative'),
				ind = td.index(),
				val = parseInt(td.children('.n').css({ 'position': 'relative', 'z-index': 2 }).text());
			
			col_data[ind] ? col_data[td.index()].push({ 'cell': this, 'val': val }) : col_data[td.index()] = [{ 'cell': td, 'val': val }];
		});
		
		// add the background for each cell with
		tds.each(function() {
			var td = $(this),
				width = get_cell_bg_width(this, col_data[td.index()]);
			td.css({ background: 'url(/images/ui/blue-bg.png) repeat-x '+ width +'% 0' });
		})
	});
}

/******************************************* SUCCESS CALLBACKS *******************************************/

$.toggleHelptext = function(clickedLink) {
	// if the link has a rel attribute, we are going to show the inner div of the container with class == rel
	$('.inner', '.' + clickedLink.attr('rel')).stop().slideToggle().toggleClass('hide');
	$('.ajax_action', clickedLink.parent()).toggleClass('hide');
	clickedLink.parent('.helptext_options').toggleClass('bg_green');
}

/******************************************* EVENT HANDLERS *******************************************/
// used to rebind the plugin to elements loaded into the DOM dynamically or through AJAX
$.bindPlugins = function() {
	$('.hintable').hinty(); // all matched inputs will display their title attribute
	$('form:not(.ie_no_xhr)').formBouncer(); // form validation, fields with supported validation classes will be processed
}

/**************** some utility functions ****************/

// fill up the field_name select tag in the forms new/edit page
function fillInFormFieldSelectLists(resource) {
	var $field_name_selects = $('.field_attr_name', '#form_builder');
	
	if ($field_name_selects.length) {
		// show progress indicator in field name select lists
		$.injectOptionsInSelectLists($field_name_selects, '<option>Loading..</option>');

		// get the options and then inject them as option tags into all the select lists
		$.getModelAttributes(resource, function(attributes){
			$.injectOptionsInSelectLists($field_name_selects, $.option_tags_from_array(attributes));

			// in the form edit page, triggering this custom event invokes the function that selects the correct field name
			// in each of the fields field_name select list
			$field_name_selects.trigger('filled');
		});
	}
}

function capitalize(string) {
	if (typeof string != 'undefined') {
		return string.substring(0,1).toUpperCase() + string.substring(1);
	}
}

function titleize(string) {
	if (typeof string != 'undefined') {
		var parts = string.split(' '),
			titleized = '';
	
		for (var i = 0, len = parts.length; i < len; i++) {
			titleized += capitalize(parts[i])
			if (i < len) titleized += ' ';
		}
	
		return titleized;
	}
}

function default_pop_up_options(options) {
	return {
		title: 	   options.title,
		width: 	   options.width || 785,
		height:    options.height,
		resizable: (typeof options.resizable == 'undefined' ? false : options.resizable),
		modal: 	   (typeof options.modal == 'undefined' ? true : options.modal),
		close: 	   options.close || function() {
			$('.ajax_loader').hide();
			$(this).dialog('destroy').remove();
		}
	};
}

// pulls the pop_up template and runs the callback
// params requires sub_partial. e.g params.sub_partial 
function get_pop_up_and_do(options, params, callback) {
	var params = params || {}
	params.partial = params.partial || '/shared/pop_up';
	
	$.get('/ajax/get_multipartial', params, function(response) {
		var pop_up = $(response).dialog({
			title: 	   options.title,
			width: 	   options.width || 785,
			height:    options.height,
			resizable: false,
			modal: 	   options.modal,
			close: 	   function() {
				$('.ajax_loader').hide();
				$(this).dialog('destroy').remove();
			}
		});
		
		if (typeof callback == 'function') 
			callback.call(this, pop_up);
	});
}

function get_partial_and_do(params, callback) {
	var params = params || {}
	params.partial = params.partial || '/shared/pop_up_box';
	
	$.get('/ajax/get_partial', params, function(response) {
		if (typeof callback == 'function') callback.call(this, response);
	});
}

/**************** slide show and workflow object *******************/

// Simple animated slideshow, takes an options object which defines the slides, actions and slide objects, see tips_show
var GreyShow = function(options) {
	var self = this;
	this.context 	= options.context;
	this.slides  	= options.slides;
	this.delay 	 	= options.delay;
	this.num_slides = options.slides.length;
	this.time_int 	= 0;
	
	this.start = function() {
		self.current = 0;
		self.startSlide();
	}
	
	this.startSlide = function() {
		if (typeof self.slides[self.current].start == 'function') 
			self.slides[self.current].start.call(this, self);
		
		self.hidePrevSlide();
		self.slide_objects = self.slides[self.current].objects;
		self.current_object = 0;
		self.runObject(self.slide_objects[0]);
	}
	
	this.hidePrevSlide = function() {
		var prev = self.current == 0 ? self.num_slides-1 : self.current-1;
		
		for (var i = 0, len = self.slides[prev].objects.length; i < len; i++) {
			var $object = $('#'+ self.slides[prev].objects[i].id);
			$object.fadeOut(900);
		}
	}
	
	this.runObject = function(o) {
		var $object = $('#'+ o.id);
		$object.children().hide();
		
		if (typeof o.callback == 'function')
			o.callback.call(this, $object, self);
		
		$object[o.action](o.speed, function() {
			self.nextObject(o);
		});
	}
	
	this.nextObject = function(o) {
		self.current_object++;
		
		if (self.slide_objects[self.current_object]) {
			setTimeout(function(){
				self.runObject(self.slide_objects[self.current_object]);
			}, o.delay);
			
		} else if (typeof self.slides[self.current].end == 'function') {
			setTimeout(function(){
				self.slides[self.current].end.call(this, self);
			}, self.delay);
		}
	}
	
	this.gotoSlide = function(n) {
		self.current = n;
		
		if (n == self.num_slides) {
			self.current = 0;
			self.gotoSlide(0);
			
		} else self.startSlide();
	}
}

// first implemented for the client sign up page (add your facility), now also used for the US Map and the Reservation process
var GreyWizard = function(container, settings) {
	var self = this;
	self.form_data 	= {};
	self.settings 	= settings;
	self.slide_data = settings.slides;
	self.slides_class = settings.slides_class || 'workflow_step',
	self.nav_id		= settings.nav_id || 'workflow_nav',
	self.num_slides = self.slide_data.length;
	self.workflow 	= $(container);
	self.title_bar 	= $('#ui-dialog-title-pop_up', self.workflow.parent().parent());
	self.width	  	= self.workflow.width();
	self.height   	= self.workflow.height();
	self.slides   	= $('.'+ self.slides_class, self.workflow).each(function(){ $(this).data('valid', true); });
	self.spacer		= settings.spacer || 100; // to give the slides space between transitions
	self.pad_left	= settings.pad_left || 15; // to align the slides away from the left wall of the workflow wrapper
	self.slide_speed = settings.slide_speed || 1500,
	self.btn_speed  = settings.btn_speed || 900,
	self.fade_speed = settings.fade_speed || 1000,
	
	this.begin_workflow_on = function(step) {
		self.workflow.parents('#pop_up').show();
		self.nav_bar  	   = $('#'+ (self.nav_id || 'workflow_nav'), self.workflow).children().hide().end(); // set initial nav visibility
		self.current  	   = step || 0;
		self.current_slide = $('#'+ self.slide_data[self.current].div_id, self.workflow);
		self.skipped_first = step > 0 ? true : false;
		
		self.set_slides();
		self.set_nav();
		
		// bind events
		self.nav_bar.find('.next, .skip').click(self.next);
		self.nav_bar.find('.back').click(self.prev);
		
		if (self.title_bar.length) self.title_bar.change(function(){
			if (self.slide_data[self.current].pop_up_title) $(this).text(self.slide_data[self.current].pop_up_title);
			else $(this).text(self.settings.title);
		}).trigger('change');
		
		if (typeof self.slide_data[self.current].action == 'function') self.slide_data[self.current].action.call(this, self);
	}
	
	// TODO: find jquery scrolling slider to make this animation smoother
	this.set_slides = function() {
		if (typeof set_display == 'undefined') set_display = false;
		
		// arrange the slides so they are horizontal to each other, allowing for arbitrary initial slide number
		/*/self.slides.each(function(i) {
			// calculate the left position so that the initial slide is at 0
			var left = -((self.width + self.spacer) * (self.current - i))
			$(this).css({ position: 'absolute', top: 0, left: (left + self.pad_left) +'px' });
		});*/
		
		// give the slides some space between each other
		self.slides.css({ 'margin-right': self.spacer +'px' });
		
		// jquery tools scrollable
		self.workflow.children('.items').width(self.num_slides * (self.width + self.spacer + self.pad_left) + 3);
		self.workflow.scrollable({ speed: 1000, circular: false, next: '.none', prev: '.none' }).data('scrollable').seekTo(self.current, 1);
		
		if (self.settings.set_slides) { // build the slide tabbed display
			self.slide_steps = $('<div id="slide_nav" />').appendTo(self.workflow.parent())
			var step_display 	 = '',
				active_slides 	 = self.num_slides - (self.skipped_first ? 1 : 0),
				slide_tab_width  = parseInt(100 / active_slides) - (self.skipped_first ? 3 : 2.68), // tested in FF 3.6
				done_skipping 	 = false;
			
			for (var i = 0; i < self.num_slides; i++) {
				if (self.skipped_first && !done_skipping) {
					done_skipping = true; 
					continue; 
				}
				
				step_display += '<div id="tab_step_'+ i +'" class="slide_display '+ (self.current == i ? ' active' : '') + (i == (self.skipped_first ? 1 : 0) ? ' first' : (i == self.num_slides-1 ? ' last' : '')) +'" style="width:'+ slide_tab_width +'%;">'+
									'<p>Step '+ (i+1) +'</p>'+
									(typeof self.slide_data[i].slide_display != 'undefined' ? self.slide_data[i].slide_display : '') +
								'</div>';
			}
			self.slide_steps.html(step_display);
		}
	}
	
	this.set_nav = function() {
		if (typeof self.slide_data[self.current] != 'undefined') {
			$.each(self.slide_data[self.current].nav_vis, function(){ // get the current slide's nav actions
				var btn = $('.'+ this[0], self.nav_bav),
					action = this[1];
			
				if (action) {
					if (typeof action == 'function') action.call(this, btn, self); 
					else if (typeof action == 'string') btn[action]((action == 'hide' || action == 'show' ? null : self.btn_speed));
				}
			});
		}
		
		if (self.settings.set_slides) setTimeout(function() {
			$('.slide_display', self.workflow.parent()).removeClass('active');
			$('#tab_step_'+ self.current, self.workflow.parent()).addClass('active');
		}, self.fade_speed);
	}
	
	this.may_move = function(step) {
		var validated = true;
		
		if (typeof self.slide_data[self.current].validate == 'function' && step > 0) 
			validated = self.slide_data[self.current].validate.call(this, self);
		
		return validated && ((self.current + step) >= 0 && (self.current + step) < self.num_slides) && (step < 0 || (step > 0 && !$('.next', self.workflow).data('done')));
	}
	
	this.next = function(step) {
		self.move(typeof(step) == 'number' ? step : 1);
		return false;
	}
	
	this.prev = function(step) {
		self.move(typeof(step) == 'number' ? step : -1);
		return false;
	}
	
	this.move = function(step) {
		if (self.may_move(step)) {
			//self.set_slides(); // this prevents the animation from knocking the positions off track if a user clicks nav buttons erratically
			if (step > 0) $('#tab_step_'+ self.current, self.workflow.parent()).addClass('done');
			self.current += step;
			
			/*self.slides.each(function(i){
				var left = (self.width + self.spacer) * (-step) + parseInt($(this).css('left'));
				$(this).stop().animate({ left: left + 'px' }, self.slide_speed);
			});*/
			
			self.workflow.data('scrollable').seekTo(self.current);
			
			self.set_nav();
			self.title_bar.trigger('change');
			
			if (typeof self.slide_data[self.current].action == 'function')
				self.slide_data[self.current].action.call(this, self);
			
		} else if (self.current == self.num_slides-1) {
			if (typeof(self.settings.finish_action) == 'function')
				self.settings.finish_action.call(this, self);
				
			else if (self.settings.finish_action == 'close')
				self.workflow.parent().dialog('close').remove();
		} 
	}
}

/**************** adapter functions ****************/

// Ajaxful ratings uses Prototype's Ajax object, since we don't use Prototype, create it and wrap a jQuery function in it
var Ajax = function(){};
Ajax.Request = function(url, params) {
	$.post(url, params.parameters);
}

String.prototype.replaceAll = function(find, replace) {
    var temp = this, index = temp.indexOf(find);
	
    while (index != -1) {
        temp = temp.replace(find, replace);
        index = temp.indexOf(find);
    }

    return new String(temp);
}

function capitalize_addr(addr) {
	if (typeof addr != 'string') return;
	var capped = '',
		parts = addr.split(' '),
		dirs = ['ne', 'nw', 'se', 'sw'];
	
	$.each(parts, function(i) {
		if ($.inArray(this.toLowerCase(), dirs) >= 0)
			capped += this.toUpperCase();
		else
			capped += capitalize(this);
		
		if (i < parts.length - 1) capped += ' ';
	});
	
	return capped;
}

// Greyresults 
// Diego Salazar, Grey Robot, Inc. April, 2010
// functionality specific to the listings results of USSelfStorageLocator.com
// for both back end (client control panel) and front end (search results)

$(function(){	
	$('a', '#sl-tabs-nav').click(function() {
		window.location.hash = this.href.split('#')[1];
	});

	if ($.on_page([['profile, show', 'listings']])) {
		if (window.location.hash != '') {
			setTimeout(function() { // wait for tabular_content to attach the click handler to the tabs, then trigger it
				$('a[href="'+ window.location.hash +'"]', '#sl-tabs-nav').click();
			}, 1);
		}
	}
	
	/*
	 * BACK END, listing owner page methods
	 */
	
	var listings = $('.listing', '#client_listing_box');
	if (listings.length > 0) {
		listings.each(function() {
			$('.progressbar', this).progressbar({ value: parseInt($('.percent', this).text()) });
		});
	}
	
	$('a', '#address_sort').live('click', function() {
		var $this = $(this),
			listings = $('.listing', '#client_listing_box');
			
		$.sort_stuff($this, listings, '.inner', function(a, b) {
			var a1 = parseInt($('.rslt-contact p', a).text()),
				b1 = parseInt($('.rslt-contact p', b).text());

			return a1 > b1 ? (stuff_sort_inverse ? 1 : -1) : (stuff_sort_inverse ? -1 : 1);
		});
		
		return false;
	});
	
	$('form.size_form', '#unit_sizes').live('submit', function() {
		var form = $(this).runValidation(),
			ajax_loader = $('.ajax_loader', form);
		
		if (form.data('valid') && !form.data('saving')) {
			form.data('saving', true);
			ajax_loader.show();
			$('.cancel_link', form).hide();
			
			$.post(form.attr('action'), form.serialize(), function(response) {
				$.with_json(response, function(data) {
					var new_size = $(data);
					form.after(new_size);
					$('.sl-table', new_size).effect('highlight', 3000);
					
					if (form.attr('data-edit') == '1') form.remove();
				});
				
				form.data('valid', null);
				form.data('saving', false);
				ajax_loader.hide();
			});
		}
		
		return false;
	});
	
	$('.cancel_link', '.size_form').live('click', function() {
		$(this).parents('.size_form').fadeOutRemove();
		return false;
	});
	
	$('.edit_size', '.sl-table-wrap').live('click', function() {
		var $this = $(this),
			size = $this.parents('.sl-table-wrap'),
			ajax_loader = $('.ajax_loader', $this.parent().next()).show();
			delete_link = $('.delete_link', size).hide();
		
		get_partial_and_do({ partial: 'sizes/form', model: 'Listing', id: $('#listing_id').val(), sub_model: 'Size', sub_id: $this.attr('data-size-id') }, function(response) {
			$.with_json(response, function(partial) {
				var form = $(partial),
					price = $('#size_price', form);
				
				price.val((parseFloat(price.val()) / 100.0).toFixed(2)).focus();
				size.after(form);
				size.hide();
				
				$('#size_price', form).val(parseInt($('#size_price', form).val()));
				
				$('.cancel_link', form).click(function() {
					ajax_loader.hide();
					delete_link.show();
					form.hide();
					size.show();
					return false;
				});
			});
		});
		
		return false;
	});
	
	$('.delete_link', '.sl-table-wrap').live('click', function() {
		var $this = $(this),
			ajax_loader = $('.ajax_loader', $this.parent());
			
		$.greyConfirm('Are you sure you want to delete this unit size?', function() {
			$this.hide();
			ajax_loader.show();
			
			$.post($this.attr('href'), { _method: 'delete' }, function(response) {
				$.with_json(response, function(data) {
					$this.parents('.sl-table-wrap').fadeOutRemove();
				});
			});
		});
		
		return false;
	});
	
	$('.select_predefined_size', '#sl-tabs-predefined-sizes-in').live('click', function() {
		$(this).parents('.sl-table').click();
		return false;
	});
	
	$('.sl-table', '#sl-tabs-predefined-sizes-in').click(function() {
		var predef = $(this).parent(),
			predef_id = predef.attr('id').replace('PredefinedSize_', ''),
			ajax_loader = $('.ajax_loader', predef);
		
		if (!predef.data('adding')) {
			predef.data('adding', true);
			ajax_loader.show();
			
			$.post('/listings/'+ $('#listing_id').val() +'/add_predefined_size', { 'predef_id': predef_id }, function(response) {
				$.with_json(response, function(data) {
					var size = $(data);
					$('.uncollapse', '#sl-tabs-sizes-in').append(size);
					$('.sl-table', size).addClass('active').effect('highlight', 1500).find('#size_price').focus();
				});
				
				predef.data('adding', false);
				ajax_loader.hide();
			});
		}
	});
	
	$('#request_review_form').live('submit', function() {
		var form = $(this).runValidation(),
			ajax_loader = $('.ajax_loader', form);
		
		$('.success_msg', form).remove();
		
		if (form.data('valid') && !form.data('sending')) {
			form.data('saving', true);
			ajax_loader.show();
			
			$.post(form.attr('action'), form.serialize(), function(response) {
				$.with_json(response, function(data) {
					form[0].reset();
					// this refills the hint
					$('textarea', form).each(function() { $(this).focus().blur(); });
					ajax_loader.before("<p class='success_msg'>Your message was sent!</p>");
				});
				
				form.data('sending', false);
				ajax_loader.hide();
			});
		}
		
		return false;
	});

	// address and specials boxes, convert to form and handle ajax post
	$('.attr_edit', '.authenticated').live('click', function(){
		var $this 	   = $(this).css('display', 'inline'),
			container  = $this.parent(),
			rel 	   = $this.attr('rel'),
		 	cancel_btn = $('.cancel_btn', $this.parent());

		if ($this.text() == 'Edit') {
			cancel_btn.show();
			$this.text('Save').data('saving', false);
			
			$('.attr_wrap', container).children('.field_group').each(function(){
				var model = $(this).attr('rel');
				
				$('.value', this).each(function(){
					var field = $(this).hide(), attr = field.attr('rel');
					field.after('<input type="text" name="'+ model+ '['+ attr +']" class="small_text_field i '+ attr +'" value="'+ field.text() +'" title="'+ capitalize(attr.replaceAll('_', ' ')) +'" />');
				});
			});
			
			cancel_btn.click(function(){
				$this.text('Edit').data('saving', false).attr('style', ''); // this allows the edit link to hide when mouse is not hovered over the container, see the css styles for #sl-fac-detail-in-edit
				cancel_btn.hide();
				$('.value', container).show();
				$('input.i', container).remove();
				return false;
			});

		} else if ($this.text() == 'Save' && !$this.data('saving')) {
			$this.data('saving', true);
			$('.ajax_loader', container).show();

			var hidden_form = $('form[rel='+ rel +']', container);
			$.clone_and_attach_inputs('input.i', container, hidden_form);

			$.post(hidden_form.attr('action'), hidden_form.serialize(), function(response){
				$.with_json(response, function(data){
					$('input.i', container).each(function(){
						var input = $(this),
							val	  = input.val();

						input.prev('.value').text(val).show();
						input.remove();
					});

					$this.text('Edit').attr('style', ''); // this allows the edit link to hide when mouse is not hovered over the container, see the css styles for #sl-fac-detail-in-edit
					cancel_btn.hide();
				});

				$this.data('saving', false);
				$('.ajax_loader', container).hide();
			});
		}

		return false;
	});
	
	// Amenities and Specials
	$('.amenity input', '#tab3').button().click(function(){
		var $this = $(this), form = $this.parents('form.amenity'), 
			ajax_loader = $.new_ajax_loader('after', this).show();
		
		$.post(form.attr('action'), function(response) {
			$.with_json(response);
			ajax_loader.hide();
		}, 'json');
	});
	
	// add custom feature
	$('input[type=text]', '#new_facility_feature').focus(function(){
		$(this).next('#facility_feature_submit').show('fast');
	});
	$('input[type=text]', '#new_facility_feature').blur(function(){
		var $this = $(this);
		setTimeout(function(){ $this.next('#facility_feature_submit').hide('fast') }, 300);
	});
	$('#new_facility_feature').submit(function(){
		var form = $(this);
		
		$.post(form.attr('action'), form.serialize(), function(response){
			$.with_json(response, function(data) {
				$.log(data);
			});
		});
		
		return false;
	});
	
	$('.copy_all a').live('click', function() {
		var $this = $(this).fadeTo(600, .5);
			
		if (!$this.data('saving')) {
			$.greyConfirm('Are you sure you want to copy this to your other facilities?', function() {
				$this.data('saving', true);
				var ajax_loader = $.new_ajax_loader('after', $this).show().css({ 'float': 'left', 'margin': '0 10px' });

				$.post($this.attr('href'), function(response) {
					$.with_json(response, function(data) {
						$this.parent().after('<span class="success_msg" style="float:left;margin:0 10px">Saved!</span>');

						setTimeout(function() {
							$('.success_msg', $this.parent()).fadeOutRemove(1000);
						}, 2000);
					});

					$this.data('saving', false)
					$this.fadeTo(300, 1);
					ajax_loader.hide();
				}, 'json');
			});
		}
		
		return false;
	});
	
	/*
	 * FRONT END, results page
	*/
	
	// narrow search form sliders
	$('.slider').each(function(){
		var $this = $(this),
			value = $('.slider_val', $this.parent()).val();

		$this.slider({
			max: 50,
			min:5,
			step: 5,
			animate: true,
			value: value,
			start: function(e, ui) {
				var slider = $('.slider_val', $(e.target).parent());
				if (slider.attr('disabled')) slider.attr('disabled', false);
			},
			slide: function(e, ui) {
				$('.slider_val', $(this).parent()).val(ui.value);
			}
		});
	});
	
	$('li.enabled', 'li.rslt-price').live('click', function() {
		var $this = $(this),
			check = $('input.unit_size', $this.parent());
		
		check.attr('checked', true);
		$('li.enabled', $this.parent()).removeClass('selected');
		$this.addClass('selected');
	});
	
	$compare_btns = $('input[name=compare]', '.listing');
	$compare_btns.live('click', function(){
		var compare	= $(this), listing = compare.parents('.listing'),
			blank_compare_href = $('.compare a', '.listing').eq(0).attr('href'),
			id = compare.val(), marker, compare_links;
		
		if (typeof Gmaps_data != 'undefined') marker = getMarkerById(id);
		
		if (compare.is(':checked')) {
			listing.addClass('active');
			
			compare_links = $('.compare a', '.listing.active');
			if (compare_links.length >= 2) {
				$('a', '.active .compare').show();
				$('label', '.active .compare').hide();
			}
			
			if (marker) {
				marker.GmapState = 'selected';
				highlightMarker(marker);
			}
		} else {
			$('a', compare.parent()).hide();
			$('label', compare.parent()).show();
			
			compare_links = $('.compare a', '.listing.active');
			if (compare_links.length <= 2) {
				$('a', '.active .compare').hide();
				$('label', '.active .compare').show();
			}
			
			listing.removeClass('active');
			
			if (marker) {
				marker.GmapState = '';
				unhighlightMarker(marker);
			}
		}
	});
	
	$('input[name=compare]', '.compare').each(function() {
		var $this = $(this);
		if ($this.is(':checked')) $this.attr('checked', false);
	});
	
	$('a', '.compare').live('click', function() {
		var $this 		= $(this).hide(),
			orig_href 	= $this.attr('href'),
			compares 	= $('input:checked', '.compare'),
			ajax_loaders = [],
			ids 		= [];
		
		compares.each(function() {
			var context    = $(this).parents('.listing'),
				special_id = $('.special_txt', context).attr('data-special-id'),
				size_id    = $('ul.dnp input.unit_size:checked', context).val(),
				cmp_text   = $('.compare a', context).hide();
			
			ajax_loaders.push($.new_ajax_loader('after', cmp_text).show());
			ids.push(this.value +'x'+ size_id +'x'+ special_id);
		});
		
		this.href += ids.join('-');
		
		$.getJSON(this.href, function(response) {
			$.with_json(response, function(data) {
				var pop_up = $('<div id="pop_up">'+ data['html'] +'</div>').dialog(default_pop_up_options({ 
					title: 'Comparing '+ compares.length +' Facilities',
					width: 'auto',
					height: 'auto',
					modal: true
				})),
				ajax_loader = $('.ajax_loader', pop_up).show();
				
				$.calculatePrice(pop_up);
				$.setGmap(data.maps_data, 'compare_map');
			});
			
			$this.attr('href', orig_href);
			compares.each(function() { $('a', $(this).parent()).show() });
			$.each(ajax_loaders, function() { $(this).hide() });
		});
		
		return false;
	});
	
	// update the url of the rent it btns and recalculate price
	$('.special_txt').live('switched', function() {
		var spec_txt = $(this),
			ajax_loader = $.new_ajax_loader('html', $('#calcfor_'+ spec_txt.attr('data-listing-id'))).show(),
			btns = $('.calc_params', '#'+ spec_txt.attr('data-context'));
		
		btns.each(function() {
			var special_id = spec_txt.attr('data-special-id');
			this.href = this.href.replace(/\&special=\d+/, '&special='+ special_id);
			$(this).attr('data-special-id', special_id);
		});
		
		$.calculatePrice('#calc_params_for_'+ spec_txt.attr('data-listing-id'));
	});
	
	$('.specializer', '.specializer_wrap').live('click', function() {
		var $this = $(this),
			specials = $('.more_specials', $this.parent());
	
		if ($this.text() == 'more') {
			$this.text('less');
			specials.addClass('show_specials').show().css({ 'top': '-'+ specials.height() +'px', 'right': '-'+ (specials.outerWidth() / 2) +'px' });
		} else {
			$this.text('more');
			specials.hide().css('right', 0);
		}
		
		return false;
	});
	
	$('.special_txt', '.more_specials').live('click', function() {
		var $this = $(this),
			context = $this.parents('.specializer_wrap'),
			active_special = $('.special_txt.active', context),
			special_clone = active_special.clone().removeClass('active'),
			more = $this.parents('.more_specials').hide().css('right', 0);;
		
		active_special.replaceWith($this.clone().addClass('active'));
		$this.replaceWith(special_clone);
		$('.specializer', more.parent()).text('more');
		$('.special_txt.active', context).trigger('switched');
	});

	/* AJAX pagination, load next page results in the same page */
	$('.more_results').live('click', function(){
		var $this 	 	 = $('.more_results'),
			this_form 	 = $this.parents('form'),
			results_wrap = $('#rslt-list-bg'),
			plus_sign 	 = $this.find('span > span').hide(),
			ajax_loader  = $('.ajax_loader', $this).show(),
			last_index   = parseInt($('.num_icon', '.listing').filter(':last').text().replace(/^\s+|\s+$/g, '')) + 1,
			page 		 = parseInt($('input[name=page]', $this.parent()).eq(0).val());
		
		if (!this_form.data('submitting')) {
			this_form.data('submitting', true);
			
			$.getJSON(this_form.attr('action'), this_form.serialize(), function(response) {
				$.with_json(response, function(data) {
					var listings = data.listings;
					
					for (var i = 0, len = listings.length; i < len; i++) {
						var listing = $(listings[i]);
						$('.num_icon', listing).text(last_index + i);
						results_wrap.append(listing);
					}
					
					$.setGmap(data.maps_data, 'main_map', last_index-1);
					$('.click_to_view').phoneNumHider();
					
					// this updates the page count so the next time the user clicks, we pull the correct data
					$('input[name=page]').val(page + 1);

					var range 		= $('.results_range'),
						range_start = parseInt(range.eq(0).text().split('-')[0]),
						range_end 	= parseInt(range.eq(0).text().split('-')[1]),
						per_page	= parseInt($('#per_page').text()),
						total 		= parseInt($('.results_total').eq(0).text()),
						remaining	= total - (range_end + per_page);		

					// update the range text and adjust the range end if we're near the end of the data set
					range_end += parseInt($('#per_page').text());
					if (range_end >= total) range_end = total;
					range.text(range_start + '-' + range_end);

					if (remaining <= 0) $this.hide();
					if (remaining < per_page) $this.find('span').html('<span class="plus">+</span> Show ' + remaining + ' more');
				});

				ajax_loader.hide();
				plus_sign.show();
				this_form.data('submitting', false);
			});
		}

		return false;
	});
	
	select_first_size_option();
	$.activateSizeSelect('#narrow_results_form');
	
	// panel openers
	$('.open_tab', '.tabs').live('click', function(){
		var $this = $(this),
			$panel = $('.panel', $this.parent().parent().parent());

		$('.open_tab').text('+');

		if (!$this.data('active')) {
			$('.tab_link[rel=map]', $this.parent().parent()).click();
			$this.data('active', true);
			$this.text('-');
		} else {
			$panel.slideUp();
			$('.tab_link, .listing, .panel, .tabs li').removeClass('active');
			$this.data('active', false);
			$('.open_tab').text('+');
		}

		return false
	});
	
	// when the reserve btn is clicked check to see if there is a chosen unit type. if so, change the buttons href
	$('.reserve_btn', '.listing').live('click', function() {
		var $this = $(this), 
			new_href = $this.attr('href').replace('/sizes', ($this.hasClass('reserve_btn') ? '/reserve' : '/info_request')),
			context = $this.parents('.listing'),
			query_hash = $.queryToHash(this.href.split('?')[1]),
			size_id = $(':radio:checked', context).val();
		
		this.rel = 'reserve';
		
		query_hash.size_id = size_id;
		query_hash.special_id = $('.special_txt.active', context).attr('data-special-id');
		
		$this[0].href = $this[0].href.split('?')[0] +'?'+ $.hashToQuery(query_hash);
		
		return false;
	});
	
	$('.request_btn', '.listing').live('click', function() {
		var $this = $(this), 
			new_href = $this.attr('href').replace('/sizes', ($this.hasClass('reserve_btn') ? '/reserve' : '/info_request')),
			context = $this.parents('.inner'),
			unit_size = $(':radio:checked', context),
			special = $('.special_txt.active', context);
		
		if (unit_size.length) {
			var ar = (special.length == 1 ? '[0]' : ''); // make the sub_model param an array if a special is present
			$this.attr('href', new_href +'&sub_model'+ ar +'=Size&sub_id'+ ar +'='+ unit_size.val());
			//$this.attr('rel', 'reserve'); // makes the panel open with the rental form instead of the sizes list
		}

		if (special.length == 1)
			$this[0].href += '&sub_model[1]=PredefinedSpecial&sub_id[1]=' + special.attr('data-special-id');
	});

	// slide open the panel below a result containing a partial loaded via ajax, as per the rel attr in the clicked tab link
	$('.tab_link', '.listing').live('click', function() {
		$('.open_tab', this).data('active', false);
		var $this		= $(this),
			$listing	= $this.parents('.listing'),
			$panel		= $('.panel', $listing).addClass('active'),
			$progress = $('.progress', $listing);

		// show progress and do ajax call unless we're clicking on the same tab again
		if ($.clicked_on_different_tab($this, $listing, $panel)) {
			$progress.addClass('active').animate({ 'margin-top': 0 }, 'fast');
			$panel.attr('rel', this.rel);
			
			if (this.rel == 'reserve') { // insert an iframe in the panel
				panelSwitchin($this, $listing, $panel);
				$panel.html('<iframe src="'+ $this.attr('href') +'" id="secure_frame"></iframe>');
				
			} else {
				$.getJSON(this.href, function(response) {
					$.with_json(response, function(data){
						panelSwitchin($this, $listing, $panel);
						$panel.html(data);
						
						// load the google map into an iframe
						if ($this.attr('rel') == 'map') {
							$('.hintable', $panel).hinty();
							var $map_wrap = $('.map_wrap', $panel), latlng = $map_wrap.attr('rel').split(',').map(function(i) { return parseFloat(i) });

							$map_wrap.jmap('init', { 'mapCenter': latlng }, function(map, el, ops) {
								$map_wrap.jmap('AddMarker', {
									'pointLatLng': ops.mapCenter,
									'pointHTML': $('.rslt-title', $listing).html() + $('.rslt-contact', $listing).html()
								});
							});

							setTimeout(function() {
								$map_wrap.jmap('CheckResize');
							}, 1000);

						} else if ($this.attr('rel') == 'request') {
							$.activate_datepicker($panel);
							$('.numeric_phone', $panel).formatPhoneNum();
						}
					});
				});
			}
			
		} else {
			$panel.slideUp();
			$('.tab_link, .listing, .panel').removeClass('active');
			$('li', '.tabs').removeClass('active');
		}
		
		function panelSwitchin(tab, listing, panel) {
			$('.tab_link, .listing, .panel').removeClass('active');
			$('li', '.tabs').removeClass('active');
			tab.addClass('active').parent().addClass('active');
			listing.addClass('active');
			panel.addClass('active');
			
			$('.listing:not(.active) .open_tab').text('+');
			$('.open_tab', listing).data('active', true).text('-');
			
			$('.progress', '.listing.active').removeClass('active').animate({ 'margin-top': '-16px' }, 'fast');
			$('.panel:not(.active)').slideUp();
			
			if (panel.is(':hidden'))
				panel.slideDown(900, function(){ if ($(window).height() < 650) $(window).scrollTo(listing, { speed: 1000 }); });
		}

		return false;
	});
	
	$('#get_dirs').live('submit', function() {
		var form = $(this),
			map_container = form.parents('#'+ form.attr('data-container')),
			map_wrap = $('#'+ form.attr('data-wrap'), map_container),
			from = $('#from_address', form).val(), 
			to = form.attr('data-to-addr'),
			dirs = $('<div id="dirs" />');
		
		map_container.after(dirs);
		map_container.parent().prepend('<img src="http://s3.amazonaws.com/storagelocator/images/ui/storagelocator/usselfstoragelocator-sml.png" class="dp" />');
		
		map_wrap.jmap('SearchDirections', {
			'query': from + ' to '+ to,
			'panel': $('#dirs', map_container.parent()),
			'locale': 'en_US'
		}, function() {
			$('.ps', map_container.parent()).show();
		});
		
		return false;
	});
	
	// opens the unit size specific reserve or request form in the unit sizes tab
	var unit_size_form_partials = {}; // cache the forms here
	$('.open_reserve_form').live('click', function() {
		var $this 	   		= $(this), 
			rform 	   		= $('.reserve_form', $this.parent()),
			wrap 	   		= $this.parent('.sl-table-wrap'),
			listing_id 		= wrap.attr('data-listing-id').replace('listing_', ''),
			size_id    		= wrap.attr('id').replace('Size_', ''),
			renting_enabled = wrap.attr('data-renting-enabled') == 'true' ? true : false,
			ajax_loader 	= $.new_ajax_loader('before', $('.rsr-btn', this));
		
		if (rform.hasClass('active')) { // clicking on an open form, close it
			rform.slideUp().removeClass('active');
			$('.sl-table').removeClass('active');
			
		} else { // get or open the form for this size
			$('.reserve_form').slideUp().removeClass('active');
			$('.sl-table').removeClass('active');
			$('.sl-table', rform.parent()).addClass('active');
			
			if (unit_size_form_partials[size_id]) 
				rform.slideDown().addClass('active');
			else {
				ajax_loader.show();
				
				if (renting_enabled) { // we must get the rent form partial that contains the rent_steps
					var special = $('.special_txt.active', wrap.parents('#listing_'+ listing_id)),
						params = { partial: 'listings/rent_form', model: 'Listing', id: listing_id, show_size_ops: false };
						
					if (special.length == 1) {
						params.sub_model = { '1': 'Size', '2': 'PredefinedSpecial' };
						params.sub_id = { '1': size_id, '2': special.attr('data-special-id') };
					} else {
						params.sub_model = 'Size';
						params.sub_id = size_id;
					}
					
					get_partial_and_do(params, function(response) {
						unit_size_form_partials[size_id] = response.data;
						rform.html(response.data).slideDown().addClass('active');
						$('#rent_step1 form', rform).rental_form();
						ajax_loader.hide();
					});
				} else {
					get_partial_and_do({ partial: 'views/partials/greyresults/request_info', model: 'Listing', id: listing_id, sub_model: 'Size', sub_id: size_id }, function(response) {
						unit_size_form_partials[size_id] = response.data;
						rform.html(response.data).slideDown().addClass('active');
						$('#rent_step1 form').rental_form();
						ajax_loader.hide();
					});
				}
			}
		}

		$('input[type=text]:first', rform).focus();
		return false;
	});
	
	// Info request: submit reserver details
	$('form.new_listing_request').live('submit', function() {
		var form = $(this).runValidation(),
			ajax_loader = $('.ajax_loader', form).show();
		
		if (form.data('valid') && !form.data('saving')) {
			form.data('saving', true);
			$('.flash', form).slideUpRemove('slow');
			
			$.post(form.attr('action'), form.serialize(), function(response) {
				if (response.success) {
					var inner_panel = form.parent();
					inner_panel.children().fadeOut(300, function(){
						inner_panel.html(response.data).children().hide().fadeIn();
						$('.hintable', inner_panel).hinty();
					});
				} else form.prepend('<div class="flash flash-error">'+ (typeof(response.data) == 'object' ? response.data.join('<br />') : response.data) +'</div>');
				
				ajax_loader.hide();
				form.data('saving', false);
			}, 'json');
		} else ajax_loader.hide();
		
		return false;
	});
	
	$('.tos').live('click', function(){
		get_pop_up_and_do({ title: 'Terms of Service', modal: true }, { sub_partial: 'pages/terms_of_service' });
		return false;
	});
	
	// autoreload the results
	$('select.auto', '#narrow_results_form').change(function() {
		delayed_submit(this);
	});
	
	$('.auto:not(select)', '#narrow_results_form').click(function() {
		delayed_submit(this);
	});
	
	var feature_toggle = $('.openDiv', '#unit_features');
	if (feature_toggle.length) {
		feature_toggle.data('orig', feature_toggle.text());
		
		feature_toggle.click(function() {
			var $this = $(this);

			if (!$this.data('open')) {
				$this.data('open', true);
				$this.text('Less Features');
			} else {
				$this.data('open', false);
				$this.text($this.data('orig'));
			}
		});
	}
	
	function delayed_submit(input) {
		setTimeout(function() {
			$(input).parents('form').submit();
		}, 100);
	}
	
	function select_first_size_option() {
		$('li.rslt-price').each(function() {
			var option = $('.enabled:first', this);
			option.addClass('selected');
			$('input', option).attr('checked', true);
		});
	}
	
	$.enableTooltips('a', '.rslt-features');
	
	$('#narrow_results_form').submit(function() {
		var results_page = $('#ajax_wrap_inner'),
			results_wrap = $('#results_wrap', results_page),
			results_head = $('.rslt-head-txt', results_wrap),
			loading_txt  = 'Looking for '+ $('#search_storage_type', this).val() +' within <span class="hlght-text">'+ 
						   $('input[name="search[within]"]:checked', this).val() +'</span> miles of <span class="hlght-text">'+ 
						   $('#search_query', this).val() +'</span> '+ $.ajax_loader_tag();
		
		$('#type-one-top-bar', results_wrap).fadeTo(500, .5);
		$('h2', results_head).removeClass('no_results hide').html(loading_txt);
		$('.txt_ldr', results_head).txt_loader();
		
		$.safeSubmit(this, {
			ajax_loader: false,
			success: function(data) {
				results_page.replaceWith(data.results);
				$.setGmap(data.maps_data);
				$.enableTooltips('a', '.rslt-features');
				$('.click_to_view').phoneNumHider();
				select_first_size_option();
				// TODO: this doesnt cause the compare link to appear
				//$('input[name=compare]', '.listing').autoClickFew(3);
				
				$('.rslt-price', '.listing').each(function(){
					$(':radio', this).eq(0).attr('checked', true);
					$('.radio_select', this).eq(0).addClass('checked');
				});
				
				$('body').attr('id', 'listings_controller').addClass('locator_action'); // this is only needed cuz the layout is kinda fucked up and not consistent across pages
			}
		});
		
		return false;
	});
	
	$('.list_sort').live('click', function() {
		var $this = $(this), form = $('#narrow_results_form', '#content_bottom'),
			sort_fields = $('input.sort_field', form);
		
		if (!sort_fields.length) {
			sort_fields = '<div><input type="hidden" name="search[sorted_by]" class="sort_field" value="'+ $this.attr('data-sorted_by') +'" />' +
						  '<input type="hidden" name="search[sort_reverse]" class="sort_field" value="'+ $this.attr('data-sort_reverse') +'" /></div>';
			
			form.append(sort_fields);
		} else {
			sort_fields.filter('input[name="search[sort_reverse]"]').val($this.attr('data-sort_reverse'));
			sort_fields.filter('input[name="search[sorted_by]"]').val($this.attr('data-sorted_by'));
		}
		
		form.submit();
		return false;
	});
	
	var main_map = $('#main_map', '#content');
	if (main_map.length) {
		if (typeof Gmaps_data == 'undefined') {
			var latlng = main_map.attr('data-latlng').split(',');
			$.setGmap({ center: { lat: parseFloat(latlng[0]), lng: parseFloat(latlng[1]), zoom: 14 }, maps: [] });
			$('#narrow_results_form').submit();
			
		} else $.setGmap({ center: Gmaps_data.center, maps: Gmaps_data.maps });
	}
	
	var featured_listing = $('#feat_wrap');
	if (featured_listing.length > 0 && featured_listing.children().length == 0 && $.on_page([['locator, home, show', 'listings, pages']])) {
		get_partial_and_do({ partial: 'listings/featured' }, function(response) {
			$.with_json(response, function(partial) {
				featured_listing.replaceWith(partial);
				$('#feat_wrap').parent().parent('.shimmy').shimmy('#page-cnt');
			});
		});
	}
	
	var google_map = $('#google_map');
	if (google_map.length) {
		var coords = $.map(google_map.attr('data-coords').split(','), function(el, i) { return parseFloat(el) });
		
		google_map.jmap('init', { 'mapCenter': coords }, function(map, el, ops) {
			google_map.jmap('AddMarker', {
				'pointLatLng': coords,
				'pointHTML': $('#fac_name span').text()
			});
		});
	}
	
	var street_view = $('#street_view');
	if (street_view.length) {
		var coords = $.map(google_map.attr('data-coords').split(','), function(el, i) { return parseFloat(el) });
		
		street_view.jmap('init', { 'mapType': G_HYBRID_MAP, 'mapCenter': coords }, function(map, el, ops) {
			street_view.jmap('CreateStreetviewPanorama', { 'latlng': coords });
		});
	}
	
	$('#rentalizer').rental_form();
	
	// when a review request is sent, the link in the email goes to the single listing page with this hash in the url:
	if (window.location.hash == '#write_review')
		get_review_pop_up({ sub_partial: 'comments/write_review', model: 'Listing', id: $('listing_id').val() });
	
	$('a', '#write_review').live('click', function() {
		var $this = $(this);
		$.new_ajax_loader('after', $this.parent()).show().fadeOutLater('fast', 3000);
		get_review_pop_up({ sub_partial: 'comments/write_review', model: 'Listing', id: $this.attr('data-listing_id') });
		return false;
	});
	
	$('#toggle_renting', '#sl-edit-tabs').click(function() {
		var $this = $(this),
			ajax_loader = $.new_ajax_loader('after', this),
			toggle = $this.attr('data-toggle') == 'true',
			toggle_html = $this.attr('data-toggle') == 'true' ? $('#toggle_renting_html', '#tab2').html() : 'Are you sure you want to disable renting?';
		
		$.greyConfirm(toggle_html, function() {
			if (!$this.data('sending')) {
				$this.data('sending', true);
				ajax_loader.show();

				$.post($this.attr('href'), function(response) {
					$.with_json(response, function(data) {
						$this.text((toggle ? 'Disable' : 'Enable') +' Renting').attr({ 'href': data.href, 'data-toggle': (toggle ? 'false' : 'true') });
						
						if (toggle) 
							$('#listing_extra_form', '#tab2').slideDown('slow', function() { $(this).removeClass('hide').addClass('enabled') });
						else
							$('#listing_extra_form', '#tab2').slideUp('slow', function() { $(this).removeClass('enabled').addClass('hide') });;
					});

					ajax_loader.hide();
					$this.data('sending', false)
				}, 'json');
			}
		});
		
		return false;
	});
	
	$('#select_all', '#searcher_step2').live('click', function() {
		var $this = $(this);
		$('.listing_div', $this.parent()).click();
		$this.text($this.text() == 'Select All' ? 'Clear All' : 'Select All');
		
		return false;
	});
	
});

function get_review_pop_up(options) {
	get_pop_up_and_do({ title: 'Write a Review', width: 500, modal: true }, options, function(pop_up) {
		$('#comment_name', pop_up).focus();
		
		$('form', pop_up).submit(function() {
			$.safeSubmit(this, {
				al_where: 'after',
				success: function(data) {
					pop_up.html('<div class="framed" style="text-align:center;">'+ data +'</div>');
				}
			});
			
			return false;
		});
	});
}

/*
 * Google Map methods
 */
var MapIconMaker = {};
MapIconMaker.createMarkerIcon = function(opts) {
	var width 		 = opts.width || 32,
		height 		 = opts.height || 32,
		primaryColor = opts.primaryColor || "#ff0000",
		strokeColor  = opts.strokeColor || "#000000",
		cornerColor  = opts.cornerColor || "#ffffff",
		baseUrl 	 = "http://chart.apis.google.com/chart?cht=mm",
		iconUrl 	 = baseUrl + "&chs=" + width + "x" + height + "&chco=" + cornerColor.replace("#", "") + "," + primaryColor.replace("#", "") + "," + strokeColor.replace("#", "") + "&ext=.png",
		icon 		 = new GIcon(G_DEFAULT_ICON);
	
	icon.image 			  = iconUrl;
	icon.iconSize 		  = new GSize(width, height);
	icon.shadowSize 	  = new GSize(Math.floor(width*1.6), height);
	icon.iconAnchor 	  = new GPoint(width/2, height);
	icon.infoWindowAnchor = new GPoint(width/2, Math.floor(height/12));
	icon.printImage 	  = iconUrl + "&chof=gif";
	icon.mozPrintImage    = iconUrl + "&chf=bg,s,ECECD8" + "&chof=gif";
	
	var iconUrl = baseUrl + "&chs=" + width + "x" + height + "&chco=" + cornerColor.replace("#", "") + "," + primaryColor.replace("#", "") + "," + strokeColor.replace("#", "");
		icon.transparent = iconUrl + "&chf=a,s,ffffff11&ext=.png";

	icon.imageMap = [
		width/2, height,
		(7/16)*width, (5/8)*height,
		(5/16)*width, (7/16)*height,
		(7/32)*width, (5/16)*height,
		(5/16)*width, (1/8)*height,
		(1/2)*width, 0,
		(11/16)*width, (1/8)*height,
		(25/32)*width, (5/16)*height,
		(11/16)*width, (7/16)*height,
		(9/16)*width, (5/8)*height
	];
	
	for (var i = 0; i < icon.imageMap.length; i++)
		icon.imageMap[i] = parseInt(icon.imageMap[i]);

	return icon;
}

try {
	// size of /images/ui/storagelocator/result-number.png
	G_DEFAULT_ICON.iconSize.width = 25;
	G_DEFAULT_ICON.iconSize.height = 38;
	
	var iconOptions = {};
	iconOptions.width = 25;
	iconOptions.height = 38;
	iconOptions.primaryColor = "#0000ff";
	iconOptions.cornerColor = "#FFFFFF";
	iconOptions.strokeColor = "#000000";
	var normalIcon = MapIconMaker.createMarkerIcon(iconOptions);

	// http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=A|00CC99|000000
	var startIcon = new GIcon(G_DEFAULT_ICON, '/images/ui/storagelocator/map_marker.png'); // the 'you are here' icon
	
	//save the regular icon image url
	var normalIconImage    = normalIcon.image,
		highlightIconImage = 'http://chart.apis.google.com/chart?cht=mm&chs=32x32&chco=FFFFFF,FBD745,000000&ext=.png',
		selectedIconImage  = 'http://chart.apis.google.com/chart?cht=mm&chs=32x32&chco=FFFFFF,FB9517,000000&ext=.png';
} catch (e){}

function highlightMarker(id){
	var marker = typeof id == 'object' ? id : getMarkerById(id);
	if (typeof(marker) != 'undefined') marker.setImage('http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld='+ marker.mIndex +'|FED747|333333'); //marker.setImage(make_indexed_icon(marker.mIndex)); //
}

function unhighlightMarker(id){
	var marker = typeof id == 'object' ? id : getMarkerById(id), def = typeof(marker) != 'undefined';
	if (def && marker.GmapState == 'selected') marker.setImage('http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld='+ marker.mIndex +'|FED747|333333');
	else if (def) marker.setImage(get_marker_img_path(marker.mIndex)); //marker.setImage('http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld='+ marker.mIndex +'|339933|FFFFFF');
}

function getMarkerById(id) {
	var marker;

	$.each(GmapMarkers, function(){
		if (this.listing_id == id) {
			marker = this; 
			return;
		}
	});

	return marker;
}

function addMarker(map, icon, lat, lng, title, body, bind_mouse_overs) {
	if (typeof bind_mouse_overs == 'undefined') var bind_mouse_overs = true;
	
	var point = new GLatLng(lat, lng);
	var marker = new GMarker(point, { 'title': title, 'icon': icon, width: '25px' });
	
	GEvent.addListener(marker, 'click', function() {
		marker.openInfoWindowHtml(body);
		$('.listing').removeClass('active');
		$('#listing_'+ marker.listing_id).addClass('active');
	});
	
	if (bind_mouse_overs) {
		GEvent.addListener(marker, 'mouseover', function(){
			$('.listing').removeClass('active');
			highlightMarker(marker);
			$('#listing_'+ marker.listing_id).addClass('active');
		});

		GEvent.addListener(marker, 'mouseout', function(){
			$('#listing_'+ marker.listing_id).removeClass('active');
			unhighlightMarker(marker);
		});
	}

	map.addOverlay(marker);
	return marker;
}

function make_indexed_icon(index) {
	//var img_path = 'http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld='+ index +'|339933|FFFFFF';
	var icon = new GIcon(G_DEFAULT_ICON, get_marker_img_path(index));
	return icon;
}

function get_marker_img_path(n) { // see app/metal/marker_maker.rb for more query params
	var p;
	if 		(n < 10)  p = '/marker_maker?n='+ n +'&color=white&font_weight=bold&font_size=14&offset=10x3';
	else if (n < 100) p = '/marker_maker?n='+ n +'&color=white&font_weight=bold&font_size=14&offset=5x3';
	else			  p = '/marker_maker?n='+ n +'&color=white&font_weight=bold&font_size=11&offset=5x5';
	return p;
}

GmapMarkers = [];
$.setGmapMarkers = function(map, markers, page, resetMarkers) {
	if (typeof resetMarkers == 'undefined') resetMarkers = false;
	if (resetMarkers) {
		$.each(GmapMarkers, function() { map.removeOverlay(this) });
		GmapMarkers = [];
	}
	
	for (var i = 0, len = markers.length; i < len; i++) {
		var photo = markers[i].thumb,
			title = markers[i].title.replaceAll('+', ' '),
			body = '<p>'+ photo + 
						'<span class="listing_title"><a href="/self-storage/show/'+ markers[i].id +'">'+ title +'</a></span>'+ 
						'<span class="listing_address">'+ markers[i].address.replaceAll('+', ' ') +'<br/>'+ markers[i].city.replaceAll('+', ' ') +', '+ markers[i].state +' '+ markers[i].zip +'</span>'+
					'</p>',
			paged_index = page + i + 1;
		
		var marker = addMarker(Gmap, make_indexed_icon(paged_index), markers[i].lat, markers[i].lng, title, body);
		marker.mIndex = paged_index;
		marker.listing_id = markers[i].id;

		GmapMarkers[page + i] = marker;
	}
}

$.setGmap = function(data, el, page) {
	if (typeof el == 'undefined') el = 'main_map';
	if (typeof page == 'undefined') page = 0;
	
	Gmap = new GMap2(document.getElementById(el));
	Gmap.addControl(new GLargeMapControl());
	Gmap.addControl(new GScaleControl());
	Gmap.addControl(new GMapTypeControl());
	Gmap.setCenter(new GLatLng(data.center.lat, data.center.lng), (data.center.zoom || 16));
	Gmap.enableDoubleClickZoom();
	Gmap.disableContinuousZoom();
	Gmap.disableScrollWheelZoom();

	addMarker(Gmap, startIcon, parseFloat(data.center.lat), parseFloat(data.center.lng), 'Origin', '<p><strong>Search distance measured from here.</strong></p>', false);
	$.setGmapMarkers(Gmap, data.maps, page, true);

	//bind mouseover result row to highlight map marker
	$('.listing', '#rslt-list-bg').live('mouseenter', function(){
		var id = $(this).attr('id').split('_')[1];
		highlightMarker(id);
	});
	
	$('.listing', '#rslt-list-bg').live('mouseleave', function(){
		var id = $(this).attr('id').split('_')[1];
		unhighlightMarker(id);
	});
	
	//do some nifty researching as the map drags
	GEvent.addListener(Gmap, "dragend", function() {
		var coords = Gmap.getCenter();
		
		$.getJSON('/self-storage', { auto_search: 1, lat: coords.lat(), lng: coords.lng(), within: $('input:checked', '#distance_btns').eq(0).val(), strict_order: true }, function(response) {
			$.with_json(response, function(data) {
				$('#results_wrap', '#content').replaceWith($(data.results).find('#results_wrap'));
				$('#search_query', '#narrow-box').val(data.query);
				
				addMarker(Gmap, startIcon, parseFloat(data.maps_data.center.lat), parseFloat(data.maps_data.center.lng), 'Origin', '<p><strong>Search distance measured from here.</strong></p>', false);
				$.setGmapMarkers(Gmap, data.maps_data.maps, page, true);
			});
		});
	});

} // END setGmap()

// updates the info tab count in the listings edit page. the tab text is: <label> (<count>)
function update_info_tab_count(label, i) {
	var	tab = $('#tab_'+ label, '#sl-tabs'),
		count = parseInt(tab.text().split('(')[1].replace(')', '')) + i;
	
	tab.text(label.replace('_', ' ') + ' ('+ count +')');
}

// utitity method
$.clicked_on_different_tab = function($tab_link, $listing) {
	var $open_panel = $('.panel:not(:hidden)', '.listing');
	if ($open_panel.length == 0) return true;

	var clicked_listing = $open_panel.parent().attr('id'),
		active_listing 	= $listing.attr('id');
	if (active_listing != clicked_listing) return true;

	var clicked_tab  = $tab_link.attr('rel'),
		active_panel = $open_panel.attr('rel');

	// true when clicking on a different tab in the same result, or the same tab in a different result
	return (clicked_tab != active_panel && active_listing == clicked_listing) || 
		   (clicked_tab == active_panel && active_listing != clicked_listing);
}

$.activate_datepicker = function(context) {
	$('.mini_calendar', context).datepicker();
	$('.datepicker_wrap', context).click(function(){ $('.hasDatepicker', this).focus(); });
}

$.activateSizeSelect = function(context) {
	var $size_picker = $('.size_picker', context),
		$size_img = $('img', $size_picker),
		$size_select = $('.sizes_select', context);
	
	// preload
	var pre_loaded_size_icons = [];
	$('option', $size_select).each(function(){
		var $this = $(this);
		
		if ($this.attr('data-url') != '' && !$.any(pre_loaded_size_icons, function() { if (this.src == $this.attr('data-url')) return true; })) {
			var img = new Image();
			img.src = $this.attr('data-url');
			pre_loaded_size_icons.push(img);
		}
	});

	if ($size_select.length) {
		size_icon_change($size_select); // update on page load
		$size_select.live('change', size_icon_change);
		$('option', $size_select).live('mouseover', size_icon_change);
	}

	function size_icon_change(input) {
		var self = input[0] || this,
			$this = $(self),
			selected = self.tagName.toLowerCase() == 'option' ? $this.attr('data-url') : $('option:selected', self).attr('data-url'),
			new_img = $('<img src="'+ selected +'" alt="" />'),
			size_details = capitalize(self.tagName.toLowerCase() == 'option' ? $this.attr('data-unit-type') : $('option:selected', self).attr('data-unit-type'));
		
		size_details += "&nbsp;"+ (self.tagName.toLowerCase() == 'option' ? $this.text() : $('option:selected', self).text());
		
		if ($size_img.attr('src') != selected) {
			$size_img.fadeOut(100, function() {
				$size_picker.html('').append(new_img).append('<p class="size_details">'+ size_details +'</p>');
				new_img.hide().fadeIn(120);
				$size_img = $('img', $size_picker);

				if (new_img.width() > 183) new_img.width(183);
			});
		}
	}
}

$.enableTooltips = function(el, context, delay) {
	$(el, context).tooltip({ predelay: (delay || 300) });
}

$.calculatePrice = function(context) {
	$.getJSON('/rentalizer', $.getCalculationParams(context), function(response) {
		$.with_json(response, function(data) {
			$.each(data, function() {
				var calc_wrap = $('#calcfor_'+ this.listing_id), html = '',
					paid_thru = new Date(this.calculation.paid_thru),
					months = paid_thru.getMonth() - new Date().getMonth();
				
				html += '<span class="price">$'+ this.calculation.total +'</span><br />';
				html += '<span class="date">Paid for '+ months +' month'+ (months > 1 ? 's' : '') +'<br />thru '+ paid_thru.format('longDate') +'</span>';
				
				calc_wrap.html(html);
			});
		});
	});
}

$.getCalculationParams = function(context) {
	var btns = $('.calc_params', context), params = { multi_params: [] }, now = new Date();
	
	btns.each(function(i) {
		var b = $(this), 
			p = [b.attr('data-listing-id'), b.attr('data-size-id'), b.attr('data-special-id')];
			
		params.multi_params.push(p.join('x'));
	});
	
	params.multi_params = params.multi_params.join('-');
	params.move_in_date = new Date(now.getYear(), now.getMonth(), now.getDate() + 1).format('isoDate');
	
	return params;
}

$.fn.special_txt_anim = function() {
	return this.each(function() {
		$(this).animate({ 'font-size': '120%' }, 150, function() { 
			$(this).animate({ 'font-size': '100%' }, 300);
		});
	});
}

// first used for the compare checkboxes
$.fn.autoClickFew = function(max) {
	if (typeof max == 'undefined') var max = 2;
	return this.each(function(i) {
		if (i <= max) $(this).click();
	});
}

// make an auto updating form, when values change, update the total
$.fn.rental_form = function() {
	var rent_workflow = {
		slides : [
			{
				div_id  : 'rent_step1',
				nav_vis : [
					['next', function(btn, wizard) { btn.text('Next').fadeIn() }],
					['back', 'fadeOut'] 
				]
			}, // END slide 1
			{
				div_id  : 'rent_step2',
				nav_vis : [
					['next', function(btn, wizard) { btn.text('Rent It!').fadeIn() }],
					['back', 'fadeIn']
				],
				action : function(wizard) {
					wizard.form_data = $('#rentalizer', wizard.workflow).serialize();
					
					$('.numeric_phone', wizard.workflow).formatPhoneNum();
					$('#siteseal', '#rent_steps').animate({ right: '240px' }, 'fast');
					
					$('#new_tenant', wizard.workflow).unbind('submit').submit(function() {
						wizard.next();
						return false;
					});
				},
				validate : function(wizard) {
					return $('#new_tenant', wizard.workflow).runValidation().data('valid');
				}
			},
			{
				div_id  : 'rent_step3',
				nav_vis : [
					['next', 'fadeOut'],
					['back', 'fadeOut']
				],
				action : function(wizard) {
					var form = $('#new_tenant', wizard.workflow),
						ajax_loader = $('#processing_rental .ajax_loader', wizard.workflow).show();
					
					$('#siteseal', '#rent_steps').animate({ right: '20px' }, 'slow');
					$('#processing_rental .flash', wizard.workflow).remove();
					wizard.form_data += ('&'+ form.serialize());
					
					$.post(form.attr('action'), wizard.form_data, function(response) {
						$.with_json(response, function(data) {
							var rent_conf = $('#rental_complete', wizard.workflow).show();
							$('#processing_rental', wizard.workflow).hide();
							
							for (key in data)
								if (data[key].length > 0)
									$('#'+ key, rent_conf).text(data[key]).parents('p').show();
							
						}, function(data) { // uh oh, something failed
							$('#processing_rental', wizard.workflow).html('<div class="flash error">'+ data.join('<br />') +'</div>');
							$('.back', wizard.nav_bar).show();
						});
						
						ajax_loader.hide();
					}, 'json');
				}
			} // END slide 1
		],
		finish_action : function(wizard) {
			wizard.workflow.parents('.panel').slideUp().removeClass('active').parents('.active').removeClass('active');
		}
	};

	function set_size_select(selects, unit_type, context) {
		selects.hide().attr('disabled', true).removeClass('active');
		selects.filter('#size_id_'+ unit_type, context).show().attr('disabled', false).addClass('active');
	}
	
	return this.each(function() {
		var form 		   = $(this),
			special_btns   = $('.avail_specials input', form),
			remove_special = $('.remove_special', form).hide(),
			type_select    = $('select[name=unit_type]', form),
			unit_type 	   = type_select.val().toLowerCase().replaceAll(' ', '_').replaceAll('-', '_').toLowerCase(),
			sizes_select   = $('select.sizes_select', form),
			calendar	   = $('#move_in_date', form).datepicker({
				onSelect: function(date, ui) { form.submit() },
				minDate: new Date(),
				maxDate: '+2w'
			}),
			inputs = {
				subtotal   : $('.subtotal', form),
				multiplier : $('.multiplier', form),
				month_rate : $('.month_rate', form),
				paid_thru  : $('.paid_thru', form),
				discount   : $('.discount' ,form),
				usssl_discount : $('.usssl_discount' ,form),
				admin_fee  : $('.admin_fee ', form),
				tax_amt    : $('.tax_amt', form),
				total	   : $('.total', form)
			};
		
		form.submit(function() {
			$.getJSON(form.attr('action'), form.serialize(), function(response) {
				$.with_json(response, function(data) {
					for (key in data) {
						inputs[key].each(function() {
							if (this.tagName.toLowerCase() == 'input')
								$(this).val(data[key]);
							else
								$(this).text(data[key]); 
						});
					}
				});
			});
			return false;
		});
		
		new GreyWizard(form.parents('#rent_steps'), rent_workflow).begin_workflow_on(0);
		$.activateSizeSelect(form);
		$('.auto_next', '#new_tenant').autoNext();
		
		// pop up login form
		$('#already_member', '#new_tenant').click(function() {
			$.greyAlert('Sorry, this feature is not yet implemented.');
			return false;
		});
		
		if (!$('#size_ops', form).hasClass('hide')) {
			sizes_select.change(function() {
				inputs.month_rate.text(sizes_select.children(':selected').attr('data-unit-price'));
				form.submit();
			});
			set_size_select(sizes_select, unit_type, form);
			
			type_select.change(function() {
				set_size_select(sizes_select, $(this).val().replaceAll(' ', '_').replaceAll('-', '_').toLowerCase(), form);
				sizes_select.filter('.active').change();
			});
		}
		
		special_btns.click(function() {
			var $this = $(this);
			
			if ($this.is(':checked')) {
				remove_special.hide();
				$this.siblings('.remove_special').show();
			}
			
			form.submit();
		});
		
		$('.calendar_wrap', form).click(function() { 
			$(this).find('input').focus(); 
		});
		
		remove_special.click(function() {
			$(this).hide().siblings('input').attr('checked', false);
			form.submit();
			return false;
		});
		
		setTimeout(function() {
			if ((s = special_btns.filter('.chosen')).length > 0)
				s.attr('checked', true).click();
			else
				special_btns.eq(0).attr('checked', true).click();
		}, 100);
	});
}
$ = jQuery;
$(function() {
	if ($('body').hasClass('home')) $('#dock').jqDock({ size: 60, attenuation: 400, fadeIn: 1000 });
	else $('#dock').jqDock({ size: 50, attenuation: 400, fadeIn: 1000 });
	
/******************************************* PAGE SPECIFIC BEHAVIOR *******************************************/

	$.translate_with(translations);
	$.setup_autocomplete('.autocomplete', '#page-cnt');
	
	// front page
	$('#search_submit, #search_submit2').click(function() {
		// the live submit handler in formbouncer doesn't seem to work on the search form
		// temporary workaround...
		return $(this).parents('form').runValidation().data('valid');
	});
	
	var twitcount = $("#TwitterCounter");
	if (twitcount.length > 0) {
		$.getJSON('http://api.twitter.com/1/users/show.json', { screen_name: 'StorageLocator' }, function(data) {
			console.log(data)
			twitcount.children('span').html(data.followers_count);
	    });
	}
	
	// ajaxify the login form and forgot password link
	$('#login_link.ajax', '#topbar').click(function() {
		var $this = $(this).removeClass('ajax'); // was added by the already member link, otherwise this is a normal link
		if ($this.hasClass('active')) return false;
		$this.addClass('active');
		
		var pop_up = $('#pop_up').dialog(default_pop_up_options({
			title: 'Login to your account',
			width: 347,
			height: 'auto',
			modal: false,
			close: function() { 
				$this.removeClass('active');
			}
		})).parent('.ui-dialog').css({ top: '50px', right: '20px', left: 'auto' });

		//pop_up.fadeIn();
		$('input[type=text]', pop_up).eq(0).focus();
		$.bindPlugins();
		
		return false;
	});
	
	// log the user in and change the topbar to the logged in links
	$('#new_user_session', '#pop_up').live('submit', function() {
		var form = $(this).runValidation(),
			overlay = $.applyLoadingOverlay(form.parents('#login_page'));
		
		if (form.data('valid') && !form.data('sending')) {
			overlay.fadeIn();
			form.data('sending', true);
			
			$.post(form.attr('action'), form.serialize(), function(response) {
				$.with_json(response, function(data) {
					var ready_mem = $('#ready_member', form);
					
					if (data.role == 'advertiser' && ready_mem.length == 0) {
						overlay.fadeOut('fast', function() { form.html('<p class="login_success">Looks good!<br /> If you aren\'t redirected to your account, <a href="'+ data.account_path +'" title="Trust me, this is a link to your account!">click here</a></p>') });
						window.top.location.href = data.account_path;
						
					} else {
						// when a member clicks on a "already a member" link, they are in a form and we need to fill in their info, e.g. name and email
						// ready_member is a hidden input (injected by the already_member click, see below) whose value contains the data keys: context|attr1,attr2,...|field1,field2,...|focus_element
						// where the context is the form, the attr are the attributes of response object, and the fields are ids of fields to input the attribute values, and the element to focus
						if (ready_mem.length > 0) {
							var values = ready_mem.val().split('|'),
								context = $('#'+ values[0]),
								attributes = values[1].split(',')
								field_ids = values[2].split(','),
								focus_el = values[3];
								
							$.each(field_ids, function(i) {
								$('#'+ this, context).val(data[attributes[i]]);
							});
							
							$('#'+ focus_el, context).focus();
							$('#already_member', context).hide();
							
							$('#topbar').html(data.html);
							form.parents('#pop_up').dialog('destroy').fadeOutRemove();
							
						} else {
							window.top.location.href = '/admin';
						}
					}
				}, function(data) {
					$('#login_page').html(data);
					$('.fieldWithErrors input', '#login_page').eq(0).focus();
				});
				
				form.data('sending', false);
			}, 'json');
		}
		
		return false;
	});
	
	$.applyLoadingOverlay = function(here) {
		var overlay = $('<div class="overlay"><div></div></div>').appendTo(here).hide();
		return overlay;
	}
	
	$('#forgot_pass_link').live('click', function() {
		var $this = $(this),
			email = $('#user_session_email', '#login-form'),
			href = $this.attr('href');
		
		if (email.val() && email.val() != '' && email.val() != email.attr('title')) {
			$this.attr('href', href +'?email='+ email.val());
		}
		/*
		var $this = $(this),
			pop_up = $('#pop_up.login_box'),
			ajax_loader = $.new_ajax_loader('after', this).show(),
			orig_html = pop_up.html();
		
		$this.hide();
		
		pop_up.load(this.href, function(response, status) {
			$('input[type=text]', this).eq(0).focus();
			$.bindPlugins();
			
			$(this).dialog({
				title: 'Enter your email',
				close: function() {
					pop_up.html(orig_html);
					$('#login_link').removeClass('active');
					$('.ajax_loader', pop_up).hide();
					$('#forgot_pass_link', '#pop_up.login_box').show();
				}
			});
			
			ajax_loader.hide();
		});
		return false;*/
	});
	
	$('#password_resets_form').live('submit', function() {
		var form = $(this).runValidation(),
			ajax_loader = $('.ajax_loader', form);
		
		if (form.data('valid')) {
			ajax_loader.show();
			
			$.post(form.attr('action'), form.serialize(), function(response) {
				form.html(response);
			});
		}
		
		return false;
	});
	
	$('#new_user_session', '#user_sessions_controller').live('submit', function() {
		var form = $(this).runValidation(),
			ajax_loader = $.new_ajax_loader('before', $('input[type=submit]', form));
		
		if (!form.data('valid')) return false;
		else ajax_loader.show();
	});
	
	$('#already_member').live('click', function() {
		var $this = $(this);
		
		get_pop_up_and_do({ title: 'Sign In To Your Account', width: '400px', height: 'auto' }, { sub_partial: 'user_sessions/form' }, function(pop_up) {
			$('label.hide', pop_up).show();
			// inject a hidden input so that the login action will know what to do
			$('#new_user_session', pop_up).append('<input type="hidden" id="ready_member" value="'+ $this.attr('data-ready_member') +'" />');
		});
		
		return false;
	});
	
	// map pop up
	var map_nav_btn = $('#map_nav_btn');
	if (map_nav_btn.length > 0) {
		$.preload_us_map_imgs();
		
		map_nav_btn.click(function(){
			var partial = 'menus/map_nav', title = 'Choose A State', height = '486';
			
			get_pop_up_and_do({ 'title': title, 'height': height, 'modal': true }, { 'sub_partial': partial }, function() {
				new GreyWizard($('#map_nav'), {
					title		 : 'Choose a State',
					slides_class : 'map_flow_step',
					nav_id : 'map_flow_nav',
					slides : [
						{	
							pop_up_title : 'Click on a State',
							div_id  : 'map_step1',
							action  : map_flow_step1,
							nav_vis : [['back', 'hide']]
						},
						{ 
							pop_up_title : 'Pick a City',
							div_id  : 'map_step2',
							action  : map_flow_step2,
							nav_vis : [['back', 'fadeIn']]
						}
					]
				}).begin_workflow_on(0);
			});

			return false;
		});
		
		function map_flow_step1() {
			var wizard = arguments[0],
				$map_img = $('#map_nav_img', '#map_nav'),
				$areas = $('area', '#USMap'),
				$state_name = $('#state_name', '#map_nav');
				
			var add_map_overlay = function() {
				var area = $(this), img = $('<img class="map_overlay" src="http'+ (window.location.href.substring(0, 5) == 'https' ? 's' : '') +'://s3.amazonaws.com/storagelocator/images/ui/storagelocator/us_map/'+ area.attr('rel') +'.png" alt="" />');
				$state_name.text(area.attr('alt'));
				$map_img.before(img);
			}; 
			$areas.unbind('mouseenter', add_map_overlay).live('mouseenter', add_map_overlay);

			var remove_map_overlay = function() {
				$state_name.text('');
				$('.map_overlay', '#map_nav').remove();
			};
			$areas.unbind('mouseleave', remove_map_overlay).live('mouseleave', remove_map_overlay);
			
			var get_cities = function() {
				var area = $(this), state = area.attr('alt');
				$state_name.text('Going to '+ state +'...');
				
				if (state == 'Washington DC') {
					window.location = '/self-storage/washington-dc';
					
				} else {
					if (wizard.slide_data[1].data && wizard.slide_data[1].data.state == state) {
						wizard.slide_data[1].build_city_list = false;
						wizard.next();

					} else {
						$.getJSON('/ajax/get_cities?state='+ state, function(response) {
							$.with_json(response, function(data){
								wizard.slide_data[1].build_city_list = true;
								wizard.slide_data[1].pop_up_title = 'Pick a City in '+ state
								wizard.slide_data[1].data = { state: state, cities: data };
								wizard.next();
							});
						});
					}
				}
				

				return false;
			};
			$areas.unbind('click', get_cities).live('click', get_cities);
		}
		
		function map_flow_step2() {
			var wizard = arguments[0];
			$('#city_name').remove();
			
			if (wizard.slide_data[1].build_city_list) {
				var list = $('#cities_list', '#map_step2').html(''),
					city_nav = $('#city_nav', '#map_step2').html(''),
					city_link = $('<a href="/self-storage/"><span>Self Storage in </span></a>');
				
				for (var i = 0, len = wizard.slide_data[1].data.cities.length; i < len; i++) {
					var letter = wizard.slide_data[1].data.cities[i][0],
						cities = wizard.slide_data[1].data.cities[i][1],
						new_list = $('<li id="cities_'+ letter +'" class="tab_content"></li>');
						
					city_nav.append('<li><a rel="cities_'+ letter +'" href="#'+ letter +'">'+ letter +'</a></li>');
					
					for (var j = 0, len2 = cities.length; j < len2; j++) {
						var new_city = city_link.clone(), city = cities[j];
						
						new_city.show().attr('href', city_link.attr('href') + city.toLowerCase().replaceAll(' ', '-') +'/'+ wizard.slide_data[1].data.state.toLowerCase());
						new_city.find('span').hide().after(city);
						new_list.append(new_city);
					}
					
					list.append(new_list);
				}
				
				$('#map_step2').tabular_content();
				
				var city_click = function() {
					var city_name = $('#city_name', '#map_step2');
					if (city_name.length > 0) city_name.text('Looking for '+ $(this).text() +', '+ wizard.slide_data[1].data.state +'...')
					else $('#map_step2', '#map_nav').append('<p id="city_name">Looking for '+ $(this).text() +', '+ wizard.slide_data[1].data.state +'...</p>');
				}
				$('li a', list).unbind('click', city_click).live('click', city_click);
			}
		}
	}
	
	// steps
	$('p', '#steps').hide();
	var $steps = $('.in', '#steps'),
	    fade_anim_speed = 3400
	    //fade_anim_int = setTimeout(stepsFadeAnim, 1000);
	
	$steps.hover(function(){
		fade_anim_step = $steps.index(this);
		
		$('img', $steps).fadeIn(600);
		$('p', $steps).fadeOut(600);
		
		$('img', this).fadeOut();
		$('p', this).fadeIn();
		//clearTimeout(fade_anim_int);
		
	}, function(){
		$('p', this).fadeOut();
		$('img', this).fadeIn();
	});
	
	function stepsFadeAnim() {
		if (typeof(fade_anim_step) == 'undefined' || fade_anim_step >= $steps.length-1) fade_anim_step = -1;
		fade_anim_step++;
		
		$('img', $steps).fadeIn(600);
		$('p', $steps).fadeOut(600);
		
		$('img', $steps.eq(fade_anim_step)).fadeOut(1200);
		$('p', $steps.eq(fade_anim_step)).fadeIn(1200, function(){
			
			setTimeout(function(){
				clearTimeout(fade_anim_int);
				fade_anim_int = setTimeout(stepsFadeAnim, fade_anim_speed);
			}, fade_anim_speed);
			
		});
	}
	
	$('#advanced_opts', '#pages_controller.home').hide();
	
	// Cities pages
	$('.storage_in_city', '#cities_list').css('width', '23%');
	$('.storage_in_city span', '#cities_list').hide();
	
	// affiliate ads 
	var aff_scroll = $('#aff_scroll');
	if (aff_scroll.length) {
		$('.items', aff_scroll).width($('.usssl_adp', aff_scroll).length * 160);
		aff_scroll.scrollable({ speed: 1500, circular: true, easing: 'swing' });
		
		$.setInterval(function() {
			$('.next', aff_scroll).click();
		}, 7000);
	}
	
	// storage tips page
	var tips_head = $('#tips-head'); 
	if (tips_head.length > 0) {
		new GreyShow({
			delay : 5000,
			context : tips_head,
			slides : [
				{
					start : function(s){
						if ($('.bubble, .purple_bgs', s.context).length < 6) {
							var tips_inner_html = '<div class="purple_bgs" id="bg1"></div><div class="purple_bgs" id="bg2"></div><div class="purple_bgs" id="bg3"></div><div class="bubble" id="bub1"></div><div class="bubble" id="bub2"></div><div class="bubble" id="bub3"></div>';
							$('.bubble, .purple_bgs', s.context).remove();
							tips_head.append(tips_inner_html);
						}
					},
					objects : [
						{ id : 'bg3', action: 'fadeIn', speed: 500, delay: 500 },
						{ id : 'bub1', action: 'fadeIn', speed: 800, delay: 5000, callback: function(o, s){ o.html('<blockquote>I found it on USSelfStorageLocator.com</blockquote>').children().hide().fadeIn('slow') } }
					],
					end : function(s) { s.gotoSlide(1); }
				},
				{
					objects : [
						{ id : 'bg1', action: 'fadeIn', speed: 500, delay: 500 },
						{ id : 'bub2', action: 'fadeIn', speed: 1000, delay: 6000, callback: function(o, s){ o.html('<blockquote>Online rentals are so convenient</blockquote>').children().hide().fadeIn('slow') } }
					],
					end : function(s) { s.gotoSlide(2); }
				},
				{
					objects : [
						{ id : 'bg2', action: 'fadeIn', speed: 500, delay: 500 },
						{ id : 'bub3', action: 'fadeIn', speed: 1000, delay: 8000, callback: function(o, s){ o.html('<blockquote>I was able to find a really great deal!</blockquote>').children().hide().fadeIn('slow') } }
					],
					end : function(s) { s.gotoSlide(0); }
				}
			]
		}).start();
	}
	
	// listings show page
	
	// the google map breaks when it's loaded in a hidden div, then shown by js
	$('a[rel=sl-tabs-map]').click(function(){
		var map = $('#sl-tabs-map');
		// this is a function produced by the Gmap.html() method called from the template, it's provided by the google_map plugin
		// check the header area of the source html for the method definition
		if (!map.is(':hidden')) center_google_map();
	});
	
	// edit site settings page
	// turns a label into a textfield on mouseover, then uses callback to bind an event
	// to the new textfield to turn it back into a label when it blurs
	$('.textFieldable', '#SiteSettingFields .new_setting_field').live('mouseover', function(){
		var $this = $(this),
				settings_field_html = '<input name="new_site_settings[][key]" value="'+ $this.text() +'" class="hintable required" title="Enter a setting name" />';
		
		$(this).textFieldable(settings_field_html, function(text_field){
			$.revertSettingsTextFieldToLabel(text_field, $this.text());
		});
	});
	
	$('.textFieldable', '#SiteSettingFields .existing_setting_field').live('click', function(){
		var $this = $(this),
				existing_settings_html = '<input name="site_settings['+ $this.text() +']" value="'+ $this.text() +'" class="hintable required" title="Enter a setting name" />';
		
		$this.textFieldable(existing_settings_html, function(text_field){
			$.revertSettingsTextFieldToLabel(text_field, $this.text());
		});
		
		return false;
	});
	
	if ($.on_page([['locator, home', 'listings']])) {
		$('#top_map_btn').live('click', function(){
			var $this = $(this),
				main_map = $('#main_map'),
				location = $this.attr('data-loc').split(','),
				lat = parseFloat(location[0]),
				lng = parseFloat(location[1]);

			if ($this.text() == 'Show Map') {
				$.cookie('mo', true, { expires: 30 });
				$('span', $this).text('Hide Map');
				main_map.slideDown();
			} else {
				$.cookie('mo', null);
				$('span', $this).text('Show Map');
				main_map.slideUp();
			}

			// center the map the first time it opens
			if (main_map.is(':visible')) setTimeout(function(){
				Gmap.checkResize();
				Gmap.setCenter(new GLatLng(lat, lng), 12);
			}, 300);
		});
		
		if (!$.cookie('mo')) {
			$.cookie('mo', true);
			$.open_map($('#main_map'));
		}
	}
	
	// New Permissions
	if ($.on_page([['new', 'permissions, roles']])) {
		$('a.add_link', '.partial_addable').click();
	} // END New Permissions
	
	// user tips page
	$('a', '#tips_sort').live('click', function() {
		$('a', '#tips_sort').removeClass('up').removeClass('down');
		var $this = $(this),
			sort_what = $this.text(),
			tips = $('.blog-lock', '#tips-wrap');
		
		switch (sort_what) {
			case 'Newest' : $.sort_stuff($this, tips, '.share_wrap', function(a, b) {
					var a1 = parseInt($('.updated_at', a).text()),
						b1 = parseInt($('.updated_at', b).text());
					
					return a1 > b1 ? (stuff_sort_inverse ? 1 : -1) : (stuff_sort_inverse ? -1 : 1);
				});
			break;
			case 'Rating' : $.sort_stuff($this, tips, '.share_wrap', function(a, b) {
					var a1 = $('.show-value', a).width(),
						b1 = $('.show-value', b).width();
					
					// this one should sort down when the values are equal since most of the ratings are the same number
					return a1 == b1 ? -1 : a1 > b1 ? (stuff_sort_inverse ? -1 : 1) : (stuff_sort_inverse ? 1 : -1);
				});
			break;
			case 'Title' : $.sort_stuff($this, tips, '.share_wrap', function(a, b) {
					var a1 = $('h3 a', a).text(),
						b1 = $('h3 a', b).text();
						
					return a1 > b1 ? (stuff_sort_inverse ? -1 : 1) : (stuff_sort_inverse ? 1 : -1);
				});
			break;
		}
		
		return false;
		
		/* TODO: do serverside sorting when we have more tips
		get_partial_and_do({ partial: 'views/partials/tips', sort_by: this.href.replace('#', ' ') }, function(response) {
			$.with_json(response, function(partial) {
				$('#tips_view').replaceWith(partial);
			});
		});*/
	});
	
	$('input', '#search_tips').keyup(function() {
		var parent = function() { return $(this).parents('.blog-lock') };
		$('.share_wrap > h3 a, .share_wrap > div', '.blog-lock').search(this.value, 'by substring', { remove: parent });
	});
	
	$('#create_tip').submit(function() {
		var form = $(this).runValidation(),
			ajax_loader = $.new_ajax_loader('after', $('input[type=submit]', form)).show();
		
		if (form.data('valid') && !form.data('saving')) {
			form.data('saving', true);
			
			$.post(form.attr('action'), form.serialize(), function(response) {
				$.with_json(response, function(data) {
					$('<div id="pop_up"><div id="tip_created">' + data +'</div></div>').dialog(default_pop_up_options({
						title: 'Your Tip Was Submitted',
						height: 'auto',
						width: '300px',
						modal: true
					}));
					
					form.parent().hide();
				});
				
				ajax_loader.hide();
				form.data('saving', false);
			}, 'json');
		}
		
		return false;
	});
	
	// build the addThis sharing buttons for each tip
	var sharing_buttons = ['email', 'facebook', 'twitter', 'digg', 'print'],
		addthis_main_btn = '<a href="http://www.addthis.com/bookmark.php?v=250&username=mastermindxs" class="addthis_button_compact">Share</a><span class="addthis_separator">|</span>';
	$('.share_wrap').each(function() {
		if (typeof addthis == 'object') {
			var share_wrap = $('.addthis_toolbox', this).append(addthis_main_btn),
				tip_link = $('.tip_link', this),
				share_url = tip_link.attr('href'),
				share_title = tip_link.text();
			
			$.each(sharing_buttons, function() {
				share_wrap.append('<a class="addthis_button_'+ this +'"></a>');
			});
			
			addthis.toolbox(share_wrap[0], { 'data_track_clickback': true }, { url: share_url, title: share_title });
		}
	});
	
	$('.facebook_share', '#tips-wrap').live('click', function() {
		var tip = $(this).parents('.share_wrap'),
			link = $('h3 a', tip), u = encodeURIComponent(link.attr('href')), t = encodeURIComponent(link.text());
		
		window.open('http://www.facebook.com/sharer.php?u='+ u, 'sharer', 'toolbar=0,status=0,width=626,height=436');
		return false;
	});
	
	$('#form_comments', '#column_5').submit(function() {
		var form = $(this).runValidation(),
			ajax_loader = $.new_ajax_loader('before', $('input[type=submit]', form));
		
		if (form.data('valid') && !form.data('saving')) {
			form.data('saving', true);
			ajax_loader.show();
			
			$.post(form.attr('action'), form.serialize(), function(response) {
				$.with_json(response, function(data) {
					$.greyAlert(data, false);
					form[0].reset();
				});
				
				ajax_loader.hide();
				form.data('saving', false);
			}, 'json');
		}
		
		return false;
	});
	
	// add your facility
	$('form#new_client').submit(function() {
		if (!$('#chk_avail').hasClass('avail')) check_client_email_avail($('#client_email', this));
		
		var signup_form = $(this).runValidation();
		
		if (signup_form.data('valid') && !signup_form.data('saving')) {
			signup_form.data('saving', true);
			
			// 1). gather the facility name and location and ask the server for matching listings to allow the user to pick
			var pop_up_title  = 'Add Your Facility',
				pop_up_height = 'auto',
				sub_partial   = '/clients/signup_steps',
				ajax_loader	  = $('#submit_wrap .ajax_loader', this).show(),
				current_step  = 1,
				form_data     = { 
					company : $('#client_company', signup_form).val(),
					email 	: $('#client_email', signup_form).val(),
					city 	: $('#listing_city', signup_form).val(),
					state 	: $('#listing_state', signup_form).val()
				};
			
			$.post('/ajax/find_listings', form_data, function(response) {
				$.with_json(response, function(data) {
					get_pop_up_and_do({ 'title': pop_up_title, 'height': pop_up_height, modal: true, width: '795px' }, { 'sub_partial': sub_partial }, function(pop_up) { // prepping step 2
						var wizard = new GreyWizard($('#workflow_steps', pop_up), workflow_settings);
						
						if (data.length > 0) { // we found matching listings, start on the first step of the workflow
							workflow_settings.slides[0].data = data;
							wizard.begin_workflow_on(0);
							
						} else wizard.begin_workflow_on(1);
						
						signup_form.data('saving', false);
					});
					
					ajax_loader.hide();
				});
			}, 'json');
		} 
		
		return false;
	});
	
	$('#client_email', '#new_client').blur(function() { check_client_email_avail($(this)); });
	function check_client_email_avail(email_input) {
		var form = $('#new_client').data('saving', true), // will prevent the form from submitting
			chk_avail = $('#chk_avail', email_input.parent()).removeClass('avail').removeClass('not_avail'), email = email_input.val(),
			ajax_loader = $('.ajax_loader', email_input.parent());
			
		if (email == '' || email == email_input.attr('title')) return false;
		
		if (!chk_avail.data('checking')) {
			chk_avail.text('Checking').data('checking', true);
			
			$.getJSON('/ajax/find?model=Client&by=email&value='+ email, function(response) {
				$.with_json(response, function(data) {
					if (data.length) {
						email_input.addClass('invalid')//.focus();
						chk_avail.html('<a href="/login?email='+ email_input.val() +'">Sign In Instead</a>').attr('title', 'You\'ve already signed up with this email before. Try to sign in, or recover your password.').removeClass('avail').addClass('not_avail').show();
					} else {
						email_input.removeClass('invalid');
						form.data('saving', false);
						chk_avail.text('Available').attr('title', 'Good to go!').removeClass('not_avail').addClass('avail');

						if (form_has_inputs_filled(form, ['#listing_city', '#listing_state']))
							form.submit();
					}
					
					chk_avail.data('checking', false);
				});

				ajax_loader.hide();
			});
		}
	}
	
	function form_has_inputs_filled(form, input_ids) {
		var all_filled = true;
		
		$.each(input_ids, function(){
			var input = $(eval("'"+ this +"'"));
			
			if (input.val() == '' || input.val() == input.attr('title')) all_filled = false;
		});
		
		return all_filled;
	}
	
	// Sing up steps rent enable pop up
	$('a.rent_continue', '#pop_up.rent-pop').live('click', function() {
		var $this = $(this);
		$this.parents('.rent-pop').dialog('destroy');
		
		if ($this.attr('id') == 'rent_yes') $('#rental_agree', '#signupstep_4').attr('checked', true);
		else $('#rental_agree', '#signupstep_4').attr('checked', false);
		
		return false;
	});
	
	// CLIENT EDIT page
	if ($.on_page([['edit', 'clients']])) {
		$('.selective_hider').live('click', function(){
			var dont_hide = $(this).attr('rel'), 
				hide_these = $('.hideable'),
				user_hints = $('.user_hint.open');
			
			user_hints.filter('.user_hint[data-rel!='+ dont_hide +']').slideUp();
			user_hints.filter('.user_hint[data-rel='+ dont_hide +']:hidden').slideDown();
			
			if (dont_hide) {
				hide_these.each(function(){
					if (this.id != dont_hide) $(this).slideUp();
					else $(this).slideDown();
				});
			} else {
				hide_these.slideDown();
				user_hints.slideDown();
			}

			return false;
		});
		
		$('#reservations', '#ov-services').click(function(){
			if ($('#issn_enabled').val() != 'false') {
				get_pop_up_and_do({ title: 'Reservations', height: '510', modal: true }, { sub_partial: 'clients/reservations', model: 'Client', id: $('#client_id').text() }, function(pop_up) {
					pop_up.css('background-image', 'none');
				});
				
			} else {
				var partial = 'clients/issn_steps', 
					title = 'Inventory Synchronization', 
					height = 'auto';

				get_pop_up_and_do({ title: title, height: height, modal: true }, { sub_partial: partial, model: 'Client', id: $('#client_id').text() }, function(pop_up) {
					new GreyWizard($('#issn_steps', pop_up), {
						title  : title,
						slides : [
							{ 
								pop_up_title : title,
								div_id  : 'issnstep_1',
								nav_vis : [['back', 'hide'], ['next', function(btn, wizard) { btn.text('Next').data('done', false).fadeOut(); }]],
								action	: function(wizard) {
									$('#issn_status_option a', '#issnstep_1').unbind('click').click(function(){
										wizard.next();
										return false;
									});
									$('#slide_nav').remove();
								}
							},
							{ 
								pop_up_title : 'Inventory Synchronization',
								div_id  : 'issnstep_2',
								nav_vis : [['back', 'fadeIn'], ['next', function(btn, wizard){ btn.text('Done').data('done', true).fadeIn(); }]],
								action	: function(wizard) {
									if (typeof wizard.slide_data[1].client_info == 'undefined') {
										$.getJSON('/ajax/get_partial?partial=clients/issn_agreement&model=Client&id='+ $('#client_id').text(), function(response){
											$.with_json(response, function(data){
												wizard.slide_data[1].client_info = data;
												$('#client_info_preview', wizard.workflow).append(data);

												wizard.workflow.animate({ height: '900px' });

												// printing the page doesn't show the select's value so put it in a hidden span which is visible in the print css
												var pm_select = $('select[name=pm_software]', wizard.workflow);
												pm_select.change(function(){ 
													pm_select.removeClass('invalid'); 

													var span = pm_select.siblings('.val');
													if (!span.length) 
														span = pm_select.after('<span class="val dp"></span>').siblings('.val');

													span.text(pm_select.val());
												});

												// make sure they select a pm software before printing
												$('.ps', wizard.workflow).click(function(){
													if (pm_select.val() == '') {
														pm_select.addClass('invalid');
														return false;
													}
												});
											});
										});

									} else $('#client_info_preview', wizard.workflow).html(wizard.slide_data[1].client_info);

								}
							}
						],
						finish_action: 'close'
					}).begin_workflow_on(0);
				});
			}
			
			return false;
		});
		
		$('.pagination a, .table_sorter', '#pop_up').live('click', function() {
			$('#pop_up').load(this.href + ' #pop_up > div');
			return false;
		});
		
		$('.rsvr_detail_link', '#client_reservations').live('click', function(){
			var $this = $(this),
				detail_box = $('.reservation_wrap', $this.parent()),
				ajax_loader = $('.ajax_loader', $this.parent()).show();
			
			if (detail_box.length == 1) {
				$('.reservation_wrap', 'td.region').hide();
				detail_box.show();
				ajax_loader.hide();
				
			} else {
				$.getJSON(this.href, {}, function(response) {
					$.with_json(response, function(data){
						var box = $(data).append('<a class="close_new_unit" href="#">X</a>');

						$('.reservation_wrap', 'td.region').hide();
						box.appendTo($this.parent());
					});
					
					ajax_loader.hide();
				});
			}
			
			
			return false;
		});
		
		$('.close_btn', '.reservation_wrap').live('click', function() {
			$(this).parent().hide();
			return false;
		});
		
		$('.inline_save').live('focus', function() {
			var input = $(this);
			input.after('<a class="submit_btn" href="#">Save</a>');
		});
		
		$('.attribute_save').live('click', function() {
			var save_btn = $(this),
				input = $('.inline_save', save_btn.parent());
			
			if (input.val() != '' && input.val() != inline_save_orig_values[input.attr('id')]) {
				save_btn.attr('href', save_btn.attr('href') + input.value)
			}
			$.log(this, inline_save_orig_values)
			return false;
		});
		
		
		
	} // END page clients edit
	
	// client and listing edit page
	$('.hint_toggle').live('click', function() {
		var btn = $(this),
			hint = btn.parents('.user_hint'),
			placement_id = btn.parent('p').attr('id').replace('UserHintPlacement_', ''),
			ajax_loader = $('.ajax_loader', hint).show();

		$.updateModel('/user_hints/'+ placement_id +'/'+ btn.attr('rel'), { model: 'UserHintPlacement' }, function(data) {
			if (btn.attr('rel') == 'hide') {
				hint.slideUp(900).removeClass('open').addClass('hide');
				hint.children().fadeOut(600);
			} else {
				hint.slideDown(900).removeClass('hide').addClass('open');
				hint.children().fadeIn(1200);
			}
				
			ajax_loader.hide();
		});
		
		return false;
	});
	
	$('input', '#user_hint_toggles').click(function(){
		$('.hint_toggle[rel='+ this.value +']:'+ (this.value == 'open' ? 'hidden' : 'visible' )).click();
	});
	
	// Listing Edit
// NEW LISTING WORKFLOW
	var searcher_settings = function() {
		return {
			title : 'Find Your Facilities',
			nav_id : 'workflow_nav',
			set_slides : false,
			width : 500,
			slides : [
				{
					div_id  : 'searcher_step1',
					nav_vis : [
						['next', function(btn, wizard) { function _next1() { wizard.slide_data[2].went_back = false; wizard.slide_data[1].skipped = false; }; btn.fadeIn().unbind('click', _next1).click(_next1); }],
						['skip', function(btn, wizard) { function _skip1() { wizard.slide_data[1].skipped = true; wizard.slide_data[2].went_back = false; }; btn.fadeOut().unbind('click', _skip1).click(_skip1); }],
						['back', 'fadeOut']
					],
					action : function(wizard) {
						wizard.workflow.animate({ 'height': '321px' }, 'slow');
					},
					validate : function(wizard) {
						if (wizard.slide_data[1].skipped) return true;
						
						var form = $('form#listing_searcher', wizard.workflow).runValidation();
						return form.data('valid');
					}
				},
				{ 
					div_id  : 'searcher_step2',
					pop_up_title : 'Select Your Facilities',
					nav_vis : [
						['next', function(btn, wizard) { btn.text('Next').click(function() { wizard.slide_data[1].skipped = false; wizard.slide_data[2].went_back = false; }); }],
						['skip', function(btn, wizard) { function _skip2() { wizard.slide_data[1].skipped = true; wizard.slide_data[2].went_back = false; }; btn.fadeIn().unbind('click', _skip2).click(_skip2); }],
						['back', 'fadeIn']
					],
					action : function(wizard) {
						if (wizard.slide_data[2].went_back) {
							wizard.slide_data[2].went_back = false;
							wizard.slide_data[1].skipped = false;
							wizard.prev(); return false;
						}
						
						var form = $("form#listing_searcher", wizard.workflow);
						wizard.slide_data[1].data_changed = wizard.slide_data[1].form_data != form.serialize();
						wizard.slide_data[1].found_listings = wizard.slide_data[1].data_changed;
						wizard.slide_data[1].form_data = form.serialize();
						
						if (wizard.slide_data[1].skipped && !wizard.slide_data[2].went_back) {
							wizard.next();
							
						} else if ((wizard.slide_data[1].data_changed && wizard.slide_data[1].found_listings) || wizard.slide_data[2].went_back) {
							wizard.workflow.animate({ 'height': (wizard.slide_data[1].found_listings ? '140px' : (wizard.slide_data[1].slide_length || '470px')) }, 'slow');
							wizard.slide_data[1].skipped = false;
							wizard.slide_data[2].went_back = false;
							
							var listings_box = $('.listings_box', '#searcher_step2').html($.ajax_loader_tag('ajax-loader-lrg.gif', listings_box)).show(),
								listing_prototype = $('.listing_div', '#searcher_step2'),
								big_ajax_loader = $('.ajax_loader', listings_box).show();
							
							$.post(form.attr('action'), wizard.slide_data[1].form_data, function(response) {
								$.with_json(response, function(data) {
									if (data.length > 0) {
										var len = (65 * data.length) + 65;
										wizard.slide_data[1].slide_length = len > 460 ? '460px' : len + 'px';
										
										$.appendListingDataToBox(data, listing_prototype, listings_box);
										
										wizard.workflow.animate({ 'height': wizard.slide_data[1].slide_length }, 'fast');
										wizard.slide_data[1].listings = $('.listing_div', listings_box).fadeIn();
										$('#select_all', wizard.workflow).show();
									} else {
										wizard.workflow.animate({ 'height': '140px' }, 'fast');
										$('#select_all', wizard.workflow).hide();
										listings_box.html('<p>No facilities were found using that information. Try using the first word of your facilities name, leave out the city and/or state too. If we still don\'t have it just click the skip button.');
									}

									form.data('sending', false);
									big_ajax_loader.hide();
								});
							}, 'json');
							
						} else if (wizard.slide_data[1].listings) {
							var len = (65 * wizard.slide_data[1].listings.length) + 65;
							wizard.slide_data[1].slide_length = len > 460 ? '460px' : len + 'px';
							wizard.workflow.animate({ 'height': wizard.slide_data[1].slide_length }, 'fast');
						}
					},
					validate : function(wizard) {
						if (!wizard.slide_data[1].skipped && $('.listing_div.selected', '#searcher_step2').length == 0) {
							$.greyAlert('Choose at least one listing<br />or click the skip button.');
							return false;
							
						} else return true;
					}
				},
				{ 
					div_id  : 'searcher_step3',
					pop_up_title : 'Confirm Your Selection',
					nav_vis : [
						['next', function(btn, wizard) { btn.text(wizard.slide_data[1].skipped ? 'Done' : 'Submit').data('done', false); }],
						['skip', 'fadeOut'],
						['back', function(btn, wizard) { function _back3() { wizard.slide_data[2].went_back = true; wizard.prev(); return false; }; btn.fadeIn().unbind('click', _back3).click(_back3); }]
					],
					action : function(wizard) {
						if (wizard.slide_data[1].skipped) {
							$('#ui-dialog-title-pop_up', wizard.workflow.parent().parent()).text('How To Add A New Facility');
							$('.listings_box', '#searcher_step3').hide();
							$('#skipped_listings_find', '#searcher_step3').fadeIn();
							wizard.workflow.animate({ 'height': '225px' }, 'fast');
						
						} else {
							var checked_listings = $('.listing_div.selected', '#searcher_step2').clone();
							wizard.slide_data[1].found_listings = false; // resetting this value to stop previous action from doing an ajax post again if user clicks back
							$('#selected_listings', '#searcher_step3').html('').show().append(checked_listings);
							$('#skipped_listings_find', '#searcher_step3').hide();
							
							var boxheight = (65 * checked_listings.length) + 65;
							if (boxheight > 460) boxheight = 460;
							wizard.workflow.animate({ 'height': boxheight +'px' }, 'fast');
						}
					}
				},
				{ 
					div_id  : 'searcher_step4',
					pop_up_title : 'Saving Your Selection',
					nav_vis : [
						['next', function(btn, wizard) { btn.text('Done').data('done', true); }],
						['skip', 'fadeOut'],
						['back', 'fadeOut']
					],
					action : function(wizard) {
						var selected_listings = $('.listing_div', '#searcher_step3').map(function() { return $('input[name=listing_id]', this).val() });
						
						if (wizard.slide_data[1].skipped || selected_listings.length == 0) {
							wizard.workflow.parent('#pop_up').dialog('destroy').remove();
							$('#add_fac', '#ov-units').data('skip_find', true).click();

						} else {
							var form = $('#selected_listings', '#searcher_step3'),
								ajax_loader = $('.ajax_loader', '#searcher_step4').show();
							
							$.post(form.attr('action'), { listing_ids: selected_listings }, function(response) {
								$.with_json(response, function(data) {
									wizard.workflow.animate({ 'height': '110px' }, 'fast');
									$('#ui-dialog-title-pop_up', wizard.workflow.parent().parent()).text('Your Listings Have Been Claimed');
									$('#claim_success_msg', '#searcher_step4').html('<p>'+ data +'</p>');
								})
							}, 'json');
						}
					}
				}
			],
			finish_action : function(wizard) {
				wizard.workflow.parent('#pop_up').dialog('destroy').remove();
			}
		};
	}

	// 1). Click NEW button, get a partial from the server and prepend to the listing box
	$('#add_fac', '#ov-units').live('click', function(){
		var $this 		   = $(this),
			listing_box    = $('#client_listing_box', $this.parent().parent()),
			ajax_loader    = $this.prev('.ajax_loader').show(),
			searcher_steps = $('#searcher_steps').clone();
		
		if ($this.data('skip_find')) { // GET PARTIAL
			$this.data('skip_find', false);
			
			$.getJSON('/ajax/get_partial?model=Listing&partial=listings/listing', function(response){
				$.with_json(response, function(data){
					var partial 	  = $(data).hide(),
						title_input   = $('input[name="listing[title]"]', partial),
						tip_text	  = $('.new_listing_tip', partial);

					// insert the new listing into either the #empty_listings box or #rslt-list-bg
					if ($('.listing', listing_box).length == 0) listing_box.html('<div id="rslt-list-bg"></div>').find('#rslt-list-bg').append(partial);
					else $('#rslt-list-bg', listing_box).prepend(partial);

					$('.listing', listing_box).removeClass('active');
					partial.addClass('active').slideDown(300, function() { 
						tip_text.fadeIn(600);
						title_input.focus();
					});

					bind_listing_input_events();
					$.bindPlugins();
				});

				ajax_loader.hide();
			});
			
		} else { // get a pop up with a listing searcher, much like the add facility workflow
			get_pop_up_and_do({ title: 'Find Your Listings', width : '450px', height : 'auto', modal: true }, { sub_partial: 'listings/searcher_steps', model: 'Client', id: $('#client_id').val() }, function(pop_up) {
				new GreyWizard(pop_up.children('#searcher_steps'), new searcher_settings()).begin_workflow_on(0);
				ajax_loader.hide();
			});
		}
	
		return false;
	});
	
	$('#add_mng', '#ov-sub-users').click(function() {
		var $this = $(this),
			manager_box = $('#new_client_box'),
			ajax_loader = $.new_ajax_loader('before', this).show();
			
		manager_box.dialog(default_pop_up_options({ title: 'Add New Manager', width: '400px', height: 'auto' }));
		
		return false;
	});
	
	$('.cancel_link', '#client_listing_box').live('click', function() {
		var $this = $(this),
			listing = $this.parents('.listing'),
			listing_id = listing.attr('id').replace('Listing_', '');
		
		if (listing_id.length) {
			$.greyConfirm('Are you sure?', function() {
				delete_client_listing(listing_id);
				listing.slideUpRemove();
			});
		} else listing.slideUpRemove();
		
		return false;
	});
	
	$('.delete_link', '#client_listing_box').click(function() {
		var listing_id = $(this).parents('.listing').attr('id');
		delete_client_listing(listing_id);
		
		return false;
	});
	
	function delete_client_listing(listing_id) {
		var ajax_loader = $('.ajax_loader', '#ov-units-head').show();
		
		$.post('/clients/'+ $('#client_id').val() +'/listings/'+ listing_id.replace('Listing_', '') +'/disable', { authenticity_token: $.get_auth_token() }, function(response) {
			$.with_json(response, function(data) {
				$('#Listing'+ listing_id, '#ov-units').slideUpRemove();
			});
			
			ajax_loader.hide();
		});
	}

	// 2). bind events to the inputs in the new partial: 
	// SAVE TITLE ON BLUR
	$('.listing:eq(0) input[name="listing[title]"]', '#client_listing_box').live('blur', function(){
		var partial 	  = $('.listing:eq(0)', '#client_listing_box'),
			title_input   = $('input[name="listing[title]"]', partial).removeClass('invalid'),
			tip_text	  = $('.new_listing_tip', partial),
			tip_inner	  = tip_text.find('strong'),
			listing_id	  = partial.attr('id') ? partial.attr('id').replace('Listing_', '') : null;
			ajax_loader   = $('#add_fac', '#ov-units').prev('.ajax_loader').show();
		
		if (title_input.val() != '' && title_input.val() != title_input.attr('title')) {
			tip_text.animate({ top: '36px' }); // MOVE TIP TEXT down to address row
			tip_inner.text('Enter the street address.');
			ajax_loader.show();
			
			var params = { title: title_input.val(), client_id: $('#client_id').val() };
			if (listing_id) params['id'] = listing_id;
			
			$.post('/listings/quick_create', params, function(response){
				if (response.success) partial.attr('id', 'Listing_'+ response.data.listing_id);
				else title_input.addClass('invalid').focus(); // SERVER VALIDATION DID NOT PASS
				
				ajax_loader.hide();
			}, 'json');
		
		} else {
			title_input.focus();
			ajax_loader.hide();
			setTimeout(function() { title_input.addClass('invalid') }, 300); // wait a little bit to turn this red, just in case the clicked on cancel and the listing is slideing up
		}
	
	});
	
	// a collection of the input names and the msg to change the tip to, and the method with which to change the tip
	var listing_tip_inner_tag = 'strong',
		listing_input_msgs = [
			['address', 'Type in the city.', function(tip_text, msg){
				tip_text.animate({ top: '60px' }); // MOVE TIP TEXT down to city state zip row
				tip_text.find(listing_tip_inner_tag).text(msg);
			}],
			['city', 'Enter the 2 letter State abbrev.', function(tip_text, msg){
				tip_text.find(listing_tip_inner_tag).text(msg);
			}],
			['state', 'Enter the 5 digit zip code.', function(tip_text, msg){
				tip_text.find(listing_tip_inner_tag).text(msg);
			}],
			['zip', '<strong>Almost Done! Click Save.</strong>', function(tip_text, msg){
				tip_text.css('text-align', 'right').html('<strong>Almost Done! Click Save.</strong>');
			}]
		];
	
	function bind_listing_input_events() {
		$.each(listing_input_msgs, function(){
			var input_name = this[0], blur_msg = this[1], done_action = this[2],
				tip_text   = $('.new_listing_tip', '.listing:eq(0)');
			
			$('input[name="listing['+ input_name +']"]', '.listing:eq(0)').live('blur', function(){
				var input = $('input[name="listing['+ input_name +']"]', '.listing:eq(0)').removeClass('invalid');

				if (input.val() != '' && input.val() != input.attr('title')) done_action.call(this, tip_text, blur_msg);
				else input.focus().addClass('invalid');
			});
		});
		
		$('#listing_title', '#client_listing_box').keyup(function() {
			var $this = $(this),
				dlogo_txt = $('.dlogo_wrap', $this.parents('.inner')).children('span');
			
			dlogo_txt.text($this.val());
		});
		
		// SAVE ADDRESS WHEN USER CLICKS SAVE BUTTON
		$('.action_btn a', '.listing:eq(0)').live('click', function(){
			var partial 	= $('.listing:eq(0)', '#client_listing_box'),
				button  	= $(this),
				ajax_loader = $('#add_fac', '#ov-units').prev('.ajax_loader');

			if (!button.data('saving') && button.text() == 'Save' && form_inputs_valid('.rslt_contact')) {
				button.data('saving', true);
				ajax_loader.show();

				var listing_id = partial.attr('id').replace('Listing_', ''),
					attributes = {
						address : $('input[name="listing[address]"]', partial).val(),
						city 	: $('input[name="listing[city]"]', partial).val(),
						state 	: $('input[name="listing[state]"]', partial).val(),
						zip 	: $('input[name="listing[zip]"]', partial).val()
					};

				// SAVE ADDRESS WHEN USER CLICKS SAVE
				$.post('/listings/'+ listing_id, { _method: 'put', listing: attributes , from: 'quick_create', authenticity_token: $.get_auth_token() }, function(response){
					$.with_json(response, function(data){
						button.text('Edit').unbind('click').attr('href', '/clients/'+ $('#client_id').val() +'/listings/'+ listing_id +'/edit');
						
						listing = $(data);
						partial.html(listing.html()).removeClass('active');
						$('#listings_size').text(parseInt($('#listings_size').text()) + 1);
					});

					button.data('saving', false);
					ajax_loader.hide();

				}, 'json');

				return false;
			}
		});
	} // END bind_listing_input_events()
	
	function form_inputs_valid(context) {
		$('.i', context).each(function(){
			if ($(this).hasClass('invalid')) return false;
		});
		return true;
	}
	
	// END 2). bind events to listing inputs
		
// END new listing workflow
	
	// the forms in the listing detail edit page
	$('.edit_listing', '#sl-edit-tabs').live('submit', function() {
		var form = $(this).runValidation(),
			context = form.parent(),
			btn = $('.save', form),
			ajax_loader = $('.ajax_loader', form);
		
		if (form.data('valid') && !form.data('saving')) {
			form.data('saving', true);
			ajax_loader.show();
			$.disable_submit_btn(btn);
			
			$.post(form.attr('action'), form.serialize(), function(response) {
				$.with_json(response, function(data) {
					if (data) $('#'+ form.attr('data-target')).html(data);
						
					var success_msg = $('<span class="success_msg right">Saved!</span>');
					$('input[type=submit]', context).after(success_msg);
					success_msg.fadeOutLater('slow', 3000);
				});
				
				$.activate_submit_btn(btn);
				ajax_loader.hide();
				form.data('saving', false);
			}, 'json');
		}
		
		return false;
	});
	
	$('textarea.count_me', '#descript').displayWordCount(function(count, display) {
		if (count >= 100 && !display.hasClass('scored')) display.addClass('scored');
		else if (count < 100 && display.hasClass('scored')) display.removeClass('scored');
	});
	
	$('#tracking_num_req', '#tab1').live('click', function() {
		var $this = $(this),
			ajax_loader = $.new_ajax_loader('after', $this).show();
		
		get_pop_up_and_do({ title: 'Request Tracked Number', modal: true }, { sub_partial: '/listings/tracking_request', model: 'Listing', id: $('#listing_id').val() }, function(pop_up) {
			$('.numeric_phone', pop_up).formatPhoneNum();
		});
	});
	
	$('form#tracking_request').live('submit', function() {
		var form = $(this);
		
		$.safeSubmit(this, {
			success: function(data) {
				form.replaceWith('<p class="framed center">'+ data +'</p>');
			}
		});
		
		return false;
	});
	
	// business hours edit form, listing page
	$('.all_day_check', '#hours').change(function(){
		var day_check = $(this), 
			context = day_check.parent().parent().parent(),
			day_closed = $('.day_closed', context);
		
		day_check.data('was_checked', day_check.is(':checked'));
		
		if (day_check.is(':checked')) {
			$('select, input[type=hidden]', context).attr('disabled', true);
			
			day_closed.each(function(){
				var check = $(this);
				check.data('was_checked', check.is(':checked'));
			});
			
			day_closed.attr('checked', true);
			$('select[rel=opening]', context).val('12:00 am');
			$('select[rel=closing]', context).val('12:00 am');
		} else {
			day_closed.each(function(){
				var check = $(this).attr('checked', false).change();
				
				if (check.data('was_checked') && !check.is(':checked')) {
					check.attr('checked', true);
					$('select, input[type=hidden]', check.parent()).attr('disabled', false);
				}
			});
		}
	});
	
	$('.all_day_check', '#hours').each(function() {
		var $this = $(this);
		if ($this.is(':checked')) $this.change();
	});
	
	$('.hour_range', '#business_hours_form').each(function(){
		var fields = $('select, input[type=hidden]', this),
			checkbox = $(':checkbox', $(this).parent());
		
		if (!checkbox.is(':checked')) fields.attr('disabled', true);
		else fields.attr('disabled', false);
	});
	
	$('.day_closed', '#business_hours_form').live('change', function(){
		var check = $(this),
			all_day_check = $('.all_day_check', check.parents('.hours_display'));
		
		check.data('was_checked', check.is(':checked'));
		
		if (check.is(':checked')) $('select, input[type=hidden]', $(this).parent().find('.hour_range')).attr('disabled', false);
		else $('select, input[type=hidden]', $(this).parent().find('.hour_range')).attr('disabled', true);
		
		// TODO: move the all_day_check out of this func, so it doesn't get overwritten after multiple clicks from one check
		if ($('.day_closed:checked', check.parents('.hours_display')).length == 1) {
			all_day_check.data('was_checked', all_day_check.is(':checked'));
			all_day_check.attr('checked', false);
		} else if ($('.day_closed:checked', check.parents('.hours_display')).length == 0) {
			all_day_check.attr('checked', all_day_check.data('was_checked'));
		}
	});
	
	$('.copy_all_hours', '#business_hours_form').click(function(){
		var monday_range = $(this).parent(),
			checked = $(':checkbox', monday_range.parent()).is(':checked'),
			monday_hours = $('select', monday_range),
			other_hours = $('.hour_range select', monday_range.parent().parent()).not(monday_hours);
			
		other_hours.each(function(){
			var this_hour = $(this),
				this_day = this_hour.parent().parent();
			
			if (this_hour.attr('rel') == 'opening') this_hour.val(monday_hours.eq(0).val());
			else if (this_hour.attr('rel') == 'closing') this_hour.val(monday_hours.eq(1).val());
			
			$(':checkbox', this_day).attr('checked', checked);
			$('select, input[type=hidden]', this_day).attr('disabled', !checked);
		});
		
		return false;
	});
	
	$('#save_hours', '#hours').click(function(){
		var $this = $(this),
			form = $this.parents('#hours').find('form'),
			ajax_loader = $('.ajax_loader', '#hours');
		
		if (!form.data('saving')) {
			form.data('saving', true);
			ajax_loader.show();
			$.disable_submit_btn($this);
			
			$.post(form.attr('action'), form.serialize(), function(response) {
				$.with_json(response, function(data){
					$this.after('<span class="success_msg">Saved!</span>');
					setTimeout(function(){ $('.success_msg', '#hours').fadeOutRemove(1000); }, 3000);
				});
				
				$.activate_submit_btn($this);
				form.data('saving', false);
				ajax_loader.hide();
			}, 'json');
		}
		
		return false;
	});
	
	// unit sizes form
	$('#sync_listing').click(function() {
		var $this = $(this).text('Syncing'),
			ajax_loader = $this.siblings('.ajax_loader').show(),
			sizes_in = $('#sl-tabs-sizes-in').addClass('faded');
		
		$.post($this.attr('href'), {}, function() {
			$.greyAlert('Your unit details are being synced. Reload the page after few minutes to see the changes.', false);
		}, 'json');
		
		return false;
	});
	
	// upload pics
	$('#picture_facility_image', '#new_picture').live('change', function(){
		if ($.browser.msie) return true;
		var thumb = $('<li><img src="http'+ (window.location.href.substring(0, 5) == 'https' ? 's' : '') +'://s3.amazonaws.com/storagelocator/images/ui/ajax-loader-lrg.gif" class="loading" alt="" /><a class="iconOnly16 delete_link right" title="Delete this picture">Delete</a></li>');;
		
		if ($('.main_pic', '#sl-tabs-pict-in').length == 0) {
			var image = $('<img class="big-pic" />');
			$('.gallery', '#sl-tabs-pict-in').append(image);
		}
		
		if ($(this).val() != '') $('#new_picture').ajaxSubmit({
			dataType: 'json',
			beforeSubmit: function(arr, $form, options) {
				$('#sl-tabs-pict-gall').append(thumb);
				thumb.hide().fadeIn(600);
				setTimeout(function(){ $('#picture_facility_image', $form).val('') }, 100);
			},
			success: function(response){
				$.with_json(response, function(data){
					var thumb_img = $('img', thumb);
					thumb_img.attr({ src: data.thumb, id: 'Picture_'+ data.id }).removeClass('loading');
					thumb_img.after('<a href="/listings/'+ data.listing_id +'/pictures/'+ data.id +'" class="delete_link right">Delete</a>');
					
					if (image) image.attr('src', data.image);
					
					thumb_img.trigger('mouseover');
				});
			}
		});
	});
	
	// CLIENT billing info and mailing address
	$('#client_edit_contact').live('click', function() {
		var $this = $(this);
		
		$.authenticate_user_and_do($this, function(data) {
			var cancel_link = $('<a class="cancel_link iconOnly16 right" style="margin-top:13px;" title="Cancel Editing">Cancel</a>'),
				wrap = $('#owner_info_wrap', $this.parent().parent()),
				ajax_loader = $.new_ajax_loader('before', $this);

			if ($this.text() == 'Edit') {
				ajax_loader.show();

				$.getJSON($this.attr('href'), function(response) {
					$.with_json(response, function(data) {
						$this.text('Save').after(cancel_link);
						wrap.hide().after(data);
						$('.numeric_phone', wrap.parent()).formatPhoneNum();
						$('.hintable', wrap.parent()).hinty();
						$('.auto_next', wrap.parent()).autoNext();
					});

					ajax_loader.hide();
				});

			} else if ($this.text() == 'Save') {
				var form = $('#edit_info', wrap.parent()).runValidation(),
					clink = $('.cancel_link', $this.parent());

				if (!$this.data('saving') && form.data('valid')) {
					$this.data('saving', true);
					clink.hide();
					ajax_loader.show();

					$.post(form.attr('action'), form.serialize(), function(response) {
						$.with_json(response, function(data) {
							$this.text('Edit').after('<span class="success_msg">Saved!</span>').next('.success_msg').fadeOutLater('slow', 3000);
							wrap.show().html(data);
							form.remove();
							clink.remove();
						}, function(error) {
							$.greyAlert(error);
							clink.show();
						});

						$this.data('saving', false);
						ajax_loader.hide();
					}, 'json');
				}
			}

			cancel_link.click(function() {
				$('#edit_info').remove();
				$('#owner_info_wrap').show();
				$(this).fadeOutRemove(300);
				$('#client_edit_contact').text('Edit');
				return false;
			});
		}, $this.text() == 'Save');
		
		return false;
	});
	
	var fac_photo_show = $('#sl-photos');
	if (fac_photo_show.length > 0) {
		var imgs = $('img:not(.main_pic)', fac_photo_show), count = 0;
		
		$.setInterval(function() {
			var index = count % imgs.length;
			$(imgs[index]).trigger('mouseover');
			count++;
		}, 7000);
	}
	
	// change main_pic when thumb is hovered
	$('#sl-tabs-pict-gall img, #previews img').live('mouseover', function() {
		if ($(this).hasClass('loading')) return false;
		
		var main_pic = $('#sl-tabs-pict .main_pic, #sl-photos .main_pic');
		if (main_pic.length == 0) main_pic = $('<img class="main_pic hide" src="'+ this.src.replace('/thumb_', '/medium_') +'" alt="'+ this.alt +'" />').appendTo('#main_pic_wrap');
		else if (main_pic.length > 1) {
			var p = main_pic.eq(0);
			main_pic.not(p).remove();
			main_pic = p;
		}
		
		$('img', '#sl-photos #previews, #sl-tabs-pict-gall').removeClass('active');
		var thumb = $(this), 
			new_img = $('<img class="main_pic hide" src="'+ thumb.attr('src').replace('/thumb_', '/medium_') +'" alt="'+ thumb.attr('alt') +'" />');
			
		new_img.load(function() {
			thumb.addClass('active');
			main_pic.after(new_img).fadeOutRemove(900);
			new_img.fadeIn(900);
		});
	}).live('click', function() { return false });
	
	$('.delete_link', '#sl-tabs-pict').live('click', function() {
		var $this = $(this);
		
		if (!$this.data('deleting')) $.greyConfirm('Are you sure you want to delete this picture?', function() {
			$this.data('deleting', true).text('Deleting...');
			
			var img = $this.prev('img'),
				id = img.attr('id').replace('Picture_', '');

			$.post($this.attr('href'), { _method: 'delete', authenticity_token: $.get_auth_token() }, function(response){
				$.with_json(response, function(data){
					if (img.hasClass('active'))
						$('img:not(#'+ img.attr('id') +')', '#sl-tabs-pict').trigger('mouseover');
					
					if ($('img', '#sl-tabs-pict-gall').length == 1)
						$('.main_pic', '#sl-tabs-pict').eq(0).fadeOutRemove(900);
						
					$this.parent().fadeOutRemove(600);
				});
			}, 'json');
		});
		
		return false;
	});
	
	$('#account_home_link', '#clients_controller').click(function() {
		//if (!FlashDetect.installed) return true;
		
		// for some reason the stats_graph div was getting a width of 400px when the page loaded with it hidden (navigated from the listing edit page through one of the client option links)
		$('#stats_graph').css('width', '700px');
		init_stats_graph();
	});
	
	$('.auto_change', '#ov-reports-cnt').change(function(){
		//if (!FlashDetect.installed) return false;
		
		$('#stats_graph').children().fadeTo('slow', .5);
		init_stats_graph({ months_ago : this.value, force: true });
	});
	
	function init_stats_graph(options) {
		if (typeof options == 'undefined') var options = {};
		var graph_id	= 'stats_graph',
			stats_graph = $('#'+ graph_id),
			days_ago 	= options.days_ago 	 || 0,
			months_ago 	= options.months_ago || 1,
			years_ago 	= options.years_ago  || 0,
			force 		= options.force 	 || false;
		
		if (stats_graph.length > 0) {
			stats_graph.addClass('loading');

			var issn_enabled = $('input#issn_enabled').val() == 'false' ? false : true,
				stats_models = 'clicks,impressions,'+ (issn_enabled ? 'rentals' : 'info_requests'),
				d 			 = new Date(), // getMonth returns 0-11
				end_date 	 = new Date(d.getFullYear(), d.getMonth(), d.getDate()+1),
				start_date 	 = new Date((d.getFullYear() - years_ago), (d.getMonth() - months_ago), (d.getDate() - days_ago)), // month in the past
				client_id	 = $('#client_id').val(),
				listing_id 	 = $('#listing_id').val(),
				query		 = '?start_date='+ start_date +'&end_date='+ end_date +'&stats_models='+ stats_models +'&client_id='+ client_id,
				try_count 	 = 0,
				int_id;
			
			if (listing_id) { // get this listings stats right away
				$.getJSON('/ajax/get_listing_stats'+ query +'&listing_id='+ listing_id, function(response) { // send the query to the server so it can generate the stats and save it to cache
					$.with_json(response, function(data) {
						build_jqplot_graph(graph_id, stats_graph, data, stats_models, issn_enabled);
					});
				});
				
			} else { // send the query to the server so it can generate the stats and save it to cache
				$.getJSON('/ajax/generate_client_stats'+ query, function(response) {
					$.with_json(response, function(data) { // found cached version of stats
						build_jqplot_graph(graph_id, stats_graph, data, stats_models, issn_enabled);
						
					}, function(status) { // the server is still generating stats
						stats_graph.append(status);

						int_id = setInterval(function() { // begin polling the server to check if the stats have been generated
							$.getJSON('/ajax/get_client_stats?client_id='+ client_id, function(resp) {
								$.with_json(resp, function(data) {
									build_jqplot_graph(graph_id, stats_graph, data, stats_models, issn_enabled);
									clearInterval(int_id);

								}, function(msg) {
									stats_graph.append(msg);
									try_count++;
								});
							});

							if (try_count > 140) clearInterval(int_id);
						}, 3000);
					});
				});
			}
		}
	}
	
	function build_jqplot_graph(graph_id, stats_graph, data, stats_models, issn_enabled) {
		$.jqplot.preInitHooks.push(function() {
			stats_graph.removeClass('loading').children().remove();
		});

		var plot_data = [],
			stats_arr = stats_models.split(/,\W?/);

		for (i in stats_arr) if (stats_arr.hasOwnProperty(i))
			plot_data.push(data['data'][stats_arr[i]]);

		$.jqplot(graph_id, plot_data, {
			axes: {
				xaxis: { 
					renderer: $.jqplot.DateAxisRenderer,
					rendererOptions: { tickRenderer: $.jqplot.CanvasAxisTickRenderer },
		            tickOptions: { formatString:'%b %#d, %Y', fontSize:'12px' }
				},
				yaxis: { min: 0, max: parseInt(data['max']) + 1 }
			},
			legend: { show: true, location: 'nw', xoffset: 10, yoffset: 10 },
			series: [ 
		        { label: '&nbsp;Clicks', lineWidth: 2, color: '#3333CC', markerOptions: { style: 'diamond', color: '#3333CC' } }, 
		        { label: '&nbsp;Impressions', lineWidth: 2, color: '#FED747', markerOptions: { size: 7, style:'circle', color: '#FED747' } }, 
		        { label: '&nbsp;'+ (issn_enabled ? 'Rentals' : 'Requests'), lineWidth: 2, color: '#339933', markerOptions: { style: 'circle', color: '#339933' } }
		    ],
			highlighter: { sizeAdjust: 7.5 },
			cursor: { show: true, zoom: true, followMouse: true, tooltipLocation: 'ne' },
			grid: { background: '#ffffff' }
		});
	}
	
	//TODO: implement http://pullmonkey.com/projects/open_flash_chart
	//if (!FlashDetect.installed) {
		init_stats_graph({ months_ago : $('select.auto_change', '#ov-reports-cnt').val() });
	//}
	
	// Client tips block
	$('.client_tip:not(:first)', '#tips-box').hide();
	var client_tip_boxes = $('.client_tip', '#tips-box');
	
	if (client_tip_boxes.length > 0) {
		$('a', '#tips-box-bottom').click(function() {
			if (client_tip_boxes.length > 1) {
				var $this = $(this),
					direction = $this.attr('id') == 'next_tip' ? 1 : -1,
					current_tip = $('.client_tip:visible', '#tips-box'),
					current_index = client_tip_boxes.index(current_tip),
					new_index = current_index + direction;
				
				if (new_index == client_tip_boxes.length) new_index = 0;
				else if (new_index < 0) new_index = client_tip_boxes.length - 1;

				current_tip.hide();
				$(client_tip_boxes[new_index]).show();
			}
			
			return false;
		});
	}
		
	// TODO: refactor all button events that do ajax calls
	// first refactor: save buttons, they have a form to submit activerecord models and return a form partial to replace html with updated content
	$('.save_btn').click(function(){
		var $this = $(this),
			form = $('form', $this.attr('context')).runValidation(), // the context the form is in
			ajax_loader = $($this.attr('loader')); // the context the ajax_loader is in
		
		if (form.data('valid')) {
			$.authenticate_user_and_do($this, function(data) {
				if (!form.data('saving')) {
					form.data('saving', true);
					$this.text('Updating');
					ajax_loader.show();
				
					$.post(form.attr('action'), form.serialize(), function(response) {
						$.with_json(response, function(data) {
							$($this.attr('replace'), $this.attr('context')).replaceWith(data);
							$this.after('<span class="success_msg">Saved!</span>').next('.success_msg').fadeOutLater('slow', 3000);
						});

						form.data('saving', false);
						$this.text('Update');
						ajax_loader.hide();
					});
				}
			});
		}
		
		return false;
	});
	
	$('#logo_form').live('submit', function() {
		var form = $(this),
			btn = $('.save', form);
		
		form.ajaxSubmit({
			beforeSubmit: function() {
				$.disable_submit_btn(btn);
				$('.ajax_loader', '#logo_form').show();
			},
			target: '#flogo'
		});
		
		return false;
	});
	
	$('.default_logo', '#logo_choices').live('click', function() {
		var img = $(this), index = img.attr('data-ci');
		img.attr('src', 'http'+ (window.location.href.substring(0, 5) == 'https' ? 's' : '') +'://s3.amazonaws.com/storagelocator/images/ui/ajax-loader-lrg.gif').css({ 'height': '44px', 'border-color': '#fff' });
		
		$.post('/clients/'+ $('#client_id').val() +'/listings/'+ $('#listing_id').val(), { authenticity_token: $.get_auth_token(), from: 'uplogo', default_logo: index, _method: 'put' }, function(response) {
			$('#flogo', '#tab1').html(response);
		});
	});
	
	// trying to refactor functionality for links that open a pop up, eaither a partial, or a post
	$('.open_small_partial').live('click', function() {
		var $this = $(this);
		get_pop_up_and_do({ title: $this.attr('title'), width: 400, height: 248 }, { sub_partial: $this.attr('href') }, function(pop_up) {
			pop_up.css('width', '400px')
		});
		return false;
	});
	
	$('.popup-post').live('click', function() {
		var $this = $(this);
		
		$.getJSON(this.href, function(response) {
			$.with_json(response, function(data) {
				var pop_up = $('<div id="pop_up"></div>');
				pop_up.html(data).dialog(default_pop_up_options({ title: $this.attr('title'), width: '400px' }));
				$('')
			});
		});
		
		return false;
	});
	
	$('.ps').live('click', function() {
		var div_to_print = this.rel,
			print_opts = { operaSupport: $.browser.opera };
		
		if ($(this).attr('href') == '#') $(div_to_print).jqprint(print_opts);
		else {
			$.getJSON(this.href, function(response){
				$.with_json(response, function(data){
					var wrap = $(data).appendTo('body'),
						coup = $(div_to_print).clone().appendTo('#print_content');
					
					wrap.jqprint(print_opts, function(){ wrap.remove(); });
				});
			});
		}
		
		return false;
	});
	
	$('#resend_link', '#signupstep_5').live('click', function() {
		var $this = $(this),
			ajax_loader = $.new_ajax_loader('after', $this.parent());
		
		if (!$this.data('sending')) {
			$this.data('sending', true);
			ajax_loader.show();
			
			$.getJSON($this.attr('href'), function(response) {
				$.with_json(response, function(data) {
					$this.parent().after('<p class="success_msg">The activation email has been resent.</p>');
				});
				
				ajax_loader.hide();
				$this.data('sending', false);
			});
		}
		
		return false;
	});
	
}); // END document ready

// NEW CLIENT Workflow (sign up through the self-storage-advertising page)
var workflow_settings = {
	title		 : 'Add Your Facility',
	nav_id : 'workflow_nav',
	set_slides : false,
	width : 753,
	slides : [
		{
			div_id  : 'signupstep_2',
			action  : workflow_step2,
			nav_vis : [
				['next', function(btn, wizard) { btn.text('Next').data('done', false).show() }],
				['skip', function(btn, wizard) { btn.fadeIn().bind('click', ensure_no_listings_checked) }],
				['back', function(btn, wizard) { btn.show().unbind('click', close_pop_up_and_focus_on_fac_name).bind('click', close_pop_up_and_focus_on_fac_name) }]
			]
		},
		{ 
			div_id  : 'signupstep_3',
			action  : workflow_step3,
			nav_vis : [
				['next', function(btn, wizard) { btn.text('Next').data('done', false).show() }],
				['skip', function(btn, wizard) { btn.fadeOut().unbind('click', ensure_no_listings_checked) }],
				['back', function(btn, wizard) { btn.unbind('click', close_pop_up_and_focus_on_fac_name) }]
			],
			validate : function(wizard){ return $('#contact_info_form', wizard.workflow).runValidation().data('valid'); }
		},
		{ 
			div_id  : 'signupstep_4',
			action  : workflow_step4,
			nav_vis : [
				['next', function(btn, wizard) { btn.text('Submit').data('done', false); }],
				['skip', 'hide'],
				['back', 'fadeIn']
			],
			validate : function(wizard) {
				return $('#terms_use_check', wizard.workflow).runValidation().data('valid');
			}
		},
		{ 
			div_id  : 'signupstep_5',
			action : workflow_step5,
			nav_vis : [
				['next', function(btn, wizard){ btn.text('Done').data('done', true); }],
				['skip', 'hide'],
				['back', 'fadeIn']
			]
		}
	],
	finish_action : function(wizard){ 
		wizard.workflow.parent().dialog('destroy').remove();
		$('#add-fac-form', '#top_fac_page').html('<span class="sub_head">Thanks for signing up! We\'ll contact you soon to help get you started.</span><span class="sub_head right"> -The USSSL Team</span>').css('width', '93.3%');
		$('#price-block',  '#top_fac_page').hide();
		$('#chk_avail, .ajax_loader', '#new_client').hide();
	}
};

function ensure_no_listings_checked() {
	$('input[name=listing_id]:checked', '#signupstep_2').attr('checked', false).parents('.selected').removeClass('selected');
}

function close_pop_up_and_focus_on_fac_name(event){
	$('#pop_up').dialog('close').remove();
	$('#client_company', '#new_client').focus();
}

function workflow_step2(wizard) {
	var listings_box = $('.small_listings', wizard.workflow);
	
	if (listings_box.children().length == 0) {
		listings_box.hide();
		var listing_prototype = $('.listing_div', arguments[0].workflow).eq(0).removeClass('hidden').remove();
		$('.found_box p span', wizard.workflow).text(wizard.slide_data[0].data.length); // number of listings returned
		$.appendListingDataToBox(wizard.slide_data[0].data, listing_prototype, listings_box);
		
		setTimeout(function(){
			listings_box.fadeIn(wizard.settings.fade_speed);
			var listing_id = $.get_param_value('listing_id');
			
			if (listing_id) 
				$('#Listing_'+ listing_id, listings_box).addClass('selected').find(':checkbox[name=listing_id]').attr('checked', true);
		}, 350);
	}
	
}

function workflow_step3(wizard) {
	var addresses = $.get_checked_listings_addresses(wizard),
		city 	  = $('#listing_city', '#new_client').val(),
		state 	  = $('#listing_state', '#new_client').val(),
		zips	  = $.get_checked_listings_addresses(wizard, 'zip');
	
	$.setup_autocomplete('#listing_city', wizard.workflow);
	
	if (addresses.length == 1) $('#listing_address', wizard.workflow).val(capitalize_addr(addresses[0]));
	else if (addresses.length > 1) $('#listing_address', wizard.workflow).autocomplete({ source: capitalize_addr(addresses || []) });
	
	if (zips.length == 1) $('#listing_zip', wizard.workflow).val(zips[0]);
	else if (zips.length > 1) $('#listing_zip', wizard.workflow).autocomplete({ source: zips });
	
	$('#listing_city', wizard.workflow).val(capitalize(city));
	$('#listing_state', wizard.workflow).val(state.toUpperCase());
	
	// bind plugins and change pop_up title
	$('.hintable', wizard.workflow).hinty();
	$('.numeric_phone', wizard.workflow).formatPhoneNum();
	$('.city_state_zip .autocomplete', wizard.workflow).autocomplete();
	
	setTimeout(function(){ $('#first_name', wizard.workflow).focus() }, 350);
}

function workflow_step4() { // form data review
	var wizard    = arguments[0],
		review	  = $('#signupstep_4 .inner', wizard.workflow).html(''), // reset before filling in again if the user clicked back
		listings  = $('#signupstep_2 .small_listings', wizard.workflow).find('input:checked'),
		info	  = $('#signupstep_3 #contact_info_form', wizard.workflow).find('input'),
		company	  = $('#client_company', '#new_client').val(),
		email 	  = $('#client_email', '#new_client').val();
	
	wizard.form_data.client = {};
	wizard.form_data.mailing_address = {};
	wizard.form_data.client['company'] = company;
	wizard.form_data.client['email'] = email;
	wizard.form_data['authenticity_token'] = $.get_auth_token();
	
	info.each(function() {
		switch (this.name) {
			case 'first_name' 		: wizard.form_data.client['first_name'] 	  = capitalize(this.value); break;
			case 'last_name' 		: wizard.form_data.client['last_name'] 		  = capitalize(this.value); break;
			case 'listing_address' 	: wizard.form_data.mailing_address['address'] = this.value; 	   		break;               
			case 'listing_city' 	: wizard.form_data.mailing_address['city'] 	  = capitalize(this.value);	break;               
			case 'listing_state' 	: wizard.form_data.mailing_address['state']   = this.value; 	   		break;               
			case 'listing_zip' 		: wizard.form_data.mailing_address['zip'] 	  = this.value; 	   		break;               
			case 'listing_phone' 	: wizard.form_data.mailing_address['phone']   = this.value || ''; 		break;
			case 'wants_newsletter' : wizard.form_data.client[this.name] 	  	  = this.checked; 			break;
		}
	});
	
	var review_html = '<h4>Contact Information:</h4>';
	
	review_html += '<div id="review_contact">';
		review_html += '<div class="label">Company Name:</div> <p class="listing_title">'+ titleize(company) +'</p>';
		review_html += '<div id="address" class="label">Company Address:</div> <p class="listing_address">' + 
							wizard.form_data.mailing_address['address'] +'<br />'+ 
							capitalize(wizard.form_data.mailing_address['city']) +', '+ 
							capitalize(wizard.form_data.mailing_address['state']) +' '+ 
							wizard.form_data.mailing_address['zip'] +'</p>';
		review_html += '<div id="name" class="label">Name:</div> <p class="name">'+ wizard.form_data.client['first_name'] +' '+ wizard.form_data.client['last_name'] +'</p>';
		
		if (wizard.form_data.mailing_address['phone'] && wizard.form_data.mailing_address['phone'] != 'Phone Number') 
			review_html += '<div class="label">Phone:</div> <p class="phone">'+ wizard.form_data.mailing_address['phone'] +'</p>';
			
		review_html += '<div class="label">Email:</div> <p class="email">'+ email +'</p>';
	review_html += '</div>';
	
	review_html += (wizard.form_data.client['wants_newsletter'] ? '<p class="opt_in">Send' : '<p class="opt_out">Don\'t send') +' me the monthly newsletter.</p>';
	
	if (listings.length > 0) {
		$('.attribute_fields .listing,.attribute_fields .map', review.next()).remove();
		wizard.form_data.listings = [];
		review_html += '<h4 id="listings">My Listings:</h4><div class="small_listings">';
		
		listings.each(function(i) {
			var title 	= titleize($('#Listing_'+ this.value +' .listing_title', wizard.workflow).text()),
				address = titleize($('#Listing_'+ this.value +' .listing_address', wizard.workflow).html());
			
			wizard.form_data.listings.push(this.value);
			
			review_html += '<div class="listing_div"><div class="left block num">'+ (i+1) +'</div><div class="listing_in">';
			review_html += '<p class="listing_title">'+ title +'</p><p class="listing_address">'+ address +'</p></div></div>';
		});
		
		review_html += '</div>';
	}
	
	review.append(review_html);
	
	setTimeout(function(){ review.fadeIn(wizard.settings.fade_speed) }, 350);
}

function workflow_step5(wizard) {
	var post_this_thang = function() {
		var nav_btns = $('.button', wizard.nav_bar).hide(),
			ajax_loader = $('#signup_processing .ajax_loader', wizard.workflow).fadeIn(),
			rent_check = $('#rental_agree', wizard.workflow);
		
		if (!wizard.sending_data) {
			wizard.sending_data = true;
			
			if (rent_check.is(':checked')) 
				wizard.form_data[rent_check.attr('name')] = rent_check.val();
			
			$.post('/clients', wizard.form_data, function(response) {
				$.with_json(response, function(data) {
					nav_btns.filter('.next').show();
					$('#signup_processing', wizard.workflow).hide();
					$('#signup_complete', wizard.workflow).show();
					$('#resend_link', wizard.workflow).attr('href', '/resend_activation/'+ data.activation_code);
				}, function(data) {
					// rerun this function if they click ok on the confirm dialog
					$.greyConfirm('Uh oh, I got an error: '+ data +"<br />Click Yes to try again.", post_this_thang);
					$('.button.back', wizard.nav_bar).fadeIn();
				});

				ajax_loader.hide();
				wizard.sending_data = false;
			}, 'json');
		}
	}
	
	post_this_thang();
}

// HELPERS
$.appendListingDataToBox = function(listings, listing_prototype, listings_box) {
	$.each(listings, function(i) {
		var listing = this.listing,
			listing_div = listing_prototype.clone();

		$('.check input', listing_div).val(listing.id);
		$('.num', listing_div).text(i+1);
		$('.listing_title', listing_div).text(listing.title);
		$('.listing_address', listing_div).html('<span class="street_address">'+ listing.address +'</span><br />'+ listing.city +', '+ listing.state +' <span class="zip">'+ listing.zip +'</span>');

		listing_div.attr('id', 'Listing_'+ listing.id).appendTo(listings_box);
	});
}

$.get_checked_listings_addresses = function(wizard, address_part) {
	if (typeof address_part == 'undefined') var address_part = 'street_address';
	var checked = $('#signupstep_2 :checkbox:checked', wizard.workflow),
		addresses = [];
	
	checked.each(function(){
		var part = $('.'+ address_part, '#Listing_'+ this.value).text();
		addresses.push(part);
	});
	
	return addresses;
}

$.preload_us_map_imgs = function() {
	var states = ["al", "ak", "az", "ar", "ca", "co", "ct", "de", "fl", "ga", "hi", "id", "il", "in", "ia", "ks", "ky", "la", "me", "md", "ma", "mi", "mn", "ms", "mo", "mt", "ne", "nv", "nh", "nj", "nm", "ny", "nc", "nd", "oh", "ok", "or", "pa", "ri", "sc", "sd", "tn", "tx", "ut", "vt", "va", "wa", "wv", "wi", "wy"];
	$.each(states, function(){
		var img = new Image();
		img.src = 'http'+ (window.location.href.substring(0, 5) == 'https' ? 's' : '') +'://s3.amazonaws.com/storagelocator/images/ui/storagelocator/us_map/'+ this +'.png';
	});
}

var translations = [
	{
		page : '.spanish',
		elements : [
			{
				element 	: '.virtual_form #comment_submit',
				method 		: 'val', // val, text, or html
				translation : 'Enviar Mensaje'
			},
			{
				element 	: '#footer_top .wrapper',
				method 		: 'text',
				translation : 'Encuentre un espacio de almacenamiento en cualquier lugar y en cualquier momento!'
			},
			{
				element 	: '#title h1',
				method 		: 'text',
				translation : 'Busque, Ahorre y Rente Almacenamiento En Cualquier Momento.'
			},
			{
				element 	: '#aff-box p',
				method 		: 'html',
				translation : '<strong>Socios Afiliados</strong> - Obtenga grandes ofertas y ahorre en su próximo alquiler de almacenamiento con uno de nuestros socios afiliados.'
			},
			{
				element 	: '#social-media p',
				method 		: 'html',
				translation : '<strong>Compartir esta pagina</strong> - Tenemos ofertas increíbles a través de nuestras páginas de la red social y empresarial.'
			},
			{
				element 	: '#top_cities p strong',
				method 		: 'text',
				translation : 'Las Ciudades Mas Populares De Almacenamiento'
			}
		]
	}
]

$.translate_with = function(translations) {
	$.each(translations, function() {
		var page = this.page;
		
		$.each(this.elements, function() {
			var element = $(this.element, page);
			if (element.length > 0)
				element[this.method](this.translation);
		});
	});
}
