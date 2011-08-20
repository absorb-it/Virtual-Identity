/* ***** BEGIN LICENSE BLOCK *****
    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program; if not, write to the Free Software
    Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA

    The Original Code is the Virtual Identity Extension.

    The Initial Developer of the Original Code is Rene Ejury.
    Portions created by the Initial Developer are Copyright (C) 2007
    the Initial Developer. All Rights Reserved.

    Contributor(s): Christian Weiske
    Contributor(s): Patrick Brunschwig
    Contributor(s): http://xulsolutions.blogspot.com/2006/07/creating-uninstall-script-for.html

 * ***** END LICENSE BLOCK ***** */

/**
* some code copied and adapted from 'display Mail User Agent (MUA)'
* thanks to Christian Weiske <cweiske@cweiske.de>
*/
/**
* some code copied and adapted from 'enigmail'
* thanks to Patrick Brunschwig <patrick.brunschwig@gmx.net>
*/
/**
* some code copied and adapted from 'http://xulsolutions.blogspot.com/2006/07/creating-uninstall-script-for.html'
* thanks to the unknown programmer
*/

virtualIdentityExtension.ns(function() { with (virtualIdentityExtension.LIB) {
var getHeader = {
	messenger: null,
	preferences : Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefService)
			.getBranch("extensions.virtualIdentity."),
			
	unicodeConverter : Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
			.createInstance(Components.interfaces.nsIScriptableUnicodeConverter),

	strings : document.getElementById("vIdentBundle"),
	
	headerToSearch : null,
	
	prepareHeaderToSearchArray : function() {
		var headerList = getHeader.unicodeConverter.ConvertToUnicode(getHeader.preferences.getCharPref("smart_reply_headers")).split(/\n/)
		
		getHeader.headerToSearch = [];
		
		// prepare headerToSearch for speedup.
		for (var index = 0; index < headerList.length; index++) {
			var headerToSearch_splitted = headerList[index].split(/:/)
			// use first part (all before ':') as the header name
			var headerNameToSearch = headerToSearch_splitted[0].toLowerCase()
			// check second or third part for any number
			var headerNumberToSearch = parseInt(headerToSearch_splitted[1])
			if (isNaN(headerNumberToSearch)) headerNumberToSearch = parseInt(headerToSearch_splitted[2])
			
			// create header name to store the value
			var headerNameToStore = "vI_" + headerNameToSearch
			if (!isNaN(headerNumberToSearch)) headerNameToStore += ":" + headerNumberToSearch
			
			getHeader.headerToSearch.push({ headerNameToSearch : headerNameToSearch, headerNumberToSearch : headerNumberToSearch,
					headerNameToStore : headerNameToStore });
		}
	},

	getHeaderDummy: function() {
		
	},
	
	getHeader: function(hdr) {
		vI.notificationBar.clear_dump()
		var index;

		if (!getHeader.headerToSearch) getHeader.prepareHeaderToSearchArray()

		var found = false; var label = "";
		var subtitle = getHeader.strings.getString("vident.getHeader.noHeader");
		// create array to count the header
		var currentHeadersCounter = [];
		
		var listId = false; var received = false; var content_base = false;
		for (var header in currentHeaderData) {
			var headerName = currentHeaderData[header].headerName.toLowerCase();
// 			vI.notificationBar.dump("## getHeader: found header: " + currentHeaderData[header].headerName + "\n");

			// remember list-id header to prevent using Mailing-List addresses as sender
			if (!listId && headerName == "list-id") {
				hdr.setStringProperty("vI_list-id","found"); listId = true;
				vI.notificationBar.dump("## getHeader: found header: list-id  ...stored to recognize mailing-list\n");
// 				continue;
			}

			// remember received header to prevent using Mailing-List addresses as sender
			if (!received && headerName == "received") {
				hdr.setStringProperty("vI_received","found"); received = true;
				vI.notificationBar.dump("## getHeader: found header: received  ...stored to recognize received mail\n");
// 				continue;
			}
			
			// remember content-base header to prevent using Blog/News-Feed addresses as sender
			if (!content_base && headerName == "content-base") {
				hdr.setStringProperty("vI_content_base","found"); content_base = true;
				vI.notificationBar.dump("## getHeader: found header: content-base  ...stored to recognize blog/news-feed\n");
// 				continue;
			}

			if (currentHeadersCounter[headerName]) currentHeadersCounter[headerName]++
			else currentHeadersCounter[headerName] = 1
			
			for (var index = 0; index < getHeader.headerToSearch.length; index++) {
				if (headerName == getHeader.headerToSearch[index].headerNameToSearch &&
					(isNaN(getHeader.headerToSearch[index].headerNumberToSearch) ||
						getHeader.headerToSearch[index].headerNumberToSearch == currentHeadersCounter[headerName])) {
					
					var value = currentHeaderData[header].headerValue;
					if (currentHeadersCounter[headerName] != 1)
						value = hdr.getStringProperty(getHeader.headerToSearch[index].headerNameToStore) + 
						", " + value;
					hdr.setStringProperty(getHeader.headerToSearch[index].headerNameToStore,getHeader.unicodeConverter.ConvertFromUnicode(value) + getHeader.unicodeConverter.Finish());

					var storedValue = hdr.getProperty(getHeader.headerToSearch[index].headerNameToStore)
					var storedConvValue = getHeader.unicodeConverter.ConvertToUnicode(storedValue)
					vI.notificationBar.dump("## getHeader: found header: " + headerName +
						"[:" + currentHeadersCounter[headerName] + "] - stored as '" + 
						storedConvValue + "'\n");
					if (!found) { 
						subtitle = getHeader.strings.getString("vident.getHeader.headerFound");
						found = true;
					}
					label += (label)?"\n":""
					label += currentHeaderData[header].headerName + 
					"[:" + currentHeadersCounter[headerName] + "]:\t" + currentHeaderData[header].headerValue
					break;
				}
			}
		}
		vI.notificationBar.setNote(label, "get_header_notification", subtitle);
	},
	
	hideExtraHeader: function() {
		var addedHdrs = prepareHeader.prefroot.getCharPref("extensions.virtualIdentity.smart_reply_added_extraHeaders").split(/ /);
		for (var index = 0; index < addedHdrs.length; index++) {
			var header_to_search_splitted=addedHdrs[index].split(/:/)
			var header_to_search=header_to_search_splitted[0].toLowerCase()
			if (typeof(gExpandedHeaderView[header_to_search]) == "object") {
                if (! gViewAllHeaders) {
                    gExpandedHeaderView[header_to_search].enclosingBox.setAttribute("hidden", true);
                }
                else {
                    gExpandedHeaderView[header_to_search].enclosingBox.removeAttribute("hidden");
                }
			}
		}
	},

	setupEventListener: function() {
		var listener = {};
		listener.onStartHeaders	= getHeader.hideExtraHeader;
		listener.onEndHeaders	= getHeader.getHeaderDummy;
		gMessageListeners.push(listener);

		getHeader.messenger = Components.classes["@mozilla.org/messenger;1"].createInstance();
		getHeader.messenger = getHeader.messenger.QueryInterface(Components.interfaces.nsIMessenger);
		getHeader.strings = document.getElementById("vIdentBundle");
		
		getHeader.unicodeConverter.charset = "UTF-8";
		
		// read headers later if msg is loaded completely - this ensures compatibility to Thunderbird Conversation
		getHeader.orig_OnMsgLoaded = OnMsgLoaded;
		OnMsgLoaded = getHeader.OnMsgLoaded;
	},
	
	OnMsgLoaded: function(url) {
		const Cc = Components.classes;
		const Ci = Components.interfaces;
		// Necko URL, so convert it into a message header
        let ioService = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
        var neckoURL = ioService.newURI(null, null, url.baseURI);
		neckoURL.QueryInterface(Ci.nsIMsgMessageUrl);
		
		var msgHdr = neckoURL.messageHeader;
		if (msgHdr) getHeader.getHeader(msgHdr);
		getHeader.orig_OnMsgLoaded(url)
	}
}


var prepareHeader = {
	prefroot : Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefService)
			.getBranch(null),

	unicodeConverter : Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
			.createInstance(Components.interfaces.nsIScriptableUnicodeConverter),
			
	observer_added : false,
	
	init : function() {
		prepareHeader.orig_initializeHeaderViewTables = initializeHeaderViewTables;
		initializeHeaderViewTables = prepareHeader.replacement_initializeHeaderViewTables;
		if (prepareHeader.addExtraHeader()) prepareHeader.addObserver();
	},
	
	replacement_initializeHeaderViewTables : function() {
		prepareHeader.cleanup();
		vI.notificationBar.dump("## getHeader: initializeHeaderViewTables\n");
		prepareHeader.orig_initializeHeaderViewTables();
		if (prepareHeader.addExtraHeader()) prepareHeader.addObserver();
	},
	
	cleanup : function() {
		prepareHeader.removeObserver();
		prepareHeader.removeExtraHeader();
	},
	
	addObserver : function() {
		if (prepareHeader.observer_added) return;
		prepareHeader.prefroot.QueryInterface(Components.interfaces.nsIPrefBranch2);
		prepareHeader.prefroot.addObserver("extensions.virtualIdentity.smart_reply_headers", this, false);
        prepareHeader.uninstallObserver.register();
		prepareHeader.observer_added = true;
	},
	
	removeObserver : function() {
		if (!prepareHeader.observer_added) return;
		prepareHeader.prefroot.removeObserver("extensions.virtualIdentity.smart_reply_headers", this);
        prepareHeader.uninstallObserver.unregister();
		prepareHeader.observer_added = false;
	},
	
	// this is a adapted copy of enigEnsureExtraHeaders() from enigmail, thanks
	addExtraHeader : function() {
		prepareHeader.unicodeConverter.charset = "UTF-8";
		var header_list = prepareHeader.unicodeConverter.ConvertToUnicode(prepareHeader.prefroot.getCharPref("extensions.virtualIdentity.smart_reply_headers")).split(/\n/)
		
		// add List-Id to recognizable headers to prevent using Mailing-List addresses as sender
		header_list.push("List-Id")

		// add Received to recognizable headers to detect if mail was sent or received
		header_list.push("Received")

		// add Website to recognizable headers to detect Blog/News-Posts
		header_list.push("content-base")

// 		try {
			var extraHdrs = " " + 
				prepareHeader.prefroot.getCharPref("mailnews.headers.extraExpandedHeaders").toLowerCase();

            var addedHeaders = prepareHeader.prefroot.getCharPref("extensions.virtualIdentity.smart_reply_added_extraHeaders");

			for (var index = 0; index < header_list.length; index++) {
				var headerToSearch_splitted = header_list[index].split(/:/)
				var headerToSearch = headerToSearch_splitted[0].toLowerCase()
				
				var j; var found = false;
				
				// collapsedHeaderView is removed in 
				// https://bugzilla.mozilla.org/show_bug.cgi?id=480623
				// http://build.mozillamessaging.com/mercurial/comm-central/rev/1fbbd90413d9
				if (typeof(gCollapsedHeaderList) != "undefined") {
					// check if Header is included in collapsed HeaderView
					for (var j = 0; j < gCollapsedHeaderList.length; j++) {
						if (gCollapsedHeaderList[j].name == headerToSearch) {
	// 						vI.notificationBar.dump("## prepareHeader: Header '" + headerToSearch + "' in gCollapsedHeaderList\n");
							found = true; break;
						}
					}
					if (found) continue;
				}

				// check if Header is included in expanded HeaderView
				for (var j = 0; j < gExpandedHeaderList.length; j++) {
					if (gExpandedHeaderList[j].name == headerToSearch) {
// 						vI.notificationBar.dump("## prepareHeader: Header '" + headerToSearch + "' in gExpandedHeaderList\n");
						found = true; break;
					}
				}
				if (found) continue;

				if ((extraHdrs.indexOf(" " + headerToSearch + " ") < 0) &&
					(addedHeaders.indexOf(" " + headerToSearch + " ") < 0))
                        addedHeaders += " " + headerToSearch;
// 				else vI.notificationBar.dump("## prepareHeader: Header '" + headerToSearch + "' already in extraExpandedHeaders\n");
			}
			
			addedHeaders = addedHeaders.replace(/^\s+|\s+$/g,"")
			if (addedHeaders.length > 0) {
                extraHdrs += " " + addedHeaders;
				extraHdrs = extraHdrs.replace(/^\s+|\s+$/g,"")
				prepareHeader.prefroot.setCharPref("mailnews.headers.extraExpandedHeaders", extraHdrs)
				prepareHeader.prefroot.setCharPref("extensions.virtualIdentity.smart_reply_added_extraHeaders", addedHeaders)
				vI.notificationBar.dump("## prepareHeader: extraExpandedHeaders '" + addedHeaders + "' added\n");
			}		

			return true;
// 		}
// 		catch (e) {
// 			vI.notificationBar.dump("## prepareHeader: your application is too old, please update. Otherwise try to install mnenhy or enigmail to use additional headers.")
// 			return false;
// 		}
	},

	removeExtraHeader: function() {
		vI.notificationBar.dump("## prepareHeader: cleanupExtraHeader\n");

        var addedHdrs = prepareHeader.prefroot.getCharPref("extensions.virtualIdentity.smart_reply_added_extraHeaders").split(/ /);

		if (addedHdrs.length > 0) {
			var extraHdrs = prepareHeader.prefroot.getCharPref("mailnews.headers.extraExpandedHeaders").toLowerCase().split(/ /);
		
			for (var i = 0; i < addedHdrs.length; i++) {
				for (var j = 0; j < extraHdrs.length; j++) {
					if (extraHdrs[j] == addedHdrs[i]) {
						extraHdrs.splice(j,1);
						break;
					}
				}
			}
			vI.notificationBar.dump("## prepareHeader: extraExpandedHeaders '" + addedHdrs.join(" ") + "' removed\n");
            prepareHeader.prefroot.setCharPref("mailnews.headers.extraExpandedHeaders", extraHdrs.join(" "))
			prepareHeader.prefroot.setCharPref("extensions.virtualIdentity.smart_reply_added_extraHeaders", "")
		}
	},
	
	observe: function(subject, topic, data) {
		if (topic == "nsPref:changed") {
			prepareHeader.removeExtraHeader();
			prepareHeader.addExtraHeader();
			vI.notificationBar.dump("## prepareHeader: changed preference '" + subject + " " + topic + " " + data + "'\n");
			
			// remove (old) prepared headerArray
			getHeader.headerToSearch = null;
			
			vI.notificationBar.dump("## prepareHeader: reload Message\n");
			MsgReload();
		}
	},

//  code adapted from http://xulsolutions.blogspot.com/2006/07/creating-uninstall-script-for.html
    uninstallObserver : {
        _uninstall : false,
        observe : function(subject, topic, data) {
            if (topic == "quit-application-granted") {
                /* uninstall stuff. */
                vI.notificationBar.dump("## vI.uninstall: uninstall/disabledment \n");
                prepareHeader.removeExtraHeader();
                vI.notificationBar.dump("## vI.uninstall: uninstall/disablement done\n");
                this.unregister();
            }
        },
        register : function() {
            Components.classes["@mozilla.org/observer-service;1"].
                getService(Components.interfaces.nsIObserverService).
                    addObserver(this, "quit-application-granted", false);
        },
        unregister : function() {
            Components.classes["@mozilla.org/observer-service;1"].
                getService(Components.interfaces.nsIObserverService).
                    removeObserver(this,"quit-application-granted");
        }
    }
}
addEventListener('messagepane-loaded', getHeader.setupEventListener, true);
window.addEventListener("load", function(e) { prepareHeader.init(); }, false);
window.addEventListener("unload", function(e) { prepareHeader.cleanup(); }, false);
}});
