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
 * ***** END LICENSE BLOCK ***** */

/**
* some code copied and adapted from 'display Mail User Agent (MUA)'
* thanks to Christian Weiske <cweiske@cweiske.de>
*/
/**
* some code copied and adapted from 'enigmail'
* thanks to Patrick Brunschwig <patrick.brunschwig@gmx.net>
*/

var vI_getHeader = {
	messenger: null,
	preferences : Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefService)
			.getBranch("extensions.virtualIdentity."),
			
	unicodeConverter : Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
			.createInstance(Components.interfaces.nsIScriptableUnicodeConverter),

	strings : document.getElementById("vIdentBundle"),
	
	headerToSearch : null,
	
	prepareHeaderToSearchArray : function() {
		var headerList = vI_getHeader.unicodeConverter.ConvertToUnicode(vI_getHeader.preferences.getCharPref("smart_reply_headers")).split(/\n/)
		
		vI_getHeader.headerToSearch = [];
		
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
			
			vI_getHeader.headerToSearch.push({ headerNameToSearch : headerNameToSearch, headerNumberToSearch : headerNumberToSearch,
					headerNameToStore : headerNameToStore });
		}
	},

	getHeader: function() {
		vI_notificationBar.clear_dump()
		vI_notificationBar.dump("## vI_getHeader: onEndHeaders\n")
		var index;

		var srcMsgURI = GetLoadedMessage();
		if (srcMsgURI == null) return;
		
		if (/type=application\/x-message-display/.test(srcMsgURI)) {
			vI_notificationBar.dump("## vI_getHeader: opening stored Message, can't get Message Header\n");
			return;
		}
		
		try { var hdr = vI_getHeader.messenger.messageServiceFromURI(srcMsgURI).messageURIToMsgHdr(srcMsgURI); }
		catch(vErr) {
			vI_notificationBar.dump("## vI_getHeader: can't get Message Header.\n");
			return;
		};

		if (!vI_getHeader.headerToSearch) vI_getHeader.prepareHeaderToSearchArray()

		var found = false; var label = "";
		var subtitle = vI_getHeader.strings.getString("vident.getHeader.noHeader");
		// create array to count the header
		var currentHeadersCounter = []
		// loop through the headers
		for (var header in currentHeaderData) {
			var headerName = currentHeaderData[header].headerName.toLowerCase()

			// remember list-id header to prevent using Mailing-List addresses as sender
			if (headerName == "list-id") {
				hdr.setStringProperty("vI_list-id","found");
				vI_notificationBar.dump("## vI_getHeader: found header: list-id  ...stored to recognize mailing-list\n");
				continue;
			}

			if (currentHeadersCounter[headerName]) currentHeadersCounter[headerName]++
			else currentHeadersCounter[headerName] = 1
			vI_notificationBar.dump("## vI_getHeader: found header: " + headerName + 
					"[:" + currentHeadersCounter[headerName] + "]");
			
			for (var index = 0; index < vI_getHeader.headerToSearch.length; index++) {
				if (headerName == vI_getHeader.headerToSearch[index].headerNameToSearch &&
					(isNaN(vI_getHeader.headerToSearch[index].headerNumberToSearch) ||
						vI_getHeader.headerToSearch[index].headerNumberToSearch == currentHeadersCounter[headerName])) {
					
					var value = currentHeaderData[header].headerValue;
					if (currentHeadersCounter[headerName] != 1)
						value = hdr.getStringProperty(vI_getHeader.headerToSearch[index].headerNameToStore) + 
						", " + value;
					hdr.setStringProperty(vI_getHeader.headerToSearch[index].headerNameToStore,vI_getHeader.unicodeConverter.ConvertFromUnicode(value) + vI_getHeader.unicodeConverter.Finish());

					storedValue = hdr.getProperty(vI_getHeader.headerToSearch[index].headerNameToStore)
					storedConvValue = vI_getHeader.unicodeConverter.ConvertToUnicode(storedValue)
					vI_notificationBar.dump(" ...stored as '" + storedConvValue + "'");
					if (!found) { 
						subtitle = vI_getHeader.strings.getString("vident.getHeader.headerFound");
						found = true;
					}
					label += (label)?"\n":""
					label += currentHeaderData[header].headerName + 
					"[:" + currentHeadersCounter[headerName] + "]:\t" + currentHeaderData[header].headerValue
					break;
				}
			}
			vI_notificationBar.dump("\n");
		}
		vI_notificationBar.setNote(label, "get_header_notification", subtitle);
	},
	
	hideExtraHeader: function() {
		var header_list = vI_prepareHeader.addedHeaders
		for (var index = 0; index < header_list.length; index++) {
			var header_to_search_splitted=header_list[index].split(/:/)
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
		listener.onStartHeaders	= vI_getHeader.hideExtraHeader;
		listener.onEndHeaders	= vI_getHeader.getHeader;
		gMessageListeners.push(listener);

		vI_getHeader.messenger = Components.classes["@mozilla.org/messenger;1"].createInstance();
		vI_getHeader.messenger = vI_getHeader.messenger.QueryInterface(Components.interfaces.nsIMessenger);
		vI_getHeader.strings = document.getElementById("vIdentBundle");
		
		vI_getHeader.unicodeConverter.charset = "UTF-8";
	}
}


var vI_prepareHeader = {
	prefroot : Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefService)
			.getBranch(null),

	unicodeConverter : Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
			.createInstance(Components.interfaces.nsIScriptableUnicodeConverter),
			
	addedHeaders : [],
	
	observer_added : false,
	
	init : function() {
		vI_notificationBar.dump("## vI_prepareHeader: init\n");
		if (vI_prepareHeader.addExtraHeader()) vI_prepareHeader.addObserver();
	},
	
	cleanup : function() {
		vI_notificationBar.dump("## vI_prepareHeader: cleanup\n");
		vI_prepareHeader.removeObserver();
		vI_prepareHeader.removeExtraHeader();
	},
	
	addObserver : function() {
		if (vI_prepareHeader.observer_added) return;
		vI_prepareHeader.prefroot.QueryInterface(Components.interfaces.nsIPrefBranch2);
		vI_prepareHeader.prefroot.addObserver("extensions.virtualIdentity.smart_reply_headers", this, false);
		vI_prepareHeader.observer_added = true;
		vI_notificationBar.dump("## vI_prepareHeader: prefs observer added\n");
	},
	
	removeObserver : function() {
		if (!vI_prepareHeader.observer_added) return;
		vI_prepareHeader.prefroot.removeObserver("extensions.virtualIdentity.smart_reply_headers", this);
		vI_notificationBar.dump("## vI_prepareHeader: prefs observer removed\n");
		vI_prepareHeader.observer_added = false;
	},
	
	// this is a adapted copy of enigEnsureExtraHeaders() from enigmail, thanks
	addExtraHeader : function() {
		vI_notificationBar.dump("## vI_prepareHeader: addExtraHeader\n");
		vI_prepareHeader.unicodeConverter.charset = "UTF-8";
		var header_list = vI_prepareHeader.unicodeConverter.ConvertToUnicode(vI_prepareHeader.prefroot.getCharPref("extensions.virtualIdentity.smart_reply_headers")).split(/\n/)
		
		// add List-Id to recognizable headers to prevent using Mailing-List addresses as sender
		header_list.push("List-Id")

		try {
			var extraHdrs = " " + 
				vI_prepareHeader.prefroot.getCharPref("mailnews.headers.extraExpandedHeaders").toLowerCase()
				+ " ";

			for (var index = 0; index < header_list.length; index++) {
				var headerToSearch_splitted = header_list[index].split(/:/)
				var headerToSearch = headerToSearch_splitted[0].toLowerCase()
				
				var j; var found = false;
				// check if Header is included in collapsed HeaderView
				for (var j = 0; j < gCollapsedHeaderList.length; j++) {
					if (gCollapsedHeaderList[j].name == headerToSearch) {
						vI_notificationBar.dump("## vI_prepareHeader: Header '" + headerToSearch + "' in gCollapsedHeaderList\n");
						found = true; break;
					}
				}
				if (found) continue;
				// check if Header is included in expanded HeaderView
				for (var j = 0; j < gExpandedHeaderList.length; j++) {
					if (gExpandedHeaderList[j].name == headerToSearch) {
						vI_notificationBar.dump("## vI_prepareHeader: Header '" + headerToSearch + "' in gExpandedHeaderList\n");
						found = true; break;
					}
				}
				if (found) continue;

				var addedHeadersString = " " + vI_prepareHeader.addedHeaders.join(" ") + " "
				if ((extraHdrs.indexOf(" " + headerToSearch + " ") < 0) &&
					(addedHeadersString.indexOf(" " + headerToSearch + " ") < 0))
					vI_prepareHeader.addedHeaders.push(headerToSearch);
				else vI_notificationBar.dump("## vI_prepareHeader: Header '" + headerToSearch + "' already in extraExpandedHeaders\n");
			}
			
			if (vI_prepareHeader.addedHeaders.length > 0) {
				extraHdrs += vI_prepareHeader.addedHeaders.join(" ");
				extraHdrs = extraHdrs.replace(/^\s+|\s+$/g,"")
				vI_prepareHeader.prefroot.setCharPref("mailnews.headers.extraExpandedHeaders", extraHdrs)
			}
			vI_notificationBar.dump("## vI_prepareHeader: extraExpandedHeaders '" + vI_prepareHeader.addedHeaders.join(" ") + "' added\n");
			
			
			vI_notificationBar.dump("## vI_prepareHeader: done\n");
			return true;
		}
		catch (e) {
			vI_notificationBar.dump("## vI_prepareHeader: your application is too old, please update. Otherwise try to install mnenhy or enigmail to use additional headers.")
			return false;
		}
	},

	removeExtraHeader: function() {
		vI_notificationBar.dump("## vI_prepareHeader: cleanupExtraHeader\n");

		if (vI_prepareHeader.addedHeaders.length > 0) {
			var extraHdrs = vI_prepareHeader.prefroot.getCharPref("mailnews.headers.extraExpandedHeaders").toLowerCase().split(/ /);
		
			for (var i = 0; i < vI_prepareHeader.addedHeaders.length; i++) {
				for (var j = 0; j < extraHdrs.length; j++) {
					if (extraHdrs[j] == vI_prepareHeader.addedHeaders[i]) {
						extraHdrs.splice(j,1);
						break;
					}
				}
			}
			vI_prepareHeader.prefroot.setCharPref("mailnews.headers.extraExpandedHeaders", extraHdrs.join(" "))
			vI_notificationBar.dump("## vI_prepareHeader: extraExpandedHeaders '" + vI_prepareHeader.addedHeaders.join(" ") + "' removed\n");
			vI_prepareHeader.addedHeaders = [];
		}
	},
	
	observe: function(subject, topic, data) {
		if (topic == "nsPref:changed") {
			vI_prepareHeader.removeExtraHeader();
			vI_prepareHeader.addExtraHeader();
			vI_notificationBar.dump("## vI_prepareHeader: changed preference '" + subject + " " + topic + " " + data + "'\n");
			
			// remove (old) prepared headerArray
			vI_getHeader.headerToSearch = null;
			
			vI_notificationBar.dump("## vI_prepareHeader: reload Message\n");
			MsgReload();
		}
	}
}

addEventListener('messagepane-loaded', vI_getHeader.setupEventListener, true);
window.addEventListener("load", function(e) { vI_prepareHeader.init(); }, false);
window.addEventListener("unload", function(e) { vI_prepareHeader.cleanup(); }, false);
