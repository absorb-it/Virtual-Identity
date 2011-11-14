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

virtualIdentityExtension.ns(function() { with (virtualIdentityExtension.LIB) {

// XXX still missing implementation to select specific header by number and to display notification.
Components.utils.import("resource://v_identity/stdlib/msgHdrUtils.js");
let Log = setupLogging("virtualIdentity.getHeader");

// var storedHeaders = { };
var getHeader = {
	preferences : Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefService)
			.getBranch("extensions.virtualIdentity."),
			
	unicodeConverter : Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
			.createInstance(Components.interfaces.nsIScriptableUnicodeConverter),

// 	strings : document.getElementById("vIdentBundle"),
	
	headerToSearch : null,
	
	prefObserverToSearchArray : function() {
		var headerList = getHeader.unicodeConverter.ConvertToUnicode(getHeader.preferences.getCharPref("smart_reply_headers")).split(/\n/)
		
		getHeader.headerToSearch = [];
		
		// prepare headerToSearch for speedup.
		for (var index = 0; index < headerList.length; index++) {
			var headerToSearch_splitted = headerList[index].split(/:/)
			// use first part (all before ':') as the header name
			var headerNameToSearch = headerToSearch_splitted[0].toLowerCase()
			// check second or third part for any number
// 			var headerNumberToSearch = parseInt(headerToSearch_splitted[1])
// 			if (isNaN(headerNumberToSearch)) headerNumberToSearch = parseInt(headerToSearch_splitted[2])
			
			// create header name to store the value
// 			var headerNameToStore = "vI_" + headerNameToSearch
// 			if (!isNaN(headerNumberToSearch)) headerNameToStore += ":" + headerNumberToSearch
			
// 			getHeader.headerToSearch.push({ headerNameToSearch : headerNameToSearch, headerNumberToSearch : headerNumberToSearch,
// 					headerNameToStore : headerNameToStore });
            getHeader.headerToSearch.push({ headerNameToSearch : headerNameToSearch });
		}
	},

	getHeader: function() {
      clearDebugOutput();
      Log.debug("\n");
      
      if (!getHeader.headerToSearch) getHeader.prefObserverToSearchArray()
      
      msgHdrGetHeaders(getHeader.hdr, function (aHeaders) {
        if (aHeaders.has("list-id")) {
          getHeader.hdr.setStringProperty("vI_list-id","found");
          Log.debug("## getHeader: found header: list-id  ...stored to recognize mailing-list\n");
        }
        if (aHeaders.has("received")) {
          getHeader.hdr.setStringProperty("vI_received","found");
          Log.debug("## getHeader: found header: received  ...stored to recognize received mail\n");
        }
        if (aHeaders.has("content-base")) {
          getHeader.hdr.setStringProperty("vI_content_base","found");
          Log.debug("## getHeader: found header: content-base  ...stored to recognize blog/news-feed\n");
        }
        for (let index = 0; index < getHeader.headerToSearch.length; index++) {
          let headerNameToSearch = getHeader.headerToSearch[index].headerNameToSearch;
          if (aHeaders.has(headerNameToSearch)) {
            let value = aHeaders.get(headerNameToSearch);
            getHeader.hdr.setStringProperty("vI_" + headerNameToSearch,
                                  getHeader.unicodeConverter.ConvertFromUnicode(value) + getHeader.unicodeConverter.Finish());
            let storedValue = getHeader.hdr.getProperty("vI_" + headerNameToSearch);
            let storedConvValue = getHeader.unicodeConverter.ConvertToUnicode(storedValue);
            Log.debug("## getHeader: found header: " + headerNameToSearch +
                " - stored as '" + storedConvValue + "'\n");
          }
        }
      });
	},
	
	setupEventListener: function() {
		
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
		
		getHeader.hdr = neckoURL.messageHeader;
		if (getHeader.hdr) getHeader.getHeader();
        getHeader.orig_OnMsgLoaded(url);
	}
}


var prefObserver = {
	prefroot : Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefService)
			.getBranch(null).QueryInterface(Components.interfaces.nsIPrefBranch2),

	unicodeConverter : Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
			.createInstance(Components.interfaces.nsIScriptableUnicodeConverter),
			
	observer_added : false,
	
	init : function() {
      prefObserver.prefroot.addObserver("extensions.virtualIdentity.smart_reply_headers", this, false);
	},
	
	cleanup : function() {
      prefObserver.prefroot.removeObserver("extensions.virtualIdentity.smart_reply_headers", this);
	},
	
	observe: function(subject, topic, data) {
		if (topic == "nsPref:changed") {
			// remove (old) prepared headerArray
			getHeader.headerToSearch = null;
			
			Log.debug("## prefObserver: reload Message\n");
			MsgReload();
		}
	},

}
addEventListener('messagepane-loaded', getHeader.setupEventListener, true);
window.addEventListener("load", function(e) { prefObserver.init(); }, false);
window.addEventListener("unload", function(e) { prefObserver.cleanup(); }, false);
// vI.storedHeaders = storedHeaders;
}});
