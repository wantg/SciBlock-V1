import React from "react";
import { Link } from "wouter";
import { useLogin } from "@/hooks/useLogin";
import { InputField } from "./InputField";
import { CheckboxField } from "./CheckboxField";
import { AuthButton } from "./AuthButton";

export function AuthCard() {
  const form = useLogin();

  return (
    <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl px-8 py-10 shadow-sm">
      <div className="mb-7">
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
          登录到 SciBlock
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          还没有账号？{" "}
          <Link
            href="/signup"
            className="text-gray-900 font-medium underline underline-offset-2"
          >
            立即注册
          </Link>
        </p>
      </div>

      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          form.submit();
        }}
      >
        <InputField
          id="email"
          label="邮箱"
          type="email"
          value={form.email}
          onChange={form.setEmail}
          placeholder="your@email.com"
          error={form.emailError}
          disabled={form.loading}
        />

        <InputField
          id="password"
          label="密码"
          type="password"
          value={form.password}
          onChange={form.setPassword}
          placeholder="••••••••"
          error={form.passwordError}
          disabled={form.loading}
        />

        <div className="flex items-center mt-1">
          <CheckboxField
            id="remember-me"
            label="记住我"
            checked={form.rememberMe}
            onChange={form.setRememberMe}
            disabled={form.loading}
          />
        </div>

        {form.serverError && (
          <p className="text-sm text-red-500 text-center -mt-1">
            {form.serverError}
          </p>
        )}

        <AuthButton type="submit" disabled={!form.canSubmit} loading={form.loading}>
          登录
        </AuthButton>
      </form>
    </div>
  );
}
