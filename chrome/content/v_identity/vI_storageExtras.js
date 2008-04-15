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

//~ vI_storageExtras = new __vI_storageExtras();

function vI_storageExtras(callFunction, resource) {
	this.extras = [ new vI_storageExtras_returnReciept, new vI_storageExtras_characterEncoding ]
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
		for( var i = 0; i < this.extras.length; i++ )
			this.extras[i].setEditorValue();
	},
	readEditorValues : function() {
		for( var i = 0; i < this.extras.length; i++ )
			this.extras[i].readEditorValue();
	},
}

function vI_storageExtras_returnReciept() { }
vI_storageExtras_returnReciept.prototype = {
	value : null,
	field : "reciept",
	option : "storageExtras_returnReciept",
	// function to set or read the value from/to the MessageCompose Dialog
	setValue : function() {
		document.getElementById("returnReceiptMenu").setAttribute("checked", this.value)
	},
	readValue : function() {
		this.value = document.getElementById("returnReceiptMenu").getAttribute("checked");
	},
	// function to set or read the value from the rdfDataEditor
	setEditorValue : function() {
		alert("setEditorValue");
	},
	readEditorValue : function() {
		alert("readEditorValue");
	}
}

function vI_storageExtras_characterEncoding() { }
vI_storageExtras_characterEncoding.prototype = {
	value : null,
	field : "charEnc",
	option : "storageExtras_characterEncoding",
	// function to set the value in the MessageCompose Dialog
	setValue : function() {
		alert("setValue")
	},
	// function to store the selection of MessageCompose Dialog into value
	readValue : function() {
		alert("readValue Charset (not implemented)")
	},
	setEditorValue : function() {
		alert("setEditorValue");
	},
	readEditorValue : function() {
		alert("readEditorValue");
	}
}
