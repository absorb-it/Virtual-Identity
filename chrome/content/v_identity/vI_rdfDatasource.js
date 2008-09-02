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
	rdfNSEmail : "vIStorage/email/",
	rdfNSMaillist : "vIStorage/maillist/",
	rdfNSNewsgroup : "vIStorage/newsgroup/",
	
	// seamonkey doesn't have a extensionmanager, so read version of extension from hidden version-label
	// extensionManager : Components.classes["@mozilla.org/extensions/manager;1"]
	//		.getService(Components.interfaces.nsIExtensionManager),
	
	rdfVersion : "0.0.2",	// version of current implemented RDF-schema, internal only to trigger updates
	
	virtualIdentityID : "{dddd428e-5ac8-4a81-9f78-276c734f75b8}",
	
	unicodeConverter : Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
		.createInstance(Components.interfaces.nsIScriptableUnicodeConverter),
	
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
	},
	
	rdfUpgradeRequired: function() {
		oldRdfVersion = vI_rdfDatasource.getCurrentRDFFileVersion();
		var versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
			.getService(Components.interfaces.nsIVersionComparator);
		return (!oldRdfVersion || versionChecker.compare(oldRdfVersion, vI_rdfDatasource.rdfVersion) < 0)
	},
	
	extUpgradeRequired: function() {
		oldExtVersion = vI_rdfDatasource.getCurrentExtFileVersion()
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
		var parsed = vI_helper.parseAddress(recDescription)
		if (!parsed.combinedName) {
			vI_notificationBar.dump("## vI_rdfDatasource: __getRDFResourceForVIdentity: no Recipient given.\n");
			return null;
		}
		vI_notificationBar.dump("## vI_rdfDatasource: __getRDFResourceForVIdentity: recDescription=" + parsed.combinedName + "\n")
		var rdfNSRecType = null
		switch (recType) {
			case "email": rdfNSRecType = vI_rdfDatasource.rdfNSEmail; break;
			case "newsgroup" : rdfNSRecType = vI_rdfDatasource.rdfNSNewsgroup; break;
			case "maillist" : rdfNSRecType = vI_rdfDatasource.rdfNSMaillist; break;
		}
		return vI_rdfDatasource.rdfService.GetResource(vI_rdfDatasource.rdfNS + rdfNSRecType + parsed.combinedName);
	},
	
	removeVIdentityFromRDF : function (resource) {
		vI_notificationBar.dump("## vI_rdfDatasource: removeVIdentityFromRDF " + resource.ValueUTF8 + ".\n");
		vI_rdfDatasource.__unsetRDFValue(resource, "email", vI_rdfDatasource.__getRDFValue(resource, "email"))
		vI_rdfDatasource.__unsetRDFValue(resource, "fullName", vI_rdfDatasource.__getRDFValue(resource, "fullName"))
		vI_rdfDatasource.__unsetRDFValue(resource, "id", vI_rdfDatasource.__getRDFValue(resource, "id"))
		vI_rdfDatasource.__unsetRDFValue(resource, "smtp", vI_rdfDatasource.__getRDFValue(resource, "smtp"))
		
		var extras = new vI_storageExtras(vI_rdfDatasource.__getRDFValue, resource);
		extras.loopForRDF(vI_rdfDatasource.__unsetRDFValue, resource);
	},
	
	__unsetRDFValue : function (resource, field, value) {
		var predicate = vI_rdfDatasource.rdfService.GetResource(vI_rdfDatasource.rdfNS + "rdf#" + field);
		var name = vI_rdfDatasource.rdfService.GetLiteral(value?value:"");
		var target = vI_rdfDatasource.rdfDataSource.GetTarget(resource, predicate, true);
		if (target instanceof Components.interfaces.nsIRDFLiteral)
			vI_rdfDatasource.rdfDataSource.Unassert(resource, predicate, name, true);
	},
	
	// this will be used from rdfDataTree to get all RDF values, callFunction is vI_rdfDataTree.__addNewDatum
	readAllVIdentitiesFromRDF : function (callFunction) {
		vI_notificationBar.dump("## vI_rdfDatasource: readAllVIdentitiesFromRDF.\n");
		var enumerator = vI_rdfDatasource.rdfDataSource.GetAllResources();
		while (enumerator && enumerator.hasMoreElements()) {
			var resource = enumerator.getNext();
			resource.QueryInterface(Components.interfaces.nsIRDFResource);
			
			var type; var name;
			if (resource.ValueUTF8.match(new RegExp(vI_rdfDatasource.rdfNS + vI_rdfDatasource.rdfNSEmail, "i")))
				{ type = "email"; name = RegExp.rightContext }
			else if (resource.ValueUTF8.match(new RegExp(vI_rdfDatasource.rdfNS + vI_rdfDatasource.rdfNSNewsgroup, "i")))
				{ type = "newsgroup"; name = RegExp.rightContext }
			else if (resource.ValueUTF8.match(new RegExp(vI_rdfDatasource.rdfNS + vI_rdfDatasource.rdfNSMaillist, "i")))
				{ type = "maillist"; name = RegExp.rightContext }
			else continue;
			
			var email = vI_rdfDatasource.__getRDFValue(resource, "email")
			var fullName = vI_rdfDatasource.__getRDFValue(resource, "fullName")
			var id = vI_rdfDatasource.__getRDFValue(resource, "id")
			var smtp = vI_rdfDatasource.__getRDFValue(resource, "smtp")
			var extras = new vI_storageExtras(vI_rdfDatasource.__getRDFValue, resource);
			
			var localIdentityData = new identityData(email, fullName, id, smtp, extras)
			callFunction (resource, type, name, localIdentityData)		
		}
	},
	
	readVIdentityFromRDF : function (recDescription, recType) {
		vI_notificationBar.dump("## vI_rdfDatasource: readVIdentityFromRDF.\n");
		var resource = vI_rdfDatasource.__getRDFResourceForVIdentity(recDescription, recType);
		if (!resource) return null;
		
		var email = vI_rdfDatasource.rdfService.GetResource(vI_rdfDatasource.rdfNS + "rdf#email");
		if (!vI_rdfDatasource.rdfDataSource.hasArcOut(resource, email)) {
			vI_notificationBar.dump("## vI_rdfDatasource: readVIdentityFromRDF no data found.\n");
			return null;
		}
		vI_notificationBar.dump("## vI_rdfDatasource: readVIdentityFromRDF found stored data.\n");
		
		email = vI_rdfDatasource.__getRDFValue(resource, "email")
		var fullName = vI_rdfDatasource.__getRDFValue(resource, "fullName")
		var id = vI_rdfDatasource.__getRDFValue(resource, "id")
		var smtp = vI_rdfDatasource.__getRDFValue(resource, "smtp")
		
		vI_notificationBar.dump("## vI_rdfDatasource: email '" + email + "'\n");
		vI_notificationBar.dump("## vI_rdfDatasource: fullName '" + fullName + "'\n");
		vI_notificationBar.dump("## vI_rdfDatasource: id '" + id + "'\n");
		vI_notificationBar.dump("## vI_rdfDatasource: smtp '" + smtp + "'\n");
		
		var extras = new vI_storageExtras(vI_rdfDatasource.__getRDFValue, resource);
		vI_notificationBar.dump("## vI_rdfDatasource: extras: " + extras.status() + "\n");
		
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
		var address = vI_helper.getAddress();	
		var id = "";
		if (vI_statusmenu.objSaveBaseIDMenuItem.getAttribute("checked") == "true") {
			vI_notificationBar.dump("## vI_rdfDatasource: updateRDFFromVIdentity: storing base identity.\n");
			id = vI_msgIdentityClone.elements.Obj_MsgIdentity_clone.base_id_key;
		}

		var smtp = vI_smtpSelector.elements.Obj_SMTPServerList.selectedItem.getAttribute("key");
		var extras = new vI_storageExtras();
		extras.readValues(); // initialize with current MsgComposeDialog Values
		
		var localIdentityData = new identityData(address.email, address.name, id, smtp, extras)
		vI_rdfDatasource.updateRDF(recDescription, recType, localIdentityData);
	},
	
	updateRDF : function (recDescription, recType, localIdentityData) {
		if (!localIdentityData.email) {
			vI_notificationBar.dump("## vI_rdfDatasource: updateRDF: no Sender-email for Recipient, aborting.\n");
			return;
		}
		var resource = vI_rdfDatasource.__getRDFResourceForVIdentity(recDescription, recType);
		if (!resource) return;
		else vI_rdfDatasource.removeVIdentityFromRDF(resource); // just to have a clean base

		vI_notificationBar.dump("## vI_rdfDatasource: updateRDF " + resource.ValueUTF8 + ".\n");
		vI_rdfDatasource.__setRDFValue(resource, "email", localIdentityData.email)
		vI_rdfDatasource.__setRDFValue(resource, "fullName", localIdentityData.fullName)
		vI_rdfDatasource.__setRDFValue(resource, "id", localIdentityData.id)
		vI_rdfDatasource.__setRDFValue(resource, "smtp", localIdentityData.smtp)
		
		if (localIdentityData.extras) localIdentityData.extras.loopForRDF(vI_rdfDatasource.__setRDFValue, resource);
	},

	__setRDFValue : function (resource, field, value) {
		vI_notificationBar.dump("## vI_rdfDatasource: __setRDFValue " + resource.ValueUTF8 + " " + field + " " + value + ".\n");
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
