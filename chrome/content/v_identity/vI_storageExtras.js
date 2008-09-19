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

 * ***** END LICENSE BLOCK ***** */

function vI_storageExtras_adapt(sourceId, targetId) {
	var checked = document.getElementById(sourceId).getAttribute("checked");
	if (targetId) var target = document.getElementById(targetId)
	else var target = document.getElementById(sourceId.replace(/_store/,""))
	if (checked == "true") target.removeAttribute("disabled")
	else target.setAttribute("disabled", "true");
}	

var vI_storageExtrasHelper = {
	seamonkey_old : null,

	preferences : Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefService)
			.getBranch("extensions.virtualIdentity."),
	
	hideUnusedTreeCols : function() {
		if (vI_storageExtrasHelper.seamonkey_to_old()) return;
		var storageExtras = new vI_storageExtras();
		for( var i = 0; i < storageExtras.extras.length; i++ )
			if (!vI_storageExtrasHelper.preferences.getBoolPref(storageExtras.extras[i].option))
				document.getElementById(storageExtras.extras[i].field + "Col").setAttribute("hidden", "true");
	},
	
	hideUnusedEditorFields : function() {
		if (vI_storageExtrasHelper.seamonkey_to_old()) return;
		var storageExtras = new vI_storageExtras();
		var allHidden = true;
		var hide = (document.getElementById("vI_storageExtras_hideUnusedEditorFields").getAttribute("checked") == "true")
		for( var i = 0; i < storageExtras.extras.length; i++ ) {
			var hidden = hide && !vI_storageExtrasHelper.preferences.getBoolPref(storageExtras.extras[i].option)
			if (!hidden) allHidden = false
			document.getElementById("vI_" + storageExtras.extras[i].option).setAttribute("hidden", hidden)
			document.getElementById("vI_" + storageExtras.extras[i].option + "_store").setAttribute("hidden", hidden)
		}
		document.getElementById("storeValue").setAttribute("hidden", allHidden)
		// resize the window to the content
		window.sizeToContent();
	},

	seamonkey_to_old : function() {
		if (vI_storageExtrasHelper.seamonkey_old != "true")
			vI_storageExtrasHelper.seamonkey_old = vI_helper.olderVersion("SM", "1.5a")
		return (vI_storageExtrasHelper.seamonkey_old)	
	}
}

function vI_storageExtras(callFunction, resource) {
// function vI_storageExtras_checkbox(field, option, composeDialogElementID, updateFunction, identityValue) {
	this.extras = [

//	gReceiptOptionChanged


		new vI_storageExtras_checkbox(
			"reciept", "storageExtras_returnReciept", "returnReceiptMenu", null, "identity.requestReturnReceipt;"),
		new vI_storageExtras_characterEncoding(),
		new vI_storageExtras_msgFormat(),
		new vI_storageExtras_sMime_messageEncryption(),
		new vI_storageExtras_checkbox(
			"sMimeSig", "storageExtras_sMime_messageSignature", "menu_securitySign1",
				"(typeof(setSecuritySettings)=='function')?setSecuritySettings(1):null;",
				"identity.getBoolAttribute('sign_mail')"),
		new vI_storageExtras_checkbox(
			"PGPEnc", "storageExtras_openPGP_messageEncryption", "enigmail_encrypted_send",
				"(typeof(enigSetMenuSettings)=='function')?enigSetMenuSettings(''):null;",
				"identity.getIntAttribute('defaultEncryptionPolicy') > 0"),
		new vI_storageExtras_checkbox(
			"PGPSig", "storageExtras_openPGP_messageSignature", "enigmail_signed_send",
				"(typeof(enigSetMenuSettings)=='function')?enigSetMenuSettings(''):null;",
				"(identity.getIntAttribute('defaultEncryptionPolicy') > 0)?identity.getBoolAttribute('pgpSignEncrypted'):identity.getBoolAttribute('pgpSignPlain')"),
		new vI_storageExtras_checkbox(
			"PGPMIME", "storageExtras_openPGP_PGPMIME", "enigmail_sendPGPMime",
				"(typeof(enigSetMenuSettings)=='function')?enigSetMenuSettings(''):null;",
				"identity.getBoolAttribute('pgpMimeMode')")
		]
	if (callFunction) this.loopForRDF(callFunction, resource)
}

vI_storageExtras.prototype = {
	loopForRDF : function(callFunction, resource) {
		for( var i = 0; i < this.extras.length; i++ )
			// only if pref set and feature(element available) or for dataEditor
			if (typeof(gMsgCompose) == "undefined" || !gMsgCompose || this.extras[i].active)
				this.extras[i].value = callFunction(resource, this.extras[i].field, this.extras[i].value)
	},
	
	// just give a duplicate of the current storageExtras, else we will work with pointers
	getDuplicate : function() {
		if (vI_storageExtrasHelper.seamonkey_to_old()) return null;
		var newExtras = new vI_storageExtras();
		for( var i = 0; i < this.extras.length; i++ ) {
			newExtras.extras[i].value = this.extras[i].value;
		}
		return newExtras;
	},
	
	equal : function(storageExtras) {
		var equal = true;
		for( var i = 0; i < this.extras.length; i++ ) {
			if (this.extras[i].active) {
				equal = (this.extras[i].equal(storageExtras.extras[i]) && equal) // in this order to compare all fields (required for Matrix)
			}
		}
		return equal;
	},
	getMatrix : function() {
		var prefStrings = document.getElementById("vIStorageExtrasBundle");
		var string = "";
		for( var i = 0; i < this.extras.length; i++ ) {
			if (this.extras[i].active) {
				if (this.extras[i].valueHtml)
					string += "<tr>" +
					"<td class='col1 extras '>" + prefStrings.getString("vident.identityData.extras." + this.extras[i].field) + "</td>" +
					"<td class='col2 extras '>" + this.extras[i].valueHtml + "</td>" +
					"</tr>"
			}
		}
		return string;
	},
	getCompareMatrix : function() {
		var prefStrings = document.getElementById("vIStorageExtrasBundle");
		var string = "";
		for( var i = 0; i < this.extras.length; i++ ) {
			if (this.extras[i].active) {
				var classEqual = (this.extras[i].comp.equal)?"equal":"unequal";
				string += "<tr>" +
					"<td class='col1 extras " + classEqual + "'>" + prefStrings.getString("vident.identityData.extras." + this.extras[i].field) + "</td>" +
					"<td class='col2 extras " + classEqual + "'>" + this.extras[i].comp.compareValue + "</td>" +
					"<td class='col3 extras " + classEqual + "'>" + this.extras[i].valueHtml + "</td>" +
					"</tr>"
			}
		}
		return string;
	},
	status : function() {
		if (vI_storageExtrasHelper.seamonkey_to_old()) return null;
		var returnVal = "";
		for( var i = 0; i < this.extras.length; i++ )
			if (this.extras[i].active && this.extras[i].value)
				returnVal += " " + this.extras[i].field + "='" + this.extras[i].value + "'";
		return returnVal
	},

	readIdentityValues : function(identity) {
		if (vI_storageExtrasHelper.seamonkey_to_old()) return;
		for( var i = 0; i < this.extras.length; i++ ) {
			if (this.extras[i].active) this.extras[i].readIdentityValue(identity)
// 			vI_notificationBar.dump("## vI_storageExtras readIdentityValues "+ this.extras[i].field + "=" + this.extras[i].value + "\n");
		}
	},

	setValues : function() {
		if (vI_storageExtrasHelper.seamonkey_to_old()) return;
		for( var i = 0; i < this.extras.length; i++ ) {
			if (this.extras[i].active) this.extras[i].setValue()
// 			vI_notificationBar.dump("## vI_storageExtras setValue "+ this.extras[i].field + "=" + this.extras[i].value + "\n");
		}
	},
	readValues : function() {
		if (vI_storageExtrasHelper.seamonkey_to_old()) return;
		for( var i = 0; i < this.extras.length; i++ ) {
// 			vI_notificationBar.dump("## vI_storageExtras preparing readValue "+ this.extras[i].field +"\n");
			if (this.extras[i].active) this.extras[i].readValue()
//  			vI_notificationBar.dump("## vI_storageExtras readValue "+ this.extras[i].field + "=" + this.extras[i].value + "\n");
		}
	},
	setEditorValues : function() {
		if (vI_storageExtrasHelper.seamonkey_to_old()) return;
		for( var i = 0; i < this.extras.length; i++ ) {
			this.extras[i].value = window.arguments[0][this.extras[i].field + "Col"]
			this.extras[i].setEditorValue();
// 			vI_notificationBar.dump("## vI_storageExtras setEditorValue "+ this.extras[i].field + "=" + this.extras[i].value + "\n");
		}
	},
	readEditorValues : function() {
		if (vI_storageExtrasHelper.seamonkey_to_old()) return;
		for( var i = 0; i < this.extras.length; i++ ) {
			this.extras[i].readEditorValue();
// 			vI_notificationBar.dump("## vI_storageExtras readValue " + this.extras[i].field + "=" + this.extras[i].value + "\n");
		}
	},

	// add value's to the pref object, required for rdfDataTree
	addPrefs : function(pref) {
		if (vI_storageExtrasHelper.seamonkey_to_old()) return;
		for( var i = 0; i < this.extras.length; i++ )
			pref[this.extras[i].field + "Col"] = this.extras[i].value;
	}
}

function vI_storageExtras_characterEncoding_setMenuMark() {
	var maileditCharsetMenu = document.getElementById("maileditCharsetMenu")
	var value = maileditCharsetMenu.getAttribute("unmarkedValue")
	if (value) {
		var menuitem = document.getElementById(value);
		if (menuitem) menuitem.setAttribute('checked', 'true');
		maileditCharsetMenu.removeAttribute("unmarkedValue")
	}
}
function vI_storageExtras_characterEncoding() {
	this.active = vI_storageExtrasHelper.preferences.getBoolPref("storage") &&
				vI_storageExtrasHelper.preferences.getBoolPref(this.option)
	this.comp = { compareValue : null, equal : null }
}
vI_storageExtras_characterEncoding.prototype = {
	active : null,
	value : null,
	field : "charEnc",
	option : "storageExtras_characterEncoding",
	comp : null,

	get valueHtml() {
		return this.value?gCharsetConvertManager
					.getCharsetTitle(gCharsetConvertManager.getCharsetAlias(this.value)):"";
	},

	// function to read the value from a given identity
	readIdentityValue : function(identity) { }, // no charset per identity

	equal : function(compareStorageExtra) {
		this.comp.compareValue = compareStorageExtra.valueHtml;
		this.comp.equal = (!this.value || !compareStorageExtra.value || this.value == compareStorageExtra.value);
		return this.comp.equal;
	},
	// function to set or read the value from/to the MessageCompose Dialog
	setValue : function() {
		if (!this.value) return;
		var menuitem = document.getElementById(this.value);
		if (menuitem) menuitem.setAttribute('checked', 'true');
		else {	// set menumark later if menu is not ready yet
			var maileditCharsetMenu = document.getElementById("maileditCharsetMenu")
			maileditCharsetMenu.setAttribute("unmarkedValue", this.value)
			var onpopupshowing = maileditCharsetMenu.getAttribute("onpopupshowing")
			document.getElementById("maileditCharsetMenu").setAttribute("onpopupshowing",
				onpopupshowing + ";vI_storageExtras_characterEncoding_setMenuMark();")
		}
		gMsgCompose.compFields.characterSet = this.value;
		SetDocumentCharacterSet(this.value);
	},
	readValue : function() {
		// read the value from the internal vI object, global object might not be available any more
		// happens especially while storing after sending the message
		this.value = vI.gMsgCompose.compFields.characterSet;
		if (gCharsetConvertManager) {
			var charsetAlias = gCharsetConvertManager.getCharsetAlias(this.value);
			if (charsetAlias == "us-ascii") this.value = "ISO-8859-1";   // no menu item for "us-ascii"
		}
	},
	// function to set or read the value from the rdfDataEditor
	setEditorValue : function() {
		CreateMenu('mailedit');
		if (this.value != null) {
			document.getElementById("maileditCharsetMenu").selectedItem = document.getElementById(this.value);
			document.getElementById("vI_" + this.option + "_store").setAttribute("checked", "true");
		}
		document.getElementById("vI_" + this.option + "_store").doCommand();
	},
	readEditorValue : function() {
		if (document.getElementById("vI_" + this.option + "_store").getAttribute("checked") == "true")
			this.value = document.getElementById("maileditCharsetMenu").selectedItem.id
		else 	this.value = null;
	}
}

function vI_storageExtras_msgFormat() {
	this.active = vI_storageExtrasHelper.preferences.getBoolPref("storage") &&
				vI_storageExtrasHelper.preferences.getBoolPref(this.option)
	this.comp = { value : null, compareValue : null, equal : null }
}
vI_storageExtras_msgFormat.prototype = {
	active : null,
	value : null,
	field : "msgFormat",
	option : "storageExtras_messageFormat",
	comp : null,

	get valueHtml() {
		return this.value?document.getElementById(this.value).label:"";
	},

	// function to read the value from a given identity
	readIdentityValue : function(identity) { }, // no msgFormat per identity

	equal : function(compareStorageExtra) {
		this.comp.compareValue = compareStorageExtra.valueHtml;
		this.comp.equal = (!this.value || !compareStorageExtra.value || this.value == compareStorageExtra.value);
		return this.comp.equal;
	},
	// function to set or read the value from/to the MessageCompose Dialog
	setValue : function() {
		if (!this.value) return;
		document.getElementById(this.value).setAttribute("checked","true");
		OutputFormatMenuSelect(document.getElementById(this.value))
	},
	readValue : function() {
		switch (gSendFormat) {
			case nsIMsgCompSendFormat.AskUser: this.value = "format_auto"; break;
			case nsIMsgCompSendFormat.PlainText: this.value = "format_plain"; break;
			case nsIMsgCompSendFormat.HTML: this.value = "format_html"; break;
			case nsIMsgCompSendFormat.Both: this.value = "format_both"; break;
		}
	},
	// function to set or read the value from the rdfDataEditor
	setEditorValue : function() {
		//~ document.getElementById(this.value).setAttribute("checked","true");
		if (this.value != null) {
			document.getElementById("outputFormatMenu").selectedItem = document.getElementById(this.value);
			document.getElementById("vI_" + this.option + "_store").setAttribute("checked", "true");
		}
		document.getElementById("vI_" + this.option + "_store").doCommand();
		
	},
	readEditorValue : function() {
		if (document.getElementById("vI_" + this.option + "_store").getAttribute("checked") == "true")
			this.value = document.getElementById("outputFormatMenu").selectedItem.id
		else 	this.value = null;
	}
}

function vI_storageExtras_sMime_messageEncryption() { 
	this.active = vI_storageExtrasHelper.preferences.getBoolPref("storage") &&
				vI_storageExtrasHelper.preferences.getBoolPref(this.option)
	this.comp = { value : null, compareValue : null, equal : null }
}
vI_storageExtras_sMime_messageEncryption.prototype = {
	active : null,
	value : null,
	field : "sMimeEnc",
	option : "storageExtras_sMime_messageEncryption",
	comp : null,

	get valueHtml() {
		if (!this.value) return "";
		return	"<div class='bool" + ((this.value=="true")?" checked":"") + "'>" +
				"<label class='screen'>&nbsp;</label>" +
				"<label class='braille'>" + ((this.value=="true")?"yes":"no") + "</label>" +
			"</div>"
	},

	equal : function(compareStorageExtra) {
		this.comp.compareValue = compareStorageExtra.valueHtml;
		this.comp.equal = (this.value == null || this.value == compareStorageExtra.value);
		return this.comp.equal;
	},

	// function to read the value from a given identity
	readIdentityValue : function(identity) {
		this.value = (identity.getIntAttribute("encryptionpolicy") == 2)?"true":"false"
	},
	// function to set or read the value from/to the MessageCompose Dialog
	setValue : function() {
		if (this.value == "true") var element = document.getElementById("menu_securityEncryptRequire1")
		else var element = document.getElementById("menu_securityNoEncryption1")
		element.setAttribute("checked", "true");
		element.doCommand();
	},
	readValue : function() {
		setSecuritySettings(1)
		this.value = (document.getElementById("menu_securityEncryptRequire1").getAttribute("checked") == "true")?"true":"false"
	},
	// function to set or read the value from the rdfDataEditor
	setEditorValue : function() { 
		if (this.value != null) {
			document.getElementById("vI_" + this.option).setAttribute("checked", this.value);
			document.getElementById("vI_" + this.option + "_store").setAttribute("checked", "true");
		}
		document.getElementById("vI_" + this.option + "_store").doCommand();
	},
	readEditorValue : function() {
		if (document.getElementById("vI_" + this.option + "_store").getAttribute("checked") == "true") {
			var elementValue = document.getElementById("vI_" + this.option).getAttribute("checked");
			this.value = (elementValue == "true")?"true":"false"
		}
		else 	this.value = null;
	}
}

// a general checkbox for extra options. Has to provide some additional information
function vI_storageExtras_checkbox(field, option, composeDialogElementID, updateFunction, identityValue) {
	this.field = field;		// description of the option
	this.option = option;		// option string to get preference settings
	this.composeDialogElementID = composeDialogElementID;
	this.updateFunction = updateFunction;
	this.valueFromIdentityFunction = identityValue;
	this.active = vI_storageExtrasHelper.preferences.getBoolPref("storage") &&
				vI_storageExtrasHelper.preferences.getBoolPref(this.option) &&
		document.getElementById(this.composeDialogElementID);
	this.comp = { compareValue : null, equal : null }
}
vI_storageExtras_checkbox.prototype = {
	active : null,
	value : null,
	field : null,
	option : null,
	comp : null,
	composeDialogElementID : null,
	updateFunction : null, // some elements have to be updated before the can be read
	valueFromIdentityFunction : null,
	
	get valueHtml() {
		if (!this.value) return "";
		return	"<div class='bool" + ((this.value=="true")?" checked":"") + "'>" +
				"<label class='screen'>&nbsp;</label>" +
				"<label class='braille'>" + ((this.value=="true")?"yes":"no") + "</label>" +
			"</div>"
	},

	equal : function(compareStorageExtra) {
		this.comp.compareValue = compareStorageExtra.valueHtml;
		this.comp.equal = (this.value == null || this.value == compareStorageExtra.value);
		return this.comp.equal;
	},

	// function to read the value from a given identity
	readIdentityValue : function(identity) {
		this.value = eval(this.valueFromIdentityFunction)?"true":"false";
	},
	// function to set or read the value from/to the MessageCompose Dialog
	setValue : function() {
		var element = document.getElementById(this.composeDialogElementID);
		if (!this.value || !element) return;
		if ((element.getAttribute("checked") == "true") != (this.value == "true")) {
			if (this.value == "true") element.setAttribute("checked","true");
			else element.removeAttribute("checked");
			element.doCommand();
		}
	},
	readValue : function() {
		var element = document.getElementById(this.composeDialogElementID)
		if (!element) return;
		if (this.updateFunction) eval(this.updateFunction);
		this.value = ((element.getAttribute("checked") == "true")?"true":"false")
	},
	// function to set or read the value from the rdfDataEditor
	setEditorValue : function() {
		if (this.value != null) {
			document.getElementById("vI_" + this.option).setAttribute("checked", this.value);
			document.getElementById("vI_" + this.option + "_store").setAttribute("checked", "true");
		}
		document.getElementById("vI_" + this.option + "_store").doCommand();
	},
	readEditorValue : function() {
		if (document.getElementById("vI_" + this.option + "_store").getAttribute("checked") == "true") {
			var elementValue = document.getElementById("vI_" + this.option).getAttribute("checked");
			this.value = (elementValue == "true")?"true":"false"
		}
		else 	this.value = null;
	}
}
