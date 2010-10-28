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
	toggleHelp : function() {
		var browserElem = document.getElementById("vI_remoteBrowserBox");
		if (browserElem.getAttribute("hidden")) {
			window.resizeBy( 200, 0);
			browserElem.removeAttribute("hidden");
		} else {
			window.resizeBy( -(browserElem.clientWidth+7), 0);
			browserElem.setAttribute("hidden", "true");
		}
		vI_prefDialog.updateHelpUrl();
	},

	updateHelpUrl : function(tabpanel) {
		var browserElem = document.getElementById("vI_remoteBrowserBox");
		if (browserElem.getAttribute("hidden")) return;				// don't load any url if browser is hidden
		var panelIndex = (tabpanel)?tabpanel:document.getElementById('prefTabbox').selectedIndex
		var prefTree = document.getElementById('prefTabbox').selectedPanel.getElementsByAttribute("class", "vIprefTree")[0];
		var currentVersion = document.getElementById("extVersion").getAttribute("value").split(/\./);
		var extVersion = currentVersion[0] + "." + currentVersion[1];
		var url = "https://www.absorb.it/virtual-id/wiki/docs/" + extVersion + "/tab" + panelIndex + "/tree" + prefTree.currentIndex;
		document.getElementById("vI_remoteBrowserBox").url = url;
	},

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
				"VIdent_identity.fcc_show_switch",
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
				"VIdent_identity.hide_sMime_messageSignature",
				"VIdent_identity.hide_openPGP_messageSignature",
				"VIdent_identity.storage",
				"VIdent_identity.storage_storedefault",
				"VIdent_identity.storage_store_base_id",
				"VIdent_identity.storage_store_SMTP",
				"VIdent_identity.storage_dont_update_multiple",
				"VIdent_identity.storage_show_switch",
				"VIdent_identity.storage_show_baseID_switch",
				"VIdent_identity.storage_show_SMTP_switch",
				"VIdent_identity.storage_colorIndication",
				"VIdent_identity.storage_warn_update",
				"VIdent_identity.storage_warn_vI_replace",
				"VIdent_identity.storage_notification",
				"VIdent_identity.storage_getOneOnly",
				"VIdent_identity.storageExtras_returnReciept",
				"VIdent_identity.storageExtras_fcc",
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
				"VIdent_identity.idSelection_preferExisting",
                "VIdent_identity.idSelection_ignoreIDs",
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
                        else
                            element.setAttribute("value", 
                            vI_prefDialog.unicodeConverter.ConvertToUnicode(vI_prefDialog.preferences.getCharPref(element.getAttribute("prefstring"))) );
                    else if (eltType == "listbox")
                        element.value =
                            vI_prefDialog.preferences.getCharPref(element.getAttribute("prefstring"));
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
				}
                else if (eltType == "listbox")
                    vI_prefDialog.preferences.setCharPref(element.getAttribute("prefstring"), element.value);
			}
		},
		
		modifyAttribute : function(elemID, attribute, value) {
			if (value) document.getElementById(elemID).removeAttribute(attribute);
			else document.getElementById(elemID).setAttribute(attribute, "true");
		},

		constraints : function() {
			var storage = document.getElementById("VIdent_identity.storage").checked;
			var smartDraft = document.getElementById("VIdent_identity.smart_draft").checked;
			var smartReply = document.getElementById("VIdent_identity.smart_reply").checked;
			var mAttr = vI_prefDialog.base.modifyAttribute;

			// idSelectionConstraint
			var idSelectionConstraint = (storage || smartReply || smartDraft);
			mAttr("VIdent_identity.idSelection_ask","disabled",idSelectionConstraint);
			mAttr("VIdent_identity.idSelection_ask_always","disabled",idSelectionConstraint);
			mAttr("VIdent_identity.idSelection_autocreate","disabled",idSelectionConstraint);
			mAttr("VIdent_identity.idSelection_autocreate.desc","disabled",idSelectionConstraint);
			mAttr("VIdent_identity.idSelection_preferExisting","disabled",idSelectionConstraint);
			mAttr("selection","featureDisabled",idSelectionConstraint);
			mAttr("toCompose","featureDisabled",idSelectionConstraint);

			// idSelectionInputConstraint
			var idSelectionInputConstraint = (storage && smartReply);
			mAttr("VIdent_identity.idSelection_storage_prefer_smart_reply","disabled",idSelectionInputConstraint);
			mAttr("VIdent_identity.idSelection_storage_ignore_smart_reply","disabled",idSelectionInputConstraint);
			if (idSelectionInputConstraint) vI_prefDialog.base.idSelectionResultConstraint();

			// sourceEmailConstraint
			var sourceEmailConstraint = (smartReply || smartDraft);
			mAttr("sourceEmail","featureDisabled",sourceEmailConstraint);
			mAttr("toSelection","featureDisabled",sourceEmailConstraint);

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

		smartReplyConstraint : function(element) {
			var mAttr = vI_prefDialog.base.modifyAttribute;
			mAttr("VIdent_identity.smart_reply_for_newsgroups","disabled",element.checked);
			mAttr("VIdent_identity.smart_reply_headers","disabled",element.checked);
			mAttr("VIdent_identity.smart_reply_filter","disabled",element.checked);
			mAttr("VIdent_identity.smart_reply_defaultFullName","disabled",element.checked);
			mAttr("VIdent_identity.smart_reply_ignoreFullName","disabled",element.checked);
			mAttr("VIdent_identity.smart_reply_headers_reset","disabled",element.checked);
			mAttr("VIdent_identity.smart_detectByReceivedHeader","disabled",element.checked);
			vI_prefDialog.base.constraints();
		},
		
		smartReplyHeaderReset : function() {
			var textfield = document.getElementById("VIdent_identity.smart_reply_headers")
			textfield.value = "envelope-to\nx-original-to\nto\ncc"
		},
		
		smartReplyHideSignature : function() {
			const switch_signature_ID="{2ab1b709-ba03-4361-abf9-c50b964ff75d}"
			if (vI_helper.extensionActive(switch_signature_ID)) {
				document.getElementById("VIdent_identity.HideSignature.warning").setAttribute("hidden", "true");
				document.getElementById("VIdent_identity.hide_signature").setAttribute("disabled", "false");
			}
		},
		
		storageConstraint : function(element) {
			var mAttr = vI_prefDialog.base.modifyAttribute;
			mAttr("VIdent_identity.storage_storedefault","disabled",element.checked);
			mAttr("VIdent_identity.storage_store_base_id","disabled",element.checked);
			mAttr("VIdent_identity.storage_store_SMTP","disabled",element.checked);
			mAttr("VIdent_identity.storage_dont_update_multiple","disabled",element.checked);
			mAttr("VIdent_identity.storage_show_switch","disabled",element.checked);
			mAttr("VIdent_identity.storage_show_baseID_switch","disabled",element.checked);
			mAttr("VIdent_identity.storage_show_SMTP_switch","disabled",element.checked);
			mAttr("VIdent_identity.storage_colorIndication","disabled",element.checked);
			mAttr("VIdent_identity.storage_warn_update","disabled",element.checked);
			mAttr("VIdent_identity.storage_warn_vI_replace","disabled",element.checked);
			mAttr("VIdent_identity.storage_notification","disabled",element.checked);
			mAttr("VIdent_identity.storage_getOneOnly","disabled",element.checked);
			mAttr("VIdent_identity.storageExtras_returnReciept","disabled",element.checked);
			mAttr("VIdent_identity.storageExtras_fcc","disabled",element.checked);
			mAttr("VIdent_identity.storageExtras_characterEncoding","disabled",element.checked);
			mAttr("VIdent_identity.storageExtras_messageFormat","disabled",element.checked);
			mAttr("VIdent_identity.storageExtras_sMime_messageEncryption","disabled",element.checked);
			mAttr("VIdent_identity.storageExtras_sMime_messageSignature","disabled",element.checked);
			mAttr("VIdent_identity.storageExtras_openPGP_messageEncryption","disabled",element.checked);
			mAttr("VIdent_identity.storageExtras_openPGP_messageSignature","disabled",element.checked);
			mAttr("VIdent_identity.storageExtras_openPGP_PGPMIME","disabled",element.checked);
			mAttr("storageOut","featureDisabled",element.checked);
			mAttr("storageUp","featureDisabled",element.checked);
			mAttr("storageUpDown","featureDisabled",element.checked);
			vI_prefDialog.base.constraints();
		},

		menuButtonConstraints : function(elem) {
			var mAttr = vI_prefDialog.base.modifyAttribute;
			var valueParam = (document.getElementById("viewGroup").getAttribute("hidden") == "true");	// true -> removeAttribute
			var dialogElem = document.getElementById("vI_prefDialog");
			mAttr("logoButton2","hidden", valueParam);
			mAttr("toggleIcon","open", valueParam);
			document.getAnonymousElementByAttribute(dialogElem, "class", "box-inherit dialog-content-box").removeAttribute("flex");
		},

		flipMenuButtons : function(elem) {
			var mAttr = vI_prefDialog.base.modifyAttribute;
			var valueParam = (elem.getAttribute("open") == "true");
			var dialogElem = document.getElementById("vI_prefDialog");
			var oldContentElemHeight = document.getAnonymousElementByAttribute(dialogElem, "class", "box-inherit dialog-content-box").clientHeight;
			mAttr("viewGroup","hidden", !valueParam);
			mAttr("logoButton2","hidden", valueParam);
			mAttr(elem.id,"open", valueParam);
			window.resizeBy( 0, document.getAnonymousElementByAttribute(dialogElem, "class", "box-inherit dialog-content-box").clientHeight - oldContentElemHeight);
		},
		
		initTreeValues : function() {
			var prefTrees = document.getElementById("prefTabbox").getElementsByAttribute("class", "vIprefTree");
			for (var i=0 ; i<prefTrees.length; i++) prefTrees[i].currentIndex = 0;
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
		const enigmail_ID="{847b3a00-7ab1-11d4-8f02-006008948af5}"
		if (!vI_helper.extensionActive(enigmail_ID)) {
			document.getElementById("openPGPencryption").setAttribute("hidden", "true");
			document.getElementById("VIdent_identity.hide_openPGP_messageSignature").setAttribute("hidden", "true");
		}
		
		vI_prefDialog.base.smartReplyConstraint(document.getElementById("VIdent_identity.smart_reply"));
		vI_prefDialog.base.smartReplyHideSignature();
		vI_prefDialog.base.storageConstraint(document.getElementById("VIdent_identity.storage"));
		vI_prefDialog.base.constraints();
		vI_prefDialog.base.menuButtonConstraints();
		vI_prefDialog.base.initTreeValues();

		if (vI_storageExtrasHelper.seamonkey_to_old()) {
			document.getElementById("storageExtrasTreeitem1").setAttribute("hidden", "true")
			document.getElementById("storageExtrasTreeitem2").setAttribute("hidden", "true")
		}
	},
	
	savePrefs : function() {
		// Copy all changes to Elements
		onSaveCopiesAndFolders();
		vI_prefDialog.base.savePrefs();
	},

        openURL : function(aURL) {
            var uri = Components.classes["@mozilla.org/network/standard-url;1"].createInstance(Components.interfaces.nsIURI);
            var protocolSvc = Components.classes["@mozilla.org/uriloader/external-protocol-service;1"].getService(Components.interfaces.nsIExternalProtocolService);
		dump("load url " + aURL + "\n");
            uri.spec = aURL;
            protocolSvc.loadUrl(uri);
        }
}
