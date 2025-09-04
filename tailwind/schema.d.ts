export type Schema = {
    /**
     * The name of the project.
     */
    project: string;
    /**
     * Skip the automatic installation of packages. You will need to manually install the
     * dependencies later.
     */
    skipInstall?: boolean;
    [property: string]: any;
};
