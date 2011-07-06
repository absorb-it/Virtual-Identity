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

    Contributor(s): Thunderbird Developers
 * ***** END LICENSE BLOCK ***** */

var vI_notificationBar = {
	quiet : null,
	timer : null,
	timeout : 5000,
	upgrade : true,
	
	preferences : Components.classes["@mozilla.org/preferences-service;1"]
		.getService(Components.interfaces.nsIPrefService)
		.getBranch("extensions.virtualIdentity."),
	
	prefroot : Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefService)
			.getBranch(null).QueryInterface(Components.interfaces.nsIPrefBranch2),

	Obj_vINotification : null,
	Obj_DebugBox : null,
	Obj_DebugBoxSplitter : null,
	Obj_DebugBaseID : null,
	
	versionOk : false,
	
	checkVersion : function() {
		// the notification-bar only works from 1.5.0.7 on, else thunderbird segfaults
		const THUNDERBIRD_ID = "{3550f703-e582-4d05-9a08-453d09bdfdc6}";
		if (("@mozilla.org/xre/app-info;1" in Components.classes) &&
			("@mozilla.org/xpcom/version-comparator;1" in Components.classes)) {
			var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
				.getService(Components.interfaces.nsIXULAppInfo);
			var appID = appInfo.ID
			var appVersion = appInfo.version
			var versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
				.getService(Components.interfaces.nsIVersionComparator);
			if (appID != THUNDERBIRD_ID || versionChecker.compare(appVersion, "1.5.0.7") >= 0)
				vI_notificationBar.versionOk = true
		}
	},

	observe: function() {
		var showDebugArea = vI_notificationBar.preferences.getBoolPref("debug_notification")
		vI_notificationBar.Obj_DebugBox.setAttribute("hidden", !showDebugArea)
		vI_notificationBar.Obj_DebugBoxSplitter.setAttribute("hidden", !showDebugArea)
		if (vI_notificationBar.Obj_DebugBaseID) vI_notificationBar.Obj_DebugBaseID.setAttribute("base_id_key_hidden", !showDebugArea)
	},
	
	addObserver: function() {
		vI_notificationBar.prefroot.addObserver("extensions.virtualIdentity.debug_notification", vI_notificationBar, false);
	},
	
	removeObserver: function() {
		vI_notificationBar.prefroot.removeObserver("extensions.virtualIdentity.debug_notification", vI_notificationBar);
	},

	init : function() {
		vI_notificationBar.Obj_DebugBox = document.getElementById("vIDebugBox");
		if (!vI_notificationBar.Obj_DebugBox) return false;
		vI_notificationBar.upgrade = vI_notificationBar.Obj_DebugBox.getAttribute("upgrade")

		// nothing else to do for the upgrade dialog
		if (vI_notificationBar.upgrade) return true;
		
		vI_notificationBar.Obj_vINotification = document.getElementById("vINotification");
		vI_notificationBar.Obj_DebugBoxSplitter = document.getElementById("vIDebugBoxSplitter");
		vI_notificationBar.Obj_DebugBaseID = document.getElementById("msgIdentity_clone");
		
		vI_notificationBar.addObserver();
		vI_notificationBar.observe();
		vI_notificationBar.checkVersion();
		vI_notificationBar.dump_app_version();

		return true;
	},
	
	clear : function() {
		if (!vI_notificationBar.Obj_vINotification) return;
		if (vI_notificationBar.timer) window.clearTimeout(vI_notificationBar.timer);
		vI_notificationBar.timer = null;
		vI_notificationBar.Obj_vINotification.removeAllNotifications(true);
	},
	
	clear_dump : function() {
		if (!vI_notificationBar.Obj_DebugBox) return;
		var new_DebugBox = vI_notificationBar.Obj_DebugBox.cloneNode(false);
		vI_notificationBar.Obj_DebugBox.parentNode.replaceChild(
			new_DebugBox, vI_notificationBar.Obj_DebugBox);
		vI_notificationBar.Obj_DebugBox = new_DebugBox;
		vI_notificationBar.dump_app_version();
	},
	
	// copied and adapted from nightly tester tools from Dave Townsend (http://www.oxymoronical.com/web/firefox/nightly)
	__getExtensionList: function(callback) {
		Components.utils.import("resource://gre/modules/AddonManager.jsm");  

		AddonManager.getAllAddons(function(addons) {
		
		var strings = addons.map(function(addon) {
			return "addon: " + addon.name + " " + addon.version
			+ (addon.userDisabled || addon.appDisabled ? " [DISABLED]" : "");
		});
		
		try { callback(strings.join("\n")) } catch(e) {};
		});
	},
	
	dump_app_version : function(note) {
		// add some information about the mail-client and the extensions installed
		if ("@mozilla.org/xre/app-info;1" in Components.classes) {
			var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
				.getService(Components.interfaces.nsIXULAppInfo);
			var protohandler = Components.classes["@mozilla.org/network/protocol;1?name=http"]
				.getService(Components.interfaces.nsIHttpProtocolHandler);
			vI_notificationBar.__dumpDebugBox(appInfo.name + " " + appInfo.version + " (" + appInfo.appBuildID + "; " + protohandler.oscpu + ")\n")
		}
		else vI_notificationBar.__dumpDebugBox("mail-client seems not supported by Virtual Identity Extension")
		
		vI_notificationBar.__getExtensionList(vI_notificationBar.__dumpDebugBox)

// 		vI_notificationBar.__dumpDebugBox(output + "\n")

		vI_notificationBar.__dumpDebugBox("--------------------------------------------------------------------------------\n")
	},
	
	dump : function(note) {
		if (!vI_notificationBar.Obj_DebugBox) vI_notificationBar.init()
		if (!vI_notificationBar.preferences.getBoolPref("debug_notification") &&
			!vI_notificationBar.upgrade) return;
		dump(note); vI_notificationBar.__dumpDebugBox(note);
	},

	__dumpDebugBox : function(note) {
		if ((!vI_notificationBar.preferences.getBoolPref("debug_notification") &&
			!vI_notificationBar.upgrade) ||
			vI_notificationBar.quiet) return;
		if (!vI_notificationBar.Obj_DebugBox &&
			!vI_notificationBar.init()) return;

		var new_text = document.createTextNode(note);
		var new_br = document.createElementNS("http://www.w3.org/1999/xhtml", 'br');
		vI_notificationBar.Obj_DebugBox.inputField.appendChild(new_text);
		vI_notificationBar.Obj_DebugBox.inputField.appendChild(new_br);
		vI_notificationBar.Obj_DebugBox.inputField.scrollTop = 
			vI_notificationBar.Obj_DebugBox.inputField.scrollHeight -
			vI_notificationBar.Obj_DebugBox.inputField.clientHeight
	},
	
	setNote: function(note, prefstring, title) {
		vI_notificationBar.clear();
		vI_notificationBar.addNote(note, prefstring, title);
	},

	overflow : function(elem) {
		// height will be cut off from messagepane (in 3pane window)
		var objMessagepane = document.getElementById("messagepane");
		var maxHeight = (objMessagepane)?parseInt(objMessagepane.boxObject.height / 2)+1:null;
		if (maxHeight < 60) maxHeight = 60; // set a minimum size, if to small scrollbars are hidden
		var tooBig = (maxHeight)?(elem.inputField.scrollHeight > maxHeight):false;
		var newHeight = (tooBig)?maxHeight:elem.inputField.scrollHeight;
		elem.height = newHeight;
		// give the box a frame if it is to big
		if (tooBig) document.getElementById("vINotificationTextbox").setAttribute("class", "plain border")
	},

	__setTitle: function(title) {
		if (!title) return;
// 		vI_notificationBar.dump("** setTitle: " + title + "\n");
		var Obj_vINotificationTitle = document.getElementById("vINotificationTitle");
		Obj_vINotificationTitle.setAttribute("value", title);
		Obj_vINotificationTitle.removeAttribute("hidden");
	},

	addNote: function(note, prefstring, title) {
// 		vI_notificationBar.dump("** " + note + "\n\n");
		if (!vI_notificationBar.preferences.getBoolPref(prefstring)) return;
		if (!vI_notificationBar.Obj_vINotification) vI_notificationBar.init();
		if (!vI_notificationBar.Obj_vINotification) return;
		if (!vI_notificationBar.versionOk) return;
		var oldNotification = vI_notificationBar.Obj_vINotification.currentNotification
		var newLabel = (oldNotification)?oldNotification.label + note:note;
		vI_notificationBar.clear();
		vI_notificationBar.Obj_vINotification
				.appendNotification(newLabel, "", "chrome://messenger/skin/icons/flag.png");
		vI_notificationBar.__setTitle(title);

		if (vI_notificationBar.preferences.getIntPref("notification_timeout") != 0)
			vI_notificationBar.timer = window.setTimeout(vI_notificationBar.clear,
				vI_notificationBar.preferences.getIntPref("notification_timeout") * 1000);
	}
}
window.addEventListener("unload", function(e) { try {vI_notificationBar.removeObserver();} catch (ex) { } }, false);
