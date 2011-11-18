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

Components.utils.import("resource://v_identity/vI_prefs.js", virtualIdentityExtension);

var statusmenu = {
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
			case "fcc_show_switch":
				statusmenu.objFccSwitch.setAttribute("hidden", !vI.vIprefs.get(data));
				// no break, continue like with doFcc			
			case "doFcc":
				statusmenu.objFccSwitch.setAttribute("checked", vI.vIprefs.get("doFcc"));
				break;
			case "storage_show_switch":
				statusmenu.objSaveSwitch.setAttribute("hidden", !vI.vIprefs.get(data));
				break;
			case "storage_show_baseID_switch":
				statusmenu.objSaveBaseIDSwitch.setAttribute("hidden", !vI.vIprefs.get(data));
				break;
			case "storage_show_SMTP_switch":
				statusmenu.objSaveSMTPSwitch.setAttribute("hidden", !vI.vIprefs.get(data));
				break;
			case "storage_storedefault":
				statusmenu.objStorageSaveMenuItem.setAttribute("checked", vI.vIprefs.get("storage_storedefault"));
				break;
			case "storage_store_base_id":
				statusmenu.objSaveBaseIDMenuItem.setAttribute("checked", vI.vIprefs.get(data));
				break;
			case "storage_store_SMTP":
				statusmenu.objSaveSMTPMenuItem.setAttribute("checked", vI.vIprefs.get(data));
				break;
			case "storage_colorIndication":
				document.getElementById("identityHbox").setAttribute("colorize", vI.vIprefs.get(data))
				document.getElementById("baseIDHbox").setAttribute("colorize", vI.vIprefs.get(data))
				document.getElementById("smtpServerHbox").setAttribute("colorize", vI.vIprefs.get(data))
				break;
			case "storage":
				if (vI.vIprefs.get(data)) {
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
		vI.vIprefs.addObserver("fcc_show_switch", statusmenu, false);
		vI.vIprefs.addObserver("doFcc", statusmenu, false);
		vI.vIprefs.addObserver("storage", statusmenu, false);
		vI.vIprefs.addObserver("storage_show_switch", statusmenu, false);
		vI.vIprefs.addObserver("storage_show_baseID_switch", statusmenu, false);
		vI.vIprefs.addObserver("storage_show_SMTP_switch", statusmenu, false);
		vI.vIprefs.addObserver("storage_colorIndication", statusmenu, false);
		vI.vIprefs.addObserver("storage_storedefault", statusmenu, false);
		vI.vIprefs.addObserver("storage_store_base_id", statusmenu, false);
		vI.vIprefs.addObserver("storage_store_SMTP", statusmenu, false);
	},
	
	removeObserver: function() {
		vI.vIprefs.removeObserver("fcc_show_switch", statusmenu);
		vI.vIprefs.removeObserver("doFcc", statusmenu);
		vI.vIprefs.removeObserver("storage", statusmenu);
		vI.vIprefs.removeObserver("storage_show_switch", statusmenu);
		vI.vIprefs.removeObserver("storage_show_baseID_switch", statusmenu);
		vI.vIprefs.removeObserver("storage_show_SMTP_switch", statusmenu);
		vI.vIprefs.removeObserver("storage_colorIndication", statusmenu);
		vI.vIprefs.removeObserver("storage_storedefault", statusmenu);
		vI.vIprefs.removeObserver("storage_store_base_id", statusmenu);
		vI.vIprefs.removeObserver("storage_store_SMTP", statusmenu);
	},
	
	init : function () {
		statusmenu.objStatusMenu = document.getElementById("virtualIdentityExtension_vIStatusMenu");
		statusmenu.objSaveBaseIDMenuItem = document.getElementById("virtualIdentityExtension_statusMenu_storage_saveBaseID");
		statusmenu.objSaveSMTPMenuItem = document.getElementById("virtualIdentityExtension_statusMenu_storage_saveSMTP");
		statusmenu.objStorageSaveMenuItem = document.getElementById("virtualIdentityExtension_statusMenu_storage_save");
		statusmenu.objStatusMenuSeparator = document.getElementById("virtualIdentityExtension_statusMenu_separator");
		statusmenu.objSaveSwitch = document.getElementById("saveSwitch");
		statusmenu.objSaveBaseIDSwitch = document.getElementById("saveBaseIDSwitch");
		statusmenu.objSaveSMTPSwitch = document.getElementById("saveSMTPSwitch");
		statusmenu.objFccSwitch = document.getElementById("virtualIdentityExtension_fccSwitch");
		statusmenu.objStatusText = document.getElementById("statusText");
		statusmenu.objStatusTooltipLine1 = document.getElementById("virtualIdentityExtension_statusMenuTooltip_StatusValueLine1");
		statusmenu.objStatusTooltipLine2 = document.getElementById("virtualIdentityExtension_statusMenuTooltip_StatusValueLine2");

		statusmenu.addObserver();
		statusmenu.observe(null, null, "fcc_show_switch");
		statusmenu.observe(null, null, "storage_show_switch");
		statusmenu.observe(null, null, "storage_show_baseID_switch");
		statusmenu.observe(null, null, "storage_show_SMTP_switch");
		statusmenu.observe(null, null, "storage_colorIndication");
		statusmenu.observe(null, null, "storage_store_base_id");
		statusmenu.observe(null, null, "storage_store_SMTP");
		statusmenu.observe(null, null, "storage_storedefault");
		statusmenu.observe(null, null, "storage");
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
			if (vI.vIprefs.get("storage")) {
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
		if (!vI.vIprefs.get("storage")) return;

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