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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGUtZnJvbS1maWxlcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3NjaGVtYXRpY3MvYW5ndWxhci91dGlsaXR5L2dlbmVyYXRlLWZyb20tZmlsZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7O0FBRUgsMkRBWW9DO0FBQ3BDLDZDQUF5QztBQUN6Qyw2Q0FBaUQ7QUFDakQsMkNBQWdEO0FBV2hELFNBQWdCLGlCQUFpQixDQUMvQixPQUFpQyxFQUNqQyxzQkFBd0UsRUFBRTtJQUUxRSxPQUFPLEtBQUssRUFBRSxJQUFVLEVBQUUsRUFBRTs7UUFDMUIsTUFBQSxPQUFPLENBQUMsSUFBSSxvQ0FBWixPQUFPLENBQUMsSUFBSSxHQUFLLE1BQU0sSUFBQSw2QkFBaUIsRUFBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFDO1FBQ2hFLE1BQUEsT0FBTyxDQUFDLE1BQU0sb0NBQWQsT0FBTyxDQUFDLE1BQU0sR0FBSyxFQUFFLEVBQUM7UUFDdEIsTUFBQSxPQUFPLENBQUMsSUFBSSxvQ0FBWixPQUFPLENBQUMsSUFBSSxHQUFLLElBQUksRUFBQztRQUV0QixNQUFNLFVBQVUsR0FBRyxJQUFBLHNCQUFTLEVBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDekQsT0FBTyxDQUFDLElBQUksR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDO1FBQy9CLE9BQU8sQ0FBQyxJQUFJLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQztRQUUvQixJQUFBLDhCQUFpQixFQUFDLG9CQUFPLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBRWxELE1BQU0sY0FBYyxHQUFHLElBQUEsa0JBQUssRUFBQyxJQUFBLGdCQUFHLEVBQUMsU0FBUyxDQUFDLEVBQUU7WUFDM0MsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBQSxtQkFBTSxFQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFBLGlCQUFJLEdBQUU7WUFDbEYsSUFBQSwyQkFBYyxFQUFDO2dCQUNiLEdBQUcsb0JBQU87Z0JBQ1YsR0FBRyxPQUFPO2dCQUNWLEdBQUcsbUJBQW1CO2FBQ3ZCLENBQUM7WUFDRixJQUFBLGlCQUFJLEVBQUMsVUFBVSxDQUFDLElBQUksR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLG9CQUFPLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1NBQ3BGLENBQUMsQ0FBQztRQUVILE9BQU8sSUFBQSxrQkFBSyxFQUFDLENBQUMsSUFBQSxzQkFBUyxFQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUM1QyxDQUFDLENBQUM7QUFDSixDQUFDO0FBM0JELDhDQTJCQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge1xuICBSdWxlLFxuICBUcmVlLFxuICBhcHBseSxcbiAgYXBwbHlUZW1wbGF0ZXMsXG4gIGNoYWluLFxuICBmaWx0ZXIsXG4gIG1lcmdlV2l0aCxcbiAgbW92ZSxcbiAgbm9vcCxcbiAgc3RyaW5ncyxcbiAgdXJsLFxufSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcyc7XG5pbXBvcnQgeyBwYXJzZU5hbWUgfSBmcm9tICcuL3BhcnNlLW5hbWUnO1xuaW1wb3J0IHsgdmFsaWRhdGVDbGFzc05hbWUgfSBmcm9tICcuL3ZhbGlkYXRpb24nO1xuaW1wb3J0IHsgY3JlYXRlRGVmYXVsdFBhdGggfSBmcm9tICcuL3dvcmtzcGFjZSc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgR2VuZXJhdGVGcm9tRmlsZXNPcHRpb25zIHtcbiAgZmxhdD86IGJvb2xlYW47XG4gIG5hbWU6IHN0cmluZztcbiAgcGF0aD86IHN0cmluZztcbiAgcHJlZml4Pzogc3RyaW5nO1xuICBwcm9qZWN0OiBzdHJpbmc7XG4gIHNraXBUZXN0cz86IGJvb2xlYW47XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZUZyb21GaWxlcyhcbiAgb3B0aW9uczogR2VuZXJhdGVGcm9tRmlsZXNPcHRpb25zLFxuICBleHRyYVRlbXBsYXRlVmFsdWVzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmcgfCAoKHY6IHN0cmluZykgPT4gc3RyaW5nKT4gPSB7fSxcbik6IFJ1bGUge1xuICByZXR1cm4gYXN5bmMgKGhvc3Q6IFRyZWUpID0+IHtcbiAgICBvcHRpb25zLnBhdGggPz89IGF3YWl0IGNyZWF0ZURlZmF1bHRQYXRoKGhvc3QsIG9wdGlvbnMucHJvamVjdCk7XG4gICAgb3B0aW9ucy5wcmVmaXggPz89ICcnO1xuICAgIG9wdGlvbnMuZmxhdCA/Pz0gdHJ1ZTtcblxuICAgIGNvbnN0IHBhcnNlZFBhdGggPSBwYXJzZU5hbWUob3B0aW9ucy5wYXRoLCBvcHRpb25zLm5hbWUpO1xuICAgIG9wdGlvbnMubmFtZSA9IHBhcnNlZFBhdGgubmFtZTtcbiAgICBvcHRpb25zLnBhdGggPSBwYXJzZWRQYXRoLnBhdGg7XG5cbiAgICB2YWxpZGF0ZUNsYXNzTmFtZShzdHJpbmdzLmNsYXNzaWZ5KG9wdGlvbnMubmFtZSkpO1xuXG4gICAgY29uc3QgdGVtcGxhdGVTb3VyY2UgPSBhcHBseSh1cmwoJy4vZmlsZXMnKSwgW1xuICAgICAgb3B0aW9ucy5za2lwVGVzdHMgPyBmaWx0ZXIoKHBhdGgpID0+ICFwYXRoLmVuZHNXaXRoKCcuc3BlYy50cy50ZW1wbGF0ZScpKSA6IG5vb3AoKSxcbiAgICAgIGFwcGx5VGVtcGxhdGVzKHtcbiAgICAgICAgLi4uc3RyaW5ncyxcbiAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgLi4uZXh0cmFUZW1wbGF0ZVZhbHVlcyxcbiAgICAgIH0pLFxuICAgICAgbW92ZShwYXJzZWRQYXRoLnBhdGggKyAob3B0aW9ucy5mbGF0ID8gJycgOiAnLycgKyBzdHJpbmdzLmRhc2hlcml6ZShvcHRpb25zLm5hbWUpKSksXG4gICAgXSk7XG5cbiAgICByZXR1cm4gY2hhaW4oW21lcmdlV2l0aCh0ZW1wbGF0ZVNvdXJjZSldKTtcbiAgfTtcbn1cbiJdfQ==