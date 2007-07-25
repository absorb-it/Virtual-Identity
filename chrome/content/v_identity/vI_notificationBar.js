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
	
	init : function() {
		vI_notificationBar.Obj_vINotification = document.getElementById("vINotification");
	},
	
	clear : function() {
		// workaround, seems that my usage of notificationbox doesn't display multiple lines
		vI_notificationBar.Obj_vINotification.height = 0;
		vI_notificationBar.Obj_vINotification.removeAllNotifications(false);
	},
	
	dump : function(note) {
		dump(note); // maybe this will be changed later, not by now ;)
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
		if (!vI_notificationBar.preferences.getBoolPref(prefstring)) return;
		if (!vI_notificationBar.Obj_vINotification) vI_notificationBar.init();
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
