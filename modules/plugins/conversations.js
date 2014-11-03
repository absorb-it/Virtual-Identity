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

var EXPORTED_SYMBOLS = [];

const {
  classes: Cc,
  interfaces: Ci,
  utils: Cu,
  results: Cr
} = Components;

Cu.import("resource://v_identity/vI_log.js");
Cu.import("resource://v_identity/vI_rdfDatasource.js");
Cu.import("resource://v_identity/vI_account.js");
Cu.import("resource://v_identity/vI_smartIdentityCollection.js");
Cu.import("resource://v_identity/vI_identityData.js");
Cu.import("resource://v_identity/vI_prefs.js");

let Log = setupLogging("virtualIdentity.plugins.conversations");

const AccountManager = Cc["@mozilla.org/messenger/account-manager;1"]
  .getService(Components.interfaces.nsIMsgAccountManager);

const HeaderParser = Cc["@mozilla.org/messenger/headerparser;1"]
  .getService(Ci.nsIMsgHeaderParser);

let currentIdentityData;
let currentIdSenderName;
let virtualIdInUse;
let virtualSenderNameElem;

let _rdfDatasourceAccess;

let changeIdentityToSmartIdentity = function (allIdentities, index) {
  _changeIdentityToSmartIdentity(allIdentities.identityDataCollection[index]);
};

let _changeIdentityToSmartIdentity = function (identityData) {
  Log.debug("changeIdentityToSmartIdentity");

  if (identityData.id.key != null) {
    currentParams.identity = AccountManager.getIdentity(identityData.id.key);
    Log.debug("changed base identity to ", identityData.id.key);
    virtualSenderNameElem.text(currentIdSenderName);
  }
  virtualIdInUse = !(identityData.isExistingIdentity(false));
  Log.debug("changeIdentityToSmartIdentity virtualIdInUse=" + virtualIdInUse);
  if (virtualIdInUse) {
    currentIdentityData = identityData;
    currentIdSenderName = currentIdentityData.combinedName;
  }
  virtualSenderNameElem.text(identityData.combinedName); // change this also to reflect changes of base id
};

let virtualIdentityHook = {
  onComposeSessionChanged: function _virtualIdentityHook_onComposeSessionChanged(aComposeSession, aMessage, aAddress) {
    let toAddrList = aAddress.to.concat(aAddress.cc);

    currentParams = aComposeSession.params;
    virtualSenderNameElem = aComposeSession.senderNameElem; // to enable access from out of this class.
    let identity = aComposeSession.params.identity;

    if (typeof (this._AccountManager.getServersForIdentity) == 'function') { // new style
      let server = this._AccountManager.getServersForIdentity(identity).queryElementAt(0, Components.interfaces.nsIMsgIncomingServer);
    } else {
      let server = this._AccountManager.GetServersForIdentity(identity).QueryElementAt(0, Components.interfaces.nsIMsgIncomingServer);
    }

    currentIdentityData = new identityData(identity.email, identity.fullName, identity.key,
      identity.smtpServerKey, null, server.prettyName, true)
    currentIdSenderName = currentIdentityData.combinedName;
    virtualIdInUse = false;

    let recipients = [];
    var combinedNames = {};
    var number;
    number = HeaderParser.parseHeadersWithArray(toAddrList.join(", "), {}, {}, combinedNames);
    for (var index = 0; index < number; index++)
      recipients.push({
        recipient: combinedNames.value[index],
        recipientType: "addr_to"
      })

    var localSmartIdentityCollection = new smartIdentityCollection(aComposeSession.params.msgHdr, identity,
      false, false, recipients);
    localSmartIdentityCollection.Reply(); // we can always use the reply-case, msgHdr is set the right way

    if (localSmartIdentityCollection._allIdentities.number == 0)
      return;

    if (vIprefs.get("idSelection_preferExisting")) {
      var existingIDIndex = localSmartIdentityCollection._foundExistingIdentity();
      if (existingIDIndex) {
        Log.debug("smartIdentity: found existing Identity, use without interaction.", existingIDIndex.key);
        changeIdentityToSmartIdentity(localSmartIdentityCollection._allIdentities, existingIDIndex.key);
        return;
      }
    }

    if (vIprefs.get("idSelection_ask") &&
      ((localSmartIdentityCollection._allIdentities.number == 1 && vIprefs.get("idSelection_ask_always")) || localSmartIdentityCollection._allIdentities.number > 1)) {
      recentWindow = Cc["@mozilla.org/appshell/window-mediator;1"]
        .getService(Ci.nsIWindowMediator)
        .getMostRecentWindow("mail:3pane");

      recentWindow.openDialog("chrome://v_identity/content/vI_smartReplyDialog.xul", 0,
        "chrome, dialog, modal, alwaysRaised, resizable=yes",
        localSmartIdentityCollection._allIdentities,
        /* callback: */
        changeIdentityToSmartIdentity).focus();
    } else if (vIprefs.get("idSelection_autocreate"))
      changeIdentityToSmartIdentity(localSmartIdentityCollection._allIdentities, 0);
  },

  onMessageBeforeSendOrPopout_canceled: function _enigmailHook_onMessageBeforeSendOrPopout_canceledy(aAddress, aEditor, aStatus, aPopout) {
    Log.debug("onMessageBeforeSendOrPopout_canceled");
    return aStatus;

  },
  onMessageBeforeSendOrPopout: function _enigmailHook_onMessageBeforeSendOrPopout(aAddress, aEditor, aStatus, aPopout) {
    Log.debug("onMessageBeforeSendOrPopout");
    return aStatus;

  },
  onMessageBeforeSendOrPopout_early: function _enigmailHook_onMessageBeforeSendOrPopout_early(aAddress, aEditor, aStatus, aPopout) {
    if (aStatus.canceled)
      return aStatus;

    let toAddrList = aAddress.to.concat(aAddress.cc);
    Log.debug("onMessageBeforeSendOrPopup_early");

    if (virtualIdInUse) {
      if (!aPopout) {
        let recipients = [];
        var combinedNames = {};
        var number;
        number = HeaderParser.parseHeadersWithArray(toAddrList.join(", "), {}, {}, combinedNames);
        for (var index = 0; index < number; index++)
          recipients.push({
            recipient: combinedNames.value[index],
            recipientType: "addr_to"
          })

        let recentWindow = Cc["@mozilla.org/appshell/window-mediator;1"]
          .getService(Ci.nsIWindowMediator)
          .getMostRecentWindow("mail:3pane");

        returnValue = vIaccount_prepareSendMsg(virtualIdInUse, Ci.nsIMsgCompDeliverMode.Now,
          currentIdentityData, aAddress.params.identity, recipients, recentWindow);
        Log.debug("returnValue.update:", returnValue.update);

        if (returnValue.update == "abort") {
          aStatus.canceled = true;
          return aStatus;
        } else if (returnValue.update == "takeover") {
          _changeIdentityToSmartIdentity(returnValue.storedIdentity);
          aStatus.canceled = true;
          return aStatus;
        }

        aAddress.params.identity = get_vIaccount().defaultIdentity;
        if (!vIaccount_finalCheck(currentIdentityData, aAddress.params.identity)) {
          vIaccount_removeUsedVIAccount();
          aStatus.canceled = true;
          return aStatus;
        }
      } else {
        // code virtual Identity into subject - this will be decoded by smartIdentity - newMail
        aAddress.params.subject = aAddress.params.subject + "\nvirtualIdentityExtension\n" + currentIdSenderName;
        Log.debug("coding virtualIdentity into subject:", aAddress.params.subject);
      }
    }
    Log.debug("onSendMessage done");
    return aStatus;
  },

  onStopSending: function _virtualIdentityHook_onStopSending(aMsgID, aStatus, aMsg, aReturnFile) {
    vIaccount_removeUsedVIAccount();
    Log.debug("onStopSending done");
  },

  onRecipientAdded: function _virtualIdentityHook_onRecipientAdded(aData, aType, aCount) {
    Log.debug("onRecipientAdded", aData.data, aType, aCount);
    if (!vIprefs.get("storage")) return;
    if (aType == "bcc") return;
    if (aData.data == "") return;

    // if we are editing the "cc" or not the first recipient, recognize this.
    var isNotFirstInputElement = !(aType == "to" && aCount == 0);
    Log.debug("onRecipientAdded isNotFirstInputElement", isNotFirstInputElement);

    if (!_rdfDatasourceAccess) _rdfDatasourceAccess = new rdfDatasourceAccess();
    else _rdfDatasourceAccess.clean();

    let recentWindow = Cc["@mozilla.org/appshell/window-mediator;1"]
      .getService(Ci.nsIWindowMediator)
      .getMostRecentWindow("mail:3pane");

    var storageResult = _rdfDatasourceAccess.updateVIdentityFromStorage(aData.data, "addr_to",
      currentIdentityData, virtualIdInUse, isNotFirstInputElement, recentWindow);

    if (storageResult.identityCollection.number == 0) return; // return if there was no match
    if (storageResult.result != "accept") return; // return if we don't like the resulting id

    changeIdentityToSmartIdentity(storageResult.identityCollection, 0);
  }
}

try {
  Cu.import("resource://conversations/modules/hook.js");
  mainWindow = Cc["@mozilla.org/appshell/window-mediator;1"]
    .getService(Ci.nsIWindowMediator)
    .getMostRecentWindow("mail:3pane");
  mainWindow.addEventListener("load", function () {
    Log.debug("Virtual Identity plugin for Thunderbird Conversations loaded!");
    registerHook(virtualIdentityHook);
  }, false);
} catch (e) {
  Log.debug("virtualIdentity is ready for conversations, but you don't use it");
}