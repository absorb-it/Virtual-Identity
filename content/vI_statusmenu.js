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

let Log = vI.setupLogging("virtualIdentity.statusmenu");

Components.utils.import("resource://v_identity/vI_prefs.js", virtualIdentityExtension);

var statusmenu = {
    stringBundle : Components.classes["@mozilla.org/intl/stringbundle;1"]
        .getService(Components.interfaces.nsIStringBundleService)
        .createBundle("chrome://v_identity/locale/v_identity.properties"),

    objStatusMenu : null,
	objSaveBaseIDMenuItem : null,
	objStorageSaveMenuItem : null,
	objStatusMenuSeparator : null,
	objSaveSwitch : null,
	objSaveBaseIDSwitch : null,
	objSaveSMTPSwitch : null,
	objFccSwitch : null,
	objStatusText : null,
	
	observe: function(self, subject, topic, data) {
//         Log.debug("statusmenu observe " + data + "\n");
		switch (data) {
			case "fcc_show_switch":
				statusmenu.objFccSwitch.setAttribute("hidden", !vI.vIprefs.get(data));
				// no break, continue like with doFcc			
			case "doFcc":
				statusmenu.objFccSwitch.setAttribute("checked", vI.vIprefs.get(data));
				break;
			case "storage_show_switch":
				statusmenu.objSaveSwitch.setAttribute("hidden", !vI.vIprefs.get(data));
				break;
			case "storage_show_baseID_switch":
				statusmenu.objSaveBaseIDSwitch.setAttribute("hidden", !vI.vIprefs.get(data));
				break;
			case "storage_show_SMTP_switch":
//                 Log.debug("changed storage_show_SMTP_switch to " + statusmenu.objSaveSMTPMenuItem + "=" + vI.vIprefs.get(data) + "\n");
				statusmenu.objSaveSMTPSwitch.setAttribute("hidden", !vI.vIprefs.get(data));
				break;
			case "storage_store":
				statusmenu.objStorageSaveMenuItem.setAttribute("checked", vI.vIprefs.get(data));
				break;
			case "storage_store_base_id":
				statusmenu.objSaveBaseIDMenuItem.setAttribute("checked", vI.vIprefs.get(data));
				break;
			case "storage_store_SMTP":
//                 Log.debug("changed storage_store_SMTP to " + statusmenu.objSaveSMTPMenuItem + "=" + vI.vIprefs.get(data) + "\n");
				statusmenu.objSaveSMTPMenuItem.setAttribute("checked", vI.vIprefs.get(data));
//                 Log.debug("changed storage_store_SMTP done\n");
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
		vI.vIprefs.addObserver("fcc_show_switch", this.observe, this);
		vI.vIprefs.addObserver("doFcc", this.observe, this);
		vI.vIprefs.addObserver("storage", this.observe, this);
		vI.vIprefs.addObserver("storage_show_switch", this.observe, this);
		vI.vIprefs.addObserver("storage_show_baseID_switch", this.observe, this);
		vI.vIprefs.addObserver("storage_show_SMTP_switch", this.observe, this);
		vI.vIprefs.addObserver("storage_colorIndication", this.observe, this);
		vI.vIprefs.addObserver("storage_store", this.observe, this);
		vI.vIprefs.addObserver("storage_store_base_id", this.observe, this);
		vI.vIprefs.addObserver("storage_store_SMTP", this.observe, this);
	},
	
	removeObserver: function() {
		vI.vIprefs.removeObserver("fcc_show_switch", this.observe);
		vI.vIprefs.removeObserver("doFcc", this.observe);
		vI.vIprefs.removeObserver("storage", this.observe);
		vI.vIprefs.removeObserver("storage_show_switch", this.observe);
		vI.vIprefs.removeObserver("storage_show_baseID_switch", this.observe);
		vI.vIprefs.removeObserver("storage_show_SMTP_switch", this.observe);
		vI.vIprefs.removeObserver("storage_colorIndication", this.observe);
		vI.vIprefs.removeObserver("storage_store", this.observe);
		vI.vIprefs.removeObserver("storage_store_base_id", this.observe);
		vI.vIprefs.removeObserver("storage_store_SMTP", this.observe);
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
		statusmenu.observe(this, null, null, "fcc_show_switch");
		statusmenu.observe(this, null, null, "storage_show_switch");
		statusmenu.observe(this, null, null, "storage_show_baseID_switch");
		statusmenu.observe(this, null, null, "storage_show_SMTP_switch");
		statusmenu.observe(this, null, null, "storage_colorIndication");
		statusmenu.observe(this, null, null, "storage_store_base_id");
		statusmenu.observe(this, null, null, "storage_store_SMTP");
		statusmenu.observe(this, null, null, "storage_store");
		statusmenu.observe(this, null, null, "storage");
	},
	
	__timeout : 5,	// timeout for status messages in seconds
	__addStatusMessage : function(save, smtp) {
		var sourceString = "vident.statusText.save." + save;
		if (smtp != "off") sourceString = sourceString + ".smtp"
		var messageLine1 = statusmenu.stringBundle.GetStringFromName(sourceString + ".line1");
		var messageLine2 = statusmenu.stringBundle.GetStringFromName(sourceString + ".line2");
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

		var curSaveStatus = vI.vIprefs.get("storage_store")
		var curSaveSMTPStatus = vI.vIprefs.get("storage_store_SMTP")
		var curSaveBaseIDStatus = vI.vIprefs.get("storage_store_base_id")
		var newSaveStatus = ((!curSaveStatus) || (curSaveStatus && !curSaveSMTPStatus) || (curSaveStatus && !curSaveBaseIDStatus))
		var newSaveSMTPStatus = ((!curSaveSMTPStatus && curSaveStatus) || (curSaveBaseIDStatus && !curSaveSMTPStatus))
		var newSaveBaseIDStatus = ((curSaveSMTPStatus && curSaveStatus && !curSaveBaseIDStatus) || (curSaveBaseIDStatus && !curSaveSMTPStatus))
        
		vI.vIprefs.set("storage_store", newSaveStatus)
        vI.vIprefs.set("storage_store_SMTP", newSaveSMTPStatus)
        vI.vIprefs.set("storage_store_base_id", newSaveBaseIDStatus)
		
		statusmenu.menuConstraint();
	}
}
vI.statusmenu = statusmenu;
}});