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

var vI_account = {
	account : null,
	
	AccountManager : Components.classes["@mozilla.org/messenger/account-manager;1"]
		.getService(Components.interfaces.nsIMsgAccountManager),

	
	prefroot : Components.classes["@mozilla.org/preferences-service;1"]
		.getService(Components.interfaces.nsIPrefService)
		.getBranch(null),

	_getBaseIdentity : function () {
		return gAccountManager.getIdentity(vI.elements.Obj_MsgIdentity.value);
	},

	_copyBoolAttribute : function(name) {
		vI_account.account.defaultIdentity.setBoolAttribute(name,
				vI_account._getBaseIdentity().getBoolAttribute(name));
	},
	
	_copyIntAttribute : function(name) {
		vI_account.account.defaultIdentity.setIntAttribute(name,
				vI_account._getBaseIdentity().getIntAttribute(name));
	},

	_copyCharAttribute : function(name) {
		vI_account.account.defaultIdentity.setCharAttribute(name,
				vI_account._getBaseIdentity().getCharAttribute(name));
	},

	_copyUnicharAttribute : function(name) {
		vI_account.account.defaultIdentity.setUnicharAttribute(name,
				vI_account._getBaseIdentity().getUnicharAttribute(name));
	},

	copyPreferences : function() {
		if (vI.preferences.getBoolPref("copySMIMESettings")) {
			// SMIME settings
			vI_notificationBar.dump("## vI_account: copy S/MIME settings\n")
			vI_account._copyUnicharAttribute("signing_cert_name");
			vI_account._copyUnicharAttribute("encryption_cert_name");
			vI_account._copyIntAttribute("encryptionpolicy");
		}
/*		seems not required, encryption happens before Virtual Identity account is created
		if (vI.preferences.getBoolPref("copyEnigmailSettings")) {
			// pgp/enigmail settings
			vI_notificationBar.dump("## vI_account: copy PGP settings\n")
			vI_account._copyBoolAttribute("pgpSignEncrypted");
			vI_account._copyBoolAttribute("pgpSignPlain");
			vI_account._copyBoolAttribute("enablePgp");
			vI_account._copyIntAttribute("pgpKeyMode");
			vI_account._copyCharAttribute("pgpkeyId");
			vI_account._copyIntAttribute("openPgpHeaderMode");
			vI_account._copyCharAttribute("openPgpUrlName");
		
			vI_account._copyIntAttribute("defaultEncryptionPolicy");
		}	*/
		if (vI.preferences.getBoolPref("copyAttachVCardSettings")) {
			// attach vcard
			vI_notificationBar.dump("## vI_account: copy VCard settings\n")
			vI_account._copyBoolAttribute("attachVCard");
			vI_account._copyCharAttribute("escapedVCard");
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
				!vI_account.__dirEmpty(maildir)) return false;
			// ignore files with ending "*.msf"
			if (!maildir.path.match(new RegExp(".*\.msf$","i")) &&
				maildir.fileSize != 0) return false;
		}
		return true;
	},

	__cleanupDirectories : function() {
		vI_notificationBar.dump("## vI_account: checking for leftover VirtualIdentity directories ")

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
						if (vI_account.__dirEmpty(maildir)) {
							try {maildir.remove(true)} catch(e) { }
							vI_notificationBar.dump("x");
						}
						else vI_notificationBar.dump(".");
						
					}
				}
			}
		}
		vI_notificationBar.dump(" - done\n")
	},
	
	cleanupSystem : function() {
		vI_notificationBar.dump("## vI_account: checking for leftover VirtualIdentity accounts ")
		for (var i=0; i < vI_account.AccountManager.accounts.Count(); i++) {
			var account = vI_account.AccountManager.accounts.QueryElementAt(i, Components.interfaces.nsIMsgAccount);
			if (vI_account.__isVIdentityAccount(account)) {
				vI_notificationBar.dump(".")
				vI_account.__removeAccount(account);
			}
		}
		vI_notificationBar.dump(" - done\n")
		vI_account.__cleanupDirectories();
	},
	
	__isVIdentityAccount : function(account) {
		// check for new (post0.5.0) accounts,
		try {	vI_account.prefroot.getBoolPref("mail.account." + account.key + ".vIdentity");
			return true;
		} catch (e) { };
		// check for old (pre 0.5.0) accounts
		if (account.incomingServer && account.incomingServer.hostName == "virtualIdentity") return true;
		return false;
	},
	
	__removeAccount : function(account) {
		// in new (post 0.5.0) Virtual Identity accounts the incomingServer of the account
		// points to an incoming server of a different account. Cause the internal
		// removeAccount function tries to removes the incomingServer ether, create
		// a real one before calling this function.
		if (!account.incomingServer || account.incomingServer.hostName != "virtualIdentity") {
			// if not some of the 'old' accounts
			account.incomingServer = vI_account.AccountManager.
				createIncomingServer("toRemove","virtualIdentity","pop3");
		}

		// remove the rootFolder of the account
		try { account.incomingServer.rootFolder.Delete(); }
		catch (e) { };
		
		var key = account.key;
		vI_notificationBar.dump("## vI_account: removing account " + key + ".\n")
		// remove the account
		vI_account.AccountManager.removeAccount(account);
		// remove the additional tagging-pref
		try { vI_account.prefroot.clearUserPref("mail.account." + key + ".vIdentity");	}
		catch (e) { };
	},
	
	removeUsedVIAccount : function() {
		var mailWindow = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService()
			.QueryInterface(Components.interfaces.nsIWindowMediator)
			.getMostRecentWindow("mail:3pane");
		var selectedFolder = (mailWindow.gFolderTreeView)?mailWindow.gFolderTreeView.getSelectedFolders()[0]:null;
		var selectedMessages = (mailWindow.gFolderDisplay)?mailWindow.gFolderDisplay.selectedMessages:null;
		if (vI_account.account) {
			vI_account.__removeAccount(vI_account.account);
			vI_account.account = null;
		}
		try {
		if (selectedFolder) mailWindow.gFolderTreeView.selectFolder(selectedFolder);
		if (selectedMessages) mailWindow.gFolderDisplay.selectMessages(selectedMessages, false, false);
		} catch (e) { };
	},
	
	createAccount : function()
	{
		if (vI_account.account) {  // if the Account is still created, then leave all like it is
			alert("account still created, shouldn't happen");
			return;
		}
		/*
		// the easiest way would be to get all requiered Attributes might be to duplicate the default account like this
		var recentAccount = vI_account.AccountManager.getAccount(vI.elements.Obj_MsgIdentity.selectedItem.getAttribute("accountkey"));
		vI.VIdent_Account = vI_account.AccountManager.duplicateAccount(recentAccount);
		// but this ends up in the following exception:
		// "Component returned failure code: 0x80004001 (NS_ERROR_NOT_IMPLEMENTED) [nsIMsgAccountManager.duplicateAccount]"
		// so I have to do this by hand ;(
		*/
		
		vI_account.account = vI_account.AccountManager.createAccount();
		vI_account.prefroot.setBoolPref("mail.account." + vI_account.account.key + ".vIdentity", true)
		
		vI_account.account.addIdentity(vI_account.AccountManager.createIdentity());
	
		// the new account uses the same incomingServer than the base one,
		// it's especially required for NNTP cause incomingServer is used for sending newsposts.
		// by pointing to the same incomingServer stored passwords can be reused
		// the incomingServer has to be replaced before the account is removed, else it get removed ether
		var servers = vI_account.AccountManager.GetServersForIdentity(vI_account._getBaseIdentity());
		var server = servers.QueryElementAt(0, Components.interfaces.nsIMsgIncomingServer);
		
		// we mark the server as invalid so that the account manager won't
		// tell RDF about the new server - we don't need this server for long
		// but we should restore it, because it's actually the same server as the one of the base identity
		server.valid = false;
		vI_account.account.incomingServer = server;
		server.valid = true;

		vI_account.copyMsgIdentityClone();
		vI_account.copyPreferences();
		vI_account.setupFcc();
		vI_account.setupDraft();
		vI_account.setupTemplates();
	},
	
	copyMsgIdentityClone : function() {
		var identityData = document.getElementById("msgIdentity_clone").identityData;
		vI_account.account.defaultIdentity.setCharAttribute("useremail", identityData.email);
		vI_account.account.defaultIdentity.setUnicharAttribute("fullName", identityData.fullName);
		
		vI_account.account.defaultIdentity.smtpServerKey = identityData.smtp.keyNice; // key with "" for DEFAULT_SMTP_TAG

		vI_notificationBar.dump("## vI_account: Stored virtualIdentity (name "
			+ vI_account.account.defaultIdentity.fullName + " email "
			+ vI_account.account.defaultIdentity.email + " smtp "
			+ vI_account.account.defaultIdentity.smtpServerKey +")\n");
	},
	
	setupFcc : function()
	{
		if (document.getElementById("fcc_switch").getAttribute("checked")) {
			switch (vI.preferences.getCharPref("fccFolderPickerMode"))
			{
			    case "2"  :
				vI_notificationBar.dump ("## vI_account: preparing Fcc --- use Settings of Default Account\n");
				vI_account.account.defaultIdentity.doFcc = vI_account.AccountManager.defaultAccount.defaultIdentity.doFcc;
				vI_account.account.defaultIdentity.fccFolder = vI_account.AccountManager.defaultAccount.defaultIdentity.fccFolder;
				vI_account.account.defaultIdentity.fccFolderPickerMode = vI_account.AccountManager.defaultAccount.defaultIdentity.fccFolderPickerMode;
				if (!vI_helper.olderVersion("TB", "2.0"))
					vI_account.account.defaultIdentity.fccReplyFollowsParent = vI_account.AccountManager.defaultAccount.defaultIdentity.fccReplyFollowsParent;
				break;
			    case "3"  :
				vI_notificationBar.dump ("## vI_account: preparing Fcc --- use Settings of Modified Account\n");
				vI_account.account.defaultIdentity.doFcc = vI_account._getBaseIdentity().doFcc;
				vI_account.account.defaultIdentity.fccFolder = vI_account._getBaseIdentity().fccFolder;
				vI_account.account.defaultIdentity.fccFolderPickerMode = vI_account._getBaseIdentity().fccFolderPickerMode;
				if (!vI_helper.olderVersion("TB", "2.0"))
					vI_account.account.defaultIdentity.fccReplyFollowsParent = vI_account._getBaseIdentity().fccReplyFollowsParent;
				break;
			    default  :
				vI_notificationBar.dump ("## vI_account: preparing Fcc --- use Virtual Identity Settings\n");
				vI_account.account.defaultIdentity.doFcc
					= vI.preferences.getBoolPref("doFcc");
				vI_account.account.defaultIdentity.fccFolder
					= vI.unicodeConverter.ConvertToUnicode(vI.preferences.getCharPref("fccFolder"));
				vI_account.account.defaultIdentity.fccFolderPickerMode
					= vI.preferences.getCharPref("fccFolderPickerMode");
				if (!vI_helper.olderVersion("TB", "2.0"))
					vI_account.account.defaultIdentity.fccReplyFollowsParent = vI.preferences.getBoolPref("fccReplyFollowsParent");

				break;
			}
		}
		else {
			dump ("## vI_account: dont performing Fcc\n");
			vI_account.account.defaultIdentity.doFcc = false;
		}
		vI_notificationBar.dump("## vI_account: Stored (doFcc " + vI_account.account.defaultIdentity.doFcc + " fccFolder " +
			vI_account.account.defaultIdentity.fccFolder + " fccFolderPickerMode " +
			vI_account.account.defaultIdentity.fccFolderPickerMode + "(" +
			vI.preferences.getCharPref("fccFolderPickerMode") + "))\n");
	},
	
	setupDraft : function()	{
		switch (vI.preferences.getCharPref("draftFolderPickerMode"))
		{
		    case "2"  :
			vI_notificationBar.dump ("## vI_account: preparing Draft --- use Settings of Default Account\n");
			vI_account.account.defaultIdentity.draftFolder = vI_account.AccountManager.defaultAccount.defaultIdentity.draftFolder;
			vI_account.account.defaultIdentity.draftsFolderPickerMode = vI_account.AccountManager.defaultAccount.defaultIdentity.draftsFolderPickerMode;
			break;
		    case "3"  :
			vI_notificationBar.dump ("## vI_account: preparing Draft --- use Settings of Modified Account\n");
			vI_account.account.defaultIdentity.draftFolder = vI_account._getBaseIdentity().draftFolder;
			vI_account.account.defaultIdentity.draftsFolderPickerMode = vI_account._getBaseIdentity().draftsFolderPickerMode;
			break;
		    default  :
			vI_notificationBar.dump ("## vI_account: preparing Draft --- use Virtual Identity Settings\n");
			vI_account.account.defaultIdentity.draftFolder
				= vI.unicodeConverter.ConvertToUnicode(vI.preferences.getCharPref("draftFolder"));
			vI_account.account.defaultIdentity.draftsFolderPickerMode
				= vI.preferences.getCharPref("draftFolderPickerMode");
			break;
		}
		vI_notificationBar.dump("## vI_account: Stored (draftFolder " +
			vI_account.account.defaultIdentity.draftFolder + " draftsFolderPickerMode " +
			vI_account.account.defaultIdentity.draftsFolderPickerMode + "(" +
			vI.preferences.getCharPref("draftFolderPickerMode") + "))\n");
	},
	
	setupTemplates : function()	{
		switch (vI.preferences.getCharPref("stationeryFolderPickerMode"))
		{
		    case "2"  :
			vI_notificationBar.dump ("## vI_account: preparing Templates --- use Settings of Default Account\n");
			vI_account.account.defaultIdentity.stationeryFolder = vI_account.AccountManager.defaultAccount.defaultIdentity.stationeryFolder;
			vI_account.account.defaultIdentity.tmplFolderPickerMode = vI_account.AccountManager.defaultAccount.defaultIdentity.tmplFolderPickerMode;
			break;
		    case "3"  :
			vI_notificationBar.dump ("## vI_account: preparing Templates --- use Settings of Modified Account\n");
			vI_account.account.defaultIdentity.stationeryFolder = vI_account._getBaseIdentity().stationeryFolder;
			vI_account.account.defaultIdentity.tmplFolderPickerMode = vI_account._getBaseIdentity().tmplFolderPickerMode;
			break;
		    default  :
			vI_notificationBar.dump ("## vI_account: preparing Templates --- use Virtual Identity Settings\n");
			vI_account.account.defaultIdentity.stationeryFolder
				= vI.unicodeConverter.ConvertToUnicode(vI.preferences.getCharPref("stationeryFolder"));
			vI_account.account.defaultIdentity.tmplFolderPickerMode
				= vI.preferences.getCharPref("stationeryFolderPickerMode");
			break;
		}
		vI_notificationBar.dump("## vI_account: Stored (stationeryFolder " +
			vI_account.account.defaultIdentity.stationeryFolder + " tmplFolderPickerMode " +
			vI_account.account.defaultIdentity.tmplFolderPickerMode + "(" +
			vI.preferences.getCharPref("stationeryFolderPickerMode") + "))\n");
	}
}
