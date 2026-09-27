/**
 * Colored Shape Generator
 * Project Features:
 * 1. Generate a requested number of shapes.
 * 2. Allow the user to select the shape type.
 * 3. Allow the user to select the shape color.
 * 4. Generate shapes with a randomly generated color.
 * 5. Clear all generated shapes.
 *
 * Inputs:
 * - Shape type
 * - Number of shapes
 * - Shape color
 *
 * Actions:
 * - Generate
 * - Generate with random color
 * - Clear
 *
 * Output:
 * - Render the generated shapes inside the shape container.
 */

/**
 * User input elements
 */
const shapeTypeInput = document.querySelector("#shapeType");
const shapeCountInput = document.querySelector("#shapeCount");
const shapeColorInput = document.querySelector("#shapeColor");

/**
 * Action buttons
 *
 * The data-* attributes act as stable JavaScript hooks.
 * They allow us to select elements based on their behavior
 * rather than depending on styling classes or structural IDs.
 *
 * CSS classes can change as the UI evolves, while data-action
 * attributes explicitly describe the action handled by JavaScript.
 */
const generateButton = document.querySelector('[data-action="generate"]');
const clearShapeButton = document.querySelector('[data-action="clear-shapes"]');
const generateRandomColorButton = document.querySelector(
  '[data-action="generate-with-random-color"]',
);

/**
 * Shape output container
 */
const shapeContainer = document.querySelector(".shape-container");

/**
 * Reusable functions
 */

/**
 * Validates the provided input elements. Returns false even if a single input is missing
 * Since we have added "required" attribute so it's going to check the validity if the required value is present.
 *
 * @param {...HTMLInputElement} inputElements - Inputs to validate
 * @returns {boolean} Whether all inputs are valid
 */
function validateInputs(...inputElements) {
  return inputElements.every((inputElement) => {
    if (!inputElement.checkValidity()) {
      inputElement.reportValidity();
      return false;
    }

    return true;
  });
}

/**
 * Renders the requested number of shapes.
 *
 * @param {HTMLElement} container - Element where shapes are rendered
 * @param {string} shapeType - CSS class representing the shape type
 * @param {number} shapeCount - Number of shapes to generate
 * @param {string} shapeColor - Background color of each shape
 */
function drawShapes(container, shapeType, shapeCount, shapeColor) {
  for (let i = 0; i < shapeCount; i++) {
    const shape = document.createElement("div");

    // Apply the base shape class and the selected shape type.
    shape.classList.add("shape", shapeType);

    // Apply the selected or randomly generated background color.
    shape.style.backgroundColor = shapeColor;

    // Add the shape to the output container.
    container.appendChild(shape);
  }
}

/**
 * Generates a random six-character hexadecimal color code.
 *
 * @returns {string} A hexadecimal color code
 */
function generateRandomHexColor() {
  let color = "#";

  const HEX_CHARACTERS = "0123456789ABCDEF";
  const HEX_CODE_LENGTH = 6;

  for (let i = 0; i < HEX_CODE_LENGTH; i++) {
    const randomCharacterIndex = Math.floor(
      Math.random() * HEX_CHARACTERS.length,
    );

    color += HEX_CHARACTERS[randomCharacterIndex];
  }

  return color;
}

/**
 * Event listeners
 *
 * Handles:
 * - Generating shapes with the selected color
 * - Generating shapes with a random color
 * - Clearing all generated shapes
 */

generateButton.addEventListener("click", () => {
  // Stop execution if the required inputs are invalid.
  if (!validateInputs(shapeTypeInput, shapeCountInput)) return;

  // Remove previously generated shapes before rendering new ones.
  shapeContainer.replaceChildren();
  drawShapes(
    shapeContainer,
    shapeTypeInput.value,
    Number(shapeCountInput.value),
    shapeColorInput.value,
  );
});

clearShapeButton.addEventListener("click", () => {
  // Remove all generated shapes from the container.
  shapeContainer.replaceChildren();
});

generateRandomColorButton.addEventListener("click", () => {
  if (!validateInputs(shapeTypeInput, shapeCountInput)) return;

  const randomColorCode = generateRandomHexColor();
  // Remove previously generated shapes before rendering new ones.
  shapeContainer.replaceChildren();
  drawShapes(
    shapeContainer,
    shapeTypeInput.value,
    Number(shapeCountInput.value),
    randomColorCode,
  );
});
