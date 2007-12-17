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

    Contributor(s): Mike Krieger, Sebastian Apel
 * ***** END LICENSE BLOCK ***** */
 
/**
* some code copied and adapted from 'addressContext' and from 'Birthday Reminder'
* thanks to Mike Krieger and Sebastian Apel
*/

vI_addressBook = {
	CardFields : Array("Custom1", "Custom2", "Custom3", "Custom4", "Notes"),
	addNote : "## added by Virtual Identity extension",
	
	VIdentityString : null,
	multipleRecipients : null,
	
	lastCheckedEmail : {}, // array of last checked emails per row, to prevent ugly double dialogs
	
	elements : { Obj_aBookSave : null },
	
	promptService : Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
			.getService(Components.interfaces.nsIPromptService),
			
	rdfService : Components.classes["@mozilla.org/rdf/rdf-service;1"]
			.getService(Components.interfaces.nsIRDFService),

	prefroot : Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefService)
			.getBranch(null),

	original_functions : {
		awSetInputAndPopupValue : null,
	},

	replacement_functions : {
		awSetInputAndPopupValue : function (inputElem, inputValue, popupElem, popupValue, rowNumber) {
			vI_notificationBar.dump("## vI_addressBook: awSetInputAndPopupValue '" + inputElem.id +"'\n");
			vI_addressBook.original_functions.awSetInputAndPopupValue(inputElem, inputValue, popupElem, popupValue, rowNumber);
			vI_addressBook.updateVIdentityFromABook(inputElem);
		},
	},
	
	observe: function() {
		vI_addressBook.elements.Obj_aBookSave.setAttribute("hidden",
			!vI.preferences.getBoolPref("aBook_show_switch") ||
			!vI.preferences.getBoolPref("aBook_use_non_vI") ||
			!vI.preferences.getBoolPref("aBook_use"));
		vI_addressBook.elements.Obj_aBookSave.checked = vI.preferences.getBoolPref("aBook_storedefault");
	},
	
	addObserver: function() {
		vI_addressBook.prefroot.addObserver("extensions.virtualIdentity.aBook_use", vI_addressBook, false);
		vI_addressBook.prefroot.addObserver("extensions.virtualIdentity.aBook_show_switch", vI_addressBook, false);
		vI_addressBook.prefroot.addObserver("extensions.virtualIdentity.aBook_use_non_vI", vI_addressBook, false);
		vI_addressBook.prefroot.addObserver("extensions.virtualIdentity.aBook_storedefault", vI_addressBook, false);	
	},
	
	removeObserver: function() {
		vI_addressBook.prefroot.removeObserver("extensions.virtualIdentity.aBook_use", vI_addressBook);
		vI_addressBook.prefroot.removeObserver("extensions.virtualIdentity.aBook_show_switch", vI_addressBook);
		vI_addressBook.prefroot.removeObserver("extensions.virtualIdentity.aBook_use_non_vI", vI_addressBook);
		vI_addressBook.prefroot.removeObserver("extensions.virtualIdentity.aBook_storedefault", vI_addressBook);
	},
	
	init: function() {
		vI_addressBook.elements.Obj_aBookSave = document.getElementById("aBook_save");
		vI_addressBook.addObserver();
		vI_addressBook.observe();
		
		// better approach would be to use te onchange event, but this one is not fired in any change case
		// see https://bugzilla.mozilla.org/show_bug.cgi?id=355367
		// same seems to happen with the ondragdrop event
		awGetInputElement(1).setAttribute("onblur",
			"window.setTimeout(vI_addressBook.awOnBlur, 250, this.parentNode.parentNode.parentNode);")
		awGetPopupElement(1).setAttribute("oncommand",
			"window.setTimeout(vI_addressBook.awPopupOnCommand, 250, this);")
		vI_addressBook.original_functions.awSetInputAndPopupValue = awSetInputAndPopupValue;
		awSetInputAndPopupValue = function (inputElem, inputValue, popupElem, popupValue, rowNumber) {
			vI_addressBook.replacement_functions.awSetInputAndPopupValue (inputElem, inputValue, popupElem, popupValue, rowNumber) }
	},
	
	awOnBlur : function (element) {
		// only react on events triggered by addressCol2 - textinput Elements
		if (! element.id.match(/^addressCol2*/)) return;
		vI_notificationBar.dump("## vI_addressBook: awOnBlur '" + element.id +"'\n");
		vI_addressBook.updateVIdentityFromABook(element);
	},

	awPopupOnCommand : function (element) {
		vI_notificationBar.dump("## vI_addressBook: awPopupOnCommand'" + element.id +"'\n");
		vI_addressBook.updateVIdentityFromABook(document.getElementById(element.id.replace(/^addressCol1/,"addressCol2")))
	},
	
	//~ removeNGCardsFromABook: function(remove) {
		//~ // this function will be called exclusivly from vI_prefDialog. So it is used in different context than the rest of
		//~ // the functions, access of vI.* is not possible
		//~ // given the function paramter as false it might be used to count the fields which have a VirtualIdentity stored
		
		//~ counter = 0;
		
		//~ // enumerate all of the address books on this system
		//~ var parentDir = vI_addressBook.rdfService.GetResource("moz-abdirectory://").QueryInterface(Components.interfaces.nsIAbDirectory);
		//~ var enumerator = parentDir.childNodes;
			
		//~ vI_notificationBar.dump("## vI_addressBook: Search Virtual Identities in addressbooks.\n")
		
		//~ if (remove) {
			//~ var number = vI_addressBook.removeNGCardsFromABook(false)
			//~ var strings = document.getElementById("vIdentBundle");
			//~ var warning = strings.getString("vident.clearAddressBook.statusNG.prefix") + " " + number + " " +
					//~ strings.getString("vident.clearAddressBook.statusNG.postfix") + " " + 
					//~ strings.getString("vident.clearAddressBook.warningNG")
			//~ if (!vI_addressBook.promptService.confirm(window,"Warning",warning))
				//~ return;
		//~ }
		
		//~ while (enumerator && enumerator.hasMoreElements()) {
			//~ var addrbook = enumerator.getNext();  // an addressbook directory
			//~ addrbook.QueryInterface(Components.interfaces.nsIAbDirectory);
			//~ var searchUri = (addrbook.directoryProperties?addrbook.directoryProperties.URI:addrbook.URI) + "?(or(Notes,c," + encodeURIComponent(vI_addressBook.addNote) + "))"; // search for the address in this book
			//~ var directory = vI_addressBook.rdfService.GetResource(searchUri).QueryInterface(Components.interfaces.nsIAbDirectory);
			//~ // directory will now be a subset of the addressbook containing only those cards that match the searchstring 'address'
			//~ if (!directory) break;
			
			//~ if (remove) addrbook.deleteDirectory(directory)
			//~ else {
				//~ var ChildCards = directory.childCards;
				//~ var keepGoing = 1;
				//~ try { ChildCards.first(); } catch (ex) { keepGoing = 0; }
				
				//~ while (keepGoing == 1) {
					//~ var Card = ChildCards.currentItem();
					//~ Card = Card.QueryInterface(Components.interfaces.nsIAbCard);
					//~ counter += 1;
					//~ try { ChildCards.next(); } catch (ex) {	keepGoing = 0; }
				//~ }
			//~ }
		//~ }
		//~ return counter;
	//~ },
	
	countVIdentitiesInABook : function (){
		var queryString = "?(or"
		for each (var prop in vI_addressBook.CardFields)
			queryString += "(" + prop + ",c,vIdentity:)";
		queryString += ")"
		return vI_addressBook._walkTroughCards(queryString,vI_addressBook._countVIdentities, 0)
	},
	
	_countVIdentities : function(addrbook, Card, counter) {
		if (addrbook.description != "Virtual Identity") counter += 1;
		return counter;
	},

	removeVIdentityFromABook : function() {
		// this function will be called exclusivly from vI_prefDialog. So it is used in different context than the rest of
		// the functions, access of vI.* is not possible
		var number = vI_addressBook.removeVIdentityFromABook(false)
		var strings = document.getElementById("vIdentBundle");
		var warning = strings.getString("vident.clearAddressBook.status.prefix") + " " + number + " " +
				strings.getString("vident.clearAddressBook.status.postfix") + " " + 
				strings.getString("vident.clearAddressBook.warning")
		if (!vI_addressBook.promptService.confirm(window,"Warning",warning))
			return;
		for each (var prop in vI_addressBook.CardFields) {
			var queryString = "?(or(" + prop + ",c,vIdentity:))";
			vI_addressBook._walkTroughCards(queryString,vI_addressBook._removeVIdentity,prop)
		}
	},
	
	_removeVIdentity: function(addrbook, Card, prop) {
		Card[prop.toLowerCase()] = "";
		Card.editCardToDatabase("");
	},

	_walkTroughCards : function (queryString, callFunction, returnVar) {
		var parentDir = vI_addressBook.rdfService.GetResource("moz-abdirectory://").QueryInterface(Components.interfaces.nsIAbDirectory);
		var enumerator = parentDir.childNodes;
		if (!enumerator) {vI_notificationBar.dump("## vI_addressBook: no addressbooks?\n"); return null;} // uups, no addressbooks?	
		while (enumerator && enumerator.hasMoreElements()) {
			var addrbook = enumerator.getNext();  // an addressbook directory
			addrbook.QueryInterface(Components.interfaces.nsIAbDirectory);
			var searchUri = (addrbook.directoryProperties?addrbook.directoryProperties.URI:addrbook.URI) + queryString;
			//~ vI_notificationBar.dump("## vI_addressBook: searchUri '" + searchUri + "'\n");
			//~ var directory = vI_addressBook.rdfService.GetResource(searchUri).QueryInterface(Components.interfaces.nsIAbDirectory);
			
			var AbView = Components.classes["@mozilla.org/addressbook/abview;1"].createInstance(Components.interfaces.nsIAbView);
			AbView.init(searchUri, true, null, "GeneratedName", "ascending");
			var directory = AbView.directory;
			
			// directory will now be a subset of the addressbook containing only those cards that match the searchstring
			if (!directory) break;
			var childCards = null; var keepGoing = 1;
			try { childCards = directory.childCards; childCards.first(); } catch (ex) { keepGoing = 0; }
			
			while (keepGoing == 1) {
				currentCard = childCards.currentItem();
			//~ while (directory.childNodes && directory.childNodes.hasMoreElements()) {
				//~ currentCard = directory.childNodes.getNext();
				currentCard.QueryInterface(Components.interfaces.nsIAbCard);
				//~ vI_notificationBar.dump("## vI_addressBook:             checking '" + currentCard.displayName + "'.\n")
				returnVar = callFunction(addrbook, currentCard, returnVar);
				try { childCards.next(); } catch (ex) {	keepGoing = 0; }
			}
		}
		return returnVar;
	},

	_findMatchingCard : function (addrbook, Card, returnVar) {
	//	var returnVar = { email : email, name : name, mailListName : mailListName,
	//		matchingEmailCards : { number : 0, cards : {} }, matchingFullNameCards : { number : 0, cards : {} } }
		if (addrbook.dirName == "Virtual Identity") return returnVar
		if (returnVar.email) {
			if (Card.primaryEmail.toLowerCase() == returnVar.email.toLowerCase() ||
				Card.secondEmail.toLowerCase() == returnVar.email.toLowerCase()) {
				vI_notificationBar.dump("## vI_addressBook: card found, primaryEmail '" + Card.primaryEmail.toLowerCase() + "'.\n")
				if (returnVar.name != "" && Card.displayName == returnVar.name) {
					vI_notificationBar.dump("## vI_addressBook:             matching displayed Name '" + Card.displayName + "'.\n")
					returnVar.matchingFullNameCards.cards[returnVar.matchingFullNameCards.number++] = Card;
				}
				else returnVar.matchingEmailCards.cards[returnVar.matchingEmailCards.number++] = Card;
			}
		}
		else if (returnVar.name != "" && Card.displayName == returnVar.name) {
			vI_notificationBar.dump("## vI_addressBook:             matching displayed Name '" + Card.displayName + "'.\n")
			returnVar.matchingFullNameCards.cards[returnVar.matchingFullNameCards.number++] = Card;
		}
		return returnVar;
	},

	_findMatchingCardInVIAbook : function(addrbook, Card, returnVar) {
		//~ vI_notificationBar.dump("## vI_addressBook:             aBook '" + addrbook.dirName + "'.\n")
		if (!returnVar.Card && addrbook.dirName == "Virtual Identity") {
			vI_notificationBar.dump("## vI_addressBook: comparing '" + Card.displayName.toLowerCase() + "' und '" +
				returnVar.name.toLowerCase() + "'.\n")
			if ( Card.displayName.toLowerCase() == returnVar.name.toLowerCase() ) {
				vI_notificationBar.dump("## vI_addressBook:             found CardInVIAbook.\n")
				return { name: returnVar.name, Card : Card }
			}
		}
		else return returnVar
	},

	// newsgroup and mailin-list entries are stored in a separate Virtual Identity AddressBook
	getCardForAddressFromVIAbook : function(name) {
		vI_notificationBar.dump("## vI_addressBook: getCardForAddressFromVIAbook '" + name + "' \n")
		queryString = "?(or(DisplayName,c," + encodeURIComponent(name) + "))";
		vI_notificationBar.dump("## vI_addressBook: Search '" + name + "' in VI addressbook displayed names.\n")
		var returnVar = vI_addressBook._walkTroughCards(queryString, vI_addressBook._findMatchingCardInVIAbook,
			{ name : name, Card : null } )
		if (returnVar.Card) vI_notificationBar.dump("## vI_addressBook: Card found in VI addressbook.\n")
		else vI_notificationBar.dump("## vI_addressBook: Card not found in VI addressbook.\n")
		return returnVar.Card		
	},
	
	_isMailingListCard : function (addrbook, Card, returnVar) {
	// returnVar = { mailListName : mailListName, isMailList : false } 
		return { mailListName : returnVar.mailListName,
			isMailList : (returnVar.isMailList || addrbook.dirName != "Virtual Identity" &&
			Card.isMailList && Card.displayName.toLowerCase() == returnVar.mailListName.toLowerCase()) }
	},
	
	getMailListName : function(recipient) {
		if (recipient.match(/<[^>]*>/) || recipient.match(/$/)) {
			mailListName = RegExp.leftContext + RegExp.rightContext
			mailListName = mailListName.replace(/^\s+|\s+$/g,"")
		}
		return mailListName;
	},
	
	isMailingList: function(recipient) {
		vI_notificationBar.dump("## vI_addressBook: isMailingList '" + recipient + "' \n")
		queryString = "?(or(DisplayName,c," + encodeURIComponent(vI_addressBook.getMailListName(recipient)) + "))"
		var returnVar = vI_addressBook._walkTroughCards(queryString, vI_addressBook._isMailingListCard,
			{ mailListName : mailListName, isMailList : false } )
		vI_notificationBar.dump("## vI_addressBook: isMailList  " + returnVar.isMailList + ".\n")
		return returnVar.isMailList;
	},
	
	getCardForAddress: function(recipient, recipientType) {
		if (recipientType == "addr_newsgroups") 
			return vI_addressBook.getCardForAddressFromVIAbook(recipient)
		else if (vI_addressBook.isMailingList(recipient))
			return vI_addressBook.getCardForAddressFromVIAbook(vI_addressBook.getMailListName(recipient))
		else 
			return vI_addressBook.getCardForAddressFromNonVIAbook(recipient)
	},
	
	getCardForAddressFromNonVIAbook :function (recipient) {
		var queryString; var email = null; var name = null;
		
		var splittedRecipient = vI.helper.parseAddress(recipient)
		email = splittedRecipient.email; name = splittedRecipient.name
		queryString = "?(or(PrimaryEmail,c," + encodeURIComponent(email) + ")(SecondEmail,c," + encodeURIComponent(email) + "))"

		vI_notificationBar.dump("## vI_addressBook: Search '" + email + "' in addressbook emails.\n")

		var returnVar = { email : email, name : name, mailListName : mailListName,
			matchingEmailCards : { number : 0, cards : {} }, matchingFullNameCards : { number : 0, cards : {} } }
		returnVar = vI_addressBook._walkTroughCards(queryString, vI_addressBook._findMatchingCard, returnVar)
		var matchingEmailCards = returnVar.matchingEmailCards; var matchingFullNameCards = returnVar.matchingFullNameCards;
		
		vI_notificationBar.dump("## vI_addressBook: found " + matchingEmailCards.number + " card(s) with matching email (or lists).\n")
		vI_notificationBar.dump("## vI_addressBook: found " + matchingFullNameCards.number + " card(s) with matching displayed Name.\n")
		
		// prefer matchingFullNameCards over matchingEmailCards
		matchingCards = matchingEmailCards
		if (matchingFullNameCards.number > 0) matchingCards = matchingFullNameCards
		
		// usual cases, found or not
		switch (matchingCards.number) {
			case 0:
				vI_notificationBar.dump("## vI_addressBook: " + recipient + " not found.\n")
				return null;
			case 1:
				return matchingCards.cards[0];
		}
		
		// upps, more than one matching address found
		vI_notificationBar.dump("## vI_addressBook WARNING: " + matchingCards.number + " matching entries found.\n")
				
		for (index = 0; index < matchingCards.number; index++) {
			for each (var prop in vI_addressBook.CardFields) {
				if (matchingCards.cards[index][prop.toLowerCase()].indexOf("vIdentity: ") == 0) {
					vI_notificationBar.dump("## vI_addressBook WARNING: use first one with a stored Virtual Identity.\n")
					return matchingCards.cards[index];
				}
			}
		}
		vI_notificationBar.dump("## vI_addressBook WARNING: none has a stored Virtual Identity, use first in set.\n")
		return matchingCards.cards[0];
	},
				
	readVIdentityFromCard : function(Card) {
		vI_notificationBar.dump("## vI_addressBook: readVIdentityFromCard.\n")
		for each (var prop in vI_addressBook.CardFields) {
			prop = prop.toLowerCase();
			if (Card[prop].indexOf("vIdentity: ") == 0) {
				var newFullEmail=Card[prop].replace(/vIdentity: /,"");
				var infoIndex = newFullEmail.indexOf(" (id")
				if (!infoIndex) infoIndex = newFullEmail.indexOf(" (smtp")
				var info = null;
				if ( infoIndex != -1) {
					info = newFullEmail.substr(infoIndex+2).replace(/\)/,"").split(/,/)
					newFullEmail = newFullEmail.substr(0, infoIndex);
				}
				
				var splitted = vI.helper.parseAddress(newFullEmail);
				// format of addresses is choosen to be compatible with vI_smartIdentity
				var addresses = { number : 1,
						emails : Array(splitted.email),
						fullNames : Array(splitted.name),
						combinedNames : Array(splitted.combinedName),
						id_keys : {}, smtp_keys : {},
						fullABEntry : Array(Card[prop].replace(/vIdentity: /,"")) };
				if ( info && info[0] ) addresses.id_keys[0] = info[0];
				if ( info && info[1] ) addresses.smtp_keys[0] = info[1];
				vI_notificationBar.dump("## vI_addressBook: found '" + addresses.combinedNames[0] + "'.\n")
				vI_notificationBar.dump("## vI_addressBook: found '" + addresses.fullABEntry[0] + "'.\n")
				return addresses
			}
		}
		vI_notificationBar.dump("## vI_addressBook: no VIdentity information found.\n")
		return null;
	},
	
	equalsCurrentIdentity : function(addresses) {
		var old_address = vI.helper.getAddress();		
		var id_key = vI_msgIdentityClone.elements.Obj_MsgIdentity_clone.getAttribute("oldvalue");
		if (!id_key) id_key = vI_msgIdentityClone.elements.Obj_MsgIdentity_clone.getAttribute("value");
		var smtp_key = vI_smtpSelector.elements.Obj_SMTPServerList.selectedItem.getAttribute('key');
		var equal = (	(!addresses.id_keys[0] || id_key == addresses.id_keys[0]) &&
				(!addresses.smtp_keys[0] || smtp_key == addresses.smtp_keys[0]) &&
				(old_address.email == addresses.emails[0]) &&
				(old_address.name == addresses.fullNames[0])	)
		if (equal) vI_notificationBar.dump("## vI_addressBook: Identities are the same.\n")
		else vI_notificationBar.dump("## vI_addressBook: Identities differ.\n")
		return equal;
	},
	
	storeCurrentVIdentityString : function() {
		var old_address = vI.helper.getAddress();		
		var id_key = vI_msgIdentityClone.elements.Obj_MsgIdentity_clone.getAttribute("oldvalue");
		if (!id_key) id_key = vI_msgIdentityClone.elements.Obj_MsgIdentity_clone.getAttribute("value");
		var smtp_key = vI_smtpSelector.elements.Obj_SMTPServerList.selectedItem.getAttribute('key');
		vI_addressBook.VIdentityString = old_address.combinedName + " (" + id_key + "," + smtp_key + ")"
	},
	
	firstUsedInputElement : null, 	// this stores the first Element for which a Lookup in the AddressBook was successfull
	firstUsedABookEntry : null,	// stores the used ABook-entry to show a warning if the Identities differ
	updateVIdentityFromABook: function(inputElement) {
		if (!vI.preferences.getBoolPref("aBook_use")) {
			vI_notificationBar.dump("## vI_addressBook: usage deactivated.\n")
			return;
		}
		
		var recipientType = document.getElementById(inputElement.id.replace(/^addressCol2/,"addressCol1"))
					.selectedItem.getAttribute("value");
		if (recipientType == "addr_reply" || recipientType == "addr_followup") {
			// reset firstUsedInputElement and firstUsedABookEntry if recipientType was changed
			if (vI_addressBook.firstUsedInputElement == inputElement) {
				vI_addressBook.firstUsedInputElement = null;
				vI_addressBook.firstUsedABookEntry = null;
			}
			vI_notificationBar.dump("## vI_addressBook: field is a 'reply-to' or 'followup-to'. not searched.\n")
			return;
		}
		
		if (inputElement.value == "") {
			vI_notificationBar.dump("## vI_addressBook: no recipient found, not checked.\n"); return;
		}
		
		var row = inputElement.id.replace(/^addressCol2#/,"")
		if (vI_addressBook.lastCheckedEmail[row] && vI_addressBook.lastCheckedEmail[row] == inputElement.value) {
			vI_notificationBar.dump("## vI_addressBook: same email than before, not checked again.\n"); return;
		}
		vI_addressBook.lastCheckedEmail[row] = inputElement.value;
		
		var Card = vI_addressBook.getCardForAddress(inputElement.value, recipientType); if (!Card) return;
		
		// found Card, so store InputElement
		if (!vI_addressBook.firstUsedInputElement) vI_addressBook.firstUsedInputElement = inputElement;
		
		var addresses = vI_addressBook.readVIdentityFromCard(Card)
		
		if (addresses) {				
			vI_notificationBar.dump("## vI_addressBook: compare with current Identity\n");
			if (vI_addressBook.firstUsedInputElement == inputElement)
				vI_addressBook.firstUsedABookEntry = addresses.fullABEntry[0]
			if (vI.preferences.getBoolPref("aBook_getOneOnly") && vI_addressBook.firstUsedInputElement &&
				vI_addressBook.firstUsedInputElement != inputElement) {
				vI_notificationBar.dump("## vI_addressBook: retrieved Identity for other recipient-field before. ignoring\n");
				if (vI_addressBook.firstUsedABookEntry != addresses.fullABEntry[0])
					vI_notificationBar.setNote(vI.elements.strings.getString("vident.smartIdentity.vIaBookCollidingIdentity"),
						"aBook_notification");
			}
			// only update fields if new Identity is different than old one.
			else if (!vI_addressBook.equalsCurrentIdentity(addresses)) {
				var warning = vI.elements.strings.getString("vident.updateVirtualIdentity.warning1") +
							email +
							vI.elements.strings.getString("vident.updateVirtualIdentity.warning2") +
							addresses.fullABEntry[0] +
							vI.elements.strings.getString("vident.updateVirtualIdentity.warning3");
				if (	vI_msgIdentityClone.elements.Obj_MsgIdentity_clone.getAttribute("value") != "vid" ||
					!vI.preferences.getBoolPref("aBook_warn_vI_replace") ||
					vI_addressBook.promptService.confirm(window,"Warning",warning)) {						
					if (addresses.id_keys[0]) vI_msgIdentityClone.setMenuToIdentity(addresses.id_keys[0])
					if (addresses.smtp_keys[0]) vI_smtpSelector.setMenuToKey(addresses.smtp_keys[0])
					if (vI_msgIdentityClone.setIdentity(addresses.combinedNames[0]))
						vI_notificationBar.setNote(vI.elements.strings.getString("vident.smartIdentity.vIaBookUsage") + ".",
							"aBook_notification");
				}
			}
		}
	},
	
	writeVIdentityToABook : function(Card) {
		for each (var prop in vI_addressBook.CardFields) {
			prop = prop.toLowerCase();
			vI_notificationBar.dump("## vI_addressBook: checking " + prop + ".\n")
			if (Card[prop] == "" || Card[prop].indexOf("vIdentity: ") == 0) {
				Card[prop] = "vIdentity: " + vI_addressBook.VIdentityString;
				Card.editCardToDatabase("");
				vI_notificationBar.dump("## vI_addressBook: added vIdentity to AddressBook '" + vI_addressBook.VIdentityString + "' to field '" + prop + "'.\n")
				return;
			}
		}
		vI_notificationBar.dump("## vI_addressBook: no free field in AddressBook.\n")
	},
	
	updateABookFromVIdentity : function(recipient, recipientType) {
		vI_notificationBar.dump("## vI_addressBook: updateABookFromVIdentity " + recipient + ".\n")
		var Card = vI_addressBook.getCardForAddress(recipient, recipientType)
		if (!Card) return;
		
		var addresses = vI_addressBook.readVIdentityFromCard(Card);
		var old_address = vI.helper.getAddress();
		
		
		dontUpdateMultipleNoEqual = (vI.preferences.getBoolPref("aBook_dont_update_multiple") &&
					vI_addressBook.multipleRecipients)
		
		if (addresses) {
			if (!vI_addressBook.equalsCurrentIdentity(addresses) &&
				!dontUpdateMultipleNoEqual) {
				var warning = 	vI.elements.strings.getString("vident.updateAddressBook.warning1") +
						email +
						vI.elements.strings.getString("vident.updateAddressBook.warning2") +
						addresses.fullABEntry[0] +
						vI.elements.strings.getString("vident.updateAddressBook.warning3") +
						vI_addressBook.VIdentityString +
						vI.elements.strings.getString("vident.updateAddressBook.warning4");
				vI_notificationBar.dump("## vI_addressBook: " + warning + ".\n")
				if (!vI.preferences.getBoolPref("aBook_warn_update") ||
						vI_addressBook.promptService.confirm(window,"Warning",warning))
					vI_addressBook.writeVIdentityToABook(Card);
			}
		}
		else vI_addressBook.writeVIdentityToABook(Card);
	},
	
	storeVIdentityToAllRecipients : function(msgType) {
		if (msgType != nsIMsgCompDeliverMode.Now) return;
		if (!vI.preferences.getBoolPref("aBook_use")) return;
		if (vI_msgIdentityClone.elements.Obj_MsgIdentity_clone.getAttribute("value") != "vid" &&
			!vI.preferences.getBoolPref("aBook_use_non_vI")) return;
		if (vI_addressBook.elements.Obj_aBookSave.getAttribute("hidden") == "false" ) {
			vI_notificationBar.dump("## vI_addressBook: switch shown.\n")
			if (!vI_addressBook.elements.Obj_aBookSave.checked) {
				vI_notificationBar.dump("## vI_addressBook: save button not checked.\n")
				return;
			}
		}
		else {
			vI_notificationBar.dump("## vI_addressBook: switch hidden.\n")
			if (!vI.preferences.getBoolPref("aBook_storedefault")) {
				vI_notificationBar.dump("## vI_addressBook: not be safed by default.\n")
				return;
			}
		}
		
		// store VIdentityString
		vI_addressBook.storeCurrentVIdentityString()

		// check if there are multiple recipients
		vI_addressBook.multipleRecipients = false;
		var recipients = 0;
		for (var row = 1; row <= top.MAX_RECIPIENTS; row ++) {
			var recipientType = awGetPopupElement(row).selectedItem.getAttribute("value");
			if (recipientType == "addr_reply" || recipientType == "addr_followup" || 
				awGetInputElement(row).value.match(/^\s*$/) ) continue;
			if (recipients++ == 1) {
				vI_addressBook.multipleRecipients = true
				vI_notificationBar.dump("## vI_addressBook: multiple recipients found.\n")
				break;
			}
		}			
		
		for (var row = 1; row <= top.MAX_RECIPIENTS; row ++) {
			var recipientType = awGetPopupElement(row).selectedItem.getAttribute("value");
			if (recipientType == "addr_reply" || recipientType == "addr_followup" || 
				awGetInputElement(row).value.match(/^\s*$/) ) continue;
			vI_addressBook.addNewCard(awGetInputElement(row).value, recipientType)
			window.setTimeout(vI_addressBook.updateABookFromVIdentity, 50, awGetInputElement(row).value, recipientType)
		}
	},
	
	_addNewCardToVIAbook : function (recipient) {
			vI_notificationBar.dump("## vI_addressBook: _addNewCardToVIAbook.\n")
			newCard = Components.classes["@mozilla.org/addressbook/cardproperty;1"]
				.createInstance(Components.interfaces.nsIAbCard);
			newCard.displayName = recipient;
			newCard.notes = vI_addressBook.addNote
			var parentDir = vI_addressBook.rdfService.GetResource("moz-abdirectory://").QueryInterface(Components.interfaces.nsIAbDirectory);
			var enumerator = parentDir.childNodes;
			if (!enumerator) {vI_notificationBar.dump("## vI_addressBook: no addressbooks?\n"); return null;} // uups, no addressbooks?	
			while (enumerator && enumerator.hasMoreElements()) {
				var addrbook = enumerator.getNext();  // an addressbook directory
				addrbook.QueryInterface(Components.interfaces.nsIAbDirectory);
				if (addrbook.dirName == "Virtual Identity") { addrbook.addCard(newCard); break }
			}
	},
	
	addNewCard : function(recipient, recipientType) {
		if (!vI_addressBook.prefroot.getBoolPref("mail.collect_email_address_outgoing")) return;
		if (recipientType == "addr_newsgroups" && !vI_addressBook.getCardForAddressFromVIAbook(recipient))
			vI_addressBook._addNewCardToVIAbook(recipient)
		else if ( vI_addressBook.isMailingList(recipient) &&
			!vI_addressBook.getCardForAddressFromVIAbook(vI_addressBook.getMailListName(recipient)) )
			vI_addressBook._addNewCardToVIAbook(vI_addressBook.getMailListName(recipient))
	},
	
	getVIdentityFromAllRecipients : function(all_addresses) {
		// var all_addresses = { number : 0, emails : {}, fullNames : {},
		//			combinedNames : {}, id_keys : {}, smtp_keys : {} };
		if (!vI.preferences.getBoolPref("aBook_use")) {
			vI_notificationBar.dump("## vI_addressBook: usage deactivated.\n")
			return all_addresses;
		}
		for (var row = 1; row <= top.MAX_RECIPIENTS; row ++) {
			var recipientType = awGetPopupElement(row).selectedItem.getAttribute("value");
			if (recipientType == "addr_reply" || recipientType == "addr_followup") continue;
			vI_addressBook.lastCheckedEmail[row] = awGetInputElement(row).value;
			var Card = vI_addressBook.getCardForAddress(awGetInputElement(row).value,recipientType);
			if (!Card) continue;
			var addresses = vI_addressBook.readVIdentityFromCard(Card);
			if (addresses) vI_smartIdentity.addWithoutDuplicates(all_addresses,
				addresses.emails[0],
				addresses.fullNames[0],
				addresses.combinedNames[0],
				addresses.id_keys[0],
				addresses.smtp_keys[0])
		}
		return all_addresses;
	}

}
window.addEventListener("unload", function(e) { try {vI_addressBook.removeObserver();} catch (ex) { } }, false);
