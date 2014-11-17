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
    function SnippetWidget(hostEditor, cursorPosition) {
        InlineWidget.call(this);
        this.load(hostEditor);
        this.originalCursorPosition = cursorPosition;
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
        this.$currentSnippetArea = this.$htmlContent.find(".current-snippet");
    };

    // override onAdded to call setInlineWidgetHeight
    SnippetWidget.prototype.onAdded = function () {
        this.parentClass.onAdded.call(this);
        var self = this;

        // make sure the height is being animated
        this.hostEditor.setInlineWidgetHeight(this, this.height, true);

        // add events for arrow keys to navigate between snippets
        this.$htmlContent.on("keydown", function (e) {
            // move between snippets with arrows
            if (e.which === 38 || e.which === 40) {
                e.preventDefault();
                e.stopImmediatePropagation();
                if (e.which === 38) {
                    self.selectPrevSnippet();
                } else {
                    self.selectNextSnippet();
                }
                // return focus to the input if it's not there
                self.$searchInput.focus();
            }
            // insert snippet to the current line position
            if (e.which === 13) { // enter key
                e.preventDefault();
                e.stopImmediatePropagation();
                self.insertSnippet();
            }
        });

        // refresh widget on every key and add focus to search input
        this.$searchInput.on("focus change keyup", function () {
            self.refreshSnippets();
        }).focus();

        // add events to snippet list
        this.$snippetsList.on("click", ".snippet-entry", function () {
            var snippetId = parseInt($(this).attr("x-snippet-id"), 10),
                s = _.find(self.snippets, function (s) { return s._id === snippetId; });
            if (s) {
                self.selectSnippet(s);
            }
        });
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
            this.selectedSnippet = snippet;
        } else if (this.selectedSnippet) {
            // if a snippet was previously selected try to find this snippet between current snippets
            var s = _.find(this.snippets, function (s) { return s._id === this.selectedSnippet._id; }, this);
            // if not found, just select first one available
            if (!s) { this.selectedSnippet = this.snippets.length > 0 ? this.snippets[0] : null; }
        } else {
            // no snippet was passed explicitly and no snippet was previously selected, select fist one
            this.selectedSnippet = this.snippets.length > 0 ? this.snippets[0] : null;
        }

        if (!this.selectedSnippet && this.snippets.length > 0) {
            throw new Error("[brackets-snippets] No snippet selected!");
        }

        this.$snippetsList.find(".selected").removeClass("selected");
        this.$snippetsList.find("[x-snippet-id='" + this.selectedSnippet._id + "']").addClass("selected");
        this.renderSnippet();
    };

    SnippetWidget.prototype.selectPrevSnippet = function () {
        var prevSnippet = null;
        for (var i = 0; i < this.snippets.length; i++) {
            if (this.snippets[i]._id === this.selectedSnippet._id) {
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
            if (this.snippets[i]._id === this.selectedSnippet._id) {
                nextSnippet = this.snippets[i + 1];
                break;
            }
        }
        if (nextSnippet) {
            this.selectSnippet(nextSnippet);
        }
    };

    SnippetWidget.prototype.renderSnippet = function () {
        this.$currentSnippetArea.children(".snippet-name").text(this.selectedSnippet.name);
        this.$currentSnippetArea.children("pre").text(this.selectedSnippet.template);
    };

    SnippetWidget.prototype.insertSnippet = function () {
        var textToInsert  = this.selectedSnippet.template + "\n",
            positionStart = {
                line: this.originalCursorPosition.line,
                ch: 0
            };

        // indent all lines of the snippet with current indentation
        var indent = this.originalCursorPosition.ch,
            lines = textToInsert.split("\n");
        textToInsert = lines.map(function (line) {
            var i = indent;
            while (i--) { line = " " + line; }
            return line;
        }).join("\n");

        // insert the text itself
        this.hostEditor.document.replaceRange(textToInsert, positionStart);
        // close the widget
        this.close();
        // fix cursor position only after close has been called
        this.hostEditor.setCursorPos(this.originalCursorPosition.line + lines.length - 1, this.originalCursorPosition.ch);
    };

    function triggerWidget() {
        var activeEditor = EditorManager.getActiveEditor(),
            sWidget      = new SnippetWidget(activeEditor, activeEditor.getCursorPos());
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
