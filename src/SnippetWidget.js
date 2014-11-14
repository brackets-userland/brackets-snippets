define(function (require, exports) {
    "use strict";

    // Brackets modules
    var CommandManager = brackets.getModule("command/CommandManager"),
        KeyBindingManager = brackets.getModule("command/KeyBindingManager");

    // Local modules
    var Preferences = require("src/Preferences");

    function triggerWidget() {
        console.log("Hello!");
    }

    function bindShortcut() {
        var TRIGGER_SNIPPET_CMD = "snippets.triggerWidget";
        CommandManager.register("Trigger Snippet", TRIGGER_SNIPPET_CMD, triggerWidget);
        KeyBindingManager.addBinding(TRIGGER_SNIPPET_CMD, Preferences.get("triggerSnippetShortcut"));
    }

    function init() {
        bindShortcut();
    }

    exports.init = init;

});
