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

virtualIdentityExtension.ns(function() { with (virtualIdentityExtension.LIB) {
var notificationBar = {
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
	
	observe: function() {
		var showDebugArea = notificationBar.preferences.getBoolPref("debug_notification")
		notificationBar.Obj_DebugBox.setAttribute("hidden", !showDebugArea)
		notificationBar.Obj_DebugBoxSplitter.setAttribute("hidden", !showDebugArea)
		if (notificationBar.Obj_DebugBaseID) notificationBar.Obj_DebugBaseID.setAttribute("base_id_key_hidden", !showDebugArea)
	},
	
	addObserver: function() {
		notificationBar.prefroot.addObserver("extensions.virtualIdentity.debug_notification", notificationBar, false);
	},
	
	removeObserver: function() {
		notificationBar.prefroot.removeObserver("extensions.virtualIdentity.debug_notification", notificationBar);
	},

	init : function() {
		notificationBar.Obj_DebugBox = document.getElementById("vIDebugBox");
		if (!notificationBar.Obj_DebugBox) return false;
		notificationBar.upgrade = notificationBar.Obj_DebugBox.getAttribute("upgrade")

		// nothing else to do for the upgrade dialog
		if (notificationBar.upgrade) return true;
		
		notificationBar.Obj_vINotification = document.getElementById("vINotification");
		notificationBar.Obj_DebugBoxSplitter = document.getElementById("vIDebugBoxSplitter");
		notificationBar.Obj_DebugBaseID = document.getElementById("msgIdentity_clone");
		
		notificationBar.addObserver();
		notificationBar.observe();
		notificationBar.dump_app_version();

		return true;
	},
	
	clear : function() {
		if (!notificationBar.Obj_vINotification) return;
		if (notificationBar.timer) window.clearTimeout(notificationBar.timer);
		notificationBar.timer = null;
		notificationBar.Obj_vINotification.removeAllNotifications(true);
	},
	
	clear_dump : function() {
		if (!notificationBar.Obj_DebugBox) return;
		var new_DebugBox = notificationBar.Obj_DebugBox.cloneNode(false);
		notificationBar.Obj_DebugBox.parentNode.replaceChild(
			new_DebugBox, notificationBar.Obj_DebugBox);
		notificationBar.Obj_DebugBox = new_DebugBox;
		notificationBar.dump_app_version();
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
			notificationBar.__dumpDebugBox(appInfo.name + " " + appInfo.version + " (" + appInfo.appBuildID + "; " + protohandler.oscpu + ")\n")
		}
		else notificationBar.__dumpDebugBox("mail-client seems not supported by Virtual Identity Extension")
		
		notificationBar.__getExtensionList(notificationBar.__dumpDebugBox)

// 		notificationBar.__dumpDebugBox(output + "\n")

		notificationBar.__dumpDebugBox("--------------------------------------------------------------------------------\n")
	},
	
	dump : function(note) {
		if (!notificationBar.Obj_DebugBox) notificationBar.init()
		if (!notificationBar.preferences.getBoolPref("debug_notification") &&
			!notificationBar.upgrade) return;
		dump(note); notificationBar.__dumpDebugBox(note);
	},

	__dumpDebugBox : function(note) {
		if ((!notificationBar.preferences.getBoolPref("debug_notification") &&
			!notificationBar.upgrade) ||
			notificationBar.quiet) return;
		if (!notificationBar.Obj_DebugBox &&
			!notificationBar.init()) return;

		var new_text = document.createTextNode(note);
		var new_br = document.createElementNS("http://www.w3.org/1999/xhtml", 'br');
		notificationBar.Obj_DebugBox.inputField.appendChild(new_text);
		notificationBar.Obj_DebugBox.inputField.appendChild(new_br);
		notificationBar.Obj_DebugBox.inputField.scrollTop = 
			notificationBar.Obj_DebugBox.inputField.scrollHeight -
			notificationBar.Obj_DebugBox.inputField.clientHeight
	},
	
	setNote: function(note, prefstring, title) {
		notificationBar.clear();
		notificationBar.addNote(note, prefstring, title);
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
// 		notificationBar.dump("** setTitle: " + title + "\n");
		var Obj_vINotificationTitle = document.getElementById("vINotificationTitle");
		Obj_vINotificationTitle.setAttribute("value", title);
		Obj_vINotificationTitle.removeAttribute("hidden");
	},

	addNote: function(note, prefstring, title) {
// 		notificationBar.dump("** " + note + "\n\n");
		if (!notificationBar.preferences.getBoolPref(prefstring)) return;
		if (!notificationBar.Obj_vINotification) notificationBar.init();
		if (!notificationBar.Obj_vINotification) return;
		var oldNotification = notificationBar.Obj_vINotification.currentNotification
		var newLabel = (oldNotification)?oldNotification.label + note:note;
		notificationBar.clear();
		notificationBar.Obj_vINotification
				.appendNotification(newLabel, "", "chrome://messenger/skin/icons/flag.png");
		notificationBar.__setTitle(title);

		if (notificationBar.preferences.getIntPref("notification_timeout") != 0)
			notificationBar.timer = window.setTimeout(virtualIdentityExtension.notificationBar.clear,
				notificationBar.preferences.getIntPref("notification_timeout") * 1000);
	}
}
window.addEventListener("unload", function(e) { try {notificationBar.removeObserver();} catch (ex) { } }, false);
vI.notificationBar = notificationBar;	
}});