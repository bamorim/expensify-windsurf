import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
        <div className="absolute top-6 right-6">
          <Link
            href="/app"
            className="rounded-full bg-white/10 px-6 py-2 font-semibold no-underline transition hover:bg-white/20"
          >
            Login
          </Link>
        </div>

        <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
          Expense <span className="text-[hsl(280,100%,70%)]">Management</span>
        </h1>
        
        <p className="text-xl text-center max-w-2xl text-gray-300">
          Streamline your organization&apos;s expense management with our powerful, 
          multi-tenant platform. Create organizations, manage teams, and track expenses effortlessly.
        </p>

        <div className="flex flex-col items-center gap-6">
          <Link
            href="/app"
            className="rounded-full bg-[hsl(280,100%,70%)] px-10 py-4 text-lg font-bold text-white no-underline transition hover:bg-[hsl(280,100%,60%)]"
          >
            Get Started
          </Link>
          
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-8 mt-8">
            <div className="flex flex-col items-center gap-2 rounded-xl bg-white/5 p-6">
              <h3 className="text-xl font-bold">Multi-Tenant</h3>
              <p className="text-sm text-gray-300 text-center">
                Create and manage multiple organizations with role-based access control
              </p>
            </div>
            <div className="flex flex-col items-center gap-2 rounded-xl bg-white/5 p-6">
              <h3 className="text-xl font-bold">Team Management</h3>
              <p className="text-sm text-gray-300 text-center">
                Invite team members and manage permissions across your organization
              </p>
            </div>
            <div className="flex flex-col items-center gap-2 rounded-xl bg-white/5 p-6">
              <h3 className="text-xl font-bold">Expense Tracking</h3>
              <p className="text-sm text-gray-300 text-center">
                Track and categorize expenses with powerful reporting features
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
