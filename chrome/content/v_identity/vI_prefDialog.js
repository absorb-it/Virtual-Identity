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

/**
* some code copied and adapted from Thunderbird Sources
* thanks to all Thunderbird Developers
*/

vI_prefDialog = {
	preferences : Components.classes["@mozilla.org/preferences-service;1"]
				.getService(Components.interfaces.nsIPrefService)
				.getBranch("extensions.virtualIdentity."),
				
	unicodeConverter : Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
				.createInstance(Components.interfaces.nsIScriptableUnicodeConverter),
	
	base : {
		_elementIDs : [	"VIdent_identity.doFcc",
				"VIdent_identity.fccFolderPickerMode",
				"VIdent_identity.fccFolder",
				"VIdent_identity.draftFolderPickerMode",
				"VIdent_identity.draftFolder",
				"VIdent_identity.stationeryFolderPickerMode",
				"VIdent_identity.stationeryFolder",
				"VIdent_identity.copySMIMESettings",
				"VIdent_identity.copyEnigmailSettings",
				"VIdent_identity.copyAttachVCardSettings",
				"VIdent_identity.smart_reply",
				"VIdent_identity.smart_reply_for_newsgroups",
				"VIdent_identity.show_smtp",
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
				"VIdent_identity.storage_dont_update_multiple",
				"VIdent_identity.storage_show_switch",
				"VIdent_identity.storage_warn_update",
				"VIdent_identity.storage_warn_vI_replace",
				"VIdent_identity.storage_notification",
				"VIdent_identity.storage_getOneOnly",
				"VIdent_identity.storage_returnReciept",
				"VIdent_identity.storage_characterEncoding",
				"VIdent_identity.storage_messageFormat",
				"VIdent_identity.storage_sMime_messageEncryption",
				"VIdent_identity.storage_sMime_messageSignature",
				"VIdent_identity.storage_openPGP_messageEncryption",
				"VIdent_identity.storage_openPGP_messageSignature",
				"VIdent_identity.storage_openPGP_PGPMIME",
				"VIdent_identity.idSelection_storage_use_for_smart_reply",
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
			storage = document.getElementById("VIdent_identity.storage").checked;
			smartDraft = document.getElementById("VIdent_identity.smart_draft").checked;
			smartReply = document.getElementById("VIdent_identity.smart_reply").checked;
			vI_prefDialog.base.idSelectionConstraint1(storage && smartReply);
			vI_prefDialog.base.idSelectionConstraint2(storage || smartReply || smartDraft);
			if (storage || smartReply || smartDraft) vI_prefDialog.base.idSelectionResultConstraint()
		},

		idSelectionConstraint1 : function(checked) {
			var elementIDs = [
				"VIdent_identity.idSelection_storage_use_for_smart_reply",
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
		
		idSelectionStorageSmartReplyConstraint : function() {
			var use_for_smart_reply = document.getElementById("VIdent_identity.idSelection_storage_use_for_smart_reply")
			var prefer_smart_reply = document.getElementById("VIdent_identity.idSelection_storage_prefer_smart_reply")
			var ignore_smart_reply = document.getElementById("VIdent_identity.idSelection_storage_ignore_smart_reply")
			prefer_smart_reply.setAttribute("disabled", !use_for_smart_reply.checked)
			ignore_smart_reply.setAttribute("disabled", !use_for_smart_reply.checked)
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
				"VIdent_identity.storage_dont_update_multiple",
				"VIdent_identity.storage_show_switch",
				"VIdent_identity.storage_warn_update",
				"VIdent_identity.storage_warn_vI_replace",
				"VIdent_identity.storage_notification",
				"VIdent_identity.storage_getOneOnly",
				"VIdent_identity.storage_returnReciept",
				"VIdent_identity.storage_characterEncoding",
				"VIdent_identity.storage_messageFormat",
				"VIdent_identity.storage_sMime_messageEncryption",
				"VIdent_identity.storage_sMime_messageSignature",
				"VIdent_identity.storage_openPGP_messageEncryption",
				"VIdent_identity.storage_openPGP_messageSignature",
				"VIdent_identity.storage_openPGP_PGPMIME",
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

		var appID = null;
		var appVersion = null;
		var versionChecker;
		if("@mozilla.org/xre/app-info;1" in Components.classes) {
			var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
				.getService(Components.interfaces.nsIXULAppInfo);
			appID = appInfo.ID
			appVersion = appInfo.version
		}
		if("@mozilla.org/xpcom/version-comparator;1" in Components.classes)
			versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
				.getService(Components.interfaces.nsIVersionComparator);
		else appID = null;
		const THUNDERBIRD_ID = "{3550f703-e582-4d05-9a08-453d09bdfdc6}";
		const SEAMONKEY_ID = "{92650c4d-4b8e-4d2a-b7eb-24ecf4f6b63a}";
		if ((!appID) || (appID == THUNDERBIRD_ID && versionChecker.compare(appVersion, "2.0b") < 0) ||
			(appID == SEAMONKEY_ID && versionChecker.compare(appVersion, "1.5a") < 0)) {
			document.getElementById("version-warning").setAttribute("hidden", "false");
			document.getElementById("VIdent_identity.smart_draft").setAttribute("disabled", "true");
		}
		if ((!appID) || (appID == THUNDERBIRD_ID && versionChecker.compare(appVersion, "1.5.0.7") < 0)) {
			document.getElementById("notificationGroupBox").setAttribute("hidden", "true");
		}
		if ((!appID) || (appID != THUNDERBIRD_ID)) {
			document.getElementById("VIdent_identity.menu_entry").setAttribute("hidden", "true");
		}
		
		vI_prefDialog.base.smartReplyConstraint(document.getElementById("VIdent_identity.smart_reply"));
		vI_prefDialog.base.smartReplyHideSignature();
		
		//~ if (vI_prefDialog.preferences.getBoolPref("experimental")){
		//~ }
		
		dump("## vI_prefDialog: init_prefs done\n");
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

/* -*- Mode: Java; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 4 -*-
 * ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Mozilla Communicator client code, released
 * March 31, 1998.
 *
 * The Initial Developer of the Original Code is
 * Netscape Communications Corporation.
 * Portions created by the Initial Developer are Copyright (C) 1998-1999
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either of the GNU General Public License Version 2 or later (the "GPL"),
 * or the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

var gFccRadioElemChoice, gDraftsRadioElemChoice, gTmplRadioElemChoice;
var gFccRadioElemChoiceLocked, gDraftsRadioElemChoiceLocked, gTmplRadioElemChoiceLocked;
var gDefaultPickerMode = "3";

var gFccFolderWithDelim, gDraftsFolderWithDelim, gTemplatesFolderWithDelim;

// Picker IDs
var fccAccountPickerId = "msgFccAccountPicker";
var fccFolderPickerId = "msgFccFolderPicker";
var draftsAccountPickerId = "msgDraftsAccountPicker";
var draftsFolderPickerId = "msgDraftsFolderPicker";
var tmplAccountPickerId = "msgStationeryAccountPicker";
var tmplFolderPickerId = "msgStationeryFolderPicker";

function onInitCopiesAndFolders()
{
    SetGlobalRadioElemChoices();
                     
    SetFolderDisplay(gFccRadioElemChoice, gFccRadioElemChoiceLocked, 
                     "VIdent_fcc", 
                     fccAccountPickerId, 
                     "VIdent_identity.fccFolder", 
                     fccFolderPickerId);

    SetFolderDisplay(gDraftsRadioElemChoice, gDraftsRadioElemChoiceLocked, 
                     "VIdent_draft", 
                     draftsAccountPickerId, 
                     "VIdent_identity.draftFolder", 
                     draftsFolderPickerId);

    SetFolderDisplay(gTmplRadioElemChoice, gTmplRadioElemChoiceLocked, 
                     "VIdent_tmpl", 
                     tmplAccountPickerId, 
                     "VIdent_identity.stationeryFolder", 
                     tmplFolderPickerId);
    
    setupFccItems();

    SetSpecialFolderNamesWithDelims();
}

// Initialize the picker mode choices (account/folder picker) into global vars
function SetGlobalRadioElemChoices()
{
    var pickerModeElement = document.getElementById("VIdent_identity.fccFolderPickerMode");
    gFccRadioElemChoice = pickerModeElement.getAttribute("value");
    gFccRadioElemChoiceLocked = pickerModeElement.getAttribute("disabled");
    if (!gFccRadioElemChoice) gFccRadioElemChoice = gDefaultPickerMode;

    pickerModeElement = document.getElementById("VIdent_identity.draftFolderPickerMode");
    gDraftsRadioElemChoice = pickerModeElement.getAttribute("value");
    gDraftsRadioElemChoiceLocked = pickerModeElement.getAttribute("disabled");
    if (!gDraftsRadioElemChoice) gDraftsRadioElemChoice = gDefaultPickerMode;

    pickerModeElement = document.getElementById("VIdent_identity.stationeryFolderPickerMode");
    gTmplRadioElemChoice = pickerModeElement.getAttribute("value");
    gTmplRadioElemChoiceLocked = pickerModeElement.getAttribute("disabled");
    if (!gTmplRadioElemChoice) gTmplRadioElemChoice = gDefaultPickerMode;
    
    //~ alert(gFccRadioElemChoice + " " + gDraftsRadioElemChoice + " " + gTmplRadioElemChoice)
}

/* 
 * Set Account and Folder elements based on the values read from 
 * preferences file. Default picker mode, if none specified at this stage, is
 * set to 1 i.e., Other picker displaying the folder value read from the 
 * preferences file.
 */
function SetFolderDisplay(pickerMode, disableMode,
                          radioElemPrefix, 
                          accountPickerId, 
                          folderPickedField, 
                          folderPickerId)
{
    if (!pickerMode)
        pickerMode = gDefaultPickerMode;

    var selectAccountRadioId = radioElemPrefix + "_selectAccount";
    var selectAccountRadioElem = document.getElementById(selectAccountRadioId);
    var selectFolderRadioId = radioElemPrefix + "_selectFolder";
    var selectFolderRadioElem = document.getElementById(selectFolderRadioId);
    var accountPicker = document.getElementById(accountPickerId);
    var folderPicker = document.getElementById(folderPickerId);
    var rg = selectAccountRadioElem.radioGroup;
    var folderPickedElement = document.getElementById(folderPickedField);
    var uri = folderPickedElement.getAttribute("value");
    // Get message folder from the given uri. Second argument (false) siginifies
    // that there is no need to check for the existence of special folders as 
    // these folders are created on demand at runtime in case of imap accounts.
    // For POP3 accounts, special folders are created at the account creation time.
    var msgFolder = GetMsgFolderFromUri(uri, false);
    if (msgFolder) SetFolderPicker(msgFolder.server.serverURI, accountPickerId);
    else SetFolderPicker("", accountPickerId);
    InitFolderDisplay(folderPickedField, folderPickerId);
    switch (pickerMode) 
    {
        case "0" :
            rg.selectedItem = selectAccountRadioElem;
            SetPickerEnabling(accountPickerId, folderPickerId);
            break;

        case "1"  :
            rg.selectedItem = selectFolderRadioElem;
            SetPickerEnabling(folderPickerId, accountPickerId);
            break;
	case "2"  :
	    rg.selectedItem = document.getElementById(radioElemPrefix + "_Settings_Of_Default");
	    document.getElementById(folderPickerId).setAttribute("disabled", "true");
	    document.getElementById(accountPickerId).setAttribute("disabled", "true");
            break;
	case "3"  :
	    rg.selectedItem = document.getElementById(radioElemPrefix + "_Settings_Of_Account");
 	    document.getElementById(folderPickerId).setAttribute("disabled", "true");
	    document.getElementById(accountPickerId).setAttribute("disabled", "true");
            break;

        default :
            alert("Error in setting initial folder display on pickers\n");
            break;
    }

    // Check to see if we need to lock page elements. Disable radio buttons
    // and account/folder pickers when locked.
    if (disableMode) {
      selectAccountRadioElem.setAttribute("disabled","true");
      selectFolderRadioElem.setAttribute("disabled","true");
      accountPicker.setAttribute("disabled","true");
      folderPicker.setAttribute("disabled","true");
    }
}

// Initialize the folder display based on prefs values
function InitFolderDisplay(fieldname, pickerId) {
    var formElement = document.getElementById(fieldname);
    var uri = formElement.getAttribute("value");
    SetFolderPicker(uri,pickerId);
}

// Capture any menulist changes
function noteSelectionChange(radioItemId)
{
    var checkedElem = document.getElementById(radioItemId);
    var modeValue  = checkedElem.getAttribute("value");
    var radioGroup = checkedElem.radioGroup.getAttribute("id");
    switch (radioGroup)
    {
        case "VIdent_doFcc" :
            gFccRadioElemChoice = modeValue;
            break;
    
        case "VIdent_messageDrafts" :
            gDraftsRadioElemChoice = modeValue;
            break;

        case "VIdent_messageTemplates" :
            gTmplRadioElemChoice = modeValue;
            break;

        default :
            alert("Error capturing menulist changes. " + radioGroup + "\n");
            break;
    }
}

// Need to append special folders when account picker is selected.
// Create a set of global special folder vars to be suffixed to the
// server URI of the selected account.
function SetSpecialFolderNamesWithDelims()
{
    var folderDelim = "/";
    /* we use internal names known to everyone like "Sent", "Templates" and "Drafts" */

    gFccFolderWithDelim = folderDelim + "Sent";
    gDraftsFolderWithDelim = folderDelim + "Drafts";
    gTemplatesFolderWithDelim = folderDelim + "Templates";
}

function onSaveCopiesAndFolders()
{
    SaveFolderSettings( gFccRadioElemChoice, 
                        "doFcc",
                        gFccFolderWithDelim, 
                        fccAccountPickerId, 
                        fccFolderPickerId,
                        "VIdent_identity.fccFolder",
                        "VIdent_identity.fccFolderPickerMode" );

    SaveFolderSettings( gDraftsRadioElemChoice, 
                        "messageDrafts",
                        gDraftsFolderWithDelim, 
                        draftsAccountPickerId, 
                        draftsFolderPickerId,
                        "VIdent_identity.draftFolder",
                        "VIdent_identity.draftFolderPickerMode" );

    SaveFolderSettings( gTmplRadioElemChoice,
                        "messageTemplates",
                        gTemplatesFolderWithDelim, 
                        tmplAccountPickerId, 
                        tmplFolderPickerId,
                        "VIdent_identity.stationeryFolder",
                        "VIdent_identity.stationeryFolderPickerMode" );
}

// Save folder settings and radio element choices
function SaveFolderSettings(radioElemChoice, 
                            radioGroupId,
                            folderSuffix,
                            accountPickerId,
                            folderPickerId,
                            folderElementId,
                            folderPickerModeId)
{
    var formElement;
    var uri;
    var picker;

    switch (radioElemChoice) 
    {
        case "0" :
            picker = document.getElementById(accountPickerId);
            uri = picker.getAttribute("uri");
            if (uri) {
                // Create  Folder URI
                uri = uri + folderSuffix;

                formElement = document.getElementById(folderElementId);
                formElement.setAttribute("value",uri);
            }
            break;

        case "1" : 
            picker = document.getElementById(folderPickerId);
            uri = picker.getAttribute("uri");
            if (uri) {
                SaveUriFromPicker(folderElementId, folderPickerId);
            }
            break;

        default :
            break;
    }

    formElement = document.getElementById(folderPickerModeId);
    formElement.setAttribute("value", radioElemChoice);
}

// Get the URI from the picker and save the value into the corresponding pref
function SaveUriFromPicker(fieldName, pickerId)
{
    var picker = document.getElementById(pickerId);
    var uri = picker.getAttribute("uri");
    
    var formElement = document.getElementById(fieldName);
    formElement.setAttribute("value",uri);
}

// Check the Fcc Self item and setup associated picker state 
function setupFccItems()
{ 
    var broadcaster = document.getElementById("VIdent_broadcaster_doFcc");

    var checked = document.getElementById("VIdent_identity.doFcc").checked;
    if (checked) {
        broadcaster.removeAttribute("disabled");
        SetupFccPickerState(gFccRadioElemChoice,
                            fccAccountPickerId,
                            fccFolderPickerId);
	  }
    else
        broadcaster.setAttribute("disabled", "true");
}

// Set up picker settings for Sent Folder 
function SetupFccPickerState(pickerMode, accountPickerId, folderPickerId)
{
    switch (pickerMode) {
        case "0" :
            if (!gFccRadioElemChoiceLocked)
              SetPickerEnabling(accountPickerId, folderPickerId);
            SetRadioButtons("VIdent_fcc_selectAccount", "VIdent_fcc_selectFolder");
            break;
	
        case "1" :
            if (!gFccRadioElemChoiceLocked)
              SetPickerEnabling(folderPickerId, accountPickerId);
            SetRadioButtons("VIdent_fcc_selectFolder", "VIdent_fcc_selectAccount");
            break;

        default :
	      document.getElementById(folderPickerId).setAttribute("disabled", "true");
	      document.getElementById(accountPickerId).setAttribute("disabled", "true");
            break;
    }
}

// Enable and disable pickers based on the radio element clicked
function SetPickerEnabling(enablePickerId, disablePickerId)
{
    var activePicker = document.getElementById(enablePickerId);
    activePicker.removeAttribute("disabled");

    var inactivePicker = document.getElementById(disablePickerId);
    inactivePicker.setAttribute("disabled", "true");
}

// Set radio element choices and picker states
function setPickersState(enablePickerId, disablePickerId, event)
{
    SetPickerEnabling(enablePickerId, disablePickerId);

    var selectedElementUri;
    var radioElemValue = event.target.value;

    switch (event.target.id) {
	case "VIdent_fcc_Settings_Of_Account":
	case "VIdent_fcc_Settings_Of_Default":
	    document.getElementById(enablePickerId).setAttribute("disabled", "true");
        case "VIdent_fcc_selectAccount":
        case "VIdent_fcc_selectFolder" :
            gFccRadioElemChoice = radioElemValue;   
            break;
	case "VIdent_draft_Settings_Of_Account":
	case "VIdent_draft_Settings_Of_Default":
	    document.getElementById(enablePickerId).setAttribute("disabled", "true");
        case "VIdent_draft_selectAccount":
        case "VIdent_draft_selectFolder" :
            gDraftsRadioElemChoice = radioElemValue;   
            break;
	case "VIdent_tmpl_Settings_Of_Account":
	case "VIdent_tmpl_Settings_Of_Default":
	    document.getElementById(enablePickerId).setAttribute("disabled", "true");
        case "VIdent_tmpl_selectFolder" :
        case "VIdent_tmpl_selectAccount":
            gTmplRadioElemChoice = radioElemValue;   
            break;
        default :
            alert("Error in setting picker state. " + event.target.id + "\n");
            return;
    }
    
    //~ SetFolderPicker(selectedElementUri, enablePickerId);
}

// This routine is to restore the correct radio element 
// state when the fcc self checkbox broadcasts the change
function SetRadioButtons(selectPickerId, unselectPickerId)
{
    var activeRadioElem = document.getElementById(selectPickerId);
    activeRadioElem.radioGroup.selectedItem = activeRadioElem;
}
