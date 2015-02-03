define(function (require, exports) {
    "use strict";

    // Brackets modules
    var _                 = brackets.getModule("thirdparty/lodash"),
        CodeMirror        = brackets.getModule("thirdparty/CodeMirror2/lib/codemirror"),
        CommandManager    = brackets.getModule("command/CommandManager"),
        EditorManager     = brackets.getModule("editor/EditorManager"),
        Menus             = brackets.getModule("command/Menus"),
        LanguageManager   = brackets.getModule("language/LanguageManager"),
        InlineWidget      = brackets.getModule("editor/InlineWidget").InlineWidget;

    // Local modules
    var ErrorHandler    = require("src/ErrorHandler"),
        EventEmitter    = require("src/EventEmitter"),
        Preferences     = require("src/Preferences"),
        SettingsDialog  = require("src/SettingsDialog"),
        Snippet         = require("src/Snippet"),
        Snippets        = require("src/Snippets"),
        Strings         = require("strings");

    // Constants
    var WIDGET_MIN_HEIGHT     = 150,
        WIDGET_MAX_HEIGHT     = 300,
        CODEFONT_BORDER_IN_PX = 2,
        CODEFONT_WIDTH_IN_PX  = 8.4,
        SELECTED_MARK         = "{{!selected}}",
        CURSOR_MARK           = "{{!cursor}}",
        VARIABLE_REGEXP       = /\{\{\$([0-9]+)(\??)\:([a-zA-Z0-9]+)/;

    // Templates
    var snippetWidgetTemplate     = require("text!templates/SnippetWidget.html"),
        snippetWidgetListTemplate = require("text!templates/SnippetWidgetList.html");

    // Helpers
    function scrollParentToChild($parent, $child) {
        $parent.scrollTop($parent.scrollTop() +
                          $child.position().top -
                          $parent.height() / 2 +
                          $child.height() / 2);
    }

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
    SnippetWidget.prototype.height = WIDGET_MIN_HEIGHT;

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

    SnippetWidget.prototype.getSnippetByPath = function (fullPath) {
        return _.find(this.snippets, function (snippet) {
            return snippet.fullPath === fullPath;
        });
    };

    SnippetWidget.prototype.executeTab = function ($from, reverse) {

        if ($from.is(".variable")) {

            // going from a variable we go to next/prev variable
            var $variables = this.$currentSnippetArea.find(".variable"),
                variables = $variables.toArray(),
                areEmpty = $variables.map(function () { return $(this).val(); }).toArray().indexOf("") !== -1,
                currentPos = variables.indexOf($from[0]);

            var step = function (pos) {
                if (reverse) {
                    pos -= 1;
                    if (pos < 0) {
                        pos = variables.length - 1;
                    }
                } else {
                    pos += 1;
                    if (pos >= variables.length) {
                        pos = 0;
                    }
                }
                return pos;
            };

            // if all are filled, navigate normally
            // if some are empty, navigate only empty ones
            if (!areEmpty) {
                currentPos = step(currentPos);
            } else {
                do {
                    currentPos = step(currentPos);
                } while ($(variables[currentPos]).val() !== "");
            }

            $(variables[currentPos]).focus();

        } else if ($from.is(".snippet-search-input")) {

            // going from search input focus first variable if there's one
            var $vars = this.$currentSnippetArea.find(".variable");
            if ($vars.length > 0 && !reverse) {
                $vars.first().focus();
            }

        } else {

            // focus search input
            this.$htmlContent.find(".snippet-search-input").focus();

        }

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
            if (e.which === 9) { // tab key
                e.preventDefault();
                e.stopImmediatePropagation();
                self.executeTab($(e.target), e.shiftKey);
            }
        });

        // refresh widget on every key and add focus to search input
        this.$searchInput
            .focus()
            .on("focus change keyup", function () {
                self.refreshSnippets();
            });

        // add events to snippet list
        this.$snippetsList
            .on("click", ".snippet-entry", function () {
                var snippetPath = $(this).attr("x-snippet-path"),
                    snippet     = self.getSnippetByPath(snippetPath);
                if (snippet) {
                    self.selectSnippet(snippet);
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
            var newSnippet = new Snippet();
            newSnippet.name = self.$searchInput.val().trim();

            Snippets.editSnippetDialog(newSnippet).then(function (savedSnippet) {
                self.selectedSnippet = savedSnippet;
                refresh();
            });
        });

        // event for snippet editing
        this.$editSnippetBtn.on("click", function () {
            Snippets.editSnippetDialog(self.selectedSnippet).then(function (savedSnippet) {
                self.selectedSnippet = savedSnippet;
                refresh();
            });
        });

        // event for snippet deleting
        this.$deleteSnippetBtn.on("click", function (e) {
            if (e.shiftKey) {
                Snippets.deleteAllSnippetsDialog()
                    .then(function () {
                        refresh();
                    });
                return;
            }
            Snippets.deleteSnippetDialog(self.selectedSnippet)
                .then(function () {
                    refresh();
                });
        });

        // event for settings dialog
        this.$htmlContent.find(".snippets-settings").on("click", function () {
            SettingsDialog.show()
                .then(function () {
                    refresh();
                });
        });

        // event for resizing variable inputs
        var resizeInput = function ($input, length) {
            $input.width(CODEFONT_BORDER_IN_PX + length * CODEFONT_WIDTH_IN_PX);
            $input.removeClass("required");
        };
        this.$currentSnippetArea
            .on("focus", ".variable", function () {
                var $this = $(this);
                scrollParentToChild($this.parents(".snippet-content").first(), $this);
            })
            .on("keypress", ".variable", function () {
                var $this = $(this),
                    val = $this.val();
                resizeInput($this, val.length + 1);
            })
            .on("blur", ".variable", function () {
                var $this = $(this),
                    val = $this.val();
                resizeInput($this, val ? val.length : $this.attr("placeholder").length);
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

        // refresh snippets for the first time
        self.refreshSnippets();
    };

    SnippetWidget.prototype.refreshSnippets = function (force) {
        var query = this.$searchInput.val();
        if (force || query !== this.lastQuery || typeof this.lastQuery !== "string") {
            this.lastQuery = query;

            if (this.detachedMode) {
                var lookingFor = this.$searchInput.val();
                this.snippets = [_.find(Snippets.getAll(), function (snippet) {
                    return snippet.name === lookingFor;
                })];
            } else {
                this.snippets = Snippets.search(query);
            }

            this.$snippetsList.html(Mustache.render(snippetWidgetListTemplate, {
                snippets: this.snippets,
                Strings: Strings
            })).toggleClass("is-empty", this.snippets.length === 0);

            this.selectSnippet();
        }
    };

    SnippetWidget.prototype.animationInProgress = function () {
        return this.$htmlContent.hasClass("animating");
    };

    SnippetWidget.prototype.afterAnimation = function () {
        this.selectSnippet();
    };

    SnippetWidget.prototype.selectSnippet = function (snippet) {
        if (snippet) {
            // if a snippet was passed, explicitly set this snippet as selected
            this.selectedSnippet = snippet;
        } else if (this.selectedSnippet) {
            // if a snippet was previously selected try to find this snippet between current snippets
            var s = this.getSnippetByPath(this.selectedSnippet.fullPath);
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
            // TODO: there's no snippet _id anymore
            var $selected = this.$snippetsList
                .find("[x-snippet-path='" + this.selectedSnippet.fullPath + "']")
                .addClass("selected");
            // this will scroll $snippetsList so $selected is in view
            if (!this.animationInProgress()) {
                scrollParentToChild(this.$snippetsList, $selected);
            }
        }
        this.renderSnippet();
    };

    SnippetWidget.prototype.selectPrevSnippet = function () {
        var prevSnippet = null;
        for (var i = 0; i < this.snippets.length; i++) {
            if (this.snippets[i].fullPath === this.selectedSnippet.fullPath) {
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
            if (this.snippets[i].fullPath === this.selectedSnippet.fullPath) {
                nextSnippet = this.snippets[i + 1];
                break;
            }
        }
        if (nextSnippet) {
            this.selectSnippet(nextSnippet);
        }
    };

    SnippetWidget.prototype.getVariablesFromTemplate = function (template) {
        var m = template.match(/\{\{\$[^\}]+\}\}/g);
        return m ? m.map(function (str) {
            var v = str.match(VARIABLE_REGEXP);
            return {
                num: v[1],
                optional: v[2] === "?",
                name: v[3],
                str: str
            };
        }) : [];
    };

    SnippetWidget.prototype.renderSnippet = function () {
        var $snippetName  = this.$currentSnippetArea.find(".snippet-name"),
            $snippetPath  = this.$currentSnippetArea.find(".snippet-path"),
            $snippetMeta  = this.$currentSnippetArea.find(".snippet-meta"),
            $pre          = this.$currentSnippetArea.find(".snippet-content").children("pre"),
            isSnippetSelected = !!this.selectedSnippet;

        $pre.toggle(isSnippetSelected);
        this.$editSnippetBtn.prop("disabled", !isSnippetSelected);
        this.$deleteSnippetBtn.prop("disabled", !isSnippetSelected);

        if (!isSnippetSelected) {
            $snippetName.text(Strings.NO_SNIPPET_SELECTED);
            return;
        }

        $snippetName.text(this.selectedSnippet.name);
        $snippetPath.text(this.selectedSnippet.fullPath || "-");

        var meta = this.selectedSnippet.meta;
        if (!_.isEmpty(meta)) {
            $snippetMeta.text(JSON.stringify(meta, null, 1).replace(/\n/g, " ").replace(/\s+/g, " "));
        } else {
            $snippetMeta.text("");
        }

        var template = this.selectedSnippet.template,
            variables = this.getVariablesFromTemplate(template);

        if (CodeMirror.runMode) {

            // we need to temporarily replace variables with comething CodeMirror won't touch
            variables.forEach(function (variable, index) {
                // 57344 = 0xE000 - Private Use Areas first character
                template = template.replace(variable.str, String.fromCharCode(57344 + index));
            });

            var $temp = $("<div>");

            var lang;
            if (this.selectedSnippet.meta.lang) {
                lang = LanguageManager.getLanguageForExtension(this.selectedSnippet.meta.lang);
            }
            if (!lang) {
                lang = LanguageManager.getLanguageForPath(this.hostEditor.document.file.fullPath);
            }

            CodeMirror.runMode(template, lang.getMode(), $temp[0]);
            var html = $temp.html();

            // now convert back to variable strings after being formatted by CodeMirror
            html = html.replace(/[\uE000-\uE0FF]/g, function (a) {
                return variables[a.charCodeAt(0) - 57344].str;
            });

            $pre.html(html);

        } else {
            $pre.text(template);
        }

        if (variables.length > 0) {
            var currentHtml = $pre.html();
            variables.forEach(function (variable) {
                var w = CODEFONT_BORDER_IN_PX + variable.name.length * CODEFONT_WIDTH_IN_PX;
                var inputHtml = "<input class='variable' type='text'" +
                                " x-var-num='" + variable.num + "'" +
                                " x-var-optional='" + variable.optional.toString() + "'" +
                                " placeholder='" + variable.name + "'" +
                                " style='width:" + w + "px;' />";
                currentHtml = currentHtml.replace(variable.str, inputHtml);
            });
            $pre.html(currentHtml);
        }

        if (this._onNextRender) {
            this._onNextRender();
            delete this._onNextRender;
        }

        // calculate the snippet widget height between WIDGET_MIN_HEIGHT and WIDGET_MAX_HEIGHT
        if (!this.animationInProgress()) {
            var currentHeight = this.$htmlContent.height();
            var borders = currentHeight - $pre.parent().outerHeight();
            currentHeight = $pre.outerHeight() + borders;
            if (currentHeight > WIDGET_MAX_HEIGHT) { currentHeight = WIDGET_MAX_HEIGHT; }
            if (currentHeight < WIDGET_MIN_HEIGHT) { currentHeight = WIDGET_MIN_HEIGHT; }
            this.$htmlContent.height(currentHeight);

            // calculate if the .snippet-content is scrollable and add scroll classes
            this.$currentSnippetArea.find(".snippet-content").off("scroll").on("scroll", function (evt) {
                var $el = $(evt.target);
                var scrollTop = $el.scrollTop();
                var scrollBottom = $el[0].scrollHeight - $el.height() - scrollTop;
                $el.toggleClass("can-scroll-top", scrollTop > 3);
                $el.toggleClass("can-scroll-bottom", scrollBottom > 3);
            }).trigger("scroll");
        }
    };

    SnippetWidget.prototype.fillOutVariables = function (params) {
        this.$currentSnippetArea.find(":input").each(function () {
            var $this = $(this),
                num   = parseInt($this.attr("x-var-num"), 10);
            $this.val(params[num - 1]).trigger("blur");
        });
    };

    SnippetWidget.prototype.hasUnfilledVariables = function () {
        var $inputs = this.$currentSnippetArea.find(":input");
        if ($inputs.length === 0) { return false; }

        // filter out optional inputs
        $inputs = $inputs.filter(function () { return $(this).attr("x-var-optional") !== "true"; });

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

            var m = variable.match(VARIABLE_REGEXP),
                num = m[1],
                $input = this.$currentSnippetArea.find("[x-var-num='" + num + "']");

            text = text.replace(variable, $input.val());

        }, this);

        return text;
    };

    SnippetWidget.prototype.prefillSearch = function (str, prepend, append) {
        this.$searchInput.val(str);
        this.prefilledSearch = true;
        this.snippetPrepend = prepend;
        this.snippetAppend = append;
    };

    SnippetWidget.prototype.onNextRender = function (fn) {
        this._onNextRender = fn.bind(this);
    };

    SnippetWidget.prototype._getCurrentIndent = function (selectedText, positionStart, positionEnd) {
        var i,
            ws,
            doc             = this.hostEditor.document,
            currentLine     = doc.getRange(positionStart, positionEnd),
            lineBreakBefore = false,
            indent          = "";

        if (selectedText) {

            ws = doc.getRange({ line: positionStart.line, ch: 0 }, positionStart);
            i = ws.length;
            while (i--) { indent += " "; }

        } else if (currentLine.match(/\S/)) {

            if (!this.prefilledSearch) {
                lineBreakBefore = true;
            }

            ws = currentLine.match(/^\s+/);
            indent = ws ? ws[0] : "";

        } else {

            i = this.originalCursorPosition.ch;
            while (i--) { indent += " "; }

        }

        return {
            indent: indent,
            lineBreakBefore: lineBreakBefore
        };
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
            snippetCursorCh   = null,
            indentFirstLine   = true;

        // if something in editor is selected, use that to replace
        var selectedText = this.hostEditor.getSelectedText();
        if (selectedText) {
            indentFirstLine = false;
            var sel = this.hostEditor.getSelection();
            positionStart = sel.start;
            positionEnd   = sel.end;
        }

        textToInsert = this.fillVariablesFromInputs(textToInsert);

        var nextLine        = doc.getRange(
                { line: origLine + 1, ch: 0 },
                { line: origLine + 1, ch: 999 }
            ),
            afterCursor     = doc.getRange(this.originalCursorPosition, positionEnd),
            indentInfo      = this._getCurrentIndent(selectedText, positionStart, positionEnd),
            indent          = indentInfo.indent,
            lineBreakBefore = indentInfo.lineBreakBefore,
            lineBreakAfter  = false;

        // add prepends and appends
        if (this.snippetPrepend) {
            textToInsert = this.snippetPrepend + " " + textToInsert;
        }
        if (this.snippetAppend) {
            textToInsert = textToInsert + " " + this.snippetAppend;
        }

        // check if we need to insert a new line after the snippet
        if (nextLine.match(/\S/) || afterCursor.match(/\S/)) {
            lineBreakAfter = true;
            textToInsert += "\n";
        }

        // replace {{!selected}} with currently selected text
        var lines;
        var io = textToInsert.indexOf(SELECTED_MARK);
        if (io !== -1) {

            // we need to calculate indent of SELECTED_MARK
            var selectedMarkIndent = "";
            textToInsert.split("\n").forEach(function (line) {
                if (line.indexOf(SELECTED_MARK)) {
                    var m = line.match(/^\s+/);
                    if (m) {
                        selectedMarkIndent = m[0];
                    }
                }
            });

            // original whitespace needs to be removed from selectedText
            // add selectedMarkIndent whitespace
            var minWhitespaceLength = 999;
            lines = this.selectedText.split("\n");
            lines.forEach(function (line) {
                var m = line.match(/^\s+/);
                if (m && m[0].length < minWhitespaceLength) {
                    minWhitespaceLength = m[0].length;
                }
            });
            this.selectedText = lines.map(function (line, index) {
                var m = line.match(/^\s+/);
                if (m) {
                    line = line.substring(minWhitespaceLength);
                }
                if (index !== 0) {
                    line = selectedMarkIndent + line;
                }
                return line;
            }).join("\n");

            textToInsert = textToInsert.replace(SELECTED_MARK, this.selectedText);
        }

        // indent all lines of the snippet with current indentation
        lines = textToInsert.split("\n");
        textToInsert = lines.map(function (line, index) {
            if (index !== 0 || index === 0 && indentFirstLine) {
                line = indent + line;
            }
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
            // place text on originalCursorPosition
            doc.replaceRange(textToInsert, this.originalCursorPosition);
        } else {
            // replace whole line as lineBreakBefore false means current line contains only whitespace
            doc.replaceRange(textToInsert, positionStart, positionEnd);
        }

        // close the widget
        if (!this.detachedMode) {
            this.close();
        }

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

    function triggerWidget(snippetToTrigger) {
        if (!(snippetToTrigger instanceof Snippet)) {
            snippetToTrigger = null;
        }

        var activeEditor          = EditorManager.getActiveEditor(),
            sWidget               = new SnippetWidget(activeEditor, activeEditor.getCursorPos()),
            exactMatches          = [],
            exactMatchesParams    = [],
            exactMatchesParamsMax = -1,
            selectedText          = activeEditor.getSelectedText();

        // attach selectedText to widget
        sWidget.selectedText = selectedText;

        // check what's on current line (skip if using selectedText mode)
        var currentLineNo = activeEditor.getCursorPos().line,
            currentLine   = activeEditor.document.getRange({ line: currentLineNo, ch: 0 }, { line: currentLineNo, ch: 999 });
        if (!selectedText && currentLine.match(/\S/)) {

            // if current line is not empty, try to search for a snippet
            var params            = currentLine.trim().replace(/\s+/, " ").split(" "),
                prefillSearchStr  = null,
                prefillVars       = null;

            params.forEach(function (param, index) {
                var possibleVariables = params.slice(index + 1),
                    results           = Snippets.search(param);

                if (results.length === 0) {
                    return;
                }

                // prefill with the first string that returns some results
                if (prefillSearchStr === null) {
                    prefillSearchStr = param;
                }

                // see if we have an exact match
                var exactMatchCandidate = _.find(results, function (snippet) {
                    return snippet.name === param;
                });

                if (exactMatchCandidate) {
                    var variables = sWidget.getVariablesFromTemplate(exactMatchCandidate.template);
                    variables = _.uniq(variables.map(function (v) { return v.num; }));

                    if (variables.length < possibleVariables.length) {
                        possibleVariables = possibleVariables.slice(0, variables.length);
                    }

                    if (variables.length === possibleVariables.length) {
                        exactMatches.push(exactMatchCandidate);
                        exactMatchesParams.push(possibleVariables);
                        if (possibleVariables.length > exactMatchesParamsMax) {
                            exactMatchesParamsMax = possibleVariables.length;
                        }
                    }
                }
            });

            if (exactMatches.length > 0) {
                // get the latest 'exactMatch' with the 'exactMatchesParamsMax' parameters
                var i = exactMatches.length;
                while (i--) {
                    if (exactMatchesParams[i].length === exactMatchesParamsMax) {
                        break;
                    }
                }
                // prefill the search with it and fill out variables
                prefillSearchStr = exactMatches[i].name;
                prefillVars = exactMatchesParams[i];
            } else {
                // not the exact match, but we can still prefill some variables
                prefillVars = params.slice(params.indexOf(prefillSearchStr) + 1);
            }

            if (prefillSearchStr) {

                var beforeString = params.slice(0, params.indexOf(prefillSearchStr)).join(" ");
                var afterString = params.slice(params.indexOf(prefillSearchStr) + prefillVars.length + 1).join(" ");
                sWidget.prefillSearch(prefillSearchStr, beforeString, afterString);

                if (prefillVars && prefillVars.length > 0) {
                    sWidget.onNextRender(function () {
                        this.fillOutVariables(prefillVars);
                        this.insertSnippet();
                    });
                }

            }

        }

        if (exactMatches.length > 0) {
            sWidget.detachedMode = true;
            sWidget.onAdded();
        } else {
            activeEditor.addInlineWidget(activeEditor.getCursorPos(), sWidget, true).done(function () {
                sWidget.afterAnimation();
            });
        }
    }

    function bindShortcut() {
        var TRIGGER_SNIPPET_CMD = "snippets.triggerWidget";
        CommandManager
            .register(Strings.TRIGGER_SNIPPET_MENU_ENTRY, TRIGGER_SNIPPET_CMD, function () {

                // if widget is currently open on this document, just close it
                var currentWidgetsWithFocus = EditorManager
                    .getActiveEditor()
                    .getInlineWidgets()
                    .filter(function (w) { return w instanceof SnippetWidget &&
                                                  w.$htmlContent.find(":focus").length > 0; });

                if (currentWidgetsWithFocus.length > 0) {
                    currentWidgetsWithFocus.forEach(function (w) { w.close(); });
                    return;
                }

                triggerWidget();
            });
        Menus
            .getMenu(Menus.AppMenuBar.EDIT_MENU)
            .addMenuItem(TRIGGER_SNIPPET_CMD, Preferences.get("triggerSnippetShortcut"));
    }

    function init() {
        bindShortcut();
    }

    EventEmitter.on("TRIGGER_SNIPPET", function (snippet) {
        triggerWidget(snippet);
    });

    exports.init = init;

});
