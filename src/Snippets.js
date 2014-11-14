define(function (require, exports) {
    "use strict";

    // Brackets modules
    var _ = brackets.getModule("thirdparty/lodash");

    // src https://developer.mozilla.org/en/docs/Web/JavaScript/Guide/Regular_Expressions
    function escapeRegExp(string){
        return string.replace(/([.*+?^${}()|\[\]\/\\])/g, "\\$1");
    }

    // TODO: every snippets needs to have an unique generated ID
    var SnippetCollection = [
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

    exports.getAll = getAll;
    exports.search = search;

});
