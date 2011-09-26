virtualIdentityExtension.ns(function() { with (virtualIdentityExtension.LIB) {

const Ci = Components.interfaces;
const Cc = Components.classes;
const Cu = Components.utils;

let pref = Cc["@mozilla.org/preferences-service;1"]
  .getService(Components.interfaces.nsIPrefService)
  .getBranch("extensions.virtualIdentity.");

const gHeaderParser = Cc["@mozilla.org/messenger/headerparser;1"]
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
  virtualIdInUse = !(identityData.isExistingIdentity(false));
  Log.debug("## changeIdentityToSmartIdentity virtualIdInUse=" + virtualIdInUse + "\n");
  if (virtualIdInUse) {
    virtualIdentityData = identityData;
    virtualIdSenderName = gHeaderParser.makeFullAddress(virtualIdentityData.fullName, virtualIdentityData.email)
    virtualSenderNameElem.text(virtualIdSenderName);
  }
}

let conversationHook = {
  onComposePrepared: function (aMsgHdr, gComposeParams, senderNameElem, ExternalLog) {
    Log = ExternalLog;
    virtualIdentityData = null; virtualIdInUse = false; virtualIdSenderName = "";
    virtualSenderNameElem = senderNameElem;
    
    let recipients = [];
    for each (let [i, { name, email }] in Iterator(gComposeParams.to))
      recipients.push( { recipient: gHeaderParser.makeFullAddress(name, email), recipientType: "addr_to" } )
    for each (let [i, { name, email }] in Iterator(gComposeParams.cc))
      recipients.push( { recipient: gHeaderParser.makeFullAddress(name, email), recipientType: "addr_to" } )
  
    var localSmartIdentityCollection = new vI.smartIdentityCollection(aMsgHdr, gComposeParams.identity, false, false, recipients);
    localSmartIdentityCollection.Reply();
  
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
  
  onUIupdated: function() {
    virtualSenderNameElem.text(virtualIdSenderName);
    Log.debug("onUIupdated done");
  },

  onSendMessage: function(gComposeParams, toVal, ccVal, popOut, ExternalLog) {
    Log = ExternalLog;
    Log.debug("toVal='" + toVal + "' ccVal='" + ccVal + "' gComposeParams.to='" + gComposeParams.to + "'\n" );

    if (virtualIdInUse) {
      if (!popOut) {
        let recipients = []; var combinedNames = {}; var number;
        number = gHeaderParser.parseHeadersWithArray(toVal + "," + ccVal, {}, {}, combinedNames);
        for (var index = 0; index < number; index++)
          recipients.push( { recipient: combinedNames.value[index], recipientType: "addr_to" } )

        returnValue = vI.prepareSendMsg(virtualIdInUse, Ci.nsIMsgCompDeliverMode.Now,
          virtualIdentityData, gComposeParams.identity, recipients );
        Log.debug("returnValue.update:", returnValue.update);
        
        if (returnValue.update == "abort") return false;
        else if (returnValue.update == "takeover") {
          _changeIdentityToSmartIdentity(returnValue.storedIdentity);
          return false;
        }
        
        gComposeParams.identity = vI.account._account.defaultIdentity
        if (!vI.finalCheck(virtualIdentityData, gComposeParams.identity)) {
          vI.account.removeUsedVIAccount();
          return false
        }
      }
      else {
        // code virtual Identity into subject - this will be decoded by smartIdentity - newMail
        gComposeParams.subject = gComposeParams.subject + "\nvirtualIdentityExtension\n" + virtualIdSenderName;
        Log.debug("coding virtualIdentity into subject:", gComposeParams.subject);
      }
    }
    Log.debug("onSendMessage done");
    return true;
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
    var isNotFirstInputElement = (recipientType != "to" || count == 0);
    
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
