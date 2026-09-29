import { apiClient } from "./api";
import { UserRole } from "../types/platform.types";

export type PlatformLoginRole = "PLATFORM_SUPER_ADMIN" | "PLATFORM_ADMIN";

export interface AuthUser {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  permissions: string[];
}

export interface PlatformLoginResponse {
  accessToken: string;
  expiresAt: string;
  user: AuthUser;
}

const unwrap = <T>(response: any): T => response?.data ?? response;

export const AuthService = {
  async acceptOrganisationInvitation(payload: {
    token: string;
    firstName: string;
    lastName: string;
    password: string;
  }) {
    return apiClient.post("/auth/organisation-invitations/accept", payload);
  },
  async login(
    email: string,
    password: string,
    expectedRole?: PlatformLoginRole,
    rememberMe = false,
  ): Promise<PlatformLoginResponse> {
    const response: any = await apiClient.post("/auth/platform/login", {
      email,
      password,
      rememberMe,
      ...(expectedRole ? { expectedRole } : {}),
    });
    return unwrap<PlatformLoginResponse>(response);
  },

  async me(): Promise<AuthUser> {
    const response: any = await apiClient.get("/auth/me");
    return unwrap<AuthUser>(response);
  },

  async logout(): Promise<void> {
    await apiClient.post("/auth/logout");
  },
};
