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

/* this is now used as a module - there is no required reference to any other interface-elements in this code */

virtualIdentityExtension.ns(function() { with (virtualIdentityExtension.LIB) {
function prepareSendMsg(vid, msgType, identityData, baseIdentity, recipients) {
	var stringBundle = Services.strings.createBundle("chrome://v_identity/locale/v_identity.properties");
	
	var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
		.getService(Components.interfaces.nsIPromptService);
	
	var prefs = Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefService)
			.getBranch("extensions.virtualIdentity.");
	
	var AccountManager = Components.classes["@mozilla.org/messenger/account-manager;1"]
			.getService(Components.interfaces.nsIMsgAccountManager);
			
	if (vI.notificationBar) vI.notificationBar.dump("\n## prepareSendMsg " + msgType + " " + Components.interfaces.nsIMsgCompDeliverMode.Now + "\n");
	
	returnValue = {};
	
	if (msgType == Components.interfaces.nsIMsgCompDeliverMode.Now) {
		if ( (vid && prefs.getBoolPref("warn_virtual") &&
			!(promptService.confirm(window,"Warning",
				stringBundle.GetStringFromName("vident.sendVirtual.warning")))) ||
			(!vid && prefs.getBoolPref("warn_nonvirtual") &&
			!(promptService.confirm(window,"Warning",
				stringBundle.GetStringFromName("vident.sendNonvirtual.warning")))) ) {
			return { update : "abort", storedIdentity : null }; // completely abort sending
		}
		if (prefs.getBoolPref("storage") &&
				(!vI.statusmenu || vI.statusmenu.objStorageSaveMenuItem.getAttribute("checked") == "true")) {
			var localeDatasourceAccess = new vI.rdfDatasourceAccess();
			var returnValue = localeDatasourceAccess.storeVIdentityToAllRecipients(identityData, recipients)
			if ( returnValue.update == "abort" || returnValue.update == "takeover" ) {
				if (vI.notificationBar) vI.notificationBar.dump("## prepareSendMsg: sending aborted\n");
				return returnValue;
			}
		}
		else if (vI.notificationBar) vI.notificationBar.dump("## prepareSendMsg: storage deactivated\n");
	}
	if (vid) {
		vI.account.removeUsedVIAccount();
		vI.account.createAccount(identityData, baseIdentity);
	}
	return { update : "accept", storedIdentity : null };
};

function finalCheck(virtualIdentityData, currentIdentity) {
	var stringBundle = Services.strings.createBundle("chrome://v_identity/locale/v_identity.properties");

	// vI.identityData(email, fullName, id, smtp, extras, sideDescription, existingID)
	var currentIdentityData = new vI.identityData(currentIdentity.email, currentIdentity.fullName, null, currentIdentity.smtpServerKey, null, null, null);
	
	if (vI.notificationBar) vI.notificationBar.dump("\n## vI.identityData SendMessage Final Check\n");
	if (vI.notificationBar) vI.notificationBar.dump("## vI.identityData currentIdentity: fullName='" + currentIdentityData.fullName + "' email='" + currentIdentityData.email + "' smtp='" + currentIdentityData.smtp.key + "'\n");
	if (vI.notificationBar) vI.notificationBar.dump("## vI.identityData virtualIdentityData: fullName='" + virtualIdentityData.fullName + "' email='" + virtualIdentityData.email + "' smtp='" + virtualIdentityData.smtp.key + "'\n");

	if	(currentIdentityData.fullName.toLowerCase() == virtualIdentityData.fullName.toLowerCase()	&&
		currentIdentityData.email.toLowerCase() == virtualIdentityData.email.toLowerCase()		&&
		virtualIdentityData.smtp.equal(currentIdentityData.smtp)	) {
			return true
	}
	else {
		if (!(currentIdentityData.fullName.toLowerCase() == virtualIdentityData.fullName.toLowerCase())) vI.notificationBar.dump("\n## vI.identityData failed check for fullName.\n");
		if (!(currentIdentityData.email.toLowerCase() == virtualIdentityData.email.toLowerCase())) vI.notificationBar.dump("\n## vI.identityData failed check for email.\n");
		if (!(virtualIdentityData.smtp.equal(currentIdentityData.smtp))) vI.notificationBar.dump("\n## vI.identityData failed check for SMTP.\n");
		alert(stringBundle.getStringFromName("vident.genericSendMessage.error"));
		return false
	}	
};

var account = {
	_account : null,
	
	_baseIdentity : null,

	_AccountManager : Components.classes["@mozilla.org/messenger/account-manager;1"]
		.getService(Components.interfaces.nsIMsgAccountManager),
	
	_prefroot : Components.classes["@mozilla.org/preferences-service;1"]
		.getService(Components.interfaces.nsIPrefService)
		.getBranch(null),

	_pref : Components.classes["@mozilla.org/preferences-service;1"]
		.getService(Components.interfaces.nsIPrefService)
		.getBranch("extensions.virtualIdentity."),
	
	_unicodeConverter : Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
			.createInstance(Components.interfaces.nsIScriptableUnicodeConverter),
	
	_copyBoolAttribute : function(name) {
		account._account.defaultIdentity.setBoolAttribute(name,
				account._baseIdentity.getBoolAttribute(name));
	},
	
	_copyIntAttribute : function(name) {
		account._account.defaultIdentity.setIntAttribute(name,
				account._baseIdentity.getIntAttribute(name));
	},

	_copyCharAttribute : function(name) {
		account._account.defaultIdentity.setCharAttribute(name,
				account._baseIdentity.getCharAttribute(name));
	},

	_copyUnicharAttribute : function(name) {
		account._account.defaultIdentity.setUnicharAttribute(name,
				account._baseIdentity.getUnicharAttribute(name));
	},

	_copyPreferences : function() {
		if (account._pref.getBoolPref("copySMIMESettings")) {
			// SMIME settings
			vI.notificationBar.dump("## account: copy S/MIME settings\n")
			account._copyUnicharAttribute("signing_cert_name");
			account._copyUnicharAttribute("encryption_cert_name");
			account._copyIntAttribute("encryptionpolicy");
		}
/*		seems not required, encryption happens before Virtual Identity account is created
		if (account._pref.getBoolPref("copyEnigmailSettings")) {
			// pgp/enigmail settings
			vI.notificationBar.dump("## account: copy PGP settings\n")
			account._copyBoolAttribute("pgpSignEncrypted");
			account._copyBoolAttribute("pgpSignPlain");
			account._copyBoolAttribute("enablePgp");
			account._copyIntAttribute("pgpKeyMode");
			account._copyCharAttribute("pgpkeyId");
			account._copyIntAttribute("openPgpHeaderMode");
			account._copyCharAttribute("openPgpUrlName");
		
			account._copyIntAttribute("defaultEncryptionPolicy");
		}	*/
		if (account._pref.getBoolPref("copyAttachVCardSettings")) {
			// attach vcard
			vI.notificationBar.dump("## account: copy VCard settings\n")
			account._copyBoolAttribute("attachVCard");
			account._copyCharAttribute("escapedVCard");
		}
	},
	
	// checks if directory is empty, not really used
	// ignores files ending with *.msf, else reports if a non-zero file is found.
	__dirEmpty : function(directory) {
		var dirEnumerator = directory.directoryEntries;
		while (dirEnumerator.hasMoreElements()) {
			var maildir = dirEnumerator.getNext();
			maildir.QueryInterface(Components.interfaces.nsIFile);
			// recurse into all subdirectories
			if (maildir.isDirectory() &&
				!account.__dirEmpty(maildir)) return false;
			// ignore files with ending "*.msf"
			if (!maildir.path.match(new RegExp(".*\.msf$","i")) &&
				maildir.fileSize != 0) return false;
		}
		return true;
	},

	__cleanupDirectories : function() {
		vI.notificationBar.dump("## account: checking for leftover VirtualIdentity directories ")

		var file = Components.classes["@mozilla.org/file/directory_service;1"]
		.getService(Components.interfaces.nsIProperties)
			.get("ProfD", Components.interfaces.nsIFile);
		
		var fileEnumerator = file.directoryEntries
		while (fileEnumerator.hasMoreElements()) {
			var dir = fileEnumerator.getNext()
			dir.QueryInterface(Components.interfaces.nsIFile);
			if (dir.path.match(new RegExp("[/\\\\]Mail$","i"))) { // match Windows and Linux/Mac separators
				var dirEnumerator = dir.directoryEntries
				while (dirEnumerator.hasMoreElements()) {
					var maildir = dirEnumerator.getNext()
					maildir.QueryInterface(Components.interfaces.nsIFile);
					// match Windows and Linux/Mac separators
					if (maildir.path.match(new RegExp("[/\\\\]virtualIdentity.*$","i"))) {
						// should be empty, VirtualIdentity never uses those directories
						if (account.__dirEmpty(maildir)) {
							try {maildir.remove(true)} catch(e) { }
							vI.notificationBar.dump("x");
						}
						else vI.notificationBar.dump(".");
						
					}
				}
			}
		}
		vI.notificationBar.dump(" - done\n")
	},
	
	cleanupSystem : function() {
		vI.notificationBar.dump("## account: checking for leftover VirtualIdentity accounts ")
		for (var i=0; i < account._AccountManager.accounts.Count(); i++) {
			var checkAccount = account._AccountManager.accounts.QueryElementAt(i, Components.interfaces.nsIMsgAccount);
			if (account.__isVIdentityAccount(checkAccount)) {
				vI.notificationBar.dump(".")
				account.__removeAccount(checkAccount);
			}
		}
		vI.notificationBar.dump(" - done\n")
		account.__cleanupDirectories();
	},
	
	__isVIdentityAccount : function(checkAccount) {
		// check for new (post0.5.0) accounts,
		try {	account._prefroot.getBoolPref("mail.account." + checkAccount.key + ".vIdentity");
			return true;
		} catch (e) { };
		// check for old (pre 0.5.0) accounts
		if (checkAccount.incomingServer && checkAccount.incomingServer.hostName == "virtualIdentity") return true;
		return false;
	},
	
	__removeAccount : function(checkAccount) {
		vI.notificationBar.dump("## account: __removeAccount\n")
		// in new (post 0.5.0) Virtual Identity accounts the incomingServer of the account
		// points to an incoming server of a different account. Cause the internal
		// removeAccount function tries to removes the incomingServer ether, create
		// a real one before calling this function.
		if (!checkAccount.incomingServer || checkAccount.incomingServer.hostName != "virtualIdentity") {
			// if not some of the 'old' accounts
			checkAccount.incomingServer = account._AccountManager.
				createIncomingServer("toRemove","virtualIdentity","pop3");
		}

		// remove the rootFolder of the account
		try { checkAccount.incomingServer.rootFolder.Delete(); }
		catch (e) { };
		
		var key = checkAccount.key;
		vI.notificationBar.dump("## account: removing account " + key + ".\n")
		// remove the account
		account._AccountManager.removeAccount(checkAccount);
		// remove the additional tagging-pref
		try { account._prefroot.clearUserPref("mail.account." + key + ".vIdentity");	}
		catch (e) { };
	},
	
	removeUsedVIAccount : function() {
		var mailWindow = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService()
			.QueryInterface(Components.interfaces.nsIWindowMediator)
			.getMostRecentWindow("mail:3pane");
		if (mailWindow) {				// it's not sure that we have an open 3-pane-window
			var selectedFolder = (mailWindow.gFolderTreeView)?mailWindow.gFolderTreeView.getSelectedFolders()[0]:null;
			var selectedMessages = (mailWindow.gFolderDisplay)?mailWindow.gFolderDisplay.selectedMessages:null;
		}
		if (account._account) {
			account.__removeAccount(account._account);
			account._account = null;
		}
		try {
		if (selectedFolder) mailWindow.gFolderTreeView.selectFolder(selectedFolder);
		if (selectedMessages) mailWindow.gFolderDisplay.selectMessages(selectedMessages, false, false);
		} catch (e) { };
	},
	
	createAccount : function(identityData, baseIdentity)
	{
		if (account._account) {  // if the Account is still created, then leave all like it is
			alert("account still created, shouldn't happen");
			return;
		}
		account._baseIdentity = baseIdentity;
		/*
		// the easiest way would be to get all requiered Attributes might be to duplicate the default account like this
		var recentAccount = account._AccountManager.getAccount(vI.main.elements.Obj_MsgIdentity.selectedItem.getAttribute("accountkey"));
		vI.main.VIdent_Account = account._AccountManager.duplicateAccount(recentAccount);
		// but this ends up in the following exception:
		// "Component returned failure code: 0x80004001 (NS_ERROR_NOT_IMPLEMENTED) [nsIMsg_AccountManager.duplicateAccount]"
		// so I have to do this by hand ;(
		*/
		
		account._account = account._AccountManager.createAccount();
		account._prefroot.setBoolPref("mail.account." + account._account.key + ".vIdentity", true)
		account._account.addIdentity(account._AccountManager.createIdentity());
		// the new account uses the same incomingServer than the base one,
		// it's especially required for NNTP cause incomingServer is used for sending newsposts.
		// by pointing to the same incomingServer stored passwords can be reused
		// the incomingServer has to be replaced before the account is removed, else it get removed ether
		var servers = account._AccountManager.GetServersForIdentity(baseIdentity);
		var server = servers.QueryElementAt(0, Components.interfaces.nsIMsgIncomingServer);
		// we mark the server as invalid so that the account manager won't
		// tell RDF about the new server - we don't need this server for long
		// but we should restore it, because it's actually the same server as the one of the base identity
		server.valid = false;
		account._account.incomingServer = server;
		server.valid = true;
		account._copyIdentityData(identityData, baseIdentity);
		account._copyPreferences();
		account._unicodeConverter.charset = "UTF-8";
		account._setupFcc();
		account._setupDraft();
		account._setupTemplates();
	},
	
	_copyIdentityData : function(identityData, baseIdentity) {
		account._account.defaultIdentity.setCharAttribute("useremail", identityData.email);
		account._account.defaultIdentity.setUnicharAttribute("fullName", identityData.fullName);
		
		account._account.defaultIdentity.smtpServerKey = identityData.smtp.keyNice; // key with "" for vI.DEFAULT_SMTP_TAG
		if (account._account.defaultIdentity.smtpServerKey == virtualIdentityExtension.NO_SMTP_TAG)
			account._account.defaultIdentity.smtpServerKey = baseIdentity.smtpServerKey;

		vI.notificationBar.dump("## account: Stored virtualIdentity (name "
			+ account._account.defaultIdentity.fullName + " email "
			+ account._account.defaultIdentity.email + " smtp "
			+ account._account.defaultIdentity.smtpServerKey +")\n");
	},
	
	_setupFcc : function()
	{
		// fcc_switch is only available in modified ComposeDialog.
		// XXXXX get rid of this Elem reference
		var doFcc = true;
		try { doFcc = document.getElementById("fcc_switch").getAttribute("checked") } catch(e) { }
		if (doFcc) {
			switch (account._pref.getCharPref("fccFolderPickerMode"))
			{
			    case "2"  :
				vI.notificationBar.dump ("## account: preparing Fcc --- use Settings of Default Account\n");
				account._account.defaultIdentity.doFcc = account._AccountManager.defaultAccount.defaultIdentity.doFcc;
				account._account.defaultIdentity.fccFolder = account._AccountManager.defaultAccount.defaultIdentity.fccFolder;
				account._account.defaultIdentity.fccFolderPickerMode = account._AccountManager.defaultAccount.defaultIdentity.fccFolderPickerMode;
				account._account.defaultIdentity.fccReplyFollowsParent = account._AccountManager.defaultAccount.defaultIdentity.fccReplyFollowsParent;
				break;
			    case "3"  :
				vI.notificationBar.dump ("## account: preparing Fcc --- use Settings of Modified Account\n");
				account._account.defaultIdentity.doFcc = account._baseIdentity.doFcc;
				account._account.defaultIdentity.fccFolder = account._baseIdentity.fccFolder;
				account._account.defaultIdentity.fccFolderPickerMode = account._baseIdentity.fccFolderPickerMode;
				account._account.defaultIdentity.fccReplyFollowsParent = account._baseIdentity.fccReplyFollowsParent;
				break;
			    default  :
				vI.notificationBar.dump ("## account: preparing Fcc --- use Virtual Identity Settings\n");
				account._account.defaultIdentity.doFcc
					= account._pref.getBoolPref("doFcc");
				account._account.defaultIdentity.fccFolder
					= account._unicodeConverter.ConvertToUnicode(account._pref.getCharPref("fccFolder"));
				account._account.defaultIdentity.fccFolderPickerMode
					= account._pref.getCharPref("fccFolderPickerMode");
				account._account.defaultIdentity.fccReplyFollowsParent = account._pref.getBoolPref("fccReplyFollowsParent");

				break;
			}
		}
		else {
			dump ("## account: dont performing Fcc\n");
			account._account.defaultIdentity.doFcc = false;
		}
		vI.notificationBar.dump("## account: Stored (doFcc " + account._account.defaultIdentity.doFcc + " fccFolder " +
			account._account.defaultIdentity.fccFolder + " fccFolderPickerMode " +
			account._account.defaultIdentity.fccFolderPickerMode + "(" +
			account._pref.getCharPref("fccFolderPickerMode") + "))\n");
	},
	
	_setupDraft : function()	{
		switch (account._pref.getCharPref("draftFolderPickerMode"))
		{
		    case "2"  :
			vI.notificationBar.dump ("## account: preparing Draft --- use Settings of Default Account\n");
			account._account.defaultIdentity.draftFolder = account._AccountManager.defaultAccount.defaultIdentity.draftFolder;
			account._account.defaultIdentity.draftsFolderPickerMode = account._AccountManager.defaultAccount.defaultIdentity.draftsFolderPickerMode;
			break;
		    case "3"  :
			vI.notificationBar.dump ("## account: preparing Draft --- use Settings of Modified Account\n");
			account._account.defaultIdentity.draftFolder = account._baseIdentity.draftFolder;
			account._account.defaultIdentity.draftsFolderPickerMode = account._baseIdentity.draftsFolderPickerMode;
			break;
		    default  :
			vI.notificationBar.dump ("## account: preparing Draft --- use Virtual Identity Settings\n");
			account._account.defaultIdentity.draftFolder
				= account._unicodeConverter.ConvertToUnicode(account._pref.getCharPref("draftFolder"));
			account._account.defaultIdentity.draftsFolderPickerMode
				= account._pref.getCharPref("draftFolderPickerMode");
			break;
		}
		vI.notificationBar.dump("## account: Stored (draftFolder " +
			account._account.defaultIdentity.draftFolder + " draftsFolderPickerMode " +
			account._account.defaultIdentity.draftsFolderPickerMode + "(" +
			account._pref.getCharPref("draftFolderPickerMode") + "))\n");
	},
	
	_setupTemplates : function()	{
		switch (account._pref.getCharPref("stationeryFolderPickerMode"))
		{
		    case "2"  :
			vI.notificationBar.dump ("## account: preparing Templates --- use Settings of Default Account\n");
			account._account.defaultIdentity.stationeryFolder = account._AccountManager.defaultAccount.defaultIdentity.stationeryFolder;
			account._account.defaultIdentity.tmplFolderPickerMode = account._AccountManager.defaultAccount.defaultIdentity.tmplFolderPickerMode;
			break;
		    case "3"  :
			vI.notificationBar.dump ("## account: preparing Templates --- use Settings of Modified Account\n");
			account._account.defaultIdentity.stationeryFolder = account._baseIdentity.stationeryFolder;
			account._account.defaultIdentity.tmplFolderPickerMode = account._baseIdentity.tmplFolderPickerMode;
			break;
		    default  :
			vI.notificationBar.dump ("## account: preparing Templates --- use Virtual Identity Settings\n");
			account._account.defaultIdentity.stationeryFolder
				= account._unicodeConverter.ConvertToUnicode(account._pref.getCharPref("stationeryFolder"));
			account._account.defaultIdentity.tmplFolderPickerMode
				= account._pref.getCharPref("stationeryFolderPickerMode");
			break;
		}
		vI.notificationBar.dump("## account: Stored (stationeryFolder " +
			account._account.defaultIdentity.stationeryFolder + " tmplFolderPickerMode " +
			account._account.defaultIdentity.tmplFolderPickerMode + "(" +
			account._pref.getCharPref("stationeryFolderPickerMode") + "))\n");
	}
}
vI.account = account;
vI.prepareSendMsg = prepareSendMsg;
vI.finalCheck = finalCheck;
}});