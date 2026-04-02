import type { Edge } from '@vue-flow/core';

import * as processesApi from 'src/apis/processesApi';
import type { ProcessResponse } from 'src/apis/processesApi';
import type { AppNode, FlatStep } from 'src/types/flowTypes';
import { stepsToFlow, flowToSteps } from 'src/utils/flowConverter';
import { API_HOST } from 'src/boot/axios';

export function useProcessMgr(
  nodes: Ref<AppNode[]>,
  edges: Ref<Edge[]>,
  oOriginFileId: Ref<number | null>,
  getDefaultParams: (filterType: string) => Record<string, unknown>,
  setOriginalFile: (file: File | null, cropCleanup?: () => void) => Promise<void>,
  relayout: () => void,
  processAllLeaves: () => void,
) {
  const processList = ref<ProcessResponse[]>([]);
  const activeProcessId = ref<number | null>(null);
  const showSaveProcessDialog = ref(false);
  const processDialogName = ref('');
  const isEditingProcess = ref(false);

  async function loadProcessList() {
    const res = await processesApi.fetchList();
    processList.value = res.items;
  }

  async function onProcessDblClick(process: ProcessResponse) {
    activeProcessId.value = process.id;
    const detail = await processesApi.fetchById(process.id);

    if (detail.filePath) {
      const res = await fetch(`${API_HOST}/${detail.filePath}`);
      const blob = await res.blob();
      const fileName = detail.filePath.split('/').pop() ?? 'image.png';
      const file = new File([blob], fileName, { type: blob.type });
      void setOriginalFile(file);
    }

    const flatSteps: FlatStep[] = detail.steps.map((s) => ({
      id: String(s.id),
      parentId: s.parentId != null ? String(s.parentId) : null,
      algorithmNm: s.algorithmNm,
      stepOrder: s.stepOrder,
      parameters: { ...getDefaultParams(s.algorithmNm), ...(s.parameters ?? {}) },
      isEnabled: s.isEnabled,
      executionMs: s.executionMs ?? null,
    }));

    const flow = stepsToFlow(flatSteps, null);
    nodes.value = flow.nodes;
    edges.value = flow.edges;
    void nextTick(() => {
      relayout();
      processAllLeaves();
    });
  }

  function openSaveProcessDialog() {
    isEditingProcess.value = false;
    const active = processList.value.find((p) => p.id === activeProcessId.value);
    processDialogName.value = active ? `${active.nm} copy` : '';
    showSaveProcessDialog.value = true;
  }

  function openUpdateProcessDialog() {
    if (!activeProcessId.value) return;
    isEditingProcess.value = true;
    const active = processList.value.find((p) => p.id === activeProcessId.value);
    processDialogName.value = active?.nm ?? '';
    showSaveProcessDialog.value = true;
  }

  async function onConfirmProcess(name: string) {
    if (!oOriginFileId.value) return;

    const steps = flowToSteps(nodes.value, edges.value);
    const stepPayload = steps.map((s, i) => ({
      algorithmNm: s.algorithmNm,
      stepOrder: i,
      parameters: s.parameters,
      isEnabled: s.isEnabled ?? true,
      clientId: s.id,
      parentClientId: s.parentId,
    }));

    if (isEditingProcess.value && activeProcessId.value) {
      await processesApi.update(activeProcessId.value, {
        nm: name,
        steps: stepPayload,
      });
    } else {
      const fileId = oOriginFileId.value;
      const created = await processesApi.create({
        nm: name,
        fileId,
        steps: stepPayload,
      });
      activeProcessId.value = created.id;
    }
    showSaveProcessDialog.value = false;
    await loadProcessList();
  }

  async function removeProcess(processId: number) {
    await processesApi.remove(processId);
    if (activeProcessId.value === processId) {
      activeProcessId.value = null;
    }
    await loadProcessList();
  }

  return {
    processList,
    activeProcessId,
    showSaveProcessDialog,
    processDialogName,
    isEditingProcess,
    loadProcessList,
    onProcessDblClick,
    openSaveProcessDialog,
    openUpdateProcessDialog,
    onConfirmProcess,
    removeProcess,
  };
}
