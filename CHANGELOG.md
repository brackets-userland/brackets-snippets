# Changelog

## Unreleased
### Added
- Support of multiple snippets with the same name for different languages. See `default_snippets` for js and php.

## 0.5.0 - 2015-02-03
### Added
- Implemented optional variables: `{{$1?:optionalVariable}}`
- French translation by [Yoan](https://github.com/MAYdev)
- Foundation snippets by [Stéphane](https://github.com/LeG3nDz)
### Fixed
- An issue where snippet directory was deleted from the disk or cannot be reached anymore.
- If a widget has focus, `alt-S` shortcut will close the currently focused widget.
- Color issues for dark themes.

## 0.4.0 - 2014-12-18
### Added
- Metadata support for snippets, add `##key: value` to the beggining of the snippet file to provide metadata.
- Metadata key `lang` which should be an extension of language desired for syntax highlighting e.g. `##lang: js`
### Fixed
- Fixed a case when inserting a snippet inside html tags.

## 0.3.1 - 2014-12-10
### Fixed
- CodeMirror breaking snippet variables.
- A case when invalid snippet was executed from a current line.

## 0.3.0 - 2014-12-09
### Added
- Snippets are now colored using CodeMirror mode for currently opened file.
- When focusing into snippet variables, the area scrolls so the variable is in the view.
- Currently selected text will fill out special variable `{{!selected}}` if present in the chosen snippet.
### Fixed
- Improved algorithm for matching snippets from current line.

## 0.2.1 - 2014-12-08
### Added
- It is possible to prefill variables to widget, try typing `ng-directive myModule` and use alt-S
- When all variables are prefilled, snippet is inserted automatically, try `ng-controller myModule myController` and use alt-S

## 0.2.0 - 2014-12-05
### Added
- Text on current line can be used to prefill snippets widget (type `ng` and use alt-S)
- If the prefill text is an exact match, this snippet will be inserted automatically (type `bs-table` and use alt-S)

## 0.1.1 - 2014-11-28
### Fixed
- Some issues when using tab key to navigate snippet variables.

## 0.1.0 - 2014-11-26
### Added
- Snippet file path is now shown in the snippet widget.
### Changed
- All new snippets are written into the current default snippet directory.
- Rewritten in the way that all snippets are stored in files.
### Fixed
- Ensure default snippet directory is correctly set on the startup.
- New snippet dialog doesn't close when you can't write new snippet file.

## 0.0.6 - 2014-11-25
### Added
- You can now use same variable multiple times in snippet.
- Ability to delete custom snippet directories.
### Changed
- Directory snippets are no longer persisted into Brackets cache.
- Directory snippets edits are now written to the disk.

## 0.0.5 - 2014-11-24
### Changed
- Three dot mark (...) for cursor replaced by {{!cursor}}
- Default shortcut changed to Alt-S

## 0.0.4 - 2014-11-24
### Added
- Support for variables in snippets (see angularjs sample snippets).
- Ability to delete all loaded snippets through shift-click on delete.
### Fixed
- Snippets are now alphabetically sorted.

## 0.0.3 - 2014-11-21
### Fixed
- Shortcut for Mac should be now Cmd-Ctrl-Space.
- Some issues when importing snippets from Gist.

## 0.0.2 - 2014-11-20
### Added
- Support for default snippets.
- Snippets can now be loaded from directories automatically, configure your own directories in settings.
- Three dot mark (...) will be replaced with a cursor after inserting a snippet.

## 0.0.1 - 2014-11-19
- Initial release.
