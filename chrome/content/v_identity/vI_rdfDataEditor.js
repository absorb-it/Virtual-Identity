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

vI_rdfDataEditor = {
	__rdfDatasource : null,
	
	storageExtras : null,

	init : function() {
		vI_rdfDataEditor.__rdfDatasource = window.arguments[1]
	
		document.getElementById("recipient").value = window.arguments[0]["recipientCol"];
		
		var typeMenuPopup = document.getElementById("type_menu_popup")
		for each (typeField in Array("email", "maillist", "newsgroup")) {
			var menuitem = document.createElement("menuitem");
			var label = document.getElementById("vI_rdfDataTreeBundle").getString("vI_rdfDataTree.dataType." + typeField)
			menuitem.setAttribute("label", label)
			menuitem.setAttribute("key", typeField)
			typeMenuPopup.appendChild(menuitem);
			if (label == window.arguments[0]["typeCol"]) document.getElementById("type_menu").selectedItem = menuitem
		}

		document.getElementById("sender").value = window.arguments[0]["senderCol"]
		
		FillIdentityListPopup(document.getElementById("identity_list_popup"))
		var MenuItems = document.getElementById("identity_list_popup").childNodes
		for (index = 0; index < MenuItems.length; index++) {
			if (MenuItems[index].getAttribute("value") == window.arguments[0]["idKey"]) {
					 document.getElementById("identity_list").selectedItem =
						MenuItems[index];
					break;
			}
		}

		vI_smtpSelector.elements.Obj_SMTPServerList = document.getElementById("smtp_server_list");
		vI_smtpSelector.elements.Obj_SMTPServerListPopup = document.getElementById("smtp_server_list_popup");
		vI_smtpSelector.__loadSMTP_server_list();
		vI_smtpSelector.setMenuToKey(window.arguments[0]["smtpKey"])
		
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
		
		if (window.arguments[0]["resource"])
			vI_rdfDataEditor.__rdfDatasource.removeVIdentityFromRDF(window.arguments[0]["resource"])
			
		vI_rdfDataEditor.storageExtras.readEditorValues();
		vI_rdfDataEditor.__rdfDatasource.updateRDF(
				document.getElementById("recipient").value,
				document.getElementById("type_menu").selectedItem.getAttribute("key"),
				address.email, address.name,
				document.getElementById("identity_list").selectedItem.getAttribute("value"),
				document.getElementById("smtp_server_list").selectedItem.getAttribute("key"),
				vI_rdfDataEditor.storageExtras
				)
	},
}
window.addEventListener("load", vI_rdfDataEditor.init, false);
