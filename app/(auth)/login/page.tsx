import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import Link from "next/link";

export const metadata = { title: "Sign In — Net Zero Tracker" };

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-gray-900">Net Zero Tracker</h1>
          <p className="mt-1 text-sm text-gray-500">Sign in to your account</p>
        </div>
        <Suspense fallback={<div className="h-48 rounded-lg border border-gray-200 animate-pulse bg-gray-50" />}>
          <LoginForm />
        </Suspense>
        <p className="mt-4 text-center text-sm text-gray-500">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-gray-900 font-medium hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
