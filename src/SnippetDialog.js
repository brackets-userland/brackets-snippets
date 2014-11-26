define(function (require, exports) {
    "use strict";

    // Brackets modules
    var _       = brackets.getModule("thirdparty/lodash"),
        Dialogs = brackets.getModule("widgets/Dialogs");

    // Local modules
    var Gist          = require("src/Gist"),
        Promise       = require("bluebird"),
        Strings       = require("strings"),
        Utils         = require("src/Utils");

    // Templates
    var template = require("text!templates/SnippetDialog.html");

    // Module variables
    var defer,
        dialog,
        $dialog,
        snippet,
        onSuccessBeforeClose;

    // Implementation
    function _attachEvents() {
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
                .then(function (url) {

                    Gist.downloadFirst(url).then(function (snippet) {
                        $snippetName.val(snippet.name).trigger("change").focus();
                        $snippetEditor.val(snippet.template).trigger("change");
                    });

                });
        });

        $dialog.find("[data-button-id='ok']").on("click", function (e) {
            if (onSuccessBeforeClose) {
                onSuccessBeforeClose(snippet).then(function () {
                    // this is copied from inside of Brackets on how to close dialog with "ok"
                    $dialog.data("buttonId", "ok");
                    $dialog.modal("hide");
                });
                e.preventDefault();
                e.stopImmediatePropagation();
            }
        });
    }

    function _show() {
        var templateArgs = {
            Snippet: snippet,
            Strings: Strings
        };

        var compiledTemplate = Mustache.render(template, templateArgs);
        dialog = Dialogs.showModalDialogUsingTemplate(compiledTemplate);
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

    // SnippetDialog will always make a copy of snippet, it does not edit it directly
    function show(_snippet, _onSuccessBeforeClose) {
        defer                 = Promise.defer();
        onSuccessBeforeClose  = _onSuccessBeforeClose;

        if (typeof _snippet === "object") {
            snippet = _.cloneDeep(_snippet);
        } else {
            snippet = {};
        }

        _show();

        return defer.promise;
    }

    exports.show = show;

});
