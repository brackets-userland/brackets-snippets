define(function (require, exports) {
    "use strict";

    // Brackets modules
    var _                 = brackets.getModule("thirdparty/lodash"),
        CommandManager    = brackets.getModule("command/CommandManager"),
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
            this.selectSnippet();
        }
    };

    SnippetWidget.prototype.selectSnippet = function (snippet) {
        if (snippet) {
            // if a snippet was passed, explicitly set this snippet as selected
            this.selectedSnippetId = snippet._id;
        } else if (this.selectedSnippetId) {
            // if a snippet was previously selected try to find this snippet between current snippets
            var s = _.find(this.snippets, function (s) { return s._id === this.selectedSnippetId; }, this);
            // if not found, just select first one available
            if (!s) { this.selectedSnippetId = this.snippets.length > 0 ? this.snippets[0]._id : null; }
        } else {
            // no snippet was passed explicitly and no snippet was previously selected, select fist one
            this.selectedSnippetId = this.snippets.length > 0 ? this.snippets[0]._id : null;
        }

        if (!this.selectedSnippetId && this.snippets.length > 0) {
            throw new Error("[brackets-snippets] No snippet selected!");
        }

        this.$snippetsList.find(".selected").removeClass("selected");
        this.$snippetsList.find("[x-snippet-id='" + this.selectedSnippetId + "']").addClass("selected");
    };

    SnippetWidget.prototype.selectPrevSnippet = function () {
        var prevSnippet = null;
        for (var i = 0; i < this.snippets.length; i++) {
            if (this.snippets[i]._id === this.selectedSnippetId) {
                prevSnippet = this.snippets[i - 1];
                break;
            }
        }
        if (prevSnippet) {
            this.selectSnippet(prevSnippet);
        }
    };

    SnippetWidget.prototype.selectNextSnippet = function () {
        var nextSnippet = null;
        for (var i = 0; i < this.snippets.length; i++) {
            if (this.snippets[i]._id === this.selectedSnippetId) {
                nextSnippet = this.snippets[i + 1];
                break;
            }
        }
        if (nextSnippet) {
            this.selectSnippet(nextSnippet);
        }
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
