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

var vI_prefDialog = {
	preferences : Components.classes["@mozilla.org/preferences-service;1"]
				.getService(Components.interfaces.nsIPrefService)
				.getBranch("extensions.virtualIdentity."),
				
	unicodeConverter : Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
				.createInstance(Components.interfaces.nsIScriptableUnicodeConverter),
	
	base : {
		_elementIDs : [	"VIdent_identity.doFcc",
				"VIdent_identity.fccFolderPickerMode",
				"VIdent_identity.fccFolder",
				"VIdent_identity.fccReplyFollowsParent",
				"VIdent_identity.draftFolderPickerMode",
				"VIdent_identity.draftFolder",
				"VIdent_identity.stationeryFolderPickerMode",
				"VIdent_identity.stationeryFolder",
				"VIdent_identity.copySMIMESettings",
				"VIdent_identity.copyAttachVCardSettings",
				"VIdent_identity.smart_reply",
				"VIdent_identity.smart_detectByReceivedHeader",
				"VIdent_identity.smart_reply_for_newsgroups",
				"VIdent_identity.show_smtp",
				"VIdent_identity.show_noFcc",
				"VIdent_identity.menu_entry",
				"VIdent_identity.smart_reply_headers",
				"VIdent_identity.smart_reply_filter",
				"VIdent_identity.smart_draft",
				"VIdent_identity.smart_reply_notification",
				"VIdent_identity.get_header_notification",
				"VIdent_identity.smart_reply_defaultFullName",
				"VIdent_identity.smart_reply_ignoreFullName",
				"VIdent_identity.autoTimestamp",
				"VIdent_identity.notification_timeout",
				"VIdent_identity.debug_notification",
				"VIdent_identity.warn_nonvirtual",
				"VIdent_identity.warn_virtual",
				"VIdent_identity.hide_signature",
				"VIdent_identity.storage",
				"VIdent_identity.storage_storedefault",
				"VIdent_identity.storage_store_base_id",
				"VIdent_identity.storage_dont_update_multiple",
				"VIdent_identity.storage_show_switch",
				"VIdent_identity.storage_warn_update",
				"VIdent_identity.storage_warn_vI_replace",
				"VIdent_identity.storage_notification",
				"VIdent_identity.storage_getOneOnly",
				"VIdent_identity.storageExtras_returnReciept",
				"VIdent_identity.storageExtras_characterEncoding",
				"VIdent_identity.storageExtras_messageFormat",
				"VIdent_identity.storageExtras_sMime_messageEncryption",
				"VIdent_identity.storageExtras_sMime_messageSignature",
				"VIdent_identity.storageExtras_openPGP_messageEncryption",
				"VIdent_identity.storageExtras_openPGP_messageSignature",
				"VIdent_identity.storageExtras_openPGP_PGPMIME",
				"VIdent_identity.idSelection_storage_prefer_smart_reply",
				"VIdent_identity.idSelection_storage_ignore_smart_reply",
				"VIdent_identity.idSelection_ask",
				"VIdent_identity.idSelection_ask_always",
				"VIdent_identity.idSelection_autocreate",
				"VIdent_identity.autoReplyToSelf"],
	
		init : function() {
		// initialize the default window values...
			for( var i = 0; i < vI_prefDialog.base._elementIDs.length; i++ ) {
				var elementID = vI_prefDialog.base._elementIDs[i];
				var element = document.getElementById(elementID);
				if (!element) break;
				var eltType = element.localName;
				try {
				if (eltType == "radiogroup")
					element.selectedItem = element.childNodes[
						vI_prefDialog.preferences.getIntPref(element.getAttribute("prefstring"))];
				else if (eltType == "checkbox")
					element.checked = 
						vI_prefDialog.preferences.getBoolPref(element.getAttribute("prefstring"));
				else if (eltType == "textbox")
					if (element.getAttribute("preftype") == "int")
						element.setAttribute("value", 
						vI_prefDialog.preferences.getIntPref(element.getAttribute("prefstring")) );
					else element.setAttribute("value", 
						vI_prefDialog.unicodeConverter.ConvertToUnicode(vI_prefDialog.preferences.getCharPref(element.getAttribute("prefstring"))) );
				} catch (ex) {}
			}
		},
		
		savePrefs : function() {
			for( var i = 0; i < vI_prefDialog.base._elementIDs.length; i++ ) {
				var elementID = vI_prefDialog.base._elementIDs[i];
				var element = document.getElementById(elementID);
				if (!element) break;
				var eltType = element.localName;
				if (eltType == "radiogroup")
					vI_prefDialog.preferences.setIntPref(
						element.getAttribute("prefstring"), parseInt(element.value));
				else if (eltType == "checkbox")
					vI_prefDialog.preferences.setBoolPref(
						element.getAttribute("prefstring"), element.checked);
				else if (eltType == "textbox") {
					if (element.getAttribute("preftype") == "int")
						vI_prefDialog.preferences.setIntPref(
							element.getAttribute("prefstring"), element.value);
					else vI_prefDialog.preferences.setCharPref(
							element.getAttribute("prefstring"), vI_prefDialog.unicodeConverter.ConvertFromUnicode(element.value));
					//~ alert(elementID + " " + element.getAttribute("prefstring") + " " + parseInt(element.value))
				}
			}
		},
		
		idSelectionConstraint : function() {
			var storage = document.getElementById("VIdent_identity.storage").checked;
			var smartDraft = document.getElementById("VIdent_identity.smart_draft").checked;
			var smartReply = document.getElementById("VIdent_identity.smart_reply").checked;
			vI_prefDialog.base.idSelectionConstraint1(storage && smartReply);
			vI_prefDialog.base.idSelectionConstraint2(storage || smartReply || smartDraft);
			if (storage || smartReply || smartDraft) vI_prefDialog.base.idSelectionResultConstraint()
		},

		idSelectionConstraint1 : function(checked) {
			var elementIDs = [
				"VIdent_identity.idSelection_storage_prefer_smart_reply",
				"VIdent_identity.idSelection_storage_ignore_smart_reply",
				"idSelection1"];
			for( var i = 0; i < elementIDs.length; i++ ) {
				if (checked)
					document.getElementById(elementIDs[i])
						.removeAttribute("disabled");
				else
					document.getElementById(elementIDs[i])
						.setAttribute("disabled", "true");
			}
		},

		idSelectionConstraint2 : function(checked) {
			var elementIDs = [
				"VIdent_identity.idSelection_ask",
				"VIdent_identity.idSelection_ask_always",
				"VIdent_identity.idSelection_autocreate",
				"VIdent_identity.idSelection_autocreate.desc",
				"idSelection", "idSelection2"];
			for( var i = 0; i < elementIDs.length; i++ ) {
				if (checked)
					document.getElementById(elementIDs[i])
						.removeAttribute("disabled");
				else
					document.getElementById(elementIDs[i])
						.setAttribute("disabled", "true");
			}
		},

		smartReplyConstraint : function(element) {
			var elementIDs = [
				"VIdent_identity.smart_reply_for_newsgroups",
				"VIdent_identity.smart_reply_headers",
				"VIdent_identity.smart_reply_filter",
				"VIdent_identity.smart_reply_defaultFullName",
				"VIdent_identity.smart_reply_ignoreFullName",
				"VIdent_identity.smart_reply_headers_reset",
				"smartReplyTab", "smartReplyTab1", "smartReplyTab2"];
			for( var i = 0; i < elementIDs.length; i++ ) {
				if (element.checked)
					document.getElementById(elementIDs[i])
						.removeAttribute("disabled");
				else
					document.getElementById(elementIDs[i])
						.setAttribute("disabled", "true");
			}
			vI_prefDialog.base.idSelectionConstraint();
		},
		
		idSelectionResultConstraint : function() {
			var ask = document.getElementById("VIdent_identity.idSelection_ask")
			var ask_always = document.getElementById("VIdent_identity.idSelection_ask_always")
			var autocreate = document.getElementById("VIdent_identity.idSelection_autocreate")
			var autocreate_desc = document.getElementById("VIdent_identity.idSelection_autocreate.desc")
			ask_always.setAttribute("disabled", (autocreate.checked || !ask.checked))
			autocreate.setAttribute("disabled", (ask.checked && ask_always.checked))
			autocreate_desc.setAttribute("disabled", (ask.checked && ask_always.checked))
			autocreate_desc.setAttribute("hidden", !ask.checked)
		},
		
		smartReplyHeaderReset : function() {
			var textfield = document.getElementById("VIdent_identity.smart_reply_headers")
			textfield.value = "envelope-to\nx-original-to\nto\ncc"
		},
		
		smartReplyHideSignature : function() {
			// seamonkey has no extension-manager
			if (("nsIExtensionManager" in Components.interfaces) && ("@mozilla.org/extensions/manager;1" in Components.classes)) {
				var switch_signature_ID="{2ab1b709-ba03-4361-abf9-c50b964ff75d}"
				var em = Components.classes["@mozilla.org/extensions/manager;1"]
					.getService(Components.interfaces.nsIExtensionManager);
				var rdfS = Components.classes["@mozilla.org/rdf/rdf-service;1"].getService(Components.interfaces.nsIRDFService);
				var source=rdfS.GetResource("urn:mozilla:item:"+switch_signature_ID)
				
				var item = em.getItemForID(switch_signature_ID)
				if (!item || !item.installLocationKey) return;

				var disabledResource = rdfS.GetResource("http://www.mozilla.org/2004/em-rdf#disabled");
				var isDisabledResource = rdfS.GetResource("http://www.mozilla.org/2004/em-rdf#isDisabled");
				var disabled = em.datasource.GetTarget(source, disabledResource, true);
				if (!disabled) disabled = em.datasource.GetTarget(source, isDisabledResource, true);
				try {
					disabled=disabled.QueryInterface(Components.interfaces.nsIRDFLiteral);
					if (disabled.Value=="true") return;
				} catch (e) { }
				
				document.getElementById("VIdent_identity.HideSignature.warning").setAttribute("hidden", "true");
				document.getElementById("VIdent_identity.hide_signature").setAttribute("disabled", "false");
			}
		},
		
		storageConstraint : function(element) {
			var elementIDs = [
				"VIdent_identity.storage_storedefault",
				"VIdent_identity.storage_store_base_id",
				"VIdent_identity.storage_dont_update_multiple",
				"VIdent_identity.storage_show_switch",
				"VIdent_identity.storage_warn_update",
				"VIdent_identity.storage_warn_vI_replace",
				"VIdent_identity.storage_notification",
				"VIdent_identity.storage_getOneOnly",
				"VIdent_identity.storageExtras_returnReciept",
				"VIdent_identity.storageExtras_characterEncoding",
				"VIdent_identity.storageExtras_messageFormat",
				"VIdent_identity.storageExtras_sMime_messageEncryption",
				"VIdent_identity.storageExtras_sMime_messageSignature",
				"VIdent_identity.storageExtras_openPGP_messageEncryption",
				"VIdent_identity.storageExtras_openPGP_messageSignature",
				"VIdent_identity.storageExtras_openPGP_PGPMIME",
				"storageTab", "storageTab1", "storageTab2"];
			for( var i = 0; i < elementIDs.length; i++ ) {
				if (element.checked)
					document.getElementById(elementIDs[i])
						.removeAttribute("disabled");
				else
					document.getElementById(elementIDs[i])
						.setAttribute("disabled", "true");
			}
			vI_prefDialog.base.idSelectionConstraint();
		}
	},

	init : function() {
		vI_prefDialog.unicodeConverter.charset="UTF-8";
		vI_prefDialog.base.init();
		onInitCopiesAndFolders()

		if (vI_helper.olderVersion("TB", "2.0b") || vI_helper.olderVersion("SM", "1.5a")) {
			document.getElementById("version-warning").setAttribute("hidden", "false");
			document.getElementById("VIdent_identity.smart_draft").setAttribute("disabled", "true");
			document.getElementById("VIdent_messageDraftsTab").setAttribute("hidden", "true");
			document.getElementById("VIdent_messageTemplatesTab").setAttribute("hidden", "true");
		}
		if (vI_helper.olderVersion("TB", "1.5.0.7")) {
			document.getElementById("notificationGroupBox").setAttribute("hidden", "true");	
		}
		if (vI_helper.olderVersion("TB", "2.0")) {
			document.getElementById("fccReplyFollowsParentBox").setAttribute("hidden", "true");
		}
// 		if (!(typeof(enigSetMenuSettings)=="function")) {
// 			document.getElementById("openPGPencryption").setAttribute("hidden", "true");
// 		}

		vI_prefDialog.base.smartReplyConstraint(document.getElementById("VIdent_identity.smart_reply"));
		vI_prefDialog.base.smartReplyHideSignature();
		vI_prefDialog.base.storageConstraint(document.getElementById("VIdent_identity.storage"));
		vI_prefDialog.base.idSelectionConstraint();
		if (vI_storageExtrasHelper.seamonkey_to_old())
			document.getElementById("storageTab2").setAttribute("hidden", "true")
	},
	
	savePrefs : function() {
		// Copy all changes to Elements
		onSaveCopiesAndFolders()
		vI_prefDialog.base.savePrefs();
	},

        openURL : function(aURL) {
            var uri = Components.classes["@mozilla.org/network/standard-url;1"].createInstance(Components.interfaces.nsIURI);
            var protocolSvc = Components.classes["@mozilla.org/uriloader/external-protocol-service;1"].getService(Components.interfaces.nsIExternalProtocolService);

            uri.spec = aURL;
            protocolSvc.loadUrl(uri);
        }
}
