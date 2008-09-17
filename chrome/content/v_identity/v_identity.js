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

	gMsgCompose : null, // to store the global gMsgCompose after MsgComposeDialog is closed

	// Those variables keep pointers to original functions which might get replaced later
	original_functions : {
		GenericSendMessage : null,
		FillIdentityListPopup : null,	// TB 2.x
		FillIdentityList : null		// TB 3.x
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
			if (!vI_helper.olderVersion("TB", "2.0a")) vI.initSystemStage2();
		},
		NotifyComposeFieldsReady: function() { 
			vI_notificationBar.dump("## v_identity: NotifyComposeFieldsReady\n");
			if (vI_helper.olderVersion("TB", "2.0a")) vI.initSystemStage2();
		},
		ComposeProcessDone: function(aResult) {
			vI_notificationBar.dump("## v_identity: StateListener reports ComposeProcessDone\n");
			vI.Cleanup(); // not really required, parallel handled by vI.close
			vI_storage.clean();
		},
		SaveInFolderDone: function(folderURI) { 
			vI_notificationBar.dump("## v_identity: SaveInFolderDone\n");
			vI.Cleanup();
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

				var identities = queryISupportsArray(accounts[i].identities, Components.interfaces.nsIMsgIdentity);
				for (var j in identities) {
					var identity = identities[j];
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

				var identities = queryISupportsArray(accounts[i].identities, Components.interfaces.nsIMsgIdentity);
				for (var j in identities) {
					var identity = identities[j];
					var item = menulist.appendItem(identity.identityName, identity.key, server.prettyName);
					item.setAttribute("accountkey", accounts[i].key);
				}
			}
		},
		
		GenericSendMessageInProgress : false,
		GenericSendMessage: function (msgType) {
			if (vI.replacement_functions.GenericSendMessageInProgress) return;
			vI.replacement_functions.GenericSendMessageInProgress = true;
			
			var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
				.getService(Components.interfaces.nsIPromptService);
			vI_notificationBar.dump("\n## v_identity: VIdentity_GenericSendMessage\n");
			
			var vid = document.getElementById("msgIdentity_clone").vid

			if (msgType != nsIMsgCompDeliverMode.Now) {
				// dont allow user to fake identity if Message is not sended NOW and thunderbird-version is below 2.0 !!!!
				if (vid && (vI_helper.olderVersion("TB", "2.0b") || vI_helper.olderVersion("SM", "1.5a"))) {
					var server = gAccountManager.defaultAccount.incomingServer.prettyName
					var name = gAccountManager.defaultAccount.defaultIdentity.fullName
					var email = gAccountManager.defaultAccount.defaultIdentity.email
					var query = vI.elements.strings.getString("vident.sendLater.warning") +
						vI.elements.strings.getString("vident.sendLater.prefix") +
						name + " " + email + " [" + server + "]" + 
						vI.elements.strings.getString("vident.sendLater.postfix")
					
					if (!promptService.confirm(window,"Error",query)) {
						vI.replacement_functions.GenericSendMessageInProgress = false;
						return;
					}
					else { document.getElementById("msgIdentity_clone").selectedMenuItem = "default"; vid = false; }
				}
			}
			else {
				if ( (vid && vI.preferences.getBoolPref("warn_virtual") &&
					!(promptService.confirm(window,"Warning",
						vI.elements.strings.getString("vident.sendVirtual.warning")))) ||
				  (!vid && vI.preferences.getBoolPref("warn_nonvirtual") &&
					!(promptService.confirm(window,"Warning",
						vI.elements.strings.getString("vident.sendNonvirtual.warning")))) ) {
					vI.replacement_functions.GenericSendMessageInProgress = false;
					return;
				}
				vI_storage.storeVIdentityToAllRecipients(msgType);	
			}
			if (vid) vI.prepareAccount();
			vI.replacement_functions.GenericSendMessageInProgress = false;
			vI.original_functions.GenericSendMessage(msgType);
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
		}
	},

	remove: function() {
		window.removeEventListener('compose-window-reopen', vI.reopen, true);
		window.removeEventListener('compose-window-close', vI.close, true);
		vI_notificationBar.dump("## v_identity: end. remove Account if there.\n")
		vI.Cleanup();
		vI_storage.clean();
	},

	// initialization //
	init: function() {
		window.removeEventListener('load', vI.init, false);
		window.removeEventListener('compose-window-init', vI.init, true);
		if (vI.elements.Area_MsgIdentityHbox) return; // init done before, (?reopen)
		vI_notificationBar.dump("\n## v_identity: init.\n")
		vI.unicodeConverter.charset="UTF-8";
		vI.adapt_interface();
		vI.adapt_genericSendMessage();
		gMsgCompose.RegisterStateListener(vI.ComposeStateListener);
		window.addEventListener('compose-window-reopen', vI.reopen, true);
		window.addEventListener('compose-window-close', vI.close, true);
		vI.initSystemStage1();
		vI_notificationBar.dump("## v_identity: init done.\n\n")
	},
	
	initSystemStage1 : function() {
		vI_notificationBar.dump("## v_identity: initSystemStage1.\n")
		vI.gMsgCompose = gMsgCompose;
		document.getElementById("msgIdentity_clone").init();
		vI_statusmenu.init();
	},
	
	initSystemStage2 : function() {
		vI_notificationBar.dump("## v_identity: initSystemStage2.\n")
		vI_storage.init();
		vI_smartIdentity.init();
	},
	
	close : function() {
		vI.Cleanup();
		vI_storage.clean();
	},
	
	adapt_interface : function() {
		if (vI.elements.strings) return; // only rearrange the interface once
		
		// initialize the pointers to extension elements
		vI.elements.init_base()
		
		// rearrange the positions of some elements
		var parent_hbox = vI.elements.Obj_MsgIdentity.parentNode;
		var storage_box = document.getElementById("addresses-box");
		
		vI.elements.Obj_MsgIdentity.setAttribute("hidden", "true");
		vI.elements.Obj_MsgIdentity.previousSibling.setAttribute("control", "msgIdentity_clone");

		storage_box.removeChild(vI.elements.Area_MsgIdentityHbox);
		parent_hbox.appendChild(vI.elements.Area_MsgIdentityHbox);
		
		// initialize the pointers to extension elements (initialize those earlier might brake the interface)
		vI.elements.init_rest();	
	},
	
	adapt_genericSendMessage : function() {
		if (vI.original_functions.GenericSendMessage) return; // only initialize this once
		vI_notificationBar.dump("## v_identity: adapt GenericSendMessage\n");
		vI.original_functions.GenericSendMessage = GenericSendMessage;
		GenericSendMessage = vI.replacement_functions.GenericSendMessage;
	},
	
	reopen: function() {
		vI_notificationBar.clear();
		vI_notificationBar.clear_dump();
		vI_notificationBar.dump("## v_identity: composeDialog reopened. (msgType " + gMsgCompose.type + ")\n")
		
		// clean all elements
// 		vI_smtpSelector.clean();
		document.getElementById("msgIdentity_clone").clean();
		vI_msgIdentityCloneTools.cleanReplyToFields();
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
	
	tempStorage: { BaseIdentity : null, NewIdentity : null },

	__setSelectedIdentity : function(menuItem) {
		vI.elements.Obj_MsgIdentity.selectedItem = menuItem;
		vI.elements.Obj_MsgIdentity.setAttribute("label", menuItem.getAttribute("label"));
		vI.elements.Obj_MsgIdentity.setAttribute("accountname", menuItem.getAttribute("accountname"));
		vI.elements.Obj_MsgIdentity.setAttribute("value", menuItem.getAttribute("value"));
	},

	// sets the values of the dropdown-menu to the ones of the newly created account
	addVirtualIdentityToMsgIdentityMenu : function()
	{
		vI.tempStorage.BaseIdentity = vI.elements.Obj_MsgIdentity.selectedItem;
		vI.tempStorage.NewIdentity = document.createElement("menuitem");
		vI.tempStorage.NewIdentity.className = "identity-popup-item";
		
		// set the account name in the choosen menu item
		vI.tempStorage.NewIdentity.setAttribute("label", vI_account.account.defaultIdentity.identityName);
		vI.tempStorage.NewIdentity.setAttribute("accountname", " - " +  vI_account.account.incomingServer.prettyName);
		vI.tempStorage.NewIdentity.setAttribute("accountkey", vI_account.account.key);
		vI.tempStorage.NewIdentity.setAttribute("value", vI_account.account.defaultIdentity.key);
		
		vI.elements.Obj_MsgIdentityPopup.appendChild(vI.tempStorage.NewIdentity);
		vI.__setSelectedIdentity(vI.tempStorage.NewIdentity);
	},
	
	removeVirtualIdentityFromMsgIdentityMenu : function()
	{
		if (!vI.tempStorage.BaseIdentity) return; // don't try to remove Item twice
		try {	// might not exist anymore (window closed), so just try to remove it
			document.getElementById("msgIdentity").firstChild.removeChild(vI.tempStorage.NewIdentity);
			vI.__setSelectedIdentity(vI.tempStorage.BaseIdentity);
		} catch (e) { };
		vI.tempStorage.NewIdentity = null;
		vI.tempStorage.BaseIdentity = null;
	},

	prepareAccount : function() {
		vI.Cleanup(); // just to be sure that nothing is left (maybe last time sending was irregularily stopped)
		vI_account.createAccount();
		vI.addVirtualIdentityToMsgIdentityMenu();
	},

	Cleanup : function() {
		vI.removeVirtualIdentityFromMsgIdentityMenu();
		vI_account.removeUsedVIAccount();
	}
}


vI.replacement_functions.replace_FillIdentityList();
window.addEventListener('load', vI.init, false);		// TB 1.5x, SM
window.addEventListener('compose-window-init', vI.init, true);	// TB 2.x 3.x

window.addEventListener("unload", function(e) { try {vI_statusmenu.removeObserver();} catch (ex) { } }, false);

