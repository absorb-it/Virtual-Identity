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

virtualIdentityExtension.ns(function() { with (virtualIdentityExtension.LIB) {
//prepares an object for easy comparison against another. for strings, lowercases them
function prepareForComparison (o) {
	if (typeof o == "string") { return o.toLowerCase().replace(/\"/g,""); }
// 	if (typeof o == "number") { return o; }
	return "";
};


function rdfDataTree(treeType, rdfDatasource) {
	this.treeType = treeType;
    this._rdfDatasource = rdfDatasource;
	this.filterText = "";
	this.loadTable();
};

rdfDataTree.prototype = {
	idTable : null,
	idData : null,
	filterText : null,
	treeType : null,
    _rdfDatasource : null,

    get treeElem() { return document.getElementById("rdfDataTree_" + this.treeType); },
	get tabElem() { return document.getElementById(this.treeType + "Tab"); },
	
	//this function is called every time the tree is sorted, filtered, or reloaded
	loadTable : function() {
//         if (vI.notificationBar) vI.notificationBar.dump("## rdfDataTree: loadTable.\n");
		//remember scroll position. this is useful if this is an editable table
		//to prevent the user from losing the row they edited
		var topVisibleRow = null;
		if (this.idTable) { topVisibleRow = this.treeElem.treeBoxObject.getFirstVisibleRow(); }
		if (this.idData == null) {
			this.idData = [];
			this._rdfDatasource.readAllEntriesFromRDF(this.addNewDatum, this.treeType, this.idData);
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
		if (topVisibleRow && topVisibleRow <= this.idTable.length) {
			this.treeElem.treeBoxObject.scrollToRow(topVisibleRow);
		}

		// set Tab label
		this.tabElem.setAttribute("label", this.treeType + " (" + this.idTable.length + ")");
//         if (vI.notificationBar) vI.notificationBar.dump("## rdfDataTree: loadTable done.\n");
	},

	addNewDatum : function(resource, name, localIdentityData, idData) {
		var pref = { 	recipientCol : name,
				indexCol : idData.length + 1 + ".",
				senderCol : localIdentityData.combinedName,
				smtpCol : localIdentityData.smtp.value,
//				smtpKey : localIdentityData.smtp.key,
				idCol : localIdentityData.id.value,
//				idKey : localIdentityData.id.key,
				resource : resource,
				identityData : localIdentityData}
// 		vI.notificationBar.dump("## addNewDatum.\n");
		localIdentityData.extras.addPrefs(pref);
		idData.push(pref);
	},
	sort : function(columnName) {
// 		vI.notificationBar.dump("## sort: " + columnName + ".\n");
		var order = this.treeElem.getAttribute("sortDirection") == "ascending" ? 1 : -1;
		//if the column is passed and it's already sorted by that column, reverse sort
		if (columnName && (this.treeElem.getAttribute("sortResource") == columnName)) {
				order *= -1;
		}
		
		function columnSort(a, b) {
			if (prepareForComparison(a[columnName]) > 
				prepareForComparison(b[columnName])) return 1 * order;
			if (prepareForComparison(a[columnName]) < 
				prepareForComparison(b[columnName])) return -1 * order;
			return 0;
		}
		if (!columnName)
          columnName = this.treeElem.getAttribute("sortResource")
        
        this.idTable.sort(columnSort);
		
		//setting these will make the sort option persist
		this.treeElem.setAttribute("sortDirection", order == 1 ? "ascending" : "descending");
		this.treeElem.setAttribute("sortResource", columnName);
		
		this.treeElem.view = new rdfDataTreeCollection.treeView(this.idTable);
		
		//set the appropriate attributes to show to indicator
		var cols = this.treeElem.getElementsByTagName("treecol");
		for (var i = 0; i < cols.length; i++) {
			cols[i].removeAttribute("sortDirection");
			if (cols[i].id.match(columnName))
				cols[i].setAttribute("sortDirection", order == 1 ? "ascending" : "descending");
		}
	}
};

var rdfDataTreeCollection = {
	promptService : Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
			.getService(Components.interfaces.nsIPromptService),

	treeTypes : Array("email", "maillist", "newsgroup", "filter"),

	trees : {},
	tabbox : null,
	
	_strings : null,
    _rdfDatasource : null,
	
	onTabSelect : function () {
		rdfDataTreeCollection.hideInfoBox();
		if (rdfDataTreeCollection.tabbox) {
			rdfDataTreeCollection.moveConstraints();
			rdfDataTreeCollection.updateButtonMenu();
		}
	},
	
	onselect : function () {
		rdfDataTreeCollection.moveConstraints();
		rdfDataTreeCollection.updateButtonMenu();

		var tree = rdfDataTreeCollection.trees[rdfDataTreeCollection.tabbox.selectedPanel.id];
		var htmlBox = document.getElementById("rdfDataTreeCollectionInfoBox")
		if (tree.treeElem.view.selection.count != 1)
			{ rdfDataTreeCollection.hideInfoBox(); return; }
		
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
		rdfDataTreeCollection.infoBoxHidden = false;
		htmlBox.setAttribute("style", "height:" + htmlBox.contentDocument.lastChild.scrollHeight +"px");
		rdfDataTreeCollection.overflow(); // better resize one time too much, mozilla is still magic  :)
	},

	init : function() {
		rdfDataTreeCollection.tabbox = document.getElementById("TreeTabbox");
		rdfDataTreeCollection._strings = document.getElementById("vI_rdfDataTreeBundle");

		rdfDataTreeCollection._rdfDatasource = new vI.rdfDatasource("virtualIdentity.rdf");
		
		for each (var treeType in rdfDataTreeCollection.treeTypes)
			rdfDataTreeCollection.trees[treeType] = new rdfDataTree(treeType, rdfDataTreeCollection._rdfDatasource);
	},
	
    clean : function() {
        if (rdfDataTreeCollection._rdfDatasource) rdfDataTreeCollection._rdfDatasource.clean();
    },

    get _braille() {
		var prefRoot = Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefService).getBranch(null);
		var braille = false;
		try {	braille = (prefRoot.getCharPref("accessibility.usebrailledisplay") || 
				prefRoot.getCharPref("accessibility.usetexttospeech")); }
		catch (e) { };
		return braille;
	},

	// generic custom tree view stuff
	treeView : function (table) {
		this.rowCount = table.length;
		this.getCellText = function(row, col) {
			var retValue = table[row][col.id.substr(0,col.id.indexOf("_"))];
			if (!rdfDataTreeCollection._braille && (retValue == "no" || retValue == "yes"))
				return ""; // image will be used as indicator
			else return retValue;
		};
		this.getCellValue = function(row, col) {
			return this.getCellText(row, col);
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
			var treeType = rdfDataTreeCollection.tabbox.selectedPanel.id;
			if (treeType != "filter")
				rdfDataTreeCollection.trees[treeType].sort(col.id.substr(0,col.id.indexOf("_")));
		};
		this.getCellProperties = function(row,col,props){
			if (rdfDataTreeCollection._braille) return;
			var aserv=Components.classes["@mozilla.org/atom-service;1"].
				getService(Components.interfaces.nsIAtomService);
			switch (table[row][col.id.substr(0,col.id.indexOf("_"))]) {
				case "yes":	props.AppendElement(aserv.getAtom("yes")); break;
				case "no":	props.AppendElement(aserv.getAtom("no")); break;
			}
		};
	},

	
	__setFilter : function (text) {
		// loop trough all trees
		for each (var treeType in rdfDataTreeCollection.treeTypes) {
			var tree = rdfDataTreeCollection.trees[treeType];
			tree.filterText = text;
			tree.loadTable();
		}
	},

	inputFilter : function(event) {
		//do this now rather than doing it at every comparison
		var value = prepareForComparison(event.target.value);
		rdfDataTreeCollection.__setFilter(value);
		document.getElementById("clearFilter").disabled = value.length == 0;
	},
	
	clearFilter : function() {
		document.getElementById("clearFilter").disabled = true;
		var filterElement = document.getElementById("filter");
		filterElement.focus();
		filterElement.value = "";
		rdfDataTreeCollection.__setFilter("");
	},
	
	__updateMenu : function(modifySelected, removeSelected) {
		var tree = rdfDataTreeCollection.trees[rdfDataTreeCollection.tabbox.selectedPanel.id];
		var noSelections = (tree.treeElem.view.selection.count == 0)
		modifySelected.setAttribute("disabled", noSelections)
		removeSelected.setAttribute("disabled", noSelections)	
	},
	
	updateButtonMenu : function() {
		rdfDataTreeCollection.__updateMenu(
			document.getElementById("editButton_" + rdfDataTreeCollection.tabbox.selectedPanel.id),
			document.getElementById("deleteButton_" + rdfDataTreeCollection.tabbox.selectedPanel.id))
	},
	
	updateContextMenu : function() {
		rdfDataTreeCollection.__updateMenu(
			document.getElementById("context_modifySelected"),
			document.getElementById("context_removeSelected"))
	},
	
	updateMenu : function() {
		rdfDataTreeCollection.__updateMenu(
			document.getElementById("menu_modifySelected"),
			document.getElementById("menu_removeSelected"))
	},

	modifySelected : function() {
		var treeType = rdfDataTreeCollection.tabbox.selectedPanel.id;
		var tree = rdfDataTreeCollection.trees[treeType];
		if (tree.treeElem.view.selection.count == 0) return;
		if (tree.treeElem.view.selection.count > 5) {
			var warning = rdfDataTreeCollection._strings.getString("vI_rdfDataTree.modify.Warning1") + " " +
				tree.treeElem.view.selection.count + " " +
				rdfDataTreeCollection._strings.getString("vI_rdfDataTree.modify.Warning2")
			if (!rdfDataTreeCollection.promptService.confirm(window,"Warning",warning)) return;
		}
		
		var start = new Object(); var end = new Object();
		var numRanges = tree.treeElem.view.selection.getRangeCount();

		var retVar = { treeType: null };
		for (var t=0; t<numRanges; t++){
			tree.treeElem.view.selection.getRangeAt(t,start,end);
			for (var v=start.value; v<=end.value; v++)
				window.openDialog("chrome://v_identity/content/vI_rdfDataEditor.xul",0,
					"chrome, dialog, modal, alwaysRaised, resizable=yes",
					tree.idTable[v], treeType,
					rdfDataTreeCollection._rdfDatasource, retVar).focus();
		}
		
		// reload all trees (multiple types might have changed)
		for each (var treeType in rdfDataTreeCollection.treeTypes) {
			rdfDataTreeCollection.trees[treeType].idData = null;
			rdfDataTreeCollection.trees[treeType].loadTable()
		}
		rdfDataTreeCollection.tabbox.selectedTab = document.getElementById(retVar.treeType + "Tab");
		rdfDataTreeCollection.hideInfoBox();
	},
	
	removeSelected : function() {
		var treeType = rdfDataTreeCollection.tabbox.selectedPanel.id;
		var tree = rdfDataTreeCollection.trees[treeType];
		if (tree.treeElem.view.selection.count == 0) return;
		var warning = rdfDataTreeCollection._strings.getString("vI_rdfDataTree.remove.Warning1") + " " +
			tree.treeElem.view.selection.count + " " +
			rdfDataTreeCollection._strings.getString("vI_rdfDataTree.remove.Warning2")
		
		if (!rdfDataTreeCollection.promptService.confirm(window,"Warning",warning)) return;
		
		var start = new Object(); var end = new Object();
		var numRanges = tree.treeElem.view.selection.getRangeCount();

		for (var t=0; t<numRanges; t++){
			tree.treeElem.view.selection.getRangeAt(t,start,end);
			for (var v=start.value; v<=end.value; v++){
				rdfDataTreeCollection._rdfDatasource.removeVIdentityFromRDF(tree.idTable[v]["resource"], treeType)
			}
		}
		
		tree.idData = null; tree.idTable = null;
		tree.loadTable();
		rdfDataTreeCollection.hideInfoBox();
	},
	
	moveConstraints : function() {
		var treeType = rdfDataTreeCollection.tabbox.selectedPanel.id;
		if (treeType != "filter") return;
		var tree = rdfDataTreeCollection.trees[treeType];
		if (tree.treeElem.view.selection.count == 0) {
			document.getElementById("reorderUpButton_filter").setAttribute("disabled","true");
			document.getElementById("reorderDownButton_filter").setAttribute("disabled","true");
			return;
		};
		var start = new Object(); var end = new Object();
		var numRanges = tree.treeElem.view.selection.getRangeCount();
		if (numRanges > 1) {
			document.getElementById("reorderUpButton_filter").setAttribute("disabled","true");
			document.getElementById("reorderDownButton_filter").setAttribute("disabled","true");
			return;
		}
		tree.treeElem.view.selection.getRangeAt(0,start,end);
		if (start.value > 0)
			document.getElementById("reorderUpButton_filter").removeAttribute("disabled");
		else	document.getElementById("reorderUpButton_filter").setAttribute("disabled","true");
		if (end.value < tree.idTable.length - 1)
			document.getElementById("reorderDownButton_filter").removeAttribute("disabled");
		else	document.getElementById("reorderDownButton_filter").setAttribute("disabled","true");
	},

	moveUpSelected : function() {
		var treeType = rdfDataTreeCollection.tabbox.selectedPanel.id;
		if (treeType != "filter") return; // just to be safe, button should be disabled
		var tree = rdfDataTreeCollection.trees[treeType];
		if (tree.treeElem.view.selection.count == 0) return; // just to be safe, button should be disabled

		var start = new Object(); var end = new Object();
		var numRanges = tree.treeElem.view.selection.getRangeCount();
		if (numRanges > 1) return;  // just to be safe, button should be disabled
		
		tree.treeElem.view.selection.getRangeAt(0,start,end);
		for (var v=start.value; v<=end.value; v++){
			var resource = rdfDataTreeCollection._rdfDatasource.filterContainer.RemoveElementAt(v+1, true);
			rdfDataTreeCollection._rdfDatasource.filterContainer.InsertElementAt(resource,v,true); 
		}
		tree.idData = null; tree.idTable = null;
		tree.loadTable();
		tree.treeElem.view.selection.rangedSelect(start.value-1,end.value-1,false);
	},

	moveDownSelected : function() {
		var treeType = rdfDataTreeCollection.tabbox.selectedPanel.id;
		if (treeType != "filter") return; // just to be safe, button should be disabled
		var tree = rdfDataTreeCollection.trees[treeType];
		if (tree.treeElem.view.selection.count == 0) return; // just to be safe, button should be disabled

		var start = new Object(); var end = new Object();
		var numRanges = tree.treeElem.view.selection.getRangeCount();
		if (numRanges > 1) return;  // just to be safe, button should be disabled
		
		tree.treeElem.view.selection.getRangeAt(0,start,end);
		for (var v=end.value; v>=start.value; v--){
			var resource = rdfDataTreeCollection._rdfDatasource.filterContainer.RemoveElementAt(v+1, true);
			rdfDataTreeCollection._rdfDatasource.filterContainer.InsertElementAt(resource,v+2,true); 
		}
		tree.idData = null; tree.idTable = null;
		tree.loadTable();
		tree.treeElem.view.selection.rangedSelect(start.value+1,end.value+1,false);
	},

	infoBoxHidden : true,
	overflow : function() {
		if (rdfDataTreeCollection.infoBoxHidden) return;
		var htmlBox = document.getElementById("rdfDataTreeCollectionInfoBox")
		htmlBox.setAttribute("style", "height:" + htmlBox.contentDocument.lastChild.scrollHeight +"px");
	},

	hideInfoBox : function() {
		rdfDataTreeCollection.infoBoxHidden = true;
		document.getElementById("rdfDataTreeCollectionInfoBox").setAttribute("style", "height:0px");
		for each (var treeType in rdfDataTreeCollection.treeTypes) {
			try { if (rdfDataTreeCollection.trees[treeType])
				rdfDataTreeCollection.trees[treeType].treeElem.view.selection.selectNone() } catch (e) { }
		}
	},

	selectAll : function() {
		var treeType = rdfDataTreeCollection.tabbox.selectedPanel.id;
		var tree = rdfDataTreeCollection.trees[treeType];
		tree.treeElem.view.selection.selectAll();
	},
	
	newItem : function() {
		var treeType = rdfDataTreeCollection.tabbox.selectedPanel.id;
		var newItemPreset = { identityData : new vI.identityData ("", null, null, vI.NO_SMTP_TAG, null, null) };
		var retVar = { treeType: null };

		window.openDialog("chrome://v_identity/content/vI_rdfDataEditor.xul",0,
			"chrome, dialog, modal, alwaysRaised, resizable=yes",
			newItemPreset, treeType,
			rdfDataTreeCollection._rdfDatasource, retVar).focus();

		// reload all trees (multiple types might have changed)
		for each (var treeType in rdfDataTreeCollection.treeTypes) {
			rdfDataTreeCollection.trees[treeType].idData = null;
			rdfDataTreeCollection.trees[treeType].idTable = null;
			rdfDataTreeCollection.trees[treeType].loadTable()
		}
		rdfDataTreeCollection.tabbox.selectedTab = document.getElementById(retVar.treeType + "Tab");
		rdfDataTreeCollection.hideInfoBox();
	}
};
dump("registering global rdfDataTreeCollection\n");
vI.rdfDataTreeCollection = rdfDataTreeCollection;
vI.rdfDataTree = rdfDataTree;
dump("registering global rdfDataTreeCollection done " + vI.initTime + " " + vI.rdfDataTreeCollection + "\n");
}});