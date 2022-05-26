"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.addDependency = exports.InstallBehavior = exports.DependencyType = exports.AngularBuilder = exports.writeWorkspace = exports.updateWorkspace = exports.readWorkspace = void 0;
// Workspace related rules and types
var workspace_1 = require("./workspace");
Object.defineProperty(exports, "readWorkspace", { enumerable: true, get: function () { return workspace_1.getWorkspace; } });
Object.defineProperty(exports, "updateWorkspace", { enumerable: true, get: function () { return workspace_1.updateWorkspace; } });
Object.defineProperty(exports, "writeWorkspace", { enumerable: true, get: function () { return workspace_1.writeWorkspace; } });
var workspace_models_1 = require("./workspace-models");
Object.defineProperty(exports, "AngularBuilder", { enumerable: true, get: function () { return workspace_models_1.Builders; } });
// Package dependency related rules and types
var dependency_1 = require("./dependency");
Object.defineProperty(exports, "DependencyType", { enumerable: true, get: function () { return dependency_1.DependencyType; } });
Object.defineProperty(exports, "InstallBehavior", { enumerable: true, get: function () { return dependency_1.InstallBehavior; } });
Object.defineProperty(exports, "addDependency", { enumerable: true, get: function () { return dependency_1.addDependency; } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9zY2hlbWF0aWNzL2FuZ3VsYXIvdXRpbGl0eS9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7QUFFSCxvQ0FBb0M7QUFDcEMseUNBT3FCO0FBSG5CLDBHQUFBLFlBQVksT0FBaUI7QUFDN0IsNEdBQUEsZUFBZSxPQUFBO0FBQ2YsMkdBQUEsY0FBYyxPQUFBO0FBRWhCLHVEQUFnRTtBQUF2RCxrSEFBQSxRQUFRLE9BQWtCO0FBRW5DLDZDQUE2QztBQUM3QywyQ0FBOEU7QUFBckUsNEdBQUEsY0FBYyxPQUFBO0FBQUUsNkdBQUEsZUFBZSxPQUFBO0FBQUUsMkdBQUEsYUFBYSxPQUFBIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbi8vIFdvcmtzcGFjZSByZWxhdGVkIHJ1bGVzIGFuZCB0eXBlc1xuZXhwb3J0IHtcbiAgUHJvamVjdERlZmluaXRpb24sXG4gIFRhcmdldERlZmluaXRpb24sXG4gIFdvcmtzcGFjZURlZmluaXRpb24sXG4gIGdldFdvcmtzcGFjZSBhcyByZWFkV29ya3NwYWNlLFxuICB1cGRhdGVXb3Jrc3BhY2UsXG4gIHdyaXRlV29ya3NwYWNlLFxufSBmcm9tICcuL3dvcmtzcGFjZSc7XG5leHBvcnQgeyBCdWlsZGVycyBhcyBBbmd1bGFyQnVpbGRlciB9IGZyb20gJy4vd29ya3NwYWNlLW1vZGVscyc7XG5cbi8vIFBhY2thZ2UgZGVwZW5kZW5jeSByZWxhdGVkIHJ1bGVzIGFuZCB0eXBlc1xuZXhwb3J0IHsgRGVwZW5kZW5jeVR5cGUsIEluc3RhbGxCZWhhdmlvciwgYWRkRGVwZW5kZW5jeSB9IGZyb20gJy4vZGVwZW5kZW5jeSc7XG4iXX0=