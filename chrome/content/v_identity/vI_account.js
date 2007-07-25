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
	
	//~ Checks if there is stil another VIdentity Account and creates a new identity number
	getNewAccountNumber : function()
	{
		var accounts = queryISupportsArray(gAccountManager.accounts, Components.interfaces.nsIMsgAccount)
		var FreeVIdentityNumber = 0
		for (index = 0; index < accounts.length; index++) {
			var server = accounts[index].incomingServer;
			if (server && server.hostName == "virtualIdentity" 
			&& server.prettyName ==
				document.getElementById("prettyName-Prefix").getAttribute("label")
					+ FreeVIdentityNumber)
					FreeVIdentityNumber++
		}
		return FreeVIdentityNumber;
	},
	
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
	
	removeAccount : function() {
		if (vI_account.account) {
			vI_notificationBar.dump("## vI_account: Account " + vI_account.account.incomingServer.prettyName + " removed\n")
			vI_account.account.incomingServer.rootFolder.Delete();
			gAccountManager.removeAccount(vI_account.account);
			vI_account.account = null;
		}
	},
	
	createAccount : function()
	{
		if (vI_account.account) {  // if the Account is still created, then leave all like it is
			alert("account still created, shouldn't happen");
			return;
		}
		
		/*
		// the easiest way would be to get all requiered Attributes might be to duplicate the default account like this
		var recentAccount = gAccountManager.getAccount(vI.elements.Obj_MsgIdentity.selectedItem.getAttribute("accountkey"));
		vI.VIdent_Account = gAccountManager.duplicateAccount(recentAccount);
		// but this ends up in the following exception:
		// "Component returned failure code: 0x80004001 (NS_ERROR_NOT_IMPLEMENTED) [nsIMsgAccountManager.duplicateAccount]"
		// so I have to do this by hand ;(
		*/
		
		vI_account.account = gAccountManager.createAccount();
		
		vI_account.account.addIdentity(gAccountManager.createIdentity());
	
		var Number = vI_account.getNewAccountNumber();
	
		vI_account.account.incomingServer = gAccountManager.createIncomingServer("user"+Number,"virtualIdentity","pop3");
		vI_account.account.incomingServer.prettyName = document.getElementById("prettyName-Prefix").getAttribute("label") + Number;

		vI_account.copyMsgIdentityClone();
		vI_account.copyPreferences();
		vI_account.setupFcc();
		
		
		// remove the folder created with this account - it should never be used to store mails
		vI_account.account.incomingServer.rootFolder.Delete();
	
		vI_notificationBar.dump("## vI_account: New Account created " + vI_account.account.incomingServer.prettyName + "\n");
		//~ confirm("## vI_account: New Account created "+server.prettyName+"\n");
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
			switch (vI.preferences.getCharPref("fcc_folder_picker_mode"))
			{
			    case "2"  :
				dump ("## vI_account: preparing Fcc --- use Settings of Default Account\n");
				vI_account.account.defaultIdentity.doFcc = gAccountManager.defaultIdentity.doFcc;
				vI_account.account.defaultIdentity.fccFolder = gAccountManager.defaultAccount.defaultIdentity.fccFolder;
				vI_account.account.defaultIdentity.fccFolderPickerMode = gAccountManager.defaultAccount.defaultIdentity.fccFolderPickerMode;
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
					= vI.preferences.getCharPref("fcc_folder");
				vI_account.account.defaultIdentity.fccFolderPickerMode
					= vI.preferences.getCharPref("fcc_folder_picker_mode");
				break;
			}
		}
		else {
			dump ("## vI_account: dont performing Fcc\n");
			vI_account.account.defaultIdentity.doFcc = false;
		}
		vI_notificationBar.dump("## vI_account: Stored (doFcc " + vI_account.account.defaultIdentity.doFcc + " fccFolder " +
			vI_account.account.defaultIdentity.fccFolder + " fccFolderPickerMode " +
			vI_account.account.defaultIdentity.fccFolderPickerMode + ")\n");
	}
}