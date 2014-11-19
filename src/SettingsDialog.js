define(function (require, exports) {
    "use strict";

    // Brackets modules
    var _               = brackets.getModule("thirdparty/lodash"),
        Dialogs         = brackets.getModule("widgets/Dialogs"),
        NativeApp       = brackets.getModule("utils/NativeApp");

    // Local modules
    var Gist        = require("src/Gist"),
        Preferences = require("src/Preferences"),
        Strings     = require("strings");

    // Templates
    var template = require("text!templates/SettingsDialog.html");

    // Module variables
    var defer,
        snippet,
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
            _connectMessage(Strings.MSG_CONNECTED_AS + githubLogin, true);
        }
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
                    _connectMessage(Strings.ERROR_INVALID_AUTH_SCOPE + authScopes);
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

        $dialog.find(".btn-gist-export").on("click", function () {
            Gist.uploadAll();
        });
    }

    function show() {
        defer = $.Deferred();

        var templateArgs = {
            Snippet: snippet,
            Strings: Strings
        };

        var compiledTemplate = Mustache.render(template, templateArgs),
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
