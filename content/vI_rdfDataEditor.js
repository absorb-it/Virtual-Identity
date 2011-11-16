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
virtualIdentityExtension.ns(function() { with (virtualIdentityExtension.LIB) {

Components.utils.import("resource://v_identity/vI_identityData.js", virtualIdentityExtension);
let Log = vI.setupLogging("virtualIdentity.rdfDataEditor");

var rdfDataEditor = {
	__rdfDatasource : null,
	__rdfDataTree : null,
	__type : null,
	__recipient : null,
	__identityData : null,
	
	__populateIdentityMenu : function() {
		var listitem = document.createElement("menuitem");
// 		listitem.setAttribute("label", document.getElementById("bundle_messenger").getString("defaultServerTag"));
		listitem.setAttribute("label", "");
		document.getElementById("identity_list_popup").appendChild(listitem);
		document.getElementById("identity_list").selectedItem = listitem;
		var separator = document.createElement("menuseparator");
		document.getElementById("identity_list_popup").appendChild(separator);

		FillIdentityList(document.getElementById("identity_list"))
	},

	init : function() {
		if (window.arguments[0]["recipientCol"])
			rdfDataEditor.__recipient = window.arguments[0]["recipientCol"];
		rdfDataEditor.__type = window.arguments[1];
		rdfDataEditor.__rdfDatasource = window.arguments[2];
		rdfDataEditor.__rdfDataTree = window.arguments[3];
		;
		rdfDataEditor.__identityData = new vI.identityData();
		rdfDataEditor.__identityData.copy(window.arguments[0].identityData);

		
		// set recipient
		document.getElementById("recipient").value = rdfDataEditor.__recipient;
		
		// set type of entry (and populate Menu)
		var typeMenuPopup = document.getElementById("type_menu_popup")
		for each (var typeField in Array("email", "maillist", "newsgroup", "filter")) {
			var menuitem = document.createElement("menuitem");
			var label = document.getElementById("vI_rdfDataTreeBundle").getString("vI_rdfDataTree.dataType." + typeField)
			menuitem.setAttribute("label", label);
			menuitem.setAttribute("key", typeField);
			typeMenuPopup.appendChild(menuitem);
			if (typeField == rdfDataEditor.__type) document.getElementById("type_menu").selectedItem = menuitem
		}
		
		// set sender
		document.getElementById("sender").value = rdfDataEditor.__identityData.combinedName;

		// set Identity
		rdfDataEditor.__populateIdentityMenu();
		var MenuItems = document.getElementById("identity_list_popup").childNodes;
		for (var index = 0; index < MenuItems.length; index++) {
			if (MenuItems[index].getAttribute("value") == rdfDataEditor.__identityData.id.key) {
				document.getElementById("identity_list").selectedItem =
						MenuItems[index];
				break;
			}
		}

		// set SMTP
		document.getElementById("smtpServerListHbox").addNoneServer(); // add non (not stored) Server
		document.getElementById("smtpServerListHbox").smtp = rdfDataEditor.__identityData.smtp.keyNice;
		
		// set extra values
		Log.debug("set Values to Environment\n");
        rdfDataEditor.__identityData.extras.setValuesToEnvironment();
        Log.debug("init nearly done\n");
		this.hideUnusedEditorFields();
        Log.debug("init done\n");
	},
	
    hideUnusedEditorFields : function() {
      var allHidden = true;
      var hide = (document.getElementById("vI_storageExtras_hideUnusedEditorFields").getAttribute("checked") == "true")
      let preferences = Components.classes["@mozilla.org/preferences-service;1"]
        .getService(Components.interfaces.nsIPrefService)
        .getBranch("extensions.virtualIdentity.");
      rdfDataEditor.__identityData.extras.loopThroughExtras(
        function(extra) {
          var hidden = hide && !preferences.getBoolPref(extra.option);
          document.getElementById("vI_" + extra.option).setAttribute("hidden", hidden)
          document.getElementById("vI_" + extra.option + "_store").setAttribute("hidden", hidden)
          if (!hidden) allHidden = false
        } );
      document.getElementById("storeValue").setAttribute("hidden", allHidden)
      // resize the window to the content
      window.sizeToContent();
    },

	identityExtras_adapt: function(sourceId, targetId) {
      var checked = document.getElementById(sourceId).getAttribute("checked");
      if (targetId) var target = document.getElementById(targetId)
      else var target = document.getElementById(sourceId.replace(/_store/,""))
      if (checked == "true") target.removeAttribute("disabled")
      else target.setAttribute("disabled", "true");
    },
  
    blurEvent : function(elementId) {
		var elem = document.getElementById(elementId);
		var localIdentityData = new vI.identityData(elem.value, null, null, null, null, null, null);
		elem.value = localIdentityData.combinedName;					
	},
	
	accept : function() {
		Log.debug("accept\n");
        var localIdentityData = new vI.identityData(document.getElementById("sender").value, null,
			document.getElementById("identity_list").selectedItem.getAttribute("value"),
			document.getElementById("smtp_server_list").selectedItem.getAttribute("key"));
        Log.debug("before getValuesFromEnvironment\n");
        localIdentityData.extras.getValuesFromEnvironment();
        Log.debug("after getValuesFromEnvironment\n");
        rdfDataEditor.__rdfDatasource.updateRDF(
				document.getElementById("recipient").value,
				document.getElementById("type_menu").selectedItem.getAttribute("key"),
				localIdentityData,
				true, true, rdfDataEditor.__recipient, rdfDataEditor.__type);
		Log.debug("updateRDF done " + localIdentityData.extras.status() + "\n");
		return document.getElementById("type_menu").selectedItem.getAttribute("key");
	}
}
vI.rdfDataEditor = rdfDataEditor;
}});