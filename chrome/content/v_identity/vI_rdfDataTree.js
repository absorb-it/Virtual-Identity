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


function rdfDataTree(treeType) {
	this.treeType = treeType;
	this.filterText = "";
	this.loadTable();
}
rdfDataTree.prototype = {
	idTable : null,
	idData : null,
	filterText : null,
	treeType : null,

	get treeElem() { return document.getElementById("rdfDataTree_" + this.treeType); },
	get tabElem() { return document.getElementById(this.treeType + "Tab"); },
	
	//this function is called every time the tree is sorted, filtered, or reloaded
	loadTable : function() {
		//remember scroll position. this is useful if this is an editable table
		//to prevent the user from losing the row they edited
		var topVisibleRow = null;
		if (this.idTable) { topVisibleRow = this.treeElem.treeBoxObject.getFirstVisibleRow(); }
		if (this.idData == null) {
			this.idData = [];
			vI_rdfDatasource.readAllEntriesFromRDF(this.addNewDatum, this.treeType, this.idData);
		}
		if (this.filterText == "") {
			//show all of them
			this.idTable = this.idData;
		} else {
			//filter out the ones we want to display
			var curTable = [];
			var curFilterText = this.filterText;
			this.idData.forEach(function(element) {
				//we'll match on every property
				for (var i in element) {
					if (prepareForComparison(element[i]).indexOf(curFilterText) != -1) {
						curTable.push(element);
						break;
					}
				}
			});
			this.idTable = curTable;
		}	
		this.sort();
		
		//restore scroll position
		if (topVisibleRow) {
			this.treeElem.treeBoxObject.scrollToRow(topVisibleRow);
		}

		// set Tab label
		this.tabElem.setAttribute("label", this.treeType + " (" + this.idTable.length + ")");
	},

	addNewDatum : function(resource, name, localIdentityData, idData) {
		var pref = { 	recipientCol : name,
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

	treeTypes : Array("email", "maillist", "newsgroup", "filter"),

	trees : {},
	tabbox : null,
	
	_strings : null,
	
	onselect : function () {
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
		
		for each (var treeType in vI_rdfDataTree.treeTypes) {
			vI_rdfDataTree.trees[treeType] = new rdfDataTree(treeType);
		}
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
		this.cycleHeader = function(col, elem) {
			var tree = vI_rdfDataTree.trees[vI_rdfDataTree.tabbox.selectedPanel.id];
			tree.sort(col)
		};
	},

	
	__setFilter : function (text) {
		// loop trough all trees
		for each (var treeType in vI_rdfDataTree.treeTypes) {
			var tree = vI_rdfDataTree.trees[treeType];
			tree.filterText = text;
			tree.loadTable();
		}
	},

	inputFilter : function(event) {
		//do this now rather than doing it at every comparison
		var value = prepareForComparison(event.target.value);
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
		var treeType = vI_rdfDataTree.tabbox.selectedPanel.id;
		var tree = vI_rdfDataTree.trees[treeType];
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
					tree.idTable[v], treeType,
					vI_rdfDatasource).focus();
		}
		
		// reload all trees (types might have changed)
		for each (var treeType in vI_rdfDataTree.treeTypes) {
			vI_rdfDataTree.trees[treeType].idData = null;
			vI_rdfDataTree.trees[treeType].idTable = null;
			vI_rdfDataTree.trees[treeType].loadTable()
		}
		vI_rdfDataTree.hideInfoBox();
	},
	
	removeSelected : function() {
		var treeType = vI_rdfDataTree.tabbox.selectedPanel.id;
		var tree = vI_rdfDataTree.trees[treeType];
		if (tree.treeElem.view.selection.count == 0) return;
		var warning = vI_rdfDataTree._strings.getString("vI_rdfDataTree.remove.Warning1") + " " +
			tree.treeElem.view.selection.count + " " +
			vI_rdfDataTree._strings.getString("vI_rdfDataTree.remove.Warning2")
		
		if (!vI_rdfDataTree.promptService.confirm(window,"Warning",warning)) return;
		
		var start = new Object(); var end = new Object();
		var numRanges = tree.treeElem.view.selection.getRangeCount();

		for (var t=0; t<numRanges; t++){
			tree.treeElem.view.selection.getRangeAt(t,start,end);
			for (var v=start.value; v<=end.value; v++){
				vI_rdfDatasource.removeVIdentityFromRDF(tree.idTable[v]["resource"], treeType)
			}
		}
		
		tree.idData = null; tree.idTable = null;
		tree.loadTable();
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
		for each (var treeType in vI_rdfDataTree.treeTypes) {
			vI_rdfDataTree.trees[treeType].treeElem.view.selection.selectNone();
		}
	},

	selectAll : function() {
		var treeType = vI_rdfDataTree.tabbox.selectedPanel.id;
		var tree = vI_rdfDataTree.trees[treeType];
		tree.treeElem.view.selection.selectAll();
	},
	
	newItem : function() {
		alert("XXX repair this");
		var newItemPreset = { 
				recipientCol : "",
				senderCol : "",
				smtpKey : "",
				idKey : gAccountManager.defaultAccount.defaultIdentity.key,
				resource : null }
		window.openDialog("chrome://v_identity/content/vI_rdfDataEditor.xul",0,
			"chrome, dialog, modal, alwaysRaised, resizable=yes",
			newItemPreset, "email",
			vI_rdfDatasource).focus();
		vI_rdfDataTree.__idData = null; vI_rdfDataTree.__idTable = null;
		vI_rdfDataTree.loadTable();
		vI_rdfDataTree.hideInfoBox();
	}
};
