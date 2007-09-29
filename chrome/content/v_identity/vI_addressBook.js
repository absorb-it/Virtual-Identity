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
	getCardForAddress: function(full_email) {
		var rdfService = Components.classes["@mozilla.org/rdf/rdf-service;1"].getService(Components.interfaces.nsIRDFService);
		
		// enumerate all of the address books on this system
		var parentDir = rdfService.GetResource("moz-abdirectory://").QueryInterface(Components.interfaces.nsIAbDirectory);
		var enumerator = parentDir.childNodes;
		
		var splitted = { number : 0, emails : {}, fullNames : {}, combinedNames : {} };
		vI.headerParser.parseHeadersWithArray(full_email, splitted.emails,
			splitted.fullNames, splitted.combinedNames);
		var recipient_email = splitted.emails.value[0]
		if (!recipient_email) return null;
	
		vI_notificationBar.dump("## v_identity: Search " + recipient_email + " in addressbooks.\n")
		
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
				var CurrentCard = CurrentItem.QueryInterface(Components.interfaces.nsIAbCard);
				vI_notificationBar.dump("## v_identity: card found.\n")
				// current card is now the addressbook card of a contact that has 'address'
				if (CurrentCard.primaryEmail.toLowerCase() == recipient_email.toLowerCase()) return CurrentCard;
			}  catch (e)  {
				// we would be here if the directory contained no items
			}
			
		}
		vI_notificationBar.dump("## v_identity: " + recipient_email + " not found.\n")
		return null;
	},
				
	readVirtualIdentity: function(element) {
		var CurrentCard = vI_addressBook.getCardForAddress(element.value)
		if (!CurrentCard) return;
		var CardFields=new Array("custom1", "custom2", "custom3", "custom4", "notes")
		for each (var prop in CardFields) {
			if (CurrentCard[prop].indexOf("vIdentity: ") == 0) {
				var newFullEmail=CurrentCard[prop].replace(/vIdentity: /,"");
				var infoIndex = newFullEmail.indexOf(" (id")
				vI_notificationBar.dump("## v_identity: found vIdentity in AddressBook '" + newFullEmail + "'\n");
				if ( infoIndex != -1) {
					info = newFullEmail.substr(infoIndex+2).replace(/\)/,"").split(/,/)
					if (info[0]) vI_msgIdentityClone.setMenuToIdentity(info[0])
					if (info[1]) vI_smtpSelector.setMenuToKey(info[1])
					newFullEmail = newFullEmail.substr(0, infoIndex);
				}
				if (vI_msgIdentityClone.setIdentity(newFullEmail))
					vI_notificationBar.setNote(vI.elements.strings.getString("vident.smartIdentity.vIUsage") + ".",
						"smart_reply_notification");
				break
			}
		}
	},
	
	storeVirtualIdentity: function() {
		for (var row = 1; row <= top.MAX_RECIPIENTS; row ++) {
			var CurrentCard = vI_addressBook.getCardForAddress(awGetInputElement(row).value)
			if (!CurrentCard) continue;
			// add current Virtual Identity to a custom-field in addressbook
			var CardFields=new Array("custom1", "custom2", "custom3", "custom4", "notes")
			for each (var prop in CardFields) {
				if (CurrentCard[prop] == "" || CurrentCard[prop].indexOf("vIdentity: ") == 0) {
					var vIdentityString = vI.elements.Obj_MsgIdentity.getAttribute("label") + " (" +
					vI_msgIdentityClone.elements.Obj_MsgIdentity_clone.getAttribute("oldvalue") + "," +
					vI_smtpSelector.elements.Obj_SMTPServerList.selectedItem.getAttribute('key') + ")"
					vI_notificationBar.dump("## v_identity: add vIdentity to AddressBook '" + vIdentityString + "' to field '" + prop + "'.\n")
					CurrentCard[prop] = "vIdentity: " + vIdentityString;
					CurrentCard.editCardToDatabase("");
					break
				}
			}
		}
	}
}