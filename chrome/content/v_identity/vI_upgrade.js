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
var upgrade = {
	preferences : Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefService)
			.getBranch("extensions.virtualIdentity."),
			
	versionChecker : Components.classes["@mozilla.org/xpcom/version-comparator;1"]
			.getService(Components.interfaces.nsIVersionComparator),
    
    rdfDatasource : null,

	init : function() {
		upgrade.__initRequirements();
		document.documentElement.getButton("cancel").setAttribute("hidden", "true")
	},

    clean : function() {
        if (upgrade.rdfDatasource) upgrade.rdfDatasource.clean();
    },

    __initRequirements : function() {
		vI.notificationBar.dump("") // this initialises the debug-area
		upgrade.rdfDatasource = new vI.rdfDatasource("virtualIdentity.rdf", true);
	},
	
	// this function checks for the chance to ugrade without shoing the complete wizard
	// if so, perform the upgrade and return true
	// by default the wizard is not shown if it is a one-version-forward upgrade
	quick_upgrade : function(currentVersion) {
		// seamonkey doesn't have a extensionmanager, so read version of extension from hidden version-label
		if (!currentVersion) return false;
		currentVersion = currentVersion.split(/\./);
		var nextVersion = currentVersion[0] + "." + currentVersion[1] + "."
		if (currentVersion[2].match(/pre/))
		 	nextVersion += parseInt(currentVersion[2])
		else nextVersion += parseInt(currentVersion[2]) + 1
		var extVersion = document.getElementById("extVersion").getAttribute("value");
				
		// don't show the dialog if we do a one-step upgrade
		if (upgrade.versionChecker.compare(extVersion, nextVersion) <= 0) {
			vI.notificationBar.dump("starting quick_upgrade.\n")
			upgrade.__initRequirements();
			upgrade.__upgrade();
			return true;
		}
		return false;
	},

	prepare : function(elem) {
		document.documentElement.getButton('back').setAttribute('hidden','true');
		document.documentElement.getButton('next').focus();
		var pageid = elem.getAttribute("pageid");
		var browser = document.getElementById('vITextBox.' + pageid)
		if (browser) 
			browser.outputString =
		    		document.getElementById('vITextBoxBundle').getString('vident.' + pageid);
	},
	
	__upgrade : function() {
		if (upgrade.rdfDatasource.extUpgradeRequired()) upgrade.extUpgrade();
		
		vI.account.cleanupSystem();
	},			

	upgrade : function() {
		vI.notificationBar.dump("starting upgrade.\n\n")
		document.getElementById("upgradeWizard").setAttribute("canAdvance", "false")
		document.documentElement.getButton('next').setAttribute('disabled','true');
		
		upgrade.__upgrade();
	
		vI.notificationBar.dump("\n\nupgrade finished.\n");
		
		document.documentElement.getButton('next').setAttribute('disabled','false');
		document.getElementById("upgradeWizard").setAttribute("canAdvance", "true")
	},
	
	extUpgrade : function() {
		var currentVersion = upgrade.rdfDatasource.getCurrentExtFileVersion();
		vI.notificationBar.dump("checking for previous version, found " + 
			currentVersion + "\nextension-upgrade required.\n")
		switch (currentVersion) {
			case null:
				// no break
			default:
				upgrade.__transferMovedUserPrefs(currentVersion);
				upgrade.__removeObsoleteUserPrefs(currentVersion);
                upgrade.__removeExtraAddedHeaders(currentVersion);
		}
		upgrade.rdfDatasource.storeExtVersion();
		vI.notificationBar.dump("extension-upgrade to " + upgrade.rdfDatasource.getCurrentExtFileVersion() + " done.\n\n");
	},
    
    __removeExtraAddedHeaders : function(currentVersion) {
        var prefroot = Components.classes["@mozilla.org/preferences-service;1"]
            .getService(Components.interfaces.nsIPrefService)
            .getBranch(null);
        
        vI.notificationBar.dump("extension-upgrade __removeExtraAddedHeaders " + currentVersion + "\n");
        if ((!currentVersion || upgrade.versionChecker.compare(currentVersion, "0.6.9") < 0) && 
                prefroot.getCharPref("mailnews.headers.extraExpandedHeaders") != "") {
            // clean extraExpandedHeaders once, because the whole header-saving and restoring was broken too long
            vI.notificationBar.dump("cleaning extraExpandedHeaders\n");
            prefroot.setCharPref("mailnews.headers.extraExpandedHeaders", "")
            vI.notificationBar.dump("cleaned extraExpandedHeaders\n");
        }
        vI.notificationBar.dump("extension-upgrade __removeExtraAddedHeaders done.\n\n");
    },
    
	__transferMovedUserPrefs : function(currentVersion) {
		// transfer renamed preferences
		var transferPrefs = [ 	{ version : "0.5.3",
					prefs : Array({ sourcePref : "smart_reply_ask", targetPref : "idSelection_ask" },
						{ sourcePref : "smart_reply_ask_always", targetPref : "idSelection_ask_always" },
						{ sourcePref : "smart_reply_autocreate", targetPref : "idSelection_autocreate" },
						{ sourcePref : "smart_timestamp", targetPref : "autoTimestamp" },
						{ sourcePref : "storage_prefer_smart_reply", targetPref : "idSelection_storage_prefer_smart_reply" },
						{ sourcePref : "storage_ignore_smart_reply", targetPref : "idSelection_storage_ignore_smart_reply" }) }];
		// remove obsolete preference-tree virtualIdentity
		for (var i = 0; i < transferPrefs.length; i++) {
			// if former version of extension was at least 0.5.0, start with WizardPage 0.5.2
			if (!currentVersion || (upgrade.versionChecker.compare(currentVersion, transferPrefs[i].version) < 0)) {
				// remove any obsolete preferences under extensions.virtualIdentity
				vI.notificationBar.dump("transfer changed preferences of pre-" + transferPrefs[i].version + " release:\n")
				for each (transferPref in transferPrefs[i].prefs) {
					try {	upgrade.preferences.setBoolPref(transferPref.targetPref, 
							upgrade.preferences.getBoolPref(transferPref.sourcePref));
						upgrade.preferences.clearUserPref(transferPref.sourcePref);
						vI.notificationBar.dump(".") 
					}
					catch (e) { };
				}
				vI.notificationBar.dump("done.\n")
			}
		}
	},
	
	__removeObsoleteUserPrefs : function(currentVersion) {
		var obsoletePrefs = [ 	{ version : "0.5.0",
					prefs : Array("aBook_use", "aBook_storedefault", "aBook_dont_update_multiple",
					"aBook_show_switch", "aBook_warn_update", "aBook_use_for_smart_reply",
					"aBook_prefer_smart_reply", "aBook_ignore_smart_reply", "aBook_warn_vI_replace",
					"aBook_use_non_vI", "aBook_notification", "storeVIdentity", "experimental",
					"storage_use_for_smart_reply") },
					{ version : "0.5.3", prefs : Array("storage_use_for_smart_reply") },
					{ version : "0.5.6", prefs : Array("copyEnigmailSettings") } ];
		// remove obsolete preference-tree virtualIdentity
		for (var i = 0; i < obsoletePrefs.length; i++) {
			// if former version of extension was at least 0.5.0, start with WizardPage 0.5.2
			if (!currentVersion || (upgrade.versionChecker.compare(currentVersion, obsoletePrefs[i].version) < 0)) {
				// remove any obsolete preferences under extensions.virtualIdentity
				vI.notificationBar.dump("removing obsolete preferences of pre-" + obsoletePrefs[i].version + " release:\n")
				for each (pref in obsoletePrefs[i].prefs) {
					try { upgrade.preferences.clearUserPref(pref); vI.notificationBar.dump(".") }
					catch (e) { };
				}
				vI.notificationBar.dump("done.\n")
			}
		}
	},

	openURL : function(aURL) {
            var uri = Components.classes["@mozilla.org/network/standard-url;1"].createInstance(Components.interfaces.nsIURI);
            var protocolSvc = Components.classes["@mozilla.org/uriloader/external-protocol-service;1"].getService(Components.interfaces.nsIExternalProtocolService);

            uri.spec = aURL;
            protocolSvc.loadUrl(uri);
        }
}
vI.upgrade = upgrade;
// start init only if wizard is shown, so it is done in vI_upgrade.xul
// window.addEventListener('load', upgrade.init, true);
}});