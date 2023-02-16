"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const ts = __importStar(require("../../third_party/github.com/Microsoft/TypeScript/lib/typescript"));
function* visit(directory) {
    for (const path of directory.subfiles) {
        if (path.endsWith('.ts') && !path.endsWith('.d.ts')) {
            const entry = directory.file(path);
            if (entry) {
                const content = entry.content;
                if (content.includes('@angular/platform-server') && content.includes('renderModule')) {
                    const source = ts.createSourceFile(entry.path, content.toString().replace(/^\uFEFF/, ''), ts.ScriptTarget.Latest, true);
                    yield source;
                }
            }
        }
    }
    for (const path of directory.subdirs) {
        if (path === 'node_modules' || path.startsWith('.')) {
            continue;
        }
        yield* visit(directory.dir(path));
    }
}
function default_1() {
    return (tree) => {
        for (const sourceFile of visit(tree.root)) {
            let recorder;
            let printer;
            ts.forEachChild(sourceFile, function analyze(node) {
                if (!(ts.isExportDeclaration(node) &&
                    node.moduleSpecifier &&
                    ts.isStringLiteral(node.moduleSpecifier) &&
                    node.moduleSpecifier.text === '@angular/platform-server' &&
                    node.exportClause &&
                    ts.isNamedExports(node.exportClause))) {
                    // Not a @angular/platform-server named export.
                    return;
                }
                const exportClause = node.exportClause;
                const newElements = [];
                for (const element of exportClause.elements) {
                    if (element.name.text !== 'renderModule') {
                        newElements.push(element);
                    }
                }
                if (newElements.length === exportClause.elements.length) {
                    // No changes
                    return;
                }
                recorder ?? (recorder = tree.beginUpdate(sourceFile.fileName));
                if (newElements.length) {
                    // Update named exports as there are leftovers.
                    const newExportClause = ts.factory.updateNamedExports(exportClause, newElements);
                    printer ?? (printer = ts.createPrinter());
                    const fix = printer.printNode(ts.EmitHint.Unspecified, newExportClause, sourceFile);
                    const index = exportClause.getStart();
                    const length = exportClause.getWidth();
                    recorder.remove(index, length).insertLeft(index, fix);
                }
                else {
                    // Delete export as no exports remain.
                    recorder.remove(node.getStart(), node.getWidth());
                }
                ts.forEachChild(node, analyze);
            });
            if (recorder) {
                tree.commitUpdate(recorder);
            }
        }
    };
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3ZlLXBsYXRmb3JtLXNlcnZlci1leHBvcnRzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvc2NoZW1hdGljcy9hbmd1bGFyL21pZ3JhdGlvbnMvdXBkYXRlLTE1L3JlbW92ZS1wbGF0Zm9ybS1zZXJ2ZXItZXhwb3J0cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBR0gscUdBQXVGO0FBRXZGLFFBQVEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxTQUFtQjtJQUNqQyxLQUFLLE1BQU0sSUFBSSxJQUFJLFNBQVMsQ0FBQyxRQUFRLEVBQUU7UUFDckMsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRTtZQUNuRCxNQUFNLEtBQUssR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ25DLElBQUksS0FBSyxFQUFFO2dCQUNULE1BQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUM7Z0JBQzlCLElBQUksT0FBTyxDQUFDLFFBQVEsQ0FBQywwQkFBMEIsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLEVBQUU7b0JBQ3BGLE1BQU0sTUFBTSxHQUFHLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FDaEMsS0FBSyxDQUFDLElBQUksRUFDVixPQUFPLENBQUMsUUFBUSxFQUFFLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsRUFDekMsRUFBRSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQ3RCLElBQUksQ0FDTCxDQUFDO29CQUVGLE1BQU0sTUFBTSxDQUFDO2lCQUNkO2FBQ0Y7U0FDRjtLQUNGO0lBRUQsS0FBSyxNQUFNLElBQUksSUFBSSxTQUFTLENBQUMsT0FBTyxFQUFFO1FB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LyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IERpckVudHJ5LCBSdWxlLCBVcGRhdGVSZWNvcmRlciB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJy4uLy4uL3RoaXJkX3BhcnR5L2dpdGh1Yi5jb20vTWljcm9zb2Z0L1R5cGVTY3JpcHQvbGliL3R5cGVzY3JpcHQnO1xuXG5mdW5jdGlvbiogdmlzaXQoZGlyZWN0b3J5OiBEaXJFbnRyeSk6IEl0ZXJhYmxlSXRlcmF0b3I8dHMuU291cmNlRmlsZT4ge1xuICBmb3IgKGNvbnN0IHBhdGggb2YgZGlyZWN0b3J5LnN1YmZpbGVzKSB7XG4gICAgaWYgKHBhdGguZW5kc1dpdGgoJy50cycpICYmICFwYXRoLmVuZHNXaXRoKCcuZC50cycpKSB7XG4gICAgICBjb25zdCBlbnRyeSA9IGRpcmVjdG9yeS5maWxlKHBhdGgpO1xuICAgICAgaWYgKGVudHJ5KSB7XG4gICAgICAgIGNvbnN0IGNvbnRlbnQgPSBlbnRyeS5jb250ZW50O1xuICAgICAgICBpZiAoY29udGVudC5pbmNsdWRlcygnQGFuZ3VsYXIvcGxhdGZvcm0tc2VydmVyJykgJiYgY29udGVudC5pbmNsdWRlcygncmVuZGVyTW9kdWxlJykpIHtcbiAgICAgICAgICBjb25zdCBzb3VyY2UgPSB0cy5jcmVhdGVTb3VyY2VGaWxlKFxuICAgICAgICAgICAgZW50cnkucGF0aCxcbiAgICAgICAgICAgIGNvbnRlbnQudG9TdHJpbmcoKS5yZXBsYWNlKC9eXFx1RkVGRi8sICcnKSxcbiAgICAgICAgICAgIHRzLlNjcmlwdFRhcmdldC5MYXRlc3QsXG4gICAgICAgICAgICB0cnVlLFxuICAgICAgICAgICk7XG5cbiAgICAgICAgICB5aWVsZCBzb3VyY2U7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBmb3IgKGNvbnN0IHBhdGggb2YgZGlyZWN0b3J5LnN1YmRpcnMpIHtcbiAgICBpZiAocGF0aCA9PT0gJ25vZGVfbW9kdWxlcycgfHwgcGF0aC5zdGFydHNXaXRoKCcuJykpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIHlpZWxkKiB2aXNpdChkaXJlY3RvcnkuZGlyKHBhdGgpKTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAoKTogUnVsZSB7XG4gIHJldHVybiAodHJlZSkgPT4ge1xuICAgIGZvciAoY29uc3Qgc291cmNlRmlsZSBvZiB2aXNpdCh0cmVlLnJvb3QpKSB7XG4gICAgICBsZXQgcmVjb3JkZXI6IFVwZGF0ZVJlY29yZGVyIHwgdW5kZWZpbmVkO1xuICAgICAgbGV0IHByaW50ZXI6IHRzLlByaW50ZXIgfCB1bmRlZmluZWQ7XG5cbiAgICAgIHRzLmZvckVhY2hDaGlsZChzb3VyY2VGaWxlLCBmdW5jdGlvbiBhbmFseXplKG5vZGUpIHtcbiAgICAgICAgaWYgKFxuICAgICAgICAgICEoXG4gICAgICAgICAgICB0cy5pc0V4cG9ydERlY2xhcmF0aW9uKG5vZGUpICYmXG4gICAgICAgICAgICBub2RlLm1vZHVsZVNwZWNpZmllciAmJlxuICAgICAgICAgICAgdHMuaXNTdHJpbmdMaXRlcmFsKG5vZGUubW9kdWxlU3BlY2lmaWVyKSAmJlxuICAgICAgICAgICAgbm9kZS5tb2R1bGVTcGVjaWZpZXIudGV4dCA9PT0gJ0Bhbmd1bGFyL3BsYXRmb3JtLXNlcnZlcicgJiZcbiAgICAgICAgICAgIG5vZGUuZXhwb3J0Q2xhdXNlICYmXG4gICAgICAgICAgICB0cy5pc05hbWVkRXhwb3J0cyhub2RlLmV4cG9ydENsYXVzZSlcbiAgICAgICAgICApXG4gICAgICAgICkge1xuICAgICAgICAgIC8vIE5vdCBhIEBhbmd1bGFyL3BsYXRmb3JtLXNlcnZlciBuYW1lZCBleHBvcnQuXG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgZXhwb3J0Q2xhdXNlID0gbm9kZS5leHBvcnRDbGF1c2U7XG4gICAgICAgIGNvbnN0IG5ld0VsZW1lbnRzOiB0cy5FeHBvcnRTcGVjaWZpZXJbXSA9IFtdO1xuICAgICAgICBmb3IgKGNvbnN0IGVsZW1lbnQgb2YgZXhwb3J0Q2xhdXNlLmVsZW1lbnRzKSB7XG4gICAgICAgICAgaWYgKGVsZW1lbnQubmFtZS50ZXh0ICE9PSAncmVuZGVyTW9kdWxlJykge1xuICAgICAgICAgICAgbmV3RWxlbWVudHMucHVzaChlbGVtZW50KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobmV3RWxlbWVudHMubGVuZ3RoID09PSBleHBvcnRDbGF1c2UuZWxlbWVudHMubGVuZ3RoKSB7XG4gICAgICAgICAgLy8gTm8gY2hhbmdlc1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHJlY29yZGVyID8/PSB0cmVlLmJlZ2luVXBkYXRlKHNvdXJjZUZpbGUuZmlsZU5hbWUpO1xuXG4gICAgICAgIGlmIChuZXdFbGVtZW50cy5sZW5ndGgpIHtcbiAgICAgICAgICAvLyBVcGRhdGUgbmFtZWQgZXhwb3J0cyBhcyB0aGVyZSBhcmUgbGVmdG92ZXJzLlxuICAgICAgICAgIGNvbnN0IG5ld0V4cG9ydENsYXVzZSA9IHRzLmZhY3RvcnkudXBkYXRlTmFtZWRFeHBvcnRzKGV4cG9ydENsYXVzZSwgbmV3RWxlbWVudHMpO1xuICAgICAgICAgIHByaW50ZXIgPz89IHRzLmNyZWF0ZVByaW50ZXIoKTtcbiAgICAgICAgICBjb25zdCBmaXggPSBwcmludGVyLnByaW50Tm9kZSh0cy5FbWl0SGludC5VbnNwZWNpZmllZCwgbmV3RXhwb3J0Q2xhdXNlLCBzb3VyY2VGaWxlKTtcblxuICAgICAgICAgIGNvbnN0IGluZGV4ID0gZXhwb3J0Q2xhdXNlLmdldFN0YXJ0KCk7XG4gICAgICAgICAgY29uc3QgbGVuZ3RoID0gZXhwb3J0Q2xhdXNlLmdldFdpZHRoKCk7XG4gICAgICAgICAgcmVjb3JkZXIucmVtb3ZlKGluZGV4LCBsZW5ndGgpLmluc2VydExlZnQoaW5kZXgsIGZpeCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gRGVsZXRlIGV4cG9ydCBhcyBubyBleHBvcnRzIHJlbWFpbi5cbiAgICAgICAgICByZWNvcmRlci5yZW1vdmUobm9kZS5nZXRTdGFydCgpLCBub2RlLmdldFdpZHRoKCkpO1xuICAgICAgICB9XG5cbiAgICAgICAgdHMuZm9yRWFjaENoaWxkKG5vZGUsIGFuYWx5emUpO1xuICAgICAgfSk7XG5cbiAgICAgIGlmIChyZWNvcmRlcikge1xuICAgICAgICB0cmVlLmNvbW1pdFVwZGF0ZShyZWNvcmRlcik7XG4gICAgICB9XG4gICAgfVxuICB9O1xufVxuIl19