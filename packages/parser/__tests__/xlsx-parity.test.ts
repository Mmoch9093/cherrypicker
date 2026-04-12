import { describe, expect, test } from 'bun:test';
import { BANK_COLUMN_CONFIGS as backendConfigs } from '../src/xlsx/adapters/index.js';
import { BANK_COLUMN_CONFIGS as webConfigs } from '../../../apps/web/src/lib/parser/xlsx.ts';

describe('XLSX parser parity', () => {
  test('browser and package parser column configs stay aligned for supported banks', () => {
    expect(Object.keys(webConfigs).sort()).toEqual(Object.keys(backendConfigs).sort());

    for (const bankId of Object.keys(backendConfigs) as Array<keyof typeof backendConfigs>) {
      expect(webConfigs[bankId]).toEqual(backendConfigs[bankId]);
    }
  });
});
