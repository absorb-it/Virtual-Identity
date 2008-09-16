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

    Contributor(s): Thunderbird Developers
 * ***** END LICENSE BLOCK ***** */

var vI_htmlTextBox = {
	Obj_TextBox : null,
	string : null,
	cssSource : null,
	objectID : null,
	
	init : function(objectID, stringName, outputString, cssSource) {
		vI_htmlTextBox.objectID = objectID;
		if (stringName)
			vI_htmlTextBox.string = document.getElementById("vITextBoxBundle").getString(stringName);
		else if (outputString)
			vI_htmlTextBox.string = outputString;
		vI_htmlTextBox.cssSource = cssSource;
		window.setTimeout(vI_htmlTextBox.__init, 200)
	},

	// read the chrome file (copied from http://forums.mozillazine.org/viewtopic.php?p=921150)
	__getContents : function (aURL){
		var ioService=Components.classes["@mozilla.org/network/io-service;1"]
			.getService(Components.interfaces.nsIIOService);
		var scriptableStream=Components
			.classes["@mozilla.org/scriptableinputstream;1"]
			.getService(Components.interfaces.nsIScriptableInputStream);
		
		var channel=ioService.newChannel(aURL,null,null);
		var input=channel.open();
		scriptableStream.init(input);
		var str=scriptableStream.read(input.available());
		scriptableStream.close();
		input.close();
		return str;
	},

	__setCSS : function () {
		var head = vI_htmlTextBox.Obj_TextBox.contentDocument.getElementsByTagName("HEAD").item(0);
		var range = document.createRange();
		range.selectNode(head);
		var css_text = vI_htmlTextBox.__getContents("chrome://v_identity/skin/" + vI_htmlTextBox.cssSource);
		var documentFragment = range.createContextualFragment("<style type='text/css'>" + css_text + "</style>");
		head.appendChild(documentFragment);
	},
	
	__init : function () {
		vI_htmlTextBox.Obj_TextBox = document.getElementById(vI_htmlTextBox.objectID);
		vI_htmlTextBox.Obj_TextBox.contentDocument
			.lastChild.setAttribute("style", "background-color: -moz-dialog; font: -moz-dialog;");

		if (vI_htmlTextBox.cssSource) vI_htmlTextBox.__setCSS();

		vI_htmlTextBox.__echo(vI_htmlTextBox.string);
	},
	
	__echo : function (text) {
		var text_list = text.split(/\n/)
		for (var i = 0; i < text_list.length; i++) {
			if (vI_htmlTextBox.__isHR(text_list[i])) continue;
			var text_item = vI_htmlTextBox.__checkList(text_list[i]);
			vI_htmlTextBox.__add(text_item);
			if (!vI_htmlTextBox.currentList) {
				var new_br = vI_htmlTextBox.Obj_TextBox.contentDocument
					.createElementNS("http://www.w3.org/1999/xhtml", 'html:br');
				vI_htmlTextBox.Obj_TextBox.contentDocument.body.appendChild(new_br);
			}
		}
	},
	
	__isHR : function(text) {
		if (text == "---") {
			var new_hr = vI_htmlTextBox.Obj_TextBox.contentDocument
				.createElementNS("http://www.w3.org/1999/xhtml", 'html:hr');
			vI_htmlTextBox.Obj_TextBox.contentDocument.body.appendChild(new_hr);
			return true;
		}
		return false;
	},
	
	currentList : null,
	currentBaseNode : null,
	__checkList : function (text) {
		if (text.match(/^\*\s/)) {
			if (!vI_htmlTextBox.currentList) {
				vI_htmlTextBox.currentList = vI_htmlTextBox.Obj_TextBox.contentDocument
					.createElementNS("http://www.w3.org/1999/xhtml", 'html:ul');
				vI_htmlTextBox.Obj_TextBox.contentDocument.body.appendChild(vI_htmlTextBox.currentList);
			}
			vI_htmlTextBox.currentBaseNode = vI_htmlTextBox.Obj_TextBox.contentDocument
								.createElementNS("http://www.w3.org/1999/xhtml", 'html:li');
			vI_htmlTextBox.currentList.appendChild(vI_htmlTextBox.currentBaseNode);
		}
		else {
			vI_htmlTextBox.currentList = null;
			vI_htmlTextBox.currentBaseNode = vI_htmlTextBox.Obj_TextBox.contentDocument.body;
		}
		return text.replace(/^\*\s/,"")
	},
	
	__add : function (text) {
		if (text.match(/http[s]?:\/\/\S+/)) {
			if (RegExp.leftContext) vI_htmlTextBox.__addText(RegExp.leftContext)
			if (RegExp.lastMatch) vI_htmlTextBox.__addLink(RegExp.lastMatch)
			if (RegExp.rightContext) vI_htmlTextBox.__add(RegExp.rightContext)
		}
		else vI_htmlTextBox.__addText(text)
	},
	
	__addText : function (text) {
		var range = document.createRange();
		range.selectNode(vI_htmlTextBox.currentBaseNode);
		var documentFragment = range.createContextualFragment(text);
		vI_htmlTextBox.currentBaseNode.appendChild(documentFragment);
	},
	
	__addLink : function (text) {
		var new_a = vI_htmlTextBox.Obj_TextBox.contentDocument
			.createElementNS("http://www.w3.org/1999/xhtml", 'html:a');
		new_a.setAttribute("href", text)
		new_a.setAttribute("style", "text-decoration: underline")
		vI_htmlTextBox.currentBaseNode.appendChild(new_a);
		var new_text = vI_htmlTextBox.Obj_TextBox.contentDocument.createTextNode(text);
		new_a.appendChild(new_text);
	}
}
