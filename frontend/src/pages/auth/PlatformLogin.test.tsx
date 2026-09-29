import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppRoutes } from "../../routes";
import { useAuthStore } from "../../store/auth.store";
import { AuthService } from "../../services/auth.service";
vi.mock("../../services/auth.service", () => ({
  AuthService: { login: vi.fn(), me: vi.fn(), logout: vi.fn() },
}));
const mount = (path = "/") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );
afterEach(() => {
  cleanup();
  sessionStorage.clear();
  localStorage.clear();
  useAuthStore.setState({
    user: null,
    isHydrating: false,
    isAuthenticating: false,
    authError: null,
  });
  vi.clearAllMocks();
});
describe("Shared landing and separate login pages", () => {
  it("shows two login links and no credential form on the landing page", () => {
    mount();
    expect(
      screen.getByRole("link", { name: "Admin Login" }).getAttribute("href"),
    ).toBe("/platform/login/admin");
    expect(
      screen
        .getByRole("link", { name: "Super Admin Login" })
        .getAttribute("href"),
    ).toBe("/platform/login/super-admin");
    expect(screen.queryByLabelText("Password")).toBeNull();
    expect(
      screen.getByRole("heading", { name: "Clyptus Platform Portal" }),
    ).toBeTruthy();
  });
  it("navigates between pages through the shared landing without retaining passwords", () => {
    mount();
    fireEvent.click(screen.getByRole("link", { name: "Admin Login" }));
    expect(screen.getAllByRole("form")).toHaveLength(1);
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "StrongPassword!123" },
    });
    fireEvent.click(
      screen.getByRole("link", { name: "Back to portal selection" }),
    );
    expect(screen.queryByRole("form")).toBeNull();
    fireEvent.click(screen.getByRole("link", { name: "Super Admin Login" }));
    expect(
      screen.getByRole("form", { name: "Super Admin Login" }),
    ).toBeTruthy();
    expect((screen.getByLabelText("Password") as HTMLInputElement).value).toBe(
      "",
    );
    expect(screen.queryByRole("form", { name: "Admin Login" })).toBeNull();
  });
  it.each([
    ["Admin", "PLATFORM_ADMIN", "admin"],
    ["Super Admin", "PLATFORM_SUPER_ADMIN", "super-admin"],
  ] as const)(
    "opens the %s direct URL and submits its role",
    async (title, role, path) => {
      vi.mocked(AuthService.login).mockRejectedValue(
        new Error("This account does not match the selected login section."),
      );
      mount(`/platform/login/${path}`);
      expect(screen.getByRole("form", { name: `${title} Login` })).toBeTruthy();
      expect(screen.getAllByRole("form")).toHaveLength(1);
      fireEvent.change(screen.getByLabelText("Email address"), {
        target: { value: "person@example.test" },
      });
      fireEvent.change(screen.getByLabelText("Password"), {
        target: { value: "StrongPassword!123" },
      });
      fireEvent.click(screen.getByRole("button"));
      await waitFor(() =>
        expect(AuthService.login).toHaveBeenCalledWith(
          "person@example.test",
          "StrongPassword!123",
          role,
          false,
        ),
      );
      expect(await screen.findByRole("alert")).toBeTruthy();
      expect(useAuthStore.getState().user).toBeNull();
      fireEvent.click(
        screen.getByRole("link", { name: "Back to portal selection" }),
      );
      expect(screen.queryByRole("alert")).toBeNull();
    },
  );
});

it("submits Remember me only when selected", async () => {
  vi.mocked(AuthService.login).mockRejectedValue(
    new Error("Invalid credentials"),
  );
  mount("/platform/login/admin");
  fireEvent.change(screen.getByLabelText("Email address"), {
    target: { value: "person@example.test" },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "StrongPassword!123" },
  });
  fireEvent.click(screen.getByLabelText("Remember me"));
  fireEvent.click(screen.getByRole("button"));
  await waitFor(() =>
    expect(AuthService.login).toHaveBeenCalledWith(
      "person@example.test",
      "StrongPassword!123",
      "PLATFORM_ADMIN",
      true,
    ),
  );
});
it("restores a remembered session after tab storage is cleared and logs it out", async () => {
  const user: any = {
    userId: "admin",
    email: "person@example.test",
    role: "PLATFORM_ADMIN",
    permissions: [],
  };
  vi.mocked(AuthService.login).mockResolvedValue({
    user,
    accessToken: "test-token",
    expiresAt: "2099-01-01",
  });
  vi.mocked(AuthService.me).mockResolvedValue(user);
  await useAuthStore
    .getState()
    .login(user.email, "StrongPassword!123", "PLATFORM_ADMIN", true);
  expect(localStorage.getItem("clyptus_remember_session")).toBe("true");
  expect(JSON.stringify(localStorage)).not.toContain("StrongPassword");
  expect(JSON.stringify(localStorage)).not.toContain("test-token");
  sessionStorage.clear();
  useAuthStore.setState({ user: null });
  await useAuthStore.getState().restoreSession();
  expect(useAuthStore.getState().user).toEqual(user);
  await useAuthStore.getState().logout();
  expect(AuthService.logout).toHaveBeenCalled();
  expect(localStorage.getItem("clyptus_remember_session")).toBeNull();
});
