/**
 * Glue between the browser's Constraint Validation API and the page.
 *
 * Forms use `novalidate`, so the browser never shows its own bubbles. Instead:
 *   1. checkControl() reads control.validity (valueMissing, rangeUnderflow, ...)
 *      and our own rules from logic/validation.js,
 *   2. stores the result with setCustomValidity(), so form.checkValidity() and the
 *      :user-valid / :user-invalid styles agree with what we show,
 *   3. showFeedback() writes the message under the field.
 */

/** Returns the error message for a control, or "" when it is valid. */
export function checkControl(control, { custom, messages = {} } = {}) {
  control.setCustomValidity(""); // forget our previous message before re-checking
  const { valueMissing, badInput, rangeUnderflow, rangeOverflow } = control.validity;

  let message = "";
  if (valueMissing) message = messages.valueMissing ?? "This field is required.";
  else if (badInput) message = messages.badInput ?? "That value isn't valid.";
  else if (rangeUnderflow) message = messages.rangeUnderflow ?? "That value is too low.";
  else if (rangeOverflow) message = messages.rangeOverflow ?? "That value is too high.";
  else if (custom) message = custom(control.value);

  control.setCustomValidity(message);
  return message;
}

/** Show (or clear) the message. Fields only turn red/green once the user has touched them. */
export function showFeedback(control, errorElement, message, touched) {
  const showError = touched && message !== "";
  errorElement.textContent = showError ? message : "";
  if (showError) control.setAttribute("aria-invalid", "true");
  else control.removeAttribute("aria-invalid");
  control.classList.toggle("is-valid", touched && message === "" && control.value.trim() !== "");
}
