define(function (require, exports, module) {
    "use strict";

    // Brackets modules
    var _               = brackets.getModule("thirdparty/lodash"),
        ExtensionUtils  = brackets.getModule("utils/ExtensionUtils"),
        FileSystem      = brackets.getModule("filesystem/FileSystem");

    // Local modules
    var ErrorHandler  = require("src/ErrorHandler"),
        Preferences   = require("src/Preferences"),
        SnippetDialog = require("src/SnippetDialog"),
        Strings       = require("strings"),
        Utils         = require("src/Utils");

    // src https://developer.mozilla.org/en/docs/Web/JavaScript/Guide/Regular_Expressions
    function escapeRegExp(string) {
        return string.replace(/([.*+?^${}()|\[\]\/\\])/g, "\\$1");
    }

    var SnippetCollection = [],
        lastSnippetId = 0;

    function _sortSnippets() {
        SnippetCollection.sort(function (a, b) {
            return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
        });
    }

    function _persistSnippets() {
        Preferences.set("SnippetCollection", SnippetCollection);
    }

    function loadSnippet(snippet) {
        // snippet.source === "directory"
        // snippet.source === "user";
        // snippet.source === "gist";

        var ignoreLoad = false;

        var existingSnippet = _.find(SnippetCollection, function (s) {
            return s.name === snippet.name;
        });

        if (existingSnippet) {
            if (!existingSnippet.source || existingSnippet.source === "directory") {
                // directory snippets can be always overridden
                ignoreLoad = false;
            } else if (existingSnippet.source === "user") {
                // user snippets can only be overriden by user snippets
                if (snippet.source !== "user") {
                    ignoreLoad = true;
                }
            } else if (existingSnippet.source === "gist") {
                // gist snippets can be overriden by user snippets and gist snippets
                if (snippet.source !== "user" && snippet.source !== "gist") {
                    ignoreLoad = true;
                }
            } else {
                ErrorHandler.show("loadSnippet(): Unknown snippet source: " + existingSnippet.source);
            }
        }

        if (ignoreLoad) {
            console.log("[brackets-snippets] ignoring loading of '" + snippet.name +
                        "' snippet, because snippet with the same name of source '" + existingSnippet.source +
                        "' is present.");
            return;
        }

        if (existingSnippet) {
            var io = SnippetCollection.indexOf(existingSnippet);
            if (io !== -1) {
                SnippetCollection.splice(io, 1);
            }
        }

        // every snippets needs to have an unique generated ID
        snippet._id = ++lastSnippetId;
        SnippetCollection.push(snippet);
        _sortSnippets();
        _persistSnippets();
    }

    function updateSnippet(newSnippet) {
        var oldSnippet = _.find(SnippetCollection, function (s) {
            return s._id === newSnippet._id;
        });
        Object.keys(newSnippet).forEach(function (key) {
            oldSnippet[key] = newSnippet[key];
        });
        _sortSnippets();
        _persistSnippets();
    }

    function deleteSnippet(snippet) {
        var idx = SnippetCollection.length;
        while (idx--) {
            if (SnippetCollection[idx]._id === snippet._id) {
                SnippetCollection.splice(idx, 1);
            }
        }
        _persistSnippets();
    }

    function clearAll() {
        while (SnippetCollection.length > 0) {
            SnippetCollection.splice(0, 1);
        }
        _persistSnippets();
    }

    function loadSnippets() {
        var source = Preferences.get("SnippetCollection") || [];
        source.forEach(function (snippet) {
            loadSnippet(snippet);
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

    function _loadSnippetDirectories() {
        var snippetDirectories = Preferences.get("snippetDirectories");
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
                if (err) {
                    ErrorHandler.show(err);
                    return;
                }

                if (directory.isDirectory !== true) {
                    snippetDirectory.autoLoad = false;
                    Preferences.set("snippetDirectories", snippetDirectories);
                    ErrorHandler.show("_loadSnippetDirectories: " + snippetDirectory.fullPath + " is not a directory!");
                    return;
                }

                directory.getContents(function (err, directoryContents) {
                    if (err) {
                        ErrorHandler.show(err);
                        return;
                    }
                    directoryContents.forEach(function (snippetFile) {
                        if (!snippetFile.isFile) {
                            return;
                        }
                        snippetFile.read(function (err, content) {
                            if (err) {
                                ErrorHandler.show(err);
                                return;
                            }
                            loadSnippet({
                                name: snippetFile.name,
                                template: content,
                                source: "directory"
                            });
                        });
                    });
                });
            });
        });
    }

    function loadDefaultSnippets() {

        var modulePath = ExtensionUtils.getModulePath(module);
        FileSystem.resolve(modulePath + "../default_snippets/", function (err, entry) {
            if (err) {
                ErrorHandler.show(err);
                return;
            }
            entry.getContents(function (err, contents) {
                if (err) {
                    ErrorHandler.show(err);
                    return;
                }
                // register every directory which contains a set of snippets
                contents.forEach(function (directory) {
                    _registerSnippetDirectory(directory);
                });
                // now load all of them
                _loadSnippetDirectories();
            });
        });
    }

    function init() {
        loadSnippets();
        loadDefaultSnippets();
    }

    function getAll() {
        return SnippetCollection;
    }

    function search(query) {
        if (!query) {
            return getAll();
        }
        var regExp = new RegExp(escapeRegExp(query), "i");
        return _.filter(SnippetCollection, function (snippet) {
            return regExp.test(snippet.name);
        });
    }

    function addNewSnippetDialog(snippet) {
        return SnippetDialog.show(snippet).done(function (newSnippet) {
            newSnippet.source = "user";
            loadSnippet(newSnippet);
        });
    }

    function editSnippetDialog(snippet) {
        return SnippetDialog.show(snippet).done(function (newSnippet) {
            newSnippet.source = "user";
            updateSnippet(newSnippet);
        });
    }

    function deleteSnippetDialog(snippet) {
        return Utils.askQuestion(Strings.QUESTION, Strings.SNIPPET_DELETE_CONFIRM, "boolean")
            .done(function (response) {
                if (response === true) {
                    deleteSnippet(snippet);
                }
            });
    }

    function deleteAllSnippetsDialog() {
        return Utils.askQuestion(Strings.QUESTION, Strings.SNIPPET_DELETE_ALL_CONFIRM, "boolean")
            .done(function (response) {
                if (response === true) {
                    clearAll();
                }
            });
    }

    exports.init                    = init;
    exports.clearAll                = clearAll;
    exports.getAll                  = getAll;
    exports.loadSnippet             = loadSnippet;
    exports.search                  = search;
    exports.addNewSnippetDialog     = addNewSnippetDialog;
    exports.editSnippetDialog       = editSnippetDialog;
    exports.deleteSnippetDialog     = deleteSnippetDialog;
    exports.deleteAllSnippetsDialog = deleteAllSnippetsDialog;

});
