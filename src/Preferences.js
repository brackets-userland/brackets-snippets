define(function (require, exports, module) {
    "use strict";

    // Brackets modules
    var _                   = brackets.getModule("thirdparty/lodash"),
        PreferencesManager  = brackets.getModule("preferences/PreferencesManager"),
        StateManager        = PreferencesManager.stateManager;

    // Constants
    var DEFAULT_SNIPPET_DIR = brackets.app.getApplicationSupportDirectory() + "/snippets/",
        PREF_PREFIX         = "brackets-snippets";

    var defaultPreferences = {
        "defaultSnippetDirectory": {                 "type": "string",            "value": DEFAULT_SNIPPET_DIR     },
        "triggerSnippetShortcut": {                  "type": "string",            "value": "Alt-S"                 },
        "githubLogin": {                             "type": "string",            "value": null                    },
        "githubToken": {                             "type": "string",            "value": null                    },
        "snippetDirectories": {                      "type": "array",             "value": []                      }
    };

    var prefs = PreferencesManager.getExtensionPrefs(PREF_PREFIX);
    _.each(defaultPreferences, function (definition, key) {
        if (definition.os && definition.os[brackets.platform]) {
            prefs.definePreference(key, definition.type, definition.os[brackets.platform].value);
        } else {
            prefs.definePreference(key, definition.type, definition.value);
        }
    });
    prefs.save();

    function get(key) {
        var location = defaultPreferences[key] ? PreferencesManager : StateManager;
        arguments[0] = PREF_PREFIX + "." + key;
        return location.get.apply(location, arguments);
    }

    function set(key) {
        var location = defaultPreferences[key] ? PreferencesManager : StateManager;
        arguments[0] = PREF_PREFIX + "." + key;
        return location.set.apply(location, arguments);
    }

    function getAll() {
        var obj = {};
        _.each(defaultPreferences, function (definition, key) {
            obj[key] = get(key);
        });
        return obj;
    }

    function getDefaults() {
        var obj = {};
        _.each(defaultPreferences, function (definition, key) {
            var defaultValue;
            if (definition.os && definition.os[brackets.platform]) {
                defaultValue = definition.os[brackets.platform].value;
            } else {
                defaultValue = definition.value;
            }
            obj[key] = defaultValue;
        });
        return obj;
    }

    function getType(key) {
        return defaultPreferences[key].type;
    }

    function getGlobal(key) {
        return PreferencesManager.get(key);
    }

    module.exports = {
        get: get,
        set: set,
        getAll: getAll,
        getDefaults: getDefaults,
        getType: getType,
        getGlobal: getGlobal
    };

});
