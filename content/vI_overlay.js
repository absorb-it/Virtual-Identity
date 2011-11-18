
Components.utils.import("resource://v_identity/vI_nameSpaceWrapper.js");
virtualIdentityExtension.ns(function() { with (virtualIdentityExtension.LIB) {
  // this is the entry place, nameSpaceWrapper is loaded and the show can start
  try {
    Components.utils.import("resource://v_identity/plugins/conversations.js", virtualIdentityExtension);
    Components.utils.import("resource://v_identity/vI_threadTreeColumns.js", virtualIdentityExtension);
  } catch(e) {
    vI.dumpCallStack(e);
  }


}});