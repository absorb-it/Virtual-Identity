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

    Components.utils.import("resource://v_identity/vI_identityData.js", virtualIdentityExtension);
    let Log = vI.setupLogging("virtualIdentity.rdfDataEditor");
    Components.utils.import("resource://v_identity/vI_prefs.js", virtualIdentityExtension);

    var rdfDataEditor = {
      __rdfDatasource: null,
      __rdfDataTree: null,
      __type: null,
      __recipient: null,
      __identityData: null,

      __populateIdentityMenu: function () {
        var listitem = document.createElement("menuitem");
        listitem.setAttribute("label", "");
        document.getElementById("virtualIdentityExtension_IdentityListPopup").appendChild(listitem);
        document.getElementById("virtualIdentityExtension_IdentityList").selectedItem = listitem;
        var separator = document.createElement("menuseparator");
        document.getElementById("virtualIdentityExtension_IdentityListPopup").appendChild(separator);

        FillIdentityList(document.getElementById("virtualIdentityExtension_IdentityList"))
      },

      init: function () {
        if (window.arguments[0]["recipientCol"])
          rdfDataEditor.__recipient = window.arguments[0]["recipientCol"];
        rdfDataEditor.__type = window.arguments[1];
        rdfDataEditor.__rdfDatasource = window.arguments[2];
        rdfDataEditor.__rdfDataTree = window.arguments[3];;
        rdfDataEditor.__identityData = new vI.identityData(window);
        rdfDataEditor.__identityData.copy(window.arguments[0].identityData);


        // set recipient
        document.getElementById("recipient").value = rdfDataEditor.__recipient;

        // set type of entry (and populate Menu)
        var typeMenuPopup = document.getElementById("type_menu_popup")
        for (var typeField of Array("email", "maillist", "newsgroup", "filter")) {
          var menuitem = document.createElement("menuitem");
          var label = Components.classes["@mozilla.org/intl/stringbundle;1"]
            .getService(Components.interfaces.nsIStringBundleService)
            .createBundle("chrome://v_identity/locale/vI_rdfDataEditor.properties")
            .GetStringFromName("vI_rdfDataTree.dataType." + typeField);
          menuitem.setAttribute("label", label);
          menuitem.setAttribute("key", typeField);
          typeMenuPopup.appendChild(menuitem);
          if (typeField == rdfDataEditor.__type) document.getElementById("type_menu").selectedItem = menuitem
        }

        // set sender
        document.getElementById("sender").value = rdfDataEditor.__identityData.combinedName;

        // set Identity
        rdfDataEditor.__populateIdentityMenu();
        var MenuItems = document.getElementById("virtualIdentityExtension_IdentityListPopup").childNodes;
        for (var index = 0; index < MenuItems.length; index++) {
          if (MenuItems[index].getAttribute("identitykey") == rdfDataEditor.__identityData.id.key) {
            document.getElementById("virtualIdentityExtension_IdentityList").selectedItem =
              MenuItems[index];
            break;
          }
        }

        // set extra values
        rdfDataEditor.__identityData.extras.setValuesToEnvironment();
        
        // only display hide-switch if not all extras are enabled in preferences
        var allEnabled = true;
        rdfDataEditor.__identityData.extras.loopThroughExtras(
          function (extra) {
            allEnabled = allEnabled && vI.vIprefs.get(extra.option);
          }
        )
        if (allEnabled)
            document.getElementById("vI_storageExtras_hideUnusedEditorFields").setAttribute("hidden", true);
        else
            this.hideUnusedEditorFields();
        
        Log.debug("init done");
      },

      hideUnusedEditorFields: function () {
        var allHidden = true;
        var hide = (document.getElementById("vI_storageExtras_hideUnusedEditorFields").getAttribute("checked") == "true")
        rdfDataEditor.__identityData.extras.loopThroughExtras(
          function (extra) {
            var hidden = hide && !vI.vIprefs.get(extra.option);
            document.getElementById("vI_" + extra.option).setAttribute("hidden", hidden)
            document.getElementById("vI_" + extra.option + "_store").setAttribute("hidden", hidden)
            if (!hidden) allHidden = false
          });
        document.getElementById("storeValue").setAttribute("hidden", allHidden)
          // resize the window to the content
        window.sizeToContent();
      },

      identityExtras_adapt: function (sourceId, targetId) {
        var checked = document.getElementById(sourceId).getAttribute("checked");
        if (targetId) var target = document.getElementById(targetId)
        else var target = document.getElementById(sourceId.replace(/_store/, ""))
        if (checked == "true") target.removeAttribute("disabled")
        else target.setAttribute("disabled", "true");
      },

      blurEvent: function (elementId) {
        var elem = document.getElementById(elementId);
        var localIdentityData = new vI.identityData(window, elem.value, null, null, null, null, null);
        elem.value = localIdentityData.combinedName;
      },

      accept: function () {
        Log.debug("accept");
        var localIdentityData = new vI.identityData(window, document.getElementById("sender").value, null,
          document.getElementById("virtualIdentityExtension_IdentityList").selectedItem.getAttribute("identitykey"));

        localIdentityData.extras.getValuesFromEnvironment();
        rdfDataEditor.__rdfDatasource.updateRDF(
          document.getElementById("recipient").value,
          document.getElementById("type_menu").selectedItem.getAttribute("key"),
          localIdentityData,
          true, rdfDataEditor.__recipient, rdfDataEditor.__type, true);
        Log.debug("updateRDF done " + localIdentityData.extras.status());
        return document.getElementById("type_menu").selectedItem.getAttribute("key");
      }
    }
    vI.rdfDataEditor = rdfDataEditor;
  }
});
