import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { PageSEO } from "@/components/PageSEO";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <PageSEO pageKey="notFound" path={location.pathname} noindex />
      <div className="text-center px-4">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-gray-600">Page not found</p>
        <a href="/" className="text-blue-500 underline hover:text-blue-700">
          Back to home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
