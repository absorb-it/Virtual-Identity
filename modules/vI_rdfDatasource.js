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

var EXPORTED_SYMBOLS = ["rdfDatasource", "rdfDatasourceAccess", "rdfDatasourceImporter"]

Components.utils.import("resource://v_identity/vI_log.js");
let Log = setupLogging("virtualIdentity.rdfDatasource");

Components.utils.import("resource://v_identity/vI_accountUtils.js");
Components.utils.import("resource://v_identity/vI_prefs.js");
Components.utils.import("resource://v_identity/vI_identityData.js");
Components.utils.import("resource://gre/modules/Services.jsm");

ChromeUtils.import("resource:///modules/mailServices.js");

// if no 3pane-window found, return current window
function get3PaneWindow() {
  var windowMediator = Components.classes['@mozilla.org/appshell/window-mediator;1']
    .getService(Components.interfaces.nsIWindowMediator);
  var mail3paneWindow = windowMediator.getMostRecentWindow("mail:3pane");
  if (!mail3paneWindow) return windowMediator.getMostRecentWindow(null);
  return mail3paneWindow;
};

function initWithFilePath_tryDelimiters(_nsIFile, path, filename) {
  try {
//     Log.debug("Filename try linux delimiter: '" + path + "/" + filename + "'");
    _nsIFile.initWithPath(path + "/" + filename);
  } catch (NS_ERROR_FILE_UNRECOGNIZED_PATH) {
    try {
//       Log.debug("Filename try windows delimiter: '" + path + "\\" + filename + "'");
      _nsIFile.initWithPath(path + "\\" + filename);
    } catch (NS_ERROR_FILE_UNRECOGNIZED_PATH) {
      Log.debug("Filename not valid: '" + path + "[\\/]" + filename + "'");
      Log.debug("can't open rdfDatasource - storage won't work");
      var debugMsg = "Filename not valid: '" + path + "\\" + filename + "'\n" +
        "Filename not valid: '" + path + "/" + filename + "'\n" +
        "Virtual Identity Storage won't work.\n\n" +
        "Please report this issue with filename on https://www.absorb.it/virtual-id\n\n" +
        "You can just copy the lines below in your browser to create a ticket\n\n" +
        "https://www.absorb.it/virtual-id/newticket?summary=RDF Filename Error&description=Filename " + path + "[\\/]" + filename + " for rdf not valid"
      get3PaneWindow().alert(debugMsg);
      return;
    }
  }
};

function rdfDatasource(currentWindow, rdfFileName, dontRegisterObserver, dontChange = false) {
  this._currentWindow = currentWindow;
  this._rdfFileName = rdfFileName;
  this._dontRegisterObserver = dontRegisterObserver;
  if (this._rdfFileName) this.init(dontChange);
  if (!this._dontRegisterObserver) this.AccountManagerObserver.register(this);
  this._extVersion = get3PaneWindow().virtualIdentityExtension.extensionVersion;
//   Log.debug("rdfDatasource: read ext. Version '" + this._extVersion + "'");
}

rdfDatasource.prototype = {
  _currentWindow: null,
  _extVersion: null,
  _rdfVersion: "0.0.6",
  _rdfService: Components.classes["@mozilla.org/rdf/rdf-service;1"]
    .getService(Components.interfaces.nsIRDFService),
  _rdfDataSource: null,
  _rdfFileName: null,
  _rdfNS: "http://virtual-id.absorb.it/",
  _rdfNSStorage: "vIStorage",
  _rdfNSEmail: "vIStorage/email",
  _rdfNSMaillist: "vIStorage/maillist",
  _rdfNSNewsgroup: "vIStorage/newsgroup",
  _rdfNSFilter: "vIStorage/filter",
  _rdfNSAccounts: "vIAccounts",
  _rdfNSIdentities: "vIAccounts/id",
  // required for import and update of 0.10/0.0.6 rdf
  _rdfNSSMTPservers: "vIAccounts/smtp",

  _virtualIdentityID: "{dddd428e-5ac8-4a81-9f78-276c734f75b8}",

  _dontRegisterObserver: false,
  
  _emailContainer: Components.classes["@mozilla.org/rdf/container;1"]
    .createInstance(Components.interfaces.nsIRDFContainer),

  _maillistContainer: Components.classes["@mozilla.org/rdf/container;1"]
    .createInstance(Components.interfaces.nsIRDFContainer),

  _newsgroupContainer: Components.classes["@mozilla.org/rdf/container;1"]
    .createInstance(Components.interfaces.nsIRDFContainer),

  _filterContainer: Components.classes["@mozilla.org/rdf/container;1"]
    .createInstance(Components.interfaces.nsIRDFContainer),

  _identityContainer: Components.classes["@mozilla.org/rdf/container;1"]
    .createInstance(Components.interfaces.nsIRDFContainer),

  // required for import and update of 0.10/0.0.6 rdf
  _smtpContainer: Components.classes["@mozilla.org/rdf/container;1"]
    .createInstance(Components.interfaces.nsIRDFContainer),

  getContainer: function (type) {
    switch (type) {
    case "email":
      return this._emailContainer;
    case "maillist":
      return this._maillistContainer;
    case "newsgroup":
      return this._newsgroupContainer;
    case "filter":
      return this._filterContainer;
    case "identity":
      return this._identityContainer;
    // required for import and update of 0.10/0.0.6 rdf
    case "smtp":
      return this._smtpContainer;
    }
    return null;
  },

  init: function (dontChange = false) {
    //         Log.debug("init.");

    this._openRdfDataSource();
    if (!this._rdfDataSource) return;
    this._initContainers();
    if (!dontChange) {
      if (this.rdfUpgradeRequired()) this.rdfUpgrade();

      // store version everytime to recognize downgrades later
      this.storeRDFVersion();
    }

    //         this.refreshAccountInfo();
    //         Log.debug("init done.");
  },

  _openRdfDataSource: function () {
    //         if (!this._rdfFileName || this._rdfDataSource);
    var protoHandler = Components.classes["@mozilla.org/network/protocol;1?name=file"]
      .getService(Components.interfaces.nsIFileProtocolHandler)
    var newFile = Components.classes["@mozilla.org/file/local;1"]
      .createInstance(Components.interfaces.nsIFile);

    var file = Components.classes["@mozilla.org/file/directory_service;1"]
      .getService(Components.interfaces.nsIProperties)
      .get("ProfD", Components.interfaces.nsIFile);

    //         Log.debug("_openRdfDataSource");
    initWithFilePath_tryDelimiters(newFile, file.path, this._rdfFileName);

    var fileURI = protoHandler.newFileURI(newFile);

    Log.debug("init: read rdf from '" + fileURI.spec + "'");

    this._rdfDataSource =
      this._rdfService.GetDataSourceBlocking(fileURI.spec);

    //         Log.debug("read rdf from '" + fileURI.spec + "' done." + this._rdfService);
  },

  _initContainers: function () {
    try { // will possibly fail before upgrade
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
    } catch (e) {};
  },

  // ******************************************************************************************
  // **************    BEGIN RDF UPGRADE CODE    **********************************************
  rdfUpgradeRequired: function () {
    var oldRdfVersion = this.getCurrentRDFFileVersion();
    var versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
      .getService(Components.interfaces.nsIVersionComparator);
    return (!oldRdfVersion || versionChecker.compare(oldRdfVersion, this._rdfVersion) < 0)
  },
  // **************    RDF UPGRADE CODE    ****************************************************
  extUpgradeRequired: function () {
    if (!this._extVersion) return false;
    var oldExtVersion = this.getCurrentExtFileVersion()
    var versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
      .getService(Components.interfaces.nsIVersionComparator);
    return (!oldExtVersion || versionChecker.compare(oldExtVersion, this._extVersion) < 0)
  },
  // **************    RDF UPGRADE CODE    ****************************************************
  rdfUpgrade: function () {
    var currentVersion = this.getCurrentRDFFileVersion();
    Log.debug("checking for previous version of rdf, found " +
      currentVersion + " - rdf-upgrade required.")
    switch (currentVersion) {
    case null:
      this._createRDFContainers(); // no break
    default:
      this._createAccountInfoContainers();
    }
    this.storeRDFVersion();
    Log.debug("rdf-upgrade to " + this.getCurrentRDFFileVersion() + " done.");
  },
  // **************    RDF UPGRADE CODE    ****************************************************
  // only used for upgrade to 0.0.3 - loop through all ressources.
  _transferAllResources: function () {
    Log.debug("upgrade: transferAllResources");
    var enumerator = this._rdfDataSource.GetAllResources();
    while (enumerator && enumerator.hasMoreElements()) {
      var resource = enumerator.getNext();
      resource.QueryInterface(Components.interfaces.nsIRDFResource);

      var type;
      var name;
      if (resource.ValueUTF8.match(new RegExp(this._rdfNS + this._rdfNSEmail + "/", "i"))) {
        type = "email";
        name = RegExp.rightContext
      } else if (resource.ValueUTF8.match(new RegExp(this._rdfNS + this._rdfNSNewsgroup + "/", "i"))) {
        type = "newsgroup";
        name = RegExp.rightContext
      } else if (resource.ValueUTF8.match(new RegExp(this._rdfNS + this._rdfNSMaillist + "/", "i"))) {
        type = "maillist";
        name = RegExp.rightContext
      } else continue;

      var container = this.getContainer(type);
      this._setRDFValue(resource, "name", name);

      if (container.IndexOf(resource) == -1) container.AppendElement(resource);
    }
  },

  _createAccountInfoContainers: function () {
    Log.debug("upgrade: createAccountInfoContainers");
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
  _createRDFContainers: function () {
    Log.debug("upgrade: createRDFContainers");
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

  getCurrentRDFFileVersion: function () {
    return this._getRDFValue(
      this._rdfService.GetResource(this._rdfNS + "virtualIdentity"), "rdfVersion");
  },

  getCurrentExtFileVersion: function () {
    return this._getRDFValue(
      this._rdfService.GetResource(this._rdfNS + "virtualIdentity"), "version");
  },

  storeRDFVersion: function () {
    this._setRDFValue(
      this._rdfService.GetResource(this._rdfNS + "virtualIdentity"), "rdfVersion",
      this._rdfVersion);
    this._flush();
  },

  storeExtVersion: function () {
    this._setRDFValue(
      this._rdfService.GetResource(this._rdfNS + "virtualIdentity"), "version", this._extVersion)
    this._flush();
  },

  clean: function () {
    Log.debug("rdfDatasource clean");
    if (!this._dontRegisterObserver) this.AccountManagerObserver.unregister();
    this._flush();
  },

  _flush: function () {
    this._rdfDataSource.QueryInterface(Components.interfaces.nsIRDFRemoteDataSource);
    try {
      // this might fail for instance with NS_ERROR_FILE_NO_DEVICE_SPACE
      this._rdfDataSource.Flush();
    } catch (e) {}
  },

  refreshAccountInfo: function () {
    try { // will possibly fail before upgrade
      this.cleanAccountInfo();
      this.storeAccountInfo();
    } catch (e) {};
  },

  cleanAccountInfo: function () {
    Log.debug("rdfDatasource cleanAccountInfo");

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

  getRelevantIDs: function () {
    var relevantIDs = new Object();
    // search relevant Identities
    for (let treeType of Array("email", "maillist", "newsgroup", "filter")) {
      var enumerator = this.getContainer(treeType).GetElements();
      while (enumerator && enumerator.hasMoreElements()) {
        var resource = enumerator.getNext();
        resource.QueryInterface(Components.interfaces.nsIRDFResource);
        var id = this._getRDFValue(resource, "id")
        if (id) {
          if (!relevantIDs[id]) relevantIDs[id] = 1;
          else relevantIDs[id] += 1;
        }
      }
    }
    return relevantIDs;
  },

  searchIdentityMismatch: function () {
    Log.debug("rdfDatasource searchIdentityMismatch");

    var relevantIDs = this.getRelevantIDs();
    var mismatchIDs = [];

    for (var id in relevantIDs) {
//       Log.debug(" search relevant id: '" + id + "'");
      var found = false;
      var accounts = getAccountsArray();
      var identity = null;
      for (let acc = 0; acc < accounts.length; acc++) {
        let account = accounts[acc];
        let identities = getIdentitiesArray(account);
        for (let i = 0; i < identities.length; i++) {
          identity = identities[i];
//           Log.debug(" compare id: '" + id + "' with '" + identity.key + "'");
          if (id == identity.key) {
//             Log.debug(" found!");
            found = true;
            break;
          }
        }
        if (found) break;
      }
      
      var resource = this._rdfService.GetResource(this._rdfNS + this._rdfNSIdentities + "/" + id);
      var rdfIdentityName = this._getRDFValue(resource, "identityName");
      var rdfEmail = this._getRDFValue(resource, "email");
      var rdfFullName = this._getRDFValue(resource, "fullName")

      if (!found || rdfIdentityName != identity.identityName && rdfEmail != identity.email) {
//         Log.debug(" found mismatch on id: '" + id + "' label: " + rdfIdentityName);
        mismatchIDs.push({
          oldkey: id,
          label: rdfIdentityName,
          ext1: rdfEmail,
          ext2: rdfFullName,
          count: relevantIDs[id],
          key: ""
        })
      }
    }
    if (mismatchIDs.length > 0) {
      Log.debug(" found mismatches on id(s).");
      get3PaneWindow().openDialog("chrome://v_identity/content/vI_rdfAccountMismatchDialog.xul", 0,
        "chrome, dialog, modal, alwaysRaised, resizable=yes", "identity", mismatchIDs,
        /* callback chance: */
        this).focus();
      return true;
    } else {
      Log.debug(" found no mismatch");
      return false;
    }
  },

  repairMismatch: function (type, mismatchItems) {
    // type might be 'identity' or 'smtp' or 'smtpid' - dependent on trigger
    for (var i = 0; i < mismatchItems.length; i++) {
      if (mismatchItems[i].key)
        Log.debug("repairAccountMismatch change " + mismatchItems[i].oldkey + " into " + mismatchItems[i].key);
      else
        Log.debug("repairAccountMismatch remove " + mismatchItems[i].oldkey);
      // search relevant Identities
      for (let treeType of Array("email", "maillist", "newsgroup", "filter")) {
        var enumerator = this.getContainer(treeType).GetElements();
        while (enumerator && enumerator.hasMoreElements()) {
          var resource = enumerator.getNext();
          resource.QueryInterface(Components.interfaces.nsIRDFResource);
          // old smtp (stored in pre-0.10 rdf) and id have to match, set new id
          if (type == 'smtpid') {
            var smtp = mismatchItems[i].oldkey.split("-")[0];
            var id = mismatchItems[i].oldkey.split("-")[1];
            if (this._getRDFValue(resource, 'id') == id && this._getRDFValue(resource, 'smtp') == smtp) {
              if (!mismatchItems[i].key) this._unsetRDFValue(resource, 'id', id)
              else this._setRDFValue(resource, 'id', mismatchItems[i].key)
            }
          }
          // 'identity' replacement
          else if (type == 'identity') {
            if (this._getRDFValue(resource, 'id') == mismatchItems[i].oldkey) {
              if (!mismatchItems[i].key) this._unsetRDFValue(resource, 'id', mismatchItems[i].oldkey)
              else this._setRDFValue(resource, 'id', mismatchItems[i].key)
            }
          }
          // 'smtp' replacement
          else if (type == 'smtp') {
            if (this._getRDFValue(resource, 'smtp') == mismatchItems[i].oldkey) {
              if (!mismatchItems[i].key) this._unsetRDFValue(resource, 'smtp', mismatchItems[i].oldkey)
              else this._setRDFValue(resource, 'smtp', mismatchItems[i].key)
            }
          }
        }
      }
    }
  },

  getRelevantSMTPs: function () {
    var relevantSMTPs = new Object();
    // search relevant SMTPs
    for (let treeType of Array("email", "maillist", "newsgroup", "filter")) {
      var enumerator = this.getContainer(treeType).GetElements();
      while (enumerator && enumerator.hasMoreElements()) {
        var resource = enumerator.getNext();
        resource.QueryInterface(Components.interfaces.nsIRDFResource);
        var smtp = this._getRDFValue(resource, "smtp")
        if (smtp && smtp != DEFAULT_SMTP_TAG) {
          if (!relevantSMTPs[smtp]) relevantSMTPs[smtp] = 1;
          else relevantSMTPs[smtp] += 1;
        }
      }
    }
    return relevantSMTPs;
  },

  searchSmtpMismatch: function () {
    Log.debug("searchSmtpMismatch");

    var relevantSMTPs = this.getRelevantSMTPs();
    var mismatchSMTPs = [];

    for (var smtp in relevantSMTPs) {
      var servers, smtpService = Components.classes["@mozilla.org/messengercompose/smtp;1"]
        .getService(Components.interfaces.nsISmtpService);
      // check for new https://hg.mozilla.org/comm-central/rev/fab9e5145cd4 smtpService
      if (typeof (smtpService.servers) == "object") servers = smtpService.servers;
      else servers = smtpService.smtpServers;

      var found = false;
      while (servers && servers.hasMoreElements()) {
        var server = servers.getNext();
        if (server instanceof Components.interfaces.nsISmtpServer &&
          !server.redirectorType && smtp == server.key) {
          found = true;
          break;
        }
      }
      var resource = this._rdfService.GetResource(this._rdfNS + this._rdfNSSMTPservers + "/" + smtp);
      var rdfSMTPlabel = this._getRDFValue(resource, "label");
      var rdfHostname = this._getRDFValue(resource, "hostname");
      var rdfUsername = this._getRDFValue(resource, "username")
      if (!found || rdfSMTPlabel != (server.description ? server.description : server.hostname) && rdfHostname != server.hostname)
        mismatchSMTPs.push({
          oldkey: smtp,
          label: rdfSMTPlabel,
          ext1: rdfHostname,
          ext2: rdfUsername,
          count: relevantSMTPs[smtp],
          key: ""
        })
    }
    if (mismatchSMTPs.length > 0) {
      Log.debug(" found mismatches on smtp(s).");
      get3PaneWindow().openDialog("chrome://v_identity/content/vI_rdfAccountMismatchDialog.xul", 0,
        "chrome, dialog, modal, alwaysRaised, resizable=yes", "smtp", mismatchSMTPs,
        /* callback: */
        this).focus();
      return true;
    } else {
      Log.debug(" found no mismatch");
      return false;
    }
  },

  storeAccountInfo: function () {
    Log.debug("rdfDatasource storeAccountInfo");
    var accounts = getAccountsArray();
    for (let acc = 0; acc < accounts.length; acc++) {
      let account = accounts[acc];
      let identities = getIdentitiesArray(account);
      for (let i = 0; i < identities.length; i++) {
        let identity = identities[i];
        //                 Log.debug("storeAccounts identity store id " + identity.key);

        var resource = this._rdfService.GetResource(this._rdfNS + this._rdfNSIdentities + "/" + identity.key);
        this._setRDFValue(resource, "identityName", identity.identityName);
        this._setRDFValue(resource, "fullName", identity.fullName);
        this._setRDFValue(resource, "email", identity.email);
        if (identity.smtpServerKey)
          this._setRDFValue(resource, "smtp", identity.smtpServerKey);
        else
          this._setRDFValue(resource, "smtp", DEFAULT_SMTP_TAG);
        
//         Log.debug("id:'" + identity.key +"', identityName='" + identity.identityName + "',
//              fullName='" + identity.fullName + "', email='" + identity.email);

        var position = this._identityContainer.IndexOf(resource); // check for index in new recType
        if (position != -1) this._identityContainer.InsertElementAt(resource, position, false);
        else this._identityContainer.AppendElement(resource);
      }
    }

    function storeSmtp(server, parent) {
      //             Log.debug("storeAccounts smtp store id " + server.key);
      var resource = parent._rdfService.GetResource(parent._rdfNS + parent._rdfNSSMTPservers + "/" + server.key);
      parent._setRDFValue(resource, "label", (server.description ? server.description : server.hostname));
      parent._setRDFValue(resource, "hostname", server.hostname);
      parent._setRDFValue(resource, "username", server.username);
      var position = parent._smtpContainer.IndexOf(resource); // check for index in new recType
      if (position != -1) parent._smtpContainer.InsertElementAt(resource, position, false);
      else parent._smtpContainer.AppendElement(resource);
    }

    var servers, smtpService = Components.classes["@mozilla.org/messengercompose/smtp;1"]
      .getService(Components.interfaces.nsISmtpService);
    // check for new https://hg.mozilla.org/comm-central/rev/fab9e5145cd4 smtpService
    if (typeof (smtpService.servers) == "object") servers = smtpService.servers;
    else servers = smtpService.smtpServers;

    while (servers && servers.hasMoreElements()) {
      var server = servers.getNext();
      if (server instanceof Components.interfaces.nsISmtpServer && !server.redirectorType) storeSmtp(server, this);
    }

    //         Log.debug("storeAccounts done");
  },

  export: function (rdfFileName) {
    Log.debug("vI_rdfDatasource export: " + rdfFileName + "\n");
    var filePicker = Components.classes["@mozilla.org/filepicker;1"]
      .createInstance(Components.interfaces.nsIFilePicker);
    filePicker.init(get3PaneWindow(), "", Components.interfaces.nsIFilePicker.modeSave);
    filePicker.appendFilters(Components.interfaces.nsIFilePicker.filterAll | Components.interfaces.nsIFilePicker.filterText);
    filePicker.appendFilter("RDF Files", "*.rdf");

    if (this._pickerShow(filePicker) != Components.interfaces.nsIFilePicker.returnCancel) {
      var rdfDataFile = Components.classes["@mozilla.org/file/local;1"]
        .createInstance(Components.interfaces.nsIFile);
      var file = Components.classes["@mozilla.org/file/directory_service;1"]
        .getService(Components.interfaces.nsIProperties).get("ProfD", Components.interfaces.nsIFile);

      initWithFilePath_tryDelimiters(rdfDataFile, file.path, rdfFileName);
      rdfDataFile.copyTo(filePicker.file.parent, filePicker.file.leafName);
    }
  },

  _pickerShow: function (fp) {
    let done = false;
    let rv, result;
    fp.open(result => {
      rv = result;
      done = true;
    });
    let thread = Components.classes["@mozilla.org/thread-manager;1"]
                          .getService().currentThread;
    while (!done) {
      thread.processNextEvent(true);
    }
    return rv;
  },
  
  _getRDFResourceForVIdentity: function (recDescription, recType) {
    if (!this._rdfDataSource) return null;
    if (!recDescription) {
      Log.debug("_getRDFResourceForVIdentity: no Recipient given.");
      return null;
    }
    var _rdfNSRecType = null
    switch (recType) {
    case "email":
      _rdfNSRecType = this._rdfNSEmail;
      break;
    case "newsgroup":
      _rdfNSRecType = this._rdfNSNewsgroup;
      break;
    case "maillist":
      _rdfNSRecType = this._rdfNSMaillist;
      break;
    case "filter":
      _rdfNSRecType = this._rdfNSFilter;
      break;
    }
    return this._rdfService.GetResource(this._rdfNS + _rdfNSRecType + "/" + recDescription);


  },

  removeVIdentityFromRDF: function (resource, recType) {
    // 		Log.debug("removeVIdentityFromRDF " + resource.ValueUTF8);
    this._unsetRDFValue(resource, "email", this._getRDFValue(resource, "email"))
    this._unsetRDFValue(resource, "fullName", this._getRDFValue(resource, "fullName"))
    this._unsetRDFValue(resource, "id", this._getRDFValue(resource, "id"))
    this._unsetRDFValue(resource, "name", this._getRDFValue(resource, "name"))

    let self = this;
    var extras = new identityDataExtras(this._currentWindow, self, resource)
    extras.loopThroughExtras(
      function (extra) {
        extra.value = self._unsetRDFValue(resource, extra.field, extra.value)
      });

    this.getContainer(recType).RemoveElement(resource, true);
  },

  _unsetRDFValue: function (resource, field, value) {
    // 		Log.debug("_unsetRDFValue " + this._rdfService  + " " + this._rdfDataSource);
    var predicate = this._rdfService.GetResource(this._rdfNS + "rdf#" + field);
    var name = this._rdfService.GetLiteral(value ? value : "");
    var target = this._rdfDataSource.GetTarget(resource, predicate, true);
    if (target instanceof Components.interfaces.nsIRDFLiteral) {
      this._rdfDataSource.Unassert(resource, predicate, name, true);
      return null;
    } else return value;
  },

  // this will be used from rdfDataTree to get all RDF values, callFunction is vI.rdfDataTreeCollection.__addNewDatum
  readAllEntriesFromRDF: function (addNewDatum, treeType, idData) {
    // 		Log.debug("readAllEntriesFromRDF " + this._rdfService  + " " + this._rdfDataSource + " " + this);
    var enumerator = this.getContainer(treeType).GetElements();
    while (enumerator && enumerator.hasMoreElements()) {
      var resource = enumerator.getNext();
      resource.QueryInterface(Components.interfaces.nsIRDFResource);
      var name = this._getRDFValue(resource, "name")
      var email = this._getRDFValue(resource, "email")
      var fullName = this._getRDFValue(resource, "fullName")
      var id = this._getRDFValue(resource, "id")
      var used = this._getRDFValue(resource, "timeUsed")
      var changed = this._getRDFValue(resource, "timeChanged")
      let self = this;
      var localIdentityData = new identityData(this._currentWindow, email, fullName, id,
        new identityDataExtras(this._currentWindow, self, resource))
      addNewDatum(resource, name, localIdentityData, idData, used, changed)
    }
  },

  __getDescriptionAndType: function (recipient, recipientType) {
    if (recipientType == "addr_newsgroups") {
      return {
        recDesc: recipient,
        recType: "newsgroup"
      }
    } else if (this.__isMailingList(recipient)) {
      Log.debug("__getDescriptionAndType: '" + recipient + "' is MailList");
      return {
        recDesc: this.__getMailListName(recipient),
        recType: "maillist"
      }
    } else {
      Log.debug("__getDescriptionAndType: '" + recipient + "' is no MailList");
      var localIdentityData = new identityData(this._currentWindow, recipient, null, null, null, null, null);
      return {
        recDesc: localIdentityData.combinedName,
        recType: "email"
      }
    }
  },

  // --------------------------------------------------------------------
  // check if recipient is a mailing list.
  // Similiar to Thunderbird, if there are muliple cards with the same displayName the mailinglist is preferred
  // see also https://bugzilla.mozilla.org/show_bug.cgi?id=408575
  __isMailingList: function (recipient) {
    let abManager = Components.classes["@mozilla.org/abmanager;1"]
      .getService(Components.interfaces.nsIAbManager);
    let allAddressBooks = abManager.directories;
    while (allAddressBooks.hasMoreElements()) {
      let ab = allAddressBooks.getNext();
      if (ab instanceof Components.interfaces.nsIAbDirectory && !ab.isRemote) {
        let abdirectory = abManager.getDirectory(ab.URI +
          "?(and(DisplayName,=," + encodeURIComponent(this.__getMailListName(recipient)) + ")(IsMailList,=,TRUE))");
        if (abdirectory) {
          try { // just try, sometimes there are no childCards at all...
            let cards = abdirectory.childCards;
            if (cards.hasMoreElements()) return true; // only interested if there is at least one element...
          } catch (e) {}
        }
      }
    }
    return false;
  },

  // --------------------------------------------------------------------

  __getMailListName: function (recipient) {
    if (recipient.match(/<[^>]*>/) || recipient.match(/$/)) {
      var mailListName = RegExp.leftContext + RegExp.rightContext
      mailListName = mailListName.replace(/^\s+|\s+$/g, "")
    }
    return mailListName;
  },

  findMatchingFilter: function (recipient, recipientType) {
    var recDescription = this.__getDescriptionAndType(recipient, recipientType).recDesc;
    Log.debug("findMatchingFilter for " + recDescription);
    var enumerator = this._filterContainer.GetElements();
    while (enumerator && enumerator.hasMoreElements()) {
      var resource = enumerator.getNext();
      resource.QueryInterface(Components.interfaces.nsIRDFResource);
      var filter = this._getRDFValue(resource, "name");

      const filterType = {
        None: 0,
        RegExp: 1,
        StrCmp: 2
      }
      var recentfilterType;

      if (filter == "") continue;
      if (/^\/(.*)\/$/.exec(filter)) {
        Log.debug("findMatchingFilter with RegExp '" + filter.replace(/\\/g, "\\\\") + "'");
        recentfilterType = filterType.RegExp;
      } else {
        Log.debug("findMatchingFilter, compare with '" + filter + "'");
        recentfilterType = filterType.StrCmp;
      }

      switch (recentfilterType) {
      case filterType.RegExp:
        try {
          /^\/(.*)\/$/.exec(filter);
          if (recDescription.match(new RegExp(RegExp.$1, "i"))) {
            Log.debug("findMatchingFilter found stored data.");
            return this._readVIdentityFromRDF(resource);
          }
        } catch (vErr) {};
        break;
      case filterType.StrCmp:
        if (recDescription.toLowerCase().indexOf(filter.toLowerCase()) != -1) {
          Log.debug("findMatchingFilter found stored data.");
          return this._readVIdentityFromRDF(resource);
        }
        break;
      }
    }
    Log.debug("findMatchingFilter no match found.");
    return null;
  },

  readVIdentityFromRDF: function (recipient, recipientType) {
    var storedRecipient = this.__getDescriptionAndType(recipient, recipientType);
    var email = this._rdfService.GetResource(this._rdfNS + "rdf#email");
    var resource = this._getRDFResourceForVIdentity(storedRecipient.recDesc, storedRecipient.recType);
    if (!resource) return null;
    if (!this._rdfDataSource.hasArcOut(resource, email)) {
      // no data available --> give up.
      Log.debug("readVIdentityFromRDF no data found.");
      return null;
    }
    Log.debug("readVIdentityFromRDF found stored data.");

    return this._readVIdentityFromRDF(resource);
  },

  _readVIdentityFromRDF: function (resource) {
    var email = this._getRDFValue(resource, "email")
    var fullName = this._getRDFValue(resource, "fullName")
    var id = this._getRDFValue(resource, "id")

    let _date = new Date();
    this._setRDFValue(resource, "timeUsed", _date.getTime());

    Log.debug("email='" + email +
      "' fullName='" + fullName + "' id='" + id + "'");

    let self = this;
    var localIdentityData = new identityData(this._currentWindow, email, fullName, id,
      new identityDataExtras(this._currentWindow, self, resource))
    return localIdentityData;
  },

  _getRDFValue: function (resource, field) {
    //         Log.debug("_getRDFValue " + this._rdfService  + " " + this._rdfDataSource + " " + this);
    var predicate = this._rdfService.GetResource(this._rdfNS + "rdf#" + field);
    var target = this._rdfDataSource.GetTarget(resource, predicate, true);
    if (target instanceof Components.interfaces.nsIRDFLiteral) return target.Value
    else return null;
  },

  updateRDFFromVIdentity: function (identityData, recipientName, recipientType) {
    var recipient = this.__getDescriptionAndType(recipientName, recipientType)
    this.updateRDF(recipient.recDesc, recipient.recType, identityData,
      vIprefs.get("storage_store_base_id"),
      null, null, false);
  },

  removeRDF: function (recDescription, recType) {
    var resource = this._getRDFResourceForVIdentity(recDescription, recType);
    if (!resource) return null;
    this.removeVIdentityFromRDF(resource, recType);
    return resource;
  },

  updateRDF: function (recDescription, recType, localIdentityData, storeBaseID, prevRecDescription, prevRecType, updateAllExtras) {
    //         Log.debug("(" + this._rdfNS + "): updateRDF recDescription=" + recDescription + " localIdentityData.email=" + localIdentityData.email);

    // 		if (!localIdentityData.email) {
    // 			Log.debug("updateRDF: no Sender-email for Recipient, aborting.");
    // 			return;
    // 		}
    if (!recDescription || recDescription.length == 0) return;

    if (!prevRecDescription) prevRecDescription = recDescription;
    if (!prevRecType) prevRecType = recType;

    var resource = this._getRDFResourceForVIdentity(prevRecDescription, prevRecType);
    if (!resource) return;
    // 		Log.debug("updateRDF " + resource.ValueUTF8);

    var position = this.getContainer(recType).IndexOf(resource); // check for index in new recType
    this.removeVIdentityFromRDF(resource, prevRecType);

    resource = this._getRDFResourceForVIdentity(recDescription, recType);

    this._setRDFValue(resource, "email", localIdentityData.email);
    this._setRDFValue(resource, "fullName", localIdentityData.fullName);
    if (storeBaseID)
      this._setRDFValue(resource, "id", localIdentityData.id.key);
    else this._unsetRDFValue(resource, "id", this._getRDFValue(resource, "id"))
    this._setRDFValue(resource, "name", recDescription);

    if (localIdentityData.extras) {
      let self = this;
      localIdentityData.extras.loopThroughExtras(
        function (extra) {
          if (updateAllExtras || extra.active)
            extra.value = self._setRDFValue(resource, extra.field, extra.value)
        });
      //           Log.debug("extras: " + localIdentityData.extras.status());
    }

    let _date = new Date();
    this._setRDFValue(resource, "timeChanged", _date.getTime());

    // 		Log.debug("updateRDF add " + resource.ValueUTF8 + " at position " + position);
    if (position != -1) this.getContainer(recType).InsertElementAt(resource, position, true);
    else this.getContainer(recType).AppendElement(resource);
  },

  _setRDFValue: function (resource, field, value) {
    // 		Log.debug("_setRDFValue " + resource.ValueUTF8 + " " + field + " " + value);
    if (!value) return value; // return if some value was not set.
    // 		Log.debug("_setRDFValue " + this._rdfService + " " + this._rdfDataSource);
    var predicate = this._rdfService.GetResource(this._rdfNS + "rdf#" + field);
    var name = this._rdfService.GetLiteral(value);
    var target = this._rdfDataSource.GetTarget(resource, predicate, true);

    if (target instanceof Components.interfaces.nsIRDFLiteral)
      this._rdfDataSource.Change(resource, predicate, target, name);
    else this._rdfDataSource.Assert(resource, predicate, name, true);
    return value;
  },

  //  code adapted from http://xulsolutions.blogspot.com/2006/07/creating-uninstall-script-for.html
  AccountManagerObserver: {
    self: null,
    _uninstall: false,
    observe: function (subject, topic, data) {
      if (topic == "am-smtpChanges" || topic == "am-acceptChanges") {
        Log.debug("account/smtp changes observed");
        this.self.searchIdentityMismatch();
        this.self.refreshAccountInfo();
      }
    },
    register: function (self) {
      this.self = self;
      Log.debug("register AccountManagerObserver");
      var obsService = Components.classes["@mozilla.org/observer-service;1"].
      getService(Components.interfaces.nsIObserverService)
      obsService.addObserver(this, "am-smtpChanges", false);
      obsService.addObserver(this, "am-acceptChanges", false);
    },
    unregister: function () {
      Log.debug("unregister AccountManagerObserver");
      var obsService = Components.classes["@mozilla.org/observer-service;1"].
      getService(Components.interfaces.nsIObserverService)
      try {
        obsService.removeObserver(this, "am-smtpChanges");
        obsService.removeObserver(this, "am-acceptChanges");
      } catch (e) {};
    }
  }
}


function rdfDatasourceAccess(currentWindow) {
  this._currentWindow = currentWindow;
  this._rdfDataSource = new rdfDatasource(this._currentWindow, "virtualIdentity_0.10.rdf", true);
  this.stringBundle = Services.strings.createBundle("chrome://v_identity/locale/v_identity.properties");
}

rdfDatasourceAccess.prototype = {
  _currentWindow: null,
  _rdfDataSource: null,
  stringBundle: null,

  clean: function () {
    this._rdfDataSource.clean();
  },

  updateVIdentityFromStorage: function (recipientName, recipientType, currentIdentity, currentIdentityIsVid, isNotFirstInputElement) {
    var localIdentities = new identityCollection();
    localIdentities.addWithoutDuplicates(this._rdfDataSource.readVIdentityFromRDF(recipientName, recipientType));
    if (localIdentities.number == 1) Log.debug("using data from direct match");
    localIdentities.addWithoutDuplicates(this._rdfDataSource.findMatchingFilter(recipientName, recipientType));

    var returnValue = {};
    returnValue.identityCollection = localIdentities;
    returnValue.result = "drop";
    if (localIdentities.number == 0) {
      Log.debug("updateVIdentityFromStorage no usable Storage-Data found.");
    } else {
      Log.debug("compare with current Identity");
      if (vIprefs.get("storage_getOneOnly") && // if requested to retrieve only storageID for first recipient entered
        isNotFirstInputElement && // and it is now not the first recipient entered
        !localIdentities.identityDataCollection[0].equalsIdentity(currentIdentity, false).equal) { // and this id is different than the current used one
        StorageNotification.info(this.stringBundle.GetStringFromName("vident.smartIdentity.vIStorageCollidingIdentity"));
        // 					returnValue.result = "drop";    // this is the default value
      }
      // only update fields if new Identity is different than old one.
      else {
        Log.debug("updateVIdentityFromStorage check if storage-data matches current Identity.");
        var compResult = localIdentities.identityDataCollection[0].equalsIdentity(currentIdentity, true);
        if (!compResult.equal) {
          var warning = this.__getWarning("replaceVIdentity", recipientName, compResult.compareMatrix);
          if (!currentIdentityIsVid ||
            !vIprefs.get("storage_warn_vI_replace") ||
            (this.__askWarning(warning) == "accept")) {
            returnValue.result = "accept";
          }
        } else {
          returnValue.result = "equal";
        }
      }
    }
    return returnValue;
  },

  storeVIdentityToAllRecipients: function (identityData, recipients) {
    var multipleRecipients = (recipients.length > 1);
    var dontUpdateMultipleNoEqual = (vIprefs.get("storage_dont_update_multiple") && multipleRecipients)
    Log.debug("storeVIdentityToAllRecipients dontUpdateMultipleNoEqual='" + dontUpdateMultipleNoEqual + "'")

    let returnValue = {
      update: "cancel"
    };
    for (var j = 0; j < recipients.length; j++) {
      returnValue = this.__updateStorageFromVIdentity(identityData, recipients[j].recipient, recipients[j].recipientType, dontUpdateMultipleNoEqual);
      if (returnValue.update != "accept") break;
    }
    return returnValue;
  },

  getVIdentityFromAllRecipients: function (allIdentities, recipients) {
    if (!vIprefs.get("storage")) {
      Log.debug("Storage deactivated");
      return;
    }
    var initnumber = allIdentities.number;
    for (var j = 0; j < recipients.length; j++) {
      allIdentities.addWithoutDuplicates(this._rdfDataSource.readVIdentityFromRDF(recipients[j].recipient, recipients[j].recipientType));
      allIdentities.addWithoutDuplicates(this._rdfDataSource.findMatchingFilter(recipients[j].recipient, recipients[j].recipientType));
    }
    Log.debug("found " + (allIdentities.number - initnumber) + " address(es)")
  },

  __updateStorageFromVIdentity: function (identityData, recipient, recipientType, dontUpdateMultipleNoEqual) {
    Log.debug("__updateStorageFromVIdentity.")
    var storageDataByType = this._rdfDataSource.readVIdentityFromRDF(recipient, recipientType);
    var storageDataByFilter = this._rdfDataSource.findMatchingFilter(recipient, recipientType);

    // update (storing) of data by type is required if there is
    // no data stored by type (or different data stored) and no equal filter found
    var storageDataByTypeCompResult = storageDataByType ? storageDataByType.equalsIdentity(identityData, true) : null;
    var storageDataByTypeEqual = (storageDataByType && storageDataByTypeCompResult.equal);
    var storageDataByFilterEqual = (storageDataByFilter && storageDataByFilter.equalsIdentity(identityData, false).equal);

    var doUpdate = "accept";
    if ((!storageDataByType && !storageDataByFilterEqual) ||
      (!storageDataByTypeEqual && !storageDataByFilterEqual && !dontUpdateMultipleNoEqual)) {
      Log.debug("__updateStorageFromVIdentity updating")
      if (storageDataByType && !storageDataByTypeEqual && vIprefs.get("storage_warn_update")) {
        Log.debug("__updateStorageFromVIdentity overwrite warning");
        doUpdate = this.__askWarning(this.__getWarning("updateStorage", recipient, storageDataByTypeCompResult.compareMatrix));
      }
    }
    if (doUpdate == "accept") this._rdfDataSource.updateRDFFromVIdentity(identityData, recipient, recipientType);
    return {
      update: doUpdate,
      storedIdentity: storageDataByType
    };
  },

  __getWarning: function (warningCase, recipient, compareMatrix) {
    var warning = {
      title: null,
      recLabel: null,
      recipient: null,
      warning: null,
      css: null,
      query: null,
      class: null
    };
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

  __askWarning: function (warning) {
    var retVar = {
      returnValue: null
    };
    var answer = this._currentWindow.openDialog("chrome://v_identity/content/vI_Dialog.xul", "",
      "chrome, dialog, modal, alwaysRaised, resizable=yes",
      warning, retVar)
    Log.debug("retVar.returnValue=" + retVar.returnValue)
    return retVar.returnValue;
  },
}


// create with name of the file to import into
function rdfDatasourceImporter(currentWindow, rdfFileName, importNow = true) {
  this._currentWindow = currentWindow;
  this._rdfFileName = rdfFileName;
  if (importNow && this._rdfFileName) this.import();
}

rdfDatasourceImporter.prototype = {
  _currentWindow: null,
  _rdfService: Components.classes["@mozilla.org/rdf/rdf-service;1"]
    .getService(Components.interfaces.nsIRDFService),
  _rdfDataSource: null,
  _rdfFileName: null,
  _rdfImportDataSource: null,

  _getMatchingIdentity: function (name, email, fullName) {
    var accounts = getAccountsArray();
    for (let acc = 0; acc < accounts.length; acc++) {
      let account = accounts[acc];
      let identities = getIdentitiesArray(account);
      for (let i = 0; i < identities.length; i++) {
        let identity = identities[i];
        if (name == identity.identityName || (fullName == identity.fullName && email == identity.email)) return identity.key;
      }
    }
    return null;
  },

  _getMatchingSMTP: function (label, hostname, username) {
    var servers, smtpService = Components.classes["@mozilla.org/messengercompose/smtp;1"]
      .getService(Components.interfaces.nsISmtpService);
    // check for new https://hg.mozilla.org/comm-central/rev/fab9e5145cd4 smtpService
    if (typeof (smtpService.servers) == "object") servers = smtpService.servers;
    else servers = smtpService.smtpServers;

//     Log.debug("searching for label='" + label + "' hostname='" + hostname + "' username='" + username + "'");
    while (servers && servers.hasMoreElements()) {
      var server = servers.getNext();
      if (server instanceof Components.interfaces.nsISmtpServer && !server.redirectorType) {
//         Log.debug("comparing with for description='" + server.description + "' hostname='" +
//               server.hostname + "' username='" + server.username + "'");
        if (label == (server.description ? server.description : server.hostname) && (hostname == server.hostname && username == server.username))
          return server.key;
      }
    }
    return null;
  },

  _translateRelevantIDs: function () {
    var relevantIDs = this._rdfImportDataSource.getRelevantIDs();
    for (var id in relevantIDs) {
      var resource = this._rdfService.GetResource(this._rdfImportDataSource._rdfNS + this._rdfImportDataSource._rdfNSIdentities + "/" + id);
      var values = {
        id: null,
        identityName: null,
        email: null,
        fullName: null
      }
      values.identityName = this._rdfImportDataSource._getRDFValue(resource, "identityName");
      values.email = this._rdfImportDataSource._getRDFValue(resource, "email");
      values.fullName = this._rdfImportDataSource._getRDFValue(resource, "fullName");
      values.id = this._getMatchingIdentity(values.identityName, values.email, values.fullName);
      values.id = values.id ? values.id : "import_" + id
      relevantIDs[id] = values;
      Log.debug("import: translate relevant ID from previous '" + id + "' to current '" + relevantIDs[id].id + "'");
    }
    return relevantIDs;
  },

  _storeMappedIDs: function (relevantIDs) {
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

  //--------------------------------------------------------------------------------------------------------
  //only required for update from pre 0.10 versions

  _translateRelevantSMTPs: function () {
    var relevantSMTPs = this._rdfImportDataSource.getRelevantSMTPs();
    for (var smtp in relevantSMTPs) {
      var resource = this._rdfService.GetResource(this._rdfImportDataSource._rdfNS + this._rdfImportDataSource._rdfNSSMTPservers + "/" + smtp);
      var values = {
        smtp: null,
        label: null,
        hostname: null,
        username: null
      }
      values.label = this._rdfImportDataSource._getRDFValue(resource, "label");
      values.hostname = this._rdfImportDataSource._getRDFValue(resource, "hostname");
      values.username = this._rdfImportDataSource._getRDFValue(resource, "username");
      values.smtp = this._getMatchingSMTP(values.label, values.hostname, values.username);
      values.smtp = values.smtp ? values.smtp : "import_" + smtp;
      relevantSMTPs[smtp] = values;
      Log.debug("import: translate relevant SMTP from previous '" + smtp + "' to current '" + relevantSMTPs[smtp].smtp + "'");
    }
    return relevantSMTPs;
  },

  _storeMappedSMTPs: function (relevantSMTPs) {
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

  _rdfNSSMTPservers: "vIAccounts/smtp",

  _getSMTPIDCombinations: function () {
    var SMTPIDCombinations = new Object();
    var AccountManager = Components.classes["@mozilla.org/messenger/account-manager;1"]
              .getService(Components.interfaces.nsIMsgAccountManager);
    // search relevant SMTPs
    for (let treeType of Array("email", "maillist", "newsgroup", "filter")) {
      var enumerator = this._rdfDataSource.getContainer(treeType).GetElements();
      while (enumerator && enumerator.hasMoreElements()) {
        var resource = enumerator.getNext();
        resource.QueryInterface(Components.interfaces.nsIRDFResource);
        var smtp = this._rdfDataSource._getRDFValue(resource, "smtp")
        if (smtp) {
          var id = this._rdfDataSource._getRDFValue(resource, "id")
          if (id) {
            if (!SMTPIDCombinations[smtp + "-" + id]) SMTPIDCombinations[smtp + "-" + id] = 1;
            else SMTPIDCombinations[smtp + "-" + id] += 1;
          }
        }
      }
    }
    return SMTPIDCombinations;
  },

  _searchSmtpIdMismatch: function () {
    Log.debug("searchSmtpIdMismatch (only relevant for pre-0.10 rdf files)");
    var AccountManager = Components.classes["@mozilla.org/messenger/account-manager;1"]
              .getService(Components.interfaces.nsIMsgAccountManager);

    var relevantSMTPs = this._getSMTPIDCombinations();
    var SMTPIDCombinations = [];

    for (var smtpid in relevantSMTPs) {
      var smtp = smtpid.split("-")[0];
      var id = smtpid.split("-")[1];

      Log.debug("search combination smtp=" + smtp + " id=" + id + " smtp(id)=" + AccountManager.getIdentity(id).smtpServerKey);
      
      var id_smtp = AccountManager.getIdentity(id).smtpServerKey;
      if (!id_smtp)
        id_smtp = DEFAULT_SMTP_TAG;
      
      if (smtp == id_smtp)
          break;

      var resource = this._rdfDataSource._rdfService.GetResource(this._rdfDataSource._rdfNS + this._rdfNSSMTPservers + "/" + smtp);
      var rdfSMTPlabel = this._rdfDataSource._getRDFValue(resource, "label");

      var servers = MailServices.smtp.servers;

      var smtpName;
      while (servers && servers.hasMoreElements()) {
        var server = servers.getNext();
        if (server instanceof Components.interfaces.nsISmtpServer &&
          !server.redirectorType && id_smtp == server.key) {
          smtpName = server.description ? server.description : server.hostname;
          break;
        }
      }

      SMTPIDCombinations.push({
        oldkey: smtpid,
        label: rdfSMTPlabel,
        ext1: AccountManager.getIdentity(id).identityName,
        ext2: smtpName,
        count: relevantSMTPs[smtpid],
        key: ""
      })
    }
    if (SMTPIDCombinations.length > 0) {
      Log.debug(" found mismatches on smtpid(s).");
      get3PaneWindow().openDialog("chrome://v_identity/content/vI_rdfAccountMismatchDialog.xul", 0,
        "chrome, dialog, modal, alwaysRaised, resizable=yes", "smtpid", SMTPIDCombinations,
        /* callback: */
        this._rdfDataSource).focus();
      return true;
    } else {
      Log.debug(" found no mismatch");
      return false;
    }
  },

  _removeSMTPEntries: function () {
    // search and remove all smtp-entries
    for (let treeType of Array("email", "maillist", "newsgroup", "filter")) {
      var enumerator = this._rdfDataSource.getContainer(treeType).GetElements();
      while (enumerator && enumerator.hasMoreElements()) {
        var resource = enumerator.getNext();
        this._rdfDataSource._unsetRDFValue(resource, 'smtp', this._rdfDataSource._getRDFValue(resource, 'smtp'))
      }
    }
  },
  //--------------------------------------------------------------------------------------------------------
  
  import: function () {
    var filePicker = Components.classes["@mozilla.org/filepicker;1"]
      .createInstance(Components.interfaces.nsIFilePicker);

    filePicker.init(get3PaneWindow(), "", Components.interfaces.nsIFilePicker.modeOpen);
    filePicker.appendFilter("RDF Files", "*.rdf");
    filePicker.appendFilters(Components.interfaces.nsIFilePicker.filterText | Components.interfaces.nsIFilePicker.filterAll);

    if (this._pickerShow(filePicker) == Components.interfaces.nsIFilePicker.returnOK)
      this._importFile(filePicker.file);
  },

  importFileByName: function (fileName) {
    var newFile = Components.classes["@mozilla.org/file/local;1"]
      .createInstance(Components.interfaces.nsIFile);

    var file = Components.classes["@mozilla.org/file/directory_service;1"]
      .getService(Components.interfaces.nsIProperties)
      .get("ProfD", Components.interfaces.nsIFile);

    initWithFilePath_tryDelimiters(newFile, file.path, fileName);

    this._importFile(newFile);
  },

  _importFile: function (file) {
    if (!file.exists() || !file.isFile() || !file.isReadable()) {
      Log.debug("rdfDatasourceImporter _importFile: " + file.path + " not found / not readable");
      return;
    }

    Log.debug("import: preparation:");
    var importRdfDataFile = Components.classes["@mozilla.org/file/local;1"]
      .createInstance(Components.interfaces.nsIFile);
    var tmpfile = Components.classes["@mozilla.org/file/directory_service;1"]
      .getService(Components.interfaces.nsIProperties).get("ProfD", Components.interfaces.nsIFile);

    initWithFilePath_tryDelimiters(importRdfDataFile, tmpfile.path, this._rdfFileName + "_import");
    file.copyTo(importRdfDataFile.parent, importRdfDataFile.leafName);

    Log.debug("import: copied file from " + file.path + " to " + importRdfDataFile.path + "'");

    // init Datasources
    this._rdfImportDataSource = new rdfDatasource(this._currentWindow, importRdfDataFile.leafName, true, true);

    // search matching IDs for anyones used in import-file
    var relevantIDs = this._translateRelevantIDs();
    var relevantSMTPs = this._translateRelevantSMTPs();

    Log.debug("import: preparation done.");

    for (let treeType of Array("email", "maillist", "newsgroup", "filter")) {
      // re-initialize importDataSource to point rdfService to the right Resources
      this._rdfImportDataSource = new rdfDatasource(this._currentWindow, importRdfDataFile.leafName, true, true);
      var container = this._rdfImportDataSource.getContainer(treeType)
      if (container.GetCount() == 0) continue;
      Log.debug("importing " + treeType + ": " + container.GetCount() + " datasets from " + this._rdfImportDataSource._rdfDataSource.URI);
      var enumerator = container.GetElements();
      // re-initialize dataSource to point rdfService to the right Resources
      this._rdfDataSource = new rdfDatasource(this._currentWindow, this._rdfFileName, true);
      var count = 0;
      while (enumerator.hasMoreElements()) {
        var resource = enumerator.getNext();
        count += 1;
        resource.QueryInterface(Components.interfaces.nsIRDFResource);
        //                     Log.debug(" " + count + " ");
        var name = this._rdfImportDataSource._getRDFValue(resource, "name")
        var email = this._rdfImportDataSource._getRDFValue(resource, "email")
        var fullName = this._rdfImportDataSource._getRDFValue(resource, "fullName")
        var id = this._rdfImportDataSource._getRDFValue(resource, "id")
        
        id = id ? relevantIDs[id].id : null
	var smtp = this._rdfImportDataSource._getRDFValue(resource, "smtp")
        smtp = (smtp && smtp != DEFAULT_SMTP_TAG) ? relevantSMTPs[smtp].smtp : smtp
          
        var localIdentityData = new identityData(this._currentWindow, email, fullName, id,
          new identityDataExtras(this._currentWindow, this._rdfImportDataSource, resource))

        this._rdfDataSource.updateRDF(name, treeType, localIdentityData, false, null, null, true)
        var resource = this._rdfDataSource._getRDFResourceForVIdentity(name, treeType);
        if (id) this._rdfDataSource._setRDFValue(resource, "id", id); // localIdentityData can only store valid id's, this one might be a temporary invalid id
        if (smtp) this._rdfDataSource._setRDFValue(resource, "smtp", smtp); // localIdentityData can only store valid smtp's, this one might be a temporary invalid smtp
      }
    }

    Log.debug("import: removing temporary file " + importRdfDataFile.path);
    this._rdfImportDataSource = null;
    importRdfDataFile.remove(false);
    Log.debug("import: import done.");

    Log.debug("import: cleaning ID storages:");
    
    this._storeMappedIDs(relevantIDs);
    this._rdfDataSource.searchIdentityMismatch();
    this._storeMappedSMTPs(relevantSMTPs);
    this._rdfDataSource.searchSmtpMismatch();

    // extension from version 0.10 on does not use any extra SMTP information anymore
    // and uses the SMTP-server from base identity instead.
    // check if any collisions between previously stored SMTP and base identity exists and solve this.
    Log.debug("import: search SMTP-ID mismatches");
    this._searchSmtpIdMismatch();
    
    this._removeSMTPEntries();

    this._rdfDataSource.refreshAccountInfo();
    this._rdfDataSource.clean();
    this._rdfDataSource = null;
    Log.debug("import: cleaning ID storages done.");
    Log.debug("IMPORT DONE.");
  },
  
  _pickerShow: function (fp) {
    let done = false;
    let rv, result;
    fp.open(result => {
      rv = result;
      done = true;
    });
    let thread = Components.classes["@mozilla.org/thread-manager;1"]
                          .getService().currentThread;
    while (!done) {
      thread.processNextEvent(true);
    }
    return rv;
  }
}
