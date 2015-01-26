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

    let Log = vI.setupLogging("virtualIdentity.upgrade");
    Components.utils.import("resource://v_identity/vI_rdfDatasource.js", virtualIdentityExtension);
    Components.utils.import("resource://v_identity/vI_account.js", virtualIdentityExtension);
    Components.utils.import("resource://v_identity/vI_prefs.js", virtualIdentityExtension);

    var upgrade = {
      versionChecker: Components.classes["@mozilla.org/xpcom/version-comparator;1"]
        .getService(Components.interfaces.nsIVersionComparator),

      rdfDatasource: null,

      quickUpgrade: function (currentVersion) {
        upgrade.rdfDatasource = new vI.rdfDatasource(window, "virtualIdentity.rdf", true);
        if (upgrade.rdfDatasource.extUpgradeRequired())
          upgrade.extUpgrade();
        upgrade.rdfDatasource.refreshAccountInfo();
        upgrade.rdfDatasource.clean();
        return true;
      },

      extUpgrade: function () {
        var currentVersion = upgrade.rdfDatasource.getCurrentExtFileVersion();
        Log.debug("checking for previous version, found " +
          currentVersion + "... extension-upgrade required.")
        switch (currentVersion) {
        case null:
          // no break
        default:
          upgrade.__transferMovedUserPrefs(currentVersion);
          upgrade.__removeObsoleteUserPrefs(currentVersion);
          upgrade.__removeExtraAddedHeaders(currentVersion);
          upgrade.__cleanupSmartMailboxFolders(currentVersion);
        }
        upgrade.rdfDatasource.storeExtVersion();
        Log.debug("extension-upgrade to " + upgrade.rdfDatasource.getCurrentExtFileVersion() + " done.");
      },

      __cleanupSmartMailboxFolders: function (currentVersion) {
        if ((!currentVersion || upgrade.versionChecker.compare(currentVersion, "0.9.26") < 0)) {
          Log.debug("cleaning leftover 'smart mailboxes' == 'unified folder mailboxes'");
          // remove obsolete 'smart mailboxes'=='unified folder' server entries
          // this is only required because of a virtualIdentity bug introduced in 0.9.22 and fixed in 0.9.26

          //  compare against all accounts, getAccountsArray() does not include 'smart mailboxes' == 'unified folders'
          var all_accounts = vI.prefroot.getCharPref("mail.accountmanager.accounts").split(",");

          for each(let pref in vI.prefroot.getChildList("mail.server")) {
            if (pref.indexOf(".hostname") == pref.length - 9 && vI.prefroot.getCharPref(pref) == "smart mailboxes") {
              // ok, smart mailbox server found, check if it still in use
              let server = pref.replace(/^mail\.server\./, "").replace(/\.hostname$/, "");
              let inUse = false;
              for each(let account in all_accounts) {
                if (vI.prefroot.getCharPref("mail.account." + account + ".server") == server)
                  inUse = true;
              }
              if (!inUse) {
                Log.debug("cleaning leftover 'smart mailbox' for server " + server);
                for each(let obsoletePref in vI.prefroot.getChildList("mail.server." + server)) {
                  if (obsoletePref.indexOf(".directory") == obsoletePref.length - 10) {
                    // remove obsolete 'smart mailbox' directory
                    try {
                      let file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
                      file.initWithPath(vI.prefroot.getCharPref(obsoletePref));
                      Log.debug("removing obsolete storage Folder " + vI.prefroot.getCharPref(obsoletePref));
                      file.remove(true);
                    } catch (NS_ERROR_FILE_UNRECOGNIZED_PATH) {};
                  }
                  vI.prefroot.clearUserPref(obsoletePref);
                }
              }
            }
          }
        }
      },

      __removeExtraAddedHeaders: function (currentVersion) {
        if ((!currentVersion || upgrade.versionChecker.compare(currentVersion, "0.6.9") < 0) &&
          vI.prefroot.getCharPref("mailnews.headers.extraExpandedHeaders") != "") {
          // clean extraExpandedHeaders once, because the whole header-saving and restoring was broken too long
          Log.debug("cleaning extraExpandedHeaders");
          vI.prefroot.setCharPref("mailnews.headers.extraExpandedHeaders", "")
          Log.debug("cleaned extraExpandedHeaders");
        }
      },

      __transferMovedUserPrefs: function (currentVersion) {
        // transfer renamed preferences
        var transferPrefs = [{
          version: "0.5.3",
          prefs: Array({
            sourcePref: "smart_reply_ask",
            targetPref: "idSelection_ask"
          }, {
            sourcePref: "smart_reply_ask_always",
            targetPref: "idSelection_ask_always"
          }, {
            sourcePref: "smart_reply_autocreate",
            targetPref: "idSelection_autocreate"
          }, {
            sourcePref: "smart_timestamp",
            targetPref: "autoTimestamp"
          }, {
            sourcePref: "storage_prefer_smart_reply",
            targetPref: "idSelection_storage_prefer_smart_reply"
          }, {
            sourcePref: "storage_ignore_smart_reply",
            targetPref: "idSelection_storage_ignore_smart_reply"
          })
        }];
        // remove obsolete preference-tree virtualIdentity
        for (var i = 0; i < transferPrefs.length; i++) {
          // if former version of extension was at least 0.5.0, start with WizardPage 0.5.2
          if (!currentVersion || (upgrade.versionChecker.compare(currentVersion, transferPrefs[i].version) < 0)) {
            // remove any obsolete preferences under extensions.virtualIdentity
            Log.debug("transfer changed preferences of pre-" + transferPrefs[i].version + " release...")
            for each(let transferPref in transferPrefs[i].prefs) {
              try {
                vI.vIprefs.commit(transferPref.targetPref,
                  vI.vIprefs.get(transferPref.sourcePref));
                vI.vIprefs.clearUserPref(transferPref.sourcePref);
              } catch (e) {};
            }
            Log.debug("done.")
          }
        }
      },

      __removeObsoleteUserPrefs: function (currentVersion) {
        var obsoletePrefs = [{
          version: "0.5.0",
          prefs: Array("aBook_use", "aBook_storedefault", "aBook_dont_update_multiple",
            "aBook_show_switch", "aBook_warn_update", "aBook_use_for_smart_reply",
            "aBook_prefer_smart_reply", "aBook_ignore_smart_reply", "aBook_warn_vI_replace",
            "aBook_use_non_vI", "aBook_notification", "storeVIdentity", "experimental",
            "storage_use_for_smart_reply")
        }, {
          version: "0.5.3",
          prefs: Array("storage_use_for_smart_reply")
        }, {
          version: "0.5.6",
          prefs: Array("copyEnigmailSettings")
        }, {
          version: "0.9",
          prefs: Array("extensions.virtualIdentity.{2ab1b709-ba03-4361-abf9-c50b964ff75d}",
            "extensions.virtualIdentity.{847b3a00-7ab1-11d4-8f02-006008948af5}",
            "extensions.virtualIdentity.smart_reply_added_extraHeaders",
            "mailnews.headers.extraExpandedHeaders")
        }];
        // remove obsolete preference-tree virtualIdentity
        for (var i = 0; i < obsoletePrefs.length; i++) {
          // if former version of extension was at least 0.5.0, start with WizardPage 0.5.2
          if (!currentVersion || (upgrade.versionChecker.compare(currentVersion, obsoletePrefs[i].version) < 0)) {
            // remove any obsolete preferences under extensions.virtualIdentity
            Log.debug("removing obsolete preferences of pre-" + obsoletePrefs[i].version + " release...")
            for each(let pref in obsoletePrefs[i].prefs) {
              try {
                vI.vIprefs.clearUserPref(pref);
                Log.debug(".")
              } catch (e) {};
            }
            Log.debug("done.")
          }
        }
      },
    }
    vI.upgrade = upgrade;
  }
});