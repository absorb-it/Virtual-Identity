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

vI_upgrade = {
	preferences : Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefService)
			.getBranch("extensions.virtualIdentity."),
			
	init : function() {
		document.documentElement.getButton("cancel").setAttribute("hidden", "true")
		vI_notificationBar.dump("") // this initialises the debug-area
		vI_rdfDatasource.init(); // just to be sure that Datasource is initialised
		vI_upgrade.skipUpgradePages(); // skip obsolete upgrade Pages
	},
		
	skipUpgradePages : function() {
		var preUpdateWizardPage = document.getElementById("license")		
		var versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
			.getService(Components.interfaces.nsIVersionComparator);
		// if former version of extension was at least 0.5.0, start with WizardPage 0.5.2
		if (versionChecker.compare(vI_rdfDatasource.getCurrentExtFileVersion(), "0.5.0") >= 0)
			preUpdateWizardPage.setAttribute("next", "upgrade")
	},
	
	adaptButtons : function() {
		document.documentElement.getButton('back').setAttribute('hidden','true');
		document.documentElement.getButton('next').focus();
	},
	
	upgrade : function() {
		vI_notificationBar.dump("starting upgrade.\n\n")
		document.getElementById("upgradeWizard").setAttribute("canAdvance", "false")
		document.documentElement.getButton('next').setAttribute('disabled','true');
		
		if (vI_rdfDatasource.extUpgrade()) vI_upgrade.extUpgrade();
		if (vI_rdfDatasource.rdfUpgradeRequired()) vI_upgrade.rdfUpgrade();
		
		vI_account.cleanupSystem();
		
		vI_notificationBar.dump("\n\nupgrade finished.\n");
		
		document.documentElement.getButton('next').setAttribute('disabled','false');
		document.getElementById("upgradeWizard").setAttribute("canAdvance", "true")
	},
	
	rdfUpgrade : function() {
		vI_notificationBar.dump("checking for previous version of rdf, found " + 
			vI_rdfDatasource.getCurrentRDFFileVersion() + "\nrdf-upgrade required.\n")
		switch (vI_rdfDatasource.getCurrentRDFFileVersion()) {
			case null:
				vI_rdfDatasource.initRDFDataSource();
		}
		vI_notificationBar.dump("rdf-upgrade to " + vI_rdfDatasource.getCurrentRDFFileVersion() + " done.\n\n");
	},
	
	extUpgrade : function() {
		vI_notificationBar.dump("checking for previous version, found " + 
			vI_rdfDatasource.getCurrentExtFileVersion() + "\nextension-upgrade required.\n")
		switch (vI_rdfDatasource.getCurrentExtFileVersion()) {
			case null:
				vI_upgrade.__transferAllVIdentityABookToRDF();
				vI_upgrade.__removeObsoleteUserPrefs();
		}
		vI_rdfDatasource.storeExtVersion();
		vI_notificationBar.dump("extension-upgrade to " + vI_rdfDatasource.getCurrentExtFileVersion() + " done.\n\n");
	},
		
	__removeObsoleteUserPrefs : function() {
		// remove obsolete preference-tree virtualIdentity
		
		// remove any obsolete preferences under extensions.virtualIdentity
		vI_notificationBar.dump("removing obsolete preferences:\n")
		for each (pref in Array("aBook_use", "aBook_storedefault", "aBook_dont_update_multiple",
				"aBook_show_switch", "aBook_warn_update", "aBook_use_for_smart_reply", "aBook_prefer_smart_reply",
				"aBook_ignore_smart_reply", "aBook_warn_vI_replace", "aBook_use_non_vI", "aBook_notification", "storeVIdentity",
				"experimental")) {
			try { vI_upgrade.preferences.clearUserPref(pref); vI_notificationBar.dump(".") }
			catch (e) { };
		}
		vI_notificationBar.dump("done.\n")
	},

	CardFields : Array("Custom1", "Custom2", "Custom3", "Custom4", "Notes"),
	// --------------------------------------------------------------------
	// remove all VirtualIdentity-related Information from the AddressBook
	// and transfer it to the RDF File.
	__transferAllVIdentityABookToRDF : function() {
		var returnVar = { prop : null, counter : 0, warning : true }
		for each (returnVar.prop in vI_upgrade.CardFields) {
			var queryString = "?(or(" +returnVar.prop + ",c,vIdentity:))";
			returnVar.prop = returnVar.prop.toLowerCase();
			returnVar = vI_storage._walkTroughCards(queryString,vI_upgrade.__transferVIdentityABookToRDF, returnVar )
		}
		vI_notificationBar.dump("\ntransferred " + returnVar.counter + " VirtualIdentity information items from AddressBook to RDF.\n")
	},
	
	__transferVIdentityABookToRDF: function(addrbook, Card, returnVar) {
		if (!Card[returnVar.prop].match(/^vIdentity:/)) return returnVar;
		if (returnVar.warning) {
			vI_notificationBar.dump("transferring VirtualIdentity information from AddressBook to RDF file,\nthis might take a while:\n");
			returnVar.warning = false
		}
		
		var newFullEmail=Card[returnVar.prop].replace(/vIdentity: /,"");
		var infoIndex = newFullEmail.indexOf(" (id")
		if (!infoIndex) infoIndex = newFullEmail.indexOf(" (smtp")
		var info = null; var id= null; var smtp = null;
		if ( infoIndex != -1) {
			info = newFullEmail.substr(infoIndex+2).replace(/\)/,"").split(/,/)
			newFullEmail = newFullEmail.substr(0, infoIndex);
		}
		if ( info && info[0] ) id = info[0];
		if ( info && info[1] ) smtp = info[1];
		
		var splitted = vI_upgrade.__parseAddress(newFullEmail);
		//~ alert(splitted.email + "++" + splitted.name + "++" + splitted.combinedName)
		
		vI_rdfDatasource.updateRDF(vI_helper.combineNames(Card.displayName, Card.primaryEmail),
						"email", splitted.email, splitted.name, id, smtp, null)
		if (Card.secondEmail.replace(/^\s+|\s+$/g,""))
			vI_rdfDatasource.updateRDF(vI_helper.combineNames(Card.displayName, Card.secondEmail),
					"email", splitted.email, splitted.name, id, smtp, null)
		
		Card[returnVar.prop] = "";
		Card.editCardToDatabase("");
		vI_notificationBar.dump(".");
		return { prop: returnVar.prop, counter : ++returnVar.counter, warning : returnVar.warning };
	},
	
	// by now in vI, not accessible from here. Best change all references to vI_helper.
	__parseAddress : function(address) {
		//~ vI_notificationBar.dump("## v_identity: getAddress: parsing '" + address + "'\n")
		var name = ""; email = "";
		// prefer an email address separated with < >, only if not found use any other
		if (address.match(/<\s*[^>\s]*@[^>\s]*\s*>/) || address.match(/<?\s*[^>\s]*@[^>\s]*\s*>?/) || address.match(/$/)) {
			name = RegExp.leftContext + RegExp.rightContext
			email = RegExp.lastMatch
			email = email.replace(/\s+|<|>/g,"")
			name = name.replace(/^\s+|\s+$/g,"")
		}
		//~ vI_notificationBar.dump("## v_identity: getAddress: address '" + address + "' name '" + 
			//~ name + "' email '" + email + "'\n");
		return { name: name,
			 email: email,
			 combinedName: name + " <" + email + ">"}
	},

	openURL : function(aURL) {
            var uri = Components.classes["@mozilla.org/network/standard-url;1"].createInstance(Components.interfaces.nsIURI);
            var protocolSvc = Components.classes["@mozilla.org/uriloader/external-protocol-service;1"].getService(Components.interfaces.nsIExternalProtocolService);

            uri.spec = aURL;
            protocolSvc.loadUrl(uri);
        }
}
window.addEventListener('load', vI_upgrade.init, true);
