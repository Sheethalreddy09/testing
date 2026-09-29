export const PLATFORM_TOKEN_KEY = 'clyptus_platform_access_token';

export const getPlatformAccessToken = () => sessionStorage.getItem(PLATFORM_TOKEN_KEY);
export const setPlatformAccessToken = (token: string) => sessionStorage.setItem(PLATFORM_TOKEN_KEY, token);
export const clearPlatformAccessToken = () => sessionStorage.removeItem(PLATFORM_TOKEN_KEY);
