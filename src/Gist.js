define(function (require, exports) {
    "use strict";

    // Brackets modules
    var _               = brackets.getModule("thirdparty/lodash"),
        Dialogs         = brackets.getModule("widgets/Dialogs"),
        DefaultDialogs  = brackets.getModule("widgets/DefaultDialogs"),
        NativeApp       = brackets.getModule("utils/NativeApp");

    // Local modules
    var Preferences = require("src/Preferences"),
        Snippets    = require("src/Snippets"),
        Strings     = require("strings");

    // Constants
    var DEFAULT_GIST_DESCRIPTION = "My code snippets for Brackets";

    // Variables
    var githubToken;

    function _authorize() {
        githubToken = Preferences.get("githubToken");
        if (!githubToken) {
            Dialogs.showModalDialog(
                DefaultDialogs.DIALOG_ID_ERROR,
                Strings.ERROR,
                Strings.ERROR_TOKEN_REQUIRED
            );
            return false;
        }
        return true;
    }

    function _findGist() {
        var defer = $.Deferred();

        $.ajax({
            url: "https://api.github.com/gists",
            type: "GET",
            dataType: "json",
            cache: false,
            headers: {
                "Authorization": "token " + githubToken
            }
        })
        .done(function (data) {

            var found = _.find(data, function (gist) {
                return gist.description === DEFAULT_GIST_DESCRIPTION;
            });
            defer.resolve(found);

        })
        .fail(function (err, errdesc, statusText) {
            Dialogs.showModalDialog(
                DefaultDialogs.DIALOG_ID_ERROR,
                statusText,
                err.responseText
            );
            defer.reject(err);
        });

        return defer.promise();
    }

    function _updateGist(existingGist) {
        var defer = $.Deferred();

        var payload = {
            "description": DEFAULT_GIST_DESCRIPTION,
            "public": true,
            "files": {
                // "file1.txt": {
                //    "content": "String file contents"
                // }
            }
        };

        var url = "https://api.github.com/gists",
            type = "POST";

        if (existingGist) {
            url = existingGist.url;
            type = "PATCH";
            // mark all files to be deleted
            Object.keys(existingGist.files).forEach(function (file) {
                payload.files[file] = null;
            });
        }

        var snippets = Snippets.getAll();
        snippets.forEach(function (snippet) {
            payload.files[snippet.name] = {
                content: snippet.template
            };
        });

        $.ajax({
            url: url,
            type: type,
            dataType: "json",
            cache: false,
            data: JSON.stringify(payload),
            headers: {
                "Authorization": "token " + githubToken
            }
        })
        .done(function (data) {
            /*jshint -W106*/
            NativeApp.openURLInDefaultBrowser(data.html_url);
            /*jshint +W106*/
            defer.resolve(data);
        })
        .fail(function (err, errdesc, statusText) {
            Dialogs.showModalDialog(
                DefaultDialogs.DIALOG_ID_ERROR,
                statusText,
                err.responseText
            );
            defer.reject(err);
        });

        return defer.promise();
    }

    function uploadAll() {
        var defer = $.Deferred();

        if (!_authorize()) {
            defer.reject();
        }

        _findGist().done(function (found) {

            _updateGist(found).done(function () {
                defer.resolve();
            }).fail(function () {
                defer.reject();
            });

        }).fail(function () {
            defer.reject();
        });

        return defer.promise();
    }

    exports.uploadAll = uploadAll;

});
