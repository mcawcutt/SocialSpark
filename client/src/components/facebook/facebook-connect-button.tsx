import { Button } from "@/components/ui/button";
import { SiFacebook } from "react-icons/si";
import { useLocation } from "wouter";

interface FacebookConnectButtonProps {
  variant?: "default" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function FacebookConnectButton({
  variant = "default",
  size = "default", 
  className = ""
}: FacebookConnectButtonProps) {
  const [, navigate] = useLocation();

  return (
    <Button
      variant={variant}
      size={size}
      className={`bg-[#1877F2] hover:bg-[#0d6efd] text-white ${className}`}
      onClick={() => navigate("/facebook-connect")}
    >
      <SiFacebook className="mr-2 h-5 w-5" />
      Connect Facebook Pages
    </Button>
  );
}