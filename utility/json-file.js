"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.JSONFile = void 0;
const jsonc_parser_1 = require("jsonc-parser");
/** @private */
class JSONFile {
    host;
    path;
    content;
    constructor(host, path) {
        this.host = host;
        this.path = path;
        this.content = this.host.readText(this.path);
    }
    _jsonAst;
    get JsonAst() {
        if (this._jsonAst) {
            return this._jsonAst;
        }
        const errors = [];
        this._jsonAst = (0, jsonc_parser_1.parseTree)(this.content, errors, { allowTrailingComma: true });
        if (errors.length) {
            const { error, offset } = errors[0];
            throw new Error(`Failed to parse "${this.path}" as JSON AST Object. ${(0, jsonc_parser_1.printParseErrorCode)(error)} at location: ${offset}.`);
        }
        return this._jsonAst;
    }
    get(jsonPath) {
        const jsonAstNode = this.JsonAst;
        if (!jsonAstNode) {
            return undefined;
        }
        if (jsonPath.length === 0) {
            return (0, jsonc_parser_1.getNodeValue)(jsonAstNode);
        }
        const node = (0, jsonc_parser_1.findNodeAtLocation)(jsonAstNode, jsonPath);
        return node === undefined ? undefined : (0, jsonc_parser_1.getNodeValue)(node);
    }
    modify(jsonPath, value, insertInOrder) {
        let getInsertionIndex;
        if (insertInOrder === undefined) {
            const property = jsonPath.slice(-1)[0];
            getInsertionIndex = (properties) => [...properties, property].sort().findIndex((p) => p === property);
        }
        else if (insertInOrder !== false) {
            getInsertionIndex = insertInOrder;
        }
        const edits = (0, jsonc_parser_1.modify)(this.content, jsonPath, value, {
            getInsertionIndex,
            formattingOptions: {
                insertSpaces: true,
                tabSize: 2,
            },
        });
        this.content = (0, jsonc_parser_1.applyEdits)(this.content, edits);
        this.host.overwrite(this.path, this.content);
        this._jsonAst = undefined;
    }
    remove(jsonPath) {
        if (this.get(jsonPath) !== undefined) {
            this.modify(jsonPath, undefined);
        }
    }
}
exports.JSONFile = JSONFile;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvbi1maWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvc2NoZW1hdGljcy9hbmd1bGFyL3V0aWxpdHkvanNvbi1maWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7OztBQUlILCtDQVNzQjtBQUt0QixlQUFlO0FBQ2YsTUFBYSxRQUFRO0lBR1U7SUFBNkI7SUFGMUQsT0FBTyxDQUFTO0lBRWhCLFlBQTZCLElBQVUsRUFBbUIsSUFBWTtRQUF6QyxTQUFJLEdBQUosSUFBSSxDQUFNO1FBQW1CLFNBQUksR0FBSixJQUFJLENBQVE7UUFDcEUsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDL0MsQ0FBQztJQUVPLFFBQVEsQ0FBbUI7SUFDbkMsSUFBWSxPQUFPO1FBQ2pCLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRTtZQUNqQixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUM7U0FDdEI7UUFFRCxNQUFNLE1BQU0sR0FBaUIsRUFBRSxDQUFDO1FBQ2hDLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBQSx3QkFBUyxFQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUUsa0JBQWtCLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUM5RSxJQUFJLE1BQU0sQ0FBQyxNQUFNLEVBQUU7WUFDakIsTUFBTSxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDcEMsTUFBTSxJQUFJLEtBQUssQ0FDYixvQkFBb0IsSUFBSSxDQUFDLElBQUkseUJBQXlCLElBQUEsa0NBQW1CLEVBQ3ZFLEtBQUssQ0FDTixpQkFBaUIsTUFBTSxHQUFHLENBQzVCLENBQUM7U0FDSDtRQUVELE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQztJQUN2QixDQUFDO0lBRUQsR0FBRyxDQUFDLFFBQWtCO1FBQ3BCLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUM7UUFDakMsSUFBSSxDQUFDLFdBQVcsRUFBRTtZQUNoQixPQUFPLFNBQVMsQ0FBQztTQUNsQjtRQUVELElBQUksUUFBUSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7WUFDekIsT0FBTyxJQUFBLDJCQUFZLEVBQUMsV0FBVyxDQUFDLENBQUM7U0FDbEM7UUFFRCxNQUFNLElBQUksR0FBRyxJQUFBLGlDQUFrQixFQUFDLFdBQVcsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUV2RCxPQUFPLElBQUksS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBQSwyQkFBWSxFQUFDLElBQUksQ0FBQyxDQUFDO0lBQzdELENBQUM7SUFFRCxNQUFNLENBQ0osUUFBa0IsRUFDbEIsS0FBNEIsRUFDNUIsYUFBc0M7UUFFdEMsSUFBSSxpQkFBNkMsQ0FBQztRQUNsRCxJQUFJLGFBQWEsS0FBSyxTQUFTLEVBQUU7WUFDL0IsTUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3ZDLGlCQUFpQixHQUFHLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FDakMsQ0FBQyxHQUFHLFVBQVUsRUFBRSxRQUFRLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsS0FBSyxRQUFRLENBQUMsQ0FBQztTQUNyRTthQUFNLElBQUksYUFBYSxLQUFLLEtBQUssRUFBRTtZQUNsQyxpQkFBaUIsR0FBRyxhQUFhLENBQUM7U0FDbkM7UUFFRCxNQUFNLEtBQUssR0FBRyxJQUFBLHFCQUFNLEVBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFO1lBQ2xELGlCQUFpQjtZQUNqQixpQkFBaUIsRUFBRTtnQkFDakIsWUFBWSxFQUFFLElBQUk7Z0JBQ2xCLE9BQU8sRUFBRSxDQUFDO2FBQ1g7U0FDRixDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUEseUJBQVUsRUFBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQy9DLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzdDLElBQUksQ0FBQyxRQUFRLEdBQUcsU0FBUyxDQUFDO0lBQzVCLENBQUM7SUFFRCxNQUFNLENBQUMsUUFBa0I7UUFDdkIsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxLQUFLLFNBQVMsRUFBRTtZQUNwQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxTQUFTLENBQUMsQ0FBQztTQUNsQztJQUNILENBQUM7Q0FDRjtBQTFFRCw0QkEwRUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgSnNvblZhbHVlIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHsgVHJlZSB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzJztcbmltcG9ydCB7XG4gIE5vZGUsXG4gIFBhcnNlRXJyb3IsXG4gIGFwcGx5RWRpdHMsXG4gIGZpbmROb2RlQXRMb2NhdGlvbixcbiAgZ2V0Tm9kZVZhbHVlLFxuICBtb2RpZnksXG4gIHBhcnNlVHJlZSxcbiAgcHJpbnRQYXJzZUVycm9yQ29kZSxcbn0gZnJvbSAnanNvbmMtcGFyc2VyJztcblxuZXhwb3J0IHR5cGUgSW5zZXJ0aW9uSW5kZXggPSAocHJvcGVydGllczogc3RyaW5nW10pID0+IG51bWJlcjtcbmV4cG9ydCB0eXBlIEpTT05QYXRoID0gKHN0cmluZyB8IG51bWJlcilbXTtcblxuLyoqIEBwcml2YXRlICovXG5leHBvcnQgY2xhc3MgSlNPTkZpbGUge1xuICBjb250ZW50OiBzdHJpbmc7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBob3N0OiBUcmVlLCBwcml2YXRlIHJlYWRvbmx5IHBhdGg6IHN0cmluZykge1xuICAgIHRoaXMuY29udGVudCA9IHRoaXMuaG9zdC5yZWFkVGV4dCh0aGlzLnBhdGgpO1xuICB9XG5cbiAgcHJpdmF0ZSBfanNvbkFzdDogTm9kZSB8IHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBnZXQgSnNvbkFzdCgpOiBOb2RlIHwgdW5kZWZpbmVkIHtcbiAgICBpZiAodGhpcy5fanNvbkFzdCkge1xuICAgICAgcmV0dXJuIHRoaXMuX2pzb25Bc3Q7XG4gICAgfVxuXG4gICAgY29uc3QgZXJyb3JzOiBQYXJzZUVycm9yW10gPSBbXTtcbiAgICB0aGlzLl9qc29uQXN0ID0gcGFyc2VUcmVlKHRoaXMuY29udGVudCwgZXJyb3JzLCB7IGFsbG93VHJhaWxpbmdDb21tYTogdHJ1ZSB9KTtcbiAgICBpZiAoZXJyb3JzLmxlbmd0aCkge1xuICAgICAgY29uc3QgeyBlcnJvciwgb2Zmc2V0IH0gPSBlcnJvcnNbMF07XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBGYWlsZWQgdG8gcGFyc2UgXCIke3RoaXMucGF0aH1cIiBhcyBKU09OIEFTVCBPYmplY3QuICR7cHJpbnRQYXJzZUVycm9yQ29kZShcbiAgICAgICAgICBlcnJvcixcbiAgICAgICAgKX0gYXQgbG9jYXRpb246ICR7b2Zmc2V0fS5gLFxuICAgICAgKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5fanNvbkFzdDtcbiAgfVxuXG4gIGdldChqc29uUGF0aDogSlNPTlBhdGgpOiB1bmtub3duIHtcbiAgICBjb25zdCBqc29uQXN0Tm9kZSA9IHRoaXMuSnNvbkFzdDtcbiAgICBpZiAoIWpzb25Bc3ROb2RlKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGlmIChqc29uUGF0aC5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBnZXROb2RlVmFsdWUoanNvbkFzdE5vZGUpO1xuICAgIH1cblxuICAgIGNvbnN0IG5vZGUgPSBmaW5kTm9kZUF0TG9jYXRpb24oanNvbkFzdE5vZGUsIGpzb25QYXRoKTtcblxuICAgIHJldHVybiBub2RlID09PSB1bmRlZmluZWQgPyB1bmRlZmluZWQgOiBnZXROb2RlVmFsdWUobm9kZSk7XG4gIH1cblxuICBtb2RpZnkoXG4gICAganNvblBhdGg6IEpTT05QYXRoLFxuICAgIHZhbHVlOiBKc29uVmFsdWUgfCB1bmRlZmluZWQsXG4gICAgaW5zZXJ0SW5PcmRlcj86IEluc2VydGlvbkluZGV4IHwgZmFsc2UsXG4gICk6IHZvaWQge1xuICAgIGxldCBnZXRJbnNlcnRpb25JbmRleDogSW5zZXJ0aW9uSW5kZXggfCB1bmRlZmluZWQ7XG4gICAgaWYgKGluc2VydEluT3JkZXIgPT09IHVuZGVmaW5lZCkge1xuICAgICAgY29uc3QgcHJvcGVydHkgPSBqc29uUGF0aC5zbGljZSgtMSlbMF07XG4gICAgICBnZXRJbnNlcnRpb25JbmRleCA9IChwcm9wZXJ0aWVzKSA9PlxuICAgICAgICBbLi4ucHJvcGVydGllcywgcHJvcGVydHldLnNvcnQoKS5maW5kSW5kZXgoKHApID0+IHAgPT09IHByb3BlcnR5KTtcbiAgICB9IGVsc2UgaWYgKGluc2VydEluT3JkZXIgIT09IGZhbHNlKSB7XG4gICAgICBnZXRJbnNlcnRpb25JbmRleCA9IGluc2VydEluT3JkZXI7XG4gICAgfVxuXG4gICAgY29uc3QgZWRpdHMgPSBtb2RpZnkodGhpcy5jb250ZW50LCBqc29uUGF0aCwgdmFsdWUsIHtcbiAgICAgIGdldEluc2VydGlvbkluZGV4LFxuICAgICAgZm9ybWF0dGluZ09wdGlvbnM6IHtcbiAgICAgICAgaW5zZXJ0U3BhY2VzOiB0cnVlLFxuICAgICAgICB0YWJTaXplOiAyLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIHRoaXMuY29udGVudCA9IGFwcGx5RWRpdHModGhpcy5jb250ZW50LCBlZGl0cyk7XG4gICAgdGhpcy5ob3N0Lm92ZXJ3cml0ZSh0aGlzLnBhdGgsIHRoaXMuY29udGVudCk7XG4gICAgdGhpcy5fanNvbkFzdCA9IHVuZGVmaW5lZDtcbiAgfVxuXG4gIHJlbW92ZShqc29uUGF0aDogSlNPTlBhdGgpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5nZXQoanNvblBhdGgpICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMubW9kaWZ5KGpzb25QYXRoLCB1bmRlZmluZWQpO1xuICAgIH1cbiAgfVxufVxuIl19