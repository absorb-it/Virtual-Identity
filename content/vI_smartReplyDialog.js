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
    var smartReply_dialog = {
      Obj_radioGroup: null,
      all_addresses: null,

      init: function () {
        smartReply_dialog.Obj_radioGroup = document.getElementById("replySelector.radiogroup");
        smartReply_dialog.all_addresses = window.arguments[0];
        for (var index = 0; index < smartReply_dialog.all_addresses.number; index++) {
          var menuentry = smartReply_dialog.all_addresses.identityDataCollection[index].combinedName;

          var id = null;
          var smtp = null;

          if (smartReply_dialog.all_addresses.identityDataCollection[index].id)
            id = smartReply_dialog.all_addresses.identityDataCollection[index].id.value;
          if (smartReply_dialog.all_addresses.identityDataCollection[index].smtp)
            smtp = smartReply_dialog.all_addresses.identityDataCollection[index].smtp.value;

          let defaultServerTag = Components.classes["@mozilla.org/intl/stringbundle;1"]
            .getService(Components.interfaces.nsIStringBundleService)
            .createBundle("chrome://messenger/locale/messenger.properties")
            .GetStringFromName("defaultServerTag")

          menuentry += (id ? " (" + id + "," + (smtp ? smtp : defaultServerTag) + ")" : "")
          smartReply_dialog.add_row(menuentry);
        }
      },

      add_row: function (combinedName) {
        var radio = document.createElement("radio");
        radio.setAttribute("label", combinedName);
        smartReply_dialog.Obj_radioGroup.appendChild(radio);
      },

      accept: function () {
        /* window.argument[1] stores callback function */
        window.arguments[1](smartReply_dialog.all_addresses, smartReply_dialog.Obj_radioGroup.selectedIndex);
        document.documentElement.acceptDialog();
      }
    }
    window.addEventListener("load", smartReply_dialog.init, false);
    vI.smartReply_dialog = smartReply_dialog;
  }
});