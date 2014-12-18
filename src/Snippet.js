define(function (require, exports, module) {
    "use strict";

    // Brackets modules
    var _          = brackets.getModule("thirdparty/lodash"),
        FileSystem = brackets.getModule("filesystem/FileSystem");

    // Local modules
    var ErrorHandler = require("src/ErrorHandler"),
        Preferences = require("src/Preferences"),
        Promise     = require("bluebird");

    function Snippet() {
        this.name     = null;
        this.template = null;
        this.fullPath = null;
        this.meta     = {};
    }

    // loads the snippet from the disk
    Snippet.load = function (fullPath) {
        return new Promise(function (resolve, reject) {

            var file = FileSystem.getFileForPath(fullPath);
            file.read(function (err, content) {

                // error reading requested file
                if (err) {
                    ErrorHandler.show(err);
                    reject();
                    return;
                }

                // successfully loaded file from disk
                var s = new Snippet();
                s.name = file.name;
                s.fullPath = fullPath;
                s.parseFileContent(content);
                resolve(s);

            });

        });
    };

    // creates new snippet file on the disk
    Snippet.create = function (name, template) {
        return new Promise(function (resolve, reject) {

            var fullPath = Preferences.get("defaultSnippetDirectory") + name;
            FileSystem.resolve(fullPath, function (err) {

                // NotFound is desired here, because we should be writing new file to disk
                if (err === "NotFound") {
                    FileSystem.getFileForPath(fullPath).write(template, function (err) {

                        // error writing the file to disk
                        if (err) {
                            ErrorHandler.show(err);
                            reject();
                            return;
                        }

                        // successfully saved new snippet to disk
                        var s = new Snippet();
                        s.name = name;
                        s.template = template;
                        s.fullPath = fullPath;
                        resolve(s);

                    });
                    return;
                }

                // error resolving the file, it may or may not exist
                if (err) {
                    ErrorHandler.show(err);
                    reject();
                    return;
                }

                // no error resolving the file, it already exists
                ErrorHandler.show("File already exists: " + fullPath);
                reject();

            });

        });
    };

    Snippet.prototype.rename = function (newName) {
        var self = this;
        return new Promise(function (resolve, reject) {

            // decide on the new name
            var split = self.fullPath.split("/");
            split.pop(); // removes old name
            split.push(newName); // adds new name
            var newFullPath = split.join("/");

            FileSystem.resolve(self.fullPath, function (err, file) {

                // error resolving the file
                if (err) {
                    ErrorHandler.show(err);
                    reject();
                    return;
                }

                file.rename(newFullPath, function (err) {

                    // target file already exists
                    if (err === "AlreadyExists") {
                        ErrorHandler.show("File already exists: " + newFullPath);
                        reject();
                        return;
                    }

                    // error renaming the file
                    if (err) {
                        ErrorHandler.show(err);
                        reject();
                        return;
                    }

                    self.name = newName;
                    self.fullPath = newFullPath;
                    resolve();

                });

            });

        });
    };

    Snippet.prototype.rewrite = function (newTemplate) {
        var self = this;
        return new Promise(function (resolve, reject) {

            FileSystem.resolve(self.fullPath, function (err, file) {

                // error resolving the snippet file
                if (err) {
                    ErrorHandler.show(err);
                    reject();
                    return;
                }

                file.write(newTemplate, function (err) {

                    // error writing to the snippet file
                    if (err) {
                        ErrorHandler.show(err);
                        reject();
                        return;
                    }

                    self.template = newTemplate;
                    resolve();

                });

            });

        });
    };

    Snippet.prototype.update = function (name, template) {
        var self = this;
        return new Promise(function (resolve) {

            var renameRequired  = self.name !== name;
            var rewriteRequired = self.template !== template;

            if (renameRequired) {
                self.rename(name).then(function () {
                    if (rewriteRequired) {
                        self.rewrite(template).then(function () {
                            resolve();
                        });
                    }
                });
            } else if (rewriteRequired) {
                self.rewrite(template).then(function () {
                    resolve();
                });
            } else {
                resolve();
            }

        });
    };

    Snippet.prototype.delete = function () {
        var self = this;
        return new Promise(function (resolve, reject) {

            FileSystem.resolve(self.fullPath, function (err, file) {

                if (err) {
                    ErrorHandler.show(err);
                    reject();
                    return;
                }

                file.unlink(function (err) {

                    if (err) {
                        ErrorHandler.show(err);
                        reject();
                        return;
                    }

                    resolve();

                });

            });

        });
    };

    Snippet.prototype.clone = function () {
        var clone = new Snippet();
        Object.keys(this).forEach(function (key) {
            clone[key] = _.cloneDeep(this[key]);
        }, this);
        return clone;
    };

    Snippet.prototype.parseFileContent = function (content) {
        // extract meta from content
        var lines = content.split("\n");
        while (lines.length > 0 && lines[0].match(/^##/)) {
            var m = lines.shift().match(/^##([a-zA-Z0-9]+)\s*:(.*)/);
            if (m) {
                this.meta[m[1]] = m[2].trim();
            }
        }
        this.template = lines.join("\n");
    };

    Snippet.prototype.createFileContent = function () {
        var sb = [];
        Object.keys(this.meta).forEach(function (key) {
            sb.push("##" + key + ": " + this.meta[key]);
        }, this);
        sb.push(this.template);
        return sb.join("\n");
    };

    module.exports = Snippet;

});
