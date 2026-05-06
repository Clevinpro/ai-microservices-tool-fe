import type { IAuthResponse, ILoginDto, IRegisterDto, IUser } from '../types/auth.types';
export declare function login(dto: ILoginDto): Promise<IAuthResponse>;
export declare function register(dto: IRegisterDto): Promise<IAuthResponse>;
export declare function logout(): Promise<void>;
export declare function refresh(): Promise<void>;
export declare function getMe(): Promise<IUser>;
