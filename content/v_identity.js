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

Components.utils.import("resource://v_identity/vI_nameSpaceWrapper.js");
virtualIdentityExtension.ns(function() { with (virtualIdentityExtension.LIB) {

let Log = vI.setupLogging("virtualIdentity.main");
Components.utils.import("resource://v_identity/vI_account.js", virtualIdentityExtension);
Components.utils.import("resource://v_identity/vI_prefs.js", virtualIdentityExtension);
Components.utils.import("resource://v_identity/vI_replyToSelf.js", virtualIdentityExtension);
Components.utils.import("resource://v_identity/plugins/signatureSwitch.js", virtualIdentityExtension);

var main = {
	headerParser : Components.classes["@mozilla.org/messenger/headerparser;1"]
				.getService(Components.interfaces.nsIMsgHeaderParser),
	
	unicodeConverter : Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
				.createInstance(Components.interfaces.nsIScriptableUnicodeConverter),
							
	accountManager : Components.classes["@mozilla.org/messenger/account-manager;1"]
			.getService(Components.interfaces.nsIMsgAccountManager),
		

	gMsgCompose : null, // to store the global gMsgCompose after MsgComposeDialog is closed

	// Those variables keep pointers to original functions which might get replaced later
	original_functions : {
		GenericSendMessage : null,
		FillIdentityList : null
	},

	// some pointers to the layout-elements of the extension
	elements : {
		init_base : function() {
			main.elements.Area_MsgIdentityHbox = document.getElementById("virtualIdentityExtension_msgIdentityHbox");
			main.elements.Obj_MsgIdentity = document.getElementById("msgIdentity");
		},
		init_rest : function() {
			main.elements.Obj_MsgIdentityPopup = document.getElementById("msgIdentityPopup");
			main.elements.Obj_vILogo = document.getElementById("virtualIdentityExtension_Logo");
		},
		strings : null
	},

	ComposeStateListener : {
		NotifyComposeBodyReady: function() { 
			Log.debug("NotifyComposeBodyReady");
			main.initSystemStage2();
		},
		NotifyComposeFieldsReady: function() { 
			Log.debug("NotifyComposeFieldsReady");
		},
		ComposeProcessDone: function(aResult) {
			Log.debug("StateListener reports ComposeProcessDone");
			main.Cleanup(); // not really required, parallel handled by main.close
			vI.storage.clean();
		},
		SaveInFolderDone: function(folderURI) { 
			Log.debug("SaveInFolderDone");
			main.Cleanup();
			vI.storage.clean();
		}
	},
	
  // copy/pasted from MsgComposeCommands.js
  queryISupportsArray: function(supportsArray, iid) {
    var result = new Array;
    let count = supportsArray.Count();
    for (let i = 0; i < count; i++)
      result[i] = supportsArray.QueryElementAt(i, iid);
    return result;
  },

	replacement_functions : {
		FillIdentityList: function(menulist) {
			Log.debug("mod. FillIdentityList");
			var accounts = main.queryISupportsArray(main.accountManager.accounts,
                                     Components.interfaces.nsIMsgAccount);

			// Ugly hack to work around bug 41133. :-(
			accounts = accounts.filter(function isNonSuckyAccount(a) { return !!a.incomingServer; });
			function sortAccounts(a, b) {
				if (a.key == main.accountManager.defaultAccount.key)
				return -1;
				if (b.key == main.accountManager.defaultAccount.key)
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
				try {	vI.prefroot.getBoolPref("mail.account." + accounts[i].key + ".vIdentity");
					continue; } catch (e) { };

				var identities = main.queryISupportsArray(accounts[i].identities, Components.interfaces.nsIMsgIdentity);
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
			vI.storage.awOnBlur(vI.storage.focusedElement, window);

			Log.debug("VIdentity_GenericSendMessage");
            
            Log.debug("VIdentity_GenericSendMessage top=" + top);
			
			if (msgType == Components.interfaces.nsIMsgCompDeliverMode.Now)
              vI.addReplyToSelf(window);

			var vid = document.getElementById("virtualIdentityExtension_msgIdentityClone").vid
			var virtualIdentityData = document.getElementById("virtualIdentityExtension_msgIdentityClone").identityData;
			
			let returnValue = vI.vIaccount_prepareSendMsg(vid, msgType, virtualIdentityData,
							main.accountManager.getIdentity(main.elements.Obj_MsgIdentity.value),
							main._getRecipients(), window );
			if (returnValue.update == "abort") {
				main.replacement_functions.GenericSendMessageInProgress = false;
				Log.debug("sending: --------------  aborted  ---------------------------------")
				return;
			}
			else if (returnValue.update == "takeover") {
					var msgIdentityCloneElem = document.getElementById("virtualIdentityExtension_msgIdentityClone");
					msgIdentityCloneElem.selectedMenuItem = msgIdentityCloneElem.addIdentityToCloneMenu(returnValue.storedIdentity);
					main.replacement_functions.GenericSendMessageInProgress = false;
					Log.debug("sending: --------------  aborted  ---------------------------------")
					return;
			}
			
			if (vid) main.addVirtualIdentityToMsgIdentityMenu();
			
			// final check if eyerything is nice before we handover to the real sending...
			if (vI.vIaccount_finalCheck(virtualIdentityData, getCurrentIdentity())) {
				main.replacement_functions.GenericSendMessageInProgress = false;
				main.original_functions.GenericSendMessage(msgType);
			}
			else	main.Cleanup();
			main.replacement_functions.GenericSendMessageInProgress = false;
			// 			Log.debug("original_functions.GenericSendMessage done");
		},
		
		replace_FillIdentityList : function() {
			//~ Log.debug("replace FillIdentityList");
			main.original_functions.FillIdentityList = FillIdentityList;
			FillIdentityList = main.replacement_functions.FillIdentityList;
		}
	},

	remove: function() {
		window.removeEventListener('compose-window-reopen', main.reopen, true);
		window.removeEventListener('compose-window-close', main.close, true);
		Log.debug("end. remove Account if there.")
		main.Cleanup();
		vI.storage.clean();
	},

	_getRecipients : function() {
		var recipients = [];
		for (var row = 1; row <= top.MAX_RECIPIENTS; row ++) {
			var recipientType = awGetPopupElement(row).selectedItem.getAttribute("value");
			if (recipientType == "addr_reply" || recipientType == "addr_followup" || 
				main._recipientIsDoBcc(row) || awGetInputElement(row).value.match(/^\s*$/) ) continue;
			recipients.push( { recipient: awGetInputElement(row).value, recipientType : recipientType } );
		}
		return recipients;
	},
	
	_recipientIsDoBcc : function(row) {
		var recipientType = awGetPopupElement(row).selectedItem.getAttribute("value");
		if (recipientType != "addr_bcc" || !getCurrentIdentity().doBcc) return false

		var doBccArray = gMsgCompose.compFields.splitRecipients(getCurrentIdentity().doBccList, false, {});

		for (var index = 0; index < doBccArray.count; index++ ) {
			if (doBccArray.StringAt(index) == awGetInputElement(row).value) {
				Log.debug("_recipientIsDoBcc: ignoring doBcc field '" +
					doBccArray.StringAt(index));
				return true;
			}
		}		
		return false
	},

	// initialization //
	init: function() {
		window.removeEventListener('load', main.init, false);
		window.removeEventListener('compose-window-init', main.init, true);
		if (main.elements.Area_MsgIdentityHbox) return; // init done before, (?reopen)
		Log.debug("init.")
		main.unicodeConverter.charset="UTF-8";
		if (!main.adapt_genericSendMessage()) { Log.error("init failed."); return; }
		
		main.adapt_interface();
		gMsgCompose.RegisterStateListener(main.ComposeStateListener);
		document.getElementById("virtualIdentityExtension_tooltipPopupset")
			.addTooltip(document.getElementById("virtualIdentityExtension_msgIdentityClone"), false);
		window.addEventListener('compose-window-reopen', main.reopen, true);
		window.addEventListener('compose-window-close', main.close, true);
		
		// append observer to virtualIdentityExtension_fccSwitch, because it does'n work with real identities (hidden by css)
		document.getElementById("virtualIdentityExtension_fccSwitch").appendChild(document.getElementById("virtualIdentityExtension_msgIdentityClone_observer").cloneNode(false));

        main.AccountManagerObserver.register();
        
		main.initSystemStage1();
		Log.debug("init done.")
	},
	
	initSystemStage1 : function() {
		Log.debug("initSystemStage1.")
		main.gMsgCompose = gMsgCompose;
		document.getElementById("virtualIdentityExtension_msgIdentityClone").init();
		vI.statusmenu.init();
		Log.debug("initSystemStage1 done.")
	},
	
	initSystemStage2 : function() {
		Log.debug("initSystemStage2.")
        vI.initReplyTo(window);
		vI.storage.init();
		vI.smartIdentity.init(window);
		Log.debug("initSystemStage2 done.")
	},
	
	close : function() {
		main.Cleanup();
		vI.storage.clean();
	},
	
	adapt_interface : function() {
		if (main.elements.Obj_MsgIdentityPopup) return; // only rearrange the interface once
		
		// initialize the pointers to extension elements
		main.elements.init_base()
		
		// rearrange the positions of some elements
		var parent_hbox = main.elements.Obj_MsgIdentity.parentNode;
		var storage_box = document.getElementById("addresses-box");
		var virtualIdentityExtension_autoReplyToSelfLabel = document.getElementById("virtualIdentityExtension_autoReplyToSelfLabelBox");
		
		storage_box.removeChild(virtualIdentityExtension_autoReplyToSelfLabel);
		parent_hbox.appendChild(virtualIdentityExtension_autoReplyToSelfLabel);
		storage_box.removeChild(main.elements.Area_MsgIdentityHbox);
		parent_hbox.appendChild(main.elements.Area_MsgIdentityHbox);

		main.elements.Obj_MsgIdentity.setAttribute("hidden", "true");
		main.elements.Obj_MsgIdentity.previousSibling.setAttribute("control", "virtualIdentityExtension_msgIdentityClone");
		
		var access_label = parent_hbox.getElementsByAttribute( "control", "msgIdentity" )[0];
		if (access_label) access_label.setAttribute("control", "virtualIdentityExtension_msgIdentityClone");
		
		// initialize the pointers to extension elements (initialize those earlier might brake the interface)
		main.elements.init_rest();	
	},
	
	adapt_genericSendMessage : function() {
		if (main.original_functions.GenericSendMessage) return true; // only initialize this once
		Log.debug("adapt GenericSendMessage");
		main.original_functions.GenericSendMessage = GenericSendMessage;
		GenericSendMessage = main.replacement_functions.GenericSendMessage;
		return true;
	},
	
	reopen: function() {
		vI.clearDebugOutput();
		Log.debug("composeDialog reopened. (msgType " + gMsgCompose.type + ")")
		
		// clean all elements
		document.getElementById("virtualIdentityExtension_msgIdentityClone").clean();
		Log.debug("everything cleaned.")
		
		// now (re)init the elements
		main.initSystemStage1();
		
        vI.vIprefs.dropLocalChanges();

		// stateListener only works in reply-cases
		// so activate stage2 in reply-cases trough StateListener
		// in other cases directly
        // (but StateListener is required for Cleanup, so register)
		var msgComposeType = Components.interfaces.nsIMsgCompType;
		switch (gMsgCompose.type) {
			case msgComposeType.New:
			case msgComposeType.NewsPost:
			case msgComposeType.MailToUrl:
			case msgComposeType.Draft:
			case msgComposeType.Template:
			case msgComposeType.ForwardAsAttachment:
			case msgComposeType.ForwardInline:
				main.initSystemStage2();
			case msgComposeType.Reply:
			case msgComposeType.ReplyAll:
			case msgComposeType.ReplyToGroup:
			case msgComposeType.ReplyToSender:
			case msgComposeType.ReplyToSenderAndGroup:
			case msgComposeType.ReplyWithTemplate:
			case msgComposeType.ReplyToList:
				gMsgCompose.RegisterStateListener(main.ComposeStateListener);
		}
		Log.debug("reopen done.")
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
		main.tempStorage.NewIdentity.setAttribute("label", vI.get_vIaccount().defaultIdentity.identityName);
		main.tempStorage.NewIdentity.setAttribute("accountname", " - " +  vI.get_vIaccount().incomingServer.prettyName);
		main.tempStorage.NewIdentity.setAttribute("accountkey", vI.get_vIaccount().key);
		main.tempStorage.NewIdentity.setAttribute("value", vI.get_vIaccount().defaultIdentity.key);
		
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
		vI.vIaccount_createAccount(document.getElementById("virtualIdentityExtension_msgIdentityClone").identityData,
								 main.accountManager.getIdentity(main.elements.Obj_MsgIdentity.value));
		main.addVirtualIdentityToMsgIdentityMenu();
	},

	Cleanup : function() {
		main.removeVirtualIdentityFromMsgIdentityMenu();
		vI.vIaccount_removeUsedVIAccount();
	},
	
	//  code adapted from http://xulsolutions.blogspot.com/2006/07/creating-uninstall-script-for.html
    AccountManagerObserver : {
        _uninstall : false,
        observe : function(subject, topic, data) {
            if (topic == "am-smtpChanges") {
                Log.debug("smtp changes observed");
                var virtualIdentityExtension_msgIdentityClone = document.getElementById("virtualIdentityExtension_msgIdentityClone");
                document.getAnonymousElementByAttribute(virtualIdentityExtension_msgIdentityClone, "class", "smtpServerListHbox").refresh();
            }
            if (topic == "am-acceptChanges") {
                Log.debug("account changes observed");
                document.getElementById("virtualIdentityExtension_msgIdentityClone").clean();
                document.getElementById("virtualIdentityExtension_msgIdentityClone").init();
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