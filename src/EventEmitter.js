define(function (require, exports, module) {
    "use strict";

    var EventEmitter2 = require("eventemitter2");

    module.exports = new EventEmitter2({
        wildcard: false
    });
});
