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


var vI_rdfDatasource = {			
	rdfService : Components.classes["@mozilla.org/rdf/rdf-service;1"]
			.getService(Components.interfaces.nsIRDFService),
	
	rdfDataSource : null,
	rdfFileName : "virtualIdentity.rdf",
	rdfNS : "http://virtual-id.absorb.it/",
	rdfNSStorage : "vIStorage",
	rdfNSEmail : "vIStorage/email",
	rdfNSMaillist : "vIStorage/maillist",
	rdfNSNewsgroup : "vIStorage/newsgroup",
	rdfNSFilter : "vIStorage/filter",
	
	// seamonkey doesn't have a extensionmanager, so read version of extension from hidden version-label
	// extensionManager : Components.classes["@mozilla.org/extensions/manager;1"]
	//		.getService(Components.interfaces.nsIExtensionManager),
	
	rdfVersion : "0.0.4",	// version of current implemented RDF-schema, internal only to trigger updates
	
	virtualIdentityID : "{dddd428e-5ac8-4a81-9f78-276c734f75b8}",
	
	unicodeConverter : Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
		.createInstance(Components.interfaces.nsIScriptableUnicodeConverter),
	
	emailContainer : Components.classes["@mozilla.org/rdf/container;1"]
			.createInstance(Components.interfaces.nsIRDFContainer),

	maillistContainer : Components.classes["@mozilla.org/rdf/container;1"]
			.createInstance(Components.interfaces.nsIRDFContainer),

	newsgroupContainer : Components.classes["@mozilla.org/rdf/container;1"]
			.createInstance(Components.interfaces.nsIRDFContainer),

	filterContainer : Components.classes["@mozilla.org/rdf/container;1"]
			.createInstance(Components.interfaces.nsIRDFContainer),

	getContainer : function (type) {
		switch (type) {
			case "email": return vI_rdfDatasource.emailContainer;
			case "maillist": return vI_rdfDatasource.maillistContainer;
			case "newsgroup": return vI_rdfDatasource.newsgroupContainer;
			case "filter": return vI_rdfDatasource.filterContainer;
		}
		return null;
	},

	init: function() {
		if (vI_rdfDatasource.rdfDataSource) return;		
		var protoHandler = Components.classes["@mozilla.org/network/protocol;1?name=file"]
			.getService(Components.interfaces.nsIFileProtocolHandler)
		var newFile = Components.classes["@mozilla.org/file/local;1"]
            		.createInstance(Components.interfaces.nsILocalFile);
		
		var file = Components.classes["@mozilla.org/file/directory_service;1"]
			.getService(Components.interfaces.nsIProperties)
			.get("ProfD", Components.interfaces.nsIFile);
		var delimiter = (file.path.match(/\\/))?"\\":"/";

		newFile.initWithPath(file.path + delimiter + vI_rdfDatasource.rdfFileName);
		var fileURI = protoHandler.newFileURI(newFile);

		vI_notificationBar.dump("## vI_rdfDatasource read rdf from '" + fileURI.spec + "'\n");

		vI_rdfDatasource.rdfDataSource =
			vI_rdfDatasource.rdfService.GetDataSourceBlocking(fileURI.spec);
		vI_rdfDatasource.__initContainers();
	},
	
	__initContainers: function() {
		try {	// will possibly fail before upgrade
			var storageRes = vI_rdfDatasource.rdfService
				.GetResource(vI_rdfDatasource.rdfNS + vI_rdfDatasource.rdfNSEmail);
			vI_rdfDatasource.emailContainer.Init(vI_rdfDatasource.rdfDataSource, storageRes);
			storageRes = vI_rdfDatasource.rdfService
				.GetResource(vI_rdfDatasource.rdfNS + vI_rdfDatasource.rdfNSMaillist);
			vI_rdfDatasource.maillistContainer.Init(vI_rdfDatasource.rdfDataSource, storageRes);
			storageRes = vI_rdfDatasource.rdfService
				.GetResource(vI_rdfDatasource.rdfNS + vI_rdfDatasource.rdfNSNewsgroup);
			vI_rdfDatasource.newsgroupContainer.Init(vI_rdfDatasource.rdfDataSource, storageRes);
			storageRes = vI_rdfDatasource.rdfService
				.GetResource(vI_rdfDatasource.rdfNS + vI_rdfDatasource.rdfNSFilter);
			vI_rdfDatasource.filterContainer.Init(vI_rdfDatasource.rdfDataSource, storageRes);
		} catch (e) { };
	},

	rdfUpgradeRequired: function() {
		var oldRdfVersion = vI_rdfDatasource.getCurrentRDFFileVersion();
		var versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
			.getService(Components.interfaces.nsIVersionComparator);
		return (!oldRdfVersion || versionChecker.compare(oldRdfVersion, vI_rdfDatasource.rdfVersion) < 0)
	},
	
	extUpgradeRequired: function() {
		var oldExtVersion = vI_rdfDatasource.getCurrentExtFileVersion()
		var versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
			.getService(Components.interfaces.nsIVersionComparator);
		// seamonkey doesn't have a extensionmanager, so read version of extension from hidden version-label
		// var extVersion = vI_rdfDatasource.extensionManager.getItemForID(vI_rdfDatasource.virtualIdentityID).version
		var extVersion = document.getElementById("extVersion").getAttribute("value");
		return (!oldExtVersion || versionChecker.compare(oldExtVersion, extVersion) < 0)	
	},
	
	getCurrentRDFFileVersion: function() {
		return vI_rdfDatasource.__getRDFValue(
			vI_rdfDatasource.rdfService.GetResource(vI_rdfDatasource.rdfNS + "virtualIdentity"), "rdfVersion");
	},
	
	getCurrentExtFileVersion: function() {
		return vI_rdfDatasource.__getRDFValue(
			vI_rdfDatasource.rdfService.GetResource(vI_rdfDatasource.rdfNS + "virtualIdentity"), "version");
	},
	
	storeRDFVersion: function() {
		vI_rdfDatasource.__setRDFValue(
			vI_rdfDatasource.rdfService.GetResource(vI_rdfDatasource.rdfNS + "virtualIdentity"), "rdfVersion",
			vI_rdfDatasource.rdfVersion);
		vI_rdfDatasource.flush();
	},
	
	storeExtVersion: function() {
		// seamonkey doesn't have a extensionmanager, so read version of extension from hidden version-label
		// var extVersion = vI_rdfDatasource.extensionManager.getItemForID(vI_rdfDatasource.virtualIdentityID).version
		var extVersion = document.getElementById("extVersion").getAttribute("value");
		vI_rdfDatasource.__setRDFValue(
			vI_rdfDatasource.rdfService.GetResource(vI_rdfDatasource.rdfNS + "virtualIdentity"), "version", extVersion)
		vI_rdfDatasource.flush();
	},

	flush : function() {
		vI_rdfDatasource.rdfDataSource.QueryInterface(Components.interfaces.nsIRDFRemoteDataSource);
		vI_rdfDatasource.rdfDataSource.Flush();
	},
	
	__getRDFResourceForVIdentity : function (recDescription, recType) {
		if (!vI_rdfDatasource.rdfDataSource) return null;
		if (!recDescription) {
			vI_notificationBar.dump("## vI_rdfDatasource: __getRDFResourceForVIdentity: no Recipient given.\n");
			return null;
		}
		var rdfNSRecType = null
		switch (recType) {
			case "email": rdfNSRecType = vI_rdfDatasource.rdfNSEmail; break;
			case "newsgroup" : rdfNSRecType = vI_rdfDatasource.rdfNSNewsgroup; break;
			case "maillist" : rdfNSRecType = vI_rdfDatasource.rdfNSMaillist; break;
			case "filter" : rdfNSRecType = vI_rdfDatasource.rdfNSFilter; break;
		}
		return vI_rdfDatasource.rdfService.GetResource(vI_rdfDatasource.rdfNS + rdfNSRecType + "/" + recDescription);
	},
	
	removeVIdentityFromRDF : function (resource, recType) {
		vI_notificationBar.dump("## vI_rdfDatasource: removeVIdentityFromRDF " + resource.ValueUTF8 + ".\n");
		vI_rdfDatasource.__unsetRDFValue(resource, "email", vI_rdfDatasource.__getRDFValue(resource, "email"))
		vI_rdfDatasource.__unsetRDFValue(resource, "fullName", vI_rdfDatasource.__getRDFValue(resource, "fullName"))
		vI_rdfDatasource.__unsetRDFValue(resource, "id", vI_rdfDatasource.__getRDFValue(resource, "id"))
		vI_rdfDatasource.__unsetRDFValue(resource, "smtp", vI_rdfDatasource.__getRDFValue(resource, "smtp"))
		vI_rdfDatasource.__unsetRDFValue(resource, "name", vI_rdfDatasource.__getRDFValue(resource, "name"))
		
		var extras = new vI_storageExtras(vI_rdfDatasource.__getRDFValue, resource);
		extras.loopForRDF(vI_rdfDatasource.__unsetRDFValue, resource);
		vI_rdfDatasource.getContainer(recType).RemoveElement(resource, true);
	},
	
	__unsetRDFValue : function (resource, field, value) {
		var predicate = vI_rdfDatasource.rdfService.GetResource(vI_rdfDatasource.rdfNS + "rdf#" + field);
		var name = vI_rdfDatasource.rdfService.GetLiteral(value?value:"");
		var target = vI_rdfDatasource.rdfDataSource.GetTarget(resource, predicate, true);
		if (target instanceof Components.interfaces.nsIRDFLiteral)
			vI_rdfDatasource.rdfDataSource.Unassert(resource, predicate, name, true);
	},
	
	// this will be used from rdfDataTree to get all RDF values, callFunction is vI_rdfDataTree.__addNewDatum
	readAllEntriesFromRDF : function (addNewDatum, treeType, idData) {
// 		vI_notificationBar.dump("## vI_rdfDatasource: readAllEntriesFromRDF.\n");
		var enumerator = vI_rdfDatasource.getContainer(treeType).GetElements();
		while (enumerator && enumerator.hasMoreElements()) {
			var resource = enumerator.getNext();
			resource.QueryInterface(Components.interfaces.nsIRDFResource);
			var name = vI_rdfDatasource.__getRDFValue(resource, "name")
			var email = vI_rdfDatasource.__getRDFValue(resource, "email")
			var fullName = vI_rdfDatasource.__getRDFValue(resource, "fullName")
			var id = vI_rdfDatasource.__getRDFValue(resource, "id")
			var smtp = vI_rdfDatasource.__getRDFValue(resource, "smtp")
			if (!smtp) smtp = NO_SMTP_TAG;
			var extras = new vI_storageExtras(vI_rdfDatasource.__getRDFValue, resource);
			
			var localIdentityData = new identityData(email, fullName, id, smtp, extras)
			addNewDatum (resource, name, localIdentityData, idData)
		}
	},
	
	findMatchingFilter : function (recDescription) {
		vI_notificationBar.dump("## vI_rdfDatasource: findMatchingFilter for " + recDescription + ".\n");
		var enumerator = vI_rdfDatasource.filterContainer.GetElements();
		while (enumerator && enumerator.hasMoreElements()) {
			var resource = enumerator.getNext();
			resource.QueryInterface(Components.interfaces.nsIRDFResource);
			var filter = vI_rdfDatasource.__getRDFValue(resource, "name");
			
			const filterType = { None : 0, RegExp : 1, StrCmp : 2 }
			var recentfilterType;

			if (filter == "") continue;
			if (/^\/(.*)\/$/.exec(filter))
				{ vI_notificationBar.dump("## vI_rdfDatasource: findMatchingFilter with RegExp '"
					+ filter.replace(/\\/g,"\\\\") + "'\n"); recentfilterType = filterType.RegExp; }
			else	{ vI_notificationBar.dump("## vI_rdfDatasource: findMatchingFilter, compare with '"
					+ filter + "'\n"); recentfilterType = filterType.StrCmp; }
			
			switch (recentfilterType) {
				case filterType.RegExp:
					try { 	/^\/(.*)\/$/.exec(filter);
						if (recDescription.match(new RegExp(RegExp.$1,"i"))) {
							vI_notificationBar.dump("## vI_rdfDatasource: findMatchingFilter found stored data.\n");
							return vI_rdfDatasource.__readVIdentityFromRDF(resource);
						}
					}
					catch(vErr) { }; break;
				case filterType.StrCmp:
					if (recDescription.toLowerCase().indexOf(filter.toLowerCase()) != -1) {
						vI_notificationBar.dump("## vI_rdfDatasource: findMatchingFilter found stored data.\n");
						return vI_rdfDatasource.__readVIdentityFromRDF(resource);
					}
					break;
			}
		}
		vI_notificationBar.dump("## vI_rdfDatasource: findMatchingFilter no match found.\n");
		return null;
	},
	
	readVIdentityFromRDF : function (recDescription, recType) {
		var email = vI_rdfDatasource.rdfService.GetResource(vI_rdfDatasource.rdfNS + "rdf#email");
		var resource = vI_rdfDatasource.__getRDFResourceForVIdentity(recDescription, recType);
		if (!resource) return null;
		if (!vI_rdfDatasource.rdfDataSource.hasArcOut(resource, email)) {
			// no data available --> give up.
			vI_notificationBar.dump("## vI_rdfDatasource: readVIdentityFromRDF no data found.\n");
			return null;
		}
		vI_notificationBar.dump("## vI_rdfDatasource: readVIdentityFromRDF found stored data.\n");
		
		return vI_rdfDatasource.__readVIdentityFromRDF(resource);
	},
	
	__readVIdentityFromRDF : function (resource) {
		var email = vI_rdfDatasource.__getRDFValue(resource, "email")
		var fullName = vI_rdfDatasource.__getRDFValue(resource, "fullName")
		var id = vI_rdfDatasource.__getRDFValue(resource, "id")
		var smtp = vI_rdfDatasource.__getRDFValue(resource, "smtp")
		vI_notificationBar.dump("## vI_rdfDatasource: email='" + email + 
			"' fullName='" + fullName + "' id='" + id + "' smtp='" + smtp + "'\n");
		if (!smtp) smtp = NO_SMTP_TAG; // to indicate default SMTP (different than null like with SmartReply)
		
		vI_notificationBar.dump("## vI_rdfDatasource: email='" + email + 
			"' fullName='" + fullName + "' id='" + id + "' smtp='" + smtp + "'\n");
		
		var extras = new vI_storageExtras(vI_rdfDatasource.__getRDFValue, resource);
		vI_notificationBar.dump("## vI_rdfDatasource: extras:" + extras.status() + "\n");
		
		var localIdentityData = new identityData(email, fullName, id, smtp, extras)
		return localIdentityData;
	},

	__getRDFValue : function (resource, field) {
		var predicate = vI_rdfDatasource.rdfService.GetResource(vI_rdfDatasource.rdfNS + "rdf#" + field);
		var target = vI_rdfDatasource.rdfDataSource.GetTarget(resource, predicate, true);
		if (target instanceof Components.interfaces.nsIRDFLiteral) return target.Value
		else return null;
	},
	
	updateRDFFromVIdentity : function(recDescription, recType) {
		vI_rdfDatasource.updateRDF(recDescription, recType,
			document.getElementById("msgIdentity_clone").identityData,
			(vI_statusmenu.objSaveBaseIDMenuItem.getAttribute("checked") == "true"),
			(vI_statusmenu.objSaveSMTPMenuItem.getAttribute("checked") == "true"),
			null, null);
	},
	
	removeRDF : function (recDescription, recType) {
		var resource = vI_rdfDatasource.__getRDFResourceForVIdentity(recDescription, recType);
		if (!resource) return null;
		vI_rdfDatasource.removeVIdentityFromRDF(resource, recType);
		return resource;
	},

	updateRDF : function (recDescription, recType, localIdentityData, storeBaseID, storeSMTP, prevRecDescription, prevRecType) {
// 		if (!localIdentityData.email) {
// 			vI_notificationBar.dump("## vI_rdfDatasource: updateRDF: no Sender-email for Recipient, aborting.\n");
// 			return;
// 		}
		if (recDescription.length == 0) return;

		if (!prevRecDescription) prevRecDescription = recDescription;
		if (!prevRecType) prevRecType = recType;

		var resource = vI_rdfDatasource.__getRDFResourceForVIdentity(prevRecDescription, prevRecType);
		if (!resource) return;
		vI_notificationBar.dump("## vI_rdfDatasource: updateRDF " + resource.ValueUTF8 + ".\n");
		
		var position = vI_rdfDatasource.getContainer(recType).IndexOf(resource); // check for index in new recType
		vI_rdfDatasource.removeVIdentityFromRDF(resource, prevRecType);
		
		resource = vI_rdfDatasource.__getRDFResourceForVIdentity(recDescription, recType);

		vI_rdfDatasource.__setRDFValue(resource, "email", localIdentityData.email);
		vI_rdfDatasource.__setRDFValue(resource, "fullName", localIdentityData.fullName);
		if (storeBaseID)
			vI_rdfDatasource.__setRDFValue(resource, "id", localIdentityData.id.key);
		else	vI_rdfDatasource.__unsetRDFValue(resource, "id", vI_rdfDatasource.__getRDFValue(resource, "id"))
		if (storeSMTP && localIdentityData.smtp.key != NO_SMTP_TAG)
			vI_rdfDatasource.__setRDFValue(resource, "smtp", localIdentityData.smtp.key);
		else	vI_rdfDatasource.__unsetRDFValue(resource, "smtp", vI_rdfDatasource.__getRDFValue(resource, "smtp"))
		vI_rdfDatasource.__setRDFValue(resource, "name", recDescription);

		localIdentityData.extras.loopForRDF(vI_rdfDatasource.__setRDFValue, resource);
		
		vI_notificationBar.dump("## vI_rdfDatasource: updateRDF " + resource.ValueUTF8  + " added.\n");
		if (position != -1) vI_rdfDatasource.getContainer(recType).InsertElementAt(resource, position, true);
		else vI_rdfDatasource.getContainer(recType).AppendElement(resource);
	},

	__setRDFValue : function (resource, field, value) {
//		vI_notificationBar.dump("## vI_rdfDatasource: __setRDFValue " + resource.ValueUTF8 + " " + field + " " + value + ".\n");
		if (!value) return; // return if some value was not set.
		var predicate = vI_rdfDatasource.rdfService.GetResource(vI_rdfDatasource.rdfNS + "rdf#" + field);
		var name = vI_rdfDatasource.rdfService.GetLiteral(value);
		var target = vI_rdfDatasource.rdfDataSource.GetTarget(resource, predicate, true);
		
		if (target instanceof Components.interfaces.nsIRDFLiteral)
			vI_rdfDatasource.rdfDataSource.Change(resource, predicate, target, name);
		else	vI_rdfDatasource.rdfDataSource.Assert(resource, predicate, name, true);
	}
}
window.addEventListener("load", vI_rdfDatasource.init, false);
window.addEventListener("unload", vI_rdfDatasource.flush, false);
