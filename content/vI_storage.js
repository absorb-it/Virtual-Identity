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
virtualIdentityExtension.ns(function () {
  with(virtualIdentityExtension.LIB) {

    Components.utils.import("resource://gre/modules/AddonManager.jsm");
    let Log = vI.setupLogging("virtualIdentity.storage");
    Components.utils.import("resource://v_identity/vI_rdfDatasource.js", virtualIdentityExtension);
    Components.utils.import("resource://v_identity/vI_prefs.js", virtualIdentityExtension);

    var storage = {
      timeStampID: null, // used to trace different objects of same type
      focusedElement: null,

      lastCheckedEmail: {}, // array of last checked emails per row,
      // to prevent ugly double dialogs and time-consuming double-checks

      _rdfDatasourceAccess: null, // local storage

      stringBundle: Components.classes["@mozilla.org/intl/stringbundle;1"]
        .getService(Components.interfaces.nsIStringBundleService)
        .createBundle("chrome://v_identity/locale/v_identity.properties"),

      clean: function () {
        Log.debug("clean");
        storage.multipleRecipients = null;
        storage.lastCheckedEmail = {};
        storage.firstUsedInputElement = null;
        if (storage.original_functions.awSetInputAndPopupValue) {
          awSetInputAndPopupValue = storage.original_functions.awSetInputAndPopupValue;
          storage.original_functions.awSetInputAndPopupValue = null;
        }
        if (storage._rdfDatasourceAccess) storage._rdfDatasourceAccess.clean();
      },

      original_functions: {
        awSetInputAndPopupValue: null
      },

      replacement_functions: {
        awSetInputAndPopupValue: function (inputElem, inputValue, popupElem, popupValue, rowNumber) {
          Log.debug("[" + storage.timeStampID + "] " + "awSetInputAndPopupValue '" + inputElem.id + "'");
          storage.original_functions.awSetInputAndPopupValue(inputElem, inputValue, popupElem, popupValue, rowNumber);
          storage.__updateVIdentityFromStorage(inputElem, storage.currentWindow);
        }
      },

      awOnBlur: function (element, currentWindow) {
        // only react on events triggered by addressCol2 - textinput Elements
        if (!element || !element.id.match(/^addressCol2*/)) return;
        Log.debug("awOnBlur '" + element.id);
        if (!element.value || element.value == "" || typeof element.value == 'undefined') return;
        storage.__updateVIdentityFromStorage(element, currentWindow);
        storage.focusedElement = null;
      },

      awOnFocus: function (element, currentWindow) {
        if (!element || !element.id.match(/^addressCol2*/)) return;
        Log.debug("awOnFocus '" + element.id);
        storage.focusedElement = element;
      },

      awPopupOnCommand: function (element, currentWindow) {
        Log.debug("awPopupOnCommand '" + element.id + "' '" + element.value + "'");
        storage.__updateVIdentityFromStorage(element.parentNode.nextSibling.firstChild, currentWindow);
      },

      initialized: null,
      currentWindow: null,
      init: function () {
        if (!this.timeStampID) {
          this.timeStampID = parseInt((new Date()).getTime() / 100) % 864000; // give object unified id (per day)
          Log = vI.setupLogging("virtualIdentity.storage[" + this.timeStampID + "]");
        }
        if (!storage.initialized) {
          Log.debug("initializing storage request environment");
          storage._rdfDatasourceAccess = new vI.rdfDatasourceAccess(window);

          // better approach would be to use te onchange event, but this one is not fired in any change case
          // see https://bugzilla.mozilla.org/show_bug.cgi?id=355367
          // same seems to happen with the ondragdrop event
          if (!top.MAX_RECIPIENTS || top.MAX_RECIPIENTS == 0) top.MAX_RECIPIENTS = 1;
          for (var row = 1; row <= top.MAX_RECIPIENTS; row++) {
            var input = window.awGetInputElement(row);
            if (input) {
              var oldBlur = input.getAttribute("onblur")
              input.setAttribute("onblur", (oldBlur ? oldBlur + "; " : "") +
                "window.setTimeout(virtualIdentityExtension.storage.awOnBlur, 250, this, window);")
              var oldFocus = input.getAttribute("onfocus")
              input.setAttribute("onfocus", (oldFocus ? oldFocus + "; " : "") +
                "window.setTimeout(virtualIdentityExtension.storage.awOnFocus, 250, this, window);")
            }
            var popup = window.awGetPopupElement(row);
            if (popup) {
              var oldCommand = popup.getAttribute("oncommand")
              popup.setAttribute("oncommand",
                "window.setTimeout(virtualIdentityExtension.storage.awPopupOnCommand, 250, this, window);" +
                (oldCommand ? "; " + oldCommand : ""))
            }
          }
          storage.currentWindow = window;
          Log.debug("initializing storage request environment - done.");
          storage.initialized = true;
        } else {
          Log.debug("storage request environment already initialized");
        }

        if (typeof awSetInputAndPopupValue == 'function' && storage.original_functions.awSetInputAndPopupValue == null) {
          Log.debug("replacing awSetInputAndPopupValue");
          storage.original_functions.awSetInputAndPopupValue = awSetInputAndPopupValue;
          awSetInputAndPopupValue = function (inputElem, inputValue, popupElem, popupValue, rowNumber) {
            storage.replacement_functions.awSetInputAndPopupValue(inputElem, inputValue, popupElem, popupValue, rowNumber)
          }
        }
      },

      firstUsedInputElement: null, // this stores the first Element for which a Lookup in the Storage was successfull
      __updateVIdentityFromStorage: function (inputElement, currentWindow) {
        Log.debug("__updateVIdentityFromStorage");
        if (!vI.vIprefs.get("storage")) {
          Log.debug("Storage deactivated");
          return;
        }
        var currentDocument = currentWindow.document;
        try {
          var recipientType = inputElement.parentNode.previousSibling.firstChild.selectedItem.getAttribute("value");
        } catch (e) {
          Log.debug("inputElement.parentNode.previousSibling.firstChild.selectedItem.getAttribute('value') raised an error")
          return;
        }

        var row = inputElement.id.replace(/^addressCol2#/, "")
        if (recipientType == "addr_reply" || recipientType == "addr_followup" || storage.isDoBcc(row, currentWindow)) {
          // reset firstUsedInputElement if recipientType was changed (and don't care about doBcc fields)
          if (storage.firstUsedInputElement == inputElement)
            storage.firstUsedInputElement = null;
          Log.debug("field is a 'reply-to' or 'followup-to' or preconfigured 'doBcc'. not searched.")
          return;
        }

        if (inputElement.value == "") {
          Log.debug("no recipient found, not checked.");
          return;
        }

        var row = inputElement.id.replace(/^addressCol2#/, "")
        if (storage.lastCheckedEmail[row] && storage.lastCheckedEmail[row] == inputElement.value) {
          Log.debug("same email than before, not checked again.");
          return;
        }
        storage.lastCheckedEmail[row] = inputElement.value;

        // firstUsedInputElement was set before and we are not editing the same
        var isNotFirstInputElement = (storage.firstUsedInputElement && storage.firstUsedInputElement != inputElement)
        var currentIdentity = currentDocument.getElementById("msgIdentity").identityData
        var storageResult = storage._rdfDatasourceAccess.updateVIdentityFromStorage(inputElement.value, recipientType,
          currentIdentity, currentDocument.getElementById("msgIdentity").vid, isNotFirstInputElement);

        if (storageResult.identityCollection.number == 0) return; // return if there was no match
        Log.debug("__updateVIdentityFromStorage result: " + storageResult.result);
        // found storageData, so store InputElement
        if (!storage.firstUsedInputElement) storage.firstUsedInputElement = inputElement;

        var newMenuItem = null;
        if (storageResult.result != "equal") {
          for (var j = 0; j < storageResult.identityCollection.number; j++) {
            Log.debug("__updateVIdentityFromStorage adding: " + storageResult.identityCollection.identityDataCollection[j].combinedName);
            let menuItem = currentDocument.getElementById("msgIdentity")
              .addIdentityToMsgIdentityMenu(storageResult.identityCollection.identityDataCollection[j])
            if (!newMenuItem) newMenuItem = menuItem;
          }
        }
        if (storageResult.result == "accept") {
          Log.debug("__updateVIdentityFromStorage selecting: " + storageResult.identityCollection.identityDataCollection[0].combinedName);
          currentDocument.getElementById("msgIdentity").selectedMenuItem = newMenuItem;
          if (currentDocument.getElementById("msgIdentity").vid)
            vI.StorageNotification.info(storage.stringBundle.GetStringFromName("vident.smartIdentity.vIStorageUsage") + ".");
        }
      },

      isDoBcc: function (row, currentWindow) {
        if (typeof currentWindow.awGetPopupElement(row).selectedItem == 'undefined')
          return false;
        var recipientType = currentWindow.awGetPopupElement(row).selectedItem.getAttribute("value");
        if (recipientType != "addr_bcc" || !getCurrentIdentity().doBcc) return false

        var doBccArray = gMsgCompose.compFields.splitRecipients(getCurrentIdentity().doBccList, false, {});
        if (doBccArray && doBccArray.count) {
          for (var index = 0; index < doBccArray.count; index++) {
            if (doBccArray.StringAt(index) == currentWindow.awGetInputElement(row).value) {
              Log.debug("ignoring doBcc field '" +
                doBccArray.StringAt(index));
              return true;
            }
          }
        }
        return false
      }
    }
    vI.storage = storage;
  }
});
