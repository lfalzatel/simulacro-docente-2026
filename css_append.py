css = """
/* Modal Styles (Phase 3) */
.modal-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.5);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 1;
    transition: opacity 0.3s ease;
}
.modal-overlay.hidden {
    display: none;
    opacity: 0;
}
.glass-modal {
    background: var(--glass-bg-strong);
    border: 1px solid var(--glass-border);
    border-radius: var(--r-xl);
    padding: 1.5rem;
    width: 90%;
    max-width: 500px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    color: var(--text-primary);
}
.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    border-bottom: 1px solid var(--glass-border);
    padding-bottom: 0.5rem;
}
.modal-header h2 { font-size: 1.25rem; font-weight: bold; }
.close-modal {
    background: none; border: none; font-size: 1.5rem;
    color: var(--text-secondary); cursor: pointer;
}
.form-group { margin-bottom: 1rem; }
.form-group label { display: block; margin-bottom: 0.5rem; font-size: 0.875rem; font-weight: 600; color: var(--text-secondary); }
.form-input, .form-select {
    width: 100%;
    padding: 0.75rem;
    border-radius: var(--r-md);
    border: 1px solid var(--glass-border);
    background: var(--glass-bg);
    color: var(--text-primary);
    font-size: 1rem;
}
.form-input:focus, .form-select:focus {
    outline: none;
    border-color: var(--accent-primary);
}

/* Glass Card for Exams */
.examen-card {
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: var(--r-lg);
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}
.examen-card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
}
.examen-title { font-weight: bold; font-size: 1.1rem; }
.examen-group-badge {
    background: var(--accent-secondary);
    color: var(--text-inverse);
    padding: 0.2rem 0.5rem;
    border-radius: var(--r-full);
    font-size: 0.75rem;
}
.examen-meta { font-size: 0.85rem; color: var(--text-secondary); display: flex; gap: 1rem; }

/* Toggle Switch */
.switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}
.switch input { opacity: 0; width: 0; height: 0; }
.slider {
  position: absolute;
  cursor: pointer;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: var(--glass-border);
  transition: .4s;
  border-radius: 24px;
}
.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
}
input:checked + .slider { background-color: var(--accent-primary); }
input:checked + .slider:before { transform: translateX(20px); }
"""
with open('style.css', 'a', encoding='utf-8') as f:
    f.write(css)
