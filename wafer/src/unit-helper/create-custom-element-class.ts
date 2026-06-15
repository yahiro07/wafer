function insertLinkTagToDocumentHeadIfNotExists(url: string) {
  const alreadyExists = Array.from(
    document.head.querySelectorAll('link[rel="stylesheet"]'),
  ).some((link) => (link as HTMLLinkElement).href === url);
  if (!alreadyExists) {
    console.log(`Inserting link tag for ${url}`);
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = url;
    document.head.appendChild(link);
  }
}

export function createCustomElementClass(
  fn: (shadowRoot: ShadowRoot) => () => void,
  options: {
    //css texts fed into a style tag in shadow dom
    cssTexts?: string[];
    //external stylesheet urls, e.g. web fonts, inserted into document head
    stylesheetUrls?: string[];
  },
): CustomElementConstructor {
  return class extends HTMLElement {
    isMounted: boolean;
    disposeRender: (() => void) | null = null;

    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this.isMounted = false;

      if (options.stylesheetUrls) {
        options.stylesheetUrls.forEach((url) => {
          insertLinkTagToDocumentHeadIfNotExists(url);
        });
      }
    }
    connectedCallback() {
      if (this.isMounted || !this.shadowRoot) return;

      if (options.cssTexts) {
        const style = document.createElement("style");
        style.dataset.unit1Styles = "true";
        style.textContent = options.cssTexts.join("\n");
        this.shadowRoot.appendChild(style);
      }

      this.disposeRender = fn(this.shadowRoot);
      this.isMounted = true;
    }

    disconnectedCallback() {
      if (this.isMounted && this.shadowRoot) {
        setTimeout(() => {
          if (!this.shadowRoot) return;
          this.disposeRender?.();
          this.disposeRender = null;
          this.isMounted = false;
        }, 0);
      }
    }
  };
}
