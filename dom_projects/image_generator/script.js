/**
 * Task 1 + 2: Generate number of circles as per users demand
 * Input type 1: Type of shape
 * Input type 2: Number of shape
 * Input type 3: Color of shape
 * Button: Generate
 * Output: Clicking on the Generate button will generate the number of shapes in the div container
 */

/**
 * All user inputs
 */
const shapeTypeInput = document.querySelector("#shapeType");
const shapeCountInput = document.querySelector("#shapeCount");
const shapeColorInput = document.querySelector("#shapeColor");

// Using data-* attributes to get stable JavaScript hooks, so we can select buttons by their behavior
// Styles on class or ids may change in future however using data-* we are being more intentional towards it's behavior
const generateButton = document.querySelector('[data-action="generate"]');
const clearShapeButton = document.querySelector('[data-action="clear-shapes"');

const shapeContainer = document.querySelector(".shape-container");

generateButton.addEventListener("click", () => {
  if (!shapeTypeInput.checkValidity()) {
    shapeTypeInput.reportValidity();
    return;
  }

  if (!shapeCountInput.checkValidity()) {
    shapeCountInput.reportValidity();
    return;
  }

  const shapeType = shapeTypeInput.value;
  const shapeCount = Number(shapeCountInput.value);
  const shapeColor = shapeColorInput.value;

  // Auto clear before adding any more children
  shapeContainer.replaceChildren();

  for (let i = 0; i < shapeCount; i++) {
    const shape = document.createElement("div");
    shape.classList.add("shape", shapeType);
    shape.style.backgroundColor = shapeColor;
    shapeContainer.appendChild(shape);
  }
});

// Clear children on demand
clearShapeButton.addEventListener("click", () => {
  shapeContainer.replaceChildren();
});
