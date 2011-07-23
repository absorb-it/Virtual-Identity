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



function vI_rdfDatasource(rdfFileName, dontRegisterObserver) {
    this._rdfFileName = rdfFileName;
    if (this._rdfFileName) this.init();
    if (!dontRegisterObserver) this.AccountManagerObserver.register();
}

vI_rdfDatasource.prototype = {
    _rdfVersion :       "0.0.5",
    _rdfService :       Components.classes["@mozilla.org/rdf/rdf-service;1"]
                            .getService(Components.interfaces.nsIRDFService),
	_rdfDataSource :    null,
	_rdfFileName :      null,
	_rdfNS :            "http://virtual-id.absorb.it/",
    _rdfNSStorage :     "vIStorage",
	_rdfNSEmail :       "vIStorage/email",
	_rdfNSMaillist :    "vIStorage/maillist",
	_rdfNSNewsgroup :   "vIStorage/newsgroup",
	_rdfNSFilter :      "vIStorage/filter",
    _rdfNSAccounts :    "vIAccounts",
    _rdfNSIdentities :  "vIAccounts/id",
    _rdfNSSMTPservers : "vIAccounts/smtp",

	_virtualIdentityID : "{dddd428e-5ac8-4a81-9f78-276c734f75b8}",
	
	_emailContainer : Components.classes["@mozilla.org/rdf/container;1"]
			.createInstance(Components.interfaces.nsIRDFContainer),

	_maillistContainer : Components.classes["@mozilla.org/rdf/container;1"]
			.createInstance(Components.interfaces.nsIRDFContainer),

	_newsgroupContainer : Components.classes["@mozilla.org/rdf/container;1"]
			.createInstance(Components.interfaces.nsIRDFContainer),

	_filterContainer : Components.classes["@mozilla.org/rdf/container;1"]
			.createInstance(Components.interfaces.nsIRDFContainer),

    _identityContainer : Components.classes["@mozilla.org/rdf/container;1"]
            .createInstance(Components.interfaces.nsIRDFContainer),

    _smtpContainer : Components.classes["@mozilla.org/rdf/container;1"]
            .createInstance(Components.interfaces.nsIRDFContainer),
    
    getContainer : function (type) {
		switch (type) {
			case "email": return this._emailContainer;
			case "maillist": return this._maillistContainer;
			case "newsgroup": return this._newsgroupContainer;
			case "filter": return this._filterContainer;
            case "identity": return this._identityContainer;
            case "smtp": return this._smtpContainer;
		}
		return null;
	},

	init: function() {
//         if (vI_notificationBar) vI_notificationBar.dump("## vI_rdfDatasource init.\n");

        this._openRdfDataSource();
        if (!this._rdfDataSource) return;
        this._initContainers();
        if (this.rdfUpgradeRequired()) this.rdfUpgrade();
        
        // store version everytime to recognize downgrades later
        this.storeRDFVersion();
            
//         this.refreshAccountInfo();
//         if (vI_notificationBar) vI_notificationBar.dump("## vI_rdfDatasource init done.\n");
    },
	
    _openRdfDataSource: function() {
//         if (!this._rdfFileName || this._rdfDataSource);
        var protoHandler = Components.classes["@mozilla.org/network/protocol;1?name=file"]
            .getService(Components.interfaces.nsIFileProtocolHandler)
        var newFile = Components.classes["@mozilla.org/file/local;1"]
                    .createInstance(Components.interfaces.nsILocalFile);
        
        var file = Components.classes["@mozilla.org/file/directory_service;1"]
            .getService(Components.interfaces.nsIProperties)
            .get("ProfD", Components.interfaces.nsIFile);
        var delimiter = (file.path.match(/\\/))?"\\":"/";

        newFile.initWithPath(file.path + delimiter + this._rdfFileName);
        var fileURI = protoHandler.newFileURI(newFile);

        if (vI_notificationBar) vI_notificationBar.dump("## vI_rdfDatasource init: read rdf from '" + fileURI.spec + "'\n");

        this._rdfDataSource =
            this._rdfService.GetDataSourceBlocking(fileURI.spec);
            
//         if (vI_notificationBar) vI_notificationBar.dump("## vI_rdfDatasource read rdf from '" + fileURI.spec + "' done." + this._rdfService + "\n");
    },
    
	_initContainers: function() {
		try {	// will possibly fail before upgrade
			var storageRes = this._rdfService
				.GetResource(this._rdfNS + this._rdfNSEmail);
			this._emailContainer.Init(this._rdfDataSource, storageRes);
			storageRes = this._rdfService
				.GetResource(this._rdfNS + this._rdfNSMaillist);
			this._maillistContainer.Init(this._rdfDataSource, storageRes);
			storageRes = this._rdfService
				.GetResource(this._rdfNS + this._rdfNSNewsgroup);
			this._newsgroupContainer.Init(this._rdfDataSource, storageRes);
			storageRes = this._rdfService
				.GetResource(this._rdfNS + this._rdfNSFilter);
			this._filterContainer.Init(this._rdfDataSource, storageRes);
            storageRes = this._rdfService
                .GetResource(this._rdfNS + this._rdfNSIdentities);
            this._identityContainer.Init(this._rdfDataSource, storageRes);
            storageRes = this._rdfService
                .GetResource(this._rdfNS + this._rdfNSSMTPservers);
            this._smtpContainer.Init(this._rdfDataSource, storageRes);
		} catch (e) { };
	},

    // ******************************************************************************************
    // **************    BEGIN RDF UPGRADE CODE    **********************************************
	rdfUpgradeRequired: function() {
		var oldRdfVersion = this.getCurrentRDFFileVersion();
		var versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
			.getService(Components.interfaces.nsIVersionComparator);
		return (!oldRdfVersion || versionChecker.compare(oldRdfVersion, this.rdfVersion) < 0)
	},
    // **************    RDF UPGRADE CODE    ****************************************************
	extUpgradeRequired: function() {
		var oldExtVersion = this.getCurrentExtFileVersion()
		var versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
			.getService(Components.interfaces.nsIVersionComparator);
		// seamonkey doesn't have a extensionmanager, so read version of extension from hidden version-label
		// var extVersion = this.extensionManager.getItemForID(this._virtualIdentityID).version
		var extVersion = document.getElementById("extVersion").getAttribute("value");
		return (!oldExtVersion || versionChecker.compare(oldExtVersion, extVersion) < 0)	
	},
    // **************    RDF UPGRADE CODE    ****************************************************
    rdfUpgrade : function() {
        var currentVersion = this.getCurrentRDFFileVersion();
        if (vI_notificationBar) vI_notificationBar.dump("checking for previous version of rdf, found " + 
            currentVersion + "\nrdf-upgrade required.\n")
        switch (currentVersion) {
            case null:
            case "0.0.1":
            case "0.0.2":
                this._createRDFContainers(); // no break
            case "0.0.3":
                this._tagDefaultSMTP();
            case "0.0.4":
            default:
                this._createAccountInfoContainers();
        }
        this.storeRDFVersion();
        if (vI_notificationBar) vI_notificationBar.dump("rdf-upgrade to " + this.getCurrentRDFFileVersion() + " done.\n\n");
    },
    // **************    RDF UPGRADE CODE    ****************************************************
    // only used for upgrade to 0.0.3 - loop through all ressources.
    _transferAllResources : function () {
        if (vI_notificationBar) vI_notificationBar.dump("upgrade: transferAllResources ");
        var enumerator = this._rdfDataSource.GetAllResources();
        while (enumerator && enumerator.hasMoreElements()) {
            var resource = enumerator.getNext();
            resource.QueryInterface(Components.interfaces.nsIRDFResource);
            
            var type; var name;
            if (resource.ValueUTF8.match(new RegExp(this._rdfNS + this._rdfNSEmail + "/", "i")))
                { type = "email"; name = RegExp.rightContext }
            else if (resource.ValueUTF8.match(new RegExp(this._rdfNS + this._rdfNSNewsgroup + "/", "i")))
                { type = "newsgroup"; name = RegExp.rightContext }
            else if (resource.ValueUTF8.match(new RegExp(this._rdfNS + this._rdfNSMaillist + "/", "i")))
                { type = "maillist"; name = RegExp.rightContext }
            else continue;
            
            var container = this.getContainer(type);
            this._setRDFValue(resource, "name", name);
            
            if (container.IndexOf(resource) == -1) container.AppendElement(resource);
        
            if (vI_notificationBar) vI_notificationBar.dump(".");
        }
        if (vI_notificationBar) vI_notificationBar.dump("\n");
    },
    // **************    RDF UPGRADE CODE    ****************************************************
    _tagDefaultSMTP: function() {
        if (vI_notificationBar) vI_notificationBar.dump("upgrade: tagDefaultSMTP ");
        for each (treeType in Array("email", "maillist", "newsgroup", "filter")) {
            var enumerator = this.getContainer(treeType).GetElements();
            while (enumerator && enumerator.hasMoreElements()) {
                var resource = enumerator.getNext();
                resource.QueryInterface(Components.interfaces.nsIRDFResource);
                var smtp = this._getRDFValue(resource, "smtp")
                if (!smtp || smtp == "") this._setRDFValue(resource, "smtp", vI_DEFAULT_SMTP_TAG);
                if (vI_notificationBar) vI_notificationBar.dump(".");
            }
        }
        if (vI_notificationBar) vI_notificationBar.dump("\n");
    },
    // **************    RDF UPGRADE CODE    ****************************************************
    _createAccountInfoContainers: function() {
        if (vI_notificationBar) vI_notificationBar.dump("upgrade: createAccountInfoContainers \n");
        var rdfContainerUtils = Components.classes["@mozilla.org/rdf/container-utils;1"].
            getService(Components.interfaces.nsIRDFContainerUtils);
        
        var accountRes = this._rdfService
            .GetResource(this._rdfNS + this._rdfNSAccounts);
        var identityRes = this._rdfService
            .GetResource(this._rdfNS + this._rdfNSIdentities);
        var smtpRes = this._rdfService
            .GetResource(this._rdfNS + this._rdfNSSMTPservers);
        this._setRDFValue(accountRes, "name", "Accounts");
        this._setRDFValue(identityRes, "name", "Identities");
        this._setRDFValue(smtpRes, "name", "SMTP-Server");
        
        rdfContainerUtils.MakeBag(this._rdfDataSource, accountRes);
        rdfContainerUtils.MakeBag(this._rdfDataSource, identityRes);
        rdfContainerUtils.MakeBag(this._rdfDataSource, smtpRes);

        var accountContainer = Components.classes["@mozilla.org/rdf/container;1"].
            createInstance(Components.interfaces.nsIRDFContainer);
        
        // initialize container with accountRes
        accountContainer.Init(this._rdfDataSource, accountRes);
        // append all new containers to accountRes
        if (accountContainer.IndexOf(identityRes) == -1) accountContainer.AppendElement(identityRes);
        if (accountContainer.IndexOf(smtpRes) == -1) accountContainer.AppendElement(smtpRes);
        
        this._initContainers();
        this.refreshAccountInfo();
    },
    // **************    RDF UPGRADE CODE    ****************************************************
    _createRDFContainers: function() {
        if (vI_notificationBar) vI_notificationBar.dump("upgrade: createRDFContainers ");
        var rdfContainerUtils = Components.classes["@mozilla.org/rdf/container-utils;1"].
            getService(Components.interfaces.nsIRDFContainerUtils);

        var storageRes = this._rdfService
            .GetResource(this._rdfNS + this._rdfNSStorage);
        var emailRes = this._rdfService
            .GetResource(this._rdfNS + this._rdfNSEmail);
        var maillistRes = this._rdfService
            .GetResource(this._rdfNS + this._rdfNSMaillist);
        var newsgroupRes = this._rdfService
            .GetResource(this._rdfNS + this._rdfNSNewsgroup);
        var filterRes = this._rdfService
            .GetResource(this._rdfNS + this._rdfNSFilter);
        this._setRDFValue(emailRes, "name", "E-Mail");
        this._setRDFValue(maillistRes, "name", "Mailing-List");
        this._setRDFValue(newsgroupRes, "name", "Newsgroup");
        this._setRDFValue(filterRes, "name", "Filter");

        rdfContainerUtils.MakeBag(this._rdfDataSource, storageRes);
        rdfContainerUtils.MakeBag(this._rdfDataSource, emailRes);
        rdfContainerUtils.MakeBag(this._rdfDataSource, maillistRes);
        rdfContainerUtils.MakeBag(this._rdfDataSource, newsgroupRes);
        // use a sequence for the filters, order does matter
        rdfContainerUtils.MakeSeq(this._rdfDataSource, filterRes);
        
        var container = Components.classes["@mozilla.org/rdf/container;1"].
            createInstance(Components.interfaces.nsIRDFContainer);
        
        // initialize container with storageRes
        container.Init(this._rdfDataSource, storageRes);
        // append all new containers to storageRes
        if (container.IndexOf(emailRes) == -1) container.AppendElement(emailRes);
        if (container.IndexOf(maillistRes) == -1) container.AppendElement(maillistRes);
        if (container.IndexOf(newsgroupRes) == -1) container.AppendElement(newsgroupRes);
        if (container.IndexOf(filterRes) == -1) container.AppendElement(filterRes);
        
        this._initContainers();
        
        this._transferAllResources();
    },
    // **************    END RDF UPGRADE CODE    ************************************************
    // ******************************************************************************************
        
    getCurrentRDFFileVersion: function() {
		return this._getRDFValue(
			this._rdfService.GetResource(this._rdfNS + "virtualIdentity"), "rdfVersion");
	},
	
	getCurrentExtFileVersion: function() {
		return this._getRDFValue(
			this._rdfService.GetResource(this._rdfNS + "virtualIdentity"), "version");
	},
	
	storeRDFVersion: function() {
		this._setRDFValue(
			this._rdfService.GetResource(this._rdfNS + "virtualIdentity"), "rdfVersion",
			this._rdfVersion);
		this._flush();
	},
	
	storeExtVersion: function() {
		// seamonkey doesn't have a extensionmanager, so read version of extension from hidden version-label
		// var extVersion = this.extensionManager.getItemForID(this._virtualIdentityID).version
		var extVersion = document.getElementById("extVersion").getAttribute("value");
		this._setRDFValue(
			this._rdfService.GetResource(this._rdfNS + "virtualIdentity"), "version", extVersion)
		this._flush();
	},

    clean : function() {
        this.AccountManagerObserver.unregister();
        this._flush();
    },

	_flush : function() {
		this._rdfDataSource.QueryInterface(Components.interfaces.nsIRDFRemoteDataSource);
		this._rdfDataSource.Flush();
	},
	
	refreshAccountInfo : function() {
        try {   // will possibly fail before upgrade
            this.cleanAccountInfo(); this.storeAccountInfo();
        } catch (e) {};
    },
	
	cleanAccountInfo : function() {
        if (vI_notificationBar) vI_notificationBar.dump("## vI_rdfDatasource: cleanAccountInfo\n");
        
        var enumerator = this._identityContainer.GetElements();
        while (enumerator && enumerator.hasMoreElements()) {
            var resource = enumerator.getNext();
            resource.QueryInterface(Components.interfaces.nsIRDFResource);
            this._unsetRDFValue(resource, "identityName", this._getRDFValue(resource, "identityName"))
            this._unsetRDFValue(resource, "fullName", this._getRDFValue(resource, "fullName"))
            this._unsetRDFValue(resource, "email", this._getRDFValue(resource, "email"))
            this._identityContainer.RemoveElement(resource, false);
        }

        enumerator = this._smtpContainer.GetElements();
        while (enumerator && enumerator.hasMoreElements()) {
            var resource = enumerator.getNext();
            resource.QueryInterface(Components.interfaces.nsIRDFResource);
            this._unsetRDFValue(resource, "label", this._getRDFValue(resource, "label"))
            this._unsetRDFValue(resource, "hostname", this._getRDFValue(resource, "hostname"))
            this._unsetRDFValue(resource, "username", this._getRDFValue(resource, "username"))
            this._smtpContainer.RemoveElement(resource, false);
        }    
    },
	
    getRelevantIDs : function() {
        var relevantIDs = new Object();
        // search relevant Identities
        for each (treeType in Array("email", "maillist", "newsgroup", "filter")) {
            var enumerator = this.getContainer(treeType).GetElements();
            while (enumerator && enumerator.hasMoreElements()) {
                var resource = enumerator.getNext();
                resource.QueryInterface(Components.interfaces.nsIRDFResource);
                var id = this._getRDFValue(resource, "id")
                if (id) {
                    if (!relevantIDs[id]) relevantIDs[id] = 1; else relevantIDs[id] += 1;
                }
            }
        }
        return relevantIDs;
    },
    
	searchIdentityMismatch : function() {
        if (vI_notificationBar) vI_notificationBar.dump("## vI_rdfDatasource: searchIdentityMismatch");

        var relevantIDs = this.getRelevantIDs();
        var mismatchIDs = [];
        
        var AccountManager = Components.classes["@mozilla.org/messenger/account-manager;1"]
            .getService(Components.interfaces.nsIMsgAccountManager);
        for (var id in relevantIDs) {
            var found = false;
            for (var i = 0; i < AccountManager.accounts.Count(); i++) {
                var account = AccountManager.accounts.GetElementAt(i)
                    .QueryInterface(Components.interfaces.nsIMsgAccount);
                for (var j = 0; j < account.identities.Count(); j++) {
                    var identity = account.identities.GetElementAt(j).QueryInterface(Components.interfaces.nsIMsgIdentity);
                    if (id == identity.key) { found = true; break; }
                }
                if (found) break;
            }
            var resource = this._rdfService.GetResource(this._rdfNS + this._rdfNSIdentities + "/" + id);
            var rdfIdentityName = this._getRDFValue(resource, "identityName");
            var rdfEmail = this._getRDFValue(resource, "email");
            var rdfFullName = this._getRDFValue(resource, "fullName")
            
            if ( !found || rdfIdentityName != identity.identityName && rdfEmail != identity.email)
            mismatchIDs.push( { oldkey: id, label : rdfIdentityName, ext1: rdfEmail, ext2: rdfFullName, count: relevantIDs[id], key: "" } )
        }
        if (mismatchIDs.length > 0) {
            if (vI_notificationBar) vI_notificationBar.dump(" found mismatches on id(s).\n");
            
            window.openDialog("chrome://v_identity/content/vI_rdfAccountMismatchDialog.xul",0,
                    "chrome, dialog, modal, alwaysRaised, resizable=yes", "identity", mismatchIDs,
                    /* callback chance: */ this).focus();
            return true;
        }
        else {
            if (vI_notificationBar) vI_notificationBar.dump(" found no mismatch\n");
            return false;
        }
    },
	
	repairAccountMismatch : function(type, mismatchItems) {
        var keyField = (type == "identity")?"id":"smtp" // field to change is 'id' or 'smtp' dependent on type
        for (var i = 0; i < mismatchItems.length; i++) {
            if (vI_notificationBar) vI_notificationBar.dump("## vI_rdfDatasource: repairAccountMismatch change " + mismatchItems[i].oldkey + " into " + mismatchItems[i].key + ": ");
            // search relevant Identities
            for each (treeType in Array("email", "maillist", "newsgroup", "filter")) {
                var enumerator = this.getContainer(treeType).GetElements();
                while (enumerator && enumerator.hasMoreElements()) {
                    var resource = enumerator.getNext();
                    resource.QueryInterface(Components.interfaces.nsIRDFResource);
                    if (this._getRDFValue(resource, keyField) == mismatchItems[i].oldkey) {
                        if (mismatchItems[i].key == "") this._unsetRDFValue(resource, keyField, mismatchItems[i].oldkey)
                        else this._setRDFValue(resource, keyField, mismatchItems[i].key)
                        if (vI_notificationBar) vI_notificationBar.dump(".");
                    }
                }
            }
            if (vI_notificationBar) vI_notificationBar.dump("\n");
        }
    },
	
    getRelevantSMTPs : function() {
        var relevantSMTPs = new Object();
        // search relevant SMTPs
        for each (treeType in Array("email", "maillist", "newsgroup", "filter")) {
            var enumerator = this.getContainer(treeType).GetElements();
            while (enumerator && enumerator.hasMoreElements()) {
                var resource = enumerator.getNext();
                resource.QueryInterface(Components.interfaces.nsIRDFResource);
                var smtp = this._getRDFValue(resource, "smtp")
                if (smtp && smtp != vI_DEFAULT_SMTP_TAG) {
                    if (!relevantSMTPs[smtp]) relevantSMTPs[smtp] = 1; else relevantSMTPs[smtp] += 1;
                }
            }
        }
        return relevantSMTPs;
    },
    
    searchSmtpMismatch : function() {
        if (vI_notificationBar) vI_notificationBar.dump("## vI_rdfDatasource: searchSmtpMismatch");

        var relevantSMTPs = this.getRelevantSMTPs();
        var mismatchSMTPs = [];
        
        for (var smtp in relevantSMTPs) {
            var servers = Components.classes["@mozilla.org/messengercompose/smtp;1"]
                .getService(Components.interfaces.nsISmtpService).smtpServers;
            var found = false;
            if (typeof(servers.Count) == "undefined")       // TB 3.x
                while (servers && servers.hasMoreElements()) {
                    var server = servers.getNext();
                    if (server instanceof Components.interfaces.nsISmtpServer && 
                        !server.redirectorType && smtp == server.key) {
                        found = true; break;
                    }
                }
            else                            // TB 2.x
                for (var i=0 ; i < servers.Count(); i++) {
                    var server = servers.QueryElementAt(i,Components.interfaces.nsISmtpServer);
                    if (!server.redirectorType && smtp == server.key) {
                        found = true; break;
                    }
                }
            var resource = this._rdfService.GetResource(this._rdfNS + this._rdfNSSMTPservers + "/" + smtp);
            var rdfSMTPlabel = this._getRDFValue(resource, "label");
            var rdfHostname = this._getRDFValue(resource, "hostname");
            var rdfUsername = this._getRDFValue(resource, "username")
            if (!found || rdfSMTPlabel != (server.description?server.description:server.hostname) && rdfHostname != server.hostname)
                    mismatchSMTPs.push( { oldkey: smtp, label : rdfSMTPlabel, ext1: rdfHostname, ext2: rdfUsername, count: relevantSMTPs[smtp], key: "" } )
        }
        if (mismatchSMTPs.length > 0) {
            if (vI_notificationBar) vI_notificationBar.dump(" found mismatches on smtp(s).\n");
            window.openDialog("chrome://v_identity/content/vI_rdfAccountMismatchDialog.xul",0,
                    "chrome, dialog, modal, alwaysRaised, resizable=yes", "smtp", mismatchSMTPs,
                    /* callback: */ this).focus();
            return true;
        }
        else {
            if (vI_notificationBar) vI_notificationBar.dump(" found no mismatch\n");
            return false;
        }
    },

    storeAccountInfo : function() {
        if (vI_notificationBar) vI_notificationBar.dump("## vI_rdfDatasource: storeAccounts\n");

        var AccountManager = Components.classes["@mozilla.org/messenger/account-manager;1"]
            .getService(Components.interfaces.nsIMsgAccountManager);
        for (var i = 0; i < AccountManager.accounts.Count(); i++) {
            var account = AccountManager.accounts.QueryElementAt(i, Components.interfaces.nsIMsgAccount);
            for (var j = 0; j < account.identities.Count(); j++) {
                var identity = account.identities.QueryElementAt(j, Components.interfaces.nsIMsgIdentity);
//                 if (vI_notificationBar) vI_notificationBar.dump("## vI_rdfDatasource: storeAccounts identity store id " + identity.key + "\n");

                var resource = this._rdfService.GetResource(this._rdfNS + this._rdfNSIdentities + "/" + identity.key);
                this._setRDFValue(resource, "identityName", identity.identityName);
                this._setRDFValue(resource, "fullName", identity.fullName);
                this._setRDFValue(resource, "email", identity.email);
                
                var position = this._identityContainer.IndexOf(resource); // check for index in new recType
                if (position != -1) this._identityContainer.InsertElementAt(resource, position, false);
                else this._identityContainer.AppendElement(resource);
            }
        }
        
        function storeSmtp(server, parent) {
//             if (vI_notificationBar) vI_notificationBar.dump("## vI_rdfDatasource: storeAccounts smtp store id " + server.key + "\n");
            var resource = parent._rdfService.GetResource(parent._rdfNS + parent._rdfNSSMTPservers + "/" + server.key);
            parent._setRDFValue(resource, "label", (server.description?server.description:server.hostname));
            parent._setRDFValue(resource, "hostname", server.hostname);
            parent._setRDFValue(resource, "username", server.username);
            var position = parent._smtpContainer.IndexOf(resource); // check for index in new recType
            if (position != -1) parent._smtpContainer.InsertElementAt(resource, position, false);
            else parent._smtpContainer.AppendElement(resource);
        }
        
        var servers = Components.classes["@mozilla.org/messengercompose/smtp;1"]
            .getService(Components.interfaces.nsISmtpService).smtpServers;
        if (typeof(servers.Count) == "undefined")       // TB 3.x
            while (servers && servers.hasMoreElements()) {
                var server = servers.getNext(); 
                if (server instanceof Components.interfaces.nsISmtpServer && !server.redirectorType) storeSmtp(server, this);
            }
        else                            // TB 2.x
            for (var i=0 ; i<servers.Count(); i++) storeSmtp(servers.QueryElementAt(i, Components.interfaces.nsISmtpServer), this);

//         if (vI_notificationBar) vI_notificationBar.dump("## vI_rdfDatasource: storeAccounts done\n");
    },

    export : function(rdfFileName) {
        var filePicker = Components.classes["@mozilla.org/filepicker;1"]
            .createInstance(Components.interfaces.nsIFilePicker);
        filePicker.init(window, "", Components.interfaces.nsIFilePicker.modeSave);
        filePicker.appendFilters(Components.interfaces.nsIFilePicker.filterAll | Components.interfaces.nsIFilePicker.filterText );
        filePicker.appendFilter("RDF Files","*.rdf");
        
        if (filePicker.show() != Components.interfaces.nsIFilePicker.returnCancel) {
            var rdfDataFile = Components.classes["@mozilla.org/file/local;1"]
                .createInstance(Components.interfaces.nsILocalFile);
            var file = Components.classes["@mozilla.org/file/directory_service;1"]
                .getService(Components.interfaces.nsIProperties).get("ProfD", Components.interfaces.nsIFile);
            var delimiter = (file.path.match(/\\/))?"\\":"/";
            rdfDataFile.initWithPath(file.path + delimiter + rdfFileName);

            rdfDataFile.copyTo(filePicker.file.parent,filePicker.file.leafName);
        }
    },
    
    _getRDFResourceForVIdentity : function (recDescription, recType) {
		if (!this._rdfDataSource) return null;
		if (!recDescription) {
			if (vI_notificationBar) vI_notificationBar.dump("## vI_rdfDatasource: _getRDFResourceForVIdentity: no Recipient given.\n");
			return null;
		}
		var _rdfNSRecType = null
		switch (recType) {
			case "email": _rdfNSRecType = this._rdfNSEmail; break;
			case "newsgroup" : _rdfNSRecType = this._rdfNSNewsgroup; break;
			case "maillist" : _rdfNSRecType = this._rdfNSMaillist; break;
			case "filter" : _rdfNSRecType = this._rdfNSFilter; break;
		}
		return this._rdfService.GetResource(this._rdfNS + _rdfNSRecType + "/" + recDescription);
        
        
	},
	
	removeVIdentityFromRDF : function (resource, recType) {
// 		if (vI_notificationBar) vI_notificationBar.dump("## vI_rdfDatasource: removeVIdentityFromRDF " + resource.ValueUTF8 + ".\n");
		this._unsetRDFValue(resource, "email", this._getRDFValue(resource, "email"))
		this._unsetRDFValue(resource, "fullName", this._getRDFValue(resource, "fullName"))
		this._unsetRDFValue(resource, "id", this._getRDFValue(resource, "id"))
		this._unsetRDFValue(resource, "smtp", this._getRDFValue(resource, "smtp"))
		this._unsetRDFValue(resource, "name", this._getRDFValue(resource, "name"))
		
        var extras = new vI_storageExtras(this, resource);
        extras.loopForRDF(this, resource, "unset");
        this.getContainer(recType).RemoveElement(resource, true);
	},
	
	_unsetRDFValue : function (resource, field, value) {
// 		if (vI_notificationBar) vI_notificationBar.dump("## vI_rdfDatasource _unsetRDFValue " + this._rdfService  + " " + this._rdfDataSource + "\n");
        var predicate = this._rdfService.GetResource(this._rdfNS + "rdf#" + field);
		var name = this._rdfService.GetLiteral(value?value:"");
		var target = this._rdfDataSource.GetTarget(resource, predicate, true);
		if (target instanceof Components.interfaces.nsIRDFLiteral) {
			this._rdfDataSource.Unassert(resource, predicate, name, true);
            return null;
        }
        else return value;
	},
	
	// this will be used from rdfDataTree to get all RDF values, callFunction is vI_rdfDataTree.__addNewDatum
	readAllEntriesFromRDF : function (addNewDatum, treeType, idData) {
// 		if (vI_notificationBar) vI_notificationBar.dump("## vI_rdfDatasource: readAllEntriesFromRDF " + this._rdfService  + " " + this._rdfDataSource + " " + this + "\n");
		var enumerator = this.getContainer(treeType).GetElements();
		while (enumerator && enumerator.hasMoreElements()) {
			var resource = enumerator.getNext();
			resource.QueryInterface(Components.interfaces.nsIRDFResource);
			var name = this._getRDFValue(resource, "name")
			var email = this._getRDFValue(resource, "email")
			var fullName = this._getRDFValue(resource, "fullName")
			var id = this._getRDFValue(resource, "id")
			var smtp = this._getRDFValue(resource, "smtp")
			if (!smtp) smtp = vI_NO_SMTP_TAG;
			var extras = new vI_storageExtras(this, resource);
			
			var localIdentityData = new vI_identityData(email, fullName, id, smtp, extras)
			addNewDatum (resource, name, localIdentityData, idData)
		}
	},
	
	findMatchingFilter : function (recDescription) {
		if (vI_notificationBar) vI_notificationBar.dump("## vI_rdfDatasource: findMatchingFilter for " + recDescription + ".\n");
		var enumerator = this._filterContainer.GetElements();
		while (enumerator && enumerator.hasMoreElements()) {
			var resource = enumerator.getNext();
			resource.QueryInterface(Components.interfaces.nsIRDFResource);
			var filter = this._getRDFValue(resource, "name");
			
			const filterType = { None : 0, RegExp : 1, StrCmp : 2 }
			var recentfilterType;

			if (filter == "") continue;
			if (/^\/(.*)\/$/.exec(filter))
				{ if (vI_notificationBar) vI_notificationBar.dump("## vI_rdfDatasource: findMatchingFilter with RegExp '"
					+ filter.replace(/\\/g,"\\\\") + "'\n"); recentfilterType = filterType.RegExp; }
			else	{ if (vI_notificationBar) vI_notificationBar.dump("## vI_rdfDatasource: findMatchingFilter, compare with '"
					+ filter + "'\n"); recentfilterType = filterType.StrCmp; }
			
			switch (recentfilterType) {
				case filterType.RegExp:
					try { 	/^\/(.*)\/$/.exec(filter);
						if (recDescription.match(new RegExp(RegExp.$1,"i"))) {
							if (vI_notificationBar) vI_notificationBar.dump("## vI_rdfDatasource: findMatchingFilter found stored data.\n");
							return this._readVIdentityFromRDF(resource);
						}
					}
					catch(vErr) { }; break;
				case filterType.StrCmp:
					if (recDescription.toLowerCase().indexOf(filter.toLowerCase()) != -1) {
						if (vI_notificationBar) vI_notificationBar.dump("## vI_rdfDatasource: findMatchingFilter found stored data.\n");
						return this._readVIdentityFromRDF(resource);
					}
					break;
			}
		}
		if (vI_notificationBar) vI_notificationBar.dump("## vI_rdfDatasource: findMatchingFilter no match found.\n");
		return null;
	},
	
	readVIdentityFromRDF : function (recDescription, recType) {
		var email = this._rdfService.GetResource(this._rdfNS + "rdf#email");
		var resource = this._getRDFResourceForVIdentity(recDescription, recType);
		if (!resource) return null;
		if (!this._rdfDataSource.hasArcOut(resource, email)) {
			// no data available --> give up.
			if (vI_notificationBar) vI_notificationBar.dump("## vI_rdfDatasource: readVIdentityFromRDF no data found.\n");
			return null;
		}
		if (vI_notificationBar) vI_notificationBar.dump("## vI_rdfDatasource: readVIdentityFromRDF found stored data.\n");
		
		return this._readVIdentityFromRDF(resource);
	},
	
	_readVIdentityFromRDF : function (resource) {
		var email = this._getRDFValue(resource, "email")
		var fullName = this._getRDFValue(resource, "fullName")
		var id = this._getRDFValue(resource, "id")
		var smtp = this._getRDFValue(resource, "smtp")
		if (!smtp) smtp = vI_NO_SMTP_TAG;
		
		if (vI_notificationBar) vI_notificationBar.dump("## vI_rdfDatasource: email='" + email + 
			"' fullName='" + fullName + "' id='" + id + "' smtp='" + smtp + "'\n");
		
		var extras = new vI_storageExtras(this, resource);
		if (vI_notificationBar) vI_notificationBar.dump("## vI_rdfDatasource: extras:" + extras.status() + "\n");
		
		var localIdentityData = new vI_identityData(email, fullName, id, smtp, extras)
		return localIdentityData;
	},

	_getRDFValue : function (resource, field) {
//         if (vI_notificationBar) vI_notificationBar.dump("## vI_rdfDatasource _getRDFValue " + this._rdfService  + " " + this._rdfDataSource + " " + this + "\n");
		var predicate = this._rdfService.GetResource(this._rdfNS + "rdf#" + field);
		var target = this._rdfDataSource.GetTarget(resource, predicate, true);
		if (target instanceof Components.interfaces.nsIRDFLiteral) return target.Value
		else return null;
	},
	
	updateRDFFromVIdentity : function(recDescription, recType) {
		this.updateRDF(recDescription, recType,
			document.getElementById("msgIdentity_clone").identityData,
			(vI_statusmenu.objSaveBaseIDMenuItem.getAttribute("checked") == "true"),
			(vI_statusmenu.objSaveSMTPMenuItem.getAttribute("checked") == "true"),
			null, null);
	},
	
	removeRDF : function (recDescription, recType) {
		var resource = this._getRDFResourceForVIdentity(recDescription, recType);
		if (!resource) return null;
		this.removeVIdentityFromRDF(resource, recType);
		return resource;
	},

	updateRDF : function (recDescription, recType, localIdentityData, storeBaseID, storeSMTP, prevRecDescription, prevRecType) {
//         if (vI_notificationBar) vI_notificationBar.dump("## vI_rdfDatasource (" + this._rdfNS + "): updateRDF recDescription=" + recDescription + " localIdentityData.email=" + localIdentityData.email + ".\n");
        
// 		if (!localIdentityData.email) {
// 			if (vI_notificationBar) vI_notificationBar.dump("## vI_rdfDatasource: updateRDF: no Sender-email for Recipient, aborting.\n");
// 			return;
// 		}
		if (!recDescription || recDescription.length == 0) return;

		if (!prevRecDescription) prevRecDescription = recDescription;
		if (!prevRecType) prevRecType = recType;

		var resource = this._getRDFResourceForVIdentity(prevRecDescription, prevRecType);
		if (!resource) return;
// 		if (vI_notificationBar) vI_notificationBar.dump("## vI_rdfDatasource: updateRDF " + resource.ValueUTF8 + ".\n");
		
		var position = this.getContainer(recType).IndexOf(resource); // check for index in new recType
		this.removeVIdentityFromRDF(resource, prevRecType);
        
        resource = this._getRDFResourceForVIdentity(recDescription, recType);

		this._setRDFValue(resource, "email", localIdentityData.email);
		this._setRDFValue(resource, "fullName", localIdentityData.fullName);
		if (storeBaseID)
			this._setRDFValue(resource, "id", localIdentityData.id.key);
		else	this._unsetRDFValue(resource, "id", this._getRDFValue(resource, "id"))
		if (storeSMTP && localIdentityData.smtp.key != vI_NO_SMTP_TAG)
			this._setRDFValue(resource, "smtp", localIdentityData.smtp.key);
		else	this._unsetRDFValue(resource, "smtp", this._getRDFValue(resource, "smtp"))
        this._setRDFValue(resource, "name", recDescription);
 
        localIdentityData.extras.loopForRDF(this, resource, "set");
		
		if (vI_notificationBar) vI_notificationBar.dump("## vI_rdfDatasource: updateRDF add " + resource.ValueUTF8 + " at position " + position + ".\n");
        if (position != -1) this.getContainer(recType).InsertElementAt(resource, position, true);
		else this.getContainer(recType).AppendElement(resource);
	},

	_setRDFValue : function (resource, field, value) {
// 		if (vI_notificationBar) vI_notificationBar.dump("## vI_rdfDatasource: _setRDFValue " + resource.ValueUTF8 + " " + field + " " + value + ".\n");
		if (!value) return value; // return if some value was not set.
// 		if (vI_notificationBar) vI_notificationBar.dump("## vI_rdfDatasource _setRDFValue " + this._rdfService + " " + this._rdfDataSource + "\n");
        var predicate = this._rdfService.GetResource(this._rdfNS + "rdf#" + field);
		var name = this._rdfService.GetLiteral(value);
		var target = this._rdfDataSource.GetTarget(resource, predicate, true);
		
		if (target instanceof Components.interfaces.nsIRDFLiteral)
			this._rdfDataSource.Change(resource, predicate, target, name);
		else	this._rdfDataSource.Assert(resource, predicate, name, true);
        return value;
	},
    
    //  code adapted from http://xulsolutions.blogspot.com/2006/07/creating-uninstall-script-for.html
    AccountManagerObserver : {
        _uninstall : false,
        observe : function(subject, topic, data) {
            if (topic == "am-smtpChanges" || topic == "am-acceptChanges") {
                if (vI_notificationBar) vI_notificationBar.dump("## vI_rdfDatasource: account/smtp changes observed\n");
                this.searchIdentityMismatch();
                this.searchSmtpMismatch();
                this.refreshAccountInfo();
            }
        },
        register : function() {
            if (vI_notificationBar) vI_notificationBar.dump("## vI_rdfDatasource: register AccountManagerObserver\n");
            var obsService = Components.classes["@mozilla.org/observer-service;1"].
                getService(Components.interfaces.nsIObserverService)
            obsService.addObserver(this, "am-smtpChanges", false);
            obsService.addObserver(this, "am-acceptChanges", false);
        },
        unregister : function() {
            var obsService = Components.classes["@mozilla.org/observer-service;1"].
                getService(Components.interfaces.nsIObserverService)
            try {
                obsService.removeObserver(this, "am-smtpChanges");
                obsService.removeObserver(this, "am-acceptChanges");
            } catch(e) { };
        }
    }
}

// create with name of the file to import into
function vI_rdfDatasourceImporter(rdfFileName) {
    this._rdfFileName = rdfFileName;
    if (this._rdfFileName) this.import();
}

vI_rdfDatasourceImporter.prototype = {
    _rdfService :       Components.classes["@mozilla.org/rdf/rdf-service;1"]
                            .getService(Components.interfaces.nsIRDFService),
    _rdfDataSource :    null,
    _rdfFileName :      null,
    _rdfImportDataSource :    null,

    _getMatchingIdentity : function(name, email, fullName) {
        var AccountManager = Components.classes["@mozilla.org/messenger/account-manager;1"]
            .getService(Components.interfaces.nsIMsgAccountManager);
        for (var i = 0; i < AccountManager.accounts.Count(); i++) {
            var account = AccountManager.accounts.QueryElementAt(i, Components.interfaces.nsIMsgAccount);
            for (var j = 0; j < account.identities.Count(); j++) {
                var identity = account.identities.QueryElementAt(j, Components.interfaces.nsIMsgIdentity);
                if (name == identity.identityName || (fullName == identity.fullName && email == identity.email)) return identity.key;
            }
        }
        return null;
    },
    
    _getMatchingSMTP : function(label, hostname, username) {
        var servers = Components.classes["@mozilla.org/messengercompose/smtp;1"]
            .getService(Components.interfaces.nsISmtpService).smtpServers;
        if (typeof(servers.Count) == "undefined")       // TB 3.x
            while (servers && servers.hasMoreElements()) {
                var server = servers.getNext(); 
                if (server instanceof Components.interfaces.nsISmtpServer && !server.redirectorType)
                    if (label == (server.description?server.description:server.hostname) || (hostname == server.hostname && username == server.username))
                        return server.key;
            }
        else                            // TB 2.x
            for (var i=0 ; i<servers.Count(); i++)
                if (label == (server.description?server.description:server.hostname) || (hostname == server.hostname && username == server.username))
                        return server.key;
        return null;
    },
    
    _translateRelevantIDs : function() {
        var relevantIDs = this._rdfImportDataSource.getRelevantIDs();
        for (var id in relevantIDs) {
            var resource = this._rdfService.GetResource(this._rdfImportDataSource._rdfNS + this._rdfImportDataSource._rdfNSIdentities + "/" + id);
            var values = { id : null, identityName : null, email : null, fullName : null }
            values.identityName = this._rdfImportDataSource._getRDFValue(resource, "identityName");
            values.email = this._rdfImportDataSource._getRDFValue(resource, "email");
            values.fullName = this._rdfImportDataSource._getRDFValue(resource, "fullName");
            values.id = this._getMatchingIdentity(values.identityName, values.email, values.fullName);
            values.id = values.id?values.id:"import_" + id
            relevantIDs[id] = values;
            if (vI_notificationBar) vI_notificationBar.dump("## vI_rdfDatasourceImporter import: translate relevant ID from previous '" + id + "' to current '" + relevantIDs[id].id + "'\n");
        }
        return relevantIDs;
    },
    
    _storeMappedIDs : function(relevantIDs) {
        for (var id in relevantIDs) {
            if (relevantIDs[id].id == "import_" + id) {
                var resource = this._rdfService
                    .GetResource(this._rdfDataSource._rdfNS + this._rdfDataSource._rdfNSIdentities + "/" + relevantIDs[id].id);
                this._rdfDataSource._setRDFValue(resource, "identityName", relevantIDs[id].identityName);
                this._rdfDataSource._setRDFValue(resource, "fullName", relevantIDs[id].fullName);
                this._rdfDataSource._setRDFValue(resource, "email", relevantIDs[id].email);
                
                var position = this._rdfDataSource._identityContainer.IndexOf(resource); // check for index in new recType
                if (position != -1) this._rdfDataSource._identityContainer.InsertElementAt(resource, position, false);
                else this._rdfDataSource._identityContainer.AppendElement(resource);
            }
        }
    },
    
    _translateRelevantSMTPs : function() {
        var relevantSMTPs = this._rdfImportDataSource.getRelevantSMTPs();
        for (var smtp in relevantSMTPs) {
            var resource = this._rdfService.GetResource(this._rdfImportDataSource._rdfNS + this._rdfImportDataSource._rdfNSSMTPservers + "/" + smtp);
            var values = { smtp : null, label : null, hostname : null, username : null }
            values.label = this._rdfImportDataSource._getRDFValue(resource, "label");
            values.hostname = this._rdfImportDataSource._getRDFValue(resource, "hostname");
            values.username = this._rdfImportDataSource._getRDFValue(resource, "username");
            values.smtp =  this._getMatchingSMTP(values.label, values.hostname, values.username);
            values.smtp = values.smtp?values.smtp:"import_" + smtp;
            relevantSMTPs[smtp] = values;
            if (vI_notificationBar) vI_notificationBar.dump("## vI_rdfDatasourceImporter import: translate relevant SMTP from previous '" + smtp + "' to current '" + relevantSMTPs[smtp].smtp + "'\n");
        }
        return relevantSMTPs;
    },
    
    _storeMappedSMTPs : function(relevantSMTPs) {
        for (var smtp in relevantSMTPs) {
            if (relevantSMTPs[smtp].smtp == "import_" + smtp) {
                var resource = this._rdfService
                    .GetResource(this._rdfDataSource._rdfNS + this._rdfDataSource._rdfNSSMTPservers + "/" + relevantSMTPs[smtp].smtp);
                this._rdfDataSource._setRDFValue(resource, "label", relevantSMTPs[smtp].label);
                this._rdfDataSource._setRDFValue(resource, "hostname", relevantSMTPs[smtp].hostname);
                this._rdfDataSource._setRDFValue(resource, "username", relevantSMTPs[smtp].username);
                
                var position = this._rdfDataSource._smtpContainer.IndexOf(resource); // check for index in new recType
                if (position != -1) this._rdfDataSource._smtpContainer.InsertElementAt(resource, position, false);
                else this._rdfDataSource._smtpContainer.AppendElement(resource);
            }
        }
    },
    
    import : function() {
        var filePicker = Components.classes["@mozilla.org/filepicker;1"]
            .createInstance(Components.interfaces.nsIFilePicker);

        filePicker.init(window, "", Components.interfaces.nsIFilePicker.modeOpen);
        filePicker.appendFilter("RDF Files","*.rdf");
        filePicker.appendFilters(Components.interfaces.nsIFilePicker.filterText | Components.interfaces.nsIFilePicker.filterAll );
        
        if (filePicker.show() == Components.interfaces.nsIFilePicker.returnOK) {
            if (vI_notificationBar) vI_notificationBar.dump("\n## vI_rdfDatasourceImporter IMPORT\n## vI_rdfDatasourceImporter import: preparation:\n");
            
            var importRdfDataFile = Components.classes["@mozilla.org/file/local;1"]
                .createInstance(Components.interfaces.nsILocalFile);
            var file = Components.classes["@mozilla.org/file/directory_service;1"]
                .getService(Components.interfaces.nsIProperties).get("ProfD", Components.interfaces.nsIFile);
            var delimiter = (file.path.match(/\\/))?"\\":"/";
            importRdfDataFile.initWithPath(file.path + delimiter + this._rdfFileName + "_import");
            filePicker.file.copyTo(importRdfDataFile.parent,importRdfDataFile.leafName);

            if (vI_notificationBar) vI_notificationBar.dump("## vI_rdfDatasourceImporter import: copied file from " + filePicker.file.path + " to " + importRdfDataFile.path + "'\n");
            
            // init Datasources
            this._rdfImportDataSource = new vI_rdfDatasource(importRdfDataFile.leafName, true);
            
            // search matching IDs and SMTPs for anyones used in import-file
            var relevantIDs = this._translateRelevantIDs();
            var relevantSMTPs = this._translateRelevantSMTPs();
            
            if (vI_notificationBar) vI_notificationBar.dump("## vI_rdfDatasourceImporter import: preparation done.\n");
            if (vI_notificationBar) vI_notificationBar.dump("## vI_rdfDatasourceImporter import: starting import:\n");

            for each (treeType in Array("email", "maillist", "newsgroup", "filter")) {
                // re-initialize importDataSource to point rdfService to the right Resources
                this._rdfImportDataSource = new vI_rdfDatasource(importRdfDataFile.leafName, true);
                var container = this._rdfImportDataSource.getContainer(treeType)
                if (container.GetCount() == 0) continue;
                if (vI_notificationBar) vI_notificationBar.dump("## vI_rdfDatasourceImporter importing " + treeType + ": " + container.GetCount()+ " datasets from " + this._rdfImportDataSource._rdfDataSource.URI + "\n");
                var enumerator = container.GetElements();
                // re-initialize dataSource to point rdfService to the right Resources
                this._rdfDataSource = new vI_rdfDatasource(this._rdfFileName, true);
                var count = 0;
                while (enumerator.hasMoreElements()) {
                    var resource = enumerator.getNext(); count += 1;
                    resource.QueryInterface(Components.interfaces.nsIRDFResource);
                    if (vI_notificationBar) vI_notificationBar.dump("## " + count + " ");
                    var name = this._rdfImportDataSource._getRDFValue(resource, "name")
                    var email = this._rdfImportDataSource._getRDFValue(resource, "email")
                    var fullName = this._rdfImportDataSource._getRDFValue(resource, "fullName")
                    var id = this._rdfImportDataSource._getRDFValue(resource, "id")
                    id = id?relevantIDs[id].id:null
                    var smtp = this._rdfImportDataSource._getRDFValue(resource, "smtp")
                    smtp = (smtp && smtp != vI_DEFAULT_SMTP_TAG)?relevantSMTPs[smtp].smtp:smtp
                    var extras = new vI_storageExtras(this._rdfImportDataSource, resource);
                    var localIdentityData = new vI_identityData(email, fullName, id, smtp, extras)
                    
                    this._rdfDataSource.updateRDF(name, treeType, localIdentityData, false, false, null, null)
                    var resource = this._rdfDataSource._getRDFResourceForVIdentity(name, treeType);
                    if (id) this._rdfDataSource._setRDFValue(resource, "id", id);       // localIdentityData can only store valid id's, this one might be a temporary invalid id
                    if (smtp) this._rdfDataSource._setRDFValue(resource, "smtp", smtp); // localIdentityData can only store valid smtp's, this one might be a temporary invalid smtp
                }
            }
            
            if (vI_notificationBar) vI_notificationBar.dump("## vI_rdfDatasourceImporter import: removing temporary file " + importRdfDataFile.path + ".\n");
            this._rdfImportDataSource = null; importRdfDataFile.remove(false);
            if (vI_notificationBar) vI_notificationBar.dump("## vI_rdfDatasourceImporter import: import done.\n");
            
            if (vI_notificationBar) vI_notificationBar.dump("## vI_rdfDatasourceImporter import: cleaning ID/SMTP storages:\n");
            this._rdfDataSource = new vI_rdfDatasource(this._rdfFileName, true);
            
            this._storeMappedIDs(relevantIDs);
            this._rdfDataSource.searchIdentityMismatch();
            this._storeMappedSMTPs(relevantSMTPs);
            this._rdfDataSource.searchSmtpMismatch();
            
            this._rdfDataSource.refreshAccountInfo();
            this._rdfDataSource.clean();
            this._rdfDataSource = null;
            if (vI_notificationBar) vI_notificationBar.dump("## vI_rdfDatasourceImporter import: cleaning ID/SMTP storages done.\n");
            if (vI_notificationBar) vI_notificationBar.dump("## vI_rdfDatasourceImporter IMPORT DONE.\n");
        }
    }
}