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

    Contributor(s): 
 * ***** END LICENSE BLOCK ***** */

vI_smartReply_dialog = {
	Obj_radioGroup : null,
	all_addresses : null,
	AccountManager : Components.classes["@mozilla.org/messenger/account-manager;1"]
				.getService(Components.interfaces.nsIMsgAccountManager),
	smtpService : Components.classes["@mozilla.org/messengercompose/smtp;1"]
				.getService(Components.interfaces.nsISmtpService),
	
	getIdentityName : function (key) {
		return vI_smartReply_dialog.AccountManager.getIdentity(key).identityName
	},
	
	getSMTPName : function (key) {
		var server = vI_smartReply_dialog.smtpService.getServerByKey(key)
		return (server.description?server.description:server.hostname)
	},

	init : function() {	
		vI_smartReply_dialog.Obj_radioGroup = document.getElementById("replySelector.radiogroup");
		// var all_addresses = { number : 0, emails : {}, fullNames : {}, combinedNames : {},
		//			id_keys : {}, smtp_keys : {} };
		vI_smartReply_dialog.all_addresses = window.arguments[0];
		for (index = 0; index < vI_smartReply_dialog.all_addresses.number; index++) {
			var menuentry = vI_smartReply_dialog.all_addresses.combinedNames[index]
			var id = null; var smtp = null;
			if (vI_smartReply_dialog.all_addresses.id_keys[index])
				id = vI_smartReply_dialog.getIdentityName(vI_smartReply_dialog.all_addresses.id_keys[index])
			if (vI_smartReply_dialog.all_addresses.smtp_keys[index])
				smtp = vI_smartReply_dialog.getSMTPName(vI_smartReply_dialog.all_addresses.smtp_keys[index])
			menuentry += (id?" (" + id + "," + 
					(smtp?smtp:document.getElementById("bundle_messenger").getString("defaultServerTag")) +
					")":"")
			vI_smartReply_dialog.add_row(menuentry);
		}
	},

	add_row : function(combinedName) {
		var radio = document.createElement("radio");
		radio.setAttribute("label",combinedName);
		vI_smartReply_dialog.Obj_radioGroup.appendChild(radio);
	},

	accept : function() {
		/* window.argument[1] stores callback function */
		window.arguments[1](vI_smartReply_dialog.all_addresses, vI_smartReply_dialog.Obj_radioGroup.selectedIndex);
		document.documentElement.acceptDialog();
	}
}
window.addEventListener("load", vI_smartReply_dialog.init, false);