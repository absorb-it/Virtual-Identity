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

    Contributor(s): Jonathan Protzenko <jonathan.protzenko@gmail.com>
 * ***** END LICENSE BLOCK ***** */

var EXPORTED_SYMBOLS = ["setupLogging", "dumpCallStack", "MyLog", "Colors",
  "clearDebugOutput", "notificationOverflow",
  "SmartReplyNotification", "StorageNotification", "GetHeaderNotification", "errorReportEmail"
]

const {
  classes: Cc,
  interfaces: Ci,
  utils: Cu,
  results: Cr
} = Components;
Cu.import("resource:///modules/gloda/log4moz.js");
Cu.import("resource://v_identity/vI_prefs.js");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource:///modules/mailServices.js");

/** ******************************************************************************************************
 * _errorConsoleTunnel was copied and adapted mozilla test-function
 * mailnews/test/resources/logHelper.js
 */
/**
 * Tunnel nsIScriptErrors that show up on the error console to Log4Moz.  We could
 *  send everything but I think only script errors are likely of much concern.
 *  Also, this nicely avoids infinite recursions no matter what you do since
 *  what we publish is not going to end up as an nsIScriptError.
 *
 * This is based on my (asuth') exmmad extension.
 */
let _errorConsoleTunnel = {
  initialize: function () {
    Services.console.registerListener(this);
    // we need to unregister our listener at shutdown if we don't want explosions
    Services.obs.addObserver(this, "quit-application", false);
  },

  shutdown: function () {
    try {
      Services.console.unregisterListener(this);
      Services.obs.removeObserver(this, "quit-application");
    } catch (e) {};
  },

  observe: function (aMessage, aTopic, aData) {
    if (aTopic == "quit-application") {
      this.shutdown();
      return;
    }

    try {
      if ((aMessage instanceof Components.interfaces.nsIScriptError) &&
        (aMessage.sourceName.contains("v_identity")) &&
        (!aMessage.errorMessage.contains("Error console says"))) {
        MyLog.info("Error console says" + aMessage);
        if (vIprefs.get("error_alert"))
          Cc["@mozilla.org/appshell/window-mediator;1"]
          .getService(Ci.nsIWindowMediator)
          .getMostRecentWindow(null)
          .alert("Error console says:\n" + aMessage);
      }
    } catch (ex) {
      // This is to avoid pathological error loops.  we definitely do not
      // want to propagate an error here.
    }
  }
};
/** ******************************************************************************************************/

// different formatters for the log output
// Basic formatter that only prints the message / used for NotificationBox
function NotificationFormatter() {}
NotificationFormatter.prototype = {
  __proto__: Log4Moz.Formatter.prototype,
  format: function NF_format(message) {
    // The trick below prevents errors further down because mo is null or
    //  undefined.
    let messageString = message.messageObjects.map(mo => "" + mo).join(" ");
    return messageString;
  }
};

// New formatter that only display's the source and message
function NewFormatter() {}
NewFormatter.prototype = {
  __proto__: Log4Moz.Formatter.prototype,

  format: function NF_format(message) {
    // The trick below prevents errors further down because mo is null or
    //  undefined.
    let messageString = message.messageObjects.map(mo => "" + mo).join(" ");
    return message.loggerName.replace("virtualIdentity.", "") + ":\t" + messageString + "\n";
  }
};

/*
 * DebugOutputAppender
 * Logs to DebugOutput
 */
function DebugOutputAppender(formatter) {
  this._name = "DebugOutputAppender";
  Log4Moz.Appender.call(this, formatter);
}
DebugOutputAppender.prototype = {
  __proto__: Log4Moz.Appender.prototype,

  currentWindow: null,

  doAppend: function DOApp_doAppend(message) {
    if (!vIprefs.get("debug_notification")) return;
    this.currentWindow = Cc["@mozilla.org/appshell/window-mediator;1"]
      .getService(Ci.nsIWindowMediator)
      .getMostRecentWindow(null);
    var obj_debugBox = this.currentWindow.document.getElementById("virtualIdentityExtension_debugBox");
    if (obj_debugBox)
      obj_debugBox.dump(message);
  }
}

/*
 * NotificationOutputAppender
 * Logs to NotificationBox
 */
function NotificationOutputAppender(formatter) {
  this._name = "NotificationOutputAppender";
  Log4Moz.Appender.call(this, formatter);
}
NotificationOutputAppender.prototype = {
  __proto__: Log4Moz.Appender.prototype,

  currentWindow: null,

  doAppend: function DOApp_doAppend(message) {
    this.currentWindow = Cc["@mozilla.org/appshell/window-mediator;1"]
      .getService(Ci.nsIWindowMediator)
      .getMostRecentWindow(null);
    if (this.currentWindow)
      this.addNote(message);
  },

  timer: null,

  clearNote: function (self) {
    if (self.timer)
      self.currentWindow.clearTimeout(self.timer);
    self.timer = null;
    let obj_notificationBox = self.currentWindow.document.getElementById("virtualIdentityExtension_vINotification");
    if (obj_notificationBox)
      obj_notificationBox.removeAllNotifications(true);
  },

  addNote: function (note) {
    let obj_notificationBox = this.currentWindow.document.getElementById("virtualIdentityExtension_vINotification");
    if (!obj_notificationBox)
      return;
    let oldNotification = obj_notificationBox.currentNotification
    let newLabel = (oldNotification) ? oldNotification.label + note : note;
    this.clearNote(this);
    obj_notificationBox.appendNotification(newLabel, "", "chrome://messenger/skin/icons/flag.png");

    if (vIprefs.get("notification_timeout") != 0)
      this.timer =
      this.currentWindow.setTimeout(this.clearNote,
        vIprefs.get("notification_timeout") * 1000, this);
  }
}


function notificationOverflow(elem) {
  let currentWindow = Cc["@mozilla.org/appshell/window-mediator;1"]
    .getService(Ci.nsIWindowMediator)
    .getMostRecentWindow(null);
  // height will be cut off from messagepane (in 3pane window)
  let objMessagepane = currentWindow.document.getElementById("messagepane");
  let maxHeight = (objMessagepane) ? parseInt(objMessagepane.boxObject.height / 2) + 1 : null;
  if (maxHeight < 60) maxHeight = 60; // set a minimum size, if to small scrollbars are hidden
  let tooBig = (maxHeight) ? (elem.inputField.scrollHeight > maxHeight) : false;
  let newHeight = (tooBig) ? maxHeight : elem.inputField.scrollHeight;
  elem.height = newHeight;
  // give the box a frame if it is to big
  if (tooBig)
    var notificationBox = currentWindow.document.getElementById("virtualIdentityExtension_vINotificationTextbox");
  if (notificationBox) notificationBox.setAttribute("class", "plain border");
}


function setupLogging(name) {
  let Log = Log4Moz.repository.getLogger(name);
  return Log;
}


function setupFullLogging(name) {
  let myBasicFormatter = new Log4Moz.BasicFormatter();
  let myNewFormatter = new NewFormatter();
  let Log = Log4Moz.repository.getLogger(name);

  // Loggers are hierarchical, lowering this log level will affect all output
  let root = Log;
  root.level = Log4Moz.Level["All"];

  if (vIprefs.get("debug_notification")) {
    // A console appender outputs to the JS Error Console
    let capp = new Log4Moz.ConsoleAppender(myBasicFormatter);
    capp.level = Log4Moz.Level["Warn"];
    root.addAppender(capp);

//     dump("*** making ConsoleAppender robust against empty messages\n");
    // original implementation of doAppend dies if message data is empty
    capp.doAppend = function CApp_doAppend(message) {
      try {
        Services.console.logStringMessage(message);
      } catch (e) {}
    }

    // A dump appender outputs to standard out
    let dapp = new Log4Moz.DumpAppender(myBasicFormatter);
    dapp.level = Log4Moz.Level["All"];
    root.addAppender(dapp);
  }

  // A dump appender outputs to Debug Output Box
  let doapp = new DebugOutputAppender(myNewFormatter);
  doapp.level = Log4Moz.Level["All"];
  root.addAppender(doapp);


  return Log;
}

function errorReportEmail(e) {
  if (EmailReportAlreadyCreated) // do this only once per session, prevent endless loops
    return;
  EmailReportAlreadyCreated = true;

  let params = Cc["@mozilla.org/messengercompose/composeparams;1"]
    .createInstance(Ci.nsIMsgComposeParams);

  let composeFields = Cc["@mozilla.org/messengercompose/composefields;1"]
    .createInstance(Ci.nsIMsgCompFields);

  let frame = (e && e.stack) ? e.stack : Components.stack;

  let body =
    "# please send this debug-information if possible #\n" +
    "# it will help to make the extension better #\n" +
    "----------------------------------------------    \n" +
    "(even if some other message compose window does\n" +
    "not work anymore, sending this message might even\n" +
    "work with a virtual identity)\n" +
    "----------------------------------------------    \n\n\n" +
    "virtualIdentity raised an error: " + e + "\n\n";
  while (frame) {
    MyLog.debug(frame);
    body += frame + "\n";
    frame = frame.caller;
  }

  body += "\n\nerror-log:\n---------\n"
  let messages = Services.console.getMessageArray();
  let i = 0
  while (++i < messages.length) {
    if (messages[i].message.indexOf("v_identity") != -1 || messages[i].message.indexOf("virtualIdentity") != -1) {
      body += (messages[i].message) + "\n";
    }
  }

  let version = ""
  try {
    version = vI.extensionVersion + ":\n\n";
  } catch (e) {}

  params.composeFields = composeFields;
  params.composeFields.subject = "Major Error in virtualIdentityExtension";
  params.composeFields.body = version + body;
  params.composeFields.to = "virtualIdentityBug@absorb.it";

  MailServices.compose.OpenComposeWindowWithParams(null, params);
}


function dumpCallStack(e) {
  let frame = (e && e.stack) ? e.stack : Components.stack;
  while (frame) {
    MyLog.debug(frame);
    frame = frame.caller;
  }
}

let Colors = {
  yellow: "\u001b[01;33m",
  blue: "\u001b[01;36m",
  red: "\u001b[01;31m",
  default: "\u001b[00m",
}

function clearDebugOutput() {
  let currentWindow = Cc["@mozilla.org/appshell/window-mediator;1"]
    .getService(Ci.nsIWindowMediator)
    .getMostRecentWindow(null);
  let obj_debugBox = currentWindow.document.getElementById("virtualIdentityExtension_debugBox");
  if (obj_debugBox)
    obj_debugBox.clear();
  let obj_notificationBox = currentWindow.document.getElementById("virtualIdentityExtension_vINotification");
  if (obj_notificationBox)
    obj_notificationBox.removeAllNotifications(true);
}

function _startFileLogging() {
  var file = Components.classes["@mozilla.org/file/local;1"]
    .createInstance(Components.interfaces.nsIFile);

  var defaultPath = Components.classes["@mozilla.org/file/directory_service;1"]
    .getService(Components.interfaces.nsIProperties).get("ProfD", Components.interfaces.nsIFile).path;

  try {
    file.initWithPath(vIprefs.get("debug_to_file_path"));
  } catch (NS_ERROR_FILE_UNRECOGNIZED_PATH) {
    try {
      // try linux delimiter
      file.initWithPath(defaultPath + "/" + vIprefs.get("debug_to_file_path"));
    } catch (NS_ERROR_FILE_UNRECOGNIZED_PATH) {
      try {
        // use windows delimiter
        file.initWithPath(defaultPath + "\\" + vIprefs.get("debug_to_file_path"));
      } catch (NS_ERROR_FILE_UNRECOGNIZED_PATH) {
        dump("FileAppender not available for logging: set logging file first\n");
      };
    }
  }
  // A dump appender outputs to File
  DebugFileAppender = new Log4Moz.FileAppender(file);

  if (DebugFileAppender.doAppend.toString().indexOf("this._fos().write") > -1) {
    dump("*** hot-fixing FileAppender Logging Bug (https://bugzilla.mozilla.org/show_bug.cgi?id=1082551)\n");
    // there is a bug in original implementation of doAppend, fix the issue
    DebugFileAppender.doAppend = function FApp_doAppend(message) {
      if (message === null || message.length <= 0)
        return;
      try {
        this._fos.write(message, message.length);
      } catch (e) {
        dump("Error writing file:\n" + e);
      }
    };
  }

  DebugFileAppender.level = Log4Moz.Level["All"];
  Log4Moz.repository.rootLogger.addAppender(DebugFileAppender);

  _errorConsoleTunnel.initialize();
}

function _stopFileLogging() {
  if (DebugFileAppender)
    Log4Moz.repository.rootLogger.removeAppender(DebugFileAppender);
  _errorConsoleTunnel.shutdown();
}

function _dump_extension_list() {
  Components.utils.import("resource://gre/modules/AddonManager.jsm");
  AddonManager.getAllAddons(function (addons) {
    var strings = addons.map(function (addon) {
      return (addon.userDisabled || addon.appDisabled ? "" : "addon: " + addon.name + " " + addon.version + "\n");
    });
    MyLog.info("\n--------------------------------------------------------------------------------\n" +
      strings.join("") +
      "--------------------------------------------------------------------------------");
  });
}

function _dump_info_block() {
  // add some information about the mail-client and the extensions installed
  if ("@mozilla.org/xre/app-info;1" in Components.classes) {
    var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
      .getService(Components.interfaces.nsIXULAppInfo);
    var protohandler = Components.classes["@mozilla.org/network/protocol;1?name=http"]
      .getService(Components.interfaces.nsIHttpProtocolHandler);
    MyLog.info("start logging for new session\n--------------------------------------------------------------------------------\n" +
      appInfo.name + " " + appInfo.version + " (" + appInfo.appBuildID + "; " + protohandler.oscpu + ")\n" +
      "--------------------------------------------------------------------------------");
  } else
    MyLog.info("\n--------------------------------------------------------------------------------\n" +
      "mail-client seems not supported by Virtual Identity Extension\n" +
      "--------------------------------------------------------------------------------");

  _dump_extension_list();
}

function UpdateFileLoggerPath() {
  dump("UpdateFileLoggerPath\n");
  if (vIprefs.get("debug_to_file")) {
    _stopFileLogging();
    _startFileLogging();
    _dump_info_block();
  }
}

function UpdateFileLogger() {
  if (vIprefs.get("debug_to_file")) {
    _startFileLogging();
    _dump_info_block();
  } else {
    _stopFileLogging();
  }
}

function UpdateSmartReplyNotification() {
  if (vIprefs.get("smart_reply_notification")) {
    SmartReplyAppender = new NotificationOutputAppender(myNotificationFormatter);
    SmartReplyAppender.level = Log4Moz.Level["All"];
    SmartReplyNotification.addAppender(SmartReplyAppender);
  } else {
    SmartReplyNotification.removeAppender(SmartReplyAppender);
  }
}

function UpdateStorageNotification() {
  if (vIprefs.get("storage_notification")) {
    StorageAppender = new NotificationOutputAppender(myNotificationFormatter);
    StorageAppender.level = Log4Moz.Level["All"];
    StorageNotification.addAppender(StorageAppender);
  } else {
    StorageNotification.removeAppender(StorageAppender);
  }
}

function UpdateGetHeaderNotification() {
  if (vIprefs.get("get_header_notification")) {
    GetHeaderAppender = new NotificationOutputAppender(myNotificationFormatter);
    GetHeaderAppender.level = Log4Moz.Level["All"];
    GetHeaderNotification.addAppender(GetHeaderAppender);
  } else {
    GetHeaderNotification.removeAppender(GetHeaderAppender);
  }
}

let logRoot = "virtualIdentity";
var MyLog = setupFullLogging(logRoot);

let myNotificationFormatter = new NotificationFormatter();

let DebugFileAppender = null;

let SmartReplyAppender;
let SmartReplyNotification = Log4Moz.repository.getLogger("virtualIdentity.SmartReply");

let StorageAppender;
let StorageNotification = Log4Moz.repository.getLogger("virtualIdentity.StorageNotification");

let GetHeaderAppender;
let GetHeaderNotification = Log4Moz.repository.getLogger("virtualIdentity.GetHeaderNotification");

let EmailReportAlreadyCreated = null;

UpdateSmartReplyNotification();
UpdateStorageNotification();
UpdateGetHeaderNotification();
UpdateFileLogger();

vIprefs.addObserver("smart_reply_notification", UpdateSmartReplyNotification, this);
vIprefs.addObserver("storage_notification", UpdateStorageNotification, this);
vIprefs.addObserver("get_header_notification", UpdateGetHeaderNotification, this);
vIprefs.addObserver("debug_to_file", UpdateFileLogger, this);
vIprefs.addObserver("debug_to_file_path", UpdateFileLoggerPath, this);
