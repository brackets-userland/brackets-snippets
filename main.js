define(function (require, exports, module) {

    // Brackets modules
    var AppInit         = brackets.getModule("utils/AppInit"),
        ExtensionUtils  = brackets.getModule("utils/ExtensionUtils");

    // Local modules
    var Strings = require("strings");

    // Load style sheet
    ExtensionUtils.loadStyleSheet(module, "styles/main.less");

	// Extension initialisation
    AppInit.appReady(function () {
        console.log("Hi World!");
    });

});
