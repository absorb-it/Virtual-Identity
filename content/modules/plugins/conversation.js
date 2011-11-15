virtualIdentityExtension.ns(function() { with (virtualIdentityExtension.LIB) {

Components.utils.import("resource://v_identity/vI_log.js");
let Log = setupLogging("virtualIdentity.plugin.conversation");

const {classes: Cc, interfaces: Ci, utils: Cu, results : Cr} = Components;

let pref = Cc["@mozilla.org/preferences-service;1"]
  .getService(Components.interfaces.nsIPrefService)
  .getBranch("extensions.virtualIdentity.");

const AccountManager = Cc["@mozilla.org/messenger/account-manager;1"]
  .getService(Components.interfaces.nsIMsgAccountManager);
 
const HeaderParser = Cc["@mozilla.org/messenger/headerparser;1"]
  .getService(Ci.nsIMsgHeaderParser);

let currentIdentityData;
let currentIdSenderName;
let virtualIdInUse;
let virtualSenderNameElem;


let _rdfDatasourceAccess;

let changeIdentityToSmartIdentity = function(allIdentities, index) {
  _changeIdentityToSmartIdentity(allIdentities.identityDataCollection[index]);
};

let _changeIdentityToSmartIdentity = function(identityData) {
  Log.debug("## changeIdentityToSmartIdentity\n");
  
  if ( identityData.id.key != null ) {
    currentParams.identity = AccountManager.getIdentity(identityData.id.key);
    Log.debug("## changed base identity to ", identityData.id.key);
    virtualSenderNameElem.text(currentIdSenderName);
  }
  virtualIdInUse = !(identityData.isExistingIdentity(false));
  Log.debug("## changeIdentityToSmartIdentity virtualIdInUse=" + virtualIdInUse + "\n");
  if (virtualIdInUse) {
    currentIdentityData = identityData;
    currentIdSenderName = currentIdentityData.combinedName;
  }
  virtualSenderNameElem.text(identityData.combinedName); // change this also to reflect changes of base id
};

let conversationHook = {
  onComposeSessionChanged: function (aComposeSession, aAddress) {
    let toAddrList = aAddress.to.concat(aAddress.cc);
    
    currentParams = aComposeSession.params; virtualSenderNameElem = aComposeSession.senderNameElem; // to enable access from out of this class.
    let identity = aComposeSession.params.identity;
    
    let server = AccountManager.GetServersForIdentity(identity).QueryElementAt(0, Components.interfaces.nsIMsgIncomingServer);
    currentIdentityData = new virtualIdentityExtension.identityData(identity.email, identity.fullName, identity.key,
                                                                    identity.smtpServerKey, null, server.prettyName, true)
    currentIdSenderName = currentIdentityData.combinedName;
    virtualIdInUse = false;
    
    let recipients = []; var combinedNames = {}; var number;
    number = HeaderParser.parseHeadersWithArray(toAddrList.join(", "), {}, {}, combinedNames);
    for (var index = 0; index < number; index++)
      recipients.push( { recipient: combinedNames.value[index], recipientType: "addr_to" } )
      
    var localSmartIdentityCollection = new vI.smartIdentityCollection(aComposeSession.params.msgHdr, identity, 
                                                                      false, false, recipients);
    localSmartIdentityCollection.Reply();   // we can always use the reply-case, msgHdr is set the right way
    
    if (localSmartIdentityCollection._allIdentities.number == 0)
      return;
  
    if (pref.getBoolPref("idSelection_preferExisting")) {
      var existingIDIndex = localSmartIdentityCollection._foundExistingIdentity();
      if (existingIDIndex) {
        Log.debug("## smartIdentity: found existing Identity, use without interaction.\n", existingIDIndex.key);
        changeIdentityToSmartIdentity(localSmartIdentityCollection._allIdentities, existingIDIndex.key);
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
    else if (pref.getBoolPref("idSelection_autocreate"))
      changeIdentityToSmartIdentity(localSmartIdentityCollection._allIdentities, 0);
  },
  
  onMessageBeforeSendOrPopout: function(aAddress, aStatus, aPopout) {
    let toAddrList = aAddress.to.concat(aAddress.cc);
    Log.debug("## onMessageBeforeSendOrPopup");
    
    if (virtualIdInUse) {
      if (!aPopout) {
        let recipients = []; var combinedNames = {}; var number;
        number = HeaderParser.parseHeadersWithArray(toAddrList.join(", "), {}, {}, combinedNames);
        for (var index = 0; index < number; index++)
          recipients.push( { recipient: combinedNames.value[index], recipientType: "addr_to" } )

        returnValue = vI.prepareSendMsg(virtualIdInUse, Ci.nsIMsgCompDeliverMode.Now,
          currentIdentityData, aAddress.params.identity, recipients );
        Log.debug("returnValue.update:", returnValue.update);
        
        if (returnValue.update == "abort") {
          aStatus.canceled = true; return aStatus;
        }
        else if (returnValue.update == "takeover") {
          _changeIdentityToSmartIdentity(returnValue.storedIdentity);
          aStatus.canceled = true; return aStatus;
        }
        
        aAddress.params.identity = vI.account._account.defaultIdentity
        if (!vI.finalCheck(currentIdentityData, aAddress.params.identity)) {
          vI.account.removeUsedVIAccount();
          aStatus.canceled = true; return aStatus;
        }
      }
      else {
        // code virtual Identity into subject - this will be decoded by smartIdentity - newMail
        aAddress.params.subject = aAddress.params.subject + "\nvirtualIdentityExtension\n" + currentIdSenderName;
        Log.debug("coding virtualIdentity into subject:", aAddress.params.subject);
      }
    }
    Log.debug("onSendMessage done");
    return aStatus;
  },
  
  onStopSending: function () {
    vI.account.removeUsedVIAccount();
    Log.debug("onStopSending done");
  },

  onRecipientAdded: function onRecipientAdded(aData, aType, aCount) {
    Log.debug("onRecipientAdded", aData.data, aType, aCount);
    if (!pref.getBoolPref("storage")) return;
    if (aType == "bcc") return;
    if (aData.data == "") return;

    // if we are editing the "cc" or not the first recipient, recognize this.
    var isNotFirstInputElement = !(aType == "to" && aCount == 0);
    Log.debug("onRecipientAdded isNotFirstInputElement", isNotFirstInputElement);
    
    if (!_rdfDatasourceAccess) _rdfDatasourceAccess = new vI.rdfDatasourceAccess();
    else _rdfDatasourceAccess.clean();
    
    var storageResult = _rdfDatasourceAccess.updateVIdentityFromStorage(aData.data, "addr_to",
      currentIdentityData, virtualIdInUse, isNotFirstInputElement);
    
    if (storageResult.identityCollection.number == 0) return; // return if there was no match
    if (storageResult.result != "accept") return; // return if we don't like the resulting id
    
    changeIdentityToSmartIdentity(storageResult.identityCollection, 0);
  }
}

vI.conversationHook = conversationHook;
}});
