import { useRef } from "react";
import { Download, Upload, Database } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useWatchlist, WatchlistItem, makeId } from "@/lib/watchlist";
import { useAuth } from "@/lib/auth-provider";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n-provider";

export function DataManagement() {
  const { items, upsertAsync, upsertManyAsync } = useWatchlist();
  const { user } = useAuth();
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = (format: "json" | "csv") => {
    try {
      let dataStr = "";
      let dataUri = "";
      let ext = format;

      if (format === "csv") {
        const headers = ["id", "ticker", "name", "type", "currency", "currentPrice", "annualDividend", "targetYield", "ceilingPrice", "safetyMargin", "quantity", "averagePrice", "targetMonthlyIncome", "payoutRatio", "customTaxRate", "sector", "paymentMonths", "addedAt"];
        const lines = [headers.join(',')];
        for (const item of items) {
          const values = headers.map(h => {
            let v = (item as any)[h];
            if (h === "paymentMonths" && Array.isArray(v)) {
              v = v.join('|');
            }
            if (v === null || v === undefined) v = "";
            return `"${String(v).replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
          });
          lines.push(values.join(','));
        }
        dataStr = lines.join('\n');
        dataUri = "data:text/csv;charset=utf-8," + encodeURIComponent(dataStr);
      } else {
        dataStr = JSON.stringify(items, null, 2);
        dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
      }
      
      const exportFileDefaultName = `fuente-portfolio-${new Date().toISOString().split('T')[0]}.${ext}`;

      const linkElement = document.createElement("a");
      linkElement.setAttribute("href", dataUri);
      linkElement.setAttribute("download", exportFileDefaultName);
      linkElement.click();
      toast.success(`Portfolio exported as ${format.toUpperCase()}!`);
    } catch (err) {
      toast.error(`Failed to export portfolio as ${format.toUpperCase()}`);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const parseSafeNumber = (val: any): number | null => {
    if (val === null || val === undefined || val === "") return null;
    let str = String(val).replace(/[^\d.,-]/g, '');
    if (str === "") return null;
    
    const commaIdx = str.indexOf(',');
    const dotIdx = str.indexOf('.');
    if (commaIdx !== -1 && dotIdx !== -1) {
      if (commaIdx < dotIdx) {
        str = str.replace(/,/g, ''); // e.g., 1,000.50 -> 1000.50
      } else {
        str = str.replace(/\./g, '').replace(',', '.'); // e.g., 1.000,50 -> 1000.50
      }
    } else if (commaIdx !== -1) {
      str = str.replace(',', '.'); // e.g., 10,50 -> 10.50
    }
    
    const num = Number(str);
    return isNaN(num) ? null : num;
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      let parsed: any[];

      if (file.name.toLowerCase().endsWith(".csv")) {
        const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
        if (lines.length > 0) {
          const delimiter = lines[0].includes(';') ? ';' : ',';
          const parseCsvLine = (line: string) => {
            const result = [];
            let cell = '';
            let inQuotes = false;
            for (let i = 0; i < line.length; i++) {
              const char = line[i];
              if (char === '"' && line[i+1] === '"') {
                cell += '"';
                i++;
              } else if (char === '"') {
                inQuotes = !inQuotes;
              } else if (char === delimiter && !inQuotes) {
                result.push(cell);
                cell = '';
              } else {
                cell += char;
              }
            }
            result.push(cell);
            return result;
          };

          const exactHeaders: Record<string, string> = {
            "id": "id",
            "ticker": "ticker",
            "symbol": "ticker",
            "ativo": "ticker",
            "asset": "ticker",
            "name": "name",
            "type": "type",
            "category": "type",
            "tipo": "type",
            "assettype": "type",
            "currency": "currency",
            "moeda": "currency",
            "currentprice": "currentPrice",
            "price": "currentPrice",
            "preco": "currentPrice",
            "current_price": "currentPrice",
            "annualdividend": "annualDividend",
            "targetyield": "targetYield",
            "ceilingprice": "ceilingPrice",
            "safetymargin": "safetyMargin",
            "quantity": "quantity",
            "qty": "quantity",
            "quantidade": "quantity",
            "shares": "quantity",
            "averageprice": "averagePrice",
            "targetmonthlyincome": "targetMonthlyIncome",
            "payoutratio": "payoutRatio",
            "customtaxrate": "customTaxRate",
            "sector": "sector",
            "paymentmonths": "paymentMonths",
            "addedat": "addedAt"
          };

          const rawHeaders = parseCsvLine(lines[0]).map(h => h.replace(/["']/g, "").trim().toLowerCase());
          const headers = rawHeaders.map(h => exactHeaders[h] || h);

          parsed = lines.slice(1).map(line => {
            const values = parseCsvLine(line);
            const obj: any = {};
            headers.forEach((h, i) => {
              obj[h] = values[i] !== undefined ? values[i] : "";
            });
            if (typeof obj.paymentMonths === "string" && obj.paymentMonths.length > 0) {
              obj.paymentMonths = obj.paymentMonths.split('|').map(Number).filter((n: number) => !isNaN(n));
            } else if (typeof obj.paymentMonths === "string") {
              obj.paymentMonths = [];
            }
            return obj;
          });
        } else {
          parsed = [];
        }
      } else {
        parsed = JSON.parse(text);
      }
      
      if (!Array.isArray(parsed)) {
        throw new Error("Invalid format. Expected a list of assets.");
      }

      toast.loading("Importing portfolio...", { id: "import" });
      
      const itemsToImport: WatchlistItem[] = [];
      for (const rawItem of parsed) {
        if (!rawItem || typeof rawItem !== "object") continue;
        
        let ticker = rawItem.ticker;
        let type = rawItem.type;
        
        if (ticker) {
           ticker = String(ticker).trim().toUpperCase();
           if (!type) {
              if (ticker.endsWith(".SA") || /^[A-Z]{4}\d+$/.test(ticker) || ticker.endsWith("11")) type = "STOCK_BR";
              else type = "STOCK_US";
           }
           
          const item: WatchlistItem = {
            id: rawItem.id || makeId(ticker, type as any),
            ticker: ticker,
            name: rawItem.name || ticker,
            type: type as any,
            currency: rawItem.currency || (type.includes("BR") || type === "FII" || type === "FIAGRO" ? "BRL" : "USD"),
            currentPrice: parseSafeNumber(rawItem.currentPrice) ?? 0,
            annualDividend: parseSafeNumber(rawItem.annualDividend) ?? 0,
            targetYield: parseSafeNumber(rawItem.targetYield) ?? 6,
            ceilingPrice: parseSafeNumber(rawItem.ceilingPrice) ?? 0,
            safetyMargin: parseSafeNumber(rawItem.safetyMargin) ?? 0,
            quantity: parseSafeNumber(rawItem.quantity) ?? 0,
            averagePrice: parseSafeNumber(rawItem.averagePrice),
            paymentMonths: Array.isArray(rawItem.paymentMonths) ? rawItem.paymentMonths : [],
            targetMonthlyIncome: parseSafeNumber(rawItem.targetMonthlyIncome),
            payoutRatio: parseSafeNumber(rawItem.payoutRatio),
            customTaxRate: parseSafeNumber(rawItem.customTaxRate),
            sector: rawItem.sector || null,
            addedAt: parseSafeNumber(rawItem.addedAt) ?? Date.now(),
          };
          
          itemsToImport.push(item);
        }
      }
      
      if (itemsToImport.length > 0) {
        await upsertManyAsync(itemsToImport);
      }
      
      toast.success(`Imported ${itemsToImport.length} assets successfully!`, { id: "import" });
    } catch (err: any) {
      toast.error(`Failed to import: ${err.message}`, { id: "import" });
    } finally {
      // Clear input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="flex items-center">
      <input type="file" accept=".json,.csv" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="h-8 w-8 border-border/50 text-muted-foreground hover:text-foreground">
            <Database className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={handleImportClick} className="gap-2 cursor-pointer">
            <Upload className="h-4 w-4" />
            <span>{t.watchlist.importData}</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExport("json")} className="gap-2 cursor-pointer">
            <Download className="h-4 w-4" />
            <span>{t.watchlist.exportJson}</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExport("csv")} className="gap-2 cursor-pointer">
            <Download className="h-4 w-4" />
            <span>{t.watchlist.exportCsv}</span>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            className="gap-2 cursor-pointer text-muted-foreground focus:text-foreground"
            onClick={() => {
              const TEMP_DATA = [{"id":"brazilian_stock:PETR4","ticker":"PETR4","name":"Petrobras","type":"STOCK_BR","currency":"BRL","currentPrice":38.5,"annualDividend":6.5,"targetYield":10,"ceilingPrice":65,"safetyMargin":68.8,"quantity":1000,"averagePrice":30,"paymentMonths":[5,8,11,12],"payoutRatio":45,"targetMonthlyIncome":500,"addedAt":1783665287715,"customTaxRate":null},{"id":"brazilian_stock:BBAS3","ticker":"BBAS3","name":"Banco do Brasil","type":"STOCK_BR","currency":"BRL","currentPrice":27.8,"annualDividend":2.5,"targetYield":8,"ceilingPrice":31.25,"safetyMargin":12.4,"quantity":500,"averagePrice":25,"paymentMonths":[2,3,5,6,8,9,11,12],"payoutRatio":40,"targetMonthlyIncome":300,"addedAt":1783665287715,"customTaxRate":null},{"id":"brazilian_stock:VALE3","ticker":"VALE3","name":"Vale","type":"STOCK_BR","currency":"BRL","currentPrice":62,"annualDividend":4.8,"targetYield":8,"ceilingPrice":60,"safetyMargin":-3.2,"quantity":200,"averagePrice":70,"paymentMonths":[3,9],"payoutRatio":55,"targetMonthlyIncome":null,"addedAt":1783665287715,"customTaxRate":null},{"id":"brazilian_stock:TAEE11","ticker":"TAEE11","name":"Taesa","type":"STOCK_BR","currency":"BRL","currentPrice":35.5,"annualDividend":3.2,"targetYield":7,"ceilingPrice":45.71,"safetyMargin":28.7,"quantity":300,"averagePrice":36,"paymentMonths":[5,8,11],"payoutRatio":85,"targetMonthlyIncome":200,"addedAt":1783665287715,"customTaxRate":null},{"id":"brazilian_stock:WEGE3","ticker":"WEGE3","name":"WEG","type":"STOCK_BR","currency":"BRL","currentPrice":42,"annualDividend":0.8,"targetYield":4,"ceilingPrice":20,"safetyMargin":-52.3,"quantity":150,"averagePrice":38,"paymentMonths":[2,8],"payoutRatio":50,"targetMonthlyIncome":null,"addedAt":1783665287715,"customTaxRate":null},{"id":"fii:MXRF11","ticker":"MXRF11","name":"Maxi Renda FII","type":"FII","currency":"BRL","currentPrice":10.2,"annualDividend":1.2,"targetYield":10,"ceilingPrice":12,"safetyMargin":17.6,"quantity":2000,"averagePrice":10.5,"paymentMonths":[1,2,3,4,5,6,7,8,9,10,11,12],"payoutRatio":null,"targetMonthlyIncome":500,"addedAt":1783665287715,"customTaxRate":null},{"id":"fii:HGLG11","ticker":"HGLG11","name":"CSHG Logística","type":"FII","currency":"BRL","currentPrice":162,"annualDividend":13.2,"targetYield":8,"ceilingPrice":165,"safetyMargin":1.8,"quantity":50,"averagePrice":160,"paymentMonths":[1,2,3,4,5,6,7,8,9,10,11,12],"payoutRatio":null,"targetMonthlyIncome":null,"addedAt":1783665287715,"customTaxRate":null},{"id":"fii:KNCR11","ticker":"KNCR11","name":"Kinea Rendimentos","type":"FII","currency":"BRL","currentPrice":104.5,"annualDividend":12,"targetYield":10,"ceilingPrice":120,"safetyMargin":14.8,"quantity":150,"averagePrice":100,"paymentMonths":[1,2,3,4,5,6,7,8,9,10,11,12],"payoutRatio":null,"targetMonthlyIncome":null,"addedAt":1783665287715,"customTaxRate":null},{"id":"fii:VISC11","ticker":"VISC11","name":"Vinci Shopping","type":"FII","currency":"BRL","currentPrice":118,"annualDividend":10.5,"targetYield":8,"ceilingPrice":131.25,"safetyMargin":11.2,"quantity":80,"averagePrice":115,"paymentMonths":[1,2,3,4,5,6,7,8,9,10,11,12],"payoutRatio":null,"targetMonthlyIncome":null,"addedAt":1783665287715,"customTaxRate":null},{"id":"fii:CPTS11","ticker":"CPTS11","name":"Capitania Securities","type":"FII","currency":"BRL","currentPrice":8.5,"annualDividend":0.9,"targetYield":10,"ceilingPrice":9,"safetyMargin":5.8,"quantity":1000,"averagePrice":9.2,"paymentMonths":[1,2,3,4,5,6,7,8,9,10,11,12],"payoutRatio":null,"targetMonthlyIncome":200,"addedAt":1783665287715,"customTaxRate":null},{"id":"us_stock:AAPL","ticker":"AAPL","name":"Apple Inc.","type":"STOCK_US","currency":"USD","currentPrice":185,"annualDividend":1,"targetYield":2,"ceilingPrice":50,"safetyMargin":-72.9,"quantity":25,"averagePrice":170,"paymentMonths":[2,5,8,11],"payoutRatio":15,"targetMonthlyIncome":50,"addedAt":1783665287715,"customTaxRate":null},{"id":"us_stock:MSFT","ticker":"MSFT","name":"Microsoft","type":"STOCK_US","currency":"USD","currentPrice":420,"annualDividend":3,"targetYield":2,"ceilingPrice":150,"safetyMargin":-64.2,"quantity":15,"averagePrice":380,"paymentMonths":[3,6,9,12],"payoutRatio":25,"targetMonthlyIncome":null,"addedAt":1783665287715,"customTaxRate":null},{"id":"us_stock:JNJ","ticker":"JNJ","name":"Johnson & Johnson","type":"STOCK_US","currency":"USD","currentPrice":155,"annualDividend":4.7,"targetYield":3,"ceilingPrice":156.6,"safetyMargin":1,"quantity":40,"averagePrice":160,"paymentMonths":[3,6,9,12],"payoutRatio":65,"targetMonthlyIncome":100,"addedAt":1783665287715,"customTaxRate":null},{"id":"us_stock:KO","ticker":"KO","name":"Coca-Cola","type":"STOCK_US","currency":"USD","currentPrice":60,"annualDividend":1.9,"targetYield":3,"ceilingPrice":63.3,"safetyMargin":5.5,"quantity":100,"averagePrice":58,"paymentMonths":[4,7,10,12],"payoutRatio":75,"targetMonthlyIncome":50,"addedAt":1783665287715,"customTaxRate":null},{"id":"us_stock:PG","ticker":"PG","name":"Procter & Gamble","type":"STOCK_US","currency":"USD","currentPrice":162,"annualDividend":3.8,"targetYield":2.5,"ceilingPrice":152,"safetyMargin":-6.1,"quantity":30,"averagePrice":150,"paymentMonths":[2,5,8,11],"payoutRatio":60,"targetMonthlyIncome":null,"addedAt":1783665287715,"customTaxRate":null},{"id":"reit:O","ticker":"O","name":"Realty Income","type":"REIT","currency":"USD","currentPrice":55,"annualDividend":3.1,"targetYield":5,"ceilingPrice":62,"safetyMargin":12.7,"quantity":120,"averagePrice":60,"paymentMonths":[1,2,3,4,5,6,7,8,9,10,11,12],"payoutRatio":null,"targetMonthlyIncome":100,"addedAt":1783665287715,"customTaxRate":null},{"id":"reit:VNQ","ticker":"VNQ","name":"Vanguard Real Estate","type":"REIT","currency":"USD","currentPrice":85,"annualDividend":3.5,"targetYield":4,"ceilingPrice":87.5,"safetyMargin":2.9,"quantity":40,"averagePrice":82,"paymentMonths":[3,6,9,12],"payoutRatio":null,"targetMonthlyIncome":null,"addedAt":1783665287715,"customTaxRate":null},{"id":"reit:STAG","ticker":"STAG","name":"STAG Industrial","type":"REIT","currency":"USD","currentPrice":38,"annualDividend":1.5,"targetYield":4,"ceilingPrice":37.5,"safetyMargin":-1.3,"quantity":80,"averagePrice":35,"paymentMonths":[1,2,3,4,5,6,7,8,9,10,11,12],"payoutRatio":null,"targetMonthlyIncome":null,"addedAt":1783665287715,"customTaxRate":null},{"id":"us_etf:SCHD","ticker":"SCHD","name":"Schwab US Dividend Equity","type":"ETF","currency":"USD","currentPrice":78,"annualDividend":2.8,"targetYield":3.5,"ceilingPrice":80,"safetyMargin":2.5,"quantity":60,"averagePrice":75,"paymentMonths":[3,6,9,12],"payoutRatio":null,"targetMonthlyIncome":150,"addedAt":1783665287715,"customTaxRate":null},{"id":"us_etf:VOO","ticker":"VOO","name":"Vanguard S&P 500","type":"ETF","currency":"USD","currentPrice":480,"annualDividend":6.5,"targetYield":1.5,"ceilingPrice":433.3,"safetyMargin":-9.7,"quantity":10,"averagePrice":400,"paymentMonths":[3,6,9,12],"payoutRatio":null,"targetMonthlyIncome":null,"addedAt":1783665287715,"customTaxRate":null},{"id":"fiagro:SNAG11","ticker":"SNAG11","name":"Suno Agro","type":"FIAGRO","currency":"BRL","currentPrice":10,"annualDividend":1.25,"targetYield":10,"ceilingPrice":12.5,"safetyMargin":25,"quantity":1500,"averagePrice":10.1,"paymentMonths":[1,2,3,4,5,6,7,8,9,10,11,12],"payoutRatio":null,"targetMonthlyIncome":null,"addedAt":1783665287715,"customTaxRate":null},{"id":"fii_infra:JURO11","ticker":"JURO11","name":"Sparta Infra","type":"FII_INFRA","currency":"BRL","currentPrice":98,"annualDividend":11.5,"targetYield":10,"ceilingPrice":115,"safetyMargin":17.3,"quantity":200,"averagePrice":100,"paymentMonths":[1,2,3,4,5,6,7,8,9,10,11,12],"payoutRatio":null,"targetMonthlyIncome":100,"addedAt":1783665287715,"customTaxRate":null}];
              upsertManyAsync(TEMP_DATA as any).then(() => {
                toast.success("Massa de dados restaurada com sucesso!");
              });
            }}
          >
            <Upload className="h-4 w-4" />
            <span>{t.watchlist.restoreData}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
