# Changelog

## 0.5.0 (???)
* French translation by [Yoan](https://github.com/MAYdev)
* Foundation snippets by [Stéphane](https://github.com/LeG3nDz)
* Fixed an issue where snippet directory was deleted from the disk or cannot be reached anymore.
* If a widget has focus, `alt-S` shortcut will close the currently focused widget.
* Fixed color issues for dark themes.

## 0.4.0 (18/12/2014)
* Implemented metadata support for snippets, add `##key: value` to the beggining of the snippet file to provide metadata.
* Implemented metadata key `lang` which should be an extension of language desired for syntax highlighting e.g. `##lang: js`
* Fixed a case when inserting a snippet inside html tags.

## 0.3.1 (10/12/2014)
* Fixed CodeMirror breaking snippet variables.
* Fixed a case when invalid snippet was executed from a current line.

## 0.3.0 (09/12/2014)
* Snippets are now colored using CodeMirror mode for currently opened file.
* When focusing into snippet variables, the area scrolls so the variable is in the view.
* Improved algorithm for matching snippets from current line.
* Currently selected text will fill out special variable `{{!selected}}` if present in the chosen snippet.

## 0.2.1 (08/12/2014)
* It is possible to prefill variables to widget, try typing `ng-directive myModule` and use alt-S
* When all variables are prefilled, snippet is inserted automatically, try `ng-controller myModule myController` and use alt-S

## 0.2.0 (05/12/2014)
* Text on current line can be used to prefill snippets widget (type `ng` and use alt-S)
* If the prefill text is an exact match, this snippet will be inserted automatically (type `bs-table` and use alt-S)

## 0.1.1 (28/11/2014)
* Fixed some issues when using tab key to navigate snippet variables.

## 0.1.0 (26/11/2014)
* Rewritten in the way that all snippets are stored in files.
* Ensures default snippet directory is correctly set on the startup.
* All new snippets are written into the current default snippet directory.
* New snippet dialog doesn't close when you can't write new snippet file.
* Snippet file path is now shown in the snippet widget.

## 0.0.6 (25/11/2014)
* You can now use same variable multiple times in snippet.
* Ability to delete custom snippet directories.
* Directory snippets are no longer persisted into Brackets cache.
* Directory snippets edits are now written to the disk.

## 0.0.5 (24/11/2014)
* Three dot mark (...) for cursor replaced by {{!cursor}}
* Default shortcut changed to Alt-S

## 0.0.4 (24/11/2014)
* Support for variables in snippets (see angularjs sample snippets).
* Ability to delete all loaded snippets through shift-click on delete.
* Snippets are now alphabetically sorted.

## 0.0.3 (21/11/2014)
* Shortcut for Mac should be now Cmd-Ctrl-Space.
* Fixed some issues when importing snippets from Gist.

## 0.0.2 (20/11/2014)
* Added support for default snippets.
* Snippets can now be loaded from directories automatically, configure your own directories in settings.
* Three dot mark (...) will be replaced with a cursor after inserting a snippet.

## 0.0.1 (19/11/2014)
* Initial release.
