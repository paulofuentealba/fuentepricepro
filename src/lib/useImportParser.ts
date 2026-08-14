import { useState, useRef, useCallback, useEffect } from "react";
import type {
  ColumnMapping,
  MappableColumn,
  ParseResult,
} from "./dynamicCsvParser";
import { parseFile, matchColumn } from "./dynamicCsvParser";
import * as XLSX from "xlsx";
import type {
  WorkerInMessage,
  WorkerOutMessage,
} from "../workers/importParser.worker";

export type ImportParserState =
  | "idle"
  | "mapping"
  | "processing"
  | "done"
  | "error";

export interface ProgressState {
  percent: number;
  currentLine: number;
  totalRows: number;
  message: string;
  logs: string[];
}

export function useImportParser() {
  const [state, setState] = useState<ImportParserState>("idle");
  const [fileName, setFileName] = useState<string>("");
  const [fileData, setFileData] = useState<ArrayBuffer | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping | null>(null);
  const [sampleRows, setSampleRows] = useState<unknown[][]>([]);
  const [totalRows, setTotalRows] = useState<number>(0);
  const [progress, setProgress] = useState<ProgressState>({
    percent: 0,
    currentLine: 0,
    totalRows: 0,
    message: "",
    logs: [],
  });
  const [result, setResult] = useState<ParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const workerRef = useRef<Worker | null>(null);

  const terminateWorker = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      terminateWorker();
    };
  }, [terminateWorker]);

  const reset = useCallback(() => {
    terminateWorker();
    setState("idle");
    setFileName("");
    setFileData(null);
    setHeaders([]);
    setColumnMapping(null);
    setSampleRows([]);
    setTotalRows(0);
    setProgress({
      percent: 0,
      currentLine: 0,
      totalRows: 0,
      message: "",
      logs: [],
    });
    setResult(null);
    setError(null);
  }, [terminateWorker]);

  const loadFile = useCallback(
    async (file: File) => {
      reset();
      setFileName(file.name);
      setError(null);

      try {
        const buffer = await file.arrayBuffer();
        setFileData(buffer);

        if (typeof Worker !== "undefined") {
          terminateWorker();
          const worker = new Worker(
            new URL("../workers/importParser.worker.ts", import.meta.url),
            { type: "module" },
          );
          workerRef.current = worker;

          worker.onmessage = (event: MessageEvent<WorkerOutMessage>) => {
            const msg = event.data;
            if (msg.type === "HEADERS_EXTRACTED") {
              setHeaders(msg.payload.headers);
              setColumnMapping(msg.payload.columnMapping);
              setSampleRows(msg.payload.sampleRows);
              setTotalRows(msg.payload.totalRows);
              setState("mapping");
            } else if (msg.type === "PROGRESS") {
              setProgress((prev) => ({
                percent: msg.payload.percent,
                currentLine: msg.payload.currentLine,
                totalRows: msg.payload.totalRows,
                message: msg.payload.message,
                logs: [...prev.logs, msg.payload.message],
              }));
            } else if (msg.type === "DONE") {
              setResult(msg.payload.result);
              setState("done");
            } else if (msg.type === "ERROR") {
              setError(msg.payload.error);
              setState("error");
            }
          };

          worker.onerror = (err) => {
            setError(err.message || "Erro no Web Worker de importação.");
            setState("error");
          };

          const msg: WorkerInMessage = {
            type: "EXTRACT_HEADERS",
            payload: {
              fileData: buffer,
              fileName: file.name,
            },
          };
          worker.postMessage(msg);
        } else {
          // Fallback if Worker is not available
          const workbook = XLSX.read(buffer, { raw: true, cellDates: false, codepage: 65001 });
          const firstSheet = workbook.SheetNames[0];
          const rawData = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[firstSheet], {
            header: 1,
            blankrows: false,
            defval: "",
            raw: true,
          });
          const rawHeaders = (rawData[0] as unknown[]) || [];
          const extractedHeaders = rawHeaders.map((h) => String(h || "").trim());
          const rows = rawData.slice(1);
          const mapping = matchColumn(extractedHeaders);

          setHeaders(extractedHeaders);
          setColumnMapping(mapping);
          setSampleRows(rows.slice(0, 5));
          setTotalRows(rows.length);
          setState("mapping");
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Falha ao ler o arquivo.");
        setState("error");
      }
    },
    [reset, terminateWorker],
  );

  const confirmMapping = useCallback(
    (manualMapping?: Partial<Record<MappableColumn, number>>) => {
      if (!fileData) return;

      setState("processing");
      setProgress({
        percent: 0,
        currentLine: 0,
        totalRows,
        message: "Iniciando processamento...",
        logs: ["Arquivo carregado. Iniciando extração de dados..."],
      });

      if (workerRef.current) {
        const msg: WorkerInMessage = {
          type: "PARSE_FILE",
          payload: {
            fileData,
            fileName,
            manualMapping,
          },
        };
        workerRef.current.postMessage(msg);
      } else {
        // Fallback synchronous parse
        try {
          const workbook = XLSX.read(fileData, { raw: true, cellDates: false, codepage: 65001 });
          const firstSheet = workbook.SheetNames[0];
          const rawData = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[firstSheet], {
            header: 1,
            blankrows: false,
            defval: "",
            raw: true,
          });
          const rawHeaders = (rawData[0] as unknown[]) || [];
          const extractedHeaders = rawHeaders.map((h) => String(h || "").trim());
          const rows = rawData.slice(1);
          const parsed = parseFile(rows, extractedHeaders, manualMapping);
          setResult(parsed);
          setState("done");
        } catch (err: unknown) {
          setError(err instanceof Error ? err.message : "Erro no processamento.");
          setState("error");
        }
      }
    },
    [fileData, fileName, totalRows],
  );

  return {
    state,
    fileName,
    headers,
    columnMapping,
    sampleRows,
    totalRows,
    progress,
    result,
    error,
    loadFile,
    confirmMapping,
    cancel: reset,
    reset,
  };
}
