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
  "clearDebugOutput", "clearNote", "setNote", "addNote"]

const {classes: Cc, interfaces: Ci, utils: Cu, results : Cr} = Components;

Cu.import("resource:///modules/gloda/log4moz.js");
preferences = Components.classes["@mozilla.org/preferences-service;1"]
  .getService(Components.interfaces.nsIPrefService)
  .getBranch("extensions.virtualIdentity.");


function setupLogging(name) {
  let Log = Log4Moz.repository.getLogger(name);
  return Log;
}
/*
 * DumpAppender
 * Logs to DebugOutput
 */


function DebugOutputAppender(formatter) {
  this._name = "DebugOutputAppender";
  Log4Moz.Appender.call(this, formatter);
}
DebugOutputAppender.prototype = {
  __proto__: Log4Moz.Appender.prototype,

  doAppend: function DOApp_doAppend(message) {
    window = Cc["@mozilla.org/appshell/window-mediator;1"]
      .getService(Ci.nsIWindowMediator)
      .getMostRecentWindow(null);
    obj_debugBox = window.document.getElementById("vIDebugBox");
    if (obj_debugBox) obj_debugBox.dump(message);
  }
}


function setupFullLogging(name) {
  let formatter = new Log4Moz.BasicFormatter();
  let Log = Log4Moz.repository.getLogger(name);

  // Loggers are hierarchical, lowering this log level will affect all output
  let root = Log;
  root.level = Log4Moz.Level["All"];

  if (preferences.getBoolPref("debug_notification")) {
    // A console appender outputs to the JS Error Console
    let capp = new Log4Moz.ConsoleAppender(formatter);
    capp.level = Log4Moz.Level["Warn"];
    root.addAppender(capp);

    // A dump appender outputs to standard out
    let dapp = new Log4Moz.DumpAppender(formatter);
    dapp.level = Log4Moz.Level["All"];
    root.addAppender(dapp);

    // A dump appender outputs to Debug Output Box
    let doapp = new DebugOutputAppender(formatter);
    doapp.level = Log4Moz.Level["All"];
    root.addAppender(doapp);

  }

  Log.debug("Logging enabled");

  return Log;
}

// Must call this once to setup the root logger
let logRoot = "virtualIdentity";
let MyLog = setupFullLogging(logRoot);

function dumpCallStack(e) {
  let frame = e ? e.stack : Components.stack;
  while (frame) {
    MyLog.debug("\n"+frame);
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
    window = Cc["@mozilla.org/appshell/window-mediator;1"]
      .getService(Ci.nsIWindowMediator)
      .getMostRecentWindow(null);
    obj_debugBox = window.document.getElementById("vIDebugBox");
    if (obj_debugBox) obj_debugBox.clear();
}

timer = null;

function clearNote() {
    if (timer) window.clearTimeout(timer);
    timer = null;
    document.getElementById("vINotification").removeAllNotifications(true);
}

function setNote(note, prefstring) {
  clearNote();
  addNote(note, prefstring);
};

//  overflow : function(elem) {
//      // height will be cut off from messagepane (in 3pane window)
//      var objMessagepane = document.getElementById("messagepane");
//      var maxHeight = (objMessagepane)?parseInt(objMessagepane.boxObject.height / 2)+1:null;
//      if (maxHeight < 60) maxHeight = 60; // set a minimum size, if to small scrollbars are hidden
//      var tooBig = (maxHeight)?(elem.inputField.scrollHeight > maxHeight):false;
//      var newHeight = (tooBig)?maxHeight:elem.inputField.scrollHeight;
//      elem.height = newHeight;
//      // give the box a frame if it is to big
//      if (tooBig) document.getElementById("vINotificationTextbox").setAttribute("class", "plain border")
//  },

function addNote(note, prefstring) {
    if (!preferences.getBoolPref(prefstring)) return;
    Log.debug("addNote: ", note);
    
    var oldNotification = document.getElementById("vINotification").currentNotification
    var newLabel = (oldNotification)?oldNotification.label + note:note;
    clearNote();
    document.getElementById("vINotification")
            .appendNotification(newLabel, "", "chrome://messenger/skin/icons/flag.png");

    if (preferences.getIntPref("notification_timeout") != 0)
        timer = window.setTimeout(virtualIdentityExtension.clearNote,
            preferences.getIntPref("notification_timeout") * 1000);
}