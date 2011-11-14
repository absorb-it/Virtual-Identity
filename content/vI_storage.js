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

Components.utils.import("resource://gre/modules/AddonManager.jsm");

var storage = {
	focusedElement : null,
	_pref : Components.classes["@mozilla.org/preferences-service;1"]
		.getService(Components.interfaces.nsIPrefService)
		.getBranch("extensions.virtualIdentity."),
	
	lastCheckedEmail : {}, 	// array of last checked emails per row,
				// to prevent ugly double dialogs and time-consuming double-checks
	
    _rdfDatasourceAccess : null,    // local storage

	clean: function() {
		vI.notificationBar.dump("## storage: clean.\n");
		storage.multipleRecipients = null;
		storage.lastCheckedEmail = {};
		storage.firstUsedInputElement = null;
		awSetInputAndPopupValue = storage.original_functions.awSetInputAndPopupValue;
        if (storage._rdfDatasourceAccess) storage._rdfDatasourceAccess.clean();
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
            storage._rdfDatasourceAccess = new vI.rdfDatasourceAccess();

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
        AddonManager.getAddonByID("{847b3a00-7ab1-11d4-8f02-006008948af5}", function(addon) {
          if (addon && !addon.userDisabled && !addon.appDisable) {
            vI.main.preferences.setBoolPref("storageExtras_openPGP_messageEncryption", false)
            vI.main.preferences.setBoolPref("storageExtras_openPGP_messageSignature", false)
            vI.main.preferences.setBoolPref("storageExtras_openPGP_PGPMIME", false)
          }
        }); 
	},
	
	firstUsedInputElement : null, 	// this stores the first Element for which a Lookup in the Storage was successfull
	updateVIdentityFromStorage: function(inputElement) {
		if (!storage._pref.getBoolPref("storage"))
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
		
		// firstUsedInputElement was set before and we are not editing the same
		var isNotFirstInputElement = (storage.firstUsedInputElement && storage.firstUsedInputElement != inputElement)
		var currentIdentity = document.getElementById("msgIdentity_clone").identityData
		var storageResult = storage._rdfDatasourceAccess.updateVIdentityFromStorage(inputElement.value, recipientType,
			currentIdentity, document.getElementById("msgIdentity_clone").vid, isNotFirstInputElement);
		
		if (storageResult.identityCollection.number == 0) return; // return if there was no match
		vI.notificationBar.dump("## storage: updateVIdentityFromStorage result: " + storageResult.result + "\n");
		// found storageData, so store InputElement
		if (!storage.firstUsedInputElement) storage.firstUsedInputElement = inputElement;
		
		var selectedMenuItem;
		if (storageResult.result != "equal") {
			for (var j = 0; j < storageResult.identityCollection.number; j++) {
				vI.notificationBar.dump("## storage: updateVIdentityFromStorage adding: " + storageResult.identityCollection.identityDataCollection[j].combinedName + "\n");
				selectedMenuItem = document.getElementById("msgIdentity_clone").addIdentityToCloneMenu(storageResult.identityCollection.identityDataCollection[j])
			}
		}
		if (storageResult.result == "accept") {
			vI.notificationBar.dump("## storage: updateVIdentityFromStorage selecting: " + storageResult.identityCollection.identityDataCollection[0].combinedName + "\n");
			document.getElementById("msgIdentity_clone").selectedMenuItem = selectedMenuItem;
			if (document.getElementById("msgIdentity_clone").vid)
				vI.notificationBar.setNote(vI.main.elements.strings.getString("vident.smartIdentity.vIStorageUsage") + ".",
					"storage_notification");
		}
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
	}
}
vI.storage = storage;
}});