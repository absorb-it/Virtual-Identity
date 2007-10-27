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

vI_msgIdentityClone = {
	icon_usualId_class : "identity_clone-menulist person-icon",
	icon_virtualId_class : "identity_clone-menulist person-icon new-icon",
	text_usualId_class : "plain menulist_clone-textbox",
	text_virtualId_class : "plain menulist_clone-textbox vIactiv",
	
	elements : {
		Obj_MsgIdentity : null,
		Obj_MsgIdentityPopup : null,
		Obj_MsgIdentity_clone : null,
		Obj_MsgIdentityPopup_clone : null,
		Obj_MsgIdentityTextbox_clone : null
	},
	
	init : function() {
		vI_msgIdentityClone.elements.Obj_MsgIdentity = document.getElementById("msgIdentity");
		vI_msgIdentityClone.elements.Obj_MsgIdentityPopup = document.getElementById("msgIdentityPopup");
		vI_msgIdentityClone.elements.Obj_MsgIdentity_clone = document.getElementById("msgIdentity_clone");
		vI_msgIdentityClone.elements.Obj_MsgIdentityPopup_clone = document.getElementById("msgIdentityPopup_clone");
		vI_msgIdentityClone.clone_Obj_MsgIdentity();
		vI_msgIdentityClone.elements.Obj_MsgIdentity.setAttribute("hidden", "true");
		vI_msgIdentityClone.elements.Obj_MsgIdentity_clone.setAttribute("hidden", "false");
		vI_msgIdentityClone.elements.Obj_MsgIdentity.previousSibling.setAttribute("control", "msgIdentity_clone");
	},
	
	// double the Identity-Select Dropdown-Menu
	// if you 'created' a virtual Identity and you close the extension area, the Virtual Identity shows up in the
	// Identity-Dropdown Menu.
	// problem is that there is not yet a existent Identity stored in any account for it, and other Code might
	// access the Dropdown-Menu to know which Identity is selected. So show and change only a clone of the real one.
	clone_Obj_MsgIdentity : function() {
		MenuItems = vI_msgIdentityClone.elements.Obj_MsgIdentityPopup.childNodes
		for (index = 0; index < MenuItems.length; index++) {
			var newMenuItem = MenuItems[index].cloneNode(true);
			newMenuItem.setAttribute("class", "identity_clone-popup-item person-icon")
			vI_msgIdentityClone.elements.Obj_MsgIdentityPopup_clone.appendChild(newMenuItem)
			if (vI_msgIdentityClone.elements.Obj_MsgIdentity.selectedItem == MenuItems[index])
				vI_msgIdentityClone.elements.Obj_MsgIdentity_clone.selectedItem = newMenuItem;
			// "accountname" property changed in Thunderbird 3.x, Seamonkey 1.5x to "description"
			newMenuItem.setAttribute("accountname", vI.helper.getAccountname(newMenuItem))
		}
		if (!vI_msgIdentityClone.elements.Obj_MsgIdentity.selectedItem) {
			vI_notificationBar.dump("## vI_msgIdentityClone: Obj_MsgIdentity.selectedItem not set, using first Menuitem\n");
			vI_msgIdentityClone.elements.Obj_MsgIdentity.selectedItem =
				vI_msgIdentityClone.elements.Obj_MsgIdentityPopup.firstChild
			vI_notificationBar.dump("## vI_msgIdentityClone: MsgIdentityPopup.doCommand()\n");
			vI_msgIdentityClone.elements.Obj_MsgIdentityPopup.doCommand();
		}
		vI_msgIdentityClone.elements.Obj_MsgIdentity_clone
			.setAttribute("value", vI_msgIdentityClone.elements.Obj_MsgIdentity.selectedItem.getAttribute("value"));
		vI_msgIdentityClone.elements.Obj_MsgIdentity_clone
			.setAttribute("label", vI_msgIdentityClone.elements.Obj_MsgIdentity.selectedItem.getAttribute("label"));
		vI_msgIdentityClone.elements.Obj_MsgIdentity_clone
			.setAttribute("accountname", vI.helper.getAccountname(vI_msgIdentityClone.elements.Obj_MsgIdentity.selectedItem));
	},
	
	resetMenuToDefault : function () {
		vI_msgIdentityClone.setMenuToIdentity(gAccountManager.defaultAccount.defaultIdentity.key);
	},

	setMenuToIdentity : function (identitykey) {
		MenuItems = vI_msgIdentityClone.elements.Obj_MsgIdentityPopup_clone.childNodes
		for (index = 0; index < MenuItems.length; index++) {
			if (MenuItems[index].getAttribute("value") ==
				identitykey) {
					vI_msgIdentityClone.elements.Obj_MsgIdentity_clone.selectedItem =
						MenuItems[index];
					break;
			}
		}
		vI_msgIdentityClone.elements.Obj_MsgIdentity_clone.doCommand();
	},
	
	getIdentityName : function (key) {
		return gAccountManager.getIdentity(key).accountname;
	},
	
	copySelectedIdentity : function() {
		// copy selected Menu-Value from clone to orig.
		MenuItems = vI_msgIdentityClone.elements.Obj_MsgIdentity.firstChild.childNodes
		for (index = 0; index < MenuItems.length; index++) {
			if ( MenuItems[index].getAttribute("value")
				== vI_msgIdentityClone.elements.Obj_MsgIdentity_clone.getAttribute("value") ) {
				vI_msgIdentityClone.elements.Obj_MsgIdentity.selectedItem = MenuItems[index];
				vI_msgIdentityClone.elements.Obj_MsgIdentity.value = MenuItems[index].getAttribute("value");
				break;
			}
		}
		vI_notificationBar.dump("## vI_msgIdentityClone: MsgIdentityPopup.doCommand()\n");
		vI_msgIdentityClone.elements.Obj_MsgIdentityPopup.doCommand();
	},
	
	initMsgIdentityTextbox_clone : function() {
		if (!vI_msgIdentityClone.elements.Obj_MsgIdentityTextbox_clone)
			vI_msgIdentityClone.elements.Obj_MsgIdentityTextbox_clone
				= document.getElementById("msgIdentity_clone_textbox");
	},
	
	// this LoadIdentity - oncommand is used by our clone MsgIdentity Menu
	// remove the Virtual Account if a different (usual) Account is choosen in the cloned dropdown-menu
	LoadIdentity : function()
	{
		vI_msgIdentityClone.cleanupReplyTo(true);
		if (vI_msgIdentityClone.elements.Obj_MsgIdentity_clone.selectedItem.value != "vid") {
			vI_msgIdentityClone.copySelectedIdentity();
			vI_smtpSelector.resetMenuToMsgIdentity(
				vI_msgIdentityClone.elements.Obj_MsgIdentity_clone.selectedItem.value);
		}
		vI_msgIdentityClone.initMsgIdentityTextbox_clone();
		vI_msgIdentityClone.elements.Obj_MsgIdentityTextbox_clone.value =
			vI_msgIdentityClone.elements.Obj_MsgIdentity_clone.selectedItem.getAttribute("label");
		vI_msgIdentityClone.elements.Obj_MsgIdentity_clone.setAttribute("accountname",
			vI.helper.getAccountname(vI_msgIdentityClone.elements.Obj_MsgIdentity_clone.selectedItem));
		vI_msgIdentityClone.markAsNewAccount(vI_msgIdentityClone.isNewIdentity());
		vI_msgIdentityClone.searchReplyToRow();
	},
	
	setIdentity : function(newName) {
		vI_msgIdentityClone.initMsgIdentityTextbox_clone();
		vI_msgIdentityClone.elements.Obj_MsgIdentityTextbox_clone.value = newName;
		vI_msgIdentityClone.blurEvent()
		var newIdentity = vI_msgIdentityClone.isNewIdentity();
		window.setTimeout(vI_msgIdentityClone.markAsNewAccount, 0, newIdentity);
		return newIdentity;
	},
	
	blurEvent : function() {
		vI_msgIdentityClone.initMsgIdentityTextbox_clone();
		var address = vI.helper.getAddress();
		vI_msgIdentityClone.elements.Obj_MsgIdentityTextbox_clone.value = address.combinedName;
		vI_msgIdentityClone.elements.Obj_MsgIdentityTextbox_clone.setAttribute("value",address.combinedName)
	},
	
	inputEvent :  function()
	{
		vI_msgIdentityClone.initMsgIdentityTextbox_clone();
		// compare Identity with existant ones and prepare Virtual-Identity if nonexistant found
		vI_msgIdentityClone.markAsNewAccount(vI_msgIdentityClone.isNewIdentity());
	},
	
	replyToInputElem : null,
	replyToPopupElem : null,
	replyToStoredLastValue : null,
	replyToStoredInitValue : null,
	replyToSynchronize : true,
	
	searchReplyToRow : function() {
		if (!vI.preferences.getBoolPref("experimental")) return
		vI_notificationBar.dump("#X searchReplyToRow\n");
		for (var row = 1; row <= top.MAX_RECIPIENTS; row ++) {
			var recipientType = awGetPopupElement(row).selectedItem.getAttribute("value");
			if (recipientType == "addr_reply") {
				vI_notificationBar.dump("#X vI_msgIdentityClone: Reply-To found in row " + row + "\n");
				vI_msgIdentityClone.replyToPopupElem = document.getElementById("addressCol1#" + row)
				vI_msgIdentityClone.replyToInputElem = document.getElementById("addressCol2#" + row)
				vI_msgIdentityClone.replyToStoredInitValue = document.getElementById("addressCol2#" + row).value
				break;
				}
		}
		if (!vI_msgIdentityClone.replyToInputElem) vI_notificationBar.dump("#X vI_msgIdentityClone: no reply-to row found\n");
	},
	
	cleanupReplyTo : function(force) {
		if (!vI.preferences.getBoolPref("experimental")) return
		vI_notificationBar.dump("#X cleanupReplyTo\n");
		if 	(vI_msgIdentityClone.replyToInputElem &&
				(vI_msgIdentityClone.replyToInputElem.value == vI_msgIdentityClone.replyToStoredLastValue)) {
				vI_notificationBar.dump("#X restore ReplyTo\n");
				vI_msgIdentityClone.replyToInputElem.value = vI_msgIdentityClone.replyToStoredInitValue
			}
		if (force) {
			vI_msgIdentityClone.replyToInputElem = null;
			vI_msgIdentityClone.replyToPopupElem = null;
			vI_msgIdentityClone.replyToStoredInitValue = null;
		}
		vI_msgIdentityClone.replyToStoredLastValue = null;
	},
	
	updateReplyTo : function(newIdentity) {
		if (!vI.preferences.getBoolPref("experimental")) return
		if (!vI.preferences.getBoolPref("autoReplyToSelf")) return
		vI_notificationBar.dump("#X updateReplyTo\n");

		if (!vI_msgIdentityClone.replyToInputElem) {
			awAddRecipient("addr_reply",vI_msgIdentityClone.elements.Obj_MsgIdentityTextbox_clone.value)
			vI_msgIdentityClone.replyToPopupElem = document.getElementById("addressCol1#" + top.MAX_RECIPIENTS)
			vI_msgIdentityClone.replyToInputElem = document.getElementById("addressCol2#" + top.MAX_RECIPIENTS)
			vI_msgIdentityClone.replyToStoredInitValue = document.getElementById("addressCol2#" + top.MAX_RECIPIENTS).value
		}
		else {
			// check if reply-to field was changed individually, then stop adapting the field
			if ((vI_msgIdentityClone.replyToPopupElem.selectedItem.getAttribute("value") != "addr_reply") ||
				(vI_msgIdentityClone.replyToStoredLastValue &&
				vI_msgIdentityClone.replyToInputElem.value != vI_msgIdentityClone.replyToStoredLastValue)) {
				replyToSynchronize = false;
				vI_notificationBar.dump("#X vI_msgIdentityClone: (former) Reply-To entry changed, stop synchronizing\n");
			}
			else {
				vI_msgIdentityClone.replyToInputElem.value = vI_msgIdentityClone.elements.Obj_MsgIdentityTextbox_clone.value
				vI_msgIdentityClone.replyToStoredLastValue = vI_msgIdentityClone.replyToInputElem.value
			}
		}
	},
	
	markAsNewAccount : function(newIdentity) {
		vI_msgIdentityClone.initMsgIdentityTextbox_clone();
		if (newIdentity) {
			vI.replacement_functions.replaceGenericFunction()
			if (vI.elements.Obj_vILogo.getAttribute("hidden") != "false") {
				vI_msgIdentityClone.elements.Obj_MsgIdentityTextbox_clone
					.setAttribute("class", vI_msgIdentityClone.text_virtualId_class);
				vI_msgIdentityClone.elements.Obj_MsgIdentity_clone
					.setAttribute("class", vI_msgIdentityClone.icon_virtualId_class);
				if (vI_msgIdentityClone.elements.Obj_MsgIdentity_clone
					.getAttribute("value") != "vid") {
					vI_msgIdentityClone.elements.Obj_MsgIdentity_clone
						.setAttribute("oldvalue",vI_msgIdentityClone.elements.Obj_MsgIdentity_clone
								.getAttribute("value"))
					vI_msgIdentityClone.elements.Obj_MsgIdentity_clone
						.setAttribute("value","vid")
					var accountname = document.getElementById("prettyName-Prefix")
								.getAttribute("label")
								+ vI_msgIdentityClone.elements.Obj_MsgIdentity_clone
								.getAttribute("accountname")
					vI_msgIdentityClone.elements.Obj_MsgIdentity_clone
						.setAttribute("accountname", accountname)
				}
				vI.elements.Obj_vILogo.setAttribute("hidden","false");
				vI_addressBook.elements.Obj_aBookSave.setAttribute("hidden",
					!vI.preferences.getBoolPref("aBook_show_switch"));
			}
			// code to hide the signature
			try { if (vI.preferences.getBoolPref("hide_signature") && ss_signature.length == 0)
				ss_main.signatureSwitch()
			} catch(vErr) { };
			// set reply-to according to Virtual Identity
			vI_msgIdentityClone.updateReplyTo(newIdentity)
		}
		else {
			if (vI.elements.Obj_vILogo.getAttribute("hidden") != "true") {
				vI_msgIdentityClone.elements.Obj_MsgIdentityTextbox_clone
					.setAttribute("class", vI_msgIdentityClone.text_usualId_class);
				vI_msgIdentityClone.elements.Obj_MsgIdentity_clone
					.setAttribute("class", vI_msgIdentityClone.icon_usualId_class);
				vI.Cleanup();
				vI.elements.Obj_vILogo.setAttribute("hidden","true");
				vI_addressBook.elements.Obj_aBookSave.setAttribute("hidden",
					!vI.preferences.getBoolPref("aBook_use_non_vI"));
				vI_msgIdentityClone.elements.Obj_MsgIdentity_clone
					.setAttribute("oldvalue",null)
			}
			// code to show the signature
			try { if (ss_signature.length > 0) ss_main.signatureSwitch(); }
			catch(vErr) { };
			
			vI_msgIdentityClone.cleanupReplyTo(false);
		}
	},
	
	// checks if the Identity currently described by the extension-area fields i still available as
	// a stored identity. If so, use the stored one.
	isNewIdentity : function()
	{
		vI_msgIdentityClone.initMsgIdentityTextbox_clone();
		var address = vI.helper.getAddress();
		var accounts = queryISupportsArray(gAccountManager.accounts, Components.interfaces.nsIMsgAccount);
		for (var i in accounts) {
			var server = accounts[i].incomingServer;
				//  ignore (other) virtualIdentity Accounts
				if (!server || server.hostName == "virtualIdentity") continue;
				// ignore newsgroup accounts if not selected in preferences
				if (!vI.preferences.getBoolPref("smart_reply_for_newsgroups") &&
					server.type == "nntp") continue;
				
				var identites = queryISupportsArray(accounts[i].identities, Components.interfaces.nsIMsgIdentity);
				for (var j in identites) {
					var identity = identites[j];
					var smtpKey = identity.smtpServerKey;
					if (!identity.smtpServerKey) smtpKey = accounts[i].defaultIdentity.smtpServerKey;
					if (!identity.smtpServerKey) smtpKey = vI_smtpSelector.smtpService.defaultServer.key;
					if (	identity.getUnicharAttribute("fullName") == address.name &&
						identity.getUnicharAttribute("useremail") == address.email &&
						smtpKey == vI_smtpSelector.elements.Obj_SMTPServerList.selectedItem.getAttribute('key')) {
					//~ if (	identity.getUnicharAttribute("fullName") == FullName &&
						//~ identity.getUnicharAttribute("useremail") == Useremail) {
							//~ // all values are identical to an existing Identity
							// set Identity combobox to this value
							vI_msgIdentityClone.elements.Obj_MsgIdentity_clone.setAttribute("value", identity.key);
							vI_msgIdentityClone.elements.Obj_MsgIdentity_clone.setAttribute("label", address.name + " <" + address.email + ">");
							vI_msgIdentityClone.elements.Obj_MsgIdentity_clone.setAttribute("accountname", " - " + accounts[i].incomingServer.prettyName);
							return false;
						}
					}
			}
		return true;
	},
}
