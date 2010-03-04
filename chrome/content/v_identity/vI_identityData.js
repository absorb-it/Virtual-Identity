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

function identityData(email, fullName, id, smtp, extras, sideDescription) {
	this.email = email;
	this.fullName = (fullName?fullName:'');
	this.id = new idObj(id);
	this.smtp = new smtpObj(smtp);
	this.extras = extras?extras:new vI_storageExtras();
	this.comp = {	// holds the results of the last comparison for later creation of a compareMatrix
		compareID : null,
		equals : { fullName : {}, email : {}, smtp : {}, id : {}, extras : {} }
	}
	if (sideDescription) this.sideDescription = sideDescription;
	else if (this.id.value) this.sideDescription = " - " + this.id.value;
	this.stringBundle = document.getElementById("vIdentBundle");
}
identityData.prototype = {
	email : null,
	fullName : null,
	id : null,
	smtp : null,
	extras : null,
	sideDescription : null,
	
	stringBundle : null,
	comp : null,	

	get combinedName() {
		var email = this.email?this.email.replace(/^\s+|\s+$/g,""):"";
		var fullName = this.fullName?this.fullName.replace(/^\s+|\s+$/g,""):"";
		return fullName?fullName+(email?" <"+email+">":""):email
	},
	set combinedName(combinedName) {
		var name = ""; var email = "";
		// prefer an email address separated with < >, only if not found use any other
		if (combinedName.match(/<\s*[^>\s]*@[^>\s]*\s*>/) || combinedName.match(/<?\s*[^>\s]*@[^>\s]*\s*>?/) || combinedName.match(/$/)) {
			name = RegExp.leftContext + RegExp.rightContext
			email = RegExp.lastMatch
			email = email.replace(/\s+|<|>/g,"")
			name = name.replace(/^\s+|\s+$/g,"")
			name = name.replace(/^\"|\"$/g,"")
			name = name.replace(/^\'|\'$/g,"")
		}
		this.fullName = name;
		this.email = email;
	},

	__makeHtml : function (string) { return string?string.replace(/>/g,"&gt;").replace(/</g,"&lt;"):"" },
	get idHtml() { return this.__makeHtml(this.id.value); },
	get smtpHtml() { return this.__makeHtml(this.smtp.value); },
	get fullNameHtml() { return this.__makeHtml(this.fullName); },
	get emailHtml() { return this.__makeHtml(this.email); },
	get combinedNameHtml() { return this.__makeHtml(this.combinedName); },

	get idLabel() { return this.stringBundle.getString("vident.identityData.baseID") },
	get smtpLabel() { return this.stringBundle.getString("vident.identityData.SMTP") },
	get fullNameLabel() { return this.stringBundle.getString("vident.identityData.Name") },
	get emailLabel() { return this.stringBundle.getString("vident.identityData.Address") },

	// creates an Duplicate of the current IdentityData, cause usually we are working with a pointer
	getDuplicate : function() {
		return new identityData(this.email, this.fullName, this.id.key, this.smtp.key, this.extras.getDuplicate(), this.sideDescription);
	},

	// copys all values of an identity. This way we can create a new object with a different document-context
	copy : function(identityData) {
		this.email = identityData.email;
		this.fullName = identityData.fullName;
		this.id.key = identityData.id.key;
		this.smtp.key = identityData.smtp.key;
		this.sideDescription = identityData.sideDescription;
		this.extras.copy(identityData.extras);
	},

	// dependent on MsgComposeCommands, should/will only be called in ComposeDialog
	isExistingIdentity : function(ignoreFullNameWhileComparing) {
		vI_notificationBar.dump("## vI_identityData: isExistingIdentity: ignoreFullNameWhileComparing='" + ignoreFullNameWhileComparing + "'\n");
// 		vI_notificationBar.dump("## vI_identityData base: fullName.toLowerCase()='" + this.fullName + "' email.toLowerCase()='" + this.email + "' smtp='" + this.smtp.key + "'\n");

		var accounts = queryISupportsArray(gAccountManager.accounts, Components.interfaces.nsIMsgAccount);
		for (var i in accounts) {
			// skip possible active VirtualIdentity Accounts
			try { vI_account.prefroot.getBoolPref("mail.account."+accounts[i].key+".vIdentity"); continue; } catch (e) { };
	
			var identities = queryISupportsArray(accounts[i].identities, Components.interfaces.nsIMsgIdentity);
			for (var j in identities) {
// 				vI_notificationBar.dump("## vI_identityData comp: fullName.toLowerCase()='" + identities[j].fullName.toLowerCase() + "' email.toLowerCase()='" + identities[j].email.toLowerCase() + "' smtp='" + identities[j].smtpServerKey + "'\n");

				if (	(ignoreFullNameWhileComparing ||
					this.fullName.toLowerCase() == identities[j].fullName.toLowerCase()) &&
					(this.email.toLowerCase() == identities[j].email.toLowerCase()) &&
					this.smtp.equal(new smtpObj(identities[j].smtpServerKey))	) {
					vI_notificationBar.dump("## vI_identityData: isExistingIdentity: " + this.combinedName + " found, id='" + identities[j].key + "'\n");
					return identities[j].key;
				}
			}
		}
		vI_notificationBar.dump("## vI_identityData: isExistingIdentity: " + this.combinedName + " not found\n");
		return null;
	},
	
	equals : function(compareIdentityData) {
		this.comp.compareID = compareIdentityData;

		this.comp.equals.fullName = (((this.fullName)?this.fullName.toLowerCase():null) == ((compareIdentityData.fullName)?compareIdentityData.fullName.toLowerCase():null));
		this.comp.equals.email = (((this.email)?this.email.toLowerCase():null) == ((compareIdentityData.email)?compareIdentityData.email.toLowerCase():null));

		this.comp.equals.smtp = this.smtp.equal(compareIdentityData.smtp);


		this.comp.equals.id = this.id.equal(compareIdentityData.id);
		this.comp.equals.extras = this.extras.equal(compareIdentityData.extras);
		
		return (this.comp.equals.fullName && this.comp.equals.email && this.comp.equals.smtp && this.comp.equals.id && this.comp.equals.extras);
	},

	equalsCurrentIdentity : function(getCompareMatrix) {
		var equal = this.equals(document.getElementById("msgIdentity_clone").identityData);
		var compareMatrix = null;
 		// generate CompareMatrix only if asked and non-equal
		if (getCompareMatrix && !equal) compareMatrix = this.getCompareMatrix();
		return { equal : equal, compareMatrix : compareMatrix };
	},

	getCompareMatrix : function() {
		const Items = Array("fullName", "email", "smtp", "id");
		var string = "";		
		var saveBaseId = (vI_statusmenu.objSaveBaseIDMenuItem.getAttribute("checked") == "true")
		var saveSMTP = (vI_statusmenu.objSaveSMTPMenuItem.getAttribute("checked") == "true")
		for each (item in Items) {
			var classEqual = (this.comp.equals[item])?"equal":"unequal";
			var classIgnore = (((!saveBaseId) && (item == "id")) || ((!saveSMTP) && (item == "smtp")))?" ignoreValues":""
			string += "<tr>" +
				"<td class='col1 " + classEqual + "'>" + this[item+"Label"] + "</td>" +
				"<td class='col2 " + classEqual + classIgnore + "'>" + this.comp.compareID[item+"Html"] + "</td>" +
				"<td class='col3 " + classEqual + classIgnore + "'>" + this[item+"Html"] + "</td>" +
				"</tr>"
		}
		string += this.extras.getCompareMatrix();
		return string;
	},

	getMatrix : function() {
		const Items = Array("smtp", "id");
		var string = "";
		for each (item in Items) if (this[item+"Html"])
			string += "<tr><td class='col1'>" + this[item+"Label"] + ":</td>" +
				"<td class='col2'>" + this[item+"Html"] + "</td></tr>"
		string += this.extras.getMatrix();
		return string;		
	}
}

function identityCollection() {
	this.number = 0;
	this.identityDataCollection = {};
	this.menuItems = {};
}
identityCollection.prototype =
{
	number : null,
	identityDataCollection : null,
	menuItems : null,
	
	mergeWithoutDuplicates : function(addIdentityCollection) {
		for (var index = 0; index < addIdentityCollection.number; index++)
			this.addWithoutDuplicates(addIdentityCollection.identityDataCollection[index])
	},

	dropIdentity : function(index) {
		vI_notificationBar.dump("## identityCollection:   dropping address from inputList: " + this.identityDataCollection[index].combinedName + "\n");
		while (index < (this.number - 1)) { this.identityDataCollection[index] = this.identityDataCollection[++index]; };
		this.identityDataCollection[--this.number] = null;
	},

	addWithoutDuplicates : function(identityData) {
		for (var index = 0; index < this.number; index++) {
			if (this.identityDataCollection[index].email == identityData.email &&
				(!this.identityDataCollection[index].id.key || !identityData.id.key || 
					(this.identityDataCollection[index].id.key == identityData.id.key &&
					this.identityDataCollection[index].smtp.key == identityData.smtp.key))) {
				// found, so check if we can use the Name of the new field
				if (this.identityDataCollection[index].fullName == "" && identityData.fullName != "") {
					this.identityDataCollection[index].fullName = identityData.fullName;
					vI_notificationBar.dump("## identityCollection:   added fullName '" + identityData.fullName
						+ "' to stored email '" + this.identityDataCollection[index].email +"'\n")
				}
				// check if id_key, smtp_key or extras can be used
				// only try this once, for the first Identity where id is set)
				if (!this.identityDataCollection[index].id.key && identityData.id.key) {
					this.identityDataCollection[index].id.key = identityData.id.key;
					this.identityDataCollection[index].smtp.key = identityData.smtp.key;
					this.identityDataCollection[index].extras = identityData.extras;
					vI_notificationBar.dump("## identityCollection:   added id '" + identityData.id.value
						+ "' smtp '" + identityData.smtp.value + "' (+extras) to stored email '" + this.identityDataCollection[index].email +"'\n")
				}
				return;
			}
		}
		vI_notificationBar.dump("## identityCollection:   add new address to result: " + identityData.combinedName + "\n")
		this.identityDataCollection[index] = identityData;
		this.number = index + 1;
	},
	
	// this is used to completely use the conten of another identityCollection, but without changing all pointers
	// see for instance vI_smartIdentity.__filterAddresses
	takeOver : function(newIdentityCollection) {
		this.number = newIdentityCollection.number
		this.identityDataCollection = newIdentityCollection.identityDataCollection
	}
};

const DEFAULT_SMTP_TAG = "vI_useDefaultSMTP"
const NO_SMTP_TAG = "vI_noStoredSMTP"

function smtpObj(key) {
	this._key = key;
	this.DEFAULT_TAG = document.getElementById("bundle_messenger").getString("defaultServerTag");
}
smtpObj.prototype = {
	DEFAULT_TAG : null,
	_key : null,
	_value : null,
	
	set key(key) { this._key = key; this._value = null; },
	get key() {
		var dummy = this.value; // just to be sure key is adapted if SMTP is not available
		return this._key
	},
	get keyNice() { // the same as key but with "" for DEFAULT_SMTP_TAG
		if (this.key == DEFAULT_SMTP_TAG) return ""; // this is the key used for default server
		return this.key
	},
	get value() {
		if (this._value == null) {
			this._value = "";
			if (this._key == null || this._key == "") this._key = DEFAULT_SMTP_TAG;
			if (this._key == DEFAULT_SMTP_TAG) this._value = this.DEFAULT_TAG;
			else if (!this._key) this._value = null;
			else if (this._key) {
				var servers = Components.classes["@mozilla.org/messengercompose/smtp;1"]
					.getService(Components.interfaces.nsISmtpService).smtpServers;
				if (typeof(servers.Count) == "undefined")		// TB 3.x
					while (servers && servers.hasMoreElements()) {
						var server = servers.getNext();
						if (server instanceof Components.interfaces.nsISmtpServer && 
							!server.redirectorType && this._key == server.key) {
							this._value = server.description?server.description:server.hostname;
							break;
						}
					}
				else							// TB 2.x
					for (var i=0 ; i < servers.Count(); i++) {
						var server = servers.QueryElementAt(i,
							Components.interfaces.nsISmtpServer);
						if (!server.redirectorType && this._key == server.key) {
							this._value = server.description?server.description:server.hostname;
							break;
						}
					}
			}
		}
		if (!this._value) this._key = NO_SMTP_TAG; // if non-existant SMTP handle like non available
		return this._value;
	},
	equal : function(compareSmtpObj) {
		if (this.key == NO_SMTP_TAG || compareSmtpObj.key == NO_SMTP_TAG) return true;
		return (this.keyNice == compareSmtpObj.keyNice);
	},
	hasNoDefinedSMTP : function() {
		return (this.key == NO_SMTP_TAG);
	}
}

function idObj(key) { this._key = key; }
idObj.prototype = {
	_key : null,
	_value : null,

	set key(key) { this._key = key; this._value = null; },
	get key() { if (this._value == null) var dummy = this.value; return this._key },
	get value() {
		if (this._value == null) {
			this._value = "";
			if (this._key) {
				var accountManager = Components.classes["@mozilla.org/messenger/account-manager;1"]
					.getService(Components.interfaces.nsIMsgAccountManager);
				for (var i = 0; i < accountManager.accounts.Count(); i++) {
					var account = accountManager.accounts.GetElementAt(i)
						.QueryInterface(Components.interfaces.nsIMsgAccount);
					for (var j = 0; j < account.identities.Count(); j++) {
						var identity = account.identities.GetElementAt(j)
							.QueryInterface(Components.interfaces.nsIMsgIdentity);
						if (this._key == identity.key) {
							this._value = identity.identityName;
							break;
						}
					}
				}
				if (!this._value) this._key = null;
			}
		}
		return this._value;
	},
	equal : function(compareIdObj) {
		if (!this.key || !compareIdObj.key) return true;
		return (this.key == compareIdObj.key);
	}
}
