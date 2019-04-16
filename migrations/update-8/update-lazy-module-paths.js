"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tasks_1 = require("@angular-devkit/schematics/tasks");
const path = require("path");
exports.updateLazyModulePaths = () => {
    return (_, context) => {
        context.addTask(new tasks_1.TslintFixTask({
            rulesDirectory: path.join(__dirname, 'rules'),
            rules: {
                'no-lazy-module-paths': [true],
            },
        }, {
            includes: '**/*.ts',
            silent: false,
        }));
    };
};
