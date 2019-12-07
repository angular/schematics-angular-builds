"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("../../utility/config");
const dependencies_1 = require("../../utility/dependencies");
const json_utils_1 = require("../../utility/json-utils");
const latest_versions_1 = require("../../utility/latest-versions");
const workspace_models_1 = require("../../utility/workspace-models");
const utils_1 = require("./utils");
exports.ANY_COMPONENT_STYLE_BUDGET = {
    type: 'anyComponentStyle',
    maximumWarning: '6kb',
};
function updateWorkspaceConfig() {
    return (tree) => {
        const workspacePath = config_1.getWorkspacePath(tree);
        const workspace = utils_1.getWorkspace(tree);
        const recorder = tree.beginUpdate(workspacePath);
        for (const { target, project } of utils_1.getTargets(workspace, 'build', workspace_models_1.Builders.Browser)) {
            updateStyleOrScriptOption('styles', recorder, target);
            updateStyleOrScriptOption('scripts', recorder, target);
            addAnyComponentStyleBudget(recorder, target);
            updateAotOption(tree, recorder, target);
            addBuilderI18NOptions(recorder, target, project);
        }
        for (const { target, project } of utils_1.getTargets(workspace, 'test', workspace_models_1.Builders.Karma)) {
            updateStyleOrScriptOption('styles', recorder, target);
            updateStyleOrScriptOption('scripts', recorder, target);
            addBuilderI18NOptions(recorder, target, project);
        }
        for (const { target } of utils_1.getTargets(workspace, 'server', workspace_models_1.Builders.Server)) {
            updateOptimizationOption(recorder, target);
        }
        for (const { target, project } of utils_1.getTargets(workspace, 'extract-i18n', workspace_models_1.Builders.ExtractI18n)) {
            addProjectI18NOptions(recorder, tree, target, project);
            removeExtracti18nDeprecatedOptions(recorder, target);
        }
        tree.commitUpdate(recorder);
        return tree;
    };
}
exports.updateWorkspaceConfig = updateWorkspaceConfig;
function addProjectI18NOptions(recorder, tree, builderConfig, projectConfig) {
    const browserConfig = utils_1.getProjectTarget(projectConfig, 'build', workspace_models_1.Builders.Browser);
    if (!browserConfig || browserConfig.kind !== 'object') {
        return;
    }
    // browser builder options
    let locales;
    const options = utils_1.getAllOptions(browserConfig);
    for (const option of options) {
        const localeId = json_utils_1.findPropertyInAstObject(option, 'i18nLocale');
        if (!localeId || localeId.kind !== 'string') {
            continue;
        }
        const localeFile = json_utils_1.findPropertyInAstObject(option, 'i18nFile');
        if (!localeFile || localeFile.kind !== 'string') {
            continue;
        }
        const localIdValue = localeId.value;
        const localeFileValue = localeFile.value;
        const baseHref = json_utils_1.findPropertyInAstObject(option, 'baseHref');
        let baseHrefValue;
        if (baseHref) {
            if (baseHref.kind === 'string' && baseHref.value !== `/${localIdValue}/`) {
                baseHrefValue = baseHref.value;
            }
        }
        else {
            // If the configuration does not contain a baseHref, ensure the main option value is used.
            baseHrefValue = '';
        }
        if (!locales) {
            locales = {
                [localIdValue]: baseHrefValue === undefined
                    ? localeFileValue
                    : {
                        translation: localeFileValue,
                        baseHref: baseHrefValue,
                    },
            };
        }
        else {
            locales[localIdValue] =
                baseHrefValue === undefined
                    ? localeFileValue
                    : {
                        translation: localeFileValue,
                        baseHref: baseHrefValue,
                    };
        }
    }
    if (locales) {
        // Get sourceLocale from extract-i18n builder
        const i18nOptions = utils_1.getAllOptions(builderConfig);
        const sourceLocale = i18nOptions
            .map(o => {
            const sourceLocale = json_utils_1.findPropertyInAstObject(o, 'i18nLocale');
            return sourceLocale && sourceLocale.value;
        })
            .find(x => !!x);
        // Add i18n project configuration
        json_utils_1.insertPropertyInAstObjectInOrder(recorder, projectConfig, 'i18n', {
            locales,
            // tslint:disable-next-line: no-any
            sourceLocale: sourceLocale,
        }, 6);
        // Add @angular/localize if not already a dependency
        if (!dependencies_1.getPackageJsonDependency(tree, '@angular/localize')) {
            dependencies_1.addPackageJsonDependency(tree, {
                name: '@angular/localize',
                version: latest_versions_1.latestVersions.Angular,
                type: dependencies_1.NodeDependencyType.Default,
            });
        }
    }
}
function addBuilderI18NOptions(recorder, builderConfig, projectConfig) {
    const options = utils_1.getAllOptions(builderConfig);
    const mainOptions = json_utils_1.findPropertyInAstObject(builderConfig, 'options');
    const mainBaseHref = mainOptions &&
        mainOptions.kind === 'object' &&
        json_utils_1.findPropertyInAstObject(mainOptions, 'baseHref');
    const hasMainBaseHref = !!mainBaseHref && mainBaseHref.kind === 'string' && mainBaseHref.value !== '/';
    for (const option of options) {
        const localeId = json_utils_1.findPropertyInAstObject(option, 'i18nLocale');
        if (localeId && localeId.kind === 'string') {
            // add new localize option
            json_utils_1.insertPropertyInAstObjectInOrder(recorder, option, 'localize', [localeId.value], 12);
            json_utils_1.removePropertyInAstObject(recorder, option, 'i18nLocale');
        }
        const i18nFile = json_utils_1.findPropertyInAstObject(option, 'i18nFile');
        if (i18nFile) {
            json_utils_1.removePropertyInAstObject(recorder, option, 'i18nFile');
        }
        const i18nFormat = json_utils_1.findPropertyInAstObject(option, 'i18nFormat');
        if (i18nFormat) {
            json_utils_1.removePropertyInAstObject(recorder, option, 'i18nFormat');
        }
        // localize base HREF values are controlled by the i18n configuration
        const baseHref = json_utils_1.findPropertyInAstObject(option, 'baseHref');
        if (localeId && i18nFile && baseHref) {
            json_utils_1.removePropertyInAstObject(recorder, option, 'baseHref');
            // if the main option set has a non-default base href,
            // ensure that the augmented base href has the correct base value
            if (hasMainBaseHref) {
                json_utils_1.insertPropertyInAstObjectInOrder(recorder, option, 'baseHref', '/', 12);
            }
        }
    }
}
function removeExtracti18nDeprecatedOptions(recorder, builderConfig) {
    const options = utils_1.getAllOptions(builderConfig);
    for (const option of options) {
        // deprecated options
        json_utils_1.removePropertyInAstObject(recorder, option, 'i18nLocale');
        const i18nFormat = option.properties.find(({ key }) => key.value === 'i18nFormat');
        if (i18nFormat) {
            // i18nFormat has been changed to format
            const key = i18nFormat.key;
            const offset = key.start.offset + 1;
            recorder.remove(offset, key.value.length);
            recorder.insertLeft(offset, 'format');
        }
    }
}
function updateAotOption(tree, recorder, builderConfig) {
    const options = json_utils_1.findPropertyInAstObject(builderConfig, 'options');
    if (!options || options.kind !== 'object') {
        return;
    }
    const tsConfig = json_utils_1.findPropertyInAstObject(options, 'tsConfig');
    // Do not add aot option if the users already opted out from Ivy.
    if (tsConfig && tsConfig.kind === 'string' && !utils_1.isIvyEnabled(tree, tsConfig.value)) {
        return;
    }
    // Add aot to options.
    const aotOption = json_utils_1.findPropertyInAstObject(options, 'aot');
    if (!aotOption) {
        json_utils_1.insertPropertyInAstObjectInOrder(recorder, options, 'aot', true, 12);
        return;
    }
    if (aotOption.kind !== 'true') {
        const { start, end } = aotOption;
        recorder.remove(start.offset, end.offset - start.offset);
        recorder.insertLeft(start.offset, 'true');
    }
    // Remove aot properties from other configurations as they are no redundant
    const configOptions = utils_1.getAllOptions(builderConfig, true);
    for (const options of configOptions) {
        json_utils_1.removePropertyInAstObject(recorder, options, 'aot');
    }
}
function updateStyleOrScriptOption(property, recorder, builderConfig) {
    const options = utils_1.getAllOptions(builderConfig);
    for (const option of options) {
        const propertyOption = json_utils_1.findPropertyInAstObject(option, property);
        if (!propertyOption || propertyOption.kind !== 'array') {
            continue;
        }
        for (const node of propertyOption.elements) {
            if (!node || node.kind !== 'object') {
                // skip non complex objects
                continue;
            }
            const lazy = json_utils_1.findPropertyInAstObject(node, 'lazy');
            json_utils_1.removePropertyInAstObject(recorder, node, 'lazy');
            // if lazy was not true, it is redundant hence, don't add it
            if (lazy && lazy.kind === 'true') {
                json_utils_1.insertPropertyInAstObjectInOrder(recorder, node, 'inject', false, 0);
            }
        }
    }
}
function addAnyComponentStyleBudget(recorder, builderConfig) {
    const options = utils_1.getAllOptions(builderConfig, true);
    for (const option of options) {
        const budgetOption = json_utils_1.findPropertyInAstObject(option, 'budgets');
        if (!budgetOption) {
            // add
            json_utils_1.insertPropertyInAstObjectInOrder(recorder, option, 'budgets', [exports.ANY_COMPONENT_STYLE_BUDGET], 14);
            continue;
        }
        if (budgetOption.kind !== 'array') {
            continue;
        }
        // if 'anyComponentStyle' budget already exists don't add.
        const hasAnyComponentStyle = budgetOption.elements.some(node => {
            if (!node || node.kind !== 'object') {
                // skip non complex objects
                return false;
            }
            const budget = json_utils_1.findPropertyInAstObject(node, 'type');
            return !!budget && budget.kind === 'string' && budget.value === 'anyComponentStyle';
        });
        if (!hasAnyComponentStyle) {
            json_utils_1.appendValueInAstArray(recorder, budgetOption, exports.ANY_COMPONENT_STYLE_BUDGET, 16);
        }
    }
}
function updateOptimizationOption(recorder, builderConfig) {
    const options = utils_1.getAllOptions(builderConfig, true);
    for (const option of options) {
        const optimizationOption = json_utils_1.findPropertyInAstObject(option, 'optimization');
        if (!optimizationOption) {
            // add
            json_utils_1.insertPropertyInAstObjectInOrder(recorder, option, 'optimization', true, 14);
            continue;
        }
        if (optimizationOption.kind !== 'true') {
            const { start, end } = optimizationOption;
            recorder.remove(start.offset, end.offset - start.offset);
            recorder.insertLeft(start.offset, 'true');
        }
    }
}
