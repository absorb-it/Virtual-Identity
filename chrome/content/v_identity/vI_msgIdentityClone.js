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

var vI_msgIdentityClone = {
	icon_usualId_class : "identity_clone-menulist person-icon",
	icon_virtualId_class : "identity_clone-menulist person-icon new-icon",
	text_usualId_class : "plain menulist_clone-textbox",
	text_virtualId_class : "plain menulist_clone-textbox vIactiv",
	
	localIdentityData : null,
	
	elements : {
		Obj_MsgIdentity : null,
		Obj_MsgIdentityPopup : null,
		Obj_MsgIdentity_clone : null,
		Obj_MsgIdentityPopup_clone : null,
		Obj_MsgIdentityTextbox_clone : null
	},
	
	init : function() {
		var reopen = vI_msgIdentityClone.elements.Obj_MsgIdentity
		if (!reopen) {
			vI_msgIdentityClone.elements.Obj_MsgIdentity = document.getElementById("msgIdentity");
			vI_msgIdentityClone.elements.Obj_MsgIdentityPopup = document.getElementById("msgIdentityPopup");
			vI_msgIdentityClone.elements.Obj_MsgIdentity_clone = document.getElementById("msgIdentity_clone");
			vI_msgIdentityClone.elements.Obj_MsgIdentityPopup_clone = document.getElementById("msgIdentityPopup_clone");
		}

		vI_msgIdentityClone.localIdentityData = new identityData(null, null, null, null, null)

		vI_msgIdentityClone.clone_Obj_MsgIdentity();
		if (!reopen) {
			vI_msgIdentityClone.elements.Obj_MsgIdentity.setAttribute("hidden", "true");
			vI_msgIdentityClone.elements.Obj_MsgIdentity_clone.setAttribute("hidden", "false");
			vI_msgIdentityClone.elements.Obj_MsgIdentity.previousSibling.setAttribute("control", "msgIdentity_clone");
		}
		else vI_msgIdentityClone.elements.Obj_MsgIdentityPopup_clone.doCommand();
	},
	
	clean : function() {
		MenuItems = vI_msgIdentityClone.elements.Obj_MsgIdentityPopup_clone.childNodes
		while (MenuItems.length > 0) vI_msgIdentityClone.elements.Obj_MsgIdentityPopup_clone.removeChild(MenuItems[0])
		vI_msgIdentityClone.elements.Obj_MsgIdentity_clone.selectedItem == null;
	},
	
	// double the Identity-Select Dropdown-Menu to be more flexible with modifying it
	// the original Identity Dropdown Menu is hidden and stores the base Identity, on which one
	// the Virtual Identity is build upon
	clone_Obj_MsgIdentity : function() {
		if (!vI_msgIdentityClone.elements.Obj_MsgIdentity.selectedItem) {
			vI_notificationBar.dump("## vI_msgIdentityClone: Obj_MsgIdentity.selectedItem not set, using first Menuitem\n");
			vI_msgIdentityClone.elements.Obj_MsgIdentity.selectedItem =
				vI_msgIdentityClone.elements.Obj_MsgIdentityPopup.firstChild
			vI_notificationBar.dump("## vI_msgIdentityClone: MsgIdentityPopup.doCommand()\n");
			vI_msgIdentityClone.elements.Obj_MsgIdentityPopup.doCommand();
		}
		MenuItems = vI_msgIdentityClone.elements.Obj_MsgIdentityPopup.childNodes
		for (var index = 0; index < MenuItems.length; index++) {
			var newMenuItem = MenuItems[index].cloneNode(true);
			newMenuItem.setAttribute("class", "identity_clone-popup-item person-icon")
			vI_msgIdentityClone.elements.Obj_MsgIdentityPopup_clone.appendChild(newMenuItem)
			if (vI_msgIdentityClone.elements.Obj_MsgIdentity.selectedItem == MenuItems[index]) {
				vI_notificationBar.dump("## vI_msgIdentityClone: '" + vI_msgIdentityClone.elements.Obj_MsgIdentity.selectedItem.value + "'\n");
				vI_msgIdentityClone.elements.Obj_MsgIdentity_clone.selectedItem = newMenuItem;
			}
			// "accountname" property changed in Thunderbird 3.x, Seamonkey 1.5x to "description"
			newMenuItem.setAttribute("accountname", vI_helper.getAccountname(newMenuItem))
		}
		vI_msgIdentityClone.elements.Obj_MsgIdentity_clone
			.setAttribute("value", vI_msgIdentityClone.elements.Obj_MsgIdentity.selectedItem.getAttribute("value"));
		vI_msgIdentityClone.elements.Obj_MsgIdentity_clone
			.setAttribute("accountname", vI_helper.getAccountname(vI_msgIdentityClone.elements.Obj_MsgIdentity.selectedItem));
		// Identitys might have IdentityName set differently to 'name <email>',
		// so retrieve name and email directly from Identity
		var identity = gAccountManager.getIdentity(vI_msgIdentityClone.elements.Obj_MsgIdentity.selectedItem.getAttribute("value"))
		var label = identity.getUnicharAttribute("fullName") + " <" + identity.getUnicharAttribute("useremail") + ">"
		vI_msgIdentityClone.elements.Obj_MsgIdentity_clone.setAttribute("label", label);
	},
	
	resetMenuToDefault : function () {
		vI_msgIdentityClone.setMenuToIdentity(gAccountManager.defaultAccount.defaultIdentity.key);
	},

	setMenuToMenuItem : function (menuItem) {
		vI_notificationBar.dump("## vI_msgIdentityClone: setMenuToMenuItem '" +
			menuItem.getAttribute("accountname") + "'\n");
		vI_msgIdentityClone.elements.Obj_MsgIdentity_clone.selectedItem = menuItem;
		vI_notificationBar.dump("## vI_msgIdentityClone: setMenuToMenuItem MsgIdentityPopup_clone.doCommand()\n");
		vI_msgIdentityClone.elements.Obj_MsgIdentityPopup_clone.doCommand();
	},

	setMenuToIdentity : function (identitykey) {
		vI_notificationBar.dump("## vI_msgIdentityClone: setMenuToIdentity key " + identitykey + "\n");
		vI_msgIdentityClone.setMenuToMenuItem(vI_msgIdentityClone.getMenuItemForIdentity(identitykey));
	},

	getMenuItemForIdentity : function (identitykey) {
		MenuItems = vI_msgIdentityClone.elements.Obj_MsgIdentityPopup_clone.childNodes
		for (var index = 0; index < MenuItems.length; index++) {
			if (MenuItems[index].getAttribute("value") == identitykey)
				return MenuItems[index]
		}

	},
	
	addSeparatorToCloneMenu: function() {
		vI_notificationBar.dump("## vI_msgIdentityClone: addSeparatorToCloneMenu\n");
		var object = vI_msgIdentityClone.elements.Obj_msgIdentityClone;
		var separator = document.createElement("menuseparator");
		separator.setAttribute("id", "vid_separator");
		vI_msgIdentityClone.elements.Obj_MsgIdentityPopup_clone.appendChild(
			separator)
		return true;
	},

	addIdentityToCloneMenu: function(localIdentityData) {
		vI_notificationBar.dump("## vI_msgIdentityClone: addIdentityToCloneMenu '" + localIdentityData.id + "'\n");
		
		var existingId = localIdentityData.isExistingIdentity();
		vI_notificationBar.dump("## vI_msgIdentityClone: addIdentityToCloneMenu existingId '" + existingId + "'\n");
		if (!existingId) {
			var separator = null;
			if (!localIdentityData.id) localIdentityData.id = gAccountManager.defaultAccount.defaultIdentity.key
			// search the account related to this id
			MenuItems = vI_msgIdentityClone.elements.Obj_MsgIdentity_clone.firstChild.childNodes
			for (var j = 0; j < MenuItems.length; j++) {
				if (MenuItems[j].localName == "menuseparator") {
					separator = true; break;
				}
				if (MenuItems[j].getAttribute("value") == localIdentityData.id )
					accountname = document.getElementById("prettyName-Prefix").getAttribute("label") + MenuItems[j].getAttribute("accountname")
			}
			if (!separator) vI_msgIdentityClone.addSeparatorToCloneMenu();
		
			return vI_helper.addIdentityMenuItem(vI_msgIdentityClone.elements.Obj_MsgIdentityPopup_clone,
				vI_helper.combineNames(localIdentityData.fullName, localIdentityData.email),
				accountname, "", "vid", localIdentityData.id, localIdentityData.smtp, localIdentityData.extras)
		}
		else return vI_msgIdentityClone.getMenuItemForIdentity(existingId)
	},
	
	// adds MenuItem for Identities to the cloned Identity-Select Dropdown Menu
	addIdentitiesToCloneMenu: function(all_addresses) {
		for (var index = 0; index < all_addresses.number; index++)
			all_addresses.menuItems[index] =
				vI_msgIdentityClone.addIdentityToCloneMenu(all_addresses.getIdentityData(index))
	},
	
	copySelectedIdentity : function(id_key) {
		vI_notificationBar.dump("## vI_msgIdentityClone: copySelectedIdentity\n");
		// copy selected Menu-Value from clone to orig.
		MenuItems = vI_msgIdentityClone.elements.Obj_MsgIdentity.firstChild.childNodes
		for (var index = 0; index < MenuItems.length; index++) {
			if ( MenuItems[index].getAttribute("value") == id_key ) {
				vI_msgIdentityClone.elements.Obj_MsgIdentity.selectedItem = MenuItems[index];
				vI_msgIdentityClone.elements.Obj_MsgIdentity.value = MenuItems[index].getAttribute("value");
				break;
			}
		}
		vI_notificationBar.dump("## vI_msgIdentityClone: copySelectedIdentity MsgIdentityPopup.doCommand()\n");
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
		vI_notificationBar.dump("## vI_msgIdentityClone: LoadIdentity\n");
		vI_msgIdentityClone.cleanupReplyTo();
		vI_msgIdentityClone.initMsgIdentityTextbox_clone();
		
		var label = null;

		// use getAttribute to be sure it works with TB 2.x versions
		if (vI_msgIdentityClone.elements.Obj_MsgIdentity_clone.selectedItem.value != "vid" &&
			vI_msgIdentityClone.elements.Obj_MsgIdentity_clone.selectedItem.getAttribute("value") != "vid") {
			vI_msgIdentityClone.elements.Obj_MsgIdentity_clone.base_id_key = null;
			vI_msgIdentityClone.copySelectedIdentity(
				vI_msgIdentityClone.elements.Obj_MsgIdentity_clone.selectedItem.value);
			vI_smtpSelector.resetMenuToMsgIdentity(
				vI_msgIdentityClone.elements.Obj_MsgIdentity_clone.selectedItem.value);
			// Identitys might have IdentityName set differently to 'name <email>',
			// so retrieve name and email directly from Identity
			var identity = gAccountManager.getIdentity(vI_msgIdentityClone.elements.Obj_MsgIdentity.selectedItem.getAttribute("value"))
			label = identity.getUnicharAttribute("fullName") + " <" + identity.getUnicharAttribute("useremail") + ">"			
		}
		else {
			vI_notificationBar.dump("## vI_msgIdentityClone: LoadIdentity virtual Identity\n");
			vI_msgIdentityClone.elements.Obj_MsgIdentity_clone.base_id_key = 
				vI_msgIdentityClone.elements.Obj_MsgIdentity_clone.selectedItem.base_id_key
			vI_msgIdentityClone.copySelectedIdentity(
				vI_msgIdentityClone.elements.Obj_MsgIdentity_clone.base_id_key);
			vI_smtpSelector.setMenuToKey(
				vI_msgIdentityClone.elements.Obj_MsgIdentity_clone.selectedItem.smtp_key);
			if (vI_msgIdentityClone.elements.Obj_MsgIdentity_clone.selectedItem.extras)
				vI_msgIdentityClone.elements.Obj_MsgIdentity_clone.selectedItem.extras.setValues();
			label = vI_msgIdentityClone.elements.Obj_MsgIdentity_clone.selectedItem.label
			vI_notificationBar.dump("## vI_msgIdentityClone: label: '" + label + "'\n");
			if (!label) {	// TB 2.x has problems without getAttribute
				label = vI_msgIdentityClone.elements.Obj_MsgIdentity_clone.selectedItem.getAttribute("label")
				vI_notificationBar.dump("## vI_msgIdentityClone: new label: '" + label + "'\n");
			}
		}
		vI_msgIdentityClone.elements.Obj_MsgIdentity_clone.setAttribute("label", label);
		vI_msgIdentityClone.elements.Obj_MsgIdentityTextbox_clone.value = label;

		vI_msgIdentityClone.elements.Obj_MsgIdentity_clone.setAttribute("accountname",
			vI_helper.getAccountname(vI_msgIdentityClone.elements.Obj_MsgIdentity_clone.selectedItem));
		vI_msgIdentityClone.markAsNewAccount(vI_msgIdentityClone.isExistingIdentity());
		vI_msgIdentityClone.initReplyToFields();
	},
	
	setIdentity : function(newName, timeStamp) {
		vI_notificationBar.dump("## initReplyToFields setIdentity " + newName + "\n");
		vI_msgIdentityClone.initMsgIdentityTextbox_clone();
		vI_msgIdentityClone.elements.Obj_MsgIdentityTextbox_clone.value = newName;
		vI_msgIdentityClone.blurEvent()
		var existingIdentity = vI_msgIdentityClone.isExistingIdentity();
		window.setTimeout(vI_msgIdentityClone.markAsNewAccount, 0, existingIdentity);
		if (existingIdentity) window.setTimeout(vI_msgIdentityClone.setMenuToIdentity, 0, existingIdentity);
		else vI_msgIdentityClone.elements.Obj_MsgIdentity_clone
						.setAttribute("timeStamp",timeStamp)
		return existingIdentity;
	},
	
	blurEventBlocked : false,
	blurEvent : function() {
		if (vI_msgIdentityClone.blurEventBlocked) return;
		vI_notificationBar.dump("## vI_msgIdentityClone: blurEvent.\n");
		vI_msgIdentityClone.initMsgIdentityTextbox_clone();
		var address = vI_helper.getAddress();
		vI_msgIdentityClone.elements.Obj_MsgIdentityTextbox_clone.value = address.combinedName;
		vI_msgIdentityClone.elements.Obj_MsgIdentityTextbox_clone.setAttribute("value",address.combinedName)
	},
	
	inputEvent :  function()
	{
		vI_notificationBar.dump("## vI_msgIdentityClone: inputEvent.\n");
		vI_msgIdentityClone.initMsgIdentityTextbox_clone();
		// compare Identity with existant ones and prepare Virtual-Identity if nonexistant found
		var existingIdentity = vI_msgIdentityClone.isExistingIdentity();
		vI_msgIdentityClone.markAsNewAccount(existingIdentity);
		vI_msgIdentityClone.elements.Obj_MsgIdentity_clone
						.setAttribute("timeStamp",null)
		if (existingIdentity) vI_msgIdentityClone.setMenuToIdentity(existingIdentity);
	},
	
	replyToInputElem : null,	// it is important to store the Elements and not the row
	replyToPopupElem : null,	// cause row might change if one above gets removed
	replyToInitValue : null,
	replyToStoredLastValue : null,
	replyToSynchronize : true,
	
	cleanReplyToFields : function() {
		vI_msgIdentityClone.replyToInputElem = null;
		vI_msgIdentityClone.replyToPopupElem = null;
		vI_msgIdentityClone.replyToInitValue = null;
		vI_msgIdentityClone.replyToStoredLastValue = null;
		vI_msgIdentityClone.replyToSynchronize = true;
		vI_msgIdentityClone.blurEventBlocked = true;
	},
	
	// called directly after a change of the Identity with the dropdown menu
	// searches the first reply-to row and assumes that this is the one we like to adapt
	initReplyToFields : function() {
		// TB 1.x doesn'T accept the value without the getAttribute
		var id = (vI_msgIdentityClone.elements.Obj_MsgIdentity_clone.selectedItem.value ||
			vI_msgIdentityClone.elements.Obj_MsgIdentity_clone.selectedItem.getAttribute("value"))
		if (id == "vid") return;
		var replyTo = gAccountManager.getIdentity(value).replyTo
		vI_notificationBar.dump("## initReplyToFields identity.replyTo: " + replyTo + "\n");
		if (replyTo == "") return
		
		vI_msgIdentityClone.replyToInitValue = replyTo;
		for (var row = 1; row <= top.MAX_RECIPIENTS; row ++) {
			var awType = awGetPopupElement(row).selectedItem.getAttribute("value");
			var awValue = awGetInputElement(row).value
			if (awType == "addr_reply" && awValue == replyTo) {
				vI_notificationBar.dump("## vI_msgIdentityClone: Reply-To found in row " + row + "\n");
				vI_msgIdentityClone.replyToPopupElem = awGetPopupElement(row)
				vI_msgIdentityClone.replyToInputElem = awGetInputElement(row)
				break;
				}
		}
		if (!vI_msgIdentityClone.replyToInputElem) vI_notificationBar.dump("## vI_msgIdentityClone: no Reply-To row found\n");
	},
	
	cleanupReplyTo : function() {
		if (!vI_msgIdentityClone.replyToSynchronize) return
		vI_notificationBar.dump("## cleanupReplyTo\n");
		
		// check if sychronizing should still be done (will be stopped if value was modified by hand)
		// if still in synchronizing mode reset the fields
		if ( vI_msgIdentityClone.replyToInputElem && vI_msgIdentityClone.synchroneReplyTo() ) {
			if (vI_msgIdentityClone.replyToInitValue) {
				var replyTo = vI_msgIdentityClone.replyToInitValue;
				vI_notificationBar.dump("## restore ReplyTo: " + replyTo + "\n");
				vI_msgIdentityClone.replyToInputElem.value = replyTo;
				vI_msgIdentityClone.replyToInputElem.setAttribute("value",replyTo)
			}
			else {
				awDeleteHit(vI_msgIdentityClone.replyToInputElem);
				window.setTimeout("vI_msgIdentityClone.elements.Obj_MsgIdentityTextbox_clone.focus();", 0)
			}
		}
		vI_msgIdentityClone.replyToInputElem = null;
		vI_msgIdentityClone.replyToPopupElem = null;
		vI_msgIdentityClone.replyToInitValue = null;
		vI_msgIdentityClone.replyToStoredLastValue = null;
	},
	
	synchroneReplyTo : function() {
		vI_notificationBar.dump("## synchroneReplyTo\n");
		if ( (vI_msgIdentityClone.replyToPopupElem.selectedItem.value != "addr_reply") ||
			(vI_msgIdentityClone.replyToStoredLastValue &&
			vI_msgIdentityClone.replyToInputElem.value != vI_msgIdentityClone.replyToStoredLastValue)) {
			vI_msgIdentityClone.replyToSynchronize = false;
			vI_notificationBar.dump("## vI_msgIdentityClone: (former) Reply-To entry changed, stop synchronizing\n");
		}
		return vI_msgIdentityClone.replyToSynchronize
	},
	
	// updateReplyTo is called on every change in the From: field, if its a virtual Identity
	updateReplyTo : function() {
		if (!vI.preferences.getBoolPref("autoReplyToSelf")) return
		if (!vI_msgIdentityClone.replyToSynchronize) {
			vI_notificationBar.dump("## updateReplyTo stopped Synchronizing\n") 
			return
		}
		vI_notificationBar.dump("## updateReplyTo replyToStoredLastValue=" 
				+ vI_msgIdentityClone.replyToStoredLastValue + "\n");

		// if replyToInputElem not set (so no initial Reply-To row was found) add a row now
		if (!vI_msgIdentityClone.replyToInputElem) {
			vI_msgIdentityClone.blurEventBlocked = true;
			awAddRecipient("addr_reply",vI_msgIdentityClone.elements.Obj_MsgIdentityTextbox_clone.value)
			window.setTimeout("vI_msgIdentityClone.elements.Obj_MsgIdentityTextbox_clone.focus();vI_msgIdentityClone.blurEventBlocked = false;", 0)
			vI_msgIdentityClone.replyToPopupElem = awGetPopupElement(top.MAX_RECIPIENTS - 1)
			vI_msgIdentityClone.replyToInputElem = awGetInputElement(top.MAX_RECIPIENTS - 1)
		}
		
		// check if sychronizing should still be done (will be stopped if value was modified by hand)
		if (vI_msgIdentityClone.synchroneReplyTo()) {
			vI_msgIdentityClone.replyToInputElem.value =
				vI_msgIdentityClone.elements.Obj_MsgIdentityTextbox_clone.value
			//~ vI_msgIdentityClone.replyToInputElem.setAttribute("value",
				//~ vI_msgIdentityClone.elements.Obj_MsgIdentityTextbox_clone.value)
			vI_msgIdentityClone.replyToStoredLastValue = vI_msgIdentityClone.replyToInputElem.value
		}		
	},
	
	markAsNewAccount : function(existingIdentity) {
		vI_msgIdentityClone.initMsgIdentityTextbox_clone();
		if (!existingIdentity) {
			vI.replacement_functions.replaceGenericFunction()
			if (vI.elements.Obj_vILogo.getAttribute("hidden") != "false") {
				vI_msgIdentityClone.elements.Obj_MsgIdentityTextbox_clone
					.setAttribute("class", vI_msgIdentityClone.text_virtualId_class);
				vI_msgIdentityClone.elements.Obj_MsgIdentity_clone
					.setAttribute("class", vI_msgIdentityClone.icon_virtualId_class);
				if (vI_msgIdentityClone.elements.Obj_MsgIdentity_clone
					.getAttribute("value") != "vid") {
					vI_msgIdentityClone.elements.Obj_MsgIdentity_clone.base_id_key = 
						vI_msgIdentityClone.elements.Obj_MsgIdentity_clone.getAttribute("value")
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
				//~ vI_storage.elements.Obj_storageSave.setAttribute("hidden",
					//~ !vI.preferences.getBoolPref("storage_show_switch"));
			}
			// code to hide the signature
			try { if (vI.preferences.getBoolPref("hide_signature") && ss_signature.length == 0)
				ss_main.signatureSwitch()
			} catch(vErr) { };
			// set reply-to according to Virtual Identity
			vI_msgIdentityClone.updateReplyTo()
		}
		else {
			if (vI.elements.Obj_vILogo.getAttribute("hidden") != "true") {
				vI_msgIdentityClone.elements.Obj_MsgIdentityTextbox_clone
					.setAttribute("class", vI_msgIdentityClone.text_usualId_class);
				vI_msgIdentityClone.elements.Obj_MsgIdentity_clone
					.setAttribute("class", vI_msgIdentityClone.icon_usualId_class);
				vI.Cleanup();
				vI.elements.Obj_vILogo.setAttribute("hidden","true");
				//~ vI_storage.elements.Obj_storageSave.setAttribute("hidden",
					//~ !vI.preferences.getBoolPref("storage_show_switch"));
				vI_msgIdentityClone.elements.Obj_MsgIdentity_clone.base_id_key = null;
				//~ vI_msgIdentityClone.elements.Obj_MsgIdentityPopup_clone.doCommand();
				vI_msgIdentityClone.elements.Obj_MsgIdentity_clone.setAttribute("value",existingIdentity)
			}
			// code to show the signature
			try { if (ss_signature.length > 0) ss_main.signatureSwitch(); }
			catch(vErr) { };
		}
	},
		
	// checks if the Identity currently described by the extension-area fields i already available as
	// a stored identity. If so, use the stored one.
	isExistingIdentity : function()
	{
		vI_msgIdentityClone.initMsgIdentityTextbox_clone();
		var address = vI_helper.getAddress();
		var smtp = vI_smtpSelector.elements.Obj_SMTPServerList.selectedItem.getAttribute('key')
		var id_key = vI_msgIdentityClone.elements.Obj_MsgIdentity_clone.base_id_key;
		if (!id_key) id_key = vI_msgIdentityClone.elements.Obj_MsgIdentity_clone.getAttribute("value");
		
		vI_msgIdentityClone.localIdentityData.email = address.email;
		vI_msgIdentityClone.localIdentityData.fullName = address.name;
		vI_msgIdentityClone.localIdentityData.id = id_key;
		vI_msgIdentityClone.localIdentityData.smtp = smtp;
		
		var existingIdentity = vI_msgIdentityClone.localIdentityData.isExistingIdentity();
		vI_notificationBar.dump("## vI_msgIdentityClone: isExistingIdentity " + existingIdentity + "\n");
		return existingIdentity
	},
}
