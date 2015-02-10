define(function (require, exports, module) {
    "use strict";

    // Brackets modules
    var _               = brackets.getModule("thirdparty/lodash"),
        ExtensionUtils  = brackets.getModule("utils/ExtensionUtils"),
        FileSystem      = brackets.getModule("filesystem/FileSystem"),
        FileUtils       = brackets.getModule("file/FileUtils");

    // Local modules
    var ErrorHandler  = require("src/ErrorHandler"),
        Preferences   = require("src/Preferences"),
        Promise       = require("bluebird"),
        Snippet       = require("src/Snippet"),
        SnippetDialog = require("src/SnippetDialog"),
        Strings       = require("strings"),
        Utils         = require("src/Utils");

    // Local variables
    var SnippetCollection = [];

    // src https://developer.mozilla.org/en/docs/Web/JavaScript/Guide/Regular_Expressions
    function escapeRegExp(string) {
        return string.replace(/([.*+?^${}()|\[\]\/\\])/g, "\\$1");
    }

    // keep snippets always sorted
    SnippetCollection.sort = function () {
        return Array.prototype.sort.call(this, function (a, b) {
            return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
        });
    };
    SnippetCollection.push = function () {
        for (var i = 0, l = arguments.length; i < l; i++) {
            if (!(arguments[i] instanceof Snippet)) {
                throw new Error("Pushing non-snippet into SnippetCollection!");
            }
        }
        var r = Array.prototype.push.apply(this, arguments);
        this.sort();
        return r;
    };

    function getAll() {
        return SnippetCollection;
    }

    function search(query, fileContext) {
        var result;

        if (!query) {
            result = getAll();
        } else {
            var regExp = new RegExp(escapeRegExp(query), "i");
            result = _.filter(SnippetCollection, function (snippet) {
                return regExp.test(snippet.name);
            });
        }

        if (fileContext) {
            // filter snippets by language of the context file
            var currentFileExtension = FileUtils.getSmartFileExtension(fileContext);
            result = _.filter(result, function (snippet) {
                return snippet.meta && snippet.meta.lang &&
                    snippet.meta.lang === currentFileExtension ||
                    snippet.meta.lang.indexOf(currentFileExtension) !== -1;
            });
        }

        return result;
    }

    function addToCollection(snippet) {
        SnippetCollection.push(snippet);
    }

    function removeFromCollection(snippet) {
        var io = SnippetCollection.indexOf(snippet);
        if (io !== -1) {
            SnippetCollection.splice(io, 1);
        }
    }

    // this should delete only the snippets in the default snippet directory
    function deleteAll() {
        var promises = [],
            basePath = Preferences.get("defaultSnippetDirectory");
        SnippetCollection.forEach(function (snippet) {
            if (snippet.fullPath.indexOf(basePath) === 0) {
                var p = snippet.delete().then(function () {
                    SnippetCollection.splice(SnippetCollection.indexOf(snippet), 1);
                });
                promises.push(p);
            }
        });
        return Promise.all(promises);
    }

    function deleteSnippetDialog(snippet) {
        return Utils.askQuestion(Strings.QUESTION, Strings.SNIPPET_DELETE_CONFIRM, "boolean")
            .then(function (response) {
                if (response === true) {
                    return snippet.delete().then(function () {
                        SnippetCollection.splice(SnippetCollection.indexOf(snippet), 1);
                    });
                }
            });
    }

    function deleteAllSnippetsDialog() {
        return Utils.askQuestion(Strings.QUESTION, Strings.SNIPPET_DELETE_ALL_CONFIRM, "boolean")
            .then(function (response) {
                if (response === true) {
                    return deleteAll();
                }
            });
    }

    function editSnippetDialog(oldSnippet) {
        return SnippetDialog.show(oldSnippet, function (newSnippet) {
            // dialog should only be closed, if this promise is resolved
            return newSnippet.save().then(function () {
                removeFromCollection(oldSnippet);
                addToCollection(newSnippet);
                return newSnippet;
            });
        });
    }

    function _loadSnippetsFromDirectories() {
        var snippetDirectories = Preferences.get("snippetDirectories");

        // always add defaultSnippetDirectory
        var defaultSnippetDirectory = Preferences.get("defaultSnippetDirectory");
        snippetDirectories.push({
            fullPath: defaultSnippetDirectory,
            autoLoad: true
        });

        snippetDirectories.forEach(function (snippetDirectory) {

            // skip directories we don't want to load on startup
            if (snippetDirectory.autoLoad !== true) {
                console.log("[brackets-snippets] skipping directory: " + snippetDirectory.fullPath);
                return;
            }

            if (!FileSystem.isAbsolutePath(snippetDirectory.fullPath)) {
                snippetDirectory.autoLoad = false;
                ErrorHandler.show("Directory is not an absolute path: " + snippetDirectory.fullPath);
                Preferences.set("snippetDirectories", snippetDirectories);
                return;
            }

            FileSystem.resolve(snippetDirectory.fullPath, function (err, directory) {

                var notFound = err === "NotFound";
                if (notFound) { err = null; }

                if (err) {
                    ErrorHandler.show(err);
                    return;
                }

                if (notFound || directory.isDirectory !== true) {
                    snippetDirectory.autoLoad = false;
                    Preferences.set("snippetDirectories", snippetDirectories);
                    ErrorHandler.show("_loadSnippetsFromDirectories: " + snippetDirectory.fullPath + " is not a directory!");
                    return;
                }

                directory.getContents(function (err, directoryContents) {

                    if (err) {
                        ErrorHandler.show(err);
                        return;
                    }

                    directoryContents.forEach(function (snippetFile) {

                        if (!snippetFile.isFile) { return; }

                        Snippet.load(snippetFile.fullPath).then(function (snippet) {
                            SnippetCollection.push(snippet);
                        });

                    });

                });

            });

        });
    }

    function _registerSnippetDirectory(directory) {
        var snippetDirectories = Preferences.get("snippetDirectories");

        var entry = _.find(snippetDirectories, function (e) {
            return e.fullPath === directory.fullPath;
        });

        // if doesn't exist, add it to the collection, automatically load new directories
        if (!entry) {
            entry = {
                fullPath: directory.fullPath,
                autoLoad: true
            };
            snippetDirectories.push(entry);
            Preferences.set("snippetDirectories", snippetDirectories);
        }
    }

    function _checkDefaultSnippetsDirectories() {
        var defer = Promise.defer();

        var modulePath = ExtensionUtils.getModulePath(module);
        FileSystem.resolve(modulePath + "../default_snippets/", function (err, entry) {

            if (err) {
                ErrorHandler.show(err);
                defer.reject();
                return;
            }

            entry.getContents(function (err, contents) {

                if (err) {
                    ErrorHandler.show(err);
                    defer.reject();
                    return;
                }

                // register every directory which contains a set of snippets
                contents.forEach(function (directory) {
                    _registerSnippetDirectory(directory);
                });

                // finish
                defer.resolve();

            });

        });

        return defer.promise;
    }

    function _ensureDefaultSnippetDirectory() {
        var defer = Promise.defer();

        var defaultSnippetDirectory = Preferences.get("defaultSnippetDirectory");
        if (!defaultSnippetDirectory) {
            defaultSnippetDirectory = Preferences.getDefaults().defaultSnippetDirectory;
        }

        // fix windows paths
        defaultSnippetDirectory = defaultSnippetDirectory.replace(/\\/g, "/");

        // fix missing trailing slash
        if (defaultSnippetDirectory.slice(-1) !== "/") {
            defaultSnippetDirectory += "/";
        }

        FileSystem.resolve(defaultSnippetDirectory, function (err, directory) {
            // handle NotFound error
            if (err === "NotFound") {
                brackets.fs.makedir(defaultSnippetDirectory, parseInt("777", 0), function (err) {
                    if (err) {
                        ErrorHandler.show(err);
                        defer.reject("makedir failed: " + err);
                        return;
                    }
                    defer.resolve(true);
                });
                return;
            }
            // all other errors
            if (err) {
                ErrorHandler.show(err);
                defer.reject("unknown error: " + err);
                return;
            }
            // exists but it's not a directory
            if (!directory.isDirectory) {
                ErrorHandler.show("Target is not a directory: " + defaultSnippetDirectory);
                defer.reject("default is not a directory");
                return;
            }
            defer.resolve(true);
        });

        return defer.promise
            .catch(function (reason) {
                Preferences.set("defaultSnippetDirectory", Preferences.getDefaults().defaultSnippetDirectory);
                throw reason;
            })
            .then(function () {
                Preferences.set("defaultSnippetDirectory", defaultSnippetDirectory);
            });
    }

    function init() {
        _ensureDefaultSnippetDirectory()
            .then(function () {
                return _checkDefaultSnippetsDirectories();
            })
            .then(function () {
                return _loadSnippetsFromDirectories();
            });
    }

    exports.addToCollection             = addToCollection;
    exports.clearAll                    = deleteAll;
    exports.getAll                      = getAll;
    exports.search                      = search;
    exports.editSnippetDialog           = editSnippetDialog;
    exports.deleteSnippetDialog         = deleteSnippetDialog;
    exports.deleteAllSnippetsDialog     = deleteAllSnippetsDialog;
    exports.init                        = init;

});
