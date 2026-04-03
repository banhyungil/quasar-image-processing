import type { Edge } from '@vue-flow/core';

import * as presetsApi from 'src/apis/presetsApi';
import type { PresetRes } from 'src/apis/presetsApi';
import { getDefaultParams } from 'src/constants/imgPrc';
import type { AppNode, FlatStep } from 'src/types/flowTypes';
import { stepsToFlow, flowToSteps } from 'src/utils/flowConverter';

/** Preset CRUD(목록 조회, 로드, 저장, 수정, 삭제)를 관리하는 composable */
export function usePresetMgr({
  nodes,
  edges,
  oOriginImageUrl,
  relayout,
  processAllLeaves,
}: {
  nodes: Ref<AppNode[]>;
  edges: Ref<Edge[]>;
  oOriginImageUrl: Ref<string | null>;
  relayout: () => void;
  processAllLeaves: () => void;
}) {
  const presets = ref<PresetRes[]>([]);
  const activePresetId = ref<number | null>(null);
  const showSavePresetDialog = ref(false);
  const presetDialogName = ref('');
  const presetDialogDescription = ref('');
  const isEditingPreset = ref(false);

  /** 서버에서 프리셋 목록을 조회하여 presets에 반영 */
  async function loadPresets() {
    const res = await presetsApi.fetchList();
    presets.value = res.items;
  }

  /** 선택한 프리셋의 steps를 flow로 변환하여 캔버스에 로드 */
  function loadPreset(preset: PresetRes) {
    activePresetId.value = preset.id;
    const flatSteps: FlatStep[] = preset.steps.map((s) => ({
      id: String(s.id),
      parentId: s.parentId != null ? String(s.parentId) : null,
      algorithmNm: s.algorithmNm,
      stepOrder: s.stepOrder,
      parameters: { ...getDefaultParams(s.algorithmNm), ...(s.parameters ?? {}) },
      isEnabled: true,
    }));
    const flow = stepsToFlow(flatSteps, oOriginImageUrl.value);
    nodes.value = flow.nodes;
    edges.value = flow.edges;
    void nextTick(() => {
      relayout();
      processAllLeaves();
    });
  }

  /** 새 프리셋 저장 다이얼로그를 열고 초기값 설정 */
  function openSavePresetDialog() {
    isEditingPreset.value = false;
    const active = presets.value.find((p) => p.id === activePresetId.value);
    presetDialogName.value = active ? `${active.nm} copy` : '';
    presetDialogDescription.value = active ? `${active.description}` : '';
    showSavePresetDialog.value = true;
  }

  /** 기존 프리셋 수정 다이얼로그를 열고 현재 값으로 초기화 */
  function openUpdatePresetDialog() {
    if (!activePresetId.value) return;
    isEditingPreset.value = true;
    const active = presets.value.find((p) => p.id === activePresetId.value);
    presetDialogName.value = active?.nm ?? '';
    presetDialogDescription.value = active?.description ?? '';
    showSavePresetDialog.value = true;
  }

  /** 프리셋 저장/수정 확인 시 현재 flow를 steps로 변환하여 API 호출 */
  async function onConfirmPreset(name: string, description: string) {
    const steps = flowToSteps(nodes.value, edges.value);
    const stepPayload = steps.map((s, i) => ({
      algorithmNm: s.algorithmNm,
      stepOrder: i,
      parameters: s.parameters,
      clientId: s.id,
      parentClientId: s.parentId,
    }));

    if (isEditingPreset.value && activePresetId.value) {
      await presetsApi.update(activePresetId.value, {
        nm: name,
        description: description || null,
        steps: stepPayload,
      });
    } else {
      const created = await presetsApi.create({
        nm: name,
        description: description || null,
        steps: stepPayload,
      });
      activePresetId.value = created.id;
    }
    showSavePresetDialog.value = false;
    await loadPresets();
  }

  /** 프리셋 삭제 후 목록 갱신 */
  async function removePreset(presetId: number) {
    await presetsApi.remove(presetId);
    if (activePresetId.value === presetId) {
      activePresetId.value = null;
    }
    await loadPresets();
  }

  return {
    presets,
    activePresetId,
    showSavePresetDialog,
    presetDialogName,
    presetDialogDescription,
    isEditingPreset,
    loadPresets,
    loadPreset,
    openSavePresetDialog,
    openUpdatePresetDialog,
    onConfirmPreset,
    removePreset,
  };
}
