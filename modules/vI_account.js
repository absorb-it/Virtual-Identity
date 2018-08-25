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

var EXPORTED_SYMBOLS = ["vIaccount_cleanupSystem"]

const {
  classes: Cc,
  interfaces: Ci,
  utils: Cu,
  results: Cr
} = Components;

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://v_identity/vI_log.js");
Cu.import("resource://v_identity/vI_identityData.js");
Cu.import("resource://v_identity/vI_rdfDatasource.js");
Cu.import("resource://v_identity/vI_prefs.js");
Cu.import("resource://v_identity/vI_accountUtils.js");

let Log = setupLogging("virtualIdentity.account");

var account = {
  // checks if directory is empty, not really used
  // ignores files ending with *.msf, else reports if a non-zero file is found.
  __dirEmpty: function (directory) {
    var dirEnumerator = directory.directoryEntries;
    while (dirEnumerator.hasMoreElements()) {
      var maildir = dirEnumerator.getNext();
      maildir.QueryInterface(Ci.nsIFile);
      // recurse into all subdirectories
      if (maildir.isDirectory() &&
        !account.__dirEmpty(maildir)) return false;
      // ignore files with ending "*.msf"
      if (!maildir.path.match(new RegExp(".*\.msf$", "i")) &&
        maildir.fileSize != 0) return false;
    }
    return true;
  },

  __cleanupDirectories: function () {
    Log.debug("checking for leftover VirtualIdentity directories ...")

    var file = Cc["@mozilla.org/file/directory_service;1"]
      .getService(Ci.nsIProperties)
      .get("ProfD", Ci.nsIFile);

    var fileEnumerator = file.directoryEntries
    while (fileEnumerator.hasMoreElements()) {
      var dir = fileEnumerator.getNext()
      dir.QueryInterface(Ci.nsIFile);
      if (dir.path.match(new RegExp("[/\\\\]Mail$", "i"))) { // match Windows and Linux/Mac separators
        var dirEnumerator = dir.directoryEntries
        while (dirEnumerator.hasMoreElements()) {
          var maildir = dirEnumerator.getNext()
          maildir.QueryInterface(Ci.nsIFile);
          // match Windows and Linux/Mac separators
          if (maildir.path.match(new RegExp("[/\\\\]virtualIdentity.*$", "i"))) {
            // should be empty, VirtualIdentity never uses those directories
            if (account.__dirEmpty(maildir)) {
              try {
                maildir.remove(true)
              } catch (e) {}
            }
          }
        }
      }
    }
    Log.debug("done.")
  },
 
  cleanupSystem: function () {
    Log.debug("checking for leftover VirtualIdentity accounts ...")
    var accounts = getAccountsArray();

    for (let acc = 0; acc < accounts.length; acc++) {
      let checkAccount = accounts[acc];
      if (account.__isVIdentityAccount(checkAccount)) {
        account.__removeAccount(checkAccount);
      }
      // replace account with key, required for next check
      accounts[acc] = accounts[acc].key;
    }

    //      account-prefs are not removed, grrrr --> https://bugzilla.mozilla.org/show_bug.cgi?id=875675
    //  compare against all accounts, getAccountsArray() does not include 'smart mailboxes' == 'unified folders'
    var all_accounts = prefroot.getCharPref("mail.accountmanager.accounts").split(",");
    try {
      var lastAccountKey = prefroot.getIntPref("mail.account.lastKey");
      for (let key = 0; key <= lastAccountKey; key++) {
        if (all_accounts.indexOf("account" + key) > -1) continue;
        account.__removeAccountPrefs("account" + key);
      }
    } catch (e) {};
    Log.debug("done.")
    account.__cleanupDirectories();
  },

  __isVIdentityAccount: function (checkAccount) {
    // check for new (post0.5.0) accounts,
    try {
      prefroot.getBoolPref("mail.account." + checkAccount.key + ".vIdentity");
      return true;
    } catch (e) {};
    // check for old (pre 0.5.0) accounts
    if (checkAccount.incomingServer && checkAccount.incomingServer.hostName == "virtualIdentity") return true;
    return false;
  },

  __removeAccountPrefs: function (key) {
    // remove the additional tagging-pref
    try {
      prefroot.clearUserPref("mail.account." + key + ".vIdentity");
    } catch (e) {};
    try {
      // account-prefs are not removed, grrrr --> https://bugzilla.mozilla.org/show_bug.cgi?id=875675
      prefroot.clearUserPref("mail.account." + key + ".server");
    } catch (e) {};
    try {
      // account-prefs are not removed, grrrr --> https://bugzilla.mozilla.org/show_bug.cgi?id=875675
      prefroot.clearUserPref("mail.account." + key + ".identities");
    } catch (e) {};
  },

  __removeAccount: function (checkAccount) {
    Log.debug("__removeAccount")
      // in new (post 0.5.0) Virtual Identity accounts the incomingServer of the account
      // points to an incoming server of a different account. Cause the internal
      // removeAccount function tries to removes the incomingServer ether, create
      // a real one before calling this function.
    if (!checkAccount.incomingServer || checkAccount.incomingServer.hostName != "virtualIdentity") {
      // if not some of the 'old' accounts
      checkAccount.incomingServer = account._AccountManager.
      createIncomingServer("toRemove", "virtualIdentity", "pop3");
    }

    // remove the rootFolder of the account
    try {
      checkAccount.incomingServer.rootFolder.Delete();
    } catch (e) {};

    var key = checkAccount.key;
    Log.debug("removing account " + key)
      // remove the account
    account._AccountManager.removeAccount(checkAccount);

    // prevent useless increasing of lastKey https://bugzilla.mozilla.org/show_bug.cgi?id=485839
    try {
      var lastAccountKey = prefroot.getIntPref("mail.account.lastKey");
      if ("account" + lastAccountKey == key)
        prefroot.setIntPref("mail.account.lastKey", lastAccountKey - 1);
    } catch (e) {};

    account.__removeAccountPrefs(key);
  },
}
var vIaccount_cleanupSystem = account.cleanupSystem;
