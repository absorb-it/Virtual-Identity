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

ChromeUtils.import("resource://gre/modules/CharsetMenu.jsm");

let Log = setupLogging("virtualIdentity.identityDataExtras.characterEncoding");

function identityDataExtrasObject_characterEncoding(currentWindow) {
  this._currentWindow = currentWindow;
  this.field = "charEnc"; // description of the option
  this.option = "storageExtras_characterEncoding"; // option string to get preference settings
}
identityDataExtrasObject_characterEncoding.prototype = {
  __proto__: identityDataExtrasObject.prototype,
  
  get valueHtml() {
    return this.valueNice;
  },
  get valueNice() {
    return this.value ? this._currentWindow.gCharsetConvertManager
      .getCharsetTitle(this._currentWindow.gCharsetConvertManager.getCharsetAlias(this.value)) : "";
  },

  setValueToEnvironment_msgCompose: function () {
    if (!this.value)
      return;
    this._currentWindow.gMsgCompose.compFields.characterSet = this.value;
    this._currentWindow.SetDocumentCharacterSet(this.value);
  },

  setValueToEnvironment_dataEditor: function () {
    CharsetMenu.build(this._currentWindow.document.getElementById("charsetPopup"), true, false)
    if (this.value != null) {
      let menu = this._currentWindow.document.getElementById("maileditCharsetMenu");
      let menuitem = menu.getElementsByAttribute("charset", this.value).item(0);
      if (menuitem) {
          menu.selectedItem = menuitem;
          menuitem.setAttribute("checked", "true");
      }
      menu.setAttribute("label", CharsetMenu._getCharsetLabel(this.value));
      this._currentWindow.document.getElementById("vI_" + this.option + "_store").setAttribute("checked", "true");
    }
    this._currentWindow.document.getElementById("vI_" + this.option + "_store").doCommand();
  },

  getValueFromEnvironment_msgCompose: function () {
    // read the value from the internal vI object, global object might not be available any more
    // happens especially while storing after sending the message
    this.value = this._currentWindow.gMsgCompose.compFields.characterSet;
    if (this._currentWindow.gCharsetConvertManager) {
      var charsetAlias = this._currentWindow.gCharsetConvertManager.getCharsetAlias(this.value);
      if (charsetAlias == "us-ascii")
        this.value = "ISO-8859-1"; // no menu item for "us-ascii"
    }
  },

  getValueFromEnvironment_dataEditor: function () {
    if (this._currentWindow.document.getElementById("vI_" + this.option + "_store").getAttribute("checked") == "true")
    // check if element is selected (list might not contain relevant entry)
      if (this._currentWindow.document.getElementById("maileditCharsetMenu").selectedItem)
        this.value = this._currentWindow.document.getElementById("maileditCharsetMenu").selectedItem.getAttribute('charset');
      else
        this.value = null;
  }
}
registerIdExtrasObject(identityDataExtrasObject_characterEncoding);
