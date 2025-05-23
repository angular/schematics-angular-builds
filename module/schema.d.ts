/**
 * Creates a new, generic NgModule definition in the given project.
 */
export type Schema = {
    /**
     * The new NgModule imports "CommonModule".
     */
    commonModule?: boolean;
    /**
     * Create the new files at the top level of the current project root.
     */
    flat?: boolean;
    /**
     * The declaring NgModule.
     */
    module?: string;
    /**
     * The name of the NgModule.
     */
    name: string;
    /**
     * The path at which to create the NgModule, relative to the workspace root.
     */
    path?: string;
    /**
     * The name of the project.
     */
    project: string;
    /**
     * The route path for a lazy-loaded module. When supplied, creates a component in the new
     * module, and adds the route to that component in the `Routes` array declared in the module
     * provided in the `--module` option.
     */
    route?: string;
    /**
     * Create a routing module.
     */
    routing?: boolean;
    /**
     * The scope for the new routing module.
     */
    routingScope?: RoutingScope;
    /**
     * The separator character to use before the type within the generated file's name. For
     * example, if you set the option to `.`, the file will be named `example.module.ts`.
     */
    typeSeparator?: TypeSeparator;
};
/**
 * The scope for the new routing module.
 */
export declare enum RoutingScope {
    Child = "Child",
    Root = "Root"
}
/**
 * The separator character to use before the type within the generated file's name. For
 * example, if you set the option to `.`, the file will be named `example.module.ts`.
 */
export declare enum TypeSeparator {
    Empty = "-",
    TypeSeparator = "."
}
