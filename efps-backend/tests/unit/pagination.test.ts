import { describe, it, expect } from 'vitest';
import { parsePaginationParams, buildPaginationMeta } from '../../src/shared/utils/pagination.js';

describe('Pagination utilities', () => {
  it('should parse default pagination params', () => {
    const result = parsePaginationParams({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.offset).toBe(0);
  });

  it('should parse custom pagination params', () => {
    const result = parsePaginationParams({ page: 3, limit: 10 });
    expect(result.page).toBe(3);
    expect(result.limit).toBe(10);
    expect(result.offset).toBe(20);
  });

  it('should enforce max limit', () => {
    const result = parsePaginationParams({ limit: 200 });
    expect(result.limit).toBe(100);
  });

  it('should not allow page less than 1', () => {
    const result = parsePaginationParams({ page: 0 });
    expect(result.page).toBe(1);
  });

  it('should build pagination meta without cursor on last page', () => {
    const data = [1, 2, 3];
    const result = buildPaginationMeta(data, 3, 1, 5);
    expect(result.meta.page).toBe(1);
    expect(result.meta.limit).toBe(5);
    expect(result.meta.total).toBe(3);
    expect(result.meta.cursor).toBeNull();
  });

  it('should build pagination meta with cursor when more pages exist', () => {
    const data = Array(5).fill(0);
    const result = buildPaginationMeta(data, 20, 1, 5);
    expect(result.meta.cursor).toBeTruthy();
    expect(result.data).toHaveLength(5);
  });
});
