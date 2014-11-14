define(function (require, exports, module) {

    // Brackets modules
    var AppInit         = brackets.getModule("utils/AppInit"),
        ExtensionUtils  = brackets.getModule("utils/ExtensionUtils");

    // Local modules
    var SnippetWidget = require("src/SnippetWidget");

    // Extension initialisation
    AppInit.appReady(function () {
        // Load the style sheet
        ExtensionUtils.loadStyleSheet(module, "styles/main.less");
        // Init the extension modules
        SnippetWidget.init();
    });

});
