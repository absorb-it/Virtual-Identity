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

    Contributor(s): Thunderbird Developers
 * ***** END LICENSE BLOCK ***** */
virtualIdentityExtension.ns(function() { with (virtualIdentityExtension.LIB) {
var msgIdentityCloneTools = {	
	copySelectedIdentity : function(id_key) {
		vI.notificationBar.dump("## msgIdentityCloneTools: copySelectedIdentity\n");
		var msgIdentityElem = document.getElementById("msgIdentity");
		var msgIdentityPopupElem = document.getElementById("msgIdentityPopup");
		// copy selected Menu-Value from clone to orig.
		var MenuItems = msgIdentityPopupElem.childNodes
		for (var index = 0; index < MenuItems.length; index++) {
			if ( MenuItems[index].getAttribute("value") == id_key ) {
				msgIdentityElem.selectedItem = MenuItems[index];
				msgIdentityElem.value = MenuItems[index].getAttribute("value");
				break;
			}
		}
		msgIdentityPopupElem.doCommand();
	},
		
	signatureSwitch: function(existingIdentity) {
		// always initialize Security/Enigmail-Options
		try { setSecuritySettings(1); enigSetMenuSettings(''); } catch(vErr) { };
		if (!existingIdentity) {
			vI.notificationBar.dump("## msgIdentityCloneTools: signatureSwitch hide/remove signatures\n");
			// code to hide the text signature
			try { if (vI.main.preferences.getBoolPref("hide_signature") && ss_signature.length == 0) {
				vI.notificationBar.dump("## msgIdentityCloneTools: hide text/html signature");
				ss_main.signatureSwitch()
				vI.notificationBar.dump("\n");
			} } catch(vErr) { vI.notificationBar.dump(" -- missing signatureSwitch extension?\n"); };
			// code to hide the sMime signature
			try { if (vI.main.preferences.getBoolPref("hide_sMime_messageSignature")) {
				var element = document.getElementById("menu_securitySign1");
				if (element.getAttribute("checked") == "true") {
					vI.notificationBar.dump("## signatureSwitch hide_sMime_messageSignature with doCommand\n");
					element.doCommand();
				}
			}
			//	document.getElementById("menu_securitySign1").removeAttribute("checked");
			} catch(vErr) { };
			// code to hide the openGPG signature
			try { if (vI.main.preferences.getBoolPref("hide_openPGP_messageSignature")) {
				var element = document.getElementById("enigmail_signed_send");
				if (element.getAttribute("checked") == "true") {
					var skipChangeGPGsign = false;
					// sometimes GPG delays changing with dialog, so don't act if EnigmailAlertWindow is open to prevent double changes
					var windows = Components.classes["@mozilla.org/embedcomp/window-watcher;1"]
						.getService(Components.interfaces.nsIWindowWatcher).getWindowEnumerator();
					while (windows.hasMoreElements()) {
						var window = windows.getNext();
						skipChangeGPGsign = skipChangeGPGsign || (window.document.title == EnigGetString("enigAlert"));
					}
					if (skipChangeGPGsign)
						vI.notificationBar.dump("## signatureSwitch skip hide_openPGP_messageSignature - EnigMail AlertWindow open\n");
					else {
						vI.notificationBar.dump("## signatureSwitch hide_openPGP_messageSignature with doCommand\n");
						element.doCommand();
					}
				}
			}
			//	document.getElementById("enigmail_signed_send").removeAttribute("checked");
			} catch(vErr) { };
		}
		else {
			vI.notificationBar.dump("## msgIdentityCloneTools: signatureSwitch restore signature\n");
			// code to show the text signature
			try { if (ss_signature.length > 0) {
				vI.notificationBar.dump("## msgIdentityCloneTools: show text/html signature");
				ss_main.signatureSwitch()
				vI.notificationBar.dump("\n");
			} } catch(vErr) { vI.notificationBar.dump(" -- missing signatureSwitch extension?\n"); };
			// sMime and openGPG signature will not be re-added automatically
		}
	},
	
	initReplyTo : function() {
		if (vI.statusmenu.prefroot.getBoolPref("extensions.virtualIdentity.autoReplyToSelf")) {
			document.getElementById("autoReplyToSelfLabel").removeAttribute("hidden");
			msgIdentityCloneTools.removeAllReplyTos();
		}
		else document.getElementById("autoReplyToSelfLabel").setAttribute("hidden", "true");
	},
	
	removeAllReplyTos : function() {
		if (!document.getElementById("autoReplyToSelfLabel").hasAttribute("hidden")) {
			for (var row = 1; row <= top.MAX_RECIPIENTS; row ++) {
				var awType = awGetPopupElement(row).selectedItem.getAttribute("value");
				if (awType == "addr_reply") {
					vI.notificationBar.dump("## msgIdentityCloneTools: removed ReplyTo found in row " + row + "\n");
					awDeleteRow(row--); // removed one line therefore decrease row-value
				}
			}
		}
	},

	addReplyToSelf : function() {
		if (!document.getElementById("autoReplyToSelfLabel").hasAttribute("hidden")) {
			awAddRecipient("addr_reply",document.getElementById("msgIdentity_clone").label);
			vI.notificationBar.dump("## msgIdentityCloneTools: added ReplyToSelf");
			document.getElementById("autoReplyToSelfLabel").setAttribute("hidden","true");
		}
	}
}
vI.msgIdentityCloneTools = msgIdentityCloneTools;	
}});