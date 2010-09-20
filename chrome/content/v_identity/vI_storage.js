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

var vI_storage = {
	multipleRecipients : null,
	focusedElement : null,
	
	lastCheckedEmail : {}, 	// array of last checked emails per row,
				// to prevent ugly double dialogs and time-consuming double-checks
	
	rdfService : Components.classes["@mozilla.org/rdf/rdf-service;1"]
			.getService(Components.interfaces.nsIRDFService),

	prefroot : Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefService)
			.getBranch(null).QueryInterface(Components.interfaces.nsIPrefBranch2),
	
    vI_rdfDatasource : null,    // local storage

	clean: function() {
		vI_notificationBar.dump("## vI_storage: clean.\n");
		vI_storage.multipleRecipients = null;
		vI_storage.lastCheckedEmail = {};
		vI_storage.firstUsedInputElement = null;
		awSetInputAndPopupValue = vI_storage.original_functions.awSetInputAndPopupValue;
        if (vI_storage.vI_rdfDatasource) vI_storage.vI_rdfDatasource.clean();
	},
	
	original_functions : {
		awSetInputAndPopupValue : null
	},

	replacement_functions : {
		awSetInputAndPopupValue : function (inputElem, inputValue, popupElem, popupValue, rowNumber) {
			vI_notificationBar.dump("## vI_storage: awSetInputAndPopupValue '" + inputElem.id +"'\n");
			vI_storage.original_functions.awSetInputAndPopupValue(inputElem, inputValue, popupElem, popupValue, rowNumber);
			vI_storage.updateVIdentityFromStorage(inputElem);
		}
	},
		
	awOnBlur : function (element) {
		// only react on events triggered by addressCol2 - textinput Elements
		if (!element || ! element.id.match(/^addressCol2*/)) return;
		vI_notificationBar.dump("\n## vI_storage: awOnBlur '" + element.id +"'\n");
		vI_storage.updateVIdentityFromStorage(element);
		vI_storage.focusedElement = null;
	},

	awOnFocus : function (element) {
		if (!element || ! element.id.match(/^addressCol2*/)) return;
		vI_storage.focusedElement = element;
	},

	awPopupOnCommand : function (element) {
		vI_notificationBar.dump("\n## vI_storage: awPopupOnCommand'" + element.id +"'\n");
		vI_storage.updateVIdentityFromStorage(document.getElementById(element.id.replace(/^addressCol1/,"addressCol2")));
		if (element.selectedItem.getAttribute("value") == "addr_reply") // if reply-to is manually entered disable AutoReplyToSelf
			document.getElementById("autoReplyToSelfLabel").setAttribute("hidden", "true");

	},
	
    initialized : null,
	init: function() {
		if (!vI_storage.initialized) {
            vI_storage.vI_rdfDatasource = new vI_rdfDatasource("virtualIdentity.rdf");

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
					var oldFocus = input.getAttribute("onfocus")
					input.setAttribute("onfocus", (oldFocus?oldFocus+"; ":"") +
						"window.setTimeout(vI_storage.awOnFocus, 250, this.parentNode.parentNode.parentNode);")
				}
				var popup = awGetPopupElement(row);
				if (popup) {
					var oldCommand = popup.getAttribute("oncommand")
					popup.setAttribute("oncommand", (oldCommand?oldCommand+"; ":"") +
						"window.setTimeout(vI_storage.awPopupOnCommand, 250, this);")
				}
			}
			vI_storage.initialized = true;
		}
		vI_storage.original_functions.awSetInputAndPopupValue = awSetInputAndPopupValue;
		awSetInputAndPopupValue = function (inputElem, inputValue, popupElem, popupValue, rowNumber) {
			vI_storage.replacement_functions.awSetInputAndPopupValue (inputElem, inputValue, popupElem, popupValue, rowNumber) }

		// reset unavailable storageExtras preferences
		const enigmail_ID="{847b3a00-7ab1-11d4-8f02-006008948af5}"
		if (!vI_helper.extensionActive(enigmail_ID)) {
			vI_main.preferences.setBoolPref("storageExtras_openPGP_messageEncryption", false)
			vI_main.preferences.setBoolPref("storageExtras_openPGP_messageSignature", false)
			vI_main.preferences.setBoolPref("storageExtras_openPGP_PGPMIME", false)
		}
	},
	
	
	firstUsedInputElement : null, 	// this stores the first Element for which a Lookup in the Storage was successfull
	updateVIdentityFromStorage: function(inputElement) {		
		if (!vI_main.preferences.getBoolPref("storage"))
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
		var recipient = vI_storage.__getDescriptionAndType(inputElement.value, recipientType);

		var matchResults = { storageData : {}, menuItem : {} };
		matchResults.storageData[0] = vI_storage.vI_rdfDatasource.readVIdentityFromRDF(recipient.recDesc, recipient.recType);
		matchResults.storageData[1] = vI_storage.vI_rdfDatasource.findMatchingFilter(recipient.recDesc);

		vI_notificationBar.dump("## vI_storage: updateVIdentityFromStorage add found Identities to CloneMenu.\n");
		var matchIndex = null;
		for (var i = 0; i <= 1; i++) {
			if (matchResults.storageData[i]) {			// check if there is a result in direct match or filter
				if (matchIndex == null) matchIndex = i;		// prefer direct match instead of filter
				matchResults.menuItem[i] = document.getElementById("msgIdentity_clone")
								.addIdentityToCloneMenu(matchResults.storageData[i]);
			}
		}
		if (matchIndex == null) {
			vI_notificationBar.dump("## vI_storage: updateVIdentityFromStorage no usable Storage-Data found.\n");
			return;
		}
		else {
			vI_notificationBar.dump("## vI_storage: using data from " + ((matchIndex == 0)?"direct":"filter") + " match\n");
		}
		// found storageData, so store InputElement
		if (!vI_storage.firstUsedInputElement) vI_storage.firstUsedInputElement = inputElement;
		
		vI_notificationBar.dump("## vI_storage: compare with current Identity\n");
		if (vI_main.preferences.getBoolPref("storage_getOneOnly") &&					// if requested to retrieve only storageID for first recipient entered
			vI_storage.firstUsedInputElement &&						// and the request for the first recipient was already done
			vI_storage.firstUsedInputElement != inputElement &&				// and it's not the same element we changed now
			!matchResults.storageData[matchIndex].equalsCurrentIdentity(false).equal)	// and this id is different than the current used one
				vI_notificationBar.setNote(vI_main.elements.strings
					.getString("vident.smartIdentity.vIStorageCollidingIdentity"),	// than drop the potential changes
					"storage_notification");
		// only update fields if new Identity is different than old one.
		else {
			vI_notificationBar.dump("## vI_storage: updateVIdentityFromStorage check if storage-data matches current Identity.\n");
			var compResult = matchResults.storageData[matchIndex].equalsCurrentIdentity(true);
			if (!compResult.equal) {
				var warning = vI_storage.__getWarning("replaceVIdentity", recipient, compResult.compareMatrix);
				var msgIdentityCloneElem = document.getElementById("msgIdentity_clone")
				if (	!msgIdentityCloneElem.vid ||
					!vI_main.preferences.getBoolPref("storage_warn_vI_replace") ||
					(vI_storage.__askWarning(warning) == "accept")) {
						msgIdentityCloneElem.selectedMenuItem = matchResults.menuItem[matchIndex];
						if (msgIdentityCloneElem.vid)
							vI_notificationBar.setNote(vI_main.elements.strings.getString("vident.smartIdentity.vIStorageUsage") + ".",
							"storage_notification");
				}
			}
			else {
				vI_notificationBar.dump("## vI_storage: updateVIdentityFromStorage doing nothing - equals current Identity.\n");
			}
		}
	},
	
	__getDescriptionAndType : function (recipient, recipientType) {
		if (recipientType == "addr_newsgroups")	return { recDesc : recipient, recType : "newsgroup" }
		else if (vI_storage.isMailingList(recipient))
			return { recDesc : vI_storage.getMailListName(recipient), recType : "maillist" }
		else {
			var localIdentityData = new vI_identityData(recipient, null, null, null, null, null, null);
			return { recDesc : localIdentityData.combinedName, recType : "email" }
		}
	},
		
	storeVIdentityToAllRecipients : function(msgType) {
		if (msgType != nsIMsgCompDeliverMode.Now) return true;
		vI_notificationBar.dump("## vI_storage: ----------------------------------------------------------\n")
		if (!vI_main.preferences.getBoolPref("storage"))
			{ vI_notificationBar.dump("## vI_storage: Storage deactivated\n"); return true; }
		
		if (vI_statusmenu.objStorageSaveMenuItem.getAttribute("checked") != "true") {
			vI_notificationBar.dump("## vI_storage: SaveMenuItem not checked.\n")
			return true;
		}
		
		vI_notificationBar.dump("## vI_storage: storeVIdentityToAllRecipients()\n");
		
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
			if (!vI_storage.__updateStorageFromVIdentity(awGetInputElement(row).value, recipientType)) {
				vI_notificationBar.dump("## vI_storage: --------------  aborted  ---------------------------------\n")
				return false; // abort sending
			}
		}
		vI_notificationBar.dump("## vI_storage: ----------------------------------------------------------\n");
		return true;
	},
	
	__getWarning : function(warningCase, recipient, compareMatrix) {
		var warning = { title: null, recLabel : null, recipient : null, warning : null, css: null, query : null, class : null };
		warning.title = vI_main.elements.strings.getString("vident." + warningCase + ".title")
		warning.recLabel = vI_main.elements.strings.getString("vident." + warningCase + ".recipient") + " (" + recipient.recType + "):"
		warning.recipient = recipient.recDesc;
		warning.warning = 
			"<table class='" + warningCase + "'><thead><tr><th class='col1'/>" +
				"<th class='col2'>" + vI_main.elements.strings.getString("vident." + warningCase + ".currentIdentity") + "</th>" +
				"<th class='col3'>" + vI_main.elements.strings.getString("vident." + warningCase + ".storedIdentity") + "</th>" +
			"</tr></thead>" +
			"<tbody>" + compareMatrix + "</tbody>" +
			"</table>"
		warning.css = "vI_DialogBrowser.css";
		warning.query = vI_main.elements.strings.getString("vident." + warningCase + ".query");
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
		vI_notificationBar.dump("## vI_storage: __updateStorageFromVIdentity.\n")
		var dontUpdateMultipleNoEqual = (vI_main.preferences.getBoolPref("storage_dont_update_multiple") &&
					vI_storage.multipleRecipients)
		vI_notificationBar.dump("## vI_storage: __updateStorageFromVIdentity dontUpdateMultipleNoEqual='" + dontUpdateMultipleNoEqual + "'\n")
		recipient = vI_storage.__getDescriptionAndType(recipient, recipientType);

		var storageDataByType = vI_storage.vI_rdfDatasource.readVIdentityFromRDF(recipient.recDesc, recipient.recType);
		var storageDataByFilter = vI_storage.vI_rdfDatasource.findMatchingFilter(recipient.recDesc);
		
		// update (storing) of data by type is required if there is
		// no data stored by type (or different data stored) and no equal filter found
		var storageDataByTypeCompResult = storageDataByType?storageDataByType.equalsCurrentIdentity(true):null;
		var storageDataByTypeEqual = (storageDataByType && storageDataByTypeCompResult.equal);
		var storageDataByFilterEqual = (storageDataByFilter && storageDataByFilter.equalsCurrentIdentity(false).equal);
		
		var doUpdate = "";
		if (	(!storageDataByType && !storageDataByFilterEqual) ||
			(!storageDataByTypeEqual && !storageDataByFilterEqual && !dontUpdateMultipleNoEqual) ) {
			vI_notificationBar.dump("## vI_storage: __updateStorageFromVIdentity updating\n")
			var doUpdate = "accept";
			if (storageDataByType && !storageDataByTypeEqual && vI_main.preferences.getBoolPref("storage_warn_update")) {
				vI_notificationBar.dump("## vI_storage: __updateStorageFromVIdentity overwrite warning\n");
				doUpdate = vI_storage.__askWarning(vI_storage.__getWarning("updateStorage", recipient, storageDataByTypeCompResult.compareMatrix));
				if (doUpdate == "takeover") {
					var msgIdentityCloneElem = document.getElementById("msgIdentity_clone");
					msgIdentityCloneElem.selectedMenuItem = msgIdentityCloneElem.addIdentityToCloneMenu(storageDataByType);
					return false;
				}
				if (doUpdate == "abort") return false;
			}
		}
		if (doUpdate == "accept") vI_storage.vI_rdfDatasource.updateRDFFromVIdentity(recipient.recDesc, recipient.recType);
		return true;
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
				var currentCard = childCards.currentItem();
				currentCard.QueryInterface(Components.interfaces.nsIAbCard);
				callFunction(addrbook, currentCard, returnVar);
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
		var queryString = "?(or(DisplayName,c," + encodeURIComponent(vI_storage.getMailListName(recipient)) + "))"
		var returnVar = vI_storage._walkTroughCards(queryString, vI_storage._isMailingListCard,
			{ mailListName : vI_storage.getMailListName(recipient), isMailList : false } )
		return returnVar.isMailList;
	},	
	
	_isMailingListCard : function (addrbook, Card, returnVar) {
	// returnVar = { mailListName : mailListName, isMailList : false } 
		returnVar.isMailList = (returnVar.isMailList ||
			Card.isMailList && Card.displayName.toLowerCase() == returnVar.mailListName.toLowerCase() )
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

		var doBccArray;
		if (typeof(gMsgCompose.compFields.SplitRecipients)=="function")
			doBccArray = gMsgCompose.compFields.SplitRecipients(getCurrentIdentity().doBccList, false);	// TB 2.x
		else	doBccArray = gMsgCompose.compFields.splitRecipients(getCurrentIdentity().doBccList, false, {});	// TB 3.x

		for (var index = 0; index < doBccArray.count; index++ ) {
			if (doBccArray.StringAt(index) == awGetInputElement(row).value) {
				vI_notificationBar.dump("## vI_storage: ignoring doBcc field '" +
					doBccArray.StringAt(index) + "'.\n");
				return true;
			}
		}		
		return false
	},

	getVIdentityFromAllRecipients : function(allIdentities) {
		if (!vI_main.preferences.getBoolPref("storage"))
			{ vI_notificationBar.dump("## vI_storage: Storage deactivated\n"); return; }
		vI_notificationBar.dump("## vI_storage: getVIdentityFromAllRecipients()\n");

		for (var row = 1; row <= top.MAX_RECIPIENTS; row ++) {
			var recipientType = awGetPopupElement(row).selectedItem.getAttribute("value");
			if (recipientType == "addr_reply" || recipientType == "addr_followup" || vI_storage.__isDoBcc(row)) continue;
			vI_storage.lastCheckedEmail[row] = awGetInputElement(row).value;
			var recipient = vI_storage.__getDescriptionAndType(awGetInputElement(row).value, recipientType);
			var storageData = vI_storage.vI_rdfDatasource.readVIdentityFromRDF(recipient.recDesc, recipient.recType);
			if (storageData) allIdentities.addWithoutDuplicates(storageData);
			storageData = vI_storage.vI_rdfDatasource.findMatchingFilter(recipient.recDesc);
			if (storageData) allIdentities.addWithoutDuplicates(storageData);
		}
		vI_notificationBar.dump("## vI_storage: found " + allIdentities.number + " address(es)\n")
	}
}
