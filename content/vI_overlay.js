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
    Portions created by the Initial Developer are Copyright (C) 2011
    the Initial Developer. All Rights Reserved.

    Contributor(s): 
 * ***** END LICENSE BLOCK ***** */

Components.utils.import("resource://v_identity/vI_nameSpaceWrapper.js");
virtualIdentityExtension.ns(function () {
  with(virtualIdentityExtension.LIB) {

    let Log = vI.setupLogging("virtualIdentity.overlay");
    var rdfDatasource;
    
    Components.utils.import("resource://v_identity/vI_rdfDatasource.js", virtualIdentityExtension);
    Components.utils.import("resource://v_identity/vI_account.js", virtualIdentityExtension);
    Components.utils.import("resource://v_identity/vI_prefs.js", virtualIdentityExtension);

    Components.utils.import("resource://gre/modules/AddonManager.jsm");

    const virtualIdentity_ID = "{dddd428e-5ac8-4a81-9f78-276c734f75b8}"
    AddonManager.getAddonByID(virtualIdentity_ID, function (addon) {
      if (addon) {
        vI.extensionVersion = addon.version;
      }
    });


    function extensionInit() {
      rdfDatasource = new vI.rdfDatasource(window, "virtualIdentity_0.10.rdf", false); // create this for upgrade and keep it to permanatly enable accountManager observer
      vI.upgrade.quickUpgrade(rdfDatasource);

      if (vI.vIprefs.get("error_console")) {
        document.getElementById("virtualIdentityExtension_vIErrorBoxSplitter").removeAttribute("hidden");
        document.getElementById("virtualIdentityExtension_vIErrorBox").removeAttribute("hidden");
        document.getElementById("virtualIdentityExtension_vIErrorBox").setAttribute("class", "console-box");
        vI.prefroot.setBoolPref("javascript.options.showInConsole", true);
        vI.prefroot.setBoolPref("browser.dom.window.dump.enabled", true);
        vI.prefroot.setBoolPref("javascript.options.strict", true);
      }
    }

    addEventListener('messagepane-loaded', extensionInit, true);
  }
});
