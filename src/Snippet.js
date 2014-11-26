define(function (require, exports, module) {
    "use strict";

    // Brackets modules
    var FileSystem      = brackets.getModule("filesystem/FileSystem");

    // Local modules
    var ErrorHandler = require("src/ErrorHandler"),
        Preferences = require("src/Preferences"),
        Promise     = require("bluebird");

    function Snippet() {
        this.name     = null;
        this.template = null;
        this.fullPath = null;
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
                s.template = content;
                s.fullPath = fullPath;
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

    module.exports = Snippet;

});
