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
var statusmenu = {
	prefroot : Components.classes["@mozilla.org/preferences-service;1"]
		.getService(Components.interfaces.nsIPrefService)
		.getBranch(null),

	objStatusMenu : null,
	objSaveBaseIDMenuItem : null,
	objStorageSaveMenuItem : null,
	objStatusMenuSeparator : null,
	objSaveSwitch : null,
	objSaveBaseIDSwitch : null,
	objSaveSMTPSwitch : null,
	objFccSwitch : null,
	objStatusText : null,
	
	observe: function(subject, topic, data) {
		switch (data) {
			case "extensions.virtualIdentity.fcc_show_switch":
				statusmenu.objFccSwitch.setAttribute("hidden", !statusmenu.prefroot.getBoolPref(data));
				// no break, continue like with doFcc			
			case "extensions.virtualIdentity.doFcc":
				statusmenu.objFccSwitch.setAttribute("checked", statusmenu.prefroot.getBoolPref("extensions.virtualIdentity.doFcc"));
				break;
			case "extensions.virtualIdentity.storage_show_switch":
				statusmenu.objSaveSwitch.setAttribute("hidden", !statusmenu.prefroot.getBoolPref(data));
				break;
			case "extensions.virtualIdentity.storage_show_baseID_switch":
				statusmenu.objSaveBaseIDSwitch.setAttribute("hidden", !statusmenu.prefroot.getBoolPref(data));
				break;
			case "extensions.virtualIdentity.storage_show_SMTP_switch":
				statusmenu.objSaveSMTPSwitch.setAttribute("hidden", !statusmenu.prefroot.getBoolPref(data));
				break;
			case "extensions.virtualIdentity.storage_storedefault":
				statusmenu.objStorageSaveMenuItem.setAttribute("checked", statusmenu.prefroot.getBoolPref("extensions.virtualIdentity.storage_storedefault"));
				break;
			case "extensions.virtualIdentity.storage_store_base_id":
				statusmenu.objSaveBaseIDMenuItem.setAttribute("checked", statusmenu.prefroot.getBoolPref(data));
				break;
			case "extensions.virtualIdentity.storage_store_SMTP":
				statusmenu.objSaveSMTPMenuItem.setAttribute("checked", statusmenu.prefroot.getBoolPref(data));
				break;
			case "extensions.virtualIdentity.storage_colorIndication":
				document.getElementById("identityHbox").setAttribute("colorize", statusmenu.prefroot.getBoolPref(data))
				document.getElementById("baseIDHbox").setAttribute("colorize", statusmenu.prefroot.getBoolPref(data))
				document.getElementById("smtpServerHbox").setAttribute("colorize", statusmenu.prefroot.getBoolPref(data))
				break;
			case "extensions.virtualIdentity.storage":
				if (statusmenu.prefroot.getBoolPref(data)) {
					statusmenu.objStorageSaveMenuItem.removeAttribute("hidden");
					statusmenu.objSaveBaseIDMenuItem.removeAttribute("hidden");
					statusmenu.objSaveSMTPMenuItem.removeAttribute("hidden");
					statusmenu.objStatusMenuSeparator.removeAttribute("hidden");
				}
				else {
					statusmenu.objStorageSaveMenuItem.setAttribute("hidden", "true");
					statusmenu.objSaveBaseIDMenuItem.setAttribute("hidden", "true");
					statusmenu.objSaveSMTPMenuItem.setAttribute("hidden", "true");
					statusmenu.objStatusMenuSeparator.setAttribute("hidden", "true");
				}
				break;
		}
		statusmenu.menuConstraint(statusmenu.objStorageSaveMenuItem);
	},
	
	addObserver: function() {
		statusmenu.prefroot.addObserver("extensions.virtualIdentity.fcc_show_switch", statusmenu, false);
		statusmenu.prefroot.addObserver("extensions.virtualIdentity.doFcc", statusmenu, false);
		statusmenu.prefroot.addObserver("extensions.virtualIdentity.storage", statusmenu, false);
		statusmenu.prefroot.addObserver("extensions.virtualIdentity.storage_show_switch", statusmenu, false);
		statusmenu.prefroot.addObserver("extensions.virtualIdentity.storage_show_baseID_switch", statusmenu, false);
		statusmenu.prefroot.addObserver("extensions.virtualIdentity.storage_show_SMTP_switch", statusmenu, false);
		statusmenu.prefroot.addObserver("extensions.virtualIdentity.storage_colorIndication", statusmenu, false);
		statusmenu.prefroot.addObserver("extensions.virtualIdentity.storage_storedefault", statusmenu, false);
		statusmenu.prefroot.addObserver("extensions.virtualIdentity.storage_store_base_id", statusmenu, false);
		statusmenu.prefroot.addObserver("extensions.virtualIdentity.storage_store_SMTP", statusmenu, false);
	},
	
	removeObserver: function() {
		statusmenu.prefroot.removeObserver("extensions.virtualIdentity.fcc_show_switch", statusmenu);
		statusmenu.prefroot.removeObserver("extensions.virtualIdentity.doFcc", statusmenu);
		statusmenu.prefroot.removeObserver("extensions.virtualIdentity.storage", statusmenu);
		statusmenu.prefroot.removeObserver("extensions.virtualIdentity.storage_show_switch", statusmenu);
		statusmenu.prefroot.removeObserver("extensions.virtualIdentity.storage_show_baseID_switch", statusmenu);
		statusmenu.prefroot.removeObserver("extensions.virtualIdentity.storage_show_SMTP_switch", statusmenu);
		statusmenu.prefroot.removeObserver("extensions.virtualIdentity.storage_colorIndication", statusmenu);
		statusmenu.prefroot.removeObserver("extensions.virtualIdentity.storage_storedefault", statusmenu);
		statusmenu.prefroot.removeObserver("extensions.virtualIdentity.storage_store_base_id", statusmenu);
		statusmenu.prefroot.removeObserver("extensions.virtualIdentity.storage_store_SMTP", statusmenu);
	},
	
	init : function () {
		statusmenu.prefroot.QueryInterface(Components.interfaces.nsIPrefBranch2);

		statusmenu.objStatusMenu = document.getElementById("vI-status-menu");
		statusmenu.objSaveBaseIDMenuItem = document.getElementById("vI_statusMenu_storage_saveBaseID");
		statusmenu.objSaveSMTPMenuItem = document.getElementById("vI_statusMenu_storage_saveSMTP");
		statusmenu.objStorageSaveMenuItem = document.getElementById("vI_statusMenu_storage_save");
		statusmenu.objStatusMenuSeparator = document.getElementById("vI_statusMenu_separator");
		statusmenu.objSaveSwitch = document.getElementById("saveSwitch");
		statusmenu.objSaveBaseIDSwitch = document.getElementById("saveBaseIDSwitch");
		statusmenu.objSaveSMTPSwitch = document.getElementById("saveSMTPSwitch");
		statusmenu.objFccSwitch = document.getElementById("fcc_switch");
		statusmenu.objStatusText = document.getElementById("statusText");
		statusmenu.objStatusTooltipLine1 = document.getElementById("vI_statusMenuTooltip_StatusValueLine1");
		statusmenu.objStatusTooltipLine2 = document.getElementById("vI_statusMenuTooltip_StatusValueLine2");

		statusmenu.addObserver();
		statusmenu.observe(null, null, "extensions.virtualIdentity.fcc_show_switch");
		statusmenu.observe(null, null, "extensions.virtualIdentity.storage_show_switch");
		statusmenu.observe(null, null, "extensions.virtualIdentity.storage_show_baseID_switch");
		statusmenu.observe(null, null, "extensions.virtualIdentity.storage_show_SMTP_switch");
		statusmenu.observe(null, null, "extensions.virtualIdentity.storage_colorIndication");
		statusmenu.observe(null, null, "extensions.virtualIdentity.storage_store_base_id");
		statusmenu.observe(null, null, "extensions.virtualIdentity.storage_store_SMTP");
		statusmenu.observe(null, null, "extensions.virtualIdentity.storage_storedefault");
		statusmenu.observe(null, null, "extensions.virtualIdentity.storage");
	},
	
	__timeout : 5,	// timeout for status messages in seconds
	__addStatusMessage : function(save, smtp) {
		var sourceString = "vident.statusText.save." + save;
		if (smtp != "off") sourceString = sourceString + ".smtp"
		var messageLine1 = vI.main.elements.strings.getString(sourceString + ".line1");
		var messageLine2 = vI.main.elements.strings.getString(sourceString + ".line2");
		if (!messageLine2) {
			statusmenu.objStatusText.setAttribute("label", messageLine1);
			statusmenu.objStatusTooltipLine1.setAttribute("value", messageLine1);
			statusmenu.objStatusTooltipLine2.setAttribute("hidden", "true");
		}	
		else {
			statusmenu.objStatusText.setAttribute("label", messageLine1 + " " + messageLine2);
			statusmenu.objStatusTooltipLine1.setAttribute("value", messageLine1);
			statusmenu.objStatusTooltipLine2.setAttribute("value", messageLine2);
			statusmenu.objStatusTooltipLine2.removeAttribute("hidden");
		}
		window.setTimeout(virtualIdentityExtension.statusmenu.__clearStatusMessage, statusmenu.__timeout * 1000);
	},

	__clearStatusMessage : function() {
		statusmenu.objStatusText.setAttribute("label", "");
	},

	changeSMTPStatus : function (elem) {
		statusmenu.objSaveSMTPMenuItem.setAttribute("checked", elem.getAttribute("checked"));
		statusmenu.menuConstraint();
	},

	changeBaseIDStatus : function (elem) {
		statusmenu.objSaveBaseIDMenuItem.setAttribute("checked", elem.getAttribute("checked"));
		statusmenu.menuConstraint();
	},

	changeSaveStatus : function (elem) {
		statusmenu.objStorageSaveMenuItem.setAttribute("checked", elem.getAttribute("checked"));
		statusmenu.menuConstraint();
	},

	menuConstraint : function () {
		var save = "off"; var smtp = "off";
		if (statusmenu.objStorageSaveMenuItem.getAttribute("checked") == "true") {
			statusmenu.objSaveSMTPMenuItem.removeAttribute("disabled");
			statusmenu.objSaveBaseIDMenuItem.removeAttribute("disabled");
			if (statusmenu.prefroot.getBoolPref("extensions.virtualIdentity.storage")) {
				if (statusmenu.objSaveBaseIDMenuItem.getAttribute("checked") == "true") save = "base";
				else save = "ok";
				if (statusmenu.objSaveSMTPMenuItem.getAttribute("checked") == "true") smtp = "save";
			}
		}
		else {
			statusmenu.objSaveSMTPMenuItem.setAttribute("disabled", "true");
			statusmenu.objSaveBaseIDMenuItem.setAttribute("disabled", "true");
		}
		statusmenu.objStatusMenu.setAttribute("save", save);
		statusmenu.objStatusMenu.setAttribute("smtp", smtp);
		statusmenu.__addStatusMessage(save, smtp);
	},

	clicked : function (button) {
		if (button != 0) return; // only react on left mouse button
		if (!statusmenu.prefroot.getBoolPref("extensions.virtualIdentity.storage")) return;

		var curSaveStatus = (statusmenu.objStorageSaveMenuItem.getAttribute("checked") == "true");
		var curSaveSMTPStatus = (statusmenu.objSaveSMTPMenuItem.getAttribute("checked") == "true");
		var curSaveBaseIDStatus = (statusmenu.objSaveBaseIDMenuItem.getAttribute("checked") == "true");
		var newSaveStatus = ((!curSaveStatus) || (curSaveStatus && !curSaveSMTPStatus) || (curSaveStatus && !curSaveBaseIDStatus))
		var newSaveSMTPStatus = ((!curSaveSMTPStatus && curSaveStatus) || (curSaveBaseIDStatus && !curSaveSMTPStatus))
		var newSaveBaseIDStatus = ((curSaveSMTPStatus && curSaveStatus && !curSaveBaseIDStatus) || (curSaveBaseIDStatus && !curSaveSMTPStatus))
		statusmenu.objStorageSaveMenuItem.setAttribute("checked", newSaveStatus)
		statusmenu.objSaveSMTPMenuItem.setAttribute("checked", newSaveSMTPStatus)
		statusmenu.objSaveBaseIDMenuItem.setAttribute("checked", newSaveBaseIDStatus)
		
		statusmenu.menuConstraint();
	}
}
vI.statusmenu = statusmenu;
}});