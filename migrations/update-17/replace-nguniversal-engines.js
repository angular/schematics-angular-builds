"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
const schematics_1 = require("@angular-devkit/schematics");
const utility_1 = require("../../utility");
const dependencies_1 = require("../../utility/dependencies");
const latest_versions_1 = require("../../utility/latest-versions");
const workspace_1 = require("../../utility/workspace");
const workspace_models_1 = require("../../utility/workspace-models");
function* visit(directory) {
    for (const path of directory.subfiles) {
        if (path.endsWith('.ts') && !path.endsWith('.d.ts')) {
            const entry = directory.file(path);
            if (entry) {
                const content = entry.content;
                if (content.includes('@nguniversal/')) {
                    // Only need to rename the import so we can just string replacements.
                    yield [entry.path, content.toString()];
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
const UNIVERSAL_PACKAGES = ['@nguniversal/common', '@nguniversal/express-engine'];
/**
 * Regexp to match Universal packages.
 * @nguniversal/common/engine
 * @nguniversal/common
 * @nguniversal/express-engine
 **/
const NGUNIVERSAL_PACKAGE_REGEXP = /@nguniversal\/(common(\/engine)?|express-engine)/g;
function default_1() {
    return async (tree) => {
        const hasUniversalDeps = UNIVERSAL_PACKAGES.some((d) => (0, dependencies_1.getPackageJsonDependency)(tree, d));
        if (!hasUniversalDeps) {
            return;
        }
        return (0, schematics_1.chain)([
            async (tree) => {
                // Replace server file.
                const workspace = await (0, workspace_1.getWorkspace)(tree);
                for (const [, project] of workspace.projects) {
                    if (project.extensions.projectType !== workspace_models_1.ProjectType.Application) {
                        continue;
                    }
                    const serverMainFiles = new Map();
                    for (const [, target] of project.targets) {
                        if (target.builder !== workspace_models_1.Builders.Server) {
                            continue;
                        }
                        const outputPath = project.targets.get('build')?.options?.outputPath;
                        for (const [, { main }] of (0, workspace_1.allTargetOptions)(target, false)) {
                            if (typeof main === 'string' &&
                                typeof outputPath === 'string' &&
                                tree.readText(main).includes('ngExpressEngine')) {
                                serverMainFiles.set(main, outputPath);
                            }
                        }
                    }
                    // Replace server file
                    for (const [path, outputPath] of serverMainFiles.entries()) {
                        tree.rename(path, path + '.bak');
                        tree.create(path, getServerFileContents(outputPath));
                    }
                }
                // Replace all import specifiers in all files.
                for (const file of visit(tree.root)) {
                    const [path, content] = file;
                    tree.overwrite(path, content.replaceAll(NGUNIVERSAL_PACKAGE_REGEXP, '@angular/ssr'));
                }
                // Remove universal packages from deps.
                for (const name of UNIVERSAL_PACKAGES) {
                    (0, dependencies_1.removePackageJsonDependency)(tree, name);
                }
            },
            (0, utility_1.addDependency)('@angular/ssr', latest_versions_1.latestVersions.AngularSSR),
        ]);
    };
}
exports.default = default_1;
function getServerFileContents(outputPath) {
    return `
import 'zone.js/node';

import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine } from '@angular/ssr';
import * as express from 'express';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import bootstrap from './src/main.server';

// The Express app is exported so that it can be used by serverless Functions.
export function app(): express.Express {
  const server = express();
  const distFolder = join(process.cwd(), '${outputPath}');
  const indexHtml = existsSync(join(distFolder, 'index.original.html'))
    ? join(distFolder, 'index.original.html')
    : join(distFolder, 'index.html');

  const commonEngine = new CommonEngine();

  server.set('view engine', 'html');
  server.set('views', distFolder);

  // Example Express Rest API endpoints
  // server.get('/api/**', (req, res) => { });
  // Serve static files from /browser
  server.get('*.*', express.static(distFolder, {
    maxAge: '1y'
  }));

  // All regular routes use the Angular engine
  server.get('*', (req, res, next) => {
    commonEngine
      .render({
        bootstrap,
        documentFilePath: indexHtml,
        url: req.originalUrl,
        publicPath: distFolder,
        providers: [{ provide: APP_BASE_HREF, useValue: req.baseUrl }],
      })
      .then((html) => res.send(html))
      .catch((err) => next(err));
  });

  return server;
}

function run(): void {
  const port = process.env['PORT'] || 4000;

  // Start up the Node server
  const server = app();
  server.listen(port, () => {
    console.log(\`Node Express server listening on http://localhost:\${port}\`);
  });
}

// Webpack will replace 'require' with '__webpack_require__'
// '__non_webpack_require__' is a proxy to Node 'require'
// The below code is to ensure that the server is run only when not requiring the bundle.
declare const __non_webpack_require__: NodeRequire;
const mainModule = __non_webpack_require__.main;
const moduleFilename = mainModule && mainModule.filename || '';
if (moduleFilename === __filename || moduleFilename.includes('iisnode')) {
  run();
}

export default bootstrap;
`;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbGFjZS1uZ3VuaXZlcnNhbC1lbmdpbmVzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvc2NoZW1hdGljcy9hbmd1bGFyL21pZ3JhdGlvbnMvdXBkYXRlLTE3L3JlcGxhY2Utbmd1bml2ZXJzYWwtZW5naW5lcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOztBQUVILDJEQUFtRTtBQUNuRSwyQ0FBOEM7QUFDOUMsNkRBQW1HO0FBQ25HLG1FQUErRDtBQUMvRCx1REFBeUU7QUFDekUscUVBQXVFO0FBRXZFLFFBQVEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxTQUFtQjtJQUNqQyxLQUFLLE1BQU0sSUFBSSxJQUFJLFNBQVMsQ0FBQyxRQUFRLEVBQUU7UUFDckMsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRTtZQUNuRCxNQUFNLEtBQUssR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ25DLElBQUksS0FBSyxFQUFFO2dCQUNULE1BQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUM7Z0JBQzlCLElBQUksT0FBTyxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsRUFBRTtvQkFDckMscUVBQXFFO29CQUNyRSxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztpQkFDeEM7YUFDRjtTQUNGO0tBQ0Y7SUFFRCxLQUFLLE1BQU0sSUFBSSxJQUFJLFNBQVMsQ0FBQyxPQUFPLEVBQUU7UUFDcEMsSUFBSSxJQUFJLEtBQUssY0FBYyxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDbkQsU0FBUztTQUNWO1FBRUQsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztLQUNuQztBQUNILENBQUM7QUFFRCxNQUFNLGtCQUFrQixHQUFHLENBQUMscUJBQXFCLEVBQUUsNkJBQTZCLENBQUMsQ0FBQztBQUVsRjs7Ozs7SUFLSTtBQUNKLE1BQU0sMEJBQTBCLEdBQUcsbURBQW1ELENBQUM7QUFFdkY7SUFDRSxPQUFPLEtBQUssRUFBRSxJQUFJLEVBQUUsRUFBRTtRQUNwQixNQUFNLGdCQUFnQixHQUFHLGtCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBQSx1Q0FBd0IsRUFBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMzRixJQUFJLENBQUMsZ0JBQWdCLEVBQUU7WUFDckIsT0FBTztTQUNSO1FBRUQsT0FBTyxJQUFBLGtCQUFLLEVBQUM7WUFDWCxLQUFLLEVBQUUsSUFBSSxFQUFFLEVBQUU7Z0JBQ2IsdUJBQXVCO2dCQUN2QixNQUFNLFNBQVMsR0FBRyxNQUFNLElBQUEsd0JBQVksRUFBQyxJQUFJLENBQUMsQ0FBQztnQkFDM0MsS0FBSyxNQUFNLENBQUMsRUFBRSxPQUFPLENBQUMsSUFBSSxTQUFTLENBQUMsUUFBUSxFQUFFO29CQUM1QyxJQUFJLE9BQU8sQ0FBQyxVQUFVLENBQUMsV0FBVyxLQUFLLDhCQUFXLENBQUMsV0FBVyxFQUFFO3dCQUM5RCxTQUFTO3FCQUNWO29CQUVELE1BQU0sZUFBZSxHQUFHLElBQUksR0FBRyxFQUFzRCxDQUFDO29CQUN0RixLQUFLLE1BQU0sQ0FBQyxFQUFFLE1BQU0sQ0FBQyxJQUFJLE9BQU8sQ0FBQyxPQUFPLEVBQUU7d0JBQ3hDLElBQUksTUFBTSxDQUFDLE9BQU8sS0FBSywyQkFBUSxDQUFDLE1BQU0sRUFBRTs0QkFDdEMsU0FBUzt5QkFDVjt3QkFFRCxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsRUFBRSxPQUFPLEVBQUUsVUFBVSxDQUFDO3dCQUVyRSxLQUFLLE1BQU0sQ0FBQyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsSUFBSSxJQUFBLDRCQUFnQixFQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsRUFBRTs0QkFDMUQsSUFDRSxPQUFPLElBQUksS0FBSyxRQUFRO2dDQUN4QixPQUFPLFVBQVUsS0FBSyxRQUFRO2dDQUM5QixJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxFQUMvQztnQ0FDQSxlQUFlLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxVQUFVLENBQUMsQ0FBQzs2QkFDdkM7eUJBQ0Y7cUJBQ0Y7b0JBRUQsc0JBQXNCO29CQUN0QixLQUFLLE1BQU0sQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLElBQUksZUFBZSxDQUFDLE9BQU8sRUFBRSxFQUFFO3dCQUMxRCxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxJQUFJLEdBQUcsTUFBTSxDQUFDLENBQUM7d0JBQ2pDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLHFCQUFxQixDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7cUJBQ3REO2lCQUNGO2dCQUVELDhDQUE4QztnQkFDOUMsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFO29CQUNuQyxNQUFNLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxHQUFHLElBQUksQ0FBQztvQkFDN0IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLFVBQVUsQ0FBQywwQkFBMEIsRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDO2lCQUN0RjtnQkFFRCx1Q0FBdUM7Z0JBQ3ZDLEtBQUssTUFBTSxJQUFJLElBQUksa0JBQWtCLEVBQUU7b0JBQ3JDLElBQUEsMENBQTJCLEVBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO2lCQUN6QztZQUNILENBQUM7WUFDRCxJQUFBLHVCQUFhLEVBQUMsY0FBYyxFQUFFLGdDQUFjLENBQUMsVUFBVSxDQUFDO1NBQ3pELENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQztBQUNKLENBQUM7QUF4REQsNEJBd0RDO0FBRUQsU0FBUyxxQkFBcUIsQ0FBQyxVQUFrQjtJQUMvQyxPQUFPOzs7Ozs7Ozs7Ozs7OzRDQWFtQyxVQUFVOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0NBdURyRCxDQUFDO0FBQ0YsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBEaXJFbnRyeSwgUnVsZSwgY2hhaW4gfSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcyc7XG5pbXBvcnQgeyBhZGREZXBlbmRlbmN5IH0gZnJvbSAnLi4vLi4vdXRpbGl0eSc7XG5pbXBvcnQgeyBnZXRQYWNrYWdlSnNvbkRlcGVuZGVuY3ksIHJlbW92ZVBhY2thZ2VKc29uRGVwZW5kZW5jeSB9IGZyb20gJy4uLy4uL3V0aWxpdHkvZGVwZW5kZW5jaWVzJztcbmltcG9ydCB7IGxhdGVzdFZlcnNpb25zIH0gZnJvbSAnLi4vLi4vdXRpbGl0eS9sYXRlc3QtdmVyc2lvbnMnO1xuaW1wb3J0IHsgYWxsVGFyZ2V0T3B0aW9ucywgZ2V0V29ya3NwYWNlIH0gZnJvbSAnLi4vLi4vdXRpbGl0eS93b3Jrc3BhY2UnO1xuaW1wb3J0IHsgQnVpbGRlcnMsIFByb2plY3RUeXBlIH0gZnJvbSAnLi4vLi4vdXRpbGl0eS93b3Jrc3BhY2UtbW9kZWxzJztcblxuZnVuY3Rpb24qIHZpc2l0KGRpcmVjdG9yeTogRGlyRW50cnkpOiBJdGVyYWJsZUl0ZXJhdG9yPFtmaWxlTmFtZTogc3RyaW5nLCBjb250ZW50czogc3RyaW5nXT4ge1xuICBmb3IgKGNvbnN0IHBhdGggb2YgZGlyZWN0b3J5LnN1YmZpbGVzKSB7XG4gICAgaWYgKHBhdGguZW5kc1dpdGgoJy50cycpICYmICFwYXRoLmVuZHNXaXRoKCcuZC50cycpKSB7XG4gICAgICBjb25zdCBlbnRyeSA9IGRpcmVjdG9yeS5maWxlKHBhdGgpO1xuICAgICAgaWYgKGVudHJ5KSB7XG4gICAgICAgIGNvbnN0IGNvbnRlbnQgPSBlbnRyeS5jb250ZW50O1xuICAgICAgICBpZiAoY29udGVudC5pbmNsdWRlcygnQG5ndW5pdmVyc2FsLycpKSB7XG4gICAgICAgICAgLy8gT25seSBuZWVkIHRvIHJlbmFtZSB0aGUgaW1wb3J0IHNvIHdlIGNhbiBqdXN0IHN0cmluZyByZXBsYWNlbWVudHMuXG4gICAgICAgICAgeWllbGQgW2VudHJ5LnBhdGgsIGNvbnRlbnQudG9TdHJpbmcoKV07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBmb3IgKGNvbnN0IHBhdGggb2YgZGlyZWN0b3J5LnN1YmRpcnMpIHtcbiAgICBpZiAocGF0aCA9PT0gJ25vZGVfbW9kdWxlcycgfHwgcGF0aC5zdGFydHNXaXRoKCcuJykpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIHlpZWxkKiB2aXNpdChkaXJlY3RvcnkuZGlyKHBhdGgpKTtcbiAgfVxufVxuXG5jb25zdCBVTklWRVJTQUxfUEFDS0FHRVMgPSBbJ0BuZ3VuaXZlcnNhbC9jb21tb24nLCAnQG5ndW5pdmVyc2FsL2V4cHJlc3MtZW5naW5lJ107XG5cbi8qKlxuICogUmVnZXhwIHRvIG1hdGNoIFVuaXZlcnNhbCBwYWNrYWdlcy5cbiAqIEBuZ3VuaXZlcnNhbC9jb21tb24vZW5naW5lXG4gKiBAbmd1bml2ZXJzYWwvY29tbW9uXG4gKiBAbmd1bml2ZXJzYWwvZXhwcmVzcy1lbmdpbmVcbiAqKi9cbmNvbnN0IE5HVU5JVkVSU0FMX1BBQ0tBR0VfUkVHRVhQID0gL0BuZ3VuaXZlcnNhbFxcLyhjb21tb24oXFwvZW5naW5lKT98ZXhwcmVzcy1lbmdpbmUpL2c7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uICgpOiBSdWxlIHtcbiAgcmV0dXJuIGFzeW5jICh0cmVlKSA9PiB7XG4gICAgY29uc3QgaGFzVW5pdmVyc2FsRGVwcyA9IFVOSVZFUlNBTF9QQUNLQUdFUy5zb21lKChkKSA9PiBnZXRQYWNrYWdlSnNvbkRlcGVuZGVuY3kodHJlZSwgZCkpO1xuICAgIGlmICghaGFzVW5pdmVyc2FsRGVwcykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHJldHVybiBjaGFpbihbXG4gICAgICBhc3luYyAodHJlZSkgPT4ge1xuICAgICAgICAvLyBSZXBsYWNlIHNlcnZlciBmaWxlLlxuICAgICAgICBjb25zdCB3b3Jrc3BhY2UgPSBhd2FpdCBnZXRXb3Jrc3BhY2UodHJlZSk7XG4gICAgICAgIGZvciAoY29uc3QgWywgcHJvamVjdF0gb2Ygd29ya3NwYWNlLnByb2plY3RzKSB7XG4gICAgICAgICAgaWYgKHByb2plY3QuZXh0ZW5zaW9ucy5wcm9qZWN0VHlwZSAhPT0gUHJvamVjdFR5cGUuQXBwbGljYXRpb24pIHtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGNvbnN0IHNlcnZlck1haW5GaWxlcyA9IG5ldyBNYXA8c3RyaW5nIC8qKiBNYWluIFBhdGggKi8sIHN0cmluZyAvKiogT3V0cHV0IFBhdGggKi8+KCk7XG4gICAgICAgICAgZm9yIChjb25zdCBbLCB0YXJnZXRdIG9mIHByb2plY3QudGFyZ2V0cykge1xuICAgICAgICAgICAgaWYgKHRhcmdldC5idWlsZGVyICE9PSBCdWlsZGVycy5TZXJ2ZXIpIHtcbiAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IG91dHB1dFBhdGggPSBwcm9qZWN0LnRhcmdldHMuZ2V0KCdidWlsZCcpPy5vcHRpb25zPy5vdXRwdXRQYXRoO1xuXG4gICAgICAgICAgICBmb3IgKGNvbnN0IFssIHsgbWFpbiB9XSBvZiBhbGxUYXJnZXRPcHRpb25zKHRhcmdldCwgZmFsc2UpKSB7XG4gICAgICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICAgICB0eXBlb2YgbWFpbiA9PT0gJ3N0cmluZycgJiZcbiAgICAgICAgICAgICAgICB0eXBlb2Ygb3V0cHV0UGF0aCA9PT0gJ3N0cmluZycgJiZcbiAgICAgICAgICAgICAgICB0cmVlLnJlYWRUZXh0KG1haW4pLmluY2x1ZGVzKCduZ0V4cHJlc3NFbmdpbmUnKVxuICAgICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgICBzZXJ2ZXJNYWluRmlsZXMuc2V0KG1haW4sIG91dHB1dFBhdGgpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gUmVwbGFjZSBzZXJ2ZXIgZmlsZVxuICAgICAgICAgIGZvciAoY29uc3QgW3BhdGgsIG91dHB1dFBhdGhdIG9mIHNlcnZlck1haW5GaWxlcy5lbnRyaWVzKCkpIHtcbiAgICAgICAgICAgIHRyZWUucmVuYW1lKHBhdGgsIHBhdGggKyAnLmJhaycpO1xuICAgICAgICAgICAgdHJlZS5jcmVhdGUocGF0aCwgZ2V0U2VydmVyRmlsZUNvbnRlbnRzKG91dHB1dFBhdGgpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBSZXBsYWNlIGFsbCBpbXBvcnQgc3BlY2lmaWVycyBpbiBhbGwgZmlsZXMuXG4gICAgICAgIGZvciAoY29uc3QgZmlsZSBvZiB2aXNpdCh0cmVlLnJvb3QpKSB7XG4gICAgICAgICAgY29uc3QgW3BhdGgsIGNvbnRlbnRdID0gZmlsZTtcbiAgICAgICAgICB0cmVlLm92ZXJ3cml0ZShwYXRoLCBjb250ZW50LnJlcGxhY2VBbGwoTkdVTklWRVJTQUxfUEFDS0FHRV9SRUdFWFAsICdAYW5ndWxhci9zc3InKSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBSZW1vdmUgdW5pdmVyc2FsIHBhY2thZ2VzIGZyb20gZGVwcy5cbiAgICAgICAgZm9yIChjb25zdCBuYW1lIG9mIFVOSVZFUlNBTF9QQUNLQUdFUykge1xuICAgICAgICAgIHJlbW92ZVBhY2thZ2VKc29uRGVwZW5kZW5jeSh0cmVlLCBuYW1lKTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIGFkZERlcGVuZGVuY3koJ0Bhbmd1bGFyL3NzcicsIGxhdGVzdFZlcnNpb25zLkFuZ3VsYXJTU1IpLFxuICAgIF0pO1xuICB9O1xufVxuXG5mdW5jdGlvbiBnZXRTZXJ2ZXJGaWxlQ29udGVudHMob3V0cHV0UGF0aDogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGBcbmltcG9ydCAnem9uZS5qcy9ub2RlJztcblxuaW1wb3J0IHsgQVBQX0JBU0VfSFJFRiB9IGZyb20gJ0Bhbmd1bGFyL2NvbW1vbic7XG5pbXBvcnQgeyBDb21tb25FbmdpbmUgfSBmcm9tICdAYW5ndWxhci9zc3InO1xuaW1wb3J0ICogYXMgZXhwcmVzcyBmcm9tICdleHByZXNzJztcbmltcG9ydCB7IGV4aXN0c1N5bmMgfSBmcm9tICdub2RlOmZzJztcbmltcG9ydCB7IGpvaW4gfSBmcm9tICdub2RlOnBhdGgnO1xuaW1wb3J0IGJvb3RzdHJhcCBmcm9tICcuL3NyYy9tYWluLnNlcnZlcic7XG5cbi8vIFRoZSBFeHByZXNzIGFwcCBpcyBleHBvcnRlZCBzbyB0aGF0IGl0IGNhbiBiZSB1c2VkIGJ5IHNlcnZlcmxlc3MgRnVuY3Rpb25zLlxuZXhwb3J0IGZ1bmN0aW9uIGFwcCgpOiBleHByZXNzLkV4cHJlc3Mge1xuICBjb25zdCBzZXJ2ZXIgPSBleHByZXNzKCk7XG4gIGNvbnN0IGRpc3RGb2xkZXIgPSBqb2luKHByb2Nlc3MuY3dkKCksICcke291dHB1dFBhdGh9Jyk7XG4gIGNvbnN0IGluZGV4SHRtbCA9IGV4aXN0c1N5bmMoam9pbihkaXN0Rm9sZGVyLCAnaW5kZXgub3JpZ2luYWwuaHRtbCcpKVxuICAgID8gam9pbihkaXN0Rm9sZGVyLCAnaW5kZXgub3JpZ2luYWwuaHRtbCcpXG4gICAgOiBqb2luKGRpc3RGb2xkZXIsICdpbmRleC5odG1sJyk7XG5cbiAgY29uc3QgY29tbW9uRW5naW5lID0gbmV3IENvbW1vbkVuZ2luZSgpO1xuXG4gIHNlcnZlci5zZXQoJ3ZpZXcgZW5naW5lJywgJ2h0bWwnKTtcbiAgc2VydmVyLnNldCgndmlld3MnLCBkaXN0Rm9sZGVyKTtcblxuICAvLyBFeGFtcGxlIEV4cHJlc3MgUmVzdCBBUEkgZW5kcG9pbnRzXG4gIC8vIHNlcnZlci5nZXQoJy9hcGkvKionLCAocmVxLCByZXMpID0+IHsgfSk7XG4gIC8vIFNlcnZlIHN0YXRpYyBmaWxlcyBmcm9tIC9icm93c2VyXG4gIHNlcnZlci5nZXQoJyouKicsIGV4cHJlc3Muc3RhdGljKGRpc3RGb2xkZXIsIHtcbiAgICBtYXhBZ2U6ICcxeSdcbiAgfSkpO1xuXG4gIC8vIEFsbCByZWd1bGFyIHJvdXRlcyB1c2UgdGhlIEFuZ3VsYXIgZW5naW5lXG4gIHNlcnZlci5nZXQoJyonLCAocmVxLCByZXMsIG5leHQpID0+IHtcbiAgICBjb21tb25FbmdpbmVcbiAgICAgIC5yZW5kZXIoe1xuICAgICAgICBib290c3RyYXAsXG4gICAgICAgIGRvY3VtZW50RmlsZVBhdGg6IGluZGV4SHRtbCxcbiAgICAgICAgdXJsOiByZXEub3JpZ2luYWxVcmwsXG4gICAgICAgIHB1YmxpY1BhdGg6IGRpc3RGb2xkZXIsXG4gICAgICAgIHByb3ZpZGVyczogW3sgcHJvdmlkZTogQVBQX0JBU0VfSFJFRiwgdXNlVmFsdWU6IHJlcS5iYXNlVXJsIH1dLFxuICAgICAgfSlcbiAgICAgIC50aGVuKChodG1sKSA9PiByZXMuc2VuZChodG1sKSlcbiAgICAgIC5jYXRjaCgoZXJyKSA9PiBuZXh0KGVycikpO1xuICB9KTtcblxuICByZXR1cm4gc2VydmVyO1xufVxuXG5mdW5jdGlvbiBydW4oKTogdm9pZCB7XG4gIGNvbnN0IHBvcnQgPSBwcm9jZXNzLmVudlsnUE9SVCddIHx8IDQwMDA7XG5cbiAgLy8gU3RhcnQgdXAgdGhlIE5vZGUgc2VydmVyXG4gIGNvbnN0IHNlcnZlciA9IGFwcCgpO1xuICBzZXJ2ZXIubGlzdGVuKHBvcnQsICgpID0+IHtcbiAgICBjb25zb2xlLmxvZyhcXGBOb2RlIEV4cHJlc3Mgc2VydmVyIGxpc3RlbmluZyBvbiBodHRwOi8vbG9jYWxob3N0OlxcJHtwb3J0fVxcYCk7XG4gIH0pO1xufVxuXG4vLyBXZWJwYWNrIHdpbGwgcmVwbGFjZSAncmVxdWlyZScgd2l0aCAnX193ZWJwYWNrX3JlcXVpcmVfXydcbi8vICdfX25vbl93ZWJwYWNrX3JlcXVpcmVfXycgaXMgYSBwcm94eSB0byBOb2RlICdyZXF1aXJlJ1xuLy8gVGhlIGJlbG93IGNvZGUgaXMgdG8gZW5zdXJlIHRoYXQgdGhlIHNlcnZlciBpcyBydW4gb25seSB3aGVuIG5vdCByZXF1aXJpbmcgdGhlIGJ1bmRsZS5cbmRlY2xhcmUgY29uc3QgX19ub25fd2VicGFja19yZXF1aXJlX186IE5vZGVSZXF1aXJlO1xuY29uc3QgbWFpbk1vZHVsZSA9IF9fbm9uX3dlYnBhY2tfcmVxdWlyZV9fLm1haW47XG5jb25zdCBtb2R1bGVGaWxlbmFtZSA9IG1haW5Nb2R1bGUgJiYgbWFpbk1vZHVsZS5maWxlbmFtZSB8fCAnJztcbmlmIChtb2R1bGVGaWxlbmFtZSA9PT0gX19maWxlbmFtZSB8fCBtb2R1bGVGaWxlbmFtZS5pbmNsdWRlcygnaWlzbm9kZScpKSB7XG4gIHJ1bigpO1xufVxuXG5leHBvcnQgZGVmYXVsdCBib290c3RyYXA7XG5gO1xufVxuIl19