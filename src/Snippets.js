define(function (require, exports) {
    "use strict";

    // Brackets modules
    var _ = brackets.getModule("thirdparty/lodash");

    // Local modules
    var SnippetDialog = require("src/SnippetDialog"),
        Strings       = require("strings"),
        Utils         = require("src/Utils");

    // src https://developer.mozilla.org/en/docs/Web/JavaScript/Guide/Regular_Expressions
    function escapeRegExp(string){
        return string.replace(/([.*+?^${}()|\[\]\/\\])/g, "\\$1");
    }

    var SnippetCollection = [],
        lastSnippetId = 0;

    function deleteSnippet(snippet) {
        var idx = SnippetCollection.length;
        while (idx--) {
            if (SnippetCollection[idx]._id === snippet._id) {
                SnippetCollection.splice(idx, 1);
            }
        }
    }

    function updateSnippet(newSnippet) {
        var oldSnippet = _.find(SnippetCollection, function (s) {
            return s._id === newSnippet._id;
        });
        Object.keys(newSnippet).forEach(function (key) {
            oldSnippet[key] = newSnippet[key];
        });
    }

    function loadSnippet(snippet) {
        // every snippets needs to have an unique generated ID
        snippet._id = ++lastSnippetId;
        SnippetCollection.push(snippet);
    }

    function loadSnippets() {
        var source = [
            {
                name: "1st sample snippet",
                template: "This is what will be instered at current position (1)"
            },
            {
                name: "2nd sample snippet",
                template: "This is what will be instered at current position (2)"
            },
            {
                name: "3rd sample snippet",
                template: "This is what will be instered at current position (3)"
            }
        ];
        _.each(source, function (snippet) {
            loadSnippet(snippet);
        });
    }

    function init() {
        loadSnippets();
    }

    function clearAll() {
        while (SnippetCollection.length > 0) {
            SnippetCollection.splice(0, 1);
        }
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
