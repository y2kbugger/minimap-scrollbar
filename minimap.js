const elementMap = {
    h1: '--minimap-heading',
    h2: '--minimap-heading',
    h3: '--minimap-heading',
    h4: '--minimap-heading',
    h5: '--minimap-heading',
    h6: '--minimap-heading',
    a: '--minimap-text',
    p: '--minimap-text',
    strong: '--minimap-text',
    pre: '--minimap-text',
    code: '--minimap-text',
    blockquote: '--minimap-text',
    img: '--minimap-text',
};
export class Minimap extends HTMLElement {
    constructor() {
        super();
        this.options = elementMap;
        this.canvas = document.createElement("canvas");
        this.styleElement = document.createElement("style");
        this.staticStyleElement = document.createElement("style");
        this.root = this.parentElement;
        // this.root = document.querySelector("body")!;
    }
    connectedCallback() {
        // Add all child elements on create
        const shadow = this.attachShadow({ mode: "open" });
        shadow.appendChild(this.styleElement);
        shadow.appendChild(this.canvas);
        // Canvas should be as large as we let it
        const canvas = `canvas { width: 100%; height: 100%; }`;
        // Let the user know they can move about on hover
        const hover = `canvas:hover { cursor: move; }`;
        // Add to the right of the page, outside of the flow
        const host = `
            :host {
                position: fixed;
                top: 0px;
                right: 100px;
                width: 30px;
                bottom: 0px;
            }`;
        this.styleElement.textContent = `
            ${host}
            ${hover}
            ${canvas}
            `;
        // Give 50ms for the page draw to settle
        setTimeout(() => {
            this.redraw();
        }, 50);
    }
    get root() {
        return this._root;
    }
    set root(root) {
        this._root = root;
        /* Trigger redraws on scrolling of the page */
        const onScroll = () => {
            this.redraw();
        };
        document.addEventListener("scroll", onScroll);
        const onMove = (e) => {
            // We are controlling the mouse
            e.preventDefault();
            // mini-map dimensions
            const canvasBounds = this.canvas.getBoundingClientRect();
            // Convert mini-map to page dimension
            const canvasHeightWeighting = canvasBounds.height / this.root.scrollHeight;
            const viewpointCenterOffset = this.root.clientHeight * canvasHeightWeighting / 2;
            // Mouse position on the canvas
            const pointOnCanvas = e.clientY - canvasBounds.y;
            // Position the mouse is on in the context of the root element
            const pointConvertedToPage = (pointOnCanvas - viewpointCenterOffset) / (canvasBounds.height / this.root.scrollHeight);
            // Scroll the element to the new location using native scrolling
            this.root.scrollTo({
                top: pointConvertedToPage
            });
        };
        // Remove control of scrolling when the mouse is up
        const onMouseUp = (e) => {
            e.preventDefault();
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onMouseUp);
            this.root.addEventListener("scroll", onScroll);
        };
        // Control scrolling with the mouse when the mouse is down over the canvas
        this.canvas.addEventListener('mousedown', () => {
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onMouseUp);
            this.root.removeEventListener("scroll", onScroll);
        });
    }
    redraw() {
        const context = this.canvas.getContext('2d');
        if (!context)
            throw new Error("Missing canvas context");
        if (!this.root)
            return;
        // reset the scale to default
        context.setTransform(1, 0, 0, 1, 0, 0);
        // Recalculate the scale based on the current page and canvas dimensions
        const canvasBounds = this.canvas.getBoundingClientRect();
        this.canvas.width = canvasBounds.width;
        this.canvas.height = canvasBounds.height;
        context.scale(canvasBounds.width / this.root.scrollWidth, canvasBounds.height / this.root.scrollHeight);
        // Blank the canvas
        context.clearRect(0, 0, this.root.scrollWidth, this.root.scrollHeight);
        const rootRect = this.root.getBoundingClientRect();
        // Look through all tag configured to be rendered
        for (const option of Object.entries(this.options)) {
            const [elementSelector, colour] = option;
            const elements = this.root.getElementsByTagName(elementSelector);
            for (const element of elements) {
                const elementRect = element.getBoundingClientRect();
                // Style the element based on the configured css variable values
                context.fillStyle = getComputedStyle(this).getPropertyValue(colour);
                // Add the element to the calculated position on the canvas
                const margin = 20;
                context.fillRect(margin + elementRect.x - rootRect.x, elementRect.y - rootRect.y, elementRect.width - 2 * margin, elementRect.height);
            }
        }
        // see through
        context.fillStyle = "rgba(0, 0, 0, 0.6)";
        // Current page view
        // context.fillRect(
        //     this.scrollLeft,
        //     this.root.scrollTop,
        //     this.root.clientWidth,
        //     this.root.clientHeight
        // )
        // // the above forces you to make root element short, use viewport instead.
        context.fillRect(0, window.scrollY, window.innerWidth, window.innerHeight);
    }
}
customElements.define("mini-map", Minimap);
