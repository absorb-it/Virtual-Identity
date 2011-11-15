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

/* this is now used as a module - there is no required reference to any other interface-elements in this code */

virtualIdentityExtension.ns(function() { with (virtualIdentityExtension.LIB) {

Components.utils.import("resource://v_identity/vI_log.js");
let Log = setupLogging("virtualIdentity.rdfDatasource");

function rdfDatasource(rdfFileName, dontRegisterObserver) {
    this._rdfFileName = rdfFileName;
    if (this._rdfFileName) this.init();
    if (!dontRegisterObserver) this.AccountManagerObserver.register();
	let window = Components.classes['@mozilla.org/appshell/window-mediator;1']
        .getService(Components.interfaces.nsIWindowMediator)
        .getMostRecentWindow("mail:3pane");
	this._extVersion = window.virtualIdentityExtension.extensionVersion;
}

rdfDatasource.prototype = {
	_extVersion :		null,
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
    
	_pref : Components.classes["@mozilla.org/preferences-service;1"]
		.getService(Components.interfaces.nsIPrefService)
		.getBranch("extensions.virtualIdentity."),

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
//         Log.debug("## rdfDatasource init.\n");

        this._openRdfDataSource();
        if (!this._rdfDataSource) return;
        this._initContainers();
        if (this.rdfUpgradeRequired()) this.rdfUpgrade();
        
        // store version everytime to recognize downgrades later
        this.storeRDFVersion();
            
//         this.refreshAccountInfo();
//         Log.debug("## rdfDatasource init done.\n");
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

        Log.debug("## rdfDatasource init: read rdf from '" + fileURI.spec + "'\n");

        this._rdfDataSource =
            this._rdfService.GetDataSourceBlocking(fileURI.spec);
            
//         Log.debug("## rdfDatasource read rdf from '" + fileURI.spec + "' done." + this._rdfService + "\n");
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
		return (!oldRdfVersion || versionChecker.compare(oldRdfVersion, this._rdfVersion) < 0)
	},
    // **************    RDF UPGRADE CODE    ****************************************************
	extUpgradeRequired: function() {
		var oldExtVersion = this.getCurrentExtFileVersion()
		var versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
			.getService(Components.interfaces.nsIVersionComparator);
		return (!oldExtVersion || versionChecker.compare(oldExtVersion, this._extVersion) < 0)	
	},
    // **************    RDF UPGRADE CODE    ****************************************************
    rdfUpgrade : function() {
        var currentVersion = this.getCurrentRDFFileVersion();
        Log.debug("checking for previous version of rdf, found " + 
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
        Log.debug("rdf-upgrade to " + this.getCurrentRDFFileVersion() + " done.\n\n");
    },
    // **************    RDF UPGRADE CODE    ****************************************************
    // only used for upgrade to 0.0.3 - loop through all ressources.
    _transferAllResources : function () {
        Log.debug("upgrade: transferAllResources ");
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
        
            Log.debug(".");
        }
        Log.debug("\n");
    },
    // **************    RDF UPGRADE CODE    ****************************************************
    _tagDefaultSMTP: function() {
        Log.debug("upgrade: tagDefaultSMTP ");
        for each (treeType in Array("email", "maillist", "newsgroup", "filter")) {
            var enumerator = this.getContainer(treeType).GetElements();
            while (enumerator && enumerator.hasMoreElements()) {
                var resource = enumerator.getNext();
                resource.QueryInterface(Components.interfaces.nsIRDFResource);
                var smtp = this._getRDFValue(resource, "smtp")
                if (!smtp || smtp == "") this._setRDFValue(resource, "smtp", vI.DEFAULT_SMTP_TAG);
                Log.debug(".");
            }
        }
        Log.debug("\n");
    },
    // **************    RDF UPGRADE CODE    ****************************************************
    _createAccountInfoContainers: function() {
        Log.debug("upgrade: createAccountInfoContainers \n");
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
        Log.debug("upgrade: createRDFContainers ");
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
		this._setRDFValue(
			this._rdfService.GetResource(this._rdfNS + "virtualIdentity"), "version", this._extVersion)
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
        Log.debug("## rdfDatasource: cleanAccountInfo\n");
        
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
        Log.debug("## rdfDatasource: searchIdentityMismatch");

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
            Log.debug(" found mismatches on id(s).\n");
            
            window.openDialog("chrome://v_identity/content/vI_rdfAccountMismatchDialog.xul",0,
                    "chrome, dialog, modal, alwaysRaised, resizable=yes", "identity", mismatchIDs,
                    /* callback chance: */ this).focus();
            return true;
        }
        else {
            Log.debug(" found no mismatch\n");
            return false;
        }
    },
	
	repairAccountMismatch : function(type, mismatchItems) {
        var keyField = (type == "identity")?"id":"smtp" // field to change is 'id' or 'smtp' dependent on type
        for (var i = 0; i < mismatchItems.length; i++) {
            Log.debug("## rdfDatasource: repairAccountMismatch change " + mismatchItems[i].oldkey + " into " + mismatchItems[i].key + ": ");
            // search relevant Identities
            for each (treeType in Array("email", "maillist", "newsgroup", "filter")) {
                var enumerator = this.getContainer(treeType).GetElements();
                while (enumerator && enumerator.hasMoreElements()) {
                    var resource = enumerator.getNext();
                    resource.QueryInterface(Components.interfaces.nsIRDFResource);
                    if (this._getRDFValue(resource, keyField) == mismatchItems[i].oldkey) {
                        if (mismatchItems[i].key == "") this._unsetRDFValue(resource, keyField, mismatchItems[i].oldkey)
                        else this._setRDFValue(resource, keyField, mismatchItems[i].key)
                        Log.debug(".");
                    }
                }
            }
            Log.debug("\n");
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
                if (smtp && smtp != vI.DEFAULT_SMTP_TAG) {
                    if (!relevantSMTPs[smtp]) relevantSMTPs[smtp] = 1; else relevantSMTPs[smtp] += 1;
                }
            }
        }
        return relevantSMTPs;
    },
    
    searchSmtpMismatch : function() {
        Log.debug("## rdfDatasource: searchSmtpMismatch");

        var relevantSMTPs = this.getRelevantSMTPs();
        var mismatchSMTPs = [];
        
        for (var smtp in relevantSMTPs) {
            var servers = Components.classes["@mozilla.org/messengercompose/smtp;1"]
                .getService(Components.interfaces.nsISmtpService).smtpServers;
            var found = false;
			while (servers && servers.hasMoreElements()) {
				var server = servers.getNext();
				if (server instanceof Components.interfaces.nsISmtpServer && 
					!server.redirectorType && smtp == server.key) {
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
            Log.debug(" found mismatches on smtp(s).\n");
            window.openDialog("chrome://v_identity/content/vI_rdfAccountMismatchDialog.xul",0,
                    "chrome, dialog, modal, alwaysRaised, resizable=yes", "smtp", mismatchSMTPs,
                    /* callback: */ this).focus();
            return true;
        }
        else {
            Log.debug(" found no mismatch\n");
            return false;
        }
    },

    storeAccountInfo : function() {
        Log.debug("## rdfDatasource: storeAccounts\n");

        var AccountManager = Components.classes["@mozilla.org/messenger/account-manager;1"]
            .getService(Components.interfaces.nsIMsgAccountManager);
        for (let i = 0; i < AccountManager.accounts.Count(); i++) {
            var account = AccountManager.accounts.QueryElementAt(i, Components.interfaces.nsIMsgAccount);
            for (let j = 0; j < account.identities.Count(); j++) {
                var identity = account.identities.QueryElementAt(j, Components.interfaces.nsIMsgIdentity);
//                 Log.debug("## rdfDatasource: storeAccounts identity store id " + identity.key + "\n");

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
//             Log.debug("## rdfDatasource: storeAccounts smtp store id " + server.key + "\n");
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
		while (servers && servers.hasMoreElements()) {
			var server = servers.getNext(); 
			if (server instanceof Components.interfaces.nsISmtpServer && !server.redirectorType) storeSmtp(server, this);
		}

//         Log.debug("## rdfDatasource: storeAccounts done\n");
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
			Log.debug("## rdfDatasource: _getRDFResourceForVIdentity: no Recipient given.\n");
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
// 		Log.debug("## rdfDatasource: removeVIdentityFromRDF " + resource.ValueUTF8 + ".\n");
		this._unsetRDFValue(resource, "email", this._getRDFValue(resource, "email"))
		this._unsetRDFValue(resource, "fullName", this._getRDFValue(resource, "fullName"))
		this._unsetRDFValue(resource, "id", this._getRDFValue(resource, "id"))
		this._unsetRDFValue(resource, "smtp", this._getRDFValue(resource, "smtp"))
		this._unsetRDFValue(resource, "name", this._getRDFValue(resource, "name"))
		
        var extras = (typeof(vI.storageExtras)=='function')?new vI.storageExtras(this, resource):null;
        if (extras) extras.loopForRDF(this, resource, "unset");
        this.getContainer(recType).RemoveElement(resource, true);
	},
	
	_unsetRDFValue : function (resource, field, value) {
// 		Log.debug("## rdfDatasource _unsetRDFValue " + this._rdfService  + " " + this._rdfDataSource + "\n");
        var predicate = this._rdfService.GetResource(this._rdfNS + "rdf#" + field);
		var name = this._rdfService.GetLiteral(value?value:"");
		var target = this._rdfDataSource.GetTarget(resource, predicate, true);
		if (target instanceof Components.interfaces.nsIRDFLiteral) {
			this._rdfDataSource.Unassert(resource, predicate, name, true);
            return null;
        }
        else return value;
	},
	
	// this will be used from rdfDataTree to get all RDF values, callFunction is vI.rdfDataTreeCollection.__addNewDatum
	readAllEntriesFromRDF : function (addNewDatum, treeType, idData) {
// 		Log.debug("## rdfDatasource: readAllEntriesFromRDF " + this._rdfService  + " " + this._rdfDataSource + " " + this + "\n");
		var enumerator = this.getContainer(treeType).GetElements();
		while (enumerator && enumerator.hasMoreElements()) {
			var resource = enumerator.getNext();
			resource.QueryInterface(Components.interfaces.nsIRDFResource);
			var name = this._getRDFValue(resource, "name")
			var email = this._getRDFValue(resource, "email")
			var fullName = this._getRDFValue(resource, "fullName")
			var id = this._getRDFValue(resource, "id")
			var smtp = this._getRDFValue(resource, "smtp")
			if (!smtp) smtp = vI.NO_SMTP_TAG;
			var extras = (typeof(vI.storageExtras)=='function')?new vI.storageExtras(this, resource):null;
			
			var localIdentityData = new vI.identityData(email, fullName, id, smtp, extras)
			addNewDatum (resource, name, localIdentityData, idData)
		}
	},
	
	__getDescriptionAndType : function (recipient, recipientType) {
		if (recipientType == "addr_newsgroups")	return { recDesc : recipient, recType : "newsgroup" }
		else if (this.__isMailingList(recipient)) {
			Log.debug("## __getDescriptionAndType: '" + recipient + "' is MailList\n");
			return { recDesc : this.__getMailListName(recipient), recType : "maillist" }
		}
		else {
			Log.debug("## __getDescriptionAndType: '" + recipient + "' is no MailList\n");
			var localIdentityData = new vI.identityData(recipient, null, null, null, null, null, null);
			return { recDesc : localIdentityData.combinedName, recType : "email" }
		}
	},
	
	// --------------------------------------------------------------------
	// check if recipient is a mailing list.
	// Similiar to Thunderbird, if there are muliple cards with the same displayName the mailinglist is preferred
	// see also https://bugzilla.mozilla.org/show_bug.cgi?id=408575
	__isMailingList: function(recipient) {
		let abManager = Components.classes["@mozilla.org/abmanager;1"]
			.getService(Components.interfaces.nsIAbManager);
		let allAddressBooks = abManager.directories;
		while (allAddressBooks.hasMoreElements()) {
			let ab = allAddressBooks.getNext();
			if (ab instanceof Components.interfaces.nsIAbDirectory && !ab.isRemote) {
				let abdirectory = abManager.getDirectory(ab.URI + 
					"?(and(DisplayName,=," + encodeURIComponent(this.__getMailListName(recipient)) + ")(IsMailList,=,TRUE))");
				if (abdirectory) {
					try {	// just try, sometimes there are no childCards at all...
						let cards = abdirectory.childCards;
						if (cards.hasMoreElements()) return true;	// only interested if there is at least one element...
					} catch(e) { }
				}
			}
		}
		return false;
	},	
	
	// --------------------------------------------------------------------
	
	__getMailListName : function(recipient) {
		if (recipient.match(/<[^>]*>/) || recipient.match(/$/)) {
			var mailListName = RegExp.leftContext + RegExp.rightContext
			mailListName = mailListName.replace(/^\s+|\s+$/g,"")
		}
		return mailListName;
	},

	findMatchingFilter : function (recipient, recipientType) {
		var recDescription = this.__getDescriptionAndType(recipient, recipientType).recDesc;
		Log.debug("## rdfDatasource: findMatchingFilter for " + recDescription + ".\n");
		var enumerator = this._filterContainer.GetElements();
		while (enumerator && enumerator.hasMoreElements()) {
			var resource = enumerator.getNext();
			resource.QueryInterface(Components.interfaces.nsIRDFResource);
			var filter = this._getRDFValue(resource, "name");
			
			const filterType = { None : 0, RegExp : 1, StrCmp : 2 }
			var recentfilterType;

			if (filter == "") continue;
			if (/^\/(.*)\/$/.exec(filter))
				{ Log.debug("## rdfDatasource: findMatchingFilter with RegExp '"
					+ filter.replace(/\\/g,"\\\\") + "'\n"); recentfilterType = filterType.RegExp; }
			else	{ Log.debug("## rdfDatasource: findMatchingFilter, compare with '"
					+ filter + "'\n"); recentfilterType = filterType.StrCmp; }
			
			switch (recentfilterType) {
				case filterType.RegExp:
					try { 	/^\/(.*)\/$/.exec(filter);
						if (recDescription.match(new RegExp(RegExp.$1,"i"))) {
							Log.debug("## rdfDatasource: findMatchingFilter found stored data.\n");
							return this._readVIdentityFromRDF(resource);
						}
					}
					catch(vErr) { }; break;
				case filterType.StrCmp:
					if (recDescription.toLowerCase().indexOf(filter.toLowerCase()) != -1) {
						Log.debug("## rdfDatasource: findMatchingFilter found stored data.\n");
						return this._readVIdentityFromRDF(resource);
					}
					break;
			}
		}
		Log.debug("## rdfDatasource: findMatchingFilter no match found.\n");
		return null;
	},
	
	readVIdentityFromRDF : function (recipient, recipientType) {
		var storedRecipient = this.__getDescriptionAndType(recipient, recipientType);
		var email = this._rdfService.GetResource(this._rdfNS + "rdf#email");
		var resource = this._getRDFResourceForVIdentity(storedRecipient.recDesc, storedRecipient.recType);
		if (!resource) return null;
		if (!this._rdfDataSource.hasArcOut(resource, email)) {
			// no data available --> give up.
			Log.debug("## rdfDatasource: readVIdentityFromRDF no data found.\n");
			return null;
		}
		Log.debug("## rdfDatasource: readVIdentityFromRDF found stored data.\n");
		
		return this._readVIdentityFromRDF(resource);
	},
	
	_readVIdentityFromRDF : function (resource) {
		var email = this._getRDFValue(resource, "email")
		var fullName = this._getRDFValue(resource, "fullName")
		var id = this._getRDFValue(resource, "id")
		var smtp = this._getRDFValue(resource, "smtp")
		if (!smtp) smtp = vI.NO_SMTP_TAG;
		
		Log.debug("## rdfDatasource: email='" + email + 
			"' fullName='" + fullName + "' id='" + id + "' smtp='" + smtp + "'\n");
		
		var extras = (typeof(vI.storageExtras)=='function')?new vI.storageExtras(this, resource):null;
		var extras_status = (typeof(vI.storageExtras)=='function')?extras.status():" not used";
		Log.debug("## rdfDatasource: extras:" + extras_status + "\n");
		
		var localIdentityData = new vI.identityData(email, fullName, id, smtp, extras)
		return localIdentityData;
	},

	_getRDFValue : function (resource, field) {
//         Log.debug("## rdfDatasource _getRDFValue " + this._rdfService  + " " + this._rdfDataSource + " " + this + "\n");
		var predicate = this._rdfService.GetResource(this._rdfNS + "rdf#" + field);
		var target = this._rdfDataSource.GetTarget(resource, predicate, true);
		if (target instanceof Components.interfaces.nsIRDFLiteral) return target.Value
		else return null;
	},
	
	updateRDFFromVIdentity : function(identityData, recipientName, recipientType) {
		var recipient = this.__getDescriptionAndType(recipientName, recipientType)
		this.updateRDF(recipient.recDesc, recipient.recType, identityData,
			(!vI.statusmenu && this._pref.getBoolPref("storage_store_base_id")
				|| vI.statusmenu.objSaveBaseIDMenuItem.getAttribute("checked") == "true"),
			(!vI.statusmenu && this._pref.getBoolPref("storage_store_SMTP")
				|| vI.statusmenu.objSaveSMTPMenuItem.getAttribute("checked") == "true"),
			null, null);
	},
	
	removeRDF : function (recDescription, recType) {
		var resource = this._getRDFResourceForVIdentity(recDescription, recType);
		if (!resource) return null;
		this.removeVIdentityFromRDF(resource, recType);
		return resource;
	},

	updateRDF : function (recDescription, recType, localIdentityData, storeBaseID, storeSMTP, prevRecDescription, prevRecType) {
//         Log.debug("## rdfDatasource (" + this._rdfNS + "): updateRDF recDescription=" + recDescription + " localIdentityData.email=" + localIdentityData.email + ".\n");
        
// 		if (!localIdentityData.email) {
// 			Log.debug("## rdfDatasource: updateRDF: no Sender-email for Recipient, aborting.\n");
// 			return;
// 		}
		if (!recDescription || recDescription.length == 0) return;

		if (!prevRecDescription) prevRecDescription = recDescription;
		if (!prevRecType) prevRecType = recType;

		var resource = this._getRDFResourceForVIdentity(prevRecDescription, prevRecType);
		if (!resource) return;
// 		Log.debug("## rdfDatasource: updateRDF " + resource.ValueUTF8 + ".\n");
		
		var position = this.getContainer(recType).IndexOf(resource); // check for index in new recType
		this.removeVIdentityFromRDF(resource, prevRecType);
        
        resource = this._getRDFResourceForVIdentity(recDescription, recType);

		this._setRDFValue(resource, "email", localIdentityData.email);
		this._setRDFValue(resource, "fullName", localIdentityData.fullName);
		if (storeBaseID)
			this._setRDFValue(resource, "id", localIdentityData.id.key);
		else	this._unsetRDFValue(resource, "id", this._getRDFValue(resource, "id"))
		if (storeSMTP && localIdentityData.smtp.key != vI.NO_SMTP_TAG)
			this._setRDFValue(resource, "smtp", localIdentityData.smtp.key);
		else	this._unsetRDFValue(resource, "smtp", this._getRDFValue(resource, "smtp"))
        this._setRDFValue(resource, "name", recDescription);
 
        if (localIdentityData.extras) localIdentityData.extras.loopForRDF(this, resource, "set");
		
		Log.debug("## rdfDatasource: updateRDF add " + resource.ValueUTF8 + " at position " + position + ".\n");
        if (position != -1) this.getContainer(recType).InsertElementAt(resource, position, true);
		else this.getContainer(recType).AppendElement(resource);
	},

	_setRDFValue : function (resource, field, value) {
// 		Log.debug("## rdfDatasource: _setRDFValue " + resource.ValueUTF8 + " " + field + " " + value + ".\n");
		if (!value) return value; // return if some value was not set.
// 		Log.debug("## rdfDatasource _setRDFValue " + this._rdfService + " " + this._rdfDataSource + "\n");
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
                Log.debug("## rdfDatasource: account/smtp changes observed\n");
                this.searchIdentityMismatch();
                this.searchSmtpMismatch();
                this.refreshAccountInfo();
            }
        },
        register : function() {
            Log.debug("## rdfDatasource: register AccountManagerObserver\n");
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


function rdfDatasourceAccess() {
	this._rdfDataSource = new rdfDatasource("virtualIdentity.rdf", false);
	this.stringBundle = Services.strings.createBundle("chrome://v_identity/locale/v_identity.properties");
}

rdfDatasourceAccess.prototype = {
	_rdfDataSource : null,
	stringBundle : null,
	
	_pref : Components.classes["@mozilla.org/preferences-service;1"]
		.getService(Components.interfaces.nsIPrefService)
		.getBranch("extensions.virtualIdentity."),
	
	clean : function() {
		this._rdfDataSource.clean();
	},
	
	updateVIdentityFromStorage : function(recipientName, recipientType, currentIdentity, currentIdentityIsVid, isNotFirstInputElement) {
		var localIdentities = new vI.identityCollection();
		localIdentities.addWithoutDuplicates(this._rdfDataSource.readVIdentityFromRDF(recipientName, recipientType));
		if (localIdentities.number == 1) Log.debug("## rdfDatasourceAccess: using data from direct match\n");
		localIdentities.addWithoutDuplicates(this._rdfDataSource.findMatchingFilter(recipientName, recipientType));
		
		var returnValue = {}; returnValue.identityCollection = localIdentities; returnValue.result = "drop";
		if (localIdentities.number == 0) {
			Log.debug("## rdfDatasourceAccess: updateVIdentityFromStorage no usable Storage-Data found.\n");
		}
		else {
			Log.debug("## rdfDatasourceAccess: compare with current Identity\n");
			if (this._pref.getBoolPref("storage_getOneOnly") &&		// if requested to retrieve only storageID for first recipient entered
				isNotFirstInputElement &&							// and it is now not the first recipient entered
				!localIdentities.identityDataCollection[0].equalsIdentity(currentIdentity, false).equal) {		// and this id is different than the current used one
					StorageNotification.info(this.stringBundle.GetStringFromName("vident.smartIdentity.vIStorageCollidingIdentity"));
// 					returnValue.result = "drop";    // this is the default value
			}
			// only update fields if new Identity is different than old one.
			else {
				Log.debug("## rdfDatasourceAccess: updateVIdentityFromStorage check if storage-data matches current Identity.\n");
				var compResult = localIdentities.identityDataCollection[0].equalsIdentity(currentIdentity, true);
				if (!compResult.equal) {
					var warning = this.__getWarning("replaceVIdentity", recipientName, compResult.compareMatrix);
					if (	!currentIdentityIsVid ||
						!this._pref.getBoolPref("storage_warn_vI_replace") ||
						(this.__askWarning(warning) == "accept")) {
							returnValue.result = "accept";
					}
				}
				else {
					returnValue.result = "equal";
				}
			}
		}
		return returnValue;
	},
	
	storeVIdentityToAllRecipients : function(identityData, recipients) {
		var multipleRecipients = (recipients.length > 1);
		var dontUpdateMultipleNoEqual = (this._pref.getBoolPref("storage_dont_update_multiple") && multipleRecipients)
		Log.debug("## rdfDatasource: storeVIdentityToAllRecipients dontUpdateMultipleNoEqual='" + dontUpdateMultipleNoEqual + "'\n")
		
		for (var j = 0; j < recipients.length; j++) {
			var returnValue = this.__updateStorageFromVIdentity(identityData, recipients[j].recipient, recipients[j].recipientType, dontUpdateMultipleNoEqual);
			if (returnValue.update != "accept")  break;
		}
		return returnValue;
	},

	getVIdentityFromAllRecipients : function(allIdentities, recipients) {
        if (!this._pref.getBoolPref("storage"))
            { Log.debug("## storage: Storage deactivated\n"); return; }
		var initnumber = allIdentities.number;
		for (var j = 0; j < recipients.length; j++) {
			allIdentities.addWithoutDuplicates(this._rdfDataSource.readVIdentityFromRDF(recipients[j].recipient, recipients[j].recipientType));
			allIdentities.addWithoutDuplicates(this._rdfDataSource.findMatchingFilter(recipients[j].recipient, recipients[j].recipientType));
		}
		Log.debug("## storage: found " + (allIdentities.number-initnumber) + " address(es)\n")
	},

	__updateStorageFromVIdentity : function(identityData, recipient, recipientType, dontUpdateMultipleNoEqual) {
		Log.debug("## rdfDatasource: __updateStorageFromVIdentity.\n")
		var storageDataByType = this._rdfDataSource.readVIdentityFromRDF(recipient, recipientType);
		var storageDataByFilter = this._rdfDataSource.findMatchingFilter(recipient, recipientType);
		
		// update (storing) of data by type is required if there is
		// no data stored by type (or different data stored) and no equal filter found
		var storageDataByTypeCompResult = storageDataByType?storageDataByType.equalsIdentity(identityData, true):null;
		var storageDataByTypeEqual = (storageDataByType && storageDataByTypeCompResult.equal);
		var storageDataByFilterEqual = (storageDataByFilter && storageDataByFilter.equalsIdentity(identityData, false).equal);
		
		var doUpdate = "accept";
		if (	(!storageDataByType && !storageDataByFilterEqual) ||
			(!storageDataByTypeEqual && !storageDataByFilterEqual && !dontUpdateMultipleNoEqual) ) {
			Log.debug("## storage: __updateStorageFromVIdentity updating\n")
			if (storageDataByType && !storageDataByTypeEqual && this._pref.getBoolPref("storage_warn_update")) {
				Log.debug("## storage: __updateStorageFromVIdentity overwrite warning\n");
				doUpdate = this.__askWarning(this.__getWarning("updateStorage", recipient, storageDataByTypeCompResult.compareMatrix));
			}
		}
		if (doUpdate == "accept") this._rdfDataSource.updateRDFFromVIdentity(identityData, recipient, recipientType);
		return { update : doUpdate, storedIdentity : storageDataByType };
	},
	
	__getWarning : function(warningCase, recipient, compareMatrix) {
		var warning = { title: null, recLabel : null, recipient : null, warning : null, css: null, query : null, class : null };
		warning.title = this.stringBundle.GetStringFromName("vident." + warningCase + ".title")
		warning.recLabel = this.stringBundle.GetStringFromName("vident." + warningCase + ".recipient") + ":";
		warning.recipient = recipient;
		warning.warning = 
			"<table class='" + warningCase + "'><thead><tr><th class='col1'/>" +
				"<th class='col2'>" + this.stringBundle.GetStringFromName("vident." + warningCase + ".currentIdentity") + "</th>" +
				"<th class='col3'>" + this.stringBundle.GetStringFromName("vident." + warningCase + ".storedIdentity") + "</th>" +
			"</tr></thead>" +
			"<tbody>" + compareMatrix + "</tbody>" +
			"</table>"
		warning.css = "vI.DialogBrowser.css";
		warning.query = this.stringBundle.GetStringFromName("vident." + warningCase + ".query");
		warning.class = warningCase;
		return warning;
	},

	__askWarning : function(warning) {
		var retVar = { returnValue: null };
		var answer = window.openDialog("chrome://v_identity/content/vI_Dialog.xul","",
					"chrome, dialog, modal, alwaysRaised, resizable=yes",
					 warning, retVar)
		dump("retVar.returnValue=" + retVar.returnValue + "\n")
		return retVar.returnValue;
	},
}


// create with name of the file to import into
function rdfDatasourceImporter(rdfFileName) {
    this._rdfFileName = rdfFileName;
    if (this._rdfFileName) this.import();
}

rdfDatasourceImporter.prototype = {
    _rdfService :       Components.classes["@mozilla.org/rdf/rdf-service;1"]
                            .getService(Components.interfaces.nsIRDFService),
    _rdfDataSource :    null,
    _rdfFileName :      null,
    _rdfImportDataSource :    null,

    _getMatchingIdentity : function(name, email, fullName) {
        var AccountManager = Components.classes["@mozilla.org/messenger/account-manager;1"]
            .getService(Components.interfaces.nsIMsgAccountManager);
        for (let i = 0; i < AccountManager.accounts.Count(); i++) {
            var account = AccountManager.accounts.QueryElementAt(i, Components.interfaces.nsIMsgAccount);
            for (let j = 0; j < account.identities.Count(); j++) {
                var identity = account.identities.QueryElementAt(j, Components.interfaces.nsIMsgIdentity);
                if (name == identity.identityName || (fullName == identity.fullName && email == identity.email)) return identity.key;
            }
        }
        return null;
    },
    
    _getMatchingSMTP : function(label, hostname, username) {
        var servers = Components.classes["@mozilla.org/messengercompose/smtp;1"]
            .getService(Components.interfaces.nsISmtpService).smtpServers;
		while (servers && servers.hasMoreElements()) {
			var server = servers.getNext(); 
			if (server instanceof Components.interfaces.nsISmtpServer && !server.redirectorType)
				if (label == (server.description?server.description:server.hostname) || (hostname == server.hostname && username == server.username))
					return server.key;
		}
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
            Log.debug("## rdfDatasourceImporter import: translate relevant ID from previous '" + id + "' to current '" + relevantIDs[id].id + "'\n");
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
            Log.debug("## rdfDatasourceImporter import: translate relevant SMTP from previous '" + smtp + "' to current '" + relevantSMTPs[smtp].smtp + "'\n");
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
            Log.debug("\n## rdfDatasourceImporter IMPORT\n## rdfDatasourceImporter import: preparation:\n");
            
            var importRdfDataFile = Components.classes["@mozilla.org/file/local;1"]
                .createInstance(Components.interfaces.nsILocalFile);
            var file = Components.classes["@mozilla.org/file/directory_service;1"]
                .getService(Components.interfaces.nsIProperties).get("ProfD", Components.interfaces.nsIFile);
            var delimiter = (file.path.match(/\\/))?"\\":"/";
            importRdfDataFile.initWithPath(file.path + delimiter + this._rdfFileName + "_import");
            filePicker.file.copyTo(importRdfDataFile.parent,importRdfDataFile.leafName);

            Log.debug("## rdfDatasourceImporter import: copied file from " + filePicker.file.path + " to " + importRdfDataFile.path + "'\n");
            
            // init Datasources
            this._rdfImportDataSource = new rdfDatasource(importRdfDataFile.leafName, true);
            
            // search matching IDs and SMTPs for anyones used in import-file
            var relevantIDs = this._translateRelevantIDs();
            var relevantSMTPs = this._translateRelevantSMTPs();
            
            Log.debug("## rdfDatasourceImporter import: preparation done.\n");
            Log.debug("## rdfDatasourceImporter import: starting import:\n");

            for each (treeType in Array("email", "maillist", "newsgroup", "filter")) {
                // re-initialize importDataSource to point rdfService to the right Resources
                this._rdfImportDataSource = new rdfDatasource(importRdfDataFile.leafName, true);
                var container = this._rdfImportDataSource.getContainer(treeType)
                if (container.GetCount() == 0) continue;
                Log.debug("## rdfDatasourceImporter importing " + treeType + ": " + container.GetCount()+ " datasets from " + this._rdfImportDataSource._rdfDataSource.URI + "\n");
                var enumerator = container.GetElements();
                // re-initialize dataSource to point rdfService to the right Resources
                this._rdfDataSource = new rdfDatasource(this._rdfFileName, true);
                var count = 0;
                while (enumerator.hasMoreElements()) {
                    var resource = enumerator.getNext(); count += 1;
                    resource.QueryInterface(Components.interfaces.nsIRDFResource);
                    Log.debug("## " + count + " ");
                    var name = this._rdfImportDataSource._getRDFValue(resource, "name")
                    var email = this._rdfImportDataSource._getRDFValue(resource, "email")
                    var fullName = this._rdfImportDataSource._getRDFValue(resource, "fullName")
                    var id = this._rdfImportDataSource._getRDFValue(resource, "id")
                    id = id?relevantIDs[id].id:null
                    var smtp = this._rdfImportDataSource._getRDFValue(resource, "smtp")
                    smtp = (smtp && smtp != vI.DEFAULT_SMTP_TAG)?relevantSMTPs[smtp].smtp:smtp
                    var extras = (typeof(vI.storageExtras)=='function')?new vI.storageExtras(this._rdfImportDataSource, resource):null;
                    var localIdentityData = new vI.identityData(email, fullName, id, smtp, extras)
                    
                    this._rdfDataSource.updateRDF(name, treeType, localIdentityData, false, false, null, null)
                    var resource = this._rdfDataSource._getRDFResourceForVIdentity(name, treeType);
                    if (id) this._rdfDataSource._setRDFValue(resource, "id", id);       // localIdentityData can only store valid id's, this one might be a temporary invalid id
                    if (smtp) this._rdfDataSource._setRDFValue(resource, "smtp", smtp); // localIdentityData can only store valid smtp's, this one might be a temporary invalid smtp
                }
            }
            
            Log.debug("## rdfDatasourceImporter import: removing temporary file " + importRdfDataFile.path + ".\n");
            this._rdfImportDataSource = null; importRdfDataFile.remove(false);
            Log.debug("## rdfDatasourceImporter import: import done.\n");
            
            Log.debug("## rdfDatasourceImporter import: cleaning ID/SMTP storages:\n");
            this._rdfDataSource = new rdfDatasource(this._rdfFileName, true);
            
            this._storeMappedIDs(relevantIDs);
            this._rdfDataSource.searchIdentityMismatch();
            this._storeMappedSMTPs(relevantSMTPs);
            this._rdfDataSource.searchSmtpMismatch();
            
            this._rdfDataSource.refreshAccountInfo();
            this._rdfDataSource.clean();
            this._rdfDataSource = null;
            Log.debug("## rdfDatasourceImporter import: cleaning ID/SMTP storages done.\n");
            Log.debug("## rdfDatasourceImporter IMPORT DONE.\n");
        }
    }
}
vI.rdfDatasource = rdfDatasource;
vI.rdfDatasourceAccess = rdfDatasourceAccess;
vI.rdfDatasourceImporter = rdfDatasourceImporter;
}});
