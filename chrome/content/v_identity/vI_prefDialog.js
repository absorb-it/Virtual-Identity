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
	
	base : {
		_elementIDs : [	"VIdent_identity.doFcc",
				"VIdent_identity.fccFolderPickerMode",
				"VIdent_identity.fccFolder",
				"VIdent_identity.copySMIMESettings",
				"VIdent_identity.copyEnigmailSettings",
				"VIdent_identity.copyAttachVCardSettings",
				"VIdent_identity.smart_reply",
				"VIdent_identity.smart_reply_for_newsgroups",
				"VIdent_identity.smart_reply_ask",
				"VIdent_identity.smart_reply_ask_always",
				"VIdent_identity.show_smtp",
				"VIdent_identity.smart_reply_headers",
				"VIdent_identity.smart_reply_filter",
				"VIdent_identity.smart_draft",
				"VIdent_identity.smart_reply_prefer_headers",
				"VIdent_identity.smart_reply_notification",
				"VIdent_identity.get_header_notification",
				"VIdent_identity.smart_reply_ignoreFullName",
				"VIdent_identity.smart_reply_autocreate",
				"VIdent_identity.notification_timeout"],
	
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
						vI_prefDialog.preferences.getCharPref(element.getAttribute("prefstring")) );
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
				else if (eltType == "textbox")
					if (element.getAttribute("preftype") == "int")
						vI_prefDialog.preferences.setIntPref(
							element.getAttribute("prefstring"), element.value);
					else vI_prefDialog.preferences.setCharPref(
							element.getAttribute("prefstring"), element.value);
			}
		},
		
		smartReplyConstraint : function(element) {
			var elementIDs = [
				"VIdent_identity.smart_reply_for_newsgroups",
				"VIdent_identity.smart_reply_ask",
				"VIdent_identity.smart_reply_ask_always",
				"VIdent_identity.smart_reply_headers",
				"VIdent_identity.smart_reply_filter",
				"VIdent_identity.smart_reply_prefer_headers",
				"VIdent_identity.smart_reply_ignoreFullName",
				"VIdent_identity.smart_reply_autocreate",
				"smartReplyTab", "smartReplyTab1", "smartReplyTab2", "smartReplyTab3"];
			for( var i = 0; i < elementIDs.length; i++ ) {
				if (element.checked)
					document.getElementById(elementIDs[i])
						.removeAttribute("disabled");
				else
					document.getElementById(elementIDs[i])
						.setAttribute("disabled", "true");
			}
			vI_prefDialog.base.smartReplyResultConstraint();
		},
		
		smartReplyResultConstraint : function() {
			var ask = document.getElementById("VIdent_identity.smart_reply_ask")
			var ask_always = document.getElementById("VIdent_identity.smart_reply_ask_always")
			var autocreate = document.getElementById("VIdent_identity.smart_reply_autocreate")
			ask_always.setAttribute("disabled", (autocreate.checked || !ask.checked))
			autocreate.setAttribute("disabled", ask_always.checked)
		}
	},

	init : function() {
		vI_prefDialog.base.init();
		SetGlobalRadioElemChoices();
		SetFolderDisplay(gFccRadioElemChoice, gFccRadioElemChoiceLocked, "VIdent_fcc", 
			fccAccountPickerId, "VIdent_identity.fccFolder", fccFolderPickerId);
		setupFccItems();
		SetSpecialFolderNamesWithDelims();

		var appInfo = Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULAppInfo);
		var versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"].getService(Components.interfaces.nsIVersionComparator);
		const THUNDERBIRD_ID = "{3550f703-e582-4d05-9a08-453d09bdfdc6}";
		//const MOZILLA_ID = "{86c18b42-e466-45a9-ae7a-9b95ba6f5640}";
		const SEAMONKEY_ID = "{92650c4d-4b8e-4d2a-b7eb-24ecf4f6b63a}";
		if ((appInfo.ID == THUNDERBIRD_ID && versionChecker.compare(appInfo.version, "2.0b") < 0) ||
			(appInfo.ID == SEAMONKEY_ID && versionChecker.compare(appInfo.version, "1.5a") < 0)) {
			document.getElementById("version-warning").setAttribute("hidden", "false");
			document.getElementById("VIdent_identity.smart_draft").setAttribute("disabled", "true");
		}
		
		
		vI_prefDialog.base.smartReplyConstraint(document.getElementById("VIdent_identity.smart_reply"));
		
		dump("## vI_prefDialog: init_prefs done\n");
	},
	
	savePrefs : function() {
		// Copy all changes to Elements
		SaveFolderSettings( gFccRadioElemChoice, "VIdent_doFcc",
			gFccFolderWithDelim, fccAccountPickerId, fccFolderPickerId,
			"VIdent_identity.fccFolder", "VIdent_identity.fccFolderPickerMode" );
		vI_prefDialog.base.savePrefs();
	}
}


/* following code is copied and adapted from thunderbird sources */

// Initialize the picker mode choices (account/folder picker) into global vars
function SetGlobalRadioElemChoices() {
    var pickerModeElement = document.getElementById("VIdent_identity.fccFolderPickerMode");
    gFccRadioElemChoice = pickerModeElement.getAttribute("value");
    gFccRadioElemChoiceLocked = pickerModeElement.getAttribute("disabled");
    if (!gFccRadioElemChoice) {
      gFccRadioElemChoice = gDefaultPickerMode
      var formElement = document.getElementById("VIdent_identity.fccFolder");
      formElement.setAttribute("value",gDefaultFccFolder);
      SetFolderPicker(gDefaultFccFolder, "msgFccAccountPicker");
      document.getElementById("VIdent_identity.doFcc").checked = true;
      //~ dump("## vI_prefDialog: restored default state\n");
      }
}

var gFccRadioElemChoice;
var gFccRadioElemChoiceLocked;
var gDefaultPickerMode = "3";
var gDefaultFccFolder = "";

var gFccFolderWithDelim;


// Picker IDs
var fccAccountPickerId = "msgFccAccountPicker";
var fccFolderPickerId = "msgFccFolderPicker";

// Need to append special folders when account picker is selected.
// Create a set of global special folder vars to be suffixed to the
// server URI of the selected account.
function SetSpecialFolderNamesWithDelims()
{
    var folderDelim = "/";
    /* we use internal names known to everyone like "Sent", "Templates" and "Drafts" */

    gFccFolderWithDelim = folderDelim + "Sent";
}


// additional variables usually provided by parent pages
var gMessengerBundle;
gMessengerBundle = document.getElementById("bundle_messenger");

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

    //~ dump("## vI_prefDialog: try to set folder display\n");
    var selectAccountRadioId = radioElemPrefix + "_selectAccount";
    var selectAccountRadioElem = document.getElementById(selectAccountRadioId);
    var selectFolderRadioId = radioElemPrefix + "_selectFolder";
    var selectFolderRadioElem = document.getElementById(selectFolderRadioId);
    var accountPicker = document.getElementById(accountPickerId);
    var folderPicker = document.getElementById(folderPickerId);
    var rg = selectAccountRadioElem.radioGroup;
    //~ dump("## vI_prefDialog: try to set folder display - switch by picker mode " + pickerMode + "\n");
    
    
    switch (pickerMode) 
    {
        case "0" :
            rg.selectedItem = selectAccountRadioElem;

            var folderPickedElement = document.getElementById(folderPickedField);
            var uri = folderPickedElement.getAttribute("value");
            // Get message folder from the given uri. Second argument (false) siginifies
            // that there is no need to check for the existence of special folders as 
            // these folders are created on demand at runtime in case of imap accounts.
            // For POP3 accounts, special folders are created at the account creation time.
            var msgFolder = GetMsgFolderFromUri(uri, false);
	    SetFolderPicker(msgFolder.server.serverURI, accountPickerId);
	    document.getElementById(accountPickerId).removeAttribute("disabled");
	    document.getElementById(folderPickerId).setAttribute("disabled", "true");
            break;
        case "1"  :
            rg.selectedItem = selectFolderRadioElem;
		    	
            InitFolderDisplay(folderPickedField, folderPickerId);
	    document.getElementById(folderPickerId).removeAttribute("disabled");
	    document.getElementById(accountPickerId).setAttribute("disabled", "true");
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
	    document.getElementById(folderPickerId).setAttribute("disabled", "true");
	    document.getElementById(accountPickerId).setAttribute("disabled", "true");
            break;
    }
    // Check to see if we need to lock page elements. Disable radio buttons
    // and account/folder pickers when locked.
    if (disableMode) {
      selectAccountRadioElem.setAttribute("disabled","true");
      selectFolderRadioElem.setAttribute("disabled","true");
      document.getElementById(radioElemPrefix + "_Settings_Of_Default").setAttribute("disabled", "true");
      document.getElementById(radioElemPrefix + "_Settings_Of_Account").setAttribute("disabled", "true");
      accountPicker.setAttribute("disabled","true");
      folderPicker.setAttribute("disabled","true");
    }
    
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

	//~ dump("## vI_prefDialog: SaveFolderSettings " + radioElemChoice + "\n");

    switch (radioElemChoice) 
    {
        case "0" :
            picker = document.getElementById(accountPickerId);
            uri = picker.getAttribute("uri");
            if (uri) {
	    //~ dump("## vI_prefDialog: trying to save picker settings (0) " + uri + folderSuffix + "\n");
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
    
	    //~ dump("## vI_prefDialog: trying to save Uri from Picker (1) " + uri + "\n");
    var formElement = document.getElementById(fieldName);
    formElement.setAttribute("value",uri);
}

// Initialize the folder display based on prefs values
function InitFolderDisplay(fieldname, pickerId) {
    var formElement = document.getElementById(fieldname);
    var uri = formElement.getAttribute("value");
    SetFolderPicker(uri,pickerId);
}

// Check the Fcc Self item and setup associated picker state 
function setupFccItems()
{ 
    //~ dump("## vI_prefDialog: SetupFccItems\n");
    var broadcaster = document.getElementById("VIdent_broadcaster_doFcc");
    if (document.getElementById("VIdent_identity.doFcc").checked) {
        broadcaster.removeAttribute("disabled");
        SetupFccPickerState(document.getElementById("VIdent_identity.fccFolderPickerMode").value);
    }
    else
        broadcaster.setAttribute("disabled", "true");
}

// Set up picker settings for Sent Folder 
function SetupFccPickerState(pickerMode)
{
	var pickerModeElement = document.getElementById("VIdent_identity.fccFolderPickerMode");
	var gFccRadioElemChoice = pickerModeElement.getAttribute("value");
	var gFccRadioElemChoiceLocked = document.getElementById("VIdent_identity.fccFolderPickerMode").getAttribute("disabled");
    
    //~ dump("## vI_prefDialog: pickermode: " + pickerMode + "\n");
    switch (pickerMode) {
        case "0" :
            if (!gFccRadioElemChoiceLocked) {
              document.getElementById("msgFccAccountPicker").removeAttribute("disabled");
	      document.getElementById("msgFccFolderPicker").setAttribute("disabled", "true"); }
	    var activeRadioElem = document.getElementById("VIdent_fcc_selectAccount");
	    activeRadioElem.radioGroup.selectedItem = activeRadioElem;
            break;
	
        case "1" :
            if (!gFccRadioElemChoiceLocked) {
              document.getElementById("msgFccFolderPicker").removeAttribute("disabled");
	      document.getElementById("msgFccAccountPicker").setAttribute("disabled", "true"); }
	    var activeRadioElem = document.getElementById("VIdent_fcc_selectFolder");
	    activeRadioElem.radioGroup.selectedItem = activeRadioElem;
            break;

        default :
	      document.getElementById("msgFccFolderPicker").setAttribute("disabled", "true");
	      document.getElementById("msgFccAccountPicker").setAttribute("disabled", "true");
            break;
    }
}

// Set radio element choices and picker states
function setPickersState(enablePickerId, disablePickerId, event)
{
    document.getElementById(enablePickerId).removeAttribute("disabled");
    document.getElementById(disablePickerId).setAttribute("disabled", "true");

    var selectedElementUri;
    var radioElemValue = event.target.value;
    
    var AccManager = Components.classes["@mozilla.org/messenger/account-manager;1"].getService(Components.interfaces.nsIMsgAccountManager);
    selectedElementUri = AccManager.localFoldersServer.serverURI;
    
    switch (event.target.id) {
        case "VIdent_fcc_selectAccount" :
            gFccRadioElemChoice = radioElemValue;
	    document.getElementById(enablePickerId).removeAttribute("disabled");
	    break;
        case "VIdent_fcc_selectFolder" :
            gFccRadioElemChoice = radioElemValue;   
            selectedElementUri += gFccFolderWithDelim;
	    document.getElementById(enablePickerId).removeAttribute("disabled");
            break;
        default :
	    gFccRadioElemChoice = radioElemValue;
	    selectedElementUri = "";
	    document.getElementById(enablePickerId).setAttribute("disabled", "true");
            break;
    }
    
    SetFolderPicker(selectedElementUri, enablePickerId);
}

// Capture any menulist changes
function noteSelectionChange(radioItemId)
{
    var checkedElem = document.getElementById(radioItemId);
    var modeValue  = checkedElem.getAttribute("value");
    var radioGroup = checkedElem.radioGroup.getAttribute("id");
    //~ dump("## vI_prefDialog: Fcc-value changed\n");
    gFccRadioElemChoice = modeValue;
}
