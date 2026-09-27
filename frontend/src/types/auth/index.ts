export interface UserData {
    user_id: number;
    username: string;
    name : string;
    email : string;
}
export interface SignInResponse {
    message: string;
    user : UserData & {
        access_token : string;
    }
}
export interface SignUpResponse {
    message: string;
    user: UserData;
}
export interface AuthState {
    signIn : SignInResponse | null;
    signUp : SignUpResponse | null;
    access_token : string | null;
    isLoadingSignIn?: boolean;
    isLoadingSignUp?: boolean;
    isLoadingSignOut?: boolean;
    errorSignIn?: string | null;
    errorSignUp?: string | null;
    errorSignOut?: string | null;

}
export interface SignInRequest {
    email: string;
    password: string;
}
export interface SignUpRequest {
    email: string;
    password: string;
    username : string;
    name : string;
    inviteToken?: string;
}
