import { useEventListener } from '@vueuse/core';

export function useNodeResize(
  nodeWidth: Ref<number>,
  nodeThumbHeight: Ref<number>,
  onComplete: (width: number, height: number) => void,
) {
  const resizing = ref(false);
  const resizeStart = { x: 0, y: 0, w: 0, h: 0 };
  const liveWidth = ref(0);
  const liveHeight = ref(0);

  let cleanupMove: (() => void) | null = null;
  let cleanupUp: (() => void) | null = null;

  function onResizeMouseMove(e: MouseEvent) {
    const dx = e.clientX - resizeStart.x;
    const dy = e.clientY - resizeStart.y;
    liveWidth.value = Math.max(120, Math.round(resizeStart.w + dx));
    liveHeight.value = Math.max(60, Math.round(resizeStart.h + dy));
  }

  function onResizeMouseUp() {
    resizing.value = false;
    cleanupMove?.();
    cleanupUp?.();
    cleanupMove = null;
    cleanupUp = null;
    onComplete(liveWidth.value, liveHeight.value);
  }

  function onResizeMouseDown(e: MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    resizing.value = true;
    resizeStart.x = e.clientX;
    resizeStart.y = e.clientY;
    resizeStart.w = nodeWidth.value;
    resizeStart.h = nodeThumbHeight.value;
    liveWidth.value = resizeStart.w;
    liveHeight.value = resizeStart.h;

    cleanupMove = useEventListener(window, 'mousemove', onResizeMouseMove);
    cleanupUp = useEventListener(window, 'mouseup', onResizeMouseUp);
  }

  const cWidth = computed(() => (resizing.value ? liveWidth.value : nodeWidth.value));
  const cThumbHeight = computed(() => (resizing.value ? liveHeight.value : nodeThumbHeight.value));

  return { resizing, cWidth, cThumbHeight, onResizeMouseDown };
}
