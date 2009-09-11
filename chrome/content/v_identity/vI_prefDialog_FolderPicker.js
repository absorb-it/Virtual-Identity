
/**
* some code copied and adapted from Thunderbird Sources
* thanks to all Thunderbird Developers
*/

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

function setDefaultCopiesAndFoldersPrefs(identity, server, accountData)
{
    var am = Components.classes["@mozilla.org/messenger/account-manager;1"].getService(Components.interfaces.nsIMsgAccountManager);
    var rootFolder = am.defaultAccount.incomingServer.rootFolder

    var fccElement = document.getElementById("VIdent_identity.fccFolder")
    var fccElementValue = fccElement.getAttribute("value");
    if (!fccElementValue || !GetMsgFolderFromUri(fccElementValue, false))
    	fccElement.setAttribute("value", rootFolder.server.serverURI + gFccFolderWithDelim)

    var draftElement = document.getElementById("VIdent_identity.draftFolder")
    var draftElementValue = draftElement.getAttribute("value");
    if (!draftElementValue || !GetMsgFolderFromUri(draftElementValue, false))
    	draftElement.setAttribute("value", rootFolder.server.serverURI + gDraftsFolderWithDelim)

    var stationeryElement = document.getElementById("VIdent_identity.stationeryFolder")
    var stationeryElementValue = stationeryElement.getAttribute("value");
    if (!stationeryElementValue || !GetMsgFolderFromUri(stationeryElementValue, false))
    	stationeryElement.setAttribute("value", rootFolder.server.serverURI + gTemplatesFolderWithDelim)
}


function onInitCopiesAndFolders()
{
    SetSpecialFolderNamesWithDelims();
    SetGlobalRadioElemChoices();

    setDefaultCopiesAndFoldersPrefs();

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
    InitFolderDisplays(msgFolder, accountPickerId, folderPickerId)

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
	    folderPicker.setAttribute("disabled", "true");
	    accountPicker.setAttribute("disabled", "true");
            break;
	case "3"  :
	    rg.selectedItem = document.getElementById(radioElemPrefix + "_Settings_Of_Account");
 	    folderPicker.setAttribute("disabled", "true");
	    accountPicker.setAttribute("disabled", "true");
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
    
    switch (event.target.id) {
    	case "VIdent_fcc_Settings_Of_Account":
	case "VIdent_fcc_Settings_Of_Default":
	    document.getElementById("VIdent_identity.fccReplyFollowsParent").setAttribute("disabled","true");
	    break;
        case "VIdent_fcc_selectAccount":
        case "VIdent_fcc_selectFolder" :
	    document.getElementById("VIdent_identity.fccReplyFollowsParent").removeAttribute("disabled")
            break;
     }
}

// This routine is to restore the correct radio element 
// state when the fcc self checkbox broadcasts the change
function SetRadioButtons(selectPickerId, unselectPickerId)
{
    var activeRadioElem = document.getElementById(selectPickerId);
    activeRadioElem.radioGroup.selectedItem = activeRadioElem;
}
