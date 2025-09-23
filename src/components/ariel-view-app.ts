import {
  configureMermaid,
  renderMermaidSvg,
  MermaidRenderResult,
  toSvgBlob
} from '../renderer/mermaid-renderer';

type ThemeMode = 'dark' | 'light';
type ViewBoxState = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const DEFAULT_DIAGRAM = `%% Sample flowchart
flowchart TD
  Start((Start)) --> Decide{Ready?}
  Decide -- Yes --> Work["Build with Mermaid"]
  Decide -- No --> Pause[/Take a breath/]
  Work --> Review{Looks good?}
  Review -- Iterate --> Work
  Review -- Ship --> End((Celebrate))
`;

const prefersLight =
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: light)').matches
    : false;

const INITIAL_THEME: ThemeMode = prefersLight ? 'light' : 'dark';

configureMermaid({ theme: INITIAL_THEME === 'dark' ? 'dark' : 'default' });

const template = document.createElement('template');

template.innerHTML = `
  <style>
    :host {
      --editor-width: 25%;
      --background: radial-gradient(circle at 20% 20%, rgba(73, 133, 224, 0.18), transparent 42%),
        radial-gradient(circle at 80% 0%, rgba(160, 71, 255, 0.2), transparent 48%),
        #050d19;
      --frame-surface: rgba(9, 20, 35, 0.9);
      --frame-border: rgba(255, 255, 255, 0.06);
      --toolbar-surface: rgba(12, 26, 47, 0.92);
      --textarea-bg: rgba(8, 18, 33, 0.96);
      --preview-bg: rgba(6, 14, 24, 0.95);
      --accent-bg: rgba(79, 175, 255, 0.22);
      --accent-bg-hover: rgba(127, 198, 255, 0.38);
      --text-primary: #f7fafc;
      --text-muted: rgba(247, 250, 252, 0.74);
      --status-muted: rgba(230, 242, 255, 0.6);
      --placeholder-border: rgba(255, 255, 255, 0.22);
      --preview-surface: rgba(11, 24, 40, 0.9);
      --preview-border: rgba(123, 192, 255, 0.28);
      --error-bg: rgba(202, 76, 92, 0.18);
      --error-border: rgba(255, 119, 139, 0.35);
      --error-text: rgba(255, 205, 211, 0.9);
      display: flex;
      min-height: 100vh;
      background: var(--background);
      color: var(--text-primary);
      font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      padding: 0;
      box-sizing: border-box;
      transition: background 0.25s ease, color 0.25s ease;
    }

    :host([data-theme='light']) {
      --background: radial-gradient(circle at 12% 12%, rgba(109, 184, 255, 0.22), transparent 40%),
        radial-gradient(circle at 100% 0%, rgba(255, 174, 255, 0.16), transparent 46%),
        #f5faff;
      --frame-surface: rgba(255, 255, 255, 0.95);
      --frame-border: rgba(13, 44, 88, 0.1);
      --toolbar-surface: rgba(239, 244, 255, 0.9);
      --textarea-bg: rgba(247, 249, 255, 0.97);
      --preview-bg: rgba(250, 252, 255, 0.98);
      --preview-surface: rgba(255, 255, 255, 0.88);
      --preview-border: rgba(43, 111, 215, 0.25);
      --accent-bg: rgba(43, 111, 215, 0.18);
      --accent-bg-hover: rgba(43, 111, 215, 0.3);
      --text-primary: #0b1120;
      --text-muted: rgba(14, 35, 68, 0.74);
      --status-muted: rgba(13, 35, 68, 0.56);
      --placeholder-border: rgba(15, 65, 132, 0.18);
      --error-bg: rgba(231, 92, 112, 0.15);
      --error-border: rgba(231, 92, 112, 0.32);
      --error-text: rgba(158, 38, 54, 0.82);
    }

    main {
      flex: 1;
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100vh;
      min-height: 100vh;
      background: var(--frame-surface);
      border-radius: 0.75rem;
      border: 1px solid var(--frame-border);
      box-shadow: 0 1rem 2.5rem rgba(5, 14, 26, 0.4);
      overflow: hidden;
      backdrop-filter: blur(10px);
    }

    header {
      display: flex;
      align-items: center;
      gap: clamp(0.4rem, 1.5vw, 0.9rem);
      padding: clamp(0.6rem, 1.75vw, 1rem) clamp(1rem, 2.5vw, 1.5rem);
      border-bottom: 1px solid var(--frame-border);
      flex-wrap: wrap;
    }

    .brand {
      display: inline-flex;
      align-items: center;
      gap: 0.65rem;
      min-width: 0;
    }

    .brand h1 {
      margin: 0;
      font-size: clamp(1.4rem, 3vw, 1.9rem);
      letter-spacing: -0.03em;
      white-space: nowrap;
    }

    .toolbar {
      margin-left: auto;
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      flex-wrap: wrap;
    }

    .toolbar button {
      appearance: none;
      border: none;
      border-radius: 999px;
      padding: 0.42rem 0.95rem;
      font-size: 0.82rem;
      font-weight: 600;
      letter-spacing: 0.02em;
      cursor: pointer;
      background: var(--accent-bg);
      color: inherit;
      transition: background 0.2s ease, transform 0.15s ease;
    }

    .toolbar button:hover {
      background: var(--accent-bg-hover);
    }

    .toolbar button:active {
      transform: translateY(1px);
    }

    .toolbar button:disabled {
      cursor: not-allowed;
      opacity: 0.45;
      transform: none;
    }

    .toolbar-status {
      margin-left: clamp(0.4rem, 2vw, 1rem);
      font-size: 0.78rem;
      color: var(--status-muted);
    }

    .panes {
      flex: 1;
      min-height: 0;
      display: grid;
      grid-template-columns: 25% 75%;
      grid-template-rows: 1fr;
      column-gap: clamp(0.75rem, 1.5vw, 1.25rem);
      row-gap: 0;
      padding: clamp(0.5rem, 1.25vw, 0.9rem);
      box-sizing: border-box;
    }

    .pane {
      display: flex;
      flex-direction: column;
      min-width: 0;
      min-height: 0;
    }

    .pane-editor,
    .pane-preview {
      min-height: 0;
      min-width: 0;
    }
    .pane-editor {
      padding: clamp(0.5rem, 1vw, 0.8rem);
      background: transparent;
    }

    .pane-preview {
      padding: clamp(0.5rem, 1vw, 0.8rem);
      background: transparent;
    }

    .pane-preview > * {
      flex: 1;
    }


    .editor-label {
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
      height: 100%;
    }

    .label-title {
      font-size: 0.82rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--text-muted);
    }

    .label-hint {
      font-size: 0.76rem;
      color: var(--status-muted);
    }

    textarea {
      flex: 1;
      width: 100%;
      height: 100%;
      border-radius: 0.75rem;
      border: 1px solid rgba(123, 192, 255, 0.45);
      background: var(--textarea-bg);
      color: inherit;
      outline: none;
      font: inherit;
      min-height: 0;
      padding: clamp(0.85rem, 2vw, 1.2rem);
      line-height: 1.55;
      letter-spacing: 0.01em;
      resize: none;
      box-shadow: inset 0 0 0 1px rgba(123, 192, 255, 0.25);
      transition: border 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
    }

    :host([data-theme='light']) textarea {
      caret-color: #2c5acb;
    }

    textarea:focus-visible {
      border-color: rgba(123, 192, 255, 0.85);
      box-shadow: 0 0 0 3px rgba(108, 176, 255, 0.22);
    }

    textarea::selection {
      background: rgba(80, 154, 255, 0.35);
    }

    textarea::placeholder {
      color: rgba(247, 250, 252, 0.5);
    }

    .preview {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0;
      background: var(--preview-surface);
      border: 1px solid var(--preview-border);
      border-radius: 0.75rem;
      padding: 0;
      overflow: hidden;
    }

    .preview-stage {
      flex: 1;
      position: relative;
      width: 100%;
      height: 100%;
      background: var(--preview-bg);
      border-radius: 0.6rem;
      overflow: hidden;
      cursor: grab;
      touch-action: none;
      display: flex;
      align-items: stretch;
      justify-content: stretch;
    }

    .preview-stage.is-panning {
      cursor: grabbing;
      user-select: none;
    }

    .preview-content {
      flex: 1;
      width: 100%;
      height: 100%;
      overflow: hidden;
      display: flex;
      align-items: stretch;
      justify-content: stretch;
    }

    .preview svg {
      flex: 1;
      width: 100%;
      height: 100%;
      max-width: none;
      max-height: none;
      display: block;
    }

    .placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      min-height: 220px;
      border: 1px dashed var(--placeholder-border);
      border-radius: 0.75rem;
      padding: 2rem;
      color: var(--text-muted);
      font-size: 0.95rem;
    }

    .placeholder[hidden] {
      display: none;
    }

    .error-box {
      margin: 0;
      padding: 1rem;
      border-radius: 0.75rem;
      background: var(--error-bg);
      border: 1px solid var(--error-border);
      color: var(--error-text);
      font-size: 0.88rem;
      display: grid;
      gap: 0.5rem;
    }

    .error-box[hidden] {
      display: none;
    }

    .error-title {
      font-weight: 600;
      letter-spacing: 0.01em;
    }

    .error-message {
      margin: 0;
      font-family: "JetBrains Mono", "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .error-tip {
      margin: 0;
      font-size: 0.82rem;
      color: inherit;
    }

    .error-tip[hidden] {
      display: none;
    }

  </style>
  <main>
    <header>
      <div class="brand">
        <h1>Ariel View</h1>
      </div>
      <div class="toolbar" role="toolbar" aria-label="Diagram actions">
        <button type="button" data-action="copy-html" disabled>Copy SVG markup</button>
        <button type="button" data-action="download-svg" disabled>Download SVG</button>
        <button type="button" data-action="toggle-theme">Switch to light theme</button>
        <span class="toolbar-status" aria-live="polite"></span>
      </div>
    </header>
    <section class="panes">
      <div class="pane pane-editor">
        <label class="editor-label">
          <span class="label-title">Mermaid diagram input</span>
          <textarea
            placeholder="Paste Mermaid syntax here..."
            spellcheck="false"
            autocapitalize="off"
            autocomplete="off"
            aria-label="Mermaid definition editor"
          ></textarea>
          <span class="label-hint">Tip: labels inside [ ] should be quoted when they include spaces.</span>
        </label>
      </div>
      <div class="pane pane-preview">
        <div class="preview" aria-live="polite">
          <div class="preview-stage" hidden>
            <div class="preview-content"></div>
          </div>
          <div class="placeholder">
            Mermaid render preview will appear here.
          </div>
          <div class="error-box" role="alert" hidden>
            <div class="error-title">Render failed</div>
            <pre class="error-message"></pre>
            <p class="error-tip" hidden></p>
          </div>
        </div>
      </div>
    </section>
  </main>
`;

export class ArielViewApp extends HTMLElement {
  private textarea!: HTMLTextAreaElement;
  private toolbarStatus!: HTMLSpanElement;
  private themeToggle!: HTMLButtonElement;
  private preview!: HTMLDivElement;
  private previewStage!: HTMLDivElement;
  private previewContent!: HTMLDivElement;
  private placeholder!: HTMLDivElement;
  private errorBox!: HTMLDivElement;
  private errorMessage!: HTMLPreElement;
  private errorTip!: HTMLParagraphElement;
  private renderHandle: number | null = null;
  private lastRender: MermaidRenderResult | null = null;
  private theme: ThemeMode = INITIAL_THEME;

  private currentSvg: SVGSVGElement | null = null;
  private initialViewBox: ViewBoxState | null = null;
  private viewBox: ViewBoxState | null = null;
  private panStartViewBox: ViewBoxState | null = null;
  private minZoomWidth = 0;
  private maxZoomWidth = 0;

  private isPanning = false;
  private activePointerId: number | null = null;
  private pointerStartX = 0;
  private pointerStartY = 0;

  constructor() {
    super();

    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(template.content.cloneNode(true));

    this.textarea = shadow.querySelector('textarea') as HTMLTextAreaElement;
    this.toolbarStatus = shadow.querySelector('.toolbar-status') as HTMLSpanElement;
    this.themeToggle = shadow.querySelector('button[data-action="toggle-theme"]') as HTMLButtonElement;
    this.preview = shadow.querySelector('.preview') as HTMLDivElement;
    this.previewStage = shadow.querySelector('.preview-stage') as HTMLDivElement;
    this.previewContent = shadow.querySelector('.preview-content') as HTMLDivElement;
    this.placeholder = shadow.querySelector('.placeholder') as HTMLDivElement;
    this.errorBox = shadow.querySelector('.error-box') as HTMLDivElement;
    this.errorMessage = shadow.querySelector('.error-message') as HTMLPreElement;
    this.errorTip = shadow.querySelector('.error-tip') as HTMLParagraphElement;

    this.textarea.value = DEFAULT_DIAGRAM.trim();
    this.textarea.addEventListener('input', this.onInput);

    const toolbar = shadow.querySelector('.toolbar');
    toolbar?.addEventListener('click', this.onToolbarClick);


    this.previewStage.addEventListener('wheel', this.onStageWheel, { passive: false });
    this.previewStage.addEventListener('pointerdown', this.onStagePointerDown);
    this.previewStage.addEventListener('pointermove', this.onStagePointerMove);
    this.previewStage.addEventListener('pointerup', this.onStagePointerUp);
    this.previewStage.addEventListener('pointercancel', this.onStagePointerUp);
    this.previewStage.addEventListener('lostpointercapture', this.onStagePointerUp);
    this.previewStage.addEventListener('dblclick', this.onStageDoubleClick);

    this.applyTheme();
  }

  connectedCallback(): void {
    queueMicrotask(() => {
      this.renderDiagram(this.textarea.value).catch(() => {
        /* handled in render */
      });
    });
  }

  disconnectedCallback(): void {
    this.textarea.removeEventListener('input', this.onInput);

    const toolbar = this.shadowRoot?.querySelector('.toolbar');
    toolbar?.removeEventListener('click', this.onToolbarClick);


    this.previewStage.removeEventListener('wheel', this.onStageWheel);
    this.previewStage.removeEventListener('pointerdown', this.onStagePointerDown);
    this.previewStage.removeEventListener('pointermove', this.onStagePointerMove);
    this.previewStage.removeEventListener('pointerup', this.onStagePointerUp);
    this.previewStage.removeEventListener('pointercancel', this.onStagePointerUp);
    this.previewStage.removeEventListener('lostpointercapture', this.onStagePointerUp);
    this.previewStage.removeEventListener('dblclick', this.onStageDoubleClick);

    if (this.renderHandle !== null) {
      window.clearTimeout(this.renderHandle);
      this.renderHandle = null;
    }
  }

  private onInput = (): void => {
    if (this.renderHandle !== null) {
      window.clearTimeout(this.renderHandle);
    }

    this.renderHandle = window.setTimeout(() => {
      this.renderDiagram(this.textarea.value).catch(() => {
        /* handled in render */
      });
    }, 180);
  };

  private onToolbarClick = (event: Event): void => {
    const target = event.target;

    if (!(target instanceof HTMLElement) || !target.dataset.action) {
      return;
    }

    switch (target.dataset.action) {
      case 'copy-html':
        void this.copyCurrentMarkup();
        break;
      case 'download-svg':
        this.downloadCurrentSvg();
        break;
      case 'toggle-theme':
        this.toggleTheme();
        break;
      default:
        break;
    }
  };

  private async renderDiagram(definition: string, allowAutoFix = true): Promise<void> {
    this.renderHandle = null;

    if (!definition.trim()) {
      this.resetPreviewState();
      this.clearError();
      this.lastRender = null;
      this.setToolbarState(false);
      this.setToolbarStatus('');
      return;
    }

    try {
      const result = await renderMermaidSvg(definition);

      this.previewContent.innerHTML = result.svg;

      if (result.bindFunctions) {
        result.bindFunctions(this.previewContent);
      }

      this.currentSvg = this.previewContent.querySelector('svg');

      if (this.currentSvg) {
        this.currentSvg.removeAttribute('style');
        Object.assign(this.currentSvg.style, {
          width: '100%',
          height: '100%',
          maxWidth: 'none',
          maxHeight: 'none',
          display: 'block'
        });
      }

      this.initializeSvgViewport();

      const hasSvg = Boolean(this.currentSvg);
      this.previewStage.hidden = !hasSvg;
      this.placeholder.hidden = hasSvg;
      this.previewStage.classList.remove('is-panning');
      this.isPanning = false;
      this.activePointerId = null;
      this.panStartViewBox = null;

      if (hasSvg) {
        this.resetView(true);
      }

      this.clearError();
      this.lastRender = result;
      this.setToolbarState(true);
      this.setToolbarStatus(`Rendered (${this.theme} mode)`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (allowAutoFix && this.tryAutoQuoteFix(definition)) {
        return;
      }

      this.previewContent.innerHTML = '';
      this.currentSvg = null;
      this.previewStage.hidden = true;
      this.placeholder.hidden = true;
      this.lastRender = null;
      this.setToolbarState(false);
      this.setToolbarStatus('Render error');
      this.showError(message);
    }
  }

  private resetPreviewState(): void {
    this.previewContent.innerHTML = '';
    this.previewStage.hidden = true;
    this.placeholder.hidden = false;
    this.currentSvg = null;
    this.initialViewBox = null;
    this.viewBox = null;
    this.panStartViewBox = null;
  }

  private initializeSvgViewport(): void {
    if (!this.currentSvg) {
      this.initialViewBox = null;
      this.viewBox = null;
      return;
    }

    const viewBox = this.extractViewBox(this.currentSvg);
    this.initialViewBox = { ...viewBox };
    this.viewBox = { ...viewBox };
    this.minZoomWidth = viewBox.width / 16;
    this.maxZoomWidth = viewBox.width * 6;

    if (!this.currentSvg.getAttribute('preserveAspectRatio')) {
      this.currentSvg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    }

    this.currentSvg.setAttribute('width', '100%');
    this.currentSvg.setAttribute('height', '100%');
    this.applyViewBox();
  }

  private extractViewBox(svg: SVGSVGElement): ViewBoxState {
    const attr = svg.getAttribute('viewBox');

    if (attr) {
      const parts = attr.trim().split(/[\s,]+/).map((part) => Number(part));
      const [x = 0, y = 0, width = 1, height = 1] = parts;
      return {
        x,
        y,
        width: width || 1,
        height: height || 1
      };
    }

    const widthAttr = Number(svg.getAttribute('width'));
    const heightAttr = Number(svg.getAttribute('height'));

    if (widthAttr > 0 && heightAttr > 0) {
      const box = { x: 0, y: 0, width: widthAttr, height: heightAttr };
      svg.setAttribute('viewBox', `${box.x} ${box.y} ${box.width} ${box.height}`);
      return box;
    }

    const bbox = svg.getBBox();
    const box = {
      x: bbox.x,
      y: bbox.y,
      width: bbox.width || 1,
      height: bbox.height || 1
    };

    svg.setAttribute('viewBox', `${box.x} ${box.y} ${box.width} ${box.height}`);

    if (!svg.getAttribute('width')) {
      svg.setAttribute('width', String(box.width));
    }

    if (!svg.getAttribute('height')) {
      svg.setAttribute('height', String(box.height));
    }

    return box;
  }

  private applyViewBox(): void {
    if (!this.currentSvg || !this.viewBox) {
      return;
    }

    const { x, y, width, height } = this.viewBox;
    this.currentSvg.setAttribute('viewBox', `${x} ${y} ${width} ${height}`);
  }

  private resetView(silent = true): void {
    if (!this.currentSvg || !this.initialViewBox) {
      return;
    }

    this.viewBox = { ...this.initialViewBox };
    this.applyViewBox();

    if (!silent) {
      this.setToolbarStatus('View reset');
    }
  }

  private updateViewBox(next: ViewBoxState): void {
    this.viewBox = next;
    this.applyViewBox();
  }

  private async copyCurrentMarkup(): Promise<void> {
    if (!this.lastRender) {
      this.setToolbarStatus('Nothing to copy');
      return;
    }

    try {
      await navigator.clipboard.writeText(this.lastRender.svg);
      this.setToolbarStatus('Markup copied to clipboard');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.setToolbarStatus(`Copy failed: ${message}`);
    }
  }

  private downloadCurrentSvg(): void {
    if (!this.lastRender) {
      this.setToolbarStatus('Nothing to download');
      return;
    }

    const blob = toSvgBlob(this.lastRender.svg);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'diagram.svg';

    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    this.setToolbarStatus('SVG download started');
  }

  private toggleTheme(): void {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
    configureMermaid({ theme: this.theme === 'dark' ? 'dark' : 'default' });
    this.applyTheme();
    void this.renderDiagram(this.textarea.value);
  }

  private applyTheme(): void {
    this.setAttribute('data-theme', this.theme);
    if (this.themeToggle) {
      this.themeToggle.textContent = this.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
    }
  }

  private setToolbarStatus(message: string): void {
    if (!this.toolbarStatus) {
      return;
    }

    this.toolbarStatus.textContent = message;
  }

  private setToolbarState(enabled: boolean): void {
    const toolbar = this.shadowRoot?.querySelector('.toolbar');
    if (!toolbar) {
      return;
    }

    const buttons = toolbar.querySelectorAll('button[data-action]');
    buttons.forEach((button) => {
      const action = (button as HTMLButtonElement).dataset.action;
      if (action === 'toggle-theme') {
        return;
      }
      (button as HTMLButtonElement).disabled = !enabled;
    });
  }

  private onStageWheel = (event: WheelEvent): void => {
    if (!this.viewBox || !this.initialViewBox || this.previewStage.hidden) {
      return;
    }

    event.preventDefault();

    const scale = event.deltaY < 0 ? 1 / 1.15 : 1.15;
    let newWidth = this.viewBox.width * scale;
    newWidth = this.clamp(newWidth, this.minZoomWidth || this.viewBox.width / 16, this.maxZoomWidth || this.viewBox.width * 6);
    const factor = newWidth / this.viewBox.width;
    const newHeight = this.viewBox.height * factor;

    const centerX = this.viewBox.x + this.viewBox.width / 2;
    const centerY = this.viewBox.y + this.viewBox.height / 2;

    let newX = centerX - newWidth / 2;
    let newY = centerY - newHeight / 2;

    const bounds = this.initialViewBox;
    const minX = bounds.x - bounds.width;
    const maxX = bounds.x + bounds.width;
    const minY = bounds.y - bounds.height;
    const maxY = bounds.y + bounds.height;

    newX = this.clamp(newX, minX, maxX);
    newY = this.clamp(newY, minY, maxY);

    this.updateViewBox({
      x: newX,
      y: newY,
      width: newWidth,
      height: newHeight
    });
  };

  private onStagePointerDown = (event: PointerEvent): void => {
    if (!this.viewBox || event.button !== 0) {
      return;
    }

    this.previewStage.setPointerCapture(event.pointerId);
    this.isPanning = true;
    this.activePointerId = event.pointerId;
    this.pointerStartX = event.clientX;
    this.pointerStartY = event.clientY;
    this.panStartViewBox = { ...this.viewBox };
    this.previewStage.classList.add('is-panning');
  };

  private onStagePointerMove = (event: PointerEvent): void => {
    if (!this.isPanning || this.activePointerId !== event.pointerId || !this.panStartViewBox) {
      return;
    }

    const stageRect = this.previewStage.getBoundingClientRect();
    if (stageRect.width === 0 || stageRect.height === 0) {
      return;
    }

    const deltaX = event.clientX - this.pointerStartX;
    const deltaY = event.clientY - this.pointerStartY;

    const scaleX = this.panStartViewBox.width / stageRect.width;
    const scaleY = this.panStartViewBox.height / stageRect.height;

    let newX = this.panStartViewBox.x - deltaX * scaleX;
    let newY = this.panStartViewBox.y - deltaY * scaleY;

    if (this.initialViewBox) {
      const minX = this.initialViewBox.x - this.initialViewBox.width;
      const maxX = this.initialViewBox.x + this.initialViewBox.width;
      const minY = this.initialViewBox.y - this.initialViewBox.height;
      const maxY = this.initialViewBox.y + this.initialViewBox.height;
      newX = this.clamp(newX, minX, maxX);
      newY = this.clamp(newY, minY, maxY);
    }

    this.updateViewBox({
      x: newX,
      y: newY,
      width: this.panStartViewBox.width,
      height: this.panStartViewBox.height
    });
  };

  private onStagePointerUp = (event: PointerEvent): void => {
    if (this.activePointerId !== event.pointerId) {
      return;
    }

    this.isPanning = false;
    this.activePointerId = null;
    this.panStartViewBox = null;
    this.previewStage.classList.remove('is-panning');
  };

  private onStageDoubleClick = (): void => {
    if (!this.currentSvg) {
      return;
    }

    this.resetView(false);
  };

  private clamp(value: number, min: number, max: number): number {
    if (Number.isNaN(value)) {
      return min;
    }
    return Math.min(max, Math.max(min, value));
  }

  private showError(message: string): void {
    this.errorBox.hidden = false;
    this.errorMessage.textContent = message;
    this.errorTip.hidden = true;
    this.errorTip.textContent = '';
  }

  private clearError(): void {
    this.errorBox.hidden = true;
    this.errorMessage.textContent = '';
    this.errorTip.hidden = true;
    this.errorTip.textContent = '';
  }

  private tryAutoQuoteFix(definition: string): boolean {
    const fixed = this.createQuotedBracketFix(definition);

    if (!fixed || fixed === definition) {
      return false;
    }

    this.textarea.value = fixed;
    this.setToolbarStatus('Automatically quoted bracket labels');
    void this.renderDiagram(fixed, false);
    return true;
  }

  private createQuotedBracketFix(definition: string): string | null {

    let changed = false;
    const fixed = definition.replace(/\[([^"\]\n]*\s[^"\]\n]*)\]/g, (match, label) => {
      const trimmed = String(label).trim();
      if (!trimmed) {
        return match;
      }
      changed = true;
      return `["${trimmed}"]`;
    });

    return changed ? fixed : null;
  }


}

customElements.define('ariel-view-app', ArielViewApp);
