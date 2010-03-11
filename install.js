// This code is heavily inspired by Chris Pederick (useragentswitcher) install.js
// Contributors: Philip Chee, deathburger
//
// Philip Chee: Added installation of prefs, components, and locales.
// deathburger: Refactored to move all changable items to the top of the file.

// Editable Items Begin
var displayName         = "Virtual Identity"; // The name displayed to the user (don't include the version)
var version             = "0.6.4";
var name                = "v_identity"; // The leafname of the JAR file (without the .jar part)

// The following three sets of variables tell this installer script how your
// extension directory structure looks.
// If your jar file contains content/packagename use the second packageDir
// variable. Same rule applies for skinDir and localeDir. I set them up
// independent of each other just in case an extension layout is wacky.
//var packageDir           = "/"
var packageDir           = "/" + name + "/"
//var skinDir           = "/"
var skinDir           = "/" + name + "/"
//var localeDir           = "/"
var localeDir           = "/" + name + "/"

var locales             = new Array( "cs-CZ", "de-DE", "en-US", "es-ES", "fr", "nl", "ru-RU" );
var skins               = new Array( "classic" ); // "modern"
var prefs               = new Array( "preferences.js" );
var components          = new Array(  );
var searchPlugins       = new Array(  );

// Mozilla Suite/Seamonkey stores all pref files in a single directory
// under the application directory.  If the name of the preference file(s)
// is/are not unique enough, you may override other extension preferences.
// set this to true if you need to prevent this.
var disambiguatePrefs   = true;

// Editable Items End

var jarName             = name + ".jar";
var jarFolder           = "content" + packageDir
var error               = null;

var folder              = getFolder("Profile", "chrome");
var prefFolder          = getFolder(getFolder("Program", "defaults"), "pref");
var compFolder          = getFolder("Components");
var searchFolder        = getFolder("Plugins");

var existsInApplication = File.exists(getFolder(getFolder("Chrome"), jarName));
var existsInProfile     = File.exists(getFolder(folder, jarName));

var contentFlag         = CONTENT | PROFILE_CHROME;
var localeFlag          = LOCALE | PROFILE_CHROME;
var skinFlag            = SKIN | PROFILE_CHROME;

// If the extension exists in the application folder or it doesn't exist
// in the profile folder and the user doesn't want it installed to the
// profile folder
//~ if(existsInApplication ||
    //~ (!existsInProfile &&
      //~ !confirm( "Do you want to install the " + displayName +
                //~ " extension into your profile folder?\n" +
                //~ "(Cancel will install into the application folder)")))
//~ {
    contentFlag = CONTENT | DELAYED_CHROME;
    folder      = getFolder("chrome");
    localeFlag  = LOCALE | DELAYED_CHROME;
    skinFlag    = SKIN | DELAYED_CHROME;
//~ }

initInstall(displayName, name, version);
setPackageFolder(folder);
error = addFile(name, version, "chrome/" + jarName, folder, null);

// If adding the JAR file succeeded
if(error == SUCCESS)
{
    folder = getFolder(folder, jarName);

    registerChrome(contentFlag, folder, jarFolder);
    for (var i = 0; i < locales.length; i++) {
        registerChrome(localeFlag, folder, "locale/" + locales[i] + localeDir);
    }

    for (var i = 0; i < skins.length; i++) {
        registerChrome(skinFlag, folder, "skin/" + skins[i] + skinDir);
    }

    for (var i = 0; i < prefs.length; i++) {
        if (!disambiguatePrefs) {
            addFile(name + " Defaults", version, "defaults/preferences/" + prefs[i],
                prefFolder, prefs[i], true);
        } else {
            addFile(name + " Defaults", version, "defaults/preferences/" + prefs[i],
                prefFolder, name + "-" + prefs[i], true);
        }
    }

    for (var i = 0; i < components.length; i++) {
        addFile(name + " Components", version, "components/" + components[i],
            compFolder, components[i], true);
    }

    for (var i = 0; i < searchPlugins.length; i++) {
        addFile(name + " searchPlugins", version, "searchplugins/" + searchPlugins[i],
            searchFolder, searchPlugins[i], true);
    }

    error = performInstall();

    // If the install failed
    if(error != SUCCESS && error != REBOOT_NEEDED)
    {
        displayError(error);
    	cancelInstall(error);
    }
    else
    {
        alert("The installation of the " + displayName + " extension succeeded.");
    }
}
else
{
    displayError(error);
	cancelInstall(error);
}

// Displays the error message to the user
function displayError(error)
{
    // If the error code was -215
    if(error == READ_ONLY)
    {
        alert("The installation of " + displayName +
            " failed.\nOne of the files being overwritten is read-only.");
    }
    // If the error code was -235
    else if(error == INSUFFICIENT_DISK_SPACE)
    {
        alert("The installation of " + displayName +
            " failed.\nThere is insufficient disk space.");
    }
    // If the error code was -239
    else if(error == CHROME_REGISTRY_ERROR)
    {
        alert("The installation of " + displayName +
            " failed.\nChrome registration failed.");
    }
    else
    {
        alert("The installation of " + displayName +
            " failed.\nThe error code is: " + error);
    }
}
