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

var EXPORTED_SYMBOLS = ["identityCollection", "identityData", "identityDataExtras", "DEFAULT_SMTP_TAG", "NO_SMTP_TAG"]

const DEFAULT_SMTP_TAG = "vI_useDefaultSMTP"
const NO_SMTP_TAG = "vI_noStoredSMTP"

Components.utils.import("resource://v_identity/vI_log.js");
let Log = setupLogging("virtualIdentity.identityData");
Components.utils.import("resource://v_identity/vI_prefs.js");
Components.utils.import("resource://v_identity/vI_accountUtils.js");

Components.utils.import("resource://v_identity/vI_identityDataExtras.js");
Components.utils.import("resource://v_identity/identityDataExtras/returnReceipt.js");
Components.utils.import("resource://v_identity/identityDataExtras/messageFormat.js");
Components.utils.import("resource://v_identity/identityDataExtras/characterEncoding.js");
Components.utils.import("resource://v_identity/identityDataExtras/sMimeEncryption.js");
Components.utils.import("resource://v_identity/identityDataExtras/sMimeSignature.js");

ChromeUtils.import("resource:///modules/mailServices.js");

function identityData(currentWindow, email, fullName, id, extras, sideDescription, existingID) {
  this._currentWindow = currentWindow;
  this._email = email ? email : "";
  this._emailParsed = false;
  this._fullName = fullName ? fullName : "";
  this.id = new idObj(id);
  if (extras) this.extras = extras;
  else this.extras = new identityDataExtras(currentWindow);
  this.comp = { // holds the results of the last comparison for later creation of a compareMatrix
    compareID: null,
    equals: {
      fullName: {},
      email: {},
      id: {},
      extras: {}
    }
  }
  if (sideDescription) this.sideDescription = sideDescription;
  if (existingID) this.existingID = existingID;
  else if (this.id.value) this.sideDescription = " - " + this.id.value;
  this.stringBundle = Components.classes["@mozilla.org/intl/stringbundle;1"]
    .getService(Components.interfaces.nsIStringBundleService)
    .createBundle("chrome://v_identity/locale/v_identity.properties");
}
identityData.prototype = {
  _email: null, // internal email-field might contain combinedName (until first queried via email)
  _fullName: null,
  _emailParsed: null,
  _currentWindow: null,
  id: null,
  extras: null,
  sideDescription: null,
  existingID: null, // indicates that this is a pre-defined Identity, which might handled slightly differently

  stringBundle: null,
  comp: null,

  parseEmail: function () {
    if (this._emailParsed) return;
    // parse email and move any additional parts to fullName
    if (this._email.match(/<\s*[^>\s]*@[^>\s]*\s*>/) || this._email.match(/<?\s*[^>\s]*@[^>\s]*\s*>?/) || this._email.match(/$/)) {
      this._fullName += RegExp.leftContext + RegExp.rightContext;
      this._email = RegExp.lastMatch;
      // 			Log.debug("parseEmail _fullName = '" + this._fullName + "'");
      // 			Log.debug("parseEmail _email =    '" + this._email + "'");
    }
    this._emailParsed = true;
  },
  get email() {
    this.parseEmail();
    return (this._email ? this._email.replace(/\s+|<|>/g, "") : "");
  },
  set email(email) {
    this._email = email;
    this._emailParsed = false;
  },

  cleanName: function (fullName) {
    // 		Log.debug("cleanName init '" + fullName + "'");
    var _fullName = fullName.replace(/^\s+|\s+$/g, "");
    if (_fullName.search(/^\".+\"$|^'.+'$/g) != -1) {
      _fullName = this.cleanName(_fullName.replace(/^\"(.+)\"$|^'(.+)'$/g, "$1$2"));
    }
    // 		Log.debug("cleanName done '" + _fullName + "'");
    return _fullName;
  },

  get fullName() {
    this.parseEmail();
    return (this._fullName ? this.cleanName(this._fullName) : "")
  },
  set fullName(fullName) {
    this._fullName = fullName;
  },

  get combinedName() {
    var fullName = this.fullName;
    var email = this.email;
    return fullName ? fullName + (email ? " <" + email + ">" : "") : email
  },
  set combinedName(combinedName) {
    this._email = combinedName;
    this._fullName = "";
    this._emailParsed = false;
  },

  __makeHtml: function (string) {
    return string ? string.replace(/>/g, "&gt;").replace(/</g, "&lt;") : ""
  },
  get idHtml() {
    return this.__makeHtml(this.id.value);
  },
  get smtpHtml() {
    return this.__makeHtml(this.id.smtpServerName);
  },
  get fullNameHtml() {
    return this.__makeHtml(this.fullName);
  },
  get emailHtml() {
    return this.__makeHtml(this.email);
  },
  get combinedNameHtml() {
    return this.__makeHtml(this.combinedName);
  },

  get idLabel() {
    return this.stringBundle.GetStringFromName("vident.identityData.baseID")
  },
  get smtpLabel() {
    return this.stringBundle.GetStringFromName("vident.identityData.SMTP")
  },
  get fullNameLabel() {
    return this.stringBundle.GetStringFromName("vident.identityData.Name")
  },
  get emailLabel() {
    return this.stringBundle.GetStringFromName("vident.identityData.Address")
  },

  // creates an Duplicate of the current IdentityData, cause usually we are working with a pointer
  getDuplicate: function () {
    return new identityData(this._currentWindow, this.email, this.fullName, this.id.key, this.extras ? this.extras.getDuplicate() : null,
      this.sideDescription, this.existingID);
  },
  
  takeOverAvailableData: function(identityData) {
    if (identityData.email) {
      this.email = identityData.email;
      this.fullName = identityData.fullName;
    }
    if (identityData.id.key)
      this.id.key = identityData.id.key;
    if (identityData.sideDescription)
      this.sideDescription = identityData.sideDescription;
    if (identityData.extras)
      this.extras.copy(identityData.extras);
  },

  // copys all values of an identity. This way we can create a new object with a different document-context
  copy: function (identityData) {
    this.email = identityData.email;
    this.fullName = identityData.fullName;
    this.id.key = identityData.id.key;
    this.sideDescription = identityData.sideDescription;
    if (this.extras) this.extras.copy(identityData.extras);
    // don't copy the currentWindow value
  },

  // dependent on MsgComposeCommands, should/will only be called in ComposeDialog
  isExistingIdentity: function (ignoreFullNameWhileComparing) {
    var intenseDebug = false;
    if (intenseDebug)
      Log.debug("isExistingIdentity: ignoreFullNameWhileComparing='" + ignoreFullNameWhileComparing + "'");
    // 		Log.debug("base: fullName.toLowerCase()='" + this.fullName + "' email.toLowerCase()='" + this.email + "'");

    var ignoreFullNameMatchKey = null;
    var accounts = getAccountsArray();
    for (let acc = 0; acc < accounts.length; acc++) {
      let account = accounts[acc];
      try {
        prefroot.getBoolPref("mail.account." + account.key + ".vIdentity");
        continue;
      } catch (e) {};
      let identities = getIdentitiesArray(account);
      for (let i = 0; i < identities.length; i++) {
        let identity = identities[i];
        // 				Log.debug("comp: fullName.toLowerCase()='" + identity.fullName.toLowerCase() + "' email.toLowerCase()='" + identity.email.toLowerCase() + "'");
        var email = this.email ? this.email : ""; // might be null if no identity is set
        var idEmail = identity.email ? identity.email : ""; // might be null if no identity is set
        if (email.toLowerCase() == idEmail.toLowerCase()) {
          // if fullName matches, than this is a final match
          if (this.fullName.toLowerCase() == identity.fullName.toLowerCase()) {
            if (intenseDebug)
              Log.debug("isExistingIdentity: " + this.combinedName + " found, id='" + identity.key + "'");
            return identity.key; // return key and stop searching
          }
          // if fullNames don't match, remember the key but continue to search for full match
          else if (!ignoreFullNameMatchKey) ignoreFullNameMatchKey = identity.key;
        }
      }
    }

    if (ignoreFullNameWhileComparing && ignoreFullNameMatchKey) {
      if (intenseDebug)
        Log.debug("isExistingIdentity: " + this.combinedName + " found, id='" + ignoreFullNameMatchKey + "' (without FullName match)");
      return ignoreFullNameMatchKey;
    }

    if (intenseDebug)
      Log.debug("isExistingIdentity: " + this.combinedName + " not found");
    return null;
  },

  // dependent on MsgComposeCommands, should/will only be called in ComposeDialog
  hasMatchingDomainIdentity: function () {
    Log.debug("hasMatchingDomainIdentity");

    var domainArray = this.email.match(/@[^@]+$/);
    if (!domainArray) {
      Log.debug("hasMatchingDomainIdentity found no domain for email " + this.email);
      return;
    }
    Log.debug("hasMatchingDomainIdentity searching for domain " + domainArray[0]);

    var accounts = getAccountsArray();
    for (let acc = 0; acc < accounts.length; acc++) {
      let account = accounts[acc];
      try {
        prefroot.getBoolPref("mail.account." + account.key + ".vIdentity");
        continue;
      } catch (e) {};
      let identities = getIdentitiesArray(account);
      for (let i = 0; i < identities.length; i++) {
        let identity = identities[i];
        var idDomainArray = identity.email.match(/@[^@]+$/);
        if (!idDomainArray) continue;
        //                 Log.debug("comp: domain.toLowerCase()='" + domainArray[0].toLowerCase() + "' idDomain.toLowerCase()='" + idDomainArray[0].toLowerCase() + "'");
        if (domainArray[0].toLowerCase() == idDomainArray[0].toLowerCase()) {
          // if domain matches, everything is perfect!
          Log.debug("hasMatchingDomainIdentity: found matching id for domain '" + domainArray[0] + "'");
          return identity.key; // return key and stop searching
        }
      }
    }
    Log.debug("hasMatchingDomainIdentity: '" + domainArray[0] + "' not found");
    return null;
  },

  equals: function (compareIdentityData) {
    if (!compareIdentityData)
      return false;
    
    var intenseDebug = false;
    if (intenseDebug) Log.debug("compareIdentityData");
    
    this.comp.compareID = compareIdentityData;

    this.comp.equals.fullName = (((this.fullName) ? this.fullName.toLowerCase() : null) == ((compareIdentityData.fullName) ? compareIdentityData.fullName.toLowerCase() : null));
    if (intenseDebug && !this.comp.equals.fullName) {
            Log.debug("fullName not equal ('" + ((this.fullName)?this.fullName.toLowerCase():null) + "' != '" + ((compareIdentityData.fullName)?compareIdentityData.fullName.toLowerCase():null) + "')");
    }
    this.comp.equals.email = (((this.email) ? this.email.toLowerCase() : null) == ((compareIdentityData.email) ? compareIdentityData.email.toLowerCase() : null));
    if (intenseDebug && !this.comp.equals.email) {
            Log.debug("email not equal ('" + ((this.email)?this.email.toLowerCase():null) + "' != '" + ((compareIdentityData.email)?compareIdentityData.email.toLowerCase():null) + "')");
    }

    this.comp.equals.id = this.id.equal(compareIdentityData.id);
    if (intenseDebug && !this.comp.equals.id) {
            Log.debug("id not equal ('" + this.id + "' != '" + compareIdentityData.id + "')");
    }

    this.comp.equals.extras = this.extras ? this.extras.equal(compareIdentityData.extras) : true;
    if (intenseDebug && !this.comp.equals.extras) {
            Log.debug("extras not equal");
    }

    return (this.comp.equals.fullName && this.comp.equals.email && this.comp.equals.id && this.comp.equals.extras);
  },

  equalsIdentity: function (compareIdentityData, getCompareMatrix) {
    var equal = this.equals(compareIdentityData);
    var compareMatrix = null;
    // generate CompareMatrix only if asked and non-equal
    if (getCompareMatrix && !equal) compareMatrix = this.getCompareMatrix();
    return {
      equal: equal,
      compareMatrix: compareMatrix
    };
  },

  getCompareMatrix: function () {
    const Items = Array("fullName", "email", "id");
    var string = "";
    var saveBaseId = vIprefs.get("storage_store_base_id");
    for (let item of Items) {
      var classEqual = (this.comp.equals[item]) ? "equal" : "unequal";
      var classIgnore = ((!saveBaseId) && (item == "id")) ? " ignoreValues" : ""
      string += "<tr>" +
        "<td class='col1 " + classEqual + "'>" + this[item + "Label"] + "</td>" +
        "<td class='col2 " + classEqual + classIgnore + "'>" + this.comp.compareID[item + "Html"] + "</td>" +
        "<td class='col3 " + classEqual + classIgnore + "'>" + this[item + "Html"] + "</td>" +
        "</tr>"
    }
    string += this.extras ? this.extras.getCompareMatrix() : "";
    return string;
  },

  getMatrix: function () {
    var string = "";
    if (this["idHtml"]) {
        string = "<tr><td class='col1'>" + this["idLabel"] + ":</td>" +
        "<td class='col2'>" + this["idHtml"] + "</td></tr>" +
        "<tr><td class='col1'>" + this["smtpLabel"] + ":</td>" +
        "<td class='col2'>" + this["smtpHtml"] + "</td></tr>";
    }
    string += this.extras ? this.extras.getMatrix() : "";
    return string;
  }
}

function identityCollection() {
  this.number = 0;
  this.identityDataCollection = {};
  this.menuItems = {};
}
identityCollection.prototype = {
  number: null,
  identityDataCollection: null,
  menuItems: null,

  mergeWithoutDuplicates: function (addIdentityCollection) {
    for (var index = 0; index < addIdentityCollection.number; index++)
      this.addWithoutDuplicates(addIdentityCollection.identityDataCollection[index])
  },

  dropIdentity: function (index) {
    Log.debug("dropping address from inputList: " + this.identityDataCollection[index].combinedName);
    while (index < (this.number - 1)) {
      this.identityDataCollection[index] = this.identityDataCollection[++index];
    };
    this.identityDataCollection[--this.number] = null;
  },

  addWithoutDuplicates: function (identityData) {
    if (!identityData) return;
    for (var index = 0; index < this.number; index++) {
      if (this.identityDataCollection[index].email == identityData.email &&
        (!this.identityDataCollection[index].id.key || !identityData.id.key ||
          this.identityDataCollection[index].id.key == identityData.id.key)) {
        // found, so check if we can use the Name of the new field
        if (this.identityDataCollection[index].fullName == "" && identityData.fullName != "") {
          this.identityDataCollection[index].fullName = identityData.fullName;
          Log.debug("added fullName '" + identityData.fullName + "' to stored email '" + this.identityDataCollection[index].email + "'")
        }
        // check if id_key or extras can be used
        // only try this once, for the first Identity where id is set)
        if (!this.identityDataCollection[index].id.key && identityData.id.key) {
          this.identityDataCollection[index].id.key = identityData.id.key;
          this.identityDataCollection[index].extras = identityData.extras;
          Log.debug("added id '" + identityData.id.value + "' (+extras) to stored email '" + this.identityDataCollection[index].email + "'")
        }
        return;
      }
    }
    Log.debug("add new address to result: " + identityData.combinedName)
    this.identityDataCollection[index] = identityData;
    this.number = index + 1;
  },

  // this is used to completely use the conten of another identityCollection, but without changing all pointers
  // see for instance vI.smartIdentity.__filterAddresses
  takeOver: function (newIdentityCollection) {
    this.number = newIdentityCollection.number
    this.identityDataCollection = newIdentityCollection.identityDataCollection
  }
};

function idObj(key) {
  this._key = key;
}
idObj.prototype = {
  _key: null,
  _value: null,
  _accountkey: null,
  _accountIncomingServerPrettyName: null,
  _accountManager: Components.classes["@mozilla.org/messenger/account-manager;1"]
    .getService(Components.interfaces.nsIMsgAccountManager),

  set key(key) {
    this._key = key;
    this._value = null;
  },
  get key() {
    if (this._value == null) var dummy = this.value;
    return this._key
  },
  get accountkey() {
    if (this._value == null) var dummy = this.value;
    return this._accountkey
  },
  
  get accountIncomingServerPrettyName() {
    if (this._value == null) var dummy = this.value;
    return this._accountIncomingServerPrettyName
  },
  
  get value() {
    if (this._value == null) {
      this._value = "";
      // if this worked we are having at least seamonkey 1.17
      let accounts = getAccountsArray();
      for (let acc = 0; acc < accounts.length; acc++) {
        let account = accounts[acc];
        let identities = getIdentitiesArray(account);
        if (identities.length == 0)
          continue;
        for (let i = 0; i < identities.length; i++) {
          let identity = identities[i];
          if (this._key == identity.key) {
            this._value = identity.identityName;
            this._accountkey = account.key;
            this._accountIncomingServerPrettyName = account.incomingServer.prettyName;
            break;
          }
        }
      }
      if (!this._value) {
        this._key = null;
        this._accountkey = null;
      }
    }
    return this._value;
  },

  get smtpServerKey() {
    if (!this.key)
      return null;

    var identity = this._accountManager.getIdentity(this.key);
    if (identity) {
      if (identity.smtpServerKey)
        return identity.smtpServerKey;
      else
        return MailServices.smtp.defaultServer.key
    }
    return null;
  },
  
  get smtpServerName() {
    if (!this.smtpServerKey)
      return null;
    var servers = MailServices.smtp.servers;

    var smtpName;
    while (servers && servers.hasMoreElements()) {
      var server = servers.getNext();
      if (server instanceof Components.interfaces.nsISmtpServer &&
        !server.redirectorType && this.smtpServerKey == server.key) {
        smtpName = server.description ? server.description : server.hostname;
        break;
      }
    }
    return smtpName;
  },
  
  equal: function (compareIdObj) {
    if (!this.key || !compareIdObj.key) return true;
    if (this.key != compareIdObj.key) {
      //       Log.debug("id not equal ('" + this.key + "' != '" + compareIdObj.key + "')");
    }
    return (this.key == compareIdObj.key);
  }
}
