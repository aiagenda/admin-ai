import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface HelpTooltipProps {
  content: string;
  helpPageAnchor?: string;
  variant?: "default" | "ghost" | "outline";
  size?: "sm" | "icon" | "default" | "lg";
}

export function HelpTooltip({ 
  content, 
  helpPageAnchor,
  variant = "ghost",
  size = "icon"
}: HelpTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant={variant} size={size} className="h-5 w-5 p-0">
          <HelpCircle className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <p className="text-sm">{content}</p>
        {helpPageAnchor && (
          <Link 
            to={`/help#${helpPageAnchor}`} 
            className="text-xs text-primary hover:underline mt-2 block"
            onClick={(e) => e.stopPropagation()}
          >
            Learn more →
          </Link>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

