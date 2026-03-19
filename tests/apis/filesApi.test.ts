import { describe, it, expect, vi, beforeEach } from 'vitest';

// axios mock
const mockGet = vi.fn();
const mockPost = vi.fn();
const mockDelete = vi.fn();
const mockPatch = vi.fn();

vi.mock('src/boot/axios', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
  },
  API_HOST: 'http://test:8000',
}));

import {
  getFiles,
  deleteFile,
  renameFile,
  uploadFile,
  saveProcessingImage,
  batchTreeProcessing,
  createCrop,
  applyCrop,
  applyCropAll,
  deleteCrop,
  getOriginSizeUrl,
  downloadNodeImage,
} from 'src/apis/filesApi';

beforeEach(() => {
  vi.clearAllMocks();
});

// ── 파일 CRUD ────────────────────────────────────────────────────────────────

describe('파일 CRUD', () => {
  it('GET /files — getFiles', async () => {
    const mockData = { items: [], hasMore: false, nextCursorUploadedAt: null, nextCursorId: null };
    mockGet.mockResolvedValue({ data: mockData });

    const result = await getFiles({ search: 'test', minSize: 100 });

    expect(mockGet).toHaveBeenCalledWith('/files', {
      params: expect.objectContaining({ search: 'test', minSize: 100 }),
    });
    expect(result).toEqual(mockData);
  });

  it('DELETE /files/{id} — deleteFile', async () => {
    mockDelete.mockResolvedValue({});

    await deleteFile('file-123');

    expect(mockDelete).toHaveBeenCalledWith('/files/file-123');
  });

  it('PATCH /files/{id} — renameFile', async () => {
    mockPatch.mockResolvedValue({});

    await renameFile('file-123', 'new-name.png');

    expect(mockPatch).toHaveBeenCalledWith('/files/file-123', { originNm: 'new-name.png' });
  });

  it('POST /files/upload — uploadFile', async () => {
    const mockResponse = {
      id: 'new-id',
      originNm: 'test.png',
      nm: 'abc.png',
      path: 'uploads/abc.png',
      mimeType: 'image/png',
      sizeBytes: 1000,
      uploadedAt: '2026-01-01',
    };
    mockPost.mockResolvedValue({ data: mockResponse });

    const file = new File(['test'], 'test.png', { type: 'image/png' });
    const result = await uploadFile(file);

    expect(mockPost).toHaveBeenCalledWith(
      '/files/upload',
      expect.any(FormData),
      expect.objectContaining({
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    );
    expect(result.id).toBe('new-id');
  });

  it('POST /files/save — saveProcessingImage', async () => {
    const mockResponse = { id: 'saved-id' };
    mockPost.mockResolvedValue({ data: mockResponse });

    const blob = new Blob(['test'], { type: 'image/png' });
    await saveProcessingImage({ blob, originFileNm: 'test', filterType: 'blur', prcMs: 123 });

    expect(mockPost).toHaveBeenCalledWith(
      '/files/save',
      expect.any(FormData),
      expect.objectContaining({
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    );
  });
});

// ── 처리 ─────────────────────────────────────────────────────────────────────

describe('처리', () => {
  it('POST /files/process/batch-tree — batchTreeProcessing', async () => {
    const mockResult = { totalExecutionMs: 100, results: [] };
    mockPost.mockResolvedValue({ data: mockResult });

    const steps = [{ nodeId: 'n1', filterType: 'blur' as const, parameters: {}, parentId: null }];
    const result = await batchTreeProcessing('file-123', steps, { thumbnailSize: 200 });

    expect(mockPost).toHaveBeenCalledWith(
      '/files/process/batch-tree',
      expect.any(FormData),
      expect.objectContaining({ headers: { 'Content-Type': 'multipart/form-data' } }),
    );
    expect(result.totalExecutionMs).toBe(100);
  });
});

// ── Crop ─────────────────────────────────────────────────────────────────────

describe('Crop', () => {
  it('POST /files/crop — createCrop', async () => {
    const mockResponse = { cropId: 'crop-1', nodeImageUrl: '/test.png', width: 100, height: 80 };
    mockPost.mockResolvedValue({ data: mockResponse });

    const result = await createCrop('file-123', [], 'source', { x: 0, y: 0, w: 200, h: 150 });

    expect(mockPost).toHaveBeenCalledWith(
      '/files/crop',
      expect.any(FormData),
      expect.objectContaining({ headers: { 'Content-Type': 'multipart/form-data' } }),
    );
    expect(result.cropId).toBe('crop-1');
  });

  it('POST /files/crop/apply — applyCrop', async () => {
    const mockResponse = { imageBase64: 'abc123', executionMs: 50 };
    mockPost.mockResolvedValue({ data: mockResponse });

    const result = await applyCrop('file-123', 'crop-1', [{ filterType: 'blur' }], {
      x: 0,
      y: 0,
      w: 100,
      h: 100,
    });

    expect(mockPost).toHaveBeenCalledWith(
      '/files/crop/apply',
      expect.any(FormData),
      expect.objectContaining({ headers: { 'Content-Type': 'multipart/form-data' } }),
    );
    expect(result?.imageBase64).toBe('abc123');
    expect(result?.executionMs).toBe(50);
  });

  it('POST /files/crop/apply-all — applyCropAll', async () => {
    const mockResults = [
      { filterType: 'blur', imageBase64: 'aaa', executionMs: 10 },
      { filterType: 'canny', imageBase64: 'bbb', executionMs: 20 },
    ];
    mockPost.mockResolvedValue({ data: mockResults });

    const result = await applyCropAll(
      'file-123',
      'crop-1',
      [{ filterType: 'blur' }, { filterType: 'canny' }],
      { x: 0, y: 0, w: 100, h: 100 },
    );

    expect(mockPost).toHaveBeenCalledWith(
      '/files/crop/apply-all',
      expect.any(FormData),
      expect.objectContaining({ headers: { 'Content-Type': 'multipart/form-data' } }),
    );
    expect(result).toHaveLength(2);
    expect(result[0]!.filterType).toBe('blur');
  });

  it('DELETE /files/crop/{fId}/{cId} — deleteCrop', async () => {
    mockDelete.mockResolvedValue({});

    await deleteCrop('file-123', 'crop-1');

    expect(mockDelete).toHaveBeenCalledWith('/files/crop/file-123/crop-1');
  });
});

// ── DZI / 다운로드 ───────────────────────────────────────────────────────────

describe('DZI / 다운로드', () => {
  it('POST /files/dzi/{id} — getOriginSizeUrl', async () => {
    const mockResponse = { dziUrl: null, imageUrl: '/uploads/cache/test.png' };
    mockPost.mockResolvedValue({ data: mockResponse });

    const steps = [{ nodeId: 'n1', filterType: 'blur' as const, parameters: {}, parentId: null }];
    const result = await getOriginSizeUrl('file-123', steps, 'n1');

    expect(mockPost).toHaveBeenCalledWith(
      '/files/dzi/file-123',
      expect.any(FormData),
      expect.objectContaining({ headers: { 'Content-Type': 'multipart/form-data' } }),
    );
    expect(result.imageUrl).toBe('/uploads/cache/test.png');
  });

  it('POST /files/dzi/{id} — DZI 반환', async () => {
    const mockResponse = { dziUrl: '/uploads/cache/test.dzi', imageUrl: null };
    mockPost.mockResolvedValue({ data: mockResponse });

    const result = await getOriginSizeUrl('file-123', [], 'source');

    expect(result.dziUrl).toBe('/uploads/cache/test.dzi');
    expect(result.imageUrl).toBeNull();
  });

  it('POST /files/download/{id} — downloadNodeImage', async () => {
    const mockBlob = new Blob(['image-data'], { type: 'image/png' });
    mockPost.mockResolvedValue({ data: mockBlob });

    const steps = [{ nodeId: 'n1', filterType: 'blur' as const, parameters: {}, parentId: null }];
    const result = await downloadNodeImage('file-123', steps, 'n1');

    expect(mockPost).toHaveBeenCalledWith(
      '/files/download/file-123',
      expect.any(FormData),
      expect.objectContaining({ responseType: 'blob' }),
    );
    expect(result).toBeInstanceOf(Blob);
  });
});
