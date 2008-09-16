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

    Contributor(s): Mike Krieger, Sebastian Apel
 * ***** END LICENSE BLOCK ***** */
 
/**
* some code copied and adapted from 'addressContext' and from 'Birthday Reminder'
* thanks to Mike Krieger and Sebastian Apel
*/

function identityData(email, fullName, id, smtp, extras, sideDescription) {
	this.__keyTranslator = new keyTranslator();
	this.smtpService =
    		Components.classes["@mozilla.org/messengercompose/smtp;1"].getService(Components.interfaces.nsISmtpService);
	this.email = email;
	this.fullName = (fullName?fullName:'');
	this.id = (this.__keyTranslator.isValidID(id))?id:"";
	this.smtp = (this.__keyTranslator.isValidSMTP(smtp))?smtp:""
	this.extras = extras?extras:new vI_storageExtras();
	this.comp = {	// holds the results of the last comparison for later creation of a compareMatrix
		compareID : null,
		equals : { fullName : {}, email : {}, smtpName : {}, idName : {}, extras : {} }
	}
	if (sideDescription) this.sideDescription = sideDescription;
	else if (this.idName) this.sideDescription = " - " + this.idName;
}
identityData.prototype = {
	email : null,
	fullName : null,
	id : null,
	smtp : null,
	extras : null,
	sideDescription : null,

	comp : null,	

	__keyTranslator : null,
	smtpService : null,
	ignoreFullNameWhileComparing : false,

	get combinedName() {
		var email = this.email?this.email.replace(/^\s+|\s+$/g,""):"";
		var fullName = this.fullName?this.fullName.replace(/^\s+|\s+$/g,""):"";
		return fullName?fullName+" <"+email+">":email
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
	get idName() { return this.__keyTranslator.getIDname(this.id); },
	get smtpName() { return this.__keyTranslator.getSMTPname(this.smtp); },

	__makeHtml : function (string) { return string?string.replace(/>/g,"&gt;").replace(/</g,"&lt;"):"" },
	get idHtml() { return this.__makeHtml(this.idName); },
	get smtpHtml() { return this.__makeHtml(this.smtpName); },
	get fullNameHtml() { return this.__makeHtml(this.fullName); },
	get emailHtml() { return this.__makeHtml(this.email); },
	get combinedNameHtml() { return this.__makeHtml(this.combinedName); },

	get idLabel() { return vI.elements.strings.getString("vident.identityData.baseID") },
	get smtpLabel() { return vI.elements.strings.getString("vident.identityData.SMTP") },
	get fullNameLabel() { return vI.elements.strings.getString("vident.identityData.Name") },
	get emailLabel() { return vI.elements.strings.getString("vident.identityData.Address") },

	// creates an Duplicate of the current IdentityData, cause usually we are working with a pointer
	getDuplicate : function() {
		return new identityData(this.email, this.fullName, this.id, this.smtp, this.extras.getDuplicate(), this.sideDescription);
	},

	isExistingIdentity : function() {
		vI_notificationBar.dump("## vI_storage: isExistingIdentity\n");
		if (this.__keyTranslator.getID(this.id)) {
			// if id is set, just grab the related identity and compare	
			if (this.__equalsIdentity(gAccountManager.getIdentity(this.id))) {
				vI_notificationBar.dump("## vI_storage: existing Identity found: " + this.id + "\n");
				return this.id;
			}
		}
		else {
			// loop and compare with all Identities
			var accounts = queryISupportsArray(gAccountManager.accounts, Components.interfaces.nsIMsgAccount);
			for (var i in accounts) {
				// skip possible active VirtualIdentity Accounts
				try { vI_account.prefroot.getBoolPref("mail.account."+accounts[i].key+".vIdentity"); continue; } catch (e) { };
		
				var identities = queryISupportsArray(accounts[i].identities, Components.interfaces.nsIMsgIdentity);
				for (var j in identities) {
					if (this.__equalsIdentity(identities[j])) {
						vI_notificationBar.dump("## vI_storage: existing Identity found: " + identities[j].key + "\n");
						return identities[j].key;
					}
				}
			}
		}
		vI_notificationBar.dump("## vI_storage: none existing Identity found.\n");
		return null;
	},

	__equalSMTP : function(compareSmtp) {
		var mainSmtp = this.smtp;
		if (!mainSmtp || !this.__keyTranslator.isValidSMTP(mainSmtp)) mainSmtp = this.smtpService.defaultServer.key;
		if (!compareSmtp || !this.__keyTranslator.isValidSMTP(compareSmtp)) compareSmtp = this.smtpService.defaultServer.key;
		return (mainSmtp == compareSmtp);
	},
	
	__equalID : function(compareID) {
		// if basic ID is not set (default) than answer equal
		if (!this.__keyTranslator.getID(this.id)) return true;
		return (this.id == compareID);
	},

	__equalsIdentity : function(identity) {
		var testIdentity = new identityData(
			identity.email,
			identity.fullName,
			identity.key,
			identity.smtpServerKey)
		testIdentity.extras.readIdentityValues(identity);
		return (this.equals(testIdentity));
	},

	equals : function(compareIdentityData) {
		this.comp.compareID = compareIdentityData;

		this.comp.equals.fullName = (this.ignoreFullNameWhileComparing || this.fullName == compareIdentityData.fullName)
		this.comp.equals.email = (this.email == compareIdentityData.email)
		this.comp.equals.smtpName = this.__equalSMTP(compareIdentityData.smtp);
		this.comp.equals.idName = this.__equalID(compareIdentityData.id);
		this.comp.equals.extras = this.extras.equal(compareIdentityData.extras);

		return (this.comp.equals.fullName && this.comp.equals.email && this.comp.equals.smtpName && this.comp.equals.idName && this.comp.equals.extras)
	},

	equalsCurrentIdentity : function(getCompareMatrix) {
		var compareIdentityData = document.getElementById("msgIdentity_clone").identityData;
		var retValue = { equal : null, compareMatrix : null };
		retValue.equal = this.equals(compareIdentityData);
		if (getCompareMatrix && !retValue.equal) // generate CompareMatrix only if asked and non-equal
			retValue.compareMatrix = this.getCompareMatrix();
		return retValue;
	},

	getCompareMatrix : function() {
		const Items = Array("fullName", "email", "smtp", "id");
		var string = "";		
		var saveBaseId = (vI_statusmenu.objSaveBaseIDMenuItem.getAttribute("checked") == "true")
		for each (item in Items) {
			var classEqual = (this.comp.equals[item])?"equal":"unequal";
			var classBaseID = ((!saveBaseId) && (item == "id"))?" ignoreBaseId":""
			string += "<tr>" +
				"<td class='col1 " + classEqual + "'>" + this[item+"Label"] + "</td>" +
				"<td class='col2 " + classEqual + classBaseID + "'>" + this.comp.compareID[item+"Html"] + "</td>" +
				"<td class='col3 " + classEqual + classBaseID + "'>" + this[item+"Html"] + "</td>" +
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

	addWithoutDuplicates : function(identityData) {
		for (var index = 0; index < this.number; index++) {
			if (this.identityDataCollection[index].email == identityData.email &&
				(!this.identityDataCollection[index].id || !identityData.id || 
					(this.identityDataCollection[index].id == identityData.id &&
					this.identityDataCollection[index].smtp == identityData.smtp))) {
				// found, so check if we can use the Name of the new field
				if (this.identityDataCollection[index].fullName == "" && identityData.fullName != "") {
					this.identityDataCollection[index].fullName = identityData.fullName;
					vI_notificationBar.dump("## identityCollection:   added fullName '" + identityData.fullName
						+ "' to stored email '" + this.identityDataCollection[index].email +"'\n")
				}
				// check if id_key, smtp_key or extras can be used
				// only try this once, for the first Identity where id is set)
				if (!this.identityDataCollection[index].id && identityData.id) {
					this.identityDataCollection[index].id = identityData.id;
					this.identityDataCollection[index].smtp = identityData.smtp;
					this.identityDataCollection[index].extras = identityData.extras;
					vI_notificationBar.dump("## identityCollection:   added id '" + identityData.id
						+ "' smtp '" + identityData.smtp + "' (+extras) to stored email '" + this.identityDataCollection[index].email +"'\n")
				}
				return;
			}
		}
		vI_notificationBar.dump("## identityCollection:   add new address to result:" + identityData.combinedName + "\n")
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

var vI_storage = {
	multipleRecipients : null,
	
	lastCheckedEmail : {}, 	// array of last checked emails per row,
				// to prevent ugly double dialogs and time-consuming double-checks
	
	rdfService : Components.classes["@mozilla.org/rdf/rdf-service;1"]
			.getService(Components.interfaces.nsIRDFService),

	prefroot : Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefService)
			.getBranch(null).QueryInterface(Components.interfaces.nsIPrefBranch2),
	
	clean: function() {
		vI_notificationBar.dump("## vI_storage: clean.\n");
		vI_storage.multipleRecipients = null;
		vI_storage.lastCheckedEmail = {};
		vI_storage.firstUsedInputElement = null;
		awSetInputAndPopupValue = vI_storage.original_functions.awSetInputAndPopupValue;
	},
	
	original_functions : {
		awSetInputAndPopupValue : null
	},

	replacement_functions : {
		awSetInputAndPopupValue : function (inputElem, inputValue, popupElem, popupValue, rowNumber) {
			vI_notificationBar.dump("## vI_storage: awSetInputAndPopupValue '" + inputElem.id +"'\n");
			vI_storage.original_functions.awSetInputAndPopupValue(inputElem, inputValue, popupElem, popupValue, rowNumber);
			vI_storage.updateVIdentityFromStorage(inputElem);
		}
	},
		
	awOnBlur : function (element) {
		// only react on events triggered by addressCol2 - textinput Elements
		if (!element || ! element.id.match(/^addressCol2*/)) return;
		vI_notificationBar.dump("## vI_storage: awOnBlur '" + element.id +"'\n");
		vI_storage.updateVIdentityFromStorage(element);
	},

	awPopupOnCommand : function (element) {
		vI_notificationBar.dump("## vI_storage: awPopupOnCommand'" + element.id +"'\n");
		vI_storage.updateVIdentityFromStorage(document.getElementById(element.id.replace(/^addressCol1/,"addressCol2")))
	},
	
	initialized : null,
	init: function() {
		if (!vI_storage.initialized) {
			// better approach would be to use te onchange event, but this one is not fired in any change case
			// see https://bugzilla.mozilla.org/show_bug.cgi?id=355367
			// same seems to happen with the ondragdrop event
			if (top.MAX_RECIPIENTS == 0) top.MAX_RECIPIENTS = 1;
			for (var row = 1; row <= top.MAX_RECIPIENTS ; row ++) {
				var input = awGetInputElement(row);
				if (input) {
					var oldBlur = input.getAttribute("onblur")
					input.setAttribute("onblur", (oldBlur?oldBlur+"; ":"") +
						"window.setTimeout(vI_storage.awOnBlur, 250, this.parentNode.parentNode.parentNode);")
				}
				var popup = awGetPopupElement(row);
				if (popup) {
					var oldCommand = popup.getAttribute("oncommand")
					popup.setAttribute("oncommand", (oldCommand?oldCommand+"; ":"") +
						"window.setTimeout(vI_storage.awPopupOnCommand, 250, this);")
				}
			}
			vI_storage.initialized = true;
		}
		vI_storage.original_functions.awSetInputAndPopupValue = awSetInputAndPopupValue;
		awSetInputAndPopupValue = function (inputElem, inputValue, popupElem, popupValue, rowNumber) {
			vI_storage.replacement_functions.awSetInputAndPopupValue (inputElem, inputValue, popupElem, popupValue, rowNumber) }
	},
	
	
	firstUsedInputElement : null, 	// this stores the first Element for which a Lookup in the Storage was successfull
	updateVIdentityFromStorage: function(inputElement) {		
		if (!vI.preferences.getBoolPref("storage"))
			{ vI_notificationBar.dump("## vI_storage: Storage deactivated\n"); return; }
		vI_notificationBar.dump("## vI_storage: updateVIdentityFromStorage()\n");

		var recipientType = document.getElementById(inputElement.id.replace(/^addressCol2/,"addressCol1"))
			.selectedItem.getAttribute("value");
		var row = inputElement.id.replace(/^addressCol2#/,"")
		if (recipientType == "addr_reply" || recipientType == "addr_followup" || vI_storage.__isDoBcc(row)) {
			// reset firstUsedInputElement if recipientType was changed (and don't care about doBcc fields)
			if (vI_storage.firstUsedInputElement == inputElement)
				vI_storage.firstUsedInputElement = null;
			vI_notificationBar.dump("## vI_storage: field is a 'reply-to' or 'followup-to' or preconfigured 'doBcc'. not searched.\n")
			return;
		}
		
		if (inputElement.value == "") {
			vI_notificationBar.dump("## vI_storage: no recipient found, not checked.\n"); return;
		}
		
		var row = inputElement.id.replace(/^addressCol2#/,"")
		if (vI_storage.lastCheckedEmail[row] && vI_storage.lastCheckedEmail[row] == inputElement.value) {
			vI_notificationBar.dump("## vI_storage: same email than before, not checked again.\n"); return;
		}
		vI_storage.lastCheckedEmail[row] = inputElement.value;
		var recipient = vI_storage.__getDescriptionAndType(inputElement.value, recipientType)
		var storageData = vI_rdfDatasource.readVIdentityFromRDF(recipient.recDesc, recipient.recType)
		if (!storageData) return;
		
		// found storageData, so store InputElement
		if (!vI_storage.firstUsedInputElement) vI_storage.firstUsedInputElement = inputElement;
		
		// add Identity to dropdown-menu
		var menuItem = document.getElementById("msgIdentity_clone").addIdentityToCloneMenu(storageData);

		vI_notificationBar.dump("## vI_storage: compare with current Identity\n");
		if (vI.preferences.getBoolPref("storage_getOneOnly") &&
			vI_storage.firstUsedInputElement &&
			vI_storage.firstUsedInputElement != inputElement &&
			!storageData.equalsCurrentIdentity(false).equal)
				vI_notificationBar.setNote(vI.elements.strings
					.getString("vident.smartIdentity.vIStorageCollidingIdentity"),
					"storage_notification");
		// only update fields if new Identity is different than old one.
		else {
			var compResult = storageData.equalsCurrentIdentity(true);
			if (!compResult.equal) {
				var warning = vI_storage.__getWarning("replaceVIdentity", recipient, compResult.compareMatrix);
				var msgIdentityCloneElem = document.getElementById("msgIdentity_clone")
				if (	!msgIdentityCloneElem.vid ||
					!vI.preferences.getBoolPref("storage_warn_vI_replace") ||
					vI_storage.__askWarning(warning)) {
						msgIdentityCloneElem.selectedMenuItem = menuItem;
						if (msgIdentityCloneElem.vid)
							vI_notificationBar.setNote(vI.elements.strings.getString("vident.smartIdentity.vIStorageUsage") + ".",
							"storage_notification");
				}
			}
		}
	},
	
	__getDescriptionAndType : function (recipient, recipientType) {
		if (recipientType == "addr_newsgroups")	return { recDesc : recipient, recType : "newsgroup" }
		else if (vI_storage.isMailingList(recipient))
			return { recDesc : vI_storage.getMailListName(recipient), recType : "maillist" }
		else return { recDesc : recipient, recType : "email" }
	},
		
	storeVIdentityToAllRecipients : function(msgType) {
		if (msgType != nsIMsgCompDeliverMode.Now) return;
		vI_notificationBar.dump("## vI_storage: ----------------------------------------------------------\n")
		if (!vI.preferences.getBoolPref("storage"))
			{ vI_notificationBar.dump("## vI_storage: Storage deactivated\n"); return; }
		
		if (vI_statusmenu.objStorageSaveMenuItem.getAttribute("checked") != "true") {
			vI_notificationBar.dump("## vI_storage: SaveMenuItem not checked.\n")
			return;
		}
		
		vI_notificationBar.dump("## vI_storage: storeVIdentityToAllRecipients()\n");
		
		// check if there are multiple recipients
		vI_storage.multipleRecipients = false;
		var recipients = 0;
		for (var row = 1; row <= top.MAX_RECIPIENTS; row ++) {
			var recipientType = awGetPopupElement(row).selectedItem.getAttribute("value");
			if (recipientType == "addr_reply" || recipientType == "addr_followup" || 
				vI_storage.__isDoBcc(row) || awGetInputElement(row).value.match(/^\s*$/) ) continue;
			if (recipients++ == 1) {
				vI_storage.multipleRecipients = true
				vI_notificationBar.dump("## vI_storage: multiple recipients found.\n")
				break;
			}
		}			
		
		for (var row = 1; row <= top.MAX_RECIPIENTS; row ++) {
			var recipientType = awGetPopupElement(row).selectedItem.getAttribute("value");
			if (recipientType == "addr_reply" || recipientType == "addr_followup" || 
				vI_storage.__isDoBcc(row) || awGetInputElement(row).value.match(/^\s*$/) ) continue;
			vI_storage.__updateStorageFromVIdentity(awGetInputElement(row).value, recipientType);
		}
		vI_notificationBar.dump("## vI_storage: ----------------------------------------------------------\n")
	},
	
	__getWarning : function(warningCase, recipient, compareMatrix) {
		var warning = { title: null, recLabel : null, recipient : null, warning : null, css: null, query : null };
		warning.title = vI.elements.strings.getString("vident." + warningCase + ".title")
		warning.recLabel = vI.elements.strings.getString("vident." + warningCase + ".recipient") +	" (" + recipient.recType + "):"
		warning.recipient = recipient.recDesc;
		warning.warning = 
			"<table class='" + warningCase + "'><thead><tr><th class='col1'/>" +
				"<th class='col2'>" + vI.elements.strings.getString("vident." + warningCase + ".currentIdentity") + "</th>" +
				"<th class='col3'>" + vI.elements.strings.getString("vident." + warningCase + ".storedIdentity") + "</th>" +
			"</tr></thead>" +
			"<tbody>" + compareMatrix + "</tbody>" +
			"</table>"
		warning.css = "vI_DialogBrowser.css";
		warning.query = vI.elements.strings.getString("vident." + warningCase + ".query")
		return warning;
	},

	__askWarning : function(warning) {
		var retVar = { returnValue: null };
		var answer = window.openDialog("chrome://v_identity/content/vI_Dialog.xul",0,
					"chrome, dialog, modal, alwaysRaised, resizable=yes",
					 warning, retVar)
		return retVar.returnValue;
	},
	
	__updateStorageFromVIdentity : function(recipient, recipientType) {
		vI_notificationBar.dump("## vI_storage: __updateStorageFromVIdentity.\n")
		var dontUpdateMultipleNoEqual = (vI.preferences.getBoolPref("storage_dont_update_multiple") &&
					vI_storage.multipleRecipients)
		
		recipient = vI_storage.__getDescriptionAndType(recipient, recipientType);
		var storageData = vI_rdfDatasource.readVIdentityFromRDF(recipient.recDesc, recipient.recType);
		if (storageData) {
			var compResult = storageData.equalsCurrentIdentity(true);
			if (!compResult.equal && !dontUpdateMultipleNoEqual) {
				var warning = vI_storage.__getWarning("updateStorage", recipient, compResult.compareMatrix);
				vI_notificationBar.dump("## vI_storage: " + warning + ".\n")
				if (!vI.preferences.getBoolPref("storage_warn_update") ||
						vI_storage.__askWarning(warning))
				vI_rdfDatasource.updateRDFFromVIdentity(recipient.recDesc, recipient.recType);
			}
		}
		else vI_rdfDatasource.updateRDFFromVIdentity(recipient.recDesc, recipient.recType);
	},
		
	
	// --------------------------------------------------------------------
	// the following function gets a queryString, a callFunction to call for every found Card related to the queryString
	// and a returnVar, which is passed to the callFunction and returned at the end.
	// this way the Storage-search is unified for all tasks
	_walkTroughCards : function (queryString, callFunction, returnVar) {
		var parentDir = vI_storage.rdfService.GetResource("moz-abdirectory://").QueryInterface(Components.interfaces.nsIAbDirectory);
		var enumerator = parentDir.childNodes;
		if (!enumerator) {vI_notificationBar.dump("## vI_storage: no addressbooks?\n"); return null;} // uups, no addressbooks?	
		while (enumerator && enumerator.hasMoreElements()) {
			var addrbook = enumerator.getNext();  // an addressbook directory
			addrbook.QueryInterface(Components.interfaces.nsIAbDirectory);
			var searchUri = (addrbook.directoryProperties?addrbook.directoryProperties.URI:addrbook.URI) + queryString;
			
			// just try the following steps, they might fail if addressbook wasn't configured the right way
			// not completely reproducible, but caused bug https://www.absorb.it/virtual-id/ticket/41
			try {
				var AbView = Components.classes["@mozilla.org/addressbook/abview;1"].createInstance(Components.interfaces.nsIAbView);
				AbView.init(searchUri, true, null, "GeneratedName", "ascending");
			} catch (ex) { break; };
			var directory = AbView.directory;
			
			// directory will now be a subset of the addressbook containing only those cards that match the searchstring
			if (!directory) break;
			var childCards = null; var keepGoing = 1;
			try { childCards = directory.childCards; childCards.first(); } catch (ex) { keepGoing = 0; }
			
			while (keepGoing == 1) {
				var currentCard = childCards.currentItem();
				currentCard.QueryInterface(Components.interfaces.nsIAbCard);
				returnVar = callFunction(addrbook, currentCard, returnVar);
				try { childCards.next(); } catch (ex) {	keepGoing = 0; }
			}
		}
		return returnVar;
	},
		
	// --------------------------------------------------------------------
	// check if recipient is a mailing list.
	// Similiar to Thunderbird, if there are muliple cards with the same displayName the mailinglist is preferred
	// see also https://bugzilla.mozilla.org/show_bug.cgi?id=408575
	isMailingList: function(recipient) {
		vI_notificationBar.dump("## vI_storage: isMailingList '" + recipient + "' \n")
		var queryString = "?(or(DisplayName,c," + encodeURIComponent(vI_storage.getMailListName(recipient)) + "))"
		var returnVar = vI_storage._walkTroughCards(queryString, vI_storage._isMailingListCard,
			{ mailListName : recipient, isMailList : false } )
		vI_notificationBar.dump("## vI_storage: isMailList  " + returnVar.isMailList + ".\n")
		return returnVar.isMailList;
	},	
	
	_isMailingListCard : function (addrbook, Card, returnVar) {
	// returnVar = { mailListName : mailListName, isMailList : false } 
		return { mailListName : returnVar.mailListName,
			isMailList : (returnVar.isMailList ||
			Card.isMailList && Card.displayName.toLowerCase() == returnVar.mailListName.toLowerCase()) }
	},
	
	// --------------------------------------------------------------------
	
	getMailListName : function(recipient) {
		if (recipient.match(/<[^>]*>/) || recipient.match(/$/)) {
			var mailListName = RegExp.leftContext + RegExp.rightContext
			mailListName = mailListName.replace(/^\s+|\s+$/g,"")
		}
		return mailListName;
	},
	
	__isDoBcc : function(row) {
		var recipientType = awGetPopupElement(row).selectedItem.getAttribute("value");
		if (recipientType != "addr_bcc" || !getCurrentIdentity().doBcc) return false
		var doBccArray = gMsgCompose.compFields.SplitRecipients(getCurrentIdentity().doBccList, false);
		for (var index = 0; index < doBccArray.count; index++ ) {
			if (doBccArray.StringAt(index) == awGetInputElement(row).value) {
				vI_notificationBar.dump("## vI_storage: ignoring doBcc field '" +
					doBccArray.StringAt(index) + "'.\n");
				return true;
			}
		}		
		return false
	},

	getVIdentityFromAllRecipients : function(allIdentities) {
		if (!vI.preferences.getBoolPref("storage"))
			{ vI_notificationBar.dump("## vI_storage: Storage deactivated\n"); return; }
		vI_notificationBar.dump("## vI_storage: getVIdentityFromAllRecipients()\n");

		for (var row = 1; row <= top.MAX_RECIPIENTS; row ++) {
			var recipientType = awGetPopupElement(row).selectedItem.getAttribute("value");
			if (recipientType == "addr_reply" || recipientType == "addr_followup" || vI_storage.__isDoBcc(row)) continue;
			vI_storage.lastCheckedEmail[row] = awGetInputElement(row).value;
			recipient = vI_storage.__getDescriptionAndType(awGetInputElement(row).value, recipientType);
			var storageData = vI_rdfDatasource.readVIdentityFromRDF(recipient.recDesc, recipient.recType);
			if (storageData) allIdentities.addWithoutDuplicates(storageData)
		}
		vI_notificationBar.dump("## vI_storage: found " + allIdentities.number + " address(es)\n")
	}
}
