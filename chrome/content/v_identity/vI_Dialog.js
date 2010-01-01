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

var vI_Dialog = {
	setDescription : function(object, description) {
		var new_text = document.createTextNode(description);
		object.appendChild(new_text);
	},

	init : function(warning) {
		document.getElementById("vI_Dialog").setAttribute("class", warning.class); 
		// refresh window contents through resizing 
		window.resizeTo( window.outerWidth, window.outerHeight);
		vI_Dialog.setDescription(document.getElementById("vI_Dialog_title"), warning.title);
		vI_Dialog.setDescription(document.getElementById("vI_Dialog_recLabel"), warning.recLabel);
		vI_Dialog.setDescription(document.getElementById("vI_Dialog_recipient"), warning.recipient);
		document.getElementById("vI_Dialog_browser").outputString = warning.warning;
		vI_Dialog.setDescription(document.getElementById("vI_Dialog_query"), warning.query);
		// show abort button
		if (warning.class == "replaceVIdentity") {
			document.documentElement.getButton("extra1").hidden = true;
			document.documentElement.getButton("extra2").hidden = true;
		}
	}
}