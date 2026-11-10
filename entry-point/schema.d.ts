/**
 * Creates a new secondary entry point in an Angular library project.
 */
export type Schema = {
    /**
     * The file name at which to create the secondary entry point's public API file, without the
     * `.ts` extension.
     */
    entryFile?: string;
    /**
     * The name of the secondary entry point (for example, 'testing' or 'feature/sub').
     */
    name: string;
    /**
     * A prefix to apply to generated selectors.
     */
    prefix?: string;
    /**
     * The name of the library project where the secondary entry point should be added. If not
     * specified, the CLI will determine the project from the current directory.
     */
    project: string;
    /**
     * Do not create `spec.ts` test files for the new secondary entry point.
     */
    skipTests?: boolean;
    /**
     * Do not update `tsconfig.json` to add a path mapping for the new secondary entry point.
     */
    skipTsConfig?: boolean;
    /**
     * Creates a secondary entry point based upon the standalone API, without NgModules.
     */
    standalone?: boolean;
};
