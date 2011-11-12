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

virtualIdentityExtension.ns(function() { with (virtualIdentityExtension.LIB) {
var upgradeOverlay = {
	init: function() {
		var rdfDatasource = new vI.rdfDatasource("virtualIdentity.rdf", true);
        if (rdfDatasource.extUpgradeRequired()) {
			if (!vI.upgrade.quick_upgrade(rdfDatasource.getCurrentExtFileVersion()))
				window.open("chrome://v_identity/content/vI_upgrade.xul",0,
					"chrome, dialog, modal, alwaysRaised, resizable=yes").focus();
		}
		else {
			vI.account.cleanupSystem(); // always clean leftover accounts and directories
			rdfDatasource.storeExtVersion();
		}
		rdfDatasource.refreshAccountInfo();
        rdfDatasource.clean();
        
		// show error-Console if required
		var prefroot = Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefService)
			.getBranch(null);
		
		Components.utils.import("resource://gre/modules/AddonManager.jsm");  

		const switch_signature_ID="{2ab1b709-ba03-4361-abf9-c50b964ff75d}"		
		prefroot.setBoolPref("extensions.virtualIdentity." + switch_signature_ID, false)
		AddonManager.getAddonByID(switch_signature_ID, function(addon) {
			if (addon) prefroot.setBoolPref("extensions.virtualIdentity." + switch_signature_ID, addon.userDisabled || addon.appDisabled ? false : true)
		});	
		
		const enigmail_ID="{847b3a00-7ab1-11d4-8f02-006008948af5}"
		prefroot.setBoolPref("extensions.virtualIdentity." + enigmail_ID, false)
		AddonManager.getAddonByID(enigmail_ID, function(addon) {
			if (addon) prefroot.setBoolPref("extensions.virtualIdentity." + enigmail_ID, addon.userDisabled || addon.appDisabled ? false : true)
		});	
		
		const virtualIdentity_ID="{dddd428e-5ac8-4a81-9f78-276c734f75b8}"
		AddonManager.getAddonByID(virtualIdentity_ID, function(addon) {
			if (addon) vI.extensionVersion = addon.version;
		});
		
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
addEventListener('messagepane-loaded', upgradeOverlay.init, true);
}});