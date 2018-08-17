// copied and adapted from http://www.softwareishard.com/blog/planet-mozilla/firefox-extensions-global-namespace-pollution/
// The only global object for this extension.

// the only global symbol polluting the namespace
var EXPORTED_SYMBOLS = ["virtualIdentityExtension"]

var virtualIdentityExtension = {};

ChromeUtils.import("resource://v_identity/vI_log.js", virtualIdentityExtension);
virtualIdentityExtension.Log = virtualIdentityExtension.MyLog;

virtualIdentityExtension.initTime = parseInt((new Date()).getTime());
virtualIdentityExtension.Log.debug("init vI_overlayNameSpaceWrapper " + virtualIdentityExtension.initTime);

(function () {
  this.ns = function (fn) {
    fn.apply({});
  };
}).apply(virtualIdentityExtension);

virtualIdentityExtension.LIB = {
  // Shared APIs
  getCurrentURI: function () {
    virtualIdentityExtension.Log.debug("getCurrentURI " + window.location.href);
    return window.location.href;
  },

  // Extension singleton shortcut
  vI: virtualIdentityExtension
};
