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

var vI_upgrade = {
	preferences : Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefService)
			.getBranch("extensions.virtualIdentity."),
			
	versionChecker : Components.classes["@mozilla.org/xpcom/version-comparator;1"]
			.getService(Components.interfaces.nsIVersionComparator),

	init : function() {
		vI_upgrade.__initRequirements();
		document.documentElement.getButton("cancel").setAttribute("hidden", "true")
	},

	__initRequirements : function() {
		vI_notificationBar.dump("") // this initialises the debug-area
		vI_rdfDatasource.init(); // just to be sure that Datasource is initialised
	},
	
	// this function checks for the chance to ugrade without shoing the complete wizard
	// if so, perform the upgrade and return true
	// by default the wizard is not shown if it is a one-version-forward upgrade
	quick_upgrade : function() {
		// seamonkey doesn't have a extensionmanager, so read version of extension from hidden version-label
		var currentVersion = vI_rdfDatasource.getCurrentExtFileVersion()
		if (!currentVersion) return false;
		currentVersion = currentVersion.split(/\./);
		var nextVersion = currentVersion[0] + "." + currentVersion[1] + "."
		if (currentVersion[2].match(/pre/))
		 	nextVersion += parseInt(currentVersion[2])
		else nextVersion += eval(parseInt(currentVersion[2])+1)
		var extVersion = document.getElementById("extVersion").getAttribute("value");
				
		// don't show the dialog if we do a one-step upgrade
		if (vI_upgrade.versionChecker.compare(extVersion, nextVersion) <= 0) {
			vI_notificationBar.dump("starting quick_upgrade.\n")
			vI_upgrade.__initRequirements();
			vI_upgrade.__upgrade();
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
		if (vI_rdfDatasource.extUpgradeRequired()) vI_upgrade.extUpgrade();
		if (vI_rdfDatasource.rdfUpgradeRequired()) vI_upgrade.rdfUpgrade();
		
		vI_account.cleanupSystem();
	},			

	upgrade : function() {
		vI_notificationBar.dump("starting upgrade.\n\n")
		document.getElementById("upgradeWizard").setAttribute("canAdvance", "false")
		document.documentElement.getButton('next').setAttribute('disabled','true');
		
		vI_upgrade.__upgrade();
	
		vI_notificationBar.dump("\n\nupgrade finished.\n");
		
		document.documentElement.getButton('next').setAttribute('disabled','false');
		document.getElementById("upgradeWizard").setAttribute("canAdvance", "true")
	},
	
	rdfUpgrade : function() {
		var currentVersion = vI_rdfDatasource.getCurrentRDFFileVersion();
		vI_notificationBar.dump("checking for previous version of rdf, found " + 
			currentVersion + "\nrdf-upgrade required.\n")
		switch (currentVersion) {
			case "0.0.1":
			case "0.0.2":
				vI_upgrade.__createRDFContainers(); // no break
			default:
				vI_upgrade.__tagDefaultSMTP();
		}
		vI_rdfDatasource.storeRDFVersion();
		vI_notificationBar.dump("rdf-upgrade to " + vI_rdfDatasource.getCurrentRDFFileVersion() + " done.\n\n");
	},
	
	// only used for upgrade to 0.0.3 - loop through all ressources.
	__transferAllResources : function () {
		vI_notificationBar.dump("upgrade: transferAllResources ");
		var enumerator = vI_rdfDatasource.rdfDataSource.GetAllResources();
		while (enumerator && enumerator.hasMoreElements()) {
			var resource = enumerator.getNext();
			resource.QueryInterface(Components.interfaces.nsIRDFResource);
			
			var type; var name;
			if (resource.ValueUTF8.match(new RegExp(vI_rdfDatasource.rdfNS + vI_rdfDatasource.rdfNSEmail + "/", "i")))
				{ type = "email"; name = RegExp.rightContext }
			else if (resource.ValueUTF8.match(new RegExp(vI_rdfDatasource.rdfNS + vI_rdfDatasource.rdfNSNewsgroup + "/", "i")))
				{ type = "newsgroup"; name = RegExp.rightContext }
			else if (resource.ValueUTF8.match(new RegExp(vI_rdfDatasource.rdfNS + vI_rdfDatasource.rdfNSMaillist + "/", "i")))
				{ type = "maillist"; name = RegExp.rightContext }
			else continue;
			
			var container = vI_rdfDatasource.getContainer(type);
			vI_rdfDatasource.__setRDFValue(resource, "name", name);
			
			if (container.IndexOf(resource) == -1) container.AppendElement(resource);
		
			vI_notificationBar.dump(".");
		}
		vI_notificationBar.dump("\n");
	},

	__tagDefaultSMTP: function() {
		vI_notificationBar.dump("upgrade: tagDefaultSMTP ");
		for each (treeType in Array("email", "maillist", "newsgroup", "filter")) {
			var enumerator = vI_rdfDatasource.getContainer(treeType).GetElements();
			while (enumerator && enumerator.hasMoreElements()) {
				var resource = enumerator.getNext();
				resource.QueryInterface(Components.interfaces.nsIRDFResource);
				var smtp = vI_rdfDatasource.__getRDFValue(resource, "smtp")
				if (!smtp || smtp == "") vI_rdfDatasource.__setRDFValue(resource, "smtp", DEFAULT_SMTP_TAG);
				vI_notificationBar.dump(".");
			}
		}
		vI_notificationBar.dump("\n");
	},

	__createRDFContainers: function() {
		var rdfContainerUtils = Components.classes["@mozilla.org/rdf/container-utils;1"].
			getService(Components.interfaces.nsIRDFContainerUtils);

		var storageRes = vI_rdfDatasource.rdfService
			.GetResource(vI_rdfDatasource.rdfNS + vI_rdfDatasource.rdfNSStorage);
		var emailRes = vI_rdfDatasource.rdfService
			.GetResource(vI_rdfDatasource.rdfNS + vI_rdfDatasource.rdfNSEmail);
		var maillistRes = vI_rdfDatasource.rdfService
			.GetResource(vI_rdfDatasource.rdfNS + vI_rdfDatasource.rdfNSMaillist);
		var newsgroupRes = vI_rdfDatasource.rdfService
			.GetResource(vI_rdfDatasource.rdfNS + vI_rdfDatasource.rdfNSNewsgroup);
		var filterRes = vI_rdfDatasource.rdfService
			.GetResource(vI_rdfDatasource.rdfNS + vI_rdfDatasource.rdfNSFilter);
		vI_rdfDatasource.__setRDFValue(emailRes, "name", "E-Mail");
		vI_rdfDatasource.__setRDFValue(maillistRes, "name", "Mailing-List");
		vI_rdfDatasource.__setRDFValue(newsgroupRes, "name", "Newsgroup");
		vI_rdfDatasource.__setRDFValue(filterRes, "name", "Filter");

		rdfContainerUtils.MakeBag(vI_rdfDatasource.rdfDataSource, storageRes);
		rdfContainerUtils.MakeBag(vI_rdfDatasource.rdfDataSource, emailRes);
		rdfContainerUtils.MakeBag(vI_rdfDatasource.rdfDataSource, maillistRes);
		rdfContainerUtils.MakeBag(vI_rdfDatasource.rdfDataSource, newsgroupRes);
		// use a sequence for the filters, order does matter
		rdfContainerUtils.MakeSeq(vI_rdfDatasource.rdfDataSource, filterRes);
		
		var container = Components.classes["@mozilla.org/rdf/container;1"].
			createInstance(Components.interfaces.nsIRDFContainer);
		
		// initialize container with storageRes
		container.Init(vI_rdfDatasource.rdfDataSource, storageRes);
		// append all new containers to storageRes
		if (container.IndexOf(emailRes) == -1) container.AppendElement(emailRes);
		if (container.IndexOf(maillistRes) == -1) container.AppendElement(maillistRes);
		if (container.IndexOf(newsgroupRes) == -1) container.AppendElement(newsgroupRes);
		if (container.IndexOf(filterRes) == -1) container.AppendElement(filterRes);
		
		vI_rdfDatasource.__initContainers();
		
		vI_upgrade.__transferAllResources();
	},
	
	extUpgrade : function() {
		var currentVersion = vI_rdfDatasource.getCurrentExtFileVersion();
		vI_notificationBar.dump("checking for previous version, found " + 
			currentVersion + "\nextension-upgrade required.\n")
		switch (currentVersion) {
			case null:
				vI_upgrade.__transferAllVIdentityABookToRDF(); // no break
			default:
				vI_upgrade.__transferMovedUserPrefs(currentVersion);
				vI_upgrade.__removeObsoleteUserPrefs(currentVersion);
		}
		vI_rdfDatasource.storeExtVersion();
		vI_notificationBar.dump("extension-upgrade to " + vI_rdfDatasource.getCurrentExtFileVersion() + " done.\n\n");
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
			if (!currentVersion || (vI_upgrade.versionChecker.compare(currentVersion, transferPrefs[i].version) < 0)) {
				// remove any obsolete preferences under extensions.virtualIdentity
				vI_notificationBar.dump("transfer changed preferences of pre-" + transferPrefs[i].version + " release:\n")
				for each (transferPref in transferPrefs[i].prefs) {
					try {	vI_upgrade.preferences.setBoolPref(transferPref.targetPref, 
							vI_upgrade.preferences.getBoolPref(transferPref.sourcePref));
						vI_upgrade.preferences.clearUserPref(transferPref.sourcePref);
						vI_notificationBar.dump(".") 
					}
					catch (e) { };
				}
				vI_notificationBar.dump("done.\n")
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
			if (!currentVersion || (vI_upgrade.versionChecker.compare(currentVersion, obsoletePrefs[i].version) < 0)) {
				// remove any obsolete preferences under extensions.virtualIdentity
				vI_notificationBar.dump("removing obsolete preferences of pre-" + obsoletePrefs[i].version + " release:\n")
				for each (pref in obsoletePrefs[i].prefs) {
					try { vI_upgrade.preferences.clearUserPref(pref); vI_notificationBar.dump(".") }
					catch (e) { };
				}
				vI_notificationBar.dump("done.\n")
			}
		}
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
		
		var localIdentityData = new identityData(splitted.email, splitted.name, id, smtp, null)
		
		vI_rdfDatasource.updateRDF(vI_helper.combineNames(Card.displayName, Card.primaryEmail),
						"email", localIdentityData, true, true, null, null)
		if (Card.secondEmail.replace(/^\s+|\s+$/g,""))
			vI_rdfDatasource.updateRDF(vI_helper.combineNames(Card.displayName, Card.secondEmail),
					"email", localIdentityData, true, true, null, null)
		
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
// start init only if wizard is shown, so it is done in vI_upgrade.xul
// window.addEventListener('load', vI_upgrade.init, true);
