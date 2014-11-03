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
let Log = setupLogging("virtualIdentity.identityDataExtras.messageFormat");

function identityDataExtrasObject_messageFormat(currentWindow) {
  this.currentWindow = currentWindow;
  this.field = "msgFormat"; // description of the option
  this.option = "storageExtras_messageFormat"; // option string to get preference settings
}
identityDataExtrasObject_messageFormat.prototype = {
  __proto__: identityDataExtrasObject.prototype,

  // functions to get nicely formatted output
  get valueHtml() {
    return this.valueNice;
  },
  get valueNice() {
    return this.value ? this.currentWindow.document.getElementById(this.value).label : "";
  },

  setValueToEnvironment_msgCompose: function () {
    if (this.value == null)
      return
    this.currentWindow.document.getElementById("outputFormatMenu").removeAttribute("hidden");
    this.currentWindow.document.getElementById(this.value).setAttribute("checked", "true");
    this.currentWindow.OutputFormatMenuSelect(this.currentWindow.document.getElementById(this.value))
  },

  setValueToEnvironment_dataEditor: function () {
    if (this.value != null) {
      this.currentWindow.document.getElementById("outputFormatMenu").selectedItem = this.currentWindow.document.getElementById(this.value);
      this.currentWindow.document.getElementById("vI_" + this.option + "_store").setAttribute("checked", "true");
    }
    this.currentWindow.document.getElementById("vI_" + this.option + "_store").doCommand();
  },

  getValueFromEnvironment_msgCompose: function () {
    const nsIMsgCompSendFormat = Components.interfaces.nsIMsgCompSendFormat;
    switch (this.currentWindow.gSendFormat) {
    case nsIMsgCompSendFormat.AskUser:
      this.value = "format_auto";
      break;
    case nsIMsgCompSendFormat.PlainText:
      this.value = "format_plain";
      break;
    case nsIMsgCompSendFormat.HTML:
      this.value = "format_html";
      break;
    case nsIMsgCompSendFormat.Both:
      this.value = "format_both";
      break;
    }
  },

  getValueFromEnvironment_dataEditor: function () {
    if (this.currentWindow.document.getElementById("vI_" + this.option + "_store").getAttribute("checked") == "true")
      this.value = this.currentWindow.document.getElementById("outputFormatMenu").selectedItem.id
    else
      this.value = null;
  }
}
registerIdExtrasObject(identityDataExtrasObject_messageFormat);