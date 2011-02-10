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
			getElementById(id).style.visibility = v;
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


﻿/*
Copyright (c) 2003-2009, CKSource - Frederico Knabben. All rights reserved.
For licensing, see LICENSE.html or http://ckeditor.com/license
*/

(function(){if(!window.CKEDITOR)window.CKEDITOR=(function(){var a={timestamp:'99GE',version:'3.0.1',revision:'4391',_:{},status:'unloaded',basePath:(function(){var d=window.CKEDITOR_BASEPATH||'';if(!d){var e=document.getElementsByTagName('script');for(var f=0;f<e.length;f++){var g=e[f].src.match(/(^|.*[\\\/])ckeditor(?:_basic)?(?:_source)?.js(?:\?.*)?$/i);if(g){d=g[1];break;}}}if(d.indexOf('://')==-1)if(d.indexOf('/')===0)d=location.href.match(/^.*?:\/\/[^\/]*/)[0]+d;else d=location.href.match(/^[^\?]*\/(?:)/)[0]+d;return d;})(),getUrl:function(d){if(d.indexOf('://')==-1&&d.indexOf('/')!==0)d=this.basePath+d;if(this.timestamp&&d.charAt(d.length-1)!='/')d+=(d.indexOf('?')>=0?'&':'?')+('t=')+this.timestamp;return d;}},b=window.CKEDITOR_GETURL;if(b){var c=a.getUrl;a.getUrl=function(d){return b.call(a,d)||c.call(a,d);};}return a;})();var a=CKEDITOR;if(!a.event){a.event=function(){};a.event.implementOn=function(b,c){var d=a.event.prototype;for(var e in d)if(b[e]==undefined)b[e]=d[e];};a.event.prototype=(function(){var b=function(d){var e=d.getPrivate&&d.getPrivate()||d._||(d._={});return e.events||(e.events={});},c=function(d){this.name=d;this.listeners=[];};c.prototype={getListenerIndex:function(d){for(var e=0,f=this.listeners;e<f.length;e++)if(f[e].fn==d)return e;return-1;}};return{on:function(d,e,f,g,h){var i=b(this),j=i[d]||(i[d]=new c(d));if(j.getListenerIndex(e)<0){var k=j.listeners;if(!f)f=this;if(isNaN(h))h=10;var l=this,m=function(o,p,q,r){var s={name:d,sender:this,editor:o,data:p,listenerData:g,stop:q,cancel:r,removeListener:function(){l.removeListener(d,e);}};e.call(f,s);return s.data;};m.fn=e;m.priority=h;for(var n=k.length-1;n>=0;n--)if(k[n].priority<=h){k.splice(n+1,0,m);return;}k.unshift(m);}},fire:(function(){var d=false,e=function(){d=true;},f=false,g=function(){f=true;};return function(h,i,j){var k=b(this)[h],l=d,m=f;d=f=false;if(k){var n=k.listeners;if(n.length){n=n.slice(0);for(var o=0;o<n.length;o++){var p=n[o].call(this,j,i,e,g);if(typeof p!='undefined')i=p;if(d||f)break;}}}var q=f||(typeof i=='undefined'?false:i);d=l;f=m;return q;};})(),fireOnce:function(d,e,f){var g=this.fire(d,e,f);delete b(this)[d];return g;},removeListener:function(d,e){var f=b(this)[d];if(f){var g=f.getListenerIndex(e);if(g>=0)f.listeners.splice(g,1);}},hasListeners:function(d){var e=b(this)[d];return e&&e.listeners.length>0;}};})();}if(!a.editor){a.ELEMENT_MODE_NONE=0;a.ELEMENT_MODE_REPLACE=1;a.ELEMENT_MODE_APPENDTO=2;a.editor=function(b,c,d){var e=this;e._={instanceConfig:b,element:c};
e.elementMode=d||0;a.event.call(e);e._init();};a.editor.replace=function(b,c){var d=b;if(typeof d!='object'){d=document.getElementById(b);if(!d){var e=0,f=document.getElementsByName(b);while((d=f[e++])&&(d.tagName.toLowerCase()!='textarea')){}}if(!d)throw '[CKEDITOR.editor.replace] The element with id or name "'+b+'" was not found.';}d.style.visibility='hidden';return new a.editor(c,d,1);};a.editor.appendTo=function(b,c){if(typeof b!='object'){b=document.getElementById(b);if(!b)throw '[CKEDITOR.editor.appendTo] The element with id "'+b+'" was not found.';}return new a.editor(c,b,2);};a.editor.prototype={_init:function(){var b=a.editor._pending||(a.editor._pending=[]);b.push(this);},fire:function(b,c){return a.event.prototype.fire.call(this,b,c,this);},fireOnce:function(b,c){return a.event.prototype.fireOnce.call(this,b,c,this);}};a.event.implementOn(a.editor.prototype,true);}if(!a.env)a.env=(function(){var b=navigator.userAgent.toLowerCase(),c=window.opera,d={ie:/*@cc_on!@*/false,opera:!!c&&c.version,webkit:b.indexOf(' applewebkit/')>-1,air:b.indexOf(' adobeair/')>-1,mac:b.indexOf('macintosh')>-1,quirks:document.compatMode=='BackCompat',isCustomDomain:function(){return this.ie&&document.domain!=window.location.hostname;}};d.gecko=navigator.product=='Gecko'&&!d.webkit&&!d.opera;var e=0;if(d.ie){e=parseFloat(b.match(/msie (\d+)/)[1]);d.ie8=!!document.documentMode;d.ie8Compat=document.documentMode==8;d.ie7Compat=e==7&&!document.documentMode||document.documentMode==7;d.ie6Compat=e<7||d.quirks;}if(d.gecko){var f=b.match(/rv:([\d\.]+)/);if(f){f=f[1].split('.');e=f[0]*10000+(f[1]||0)*(100)+ +(f[2]||0);}}if(d.opera)e=parseFloat(c.version());if(d.air)e=parseFloat(b.match(/ adobeair\/(\d+)/)[1]);if(d.webkit)e=parseFloat(b.match(/ applewebkit\/(\d+)/)[1]);d.version=e;d.isCompatible=d.ie&&e>=6||d.gecko&&e>=10801||d.opera&&e>=9.5||d.air&&e>=1||d.webkit&&e>=522||false;d.cssClass='cke_browser_'+(d.ie?'ie':d.gecko?'gecko':d.opera?'opera':d.air?'air':d.webkit?'webkit':'unknown');if(d.quirks)d.cssClass+=' cke_browser_quirks';if(d.ie){d.cssClass+=' cke_browser_ie'+(d.version<7?'6':d.version>=8?'8':'7');if(d.quirks)d.cssClass+=' cke_browser_iequirks';}if(d.gecko&&e<10900)d.cssClass+=' cke_browser_gecko18';return d;})();var b=a.env;var c=b.ie;if(a.status=='unloaded')(function(){a.event.implementOn(a);a.loadFullCore=function(){if(a.status!='basic_ready'){a.loadFullCore._load=true;return;}delete a.loadFullCore;var e=document.createElement('script');e.type='text/javascript';
e.src=a.basePath+'ckeditor.js';document.getElementsByTagName('head')[0].appendChild(e);};a.loadFullCoreTimeout=0;a.replaceClass='ckeditor';a.replaceByClassEnabled=true;var d=function(e,f,g){if(b.isCompatible){if(a.loadFullCore)a.loadFullCore();var h=g(e,f);a.add(h);return h;}return null;};a.replace=function(e,f){return d(e,f,a.editor.replace);};a.appendTo=function(e,f){return d(e,f,a.editor.appendTo);};a.add=function(e){var f=this._.pending||(this._.pending=[]);f.push(e);};a.replaceAll=function(){var e=document.getElementsByTagName('textarea');for(var f=0;f<e.length;f++){var g=null,h=e[f],i=h.name;if(!h.name&&!h.id)continue;if(typeof arguments[0]=='string'){var j=new RegExp('(?:^| )'+arguments[0]+'(?:$| )');if(!j.test(h.className))continue;}else if(typeof arguments[0]=='function'){g={};if(arguments[0](h,g)===false)continue;}this.replace(h,g);}};(function(){var e=function(){var f=a.loadFullCore,g=a.loadFullCoreTimeout;if(a.replaceByClassEnabled)a.replaceAll(a.replaceClass);a.status='basic_ready';if(f&&f._load)f();else if(g)setTimeout(function(){if(a.loadFullCore)a.loadFullCore();},g*1000);};if(window.addEventListener)window.addEventListener('load',e,false);else if(window.attachEvent)window.attachEvent('onload',e);})();a.status='basic_loaded';})();a.dom={};var d=a.dom;(function(){var e=[];a.tools={arrayCompare:function(f,g){if(!f&&!g)return true;if(!f||!g||f.length!=g.length)return false;for(var h=0;h<f.length;h++)if(f[h]!=g[h])return false;return true;},clone:function(f){var g;if(f&&f instanceof Array){g=[];for(var h=0;h<f.length;h++)g[h]=this.clone(f[h]);return g;}if(f===null||typeof f!='object'||f instanceof String||f instanceof Number||f instanceof Boolean||f instanceof Date)return f;g=new f.constructor();for(var i in f){var j=f[i];g[i]=this.clone(j);}return g;},extend:function(f){var g=arguments.length,h,i;if(typeof (h=arguments[g-1])=='boolean')g--;else if(typeof (h=arguments[g-2])=='boolean'){i=arguments[g-1];g-=2;}for(var j=1;j<g;j++){var k=arguments[j];for(var l in k)if(h===true||f[l]==undefined)if(!i||l in i)f[l]=k[l];}return f;},prototypedCopy:function(f){var g=function(){};g.prototype=f;return new g();},isArray:function(f){return!!f&&f instanceof Array;},cssStyleToDomStyle:(function(){var f=document.createElement('div').style,g=typeof f.cssFloat!='undefined'?'cssFloat':typeof f.styleFloat!='undefined'?'styleFloat':'float';return function(h){if(h=='float')return g;else return h.replace(/-./g,function(i){return i.substr(1).toUpperCase();});};})(),htmlEncode:function(f){var g=function(k){var l=new d.element('span');
l.setText(k);return l.getHtml();},h=g('\n').toLowerCase()=='<br>'?function(k){return g(k).replace(/<br>/gi,'\n');}:g,i=g('>')=='>'?function(k){return h(k).replace(/>/g,'&gt;');}:h,j=g('  ')=='&nbsp; '?function(k){return i(k).replace(/&nbsp;/g,' ');}:i;this.htmlEncode=j;return this.htmlEncode(f);},getNextNumber:(function(){var f=0;return function(){return++f;};})(),override:function(f,g){return g(f);},setTimeout:function(f,g,h,i,j){if(!j)j=window;if(!h)h=j;return j.setTimeout(function(){if(i)f.apply(h,[].concat(i));else f.apply(h);},g||0);},trim:(function(){var f=/(?:^[ \t\n\r]+)|(?:[ \t\n\r]+$)/g;return function(g){return g.replace(f,'');};})(),ltrim:(function(){var f=/^[ \t\n\r]+/g;return function(g){return g.replace(f,'');};})(),rtrim:(function(){var f=/[ \t\n\r]+$/g;return function(g){return g.replace(f,'');};})(),indexOf:Array.prototype.indexOf?function(f,g){return f.indexOf(g);}:function(f,g){for(var h=0,i=f.length;h<i;h++)if(f[h]===g)return h;return-1;},bind:function(f,g){return function(){return f.apply(g,arguments);};},createClass:function(f){var g=f.$,h=f.base,i=f.privates||f._,j=f.proto,k=f.statics;if(i){var l=g;g=function(){var p=this;var m=p._||(p._={});for(var n in i){var o=i[n];m[n]=typeof o=='function'?a.tools.bind(o,p):o;}l.apply(p,arguments);};}if(h){g.prototype=this.prototypedCopy(h.prototype);g.prototype['constructor']=g;g.prototype.base=function(){this.base=h.prototype.base;h.apply(this,arguments);this.base=arguments.callee;};}if(j)this.extend(g.prototype,j,true);if(k)this.extend(g,k,true);return g;},addFunction:function(f,g){return e.push(function(){f.apply(g||this,arguments);})-1;},callFunction:function(f){var g=e[f];return g.apply(window,Array.prototype.slice.call(arguments,1));},cssLength:(function(){var f=/^\d+(?:\.\d+)?$/;return function(g){return g+(f.test(g)?'px':'');};})(),repeat:function(f,g){return new Array(g+1).join(f);}};})();var e=a.tools;a.dtd=(function(){var f=e.extend,g={isindex:1,fieldset:1},h={input:1,button:1,select:1,textarea:1,label:1},i=f({a:1},h),j=f({iframe:1},i),k={hr:1,ul:1,menu:1,div:1,blockquote:1,noscript:1,table:1,center:1,address:1,dir:1,pre:1,h5:1,dl:1,h4:1,noframes:1,h6:1,ol:1,h1:1,h3:1,h2:1},l={ins:1,del:1,script:1},m=f({b:1,acronym:1,bdo:1,'var':1,'#':1,abbr:1,code:1,br:1,i:1,cite:1,kbd:1,u:1,strike:1,s:1,tt:1,strong:1,q:1,samp:1,em:1,dfn:1,span:1},l),n=f({sub:1,img:1,object:1,sup:1,basefont:1,map:1,applet:1,font:1,big:1,small:1},m),o=f({p:1},n),p=f({iframe:1},n,h),q={img:1,noscript:1,br:1,kbd:1,center:1,button:1,basefont:1,h5:1,h4:1,samp:1,h6:1,ol:1,h1:1,h3:1,h2:1,form:1,font:1,'#':1,select:1,menu:1,ins:1,abbr:1,label:1,code:1,table:1,script:1,cite:1,input:1,iframe:1,strong:1,textarea:1,noframes:1,big:1,small:1,span:1,hr:1,sub:1,bdo:1,'var':1,div:1,object:1,sup:1,strike:1,dir:1,map:1,dl:1,applet:1,del:1,isindex:1,fieldset:1,ul:1,b:1,acronym:1,a:1,blockquote:1,i:1,u:1,s:1,tt:1,address:1,q:1,pre:1,p:1,em:1,dfn:1},r=f({a:1},p),s={tr:1},t={'#':1},u=f({param:1},q),v=f({form:1},g,j,k,o),w={li:1},x={address:1,blockquote:1,center:1,dir:1,div:1,dl:1,fieldset:1,form:1,h1:1,h2:1,h3:1,h4:1,h5:1,h6:1,hr:1,isindex:1,menu:1,noframes:1,ol:1,p:1,pre:1,table:1,ul:1};
return{$block:x,$body:f({script:1},x),$cdata:{script:1,style:1},$empty:{area:1,base:1,br:1,col:1,hr:1,img:1,input:1,link:1,meta:1,param:1},$listItem:{dd:1,dt:1,li:1},$list:{ul:1,ol:1,dl:1},$nonEditable:{applet:1,button:1,embed:1,iframe:1,map:1,object:1,option:1,script:1,textarea:1},$removeEmpty:{abbr:1,acronym:1,address:1,b:1,bdo:1,big:1,cite:1,code:1,del:1,dfn:1,em:1,font:1,i:1,ins:1,label:1,kbd:1,q:1,s:1,samp:1,small:1,span:1,strike:1,strong:1,sub:1,sup:1,tt:1,u:1,'var':1},$tabIndex:{a:1,area:1,button:1,input:1,object:1,select:1,textarea:1},$tableContent:{caption:1,col:1,colgroup:1,tbody:1,td:1,tfoot:1,th:1,thead:1,tr:1},col:{},tr:{td:1,th:1},img:{},colgroup:{col:1},noscript:v,td:v,br:{},th:v,center:v,kbd:r,button:f(o,k),basefont:{},h5:r,h4:r,samp:r,h6:r,ol:w,h1:r,h3:r,option:t,h2:r,form:f(g,j,k,o),select:{optgroup:1,option:1},font:r,ins:v,menu:w,abbr:r,label:r,table:{thead:1,col:1,tbody:1,tr:1,colgroup:1,caption:1,tfoot:1},code:r,script:t,tfoot:s,cite:r,li:v,input:{},iframe:v,strong:r,textarea:t,noframes:v,big:r,small:r,span:r,hr:{},dt:r,sub:r,optgroup:{option:1},param:{},bdo:r,'var':r,div:v,object:u,sup:r,dd:v,strike:r,area:{},dir:w,map:f({area:1,form:1,p:1},g,l,k),applet:u,dl:{dt:1,dd:1},del:v,isindex:{},fieldset:f({legend:1},q),thead:s,ul:w,acronym:r,b:r,a:p,blockquote:v,caption:r,i:r,u:r,tbody:s,s:r,address:f(j,o),tt:r,legend:r,q:r,pre:f(m,i),p:r,em:r,dfn:r};})();var f=a.dtd;d.event=function(g){this.$=g;};d.event.prototype={getKey:function(){return this.$.keyCode||this.$.which;},getKeystroke:function(){var h=this;var g=h.getKey();if(h.$.ctrlKey||h.$.metaKey)g+=1000;if(h.$.shiftKey)g+=2000;if(h.$.altKey)g+=4000;return g;},preventDefault:function(g){var h=this.$;if(h.preventDefault)h.preventDefault();else h.returnValue=false;if(g)this.stopPropagation();},stopPropagation:function(){var g=this.$;if(g.stopPropagation)g.stopPropagation();else g.cancelBubble=true;},getTarget:function(){var g=this.$.target||this.$.srcElement;return g?new d.node(g):null;}};a.CTRL=1000;a.SHIFT=2000;a.ALT=4000;d.domObject=function(g){if(g)this.$=g;};d.domObject.prototype=(function(){var g=function(h,i){return function(j){if(typeof a!='undefined')h.fire(i,new d.event(j));};};return{getPrivate:function(){var h;if(!(h=this.getCustomData('_')))this.setCustomData('_',h={});return h;},on:function(h){var k=this;var i=k.getCustomData('_cke_nativeListeners');if(!i){i={};k.setCustomData('_cke_nativeListeners',i);}if(!i[h]){var j=i[h]=g(k,h);if(k.$.addEventListener)k.$.addEventListener(h,j,!!a.event.useCapture);
else if(k.$.attachEvent)k.$.attachEvent('on'+h,j);}return a.event.prototype.on.apply(k,arguments);},removeListener:function(h){var k=this;a.event.prototype.removeListener.apply(k,arguments);if(!k.hasListeners(h)){var i=k.getCustomData('_cke_nativeListeners'),j=i&&i[h];if(j){if(k.$.removeEventListener)k.$.removeEventListener(h,j,false);else if(k.$.detachEvent)k.$.detachEvent('on'+h,j);delete i[h];}}}};})();(function(g){var h={};g.equals=function(i){return i&&i.$===this.$;};g.setCustomData=function(i,j){var k=this.getUniqueId(),l=h[k]||(h[k]={});l[i]=j;return this;};g.getCustomData=function(i){var j=this.$._cke_expando,k=j&&h[j];return k&&k[i];};g.removeCustomData=function(i){var j=this.$._cke_expando,k=j&&h[j],l=k&&k[i];if(typeof l!='undefined')delete k[i];return l||null;};g.getUniqueId=function(){return this.$._cke_expando||(this.$._cke_expando=e.getNextNumber());};a.event.implementOn(g);})(d.domObject.prototype);d.window=function(g){d.domObject.call(this,g);};d.window.prototype=new d.domObject();e.extend(d.window.prototype,{focus:function(){if(b.webkit&&this.$.parent)this.$.parent.focus();this.$.focus();},getViewPaneSize:function(){var g=this.$.document,h=g.compatMode=='CSS1Compat';return{width:(h?g.documentElement.clientWidth:g.body.clientWidth)||(0),height:(h?g.documentElement.clientHeight:g.body.clientHeight)||(0)};},getScrollPosition:function(){var g=this.$;if('pageXOffset' in g)return{x:g.pageXOffset||0,y:g.pageYOffset||0};else{var h=g.document;return{x:h.documentElement.scrollLeft||h.body.scrollLeft||0,y:h.documentElement.scrollTop||h.body.scrollTop||0};}}});d.document=function(g){d.domObject.call(this,g);};var g=d.document;g.prototype=new d.domObject();e.extend(g.prototype,{appendStyleSheet:function(h){if(this.$.createStyleSheet)this.$.createStyleSheet(h);else{var i=new d.element('link');i.setAttributes({rel:'stylesheet',type:'text/css',href:h});this.getHead().append(i);}},createElement:function(h,i){var j=new d.element(h,this);if(i){if(i.attributes)j.setAttributes(i.attributes);if(i.styles)j.setStyles(i.styles);}return j;},createText:function(h){return new d.text(h,this);},focus:function(){this.getWindow().focus();},getById:function(h){var i=this.$.getElementById(h);return i?new d.element(i):null;},getByAddress:function(h,i){var j=this.$.documentElement;for(var k=0;j&&k<h.length;k++){var l=h[k];if(!i){j=j.childNodes[l];continue;}var m=-1;for(var n=0;n<j.childNodes.length;n++){var o=j.childNodes[n];if(i===true&&o.nodeType==3&&o.previousSibling&&o.previousSibling.nodeType==3)continue;
m++;if(m==l){j=o;break;}}}return j?new d.node(j):null;},getElementsByTag:function(h,i){if(!c&&i)h=i+':'+h;return new d.nodeList(this.$.getElementsByTagName(h));},getHead:function(){var h=this.$.getElementsByTagName('head')[0];h=new d.element(h);return(this.getHead=function(){return h;})();},getBody:function(){var h=new d.element(this.$.body);return(this.getBody=function(){return h;})();},getDocumentElement:function(){var h=new d.element(this.$.documentElement);return(this.getDocumentElement=function(){return h;})();},getWindow:function(){var h=new d.window(this.$.parentWindow||this.$.defaultView);return(this.getWindow=function(){return h;})();}});d.node=function(h){if(h){switch(h.nodeType){case 1:return new d.element(h);case 3:return new d.text(h);}d.domObject.call(this,h);}return this;};d.node.prototype=new d.domObject();a.NODE_ELEMENT=1;a.NODE_TEXT=3;a.NODE_COMMENT=8;a.NODE_DOCUMENT_FRAGMENT=11;a.POSITION_IDENTICAL=0;a.POSITION_DISCONNECTED=1;a.POSITION_FOLLOWING=2;a.POSITION_PRECEDING=4;a.POSITION_IS_CONTAINED=8;a.POSITION_CONTAINS=16;e.extend(d.node.prototype,{appendTo:function(h,i){h.append(this,i);return h;},clone:function(h,i){var j=this.$.cloneNode(h);if(!i){var k=function(l){if(l.nodeType!=1)return;l.removeAttribute('id',false);l.removeAttribute('_cke_expando',false);var m=l.childNodes;for(var n=0;n<m.length;n++)k(m[n]);};k(j);}return new d.node(j);},hasPrevious:function(){return!!this.$.previousSibling;},hasNext:function(){return!!this.$.nextSibling;},insertAfter:function(h){h.$.parentNode.insertBefore(this.$,h.$.nextSibling);return h;},insertBefore:function(h){h.$.parentNode.insertBefore(this.$,h.$);return h;},insertBeforeMe:function(h){this.$.parentNode.insertBefore(h.$,this.$);return h;},getAddress:function(h){var i=[],j=this.getDocument().$.documentElement,k=this.$;while(k&&k!=j){var l=k.parentNode,m=-1;for(var n=0;n<l.childNodes.length;n++){var o=l.childNodes[n];if(h&&o.nodeType==3&&o.previousSibling&&o.previousSibling.nodeType==3)continue;m++;if(o==k)break;}i.unshift(m);k=k.parentNode;}return i;},getDocument:function(){var h=new g(this.$.ownerDocument||this.$.parentNode.ownerDocument);return(this.getDocument=function(){return h;})();},getIndex:function(){var h=this.$,i=h.parentNode&&h.parentNode.firstChild,j=-1;while(i){j++;if(i==h)return j;i=i.nextSibling;}return-1;},getNextSourceNode:function(h,i,j){if(j&&!j.call){var k=j;j=function(n){return!n.equals(k);};}var l=!h&&this.getFirst&&this.getFirst(),m;if(!l){if(this.type==1&&j&&j(this,true)===false)return null;
l=this.getNext();}while(!l&&(m=(m||this).getParent())){if(j&&j(m,true)===false)return null;l=m.getNext();}if(!l)return null;if(j&&j(l)===false)return null;if(i&&i!=l.type)return l.getNextSourceNode(false,i,j);return l;},getPreviousSourceNode:function(h,i,j){if(j&&!j.call){var k=j;j=function(n){return!n.equals(k);};}var l=!h&&this.getLast&&this.getLast(),m;if(!l){if(this.type==1&&j&&j(this,true)===false)return null;l=this.getPrevious();}while(!l&&(m=(m||this).getParent())){if(j&&j(m,true)===false)return null;l=m.getPrevious();}if(!l)return null;if(j&&j(l)===false)return null;if(i&&l.type!=i)return l.getPreviousSourceNode(false,i,j);return l;},getPrevious:function(h){var i=this.$,j;do{i=i.previousSibling;j=i&&new d.node(i);}while(j&&h&&!h(j))return j;},getNext:function(h){var i=this.$,j;do{i=i.nextSibling;j=i&&new d.node(i);}while(j&&h&&!h(j))return j;},getParent:function(){var h=this.$.parentNode;return h&&h.nodeType==1?new d.node(h):null;},getParents:function(h){var i=this,j=[];do j[h?'push':'unshift'](i);while(i=i.getParent())return j;},getCommonAncestor:function(h){var j=this;if(h.equals(j))return j;if(h.contains&&h.contains(j))return h;var i=j.contains?j:j.getParent();do if(i.contains(h))return i;while(i=i.getParent())return null;},getPosition:function(h){var i=this.$,j=h.$;if(i.compareDocumentPosition)return i.compareDocumentPosition(j);if(i==j)return 0;if(this.type==1&&h.type==1){if(i.contains){if(i.contains(j))return 16+4;if(j.contains(i))return 8+2;}if('sourceIndex' in i)return i.sourceIndex<0||j.sourceIndex<0?1:i.sourceIndex<j.sourceIndex?4:2;}var k=this.getAddress(),l=h.getAddress(),m=Math.min(k.length,l.length);for(var n=0;n<=m-1;n++)if(k[n]!=l[n]){if(n<m)return k[n]<l[n]?4:2;break;}return k.length<l.length?16+4:8+2;},getAscendant:function(h,i){var j=this.$;if(!i)j=j.parentNode;while(j){if(j.nodeName&&j.nodeName.toLowerCase()==h)return new d.node(j);j=j.parentNode;}return null;},hasAscendant:function(h,i){var j=this.$;if(!i)j=j.parentNode;while(j){if(j.nodeName&&j.nodeName.toLowerCase()==h)return true;j=j.parentNode;}return false;},move:function(h,i){h.append(this.remove(),i);},remove:function(h){var i=this.$,j=i.parentNode;if(j){if(h)for(var k;k=i.firstChild;)j.insertBefore(i.removeChild(k),i);j.removeChild(i);}return this;},replace:function(h){this.insertBefore(h);h.remove();},trim:function(){this.ltrim();this.rtrim();},ltrim:function(){var k=this;var h;while(k.getFirst&&(h=k.getFirst())){if(h.type==3){var i=e.ltrim(h.getText()),j=h.getLength();
if(!i){h.remove();continue;}else if(i.length<j){h.split(j-i.length);k.$.removeChild(k.$.firstChild);}}break;}},rtrim:function(){var k=this;var h;while(k.getLast&&(h=k.getLast())){if(h.type==3){var i=e.rtrim(h.getText()),j=h.getLength();if(!i){h.remove();continue;}else if(i.length<j){h.split(i.length);k.$.lastChild.parentNode.removeChild(k.$.lastChild);}}break;}if(!c&&!b.opera){h=k.$.lastChild;if(h&&h.type==1&&h.nodeName.toLowerCase()=='br')h.parentNode.removeChild(h);}}});d.nodeList=function(h){this.$=h;};d.nodeList.prototype={count:function(){return this.$.length;},getItem:function(h){var i=this.$[h];return i?new d.node(i):null;}};d.element=function(h,i){if(typeof h=='string')h=(i?i.$:document).createElement(h);d.domObject.call(this,h);};var h=d.element;h.get=function(i){return i&&(i.$?i:new h(i));};h.prototype=new d.node();h.createFromHtml=function(i,j){var k=new h('div',j);k.setHtml(i);return k.getFirst().remove();};h.setMarker=function(i,j,k,l){var m=j.getCustomData('list_marker_id')||j.setCustomData('list_marker_id',e.getNextNumber()).getCustomData('list_marker_id'),n=j.getCustomData('list_marker_names')||j.setCustomData('list_marker_names',{}).getCustomData('list_marker_names');i[m]=j;n[k]=1;return j.setCustomData(k,l);};h.clearAllMarkers=function(i){for(var j in i)h.clearMarkers(i,i[j],true);};h.clearMarkers=function(i,j,k){var l=j.getCustomData('list_marker_names'),m=j.getCustomData('list_marker_id');for(var n in l)j.removeCustomData(n);j.removeCustomData('list_marker_names');if(k){j.removeCustomData('list_marker_id');delete i[m];}};e.extend(h.prototype,{type:1,addClass:function(i){var j=this.$.className;if(j){var k=new RegExp('(?:^|\\s)'+i+'(?:\\s|$)','');if(!k.test(j))j+=' '+i;}this.$.className=j||i;},removeClass:function(i){var j=this.getAttribute('class');if(j){var k=new RegExp('(?:^|\\s+)'+i+'(?=\\s|$)','i');if(k.test(j)){j=j.replace(k,'').replace(/^\s+/,'');if(j)this.setAttribute('class',j);else this.removeAttribute('class');}}},hasClass:function(i){var j=new RegExp('(?:^|\\s+)'+i+'(?=\\s|$)','');return j.test(this.getAttribute('class'));},append:function(i,j){var k=this;if(typeof i=='string')i=k.getDocument().createElement(i);if(j)k.$.insertBefore(i.$,k.$.firstChild);else k.$.appendChild(i.$);return i;},appendHtml:function(i){var k=this;if(!k.$.childNodes.length)k.setHtml(i);else{var j=new h('div',k.getDocument());j.setHtml(i);j.moveChildren(k);}},appendText:function(i){if(this.$.text!=undefined)this.$.text+=i;else this.append(new d.text(i));
},appendBogus:function(){var j=this;var i=j.getLast();while(i&&i.type==3&&!e.rtrim(i.getText()))i=i.getPrevious();if(!i||!i.is||!i.is('br'))j.append(b.opera?j.getDocument().createText(''):j.getDocument().createElement('br'));},breakParent:function(i){var l=this;var j=new d.range(l.getDocument());j.setStartAfter(l);j.setEndAfter(i);var k=j.extractContents();j.insertNode(l.remove());k.insertAfterNode(l);},contains:c||b.webkit?function(i){var j=this.$;return i.type!=1?j.contains(i.getParent().$):j!=i.$&&j.contains(i.$);}:function(i){return!!(this.$.compareDocumentPosition(i.$)&16);},focus:function(){try{this.$.focus();}catch(i){}},getHtml:function(){return this.$.innerHTML;},getOuterHtml:function(){var j=this;if(j.$.outerHTML)return j.$.outerHTML.replace(/<\?[^>]*>/,'');var i=j.$.ownerDocument.createElement('div');i.appendChild(j.$.cloneNode(true));return i.innerHTML;},setHtml:function(i){return this.$.innerHTML=i;},setText:function(i){h.prototype.setText=this.$.innerText!=undefined?function(j){return this.$.innerText=j;}:function(j){return this.$.textContent=j;};return this.setText(i);},getAttribute:(function(){var i=function(j){return this.$.getAttribute(j,2);};if(c&&(b.ie7Compat||b.ie6Compat))return function(j){var l=this;switch(j){case 'class':j='className';break;case 'tabindex':var k=i.call(l,j);if(k!==0&&l.$.tabIndex===0)k=null;return k;break;case 'checked':return l.$.checked;break;case 'style':return l.$.style.cssText;}return i.call(l,j);};else return i;})(),getChildren:function(){return new d.nodeList(this.$.childNodes);},getComputedStyle:c?function(i){return this.$.currentStyle[e.cssStyleToDomStyle(i)];}:function(i){return this.getWindow().$.getComputedStyle(this.$,'').getPropertyValue(i);},getDtd:function(){var i=f[this.getName()];this.getDtd=function(){return i;};return i;},getElementsByTag:g.prototype.getElementsByTag,getTabIndex:c?function(){var i=this.$.tabIndex;if(i===0&&!f.$tabIndex[this.getName()]&&parseInt(this.getAttribute('tabindex'),10)!==0)i=-1;return i;}:b.webkit?function(){var i=this.$.tabIndex;if(i==undefined){i=parseInt(this.getAttribute('tabindex'),10);if(isNaN(i))i=-1;}return i;}:function(){return this.$.tabIndex;},getText:function(){return this.$.textContent||this.$.innerText||'';},getWindow:function(){return this.getDocument().getWindow();},getId:function(){return this.$.id||null;},getNameAtt:function(){return this.$.name||null;},getName:function(){var i=this.$.nodeName.toLowerCase();if(c){var j=this.$.scopeName;if(j!='HTML')i=j.toLowerCase()+':'+i;
}return(this.getName=function(){return i;})();},getValue:function(){return this.$.value;},getFirst:function(){var i=this.$.firstChild;return i?new d.node(i):null;},getLast:function(i){var j=this.$.lastChild,k=j&&new d.node(j);if(k&&i&&!i(k))k=k.getPrevious(i);return k;},getStyle:function(i){return this.$.style[e.cssStyleToDomStyle(i)];},is:function(){var i=this.getName();for(var j=0;j<arguments.length;j++)if(arguments[j]==i)return true;return false;},isEditable:function(){var i=this.getName(),j=!f.$nonEditable[i]&&(f[i]||f.span);return j&&j['#'];},isIdentical:function(i){if(this.getName()!=i.getName())return false;var j=this.$.attributes,k=i.$.attributes,l=j.length,m=k.length;if(!c&&l!=m)return false;for(var n=0;n<l;n++){var o=j[n];if((!c||o.specified&&o.nodeName!='_cke_expando')&&(o.nodeValue!=i.getAttribute(o.nodeName)))return false;}if(c)for(n=0;n<m;n++){o=k[n];if((!c||o.specified&&o.nodeName!='_cke_expando')&&(o.nodeValue!=j.getAttribute(o.nodeName)))return false;}return true;},isVisible:function(){return this.$.offsetWidth&&this.$.style.visibility!='hidden';},hasAttributes:c&&(b.ie7Compat||b.ie6Compat)?function(){var i=this.$.attributes;for(var j=0;j<i.length;j++){var k=i[j];switch(k.nodeName){case 'class':if(this.getAttribute('class'))return true;case '_cke_expando':continue;default:if(k.specified)return true;}}return false;}:function(){var i=this.$.attributes;return i.length>1||i.length==1&&i[0].nodeName!='_cke_expando';},hasAttribute:function(i){var j=this.$.attributes.getNamedItem(i);return!!(j&&j.specified);},hide:function(){this.setStyle('display','none');},moveChildren:function(i,j){var k=this.$;i=i.$;if(k==i)return;var l;if(j)while(l=k.lastChild)i.insertBefore(k.removeChild(l),i.firstChild);else while(l=k.firstChild)i.appendChild(k.removeChild(l));},show:function(){this.setStyles({display:'',visibility:''});},setAttribute:(function(){var i=function(j,k){this.$.setAttribute(j,k);return this;};if(c&&(b.ie7Compat||b.ie6Compat))return function(j,k){var l=this;if(j=='class')l.$.className=k;else if(j=='style')l.$.style.cssText=k;else if(j=='tabindex')l.$.tabIndex=k;else if(j=='checked')l.$.checked=k;else i.apply(l,arguments);return l;};else return i;})(),setAttributes:function(i){for(var j in i)this.setAttribute(j,i[j]);return this;},setValue:function(i){this.$.value=i;return this;},removeAttribute:(function(){var i=function(j){this.$.removeAttribute(j);};if(c&&(b.ie7Compat||b.ie6Compat))return function(j){if(j=='class')j='className';else if(j=='tabindex')j='tabIndex';
i.call(this,j);};else return i;})(),removeAttributes:function(i){for(var j=0;j<i.length;j++)this.removeAttribute(i[j]);},removeStyle:function(i){var j=this;if(j.$.style.removeAttribute)j.$.style.removeAttribute(e.cssStyleToDomStyle(i));else j.setStyle(i,'');if(!j.$.style.cssText)j.removeAttribute('style');},setStyle:function(i,j){this.$.style[e.cssStyleToDomStyle(i)]=j;return this;},setStyles:function(i){for(var j in i)this.setStyle(j,i[j]);return this;},setOpacity:function(i){if(c){i=Math.round(i*100);this.setStyle('filter',i>=100?'':'progid:DXImageTransform.Microsoft.Alpha(opacity='+i+')');}else this.setStyle('opacity',i);},unselectable:b.gecko?function(){this.$.style.MozUserSelect='none';}:b.webkit?function(){this.$.style.KhtmlUserSelect='none';}:function(){if(c||b.opera){var i=this.$,j,k=0;i.unselectable='on';while(j=i.all[k++])switch(j.tagName.toLowerCase()){case 'iframe':case 'textarea':case 'input':case 'select':break;default:j.unselectable='on';}}},getPositionedAncestor:function(){var i=this;while(i.getName()!='html'){if(i.getComputedStyle('position')!='static')return i;i=i.getParent();}return null;},getDocumentPosition:function(i){var D=this;var j=0,k=0,l=D.getDocument().getBody(),m=D.getDocument().$.compatMode=='BackCompat',n=D.getDocument();if(document.documentElement.getBoundingClientRect){var o=D.$.getBoundingClientRect(),p=n.$,q=p.documentElement,r=q.clientTop||l.$.clientTop||0,s=q.clientLeft||l.$.clientLeft||0,t=true;if(c){var u=n.getDocumentElement().contains(D),v=n.getBody().contains(D);t=m&&v||!m&&u;}if(t){j=o.left+(!m&&q.scrollLeft||l.$.scrollLeft);j-=s;k=o.top+(!m&&q.scrollTop||l.$.scrollTop);k-=r;}}else{var w=D,x=null,y;while(w&&!(w.getName()=='body'||w.getName()=='html')){j+=w.$.offsetLeft-w.$.scrollLeft;k+=w.$.offsetTop-w.$.scrollTop;if(!w.equals(D)){j+=w.$.clientLeft||0;k+=w.$.clientTop||0;}var z=x;while(z&&!z.equals(w)){j-=z.$.scrollLeft;k-=z.$.scrollTop;z=z.getParent();}x=w;w=(y=w.$.offsetParent)?new h(y):null;}}if(i){var A=D.getWindow(),B=i.getWindow();if(!A.equals(B)&&A.$.frameElement){var C=new h(A.$.frameElement).getDocumentPosition(i);j+=C.x;k+=C.y;}}if(!document.documentElement.getBoundingClientRect)if(b.gecko&&!m){j+=D.$.clientLeft?1:0;k+=D.$.clientTop?1:0;}return{x:j,y:k};},scrollIntoView:function(i){var o=this;var j=o.getWindow(),k=j.getViewPaneSize().height,l=k*-1;if(i)l+=k;else{l+=o.$.offsetHeight||0;l+=parseInt(o.getComputedStyle('marginBottom')||0,10)||0;}var m=o.getDocumentPosition();l+=m.y;l=l<0?0:l;var n=j.getScrollPosition().y;
if(l>n||l<n-k)j.$.scrollTo(0,l);},setState:function(i){var j=this;switch(i){case 1:j.addClass('cke_on');j.removeClass('cke_off');j.removeClass('cke_disabled');break;case 0:j.addClass('cke_disabled');j.removeClass('cke_off');j.removeClass('cke_on');break;default:j.addClass('cke_off');j.removeClass('cke_on');j.removeClass('cke_disabled');break;}},getFrameDocument:function(){var i=this.$;try{i.contentWindow.document;}catch(j){i.src=i.src;if(c&&b.version<7)window.showModalDialog('javascript:document.write("<script>window.setTimeout(function(){window.close();},50);</script>")');}return i&&new g(i.contentWindow.document);},copyAttributes:function(i,j){var p=this;var k=p.$.attributes;j=j||{};for(var l=0;l<k.length;l++){var m=k[l];if(m.specified||c&&m.nodeValue&&m.nodeName.toLowerCase()=='value'){var n=m.nodeName;if(n in j)continue;var o=p.getAttribute(n);if(o===null)o=m.nodeValue;i.setAttribute(n,o);}}if(p.$.style.cssText!=='')i.$.style.cssText=p.$.style.cssText;},renameNode:function(i){var l=this;if(l.getName()==i)return;var j=l.getDocument(),k=new h(i,j);l.copyAttributes(k);l.moveChildren(k);l.$.parentNode.replaceChild(k.$,l.$);k.$._cke_expando=l.$._cke_expando;l.$=k.$;},getChild:function(i){var j=this.$;if(!i.slice)j=j.childNodes[i];else while(i.length>0&&j)j=j.childNodes[i.shift()];return j?new d.node(j):null;},getChildCount:function(){return this.$.childNodes.length;},disableContextMenu:function(){this.on('contextmenu',function(i){if(!i.data.getTarget().hasClass('cke_enable_context_menu'))i.data.preventDefault();});}});a.command=function(i,j){this.uiItems=[];this.exec=function(k){if(this.state==0)return false;if(this.editorFocus)i.focus();return j.exec.call(this,i,k)!==false;};e.extend(this,j,{modes:{wysiwyg:1},editorFocus:true,state:2});a.event.call(this);};a.command.prototype={enable:function(){var i=this;if(i.state==0)i.setState(!i.preserveState||typeof i.previousState=='undefined'?2:i.previousState);},disable:function(){this.setState(0);},setState:function(i){var j=this;if(j.state==i)return false;j.previousState=j.state;j.state=i;j.fire('state');return true;},toggleState:function(){var i=this;if(i.state==2)i.setState(1);else if(i.state==1)i.setState(2);}};a.event.implementOn(a.command.prototype,true);a.ENTER_P=1;a.ENTER_BR=2;a.ENTER_DIV=3;a.config={customConfig:a.getUrl('config.js'),autoUpdateElement:true,baseHref:'',contentsCss:a.basePath+'contents.css',contentsLangDirection:'ltr',language:'',defaultLanguage:'en',enterMode:1,shiftEnterMode:2,corePlugins:'',docType:'<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">',fullPage:false,height:200,plugins:'about,basicstyles,blockquote,button,clipboard,colorbutton,colordialog,contextmenu,elementspath,enterkey,entities,filebrowser,find,flash,font,format,forms,horizontalrule,htmldataprocessor,image,indent,justify,keystrokes,link,list,maximize,newpage,pagebreak,pastefromword,pastetext,popup,preview,print,removeformat,resize,save,scayt,smiley,showblocks,sourcearea,stylescombo,table,tabletools,specialchar,tab,templates,toolbar,undo,wysiwygarea,wsc',extraPlugins:'',removePlugins:'',protectedSource:[],tabIndex:0,theme:'default',skin:'kama',width:'',baseFloatZIndex:10000};
var i=a.config;a.focusManager=function(j){if(j.focusManager)return j.focusManager;this.hasFocus=false;this._={editor:j};return this;};a.focusManager.prototype={focus:function(){var k=this;if(k._.timer)clearTimeout(k._.timer);if(!k.hasFocus){if(a.currentInstance)a.currentInstance.focusManager.forceBlur();var j=k._.editor;j.container.getFirst().addClass('cke_focus');k.hasFocus=true;j.fire('focus');}},blur:function(){var j=this;if(j._.timer)clearTimeout(j._.timer);j._.timer=setTimeout(function(){delete j._.timer;j.forceBlur();},100);},forceBlur:function(){if(this.hasFocus){var j=this._.editor;j.container.getFirst().removeClass('cke_focus');this.hasFocus=false;j.fire('blur');}}};(function(){var j={};a.lang={languages:{af:1,ar:1,bg:1,bn:1,bs:1,ca:1,cs:1,da:1,de:1,el:1,'en-au':1,'en-ca':1,'en-uk':1,en:1,eo:1,es:1,et:1,eu:1,fa:1,fi:1,fo:1,'fr-ca':1,fr:1,gl:1,gu:1,he:1,hi:1,hr:1,hu:1,is:1,it:1,ja:1,km:1,ko:1,lt:1,lv:1,mn:1,ms:1,nb:1,nl:1,no:1,pl:1,'pt-br':1,pt:1,ro:1,ru:1,sk:1,sl:1,'sr-latn':1,sr:1,sv:1,th:1,tr:1,uk:1,vi:1,'zh-cn':1,zh:1},load:function(k,l,m){if(!k||!a.lang.languages[k])k=this.detect(l,k);if(!this[k])a.scriptLoader.load(a.getUrl('lang/'+k+'.js'),function(){m(k,this[k]);},this);else m(k,this[k]);},detect:function(k,l){var m=this.languages;l=l||navigator.userLanguage||navigator.language;var n=l.toLowerCase().match(/([a-z]+)(?:-([a-z]+))?/),o=n[1],p=n[2];if(m[o+'-'+p])o=o+'-'+p;else if(!m[o])o=null;a.lang.detect=o?function(){return o;}:function(q){return q;};return o||k;}};})();a.scriptLoader=(function(){var j={},k={};return{load:function(l,m,n,o){var p=typeof l=='string';if(p)l=[l];if(!n)n=a;var q=l.length,r=[],s=[],t=function(y){if(m)if(p)m.call(n,y);else m.call(n,r,s);};if(q===0){t(true);return;}var u=function(y,z){(z?r:s).push(y);if(--q<=0)t(z);},v=function(y,z){j[y]=1;var A=k[y];delete k[y];for(var B=0;B<A.length;B++)A[B](y,z);},w=function(y){if(o!==true&&j[y]){u(y,true);return;}var z=k[y]||(k[y]=[]);z.push(u);if(z.length>1)return;var A=new h('script');A.setAttributes({type:'text/javascript',src:y});if(m)if(c)A.$.onreadystatechange=function(){if(A.$.readyState=='loaded'||A.$.readyState=='complete'){A.$.onreadystatechange=null;v(y,true);}};else{A.$.onload=function(){setTimeout(function(){v(y,true);},0);};A.$.onerror=function(){v(y,false);};}A.appendTo(a.document.getHead());};for(var x=0;x<q;x++)w(l[x]);},loadCode:function(l){var m=new h('script');m.setAttribute('type','text/javascript');m.appendText(l);m.appendTo(a.document.getHead());}};})();a.resourceManager=function(j,k){var l=this;
l.basePath=j;l.fileName=k;l.registered={};l.loaded={};l.externals={};l._={waitingList:{}};};a.resourceManager.prototype={add:function(j,k){if(this.registered[j])throw '[CKEDITOR.resourceManager.add] The resource name "'+j+'" is already registered.';this.registered[j]=k||{};},get:function(j){return this.registered[j]||null;},getPath:function(j){var k=this.externals[j];return a.getUrl(k&&k.dir||this.basePath+j+'/');},getFilePath:function(j){var k=this.externals[j];return a.getUrl(this.getPath(j)+(k&&k.file||this.fileName+'.js'));},addExternal:function(j,k,l){j=j.split(',');for(var m=0;m<j.length;m++){var n=j[m];this.externals[n]={dir:k,file:l};}},load:function(j,k,l){if(!e.isArray(j))j=j?[j]:[];var m=this.loaded,n=this.registered,o=[],p={},q={};for(var r=0;r<j.length;r++){var s=j[r];if(!s)continue;if(!m[s]&&!n[s]){var t=this.getFilePath(s);o.push(t);if(!(t in p))p[t]=[];p[t].push(s);}else q[s]=this.get(s);}a.scriptLoader.load(o,function(u,v){if(v.length)throw '[CKEDITOR.resourceManager.load] Resource name "'+p[v[0]].join(',')+'" was not found at "'+v[0]+'".';for(var w=0;w<u.length;w++){var x=p[u[w]];for(var y=0;y<x.length;y++){var z=x[y];q[z]=this.get(z);m[z]=1;}}k.call(l,q);},this);}};a.plugins=new a.resourceManager('plugins/','plugin');var j=a.plugins;j.load=e.override(j.load,function(k){return function(l,m,n){var o={},p=function(q){k.call(this,q,function(r){e.extend(o,r);var s=[];for(var t in r){var u=r[t],v=u&&u.requires;if(v)for(var w=0;w<v.length;w++)if(!o[v[w]])s.push(v[w]);}if(s.length)p.call(this,s);else{for(t in o){u=o[t];if(u.onLoad&&!u.onLoad._called){u.onLoad();u.onLoad._called=1;}}if(m)m.call(n||window,o);}},this);};p.call(this,l);};});j.setLang=function(k,l,m){var n=this.get(k);n.lang[l]=m;};(function(){var k={},l=function(m,n){var o=function(){k[m]=1;n();},p=new h('img');p.on('load',o);p.on('error',o);p.setAttribute('src',m);};a.imageCacher={load:function(m,n){var o=m.length,p=function(){if(--o===0)n();};for(var q=0;q<m.length;q++){var r=m[q];if(k[r])p();else l(r,p);}}};})();a.skins=(function(){var k={},l={},m={},n=function(o,p,q){var r=k[o],s=function(A){for(var B=0;B<A.length;B++)A[B]=a.getUrl(m[o]+A[B]);};if(!l[o]){var t=r.preload;if(t&&t.length>0){s(t);a.imageCacher.load(t,function(){l[o]=1;n(o,p,q);});return;}l[o]=1;}p=r[p];var u=!p||!!p._isLoaded;if(u)q&&q();else{var v=p._pending||(p._pending=[]);v.push(q);if(v.length>1)return;var w=!p.css||!p.css.length,x=!p.js||!p.js.length,y=function(){if(w&&x){p._isLoaded=1;for(var A=0;A<v.length;A++)if(v[A])v[A]();
}};if(!w){s(p.css);for(var z=0;z<p.css.length;z++)a.document.appendStyleSheet(p.css[z]);w=1;}if(!x){s(p.js);a.scriptLoader.load(p.js,function(){x=1;y();});}y();}};return{add:function(o,p){k[o]=p;p.skinPath=m[o]||(m[o]=a.getUrl('skins/'+o+'/'));},load:function(o,p,q){var r=o.skinName,s=o.skinPath;if(k[r]){n(r,p,q);var t=k[r];if(t.init)t.init(o);}else{m[r]=s;a.scriptLoader.load(s+'skin.js',function(){n(r,p,q);var u=k[r];if(u.init)u.init(o);});}}};})();a.themes=new a.resourceManager('themes/','theme');a.ui=function(k){if(k.ui)return k.ui;this._={handlers:{},items:{},editor:k};return this;};var k=a.ui;k.prototype={add:function(l,m,n){this._.items[l]={type:m,command:n.command||null,args:Array.prototype.slice.call(arguments,2)};},create:function(l){var q=this;var m=q._.items[l],n=m&&q._.handlers[m.type],o=m&&m.command&&q._.editor.getCommand(m.command),p=n&&n.create.apply(q,m.args);if(o)o.uiItems.push(p);return p;},addHandler:function(l,m){this._.handlers[l]=m;}};(function(){var l=0,m=function(){var x='editor'+ ++l;return a.instances&&a.instances[x]?m():x;},n={},o=function(x){var y=x.config.customConfig;if(!y)return false;var z=n[y]||(n[y]={});if(z.fn){z.fn.call(x,x.config);if(x.config.customConfig==y||!o(x))x.fireOnce('customConfigLoaded');}else a.scriptLoader.load(y,function(){if(a.editorConfig)z.fn=a.editorConfig;else z.fn=function(){};o(x);});return true;},p=function(x,y){x.on('customConfigLoaded',function(){if(y){if(y.on)for(var z in y.on)x.on(z,y.on[z]);e.extend(x.config,y,true);delete x.config.on;}q(x);});if(y&&y.customConfig!=undefined)x.config.customConfig=y.customConfig;if(!o(x))x.fireOnce('customConfigLoaded');},q=function(x){var y=x.config.skin.split(','),z=y[0],A=a.getUrl(y[1]||'skins/'+z+'/');x.skinName=z;x.skinPath=A;x.skinClass='cke_skin_'+z;x.fireOnce('configLoaded');r(x);},r=function(x){a.lang.load(x.config.language,x.config.defaultLanguage,function(y,z){x.langCode=y;x.lang=e.prototypedCopy(z);if(b.gecko&&b.version<10900&&x.lang.dir=='rtl')x.lang.dir='ltr';s(x);});},s=function(x){var y=x.config,z=y.plugins,A=y.extraPlugins,B=y.removePlugins;if(A){var C=new RegExp('(?:^|,)(?:'+A.replace(/\s*,\s*/g,'|')+')(?=,|$)','g');z=z.replace(C,'');z+=','+A;}if(B){C=new RegExp('(?:^|,)(?:'+B.replace(/\s*,\s*/g,'|')+')(?=,|$)','g');z=z.replace(C,'');}j.load(z.split(','),function(D){var E=[],F=[],G=[];x.plugins=D;for(var H in D){var I=D[H],J=I.lang,K=j.getPath(H),L=null;I.path=K;if(J){L=e.indexOf(J,x.langCode)>=0?x.langCode:J[0];if(!I.lang[L])G.push(a.getUrl(K+'lang/'+L+'.js'));
else{e.extend(x.lang,I.lang[L]);L=null;}}F.push(L);E.push(I);}a.scriptLoader.load(G,function(){var M=['beforeInit','init','afterInit'];for(var N=0;N<M.length;N++)for(var O=0;O<E.length;O++){var P=E[O];if(N===0&&F[O]&&P.lang)e.extend(x.lang,P.lang[F[O]]);if(P[M[N]])P[M[N]](x);}x.fire('pluginsLoaded');t(x);});});},t=function(x){a.skins.load(x,'editor',function(){u(x);});},u=function(x){var y=x.config.theme;a.themes.load(y,function(){var z=x.theme=a.themes.get(y);z.path=a.themes.getPath(y);z.build(x);if(x.config.autoUpdateElement)v(x);});},v=function(x){var y=x.element;if(x.elementMode==1&&y.is('textarea')){var z=y.$.form&&new h(y.$.form);if(z){function A(){x.updateElement();};z.on('submit',A);if(!z.$.submit.nodeName)z.$.submit=e.override(z.$.submit,function(B){return function(){x.updateElement();if(B.apply)B.apply(this,arguments);else B();};});x.on('destroy',function(){z.removeListener('submit',A);});}}};function w(){var x,y=this._.commands,z=this.mode;for(var A in y){x=y[A];x[x.modes[z]?'enable':'disable']();}};a.editor.prototype._init=function(){var z=this;var x=h.get(z._.element),y=z._.instanceConfig;delete z._.element;delete z._.instanceConfig;z._.commands={};z._.styles=[];z.element=x;z.name=x&&z.elementMode==1&&(x.getId()||x.getNameAtt())||m();if(z.name in a.instances)throw '[CKEDITOR.editor] The instance "'+z.name+'" already exists.';z.config=e.prototypedCopy(i);z.ui=new k(z);z.focusManager=new a.focusManager(z);a.fire('instanceCreated',null,z);z.on('mode',w,null,null,1);p(z,y);};})();e.extend(a.editor.prototype,{addCommand:function(l,m){return this._.commands[l]=new a.command(this,m);},addCss:function(l){this._.styles.push(l);},destroy:function(l){var m=this;if(!l)m.updateElement();m.theme.destroy(m);m.fire('destroy');a.remove(m);},execCommand:function(l,m){var n=this.getCommand(l),o={name:l,commandData:m,command:n};if(n&&n.state!=0)if(this.fire('beforeCommandExec',o)!==true){o.returnValue=n.exec(o.commandData);if(!n.async&&this.fire('afterCommandExec',o)!==true)return o.returnValue;}return false;},getCommand:function(l){return this._.commands[l];},getData:function(){var n=this;n.fire('beforeGetData');var l=n._.data;if(typeof l!='string'){var m=n.element;if(m&&n.elementMode==1)l=m.is('textarea')?m.getValue():m.getHtml();else l='';}l={dataValue:l};n.fire('getData',l);return l.dataValue;},getSnapshot:function(){var l=this.fire('getSnapshot');if(typeof l!='string'){var m=this.element;if(m&&this.elementMode==1)l=m.is('textarea')?m.getValue():m.getHtml();}return l;
},loadSnapshot:function(l){this.fire('loadSnapshot',l);},setData:function(l,m){if(m)this.on('dataReady',function(o){o.removeListener();m.call(o.editor);});var n={dataValue:l};this.fire('setData',n);this._.data=n.dataValue;this.fire('afterSetData',n);},insertHtml:function(l){this.fire('insertHtml',l);},insertElement:function(l){this.fire('insertElement',l);},checkDirty:function(){return this.mayBeDirty&&this._.previousValue!==this.getSnapshot();},resetDirty:function(){if(this.mayBeDirty)this._.previousValue=this.getSnapshot();},updateElement:function(){var m=this;var l=m.element;if(l&&m.elementMode==1)if(l.is('textarea'))l.setValue(m.getData());else l.setHtml(m.getData());}});a.on('loaded',function(){var l=a.editor._pending;if(l){delete a.editor._pending;for(var m=0;m<l.length;m++)l[m]._init();}});a.htmlParser=function(){this._={htmlPartsRegex:new RegExp("<(?:(?:\\/([^>]+)>)|(?:!--([\\S|\\s]*?)-->)|(?:([^\\s>]+)\\s*((?:(?:[^\"'>]+)|(?:\"[^\"]*\")|(?:'[^']*'))*)\\/?>))",'g')};};(function(){var l=/([\w\-:.]+)(?:(?:\s*=\s*(?:(?:"([^"]*)")|(?:'([^']*)')|([^\s>]+)))|(?=\s|$))/g,m={checked:1,compact:1,declare:1,defer:1,disabled:1,ismap:1,multiple:1,nohref:1,noresize:1,noshade:1,nowrap:1,readonly:1,selected:1};a.htmlParser.prototype={onTagOpen:function(){},onTagClose:function(){},onText:function(){},onCDATA:function(){},onComment:function(){},parse:function(n){var A=this;var o,p,q=0,r;while(o=A._.htmlPartsRegex.exec(n)){var s=o.index;if(s>q){var t=n.substring(q,s);if(r)r.push(t);else A.onText(t);}q=A._.htmlPartsRegex.lastIndex;if(p=o[1]){p=p.toLowerCase();if(r&&f.$cdata[p]){A.onCDATA(r.join(''));r=null;}if(!r){A.onTagClose(p);continue;}}if(r){r.push(o[0]);continue;}if(p=o[3]){p=p.toLowerCase();var u={},v,w=o[4],x=!!(w&&w.charAt(w.length-1)=='/');if(w)while(v=l.exec(w)){var y=v[1].toLowerCase(),z=v[2]||v[3]||v[4]||'';if(!z&&m[y])u[y]=y;else u[y]=z;}A.onTagOpen(p,u,x);if(!r&&f.$cdata[p])r=[];continue;}if(p=o[2])A.onComment(p);}if(n.length>q)A.onText(n.substring(q,n.length));}};})();a.htmlParser.comment=function(l){this.value=l;this._={isBlockLike:false};};a.htmlParser.comment.prototype={type:8,writeHtml:function(l,m){var n=this.value;if(m){if(!(n=m.onComment(n)))return;if(typeof n!='string'){n.writeHtml(l,m);return;}}l.comment(n);}};(function(){var l=/[\t\r\n ]{2,}|[\t\r\n]/g;a.htmlParser.text=function(m){this.value=m;this._={isBlockLike:false};};a.htmlParser.text.prototype={type:3,writeHtml:function(m,n){var o=this.value;if(n&&!(o=n.onText(o,this)))return;m.text(o);
}};})();(function(){a.htmlParser.cdata=function(l){this.value=l;};a.htmlParser.cdata.prototype={type:3,writeHtml:function(l){l.write(this.value);}};})();a.htmlParser.fragment=function(){this.children=[];this.parent=null;this._={isBlockLike:true,hasInlineStarted:false};};(function(){var l={colgroup:1,dd:1,dt:1,li:1,option:1,p:1,td:1,tfoot:1,th:1,thead:1,tr:1},m=e.extend({table:1,ul:1,ol:1,dl:1},f.table,f.ul,f.ol,f.dl),n=f.$list,o=f.$listItem;a.htmlParser.fragment.fromHtml=function(p,q){var r=new a.htmlParser(),s=[],t=new a.htmlParser.fragment(),u=[],v=t,w=false,x;function y(C){if(u.length>0)for(var D=0;D<u.length;D++){var E=u[D],F=E.name,G=f[F],H=v.name&&f[v.name];if((!H||H[F])&&(!C||!G||G[C]||!f[C])){E=E.clone();E.parent=v;v=E;u.splice(D,1);D--;}}};function z(C,D,E){D=D||v||t;if(q&&!D.type){var F,G;if(C.attributes&&(G=C.attributes._cke_real_element_type))F=G;else F=C.name;if(!(F in f.$body)){var H=v;v=D;r.onTagOpen(q,{});D=v;if(E)v=H;}}if(C._.isBlockLike&&C.name!='pre'){var I=C.children.length,J=C.children[I-1],K;if(J&&J.type==3)if(!(K=e.rtrim(J.value)))C.children.length=I-1;else J.value=K;}D.add(C);if(C.returnPoint){v=C.returnPoint;delete C.returnPoint;}};r.onTagOpen=function(C,D,E){var F=new a.htmlParser.element(C,D);if(F.isUnknown&&E)F.isEmpty=true;if(f.$removeEmpty[C]){u.push(F);return;}else if(C=='pre')w=true;else if(C=='br'&&w){v.add(new a.htmlParser.text('\n'));return;}var G=v.name,H=G&&f[G]||(v._.isBlockLike?f.div:f.span);if(!F.isUnknown&&!v.isUnknown&&!H[C]){if(!G)return;var I=false,J;if(C in n&&G in n){var K=v.children,L=K[K.length-1];if(L&&L.name in o)x=v,J=L;else z(v,v.parent);}else if(C==G)z(v,v.parent);else{if(m[G]){if(!x)x=v;}else{z(v,v.parent,true);if(!l[G])u.unshift(v);}I=true;}if(J)v=J;else v=v.returnPoint||v.parent;if(I){r.onTagOpen.apply(this,arguments);return;}}y(C);F.parent=v;F.returnPoint=x;x=0;if(F.isEmpty)z(F);else v=F;};r.onTagClose=function(C){var D=0,E=[],F=v;while(F.type&&F.name!=C){if(!F._.isBlockLike){u.unshift(F);D++;}E.push(F);F=F.parent;}if(F.type){for(var G=0;G<E.length;G++){var H=E[G];z(H,H.parent);}v=F;if(v.name=='pre')w=false;z(F,F.parent);if(F==v)v=v.parent;}else{u.splice(0,D);D=0;}for(;D<u.length;D++)if(C==u[D].name){u.splice(D,1);D--;}};r.onText=function(C){if(!v._.hasInlineStarted&&!w){C=e.ltrim(C);if(C.length===0)return;}y();if(q&&!v.type)this.onTagOpen(q,{});if(!w)C=C.replace(/[\t\r\n ]{2,}|[\t\r\n]/g,' ');v.add(new a.htmlParser.text(C));};r.onCDATA=function(C){v.add(new a.htmlParser.cdata(C));};r.onComment=function(C){v.add(new a.htmlParser.comment(C));
};r.parse(p);while(v.type){var A=v.parent,B=v;if(q&&!A.type&&!f.$body[B.name]){v=A;r.onTagOpen(q,{});A=v;}A.add(B);v=A;}return t;};a.htmlParser.fragment.prototype={add:function(p){var s=this;var q=s.children.length,r=q>0&&s.children[q-1]||null;if(r){if(p._.isBlockLike&&r.type==3){r.value=e.rtrim(r.value);if(r.value.length===0){s.children.pop();s.add(p);return;}}r.next=p;}p.previous=r;p.parent=s;s.children.push(p);s._.hasInlineStarted=p.type==3||p.type==1&&!p._.isBlockLike;},writeHtml:function(p,q){for(var r=0,s=this.children.length;r<s;r++)this.children[r].writeHtml(p,q);}};})();a.htmlParser.element=function(l,m){var q=this;q.name=l;q.attributes=m;q.children=[];var n=f,o=!!(n.$block[l]||n.$listItem[l]||n.$tableContent[l]),p=!!n.$empty[l];q.isEmpty=p;q.isUnknown=!n[l];q._={isBlockLike:o,hasInlineStarted:p||!o};};(function(){var l=function(m,n){m=m[0];n=n[0];return m<n?-1:m>n?1:0;};a.htmlParser.element.prototype={type:1,add:a.htmlParser.fragment.prototype.add,clone:function(){return new a.htmlParser.element(this.name,this.attributes);},writeHtml:function(m,n){var o=this.attributes;if(o._cke_replacedata){m.write(o._cke_replacedata);return;}var p=this,q=p.name,r,s;if(n){for(;;){if(!(q=n.onElementName(q)))return;p.name=q;if(!(p=n.onElement(p)))return;if(p.name==q)break;q=p.name;if(!q){a.htmlParser.fragment.prototype.writeHtml.apply(p,arguments);return;}}o=p.attributes;}m.openTag(q,o);if(m.sortAttributes){var t=[];for(r in o){s=o[r];if(n&&(!(r=n.onAttributeName(r))||(s=n.onAttribute(p,r,s))===(false)))continue;t.push([r,s]);}t.sort(l);for(var u=0,v=t.length;u<v;u++){var w=t[u];m.attribute(w[0],w[1]);}}else for(r in o){s=o[r];if(n&&(!(r=n.onAttributeName(r))||(s=n.onAttribute(p,r,s))===(false)))continue;m.attribute(r,s);}m.openTagClose(q,p.isEmpty);if(!p.isEmpty){a.htmlParser.fragment.prototype.writeHtml.apply(p,arguments);m.closeTag(q);}}};})();(function(){a.htmlParser.filter=e.createClass({$:function(q){this._={elementNames:[],attributeNames:[],elements:{$length:0},attributes:{$length:0}};if(q)this.addRules(q,10);},proto:{addRules:function(q,r){var s=this;if(typeof r!='number')r=10;m(s._.elementNames,q.elementNames,r);m(s._.attributeNames,q.attributeNames,r);n(s._.elements,q.elements,r);n(s._.attributes,q.attributes,r);s._.text=o(s._.text,q.text,r)||s._.text;s._.comment=o(s._.comment,q.comment,r)||s._.comment;},onElementName:function(q){return l(q,this._.elementNames);},onAttributeName:function(q){return l(q,this._.attributeNames);},onText:function(q){var r=this._.text;
return r?r.filter(q):q;},onComment:function(q){var r=this._.comment;return r?r.filter(q):q;},onElement:function(q){var v=this;var r=[v._.elements[q.name],v._.elements.$],s,t;for(var u=0;u<2;u++){s=r[u];if(s){t=s.filter(q,v);if(t===false)return null;if(t&&t!=q)return v.onElement(t);}}return q;},onAttribute:function(q,r,s){var t=this._.attributes[r];if(t){var u=t.filter(s,q,this);if(u===false)return false;if(typeof u!='undefined')return u;}return s;}}});function l(q,r){for(var s=0;q&&s<r.length;s++){var t=r[s];q=q.replace(t[0],t[1]);}return q;};function m(q,r,s){var t,u,v=q.length,w=r&&r.length;if(w){for(t=0;t<v&&q[t].pri<s;t++){}for(u=w-1;u>=0;u--){var x=r[u];x.pri=s;q.splice(t,0,x);}}};function n(q,r,s){if(r)for(var t in r){var u=q[t];q[t]=o(u,r[t],s);if(!u)q.$length++;}};function o(q,r,s){if(r){r.pri=s;if(q){if(!q.splice){if(q.pri>s)q=[r,q];else q=[q,r];q.filter=p;}else m(q,r,s);return q;}else{r.filter=r;return r;}}};function p(q){var r=typeof q=='object';for(var s=0;s<this.length;s++){var t=this[s],u=t.apply(window,arguments);if(typeof u!='undefined'){if(u===false)return false;if(r&&u!=q)return u;}}return null;};})();a.htmlParser.basicWriter=e.createClass({$:function(){this._={output:[]};},proto:{openTag:function(l,m){this._.output.push('<',l);},openTagClose:function(l,m){if(m)this._.output.push(' />');else this._.output.push('>');},attribute:function(l,m){this._.output.push(' ',l,'="',m,'"');},closeTag:function(l){this._.output.push('</',l,'>');},text:function(l){this._.output.push(l);},comment:function(l){this._.output.push('<!--',l,'-->');},write:function(l){this._.output.push(l);},reset:function(){this._.output=[];},getHtml:function(l){var m=this._.output.join('');if(l)this.reset();return m;}}});delete a.loadFullCore;a.instances={};a.document=new g(document);a.add=function(l){a.instances[l.name]=l;l.on('focus',function(){if(a.currentInstance!=l){a.currentInstance=l;a.fire('currentInstance');}});l.on('blur',function(){if(a.currentInstance==l){a.currentInstance=null;a.fire('currentInstance');}});};a.remove=function(l){delete a.instances[l.name];};a.TRISTATE_ON=1;a.TRISTATE_OFF=2;a.TRISTATE_DISABLED=0;(function(){var l={address:1,blockquote:1,dl:1,h1:1,h2:1,h3:1,h4:1,h5:1,h6:1,p:1,pre:1,li:1,dt:1,de:1},m={body:1,div:1,table:1,tbody:1,tr:1,td:1,th:1,caption:1,form:1},n=function(o){var p=o.getChildren();for(var q=0,r=p.count();q<r;q++){var s=p.getItem(q);if(s.type==1&&f.$block[s.getName()])return true;}return false;};d.elementPath=function(o){var u=this;var p=null,q=null,r=[],s=o;
while(s){if(s.type==1){if(!u.lastElement)u.lastElement=s;var t=s.getName();if(c&&s.$.scopeName!='HTML')t=s.$.scopeName.toLowerCase()+':'+t;if(!q){if(!p&&l[t])p=s;if(m[t])if(!p&&t=='div'&&!n(s))p=s;else q=s;}r.push(s);if(t=='body')break;}s=s.getParent();}u.block=p;u.blockLimit=q;u.elements=r;};})();d.elementPath.prototype={compare:function(l){var m=this.elements,n=l&&l.elements;if(!n||m.length!=n.length)return false;for(var o=0;o<m.length;o++)if(!m[o].equals(n[o]))return false;return true;}};d.text=function(l,m){if(typeof l=='string')l=(m?m.$:document).createTextNode(l);this.$=l;};d.text.prototype=new d.node();e.extend(d.text.prototype,{type:3,getLength:function(){return this.$.nodeValue.length;},getText:function(){return this.$.nodeValue;},split:function(l){var q=this;if(c&&l==q.getLength()){var m=q.getDocument().createText('');m.insertAfter(q);return m;}var n=q.getDocument(),o=new d.text(q.$.splitText(l),n);if(b.ie8){var p=new d.text('',n);p.insertAfter(o);p.remove();}return o;},substring:function(l,m){if(typeof m!='number')return this.$.nodeValue.substr(l);else return this.$.nodeValue.substring(l,m);}});d.documentFragment=function(l){l=l||a.document;this.$=l.$.createDocumentFragment();};e.extend(d.documentFragment.prototype,h.prototype,{type:11,insertAfterNode:function(l){l=l.$;l.parentNode.insertBefore(this.$,l.nextSibling);}},true,{append:1,appendBogus:1,getFirst:1,getLast:1,appendTo:1,moveChildren:1,insertBefore:1,insertAfterNode:1,replace:1,trim:1,type:1,ltrim:1,rtrim:1,getDocument:1,getChildCount:1,getChild:1,getChildren:1});(function(){function l(p,q){if(this._.end)return null;var r,s=this.range,t,u=this.guard,v=this.type,w=p?'getPreviousSourceNode':'getNextSourceNode';if(!this._.start){this._.start=1;s.trim();if(s.collapsed){this.end();return null;}}if(!p&&!this._.guardLTR){var x=s.endContainer,y=x.getChild(s.endOffset);this._.guardLTR=function(C,D){return(!D||!x.equals(C))&&((!y||!C.equals(y))&&(C.type!=1||C.getName()!='body'));};}if(p&&!this._.guardRTL){var z=s.startContainer,A=s.startOffset>0&&z.getChild(s.startOffset-1);this._.guardRTL=function(C,D){return(!D||!z.equals(C))&&((!A||!C.equals(A))&&(C.type!=1||C.getName()!='body'));};}var B=p?this._.guardRTL:this._.guardLTR;if(u)t=function(C,D){if(B(C,D)===false)return false;return u(C);};else t=B;if(this.current)r=this.current[w](false,v,t);else if(p){r=s.endContainer;if(s.endOffset>0){r=r.getChild(s.endOffset-1);if(t(r)===false)r=null;}else r=t(r)===false?null:r.getPreviousSourceNode(true,v,t);}else{r=s.startContainer;
r=r.getChild(s.startOffset);if(r){if(t(r)===false)r=null;}else r=t(s.startContainer)===false?null:s.startContainer.getNextSourceNode(true,v,t);}while(r&&!this._.end){this.current=r;if(!this.evaluator||this.evaluator(r)!==false){if(!q)return r;}else if(q&&this.evaluator)return false;r=r[w](false,v,t);}this.end();return this.current=null;};function m(p){var q,r=null;while(q=l.call(this,p))r=q;return r;};d.walker=e.createClass({$:function(p){this.range=p;this._={};},proto:{end:function(){this._.end=1;},next:function(){return l.call(this);},previous:function(){return l.call(this,true);},checkForward:function(){return l.call(this,false,true)!==false;},checkBackward:function(){return l.call(this,true,true)!==false;},lastForward:function(){return m.call(this);},lastBackward:function(){return m.call(this,true);},reset:function(){delete this.current;this._={};}}});var n={block:1,'list-item':1,table:1,'table-row-group':1,'table-header-group':1,'table-footer-group':1,'table-row':1,'table-column-group':1,'table-column':1,'table-cell':1,'table-caption':1},o={hr:1};h.prototype.isBlockBoundary=function(p){var q=e.extend({},o,p||{});return n[this.getComputedStyle('display')]||q[this.getName()];};d.walker.blockBoundary=function(p){return function(q,r){return!(q.type==1&&q.isBlockBoundary(p));};};d.walker.listItemBoundary=function(){return this.blockBoundary({br:1});};d.walker.bookmarkContents=function(p){},d.walker.bookmark=function(p,q){function r(s){return s&&s.getName&&s.getName()=='span'&&s.hasAttribute('_fck_bookmark');};return function(s){var t,u;t=s&&!s.getName&&(u=s.getParent())&&(r(u));t=p?t:t||r(s);return q^t;};};d.walker.whitespaces=function(p){return function(q){var r=q&&q.type==3&&!e.trim(q.getText());return p^r;};};})();d.range=function(l){var m=this;m.startContainer=null;m.startOffset=null;m.endContainer=null;m.endOffset=null;m.collapsed=true;m.document=l;};(function(){var l=function(q){q.collapsed=q.startContainer&&q.endContainer&&q.startContainer.equals(q.endContainer)&&q.startOffset==q.endOffset;},m=function(q,r,s){q.optimizeBookmark();var t=q.startContainer,u=q.endContainer,v=q.startOffset,w=q.endOffset,x,y;if(u.type==3)u=u.split(w);else if(u.getChildCount()>0)if(w>=u.getChildCount()){u=u.append(q.document.createText(''));y=true;}else u=u.getChild(w);if(t.type==3){t.split(v);if(t.equals(u))u=t.getNext();}else if(!v){t=t.getFirst().insertBeforeMe(q.document.createText(''));x=true;}else if(v>=t.getChildCount()){t=t.append(q.document.createText(''));x=true;}else t=t.getChild(v).getPrevious();
var z=t.getParents(),A=u.getParents(),B,C,D;for(B=0;B<z.length;B++){C=z[B];D=A[B];if(!C.equals(D))break;}var E=s,F,G,H,I;for(var J=B;J<z.length;J++){F=z[J];if(E&&!F.equals(t))G=E.append(F.clone());H=F.getNext();while(H){if(H.equals(A[J])||H.equals(u))break;I=H.getNext();if(r==2)E.append(H.clone(true));else{H.remove();if(r==1)E.append(H);}H=I;}if(E)E=G;}E=s;for(var K=B;K<A.length;K++){F=A[K];if(r>0&&!F.equals(u))G=E.append(F.clone());if(!z[K]||F.$.parentNode!=z[K].$.parentNode){H=F.getPrevious();while(H){if(H.equals(z[K])||H.equals(t))break;I=H.getPrevious();if(r==2)E.$.insertBefore(H.$.cloneNode(true),E.$.firstChild);else{H.remove();if(r==1)E.$.insertBefore(H.$,E.$.firstChild);}H=I;}}if(E)E=G;}if(r==2){var L=q.startContainer;if(L.type==3){L.$.data+=L.$.nextSibling.data;L.$.parentNode.removeChild(L.$.nextSibling);}var M=q.endContainer;if(M.type==3&&M.$.nextSibling){M.$.data+=M.$.nextSibling.data;M.$.parentNode.removeChild(M.$.nextSibling);}}else{if(C&&D&&(t.$.parentNode!=C.$.parentNode||u.$.parentNode!=D.$.parentNode)){var N=D.getIndex();if(x&&D.$.parentNode==t.$.parentNode)N--;q.setStart(D.getParent(),N);}q.collapse(true);}if(x)t.remove();if(y&&u.$.parentNode)u.remove();},n={abbr:1,acronym:1,b:1,bdo:1,big:1,cite:1,code:1,del:1,dfn:1,em:1,font:1,i:1,ins:1,label:1,kbd:1,q:1,samp:1,small:1,span:1,strike:1,strong:1,sub:1,sup:1,tt:1,u:1,'var':1};function o(q){var r=false,s=d.walker.bookmark(true);return function(t){if(s(t))return true;if(t.type==3){if(e.trim(t.getText()).length)return false;}else if(!n[t.getName()])if(!q&&!c&&t.getName()=='br'&&!r)r=true;else return false;return true;};};function p(q){return q.type!=3&&q.getName() in f.$removeEmpty||!e.trim(q.getText())||q.getParent().hasAttribute('_fck_bookmark');};d.range.prototype={clone:function(){var r=this;var q=new d.range(r.document);q.startContainer=r.startContainer;q.startOffset=r.startOffset;q.endContainer=r.endContainer;q.endOffset=r.endOffset;q.collapsed=r.collapsed;return q;},collapse:function(q){var r=this;if(q){r.endContainer=r.startContainer;r.endOffset=r.startOffset;}else{r.startContainer=r.endContainer;r.startOffset=r.endOffset;}r.collapsed=true;},cloneContents:function(){var q=new d.documentFragment(this.document);if(!this.collapsed)m(this,2,q);return q;},deleteContents:function(){if(this.collapsed)return;m(this,0);},extractContents:function(){var q=new d.documentFragment(this.document);if(!this.collapsed)m(this,1,q);return q;},createBookmark:function(q){var v=this;var r,s,t,u;r=v.document.createElement('span');
r.setAttribute('_fck_bookmark',1);r.setStyle('display','none');r.setHtml('&nbsp;');if(q){t='cke_bm_'+e.getNextNumber();r.setAttribute('id',t+'S');}if(!v.collapsed){s=r.clone();s.setHtml('&nbsp;');if(q)s.setAttribute('id',t+'E');u=v.clone();u.collapse();u.insertNode(s);}u=v.clone();u.collapse(true);u.insertNode(r);if(s){v.setStartAfter(r);v.setEndBefore(s);}else v.moveToPosition(r,4);return{startNode:q?t+'S':r,endNode:q?t+'E':s,serializable:q};},createBookmark2:function(q){var x=this;var r=x.startContainer,s=x.endContainer,t=x.startOffset,u=x.endOffset,v,w;if(!r||!s)return{start:0,end:0};if(q){if(r.type==1){v=r.getChild(t);if(v&&v.type==3&&t>0&&v.getPrevious().type==3){r=v;t=0;}}while(r.type==3&&(w=r.getPrevious())&&(w.type==3)){r=w;t+=w.getLength();}if(!x.isCollapsed){if(s.type==1){v=s.getChild(u);if(v&&v.type==3&&u>0&&v.getPrevious().type==3){s=v;u=0;}}while(s.type==3&&(w=s.getPrevious())&&(w.type==3)){s=w;u+=w.getLength();}}}return{start:r.getAddress(q),end:x.isCollapsed?null:s.getAddress(q),startOffset:t,endOffset:u,normalized:q,is2:true};},moveToBookmark:function(q){var y=this;if(q.is2){var r=y.document.getByAddress(q.start,q.normalized),s=q.startOffset,t=q.end&&y.document.getByAddress(q.end,q.normalized),u=q.endOffset;y.setStart(r,s);if(t)y.setEnd(t,u);else y.collapse(true);}else{var v=q.serializable,w=v?y.document.getById(q.startNode):q.startNode,x=v?y.document.getById(q.endNode):q.endNode;y.setStartBefore(w);w.remove();if(x){y.setEndBefore(x);x.remove();}else y.collapse(true);}},getBoundaryNodes:function(){var v=this;var q=v.startContainer,r=v.endContainer,s=v.startOffset,t=v.endOffset,u;if(q.type==1){u=q.getChildCount();if(u>s)q=q.getChild(s);else if(u<1)q=q.getPreviousSourceNode();else{q=q.$;while(q.lastChild)q=q.lastChild;q=new d.node(q);q=q.getNextSourceNode()||q;}}if(r.type==1){u=r.getChildCount();if(u>t)r=r.getChild(t).getPreviousSourceNode(true);else if(u<1)r=r.getPreviousSourceNode();else{r=r.$;while(r.lastChild)r=r.lastChild;r=new d.node(r);}}if(q.getPosition(r)&2)q=r;return{startNode:q,endNode:r};},getCommonAncestor:function(q,r){var v=this;var s=v.startContainer,t=v.endContainer,u;if(s.equals(t)){if(q&&s.type==1&&v.startOffset==v.endOffset-1)u=s.getChild(v.startOffset);else u=s;}else u=s.getCommonAncestor(t);return r&&!u.is?u.getParent():u;},optimize:function(){var s=this;var q=s.startContainer,r=s.startOffset;if(q.type!=1)if(!r)s.setStartBefore(q);else if(r>=q.getLength())s.setStartAfter(q);q=s.endContainer;r=s.endOffset;if(q.type!=1)if(!r)s.setEndBefore(q);
else if(r>=q.getLength())s.setEndAfter(q);},optimizeBookmark:function(){var s=this;var q=s.startContainer,r=s.endContainer;if(q.is&&q.is('span')&&q.hasAttribute('_fck_bookmark'))s.setStartAt(q,3);if(r&&r.is&&r.is('span')&&r.hasAttribute('_fck_bookmark'))s.setEndAt(r,4);},trim:function(q,r){var y=this;var s=y.startContainer,t=y.startOffset,u=y.collapsed;if((!q||u)&&(s&&s.type==3)){if(!t){t=s.getIndex();s=s.getParent();}else if(t>=s.getLength()){t=s.getIndex()+1;s=s.getParent();}else{var v=s.split(t);t=s.getIndex()+1;s=s.getParent();if(!u&&y.startContainer.equals(y.endContainer))y.setEnd(v,y.endOffset-y.startOffset);}y.setStart(s,t);if(u)y.collapse(true);}var w=y.endContainer,x=y.endOffset;if(!(r||u)&&w&&w.type==3){if(!x){x=w.getIndex();w=w.getParent();}else if(x>=w.getLength()){x=w.getIndex()+1;w=w.getParent();}else{w.split(x);x=w.getIndex()+1;w=w.getParent();}y.setEnd(w,x);}},enlarge:function(q){switch(q){case 1:if(this.collapsed)return;var r=this.getCommonAncestor(),s=this.document.getBody(),t,u,v,w,x,y=false,z,A,B=this.startContainer,C=this.startOffset;if(B.type==3){if(C){B=!e.trim(B.substring(0,C)).length&&B;y=!!B;}if(B)if(!(w=B.getPrevious()))v=B.getParent();}else{if(C)w=B.getChild(C-1)||B.getLast();if(!w)v=B;}while(v||w){if(v&&!w){if(!x&&v.equals(r))x=true;if(!s.contains(v))break;if(!y||v.getComputedStyle('display')!='inline'){y=false;if(x)t=v;else this.setStartBefore(v);}w=v.getPrevious();}while(w){z=false;if(w.type==3){A=w.getText();if(/[^\s\ufeff]/.test(A))w=null;z=/[\s\ufeff]$/.test(A);}else if(w.$.offsetWidth>0&&!w.getAttribute('_fck_bookmark'))if(y&&f.$removeEmpty[w.getName()]){A=w.getText();if(!/[^\s\ufeff]/.test(A))w=null;else{var D=w.$.all||w.$.getElementsByTagName('*');for(var E=0,F;F=D[E++];)if(!f.$removeEmpty[F.nodeName.toLowerCase()]){w=null;break;}}if(w)z=!!A.length;}else w=null;if(z)if(y){if(x)t=v;else if(v)this.setStartBefore(v);}else y=true;if(w){var G=w.getPrevious();if(!v&&!G){v=w;w=null;break;}w=G;}else v=null;}if(v)v=v.getParent();}B=this.endContainer;C=this.endOffset;v=w=null;x=y=false;if(B.type==3){B=!e.trim(B.substring(C)).length&&B;y=!(B&&B.getLength());if(B)if(!(w=B.getNext()))v=B.getParent();}else{w=B.getChild(C);if(!w)v=B;}while(v||w){if(v&&!w){if(!x&&v.equals(r))x=true;if(!s.contains(v))break;if(!y||v.getComputedStyle('display')!='inline'){y=false;if(x)u=v;else if(v)this.setEndAfter(v);}w=v.getNext();}while(w){z=false;if(w.type==3){A=w.getText();if(/[^\s\ufeff]/.test(A))w=null;z=/^[\s\ufeff]/.test(A);}else if(w.$.offsetWidth>0&&!w.getAttribute('_fck_bookmark'))if(y&&f.$removeEmpty[w.getName()]){A=w.getText();
if(!/[^\s\ufeff]/.test(A))w=null;else{D=w.$.all||w.$.getElementsByTagName('*');for(E=0;F=D[E++];)if(!f.$removeEmpty[F.nodeName.toLowerCase()]){w=null;break;}}if(w)z=!!A.length;}else w=null;if(z)if(y)if(x)u=v;else this.setEndAfter(v);if(w){G=w.getNext();if(!v&&!G){v=w;w=null;break;}w=G;}else v=null;}if(v)v=v.getParent();}if(t&&u){r=t.contains(u)?u:t;this.setStartBefore(r);this.setEndAfter(r);}break;case 2:case 3:var H=new d.range(this.document);s=this.document.getBody();H.setStartAt(s,1);H.setEnd(this.startContainer,this.startOffset);var I=new d.walker(H),J,K,L=d.walker.blockBoundary(q==3?{br:1}:null),M=function(O){var P=L(O);if(!P)J=O;return P;},N=function(O){var P=M(O);if(!P&&O.is&&O.is('br'))K=O;return P;};I.guard=M;v=I.lastBackward();J=J||s;this.setStartAt(J,!J.is('br')&&(!v||J.contains(v))?1:4);H=this.clone();H.collapse();H.setEndAt(s,2);I=new d.walker(H);I.guard=q==3?N:M;J=null;v=I.lastForward();J=J||s;this.setEndAt(J,!J.is('br')&&(!v||J.contains(v))?2:3);if(K)this.setEndAfter(K);}},insertNode:function(q){var u=this;u.optimizeBookmark();u.trim(false,true);var r=u.startContainer,s=u.startOffset,t=r.getChild(s);if(t)q.insertBefore(t);else r.append(q);if(q.getParent().equals(u.endContainer))u.endOffset++;u.setStartBefore(q);},moveToPosition:function(q,r){this.setStartAt(q,r);this.collapse(true);},selectNodeContents:function(q){this.setStart(q,0);this.setEnd(q,q.type==3?q.getLength():q.getChildCount());},setStart:function(q,r){var s=this;s.startContainer=q;s.startOffset=r;if(!s.endContainer){s.endContainer=q;s.endOffset=r;}l(s);},setEnd:function(q,r){var s=this;s.endContainer=q;s.endOffset=r;if(!s.startContainer){s.startContainer=q;s.startOffset=r;}l(s);},setStartAfter:function(q){this.setStart(q.getParent(),q.getIndex()+1);},setStartBefore:function(q){this.setStart(q.getParent(),q.getIndex());},setEndAfter:function(q){this.setEnd(q.getParent(),q.getIndex()+1);},setEndBefore:function(q){this.setEnd(q.getParent(),q.getIndex());},setStartAt:function(q,r){var s=this;switch(r){case 1:s.setStart(q,0);break;case 2:if(q.type==3)s.setStart(q,q.getLength());else s.setStart(q,q.getChildCount());break;case 3:s.setStartBefore(q);break;case 4:s.setStartAfter(q);}l(s);},setEndAt:function(q,r){var s=this;switch(r){case 1:s.setEnd(q,0);break;case 2:if(q.type==3)s.setEnd(q,q.getLength());else s.setEnd(q,q.getChildCount());break;case 3:s.setEndBefore(q);break;case 4:s.setEndAfter(q);}l(s);},fixBlock:function(q,r){var u=this;var s=u.createBookmark(),t=u.document.createElement(r);
u.collapse(q);u.enlarge(2);u.extractContents().appendTo(t);t.trim();if(!c)t.appendBogus();u.insertNode(t);u.moveToBookmark(s);return t;},splitBlock:function(q){var B=this;var r=new d.elementPath(B.startContainer),s=new d.elementPath(B.endContainer),t=r.blockLimit,u=s.blockLimit,v=r.block,w=s.block,x=null;if(!t.equals(u))return null;if(q!='br'){if(!v){v=B.fixBlock(true,q);w=new d.elementPath(B.endContainer).block;}if(!w)w=B.fixBlock(false,q);}var y=v&&B.checkStartOfBlock(),z=w&&B.checkEndOfBlock();B.deleteContents();if(v&&v.equals(w))if(z){x=new d.elementPath(B.startContainer);B.moveToPosition(w,4);w=null;}else if(y){x=new d.elementPath(B.startContainer);B.moveToPosition(v,3);v=null;}else{B.setEndAt(v,2);var A=B.extractContents();w=v.clone(false);A.appendTo(w);w.insertAfter(v);B.moveToPosition(v,4);if(!c&&!v.is('ul','ol'))v.appendBogus();}return{previousBlock:v,nextBlock:w,wasStartOfBlock:y,wasEndOfBlock:z,elementPath:x};},checkBoundaryOfElement:function(q,r){var s=this.clone();s[r==1?'setStartAt':'setEndAt'](q,r==1?1:2);var t=new d.walker(s),u=false;t.evaluator=p;return t[r==1?'checkBackward':'checkForward']();},checkStartOfBlock:function(){var w=this;var q=w.startContainer,r=w.startOffset;if(r&&q.type==3){var s=e.ltrim(q.substring(0,r));if(s.length)return false;}w.trim();var t=new d.elementPath(w.startContainer),u=w.clone();u.collapse(true);u.setStartAt(t.block||t.blockLimit,1);var v=new d.walker(u);v.evaluator=o(true);return v.checkBackward();},checkEndOfBlock:function(){var w=this;var q=w.endContainer,r=w.endOffset;if(q.type==3){var s=e.rtrim(q.substring(r));if(s.length)return false;}w.trim();var t=new d.elementPath(w.endContainer),u=w.clone();u.collapse(false);u.setEndAt(t.block||t.blockLimit,2);var v=new d.walker(u);v.evaluator=o(false);return v.checkForward();},moveToElementEditStart:function(q){var r;while(q&&q.type==1){if(q.isEditable())r=q;else if(r)break;q=q.getFirst();}if(r){this.moveToPosition(r,1);return true;}else return false;},getEnclosedNode:function(){var q=this.clone(),r=new d.walker(q),s=d.walker.bookmark(true),t=d.walker.whitespaces(true),u=function(w){return t(w)&&s(w);};q.evaluator=u;var v=r.next();r.reset();return v&&v.equals(r.previous())?v:null;},getTouchedStartNode:function(){var q=this.startContainer;if(this.collapsed||q.type!=1)return q;return q.getChild(this.startOffset)||q;},getTouchedEndNode:function(){var q=this.endContainer;if(this.collapsed||q.type!=1)return q;return q.getChild(this.endOffset-1)||q;}};})();a.POSITION_AFTER_START=1;
a.POSITION_BEFORE_END=2;a.POSITION_BEFORE_START=3;a.POSITION_AFTER_END=4;a.ENLARGE_ELEMENT=1;a.ENLARGE_BLOCK_CONTENTS=2;a.ENLARGE_LIST_ITEM_CONTENTS=3;a.START=1;a.END=2;a.STARTEND=3;(function(){var l=c&&b.version<7?a.basePath+'images/spacer.gif':'about:blank',m=h.createFromHtml('<div style="width:0px;height:0px;position:absolute;left:-10000px;background-image:url('+l+')"></div>',a.document);m.appendTo(a.document.getHead());try{b.hc=m.getComputedStyle('background-image')=='none';}catch(n){b.hc=false;}if(b.hc)b.cssClass+=' cke_hc';m.remove();})();j.load(i.corePlugins.split(','),function(){a.status='loaded';a.fire('loaded');var l=a._.pending;if(l){delete a._.pending;for(var m=0;m<l.length;m++)a.add(l[m]);}});j.add('about',{init:function(l){var m=l.addCommand('about',new a.dialogCommand('about'));m.modes={wysiwyg:1,source:1};m.canUndo=false;l.ui.addButton('About',{label:l.lang.about.title,command:'about'});a.dialog.add('about',this.path+'dialogs/about.js');}});j.add('basicstyles',{requires:['styles','button'],init:function(l){var m=function(p,q,r,s){var t=new a.style(s);l.attachStyleStateChange(t,function(u){l.getCommand(r).setState(u);});l.addCommand(r,new a.styleCommand(t));l.ui.addButton(p,{label:q,command:r});},n=l.config,o=l.lang;m('Bold',o.bold,'bold',n.coreStyles_bold);m('Italic',o.italic,'italic',n.coreStyles_italic);m('Underline',o.underline,'underline',n.coreStyles_underline);m('Strike',o.strike,'strike',n.coreStyles_strike);m('Subscript',o.subscript,'subscript',n.coreStyles_subscript);m('Superscript',o.superscript,'superscript',n.coreStyles_superscript);}});i.coreStyles_bold={element:'strong',overrides:'b'};i.coreStyles_italic={element:'em',overrides:'i'};i.coreStyles_underline={element:'u'};i.coreStyles_strike={element:'strike'};i.coreStyles_subscript={element:'sub'};i.coreStyles_superscript={element:'sup'};(function(){function l(p,q){var r=q.block||q.blockLimit;if(!r||r.getName()=='body')return 2;if(r.getAscendant('blockquote',true))return 1;return 2;};function m(p){var q=p.editor,r=q.getCommand('blockquote');r.state=l(q,p.data.path);r.fire('state');};function n(p){for(var q=0,r=p.getChildCount(),s;q<r&&(s=p.getChild(q));q++)if(s.type==1&&s.isBlockBoundary())return false;return true;};var o={exec:function(p){var q=p.getCommand('blockquote').state,r=p.getSelection(),s=r&&r.getRanges()[0];if(!s)return;var t=r.createBookmarks();if(c){var u=t[0].startNode,v=t[0].endNode,w;if(u&&u.getParent().getName()=='blockquote'){w=u;while(w=w.getNext())if(w.type==1&&w.isBlockBoundary()){u.move(w,true);
break;}}if(v&&v.getParent().getName()=='blockquote'){w=v;while(w=w.getPrevious())if(w.type==1&&w.isBlockBoundary()){v.move(w);break;}}}var x=s.createIterator(),y;if(q==2){var z=[];while(y=x.getNextParagraph())z.push(y);if(z.length<1){var A=p.document.createElement(p.config.enterMode==1?'p':'div'),B=t.shift();s.insertNode(A);A.append(new d.text('﻿',p.document));s.moveToBookmark(B);s.selectNodeContents(A);s.collapse(true);B=s.createBookmark();z.push(A);t.unshift(B);}var C=z[0].getParent(),D=[];for(var E=0;E<z.length;E++){y=z[E];C=C.getCommonAncestor(y.getParent());}var F={table:1,tbody:1,tr:1,ol:1,ul:1};while(F[C.getName()])C=C.getParent();var G=null;while(z.length>0){y=z.shift();while(!y.getParent().equals(C))y=y.getParent();if(!y.equals(G))D.push(y);G=y;}while(D.length>0){y=D.shift();if(y.getName()=='blockquote'){var H=new d.documentFragment(p.document);while(y.getFirst()){H.append(y.getFirst().remove());z.push(H.getLast());}H.replace(y);}else z.push(y);}var I=p.document.createElement('blockquote');I.insertBefore(z[0]);while(z.length>0){y=z.shift();I.append(y);}}else if(q==1){var J=[],K={};while(y=x.getNextParagraph()){var L=null,M=null;while(y.getParent()){if(y.getParent().getName()=='blockquote'){L=y.getParent();M=y;break;}y=y.getParent();}if(L&&M&&!M.getCustomData('blockquote_moveout')){J.push(M);h.setMarker(K,M,'blockquote_moveout',true);}}h.clearAllMarkers(K);var N=[],O=[];K={};while(J.length>0){var P=J.shift();I=P.getParent();if(!P.getPrevious())P.remove().insertBefore(I);else if(!P.getNext())P.remove().insertAfter(I);else{P.breakParent(P.getParent());O.push(P.getNext());}if(!I.getCustomData('blockquote_processed')){O.push(I);h.setMarker(K,I,'blockquote_processed',true);}N.push(P);}h.clearAllMarkers(K);for(E=O.length-1;E>=0;E--){I=O[E];if(n(I))I.remove();}if(p.config.enterMode==2){var Q=true;while(N.length){P=N.shift();if(P.getName()=='div'){H=new d.documentFragment(p.document);var R=Q&&P.getPrevious()&&!(P.getPrevious().type==1&&P.getPrevious().isBlockBoundary());if(R)H.append(p.document.createElement('br'));var S=P.getNext()&&!(P.getNext().type==1&&P.getNext().isBlockBoundary());while(P.getFirst())P.getFirst().remove().appendTo(H);if(S)H.append(p.document.createElement('br'));H.replace(P);Q=false;}}}}r.selectBookmarks(t);p.focus();}};j.add('blockquote',{init:function(p){p.addCommand('blockquote',o);p.ui.addButton('Blockquote',{label:p.lang.blockquote,command:'blockquote'});p.on('selectionChange',m);},requires:['domiterator']});})();j.add('button',{beforeInit:function(l){l.ui.addHandler(1,k.button.handler);
}});a.UI_BUTTON=1;k.button=function(l){e.extend(this,l,{title:l.label,className:l.className||l.command&&'cke_button_'+l.command||'',click:l.click||(function(m){m.execCommand(l.command);})});this._={};};k.button.handler={create:function(l){return new k.button(l);}};k.button.prototype={canGroup:true,render:function(l,m){var n=b,o=this._.id='cke_'+e.getNextNumber();this._.editor=l;var p={id:o,button:this,editor:l,focus:function(){var v=a.document.getById(o);v.focus();},execute:function(){this.button.click(l);}},q=e.addFunction(p.execute,p),r=k.button._.instances.push(p)-1,s='',t=this.command;if(this.modes)l.on('mode',function(){this.setState(this.modes[l.mode]?2:0);},this);else if(t){t=l.getCommand(t);if(t){t.on('state',function(){this.setState(t.state);},this);s+='cke_'+(t.state==1?'on':t.state==0?'disabled':'off');}}if(!t)s+='cke_off';if(this.className)s+=' '+this.className;m.push('<span class="cke_button">','<a id="',o,'" class="',s,'" href="javascript:void(\'',(this.title||'').replace("'",''),'\')" title="',this.title,'" tabindex="-1" hidefocus="true"');if(n.opera||n.gecko&&n.mac)m.push(' onkeypress="return false;"');if(n.gecko)m.push(' onblur="this.style.cssText = this.style.cssText;"');m.push(' onkeydown="return CKEDITOR.ui.button._.keydown(',r,', event);" onfocus="return CKEDITOR.ui.button._.focus(',r,', event);" onclick="CKEDITOR.tools.callFunction(',q,', this); return false;"><span class="cke_icon"');if(this.icon){var u=(this.iconOffset||0)*(-16);m.push(' style="background-image:url(',a.getUrl(this.icon),');background-position:0 '+u+'px;"');}m.push('></span><span class="cke_label">',this.label,'</span>');if(this.hasArrow)m.push('<span class="cke_buttonarrow"></span>');m.push('</a>','</span>');if(this.onRender)this.onRender();return p;},setState:function(l){var q=this;if(q._.state==l)return;var m=a.document.getById(q._.id);if(m){m.setState(l);var n=q.title,o=q._.editor.lang.common.unavailable,p=m.getChild(1);if(l==0)n=o.replace('%1',q.title);p.setHtml(n);}q._.state=l;}};k.button._={instances:[],keydown:function(l,m){var n=k.button._.instances[l];if(n.onkey){m=new d.event(m);return n.onkey(n,m.getKeystroke())!==false;}},focus:function(l,m){var n=k.button._.instances[l],o;if(n.onfocus)o=n.onfocus(n,new d.event(m))!==false;if(b.gecko&&b.version<10900)m.preventBubble();return o;}};k.prototype.addButton=function(l,m){this.add(l,1,m);};(function(){var l=function(q,r){var s=q.document,t=s.getBody(),u=false,v=function(){u=true;};t.on(r,v);s.$.execCommand(r);t.removeListener(r,v);
return u;},m=c?function(q,r){return l(q,r);}:function(q,r){try{return q.document.$.execCommand(r);}catch(s){return false;}},n=function(q){this.type=q;this.canUndo=this.type=='cut';};n.prototype={exec:function(q,r){var s=m(q,this.type);if(!s)alert(q.lang.clipboard[this.type+'Error']);return s;}};var o=c?{exec:function(q,r){q.focus();if(!q.fire('beforePaste')&&!l(q,'paste'))q.openDialog('paste');}}:{exec:function(q){try{if(!q.fire('beforePaste')&&!q.document.$.execCommand('Paste',false,null))throw 0;}catch(r){q.openDialog('paste');}}},p=function(q){switch(q.data.keyCode){case 1000+86:case 2000+45:var r=this;r.fire('saveSnapshot');if(r.fire('beforePaste'))q.cancel();setTimeout(function(){r.fire('saveSnapshot');},0);return;case 1000+88:case 2000+46:r=this;r.fire('saveSnapshot');setTimeout(function(){r.fire('saveSnapshot');},0);}};j.add('clipboard',{init:function(q){function r(t,u,v,w){var x=q.lang[u];q.addCommand(u,v);q.ui.addButton(t,{label:x,command:u});if(q.addMenuItems)q.addMenuItem(u,{label:x,command:u,group:'clipboard',order:w});};r('Cut','cut',new n('cut'),1);r('Copy','copy',new n('copy'),4);r('Paste','paste',o,8);a.dialog.add('paste',a.getUrl(this.path+'dialogs/paste.js'));q.on('key',p,q);if(q.contextMenu){function s(t){return q.document.$.queryCommandEnabled(t)?2:0;};q.contextMenu.addListener(function(){return{cut:s('Cut'),copy:s('Cut'),paste:b.webkit?2:s('Paste')};});}}});})();j.add('colorbutton',{requires:['panelbutton','floatpanel','styles'],init:function(l){var m=l.config,n=l.lang.colorButton,o;if(!b.hc){p('TextColor','fore',n.textColorTitle);p('BGColor','back',n.bgColorTitle);}function p(r,s,t){l.ui.add(r,4,{label:t,title:t,className:'cke_button_'+r.toLowerCase(),modes:{wysiwyg:1},panel:{css:[a.getUrl(l.skinPath+'editor.css')]},onBlock:function(u,v){var w=u.addBlock(v);w.autoSize=true;w.element.addClass('cke_colorblock');w.element.setHtml(q(u,s));var x=w.keys;x[39]='next';x[9]='next';x[37]='prev';x[2000+9]='prev';x[32]='click';}});};function q(r,s){var t=[],u=m.colorButton_colors.split(','),v=e.addFunction(function(z,A){if(z=='?')return;l.focus();r.hide();var B=new a.style(m['colorButton_'+A+'Style'],z&&{color:z});l.fire('saveSnapshot');if(z)B.apply(l.document);else B.remove(l.document);l.fire('saveSnapshot');});t.push('<a class="cke_colorauto" _cke_focus=1 hidefocus=true title="',n.auto,'" onclick="CKEDITOR.tools.callFunction(',v,",null,'",s,"');return false;\" href=\"javascript:void('",n.auto,'\')"><table cellspacing=0 cellpadding=0 width="100%"><tr><td><span class="cke_colorbox" style="background-color:#000"></span></td><td colspan=7 align=center>',n.auto,'</td></tr></table></a><table cellspacing=0 cellpadding=0 width="100%">');
for(var w=0;w<u.length;w++){if(w%8===0)t.push('</tr><tr>');var x=u[w],y=l.lang.colors[x]||x;t.push('<td><a class="cke_colorbox" _cke_focus=1 hidefocus=true title="',y,'" onclick="CKEDITOR.tools.callFunction(',v,",'#",x,"','",s,"'); return false;\" href=\"javascript:void('",y,'\')"><span class="cke_colorbox" style="background-color:#',x,'"></span></a></td>');}if(m.colorButton_enableMore)t.push('</tr><tr><td colspan=8 align=center><a class="cke_colormore" _cke_focus=1 hidefocus=true title="',n.more,'" onclick="CKEDITOR.tools.callFunction(',v,",'?','",s,"');return false;\" href=\"javascript:void('",n.more,"')\">",n.more,'</a></td>');t.push('</tr></table>');return t.join('');};}});i.colorButton_enableMore=false;i.colorButton_colors='000,800000,8B4513,2F4F4F,008080,000080,4B0082,696969,B22222,A52A2A,DAA520,006400,40E0D0,0000CD,800080,808080,F00,FF8C00,FFD700,008000,0FF,00F,EE82EE,A9A9A9,FFA07A,FFA500,FFFF00,00FF00,AFEEEE,ADD8E6,DDA0DD,D3D3D3,FFF0F5,FAEBD7,FFFFE0,F0FFF0,F0FFFF,F0F8FF,E6E6FA,FFF';i.colorButton_foreStyle={element:'span',styles:{color:'#(color)'},overrides:[{element:'font',attributes:{color:null}}]};i.colorButton_backStyle={element:'span',styles:{'background-color':'#(color)'}};(function(){j.colordialog={init:function(l){l.addCommand('colordialog',new a.dialogCommand('colordialog'));a.dialog.add('colordialog',this.path+'dialogs/colordialog.js');}};j.add('colordialog',j.colordialog);})();j.add('contextmenu',{requires:['menu'],beforeInit:function(l){l.contextMenu=new j.contextMenu(l);l.addCommand('contextMenu',{exec:function(){l.contextMenu.show(l.document.getBody());}});}});j.contextMenu=e.createClass({$:function(l){this.id='cke_'+e.getNextNumber();this.editor=l;this._.listeners=[];this._.functionId=e.addFunction(function(m){this._.panel.hide();l.focus();l.execCommand(m);},this);},_:{onMenu:function(l,m,n,o){var p=this._.menu,q=this.editor;if(p){p.hide();p.removeAll();}else{p=this._.menu=new a.menu(q);p.onClick=e.bind(function(z){var A=true;p.hide();if(c)p.onEscape();if(z.onClick)z.onClick();else if(z.command)q.execCommand(z.command);A=false;},this);p.onEscape=function(){q.focus();if(c)q.getSelection().unlock(true);};}var r=this._.listeners,s=[],t=this.editor.getSelection(),u=t&&t.getStartElement();if(c)t.lock();p.onHide=e.bind(function(){p.onHide=null;if(c)q.getSelection().unlock();this.onHide&&this.onHide();},this);for(var v=0;v<r.length;v++){var w=r[v](u,t);if(w)for(var x in w){var y=this.editor.getMenuItem(x);if(y){y.state=w[x];p.add(y);}}}p.show(l,m||(q.lang.dir=='rtl'?2:1),n,o);
}},proto:{addTarget:function(l){l.on('contextmenu',function(m){var n=m.data;n.preventDefault();var o=n.getTarget().getDocument().getDocumentElement(),p=n.$.clientX,q=n.$.clientY;e.setTimeout(function(){this._.onMenu(o,null,p,q);},0,this);},this);},addListener:function(l){this._.listeners.push(l);},show:function(l,m,n,o){this.editor.focus();this._.onMenu(l||a.document.getDocumentElement(),m,n||0,o||0);}}});(function(){var l={toolbarFocus:{exec:function(n){var o=n._.elementsPath.idBase,p=a.document.getById(o+'0');if(p)p.focus();}}},m='<span class="cke_empty">&nbsp;</span>';j.add('elementspath',{requires:['selection'],init:function(n){var o='cke_path_'+n.name,p,q=function(){if(!p)p=a.document.getById(o);return p;},r='cke_elementspath_'+e.getNextNumber()+'_';n._.elementsPath={idBase:r};n.on('themeSpace',function(s){if(s.data.space=='bottom')s.data.html+='<div id="'+o+'" class="cke_path">'+m+'</div>';});n.on('selectionChange',function(s){var t=b,u=s.data.selection,v=u.getStartElement(),w=[],x=this._.elementsPath.list=[];while(v){var y=x.push(v)-1,z;if(v.getAttribute('_cke_real_element_type'))z=v.getAttribute('_cke_real_element_type');else z=v.getName();var A='';if(t.opera||t.gecko&&t.mac)A+=' onkeypress="return false;"';if(t.gecko)A+=' onblur="this.style.cssText = this.style.cssText;"';w.unshift('<a id="',r,y,'" href="javascript:void(\'',z,'\')" tabindex="-1" title="',n.lang.elementsPath.eleTitle.replace(/%1/,z),'"'+(b.gecko&&b.version<10900?' onfocus="event.preventBubble();"':'')+' hidefocus="true" '+" onkeydown=\"return CKEDITOR._.elementsPath.keydown('",this.name,"',",y,', event);"'+A," onclick=\"return CKEDITOR._.elementsPath.click('",this.name,"',",y,');">',z,'</a>');if(z=='body')break;v=v.getParent();}q().setHtml(w.join('')+m);});n.on('contentDomUnload',function(){q().setHtml(m);});n.addCommand('elementsPathFocus',l.toolbarFocus);}});})();a._.elementsPath={click:function(l,m){var n=a.instances[l];n.focus();var o=n._.elementsPath.list[m];n.getSelection().selectElement(o);return false;},keydown:function(l,m,n){var o=k.button._.instances[m],p=a.instances[l],q=p._.elementsPath.idBase,r;n=new d.event(n);switch(n.getKeystroke()){case 37:case 9:r=a.document.getById(q+(m+1));if(!r)r=a.document.getById(q+'0');r.focus();return false;case 39:case 2000+9:r=a.document.getById(q+(m-1));if(!r)r=a.document.getById(q+(p._.elementsPath.list.length-1));r.focus();return false;case 27:p.focus();return false;case 13:case 32:this.click(l,m);return false;}return true;}};(function(){j.add('enterkey',{requires:['keystrokes','indent'],init:function(s){var t=s.specialKeys;
t[13]=o;t[2000+13]=n;}});var l,m=/^h[1-6]$/;function n(s){l=1;return o(s,s.config.shiftEnterMode);};function o(s,t){if(s.mode!='wysiwyg')return false;if(!t)t=s.config.enterMode;setTimeout(function(){s.fire('saveSnapshot');if(t==2||s.getSelection().getStartElement().hasAscendant('pre',true))q(s,t);else p(s,t);l=0;},0);return true;};function p(s,t,u){u=u||r(s);var v=u.document,w=t==3?'div':'p',x=u.splitBlock(w);if(!x)return;var y=x.previousBlock,z=x.nextBlock,A=x.wasStartOfBlock,B=x.wasEndOfBlock,C;if(z){C=z.getParent();if(C.is('li')){z.breakParent(C);z.move(z.getNext(),true);}}else if(y&&(C=y.getParent())&&(C.is('li'))){y.breakParent(C);u.moveToElementEditStart(y.getNext());y.move(y.getPrevious());}if(!A&&!B){if(z.is('li')&&(C=z.getFirst())&&(C.is&&C.is('ul','ol')))z.insertBefore(v.createText('\xa0'),C);if(z)u.moveToElementEditStart(z);}else{if(A&&B&&y.is('li')){s.execCommand('outdent');return;}var D;if(y){if(!l&&!m.test(y.getName()))D=y.clone();}else if(z)D=z.clone();if(!D)D=v.createElement(w);var E=x.elementPath;if(E)for(var F=0,G=E.elements.length;F<G;F++){var H=E.elements[F];if(H.equals(E.block)||H.equals(E.blockLimit))break;if(f.$removeEmpty[H.getName()]){H=H.clone();D.moveChildren(H);D.append(H);}}if(!c)D.appendBogus();u.insertNode(D);if(c&&A&&(!B||!y.getChildCount())){u.moveToElementEditStart(B?y:D);u.select();}u.moveToElementEditStart(A&&!B?z:D);}if(!c)if(z){var I=v.createElement('span');I.setHtml('&nbsp;');u.insertNode(I);I.scrollIntoView();u.deleteContents();}else D.scrollIntoView();u.select();};function q(s,t){var u=r(s),v=u.document,w=t==3?'div':'p',x=u.checkEndOfBlock(),y=new d.elementPath(s.getSelection().getStartElement()),z=y.block,A=z&&y.block.getName(),B=false;if(!l&&A=='li'){p(s,t,u);return;}if(!l&&x&&m.test(A)){v.createElement('br').insertAfter(z);if(b.gecko)v.createText('').insertAfter(z);u.setStartAt(z.getNext(),c?3:1);}else{var C;B=A=='pre';if(B)C=v.createText(c?'\r':'\n');else C=v.createElement('br');u.deleteContents();u.insertNode(C);if(!c)v.createText('﻿').insertAfter(C);if(x&&!c)C.getParent().appendBogus();if(!c)C.getNext().$.nodeValue='';if(c)u.setStartAt(C,4);else u.setStartAt(C.getNext(),1);if(!c){var D=null;if(!b.gecko){D=v.createElement('span');D.setHtml('&nbsp;');}else D=v.createElement('br');D.insertBefore(C.getNext());D.scrollIntoView();D.remove();}}u.collapse(true);u.select(B);};function r(s){var t=s.getSelection().getRanges();for(var u=t.length-1;u>0;u--)t[u].deleteContents();return t[0];};})();(function(){var l='nbsp,gt,lt,quot,iexcl,cent,pound,curren,yen,brvbar,sect,uml,copy,ordf,laquo,not,shy,reg,macr,deg,plusmn,sup2,sup3,acute,micro,para,middot,cedil,sup1,ordm,raquo,frac14,frac12,frac34,iquest,times,divide,fnof,bull,hellip,prime,Prime,oline,frasl,weierp,image,real,trade,alefsym,larr,uarr,rarr,darr,harr,crarr,lArr,uArr,rArr,dArr,hArr,forall,part,exist,empty,nabla,isin,notin,ni,prod,sum,minus,lowast,radic,prop,infin,ang,and,or,cap,cup,int,there4,sim,cong,asymp,ne,equiv,le,ge,sub,sup,nsub,sube,supe,oplus,otimes,perp,sdot,lceil,rceil,lfloor,rfloor,lang,rang,loz,spades,clubs,hearts,diams,circ,tilde,ensp,emsp,thinsp,zwnj,zwj,lrm,rlm,ndash,mdash,lsquo,rsquo,sbquo,ldquo,rdquo,bdquo,dagger,Dagger,permil,lsaquo,rsaquo,euro',m='Agrave,Aacute,Acirc,Atilde,Auml,Aring,AElig,Ccedil,Egrave,Eacute,Ecirc,Euml,Igrave,Iacute,Icirc,Iuml,ETH,Ntilde,Ograve,Oacute,Ocirc,Otilde,Ouml,Oslash,Ugrave,Uacute,Ucirc,Uuml,Yacute,THORN,szlig,agrave,aacute,acirc,atilde,auml,aring,aelig,ccedil,egrave,eacute,ecirc,euml,igrave,iacute,icirc,iuml,eth,ntilde,ograve,oacute,ocirc,otilde,ouml,oslash,ugrave,uacute,ucirc,uuml,yacute,thorn,yuml,OElig,oelig,Scaron,scaron,Yuml',n='Alpha,Beta,Gamma,Delta,Epsilon,Zeta,Eta,Theta,Iota,Kappa,Lambda,Mu,Nu,Xi,Omicron,Pi,Rho,Sigma,Tau,Upsilon,Phi,Chi,Psi,Omega,alpha,beta,gamma,delta,epsilon,zeta,eta,theta,iota,kappa,lambda,mu,nu,xi,omicron,pi,rho,sigmaf,sigma,tau,upsilon,phi,chi,psi,omega,thetasym,upsih,piv';
function o(p){var q={},r=[],s={nbsp:'\xa0',shy:'­',gt:'>',lt:'<'};p=p.replace(/\b(nbsp|shy|gt|lt|amp)(?:,|$)/g,function(x,y){q[s[y]]='&'+y+';';r.push(s[y]);return '';});p=p.split(',');var t=document.createElement('div'),u;t.innerHTML='&'+p.join(';&')+';';u=t.innerHTML;t=null;for(var v=0;v<u.length;v++){var w=u.charAt(v);q[w]='&'+p[v]+';';r.push(w);}q.regex=r.join('');return q;};j.add('entities',{afterInit:function(p){var q=p.config;if(!q.entities)return;var r=p.dataProcessor,s=r&&r.htmlFilter;if(s){var t=l;if(q.entities_latin)t+=','+m;if(q.entities_greek)t+=','+n;if(q.entities_additional)t+=','+q.entities_additional;var u=o(t),v='['+u.regex+']';delete u.regex;if(q.entities_processNumerical)v='[^ -~]|'+v;v=new RegExp(v,'g');function w(x){return u[x]||'&#'+x.charCodeAt(0)+';';};s.addRules({text:function(x){return x.replace(v,w);}});}}});})();i.entities=true;i.entities_latin=true;i.entities_greek=true;i.entities_processNumerical=false;i.entities_additional='#39';(function(){function l(u,v){var w=[];if(!v)return u;else for(var x in v)w.push(x+'='+encodeURIComponent(v[x]));return u+(u.indexOf('?')!=-1?'&':'?')+w.join('&');};function m(u){u+='';var v=u.charAt(0).toUpperCase();return v+u.substr(1);};function n(u){var B=this;var v=B.getDialog(),w=v.getParentEditor();w._.filebrowserSe=B;var x=w.config['filebrowser'+m(v.getName())+'WindowWidth']||w.config.filebrowserWindowWidth||'80%',y=w.config['filebrowser'+m(v.getName())+'WindowHeight']||w.config.filebrowserWindowHeight||'70%',z=B.filebrowser.params||{};z.CKEditor=w.name;z.CKEditorFuncNum=w._.filebrowserFn;if(!z.langCode)z.langCode=w.langCode;var A=l(B.filebrowser.url,z);w.popup(A,x,y);};function o(u){var x=this;var v=x.getDialog(),w=v.getParentEditor();w._.filebrowserSe=x;if(!v.getContentElement(x['for'][0],x['for'][1]).getInputElement().$.value)return false;if(!v.getContentElement(x['for'][0],x['for'][1]).getAction())return false;return true;};function p(u,v,w){var x=w.params||{};x.CKEditor=u.name;x.CKEditorFuncNum=u._.filebrowserFn;if(!x.langCode)x.langCode=u.langCode;v.action=l(w.url,x);v.filebrowser=w;};function q(u,v,w,x){var y,z;for(var A in x){y=x[A];if(y.type=='hbox'||y.type=='vbox')q(u,v,w,y.children);if(!y.filebrowser)continue;if(typeof y.filebrowser=='string'){var B={action:y.type=='fileButton'?'QuickUpload':'Browse',target:y.filebrowser};y.filebrowser=B;}if(y.filebrowser.action=='Browse'){var C=y.filebrowser.url||u.config['filebrowser'+m(v)+'BrowseUrl']||u.config.filebrowserBrowseUrl;if(C){y.onClick=n;
y.filebrowser.url=C;y.hidden=false;}}else if(y.filebrowser.action=='QuickUpload'&&y['for']){C=y.filebrowser.url||u.config['filebrowser'+m(v)+'UploadUrl']||u.config.filebrowserUploadUrl;if(C){y.onClick=o;y.filebrowser.url=C;y.hidden=false;p(u,w.getContents(y['for'][0]).get(y['for'][1]),y.filebrowser);}}}};function r(u,v){var w=v.getDialog(),x=v.filebrowser.target||null;u=u.replace(/#/g,'%23');if(x){var y=x.split(':'),z=w.getContentElement(y[0],y[1]);if(z){z.setValue(u);w.selectPage(y[0]);}}};function s(u,v,w){if(w.indexOf(';')!==-1){var x=w.split(';');for(var y=0;y<x.length;y++)if(s(u,v,x[y]))return true;return false;}return u.getContents(v).get(w).filebrowser&&u.getContents(v).get(w).filebrowser.url;};function t(u,v){var z=this;var w=z._.filebrowserSe.getDialog(),x=z._.filebrowserSe['for'],y=z._.filebrowserSe.filebrowser.onSelect;if(x)w.getContentElement(x[0],x[1]).reset();if(y&&y.call(z._.filebrowserSe,u,v)===false)return;if(typeof v=='string'&&v)alert(v);if(u)r(u,z._.filebrowserSe);};j.add('filebrowser',{init:function(u,v){u._.filebrowserFn=e.addFunction(t,u);a.on('dialogDefinition',function(w){for(var x in w.data.definition.contents){q(w.editor,w.data.name,w.data.definition,w.data.definition.contents[x].elements);if(w.data.definition.contents[x].hidden&&w.data.definition.contents[x].filebrowser)w.data.definition.contents[x].hidden=!s(w.data.definition,w.data.definition.contents[x].id,w.data.definition.contents[x].filebrowser);}});}});})();j.add('find',{init:function(l){var m=j.find;l.ui.addButton('Find',{label:l.lang.findAndReplace.find,command:'find'});var n=l.addCommand('find',new a.dialogCommand('find'));n.canUndo=false;l.ui.addButton('Replace',{label:l.lang.findAndReplace.replace,command:'replace'});var o=l.addCommand('replace',new a.dialogCommand('replace'));o.canUndo=false;a.dialog.add('find',this.path+'dialogs/find.js');a.dialog.add('replace',this.path+'dialogs/find.js');},requires:['styles']});i.find_highlight={element:'span',styles:{'background-color':'#004',color:'#fff'}};(function(){var l=/\.swf(?:$|\?)/i,m=/^\d+(?:\.\d+)?$/;function n(q){if(m.test(q))return q+'px';return q;};function o(q){var r=q.attributes;return r.type=='application/x-shockwave-flash'||l.test(r.src||'');};function p(q,r){var s=q.createFakeParserElement(r,'cke_flash','flash',true),t=s.attributes.style||'',u=r.attributes.width,v=r.attributes.height;if(typeof u!='undefined')t=s.attributes.style=t+'width:'+n(u)+';';if(typeof v!='undefined')t=s.attributes.style=t+'height:'+n(v)+';';
return s;};j.add('flash',{init:function(q){q.addCommand('flash',new a.dialogCommand('flash'));q.ui.addButton('Flash',{label:q.lang.common.flash,command:'flash'});a.dialog.add('flash',this.path+'dialogs/flash.js');q.addCss('img.cke_flash{background-image: url('+a.getUrl(this.path+'images/placeholder.png')+');'+'background-position: center center;'+'background-repeat: no-repeat;'+'border: 1px solid #a9a9a9;'+'width: 80px;'+'height: 80px;'+'}');if(q.addMenuItems)q.addMenuItems({flash:{label:q.lang.flash.properties,command:'flash',group:'flash'}});if(q.contextMenu)q.contextMenu.addListener(function(r,s){if(r&&r.is('img')&&r.getAttribute('_cke_real_element_type')=='flash')return{flash:2};});},afterInit:function(q){var r=q.dataProcessor,s=r&&r.dataFilter;if(s)s.addRules({elements:{'cke:object':function(t){var u=t.attributes,v=u.classid&&String(u.classid).toLowerCase();if(!v){for(var w=0;w<t.children.length;w++)if(t.children[w].name=='embed'){if(!o(t.children[w]))return null;return p(q,t);}return null;}return p(q,t);},'cke:embed':function(t){if(!o(t))return null;return p(q,t);}}},5);},requires:['fakeobjects']});})();e.extend(i,{flashEmbedTagOnly:false,flashAddEmbedTag:true,flashConvertOnEdit:false});(function(){function l(m,n,o,p,q,r,s){var t=m.config,u=q.split(';'),v=[],w={};for(var x=0;x<u.length;x++){var y={},z=u[x].split('/'),A=u[x]=z[0];y[o]=v[x]=z[1]||A;w[A]=new a.style(s,y);}m.ui.addRichCombo(n,{label:p.label,title:p.panelTitle,voiceLabel:p.voiceLabel,className:'cke_'+(o=='size'?'fontSize':'font'),multiSelect:false,panel:{css:[a.getUrl(m.skinPath+'editor.css')].concat(t.contentsCss),voiceLabel:p.panelVoiceLabel},init:function(){this.startGroup(p.panelTitle);for(var B=0;B<u.length;B++){var C=u[B];this.add(C,'<span style="font-'+o+':'+v[B]+'">'+C+'</span>',C);}},onClick:function(B){m.focus();m.fire('saveSnapshot');var C=w[B];if(this.getValue()==B)C.remove(m.document);else C.apply(m.document);m.fire('saveSnapshot');},onRender:function(){m.on('selectionChange',function(B){var C=this.getValue(),D=B.data.path,E=D.elements;for(var F=0,G;F<E.length;F++){G=E[F];for(var H in w)if(w[H].checkElementRemovable(G,true)){if(H!=C)this.setValue(H);return;}}this.setValue('',r);},this);}});};j.add('font',{requires:['richcombo','styles'],init:function(m){var n=m.config;l(m,'Font','family',m.lang.font,n.font_names,n.font_defaultLabel,n.font_style);l(m,'FontSize','size',m.lang.fontSize,n.fontSize_sizes,n.fontSize_defaultLabel,n.fontSize_style);}});})();i.font_names='Arial/Arial, Helvetica, sans-serif;Comic Sans MS/Comic Sans MS, cursive;Courier New/Courier New, Courier, monospace;Georgia/Georgia, serif;Lucida Sans Unicode/Lucida Sans Unicode, Lucida Grande, sans-serif;Tahoma/Tahoma, Geneva, sans-serif;Times New Roman/Times New Roman, Times, serif;Trebuchet MS/Trebuchet MS, Helvetica, sans-serif;Verdana/Verdana, Geneva, sans-serif';
i.font_defaultLabel='';i.font_style={element:'span',styles:{'font-family':'#(family)'},overrides:[{element:'font',attributes:{face:null}}]};i.fontSize_sizes='8/8px;9/9px;10/10px;11/11px;12/12px;14/14px;16/16px;18/18px;20/20px;22/22px;24/24px;26/26px;28/28px;36/36px;48/48px;72/72px';i.fontSize_defaultLabel='';i.fontSize_style={element:'span',styles:{'font-size':'#(size)'},overrides:[{element:'font',attributes:{size:null}}]};j.add('format',{requires:['richcombo','styles'],init:function(l){var m=l.config,n=l.lang.format,o=m.format_tags.split(';'),p={};for(var q=0;q<o.length;q++){var r=o[q];p[r]=new a.style(m['format_'+r]);}l.ui.addRichCombo('Format',{label:n.label,title:n.panelTitle,voiceLabel:n.voiceLabel,className:'cke_format',multiSelect:false,panel:{css:[a.getUrl(l.skinPath+'editor.css')].concat(m.contentsCss),voiceLabel:n.panelVoiceLabel},init:function(){this.startGroup(n.panelTitle);for(var s in p){var t=n['tag_'+s];this.add(s,'<'+s+'>'+t+'</'+s+'>',t);}},onClick:function(s){l.focus();l.fire('saveSnapshot');p[s].apply(l.document);l.fire('saveSnapshot');},onRender:function(){l.on('selectionChange',function(s){var t=this.getValue(),u=s.data.path;for(var v in p)if(p[v].checkActive(u)){if(v!=t)this.setValue(v,l.lang.format['tag_'+v]);return;}this.setValue('');},this);}});}});i.format_tags='p;h1;h2;h3;h4;h5;h6;pre;address;div';i.format_p={element:'p'};i.format_div={element:'div'};i.format_pre={element:'pre'};i.format_address={element:'address'};i.format_h1={element:'h1'};i.format_h2={element:'h2'};i.format_h3={element:'h3'};i.format_h4={element:'h4'};i.format_h5={element:'h5'};i.format_h6={element:'h6'};j.add('forms',{init:function(l){var m=l.lang;l.addCss('form{border: 1px dotted #FF0000;padding: 2px;}');var n=function(p,q,r){l.addCommand(q,new a.dialogCommand(q));l.ui.addButton(p,{label:m.common[p.charAt(0).toLowerCase()+p.slice(1)],command:q});a.dialog.add(q,r);},o=this.path+'dialogs/';n('Form','form',o+'form.js');n('Checkbox','checkbox',o+'checkbox.js');n('Radio','radio',o+'radio.js');n('TextField','textfield',o+'textfield.js');n('Textarea','textarea',o+'textarea.js');n('Select','select',o+'select.js');n('Button','button',o+'button.js');n('ImageButton','imagebutton',j.getPath('image')+'dialogs/image.js');n('HiddenField','hiddenfield',o+'hiddenfield.js');if(l.addMenuItems)l.addMenuItems({form:{label:m.form.menu,command:'form',group:'form'},checkbox:{label:m.checkboxAndRadio.checkboxTitle,command:'checkbox',group:'checkbox'},radio:{label:m.checkboxAndRadio.radioTitle,command:'radio',group:'radio'},textfield:{label:m.textfield.title,command:'textfield',group:'textfield'},hiddenfield:{label:m.hidden.title,command:'hiddenfield',group:'hiddenfield'},imagebutton:{label:m.image.titleButton,command:'imagebutton',group:'imagebutton'},button:{label:m.button.title,command:'button',group:'button'},select:{label:m.select.title,command:'select',group:'select'},textarea:{label:m.textarea.title,command:'textarea',group:'textarea'}});
if(l.contextMenu){l.contextMenu.addListener(function(p){if(p&&p.hasAscendant('form'))return{form:2};});l.contextMenu.addListener(function(p){if(p){var q=p.getName();if(q=='select')return{select:2};if(q=='textarea')return{textarea:2};if(q=='input'){var r=p.getAttribute('type');if(r=='text'||r=='password')return{textfield:2};if(r=='button'||r=='submit'||r=='reset')return{button:2};if(r=='checkbox')return{checkbox:2};if(r=='radio')return{radio:2};if(r=='image')return{imagebutton:2};}if(q=='img'&&p.getAttribute('_cke_real_element_type')=='hiddenfield')return{hiddenfield:2};}});}},requires:['image']});if(c)h.prototype.hasAttribute=function(l){var o=this;var m=o.$.attributes.getNamedItem(l);if(o.getName()=='input')switch(l){case 'class':return o.$.className.length>0;case 'checked':return!!o.$.checked;case 'value':var n=o.getAttribute('type');if(n=='checkbox'||n=='radio')return o.$.value!='on';break;default:}return!!(m&&m.specified);};(function(){var l={exec:function(n){n.insertElement(n.document.createElement('hr'));}},m='horizontalrule';j.add(m,{init:function(n){n.addCommand(m,l);n.ui.addButton('HorizontalRule',{label:n.lang.horizontalrule,command:m});}});})();(function(){var l=/^[\t\r\n ]*(?:&nbsp;|\xa0)$/,m='{cke_protected}';function n(M){var N=M.children.length,O=M.children[N-1];while(O&&O.type==3&&!e.trim(O.value))O=M.children[--N];return O;};function o(M,N){var O=M.children,P=n(M);if(P){if((N||!c)&&(P.type==1&&P.name=='br'))O.pop();if(P.type==3&&l.test(P.value))O.pop();}};function p(M){var N=n(M);return!N||N.type==1&&N.name=='br';};function q(M){o(M,true);if(p(M))if(c)M.add(new a.htmlParser.text('\xa0'));else M.add(new a.htmlParser.element('br',{}));};function r(M){o(M);if(p(M))M.add(new a.htmlParser.text('\xa0'));};var s=f,t=e.extend({},s.$block,s.$listItem,s.$tableContent);for(var u in t)if(!('br' in s[u]))delete t[u];delete t.pre;var v={attributeNames:[[/^on/,'_cke_pa_on']]},w={elements:{}};for(u in t)w.elements[u]=q;var x={elementNames:[[/^cke:/,''],[/^\?xml:namespace$/,'']],attributeNames:[[/^_cke_(saved|pa)_/,''],[/^_cke.*/,'']],elements:{$:function(M){var N=M.attributes;if(N){var O=['name','href','src'],P;for(var Q=0;Q<O.length;Q++){P='_cke_saved_'+O[Q];P in N&&delete N[O[Q]];}}},embed:function(M){var N=M.parent;if(N&&N.name=='object'){var O=N.attributes.width,P=N.attributes.height;O&&(M.attributes.width=O);P&&(M.attributes.height=P);}},param:function(M){M.children=[];M.isEmpty=true;return M;},a:function(M){if(!(M.children.length||M.attributes.name||M.attributes._cke_saved_name))return false;
}},attributes:{'class':function(M,N){return e.ltrim(M.replace(/(?:^|\s+)cke_[^\s]*/g,''))||false;}},comment:function(M){if(M.substr(0,m.length)==m)return new a.htmlParser.cdata(decodeURIComponent(M.substr(m.length)));return M;}},y={elements:{}};for(u in t)y.elements[u]=r;if(c)x.attributes.style=function(M,N){return M.toLowerCase();};var z=/<(?:a|area|img|input).*?\s((?:href|src|name)\s*=\s*(?:(?:"[^"]*")|(?:'[^']*')|(?:[^ "'>]+)))/gi;function A(M){return M.replace(z,'$& _cke_saved_$1');};var B=/<(style)(?=[ >])[^>]*>[^<]*<\/\1>/gi,C=/<cke:encoded>([^<]*)<\/cke:encoded>/gi,D=/(<\/?)((?:object|embed|param).*?>)/gi,E=/<cke:param(.*?)\/>/gi;function F(M){return '<cke:encoded>'+encodeURIComponent(M)+'</cke:encoded>';};function G(M){return M.replace(B,F);};function H(M){return M.replace(D,'$1cke:$2');};function I(M){return M.replace(E,'<cke:param$1></cke:param>');};function J(M,N){return decodeURIComponent(N);};function K(M){return M.replace(C,J);};function L(M,N){var O=[],P=/<\!--\{cke_temp\}(\d*?)-->/g,Q=[/<!--[\s\S]*?-->/g,/<script[\s\S]*?<\/script>/gi,/<noscript[\s\S]*?<\/noscript>/gi].concat(N);for(var R=0;R<Q.length;R++)M=M.replace(Q[R],function(S){S=S.replace(P,function(T,U){return O[U];});return '<!--{cke_temp}'+(O.push(S)-1)+'-->';});M=M.replace(P,function(S,T){return '<!--'+m+encodeURIComponent(O[T]).replace(/--/g,'%2D%2D')+'-->';});return M;};j.add('htmldataprocessor',{requires:['htmlwriter'],init:function(M){var N=M.dataProcessor=new a.htmlDataProcessor(M);N.writer.forceSimpleAmpersand=M.config.forceSimpleAmpersand;N.dataFilter.addRules(v);N.dataFilter.addRules(w);N.htmlFilter.addRules(x);N.htmlFilter.addRules(y);}});a.htmlDataProcessor=function(M){var N=this;N.editor=M;N.writer=new a.htmlWriter();N.dataFilter=new a.htmlParser.filter();N.htmlFilter=new a.htmlParser.filter();};a.htmlDataProcessor.prototype={toHtml:function(M,N){M=L(M,this.editor.config.protectedSource);M=A(M);if(c)M=G(M);M=H(M);M=I(M);var O=document.createElement('div');O.innerHTML='a'+M;M=O.innerHTML.substr(1);if(c)M=K(M);var P=a.htmlParser.fragment.fromHtml(M,N),Q=new a.htmlParser.basicWriter();P.writeHtml(Q,this.dataFilter);return Q.getHtml(true);},toDataFormat:function(M,N){var O=this.writer,P=a.htmlParser.fragment.fromHtml(M,N);O.reset();P.writeHtml(O,this.htmlFilter);return O.getHtml(true);}};})();i.forceSimpleAmpersand=false;j.add('image',{init:function(l){var m='image';a.dialog.add(m,this.path+'dialogs/image.js');l.addCommand(m,new a.dialogCommand(m));l.ui.addButton('Image',{label:l.lang.common.image,command:m});
if(l.addMenuItems)l.addMenuItems({image:{label:l.lang.image.menu,command:'image',group:'image'}});if(l.contextMenu)l.contextMenu.addListener(function(n,o){if(!n||!n.is('img')||n.getAttribute('_cke_realelement'))return null;return{image:2};});}});i.image_removeLinkByEmptyURL=true;(function(){var l={ol:1,ul:1};function m(r,s){r.getCommand(this.name).setState(s);};function n(r){var C=this;var s=r.data.path.elements,t,u,v=r.editor;for(var w=0;w<s.length;w++){if(s[w].getName()=='li'){u=s[w];continue;}if(l[s[w].getName()]){t=s[w];break;}}if(t)if(C.name=='outdent')return m.call(C,v,2);else{while(u&&(u=u.getPrevious(d.walker.whitespaces(true))))if(u.getName&&u.getName()=='li')return m.call(C,v,2);return m.call(C,v,0);}if(!C.useIndentClasses&&C.name=='indent')return m.call(C,v,2);var x=r.data.path,y=x.block||x.blockLimit;if(!y)return m.call(C,v,0);if(C.useIndentClasses){var z=y.$.className.match(C.classNameRegex),A=0;if(z){z=z[1];A=C.indentClassMap[z];}if(C.name=='outdent'&&!A||C.name=='indent'&&A==v.config.indentClasses.length)return m.call(C,v,0);return m.call(C,v,2);}else{var B=parseInt(y.getStyle(C.indentCssProperty),10);if(isNaN(B))B=0;if(B<=0)return m.call(C,v,0);return m.call(C,v,2);}};function o(r,s,t){var u=s.startContainer,v=s.endContainer;while(u&&!u.getParent().equals(t))u=u.getParent();while(v&&!v.getParent().equals(t))v=v.getParent();if(!u||!v)return;var w=u,x=[],y=false;while(!y){if(w.equals(v))y=true;x.push(w);w=w.getNext();}if(x.length<1)return;var z=t.getParents(true);for(var A=0;A<z.length;A++)if(z[A].getName&&l[z[A].getName()]){t=z[A];break;}var B=this.name=='indent'?1:-1,C=x[0],D=x[x.length-1],E={},F=j.list.listToArray(t,E),G=F[D.getCustomData('listarray_index')].indent;for(A=C.getCustomData('listarray_index');A<=D.getCustomData('listarray_index');A++)F[A].indent+=B;for(A=D.getCustomData('listarray_index')+1;A<F.length&&F[A].indent>G;A++)F[A].indent+=B;var H=j.list.arrayToList(F,E,null,r.config.enterMode,0);if(this.name=='outdent'){var I;if((I=t.getParent())&&(I.is('li'))){var J=H.listNode.getChildren(),K=[],L=J.count(),M;for(A=L-1;A>=0;A--)if((M=J.getItem(A))&&(M.is&&M.is('li')))K.push(M);}}if(H)H.listNode.replace(t);if(K&&K.length)for(A=0;A<K.length;A++){var N=K[A],O=N;while((O=O.getNext())&&(O.is&&O.getName() in l))N.append(O);N.insertAfter(I);}h.clearAllMarkers(E);};function p(r,s){var A=this;var t=s.createIterator(),u=r.config.enterMode;t.enforceRealBlocks=true;t.enlargeBr=u!=2;var v;while(v=t.getNextParagraph())if(A.useIndentClasses){var w=v.$.className.match(A.classNameRegex),x=0;
if(w){w=w[1];x=A.indentClassMap[w];}if(A.name=='outdent')x--;else x++;x=Math.min(x,r.config.indentClasses.length);x=Math.max(x,0);var y=e.ltrim(v.$.className.replace(A.classNameRegex,''));if(x<1)v.$.className=y;else v.addClass(r.config.indentClasses[x-1]);}else{var z=parseInt(v.getStyle(A.indentCssProperty),10);if(isNaN(z))z=0;z+=(A.name=='indent'?1:-1)*(r.config.indentOffset);z=Math.max(z,0);z=Math.ceil(z/r.config.indentOffset)*r.config.indentOffset;v.setStyle(A.indentCssProperty,z?z+r.config.indentUnit:'');if(v.getAttribute('style')==='')v.removeAttribute('style');}};function q(r,s){var u=this;u.name=s;u.useIndentClasses=r.config.indentClasses&&r.config.indentClasses.length>0;if(u.useIndentClasses){u.classNameRegex=new RegExp('(?:^|\\s+)('+r.config.indentClasses.join('|')+')(?=$|\\s)');u.indentClassMap={};for(var t=0;t<r.config.indentClasses.length;t++)u.indentClassMap[r.config.indentClasses[t]]=t+1;}else u.indentCssProperty=r.config.contentsLangDirection=='ltr'?'margin-left':'margin-right';};q.prototype={exec:function(r){var s=r.getSelection(),t=s&&s.getRanges()[0];if(!s||!t)return;var u=s.createBookmarks(true),v=t.getCommonAncestor();while(v&&!(v.type==1&&l[v.getName()]))v=v.getParent();if(v)o.call(this,r,t,v);else p.call(this,r,t);r.focus();r.forceNextSelectionCheck();s.selectBookmarks(u);}};j.add('indent',{init:function(r){var s=new q(r,'indent'),t=new q(r,'outdent');r.addCommand('indent',s);r.addCommand('outdent',t);r.ui.addButton('Indent',{label:r.lang.indent,command:'indent'});r.ui.addButton('Outdent',{label:r.lang.outdent,command:'outdent'});r.on('selectionChange',e.bind(n,s));r.on('selectionChange',e.bind(n,t));},requires:['domiterator','list']});})();e.extend(i,{indentOffset:40,indentUnit:'px',indentClasses:null});(function(){var l=/(-moz-|-webkit-|start|auto)/i;function m(p,q){var r=q.block||q.blockLimit;if(!r||r.getName()=='body')return 2;var s=r.getComputedStyle('text-align').replace(l,'');if(!s&&this.isDefaultAlign||s==this.value)return 1;return 2;};function n(p){var q=p.editor.getCommand(this.name);q.state=m.call(this,p.editor,p.data.path);q.fire('state');};function o(p,q,r){var u=this;u.name=q;u.value=r;var s=p.config.contentsLangDirection;u.isDefaultAlign=r=='left'&&s=='ltr'||r=='right'&&s=='rtl';var t=p.config.justifyClasses;if(t){switch(r){case 'left':u.cssClassName=t[0];break;case 'center':u.cssClassName=t[1];break;case 'right':u.cssClassName=t[2];break;case 'justify':u.cssClassName=t[3];break;}u.cssClassRegex=new RegExp('(?:^|\\s+)(?:'+t.join('|')+')(?=$|\\s)');
}};o.prototype={exec:function(p){var y=this;var q=p.getSelection();if(!q)return;var r=q.createBookmarks(),s=q.getRanges(),t=y.cssClassName,u,v;for(var w=s.length-1;w>=0;w--){u=s[w].createIterator();while(v=u.getNextParagraph()){v.removeAttribute('align');if(t){var x=v.$.className=e.ltrim(v.$.className.replace(y.cssClassRegex,''));if(y.state==2&&!y.isDefaultAlign)v.addClass(t);else if(!x)v.removeAttribute('class');}else if(y.state==2&&!y.isDefaultAlign)v.setStyle('text-align',y.value);else v.removeStyle('text-align');}}p.focus();p.forceNextSelectionCheck();q.selectBookmarks(r);}};j.add('justify',{init:function(p){var q=new o(p,'justifyleft','left'),r=new o(p,'justifycenter','center'),s=new o(p,'justifyright','right'),t=new o(p,'justifyblock','justify');p.addCommand('justifyleft',q);p.addCommand('justifycenter',r);p.addCommand('justifyright',s);p.addCommand('justifyblock',t);p.ui.addButton('JustifyLeft',{label:p.lang.justify.left,command:'justifyleft'});p.ui.addButton('JustifyCenter',{label:p.lang.justify.center,command:'justifycenter'});p.ui.addButton('JustifyRight',{label:p.lang.justify.right,command:'justifyright'});p.ui.addButton('JustifyBlock',{label:p.lang.justify.block,command:'justifyblock'});p.on('selectionChange',e.bind(n,q));p.on('selectionChange',e.bind(n,s));p.on('selectionChange',e.bind(n,r));p.on('selectionChange',e.bind(n,t));},requires:['domiterator']});})();e.extend(i,{justifyClasses:null});j.add('keystrokes',{beforeInit:function(l){l.keystrokeHandler=new a.keystrokeHandler(l);l.specialKeys={};},init:function(l){var m=l.config.keystrokes,n=l.config.blockedKeystrokes,o=l.keystrokeHandler.keystrokes,p=l.keystrokeHandler.blockedKeystrokes;for(var q=0;q<m.length;q++)o[m[q][0]]=m[q][1];for(q=0;q<n.length;q++)p[n[q]]=1;}});a.keystrokeHandler=function(l){var m=this;if(l.keystrokeHandler)return l.keystrokeHandler;m.keystrokes={};m.blockedKeystrokes={};m._={editor:l};return m;};(function(){var l,m=function(o){o=o.data;var p=o.getKeystroke(),q=this.keystrokes[p],r=this._.editor;l=r.fire('key',{keyCode:p})===true;if(!l){if(q){var s={from:'keystrokeHandler'};l=r.execCommand(q,s)!==false;}if(!l){var t=r.specialKeys[p];l=t&&t(r)===true;if(!l)l=!!this.blockedKeystrokes[p];}}if(l)o.preventDefault(true);return!l;},n=function(o){if(l){l=false;o.data.preventDefault(true);}};a.keystrokeHandler.prototype={attach:function(o){o.on('keydown',m,this);if(b.opera||b.gecko&&b.mac)o.on('keypress',n,this);}};})();i.blockedKeystrokes=[1000+66,1000+73,1000+85];i.keystrokes=[[4000+121,'toolbarFocus'],[4000+122,'elementsPathFocus'],[2000+121,'contextMenu'],[1000+2000+121,'contextMenu'],[1000+90,'undo'],[1000+89,'redo'],[1000+2000+90,'redo'],[1000+76,'link'],[1000+66,'bold'],[1000+73,'italic'],[1000+85,'underline'],[4000+109,'toolbarCollapse']];
j.add('link',{init:function(l){l.addCommand('link',new a.dialogCommand('link'));l.addCommand('anchor',new a.dialogCommand('anchor'));l.addCommand('unlink',new a.unlinkCommand());l.ui.addButton('Link',{label:l.lang.link.toolbar,command:'link'});l.ui.addButton('Unlink',{label:l.lang.unlink,command:'unlink'});l.ui.addButton('Anchor',{label:l.lang.anchor.toolbar,command:'anchor'});a.dialog.add('link',this.path+'dialogs/link.js');a.dialog.add('anchor',this.path+'dialogs/anchor.js');l.addCss('img.cke_anchor{background-image: url('+a.getUrl(this.path+'images/anchor.gif')+');'+'background-position: center center;'+'background-repeat: no-repeat;'+'border: 1px solid #a9a9a9;'+'width: 18px;'+'height: 18px;'+'}\n'+'a.cke_anchor'+'{'+'background-image: url('+a.getUrl(this.path+'images/anchor.gif')+');'+'background-position: 0 center;'+'background-repeat: no-repeat;'+'border: 1px solid #a9a9a9;'+'padding-left: 18px;'+'}');l.on('selectionChange',function(m){var n=l.getCommand('unlink'),o=m.data.path.lastElement.getAscendant('a',true);if(o&&o.getName()=='a'&&o.getAttribute('href'))n.setState(2);else n.setState(0);});if(l.addMenuItems)l.addMenuItems({anchor:{label:l.lang.anchor.menu,command:'anchor',group:'anchor'},link:{label:l.lang.link.menu,command:'link',group:'link',order:1},unlink:{label:l.lang.unlink,command:'unlink',group:'link',order:5}});if(l.contextMenu)l.contextMenu.addListener(function(m,n){if(!m)return null;var o=m.is('img')&&m.getAttribute('_cke_real_element_type')=='anchor';if(!o){if(!(m=m.getAscendant('a',true)))return null;o=m.getAttribute('name')&&!m.getAttribute('href');}return o?{anchor:2}:{link:2,unlink:2};});},afterInit:function(l){var m=l.dataProcessor,n=m&&m.dataFilter;if(n)n.addRules({elements:{a:function(o){var p=o.attributes;if(p.name&&!p.href)return l.createFakeParserElement(o,'cke_anchor','anchor');}}});},requires:['fakeobjects']});a.unlinkCommand=function(){};a.unlinkCommand.prototype={exec:function(l){var m=l.getSelection(),n=m.createBookmarks(),o=m.getRanges(),p,q;for(var r=0;r<o.length;r++){p=o[r].getCommonAncestor(true);q=p.getAscendant('a',true);if(!q)continue;o[r].selectNodeContents(q);}m.selectRanges(o);l.document.$.execCommand('unlink',false,null);m.selectBookmarks(n);}};e.extend(i,{linkShowAdvancedTab:true,linkShowTargetTab:true});(function(){var l={ol:1,ul:1},m=/^[\n\r\t ]*$/;j.list={listToArray:function(t,u,v,w,x){if(!l[t.getName()])return[];if(!w)w=0;if(!v)v=[];for(var y=0,z=t.getChildCount();y<z;y++){var A=t.getChild(y);if(A.$.nodeName.toLowerCase()!='li')continue;
var B={parent:t,indent:w,contents:[]};if(!x){B.grandparent=t.getParent();if(B.grandparent&&B.grandparent.$.nodeName.toLowerCase()=='li')B.grandparent=B.grandparent.getParent();}else B.grandparent=x;if(u)h.setMarker(u,A,'listarray_index',v.length);v.push(B);for(var C=0,D=A.getChildCount();C<D;C++){var E=A.getChild(C);if(E.type==1&&l[E.getName()])j.list.listToArray(E,u,v,w+1,B.grandparent);else B.contents.push(E);}}return v;},arrayToList:function(t,u,v,w){if(!v)v=0;if(!t||t.length<v+1)return null;var x=t[v].parent.getDocument(),y=new d.documentFragment(x),z=null,A=v,B=Math.max(t[v].indent,0),C=null,D=w==1?'p':'div';for(;;){var E=t[A];if(E.indent==B){if(!z||t[A].parent.getName()!=z.getName()){z=t[A].parent.clone(false,true);y.append(z);}C=z.append(x.createElement('li'));for(var F=0;F<E.contents.length;F++)C.append(E.contents[F].clone(true,true));A++;}else if(E.indent==Math.max(B,0)+1){var G=j.list.arrayToList(t,null,A,w);C.append(G.listNode);A=G.nextIndex;}else if(E.indent==-1&&!v&&E.grandparent){C;if(l[E.grandparent.getName()])C=x.createElement('li');else if(w!=2&&E.grandparent.getName()!='td')C=x.createElement(D);else C=new d.documentFragment(x);for(F=0;F<E.contents.length;F++)C.append(E.contents[F].clone(true,true));if(C.type==11&&A!=t.length-1){if(C.getLast()&&C.getLast().type==1&&C.getLast().getAttribute('type')=='_moz')C.getLast().remove();C.appendBogus();}if(C.type==1&&C.getName()==D&&C.$.firstChild){C.trim();var H=C.getFirst();if(H.type==1&&H.isBlockBoundary()){var I=new d.documentFragment(x);C.moveChildren(I);C=I;}}var J=C.$.nodeName.toLowerCase();if(!c&&(J=='div'||J=='p'))C.appendBogus();y.append(C);z=null;A++;}else return null;if(t.length<=A||Math.max(t[A].indent,0)<B)break;}if(u){var K=y.getFirst();while(K){if(K.type==1)h.clearMarkers(u,K);K=K.getNextSourceNode();}}return{listNode:y,nextIndex:A};}};function n(t,u){t.getCommand(this.name).setState(u);};function o(t){var u=t.data.path,v=u.blockLimit,w=u.elements,x;for(var y=0;y<w.length&&(x=w[y])&&(!x.equals(v));y++)if(l[w[y].getName()])return n.call(this,t.editor,this.type==w[y].getName()?1:2);return n.call(this,t.editor,2);};function p(t,u,v,w){var x=j.list.listToArray(u.root,v),y=[];for(var z=0;z<u.contents.length;z++){var A=u.contents[z];A=A.getAscendant('li',true);if(!A||A.getCustomData('list_item_processed'))continue;y.push(A);h.setMarker(v,A,'list_item_processed',true);}var B=u.root.getDocument().createElement(this.type);for(z=0;z<y.length;z++){var C=y[z].getCustomData('listarray_index');x[C].parent=B;
}var D=j.list.arrayToList(x,v,null,t.config.enterMode),E,F=D.listNode.getChildCount();for(z=0;z<F&&(E=D.listNode.getChild(z));z++)if(E.getName()==this.type)w.push(E);D.listNode.replace(u.root);};function q(t,u,v){var w=u.contents,x=u.root.getDocument(),y=[];if(w.length==1&&w[0].equals(u.root)){var z=x.createElement('div');w[0].moveChildren&&w[0].moveChildren(z);w[0].append(z);w[0]=z;}var A=u.contents[0].getParent();for(var B=0;B<w.length;B++)A=A.getCommonAncestor(w[B].getParent());for(B=0;B<w.length;B++){var C=w[B],D;while(D=C.getParent()){if(D.equals(A)){y.push(C);break;}C=D;}}if(y.length<1)return;var E=y[y.length-1].getNext(),F=x.createElement(this.type);v.push(F);while(y.length){var G=y.shift(),H=x.createElement('li');G.moveChildren(H);G.remove();H.appendTo(F);if(!c)H.appendBogus();}if(E)F.insertBefore(E);else F.appendTo(A);};function r(t,u,v){var w=j.list.listToArray(u.root,v),x=[];for(var y=0;y<u.contents.length;y++){var z=u.contents[y];z=z.getAscendant('li',true);if(!z||z.getCustomData('list_item_processed'))continue;x.push(z);h.setMarker(v,z,'list_item_processed',true);}var A=null;for(y=0;y<x.length;y++){var B=x[y].getCustomData('listarray_index');w[B].indent=-1;A=B;}for(y=A+1;y<w.length;y++)if(w[y].indent>w[y-1].indent+1){var C=w[y-1].indent+1-w[y].indent,D=w[y].indent;while(w[y]&&w[y].indent>=D){w[y].indent+=C;y++;}y--;}var E=j.list.arrayToList(w,v,null,t.config.enterMode),F=E.listNode,G,H;function I(K){if((G=F[K?'getFirst':'getLast']())&&(!(G.is&&G.isBlockBoundary())&&(H=u.root[K?'getPrevious':'getNext'](d.walker.whitespaces(true)))&&(!(H.is&&H.isBlockBoundary({br:1})))))t.document.createElement('br')[K?'insertBefore':'insertAfter'](G);};I(true);I();var J=u.root.getParent();F.replace(u.root);};function s(t,u){this.name=t;this.type=u;};s.prototype={exec:function(t){t.focus();var u=t.document,v=t.getSelection(),w=v&&v.getRanges();if(!w||w.length<1)return;if(this.state==2){var x=u.getBody();x.trim();if(!x.getFirst()){var y=u.createElement(t.config.enterMode==1?'p':t.config.enterMode==3?'div':'br');y.appendTo(x);w=[new d.range(u)];if(y.is('br')){w[0].setStartBefore(y);w[0].setEndAfter(y);}else w[0].selectNodeContents(y);v.selectRanges(w);}else{var z=w.length==1&&w[0],A=z&&z.getEnclosedNode();if(A&&A.is&&this.type==A.getName())n.call(this,t,1);}}var B=v.createBookmarks(true),C=[],D={};while(w.length>0){z=w.shift();var E=z.getBoundaryNodes(),F=E.startNode,G=E.endNode;if(F.type==1&&F.getName()=='td')z.setStartAt(E.startNode,1);if(G.type==1&&G.getName()=='td')z.setEndAt(E.endNode,2);
var H=z.createIterator(),I;H.forceBrBreak=this.state==2;while(I=H.getNextParagraph()){var J=new d.elementPath(I),K=null,L=false,M=J.blockLimit,N;for(var O=0;O<J.elements.length&&(N=J.elements[O])&&(!N.equals(M));O++)if(l[N.getName()]){M.removeCustomData('list_group_object');var P=N.getCustomData('list_group_object');if(P)P.contents.push(I);else{P={root:N,contents:[I]};C.push(P);h.setMarker(D,N,'list_group_object',P);}L=true;break;}if(L)continue;var Q=M;if(Q.getCustomData('list_group_object'))Q.getCustomData('list_group_object').contents.push(I);else{P={root:Q,contents:[I]};h.setMarker(D,Q,'list_group_object',P);C.push(P);}}}var R=[];while(C.length>0){P=C.shift();if(this.state==2){if(l[P.root.getName()])p.call(this,t,P,D,R);else q.call(this,t,P,R);}else if(this.state==1&&l[P.root.getName()])r.call(this,t,P,D);}for(O=0;O<R.length;O++){K=R[O];var S,T=this;(S=function(U){var V=K[U?'getPrevious':'getNext'](d.walker.whitespaces(true));if(V&&V.getName&&V.getName()==T.type){V.remove();V.moveChildren(K,U?true:false);}})();S(true);}h.clearAllMarkers(D);v.selectBookmarks(B);t.focus();}};j.add('list',{init:function(t){var u=new s('numberedlist','ol'),v=new s('bulletedlist','ul');t.addCommand('numberedlist',u);t.addCommand('bulletedlist',v);t.ui.addButton('NumberedList',{label:t.lang.numberedlist,command:'numberedlist'});t.ui.addButton('BulletedList',{label:t.lang.bulletedlist,command:'bulletedlist'});t.on('selectionChange',e.bind(o,u));t.on('selectionChange',e.bind(o,v));},requires:['domiterator']});})();(function(){function l(q){if(!q||q.type!=1||q.getName()!='form')return[];var r=[],s=['style','className'];for(var t=0;t<s.length;t++){var u=s[t],v=q.$.elements.namedItem(u);if(v){var w=new h(v);r.push([w,w.nextSibling]);w.remove();}}return r;};function m(q,r){if(!q||q.type!=1||q.getName()!='form')return;if(r.length>0)for(var s=r.length-1;s>=0;s--){var t=r[s][0],u=r[s][1];if(u)t.insertBefore(u);else t.appendTo(q);}};function n(q,r){var s=l(q),t={},u=q.$;if(!r){t['class']=u.className||'';u.className='';}t.inline=u.style.cssText||'';if(!r)u.style.cssText='position: static; overflow: visible';m(s);return t;};function o(q,r){var s=l(q),t=q.$;if('class' in r)t.className=r['class'];if('inline' in r)t.style.cssText=r.inline;m(s);};function p(q,r){return function(){var s=q.getViewPaneSize();r.resize(s.width,s.height,null,true);};};j.add('maximize',{init:function(q){var r=q.lang,s=a.document,t=s.getWindow(),u,v,w,x=p(t,q),y=2;q.addCommand('maximize',{modes:{wysiwyg:1,source:1},editorFocus:false,exec:function(){var M=this;
var z=q.container.getChild([0,0]),A=q.getThemeSpace('contents');if(q.mode=='wysiwyg'){var B=q.getSelection();u=B&&B.getRanges();v=t.getScrollPosition();}else{var C=q.textarea.$;u=!c&&[C.selectionStart,C.selectionEnd];v=[C.scrollLeft,C.scrollTop];}if(M.state==2){t.on('resize',x);w=t.getScrollPosition();var D=q.container;while(D=D.getParent()){D.setCustomData('maximize_saved_styles',n(D));D.setStyle('z-index',q.config.baseFloatZIndex-1);}A.setCustomData('maximize_saved_styles',n(A,true));z.setCustomData('maximize_saved_styles',n(z,true));if(c)s.$.documentElement.style.overflow=s.getBody().$.style.overflow='hidden';else s.getBody().setStyles({overflow:'hidden',width:'0px',height:'0px'});t.$.scrollTo(0,0);var E=t.getViewPaneSize();z.setStyle('position','absolute');z.$.offsetLeft;z.setStyles({'z-index':q.config.baseFloatZIndex-1,left:'0px',top:'0px'});q.resize(E.width,E.height,null,true);var F=z.getDocumentPosition();z.setStyles({left:-1*F.x+'px',top:-1*F.y+'px'});z.addClass('cke_maximized');}else if(M.state==1){t.removeListener('resize',x);var G=[A,z];for(var H=0;H<G.length;H++){o(G[H],G[H].getCustomData('maximize_saved_styles'));G[H].removeCustomData('maximize_saved_styles');}D=q.container;while(D=D.getParent()){o(D,D.getCustomData('maximize_saved_styles'));D.removeCustomData('maximize_saved_styles');}t.$.scrollTo(w.x,w.y);z.removeClass('cke_maximized');q.fire('resize');}M.toggleState();var I=M.uiItems[0],J=M.state==2?r.maximize:r.minimize,K=q.element.getDocument().getById(I._.id);K.getChild(1).setHtml(J);K.setAttribute('title',J);K.setAttribute('href','javascript:void("'+J+'");');if(q.mode=='wysiwyg'){if(u){q.getSelection().selectRanges(u);var L=q.getSelection().getStartElement();L&&L.scrollIntoView(true);}else t.$.scrollTo(v.x,v.y);}else{if(u){C.selectionStart=u[0];C.selectionEnd=u[1];}C.scrollLeft=v[0];C.scrollTop=v[1];}u=v=null;y=M.state;},canUndo:false});q.ui.addButton('Maximize',{label:r.maximize,command:'maximize'});q.on('mode',function(){q.getCommand('maximize').setState(y);},null,null,100);}});})();j.add('newpage',{init:function(l){l.addCommand('newpage',{modes:{wysiwyg:1,source:1},exec:function(m){var n=this;m.setData(m.config.newpage_html,function(){m.fire('afterCommandExec',{name:n.name,command:n});});m.focus();},async:true});l.ui.addButton('NewPage',{label:l.lang.newPage,command:'newpage'});}});i.newpage_html='';j.add('pagebreak',{init:function(l){l.addCommand('pagebreak',j.pagebreakCmd);l.ui.addButton('PageBreak',{label:l.lang.pagebreak,command:'pagebreak'});
l.addCss('img.cke_pagebreak{background-image: url('+a.getUrl(this.path+'images/pagebreak.gif')+');'+'background-position: center center;'+'background-repeat: no-repeat;'+'clear: both;'+'display: block;'+'float: none;'+'width: 100%;'+'border-top: #999999 1px dotted;'+'border-bottom: #999999 1px dotted;'+'height: 5px;'+'}');},afterInit:function(l){var m=l.dataProcessor,n=m&&m.dataFilter;if(n)n.addRules({elements:{div:function(o){var p=o.attributes.style,q=p&&o.children.length==1&&o.children[0],r=q&&q.name=='span'&&q.attributes.style;if(r&&/page-break-after\s*:\s*always/i.test(p)&&/display\s*:\s*none/i.test(r))return l.createFakeParserElement(o,'cke_pagebreak','div');}}});},requires:['fakeobjects']});j.pagebreakCmd={exec:function(l){var m=h.createFromHtml('<div style="page-break-after: always;"><span style="display: none;">&nbsp;</span></div>');m=l.createFakeElement(m,'cke_pagebreak','div');var n=l.getSelection().getRanges();for(var o,p=0;p<n.length;p++){o=n[p];if(p>0)m=m.clone(true);o.splitBlock('p');o.insertNode(m);}}};j.add('pastefromword',{init:function(l){l.addCommand('pastefromword',new a.dialogCommand('pastefromword'));l.ui.addButton('PasteFromWord',{label:l.lang.pastefromword.toolbar,command:'pastefromword'});a.dialog.add('pastefromword',this.path+'dialogs/pastefromword.js');}});i.pasteFromWordIgnoreFontFace=true;i.pasteFromWordRemoveStyle=false;i.pasteFromWordKeepsStructure=false;(function(){var l={exec:function(n){if(a.getClipboardData()===false||!window.clipboardData){n.openDialog('pastetext');return;}n.insertText(window.clipboardData.getData('Text'));}};j.add('pastetext',{init:function(n){var o='pastetext',p=n.addCommand(o,l);n.ui.addButton('PasteText',{label:n.lang.pasteText.button,command:o});a.dialog.add(o,a.getUrl(this.path+'dialogs/pastetext.js'));if(n.config.forcePasteAsPlainText)n.on('beforePaste',function(q){if(n.mode=='wysiwyg'){setTimeout(function(){p.exec();},0);q.cancel();}},null,null,20);},requires:['clipboard']});var m;a.getClipboardData=function(){if(!c)return false;var n=a.document,o=n.getBody();if(!m){m=n.createElement('div',{attributes:{id:'cke_hiddenDiv'},styles:{position:'absolute',visibility:'hidden',overflow:'hidden',width:'1px',height:'1px'}});m.setHtml('');m.appendTo(o);}var p=false,q=function(){p=true;};o.on('paste',q);var r=o.$.createTextRange();r.moveToElementText(m.$);r.execCommand('Paste');var s=m.getHtml();m.setHtml('');o.removeListener('paste',q);return p&&s;};})();a.editor.prototype.insertText=function(l){l=e.htmlEncode(l);
l=l.replace(/(?:\r\n)|\n|\r/g,'<br>');this.insertHtml(l);};i.forcePasteAsPlainText=false;j.add('popup');e.extend(a.editor.prototype,{popup:function(l,m,n){m=m||'80%';n=n||'70%';if(typeof m=='string'&&m.length>1&&m.substr(m.length-1,1)=='%')m=parseInt(window.screen.width*parseInt(m,10)/100,10);if(typeof n=='string'&&n.length>1&&n.substr(n.length-1,1)=='%')n=parseInt(window.screen.height*parseInt(n,10)/100,10);if(m<640)m=640;if(n<420)n=420;var o=parseInt((window.screen.height-n)/(2),10),p=parseInt((window.screen.width-m)/(2),10),q='location=no,menubar=no,toolbar=no,dependent=yes,minimizable=no,modal=yes,alwaysRaised=yes,resizable=yes,width='+m+',height='+n+',top='+o+',left='+p,r=window.open('',null,q,true);if(!r)return false;try{r.moveTo(p,o);r.resizeTo(m,n);r.focus();r.location.href=l;}catch(s){r=window.open(l,null,q,true);}return true;}});(function(){var l={modes:{wysiwyg:1,source:1},canUndo:false,exec:function(n){var o,p=b.isCustomDomain();if(n.config.fullPage)o=n.getData();else{var q='<body ',r=a.document.getBody(),s=n.config.baseHref.length>0?'<base href="'+n.config.baseHref+'" _cktemp="true"></base>':'';if(r.getAttribute('id'))q+='id="'+r.getAttribute('id')+'" ';if(r.getAttribute('class'))q+='class="'+r.getAttribute('class')+'" ';q+='>';o=n.config.docType+'<html dir="'+n.config.contentsLangDirection+'">'+'<head>'+s+'<title>'+n.lang.preview+'</title>'+'<link type="text/css" rel="stylesheet" href="'+[].concat(n.config.contentsCss).join('"><link type="text/css" rel="stylesheet" href="')+'">'+'</head>'+q+n.getData()+'</body></html>';}var t=640,u=420,v=80;try{var w=window.screen;t=Math.round(w.width*0.8);u=Math.round(w.height*0.7);v=Math.round(w.width*0.1);}catch(z){}var x='';if(p){window._cke_htmlToLoad=o;x='javascript:void( (function(){document.open();document.domain="'+document.domain+'";'+'document.write( window.opener._cke_htmlToLoad );'+'document.close();'+'window.opener._cke_htmlToLoad = null;'+'})() )';}var y=window.open(x,null,'toolbar=yes,location=no,status=yes,menubar=yes,scrollbars=yes,resizable=yes,width='+t+',height='+u+',left='+v);if(!p){y.document.write(o);y.document.close();}}},m='preview';j.add(m,{init:function(n){n.addCommand(m,l);n.ui.addButton('Preview',{label:n.lang.preview,command:m});}});})();j.add('print',{init:function(l){var m='print',n=l.addCommand(m,j.print);l.ui.addButton('Print',{label:l.lang.print,command:m});}});j.print={exec:function(l){if(b.opera)return;else if(b.gecko)l.window.$.print();else l.document.$.execCommand('Print');
},canUndo:false,modes:{wysiwyg:!b.opera}};j.add('removeformat',{requires:['selection'],init:function(l){l.addCommand('removeFormat',j.removeformat.commands.removeformat);l.ui.addButton('RemoveFormat',{label:l.lang.removeFormat,command:'removeFormat'});}});j.removeformat={commands:{removeformat:{exec:function(l){var m=l._.removeFormatRegex||(l._.removeFormatRegex=new RegExp('^(?:'+l.config.removeFormatTags.replace(/,/g,'|')+')$','i')),n=l._.removeAttributes||(l._.removeAttributes=l.config.removeFormatAttributes.split(',')),o=l.getSelection().getRanges();for(var p=0,q;q=o[p];p++){if(q.collapsed)continue;q.enlarge(1);var r=q.createBookmark(),s=r.startNode,t=r.endNode,u=function(x){var y=new d.elementPath(x),z=y.elements;for(var A=1,B;B=z[A];A++){if(B.equals(y.block)||B.equals(y.blockLimit))break;if(m.test(B.getName()))x.breakParent(B);}};u(s);u(t);var v=s.getNextSourceNode(true,1);while(v){if(v.equals(t))break;var w=v.getNextSourceNode(false,1);if(v.getName()!='img'||!v.getAttribute('_cke_protected_html'))if(m.test(v.getName()))v.remove(true);else v.removeAttributes(n);v=w;}q.moveToBookmark(r);}l.getSelection().selectRanges(o);}}}};i.removeFormatTags='b,big,code,del,dfn,em,font,i,ins,kbd,q,samp,small,span,strike,strong,sub,sup,tt,u,var';i.removeFormatAttributes='class,style,lang,width,height,align,hspace,valign';j.add('resize',{init:function(l){var m=l.config;if(m.resize_enabled){var n=null,o,p;function q(t){var u=t.data.$.screenX-o.x,v=t.data.$.screenY-o.y,w=p.width+u*(l.lang.dir=='rtl'?-1:1),x=p.height+v;l.resize(Math.max(m.resize_minWidth,Math.min(w,m.resize_maxWidth)),Math.max(m.resize_minHeight,Math.min(x,m.resize_maxHeight)));};function r(t){a.document.removeListener('mousemove',q);a.document.removeListener('mouseup',r);if(l.document){l.document.removeListener('mousemove',q);l.document.removeListener('mouseup',r);}};var s=e.addFunction(function(t){if(!n)n=l.getResizable();p={width:n.$.offsetWidth||0,height:n.$.offsetHeight||0};o={x:t.screenX,y:t.screenY};a.document.on('mousemove',q);a.document.on('mouseup',r);if(l.document){l.document.on('mousemove',q);l.document.on('mouseup',r);}});l.on('themeSpace',function(t){if(t.data.space=='bottom')t.data.html+='<div class="cke_resizer" title="'+e.htmlEncode(l.lang.resize)+'"'+' onmousedown="CKEDITOR.tools.callFunction('+s+', event)"'+'></div>';},l,null,100);}}});i.resize_minWidth=750;i.resize_minHeight=250;i.resize_maxWidth=3000;i.resize_maxHeight=3000;i.resize_enabled=true;(function(){var l={modes:{wysiwyg:1,source:1},exec:function(n){var o=n.element.$.form;
if(o)try{o.submit();}catch(p){if(o.submit.click)o.submit.click();}}},m='save';j.add(m,{init:function(n){var o=n.addCommand(m,l);o.modes={wysiwyg:!!n.element.$.form};n.ui.addButton('Save',{label:n.lang.save,command:m});}});})();(function(){var l='scaytcheck',m='',n=function(){var r=this,s=function(){var v={};v.srcNodeRef=r.document.getWindow().$.frameElement;v.assocApp='CKEDITOR.'+a.version+'@'+a.revision;v.customerid=r.config.scayt_customerid||'1:11111111111111111111111111111111111111';v.customDictionaryName=r.config.scayt_customDictionaryName;v.userDictionaryName=r.config.scayt_userDictionaryName;v.defLang=r.scayt_defLang;if(a._scaytParams)for(var w in a._scaytParams)v[w]=a._scaytParams[w];var x=new window.scayt(v),y=o.instances[r.name];if(y){x.sLang=y.sLang;x.option(y.option());x.paused=y.paused;}o.instances[r.name]=x;try{x.setDisabled(x.paused===false);}catch(z){}r.fire('showScaytState');};r.on('contentDom',s);r.on('contentDomUnload',function(){var v=a.document.getElementsByTag('script'),w=/^dojoIoScript(\d+)$/i,x=/^https?:\/\/svc\.spellchecker\.net\/spellcheck\/script\/ssrv\.cgi/i;for(var y=0;y<v.count();y++){var z=v.getItem(y),A=z.getId(),B=z.getAttribute('src');if(A&&B&&A.match(w)&&B.match(x))z.remove();}});r.on('beforeCommandExec',function(v){if((v.data.name=='source'||v.data.name=='newpage')&&(r.mode=='wysiwyg')){var w=o.getScayt(r);if(w){w.paused=!w.disabled;w.destroy();delete o.instances[r.name];}}});r.on('afterSetData',function(){if(o.isScaytEnabled(r))o.getScayt(r).refresh();});r.on('insertElement',function(){var v=o.getScayt(r);if(o.isScaytEnabled(r)){if(c)r.getSelection().unlock(true);try{v.refresh();}catch(w){}}},this,null,50);r.on('scaytDialog',function(v){v.data.djConfig=window.djConfig;v.data.scayt_control=o.getScayt(r);v.data.tab=m;v.data.scayt=window.scayt;});var t=r.dataProcessor,u=t&&t.htmlFilter;if(u)u.addRules({elements:{span:function(v){if(v.attributes.scayt_word&&v.attributes.scaytid){delete v.name;return v;}}}});if(r.document)s();};j.scayt={engineLoaded:false,instances:{},getScayt:function(r){return this.instances[r.name];},isScaytReady:function(r){return this.engineLoaded===true&&'undefined'!==typeof window.scayt&&this.getScayt(r);},isScaytEnabled:function(r){var s=this.getScayt(r);return s?s.disabled===false:false;},loadEngine:function(r){if(this.engineLoaded===true)return n.apply(r);else if(this.engineLoaded==-1)return a.on('scaytReady',function(){n.apply(r);});a.on('scaytReady',n,r);a.on('scaytReady',function(){this.engineLoaded=true;
},this,null,0);this.engineLoaded=-1;var s=document.location.protocol;s=s.search(/https?:/)!=-1?s:'http:';var t='svc.spellchecker.net/spellcheck/lf/scayt/scayt1.js',u=r.config.scayt_srcUrl||s+'//'+t,v=o.parseUrl(u).path+'/';a._djScaytConfig={baseUrl:v,addOnLoad:[function(){a.fireOnce('scaytReady');}],isDebug:false};a.document.getHead().append(a.document.createElement('script',{attributes:{type:'text/javascript',src:u}}));return null;},parseUrl:function(r){var s;if(r.match&&(s=r.match(/(.*)[\/\\](.*?\.\w+)$/)))return{path:s[1],file:s[2]};else return r;}};var o=j.scayt,p=function(r,s,t,u,v,w,x){r.addCommand(u,v);r.addMenuItem(u,{label:t,command:u,group:w,order:x});},q={preserveState:true,editorFocus:false,exec:function(r){if(o.isScaytReady(r)){var s=o.isScaytEnabled(r);this.setState(s?2:1);var t=o.getScayt(r);t.setDisabled(s);}else if(!r.config.scayt_autoStartup&&o.engineLoaded>=0){this.setState(0);r.on('showScaytState',function(){this.removeListener();this.setState(o.isScaytEnabled(r)?1:2);},this);o.loadEngine(r);}}};j.add('scayt',{requires:['menubutton'],beforeInit:function(r){r.config.menu_groups='scayt_suggest,scayt_moresuggest,scayt_control,'+r.config.menu_groups;},init:function(r){var s={},t={},u=r.addCommand(l,q);a.dialog.add(l,a.getUrl(this.path+'dialogs/options.js'));var v='scaytButton';r.addMenuGroup(v);r.addMenuItems({scaytToggle:{label:r.lang.scayt.enable,command:l,group:v},scaytOptions:{label:r.lang.scayt.options,group:v,onClick:function(){m='options';r.openDialog(l);}},scaytLangs:{label:r.lang.scayt.langs,group:v,onClick:function(){m='langs';r.openDialog(l);}},scaytAbout:{label:r.lang.scayt.about,group:v,onClick:function(){m='about';r.openDialog(l);}}});r.ui.add('Scayt',5,{label:r.lang.scayt.title,title:r.lang.scayt.title,className:'cke_button_scayt',onRender:function(){u.on('state',function(){this.setState(u.state);},this);},onMenu:function(){var x=o.isScaytEnabled(r);r.getMenuItem('scaytToggle').label=r.lang.scayt[x?'disable':'enable'];return{scaytToggle:2,scaytOptions:x?2:0,scaytLangs:x?2:0,scaytAbout:x?2:0};}});if(r.contextMenu&&r.addMenuItems)r.contextMenu.addListener(function(x){if(!(o.isScaytEnabled(r)&&x))return null;var y=o.getScayt(r),z=y.getWord(x.$);if(!z)return null;var A=y.getLang(),B={},C=window.scayt.getSuggestion(z,A);if(!C||!C.length)return null;for(i in s){delete r._.menuItems[i];delete r._.commands[i];}for(i in t){delete r._.menuItems[i];delete r._.commands[i];}s={};t={};var D=false;for(var E=0,F=C.length;E<F;E+=1){var G='scayt_suggestion_'+C[E].replace(' ','_'),H=(function(L,M){return{exec:function(){y.replace(L,M);
}};})(x.$,C[E]);if(E<r.config.scayt_maxSuggestions){p(r,'button_'+G,C[E],G,H,'scayt_suggest',E+1);B[G]=2;t[G]=2;}else{p(r,'button_'+G,C[E],G,H,'scayt_moresuggest',E+1);s[G]=2;D=true;}}if(D)r.addMenuItem('scayt_moresuggest',{label:r.lang.scayt.moreSuggestions,group:'scayt_moresuggest',order:10,getItems:function(){return s;}});var I={exec:function(){y.ignore(x.$);}},J={exec:function(){y.ignoreAll(x.$);}},K={exec:function(){window.scayt.addWordToUserDictionary(x.$);}};p(r,'ignore',r.lang.scayt.ignore,'scayt_ignore',I,'scayt_control',1);p(r,'ignore_all',r.lang.scayt.ignoreAll,'scayt_ignore_all',J,'scayt_control',2);p(r,'add_word',r.lang.scayt.addWord,'scayt_add_word',K,'scayt_control',3);t.scayt_moresuggest=2;t.scayt_ignore=2;t.scayt_ignore_all=2;t.scayt_add_word=2;if(y.fireOnContextMenu)y.fireOnContextMenu(r);return t;});if(r.config.scayt_autoStartup){var w=function(){r.removeListener('showScaytState',w);u.setState(o.isScaytEnabled(r)?1:2);};r.on('showScaytState',w);o.loadEngine(r);}}});})();i.scayt_maxSuggestions=5;i.scayt_autoStartup=false;j.add('smiley',{requires:['dialog'],init:function(l){l.addCommand('smiley',new a.dialogCommand('smiley'));l.ui.addButton('Smiley',{label:l.lang.smiley.toolbar,command:'smiley'});a.dialog.add('smiley',this.path+'dialogs/smiley.js');}});i.smiley_path=a.basePath+'plugins/smiley/images/';i.smiley_images=['regular_smile.gif','sad_smile.gif','wink_smile.gif','teeth_smile.gif','confused_smile.gif','tounge_smile.gif','embaressed_smile.gif','omg_smile.gif','whatchutalkingabout_smile.gif','angry_smile.gif','angel_smile.gif','shades_smile.gif','devil_smile.gif','cry_smile.gif','lightbulb.gif','thumbs_down.gif','thumbs_up.gif','heart.gif','broken_heart.gif','kiss.gif','envelope.gif'];i.smiley_descriptions=[':)',':(',';)',':D',':/',':P','','','','','','','',';(','','','','','',':kiss',''];(function(){var l='.%2 p,.%2 div,.%2 pre,.%2 address,.%2 blockquote,.%2 h1,.%2 h2,.%2 h3,.%2 h4,.%2 h5,.%2 h6{background-repeat: no-repeat;border: 1px dotted gray;padding-top: 8px;padding-left: 8px;}.%2 p{%1p.png);}.%2 div{%1div.png);}.%2 pre{%1pre.png);}.%2 address{%1address.png);}.%2 blockquote{%1blockquote.png);}.%2 h1{%1h1.png);}.%2 h2{%1h2.png);}.%2 h3{%1h3.png);}.%2 h4{%1h4.png);}.%2 h5{%1h5.png);}.%2 h6{%1h6.png);}',m=/%1/g,n=/%2/g,o={preserveState:true,editorFocus:false,exec:function(p){this.toggleState();this.refresh(p);},refresh:function(p){var q=this.state==1?'addClass':'removeClass';p.document.getBody()[q]('cke_show_blocks');}};j.add('showblocks',{requires:['wysiwygarea'],init:function(p){var q=p.addCommand('showblocks',o);
q.canUndo=false;if(p.config.startupOutlineBlocks)q.setState(1);p.addCss(l.replace(m,'background-image: url('+a.getUrl(this.path)+'images/block_').replace(n,'cke_show_blocks '));p.ui.addButton('ShowBlocks',{label:p.lang.showBlocks,command:'showblocks'});p.on('mode',function(){if(q.state!=0)q.refresh(p);});p.on('contentDom',function(){if(q.state!=0)q.refresh(p);});}});})();i.startupOutlineBlocks=false;j.add('sourcearea',{requires:['editingblock'],init:function(l){var m=j.sourcearea;l.on('editingBlockReady',function(){var n,o;l.addMode('source',{load:function(p,q){if(c&&b.version<8)p.setStyle('position','relative');l.textarea=n=new h('textarea');n.setAttributes({dir:'ltr',tabIndex:-1});n.addClass('cke_source');n.addClass('cke_enable_context_menu');var r={width:b.ie7Compat?'99%':'100%',height:'100%',resize:'none',outline:'none','text-align':'left'};if(c){if(!b.ie8Compat){o=function(){n.hide();n.setStyle('height',p.$.clientHeight+'px');n.show();};l.on('resize',o);l.on('afterCommandExec',function(t){if(t.data.name=='toolbarCollapse')o();});r.height=p.$.clientHeight+'px';}}else n.on('mousedown',function(t){t.data.stopPropagation();});p.setHtml('');p.append(n);n.setStyles(r);n.on('blur',function(){l.focusManager.blur();});n.on('focus',function(){l.focusManager.focus();});l.mayBeDirty=true;this.loadData(q);var s=l.keystrokeHandler;if(s)s.attach(n);setTimeout(function(){l.mode='source';l.fire('mode');},b.gecko||b.webkit?100:0);},loadData:function(p){n.setValue(p);l.fire('dataReady');},getData:function(){return n.getValue();},getSnapshotData:function(){return n.getValue();},unload:function(p){l.textarea=n=null;if(o)l.removeListener('resize',o);if(c&&b.version<8)p.removeStyle('position');},focus:function(){n.focus();}});});l.addCommand('source',m.commands.source);if(l.ui.addButton)l.ui.addButton('Source',{label:l.lang.source,command:'source'});l.on('mode',function(){l.getCommand('source').setState(l.mode=='source'?1:2);});}});j.sourcearea={commands:{source:{modes:{wysiwyg:1,source:1},exec:function(l){if(l.mode=='wysiwyg')l.fire('saveSnapshot');l.getCommand('source').setState(0);l.setMode(l.mode=='source'?'wysiwyg':'source');},canUndo:false}}};(function(){j.add('stylescombo',{requires:['richcombo','styles'],init:function(o){var p=o.config,q=o.lang.stylesCombo,r=this.path,s;o.ui.addRichCombo('Styles',{label:q.label,title:q.panelTitle,voiceLabel:q.voiceLabel,className:'cke_styles',multiSelect:true,panel:{css:[a.getUrl(o.skinPath+'editor.css')].concat(p.contentsCss),voiceLabel:q.panelVoiceLabel},init:function(){var t=this,u=p.stylesCombo_stylesSet.split(':'),v=u[1]?u.slice(1).join(':'):a.getUrl(r+'styles/'+u[0]+'.js');
u=u[0];a.loadStylesSet(u,v,function(w){var x,y,z=[];s={};for(var A=0;A<w.length;A++){var B=w[A];y=B.name;x=s[y]=new a.style(B);x._name=y;z.push(x);}z.sort(n);var C;for(A=0;A<z.length;A++){x=z[A];y=x._name;var D=x.type;if(D!=C){t.startGroup(q['panelTitle'+String(D)]);C=D;}t.add(y,x.type==3?y:m(x._.definition),y);}t.commit();t.onOpen();});},onClick:function(t){o.focus();o.fire('saveSnapshot');var u=s[t],v=o.getSelection();if(u.type==3){var w=v.getSelectedElement();if(w)u.applyToObject(w);return;}var x=new d.elementPath(v.getStartElement());if(u.type==2&&u.checkActive(x))u.remove(o.document);else u.apply(o.document);o.fire('saveSnapshot');},onRender:function(){o.on('selectionChange',function(t){var u=this.getValue(),v=t.data.path,w=v.elements;for(var x=0,y;x<w.length;x++){y=w[x];for(var z in s)if(s[z].checkElementRemovable(y,true)){if(z!=u)this.setValue(z);return;}}this.setValue('');},this);},onOpen:function(){var B=this;if(c)o.focus();var t=o.getSelection(),u=t.getSelectedElement(),v=u&&u.getName(),w=new d.elementPath(u||t.getStartElement()),x=[0,0,0,0];B.showAll();B.unmarkAll();for(var y in s){var z=s[y],A=z.type;if(A==3){if(u&&z.element==v){if(z.checkElementRemovable(u,true))B.mark(y);x[A]++;}else B.hideItem(y);}else{if(z.checkActive(w))B.mark(y);x[A]++;}}if(!x[1])B.hideGroup(q['panelTitle'+String(1)]);if(!x[2])B.hideGroup(q['panelTitle'+String(2)]);if(!x[3])B.hideGroup(q['panelTitle'+String(3)]);}});}});var l={};a.addStylesSet=function(o,p){l[o]=p;};a.loadStylesSet=function(o,p,q){var r=l[o];if(r){q(r);return;}a.scriptLoader.load(p,function(){q(l[o]);});};function m(o){var p=[],q=o.element;if(q=='bdo')q='span';p=['<',q];var r=o.attributes;if(r)for(var s in r)p.push(' ',s,'="',r[s],'"');var t=a.style.getStyleText(o);if(t)p.push(' style="',t,'"');p.push('>',o.name,'</',q,'>');return p.join('');};function n(o,p){var q=o.type,r=p.type;return q==r?0:q==3?-1:r==3?1:r==1?1:-1;};})();i.stylesCombo_stylesSet='default';j.add('table',{init:function(l){var m=j.table,n=l.lang.table;l.addCommand('table',new a.dialogCommand('table'));l.addCommand('tableProperties',new a.dialogCommand('tableProperties'));l.ui.addButton('Table',{label:n.toolbar,command:'table'});a.dialog.add('table',this.path+'dialogs/table.js');a.dialog.add('tableProperties',this.path+'dialogs/table.js');if(l.addMenuItems)l.addMenuItems({table:{label:n.menu,command:'tableProperties',group:'table',order:5},tabledelete:{label:n.deleteTable,command:'tableDelete',group:'table',order:1}});if(l.contextMenu)l.contextMenu.addListener(function(o,p){if(!o)return null;
var q=o.is('table')||o.hasAscendant('table');if(q)return{tabledelete:2,table:2};return null;});}});(function(){function l(y,z){if(c)y.removeAttribute(z);else delete y[z];};var m=/^(?:td|th)$/;function n(y){var z=y.createBookmarks(),A=y.getRanges(),B=[],C={};function D(L){if(B.length>0)return;if(L.type==1&&m.test(L.getName())&&!L.getCustomData('selected_cell')){h.setMarker(C,L,'selected_cell',true);B.push(L);}};for(var E=0;E<A.length;E++){var F=A[E];if(F.collapsed){var G=F.getCommonAncestor(),H=G.getAscendant('td',true)||G.getAscendant('th',true);if(H)B.push(H);}else{var I=new d.walker(F),J;I.guard=D;while(J=I.next()){var K=J.getParent();if(K&&m.test(K.getName())&&!K.getCustomData('selected_cell')){h.setMarker(C,K,'selected_cell',true);B.push(K);}}}}h.clearAllMarkers(C);y.selectBookmarks(z);return B;};function o(y){var z=new h(y),A=(z.getName()=='table'?y:z.getAscendant('table')).$,B=A.rows,C=-1,D=[];for(var E=0;E<B.length;E++){C++;if(!D[C])D[C]=[];var F=-1;for(var G=0;G<B[E].cells.length;G++){var H=B[E].cells[G];F++;while(D[C][F])F++;var I=isNaN(H.colSpan)?1:H.colSpan,J=isNaN(H.rowSpan)?1:H.rowSpan;for(var K=0;K<J;K++){if(!D[C+K])D[C+K]=[];for(var L=0;L<I;L++)D[C+K][F+L]=B[E].cells[G];}F+=I-1;}}return D;};function p(y,z){var A=c?'_cke_rowspan':'rowSpan';for(var B=0;B<y.length;B++)for(var C=0;C<y[B].length;C++){var D=y[B][C];if(D.parentNode)D.parentNode.removeChild(D);D.colSpan=D[A]=1;}var E=0;for(B=0;B<y.length;B++)for(C=0;C<y[B].length;C++){D=y[B][C];if(!D)continue;if(C>E)E=C;if(D._cke_colScanned)continue;if(y[B][C-1]==D)D.colSpan++;if(y[B][C+1]!=D)D._cke_colScanned=1;}for(B=0;B<=E;B++)for(C=0;C<y.length;C++){if(!y[C])continue;D=y[C][B];if(!D||D._cke_rowScanned)continue;if(y[C-1]&&y[C-1][B]==D)D[A]++;if(!y[C+1]||y[C+1][B]!=D)D._cke_rowScanned=1;}for(B=0;B<y.length;B++)for(C=0;C<y[B].length;C++){D=y[B][C];l(D,'_cke_colScanned');l(D,'_cke_rowScanned');}for(B=0;B<y.length;B++){var F=z.ownerDocument.createElement('tr');for(C=0;C<y[B].length;){D=y[B][C];if(y[B-1]&&y[B-1][C]==D){C+=D.colSpan;continue;}F.appendChild(D);if(A!='rowSpan'){D.rowSpan=D[A];D.removeAttribute(A);}C+=D.colSpan;if(D.colSpan==1)D.removeAttribute('colSpan');if(D.rowSpan==1)D.removeAttribute('rowSpan');}if(c)z.rows[B].replaceNode(F);else{var G=new h(z.rows[B]),H=new h(F);G.setHtml('');H.moveChildren(G);}}};function q(y){var z=y.cells;for(var A=0;A<z.length;A++){z[A].innerHTML='';if(!c)new h(z[A]).appendBogus();}};function r(y,z){var A=y.getStartElement().getAscendant('tr');if(!A)return;var B=A.clone(true);
B.insertBefore(A);q(z?B.$:A.$);};function s(y){if(y instanceof d.selection){var z=n(y),A=[];for(var B=0;B<z.length;B++){var C=z[B].getParent();A[C.$.rowIndex]=C;}for(B=A.length;B>=0;B--)if(A[B])s(A[B]);}else if(y instanceof h){var D=y.getAscendant('table');if(D.$.rows.length==1)D.remove();else y.remove();}};function t(y,z){var A=y.getStartElement(),B=A.getAscendant('td',true)||A.getAscendant('th',true);if(!B)return;var C=B.getAscendant('table'),D=B.$.cellIndex;for(var E=0;E<C.$.rows.length;E++){var F=C.$.rows[E];if(F.cells.length<D+1)continue;B=new h(F.cells[D].cloneNode(false));if(!c)B.appendBogus();var G=new h(F.cells[D]);if(z)B.insertBefore(G);else B.insertAfter(G);}};function u(y){if(y instanceof d.selection){var z=n(y);for(var A=z.length;A>=0;A--)if(z[A])u(z[A]);}else if(y instanceof h){var B=y.getAscendant('table'),C=y.$.cellIndex;for(A=B.$.rows.length-1;A>=0;A--){var D=new h(B.$.rows[A]);if(!C&&D.$.cells.length==1){s(D);continue;}if(D.$.cells[C])D.$.removeChild(D.$.cells[C]);}}};function v(y,z){var A=y.getStartElement(),B=A.getAscendant('td',true)||A.getAscendant('th',true);if(!B)return;var C=B.clone();if(!c)C.appendBogus();if(z)C.insertBefore(B);else C.insertAfter(B);};function w(y){if(y instanceof d.selection){var z=n(y);for(var A=z.length-1;A>=0;A--)w(z[A]);}else if(y instanceof h)if(y.getParent().getChildCount()==1)y.getParent().remove();else y.remove();};var x={thead:1,tbody:1,tfoot:1,td:1,tr:1,th:1};j.tabletools={init:function(y){var z=y.lang.table;y.addCommand('cellProperties',new a.dialogCommand('cellProperties'));a.dialog.add('cellProperties',this.path+'dialogs/tableCell.js');y.addCommand('tableDelete',{exec:function(A){var B=A.getSelection(),C=B&&B.getStartElement(),D=C&&C.getAscendant('table',true);if(!D)return;B.selectElement(D);var E=B.getRanges()[0];E.collapse();B.selectRanges([E]);if(D.getParent().getChildCount()==1)D.getParent().remove();else D.remove();}});y.addCommand('rowDelete',{exec:function(A){var B=A.getSelection();s(B);}});y.addCommand('rowInsertBefore',{exec:function(A){var B=A.getSelection();r(B,true);}});y.addCommand('rowInsertAfter',{exec:function(A){var B=A.getSelection();r(B);}});y.addCommand('columnDelete',{exec:function(A){var B=A.getSelection();u(B);}});y.addCommand('columnInsertBefore',{exec:function(A){var B=A.getSelection();t(B,true);}});y.addCommand('columnInsertAfter',{exec:function(A){var B=A.getSelection();t(B);}});y.addCommand('cellDelete',{exec:function(A){var B=A.getSelection();w(B);}});y.addCommand('cellInsertBefore',{exec:function(A){var B=A.getSelection();
v(B,true);}});y.addCommand('cellInsertAfter',{exec:function(A){var B=A.getSelection();v(B);}});if(y.addMenuItems)y.addMenuItems({tablecell:{label:z.cell.menu,group:'tablecell',order:1,getItems:function(){var A=n(y.getSelection());return{tablecell_insertBefore:2,tablecell_insertAfter:2,tablecell_delete:2,tablecell_properties:A.length>0?2:0};}},tablecell_insertBefore:{label:z.cell.insertBefore,group:'tablecell',command:'cellInsertBefore',order:5},tablecell_insertAfter:{label:z.cell.insertAfter,group:'tablecell',command:'cellInsertAfter',order:10},tablecell_delete:{label:z.cell.deleteCell,group:'tablecell',command:'cellDelete',order:15},tablecell_properties:{label:z.cell.title,group:'tablecellproperties',command:'cellProperties',order:20},tablerow:{label:z.row.menu,group:'tablerow',order:1,getItems:function(){return{tablerow_insertBefore:2,tablerow_insertAfter:2,tablerow_delete:2};}},tablerow_insertBefore:{label:z.row.insertBefore,group:'tablerow',command:'rowInsertBefore',order:5},tablerow_insertAfter:{label:z.row.insertAfter,group:'tablerow',command:'rowInsertAfter',order:10},tablerow_delete:{label:z.row.deleteRow,group:'tablerow',command:'rowDelete',order:15},tablecolumn:{label:z.column.menu,group:'tablecolumn',order:1,getItems:function(){return{tablecolumn_insertBefore:2,tablecolumn_insertAfter:2,tablecolumn_delete:2};}},tablecolumn_insertBefore:{label:z.column.insertBefore,group:'tablecolumn',command:'columnInsertBefore',order:5},tablecolumn_insertAfter:{label:z.column.insertAfter,group:'tablecolumn',command:'columnInsertAfter',order:10},tablecolumn_delete:{label:z.column.deleteColumn,group:'tablecolumn',command:'columnDelete',order:15}});if(y.contextMenu)y.contextMenu.addListener(function(A,B){if(!A)return null;while(A){if(A.getName() in x)return{tablecell:2,tablerow:2,tablecolumn:2};A=A.getParent();}return null;});},getSelectedCells:n};j.add('tabletools',j.tabletools);})();j.add('specialchar',{init:function(l){var m='specialchar';a.dialog.add(m,this.path+'dialogs/specialchar.js');l.addCommand(m,new a.dialogCommand(m));l.ui.addButton('SpecialChar',{label:l.lang.specialChar.toolbar,command:m});}});(function(){var l={exec:function(n){n.container.focusNext(true);}},m={exec:function(n){n.container.focusPrevious(true);}};j.add('tab',{requires:['keystrokes'],init:function(n){var o=n.keystrokeHandler.keystrokes;o[9]='tab';o[2000+9]='shiftTab';var p=n.config.tabSpaces,q='';while(p--)q+='\xa0';n.addCommand('tab',{exec:function(r){if(!r.fire('tab'))if(q.length>0)r.insertHtml(q);
else return r.execCommand('blur');return true;}});n.addCommand('shiftTab',{exec:function(r){if(!r.fire('shiftTab'))return r.execCommand('blurBack');return true;}});n.addCommand('blur',l);n.addCommand('blurBack',m);}});})();h.prototype.focusNext=function(l){var u=this;var m=u.$,n=u.getTabIndex(),o,p,q,r,s,t;if(n<=0){s=u.getNextSourceNode(l,1);while(s){if(s.isVisible()&&s.getTabIndex()===0){q=s;break;}s=s.getNextSourceNode(false,1);}}else{s=u.getDocument().getBody().getFirst();while(s=s.getNextSourceNode(false,1)){if(!o)if(!p&&s.equals(u)){p=true;if(l){if(!(s=s.getNextSourceNode(true,1)))break;o=1;}}else if(p&&!u.contains(s))o=1;if(!s.isVisible()||(t=s.getTabIndex())<(0))continue;if(o&&t==n){q=s;break;}if(t>n&&(!q||!r||t<r)){q=s;r=t;}else if(!q&&t===0){q=s;r=t;}}}if(q)q.focus();};h.prototype.focusPrevious=function(l){var u=this;var m=u.$,n=u.getTabIndex(),o,p,q,r=0,s,t=u.getDocument().getBody().getLast();while(t=t.getPreviousSourceNode(false,1)){if(!o)if(!p&&t.equals(u)){p=true;if(l){if(!(t=t.getPreviousSourceNode(true,1)))break;o=1;}}else if(p&&!u.contains(t))o=1;if(!t.isVisible()||(s=t.getTabIndex())<(0))continue;if(n<=0){if(o&&s===0){q=t;break;}if(s>r){q=t;r=s;}}else{if(o&&s==n){q=t;break;}if(s<n&&(!q||s>r)){q=t;r=s;}}}if(q)q.focus();};i.tabSpaces=0;(function(){j.add('templates',{requires:['dialog'],init:function(n){a.dialog.add('templates',a.getUrl(this.path+'dialogs/templates.js'));n.addCommand('templates',new a.dialogCommand('templates'));n.ui.addButton('Templates',{label:n.lang.templates.button,command:'templates'});}});var l={},m={};a.addTemplates=function(n,o){l[n]=o;};a.getTemplates=function(n){return l[n];};a.loadTemplates=function(n,o){var p=[];for(var q=0;q<n.length;q++)if(!m[n[q]]){p.push(n[q]);m[n[q]]=1;}if(p.length>0)a.scriptLoader.load(p,o);else setTimeout(o,0);};})();i.templates='default';i.templates_files=[a.getUrl('plugins/templates/templates/default.js')];i.templates_replaceContent=true;(function(){var l=function(){this.toolbars=[];this.focusCommandExecuted=false;};l.prototype.focus=function(){for(var n=0,o;o=this.toolbars[n++];)for(var p=0,q;q=o.items[p++];)if(q.focus){q.focus();return;}};var m={toolbarFocus:{modes:{wysiwyg:1,source:1},exec:function(n){if(n.toolbox){n.toolbox.focusCommandExecuted=true;if(c)setTimeout(function(){n.toolbox.focus();},100);else n.toolbox.focus();}}}};j.add('toolbar',{init:function(n){var o=function(p,q){switch(q){case 39:case 9:while((p=p.next||p.toolbar.next&&p.toolbar.next.items[0])&&(!p.focus)){}if(p)p.focus();
else n.toolbox.focus();return false;case 37:case 2000+9:while((p=p.previous||p.toolbar.previous&&p.toolbar.previous.items[p.toolbar.previous.items.length-1])&&(!p.focus)){}if(p)p.focus();else{var r=n.toolbox.toolbars[n.toolbox.toolbars.length-1].items;r[r.length-1].focus();}return false;case 27:n.focus();return false;case 13:case 32:p.execute();return false;}return true;};n.on('themeSpace',function(p){if(p.data.space==n.config.toolbarLocation){n.toolbox=new l();var q=['<div class="cke_toolbox"'],r=n.config.toolbarStartupExpanded,s;q.push(r?'>':' style="display:none">');var t=n.toolbox.toolbars,u=n.config.toolbar instanceof Array?n.config.toolbar:n.config['toolbar_'+n.config.toolbar];for(var v=0;v<u.length;v++){var w=u[v];if(!w)continue;var x='cke_'+e.getNextNumber(),y={id:x,items:[]};if(s){q.push('</div>');s=0;}if(w==='/'){q.push('<div class="cke_break"></div>');continue;}q.push('<span id="',x,'" class="cke_toolbar"><span class="cke_toolbar_start"></span>');var z=t.push(y)-1;if(z>0){y.previous=t[z-1];y.previous.next=y;}for(var A=0;A<w.length;A++){var B,C=w[A];if(C=='-')B=k.separator;else B=n.ui.create(C);if(B){if(B.canGroup){if(!s){q.push('<span class="cke_toolgroup">');s=1;}}else if(s){q.push('</span>');s=0;}var D=B.render(n,q);z=y.items.push(D)-1;if(z>0){D.previous=y.items[z-1];D.previous.next=D;}D.toolbar=y;D.onkey=o;D.onfocus=function(){if(!n.toolbox.focusCommandExecuted)n.focus();};}}if(s){q.push('</span>');s=0;}q.push('<span class="cke_toolbar_end"></span></span>');}q.push('</div>');if(n.config.toolbarCanCollapse){var E=e.addFunction(function(){n.execCommand('toolbarCollapse');}),F='cke_'+e.getNextNumber();n.addCommand('toolbarCollapse',{exec:function(G){var H=a.document.getById(F),I=H.getPrevious(),J=G.getThemeSpace('contents'),K=I.getParent(),L=parseInt(J.$.style.height,10),M=K.$.offsetHeight;if(I.isVisible()){I.hide();H.addClass('cke_toolbox_collapser_min');}else{I.show();H.removeClass('cke_toolbox_collapser_min');}var N=K.$.offsetHeight-M;J.setStyle('height',L-N+'px');},modes:{wysiwyg:1,source:1}});q.push('<a id="'+F+'" class="cke_toolbox_collapser');if(!r)q.push(' cke_toolbox_collapser_min');q.push('" onclick="CKEDITOR.tools.callFunction('+E+')"></a>');}p.data.html+=q.join('');}});n.addCommand('toolbarFocus',m.toolbarFocus);}});})();k.separator={render:function(l,m){m.push('<span class="cke_separator"></span>');return{};}};i.toolbarLocation='top';i.toolbar_Basic=[['Bold','Italic','-','NumberedList','BulletedList','-','Link','Unlink','-','About']];
i.toolbar_Full=[['Source','-','Save','NewPage','Preview','-','Templates'],['Cut','Copy','Paste','PasteText','PasteFromWord','-','Print','SpellChecker','Scayt'],['Undo','Redo','-','Find','Replace','-','SelectAll','RemoveFormat'],['Form','Checkbox','Radio','TextField','Textarea','Select','Button','ImageButton','HiddenField'],'/',['Bold','Italic','Underline','Strike','-','Subscript','Superscript'],['NumberedList','BulletedList','-','Outdent','Indent','Blockquote'],['JustifyLeft','JustifyCenter','JustifyRight','JustifyBlock'],['Link','Unlink','Anchor'],['Image','Flash','Table','HorizontalRule','Smiley','SpecialChar','PageBreak'],'/',['Styles','Format','Font','FontSize'],['TextColor','BGColor'],['Maximize','ShowBlocks','-','About']];i.toolbar='Full';i.toolbarCanCollapse=true;i.toolbarStartupExpanded=true;(function(){j.add('undo',{requires:['selection','wysiwygarea'],init:function(n){var o=new m(n),p=n.addCommand('undo',{exec:function(){if(o.undo()){n.selectionChange();this.fire('afterUndo');}},state:0,canUndo:false}),q=n.addCommand('redo',{exec:function(){if(o.redo()){n.selectionChange();this.fire('afterRedo');}},state:0,canUndo:false});o.onChange=function(){p.setState(o.undoable()?2:0);q.setState(o.redoable()?2:0);};function r(s){if(o.enabled&&s.data.command.canUndo!==false)o.save();};n.on('beforeCommandExec',r);n.on('afterCommandExec',r);n.on('saveSnapshot',function(){o.save();});n.on('contentDom',function(){n.document.on('keydown',function(s){if(!s.data.$.ctrlKey&&!s.data.$.metaKey)o.type(s);});});n.on('beforeModeUnload',function(){n.mode=='wysiwyg'&&o.save(true);});n.on('mode',function(){o.enabled=n.mode=='wysiwyg';o.onChange();});n.ui.addButton('Undo',{label:n.lang.undo,command:'undo'});n.ui.addButton('Redo',{label:n.lang.redo,command:'redo'});n.resetUndo=function(){o.reset();n.fire('saveSnapshot');};}});function l(n){var p=this;var o=n.getSelection();p.contents=n.getSnapshot();p.bookmarks=o&&o.createBookmarks2(true);if(c)p.contents=p.contents.replace(/\s+_cke_expando=".*?"/g,'');};l.prototype={equals:function(n,o){if(this.contents!=n.contents)return false;if(o)return true;var p=this.bookmarks,q=n.bookmarks;if(p||q){if(!p||!q||p.length!=q.length)return false;for(var r=0;r<p.length;r++){var s=p[r],t=q[r];if(s.startOffset!=t.startOffset||s.endOffset!=t.endOffset||!e.arrayCompare(s.start,t.start)||!e.arrayCompare(s.end,t.end))return false;}}return true;}};function m(n){this.editor=n;this.reset();};m.prototype={type:function(n){var o=n&&n.data.getKeystroke(),p={8:1,46:1},q=o in p,r=this.lastKeystroke in p,s=q&&o==this.lastKeystroke,t={37:1,38:1,39:1,40:1},u=o in t,v=this.lastKeystroke in t,w=!q&&!u,x=q&&!s,y=!this.typing||w&&(r||v);
if(y||x){var z=new l(this.editor);e.setTimeout(function(){var B=this;var A=B.editor.getSnapshot();if(c)A=A.replace(/\s+_cke_expando=".*?"/g,'');if(z.contents!=A){if(!B.save(false,z,false))B.snapshots.splice(B.index+1,B.snapshots.length-B.index-1);B.hasUndo=true;B.hasRedo=false;B.typesCount=1;B.modifiersCount=1;B.onChange();}},0,this);}this.lastKeystroke=o;if(q){this.typesCount=0;this.modifiersCount++;if(this.modifiersCount>25){this.save();this.modifiersCount=1;}}else if(!u){this.modifiersCount=0;this.typesCount++;if(this.typesCount>25){this.save();this.typesCount=1;}}this.typing=true;},reset:function(){var n=this;n.lastKeystroke=0;n.snapshots=[];n.index=-1;n.limit=n.editor.config.undoStackSize;n.currentImage=null;n.hasUndo=false;n.hasRedo=false;n.resetType();},resetType:function(){var n=this;n.typing=false;delete n.lastKeystroke;n.typesCount=0;n.modifiersCount=0;},fireChange:function(){var n=this;n.hasUndo=!!n.getNextImage(true);n.hasRedo=!!n.getNextImage(false);n.resetType();n.onChange();},save:function(n,o,p){var r=this;var q=r.snapshots;if(!o)o=new l(r.editor);if(r.currentImage&&o.equals(r.currentImage,n))return false;q.splice(r.index+1,q.length-r.index-1);if(q.length==r.limit)q.shift();r.index=q.push(o)-1;r.currentImage=o;if(p!==false)r.fireChange();return true;},restoreImage:function(n){var p=this;p.editor.loadSnapshot(n.contents);if(n.bookmarks)p.editor.getSelection().selectBookmarks(n.bookmarks);else if(c){var o=p.editor.document.getBody().$.createTextRange();o.collapse(true);o.select();}p.index=n.index;p.currentImage=n;p.fireChange();},getNextImage:function(n){var s=this;var o=s.snapshots,p=s.currentImage,q,r;if(p)if(n)for(r=s.index-1;r>=0;r--){q=o[r];if(!p.equals(q,true)){q.index=r;return q;}}else for(r=s.index+1;r<o.length;r++){q=o[r];if(!p.equals(q,true)){q.index=r;return q;}}return null;},redoable:function(){return this.enabled&&this.hasRedo;},undoable:function(){return this.enabled&&this.hasUndo;},undo:function(){var o=this;if(o.undoable()){o.save(true);var n=o.getNextImage(true);if(n)return o.restoreImage(n),true;}return false;},redo:function(){var o=this;if(o.redoable()){o.save(true);if(o.redoable()){var n=o.getNextImage(false);if(n)return o.restoreImage(n),true;}}return false;}};})();i.undoStackSize=20;(function(){var l={table:1,pre:1},m=/\s*<(p|div|address|h\d|center)[^>]*>\s*(?:<br[^>]*>|&nbsp;|&#160;)\s*(:?<\/\1>)?\s*$/gi;function n(r){var w=this;if(w.mode=='wysiwyg'){w.focus();var s=w.getSelection(),t=r.data;if(w.dataProcessor)t=w.dataProcessor.toHtml(t);
if(c){var u=s.isLocked;if(u)s.unlock();var v=s.getNative();if(v.type=='Control')v.clear();v.createRange().pasteHTML(t);if(u)w.getSelection().lock();}else w.document.$.execCommand('inserthtml',false,t);}};function o(r){if(this.mode=='wysiwyg'){this.focus();this.fire('saveSnapshot');var s=r.data,t=s.getName(),u=f.$block[t],v=this.getSelection(),w=v.getRanges(),x=v.isLocked;if(x)v.unlock();var y,z,A,B;for(var C=w.length-1;C>=0;C--){y=w[C];y.deleteContents();z=!C&&s||s.clone(true);var D,E;if(u)while((D=y.getCommonAncestor(false,true))&&((E=f[D.getName()])&&(!(E&&E[t]))))if(y.checkStartOfBlock()&&y.checkEndOfBlock()){y.setStartBefore(D);y.collapse(true);D.remove();}else y.splitBlock();y.insertNode(z);if(!A)A=z;}y.moveToPosition(A,4);var F=A.getNextSourceNode(true);if(F&&F.type==1)y.moveToElementEditStart(F);v.selectRanges([y]);if(x)this.getSelection().lock();e.setTimeout(function(){this.fire('saveSnapshot');},0,this);}};function p(r){if(!r.checkDirty())setTimeout(function(){r.resetDirty();});};function q(r){var s=r.editor,t=r.data.path,u=t.blockLimit,v=r.data.selection,w=v.getRanges()[0],x=s.document.getBody(),y=s.config.enterMode;if(y!=2&&w.collapsed&&u.getName()=='body'&&!t.block){p(s);var z=v.createBookmarks(),A=w.fixBlock(true,s.config.enterMode==3?'div':'p');if(c){var B=A.getElementsByTag('br'),C;for(var D=0;D<B.count();D++)if((C=B.getItem(D))&&(C.hasAttribute('_cke_bogus')))C.remove();}v.selectBookmarks(z);var E=A.getChildren(),F=E.count(),G,H=d.walker.whitespaces(true),I=A.getPrevious(H),J=A.getNext(H),K;if(I&&I.getName&&!(I.getName() in l))K=I;else if(J&&J.getName&&!(J.getName() in l))K=J;if((!F||(G=E.getItem(0))&&(G.is&&G.is('br')))&&(K&&w.moveToElementEditStart(K))){A.remove();w.select();}}var L=x.getLast(d.walker.whitespaces(true));if(L&&L.getName&&L.getName() in l){p(s);var M=s.document.createElement(c&&y!=2?'<br _cke_bogus="true" />':'br');x.append(M);}};j.add('wysiwygarea',{requires:['editingblock'],init:function(r){var s=r.config.enterMode!=2?r.config.enterMode==3?'div':'p':false;r.on('editingBlockReady',function(){var t,u,v,w,x,y,z,A=b.isCustomDomain(),B=function(){if(v)v.remove();if(u)u.remove();y=0;var E='void( '+(b.gecko?'setTimeout':'')+'( function(){'+'document.open();'+(c&&A?'document.domain="'+document.domain+'";':'')+'document.write( window.parent[ "_cke_htmlToLoad_'+r.name+'" ] );'+'document.close();'+'window.parent[ "_cke_htmlToLoad_'+r.name+'" ] = null;'+'}'+(b.gecko?', 0 )':')()')+' )';if(b.opera)E='void(0);';v=h.createFromHtml('<iframe style="width:100%;height:100%" frameBorder="0" tabIndex="-1" allowTransparency="true" src="javascript:'+encodeURIComponent(E)+'"'+'></iframe>');
var F=r.lang.editorTitle.replace('%1',r.name);if(b.gecko){v.on('load',function(G){G.removeListener();D(v.$.contentWindow);});t.setAttributes({role:'region',title:F});v.setAttributes({role:'region',title:' '});}else if(b.webkit){v.setAttribute('title',F);v.setAttribute('name',F);}else if(c){u=h.createFromHtml('<fieldset style="height:100%'+(c&&b.quirks?';position:relative':'')+'">'+'<legend style="display:block;width:0;height:0;overflow:hidden;'+(c&&b.quirks?'position:absolute':'')+'">'+e.htmlEncode(F)+'</legend>'+'</fieldset>',a.document);v.appendTo(u);u.appendTo(t);}if(!c)t.append(v);},C='<script id="cke_actscrpt" type="text/javascript">window.onload = function(){window.parent.CKEDITOR._["contentDomReady'+r.name+'"]( window );'+'}'+'</script>',D=function(E){if(y)return;y=1;var F=E.document,G=F.body,H=F.getElementById('cke_actscrpt');H.parentNode.removeChild(H);delete a._['contentDomReady'+r.name];G.spellcheck=!r.config.disableNativeSpellChecker;if(c){G.hideFocus=true;G.disabled=true;G.contentEditable=true;G.removeAttribute('disabled');}else F.designMode='on';try{F.execCommand('enableObjectResizing',false,!r.config.disableObjectResizing);}catch(K){}try{F.execCommand('enableInlineTableEditing',false,!r.config.disableNativeTableHandles);}catch(L){}E=r.window=new d.window(E);F=r.document=new g(F);if(!(c||b.opera))F.on('mousedown',function(M){var N=M.data.getTarget();if(N.is('img','hr','input','textarea','select'))r.getSelection().selectElement(N);});if(b.webkit){F.on('click',function(M){if(M.data.getTarget().is('input','select'))M.data.preventDefault();});F.on('mouseup',function(M){if(M.data.getTarget().is('input','textarea'))M.data.preventDefault();});}var I=c||b.webkit?E:F;I.on('blur',function(){r.focusManager.blur();});I.on('focus',function(){if(b.gecko){var M=G;while(M.firstChild)M=M.firstChild;if(!M.nextSibling&&'BR'==M.tagName&&M.hasAttribute('_moz_editor_bogus_node')){var N=F.$.createEvent('KeyEvents');N.initKeyEvent('keypress',true,true,E.$,false,false,false,false,0,32);F.$.dispatchEvent(N);var O=F.getBody().getFirst();if(r.config.enterMode==2)F.createElement('br',{attributes:{_moz_dirty:''}}).replace(O);else O.remove();}}r.focusManager.focus();});var J=r.keystrokeHandler;if(J)J.attach(F);if(c)r.on('key',function(M){var N=M.data.keyCode==8&&r.getSelection().getSelectedElement();if(N){r.fire('saveSnapshot');N.remove();r.fire('saveSnapshot');M.cancel();}});if(r.contextMenu)r.contextMenu.addTarget(F);setTimeout(function(){r.fire('contentDom');if(z){r.mode='wysiwyg';
r.fire('mode');z=false;}w=false;if(x){r.focus();x=false;}setTimeout(function(){r.fire('dataReady');},0);if(c)setTimeout(function(){if(r.document){var M=r.document.$.body;M.runtimeStyle.marginBottom='0px';M.runtimeStyle.marginBottom='';}},1000);},0);};r.addMode('wysiwyg',{load:function(E,F,G){t=E;if(c&&b.quirks)E.setStyle('position','relative');r.mayBeDirty=true;z=true;if(G)this.loadSnapshotData(F);else this.loadData(F);},loadData:function(E){w=true;if(r.dataProcessor)E=r.dataProcessor.toHtml(E,s);E=r.config.docType+'<html dir="'+r.config.contentsLangDirection+'">'+'<head>'+'<link type="text/css" rel="stylesheet" href="'+[].concat(r.config.contentsCss).join('"><link type="text/css" rel="stylesheet" href="')+'">'+'<style type="text/css" _fcktemp="true">'+r._.styles.join('\n')+'</style>'+'</head>'+'<body>'+E+'</body>'+'</html>'+C;window['_cke_htmlToLoad_'+r.name]=E;a._['contentDomReady'+r.name]=D;B();if(b.opera){var F=v.$.contentWindow.document;F.open();F.write(E);F.close();}},getData:function(){var E=v.getFrameDocument().getBody().getHtml();if(r.dataProcessor)E=r.dataProcessor.toDataFormat(E,s);if(r.config.ignoreEmptyParagraph)E=E.replace(m,'');return E;},getSnapshotData:function(){return v.getFrameDocument().getBody().getHtml();},loadSnapshotData:function(E){v.getFrameDocument().getBody().setHtml(E);},unload:function(E){r.window=r.document=v=t=x=null;r.fire('contentDomUnload');},focus:function(){if(w)x=true;else if(r.window){r.window.focus();r.selectionChange();}}});r.on('insertHtml',n,null,null,20);r.on('insertElement',o,null,null,20);r.on('selectionChange',q,null,null,1);});}});})();i.disableObjectResizing=false;i.disableNativeTableHandles=true;i.disableNativeSpellChecker=true;i.ignoreEmptyParagraph=true;j.add('wsc',{init:function(l){var m='checkspell',n=l.addCommand(m,new a.dialogCommand(m));n.modes={wysiwyg:!b.opera&&document.domain==window.location.hostname};l.ui.addButton('SpellChecker',{label:l.lang.spellCheck.toolbar,command:m});a.dialog.add(m,this.path+'dialogs/wsc.js');}});i.wsc_customerId=i.wsc_customerId||'1:ua3xw1-2XyGJ3-GWruD3-6OFNT1-oXcuB1-nR6Bp4-hgQHc-EcYng3-sdRXG3-NOfFk';i.wsc_customLoaderScript=i.wsc_customLoaderScript||null;j.add('styles',{requires:['selection']});a.editor.prototype.attachStyleStateChange=function(l,m){var n=this._.styleStateChangeCallbacks;if(!n){n=this._.styleStateChangeCallbacks=[];this.on('selectionChange',function(o){for(var p=0;p<n.length;p++){var q=n[p],r=q.style.checkActive(o.data.path)?1:2;if(q.state!==r){q.fn.call(this,r);
q.state!==r;}}});}n.push({style:l,fn:m});};a.STYLE_BLOCK=1;a.STYLE_INLINE=2;a.STYLE_OBJECT=3;(function(){var l={address:1,div:1,h1:1,h2:1,h3:1,h4:1,h5:1,h6:1,p:1,pre:1},m={a:1,embed:1,hr:1,img:1,li:1,object:1,ol:1,table:1,td:1,tr:1,ul:1},n=/\s*(?:;\s*|$)/;a.style=function(L,M){if(M){L=e.clone(L);G(L.attributes,M);G(L.styles,M);}var N=this.element=(L.element||'*').toLowerCase();this.type=N=='#'||l[N]?1:m[N]?3:2;this._={definition:L};};a.style.prototype={apply:function(L){K.call(this,L,false);},remove:function(L){K.call(this,L,true);},applyToRange:function(L){var M=this;return(M.applyToRange=M.type==2?o:M.type==1?q:null).call(M,L);},removeFromRange:function(L){return(this.removeFromRange=this.type==2?p:null).call(this,L);},applyToObject:function(L){E(L,this);},checkActive:function(L){switch(this.type){case 1:return this.checkElementRemovable(L.block||L.blockLimit,true);case 2:var M=L.elements;for(var N=0,O;N<M.length;N++){O=M[N];if(O==L.block||O==L.blockLimit)continue;if(this.checkElementRemovable(O,true))return true;}}return false;},checkElementRemovable:function(L,M){if(!L)return false;var N=this._.definition,O;if(L.getName()==this.element){if(!M&&!L.hasAttributes())return true;O=H(N);if(O._length){for(var P in O){if(P=='_length')continue;var Q=L.getAttribute(P);if(O[P]==(P=='style'?J(Q,false):Q)){if(!M)return true;}else if(M)return false;}if(M)return true;}else return true;}var R=I(this)[L.getName()];if(R){if(!(O=R.attributes))return true;for(var S=0;S<O.length;S++){P=O[S][0];var T=L.getAttribute(P);if(T){var U=O[S][1];if(U===null||typeof U=='string'&&T==U||U.test(T))return true;}}}return false;}};a.style.getStyleText=function(L){var M=L._ST;if(M)return M;M=L.styles;var N=L.attributes&&L.attributes.style||'';if(N.length)N=N.replace(n,';');for(var O in M)N+=(O+':'+M[O]).replace(n,';');if(N.length)N=J(N);return L._ST=N;};function o(L){var al=this;var M=L.document;if(L.collapsed){var N=D(al,M);L.insertNode(N);L.moveToPosition(N,2);return;}var O=al.element,P=al._.definition,Q,R=f[O]||(Q=true,f.span),S=L.createBookmark();L.enlarge(1);L.trim();var T=L.getBoundaryNodes(),U=T.startNode,V=T.endNode.getNextSourceNode(true);if(!V){var W;V=W=M.createText('');V.insertAfter(L.endContainer);}var X=V.getParent();if(X&&X.getAttribute('_fck_bookmark'))V=X;if(V.equals(U)){V=V.getNextSourceNode(true);if(!V){V=W=M.createText('');V.insertAfter(U);}}var Y=U,Z,aa;while(Y){var ab=false;if(Y.equals(V)){Y=null;ab=true;}else{var ac=Y.type,ad=ac==1?Y.getName():null;if(ad&&Y.getAttribute('_fck_bookmark')){Y=Y.getNextSourceNode(true);
continue;}if(!ad||R[ad]&&(Y.getPosition(V)|4|0|8)==(4+0+8)){var ae=Y.getParent();if(ae&&((ae.getDtd()||f.span)[O]||Q)){if(!Z&&(!ad||!f.$removeEmpty[ad]||(Y.getPosition(V)|4|0|8)==(4+0+8))){Z=new d.range(M);Z.setStartBefore(Y);}if(ac==3||ac==1&&!Y.getChildCount()){var af=Y,ag;while(!af.$.nextSibling&&(ag=af.getParent(),R[ag.getName()])&&((ag.getPosition(U)|2|0|8)==(2+0+8)))af=ag;Z.setEndAfter(af);if(!af.$.nextSibling)ab=true;if(!aa)aa=ac!=3||/[^\s\ufeff]/.test(Y.getText());}}else ab=true;}else ab=true;Y=Y.getNextSourceNode();}if(ab&&aa&&Z&&!Z.collapsed){var ah=D(al,M),ai=Z.getCommonAncestor();while(ah&&ai){if(ai.getName()==O){for(var aj in P.attributes)if(ah.getAttribute(aj)==ai.getAttribute(aj))ah.removeAttribute(aj);for(var ak in P.styles)if(ah.getStyle(ak)==ai.getStyle(ak))ah.removeStyle(ak);if(!ah.hasAttributes()){ah=null;break;}}ai=ai.getParent();}if(ah){Z.extractContents().appendTo(ah);y(al,ah);Z.insertNode(ah);B(ah);if(!c)ah.$.normalize();}Z=null;}}W&&W.remove();L.moveToBookmark(S);};function p(L){L.enlarge(1);var M=L.createBookmark(),N=M.startNode;if(L.collapsed){var O=new d.elementPath(N.getParent()),P;for(var Q=0,R;Q<O.elements.length&&(R=O.elements[Q]);Q++){if(R==O.block||R==O.blockLimit)break;if(this.checkElementRemovable(R)){var S=L.checkBoundaryOfElement(R,2),T=!S&&L.checkBoundaryOfElement(R,1);if(T||S){P=R;P.match=T?'start':'end';}else{B(R);x(this,R);}}}if(P){var U=N;for(Q=0;true;Q++){var V=O.elements[Q];if(V.equals(P))break;else if(V.match)continue;else V=V.clone();V.append(U);U=V;}U[P.match=='start'?'insertBefore':'insertAfter'](P);}}else{var W=M.endNode,X=this;function Y(){var ab=new d.elementPath(N.getParent()),ac=new d.elementPath(W.getParent()),ad=null,ae=null;for(var af=0;af<ab.elements.length;af++){var ag=ab.elements[af];if(ag==ab.block||ag==ab.blockLimit)break;if(X.checkElementRemovable(ag))ad=ag;}for(af=0;af<ac.elements.length;af++){ag=ac.elements[af];if(ag==ac.block||ag==ac.blockLimit)break;if(X.checkElementRemovable(ag))ae=ag;}if(ae)W.breakParent(ae);if(ad)N.breakParent(ad);};Y();var Z=N.getNext();while(!Z.equals(W)){var aa=Z.getNextSourceNode();if(Z.type==1&&this.checkElementRemovable(Z)){if(Z.getName()==this.element)x(this,Z);else z(Z,I(this)[Z.getName()]);if(aa.type==1&&aa.contains(N)){Y();aa=N.getNext();}}Z=aa;}}L.moveToBookmark(M);};function q(L){var M=L.createBookmark(true),N=L.createIterator();N.enforceRealBlocks=true;var O,P=L.document,Q;while(O=N.getNextParagraph()){var R=D(this,P);r(O,R);}L.moveToBookmark(M);};function r(L,M){var N=M.is('pre'),O=L.is('pre'),P=N&&!O,Q=!N&&O;
if(P)M=w(L,M);else if(Q)M=v(t(L),M);else L.moveChildren(M);M.replace(L);if(N)s(M);};function s(L){var M;if(!((M=L.getPreviousSourceNode(true,1))&&(M.is&&M.is('pre'))))return;var N=u(M.getHtml(),/\n$/,'')+'\n\n'+u(L.getHtml(),/^\n/,'');if(c)L.$.outerHTML='<pre>'+N+'</pre>';else L.setHtml(N);M.remove();};function t(L){var M=/(\S\s*)\n(?:\s|(<span[^>]+_fck_bookmark.*?\/span>))*\n(?!$)/gi,N=L.getName(),O=u(L.getOuterHtml(),M,function(Q,R,S){return R+'</pre>'+S+'<pre>';}),P=[];O.replace(/<pre>([\s\S]*?)<\/pre>/gi,function(Q,R){P.push(R);});return P;};function u(L,M,N){var O='',P='';L=L.replace(/(^<span[^>]+_fck_bookmark.*?\/span>)|(<span[^>]+_fck_bookmark.*?\/span>$)/gi,function(Q,R,S){R&&(O=R);S&&(P=S);return '';});return O+L.replace(M,N)+P;};function v(L,M){var N=new d.documentFragment(M.getDocument());for(var O=0;O<L.length;O++){var P=L[O];P=P.replace(/(\r\n|\r)/g,'\n');P=u(P,/^[ \t]*\n/,'');P=u(P,/\n$/,'');P=u(P,/^[ \t]+|[ \t]+$/g,function(R,S,T){if(R.length==1)return '&nbsp;';else if(!S)return e.repeat('&nbsp;',R.length-1)+' ';else return ' '+e.repeat('&nbsp;',R.length-1);});P=P.replace(/\n/g,'<br>');P=P.replace(/[ \t]{2,}/g,function(R){return e.repeat('&nbsp;',R.length-1)+' ';});var Q=M.clone();Q.setHtml(P);N.append(Q);}return N;};function w(L,M){var N=L.getHtml();N=u(N,/(?:^[ \t\n\r]+)|(?:[ \t\n\r]+$)/g,'');N=N.replace(/[ \t\r\n]*(<br[^>]*>)[ \t\r\n]*/gi,'$1');N=N.replace(/([ \t\n\r]+|&nbsp;)/g,' ');N=N.replace(/<br\b[^>]*>/gi,'\n');if(c){var O=L.getDocument().createElement('div');O.append(M);M.$.outerHTML='<pre>'+N+'</pre>';M=O.getFirst().remove();}else M.setHtml(N);return M;};function x(L,M){var N=L._.definition,O=N.attributes,P=N.styles,Q=I(L);function R(){for(var T in O){if(T=='class'&&M.getAttribute(T)!=O[T])continue;M.removeAttribute(T);}};R();for(var S in P)M.removeStyle(S);O=Q[M.getName()];if(O)R();A(M);};function y(L,M){var N=L._.definition,O=N.attributes,P=N.styles,Q=I(L),R=M.getElementsByTag(L.element);for(var S=R.count();--S>=0;)x(L,R.getItem(S));for(var T in Q)if(T!=L.element){R=M.getElementsByTag(T);for(S=R.count()-1;S>=0;S--){var U=R.getItem(S);z(U,Q[T]);}}};function z(L,M){var N=M&&M.attributes;if(N)for(var O=0;O<N.length;O++){var P=N[O][0],Q;if(Q=L.getAttribute(P)){var R=N[O][1];if(R===null||R.test&&R.test(Q)||typeof R=='string'&&Q==R)L.removeAttribute(P);}}A(L);};function A(L){if(!L.hasAttributes()){var M=L.getFirst(),N=L.getLast();L.remove(true);if(M){B(M);if(N&&!M.equals(N))B(N);}}};function B(L){if(!L||L.type!=1||!f.$removeEmpty[L.getName()])return;
C(L,L.getNext(),true);C(L,L.getPrevious());};function C(L,M,N){if(M&&M.type==1){var O=M.getAttribute('_fck_bookmark');if(O)M=N?M.getNext():M.getPrevious();if(M&&M.type==1&&L.isIdentical(M)){var P=N?L.getLast():L.getFirst();if(O)(N?M.getPrevious():M.getNext()).move(L,!N);M.moveChildren(L,!N);M.remove();if(P)B(P);}}};function D(L,M){var N,O=L._.definition,P=L.element;if(P=='*')P='span';N=new h(P,M);return E(N,L);};function E(L,M){var N=M._.definition,O=N.attributes,P=a.style.getStyleText(N);if(O)for(var Q in O)L.setAttribute(Q,O[Q]);if(P)L.setAttribute('style',P);return L;};var F=/#\((.+?)\)/g;function G(L,M){for(var N in L)L[N]=L[N].replace(F,function(O,P){return M[P];});};function H(L){var M=L._AC;if(M)return M;M={};var N=0,O=L.attributes;if(O)for(var P in O){N++;M[P]=O[P];}var Q=a.style.getStyleText(L);if(Q){if(!M.style)N++;M.style=Q;}M._length=N;return L._AC=M;};function I(L){if(L._.overrides)return L._.overrides;var M=L._.overrides={},N=L._.definition.overrides;if(N){if(!e.isArray(N))N=[N];for(var O=0;O<N.length;O++){var P=N[O],Q,R,S;if(typeof P=='string')Q=P.toLowerCase();else{Q=P.element?P.element.toLowerCase():L.element;S=P.attributes;}R=M[Q]||(M[Q]={});if(S){var T=R.attributes=R.attributes||[];for(var U in S)T.push([U.toLowerCase(),S[U]]);}}}return M;};function J(L,M){var N;if(M!==false){var O=new h('span');O.setAttribute('style',L);N=O.getAttribute('style');}else N=L;return N.replace(/\s*([;:])\s*/,'$1').replace(/([^\s;])$/,'$1;').replace(/,\s+/g,',').toLowerCase();};function K(L,M){var N=L.getSelection(),O=N.getRanges(),P=M?this.removeFromRange:this.applyToRange;for(var Q=0;Q<O.length;Q++)P.call(this,O[Q]);N.selectRanges(O);};})();a.styleCommand=function(l){this.style=l;};a.styleCommand.prototype.exec=function(l){var n=this;l.focus();var m=l.document;if(m)if(n.state==2)n.style.apply(m);else if(n.state==1)n.style.remove(m);return!!m;};j.add('domiterator');(function(){var l=function(n){var o=this;if(arguments.length<1)return;o.range=n;o.forceBrBreak=false;o.enlargeBr=true;o.enforceRealBlocks=false;o._||(o._={});},m=/^[\r\n\t ]+$/;l.prototype={getNextParagraph:function(n){var O=this;var o,p,q,r,s;if(!O._.lastNode){p=O.range.clone();p.enlarge(O.forceBrBreak||!O.enlargeBr?3:2);var t=new d.walker(p),u=d.walker.bookmark(true,true);t.evaluator=u;O._.nextNode=t.next();t=new d.walker(p);t.evaluator=u;var v=t.previous();O._.lastNode=v.getNextSourceNode(true);if(O._.lastNode&&O._.lastNode.type==3&&!e.trim(O._.lastNode.getText())&&O._.lastNode.getParent().isBlockBoundary()){var w=new d.range(p.document);
w.moveToPosition(O._.lastNode,4);if(w.checkEndOfBlock()){var x=new d.elementPath(w.endContainer),y=x.block||x.blockLimit;O._.lastNode=y.getNextSourceNode(true);}}if(!O._.lastNode){O._.lastNode=O._.docEndMarker=p.document.createText('');O._.lastNode.insertAfter(v);}p=null;}var z=O._.nextNode;v=O._.lastNode;O._.nextNode=null;while(z){var A=false,B=z.type!=1,C=false;if(!B){var D=z.getName();if(z.isBlockBoundary(O.forceBrBreak&&{br:1})){if(D=='br')B=true;else if(!p&&!z.getChildCount()&&D!='hr'){o=z;q=z.equals(v);break;}if(p){p.setEndAt(z,3);if(D!='br')O._.nextNode=z;}A=true;}else{if(z.getFirst()){if(!p){p=new d.range(O.range.document);p.setStartAt(z,3);}z=z.getFirst();continue;}B=true;}}else if(z.type==3)if(m.test(z.getText()))B=false;if(B&&!p){p=new d.range(O.range.document);p.setStartAt(z,3);}q=(!A||B)&&(z.equals(v));if(p&&!A)while(!z.getNext()&&!q){var E=z.getParent();if(E.isBlockBoundary(O.forceBrBreak&&{br:1})){A=true;q=q||E.equals(v);break;}z=E;B=true;q=z.equals(v);C=true;}if(B)p.setEndAt(z,4);z=z.getNextSourceNode(C,null,v);q=!z;if((A||q)&&(p)){var F=p.getBoundaryNodes(),G=new d.elementPath(p.startContainer),H=new d.elementPath(p.endContainer);if(F.startNode.equals(F.endNode)&&F.startNode.getParent().equals(G.blockLimit)&&F.startNode.type==1&&F.startNode.getAttribute('_fck_bookmark')){p=null;O._.nextNode=null;}else break;}if(q)break;}if(!o){if(!p){O._.docEndMarker&&O._.docEndMarker.remove();O._.nextNode=null;return null;}G=new d.elementPath(p.startContainer);var I=G.blockLimit,J={div:1,th:1,td:1};o=G.block;if(!o&&!O.enforceRealBlocks&&J[I.getName()]&&p.checkStartOfBlock()&&p.checkEndOfBlock())o=I;else if(!o||O.enforceRealBlocks&&o.getName()=='li'){o=O.range.document.createElement(n||'p');p.extractContents().appendTo(o);o.trim();p.insertNode(o);r=s=true;}else if(o.getName()!='li'){if(!p.checkStartOfBlock()||!p.checkEndOfBlock()){o=o.clone(false);p.extractContents().appendTo(o);o.trim();var K=p.splitBlock();r=!K.wasStartOfBlock;s=!K.wasEndOfBlock;p.insertNode(o);}}else if(!q)O._.nextNode=o.equals(v)?null:p.getBoundaryNodes().endNode.getNextSourceNode(true,null,v);}if(r){var L=o.getPrevious();if(L&&L.type==1)if(L.getName()=='br')L.remove();else if(L.getLast()&&L.getLast().$.nodeName.toLowerCase()=='br')L.getLast().remove();}if(s){var M=d.walker.bookmark(false,true),N=o.getLast();if(N&&N.type==1&&N.getName()=='br')if(c||N.getPrevious(M)||N.getNext(M))N.remove();}if(!O._.nextNode)O._.nextNode=q||o.equals(v)?null:o.getNextSourceNode(true,null,v);return o;}};d.range.prototype.createIterator=function(){return new l(this);
};})();j.add('panelbutton',{requires:['button'],beforeInit:function(l){l.ui.addHandler(4,k.panelButton.handler);}});a.UI_PANELBUTTON=4;(function(){var l=function(m){var o=this;var n=o._;if(n.state==0)return;o.createPanel(m);if(n.on){n.panel.hide();return;}n.panel.showBlock(o._.id,o.document.getById(o._.id),4);};k.panelButton=e.createClass({base:k.button,$:function(m){var o=this;var n=m.panel;delete m.panel;o.base(m);o.document=n&&n.parent&&n.parent.getDocument()||a.document;o.hasArrow=true;o.click=l;o._={panelDefinition:n};},statics:{handler:{create:function(m){return new k.panelButton(m);}}},proto:{createPanel:function(m){var n=this._;if(n.panel)return;var o=this._.panelDefinition||{},p=o.parent||a.document.getBody(),q=this._.panel=new k.floatPanel(m,p,o),r=this;q.onShow=function(){if(r.className)this.element.getFirst().addClass(r.className+'_panel');n.oldState=r._.state;r.setState(1);n.on=1;if(r.onOpen)r.onOpen();};q.onHide=function(){if(r.className)this.element.getFirst().removeClass(r.className+'_panel');r.setState(n.oldState);n.on=0;if(r.onClose)r.onClose();};q.onEscape=function(){q.hide();r.document.getById(n.id).focus();};if(this.onBlock)this.onBlock(q,n.id);q.getBlock(n.id).onHide=function(){n.on=0;r.setState(2);};}}});})();j.add('floatpanel',{requires:['panel']});(function(){var l={},m=false;function n(o,p,q,r,s){var t=p.getUniqueId()+'-'+q.getUniqueId()+'-'+o.skinName+'-'+o.lang.dir+(o.uiColor&&'-'+o.uiColor||'')+(r.css&&'-'+r.css||'')+(s&&'-'+s||''),u=l[t];if(!u){u=l[t]=new k.panel(p,r);u.element=q.append(h.createFromHtml(u.renderHtml(o),p));u.element.setStyles({display:'none',position:'absolute'});}return u;};k.floatPanel=e.createClass({$:function(o,p,q,r){q.forceIFrame=true;var s=p.getDocument(),t=n(o,s,p,q,r||0),u=t.element,v=u.getFirst().getFirst();this.element=u;o.panels?o.panels.push(u):o.panels=[u];this._={panel:t,parentElement:p,definition:q,document:s,iframe:v,children:[],dir:o.lang.dir};},proto:{addBlock:function(o,p){return this._.panel.addBlock(o,p);},addListBlock:function(o,p){return this._.panel.addListBlock(o,p);},getBlock:function(o){return this._.panel.getBlock(o);},showBlock:function(o,p,q,r,s){var t=this._.panel,u=t.showBlock(o);this.allowBlur(false);m=true;var v=this.element,w=this._.iframe,x=this._.definition,y=p.getDocumentPosition(v.getDocument()),z=this._.dir=='rtl',A=y.x+(r||0),B=y.y+(s||0);if(z&&(q==1||q==4))A+=p.$.offsetWidth;else if(!z&&(q==2||q==3))A+=p.$.offsetWidth-1;if(q==3||q==4)B+=p.$.offsetHeight-1;this._.panel._.offsetParentId=p.getId();
v.setStyles({top:B+'px',left:'-3000px',visibility:'hidden',opacity:'0',display:''});if(!this._.blurSet){var C=c?w:new d.window(w.$.contentWindow);a.event.useCapture=true;C.on('blur',function(D){var G=this;if(c&&!G.allowBlur())return;var E=D.data.getTarget(),F=E.getWindow&&E.getWindow();if(F&&F.equals(C))return;if(G.visible&&!G._.activeChild&&!m)G.hide();},this);C.on('focus',function(){this._.focused=true;this.hideChild();this.allowBlur(true);},this);a.event.useCapture=false;this._.blurSet=1;}t.onEscape=e.bind(function(){this.onEscape&&this.onEscape();},this);e.setTimeout(function(){if(z)A-=v.$.offsetWidth;v.setStyles({left:A+'px',visibility:'',opacity:'1'});if(u.autoSize){function D(){var E=v.getFirst(),F=u.element.$.scrollHeight;if(c&&b.quirks&&F>0)F+=(E.$.offsetHeight||0)-(E.$.clientHeight||0);E.setStyle('height',F+'px');t._.currentBlock.element.setStyle('display','none').removeStyle('display');};if(t.isLoaded)D();else t.onLoad=D;}else v.getFirst().removeStyle('height');e.setTimeout(function(){if(x.voiceLabel)if(b.gecko){var E=w.getParent();E.setAttribute('role','region');E.setAttribute('title',x.voiceLabel);w.setAttribute('role','region');w.setAttribute('title',' ');}if(c&&b.quirks)w.focus();else w.$.contentWindow.focus();if(c&&!b.quirks)this.allowBlur(true);},0,this);},0,this);this.visible=1;if(this.onShow)this.onShow.call(this);m=false;},hide:function(){var o=this;if(o.visible&&(!o.onHide||o.onHide.call(o)!==true)){o.hideChild();o.element.setStyle('display','none');o.visible=0;}},allowBlur:function(o){var p=this._.panel;if(o!=undefined)p.allowBlur=o;return p.allowBlur;},showAsChild:function(o,p,q,r,s,t){if(this._.activeChild==o&&o._.panel._.offsetParentId==q.getId())return;this.hideChild();o.onHide=e.bind(function(){e.setTimeout(function(){if(!this._.focused)this.hide();},0,this);},this);this._.activeChild=o;this._.focused=false;o.showBlock(p,q,r,s,t);if(b.ie7Compat||b.ie8&&b.ie6Compat)setTimeout(function(){o.element.getChild(0).$.style.cssText+='';},100);},hideChild:function(){var o=this._.activeChild;if(o){delete o.onHide;delete this._.activeChild;o.hide();}}}});})();j.add('menu',{beforeInit:function(l){var m=l.config.menu_groups.split(','),n={};for(var o=0;o<m.length;o++)n[m[o]]=o+1;l._.menuGroups=n;l._.menuItems={};},requires:['floatpanel']});e.extend(a.editor.prototype,{addMenuGroup:function(l,m){this._.menuGroups[l]=m||100;},addMenuItem:function(l,m){if(this._.menuGroups[m.group])this._.menuItems[l]=new a.menuItem(this,l,m);},addMenuItems:function(l){for(var m in l)this.addMenuItem(m,l[m]);
},getMenuItem:function(l){return this._.menuItems[l];}});(function(){a.menu=e.createClass({$:function(m,n){var o=this;o.id='cke_'+e.getNextNumber();o.editor=m;o.items=[];o._.level=n||1;},_:{showSubMenu:function(m){var s=this;var n=s._.subMenu,o=s.items[m],p=o.getItems&&o.getItems();if(!p){s._.panel.hideChild();return;}if(n)n.removeAll();else{n=s._.subMenu=new a.menu(s.editor,s._.level+1);n.parent=s;n.onClick=e.bind(s.onClick,s);}for(var q in p)n.add(s.editor.getMenuItem(q));var r=s._.panel.getBlock(s.id).element.getDocument().getById(s.id+String(m));n.show(r,2);}},proto:{add:function(m){if(!m.order)m.order=this.items.length;this.items.push(m);},removeAll:function(){this.items=[];},show:function(m,n,o,p){var q=this.items,r=this.editor,s=this._.panel,t=this._.element;if(!s){s=this._.panel=new k.floatPanel(this.editor,a.document.getBody(),{css:[a.getUrl(r.skinPath+'editor.css')],level:this._.level-1,className:r.skinClass+' cke_contextmenu'},this._.level);s.onEscape=e.bind(function(){this.onEscape&&this.onEscape();this.hide();},this);s.onHide=e.bind(function(){this.onHide&&this.onHide();},this);var u=s.addBlock(this.id);u.autoSize=true;var v=u.keys;v[40]='next';v[9]='next';v[38]='prev';v[2000+9]='prev';v[32]='click';v[39]='click';t=this._.element=u.element;t.addClass(r.skinClass);var w=t.getDocument();w.getBody().setStyle('overflow','hidden');w.getElementsByTag('html').getItem(0).setStyle('overflow','hidden');this._.itemOverFn=e.addFunction(function(C){var D=this;clearTimeout(D._.showSubTimeout);D._.showSubTimeout=e.setTimeout(D._.showSubMenu,r.config.menu_subMenuDelay,D,[C]);},this);this._.itemOutFn=e.addFunction(function(C){clearTimeout(this._.showSubTimeout);},this);this._.itemClickFn=e.addFunction(function(C){var E=this;var D=E.items[C];if(D.state==0){E.hide();return;}if(D.getItems)E._.showSubMenu(C);else E.onClick&&E.onClick(D);},this);}l(q);var x=['<div class="cke_menu">'],y=q.length,z=y&&q[0].group;for(var A=0;A<y;A++){var B=q[A];if(z!=B.group){x.push('<div class="cke_menuseparator"></div>');z=B.group;}B.render(this,A,x);}x.push('</div>');t.setHtml(x.join(''));if(this.parent)this.parent._.panel.showAsChild(s,this.id,m,n,o,p);else s.showBlock(this.id,m,n,o,p);r.fire('menuShow',[s]);},hide:function(){this._.panel&&this._.panel.hide();}}});function l(m){m.sort(function(n,o){if(n.group<o.group)return-1;else if(n.group>o.group)return 1;return n.order<o.order?-1:n.order>o.order?1:0;});};})();a.menuItem=e.createClass({$:function(l,m,n){var o=this;e.extend(o,n,{order:0,className:'cke_button_'+m});
o.group=l._.menuGroups[o.group];o.editor=l;o.name=m;},proto:{render:function(l,m,n){var t=this;var o=l.id+String(m),p=typeof t.state=='undefined'?2:t.state,q=' cke_'+(p==1?'on':p==0?'disabled':'off'),r=t.label;if(p==0)r=t.editor.lang.common.unavailable.replace('%1',r);if(t.className)q+=' '+t.className;n.push('<span class="cke_menuitem"><a id="',o,'" class="',q,'" href="javascript:void(\'',(t.label||'').replace("'",''),'\')" title="',t.label,'" tabindex="-1"_cke_focus=1 hidefocus="true"');if(b.opera||b.gecko&&b.mac)n.push(' onkeypress="return false;"');if(b.gecko)n.push(' onblur="this.style.cssText = this.style.cssText;"');var s=(t.iconOffset||0)*(-16);n.push(' onmouseover="CKEDITOR.tools.callFunction(',l._.itemOverFn,',',m,');" onmouseout="CKEDITOR.tools.callFunction(',l._.itemOutFn,',',m,');" onclick="CKEDITOR.tools.callFunction(',l._.itemClickFn,',',m,'); return false;"><span class="cke_icon_wrapper"><span class="cke_icon"'+(t.icon?' style="background-image:url('+a.getUrl(t.icon)+');background-position:0 '+s+'px;"':'')+'></span></span>'+'<span class="cke_label">');if(t.getItems)n.push('<span class="cke_menuarrow"></span>');n.push(r,'</span></a></span>');}}});i.menu_subMenuDelay=400;i.menu_groups='clipboard,form,tablecell,tablecellproperties,tablerow,tablecolumn,table,anchor,link,image,flash,checkbox,radio,textfield,hiddenfield,imagebutton,button,select,textarea';(function(){function l(){var v=this;try{var s=v.getSelection();if(!s)return;var t=s.getStartElement(),u=new d.elementPath(t);if(!u.compare(v._.selectionPreviousPath)){v._.selectionPreviousPath=u;v.fire('selectionChange',{selection:s,path:u,element:t});}}catch(w){}};var m,n;function o(){n=true;if(m)return;p.call(this);m=e.setTimeout(p,200,this);};function p(){m=null;if(n){e.setTimeout(l,0,this);n=false;}};var q={exec:function(s){switch(s.mode){case 'wysiwyg':s.document.$.execCommand('SelectAll',false,null);break;case 'source':}},canUndo:false};j.add('selection',{init:function(s){s.on('contentDom',function(){var t=s.document;if(c){var u,v;t.on('focusin',function(){if(u){try{u.select();}catch(y){}u=null;}});s.window.on('focus',function(){v=true;x();});s.document.on('beforedeactivate',function(){v=false;s.document.$.execCommand('Unselect');});t.on('mousedown',w);t.on('mouseup',function(){v=true;setTimeout(function(){x(true);},0);});t.on('keydown',w);t.on('keyup',function(){v=true;x();});t.on('selectionchange',x);function w(){v=false;};function x(y){if(v){var z=s.document,A=z&&z.$.selection;if(y&&A&&A.type=='None')if(!z.$.queryCommandEnabled('InsertImage')){e.setTimeout(x,50,this,true);
return;}u=A&&A.createRange();o.call(s);}};}else{t.on('mouseup',o,s);t.on('keyup',o,s);}});s.addCommand('selectAll',q);s.ui.addButton('SelectAll',{label:s.lang.selectAll,command:'selectAll'});s.selectionChange=o;}});a.editor.prototype.getSelection=function(){return this.document&&this.document.getSelection();};a.editor.prototype.forceNextSelectionCheck=function(){delete this._.selectionPreviousPath;};g.prototype.getSelection=function(){var s=new d.selection(this);return!s||s.isInvalid?null:s;};a.SELECTION_NONE=1;a.SELECTION_TEXT=2;a.SELECTION_ELEMENT=3;d.selection=function(s){var v=this;var t=s.getCustomData('cke_locked_selection');if(t)return t;v.document=s;v.isLocked=false;v._={cache:{}};if(c){var u=v.getNative().createRange();if(!u||u.item&&u.item(0).ownerDocument!=v.document.$||u.parentElement&&u.parentElement().ownerDocument!=v.document.$)v.isInvalid=true;}return v;};var r={img:1,hr:1,li:1,table:1,tr:1,td:1,embed:1,object:1,ol:1,ul:1,a:1,input:1,form:1,select:1,textarea:1,button:1,fieldset:1,th:1,thead:1,tfoot:1};d.selection.prototype={getNative:c?function(){return this._.cache.nativeSel||(this._.cache.nativeSel=this.document.$.selection);}:function(){return this._.cache.nativeSel||(this._.cache.nativeSel=this.document.getWindow().$.getSelection());},getType:c?function(){var s=this._.cache;if(s.type)return s.type;var t=1;try{var u=this.getNative(),v=u.type;if(v=='Text')t=2;if(v=='Control')t=3;if(u.createRange().parentElement)t=2;}catch(w){}return s.type=t;}:function(){var s=this._.cache;if(s.type)return s.type;var t=2,u=this.getNative();if(!u)t=1;else if(u.rangeCount==1){var v=u.getRangeAt(0),w=v.startContainer;if(w==v.endContainer&&w.nodeType==1&&v.endOffset-v.startOffset==1&&r[w.childNodes[v.startOffset].nodeName.toLowerCase()])t=3;}return s.type=t;},getRanges:c?(function(){var s=function(t,u){t=t.duplicate();t.collapse(u);var v=t.parentElement(),w=v.childNodes,x;for(var y=0;y<w.length;y++){var z=w[y];if(z.nodeType==1){x=t.duplicate();x.moveToElementText(z);x.collapse();var A=x.compareEndPoints('StartToStart',t);if(A>0)break;else if(A===0)return{container:v,offset:y};x=null;}}if(!x){x=t.duplicate();x.moveToElementText(v);x.collapse(false);}x.setEndPoint('StartToStart',t);var B=x.text.replace(/(\r\n|\r)/g,'\n').length;while(B>0)B-=w[--y].nodeValue.length;if(B===0)return{container:v,offset:y};else return{container:w[y],offset:-B};};return function(){var E=this;var t=E._.cache;if(t.ranges)return t.ranges;var u=E.getNative(),v=u&&u.createRange(),w=E.getType(),x;
if(!u)return[];if(w==2){x=new d.range(E.document);var y=s(v,true);x.setStart(new d.node(y.container),y.offset);y=s(v);x.setEnd(new d.node(y.container),y.offset);return t.ranges=[x];}else if(w==3){var z=E._.cache.ranges=[];for(var A=0;A<v.length;A++){var B=v.item(A),C=B.parentNode,D=0;x=new d.range(E.document);for(;D<C.childNodes.length&&C.childNodes[D]!=B;D++){}x.setStart(new d.node(C),D);x.setEnd(new d.node(C),D+1);z.push(x);}return z;}return t.ranges=[];};})():function(){var s=this._.cache;if(s.ranges)return s.ranges;var t=[],u=this.getNative();if(!u)return[];for(var v=0;v<u.rangeCount;v++){var w=u.getRangeAt(v),x=new d.range(this.document);x.setStart(new d.node(w.startContainer),w.startOffset);x.setEnd(new d.node(w.endContainer),w.endOffset);t.push(x);}return s.ranges=t;},getStartElement:function(){var z=this;var s=z._.cache;if(s.startElement!==undefined)return s.startElement;var t,u=z.getNative();switch(z.getType()){case 3:return z.getSelectedElement();case 2:var v=z.getRanges()[0];if(v)if(!v.collapsed){v.optimize();for(;;){var w=v.startContainer,x=v.startOffset;if(x==(w.getChildCount?w.getChildCount():w.getLength()))v.setStartAfter(w);else break;}t=v.startContainer;if(t.type!=1)return t.getParent();t=t.getChild(v.startOffset);if(!t||t.type!=1)return v.startContainer;var y=t.getFirst();while(y&&y.type==1){t=y;y=y.getFirst();}return t;}if(c){v=u.createRange();v.collapse(true);t=v.parentElement();}else{t=u.anchorNode;if(t&&t.nodeType!=1)t=t.parentNode;}}return s.startElement=t?new h(t):null;},getSelectedElement:function(){var s=this._.cache;if(s.selectedElement!==undefined)return s.selectedElement;var t;if(this.getType()==3){var u=this.getNative();if(c)try{t=u.createRange().item(0);}catch(w){}else{var v=u.getRangeAt(0);t=v.startContainer.childNodes[v.startOffset];}}return s.selectedElement=t?new h(t):null;},lock:function(){var s=this;s.getRanges();s.getStartElement();s.getSelectedElement();s._.cache.nativeSel={};s.isLocked=true;s.document.setCustomData('cke_locked_selection',s);},unlock:function(s){var x=this;var t=x.document,u=t.getCustomData('cke_locked_selection');if(u){t.setCustomData('cke_locked_selection',null);if(s){var v=u.getSelectedElement(),w=!v&&u.getRanges();x.isLocked=false;x.reset();t.getBody().focus();if(v)x.selectElement(v);else x.selectRanges(w);}}if(!u||!s){x.isLocked=false;x.reset();}},reset:function(){this._.cache={};},selectElement:function(s){var v=this;if(v.isLocked){var t=new d.range(v.document);t.setStartBefore(s);t.setEndAfter(s);
v._.cache.selectedElement=s;v._.cache.startElement=s;v._.cache.ranges=[t];v._.cache.type=3;return;}if(c){v.getNative().empty();try{t=v.document.$.body.createControlRange();t.addElement(s.$);t.select();}catch(w){t=v.document.$.body.createTextRange();t.moveToElementText(s.$);t.select();}v.reset();}else{t=v.document.$.createRange();t.selectNode(s.$);var u=v.getNative();u.removeAllRanges();u.addRange(t);v.reset();}},selectRanges:function(s){var y=this;if(y.isLocked){y._.cache.selectedElement=null;y._.cache.startElement=s[0].getTouchedStartNode();y._.cache.ranges=s;y._.cache.type=2;return;}if(c){if(s[0])s[0].select();y.reset();}else{var t=y.getNative();t.removeAllRanges();for(var u=0;u<s.length;u++){var v=s[u],w=y.document.$.createRange(),x=v.startContainer;if(v.collapsed&&b.gecko&&b.version<10900&&x.type==1&&!x.getChildCount())x.appendText('');w.setStart(x.$,v.startOffset);w.setEnd(v.endContainer.$,v.endOffset);t.addRange(w);}y.reset();}},createBookmarks:function(s){var t=[],u=this.getRanges(),v=u.length,w;for(var x=0;x<v;x++){t.push(w=u[x].createBookmark(s,true));s=w.serializable;var y=s?this.document.getById(w.startNode):w.startNode,z=s?this.document.getById(w.endNode):w.endNode;for(var A=x+1;A<v;A++){var B=u[A],C=B.startContainer,D=B.endContainer;C.equals(y.getParent())&&B.startOffset++;C.equals(z.getParent())&&B.startOffset++;D.equals(y.getParent())&&B.endOffset++;D.equals(z.getParent())&&B.endOffset++;}}return t;},createBookmarks2:function(s){var t=[],u=this.getRanges();for(var v=0;v<u.length;v++)t.push(u[v].createBookmark2(s));return t;},selectBookmarks:function(s){var t=[];for(var u=0;u<s.length;u++){var v=new d.range(this.document);v.moveToBookmark(s[u]);t.push(v);}this.selectRanges(t);return this;}};})();d.range.prototype.select=c?function(l){var u=this;var m=u.collapsed,n,o,p=u.createBookmark(),q=p.startNode,r;if(!m)r=p.endNode;var s=u.document.$.body.createTextRange();s.moveToElementText(q.$);s.moveStart('character',1);if(r){var t=u.document.$.body.createTextRange();t.moveToElementText(r.$);s.setEndPoint('EndToEnd',t);s.moveEnd('character',-1);}else{n=l||!q.hasPrevious()||q.getPrevious().is&&q.getPrevious().is('br');o=u.document.createElement('span');o.setHtml('&#65279;');o.insertBefore(q);if(n)u.document.createText('﻿').insertBefore(q);}u.setStartBefore(q);q.remove();if(m){if(n){s.moveStart('character',-1);s.select();u.document.$.selection.clear();}else s.select();o.remove();}else{u.setEndBefore(r);r.remove();s.select();}}:function(){var o=this;var l=o.startContainer;
if(o.collapsed&&l.type==1&&!l.getChildCount())l.append(new d.text(''));var m=o.document.$.createRange();m.setStart(l.$,o.startOffset);try{m.setEnd(o.endContainer.$,o.endOffset);}catch(p){if(p.toString().indexOf('NS_ERROR_ILLEGAL_VALUE')>=0){o.collapse(true);m.setEnd(o.endContainer.$,o.endOffset);}else throw p;}var n=o.document.getSelection().getNative();n.removeAllRanges();n.addRange(m);};(function(){var l={elements:{$:function(m){var n=m.attributes._cke_realelement,o=n&&new a.htmlParser.fragment.fromHtml(decodeURIComponent(n)),p=o&&o.children[0];if(p){var q=m.attributes.style;if(q){var r=/(?:^|\s)width\s*:\s*(\d+)/.exec(q),s=r&&r[1];r=/(?:^|\s)height\s*:\s*(\d+)/.exec(q);var t=r&&r[1];if(s)p.attributes.width=s;if(t)p.attributes.height=t;}}return p;}}};j.add('fakeobjects',{requires:['htmlwriter'],afterInit:function(m){var n=m.dataProcessor,o=n&&n.htmlFilter;if(o)o.addRules(l);}});})();a.editor.prototype.createFakeElement=function(l,m,n,o){var p=this.lang.fakeobjects,q={'class':m,src:a.getUrl('images/spacer.gif'),_cke_realelement:encodeURIComponent(l.getOuterHtml()),alt:p[n]||p.unknown};if(n)q._cke_real_element_type=n;if(o)q._cke_resizable=o;return this.document.createElement('img',{attributes:q});};a.editor.prototype.createFakeParserElement=function(l,m,n,o){var p=new a.htmlParser.basicWriter();l.writeHtml(p);var q=p.getHtml(),r=this.lang.fakeobjects,s={'class':m,src:a.getUrl('images/spacer.gif'),_cke_realelement:encodeURIComponent(q),alt:r[n]||r.unknown};if(n)s._cke_real_element_type=n;if(o)s._cke_resizable=o;return new a.htmlParser.element('img',s);};a.editor.prototype.restoreRealElement=function(l){var m=decodeURIComponent(l.getAttribute('_cke_realelement'));return h.createFromHtml(m,this.document);};j.add('richcombo',{requires:['floatpanel','listblock','button'],beforeInit:function(l){l.ui.addHandler(3,k.richCombo.handler);}});a.UI_RICHCOMBO=3;k.richCombo=e.createClass({$:function(l){var n=this;e.extend(n,l,{title:l.label,modes:{wysiwyg:1}});var m=n.panel||{};delete n.panel;n.id=e.getNextNumber();n.document=m&&m.parent&&m.parent.getDocument()||a.document;m.className=(m.className||'')+(' cke_rcombopanel');n._={panelDefinition:m,items:{},state:2};},statics:{handler:{create:function(l){return new k.richCombo(l);}}},proto:{renderHtml:function(l){var m=[];this.render(l,m);return m.join('');},render:function(l,m){var n='cke_'+this.id,o=e.addFunction(function(r){var u=this;var s=u._;if(s.state==0)return;u.createPanel(l);if(s.on){s.panel.hide();return;}if(!s.committed){s.list.commit();
s.committed=1;}var t=u.getValue();if(t)s.list.mark(t);else s.list.unmarkAll();s.panel.showBlock(u.id,new h(r),4);},this),p={id:n,combo:this,focus:function(){var r=a.document.getById(n).getChild(1);r.focus();},execute:o};l.on('mode',function(){this.setState(this.modes[l.mode]?2:0);},this);var q=e.addFunction(function(r,s){r=new d.event(r);var t=r.getKeystroke();switch(t){case 13:case 32:case 40:e.callFunction(o,s);break;default:p.onkey(p,t);}r.preventDefault();});m.push('<span class="cke_rcombo">','<span id=',n);if(this.className)m.push(' class="',this.className,' cke_off"');m.push('><span class=cke_label>',this.label,'</span><a hidefocus=true title="',this.title,'" tabindex="-1" href="javascript:void(\'',this.label,"')\"");if(b.opera||b.gecko&&b.mac)m.push(' onkeypress="return false;"');if(b.gecko)m.push(' onblur="this.style.cssText = this.style.cssText;"');m.push(' onkeydown="CKEDITOR.tools.callFunction( ',q,', event, this );" onclick="CKEDITOR.tools.callFunction(',o,', this); return false;"><span><span class="cke_accessibility">'+(this.voiceLabel?this.voiceLabel+' ':'')+'</span>'+'<span id="'+n+'_text" class="cke_text cke_inline_label">'+this.label+'</span>'+'</span>'+'<span class=cke_openbutton></span>'+'</a>'+'</span>'+'</span>');if(this.onRender)this.onRender();return p;},createPanel:function(l){if(this._.panel)return;var m=this._.panelDefinition,n=m.parent||a.document.getBody(),o=new k.floatPanel(l,n,m),p=o.addListBlock(this.id,this.multiSelect),q=this;o.onShow=function(){if(q.className)this.element.getFirst().addClass(q.className+'_panel');q.setState(1);p.focus(!q.multiSelect&&q.getValue());q._.on=1;if(q.onOpen)q.onOpen();};o.onHide=function(){if(q.className)this.element.getFirst().removeClass(q.className+'_panel');q.setState(2);q._.on=0;if(q.onClose)q.onClose();};o.onEscape=function(){o.hide();q.document.getById('cke_'+q.id).getFirst().getNext().focus();};p.onClick=function(r,s){q.document.getWindow().focus();if(q.onClick)q.onClick.call(q,r,s);if(s)q.setValue(r,q._.items[r]);else q.setValue('');o.hide();};this._.panel=o;this._.list=p;o.getBlock(this.id).onHide=function(){q._.on=0;q.setState(2);};if(this.init)this.init();},setValue:function(l,m){var o=this;o._.value=l;var n=o.document.getById('cke_'+o.id+'_text');if(!l){m=o.label;n.addClass('cke_inline_label');}else n.removeClass('cke_inline_label');n.setHtml(typeof m!='undefined'?m:l);},getValue:function(){return this._.value||'';},unmarkAll:function(){this._.list.unmarkAll();},mark:function(l){this._.list.mark(l);
},hideItem:function(l){this._.list.hideItem(l);},hideGroup:function(l){this._.list.hideGroup(l);},showAll:function(){this._.list.showAll();},add:function(l,m,n){this._.items[l]=n||l;this._.list.add(l,m,n);},startGroup:function(l){this._.list.startGroup(l);},commit:function(){this._.list.commit();},setState:function(l){var m=this;if(m._.state==l)return;m.document.getById('cke_'+m.id).setState(l);m._.state=l;}}});k.prototype.addRichCombo=function(l,m){this.add(l,3,m);};j.add('htmlwriter');a.htmlWriter=e.createClass({base:a.htmlParser.basicWriter,$:function(){var n=this;n.base();n.indentationChars='\t';n.selfClosingEnd=' />';n.lineBreakChars='\n';n.forceSimpleAmpersand=false;n.sortAttributes=true;n._.indent=false;n._.indentation='';n._.rules={};var l=f;for(var m in e.extend({},l.$block,l.$listItem,l.$tableContent))n.setRules(m,{indent:true,breakBeforeOpen:true,breakAfterOpen:true,breakBeforeClose:!l[m]['#'],breakAfterClose:true});n.setRules('br',{breakAfterOpen:true});n.setRules('pre',{indent:false});},proto:{openTag:function(l,m){var o=this;var n=o._.rules[l];if(o._.indent)o.indentation();else if(n&&n.breakBeforeOpen){o.lineBreak();o.indentation();}o._.output.push('<',l);},openTagClose:function(l,m){var o=this;var n=o._.rules[l];if(m)o._.output.push(o.selfClosingEnd);else{o._.output.push('>');if(n&&n.indent)o._.indentation+=o.indentationChars;}if(n&&n.breakAfterOpen)o.lineBreak();},attribute:function(l,m){if(this.forceSimpleAmpersand)m=m.replace(/&amp;/,'&');this._.output.push(' ',l,'="',m,'"');},closeTag:function(l){var n=this;var m=n._.rules[l];if(m&&m.indent)n._.indentation=n._.indentation.substr(n.indentationChars.length);if(n._.indent)n.indentation();else if(m&&m.breakBeforeClose){n.lineBreak();n.indentation();}n._.output.push('</',l,'>');if(m&&m.breakAfterClose)n.lineBreak();},text:function(l){if(this._.indent){this.indentation();l=e.ltrim(l);}this._.output.push(l);},comment:function(l){if(this._.indent)this.indentation();this._.output.push('<!--',l,'-->');},lineBreak:function(){var l=this;if(l._.output.length>0)l._.output.push(l.lineBreakChars);l._.indent=true;},indentation:function(){this._.output.push(this._.indentation);this._.indent=false;},setRules:function(l,m){this._.rules[l]=m;}}});j.add('menubutton',{requires:['button','contextmenu'],beforeInit:function(l){l.ui.addHandler(5,k.menuButton.handler);}});a.UI_MENUBUTTON=5;(function(){var l=function(m){var n=this._;if(n.state===0)return;n.previousState=n.state;var o=n.menu;if(!o){o=n.menu=new j.contextMenu(m);
o.onHide=e.bind(function(){this.setState(n.previousState);},this);if(this.onMenu)o.addListener(this.onMenu);}if(n.on){o.hide();return;}this.setState(1);o.show(a.document.getById(this._.id),4);};k.menuButton=e.createClass({base:k.button,$:function(m){var n=m.panel;delete m.panel;this.base(m);this.hasArrow=true;this.click=l;},statics:{handler:{create:function(m){return new k.menuButton(m);}}}});})();j.add('dialog',{requires:['dialogui']});a.DIALOG_RESIZE_NONE=0;a.DIALOG_RESIZE_WIDTH=1;a.DIALOG_RESIZE_HEIGHT=2;a.DIALOG_RESIZE_BOTH=3;(function(){function l(L){return!!this._.tabs[L][0].$.offsetHeight;};function m(){var P=this;var L=P._.currentTabId,M=P._.tabIdList.length,N=e.indexOf(P._.tabIdList,L)+M;for(var O=N-1;O>N-M;O--)if(l.call(P,P._.tabIdList[O%M]))return P._.tabIdList[O%M];return null;};function n(){var P=this;var L=P._.currentTabId,M=P._.tabIdList.length,N=e.indexOf(P._.tabIdList,L);for(var O=N+1;O<N+M;O++)if(l.call(P,P._.tabIdList[O%M]))return P._.tabIdList[O%M];return null;};var o={};a.dialog=function(L,M){var N=a.dialog._.dialogDefinitions[M];if(!N){console.log('Error: The dialog "'+M+'" is not defined.');return;}N=e.extend(N(L),q);N=e.clone(N);N=new u(this,N);this.definition=N=a.fire('dialogDefinition',{name:M,definition:N},L).definition;var O=a.document,P=L.theme.buildDialog(L);this._={editor:L,element:P.element,name:M,contentSize:{width:0,height:0},size:{width:0,height:0},updateSize:false,contents:{},buttons:{},accessKeyMap:{},tabs:{},tabIdList:[],currentTabId:null,currentTabIndex:null,pageCount:0,lastTab:null,tabBarMode:false,focusList:[],currentFocusIndex:0,hasFocus:false};this.parts=P.parts;this.parts.dialog.setStyles({position:b.ie6Compat?'absolute':'fixed',top:0,left:0,visibility:'hidden'});a.event.call(this);if(N.onLoad)this.on('load',N.onLoad);if(N.onShow)this.on('show',N.onShow);if(N.onHide)this.on('hide',N.onHide);if(N.onOk)this.on('ok',function(Z){if(N.onOk.call(this,Z)===false)Z.data.hide=false;});if(N.onCancel)this.on('cancel',function(Z){if(N.onCancel.call(this,Z)===false)Z.data.hide=false;});var Q=this,R=function(Z){var aa=Q._.contents,ab=false;for(var ac in aa)for(var ad in aa[ac]){ab=Z.call(this,aa[ac][ad]);if(ab)return;}};this.on('ok',function(Z){R(function(aa){if(aa.validate){var ab=aa.validate(this);if(typeof ab=='string'){alert(ab);ab=false;}if(ab===false){if(aa.select)aa.select();else aa.focus();Z.data.hide=false;Z.stop();return true;}}});},this,null,0);this.on('cancel',function(Z){R(function(aa){if(aa.isChanged()){if(!confirm(L.lang.common.confirmCancel))Z.data.hide=false;
return true;}});},this,null,0);this.parts.close.on('click',function(Z){if(this.fire('cancel',{hide:true}).hide!==false)this.hide();},this);function S(Z){var aa=Q._.focusList,ab=Z?1:-1;if(aa.length<1)return;var ac=(Q._.currentFocusIndex+ab+aa.length)%(aa.length);while(!aa[ac].isFocusable()){ac=(ac+ab+aa.length)%(aa.length);if(ac==Q._.currentFocusIndex)break;}aa[ac].focus();if(aa[ac].type=='text')aa[ac].select();};function T(Z){if(Q!=a.dialog._.currentTop)return;var aa=Z.data.getKeystroke(),ab=false;if(aa==9||aa==2000+9){var ac=aa==2000+9;if(Q._.tabBarMode){var ad=ac?m.call(Q):n.call(Q);Q.selectPage(ad);Q._.tabs[ad][0].focus();}else S(!ac);ab=true;}else if(aa==4000+121&&!Q._.tabBarMode){Q._.tabBarMode=true;Q._.tabs[Q._.currentTabId][0].focus();ab=true;}else if((aa==37||aa==39)&&(Q._.tabBarMode)){ad=aa==37?m.call(Q):n.call(Q);Q.selectPage(ad);Q._.tabs[ad][0].focus();ab=true;}if(ab){Z.stop();Z.data.preventDefault();}};this.on('show',function(){a.document.on('keydown',T,this,null,0);if(b.ie6Compat){var Z=z.getChild(0).getFrameDocument();Z.on('keydown',T,this,null,0);}});this.on('hide',function(){a.document.removeListener('keydown',T);});this.on('iframeAdded',function(Z){var aa=new g(Z.data.iframe.$.contentWindow.document);aa.on('keydown',T,this,null,0);});this.on('show',function(){var ac=this;if(!ac._.hasFocus){ac._.currentFocusIndex=-1;S(true);if(ac._.editor.mode=='wysiwyg'&&c){var Z=L.document.$.selection,aa=Z.createRange();if(aa)if(aa.parentElement&&aa.parentElement().ownerDocument==L.document.$||aa.item&&aa.item(0).ownerDocument==L.document.$){var ab=document.body.createTextRange();ab.moveToElementText(ac.getElement().getFirst().$);ab.collapse(true);ab.select();}}}},this,null,4294967295);if(b.ie6Compat)this.on('load',function(Z){var aa=this.getElement(),ab=aa.getFirst();ab.remove();ab.appendTo(aa);},this);w(this);x(this);new d.text(N.title,a.document).appendTo(this.parts.title);for(var U=0;U<N.contents.length;U++)this.addPage(N.contents[U]);var V=/cke_dialog_tab(\s|$|_)/,W=/cke_dialog_tab(\s|$)/;this.parts.tabs.on('click',function(Z){var ae=this;var aa=Z.data.getTarget(),ab=aa,ac,ad;if(!(V.test(aa.$.className)||aa.getName()=='a'))return;ac=aa.$.id.substr(0,aa.$.id.lastIndexOf('_'));ae.selectPage(ac);if(ae._.tabBarMode){ae._.tabBarMode=false;ae._.currentFocusIndex=-1;S(true);}Z.data.preventDefault();},this);var X=[],Y=a.dialog._.uiElementBuilders.hbox.build(this,{type:'hbox',className:'cke_dialog_footer_buttons',widths:[],children:N.buttons},X).getChild();this.parts.footer.setHtml(X.join(''));
for(U=0;U<Y.length;U++)this._.buttons[Y[U].id]=Y[U];a.skins.load(L,'dialog');};function p(L,M,N){this.element=M;this.focusIndex=N;this.isFocusable=function(){return true;};this.focus=function(){L._.currentFocusIndex=this.focusIndex;this.element.focus();};M.on('keydown',function(O){if(O.data.getKeystroke() in {32:1,13:1})this.fire('click');});M.on('focus',function(){this.fire('mouseover');});M.on('blur',function(){this.fire('mouseout');});};a.dialog.prototype={resize:(function(){return function(L,M){var N=this;if(N._.contentSize&&N._.contentSize.width==L&&N._.contentSize.height==M)return;a.dialog.fire('resize',{dialog:N,skin:N._.editor.skinName,width:L,height:M},N._.editor);N._.contentSize={width:L,height:M};N._.updateSize=true;};})(),getSize:function(){var N=this;if(!N._.updateSize)return N._.size;var L=N._.element.getFirst(),M=N._.size={width:L.$.offsetWidth||0,height:L.$.offsetHeight||0};N._.updateSize=!M.width||!M.height;return M;},move:(function(){var L;return function(M,N){var Q=this;var O=Q._.element.getFirst();if(L===undefined)L=O.getComputedStyle('position')=='fixed';if(L&&Q._.position&&Q._.position.x==M&&Q._.position.y==N)return;Q._.position={x:M,y:N};if(!L){var P=a.document.getWindow().getScrollPosition();M+=P.x;N+=P.y;}O.setStyles({left:(M>0?M:0)+('px'),top:(N>0?N:0)+('px')});};})(),getPosition:function(){return e.extend({},this._.position);},show:function(){if(this._.editor.mode=='wysiwyg'&&c)this._.editor.getSelection().lock();var L=this._.element,M=this.definition;if(!(L.getParent()&&L.getParent().equals(a.document.getBody())))L.appendTo(a.document.getBody());else return;if(b.gecko&&b.version<10900){var N=this.parts.dialog;N.setStyle('position','absolute');setTimeout(function(){N.setStyle('position','fixed');},0);}this.resize(M.minWidth,M.minHeight);this.selectPage(this.definition.contents[0].id);this.reset();if(a.dialog._.currentZIndex===null)a.dialog._.currentZIndex=this._.editor.config.baseFloatZIndex;this._.element.getFirst().setStyle('z-index',a.dialog._.currentZIndex+=10);if(a.dialog._.currentTop===null){a.dialog._.currentTop=this;this._.parentDialog=null;A(this._.editor);a.document.on('keydown',D);a.document.on('keyup',E);for(var O in {keyup:1,keydown:1,keypress:1})a.document.on(O,K);}else{this._.parentDialog=a.dialog._.currentTop;var P=this._.parentDialog.getElement().getFirst();P.$.style.zIndex-=Math.floor(this._.editor.config.baseFloatZIndex/2);a.dialog._.currentTop=this;}F(this,this,'\x1b',null,function(){this.getButton('cancel')&&this.getButton('cancel').click();
});this._.hasFocus=false;e.setTimeout(function(){var Q=a.document.getWindow().getViewPaneSize(),R=this.getSize();this.move((Q.width-M.minWidth)/(2),(Q.height-R.height)/(2));this.parts.dialog.setStyle('visibility','');this.fireOnce('load',{});this.fire('show',{});this.foreach(function(S){S.setInitValue&&S.setInitValue();});},100,this);},foreach:function(L){var O=this;for(var M in O._.contents)for(var N in O._.contents[M])L(O._.contents[M][N]);return O;},reset:(function(){var L=function(M){if(M.reset)M.reset();};return function(){this.foreach(L);return this;};})(),setupContent:function(){var L=arguments;this.foreach(function(M){if(M.setup)M.setup.apply(M,L);});},commitContent:function(){var L=arguments;this.foreach(function(M){if(M.commit)M.commit.apply(M,L);});},hide:function(){this.fire('hide',{});var L=this._.element;if(!L.getParent())return;L.remove();this.parts.dialog.setStyle('visibility','hidden');G(this);if(!this._.parentDialog)B();else{var M=this._.parentDialog.getElement().getFirst();M.setStyle('z-index',parseInt(M.$.style.zIndex,10)+Math.floor(this._.editor.config.baseFloatZIndex/2));}a.dialog._.currentTop=this._.parentDialog;if(!this._.parentDialog){a.dialog._.currentZIndex=null;a.document.removeListener('keydown',D);a.document.removeListener('keyup',E);a.document.removeListener('keypress',E);for(var N in {keyup:1,keydown:1,keypress:1})a.document.removeListener(N,K);var O=this._.editor;O.focus();if(O.mode=='wysiwyg'&&c)O.getSelection().unlock(true);}else a.dialog._.currentZIndex-=10;this.foreach(function(P){P.resetInitValue&&P.resetInitValue();});},addPage:function(L){var V=this;var M=[],N=L.label?' title="'+e.htmlEncode(L.label)+'"':'',O=L.elements,P=a.dialog._.uiElementBuilders.vbox.build(V,{type:'vbox',className:'cke_dialog_page_contents',children:L.elements,expand:!!L.expand,padding:L.padding,style:L.style||'width: 100%; height: 100%;'},M),Q=h.createFromHtml(M.join('')),R=h.createFromHtml(['<a class="cke_dialog_tab"',V._.pageCount>0?' cke_last':'cke_first',N,!!L.hidden?' style="display:none"':'',' id="',L.id+'_',e.getNextNumber(),'" href="javascript:void(0)"',' hidefocus="true">',L.label,'</a>'].join(''));if(V._.pageCount===0)V.parts.dialog.addClass('cke_single_page');else V.parts.dialog.removeClass('cke_single_page');V._.tabs[L.id]=[R,Q];V._.tabIdList.push(L.id);V._.pageCount++;V._.lastTab=R;var S=V._.contents[L.id]={},T,U=P.getChild();while(T=U.shift()){S[T.id]=T;if(typeof T.getChild=='function')U.push.apply(U,T.getChild());}Q.setAttribute('name',L.id);
Q.appendTo(V.parts.contents);R.unselectable();V.parts.tabs.append(R);if(L.accessKey){F(V,V,'CTRL+'+L.accessKey,I,H);V._.accessKeyMap['CTRL+'+L.accessKey]=L.id;}},selectPage:function(L){var Q=this;for(var M in Q._.tabs){var N=Q._.tabs[M][0],O=Q._.tabs[M][1];if(M!=L){N.removeClass('cke_dialog_tab_selected');O.hide();}}var P=Q._.tabs[L];P[0].addClass('cke_dialog_tab_selected');P[1].show();Q._.currentTabId=L;Q._.currentTabIndex=e.indexOf(Q._.tabIdList,L);},hidePage:function(L){var M=this._.tabs[L]&&this._.tabs[L][0];if(!M)return;M.hide();},showPage:function(L){var M=this._.tabs[L]&&this._.tabs[L][0];if(!M)return;M.show();},getElement:function(){return this._.element;},getName:function(){return this._.name;},getContentElement:function(L,M){return this._.contents[L][M];},getValueOf:function(L,M){return this.getContentElement(L,M).getValue();},setValueOf:function(L,M,N){return this.getContentElement(L,M).setValue(N);},getButton:function(L){return this._.buttons[L];},click:function(L){return this._.buttons[L].click();},disableButton:function(L){return this._.buttons[L].disable();},enableButton:function(L){return this._.buttons[L].enable();},getPageCount:function(){return this._.pageCount;},getParentEditor:function(){return this._.editor;},getSelectedElement:function(){return this.getParentEditor().getSelection().getSelectedElement();},addFocusable:function(L,M){var O=this;if(typeof M=='undefined'){M=O._.focusList.length;O._.focusList.push(new p(O,L,M));}else{O._.focusList.splice(M,0,new p(O,L,M));for(var N=M+1;N<O._.focusList.length;N++)O._.focusList[N].focusIndex++;}}};e.extend(a.dialog,{add:function(L,M){if(!this._.dialogDefinitions[L]||typeof M=='function')this._.dialogDefinitions[L]=M;},exists:function(L){return!!this._.dialogDefinitions[L];},getCurrent:function(){return a.dialog._.currentTop;},okButton:(function(){var L=function(M,N){N=N||{};return e.extend({id:'ok',type:'button',label:M.lang.common.ok,'class':'cke_dialog_ui_button_ok',onClick:function(O){var P=O.data.dialog;if(P.fire('ok',{hide:true}).hide!==false)P.hide();}},N,true);};L.type='button';L.override=function(M){return e.extend(function(N){return L(N,M);},{type:'button'},true);};return L;})(),cancelButton:(function(){var L=function(M,N){N=N||{};return e.extend({id:'cancel',type:'button',label:M.lang.common.cancel,'class':'cke_dialog_ui_button_cancel',onClick:function(O){var P=O.data.dialog;if(P.fire('cancel',{hide:true}).hide!==false)P.hide();}},N,true);};L.type='button';L.override=function(M){return e.extend(function(N){return L(N,M);
},{type:'button'},true);};return L;})(),addUIElement:function(L,M){this._.uiElementBuilders[L]=M;}});a.dialog._={uiElementBuilders:{},dialogDefinitions:{},currentTop:null,currentZIndex:null};a.event.implementOn(a.dialog);a.event.implementOn(a.dialog.prototype,true);var q={resizable:0,minWidth:600,minHeight:400,buttons:[a.dialog.okButton,a.dialog.cancelButton]},r=function(L,M,N){for(var O=0,P;P=L[O];O++){if(P.id==M)return P;if(N&&P[N]){var Q=r(P[N],M,N);if(Q)return Q;}}return null;},s=function(L,M,N,O,P){if(N){for(var Q=0,R;R=L[Q];Q++){if(R.id==N){L.splice(Q,0,M);return M;}if(O&&R[O]){var S=s(R[O],M,N,O,true);if(S)return S;}}if(P)return null;}L.push(M);return M;},t=function(L,M,N){for(var O=0,P;P=L[O];O++){if(P.id==M)return L.splice(O,1);if(N&&P[N]){var Q=t(P[N],M,N);if(Q)return Q;}}return null;},u=function(L,M){this.dialog=L;var N=M.contents;for(var O=0,P;P=N[O];O++)N[O]=new v(L,P);e.extend(this,M);};u.prototype={getContents:function(L){return r(this.contents,L);},getButton:function(L){return r(this.buttons,L);},addContents:function(L,M){return s(this.contents,L,M);},addButton:function(L,M){return s(this.buttons,L,M);},removeContents:function(L){t(this.contents,L);},removeButton:function(L){t(this.buttons,L);}};function v(L,M){this._={dialog:L};e.extend(this,M);};v.prototype={get:function(L){return r(this.elements,L,'children');},add:function(L,M){return s(this.elements,L,M,'children');},remove:function(L){t(this.elements,L,'children');}};function w(L){var M=null,N=null,O=L.getElement().getFirst(),P=L.getParentEditor(),Q=P.config.dialog_magnetDistance,R=o[P.skinName].margins||[0,0,0,0];if(typeof Q=='undefined')Q=20;function S(U){var V=L.getSize(),W=a.document.getWindow().getViewPaneSize(),X=U.data.$.screenX,Y=U.data.$.screenY,Z=X-M.x,aa=Y-M.y,ab,ac;M={x:X,y:Y};N.x+=Z;N.y+=aa;if(N.x+R[3]<Q)ab=-R[3];else if(N.x-R[1]>W.width-V.width-Q)ab=W.width-V.width+R[1];else ab=N.x;if(N.y+R[0]<Q)ac=-R[0];else if(N.y-R[2]>W.height-V.height-Q)ac=W.height-V.height+R[2];else ac=N.y;L.move(ab,ac);U.data.preventDefault();};function T(U){a.document.removeListener('mousemove',S);a.document.removeListener('mouseup',T);if(b.ie6Compat){var V=z.getChild(0).getFrameDocument();V.removeListener('mousemove',S);V.removeListener('mouseup',T);}};L.parts.title.on('mousedown',function(U){L._.updateSize=true;M={x:U.data.$.screenX,y:U.data.$.screenY};a.document.on('mousemove',S);a.document.on('mouseup',T);N=L.getPosition();if(b.ie6Compat){var V=z.getChild(0).getFrameDocument();V.on('mousemove',S);
V.on('mouseup',T);}U.data.preventDefault();},L);};function x(L){var M=L.definition,N=M.minWidth||0,O=M.minHeight||0,P=M.resizable,Q=o[L.getParentEditor().skinName].margins||[0,0,0,0];function R(ac,ad){ac.y+=ad;};function S(ac,ad){ac.x2+=ad;};function T(ac,ad){ac.y2+=ad;};function U(ac,ad){ac.x+=ad;};var V=null,W=null,X=L._.editor.config.magnetDistance,Y=['tl','t','tr','l','r','bl','b','br'];function Z(ac){var ad=ac.listenerData.part,ae=L.getSize();W=L.getPosition();e.extend(W,{x2:W.x+ae.width,y2:W.y+ae.height});V={x:ac.data.$.screenX,y:ac.data.$.screenY};a.document.on('mousemove',aa,L,{part:ad});a.document.on('mouseup',ab,L,{part:ad});if(b.ie6Compat){var af=z.getChild(0).getFrameDocument();af.on('mousemove',aa,L,{part:ad});af.on('mouseup',ab,L,{part:ad});}ac.data.preventDefault();};function aa(ac){var ad=ac.data.$.screenX,ae=ac.data.$.screenY,af=ad-V.x,ag=ae-V.y,ah=a.document.getWindow().getViewPaneSize(),ai=ac.listenerData.part;if(ai.search('t')!=-1)R(W,ag);if(ai.search('l')!=-1)U(W,af);if(ai.search('b')!=-1)T(W,ag);if(ai.search('r')!=-1)S(W,af);V={x:ad,y:ae};var aj,ak,al,am;if(W.x+Q[3]<X)aj=-Q[3];else if(ai.search('l')!=-1&&W.x2-W.x<N+X)aj=W.x2-N;else aj=W.x;if(W.y+Q[0]<X)ak=-Q[0];else if(ai.search('t')!=-1&&W.y2-W.y<O+X)ak=W.y2-O;else ak=W.y;if(W.x2-Q[1]>ah.width-X)al=ah.width+Q[1];else if(ai.search('r')!=-1&&W.x2-W.x<N+X)al=W.x+N;else al=W.x2;if(W.y2-Q[2]>ah.height-X)am=ah.height+Q[2];else if(ai.search('b')!=-1&&W.y2-W.y<O+X)am=W.y+O;else am=W.y2;L.move(aj,ak);L.resize(al-aj,am-ak);ac.data.preventDefault();};function ab(ac){a.document.removeListener('mouseup',ab);a.document.removeListener('mousemove',aa);if(b.ie6Compat){var ad=z.getChild(0).getFrameDocument();ad.removeListener('mouseup',ab);ad.removeListener('mousemove',aa);}};};var y,z,A=function(L){var M=a.document.getWindow();if(!z){var N=['<div style="position: ',b.ie6Compat?'absolute':'fixed','; z-index: ',L.config.baseFloatZIndex,'; top: 0px; left: 0px; ','background-color: ',L.config.dialog_backgroundCoverColor||'white','" id="cke_dialog_background_cover">'];if(b.ie6Compat){var O=b.isCustomDomain();N.push('<iframe hidefocus="true" frameborder="0" id="cke_dialog_background_iframe" src="javascript:');N.push(O?"void((function(){document.open();document.domain='"+document.domain+"';"+'document.close();'+'})())':"''");N.push('" style="position:absolute;left:0;top:0;width:100%;height: 100%;progid:DXImageTransform.Microsoft.Alpha(opacity=0)"></iframe>');}N.push('</div>');z=h.createFromHtml(N.join(''));}var P=z,Q=function(){var U=M.getViewPaneSize();
P.setStyles({width:U.width+'px',height:U.height+'px'});},R=function(){var U=M.getScrollPosition(),V=a.dialog._.currentTop;P.setStyles({left:U.x+'px',top:U.y+'px'});do{var W=V.getPosition();V.move(W.x,W.y);}while(V=V._.parentDialog)};y=Q;M.on('resize',Q);Q();if(b.ie6Compat){var S=function(){R();arguments.callee.prevScrollHandler.apply(this,arguments);};M.$.setTimeout(function(){S.prevScrollHandler=window.onscroll||(function(){});window.onscroll=S;},0);R();}var T=L.config.dialog_backgroundCoverOpacity;P.setOpacity(typeof T!='undefined'?T:0.5);P.appendTo(a.document.getBody());},B=function(){if(!z)return;var L=a.document.getWindow();z.remove();L.removeListener('resize',y);if(b.ie6Compat)L.$.setTimeout(function(){var M=window.onscroll&&window.onscroll.prevScrollHandler;window.onscroll=M||null;},0);y=null;},C={},D=function(L){var M=L.data.$.ctrlKey||L.data.$.metaKey,N=L.data.$.altKey,O=L.data.$.shiftKey,P=String.fromCharCode(L.data.$.keyCode),Q=C[(M?'CTRL+':'')+(N?'ALT+':'')+(O?'SHIFT+':'')+P];if(!Q||!Q.length)return;Q=Q[Q.length-1];Q.keydown&&Q.keydown.call(Q.uiElement,Q.dialog,Q.key);L.data.preventDefault();},E=function(L){var M=L.data.$.ctrlKey||L.data.$.metaKey,N=L.data.$.altKey,O=L.data.$.shiftKey,P=String.fromCharCode(L.data.$.keyCode),Q=C[(M?'CTRL+':'')+(N?'ALT+':'')+(O?'SHIFT+':'')+P];if(!Q||!Q.length)return;Q=Q[Q.length-1];Q.keyup&&Q.keyup.call(Q.uiElement,Q.dialog,Q.key);L.data.preventDefault();},F=function(L,M,N,O,P){var Q=C[N]||(C[N]=[]);Q.push({uiElement:L,dialog:M,key:N,keyup:P||L.accessKeyUp,keydown:O||L.accessKeyDown});},G=function(L){for(var M in C){var N=C[M];for(var O=N.length-1;O>=0;O--)if(N[O].dialog==L||N[O].uiElement==L)N.splice(O,1);if(N.length===0)delete C[M];}},H=function(L,M){if(L._.accessKeyMap[M])L.selectPage(L._.accessKeyMap[M]);},I=function(L,M){},J={27:1,13:1},K=function(L){if(L.data.getKeystroke() in J)L.data.stopPropagation();};(function(){k.dialog={uiElement:function(L,M,N,O,P,Q,R){if(arguments.length<4)return;var S=(O.call?O(M):O)||('div'),T=['<',S,' '],U=(P&&P.call?P(M):P)||({}),V=(Q&&Q.call?Q(M):Q)||({}),W=(R&&R.call?R(L,M):R)||(''),X=this.domId=V.id||e.getNextNumber()+'_uiElement',Y=this.id=M.id,Z;V.id=X;var aa={};if(M.type)aa['cke_dialog_ui_'+M.type]=1;if(M.className)aa[M.className]=1;var ab=V['class']&&V['class'].split?V['class'].split(' '):[];for(Z=0;Z<ab.length;Z++)if(ab[Z])aa[ab[Z]]=1;var ac=[];for(Z in aa)ac.push(Z);V['class']=ac.join(' ');if(M.title)V.title=M.title;var ad=(M.style||'').split(';');for(Z in U)ad.push(Z+':'+U[Z]);
if(M.hidden)ad.push('display:none');for(Z=ad.length-1;Z>=0;Z--)if(ad[Z]==='')ad.splice(Z,1);if(ad.length>0)V.style=(V.style?V.style+'; ':'')+(ad.join('; '));for(Z in V)T.push(Z+'="'+e.htmlEncode(V[Z])+'" ');T.push('>',W,'</',S,'>');N.push(T.join(''));(this._||(this._={})).dialog=L;if(typeof M.isChanged=='boolean')this.isChanged=function(){return M.isChanged;};if(typeof M.isChanged=='function')this.isChanged=M.isChanged;a.event.implementOn(this);this.registerEvents(M);if(this.accessKeyUp&&this.accessKeyDown&&M.accessKey)F(this,L,'CTRL+'+M.accessKey);var ae=this;L.on('load',function(){if(ae.getInputElement())ae.getInputElement().on('focus',function(){L._.tabBarMode=false;L._.hasFocus=true;ae.fire('focus');},ae);});if(this.keyboardFocusable){this.focusIndex=L._.focusList.push(this)-1;this.on('focus',function(){L._.currentFocusIndex=ae.focusIndex;});}e.extend(this,M);},hbox:function(L,M,N,O,P){if(arguments.length<4)return;this._||(this._={});var Q=this._.children=M,R=P&&P.widths||null,S=P&&P.height||null,T={},U,V=function(){var W=['<tbody><tr class="cke_dialog_ui_hbox">'];for(U=0;U<N.length;U++){var X='cke_dialog_ui_hbox_child',Y=[];if(U===0)X='cke_dialog_ui_hbox_first';if(U==N.length-1)X='cke_dialog_ui_hbox_last';W.push('<td class="',X,'" ');if(R){if(R[U])Y.push('width:'+e.cssLength(R[U]));}else Y.push('width:'+Math.floor(100/N.length)+'%');if(S)Y.push('height:'+e.cssLength(S));if(P&&P.padding!=undefined)Y.push('padding:'+e.cssLength(P.padding));if(Y.length>0)W.push('style="'+Y.join('; ')+'" ');W.push('>',N[U],'</td>');}W.push('</tr></tbody>');return W.join('');};k.dialog.uiElement.call(this,L,P||{type:'hbox'},O,'table',T,P&&P.align&&{align:P.align}||null,V);},vbox:function(L,M,N,O,P){if(arguments.length<3)return;this._||(this._={});var Q=this._.children=M,R=P&&P.width||null,S=P&&P.heights||null,T=function(){var U=['<table cellspacing="0" border="0" '];U.push('style="');if(P&&P.expand)U.push('height:100%;');U.push('width:'+e.cssLength(R||'100%'),';');U.push('"');U.push('align="',e.htmlEncode(P&&P.align||(L.getParentEditor().lang.dir=='ltr'?'left':'right')),'" ');U.push('><tbody>');for(var V=0;V<N.length;V++){var W=[];U.push('<tr><td ');if(R)W.push('width:'+e.cssLength(R||'100%'));if(S)W.push('height:'+e.cssLength(S[V]));else if(P&&P.expand)W.push('height:'+Math.floor(100/N.length)+'%');if(P&&P.padding!=undefined)W.push('padding:'+e.cssLength(P.padding));if(W.length>0)U.push('style="',W.join('; '),'" ');U.push(' class="cke_dialog_ui_vbox_child">',N[V],'</td></tr>');
}U.push('</tbody></table>');return U.join('');};k.dialog.uiElement.call(this,L,P||{type:'vbox'},O,'div',null,null,T);}};})();k.dialog.uiElement.prototype={getElement:function(){return a.document.getById(this.domId);},getInputElement:function(){return this.getElement();},getDialog:function(){return this._.dialog;},setValue:function(L){this.getInputElement().setValue(L);this.fire('change',{value:L});return this;},getValue:function(){return this.getInputElement().getValue();},isChanged:function(){return false;},selectParentTab:function(){var O=this;var L=O.getInputElement(),M=L,N;while((M=M.getParent())&&(M.$.className.search('cke_dialog_page_contents')==-1)){}if(!M)return O;N=M.getAttribute('name');if(O._.dialog._.currentTabId!=N)O._.dialog.selectPage(N);return O;},focus:function(){this.selectParentTab().getInputElement().focus();return this;},registerEvents:function(L){var M=/^on([A-Z]\w+)/,N,O=function(Q,R,S,T){R.on('load',function(){Q.getInputElement().on(S,T,Q);});};for(var P in L){if(!(N=P.match(M)))continue;if(this.eventProcessors[P])this.eventProcessors[P].call(this,this._.dialog,L[P]);else O(this,this._.dialog,N[1].toLowerCase(),L[P]);}return this;},eventProcessors:{onLoad:function(L,M){L.on('load',M,this);},onShow:function(L,M){L.on('show',M,this);},onHide:function(L,M){L.on('hide',M,this);}},accessKeyDown:function(L,M){this.focus();},accessKeyUp:function(L,M){},disable:function(){var L=this.getInputElement();L.setAttribute('disabled','true');L.addClass('cke_disabled');},enable:function(){var L=this.getInputElement();L.removeAttribute('disabled');L.removeClass('cke_disabled');},isEnabled:function(){return!this.getInputElement().getAttribute('disabled');},isVisible:function(){return!!this.getInputElement().$.offsetHeight;},isFocusable:function(){if(!this.isEnabled()||!this.isVisible())return false;return true;}};k.dialog.hbox.prototype=e.extend(new k.dialog.uiElement(),{getChild:function(L){var M=this;if(arguments.length<1)return M._.children.concat();if(!L.splice)L=[L];if(L.length<2)return M._.children[L[0]];else return M._.children[L[0]]&&M._.children[L[0]].getChild?M._.children[L[0]].getChild(L.slice(1,L.length)):null;}},true);k.dialog.vbox.prototype=new k.dialog.hbox();(function(){var L={build:function(M,N,O){var P=N.children,Q,R=[],S=[];for(var T=0;T<P.length&&(Q=P[T]);T++){var U=[];R.push(U);S.push(a.dialog._.uiElementBuilders[Q.type].build(M,Q,U));}return new k.dialog[N.type](M,S,R,O,N);}};a.dialog.addUIElement('hbox',L);a.dialog.addUIElement('vbox',L);
})();a.dialogCommand=function(L){this.dialogName=L;};a.dialogCommand.prototype={exec:function(L){L.openDialog(this.dialogName);},canUndo:false};(function(){var L=/^([a]|[^a])+$/,M=/^\d*$/,N=/^\d*(?:\.\d+)?$/;a.VALIDATE_OR=1;a.VALIDATE_AND=2;a.dialog.validate={functions:function(){return function(){var U=this;var O=U&&U.getValue?U.getValue():arguments[0],P=undefined,Q=2,R=[],S;for(S=0;S<arguments.length;S++)if(typeof arguments[S]=='function')R.push(arguments[S]);else break;if(S<arguments.length&&typeof arguments[S]=='string'){P=arguments[S];S++;}if(S<arguments.length&&typeof arguments[S]=='number')Q=arguments[S];var T=Q==2?true:false;for(S=0;S<R.length;S++)if(Q==2)T=T&&R[S](O);else T=T||R[S](O);if(!T){if(P!==undefined)alert(P);if(U&&(U.select||U.focus))U.select||U.focus();return false;}return true;};},regex:function(O,P){return function(){var R=this;var Q=R&&R.getValue?R.getValue():arguments[0];if(!O.test(Q)){if(P!==undefined)alert(P);if(R&&(R.select||R.focus))if(R.select)R.select();else R.focus();return false;}return true;};},notEmpty:function(O){return this.regex(L,O);},integer:function(O){return this.regex(M,O);},number:function(O){return this.regex(N,O);},equals:function(O,P){return this.functions(function(Q){return Q==O;},P);},notEqual:function(O,P){return this.functions(function(Q){return Q!=O;},P);}};})();a.skins.add=(function(){var L=a.skins.add;return function(M,N){o[M]={margins:N.margins};return L.apply(this,arguments);};})();})();e.extend(a.editor.prototype,{openDialog:function(l){var m=a.dialog._.dialogDefinitions[l];if(typeof m=='function'){var n=this._.storedDialogs||(this._.storedDialogs={}),o=n[l]||(n[l]=new a.dialog(this,l));o.show();return o;}else if(m=='failed')throw new Error('[CKEDITOR.dialog.openDialog] Dialog "'+l+'" failed when loading definition.');var p=a.document.getBody(),q=p.$.style.cursor,r=this;p.setStyle('cursor','wait');a.scriptLoader.load(a.getUrl(m),function(){if(typeof a.dialog._.dialogDefinitions[l]!='function')a.dialog._.dialogDefinitions[l]='failed';r.openDialog(l);p.setStyle('cursor',q);});return null;}});(function(){var l=function(n,o){return n._.modes&&n._.modes[o||n.mode];},m;j.add('editingblock',{init:function(n){if(!n.config.editingBlock)return;n.on('themeSpace',function(o){if(o.data.space=='contents')o.data.html+='<br>';});n.on('themeLoaded',function(){n.fireOnce('editingBlockReady');});n.on('uiReady',function(){n.setMode(n.config.startupMode);});n.on('afterSetData',function(){if(!m){function o(){m=true;l(n).loadData(n.getData());
m=false;};if(n.mode)o();else n.on('mode',function(){o();n.removeListener('mode',arguments.callee);});}});n.on('beforeGetData',function(){if(!m&&n.mode){m=true;n.setData(l(n).getData());m=false;}});n.on('getSnapshot',function(o){if(n.mode)o.data=l(n).getSnapshotData();});n.on('loadSnapshot',function(o){if(n.mode)l(n).loadSnapshotData(o.data);});n.on('mode',function(o){o.removeListener();var p=n.container;if(b.webkit&&b.version<528){var q=n.config.tabIndex||n.element.getAttribute('tabindex')||0;p=p.append(h.createFromHtml('<input tabindex="'+q+'"'+' style="position:absolute; left:-10000">'));}p.on('focus',function(){n.focus();});if(n.config.startupFocus)n.focus();setTimeout(function(){n.fireOnce('instanceReady');a.fire('instanceReady',null,n);});});}});a.editor.prototype.mode='';a.editor.prototype.addMode=function(n,o){o.name=n;(this._.modes||(this._.modes={}))[n]=o;};a.editor.prototype.setMode=function(n){var o,p=this.getThemeSpace('contents'),q=this.checkDirty();if(this.mode){if(n==this.mode)return;this.fire('beforeModeUnload');var r=l(this);o=r.getData();r.unload(p);this.mode='';}p.setHtml('');var s=l(this,n);if(!s)throw '[CKEDITOR.editor.setMode] Unknown mode "'+n+'".';if(!q)this.on('mode',function(){this.resetDirty();this.removeListener('mode',arguments.callee);});s.load(p,typeof o!='string'?this.getData():o);};a.editor.prototype.focus=function(){var n=l(this);if(n)n.focus();};})();i.startupMode='wysiwyg';i.startupFocus=false;i.editingBlock=true;j.add('panel',{beforeInit:function(l){l.ui.addHandler(2,k.panel.handler);}});a.UI_PANEL=2;k.panel=function(l,m){var n=this;if(m)e.extend(n,m);e.extend(n,{className:'',css:[]});n.id=e.getNextNumber();n.document=l;n._={blocks:{}};};k.panel.handler={create:function(l){return new k.panel(l);}};k.panel.prototype={renderHtml:function(l){var m=[];this.render(l,m);return m.join('');},render:function(l,m){var o=this;var n='cke_'+o.id;m.push('<div class="',l.skinClass,'" lang="',l.langCode,'" style="display:none;z-index:'+(l.config.baseFloatZIndex+1)+'">'+'<div'+' id=',n,' dir=',l.lang.dir,' class="cke_panel cke_',l.lang.dir);if(o.className)m.push(' ',o.className);m.push('">');if(o.forceIFrame||o.css.length){m.push('<iframe id="',n,'_frame" frameborder="0" src="javascript:void(');m.push(b.isCustomDomain()?"(function(){document.open();document.domain='"+document.domain+"';"+'document.close();'+'})()':'0');m.push(')"></iframe>');}m.push('</div></div>');return n;},getHolderElement:function(){var l=this._.holder;if(!l){if(this.forceIFrame||this.css.length){var m=this.document.getById('cke_'+this.id+'_frame'),n=m.getParent(),o=n.getAttribute('dir'),p=n.getParent().getAttribute('class'),q=n.getParent().getAttribute('lang'),r=m.getFrameDocument();
r.$.open();if(b.isCustomDomain())r.$.domain=document.domain;var s=e.addFunction(e.bind(function(u){this.isLoaded=true;if(this.onLoad)this.onLoad();},this));r.$.write('<!DOCTYPE html><html dir="'+o+'" class="'+p+'_container" lang="'+q+'">'+'<head>'+'<style>.'+p+'_container{visibility:hidden}</style>'+'</head>'+'<body class="cke_'+o+' cke_panel_frame '+b.cssClass+'" style="margin:0;padding:0"'+' onload="( window.CKEDITOR || window.parent.CKEDITOR ).tools.callFunction('+s+');">'+'</body>'+'<link type="text/css" rel=stylesheet href="'+this.css.join('"><link type="text/css" rel="stylesheet" href="')+'">'+'</html>');r.$.close();var t=r.getWindow();t.$.CKEDITOR=a;r.on('keydown',function(u){var w=this;var v=u.data.getKeystroke();if(w._.onKeyDown&&w._.onKeyDown(v)===false){u.data.preventDefault();return;}if(v==27)w.onEscape&&w.onEscape();},this);l=r.getBody();}else l=this.document.getById('cke_'+this.id);this._.holder=l;}return l;},addBlock:function(l,m){var n=this;m=n._.blocks[l]=m||new k.panel.block(n.getHolderElement());if(!n._.currentBlock)n.showBlock(l);return m;},getBlock:function(l){return this._.blocks[l];},showBlock:function(l){var p=this;var m=p._.blocks,n=m[l],o=p._.currentBlock;if(o)o.hide();p._.currentBlock=n;n._.focusIndex=-1;p._.onKeyDown=n.onKeyDown&&e.bind(n.onKeyDown,n);n.show();return n;}};k.panel.block=e.createClass({$:function(l){var m=this;m.element=l.append(l.getDocument().createElement('div',{attributes:{'class':'cke_panel_block'},styles:{display:'none'}}));m.keys={};m._.focusIndex=-1;m.element.disableContextMenu();},_:{},proto:{show:function(){this.element.setStyle('display','');},hide:function(){var l=this;if(!l.onHide||l.onHide.call(l)!==true)l.element.setStyle('display','none');},onKeyDown:function(l){var q=this;var m=q.keys[l];switch(m){case 'next':var n=q._.focusIndex,o=q.element.getElementsByTag('a'),p;while(p=o.getItem(++n))if(p.getAttribute('_cke_focus')&&p.$.offsetWidth){q._.focusIndex=n;p.focus();break;}return false;case 'prev':n=q._.focusIndex;o=q.element.getElementsByTag('a');while(n>0&&(p=o.getItem(--n)))if(p.getAttribute('_cke_focus')&&p.$.offsetWidth){q._.focusIndex=n;p.focus();break;}return false;case 'click':n=q._.focusIndex;p=n>=0&&q.element.getElementsByTag('a').getItem(n);if(p)p.$.click?p.$.click():p.$.onclick();return false;}return true;}}});j.add('listblock',{requires:['panel'],onLoad:function(){k.panel.prototype.addListBlock=function(l,m){return this.addBlock(l,new k.listBlock(this.getHolderElement(),m));};k.listBlock=e.createClass({base:k.panel.block,$:function(l,m){var o=this;
o.base(l);o.multiSelect=!!m;var n=o.keys;n[40]='next';n[9]='next';n[38]='prev';n[2000+9]='prev';n[32]='click';o._.pendingHtml=[];o._.items={};o._.groups={};},_:{close:function(){if(this._.started){this._.pendingHtml.push('</ul>');delete this._.started;}},getClick:function(){if(!this._.click)this._.click=e.addFunction(function(l){var n=this;var m=true;if(n.multiSelect)m=n.toggle(l);else n.mark(l);if(n.onClick)n.onClick(l,m);},this);return this._.click;}},proto:{add:function(l,m,n){var q=this;var o=q._.pendingHtml,p='cke_'+e.getNextNumber();if(!q._.started){o.push('<ul class=cke_panel_list>');q._.started=1;}q._.items[l]=p;o.push('<li id=',p,' class=cke_panel_listItem><a _cke_focus=1 hidefocus=true title="',n||l,'" href="javascript:void(\'',l,'\')" onclick="CKEDITOR.tools.callFunction(',q._.getClick(),",'",l,"'); return false;\">",m||l,'</a></li>');},startGroup:function(l){this._.close();var m='cke_'+e.getNextNumber();this._.groups[l]=m;this._.pendingHtml.push('<h1 id=',m,' class=cke_panel_grouptitle>',l,'</h1>');},commit:function(){var l=this;l._.close();l.element.appendHtml(l._.pendingHtml.join(''));l._.pendingHtml=[];},toggle:function(l){var m=this.isMarked(l);if(m)this.unmark(l);else this.mark(l);return!m;},hideGroup:function(l){var m=this.element.getDocument().getById(this._.groups[l]),n=m&&m.getNext();if(m){m.setStyle('display','none');if(n&&n.getName()=='ul')n.setStyle('display','none');}},hideItem:function(l){this.element.getDocument().getById(this._.items[l]).setStyle('display','none');},showAll:function(){var l=this._.items,m=this._.groups,n=this.element.getDocument();for(var o in l)n.getById(l[o]).setStyle('display','');for(var p in m){var q=n.getById(m[p]),r=q.getNext();q.setStyle('display','');if(r&&r.getName()=='ul')r.setStyle('display','');}},mark:function(l){var m=this;if(!m.multiSelect)m.unmarkAll();m.element.getDocument().getById(m._.items[l]).addClass('cke_selected');},unmark:function(l){this.element.getDocument().getById(this._.items[l]).removeClass('cke_selected');},unmarkAll:function(){var l=this._.items,m=this.element.getDocument();for(var n in l)m.getById(l[n]).removeClass('cke_selected');},isMarked:function(l){return this.element.getDocument().getById(this._.items[l]).hasClass('cke_selected');},focus:function(l){this._.focusIndex=-1;if(l){var m=this.element.getDocument().getById(this._.items[l]).getFirst(),n=this.element.getElementsByTag('a'),o,p=-1;while(o=n.getItem(++p))if(o.equals(m)){this._.focusIndex=p;break;}setTimeout(function(){m.focus();
},0);}}}});}});j.add('dialogui');(function(){var l=function(s){var v=this;v._||(v._={});v._['default']=v._.initValue=s['default']||'';var t=[v._];for(var u=1;u<arguments.length;u++)t.push(arguments[u]);t.push(true);e.extend.apply(e,t);return v._;},m={build:function(s,t,u){return new k.dialog.textInput(s,t,u);}},n={build:function(s,t,u){return new k.dialog[t.type](s,t,u);}},o={isChanged:function(){return this.getValue()!=this.getInitValue();},reset:function(){this.setValue(this.getInitValue());},setInitValue:function(){this._.initValue=this.getValue();},resetInitValue:function(){this._.initValue=this._['default'];},getInitValue:function(){return this._.initValue;}},p=e.extend({},k.dialog.uiElement.prototype.eventProcessors,{onChange:function(s,t){if(!this._.domOnChangeRegistered){s.on('load',function(){this.getInputElement().on('change',function(){this.fire('change',{value:this.getValue()});},this);},this);this._.domOnChangeRegistered=true;}this.on('change',t);}},true),q=/^on([A-Z]\w+)/,r=function(s){for(var t in s)if(q.test(t)||t=='title'||t=='type')delete s[t];return s;};e.extend(k.dialog,{labeledElement:function(s,t,u,v){if(arguments.length<4)return;var w=l.call(this,t);w.labelId=e.getNextNumber()+'_label';var x=this._.children=[],y=function(){var z=[];if(t.labelLayout!='horizontal')z.push('<div class="cke_dialog_ui_labeled_label" id="',w.labelId,'" >',t.label,'</div>','<div class="cke_dialog_ui_labeled_content">',v(s,t),'</div>');else{var A={type:'hbox',widths:t.widths,padding:0,children:[{type:'html',html:'<span class="cke_dialog_ui_labeled_label" id="'+w.labelId+'">'+e.htmlEncode(t.label)+'</span>'},{type:'html',html:'<span class="cke_dialog_ui_labeled_content">'+v(s,t)+'</span>'}]};a.dialog._.uiElementBuilders.hbox.build(s,A,z);}return z.join('');};k.dialog.uiElement.call(this,s,t,u,'div',null,null,y);},textInput:function(s,t,u){if(arguments.length<3)return;l.call(this,t);var v=this._.inputId=e.getNextNumber()+'_textInput',w={'class':'cke_dialog_ui_input_'+t.type,id:v,type:'text'},x;if(t.validate)this.validate=t.validate;if(t.maxLength)w.maxlength=t.maxLength;if(t.size)w.size=t.size;var y=this,z=false;s.on('load',function(){y.getInputElement().on('keydown',function(B){if(B.data.getKeystroke()==13)z=true;});y.getInputElement().on('keyup',function(B){if(B.data.getKeystroke()==13&&z){s.getButton('ok')&&s.getButton('ok').click();z=false;}},null,null,1000);});var A=function(){var B=['<div class="cke_dialog_ui_input_',t.type,'"'];if(t.width)B.push('style="width:'+t.width+'" ');
B.push('><input ');for(var C in w)B.push(C+'="'+w[C]+'" ');B.push(' /></div>');return B.join('');};k.dialog.labeledElement.call(this,s,t,u,A);},textarea:function(s,t,u){if(arguments.length<3)return;l.call(this,t);var v=this,w=this._.inputId=e.getNextNumber()+'_textarea',x={};if(t.validate)this.validate=t.validate;x.rows=t.rows||5;x.cols=t.cols||20;var y=function(){var z=['<div class="cke_dialog_ui_input_textarea"><textarea class="cke_dialog_ui_input_textarea" id="',w,'" '];for(var A in x)z.push(A+'="'+e.htmlEncode(x[A])+'" ');z.push('>',e.htmlEncode(v._['default']),'</textarea></div>');return z.join('');};k.dialog.labeledElement.call(this,s,t,u,y);},checkbox:function(s,t,u){if(arguments.length<3)return;var v=l.call(this,t,{'default':!!t['default']});if(t.validate)this.validate=t.validate;var w=function(){var x=e.extend({},t,{id:t.id?t.id+'_checkbox':e.getNextNumber()+'_checkbox'},true),y=[],z={'class':'cke_dialog_ui_checkbox_input',type:'checkbox'};r(x);if(t['default'])z.checked='checked';v.checkbox=new k.dialog.uiElement(s,x,y,'input',null,z);y.push(' <label for="',z.id,'">',e.htmlEncode(t.label),'</label>');return y.join('');};k.dialog.uiElement.call(this,s,t,u,'span',null,null,w);},radio:function(s,t,u){if(arguments.length<3)return;l.call(this,t);if(!this._['default'])this._['default']=this._.initValue=t.items[0][1];if(t.validate)this.validate=t.valdiate;var v=[],w=this,x=function(){var y=[],z=[],A={'class':'cke_dialog_ui_radio_item'},B=t.id?t.id+'_radio':e.getNextNumber()+'_radio';for(var C=0;C<t.items.length;C++){var D=t.items[C],E=D[2]!==undefined?D[2]:D[0],F=D[1]!==undefined?D[1]:D[0],G=e.extend({},t,{id:e.getNextNumber()+'_radio_input',title:null,type:null},true),H=e.extend({},G,{id:null,title:E},true),I={type:'radio','class':'cke_dialog_ui_radio_input',name:B,value:F},J=[];if(w._['default']==F)I.checked='checked';r(G);r(H);v.push(new k.dialog.uiElement(s,G,J,'input',null,I));J.push(' ');new k.dialog.uiElement(s,H,J,'label',null,{'for':I.id},D[0]);y.push(J.join(''));}new k.dialog.hbox(s,[],y,z);return z.join('');};k.dialog.labeledElement.call(this,s,t,u,x);this._.children=v;},button:function(s,t,u){if(!arguments.length)return;if(typeof t=='function')t=t(s.getParentEditor());l.call(this,t,{disabled:t.disabled||false});a.event.implementOn(this);var v=this;s.on('load',function(x){var y=this.getElement();(function(){y.on('click',function(z){v.fire('click',{dialog:v.getDialog()});z.data.preventDefault();});})();y.unselectable();},this);var w=e.extend({},t);
delete w.style;k.dialog.uiElement.call(this,s,w,u,'a',null,{style:t.style,href:'javascript:void(0)',title:t.label,hidefocus:'true','class':t['class']},'<span class="cke_dialog_ui_button">'+e.htmlEncode(t.label)+'</span>');},select:function(s,t,u){if(arguments.length<3)return;var v=l.call(this,t);if(t.validate)this.validate=t.validate;var w=function(){var x=e.extend({},t,{id:t.id?t.id+'_select':e.getNextNumber()+'_select'},true),y=[],z=[],A={'class':'cke_dialog_ui_input_select'};if(t.size!=undefined)A.size=t.size;if(t.multiple!=undefined)A.multiple=t.multiple;r(x);for(var B=0,C;B<t.items.length&&(C=t.items[B]);B++)z.push('<option value="',e.htmlEncode(C[1]!==undefined?C[1]:C[0]),'" /> ',e.htmlEncode(C[0]));v.select=new k.dialog.uiElement(s,x,y,'select',null,A,z.join(''));return y.join('');};k.dialog.labeledElement.call(this,s,t,u,w);},file:function(s,t,u){if(arguments.length<3)return;if(t['default']===undefined)t['default']='';var v=e.extend(l.call(this,t),{definition:t,buttons:[]});if(t.validate)this.validate=t.validate;var w=function(){v.frameId=e.getNextNumber()+'_fileInput';var x=b.isCustomDomain(),y=['<iframe frameborder="0" allowtransparency="0" class="cke_dialog_ui_input_file" id="',v.frameId,'" title="',t.label,'" src="javascript:void('];y.push(x?"(function(){document.open();document.domain='"+document.domain+"';"+'document.close();'+'})()':'0');y.push(')"></iframe>');return y.join('');};s.on('load',function(){var x=a.document.getById(v.frameId),y=x.getParent();y.addClass('cke_dialog_ui_input_file');});k.dialog.labeledElement.call(this,s,t,u,w);},fileButton:function(s,t,u){if(arguments.length<3)return;var v=l.call(this,t),w=this;if(t.validate)this.validate=t.validate;var x=e.extend({},t),y=x.onClick;x.className=(x.className?x.className+' ':'')+('cke_dialog_ui_button');x.onClick=function(z){var A=t['for'];if(!y||y.call(this,z)!==false){s.getContentElement(A[0],A[1]).submit();this.disable();}};s.on('load',function(){s.getContentElement(t['for'][0],t['for'][1])._.buttons.push(w);});k.dialog.button.call(this,s,x,u);},html:(function(){var s=/^\s*<[\w:]+\s+([^>]*)?>/,t=/^(\s*<[\w:]+(?:\s+[^>]*)?)((?:.|\r|\n)+)$/,u=/\/$/;return function(v,w,x){if(arguments.length<3)return;var y=[],z,A=w.html,B,C;if(A.charAt(0)!='<')A='<span>'+A+'</span>';if(w.focus){var D=this.focus;this.focus=function(){D.call(this);w.focus.call(this);this.fire('focus');};if(w.isFocusable){var E=this.isFocusable;this.isFocusable=E;}this.keyboardFocusable=true;}k.dialog.uiElement.call(this,v,w,y,'span',null,null,'');
z=y.join('');B=z.match(s);C=A.match(t)||['','',''];if(u.test(C[1])){C[1]=C[1].slice(0,-1);C[2]='/'+C[2];}x.push([C[1],' ',B[1]||'',C[2]].join(''));};})()},true);k.dialog.html.prototype=new k.dialog.uiElement();k.dialog.labeledElement.prototype=e.extend(new k.dialog.uiElement(),{setLabel:function(s){var t=a.document.getById(this._.labelId);if(t.getChildCount()<1)new d.text(s,a.document).appendTo(t);else t.getChild(0).$.nodeValue=s;return this;},getLabel:function(){var s=a.document.getById(this._.labelId);if(!s||s.getChildCount()<1)return '';else return s.getChild(0).getText();},eventProcessors:p},true);k.dialog.button.prototype=e.extend(new k.dialog.uiElement(),{click:function(){var s=this;if(!s._.disabled)return s.fire('click',{dialog:s._.dialog});s.getElement().$.blur();return false;},enable:function(){this._.disabled=false;var s=this.getElement();s&&s.removeClass('disabled');},disable:function(){this._.disabled=true;this.getElement().addClass('disabled');},isVisible:function(){return!!this.getElement().$.firstChild.offsetHeight;},isEnabled:function(){return!this._.disabled;},eventProcessors:e.extend({},k.dialog.uiElement.prototype.eventProcessors,{onClick:function(s,t){this.on('click',t);}},true),accessKeyUp:function(){this.click();},accessKeyDown:function(){this.focus();},keyboardFocusable:true},true);k.dialog.textInput.prototype=e.extend(new k.dialog.labeledElement(),{getInputElement:function(){return a.document.getById(this._.inputId);},focus:function(){var s=this.selectParentTab();setTimeout(function(){var t=s.getInputElement();t&&t.$.focus();},0);},select:function(){var s=this.selectParentTab();setTimeout(function(){var t=s.getInputElement();if(t){t.$.focus();t.$.select();}},0);},accessKeyUp:function(){this.select();},setValue:function(s){s=s||'';return k.dialog.uiElement.prototype.setValue.call(this,s);},keyboardFocusable:true},o,true);k.dialog.textarea.prototype=new k.dialog.textInput();k.dialog.select.prototype=e.extend(new k.dialog.labeledElement(),{getInputElement:function(){return this._.select.getElement();},add:function(s,t,u){var v=new h('option',this.getDialog().getParentEditor().document),w=this.getInputElement().$;v.$.text=s;v.$.value=t===undefined||t===null?s:t;if(u===undefined||u===null){if(c)w.add(v.$);else w.add(v.$,null);}else w.add(v.$,u);return this;},remove:function(s){var t=this.getInputElement().$;t.remove(s);return this;},clear:function(){var s=this.getInputElement().$;while(s.length>0)s.remove(0);return this;},keyboardFocusable:true},o,true);
k.dialog.checkbox.prototype=e.extend(new k.dialog.uiElement(),{getInputElement:function(){return this._.checkbox.getElement();},setValue:function(s){this.getInputElement().$.checked=s;this.fire('change',{value:s});},getValue:function(){return this.getInputElement().$.checked;},accessKeyUp:function(){this.setValue(!this.getValue());},eventProcessors:{onChange:function(s,t){if(!c)return p.onChange.apply(this,arguments);else{s.on('load',function(){var u=this._.checkbox.getElement();u.on('propertychange',function(v){v=v.data.$;if(v.propertyName=='checked')this.fire('change',{value:u.$.checked});},this);},this);this.on('change',t);}return null;}},keyboardFocusable:true},o,true);k.dialog.radio.prototype=e.extend(new k.dialog.uiElement(),{setValue:function(s){var t=this._.children,u;for(var v=0;v<t.length&&(u=t[v]);v++)u.getElement().$.checked=u.getValue()==s;this.fire('change',{value:s});},getValue:function(){var s=this._.children;for(var t=0;t<s.length;t++)if(s[t].getElement().$.checked)return s[t].getValue();return null;},accessKeyUp:function(){var s=this._.children,t;for(t=0;t<s.length;t++)if(s[t].getElement().$.checked){s[t].getElement().focus();return;}s[0].getElement().focus();},eventProcessors:{onChange:function(s,t){if(!c)return p.onChange.apply(this,arguments);else{s.on('load',function(){var u=this._.children,v=this;for(var w=0;w<u.length;w++){var x=u[w].getElement();x.on('propertychange',function(y){y=y.data.$;if(y.propertyName=='checked'&&this.$.checked)v.fire('change',{value:this.getAttribute('value')});});}},this);this.on('change',t);}return null;}},keyboardFocusable:true},o,true);k.dialog.file.prototype=e.extend(new k.dialog.labeledElement(),o,{getInputElement:function(){var s=a.document.getById(this._.frameId).getFrameDocument();return s.$.forms.length>0?new h(s.$.forms[0].elements[0]):this.getElement();},submit:function(){this.getInputElement().getParent().$.submit();return this;},getAction:function(s){return this.getInputElement().getParent().$.action;},reset:function(){var s=a.document.getById(this._.frameId),t=s.getFrameDocument(),u=this._.definition,v=this._.buttons;function w(){t.$.open();if(b.isCustomDomain())t.$.domain=document.domain;var x='';if(u.size)x=u.size-(c?7:0);t.$.write(['<html><head><title></title></head><body style="margin: 0; overflow: hidden; background: transparent;">','<form enctype="multipart/form-data" method="POST" action="',e.htmlEncode(u.action),'">','<input type="file" name="',e.htmlEncode(u.id||'cke_upload'),'" size="',e.htmlEncode(x>0?x:''),'" />','</form>','</body></html>'].join(''));
t.$.close();for(var y=0;y<v.length;y++)v[y].enable();};if(b.gecko)setTimeout(w,500);else w();},getValue:function(){return '';},eventProcessors:p,keyboardFocusable:true},true);k.dialog.fileButton.prototype=new k.dialog.button();a.dialog.addUIElement('text',m);a.dialog.addUIElement('password',m);a.dialog.addUIElement('textarea',n);a.dialog.addUIElement('checkbox',n);a.dialog.addUIElement('radio',n);a.dialog.addUIElement('button',n);a.dialog.addUIElement('select',n);a.dialog.addUIElement('file',n);a.dialog.addUIElement('fileButton',n);a.dialog.addUIElement('html',n);})();a.skins.add('kama',(function(){var l=[];if(c&&b.version<7)l.push('icons.png','images/sprites_ie6.png','images/dialog_sides.gif');return{preload:l,editor:{css:['editor.css']},dialog:{css:['dialog.css']},templates:{css:['templates.css']},margins:[0,0,0,0],init:function(m){if(m.config.width&&!isNaN(m.config.width))m.config.width-=12;var n=[],o=/\$color/g,p='/* UI Color Support */.cke_skin_kama .cke_menuitem .cke_icon_wrapper{\tbackground-color: $color !important;\tborder-color: $color !important;}.cke_skin_kama .cke_menuitem a:hover .cke_icon_wrapper,.cke_skin_kama .cke_menuitem a:focus .cke_icon_wrapper,.cke_skin_kama .cke_menuitem a:active .cke_icon_wrapper{\tbackground-color: $color !important;\tborder-color: $color !important;}.cke_skin_kama .cke_menuitem a:hover .cke_label,.cke_skin_kama .cke_menuitem a:focus .cke_label,.cke_skin_kama .cke_menuitem a:active .cke_label{\tbackground-color: $color !important;}.cke_skin_kama .cke_menuitem a.cke_disabled:hover .cke_label,.cke_skin_kama .cke_menuitem a.cke_disabled:focus .cke_label,.cke_skin_kama .cke_menuitem a.cke_disabled:active .cke_label{\tbackground-color: transparent !important;}.cke_skin_kama .cke_menuitem a.cke_disabled:hover .cke_icon_wrapper,.cke_skin_kama .cke_menuitem a.cke_disabled:focus .cke_icon_wrapper,.cke_skin_kama .cke_menuitem a.cke_disabled:active .cke_icon_wrapper{\tbackground-color: $color !important;\tborder-color: $color !important;}.cke_skin_kama .cke_menuitem a.cke_disabled .cke_icon_wrapper{\tbackground-color: $color !important;\tborder-color: $color !important;}.cke_skin_kama .cke_menuseparator{\tbackground-color: $color !important;}.cke_skin_kama .cke_menuitem a:hover,.cke_skin_kama .cke_menuitem a:focus,.cke_skin_kama .cke_menuitem a:active{\tbackground-color: $color !important;}';if(b.webkit){p=p.split('}').slice(0,-1);for(var q=0;q<p.length;q++)p[q]=p[q].split('{');}function r(u){var v=u.getHead().append('style');
v.setAttribute('id','cke_ui_color');v.setAttribute('type','text/css');return v;};function s(u,v,w){var x,y,z;for(var A=0;A<u.length;A++)if(b.webkit){for(y=0;y<u[A].$.sheet.rules.length;y++)u[A].$.sheet.removeRule(y);for(y=0;y<v.length;y++){z=v[y][1];for(x=0;x<w.length;x++)z=z.replace(w[x][0],w[x][1]);u[A].$.sheet.addRule(v[y][0],z);}}else{z=v;for(x=0;x<w.length;x++)z=z.replace(w[x][0],w[x][1]);if(c)u[A].$.styleSheet.cssText=z;else u[A].setHtml(z);}};var t=/\$color/g;e.extend(m,{uiColor:null,getUiColor:function(){return this.uiColor;},setUiColor:function(u){var v,w=r(a.document),x='#cke_'+m.name.replace('.','\\.'),y=[x+' .cke_wrapper',x+'_dialog .cke_dialog_contents',x+'_dialog a.cke_dialog_tab',x+'_dialog .cke_dialog_footer'].join(','),z='background-color: $color !important;';if(b.webkit)v=[[y,z]];else v=y+'{'+z+'}';return(this.setUiColor=function(A){var B=[[t,A]];m.uiColor=A;s([w],v,B);s(n,p,B);})(u);}});m.on('menuShow',function(u){var v=u.data[0],w=v.element.getElementsByTag('iframe').getItem(0).getFrameDocument();if(!w.getById('cke_ui_color')){var x=r(w);n.push(x);var y=m.getUiColor();if(y)s([x],p,[[t,y]]);}});if(m.config.uiColor)m.setUiColor(m.config.uiColor);}};})());if(a.dialog)a.dialog.on('resize',function(l){var m=l.data,n=m.width,o=m.height,p=m.dialog,q=p.parts.contents,r=!b.quirks;if(m.skin!='kama')return;q.setStyles(c||b.gecko&&b.version<10900?{width:n+'px',height:o+'px'}:{'min-width':n+'px','min-height':o+'px'});if(!c)return;setTimeout(function(){var s=q.getParent(),t=s.getParent(),u=t.getChild(2);u.setStyle('width',s.$.offsetWidth+'px');u=t.getChild(7);u.setStyle('width',s.$.offsetWidth-28+'px');u=t.getChild(4);u.setStyle('height',s.$.offsetHeight-31-14+'px');u=t.getChild(5);u.setStyle('height',s.$.offsetHeight-31-14+'px');},100);});a.themes.add('default',(function(){return{build:function(l,m){var n=l.name,o=l.element,p=l.elementMode;if(!o||p==0)return;if(p==1)o.hide();var q=l.fire('themeSpace',{space:'top',html:''}).html,r=l.fire('themeSpace',{space:'contents',html:''}).html,s=l.fireOnce('themeSpace',{space:'bottom',html:''}).html,t=r&&l.config.height,u=l.config.tabIndex||l.element.getAttribute('tabindex')||0;if(!r)t='auto';else if(!isNaN(t))t+='px';var v='',w=l.config.width;if(w){if(!isNaN(w))w+='px';v+='width: '+w+';';}var x=h.createFromHtml(['<span id="cke_',n,'" onmousedown="return false;" class="',l.skinClass,'" dir="',l.lang.dir,'" title="',b.gecko?' ':'','" lang="',l.langCode,'" tabindex="'+u+'"'+(v?' style="'+v+'"':'')+'>'+'<span class="',b.cssClass,'"><span class="cke_wrapper cke_',l.lang.dir,'"><table class="cke_editor" border="0" cellspacing="0" cellpadding="0"><tbody><tr',q?'':' style="display:none"','><td id="cke_top_',n,'" class="cke_top">',q,'</td></tr><tr',r?'':' style="display:none"','><td id="cke_contents_',n,'" class="cke_contents" style="height:',t,'">',r,'</td></tr><tr',s?'':' style="display:none"','><td id="cke_bottom_',n,'" class="cke_bottom">',s,'</td></tr></tbody></table><style>.',l.skinClass,'{visibility:hidden;}</style></span></span></span>'].join(''));
x.getChild([0,0,0,0,0]).unselectable();x.getChild([0,0,0,0,2]).unselectable();if(p==1)x.insertAfter(o);else o.append(x);l.container=x;x.disableContextMenu();l.fireOnce('themeLoaded');l.fireOnce('uiReady');},buildDialog:function(l){var m=e.getNextNumber(),n=h.createFromHtml(['<div id="cke_'+l.name.replace('.','\\.')+'_dialog" class="cke_skin_',l.skinName,'" dir="',l.lang.dir,'" lang="',l.langCode,'"><div class="cke_dialog',' '+b.cssClass,' cke_',l.lang.dir,'" style="position:absolute"><div class="%body"><div id="%title#" class="%title"></div><div id="%close_button#" class="%close_button"><span>X</span></div><div id="%tabs#" class="%tabs"></div><div id="%contents#" class="%contents"></div><div id="%footer#" class="%footer"></div></div><div id="%tl#" class="%tl"></div><div id="%tc#" class="%tc"></div><div id="%tr#" class="%tr"></div><div id="%ml#" class="%ml"></div><div id="%mr#" class="%mr"></div><div id="%bl#" class="%bl"></div><div id="%bc#" class="%bc"></div><div id="%br#" class="%br"></div></div>',c?'':'<style>.cke_dialog{visibility:hidden;}</style>','</div>'].join('').replace(/#/g,'_'+m).replace(/%/g,'cke_dialog_')),o=n.getChild([0,0]);o.getChild(0).unselectable();o.getChild(1).unselectable();return{element:n,parts:{dialog:n.getChild(0),title:o.getChild(0),close:o.getChild(1),tabs:o.getChild(2),contents:o.getChild(3),footer:o.getChild(4)}};},destroy:function(l){var m=l.container,n=l.panels;if(c){m.setStyle('display','none');var o=document.body.createTextRange();o.moveToElementText(m.$);try{o.select();}catch(q){}}if(m)m.remove();for(var p=0;n&&p<n.length;p++)n[p].remove();if(l.elementMode==1){l.element.show();delete l.element;}}};})());a.editor.prototype.getThemeSpace=function(l){var m='cke_'+l,n=this._[m]||(this._[m]=a.document.getById(m+'_'+this.name));return n;};a.editor.prototype.resize=function(l,m,n,o){var p=/^\d+$/;if(p.test(l))l+='px';var q=a.document.getById('cke_contents_'+this.name),r=o?q.getAscendant('table').getParent():q.getAscendant('table').getParent().getParent().getParent();b.webkit&&r.setStyle('display','none');r.setStyle('width',l);if(b.webkit){r.$.offsetWidth;r.setStyle('display','');}var s=n?0:(r.$.offsetHeight||0)-(q.$.clientHeight||0);q.setStyle('height',Math.max(m-s,0)+'px');this.fire('resize');};a.editor.prototype.getResizable=function(){return this.container.getChild([0,0]);};})();


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
 * @projectDescription Easy element scrolling using jQuery.
 * http://flesler.blogspot.com/2007/10/jqueryscrollto.html
 * Tested with jQuery 1.2.6. On FF 2/3, IE 6/7, Opera 9.2/5 and Safari 3. on Windows.
 *
 * @author Ariel Flesler
 * @version 1.4
 *
 * @id jQuery.scrollTo
 * @id jQuery.fn.scrollTo
 * @param {String, Number, DOMElement, jQuery, Object} target Where to scroll the matched elements.
 *	  The different options for target are:
 *		- A number position (will be applied to all axes).
 *		- A string position ('44', '100px', '+=90', etc ) will be applied to all axes
 *		- A jQuery/DOM element ( logically, child of the element to scroll )
 *		- A string selector, that will be relative to the element to scroll ( 'li:eq(2)', etc )
 *		- A hash { top:x, left:y }, x and y can be any kind of number/string like above.
 * @param {Number} duration The OVERALL length of the animation, this argument can be the settings object instead.
 * @param {Object,Function} settings Optional set of settings or the onAfter callback.
 *	 @option {String} axis Which axis must be scrolled, use 'x', 'y', 'xy' or 'yx'.
 *	 @option {Number} duration The OVERALL length of the animation.
 *	 @option {String} easing The easing method for the animation.
 *	 @option {Boolean} margin If true, the margin of the target element will be deducted from the final position.
 *	 @option {Object, Number} offset Add/deduct from the end position. One number for both axes or { top:x, left:y }.
 *	 @option {Object, Number} over Add/deduct the height/width multiplied by 'over', can be { top:x, left:y } when using both axes.
 *	 @option {Boolean} queue If true, and both axis are given, the 2nd axis will only be animated after the first one ends.
 *	 @option {Function} onAfter Function to be called after the scrolling ends. 
 *	 @option {Function} onAfterFirst If queuing is activated, this function will be called after the first scrolling ends.
 * @return {jQuery} Returns the same jQuery object, for chaining.
 *
 * @desc Scroll to a fixed position
 * @example $('div').scrollTo( 340 );
 *
 * @desc Scroll relatively to the actual position
 * @example $('div').scrollTo( '+=340px', { axis:'y' } );
 *
 * @dec Scroll using a selector (relative to the scrolled element)
 * @example $('div').scrollTo( 'p.paragraph:eq(2)', 500, { easing:'swing', queue:true, axis:'xy' } );
 *
 * @ Scroll to a DOM element (same for jQuery object)
 * @example var second_child = document.getElementById('container').firstChild.nextSibling;
 *			$('#container').scrollTo( second_child, { duration:500, axis:'x', onAfter:function(){
 *				alert('scrolled!!');																   
 *			}});
 *
 * @desc Scroll on both axes, to different values
 * @example $('div').scrollTo( { top: 300, left:'+=200' }, { axis:'xy', offset:-20 } );
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

jQuery.ajaxSetup({ 
  beforeSend: function(xhr) {xhr.setRequestHeader("Accept", "text/javascript")}
});

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
		jQuery(this).live('submit', function() {
			$('.invalid', this).removeClass('invalid');
			$('.error', this).remove();
			
			return $(this).runValidation().data('valid');
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
}

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
 * IFrame Loader Plugin for JQuery
 * - Notifies your event handler when iframe has finished loading
 * - Your event handler receives loading duration (as well as iframe)
 * - Optionally calls your timeout handler
 *
 * http://project.ajaxpatterns.org/jquery-iframe
 *
 * The MIT License
 *
 * Copyright (c) 2009, Michael Mahemoff
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

(function($) {

  var timer;

  $.fn.src = function(url, onLoad, options) {
    setIFrames($(this), onLoad, options, function() {
      this.src = url;
    });
    return $(this);
  }

  $.fn.squirt = function(content, onLoad, options) {

    setIFrames($(this), onLoad, options, function() {
      var doc = this.contentDocument || this.contentWindow.document;
      doc.open();
      doc.writeln(content);
      doc.close();
    });
    return this;

  }

  function setIFrames(iframes, onLoad, options, iFrameSetter) {
    iframes.each(function() {
      if (this.tagName=="IFRAME") setIFrame(this, onLoad, options, iFrameSetter);
    });
  }

  function setIFrame(iframe, onLoad, options, iFrameSetter) {

    var iframe;
    iframe.onload = null;
    if (timer) clearTimeout(timer);

    var defaults = {
      timeoutDuration: 0,
      timeout: null,
    }
    var opts = $.extend(defaults, options);
    if (opts.timeout && !opts.timeoutDuration) opts.timeoutDuration = 60000;

    opts.frameactive = true;
    var startTime = (new Date()).getTime();
    if (opts.timeout) {
      var timer = setTimeout(function() {
        opts.frameactive=false; 
        iframe.onload=null;
        if (opts.timeout) opts.timeout(iframe, opts.timeout);
      }, opts.timeoutDuration);
    };

    var onloadHandler = function() {
      var duration=(new Date()).getTime()-startTime;
      if (timer) clearTimeout(timer);
      if (onLoad && opts.frameactive) onLoad.apply(iframe,[duration]);
      opts.frameactive=false;
    }
    iFrameSetter.apply(iframe);
    iframe.onload = onloadHandler;
    opts.completeReadyStateChanges=0;
    iframe.onreadystatechange = function() { // IE ftw
	    if (++(opts.completeReadyStateChanges)==3) onloadHandler();
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
	$('.shimmy').shimmy();
	
	$('.focus_onload').eq(0).focus();
	// highlight text within a text field or area when focused
	$('.click_sel').live('focus', function() { $(this).select() });
	$('#auth_yourself').hide();
	
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
			
			ajax_wrap.children().fadeTo('fast', 0.2);
			ajax_wrap.addClass('loading').load($this.attr('href') + ' #ajax_wrap_inner', function(response, status) {
				if (status == 'success') {
					$.bindPlugins();
					$.enableEditor();
					$('.disabler', '#ajax_wrap_inner').disabler();
					fillInFormFieldSelectLists($('#form_controller', '#FormsForm').val());
				}
				else $('#ajax_wrap_inner').html(response);
				
				$(this).removeClass('loading').children().hide().fadeIn('fast');
			});
			
			return false;
		});
		
		// ajaxify form submissions
		// TODO: respond_to blocks for all the controllers
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
		
		if ($.cookie('active_admin_link')) $('#'+ $.cookie('active_admin_link')).click();
	}
	
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
				height: $this.attr('data-height')
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
	else if (error && error.call) error.call(this, response.data)
	else $.ajax_error(response);
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
			var form = $('form', '#pop_up').runValidation(),
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
	}, interval)
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
			action = what_action($this);
		
		tabs.find('li').eq(0).addClass('active');
		panels.eq(0).show();
				
		$('a', tabs).click(function(){
			panels[action[0]](action[2]).removeClass('active');
			$('li, a', tabs).removeClass('active');
			$(this).addClass('active').parent().addClass('active');
			$('#'+ $(this).attr('rel'), $this)[action[1]]((action[0] == 'hide' ? null : 'slow')).addClass('active');
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
	if ($.browser.msie) return;
	
	return this.each(function(){
		$(this).keyup(function(e){
			var input = $(this),
				allowed_keys = [9, 8, 46]; // 9 = tab, 8 = backspace, 46 = delete
			
			if (e.which == 189 || e.which == 109) { // dash or substract
				input.val(input.val().substring(0, input.val().length - 1));
			}
			
			if (allowed_keys.indexOf(e.which) < 0 && isNaN(input.val().replace('-', '').replace('-', ''))) {
				input.val(input.val().substring(0, input.val().length - 1));
				
			} else if (allowed_keys.indexOf(e.which) < 0 && input.val().length >= 3 && input.val().length < 7 && input.val().indexOf('-') < 0) {
				input.val(input.val().substring(0, 3) + '-' + input.val().substring(3));
				
			} else if (allowed_keys.indexOf(e.which) < 0 && input.val().length >= 7 && input.val().indexOf('-') < 7) {
				input.val(input.val().substring(0, 7) + '-' + input.val().substring(8));
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

$.fn.shimmy = function() {
	return this.each(function() {
		
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
	$('form').formBouncer(); // form validation, fields with supported validation classes will be processed
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
				
				$('#size_price', form).val(parseInt($('#size_price', form).val()))
				
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
			ajax_loader = $.new_ajax_loader('after', $this).show(),
			ids 		= [];
		
		compares.each(function() {
			var context    = $(this).parents('.listing'),
				special_id = $('.special_txt', context).attr('data-special-id'),
				size_id    = $('ul.dnp input.unit_size:checked', context).val();
			
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
			
			$this.show().attr('href', orig_href);
			ajax_loader.hide();
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
			last_index   = parseInt($('.num_icon', '.listing:last').text()) + 1,
			page = $('input[name=page]', $this.parent()).eq(0).val();
		
		if (!this_form.data('submitting')) {
			this_form.data('submitting', true);
			
			$.getJSON(this_form.attr('action'), this_form.serialize(), function(response) {
				$.with_json(response, function(data) {
					for (var i = 0, len = data.length; i < len; i++) {
						var listing = $(data[i]);
						$('.num_icon', listing).text(last_index + i);
						results_wrap.append(listing);
					}

					// this updates the page count so the next time the user clicks, we pull the correct data
					$('input[name=page]').val(parseInt(page) + 1);

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
	$('.reserve_btn, .request_btn', '.listing').live('click', function(){
		var $this = $(this), 
			new_href = $this.attr('href').replace('/sizes', ($this.hasClass('reserve_btn') ? '/reserve' : '/info_request')),
			context = $this.parents('.inner'),
			unit_size = $(':radio:checked', context),
			special = $('.special_txt.active', context);
		
		if (unit_size.length) {
			var ar = (special.length == 1 ? '[0]' : ''); // make the sub_model param an array if a special is present
			$this.attr('href', new_href +'&sub_model'+ ar +'=Size&sub_id'+ ar +'='+ unit_size.val());
			$this.attr('rel', 'reserve'); // makes the panel open with the rental form instead of the sizes list
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

			$.getJSON(this.href, function(response) {
				$.with_json(response, function(data){
					$('.tab_link, .listing, .panel').removeClass('active');
					$('li', '.tabs').removeClass('active');
					$this.parent().addClass('active');

					$this.addClass('active');
					$listing.addClass('active');
					$panel.addClass('active');

					$('.panel:not(.active)').slideUp();
					$panel.html(data);

					$('.listing:not(.active) .open_tab').text('+');
					$('.open_tab', $listing).data('active', true).text('-');

					if ($panel.is(':hidden')) {
						$panel.slideDown(900, function(){ if ($(window).height() < 650) $(window).scrollTo($listing, { speed: 1000 }); });
					}

					$('.progress', '.listing').removeClass('active').animate({ 'margin-top': '-16px' }, 'fast');

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

					} else if ($this.attr('rel') == 'reserve') {
						$('#rent_step1 form', $panel).rental_form();
					}
				});
			});
			
		} else {
			$panel.slideUp();
			$('.tab_link, .listing, .panel').removeClass('active');
			$('li', '.tabs').removeClass('active');
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
	$('.open_reserve_form').live('click', function(){
		var $this = $(this), rform = $('.reserve_form', $this.parent()),
			wrap = $this.parent('.sl-table-wrap'),
			listing_id = wrap.attr('rel').replace('listing_', ''),
			size_id = wrap.attr('id').replace('Size_', ''),
			accepts_reservations = wrap.attr('data-has-res') == 'true' ? true : false,
			ajax_loader = $('.ajax_loader', this);
			
		if (rform.hasClass('active')) { // clicking on an open form, close it
			rform.slideUp().removeClass('active');
			$('.sl-table').removeClass('active');
			
		} else { // get or open the form for this size
			$('.reserve_form').slideUp().removeClass('active');
			$('.sl-table').removeClass('active');
			$('.sl-table', rform.parent()).addClass('active');
			
			if (unit_size_form_partials[size_id]) rform.slideDown().addClass('active');
			else {
				ajax_loader.show();
				
				if (accepts_reservations) { // we must get the reserve partial that contains the reserve_steps
					get_partial_and_do({ partial: 'views/partials/greyresults/reserve', model: 'Listing', id: listing_id, sub_model: 'Size', sub_id: size_id, show_size_ops: false }, function(response) {
						unit_size_form_partials[size_id] = response.data;
						rform.html(response.data).slideDown().addClass('active');
						ajax_loader.hide();
						$('#rent_step1 form', rform).rental_form();
					});
				} else {
					get_partial_and_do({ partial: 'views/partials/greyresults/request_info', model: 'Listing', id: listing_id, sub_model: 'Size', sub_id: size_id }, function(response) {
						unit_size_form_partials[size_id] = response.data;
						rform.html(response.data).slideDown().addClass('active');
						ajax_loader.hide();
						$('#rent_step1 form').rental_form();
					});
				}
			}
		}

		$('input[type=text]:first', rform).focus();
		return false;
	});
	
	// used to wrap common functionality in the submit actions of step 1 and 2 in the reservation workflow
	// returns true so the workflow can go to the next slide
	function bool_submit_once_and_do(form, wizard, slide_num, callback) {
		var next_slide = $(wizard.slides[slide_num-1]),
			ajax_loader = $('.ajax_loader', next_slide);
			
		if (!form.data('submitted')) form.runValidation();
		
		if (!form.data('submitted') && form.data('valid')) {
			form.data('submitted', true).save_state(); // in case the user clicked back and changed an input value
			ajax_loader.show();
			
			submit_reservation_form(form, next_slide, ajax_loader, callback);
			return true; // while the form is submitting, this function returns true and causes the workflow to move next
			
		} else if (form.data('submitted') && form.state_changed()) { // user has gone back and changed some inputs 
			ajax_loader.show();
			
			if (slide_num == 2) {
				// get the reservation id so the server can update it
				var step2 = $('#reserve_step2', wizard.workflow).children().hide().end(),
					reservation_id = $('form', step2).attr('action').split('/');

				reservation_id = reservation_id[reservation_id.length-1];
				form.append('<input type="hidden" name="reservation_id" value="'+ reservation_id +'" />');
			} else if (slide_num == 3) {
				
			}
			
			form.save_state();
			submit_reservation_form(form, next_slide, ajax_loader, callback);
			return true;
			
		} else if (form.data('submitted')) return true;
		
		return false;
	}
	
	function submit_reservation_form(form, next_slide, ajax_loader, callback) {
		$.post(form.attr('action'), form.serialize(), function(response) {
			$.with_json(response, function(data) {
				callback.call(this, data, next_slide);
			}, function(data) { // error
				next_slide.html(data);
			});
			
			ajax_loader.hide();
		});
	}
	
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
		var form = $(this).runValidation(), 
			results_page = $('#ajax_wrap_inner'),
			results_wrap = $('#results_wrap', results_page),
			results_head = $('.rslt-head-txt', results_wrap),
			loading_txt  = 'Looking for '+ $('#search_storage_type', form).val() +' within <span class="hlght-text">'+ 
						   $('input[name="search[within]"]:checked', form).val() +'</span> miles of <span class="hlght-text">'+ 
						   $('#search_query', form).val() +'</span> '+ $.ajax_loader_tag();
		
		$('#type-one-top-bar', results_wrap).fadeTo(500, .5);
		$('h2', results_head).removeClass('no_results hide').html(loading_txt);
		$('.txt_ldr', results_head).txt_loader();
		
		if (form.data('valid') && !form.data('loading')) {
			form.data('loading', true);
			
			$.getJSON(form.attr('action'), form.serialize(), function(response) {
				$.with_json(response, function(data) {
					results_page.replaceWith(data['results']);
					$.setGmap(data['maps_data']);
					$.enableTooltips('a', '.rslt-features');
					select_first_size_option();
					// TODO: this doesnt cause the compare link to appear
					//$('input[name=compare]', '.listing').autoClickFew(3);
					
					$('.rslt-price', '.listing').each(function(){
						$(':radio', this).eq(0).attr('checked', true);
						$('.radio_select', this).eq(0).addClass('checked');
					});
				});
				
				$('body').attr('id', 'listings_controller').addClass('locator_action'); // this is only needed cuz the layout is kinda fucked up and not consistent across pages
				form.data('loading', false);
			});
		}
		
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
	
});

function get_review_pop_up(options) {
	get_pop_up_and_do({ title: 'Write a Review', width: 500, modal: true }, options, function(pop_up) {
		$('#comment_name', pop_up).focus();
		
		$('form', pop_up).submit(function() {
			var form = $(this).runValidation(),
				ajax_loader = $.new_ajax_loader('after', $('input[type=submit]', this));

			if (form.data('valid') && !form.data('sending')) {
				ajax_loader.show();
				form.data('sending', true);

				$.post(form.attr('action'), form.serialize(), function(response) {
					$.with_json(response, function(data) {
						pop_up.html('<div class="framed" style="text-align:center;">'+ data +'</div>');
					});

					ajax_loader.hide();
					form.data('sending', false);
				}, 'json');
			}
			
			return false;
		});
	});
}

/*
 * Google Map methods
 */
var MapIconMaker = {};
MapIconMaker.createMarkerIcon = function(opts) {
	var width = opts.width || 32;
	var height = opts.height || 32;
	var primaryColor = opts.primaryColor || "#ff0000";
	var strokeColor = opts.strokeColor || "#000000";
	var cornerColor = opts.cornerColor || "#ffffff";

	var baseUrl = "http://chart.apis.google.com/chart?cht=mm";
	var iconUrl = baseUrl + "&chs=" + width + "x" + height + 
		"&chco=" + cornerColor.replace("#", "") + "," + primaryColor.replace("#", "") + "," + strokeColor.replace("#", "") + "&ext=.png";
	
	var icon = new GIcon(G_DEFAULT_ICON);
	icon.image = iconUrl;
	icon.iconSize = new GSize(width, height);
	icon.shadowSize = new GSize(Math.floor(width*1.6), height);
	icon.iconAnchor = new GPoint(width/2, height);
	icon.infoWindowAnchor = new GPoint(width/2, Math.floor(height/12));
	icon.printImage = iconUrl + "&chof=gif";
	icon.mozPrintImage = iconUrl + "&chf=bg,s,ECECD8" + "&chof=gif";
	
	var iconUrl = baseUrl + "&chs=" + width + "x" + height + 
		"&chco=" + cornerColor.replace("#", "") + "," + primaryColor.replace("#", "") + "," + strokeColor.replace("#", "");
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
	for (var i = 0; i < icon.imageMap.length; i++) {
		icon.imageMap[i] = parseInt(icon.imageMap[i]);
	}

	return icon;
}

try {
	var iconOptions = {};
	iconOptions.width = 32;
	iconOptions.height = 32;
	iconOptions.primaryColor = "#0000ff";
	iconOptions.cornerColor = "#FFFFFF";
	iconOptions.strokeColor = "#000000";
	var normalIcon = MapIconMaker.createMarkerIcon(iconOptions);

	// http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=A|00CC99|000000
	
	var startIcon = new GIcon(G_DEFAULT_ICON, 'http://s3.amazonaws.com/storagelocator/images/ui/map_marker.png'); // the 'you are here' icon
	
	//save the regular icon image url
	var normalIconImage = normalIcon.image,
		highlightIconImage = 'http://chart.apis.google.com/chart?cht=mm&chs=32x32&chco=FFFFFF,FBD745,000000&ext=.png',
		selectedIconImage = 'http://chart.apis.google.com/chart?cht=mm&chs=32x32&chco=FFFFFF,FB9517,000000&ext=.png';

} catch (e){ }

function highlightMarker(id){
	var marker = typeof id == 'object' ? id : getMarkerById(id);
	if (typeof(marker) != 'undefined') marker.setImage('http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld='+ marker.mIndex +'|FED747|333333');
}

function unhighlightMarker(id){
	var marker = typeof id == 'object' ? id : getMarkerById(id), def = typeof(marker) != 'undefined';
	if (def && marker.GmapState == 'selected') marker.setImage('http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld='+ marker.mIndex +'|FED747|333333');
	else if (def) marker.setImage('http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld='+ marker.mIndex +'|339933|FFFFFF');
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

function addMarker(icon, lat, lng, title, body, bind_mouse_overs) {
	if (typeof bind_mouse_overs == 'undefined') var bind_mouse_overs = true;
	
	var point = new GLatLng(lat, lng);
	var marker = new GMarker(point, { 'title': title, 'icon': icon, width: '25px' });
	
	GEvent.addListener(marker, 'click', function(){
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

	Gmap.addOverlay(marker);
	return marker;
}

function make_indexed_icon(index) {
	return new GIcon(G_DEFAULT_ICON, 'http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld='+ index +'|339933|FFFFFF');
}

GmapMarkers = [];
$.setGmap = function(data, el) {
	if (typeof el == 'undefined') el = 'main_map';
	
	Gmap = new GMap2(document.getElementById(el));
	Gmap.addControl(new GLargeMapControl());
	Gmap.addControl(new GScaleControl());
	Gmap.addControl(new GMapTypeControl());
	Gmap.setCenter(new GLatLng(data.center.lat, data.center.lng), (data.center.zoom || 16));
	Gmap.enableDoubleClickZoom();
	Gmap.disableContinuousZoom();
	Gmap.disableScrollWheelZoom();
	
	addMarker(startIcon, parseFloat(data.center.lat), parseFloat(data.center.lng), 'Origin', '<p><strong>Search distance measured from here.</strong></p>', false);

	//add result markers
	var markers = data.maps;

	for (var i = 0, len = markers.length; i < len; i++) {
		var photo = markers[i].thumb ? "<a href=\"/self-storage/show/"+ markers[i].id +"#pictures\"><img style=\"margin-right:7px;border:1px solid #ccc;\" src="+ markers[i].thumb +" width=\"80\" height=\"60\" align=\"left\" /></a>" : '';
		var title = markers[i].title.replaceAll('+', ' ');
		var body = '<p>'+ photo + 
						'<span class="listing_title"><a href="/self-storage/show/'+ markers[i].id +'">'+ title +'</a></span>'+ 
						'<span class="listing_address">'+ markers[i].address.replaceAll('+', ' ') +'<br/>'+ markers[i].city.replaceAll('+', ' ') +', '+ markers[i].state +' '+ markers[i].zip +'</span>'+
					'</p>';
		
		var marker = addMarker(make_indexed_icon(i+1), markers[i].lat, markers[i].lng, title, body);
		marker.mIndex = i+1;
		marker.listing_id = markers[i].id;

		GmapMarkers[i] = marker;
	}

	//bind mouseover result row to highlight map marker
	jQuery('.listing').live('mouseenter', function(){
		var id = $(this).attr('id').split('_')[1];
		highlightMarker(id);
	});
	
	jQuery('.listing').live('mouseleave', function(){
		var id = $(this).attr('id').split('_')[1];
		unhighlightMarker(id);
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
					
					$('#processing_rental .flash', wizard.workflow).remove();
					wizard.form_data += '&'+ form.serialize();
					
					$.post(form.attr('action'), wizard.form_data, function(response) {
						$.with_json(response, function(data) {
							$('#rental_complete', wizard.workflow).show();
							$('#processing_rental', wizard.workflow).hide();
							
						}, function(data) { // uh oh, something failed
							$('#processing_rental', wizard.workflow).append('<div class="flash error">'+ data.join('<br />') +'</div>');
							$('.back', wizard.nav_bar).show();
						});
						
						ajax_loader.hide();
					});
				}
			}, // END slide 1
		],
		finish_action : function(wizard) {
			wizard.workflow.parents('.panel').slideUp().removeClass('active').parents('.active').removeClass('active');
		}
	};

	function set_size_select(selects, unit_type, context) {
		selects.hide();
		selects.filter('#size_id_'+ unit_type, context).show();
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
				minDate: new Date()
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
					for (key in data)
						inputs[key].text(data[key]);
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
	
	// ajaxify the login form and forgot password link
	$('#XXXlogin_link').click(function() {
		var $this = $(this);
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
	$('#XXXnew_user_session').live('submit', function() {
		var form = $(this).runValidation(),
			overlay = $.applyLoadingOverlay(form.parents('#login_page'));
		
		if (form.data('valid') && !form.data('sending')) {

			overlay.fadeIn();
			form.data('sending', true);
			
			$.post(form.attr('action'), form.serialize(), function(response) {
				$.with_json(response, function(data) {
					var ready_mem = $('#ready_member', form);
					
					if (data.role == 'advertiser' && ready_mem.length == 0) {
						window.top.location.href = data.account_path;
						overlay.fadeOut('fast', function() { form.html('<p class="login_success">Looks good!<br /> If you aren\'t redirected to your account, <a href="'+ data.account_path +'" title="Trust me, this is a link to your account!">click here</a></p>') })
					} else {
						//$('#topbar').html(data.html);
						//$('#pop_up.login_box').fadeOutRemove();
						window.top.location.href = '/admin';
						
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
	
	$('#forgot_pass_link', '#pop_up').live('click', function() {
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
		return false;
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
	
	$('#already_member').live('click', function() {
		// inject a hidden input so that the login action will know what to do
		$('#new_user_session').append('<input type="hidden" id="ready_member" value="'+ $(this).attr('data-ready_member') +'" />');
		
		// open login pop up
		$('#login_link', '#topbar').click();
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
				var area = $(this), img = $('<img class="map_overlay" src="http://s3.amazonaws.com/storagelocator/images/ui/storagelocator/us_map/'+ area.attr('rel') +'.png" alt="" />');
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
						
						new_city.show().attr('href', city_link.attr('href') + wizard.slide_data[1].data.state +'/'+ city.toLowerCase().replaceAll(' ', '-'));
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
			
			$.post('/ajax/find_listings', form_data, function(response){
				$.with_json(response, function(data){
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
	
	$('#chk_avail').click(function(){ return false; });
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
						email_input.addClass('invalid').focus();
						chk_avail.text('Already Taken').attr('title', 'You may have already signed up in the past. Try logging in.').removeClass('avail').addClass('not_avail').show();
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
					title = 'Activate Real Time Reservations', 
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
								pop_up_title : 'Grant Access',
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
		// 1). Click NEW button, get a partial from the server and prepend to the listing box
		$('#add_fac', '#ov-units').click(function(){
			var $this 		   = $(this),
				listing_box    = $('#client_listing_box', $this.parent().parent()),
				ajax_loader    = $this.prev('.ajax_loader').show();
		
			// GET PARTIAL
			$.getJSON('/ajax/get_partial?model=Listing&partial=/listings/listing', function(response){
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
			
			$.post('/clients/'+ $('#client_id').text() +'/listings/'+ listing_id.replace('Listing_', '') +'/disable', { authenticity_token: $.get_auth_token() }, function(response) {
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
				
				var params = { title: title_input.val(), client_id: $('#client_id').text() };
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
				
				$('input[name="listing[map_attributes]['+ input_name +']"]', '.listing:eq(0)').live('blur', function(){
					var input = $('input[name="listing[map_attributes]['+ input_name +']"]', '.listing:eq(0)').removeClass('invalid');

					if (input.val() != '' && input.val() != input.attr('title')) done_action.call(this, tip_text, blur_msg);
					else input.focus().addClass('invalid');

				});
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
							address : $('input[name="listing[map_attributes][address]"]', partial).val(),
							city 	: $('input[name="listing[map_attributes][city]"]', partial).val(),
							state 	: $('input[name="listing[map_attributes][state]"]', partial).val(),
							zip 	: $('input[name="listing[map_attributes][zip]"]', partial).val()
						};

					// SAVE ADDRESS WHEN USER CLICKS SAVE
					$.post('/listings/'+ listing_id, { _method: 'put', listing: { map_attributes: attributes }, from: 'quick_create', authenticity_token: $.get_auth_token() }, function(response){
						$.with_json(response, function(data){
							button.text('Edit').unbind('click').attr('href', '/clients/'+ $('#client_id').text() +'/listings/'+ listing_id +'/edit');
							
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
	
	$('#tracking_num_req', '#tab1').live('click', function() {
		var $this = $(this),
			ajax_loader = $.new_ajax_loader('after', $this).show();
		
		get_pop_up_and_do({ title: 'Request Tracked Number', modal: true }, { sub_partial: '/listings/tracking_request', model: 'Listing', id: $('#listing_id').val() }, function(pop_up) {
			$('.numeric_phone', pop_up).formatPhoneNum();
		});
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
		var thumb = $('<li><img src="http://s3.amazonaws.com/storagelocator/images/ui/ajax-loader-lrg.gif" class="loading" alt="" /><a class="iconOnly16 delete_link right" title="Delete this picture">Delete</a></li>');;
		
		if ($('.main_pic', '#sl-tabs-pict-in').length == 0) {
			var image = $('<img class="big-pic" src="" alt="" />');
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
				var form = $('#edit_info', wrap.parent()).runValidation();

				if (!$this.data('saving') && form.data('valid')) {
					$this.data('saving', true);
					$('.cancel_link', $this.parent()).remove();
					ajax_loader.show();

					$.post(form.attr('action'), form.serialize(), function(response) {
						$.with_json(response, function(data) {
							$this.text('Edit').after('<span class="success_msg">Saved!</span>').next('.success_msg').fadeOutLater('slow', 3000);
							wrap.show().html(data);
							form.remove();
						});

						$this.data('saving', false);
						ajax_loader.hide();
					});
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
	
	$('#account_home_link').click(function() {
		// for some reason the stats_graph div was getting a width of 400px when the page loaded with it hidden (navigated from the listing edit page through one of the client option links)
		$('#stats_graph').css('width', '700px');
		init_stats_graph();
	});
	
	$('.auto_change', '#ov-reports-cnt').change(function(){
		$('#stats_graph').children().fadeTo('slow', .5);
		init_stats_graph({ months_ago : this.value, force: true });
	});
	
	function init_stats_graph(options) {
		if (typeof options == 'undefined') var options = {}
		var stats_graph = $('#stats_graph'),
			days_ago 	= options.days_ago 	 || 0,
			months_ago 	= options.months_ago || 1,
			years_ago 	= options.years_ago  || 0,
			force 		= options.force 	 || false;
		
		if (stats_graph.length > 0) {
			stats_graph.addClass('loading');

			var issn_enabled = $('input#issn_enabled').val() == 'false' ? false : true,
				stats_models = 'clicks,impressions,'+ (issn_enabled ? 'rentals' : 'info_requests'),
				d = new Date(), // getMonth returns 0-11
				end_date = new Date(d.getFullYear(), d.getMonth(), d.getDate()+1),
				start_date = new Date((d.getFullYear() - years_ago), (d.getMonth() - months_ago), (d.getDate() - days_ago)); // month in the past

			$.getJSON('/ajax/get_client_stats?start_date='+ start_date +'&end_date='+ end_date +'&stats_models='+ stats_models +'&client_id='+ $('#client_id').text(), function(response){
				$.with_json(response, function(data) {
					$.jqplot.preInitHooks.push(function() {
						stats_graph.children().remove();
					});
					
					var plot_data = [],
						stats_arr = stats_models.split(/,\W?/);
						
					for (i in stats_arr) 
						plot_data.push(data['data'][stats_arr[i]]);

					$.jqplot('stats_graph', plot_data, {
						axes: {
							xaxis: { 
								renderer: $.jqplot.DateAxisRenderer,
								rendererOptions: { tickRenderer: $.jqplot.CanvasAxisTickRenderer },
					            tickOptions: { formatString:'%b %#d, %Y', fontSize:'12px' }
							},
							yaxis: { min: 0, max: parseInt(data['max']) + 1 },
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
				});

				stats_graph.removeClass('loading');
			});
		}
	}
	init_stats_graph({ months_ago : $('select.auto_change', '#ov-reports-cnt').val() });
	
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
		img.attr('src', 'http://s3.amazonaws.com/storagelocator/images/ui/ajax-loader-lrg.gif').css({ 'height': '44px', 'border-color': '#fff' });
		
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
				['back', function(btn, wizard) { btn.show().bind('click', close_pop_up_and_focus_on_fac_name) }]
			]
		},
		{ 
			div_id  : 'signupstep_3',
			action  : workflow_step3,
			nav_vis : [
				['next', function(btn, wizard) { btn.text('Next').data('done', false).show() }],
				['skip', 'fadeOut'],
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
				return $('#terms_use', wizard.workflow).runValidation().data('valid');
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
		$('#new_client')[0].reset();
		$('#chk_avail, .ajax_loader', '#new_client').hide();
	}
};

function ensure_no_listings_checked() {
	$('input[name=listing_id]:checked', '#signupstep_2').attr('checked', false).parents('.selected').removeClass('selected');
}

function close_pop_up_and_focus_on_fac_name(event){
	$('#pop_up').dialog('close');
	$('#client_company', '#new_client').focus();
}

function workflow_step2(wizard) {
	var listings_box = $('.small_listings', arguments[0].workflow);
	
	if (listings_box.children().length == 0) {
		listings_box.hide();
		var listing_prototype = $('.listing_div', arguments[0].workflow).eq(0).removeClass('hidden').remove();
		$('.found_box p span', wizard.workflow).text(wizard.slide_data[0].data.length); // number of listings returned

		$.each(wizard.slide_data[0].data, function(i){
			var listing = this.listing,
				listing_div = listing_prototype.clone();

			$('.check input', listing_div).val(listing.id);
			$('.num', listing_div).text(i+1);
			$('.listing_title', listing_div).text(listing.title);
			$('.listing_address', listing_div).html('<span class="street_address">'+ listing.address +'</span><br />'+ listing.city +', '+ listing.state +' <span class="zip">'+ listing.zip +'</span>');

			listing_div.attr('id', 'Listing_'+ listing.id).appendTo(listings_box);
		});

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
	var nav_btns = $('.button', wizard.nav_bar).hide();
	$('#signup_processing .ajax_loader', wizard.workflow).fadeIn();
	
	$.post('/clients', wizard.form_data, function(response) {
		$.with_json(response, function(data) {
			nav_btns.filter('.next').show();
			$('#signup_processing', wizard.workflow).hide();
			$('#signup_complete', wizard.workflow).show();
			$('#resend_link', wizard.workflow).attr('href', '/resend_activation/'+ data.activation_code);
		});
	}, 'json');
}

// HELPERS

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
		img.src = 'http://s3.amazonaws.com/storagelocator/images/ui/storagelocator/us_map/'+ this +'.png';
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
