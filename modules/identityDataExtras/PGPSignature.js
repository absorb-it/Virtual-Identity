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

var EXPORTED_SYMBOLS = [];

const Ci = Components.interfaces;
const Cc = Components.classes;
const Cu = Components.utils;


Cu.import("resource://v_identity/vI_identityDataExtras.js");
Cu.import("resource://v_identity/vI_log.js");
let Log = setupLogging("virtualIdentity.identityDataExtras.PGPSignature");
let vc = Cc["@mozilla.org/xpcom/version-comparator;1"].getService(Ci.nsIVersionComparator);

function identityDataExtrasObject_PGPSignature(currentWindow) {
  this._currentWindow = currentWindow;
  this.field = "PGPSig"; // description of the option
  this.option = "storageExtras_openPGP_messageSignature"; // option string to get preference settings
  this.enigmail_active = (typeof this._currentWindow.Enigmail != 'undefined');
}
identityDataExtrasObject_PGPSignature.prototype = {
  __proto__: identityDataExtrasCheckboxObject.prototype,

  readIdentityValue: function (identity) {
    if (this.enigmail_active && this.active) {
      if (identity.getIntAttribute('defaultEncryptionPolicy') > 0)
        this.value = (identity.getBoolAttribute('pgpSignEncrypted')) ? "true" : "false";
      else
        this.value = (identity.getBoolAttribute('pgpSignPlain')) ? "true" : "false";
    }
  },

  setValueToEnvironment_msgCompose: function () {
    if (!this.enigmail_active || !this.active || (this.value == null))
      return;

    if (this.value == "true") {
      this._currentWindow.Enigmail.msg.setFinalSendMode("final-signYes");
    } else {
      this._currentWindow.Enigmail.msg.setFinalSendMode("final-signNo");
    }
  },

  getValueFromEnvironment_msgCompose: function () {
    if (this.enigmail_active && this.active) {
      this.value = (
        this._currentWindow.Enigmail.msg.statusSigned == this._currentWindow.EnigmailConstants.ENIG_FINAL_YES ||
        this._currentWindow.Enigmail.msg.statusSigned == this._currentWindow.EnigmailConstants.ENIG_FINAL_FORCEYES) ? "true" : "false";
    }
  }
}
registerIdExtrasObject(identityDataExtrasObject_PGPSignature);
