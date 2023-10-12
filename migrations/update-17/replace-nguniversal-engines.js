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
/**
 * Regexp to match Universal packages.
 * @nguniversal/common/engine
 * @nguniversal/common
 * @nguniversal/express-engine
 **/
const NGUNIVERSAL_PACKAGE_REGEXP = /@nguniversal\/(common(\/engine)?|express-engine)/g;
function default_1() {
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
            (0, dependencies_1.removePackageJsonDependency)(tree, '@nguniversal/express-engine');
            (0, dependencies_1.removePackageJsonDependency)(tree, '@nguniversal/common');
        },
        (0, utility_1.addDependency)('@angular/ssr', latest_versions_1.latestVersions.AngularSSR),
    ]);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbGFjZS1uZ3VuaXZlcnNhbC1lbmdpbmVzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvc2NoZW1hdGljcy9hbmd1bGFyL21pZ3JhdGlvbnMvdXBkYXRlLTE3L3JlcGxhY2Utbmd1bml2ZXJzYWwtZW5naW5lcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOztBQUVILDJEQUFtRTtBQUNuRSwyQ0FBOEM7QUFDOUMsNkRBQXlFO0FBQ3pFLG1FQUErRDtBQUMvRCx1REFBeUU7QUFDekUscUVBQXVFO0FBRXZFLFFBQVEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxTQUFtQjtJQUNqQyxLQUFLLE1BQU0sSUFBSSxJQUFJLFNBQVMsQ0FBQyxRQUFRLEVBQUU7UUFDckMsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRTtZQUNuRCxNQUFNLEtBQUssR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ25DLElBQUksS0FBSyxFQUFFO2dCQUNULE1BQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUM7Z0JBQzlCLElBQUksT0FBTyxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsRUFBRTtvQkFDckMscUVBQXFFO29CQUNyRSxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztpQkFDeEM7YUFDRjtTQUNGO0tBQ0Y7SUFFRCxLQUFLLE1BQU0sSUFBSSxJQUFJLFNBQVMsQ0FBQyxPQUFPLEVBQUU7UUFDcEMsSUFBSSxJQUFJLEtBQUssY0FBYyxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDbkQsU0FBUztTQUNWO1FBRUQsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztLQUNuQztBQUNILENBQUM7QUFFRDs7Ozs7SUFLSTtBQUNKLE1BQU0sMEJBQTBCLEdBQUcsbURBQW1ELENBQUM7QUFFdkY7SUFDRSxPQUFPLElBQUEsa0JBQUssRUFBQztRQUNYLEtBQUssRUFBRSxJQUFJLEVBQUUsRUFBRTtZQUNiLHVCQUF1QjtZQUN2QixNQUFNLFNBQVMsR0FBRyxNQUFNLElBQUEsd0JBQVksRUFBQyxJQUFJLENBQUMsQ0FBQztZQUMzQyxLQUFLLE1BQU0sQ0FBQyxFQUFFLE9BQU8sQ0FBQyxJQUFJLFNBQVMsQ0FBQyxRQUFRLEVBQUU7Z0JBQzVDLElBQUksT0FBTyxDQUFDLFVBQVUsQ0FBQyxXQUFXLEtBQUssOEJBQVcsQ0FBQyxXQUFXLEVBQUU7b0JBQzlELFNBQVM7aUJBQ1Y7Z0JBRUQsTUFBTSxlQUFlLEdBQUcsSUFBSSxHQUFHLEVBQXNELENBQUM7Z0JBQ3RGLEtBQUssTUFBTSxDQUFDLEVBQUUsTUFBTSxDQUFDLElBQUksT0FBTyxDQUFDLE9BQU8sRUFBRTtvQkFDeEMsSUFBSSxNQUFNLENBQUMsT0FBTyxLQUFLLDJCQUFRLENBQUMsTUFBTSxFQUFFO3dCQUN0QyxTQUFTO3FCQUNWO29CQUVELE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxFQUFFLE9BQU8sRUFBRSxVQUFVLENBQUM7b0JBRXJFLEtBQUssTUFBTSxDQUFDLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxJQUFJLElBQUEsNEJBQWdCLEVBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxFQUFFO3dCQUMxRCxJQUNFLE9BQU8sSUFBSSxLQUFLLFFBQVE7NEJBQ3hCLE9BQU8sVUFBVSxLQUFLLFFBQVE7NEJBQzlCLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLGlCQUFpQixDQUFDLEVBQy9DOzRCQUNBLGVBQWUsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxDQUFDO3lCQUN2QztxQkFDRjtpQkFDRjtnQkFFRCxzQkFBc0I7Z0JBQ3RCLEtBQUssTUFBTSxDQUFDLElBQUksRUFBRSxVQUFVLENBQUMsSUFBSSxlQUFlLENBQUMsT0FBTyxFQUFFLEVBQUU7b0JBQzFELElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLElBQUksR0FBRyxNQUFNLENBQUMsQ0FBQztvQkFDakMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUscUJBQXFCLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztpQkFDdEQ7YUFDRjtZQUVELDhDQUE4QztZQUM5QyxLQUFLLE1BQU0sSUFBSSxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQ25DLE1BQU0sQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLEdBQUcsSUFBSSxDQUFDO2dCQUM3QixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsVUFBVSxDQUFDLDBCQUEwQixFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUM7YUFDdEY7WUFFRCx1Q0FBdUM7WUFDdkMsSUFBQSwwQ0FBMkIsRUFBQyxJQUFJLEVBQUUsNkJBQTZCLENBQUMsQ0FBQztZQUNqRSxJQUFBLDBDQUEyQixFQUFDLElBQUksRUFBRSxxQkFBcUIsQ0FBQyxDQUFDO1FBQzNELENBQUM7UUFDRCxJQUFBLHVCQUFhLEVBQUMsY0FBYyxFQUFFLGdDQUFjLENBQUMsVUFBVSxDQUFDO0tBQ3pELENBQUMsQ0FBQztBQUNMLENBQUM7QUFoREQsNEJBZ0RDO0FBRUQsU0FBUyxxQkFBcUIsQ0FBQyxVQUFrQjtJQUMvQyxPQUFPOzs7Ozs7Ozs7Ozs7OzRDQWFtQyxVQUFVOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0NBdURyRCxDQUFDO0FBQ0YsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBEaXJFbnRyeSwgUnVsZSwgY2hhaW4gfSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcyc7XG5pbXBvcnQgeyBhZGREZXBlbmRlbmN5IH0gZnJvbSAnLi4vLi4vdXRpbGl0eSc7XG5pbXBvcnQgeyByZW1vdmVQYWNrYWdlSnNvbkRlcGVuZGVuY3kgfSBmcm9tICcuLi8uLi91dGlsaXR5L2RlcGVuZGVuY2llcyc7XG5pbXBvcnQgeyBsYXRlc3RWZXJzaW9ucyB9IGZyb20gJy4uLy4uL3V0aWxpdHkvbGF0ZXN0LXZlcnNpb25zJztcbmltcG9ydCB7IGFsbFRhcmdldE9wdGlvbnMsIGdldFdvcmtzcGFjZSB9IGZyb20gJy4uLy4uL3V0aWxpdHkvd29ya3NwYWNlJztcbmltcG9ydCB7IEJ1aWxkZXJzLCBQcm9qZWN0VHlwZSB9IGZyb20gJy4uLy4uL3V0aWxpdHkvd29ya3NwYWNlLW1vZGVscyc7XG5cbmZ1bmN0aW9uKiB2aXNpdChkaXJlY3Rvcnk6IERpckVudHJ5KTogSXRlcmFibGVJdGVyYXRvcjxbZmlsZU5hbWU6IHN0cmluZywgY29udGVudHM6IHN0cmluZ10+IHtcbiAgZm9yIChjb25zdCBwYXRoIG9mIGRpcmVjdG9yeS5zdWJmaWxlcykge1xuICAgIGlmIChwYXRoLmVuZHNXaXRoKCcudHMnKSAmJiAhcGF0aC5lbmRzV2l0aCgnLmQudHMnKSkge1xuICAgICAgY29uc3QgZW50cnkgPSBkaXJlY3RvcnkuZmlsZShwYXRoKTtcbiAgICAgIGlmIChlbnRyeSkge1xuICAgICAgICBjb25zdCBjb250ZW50ID0gZW50cnkuY29udGVudDtcbiAgICAgICAgaWYgKGNvbnRlbnQuaW5jbHVkZXMoJ0BuZ3VuaXZlcnNhbC8nKSkge1xuICAgICAgICAgIC8vIE9ubHkgbmVlZCB0byByZW5hbWUgdGhlIGltcG9ydCBzbyB3ZSBjYW4ganVzdCBzdHJpbmcgcmVwbGFjZW1lbnRzLlxuICAgICAgICAgIHlpZWxkIFtlbnRyeS5wYXRoLCBjb250ZW50LnRvU3RyaW5nKCldO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZm9yIChjb25zdCBwYXRoIG9mIGRpcmVjdG9yeS5zdWJkaXJzKSB7XG4gICAgaWYgKHBhdGggPT09ICdub2RlX21vZHVsZXMnIHx8IHBhdGguc3RhcnRzV2l0aCgnLicpKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICB5aWVsZCogdmlzaXQoZGlyZWN0b3J5LmRpcihwYXRoKSk7XG4gIH1cbn1cblxuLyoqXG4gKiBSZWdleHAgdG8gbWF0Y2ggVW5pdmVyc2FsIHBhY2thZ2VzLlxuICogQG5ndW5pdmVyc2FsL2NvbW1vbi9lbmdpbmVcbiAqIEBuZ3VuaXZlcnNhbC9jb21tb25cbiAqIEBuZ3VuaXZlcnNhbC9leHByZXNzLWVuZ2luZVxuICoqL1xuY29uc3QgTkdVTklWRVJTQUxfUEFDS0FHRV9SRUdFWFAgPSAvQG5ndW5pdmVyc2FsXFwvKGNvbW1vbihcXC9lbmdpbmUpP3xleHByZXNzLWVuZ2luZSkvZztcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKCk6IFJ1bGUge1xuICByZXR1cm4gY2hhaW4oW1xuICAgIGFzeW5jICh0cmVlKSA9PiB7XG4gICAgICAvLyBSZXBsYWNlIHNlcnZlciBmaWxlLlxuICAgICAgY29uc3Qgd29ya3NwYWNlID0gYXdhaXQgZ2V0V29ya3NwYWNlKHRyZWUpO1xuICAgICAgZm9yIChjb25zdCBbLCBwcm9qZWN0XSBvZiB3b3Jrc3BhY2UucHJvamVjdHMpIHtcbiAgICAgICAgaWYgKHByb2plY3QuZXh0ZW5zaW9ucy5wcm9qZWN0VHlwZSAhPT0gUHJvamVjdFR5cGUuQXBwbGljYXRpb24pIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHNlcnZlck1haW5GaWxlcyA9IG5ldyBNYXA8c3RyaW5nIC8qKiBNYWluIFBhdGggKi8sIHN0cmluZyAvKiogT3V0cHV0IFBhdGggKi8+KCk7XG4gICAgICAgIGZvciAoY29uc3QgWywgdGFyZ2V0XSBvZiBwcm9qZWN0LnRhcmdldHMpIHtcbiAgICAgICAgICBpZiAodGFyZ2V0LmJ1aWxkZXIgIT09IEJ1aWxkZXJzLlNlcnZlcikge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgY29uc3Qgb3V0cHV0UGF0aCA9IHByb2plY3QudGFyZ2V0cy5nZXQoJ2J1aWxkJyk/Lm9wdGlvbnM/Lm91dHB1dFBhdGg7XG5cbiAgICAgICAgICBmb3IgKGNvbnN0IFssIHsgbWFpbiB9XSBvZiBhbGxUYXJnZXRPcHRpb25zKHRhcmdldCwgZmFsc2UpKSB7XG4gICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgIHR5cGVvZiBtYWluID09PSAnc3RyaW5nJyAmJlxuICAgICAgICAgICAgICB0eXBlb2Ygb3V0cHV0UGF0aCA9PT0gJ3N0cmluZycgJiZcbiAgICAgICAgICAgICAgdHJlZS5yZWFkVGV4dChtYWluKS5pbmNsdWRlcygnbmdFeHByZXNzRW5naW5lJylcbiAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICBzZXJ2ZXJNYWluRmlsZXMuc2V0KG1haW4sIG91dHB1dFBhdGgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFJlcGxhY2Ugc2VydmVyIGZpbGVcbiAgICAgICAgZm9yIChjb25zdCBbcGF0aCwgb3V0cHV0UGF0aF0gb2Ygc2VydmVyTWFpbkZpbGVzLmVudHJpZXMoKSkge1xuICAgICAgICAgIHRyZWUucmVuYW1lKHBhdGgsIHBhdGggKyAnLmJhaycpO1xuICAgICAgICAgIHRyZWUuY3JlYXRlKHBhdGgsIGdldFNlcnZlckZpbGVDb250ZW50cyhvdXRwdXRQYXRoKSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gUmVwbGFjZSBhbGwgaW1wb3J0IHNwZWNpZmllcnMgaW4gYWxsIGZpbGVzLlxuICAgICAgZm9yIChjb25zdCBmaWxlIG9mIHZpc2l0KHRyZWUucm9vdCkpIHtcbiAgICAgICAgY29uc3QgW3BhdGgsIGNvbnRlbnRdID0gZmlsZTtcbiAgICAgICAgdHJlZS5vdmVyd3JpdGUocGF0aCwgY29udGVudC5yZXBsYWNlQWxsKE5HVU5JVkVSU0FMX1BBQ0tBR0VfUkVHRVhQLCAnQGFuZ3VsYXIvc3NyJykpO1xuICAgICAgfVxuXG4gICAgICAvLyBSZW1vdmUgdW5pdmVyc2FsIHBhY2thZ2VzIGZyb20gZGVwcy5cbiAgICAgIHJlbW92ZVBhY2thZ2VKc29uRGVwZW5kZW5jeSh0cmVlLCAnQG5ndW5pdmVyc2FsL2V4cHJlc3MtZW5naW5lJyk7XG4gICAgICByZW1vdmVQYWNrYWdlSnNvbkRlcGVuZGVuY3kodHJlZSwgJ0BuZ3VuaXZlcnNhbC9jb21tb24nKTtcbiAgICB9LFxuICAgIGFkZERlcGVuZGVuY3koJ0Bhbmd1bGFyL3NzcicsIGxhdGVzdFZlcnNpb25zLkFuZ3VsYXJTU1IpLFxuICBdKTtcbn1cblxuZnVuY3Rpb24gZ2V0U2VydmVyRmlsZUNvbnRlbnRzKG91dHB1dFBhdGg6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBgXG5pbXBvcnQgJ3pvbmUuanMvbm9kZSc7XG5cbmltcG9ydCB7IEFQUF9CQVNFX0hSRUYgfSBmcm9tICdAYW5ndWxhci9jb21tb24nO1xuaW1wb3J0IHsgQ29tbW9uRW5naW5lIH0gZnJvbSAnQGFuZ3VsYXIvc3NyJztcbmltcG9ydCAqIGFzIGV4cHJlc3MgZnJvbSAnZXhwcmVzcyc7XG5pbXBvcnQgeyBleGlzdHNTeW5jIH0gZnJvbSAnbm9kZTpmcyc7XG5pbXBvcnQgeyBqb2luIH0gZnJvbSAnbm9kZTpwYXRoJztcbmltcG9ydCBib290c3RyYXAgZnJvbSAnLi9zcmMvbWFpbi5zZXJ2ZXInO1xuXG4vLyBUaGUgRXhwcmVzcyBhcHAgaXMgZXhwb3J0ZWQgc28gdGhhdCBpdCBjYW4gYmUgdXNlZCBieSBzZXJ2ZXJsZXNzIEZ1bmN0aW9ucy5cbmV4cG9ydCBmdW5jdGlvbiBhcHAoKTogZXhwcmVzcy5FeHByZXNzIHtcbiAgY29uc3Qgc2VydmVyID0gZXhwcmVzcygpO1xuICBjb25zdCBkaXN0Rm9sZGVyID0gam9pbihwcm9jZXNzLmN3ZCgpLCAnJHtvdXRwdXRQYXRofScpO1xuICBjb25zdCBpbmRleEh0bWwgPSBleGlzdHNTeW5jKGpvaW4oZGlzdEZvbGRlciwgJ2luZGV4Lm9yaWdpbmFsLmh0bWwnKSlcbiAgICA/IGpvaW4oZGlzdEZvbGRlciwgJ2luZGV4Lm9yaWdpbmFsLmh0bWwnKVxuICAgIDogam9pbihkaXN0Rm9sZGVyLCAnaW5kZXguaHRtbCcpO1xuXG4gIGNvbnN0IGNvbW1vbkVuZ2luZSA9IG5ldyBDb21tb25FbmdpbmUoKTtcblxuICBzZXJ2ZXIuc2V0KCd2aWV3IGVuZ2luZScsICdodG1sJyk7XG4gIHNlcnZlci5zZXQoJ3ZpZXdzJywgZGlzdEZvbGRlcik7XG5cbiAgLy8gRXhhbXBsZSBFeHByZXNzIFJlc3QgQVBJIGVuZHBvaW50c1xuICAvLyBzZXJ2ZXIuZ2V0KCcvYXBpLyoqJywgKHJlcSwgcmVzKSA9PiB7IH0pO1xuICAvLyBTZXJ2ZSBzdGF0aWMgZmlsZXMgZnJvbSAvYnJvd3NlclxuICBzZXJ2ZXIuZ2V0KCcqLionLCBleHByZXNzLnN0YXRpYyhkaXN0Rm9sZGVyLCB7XG4gICAgbWF4QWdlOiAnMXknXG4gIH0pKTtcblxuICAvLyBBbGwgcmVndWxhciByb3V0ZXMgdXNlIHRoZSBBbmd1bGFyIGVuZ2luZVxuICBzZXJ2ZXIuZ2V0KCcqJywgKHJlcSwgcmVzLCBuZXh0KSA9PiB7XG4gICAgY29tbW9uRW5naW5lXG4gICAgICAucmVuZGVyKHtcbiAgICAgICAgYm9vdHN0cmFwLFxuICAgICAgICBkb2N1bWVudEZpbGVQYXRoOiBpbmRleEh0bWwsXG4gICAgICAgIHVybDogcmVxLm9yaWdpbmFsVXJsLFxuICAgICAgICBwdWJsaWNQYXRoOiBkaXN0Rm9sZGVyLFxuICAgICAgICBwcm92aWRlcnM6IFt7IHByb3ZpZGU6IEFQUF9CQVNFX0hSRUYsIHVzZVZhbHVlOiByZXEuYmFzZVVybCB9XSxcbiAgICAgIH0pXG4gICAgICAudGhlbigoaHRtbCkgPT4gcmVzLnNlbmQoaHRtbCkpXG4gICAgICAuY2F0Y2goKGVycikgPT4gbmV4dChlcnIpKTtcbiAgfSk7XG5cbiAgcmV0dXJuIHNlcnZlcjtcbn1cblxuZnVuY3Rpb24gcnVuKCk6IHZvaWQge1xuICBjb25zdCBwb3J0ID0gcHJvY2Vzcy5lbnZbJ1BPUlQnXSB8fCA0MDAwO1xuXG4gIC8vIFN0YXJ0IHVwIHRoZSBOb2RlIHNlcnZlclxuICBjb25zdCBzZXJ2ZXIgPSBhcHAoKTtcbiAgc2VydmVyLmxpc3Rlbihwb3J0LCAoKSA9PiB7XG4gICAgY29uc29sZS5sb2coXFxgTm9kZSBFeHByZXNzIHNlcnZlciBsaXN0ZW5pbmcgb24gaHR0cDovL2xvY2FsaG9zdDpcXCR7cG9ydH1cXGApO1xuICB9KTtcbn1cblxuLy8gV2VicGFjayB3aWxsIHJlcGxhY2UgJ3JlcXVpcmUnIHdpdGggJ19fd2VicGFja19yZXF1aXJlX18nXG4vLyAnX19ub25fd2VicGFja19yZXF1aXJlX18nIGlzIGEgcHJveHkgdG8gTm9kZSAncmVxdWlyZSdcbi8vIFRoZSBiZWxvdyBjb2RlIGlzIHRvIGVuc3VyZSB0aGF0IHRoZSBzZXJ2ZXIgaXMgcnVuIG9ubHkgd2hlbiBub3QgcmVxdWlyaW5nIHRoZSBidW5kbGUuXG5kZWNsYXJlIGNvbnN0IF9fbm9uX3dlYnBhY2tfcmVxdWlyZV9fOiBOb2RlUmVxdWlyZTtcbmNvbnN0IG1haW5Nb2R1bGUgPSBfX25vbl93ZWJwYWNrX3JlcXVpcmVfXy5tYWluO1xuY29uc3QgbW9kdWxlRmlsZW5hbWUgPSBtYWluTW9kdWxlICYmIG1haW5Nb2R1bGUuZmlsZW5hbWUgfHwgJyc7XG5pZiAobW9kdWxlRmlsZW5hbWUgPT09IF9fZmlsZW5hbWUgfHwgbW9kdWxlRmlsZW5hbWUuaW5jbHVkZXMoJ2lpc25vZGUnKSkge1xuICBydW4oKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgYm9vdHN0cmFwO1xuYDtcbn1cbiJdfQ==