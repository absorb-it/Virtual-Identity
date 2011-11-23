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

var EXPORTED_SYMBOLS = ["initReplyTo", "addReplyToSelf"]

const {classes: Cc, interfaces: Ci, utils: Cu, results : Cr} = Components;
Cu.import("resource://v_identity/vI_prefs.js");
Cu.import("resource://v_identity/vI_log.js");
let Log = setupLogging("virtualIdentity.replyToSelf");

function initReplyTo() {
  if (vIprefs.get("autoReplyToSelf")) {
    replyToSelfObj.removeAttribute("hidden");
    removeAllReplyTos();
  }
  else
    replyToSelfObj.setAttribute("hidden", "true");
};

function removeAllReplyTos() {
  if (!replyToSelfObj.hasAttribute("hidden")) {
    for (var row = 1; row <= top.MAX_RECIPIENTS; row ++) {
      var awType = currentWindow.awGetPopupElement(row).selectedItem.getAttribute("value");
      if (awType == "addr_reply") {
        Log.debug("removed ReplyTo found in row " + row + "\n");
        currentWindow.awDeleteRow(row--); // removed one line therefore decrease row-value
      }
    }
  }
};

function addReplyToSelf() {
  if (!replyToSelfObj.hasAttribute("hidden")) {
    currentWindow.awAddRecipient("addr_reply",currentWindow.document.getElementById("virtualIdentityExtension_msgIdentityClone").label);
    Log.debug("added ReplyToSelf");
    replyToSelfObj.setAttribute("hidden","true");
  }
}

let replyToSelfObj = null;
currentWindow = Cc["@mozilla.org/appshell/window-mediator;1"]
  .getService(Ci.nsIWindowMediator)
  .getMostRecentWindow(null);
currentWindow.addEventListener("load", function () {
  replyToSelfObj = currentWindow.document.getElementById("virtualIdentityExtension_autoReplyToSelfLabel");
  }, false);