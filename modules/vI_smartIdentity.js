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

var EXPORTED_SYMBOLS = ["smartIdentity"]

Components.utils.import("resource://v_identity/vI_log.js");
Components.utils.import("resource://v_identity/vI_identityData.js");
Components.utils.import("resource://v_identity/vI_smartIdentityCollection.js");
Components.utils.import("resource://v_identity/vI_prefs.js");

let Log = setupLogging("virtualIdentity.smartIdentity");

function smartIdentity(currentWindow, msgCompose, storage) {
  this._window = currentWindow;
  this._document = currentWindow.document;
  this._msgCompose = msgCompose;
  this._storage = storage;
  this.init();
};

smartIdentity.prototype = {
  _window: null,
  _document: null,
  _msgCompose: null,
  _storage: null,
  _smartIdentityCollection: null,

  messenger: Components.classes["@mozilla.org/messenger;1"].createInstance()
    .QueryInterface(Components.interfaces.nsIMessenger),

  stringBundle: Components.classes["@mozilla.org/intl/stringbundle;1"]
    .getService(Components.interfaces.nsIStringBundleService)
    .createBundle("chrome://v_identity/locale/v_identity.properties"),

  // After Loading the MessageComposeDialog, check if smartIdentity is needed
  init: function () {
    var msgHdr;
    var msgComposeTypeReference = Components.interfaces.nsIMsgCompType;
    Log.debug("this._document.title=" + this._document.title + " this._msgCompose=" + this._msgCompose + " msgIdentityClone=" + this._document.getElementById("virtualIdentityExtension_msgIdentityClone"))

    var newsgroup = this._msgCompose.compFields.newsgroups;
    var autocreate = false;
    Log.debug("msgComposeTypeReference = " + this._msgCompose.type);
    switch (this._msgCompose.type) {
    case msgComposeTypeReference.Reply:
    case msgComposeTypeReference.ReplyAll:
    case msgComposeTypeReference.ReplyToGroup: // reply to a newsgroup, would possibly be stopped later
    case msgComposeTypeReference.ReplyToSender:
    case msgComposeTypeReference.ReplyToSenderAndGroup: // reply to a newsgroup, would possibly be stopped later
    case msgComposeTypeReference.ReplyWithTemplate:
    case msgComposeTypeReference.ReplyToList:
      Log.debug("Reply");
      msgHdr = this.messenger.
      messageServiceFromURI(this._msgCompose.originalMsgURI).messageURIToMsgHdr(this._msgCompose.originalMsgURI);
      this._smartIdentityCollection = new smartIdentityCollection(msgHdr, this._window.getCurrentIdentity(), this._document.getElementById("virtualIdentityExtension_msgIdentityClone").vid, newsgroup, this._getRecipients(this._window));
      this._smartIdentityCollection.Reply();
      autocreate = false;
      break;
    case msgComposeTypeReference.Draft:
    case msgComposeTypeReference.Template:
      Log.debug("Draft");
      msgHdr = this.messenger.
      messageServiceFromURI(this._msgCompose.compFields.draftId).messageURIToMsgHdr(this._msgCompose.compFields.draftId);
      this._smartIdentityCollection = new smartIdentityCollection(msgHdr, this._window.getCurrentIdentity(), this._document.getElementById("virtualIdentityExtension_msgIdentityClone").vid, newsgroup, this._getRecipients(this._window));
      this._smartIdentityCollection.Draft();
      autocreate = false;
      break;
    case msgComposeTypeReference.ForwardAsAttachment:
    case msgComposeTypeReference.ForwardInline:
    case msgComposeTypeReference.New:
    case msgComposeTypeReference.NewsPost:
    case msgComposeTypeReference.MailToUrl:
      Log.debug("New Mail");
      this._smartIdentityCollection = new smartIdentityCollection(null, this._window.getCurrentIdentity(), this._document.getElementById("virtualIdentityExtension_msgIdentityClone").vid, newsgroup, this._getRecipients(this._window));
      // to enable composing new email with new identity: identity is hidden in subject line
      // used for instance from conversation addon
      var subject = this._msgCompose.compFields.subject.split(/\n/);
      if (subject.length > 1 && subject[1] == "virtualIdentityExtension") {
        Log.debug("NewMail() found stored identity preset: " + subject[2]);
        this._smartIdentityCollection.__parseHeadersWithArray(subject[2], this._smartIdentityCollection._allIdentities);
        this._msgCompose.compFields.subject = subject[0];
        this._document.getElementById("msgSubject").value = subject[0];
      } else this._smartIdentityCollection.NewMail();
      autocreate = true;
      break;
    }
    if (this._smartIdentityCollection._allIdentities.number > 0) this.__smartIdentitySelection(autocreate);
  },

  _getRecipients: function () {
    var recipients = [];
    for (var row = 1; row <= this._window.top.MAX_RECIPIENTS; row++) {
      var recipientType = this._window.awGetPopupElement(row).selectedItem.getAttribute("value");
      if (recipientType == "addr_reply" || recipientType == "addr_followup" ||
        this._storage.isDoBcc(row, this._window) || this._window.awGetInputElement(row).value.match(/^\s*$/)) continue;
      recipients.push({
        recipient: this._window.awGetInputElement(row).value,
        recipientType: recipientType
      });
    }
    return recipients;
  },

  __smartIdentitySelection: function (autocreate) {
    Log.debug("__smartIdentitySelection autocreate=" + autocreate);

    if (vIprefs.get("idSelection_preferExisting")) {
      var existingIDIndex = this._smartIdentityCollection._foundExistingIdentity();
      if (existingIDIndex) {
        Log.debug("found existing Identity, use without interaction.");
        // add all Indentities to Clone Menu before selecting and leaving the function
        this._document.getElementById("virtualIdentityExtension_msgIdentityClone").addIdentitiesToCloneMenu(this._smartIdentityCollection._allIdentities);
        this.changeIdentityToSmartIdentity(this._smartIdentityCollection._allIdentities, existingIDIndex.key);
        return;
      }
    }

    this._document.getElementById("virtualIdentityExtension_msgIdentityClone").addIdentitiesToCloneMenu(this._smartIdentityCollection._allIdentities);
    Log.debug("__smartIdentitySelection _allIdentities.number=" +
      this._smartIdentityCollection._allIdentities.number +
      " _ask_always=" + vIprefs.get("idSelection_ask_always") +
      " _ask=" + vIprefs.get("idSelection_ask"));
    if (!autocreate && vIprefs.get("idSelection_ask") &&
      ((this._smartIdentityCollection._allIdentities.number == 1 && vIprefs.get("idSelection_ask_always")) || this._smartIdentityCollection._allIdentities.number > 1)) {
      for (var index = 0; index < this._smartIdentityCollection._allIdentities.number; index++) {
        Log.debug("smartIdentityReplyDialog index=" + index + ": '" + this._smartIdentityCollection._allIdentities.identityDataCollection[index].combinedName + "' " + "(" + this._smartIdentityCollection._allIdentities.identityDataCollection[index].id.value + "," + this._smartIdentityCollection._allIdentities.identityDataCollection[index].smtp.value + ")");
      }
      window.openDialog("chrome://v_identity/content/vI_smartReplyDialog.xul", 0,
        "chrome, dialog, modal, alwaysRaised, resizable=yes",
        this._smartIdentityCollection._allIdentities,
        /* callback: */
        this.changeIdentityToSmartIdentity).focus();
    } else if (autocreate || vIprefs.get("idSelection_autocreate")) {
      this.changeIdentityToSmartIdentity(this._smartIdentityCollection._allIdentities, 0);
    }
  },

  changeIdentityToSmartIdentity: function (allIdentities, selectedValue) {
    Log.debug("changeIdentityToSmartIdentity selectedValue=" + selectedValue + " from " + allIdentities.number);
    Log.debug("changeIdentityToSmartIdentity selectedValue=" + selectedValue + ": '" + allIdentities.identityDataCollection[selectedValue].combinedName + "' " + "(" + allIdentities.identityDataCollection[selectedValue].id.value + "," + allIdentities.identityDataCollection[selectedValue].smtp.value + ")");
    this._document.getElementById("virtualIdentityExtension_msgIdentityClone").selectedMenuItem = allIdentities.menuItems[selectedValue];
    if (this._document.getElementById("virtualIdentityExtension_msgIdentityClone").vid) {
      var label = this.stringBundle.GetStringFromName("vident.smartIdentity.vIUsage");
      if (allIdentities.number > 1) label += " " + this.stringBundle.GetStringFromName("vident.smartIdentity.moreThanOne");
      SmartReplyNotification.info(label + ".");
    }
    this.__removeSmartIdentityFromRecipients(allIdentities, selectedValue);
  },

  __removeSmartIdentityFromRecipients: function (allIdentities, index) {
    if (!vIprefs.get("idSelection_removeSmartIdentityFromRecipients")) return;

    // check if selected email is defined as doBcc address. If so, it should not be removed.
    var skip_bcc = false;
    if (this._window.getCurrentIdentity().doBcc) {
      var bcc_addresses = new identityCollection();
      this.__parseHeadersWithArray(this._window.getCurrentIdentity().doBccList, bcc_addresses);

      for (var i = 0; i < bcc_addresses.number; i++) {
        if (allIdentities.identityDataCollection[index].email == bcc_addresses.identityDataCollection[i].email) {
          skip_bcc = true;
          break;
        }
      }
    }

    // check if there is more than one recipient for this mail. If not, preserve the only one existing.
    var recipientCount = 0;
    for (var row = 1; row <= this._window.top.MAX_RECIPIENTS; row++) {
      var recipientType = this._window.awGetPopupElement(row).selectedItem.getAttribute("value");
      if (recipientType == "addr_to" || recipientType == "addr_cc") recipientCount++;
    }
    if (recipientCount < 2) return;


    for (var row = 1; row <= this._window.top.MAX_RECIPIENTS; row++) {
      var popup = this._window.awGetPopupElement(row);
      var input = this._window.awGetInputElement(row);
      var recipientType = popup.selectedItem.getAttribute("value");
      // if the entry is not a recipient, just continue
      if (recipientType == "addr_reply" || recipientType == "addr_followup") continue;
      // check if the entry is used as a BCC selected in account settings
      if (recipientType == "addr_bcc" && skip_bcc) continue;
      // check if entry is matching senders address, if so, remove it
      if (input.value == allIdentities.identityDataCollection[index].email ||
        input.value == allIdentities.identityDataCollection[index].combinedName) {
        this._window.awSetInputAndPopupValue(input, "", popup, "addr_to", -1);
        this._window.awCleanupRows()
        SmartReplyNotification.info(" " + this.stringBundle.GetStringFromName("vident.smartIdentity.remRecipient"));
        break;
      }
    }
  }
}