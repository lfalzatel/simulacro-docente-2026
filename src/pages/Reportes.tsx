import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function Reportes() {
  const { appRole } = useAuth();
  const [activeTab, setActiveTab] = useState("student");

  const chartData = {
    labels: ['0-2.0 (Bajo)', '2.1-3.0 (Básico)', '3.1-4.0 (Alto)', '4.1-5.0 (Superior)'],
    datasets: [{
      label: 'Cantidad de Estudiantes',
      data: [1, 5, 12, 7], // Dummy data
      backgroundColor: [
        'rgba(214, 48, 49, 0.7)',  // Rojo
        'rgba(253, 203, 110, 0.7)', // Amarillo
        'rgba(9, 132, 227, 0.7)',   // Azul
        'rgba(0, 184, 148, 0.7)'    // Verde
      ],
      borderWidth: 0,
      borderRadius: 4
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, ticks: { stepSize: 2 } }
    }
  };

  return (
    <div className="container fade-in" style={{ paddingBottom: '90px' }}>
      
      <div className="page-header" style={{ marginBottom: '1.5rem', marginTop: '1rem' }}>
        <h1 className="page-title" style={{ fontSize: '1.5rem', fontWeight: 800 }}>📊 Reportes</h1>
        <p className="page-subtitle" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Análisis de rendimiento y estadísticas.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
        <button 
          onClick={() => setActiveTab("student")}
          style={{
            padding: '0.75rem 1rem', background: 'transparent', border: 'none', fontWeight: 600,
            borderBottom: activeTab === 'student' ? '2px solid #00cec9' : '2px solid transparent',
            color: activeTab === 'student' ? '#00cec9' : 'var(--text-secondary)', cursor: 'pointer'
          }}
        >
          {appRole === 'admin' ? 'Personales' : 'Mis Reportes'}
        </button>
        
        {(appRole === 'profesor' || appRole === 'admin') && (
          <button 
            onClick={() => setActiveTab("teacher")}
            style={{
              padding: '0.75rem 1rem', background: 'transparent', border: 'none', fontWeight: 600,
              borderBottom: activeTab === 'teacher' ? '2px solid #00cec9' : '2px solid transparent',
              color: activeTab === 'teacher' ? '#00cec9' : 'var(--text-secondary)', cursor: 'pointer'
            }}
          >
            {appRole === 'admin' ? 'Por Grupo' : 'Reportes de Grupo'}
          </button>
        )}

        {appRole === 'admin' && (
          <button 
            onClick={() => setActiveTab("admin")}
            style={{
              padding: '0.75rem 1rem', background: 'transparent', border: 'none', fontWeight: 600,
              borderBottom: activeTab === 'admin' ? '2px solid #00cec9' : '2px solid transparent',
              color: activeTab === 'admin' ? '#00cec9' : 'var(--text-secondary)', cursor: 'pointer'
            }}
          >
            Globales
          </button>
        )}
      </div>

      {/* Tab 1: Student */}
      {activeTab === 'student' && (
        <div className="stat-card fade-in" style={{ background: 'var(--glass-bg)', padding: '1.5rem', borderRadius: '16px' }}>
          <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)', fontWeight: 700 }}>Mis Exámenes Presentados</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Selecciona una asignatura para ver tu historial de notas.
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {/* Dummy subject item */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--glass-bg-strong)', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Pedagogía y Didáctica</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>3 intentos registrados</div>
              </div>
              <div style={{ fontSize: '1.25rem', color: 'var(--text-secondary)' }}>›</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--glass-bg-strong)', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Legislación Educativa</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>1 intento registrado</div>
              </div>
              <div style={{ fontSize: '1.25rem', color: 'var(--text-secondary)' }}>›</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--glass-bg-strong)', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Componente Disciplinar</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>0 intentos</div>
              </div>
              <div style={{ fontSize: '1.25rem', color: 'var(--text-secondary)' }}>›</div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Teacher */}
      {activeTab === 'teacher' && (
        <div className="stat-card fade-in" style={{ background: 'var(--glass-bg)', padding: '1.5rem', borderRadius: '16px' }}>
          <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)', fontWeight: 700 }}>Estadísticas del Grupo</h3>
          
          <select style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--glass-bg-strong)', color: 'var(--text-primary)', marginBottom: '1rem', fontWeight: 500 }}>
            <option>Grupo 11-A (Mañana)</option>
            <option>Grupo 11-B (Mañana)</option>
          </select>
          
          <select style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--glass-bg-strong)', color: 'var(--text-primary)', marginBottom: '1rem', fontWeight: 500 }}>
            <option>Simulacro Docente 2024 - Pedagogía</option>
            <option>Evaluación Diagnóstica Inicial</option>
          </select>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ flex: 1, background: 'rgba(0,206,201,0.1)', padding: '1rem', borderRadius: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#00cec9' }}>3.8 / 5.0</div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Promedio del Grupo</div>
            </div>
            <div style={{ flex: 1, background: 'rgba(0,184,148,0.1)', padding: '1rem', borderRadius: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#00b894' }}>75%</div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Aprobados</div>
            </div>
          </div>

          <h4 style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600 }}>Distribución de Notas</h4>
          <div style={{ position: 'relative', height: '200px', width: '100%', marginBottom: '2rem' }}>
            <Bar data={chartData} options={chartOptions} />
          </div>

          <h4 style={{ marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600 }}>Resultados Individuales</h4>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '0.5rem' }}>Estudiante</th>
                  <th style={{ padding: '0.5rem' }}>Fecha</th>
                  <th style={{ padding: '0.5rem' }}>Nota</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.75rem 0.5rem' }}>María Gómez</td>
                  <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>12 Oct</td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>
                    <span style={{ background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>4.5</span>
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.75rem 0.5rem' }}>Juan Pérez</td>
                  <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>12 Oct</td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>
                    <span style={{ background: '#fef08a', color: '#854d0e', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>3.2</span>
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.75rem 0.5rem' }}>Ana Torres</td>
                  <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>13 Oct</td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>
                    <span style={{ background: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>1.8</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Admin */}
      {activeTab === 'admin' && (
        <div className="stat-card fade-in" style={{ background: 'var(--glass-bg)', padding: '1.5rem', borderRadius: '16px' }}>
          <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)', fontWeight: 700 }}>Visión Global Institucional</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Aquí el administrador podrá filtrar por profesor, grupo o asignatura sin restricciones.
          </p>
          
          <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(0,0,0,0.02)', borderRadius: '12px', border: '1px dashed #ccc', color: 'var(--text-secondary)' }}>
            <em>Panel de filtros avanzados y métricas globales de la institución. En construcción...</em>
          </div>
        </div>
      )}

    </div>
  );
}
