#brackets-snippets [![build status](https://travis-ci.org/zaggino/brackets-snippets.svg?branch=master)](https://travis-ci.org/zaggino/brackets-snippets)

Snippets extension for Brackets

Default shortcut to launch is *Alt-S*

You can go to *Edit -> Trigget code snippet* to open the settings dialog and change the shortcut.

See [CHANGELOG](CHANGELOG.md) for latest news on features/fixes.

Available to install from Brackets inbuilt [extension registry](https://brackets-registry.aboutweb.com/).

###Keyboard
- Use `Alt-S` (or your own defined shortcut) to open a snippet widget
- Use `Up` and `Down` arrows to navigate between various snippets
- Use `Enter` key to insert currently selected snippet (if there are any variables, `Enter` will navigate you to the variables you need to fill out first)
- Use `Tab` key to navigate between variables (if there are any empty ones, `Tab` only navigates between empty)
- Use `Esc` key to close the widget any time

###Snippet marks
- Use `{{!cursor}}` to specify a place where cursor should be placed after inserting a snippet.
- Use `{{!selected}}` to specify a place where currently selected text should be moved.
- Use `{{$1:variableName}}` to specify a snippet variable, you can repeat the variable multiple times in one snippet

###Creating own snippet

![create-snippet-image](docs/images/create-new-snippet.png)
