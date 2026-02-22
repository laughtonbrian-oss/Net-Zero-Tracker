import { RegisterForm } from "@/components/auth/register-form";
import Link from "next/link";

export const metadata = { title: "Create Account — Net Zero Pathfinder" };

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-gray-900">Net Zero Pathfinder</h1>
          <p className="mt-1 text-sm text-gray-500">Create your company account</p>
        </div>
        <RegisterForm />
        <p className="mt-4 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link href="/login" className="text-gray-900 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
