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
		var index;

		try { var srcMsgURI = gDBView.URIForFirstSelectedMessage; } catch (ex) { return; }
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
		var currentHeadersCounter = [];
		
		var vI_listId = false; var vI_received = false; var vI_content_base = false;
		for (var header in currentHeaderData) {
			var headerName = currentHeaderData[header].headerName.toLowerCase();
// 			vI_notificationBar.dump("## vI_getHeader: found header: " + currentHeaderData[header].headerName + "\n");

			// remember list-id header to prevent using Mailing-List addresses as sender
			if (!vI_listId && headerName == "list-id") {
				hdr.setStringProperty("vI_list-id","found"); vI_listId = true;
				vI_notificationBar.dump("## vI_getHeader: found header: list-id  ...stored to recognize mailing-list\n");
// 				continue;
			}

			// remember received header to prevent using Mailing-List addresses as sender
			if (!vI_received && headerName == "received") {
				hdr.setStringProperty("vI_received","found"); vI_received = true;
				vI_notificationBar.dump("## vI_getHeader: found header: received  ...stored to recognize received mail\n");
// 				continue;
			}
			
			// remember content-base header to prevent using Blog/News-Feed addresses as sender
			if (!vI_content_base && headerName == "content-base") {
				hdr.setStringProperty("vI_content_base","found"); vI_content_base = true;
				vI_notificationBar.dump("## vI_getHeader: found header: content-base  ...stored to recognize blog/news-feed\n");
// 				continue;
			}

			if (currentHeadersCounter[headerName]) currentHeadersCounter[headerName]++
			else currentHeadersCounter[headerName] = 1
			
			for (var index = 0; index < vI_getHeader.headerToSearch.length; index++) {
				if (headerName == vI_getHeader.headerToSearch[index].headerNameToSearch &&
					(isNaN(vI_getHeader.headerToSearch[index].headerNumberToSearch) ||
						vI_getHeader.headerToSearch[index].headerNumberToSearch == currentHeadersCounter[headerName])) {
					
					var value = currentHeaderData[header].headerValue;
					if (currentHeadersCounter[headerName] != 1)
						value = hdr.getStringProperty(vI_getHeader.headerToSearch[index].headerNameToStore) + 
						", " + value;
					hdr.setStringProperty(vI_getHeader.headerToSearch[index].headerNameToStore,vI_getHeader.unicodeConverter.ConvertFromUnicode(value) + vI_getHeader.unicodeConverter.Finish());

					var storedValue = hdr.getProperty(vI_getHeader.headerToSearch[index].headerNameToStore)
					var storedConvValue = vI_getHeader.unicodeConverter.ConvertToUnicode(storedValue)
					vI_notificationBar.dump("## vI_getHeader: found header: " + headerName +
						"[:" + currentHeadersCounter[headerName] + "] - stored as '" + 
						storedConvValue + "'\n");
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
		vI_prepareHeader.orig_initializeHeaderViewTables = initializeHeaderViewTables;
		initializeHeaderViewTables = vI_prepareHeader.replacement_initializeHeaderViewTables;
		if (vI_prepareHeader.addExtraHeader()) vI_prepareHeader.addObserver();
	},
	
	replacement_initializeHeaderViewTables : function() {
		vI_prepareHeader.cleanup();
		vI_notificationBar.dump("## vI_getHeader: initializeHeaderViewTables\n");
		vI_prepareHeader.orig_initializeHeaderViewTables();
		if (vI_prepareHeader.addExtraHeader()) vI_prepareHeader.addObserver();
	},
	
	cleanup : function() {
		vI_prepareHeader.removeObserver();
		vI_prepareHeader.removeExtraHeader();
	},
	
	addObserver : function() {
		if (vI_prepareHeader.observer_added) return;
		vI_prepareHeader.prefroot.QueryInterface(Components.interfaces.nsIPrefBranch2);
		vI_prepareHeader.prefroot.addObserver("extensions.virtualIdentity.smart_reply_headers", this, false);
        vI_prepareHeader.uninstallObserver.register();
		vI_prepareHeader.observer_added = true;
	},
	
	removeObserver : function() {
		if (!vI_prepareHeader.observer_added) return;
		vI_prepareHeader.prefroot.removeObserver("extensions.virtualIdentity.smart_reply_headers", this);
        vI_prepareHeader.uninstallObserver.unregister();
		vI_prepareHeader.observer_added = false;
	},
	
	// this is a adapted copy of enigEnsureExtraHeaders() from enigmail, thanks
	addExtraHeader : function() {
		vI_prepareHeader.unicodeConverter.charset = "UTF-8";
		var header_list = vI_prepareHeader.unicodeConverter.ConvertToUnicode(vI_prepareHeader.prefroot.getCharPref("extensions.virtualIdentity.smart_reply_headers")).split(/\n/)
		
		// add List-Id to recognizable headers to prevent using Mailing-List addresses as sender
		header_list.push("List-Id")

		// add Received to recognizable headers to detect if mail was sent or received
		header_list.push("Received")

		// add Website to recognizable headers to detect Blog/News-Posts
		header_list.push("content-base")

// 		try {
			var extraHdrs = " " + 
				vI_prepareHeader.prefroot.getCharPref("mailnews.headers.extraExpandedHeaders").toLowerCase()
				+ " ";

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
	// 						vI_notificationBar.dump("## vI_prepareHeader: Header '" + headerToSearch + "' in gCollapsedHeaderList\n");
							found = true; break;
						}
					}
					if (found) continue;
				}

				// check if Header is included in expanded HeaderView
				for (var j = 0; j < gExpandedHeaderList.length; j++) {
					if (gExpandedHeaderList[j].name == headerToSearch) {
// 						vI_notificationBar.dump("## vI_prepareHeader: Header '" + headerToSearch + "' in gExpandedHeaderList\n");
						found = true; break;
					}
				}
				if (found) continue;

				var addedHeadersString = " " + vI_prepareHeader.addedHeaders.join(" ") + " "
				if ((extraHdrs.indexOf(" " + headerToSearch + " ") < 0) &&
					(addedHeadersString.indexOf(" " + headerToSearch + " ") < 0))
					vI_prepareHeader.addedHeaders.push(headerToSearch);
// 				else vI_notificationBar.dump("## vI_prepareHeader: Header '" + headerToSearch + "' already in extraExpandedHeaders\n");
			}
			
			if (vI_prepareHeader.addedHeaders.length > 0) {
				extraHdrs += vI_prepareHeader.addedHeaders.join(" ");
				extraHdrs = extraHdrs.replace(/^\s+|\s+$/g,"")
				vI_prepareHeader.prefroot.setCharPref("mailnews.headers.extraExpandedHeaders", extraHdrs)
				vI_notificationBar.dump("## vI_prepareHeader: extraExpandedHeaders '" + vI_prepareHeader.addedHeaders.join(" ") + "' added\n");
			}		

			return true;
// 		}
// 		catch (e) {
// 			vI_notificationBar.dump("## vI_prepareHeader: your application is too old, please update. Otherwise try to install mnenhy or enigmail to use additional headers.")
// 			return false;
// 		}
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
	},

//  code adapted from http://xulsolutions.blogspot.com/2006/07/creating-uninstall-script-for.html
    uninstallObserver : {
        MY_EXTENSION_UUID : "{dddd428e-5ac8-4a81-9f78-276c734f75b8}",
        _uninstall : false,
        observe : function(subject, topic, data) {
            if (topic == "em-action-requested") {
                var extension = subject.QueryInterface(Components.interfaces.nsIUpdateItem);

                if (extension.id == this.MY_EXTENSION_UUID) {
                    if (data == "item-uninstalled") {
                        this._uninstall = true;
                    } else if (data == "item-cancel-action") {
                        this._uninstall = false;
                    }
                }
            } else if (topic == "quit-application-granted") {
                if (this._uninstall) {
                    /* uninstall stuff. */
                    vI_notificationBar.dump("## vI_uninstall: _uninstall \n");
                    vI_prepareHeader.removeExtraHeader();
                    vI_notificationBar.dump("## vI_uninstall: _uninstall done\n");
                }
                this.unregister();
            }
        },
        register : function() {
            var observerService =
            Components.classes["@mozilla.org/observer-service;1"].
                getService(Components.interfaces.nsIObserverService);

            observerService.addObserver(this, "em-action-requested", false);
            observerService.addObserver(this, "quit-application-granted", false);
        },
        unregister : function() {
            var observerService =
                Components.classes["@mozilla.org/observer-service;1"].
                getService(Components.interfaces.nsIObserverService);

            observerService.removeObserver(this,"em-action-requested");
            observerService.removeObserver(this,"quit-application-granted");
        }
    }
}

addEventListener('messagepane-loaded', vI_getHeader.setupEventListener, true);
window.addEventListener("load", function(e) { vI_prepareHeader.init(); }, false);
window.addEventListener("unload", function(e) { vI_prepareHeader.cleanup(); }, false);
// window.addEventListener("load", initializeOverlay, false);
