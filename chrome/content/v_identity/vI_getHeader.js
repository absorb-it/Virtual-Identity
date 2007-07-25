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
 * ***** END LICENSE BLOCK ***** */

/**
* some code copied and adapted from 'display Mail User Agent (MUA)'
* thanks to Christian Weiske <cweiske@cweiske.de>
*/

var vI_getHeader = {
	messenger: null,
	preferences : Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefService)
			.getBranch("extensions.virtualIdentity."),
	label: null,
	note_list : new Array(),
	
	strings : document.getElementById("vIdentBundle"),

	noop: function() { return; },

	getHeader: function() {
		dump("## vI_getHeader: onEndHeaders\n")
		
		var srcMsgURI = GetLoadedMessage();
		if (srcMsgURI == null) return;

		var header_list = vI_getHeader.preferences.getCharPref("smart_reply_headers").split(/\n/)
		var hdr = vI_getHeader.messenger.messageServiceFromURI(srcMsgURI).messageURIToMsgHdr(srcMsgURI);
		//loop through the headers
		var found = false;
		var label = vI_getHeader.strings.getString("vident.getHeader.noHeader");
		for (headerName in currentHeaderData) {
			for (index = 0; index < header_list.length; index++) {
				header_to_search=header_list[index]
				if (headerName.toLowerCase() == header_to_search.toLowerCase()) {
					hdr.setStringProperty(headerName.toLowerCase(),
						currentHeaderData[headerName].headerValue);
					if (!found) label = vI_getHeader.strings.getString("vident.getHeader.headerFound");
					label += " " + headerName.toLowerCase()
						+ ":" + currentHeaderData[headerName].headerValue
					found = true;
				}
			}
		}
		vI_notificationBar.setNote(label, "get_header_notification");
	},

	setupEventListener: function() {
		var listener = {};
		listener.onStartHeaders	= vI_getHeader.noop;
		listener.onEndHeaders	= vI_getHeader.getHeader;
		gMessageListeners.push(listener);

		vI_getHeader.messenger = Components.classes["@mozilla.org/messenger;1"].createInstance();
		vI_getHeader.messenger = vI_getHeader.messenger.QueryInterface(Components.interfaces.nsIMessenger);
		vI_getHeader.strings = document.getElementById("vIdentBundle");
	},
}

addEventListener('messagepane-loaded', vI_getHeader.setupEventListener, true);
