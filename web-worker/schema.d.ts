/**
 * Pass this schematic to the "run" command to create a Web Worker
 */
export interface Schema {
    /**
     * The name of the worker.
     */
    name: string;
    /**
     * The path at which to create the worker file, relative to the current workspace.
     */
    path?: string;
    /**
     * The name of the project.
     */
    project: string;
    /**
     * Add a worker creation snippet in a sibling file of the same name.
     */
    snippet?: boolean;
    /**
     * The target to apply service worker to.
     */
    target?: string;
}
