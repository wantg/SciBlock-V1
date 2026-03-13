import React, { useState } from "react";
import { useLocation, Link } from "wouter";
import { InputField } from "./InputField";
import { CheckboxField } from "./CheckboxField";
import { AuthButton } from "./AuthButton";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function AuthCard() {
  const [, navigate] = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const canSubmit = email.trim().length > 0 && password.trim().length > 0;

  function validateFields() {
    let valid = true;

    if (!email.trim()) {
      setEmailError("Email is required.");
      valid = false;
    } else if (!isValidEmail(email.trim())) {
      setEmailError("Please enter a valid email address.");
      valid = false;
    } else {
      setEmailError("");
    }

    if (!password.trim()) {
      setPasswordError("Password is required.");
      valid = false;
    } else {
      setPasswordError("");
    }

    return valid;
  }

  async function handleLogin() {
    setServerError("");
    if (!validateFields()) return;

    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        navigate("/home");
      } else {
        setServerError(data.message || "Invalid email or password.");
      }
    } catch {
      setServerError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl px-8 py-10 shadow-sm">
      <div className="mb-7">
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
          Let's Sign You In
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Don't have an account?{" "}
          <Link href="/signup" className="text-gray-900 font-medium underline underline-offset-2">
            Sign up
          </Link>
        </p>
      </div>

      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          handleLogin();
        }}
      >
        <InputField
          id="email"
          label="Email"
          type="email"
          value={email}
          onChange={(v) => {
            setEmail(v);
            if (emailError) setEmailError("");
            if (serverError) setServerError("");
          }}
          placeholder="you@example.com"
          error={emailError}
          disabled={loading}
        />

        <InputField
          id="password"
          label="Password"
          type="password"
          value={password}
          onChange={(v) => {
            setPassword(v);
            if (passwordError) setPasswordError("");
            if (serverError) setServerError("");
          }}
          placeholder="••••••••"
          error={passwordError}
          disabled={loading}
        />

        <div className="flex items-center justify-between mt-1">
          <CheckboxField
            id="remember-me"
            label="Remember Me"
            checked={rememberMe}
            onChange={setRememberMe}
            disabled={loading}
          />
          <a
            href="#"
            className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            Forgot Password?
          </a>
        </div>

        {serverError && (
          <p className="text-sm text-red-500 text-center -mt-1">{serverError}</p>
        )}

        <AuthButton
          type="submit"
          disabled={!canSubmit}
          loading={loading}
        >
          Login
        </AuthButton>
      </form>
    </div>
  );
}
