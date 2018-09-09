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
    let Log = vI.setupLogging("virtualIdentity.rdfAccountMismatchDialog");

    var rdfAccountMismatchDialog = {
      mismatchItems: null,
      type: null,

      init: function () {
        rdfAccountMismatchDialog.type = window.arguments[0];
        rdfAccountMismatchDialog.mismatchItems = window.arguments[1];

        // display the relevant help-tags
        document.getElementById("virtualIdentityExtension_rdfAccountMismatchDialog_vbox_" + rdfAccountMismatchDialog.type).removeAttribute("hidden");
        document.getElementById("virtualIdentityExtension_rdfAccountMismatchDialog_listhead_" + rdfAccountMismatchDialog.type).removeAttribute("hidden");

        for (var i = 0; i < rdfAccountMismatchDialog.mismatchItems.length; i++) {
          //             var label = document.createElement("label");
          var listitem = document.createElement("listitem");
          listitem.setAttribute("id", "virtualIdentityExtension_mismatchLine_" + i);
          listitem.setAttribute("class", "mismatchLine");
          listitem.setAttribute("type", rdfAccountMismatchDialog.type);
          listitem.setAttribute("oldkey", rdfAccountMismatchDialog.mismatchItems[i].oldkey);
          listitem.setAttribute("label", rdfAccountMismatchDialog.mismatchItems[i].label);
          listitem.setAttribute("ext1", rdfAccountMismatchDialog.mismatchItems[i].ext1);
          listitem.setAttribute("ext2", rdfAccountMismatchDialog.mismatchItems[i].ext2);
          listitem.setAttribute("count", rdfAccountMismatchDialog.mismatchItems[i].count);
          document.getElementById("virtualIdentityExtension_rdfAccountMismatchDialog_listbox").appendChild(listitem)
        }
      },

      accept: function () {
        for (var i = 0; i < rdfAccountMismatchDialog.mismatchItems.length; i++) {
          rdfAccountMismatchDialog.mismatchItems[i].key = document.getElementById("virtualIdentityExtension_mismatchLine_" + i).key
        }
        /* window.argument[2] stores callback parent */
        window.arguments[2].repairMismatch(rdfAccountMismatchDialog.type, rdfAccountMismatchDialog.mismatchItems);
      }
    }
    window.addEventListener("load", rdfAccountMismatchDialog.init, false);
    vI.rdfAccountMismatchDialog = rdfAccountMismatchDialog;
  }
});
