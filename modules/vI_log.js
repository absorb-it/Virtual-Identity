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
  "SmartReplyNotification", "StorageNotification", "GetHeaderNotification" ]

const {classes: Cc, interfaces: Ci, utils: Cu, results : Cr} = Components;
Cu.import("resource:///modules/gloda/log4moz.js");
Cu.import("resource://v_identity/vI_prefs.js");

// different formatters for the log output
// Basic formatter that only prints the message / used for NotificationBox
function NotificationFormatter() {}
NotificationFormatter.prototype = {
  __proto__: Log4Moz.Formatter.prototype,
  format: function NF_format(message) {
    // The trick below prevents errors further down because mo is null or
    //  undefined.
    let messageString = [
      ("" + mo) for each
      ([,mo] in Iterator(message.messageObjects))].join(" ");
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
    let messageString = [
      ("" + mo) for each
      ([,mo] in Iterator(message.messageObjects))].join(" ");
    return message.loggerName.replace("virtualIdentity.", "") + ":\t" + messageString  + "\n";
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

  currentWindow : null,
  
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
  
  currentWindow : null,

  doAppend: function DOApp_doAppend(message) {
    this.currentWindow = Cc["@mozilla.org/appshell/window-mediator;1"]
      .getService(Ci.nsIWindowMediator)
      .getMostRecentWindow(null);
    if (this.currentWindow)
      this.addNote(message);
  },
  
  timer : null,

  clearNote: function(self) {
    if (self.timer)
      self.currentWindow.clearTimeout(self.timer);
    self.timer = null;
    let obj_notificationBox = self.currentWindow.document.getElementById("virtualIdentityExtension_vINotification");
    if (obj_notificationBox)
      obj_notificationBox.removeAllNotifications(true);
  },

  addNote: function(note) {
    let obj_notificationBox = this.currentWindow.document.getElementById("virtualIdentityExtension_vINotification");
    if (!obj_notificationBox)
      return;
    let oldNotification = obj_notificationBox.currentNotification
    let newLabel = (oldNotification)?oldNotification.label + note:note;
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
  let maxHeight = (objMessagepane)?parseInt(objMessagepane.boxObject.height / 2)+1:null;
  if (maxHeight < 60) maxHeight = 60; // set a minimum size, if to small scrollbars are hidden
    let tooBig = (maxHeight)?(elem.inputField.scrollHeight > maxHeight):false;
    let newHeight = (tooBig)?maxHeight:elem.inputField.scrollHeight;
    elem.height = newHeight;
  // give the box a frame if it is to big
  if (tooBig)
    currentWindow.document.getElementById("virtualIdentityExtension_vINotificationTextbox").setAttribute("class", "plain border")
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

let logRoot = "virtualIdentity";
let MyLog = setupFullLogging(logRoot);

let myNotificationFormatter = new NotificationFormatter();
let SmartReplyNotification = Log4Moz.repository.getLogger("virtualIdentity.SmartReply");
if (vIprefs.get("smart_reply_notification")) {
  let napp = new NotificationOutputAppender(myNotificationFormatter);
  napp.level = Log4Moz.Level["All"];
  SmartReplyNotification.addAppender(napp);
}
let StorageNotification = Log4Moz.repository.getLogger("virtualIdentity.StorageNotification");
if (vIprefs.get("storage_notification")) {
  let napp = new NotificationOutputAppender(myNotificationFormatter);
  napp.level = Log4Moz.Level["All"];
  StorageNotification.addAppender(napp);
}
let GetHeaderNotification = Log4Moz.repository.getLogger("virtualIdentity.GetHeaderNotification");
if (vIprefs.get("get_header_notification")) {
  let napp = new NotificationOutputAppender(myNotificationFormatter);
  napp.level = Log4Moz.Level["All"];
  GetHeaderNotification.addAppender(napp);
}
