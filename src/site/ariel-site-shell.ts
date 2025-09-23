import '../components/ariel-view-app';

const template = document.createElement('template');

template.innerHTML = `
  <style>
    :host {
      display: block;
      min-height: 100vh;
      margin: 0;
      background: #030915;
    }

    .stage {
      min-height: 100vh;
      display: flex;
    }

    ariel-view-app {
      flex: 1;
      width: 100%;
    }
  </style>
  <div class="stage">
    <ariel-view-app></ariel-view-app>
  </div>
`;

export class ArielSiteShell extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(template.content.cloneNode(true));
  }
}

customElements.define('ariel-site-shell', ArielSiteShell);
