import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, FileType2, PlusCircle, Shield, TrendingUp } from "lucide-react";
import { useI18n } from "@/lib/i18n-provider";

interface AddAssetDropdownProps {
  onNavigateToScreener: () => void;
  onOpenFIWizard: () => void;
  onOpenBrokerUploader: () => void;
}

export function AddAssetDropdown({
  onNavigateToScreener,
  onOpenFIWizard,
  onOpenBrokerUploader,
}: AddAssetDropdownProps) {
  const { t } = useI18n();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/40">
          <PlusCircle className="h-4 w-4" />
          {t.watchlist.addAssetDropdown || t.watchlist.addFirstAsset || "Add Asset"}
          <ChevronDown className="h-4 w-4 ml-1 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-56 bg-slate-900 border-slate-700">
        <DropdownMenuItem
          className="cursor-pointer gap-2 py-3 focus:bg-slate-800 focus:text-primary"
          onClick={onNavigateToScreener}
        >
          <TrendingUp className="h-4 w-4" />
          <div className="flex flex-col">
            <span className="font-medium">{t.watchlist.addEquity}</span>
            <span className="text-xs text-slate-500">{t.watchlist.addEquityDesc}</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer gap-2 py-3 focus:bg-slate-800 focus:text-primary"
          onClick={onOpenFIWizard}
        >
          <Shield className="h-4 w-4" />
          <div className="flex flex-col">
            <span className="font-medium">{t.watchlist.addFixedIncome}</span>
            <span className="text-xs text-slate-500">{t.watchlist.addFixedIncomeDesc}</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer gap-2 py-3 focus:bg-slate-800 focus:text-primary"
          onClick={onOpenBrokerUploader}
        >
          <FileType2 className="h-4 w-4" />
          <div className="flex flex-col">
            <span className="font-medium">{t.watchlist.importBrokerNote}</span>
            <span className="text-xs text-slate-500 truncate w-[160px]">
              XP, Rico, Clear, BTG, Modal, Inter, NuInvest, Órama, Genial
            </span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
