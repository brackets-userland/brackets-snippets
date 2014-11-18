define(function (require, exports) {
    "use strict";

    // Brackets modules
    var _       = brackets.getModule("thirdparty/lodash"),
        Dialogs = brackets.getModule("widgets/Dialogs");

    // Local modules
    var Strings = require("strings"),
        Utils   = require("src/Utils");

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

                    var m = url.match(/gist\.github\.com\/([a-zA-Z0-9]+)\/([a-zA-Z0-9]+)/),
                        gistId = null;

                    if (m) {
                        gistId = m[2];
                    }

                    if (!gistId) {
                        console.error("[brackets-snippets] no gistId found in string: " + url);
                        return;
                    }

                    $.ajax({
                        url: "https://api.github.com/gists/" + gistId,
                        dataType: "json",
                        cache: false
                    })
                    .done(function (data) {

                        var gistFiles = _.keys(data.files);

                        // take only first file here
                        var name = gistFiles[0];
                        var template = data.files[name].content;

                        $snippetName.val(name).trigger("change").focus();
                        $snippetEditor.val(template).trigger("change");

                    })
                    .fail(function (err) {
                        console.error("[brackets-snippets] " + err);
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
