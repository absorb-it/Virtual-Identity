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


//prepares an object for easy comparison against another. for strings, lowercases them
function prepareForComparison (o) {
	if (typeof o == "string") { return o.toLowerCase().replace(/\"/g,""); }
	return "";
};


function rdfDataTree(sourceName) {
	this.treeElem = document.getElementById("rdfDataTree_" + sourceName);
	this.filterText = "";
}
rdfDataTree.prototype = {
	idTable : null,
	idData : null,
	treeElem : null,
	filterText : null,
	
	//this function is called every time the tree is sorted, filtered, or reloaded
	loadTable : function(container) {
		//remember scroll position. this is useful if this is an editable table
		//to prevent the user from losing the row they edited
		var topVisibleRow = null;
		if (this.idTable) { topVisibleRow = this.treeElem.treeBoxObject.getFirstVisibleRow(); }
		if (this.idData == null) {
			this.idData = [];
			vI_rdfDatasource.readAllEntriesFromRDF(container, this);
		}
		if (this.filterText == "") {
			//show all of them
			this.idTable = this.idData;
		} else {
			//filter out the ones we want to display
			this.idTable = [];
			this.idData.forEach(function(element) {
				//we'll match on every property
				for (var i in element) {
					if (prepareForComparison(element[i]).indexOf(this.filterText) != -1) {
						this.idTable.push(element);
						break;
					}
				}
			});
		}	
		this.sort();
		//restore scroll position
		if (topVisibleRow) {
			this.treeElem.treeBoxObject.scrollToRow(topVisibleRow);
		}
	},

	addNewDatum : function(resource, name, localIdentityData, idData) {
		var pref = { 	recipientCol : name,
				typeCol : "type",
				senderCol : localIdentityData.combinedName,
				smtpCol : localIdentityData.smtp.value,
				smtpKey : localIdentityData.smtp.key,
				idCol : localIdentityData.id.value,
				idKey : localIdentityData.id.key,
				resource : resource,
				identityData : localIdentityData}
// 		vI_notificationBar.dump("## addNewDatum.\n");
		localIdentityData.extras.addPrefs(pref);
		idData.push(pref);
	},
	sort : function(column) {
		var columnName;
		var order = this.treeElem.getAttribute("sortDirection") == "ascending" ? 1 : -1;
		//if the column is passed and it's already sorted by that column, reverse sort
		if (column) {
			columnName = column.id;
			if (this.treeElem.getAttribute("sortResource") == columnName) {
				order *= -1;
			}
		} else {
			columnName = this.treeElem.getAttribute("sortResource");
		}
		
		function columnSort(a, b) {
			if (prepareForComparison(a[columnName]) > 
				prepareForComparison(b[columnName])) return 1 * order;
			if (prepareForComparison(a[columnName]) < 
				prepareForComparison(b[columnName])) return -1 * order;
			return 0;
		}
		this.idTable.sort(columnSort);
		//setting these will make the sort option persist
		this.treeElem.setAttribute("sortDirection", order == 1 ? "ascending" : "descending");
		this.treeElem.setAttribute("sortResource", columnName);
		this.treeElem.view = new vI_rdfDataTree.treeView(this.idTable);
		//set the appropriate attributes to show to indicator
		var cols = this.treeElem.getElementsByTagName("treecol");
		for (var i = 0; i < cols.length; i++) {
			cols[i].removeAttribute("sortDirection");
		}
		document.getElementById(columnName).setAttribute("sortDirection", order == 1 ? "ascending" : "descending");
	},

}

var vI_rdfDataTree = {
	promptService : Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
			.getService(Components.interfaces.nsIPromptService),

	trees : {},
	tabbox : null,
	
	_strings : null,
	
	onselect : function () {
vI_notificationBar.dump("## onselect " + vI_rdfDataTree.tabbox.selectedPanel.id + ".\n");
		var tree = vI_rdfDataTree.trees[vI_rdfDataTree.tabbox.selectedPanel.id];
		var htmlBox = document.getElementById("vI_rdfDataTreeInfoBox")
		if (tree.treeElem.view.selection.count != 1)
			{ vI_rdfDataTree.hideInfoBox(); return; }
		
		var identityData = tree.idTable[tree.treeElem.currentIndex]["identityData"];
		var _identityInfo = 
			"<div id='recipientLabel'>" +
				tree.idTable[tree.treeElem.currentIndex]["recipientCol"].replace(/>/g,"&gt;").replace(/</g,"&lt;") +
			"</div><div id='vICard'>" +
			"<table><tr>" +
				"<td class='image'><img src='chrome://v_identity/skin/vi-info.png' /></td>" +
				"<td class='identityTable'>" +
					"<div class='name'>" + identityData.combinedNameHtml + "</div>" +	
					"<table><tbody>" + identityData.getMatrix() + "</tbody></table>" +
				"</td>" +
			"</tr></table></div>"

		htmlBox.outputString = _identityInfo;
		vI_rdfDataTree.infoBoxHidden = false;
		htmlBox.setAttribute("style", "height:" + htmlBox.contentDocument.lastChild.scrollHeight +"px");
		vI_rdfDataTree.overflow(); // better resize one time too much, mozilla is still magic  :)
	},

	init : function() {
		vI_rdfDataTree.tabbox = document.getElementById("TreeTabbox");
		vI_rdfDataTree._strings = document.getElementById("vI_rdfDataTreeBundle");

		vI_rdfDatasource.init();
		vI_storageExtrasHelper.hideUnusedTreeCols(); // XXX what happens heree ?? :)
		
		vI_rdfDataTree.trees["email"] = new rdfDataTree("email");
		vI_rdfDataTree.trees["email"].loadTable(vI_rdfDatasource.emailContainer);
		vI_rdfDataTree.trees["maillist"] = new rdfDataTree("maillist");
		vI_rdfDataTree.trees["maillist"].loadTable(vI_rdfDatasource.maillistContainer);
		vI_rdfDataTree.trees["newsgroup"] = new rdfDataTree("newsgroup");
		vI_rdfDataTree.trees["newsgroup"].loadTable(vI_rdfDatasource.newsgroupContainer);
		vI_rdfDataTree.trees["filter"] = new rdfDataTree("filter");
		vI_rdfDataTree.trees["filter"].loadTable(vI_rdfDatasource.filterContainer);
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
// loop trough all trees
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
		var tree = vI_rdfDataTree.trees[vI_rdfDataTree.tabbox.selectedPanel.id];
		var noSelections = (tree.treeElem.view.selection.count == 0)
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
		var tree = vI_rdfDataTree.trees[vI_rdfDataTree.tabbox.selectedPanel.id];
		if (tree.treeElem.view.selection.count == 0) return;
		if (tree.treeElem.view.selection.count > 5) {
			var warning = vI_rdfDataTree._strings.getString("vI_rdfDataTree.modify.Warning1") + " " +
				tree.treeElem.view.selection.count + " " +
				vI_rdfDataTree._strings.getString("vI_rdfDataTree.modify.Warning2")
			if (!vI_rdfDataTree.promptService.confirm(window,"Warning",warning)) return;
		}
		
		var start = new Object(); var end = new Object();
		var numRanges = tree.treeElem.view.selection.getRangeCount();

		for (var t=0; t<numRanges; t++){
			tree.treeElem.view.selection.getRangeAt(t,start,end);
			for (var v=start.value; v<=end.value; v++)
				window.openDialog("chrome://v_identity/content/vI_rdfDataEditor.xul",0,
					"chrome, dialog, modal, alwaysRaised, resizable=yes",
					tree.idTable[v],
					vI_rdfDatasource).focus();
		}
		
		tree.idData = null; tree.idTable = null;
		vI_rdfDataTree.loadTable(vI_rdfDataTree.tabbox.selectedPanel.id);
		vI_rdfDataTree.hideInfoBox();
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
				vI_rdfDatasource.removeBagForResource(vI_rdfDataTree.__idTable[v]["resource"], vI_rdfDataTree.__idTable[v]["type"])
				vI_rdfDatasource.removeVIdentityFromRDF(vI_rdfDataTree.__idTable[v]["resource"])
			}
		}
		
		vI_rdfDataTree.__idData = null; vI_rdfDataTree.__idTable = null;
		vI_rdfDataTree.loadTable();
		vI_rdfDataTree.hideInfoBox();
	},
	

	infoBoxHidden : true,
	overflow : function() {
		if (vI_rdfDataTree.infoBoxHidden) return;
		var htmlBox = document.getElementById("vI_rdfDataTreeInfoBox")
		htmlBox.setAttribute("style", "height:" + htmlBox.contentDocument.lastChild.scrollHeight +"px");

	},

	hideInfoBox : function() {
		vI_rdfDataTree.infoBoxHidden = true;
		document.getElementById("vI_rdfDataTreeInfoBox").setAttribute("style", "height:0px");
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
		vI_rdfDataTree.hideInfoBox();
	}
};
