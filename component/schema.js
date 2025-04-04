"use strict";
// THIS FILE IS AUTOMATICALLY GENERATED. TO UPDATE THIS FILE YOU NEED TO CHANGE THE
// CORRESPONDING JSON SCHEMA FILE, THEN RUN devkit-admin build (or bazel build ...).
Object.defineProperty(exports, "__esModule", { value: true });
exports.ViewEncapsulation = exports.Style = exports.ChangeDetection = void 0;
/**
 * Configures the change detection strategy for the component.
 */
var ChangeDetection;
(function (ChangeDetection) {
    ChangeDetection["Default"] = "Default";
    ChangeDetection["OnPush"] = "OnPush";
})(ChangeDetection || (exports.ChangeDetection = ChangeDetection = {}));
/**
 * Specify the type of stylesheet to be created for the component, or `none` to skip
 * creating a stylesheet.
 */
var Style;
(function (Style) {
    Style["Css"] = "css";
    Style["Less"] = "less";
    Style["None"] = "none";
    Style["Sass"] = "sass";
    Style["Scss"] = "scss";
})(Style || (exports.Style = Style = {}));
/**
 * Sets the view encapsulation mode for the component. This determines how the component's
 * styles are scoped and applied.
 */
var ViewEncapsulation;
(function (ViewEncapsulation) {
    ViewEncapsulation["Emulated"] = "Emulated";
    ViewEncapsulation["None"] = "None";
    ViewEncapsulation["ShadowDom"] = "ShadowDom";
})(ViewEncapsulation || (exports.ViewEncapsulation = ViewEncapsulation = {}));
