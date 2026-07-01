const SESSION_WIZARD_STEPS = 4;
let sessionWizardStep = 1;

export function getSessionWizardStep() {
  return sessionWizardStep;
}

export function showSessionWizardStep(n) {
  sessionWizardStep = Math.max(1, Math.min(SESSION_WIZARD_STEPS, n));

  document.querySelectorAll('#session-wizard .wizard-step').forEach(step =>
    step.classList.toggle('active', Number(step.dataset.step) === sessionWizardStep));

  document.querySelectorAll('#session-wizard-progress .wizard-dot').forEach(dot =>
    dot.classList.toggle('active', Number(dot.dataset.step) <= sessionWizardStep));

  const prev = document.getElementById('btn-wizard-prev');
  const next = document.getElementById('btn-wizard-next');
  const save = document.getElementById('btn-session-save');

  if (prev) prev.style.display = sessionWizardStep === 1 ? 'none' : '';
  if (next) next.style.display = sessionWizardStep === SESSION_WIZARD_STEPS ? 'none' : '';
  if (save) save.style.display = sessionWizardStep === SESSION_WIZARD_STEPS ? '' : 'none';

  document.querySelector('#session-sheet .sheet')?.scrollTo({ top: 0, behavior: 'smooth' });
}

export function bindSessionWizardNav() {
  const prev = document.getElementById('btn-wizard-prev');
  const next = document.getElementById('btn-wizard-next');

  if (prev) prev.onclick = () => showSessionWizardStep(sessionWizardStep - 1);
  if (next) next.onclick = () => showSessionWizardStep(sessionWizardStep + 1);
}
