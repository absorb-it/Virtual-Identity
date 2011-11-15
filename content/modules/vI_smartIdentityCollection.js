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
let Log = setupLogging("virtualIdentity.smartIdentityCollection");

function smartIdentityCollection(msgHdr, preseletedID, currentIDisVID, newsgroup, recipients) {
	dump("## smartIdentityCollection: constructor\n");
	this._IDisVID = currentIDisVID;
	this._preselectedID = preseletedID;
	this._msgHdr = msgHdr;
	this._newsgroup = newsgroup;
	this._unicodeConverter.charset = "UTF-8";
	this._recipients = recipients;
	this._rdfDatasourceAccess = new vI.rdfDatasourceAccess();
	this._allIdentities = new vI.identityCollection();
	dump("## smartIdentityCollection: constructor done \n");
};

smartIdentityCollection.prototype = {
	messenger : Components.classes["@mozilla.org/messenger;1"].createInstance()
		.QueryInterface(Components.interfaces.nsIMessenger),
	_pref : Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefService)
			.getBranch("extensions.virtualIdentity."),
	_unicodeConverter : Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
			.createInstance(Components.interfaces.nsIScriptableUnicodeConverter),
	_headerParser : Components.classes["@mozilla.org/messenger/headerparser;1"]
			.getService(Components.interfaces.nsIMsgHeaderParser),

	_msgComposeTypeReference : Components.interfaces.nsIMsgCompType,
	
	_IDisVID : false,
	_preselectedID : null,
	_allIdentities : null,
	_selectedValue : null,
	_newsgroup : null,
	_rdfDatasourceAccess : null,

	// this function adds a timestamp to the current sender
	__autoTimestamp : function() {
		Log.debug("## smartIdentity: __autoTimestamp()\n");
		if (this._IDisVID) {
			Log.debug("## smartIdentity: Virtual Identity in use, aborting\n");
			return;
		}

		var current_email = this._preselectedID.email.split("@");
		var localpart = current_email[0];
		var domain = current_email[1];
		
		Log.debug("## smartIdentity: current email: " + current_email[0] + "@" + current_email[1] + "\n");
		
		var autoString = this._pref.getCharPref("autoString");
		var formatString = this._pref.getCharPref("autoTimeFormat");
		
		var dateObj = new Date(); var dateString = "";
		if (formatString == "") dateString = parseInt(dateObj.getTime()/1000);
		else try {	//	you never know what the formatString will be...
			dateString = dateObj.toLocaleFormat(formatString).replace(/\s+|[\x00-\x2a]|\x2c|\x2f|[\x3a-\x40]|[\x5b-\x5d]|\x60|\x7c|[\x7f-\xff]/g,"_");
		} catch(e) { };
		
		var new_email = autoString.replace(/%l/g, localpart).replace(/%d/g, domain).replace(/%t/g,dateString);
		Log.debug("## smartIdentity: new email: " + new_email + "\n");

		var newIdentity = new vI.identityData(new_email,
			this._preselectedID.fullName, this._preselectedID.key, this._preselectedID.smtpServerKey, null, null)

		this._allIdentities.addWithoutDuplicates(newIdentity);
		this._selectedValue = 0;
	},
	
	__ignoreID : function() {
        Log.debug("## smartIdentity: checking " + this._pref.getCharPref("idSelection_ignoreIDs") + " against " + this._preselectedID.key + "\n")
        // check if usage if virtual Identities should be used at all for the currently selected ID
        if (this._pref.getCharPref("idSelection_ignoreIDs").indexOf(":" + this._preselectedID.key + ":") != -1) {
            Log.debug("## smartIdentity: not using virtual Identites for ID " + this._preselectedID.key + "\n");
            return true;
        }
        return false
    },
    
    NewMail : function() {
		Log.debug("## smartIdentity: NewMail()\n");
		if (this.__ignoreID()) return;
		this._rdfDatasourceAccess.getVIdentityFromAllRecipients(this._allIdentities, this._recipients);
		if (this._allIdentities.number == 0 && this._pref.getBoolPref("autoTimestamp")) this.__autoTimestamp();
	},
	
	_foundExistingIdentity : function() {
		/* compare with existing Identities										*/
		for (var index = 0; index < this._allIdentities.number; index++) {
			var existingID = this._allIdentities.identityDataCollection[index].isExistingIdentity(false);
			if (existingID) {
				this._allIdentities.identityDataCollection[index].id.key = existingID;	// set found identity
				// reorder list of Identities to prefer it on autoselect
				// has to be done before Identities are added to the Menu
				Log.debug("## smartIdentity: found existing Identity, reorder to prefer this one.\n");
				var firstIdentity = this._allIdentities.identityDataCollection[index];
				for (var i = index; index > 0; index--) {
					this._allIdentities.identityDataCollection[index] = this._allIdentities.identityDataCollection[index-1];
				}
				this._allIdentities.identityDataCollection[0] = firstIdentity;
				return { key: index };
			}
		}
		return null;
	},
	
	ReplyOnSent : function() {
		Log.debug("## smartIdentity: ReplyOnSent() (rules like SmartDraft)\n");
		this.__SmartDraftOrReplyOnSent();
		this._rdfDatasourceAccess.getVIdentityFromAllRecipients(this._allIdentities, this._recipients);
	},

	Draft : function() {
		Log.debug("## smartIdentity: Draft()\n");
		
		this.__SmartDraftOrReplyOnSent();
		this._rdfDatasourceAccess.getVIdentityFromAllRecipients(this._allIdentities, this._recipients);
	},
	
	__parseHeadersWithArray: function(header, identityCollection) {
		var emails = {}; var fullNames = {}; var combinedNames = {};
		var number = this._headerParser.parseHeadersWithArray(header, emails, fullNames, combinedNames);
		for (var index = 0; index < number; index++) {
			var newIdentity = new vI.identityData(emails.value[index], fullNames.value[index],
				null, vI.NO_SMTP_TAG, null, null);
			identityCollection.addWithoutDuplicates(newIdentity);
		}
	},

	// this function checks if we have a draft-case and Smart-Draft should replace the Identity
	__SmartDraftOrReplyOnSent : function() {
		if (!this._pref.getBoolPref("smart_draft"))
			{ Log.debug("## smartIdentity: SmartDraft deactivated\n"); return; }

		Log.debug("## smartIdentity: __SmartDraftOrReplyOnSent()\n");

		if (this._msgHdr) {
			this.__parseHeadersWithArray(this._msgHdr.author, this._allIdentities)
			Log.debug("## smartIdentity: sender '" + this._allIdentities.identityDataCollection[0].combinedName + "'\n");
		}
		else Log.debug("## smartIdentity: __SmartDraftOrReplyOnSent: No Header found, shouldn't happen\n");
	},
	
	__filterAddresses : function() {
		var returnIdentities = new vI.identityCollection();
		
		var filterList	=
			this._unicodeConverter.ConvertToUnicode(this._pref.getCharPref("smart_reply_filter")).split(/\n/)
		if (filterList.length == 0) filterList[0] == ""
		
		for (var i = 0; i < filterList.length; i++) {
			const filterType = { None : 0, RegExp : 1, StrCmp : 2 }
			var recentfilterType; var skipRegExp = false;
			if (filterList.length <= 1 && filterList[0] == "")
				{ Log.debug("## smartIdentity: no filters configured\n"); recentfilterType = filterType.None; }
			else if (/^[+-]?\/(.*)\/$/.exec(filterList[i]))
				{ Log.debug("## smartIdentity: filter emails with RegExp '"
					+ filterList[i].replace(/\\/g,"\\\\") + "'\n"); recentfilterType = filterType.RegExp; }
			else	{ Log.debug("## smartIdentity: filter emails, compare with '"
					+ filterList[i] + "'\n"); recentfilterType = filterType.StrCmp; }
			for (var j = 0; j < this._allIdentities.number; j++) { // check if recent email-address (pre-choosen identity) is found in 
			// copied and adapted from correctIdentity, thank you for the RegExp-idea!
				var add_addr = false;
				switch (recentfilterType) {
					case filterType.None:
						add_addr = true; break;
					case filterType.RegExp:
						if (skipRegExp) break;
						try { 	/^[+-]?\/(.*)\/$/.exec(filterList[i]);
							if ( filterList[i][0] == "-" ) {
								if (this._allIdentities.identityDataCollection[j].email.match(new RegExp(RegExp.$1,"i")))
									this._allIdentities.dropIdentity(j--);
							} else
								add_addr = (this._allIdentities.identityDataCollection[j].email.match(new RegExp(RegExp.$1,"i")));
						}
						catch(vErr) {
							SmartReplyNotification.info(
								vI.main.elements.strings.getString("vident.smartIdentity.ignoreRegExp") +
								+filterList[i].replace(/\\/g,"\\\\") + " .");
								skipRegExp = true; }
						break;
					case filterType.StrCmp:
						add_addr = ( this._allIdentities.identityDataCollection[j].email.toLowerCase().indexOf(filterList[i].toLowerCase()) != -1)
						break;
				}
				if (add_addr)	returnIdentities.addWithoutDuplicates(this._allIdentities.identityDataCollection[j])
			}
		}
		this._allIdentities.takeOver(returnIdentities);
	},
	
	__smartReplyCollectAddresses : function() {
		// add emails from selected headers (stored by vI_getHeader.xul/js)
		var reply_headers = this._unicodeConverter.ConvertToUnicode(this._pref.getCharPref("smart_reply_headers")).split(/\n/)
					
		for (var index = 0; index < reply_headers.length; index++) {
			// ------------- prepare fields to read the stored header ----------------
			var replyHeader_splitted = reply_headers[index].split(/:/)
			// use first part (all before ':') as the header name
			var replyHeaderName = replyHeader_splitted[0].toLowerCase()
			// check second or third part for any number
			var replyHeaderNumber = parseInt(replyHeader_splitted[1])
			if (isNaN(replyHeaderNumber)) replyHeaderNumber = parseInt(replyHeader_splitted[2])
			// check if Fullnames should be erased
			var replyHeaderEmptyFullNames = ((replyHeader_splitted[1] && replyHeader_splitted[1].match(/@/)) ||
							(replyHeader_splitted[2] && replyHeader_splitted[2].match(/@/)))
			
			// create header name to find the value
			var replyHeaderNameToRead = replyHeaderName
			if (!isNaN(replyHeaderNumber)) replyHeaderNameToRead += ":" + replyHeaderNumber
			
			// if mailing-list ignore to-header (usually the mailing list address)
			if (replyHeaderNameToRead == "to" && this._msgHdr.getStringProperty("vI_list-id")) {
				Log.debug("## smartIdentity: header 'list-id' found (mailinglist), skipping header 'to'\n");
				continue;
			}
			
			// ------------- read the stored header -------------------------------
			var value = this._unicodeConverter.ConvertToUnicode(this._msgHdr.getStringProperty("vI_" + replyHeaderNameToRead))
/*			let window3pane =  Components.classes['@mozilla.org/appshell/window-mediator;1']
                 .getService(Components.interfaces.nsIWindowMediator)
                 .getMostRecentWindow("mail:3pane");
			
			Log.debug("## smartIdentity: found stored header '" +
				replyHeaderNameToRead + "': '" + window3pane.virtualIdentityExtension.storedHeaders["vI_" + replyHeaderNameToRead] + "'\n");*/
			
			Log.debug("## smartIdentity: reading header '" +
				replyHeaderNameToRead + "': '" + value + "'\n");
			
			// ------------- parse address-string to get a field of single email-addresses
			var splitted = new vI.identityCollection();
			this.__parseHeadersWithArray(value, splitted);
			
			// move found addresses step by step to this._allIdentities, and change values if requested
			for (var i = 0; i < splitted.number; i++) {
				// if there is no email than it makes no sense to use it as a sender
				if (!splitted.identityDataCollection[i].email.match(/^.*@.*$/)) {
					Log.debug("## smartIdentity:   skipping '" +
					splitted.identityDataCollection[i].email + "', no email\n")
					continue;
				}

				if (replyHeaderEmptyFullNames) splitted.identityDataCollection[i].fullName = ""

				this._allIdentities.addWithoutDuplicates(splitted.identityDataCollection[i]);

				Log.debug("## smartIdentity:   found '" +
					splitted.identityDataCollection[i].combinedName + "'\n")
			}
		}
	},
	
	Reply : function() {
		Log.debug("## smartIdentity: Reply()\n");

		if (this._msgHdr && this._newsgroup && !this._msgHdr.getStringProperty("vI_content_base")) {
		//	RFC 2821 (http://www.ietf.org/rfc/rfc2821.txt) says:
		//	"4.4 Trace Information
		//	When an SMTP server receives a message for delivery or further
		//	processing, it MUST insert trace ("time stamp" or "Received")
		//	information at the beginning of the message content, as discussed in
		//	section 4.1.1.4."
		//	so it should be always possible to decide if Reply or Draft based on received headers
		//	hidden option smart_detectByReceivedHeader will act as a switch for not RFC-compliant servers
			// RFC-compliant
			if (this._pref.getBoolPref("smart_detectByReceivedHeader")) {
				if (!this._msgHdr.getStringProperty("vI_received")) { // mail was not received
					Log.debug("## smartIdentity: reply on non-received (sent?) mail. Using SmartDraft. \n");
					this.ReplyOnSent();
					return;
				}
			}
			// not RFC-compliant
			else {
				const MSG_FOLDER_FLAG_INBOX = 0x1000
				const MSG_FOLDER_FLAG_SENTMAIL = 0x0200;

				if (this._msgHdr && (this._msgHdr.folder.flags & MSG_FOLDER_FLAG_SENTMAIL)) {
					Log.debug("## smartIdentity: reply from Sent folder.");
					if (this._msgHdr.folder.flags & MSG_FOLDER_FLAG_INBOX)
						Log.debug(" Folder is INBOX, assuming Reply-Case. \n");
					else {
						Log.debug(" Using SmartDraft. \n");
						this.ReplyOnSent();
						return;
					}
				}
			}
		}
		
        if (this.__ignoreID()) return;
		
		var storageIdentities = new vI.identityCollection();
		this._rdfDatasourceAccess.getVIdentityFromAllRecipients(storageIdentities, this._recipients);
		
		if (storageIdentities.number == 0 || !this._pref.getBoolPref("idSelection_storage_ignore_smart_reply"))
			this.__SmartReply();
		else Log.debug("## smartIdentity: SmartReply skipped, Identities in Storage found.\n");

		// merge SmartReply-Identities and Storage-Identites
		if (this._pref.getBoolPref("idSelection_storage_prefer_smart_reply"))
			{ this._allIdentities.mergeWithoutDuplicates(storageIdentities); }
		else {
			var smartIdentities = this._allIdentities;
			this._allIdentities = storageIdentities;		
			this._allIdentities.mergeWithoutDuplicates(smartIdentities);
		}
		
		Log.debug("## smartIdentity: merged SmartReply & Storage, " + this._allIdentities.number + " address(es) left\n")
	},
	
	// this function checks if we have a reply-case and Smart-Reply should replace the Identity
	__SmartReply : function() {
		if (!this._pref.getBoolPref("smart_reply"))
			{ Log.debug("## smartIdentity: SmartReply deactivated\n"); return; }
		if (this._newsgroup && !this._pref.getBoolPref("smart_reply_for_newsgroups")) {
			Log.debug("## smartIdentity: SmartReply, answering to a newsgroup, aborting\n");
			return;
		}

		Log.debug("## smartIdentity: __SmartReply()\n");
		Log.debug("## smartIdentity: ----------------------------------------------------------\n")
		if (this._msgHdr) {
			/* first step: collect addresses */
			this.__smartReplyCollectAddresses();
			Log.debug("## smartIdentity: " + this._allIdentities.number + " address(es) after parsing, before filtering\n")
			
			/* second step: filter (and sort) addresses */
			this.__filterAddresses();
			
			Log.debug("## smartIdentity: filtering done, " + this._allIdentities.number + " address(es) left\n")
			
			/* set default FullName */
			var smart_reply_defaultFullName = this._unicodeConverter.ConvertToUnicode(this._pref.getCharPref("smart_reply_defaultFullName"))
			if (smart_reply_defaultFullName != "") {
				for (var index = 0; index < this._allIdentities.number; index++) {
					if (this._allIdentities.identityDataCollection[index].fullName == "") {
						this._allIdentities.identityDataCollection[index].fullName = smart_reply_defaultFullName
						Log.debug("## smartIdentity: added default FullName '" + 
							smart_reply_defaultFullName + "' to '" + this._allIdentities.identityDataCollection[index].email + "'\n")
					}
				}
			}	

			/* smart_reply_ignoreFullName: compare email with other Identities			*/
			/* if match replace FullName with existing one, keep identity in list by now 		*/
			/* will not be added to the menu but probably choosen with __smartIdentitySelection 	*/
			if (this._pref.getBoolPref("smart_reply_ignoreFullName")) {
				Log.debug("## smartIdentity: compare with existing Identities (ignoring FullNames).\n")
			
				for (var index = 0; index < this._allIdentities.number; index++) {
					var idKey = this._allIdentities.identityDataCollection[index].isExistingIdentity(true);
					if (idKey) {
						var newFullName = gAccountManager.getIdentity(idKey).fullName;
						this._allIdentities.identityDataCollection[index].fullName = newFullName;
						Log.debug("## smartIdentity: replaced Fullname of '" + this._allIdentities.identityDataCollection[index].email + "' with '" + newFullName + "' \n");
					}
				}
			}
		}
		else Log.debug("## smartIdentity: SmartReply skipped. No Header-information found.\n");
		
		Log.debug("## smartIdentity: ----------------------------------------------------------\n")
	},
	

};
vI.smartIdentityCollection = smartIdentityCollection;
}});