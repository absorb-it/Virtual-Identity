virtualIdentityExtension.ns(function() { with (virtualIdentityExtension.LIB) {

const Ci = Components.interfaces;
const Cc = Components.classes;
const Cu = Components.utils;

let pref = Cc["@mozilla.org/preferences-service;1"]
  .getService(Components.interfaces.nsIPrefService)
  .getBranch("extensions.virtualIdentity.");

const AccountManager = Cc["@mozilla.org/messenger/account-manager;1"]
  .getService(Components.interfaces.nsIMsgAccountManager);
 
const HeaderParser = Cc["@mozilla.org/messenger/headerparser;1"]
  .getService(Ci.nsIMsgHeaderParser);

let virtualIdentityData;
let virtualIdSenderName;
let virtualIdInUse;
let virtualSenderNameElem;
let Log;
let _rdfDatasourceAccess;

function changeIdentityToSmartIdentity(allIdentities, index) {
  _changeIdentityToSmartIdentity(allIdentities.identityDataCollection[index]);
}

function _changeIdentityToSmartIdentity(identityData) {
  Log.debug("## changeIdentityToSmartIdentity\n");
  // add code to set stored base identity
  if ( identityData.id.key != null ) {
    currentParams.identity = AccountManager.getIdentity(identityData.id.key);
    Log.debug("## changed base identity to ", identityData.id.key);
    virtualSenderNameElem.text(virtualIdSenderName);
  }
  virtualIdInUse = !(identityData.isExistingIdentity(false));
  Log.debug("## changeIdentityToSmartIdentity virtualIdInUse=" + virtualIdInUse + "\n");
  if (virtualIdInUse) {
    virtualIdentityData = identityData;
    virtualIdSenderName = virtualIdentityData.combinedName;
  }
  virtualSenderNameElem.text(identityData.combinedName); // change this also to reflect changes of base id
}

let conversationHook = {
  onComposeSessionConstructDone: function (params, match, senderNameElem, ExternalLog) {
    // this.params = { identity: ???, msgHdr: ???, subject: ??? };
    Log = ExternalLog;

    currentParams = params; virtualSenderNameElem = senderNameElem; // to enable access from out of this class.
    virtualIdentityData = null; virtualIdInUse = false; virtualIdSenderName = "";
    
    
    let recipientString = params.msgHdr.mime2DecodedRecipients;
    if (params.identity.doCc) recipientString += "," + params.identity.doCcList;
    recipientString += "," + params.msgHdr.ccList;
    
    let recipients = []; var combinedNames = {}; var number;
    number = HeaderParser.parseHeadersWithArray(recipientString, {}, {}, combinedNames);
    for (var index = 0; index < number; index++)
      recipients.push( { recipient: combinedNames.value[index], recipientType: "addr_to" } )
  
/*    match({
      reply: function (aMessage, aReplyType) {
        if (aReplyType == "replyAll") { // if we reply to all then take care of all the recipients

          Log.debug("replyAll - adding cc recipients too");
          number = HeaderParser.parseHeadersWithArray(params.msgHdr.ccList, {}, {}, combinedNames);
          for (var index = 0; index < number; index++)
            recipients.push( { recipient: combinedNames.value[index], recipientType: "addr_to" } )
        }
      },
      draft: function ({ msgUri }) { Log.debug("match draft - currently not used", msgUri); }
    });*/
      
    var localSmartIdentityCollection = new vI.smartIdentityCollection(params.msgHdr, params.identity, false, false, recipients);
    localSmartIdentityCollection.Reply();   // we can always use the reply-case, msgHdr is set the right way
    
    if (localSmartIdentityCollection._allIdentities.number == 0) return;
  
    if (pref.getBoolPref("idSelection_preferExisting")) {
      var existingIDIndex = localSmartIdentityCollection._foundExistingIdentity();
      if (existingIDIndex) {
        Log.debug("## smartIdentity: found existing Identity, use without interaction.\n");
        changeIdentityToSmartIdentity(localSmartIdentityCollection._allIdentities, existingIDIndex);
        return;
      }
    }

    if (pref.getBoolPref("idSelection_ask") && 
      ((localSmartIdentityCollection._allIdentities.number == 1 && pref.getBoolPref("idSelection_ask_always"))
      || localSmartIdentityCollection._allIdentities.number > 1)) {
        window.openDialog("chrome://v_identity/content/vI_smartReplyDialog.xul",0,
          "chrome, dialog, modal, alwaysRaised, resizable=yes",
          localSmartIdentityCollection._allIdentities,
          /* callback: */ changeIdentityToSmartIdentity).focus();
      }
    else if (pref.getBoolPref("idSelection_autocreate")) changeIdentityToSmartIdentity(localSmartIdentityCollection._allIdentities, 0);
  },
  
  onMessageBeforeSendOrPopup: function(gComposeParams, recipientString, popOut, aStatus, ExternalLog) {
    Log = ExternalLog;
    Log.debug("## onMessageBeforeSendOrPopup", recipientString);
    
    if (virtualIdInUse) {
      if (!popOut) {
        let recipients = []; var combinedNames = {}; var number;
        number = HeaderParser.parseHeadersWithArray(recipientString, {}, {}, combinedNames);
        for (var index = 0; index < number; index++)
          recipients.push( { recipient: combinedNames.value[index], recipientType: "addr_to" } )

        returnValue = vI.prepareSendMsg(virtualIdInUse, Ci.nsIMsgCompDeliverMode.Now,
          virtualIdentityData, gComposeParams.identity, recipients );
        Log.debug("returnValue.update:", returnValue.update);
        
        if (returnValue.update == "abort") {
          aStatus.canceled = true; return aStatus;
        }
        else if (returnValue.update == "takeover") {
          _changeIdentityToSmartIdentity(returnValue.storedIdentity);
          aStatus.canceled = true; return aStatus;
        }
        
        gComposeParams.identity = vI.account._account.defaultIdentity
        if (!vI.finalCheck(virtualIdentityData, gComposeParams.identity)) {
          vI.account.removeUsedVIAccount();
          aStatus.canceled = true; return aStatus;
        }
      }
      else {
        // code virtual Identity into subject - this will be decoded by smartIdentity - newMail
        gComposeParams.subject = gComposeParams.subject + "\nvirtualIdentityExtension\n" + virtualIdSenderName;
        Log.debug("coding virtualIdentity into subject:", gComposeParams.subject);
      }
    }
    Log.debug("onSendMessage done");
    return aStatus;
  },
  
  onStopSending: function () {
    vI.account.removeUsedVIAccount();
    Log.debug("onStopSending done");
  },

  onRecipientAdded: function onRecipientAdded(recipient, recipientType, count, ExternalLog) {
    Log = ExternalLog;
    Log.debug("onRecipientAdded", recipient, recipientType, count);
    if (!pref.getBoolPref("storage")) return;
    if (recipientType == "bcc") return;
    if (recipient == "") return;

    // if we are editing the "cc" or not the first recipient, recognize this.
    var isNotFirstInputElement = !(recipientType == "to" && count == 0);
    Log.debug("onRecipientAdded isNotFirstInputElement", isNotFirstInputElement);
    
    if (!_rdfDatasourceAccess) _rdfDatasourceAccess = new vI.rdfDatasourceAccess();
    else _rdfDatasourceAccess.clean();
    
    var storageResult = _rdfDatasourceAccess.updateVIdentityFromStorage(recipient, "addr_to",
      virtualIdentityData, virtualIdInUse, isNotFirstInputElement);
    
    if (storageResult.identityCollection.number == 0) return; // return if there was no match
    if (storageResult.result != "accept") return; // return if we don't like the resulting id
    
    changeIdentityToSmartIdentity(storageResult.identityCollection, 0);
  }
}

vI.conversationHook = conversationHook;
}});
