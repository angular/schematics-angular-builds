"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeBlock = void 0;
const typescript_1 = __importDefault(require("../../third_party/github.com/Microsoft/TypeScript/lib/typescript"));
const ast_utils_1 = require("../ast-utils");
const change_1 = require("../change");
/** Counter used to generate unique IDs. */
let uniqueIdCounter = 0;
/**
 * Utility class used to generate blocks of code that
 * can be inserted by the devkit into a user's app.
 */
class CodeBlock {
    _imports = new Map();
    // Note: the methods here are defined as arrow function so that they can be destructured by
    // consumers without losing their context. This makes the API more concise.
    /** Function used to tag a code block in order to produce a `PendingCode` object. */
    code = (strings, ...params) => {
        return {
            expression: strings.map((part, index) => part + (params[index] || '')).join(''),
            imports: this._imports,
        };
    };
    /**
     * Used inside of a code block to mark external symbols and which module they should be imported
     * from. When the code is inserted, the required import statements will be produced automatically.
     * @param symbolName Name of the external symbol.
     * @param moduleName Module from which the symbol should be imported.
     */
    external = (symbolName, moduleName) => {
        if (!this._imports.has(moduleName)) {
            this._imports.set(moduleName, new Map());
        }
        const symbolsPerModule = this._imports.get(moduleName);
        if (!symbolsPerModule.has(symbolName)) {
            symbolsPerModule.set(symbolName, `@@__SCHEMATIC_PLACEHOLDER_${uniqueIdCounter++}__@@`);
        }
        return symbolsPerModule.get(symbolName);
    };
    /**
     * Produces the necessary rules to transform a `PendingCode` object into valid code.
     * @param initialCode Code pending transformed.
     * @param filePath Path of the file in which the code will be inserted.
     */
    static transformPendingCode(initialCode, filePath) {
        const code = { ...initialCode };
        const rules = [];
        code.imports.forEach((symbols, moduleName) => {
            symbols.forEach((placeholder, symbolName) => {
                rules.push((tree) => {
                    const recorder = tree.beginUpdate(filePath);
                    const sourceFile = typescript_1.default.createSourceFile(filePath, tree.readText(filePath), typescript_1.default.ScriptTarget.Latest, true);
                    // Note that this could still technically clash if there's a top-level symbol called
                    // `${symbolName}_alias`, however this is unlikely. We can revisit this if it becomes
                    // a problem.
                    const alias = (0, ast_utils_1.hasTopLevelIdentifier)(sourceFile, symbolName, moduleName)
                        ? symbolName + '_alias'
                        : undefined;
                    code.expression = code.expression.replace(new RegExp(placeholder, 'g'), alias || symbolName);
                    (0, change_1.applyToUpdateRecorder)(recorder, [
                        (0, ast_utils_1.insertImport)(sourceFile, filePath, symbolName, moduleName, false, alias),
                    ]);
                    tree.commitUpdate(recorder);
                });
            });
        });
        return { code, rules };
    }
}
exports.CodeBlock = CodeBlock;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZV9ibG9jay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3NjaGVtYXRpY3MvYW5ndWxhci91dGlsaXR5L3N0YW5kYWxvbmUvY29kZV9ibG9jay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7Ozs7QUFHSCxrSEFBa0Y7QUFDbEYsNENBQW1FO0FBQ25FLHNDQUFrRDtBQWNsRCwyQ0FBMkM7QUFDM0MsSUFBSSxlQUFlLEdBQUcsQ0FBQyxDQUFDO0FBUXhCOzs7R0FHRztBQUNILE1BQWEsU0FBUztJQUNaLFFBQVEsR0FBbUIsSUFBSSxHQUFHLEVBQStCLENBQUM7SUFFMUUsMkZBQTJGO0lBQzNGLDJFQUEyRTtJQUUzRSxvRkFBb0Y7SUFDcEYsSUFBSSxHQUFHLENBQUMsT0FBNkIsRUFBRSxHQUFHLE1BQWlCLEVBQWUsRUFBRTtRQUMxRSxPQUFPO1lBQ0wsVUFBVSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQy9FLE9BQU8sRUFBRSxJQUFJLENBQUMsUUFBUTtTQUN2QixDQUFDO0lBQ0osQ0FBQyxDQUFDO0lBRUY7Ozs7O09BS0c7SUFDSCxRQUFRLEdBQUcsQ0FBQyxVQUFrQixFQUFFLFVBQWtCLEVBQVUsRUFBRTtRQUM1RCxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEVBQUU7WUFDbEMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLElBQUksR0FBRyxFQUFFLENBQUMsQ0FBQztTQUMxQztRQUVELE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUF3QixDQUFDO1FBRTlFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEVBQUU7WUFDckMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSw2QkFBNkIsZUFBZSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1NBQ3hGO1FBRUQsT0FBTyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFXLENBQUM7SUFDcEQsQ0FBQyxDQUFDO0lBRUY7Ozs7T0FJRztJQUNILE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQyxXQUF3QixFQUFFLFFBQWdCO1FBQ3BFLE1BQU0sSUFBSSxHQUFHLEVBQUUsR0FBRyxXQUFXLEVBQUUsQ0FBQztRQUNoQyxNQUFNLEtBQUssR0FBVyxFQUFFLENBQUM7UUFFekIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsVUFBVSxFQUFFLEVBQUU7WUFDM0MsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLFdBQVcsRUFBRSxVQUFVLEVBQUUsRUFBRTtnQkFDMUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQVUsRUFBRSxFQUFFO29CQUN4QixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDO29CQUM1QyxNQUFNLFVBQVUsR0FBRyxvQkFBRSxDQUFDLGdCQUFnQixDQUNwQyxRQUFRLEVBQ1IsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsRUFDdkIsb0JBQUUsQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUN0QixJQUFJLENBQ0wsQ0FBQztvQkFFRixvRkFBb0Y7b0JBQ3BGLHFGQUFxRjtvQkFDckYsYUFBYTtvQkFDYixNQUFNLEtBQUssR0FBRyxJQUFBLGlDQUFxQixFQUFDLFVBQVUsRUFBRSxVQUFVLEVBQUUsVUFBVSxDQUFDO3dCQUNyRSxDQUFDLENBQUMsVUFBVSxHQUFHLFFBQVE7d0JBQ3ZCLENBQUMsQ0FBQyxTQUFTLENBQUM7b0JBRWQsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FDdkMsSUFBSSxNQUFNLENBQUMsV0FBVyxFQUFFLEdBQUcsQ0FBQyxFQUM1QixLQUFLLElBQUksVUFBVSxDQUNwQixDQUFDO29CQUVGLElBQUEsOEJBQXFCLEVBQUMsUUFBUSxFQUFFO3dCQUM5QixJQUFBLHdCQUFZLEVBQUMsVUFBVSxFQUFFLFFBQVEsRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUM7cUJBQ3pFLENBQUMsQ0FBQztvQkFDSCxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUM5QixDQUFDLENBQUMsQ0FBQztZQUNMLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxDQUFDLENBQUM7UUFFSCxPQUFPLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxDQUFDO0lBQ3pCLENBQUM7Q0FDRjtBQTVFRCw4QkE0RUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgUnVsZSwgVHJlZSB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzJztcbmltcG9ydCB0cyBmcm9tICcuLi8uLi90aGlyZF9wYXJ0eS9naXRodWIuY29tL01pY3Jvc29mdC9UeXBlU2NyaXB0L2xpYi90eXBlc2NyaXB0JztcbmltcG9ydCB7IGhhc1RvcExldmVsSWRlbnRpZmllciwgaW5zZXJ0SW1wb3J0IH0gZnJvbSAnLi4vYXN0LXV0aWxzJztcbmltcG9ydCB7IGFwcGx5VG9VcGRhdGVSZWNvcmRlciB9IGZyb20gJy4uL2NoYW5nZSc7XG5cbi8qKiBHZW5lcmF0ZWQgY29kZSB0aGF0IGhhc24ndCBiZWVuIGludGVycG9sYXRlZCB5ZXQuICovXG5leHBvcnQgaW50ZXJmYWNlIFBlbmRpbmdDb2RlIHtcbiAgLyoqIENvZGUgdGhhdCB3aWxsIGJlIGluc2VydGVkLiAqL1xuICBleHByZXNzaW9uOiBzdHJpbmc7XG5cbiAgLyoqIEltcG9ydHMgdGhhdCBuZWVkIHRvIGJlIGFkZGVkIHRvIHRoZSBmaWxlIGluIHdoaWNoIHRoZSBjb2RlIGlzIGluc2VydGVkLiAqL1xuICBpbXBvcnRzOiBQZW5kaW5nSW1wb3J0cztcbn1cblxuLyoqIE1hcCBrZWVwaW5nIHRyYWNrIG9mIGltcG9ydHMgYW5kIGFsaWFzZXMgdW5kZXIgd2hpY2ggdGhleSdyZSByZWZlcnJlZCB0byBpbiBhbiBleHByZXNpb24uICovXG50eXBlIFBlbmRpbmdJbXBvcnRzID0gTWFwPHN0cmluZywgTWFwPHN0cmluZywgc3RyaW5nPj47XG5cbi8qKiBDb3VudGVyIHVzZWQgdG8gZ2VuZXJhdGUgdW5pcXVlIElEcy4gKi9cbmxldCB1bmlxdWVJZENvdW50ZXIgPSAwO1xuXG4vKipcbiAqIENhbGxiYWNrIGludm9rZWQgYnkgYSBSdWxlIHRoYXQgcHJvZHVjZXMgdGhlIGNvZGVcbiAqIHRoYXQgbmVlZHMgdG8gYmUgaW5zZXJ0ZWQgc29tZXdoZXJlIGluIHRoZSBhcHAuXG4gKi9cbmV4cG9ydCB0eXBlIENvZGVCbG9ja0NhbGxiYWNrID0gKGJsb2NrOiBDb2RlQmxvY2spID0+IFBlbmRpbmdDb2RlO1xuXG4vKipcbiAqIFV0aWxpdHkgY2xhc3MgdXNlZCB0byBnZW5lcmF0ZSBibG9ja3Mgb2YgY29kZSB0aGF0XG4gKiBjYW4gYmUgaW5zZXJ0ZWQgYnkgdGhlIGRldmtpdCBpbnRvIGEgdXNlcidzIGFwcC5cbiAqL1xuZXhwb3J0IGNsYXNzIENvZGVCbG9jayB7XG4gIHByaXZhdGUgX2ltcG9ydHM6IFBlbmRpbmdJbXBvcnRzID0gbmV3IE1hcDxzdHJpbmcsIE1hcDxzdHJpbmcsIHN0cmluZz4+KCk7XG5cbiAgLy8gTm90ZTogdGhlIG1ldGhvZHMgaGVyZSBhcmUgZGVmaW5lZCBhcyBhcnJvdyBmdW5jdGlvbiBzbyB0aGF0IHRoZXkgY2FuIGJlIGRlc3RydWN0dXJlZCBieVxuICAvLyBjb25zdW1lcnMgd2l0aG91dCBsb3NpbmcgdGhlaXIgY29udGV4dC4gVGhpcyBtYWtlcyB0aGUgQVBJIG1vcmUgY29uY2lzZS5cblxuICAvKiogRnVuY3Rpb24gdXNlZCB0byB0YWcgYSBjb2RlIGJsb2NrIGluIG9yZGVyIHRvIHByb2R1Y2UgYSBgUGVuZGluZ0NvZGVgIG9iamVjdC4gKi9cbiAgY29kZSA9IChzdHJpbmdzOiBUZW1wbGF0ZVN0cmluZ3NBcnJheSwgLi4ucGFyYW1zOiB1bmtub3duW10pOiBQZW5kaW5nQ29kZSA9PiB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGV4cHJlc3Npb246IHN0cmluZ3MubWFwKChwYXJ0LCBpbmRleCkgPT4gcGFydCArIChwYXJhbXNbaW5kZXhdIHx8ICcnKSkuam9pbignJyksXG4gICAgICBpbXBvcnRzOiB0aGlzLl9pbXBvcnRzLFxuICAgIH07XG4gIH07XG5cbiAgLyoqXG4gICAqIFVzZWQgaW5zaWRlIG9mIGEgY29kZSBibG9jayB0byBtYXJrIGV4dGVybmFsIHN5bWJvbHMgYW5kIHdoaWNoIG1vZHVsZSB0aGV5IHNob3VsZCBiZSBpbXBvcnRlZFxuICAgKiBmcm9tLiBXaGVuIHRoZSBjb2RlIGlzIGluc2VydGVkLCB0aGUgcmVxdWlyZWQgaW1wb3J0IHN0YXRlbWVudHMgd2lsbCBiZSBwcm9kdWNlZCBhdXRvbWF0aWNhbGx5LlxuICAgKiBAcGFyYW0gc3ltYm9sTmFtZSBOYW1lIG9mIHRoZSBleHRlcm5hbCBzeW1ib2wuXG4gICAqIEBwYXJhbSBtb2R1bGVOYW1lIE1vZHVsZSBmcm9tIHdoaWNoIHRoZSBzeW1ib2wgc2hvdWxkIGJlIGltcG9ydGVkLlxuICAgKi9cbiAgZXh0ZXJuYWwgPSAoc3ltYm9sTmFtZTogc3RyaW5nLCBtb2R1bGVOYW1lOiBzdHJpbmcpOiBzdHJpbmcgPT4ge1xuICAgIGlmICghdGhpcy5faW1wb3J0cy5oYXMobW9kdWxlTmFtZSkpIHtcbiAgICAgIHRoaXMuX2ltcG9ydHMuc2V0KG1vZHVsZU5hbWUsIG5ldyBNYXAoKSk7XG4gICAgfVxuXG4gICAgY29uc3Qgc3ltYm9sc1Blck1vZHVsZSA9IHRoaXMuX2ltcG9ydHMuZ2V0KG1vZHVsZU5hbWUpIGFzIE1hcDxzdHJpbmcsIHN0cmluZz47XG5cbiAgICBpZiAoIXN5bWJvbHNQZXJNb2R1bGUuaGFzKHN5bWJvbE5hbWUpKSB7XG4gICAgICBzeW1ib2xzUGVyTW9kdWxlLnNldChzeW1ib2xOYW1lLCBgQEBfX1NDSEVNQVRJQ19QTEFDRUhPTERFUl8ke3VuaXF1ZUlkQ291bnRlcisrfV9fQEBgKTtcbiAgICB9XG5cbiAgICByZXR1cm4gc3ltYm9sc1Blck1vZHVsZS5nZXQoc3ltYm9sTmFtZSkgYXMgc3RyaW5nO1xuICB9O1xuXG4gIC8qKlxuICAgKiBQcm9kdWNlcyB0aGUgbmVjZXNzYXJ5IHJ1bGVzIHRvIHRyYW5zZm9ybSBhIGBQZW5kaW5nQ29kZWAgb2JqZWN0IGludG8gdmFsaWQgY29kZS5cbiAgICogQHBhcmFtIGluaXRpYWxDb2RlIENvZGUgcGVuZGluZyB0cmFuc2Zvcm1lZC5cbiAgICogQHBhcmFtIGZpbGVQYXRoIFBhdGggb2YgdGhlIGZpbGUgaW4gd2hpY2ggdGhlIGNvZGUgd2lsbCBiZSBpbnNlcnRlZC5cbiAgICovXG4gIHN0YXRpYyB0cmFuc2Zvcm1QZW5kaW5nQ29kZShpbml0aWFsQ29kZTogUGVuZGluZ0NvZGUsIGZpbGVQYXRoOiBzdHJpbmcpIHtcbiAgICBjb25zdCBjb2RlID0geyAuLi5pbml0aWFsQ29kZSB9O1xuICAgIGNvbnN0IHJ1bGVzOiBSdWxlW10gPSBbXTtcblxuICAgIGNvZGUuaW1wb3J0cy5mb3JFYWNoKChzeW1ib2xzLCBtb2R1bGVOYW1lKSA9PiB7XG4gICAgICBzeW1ib2xzLmZvckVhY2goKHBsYWNlaG9sZGVyLCBzeW1ib2xOYW1lKSA9PiB7XG4gICAgICAgIHJ1bGVzLnB1c2goKHRyZWU6IFRyZWUpID0+IHtcbiAgICAgICAgICBjb25zdCByZWNvcmRlciA9IHRyZWUuYmVnaW5VcGRhdGUoZmlsZVBhdGgpO1xuICAgICAgICAgIGNvbnN0IHNvdXJjZUZpbGUgPSB0cy5jcmVhdGVTb3VyY2VGaWxlKFxuICAgICAgICAgICAgZmlsZVBhdGgsXG4gICAgICAgICAgICB0cmVlLnJlYWRUZXh0KGZpbGVQYXRoKSxcbiAgICAgICAgICAgIHRzLlNjcmlwdFRhcmdldC5MYXRlc3QsXG4gICAgICAgICAgICB0cnVlLFxuICAgICAgICAgICk7XG5cbiAgICAgICAgICAvLyBOb3RlIHRoYXQgdGhpcyBjb3VsZCBzdGlsbCB0ZWNobmljYWxseSBjbGFzaCBpZiB0aGVyZSdzIGEgdG9wLWxldmVsIHN5bWJvbCBjYWxsZWRcbiAgICAgICAgICAvLyBgJHtzeW1ib2xOYW1lfV9hbGlhc2AsIGhvd2V2ZXIgdGhpcyBpcyB1bmxpa2VseS4gV2UgY2FuIHJldmlzaXQgdGhpcyBpZiBpdCBiZWNvbWVzXG4gICAgICAgICAgLy8gYSBwcm9ibGVtLlxuICAgICAgICAgIGNvbnN0IGFsaWFzID0gaGFzVG9wTGV2ZWxJZGVudGlmaWVyKHNvdXJjZUZpbGUsIHN5bWJvbE5hbWUsIG1vZHVsZU5hbWUpXG4gICAgICAgICAgICA/IHN5bWJvbE5hbWUgKyAnX2FsaWFzJ1xuICAgICAgICAgICAgOiB1bmRlZmluZWQ7XG5cbiAgICAgICAgICBjb2RlLmV4cHJlc3Npb24gPSBjb2RlLmV4cHJlc3Npb24ucmVwbGFjZShcbiAgICAgICAgICAgIG5ldyBSZWdFeHAocGxhY2Vob2xkZXIsICdnJyksXG4gICAgICAgICAgICBhbGlhcyB8fCBzeW1ib2xOYW1lLFxuICAgICAgICAgICk7XG5cbiAgICAgICAgICBhcHBseVRvVXBkYXRlUmVjb3JkZXIocmVjb3JkZXIsIFtcbiAgICAgICAgICAgIGluc2VydEltcG9ydChzb3VyY2VGaWxlLCBmaWxlUGF0aCwgc3ltYm9sTmFtZSwgbW9kdWxlTmFtZSwgZmFsc2UsIGFsaWFzKSxcbiAgICAgICAgICBdKTtcbiAgICAgICAgICB0cmVlLmNvbW1pdFVwZGF0ZShyZWNvcmRlcik7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4geyBjb2RlLCBydWxlcyB9O1xuICB9XG59XG4iXX0=