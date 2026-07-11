import { useState } from "react";
import { X, Sun, Moon, Layers, Terminal, Zap, Check, Palette } from "lucide-react";

export default function GestionTemasModal({ onClose }: { onClose: () => void }) {
  const [activeTheme, setActiveTheme] = useState(localStorage.getItem("evaluaseguro_theme") || "dia");
  
  const savedQuick = localStorage.getItem("evaluaseguro_quick_themes");
  const initialQuick = savedQuick ? JSON.parse(savedQuick) : ["dia", "cyber", "kilo"];
  const [quickThemes, setQuickThemes] = useState<string[]>(initialQuick);

  const themes = [
    { id: "dia", name: "Día", icon: Sun },
    { id: "original", name: "Original", icon: Moon },
    { id: "glass", name: "Glass", icon: Layers },
    { id: "cyber", name: "Cyber", icon: Terminal },
    { id: "kilo", name: "Kilo", icon: Zap }
  ];

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(255, 255, 255, 0.3)', backdropFilter: 'blur(8px)', zIndex: 9999,
      display: 'flex', justifyContent: 'center', alignItems: 'center'
    }}>
      <div className="slide-up" style={{
        background: 'var(--bg-card, #f4f6f8)', width: '90%', maxWidth: '400px',
        maxHeight: '85vh', borderRadius: '24px', overflowY: 'auto',
        position: 'relative', padding: '1.5rem',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'transparent',
          border: 'none', color: 'var(--text-primary)', cursor: 'pointer'
        }}>
          <X size={24} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(46, 204, 113, 0.15)', color: '#27ae60', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Palette size={24} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>Gestión de Temas</h2>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Personaliza la apariencia</p>
          </div>
        </div>

        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1rem' }}>Tema Visual Activo</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '2rem' }}>
          {themes.map(theme => {
            const Icon = theme.icon;
            const isActive = activeTheme === theme.id;
            return (
              <div 
                key={theme.id}
                onClick={() => setActiveTheme(theme.id)}
                style={{
                  background: isActive ? 'rgba(46, 204, 113, 0.1)' : 'transparent',
                  border: isActive ? '1px solid #27ae60' : '1px solid var(--border)',
                  borderRadius: '16px', padding: '1rem',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
                  cursor: 'pointer', color: isActive ? '#27ae60' : 'var(--text-secondary)'
                }}
              >
                <Icon size={24} />
                <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{theme.name}</span>
              </div>
            );
          })}
        </div>        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>Modos en Menú<br/>Desplegable</h3>
            <span style={{ background: 'rgba(46, 204, 113, 0.15)', color: '#27ae60', padding: '4px 8px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600 }}>
              {quickThemes.length} seleccionados (Mín 1, Máx 3)
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.4 }}>
            Toca los temas en el orden que quieres que aparezcan en el menú rápido.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
            {themes.map(theme => {
              const Icon = theme.icon;
              const indexInQuick = quickThemes.indexOf(theme.id);
              const isSelected = indexInQuick !== -1;

              const handleToggle = () => {
                if (isSelected) {
                  if (quickThemes.length > 1) {
                    setQuickThemes(quickThemes.filter(t => t !== theme.id));
                  } else {
                    // Mínimo 1
                  }
                } else {
                  if (quickThemes.length < 3) {
                    setQuickThemes([...quickThemes, theme.id]);
                  } else {
                    // Máximo 3
                  }
                }
              };

              return (
                <div 
                  key={`quick-${theme.id}`}
                  onClick={handleToggle}
                  style={{ 
                    background: isSelected ? 'rgba(46, 204, 113, 0.1)' : 'var(--bg-body)', 
                    border: isSelected ? '1px solid #27ae60' : '1px solid transparent', 
                    borderRadius: '16px', padding: '1rem', display: 'flex', alignItems: 'center', 
                    justifyContent: 'space-between', cursor: 'pointer' 
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ 
                      background: isSelected ? 'rgba(46,204,113,0.15)' : 'rgba(0,0,0,0.05)', 
                      width:'32px', height:'32px', borderRadius:'10px', display:'flex', alignItems:'center', 
                      justifyContent:'center', color: isSelected ? '#27ae60' : 'var(--text-secondary)' 
                    }}>
                      <Icon size={18}/>
                    </div>
                    <span style={{ fontWeight: isSelected ? 600 : 500, color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                      {theme.name}
                    </span>
                  </div>
                  {isSelected && (
                    <div style={{ 
                      width: '24px', height: '24px', borderRadius: '50%', background: '#27ae60', 
                      color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      fontSize: '0.8rem', fontWeight: 700 
                    }}>
                      {indexInQuick + 1}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '1rem', background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer' }}>
            Cancelar
          </button>
          <button onClick={() => {
            if (quickThemes.length === 0) return;
            localStorage.setItem("evaluaseguro_quick_themes", JSON.stringify(quickThemes));
            localStorage.setItem("evaluaseguro_theme", activeTheme);
            onClose();
            window.location.reload(); // Para que el Header tome los cambios
          }} style={{ flex: 2, padding: '1rem', background: '#00b894', borderRadius: '12px', border: 'none', color: '#fff', fontWeight: 600, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', opacity: quickThemes.length === 0 ? 0.5 : 1 }}>
            <Check size={18} /> Guardar Cambios
          </button>
        </div>

      </div>
    </div>
  );
}
