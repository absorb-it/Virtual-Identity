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

var EXPORTED_SYMBOLS = ["smartIdentityCollection"]

Components.utils.import("resource://v_identity/vI_log.js");
Components.utils.import("resource://v_identity/vI_identityData.js");
Components.utils.import("resource://v_identity/vI_rdfDatasource.js");
Components.utils.import("resource://v_identity/vI_prefs.js");

Components.utils.import("resource://v_identity/strftime/strftime.js");

let Log = setupLogging("virtualIdentity.smartIdentityCollection");

function smartIdentityCollection(currentWindow, msgHdr, preseletedID, currentIDisVID, newsgroup, recipients) {
  this._currentWindow = currentWindow;
  this._IDisVID = currentIDisVID;
  this._preselectedID = preseletedID;
  this._msgHdr = msgHdr;
  this._newsgroup = newsgroup;
  this._unicodeConverter.charset = "UTF-8";
  this._recipients = recipients;
  this._rdfDatasourceAccess = new rdfDatasourceAccess(this._currentWindow);
  this._allIdentities = new identityCollection();
};

smartIdentityCollection.prototype = {
  _currentWindow: null,

  messenger: Components.classes["@mozilla.org/messenger;1"].createInstance()
    .QueryInterface(Components.interfaces.nsIMessenger),
  _unicodeConverter: Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
    .createInstance(Components.interfaces.nsIScriptableUnicodeConverter),
  _headerParser: Components.classes["@mozilla.org/messenger/headerparser;1"]
    .getService(Components.interfaces.nsIMsgHeaderParser),

  _msgComposeTypeReference: Components.interfaces.nsIMsgCompType,

  _IDisVID: false,
  _preselectedID: null,
  _allIdentities: null,
  _selectedValue: null,
  _newsgroup: null,
  _rdfDatasourceAccess: null,

  // this function adds a timestamp to the current sender
  __autoTimestamp: function () {
    Log.debug("__autoTimestamp()");
    if (this._IDisVID) {
      Log.debug("Virtual Identity in use, aborting");
      return;
    }

    var current_email = this._preselectedID.email.split("@");
    var localpart = current_email[0];
    var domain = current_email[1];

    Log.debug("current email: " + current_email[0] + "@" + current_email[1]);

    var autoString = vIprefs.get("autoString");
    var formatString = vIprefs.get("autoTimeFormat");

    var dateObj = new Date();
    var dateString = "";
    if (formatString == "") 
      dateString = parseInt(dateObj.getTime() / 1000);
    else try { //	you never know what the formatString will be...
      dateString = strftime(formatString, dateObj);
    } catch (e) {};

    var new_email = autoString.replace(/%l/g, localpart).replace(/%d/g, domain).replace(/%t/g, dateString);
    Log.debug("new email: " + new_email);

    var newIdentity = new identityData(this._currentWindow, new_email,
      this._preselectedID.fullName, this._preselectedID.key, null, null)

    this._allIdentities.addWithoutDuplicates(newIdentity);
    this._selectedValue = 0;
  },

  __ignoreID: function () {
    Log.debug("checking " + vIprefs.get("idSelection_ignoreIDs") + " against " + this._preselectedID.key)
      // check if usage if virtual Identities should be used at all for the currently selected ID
    if (vIprefs.get("idSelection_ignoreIDs").indexOf(":" + this._preselectedID.key + ":") != -1) {
      Log.debug("not using virtual Identites for ID " + this._preselectedID.key);
      return true;
    }
    return false
  },

  NewMail: function () {
    Log.debug("NewMail()");
    if (this.__ignoreID()) return;
    this._rdfDatasourceAccess.getVIdentityFromAllRecipients(this._allIdentities, this._recipients);
    if (this._allIdentities.number == 0 && vIprefs.get("autoTimestamp")) this.__autoTimestamp();
  },

  _foundExistingIdentity: function () {
    /* compare with existing Identities										*/
    for (var index = 0; index < this._allIdentities.number; index++) {
      var existingID = this._allIdentities.identityDataCollection[index].isExistingIdentity(false);
      if (existingID) {
        this._allIdentities.identityDataCollection[index].id.key = existingID; // set found identity
        // reorder list of Identities to prefer it on autoselect
        // has to be done before Identities are added to the Menu
        Log.debug("found existing Identity, reorder to prefer this one.");
        var firstIdentity = this._allIdentities.identityDataCollection[index];
        for (var i = index; index > 0; index--) {
          this._allIdentities.identityDataCollection[index] = this._allIdentities.identityDataCollection[index - 1];
        }
        this._allIdentities.identityDataCollection[0] = firstIdentity;
        return {
          key: index
        };
      }
    }
    return null;
  },

  ReplyOnSent: function () {
    Log.debug("ReplyOnSent() (rules like SmartDraft)");
    this.__SmartDraftOrReplyOnSent();
    this._rdfDatasourceAccess.getVIdentityFromAllRecipients(this._allIdentities, this._recipients);
  },

  Draft: function () {
    Log.debug("Draft()");

    this.__SmartDraftOrReplyOnSent();
    this._rdfDatasourceAccess.getVIdentityFromAllRecipients(this._allIdentities, this._recipients);
  },

  __parseHeadersWithArray: function (header, identityCollection) {
    var emails = {};
    var fullNames = {};
    var combinedNames = {};
    var number = this._headerParser.parseHeadersWithArray(header, emails, fullNames, combinedNames);
    for (var index = 0; index < number; index++) {
      var newIdentity = new identityData(this._currentWindow, emails.value[index], fullNames.value[index],
        null, null, null);
      identityCollection.addWithoutDuplicates(newIdentity);
    }
  },

  // this function checks if we have a draft-case and Smart-Draft should replace the Identity
  __SmartDraftOrReplyOnSent: function () {
    if (!vIprefs.get("smart_draft")) {
      Log.debug("SmartDraft deactivated");
      return;
    }

    Log.debug("__SmartDraftOrReplyOnSent()");

    if (this._msgHdr) {
      this.__parseHeadersWithArray(this._msgHdr.author, this._allIdentities)
      Log.debug("sender '" + this._allIdentities.identityDataCollection[0].combinedName + "'");
    } else Log.debug("__SmartDraftOrReplyOnSent: No Header found, shouldn't happen");
  },

  __filterAddresses: function () {
    var returnIdentities = new identityCollection();

    var filterList =
      this._unicodeConverter.ConvertToUnicode(vIprefs.get("smart_reply_filter")).split(/\n/)
    if (filterList.length == 0) filterList[0] == ""

    for (var i = 0; i < filterList.length; i++) {
      const filterType = {
        None: 0,
        RegExp: 1,
        StrCmp: 2
      }
      var recentfilterType;
      var skipRegExp = false;
      if (filterList.length <= 1 && filterList[0] == "") {
        Log.debug("no filters configured");
        recentfilterType = filterType.None;
      } else if (/^[+-]?\/(.*)\/$/.exec(filterList[i])) {
        Log.debug("filter emails with RegExp '" + filterList[i].replace(/\\/g, "\\\\") + "'");
        recentfilterType = filterType.RegExp;
      } else {
        Log.debug("filter emails, compare with '" + filterList[i] + "'");
        recentfilterType = filterType.StrCmp;
      }
      for (var j = 0; j < this._allIdentities.number; j++) { // check if recent email-address (pre-choosen identity) is found in 
        // copied and adapted from correctIdentity, thank you for the RegExp-idea!
        var add_addr = false;
        switch (recentfilterType) {
        case filterType.None:
          add_addr = true;
          break;
        case filterType.RegExp:
          if (skipRegExp) break;
          try {
            /^[+-]?\/(.*)\/$/.exec(filterList[i]);
            if (filterList[i][0] == "-") {
              if (this._allIdentities.identityDataCollection[j].email.match(new RegExp(RegExp.$1, "i")))
                this._allIdentities.dropIdentity(j--);
            } else
              add_addr = (this._allIdentities.identityDataCollection[j].email.match(new RegExp(RegExp.$1, "i")));
          } catch (vErr) {
            this.stringBundle = Components.classes["@mozilla.org/intl/stringbundle;1"]
              .getService(Components.interfaces.nsIStringBundleService)
              .createBundle("chrome://v_identity/locale/v_identity.properties");
            SmartReplyNotification.info(
              this.stringBundle.GetStringFromName("vident.smartIdentity.ignoreRegExp") +
              +filterList[i].replace(/\\/g, "\\\\") + " .");
            skipRegExp = true;
          }
          break;
        case filterType.StrCmp:
          add_addr = (this._allIdentities.identityDataCollection[j].email.toLowerCase().indexOf(filterList[i].toLowerCase()) != -1)
          break;
        }
        if (add_addr) returnIdentities.addWithoutDuplicates(this._allIdentities.identityDataCollection[j])
      }
    }
    this._allIdentities.takeOver(returnIdentities);
  },

  __smartReplyCollectAddresses: function () {
    // add emails from selected headers (stored by vI_getHeader.xul/js)
    var reply_headers = this._unicodeConverter.ConvertToUnicode(vIprefs.get("smart_reply_headers")).split(/\n/)

    for (var index = 0; index < reply_headers.length; index++) {
      // ------------- prepare fields to read the stored header ----------------
      var replyHeader_splitted = reply_headers[index].split(/:/)
        // use first part (all before ':') as the header name
      var replyHeaderName = replyHeader_splitted[0].toLowerCase()
        // check second or third part for any number
      var replyHeaderNumber = null;
      if (replyHeader_splitted.length > 1) parseInt(replyHeader_splitted[1]);
      if ((!replyHeaderNumber || isNaN(replyHeaderNumber)) && replyHeader_splitted.length > 2) replyHeaderNumber = parseInt(replyHeader_splitted[2]);
      // check if Fullnames should be erased
      var replyHeaderEmptyFullNames = ((replyHeader_splitted[1] && replyHeader_splitted[1].match(/@/)) ||
        (replyHeader_splitted[2] && replyHeader_splitted[2].match(/@/)));

      // create header name to find the value
      var replyHeaderNameToRead = replyHeaderName
      if (replyHeaderNumber && !isNaN(replyHeaderNumber)) replyHeaderNameToRead += ":" + replyHeaderNumber

      // if mailing-list ignore to-header (usually the mailing list address)
      if ((replyHeaderNameToRead == "to" || replyHeaderNameToRead == "x-original-to") && this._msgHdr.getStringProperty("vI_list-id")) {
        Log.debug("header 'list-id' found (mailinglist), skipping header '" + replyHeaderNameToRead + "'");
        continue;
      }

      // if mailing-list ignore to-header (usually the mailing list address)
      if (replyHeaderNameToRead == "to" && this._msgHdr.getStringProperty("vI_list-id")) {
        Log.debug("header 'list-id' found (mailinglist), skipping header 'to'");
        continue;
      }

      // ------------- read the stored header -------------------------------
      var value = this._unicodeConverter.ConvertToUnicode(this._msgHdr.getStringProperty("vI_" + replyHeaderNameToRead))
        /*			let window3pane =  Components.classes['@mozilla.org/appshell/window-mediator;1']
                         .getService(Components.interfaces.nsIWindowMediator)
                         .getMostRecentWindow("mail:3pane");
        			
        			Log.debug("found stored header '" +
        				replyHeaderNameToRead + "': '" + window3pane.virtualIdentityExtension.storedHeaders["vI_" + replyHeaderNameToRead] + "'");*/

      Log.debug("reading header '" +
        replyHeaderNameToRead + "': '" + value + "'");

      // ------------- parse address-string to get a field of single email-addresses
      var splitted = new identityCollection();
      this.__parseHeadersWithArray(value, splitted);

      // move found addresses step by step to this._allIdentities, and change values if requested
      for (var i = 0; i < splitted.number; i++) {
        // if there is no email than it makes no sense to use it as a sender
        if (!splitted.identityDataCollection[i].email.match(/^.*@.*$/)) {
          Log.debug("  skipping '" +
            splitted.identityDataCollection[i].email + "', no email")
          continue;
        }

        if (replyHeaderEmptyFullNames) splitted.identityDataCollection[i].fullName = ""

        this._allIdentities.addWithoutDuplicates(splitted.identityDataCollection[i]);

        Log.debug("  found '" +
          splitted.identityDataCollection[i].combinedName + "'")
      }
    }
  },

  Reply: function () {
    Log.debug("Reply()");

    if (this._msgHdr && !this._newsgroup && !this._msgHdr.getStringProperty("vI_content_base")) {
      //	RFC 2821 (http://www.ietf.org/rfc/rfc2821.txt) says:
      //	"4.4 Trace Information
      //	When an SMTP server receives a message for delivery or further
      //	processing, it MUST insert trace ("time stamp" or "Received")
      //	information at the beginning of the message content, as discussed in
      //	section 4.1.1.4."
      //	so it should be always possible to decide if Reply or Draft based on received headers
      //	hidden option smart_detectByReceivedHeader will act as a switch for not RFC-compliant servers
      // RFC-compliant
      if (vIprefs.get("smart_detectByReceivedHeader")) {
        if (!this._msgHdr.getStringProperty("vI_received")) { // mail was not received
          Log.debug("reply on non-received (sent?) mail. Using SmartDraft.");
          this.ReplyOnSent();
          return;
        }
      }
      // not RFC-compliant
      else {
        const MSG_FOLDER_FLAG_INBOX = 0x1000
        const MSG_FOLDER_FLAG_SENTMAIL = 0x0200;

        if (this._msgHdr && (this._msgHdr.folder.flags & MSG_FOLDER_FLAG_SENTMAIL)) {
          if (this._msgHdr.folder.flags & MSG_FOLDER_FLAG_INBOX)
            Log.debug("reply from Sent folder. Folder is INBOX, assuming Reply-Case.");
          else {
            Log.debug("reply from Sent folder. Using SmartDraft.");
            this.ReplyOnSent();
            return;
          }
        }
      }
    }

    if (this.__ignoreID()) return;

    var storageIdentities = new identityCollection();
    this._rdfDatasourceAccess.getVIdentityFromAllRecipients(storageIdentities, this._recipients);

    if (storageIdentities.number == 0 || !vIprefs.get("idSelection_storage_ignore_smart_reply"))
      this.__SmartReply();
    else Log.debug("SmartReply skipped, Identities in Storage found.");

    // merge SmartReply-Identities and Storage-Identites
    if (vIprefs.get("idSelection_storage_prefer_smart_reply")) {
      this._allIdentities.mergeWithoutDuplicates(storageIdentities);
    } else {
      var smartIdentities = this._allIdentities;
      this._allIdentities = storageIdentities;
      this._allIdentities.mergeWithoutDuplicates(smartIdentities);
    }

    Log.debug("merged SmartReply & Storage, " + this._allIdentities.number + " address(es) left")
  },

  // this function checks if we have a reply-case and Smart-Reply should replace the Identity
  __SmartReply: function () {
    if (!vIprefs.get("smart_reply")) {
      Log.debug("SmartReply deactivated");
      return;
    }
    if (this._newsgroup && !vIprefs.get("smart_reply_for_newsgroups")) {
      Log.debug("SmartReply, answering to a newsgroup, aborting");
      return;
    }

    Log.debug("__SmartReply()");
    Log.debug("----------------------------------------------------------")
    if (this._msgHdr) {
      /* first step: collect addresses */
      this.__smartReplyCollectAddresses();
      Log.debug("" + this._allIdentities.number + " address(es) after parsing, before filtering")

      /* second step: filter (and sort) addresses */
      this.__filterAddresses();

      Log.debug("filtering done, " + this._allIdentities.number + " address(es) left")

      /* set default FullName */
      var smart_reply_defaultFullName = this._unicodeConverter.ConvertToUnicode(vIprefs.get("smart_reply_defaultFullName"))
      if (smart_reply_defaultFullName != "") {
        for (var index = 0; index < this._allIdentities.number; index++) {
          if (this._allIdentities.identityDataCollection[index].fullName == "") {
            this._allIdentities.identityDataCollection[index].fullName = smart_reply_defaultFullName
            Log.debug("added default FullName '" +
              smart_reply_defaultFullName + "' to '" + this._allIdentities.identityDataCollection[index].email + "'")
          }
        }
      }

      /* smart_reply_ignoreFullName: compare email with other Identities			*/
      /* if match replace FullName with existing one, keep identity in list by now 		*/
      /* will not be added to the menu but probably choosen with __smartIdentitySelection 	*/
      if (vIprefs.get("smart_reply_ignoreFullName")) {
        Log.debug("compare with existing Identities (ignoring FullNames).")

        for (var index = 0; index < this._allIdentities.number; index++) {
          var idKey = this._allIdentities.identityDataCollection[index].isExistingIdentity(true);
          if (idKey) {
            var AccountManager = Components.classes["@mozilla.org/messenger/account-manager;1"]
              .getService(Components.interfaces.nsIMsgAccountManager);
            var newFullName = AccountManager.getIdentity(idKey).fullName;
            this._allIdentities.identityDataCollection[index].fullName = newFullName;
            Log.debug("replaced Fullname of '" + this._allIdentities.identityDataCollection[index].email + "' with '" + newFullName + "'");
          }
        }
      }

      /* smart_reply_searchBaseIdentity: compare email with other Identities          */
      /* to find matching domain. Use first found as base identity (smtp etc) */
      if (vIprefs.get("smart_reply_searchBaseIdentity")) {
        Log.debug("compare domain name with existing accounts.")

        for (var index = 0; index < this._allIdentities.number; index++) {
          var idKey = this._allIdentities.identityDataCollection[index].hasMatchingDomainIdentity();
          if (idKey) {
            Log.debug("use id with matching domain as base ID");
            this._allIdentities.identityDataCollection[index].id.key = idKey;
          }
        }
      }

    } else Log.debug("SmartReply skipped. No Header-information found.");

    Log.debug("----------------------------------------------------------")
  },


};
