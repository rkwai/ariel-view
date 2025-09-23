import mermaid from 'mermaid';

export type MermaidRenderResult = {
  svg: string;
  bindFunctions?: (element: Element) => void;
  definition: string;
  renderId: string;
};

const baseConfig: mermaid.Config = {
  startOnLoad: false,
  securityLevel: 'loose',
  deterministicIds: true,
  theme: 'dark',
  fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
};

let renderCounter = 0;
let configured = false;

export function configureMermaid(config?: mermaid.Config): void {
  const merged = {
    ...baseConfig,
    ...config
  } satisfies mermaid.Config;

  mermaid.initialize(merged);
  configured = true;
}

export async function renderMermaidSvg(definition: string): Promise<MermaidRenderResult> {
  if (!configured) {
    configureMermaid();
  }

  const renderId = `ariel-view-${renderCounter++}`;
  const { svg, bindFunctions } = await mermaid.render(renderId, definition);

  return {
    svg,
    bindFunctions,
    definition,
    renderId
  };
}

export function toSvgBlob(svg: string): Blob {
  return new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
}

export function createSvgDataUri(svg: string): string {
  const encoded = encodeURIComponent(svg).replace(/%0A/g, '\\n');
  return `data:image/svg+xml;charset=utf-8,${encoded}`;
}
