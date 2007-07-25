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

vI_smartIdentity = {
	messenger : Components.classes["@mozilla.org/messenger;1"].createInstance()
		.QueryInterface(Components.interfaces.nsIMessenger),
		
	smartIdentity : null,
	smartIdentity_BaseIdentity : null,

	// After Loading the MessageComposeDialog, check if smartIdentity is needed
	init : function() {
		// if there is no ID of the original Message  (Why?) leave the function
		var uri = vI.params.originalMsgURI; 
		if (!uri) {
			vI_notificationBar.dump("## vI_smartIdentity: cant get URI of former Message\n");
			return;
		}
		var hdr = vI_smartIdentity.messenger.msgHdrFromURI(uri);
		
		var type = vI.params.type;
		var msgComposeType = Components.interfaces.nsIMsgCompType;
		switch (type) {
			case msgComposeType.Reply:
			case msgComposeType.ReplyAll:
			case msgComposeType.ReplyToGroup:
			case msgComposeType.ReplyToSender:
			case msgComposeType.ReplyToSenderAndGroup:
				if (vI.preferences.getBoolPref("smart_reply"))
					vI_smartIdentity.SmartReply(hdr);
				break;
			case msgComposeType.Draft:
			case msgComposeType.Template:
				if (vI.preferences.getBoolPref("smart_draft"))
					vI_smartIdentity.SmartDraft(hdr);
				break;
			}
	},
	
	// this function checks if we have a draft-case and Smart-Draft should replace the Identity
	SmartDraft : function(hdr) {
		vI_notificationBar.dump("## vI_smartIdentity: SmartDraft()\n");
		
		vI_notificationBar.dump("## vI_smartIdentity: sender " + hdr.author + "\n");
		vI_notificationBar.setNote(vI.elements.strings.getString("vident.smartIdentity.vIUsage") + ".",
					"smart_reply_notification");
		vI_msgIdentityClone.setIdentity(hdr.author)

		vI.helper.addSeparatorToCloneMenu();
		var object = vI_msgIdentityClone.elements.Obj_MsgIdentityPopup_clone
		var accountname = document.getElementById("prettyName-Prefix").getAttribute("label")
			+ " - " + vI.helper.getBaseIdentity().email
		vI.helper.addIdentityMenuItem(object, hdr.author, accountname, "", "vid")
	},
	
	// check if recent email-address (pre-choosen identity) is found in at least one email-address
	matchSelectedIdentity : function(all_addresses) {
		for (index = 0; index < all_addresses.number; index++) { 
			if (vI.params.identity.email.toLowerCase() == all_addresses.emails.value[index].toLowerCase()
				&& (vI.preferences.getBoolPref("smart_reply_ignoreFullName") ||
				vI.params.identity.fullName == all_addresses.fullNames.value[index])) {
					vI_notificationBar.dump("## vI_smartIdentity: found preselected Identity in address sets, aborting\n");
					return true; // direct hit
				}
		}
		return false;
	},
	
	// checks if the Identity currently described by the extension-area fields i still available as
	// a stored identity. If so, use the stored one.
	matchAnyIdentity : function(all_addresses) {
		var accounts = queryISupportsArray(gAccountManager.accounts, Components.interfaces.nsIMsgAccount);
		for (var i in accounts) {
			var server = accounts[i].incomingServer;
			//  ignore (other) virtualIdentity Accounts
			if (!server || server.hostName == "virtualIdentity") continue;
		
			var identities = queryISupportsArray(accounts[i].identities, Components.interfaces.nsIMsgIdentity);
			for (var j in identities) {
				for (index = 0; index < all_addresses.number; index++) {
					if (identities[j].getUnicharAttribute("useremail").toLowerCase() ==
						all_addresses.emails.value[index].toLowerCase() &&
						(vI.preferences.getBoolPref("smart_reply_ignoreFullName") ||
						identities[j].getUnicharAttribute("fullName").toLowerCase() ==
						all_addresses.fullNames.value[index].toLowerCase())) {
							vI_notificationBar.dump("## vI_smartIdentity: found existing Identity in address sets, aborting\n");
							return identities[j];
						}
					}
				}
			}
		return null;
	},

	
	filterAddresses : function(all_addresses) {
		var return_addresses = { number : 0,	emails : { value : new Array() },
							fullNames : { value : new Array() },
							combinedNames : { value : new Array() } };
		
		var filter_list = vI.preferences.getCharPref("smart_reply_filter").split(/\n/)
		if (filter_list.length == 0) filter_list[0] == ""
		
		for (i = 0; i < filter_list.length; i++) {
			const filterType = { None : 0, RegExp : 1, StrCmp : 2 }
			var recentfilterType; var skipRegExp = false;
			if (filter_list.length <= 1 && filter_list[0] == "")
				{ vI_notificationBar.dump("## vI_smartIdentity: no filters configured\n"); recentfilterType = filterType.None; }
			else if (/^\/(.*)\/$/.exec(filter_list[i]))
				{ vI_notificationBar.dump("## vI_smartIdentity: filter emails with RegExp '"
					+ filter_list[i].replace(/\\/g,"\\\\") + "'\n"); recentfilterType = filterType.RegExp; }
			else	{ vI_notificationBar.dump("## vI_smartIdentity: filter emails, compare with '"
					+ filter_list[i] + "'\n"); recentfilterType = filterType.StrCmp; }
			for (j = 0; j < all_addresses.number; j++) { // check if recent email-address (pre-choosen identity) is found in 
			// copied and adapted from correctIdentity, thank you for the RegExp-idea!
				var add_addr = false;
				switch (recentfilterType) {
					case filterType.None:
						add_addr = true; break;
					case filterType.RegExp:
						if (skipRegExp) break;
						try { 	/^\/(.*)\/$/.exec(filter_list[i]);
							add_addr =  (all_addresses.emails.value[j].match(new RegExp(RegExp.$1,"i")))
						}
						catch(vErr) {
							vI_notificationBar.addNote(
								vI.elements.strings.getString("vident.smartIdentity.ignoreRegExp") +
								+filter_list[i].replace(/\\/g,"\\\\") + " .",
								"smart_reply_notification");
								skipRegExp = true; }
						break;
					case filterType.StrCmp:
						add_addr = (filter_list[i] == all_addresses.emails.value[j])
						break;
				}
				if (add_addr)	return_addresses = vI_smartIdentity.addWithoutDuplicates(return_addresses,
						all_addresses.emails.value[j],
						all_addresses.fullNames.value[j],
						all_addresses.combinedNames.value[j])
			}
		}
		return return_addresses;
	},
	
	addWithoutDuplicates : function(all_addresses, email, fullName, combinedName) {
		for (index = 0; index < all_addresses.number; index++) {
			if (all_addresses.emails.value[index] == email) {
				// found, so check if we can use the Name of the new field
				if (all_addresses.fullNames.value[index] == "" && fullName != "") {
					all_addresses.fullNames.value[index] = fullName
					all_addresses.combinedNames.value[index] = combinedName
					vI_notificationBar.dump("## vI_smartIdentity: added fullName '" + fullName
						+ "' to stored email '" + email +"'\n")
				}
				return all_addresses;
			}
		}
		vI_notificationBar.dump("## vI_smartIdentity: add new address to result:" + email + "\n")
		all_addresses.emails.value[index] = email;
		all_addresses.fullNames.value[index] = fullName;
		all_addresses.combinedNames.value[index] = combinedName;
		all_addresses.number = index + 1;
		return all_addresses;
	},
	
	// this function checks if we have a reply-case and Smart-Reply should replace the Identity
	SmartReply : function(hdr) {
		vI_notificationBar.dump("## vI_smartIdentity: SmartReply()\n");
		
		if (gMsgCompose.compFields.newsgroups && !vI.preferences.getBoolPref("smart_reply_for_newsgroups")) {
			vI_notificationBar.dump("## vI_smartIdentity: answering to a newsgroup, aborting\n");
			return;
		}
		
		/* first step: collect addresses */
		
		// add additional emails from selected headers (stored by vI_getHeader.xul/js)
		var addresses = ""
		var reply_headers = vI.preferences.getCharPref("smart_reply_headers").split(/\n/)
		for (index = 0; index < reply_headers.length; index++) {
			var value = hdr.getStringProperty(reply_headers[index])
			if (value != "") {
				vI_notificationBar.dump("## vI_smartIdentity: found '" + value + "' in stored headers\n")
				addresses += ", " + value
			}
		}
		
		if (vI.preferences.getBoolPref("smart_reply_prefer_headers"))
			addresses = addresses + ", " + hdr.recipients + ", " + hdr.ccList
		else	addresses = hdr.recipients + ", " + hdr.ccList + addresses
		// replace trailing commata
		addresses = addresses.replace(/^((, )+)?/, "");
		vI_notificationBar.dump("## vI_smartIdentity: address-string: '" + addresses + "'\n")
		
		var all_addresses = { number : 0, emails : {}, fullNames : {}, combinedNames : {} };
		all_addresses.number = vI.headerParser
			.parseHeadersWithArray(addresses, all_addresses.emails,
					all_addresses.fullNames, all_addresses.combinedNames);
		
		vI_notificationBar.dump("## vI_smartIdentity: " + all_addresses.number + " addresses after parsing, before filtering\n")
		
		
		/* second step: filter (and sort) addresses */
		
		if (vI_smartIdentity.matchSelectedIdentity(all_addresses)) return;
		
		if (vI_smartIdentity.smartIdentity_BaseIdentity = vI_smartIdentity.matchAnyIdentity(all_addresses)) {
			vI_notificationBar.addNote(
				vI.elements.strings.getString("vident.smartIdentity.matchExisting"),
				"smart_reply_notification");
			window.setTimeout(vI_smartIdentity.updateMsgComposeDialog, 0);
			return;
		}
		
		all_addresses = vI_smartIdentity.filterAddresses(all_addresses);
		
		vI_notificationBar.dump("## vI_smartIdentity: filtering done, " + all_addresses.number + " addresses left\n")
		if (all_addresses.number == 0) return;
		
		/* second step: select address */
		
		vI_smartIdentity.addSmartIdentitiesToCloneMenu(all_addresses);
		
		if (vI.preferences.getBoolPref("smart_reply_ask") && 
			(all_addresses.number == 1 && vI.preferences.getBoolPref("smart_reply_ask_always")
				|| all_addresses.number > 1))
			window.openDialog("chrome://v_identity/content/vI_smartReplyDialog.xul",0, // give the Dialog a unique id
					"chrome, dialog, modal, alwaysRaised, resizable=yes",
					 all_addresses,
					/* callback: */ vI_smartIdentity.changeIdentityToSmartIdentity).focus();
		else if (vI.preferences.getBoolPref("smart_reply_autocreate")) {
			var label=vI.elements.strings.getString("vident.smartIdentity.vIUsage");
			if (all_addresses.number > 1) label += " "
				+ vI.elements.strings.getString("vident.smartIdentity.moreThanOne");
			vI_notificationBar.addNote(label + ".", "smart_reply_notification");
					vI_smartIdentity.changeIdentityToSmartIdentity(all_addresses, 0);
		}
	},
	
	changeIdentityToSmartIdentity : function(all_addresses, selectedValue) {
		vI_msgIdentityClone.setIdentity(all_addresses.combinedNames.value[selectedValue]);
		vI_smartIdentity.removeSmartIdentityFromRecipients(all_addresses, selectedValue);
	},
	
	removeSmartIdentityFromRecipients : function(all_addresses, index) {
		for (var row = 1; row <= top.MAX_RECIPIENTS; row ++) {
			var input = awGetInputElement(row);
			if (input.value == all_addresses.emails.value[index] ||
				input.value == all_addresses.combinedNames.value[index]) {
					awDeleteRow(row);
					vI_notificationBar.addNote(" " +
						vI.elements.strings.getString("vident.smartIdentity.remRecipient"),
						"smart_reply_notification");
					break;
			}
		}
	},
	
	updateMsgComposeDialog : function() {
		vI_msgIdentityClone.setMenuToIdentity(vI_smartIdentity.smartIdentity_BaseIdentity.key, false);
		// after inserting a new signature (as part of the new identity) the cursor is not at the right place.
		// there is no easy way to est the cursor at the end, before the signature, so set it at the beginning.
		if (vI_smartIdentity.smartIdentity_BaseIdentity.attachSignature)
			gMsgCompose.editor.beginningOfDocument();
	},
	
	// adds MenuItem for SmartIdentities to the Identity-Select Dropdown Menu
	// this might get conflicts with other code, so use the cloned Dropdown-Menu instead
	addSmartIdentitiesToCloneMenu: function(all_addresses) {
		vI.helper.addSeparatorToCloneMenu();
		var object = vI_msgIdentityClone.elements.Obj_MsgIdentityPopup_clone
		var accountname = document.getElementById("prettyName-Prefix").getAttribute("label")
				+ vI_msgIdentityClone.elements.Obj_MsgIdentity_clone
									.getAttribute("accountname")
		for (index = 0; index < all_addresses.number; index++)
			vI.helper.addIdentityMenuItem(object, all_addresses.combinedNames.value[index],
				accountname, "", "vid")
	},
}
