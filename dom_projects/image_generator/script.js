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

/**
 * Buttons
 *
 * Using data-* attributes to get stable JavaScript hooks, so we can select buttons by their behavior
 * Styles on class or ids may change in future however using data-* we are being more intentional towards it's behavior
 */

const generateButton = document.querySelector('[data-action="generate"]');
const clearShapeButton = document.querySelector('[data-action="clear-shapes"');
const generateRanColorButton = document.querySelector(
  '[data-action="generate-with-random-color"]',
);

const shapeContainer = document.querySelector(".shape-container");

function validateInputs(...inputElements) {
  return inputElements.every((inputElement) => {
    if (!inputElement.checkValidity()) {
      inputElement.reportValidity();
      return false;
    }
    return true;
  });
}

function drawShapes(shapeContainer, shapeType, shapeCount, shapeColor) {
  // Auto clear before adding any more children
  shapeContainer.replaceChildren();

  for (let i = 0; i < shapeCount; i++) {
    const shape = document.createElement("div");
    shape.classList.add("shape", shapeType);
    shape.style.backgroundColor = shapeColor;
    shapeContainer.appendChild(shape);
  }
}

generateButton.addEventListener("click", () => {
  if (!validateInputs(shapeTypeInput, shapeCountInput)) return;

  drawShapes(
    shapeContainer,
    shapeTypeInput.value,
    Number(shapeCountInput.value),
    shapeColorInput.value,
  );
});

// Clear children on demand
clearShapeButton.addEventListener("click", () => {
  shapeContainer.replaceChildren();
});

generateRanColorButton.addEventListener("click", () => {
  const randomColorCode = randomHexCodeGenerator();
  drawShapes(
    shapeContainer,
    shapeTypeInput.value,
    Number(shapeCountInput.value),
    randomColorCode,
  );
});

function randomHexCodeGenerator() {
  let color = "#";
  const HEX_COLORS = "0123456789ABCDEF";
  const HEX_CODE_LENGTH = 6;

  for (let i = 0; i < HEX_CODE_LENGTH; i++) {
    let randomCharIndex = Math.floor(Math.random() * HEX_COLORS.length);
    color += HEX_COLORS[randomCharIndex];
  }
  return color;
}
