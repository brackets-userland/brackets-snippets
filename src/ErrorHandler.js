define(function (require, exports) {
    "use strict";

    // Brackets modules
    var Dialogs         = brackets.getModule("widgets/Dialogs"),
        DefaultDialogs  = brackets.getModule("widgets/DefaultDialogs");

    // Local modules
    var Strings = require("strings");

    function toError(err) {
        if (err instanceof Error) { return err; }
        return new Error(err);
    }

    function show(err, errTitle) {
        err = toError(err);

        // add to console too
        console.error(err);

        // display a dialog for the user
        var dialog = Dialogs.showModalDialog(
            DefaultDialogs.DIALOG_ID_ERROR,
            errTitle || Strings.ERROR,
            err.stack || err.message
        );

        // add a custom class for the dialog so we can style it
        var $dialog = dialog.getElement();
        $dialog.addClass("brackets-snippets");
    }

    exports.show = show;
});
