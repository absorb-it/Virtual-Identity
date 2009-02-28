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

var vI_smartIdentity = {
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
			
		switch (type) {
			case msgComposeType.ForwardAsAttachment:
			case msgComposeType.ForwardInline:
			case msgComposeType.Reply:
			case msgComposeType.ReplyAll:
			case msgComposeType.ReplyToGroup: // reply to a newsgroup, would possibly be stopped later
			case msgComposeType.ReplyToSender:
			case msgComposeType.ReplyToSenderAndGroup: // reply to a newsgroup, would possibly be stopped later
			case msgComposeType.ReplyWithTemplate:
				vI_smartIdentity.Reply(); break;
			case msgComposeType.Draft:
			case msgComposeType.Template:
				vI_smartIdentity.Draft(); break;
			case msgComposeType.New:
			case msgComposeType.NewsPost:
			case msgComposeType.MailToUrl:
				vI_smartIdentity.NewMail(); break;
			}
	},
		
	// this function adds a timestamp to the current sender
	__autoTimestamp : function() {
		vI_notificationBar.dump("## vI_smartIdentity: __autoTimestamp()\n");
		if (document.getElementById("msgIdentity_clone").vid) {
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

		document.getElementById("msgIdentity_clone").email = new_email;
	},
	
	NewMail : function() {
		var storageIdentities = new identityCollection();
		vI_storage.getVIdentityFromAllRecipients(storageIdentities);
		
		if (storageIdentities.number > 0) vI_smartIdentity.__smartIdentitySelection(storageIdentities, false)
		else if (vI.preferences.getBoolPref("autoTimestamp")) vI_smartIdentity.__autoTimestamp();	
	},
	
	ReplyOnSent : function(hdr) {
		vI_notificationBar.dump("## vI_smartIdentity: ReplyOnSent() (rules like SmartDraft)\n");
		
		var allIdentities = new identityCollection();

		vI_smartIdentity.__SmartDraftOrReplyOnSent(hdr, allIdentities);
		var storageIdentities = new identityCollection();
		vI_storage.getVIdentityFromAllRecipients(storageIdentities);
		
		allIdentities.mergeWithoutDuplicates(storageIdentities);
			
		if (allIdentities.number > 0) vI_smartIdentity.__smartIdentitySelection(allIdentities, true);

	},

	Draft : function() {
		vI_notificationBar.dump("## vI_smartIdentity: Draft()\n");
		
		var allIdentities = new identityCollection();

		var draftHdr = vI_smartIdentity.messenger.
			messageServiceFromURI(gMsgCompose.originalMsgURI).messageURIToMsgHdr(gMsgCompose.originalMsgURI);
		// fails with seamonkey 1.1.11, so just try to read to draft id
		try { draftHdr = vI_smartIdentity.messenger.
			messageServiceFromURI(gMsgCompose.compFields.draftId).messageURIToMsgHdr(gMsgCompose.compFields.draftId);
		} catch (ex) { };

		vI_smartIdentity.__SmartDraftOrReplyOnSent(draftHdr, allIdentities);
		var storageIdentities = new identityCollection();
		vI_storage.getVIdentityFromAllRecipients(storageIdentities);
		
		allIdentities.mergeWithoutDuplicates(storageIdentities);
			
		if (allIdentities.number > 0) vI_smartIdentity.__smartIdentitySelection(allIdentities, true);
	},
	
	__parseHeadersWithArray: function(hdr, allIdentities) {
		var emails = {}; var fullNames = {}; var combinedNames = {};
		var number = vI.headerParser.parseHeadersWithArray(hdr, emails, fullNames, combinedNames);
		for (var index = 0; index < number; index++) {
			var newIdentity = new identityData(emails.value[0], fullNames.value[0],
				null, null, null, null);
			allIdentities.addWithoutDuplicates(newIdentity);
		}
	},

	// this function checks if we have a draft-case and Smart-Draft should replace the Identity
	__SmartDraftOrReplyOnSent : function(hdr, allIdentities) {
		if (!vI.preferences.getBoolPref("smart_draft"))
			{ vI_notificationBar.dump("## vI_smartIdentity: SmartDraft deactivated\n"); return; }

		vI_notificationBar.dump("## vI_smartIdentity: __SmartDraftOrReplyOnSent()\n");

		if (hdr) {
			vI_smartIdentity.__parseHeadersWithArray(hdr.author, allIdentities)
			vI_notificationBar.dump("## vI_smartIdentity: sender '" + allIdentities.identityDataCollection[0].combinedName + "'\n");
		}
		else vI_notificationBar.dump("## vI_smartIdentity: __SmartDraftOrReplyOnSent: No Header found, shouldn't happen\n");
	},
	
	__filterAddresses : function(smartIdentities) {
		var returnIdentities = new identityCollection();
		
		var filterList	=
			vI.unicodeConverter.ConvertToUnicode(vI.preferences.getCharPref("smart_reply_filter")).split(/\n/)
		if (filterList.length == 0) filterList[0] == ""
		
		for (var i = 0; i < filterList.length; i++) {
			const filterType = { None : 0, RegExp : 1, StrCmp : 2 }
			var recentfilterType; var skipRegExp = false;
			if (filterList.length <= 1 && filterList[0] == "")
				{ vI_notificationBar.dump("## vI_smartIdentity: no filters configured\n"); recentfilterType = filterType.None; }
			else if (/^\/(.*)\/$/.exec(filterList[i]))
				{ vI_notificationBar.dump("## vI_smartIdentity: filter emails with RegExp '"
					+ filterList[i].replace(/\\/g,"\\\\") + "'\n"); recentfilterType = filterType.RegExp; }
			else	{ vI_notificationBar.dump("## vI_smartIdentity: filter emails, compare with '"
					+ filterList[i] + "'\n"); recentfilterType = filterType.StrCmp; }
			for (var j = 0; j < smartIdentities.number; j++) { // check if recent email-address (pre-choosen identity) is found in 
			// copied and adapted from correctIdentity, thank you for the RegExp-idea!
				var add_addr = false;
				switch (recentfilterType) {
					case filterType.None:
						add_addr = true; break;
					case filterType.RegExp:
						if (skipRegExp) break;
						try { 	/^\/(.*)\/$/.exec(filterList[i]);
							add_addr =  (smartIdentities.identityDataCollection[j].email.match(new RegExp(RegExp.$1,"i")))
						}
						catch(vErr) {
							vI_notificationBar.addNote(
								vI.elements.strings.getString("vident.smartIdentity.ignoreRegExp") +
								+filterList[i].replace(/\\/g,"\\\\") + " .",
								"smart_reply_notification");
								skipRegExp = true; }
						break;
					case filterType.StrCmp:
						add_addr = ( smartIdentities.identityDataCollection[j].email.toLowerCase().indexOf(filterList[i].toLowerCase()) != -1)
						break;
				}
				if (add_addr)	returnIdentities.addWithoutDuplicates(smartIdentities.identityDataCollection[j])
			}
		}
		smartIdentities.takeOver(returnIdentities);
	},
	
	__smartReplyCollectAddresses : function(hdr, allIdentities) {
		// add emails from selected headers (stored by vI_getHeader.xul/js)
		var reply_headers = vI.unicodeConverter.ConvertToUnicode(vI.preferences.getCharPref("smart_reply_headers")).split(/\n/)
					
		for (var index = 0; index < reply_headers.length; index++) {
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
			
			// if mailing-list ignore to-header (usually the mailing list address)
			if (replyHeaderNameToRead == "to" && hdr.getStringProperty("vI_list-id")) {
				vI_notificationBar.dump("## vI_smartIdentity: header 'list-id' found (mailinglist), skipping header 'to'\n");
				continue;
			}
			
			// ------------- read the stored header -------------------------------
			var value = vI.unicodeConverter.ConvertToUnicode(hdr.getStringProperty("vI_" + replyHeaderNameToRead))
			vI_notificationBar.dump("## vI_smartIdentity: reading header '" +
				replyHeaderNameToRead + "': '" + value + "'\n");
			
			// ------------- parse address-string to get a field of single email-addresses
			var splitted = new identityCollection();
			vI_smartIdentity.__parseHeadersWithArray(value, splitted);
			
			// move found addresses step by step to allIdentities, and change values if requested
			for (var i = 0; i < splitted.number; i++) {
				// if there is no email than it makes no sense to use it as a sender
				if (!splitted.identityDataCollection[i].email.match(/^.*@.*$/)) {
					vI_notificationBar.dump("## vI_smartIdentity:   skipping '" +
					splitted.identityDataCollection[i].email + "', no email\n")
					continue;
				}

				if (replyHeaderEmptyFullNames) splitted.identityDataCollection[i].fullName = ""

				allIdentities.addWithoutDuplicates(splitted.identityDataCollection[i]);

				vI_notificationBar.dump("## vI_smartIdentity:   found '" +
					splitted.identityDataCollection[i].combinedName + "'\n")
			}
		}
	},
	
	Reply : function() {
		var hdr = vI_smartIdentity.messenger.
			messageServiceFromURI(gMsgCompose.originalMsgURI).messageURIToMsgHdr(gMsgCompose.originalMsgURI);

		vI_notificationBar.dump("## vI_smartIdentity: Reply()\n");
		
		if (hdr && !gMsgCompose.compFields.newsgroups && !hdr.getStringProperty("vI_received")) { // mail was not received
				vI_notificationBar.dump("## vI_smartIdentity: reply on non-received (sent?) mail. Using SmartDraft. \n");
				vI_smartIdentity.ReplyOnSent(hdr);
				return;
		}
				
		var storageIdentities = new identityCollection();
		vI_storage.getVIdentityFromAllRecipients(storageIdentities);
		
		var smartIdentities = new identityCollection();
		if (storageIdentities.number == 0 || !vI.preferences.getBoolPref("idSelection_storage_ignore_smart_reply"))
			vI_smartIdentity.__SmartReply(hdr, smartIdentities);
		else vI_notificationBar.dump("## vI_smartIdentity: SmartReply skipped, Identities in Storage found.\n");

		// merge SmartReply-Identities and Storage-Identites
		if (vI.preferences.getBoolPref("idSelection_storage_prefer_smart_reply"))
			{ smartIdentities.mergeWithoutDuplicates(storageIdentities); allIdentities = smartIdentities; }
		else
			{ storageIdentities.mergeWithoutDuplicates(smartIdentities); allIdentities = storageIdentities; }
		
		vI_notificationBar.dump("## vI_smartIdentity: merged SmartReply & Storage, " + allIdentities.number + " address(es) left\n")
		
		if (allIdentities.number > 0) vI_smartIdentity.__smartIdentitySelection(allIdentities, false);
	},
	
	// this function checks if we have a reply-case and Smart-Reply should replace the Identity
	__SmartReply : function(hdr, smartIdentities) {
		if (!vI.preferences.getBoolPref("smart_reply"))
			{ vI_notificationBar.dump("## vI_smartIdentity: SmartReply deactivated\n"); return; }
		if (gMsgCompose.compFields.newsgroups && !vI.preferences.getBoolPref("smart_reply_for_newsgroups")) {
			vI_notificationBar.dump("## vI_smartIdentity: SmartReply, answering to a newsgroup, aborting\n");
			return;
		}

		vI_notificationBar.dump("## vI_smartIdentity: __SmartReply()\n");
		vI_notificationBar.dump("## vI_smartIdentity: ----------------------------------------------------------\n")
		if (hdr) {
			/* first step: collect addresses */
			vI_smartIdentity.__smartReplyCollectAddresses(hdr, smartIdentities);
			vI_notificationBar.dump("## vI_smartIdentity: " + smartIdentities.number + " address(es) after parsing, before filtering\n")
			
			/* second step: filter (and sort) addresses */
			vI_smartIdentity.__filterAddresses(smartIdentities);
			
			vI_notificationBar.dump("## vI_smartIdentity: filtering done, " + smartIdentities.number + " address(es) left\n")
			
			/* set default FullName */
			var smart_reply_defaultFullName = vI.unicodeConverter.ConvertToUnicode(vI.preferences.getCharPref("smart_reply_defaultFullName"))
			if (smart_reply_defaultFullName != "") {
				for (var index = 0; index < smartIdentities.number; index++) {
					if (smartIdentities.identityDataCollection[index].fullName == "") {
						smartIdentities.identityDataCollection[index].fullName = smart_reply_defaultFullName
						vI_notificationBar.dump("## vI_smartIdentity: added default FullName '" + 
							smart_reply_defaultFullName + "' to '" + smartIdentities.identityDataCollection[index].email + "'\n")
					}
				}
			}	

			/* smart_reply_ignoreFullName: compare email with other Identities			*/
			/* if match replace FullName with existing one, keep identity in list by now 		*/
			/* will not be added to the menu but probably choosen with __smartIdentitySelection 	*/
			if (vI.preferences.getBoolPref("smart_reply_ignoreFullName")) {
				vI_notificationBar.dump("## vI_smartIdentity: compare with existing Identities (ignoring FullNames).\n")
			
				for (var index = 0; index < smartIdentities.number; index++) {
					var idKey = smartIdentities.identityDataCollection[index].isExistingIdentity(true);
					if (idKey) {
						var newFullName = gAccountManager.getIdentity(idKey).fullName;
						smartIdentities.identityDataCollection[index].fullName = newFullName;
						vI_notificationBar.dump("## vI_smartIdentity: replaced Fullname of '" + smartIdentities.identityDataCollection[index].email + "' with '" + newFullName + "' \n");
					}
				}
			}
		}
		else vI_notificationBar.dump("## vI_smartIdentity: SmartReply skipped. No Header-information found.\n");
		
		vI_notificationBar.dump("## vI_smartIdentity: ----------------------------------------------------------\n")
	},
	
	__smartIdentitySelection : function(allIdentities, autocreate) {
		document.getElementById("msgIdentity_clone").addIdentitiesToCloneMenu(allIdentities);
		
		if (!autocreate && vI.preferences.getBoolPref("idSelection_ask") && 
			((allIdentities.number == 1 && vI.preferences.getBoolPref("idSelection_ask_always"))
				|| allIdentities.number > 1))
			window.openDialog("chrome://v_identity/content/vI_smartReplyDialog.xul",0, // give the Dialog a unique id
					"chrome, dialog, modal, alwaysRaised, resizable=yes",
					 allIdentities,
					/* callback: */ vI_smartIdentity.changeIdentityToSmartIdentity).focus();
		else if (autocreate || vI.preferences.getBoolPref("idSelection_autocreate")) {
			vI_smartIdentity.changeIdentityToSmartIdentity(allIdentities, 0);
		}	
	},
	
	changeIdentityToSmartIdentity : function(allIdentities, selectedValue) {
		document.getElementById("msgIdentity_clone").selectedMenuItem = allIdentities.menuItems[selectedValue];
		
		if (document.getElementById("msgIdentity_clone").vid) {
			var label=vI.elements.strings.getString("vident.smartIdentity.vIUsage");
			if (allIdentities.number > 1) label += " "
				+ vI.elements.strings.getString("vident.smartIdentity.moreThanOne");
			vI_notificationBar.addNote(label + ".", "smart_reply_notification");
		}
		vI_smartIdentity.__removeSmartIdentityFromRecipients(allIdentities, selectedValue);
	},
	
	__removeSmartIdentityFromRecipients : function(allIdentities, index) {
		var skip_bcc = false;
		
		if (getCurrentIdentity().doBcc) {
			var bcc_addresses = new identityCollection();
			vI_smartIdentity.__parseHeadersWithArray(getCurrentIdentity().doBccList, bcc_addresses);
			
			for (var i = 0; i < bcc_addresses.number; i++) {
				if (allIdentities.identityDataCollection[index].email == bcc_addresses.identityDataCollection[i].email) {
					skip_bcc = true; break;
				}
			}
		}
		
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
					vI_notificationBar.addNote(" " +
						vI.elements.strings.getString("vident.smartIdentity.remRecipient"),
						"smart_reply_notification");
					break;
			}
		}
	}
}
