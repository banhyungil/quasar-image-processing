/**
 * filesApi 단위 테스트
 *
 * 테스트 대상: src/apis/filesApi.ts의 각 API 함수
 * 테스트 방식: 모듈 레벨 모킹 (axios를 mock으로 교체)
 *
 * 검증 항목:
 * - 각 함수가 올바른 HTTP 메서드와 endpoint를 호출하는지
 * - 인자를 올바른 형식(FormData, params 등)으로 변환하는지
 * - 필요한 헤더(Content-Type 등)를 설정하는지
 * - 응답 데이터를 올바르게 파싱하여 반환하는지
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// axios mock — 실제 네트워크 요청 대신 호출 기록만 남기는 가짜 함수
const mockGet = vi.fn();
const mockPost = vi.fn();
const mockDelete = vi.fn();
const mockPatch = vi.fn();

// src/boot/axios 모듈을 mock으로 교체
// filesApi가 import하는 api 객체가 위의 mock 함수들로 연결됨
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

// 각 테스트 전에 mock 호출 기록을 초기화 → 테스트 간 독립성 보장
beforeEach(() => {
  vi.clearAllMocks();
});

// ── 파일 CRUD ────────────────────────────────────────────────────────────────

describe('파일 CRUD', () => {
  // 검증: options → params 변환 로직 (기본값 추가, 필드 매핑)
  it('GET /files — getFiles', async () => {
    const mockData = { items: [], hasMore: false, nextCursorUploadedAt: null, nextCursorId: null };
    mockGet.mockResolvedValue({ data: mockData });

    const result = await getFiles({ search: 'test', minSize: 100 });

    /**
     * mockGet 함수 호출 인자를 검증한다.
     * 1. 경로 검사
     * 2. params 검사.
     * * expect.objectContaining 함수를 사용하여 객체에 일부 필드만 검사하도록 하였다
     * * 추후에 객체 필드가 증가하더라도 테스트가 깨지지 않고 특정 필드만 검사할 수 있음.
     * * 보통 핵심 필드만 검증하는 편임.
     **/

    expect(mockGet).toHaveBeenCalledWith('/files', {
      params: expect.objectContaining({ search: 'test', minSize: 100 }),
    });
    expect(result).toEqual(mockData);
  });

  // 검증: fileId → URL 경로 조합
  it('DELETE /files/{id} — deleteFile', async () => {
    mockDelete.mockResolvedValue({});

    await deleteFile('file-123');

    expect(mockDelete).toHaveBeenCalledWith('/files/file-123');
  });

  // 검증: fileId → URL 경로 조합 + body에 originNm 필드 구성
  it('PATCH /files/{id} — renameFile', async () => {
    mockPatch.mockResolvedValue({});

    await renameFile('file-123', 'new-name.png');

    expect(mockPatch).toHaveBeenCalledWith('/files/file-123', { originNm: 'new-name.png' });
  });

  // 검증: File → FormData 변환 + multipart 헤더 설정 + 응답 파싱
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

    const formData = mockPost.mock.calls[0]![1] as FormData;
    expect(formData.get('file')).toBeInstanceOf(File);

    expect(result.id).toBe('new-id');
  });

  // 검증: Blob + 메타정보 → FormData 변환 + multipart 헤더 설정
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

    const formData = mockPost.mock.calls[0]![1] as FormData;
    expect(formData.get('blob')).toBeInstanceOf(Blob);
    expect(formData.get('filterType')).toBe('blur');
    expect(formData.get('prcMs')).toBe('123');
  });
});

// ── 처리 ─────────────────────────────────────────────────────────────────────

describe('처리', () => {
  const steps = [{ nodeId: 'n1', filterType: 'blur' as const, parameters: {}, parentId: null }];

  // 검증: fileId + steps + options → FormData 변환 + 응답 파싱
  it('POST /files/process/batch-tree — batchTreeProcessing (썸네일)', async () => {
    const mockResult = { totalExecutionMs: 100, results: [] };
    mockPost.mockResolvedValue({ data: mockResult });

    const result = await batchTreeProcessing('file-123', steps, { thumbnailSize: 200 });

    expect(mockPost).toHaveBeenCalledWith(
      '/files/process/batch-tree',
      expect.any(FormData),
      expect.objectContaining({ headers: { 'Content-Type': 'multipart/form-data' } }),
    );

    const formData = mockPost.mock.calls[0]![1] as FormData;
    expect(formData.get('fileId')).toBe('file-123');
    expect(formData.get('steps')).toBe(JSON.stringify(steps));
    expect(formData.get('thumbnailSize')).toBe('200');
    expect(formData.get('cropId')).toBeNull();
    expect(formData.get('returnNodeIds')).toBeNull();

    expect(result.totalExecutionMs).toBe(100);
  });

  // 검증: 풀해상도 — thumbnailSize 미전송
  it('POST /files/process/batch-tree — 풀해상도 (thumbnailSize 없음)', async () => {
    mockPost.mockResolvedValue({ data: { totalExecutionMs: 50, results: [] } });

    await batchTreeProcessing('file-123', steps);

    const formData = mockPost.mock.calls[0]![1] as FormData;
    expect(formData.get('fileId')).toBe('file-123');
    expect(formData.get('thumbnailSize')).toBeNull();
  });

  // 검증: cropId 전달
  it('POST /files/process/batch-tree — cropId 전달', async () => {
    mockPost.mockResolvedValue({ data: { totalExecutionMs: 80, results: [] } });

    await batchTreeProcessing('file-123', steps, { cropId: 'crop-abc' });

    const formData = mockPost.mock.calls[0]![1] as FormData;
    expect(formData.get('fileId')).toBe('file-123');
    expect(formData.get('cropId')).toBe('crop-abc');
  });

  // 검증: returnNodeIds 전달 (중간 노드 숨기기)
  it('POST /files/process/batch-tree — returnNodeIds 전달', async () => {
    mockPost.mockResolvedValue({ data: { totalExecutionMs: 60, results: [] } });

    await batchTreeProcessing('file-123', steps, { returnNodeIds: ['n1', 'n3'] });

    const formData = mockPost.mock.calls[0]![1] as FormData;
    expect(formData.get('returnNodeIds')).toBe(JSON.stringify(['n1', 'n3']));
  });

  // 검증: cropId + 풀해상도 + returnNodeIds 조합
  it('POST /files/process/batch-tree — 전체 옵션 조합', async () => {
    mockPost.mockResolvedValue({ data: { totalExecutionMs: 120, results: [] } });

    await batchTreeProcessing('file-123', steps, {
      cropId: 'crop-xyz',
      returnNodeIds: ['n1'],
    });

    const formData = mockPost.mock.calls[0]![1] as FormData;
    expect(formData.get('fileId')).toBe('file-123');
    expect(formData.get('cropId')).toBe('crop-xyz');
    expect(formData.get('returnNodeIds')).toBe(JSON.stringify(['n1']));
    expect(formData.get('thumbnailSize')).toBeNull();
  });
});

// ── Crop ─────────────────────────────────────────────────────────────────────

describe('Crop', () => {
  // 검증: fileId + viewport → FormData 변환 + 응답에서 cropId/사이즈 파싱
  it('POST /files/crop — createCrop', async () => {
    const mockResponse = { cropId: 'crop-1', nodeImageUrl: '/test.png', width: 100, height: 80 };
    mockPost.mockResolvedValue({ data: mockResponse });

    const result = await createCrop('file-123', [], 'source', { x: 0, y: 0, w: 200, h: 150 });

    expect(mockPost).toHaveBeenCalledWith(
      '/files/crop',
      expect.any(FormData),
      expect.objectContaining({ headers: { 'Content-Type': 'multipart/form-data' } }),
    );

    const formData = mockPost.mock.calls[0]![1] as FormData;
    expect(formData.get('fileId')).toBe('file-123');
    expect(formData.get('nodeSteps')).toBe(JSON.stringify([]));
    expect(formData.get('nodeId')).toBe('source');
    expect(formData.get('viewport')).toBe(JSON.stringify({ x: 0, y: 0, w: 200, h: 150 }));

    expect(result.cropId).toBe('crop-1');
  });

  // 검증: cropId + 필터 + viewport → FormData 변환 + base64 응답 파싱
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

    const formData = mockPost.mock.calls[0]![1] as FormData;
    expect(formData.get('fileId')).toBe('file-123');
    expect(formData.get('cropId')).toBe('crop-1');
    expect(formData.get('tempSteps')).toBe(JSON.stringify([{ filterType: 'blur' }]));
    expect(formData.get('viewport')).toBe(JSON.stringify({ x: 0, y: 0, w: 100, h: 100 }));

    expect(result?.imageBase64).toBe('abc123');
    expect(result?.executionMs).toBe(50);
  });

  // 검증: 여러 필터 일괄 적용 → FormData 변환 + 배열 응답 파싱
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

    const formData = mockPost.mock.calls[0]![1] as FormData;
    expect(formData.get('fileId')).toBe('file-123');
    expect(formData.get('cropId')).toBe('crop-1');
    expect(formData.get('tempSteps')).toBe(
      JSON.stringify([{ filterType: 'blur' }, { filterType: 'canny' }]),
    );
    expect(formData.get('viewport')).toBe(JSON.stringify({ x: 0, y: 0, w: 100, h: 100 }));

    expect(result).toHaveLength(2);
    expect(result[0]!.filterType).toBe('blur');
  });

  // 검증: fileId + cropId → URL 경로 조합
  it('DELETE /files/crop/{fId}/{cId} — deleteCrop', async () => {
    mockDelete.mockResolvedValue({});

    await deleteCrop('file-123', 'crop-1');

    expect(mockDelete).toHaveBeenCalledWith('/files/crop/file-123/crop-1');
  });
});

// ── DZI / 다운로드 ───────────────────────────────────────────────────────────

describe('DZI / 다운로드', () => {
  // 검증: steps + nodeId → FormData 변환 + dziUrl/imageUrl 응답 파싱
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

    const formData = mockPost.mock.calls[0]![1] as FormData;
    expect(formData.get('steps')).toBe(JSON.stringify(steps));
    expect(formData.get('nodeId')).toBe('n1');

    expect(result.imageUrl).toBe('/uploads/cache/test.png');
  });

  // 검증: DZI 응답 경로 분기 — dziUrl 반환 시 imageUrl은 null
  it('POST /files/dzi/{id} — DZI 반환', async () => {
    const mockResponse = { dziUrl: '/uploads/cache/test.dzi', imageUrl: null };
    mockPost.mockResolvedValue({ data: mockResponse });

    const result = await getOriginSizeUrl('file-123', [], 'source');

    expect(result.dziUrl).toBe('/uploads/cache/test.dzi');
    expect(result.imageUrl).toBeNull();
  });

  // 검증: responseType: 'blob' 설정 + Blob 타입 응답 반환
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

    const formData = mockPost.mock.calls[0]![1] as FormData;
    expect(formData.get('steps')).toBe(JSON.stringify(steps));
    expect(formData.get('nodeId')).toBe('n1');

    expect(result).toBeInstanceOf(Blob);
  });
});
