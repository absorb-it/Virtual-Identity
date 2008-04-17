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
		for( var i = 0; i < storageExtras.extras.length; i++ )
			document.getElementById("vI_" + storageExtras.extras[i].option).setAttribute("hidden",
				hide && !vI_storageExtrasHelper.preferences.getBoolPref(storageExtras.extras[i].option))
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
			this.extras[i].value = callFunction(resource, this.extras[i].field, this.extras[i].value)
	},
	equal : function(storageExtras) {
		for( var i = 0; i < this.extras.length; i++ )
			if (vI.preferences.getBoolPref(this.extras[i].option) &&
				this.extras[i].value != storageExtras.extras[i].value) return false
		return true
	},
	status : function() {
		var returnVal = "";
		for( var i = 0; i < this.extras.length; i++ )
			if (vI.preferences.getBoolPref(this.extras[i].option))
				returnVal += " " + this.extras[i].field + "='" + this.extras[i].value + "'";
		return returnVal
	},
	setValues : function() {
		for( var i = 0; i < this.extras.length; i++ )
			if (vI.preferences.getBoolPref(this.extras[i].option)) this.extras[i].setValue()
	},
	readValues : function() {
		for( var i = 0; i < this.extras.length; i++ )
			if (vI.preferences.getBoolPref(this.extras[i].option)) this.extras[i].readValue()
	},
	setEditorValues : function() {
		for( var i = 0; i < this.extras.length; i++ ) {
			this.extras[i].value = window.arguments[0][this.extras[i].field + "Col"]
			this.extras[i].setEditorValue();
		}
	},
	readEditorValues : function() {
		for( var i = 0; i < this.extras.length; i++ )
			this.extras[i].readEditorValue();
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
function vI_storageExtras_characterEncoding() { }
vI_storageExtras_characterEncoding.prototype = {
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
		vI_notificationBar.dump("## vI_storageExtras_characterEncoding setValue " + this.value + "\n");
	},
	readValue : function() {
		this.value = gMsgCompose.compFields.characterSet;
		if (gCharsetConvertManager) {
			var charsetAlias = gCharsetConvertManager.getCharsetAlias(this.value);
			if (charsetAlias == "us-ascii") this.value = "ISO-8859-1";   // no menu item for "us-ascii"
		}
		vI_notificationBar.dump("## vI_storageExtras_characterEncoding readValue " + this.value + "\n");
	},
	// function to set or read the value from the rdfDataEditor
	setEditorValue : function() {
		CreateMenu('mailedit');
		document.getElementById("maileditCharsetMenu").selectedItem = document.getElementById(this.value);
		vI_notificationBar.dump("## vI_storageExtras_characterEncoding setEditorValue " + this.value + "\n");
	},
	readEditorValue : function() {
		this.value = document.getElementById("maileditCharsetMenu").selectedItem.id
		vI_notificationBar.dump("## vI_storageExtras_characterEncoding readEditorValue " + this.value + "\n");
	}
}

function vI_storageExtras_msgFormat() { }
vI_storageExtras_msgFormat.prototype = {
	value : null,
	field : "msgFormat",
	option : "storageExtras_messageFormat",
	// function to set or read the value from/to the MessageCompose Dialog
	setValue : function() {
		if (!this.value) return;
		vI_notificationBar.dump("## vI_storageExtras_msgFormat setValue " + this.value + "\n");
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
		vI_notificationBar.dump("## vI_storageExtras_msgFormat readValue " + this.value + "\n");
	},
	// function to set or read the value from the rdfDataEditor
	setEditorValue : function() {
		//~ document.getElementById(this.value).setAttribute("checked","true");
		document.getElementById("outputFormatMenu").selectedItem = document.getElementById(this.value);
		vI_notificationBar.dump("## vI_storageExtras_characterEncoding setEditorValue " + this.value + "\n");
	},
	readEditorValue : function() {
		this.value = document.getElementById("outputFormatMenu").selectedItem.id
		vI_notificationBar.dump("## vI_storageExtras_characterEncoding readEditorValue " + this.value + "\n");
	}
}

function vI_storageExtras_sMime_messageEncryption() { }
vI_storageExtras_sMime_messageEncryption.prototype = {
	value : null,
	field : "sMimeEnc",
	option : "storageExtras_sMime_messageEncryption",
	// function to set or read the value from/to the MessageCompose Dialog
	setValue : function() {
		vI_notificationBar.dump("## vI_storageExtras_sMime_messageEncryption setValue " + this.value + "\n");
		if (this.value == "true") var element = document.getElementById("menu_securityEncryptRequire1")
		else var element = document.getElementById("menu_securityNoEncryption1")
		element.setAttribute("checked", "true");
		element.doCommand();
	},
	readValue : function() {
		setSecuritySettings(1)
		this.value = (document.getElementById("menu_securityEncryptRequire1").getAttribute("checked") == "true")?"true":"false"
		vI_notificationBar.dump("## vI_storageExtras_sMime_messageEncryption readValue " + this.value + "\n");
	},
	// function to set or read the value from the rdfDataEditor
	setEditorValue : function() { 
		document.getElementById("vI_" + this.option).setAttribute("checked", this.value) },
	readEditorValue : function() {
		var elementValue = document.getElementById("vI_" + this.option).getAttribute("checked");
		this.value = (elementValue == "true")?"true":"false"
	}
}

function vI_storageExtras_checkbox(field, option, composeDialogElementID, updateFunction, updateFunctionParam1) {
	this.field = field;
	this.option = option;
	this.composeDialogElementID = composeDialogElementID;
	this.updateFunction = updateFunction;
	this.updateFunctionParam1 = updateFunctionParam1;
}
vI_storageExtras_checkbox.prototype = {
	value : null,
	field : null,
	option : null,
	composeDialogElementID : null,
	updateFunction : null, // some elements have to be updated before the can be read
	updateFunctionParam1 : null,
	
	// function to set or read the value from/to the MessageCompose Dialog
	setValue : function() {
		if (!this.value) return;
		var element = document.getElementById(this.composeDialogElementID);
		var elementValue =  element.getAttribute("checked");
		if ((elementValue == "true") != (this.value == "true")) {
			vI_notificationBar.dump("## vI_storageExtras_checkbox setValue " + this.composeDialogElementID + "=" +
				this.value + " (was: " + elementValue + ").\n");
			if (this.value == "true") element.setAttribute("checked","true");
			else element.removeAttribute("checked");
			element.doCommand();
		}
	},
	readValue : function() {
		if (this.updateFunction) this.updateFunction(this.updateFunctionParam1);
		var elementValue =  document.getElementById(this.composeDialogElementID).getAttribute("checked");
		this.value = ((elementValue=="true")?"true":"false")
		vI_notificationBar.dump("## vI_storageExtras_checkbox readValue " + this.composeDialogElementID + "=" +
			this.value + "\n");

	},
	// function to set or read the value from the rdfDataEditor
	setEditorValue : function() { 
		document.getElementById("vI_" + this.option).setAttribute("checked", this.value) },
	readEditorValue : function() {
		var elementValue = document.getElementById("vI_" + this.option).getAttribute("checked");
		this.value = (elementValue == "true")?"true":"false"
	}
}