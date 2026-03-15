import { useState } from "react";
import { useLocation } from "wouter";
import { login } from "@/api/auth";
import { ApiError, setStoredToken } from "@/api/client";
import { useCurrentUser } from "@/contexts/UserContext";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export interface LoginFormState {
  email: string;
  password: string;
  rememberMe: boolean;
  emailError: string;
  passwordError: string;
  serverError: string;
  loading: boolean;
  canSubmit: boolean;
  setEmail: (value: string) => void;
  setPassword: (value: string) => void;
  setRememberMe: (value: boolean) => void;
  submit: () => Promise<void>;
}

export function useLogin(): LoginFormState {
  const [, navigate] = useLocation();
  const { setCurrentUser } = useCurrentUser();

  const [email, setEmailRaw] = useState("");
  const [password, setPasswordRaw] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const canSubmit = email.trim().length > 0 && password.trim().length > 0;

  function setEmail(value: string) {
    setEmailRaw(value);
    if (emailError) setEmailError("");
    if (serverError) setServerError("");
  }

  function setPassword(value: string) {
    setPasswordRaw(value);
    if (passwordError) setPasswordError("");
    if (serverError) setServerError("");
  }

  function validate(): boolean {
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

  async function submit(): Promise<void> {
    setServerError("");
    if (!validate()) return;

    setLoading(true);
    try {
      const result = await login({ email: email.trim(), password });
      // Persist JWT token for all subsequent API calls (Go API).
      setStoredToken(result.token);
      // Update UserContext state (also persists to localStorage via writeStoredUser).
      setCurrentUser(result.user);
      navigate("/home");
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.message);
      } else {
        setServerError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return {
    email,
    password,
    rememberMe,
    emailError,
    passwordError,
    serverError,
    loading,
    canSubmit,
    setEmail,
    setPassword,
    setRememberMe,
    submit,
  };
}
