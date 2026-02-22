import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const messages = await getMessages();

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-slate-900">
      <NextIntlClientProvider messages={messages}>
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Header />
          <main className="flex-1 px-6 py-6 overflow-auto min-w-0">{children}</main>
        </div>
      </NextIntlClientProvider>
    </div>
  );
}
