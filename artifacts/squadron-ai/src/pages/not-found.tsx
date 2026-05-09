import { Link } from "wouter";
import { Layout } from "@/components/layout";

export default function NotFound() {
  return (
    <Layout>
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-4">
        <p className="text-4xl font-bold text-primary font-mono">404</p>
        <p className="text-muted-foreground text-sm font-mono uppercase tracking-wider mt-2">Page not found</p>
        <Link href="/">
          <span className="mt-4 inline-block text-[10px] text-primary underline uppercase tracking-wider cursor-pointer">
            Return to Command Center
          </span>
        </Link>
      </div>
    </Layout>
  );
}
