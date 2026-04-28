/**
 * MetaPreview — meta.json 직렬화 결과를 prose-friendly 코드 블록으로 표시.
 */

interface Props {
  json: string;
  maxHeight?: number;
}

export default function MetaPreview({ json, maxHeight = 480 }: Props) {
  return (
    <pre
      className="font-mono text-xs text-gray-300 bg-gray-900 border border-gray-700 rounded p-3 overflow-auto whitespace-pre"
      style={{ maxHeight }}
      data-testid="export-meta-preview"
    >
      {json}
    </pre>
  );
}
