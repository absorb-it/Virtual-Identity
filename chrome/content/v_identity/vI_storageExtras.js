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

vI_storageExtrasHelper = {
	preferences : Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefService)
			.getBranch("extensions.virtualIdentity."),
	
	hideUnusedTreeCols : function() {
		var storageExtras = new vI_storageExtras();
		for( var i = 0; i < storageExtras.extras.length; i++ )
			if (!vI_storageExtrasHelper.preferences.getBoolPref(storageExtras.extras[i].option))
				document.getElementById(storageExtras.extras[i].field + "Col").setAttribute("hidden", "true");
	},
	
	hideUnusedEditorFields : function() {
		var storageExtras = new vI_storageExtras();
		var hide = (document.getElementById("vI_storageExtras_hideUnusedEditorFields").getAttribute("checked") == "true")
		for( var i = 0; i < storageExtras.extras.length; i++ ) {
			document.getElementById("vI_" + storageExtras.extras[i].option).setAttribute("hidden",
				hide && !vI_storageExtrasHelper.preferences.getBoolPref(storageExtras.extras[i].option))
			document.getElementById("vI_" + storageExtras.extras[i].option + "_store").setAttribute("hidden",
				hide && !vI_storageExtrasHelper.preferences.getBoolPref(storageExtras.extras[i].option))
		}
		// resize the window to the content
		window.sizeToContent();
	}
}

function vI_storageExtras(callFunction, resource) {
	this.extras = [ 
		new vI_storageExtras_checkbox(
			"reciept", "storageExtras_returnReciept", "returnReceiptMenu", null, null),
		new vI_storageExtras_characterEncoding(),
		new vI_storageExtras_msgFormat(),
		new vI_storageExtras_sMime_messageEncryption(),
		new vI_storageExtras_checkbox(
			"sMimeSig", "storageExtras_sMime_messageSignature", "menu_securitySign1",
				(typeof(setSecuritySettings)=="function")?setSecuritySettings:null, 1),
		new vI_storageExtras_checkbox(
			"PGPEnc", "storageExtras_openPGP_messageEncryption", "enigmail_encrypted_send",
				(typeof(enigSetMenuSettings)=="function")?enigSetMenuSettings:null, ''),
		new vI_storageExtras_checkbox(
			"PGPSig", "storageExtras_openPGP_messageSignature", "enigmail_signed_send",
				(typeof(enigSetMenuSettings)=="function")?enigSetMenuSettings:null, ''),
		new vI_storageExtras_checkbox(
			"PGPMIME", "storageExtras_openPGP_PGPMIME", "enigmail_sendPGPMime",
				(typeof(enigSetMenuSettings)=="function")?enigSetMenuSettings:null, '')]
	if (callFunction) this.loopForRDF(callFunction, resource)
}

vI_storageExtras.prototype = {
	loopForRDF : function(callFunction, resource) {
		for( var i = 0; i < this.extras.length; i++ )
			// only if pref set and feature(element available) or for dataEditor
			if (!gMsgCompose || this.extras[i].active)
				this.extras[i].value = callFunction(resource, this.extras[i].field, this.extras[i].value)
	},
	equal : function(storageExtras) {
		for( var i = 0; i < this.extras.length; i++ ) {
			if (this.extras[i].active) vI_notificationBar.dump("## vI_storageExtras equal "+ this.extras[i].value + " : " + storageExtras.extras[i].value + "\n");
			if (this.extras[i].active &&
				(this.extras[i].value != storageExtras.extras[i].value)) {
					vI_notificationBar.dump("## vI_storageExtras not equal\n"); return false
			}
		}
		return true
	},
	status : function() {
		var returnVal = "";
		for( var i = 0; i < this.extras.length; i++ )
			if (this.extras[i].active && this.extras[i].value)
				returnVal += " " + this.extras[i].field + "='" + this.extras[i].value + "'";
		return returnVal
	},
	setValues : function() {
		for( var i = 0; i < this.extras.length; i++ ) {
			if (this.extras[i].active) this.extras[i].setValue()
			vI_notificationBar.dump("## vI_storageExtras setValue "+ this.extras[i].field + "=" + this.extras[i].value + "\n");
		}
	},
	readValues : function() {
		for( var i = 0; i < this.extras.length; i++ ) {
			if (this.extras[i].active) this.extras[i].readValue()
			vI_notificationBar.dump("## vI_storageExtras readValue "+ this.extras[i].field + "=" + this.extras[i].value + "\n");
		}
	},
	setEditorValues : function() {
		for( var i = 0; i < this.extras.length; i++ ) {
			this.extras[i].value = window.arguments[0][this.extras[i].field + "Col"]
			this.extras[i].setEditorValue();
			vI_notificationBar.dump("## vI_storageExtras setEditorValue "+ this.extras[i].field + "=" + this.extras[i].value + "\n");
		}
	},
	readEditorValues : function() {
		for( var i = 0; i < this.extras.length; i++ ) {
			this.extras[i].readEditorValue();
			vI_notificationBar.dump("## vI_storageExtras readValue " + this.extras[i].field + "=" + this.extras[i].value + "\n");
		}
	},
	addPrefs : function(pref) {
		for( var i = 0; i < this.extras.length; i++ )
			pref[this.extras[i].field + "Col"] = this.extras[i].value;
	},
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
	this.active = vI_storageExtrasHelper.preferences.getBoolPref(this.option)
}
vI_storageExtras_characterEncoding.prototype = {
	active : null,
	value : null,
	field : "charEnc",
	option : "storageExtras_characterEncoding",
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
		this.value = gMsgCompose.compFields.characterSet;
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
	this.active = vI_storageExtrasHelper.preferences.getBoolPref(this.option)
}
vI_storageExtras_msgFormat.prototype = {
	active : null,
	value : null,
	field : "msgFormat",
	option : "storageExtras_messageFormat",
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
	this.active = vI_storageExtrasHelper.preferences.getBoolPref(this.option)
}
vI_storageExtras_sMime_messageEncryption.prototype = {
	active : null,
	value : null,
	field : "sMimeEnc",
	option : "storageExtras_sMime_messageEncryption",
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

function vI_storageExtras_checkbox(field, option, composeDialogElementID, updateFunction, updateFunctionParam1) {
	this.field = field;
	this.option = option;
	this.composeDialogElementID = composeDialogElementID;
	this.updateFunction = updateFunction;
	this.updateFunctionParam1 = updateFunctionParam1;
	this.active = vI_storageExtrasHelper.preferences.getBoolPref(this.option) &&
		document.getElementById(this.composeDialogElementID);
}
vI_storageExtras_checkbox.prototype = {
	active : null,
	value : null,
	field : null,
	option : null,
	composeDialogElementID : null,
	updateFunction : null, // some elements have to be updated before the can be read
	updateFunctionParam1 : null,
	
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
		if (this.updateFunction) this.updateFunction(this.updateFunctionParam1);
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