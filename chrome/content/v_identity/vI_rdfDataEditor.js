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

var vI_rdfDataEditor = {
	__rdfDatasource : null,
	__type : null,
	
	storageExtras : null,

	init : function() {
		vI_rdfDataEditor.__type = window.arguments[1];
		vI_rdfDataEditor.__rdfDatasource = window.arguments[2];

		document.getElementById("recipient").value = window.arguments[0]["recipientCol"];
		
		var typeMenuPopup = document.getElementById("type_menu_popup")

		for each (typeField in Array("email", "maillist", "newsgroup", "filter")) {
			var menuitem = document.createElement("menuitem");
			var label = document.getElementById("vI_rdfDataTreeBundle").getString("vI_rdfDataTree.dataType." + typeField)
			menuitem.setAttribute("label", label)
			menuitem.setAttribute("key", typeField)
			typeMenuPopup.appendChild(menuitem);
			if (typeField == vI_rdfDataEditor.__type) document.getElementById("type_menu").selectedItem = menuitem
		}

		document.getElementById("sender").value = window.arguments[0]["senderCol"]
		
		var listitem = document.createElement("menuitem");
// 		listitem.setAttribute("label", document.getElementById("bundle_messenger").getString("defaultServerTag"));
		listitem.setAttribute("label", "");
		document.getElementById("identity_list_popup").appendChild(listitem);
		document.getElementById("identity_list").selectedItem = listitem;
		var separator = document.createElement("menuseparator");
		document.getElementById("identity_list_popup").appendChild(separator);

		if (typeof(FillIdentityList)=="function")		// TB 3.x
			FillIdentityList(document.getElementById("identity_list"))
		else							// TB 2.x
			FillIdentityListPopup(document.getElementById("identity_list_popup"))

		var MenuItems = document.getElementById("identity_list_popup").childNodes
		
		for (var index = 0; index < MenuItems.length; index++) {
			if (MenuItems[index].getAttribute("value") == window.arguments[0]["idKey"]) {
				document.getElementById("identity_list").selectedItem =
						MenuItems[index];
				break;
			}
		}

		document.getElementById("smtpServerListHbox").smtp = window.arguments[0]["smtpKey"]
		
		vI_rdfDataEditor.storageExtras = new vI_storageExtras()
		vI_rdfDataEditor.storageExtras.setEditorValues();
		vI_storageExtrasHelper.hideUnusedEditorFields();
	},
	
	blurEvent : function(elementId) {
		var elem = document.getElementById(elementId)
		var address = vI_helper.parseAddress(elem.value)
		elem.value = address.combinedName;					
	},
	
	accept : function() {
		var address = vI_helper.parseAddress(document.getElementById("sender").value)
					
		vI_rdfDataEditor.storageExtras.readEditorValues();
		
		var localIdentityData = new identityData(address.email, address.name,
			document.getElementById("identity_list").selectedItem.getAttribute("value"),
			document.getElementById("smtp_server_list").selectedItem.getAttribute("key"),
			vI_rdfDataEditor.storageExtras)

		// if current Type and previous Type are different, remove previous resource
		vI_rdfDataEditor.__rdfDatasource.removeRDF(document.getElementById("recipient").value,
				vI_rdfDataEditor.__type);

		vI_rdfDataEditor.__rdfDatasource.updateRDF(document.getElementById("recipient").value,
				document.getElementById("type_menu").selectedItem.getAttribute("key"),
				localIdentityData, true);

		return document.getElementById("type_menu").selectedItem.getAttribute("key");
	}
}
window.addEventListener("load", vI_rdfDataEditor.init, false);
