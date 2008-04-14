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

    Contributor(s):
 * ***** END LICENSE BLOCK ***** */

/*  Parts of this code taken from 
    http://developer.mozilla.org/en/docs/Sorting_and_filtering_a_custom_tree_view
    under MIT license
    http://www.ibiblio.org/pub/Linux/LICENSES/mit.license
*/

var vI_rdfDataTree = {
	__idTable : null,
	__idData : null,
	__treeElem : null,
	filterText : "",
	
	__strings : null,
	__SMTP_NAMES : [],
	__ID_NAMES : [],

	promptService : Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
			.getService(Components.interfaces.nsIPromptService),

	init : function() {
		vI_rdfDatasource.init();
		vI_rdfDataTree.__treeElem = document.getElementById("rdfDataTree");
		vI_rdfDataTree.__strings = document.getElementById("vI_rdfDataTreeBundle");
		vI_rdfDataTree.__getSMTPnames();
		vI_rdfDataTree.__getIDnames();
		vI_rdfDataTree.loadTable();
	},

	//prepares an object for easy comparison against another. for strings, lowercases them
	__prepareForComparison : function(o) {
		if (typeof o == "string") { return o.toLowerCase().replace(/\"/g,""); }
		return "";
	},
	
	__getSMTPnames : function () {
		var smtpService = Components.classes["@mozilla.org/messengercompose/smtp;1"]
			.getService(Components.interfaces.nsISmtpService);
		for (var i=0 ; i<smtpService.smtpServers.Count(); i++) {
			var server = smtpService.smtpServers.QueryElementAt(i, Components.interfaces.nsISmtpServer);
			if (!server.redirectorType)
				vI_rdfDataTree.__SMTP_NAMES[server.key] = server.description?server.description:server.hostname
		}
	},

	__getIDnames : function () {
		var accounts = queryISupportsArray(gAccountManager.accounts, Components.interfaces.nsIMsgAccount);
		accounts.sort(compareAccountSortOrder);
		for (var i in accounts) {
			var server = accounts[i].incomingServer;
			if (!server) continue;
			var identites = queryISupportsArray(accounts[i].identities, Components.interfaces.nsIMsgIdentity);
			for (var j in identites)
				vI_rdfDataTree.__ID_NAMES[identites[j].key] = identites[j].identityName;
		}
	},
	
	__addNewDatum : function(resource, type, name, values) {
		var smtpName = ""; var idName = "";
		if (!values.smtp) smtpName = document.getElementById("bundle_messenger").getString("defaultServerTag")
		else smtpName = vI_rdfDataTree.__SMTP_NAMES[values.smtp]
		
		if (values.id) idName = vI_rdfDataTree.__ID_NAMES[values.id]
		
		var pref = { 	recipientCol : name,
				typeCol : document.getElementById("vI_rdfDataTreeBundle").getString("vI_rdfDataTree.dataType." + type),
				senderCol : vI_helper.combineNames(values.fullName, values.email),
				smtpCol : smtpName,
				smtpKey : values.smtp,
				idCol : idName,
				idKey : values.id,
				resource : resource }
		
		vI_rdfDataTree.__idData.push(pref);
	},
	
	//this function is called every time the tree is sorted, filtered, or reloaded
	loadTable : function() {
		//remember scroll position. this is useful if this is an editable table
		//to prevent the user from losing the row they edited
		var topVisibleRow = null;
		if (vI_rdfDataTree.__idTable) {
			topVisibleRow = vI_rdfDataTree.__treeElem.treeBoxObject.getFirstVisibleRow();
		}
		if (vI_rdfDataTree.__idData == null) {
			vI_rdfDataTree.__idData = [];
			vI_rdfDatasource.readAllVIdentitiesFromRDF(vI_rdfDataTree.__addNewDatum)
		}
		if (vI_rdfDataTree.filterText == "") {
			//show all of them
			vI_rdfDataTree.__idTable = vI_rdfDataTree.__idData;
		} else {
			//filter out the ones we want to display
			vI_rdfDataTree.__idTable = [];
			vI_rdfDataTree.__idData.forEach(function(element) {
				//we'll match on every property
				for (var i in element) {
					if (vI_rdfDataTree.__prepareForComparison(element[i]).indexOf(vI_rdfDataTree.filterText) != -1) {
						vI_rdfDataTree.__idTable.push(element);
						break;
					}
				}
			});
		}
		vI_rdfDataTree.sort();
		//restore scroll position
		if (topVisibleRow) {
			vI_rdfDataTree.__treeElem.treeBoxObject.scrollToRow(topVisibleRow);
		}
	},
	
	sort : function(column) {
		var columnName;
		var order = vI_rdfDataTree.__treeElem.getAttribute("sortDirection") == "ascending" ? 1 : -1;
		//if the column is passed and it's already sorted by that column, reverse sort
		if (column) {
			columnName = column.id;
			if (vI_rdfDataTree.__treeElem.getAttribute("sortResource") == columnName) {
				order *= -1;
			}
		} else {
			columnName = vI_rdfDataTree.__treeElem.getAttribute("sortResource");
		}
		
		function columnSort(a, b) {
			if (vI_rdfDataTree.__prepareForComparison(a[columnName]) > 
				vI_rdfDataTree.__prepareForComparison(b[columnName])) return 1 * order;
			if (vI_rdfDataTree.__prepareForComparison(a[columnName]) < 
				vI_rdfDataTree.__prepareForComparison(b[columnName])) return -1 * order;
			return 0;
		}
		vI_rdfDataTree.__idTable.sort(columnSort);
		//setting these will make the sort option persist
		vI_rdfDataTree.__treeElem.setAttribute("sortDirection", order == 1 ? "ascending" : "descending");
		vI_rdfDataTree.__treeElem.setAttribute("sortResource", columnName);
		vI_rdfDataTree.__treeElem.view = new vI_rdfDataTree.treeView(vI_rdfDataTree.__idTable);
		//set the appropriate attributes to show to indicator
		var cols = vI_rdfDataTree.__treeElem.getElementsByTagName("treecol");
		for (var i = 0; i < cols.length; i++) {
			cols[i].removeAttribute("sortDirection");
		}
		document.getElementById(columnName).setAttribute("sortDirection", order == 1 ? "ascending" : "descending");
	},

	//generic custom tree view stuff
	treeView : function (table) {
		this.rowCount = table.length;
		this.getCellText = function(row, col) {
			return table[row][col.id];
		};
		this.getCellValue = function(row, col) {
			return table[row][col.id];
		};
		this.setTree = function(treebox) {
			this.treebox = treebox;
		};
		this.isEditable = function(row, col) {
			return col.editable;
		};
		this.isContainer = function(row){ return false; };
		this.isSeparator = function(row){ return false; };
		this.isSorted = function(){ return false; };
		this.getLevel = function(row){ return 0; };
		this.getImageSrc = function(row,col){ return null; };
		this.getRowProperties = function(row,props){};
		this.getCellProperties = function(row,col,props){};
		this.getColumnProperties = function(colid,col,props){};
		this.cycleHeader = function(col, elem) { vI_rdfDataTree.sort(col) };
	},
	
	__setFilter : function (text) {
		vI_rdfDataTree.filterText = text;
		vI_rdfDataTree.loadTable();
	},

	inputFilter : function(event) {
		//do this now rather than doing it at every comparison
		var value = vI_rdfDataTree.__prepareForComparison(event.target.value);
		vI_rdfDataTree.__setFilter(value);
		document.getElementById("clearFilter").disabled = value.length == 0;
	},
	
	clearFilter : function() {
		document.getElementById("clearFilter").disabled = true;
		var filterElement = document.getElementById("filter");
		filterElement.focus();
		filterElement.value = "";
		vI_rdfDataTree.__setFilter("");
	},
	
	__updateMenu : function(modifySelected, removeSelected) {
		noSelections = (vI_rdfDataTree.__treeElem.view.selection.count == 0)
		modifySelected.setAttribute("disabled", noSelections)
		removeSelected.setAttribute("disabled", noSelections)	
	},
	
	updateContextMenu : function() {
		vI_rdfDataTree.__updateMenu(
			document.getElementById("context_modifySelected"),
			document.getElementById("context_removeSelected"))
	},
	
	updateMenu : function() {
		vI_rdfDataTree.__updateMenu(
			document.getElementById("menu_modifySelected"),
			document.getElementById("menu_removeSelected"))
	},

	modifySelected : function() {
		if (vI_rdfDataTree.__treeElem.view.selection.count == 0) return;
		if (vI_rdfDataTree.__treeElem.view.selection.count > 5) {
			var warning = vI_rdfDataTree.__strings.getString("vI_rdfDataTree.modify.Warning1") + " " +
				vI_rdfDataTree.__treeElem.view.selection.count + " " +
				vI_rdfDataTree.__strings.getString("vI_rdfDataTree.modify.Warning2")
			if (!vI_rdfDataTree.promptService.confirm(window,"Warning",warning)) return;
		}
		
		var start = new Object(); var end = new Object();
		var numRanges = vI_rdfDataTree.__treeElem.view.selection.getRangeCount();

		for (var t=0; t<numRanges; t++){
			vI_rdfDataTree.__treeElem.view.selection.getRangeAt(t,start,end);
			for (var v=start.value; v<=end.value; v++)
				window.openDialog("chrome://v_identity/content/vI_rdfDataEditor.xul",0,
					"chrome, dialog, modal, alwaysRaised, resizable=yes",
					vI_rdfDataTree.__idTable[v],
					vI_rdfDatasource).focus();
		}
		
		vI_rdfDataTree.__idData = null; vI_rdfDataTree.__idTable = null;
		vI_rdfDataTree.loadTable();
	},
	
	removeSelected : function() {
		if (vI_rdfDataTree.__treeElem.view.selection.count == 0) return;
		var warning = vI_rdfDataTree.__strings.getString("vI_rdfDataTree.remove.Warning1") + " " +
			vI_rdfDataTree.__treeElem.view.selection.count + " " +
			vI_rdfDataTree.__strings.getString("vI_rdfDataTree.remove.Warning2")
		
		if (!vI_rdfDataTree.promptService.confirm(window,"Warning",warning)) return;
		
		var start = new Object(); var end = new Object();
		var numRanges = vI_rdfDataTree.__treeElem.view.selection.getRangeCount();

		for (var t=0; t<numRanges; t++){
			vI_rdfDataTree.__treeElem.view.selection.getRangeAt(t,start,end);
			for (var v=start.value; v<=end.value; v++){
				vI_rdfDatasource.removeVIdentityFromRDF(vI_rdfDataTree.__idTable[v]["resource"])
			}
		}
		
		vI_rdfDataTree.__idData = null; vI_rdfDataTree.__idTable = null;
		vI_rdfDataTree.loadTable();
	},
	
	selectAll : function() {
		vI_rdfDataTree.__treeElem.view.selection.selectAll();
	},
	
	newItem : function() {
		var newItemPreset = { 
				recipientCol : "",
				typeCol : document.getElementById("vI_rdfDataTreeBundle").getString("vI_rdfDataTree.dataType.email"),
				senderCol : "",
				smtpKey : "",
				idKey : gAccountManager.defaultAccount.defaultIdentity.key,
				resource : null }
		window.openDialog("chrome://v_identity/content/vI_rdfDataEditor.xul",0,
			"chrome, dialog, modal, alwaysRaised, resizable=yes",
			newItemPreset,
			vI_rdfDatasource).focus();
		vI_rdfDataTree.__idData = null; vI_rdfDataTree.__idTable = null;
		vI_rdfDataTree.loadTable();
	}
};
