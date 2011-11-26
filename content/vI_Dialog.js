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
var Dialog = {
	setDescription : function(object, description) {
		var new_text = document.createTextNode(description);
		object.appendChild(new_text);
	},

	init : function(warning) {
		dump("warning.class=" + warning.class + "warning.class=" + warning.title + "warning.warning=" + warning.warning + "\n")
		document.getElementById("virtualIdentityExtension_Dialog").setAttribute("class", warning.class); 
		Dialog.setDescription(document.getElementById("virtualIdentityExtension_Dialog_title"), warning.title);
		Dialog.setDescription(document.getElementById("virtualIdentityExtension_Dialog_recLabel"), warning.recLabel);
		Dialog.setDescription(document.getElementById("virtualIdentityExtension_Dialog_recipient"), warning.recipient);
		document.getElementById("virtualIdentityExtension_Dialog_browser").outputString = warning.warning;
		Dialog.setDescription(document.getElementById("virtualIdentityExtension_Dialog_query"), warning.query);
		// show abort button
		if (warning.class == "replaceVIdentity") {
			document.documentElement.getButton("extra1").hidden = true;
			document.documentElement.getButton("extra2").hidden = true;
		}
	}
}
vI.Dialog = Dialog;
}});