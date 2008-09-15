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

var vI_msgIdentityCloneTools = {	
	copySelectedIdentity : function(id_key) {
		var msgIdentityElem = document.getElementById("msgIdentity");
		var msgIdentityPopupElem = document.getElementById("msgIdentityPopup");
		vI_notificationBar.dump("## vI_msgIdentityCloneTools: copySelectedIdentity\n");
		// copy selected Menu-Value from clone to orig.
		var MenuItems = msgIdentityPopupElem.childNodes
		for (var index = 0; index < MenuItems.length; index++) {
			if ( MenuItems[index].getAttribute("value") == id_key ) {
				msgIdentityElem.selectedItem = MenuItems[index];
				msgIdentityElem.value = MenuItems[index].getAttribute("value");
				break;
			}
		}
		vI_notificationBar.dump("## vI_msgIdentityCloneTools: copySelectedIdentity MsgIdentityPopup.doCommand()\n");
		msgIdentityPopupElem.doCommand();
	},
		
	signatureSwitch: function(existingIdentity) {
		if (!existingIdentity) {
			// code to hide the signature
			try { if (vI.preferences.getBoolPref("hide_signature") && ss_signature.length == 0)
				ss_main.signatureSwitch()
			} catch(vErr) { };
		}
		else {
			// code to show the signature
			try { if (ss_signature.length > 0) ss_main.signatureSwitch(); }
			catch(vErr) { };
		}
	},

	replyToInputElem : null,	// it is important to store the Elements and not the row
	replyToPopupElem : null,	// cause row might change if one above gets removed
	replyToInitValue : null,
	replyToStoredLastValue : null,
	replyToSynchronize : true,
	
	cleanReplyToFields : function() {
		vI_notificationBar.dump("## vI_msgIdentityCloneTools: cleanReplyToFields\n");
		vI_msgIdentityCloneTools.replyToInputElem = null;
		vI_msgIdentityCloneTools.replyToPopupElem = null;
		vI_msgIdentityCloneTools.replyToInitValue = null;
		vI_msgIdentityCloneTools.replyToStoredLastValue = null;
		vI_msgIdentityCloneTools.replyToSynchronize = true;
		vI_msgIdentityCloneTools.blurEventBlocked = true;
	},
	
	// called directly after a change of the Identity with the dropdown menu
	// searches the first reply-to row and assumes that this is the one we like to adapt
	initReplyToFields : function(id) {
		vI_notificationBar.dump("## vI_msgIdentityCloneTools: initReplyToFields id=" + id + "\n");
		var replyTo = gAccountManager.getIdentity(id).replyTo
		
		vI_notificationBar.dump("## vI_msgIdentityCloneTools: initReplyToFields identity.replyTo: " + replyTo + "\n");
		if (replyTo == "") return
		
		vI_msgIdentityCloneTools.replyToInitValue = replyTo;
		for (var row = 1; row <= top.MAX_RECIPIENTS; row ++) {
			var awType = awGetPopupElement(row).selectedItem.getAttribute("value");
			var awValue = awGetInputElement(row).value
			if (awType == "addr_reply" && awValue == replyTo) {
				vI_notificationBar.dump("## vI_msgIdentityCloneTools: initReplyToFields Reply-To found in row " + row + "\n");
				vI_msgIdentityCloneTools.replyToPopupElem = awGetPopupElement(row)
				vI_msgIdentityCloneTools.replyToInputElem = awGetInputElement(row)
				break;
			}
		}
		if (!vI_msgIdentityCloneTools.replyToInputElem) vI_notificationBar.dump("## vI_msgIdentityCloneTools: initReplyToFields no Reply-To row found\n");
	},
	
	cleanupReplyTo : function() {
		if (!vI_msgIdentityCloneTools.replyToSynchronize) return
		vI_notificationBar.dump("## vI_msgIdentityCloneTools: cleanupReplyTo\n");
		
		// check if sychronizing should still be done (will be stopped if value was modified by hand)
		// if still in synchronizing mode reset the fields
		if ( vI_msgIdentityCloneTools.replyToInputElem && vI_msgIdentityCloneTools.synchroneReplyTo() ) {
			if (vI_msgIdentityCloneTools.replyToInitValue) {
				var replyTo = vI_msgIdentityCloneTools.replyToInitValue;
				vI_notificationBar.dump("## vI_msgIdentityCloneTools: cleanupReplyTo restore ReplyTo: " + replyTo + "\n");
				vI_msgIdentityCloneTools.replyToInputElem.value = replyTo;
				vI_msgIdentityCloneTools.replyToInputElem.setAttribute("value",replyTo)
			}
			else {
				awDeleteHit(vI_msgIdentityCloneTools.replyToInputElem);
				window.setTimeout("document.getElementById('msgIdentity_clone').textBoxElem.focus();", 0)
			}
		}
		vI_msgIdentityCloneTools.replyToInputElem = null;
		vI_msgIdentityCloneTools.replyToPopupElem = null;
		vI_msgIdentityCloneTools.replyToInitValue = null;
		vI_msgIdentityCloneTools.replyToStoredLastValue = null;
	},
	
	synchroneReplyTo : function() {
		vI_notificationBar.dump("## vI_msgIdentityCloneTools: synchroneReplyTo\n");
		if ( (vI_msgIdentityCloneTools.replyToPopupElem.selectedItem) && // might be destroyed...
			(vI_msgIdentityCloneTools.replyToPopupElem.selectedItem.value != "addr_reply" ||
			(vI_msgIdentityCloneTools.replyToStoredLastValue &&
			vI_msgIdentityCloneTools.replyToInputElem.value != vI_msgIdentityCloneTools.replyToStoredLastValue) ) ) {
			vI_msgIdentityCloneTools.replyToSynchronize = false;
			vI_notificationBar.dump("## vI_msgIdentityCloneTools: (former) Reply-To entry changed, stop synchronizing\n");
		}
		return vI_msgIdentityCloneTools.replyToSynchronize
	},
	
	// updateReplyTo is called on every change in the From: field, if its a virtual Identity
	updateReplyTo : function() {
		if (!vI.preferences.getBoolPref("autoReplyToSelf")) return
		if (!vI_msgIdentityCloneTools.replyToSynchronize) {
			vI_notificationBar.dump("## vI_msgIdentityCloneTools: updateReplyTo stopped Synchronizing\n") 
			return
		}
		vI_notificationBar.dump("## vI_msgIdentityCloneTools: updateReplyTo replyToStoredLastValue=" 
				+ vI_msgIdentityCloneTools.replyToStoredLastValue + "\n");

		// if replyToInputElem not set (so no initial Reply-To row was found) add a row now
		if (!vI_msgIdentityCloneTools.replyToInputElem) {
			vI_msgIdentityCloneTools.blurEventBlocked = true;
			awAddRecipient("addr_reply",document.getElementById("msgIdentity_clone").label)
			window.setTimeout("document.getElementById('msgIdentity_clone').textBoxElem.focus();vI_msgIdentityCloneTools.blurEventBlocked = false;", 0)
			vI_msgIdentityCloneTools.replyToPopupElem = awGetPopupElement(top.MAX_RECIPIENTS - 1)
			vI_msgIdentityCloneTools.replyToInputElem = awGetInputElement(top.MAX_RECIPIENTS - 1)
		}
		
		// check if sychronizing should still be done (will be stopped if value was modified by hand)
		if (vI_msgIdentityCloneTools.synchroneReplyTo()) {
			vI_msgIdentityCloneTools.replyToInputElem.value =
				document.getElementById("msgIdentity_clone").label;
			vI_msgIdentityCloneTools.replyToStoredLastValue = vI_msgIdentityCloneTools.replyToInputElem.value
		}		
	}
}
