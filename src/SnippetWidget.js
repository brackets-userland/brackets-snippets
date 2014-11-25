define(function (require, exports) {
    "use strict";

    // Brackets modules
    var _                 = brackets.getModule("thirdparty/lodash"),
        CommandManager    = brackets.getModule("command/CommandManager"),
        EditorManager     = brackets.getModule("editor/EditorManager"),
        Menus             = brackets.getModule("command/Menus"),
        InlineWidget      = brackets.getModule("editor/InlineWidget").InlineWidget;

    // Local modules
    var ErrorHandler    = require("src/ErrorHandler"),
        Preferences     = require("src/Preferences"),
        SettingsDialog  = require("src/SettingsDialog"),
        Snippets        = require("src/Snippets"),
        Strings         = require("strings");

    // Constants
    var WIDGET_HEIGHT        = 150,
        CODEFONT_WIDTH_IN_PX = 8,
        CURSOR_MARK          = "{{!cursor}}";

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
        this.$editSnippetBtn = this.$htmlContent.find(".edit-snippet");
        this.$deleteSnippetBtn = this.$htmlContent.find(".delete-snippet");
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
        this.$snippetsList
            .on("click", ".snippet-entry", function () {
                var snippetId = parseInt($(this).attr("x-snippet-id"), 10),
                    s = _.find(self.snippets, function (s) { return s._id === snippetId; });
                if (s) {
                    self.selectSnippet(s);
                }
            })
            .on("dblclick", ".snippet-entry", function () {
                self.insertSnippet();
            });

        // function to call after snippets collection has changed by new/edit/delete
        var refresh = function () {
            self.refreshSnippets(true);
            self.$searchInput.focus();
        };

        // add event for new snippet
        this.$htmlContent.find(".new-snippet").on("click", function () {
            var newSnippet = { name: self.$searchInput.val().trim() };
            Snippets.addNewSnippetDialog(newSnippet).done(refresh);
        });

        // event for snippet editing
        this.$editSnippetBtn.on("click", function () {
            Snippets.editSnippetDialog(self.selectedSnippet).done(refresh);
        });

        // event for snippet deleting
        this.$deleteSnippetBtn.on("click", function (e) {
            if (e.shiftKey) {
                Snippets.deleteAllSnippetsDialog().done(refresh);
                return;
            }
            Snippets.deleteSnippetDialog(self.selectedSnippet).done(refresh);
        });

        // event for settings dialog
        this.$htmlContent.find(".snippets-settings").on("click", function () {
            SettingsDialog.show().done(refresh);
        });

        // event for resizing variable inputs
        var resizeInput = function ($input, length) {
            $input.width(length * CODEFONT_WIDTH_IN_PX);
            $input.removeClass("required");
        };
        this.$currentSnippetArea
            .on("keypress", ".variable", function () {
                var $this = $(this),
                    val = $this.val();
                resizeInput($this, val.length + 1);
            })
            .on("blur", ".variable", function () {
                var $this = $(this),
                    val = $this.val();
                resizeInput($this, val.length);
            })
            .on("keyup", ".variable", function () {
                var that = this,
                    $this = $(this),
                    newValue = $this.val(),
                    num = $this.attr("x-var-num"),
                    $siblings = self.$currentSnippetArea.find("[x-var-num='" + num + "']");
                $siblings.each(function () {
                    if (this !== that) {
                        $(this).val(newValue).trigger("blur");
                    }
                });
            });
    };

    SnippetWidget.prototype.refreshSnippets = function (force) {
        var query = this.$searchInput.val();
        if (force || query !== this.lastQuery || typeof this.lastQuery !== "string") {
            this.lastQuery = query;
            this.snippets = Snippets.search(query);
            this.$snippetsList.html(Mustache.render(snippetWidgetListTemplate, {
                snippets: this.snippets,
                Strings: Strings
            })).toggleClass("is-empty", this.snippets.length === 0);

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
            ErrorHandler.show("SnippetWidget.prototype.selectSnippet: No snippet selected!");
        }

        this.$snippetsList.find(".selected").removeClass("selected");
        if (this.selectedSnippet) {
            var $selected = this.$snippetsList.find("[x-snippet-id='" + this.selectedSnippet._id + "']").addClass("selected");
            // this will scroll $snippetsList so $selected is in view
            this.$snippetsList.scrollTop(this.$snippetsList.scrollTop() +
                                         $selected.position().top -
                                         this.$snippetsList.height() / 2 +
                                         $selected.height() / 2);
        }
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
        var $snippetName  = this.$currentSnippetArea.find(".snippet-name"),
            $snippetPath  = this.$currentSnippetArea.find(".snippet-path"),
            $pre          = this.$currentSnippetArea.children("pre"),
            isSnippetSelected = !!this.selectedSnippet;

        $pre.toggle(isSnippetSelected);
        this.$editSnippetBtn.prop("disabled", !isSnippetSelected);
        this.$deleteSnippetBtn.prop("disabled", !isSnippetSelected);

        if (!isSnippetSelected) {
            $snippetName.text(Strings.NO_SNIPPET_SELECTED);
            return;
        }

        $snippetName.text(this.selectedSnippet.name);
        $snippetPath.text(this.selectedSnippet.snippetFilePath || "-");

        var escaped = _.escape(this.selectedSnippet.template),
            variables = escaped.match(/\{\{\$[^\}]+\}\}/g);

        if (variables) {
            variables.forEach(function (variable) {
                var m = variable.match(/\{\{\$([0-9]+)\:([a-zA-Z0-9]+)/),
                    num = m[1],
                    name = m[2],
                    magicConstant = 2, // don't ask
                    w = magicConstant + (name.length * CODEFONT_WIDTH_IN_PX) + "px";
                var inputHtml = "<input class='variable' type='text'" +
                                " x-var-num='" + num + "'" +
                                " placeholder='" + name + "'" +
                                " style='width:" + w + "' />";
                escaped = escaped.replace(variable, inputHtml);
            });
        }

        $pre.html(escaped);
    };

    SnippetWidget.prototype.hasUnfilledVariables = function () {
        var $inputs = this.$currentSnippetArea.find(":input");
        if ($inputs.length === 0) { return false; }

        // find first empty input and focus there
        for (var i = 0; i < $inputs.length; i++) {
            var $input = $($inputs[i]);
            if ($input.val().length === 0) {
                if ($input.is(":focus")) {
                    $input.addClass("required");
                }
                $input.focus();
                return true;
            }
        }

        return false;
    };

    SnippetWidget.prototype.fillVariablesFromInputs = function (text) {
        var variables = text.match(/\{\{\$[^\}]+\}\}/g);
        if (!variables) { return text; }

        variables.forEach(function (variable) {

            var m = variable.match(/\{\{\$([0-9]+)\:([a-zA-Z0-9]+)/),
                num = m[1],
                $input = this.$currentSnippetArea.find("[x-var-num='" + num + "']");

            text = text.replace(variable, $input.val());

        }, this);

        return text;
    };

    SnippetWidget.prototype.insertSnippet = function () {
        if (this.hasUnfilledVariables()) {
            return;
        }

        var doc               = this.hostEditor.document,
            textToInsert      = this.selectedSnippet.template,
            origLine          = this.originalCursorPosition.line,
            positionStart     = { line: origLine, ch: 0 },
            positionEnd       = { line: origLine, ch: 999 },
            snippetCursorLine = null,
            snippetCursorCh   = null;

        textToInsert = this.fillVariablesFromInputs(textToInsert);

        var currentLine     = doc.getRange(positionStart, positionEnd),
            nextLine        = doc.getRange(
                { line: origLine + 1, ch: 0 },
                { line: origLine + 1, ch: 999 }
            ),
            indent          = "",
            lineBreakBefore = false,
            lineBreakAfter  = false;

        // if line is not empty
        if (currentLine.match(/\S/)) {
            lineBreakBefore = true;
            var ws = currentLine.match(/^\s+/);
            indent = ws ? ws[0] : "";
        } else {
            var i = this.originalCursorPosition.ch;
            while (i--) { indent += " "; }
        }

        // check if we need to insert a new line after the snippet
        if (nextLine.match(/\S/)) {
            lineBreakAfter = true;
            textToInsert += "\n";
        }

        // indent all lines of the snippet with current indentation
        var lines = textToInsert.split("\n");
        textToInsert = lines.map(function (line, index) {
            line = indent + line;
            // check if cursor belongs here
            var cio = line.indexOf(CURSOR_MARK);
            if (cio !== -1) {
                snippetCursorLine = index;
                snippetCursorCh = cio;
                line = line.replace(CURSOR_MARK, "");
            }
            return line;
        }).join("\n");

        // insert the text itself
        if (lineBreakBefore) {
            textToInsert = "\n" + textToInsert;
            lines.length += 1;
            doc.replaceRange(textToInsert, positionEnd);
        } else {
            // replace whole line as lineBreakBefore false means current line contains only whitespace
            doc.replaceRange(textToInsert, positionStart, positionEnd);
        }

        // close the widget
        this.close();

        // check if there's a three-dot mark in the snippet and put a cursor there if there's one
        if (snippetCursorLine !== null) {

            if (lineBreakBefore) { snippetCursorLine++; }
            this.hostEditor.setCursorPos(origLine + snippetCursorLine, snippetCursorCh);

        } else {

            // fix cursor position only after close has been called
            var lastSnippetLine = origLine + lines.length,
                cursorLine      = lineBreakAfter ? lastSnippetLine - 1 : lastSnippetLine,
                cursorCh        = this.originalCursorPosition.ch,
                cursorLineStart = { line: cursorLine, ch: 0 },
                cursorLineEnd   = { line: cursorLine, ch: 999 };

            // if cursorLine is empty, make sure it contains enough whitespace to preserve indentation
            var cursorLineContent = doc.getRange(cursorLineStart, cursorLineEnd);
            if (cursorLineContent.match(/^\s*$/) && cursorLineContent !== indent) {
                doc.replaceRange(indent, cursorLineStart, cursorLineEnd);
            }

            this.hostEditor.setCursorPos(cursorLine, cursorCh);

        }
    };

    function triggerWidget() {
        var activeEditor = EditorManager.getActiveEditor(),
            sWidget      = new SnippetWidget(activeEditor, activeEditor.getCursorPos());
        activeEditor.addInlineWidget(activeEditor.getCursorPos(), sWidget, true);
    }

    function bindShortcut() {
        var TRIGGER_SNIPPET_CMD = "snippets.triggerWidget";
        CommandManager
            .register(Strings.TRIGGER_SNIPPET_MENU_ENTRY, TRIGGER_SNIPPET_CMD, triggerWidget);
        Menus
            .getMenu(Menus.AppMenuBar.EDIT_MENU)
            .addMenuItem(TRIGGER_SNIPPET_CMD, Preferences.get("triggerSnippetShortcut"));
    }

    function init() {
        bindShortcut();
    }

    exports.init = init;

});
