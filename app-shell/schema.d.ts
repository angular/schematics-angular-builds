/**
 * Generates an application shell for running a server-side version of an app.
 */
export interface Schema {
    /**
     * The name of the related client app.
     */
    project: string;
    /**
     * Creates a server application using the Server Routing API (Developer Preview).
     */
    serverRouting?: boolean;
}
