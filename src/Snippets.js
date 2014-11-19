define(function (require, exports) {
    "use strict";

    // Brackets modules
    var _ = brackets.getModule("thirdparty/lodash");

    // Local modules
    var Preferences   = require("src/Preferences"),
        SnippetDialog = require("src/SnippetDialog"),
        Strings       = require("strings"),
        Utils         = require("src/Utils");

    // src https://developer.mozilla.org/en/docs/Web/JavaScript/Guide/Regular_Expressions
    function escapeRegExp(string){
        return string.replace(/([.*+?^${}()|\[\]\/\\])/g, "\\$1");
    }

    var SnippetCollection = [],
        lastSnippetId = 0;

    function _persistSnippets() {
        Preferences.set("SnippetCollection", SnippetCollection);
    }

    function loadSnippet(snippet) {
        // every snippets needs to have an unique generated ID
        snippet._id = ++lastSnippetId;
        SnippetCollection.push(snippet);
        _persistSnippets();
    }

    function updateSnippet(newSnippet) {
        var oldSnippet = _.find(SnippetCollection, function (s) {
            return s._id === newSnippet._id;
        });
        Object.keys(newSnippet).forEach(function (key) {
            oldSnippet[key] = newSnippet[key];
        });
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

    function init() {
        loadSnippets();
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
            loadSnippet(newSnippet);
        });
    }

    function editSnippetDialog(snippet) {
        return SnippetDialog.show(snippet).done(function (newSnippet) {
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

    exports.init                  = init;
    exports.clearAll              = clearAll;
    exports.getAll                = getAll;
    exports.loadSnippet           = loadSnippet;
    exports.search                = search;
    exports.addNewSnippetDialog   = addNewSnippetDialog;
    exports.editSnippetDialog     = editSnippetDialog;
    exports.deleteSnippetDialog   = deleteSnippetDialog;

});
