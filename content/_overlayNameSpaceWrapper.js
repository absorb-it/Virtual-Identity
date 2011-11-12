// copied and adapted from http://www.softwareishard.com/blog/planet-mozilla/firefox-extensions-global-namespace-pollution/
// The only global object for this extension.

// prevent double initializations by different overlays
if (typeof(virtualIdentityExtension ) == "undefined") {
	var virtualIdentityExtension = {};
	virtualIdentityExtension.initTime = parseInt((new Date()).getTime());
	dump("init vI_overlayNameSpaceWrapper " + virtualIdentityExtension.initTime + "\n");

	(function() { this.ns = function(fn) { fn.apply({}); };  }).apply(virtualIdentityExtension);

	virtualIdentityExtension.LIB = {
		// Shared APIs
		getCurrentURI: function() { dump("getCurrentURI " + window.location.href + "\n"); return window.location.href; },

		// Extension singleton shortcut
		vI: virtualIdentityExtension
	};
}