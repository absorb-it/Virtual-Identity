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

var vI_statusmenu = {
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
				vI_statusmenu.objFccSwitch.setAttribute("hidden", !vI_statusmenu.prefroot.getBoolPref(data));
				// no break, continue like with doFcc			
			case "extensions.virtualIdentity.doFcc":
				vI_statusmenu.objFccSwitch.setAttribute("checked", vI_statusmenu.prefroot.getBoolPref("extensions.virtualIdentity.doFcc"));
				break;
			case "extensions.virtualIdentity.storage_show_switch":
				vI_statusmenu.objSaveSwitch.setAttribute("hidden", !vI_statusmenu.prefroot.getBoolPref(data));
				break;
			case "extensions.virtualIdentity.storage_show_baseID_switch":
				vI_statusmenu.objSaveBaseIDSwitch.setAttribute("hidden", !vI_statusmenu.prefroot.getBoolPref(data));
				break;
			case "extensions.virtualIdentity.storage_show_SMTP_switch":
				vI_statusmenu.objSaveSMTPSwitch.setAttribute("hidden", !vI_statusmenu.prefroot.getBoolPref(data));
				break;
			case "extensions.virtualIdentity.storage_storedefault":
				vI_statusmenu.objStorageSaveMenuItem.setAttribute("checked", vI_statusmenu.prefroot.getBoolPref("extensions.virtualIdentity.storage_storedefault"));
				break;
			case "extensions.virtualIdentity.storage_store_base_id":
				vI_statusmenu.objSaveBaseIDMenuItem.setAttribute("checked", vI_statusmenu.prefroot.getBoolPref(data));
				break;
			case "extensions.virtualIdentity.storage_store_SMTP":
				vI_statusmenu.objSaveSMTPMenuItem.setAttribute("checked", vI_statusmenu.prefroot.getBoolPref(data));
				break;
			case "extensions.virtualIdentity.storage_colorIndication":
				document.getElementById("identityHbox").setAttribute("colorize", vI_statusmenu.prefroot.getBoolPref(data))
				document.getElementById("baseIDHbox").setAttribute("colorize", vI_statusmenu.prefroot.getBoolPref(data))
				document.getElementById("smtpServerHbox").setAttribute("colorize", vI_statusmenu.prefroot.getBoolPref(data))
				break;
			case "extensions.virtualIdentity.storage":
				if (vI_statusmenu.prefroot.getBoolPref(data)) {
					vI_statusmenu.objStorageSaveMenuItem.removeAttribute("hidden");
					vI_statusmenu.objSaveBaseIDMenuItem.removeAttribute("hidden");
					vI_statusmenu.objStatusMenuSeparator.removeAttribute("hidden");
				}
				else {
					vI_statusmenu.objStorageSaveMenuItem.setAttribute("hidden", "true");
					vI_statusmenu.objSaveBaseIDMenuItem.setAttribute("hidden", "true");
					vI_statusmenu.objStatusMenuSeparator.setAttribute("hidden", "true");
				}
				break;
		}
		vI_statusmenu.menuConstraint(vI_statusmenu.objStorageSaveMenuItem);
	},
	
	addObserver: function() {
		vI_statusmenu.prefroot.addObserver("extensions.virtualIdentity.fcc_show_switch", vI_statusmenu, false);
		vI_statusmenu.prefroot.addObserver("extensions.virtualIdentity.doFcc", vI_statusmenu, false);
		vI_statusmenu.prefroot.addObserver("extensions.virtualIdentity.storage", vI_statusmenu, false);
		vI_statusmenu.prefroot.addObserver("extensions.virtualIdentity.storage_show_switch", vI_statusmenu, false);
		vI_statusmenu.prefroot.addObserver("extensions.virtualIdentity.storage_show_baseID_switch", vI_statusmenu, false);
		vI_statusmenu.prefroot.addObserver("extensions.virtualIdentity.storage_show_SMTP_switch", vI_statusmenu, false);
		vI_statusmenu.prefroot.addObserver("extensions.virtualIdentity.storage_colorIndication", vI_statusmenu, false);
		vI_statusmenu.prefroot.addObserver("extensions.virtualIdentity.storage_storedefault", vI_statusmenu, false);
		vI_statusmenu.prefroot.addObserver("extensions.virtualIdentity.storage_store_base_id", vI_statusmenu, false);
		vI_statusmenu.prefroot.addObserver("extensions.virtualIdentity.storage_store_SMTP", vI_statusmenu, false);
	},
	
	removeObserver: function() {
		vI_statusmenu.prefroot.removeObserver("extensions.virtualIdentity.fcc_show_switch", vI_statusmenu);
		vI_statusmenu.prefroot.removeObserver("extensions.virtualIdentity.doFcc", vI_statusmenu);
		vI_statusmenu.prefroot.removeObserver("extensions.virtualIdentity.storage", vI_statusmenu);
		vI_statusmenu.prefroot.removeObserver("extensions.virtualIdentity.storage_show_switch", vI_statusmenu);
		vI_statusmenu.prefroot.removeObserver("extensions.virtualIdentity.storage_show_baseID_switch", vI_statusmenu);
		vI_statusmenu.prefroot.removeObserver("extensions.virtualIdentity.storage_show_SMTP_switch", vI_statusmenu);
		vI_statusmenu.prefroot.removeObserver("extensions.virtualIdentity.storage_colorIndication", vI_statusmenu);
		vI_statusmenu.prefroot.removeObserver("extensions.virtualIdentity.storage_storedefault", vI_statusmenu);
		vI_statusmenu.prefroot.removeObserver("extensions.virtualIdentity.storage_store_base_id", vI_statusmenu);
		vI_statusmenu.prefroot.removeObserver("extensions.virtualIdentity.storage_store_SMTP", vI_statusmenu);
	},
	
	init : function () {
		vI_statusmenu.prefroot.QueryInterface(Components.interfaces.nsIPrefBranch2);

		vI_statusmenu.objStatusMenu = document.getElementById("vI-status-menu");
		vI_statusmenu.objSaveBaseIDMenuItem = document.getElementById("vI_statusMenu_storage_saveBaseID");
		vI_statusmenu.objSaveSMTPMenuItem = document.getElementById("vI_statusMenu_storage_saveSMTP");
		vI_statusmenu.objStorageSaveMenuItem = document.getElementById("vI_statusMenu_storage_save");
		vI_statusmenu.objStatusMenuSeparator = document.getElementById("vI_statusMenu_separator");
		vI_statusmenu.objSaveSwitch = document.getElementById("saveSwitch");
		vI_statusmenu.objSaveBaseIDSwitch = document.getElementById("saveBaseIDSwitch");
		vI_statusmenu.objSaveSMTPSwitch = document.getElementById("saveSMTPSwitch");
		vI_statusmenu.objFccSwitch = document.getElementById("fcc_switch");
		vI_statusmenu.objStatusText = document.getElementById("statusText");
		vI_statusmenu.objStatusTooltipLine1 = document.getElementById("vI_statusMenuTooltip_StatusValueLine1");
		vI_statusmenu.objStatusTooltipLine2 = document.getElementById("vI_statusMenuTooltip_StatusValueLine2");

		vI_statusmenu.addObserver();
		vI_statusmenu.observe(null, null, "extensions.virtualIdentity.fcc_show_switch");
		vI_statusmenu.observe(null, null, "extensions.virtualIdentity.storage_show_switch");
		vI_statusmenu.observe(null, null, "extensions.virtualIdentity.storage_show_baseID_switch");
		vI_statusmenu.observe(null, null, "extensions.virtualIdentity.storage_show_SMTP_switch");
		vI_statusmenu.observe(null, null, "extensions.virtualIdentity.storage_colorIndication");
		vI_statusmenu.observe(null, null, "extensions.virtualIdentity.storage_store_base_id");
		vI_statusmenu.observe(null, null, "extensions.virtualIdentity.storage_store_SMTP");
		vI_statusmenu.observe(null, null, "extensions.virtualIdentity.storage_storedefault");
		vI_statusmenu.observe(null, null, "extensions.virtualIdentity.storage");
	},
	
	__timeout : 5,	// timeout for status messages in seconds
	__addStatusMessage : function(save, smtp) {
		var sourceString = "vident.statusText.save." + save;
		if (smtp != "off") sourceString = sourceString + ".smtp"
		var messageLine1 = vI.elements.strings.getString(sourceString + ".line1");
		var messageLine2 = vI.elements.strings.getString(sourceString + ".line2");
		if (!messageLine2) {
			vI_statusmenu.objStatusText.setAttribute("label", messageLine1);
			vI_statusmenu.objStatusTooltipLine1.setAttribute("value", messageLine1);
			vI_statusmenu.objStatusTooltipLine2.setAttribute("hidden", "true");
		}	
		else {
			vI_statusmenu.objStatusText.setAttribute("label", messageLine1 + " " + messageLine2);
			vI_statusmenu.objStatusTooltipLine1.setAttribute("value", messageLine1);
			vI_statusmenu.objStatusTooltipLine2.setAttribute("value", messageLine2);
			vI_statusmenu.objStatusTooltipLine2.removeAttribute("hidden");
		}
		window.setTimeout(vI_statusmenu.__clearStatusMessage, vI_statusmenu.__timeout * 1000);
	},

	__clearStatusMessage : function() {
		vI_statusmenu.objStatusText.setAttribute("label", "");
	},

	changeSMTPStatus : function (elem) {
		vI_statusmenu.objSaveSMTPMenuItem.setAttribute("checked", elem.getAttribute("checked"));
		vI_statusmenu.menuConstraint();
	},

	changeBaseIDStatus : function (elem) {
		vI_statusmenu.objSaveBaseIDMenuItem.setAttribute("checked", elem.getAttribute("checked"));
		vI_statusmenu.menuConstraint();
	},

	changeSaveStatus : function (elem) {
		vI_statusmenu.objStorageSaveMenuItem.setAttribute("checked", elem.getAttribute("checked"));
		vI_statusmenu.menuConstraint();
	},

	menuConstraint : function () {
		var save = "off"; var smtp = "off";
		if (vI_statusmenu.objStorageSaveMenuItem.getAttribute("checked") == "true") {
			vI_statusmenu.objSaveSMTPMenuItem.removeAttribute("disabled");
			vI_statusmenu.objSaveBaseIDMenuItem.removeAttribute("disabled");
			if (vI_statusmenu.prefroot.getBoolPref("extensions.virtualIdentity.storage")) {
				if (vI_statusmenu.objSaveBaseIDMenuItem.getAttribute("checked") == "true") save = "base";
				else save = "ok";
				if (vI_statusmenu.objSaveSMTPMenuItem.getAttribute("checked") == "true") smtp = "save";
			}
		}
		else {
			vI_statusmenu.objSaveSMTPMenuItem.setAttribute("disabled", "true");
			vI_statusmenu.objSaveBaseIDMenuItem.setAttribute("disabled", "true");
		}
		vI_statusmenu.objStatusMenu.setAttribute("save", save);
		vI_statusmenu.objStatusMenu.setAttribute("smtp", smtp);
		vI_statusmenu.__addStatusMessage(save, smtp);
	},

	clicked : function (button) {
		if (button != 0) return; // only react on left mouse button
		if (!vI_statusmenu.prefroot.getBoolPref("extensions.virtualIdentity.storage")) return;

		var curSaveStatus = (vI_statusmenu.objStorageSaveMenuItem.getAttribute("checked") == "true");
		var curSaveSMTPStatus = (vI_statusmenu.objSaveSMTPMenuItem.getAttribute("checked") == "true");
		var curSaveBaseIDStatus = (vI_statusmenu.objSaveBaseIDMenuItem.getAttribute("checked") == "true");
		var newSaveStatus = ((!curSaveStatus) || (curSaveStatus && !curSaveSMTPStatus) || (curSaveStatus && !curSaveBaseIDStatus))
		var newSaveSMTPStatus = ((!curSaveSMTPStatus && curSaveStatus) || (curSaveBaseIDStatus && !curSaveSMTPStatus))
		var newSaveBaseIDStatus = ((curSaveSMTPStatus && curSaveStatus && !curSaveBaseIDStatus) || (curSaveBaseIDStatus && !curSaveSMTPStatus))
		vI_statusmenu.objStorageSaveMenuItem.setAttribute("checked", newSaveStatus)
		vI_statusmenu.objSaveSMTPMenuItem.setAttribute("checked", newSaveSMTPStatus)
		vI_statusmenu.objSaveBaseIDMenuItem.setAttribute("checked", newSaveBaseIDStatus)
		
		vI_statusmenu.menuConstraint();
	}
}
