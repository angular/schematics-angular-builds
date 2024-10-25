export interface Schema {
    /**
     * The name of the project.
     */
    project: string;
    /**
     * Creates a server application using the Server Routing and App Engine APIs (Developer
     * Preview).
     */
    serverRouting?: boolean;
    /**
     * Skip installing dependency packages.
     */
    skipInstall?: boolean;
}
