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
	preferences : Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefService)
			.getBranch("extensions.virtualIdentity."),
	
	headerParser : Components.classes["@mozilla.org/messenger/headerparser;1"]
				.getService(Components.interfaces.nsIMsgHeaderParser),
	
	unicodeConverter : Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
				.createInstance(Components.interfaces.nsIScriptableUnicodeConverter),

	// Those variables keep pointers to original functions which might get replaced later
	original_functions : {
		GenericSendMessage : null,
		FillIdentityListPopup : null,	// TB 2.x
		FillIdentityList : null,	// TB 3.x
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
		strings : null
	},

	ComposeStateListener : {
		NotifyComposeBodyReady: function() { 
			vI_notificationBar.dump("## v_identity: NotifyComposeBodyReady\n");
			vI.initSystemStage2();
		},
		NotifyComposeFieldsReady: function() { 
			vI_notificationBar.dump("## v_identity: NotifyComposeFieldsReady\n");
		},
		ComposeProcessDone: function(aResult) {
			vI_notificationBar.dump("## v_identity: StateListener reports ComposeProcessDone\n");
			vI.Cleanup_Account(); // not really required, parallel handled by vI.close
			vI_storage.clean();
		},
		SaveInFolderDone: function(folderURI) { 
			vI_notificationBar.dump("## v_identity: SaveInFolderDone\n");
			vI.Cleanup_Account();
			vI_storage.clean();
		}
	},
		
	replacement_functions : {
		// TB 2.x
		FillIdentityListPopup: function(popup) {
			vI_notificationBar.dump("## v_identity: mod. FillIdentityListPopup\n");
			var accounts = queryISupportsArray(gAccountManager.accounts, Components.interfaces.nsIMsgAccount);
			accounts.sort(compareAccountSortOrder);

			for (var i in accounts) {
				var server = accounts[i].incomingServer;
				if (!server) continue;
				// check for VirtualIdentity Account
				try {	vI_account.prefroot.getBoolPref("mail.account." + accounts[i].key + ".vIdentity");
					continue; } catch (e) { };

				var identites = queryISupportsArray(accounts[i].identities, Components.interfaces.nsIMsgIdentity);
				for (var j in identites) {
					var identity = identites[j];
					var item = document.createElement("menuitem");
					item.className = "identity-popup-item";
					item.setAttribute("label", identity.identityName);
					item.setAttribute("value", identity.key);
					item.setAttribute("accountkey", accounts[i].key);
					item.setAttribute("accountname", " - " + server.prettyName);
					popup.appendChild(item);
				}
			}
		},
		
		// TB 3.x
		FillIdentityList: function(menulist) {
			vI_notificationBar.dump("## v_identity: mod. FillIdentityList\n");
			var accounts = queryISupportsArray(gAccountManager.accounts, Components.interfaces.nsIMsgAccount);
			if (typeof(sortAccounts)=="function") // TB 3.x
				accounts.sort(sortAccounts);

			for (var i in accounts) {
				var server = accounts[i].incomingServer;
				if (!server) continue;
				// check for VirtualIdentity Account
				try {	vI_account.prefroot.getBoolPref("mail.account." + accounts[i].key + ".vIdentity");
					continue; } catch (e) { };

				var identites = queryISupportsArray(accounts[i].identities, Components.interfaces.nsIMsgIdentity);
				for (var j in identites) {
					var identity = identites[j];
					var item = menulist.appendItem(identity.identityName, identity.key, server.prettyName);
					item.setAttribute("accountkey", accounts[i].key);
				}
			}
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
				vI_storage.storeVIdentityToAllRecipients(msgType);
				if (window.cancelSendMessage) {
					vI.Cleanup_Account();
					vI_notificationBar.dump("## v_identity: SendMessage cancelled\n");
				}
			}
		},
		
		replace_FillIdentityList : function() {
			if (typeof(FillIdentityList)=="function") {
				//~ vI_notificationBar.dump("## v_identity: replace FillIdentityList (TB 3.x)\n");
				vI.original_functions.FillIdentityList = FillIdentityList;
				FillIdentityList = vI.replacement_functions.FillIdentityList;
			}
			else {
				//~ vI_notificationBar.dump("## v_identity: replace FillIdentityListPopup (TB 2.x)\n");
				vI.original_functions.FillIdentityListPopup = FillIdentityListPopup;
				FillIdentityListPopup = vI.replacement_functions.FillIdentityListPopup;
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
		window.removeEventListener('compose-window-reopen', vI.reopen, true);
		window.removeEventListener('compose-window-close', vI.close, true);
		vI_notificationBar.dump("## v_identity: end. remove Account if there.\n")
		vI.Cleanup_Account();
		vI_storage.clean();
	},

	// initialization //
	init: function() {
		window.removeEventListener('load', vI.init, false);
		window.removeEventListener('compose-window-init', vI.init, true);
		if (vI.elements.Area_MsgIdentityHbox) return; // init done before, (?reopen)
		vI_notificationBar.dump("## v_identity: init.\n")
		vI.unicodeConverter.charset="UTF-8";
		vI.adapt_interface();
		vI.adapt_genericSendMessage();
		gMsgCompose.RegisterStateListener(vI.ComposeStateListener);
		window.addEventListener('compose-window-reopen', vI.reopen, true);
		window.addEventListener('compose-window-close', vI.close, true);
		vI.initSystemStage1();
		vI_notificationBar.dump("## v_identity: init done.\n")
	},
	
	initSystemStage1 : function() {
		vI_notificationBar.dump("## v_identity: initSystemStage1.\n")
		vI_smtpSelector.init();
		vI_msgIdentityClone.init();
	},
	
	initSystemStage2 : function() {
		vI_notificationBar.dump("## v_identity: initSystemStage2.\n")
		vI_msgIdentityClone.initReplyToFields();
		vI_storage.init();
		vI_smartIdentity.init();	
	},
	
	close : function() {
		vI.Cleanup_Account();
		vI_storage.clean();
	},
	
	adapt_interface : function() {
		if (vI.elements.strings) return; // only rearrange the interface once
		
		// initialize the pointers to extension elements
		vI.elements.init_base()
		
		// rearrange the positions of some elements
		var parent_hbox = vI.elements.Obj_MsgIdentity.parentNode;
		var storage_box = document.getElementById("addresses-box");
		
		storage_box.removeChild(vI.elements.Area_MsgIdentityHbox);
		parent_hbox.appendChild(vI.elements.Area_MsgIdentityHbox);
		
		// initialize the pointers to extension elements (initialize those earlier might brake the interface)
		vI.elements.init_rest();	
	},
	
	adapt_genericSendMessage : function() {
		if (vI.original_functions.GenericSendMessage) return; // only initialize this once
	
		// adapt GenericSendMessage to know SendMsgType
		vI_notificationBar.dump("## v_identity: adapt GenericSendMessage\n");
		vI.original_functions.GenericSendMessage = GenericSendMessage;
		GenericSendMessage = function (msgType) {
				vI.msgType = msgType; if (vI.warning(msgType)) {
					vI.original_functions.GenericSendMessage(msgType);
					vI_storage.storeVIdentityToAllRecipients(msgType); } }		
	},
	
	reopen: function() {
		vI_notificationBar.clear_dump();
		vI_notificationBar.dump("## v_identity: composeDialog reopened. (msgType " + gMsgCompose.type + ")\n")
		
		// clean all elements
		vI_smtpSelector.clean();
		vI_msgIdentityClone.clean();
		vI_msgIdentityClone.cleanReplyToFields();
		//~ vI_storage.clean();
		vI_smartIdentity.clean();
		vI_notificationBar.dump("## v_identity: everything cleaned.\n")
		
		// now (re)init the elements
		vI.initSystemStage1();
		
		// stateListener only works in reply-cases
		// so activate stage2 in reply-cases trough StateListener
		// in other cases directly
		var msgComposeType = Components.interfaces.nsIMsgCompType;
		switch (gMsgCompose.type) {
			case msgComposeType.New:
			case msgComposeType.NewsPost:
			case msgComposeType.MailToUrl:
			case msgComposeType.Draft:
			case msgComposeType.Template:
			case msgComposeType.ForwardAsAttachment:
			case msgComposeType.ForwardInline:
				vI.initSystemStage2(); break;
			case msgComposeType.Reply:
			case msgComposeType.ReplyAll:
			case msgComposeType.ReplyToGroup:
			case msgComposeType.ReplyToSender:
			case msgComposeType.ReplyToSenderAndGroup:
			case msgComposeType.ReplyWithTemplate:
				gMsgCompose.RegisterStateListener(vI.ComposeStateListener);
		}
		vI_notificationBar.dump("## v_identity: reopen done.\n")
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
		var newMenuItem = vI_helper.addIdentityMenuItem(vI.elements.Obj_MsgIdentityPopup,
						vI_account.account.defaultIdentity.identityName,
						" - " +  vI_account.account.incomingServer.prettyName,
						vI_account.account.key,
						vI_account.account.defaultIdentity.key, null, null, null)
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
				vI.msgType = msgType; if (vI.warning(msgType)) {
					vI.original_functions.GenericSendMessage(msgType);
					vI_storage.storeVIdentityToAllRecipients(msgType); } }
			vI_notificationBar.dump("## v_identity: restored GenericSendMessage (Virtual Identity deactivated)\n");
		}
	},

	// removes the account
	Cleanup_Account : function() {
		// remove temporary Account
		if (vI_account.account) {
			vI.remVirtualIdentityFromMsgIdentityMenu();
			vI_account.removeUsedVIAccount();
		}
	},
}


vI.replacement_functions.replace_FillIdentityList();
window.addEventListener('load', vI.init, false);		// TB 1.5x, SM
window.addEventListener('compose-window-init', vI.init, true);	// TB 2.x 3.x
