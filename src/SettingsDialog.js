define(function (require, exports) {
    "use strict";

    // Brackets modules
    var _               = brackets.getModule("thirdparty/lodash"),
        Dialogs         = brackets.getModule("widgets/Dialogs"),
        NativeApp       = brackets.getModule("utils/NativeApp");

    // Local modules
    var ErrorHandler  = require("src/ErrorHandler"),
        Gist          = require("src/Gist"),
        Preferences   = require("src/Preferences"),
        Snippets      = require("src/Snippets"),
        Strings       = require("strings"),
        Utils         = require("src/Utils");

    // Templates
    var template = require("text!templates/SettingsDialog.html");

    // Module variables
    var defer,
        dialog,
        $dialog;

    // Implementation
    function _connectMessage(message, isSuccess) {
        $dialog.find(".github-connect-response")
            .text(message)
            .toggleClass("text-error", isSuccess !== true)
            .toggleClass("text-success", isSuccess === true);
    }

    function _fillValues() {
        var githubLogin = Preferences.get("githubLogin") || "",
            githubToken = Preferences.get("githubToken") || "";
        $dialog.find("[name='github-token']").val(githubToken);
        if (githubLogin && githubToken) {
            _connectMessage(Strings.MSG_CONNECTED_AS + " " + githubLogin, true);
        }

        $dialog.find("[x-preference]").each(function () {
            var $this     = $(this),
                prefName  = $this.attr("x-preference"),
                prefVal   = Preferences.get(prefName);
            $this.val(prefVal);
            $this.on("change", function () {
                Preferences.set(prefName, $this.val());
            });
        });
    }

    function _attachEvents() {
        $dialog.find(".access-token-link").on("click", function (e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            NativeApp.openURLInDefaultBrowser("https://github.com/settings/applications");
        });

        $dialog.find(".btn-clear-github").on("click", function () {
            Preferences.set("githubLogin", null);
            Preferences.set("githubToken", null);
            _fillValues();
        });

        $dialog.find(".btn-connect-github").on("click", function () {

            var githubToken = $dialog.find("[name='github-token']").val().trim();

            $.ajax({
                url: "https://api.github.com/gists",
                dataType: "json",
                cache: false,
                headers: {
                    "Authorization": "token " + githubToken
                }
            })
            .done(function (data, responseText, response) {
                var authScopes = response.getResponseHeader("X-OAuth-Scopes");
                if (!authScopes) {
                    _connectMessage(Strings.ERROR_NO_AUTH_SCOPE);
                    return;
                }
                if (authScopes.indexOf("gist") === -1) {
                    _connectMessage(Strings.ERROR_INVALID_AUTH_SCOPE + " " + authScopes);
                    return;
                }

                // success
                var githubLogin = _.first(_.compact(_.uniq(data.map(function (gist) {
                    return gist.owner ? gist.owner.login : null;
                }))));

                // save the info into the preferences
                Preferences.set("githubLogin", githubLogin);
                Preferences.set("githubToken", githubToken);

                _connectMessage(Strings.MSG_AUTH_SUCCESS + githubLogin, true);
            })
            .fail(function (err) {
                var message = Strings.ERROR_API_REQ_FAIL;
                message += err && err.responseJSON ? err.responseJSON.message : Strings.ERROR_UNKNOWN;
                _connectMessage(message);
            });

        });

        $dialog.find(".btn-gist-import").on("click", function () {
            Utils.askQuestion(Strings.IMPORT_FROM_GIST, Strings.IMPORT_FROM_GIST_QUESTION, "string")
                .done(function (url) {

                    Utils.askQuestion(Strings. IMPORT_FROM_GIST, Strings.IMPORT_FROM_GIST_DELETE_LOCAL, "boolean")
                        .done(function (deleteLocal) {

                            Gist.downloadAll(url, {
                                deleteLocal: deleteLocal
                            });

                        });

                });
        });

        $dialog.find(".btn-gist-export").on("click", function () {
            Gist.uploadAll();
        });

        $dialog.on("change", ".snippet-directory-entry-autoload", function () {
            var $this               = $(this),
                fullPath            = $this.parents("[x-fullpath]").first().attr("x-fullpath"),
                snippetDirectories  = Preferences.get("snippetDirectories");

            var sd = _.find(snippetDirectories, function (d) {
                return d.fullPath === fullPath;
            });
            sd.autoLoad = $this.prop("checked");

            Preferences.set("snippetDirectories", snippetDirectories);
        });

        $dialog.on("click", ".snippet-directory-entry-delete", function () {
            var $this               = $(this),
                fullPath            = $this.parents("[x-fullpath]").first().attr("x-fullpath"),
                snippetDirectories  = Preferences.get("snippetDirectories");

            Utils.askQuestion(Strings.SNIPPET_DIRECTORY_DELETE, Strings.SNIPPET_DIRECTORY_DELETE_CONFIRM, "boolean")
                .done(function (answer) {
                    if (answer === true) {
                        var sd = _.find(snippetDirectories, function (d) {
                            return d.fullPath === fullPath;
                        });
                        snippetDirectories = _.without(snippetDirectories, sd);

                        Preferences.set("snippetDirectories", snippetDirectories);
                        $this.parents("[x-fullpath]").remove();
                    }
                });
        });

        $dialog.on("click", ".btn-add-snippet-directory", function () {
            Utils.askQuestion(Strings.SNIPPET_DIRECTORY_ADD, Strings.SPECIFY_DIRECTORY_FULLPATH, "string")
                .done(function (fullPath) {
                    var snippetDirectories = Preferences.get("snippetDirectories");
                    snippetDirectories.push({
                        fullPath: fullPath,
                        autoLoad: true
                    });
                    Preferences.set("snippetDirectories", snippetDirectories);
                    dialog.close();
                });
        });

        $dialog.on("click", ".open-in-os-btn", function () {
            var path = Preferences.get("defaultSnippetDirectory");
            brackets.app.showOSFolder(path, function (err) {
                if (err) {
                    ErrorHandler.show(err);
                }
            });
        });

        $dialog.on("click", ".reset-default-directory-btn", function () {
            var path = Snippets.getDefaultSnippetDirectory();
            Utils.askQuestion(Strings.RESET_DEFAULT_DIR, Strings.RESET_DEFAULT_DIR_MSG + " " + path, "boolean")
                .done(function (answer) {
                    if (answer === true) {
                        $dialog.find("[x-preference='defaultSnippetDirectory']").val(path).trigger("change");
                    }
                });
        });
    }

    function show() {
        defer = $.Deferred();

        var sd = Preferences.get("snippetDirectories").map(function (d) {
            var lookedFor = "zaggino.brackets-snippets/default_snippets",
                io = d.fullPath.indexOf(lookedFor);

            if (io !== -1) {
                d.fullPathDisplay = d.fullPath.substring(io + "zaggino.brackets-snippets/".length);
                d.isDefault = true;
            } else {
                d.fullPathDisplay = d.fullPath;
                d.isDefault = false;
            }

            return d;
        });

        var templateArgs = {
            SnippetDirectories: sd,
            Strings: Strings
        };

        var compiledTemplate = Mustache.render(template, templateArgs);
        dialog = Dialogs.showModalDialogUsingTemplate(compiledTemplate);

        dialog.done(function () {
            defer.resolve();
        });

        $dialog = dialog.getElement();

        _fillValues();
        _attachEvents();

        return defer.promise();
    }

    exports.show = show;

});
