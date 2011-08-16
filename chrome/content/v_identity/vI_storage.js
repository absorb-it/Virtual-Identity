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

virtualIdentityExtension.ns(function() { with (virtualIdentityExtension.LIB) {
var storage = {
	multipleRecipients : null,
	focusedElement : null,
	
	lastCheckedEmail : {}, 	// array of last checked emails per row,
				// to prevent ugly double dialogs and time-consuming double-checks
	
	rdfService : Components.classes["@mozilla.org/rdf/rdf-service;1"]
			.getService(Components.interfaces.nsIRDFService),

	prefroot : Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefService)
			.getBranch(null).QueryInterface(Components.interfaces.nsIPrefBranch2),
	
    rdfDatasource : null,    // local storage

	clean: function() {
		vI.notificationBar.dump("## storage: clean.\n");
		storage.multipleRecipients = null;
		storage.lastCheckedEmail = {};
		storage.firstUsedInputElement = null;
		awSetInputAndPopupValue = storage.original_functions.awSetInputAndPopupValue;
        if (storage.rdfDatasource) storage.rdfDatasource.clean();
	},
	
	original_functions : {
		awSetInputAndPopupValue : null
	},

	replacement_functions : {
		awSetInputAndPopupValue : function (inputElem, inputValue, popupElem, popupValue, rowNumber) {
			vI.notificationBar.dump("## storage: awSetInputAndPopupValue '" + inputElem.id +"'\n");
			storage.original_functions.awSetInputAndPopupValue(inputElem, inputValue, popupElem, popupValue, rowNumber);
			storage.updateVIdentityFromStorage(inputElem);
		}
	},
		
	awOnBlur : function (element) {
		// only react on events triggered by addressCol2 - textinput Elements
		if (!element || ! element.id.match(/^addressCol2*/)) return;
		vI.notificationBar.dump("\n## storage: awOnBlur '" + element.id +"'\n");
		storage.updateVIdentityFromStorage(element);
		storage.focusedElement = null;
	},

	awOnFocus : function (element) {
		if (!element || ! element.id.match(/^addressCol2*/)) return;
		storage.focusedElement = element;
	},

	awPopupOnCommand : function (element) {
		vI.notificationBar.dump("\n## storage: awPopupOnCommand'" + element.id +"'\n");
		storage.updateVIdentityFromStorage(document.getElementById(element.id.replace(/^addressCol1/,"addressCol2")));
		if (element.selectedItem.getAttribute("value") == "addr_reply") // if reply-to is manually entered disable AutoReplyToSelf
			document.getElementById("autoReplyToSelfLabel").setAttribute("hidden", "true");

	},
	
    initialized : null,
	init: function() {
		if (!storage.initialized) {
            storage.rdfDatasource = new vI.rdfDatasource("virtualIdentity.rdf");

			// better approach would be to use te onchange event, but this one is not fired in any change case
			// see https://bugzilla.mozilla.org/show_bug.cgi?id=355367
			// same seems to happen with the ondragdrop event
			if (top.MAX_RECIPIENTS == 0) top.MAX_RECIPIENTS = 1;
			for (var row = 1; row <= top.MAX_RECIPIENTS ; row ++) {
				var input = awGetInputElement(row);
				if (input) {
					var oldBlur = input.getAttribute("onblur")
					input.setAttribute("onblur", (oldBlur?oldBlur+"; ":"") +
						"window.setTimeout(virtualIdentityExtension.storage.awOnBlur, 250, this.parentNode.parentNode.parentNode);")
					var oldFocus = input.getAttribute("onfocus")
					input.setAttribute("onfocus", (oldFocus?oldFocus+"; ":"") +
						"window.setTimeout(virtualIdentityExtension.storage.awOnFocus, 250, this.parentNode.parentNode.parentNode);")
				}
				var popup = awGetPopupElement(row);
				if (popup) {
					var oldCommand = popup.getAttribute("oncommand")
					popup.setAttribute("oncommand", (oldCommand?oldCommand+"; ":"") +
						"window.setTimeout(virtualIdentityExtension.storage.awPopupOnCommand, 250, this);")
				}
			}
			storage.initialized = true;
		}
		storage.original_functions.awSetInputAndPopupValue = awSetInputAndPopupValue;
		awSetInputAndPopupValue = function (inputElem, inputValue, popupElem, popupValue, rowNumber) {
			storage.replacement_functions.awSetInputAndPopupValue (inputElem, inputValue, popupElem, popupValue, rowNumber) }

		// reset unavailable storageExtras preferences
		const enigmail_ID="{847b3a00-7ab1-11d4-8f02-006008948af5}"
		if (!vI.helper.extensionActive(enigmail_ID)) {
			vI.main.preferences.setBoolPref("storageExtras_openPGP_messageEncryption", false)
			vI.main.preferences.setBoolPref("storageExtras_openPGP_messageSignature", false)
			vI.main.preferences.setBoolPref("storageExtras_openPGP_PGPMIME", false)
		}
	},
	
	
	firstUsedInputElement : null, 	// this stores the first Element for which a Lookup in the Storage was successfull
	updateVIdentityFromStorage: function(inputElement) {		
		if (!vI.main.preferences.getBoolPref("storage"))
			{ vI.notificationBar.dump("## storage: Storage deactivated\n"); return; }
		vI.notificationBar.dump("## storage: updateVIdentityFromStorage()\n");

		var recipientType = document.getElementById(inputElement.id.replace(/^addressCol2/,"addressCol1"))
			.selectedItem.getAttribute("value");
		var row = inputElement.id.replace(/^addressCol2#/,"")
		if (recipientType == "addr_reply" || recipientType == "addr_followup" || storage.__isDoBcc(row)) {
			// reset firstUsedInputElement if recipientType was changed (and don't care about doBcc fields)
			if (storage.firstUsedInputElement == inputElement)
				storage.firstUsedInputElement = null;
			vI.notificationBar.dump("## storage: field is a 'reply-to' or 'followup-to' or preconfigured 'doBcc'. not searched.\n")
			return;
		}
		
		if (inputElement.value == "") {
			vI.notificationBar.dump("## storage: no recipient found, not checked.\n"); return;
		}
		
		var row = inputElement.id.replace(/^addressCol2#/,"")
		if (storage.lastCheckedEmail[row] && storage.lastCheckedEmail[row] == inputElement.value) {
			vI.notificationBar.dump("## storage: same email than before, not checked again.\n"); return;
		}
		storage.lastCheckedEmail[row] = inputElement.value;
		var recipient = storage.__getDescriptionAndType(inputElement.value, recipientType);

		var matchResults = { storageData : {}, menuItem : {} };
		matchResults.storageData[0] = storage.rdfDatasource.readVIdentityFromRDF(recipient.recDesc, recipient.recType);
		matchResults.storageData[1] = storage.rdfDatasource.findMatchingFilter(recipient.recDesc);

		vI.notificationBar.dump("## storage: updateVIdentityFromStorage add found Identities to CloneMenu.\n");
		var matchIndex = null;
		for (var i = 0; i <= 1; i++) {
			if (matchResults.storageData[i]) {			// check if there is a result in direct match or filter
				if (matchIndex == null) matchIndex = i;		// prefer direct match instead of filter
				matchResults.menuItem[i] = document.getElementById("msgIdentity_clone")
								.addIdentityToCloneMenu(matchResults.storageData[i]);
			}
		}
		if (matchIndex == null) {
			vI.notificationBar.dump("## storage: updateVIdentityFromStorage no usable Storage-Data found.\n");
			return;
		}
		else {
			vI.notificationBar.dump("## storage: using data from " + ((matchIndex == 0)?"direct":"filter") + " match\n");
		}
		// found storageData, so store InputElement
		if (!storage.firstUsedInputElement) storage.firstUsedInputElement = inputElement;
		
		vI.notificationBar.dump("## storage: compare with current Identity\n");
		if (vI.main.preferences.getBoolPref("storage_getOneOnly") &&					// if requested to retrieve only storageID for first recipient entered
			storage.firstUsedInputElement &&						// and the request for the first recipient was already done
			storage.firstUsedInputElement != inputElement &&				// and it's not the same element we changed now
			!matchResults.storageData[matchIndex].equalsCurrentIdentity(false).equal)	// and this id is different than the current used one
				vI.notificationBar.setNote(vI.main.elements.strings
					.getString("vident.smartIdentity.vIStorageCollidingIdentity"),	// than drop the potential changes
					"storage_notification");
		// only update fields if new Identity is different than old one.
		else {
			vI.notificationBar.dump("## storage: updateVIdentityFromStorage check if storage-data matches current Identity.\n");
			var compResult = matchResults.storageData[matchIndex].equalsCurrentIdentity(true);
			if (!compResult.equal) {
				var warning = storage.__getWarning("replaceVIdentity", recipient, compResult.compareMatrix);
				var msgIdentityCloneElem = document.getElementById("msgIdentity_clone")
				if (	!msgIdentityCloneElem.vid ||
					!vI.main.preferences.getBoolPref("storage_warn_vI_replace") ||
					(storage.__askWarning(warning) == "accept")) {
						msgIdentityCloneElem.selectedMenuItem = matchResults.menuItem[matchIndex];
						if (msgIdentityCloneElem.vid)
							vI.notificationBar.setNote(vI.main.elements.strings.getString("vident.smartIdentity.vIStorageUsage") + ".",
							"storage_notification");
				}
			}
			else {
				vI.notificationBar.dump("## storage: updateVIdentityFromStorage doing nothing - equals current Identity.\n");
			}
		}
	},
	
	__getDescriptionAndType : function (recipient, recipientType) {
		if (recipientType == "addr_newsgroups")	return { recDesc : recipient, recType : "newsgroup" }
		else if (storage.__isMailingList(recipient)) {
			vI.notificationBar.dump("## __getDescriptionAndType: '" + recipient + "' is MailList\n");
			return { recDesc : storage.__getMailListName(recipient), recType : "maillist" }
		}
		else {
			vI.notificationBar.dump("## __getDescriptionAndType: '" + recipient + "' is no MailList\n");
			var localIdentityData = new vI.identityData(recipient, null, null, null, null, null, null);
			return { recDesc : localIdentityData.combinedName, recType : "email" }
		}
	},
		
	storeVIdentityToAllRecipients : function(msgType) {
		if (msgType != nsIMsgCompDeliverMode.Now) return true;
		vI.notificationBar.dump("## storage: ----------------------------------------------------------\n")
		if (!vI.main.preferences.getBoolPref("storage"))
			{ vI.notificationBar.dump("## storage: Storage deactivated\n"); return true; }
		
		if (vI.statusmenu.objStorageSaveMenuItem.getAttribute("checked") != "true") {
			vI.notificationBar.dump("## storage: SaveMenuItem not checked.\n")
			return true;
		}
		
		vI.notificationBar.dump("## storage: storeVIdentityToAllRecipients()\n");
		
		// check if there are multiple recipients
		storage.multipleRecipients = false;
		var recipients = 0;
		for (var row = 1; row <= top.MAX_RECIPIENTS; row ++) {
			var recipientType = awGetPopupElement(row).selectedItem.getAttribute("value");
			if (recipientType == "addr_reply" || recipientType == "addr_followup" || 
				storage.__isDoBcc(row) || awGetInputElement(row).value.match(/^\s*$/) ) continue;
			if (recipients++ == 1) {
				storage.multipleRecipients = true
				vI.notificationBar.dump("## storage: multiple recipients found.\n")
				break;
			}
		}			
		
		for (var row = 1; row <= top.MAX_RECIPIENTS; row ++) {
			var recipientType = awGetPopupElement(row).selectedItem.getAttribute("value");
			if (recipientType == "addr_reply" || recipientType == "addr_followup" || 
				storage.__isDoBcc(row) || awGetInputElement(row).value.match(/^\s*$/) ) continue;
			if (!storage.__updateStorageFromVIdentity(awGetInputElement(row).value, recipientType)) {
				vI.notificationBar.dump("## storage: --------------  aborted  ---------------------------------\n")
				return false; // abort sending
			}
		}
		vI.notificationBar.dump("## storage: ----------------------------------------------------------\n");
		return true;
	},
	
	__getWarning : function(warningCase, recipient, compareMatrix) {
		var warning = { title: null, recLabel : null, recipient : null, warning : null, css: null, query : null, class : null };
		warning.title = vI.main.elements.strings.getString("vident." + warningCase + ".title")
		warning.recLabel = vI.main.elements.strings.getString("vident." + warningCase + ".recipient") + " (" + recipient.recType + "):"
		warning.recipient = recipient.recDesc;
		warning.warning = 
			"<table class='" + warningCase + "'><thead><tr><th class='col1'/>" +
				"<th class='col2'>" + vI.main.elements.strings.getString("vident." + warningCase + ".currentIdentity") + "</th>" +
				"<th class='col3'>" + vI.main.elements.strings.getString("vident." + warningCase + ".storedIdentity") + "</th>" +
			"</tr></thead>" +
			"<tbody>" + compareMatrix + "</tbody>" +
			"</table>"
		warning.css = "vI.DialogBrowser.css";
		warning.query = vI.main.elements.strings.getString("vident." + warningCase + ".query");
		warning.class = warningCase;
		return warning;
	},

	__askWarning : function(warning) {
		var retVar = { returnValue: null };
		var answer = window.openDialog("chrome://v_identity/content/vI_Dialog.xul","",
					"chrome, dialog, modal, alwaysRaised, resizable=yes",
					 warning, retVar)
		return retVar.returnValue;
	},
	
	__updateStorageFromVIdentity : function(recipient, recipientType) {
		vI.notificationBar.dump("## storage: __updateStorageFromVIdentity.\n")
		var dontUpdateMultipleNoEqual = (vI.main.preferences.getBoolPref("storage_dont_update_multiple") &&
					storage.multipleRecipients)
		vI.notificationBar.dump("## storage: __updateStorageFromVIdentity dontUpdateMultipleNoEqual='" + dontUpdateMultipleNoEqual + "'\n")
		recipient = storage.__getDescriptionAndType(recipient, recipientType);

		var storageDataByType = storage.rdfDatasource.readVIdentityFromRDF(recipient.recDesc, recipient.recType);
		var storageDataByFilter = storage.rdfDatasource.findMatchingFilter(recipient.recDesc);
		
		// update (storing) of data by type is required if there is
		// no data stored by type (or different data stored) and no equal filter found
		var storageDataByTypeCompResult = storageDataByType?storageDataByType.equalsCurrentIdentity(true):null;
		var storageDataByTypeEqual = (storageDataByType && storageDataByTypeCompResult.equal);
		var storageDataByFilterEqual = (storageDataByFilter && storageDataByFilter.equalsCurrentIdentity(false).equal);
		
		var doUpdate = "";
		if (	(!storageDataByType && !storageDataByFilterEqual) ||
			(!storageDataByTypeEqual && !storageDataByFilterEqual && !dontUpdateMultipleNoEqual) ) {
			vI.notificationBar.dump("## storage: __updateStorageFromVIdentity updating\n")
			var doUpdate = "accept";
			if (storageDataByType && !storageDataByTypeEqual && vI.main.preferences.getBoolPref("storage_warn_update")) {
				vI.notificationBar.dump("## storage: __updateStorageFromVIdentity overwrite warning\n");
				doUpdate = storage.__askWarning(storage.__getWarning("updateStorage", recipient, storageDataByTypeCompResult.compareMatrix));
				if (doUpdate == "takeover") {
					var msgIdentityCloneElem = document.getElementById("msgIdentity_clone");
					msgIdentityCloneElem.selectedMenuItem = msgIdentityCloneElem.addIdentityToCloneMenu(storageDataByType);
					return false;
				}
				if (doUpdate == "abort") return false;
			}
		}
		if (doUpdate == "accept") storage.rdfDatasource.updateRDFFromVIdentity(recipient.recDesc, recipient.recType);
		return true;
	},
		
	// --------------------------------------------------------------------
	// check if recipient is a mailing list.
	// Similiar to Thunderbird, if there are muliple cards with the same displayName the mailinglist is preferred
	// see also https://bugzilla.mozilla.org/show_bug.cgi?id=408575
	__isMailingList: function(recipient) {
		let abManager = Components.classes["@mozilla.org/abmanager;1"]
			.getService(Components.interfaces.nsIAbManager);
		let allAddressBooks = abManager.directories;
		while (allAddressBooks.hasMoreElements()) {
			let ab = allAddressBooks.getNext();
			if (ab instanceof Components.interfaces.nsIAbDirectory && !ab.isRemote) {
				let abdirectory = abManager.getDirectory(ab.URI + 
					"?(and(DisplayName,=," + encodeURIComponent(storage.__getMailListName(recipient)) + ")(IsMailList,=,TRUE))");
				if (abdirectory) {
					let cards = abdirectory.childCards;
					if (cards.hasMoreElements()) return true;	// only interested if there is at least one element...
				}
			}
		}
		return false;
	},	
	
	// --------------------------------------------------------------------
	
	__getMailListName : function(recipient) {
		if (recipient.match(/<[^>]*>/) || recipient.match(/$/)) {
			var mailListName = RegExp.leftContext + RegExp.rightContext
			mailListName = mailListName.replace(/^\s+|\s+$/g,"")
		}
		return mailListName;
	},
	
	__isDoBcc : function(row) {
		var recipientType = awGetPopupElement(row).selectedItem.getAttribute("value");
		if (recipientType != "addr_bcc" || !getCurrentIdentity().doBcc) return false

		var doBccArray = gMsgCompose.compFields.splitRecipients(getCurrentIdentity().doBccList, false, {});

		for (var index = 0; index < doBccArray.count; index++ ) {
			if (doBccArray.StringAt(index) == awGetInputElement(row).value) {
				vI.notificationBar.dump("## storage: ignoring doBcc field '" +
					doBccArray.StringAt(index) + "'.\n");
				return true;
			}
		}		
		return false
	},

	getVIdentityFromAllRecipients : function(allIdentities) {
		if (!vI.main.preferences.getBoolPref("storage"))
			{ vI.notificationBar.dump("## storage: Storage deactivated\n"); return; }
		vI.notificationBar.dump("## storage: getVIdentityFromAllRecipients()\n");

		for (var row = 1; row <= top.MAX_RECIPIENTS; row ++) {
			var recipientType = awGetPopupElement(row).selectedItem.getAttribute("value");
			if (recipientType == "addr_reply" || recipientType == "addr_followup" || storage.__isDoBcc(row)) continue;
			storage.lastCheckedEmail[row] = awGetInputElement(row).value;
			var recipient = storage.__getDescriptionAndType(awGetInputElement(row).value, recipientType);
			var storageData = storage.rdfDatasource.readVIdentityFromRDF(recipient.recDesc, recipient.recType);
			if (storageData) allIdentities.addWithoutDuplicates(storageData);
			storageData = storage.rdfDatasource.findMatchingFilter(recipient.recDesc);
			if (storageData) allIdentities.addWithoutDuplicates(storageData);
		}
		vI.notificationBar.dump("## storage: found " + allIdentities.number + " address(es)\n")
	}
}
vI.storage = storage;
}});