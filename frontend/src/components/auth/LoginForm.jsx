import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { apiPost, ApiError } from "../../utils/apiClient.js";
import Button from "../ui/Button.jsx";

const loginSchema = z.object({
  loginId: z.string().min(1, "아이디를 입력하세요."),
  password: z.string().min(1, "비밀번호를 입력하세요."),
});

export default function LoginForm() {
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values) => {
    setSubmitError("");
    try {
      await apiPost("/api/auth/login", values);
      navigate("/dashboard", { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        setSubmitError(error.message);
      } else {
        setSubmitError("로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex w-full max-w-sm flex-col gap-4">
      <div>
        <label htmlFor="loginId" className="mb-1 block text-sm font-medium text-slate-700">
          아이디
        </label>
        <input
          id="loginId"
          type="text"
          autoComplete="username"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          {...register("loginId")}
        />
        {errors.loginId && <p className="mt-1 text-xs text-red-600">{errors.loginId.message}</p>}
      </div>

      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
          비밀번호
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          {...register("password")}
        />
        {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
      </div>

      {submitError && <p className="text-sm text-red-600">{submitError}</p>}

      <Button type="submit" disabled={isSubmitting} className="mt-2 w-full">
        {isSubmitting ? "로그인 중..." : "로그인"}
      </Button>
    </form>
  );
}
