import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm font-medium backdrop-blur-[12px] shadow-soft-modern transition-all duration-200 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg~*]:pl-7",
  {
    variants: {
      variant: {
        default: "bg-glass-medium border-modern text-primary",
        destructive:
          "bg-red-500/10 border-red-500/30 text-red-400 [&>svg]:text-red-400",
        success:
          "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 [&>svg]:text-emerald-400",
        warning:
          "bg-amber-500/10 border-amber-500/30 text-amber-400 [&>svg]:text-amber-400",
        info:
          "bg-blue-500/10 border-blue-500/30 text-blue-400 [&>svg]:text-blue-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
));
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props}
  />
));
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };