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
    Portions created by the Initial Developer are Copyright (C) 2011
    the Initial Developer. All Rights Reserved.

    Contributor(s):
 * ***** END LICENSE BLOCK ***** */

var EXPORTED_SYMBOLS = ["getAccountsArray", "getIdentitiesArray"]

const {classes: Cc, interfaces: Ci, utils: Cu, results : Cr} = Components;

Cu.import("resource://v_identity/vI_log.js");
let Log = setupLogging("virtualIdentity.accountUtils");

let accountManager = Components.classes["@mozilla.org/messenger/account-manager;1"]
    .getService(Components.interfaces.nsIMsgAccountManager);

// copy/pasted from MsgComposeCommands.js
function queryISupportsArray(supportsArray, iid) {
    let count = supportsArray.Count();
    var result = new Array
    for (let i = 0; i < count; i++)
        result[i] = supportsArray.QueryElementAt(i, iid);        
    return result;
};

function getIdentitiesArray(account) {
    var identities;
    if (Components.utils.import("resource:///modules/folderUtils.jsm") && Components.utils.import("resource:///modules/iteratorUtils.jsm")
        && typeof(toArray)=='function' && typeof(fixIterator)=='function') {
        identities = toArray(fixIterator(account.identities,Components.interfaces.nsIMsgIdentity));
    } else {
        identities = queryISupportsArray(accounts[i].identities, Components.interfaces.nsIMsgIdentity);
    }
    return identities;
}

function getAccountsArray() {
    var accounts;
    function sortAccounts(a, b) {
        if (a.key == accountManager.defaultAccount.key)
        return -1;
        if (b.key == accountManager.defaultAccount.key)
        return 1;
        var aIsNews = a.incomingServer.type == "nntp";
        var bIsNews = b.incomingServer.type == "nntp";
        if (aIsNews && !bIsNews)
        return 1;
        if (bIsNews && !aIsNews)
        return -1;

        var aIsLocal = a.incomingServer.type == "none";
        var bIsLocal = b.incomingServer.type == "none";
        if (aIsLocal && !bIsLocal)
        return 1;
        if (bIsLocal && !aIsLocal)
        return -1;
        return 0;
    }
    if (Components.utils.import("resource:///modules/folderUtils.jsm") && Components.utils.import("resource:///modules/iteratorUtils.jsm")
        && typeof(allAccountsSorted)=='function') {
        // if this worked we are having at least seamonkey 1.17
//        Log.debug("getAccounts - new schema");
        accounts = allAccountsSorted(true);
    } else {
        // still some older version
//        Log.debug("getAccounts - old schema");
        var accounts = queryISupportsArray(accountManager.accounts,
                                        Components.interfaces.nsIMsgAccount);

        // Ugly hack to work around bug 41133. :-(
        accounts = accounts.filter(function isNonSuckyAccount(a) { return !!a.incomingServer; });
        accounts.sort(sortAccounts);
    }
    return accounts
};
