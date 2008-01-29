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

vI_account = {
	account : null,
	
	AccountManager : Components.classes["@mozilla.org/messenger/account-manager;1"]
		.getService(Components.interfaces.nsIMsgAccountManager),

	
	prefroot : Components.classes["@mozilla.org/preferences-service;1"]
		.getService(Components.interfaces.nsIPrefService)
		.getBranch(null),

	_copyBoolAttribute : function(name) {
		vI_account.account.defaultIdentity.setBoolAttribute(name,
				vI.helper.getBaseIdentity().getBoolAttribute(name));
	},
	
	_copyIntAttribute : function(name) {
		vI_account.account.defaultIdentity.setIntAttribute(name,
				vI.helper.getBaseIdentity().getIntAttribute(name));
	},

	_copyCharAttribute : function(name) {
		vI_account.account.defaultIdentity.setCharAttribute(name,
				vI.helper.getBaseIdentity().getCharAttribute(name));
	},

	_copyUnicharAttribute : function(name) {
		vI_account.account.defaultIdentity.setUnicharAttribute(name,
				vI.helper.getBaseIdentity().getUnicharAttribute(name));
	},

	copyPreferences : function() {
		if (vI.preferences.getBoolPref("copySMIMESettings")) {
			// SMIME settings
			vI_notificationBar.dump("## vI_account: copy S/MIME settings\n")
			vI_account._copyUnicharAttribute("signing_cert_name");
			vI_account._copyUnicharAttribute("encryption_cert_name");
			vI_account._copyIntAttribute("encryptionpolicy");
		}
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
		
			vI_account._copyBoolAttribute("pgpSignEncrypted");
			vI_account._copyBoolAttribute("pgpSignPlain");
			vI_account._copyIntAttribute("defaultEncryptionPolicy");
		}
		if (vI.preferences.getBoolPref("copyAttachVCardSettings")) {
			// attach vcard
			vI_notificationBar.dump("## vI_account: copy VCard settings\n")
			vI_account._copyBoolAttribute("attachVCard");
			vI_account._copyCharAttribute("escapedVCard");
		}
	},
		
	cleanupSystem : function() {
		vI_notificationBar.dump("## vI_account: cleanupSystem:\n")
		for (var i=0; i < vI_account.AccountManager.accounts.Count(); i++) {
			var account = vI_account.AccountManager.accounts.QueryElementAt(i, Components.interfaces.nsIMsgAccount);
			vI_account.removeAccount(account);
		}
		vI_notificationBar.dump("## vI_account: cleanupSystem done.\n")
	},
	
	removeAccount : function(account) {
		var key = account.key;
		var server = account.incomingServer;
		if (!server || server.hostName != "virtualIdentity") {
			try {	vI_account.prefroot.getBoolPref("mail.account." + account.key + ".vIdentity");
				account.incomingServer = vI_account.AccountManager.
							createIncomingServer("toRemove","virtualIdentity","pop3");
			} catch (e) { return; };
		}
		try { account.incomingServer.rootFolder.Delete(); }
		catch (e) { };
		vI_notificationBar.dump("## vI_account: removing account " + key + ".\n")
		vI_account.AccountManager.removeAccount(account);
		try { vI_account.prefroot.clearUserPref("mail.account." + key + ".vIdentity");	}
		catch (e) { };
	},
	
	removeUsedVIAccount : function() {
		if (vI_account.account) {
			vI_account.removeAccount(vI_account.account);
			vI_account.account = null;
		}
	},
	
	createAccount : function()
	{
		if (vI_account.account) {  // if the Account is still created, then leave all like it is
			alert("account still created, shouldn't happen");
			return;
		}
		
		vI_account.cleanupSystem();
		
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
	
		// the new account uses the same incomingServer than the base one, has to be replaced before the account is removed
		var servers = vI_account.AccountManager.GetServersForIdentity(vI.helper.getBaseIdentity());
		vI_account.account.incomingServer = servers.QueryElementAt(0, Components.interfaces.nsIMsgIncomingServer);
		
		vI_account.copyMsgIdentityClone();
		vI_account.copyPreferences();
		vI_account.setupFcc();
		vI_account.setupDraft();
		vI_account.setupTemplates();
	},
	
	copyMsgIdentityClone : function() {
		var address = vI.helper.getAddress();
		vI_account.account.defaultIdentity.setUnicharAttribute("fullName", address.name);
		vI_account.account.defaultIdentity.setCharAttribute("useremail", address.email);
		
		if (vI_smtpSelector.elements.Obj_SMTPServerList.selectedItem)
			vI_account.account.defaultIdentity.smtpServerKey
				= vI_smtpSelector.elements.Obj_SMTPServerList.selectedItem.getAttribute('key');
		else vI_notificationBar.dump("## vI_account: This shouldnt happen: SMTP-Server unselected.\n");
		vI_notificationBar.dump("## vI_account: Stored virtualIdentity (name "
			+ vI_account.account.defaultIdentity.fullName + " email "
			+ vI_account.account.defaultIdentity.email + " smtp "
			+ vI_account.account.defaultIdentity.smtpServerKey +")\n");
	},
	
	setupFcc : function()
	{
		if (vI.preferences.getBoolPref("doFcc")) {
			switch (vI.preferences.getCharPref("fccFolderPickerMode"))
			{
			    case "2"  :
				dump ("## vI_account: preparing Fcc --- use Settings of Default Account\n");
				vI_account.account.defaultIdentity.doFcc = vI_account.AccountManager.defaultAccount.defaultIdentity.doFcc;
				vI_account.account.defaultIdentity.fccFolder = vI_account.AccountManager.defaultAccount.defaultIdentity.fccFolder;
				vI_account.account.defaultIdentity.fccFolderPickerMode = vI_account.AccountManager.defaultAccount.defaultIdentity.fccFolderPickerMode;
				break;
			    case "3"  :
				dump ("## vI_account: preparing Fcc --- use Settings of Modified Account\n");
				vI_account.account.defaultIdentity.doFcc = vI.helper.getBaseIdentity().doFcc;
				vI_account.account.defaultIdentity.fccFolder = vI.helper.getBaseIdentity().fccFolder;
				vI_account.account.defaultIdentity.fccFolderPickerMode = vI.helper.getBaseIdentity().fccFolderPickerMode;
				break;
			    default  :
				dump ("## vI_account: preparing Fcc --- use Virtual Identity Settings\n");
				vI_account.account.defaultIdentity.doFcc
					= vI.preferences.getBoolPref("doFcc");
				vI_account.account.defaultIdentity.fccFolder
					= vI.unicodeConverter.ConvertToUnicode(vI.preferences.getCharPref("fccFolder"));
				vI_account.account.defaultIdentity.fccFolderPickerMode
					= vI.preferences.getCharPref("fccFolderPickerMode");
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
			dump ("## vI_account: preparing Draft --- use Settings of Default Account\n");
			vI_account.account.defaultIdentity.draftFolder = vI_account.AccountManager.defaultAccount.defaultIdentity.draftFolder;
			vI_account.account.defaultIdentity.draftsFolderPickerMode = vI_account.AccountManager.defaultAccount.defaultIdentity.draftsFolderPickerMode;
			break;
		    case "3"  :
			dump ("## vI_account: preparing Draft --- use Settings of Modified Account\n");
			vI_account.account.defaultIdentity.draftFolder = vI.helper.getBaseIdentity().draftFolder;
			vI_account.account.defaultIdentity.draftsFolderPickerMode = vI.helper.getBaseIdentity().draftsFolderPickerMode;
			break;
		    default  :
			dump ("## vI_account: preparing Draft --- use Virtual Identity Settings\n");
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
			dump ("## vI_account: preparing Templates --- use Settings of Default Account\n");
			vI_account.account.defaultIdentity.stationeryFolder = vI_account.AccountManager.defaultAccount.defaultIdentity.stationeryFolder;
			vI_account.account.defaultIdentity.tmplFolderPickerMode = vI_account.AccountManager.defaultAccount.defaultIdentity.tmplFolderPickerMode;
			break;
		    case "3"  :
			dump ("## vI_account: preparing Templates --- use Settings of Modified Account\n");
			vI_account.account.defaultIdentity.stationeryFolder = vI.helper.getBaseIdentity().stationeryFolder;
			vI_account.account.defaultIdentity.tmplFolderPickerMode = vI.helper.getBaseIdentity().tmplFolderPickerMode;
			break;
		    default  :
			dump ("## vI_account: preparing Templates --- use Virtual Identity Settings\n");
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
