import React from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n-provider";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface MethodDetailSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Method type for icon: 'gordon' | 'bazin' | 'graham' | 'lynch' | 'consensus' */
  methodType: "gordon" | "bazin" | "graham" | "lynch" | "consensus";
}

export function MethodDetailSheet({
  isOpen,
  onClose,
  title,
  children,
  methodType,
}: MethodDetailSheetProps) {
  const { t } = useI18n();

  const getMethodIcon = () => {
    switch (methodType) {
      case "gordon":
        return "📈";
      case "bazin":
        return "📊";
      case "graham":
        return "🔍";
      case "lynch":
        return "🚀";
      case "consensus":
        return "✨";
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[60vh] sm:max-h-[50vh]">
        <DrawerHeader className="px-4">
          <div className="flex items-center justify-between">
            <DrawerTitle className="flex items-center gap-2 text-lg font-bold">
              <span role="img" aria-hidden="true">
                {getMethodIcon()}
              </span>
              {title}
            </DrawerTitle>
            <DrawerClose asChild>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </div>
          <DrawerDescription className="text-xs text-muted-foreground mt-1">
            {t.valuationAssumptions.methodDetails}
          </DrawerDescription>
        </DrawerHeader>

        <div className="mx-4 mb-4 max-h-[40vh] overflow-y-auto pr-1">{children}</div>
      </DrawerContent>
    </Drawer>
  );
}
