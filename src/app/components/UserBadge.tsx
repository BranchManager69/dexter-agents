type UserBadgeVariant = "pro" | "dev";
type UserBadgeSize = "xs" | "sm" | "md";

const VARIANT_STYLES: Record<UserBadgeVariant, { label: string; title: string; text: string; dot: string }> = {
  pro: {
    label: "PRO",
    title: "Pro member access",
    text: "text-iris",
    dot: "bg-iris/80",
  },
  dev: {
    label: "DEV",
    title: "Super admin access",
    text: "text-amber-200",
    dot: "bg-amber-300",
  },
};

const SIZE_STYLES: Record<UserBadgeSize, { text: string; gap: string; dot: string }> = {
  xs: {
    text: "text-[9px] tracking-[0.28em]",
    gap: "gap-1.5",
    dot: "h-1.5 w-1.5",
  },
  sm: {
    text: "text-[10px] tracking-[0.26em]",
    gap: "gap-1.5",
    dot: "h-1.5 w-1.5",
  },
  md: {
    text: "text-[11px] tracking-[0.24em]",
    gap: "gap-2",
    dot: "h-2 w-2",
  },
};

interface UserBadgeProps {
  variant: UserBadgeVariant;
  size?: UserBadgeSize;
  className?: string;
}

export function UserBadge({ variant, size = "sm", className }: UserBadgeProps) {
  const variantStyles = VARIANT_STYLES[variant];
  const sizeStyles = SIZE_STYLES[size];

  const classes = [
    "inline-flex items-center font-semibold uppercase",
    sizeStyles.text,
    sizeStyles.gap,
    variantStyles.text,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const dotClasses = [sizeStyles.dot, "rounded-full", variantStyles.dot].join(" ");

  return (
    <span className={classes} title={variantStyles.title}>
      <span className={dotClasses} aria-hidden />
      {variantStyles.label}
    </span>
  );
}

export default UserBadge;
