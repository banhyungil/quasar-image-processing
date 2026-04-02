import type { Edge } from '@vue-flow/core';

import * as presetsApi from 'src/apis/presetsApi';
import type { PresetRes } from 'src/apis/presetsApi';
import type { AppNode, FlatStep } from 'src/types/flowTypes';
import { stepsToFlow, flowToSteps } from 'src/utils/flowConverter';

export function usePresetMgr(
  nodes: Ref<AppNode[]>,
  edges: Ref<Edge[]>,
  oOriginImageUrl: Ref<string | null>,
  getDefaultParams: (filterType: string) => Record<string, unknown>,
  relayout: () => void,
  processAllLeaves: () => void,
) {
  const presets = ref<PresetRes[]>([]);
  const activePresetId = ref<number | null>(null);
  const showSavePresetDialog = ref(false);
  const presetDialogName = ref('');
  const presetDialogDescription = ref('');
  const isEditingPreset = ref(false);

  async function loadPresets() {
    const res = await presetsApi.fetchList();
    presets.value = res.items;
  }

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

  function openSavePresetDialog() {
    isEditingPreset.value = false;
    const active = presets.value.find((p) => p.id === activePresetId.value);
    presetDialogName.value = active ? `${active.nm} copy` : '';
    presetDialogDescription.value = active ? `${active.description}` : '';
    showSavePresetDialog.value = true;
  }

  function openUpdatePresetDialog() {
    if (!activePresetId.value) return;
    isEditingPreset.value = true;
    const active = presets.value.find((p) => p.id === activePresetId.value);
    presetDialogName.value = active?.nm ?? '';
    presetDialogDescription.value = active?.description ?? '';
    showSavePresetDialog.value = true;
  }

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
