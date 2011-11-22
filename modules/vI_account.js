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

var EXPORTED_SYMBOLS = ["vIaccount_cleanupSystem", "get_vIaccount",
  "vIaccount_prepareSendMsg", "vIaccount_finalCheck",
  "vIaccount_createAccount", "vIaccount_removeUsedVIAccount" ]

const {classes: Cc, interfaces: Ci, utils: Cu, results : Cr} = Components;

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://v_identity/vI_log.js");
Cu.import("resource://v_identity/vI_identityData.js");
Cu.import("resource://v_identity/vI_rdfDatasource.js");
Cu.import("resource://v_identity/vI_prefs.js");

let Log = setupLogging("virtualIdentity.account");

function vIaccount_prepareSendMsg(vid, msgType, identityData, baseIdentity, recipients) {
	var stringBundle = Services.strings.createBundle("chrome://v_identity/locale/v_identity.properties");
	
	var promptService = Cc["@mozilla.org/embedcomp/prompt-service;1"]
		.getService(Ci.nsIPromptService);
	
	var AccountManager = Cc["@mozilla.org/messenger/account-manager;1"]
			.getService(Ci.nsIMsgAccountManager);
			
	Log.debug("\nprepareSendMsg " + msgType + " " + Ci.nsIMsgCompDeliverMode.Now + "\n");
	
	returnValue = {};
	
	if (msgType == Ci.nsIMsgCompDeliverMode.Now) {
		if ( (vid && vIprefs.get("warn_virtual") &&
			!(promptService.confirm(window,"Warning",
				stringBundle.GetStringFromName("vident.sendVirtual.warning")))) ||
			(!vid && vIprefs.get("warn_nonvirtual") &&
			!(promptService.confirm(window,"Warning",
				stringBundle.GetStringFromName("vident.sendNonvirtual.warning")))) ) {
			return { update : "abort", storedIdentity : null }; // completely abort sending
		}
        if (vIprefs.get("storage") && vIprefs.get("storage_store")) {
			var localeDatasourceAccess = new rdfDatasourceAccess();
			var returnValue = localeDatasourceAccess.storeVIdentityToAllRecipients(identityData, recipients)
			if ( returnValue.update == "abort" || returnValue.update == "takeover" ) {
				Log.debug("prepareSendMsg: sending aborted\n");
				return returnValue;
			}
		}
		else Log.debug("prepareSendMsg: storage deactivated\n");
	}
	if (vid) {
		account.removeUsedVIAccount();
		account.createAccount(identityData, baseIdentity);
	}
	return { update : "accept", storedIdentity : null };
};

function vIaccount_finalCheck(virtualIdentityData, currentIdentity) {
	var stringBundle = Services.strings.createBundle("chrome://v_identity/locale/v_identity.properties");

	// identityData(email, fullName, id, smtp, extras, sideDescription, existingID)
	var currentIdentityData = new identityData(currentIdentity.email, currentIdentity.fullName, null, currentIdentity.smtpServerKey, null, null, null);
	
	Log.debug("\nSendMessage Final Check\n");
	Log.debug("currentIdentity: fullName='" + currentIdentityData.fullName + "' email='" + currentIdentityData.email + "' smtp='" + currentIdentityData.smtp.key + "'\n");
	Log.debug("virtualIdentityData: fullName='" + virtualIdentityData.fullName + "' email='" + virtualIdentityData.email + "' smtp='" + virtualIdentityData.smtp.key + "'\n");

	if	(currentIdentityData.fullName.toLowerCase() == virtualIdentityData.fullName.toLowerCase()	&&
		currentIdentityData.email.toLowerCase() == virtualIdentityData.email.toLowerCase()		&&
		virtualIdentityData.smtp.equal(currentIdentityData.smtp)	) {
			return true
	}
	else {
		if (!(currentIdentityData.fullName.toLowerCase() == virtualIdentityData.fullName.toLowerCase())) Log.error("\nfailed check for fullName.\n");
		if (!(currentIdentityData.email.toLowerCase() == virtualIdentityData.email.toLowerCase())) Log.error("\nfailed check for email.\n");
		if (!(virtualIdentityData.smtp.equal(currentIdentityData.smtp))) Log.error("\nfailed check for SMTP.\n");
		alert(stringBundle.getStringFromName("vident.genericSendMessage.error"));
		return false
	}	
};

var account = {
	_account : null,
	
	_baseIdentity : null,

	_AccountManager : Cc["@mozilla.org/messenger/account-manager;1"]
		.getService(Ci.nsIMsgAccountManager),
	
	_unicodeConverter : Cc["@mozilla.org/intl/scriptableunicodeconverter"]
			.createInstance(Ci.nsIScriptableUnicodeConverter),
	
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
		if (vIprefs.get("copySMIMESettings")) {
			// SMIME settings
			Log.debug("copy S/MIME settings\n")
			account._copyUnicharAttribute("signing_cert_name");
			account._copyUnicharAttribute("encryption_cert_name");
			account._copyIntAttribute("encryptionpolicy");
		}
/*		seems not required, encryption happens before Virtual Identity account is created
		if (vIprefs.get("copyEnigmailSettings")) {
			// pgp/enigmail settings
			Log.debug("copy PGP settings\n")
			account._copyBoolAttribute("pgpSignEncrypted");
			account._copyBoolAttribute("pgpSignPlain");
			account._copyBoolAttribute("enablePgp");
			account._copyIntAttribute("pgpKeyMode");
			account._copyCharAttribute("pgpkeyId");
			account._copyIntAttribute("openPgpHeaderMode");
			account._copyCharAttribute("openPgpUrlName");
		
			account._copyIntAttribute("defaultEncryptionPolicy");
		}	*/
		if (vIprefs.get("copyAttachVCardSettings")) {
			// attach vcard
			Log.debug("copy VCard settings\n")
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
			maildir.QueryInterface(Ci.nsIFile);
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
		Log.debug("checking for leftover VirtualIdentity directories ")

		var file = Cc["@mozilla.org/file/directory_service;1"]
		.getService(Ci.nsIProperties)
			.get("ProfD", Ci.nsIFile);
		
		var fileEnumerator = file.directoryEntries
		while (fileEnumerator.hasMoreElements()) {
			var dir = fileEnumerator.getNext()
			dir.QueryInterface(Ci.nsIFile);
			if (dir.path.match(new RegExp("[/\\\\]Mail$","i"))) { // match Windows and Linux/Mac separators
				var dirEnumerator = dir.directoryEntries
				while (dirEnumerator.hasMoreElements()) {
					var maildir = dirEnumerator.getNext()
					maildir.QueryInterface(Ci.nsIFile);
					// match Windows and Linux/Mac separators
					if (maildir.path.match(new RegExp("[/\\\\]virtualIdentity.*$","i"))) {
						// should be empty, VirtualIdentity never uses those directories
						if (account.__dirEmpty(maildir)) {
							try {maildir.remove(true)} catch(e) { }
							Log.debug("x");
						}
						else Log.debug(".");
						
					}
				}
			}
		}
		Log.debug(" - done\n")
	},
	
	cleanupSystem : function() {
		Log.debug("checking for leftover VirtualIdentity accounts ")
		for (var i=0; i < account._AccountManager.accounts.Count(); i++) {
			var checkAccount = account._AccountManager.accounts.QueryElementAt(i, Ci.nsIMsgAccount);
			if (account.__isVIdentityAccount(checkAccount)) {
				Log.debug(".")
				account.__removeAccount(checkAccount);
			}
		}
		Log.debug(" - done\n")
		account.__cleanupDirectories();
	},
	
	__isVIdentityAccount : function(checkAccount) {
		// check for new (post0.5.0) accounts,
		try {	prefroot.getBoolPref("mail.account." + checkAccount.key + ".vIdentity");
			return true;
		} catch (e) { };
		// check for old (pre 0.5.0) accounts
		if (checkAccount.incomingServer && checkAccount.incomingServer.hostName == "virtualIdentity") return true;
		return false;
	},
	
	__removeAccount : function(checkAccount) {
		Log.debug("__removeAccount\n")
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
		Log.debug("removing account " + key + ".\n")
		// remove the account
		account._AccountManager.removeAccount(checkAccount);
		// remove the additional tagging-pref
		try { prefroot.clearUserPref("mail.account." + key + ".vIdentity");	}
		catch (e) { };
	},
	
	removeUsedVIAccount : function() {
		var mailWindow = Cc["@mozilla.org/appshell/window-mediator;1"].getService()
			.QueryInterface(Ci.nsIWindowMediator)
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
		prefroot.setBoolPref("mail.account." + account._account.key + ".vIdentity", true)
		account._account.addIdentity(account._AccountManager.createIdentity());
		// the new account uses the same incomingServer than the base one,
		// it's especially required for NNTP cause incomingServer is used for sending newsposts.
		// by pointing to the same incomingServer stored passwords can be reused
		// the incomingServer has to be replaced before the account is removed, else it get removed ether
		var servers = account._AccountManager.GetServersForIdentity(baseIdentity);
		var server = servers.QueryElementAt(0, Ci.nsIMsgIncomingServer);
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
		if (account._account.defaultIdentity.smtpServerKey == NO_SMTP_TAG)
			account._account.defaultIdentity.smtpServerKey = baseIdentity.smtpServerKey;

		Log.debug("Stored virtualIdentity (name "
			+ account._account.defaultIdentity.fullName + " email "
			+ account._account.defaultIdentity.email + " smtp "
			+ account._account.defaultIdentity.smtpServerKey +")\n");
	},
	
	_setupFcc : function()
	{
      if (vIprefs.get("doFcc")) {
          switch (vIprefs.get("fccFolderPickerMode"))
          {
              case "2"  :
              Log.debug ("preparing Fcc --- use Settings of Default Account\n");
              account._account.defaultIdentity.doFcc = account._AccountManager.defaultAccount.defaultIdentity.doFcc;
              account._account.defaultIdentity.fccFolder = account._AccountManager.defaultAccount.defaultIdentity.fccFolder;
              account._account.defaultIdentity.fccFolderPickerMode = account._AccountManager.defaultAccount.defaultIdentity.fccFolderPickerMode;
              account._account.defaultIdentity.fccReplyFollowsParent = account._AccountManager.defaultAccount.defaultIdentity.fccReplyFollowsParent;
              break;
              case "3"  :
              Log.debug ("preparing Fcc --- use Settings of Modified Account\n");
              account._account.defaultIdentity.doFcc = account._baseIdentity.doFcc;
              account._account.defaultIdentity.fccFolder = account._baseIdentity.fccFolder;
              account._account.defaultIdentity.fccFolderPickerMode = account._baseIdentity.fccFolderPickerMode;
              account._account.defaultIdentity.fccReplyFollowsParent = account._baseIdentity.fccReplyFollowsParent;
              break;
              default  :
              Log.debug ("preparing Fcc --- use Virtual Identity Settings\n");
              account._account.defaultIdentity.doFcc
                  = vIprefs.get("doFcc");
              account._account.defaultIdentity.fccFolder
                  = account._unicodeConverter.ConvertToUnicode(vIprefs.get("fccFolder"));
              account._account.defaultIdentity.fccFolderPickerMode
                  = vIprefs.get("fccFolderPickerMode");
              account._account.defaultIdentity.fccReplyFollowsParent = vIprefs.get("fccReplyFollowsParent");

              break;
          }
      }
      else {
          dump ("dont performing Fcc\n");
          account._account.defaultIdentity.doFcc = false;
      }
      Log.debug("Stored (doFcc " + account._account.defaultIdentity.doFcc + " fccFolder " +
          account._account.defaultIdentity.fccFolder + " fccFolderPickerMode " +
          account._account.defaultIdentity.fccFolderPickerMode + "(" +
          vIprefs.get("fccFolderPickerMode") + "))\n");
	},
	
	_setupDraft : function()	{
		switch (vIprefs.get("draftFolderPickerMode"))
		{
		    case "2"  :
			Log.debug ("preparing Draft --- use Settings of Default Account\n");
			account._account.defaultIdentity.draftFolder = account._AccountManager.defaultAccount.defaultIdentity.draftFolder;
			account._account.defaultIdentity.draftsFolderPickerMode = account._AccountManager.defaultAccount.defaultIdentity.draftsFolderPickerMode;
			break;
		    case "3"  :
			Log.debug ("preparing Draft --- use Settings of Modified Account\n");
			account._account.defaultIdentity.draftFolder = account._baseIdentity.draftFolder;
			account._account.defaultIdentity.draftsFolderPickerMode = account._baseIdentity.draftsFolderPickerMode;
			break;
		    default  :
			Log.debug ("preparing Draft --- use Virtual Identity Settings\n");
			account._account.defaultIdentity.draftFolder
				= account._unicodeConverter.ConvertToUnicode(vIprefs.get("draftFolder"));
			account._account.defaultIdentity.draftsFolderPickerMode
				= vIprefs.get("draftFolderPickerMode");
			break;
		}
		Log.debug("Stored (draftFolder " +
			account._account.defaultIdentity.draftFolder + " draftsFolderPickerMode " +
			account._account.defaultIdentity.draftsFolderPickerMode + "(" +
			vIprefs.get("draftFolderPickerMode") + "))\n");
	},
	
	_setupTemplates : function()	{
		switch (vIprefs.get("stationeryFolderPickerMode"))
		{
		    case "2"  :
			Log.debug ("preparing Templates --- use Settings of Default Account\n");
			account._account.defaultIdentity.stationeryFolder = account._AccountManager.defaultAccount.defaultIdentity.stationeryFolder;
			account._account.defaultIdentity.tmplFolderPickerMode = account._AccountManager.defaultAccount.defaultIdentity.tmplFolderPickerMode;
			break;
		    case "3"  :
			Log.debug ("preparing Templates --- use Settings of Modified Account\n");
			account._account.defaultIdentity.stationeryFolder = account._baseIdentity.stationeryFolder;
			account._account.defaultIdentity.tmplFolderPickerMode = account._baseIdentity.tmplFolderPickerMode;
			break;
		    default  :
			Log.debug ("preparing Templates --- use Virtual Identity Settings\n");
			account._account.defaultIdentity.stationeryFolder
				= account._unicodeConverter.ConvertToUnicode(vIprefs.get("stationeryFolder"));
			account._account.defaultIdentity.tmplFolderPickerMode
				= vIprefs.get("stationeryFolderPickerMode");
			break;
		}
		Log.debug("Stored (stationeryFolder " +
			account._account.defaultIdentity.stationeryFolder + " tmplFolderPickerMode " +
			account._account.defaultIdentity.tmplFolderPickerMode + "(" +
			vIprefs.get("stationeryFolderPickerMode") + "))\n");
	}
}

function get_vIaccount() {
  return account._account;
};
vIaccount_cleanupSystem = account.cleanupSystem;
vIaccount_createAccount = account.createAccount;
vIaccount_removeUsedVIAccount = account.removeUsedVIAccount;
