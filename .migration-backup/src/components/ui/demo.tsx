import React from "react";
import { AuthForm } from "@/components/ui/sign-in-1";

// Helper components for icons to ensure correct styling
const IconGoogle = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}><title>Google</title><path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.386-7.439-7.574s3.344-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.85l3.25-3.138C18.189 1.186 15.479 0 12.24 0 5.48 0 0 5.48 0 12.24s5.48 12.24 12.24 12.24c6.885 0 11.954-4.823 11.954-12.015 0-.795-.084-1.588-.239-2.356H12.24z" fill="currentColor"/></svg>
);

const IconGithub = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}><title>GitHub</title><path d="M12 0C5.373 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.085 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.91 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12Z" fill="currentColor"/></svg>
);

const IconMail = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}><title>Mail</title><path d="M22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6zm-2 0-8 5-8-5h16zm0 12H4V8l8 5 8-5v10z" fill="currentColor"/></svg>
);

/**
 * A demo page to showcase the AuthForm component.
 */
const AuthFormDemo = () => {
  // Your company logo from the provided base64 string
  const companyLogoSrc = "data:image/png;base64,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";

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
      <AuthForm
        logoSrc={companyLogoSrc}
        logoAlt="21st Company Logo"
        title="Welcome Back"
        description="Enter your credentials to access your account."
        primaryAction={{
          label: "Continue with Google",
          icon: <IconGoogle className="mr-2 h-4 w-4" />,
          onClick: () => alert("Google login clicked"),
        }}
        secondaryActions={[
          {
            label: "Continue with Email",
            icon: <IconMail className="mr-2 h-4 w-4" />,
            onClick: () => alert("Email login clicked"),
          },
          {
            label: "Continue with Github",
            icon: <IconGithub className="mr-2 h-4 w-4" />,
            onClick: () => alert("Github login clicked"),
          },
        ]}
        skipAction={{
          label: "Skip for now",
          onClick: () => alert("Skip clicked"),
        }}
        footerContent={
          <>
            By logging in, you agree to our{" "}
            <u className="cursor-pointer transition-colors hover:text-primary">Terms of Service</u>{" "}
            and{" "}
            <u className="cursor-pointer transition-colors hover:text-primary">Privacy Policy</u>.
          </>
        }
      />
    </div>
  );
};

export default AuthFormDemo;
