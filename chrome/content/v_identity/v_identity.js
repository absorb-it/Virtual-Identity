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

virtualIdentityExtension.ns(function() { with (virtualIdentityExtension.LIB) {
var main = {
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
		FillIdentityList : null
	},

	// some pointers to the layout-elements of the extension
	elements : {
		init_base : function() {
			main.elements.Area_MsgIdentityHbox = document.getElementById("msgIdentityHbox");
			main.elements.Obj_MsgIdentity = document.getElementById("msgIdentity");
		},
		init_rest : function() {
			main.elements.Obj_MsgIdentityPopup = document.getElementById("msgIdentityPopup");
			main.elements.Obj_vILogo = document.getElementById("v_identity_logo");
			main.elements.strings = document.getElementById("vIdentBundle");
		},
		strings : null
	},

	ComposeStateListener : {
		NotifyComposeBodyReady: function() { 
			vI.notificationBar.dump("## v_identity: NotifyComposeBodyReady\n");
			main.initSystemStage2();
		},
		NotifyComposeFieldsReady: function() { 
			vI.notificationBar.dump("## v_identity: NotifyComposeFieldsReady\n");
		},
		ComposeProcessDone: function(aResult) {
			vI.notificationBar.dump("## v_identity: StateListener reports ComposeProcessDone\n");
			main.Cleanup(); // not really required, parallel handled by main.close
			vI.storage.clean();
		},
		SaveInFolderDone: function(folderURI) { 
			vI.notificationBar.dump("## v_identity: SaveInFolderDone\n");
			main.Cleanup();
			vI.storage.clean();
		}
	},
		
	replacement_functions : {
		FillIdentityList: function(menulist) {
			vI.notificationBar.dump("## v_identity: mod. FillIdentityList\n");
			var mgr = Components.classes["@mozilla.org/messenger/account-manager;1"]
								.getService(Components.interfaces.nsIMsgAccountManager);
			var accounts = queryISupportsArray(mgr.accounts,
                                     Components.interfaces.nsIMsgAccount);

			// Ugly hack to work around bug 41133. :-(
			accounts = accounts.filter(function isNonSuckyAccount(a) { return !!a.incomingServer; });
			function sortAccounts(a, b) {
				if (a.key == mgr.defaultAccount.key)
				return -1;
				if (b.key == mgr.defaultAccount.key)
				return 1;
				var aIsNews = a.incomingServer.type == "nntp";
				var bIsNews = b.incomingServer.type == "nntp";
				if (aIsNews && !bIsNews)
				return 1;
				if (bIsNews && !aIsNews)
				return -1;

				var aIsLocal = a.incomingServer.type == "none";
				var bIsLocal = b.incomingServer.type == "none";
				if (aIsLocal && !bIsLocal)
				return 1;
				if (bIsLocal && !aIsLocal)
				return -1;
				return 0;
			}
			accounts.sort(sortAccounts);
			
			for (var i in accounts) {
				var server = accounts[i].incomingServer;
				if (!server) continue;
				// check for VirtualIdentity Account
				try {	vI.account._prefroot.getBoolPref("mail.account." + accounts[i].key + ".vIdentity");
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
			if (main.replacement_functions.GenericSendMessageInProgress) return;
			main.replacement_functions.GenericSendMessageInProgress = true;
			
			// if addressCol2 is focused while sending check storage for the entered address before continuing
			vI.storage.awOnBlur(vI.storage.focusedElement);

			var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
				.getService(Components.interfaces.nsIPromptService);
			vI.notificationBar.dump("\n## v_identity: VIdentity_GenericSendMessage\n");
			
			var vid = document.getElementById("msgIdentity_clone").vid

			if (msgType == nsIMsgCompDeliverMode.Now) {
				if ( (vid && main.preferences.getBoolPref("warn_virtual") &&
					!(promptService.confirm(window,"Warning",
						main.elements.strings.getString("vident.sendVirtual.warning")))) ||
				  (!vid && main.preferences.getBoolPref("warn_nonvirtual") &&
					!(promptService.confirm(window,"Warning",
						main.elements.strings.getString("vident.sendNonvirtual.warning")))) ) {
					main.replacement_functions.GenericSendMessageInProgress = false;
					return;
				}
				if (!vI.storage.storeVIdentityToAllRecipients(msgType)) {
// 					vI.notificationBar.dump("## v_identity: sending aborted\n");
					main.replacement_functions.GenericSendMessageInProgress = false;
					return;
				}
				vI.msgIdentityCloneTools.addReplyToSelf();
			}
			if (vid) main.prepareAccount();
			main.replacement_functions.GenericSendMessageInProgress = false;
// 			vI.notificationBar.dump("## v_identity: original_functions.GenericSendMessage\n");

			// final check if eyerything is nice before we handover to the real sending...
			var virtualIdentityData = document.getElementById("msgIdentity_clone").identityData;

			var currentIdentity = getCurrentIdentity();
            //                          vI.identityData(email, fullName, id, smtp, extras, sideDescription, existingID)
            var currentIdentityData = new vI.identityData(currentIdentity.email, currentIdentity.fullName, null, currentIdentity.smtpServerKey, null, null, null);
			
			vI.notificationBar.dump("\n## vI.identityData GenericSendMessage Final Check\n");
			vI.notificationBar.dump("## vI.identityData currentIdentity: fullName='" + currentIdentityData.fullName + "' email='" + currentIdentityData.email + "' smtp='" + currentIdentityData.smtp.key + "'\n");
			vI.notificationBar.dump("## vI.identityData virtualIdentityData: fullName='" + virtualIdentityData.fullName + "' email='" + virtualIdentityData.email + "' smtp='" + virtualIdentityData.smtp.key + "'\n");

			if	(currentIdentityData.fullName.toLowerCase() == virtualIdentityData.fullName.toLowerCase()	&&
				currentIdentityData.email.toLowerCase() == virtualIdentityData.email.toLowerCase()		&&
				virtualIdentityData.smtp.equal(currentIdentityData.smtp)	) {
					main.original_functions.GenericSendMessage(msgType);
			}
			else {
				if (!(currentIdentityData.fullName.toLowerCase() == virtualIdentityData.fullName.toLowerCase())) vI.notificationBar.dump("\n## vI.identityData failed check for fullName.\n");
				if (!(currentIdentityData.email.toLowerCase() == virtualIdentityData.email.toLowerCase())) vI.notificationBar.dump("\n## vI.identityData failed check for email.\n");
				if (!(virtualIdentityData.smtp.equal(currentIdentityData.smtp))) vI.notificationBar.dump("\n## vI.identityData failed check for SMTP.\n");
				alert(main.elements.strings.getString("vident.genericSendMessage.error"));
				main.Cleanup();
			}
// 			vI.notificationBar.dump("## v_identity: original_functions.GenericSendMessage done\n");
		},
		
		replace_FillIdentityList : function() {
			//~ vI.notificationBar.dump("## v_identity: replace FillIdentityList \n");
			main.original_functions.FillIdentityList = FillIdentityList;
			FillIdentityList = main.replacement_functions.FillIdentityList;
		}
	},

	remove: function() {
		window.removeEventListener('compose-window-reopen', main.reopen, true);
		window.removeEventListener('compose-window-close', main.close, true);
		vI.notificationBar.dump("## v_identity: end. remove Account if there.\n")
		main.Cleanup();
		vI.storage.clean();
	},

	// initialization //
	init: function() {
		window.removeEventListener('load', main.init, false);
		window.removeEventListener('compose-window-init', main.init, true);
		if (main.elements.Area_MsgIdentityHbox) return; // init done before, (?reopen)
		vI.notificationBar.dump("\n## v_identity: init.\n")
		main.unicodeConverter.charset="UTF-8";
		if (!main.adapt_genericSendMessage()) { vI.notificationBar.dump("\n## v_identity: init failed.\n"); return; }
		
		main.adapt_interface();
		gMsgCompose.RegisterStateListener(main.ComposeStateListener);
		document.getElementById("virtualIdentityExtension_tooltipPopupset")
			.addTooltip(document.getElementById("msgIdentity_clone"), false);
		window.addEventListener('compose-window-reopen', main.reopen, true);
		window.addEventListener('compose-window-close', main.close, true);
		
		// append observer to fcc_switch, because it does'n work with real identities (hidden by css)
		document.getElementById("fcc_switch").appendChild(document.getElementById("msgIdentity_clone_observer").cloneNode(false));

        main.AccountManagerObserver.register();
        
		main.initSystemStage1();
		vI.notificationBar.dump("## v_identity: init done.\n\n")
	},
	
	initSystemStage1 : function() {
		vI.notificationBar.dump("## v_identity: initSystemStage1.\n")
		main.gMsgCompose = gMsgCompose;
		document.getElementById("msgIdentity_clone").init();
		vI.statusmenu.init();
	},
	
	initSystemStage2 : function() {
		vI.notificationBar.dump("## v_identity: initSystemStage2.\n")
		vI.msgIdentityCloneTools.initReplyTo();
		vI.storage.init();
		vI.smartIdentity.init();
	},
	
	close : function() {
		main.Cleanup();
		vI.storage.clean();
	},
	
	adapt_interface : function() {
		if (main.elements.strings) return; // only rearrange the interface once
		
		// initialize the pointers to extension elements
		main.elements.init_base()
		
		// rearrange the positions of some elements
		var parent_hbox = main.elements.Obj_MsgIdentity.parentNode;
		var storage_box = document.getElementById("addresses-box");
		var autoReplyToSelfLabel = document.getElementById("autoReplyToSelfLabel");
		
		storage_box.removeChild(autoReplyToSelfLabel);
		parent_hbox.appendChild(autoReplyToSelfLabel);
		storage_box.removeChild(main.elements.Area_MsgIdentityHbox);
		parent_hbox.appendChild(main.elements.Area_MsgIdentityHbox);

		main.elements.Obj_MsgIdentity.setAttribute("hidden", "true");
		main.elements.Obj_MsgIdentity.previousSibling.setAttribute("control", "msgIdentity_clone");
		
		var access_label = parent_hbox.getElementsByAttribute( "control", "msgIdentity" )[0];
		if (access_label) access_label.setAttribute("control", "msgIdentity_clone");
		
		// initialize the pointers to extension elements (initialize those earlier might brake the interface)
		main.elements.init_rest();	
	},
	
	adapt_genericSendMessage : function() {
		if (main.original_functions.GenericSendMessage) return true; // only initialize this once
		vI.notificationBar.dump("## v_identity: adapt GenericSendMessage\n");
		main.original_functions.GenericSendMessage = GenericSendMessage;
		GenericSendMessage = main.replacement_functions.GenericSendMessage;
		return true;
	},
	
	reopen: function() {
		vI.notificationBar.clear();
		vI.notificationBar.clear_dump();
		vI.notificationBar.dump("## v_identity: composeDialog reopened. (msgType " + gMsgCompose.type + ")\n")
		
		// clean all elements
		document.getElementById("msgIdentity_clone").clean();
		vI.smartIdentity.clean();
		vI.notificationBar.dump("## v_identity: everything cleaned.\n")
		
		// now (re)init the elements
		main.initSystemStage1();
		
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
				main.initSystemStage2(); break;
			case msgComposeType.Reply:
			case msgComposeType.ReplyAll:
			case msgComposeType.ReplyToGroup:
			case msgComposeType.ReplyToSender:
			case msgComposeType.ReplyToSenderAndGroup:
			case msgComposeType.ReplyWithTemplate:
			case msgComposeType.ReplyToList:
				gMsgCompose.RegisterStateListener(main.ComposeStateListener);
		}
		vI.notificationBar.dump("## v_identity: reopen done.\n")
	},
	
	tempStorage: { BaseIdentity : null, NewIdentity : null },

	__setSelectedIdentity : function(menuItem) {
		main.elements.Obj_MsgIdentity.selectedItem = menuItem;
		main.elements.Obj_MsgIdentity.setAttribute("label", menuItem.getAttribute("label"));
		main.elements.Obj_MsgIdentity.setAttribute("accountname", menuItem.getAttribute("accountname"));
		main.elements.Obj_MsgIdentity.setAttribute("value", menuItem.getAttribute("value"));
	},

	// sets the values of the dropdown-menu to the ones of the newly created account
	addVirtualIdentityToMsgIdentityMenu : function()
	{
		main.tempStorage.BaseIdentity = main.elements.Obj_MsgIdentity.selectedItem;
		main.tempStorage.NewIdentity = document.createElement("menuitem");
		main.tempStorage.NewIdentity.className = "identity-popup-item";
		
		// set the account name in the choosen menu item
		main.tempStorage.NewIdentity.setAttribute("label", vI.account._account.defaultIdentity.identityName);
		main.tempStorage.NewIdentity.setAttribute("accountname", " - " +  vI.account._account.incomingServer.prettyName);
		main.tempStorage.NewIdentity.setAttribute("accountkey", vI.account._account.key);
		main.tempStorage.NewIdentity.setAttribute("value", vI.account._account.defaultIdentity.key);
		
		main.elements.Obj_MsgIdentityPopup.appendChild(main.tempStorage.NewIdentity);
		main.__setSelectedIdentity(main.tempStorage.NewIdentity);
	},
	
	removeVirtualIdentityFromMsgIdentityMenu : function()
	{
		if (!main.tempStorage.BaseIdentity) return; // don't try to remove Item twice
		try {	// might not exist anymore (window closed), so just try to remove it
			document.getElementById("msgIdentity").firstChild.removeChild(main.tempStorage.NewIdentity);
			main.__setSelectedIdentity(main.tempStorage.BaseIdentity);
		} catch (e) { };
		main.tempStorage.NewIdentity = null;
		main.tempStorage.BaseIdentity = null;
	},

	prepareAccount : function() {
		main.Cleanup(); // just to be sure that nothing is left (maybe last time sending was irregularily stopped)
		vI.account.createAccount();
		main.addVirtualIdentityToMsgIdentityMenu();
	},

	Cleanup : function() {
		main.removeVirtualIdentityFromMsgIdentityMenu();
		vI.account.removeUsedVIAccount();
	},
	
	//  code adapted from http://xulsolutions.blogspot.com/2006/07/creating-uninstall-script-for.html
    AccountManagerObserver : {
        _uninstall : false,
        observe : function(subject, topic, data) {
            if (topic == "am-smtpChanges") {
                vI.notificationBar.dump("## v_identity: smtp changes observed\n");
                var msgIdentity_clone = document.getElementById("msgIdentity_clone");
                document.getAnonymousElementByAttribute(msgIdentity_clone, "class", "smtpServerListHbox").refresh();
            }
            if (topic == "am-acceptChanges") {
                vI.notificationBar.dump("## v_identity: account changes observed\n");
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


main.replacement_functions.replace_FillIdentityList();
window.addEventListener('compose-window-init', main.init, true);

window.addEventListener("unload", function(e) { main.AccountManagerObserver.unregister(); try {vI.statusmenu.removeObserver();} catch (ex) { } }, false);
vI.main = main;
}});