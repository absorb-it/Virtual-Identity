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

    Contributor(s): Mike Krieger
 * ***** END LICENSE BLOCK ***** */
 
/**
* some code copied and adapted from 'addresscontext'
* thanks to Mike Krieger
*/

vI_addressBook = {
	CardFields : Array("custom1", "custom2", "custom3", "custom4", "notes"),
	QueryFields : Array("Custom1", "Custom2", "Custom3", "Custom4", "Notes"),
	
	elements : {
		Obj_aBookSave : null,
	},

	init: function() {
		vI_addressBook.elements.Obj_aBookSave = document.getElementById("aBook_save");
		vI_addressBook.elements.Obj_aBookSave.checked = vI.preferences.getBoolPref("aBook_storedefault");
	},

	removeVIdentityFromABook: function(remove) {
		// given the function paramter as false it might be used to count the fields which have a VirtualIdentity stored
		var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
			.getService(Components.interfaces.nsIPromptService);
		var rdfService = Components.classes["@mozilla.org/rdf/rdf-service;1"]
			.getService(Components.interfaces.nsIRDFService);
		
		counter = 0;
		
		// enumerate all of the address books on this system
		var parentDir = rdfService.GetResource("moz-abdirectory://").QueryInterface(Components.interfaces.nsIAbDirectory);
		var enumerator = parentDir.childNodes;
			
		//~ vI_notificationBar.dump("## vI_addressBook: Search Virtual Identities in addressbooks.\n")
		
		if (remove) {
			var number = vI_addressBook.removeVIdentityFromABook(false)
			var strings = document.getElementById("vIdentBundle");
			var warning = strings.getString("vident.clearAddressBook.status.prefix") + " " + number + " " +
					strings.getString("vident.clearAddressBook.status.postfix") + " " + 
					strings.getString("vident.clearAddressBook.warning")
			if (!promptService.confirm(window,"Warning",warning))
				return;
		}
		
		while (enumerator && enumerator.hasMoreElements()) {
			var addrbook = enumerator.getNext();  // an addressbook directory
			addrbook.QueryInterface(Components.interfaces.nsIAbDirectory);
			for each (var prop in vI_addressBook.QueryFields) {
				var searchUri = addrbook.directoryProperties.URI + "?(or(" + prop + ",c,vIdentity:))"; // search for the address in this book
				var directory = rdfService.GetResource(searchUri).QueryInterface(Components.interfaces.nsIAbDirectory);
				// directory will now be a subset of the addressbook containing only those cards that match the searchstring 'address'
				var ChildCards = directory.childCards;
				var keepGoing = 1;
				try { ChildCards.first(); }
				catch (ex) { keepGoing = 0; }
				
				while (keepGoing == 1) {
					var Card = ChildCards.currentItem();
					Card = Card.QueryInterface(Components.interfaces.nsIAbCard);
					counter += 1;
					if (remove) {
						Card[prop.toLowerCase()] = "";
						Card.editCardToDatabase("");
					}
					
					try {
						ChildCards.next();
					} catch (ex) {
						keepGoing = 0;
					}
				}
			}
		}
		return counter;
	},

	getCardForAddress: function(email) {
		var rdfService = Components.classes["@mozilla.org/rdf/rdf-service;1"].getService(Components.interfaces.nsIRDFService);
		
		// enumerate all of the address books on this system
		var parentDir = rdfService.GetResource("moz-abdirectory://").QueryInterface(Components.interfaces.nsIAbDirectory);
		var enumerator = parentDir.childNodes;
		
		var splitted = { number : 0, emails : {}, fullNames : {}, combinedNames : {} };
		vI.headerParser.parseHeadersWithArray(email, splitted.emails,
			splitted.fullNames, splitted.combinedNames);
		var recipient_email = splitted.emails.value[0]
		if (!recipient_email) return null;
	
		vI_notificationBar.dump("## vI_addressBook: Search " + recipient_email + " in addressbooks.\n")
		
		while (enumerator && enumerator.hasMoreElements()) {
			var addrbook = enumerator.getNext();  // an addressbook directory
			addrbook.QueryInterface(Components.interfaces.nsIAbDirectory);
			var searchUri = addrbook.directoryProperties.URI + "?(or(PrimaryEmail,c," + recipient_email + "))";  // search for the address in this book
			var directory = rdfService.GetResource(searchUri).QueryInterface(Components.interfaces.nsIAbDirectory);
			// directory will now be a subset of the addressbook containing only those cards that match the searchstring 'address'
			try {
				var ChildCards = directory.childCards;
				ChildCards.first();
				var CurrentItem = ChildCards.currentItem();
			} catch(e) {
				var ChildCards = directory.childNodes;
				if (ChildCards.hasMoreElements()) var CurrentItem = ChildCards.getNext();
			}
			try {
				var Card = CurrentItem.QueryInterface(Components.interfaces.nsIAbCard);
				vI_notificationBar.dump("## vI_addressBook: card found.\n")
				// current card is now the addressbook card of a contact that has 'address'
				if (Card.primaryEmail.toLowerCase() == recipient_email.toLowerCase()) return Card;
			}  catch (e)  {
				// we would be here if the directory contained no items
			}
			
		}
		vI_notificationBar.dump("## vI_addressBook: " + recipient_email + " not found.\n")
		return null;
	},
				
	readVIdentityFromCard : function(Card) {
		vI_notificationBar.dump("## vI_addressBook: readVIdentityFromCard.\n")
		for each (var prop in vI_addressBook.CardFields) {
			if (Card[prop].indexOf("vIdentity: ") == 0) {
				var newFullEmail=Card[prop].replace(/vIdentity: /,"");
				var infoIndex = newFullEmail.indexOf(" (id")
				var info = null;
				if ( infoIndex != -1) {
					info = newFullEmail.substr(infoIndex+2).replace(/\)/,"").split(/,/)
					newFullEmail = newFullEmail.substr(0, infoIndex);
				}
				
				// split FullEmail into parts
				var splitted = { number : 0, emails : {}, fullNames : {}, combinedNames : {} };
				vI.headerParser.parseHeadersWithArray(newFullEmail, splitted.emails,
					splitted.fullNames, splitted.combinedNames);

				// format of addresses is choosen to be compatible with vI_smartIdentity
				var addresses = { number : 1,
						emails : Array(splitted.emails.value[0]),
						fullNames : Array(splitted.fullNames.value[0]),
						combinedNames : Array(splitted.combinedNames.value[0]),
						id_keys : {}, smtp_keys : {},
						fullABEntry : Array(Card[prop].replace(/vIdentity: /,"")) };
				if ( info[0] ) addresses.id_keys[0] = info[0];
				if ( info[1] ) addresses.smtp_keys[0] = info[1];
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
		var smtp_key = vI_smtpSelector.elements.Obj_SMTPServerList.selectedItem.getAttribute('key');
		vI_notificationBar.dump("## vI_addressBook: '" + old_address.email + "'\n")
		vI_notificationBar.dump("## vI_addressBook: '" + old_address.name + "'\n")
		vI_notificationBar.dump("## vI_addressBook: '" + id_key + "'\n")
		vI_notificationBar.dump("## vI_addressBook: '" + smtp_key + "'\n")
		vI_notificationBar.dump("## vI_addressBook: '" + addresses.emails[0] + "'\n")
		vI_notificationBar.dump("## vI_addressBook: '" + addresses.fullNames[0] + "'\n")
		vI_notificationBar.dump("## vI_addressBook: '" + addresses.id_keys[0] + "'\n")
		vI_notificationBar.dump("## vI_addressBook: '" + addresses.smtp_keys[0] + "'\n")
		
		return (	(!addresses.id_keys[0] || id_key == addresses.id_keys[0]) &&
				(!addresses.smtp_keys[0] || smtp_key == addresses.smtp_keys[0]) &&
				(old_address.email == addresses.emails[0]) &&
				(old_address.name == addresses.fullNames[0])	)
	},
	
	getCurrentVIdentityString : function() {
		var old_address = vI.helper.getAddress();		
		var id_key = vI_msgIdentityClone.elements.Obj_MsgIdentity_clone.getAttribute("oldvalue");
		var smtp_key = vI_smtpSelector.elements.Obj_SMTPServerList.selectedItem.getAttribute('key');
		return old_address.combinedName + " (" + id_key + "," + smtp_key + ")"
	},
	
	updateVIdentityFromABook: function(email) {
		if (!vI.preferences.getBoolPref("aBook_use")) return;
		var Card = vI_addressBook.getCardForAddress(email); if (!Card) return;
		var addresses = vI_addressBook.readVIdentityFromCard(Card)
		
		if (addresses) {				
			vI_notificationBar.dump("## vI_addressBook: compare with current Identity\n");
			// only update fields if new Identity is different than old one.
			if (!vI_addressBook.equalsCurrentIdentity(addresses)) {
				
				var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
						.getService(Components.interfaces.nsIPromptService);
				var warning = vI.elements.strings.getString("vident.updateVirtualIdentity.warning1") +
							email +
							vI.elements.strings.getString("vident.updateVirtualIdentity.warning2") +
							addresses.fullABEntry[0] +
							vI.elements.strings.getString("vident.updateVirtualIdentity.warning3");
				if (	vI_msgIdentityClone.elements.Obj_MsgIdentity_clone.getAttribute("value") != "vid" ||
					!vI.preferences.getBoolPref("aBook_warn_vI_replace") ||
					promptService.confirm(window,"Warning",warning)) {						
					if (addresses.id_keys[0]) vI_msgIdentityClone.setMenuToIdentity(addresses.id_keys[0])
					if (addresses.smtp_keys[0]) vI_smtpSelector.setMenuToKey(addresses.smtp_keys[0])
					if (vI_msgIdentityClone.setIdentity(addresses.combinedNames[0]))
						vI_notificationBar.setNote(vI.elements.strings.getString("vident.smartIdentity.vIUsage") + ".",
							"smart_reply_notification");
				}
			}
		}
	},
	
	writeVIdentityToABook : function(Card) {
		for each (var prop in vI_addressBook.CardFields) {
			vI_notificationBar.dump("## vI_addressBook: checking " + prop + ".\n")
			if (Card[prop] == "" || Card[prop].indexOf("vIdentity: ") == 0) {
				Card[prop] = "vIdentity: " + vI_addressBook.getCurrentVIdentityString();
				Card.editCardToDatabase("");
				vI_notificationBar.dump("## vI_addressBook: added vIdentity to AddressBook '" + vI_addressBook.getCurrentVIdentityString() + "' to field '" + prop + "'.\n")
				return;
			}
		}
		vI_notificationBar.dump("## vI_addressBook: no free field in AddressBook.\n")
	},
	
	updateABookFromVIdentity : function(email) {
		var Card = vI_addressBook.getCardForAddress(email)
		if (!Card) return;
		
		var addresses = vI_addressBook.readVIdentityFromCard(Card);
		var old_address = vI.helper.getAddress();
		
		if (addresses) {
			if (!vI_addressBook.equalsCurrentIdentity(addresses)) {
				vI_notificationBar.dump("## vI_addressBook: Identities differ.\n")
				var warning = 	vI.elements.strings.getString("vident.updateAddressBook.warning1") +
						email +
						vI.elements.strings.getString("vident.updateAddressBook.warning2") +
						addresses.fullABEntry[0] +
						vI.elements.strings.getString("vident.updateAddressBook.warning3") +
						vI_addressBook.getCurrentVIdentityString() +
						vI.elements.strings.getString("vident.updateAddressBook.warning4");
				vI_notificationBar.dump("## vI_addressBook: " + warning + ".\n")
				var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
					.getService(Components.interfaces.nsIPromptService);
				if (!vI.preferences.getBoolPref("aBook_warn_update") ||
						promptService.confirm(window,"Warning",warning))
					vI_addressBook.writeVIdentityToABook(Card);
			}
		}
		else vI_addressBook.writeVIdentityToABook(Card);
	},
	
	storeVIdentityToAllRecipients : function() {
		if (!vI.preferences.getBoolPref("aBook_use")) return;
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
		
		for (var row = 1; row <= top.MAX_RECIPIENTS; row ++) {
			vI_addressBook.updateABookFromVIdentity(awGetInputElement(row).value)
		}
	},
	
	getVIdentityFromAllRecipients : function(all_addresses) {
		// var all_addresses = { number : 0, emails : {}, fullNames : {},
		//			combinedNames : {}, id_keys : {}, smtp_keys : {} };
		for (var row = 1; row <= top.MAX_RECIPIENTS; row ++) {
			var Card = vI_addressBook.getCardForAddress(awGetInputElement(row).value);
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