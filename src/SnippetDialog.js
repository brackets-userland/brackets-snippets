define(function (require, exports) {
    "use strict";

    // Brackets modules
    var _       = brackets.getModule("thirdparty/lodash"),
        Dialogs = brackets.getModule("widgets/Dialogs");

    // Local modules
    var Gist          = require("src/Gist"),
        Strings       = require("strings"),
        Utils         = require("src/Utils");

    // Templates
    var template = require("text!templates/SnippetDialog.html");

    // Module variables
    var defer,
        snippet;

    // Implementation
    function _attachEvents($dialog) {
        var $snippetName = $dialog.find(".snippet-name"),
            $snippetEditor = $dialog.find(".snippet-editor");

        if (snippet.name) {
            $snippetName.val(snippet.name);
            $snippetEditor.focus();
        } else {
            $snippetName.focus();
        }

        if (snippet.template) {
            $snippetEditor.val(snippet.template);
        }

        $snippetName.on("keyup change", function () {
            snippet.name = $(this).val().trim();
        });

        $snippetEditor.on("keyup change", function () {
            snippet.template = $(this).val().trim();
        });

        $dialog.find(".btn-load-from-gist").on("click", function () {
            Utils.askQuestion(Strings.LOAD_SNIPPET_FROM_GIST, String.ENTER_GIST_URL, "string")
                .done(function (url) {

                    Gist.downloadFirst(url).done(function (snippet) {
                        $snippetName.val(snippet.name).trigger("change").focus();
                        $snippetEditor.val(snippet.template).trigger("change");
                    });

                });
        });
    }

    function _show() {
        var templateArgs = {
            Snippet: snippet,
            Strings: Strings
        };

        var compiledTemplate = Mustache.render(template, templateArgs),
            dialog = Dialogs.showModalDialogUsingTemplate(compiledTemplate),
            $dialog = dialog.getElement();

        _attachEvents($dialog);

        dialog.done(function (buttonId) {
            if (buttonId === "ok") {
                defer.resolve(snippet);
            } else {
                defer.reject();
            }
        });
    }

    function show(_snippet) {
        defer = $.Deferred();

        if (typeof _snippet === "object") {
            snippet = _.cloneDeep(_snippet);
        } else {
            snippet = {};
        }

        _show();

        return defer.promise();
    }

    exports.show = show;

});
