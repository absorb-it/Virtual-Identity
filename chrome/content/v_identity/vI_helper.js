

function keyTranslator() { }
keyTranslator.prototype = {
	SMTP_NAMES : null,
	ID_NAMES : null,
	DEFAULT_TAG : null,
	AccountManager : Components.classes["@mozilla.org/messenger/account-manager;1"]
				.getService(Components.interfaces.nsIMsgAccountManager),
	
	__getSMTPnames : function () {
		this.SMTP_NAMES = [];
		var smtpService = Components.classes["@mozilla.org/messengercompose/smtp;1"]
			.getService(Components.interfaces.nsISmtpService);
		var servers = smtpService.smtpServers;
		
		function addServer (SMTP_NAMES, server) {
			if (server instanceof Components.interfaces.nsISmtpServer &&
        !server.redirectorType)
				SMTP_NAMES[server.key] = server.description?server.description:server.hostname
		}
		
		if (typeof(servers.Count) == "undefined")		// TB 3.x
			while (servers && servers.hasMoreElements())
				addServer(this.SMTP_NAMES, servers.getNext());
		else							// TB 2.x
			for (var i=0 ; i<servers.Count(); i++)
				addServer(this.SMTP_NAMES,  servers.QueryElementAt(i,Components.interfaces.nsISmtpServer));

		if (!this.DEFAULT_TAG) this.DEFAULT_TAG = document.getElementById("bundle_messenger").getString("defaultServerTag");
	},
	__getIDnames : function () {
		this.ID_NAMES = [];
		var accounts = queryISupportsArray(this.AccountManager.accounts, Components.interfaces.nsIMsgAccount);
		if (typeof(sortAccounts)=="function") // TB 3.x
			accounts.sort(sortAccounts);
		else if (typeof(compareAccountSortOrder)=="function") // TB 2.x
			accounts.sort(compareAccountSortOrder);
		for (var i in accounts) {
			var server = accounts[i].incomingServer;
			if (!server) continue;
			var identites = queryISupportsArray(accounts[i].identities, Components.interfaces.nsIMsgIdentity);
			for (var j in identites)
				this.ID_NAMES[identites[j].key] = identites[j].identityName;
		}
		if (!this.DEFAULT_TAG) this.DEFAULT_TAG = document.getElementById("bundle_messenger").getString("defaultServerTag");
	},
	getSMTP : function (smtpKey) {
		if (!this.SMTP_NAMES) this.__getSMTPnames();
		return this.SMTP_NAMES[smtpKey];
	},
	getID : function (idKey) {
		if (!this.ID_NAMES) this.__getIDnames();
		return (this.ID_NAMES[idKey])?this.ID_NAMES[idKey]:null;
	},
	getSMTPname : function (smtpKey) {
		if (!this.SMTP_NAMES) this.__getSMTPnames();
		return this.SMTP_NAMES[smtpKey]?this.SMTP_NAMES[smtpKey]:this.DEFAULT_TAG
	},
	getIDname : function (idKey) {
		if (!this.ID_NAMES) this.__getIDnames();
		return this.ID_NAMES[idKey]?this.ID_NAMES[idKey]:""
	},
	isValidSMTP : function (smtpKey) {
		if (!this.SMTP_NAMES) this.__getSMTPnames();
		return (!smtpKey || this.SMTP_NAMES[smtpKey]?true:false)
	},
	isValidID : function (idKey) {
		if (!this.ID_NAMES) this.__getIDnames();
		return (!idKey || this.ID_NAMES[idKey]?true:false)
	}
}



var vI_helper = {
	// simplified versionChecker, type is "TB" or "SM"
	// returns true if appVersion is smaller or equal version
	olderVersion : function (type, version) {
		var appID = null; var appVersion = null;
		const THUNDERBIRD_ID = "{3550f703-e582-4d05-9a08-453d09bdfdc6}";
		const SEAMONKEY_ID = "{92650c4d-4b8e-4d2a-b7eb-24ecf4f6b63a}";

		var versionChecker;
		if("@mozilla.org/xre/app-info;1" in Components.classes) {
			var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
				.getService(Components.interfaces.nsIXULAppInfo);
			appID = appInfo.ID
			appVersion = appInfo.version
		}
		if ((type == "TB" && appID != THUNDERBIRD_ID) ||
			(type == "SM" && appID != SEAMONKEY_ID)) return null;

		if (!version) return ((type == "TB" && appID == THUNDERBIRD_ID) ||
			(type == "SM" && appID == SEAMONKEY_ID))

		if("@mozilla.org/xpcom/version-comparator;1" in Components.classes)
			versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
				.getService(Components.interfaces.nsIVersionComparator);
		else return null;
		
		return (versionChecker.compare(appVersion, version) < 0)
	},

/*vI_upgrade.js:229:
vI_upgrade.js:232:*/
	combineNames : function (fullName, email) {
		if (fullName && fullName.replace(/^\s+|\s+$/g,"")) return fullName.replace(/^\s+|\s+$/g,"") + " <" + email.replace(/^\s+|\s+$/g,"") + ">"
		else return email?email.replace(/^\s+|\s+$/g,""):""
	},
	
// vI_rdfDataEditor.js:80:         elem.value = address.combinedName;
// vI_rdfDatasource.js:119:                if (!parsed.combinedName) {
// vI_rdfDatasource.js:123:                vI_notificationBar.dump("## vI_rdfDatasource: __getRDFResourceForVIdentity: recDescription=" + parsed.combinedName + "\n")
// vI_rdfDatasource.js:130:                return vI_rdfDatasource.rdfService.GetResource(vI_rdfDatasource.rdfNS + rdfNSRecType + parsed.combinedName);
// vI_upgrade.js:225:              //~ alert(splitted.email + "++" + splitted.name + "++" + splitted.combinedName)
// vI_upgrade.js:256:                       combinedName: name + " <" + email + ">"}

	parseAddress : function(address) {
		//~ vI_notificationBar.dump("## v_identity: getAddress: parsing '" + address + "'\n")
		var name = ""; var email = "";
		// prefer an email address separated with < >, only if not found use any other
		if (address.match(/<\s*[^>\s]*@[^>\s]*\s*>/) || address.match(/<?\s*[^>\s]*@[^>\s]*\s*>?/) || address.match(/$/)) {
			name = RegExp.leftContext + RegExp.rightContext
			email = RegExp.lastMatch
			email = email.replace(/\s+|<|>/g,"")
			name = name.replace(/^\s+|\s+$/g,"")
			name = name.replace(/^\"|\"$/g,"")
			name = name.replace(/^\'|\'$/g,"")
		}
		vI_notificationBar.dump("## v_identity: getAddress: address '" + address + "' name '" + 
			name + "' email '" + email + "'\n");
		return { name: name,
			 email: email,
			 combinedName: vI_helper.combineNames(name, email)}
	}
}
