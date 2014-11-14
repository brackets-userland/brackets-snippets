define(function (require, exports) {
    "use strict";

    // Brackets modules
    var CommandManager    = brackets.getModule("command/CommandManager"),
        EditorManager     = brackets.getModule("editor/EditorManager"),
        KeyBindingManager = brackets.getModule("command/KeyBindingManager"),
        InlineWidget      = brackets.getModule("editor/InlineWidget").InlineWidget;

    // Local modules
    var Preferences = require("src/Preferences"),
        Snippets    = require("src/Snippets");

    // Constants
    var WIDGET_HEIGHT = 100;

    // Templates
    var snippetWidgetTemplate     = require("text!templates/SnippetWidget.html"),
        snippetWidgetListTemplate = require("text!templates/SnippetWidgetList.html");

    /**
     * @constructor
     * @extends {InlineWidget}
     */
    function SnippetWidget(hostEditor) {
        InlineWidget.call(this);
        this.load(hostEditor);
    }
    SnippetWidget.prototype = Object.create(InlineWidget.prototype);
    SnippetWidget.prototype.constructor = SnippetWidget;
    SnippetWidget.prototype.parentClass = InlineWidget.prototype;

    // default height for the widget
    SnippetWidget.prototype.height = WIDGET_HEIGHT;

    // generate html for the widget
    SnippetWidget.prototype.load = function (hostEditor) {
        this.parentClass.load.call(this, hostEditor);
        this.$htmlContent.append(Mustache.render(snippetWidgetTemplate, {
            title: "hello snippet"
        }));
        // save elements so we don't have to search for them later
        this.$searchInput = this.$htmlContent.find(".snippet-search-input");
        this.$snippetsList = this.$htmlContent.find(".snippets-list");
    };

    // override onAdded to call setInlineWidgetHeight
    SnippetWidget.prototype.onAdded = function () {
        var self = this;
        this.parentClass.onAdded.call(this);
        // make sure the height is being animated
        this.hostEditor.setInlineWidgetHeight(this, this.height, true);
        // add focus to search input
        this.$searchInput
            .on("keydown", function (e) {
                // move between snippets with arrows
                if (e.which === 38 || e.which === 40) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    if (e.which === 38) {
                        self.selectPrevSnippet();
                    } else {
                        self.selectNextSnippet();
                    }
                }
            })
            .on("focus change keyup", function () {
                self.refreshSnippets();
            }).focus();
    };

    SnippetWidget.prototype.refreshSnippets = function () {
        var query = this.$searchInput.val();
        if (query !== this.lastQuery || typeof this.lastQuery !== "string") {
            this.lastQuery = query;
            this.snippets = Snippets.search(query);
            this.$snippetsList.html(Mustache.render(snippetWidgetListTemplate, {
                snippets: this.snippets
            }));
        }
    };

    SnippetWidget.prototype.selectPrevSnippet = function () {
        // TODO:
    };

    SnippetWidget.prototype.selectNextSnippet = function () {
        // TODO:
    };

    function triggerWidget() {
        var activeEditor = EditorManager.getActiveEditor(),
            sWidget = new SnippetWidget(activeEditor);
        activeEditor.addInlineWidget(activeEditor.getCursorPos(), sWidget, true);
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
