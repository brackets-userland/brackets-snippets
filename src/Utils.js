define(function (require, exports) {
    "use strict";

    // Brackets modules
    var _       = brackets.getModule("thirdparty/lodash"),
        Dialogs = brackets.getModule("widgets/Dialogs");

    // Local modules
    var ErrorHandler  = require("src/ErrorHandler"),
        Promise       = require("bluebird"),
        Strings       = require("strings");

    // Templates
    var questionDialogTemplate = require("text!templates/QuestionDialog.html");

    function askQuestion(title, question, responseType) {
        var defer = Promise.defer();

        var compiledTemplate = Mustache.render(questionDialogTemplate, {
            title: title,
            question: question,
            stringInput: responseType === "string",
            booleanInput: responseType === "boolean",
            Strings: Strings
        });

        var dialog  = Dialogs.showModalDialogUsingTemplate(compiledTemplate),
            $dialog = dialog.getElement();

        _.defer(function () {
            var $input = $dialog.find("input:visible");
            if ($input.length > 0) {
                $input.focus();
            } else {
                $dialog.find(".primary").focus();
            }
        });

        dialog.done(function (buttonId) {
            if (responseType === "string") {
                if (buttonId === "ok") {
                    var userResponse = dialog.getElement().find("input").val().trim();
                    defer.resolve(userResponse);
                } else {
                    defer.reject();
                }
            } else if (responseType === "boolean") {
                defer.resolve(buttonId === "true");
            } else {
                ErrorHandler.show("Unknown responseType for question: " + responseType);
            }
        });

        return defer.promise;
    }

    exports.askQuestion = askQuestion;

});
