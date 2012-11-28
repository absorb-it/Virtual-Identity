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

Components.utils.import("resource://v_identity/vI_nameSpaceWrapper.js");
virtualIdentityExtension.ns(function() { with (virtualIdentityExtension.LIB) {

Components.utils.import("resource://gre/modules/AddonManager.jsm");
let Log = vI.setupLogging("virtualIdentity.storage");
Components.utils.import("resource://v_identity/vI_rdfDatasource.js", virtualIdentityExtension);
Components.utils.import("resource://v_identity/vI_prefs.js", virtualIdentityExtension);

var storage = {
	focusedElement : null,
	
	lastCheckedEmail : {}, 	// array of last checked emails per row,
				// to prevent ugly double dialogs and time-consuming double-checks
	
    _rdfDatasourceAccess : null,    // local storage

    stringBundle : Components.classes["@mozilla.org/intl/stringbundle;1"]
        .getService(Components.interfaces.nsIStringBundleService)
        .createBundle("chrome://v_identity/locale/v_identity.properties"),

    clean: function() {
		Log.debug("clean.");
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
			Log.debug("awSetInputAndPopupValue '" + inputElem.id + "'");
			storage.original_functions.awSetInputAndPopupValue(inputElem, inputValue, popupElem, popupValue, rowNumber);
			storage.updateVIdentityFromStorage(inputElem, document);
		}
	},
		
	awOnBlur : function (element) {
		// only react on events triggered by addressCol2 - textinput Elements
		if (!element || ! element.id.match(/^addressCol2*/)) return;
		Log.debug("awOnBlur '" + element.id + "'");
		storage.updateVIdentityFromStorage(element, document);
		storage.focusedElement = null;
	},

	awOnFocus : function (element) {
		if (!element || ! element.id.match(/^addressCol2*/)) return;
		storage.focusedElement = element;
	},

	awPopupOnCommand : function (element) {
		Log.debug("awPopupOnCommand '" + element.id + "'");
		storage.updateVIdentityFromStorage(document.getElementById(element.id.replace(/^addressCol1/,"addressCol2")), document);
		if (element.selectedItem.getAttribute("value") == "addr_reply") // if reply-to is manually entered disable AutoReplyToSelf
			document.getElementById("virtualIdentityExtension_autoReplyToSelfLabel").setAttribute("hidden", "true");

	},
	
  awGetPopupElement : function (row) {
    if (typeof awGetPopupElement === 'function')
      return awGetPopupElement(row);
    return document.getElementById("addressCol1#" + row);
  },

  awGetInputElement : function (row) {
    if (typeof awGetInputElement === 'function')
      return awGetInputElement(row);
    return document.getElementById("addressCol2#" + row);
  },

    initialized : null,
	init: function() {
		if (!storage.initialized) {
            storage._rdfDatasourceAccess = new vI.rdfDatasourceAccess();

			// better approach would be to use te onchange event, but this one is not fired in any change case
			// see https://bugzilla.mozilla.org/show_bug.cgi?id=355367
			// same seems to happen with the ondragdrop event
			if (!top.MAX_RECIPIENTS || top.MAX_RECIPIENTS == 0) top.MAX_RECIPIENTS = 1;
			for (var row = 1; row <= top.MAX_RECIPIENTS ; row ++) {
				var input = storage.awGetInputElement(row);
				if (input) {
					var oldBlur = input.getAttribute("onblur")
					input.setAttribute("onblur", (oldBlur?oldBlur+"; ":"") +
						"window.setTimeout(virtualIdentityExtension.storage.awOnBlur, 250, this);")
					var oldFocus = input.getAttribute("onfocus")
					input.setAttribute("onfocus", (oldFocus?oldFocus+"; ":"") +
						"window.setTimeout(virtualIdentityExtension.storage.awOnFocus, 250, this);")
				}
				var popup = storage.awGetPopupElement(row);
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
            vI.vIprefs.commit("storageExtras_openPGP_messageEncryption", false)
            vI.vIprefs.commit("storageExtras_openPGP_messageSignature", false)
            vI.vIprefs.commit("storageExtras_openPGP_PGPMIME", false)
          }
        }); 
	},
	
	firstUsedInputElement : null, 	// this stores the first Element for which a Lookup in the Storage was successfull
	updateVIdentityFromStorage: function(inputElement, refdocument) {
		if (!vI.vIprefs.get("storage"))
			{ Log.debug("Storage deactivated"); return; }
		Log.debug("updateVIdentityFromStorage()");
    Log.debug(refdocument);
    Log.debug(refdocument.id);
    var recipientType = refdocument.getElementById(inputElement.id.replace(/^addressCol2/,"addressCol1"))
			.selectedItem.getAttribute("value");

    var row = inputElement.id.replace(/^addressCol2#/,"")
		if (recipientType == "addr_reply" || recipientType == "addr_followup" || storage.__isDoBcc(row)) {
			// reset firstUsedInputElement if recipientType was changed (and don't care about doBcc fields)
			if (storage.firstUsedInputElement == inputElement)
				storage.firstUsedInputElement = null;
			Log.debug("field is a 'reply-to' or 'followup-to' or preconfigured 'doBcc'. not searched.")
			return;
		}
		
		if (inputElement.value == "") {
			Log.debug("no recipient found, not checked."); return;
		}
		
		var row = inputElement.id.replace(/^addressCol2#/,"")
		if (storage.lastCheckedEmail[row] && storage.lastCheckedEmail[row] == inputElement.value) {
			Log.debug("same email than before, not checked again."); return;
		}
		storage.lastCheckedEmail[row] = inputElement.value;
		
		// firstUsedInputElement was set before and we are not editing the same
		var isNotFirstInputElement = (storage.firstUsedInputElement && storage.firstUsedInputElement != inputElement)
		var currentIdentity = refdocument.getElementById("virtualIdentityExtension_msgIdentityClone").identityData
		var storageResult = storage._rdfDatasourceAccess.updateVIdentityFromStorage(inputElement.value, recipientType,
			currentIdentity, refdocument.getElementById("virtualIdentityExtension_msgIdentityClone").vid, isNotFirstInputElement, window);
		
		if (storageResult.identityCollection.number == 0) return; // return if there was no match
		Log.debug("updateVIdentityFromStorage result: " + storageResult.result);
		// found storageData, so store InputElement
		if (!storage.firstUsedInputElement) storage.firstUsedInputElement = inputElement;
		
		var newMenuItem = null;
		if (storageResult.result != "equal") {
			for (var j = 0; j < storageResult.identityCollection.number; j++) {
				Log.debug("updateVIdentityFromStorage adding: " + storageResult.identityCollection.identityDataCollection[j].combinedName);
				let menuItem = refdocument.getElementById("virtualIdentityExtension_msgIdentityClone")
                  .addIdentityToCloneMenu(storageResult.identityCollection.identityDataCollection[j])
                if (!newMenuItem) newMenuItem = menuItem;
			}
		}
		if (storageResult.result == "accept") {
			Log.debug("updateVIdentityFromStorage selecting: " + storageResult.identityCollection.identityDataCollection[0].combinedName);
			refdocument.getElementById("virtualIdentityExtension_msgIdentityClone").selectedMenuItem = newMenuItem;
			if (refdocument.getElementById("virtualIdentityExtension_msgIdentityClone").vid)
				vI.StorageNotification.info(storage.stringBundle.GetStringFromName("vident.smartIdentity.vIStorageUsage") + ".");
		}
	},
	
	__isDoBcc : function(row) {
		var recipientType = storage.awGetPopupElement(row).selectedItem.getAttribute("value");
		if (recipientType != "addr_bcc" || !getCurrentIdentity().doBcc) return false

		var doBccArray = gMsgCompose.compFields.splitRecipients(getCurrentIdentity().doBccList, false, {});

		for (var index = 0; index < doBccArray.count; index++ ) {
			if (doBccArray.StringAt(index) == storage.awGetInputElement(row).value) {
				Log.debug("ignoring doBcc field '" +
					doBccArray.StringAt(index));
				return true;
			}
		}		
		return false
	}
}
vI.storage = storage;
}});