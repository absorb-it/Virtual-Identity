

function keyTranslator() { }
keyTranslator.prototype = {
	SMTP_NAMES : null,
	ID_NAMES : null,
	DEFAULT_TAG : null,
	
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
		var accounts = queryISupportsArray(gAccountManager.accounts, Components.interfaces.nsIMsgAccount);
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
		return this.ID_NAMES[idKey];
	},
	getSMTPname : function (smtpKey) {
		if (!this.SMTP_NAMES) this.__getSMTPnames();
		return this.SMTP_NAMES[smtpKey]?this.SMTP_NAMES[smtpKey]:(smtpKey?this.DEFAULT_TAG+" "+smtpKey+" not found":this.DEFAULT_TAG)
	},
	getIDname : function (idKey) {
		if (!this.ID_NAMES) this.__getIDnames();
		return this.ID_NAMES[idKey]?this.ID_NAMES[idKey]:(idKey?this.DEFAULT_TAG+" "+idKey+" not found":this.DEFAULT_TAG)
	},
}



var vI_helper = {
	// "accountname" property changed in Thunderbird 3.x, Seamonkey 1.5x to "description"
	getAccountname: function(elem) {
		if (elem.getAttribute("accountname") == "" && elem.getAttribute("description") != "")
			return "- " + elem.getAttribute("description")
		else return elem.getAttribute("accountname")
	},

	combineNames : function (fullName, email) {
		if (fullName && fullName.replace(/^\s+|\s+$/g,"")) return fullName.replace(/^\s+|\s+$/g,"") + " <" + email.replace(/^\s+|\s+$/g,"") + ">"
		else return email?email.replace(/^\s+|\s+$/g,""):""
	},

	addIdentityMenuItem: function(object, identityName, accountName, accountKey, identityKey, base_id_key, smtp_key, extras) {
		var MenuItem = document.createElement("menuitem");
		MenuItem.className = "identity-popup-item";
		
		// set the account name in the choosen menu item
		MenuItem.setAttribute("label", identityName);
		MenuItem.setAttribute("accountname", accountName);
		MenuItem.setAttribute("accountkey", accountKey);
		MenuItem.setAttribute("value", identityKey);
		MenuItem.setAttribute("class", "identity_clone-popup-item new-icon")
		if (base_id_key) MenuItem.setAttribute("base_id_key", base_id_key)
		if (smtp_key) MenuItem.setAttribute("smtp_key", smtp_key)
		if (extras) MenuItem.setAttribute("extras", extras)
		
		object.appendChild(MenuItem)
		
		return MenuItem
	},

	getBaseIdentity : function () {
		return gAccountManager.getIdentity(vI.elements.Obj_MsgIdentity.value);
	},
	
	getAddress : function() {
		vI_msgIdentityClone.initMsgIdentityTextbox_clone();
		return vI_helper.parseAddress(vI_msgIdentityClone.elements.Obj_MsgIdentityTextbox_clone.value);
	},
	
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
