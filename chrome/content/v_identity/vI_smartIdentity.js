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
	
var smartIdentity = {
	_pref : Components.classes["@mozilla.org/preferences-service;1"]
		.getService(Components.interfaces.nsIPrefService)
		.getBranch("extensions.virtualIdentity."),

	messenger : Components.classes["@mozilla.org/messenger;1"].createInstance()
		.QueryInterface(Components.interfaces.nsIMessenger),
	
	_smartIdentityCollection : null,
		
	// After Loading the MessageComposeDialog, check if smartIdentity is needed
	init : function() {
		var msgHdr;
		var msgComposeTypeReference = Components.interfaces.nsIMsgCompType;
		var newsgroup = gMsgCompose.compFields.newsgroups;
		var autocreate = false;
		if (vI.notificationBar) vI.notificationBar.dump("## smartIdentity: msgComposeTypeReference = " + gMsgCompose.type + "\n");
		switch (gMsgCompose.type) {
			case msgComposeTypeReference.Reply:
			case msgComposeTypeReference.ReplyAll:
			case msgComposeTypeReference.ReplyToGroup: // reply to a newsgroup, would possibly be stopped later
			case msgComposeTypeReference.ReplyToSender:
			case msgComposeTypeReference.ReplyToSenderAndGroup: // reply to a newsgroup, would possibly be stopped later
			case msgComposeTypeReference.ReplyWithTemplate:
			case msgComposeTypeReference.ReplyToList:
				if (vI.notificationBar) vI.notificationBar.dump("## smartIdentity: Reply\n");
				msgHdr = smartIdentity.messenger.
					messageServiceFromURI(gMsgCompose.originalMsgURI).messageURIToMsgHdr(gMsgCompose.originalMsgURI);
				smartIdentity._smartIdentityCollection = new vI.smartIdentityCollection(msgHdr, getCurrentIdentity(), document.getElementById("msgIdentity_clone").vid, newsgroup, this._getRecipients());	
				smartIdentity._smartIdentityCollection.Reply();
				autocreate = false; break;
			case msgComposeTypeReference.Draft:
			case msgComposeTypeReference.Template:
				if (vI.notificationBar) vI.notificationBar.dump("## smartIdentity: Draft\n");
				msgHdr = smartIdentity.messenger.
					messageServiceFromURI(gMsgCompose.compFields.draftId).messageURIToMsgHdr(gMsgCompose.compFields.draftId);
				smartIdentity._smartIdentityCollection = new vI.smartIdentityCollection(msgHdr, getCurrentIdentity(), document.getElementById("msgIdentity_clone").vid, newsgroup, this._getRecipients());	
				smartIdentity._smartIdentityCollection.Draft();
				autocreate = false; break;
			case msgComposeTypeReference.ForwardAsAttachment:
            case msgComposeTypeReference.ForwardInline:
            case msgComposeTypeReference.New:
			case msgComposeTypeReference.NewsPost:
			case msgComposeTypeReference.MailToUrl:
				if (vI.notificationBar) vI.notificationBar.dump("## smartIdentity: New Mail\n");
				smartIdentity._smartIdentityCollection = new vI.smartIdentityCollection(null, getCurrentIdentity(), document.getElementById("msgIdentity_clone").vid, newsgroup, this._getRecipients());	
				// to enable composing new email with new identity: identity is hidden in subject line
				// used for instance from conversation addon
				var subject = gMsgCompose.compFields.subject.split(/\n/);
				if (subject.length > 1 && subject[1] == "virtualIdentityExtension") {
					if (vI.notificationBar) vI.notificationBar.dump("## smartIdentity: NewMail() found stored identity preset: " + subject[2] + "\n");
					smartIdentity._smartIdentityCollection.__parseHeadersWithArray(subject[2], smartIdentity._smartIdentityCollection._allIdentities);
					gMsgCompose.compFields.subject = subject[0];
					document.getElementById("msgSubject").value = subject[0];
				}
				else smartIdentity._smartIdentityCollection.NewMail();
				autocreate = true; break;
		}
		if (smartIdentity._smartIdentityCollection._allIdentities.number > 0) smartIdentity.__smartIdentitySelection(autocreate);
	},
	
	_getRecipients : function() {
		var recipients = [];
		for (var row = 1; row <= top.MAX_RECIPIENTS; row ++) {
			var recipientType = awGetPopupElement(row).selectedItem.getAttribute("value");
			if (recipientType == "addr_reply" || recipientType == "addr_followup" || 
				vI.storage.__isDoBcc(row) || awGetInputElement(row).value.match(/^\s*$/) ) continue;
			recipients.push( { recipient: awGetInputElement(row).value, recipientType : recipientType } );
		}
		return recipients;
	},
	
	__smartIdentitySelection : function(autocreate) {
		if (vI.notificationBar) vI.notificationBar.dump("## __smartIdentitySelection autocreate=" + autocreate + "\n");
		
		if (smartIdentity._pref.getBoolPref("idSelection_preferExisting")) {
			var existingIDIndex = smartIdentity._smartIdentityCollection._foundExistingIdentity();
			if (existingIDIndex) {
				if (vI.notificationBar) vI.notificationBar.dump("## smartIdentity: found existing Identity, use without interaction.\n");
				// add all Indentities to Clone Menu before selecting and leaving the function
				document.getElementById("msgIdentity_clone").addIdentitiesToCloneMenu(smartIdentity._smartIdentityCollection._allIdentities);
				smartIdentity.changeIdentityToSmartIdentity(smartIdentity._smartIdentityCollection._allIdentities, existingIDIndex.key);
				return;
			}
		}
		
		document.getElementById("msgIdentity_clone").addIdentitiesToCloneMenu(smartIdentity._smartIdentityCollection._allIdentities);
		if (vI.notificationBar) vI.notificationBar.dump("## __smartIdentitySelection smartIdentity._smartIdentityCollection._allIdentities.number=" +
				smartIdentity._smartIdentityCollection._allIdentities.number +
				" smartIdentity._pref.getBoolPref('idSelection_ask_always')=" +
				smartIdentity._pref.getBoolPref("idSelection_ask_always") +
				" smartIdentity._pref.getBoolPref('idSelection_ask')=" +
				smartIdentity._pref.getBoolPref("idSelection_ask") + "\n");
		if (!autocreate && smartIdentity._pref.getBoolPref("idSelection_ask") && 
			((smartIdentity._smartIdentityCollection._allIdentities.number == 1 && smartIdentity._pref.getBoolPref("idSelection_ask_always"))
				|| smartIdentity._smartIdentityCollection._allIdentities.number > 1)) {
			for (var index = 0; index < smartIdentity._smartIdentityCollection._allIdentities.number; index++) {
				if (vI.notificationBar) vI.notificationBar.dump("## smartIdentityReplyDialog index=" + index + ": '" + smartIdentity._smartIdentityCollection._allIdentities.identityDataCollection[index].combinedName + "' "
					+ "(" + smartIdentity._smartIdentityCollection._allIdentities.identityDataCollection[index].id.value + "," + smartIdentity._smartIdentityCollection._allIdentities.identityDataCollection[index].smtp.value + ")\n");
			}
			window.openDialog("chrome://v_identity/content/vI_smartReplyDialog.xul",0,
					"chrome, dialog, modal, alwaysRaised, resizable=yes",
					 smartIdentity._smartIdentityCollection._allIdentities,
					/* callback: */ smartIdentity.changeIdentityToSmartIdentity).focus();
		}
		else if (autocreate || smartIdentity._pref.getBoolPref("idSelection_autocreate")) {
			smartIdentity.changeIdentityToSmartIdentity(smartIdentity._smartIdentityCollection._allIdentities, 0);
		}	
	},
	
	changeIdentityToSmartIdentity : function(allIdentities, selectedValue) {
		if (vI.notificationBar) vI.notificationBar.dump("## changeIdentityToSmartIdentity selectedValue=" + selectedValue + " from " + allIdentities.number + "\n");
		if (vI.notificationBar) vI.notificationBar.dump("## changeIdentityToSmartIdentity selectedValue=" + selectedValue + ": '" + allIdentities.identityDataCollection[selectedValue].combinedName + "' "
			+ "(" + allIdentities.identityDataCollection[selectedValue].id.value + "," + allIdentities.identityDataCollection[selectedValue].smtp.value + ")\n");
		document.getElementById("msgIdentity_clone").selectedMenuItem = allIdentities.menuItems[selectedValue];
		if (document.getElementById("msgIdentity_clone").vid) {
			var label=vI.main.elements.strings.getString("vident.smartIdentity.vIUsage");
			if (allIdentities.number > 1) label += " "
				+ vI.main.elements.strings.getString("vident.smartIdentity.moreThanOne");
			if (vI.notificationBar) vI.notificationBar.addNote(label + ".", "smart_reply_notification");
		}
		smartIdentity.__removeSmartIdentityFromRecipients(allIdentities, selectedValue);
	},
	
	__removeSmartIdentityFromRecipients : function(allIdentities, index) {
		if (!smartIdentity._pref.getBoolPref("idSelection_removeSmartIdentityFromRecipients")) return;
		
		// check if selected email is defined as doBcc address. If so, it should not be removed.
		var skip_bcc = false;
		if (getCurrentIdentity().doBcc) {
			var bcc_addresses = new vI.identityCollection();
			smartIdentity.__parseHeadersWithArray(getCurrentIdentity().doBccList, bcc_addresses);
			
			for (var i = 0; i < bcc_addresses.number; i++) {
				if (allIdentities.identityDataCollection[index].email == bcc_addresses.identityDataCollection[i].email) {
					skip_bcc = true; break;
				}
			}
		}
		
		// check if there is more than one recipient for this mail. If not, preserve the only one existing.
		var recipientCount = 0;
		for (var row = 1; row <= top.MAX_RECIPIENTS; row ++) {
			var recipientType = awGetPopupElement(row).selectedItem.getAttribute("value");
			if (recipientType == "addr_to" || recipientType == "addr_cc") recipientCount++;
		}
		if (recipientCount < 2) return;
		
		
		for (var row = 1; row <= top.MAX_RECIPIENTS; row ++) {
			var popup = awGetPopupElement(row);
			var input = awGetInputElement(row);
			var recipientType = popup.selectedItem.getAttribute("value");
			// if the entry is not a recipient, just continue
			if (recipientType == "addr_reply" || recipientType == "addr_followup") continue;
			// check if the entry is used as a BCC selected in account settings
			if (recipientType == "addr_bcc" && skip_bcc) continue;
			// check if entry is matching senders address, if so, remove it
			if (input.value == allIdentities.identityDataCollection[index].email ||
				input.value == allIdentities.identityDataCollection[index].combinedName) {
					awSetInputAndPopupValue(input, "", popup, "addr_to", -1);
					awCleanupRows()
					if (vI.notificationBar) vI.notificationBar.addNote(" " +
						vI.main.elements.strings.getString("vident.smartIdentity.remRecipient"),
						"smart_reply_notification");
					break;
			}
		}
	}
}
vI.smartIdentity = smartIdentity;
}});