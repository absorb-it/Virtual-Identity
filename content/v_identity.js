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
    Components.utils.import("resource://v_identity/vI_replyToSelf.js", virtualIdentityExtension);
    Components.utils.import("resource://v_identity/vI_accountUtils.js", virtualIdentityExtension);
    Components.utils.import("resource://v_identity/plugins/signatureSwitch.js", virtualIdentityExtension);
    Components.utils.import("resource://v_identity/vI_identityData.js", virtualIdentityExtension);
    Components.utils.import("resource://v_identity/vI_smartIdentity.js", virtualIdentityExtension);
    Components.utils.import("resource://v_identity/vI_log.js", virtualIdentityExtension);
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


      // Those variables keep pointers to original functions which might get replaced later
      original_functions: {
        GenericSendMessage: null,
        FillIdentityList: null
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
          vI.vIaccount_removeUsedVIAccount();
          vI.storage.clean();
        },
        SaveInFolderDone: function (folderURI) {
          Log.debug("SaveInFolderDone");
          vI.vIaccount_removeUsedVIAccount();
          vI.storage.clean();
        }
      },

      replacement_functions: {
        FillIdentityList: function (menulist) {
          Log.debug("mod. FillIdentityList");
          var accounts = virtualIdentityExtension.getAccountsArray();
          for (let acc = 0; acc < accounts.length; acc++) {
            let server = accounts[acc].incomingServer;
            if (!server)
              continue;

            // check for VirtualIdentity Account
            try {
              vI.prefroot.getBoolPref("mail.account." + accounts[acc].key + ".vIdentity");
              continue;
            } catch (e) {};
            let account = accounts[acc];
            let identities = virtualIdentityExtension.getIdentitiesArray(account);

            if (identities.length == 0)
              continue;

            for (let i = 0; i < identities.length; i++) {
              let identity = identities[i];
              let item = menulist.appendItem(identity.identityName, identity.key,
                account.incomingServer.prettyName);
              item.setAttribute("identitykey", identity.key);
              item.setAttribute("accountkey", account.key);
              if (i == 0) {
                // Mark the first identity as default.
                item.setAttribute("default", "true");
              }
            }
          }
        },

        GenericSendMessageInProgress: false,
        GenericSendMessage: function (msgType) {
          try {
            if (main.replacement_functions.GenericSendMessageInProgress) return;
            main.replacement_functions.GenericSendMessageInProgress = true;

            try { // nice, but not required for sending messages
              // if addressCol2 is focused while sending check storage for the entered address before continuing
              vI.storage.awOnBlur(vI.storage.focusedElement, window);
            } catch (e) {}

            Log.debug("VIdentity_GenericSendMessage");

            Log.debug("VIdentity_GenericSendMessage top=" + top);

            if (msgType == Components.interfaces.nsIMsgCompDeliverMode.Now)
              vI.addReplyToSelf(window);

            var vid = document.getElementById("virtualIdentityExtension_msgIdentityClone").vid
            var virtualIdentityData = document.getElementById("virtualIdentityExtension_msgIdentityClone").identityData;

            let returnValue = vI.vIaccount_prepareSendMsg(window, vid, msgType, virtualIdentityData,
              main.accountManager.getIdentity(main.elements.Obj_MsgIdentity.value),
              main._getRecipients());
            if (returnValue.update == "abort") {
              main.replacement_functions.GenericSendMessageInProgress = false;
              Log.debug("sending: --------------  aborted  ---------------------------------")
              return;
            } else if (returnValue.update == "takeover") {
              var msgIdentityCloneElem = document.getElementById("virtualIdentityExtension_msgIdentityClone");
              msgIdentityCloneElem.selectedMenuItem = msgIdentityCloneElem.addIdentityToCloneMenu(returnValue.storedIdentity);
              main.replacement_functions.GenericSendMessageInProgress = false;
              Log.debug("sending: --------------  aborted  ---------------------------------")
              return;
            }

            if (vid) main.addVirtualIdentityToMsgIdentityMenu();
            // final check if eyerything is nice before we handover to the real sending...
            if (vI.vIaccount_finalCheck(window, virtualIdentityData, getCurrentIdentity())) {
              main.replacement_functions.GenericSendMessageInProgress = false;
              main.original_functions.GenericSendMessage(msgType);
            }
          } catch (e) {
            Log.warn("GenericSendMessage raised an error:", e);
            try {
              alert(
                "virtualIdentity Extension Error\n\n" +
                "sorry for the inconveniance\n" +
                "try to save your email and restart!\n\n" +
                "please send the bug-report to fix this issue");
              virtualIdentityExtension.errorReportEmail(e);
            } catch (e) {}
            // at least try to save the mail - even with the wrong senders id
            if (msgType == Components.interfaces.nsIMsgCompDeliverMode.Save || msgType == Components.interfaces.nsIMsgCompDeliverMode.SaveAs ||
              msgType == Components.interfaces.nsIMsgCompDeliverMode.SaveAsDraft || msgType == Components.interfaces.nsIMsgCompDeliverMode.SaveAsTemplate) {
              main.replacement_functions.GenericSendMessageInProgress = false;
              main.original_functions.GenericSendMessage(msgType);
            }
          }
          // sending or saving is done (or skipped), if aborted we must restore interface settings for further use
          main.removeVirtualIdentityFromMsgIdentityMenu();
          // restore enigmail 'current' identity - has been changed while trying to sent
          if (typeof Enigmail != 'undefined') Enigmail.msg.identity = getCurrentIdentity();

          main.replacement_functions.GenericSendMessageInProgress = false;
          // 			Log.debug("original_functions.GenericSendMessage done");
        },

        replace_FillIdentityList: function () {
          //~ Log.debug("replace FillIdentityList");
          main.original_functions.FillIdentityList = FillIdentityList;
          FillIdentityList = main.replacement_functions.FillIdentityList;
        }
      },

      remove: function () {
        window.removeEventListener('compose-window-reopen', main.reopen, true);
        window.removeEventListener('compose-window-close', main.close, true);
        Log.debug("end. remove Account if there.")
        vI.storage.clean();
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
        if (main.elements.Area_MsgIdentityHbox) return; // init done before, (?reopen)
        Log.debug("init.")
        main.unicodeConverter.charset = "UTF-8";
        if (!main.adapt_genericSendMessage()) {
          Log.error("init failed.");
          return;
        }

        main.adapt_interface();
        gMsgCompose.RegisterStateListener(main.ComposeStateListener);
        document.getElementById("virtualIdentityExtension_tooltipPopupset")
          .addTooltip(document.getElementById("virtualIdentityExtension_msgIdentityClone"), false);
        window.addEventListener('compose-window-reopen', main.reopen, true);
        window.addEventListener('compose-window-close', main.close, true);

        // append observer to virtualIdentityExtension_fccSwitch, because it does'n work with real identities (hidden by css)
        document.getElementById("virtualIdentityExtension_fccSwitch").appendChild(document.getElementById("virtualIdentityExtension_msgIdentityClone_observer").cloneNode(false));

        main.AccountManagerObserver.register();

        main.initSystemStage1();
        Log.debug("init done.")
      },

      initSystemStage1: function () {
        Log.debug("initSystemStage1.");
        document.getElementById("virtualIdentityExtension_msgIdentityClone").init();
        vI.statusmenu.init();
        Log.debug("initSystemStage1 done.")
      },

      initSystemStage2: function () {
        Log.debug("initSystemStage2.");
        Log.debug("document.title=" + document.title + " gMsgCompose=" + gMsgCompose + " msgIdentityClone=" + document.getElementById("virtualIdentityExtension_msgIdentityClone"))
        vI.initReplyTo(window);
        vI.storage.init();
        new vI.smartIdentity(window, gMsgCompose, vI.storage);
        Log.debug("initSystemStage2 done.")
      },

      close: function () {
        vI.storage.clean();
      },

      adapt_interface: function () {
        if (main.elements.Obj_MsgIdentityPopup) return; // only rearrange the interface once

        // initialize the pointers to extension elements
        main.elements.init_base()

        // rearrange the positions of some elements
        var parent_hbox = main.elements.Obj_MsgIdentity.parentNode;
        var storage_box = document.getElementById("addresses-box");
        var virtualIdentityExtension_autoReplyToSelfLabel = document.getElementById("virtualIdentityExtension_autoReplyToSelfLabelBox");

        storage_box.removeChild(virtualIdentityExtension_autoReplyToSelfLabel);
        parent_hbox.appendChild(virtualIdentityExtension_autoReplyToSelfLabel);
        storage_box.removeChild(main.elements.Area_MsgIdentityHbox);
        parent_hbox.appendChild(main.elements.Area_MsgIdentityHbox);

        main.elements.Obj_MsgIdentity.setAttribute("hidden", "true");
        main.elements.Obj_MsgIdentity.previousSibling.setAttribute("control", "virtualIdentityExtension_msgIdentityClone");

        var access_label = parent_hbox.getElementsByAttribute("control", "msgIdentity")[0];
        if (access_label) access_label.setAttribute("control", "virtualIdentityExtension_msgIdentityClone");

        // initialize the pointers to extension elements (initialize those earlier might brake the interface)
        main.elements.init_rest();
      },

      adapt_genericSendMessage: function () {
        if (main.original_functions.GenericSendMessage) return true; // only initialize this once
        Log.debug("adapt GenericSendMessage");
        main.original_functions.GenericSendMessage = GenericSendMessage;
        GenericSendMessage = main.replacement_functions.GenericSendMessage;
        return true;
      },

      reopen: function () {
        vI.clearDebugOutput();
        Log.debug("composeDialog reopened. (msgType " + gMsgCompose.type + ")")
        Log.debug("document.title=" + document.title + " gMsgCompose=" + gMsgCompose + " msgIdentityClone=" + document.getElementById("virtualIdentityExtension_msgIdentityClone"))

        // clean all elements
        document.getElementById("virtualIdentityExtension_msgIdentityClone").clean();
        vI.storage.clean(); // just to be sure!
        Log.debug("everything cleaned.")

        // register StateListener
        gMsgCompose.RegisterStateListener(main.ComposeStateListener);

        // now (re)init the elements
        main.initSystemStage1();

        vI.vIprefs.dropLocalChanges();

        // NotifyComposeBodyReady is only triggered in reply-cases
        // so activate stage2 in reply-cases trough StateListener
        // in other cases directly
        var msgComposeType = Components.interfaces.nsIMsgCompType;
        switch (gMsgCompose.type) {
        case msgComposeType.New:
        case msgComposeType.NewsPost:
        case msgComposeType.MailToUrl:
        case msgComposeType.Draft:
        case msgComposeType.Template:
        case msgComposeType.ForwardAsAttachment:
        case msgComposeType.ForwardInline:
          main.initSystemStage2();
          //             case msgComposeType.Reply:
          //             case msgComposeType.ReplyAll:
          //             case msgComposeType.ReplyToGroup:
          //             case msgComposeType.ReplyToSender:
          //             case msgComposeType.ReplyToSenderAndGroup:
          //             case msgComposeType.ReplyWithTemplate:
          //             case msgComposeType.ReplyToList:
          //                 main.initSystemStage2() triggered trough NotifyComposeBodyReady;
        }
        Log.debug("reopen done.")
      },

      tempStorage: {
        BaseIdentity: null,
        NewIdentity: null
      },

      __setSelectedIdentity: function (menuItem) {
        main.elements.Obj_MsgIdentity.selectedItem = menuItem;
        main.elements.Obj_MsgIdentity.setAttribute("label", menuItem.getAttribute("label"));
        main.elements.Obj_MsgIdentity.setAttribute("accountname", menuItem.getAttribute("accountname"));
        main.elements.Obj_MsgIdentity.setAttribute("value", menuItem.getAttribute("value"));
      },

      // sets the values of the dropdown-menu to the ones of the newly created account
      addVirtualIdentityToMsgIdentityMenu: function () {
        main.tempStorage.BaseIdentity = main.elements.Obj_MsgIdentity.selectedItem;
        main.tempStorage.NewIdentity = document.createElement("menuitem");
        main.tempStorage.NewIdentity.className = "identity-popup-item";

        // set the account name in the choosen menu item
        main.tempStorage.NewIdentity.setAttribute("label", vI.get_vIaccount().defaultIdentity.identityName);
        main.tempStorage.NewIdentity.setAttribute("accountname", " - " + vI.get_vIaccount().incomingServer.prettyName);
        main.tempStorage.NewIdentity.setAttribute("accountkey", vI.get_vIaccount().key);
        main.tempStorage.NewIdentity.setAttribute("identitykey", vI.get_vIaccount().defaultIdentity.key);
        main.tempStorage.NewIdentity.setAttribute("value", vI.get_vIaccount().defaultIdentity.key);

        main.elements.Obj_MsgIdentityPopup.appendChild(main.tempStorage.NewIdentity);
        main.__setSelectedIdentity(main.tempStorage.NewIdentity);
      },

      removeVirtualIdentityFromMsgIdentityMenu: function () {
        if (!main.tempStorage.BaseIdentity) return; // don't try to remove Item twice
        try { // might not exist anymore (window closed), so just try to remove it
          document.getElementById("msgIdentity").firstChild.removeChild(main.tempStorage.NewIdentity);
          main.__setSelectedIdentity(main.tempStorage.BaseIdentity);
        } catch (e) {};
        main.tempStorage.NewIdentity = null;
        main.tempStorage.BaseIdentity = null;
      },

      prepareAccount: function () {
        main.removeVirtualIdentityFromMsgIdentityMenu(); // just to be sure that nothing is left (maybe last time sending was irregularily stopped)
        vI.vIaccount_createAccount(document.getElementById("virtualIdentityExtension_msgIdentityClone").identityData,
          main.accountManager.getIdentity(main.elements.Obj_MsgIdentity.value));
        main.addVirtualIdentityToMsgIdentityMenu();
      },

      //  code adapted from http://xulsolutions.blogspot.com/2006/07/creating-uninstall-script-for.html
      AccountManagerObserver: {
        _uninstall: false,
        observe: function (subject, topic, data) {
          if (topic == "am-smtpChanges") {
            Log.debug("smtp changes observed");
            var virtualIdentityExtension_msgIdentityClone = document.getElementById("virtualIdentityExtension_msgIdentityClone");
            document.getAnonymousElementByAttribute(virtualIdentityExtension_msgIdentityClone, "class", "smtpServerListHbox").refresh();
          }
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
            main.replacement_functions.FillIdentityList(main.elements.Obj_MsgIdentity)
            let virtualIdentityExtension_msgIdentityClone = document.getElementById("virtualIdentityExtension_msgIdentityClone")
            let tmp_identity = virtualIdentityExtension_msgIdentityClone.identityData;
            virtualIdentityExtension_msgIdentityClone.clean();
            virtualIdentityExtension_msgIdentityClone.init();
            Log.debug("cleaning original msgIdentityPopup done.");
            tmp_identity.existingID = tmp_identity.isExistingIdentity(false)
            if (tmp_identity.existingID) {
              tmp_identity.id.key = tmp_identity.existingID
            } else {
              tmp_identity.id.key = MailServices.accounts.defaultAccount.defaultIdentity.key
            }
            Log.debug("adding previous identity to msgIdentityClone");
            virtualIdentityExtension_msgIdentityClone.selectedMenuItem = virtualIdentityExtension_msgIdentityClone.addIdentityToCloneMenu(tmp_identity);
            Log.debug("adding previous identity to msgIdentityClone done.");
          }
        },
        register: function () {
          var obsService = Components.classes["@mozilla.org/observer-service;1"].
          getService(Components.interfaces.nsIObserverService)
          obsService.addObserver(this, "am-smtpChanges", false);
          obsService.addObserver(this, "am-acceptChanges", false);
        },
        unregister: function () {
          var obsService = Components.classes["@mozilla.org/observer-service;1"].
          getService(Components.interfaces.nsIObserverService)
          obsService.removeObserver(this, "am-smtpChanges");
          obsService.removeObserver(this, "am-acceptChanges");
        }
      }
    }


    main.replacement_functions.replace_FillIdentityList();
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