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
		
	smartIdentity_BaseIdentity : null,

	clean : function() {
		vI_smartIdentity.smartIdentity_BaseIdentity = null;
	},
	
	// After Loading the MessageComposeDialog, check if smartIdentity is needed
	init : function() {
		var type = gMsgCompose.type;
		var msgComposeType = Components.interfaces.nsIMsgCompType;
		vI_notificationBar.dump("## vI_smartIdentity: msgComposeType = " + type + "\n");
		
		//~ if (vI.preferences.getBoolPref("autoTimestamp") && 
			//~ ((type == msgComposeType.New) || (type == msgComposeType.NewsPost) || (type == msgComposeType.MailToUrl)))
					//~ vI_smartIdentity.SmartTimestamp(hdr);
					
		// if there is no ID of the original Message  (Why?) leave the function
		var uri = gMsgCompose.originalMsgURI; 
		if (!uri) vI_notificationBar.dump("## vI_smartIdentity: can't get URI of former Message\n");
		try { var hdr = vI_smartIdentity.messenger.messageServiceFromURI(uri).messageURIToMsgHdr(uri); }
		catch(vErr) {
			vI_notificationBar.dump("## vI_smartIdentity: can't get Message Header of former Message.\n");
			hdr = null;
		};
		
		switch (type) {
			case msgComposeType.ForwardAsAttachment:
			case msgComposeType.ForwardInline:
			case msgComposeType.Reply:
			case msgComposeType.ReplyAll:
			case msgComposeType.ReplyToGroup: // reply to a newsgroup, would possibly be stopped later
			case msgComposeType.ReplyToSender:
			case msgComposeType.ReplyToSenderAndGroup: // reply to a newsgroup, would possibly be stopped later
			case msgComposeType.ReplyWithTemplate:
				if (vI.preferences.getBoolPref("smart_reply"))
					vI_smartIdentity.SmartReply(hdr);
				break;
			case msgComposeType.Draft:
			case msgComposeType.Template:
				if (vI.preferences.getBoolPref("smart_draft"))
					vI_smartIdentity.SmartDraft(hdr);
				break;
			case msgComposeType.New:
			case msgComposeType.NewsPost:
			case msgComposeType.MailToUrl:
				vI_smartIdentity.SmartNewMail();
				break;

			}
	},
		
	// this function adds a timestamp to the current sender
	SmartTimestamp : function() {
		vI_notificationBar.dump("## vI_smartIdentity: SmartTimestamp()\n");
		if (vI_msgIdentityClone.elements.Obj_MsgIdentity_clone.getAttribute("value") == "vid") {
			vI_notificationBar.dump("## vI_smartIdentity: Virtual Identity in use, aborting\n");
			return;
		}

		current_email = getCurrentIdentity().email;
		vI_notificationBar.dump("## vI_smartIdentity: current email: " + current_email + "\n");
		
		var dateobj = new Date();
		new_email = current_email.replace(/@/g, parseInt(dateobj.getTime()/1000)+"@");
		vI_notificationBar.dump("## vI_smartIdentity: new email: " + new_email + "\n");

		vI_notificationBar.setNote(vI.elements.strings.getString("vident.smartIdentity.vIUsage") + ".",
					"smart_reply_notification");
		vI_msgIdentityClone.setIdentity(getCurrentIdentity().fullName + " <" + new_email + ">", "timeStamp");
	},
	
	SmartNewMail : function() {
		var all_addresses = { number : 0, emails : {}, fullNames : {}, combinedNames : {}, id_keys : {}, smtp_keys : {} };
		vI_storage.getVIdentityFromAllRecipients(all_addresses);
		vI_notificationBar.dump("## vI_smartIdentity: checked for stored VIdentities and found " + all_addresses.number + " address(es)\n")

		if (all_addresses.number > 0)
			vI_smartIdentity.smartIdentitySelection(all_addresses, false)
		else if (vI.preferences.getBoolPref("autoTimestamp"))
			vI_smartIdentity.SmartTimestamp();	
	},
	
	// this function checks if we have a draft-case and Smart-Draft should replace the Identity
	SmartDraft : function(hdr) {
		vI_notificationBar.dump("## vI_smartIdentity: SmartDraft()\n");
			
		var all_addresses = { number : 1, emails : {}, fullNames : {}, combinedNames : {}, id_keys : {}, smtp_keys : {}  };
		
		if (hdr) {
			vI.headerParser.parseHeadersWithArray(hdr.author, all_addresses.emails,
				all_addresses.fullNames, all_addresses.combinedNames);
			all_addresses.emails[0] = all_addresses.emails.value[0]
			all_addresses.fullNames[0] = all_addresses.fullNames.value[0]
			all_addresses.combinedNames[0] = all_addresses.combinedNames.value[0]
			
			vI_notificationBar.dump("## vI_smartIdentity: sender '" + all_addresses.combinedNames[0] + "'\n");
		}
		else vI_notificationBar.dump("## vI_smartIdentity: SmartDraft: No Header found, shouldn't happen\n");
		
		var storage_addresses = { number : 0, emails : {}, fullNames : {}, combinedNames : {}, id_keys : {}, smtp_keys : {} };
		vI_storage.getVIdentityFromAllRecipients(storage_addresses);
		
		vI_notificationBar.dump("## vI_smartIdentity: checked for stored VIdentities and found " + storage_addresses.number + " address(es)\n")
		
		all_addresses = vI_smartIdentity.mergeWithoutDuplicates(all_addresses, storage_addresses);
			
		vI_smartIdentity.smartIdentitySelection(all_addresses, true);
	},
	
	// check if recent email-address (pre-choosen identity) is found in at least one address
	matchSelectedIdentity : function(all_addresses) {
		vI_notificationBar.dump("## vI_smartIdentity: search for preselected Identity\n");
		current_email = getCurrentIdentity().email.toLowerCase();
		vI_notificationBar.dump("## vI_smartIdentity: preselected email: " + current_email + "\n");
		current_name =  getCurrentIdentity().fullName.toLowerCase();
		vI_notificationBar.dump("## vI_smartIdentity: preselected name: " + current_name + "\n");
		for (index = 0; index < all_addresses.number; index++) {
			if (current_email == all_addresses.emails[index].toLowerCase()
				&& (vI.preferences.getBoolPref("smart_reply_ignoreFullName") ||
				current_name == all_addresses.fullNames[index].toLowerCase())) {
					vI_notificationBar.dump("## vI_smartIdentity:   found preselected Identity in address sets, aborting\n");
					return true; // direct hit
				}
		}
		vI_notificationBar.dump("## vI_smartIdentity:   collected address(es) doesn't contain preselected Identity, continuing\n");
		return false;
	},
	
	// checks if any Identity in the collected address-set is already available as
	// a stored identity. If so, use the stored one.
	matchAnyIdentity : function(all_addresses) {
		vI_notificationBar.dump("## vI_smartIdentity: check if any collected address is stored as a (usual) Identity\n");
		var accounts = queryISupportsArray(gAccountManager.accounts, Components.interfaces.nsIMsgAccount);
		for (var i in accounts) {
			// check for VirtualIdentity Account
			try {	vI_account.prefroot.getBoolPref("mail.account." + accounts[i].key + ".vIdentity");
				continue; } catch (e) { };
			
			var server = accounts[i].incomingServer;
			// ignore newsgroup accounts if not selected in preferences
			if (server && server.type == "nntp" &&
				!vI.preferences.getBoolPref("smart_reply_for_newsgroups")) continue;
			
			var identities = queryISupportsArray(accounts[i].identities, Components.interfaces.nsIMsgIdentity);
			for (var j in identities) {
				for (index = 0; index < all_addresses.number; index++) {
					if (identities[j].getUnicharAttribute("useremail").toLowerCase() ==
						all_addresses.emails[index].toLowerCase() &&
						(vI.preferences.getBoolPref("smart_reply_ignoreFullName") ||
						identities[j].getUnicharAttribute("fullName").toLowerCase() ==
						all_addresses.fullNames[index].toLowerCase())) {
							vI_notificationBar.dump("## vI_smartIdentity:   found existing Identity in address sets, aborting\n");
							return identities[j];
						}
					}
				}
			}
		vI_notificationBar.dump("## vI_smartIdentity:   no collected address found stored, continuing\n");
		return null;
	},

	
	filterAddresses : function(all_addresses) {
		var return_addresses = { number : 0, emails : { }, fullNames : { }, combinedNames : { },
					id_keys : { }, smtp_keys : { } };
		
		var filter_list = vI.unicodeConverter.ConvertToUnicode(vI.preferences.getCharPref("smart_reply_filter")).split(/\n/)
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
							add_addr =  (all_addresses.emails[j].match(new RegExp(RegExp.$1,"i")))
						}
						catch(vErr) {
							vI_notificationBar.addNote(
								vI.elements.strings.getString("vident.smartIdentity.ignoreRegExp") +
								+filter_list[i].replace(/\\/g,"\\\\") + " .",
								"smart_reply_notification");
								skipRegExp = true; }
						break;
					case filterType.StrCmp:
						add_addr = (filter_list[i] == all_addresses.emails[j])
						break;
				}
				if (add_addr)	return_addresses = vI_smartIdentity.addWithoutDuplicates(return_addresses,
						all_addresses.emails[j],
						all_addresses.fullNames[j],
						all_addresses.combinedNames[j], null, null)
			}
		}
		return return_addresses;
	},
	
	mergeWithoutDuplicates : function(all_addresses, add_addresses) {
		for (index = 0; index < add_addresses.number; index++)
			vI_smartIdentity.addWithoutDuplicates(all_addresses,
				add_addresses.emails[index],
				add_addresses.fullNames[index],
				add_addresses.combinedNames[index],
				add_addresses.id_keys[index],
				add_addresses.smtp_keys[index])
		return all_addresses
	},
	
	addWithoutDuplicates : function(all_addresses, email, fullName, combinedName, id_key, smtp_key) {
		for (index = 0; index < all_addresses.number; index++) {
			if (all_addresses.emails[index] == email &&
				(!all_addresses.id_keys[index] || !id_key || 
					(all_addresses.id_keys[index] == id_key && all_addresses.smtp_keys[index] == smtp_key))) {
				// found, so check if we can use the Name of the new field
				if (all_addresses.fullNames[index] == "" && fullName != "") {
					all_addresses.fullNames[index] = fullName
					all_addresses.combinedNames[index] = combinedName
					vI_notificationBar.dump("## vI_smartIdentity:   added fullName '" + fullName
						+ "' to stored email '" + email +"'\n")
				}
				// check if id_key or smtp_key can be used
				if (!all_addresses.id_keys[index] && id_key) {
					all_addresses.id_keys[index] = id_key;
					all_addresses.smtp_keys[index] = smtp_key;
					vI_notificationBar.dump("## vI_smartIdentity:   added id '" + id_key
						+ "' smtp '" + smtp_key + "' to stored email '" + email +"'\n")
				}
				return all_addresses;
			}
		}
		vI_notificationBar.dump("## vI_smartIdentity:   add new address to result:" + combinedName + "\n")
		all_addresses.emails[index] = email;
		all_addresses.fullNames[index] = fullName;
		all_addresses.combinedNames[index] = combinedName;
		all_addresses.id_keys[index] = id_key;
		all_addresses.smtp_keys[index] = smtp_key;
		all_addresses.number = index + 1;
		return all_addresses;
	},
	
	collectAddresses : function(all_addresses, hdr) {
		// add emails from selected headers (stored by vI_getHeader.xul/js)
		var reply_headers = vI.unicodeConverter.ConvertToUnicode(vI.preferences.getCharPref("smart_reply_headers")).split(/\n/)
					
		for (index = 0; index < reply_headers.length; index++) {
			// ------------- prepare fields to read the stored header ----------------
			var replyHeader_splitted = reply_headers[index].split(/:/)
			// use first part (all before ':') as the header name
			var replyHeaderName = replyHeader_splitted[0].toLowerCase()
			// check second or third part for any number
			var replyHeaderNumber = parseInt(replyHeader_splitted[1])
			if (isNaN(replyHeaderNumber)) replyHeaderNumber = parseInt(replyHeader_splitted[2])
			// check if Fullnames should be erased
			var replyHeaderEmptyFullNames = ((replyHeader_splitted[1] && replyHeader_splitted[1].match(/@/)) ||
							(replyHeader_splitted[2] && replyHeader_splitted[2].match(/@/)))
			
			// create header name to find the value
			var replyHeaderNameToRead = replyHeaderName
			if (!isNaN(replyHeaderNumber)) replyHeaderNameToRead += ":" + replyHeaderNumber

			// ------------- read the stored header -------------------------------
			var value = vI.unicodeConverter.ConvertToUnicode(hdr.getStringProperty("vI_" + replyHeaderNameToRead))
			vI_notificationBar.dump("## vI_smartIdentity: reading header '" +
				replyHeaderNameToRead + "'\n");
			
			// ------------- parse address-string to get a field of single email-addresses
			var splitted = { number : 0, emails : {}, fullNames : {}, combinedNames : {} };
			splitted.number = vI.headerParser.parseHeadersWithArray(value, splitted.emails,
				splitted.fullNames, splitted.combinedNames);
			
			// move found addresses step by step to all_addresses, and change values if requested
			for (i = 0; i < splitted.number; i++) {
				all_addresses.emails[all_addresses.number] = splitted.emails.value[i]
				
				// empty FullName if requested
				if (replyHeaderEmptyFullNames) splitted.fullNames.value[i] = ""
				all_addresses.fullNames[all_addresses.number] = splitted.fullNames.value[i]	
				
				// set CombinedName related to new values
				if (all_addresses.fullNames[all_addresses.number] != "")
					all_addresses.combinedNames[all_addresses.number] =
						all_addresses.fullNames[all_addresses.number] + " <" +
						all_addresses.emails[all_addresses.number] + ">"
				else all_addresses.combinedNames[all_addresses.number] =
					all_addresses.emails[all_addresses.number]
					
				// mark id and smtp as empty
				all_addresses.id_keys[all_addresses.number] = null;
				all_addresses.smtp_keys[all_addresses.number] = null;
				
				vI_notificationBar.dump("## vI_smartIdentity:   found '" +
					all_addresses.combinedNames[all_addresses.number++] + "'\n")
			}
		}	
	},
	
	// this function checks if we have a reply-case and Smart-Reply should replace the Identity
	SmartReply : function(hdr) {
		vI_notificationBar.dump("## vI_smartIdentity: SmartReply()\n");
		
		if (gMsgCompose.compFields.newsgroups && !vI.preferences.getBoolPref("smart_reply_for_newsgroups")) {
			vI_notificationBar.dump("## vI_smartIdentity: answering to a newsgroup, aborting\n");
			return;
		}
		
		var all_addresses = { number : 0, emails : {}, fullNames : {}, combinedNames : {}, id_keys : {}, smtp_keys : {} };
		var storage_addresses = { number : 0, emails : {}, fullNames : {}, combinedNames : {}, id_keys : {}, smtp_keys : {} };
		
		/* first step: collect addresses */
		
		// check if Storage-search should be used in SmartReply-case
		if (vI.preferences.getBoolPref("idSelection_storage_use_for_smart_reply")) {
			vI_storage.getVIdentityFromAllRecipients(storage_addresses);
			vI_notificationBar.dump("## vI_smartIdentity: checked for stored VIdentities and found " + storage_addresses.number + " address(es)\n")
		}
		
		vI_notificationBar.dump("## vI_smartIdentity: ----------------------------------------------------------\n")
		if (hdr) {
			if (storage_addresses.number == 0 || !vI.preferences.getBoolPref("idSelection_storage_ignore_smart_reply")) {
			
				vI_smartIdentity.collectAddresses(all_addresses, hdr);
				
				vI_notificationBar.dump("## vI_smartIdentity: " + all_addresses.number + " address(es) after parsing, before filtering\n")
				
				/* second step: filter (and sort) addresses */
				
				all_addresses = vI_smartIdentity.filterAddresses(all_addresses);
				
				vI_notificationBar.dump("## vI_smartIdentity: filtering done, " + all_addresses.number + " address(es) left\n")
				
				var smart_reply_defaultFullName = vI.unicodeConverter.ConvertToUnicode(vI.preferences.getCharPref("smart_reply_defaultFullName"))
				if (smart_reply_defaultFullName != "") {
					for (index = 0; index < all_addresses.number; index++) {
						if (all_addresses.fullNames[index] == "") {
							all_addresses.fullNames[index] = smart_reply_defaultFullName
							all_addresses.combinedNames[index] =
								smart_reply_defaultFullName + " <" + all_addresses.emails[index] + ">"
							vI_notificationBar.dump("## vI_smartIdentity: added default FullName '" + 
								smart_reply_defaultFullName + "' to '" + all_addresses.emails[index] + "'\n")
						}
					}
				}	
			}
			else vI_notificationBar.dump("## vI_smartIdentity: SmartReply skipped, Identities in Storage found.\n");
		}
		else vI_notificationBar.dump("## vI_smartIdentity: SmartReply skipped. No Header-information found.\n");
		
		vI_notificationBar.dump("## vI_smartIdentity: ----------------------------------------------------------\n")
		
		// merge SmartReply-Identities and Storage-Identites
		if (vI.preferences.getBoolPref("idSelection_storage_prefer_smart_reply"))
			all_addresses = vI_smartIdentity.mergeWithoutDuplicates(all_addresses, storage_addresses)
		else
			all_addresses = vI_smartIdentity.mergeWithoutDuplicates(storage_addresses, all_addresses)
		
		vI_notificationBar.dump("## vI_smartIdentity: merged SmartReply & Storage, " + all_addresses.number + " address(es) left\n")
		
		if (all_addresses.number == 0) return;
		
		if (vI_smartIdentity.matchSelectedIdentity(all_addresses)) return;
		
		if (vI_smartIdentity.smartIdentity_BaseIdentity = vI_smartIdentity.matchAnyIdentity(all_addresses)) {
			vI_notificationBar.dump("## vI_smartIdentity:  existing Identity key: " + vI_smartIdentity.smartIdentity_BaseIdentity.key + "\n")
			vI_notificationBar.addNote(
				vI.elements.strings.getString("vident.smartIdentity.matchExisting"),
				"smart_reply_notification");
			window.setTimeout(vI_smartIdentity.updateMsgComposeDialog, 0);
			return;
		}

		/* third step: select address */
		vI_smartIdentity.smartIdentitySelection(all_addresses, false);
	},
	
	smartIdentitySelection : function(all_addresses, autocreate) {
		vI_msgIdentityClone.addIdentitiesToCloneMenu(all_addresses);
		
		if (!autocreate && vI.preferences.getBoolPref("idSelection_ask") && 
			((all_addresses.number == 1 && vI.preferences.getBoolPref("idSelection_ask_always"))
				|| all_addresses.number > 1))
			window.openDialog("chrome://v_identity/content/vI_smartReplyDialog.xul",0, // give the Dialog a unique id
					"chrome, dialog, modal, alwaysRaised, resizable=yes",
					 all_addresses,
					/* callback: */ vI_smartIdentity.changeIdentityToSmartIdentity).focus();
		else if (autocreate || vI.preferences.getBoolPref("idSelection_autocreate")) {
			var label=vI.elements.strings.getString("vident.smartIdentity.vIUsage");
			if (all_addresses.number > 1) label += " "
				+ vI.elements.strings.getString("vident.smartIdentity.moreThanOne");
			vI_notificationBar.addNote(label + ".", "smart_reply_notification");
			vI_smartIdentity.changeIdentityToSmartIdentity(all_addresses, 0);
		}	
	},
	
	changeIdentityToSmartIdentity : function(all_addresses, selectedValue) {
		if (all_addresses.id_keys[selectedValue]) {
			vI_msgIdentityClone.setMenuToIdentity(all_addresses.id_keys[selectedValue])
			vI_smtpSelector.setMenuToKey(all_addresses.smtp_keys[selectedValue])
		}
		vI_msgIdentityClone.setIdentity(all_addresses.combinedNames[selectedValue], null);
		vI_smartIdentity.removeSmartIdentityFromRecipients(all_addresses, selectedValue);
	},
	
	removeSmartIdentityFromRecipients : function(all_addresses, index) {
		var bcc_addresses = { number : 1, emails : {}, fullNames : {}, combinedNames : {} };
		var skip_bcc = false;
		
		if (getCurrentIdentity().doBcc) {
			vI.headerParser.parseHeadersWithArray(getCurrentIdentity().doBccList, bcc_addresses.emails,
				bcc_addresses.fullNames, bcc_addresses.combinedNames);
			
			for (index = 0; index < bcc_addresses.number; index++) {
				if (all_addresses.emails[index] == bcc_addresses.emails.value[index]) {
					skip_bcc = true; break;
				}
			}
		}
		
		for (var row = 1; row <= top.MAX_RECIPIENTS; row ++) {
			var popup = awGetPopupElement(row);
			var input = awGetInputElement(row);
			// check if the entry is used as a BCC selected in account settings
			if ((awGetPopupElement(row).selectedItem.getAttribute("value") == "addr_bcc") && skip_bcc) continue;
			// check if entry is matching senders address, if so, remove it
			if (input.value == all_addresses.emails[index] ||
				input.value == all_addresses.combinedNames[index]) {
					awSetInputAndPopupValue(input, "", popup, "addr_to", -1);
					awCleanupRows()
					vI_notificationBar.addNote(" " +
						vI.elements.strings.getString("vident.smartIdentity.remRecipient"),
						"smart_reply_notification");
					break;
			}
		}
	},
	
	updateMsgComposeDialog : function() {
		vI_msgIdentityClone.setMenuToIdentity(vI_smartIdentity.smartIdentity_BaseIdentity.key);
		// after inserting a new signature (as part of the new identity) the cursor is not at the right place.
		// there is no easy way to set the cursor at the end, before the signature, so set it at the beginning.
		if (vI_smartIdentity.smartIdentity_BaseIdentity.attachSignature)
			gMsgCompose.editor.beginningOfDocument();
	},
}
