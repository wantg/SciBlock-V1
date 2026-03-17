import React from "react";
import { Link } from "wouter";
import { useLogin } from "@/hooks/useLogin";
import { InputField } from "./InputField";
import { CheckboxField } from "./CheckboxField";
import { AuthButton } from "./AuthButton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Dev mode quick login accounts
const DEV_ACCOUNTS = [
  { label: "手动输入", value: "__manual__", email: "", password: "" },
  { label: "Dev Instructor", value: "dev@sciblock.local", email: "dev@sciblock.local", password: "DevPass1234" },
  { label: "Demo Student", value: "demo@sciblock.com", email: "demo@sciblock.com", password: "DemoPass1234" },
];

const IS_DEV_MODE = import.meta.env.VITE_DEV_MODE === "true";

export function AuthCard() {
  const form = useLogin();

  return (
    <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl px-8 py-10 shadow-sm">
      <div className="mb-7">
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
          Let's Sign You In
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Don't have an account?{" "}
          <Link
            href="/signup"
            className="text-gray-900 font-medium underline underline-offset-2"
          >
            Sign up
          </Link>
        </p>
      </div>

      {IS_DEV_MODE && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <label className="text-xs font-medium text-amber-700 mb-1.5 block">
            🚀 开发模式：快速选择测试账号
          </label>
          <Select
            onValueChange={(value) => {
              const account = DEV_ACCOUNTS.find((a) => a.value === value);
              if (account) {
                form.quickFill(account.email, account.password);
              }
            }}
          >
            <SelectTrigger className="w-full bg-white border-amber-200 focus:ring-amber-400">
              <SelectValue placeholder="选择测试账号..." />
            </SelectTrigger>
            <SelectContent>
              {DEV_ACCOUNTS.map((account) => (
                <SelectItem key={account.value} value={account.value}>
                  {account.label}
                  {account.email && (
                    <span className="text-gray-400 ml-2 text-xs">
                      ({account.email})
                    </span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          form.submit();
        }}
      >
        <InputField
          id="email"
          label="Email"
          type="email"
          value={form.email}
          onChange={form.setEmail}
          placeholder="you@example.com"
          error={form.emailError}
          disabled={form.loading}
        />

        <InputField
          id="password"
          label="Password"
          type="password"
          value={form.password}
          onChange={form.setPassword}
          placeholder="••••••••"
          error={form.passwordError}
          disabled={form.loading}
        />

        <div className="flex items-center justify-between mt-1">
          <CheckboxField
            id="remember-me"
            label="Remember Me"
            checked={form.rememberMe}
            onChange={form.setRememberMe}
            disabled={form.loading}
          />
          <a
            href="#"
            className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            Forgot Password?
          </a>
        </div>

        {form.serverError && (
          <p className="text-sm text-red-500 text-center -mt-1">
            {form.serverError}
          </p>
        )}

        <AuthButton type="submit" disabled={!form.canSubmit} loading={form.loading}>
          Login
        </AuthButton>
      </form>
    </div>
  );
}
