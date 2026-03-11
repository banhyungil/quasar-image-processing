import type { Ref } from 'vue';
import type * as Monaco from 'monaco-editor';
import type { ParamFieldDef } from 'src/constants/imgPrc';

export function useParamCompletion(paramDefs: Ref<ParamFieldDef[]>) {
  let disposable: Monaco.IDisposable | null = null;

  function register(_editor: Monaco.editor.IStandaloneCodeEditor, monaco: typeof Monaco) {
    disposable?.dispose();
    disposable = monaco.languages.registerCompletionItemProvider('python', {
      triggerCharacters: ['.', "'", '"'],
      provideCompletionItems(model, position) {
        const line = model.getValueInRange({
          startLineNumber: position.lineNumber,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        });

        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endLineNumber: position.lineNumber,
          endColumn: word.endColumn,
        };

        // params. 또는 params.get(' 입력 시 파라미터 key 제안
        if (/params\.(get\(\s*['"]?)?$/.test(line)) {
          return {
            suggestions: paramDefs.value
              .filter((p) => p.key)
              .map((p) => ({
                label: p.key,
                kind: monaco.languages.CompletionItemKind.Variable,
                detail: `${p.label} (${p.type}, default: ${p.default})`,
                insertText: /get\(\s*['"]?$/.test(line)
                  ? `${p.key}', ${p.default})`
                  : `get('${p.key}', ${p.default})`,
                range,
              })),
          };
        }

        return { suggestions: [] };
      },
    });
  }

  onUnmounted(() => disposable?.dispose());

  return { register };
}
