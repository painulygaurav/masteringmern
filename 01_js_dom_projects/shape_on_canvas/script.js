/**
 * Click-to-draw shape
 *
 * Project Feature:
 * Draws a randomly colored circle centered on wherever the user clicks.
 * Each new click clears the previous circle and draws a new one.
 *
 */

/* ============================================================
 * Global variables
 * ============================================================ */

// Element that receives clicks and holds the rendered shape.
const container = document.querySelector(".container");

// Shape type to draw; must match a CSS class (e.g. .circle).
const SHAPE_TYPE = "circle";

// Characters and length used to build a hex color code.
const HEX_CHARACTERS = "0123456789ABCDEF";
const HEX_CODE_LENGTH = 6;

/* ============================================================
 * Reusable functions
 * ============================================================ */

/**
 * Renders a single shape centered on the given point, inside the container.
 *
 * @param {HTMLElement} container - Positioned element the shape is rendered into
 * @param {string} shapeType - CSS class for the shape type (e.g. "circle")
 * @param {string} shapeColor - Background color of the shape
 * @param {number} x - Horizontal center of the shape, in px, relative to the container
 * @param {number} y - Vertical center of the shape, in px, relative to the container
 * @returns {void}
 */
function drawShape(container, shapeType, shapeColor, x, y) {
  const shape = document.createElement("div");

  // Apply the base shape class and the selected shape type.
  shape.classList.add("shape", shapeType);

  // Apply the color and place the shape's center at the given point.
  shape.style.backgroundColor = shapeColor;
  shape.style.left = `${x}px`;
  shape.style.top = `${y}px`;

  // Add the shape to the container.
  container.appendChild(shape);
}

/**
 * Generates a random six-character hexadecimal color code.
 *
 * @returns {string} A hexadecimal color code
 */
function generateRandomHexColor() {
  let color = "#";

  for (let i = 0; i < HEX_CODE_LENGTH; i++) {
    const randomCharacterIndex = Math.floor(
      Math.random() * HEX_CHARACTERS.length,
    );

    color += HEX_CHARACTERS[randomCharacterIndex];
  }

  return color;
}

/* ============================================================
 * Event listeners
 * ============================================================ */

// On each click, clear the previous shape and draw a new one
// centered on the click point.
container.addEventListener("click", (e) => {
  container.replaceChildren();

  const x = e.clientX;
  const y = e.clientY;

  drawShape(container, SHAPE_TYPE, generateRandomHexColor(), x, y);
});
