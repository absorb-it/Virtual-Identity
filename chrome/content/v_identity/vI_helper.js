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

var vI_helper = {
	// simplified versionChecker, type is "TB" or "SM"
	// returns true if appVersion is smaller or equal version
	olderVersion : function (type, version) {
		var appID = null; var appVersion = null;
		const THUNDERBIRD_ID = "{3550f703-e582-4d05-9a08-453d09bdfdc6}";
		const SEAMONKEY_ID = "{92650c4d-4b8e-4d2a-b7eb-24ecf4f6b63a}";

		var versionChecker;
		if("@mozilla.org/xre/app-info;1" in Components.classes) {
			var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
				.getService(Components.interfaces.nsIXULAppInfo);
			appID = appInfo.ID
			appVersion = appInfo.version
		}
		if ((type == "TB" && appID != THUNDERBIRD_ID) ||
			(type == "SM" && appID != SEAMONKEY_ID)) return null;

		if (!version) return ((type == "TB" && appID == THUNDERBIRD_ID) ||
			(type == "SM" && appID == SEAMONKEY_ID))

		if("@mozilla.org/xpcom/version-comparator;1" in Components.classes)
			versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
				.getService(Components.interfaces.nsIVersionComparator);
		else return null;
		
		return (versionChecker.compare(appVersion, version) < 0)
	},

// vI_upgrade.js:229:
// vI_upgrade.js:232:
	combineNames : function (fullName, email) {
		if (fullName && fullName.replace(/^\s+|\s+$/g,"")) return fullName.replace(/^\s+|\s+$/g,"") + " <" + email.replace(/^\s+|\s+$/g,"") + ">"
		else return email?email.replace(/^\s+|\s+$/g,""):""
	},
	
// vI_rdfDataEditor.js:80:
// vI_rdfDatasource.js:119:
// vI_rdfDatasource.js:123:
// vI_rdfDatasource.js:130:
// vI_upgrade.js:225:
// vI_upgrade.js:256:
	parseAddress : function(address) {
		var name = ""; var email = "";
		// prefer an email address separated with < >, only if not found use any other
		if (address.match(/<\s*[^>\s]*@[^>\s]*\s*>/) || address.match(/<?\s*[^>\s]*@[^>\s]*\s*>?/) || address.match(/$/)) {
			name = RegExp.leftContext + RegExp.rightContext
			email = RegExp.lastMatch
			email = email.replace(/\s+|<|>/g,"")
			name = name.replace(/^\s+|\s+$/g,"")
			name = name.replace(/^\"|\"$/g,"")
			name = name.replace(/^\'|\'$/g,"")
		}
		return { name: name,
			 email: email,
			 combinedName: vI_helper.combineNames(name, email)}
	}
}
