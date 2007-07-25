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
	timer : null,
	timeout : 5000,
	
	preferences : Components.classes["@mozilla.org/preferences-service;1"]
		.getService(Components.interfaces.nsIPrefService)
		.getBranch("extensions.virtualIdentity."),
	
	Obj_vINotification : null,
	Obj_DebugBox : null,
	
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

	init : function() {
		vI_notificationBar.Obj_vINotification = document.getElementById("vINotification");
		vI_notificationBar.checkVersion();
		if (!vI_notificationBar.preferences.getBoolPref("debug_notification")) return;
		vI_notificationBar.Obj_DebugBox = document.getElementById("vIDebugBox");
		vI_notificationBar.Obj_DebugBox.setAttribute("hidden","false");
		document.getElementById("vIDebugBoxSplitter").setAttribute("hidden","false");
		vI_notificationBar.dump_app_version();
	},
	
	clear : function() {
		// workaround, seems that my usage of notificationbox doesn't display multiple lines
		vI_notificationBar.Obj_vINotification.height = 0;
		vI_notificationBar.Obj_vINotification.removeAllNotifications(false);
	},
	
	clear_dump : function() {
		if (!vI_notificationBar.Obj_DebugBox) return;
		new_DebugBox = vI_notificationBar.Obj_DebugBox.cloneNode(false);
		vI_notificationBar.Obj_DebugBox.parentNode.replaceChild(
			new_DebugBox, vI_notificationBar.Obj_DebugBox);
		vI_notificationBar.Obj_DebugBox = new_DebugBox;
		vI_notificationBar.dump_app_version();
	},
	
	dump_app_version : function(note) {
		// add some information about the mail-client and the extensions installed
		if ("@mozilla.org/xre/app-info;1" in Components.classes) {
			var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
				.getService(Components.interfaces.nsIXULAppInfo);
			var protohandler = Components.classes["@mozilla.org/network/protocol;1?name=http"]
				.getService(Components.interfaces.nsIHttpProtocolHandler);
			vI_notificationBar.dump(appInfo.name + " " + appInfo.version + " (" + appInfo.appBuildID + "; " + protohandler.oscpu + ")\n")
		}
		else vI_notificationBar.dump("mail-client seems not supported by Virtual Identity Extension")
		
		// copied and adapted from nightly tester tools from Dave Townsend (http://www.oxymoronical.com/web/firefox/nightly)
		try { 	var em = Components.classes["@mozilla.org/extensions/manager;1"]
				.getService(Components.interfaces.nsIExtensionManager);
			var items = em.getItemList(Components.interfaces.nsIUpdateItem.TYPE_EXTENSION, {});
			var rdfS = Components.classes["@mozilla.org/rdf/rdf-service;1"].getService(Components.interfaces.nsIRDFService);
			var ds = em.datasource;
			var disabledResource = rdfS.GetResource("http://www.mozilla.org/2004/em-rdf#disabled");
			var isDisabledResource = rdfS.GetResource("http://www.mozilla.org/2004/em-rdf#isDisabled");
			var text = [];
			for (var i=0; i<items.length; i++)
			{
				var output = " - " + items[i].name + " " + items[i].version;
				var source = rdfS.GetResource("urn:mozilla:item:"+items[i].id);
				var disabled = ds.GetTarget(source, disabledResource, true);
				if (!disabled) disabled = ds.GetTarget(source, isDisabledResource, true);
				try {
					disabled=disabled.QueryInterface(Components.interfaces.nsIRDFLiteral);
					if (disabled.Value=="true") output += " [DISABLED]";
				}
				catch (e) { }
				vI_notificationBar.dump(output + "\n")
			}
		}
		catch (e) {};
		vI_notificationBar.dump("--------------------------------------------------------------------------------\n")
	},
	
	dump : function(note) {
		if (!vI_notificationBar.preferences.getBoolPref("debug_notification")) {
			if (!vI_notificationBar.Obj_DebugBox) return;
			vI_notificationBar.Obj_DebugBox.setAttribute("hidden","true");
			document.getElementById("vIDebugBoxSplitter").setAttribute("hidden","true");
			vI_notificationBar.Obj_DebugBox = null;
			return
		}
		dump(note);
		if (!vI_notificationBar.Obj_DebugBox) vI_notificationBar.init();
		if (!vI_notificationBar.Obj_DebugBox) return;
		var new_text = document.createTextNode(note);
		var new_br = document.createElementNS("http://www.w3.org/1999/xhtml", 'br');
		vI_notificationBar.Obj_DebugBox.inputField.appendChild(new_text);
		vI_notificationBar.Obj_DebugBox.inputField.appendChild(new_br);
		vI_notificationBar.Obj_DebugBox.inputField.scrollTop = 
			vI_notificationBar.Obj_DebugBox.inputField.scrollHeight - vI_notificationBar.Obj_DebugBox.inputField.clientHeight
	},
	
	hide : function() {
		vI_notificationBar.timer = null;
		vI_notificationBar.clear()
	},
	
	setNote: function(note, prefstring) {
		if (vI_notificationBar.Obj_vINotification) vI_notificationBar.clear();
		vI_notificationBar.addNote(note, prefstring);
	},
	
	addNote: function(note, prefstring) {
		vI_notificationBar.dump("** " + note + "\n");
		if (!vI_notificationBar.preferences.getBoolPref(prefstring)) return;
		if (!vI_notificationBar.Obj_vINotification) vI_notificationBar.init();
		if (!vI_notificationBar.versionOk) return;
		if (vI_notificationBar.timer) window.clearTimeout(vI_notificationBar.timer);
		var oldNotification = vI_notificationBar.Obj_vINotification.currentNotification
		
		var newNotification;
		if (oldNotification) {
			var oldLabel = oldNotification.label
			vI_notificationBar.clear();
			newNotification = vI_notificationBar.Obj_vINotification
				.appendNotification(oldLabel + note, "", "chrome://messenger/skin/icons/flag.png");
		}
		else newNotification = vI_notificationBar.Obj_vINotification
				.appendNotification(note, "", "chrome://messenger/skin/icons/flag.png");
		
		// workaround, seems that my usage of notificationbox doesn't display multiple lines
		vI_notificationBar.Obj_vINotification.height = newNotification.boxObject.height;
		
		if (vI_notificationBar.preferences.getIntPref("notification_timeout") != 0)
			vI_notificationBar.timer = window.setTimeout(vI_notificationBar.hide,
				vI_notificationBar.preferences.getIntPref("notification_timeout") * 1000);
	},
	
}
