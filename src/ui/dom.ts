// Tipos aceptados como hijos; null y false permiten composición condicional.
export type DomChild = Node | string | number | false | null | undefined;

export interface ElementOptions {
  className?: string;
  text?: string | number;
  id?: string;
  attrs?: Readonly<Record<string, string>>;
  dataset?: Readonly<Record<string, string | number>>;
}

export function appendChildren(parent: Node, ...children: DomChild[]): void {
  children.forEach((child) => {
    if (child === null || child === undefined || child === false) return;
    parent.appendChild(child instanceof Node ? child : document.createTextNode(String(child)));
  });
}

// Constructor tipado: el tag determina automáticamente el tipo HTML retornado.
export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: ElementOptions = {},
  ...children: DomChild[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.id) node.id = options.id;
  if (options.text !== undefined) node.textContent = String(options.text);
  Object.entries(options.attrs ?? {}).forEach(([name, value]) => node.setAttribute(name, value));
  Object.entries(options.dataset ?? {}).forEach(([name, value]) => { node.dataset[name] = String(value); });
  appendChildren(node, ...children);
  return node;
}

export function createFragment(...children: DomChild[]): DocumentFragment {
  const fragment = document.createDocumentFragment();
  appendChildren(fragment, ...children);
  return fragment;
}

export function createImage(src: string, alt = "", className = ""): HTMLImageElement {
  const image = createElement("img", { className });
  image.src = src;
  image.alt = alt;
  return image;
}

export function createSvg(viewBox: string, paths: readonly string[], className = ""): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", viewBox);
  if (className) svg.setAttribute("class", className);
  paths.forEach((data) => {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", data);
    svg.append(path);
  });
  return svg;
}
