"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateFromFiles = void 0;
const schematics_1 = require("@angular-devkit/schematics");
const parse_name_1 = require("./parse-name");
const validation_1 = require("./validation");
const workspace_1 = require("./workspace");
function generateFromFiles(options, extraTemplateValues = {}) {
    return async (host) => {
        var _a, _b, _c;
        (_a = options.path) !== null && _a !== void 0 ? _a : (options.path = await (0, workspace_1.createDefaultPath)(host, options.project));
        (_b = options.prefix) !== null && _b !== void 0 ? _b : (options.prefix = '');
        (_c = options.flat) !== null && _c !== void 0 ? _c : (options.flat = true);
        const parsedPath = (0, parse_name_1.parseName)(options.path, options.name);
        options.name = parsedPath.name;
        options.path = parsedPath.path;
        (0, validation_1.validateClassName)(schematics_1.strings.classify(options.name));
        const templateSource = (0, schematics_1.apply)((0, schematics_1.url)('./files'), [
            options.skipTests ? (0, schematics_1.filter)((path) => !path.endsWith('.spec.ts.template')) : (0, schematics_1.noop)(),
            (0, schematics_1.applyTemplates)({
                ...schematics_1.strings,
                ...options,
                ...extraTemplateValues,
            }),
            (0, schematics_1.move)(parsedPath.path + (options.flat ? '' : '/' + schematics_1.strings.dasherize(options.name))),
        ]);
        return (0, schematics_1.chain)([(0, schematics_1.mergeWith)(templateSource)]);
    };
}
exports.generateFromFiles = generateFromFiles;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGUtZnJvbS1maWxlcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3NjaGVtYXRpY3MvYW5ndWxhci91dGlsaXR5L2dlbmVyYXRlLWZyb20tZmlsZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7O0FBRUgsMkRBWW9DO0FBQ3BDLDZDQUF5QztBQUN6Qyw2Q0FBaUQ7QUFDakQsMkNBQWdEO0FBV2hELFNBQWdCLGlCQUFpQixDQUMvQixPQUFpQyxFQUNqQyxzQkFBd0UsRUFBRTtJQUUxRSxPQUFPLEtBQUssRUFBRSxJQUFVLEVBQUUsRUFBRTs7UUFDMUIsTUFBQSxPQUFPLENBQUMsSUFBSSxvQ0FBWixPQUFPLENBQUMsSUFBSSxHQUFLLE1BQU0sSUFBQSw2QkFBaUIsRUFBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLE9BQWlCLENBQUMsRUFBQztRQUMxRSxNQUFBLE9BQU8sQ0FBQyxNQUFNLG9DQUFkLE9BQU8sQ0FBQyxNQUFNLEdBQUssRUFBRSxFQUFDO1FBQ3RCLE1BQUEsT0FBTyxDQUFDLElBQUksb0NBQVosT0FBTyxDQUFDLElBQUksR0FBSyxJQUFJLEVBQUM7UUFFdEIsTUFBTSxVQUFVLEdBQUcsSUFBQSxzQkFBUyxFQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3pELE9BQU8sQ0FBQyxJQUFJLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQztRQUMvQixPQUFPLENBQUMsSUFBSSxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUM7UUFFL0IsSUFBQSw4QkFBaUIsRUFBQyxvQkFBTyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUVsRCxNQUFNLGNBQWMsR0FBRyxJQUFBLGtCQUFLLEVBQUMsSUFBQSxnQkFBRyxFQUFDLFNBQVMsQ0FBQyxFQUFFO1lBQzNDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUEsbUJBQU0sRUFBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBQSxpQkFBSSxHQUFFO1lBQ2xGLElBQUEsMkJBQWMsRUFBQztnQkFDYixHQUFHLG9CQUFPO2dCQUNWLEdBQUcsT0FBTztnQkFDVixHQUFHLG1CQUFtQjthQUN2QixDQUFDO1lBQ0YsSUFBQSxpQkFBSSxFQUFDLFVBQVUsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxvQkFBTyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztTQUNwRixDQUFDLENBQUM7UUFFSCxPQUFPLElBQUEsa0JBQUssRUFBQyxDQUFDLElBQUEsc0JBQVMsRUFBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDNUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQTNCRCw4Q0EyQkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtcbiAgUnVsZSxcbiAgVHJlZSxcbiAgYXBwbHksXG4gIGFwcGx5VGVtcGxhdGVzLFxuICBjaGFpbixcbiAgZmlsdGVyLFxuICBtZXJnZVdpdGgsXG4gIG1vdmUsXG4gIG5vb3AsXG4gIHN0cmluZ3MsXG4gIHVybCxcbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MnO1xuaW1wb3J0IHsgcGFyc2VOYW1lIH0gZnJvbSAnLi9wYXJzZS1uYW1lJztcbmltcG9ydCB7IHZhbGlkYXRlQ2xhc3NOYW1lIH0gZnJvbSAnLi92YWxpZGF0aW9uJztcbmltcG9ydCB7IGNyZWF0ZURlZmF1bHRQYXRoIH0gZnJvbSAnLi93b3Jrc3BhY2UnO1xuXG5leHBvcnQgaW50ZXJmYWNlIEdlbmVyYXRlRnJvbUZpbGVzT3B0aW9ucyB7XG4gIGZsYXQ/OiBib29sZWFuO1xuICBuYW1lOiBzdHJpbmc7XG4gIHBhdGg/OiBzdHJpbmc7XG4gIHByZWZpeD86IHN0cmluZztcbiAgcHJvamVjdD86IHN0cmluZztcbiAgc2tpcFRlc3RzPzogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdlbmVyYXRlRnJvbUZpbGVzKFxuICBvcHRpb25zOiBHZW5lcmF0ZUZyb21GaWxlc09wdGlvbnMsXG4gIGV4dHJhVGVtcGxhdGVWYWx1ZXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZyB8ICgodjogc3RyaW5nKSA9PiBzdHJpbmcpPiA9IHt9LFxuKTogUnVsZSB7XG4gIHJldHVybiBhc3luYyAoaG9zdDogVHJlZSkgPT4ge1xuICAgIG9wdGlvbnMucGF0aCA/Pz0gYXdhaXQgY3JlYXRlRGVmYXVsdFBhdGgoaG9zdCwgb3B0aW9ucy5wcm9qZWN0IGFzIHN0cmluZyk7XG4gICAgb3B0aW9ucy5wcmVmaXggPz89ICcnO1xuICAgIG9wdGlvbnMuZmxhdCA/Pz0gdHJ1ZTtcblxuICAgIGNvbnN0IHBhcnNlZFBhdGggPSBwYXJzZU5hbWUob3B0aW9ucy5wYXRoLCBvcHRpb25zLm5hbWUpO1xuICAgIG9wdGlvbnMubmFtZSA9IHBhcnNlZFBhdGgubmFtZTtcbiAgICBvcHRpb25zLnBhdGggPSBwYXJzZWRQYXRoLnBhdGg7XG5cbiAgICB2YWxpZGF0ZUNsYXNzTmFtZShzdHJpbmdzLmNsYXNzaWZ5KG9wdGlvbnMubmFtZSkpO1xuXG4gICAgY29uc3QgdGVtcGxhdGVTb3VyY2UgPSBhcHBseSh1cmwoJy4vZmlsZXMnKSwgW1xuICAgICAgb3B0aW9ucy5za2lwVGVzdHMgPyBmaWx0ZXIoKHBhdGgpID0+ICFwYXRoLmVuZHNXaXRoKCcuc3BlYy50cy50ZW1wbGF0ZScpKSA6IG5vb3AoKSxcbiAgICAgIGFwcGx5VGVtcGxhdGVzKHtcbiAgICAgICAgLi4uc3RyaW5ncyxcbiAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgLi4uZXh0cmFUZW1wbGF0ZVZhbHVlcyxcbiAgICAgIH0pLFxuICAgICAgbW92ZShwYXJzZWRQYXRoLnBhdGggKyAob3B0aW9ucy5mbGF0ID8gJycgOiAnLycgKyBzdHJpbmdzLmRhc2hlcml6ZShvcHRpb25zLm5hbWUpKSksXG4gICAgXSk7XG5cbiAgICByZXR1cm4gY2hhaW4oW21lcmdlV2l0aCh0ZW1wbGF0ZVNvdXJjZSldKTtcbiAgfTtcbn1cbiJdfQ==