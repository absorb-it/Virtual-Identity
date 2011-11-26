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

Components.utils.import("resource://v_identity/vI_nameSpaceWrapper.js");
virtualIdentityExtension.ns(function() { with (virtualIdentityExtension.LIB) {

Components.utils.import("resource://v_identity/stdlib/msgHdrUtils.js", virtualIdentityExtension);
Components.utils.import("resource://v_identity/vI_prefs.js", virtualIdentityExtension);
let Log = vI.setupLogging("virtualIdentity.getHeader");

// var storedHeaders = { };
var getHeader = {
	unicodeConverter : Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
			.createInstance(Components.interfaces.nsIScriptableUnicodeConverter),

	headerToSearch : null,
	
	prefObserverToSearchArray : function() {
		var headerList = getHeader.unicodeConverter.ConvertToUnicode(vI.vIprefs.get("smart_reply_headers")).split(/\n/)
		
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
			var headerNameToStore = headerNameToSearch
			if (!isNaN(headerNumberToSearch)) headerNameToStore += ":" + headerNumberToSearch
			
			getHeader.headerToSearch.push({ headerNameToSearch : headerNameToSearch, headerNumberToSearch : headerNumberToSearch,
					headerNameToStore : headerNameToStore });
		}
	},

	getHeader: function() {
      vI.clearDebugOutput();
      if (!getHeader.headerToSearch) getHeader.prefObserverToSearchArray()
      
      vI.msgHdrGetHeaders(getHeader.hdr, function (aHeaders) {
        let label = "";
        if (aHeaders.has("list-id")) {
          getHeader.hdr.setStringProperty("vI_list-id","found");
          Log.debug("found header: list-id  ...stored to recognize mailing-list\n");
        }
        if (aHeaders.has("received")) {
          getHeader.hdr.setStringProperty("vI_received","found");
          Log.debug("found header: received  ...stored to recognize received mail\n");
        }
        if (aHeaders.has("content-base")) {
          getHeader.hdr.setStringProperty("vI_content_base","found");
          Log.debug("found header: content-base  ...stored to recognize blog/news-feed\n");
        }
        for (let index = 0; index < getHeader.headerToSearch.length; index++) {
          let {headerNameToSearch: headerNameToSearch, headerNumberToSearch: headerNumberToSearch,
            headerNameToStore: headerNameToStore} = getHeader.headerToSearch[index];
          if (aHeaders.has(headerNameToSearch)) {
            let value = "";
            let values = aHeaders.getAll(headerNameToSearch);
            if (isNaN(headerNumberToSearch))
              for (let i = 0; i < values.length;)
                value += ((value)?(", "):("")) + values[i++];
            else value = values[headerNumberToSearch-1];
            if (value) {
              getHeader.hdr.setStringProperty("vI_" + headerNameToStore,
                getHeader.unicodeConverter.ConvertFromUnicode(value) + getHeader.unicodeConverter.Finish());
              
              let storedValue = getHeader.hdr.getProperty("vI_" + headerNameToStore);
              let storedConvValue = getHeader.unicodeConverter.ConvertToUnicode(storedValue);
              
              Log.debug("found header: " + headerNameToStore +
                  " - stored as '" + storedConvValue + "'\n");
              label += (label)?"\n":""
              label += headerNameToStore + ":\t" + storedConvValue
            }
          }
        }
        vI.GetHeaderNotification.info(label);
      });
	},
    
    setupEventListener: function() {
		
		getHeader.strings = document.getElementById("virtualIdentityExtension_vIdentBundle");
		
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
	unicodeConverter : Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
			.createInstance(Components.interfaces.nsIScriptableUnicodeConverter),
			
	observer_added : false,
	
	init : function() {
      vI.vIprefs.addObserver("smart_reply_headers", this.observe, this);
	},
	
	cleanup : function() {
      let self = this;
      vI.vIprefs.removeObserver("smart_reply_headers", self.observe);
	},
	
	observe: function(self, subject, topic, data) {
		if (topic == "nsPref:changed") {
			// remove (old) prepared headerArray
			getHeader.headerToSearch = null;
			ReloadMessage();
		}
	},

}
addEventListener('messagepane-loaded', getHeader.setupEventListener, true);
window.addEventListener("load", function(e) { prefObserver.init(); }, false);
window.addEventListener("unload", function(e) { prefObserver.cleanup(); }, false);
// vI.storedHeaders = storedHeaders;
}});
