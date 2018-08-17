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

var EXPORTED_SYMBOLS = ["vIprefs", "prefroot"]

const {
  classes: Cc,
  interfaces: Ci,
  utils: Cu,
  results: Cr
} = Components;

Cu.import("resource://v_identity/vI_log.js");
let Log = setupLogging("virtualIdentity.prefs");

var prefroot = Cc["@mozilla.org/preferences-service;1"]
  .getService(Ci.nsIPrefService)
  .getBranch(null);

//     .QueryInterface(Components.interfaces.nsIPrefBranch),

var vIprefroot = Cc["@mozilla.org/preferences-service;1"]
  .getService(Ci.nsIPrefService)
  .getBranch("extensions.virtualIdentity.");

// there should be one global prefs-object per window / context
// it will hold all preferences, single prefs can be changed,
// even without influencing the global pref settings
var vIprefs = {
  _localPrefs: [], // array to store accessed prefs (and enable to change them)
  _localObservers: [], // array of local observers { pref: aPrefName, observer: aFunction }

  _retrievePref: function (aPrefName) {
    switch (vIprefroot.getPrefType(aPrefName)) {
    case vIprefroot.PREF_STRING:
      this._localPrefs[aPrefName] = vIprefroot.getCharPref(aPrefName);
      break;
    case vIprefroot.PREF_INT:
      this._localPrefs[aPrefName] = vIprefroot.getIntPref(aPrefName);
      break;
    case vIprefroot.PREF_BOOL:
      this._localPrefs[aPrefName] = vIprefroot.getBoolPref(aPrefName);
      break;
    case vIprefroot.PREF_INVALID:
      Log.error("_retrievePref pref '" + aPrefName + "' not available");
      this._localPrefs[aPrefName] = null;
    }
  },

  _storePref: function (aPrefName) {
    switch (vIprefroot.getPrefType(aPrefName)) {
    case vIprefroot.PREF_STRING:
      vIprefroot.setCharPref(aPrefName, this._localPrefs[aPrefName]);
      break;
    case vIprefroot.PREF_INT:
      vIprefroot.setIntPref(aPrefName, this._localPrefs[aPrefName]);
      break;
    case vIprefroot.PREF_BOOL:
      vIprefroot.setBoolPref(aPrefName, this._localPrefs[aPrefName]);
      break;
    case vIprefroot.PREF_INVALID:
      Log.error("_storePref pref '" + aPrefName + "' not available");
    }
  },

  get: function (aPrefName) {
    if (!(aPrefName in this._localPrefs))
      this._retrievePref(aPrefName);
    return this._localPrefs[aPrefName];
  },
  set: function (aPrefName, aPrefValue) {
    if (!(aPrefName in this._localPrefs))
      this._retrievePref(aPrefName);
    this._localPrefs[aPrefName] = aPrefValue;
    //       Log.debug("changed pref " + aPrefName + " to " + aPrefValue)
    this._localObservers.map(function(prefObserver) {
      //         Log.debug("check prefobserver " + prefObserver.pref + " against " + aPrefName)
      if (prefObserver.pref == aPrefName) {
        prefObserver.observe(prefObserver.context, aPrefValue, "nsPref:changed", aPrefName);
      };
    });
  },
  commit: function (aPrefName, aPrefValue) {
    if (aPrefValue)
      this.set(aPrefName, aPrefValue);
    if (aPrefName in this._localPrefs)
      this._storePref(aPrefName);
  },
  clearUserPref: function (aPrefName) {
    Log.error(Colors.red, "XXXX not yet implemented clearUserPref!", Colors.default);
  },
  addObserver: function (aPrefName, aFunction, aSelf) {
    this._localObservers.push({
      pref: aPrefName,
      observe: aFunction,
      context: aSelf
    });
    //       Log.debug("added observer for " + aPrefName);
  },
  removeObserver: function (aPrefName, aFunction) {
    var this_object = this;
    this._localObservers.forEach(function(prefObserver, i) {
      if (prefObserver.pref == aPrefName && prefObserver.observe == aFunction) {
        this_object._localObservers.splice(i, 1)
      }
    });
  },
  observe: function (subject, topic, aPrefName) {
    Log.debug("prefChange observed : " + aPrefName)
    this._retrievePref(aPrefName);
    this._localObservers.map(function(prefObserver) {
      if (prefObserver.pref == aPrefName) {
        //           Log.debug("found observer, calling : " + prefObserver.observe)
        prefObserver.observe(prefObserver.context, subject, topic, aPrefName);
        //           Log.debug("found observer, calling : " + prefObserver.observe + " done")
      }
    });
  },
  dropLocalChanges: function () {
    var this_object = this;
    for (let [aPrefName, aPrefValue] in this._localPrefs.values()) {
      this_object._retrievePref(aPrefName);
      if (aPrefValue != this._localPrefs[aPrefName]) {
        this_object._localObservers.map(function(prefObserver) {
          if (prefObserver.pref == aPrefName) {
            prefObserver.observe(prefObserver.context, aPrefValue, "nsPref:changed", aPrefName);
          }
        });
      }
    }
  }
}

// always try to (re)init the object
var vIprefBranch2 = Cc["@mozilla.org/preferences-service;1"]
  .getService(Ci.nsIPrefService)
  .getBranch("extensions.virtualIdentity.")
  .QueryInterface(Components.interfaces.nsIPrefBranch);
vIprefBranch2.addObserver("", vIprefs, false);

// mainWindow = Cc["@mozilla.org/appshell/window-mediator;1"]
//   .getService(Ci.nsIWindowMediator)
//   .getMostRecentWindow(null);
// mainWindow.addEventListener("unload", function () {
//     vIprefBranch2.removeObserver("", vIprefs, false);
//   }, false);
