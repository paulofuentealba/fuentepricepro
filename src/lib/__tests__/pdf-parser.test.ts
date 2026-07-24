import { describe, it, expect } from 'vitest';
import { parseB3Float, parseB3BrokerNote } from '../dataIngestion/b3Parser';

describe('PDF Data Ingestion Resiliency (B3 Parser)', () => {
  
  describe('parseB3Float (Type Mapping)', () => {
    it('should correctly map a Brazilian formatted string like "1.500,00" to a float of 1500.00', () => {
      expect(parseB3Float('1.500,00')).toBe(1500.00);
      expect(parseB3Float('32,50')).toBe(32.50);
      expect(parseB3Float('10.450.000,99')).toBe(10450000.99);
      expect(parseB3Float('0,50')).toBe(0.50);
    });

    it('should throw an error for completely invalid floats to be caught by the engine', () => {
      expect(() => parseB3Float('invalid')).toThrow();
      expect(() => parseB3Float('')).toThrow();
    });
  });

  describe('parseB3BrokerNote', () => {
    it('should parse valid raw B3 text into structured trades', () => {
      const mockRawText = `
        Data pregão 15/07/2026
        ...
        1-BOVESPA C VISTA WEGE3 100 45,00 4.500,00 C
        1-BOVESPA V VISTA PETR4F 15 30,00 450,00 D
      `;

      const result = parseB3BrokerNote(mockRawText);
      
      expect(result.success).toBe(true);
      expect(result.trades).toBeDefined();
      expect(result.trades?.length).toBe(2);

      // Verify the first trade
      expect(result.trades?.[0]).toEqual({
        ticker: 'WEGE3',
        quantity: 100,
        price: 45.00,
        date: '15/07/2026'
      });

      // Verify the fractional market (F) is stripped correctly
      expect(result.trades?.[1]).toEqual({
        ticker: 'PETR4',
        quantity: 15,
        price: 30.00,
        date: '15/07/2026'
      });
    });

    it('should return a graceful error boundary payload for completely malformed input', () => {
      const malformedText = "This is a random text file with no B3 indicators at all. Just some 45,00 numbers.";
      
      const result = parseB3BrokerNote(malformedText);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Malformed file');
      expect(result.trades).toBeUndefined();
    });

    it('should gracefully handle empty or null inputs', () => {
      expect(parseB3BrokerNote('')).toEqual({ success: false, error: 'Empty file' });
      expect(parseB3BrokerNote('   \n  ')).toEqual({ success: false, error: 'Empty file' });
    });

    it('should return malformed error if trade line is corrupted and missing fields', () => {
      const corruptedText = `
        Data pregão 15/07/2026
        1-BOVESPA C VISTA WEGE3 
      `; // Missing quantity and price entirely

      const result = parseB3BrokerNote(corruptedText);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Malformed file');
    });
  });
});
