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

Components.utils.import("resource://v_identity/vI_nameSpaceWrapper.js");
virtualIdentityExtension.ns(function () {
  with(virtualIdentityExtension.LIB) {

    let Log = vI.setupLogging("virtualIdentity.main");
    Components.utils.import("resource://v_identity/vI_account.js", virtualIdentityExtension);
    Components.utils.import("resource://v_identity/vI_prefs.js", virtualIdentityExtension);
    Components.utils.import("resource://v_identity/vI_accountUtils.js", virtualIdentityExtension);
    Components.utils.import("resource://v_identity/vI_identityData.js", virtualIdentityExtension);
    Components.utils.import("resource://v_identity/vI_smartIdentity.js", virtualIdentityExtension);
    Components.utils.import("resource://v_identity/vI_log.js", virtualIdentityExtension);
    Components.utils.import("resource://v_identity/vI_rdfDatasource.js", virtualIdentityExtension);
    Components.utils.import("resource:///modules/mailServices.js");

    var main = {
      timeStampID: null,
      _smartIdentity: null,
      
      headerParser: Components.classes["@mozilla.org/messenger/headerparser;1"]
        .getService(Components.interfaces.nsIMsgHeaderParser),

      unicodeConverter: Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
        .createInstance(Components.interfaces.nsIScriptableUnicodeConverter),

      accountManager: Components.classes["@mozilla.org/messenger/account-manager;1"]
        .getService(Components.interfaces.nsIMsgAccountManager),

      promptService: Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
              .getService(Ci.nsIPromptService),

      _stringBundle: Services.strings.createBundle("chrome://v_identity/locale/v_identity.properties"),

      // Those variables keep pointers to original functions which might get replaced later
      original_functions: {
        GenericSendMessage: null,
        LoadIdentity: null
      },

      // some pointers to the layout-elements of the extension
      elements: {
        init_base: function () {
          main.elements.Area_MsgIdentityHbox = document.getElementById("virtualIdentityExtension_msgIdentityHbox");
          main.elements.Obj_MsgIdentity = document.getElementById("msgIdentity");
        },
        init_rest: function () {
          main.elements.Obj_MsgIdentityPopup = document.getElementById("msgIdentityPopup");
          main.elements.Obj_vILogo = document.getElementById("virtualIdentityExtension_Logo");
        },
        strings: null
      },

      ComposeStateListener: {
        NotifyComposeBodyReady: function () {
          Log.debug("NotifyComposeBodyReady");
          main.initSystemStage2();
        },
        NotifyComposeFieldsReady: function () {
          Log.debug("NotifyComposeFieldsReady");
        },
        ComposeProcessDone: function (aResult) {
          Log.debug("StateListener reports ComposeProcessDone");
          vI.storage.clean();
        },
        SaveInFolderDone: function (folderURI) {
          Log.debug("SaveInFolderDone");
          vI.storage.clean();
        }
      },

      replacement_functions: {
        LoadIdentity: function (startup) {
          var identityElement = document.getElementById("msgIdentity");
          
          // identitykey and accountkey might not be set on new selectedItem, if it's a virtual identity
          // on startup there might be no identitykey if a virtual identity is selected.
          Log.debug("run adapted LoadIdentity startup=" + startup);
          
          let hasBaseId = identityElement.selectedItem.identityData.id.key;
          if (hasBaseId == null) {
            identityElement.selectedItem.setAttribute("identitykey", identityElement.getAttribute("identitykey"));
            identityElement.selectedItem.setAttribute("accountkey", identityElement.getAttribute("accountkey"));
          }
          else {
            identityElement.setAttribute("description", identityElement.selectedItem.getAttribute("description"));
            identityElement.setAttribute("idDescription", identityElement.selectedItem.identityData.id.value);
          }
          
          if (startup)
            identityElement.identityData = identityElement.selectedItem.identityData.getDuplicate();
          // else only values are copied into current identityData
          else
            identityElement.identityData.takeOverAvailableData(identityElement.selectedItem.identityData);
          
          gComposeNotificationBar.clearIdentityWarning();
          
          main.original_functions.LoadIdentity(startup);
          
          // store identitykey locally to enable restoring after selection of next virtual identity without identitykey
          identityElement.setAttribute("identitykey", identityElement.selectedItem.getAttribute("identitykey"));
          
          identityElement.vid = identityElement.selectedItem.vid;
          
          identityElement.selectedItem.identityData.extras.setValuesToEnvironment()
        },
        
        GenericSendMessage: function (msgType) {
          try { // nice, but not required for sending messages
            // if addressCol2 is focused while sending check storage for the entered address before continuing
            vI.storage.awOnBlur(vI.storage.focusedElement, window);
          } catch (e) {}

          Log.debug("VIdentity_GenericSendMessage");
          
          // prevent sending if senders address is empty
          if (!main.elements.Obj_MsgIdentity.label) {
            Log.debug("VIdentity_GenericSendMessage: sender empty, aborting");
            main.elements.Obj_MsgIdentity.blurEvent();
            return;
          }

          // check via virtual / non-virtual constraints and storage results if mail should be sent
          if (msgType == Ci.nsIMsgCompDeliverMode.Now) {
            if ((main.elements.Obj_MsgIdentity.vid && vI.vIprefs.get("warn_virtual") &&
                !(main.promptService.confirm(window, "Warning",
                  main._stringBundle.GetStringFromName("vident.sendVirtual.warning")))) ||
              (!main.elements.Obj_MsgIdentity.vid && vI.vIprefs.get("warn_nonvirtual") &&
                !(main.promptService.confirm(window, "Warning",
                  main._stringBundle.GetStringFromName("vident.sendNonvirtual.warning"))))) {

              Log.debug("sending: --------------  aborted  ---------------------------------")
              return;
            }
            if (vI.vIprefs.get("storage") && vI.vIprefs.get("storage_store")) {
              var localeDatasourceAccess = new vI.rdfDatasourceAccess(window);
              var returnValue = localeDatasourceAccess.storeVIdentityToAllRecipients(
                main.elements.Obj_MsgIdentity.identityData, main._getRecipients())
              if (returnValue.update == "takeover")
                main.elements.Obj_MsgIdentity.selectedMenuItem =
                  main.elements.Obj_MsgIdentity.addIdentityToMsgIdentityMenu(returnValue.storedIdentity);
              if (returnValue.update == "takeover" || returnValue.update == "abort") {
                Log.debug("sending: --------------  aborted  ---------------------------------")
                return;
              }
            } else Log.debug("prepareSendMsg: storage deactivated");
          }
          main.original_functions.GenericSendMessage(msgType);
        },
      },

      _getRecipients: function () {
        var recipients = [];
        for (var row = 1; row <= top.MAX_RECIPIENTS; row++) {
          if (typeof awGetPopupElement(row).selectedItem == 'undefined')
            continue;
          var recipientType = awGetPopupElement(row).selectedItem.getAttribute("value");
          if (recipientType == "addr_reply" || recipientType == "addr_followup" ||
            main._recipientIsDoBcc(row) || awGetInputElement(row).value.match(/^\s*$/)) continue;
          recipients.push({
            recipient: awGetInputElement(row).value,
            recipientType: recipientType
          });
        }
        return recipients;
      },

      _recipientIsDoBcc: function (row) {
        if (typeof awGetPopupElement(row).selectedItem == 'undefined')
          return false;
        var recipientType = awGetPopupElement(row).selectedItem.getAttribute("value");
        if (recipientType != "addr_bcc" || !getCurrentIdentity().doBcc) return false

        var doBccArray = gMsgCompose.compFields.splitRecipients(getCurrentIdentity().doBccList, false, {});

        for (var index = 0; index < doBccArray.count; index++) {
          if (doBccArray.StringAt(index) == awGetInputElement(row).value) {
            Log.debug("_recipientIsDoBcc: ignoring doBcc field '" +
              doBccArray.StringAt(index));
            return true;
          }
        }
        return false
      },

      // initialization //
      init: function () {
        if (!this.timeStampID) {
          this.timeStampID = parseInt((new Date()).getTime() / 100) % 864000; // give object unified id (per day)
          Log = vI.setupLogging("virtualIdentity.main[" + this.timeStampID + "]");
        }
        window.removeEventListener('load', main.init, false);
        window.removeEventListener('compose-window-init', main.init, true);

        Log.debug("init.")
        main.unicodeConverter.charset = "UTF-8";
        
        if (!main.adapt_genericSendMessage()) {
          Log.error("init failed.");
          return;
        }
        
        let statusbarLabel = document.getElementById("v_identity_logo_statusbar");
        statusbarLabel.setAttribute("value", statusbarLabel.getAttribute("value") + vI.extensionVersion);
        
        gMsgCompose.RegisterStateListener(main.ComposeStateListener);
        document.getElementById("virtualIdentityExtension_tooltipPopupset")
          .addTooltip(document.getElementById("msgIdentity"), false);

        main.AccountManagerObserver.register();

        Log.debug("init done.")
      },

      initSystemStage2: function () {
        Log.debug("initSystemStage2.");
//         Log.debug("document.title=" + document.title + " gMsgCompose=" + gMsgCompose + " msgIdentityMenu=" + document.getElementById("msgIdentity"))
        vI.storage.init();
        vI.statusmenu.init();
        new vI.smartIdentity(window, gMsgCompose, vI.storage);
        Log.debug("initSystemStage2 done.")
      },

      adapt_loadIdentity: function () {
        if (main.original_functions.LoadIdentity) return true; // only initialize this once
        Log.debug("adapt LoadIdentity");
        main.original_functions.LoadIdentity = LoadIdentity;
        LoadIdentity = main.replacement_functions.LoadIdentity;
        return true;
      },

      adapt_genericSendMessage: function () {
        if (main.original_functions.GenericSendMessage) return true; // only initialize this once
        Log.debug("adapt GenericSendMessage");
        main.original_functions.GenericSendMessage = GenericSendMessage;
        GenericSendMessage = main.replacement_functions.GenericSendMessage;
        return true;
      },

      //  code adapted from http://xulsolutions.blogspot.com/2006/07/creating-uninstall-script-for.html
      AccountManagerObserver: {
        _uninstall: false,
        observe: function (subject, topic, data) {
          if (topic == "am-acceptChanges") {
            Log.debug("account changes observed");
            Log.debug("cleaning original msgIdentityPopup");
            var MenuItems = main.elements.Obj_MsgIdentityPopup.childNodes;
            while (MenuItems.length > 0) {
              try {
                MenuItems[0].clean();
              } catch (e) {};
              main.elements.Obj_MsgIdentityPopup.removeChild(MenuItems[0])
            }
            let msgIdentity = document.getElementById("msgIdentity")
            let tmp_identity = msgIdentity.identityData;
            msgIdentity.clean();
            msgIdentity.init();
            Log.debug("cleaning original msgIdentityPopup done.");
            tmp_identity.existingID = tmp_identity.isExistingIdentity(false)
            if (tmp_identity.existingID) {
              tmp_identity.id.key = tmp_identity.existingID
            } else {
              tmp_identity.id.key = MailServices.accounts.defaultAccount.defaultIdentity.key
            }
            Log.debug("adding previous identity to msgIdentityMenu");
            msgIdentity.selectedMenuItem = msgIdentity.addIdentityToMsgIdentityMenu(tmp_identity);
            Log.debug("adding previous identity to msgIdentityMenu done.");
          }
        },
        register: function () {
          var obsService = Components.classes["@mozilla.org/observer-service;1"].
          getService(Components.interfaces.nsIObserverService)
          obsService.addObserver(this, "am-acceptChanges", false);
        },
        unregister: function () {
          var obsService = Components.classes["@mozilla.org/observer-service;1"].
          getService(Components.interfaces.nsIObserverService)
          obsService.removeObserver(this, "am-acceptChanges");
        }
      }
    }

    main.elements.init_base();
    main.elements.init_rest();
    main.adapt_loadIdentity();
    
    window.addEventListener('compose-window-init', main.init, true);

    window.addEventListener("unload", function (e) {
      main.AccountManagerObserver.unregister();
      try {
        vI.statusmenu.removeObserver();
      } catch (ex) {}
    }, false);
    vI.main = main;
  }
});
