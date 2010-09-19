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

var vI_rdfAccountMismatchDialog = {
	mismatchItems : null,
    type : null,

	init : function() {	
		vI_rdfAccountMismatchDialog.type = window.arguments[0];
        vI_rdfAccountMismatchDialog.mismatchItems = window.arguments[1];
        
        // display the relevant help-tags
        document.getElementById("rdfAccountMismatchDialog_vbox_" + vI_rdfAccountMismatchDialog.type).removeAttribute("hidden");
        
		for (var i = 0; i < vI_rdfAccountMismatchDialog.mismatchItems.length; i++) {
            var label = document.createElement("label");
            label.setAttribute("id", "mismatchLine_" + i);
            label.setAttribute("class", "mismatchLine");
            label.setAttribute("type",vI_rdfAccountMismatchDialog.type);
            label.setAttribute("oldkey",vI_rdfAccountMismatchDialog.mismatchItems[i].oldkey);
            label.setAttribute("label",vI_rdfAccountMismatchDialog.mismatchItems[i].label);
            label.setAttribute("ext1",vI_rdfAccountMismatchDialog.mismatchItems[i].ext1);
            label.setAttribute("ext2",vI_rdfAccountMismatchDialog.mismatchItems[i].ext2);
            label.setAttribute("count",vI_rdfAccountMismatchDialog.mismatchItems[i].count);
            document.getElementById("rdfAccountMismatchDialog_groupbox").appendChild(label)
		}
	},

	accept : function() {
        for (var i = 0; i < vI_rdfAccountMismatchDialog.mismatchItems.length; i++) {
            vI_rdfAccountMismatchDialog.mismatchItems[i].key = document.getElementById("mismatchLine_" + i).key
        }
		/* window.argument[2] stores callback function */
        window.arguments[2](vI_rdfAccountMismatchDialog.type, vI_rdfAccountMismatchDialog.mismatchItems);
	}
}
window.addEventListener("load", vI_rdfAccountMismatchDialog.init, false);