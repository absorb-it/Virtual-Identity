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


function identityData(email, fullName, id, smtp, extras) {
	this.email = email;
	this.fullName = (fullName?fullName:'');
	this.id = id;
	this.smtp = (smtp=="default"?"":smtp);
	this.extras = extras;
	this.__keyTranslator = new keyTranslator();
	if (!this.__keyTranslator.isValidID(this.id)) this.id = ""
	if (!this.__keyTranslator.isValidSMTP(this.smtp)) this.smtp = "";
}
identityData.prototype = {
	email : null,
	fullName : null,
	id : null,
	smtp : null,
	extras : null,
	__keyTranslator : null,
	__combineStrings : function(stringA, stringB) {
		var A = (stringA)?stringA.replace(/^\s+|\s+$/g,""):"";
		var B = (stringB)?stringB.replace(/^\s+|\s+$/g,""):"";
		if (!A) return B;
		if (!B) return A;
		return A + ", " + B;
	},
	
	identityDescription : function(index) {
		var senderName = vI_helper.combineNames(this.fullName, this.email);
		var idName = this.__keyTranslator.getIDname(this.id);
		var smtpName = this.__keyTranslator.getSMTPname(this.smtp);
		var extras = this.extras?this.extras.status():"";
		return senderName + " (" + 
			this.__combineStrings(this.__combineStrings(idName, smtpName), extras) +  ")"
	},
	
	__equalCurrentSMTP : function() {
		var smtp_key = vI_smtpSelector.elements.Obj_SMTPServerList.selectedItem.getAttribute('key');
		return (!this.__keyTranslator.getSMTP(this.smtp) && !smtp_key ||
			smtp_key == this.smtp)
	},
	
	__equalCurrentID : function() {
		var id_key = vI_msgIdentityClone.elements.Obj_MsgIdentity_clone.base_id_key;
		if (!id_key) id_key = vI_msgIdentityClone.elements.Obj_MsgIdentity_clone.getAttribute("value");
		return ((!this.__keyTranslator.getID(this.id) && (id_key == gAccountManager.defaultAccount.defaultIdentity.key)) ||
			id_key == this.id)
	},
	
	equalsCurrentIdentity : function() {
		var curAddress = vI_helper.getAddress();		
		var curExtras = new vI_storageExtras();
		curExtras.readValues(); // initialize with current MsgComposeDialog Values
		vI_notificationBar.dump("## identityData: __equalCurrentID = '" + this.__equalCurrentID() + "'.\n")
		vI_notificationBar.dump("## identityData: __equalCurrentSMTP = '" + this.__equalCurrentSMTP() + "'.\n")
		vI_notificationBar.dump("## identityData: curAddress.email = '" + (curAddress.email == this.email) + "'.\n")
		vI_notificationBar.dump("## identityData: curAddress.name = '" + (curAddress.name == this.fullName) + "'.\n")
		vI_notificationBar.dump("## identityData: this.extras.equal(curExtras) = '" + this.extras.equal(curExtras) + "'.\n")

		var equal = (	(this.__equalCurrentID()) &&
				(this.__equalCurrentSMTP()) &&
				(curAddress.email == this.email) &&
				(curAddress.name == this.fullName) &&
				(this.extras.equal(curExtras))	)
		if (equal) vI_notificationBar.dump("## identityData: Identities are the same.\n")
		else vI_notificationBar.dump("## identityData: Identities differ.\n")
		return equal;
	},

	isExistingIdentity : function() {
		var identity = gAccountManager.defaultAccount.defaultIdentity
		if (this.__keyTranslator.getID(this.id))
			identity = gAccountManager.getIdentity(this.id)
		
		var defaultSMTP = null;
		for (var i in gAccountManager.accounts) {
			for (var j in gAccountManager.accounts[i].identities) {
				if (this.id == gAccountManager.accounts[i].identities[j].key)
					defaultSMTP = gAccountManager.accounts[i].defaultIdentity.smtpServerKey;
			}
		}
		if (!defaultSMTP) defaultSMTP = gAccountManager.defaultAccount.defaultIdentity.smtpServerKey

		equal = ((this.smtp == identity.smtpServerKey ||
			(!this.__keyTranslator.getSMTP(this.smtp) && identity.smtpServerKey == defaultSMTP) ||
			(!this.__keyTranslator.getSMTP(identity.smtpServerKey) && this.smtp == defaultSMTP)) &&
			identity.getUnicharAttribute("fullName") == this.fullName &&
			identity.getUnicharAttribute("useremail") == this.email)
		
		if (equal) return identity.key
		else return null
	}
}

function identityCollection() {
	this.number = 0;
	this.emails = {};
	this.fullNames = {};
	this.combinedNames = {};
	this.id_keys = {};
	this.smtp_keys = {};
	this.extras = {};
	this.menuItems = {};
}
identityCollection.prototype =
{
	number : null,
	emails : null,
	fullNames : null,
	combinedNames : null,
	id_keys : null,
	smtp_keys : null,
	extras : null,
	menuItems : null,
	
	mergeWithoutDuplicates : function(addIdentityCollection) {
		for (index = 0; index < addIdentityCollection.number; index++)
			this.addWithoutDuplicates(
				addIdentityCollection.emails[index],
				addIdentityCollection.fullNames[index],
				addIdentityCollection.combinedNames[index],
				addIdentityCollection.id_keys[index],
				addIdentityCollection.smtp_keys[index],
				addIdentityCollection.extras[index])
	},

	addWithoutDuplicates : function(email, fullName, combinedName, id_key, smtp_key, extras) {
		for (index = 0; index < this.number; index++) {
			if (this.emails[index] == email &&
				(!this.id_keys[index] || !id_key || 
					(this.id_keys[index] == id_key && this.smtp_keys[index] == smtp_key))) {
				// found, so check if we can use the Name of the new field
				if (this.fullNames[index] == "" && fullName != "") {
					this.fullNames[index] = fullName
					this.combinedNames[index] = combinedName
					vI_notificationBar.dump("## identityCollection:   added fullName '" + fullName
						+ "' to stored email '" + email +"'\n")
				}
				// check if id_key, smtp_key or extras can be used
				// only try this once, for the first Identity where id is set)
				if (!this.id_keys[index] && id_key) {
					this.id_keys[index] = id_key;
					this.smtp_keys[index] = smtp_key;
					this.extras[index] = extras;
					vI_notificationBar.dump("## identityCollection:   added id '" + id_key
						+ "' smtp '" + smtp_key + "' (+extras) to stored email '" + email +"'\n")
				}
				return;
			}
		}
		vI_notificationBar.dump("## identityCollection:   add new address to result:" + combinedName + "\n")
		this.emails[index] = email;
		this.fullNames[index] = fullName;
		this.combinedNames[index] = combinedName;
		this.id_keys[index] = id_key;
		this.smtp_keys[index] = smtp_key;
		this.extras[index] = extras;
		this.number = index + 1;
	},
	
	takeOver : function(newIdentityCollection) {
		this.number = newIdentityCollection.number
		this.emails = newIdentityCollection.emails
		this.fullNames = newIdentityCollection.fullNames
		this.combinedNames = newIdentityCollection.combinedNames
		this.id_keys = newIdentityCollection.id_keys
		this.smtp_keys = newIdentityCollection.smtp_keys
		this.extras = newIdentityCollection.extras
	},

	getIdentityData : function(index) {
		var newIdentityData =
			new identityData(this.emails[index],
				this.fullNames[index],
				this.id_keys[index],
				this.smtp_keys[index],
				this.extras[index])
		return newIdentityData
	}
};

var vI_storage = {
	multipleRecipients : null,
	
	lastCheckedEmail : {}, 	// array of last checked emails per row,
				// to prevent ugly double dialogs and time-consuming double-checks
	
	elements : { Obj_storageSave : null },
	
	promptService : Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
			.getService(Components.interfaces.nsIPromptService),
			
	rdfService : Components.classes["@mozilla.org/rdf/rdf-service;1"]
			.getService(Components.interfaces.nsIRDFService),

	prefroot : Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefService)
			.getBranch(null).QueryInterface(Components.interfaces.nsIPrefBranch2),
	
	clean: function() {
		vI_notificationBar.dump("## vI_storage: clean.\n");
		vI_storage.multipleRecipients = null;
		vI_storage.lastCheckedEmail = {};
		vI_storage.firstUsedInputElement = null;
		awSetInputAndPopupValue = vI_storage.original_functions.awSetInputAndPopupValue;
	},
	
	original_functions : {
		awSetInputAndPopupValue : null,
	},

	replacement_functions : {
		awSetInputAndPopupValue : function (inputElem, inputValue, popupElem, popupValue, rowNumber) {
			vI_notificationBar.dump("## vI_storage: awSetInputAndPopupValue '" + inputElem.id +"'\n");
			vI_storage.original_functions.awSetInputAndPopupValue(inputElem, inputValue, popupElem, popupValue, rowNumber);
			vI_storage.updateVIdentityFromStorage(inputElem);
		},
	},
	
	observe: function() {
		vI_storage.elements.Obj_storageSave.setAttribute("hidden",
			!vI.preferences.getBoolPref("storage_show_switch"));
		vI_storage.elements.Obj_storageSave.checked = vI.preferences.getBoolPref("storage_storedefault");
	},
	
	addObserver: function() {
		vI_storage.prefroot.addObserver("extensions.virtualIdentity.storage_show_switch", vI_storage, false);
		vI_storage.prefroot.addObserver("extensions.virtualIdentity.storage_storedefault", vI_storage, false);	
	},
	
	removeObserver: function() {
		vI_storage.prefroot.removeObserver("extensions.virtualIdentity.storage_show_switch", vI_storage);
		vI_storage.prefroot.removeObserver("extensions.virtualIdentity.storage_storedefault", vI_storage);
	},
	
	awOnBlur : function (element) {
		// only react on events triggered by addressCol2 - textinput Elements
		if (! element.id.match(/^addressCol2*/)) return;
		vI_notificationBar.dump("## vI_storage: awOnBlur '" + element.id +"'\n");
		vI_storage.updateVIdentityFromStorage(element);
	},

	awPopupOnCommand : function (element) {
		vI_notificationBar.dump("## vI_storage: awPopupOnCommand'" + element.id +"'\n");
		vI_storage.updateVIdentityFromStorage(document.getElementById(element.id.replace(/^addressCol1/,"addressCol2")))
	},
	
	
	init: function() {
		if (!vI_storage.elements.Obj_storageSave) {
			vI_storage.elements.Obj_storageSave = document.getElementById("storage_save");
			vI_storage.addObserver();
			vI_storage.observe();
			
			// better approach would be to use te onchange event, but this one is not fired in any change case
			// see https://bugzilla.mozilla.org/show_bug.cgi?id=355367
			// same seems to happen with the ondragdrop event
			if (top.MAX_RECIPIENTS == 0) top.MAX_RECIPIENTS = 1;
			for (var row = 1; row <= top.MAX_RECIPIENTS ; row ++) {
				var input = awGetInputElement(row);
				if (input) {
					var oldBlur = input.getAttribute("onblur")
					input.setAttribute("onblur", (oldBlur?oldBlur+"; ":"") +
						"window.setTimeout(vI_storage.awOnBlur, 250, this.parentNode.parentNode.parentNode);")
				}
				var popup = awGetPopupElement(row);
				if (popup) {
					var oldCommand = popup.getAttribute("oncommand")
					popup.setAttribute("oncommand", (oldCommand?oldCommand+"; ":"") +
						"window.setTimeout(vI_storage.awPopupOnCommand, 250, this);")
				}
			}
		}
		vI_storage.original_functions.awSetInputAndPopupValue = awSetInputAndPopupValue;
		awSetInputAndPopupValue = function (inputElem, inputValue, popupElem, popupValue, rowNumber) {
			vI_storage.replacement_functions.awSetInputAndPopupValue (inputElem, inputValue, popupElem, popupValue, rowNumber) }
	},
	
	
	firstUsedInputElement : null, 	// this stores the first Element for which a Lookup in the Storage was successfull
	updateVIdentityFromStorage: function(inputElement) {		
		if (!vI.preferences.getBoolPref("storage"))
			{ vI_notificationBar.dump("## vI_storage: Storage deactivated\n"); return; }
		vI_notificationBar.dump("## vI_storage: updateVIdentityFromStorage()\n");

		var recipientType = document.getElementById(inputElement.id.replace(/^addressCol2/,"addressCol1"))
			.selectedItem.getAttribute("value");
		var row = inputElement.id.replace(/^addressCol2#/,"")
		if (recipientType == "addr_reply" || recipientType == "addr_followup" || vI_storage.__isDoBcc(row)) {
			// reset firstUsedInputElement if recipientType was changed (and don't care about doBcc fields)
			if (vI_storage.firstUsedInputElement == inputElement)
				vI_storage.firstUsedInputElement = null;
			vI_notificationBar.dump("## vI_storage: field is a 'reply-to' or 'followup-to' or preconfigured 'doBcc'. not searched.\n")
			return;
		}
		
		if (inputElement.value == "") {
			vI_notificationBar.dump("## vI_storage: no recipient found, not checked.\n"); return;
		}
		
		var row = inputElement.id.replace(/^addressCol2#/,"")
		if (vI_storage.lastCheckedEmail[row] && vI_storage.lastCheckedEmail[row] == inputElement.value) {
			vI_notificationBar.dump("## vI_storage: same email than before, not checked again.\n"); return;
		}
		vI_storage.lastCheckedEmail[row] = inputElement.value;
		var recipient = vI_storage.__getDescriptionAndType(inputElement.value, recipientType)
		var storageData = vI_rdfDatasource.readVIdentityFromRDF(recipient.recDesc, recipient.recType)
		if (!storageData) return;
		
		// found storageData, so store InputElement
		if (!vI_storage.firstUsedInputElement) vI_storage.firstUsedInputElement = inputElement;
		
		vI_notificationBar.dump("## vI_storage: compare with current Identity\n");
		
		if (vI.preferences.getBoolPref("storage_getOneOnly") && vI_storage.firstUsedInputElement &&
			vI_storage.firstUsedInputElement != inputElement) {
			vI_notificationBar.dump("## vI_storage: retrieved Identity for other recipient-field before. ignoring\n");
			if (!storageData.equalsCurrentIdentity()) {
					// add Identity to dropdown-menu
					vI_msgIdentityClone.addIdentityToCloneMenu(storageData)
					vI_notificationBar.setNote(vI.elements.strings.getString("vident.smartIdentity.vIStorageCollidingIdentity"),
					"storage_notification");
			}
		}
		// only update fields if new Identity is different than old one.
		else if (!storageData.equalsCurrentIdentity()) {
			// add Identity to dropdown-menu
			var menuItem = vI_msgIdentityClone.addIdentityToCloneMenu(storageData)
			var warning = vI_storage.__getReplaceVIdentityWarning(recipient, storageData);
			
			if (	vI_msgIdentityClone.elements.Obj_MsgIdentity_clone.getAttribute("timeStamp") ||
				vI_msgIdentityClone.elements.Obj_MsgIdentity_clone.getAttribute("value") != "vid" ||
				!vI.preferences.getBoolPref("storage_warn_vI_replace") ||
				vI_storage.promptService.confirm(window,"Warning",warning)) {
					vI_msgIdentityClone.setMenuToMenuItem(menuItem)
/*					vI_msgIdentityClone.setMenuToIdentity(storageData.id);
					vI_smtpSelector.setMenuToKey(storageData.smtp);
					storageData.extras.setValues();*/
/*					if (vI_msgIdentityClone.setIdentity(
						vI_helper.combineNames(storageData.fullName, storageData.email), null))*/
					if (vI_msgIdentityClone.elements.Obj_MsgIdentity_clone.getAttribute("value") == "vid")
						vI_notificationBar.setNote(vI.elements.strings.getString("vident.smartIdentity.vIStorageUsage") + ".",
						"storage_notification");
			}
		}
	},
	
	__getDescriptionAndType : function (recipient, recipientType) {
		if (recipientType == "addr_newsgroups")	return { recDesc : recipient, recType : "newsgroup" }
		else if (vI_storage.isMailingList(recipient))
			return { recDesc : vI_storage.getMailListName(recipient), recType : "maillist" }
		else return { recDesc : recipient, recType : "email" }
	},
		
	storeVIdentityToAllRecipients : function(msgType) {
		if (msgType != nsIMsgCompDeliverMode.Now) return;
		vI_notificationBar.dump("## vI_storage: ----------------------------------------------------------\n")
		if (!vI.preferences.getBoolPref("storage"))
			{ vI_notificationBar.dump("## vI_storage: Storage deactivated\n"); return; }
		vI_notificationBar.dump("## vI_storage: storeVIdentityToAllRecipients()\n");
		
		if (!vI_storage.elements.Obj_storageSave) {
			// ugly temp. fix for https://www.absorb.it/virtual-id/ticket/44
			vI_notificationBar.dump("## vI_storage: Obj_storageSave doesn't exist, shouldn't happen")
			vI_storage.elements.Obj_storageSave = document.getElementById("storage_save");
		}
		if (vI_storage.elements.Obj_storageSave.getAttribute("hidden") == "false" ) {
			vI_notificationBar.dump("## vI_storage: switch shown.\n")
			if (!vI_storage.elements.Obj_storageSave.checked) {
				vI_notificationBar.dump("## vI_storage: save button not checked.\n")
				return;
			}
		}
		else {
			vI_notificationBar.dump("## vI_storage: switch hidden.\n")
			if (!vI.preferences.getBoolPref("storage_storedefault")) {
				vI_notificationBar.dump("## vI_storage: not be safed by default.\n")
				return;
			}
		}
		
		// check if there are multiple recipients
		vI_storage.multipleRecipients = false;
		var recipients = 0;
		for (var row = 1; row <= top.MAX_RECIPIENTS; row ++) {
			var recipientType = awGetPopupElement(row).selectedItem.getAttribute("value");
			if (recipientType == "addr_reply" || recipientType == "addr_followup" || 
				vI_storage.__isDoBcc(row) || awGetInputElement(row).value.match(/^\s*$/) ) continue;
			if (recipients++ == 1) {
				vI_storage.multipleRecipients = true
				vI_notificationBar.dump("## vI_storage: multiple recipients found.\n")
				break;
			}
		}			
		
		for (var row = 1; row <= top.MAX_RECIPIENTS; row ++) {
			var recipientType = awGetPopupElement(row).selectedItem.getAttribute("value");
			if (recipientType == "addr_reply" || recipientType == "addr_followup" || 
				vI_storage.__isDoBcc(row) || awGetInputElement(row).value.match(/^\s*$/) ) continue;
			// by using a Timeout the possible prompt stopps the MessageSending
			// this is required, else lavascript context might be gone
			window.setTimeout(vI_storage.__updateStorageFromVIdentity, 0, awGetInputElement(row).value, recipientType)
		}
		vI_notificationBar.dump("## vI_storage: ----------------------------------------------------------\n")
	},
	
	__getVIdentityString : function() {
		var old_address = vI_helper.getAddress();
		var id_key = vI_msgIdentityClone.elements.Obj_MsgIdentity_clone.base_id_key;
		if (!id_key) id_key = vI_msgIdentityClone.elements.Obj_MsgIdentity_clone.getAttribute("value");
		var smtp_key = vI_smtpSelector.elements.Obj_SMTPServerList.selectedItem.getAttribute('key');
		var extras = new vI_storageExtras();
		extras.readValues();
		var localIdentityData = new identityData(old_address.email, old_address.name,
			id_key, smtp_key, extras)
		return localIdentityData.identityDescription();
	},

	__getReplaceVIdentityWarning : function(recipient, storageData) {
		return	vI.elements.strings.getString("vident.updateVirtualIdentity.warning1") +
			recipient.recDesc + " (" + recipient.recType + ")" +
			vI.elements.strings.getString("vident.updateVirtualIdentity.warning2") +
			storageData.identityDescription() +
			vI.elements.strings.getString("vident.updateVirtualIdentity.warning3");
	},
	
	__getOverwriteStorageWarning : function(recipient, storageData) {
		return  vI.elements.strings.getString("vident.updateStorage.warning1") +
			recipient.recDesc + " (" + recipient.recType + ")" +
			vI.elements.strings.getString("vident.updateStorage.warning2") +
			storageData.identityDescription() +
			vI.elements.strings.getString("vident.updateStorage.warning3") +
			vI_storage.__getVIdentityString() +
			vI.elements.strings.getString("vident.updateStorage.warning4");
	},
	
	__updateStorageFromVIdentity : function(recipient, recipientType) {
		vI_notificationBar.dump("## vI_storage: __updateStorageFromVIdentity.\n")
		var dontUpdateMultipleNoEqual = (vI.preferences.getBoolPref("storage_dont_update_multiple") &&
					vI_storage.multipleRecipients)
		
		recipient = vI_storage.__getDescriptionAndType(recipient, recipientType);
		var storageData = vI_rdfDatasource.readVIdentityFromRDF(recipient.recDesc, recipient.recType);
		if (storageData) {
			if (!storageData.equalsCurrentIdentity(storageData) &&
				!dontUpdateMultipleNoEqual) {
				var warning = vI_storage.__getOverwriteStorageWarning(recipient, storageData);
				vI_notificationBar.dump("## vI_storage: " + warning + ".\n")
				if (!vI.preferences.getBoolPref("storage_warn_update") ||
						vI_storage.promptService.confirm(window,"Warning",warning))
				vI_rdfDatasource.updateRDFFromVIdentity(recipient.recDesc, recipient.recType);
			}
		}
		else vI_rdfDatasource.updateRDFFromVIdentity(recipient.recDesc, recipient.recType);
	},
		
	
	// --------------------------------------------------------------------
	// the following function gets a queryString, a callFunction to call for every found Card related to the queryString
	// and a returnVar, which is passed to the callFunction and returned at the end.
	// this way the Storage-search is unified for all tasks
	_walkTroughCards : function (queryString, callFunction, returnVar) {
		var parentDir = vI_storage.rdfService.GetResource("moz-abdirectory://").QueryInterface(Components.interfaces.nsIAbDirectory);
		var enumerator = parentDir.childNodes;
		if (!enumerator) {vI_notificationBar.dump("## vI_storage: no addressbooks?\n"); return null;} // uups, no addressbooks?	
		while (enumerator && enumerator.hasMoreElements()) {
			var addrbook = enumerator.getNext();  // an addressbook directory
			addrbook.QueryInterface(Components.interfaces.nsIAbDirectory);
			var searchUri = (addrbook.directoryProperties?addrbook.directoryProperties.URI:addrbook.URI) + queryString;
			//~ vI_notificationBar.dump("## vI_storage: searchUri '" + searchUri + "'\n");
			//~ var directory = vI_storage.rdfService.GetResource(searchUri).QueryInterface(Components.interfaces.nsIAbDirectory);
			
			// just try the following steps, they might fail if addressbook wasn't configured the right way
			// not completely reproducible, but caused bug https://www.absorb.it/virtual-id/ticket/41
			try {
				var AbView = Components.classes["@mozilla.org/addressbook/abview;1"].createInstance(Components.interfaces.nsIAbView);
				AbView.init(searchUri, true, null, "GeneratedName", "ascending");
			} catch (ex) { break; };
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
				//~ vI_notificationBar.dump("## vI_storage:             checking '" + currentCard.displayName + "'.\n")
				returnVar = callFunction(addrbook, currentCard, returnVar);
				try { childCards.next(); } catch (ex) {	keepGoing = 0; }
			}
		}
		return returnVar;
	},
		
	// --------------------------------------------------------------------
	// check if recipient is a mailing list.
	// Similiar to Thunderbird, if there are muliple cards with the same displayName the mailinglist is preferred
	// see also https://bugzilla.mozilla.org/show_bug.cgi?id=408575
	isMailingList: function(recipient) {
		vI_notificationBar.dump("## vI_storage: isMailingList '" + recipient + "' \n")
		var queryString = "?(or(DisplayName,c," + encodeURIComponent(vI_storage.getMailListName(recipient)) + "))"
		var returnVar = vI_storage._walkTroughCards(queryString, vI_storage._isMailingListCard,
			{ mailListName : recipient, isMailList : false } )
		vI_notificationBar.dump("## vI_storage: isMailList  " + returnVar.isMailList + ".\n")
		return returnVar.isMailList;
	},	
	
	_isMailingListCard : function (addrbook, Card, returnVar) {
	// returnVar = { mailListName : mailListName, isMailList : false } 
		return { mailListName : returnVar.mailListName,
			isMailList : (returnVar.isMailList ||
			Card.isMailList && Card.displayName.toLowerCase() == returnVar.mailListName.toLowerCase()) }
	},
	
	// --------------------------------------------------------------------
	
	getMailListName : function(recipient) {
		if (recipient.match(/<[^>]*>/) || recipient.match(/$/)) {
			var mailListName = RegExp.leftContext + RegExp.rightContext
			mailListName = mailListName.replace(/^\s+|\s+$/g,"")
		}
		return mailListName;
	},
	
	__isDoBcc : function(row) {
		var recipientType = awGetPopupElement(row).selectedItem.getAttribute("value");
		if (recipientType != "addr_bcc" || !getCurrentIdentity().doBcc) return false
		var doBccArray = gMsgCompose.compFields.SplitRecipients(getCurrentIdentity().doBccList, false);
		for ( var index = 0; index < doBccArray.count; index++ ) {
			if (doBccArray.StringAt(index) == awGetInputElement(row).value) {
				vI_notificationBar.dump("## vI_storage: ignoring doBcc field '" +
					doBccArray.StringAt(index) + "'.\n");
				return true;
			}
		}		
		return false
	},

	getVIdentityFromAllRecipients : function(allIdentities) {
		if (!vI.preferences.getBoolPref("storage"))
			{ vI_notificationBar.dump("## vI_storage: Storage deactivated\n"); return; }
		vI_notificationBar.dump("## vI_storage: getVIdentityFromAllRecipients()\n");

		for (var row = 1; row <= top.MAX_RECIPIENTS; row ++) {
			var recipientType = awGetPopupElement(row).selectedItem.getAttribute("value");
			if (recipientType == "addr_reply" || recipientType == "addr_followup" || vI_storage.__isDoBcc(row)) continue;
			vI_storage.lastCheckedEmail[row] = awGetInputElement(row).value;
			recipient = vI_storage.__getDescriptionAndType(awGetInputElement(row).value, recipientType);
			var storageData = vI_rdfDatasource.readVIdentityFromRDF(recipient.recDesc, recipient.recType);
			if (storageData) allIdentities.addWithoutDuplicates(
				storageData.email,
				storageData.fullName,
				vI_helper.combineNames(storageData.fullName, storageData.email),
				storageData.id,
				storageData.smtp,
				storageData.extras)
		}
		vI_notificationBar.dump("## vI_storage: found " + allIdentities.number + " address(es)\n")
	}
}
window.addEventListener("unload", function(e) { try {vI_storage.removeObserver();} catch (ex) { } }, false);
