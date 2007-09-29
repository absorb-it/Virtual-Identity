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

var vI = {
	helper : {
		// "accountname" property changed in Thunderbird 3.x, Seamonkey 1.5x to "description"
		getAccountname: function(elem) {
			if (elem.getAttribute("accountname") == "" && elem.getAttribute("description") != "")
				return "- " + elem.getAttribute("description")
			else return elem.getAttribute("accountname")
		},

		addIdentityMenuItem: function(object, identityName, accountName, accountKey, identityKey) {
			var MenuItem = document.createElement("menuitem");
			MenuItem.className = "identity-popup-item";
			
			// set the account name in the choosen menu item
			MenuItem.setAttribute("label", identityName);
			MenuItem.setAttribute("accountname", accountName);
			MenuItem.setAttribute("accountkey", accountKey);
			MenuItem.setAttribute("value", identityKey);
			MenuItem.setAttribute("class", "identity_clone-popup-item new-icon")
			
			object.appendChild(MenuItem)
			
			return MenuItem
		},

		addSeparatorToCloneMenu: function() {
			var object = vI_msgIdentityClone.elements.Obj_msgIdentityClone;
			var separator = document.createElement("menuseparator");
			separator.setAttribute("id", "vid_separator");
			vI_msgIdentityClone.elements.Obj_MsgIdentityPopup_clone.appendChild(
				separator)
		},

		getBaseIdentity : function () {
			return gAccountManager.getIdentity(vI.elements.Obj_MsgIdentity.value);
		},
		
		getAddress : function() {
			var address = vI_msgIdentityClone.elements.Obj_MsgIdentityTextbox_clone.value;
			var splitted = { number : 0, emails : {}, fullNames : {}, combinedNames : {} };
			vI.headerParser.parseHeadersWithArray(address, splitted.emails,
				splitted.fullNames, splitted.combinedNames);
			return { name: splitted.fullNames.value[0], email: splitted.emails.value[0],
					combinedName: splitted.combinedNames.value[0]}
		},
	},

	preferences : Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefService)
			.getBranch("extensions.virtualIdentity."),
	
	headerParser : Components.classes["@mozilla.org/messenger/headerparser;1"]
				.getService(Components.interfaces.nsIMsgHeaderParser),
	
	// Those variables keep pointers to original functions which might get replaced later
	original_functions : {
		GenericSendMessage : null,
		MsgComposeCloseWindow : null,
	},

	// some pointers to the layout-elements of the extension
	elements : {
		init_base : function() {
			vI.elements.Area_MsgIdentityHbox = document.getElementById("msgIdentityHbox");
			vI.elements.Obj_MsgIdentity = document.getElementById("msgIdentity");
		},
		init_rest : function() {
			vI.elements.Obj_MsgIdentityPopup = document.getElementById("msgIdentityPopup");
			vI.elements.Obj_vILogo = document.getElementById("v_identity_logo");
			vI.elements.strings = document.getElementById("vIdentBundle");
		},
	},

	ComposeStateListener : {
		NotifyComposeBodyReady: function() { 
			vI_notificationBar.dump("## v_identity: NotifyComposeBodyReady\n");
		},
		NotifyComposeFieldsReady: function() { 
			vI_notificationBar.dump("## v_identity: NotifyComposeFieldsReady\n");
			vI_smartIdentity.init();
		},
		ComposeProcessDone: function(aResult) {
			vI_notificationBar.dump("## v_identity: StateListener reports ComposeProcessDone\n");
			vI.Cleanup_Account();
			if (aResult== Components.results.NS_OK && vI.msgType == nsIMsgCompDeliverMode.Now)
					MsgComposeCloseWindow(false);
		},
		SaveInFolderDone: function(folderURI) { 
			vI_notificationBar.dump("## v_identity: SaveInFolderDone\n");
			vI.Cleanup_Account();
		}
	},
		
	replacement_functions : {
		// if the windows gets closed, this is the way to get rid of the account.
		MsgComposeCloseWindow : function(recycleIt) {
			vI_notificationBar.dump("## v_identity: MsgComposeCloseWindow\n");
			vI.original_functions.MsgComposeCloseWindow(false);
		},
		
		awReturnHit: function (element) {
			vI_notificationBar.dump("## v_identity: awReturnHit\n");
			vI.original_functions.awReturnHit(element);
			vI_addressBook.readVirtualIdentity(element);
		},
		
		awTabFromRecipient: function (element, event) {
			vI_notificationBar.dump("## v_identity: awTabFromRecipient\n");
			vI.original_functions.awTabFromRecipient(element, event);
			vI_addressBook.readVirtualIdentity(element);
		},
		
		GenericSendMessage: function (msgType) {
			var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
				.getService(Components.interfaces.nsIPromptService);
			vI_notificationBar.dump("## v_identity: VIdentity_GenericSendMessage\n");
			vI.msgType = msgType; 
			// dont allow user to fake identity if Message is not sended NOW and thunderbird-version is below 2.0 !!!!
			var appID = null;
			var appVersion = null;
			var versionChecker;
			if("@mozilla.org/xre/app-info;1" in Components.classes) {
				var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
					.getService(Components.interfaces.nsIXULAppInfo);
				appID = appInfo.ID
				appVersion = appInfo.version
			}
			if("@mozilla.org/xpcom/version-comparator;1" in Components.classes)
				versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
					.getService(Components.interfaces.nsIVersionComparator);
			else appID = null;
			const THUNDERBIRD_ID = "{3550f703-e582-4d05-9a08-453d09bdfdc6}";
			const SEAMONKEY_ID = "{92650c4d-4b8e-4d2a-b7eb-24ecf4f6b63a}";
			if (msgType != nsIMsgCompDeliverMode.Now &&
				((!appID) || (appID == THUNDERBIRD_ID && versionChecker.compare(appVersion, "2.0b") < 0) ||
				(appID == SEAMONKEY_ID && versionChecker.compare(appVersion, "1.5a") < 0)))	{
				var server = gAccountManager.defaultAccount.incomingServer.prettyName
				var name = gAccountManager.defaultAccount.defaultIdentity.fullName
				var email = gAccountManager.defaultAccount.defaultIdentity.email

				//Get the bundled string file.
				if (promptService.confirm(window,"Error",vI.elements.strings.getString("vident.sendLater.warning") +
					vI.elements.strings.getString("vident.sendLater.prefix") +
					name + " " + email + " [" + server + "]" + vI.elements.strings.getString("vident.sendLater.postfix")))
					{
						vI_msgIdentityClone.resetMenuToDefault();
						GenericSendMessage( msgType );
					}
				else { return; }
			}
			else if ( msgType != nsIMsgCompDeliverMode.Now || !vI.preferences.getBoolPref("warn_virtual") || 
				promptService.confirm(window,"Warning",vI.elements.strings.getString("vident.sendVirtual.warning")) ) {
				// just to be sure to use the recent settings if account was left by cancelled Send Operation
				vI.Cleanup_Account();
				vI_account.createAccount();
				vI.addVirtualIdentityToMsgIdentityMenu();
				vI.original_functions.GenericSendMessage(msgType);
				if (window.cancelSendMessage) {
					vI.Cleanup_Account();
					vI_notificationBar.dump("## v_identity: SendMessage cancelled\n");
				}
				else if (msgType == nsIMsgCompDeliverMode.Now) vI_addressBook.storeVirtualIdentity();
			}
		},

		replaceGenericFunction : function()
		{
			if (GenericSendMessage == vI.replacement_functions.GenericSendMessage) return;
			vI_notificationBar.dump("## v_identity: replace GenericSendMessage (Virtual Identity activated)\n");
			GenericSendMessage = vI.replacement_functions.GenericSendMessage;
		},
	},

	remove: function() {
		vI_notificationBar.dump("## v_identity: end. remove Account if there.\n")
		vI.Cleanup_Account();
	},
	
	// initialization //
	init: function() {
		// clear the DebugArea (not needed cause window is new)
		//~ vI_notificationBar.clear_dump()
	
		// initialize the pointers to extension elements
		vI.elements.init_base()
		
		// rearrange the positions of some elements
		var parent_hbox = vI.elements.Obj_MsgIdentity.parentNode;
		var storage_box = document.getElementById("addresses-box");
		
		storage_box.removeChild(vI.elements.Area_MsgIdentityHbox)
		parent_hbox.appendChild(vI.elements.Area_MsgIdentityHbox);
		
		// initialize the pointers to extension elements (initialize those earlier might brake the interface)
		vI.elements.init_rest();
		
		vI_smtpSelector.init();
		vI_msgIdentityClone.init();
		
		// replace MsgComposeCloseWindow with our own version to get rid of the old account in any case
		vI_notificationBar.dump("## v_identity: replace MsgComposeCloseWindow\n");
		vI.original_functions.MsgComposeCloseWindow = MsgComposeCloseWindow;
		MsgComposeCloseWindow = function (recycleIt) {
			vI.replacement_functions.MsgComposeCloseWindow(recycleIt); }
			
		// adapt GenericSendMessage to know SendMsgType
		vI_notificationBar.dump("## v_identity: adapt GenericSendMessage\n");
		vI.original_functions.GenericSendMessage = GenericSendMessage;
		GenericSendMessage = function (msgType) {
				vI.msgType = msgType; if (vI.warning(msgType)) vI.original_functions.GenericSendMessage(msgType); }
		
		// adapt awReturnHit to change Indentity if stored in AddressBook
		vI_notificationBar.dump("## v_identity: adapt awReturnHit\n");
		vI.original_functions.awReturnHit = awReturnHit;
		awReturnHit = function (element) {
				vI.replacement_functions.awReturnHit(element); }
		
		// adapt awTabFromRecipient to change Indentity if stored in AddressBook
		vI_notificationBar.dump("## v_identity: adapt awTabFromRecipient\n");
		vI.original_functions.awTabFromRecipient = awTabFromRecipient;
		awTabFromRecipient = function (element, event) {
				vI.replacement_functions.awTabFromRecipient(element, event); }
				
		gMsgCompose.RegisterStateListener(vI.ComposeStateListener);
		window.removeEventListener("load", vI.init, false);
	},
	
	// show a warning if you are using a usual (non-virtual) identity
	warning : function(msgType) {
		var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
			.getService(Components.interfaces.nsIPromptService);
		return ((msgType != nsIMsgCompDeliverMode.Now) || !vI.preferences.getBoolPref("warn_nonvirtual") || 
			promptService.confirm(window,"Warning",vI.elements.strings.getString("vident.sendNonvirtual.warning")))
	},
	
	// sets the values of the dropdown-menu to the ones of the newly created account
	addVirtualIdentityToMsgIdentityMenu : function()
	{
		vI.storeBaseIdentity = vI.elements.Obj_MsgIdentity.selectedItem
		var newMenuItem = vI.helper.addIdentityMenuItem(vI.elements.Obj_MsgIdentityPopup,
						vI_account.account.defaultIdentity.identityName,
						" - " +  vI_account.account.incomingServer.prettyName,
						vI_account.account.key,
						vI_account.account.defaultIdentity.key)
		vI.elements.Obj_MsgIdentity.selectedItem = newMenuItem;
		vI.elements.Obj_MsgIdentity.setAttribute("label", newMenuItem.getAttribute("label"));
		vI.elements.Obj_MsgIdentity.setAttribute("accountname", newMenuItem.getAttribute("accountname"));
		vI.elements.Obj_MsgIdentity.setAttribute("value", newMenuItem.getAttribute("value"));
	},
	
	// sets the values of the dropdown-menu to the ones of the newly created account
	remVirtualIdentityFromMsgIdentityMenu : function()
	{
		MenuItems = vI_msgIdentityClone.elements.Obj_MsgIdentity.firstChild.childNodes
		for (index = 1; index <= MenuItems.length; index++) {
			if ( MenuItems[MenuItems.length - index].getAttribute("value") == vI_account.account.defaultIdentity.key )
				vI_msgIdentityClone.elements.Obj_MsgIdentity.firstChild.removeChild(MenuItems[MenuItems.length - index])
		}
		vI.elements.Obj_MsgIdentity.selectedItem = vI.storeBaseIdentity;
		vI.elements.Obj_MsgIdentity.setAttribute("label", vI.storeBaseIdentity.getAttribute("label"));
		vI.elements.Obj_MsgIdentity.setAttribute("accountname", vI.storeBaseIdentity.getAttribute("accountname"));
		vI.elements.Obj_MsgIdentity.setAttribute("value", vI.storeBaseIdentity.getAttribute("value"));
		vI.storeBaseIdentity = null;
	},
	
	// Clean all the things I had changed (except the FillIdentityListPopup)
	Cleanup : function()
	{
		vI_notificationBar.dump("## v_identity: Cleanup\n");
		vI.Cleanup_Account();
		
		// restore function
		if (GenericSendMessage == vI.replacement_functions.GenericSendMessage) {
			GenericSendMessage = function (msgType) {
				vI.msgType = msgType; if (vI.warning(msgType)) vI.original_functions.GenericSendMessage(msgType); }
			vI_notificationBar.dump("## v_identity: restored GenericSendMessage (Virtual Identity deactivated)\n");
		}
	},

	// removes the account
	Cleanup_Account : function() {
		// remove temporary Account
		if (vI_account.account) {
			vI.remVirtualIdentityFromMsgIdentityMenu();
			vI_account.removeAccount();
		}
	},
}

window.addEventListener("load", vI.init, false);
window.addEventListener("unload", vI.remove, false);