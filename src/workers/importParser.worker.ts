import * as XLSX from "xlsx";
import {
  parseFile,
  matchColumn,
  type ColumnMapping,
  type MappableColumn,
  type ParseResult,
} from "../lib/dynamicCsvParser";

export interface ParseFileMessage {
  type: "PARSE_FILE";
  payload: {
    fileData: ArrayBuffer | string;
    fileName: string;
    manualMapping?: Partial<Record<MappableColumn, number>>;
  };
}

export interface ExtractHeadersMessage {
  type: "EXTRACT_HEADERS";
  payload: {
    fileData: ArrayBuffer | string;
    fileName: string;
  };
}

export type WorkerInMessage = ParseFileMessage | ExtractHeadersMessage;

export interface HeadersExtractedMessage {
  type: "HEADERS_EXTRACTED";
  payload: {
    headers: string[];
    columnMapping: ColumnMapping;
    sampleRows: unknown[][];
    totalRows: number;
  };
}

export interface ProgressMessage {
  type: "PROGRESS";
  payload: {
    percent: number;
    currentLine: number;
    totalRows: number;
    message: string;
  };
}

export interface DoneMessage {
  type: "DONE";
  payload: {
    result: ParseResult;
  };
}

export interface ErrorMessage {
  type: "ERROR";
  payload: {
    error: string;
  };
}

export type WorkerOutMessage =
  | HeadersExtractedMessage
  | ProgressMessage
  | DoneMessage
  | ErrorMessage;

function readSheetData(fileData: ArrayBuffer | string): {
  headers: string[];
  rows: unknown[][];
} {
  const readOptions: XLSX.ParsingOptions = {
    type: typeof fileData === "string" ? "string" : "array",
    raw: true,
    cellDates: false,
    codepage: 65001,
  };

  const workbook = XLSX.read(fileData, readOptions);
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error("O arquivo não contém nenhuma planilha ou tabela legível.");
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rawData = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    blankrows: false,
    defval: "",
    raw: true,
  });

  if (!rawData || rawData.length === 0) {
    throw new Error("A planilha está vazia.");
  }

  const rawHeaders = (rawData[0] as unknown[]) || [];
  const headers = rawHeaders.map((h) => (h !== null && h !== undefined ? String(h).trim() : ""));
  const rows = rawData.slice(1);

  return { headers, rows };
}

self.onmessage = (event: MessageEvent<WorkerInMessage>) => {
  const { type, payload } = event.data;

  try {
    if (type === "EXTRACT_HEADERS") {
      const { headers, rows } = readSheetData(payload.fileData);
      const columnMapping = matchColumn(headers);
      const sampleRows = rows.slice(0, 5);

      const out: HeadersExtractedMessage = {
        type: "HEADERS_EXTRACTED",
        payload: {
          headers,
          columnMapping,
          sampleRows,
          totalRows: rows.length,
        },
      };
      self.postMessage(out);
      return;
    }

    if (type === "PARSE_FILE") {
      const { headers, rows } = readSheetData(payload.fileData);
      const totalRows = rows.length;

      // Incremental progress simulation / batching
      const batchSize = Math.max(25, Math.floor(totalRows / 50));
      for (let i = 0; i < totalRows; i += batchSize) {
        const currentLine = Math.min(i + batchSize, totalRows);
        const percent = Math.round((currentLine / totalRows) * 100);

        const progressMsg: ProgressMessage = {
          type: "PROGRESS",
          payload: {
            percent,
            currentLine,
            totalRows,
            message: `Processando linha ${currentLine} de ${totalRows}...`,
          },
        };
        self.postMessage(progressMsg);
      }

      const result = parseFile(rows, headers, payload.manualMapping);

      const doneMsg: DoneMessage = {
        type: "DONE",
        payload: {
          result,
        },
      };
      self.postMessage(doneMsg);
      return;
    }
  } catch (err: unknown) {
    const errorMsg: ErrorMessage = {
      type: "ERROR",
      payload: {
        error: err instanceof Error ? err.message : "Erro desconhecido durante o processamento do arquivo.",
      },
    };
    self.postMessage(errorMsg);
  }
};
