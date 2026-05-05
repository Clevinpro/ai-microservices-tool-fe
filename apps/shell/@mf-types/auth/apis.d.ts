export type RemoteKeys = 'auth/Module';
type PackageType<T> = T extends 'auth/Module' ? typeof import('auth/Module') : any;
