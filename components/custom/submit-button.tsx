"use client";

import { useFormStatus } from "react-dom";

import { LoaderIcon } from "@/components/custom/icons";

import { Button } from "../ui/button";

export function SubmitButton({ 
  children, 
  disabled = false 
}: { 
  children: React.ReactNode;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  const isDisabled = pending || disabled;

  return (
    <Button
      type={isDisabled ? "button" : "submit"}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      className="relative text-white"
    >
      {children}
      {isDisabled && (
        <span className="animate-spin absolute right-4">
          <LoaderIcon />
        </span>
      )}
      <span aria-live="polite" className="sr-only" role="status">
        {isDisabled ? "Loading" : "Submit form"}
      </span>
    </Button>
  );
}
