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

var EXPORTED_SYMBOLS = [];

const {classes: Cc, interfaces: Ci, utils: Cu, results : Cr} = Components;

Cu.import("resource://v_identity/vI_log.js");
let Log = setupLogging("virtualIdentity.threadTreeColumns");
Cu.import("resource://v_identity/vI_prefs.js");
Cu.import("resource://v_identity/stdlib/msgHdrUtils.js");

let unicodeConverter = Cc["@mozilla.org/intl/scriptableunicodeconverter"]
  .createInstance(Ci.nsIScriptableUnicodeConverter);
unicodeConverter.charset = "UTF-8";

let ObserverService = Cc["@mozilla.org/observer-service;1"]
  .getService(Components.interfaces.nsIObserverService);
  
currentWindow = Cc["@mozilla.org/appshell/window-mediator;1"]
  .getService(Ci.nsIWindowMediator)
  .getMostRecentWindow("mail:3pane");


function threadTreeColumn(aHeaderName) {
  this.headerName = aHeaderName;
  this.threadTreeBoxObj = currentWindow.document.getElementById("threadTree").boxObject;
  ObserverService.addObserver(this, "MsgCreateDBView", false);
  Log.debug("created Object for header " + aHeaderName + "\n");
};
threadTreeColumn.prototype = {
  headerValues: null,
  headerName: null,
  threadTreeBoxObj: null,
  
  _getHeader: function(hdr, row, col, self) {
    msgHdrGetHeaders(hdr, function (aHeaders) {
      if (aHeaders.has(self.headerName)) {
        self.headerValues[row] = aHeaders.get(self.headerName)
        try {
          self.threadTreeBoxObj.invalidateCell(row, col);
        }
        catch(e) {
          // something wen't wrong, might be a timeout before the window was gone, don't care
        };
      };
    });
  },

  _addColumn: function() {
    if (currentWindow.document.getElementById("col" + this.headerName))
      return;
    let treecolElem = currentWindow.document.getElementById("threadCols");
    let splitter = currentWindow.document.createElement("splitter");
    splitter.setAttribute("class", "tree-splitter");
    treecolElem.appendChild(splitter);
    let treecol = currentWindow.document.createElement("treecol");
    treecol.setAttribute("id", "col" + this.headerName);
    treecol.setAttribute("persist", "hidden ordinal width");
    treecol.setAttribute("currentView", "unthreaded");
    treecol.setAttribute("flex", "2");
    treecol.setAttribute("label", this.headerName.replace( /(^|-)([a-z])/g , function(m,p1,p2){ return p1+p2.toUpperCase(); } ));
    treecolElem.appendChild(treecol);
  },
  
  getCellText:         function(row, col) {
    var key = currentWindow.gDBView.getKeyAt(row);
    var hdr = currentWindow.gDBView.db.GetMsgHdrForKey(key);
    if (!this.headerValues[row]) {
      this._getHeader(hdr, row, col, this);
      this.headerValues[row] = "---";
    }
    return this.headerValues[row];
  },
  getSortStringForRow: function(hdr) {return "---";}, // no sort allowed
  isString:            function() {return true;},
  getCellProperties:   function(row, col, props){},
  getRowProperties:    function(row, props){},
  getImageSrc:         function(row, col) {return null;},
  getSortLongForRow:   function(hdr) {return 0;},

  observe: function(aMsgFolder, aTopic, aData) {
    this._addColumn();
    this.headerValues = {};
    self = this;
    currentWindow.gDBView.addColumnHandler("col" + self.headerName, self);
  }
};

function doOnceLoaded() {
  let headerList = unicodeConverter.ConvertToUnicode(vIprefs.get("smart_reply_headers")).split(/\n/)
  for each (let header in headerList)
    new threadTreeColumn(header.split(/:/)[0].toLowerCase())
};

currentWindow.addEventListener("load", doOnceLoaded, false);
