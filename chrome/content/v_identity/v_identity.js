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

var vI_main = {
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
			vI_main.elements.Area_MsgIdentityHbox = document.getElementById("msgIdentityHbox");
			vI_main.elements.Obj_MsgIdentity = document.getElementById("msgIdentity");
		},
		init_rest : function() {
			vI_main.elements.Obj_MsgIdentityPopup = document.getElementById("msgIdentityPopup");
			vI_main.elements.Obj_vILogo = document.getElementById("v_identity_logo");
			vI_main.elements.strings = document.getElementById("vIdentBundle");
		},
		strings : null
	},

	ComposeStateListener : {
		NotifyComposeBodyReady: function() { 
			vI_notificationBar.dump("## v_identity: NotifyComposeBodyReady\n");
			if (!vI_helper.olderVersion("TB", "2.0a")) vI_main.initSystemStage2();
		},
		NotifyComposeFieldsReady: function() { 
			vI_notificationBar.dump("## v_identity: NotifyComposeFieldsReady\n");
			if (vI_helper.olderVersion("TB", "2.0a")) vI_main.initSystemStage2();
		},
		ComposeProcessDone: function(aResult) {
			vI_notificationBar.dump("## v_identity: StateListener reports ComposeProcessDone\n");
			vI_main.Cleanup(); // not really required, parallel handled by vI_main.close
			vI_storage.clean();
		},
		SaveInFolderDone: function(folderURI) { 
			vI_notificationBar.dump("## v_identity: SaveInFolderDone\n");
			vI_main.Cleanup();
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
			if (vI_main.replacement_functions.GenericSendMessageInProgress) return;
			vI_main.replacement_functions.GenericSendMessageInProgress = true;
			
			// if addressCol2 is focused while sending check storage for the entered address before continuing
			vI_storage.awOnBlur(vI_storage.focusedElement);

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
					var query = vI_main.elements.strings.getString("vident.sendLater.warning") +
						vI_main.elements.strings.getString("vident.sendLater.prefix") +
						name + " " + email + " [" + server + "]" + 
						vI_main.elements.strings.getString("vident.sendLater.postfix")
					
					if (!promptService.confirm(window,"Error",query)) {
						vI_main.replacement_functions.GenericSendMessageInProgress = false;
						return;
					}
					else { document.getElementById("msgIdentity_clone").selectedMenuItem = "default"; vid = false; }
				}
			}
			else {
				if ( (vid && vI_main.preferences.getBoolPref("warn_virtual") &&
					!(promptService.confirm(window,"Warning",
						vI_main.elements.strings.getString("vident.sendVirtual.warning")))) ||
				  (!vid && vI_main.preferences.getBoolPref("warn_nonvirtual") &&
					!(promptService.confirm(window,"Warning",
						vI_main.elements.strings.getString("vident.sendNonvirtual.warning")))) ) {
					vI_main.replacement_functions.GenericSendMessageInProgress = false;
					return;
				}
				if (!vI_storage.storeVIdentityToAllRecipients(msgType)) {
// 					vI_notificationBar.dump("## v_identity: sending aborted\n");
					vI_main.replacement_functions.GenericSendMessageInProgress = false;
					return;
				}
				vI_msgIdentityCloneTools.addReplyToSelf();
			}
			if (vid) vI_main.prepareAccount();
			vI_main.replacement_functions.GenericSendMessageInProgress = false;
// 			vI_notificationBar.dump("## v_identity: original_functions.GenericSendMessage\n");

			// final check if eyerything is nice before we handover to the real sending...
			var virtualIdentityData = document.getElementById("msgIdentity_clone").identityData;

			var currentIdentity = getCurrentIdentity();
            //                          vI_identityData(email, fullName, id, smtp, extras, sideDescription, existingID)
            var currentIdentityData = new vI_identityData(currentIdentity.email, currentIdentity.fullName, null, currentIdentity.smtpServerKey, null, null, null);
			
			vI_notificationBar.dump("\n## vI_identityData GenericSendMessage Final Check\n");
			vI_notificationBar.dump("## vI_identityData currentIdentity: fullName='" + currentIdentityData.fullName + "' email='" + currentIdentityData.email + "' smtp='" + currentIdentityData.smtp.key + "'\n");
			vI_notificationBar.dump("## vI_identityData virtualIdentityData: fullName='" + virtualIdentityData.fullName + "' email='" + virtualIdentityData.email + "' smtp='" + virtualIdentityData.smtp.key + "'\n");

			if	(currentIdentityData.fullName.toLowerCase() == virtualIdentityData.fullName.toLowerCase()	&&
				currentIdentityData.email.toLowerCase() == virtualIdentityData.email.toLowerCase()		&&
				virtualIdentityData.smtp.equal(currentIdentityData.smtp)	) {
					vI_main.original_functions.GenericSendMessage(msgType);
			}
			else {
				if (!(currentIdentityData.fullName.toLowerCase() == virtualIdentityData.fullName.toLowerCase())) vI_notificationBar.dump("\n## vI_identityData failed check for fullName.\n");
				if (!(currentIdentityData.email.toLowerCase() == virtualIdentityData.email.toLowerCase())) vI_notificationBar.dump("\n## vI_identityData failed check for email.\n");
				if (!(virtualIdentityData.smtp.equal(currentIdentityData.smtp))) vI_notificationBar.dump("\n## vI_identityData failed check for SMTP.\n");
				alert(vI_main.elements.strings.getString("vident.genericSendMessage.error"));
				vI_main.Cleanup();
			}
// 			vI_notificationBar.dump("## v_identity: original_functions.GenericSendMessage done\n");
		},
		
		replace_FillIdentityList : function() {
			if (typeof(FillIdentityList)=="function") {
				//~ vI_notificationBar.dump("## v_identity: replace FillIdentityList (TB 3.x)\n");
				vI_main.original_functions.FillIdentityList = FillIdentityList;
				FillIdentityList = vI_main.replacement_functions.FillIdentityList;
			}
			else {
				//~ vI_notificationBar.dump("## v_identity: replace FillIdentityListPopup (TB 2.x)\n");
				vI_main.original_functions.FillIdentityListPopup = FillIdentityListPopup;
				FillIdentityListPopup = vI_main.replacement_functions.FillIdentityListPopup;
			}
		}
	},

	remove: function() {
		window.removeEventListener('compose-window-reopen', vI_main.reopen, true);
		window.removeEventListener('compose-window-close', vI_main.close, true);
		vI_notificationBar.dump("## v_identity: end. remove Account if there.\n")
		vI_main.Cleanup();
		vI_storage.clean();
	},

	// initialization //
	init: function() {
		window.removeEventListener('load', vI_main.init, false);
		window.removeEventListener('compose-window-init', vI_main.init, true);
		if (vI_main.elements.Area_MsgIdentityHbox) return; // init done before, (?reopen)
		vI_notificationBar.dump("\n## v_identity: init.\n")
		vI_main.unicodeConverter.charset="UTF-8";
		if (!vI_main.adapt_genericSendMessage()) { vI_notificationBar.dump("\n## v_identity: init failed.\n"); return; }
		
		vI_main.adapt_interface();
		gMsgCompose.RegisterStateListener(vI_main.ComposeStateListener);
		document.getElementById("vI_tooltipPopupset")
			.addTooltip(document.getElementById("msgIdentity_clone"), false);
		window.addEventListener('compose-window-reopen', vI_main.reopen, true);
		window.addEventListener('compose-window-close', vI_main.close, true);
		
		// append observer to fcc_switch, because it does'n work with real identities (hidden by css)
		document.getElementById("fcc_switch").appendChild(document.getElementById("msgIdentity_clone_observer").cloneNode(false));

        vI_main.AccountManagerObserver.register();
        
		vI_main.initSystemStage1();
		vI_notificationBar.dump("## v_identity: init done.\n\n")
	},
	
	initSystemStage1 : function() {
		vI_notificationBar.dump("## v_identity: initSystemStage1.\n")
		vI_main.gMsgCompose = gMsgCompose;
		document.getElementById("msgIdentity_clone").init();
		vI_statusmenu.init();
	},
	
	initSystemStage2 : function() {
		vI_notificationBar.dump("## v_identity: initSystemStage2.\n")
		vI_msgIdentityCloneTools.initReplyTo();
		vI_storage.init();
		vI_smartIdentity.init();
	},
	
	close : function() {
		vI_main.Cleanup();
		vI_storage.clean();
	},
	
	adapt_interface : function() {
		if (vI_main.elements.strings) return; // only rearrange the interface once
		
		// initialize the pointers to extension elements
		vI_main.elements.init_base()
		
		// rearrange the positions of some elements
		var parent_hbox = vI_main.elements.Obj_MsgIdentity.parentNode;
		var storage_box = document.getElementById("addresses-box");
		var autoReplyToSelfLabel = document.getElementById("autoReplyToSelfLabel");
		
		storage_box.removeChild(autoReplyToSelfLabel);
		parent_hbox.appendChild(autoReplyToSelfLabel);
		storage_box.removeChild(vI_main.elements.Area_MsgIdentityHbox);
		parent_hbox.appendChild(vI_main.elements.Area_MsgIdentityHbox);

		vI_main.elements.Obj_MsgIdentity.setAttribute("hidden", "true");
		vI_main.elements.Obj_MsgIdentity.previousSibling.setAttribute("control", "msgIdentity_clone");
		
		// initialize the pointers to extension elements (initialize those earlier might brake the interface)
		vI_main.elements.init_rest();	
	},
	
	adapt_genericSendMessage : function() {
		if (vI_main.original_functions.GenericSendMessage) return true; // only initialize this once
		vI_notificationBar.dump("## v_identity: adapt GenericSendMessage\n");
		vI_main.original_functions.GenericSendMessage = GenericSendMessage;
		GenericSendMessage = vI_main.replacement_functions.GenericSendMessage;
		return true;
	},
	
	reopen: function() {
		vI_notificationBar.clear();
		vI_notificationBar.clear_dump();
		vI_notificationBar.dump("## v_identity: composeDialog reopened. (msgType " + gMsgCompose.type + ")\n")
		
		// clean all elements
		document.getElementById("msgIdentity_clone").clean();
		vI_smartIdentity.clean();
		vI_notificationBar.dump("## v_identity: everything cleaned.\n")
		
		// now (re)init the elements
		vI_main.initSystemStage1();
		
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
				vI_main.initSystemStage2(); break;
			case msgComposeType.Reply:
			case msgComposeType.ReplyAll:
			case msgComposeType.ReplyToGroup:
			case msgComposeType.ReplyToSender:
			case msgComposeType.ReplyToSenderAndGroup:
			case msgComposeType.ReplyWithTemplate:
			case msgComposeType.ReplyToList:
				gMsgCompose.RegisterStateListener(vI_main.ComposeStateListener);
		}
		vI_notificationBar.dump("## v_identity: reopen done.\n")
	},
	
	tempStorage: { BaseIdentity : null, NewIdentity : null },

	__setSelectedIdentity : function(menuItem) {
		vI_main.elements.Obj_MsgIdentity.selectedItem = menuItem;
		vI_main.elements.Obj_MsgIdentity.setAttribute("label", menuItem.getAttribute("label"));
		vI_main.elements.Obj_MsgIdentity.setAttribute("accountname", menuItem.getAttribute("accountname"));
		vI_main.elements.Obj_MsgIdentity.setAttribute("value", menuItem.getAttribute("value"));
	},

	// sets the values of the dropdown-menu to the ones of the newly created account
	addVirtualIdentityToMsgIdentityMenu : function()
	{
		vI_main.tempStorage.BaseIdentity = vI_main.elements.Obj_MsgIdentity.selectedItem;
		vI_main.tempStorage.NewIdentity = document.createElement("menuitem");
		vI_main.tempStorage.NewIdentity.className = "identity-popup-item";
		
		// set the account name in the choosen menu item
		vI_main.tempStorage.NewIdentity.setAttribute("label", vI_account.account.defaultIdentity.identityName);
		vI_main.tempStorage.NewIdentity.setAttribute("accountname", " - " +  vI_account.account.incomingServer.prettyName);
		vI_main.tempStorage.NewIdentity.setAttribute("accountkey", vI_account.account.key);
		vI_main.tempStorage.NewIdentity.setAttribute("value", vI_account.account.defaultIdentity.key);
		
		vI_main.elements.Obj_MsgIdentityPopup.appendChild(vI_main.tempStorage.NewIdentity);
		vI_main.__setSelectedIdentity(vI_main.tempStorage.NewIdentity);
	},
	
	removeVirtualIdentityFromMsgIdentityMenu : function()
	{
		if (!vI_main.tempStorage.BaseIdentity) return; // don't try to remove Item twice
		try {	// might not exist anymore (window closed), so just try to remove it
			document.getElementById("msgIdentity").firstChild.removeChild(vI_main.tempStorage.NewIdentity);
			vI_main.__setSelectedIdentity(vI_main.tempStorage.BaseIdentity);
		} catch (e) { };
		vI_main.tempStorage.NewIdentity = null;
		vI_main.tempStorage.BaseIdentity = null;
	},

	prepareAccount : function() {
		vI_main.Cleanup(); // just to be sure that nothing is left (maybe last time sending was irregularily stopped)
		vI_account.createAccount();
		vI_main.addVirtualIdentityToMsgIdentityMenu();
	},

	Cleanup : function() {
		vI_main.removeVirtualIdentityFromMsgIdentityMenu();
		vI_account.removeUsedVIAccount();
	},
	
	//  code adapted from http://xulsolutions.blogspot.com/2006/07/creating-uninstall-script-for.html
    AccountManagerObserver : {
        _uninstall : false,
        observe : function(subject, topic, data) {
            if (topic == "am-smtpChanges") {
                vI_notificationBar.dump("## v_identity: smtp changes observed\n");
                var msgIdentity_clone = document.getElementById("msgIdentity_clone");
                document.getAnonymousElementByAttribute(msgIdentity_clone, "class", "smtpServerListHbox").refresh();
            }
            if (topic == "am-acceptChanges") {
                vI_notificationBar.dump("## v_identity: account changes observed\n");
                document.getElementById("msgIdentity_clone").clean();
                document.getElementById("msgIdentity_clone").init();
            }
        },
        register : function() {
            var obsService = Components.classes["@mozilla.org/observer-service;1"].
                getService(Components.interfaces.nsIObserverService)
            obsService.addObserver(this, "am-smtpChanges", false);
            obsService.addObserver(this, "am-acceptChanges", false);
        },
        unregister : function() {
            var obsService = Components.classes["@mozilla.org/observer-service;1"].
                getService(Components.interfaces.nsIObserverService)
            obsService.removeObserver(this, "am-smtpChanges");
            obsService.removeObserver(this, "am-acceptChanges");
        }
    }
}


vI_main.replacement_functions.replace_FillIdentityList();
window.addEventListener('load', vI_main.init, false);		// TB 1.5x, SM
window.addEventListener('compose-window-init', vI_main.init, true);	// TB 2.x 3.x

window.addEventListener("unload", function(e) { vI_main.AccountManagerObserver.unregister(); try {vI_statusmenu.removeObserver();} catch (ex) { } }, false);

