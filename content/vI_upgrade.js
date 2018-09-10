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

      quickUpgrade: function (rdfDatasource) {
        upgrade.rdfDatasource = rdfDatasource;
        if (upgrade.rdfDatasource.extUpgradeRequired())
          upgrade.extUpgrade();
        upgrade.rdfDatasource.refreshAccountInfo();
        return true;
      },

      extUpgrade: function () {
        var currentVersion = upgrade.rdfDatasource.getCurrentExtFileVersion();
        Log.debug("checking for previous version, found " +
          currentVersion + "... extension-upgrade required.")
        switch (currentVersion) {
        case null:
          // import pre-0.10 rdf
          var vI_localRdfDatasource = 
            new virtualIdentityExtension.rdfDatasourceImporter(window, 'virtualIdentity_0.10.rdf', false);
          vI_localRdfDatasource.importFileByName("virtualIdentity.rdf");
          
          // cleanup created accounts for the last time :)
          vI.vIaccount_cleanupSystem(); // always clean leftover accounts and directories

          // no break
        default:
          upgrade.__transferMovedUserPrefs(currentVersion);
          upgrade.__removeObsoleteUserPrefs(currentVersion);
        }
        upgrade.rdfDatasource.storeExtVersion();
        Log.debug("extension-upgrade to " + upgrade.rdfDatasource.getCurrentExtFileVersion() + " done.");
      },

      __transferMovedUserPrefs: function (currentVersion) {
        // transfer renamed preferences
        var transferPrefs = [
//         {
//           version: "0.5.3",
//           prefs: Array({
//             sourcePref: "smart_reply_ask",
//             targetPref: "idSelection_ask"
//           }, {
//             sourcePref: "smart_reply_ask_always",
//             targetPref: "idSelection_ask_always"
//           }, {
//             sourcePref: "smart_reply_autocreate",
//             targetPref: "idSelection_autocreate"
//           }, {
//             sourcePref: "smart_timestamp",
//             targetPref: "autoTimestamp"
//           }, {
//             sourcePref: "storage_prefer_smart_reply",
//             targetPref: "idSelection_storage_prefer_smart_reply"
//           }, {
//             sourcePref: "storage_ignore_smart_reply",
//             targetPref: "idSelection_storage_ignore_smart_reply"
//           })
//         }
        ];
        // remove obsolete preference-tree virtualIdentity
        for (var i = 0; i < transferPrefs.length; i++) {
          // if former version of extension was at least 0.5.0, start with WizardPage 0.5.2
          if (!currentVersion || (upgrade.versionChecker.compare(currentVersion, transferPrefs[i].version) < 0)) {
            // remove any obsolete preferences under extensions.virtualIdentity
            Log.debug("transfer changed preferences of pre-" + transferPrefs[i].version + " release...")
            for (let transferPref of transferPrefs[i].prefs) {
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
        var obsoletePrefs = [
        {
          version: "0.10",
          prefs: Array(
            "extensions.virtualIdentity.show_smtp",
            "extensions.virtualIdentity.storage_store_SMTP",
            "extensions.virtualIdentity.storage_show_SMTP_switch",
            "extensions.virtualIdentity.doFcc",
            "extensions.virtualIdentity.fccFolder",
            "extensions.virtualIdentity.fccFolderPickerMode",
            "extensions.virtualIdentity.fccReplyFollowsParent",
            "extensions.virtualIdentity.draftFolder",
            "extensions.virtualIdentity.draftFolderPickerMode",
            "extensions.virtualIdentity.stationeryFolder",
            "extensions.virtualIdentity.stationeryFolderPickerMode",
            "extensions.virtualIdentity.fcc_show_switch",
            "extensions.virtualIdentity.storage_show_switch",
            "extensions.virtualIdentity.storage_show_baseID_switch",
            "extensions.virtualIdentity.copySMIMESettings",
            "extensions.virtualIdentity.copyAttachVCardSettings",
            "extensions.virtualIdentity.copyNewEnigmailSettings",
            "extensions.virtualIdentity.storageExtras_fcc",
            "extensions.virtualIdentity.storageExtras_openPGP_messageEncryption",
            "extensions.virtualIdentity.storageExtras_openPGP_messageSignature",
            "extensions.virtualIdentity.storageExtras_openPGP_PGPMIME",
            "extensions.virtualIdentity.hide_signature",
            "extensions.virtualIdentity.hide_sMime_messageSignature",
            "extensions.virtualIdentity.hide_openPGP_messageSignature",
            "extensions.virtualIdentity.autoReplyToSelf"
            )
        }
        ];
        // remove obsolete preference-tree virtualIdentity
        for (var i = 0; i < obsoletePrefs.length; i++) {
          // if former version of extension was at least 0.5.0, start with WizardPage 0.5.2
          if (!currentVersion || (upgrade.versionChecker.compare(currentVersion, obsoletePrefs[i].version) < 0)) {
            // remove any obsolete preferences under extensions.virtualIdentity
            Log.debug("removing obsolete preferences of pre-" + obsoletePrefs[i].version + " release...")
            for (let pref of obsoletePrefs[i].prefs) {
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
