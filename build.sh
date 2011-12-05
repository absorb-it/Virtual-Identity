#!/bin/bash
# build.sh -- builds JAR and XPI files for mozilla extensions
#   by Nickolay Ponomarev <asqueella@gmail.com>
#   (original version based on Nathan Yergler's build script)
# Most recent version is at <http://kb.mozillazine.org/Bash_build_script>

# This script assumes the following directory structure:
# ./
#   chrome.manifest (optional - for newer extensions)
#   install.rdf
#   (other files listed in $ROOT_FILES)
#
#   content/    |
#   locale/     |} these can be named arbitrary and listed in $CHROME_PROVIDERS
#   skin/       |
#
#   defaults/   |
#   components/ |} these must be listed in $ROOT_DIRS in order to be packaged
#   ...         |
#
# It uses a temporary directory ./build when building; don't use that!
# Script's output is:
# ./$APP_NAME.xpi
# ./$APP_NAME.jar  (only if $KEEP_JAR=1)
# ./files -- the list of packaged files
#
# Note: It modifies chrome.manifest when packaging so that it points to 
#       chrome/$APP_NAME.jar!/*

#
# default configuration file is ./config_build.sh, unless another file is 
# specified in command-line. Available config variables:
APP_NAME=          # short-name, jar and xpi files name. Must be lowercase with no spaces
CHROME_PROVIDERS=  # which chrome providers we have (space-separated list)
CLEAN_UP=          # delete the jar / "files" when done?       (1/0)
ROOT_FILES=        # put these files in root of xpi (space separated list of leaf filenames)
ROOT_DIRS=         # ...and these directories       (space separated list)
BEFORE_BUILD=      # run this before building       (bash command)
AFTER_BUILD=       # ...and this after the build    (bash command)

if [ -z $1 ]; then
  . ./build_config.sh
else
  . $1
fi

if [ -z $APP_NAME ]; then
  echo "You need to create build config file first!"
  echo "Read comments at the beginning of this script for more info."
  exit;
fi

ROOT_DIR=`pwd`
TMP_DIR=build

#uncomment to debug
#set -x

# remove any left-over files from previous build
rm -f $APP_NAME.jar $APP_NAME_*.xpi files
rm -rf $TMP_DIR

$BEFORE_BUILD

# ---detect version
REV=$(git log -n 1 --abbrev-commit --abbrev=8 | grep "commit" | cut -d" " -f2 | cut -d"." -f1)
#CLEAN=$(git status | grep "working directory clean")
CLEAN="true"
TAG=$(git describe 2>/dev/null)
INTERMEDIATE=$(git describe 2>/dev/null | grep "-")

LOCALVERSION=$(cut -d"\"" -f 2 content/_version.dtd)
if [ "$TAG" ]; then
    VERSION=$TAG
else
    VERSION=$LOCALVERSION"-x-"g$REV
fi
if [ -z "$CLEAN" ]; then
    VERSION=$VERSION"++"
fi
# --- version detected

mkdir --parents  $TMP_DIR/chrome

# generate the JAR file, excluding CVS, SVN, and temporary files
JAR_FILE=$TMP_DIR/chrome/$APP_NAME.jar
echo "Generating $JAR_FILE..."
for CHROME_SUBDIR in $CHROME_PROVIDERS; do
  find $CHROME_SUBDIR \( -path '*CVS*' -o -path '*.svn*' \) -prune -o -type f -print | grep -v \~ >> files
done

#zip -0 -r $JAR_FILE -@ < files
# The following statement should be used instead if you don't wish to use the JAR file
cp  --parents `cat files` $TMP_DIR/chrome

# prepare components and defaults
echo "Copying various files to $TMP_DIR folder..."
for DIR in $ROOT_DIRS; do
  mkdir $TMP_DIR/$DIR
  FILES="`find $DIR \( -path '*CVS*' -o -path '*.svn*' \) -prune -o -type f -print | grep -v \~`"
  echo $FILES >> files
  cp  --parents $FILES $TMP_DIR
done

# Copy other files to the root of future XPI.
for ROOT_FILE in $ROOT_FILES install.rdf chrome.manifest; do
  cp  $ROOT_FILE $TMP_DIR
  if [ -f $ROOT_FILE ]; then
    echo $ROOT_FILE >> files
  fi
done

cd $TMP_DIR
find . -iname '.git' -type d -exec rm -rf {} \; 2>/dev/null
find . -iname '.*.sw*' -exec rm -f {} \; 2>/dev/null
find . -iname 'tests' -type d -exec rm -rf {} \; 2>/dev/null

if [ -f "chrome.manifest" ]; then
  echo "Preprocessing chrome.manifest..."
  # You think this is scary?
  #s/^(content\s+\S*\s+)(\S*\/)$/\1jar:chrome\/$APP_NAME\.jar!\/\2/
  #s/^(skin|locale)(\s+\S*\s+\S*\s+)(.*\/)$/\1\2jar:chrome\/$APP_NAME\.jar!\/\3/
  #
  # Then try this! (Same, but with characters escaped for bash :)
  sed -i -r s/^\(content\\s+\\S*\\s+\)\(\\S*\\/\)$/\\1chrome\\/\\2/ chrome.manifest
  sed -i -r s/^\(skin\|locale\)\(\\s+\\S*\\s+\\S*\\s+\)\(.*\\/\)$/\\1\\2chrome\\/\\3/ chrome.manifest

  # (it simply adds jar:chrome/whatever.jar!/ at appropriate positions of chrome.manifest)
fi

# change version information
if [ -z "$CLEAN" ] || [ -z "$TAG" ] || [ "$INTERMEDIATE" ]; then
    # replace the version tag
    sed '/vident\.version/s/\".*\"/\"'$VERSION'\"/g' chrome/content/_version.dtd > chrome/content/_version.dtd_work
    mv chrome/content/_version.dtd_work chrome/content/_version.dtd
#   sed '/var version/s/\".*\";/'$VERSION'\";/g' install.js >install.js_new  2>/dev/null
#   mv install.js_new install.js  2>/dev/null
    sed '/em:version/s/\".*\"/\"'$VERSION'\"/g' install.rdf >install.rdf_new
    mv install.rdf_new install.rdf
fi

# generate the XPI file
echo "Generating ${APP_NAME}_${VERSION}-tb+sm.xpi..."
zip -r ../${APP_NAME}_${VERSION}-tb+sm.xpi *

cd "$ROOT_DIR"

echo "Cleanup..."
if [ $CLEAN_UP = 0 ]; then
  # save the jar file
  mv $TMP_DIR/chrome/$APP_NAME.jar .
else
  rm ./files
fi

# remove the working files
rm -rf $TMP_DIR
echo "Done!"

$AFTER_BUILD
