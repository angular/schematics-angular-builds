/**
 * Refactors a Jasmine test file to use Vitest.
 */
export type Schema = {
    /**
     * The file suffix to identify test files (e.g., '.spec.ts', '.test.ts').
     */
    fileSuffix?: string;
    /**
     * The name of the project where the tests should be refactored. If not specified, the CLI
     * will determine the project from the current directory.
     */
    project?: string;
    /**
     * Enable verbose logging to see detailed information about the transformations being
     * applied.
     */
    verbose?: boolean;
    [property: string]: any;
};
