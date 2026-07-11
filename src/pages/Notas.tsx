import { useState, useEffect } from "react";
import { Plus, Search, Pin, Trash2, X, Check, Palette } from "lucide-react";
import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import Swal from "sweetalert2";

interface Nota {
  id: string;
  title: string;
  body: string;
  color: string;
  pinned: boolean;
  createdAt: any;
}

const COLORS = [
  "#ffffff", // Default (blanco o tema)
  "#f28b82", // Rojo
  "#fbbc04", // Naranja
  "#fff475", // Amarillo
  "#ccff90", // Verde claro
  "#a7ffeb", // Verde agua
  "#cbf0f8", // Azul claro
  "#aecbfa", // Azul oscuro
  "#d7aefb", // Morado
  "#fdcfe8", // Rosa
  "#e6c9a8", // Marrón
  "#e8eaed"  // Gris
];

export default function Notas() {
  const { currentUser } = useAuth();
  const [notas, setNotas] = useState<Nota[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [noteColor, setNoteColor] = useState(COLORS[0]);
  const [notePinned, setNotePinned] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, "notas"),
      where("userId", "==", currentUser.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notesData: Nota[] = [];
      snapshot.forEach((doc) => {
        notesData.push({ id: doc.id, ...doc.data() } as Nota);
      });
      setNotas(notesData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching notes:", error);
      setLoading(false);
      // Fallback local en caso de que falten índices o haya error
      // TODO: Añadir enlace para crear índice en consola si falla (normalmente Firebase tira un enlace en el log)
    });

    return () => unsubscribe();
  }, [currentUser]);

  const openModal = (nota?: Nota) => {
    if (nota) {
      setEditingId(nota.id);
      setNoteTitle(nota.title);
      setNoteBody(nota.body);
      setNoteColor(nota.color);
      setNotePinned(nota.pinned);
    } else {
      setEditingId(null);
      setNoteTitle("");
      setNoteBody("");
      setNoteColor(COLORS[0]);
      setNotePinned(false);
    }
    setShowColorPicker(false);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const saveNote = async () => {
    if (!noteTitle.trim() && !noteBody.trim()) {
      closeModal();
      return;
    }

    try {
      if (editingId) {
        await updateDoc(doc(db, "notas", editingId), {
          title: noteTitle,
          body: noteBody,
          color: noteColor,
          pinned: notePinned
        });
      } else {
        await addDoc(collection(db, "notas"), {
          userId: currentUser?.uid,
          title: noteTitle,
          body: noteBody,
          color: noteColor,
          pinned: notePinned,
          createdAt: serverTimestamp()
        });
      }
      closeModal();
    } catch (error) {
      console.error("Error saving note:", error);
      Swal.fire("Error", "No se pudo guardar la nota", "error");
    }
  };

  const togglePin = async (e: any, nota: Nota) => {
    e.stopPropagation();
    await updateDoc(doc(db, "notas", nota.id), {
      pinned: !nota.pinned
    });
  };

  const deleteNote = async (e: any, id: string) => {
    e.stopPropagation();
    Swal.fire({
      title: '¿Eliminar nota?',
      text: "Esta acción no se puede deshacer",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then(async (result) => {
      if (result.isConfirmed) {
        await deleteDoc(doc(db, "notas", id));
      }
    });
  };

  const filteredNotas = notas.filter(n => 
    n.title.toLowerCase().includes(search.toLowerCase()) || 
    n.body.toLowerCase().includes(search.toLowerCase())
  );

  const pinnedNotes = filteredNotas.filter(n => n.pinned);
  const otherNotes = filteredNotas.filter(n => !n.pinned);

  const MasonryGrid = ({ notes }: { notes: Nota[] }) => (
    <div style={{
      columnCount: window.innerWidth > 768 ? 3 : window.innerWidth > 480 ? 2 : 1,
      columnGap: '1rem', width: '100%'
    }}>
      {notes.map(nota => (
        <div 
          key={nota.id}
          onClick={() => openModal(nota)}
          style={{
            background: nota.color === '#ffffff' ? 'var(--bg-card, white)' : nota.color,
            breakInside: 'avoid', marginBottom: '1rem', padding: '1.25rem',
            borderRadius: '16px', border: '1px solid var(--border)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)', position: 'relative',
            cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s',
            color: nota.color === '#ffffff' ? 'var(--text-primary)' : '#2d3436' // Dark text for pastel colors
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
            (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
            (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
          }}
        >
          <button 
            onClick={(e) => togglePin(e, nota)}
            style={{
              position: 'absolute', top: '0.75rem', right: '0.75rem',
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: nota.pinned ? '#e17055' : 'rgba(0,0,0,0.3)', padding: '0.25rem',
              opacity: nota.pinned ? 1 : 0.5, transition: 'opacity 0.2s'
            }}
          >
            <Pin size={18} fill={nota.pinned ? '#e17055' : 'none'} />
          </button>

          {nota.title && <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.05rem', fontWeight: 700, paddingRight: '1.5rem', wordWrap: 'break-word' }}>{nota.title}</h3>}
          {nota.body && <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordWrap: 'break-word', opacity: 0.9 }}>
            {nota.body.length > 300 ? nota.body.substring(0, 300) + '...' : nota.body}
          </p>}

          <button 
            onClick={(e) => deleteNote(e, nota.id)}
            style={{
              position: 'absolute', bottom: '0.75rem', right: '0.75rem',
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'rgba(0,0,0,0.3)', padding: '0.25rem'
            }}
            title="Eliminar nota"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
    </div>
  );

  return (
    <div className="page-content fade-in" style={{ paddingBottom: '100px', minHeight: '100vh' }}>
      
      {/* Header & Search */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-app)', paddingTop: '1rem', paddingBottom: '1rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1rem' }}>Notas y Recordatorios</h1>
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <div style={{ 
            flex: 1, display: 'flex', alignItems: 'center', background: 'var(--bg-card)', 
            border: '1px solid var(--border)', borderRadius: '16px', padding: '0.5rem 1rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
          }}>
            <Search size={20} color="var(--text-secondary)" />
            <input 
              type="text" 
              placeholder="Buscar tus notas..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ border: 'none', background: 'transparent', width: '100%', padding: '0.5rem', outline: 'none', color: 'var(--text-primary)', fontSize: '1rem' }}
            />
          </div>
          <button 
            onClick={() => openModal()}
            style={{ 
              background: 'var(--accent-color)', color: 'white', border: 'none', 
              borderRadius: '16px', width: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', boxShadow: '0 4px 12px rgba(0, 206, 201, 0.3)'
            }}
          >
            <Plus size={24} />
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Cargando notas...</div>
      ) : notas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--text-secondary)' }}>
          <div style={{ background: 'rgba(253, 203, 110, 0.1)', padding: '1.5rem', borderRadius: '50%', marginBottom: '1rem', color: '#fdcb6e' }}>
            <Pin size={48} />
          </div>
          <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>Las notas que añadas aparecerán aquí</p>
        </div>
      ) : (
        <div style={{ marginTop: '1rem' }}>
          {pinnedNotes.length > 0 && (
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem', paddingLeft: '0.5rem' }}>Fijadas</div>
              <MasonryGrid notes={pinnedNotes} />
            </div>
          )}

          {otherNotes.length > 0 && (
            <div>
              {pinnedNotes.length > 0 && <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem', paddingLeft: '0.5rem' }}>Otras notas</div>}
              <MasonryGrid notes={otherNotes} />
            </div>
          )}
        </div>
      )}

      {/* Editor Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 9999,
          display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
          <div className="slide-up" style={{
            background: noteColor === '#ffffff' ? 'var(--bg-card, white)' : noteColor,
            width: '90%', maxWidth: '500px', borderRadius: '24px', padding: '1.5rem',
            position: 'relative', boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            display: 'flex', flexDirection: 'column', gap: '1rem', transition: 'background 0.3s'
          }}>
            <button onClick={saveNote} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'transparent', border: 'none', color: noteColor === '#ffffff' ? 'var(--text-primary)' : '#2d3436', cursor: 'pointer' }}>
              <X size={24} />
            </button>

            <button onClick={() => setNotePinned(!notePinned)} style={{ position: 'absolute', top: '1.5rem', right: '4rem', background: 'transparent', border: 'none', color: notePinned ? '#e17055' : (noteColor === '#ffffff' ? 'var(--text-secondary)' : 'rgba(0,0,0,0.5)'), cursor: 'pointer' }}>
              <Pin size={22} fill={notePinned ? '#e17055' : 'none'} />
            </button>

            <input 
              type="text" 
              placeholder="Título" 
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              style={{ 
                border: 'none', background: 'transparent', outline: 'none', 
                fontSize: '1.25rem', fontWeight: 700, color: noteColor === '#ffffff' ? 'var(--text-primary)' : '#2d3436',
                width: '80%', padding: '0.5rem 0'
              }}
            />

            <textarea 
              placeholder="Añadir una nota..." 
              value={noteBody}
              onChange={(e) => setNoteBody(e.target.value)}
              autoFocus
              style={{ 
                border: 'none', background: 'transparent', outline: 'none', 
                fontSize: '1rem', color: noteColor === '#ffffff' ? 'var(--text-primary)' : '#2d3436',
                width: '100%', minHeight: '150px', resize: 'none', padding: 0,
                lineHeight: 1.5
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
              <div style={{ position: 'relative' }}>
                <button 
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: noteColor === '#ffffff' ? 'var(--text-secondary)' : 'rgba(0,0,0,0.6)', padding: '0.5rem', display: 'flex', alignItems: 'center', borderRadius: '50%' }}
                  title="Cambiar color"
                >
                  <Palette size={20} />
                </button>
                
                {showColorPicker && (
                  <div style={{ 
                    position: 'absolute', bottom: '100%', left: 0, background: 'var(--bg-card, white)', 
                    padding: '0.5rem', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', zIndex: 10,
                    marginBottom: '0.5rem', border: '1px solid var(--border)'
                  }}>
                    {COLORS.map(color => (
                      <div 
                        key={color}
                        onClick={() => { setNoteColor(color); setShowColorPicker(false); }}
                        style={{
                          width: '32px', height: '32px', borderRadius: '50%', background: color,
                          border: color === '#ffffff' ? '2px solid #e0e0e0' : '2px solid transparent',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                      >
                        {noteColor === color && <Check size={16} color={color === '#ffffff' ? '#000' : 'rgba(0,0,0,0.5)'} />}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button 
                onClick={saveNote}
                style={{ 
                  background: 'transparent', border: 'none', color: noteColor === '#ffffff' ? 'var(--text-primary)' : '#2d3436', 
                  fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer', padding: '0.5rem 1rem', borderRadius: '8px',
                  backgroundColor: 'rgba(0,0,0,0.05)'
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
