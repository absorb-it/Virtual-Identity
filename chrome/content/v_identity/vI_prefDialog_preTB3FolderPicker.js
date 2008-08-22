
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

function InitFolderDisplays(msgFolder, accountPickerId, folderPickerId) {
    SetFolderPicker(msgFolder.server.serverURI, accountPickerId);
    SetFolderPicker(msgFolder.URI, folderPickerId);
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
                uri = uri + folderSuffix;	// Create  Folder URI
                formElement = document.getElementById(folderElementId);
                formElement.setAttribute("value",uri);
            }
            break;

        case "1" : 
            picker = document.getElementById(folderPickerId);
            uri = picker.getAttribute("uri");
            if (uri) {
                formElement = document.getElementById(folderElementId);
                formElement.setAttribute("value",uri);
            }
            break;

        default :
            break;
    }

    formElement = document.getElementById(folderPickerModeId);
    formElement.setAttribute("value", radioElemChoice);
}