declare module "pptx-preview" {
  export interface PptxPreviewOptions {
    width?: number;
    height?: number;
  }

  export interface PptxPreviewInstance {
    preview(data: ArrayBuffer): Promise<void> | void;
    destroy?: () => void;
  }

  export function init(
    container: HTMLElement,
    options?: PptxPreviewOptions
  ): PptxPreviewInstance;

  const _default: {
    init: typeof init;
  };

  export default _default;
}
