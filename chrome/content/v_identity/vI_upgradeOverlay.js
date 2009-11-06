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

var vI_upgradeOverlay = {
	init: function() {
		vI_rdfDatasource.init() // just to be sure that Datasource is available
		if (vI_rdfDatasource.rdfUpgradeRequired() || vI_rdfDatasource.extUpgradeRequired()) {
			if (!vI_upgrade.quick_upgrade())
				window.open("chrome://v_identity/content/vI_upgrade.xul",0,
					"chrome, dialog, modal, alwaysRaised, resizable=yes").focus();
		}
		else {
			vI_account.cleanupSystem(); // always clean leftover accounts and directories
			
			// just to recognize downgrades later
			vI_rdfDatasource.storeRDFVersion();
			vI_rdfDatasource.storeExtVersion();
		}
		// show error-Console if required
		var prefroot = Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefService)
			.getBranch(null);
		if (prefroot.getBoolPref("extensions.virtualIdentity.error_console")) {
			document.getElementById("vIErrorBoxSplitter").removeAttribute("hidden");
			document.getElementById("vIErrorBox").removeAttribute("hidden");
			document.getElementById("vIErrorBox").setAttribute("class", "console-box");
			prefroot.setBoolPref("javascript.options.showInConsole", true);
			prefroot.setBoolPref("browser.dom.window.dump.enabled", true);
			prefroot.setBoolPref("javascript.options.strict", true);
		}
	}
}
addEventListener('messagepane-loaded', vI_upgradeOverlay.init, true);
