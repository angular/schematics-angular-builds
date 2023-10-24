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
    const { protocol, originalUrl, baseUrl, headers } = req;

    commonEngine
      .render({
        bootstrap,
        documentFilePath: indexHtml,
        url: \`\${protocol}://\${headers.host}\${originalUrl}\`,
        publicPath: distFolder,
        providers: [{ provide: APP_BASE_HREF, useValue: baseUrl }],
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbGFjZS1uZ3VuaXZlcnNhbC1lbmdpbmVzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvc2NoZW1hdGljcy9hbmd1bGFyL21pZ3JhdGlvbnMvdXBkYXRlLTE3L3JlcGxhY2Utbmd1bml2ZXJzYWwtZW5naW5lcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOztBQUVILDJEQUFtRTtBQUNuRSwyQ0FBOEM7QUFDOUMsNkRBQW1HO0FBQ25HLG1FQUErRDtBQUMvRCx1REFBeUU7QUFDekUscUVBQXVFO0FBRXZFLFFBQVEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxTQUFtQjtJQUNqQyxLQUFLLE1BQU0sSUFBSSxJQUFJLFNBQVMsQ0FBQyxRQUFRLEVBQUU7UUFDckMsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRTtZQUNuRCxNQUFNLEtBQUssR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ25DLElBQUksS0FBSyxFQUFFO2dCQUNULE1BQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUM7Z0JBQzlCLElBQUksT0FBTyxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsRUFBRTtvQkFDckMscUVBQXFFO29CQUNyRSxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztpQkFDeEM7YUFDRjtTQUNGO0tBQ0Y7SUFFRCxLQUFLLE1BQU0sSUFBSSxJQUFJLFNBQVMsQ0FBQyxPQUFPLEVBQUU7UUFDcEMsSUFBSSxJQUFJLEtBQUssY0FBYyxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDbkQsU0FBUztTQUNWO1FBRUQsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDLFNB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VSxDQUFDO1NBQ3pELENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQztBQUNKLENBQUM7QUF4REQsNEJBd0RDO0FBRUQsU0FBUyxxQkFBcUIsQ0FBQyxVQUFrQjtJQUMvQyxPQUFPOzs7Ozs7Ozs7Ozs7OzRDQWFtQyxVQUFVOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Q0F5RHJELENBQUM7QUFDRixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IERpckVudHJ5LCBSdWxlLCBjaGFpbiB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzJztcbmltcG9ydCB7IGFkZERlcGVuZGVuY3kgfSBmcm9tICcuLi8uLi91dGlsaXR5JztcbmltcG9ydCB7IGdldFBhY2thZ2VKc29uRGVwZW5kZW5jeSwgcmVtb3ZlUGFja2FnZUpzb25EZXBlbmRlbmN5IH0gZnJvbSAnLi4vLi4vdXRpbGl0eS9kZXBlbmRlbmNpZXMnO1xuaW1wb3J0IHsgbGF0ZXN0VmVyc2lvbnMgfSBmcm9tICcuLi8uLi91dGlsaXR5L2xhdGVzdC12ZXJzaW9ucyc7XG5pbXBvcnQgeyBhbGxUYXJnZXRPcHRpb25zLCBnZXRXb3Jrc3BhY2UgfSBmcm9tICcuLi8uLi91dGlsaXR5L3dvcmtzcGFjZSc7XG5pbXBvcnQgeyBCdWlsZGVycywgUHJvamVjdFR5cGUgfSBmcm9tICcuLi8uLi91dGlsaXR5L3dvcmtzcGFjZS1tb2RlbHMnO1xuXG5mdW5jdGlvbiogdmlzaXQoZGlyZWN0b3J5OiBEaXJFbnRyeSk6IEl0ZXJhYmxlSXRlcmF0b3I8W2ZpbGVOYW1lOiBzdHJpbmcsIGNvbnRlbnRzOiBzdHJpbmddPiB7XG4gIGZvciAoY29uc3QgcGF0aCBvZiBkaXJlY3Rvcnkuc3ViZmlsZXMpIHtcbiAgICBpZiAocGF0aC5lbmRzV2l0aCgnLnRzJykgJiYgIXBhdGguZW5kc1dpdGgoJy5kLnRzJykpIHtcbiAgICAgIGNvbnN0IGVudHJ5ID0gZGlyZWN0b3J5LmZpbGUocGF0aCk7XG4gICAgICBpZiAoZW50cnkpIHtcbiAgICAgICAgY29uc3QgY29udGVudCA9IGVudHJ5LmNvbnRlbnQ7XG4gICAgICAgIGlmIChjb250ZW50LmluY2x1ZGVzKCdAbmd1bml2ZXJzYWwvJykpIHtcbiAgICAgICAgICAvLyBPbmx5IG5lZWQgdG8gcmVuYW1lIHRoZSBpbXBvcnQgc28gd2UgY2FuIGp1c3Qgc3RyaW5nIHJlcGxhY2VtZW50cy5cbiAgICAgICAgICB5aWVsZCBbZW50cnkucGF0aCwgY29udGVudC50b1N0cmluZygpXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZvciAoY29uc3QgcGF0aCBvZiBkaXJlY3Rvcnkuc3ViZGlycykge1xuICAgIGlmIChwYXRoID09PSAnbm9kZV9tb2R1bGVzJyB8fCBwYXRoLnN0YXJ0c1dpdGgoJy4nKSkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgeWllbGQqIHZpc2l0KGRpcmVjdG9yeS5kaXIocGF0aCkpO1xuICB9XG59XG5cbmNvbnN0IFVOSVZFUlNBTF9QQUNLQUdFUyA9IFsnQG5ndW5pdmVyc2FsL2NvbW1vbicsICdAbmd1bml2ZXJzYWwvZXhwcmVzcy1lbmdpbmUnXTtcblxuLyoqXG4gKiBSZWdleHAgdG8gbWF0Y2ggVW5pdmVyc2FsIHBhY2thZ2VzLlxuICogQG5ndW5pdmVyc2FsL2NvbW1vbi9lbmdpbmVcbiAqIEBuZ3VuaXZlcnNhbC9jb21tb25cbiAqIEBuZ3VuaXZlcnNhbC9leHByZXNzLWVuZ2luZVxuICoqL1xuY29uc3QgTkdVTklWRVJTQUxfUEFDS0FHRV9SRUdFWFAgPSAvQG5ndW5pdmVyc2FsXFwvKGNvbW1vbihcXC9lbmdpbmUpP3xleHByZXNzLWVuZ2luZSkvZztcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKCk6IFJ1bGUge1xuICByZXR1cm4gYXN5bmMgKHRyZWUpID0+IHtcbiAgICBjb25zdCBoYXNVbml2ZXJzYWxEZXBzID0gVU5JVkVSU0FMX1BBQ0tBR0VTLnNvbWUoKGQpID0+IGdldFBhY2thZ2VKc29uRGVwZW5kZW5jeSh0cmVlLCBkKSk7XG4gICAgaWYgKCFoYXNVbml2ZXJzYWxEZXBzKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgcmV0dXJuIGNoYWluKFtcbiAgICAgIGFzeW5jICh0cmVlKSA9PiB7XG4gICAgICAgIC8vIFJlcGxhY2Ugc2VydmVyIGZpbGUuXG4gICAgICAgIGNvbnN0IHdvcmtzcGFjZSA9IGF3YWl0IGdldFdvcmtzcGFjZSh0cmVlKTtcbiAgICAgICAgZm9yIChjb25zdCBbLCBwcm9qZWN0XSBvZiB3b3Jrc3BhY2UucHJvamVjdHMpIHtcbiAgICAgICAgICBpZiAocHJvamVjdC5leHRlbnNpb25zLnByb2plY3RUeXBlICE9PSBQcm9qZWN0VHlwZS5BcHBsaWNhdGlvbikge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgY29uc3Qgc2VydmVyTWFpbkZpbGVzID0gbmV3IE1hcDxzdHJpbmcgLyoqIE1haW4gUGF0aCAqLywgc3RyaW5nIC8qKiBPdXRwdXQgUGF0aCAqLz4oKTtcbiAgICAgICAgICBmb3IgKGNvbnN0IFssIHRhcmdldF0gb2YgcHJvamVjdC50YXJnZXRzKSB7XG4gICAgICAgICAgICBpZiAodGFyZ2V0LmJ1aWxkZXIgIT09IEJ1aWxkZXJzLlNlcnZlcikge1xuICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3Qgb3V0cHV0UGF0aCA9IHByb2plY3QudGFyZ2V0cy5nZXQoJ2J1aWxkJyk/Lm9wdGlvbnM/Lm91dHB1dFBhdGg7XG5cbiAgICAgICAgICAgIGZvciAoY29uc3QgWywgeyBtYWluIH1dIG9mIGFsbFRhcmdldE9wdGlvbnModGFyZ2V0LCBmYWxzZSkpIHtcbiAgICAgICAgICAgICAgaWYgKFxuICAgICAgICAgICAgICAgIHR5cGVvZiBtYWluID09PSAnc3RyaW5nJyAmJlxuICAgICAgICAgICAgICAgIHR5cGVvZiBvdXRwdXRQYXRoID09PSAnc3RyaW5nJyAmJlxuICAgICAgICAgICAgICAgIHRyZWUucmVhZFRleHQobWFpbikuaW5jbHVkZXMoJ25nRXhwcmVzc0VuZ2luZScpXG4gICAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICAgIHNlcnZlck1haW5GaWxlcy5zZXQobWFpbiwgb3V0cHV0UGF0aCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBSZXBsYWNlIHNlcnZlciBmaWxlXG4gICAgICAgICAgZm9yIChjb25zdCBbcGF0aCwgb3V0cHV0UGF0aF0gb2Ygc2VydmVyTWFpbkZpbGVzLmVudHJpZXMoKSkge1xuICAgICAgICAgICAgdHJlZS5yZW5hbWUocGF0aCwgcGF0aCArICcuYmFrJyk7XG4gICAgICAgICAgICB0cmVlLmNyZWF0ZShwYXRoLCBnZXRTZXJ2ZXJGaWxlQ29udGVudHMob3V0cHV0UGF0aCkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFJlcGxhY2UgYWxsIGltcG9ydCBzcGVjaWZpZXJzIGluIGFsbCBmaWxlcy5cbiAgICAgICAgZm9yIChjb25zdCBmaWxlIG9mIHZpc2l0KHRyZWUucm9vdCkpIHtcbiAgICAgICAgICBjb25zdCBbcGF0aCwgY29udGVudF0gPSBmaWxlO1xuICAgICAgICAgIHRyZWUub3ZlcndyaXRlKHBhdGgsIGNvbnRlbnQucmVwbGFjZUFsbChOR1VOSVZFUlNBTF9QQUNLQUdFX1JFR0VYUCwgJ0Bhbmd1bGFyL3NzcicpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFJlbW92ZSB1bml2ZXJzYWwgcGFja2FnZXMgZnJvbSBkZXBzLlxuICAgICAgICBmb3IgKGNvbnN0IG5hbWUgb2YgVU5JVkVSU0FMX1BBQ0tBR0VTKSB7XG4gICAgICAgICAgcmVtb3ZlUGFja2FnZUpzb25EZXBlbmRlbmN5KHRyZWUsIG5hbWUpO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgYWRkRGVwZW5kZW5jeSgnQGFuZ3VsYXIvc3NyJywgbGF0ZXN0VmVyc2lvbnMuQW5ndWxhclNTUiksXG4gICAgXSk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGdldFNlcnZlckZpbGVDb250ZW50cyhvdXRwdXRQYXRoOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gYFxuaW1wb3J0ICd6b25lLmpzL25vZGUnO1xuXG5pbXBvcnQgeyBBUFBfQkFTRV9IUkVGIH0gZnJvbSAnQGFuZ3VsYXIvY29tbW9uJztcbmltcG9ydCB7IENvbW1vbkVuZ2luZSB9IGZyb20gJ0Bhbmd1bGFyL3Nzcic7XG5pbXBvcnQgKiBhcyBleHByZXNzIGZyb20gJ2V4cHJlc3MnO1xuaW1wb3J0IHsgZXhpc3RzU3luYyB9IGZyb20gJ25vZGU6ZnMnO1xuaW1wb3J0IHsgam9pbiB9IGZyb20gJ25vZGU6cGF0aCc7XG5pbXBvcnQgYm9vdHN0cmFwIGZyb20gJy4vc3JjL21haW4uc2VydmVyJztcblxuLy8gVGhlIEV4cHJlc3MgYXBwIGlzIGV4cG9ydGVkIHNvIHRoYXQgaXQgY2FuIGJlIHVzZWQgYnkgc2VydmVybGVzcyBGdW5jdGlvbnMuXG5leHBvcnQgZnVuY3Rpb24gYXBwKCk6IGV4cHJlc3MuRXhwcmVzcyB7XG4gIGNvbnN0IHNlcnZlciA9IGV4cHJlc3MoKTtcbiAgY29uc3QgZGlzdEZvbGRlciA9IGpvaW4ocHJvY2Vzcy5jd2QoKSwgJyR7b3V0cHV0UGF0aH0nKTtcbiAgY29uc3QgaW5kZXhIdG1sID0gZXhpc3RzU3luYyhqb2luKGRpc3RGb2xkZXIsICdpbmRleC5vcmlnaW5hbC5odG1sJykpXG4gICAgPyBqb2luKGRpc3RGb2xkZXIsICdpbmRleC5vcmlnaW5hbC5odG1sJylcbiAgICA6IGpvaW4oZGlzdEZvbGRlciwgJ2luZGV4Lmh0bWwnKTtcblxuICBjb25zdCBjb21tb25FbmdpbmUgPSBuZXcgQ29tbW9uRW5naW5lKCk7XG5cbiAgc2VydmVyLnNldCgndmlldyBlbmdpbmUnLCAnaHRtbCcpO1xuICBzZXJ2ZXIuc2V0KCd2aWV3cycsIGRpc3RGb2xkZXIpO1xuXG4gIC8vIEV4YW1wbGUgRXhwcmVzcyBSZXN0IEFQSSBlbmRwb2ludHNcbiAgLy8gc2VydmVyLmdldCgnL2FwaS8qKicsIChyZXEsIHJlcykgPT4geyB9KTtcbiAgLy8gU2VydmUgc3RhdGljIGZpbGVzIGZyb20gL2Jyb3dzZXJcbiAgc2VydmVyLmdldCgnKi4qJywgZXhwcmVzcy5zdGF0aWMoZGlzdEZvbGRlciwge1xuICAgIG1heEFnZTogJzF5J1xuICB9KSk7XG5cbiAgLy8gQWxsIHJlZ3VsYXIgcm91dGVzIHVzZSB0aGUgQW5ndWxhciBlbmdpbmVcbiAgc2VydmVyLmdldCgnKicsIChyZXEsIHJlcywgbmV4dCkgPT4ge1xuICAgIGNvbnN0IHsgcHJvdG9jb2wsIG9yaWdpbmFsVXJsLCBiYXNlVXJsLCBoZWFkZXJzIH0gPSByZXE7XG5cbiAgICBjb21tb25FbmdpbmVcbiAgICAgIC5yZW5kZXIoe1xuICAgICAgICBib290c3RyYXAsXG4gICAgICAgIGRvY3VtZW50RmlsZVBhdGg6IGluZGV4SHRtbCxcbiAgICAgICAgdXJsOiBcXGBcXCR7cHJvdG9jb2x9Oi8vXFwke2hlYWRlcnMuaG9zdH1cXCR7b3JpZ2luYWxVcmx9XFxgLFxuICAgICAgICBwdWJsaWNQYXRoOiBkaXN0Rm9sZGVyLFxuICAgICAgICBwcm92aWRlcnM6IFt7IHByb3ZpZGU6IEFQUF9CQVNFX0hSRUYsIHVzZVZhbHVlOiBiYXNlVXJsIH1dLFxuICAgICAgfSlcbiAgICAgIC50aGVuKChodG1sKSA9PiByZXMuc2VuZChodG1sKSlcbiAgICAgIC5jYXRjaCgoZXJyKSA9PiBuZXh0KGVycikpO1xuICB9KTtcblxuICByZXR1cm4gc2VydmVyO1xufVxuXG5mdW5jdGlvbiBydW4oKTogdm9pZCB7XG4gIGNvbnN0IHBvcnQgPSBwcm9jZXNzLmVudlsnUE9SVCddIHx8IDQwMDA7XG5cbiAgLy8gU3RhcnQgdXAgdGhlIE5vZGUgc2VydmVyXG4gIGNvbnN0IHNlcnZlciA9IGFwcCgpO1xuICBzZXJ2ZXIubGlzdGVuKHBvcnQsICgpID0+IHtcbiAgICBjb25zb2xlLmxvZyhcXGBOb2RlIEV4cHJlc3Mgc2VydmVyIGxpc3RlbmluZyBvbiBodHRwOi8vbG9jYWxob3N0OlxcJHtwb3J0fVxcYCk7XG4gIH0pO1xufVxuXG4vLyBXZWJwYWNrIHdpbGwgcmVwbGFjZSAncmVxdWlyZScgd2l0aCAnX193ZWJwYWNrX3JlcXVpcmVfXydcbi8vICdfX25vbl93ZWJwYWNrX3JlcXVpcmVfXycgaXMgYSBwcm94eSB0byBOb2RlICdyZXF1aXJlJ1xuLy8gVGhlIGJlbG93IGNvZGUgaXMgdG8gZW5zdXJlIHRoYXQgdGhlIHNlcnZlciBpcyBydW4gb25seSB3aGVuIG5vdCByZXF1aXJpbmcgdGhlIGJ1bmRsZS5cbmRlY2xhcmUgY29uc3QgX19ub25fd2VicGFja19yZXF1aXJlX186IE5vZGVSZXF1aXJlO1xuY29uc3QgbWFpbk1vZHVsZSA9IF9fbm9uX3dlYnBhY2tfcmVxdWlyZV9fLm1haW47XG5jb25zdCBtb2R1bGVGaWxlbmFtZSA9IG1haW5Nb2R1bGUgJiYgbWFpbk1vZHVsZS5maWxlbmFtZSB8fCAnJztcbmlmIChtb2R1bGVGaWxlbmFtZSA9PT0gX19maWxlbmFtZSB8fCBtb2R1bGVGaWxlbmFtZS5pbmNsdWRlcygnaWlzbm9kZScpKSB7XG4gIHJ1bigpO1xufVxuXG5leHBvcnQgZGVmYXVsdCBib290c3RyYXA7XG5gO1xufVxuIl19